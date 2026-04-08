// @vitest-environment node
/**
 * Workflow ① — Phase Générer (Discovery → Radar)
 *
 * Tests the complete user journey through Phase ① Générer:
 *   1. Tab structure & phase definition
 *   2. Discovery → send-to-radar data flow
 *   3. Radar scan → check completion
 *   4. Phase ① completion detection & transition to Phase ②
 *   5. Smart navigation after Phase ① checks
 *
 * Pure function tests — no API calls, no MCP.
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Extract pure logic from MoteurView for unit testing
// ---------------------------------------------------------------------------

const TAB_IDS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique'] as const
type Tab = typeof TAB_IDS[number]

const PHASE_CHECKS: Record<string, string[]> = {
  generer: ['discovery_done', 'radar_done'],
  valider: ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'],
}

const PHASE_NEXT: Record<string, { phaseLabel: string; firstTab: Tab }> = {
  generer: { phaseLabel: 'Valider', firstTab: 'capitaine' },
}

function currentPhaseId(activeTab: Tab): string {
  if (activeTab === 'discovery' || activeTab === 'radar') return 'generer'
  return 'valider'
}

function isPhaseComplete(completedChecks: string[], phaseId: string): boolean {
  const required = PHASE_CHECKS[phaseId]
  if (!required) return false
  return required.every(c => completedChecks.includes(c))
}

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

function getTransitionBanner(completedChecks: string[], activeTab: Tab) {
  const phaseId = currentPhaseId(activeTab)
  if (!isPhaseComplete(completedChecks, phaseId)) return null

  const next = PHASE_NEXT[phaseId]
  if (next) {
    return {
      message: `Phase complète — passer à ${next.phaseLabel} ?`,
      actionLabel: `Passer à ${next.phaseLabel}`,
      firstTab: next.firstTab,
    }
  }

  return {
    message: 'Validation complète — tous les mots-clés sont prêts pour la rédaction !',
    actionLabel: undefined,
    firstTab: undefined,
  }
}

// ---------------------------------------------------------------------------
// Simulate Discovery → Radar data flow
// ---------------------------------------------------------------------------

interface RadarKeyword {
  keyword: string
  reasoning: string
  source: string
}

interface RadarScanResult {
  globalScore: number
  heatLevel: string
}

interface RadarCard {
  keyword: string
  score: number
  heatLevel: string
}

function simulateDiscoveryToRadar(
  discoveredKeywords: string[],
): RadarKeyword[] {
  return discoveredKeywords.map(kw => ({
    keyword: kw,
    reasoning: `Discovered from search expansion for "${kw}"`,
    source: 'discovery',
  }))
}

function simulateRadarScan(keywords: RadarKeyword[]): RadarScanResult {
  // Simulates a radar scan — global score based on keyword count
  const globalScore = Math.min(100, keywords.length * 15)
  const heatLevel = globalScore >= 70 ? 'hot' : globalScore >= 40 ? 'warm' : 'cold'
  return { globalScore, heatLevel }
}

function simulateCardSelection(
  scanResult: RadarScanResult,
  keywords: RadarKeyword[],
): RadarCard[] {
  return keywords.map(kw => ({
    keyword: kw.keyword,
    score: scanResult.globalScore,
    heatLevel: scanResult.heatLevel,
  }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workflow ① — Phase Générer', () => {
  // -----------------------------------------------------------------------
  // Step 1: Tab structure & phase definition
  // -----------------------------------------------------------------------
  describe('Step 1 — Tab structure & phase definition', () => {
    it('has exactly 5 tabs in order', () => {
      expect(TAB_IDS).toEqual(['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique'])
    })

    it('Phase ① (generer) requires discovery_done + radar_done', () => {
      expect(PHASE_CHECKS.generer).toEqual(['discovery_done', 'radar_done'])
    })

    it('Phase ② (valider) requires 3 checks', () => {
      expect(PHASE_CHECKS.valider).toEqual([
        'capitaine_locked',
        'lieutenants_locked',
        'lexique_validated',
      ])
    })

    it('Phase ① transitions to Phase ② (capitaine tab)', () => {
      expect(PHASE_NEXT.generer).toEqual({
        phaseLabel: 'Valider',
        firstTab: 'capitaine',
      })
    })

    it('Phase ② has no next phase (final phase)', () => {
      expect(PHASE_NEXT.valider).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Step 2: Phase identification from active tab
  // -----------------------------------------------------------------------
  describe('Step 2 — Phase identification', () => {
    it('discovery tab → generer phase', () => {
      expect(currentPhaseId('discovery')).toBe('generer')
    })

    it('radar tab → generer phase', () => {
      expect(currentPhaseId('radar')).toBe('generer')
    })

    it('capitaine tab → valider phase', () => {
      expect(currentPhaseId('capitaine')).toBe('valider')
    })

    it('lieutenants tab → valider phase', () => {
      expect(currentPhaseId('lieutenants')).toBe('valider')
    })

    it('lexique tab → valider phase', () => {
      expect(currentPhaseId('lexique')).toBe('valider')
    })
  })

  // -----------------------------------------------------------------------
  // Step 3: Discovery → Radar data flow
  // -----------------------------------------------------------------------
  describe('Step 3 — Discovery → Radar data flow', () => {
    const discoveredKeywords = [
      'création site web toulouse',
      'agence web toulouse prix',
      'développeur freelance toulouse',
      'site vitrine professionnel',
      'refonte site internet',
    ]

    let radarKeywords: RadarKeyword[]
    let scanResult: RadarScanResult
    let selectedCards: RadarCard[]

    it('Discovery transforms keywords to RadarKeyword format', () => {
      radarKeywords = simulateDiscoveryToRadar(discoveredKeywords)
      expect(radarKeywords).toHaveLength(5)
      for (const kw of radarKeywords) {
        expect(kw).toHaveProperty('keyword')
        expect(kw).toHaveProperty('reasoning')
        expect(kw).toHaveProperty('source')
        expect(kw.source).toBe('discovery')
      }
    })

    it('Radar receives injected keywords from Discovery', () => {
      expect(radarKeywords.map(k => k.keyword)).toEqual(discoveredKeywords)
    })

    it('Radar scan produces globalScore + heatLevel', () => {
      scanResult = simulateRadarScan(radarKeywords)
      expect(scanResult.globalScore).toBeGreaterThan(0)
      expect(scanResult.globalScore).toBeLessThanOrEqual(100)
      expect(['cold', 'warm', 'hot']).toContain(scanResult.heatLevel)
    })

    it('5 keywords → score 75 → hot', () => {
      expect(scanResult.globalScore).toBe(75)
      expect(scanResult.heatLevel).toBe('hot')
    })

    it('Radar cards carry score and heat from scan', () => {
      selectedCards = simulateCardSelection(scanResult, radarKeywords)
      expect(selectedCards).toHaveLength(5)
      for (const card of selectedCards) {
        expect(card.score).toBe(75)
        expect(card.heatLevel).toBe('hot')
      }
    })
  })

  // -----------------------------------------------------------------------
  // Step 4: Phase ① check completion
  // -----------------------------------------------------------------------
  describe('Step 4 — Phase ① check completion', () => {
    it('no checks → Phase ① not complete', () => {
      expect(isPhaseComplete([], 'generer')).toBe(false)
    })

    it('discovery_done only → Phase ① not complete', () => {
      expect(isPhaseComplete(['discovery_done'], 'generer')).toBe(false)
    })

    it('radar_done only → Phase ① not complete', () => {
      expect(isPhaseComplete(['radar_done'], 'generer')).toBe(false)
    })

    it('discovery_done + radar_done → Phase ① complete', () => {
      expect(isPhaseComplete(['discovery_done', 'radar_done'], 'generer')).toBe(true)
    })

    it('Phase ② checks do not affect Phase ① completion', () => {
      expect(isPhaseComplete(['capitaine_locked', 'lieutenants_locked'], 'generer')).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Step 5: Transition banner
  // -----------------------------------------------------------------------
  describe('Step 5 — Phase transition banner', () => {
    it('no banner when Phase ① incomplete', () => {
      expect(getTransitionBanner(['discovery_done'], 'radar')).toBeNull()
    })

    it('shows transition banner when Phase ① complete while on discovery tab', () => {
      const banner = getTransitionBanner(['discovery_done', 'radar_done'], 'discovery')
      expect(banner).not.toBeNull()
      expect(banner!.firstTab).toBe('capitaine')
      expect(banner!.actionLabel).toContain('Valider')
    })

    it('shows transition banner when Phase ① complete while on radar tab', () => {
      const banner = getTransitionBanner(['discovery_done', 'radar_done'], 'radar')
      expect(banner).not.toBeNull()
      expect(banner!.firstTab).toBe('capitaine')
    })

    it('no Phase ① banner when user already in Phase ②', () => {
      // User is on capitaine tab — Phase ② is not complete yet → no banner
      const banner = getTransitionBanner(['discovery_done', 'radar_done'], 'capitaine')
      expect(banner).toBeNull()
    })

    it('shows completion banner when ALL Phase ② checks done', () => {
      const checks = [
        'discovery_done', 'radar_done',
        'capitaine_locked', 'lieutenants_locked', 'lexique_validated',
      ]
      const banner = getTransitionBanner(checks, 'capitaine')
      expect(banner).not.toBeNull()
      expect(banner!.message).toContain('complète')
      expect(banner!.actionLabel).toBeUndefined()
      expect(banner!.firstTab).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Step 6: Smart navigation after Phase ①
  // -----------------------------------------------------------------------
  describe('Step 6 — Smart navigation after Phase ① checks', () => {
    it('Phase ① checks only → smart tab is capitaine', () => {
      expect(computeSmartTab(['discovery_done', 'radar_done'])).toBe('capitaine')
    })

    it('Phase ① + capitaine_locked → smart tab is lieutenants', () => {
      expect(computeSmartTab([
        'discovery_done', 'radar_done', 'capitaine_locked',
      ])).toBe('lieutenants')
    })

    it('Phase ① + capitaine + lieutenants → smart tab is lexique', () => {
      expect(computeSmartTab([
        'discovery_done', 'radar_done', 'capitaine_locked', 'lieutenants_locked',
      ])).toBe('lexique')
    })

    it('all checks → smart tab cycles back to capitaine', () => {
      expect(computeSmartTab([
        'discovery_done', 'radar_done',
        'capitaine_locked', 'lieutenants_locked', 'lexique_validated',
      ])).toBe('capitaine')
    })
  })

  // -----------------------------------------------------------------------
  // Step 7: Full workflow sequence simulation
  // -----------------------------------------------------------------------
  describe('Step 7 — Full Phase ① workflow simulation', () => {
    const checks: string[] = []
    let activeTab: Tab = 'discovery'

    it('starts on discovery tab with no checks', () => {
      expect(currentPhaseId(activeTab)).toBe('generer')
      expect(isPhaseComplete(checks, 'generer')).toBe(false)
    })

    it('after discovery → send-to-radar: discovery_done check, move to radar', () => {
      checks.push('discovery_done')
      activeTab = 'radar'
      expect(currentPhaseId(activeTab)).toBe('generer')
      expect(isPhaseComplete(checks, 'generer')).toBe(false)
    })

    it('after radar scanned: radar_done check, Phase ① complete', () => {
      checks.push('radar_done')
      expect(isPhaseComplete(checks, 'generer')).toBe(true)
    })

    it('transition banner appears with link to capitaine', () => {
      const banner = getTransitionBanner(checks, activeTab)
      expect(banner).not.toBeNull()
      expect(banner!.firstTab).toBe('capitaine')
    })

    it('user clicks transition → moves to Phase ②', () => {
      activeTab = 'capitaine'
      expect(currentPhaseId(activeTab)).toBe('valider')
      // Phase ② not complete yet
      expect(isPhaseComplete(checks, 'valider')).toBe(false)
    })

    it('smart tab still consistent with current state', () => {
      expect(computeSmartTab(checks)).toBe('capitaine')
    })
  })

  // -----------------------------------------------------------------------
  // Pipeline summary
  // -----------------------------------------------------------------------
  describe('Pipeline summary', () => {
    it('logs Phase ① workflow metrics', () => {
      // eslint-disable-next-line no-console
      console.log('\n=== WORKFLOW ① GÉNÉRER PIPELINE ===')
      console.log('Tabs: discovery → radar')
      console.log('Checks: discovery_done, radar_done')
      console.log('Transition: generer → valider (capitaine)')
      console.log('Smart nav: Phase ① checks → always capitaine')
      console.log('===================================\n')
    })
  })
})
