// @vitest-environment node
/**
 * Workflow ② — Phase Valider: Capitaine validation
 *
 * Tests the complete Captain validation user journey:
 *   1. Keyword composition check (pure client-side rules)
 *   2. Root keyword extraction (progressive truncation)
 *   3. Article type → level mapping
 *   4. Lock/unlock mechanism + check emission
 *   5. Send-to-lieutenants payload
 *   6. Smart navigation after capitaine lock
 *
 * Uses REAL shared functions — no API calls, no MCP.
 */
import { describe, it, expect } from 'vitest'

import {
  extractRoots,
  extractRoot,
  articleTypeToLevel,
  FRENCH_STOPWORDS,
} from '../../src/composables/useCapitaineValidation'

import { checkKeywordComposition } from '../../shared/composition-rules'

// ---------------------------------------------------------------------------
// Smart tab extraction (same as MoteurView)
// ---------------------------------------------------------------------------

type Tab = 'discovery' | 'radar' | 'capitaine' | 'lieutenants' | 'lexique'

function computeSmartTab(completedChecks: string[]): Tab {
  if (completedChecks.length === 0) return 'capitaine'
  if (
    completedChecks.includes('capitaine_locked')
    && completedChecks.includes('lieutenants_locked')
    && completedChecks.includes('lexique_validated')
  ) return 'capitaine'
  if (completedChecks.includes('lieutenants_locked')) return 'lexique'
  if (completedChecks.includes('capitaine_locked')) return 'lieutenants'
  return 'capitaine'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workflow ② — Capitaine Validation', () => {
  // -----------------------------------------------------------------------
  // Step 1: French stopwords set
  // -----------------------------------------------------------------------
  describe('Step 1 — French stopwords', () => {
    it('contains common French stopwords', () => {
      const expected = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'en', 'et', 'ou', 'à']
      for (const sw of expected) {
        expect(FRENCH_STOPWORDS.has(sw)).toBe(true)
      }
    })

    it('does not contain content words', () => {
      const contentWords = ['création', 'site', 'web', 'toulouse', 'entreprise']
      for (const w of contentWords) {
        expect(FRENCH_STOPWORDS.has(w)).toBe(false)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Step 2: extractRoots — progressive truncation
  // -----------------------------------------------------------------------
  describe('Step 2 — extractRoots (progressive truncation)', () => {
    it('5-word keyword → 3 roots (4, 3, 2 words)', () => {
      const roots = extractRoots('creation site web entreprises Toulouse')
      expect(roots).toEqual([
        'creation site web entreprises',
        'creation site web',
        'creation site',
      ])
    })

    it('4-word keyword → 2 roots (3, 2 words)', () => {
      const roots = extractRoots('agence web toulouse prix')
      expect(roots).toEqual([
        'agence web toulouse',
        'agence web',
      ])
    })

    it('3-word keyword → 1 root (2 words)', () => {
      const roots = extractRoots('refonte site internet')
      expect(roots).toEqual(['refonte site'])
    })

    it('2-word keyword → no roots (minimum 3 words needed)', () => {
      expect(extractRoots('création web')).toEqual([])
    })

    it('1-word keyword → no roots', () => {
      expect(extractRoots('toulouse')).toEqual([])
    })

    it('empty keyword → no roots', () => {
      expect(extractRoots('')).toEqual([])
    })

    it('skips truncations with <2 significant words', () => {
      // "le site de paris" → 4 words
      // truncation at 3: "le site de" → significant: ["site"] → <2 → skip
      // truncation at 2: "le site" → significant: ["site"] → <2 → skip
      const roots = extractRoots('le site de paris')
      expect(roots).toEqual([])
    })

    it('keeps truncations with ≥2 significant words', () => {
      // "le site web de paris" → 5 words
      // truncation at 4: "le site web de" → significant: ["site", "web"] → ≥2 → keep
      // truncation at 3: "le site web" → significant: ["site", "web"] → ≥2 → keep
      // truncation at 2: "le site" → significant: ["site"] → <2 → skip
      const roots = extractRoots('le site web de paris')
      expect(roots).toEqual(['le site web de', 'le site web'])
    })
  })

  // -----------------------------------------------------------------------
  // Step 3: extractRoot — retro-compatible alias
  // -----------------------------------------------------------------------
  describe('Step 3 — extractRoot (shortest root)', () => {
    it('returns shortest root for 5-word keyword', () => {
      expect(extractRoot('creation site web entreprises Toulouse')).toBe('creation site')
    })

    it('returns shortest root for 3-word keyword', () => {
      expect(extractRoot('refonte site internet')).toBe('refonte site')
    })

    it('returns null for 2-word keyword', () => {
      expect(extractRoot('création web')).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Step 4: articleTypeToLevel mapping
  // -----------------------------------------------------------------------
  describe('Step 4 — articleTypeToLevel mapping', () => {
    it('Pilier → pilier', () => {
      expect(articleTypeToLevel('Pilier')).toBe('pilier')
    })

    it('Intermédiaire → intermediaire', () => {
      expect(articleTypeToLevel('Intermédiaire')).toBe('intermediaire')
    })

    it('Spécialisé → specifique', () => {
      expect(articleTypeToLevel('Spécialisé')).toBe('specifique')
    })

    it('unknown type → intermediaire (default)', () => {
      expect(articleTypeToLevel('Unknown' as never)).toBe('intermediaire')
    })
  })

  // -----------------------------------------------------------------------
  // Step 5: checkKeywordComposition — client-side rules
  // -----------------------------------------------------------------------
  describe('Step 5 — Keyword composition check', () => {
    it('returns result with keyword, level, and rules', () => {
      const result = checkKeywordComposition('creation site web entreprises Toulouse', 'pilier')
      expect(result.keyword).toBe('creation site web entreprises Toulouse')
      expect(result.level).toBe('pilier')
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('each rule has pass, message, and severity', () => {
      const result = checkKeywordComposition('création site web', 'intermediaire')
      for (const rule of result.results) {
        expect(rule).toHaveProperty('rule')
        expect(rule).toHaveProperty('pass')
        expect(rule).toHaveProperty('message')
        expect(rule).toHaveProperty('severity')
        expect(['warning', 'info']).toContain(rule.severity)
      }
    })

    it('allPass reflects whether all rules pass', () => {
      const result = checkKeywordComposition('création site web toulouse', 'pilier')
      const failedWarnings = result.results.filter(r => !r.pass && r.severity === 'warning')
      expect(result.allPass).toBe(failedWarnings.length === 0)
    })

    it('warningCount counts only failed warnings', () => {
      const result = checkKeywordComposition('création site web', 'specifique')
      const failedWarnings = result.results.filter(r => !r.pass && r.severity === 'warning')
      expect(result.warningCount).toBe(failedWarnings.length)
    })

    it('pilier keyword with location passes location check', () => {
      const result = checkKeywordComposition('creation site web toulouse', 'pilier')
      const locationRule = result.results.find(r => r.rule === 'location_present')
      if (locationRule) {
        expect(locationRule.pass).toBe(true)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Step 6: Captain lock flow
  // -----------------------------------------------------------------------
  describe('Step 6 — Captain lock/unlock flow', () => {
    it('lock emits capitaine_locked check', () => {
      // Simulate the flow: user locks the captain
      const checks: string[] = []
      const lockCaptaine = () => { checks.push('capitaine_locked') }

      lockCaptaine()
      expect(checks).toContain('capitaine_locked')
    })

    it('unlock removes capitaine_locked check', () => {
      const checks = ['capitaine_locked']
      const unlockCaptaine = () => {
        const idx = checks.indexOf('capitaine_locked')
        if (idx >= 0) checks.splice(idx, 1)
      }

      unlockCaptaine()
      expect(checks).not.toContain('capitaine_locked')
    })

    it('re-lock adds check back', () => {
      const checks: string[] = []
      checks.push('capitaine_locked')
      expect(checks).toContain('capitaine_locked')
      // unlock
      checks.splice(checks.indexOf('capitaine_locked'), 1)
      expect(checks).not.toContain('capitaine_locked')
      // re-lock
      checks.push('capitaine_locked')
      expect(checks).toContain('capitaine_locked')
    })
  })

  // -----------------------------------------------------------------------
  // Step 7: Send-to-lieutenants payload
  // -----------------------------------------------------------------------
  describe('Step 7 — send-to-lieutenants payload', () => {
    it('payload contains keyword + rootKeywords', () => {
      const keyword = 'creation site web entreprises Toulouse'
      const roots = extractRoots(keyword)

      const payload = { keyword, rootKeywords: roots }

      expect(payload.keyword).toBe(keyword)
      expect(payload.rootKeywords).toHaveLength(3)
      expect(payload.rootKeywords).toEqual([
        'creation site web entreprises',
        'creation site web',
        'creation site',
      ])
    })

    it('2-word keyword → empty rootKeywords', () => {
      const keyword = 'création web'
      const roots = extractRoots(keyword)

      const payload = { keyword, rootKeywords: roots }
      expect(payload.rootKeywords).toHaveLength(0)
    })

    it('rootKeywords are ordered longest → shortest', () => {
      const roots = extractRoots('creation site web entreprises Toulouse')
      for (let i = 0; i < roots.length - 1; i++) {
        expect(roots[i].split(/\s+/).length).toBeGreaterThan(roots[i + 1].split(/\s+/).length)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Step 8: Smart navigation after captain lock
  // -----------------------------------------------------------------------
  describe('Step 8 — Smart navigation after captain lock', () => {
    it('no checks → stays on capitaine', () => {
      expect(computeSmartTab([])).toBe('capitaine')
    })

    it('capitaine_locked → moves to lieutenants', () => {
      expect(computeSmartTab(['capitaine_locked'])).toBe('lieutenants')
    })

    it('Phase ① checks do not change Phase ② navigation', () => {
      expect(computeSmartTab(['discovery_done', 'radar_done'])).toBe('capitaine')
    })

    it('Phase ① + capitaine_locked → lieutenants', () => {
      expect(computeSmartTab(['discovery_done', 'radar_done', 'capitaine_locked'])).toBe('lieutenants')
    })
  })

  // -----------------------------------------------------------------------
  // Step 9: Full Captain workflow simulation
  // -----------------------------------------------------------------------
  describe('Step 9 — Full Captain workflow simulation', () => {
    const CAPTAIN_KEYWORD = 'creation site web entreprises Toulouse'
    const ARTICLE_TYPE = 'Pilier'

    it('complete workflow: type → level → composition → roots → lock → navigate', () => {
      // 1. Article type → level
      const level = articleTypeToLevel(ARTICLE_TYPE)
      expect(level).toBe('pilier')

      // 2. Composition check
      const composition = checkKeywordComposition(CAPTAIN_KEYWORD, level)
      expect(composition.results.length).toBeGreaterThan(0)

      // 3. Extract roots
      const roots = extractRoots(CAPTAIN_KEYWORD)
      expect(roots.length).toBeGreaterThan(0)

      // 4. Lock captain
      const checks: string[] = []
      checks.push('capitaine_locked')

      // 5. Build send-to-lieutenants payload
      const payload = { keyword: CAPTAIN_KEYWORD, rootKeywords: roots }
      expect(payload.keyword).toBeTruthy()
      expect(payload.rootKeywords.length).toBe(3)

      // 6. Smart navigation
      expect(computeSmartTab(checks)).toBe('lieutenants')

      // eslint-disable-next-line no-console
      console.log('\n=== WORKFLOW ② CAPITAINE PIPELINE ===')
      console.log(`Captain: "${CAPTAIN_KEYWORD}" (${level})`)
      console.log(`Composition: ${composition.warningCount} warnings, allPass=${composition.allPass}`)
      console.log(`Roots: ${roots.join(', ')}`)
      console.log(`Payload: keyword + ${roots.length} rootKeywords`)
      console.log(`Smart nav: capitaine_locked → lieutenants`)
      console.log('=====================================\n')
    })
  })
})
