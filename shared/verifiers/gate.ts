/**
 * Portes de qualité et alarme graduée (FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER).
 *
 * Une porte se tient à une transition du parcours : verrouiller un capitaine,
 * verrouiller des lieutenants, valider un lexique, publier. Un vérificateur
 * produit des alertes à trois niveaux :
 *
 *   🟠 attention  — signal faible : un accusé de lecture suffit ;
 *   🔴 risque     — choix discutable : il faut une catégorie et une raison
 *                   d'au moins 20 caractères, enregistrées (dérogation) ;
 *   ⛔ technique  — défaut objectif : on ne passe pas, il faut corriger.
 *
 * Le même code sert l'écran (bouton grisé + alarme), le serveur (refus 422)
 * et `npm run verify` (audit après coup). Fonctions pures : aucune I/O.
 *
 * Une dérogation n'est valable que pour les données qu'elle couvrait : elle
 * porte l'empreinte (`inputHash`) des données vérifiées, et tombe dès qu'elles
 * changent.
 */

export type GateLevel = 'attention' | 'risque' | 'technique'

export const GATE_IDS = ['captain-lock', 'lieutenants-lock', 'lexique-lock', 'hn-lock', 'draft', 'publish'] as const
export type GateId = (typeof GATE_IDS)[number]

/** Nom de chaque porte, tel que l'écran le montre (« Avant de … »). */
export const GATE_LABELS: Record<GateId, string> = {
  'captain-lock': 'verrouiller le capitaine',
  'lieutenants-lock': 'valider les lieutenants',
  'lexique-lock': 'valider le lexique',
  'hn-lock': 'valider la structure',
  'draft': 'accepter le premier jet',
  'publish': 'publier',
}

/** Titre de l'alarme : « Avant de publier », « Avant d’accepter le premier jet ». */
export function gateTitle(gateId: GateId): string {
  const label = GATE_LABELS[gateId]
  return /^[aeéèêiîoôuh]/i.test(label) ? `Avant d’${label}` : `Avant de ${label}`
}

export interface GateIssue {
  /**
   * Identifiant stable de l'alerte (ex. `captain-volume-unknown`). Quand une
   * règle peut viser plusieurs éléments, l'élément fait partie de l'identifiant
   * (`lieutenant-cannibalization:audit site web`) : chaque dérogation couvre
   * alors un seul élément, jamais tous d'un coup.
   */
  rule: string
  level: GateLevel
  /** Ce qui est constaté, en clair. */
  message: string
  /** Ce que ce choix risque, en clair. */
  risk?: string
  excerpt?: string
  /** Pistes proposées à la place (ex. autres mots-clés mesurés). */
  alternatives?: string[]
}

export const WAIVER_CATEGORIES = ['longue-traine', 'donnee-manquante', 'marque', 'autre'] as const
export type WaiverCategory = (typeof WAIVER_CATEGORIES)[number]

export const WAIVER_CATEGORY_LABELS: Record<WaiverCategory, string> = {
  'longue-traine': 'Longue traîne assumée',
  'donnee-manquante': 'Donnée manquante dans l’outil',
  'marque': 'Mot-clé de marque',
  'autre': 'Autre',
}

/** Longueur minimale d'une raison de dérogation 🔴. */
export const MIN_WAIVER_REASON_LENGTH = 20

export interface GateWaiver {
  gateId: GateId
  rule: string
  level: 'attention' | 'risque'
  category?: WaiverCategory | null
  reason?: string | null
  /** Empreinte des données vérifiées au moment de la dérogation. */
  inputHash: string
  createdAt?: string
}

export interface GateResult {
  passed: boolean
  /** Alertes non couvertes par une dérogation valable : elles bloquent. */
  blocking: GateIssue[]
  /** Alertes couvertes, avec leur dérogation (affichées avec un badge 🛡). */
  waived: Array<{ issue: GateIssue; waiver: GateWaiver }>
}

/** Verdict complet d'une porte, tel que le serveur le renvoie à l'écran. */
export interface GateEvaluation extends GateResult {
  gateId: GateId
  /** Toutes les alertes constatées, dérogées ou non. */
  issues: GateIssue[]
  /** Empreinte des données vérifiées : une dérogation ne vaut que pour elle. */
  inputHash: string
}

/** Refus motivé d'une dérogation proposée (raison trop courte, défaut technique…). */
export interface WaiverRefusal {
  rule: string
  problem: string
}

/**
 * Vérifie qu'une dérogation est recevable pour cette alerte. Renvoie la raison
 * du refus, ou `null` si elle est recevable.
 */
