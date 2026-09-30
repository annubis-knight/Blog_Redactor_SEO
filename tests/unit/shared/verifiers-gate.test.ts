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
  gateTitle,
  hashGateInput,
  waiverProblem,
  waiverDraftsFrom,
  pointFingerprint,
  textPointKind,
  withFingerprints,
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

    const vus = [{ ...attention, fingerprint: 'fa' }, { ...risque, fingerprint: 'fr' }]
    const pret = waiverDraftsFrom(vus, {
      [attention.rule]: { acknowledged: true },
      [risque.rule]: { category: 'longue-traine', reason: raison },
    })
    expect(pret.missing).toEqual([])
    // FR-INFRA-GATE-WAIVER : chaque réponse porte l'empreinte du point lu à l'écran.
    expect(pret.drafts).toEqual([
      { rule: attention.rule, fingerprint: 'fa' },
      { rule: risque.rule, fingerprint: 'fr', category: 'longue-traine', reason: raison },
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

// Recette du 2026-09-30 (express 10, INFRA-19) : un mot changé redemandait toutes
// les raisons 🔴 de la publication, et celles du premier jet étaient redemandées
// sous un autre nom. Une dérogation vaut pour le point qu'elle couvre et les
// données de CE point ; elle tombe seulement si ce point a changé.
describe('FR-INFRA-GATE-WAIVER — l’empreinte d’un point', () => {
  const RAISON = 'Texte simulé de la recette : répétition attendue'
  const paragraphe = (rule: string): GateIssue => ({
    rule, level: 'risque', message: 'Paragraphe répété : « Un site clair rassure le client… ».', excerpt: 'Un site clair rassure le client',
  })

  it('portes du texte : l’empreinte d’un point ne dépend que du point (extrait et message), pas du reste de l’article', () => {
    const p = paragraphe('repeated-paragraph')
    expect(pointFingerprint('publish', p, 'article-avant')).toBe(pointFingerprint('publish', p, 'article-apres'))
    expect(pointFingerprint('publish', p, 'x')).not.toBe(pointFingerprint('publish', { ...p, excerpt: 'Autre paragraphe' }, 'x'))
  })

  it('premier jet et publication : le même paragraphe répété est le même point', () => {
    expect(textPointKind('draft-repeated-paragraph:un-site')).toBe('repeated-paragraph')
    expect(textPointKind('draft-non-french')).toBe('non-french-sentence')
    expect(textPointKind('draft-unsourced-figure:3')).toBe('unsourced-figure')
    // Le suffixe qui distingue deux occurrences ne change pas le point.
    expect(pointFingerprint('draft', paragraphe('draft-repeated-paragraph:un-site'), 'h-jet'))
      .toBe(pointFingerprint('publish', paragraphe('repeated-paragraph'), 'h-publication'))
  })

  it('portes du Moteur : l’empreinte suit les données de la porte et nomme sa règle', () => {
    expect(pointFingerprint('captain-lock', risque, HASH)).not.toBe(pointFingerprint('captain-lock', risque, 'autre'))
    expect(pointFingerprint('captain-lock', risque, HASH)).not.toBe(pointFingerprint('captain-lock', attention, HASH))
  })

  it('withFingerprints pose l’empreinte de chaque point sans écraser celle déjà posée', () => {
    const [a, b] = withFingerprints('publish', [paragraphe('repeated-paragraph'), { ...risque, fingerprint: 'amont' }], HASH)
    expect(a?.fingerprint).toBe(pointFingerprint('publish', paragraphe('repeated-paragraph'), HASH))
    expect(b?.fingerprint).toBe('amont')
  })

  it('une dérogation posée sur l’empreinte d’un point le couvre, même si le reste de la porte a changé', () => {
    const [p] = withFingerprints('publish', [paragraphe('repeated-paragraph')], 'avant')
    const w: GateWaiver = { gateId: 'publish', rule: p!.rule, level: 'risque', category: 'autre', reason: RAISON, inputHash: p!.fingerprint! }
    expect(evaluateGate('publish', [p!], [w], 'apres-un-mot-change').passed).toBe(true)
    const autre = withFingerprints('publish', [{ ...paragraphe('repeated-paragraph'), excerpt: 'Un autre paragraphe' }], 'x')
    expect(evaluateGate('publish', autre, [w], 'x').passed, 'autre point : pas couvert').toBe(false)
  })

  it('une dérogation d’avant l’empreinte par point (règle + empreinte de la porte) vaut tant que la porte n’a pas changé', () => {
    const [p] = withFingerprints('captain-lock', [risque], HASH)
    const ancienne = waiver(risque, { category: 'longue-traine', reason: 'Demandes réelles reçues par téléphone chaque mois' })
    expect(evaluateGate('captain-lock', [p!], [ancienne], HASH).passed).toBe(true)
    expect(evaluateGate('captain-lock', [p!], [ancienne], 'donnees-changees').passed).toBe(false)
  })
})

describe('gateTitle', () => {
  it('élide devant une voyelle : « Avant d’accepter », pas « Avant de accepter »', () => {
    expect(gateTitle('draft')).toBe('Avant d’accepter le premier jet')
    expect(gateTitle('publish')).toBe('Avant de publier')
    expect(gateTitle('captain-lock')).toBe('Avant de verrouiller le capitaine')
  })
})
