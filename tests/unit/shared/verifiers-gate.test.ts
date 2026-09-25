// @vitest-environment node
/**
 * FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER — l'alarme graduée.
 *
 * 🟠 attention : un accusé de lecture suffit.
 * 🔴 risque    : catégorie + raison d'au moins 20 caractères.
 * ⛔ technique : jamais dérogeable.
 * Une dérogation tombe quand les données vérifiées changent.
 */
import { describe, it, expect } from 'vitest'
import {
  evaluateGate,
  hashGateInput,
  waiverProblem,
  waiverDraftsFrom,
  standingWaivers,
  worstLevel,
  MIN_WAIVER_REASON_LENGTH,
  type GateIssue,
  type GateWaiver,
} from '../../../shared/verifiers/gate.js'

const attention: GateIssue = { rule: 'captain-autocomplete-empty', level: 'attention', message: 'Autocomplétion vide' }
const risque: GateIssue = { rule: 'captain-volume-unknown', level: 'risque', message: 'Volume inconnu' }
const technique: GateIssue = { rule: 'hn-h1-in-body', level: 'technique', message: 'H1 dans le corps' }

const HASH = hashGateInput({ keyword: 'stratégie digitale pme' })

function waiver(issue: GateIssue, extra: Partial<GateWaiver> = {}): GateWaiver {
  return {
    gateId: 'captain-lock',
    rule: issue.rule,
    level: issue.level === 'technique' ? 'risque' : issue.level,
    inputHash: HASH,
    ...extra,
  }
}

describe('evaluateGate — les trois niveaux', () => {
  it('passe sans alerte', () => {
    expect(evaluateGate('captain-lock', [], [], HASH)).toEqual({ passed: true, blocking: [], waived: [] })
  })

  it('bloque toute alerte non couverte', () => {
    const r = evaluateGate('captain-lock', [attention, risque], [], HASH)
    expect(r.passed).toBe(false)
    expect(r.blocking.map(i => i.rule)).toEqual(['captain-autocomplete-empty', 'captain-volume-unknown'])
  })

  it('🟠 : un accusé de lecture suffit', () => {
    const r = evaluateGate('captain-lock', [attention], [waiver(attention)], HASH)
    expect(r.passed).toBe(true)
    expect(r.waived).toHaveLength(1)
  })

  it('🔴 : exige une catégorie et une raison d’au moins 20 caractères', () => {
    expect(evaluateGate('captain-lock', [risque], [waiver(risque)], HASH).passed, 'sans rien').toBe(false)
    expect(evaluateGate('captain-lock', [risque], [waiver(risque, { category: 'longue-traine', reason: 'trop court' })], HASH).passed,
      'raison trop courte').toBe(false)
    const ok = waiver(risque, { category: 'longue-traine', reason: 'Demandes réelles reçues par téléphone chaque mois' })
    expect(evaluateGate('captain-lock', [risque], [ok], HASH).passed).toBe(true)
  })

  it('⛔ : jamais dérogeable, même avec une raison', () => {
    const w = waiver(technique, { category: 'autre', reason: 'Je veux vraiment publier comme ça malgré tout' })
    expect(evaluateGate('publish', [technique], [{ ...w, gateId: 'publish' }], HASH).passed).toBe(false)
  })

  it('une dérogation tombe quand les données vérifiées changent', () => {
    const ok = waiver(risque, { category: 'longue-traine', reason: 'Demandes réelles reçues par téléphone chaque mois' })
    const autreHash = hashGateInput({ keyword: 'stratégie digitale tpe' })
    expect(evaluateGate('captain-lock', [risque], [ok], autreHash).passed).toBe(false)
  })

  it('une dérogation ne vaut que pour sa porte et sa règle', () => {
    const ok = waiver(risque, { category: 'longue-traine', reason: 'Demandes réelles reçues par téléphone chaque mois' })
    expect(evaluateGate('publish', [risque], [ok], HASH).passed, 'autre porte').toBe(false)
    expect(evaluateGate('captain-lock', [{ ...risque, rule: 'autre-regle' }], [ok], HASH).passed, 'autre règle').toBe(false)
  })
})

