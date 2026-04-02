export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
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
