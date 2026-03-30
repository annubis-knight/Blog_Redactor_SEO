const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const

const STYLES = {
  DEBUG: 'color: #888; font-weight: normal',
  INFO:  'color: #0ea5e9; font-weight: bold',
  WARN:  'color: #f59e0b; font-weight: bold',
  ERROR: 'color: #ef4444; font-weight: bold',
}

const EMOJIS = { DEBUG: '🔍', INFO: '✅', WARN: '⚠️', ERROR: '❌' }

type LogLevel = keyof typeof LEVELS

let currentLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'DEBUG'

function formatLog(level: LogLevel, msg: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return

  const prefix = `${EMOJIS[level]} [${level}]`
  const style = STYLES[level]

  if (data !== undefined) {
    console.log(`%c${prefix}%c ${msg}`, style, 'color: inherit', data)
  } else {
    console.log(`%c${prefix}%c ${msg}`, style, 'color: inherit')
  }
}

export const log = {
  debug: (msg: string, data?: unknown) => formatLog('DEBUG', msg, data),
  info:  (msg: string, data?: unknown) => formatLog('INFO', msg, data),
  warn:  (msg: string, data?: unknown) => formatLog('WARN', msg, data),
  error: (msg: string, data?: unknown) => formatLog('ERROR', msg, data),
  setLevel: (level: LogLevel) => { currentLevel = level },
}
