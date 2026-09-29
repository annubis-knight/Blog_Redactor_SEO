// @vitest-environment node
/**
 * FR-RED-PUBLISH-GATE, FR-INFRA-GATE-WAIVER, FR-RED-SEO-SCORE-PERSIST —
 * ce que `npm run verify:content` dit des portes et des dérogations.
 */
import { describe, it, expect } from 'vitest'
import { describeScores, describeWaivers, publishGateIssues } from '../../../scripts/verify-content-gates.js'
import type { GateEvaluation } from '../../../shared/verifiers/gate.js'

const refused: GateEvaluation = {
  gateId: 'publish',
  passed: false,
  inputHash: 'h',
  waived: [],
  issues: [],
  blocking: [
    { rule: 'meta-truncated', level: 'technique', message: 'Meta description coupée.' },
    { rule: 'seo-capitaine-not-in-title', level: 'risque', message: 'Capitaine absent du H1.' },
    { rule: 'seo-capitaine-not-in-h2', level: 'risque', message: 'Capitaine absent des H2.' },
  ],
}

describe('verify:content — porte de publication', () => {
  it('une porte refusée devient un avertissement qui compte chaque niveau', () => {
    const [issue] = publishGateIssues(refused)
    expect(issue?.severity).toBe('warning')
    expect(issue?.rule).toBe('publish-gate-refused')
    expect(issue?.message).toContain('3 point(s)')
    expect(issue?.message).toContain('⛔ 1')
    expect(issue?.message).toContain('🔴 2')
  })

  it('une porte qui passe ne dit rien', () => {
    expect(publishGateIssues({ ...refused, passed: true, blocking: [] })).toEqual([])
  })
})

describe('verify:content — dérogations et scores', () => {
  it('chaque dérogation montre sa porte, sa catégorie et sa raison', () => {
    const lines = describeWaivers([
      { gateId: 'captain-lock', rule: 'captain-volume-zero', level: 'risque', category: 'longue-traine', reason: 'Demandes réelles au téléphone', inputHash: 'x' },
      { gateId: 'captain-lock', rule: 'captain-autocomplete-empty', level: 'attention', category: null, reason: null, inputHash: 'x' },
    ])
    expect(lines[0]).toBe('🛡 [captain-lock · captain-volume-zero] verrouiller le capitaine : Longue traîne assumée — « Demandes réelles au téléphone »')
    expect(lines[1]).toBe('🛡 [captain-lock · captain-autocomplete-empty] verrouiller le capitaine : lu')
  })

  it('un score inconnu s’affiche « — », jamais 0', () => {
    expect(describeScores(null, '54.6')).toBe('Scores enregistrés : SEO — · GEO 55')
  })
})
