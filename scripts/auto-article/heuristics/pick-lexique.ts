/**
 * Heuristique PURE — sélection des termes Lexique (§7.4 epic).
 *
 * Tous les termes Obligatoire (≥70 % concurrents) + les Différenciateurs
 * (30-70 %) dont la densité ≥ médiane du groupe, plafonné à MAX_TERMS.
 *
 * Filtrage (ajouté après run réel 2026-07-18 — le TF-IDF remonte du bruit) :
 *   1. mots grammaticaux français (`FR_STOPWORDS`),
 *   2. bruit de domaine (« mots », « clés » isolés — fragments de « mots-clés »),
 *   3. tokens trop courts,
 *   4. mots déjà portés par le Capitaine/Lieutenants (`exclude`),
 * pour que le Lexique apporte du vocabulaire **complémentaire**.
 */

import { FR_STOPWORDS, MIN_TOKEN_LENGTH, norm, singularize, tokenize } from '../text.js'

const MAX_TERMS = 30

/** Bruit spécifique au domaine : signifiant pour l'affinité topique, pas pour le lexique. */
const DOMAIN_NOISE = new Set(['mot', 'mots', 'cle', 'cles', 'exemple', 'exemples', 'cliquez', 'etc'])

export interface TfidfTermLite {
  term: string
  density: number
}

export interface TfidfResultLite {
  obligatoire: { term: string }[]
  differenciateur: TfidfTermLite[]
}

export interface PickLexiqueOptions {
  /** Mots-clés (Capitaine, Lieutenants) dont les tokens sont déjà couverts. */
  exclude?: string[]
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function pickLexique(tf: TfidfResultLite, opts: PickLexiqueOptions = {}): string[] {
  const excluded = new Set<string>()
  for (const kw of opts.exclude ?? []) {
    for (const token of tokenize(kw)) excluded.add(token)
  }

  const keep = (term: string): boolean => {
    const n = norm(term)
    if (n.length < MIN_TOKEN_LENGTH) return false
    const s = singularize(n)
    if (FR_STOPWORDS.has(n) || FR_STOPWORDS.has(s)) return false
    if (DOMAIN_NOISE.has(n) || DOMAIN_NOISE.has(s)) return false
    if (excluded.has(s)) return false
    return true
  }

  const oblig = tf.obligatoire.map((t) => t.term).filter(keep)
  const diffs = tf.differenciateur.filter((d) => keep(d.term))

  let denseDiffs: string[] = []
  if (diffs.length > 0) {
    const med = median(diffs.map((d) => d.density))
    denseDiffs = diffs.filter((d) => d.density >= med).map((d) => d.term)
  }

  // Déduplication (singulier/pluriel confondus), obligatoire prioritaire.
  const seen = new Set<string>()
  const out: string[] = []
  for (const term of [...oblig, ...denseDiffs]) {
    const key = singularize(norm(term))
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(term)
  }
  return out.slice(0, MAX_TERMS)
}
