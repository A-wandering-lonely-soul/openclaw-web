<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { clearChatContext, fetchModelState, sendChatMessage, updateModelState } from '@/lib/api'
import { DEFAULT_MODEL_STATE, MODEL_OPTIONS } from '@/lib/constants'
import { useChatStateStore } from '@/stores/chatState'
import { useUiSettingsStore } from '@/stores/uiSettings'
import { formatTime, makeId } from '@/lib/utils'
import type { ChatMessage, ProviderModelState } from '@/lib/types'
import MessageRenderer from '@/components/MessageRenderer.vue'
import BlurControl from '@/components/BlurControl.vue'

const chatStateStore = useChatStateStore()
const uiSettingsStore = useUiSettingsStore()
const { blurAmount } = storeToRefs(uiSettingsStore)
const { sessions, activeSessionId, activeSession } = storeToRefs(chatStateStore)
const draft = ref('')
const sending = ref(false)
const clearingContext = ref(false)
const deletingSessionId = ref<string | null>(null)
const loadingModel = ref(false)
const updatingModel = ref(false)
const pageError = ref('')
const modelState = ref<ProviderModelState>({ ...DEFAULT_MODEL_STATE })

const availableModels = computed(() => {
  return MODEL_OPTIONS[modelState.value.provider] ?? []
})

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

async function submitMessage() {
  const prompt = draft.value.trim()
  const session = activeSession.value
  if (!prompt || !session || sending.value) {
    return
  }

  pageError.value = ''
  sending.value = true

  const userMessage: ChatMessage = {
    id: makeId('msg'),
    role: 'user',
    content: prompt,
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

  try {
    const result = await sendChatMessage(prompt, session.id)
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
        <h1>指挥室</h1>
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
            </select>
          </label>

          <label class="field">
            <span>Model</span>
            <select
              :value="modelState.model"
              :disabled="loadingModel || updatingModel"
              @change="handleModelChange(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="item in availableModels" :key="item" :value="item">
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
        <textarea
          v-model="draft"
          rows="5"
          maxlength="6000"
          placeholder="输入你的问题，按 Ctrl/Command + Enter 发送"
          @keydown.ctrl.enter.prevent="submitMessage"
          @keydown.meta.enter.prevent="submitMessage"
        />
        <div class="composer-footer">
          <span class="muted">{{ draft.length }}/6000</span>
          <button class="primary-button" type="submit" :disabled="sending || !draft.trim()">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>
