export function makeId(prefix: string) {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${randomPart}`
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function trimTitle(value: string) {
  const compact = value.trim().replace(/\s+/g, ' ')
  return compact.slice(0, 20) || '新会话'
}
