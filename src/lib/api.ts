import { API_BASE_URL, DEFAULT_TIMEOUT_MS } from './constants'
import type { ProviderModelState } from './types'

interface ApiErrorPayload {
  response?: string
  message?: string
}

function tryParseJson<T>(text: string): T | null {
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    })

    const raw = await response.text()
    const json = tryParseJson<T | ApiErrorPayload>(raw)

    if (!response.ok) {
      const payload = (json || {}) as ApiErrorPayload
      const fallback = raw.trim() || `请求失败（HTTP ${response.status}）`
      throw new Error(payload.response || payload.message || fallback)
    }

    if (!json) {
      throw new Error('服务返回了空响应，请稍后重试')
    }

    return json as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

export async function sendChatMessage(prompt: string, chatId: string) {
  return requestJson<{ response: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      chat_id: chatId,
      entry: 'web_frontend',
    }),
  })
}

export async function clearChatContext(chatId: string) {
  return requestJson<{ status: string }>('/clear_context', {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId }),
  })
}

export async function fetchModelState() {
  return requestJson<ProviderModelState>('/get_model', {
    method: 'GET',
  })
}

export async function updateModelState(provider: string, model: string) {
  return requestJson<{ status: string; provider: string; model: string }>('/set_model', {
    method: 'POST',
    body: JSON.stringify({ provider, model }),
  })
}
