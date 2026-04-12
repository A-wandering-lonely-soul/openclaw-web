<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { clearChatContext, fetchModelState, sendChatMessage, updateModelState } from '@/lib/api'
import { DEFAULT_MODEL_STATE, MODEL_OPTIONS, WEB_DISABLED_MODELS } from '@/lib/constants'
import { useChatStateStore } from '@/stores/chatState'
import { useUiSettingsStore } from '@/stores/uiSettings'
import { formatTime, makeId } from '@/lib/utils'
import type { ChatMessage, ImageAttachment, ProviderModelState } from '@/lib/types'
import MessageRenderer from '@/components/MessageRenderer.vue'
import BlurControl from '@/components/BlurControl.vue'

const chatStateStore = useChatStateStore()
const uiSettingsStore = useUiSettingsStore()
const { blurAmount, isAdmin } = storeToRefs(uiSettingsStore)
const { sessions, activeSessionId, activeSession } = storeToRefs(chatStateStore)
const draft = ref('')
const sending = ref(false)
const clearingContext = ref(false)
const deletingSessionId = ref<string | null>(null)
const loadingModel = ref(false)
const updatingModel = ref(false)
const pageError = ref('')
const modelState = ref<ProviderModelState>({ ...DEFAULT_MODEL_STATE })
const pendingImages = ref<ImageAttachment[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const availableModels = computed(() => {
  const models = [...(MODEL_OPTIONS[modelState.value.provider] ?? [])]
  if (modelState.value.provider === 'ollama' && modelState.value.model && !models.includes(modelState.value.model)) {
    models.unshift(modelState.value.model)
  }
  return models
})

function isModelDisabledInWeb(model: string) {
  if (isAdmin.value) return false
  
  if (modelState.value.provider === 'copilot') {
    return WEB_DISABLED_MODELS.has(model)
  }
  if (modelState.value.provider === 'ollama') {
    return true // completely disabled for guest
  }
  return false
}

onMounted(async () => {
  const firstSession = sessions.value[0]
  if (!activeSession.value && firstSession) {
    activeSessionId.value = firstSession.id
  }

  await refreshModelState()
})

async function refreshModelState() {
  loadingModel.value = true
  try {
    modelState.value = await fetchModelState()
  } catch (error) {
    pageError.value = getErrorMessage(error, '模型信息读取失败')
  } finally {
    loadingModel.value = false
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

function createNewSession() {
  chatStateStore.createNewSession()
  pageError.value = ''
}

function switchSession(sessionId: string) {
  chatStateStore.switchSession(sessionId)
  pageError.value = ''
}

async function deleteSession(sessionId: string) {
  if (sending.value || deletingSessionId.value) {
    return
  }

  deletingSessionId.value = sessionId
  try {
    await clearChatContext(sessionId)
    chatStateStore.deleteSession(sessionId)
    pageError.value = ''
  } catch (error) {
    pageError.value = getErrorMessage(error, '删除会话失败')
  } finally {
    deletingSessionId.value = null
  }
}

function openImagePicker() {
  fileInputRef.value?.click()
}

async function handleImageFiles(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  if (!files.length) return

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('读取图片失败'))
          return
        }
        const commaIndex = result.indexOf(',')
        if (commaIndex < 0) {
          reject(new Error('图片数据格式无效'))
          return
        }
        resolve(result.slice(commaIndex + 1))
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    pendingImages.value.push({
      type: 'image_jpeg',
      data,
      file_path: file.name,
      previewUrl: URL.createObjectURL(file),
    })
  }
  // 清空 input 以便重复选同一文件
  ;(event.target as HTMLInputElement).value = ''
}

function removePendingImage(index: number) {
  const removed = pendingImages.value.splice(index, 1)[0]
  if (removed) URL.revokeObjectURL(removed.previewUrl)
}

