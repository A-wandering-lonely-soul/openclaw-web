import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEY } from '@/lib/constants'
import { makeId, trimTitle } from '@/lib/utils'
import type { ChatMessage, ChatSession } from '@/lib/types'

interface PersistedState {
  sessions: ChatSession[]
  activeSessionId: string
}

const PENDING_TITLE = 'OpenClaw 正在思考，请稍候...'

function createWelcomeMessage(): ChatMessage {
  return {
    id: makeId('msg'),
    role: 'assistant',
    content: '你好，我是 OpenClaw。',
    createdAt: new Date().toISOString(),
  }
}

function createSession(name?: string): ChatSession {
  const now = new Date().toISOString()
  return {
    id: makeId('chat'),
    title: name || '新会话',
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage()],
  }
}

function normalizeSessionTitle(session: ChatSession): ChatSession {
  if (session.title !== PENDING_TITLE) {
    return session
  }

  const firstUserMessage = session.messages.find((entry) => entry.role === 'user')
  return {
    ...session,
    title: trimTitle(firstUserMessage?.content || '新会话'),
  }
}

export const useChatStateStore = defineStore('chatState', () => {
  const sessions = ref<ChatSession[]>([])
  const activeSessionId = ref('')

  const activeSession = computed<ChatSession | undefined>(() => {
    return sessions.value.find((session) => session.id === activeSessionId.value) ?? sessions.value[0]
  })

  function persistState() {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessions: sessions.value,
        activeSessionId: activeSessionId.value,
      } as PersistedState),
    )
  }

  function setInitialState() {
    if (typeof window === 'undefined') {
      const session = createSession()
      sessions.value = [session]
      activeSessionId.value = session.id
      return
    }

    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const session = createSession()
      sessions.value = [session]
      activeSessionId.value = session.id
      persistState()
      return
    }

    try {
      const parsed = JSON.parse(raw) as PersistedState
      if (!parsed.sessions.length) {
        throw new Error('empty sessions')
      }

      sessions.value = parsed.sessions.map((session) => normalizeSessionTitle(session))
      activeSessionId.value = parsed.activeSessionId
      if (!sessions.value.some((session) => session.id === activeSessionId.value)) {
        const firstSession = sessions.value[0]
        if (firstSession) {
          activeSessionId.value = firstSession.id
        }
      }
      persistState()
    } catch {
      const session = createSession()
      sessions.value = [session]
      activeSessionId.value = session.id
      persistState()
    }
  }

  function createNewSession(name?: string) {
    const session = createSession(name)
    sessions.value.unshift(session)
    activeSessionId.value = session.id
    persistState()
    return session
  }

  function switchSession(sessionId: string) {
    activeSessionId.value = sessionId
    persistState()
  }

  function appendMessage(sessionId: string, message: ChatMessage) {
    const session = sessions.value.find((entry) => entry.id === sessionId)
    if (!session) {
      return
    }

    session.messages.push(message)
    session.updatedAt = message.createdAt
    if (message.role === 'user' && session.messages.filter((entry) => entry.role === 'user').length === 1) {
      session.title = trimTitle(message.content)
    }
    persistState()
  }

  function patchMessage(sessionId: string, messageId: string, patch: Partial<ChatMessage>) {
    const session = sessions.value.find((entry) => entry.id === sessionId)
    if (!session) {
      return
    }

    const target = session.messages.find((message) => message.id === messageId)
    if (!target) {
      return
    }

    Object.assign(target, patch)
    session.updatedAt = new Date().toISOString()
    persistState()
  }

  function replaceSession(sessionId: string, next: ChatSession) {
    const index = sessions.value.findIndex((entry) => entry.id === sessionId)
    if (index < 0) {
      return
    }

    sessions.value[index] = {
      ...next,
      id: sessionId,
    }
    persistState()
  }

  function resetSession(sessionId: string, title?: string) {
    const index = sessions.value.findIndex((entry) => entry.id === sessionId)
    if (index < 0) {
      return
    }

    const current = sessions.value[index]
    if (!current) {
      return
    }

    const now = new Date().toISOString()
    sessions.value[index] = {
      id: sessionId,
      title: title || '新会话',
      createdAt: current.createdAt || now,
      updatedAt: now,
      messages: [createWelcomeMessage()],
    }
    persistState()
  }

  function deleteSession(sessionId: string) {
    const index = sessions.value.findIndex((entry) => entry.id === sessionId)
    if (index < 0) {
      return
    }

    sessions.value.splice(index, 1)

    if (!sessions.value.length) {
      const session = createSession()
      sessions.value = [session]
      activeSessionId.value = session.id
      persistState()
      return
    }

    if (activeSessionId.value === sessionId) {
      const next = sessions.value[index] || sessions.value[index - 1] || sessions.value[0]
      if (next) {
        activeSessionId.value = next.id
      }
    }

    persistState()
  }

  setInitialState()

  return {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    appendMessage,
    patchMessage,
    replaceSession,
    resetSession,
    deleteSession,
  }
})
