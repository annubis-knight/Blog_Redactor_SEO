// @vitest-environment node
/**
 * FR-INFRA-PROMPT-LAYERS — un prompt reçoit exactement les variables qu'il attend.
 *
 * Le 2026-09-24, le budget de mots de chaque section du pilier 1013 s'est perdu :
 * la route fournissait `sectionBudgetHint`, le prompt ne l'attendait pas, et le
 * chargeur n'a rien dit. À l'inverse, une variable attendue mais absente partait
 * telle quelle (`{{painPoint}}`) chez l'IA. Les deux cas sont désormais des erreurs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockReadFile, mockGetThemeConfig, mockGetEntities } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGetThemeConfig: vi.fn(),
  mockGetEntities: vi.fn(),
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return { ...actual, readFile: mockReadFile }
})
vi.mock('../../../server/services/strategy/theme-config.service', () => ({
  getThemeConfig: mockGetThemeConfig,
}))
vi.mock('../../../server/services/infra/local-entities.service', () => ({
  getEntities: mockGetEntities,
}))

import { renderPromptTemplate, templateKeys, loadPrompt, PromptTemplateError, PROMPT_GLOBALS } from '../../../server/utils/prompt-loader'

beforeEach(() => {
  mockReadFile.mockReset()
  mockGetThemeConfig.mockReset()
  mockGetEntities.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('renderPromptTemplate — rendu en une passe', () => {
  it('remplace chaque variable, toutes ses occurrences', () => {
    const r = renderPromptTemplate('{{a}} puis {{b}} puis {{a}}', { a: 'x', b: 'y' })
    expect(r.text).toBe('x puis y puis x')
    expect(r.missing).toEqual([])
    expect(r.unused).toEqual([])
  })

  it('signale une variable attendue mais absente', () => {
    const r = renderPromptTemplate('Douleur : {{painPoint}}', {})
    expect(r.missing).toEqual(['painPoint'])
  })

  it('signale une variable fournie mais inutilisée', () => {
    const r = renderPromptTemplate('Mot-clé : {{keyword}}', { keyword: 'k', sectionBudgetHint: '300 mots' })
    expect(r.unused).toEqual(['sectionBudgetHint'])
  })

  it('n’interprète pas les motifs $ du texte inséré', () => {
    const r = renderPromptTemplate('Réponse : {{answer}}', { answer: 'prix $& et $1 et $$' })
    expect(r.text).toBe('Réponse : prix $& et $1 et $$')
  })

  it('ne réinterprète pas une valeur qui contient un repère', () => {
    const r = renderPromptTemplate('{{a}} / {{b}}', { a: '{{b}}', b: 'B' })
    expect(r.text).toBe('{{b}} / B')
  })

  it('garde une section dont la valeur n’est pas vide, sans ses marqueurs', () => {
    const r = renderPromptTemplate('A\n{{#ctx}}Contexte : {{ctx}}\n{{/ctx}}B', { ctx: 'riche' })
    expect(r.text).toBe('A\nContexte : riche\nB')
  })

  it('retire une section vide ou faite d’espaces, marqueurs compris', () => {
    expect(renderPromptTemplate('A\n{{#ctx}}Contexte : {{ctx}}\n{{/ctx}}B', { ctx: '' }).text).toBe('A\nB')
    expect(renderPromptTemplate('A{{#ctx}}[{{ctx}}]{{/ctx}}B', { ctx: '  ' }).text).toBe('AB')
  })

  it('traite une section drapeau (clé citée seulement en section)', () => {
    const r = renderPromptTemplate('{{#isPilier}}Règles pilier{{/isPilier}}{{#isSpe}}Règles spé{{/isSpe}}', { isPilier: 'oui', isSpe: '' })
    expect(r.text).toBe('Règles pilier')
    expect(r.missing).toEqual([])
    expect(r.unused).toEqual([])
  })

  it('traite des sections imbriquées de clés différentes', () => {
    const r = renderPromptTemplate('{{#a}}A[{{#b}}B{{/b}}]{{/a}}', { a: '1', b: '' })
    expect(r.text).toBe('A[]')
  })

  it('une section attendue et non fournie est manquante', () => {
    expect(renderPromptTemplate('{{#flag}}x{{/flag}}', {}).missing).toEqual(['flag'])
  })

  it('les variables globales ne sont jamais « inutilisées »', () => {
    const r = renderPromptTemplate('Rien', { today: '25 septembre 2026' }, { globals: ['today'] })
    expect(r.unused).toEqual([])
  })
})

describe('templateKeys', () => {
  it('liste variables et sections, sans doublon', () => {
    expect(templateKeys('{{a}} {{#b}}{{b}} {{c}}{{/b}} {{a}}')).toEqual({ variables: ['a', 'b', 'c'], sections: ['b'] })
  })
})

describe('loadPrompt — strict hors production', () => {
  it('lève une erreur nommée quand une variable manque', async () => {
    mockReadFile.mockResolvedValueOnce('Douleur : {{painPoint}}')
    await expect(loadPrompt('propose-lieutenants', {})).rejects.toThrow(PromptTemplateError)
    mockReadFile.mockResolvedValueOnce('Douleur : {{painPoint}}')
    await expect(loadPrompt('propose-lieutenants', {})).rejects.toThrow(/propose-lieutenants.*painPoint/)
  })

  it('lève une erreur quand une variable fournie n’est pas attendue', async () => {
    mockReadFile.mockResolvedValueOnce('Mot-clé : {{keyword}}')
    await expect(loadPrompt('generate-article-section', { keyword: 'k', sectionBudgetHint: '300' }))
      .rejects.toThrow(/sectionBudgetHint/)
  })

  it('lève une erreur quand escapeKeys cite une clé non fournie', async () => {
    mockReadFile.mockResolvedValueOnce('Texte : {{sectionHtml}}')
    await expect(loadPrompt('humanize-section', { sectionHtml: '<p>x</p>' }, { escapeKeys: ['articleHtml'] }))
      .rejects.toThrow(/articleHtml/)
  })

  it('en production : pas d’erreur, le repère absent est rendu vide et journalisé', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockReadFile.mockResolvedValueOnce('Douleur : [{{painPoint}}]')
    await expect(loadPrompt('x', {})).resolves.toBe('Douleur : []')
  })
})

describe('loadPrompt — variables globales (couche contexte)', () => {
  it('fournit today et year à la date du jour, en français', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'))
    mockReadFile.mockResolvedValueOnce('Nous sommes le {{today}} ({{year}}).')
    await expect(loadPrompt('x')).resolves.toBe('Nous sommes le 25 septembre 2026 (2026).')
  })

  it('fournit la zone depuis la configuration et les repères depuis local_entities', async () => {
    mockGetThemeConfig.mockResolvedValueOnce({ avatar: { location: 'Bordeaux, France' } })
    mockGetEntities.mockResolvedValueOnce([
      { name: 'Chartrons', type: 'quartier', aliases: [] },
      { name: 'Gironde', type: 'region', aliases: [] },
      { name: 'Miroir d’eau', type: 'lieu', aliases: [] },
      { name: 'Cdiscount', type: 'entreprise', aliases: [] },
    ])
    mockReadFile.mockResolvedValueOnce('Zone : {{zone}}\n{{#zone_landmarks}}Repères : {{zone_landmarks}}{{/zone_landmarks}}')

    const text = await loadPrompt('system-propulsite')

    expect(text).toContain('Zone : Bordeaux, France')
    expect(text).toContain('Chartrons')
    expect(text).toContain('Gironde')
    expect(text).toContain('Miroir d’eau')
    expect(text, 'les entreprises ne sont pas proposées comme repères').not.toContain('Cdiscount')
  })

  it('ne lit ni la configuration ni les entités si le prompt ne cite pas la zone', async () => {
    mockReadFile.mockResolvedValueOnce('Mot-clé : {{keyword}}')
    await loadPrompt('x', { keyword: 'k' })
    expect(mockGetThemeConfig).not.toHaveBeenCalled()
    expect(mockGetEntities).not.toHaveBeenCalled()
  })

  it('zone inconnue (base indisponible) : section retirée, pas d’erreur', async () => {
    mockGetThemeConfig.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    mockGetEntities.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    mockReadFile.mockResolvedValueOnce('A{{#zone}} à {{zone}}{{/zone}}.')
    await expect(loadPrompt('x')).resolves.toBe('A.')
  })

  it('PROMPT_GLOBALS liste les variables fournies par le chargeur', () => {
    expect([...PROMPT_GLOBALS].sort()).toEqual(['strategy_context', 'today', 'year', 'zone', 'zone_landmarks'])
  })
})