describe('waiverProblem — la raison du refus, dans les mots de l’utilisateur', () => {
  it('dit combien de caractères manquent', () => {
    expect(waiverProblem(risque, { category: 'autre', reason: 'court' })).toMatch(String(MIN_WAIVER_REASON_LENGTH))
  })
  it('refuse une dérogation technique', () => {
    expect(waiverProblem(technique, { category: 'autre', reason: 'x'.repeat(40) })).toMatch(/corriger/)
  })
  it('accepte un accusé de lecture 🟠', () => {
    expect(waiverProblem(attention, {})).toBeNull()
  })
})

describe('hashGateInput — une empreinte stable', () => {
  it('ne dépend pas de l’ordre des clés', () => {
    expect(hashGateInput({ a: 1, b: [2, 3] })).toBe(hashGateInput({ b: [2, 3], a: 1 }))
  })
  it('change dès qu’une valeur change', () => {
    expect(hashGateInput({ volume: 0 })).not.toBe(hashGateInput({ volume: null }))
  })
})

describe('worstLevel', () => {
  it('renvoie le niveau le plus grave', () => {
    expect(worstLevel([attention, risque])).toBe('risque')
    expect(worstLevel([attention, technique])).toBe('technique')
    expect(worstLevel([])).toBeNull()
  })
})

describe('waiverDraftsFrom — ce que l’alarme envoie au serveur', () => {
  const raison = 'Longue traîne assumée : demandes réelles au téléphone'

  it('🟠 exige la case « J’ai lu », 🔴 une catégorie et une raison assez longue', () => {
    const vide = waiverDraftsFrom([attention, risque], {})
    expect(vide.missing).toEqual([attention.rule, risque.rule])
    expect(vide.drafts).toEqual([])

    const pret = waiverDraftsFrom([attention, risque], {
      [attention.rule]: { acknowledged: true },
      [risque.rule]: { category: 'longue-traine', reason: raison },
    })
    expect(pret.missing).toEqual([])
    expect(pret.drafts).toEqual([
      { rule: attention.rule },
      { rule: risque.rule, category: 'longue-traine', reason: raison },
    ])
  })

  it('🔴 une raison trop courte reste manquante', () => {
    const court = waiverDraftsFrom([risque], { [risque.rule]: { category: 'autre', reason: 'x'.repeat(MIN_WAIVER_REASON_LENGTH - 1) } })
    expect(court.missing).toEqual([risque.rule])
  })

  it('⛔ reste toujours manquant, quelle que soit la réponse', () => {
    const tente = waiverDraftsFrom([technique], { [technique.rule]: { acknowledged: true, category: 'autre', reason: raison } })
    expect(tente.missing).toEqual([technique.rule])
    expect(tente.drafts).toEqual([])
  })
})

describe('standingWaivers — seules les dérogations encore valables sont réaffichées', () => {
  const base = { level: 'risque' as const, category: 'autre' as const, reason: 'Une raison assez longue pour passer' }

  it('une dérogation posée sur d’anciennes données (empreinte périmée) ne revient pas', () => {
    const kept = standingWaivers(
      [
        { ...base, gateId: 'captain-lock', rule: 'captain-volume-zero', inputHash: 'ancien' },
        { ...base, gateId: 'captain-lock', rule: 'captain-volume-zero', inputHash: 'actuel' },
      ],
      { 'captain-lock': 'actuel' },
    )
    expect(kept.map(w => w.inputHash)).toEqual(['actuel'])
  })

  it('une même règle n’apparaît qu’une fois, la plus récente', () => {
    const kept = standingWaivers(
      [
        { ...base, gateId: 'lexique-lock', rule: 'r', inputHash: 'a', createdAt: '2026-09-20T10:00:00.000Z', reason: 'Première raison, assez longue' },
        { ...base, gateId: 'lexique-lock', rule: 'r', inputHash: 'b', createdAt: '2026-09-25T10:00:00.000Z', reason: 'Seconde raison, assez longue' },
      ],
      {},
    )
    expect(kept).toHaveLength(1)
    expect(kept[0]?.reason).toBe('Seconde raison, assez longue')
  })

  it('les dérogations de la publication elle-même sont écartées', () => {
    expect(standingWaivers([{ ...base, gateId: 'publish', rule: 'article-too-long', inputHash: 'x' }], {})).toEqual([])
  })
})
