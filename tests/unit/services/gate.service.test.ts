// @vitest-environment node
/**
 * Porte de qualité, côté serveur, sans base (I/O simulées) — recette du 2026-09-30.
 *
 *   - FR-INFRA-GATE-WAIVER, FR-RED-PUBLISH-GATE : une dérogation vaut pour le
 *     point qu'elle couvre et les données de CE point (INFRA-19, express 10 b) ;
 *     le serveur refuse une réponse à un point qui a changé depuis sa lecture.
 *   - FR-CAP-LOCK-GATE (express 3, CAP-10) : « Google ne suggère pas » se juge
 *     sur la valeur du panneau du Capitaine, pas sur le nombre brut de suggestions.
 *   - FR-LIE-LOCK-GATE (INFRA-14) : l'alarme propose « À la place : » les
 *     propositions non cochées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

interface WaiverRow {
  article_id: number; gate_id: string; rule: string; level: string
  category: string | null; reason: string | null; input_hash: string; created_at: Date
}

const m = vi.hoisted(() => ({
  query: vi.fn(),
  getArticleById: vi.fn(),
  getArticleKeywords: vi.fn(),
  loadArticleMicroContext: vi.fn(),
  getKeywordMetrics: vi.fn(),
  getArticleContent: vi.fn(),
  loadZoneContext: vi.fn(),
  getCocoonSiblings: vi.fn(),
}))

vi.mock('../../../server/db/client', () => ({ pool: { query: m.query }, query: vi.fn() }))
vi.mock('../../../server/services/infra/data.service', () => ({
  getArticleById: m.getArticleById,
  getArticleKeywords: m.getArticleKeywords,
  loadArticleMicroContext: m.loadArticleMicroContext,
}))
vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({ getKeywordMetrics: m.getKeywordMetrics }))
vi.mock('../../../server/services/article/article-content.service', () => ({ getArticleContent: m.getArticleContent }))
vi.mock('../../../server/services/strategy/prompt-context.service', () => ({ loadZoneContext: m.loadZoneContext }))
vi.mock('../../../server/services/queries/cocoon-siblings.service', () => ({ getCocoonSiblings: m.getCocoonSiblings }))

import { evaluateArticleGate, saveGateWaivers } from '../../../server/services/gates/gate.service'
import { captainAutocompletePosition } from '../../../server/services/keyword/captain-kpis'
import { hashGateInput } from '../../../shared/verifiers/gate'

const ARTICLE = {
  id: 1, title: 'Plomberie à Toulouse : le guide', type: 'pilier', slug: 'plomberie-toulouse',
  captainKeywordLocked: null, painIntentExpected: null,
}
const RAISON = 'Texte simulé de la recette : répétition attendue'

let waivers: WaiverRow[] = []
let keywords: { capitaine: string; lieutenants: string[]; lexique: string[]; hnStructure: unknown[] }
let content: string
let lieutenantProposals: Array<{ keyword: string }> = []

beforeEach(() => {
  vi.resetAllMocks()
  waivers = []
  lieutenantProposals = []
  content = ''
  keywords = { capitaine: 'zqxw plomberie kvj', lieutenants: [], lexique: [], hnStructure: [] }
  m.getArticleById.mockImplementation(async () => ({ article: ARTICLE, cocoonName: 'Plomberie' }))
  m.getArticleKeywords.mockImplementation(async () => ({ data: keywords, dbOps: [] }))
  m.loadArticleMicroContext.mockResolvedValue(null)
  m.getKeywordMetrics.mockResolvedValue(null)
  m.getArticleContent.mockImplementation(async () => ({ content, metaTitle: 'Plomberie à Toulouse', metaDescription: 'Tout savoir.', outline: null }))
  m.loadZoneContext.mockResolvedValue({ zone: '' })
  m.getCocoonSiblings.mockResolvedValue([])
  m.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('INSERT INTO gate_waivers')) {
      const [articleId, gateId, rule, level, category, reason, inputHash] = params as [number, string, string, string, string | null, string | null, string]
      waivers.push({ article_id: articleId, gate_id: gateId, rule, level, category, reason, input_hash: inputHash, created_at: new Date() })
      return { rows: [] }
    }
    if (sql.includes('FROM gate_waivers')) return { rows: waivers.filter(w => w.article_id === params[0]) }
    if (sql.includes('FROM lieutenant_explorations')) return { rows: lieutenantProposals }
    if (sql.includes('SELECT id, cocoon_id FROM articles')) return { rows: [{ id: 1, cocoon_id: 7 }] }
    return { rows: [] }
  })
})

describe('FR-CAP-LOCK-GATE — « Google ne suggère pas » : la valeur du panneau, pas le nombre brut', () => {
  const approchees = ['kv plomberie chauffage', 'kvj plombier', 'plomberie kvs', 'zqx plomberie', 'plomberie toulouse']
    .map((text, i) => ({ text, position: i + 1 }))
  const mesure = (suggestions: Array<{ text: string; position: number }>) => ({
    keyword: 'zqxw plomberie kvj', searchVolume: 10, keywordDifficulty: 5, cpc: 1, competition: null, intentRaw: null,
    intentLabel: null, autocompleteSuggestions: suggestions, autocompleteSource: 'google', paaQuestions: [], fetchedAt: '2026-09-30T00:00:00Z',
  })

  it('suggestions approchées seulement : 🟠 captain-autocomplete-empty, comme « 0 matches » à l’écran', async () => {
    m.getKeywordMetrics.mockResolvedValue(mesure(approchees))
    expect(captainAutocompletePosition('zqxw plomberie kvj', approchees, true), 'valeur du panneau').toBe(0)
    const evaluation = await evaluateArticleGate(1, 'captain-lock')
    expect(evaluation.issues.find(i => i.rule === 'captain-autocomplete-empty')?.level).toBe('attention')
  })

  it('la requête elle-même est suggérée : pas d’alerte', async () => {
    m.getKeywordMetrics.mockResolvedValue(mesure([...approchees, { text: 'zqxw plomberie kvj', position: 6 }]))
    const evaluation = await evaluateArticleGate(1, 'captain-lock')
    expect(evaluation.issues.map(i => i.rule)).not.toContain('captain-autocomplete-empty')
  })

  it('l’empreinte de la porte garde sa forme : les dérogations déjà posées restent valables', async () => {
    m.getKeywordMetrics.mockResolvedValue(mesure(approchees))
    const evaluation = await evaluateArticleGate(1, 'captain-lock')
    // Forme d'avant le correctif : nombre brut de suggestions. Le verdict dépend
    // des seuils du type : l'empreinte doit être l'une de ces cinq.
    const candidats = ['GO', 'ORANGE', 'NO-GO', 'GRAY', null].map(verdict => hashGateInput({
      keyword: 'zqxw plomberie kvj', level: 'pilier', volume: 10, autocompleteCount: 5, verdict, serpIntent: null, expectedIntent: null,
    }))
    expect(candidats).toContain(evaluation.inputHash)
  })
})

describe('FR-LIE-LOCK-GATE — « À la place : » les propositions non cochées', () => {
  it('trop peu de lieutenants : l’alarme propose les propositions restantes, sans celles déjà cochées', async () => {
    keywords = { ...keywords, capitaine: 'plomberie toulouse', lieutenants: ['prix plombier'] }
    lieutenantProposals = [{ keyword: 'Prix plombier' }, { keyword: 'plombier urgence' }, { keyword: 'devis plomberie' }]
    const evaluation = await evaluateArticleGate(1, 'lieutenants-lock')
    const tropPeu = evaluation.issues.find(i => i.rule === 'lieutenants-too-few')
    expect(tropPeu?.alternatives).toEqual(['plombier urgence', 'devis plomberie'])
  })
})

describe('FR-INFRA-GATE-WAIVER — le serveur ne déroge qu’aux données lues', () => {
  it('une réponse à un point qui a changé depuis sa lecture est refusée, et rien n’est enregistré', async () => {
    const lue = await evaluateArticleGate(1, 'captain-lock')
    const point = lue.blocking.find(i => i.level === 'risque')!
    const { refused } = await saveGateWaivers(1, 'captain-lock', [{ rule: point.rule, fingerprint: 'point-lu-avant-le-changement', category: 'autre', reason: RAISON }])
    expect(refused.map(r => r.rule)).toEqual([point.rule])
    expect(refused[0]?.problem).toMatch(/changé/)
    expect(waivers).toEqual([])
  })

  it('la réponse au point lu est enregistrée sur l’empreinte de ce point', async () => {
    const lue = await evaluateArticleGate(1, 'captain-lock')
    const drafts = lue.blocking.map(i => ({ rule: i.rule, fingerprint: i.fingerprint!, category: 'autre' as const, reason: RAISON }))
    const { refused, evaluation } = await saveGateWaivers(1, 'captain-lock', drafts)
    expect(refused).toEqual([])
    expect(evaluation.passed).toBe(true)
    expect(waivers.map(w => w.input_hash).sort()).toEqual(lue.blocking.map(i => i.fingerprint).sort())
  })
})

describe('FR-RED-PUBLISH-GATE — une retouche ne redemande que ce qui a changé (INFRA-19)', () => {
  const repete = 'Un plombier joignable rassure le client et lui donne envie de vous appeler sans attendre la semaine prochaine.'
  const texte = (phrase: string) => `<h1>Plomberie à Toulouse : le guide</h1><p>${phrase}</p><h2>Le prix</h2><p>${repete}</p><h2>Le délai</h2><p>${repete}</p>`

  it('dérogé à la publication, le paragraphe répété reste dérogé après un mot changé ailleurs', async () => {
    content = texte('Vous cherchez un plombier.')
    const avant = await evaluateArticleGate(1, 'publish')
    const point = avant.blocking.find(i => i.rule.startsWith('repeated-paragraph'))!
    await saveGateWaivers(1, 'publish', [{ rule: point.rule, fingerprint: point.fingerprint!, category: 'autre', reason: RAISON }])

    content = texte('Vous voulez savoir comment trouver un plombier.')
    const apres = await evaluateArticleGate(1, 'publish')
    expect(apres.inputHash, 'le texte a changé').not.toBe(avant.inputHash)
    expect(apres.blocking.map(i => i.rule)).not.toContain(point.rule)
    expect(apres.waived.map(w => w.issue.rule)).toContain(point.rule)
  })

  it('dérogé au premier jet : pas redemandé en 🔴, réaffiché en 🟠 avec la raison (express 10 b)', async () => {
    content = texte('Vous cherchez un plombier.')
    const jet = await evaluateArticleGate(1, 'draft')
    const auJet = jet.blocking.find(i => i.rule.startsWith('draft-repeated-paragraph'))!
    await saveGateWaivers(1, 'draft', [{ rule: auJet.rule, fingerprint: auJet.fingerprint!, category: 'autre', reason: RAISON }])

    content = texte('Vous voulez savoir comment trouver un plombier.')
    const publication = await evaluateArticleGate(1, 'publish')
    expect(publication.issues.some(i => i.rule.startsWith('repeated-paragraph'))).toBe(false)
    const relire = publication.blocking.find(i => i.rule.startsWith('waiver-reconfirm:draft:repeated-paragraph'))
    expect(relire?.level).toBe('attention')
    expect(relire?.message).toContain(RAISON)
  })
})
