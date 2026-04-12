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

export interface ChatSession extends SessionSummary {
  messages: ChatMessage[]
}
