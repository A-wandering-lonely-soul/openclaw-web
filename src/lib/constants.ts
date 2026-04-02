import type { ProviderModelState } from './types'

export const STORAGE_KEY = 'openclaw-web-state'
export const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 120000)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export const MODEL_OPTIONS: Record<string, string[]> = {
  copilot: ['gpt-4.1', 'gpt-4o', 'o1', 'o1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
}

export const DEFAULT_MODEL_STATE: ProviderModelState = {
  provider: 'copilot',
  model: 'gpt-4.1',
}
