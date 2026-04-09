import type { ProviderModelState } from './types'

export const STORAGE_KEY = 'openclaw-web-state'
export const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 120000)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export const OLLAMA_WEB_MODELS = ['qwen2.5:3b']
export const OLLAMA_HEAVY_MODELS = new Set(['llama3.1:8b', 'qwen2.5:7b-instruct', 'gemma3:12b'])

export const MODEL_OPTIONS: Record<string, string[]> = {
  copilot: [
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini',
    'o3-mini',
    'o1-mini',
    'claude-opus-4.6',
    'claude-sonnet-4.6',
    'gpt-5.3-codex',
    'gemini-3.1-pro',
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  ollama: OLLAMA_WEB_MODELS,
}

export const WEB_DISABLED_MODELS = new Set([
  'claude-opus-4.6',
  'claude-sonnet-4.6',
  'gpt-5.3-codex',
  'gemini-3.1-pro',
  ...OLLAMA_HEAVY_MODELS,
])

export const DEFAULT_MODEL_STATE: ProviderModelState = {
  provider: 'copilot',
  model: 'gpt-4.1',
}
