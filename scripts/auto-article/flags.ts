/**
 * Parsing pur des arguments CLI. Aucune I/O, entièrement testable.
 *
 * Formes acceptées :
 *   --mode=real | --mode real
 *   --verbose | -v
 *   --config=run.json | --config run.json
 *   --resume=123 | --resume 123
 *   --port=3400
 *   --help | -h
 */

import type { CanonicalArticleType, RuntimeMode } from './types.js'

export interface ParsedFlags {
  mode?: RuntimeMode
  verbose?: boolean
  configPath?: string
  resumeArticleId?: number
  port?: number
  help?: boolean
  /** Impose le cocon cible (court-circuite la proposition d'emplacement). */
  cocoon?: string
  /** Impose le niveau de l'article. */
  level?: CanonicalArticleType
}

const VALUE_FLAGS = new Set(['--mode', '--config', '--resume', '--port', '--cocoon', '--level'])

const LEVELS: CanonicalArticleType[] = ['pilier', 'intermediaire', 'specifique']

export function parseArgs(argv: string[]): ParsedFlags {
  const flags: ParsedFlags = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg == null) continue

    if (arg === '--help' || arg === '-h') {
      flags.help = true
      continue
    }
    if (arg === '--verbose' || arg === '-v') {
      flags.verbose = true
      continue
    }

    // Support "--flag=value" et "--flag value"
    let key = arg
    let value: string | undefined
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq !== -1) {
      key = arg.slice(0, eq)
      value = arg.slice(eq + 1)
    } else if (VALUE_FLAGS.has(arg)) {
      value = argv[i + 1]
      i++
    }

    switch (key) {
      case '--mode':
        flags.mode = assertMode(value)
        break
      case '--config':
        flags.configPath = requireValue(key, value)
        break
      case '--resume':
        flags.resumeArticleId = assertPositiveInt(key, value)
        break
      case '--port':
        flags.port = assertPositiveInt(key, value)
        break
      case '--cocoon':
        flags.cocoon = requireValue(key, value)
        break
      case '--level':
        flags.level = assertLevel(value)
        break
      default:
        throw new Error(`Argument inconnu : ${arg}`)
    }
  }

  return flags
}

function requireValue(key: string, value: string | undefined): string {
  if (value == null || value === '') throw new Error(`${key} attend une valeur`)
  return value
}

function assertLevel(value: string | undefined): CanonicalArticleType {
  if (value && (LEVELS as string[]).includes(value)) return value as CanonicalArticleType
  throw new Error(`--level attend ${LEVELS.join(' | ')} (reçu : ${value ?? 'rien'})`)
}

function assertMode(value: string | undefined): RuntimeMode {
  if (value === 'mock' || value === 'real') return value
  throw new Error(`--mode attend "mock" ou "real" (reçu : ${value ?? 'rien'})`)
}

function assertPositiveInt(key: string, value: string | undefined): number {
  const raw = requireValue(key, value)
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${key} attend un entier positif (reçu : ${raw})`)
  return n
}
