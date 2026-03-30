import { join } from 'path'
import { log } from '../utils/logger.js'
import { readJson } from '../utils/json-storage.js'
import type {
  LocalEntitiesDb,
  LocalEntity,
  EntityMatch,
  AnchorageScore,
  EntitySuggestion,
  LocalEntityType,
} from '../../shared/types/index.js'

const ENTITIES_PATH = join(process.cwd(), 'data', 'local-entities.json')

let cachedEntities: LocalEntity[] | null = null

async function loadEntities(): Promise<LocalEntity[]> {
  if (cachedEntities) return cachedEntities
  const db = await readJson<LocalEntitiesDb>(ENTITIES_PATH)
  cachedEntities = [...db.quartiers, ...db.entreprises, ...db.lieux, ...db.regions]
  return cachedEntities
}

function findMatches(content: string, entities: LocalEntity[]): EntityMatch[] {
  const contentLower = content.toLowerCase()
  const matches: EntityMatch[] = []

  for (const entity of entities) {
    const names = [entity.name, ...(entity.aliases ?? [])]
    let totalCount = 0
    const positions: number[] = []

    for (const name of names) {
      const nameLower = name.toLowerCase()
      let idx = contentLower.indexOf(nameLower)
      while (idx !== -1) {
        totalCount++
        positions.push(idx)
        idx = contentLower.indexOf(nameLower, idx + 1)
      }
    }

    if (totalCount > 0) {
      matches.push({ entity, count: totalCount, positions })
    }
  }

  return matches
}

function calculateScore(matches: EntityMatch[]): { score: number; typesCovered: LocalEntityType[] } {
  const totalMentions = matches.reduce((sum, m) => sum + m.count, 0)
  const typesCovered = [...new Set(matches.map(m => m.entity.type))]
  const typesCount = typesCovered.length

  let score: number
  if (totalMentions === 0) score = 0
  else if (totalMentions === 1 && typesCount <= 1) score = 1
  else if (totalMentions <= 3 && typesCount <= 1) score = Math.min(totalMentions + 1, 5)
  else if (totalMentions <= 6 && typesCount >= 2) score = Math.min(totalMentions + typesCount, 8)
  else score = Math.min(totalMentions + typesCount, 10)

  return { score: Math.min(score, 10), typesCovered }
}

function generateSuggestions(
  entities: LocalEntity[],
  matches: EntityMatch[],
  typesCovered: LocalEntityType[],
): EntitySuggestion[] {
  const matchedNames = new Set(matches.map(m => m.entity.name.toLowerCase()))
  const suggestions: EntitySuggestion[] = []

  // Suggest missing types first
  const allTypes: LocalEntityType[] = ['quartier', 'entreprise', 'lieu', 'region']
  const missingTypes = allTypes.filter(t => !typesCovered.includes(t))

  for (const type of missingTypes) {
    const candidates = entities.filter(e => e.type === type && !matchedNames.has(e.name.toLowerCase()))
    if (candidates.length > 0) {
      const entity = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))]
      suggestions.push({
        entity,
        reason: `Ajoutez une référence de type "${type}" pour diversifier l'ancrage local`,
      })
    }
  }

  // Suggest popular entities not yet mentioned
  const popularEntities = entities
    .filter(e => !matchedNames.has(e.name.toLowerCase()))
    .slice(0, 3)

  for (const entity of popularEntities) {
    if (suggestions.length >= 5) break
    if (!suggestions.some(s => s.entity.name === entity.name)) {
      suggestions.push({
        entity,
        reason: `Mentionner "${entity.name}" pour renforcer la pertinence locale`,
      })
    }
  }

  return suggestions.slice(0, 5)
}

export async function scoreLocalAnchoring(content: string): Promise<AnchorageScore> {
  log.info(`Scoring local anchoring (content length: ${content.length})`)
  const entities = await loadEntities()
  const matches = findMatches(content, entities)
  const { score, typesCovered } = calculateScore(matches)
  const suggestions = score < 5 ? generateSuggestions(entities, matches, typesCovered) : []
  log.debug(`Local anchoring score: ${score}/10`, { matches: matches.length, typesCovered })

  return {
    score,
    maxScore: 10,
    matches,
    typesCovered,
    suggestions,
  }
}

export async function getEntities(): Promise<LocalEntity[]> {
  log.debug('Loading local entities')
  return loadEntities()
}
