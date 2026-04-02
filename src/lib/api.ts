import { API_BASE_URL, DEFAULT_TIMEOUT_MS } from './constants'
import type { ProviderModelState } from './types'

interface ApiErrorPayload {
  response?: string
  message?: string
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

    const data = (await response.json()) as T | ApiErrorPayload

    if (!response.ok) {
      const payload = data as ApiErrorPayload
      throw new Error(payload.response || payload.message || '请求失败')
    }

    return data as T
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
    body: JSON.stringify({ prompt, chat_id: chatId }),
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
