/**
 * Логирование для отладки. Пишет в console и хранит последние N записей для просмотра в интерфейсе.
 */

const PREFIX = '[VisionTool]'
const MAX_ENTRIES = 100

const logEntries = []

function timestamp() {
  return new Date().toISOString()
}

function capture(level, tag, message, data) {
  const entry = {
    ts: timestamp(),
    level,
    tag,
    message,
    data: data !== undefined ? (typeof data === 'object' ? { ...data } : data) : undefined,
  }
  logEntries.push(entry)
  if (logEntries.length > MAX_ENTRIES) logEntries.shift()
  return entry
}

export function log(tag, message, data) {
  const entry = capture('info', tag, message, data)
  console.log(`${PREFIX} [${entry.ts}] [${tag}]`, message, data !== undefined ? data : '')
  return entry
}

export function warn(tag, message, data) {
  const entry = capture('warn', tag, message, data)
  console.warn(`${PREFIX} [${entry.ts}] [${tag}]`, message, data !== undefined ? data : '')
  return entry
}

export function error(tag, message, data) {
  const entry = capture('error', tag, message, data)
  console.error(`${PREFIX} [${entry.ts}] [${tag}]`, message, data !== undefined ? data : '')
  return entry
}

export function getLogEntries() {
  return [...logEntries]
}

export function clearLogs() {
  logEntries.length = 0
}