async function submitMessage() {
  const prompt = draft.value.trim()
  const session = activeSession.value
  if ((!prompt && pendingImages.value.length === 0) || !session || sending.value) {
    return
  }

  if (isModelDisabledInWeb(modelState.value.model)) {
    pageError.value = `${isAdmin.value ? '此模型暂不可用' : '游客模式下此模型不可用，请切换模型'}`
    return
  }

  pageError.value = ''
  sending.value = true

  const imagesToSend = pendingImages.value.slice()
  const displayContent = imagesToSend.length
    ? `[图片 ×${imagesToSend.length}]${prompt ? ' ' + prompt : ''}`
    : prompt

  const userMessage: ChatMessage = {
    id: makeId('msg'),
    role: 'user',
    content: displayContent,
    images: imagesToSend,
    createdAt: new Date().toISOString(),
  }
  const pendingMessage: ChatMessage = {
    id: makeId('msg'),
    role: 'assistant',
    content: 'OpenClaw 正在思考，请稍候...',
    createdAt: new Date().toISOString(),
    pending: true,
  }

  chatStateStore.appendMessage(session.id, userMessage)
  chatStateStore.appendMessage(session.id, pendingMessage)
  draft.value = ''
  pendingImages.value.forEach(img => URL.revokeObjectURL(img.previewUrl))
  pendingImages.value = []

  try {
    const apiImages = imagesToSend.map(({ type, data, file_path }) => ({ type, data, file_path }))
    const result = await sendChatMessage(prompt || '(用户发送了图片)', session.id, apiImages.length ? apiImages : undefined)
    chatStateStore.patchMessage(session.id, pendingMessage.id, {
      content: result.response,
      pending: false,
      failed: false,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    chatStateStore.patchMessage(session.id, pendingMessage.id, {
      content: getErrorMessage(error, '消息发送失败'),
      pending: false,
      failed: true,
      createdAt: new Date().toISOString(),
    })
    pageError.value = getErrorMessage(error, '消息发送失败')
  } finally {
    sending.value = false
  }
}

async function clearActiveSession() {
  const session = activeSession.value
  if (!session || sending.value || clearingContext.value) {
    return
  }

  clearingContext.value = true
  try {
    await clearChatContext(session.id)
    chatStateStore.resetSession(session.id)
    pageError.value = ''
  } catch (error) {
    pageError.value = getErrorMessage(error, '清空上下文失败')
  } finally {
    clearingContext.value = false
  }
}

async function handleProviderChange(provider: string) {
  const nextModel = MODEL_OPTIONS[provider]?.[0]
  if (!nextModel) {
    return
  }

  modelState.value = {
    provider,
    model: nextModel,
  }
  await persistModelState()
}

async function handleModelChange(model: string) {
  if (isModelDisabledInWeb(model)) {
    return
  }

  modelState.value = {
    ...modelState.value,
    model,
  }
  await persistModelState()
}

async function persistModelState() {
  updatingModel.value = true
  try {
    const result = await updateModelState(modelState.value.provider, modelState.value.model)
    modelState.value = {
      provider: result.provider,
      model: result.model,
    }
    pageError.value = ''
  } catch (error) {
    pageError.value = getErrorMessage(error, '模型切换失败')
    await refreshModelState()
  } finally {
    updatingModel.value = false
  }
}
</script>

<template>
  <div class="shell" :style="{ '--panel-blur': `${blurAmount}px` }">
    <aside class="sidebar">
      <div class="brand">
        <p class="eyebrow">OpenClaw Web</p>
        <div class="brand-title">
          <h1>指挥室</h1>
          <span class="role-badge" :class="isAdmin ? 'admin' : 'guest'">
            {{ isAdmin ? '管理员模式' : '游客模式' }}
          </span>
        </div>
      </div>

      <button class="primary-button" type="button" @click="createNewSession">
        新建会话
      </button>

      <div class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-card"
          :class="{ active: session.id === activeSessionId }"
        >
          <button
            type="button"
            class="session-delete"
            :disabled="sending || !!deletingSessionId"
            @click="deleteSession(session.id)"
            aria-label="删除会话"
            title="删除会话"
          >
            <span v-if="deletingSessionId === session.id" class="btn-spinner" aria-hidden="true" />
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9Z" />
            </svg>
          </button>

          <button
            type="button"
            class="session-main"
            @click="switchSession(session.id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <span class="session-meta">{{ formatTime(session.updatedAt) }}</span>
          </button>
        </div>
      </div>
    </aside>

    <main class="panel" v-if="activeSession">
      <header class="toolbar">
        <div>
          <p class="eyebrow">当前会话</p>
          <h2>{{ activeSession.title }}</h2>
        </div>

        <div class="toolbar-actions">
          <BlurControl />
          <label class="field">
            <span>Provider</span>
            <select
              :value="modelState.provider"
              :disabled="loadingModel || updatingModel"
              @change="handleProviderChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="copilot">copilot</option>
              <option value="deepseek">deepseek</option>
              <option v-if="isAdmin" value="ollama">ollama</option>
            </select>
          </label>

          <label class="field">
            <span>Model</span>
            <select
              :value="modelState.model"
              :disabled="loadingModel || updatingModel"
              @change="handleModelChange(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="item in availableModels"
                :key="item"
                :value="item"
                :disabled="isModelDisabledInWeb(item)"
              >
                {{ item }}
              </option>
            </select>
          </label>

          <button class="secondary-button" type="button" :disabled="sending || clearingContext" @click="clearActiveSession">
            <span v-if="clearingContext" class="btn-spinner" aria-hidden="true" />
            {{ clearingContext ? '清空中...' : '清空上下文' }}
          </button>
        </div>
      </header>

      <p v-if="pageError" class="banner error">{{ pageError }}</p>
      <p v-else class="banner">模型：{{ modelState.provider }} / {{ modelState.model }}</p>
      <!-- <p v-if="modelState.provider === 'copilot'" class="banner subtle">Web 端已禁用高级 Copilot 模型：Claude Opus 4.6、Claude Sonnet 4.6、GPT-5.3-Codex、Gemini 3.1 Pro</p>
      <p v-else-if="modelState.provider === 'ollama'" class="banner subtle">Ollama 在低配服务器上仅推荐 3B 模型。Web 端默认隐藏重型模型以降低超时和高负载风险。</p> -->
      <section class="message-list">
        <article
          v-for="message in activeSession.messages"
          :key="message.id"
          class="message"
          :class="message.role"
        >
          <div class="message-head">
            <span>{{ message.role === 'user' ? '你' : 'OpenClaw' }}</span>
            <span>{{ formatTime(message.createdAt) }}</span>
          </div>
          <MessageRenderer
            :content="message.content"
            :pending="message.pending"
            :failed="message.failed"
          />
        </article>
      </section>

      <form class="composer" @submit.prevent="submitMessage">
        <div v-if="pendingImages.length" class="image-preview-row">
          <div v-for="(img, i) in pendingImages" :key="i" class="image-preview-item">
            <img :src="img.previewUrl" alt="待发送图片" />
            <button type="button" class="image-remove" @click="removePendingImage(i)" title="移除">×</button>
          </div>
        </div>
        <textarea
          v-model="draft"
          rows="5"
          maxlength="6000"
          :placeholder="isModelDisabledInWeb(modelState.model) ? (isAdmin ? '此模型暂不可用' : '游客模式下此模型不可用，请在右上角切换模型') : '输入你的问题，按 Ctrl/Command + Enter 发送'"
          @keydown.ctrl.enter.prevent="submitMessage"
          @keydown.meta.enter.prevent="submitMessage"
        />
        <div class="composer-footer">
          <span class="muted">{{ draft.length }}/6000</span>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            style="display:none"
            @change="handleImageFiles"
          />
          <button class="secondary-button" type="button" :disabled="sending || isModelDisabledInWeb(modelState.model)" @click="openImagePicker" title="上传图片">
            🖼 图片
          </button>
          <button class="primary-button" type="submit" :disabled="sending || isModelDisabledInWeb(modelState.model) || (!draft.trim() && pendingImages.length === 0)">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>
