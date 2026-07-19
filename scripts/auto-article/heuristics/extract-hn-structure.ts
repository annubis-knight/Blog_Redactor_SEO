/**
 * Heuristique PURE — structure Hn recommandée, déduite des concurrents SERP.
 *
 * Le SERP est déjà payé (`POST /serp/analyze`) mais son contenu le plus riche —
 * la structure des pages qui rankent — était jeté (audit défaut n°14). On en
 * extrait ici les chapitres récurrents : si 7 concurrents sur 10 traitent un
 * même sujet en H2, l'article doit le couvrir.
 *
 * Regroupement par **signature de tokens** : « Qu'est-ce que le SEO local ? » et
 * « Le SEO local, c'est quoi ? » partagent la signature `local+seo` et comptent
 * donc pour un même chapitre. Le libellé retenu est la formulation la plus
 * fréquente (à défaut, la plus courte — souvent la plus lisible).
 */

import { tokenize } from '../text.js'

export interface CompetitorHeadings {
  /** Absent quand le scraping du concurrent a échoué — toléré. */
  headings?: { level: number; text: string }[]
}

export interface HnItem {
  level: number
  text: string
  /** Part des concurrents traitant ce chapitre (0-1). */
  recurrence: number
  competitorCount: number
}

/**
 * Seuils **calibrés sur SERP réels** (2026-07-19), pas choisis a priori.
 *
 * La convergence structurelle réelle plafonne bas : ~40 % sur une requête
 * commerciale, ~25 % sur une requête informationnelle (où chaque page invente
 * sa propre liste de conseils). Un seuil à 30 % écartait des chapitres
 * pourtant manifestement attendus (« Créer un sitemap », « Remplir les balises
 * meta »). À 25 %, on les capte sans descendre dans le bruit à 10-13 %, qui est
 * du contenu propre à une seule page (« Blog », « Choisir OVHcloud »).
 */
export const MIN_RECURRENCE = 0.25
/**
 * Garde-fou indépendant du ratio : un chapitre vu chez un **seul** concurrent
 * ne structure rien, même s'il représente 25 % d'un petit panel.
 */
export const MIN_COMPETITORS = 2
export const MAX_ITEMS = 12
/**
 * Similarité minimale (Jaccard sur les tokens) pour considérer deux titres
 * comme le même chapitre. Une égalité stricte des tokens était trop sévère :
 * sur 200 titres réels, seuls 3 chapitres émergeaient car « Hébergement
 * mutualisé : pour qui ? » ne rejoignait pas « L'hébergement mutualisé ».
 */
export const MIN_SIMILARITY = 0.6

/**
 * Titres de navigation / habillage récupérés au scraping, sans valeur
 * éditoriale. Ils sont récurrents par nature et fausseraient le classement.
 */
const BOILERPLATE = new Set([
  'sommaire', 'conclusion', 'introduction', 'partager', 'newsletter', 'contact',
  'navigation', 'menu', 'recherche', 'categorie', 'categories', 'article',
  'articles', 'commentaire', 'commentaires', 'auteur', 'suivant', 'precedent',
  'mention', 'mentions', 'legales', 'cookie', 'cookies', 'abonner', 'inscription',
])

const HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', hellip: '…',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—',
}

/**
 * Nettoie un titre scrapé avant analyse :
 *   - décode les entités HTML (`&nbsp;` devenait un token parasite « nbsp ») ;
 *   - retire la numérotation de listicle (« 1. », « 2 - », « 17 — »), qui
 *     empêchait de rapprocher des chapitres identiques.
 */
export function cleanHeading(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/&([a-z]+);/gi, (m, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/^\s*\d+\s*[.)\-–—:]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Signature stable d'un titre : tokens signifiants, dédupliqués et triés. */
export function headingSignature(text: string): string {
  return [...new Set(tokenize(cleanHeading(text)))].sort().join('+')
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter)
}

/** Écarte les titres vides de sens éditorial (navigation, habillage). */
function isMeaningful(tokens: Set<string>): boolean {
  if (tokens.size === 0) return false
  for (const t of tokens) if (!BOILERPLATE.has(t)) return true
  return false
}

export function extractHnStructure(
  competitors: CompetitorHeadings[],
  opts: {
    minRecurrence?: number
    minCompetitors?: number
    max?: number
    levels?: number[]
  } = {},
): HnItem[] {
  const minRecurrence = opts.minRecurrence ?? MIN_RECURRENCE
  const minCompetitors = opts.minCompetitors ?? MIN_COMPETITORS
  const max = opts.max ?? MAX_ITEMS
  const levels = opts.levels ?? [2, 3]

  const total = competitors.length
  if (total === 0) return []

  // Regroupement glouton par similarité : chaque titre rejoint le cluster le
  // plus proche au-dessus du seuil, sinon il en ouvre un nouveau.
  interface Cluster {
    level: number
    tokens: Set<string>
    variants: Map<string, number>
    competitors: Set<number>
  }
  const clusters: Cluster[] = []

  competitors.forEach((competitor, index) => {
    for (const heading of competitor.headings ?? []) {
      if (!levels.includes(heading.level)) continue
      const label = cleanHeading(heading.text)
      const tokens = new Set(tokenize(label))
      if (!isMeaningful(tokens)) continue

      let best: Cluster | null = null
      let bestScore = 0
      for (const cluster of clusters) {
        const score = jaccard(tokens, cluster.tokens)
        if (score > bestScore) {
          bestScore = score
          best = cluster
        }
      }

      if (!best || bestScore < MIN_SIMILARITY) {
        best = { level: heading.level, tokens, variants: new Map(), competitors: new Set() }
        clusters.push(best)
      }

      best.variants.set(label, (best.variants.get(label) ?? 0) + 1)
      // Un même concurrent répétant un chapitre ne compte qu'une fois.
      best.competitors.add(index)
      // Le niveau le plus « haut » rencontré prime (un H2 l'emporte sur un H3).
      best.level = Math.min(best.level, heading.level)
    }
  })

  return clusters
    .map((group) => ({
      level: group.level,
      text: pickLabel(group.variants),
      recurrence: group.competitors.size / total,
      competitorCount: group.competitors.size,
    }))
    .filter((item) => item.recurrence >= minRecurrence && item.competitorCount >= minCompetitors)
    .sort((a, b) => {
      if (b.recurrence !== a.recurrence) return b.recurrence - a.recurrence
      if (a.level !== b.level) return a.level - b.level
      return a.text.localeCompare(b.text)
    })
    .slice(0, max)
}

/** Formulation la plus fréquente ; à égalité, la plus courte. */
function pickLabel(variants: Map<string, number>): string {
  let best = ''
  let bestCount = -1
  for (const [text, count] of variants) {
    if (count > bestCount || (count === bestCount && text.length < best.length)) {
      best = text
      bestCount = count
    }
  }
  return best
}

/**
 * Rendu markdown compact pour injection dans un prompt.
 * La récurrence n'est affichée que si elle est connue : sur une reprise
 * (`--resume`), la structure est relue depuis la base sans ses statistiques.
 */
export function formatHnStructure(items: HnItem[]): string {
  if (items.length === 0) return ''
  return items
    .map((i) => {
      const stat = i.recurrence > 0 ? `  (${Math.round(i.recurrence * 100)} % des concurrents)` : ''
      return `- H${i.level} — ${i.text}${stat}`
    })
    .join('\n')
}
