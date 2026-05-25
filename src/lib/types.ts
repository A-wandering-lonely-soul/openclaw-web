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
}
