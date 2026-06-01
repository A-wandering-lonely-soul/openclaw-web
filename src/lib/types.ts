export type Role = 'user' | 'assistant'

export interface ImageAttachment {
  type: 'image_jpeg'
  data: string       // base64
  file_path: string  // 仅用于后端存储命名
  previewUrl: string // 本地 object URL，仅前端用
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  images?: ImageAttachment[]
  createdAt: string
  pending?: boolean
  failed?: boolean
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ProviderModelState {
  provider: string
  model: string
}

export interface SkillSummary {
  id: string
  name: string
  enabled: boolean
  entry_allowlist?: string[]
  manifest?: string
  tools?: string[]
  system_prompt?: string
}

export interface SkillsResponse {
  skills: SkillSummary[]
  tool_count: number
  tool_names: string[]
  skill_dirs: string[]
}

export interface InstallSkillPayload {
  git_url: string
  ref?: string
  subdir?: string
  install_name?: string
  overwrite?: boolean
}

export interface ChatSession extends SessionSummary {
  messages: ChatMessage[]
  serverSynced?: boolean   // 该会话来自服务端历史
  messagesLoaded?: boolean // 消息是否已从服务端加载
}

// ─── 行情数据 ───────────────────────────────────────────
export interface StockQuote {
  name: string
  code: string
  latest: number | null
  pct_change: number | null
  open: number | null
  pre_close: number | null
  high: number | null
  low: number | null
  volume: number | null
  amount: number | null
  source: string
  granularity: string
  data_time: string | null
}

export interface GoldQuote {
  symbol: string
  latest: number | null
  change?: number | null
  pct_change?: number | null
  high?: number | null
  low?: number | null
  source: string
  granularity: string
  data_time: string | null
  is_historical?: boolean
}

// ─── 服务端会话列表项 ───────────────────────────────────
export interface ServerSession {
  chat_id: string
  title: string
  updated_at: string
}
