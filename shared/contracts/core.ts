/**
 * Contrats d'affichage — noyau.
 *
 * Temps « mise en format » de la grille en 8 temps : toute réponse destinée à
 * l'affichage (IA, DataForSEO, Google, calcul, relecture en base) passe par un
 * contrat qui la met dans la forme attendue par ses composants, ou la refuse
 * proprement. Une donnée absente reste absente (`null` → « — »), jamais 0.
 *
 * AUTHORITY: shared/contracts/*.contract.ts (une famille de résultat par fichier)
 * CONSUMERS: routes Moteur (frontière serveur), src/services/api.service.ts
 *            (frontière client), services de relecture DB (frontière relecture)
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-INFRA-KPI-NULLABLE,
 *             FR-INFRA-KPI-SCORING-NULLSAFE, NFR-INT-ZOD-VALIDATION
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Signalement (invisible pour l'utilisateur, visible dans les journaux)
// ---------------------------------------------------------------------------

export type ContractBoundary = 'server' | 'client' | 'db'

export interface ContractEvent {
  contract: string
  boundary: ContractBoundary | 'unknown'
  /** coerced : valeur corrigée · dropped : élément écarté · rejected : réponse refusée */
  kind: 'coerced' | 'dropped' | 'rejected'
  field: string
  detail: string
}

type ContractReporter = (event: ContractEvent) => void

let reporter: ContractReporter = () => {}
let scope: { contract: string; boundary: ContractBoundary } | null = null

/** Branche le journal de chaque côté (serveur : log.warn ; client : log.warn). */
export function setContractReporter(fn: ContractReporter): void {
  reporter = fn
}

/** Signalement depuis un fichier de contrat (règles de cohérence propres à une famille). */
export function signal(kind: ContractEvent['kind'], field: string, detail: string): void {
  report(kind, field, detail)
}

function report(kind: ContractEvent['kind'], field: string, detail: string): void {
  reporter({
    contract: scope?.contract ?? 'unknown',
    boundary: scope?.boundary ?? 'unknown',
    kind,
    field,
    detail,
  })
}

function describe(value: unknown): string {
  if (typeof value === 'number') return String(value)
  try {
    return JSON.stringify(value)?.slice(0, 80) ?? String(value)
  } catch {
    return String(value)
  }
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map(i => `${i.path.join('.') || '(racine)'} : ${i.message}`)
}

// ---------------------------------------------------------------------------
// Contrat
// ---------------------------------------------------------------------------

export interface DisplayContract<T> {
  readonly name: string
  readonly schema: z.ZodType<T, unknown>
}

/** Déclare un contrat. Le type `T` (issu de shared/types) est vérifié à la compilation. */
export function defineContract<T>(name: string, schema: z.ZodType<T, unknown>): DisplayContract<T> {
  return { name, schema }
}

export class ContractViolationError extends Error {
  readonly contract: string
  readonly issues: string[]

  constructor(contract: string, issues: string[]) {
    // Message lisible à l'écran ; le détail des écarts part dans le journal (`issues`).
    super(`Réponse reçue dans un format inattendu (contrat « ${contract} ») — relancez l'action.`)
    this.name = 'ContractViolationError'
    this.contract = contract
    this.issues = issues
  }
}

/**
 * Met `raw` dans la forme du contrat. Les écarts réparables sont corrigés et
 * signalés ; une réponse inutilisable lève `ContractViolationError`, pour que
 * le chemin d'erreur existant de l'écran s'applique.
 */
export function parseContract<T>(contract: DisplayContract<T>, raw: unknown, boundary: ContractBoundary): T {
  const previous = scope
  scope = { contract: contract.name, boundary }
  try {
    const result = contract.schema.safeParse(raw)
    if (result.success) return result.data
    const issues = formatIssues(result.error)
    report('rejected', '(racine)', issues.join(' | '))
    throw new ContractViolationError(contract.name, issues)
  } finally {
    scope = previous
  }
}

/**
 * Variante « liste » : chaque élément passe le contrat ; un élément
 * inutilisable est écarté et signalé, les autres sont servis. Pour une liste
 * de résultats où une entrée abîmée ne doit pas bloquer tout l'écran.
 */
export function parseContractList<T>(contract: DisplayContract<T>, raw: unknown, boundary: ContractBoundary): T[] {
  if (!Array.isArray(raw)) return [parseContract(contract, raw, boundary)]
  const kept: T[] = []
  for (const item of raw) {
    try {
      kept.push(parseContract(contract, item, boundary))
    } catch (err) {
      if (!(err instanceof ContractViolationError)) throw err
    }
  }
  return kept
}

// ---------------------------------------------------------------------------
// Primitives tolérantes
// ---------------------------------------------------------------------------

/**
 * Un KPI marché : nombre fini, ou `null` si la donnée manque.
 * Les colonnes NUMERIC de PostgreSQL arrivent en texte : elles sont converties.
 */
