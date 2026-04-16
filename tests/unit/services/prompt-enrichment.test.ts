// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetCocoonStrategy } = vi.hoisted(() => ({
  mockGetCocoonStrategy: vi.fn(),
}))

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}))

vi.mock('../../../server/services/strategy/cocoon-strategy.service', () => ({
  getCocoonStrategy: mockGetCocoonStrategy,
}))

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}))

import { buildCocoonStrategyBlock, loadPrompt } from '../../../server/utils/prompt-loader'
import type { CocoonStrategy, StrategyStepData } from '../../../shared/types/index'

function makeStep(validated: string): StrategyStepData {
  return { input: '', suggestion: null, validated }
}

function makeStrategy(overrides: Partial<Record<'cible' | 'douleur' | 'angle' | 'promesse' | 'cta', string>> = {}): CocoonStrategy {
  return {
    cocoonSlug: 'test-cocoon',
    cible: makeStep(overrides.cible ?? ''),
    douleur: makeStep(overrides.douleur ?? ''),
    angle: makeStep(overrides.angle ?? ''),
    promesse: makeStep(overrides.promesse ?? ''),
    cta: makeStep(overrides.cta ?? ''),
    proposedArticles: [],
    completedSteps: 3,
    updatedAt: '2026-03-30T10:00:00.000Z',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildCocoonStrategyBlock', () => {
  it('returns markdown block when strategy has validated fields', () => {
    const strategy = makeStrategy({
      cible: 'PME du BTP',
      douleur: 'Manque de visibilité en ligne',
      angle: 'SEO local pragmatique',
    })

    const result = buildCocoonStrategyBlock(strategy)

    expect(result).toContain('## Contexte stratégique du cocon')
    expect(result).toContain('- **Cible** : PME du BTP')
    expect(result).toContain('- **Douleur** : Manque de visibilité en ligne')
    expect(result).toContain('- **Angle** : SEO local pragmatique')
    expect(result).toContain('Tiens compte de ce contexte stratégique')
    // Should NOT contain fields with empty validated
    expect(result).not.toContain('**Promesse**')
    expect(result).not.toContain('**CTA**')
  })

  it('returns empty string when no strategy (null passed indirectly)', () => {
    // buildCocoonStrategyBlock takes a CocoonStrategy object directly;
    // the null case is handled by loadCocoonStrategyBlock (private).
    // We test the "all empty" equivalent here.
    const strategy = makeStrategy() // All validated fields are empty

    const result = buildCocoonStrategyBlock(strategy)

    expect(result).toBe('')
  })

  it('returns empty string when all validated fields are empty', () => {
    const strategy = makeStrategy({
      cible: '',
      douleur: '',
      angle: '',
      promesse: '',
      cta: '',
    })

    const result = buildCocoonStrategyBlock(strategy)

    expect(result).toBe('')
  })

  it('includes all 5 fields when all are validated', () => {
    const strategy = makeStrategy({
      cible: 'Artisans',
      douleur: 'Pas de clients',
      angle: 'Approche terrain',
      promesse: 'Résultats en 3 mois',
      cta: 'Demandez un audit gratuit',
    })

    const result = buildCocoonStrategyBlock(strategy)

    expect(result).toContain('**Cible** : Artisans')
    expect(result).toContain('**Douleur** : Pas de clients')
    expect(result).toContain('**Angle** : Approche terrain')
    expect(result).toContain('**Promesse** : Résultats en 3 mois')
    expect(result).toContain('**CTA** : Demandez un audit gratuit')
  })
})

describe('loadPrompt', () => {
  it('enriches prompt when cocoonSlug provided and strategy exists', async () => {
    const strategy = makeStrategy({
      cible: 'PME du BTP',
      douleur: 'Pas de visibilité',
    })
    mockGetCocoonStrategy.mockResolvedValueOnce(strategy)
    mockReadFile.mockResolvedValueOnce('Tu es un expert SEO. Keyword: {{keyword}}')

    const result = await loadPrompt('intent-keywords', { keyword: 'renovation maison' }, { cocoonSlug: 'test-cocoon' })

    expect(result).toContain('Tu es un expert SEO. Keyword: renovation maison')
    expect(result).toContain('## Contexte stratégique du cocon')
    expect(result).toContain('**Cible** : PME du BTP')
    expect(result).toContain('**Douleur** : Pas de visibilité')
    expect(mockGetCocoonStrategy).toHaveBeenCalledWith('test-cocoon')
  })

  it('does not enrich when cocoonSlug is absent', async () => {
    mockReadFile.mockResolvedValueOnce('Tu es un expert SEO. Keyword: {{keyword}}')

    const result = await loadPrompt('intent-keywords', { keyword: 'renovation maison' })

    expect(result).toBe('Tu es un expert SEO. Keyword: renovation maison')
    expect(result).not.toContain('Contexte stratégique')
    expect(mockGetCocoonStrategy).not.toHaveBeenCalled()
  })

  it('does not enrich when strategy is absent (null)', async () => {
    mockGetCocoonStrategy.mockResolvedValueOnce(null)
    mockReadFile.mockResolvedValueOnce('Tu es un expert SEO.')

    const result = await loadPrompt('intent-keywords', {}, { cocoonSlug: 'missing-cocoon' })

    expect(result).toBe('Tu es un expert SEO.')
    expect(result).not.toContain('Contexte stratégique')
    expect(mockGetCocoonStrategy).toHaveBeenCalledWith('missing-cocoon')
  })

  it('replaces {{strategy_context}} placeholder when present in prompt', async () => {
    const strategy = makeStrategy({ cible: 'Architectes' })
    mockGetCocoonStrategy.mockResolvedValueOnce(strategy)
    mockReadFile.mockResolvedValueOnce('Début\n\n{{strategy_context}}\n\nFin')

    const result = await loadPrompt('test-prompt', {}, { cocoonSlug: 'archi-cocoon' })

    expect(result).toContain('Début')
    expect(result).toContain('**Cible** : Architectes')
    expect(result).toContain('Fin')
    // Should NOT append a second copy at the end
    const occurrences = (result.match(/Contexte stratégique du cocon/g) || []).length
    expect(occurrences).toBe(1)
  })

  it('appends strategy block when prompt has no {{strategy_context}} placeholder', async () => {
    const strategy = makeStrategy({ angle: 'SEO local' })
    mockGetCocoonStrategy.mockResolvedValueOnce(strategy)
    mockReadFile.mockResolvedValueOnce('Simple prompt without placeholder.')

    const result = await loadPrompt('simple', {}, { cocoonSlug: 'local-cocoon' })

    expect(result).toContain('Simple prompt without placeholder.')
    expect(result).toContain('**Angle** : SEO local')
    // Strategy block appended after a double newline
    expect(result).toMatch(/placeholder\.\n\n## Contexte stratégique/)
  })

  it('gracefully handles getCocoonStrategy errors', async () => {
    mockGetCocoonStrategy.mockRejectedValueOnce(new Error('disk failure'))
    mockReadFile.mockResolvedValueOnce('Normal prompt.')

    const result = await loadPrompt('safe', {}, { cocoonSlug: 'broken-cocoon' })

    expect(result).toBe('Normal prompt.')
    expect(result).not.toContain('Contexte stratégique')
  })
})
