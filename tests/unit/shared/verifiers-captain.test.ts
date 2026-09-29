// @vitest-environment node
/**
 * FR-CAP-LOCK-GATE — verrouiller un capitaine risqué déclenche l'alarme.
 * Cas réel : le pilier 1013, « stratégie digitale entreprises Toulouse ».
 */
import { describe, it, expect } from 'vitest'
import { verifyCaptain, expectedCaptainIntent, type CaptainGateInput } from '../../../shared/verifiers/captain.js'

const pilier1013: CaptainGateInput = {
  keyword: 'stratégie digitale entreprises Toulouse',
  level: 'pilier',
  volume: null,
  autocompleteCount: 0,
  verdict: 'ORANGE',
  serpIntent: 'commercial',
  expectedIntent: null,
  alternatives: [
    { keyword: 'stratégie digitale pme', volume: 320 },
    { keyword: 'stratégie digitale entreprises Toulouse', volume: 0 },
    { keyword: 'plan marketing digital', volume: 880 },
  ],
}

describe('verifyCaptain — le cas du pilier 1013', () => {
  const issues = verifyCaptain(pilier1013)
  const rules = issues.map(i => i.rule)

  it('🔴 volume inconnu', () => {
    expect(issues.find(i => i.rule === 'captain-volume-unknown')?.level).toBe('risque')
  })

  it('🔴 SERP commerciale pour un pilier « guide »', () => {
    const mismatch = issues.find(i => i.rule === 'captain-intent-mismatch')
    expect(mismatch?.level).toBe('risque')
    expect(mismatch?.risk).toMatch(/page de service/)
  })

  it('🟠 autocomplétion vide', () => {
    expect(issues.find(i => i.rule === 'captain-autocomplete-empty')?.level).toBe('attention')
  })

  it('propose des alternatives mesurées, par volume décroissant, sans le mot-clé lui-même', () => {
    const alt = issues.find(i => i.rule === 'captain-volume-unknown')!.alternatives!
    expect(alt[0]).toMatch(/^plan marketing digital/)
    expect(alt[1]).toMatch(/^stratégie digitale pme/)
    expect(alt.some(a => a.startsWith('stratégie digitale entreprises Toulouse'))).toBe(false)
  })

  it('n’invente pas d’alerte NO-GO sur un verdict ORANGE', () => {
    expect(rules).not.toContain('captain-verdict-nogo')
  })
})

describe('verifyCaptain — cas sains et limites', () => {
  const sain: CaptainGateInput = {
    keyword: 'isolation combles perdus', level: 'intermediaire', volume: 2400, autocompleteCount: 8,
    verdict: 'GO', serpIntent: 'informational', expectedIntent: 'informational', alternatives: [],
  }

  it('aucune alerte pour un mot-clé mesuré, suggéré, à l’intention cohérente', () => {
    expect(verifyCaptain(sain)).toEqual([])
  })

  it('🔴 volume nul et 🔴 NO-GO', () => {
    const rules = verifyCaptain({ ...sain, volume: 0, verdict: 'NO-GO' }).map(i => i.rule)
    expect(rules).toEqual(expect.arrayContaining(['captain-volume-zero', 'captain-verdict-nogo']))
  })

  it('🟠 seulement quand l’écart d’intention n’oppose pas guide et vente', () => {
    const issue = verifyCaptain({ ...sain, serpIntent: 'navigational' }).find(i => i.rule === 'captain-intent-mismatch')
    expect(issue?.level).toBe('attention')
  })

  it('intention inconnue : pas d’alerte d’intention (on ne devine pas)', () => {
    expect(verifyCaptain({ ...sain, serpIntent: null }).map(i => i.rule)).not.toContain('captain-intent-mismatch')
  })

  it('un pilier sans intention précisée est traité comme un guide (informationnel)', () => {
    expect(expectedCaptainIntent('pilier', null)).toBe('informational')
    expect(expectedCaptainIntent('specifique', null)).toBeNull()
    expect(expectedCaptainIntent('pilier', 'commercial')).toBe('commercial')
  })
})
