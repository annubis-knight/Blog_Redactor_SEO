import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock json-storage before importing the service
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

import { readJson } from '../../../server/utils/json-storage'

const mockReadJson = vi.mocked(readJson)

const MOCK_ENTITIES_DB = {
  quartiers: [
    { name: 'Saint-Cyprien', type: 'quartier' as const, aliases: ['St-Cyprien'] },
    { name: 'Les Carmes', type: 'quartier' as const },
  ],
  entreprises: [
    { name: 'Airbus', type: 'entreprise' as const },
    { name: 'Thales', type: 'entreprise' as const },
  ],
  lieux: [
    { name: 'Place du Capitole', type: 'lieu' as const },
    { name: 'Basilique Saint-Sernin', type: 'lieu' as const },
  ],
  regions: [
    { name: 'Occitanie', type: 'region' as const },
    { name: 'Haute-Garonne', type: 'region' as const },
  ],
}

// Reset module cache between tests so the service's `cachedEntities` is cleared
beforeEach(async () => {
  vi.resetModules()
  mockReadJson.mockReset()
  mockReadJson.mockResolvedValue(MOCK_ENTITIES_DB)
})

async function importService() {
  const mod = await import('../../../server/services/infra/local-entities.service')
  return mod
}

describe('local-entities.service — getEntities', () => {
  it('returns flattened entity list from all categories', async () => {
    const { getEntities } = await importService()
    const entities = await getEntities()

    expect(entities).toHaveLength(8)
    expect(entities.map(e => e.name)).toEqual(
      expect.arrayContaining([
        'Saint-Cyprien', 'Les Carmes',
        'Airbus', 'Thales',
        'Place du Capitole', 'Basilique Saint-Sernin',
        'Occitanie', 'Haute-Garonne',
      ]),
    )
  })
})

describe('local-entities.service — scoreLocalAnchoring', () => {
  it('returns score 0 for content with no local entities', async () => {
    const { scoreLocalAnchoring } = await importService()
    const result = await scoreLocalAnchoring('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

    expect(result.score).toBe(0)
    expect(result.matches).toHaveLength(0)
    expect(result.typesCovered).toHaveLength(0)
  })

  it('returns score 1 for content with 1 mention', async () => {
    const { scoreLocalAnchoring } = await importService()
    const result = await scoreLocalAnchoring('Nous sommes situes a Airbus pour cette mission.')

    expect(result.score).toBe(1)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].entity.name).toBe('Airbus')
    expect(result.matches[0].count).toBe(1)
  })

  it('returns higher score for multiple mentions', async () => {
    const { scoreLocalAnchoring } = await importService()
    // 3 mentions of same type (entreprise): Airbus + Thales + Airbus again
    const content = 'Airbus est un leader. Thales aussi. Airbus recrute encore.'
    const result = await scoreLocalAnchoring(content)

    expect(result.score).toBeGreaterThan(1)
    expect(result.matches.length).toBeGreaterThanOrEqual(2) // Airbus + Thales
  })

  it('returns highest scores for multi-type mentions (quartier + entreprise + lieu)', async () => {
    const { scoreLocalAnchoring } = await importService()
    // mentions across 3+ types → score should be high
    const content =
      'Le quartier Saint-Cyprien accueille les bureaux de Airbus. ' +
      'La Place du Capitole est un lieu emblematique de la region Occitanie. ' +
      'Thales est aussi present a Toulouse dans Les Carmes. ' +
      'Basilique Saint-Sernin attire les visiteurs de Haute-Garonne.'

    const result = await scoreLocalAnchoring(content)

    // 7+ mentions across 4 types → score should be >= 8
    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(result.typesCovered.length).toBeGreaterThanOrEqual(3)
  })

  it('detects aliases (St-Cyprien matches Saint-Cyprien)', async () => {
    const { scoreLocalAnchoring } = await importService()
    const result = await scoreLocalAnchoring('Nos bureaux sont dans le quartier St-Cyprien.')

    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].entity.name).toBe('Saint-Cyprien')
    expect(result.matches[0].count).toBe(1)
    expect(result.score).toBeGreaterThanOrEqual(1)
  })

  it('matches case-insensitively', async () => {
    const { scoreLocalAnchoring } = await importService()
    const result = await scoreLocalAnchoring('AIRBUS et la PLACE DU CAPITOLE sont des references locales.')

    expect(result.matches).toHaveLength(2)
    const matchedNames = result.matches.map(m => m.entity.name)
    expect(matchedNames).toContain('Airbus')
    expect(matchedNames).toContain('Place du Capitole')
  })

  it('returns typesCovered with matched types', async () => {
    const { scoreLocalAnchoring } = await importService()
    const content = 'Airbus est installe pres de la Place du Capitole en Occitanie.'
    const result = await scoreLocalAnchoring(content)

    expect(result.typesCovered).toEqual(
      expect.arrayContaining(['entreprise', 'lieu', 'region']),
    )
    expect(result.typesCovered).toHaveLength(3)
  })

  it('generates suggestions when score < 5', async () => {
    const { scoreLocalAnchoring } = await importService()
    // Only 1 mention → score = 1, which is < 5
    const result = await scoreLocalAnchoring('Airbus est un partenaire.')

    expect(result.score).toBeLessThan(5)
    expect(result.suggestions.length).toBeGreaterThan(0)
    // Suggestions should not include already-matched entities
    const suggestedNames = result.suggestions.map(s => s.entity.name.toLowerCase())
    expect(suggestedNames).not.toContain('airbus')
    // Each suggestion should have a reason
    for (const suggestion of result.suggestions) {
      expect(suggestion.reason).toBeTruthy()
    }
  })

  it('does not generate suggestions when score >= 5', async () => {
    const { scoreLocalAnchoring } = await importService()
    // Enough mentions across types to get score >= 5
    const content =
      'Saint-Cyprien et Les Carmes sont des quartiers. ' +
      'Airbus et Thales sont des entreprises. ' +
      'Place du Capitole et Basilique Saint-Sernin sont des lieux.'

    const result = await scoreLocalAnchoring(content)

    expect(result.score).toBeGreaterThanOrEqual(5)
    expect(result.suggestions).toHaveLength(0)
  })
})
