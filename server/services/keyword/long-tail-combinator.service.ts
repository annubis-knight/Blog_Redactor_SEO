/**
 * Combinateur déterministe de longues-traînes à partir des mots-clés racines
 * affichés dans l'onglet Radar.
 *
 * Pré-traitement : avant l'appel IA, on génère localement un pool de
 * candidats (paires + triples si assez de roots) trié par fréquence des
 * mots significatifs et dédupliqué par variante normalisée. L'IA reçoit
 * ce pool en variable de prompt et se charge ensuite de filtrer / scorer /
 * reformuler les meilleures combinaisons.
 *
 * Cette fonction est PURE et SANS I/O — testable unitairement, déterministe.
 */

const MAX_CANDIDATES = 30

// Stopwords FR locaux (évite l'import croisé src→server). Liste courte alignée
// avec word-groups.service.ts pour rester cohérent dans les services backend.
const STOPWORDS = new Set<string>([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une',
  'à', 'au', 'aux', 'en', 'par', 'pour', 'sur', 'dans',
  'avec', 'sans', 'sous', 'vers', 'entre',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'si',
  'ne', 'pas', 'plus', 'que', 'qui', 'quoi', 'dont',
  'ce', 'cet', 'cette', 'ces',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'est', 'sont', 'a', 'ont',
])

export interface CandidateCombination {
  /** Combinaison candidate sous forme de chaîne lisible. */
  keyword: string
  /** Mots-clés racines (input bruts) ayant servi à construire ce candidat. */
  derivedFromRoots: string[]
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function significantWords(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter(w => w.length >= 2 && !STOPWORDS.has(w))
}

/** Construit une chaîne candidate à partir des mots significatifs uniques de plusieurs roots. */
function buildKeyword(roots: string[]): string {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const root of roots) {
    for (const w of significantWords(root)) {
      if (!seen.has(w)) {
        seen.add(w)
        ordered.push(w)
      }
    }
  }
  return ordered.join(' ')
}

/**
 * Génère un pool dédupliqué et plafonné de combinaisons candidates.
 *
 * Règles :
 *  - 0 ou 1 root → []
 *  - 2-3 roots → paires uniquement
 *  - 4+ roots → paires + triples
 *  - dédup par variante normalisée
 *  - tri lexicographique stable (déterministe quel que soit l'ordre d'entrée)
 *  - hard limit 30 (l'IA filtrera ensuite à 10)
 */
export function combineRoots(rawRoots: string[]): CandidateCombination[] {
  const roots = Array.from(
    new Set(rawRoots.map(normalize).filter(r => r.length > 0)),
  ).sort()

  if (roots.length < 2) return []

  const candidates = new Map<string, CandidateCombination>()

  // Paires
  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const r1 = roots[i]!
      const r2 = roots[j]!
      const keyword = buildKeyword([r1, r2])
      if (!keyword) continue
      const key = keyword.toLowerCase()
      if (candidates.has(key)) continue
      candidates.set(key, {
        keyword,
        derivedFromRoots: [r1, r2],
      })
    }
  }

  // Triples si assez de roots
  if (roots.length >= 4) {
    for (let i = 0; i < roots.length; i++) {
      for (let j = i + 1; j < roots.length; j++) {
        for (let k = j + 1; k < roots.length; k++) {
          const r1 = roots[i]!
          const r2 = roots[j]!
          const r3 = roots[k]!
          const keyword = buildKeyword([r1, r2, r3])
          if (!keyword) continue
          const key = keyword.toLowerCase()
          if (candidates.has(key)) continue
          candidates.set(key, {
            keyword,
            derivedFromRoots: [r1, r2, r3],
          })
        }
      }
    }
  }

  const sorted = Array.from(candidates.values()).sort((a, b) =>
    a.keyword.toLowerCase().localeCompare(b.keyword.toLowerCase()),
  )

  return sorted.slice(0, MAX_CANDIDATES)
}
