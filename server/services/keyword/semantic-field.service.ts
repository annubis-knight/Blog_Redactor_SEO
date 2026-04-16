import { join } from 'path'
import { readJson, writeJson } from '../../utils/json-storage.js'
import { log } from '../../utils/logger.js'
import type { SemanticTerm } from '../../../shared/types/index.js'

const DATA_DIR = join(process.cwd(), 'data')
const SEMANTIC_FILE = join(DATA_DIR, 'article-semantic-fields.json')

let cache: Record<string, SemanticTerm[]> | null = null

async function loadAll(): Promise<Record<string, SemanticTerm[]>> {
  if (cache) return cache
  try {
    cache = await readJson<Record<string, SemanticTerm[]>>(SEMANTIC_FILE)
    log.debug(`semanticField: loaded ${Object.keys(cache).length} articles from file`)
  } catch {
    log.debug('semanticField: no file found, starting empty')
    cache = {}
  }
  return cache
}

export async function getField(slug: string): Promise<SemanticTerm[]> {
  const all = await loadAll()
  return all[slug] ?? []
}

export async function saveField(slug: string, terms: SemanticTerm[]): Promise<SemanticTerm[]> {
  const all = await loadAll()
  all[slug] = terms
  await writeJson(SEMANTIC_FILE, all)
  cache = all
  log.debug(`semanticField: saved ${terms.length} terms for ${slug}`)
  return terms
}

export async function addTerms(slug: string, newTerms: SemanticTerm[]): Promise<SemanticTerm[]> {
  log.debug(`semanticField: adding ${newTerms.length} terms for ${slug}`)
  const all = await loadAll()
  const existing = all[slug] ?? []

  for (const incoming of newTerms) {
    const found = existing.find(e => e.term.toLowerCase() === incoming.term.toLowerCase())
    if (found) {
      found.occurrences += incoming.occurrences
      if (incoming.targetCount > found.targetCount) {
        found.targetCount = incoming.targetCount
      }
    } else {
      existing.push(incoming)
    }
  }

  all[slug] = existing
  await writeJson(SEMANTIC_FILE, all)
  cache = all
  return existing
}
