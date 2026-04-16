import { join } from 'path'
import { log } from '../../utils/logger.js'
import { readJson, writeJson } from '../../utils/json-storage.js'
import { slugify } from '../external/dataforseo.service.js'
import type { PaaCacheEntry } from '../../../shared/types/intent.types.js'

const PAA_CACHE_DIR = join(process.cwd(), 'data', 'cache', 'paa')
const REVERSE_INDEX_PATH = join(PAA_CACHE_DIR, '_reverse-index.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000       // 24h for non-empty
const CACHE_TTL_EMPTY_MS = 30 * 60 * 1000       // 30min for empty results

function getCachePath(keyword: string): string {
  return join(PAA_CACHE_DIR, `${slugify(keyword)}.json`)
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Forward index: keyword → PAA items ---

export async function readPaaCache(keyword: string, requiredDepth: number = 1): Promise<PaaCacheEntry | null> {
  try {
    const entry = await readJson<PaaCacheEntry>(getCachePath(keyword))
    const age = Date.now() - new Date(entry.cachedAt).getTime()
    const ttl = entry.isEmpty ? CACHE_TTL_EMPTY_MS : CACHE_TTL_MS

    if (age >= ttl) {
      log.debug(`PAA cache expired for "${keyword}"`)
      return null
    }

    // If cached at lower depth than requested, treat as miss
    const cachedDepth = entry.maxDepth ?? 1
    if (cachedDepth < requiredDepth) {
      log.debug(`PAA cache depth mismatch for "${keyword}": cached=${cachedDepth}, requested=${requiredDepth}`)
      return null
    }

    log.debug(`PAA cache hit for "${keyword}" (${entry.paaItems.length} questions, depth=${cachedDepth})`)
    return entry
  } catch {
    return null
  }
}

export async function writePaaCache(entry: PaaCacheEntry): Promise<void> {
  await writeJson(getCachePath(entry.keyword), entry)
  log.debug(`PAA cache written for "${entry.keyword}" (${entry.paaItems.length} questions)`)

  // Update reverse index
  const questions = entry.paaItems.map(p => p.question)
  await updateReverseIndex(entry.keyword, questions)
}

// --- Reverse index: question → keywords ---

interface ReverseIndex {
  entries: Record<string, { keywords: string[]; lastSeenAt: string }>
}

async function readReverseIndex(): Promise<ReverseIndex> {
  try {
    return await readJson<ReverseIndex>(REVERSE_INDEX_PATH)
  } catch {
    return { entries: {} }
  }
}

async function updateReverseIndex(keyword: string, questions: string[]): Promise<void> {
  const index = await readReverseIndex()
  const now = new Date().toISOString()
  const kwLower = keyword.toLowerCase()

  for (const q of questions) {
    const key = normalize(q)
    if (!key) continue

    if (!index.entries[key]) {
      index.entries[key] = { keywords: [kwLower], lastSeenAt: now }
    } else {
      if (!index.entries[key].keywords.includes(kwLower)) {
        index.entries[key].keywords.push(kwLower)
      }
      index.entries[key].lastSeenAt = now
    }
  }

  await writeJson(REVERSE_INDEX_PATH, index)
  log.debug(`[PAA Cache] Reverse index updated: ${questions.length} questions mapped to "${keyword}"`)
}

/**
 * Find all keywords that triggered a given PAA question.
 * Returns empty array if question not found.
 */
export async function findKeywordsForQuestion(question: string): Promise<string[]> {
  const index = await readReverseIndex()
  const key = normalize(question)
  const keywords = index.entries[key]?.keywords ?? []
  log.debug(`[PAA Cache] Reverse lookup "${question.slice(0, 50)}..." → ${keywords.length} keywords`)
  return keywords
}