export function kpiValue(field: string) {
  return z.unknown().transform((value): number | null => toKpiValue(value, field))
}

/**
 * Même règle que `kpiValue`, appelable directement là où la donnée brute entre
 * (ex. réponse DataForSEO dans une route) : la même valeur produit toujours la
 * même sortie, quelle que soit la frontière.
 */
export function toKpiValue(value: unknown, field = 'kpi'): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value
    report('coerced', field, `${describe(value)} → absent`)
    return null
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  report('coerced', field, `${describe(value)} → absent`)
  return null
}

/** Un compteur : entier positif ou nul. Invalide → 0, signalé. */
export function count(field: string) {
  return z.unknown().transform((value): number => {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
    report('coerced', field, `${describe(value)} → 0`)
    return 0
  })
}

/** Un texte de présentation, avec repli neutre. */
export function text(field: string, fallback = '') {
  return z.unknown().transform((value): string => {
    if (typeof value === 'string') return value
    report('coerced', field, `${describe(value)} → « ${fallback} »`)
    return fallback
  })
}

/** Un texte facultatif : chaîne gardée, absence → `null`, autre type → `null` signalé. */
export function nullableText(field: string) {
  return z.unknown().transform((value): string | null => {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return null
    report('coerced', field, `${describe(value)} → absent`)
    return null
  })
}

/** Un schéma avec valeur de repli signalée, pour un champ obligatoire non critique. */
export function withFallback<T>(schema: z.ZodType<T, unknown>, fallback: T, field: string) {
  return z.unknown().transform((value): T => {
    const result = schema.safeParse(value)
    if (result.success) return result.data
    report('coerced', field, `${describe(value)} → valeur par défaut`)
    return fallback
  })
}

/** Une valeur parmi une liste connue, avec repli neutre. */
export function oneOf<const V extends readonly [string, ...string[]]>(
  values: V,
  fallback: V[number],
  field: string,
) {
  const allowed = new Set<string>(values)
  return z.unknown().transform((value): V[number] => {
    if (typeof value === 'string' && allowed.has(value)) return value as V[number]
    report('coerced', field, `${describe(value)} → ${fallback}`)
    return fallback
  })
}

/**
 * Une liste dont chaque élément est vérifié : les éléments conformes sont
 * gardés, les autres écartés et signalés. Absence → liste vide.
 */
export function tolerantArray<T>(item: z.ZodType<T, unknown>, field: string) {
  return z.unknown().transform((value): T[] => {
    if (value === null || value === undefined) return []
    if (!Array.isArray(value)) {
      report('coerced', field, `${describe(value)} → liste vide`)
      return []
    }
    return keepConforming(value, item, field)
  })
}

/**
 * Comme `tolerantArray`, mais la liste elle-même est obligatoire : sans liste,
 * la réponse est refusée (ex. une sortie d'IA sans la liste demandée).
 */
export function requiredList<T>(item: z.ZodType<T, unknown>, field: string) {
  return z.array(z.unknown()).transform((value): T[] => keepConforming(value, item, field))
}

function keepConforming<T>(value: unknown[], item: z.ZodType<T, unknown>, field: string): T[] {
  const kept: T[] = []
  value.forEach((element, index) => {
    const result = item.safeParse(element)
    if (result.success) kept.push(result.data)
    else report('dropped', `${field}[${index}]`, formatIssues(result.error).join(' | '))
  })
  return kept
}

/**
 * Un dictionnaire « clé → élément » (ex. mot-clé → jugement) : les entrées
 * conformes sont gardées, les autres écartées et signalées. Absence → `{}`.
 */
export function tolerantRecord<T>(item: z.ZodType<T, unknown>, field: string) {
  return z.unknown().transform((value): Record<string, T> => {
    if (value === null || value === undefined) return {}
    if (typeof value !== 'object' || Array.isArray(value)) {
      report('coerced', field, `${describe(value)} → dictionnaire vide`)
      return {}
    }
    const kept: Record<string, T> = {}
    for (const [key, element] of Object.entries(value as Record<string, unknown>)) {
      const result = item.safeParse(element)
      if (result.success) kept[key] = result.data
      else report('dropped', `${field}.${key}`, formatIssues(result.error).join(' | '))
    }
    return kept
  })
}

/**
 * Un sous-objet facultatif (ex. un score) : conforme → gardé ; `null` et
 * `undefined` → tels quels ; non conforme → `undefined`, signalé.
 */
export function optionalObject<T>(schema: z.ZodType<T, unknown>, field: string) {
  return z.unknown().transform((value): T | null | undefined => {
    if (value === null) return null
    if (value === undefined) return undefined
    const result = schema.safeParse(value)
    if (result.success) return result.data
    report('dropped', field, formatIssues(result.error).join(' | '))
    return undefined
  })
}
