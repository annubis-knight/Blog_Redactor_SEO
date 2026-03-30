import chalk from 'chalk'
import { logsConfig } from '../../logs.config.js'

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const

function getCallerInfo(): string {
  const err = new Error()
  const stack = err.stack?.split('\n')[3]
  const match = stack?.match(/\((.+):(\d+):\d+\)/) || stack?.match(/at (.+):(\d+):\d+/)
  if (match) {
    const parts = match[1].replace(/\\/g, '/').split('/')
    return `${parts.slice(-2).join('/')}:${match[2]}`
  }
  return 'unknown'
}

function formatLog(
  level: keyof typeof LEVELS,
  emoji: string,
  color: (s: string) => string,
  msg: string,
  data?: unknown,
): void {
  if (LEVELS[level] < LEVELS[logsConfig.level]) return

  const parts: string[] = []
  if (logsConfig.showTimestamp) parts.push(chalk.dim(new Date().toISOString().slice(11, 23)))
  parts.push(color(`[${level}]`))
  if (logsConfig.emoji) parts.push(emoji)
  if (logsConfig.showFilePath) parts.push(chalk.dim(getCallerInfo()))
  parts.push(msg)

  if (data !== undefined) {
    console.log(parts.join(' '), data)
  } else {
    console.log(parts.join(' '))
  }
}

export const log = {
  debug: (msg: string, data?: unknown) => formatLog('DEBUG', '🔍', chalk.gray, msg, data),
  info:  (msg: string, data?: unknown) => formatLog('INFO',  '✅', chalk.cyan, msg, data),
  warn:  (msg: string, data?: unknown) => formatLog('WARN',  '⚠️',  chalk.yellow, msg, data),
  error: (msg: string, data?: unknown) => formatLog('ERROR', '❌', chalk.red.bold, msg, data),
}
