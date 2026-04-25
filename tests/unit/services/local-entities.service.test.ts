import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('../../../server/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
  query: (...args: unknown[]) => mockQuery(...args),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const MOCK_ENTITIES = [
  { name: 'Saint-Cyprien', type: 'quartier', aliases: ['St-Cyprien'], region: null },
  { name: 'Les Carmes', type: 'quartier', aliases: [], region: null },
  { name: 'Airbus', type: 'entreprise', aliases: [], region: null },
  { name: 'Thales', type: 'entreprise', aliases: [], region: null },
  { name: 'Place du Capitole', type: 'lieu', aliases: [], region: null },
  { name: 'Basilique Saint-Sernin', type: 'lieu', aliases: [], region: null },
  { name: 'Occitanie', type: 'region', aliases: [], region: null },
  { name: 'Haute-Garonne', type: 'region', aliases: [], region: null },
]

beforeEach(() => {
  vi.resetModules()
  mockQuery.mockReset()
  mockQuery.mockResolvedValue({ rows: MOCK_ENTITIES, rowCount: MOCK_ENTITIES.length })
})

async function importService() {
  return await import('../../../server/services/infra/local-entities.service')
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
    const content = 'Airbus est un leader. Thales aussi. Airbus recrute encore.'
    const result = await scoreLocalAnchoring(content)

    expect(result.score).toBeGreaterThan(1)
    expect(result.matches.length).toBeGreaterThanOrEqual(2)
  })

  it('returns highest scores for multi-type mentions (quartier + entreprise + lieu)', async () => {
    const { scoreLocalAnchoring } = await importService()
    const content =
      'Le quartier Saint-Cyprien accueille les bureaux de Airbus. ' +
      'La Place du Capitole est un lieu emblematique de la region Occitanie. ' +
      'Thales est aussi present a Toulouse dans Les Carmes. ' +
      'Basilique Saint-Sernin attire les visiteurs de Haute-Garonne.'

    const result = await scoreLocalAnchoring(content)

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
    const result = await scoreLocalAnchoring('Airbus est un partenaire.')

    expect(result.score).toBeLessThan(5)
    expect(result.suggestions.length).toBeGreaterThan(0)
    const suggestedNames = result.suggestions.map(s => s.entity.name.toLowerCase())
    expect(suggestedNames).not.toContain('airbus')
    for (const suggestion of result.suggestions) {
      expect(suggestion.reason).toBeTruthy()
    }
  })

  it('does not generate suggestions when score >= 5', async () => {
    const { scoreLocalAnchoring } = await importService()
    const content =
      'Saint-Cyprien et Les Carmes sont des quartiers. ' +
      'Airbus et Thales sont des entreprises. ' +
      'Place du Capitole et Basilique Saint-Sernin sont des lieux.'

    const result = await scoreLocalAnchoring(content)

    expect(result.score).toBeGreaterThanOrEqual(5)
    expect(result.suggestions).toHaveLength(0)
  })
})
