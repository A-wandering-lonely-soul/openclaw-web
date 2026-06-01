import { API_BASE_URL, DEFAULT_TIMEOUT_MS } from './constants'
import type { InstallSkillPayload, ProviderModelState, ServerSession, SkillsResponse, StockQuote, GoldQuote } from './types'

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

export async function sendChatMessage(
  prompt: string,
  chatId: string,
  username = '',
  sessionTitle = '',
  images?: { type: string; data: string; file_path: string }[],
) {
  return requestJson<{ response: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      chat_id: chatId,
      entry: 'web_frontend',
      username,
      title: sessionTitle,
      ...(images && images.length ? { images } : {}),
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

export async function fetchSkills() {
  return requestJson<SkillsResponse>('/skills', {
    method: 'GET',
  })
}

export async function reloadSkills() {
  return requestJson<SkillsResponse>('/skills/reload', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function toggleSkill(id: string, enabled: boolean) {
  return requestJson<{ status: string; id: string; enabled: boolean }>('/skills/toggle', {
    method: 'POST',
    body: JSON.stringify({ id, enabled }),
  })
}

export async function installSkill(payload: InstallSkillPayload) {
  return requestJson<{ status: string; installed: { dir: string; skill_id: string; name: string } }>('/skills/install', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(username: string, password: string) {
  return requestJson<{ role: string; username: string; display_name: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function fetchSessions(username: string) {
  return requestJson<{ sessions: ServerSession[] }>(
    `/sessions?username=${encodeURIComponent(username)}`,
  )
}

export async function fetchSessionMessages(chatId: string) {
  return requestJson<{ messages: Array<{ id: string; role: string; content: string; createdAt: string }> }>(
    `/sessions/${encodeURIComponent(chatId)}/messages`,
    {},
    30_000,
  )
}

export async function fetchMarketQuote(symbol: string, kind: 'stock' | 'gold' = 'stock') {
  return requestJson<StockQuote | GoldQuote>(
    `/market/quote?symbol=${encodeURIComponent(symbol)}&kind=${kind}`,
    {},
    30_000,
  )
}

export interface WatchItem {
  symbol: string
  kind: 'stock' | 'gold'
  label?: string | null
}

export async function fetchWatchlist(username: string): Promise<WatchItem[]> {
  const res = await requestJson<{ items: WatchItem[] }>(
    `/watchlist?username=${encodeURIComponent(username)}`,
  )
  return res.items
}

export async function saveWatchlist(username: string, items: WatchItem[]): Promise<void> {
  await requestJson<{ status: string }>('/watchlist', {
    method: 'PUT',
    body: JSON.stringify({ username, items }),
  })
}

