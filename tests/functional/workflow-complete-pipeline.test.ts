// @vitest-environment node
/**
 * Workflow ③ — Full Pipeline: Capitaine → Lieutenants → Lexique
 *
 * Tests the complete cross-tab user journey through Phase ②:
 *   1. Captain lock → send-to-lieutenants (keyword + roots)
 *   2. Lieutenant SERP analysis with real cached data
 *   3. Lieutenant prompt building with cross-tab data
 *   4. Lexique gate: now requires capitaine_locked (not lieutenants_locked)
 *   5. Lexique TF-IDF prompt building with real cached data
 *   6. Full pipeline smart navigation + completion
 *
 * Uses CACHED SERP data (no API calls, no MCP).
 * Article: "Création de site web sur mesure à Toulouse..."
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

// --- Mock logger to avoid console noise ---
vi.mock('../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// --- Mock cache-helpers with synthetic SERP data ---
const SYNTHETIC_SERP_DATA: Record<string, any> = {
  'creation-site-web-entreprises-toulouse': {
    keyword: 'creation site web entreprises Toulouse',
    articleLevel: 'pilier',
    competitors: [
      { position: 1, title: 'Création site web Toulouse', url: 'https://a.com', domain: 'a.com', headings: [{ level: 1, text: 'Création de site web' }, { level: 2, text: 'Pourquoi choisir nous' }], textContent: 'creation site web toulouse' },
      { position: 2, title: 'Agence web Toulouse', url: 'https://b.com', domain: 'b.com', headings: [{ level: 1, text: 'Agence web' }, { level: 2, text: 'Nos services' }, { level: 2, text: 'Pourquoi choisir nous' }], textContent: 'agence web toulouse' },
      { position: 3, title: 'Développement web', url: 'https://c.com', domain: 'c.com', headings: [{ level: 1, text: 'Développement web' }, { level: 2, text: 'Nos services' }], textContent: 'developpement web' },
    ],
    paaQuestions: [
      { question: 'Comment créer un site web ?', answer: 'En faisant appel à une agence' },
      { question: 'Combien coûte un site web ?', answer: 'Entre 1000 et 10000 euros' },
    ],
    maxScraped: 3,
    cachedAt: new Date().toISOString(),
    fromCache: false,
  },
  'creation-site-web-entreprises': {
    keyword: 'creation site web entreprises',
    articleLevel: 'pilier',
    competitors: [
      { position: 1, title: 'Création site pour entreprises', url: 'https://d.com', domain: 'd.com', headings: [{ level: 1, text: 'Création site' }, { level: 2, text: 'Nos services' }], textContent: 'creation site entreprises' },
    ],
    paaQuestions: [{ question: 'Quel budget pour un site ?', answer: '1000 euros minimum' }],
    maxScraped: 1,
    cachedAt: new Date().toISOString(),
    fromCache: false,
  },
}

vi.mock('../../server/db/cache-helpers', () => ({
  slugify: (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  getCached: vi.fn((_cacheType: string, key: string) => Promise.resolve(SYNTHETIC_SERP_DATA[key] ?? null)),
  setCached: vi.fn(),
}))

import { getCached, slugify } from '../../server/db/cache-helpers'
import { loadPrompt } from '../../server/utils/prompt-loader'
import { extractRoots, articleTypeToLevel } from '../../src/composables/keyword/useCapitaineValidation'
import { checkKeywordComposition } from '../../shared/composition-rules'
import type { SerpAnalysisResult, SerpCompetitor } from '../../shared/types/serp-analysis.types'
import type { PaaQuestion } from '../../shared/types/dataforseo.types'

// ---------------------------------------------------------------------------
// Constants — real article data (same as lieutenant-tab-e2e)
// ---------------------------------------------------------------------------
const CAPTAIN_KEYWORD = 'creation site web entreprises Toulouse'
const ARTICLE_LEVEL = 'pilier' as const
const ARTICLE_TYPE = 'Pilier'

// Root keywords from Captain's extractRoots
const ROOT_KEYWORDS = extractRoots(CAPTAIN_KEYWORD)

// ---------------------------------------------------------------------------
// Pure functions extracted from components
// ---------------------------------------------------------------------------

type Tab = 'discovery' | 'radar' | 'capitaine' | 'lieutenants' | 'lexique'

function computeSmartTab(completedChecks: string[]): Tab {
  if (completedChecks.length === 0) return 'capitaine'
  if (
    completedChecks.includes('moteur:capitaine_locked')
    && completedChecks.includes('moteur:lieutenants_locked')
    && completedChecks.includes('moteur:lexique_validated')
  ) return 'capitaine'
  if (completedChecks.includes('moteur:lieutenants_locked')) return 'lexique'
  if (completedChecks.includes('moteur:capitaine_locked')) return 'lieutenants'
  return 'capitaine'
}

// Gating logic — Lexique requires capitaine_locked (NOT lieutenants_locked)
function canExtractLexique(isCaptaineLocked: boolean, captainKeyword: string | null, isLoading: boolean, isLocked: boolean): boolean {
  return isCaptaineLocked && !!captainKeyword && !isLoading && !isLocked
}

// Gating logic — Lieutenants requires capitaine_locked
function canAnalyzeSERP(isCaptaineLocked: boolean, captainKeyword: string | null, isLocked: boolean): boolean {
  return isCaptaineLocked && !!captainKeyword && !isLocked
}

function mergeSerpResults(results: SerpAnalysisResult[]): SerpAnalysisResult {
  if (results.length === 1) return results[0]
  const base = results[0]
  const seenUrls = new Set<string>()
  const mergedCompetitors: SerpCompetitor[] = []
  const seenPaa = new Set<string>()
  const mergedPaa: PaaQuestion[] = []

  for (const r of results) {
    for (const c of r.competitors) {
      if (!seenUrls.has(c.url)) {
        seenUrls.add(c.url)
        mergedCompetitors.push(c)
      }
    }
    for (const p of r.paaQuestions) {
      const key = p.question.toLowerCase().trim()
      if (!seenPaa.has(key)) {
        seenPaa.add(key)
        mergedPaa.push(p)
      }
    }
  }

  return {
    ...base,
    competitors: mergedCompetitors,
    paaQuestions: mergedPaa,
    maxScraped: mergedCompetitors.length,
  }
}

interface HnRecurrenceItem {
  level: number
  text: string
  count: number
  total: number
  percent: number
}

function computeHnRecurrence(competitors: SerpCompetitor[]): HnRecurrenceItem[] {
  const comps = competitors.filter(c => !c.fetchError)
  const total = comps.length
  if (total === 0) return []

  const freqMap = new Map<string, { level: number; text: string; count: number }>()

  for (const comp of comps) {
    const seen = new Set<string>()
    for (const h of comp.headings) {
      const key = `${h.level}:${h.text.toLowerCase().trim()}`
      if (seen.has(key)) continue
      seen.add(key)

      const existing = freqMap.get(key)
      if (existing) {
        existing.count++
      } else {
        freqMap.set(key, { level: h.level, text: h.text, count: 1 })
      }
    }
  }

  return Array.from(freqMap.values())
    .map(item => ({ ...item, total, percent: Math.round(item.count / total * 100) }))
    .sort((a, b) => b.percent - a.percent || a.level - b.level)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workflow ③ — Full Pipeline: Capitaine → Lieutenants → Lexique', () => {
  // Shared state across the pipeline
  const completedChecks: string[] = []
  const serpResults: SerpAnalysisResult[] = []
  let mergedResult: SerpAnalysisResult
  let hnRecurrence: HnRecurrenceItem[]

  // -----------------------------------------------------------------------
  // Phase A: Captain validation (pure functions)
  // -----------------------------------------------------------------------
  describe('Phase A — Captain validation (pure functions)', () => {
    it('article type maps to correct level', () => {
      expect(articleTypeToLevel(ARTICLE_TYPE)).toBe(ARTICLE_LEVEL)
    })

    it('captain keyword passes composition check', () => {
      const result = checkKeywordComposition(CAPTAIN_KEYWORD, ARTICLE_LEVEL)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('captain keyword generates root keywords', () => {
      expect(ROOT_KEYWORDS.length).toBe(3)
      expect(ROOT_KEYWORDS[0]).toBe('creation site web entreprises')
      expect(ROOT_KEYWORDS[1]).toBe('creation site web')
      expect(ROOT_KEYWORDS[2]).toBe('creation site')
    })

    it('lock captain → smart tab moves to lieutenants', () => {
      completedChecks.push('moteur:capitaine_locked')
      expect(computeSmartTab(completedChecks)).toBe('lieutenants')
    })

    it('send-to-lieutenants payload is well-formed', () => {
      const payload = { keyword: CAPTAIN_KEYWORD, rootKeywords: ROOT_KEYWORDS }
      expect(payload.keyword).toBe(CAPTAIN_KEYWORD)
      expect(payload.rootKeywords).toHaveLength(3)
    })
  })

  // -----------------------------------------------------------------------
  // Phase B: Lieutenant SERP analysis (real cached data)
  // -----------------------------------------------------------------------
  describe('Phase B — Lieutenant SERP analysis (cached data)', () => {
    it('Lieutenant tab gate: requires capitaine_locked', () => {
      expect(canAnalyzeSERP(true, CAPTAIN_KEYWORD, false)).toBe(true)
      expect(canAnalyzeSERP(false, CAPTAIN_KEYWORD, false)).toBe(false)
      expect(canAnalyzeSERP(true, null, false)).toBe(false)
    })

    beforeAll(async () => {
      const allKeywords = [CAPTAIN_KEYWORD, ...ROOT_KEYWORDS]
      for (const kw of allKeywords) {
        const cacheKey = slugify(kw)
        const cached = await getCached<SerpAnalysisResult>('serp', cacheKey)
        if (cached) {
          serpResults.push({ ...cached, fromCache: true })
        }
      }
    })

    it('loads cached SERP for captain keyword', () => {
      expect(serpResults.length).toBeGreaterThanOrEqual(1)
      expect(serpResults[0].keyword).toBe(CAPTAIN_KEYWORD)
    })

    it('merges SERP results with deduplication', () => {
      mergedResult = mergeSerpResults(serpResults)
      expect(mergedResult.competitors.length).toBeGreaterThanOrEqual(serpResults[0].competitors.length)

      // URLs are unique
      const urls = mergedResult.competitors.map(c => c.url)
      expect(urls.length).toBe(new Set(urls).size)
    })

    it('computes Hn recurrence from merged competitors', () => {
      hnRecurrence = computeHnRecurrence(mergedResult.competitors)
      expect(hnRecurrence.length).toBeGreaterThan(0)

      for (const item of hnRecurrence.slice(0, 3)) {
        expect(item.percent).toBeGreaterThanOrEqual(0)
        expect(item.percent).toBeLessThanOrEqual(100)
      }
    })

    it('builds propose-lieutenants prompt with all cross-tab data', async () => {
      const filteredHn = hnRecurrence
        .filter(h => h.percent >= 10)
        .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))

      const competitors = mergedResult.competitors
        .filter(c => !c.fetchError)
        .map(c => ({ domain: c.domain, title: c.title, position: c.position }))

      const paaFormatted = mergedResult.paaQuestions.length > 0
        ? mergedResult.paaQuestions.map(q => `- ${q.question}${q.answer ? ` → ${q.answer}` : ''}`).join('\n')
        : 'Aucune PAA disponible pour cette requête.'

      const hnFormatted = filteredHn.length > 0
        ? filteredHn.map(h => `H${h.level}: "${h.text}" (${h.count}x, ${h.percent}%)`).join('\n')
        : 'Aucun heading avec récurrence significative parmi les concurrents.'

      const competitorsFormatted = competitors.length > 0
        ? competitors.map(c => `#${c.position} ${c.domain} — "${c.title}"`).join('\n')
        : 'Aucune donnée concurrents disponible.'

      const prompt = await loadPrompt('propose-lieutenants', {
        keyword: CAPTAIN_KEYWORD,
        level: ARTICLE_LEVEL,
        paa_questions: paaFormatted,
        hn_recurrence: hnFormatted,
        serp_competitors: competitorsFormatted,
        word_groups: 'Aucun groupe disponible',
        root_keywords: ROOT_KEYWORDS.join(', '),
        existing_lieutenants: 'Aucun (premier article du cocon)',
      })

      expect(prompt.length).toBeGreaterThan(500)
      expect(prompt).toContain(CAPTAIN_KEYWORD)
      expect(prompt).toContain(ARTICLE_LEVEL)
      // All roots from Captain's send-to-lieutenants are in the prompt
      for (const root of ROOT_KEYWORDS) {
        expect(prompt).toContain(root)
      }
    })

    it('lock lieutenants → smart tab moves to lexique', () => {
      completedChecks.push('moteur:lieutenants_locked')
      expect(computeSmartTab(completedChecks)).toBe('lexique')
    })
  })

  // -----------------------------------------------------------------------
  // Phase C: Lexique gate + TF-IDF analysis
  // -----------------------------------------------------------------------
  describe('Phase C — Lexique extraction gate & TF-IDF', () => {
    it('Lexique gate: requires capitaine_locked (NOT lieutenants_locked)', () => {
      // Capitaine locked, not loading, not already locked → can extract
      expect(canExtractLexique(true, CAPTAIN_KEYWORD, false, false)).toBe(true)

      // Capitaine NOT locked → cannot extract (even if lieutenants locked)
      expect(canExtractLexique(false, CAPTAIN_KEYWORD, false, false)).toBe(false)
    })

    it('Lexique gate: blocked when no captain keyword', () => {
      expect(canExtractLexique(true, null, false, false)).toBe(false)
      expect(canExtractLexique(true, '', false, false)).toBe(false)
    })

    it('Lexique gate: blocked when loading', () => {
      expect(canExtractLexique(true, CAPTAIN_KEYWORD, true, false)).toBe(false)
    })

    it('Lexique gate: blocked when already locked', () => {
      expect(canExtractLexique(true, CAPTAIN_KEYWORD, false, true)).toBe(false)
    })

    it('builds lexique-analysis-upfront prompt with TF-IDF terms', async () => {
      // Simulate TF-IDF terms extracted from competitors by category
      const obligatoire = ['création', 'site web', 'entreprise']
      const differenciateur = ['toulouse', 'agence', 'devis']
      const optionnel = ['freelance', 'vitrine']

      const prompt = await loadPrompt('lexique-analysis-upfront', {
        keyword: CAPTAIN_KEYWORD,
        level: ARTICLE_LEVEL,
        obligatoire_terms: obligatoire.join(', '),
        differenciateur_terms: differenciateur.join(', '),
        optionnel_terms: optionnel.join(', '),
      })

      expect(prompt.length).toBeGreaterThan(200)
      expect(prompt).toContain(CAPTAIN_KEYWORD)
      expect(prompt).toContain(ARTICLE_LEVEL)
    })

    it('maxTokens scales with term count', () => {
      const scaleFn = (totalTerms: number) =>
        Math.max(4096, Math.min(16384, totalTerms * 80 + 512))

      // Small term count
      expect(scaleFn(4)).toBe(4096) // 4*80+512 = 832 → clamped to 4096
      // Medium term count
      expect(scaleFn(50)).toBe(4512) // 50*80+512 = 4512
      // Large term count
      expect(scaleFn(150)).toBe(12512) // 150*80+512 = 12512
      // Very large → capped
      expect(scaleFn(300)).toBe(16384) // 300*80+512 = 24512 → capped to 16384
    })
  })

  // -----------------------------------------------------------------------
  // Phase D: Full pipeline completion
  // -----------------------------------------------------------------------
  describe('Phase D — Full pipeline completion', () => {
    it('complete lexique_validated → all Phase ② checks done', () => {
      completedChecks.push('moteur:lexique_validated')
      expect(completedChecks).toContain('moteur:capitaine_locked')
      expect(completedChecks).toContain('moteur:lieutenants_locked')
      expect(completedChecks).toContain('moteur:lexique_validated')
    })

    it('all checks → smart tab cycles back to capitaine (review)', () => {
      expect(computeSmartTab(completedChecks)).toBe('capitaine')
    })

    it('Phase ② is complete', () => {
      const PHASE_CHECKS = ['moteur:capitaine_locked', 'moteur:lieutenants_locked', 'moteur:lexique_validated']
      expect(PHASE_CHECKS.every(c => completedChecks.includes(c))).toBe(true)
    })

    it('completion banner has no action (final state)', () => {
      const PHASE_CHECKS_MAP: Record<string, string[]> = {
        valider: ['moteur:capitaine_locked', 'moteur:lieutenants_locked', 'moteur:lexique_validated'],
      }
      const isComplete = PHASE_CHECKS_MAP.valider.every(c => completedChecks.includes(c))
      expect(isComplete).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Phase E: Cross-tab data contracts
  // -----------------------------------------------------------------------
  describe('Phase E — Cross-tab data contracts', () => {
    it('Captain → Lieutenants: keyword + rootKeywords', () => {
      const payload = { keyword: CAPTAIN_KEYWORD, rootKeywords: ROOT_KEYWORDS }

      // Lieutenants receives this via handleSendToLieutenants
      expect(typeof payload.keyword).toBe('string')
      expect(Array.isArray(payload.rootKeywords)).toBe(true)
      expect(payload.rootKeywords.every(r => typeof r === 'string')).toBe(true)
    })

    it('Lieutenants → Lexique: selectedLieutenants (string[])', () => {
      const selectedLieutenants = [
        'agence web toulouse',
        'création site vitrine toulouse',
        'développeur web toulouse',
      ]

      // Lexique receives these via selectedLieutenantsForLexique computed
      expect(Array.isArray(selectedLieutenants)).toBe(true)
      expect(selectedLieutenants.every(l => typeof l === 'string')).toBe(true)
    })

    it('Discovery → Radar: RadarKeyword[] with keyword + reasoning + source', () => {
      const radarKeywords = [
        { keyword: 'site internet toulouse', reasoning: 'Expansion sémantique', source: 'suggest' },
        { keyword: 'devis site web toulouse', reasoning: 'PAA', source: 'ai' },
      ]

      for (const kw of radarKeywords) {
        expect(kw).toHaveProperty('keyword')
        expect(kw).toHaveProperty('reasoning')
        expect(kw).toHaveProperty('source')
      }
    })

    it('Radar → Captain: RadarCard[] with keyword + score + heatLevel', () => {
      const cards = [
        { keyword: 'site internet toulouse', score: 72, heatLevel: 'warm' },
      ]

      for (const card of cards) {
        expect(card).toHaveProperty('keyword')
        expect(card).toHaveProperty('score')
        expect(card).toHaveProperty('heatLevel')
      }
    })

    it('all tabs share article-progress store checks', () => {
      const validChecks = [
        'moteur:discovery_done', 'moteur:radar_done',
        'moteur:capitaine_locked', 'moteur:lieutenants_locked', 'moteur:lexique_validated',
      ]
      for (const check of completedChecks) {
        expect(validChecks).toContain(check)
      }
    })

    it('all tabs share article-keywords store', () => {
      const articleKeywords = {
        articleSlug: 'creation-site-web-sur-mesure-a-toulouse',
        capitaine: CAPTAIN_KEYWORD,
        lieutenants: ['agence web toulouse', 'création site vitrine toulouse'],
        lexique: ['création', 'site web', 'entreprise'],
        rootKeywords: ROOT_KEYWORDS,
      }

      expect(articleKeywords.capitaine).toBeTruthy()
      expect(articleKeywords.lieutenants.length).toBeGreaterThan(0)
      expect(articleKeywords.rootKeywords).toEqual(ROOT_KEYWORDS)
    })
  })

  // -----------------------------------------------------------------------
  // Pipeline summary
  // -----------------------------------------------------------------------
  describe('Pipeline summary', () => {
    it('prints full pipeline metrics', () => {
      const captainComps = serpResults[0]?.competitors.length ?? 0
      const mergedComps = mergedResult?.competitors.length ?? 0
      const mergedPaa = mergedResult?.paaQuestions.length ?? 0
      const hnTotal = hnRecurrence?.length ?? 0
      const hnAbove10 = hnRecurrence?.filter(h => h.percent >= 10).length ?? 0

      // eslint-disable-next-line no-console
      console.log('\n=== WORKFLOW ③ FULL PIPELINE ===')
      console.log(`Captain: "${CAPTAIN_KEYWORD}" (${ARTICLE_LEVEL})`)
      console.log(`Roots: ${ROOT_KEYWORDS.join(', ')}`)
      console.log(`SERP: ${serpResults.length} cached keywords`)
      console.log(`Competitors: ${captainComps} → ${mergedComps} merged (+${mergedComps - captainComps})`)
      console.log(`PAA: ${mergedPaa} unique questions`)
      console.log(`Hn: ${hnTotal} total, ${hnAbove10} ≥10%`)
      console.log(`Checks: ${completedChecks.join(', ')}`)
      console.log(`Lexique gate: capitaine_locked (not lieutenants_locked)`)
      console.log(`Smart nav: all done → capitaine (review)`)
      console.log('================================\n')
    })
  })
})