export function waiverProblem(issue: GateIssue, waiver: Pick<GateWaiver, 'category' | 'reason'>): string | null {
  if (issue.level === 'technique') {
    return 'Un défaut technique ne se déroge pas : il faut le corriger.'
  }
  if (issue.level === 'risque') {
    if (!waiver.category || !WAIVER_CATEGORIES.includes(waiver.category)) {
      return 'Choisissez pourquoi vous passez outre.'
    }
    const reason = (waiver.reason ?? '').trim()
    if (reason.length < MIN_WAIVER_REASON_LENGTH) {
      return `Expliquez votre choix en au moins ${MIN_WAIVER_REASON_LENGTH} caractères (${reason.length} pour l’instant).`
    }
  }
  return null
}

/** Dérogation proposée au serveur, qui la vérifie et y appose l'empreinte courante. */
export interface WaiverDraft {
  rule: string
  category?: WaiverCategory | null
  reason?: string | null
}

/** Réponse de l'utilisateur à une alerte, dans l'alarme. */
export interface WaiverAnswer {
  acknowledged?: boolean
  category?: WaiverCategory | null
  reason?: string
}

/**
 * Traduit les réponses de l'alarme en dérogations. `missing` liste les alertes
 * encore sans réponse recevable : tant qu'elle n'est pas vide, on ne passe pas.
 */
export function waiverDraftsFrom(
  blocking: GateIssue[],
  answers: Record<string, WaiverAnswer | undefined>,
): { drafts: WaiverDraft[]; missing: string[] } {
  const drafts: WaiverDraft[] = []
  const missing: string[] = []
  for (const issue of blocking) {
    const answer = answers[issue.rule] ?? {}
    if (issue.level === 'technique') {
      missing.push(issue.rule)
    } else if (issue.level === 'attention') {
      if (answer.acknowledged) drafts.push({ rule: issue.rule })
      else missing.push(issue.rule)
    } else if (waiverProblem(issue, answer) === null) {
      drafts.push({ rule: issue.rule, category: answer.category ?? null, reason: (answer.reason ?? '').trim() })
    } else {
      missing.push(issue.rule)
    }
  }
  return { drafts, missing }
}

/**
 * Dérogations encore debout, à réafficher au moment de publier. Une dérogation
 * posée sur des données qui ont changé depuis (empreinte différente de celle
 * d'aujourd'hui, quand on la connaît) est tombée : elle ne revient pas. Une
 * même règle n'apparaît qu'une fois, dans sa version la plus récente. Celles
 * de la publication elle-même sont écartées.
 */
export function standingWaivers(
  waivers: GateWaiver[],
  currentHashes: Partial<Record<GateId, string>>,
): GateWaiver[] {
  const latest = new Map<string, GateWaiver>()
  for (const waiver of waivers) {
    if (waiver.gateId === 'publish') continue
    const current = currentHashes[waiver.gateId]
    if (current !== undefined && waiver.inputHash !== current) continue
    const key = `${waiver.gateId}:${waiver.rule}`
    const previous = latest.get(key)
    if (!previous || (waiver.createdAt ?? '') >= (previous.createdAt ?? '')) latest.set(key, waiver)
  }
  return [...latest.values()]
}

/** Une porte passe si chaque alerte est couverte par une dérogation valable pour ces données. */
export function evaluateGate(gateId: GateId, issues: GateIssue[], waivers: GateWaiver[], inputHash: string): GateResult {
  const blocking: GateIssue[] = []
  const waived: GateResult['waived'] = []
  for (const issue of issues) {
    const waiver = waivers.find(w =>
      w.gateId === gateId
      && w.rule === issue.rule
      && w.inputHash === inputHash
      && waiverProblem(issue, w) === null,
    )
    if (waiver && issue.level !== 'technique') waived.push({ issue, waiver })
    else blocking.push(issue)
  }
  return { passed: blocking.length === 0, blocking, waived }
}

/** Sérialisation stable (clés triées) : deux objets égaux donnent la même empreinte. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    // Comparaison par code de caractère, pas `localeCompare` : l'ordre doit être
    // le même dans le navigateur et sur le serveur, quelle que soit la langue.
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

/**
 * Empreinte courte et déterministe des données vérifiées (FNV-1a 32 bits), la
 * même côté navigateur et côté serveur. Ce n'est pas une signature de sécurité :
 * elle sert seulement à savoir si les données ont changé depuis la dérogation.
 */
export function hashGateInput(input: unknown): string {
  const text = stableStringify(input)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Le niveau le plus grave d'une liste d'alertes (pour la couleur du bouton). */
export function worstLevel(issues: GateIssue[]): GateLevel | null {
  if (issues.some(i => i.level === 'technique')) return 'technique'
  if (issues.some(i => i.level === 'risque')) return 'risque'
  if (issues.some(i => i.level === 'attention')) return 'attention'
  return null
}
