/**
 * Modèle et rendu de l'arbre SEO — PUR (aucune I/O, aucune couleur en dur).
 *
 * Arborescence réelle en base :
 *   silos → cocoons → articles (niveau porté par `articles.type`)
 *
 * Il n'existe **pas** de relation parent/enfant entre articles (pas de
 * `parent_id`) : la hiérarchie interne à un cocon est donc *implicite*, portée
 * par le niveau (Pilier / Intermédiaire / Spécialisé). Le rendu groupe les
 * articles par niveau, ce qui suffit à décider d'un emplacement.
 *
 * Le style est **injecté** (`TreeTheme`) : le module reste pur et testable en
 * texte brut, tandis que le CLI passe un thème coloré (chalk).
 */

import { truncateWords } from './text.js'
import type { CanonicalArticleType } from './types.js'

/** Alias sémantique : le niveau d'un article dans l'arbre = son type canonique. */
export type ArticleLevel = CanonicalArticleType

export const LEVELS: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']

const LEVEL_ABBR: Record<ArticleLevel, string> = {
  pilier: 'P',
  intermediaire: 'I',
  specifique: 'S',
}

export const LEVEL_LABEL: Record<ArticleLevel, string> = {
  pilier: 'Pilier',
  intermediaire: 'Intermédiaire',
  specifique: 'Spécialisé',
}

export interface TreeArticle {
  id: number
  title: string
  level: ArticleLevel
}

export interface TreeCocoon {
  name: string
  siloName: string
  articles: TreeArticle[]
}

export interface TreeSilo {
  name: string
  description: string
  cocoons: TreeCocoon[]
}

// --- Formes brutes tolérantes venant de GET /api/silos ---

interface RawArticle {
  id?: number
  title?: string
  titre?: string
  type?: string
}

interface RawCocoon {
  name?: string
  nom?: string
  articles?: RawArticle[]
}

interface RawSilo {
  nom?: string
  name?: string
  description?: string
  cocons?: RawCocoon[]
  cocoons?: RawCocoon[]
}

/** Normalise un `type` DB (« Pilier », « Intermédiaire »…) ou canonique vers un niveau. */
export function toLevel(raw: string | undefined): ArticleLevel {
  const n = (raw ?? '').toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
  if (n.startsWith('pil')) return 'pilier'
  if (n.startsWith('spe')) return 'specifique'
  return 'intermediaire'
}

export function buildTree(raw: RawSilo[]): TreeSilo[] {
  return (raw ?? []).map((silo) => {
    const siloName = silo.nom ?? silo.name ?? '(silo sans nom)'
    const rawCocoons = silo.cocons ?? silo.cocoons ?? []
    return {
      name: siloName,
      description: silo.description ?? '',
      cocoons: rawCocoons.map((c) => ({
        name: c.nom ?? c.name ?? '(cocon sans nom)',
        siloName,
        articles: (c.articles ?? []).map((a) => ({
          id: a.id ?? 0,
          title: a.title ?? a.titre ?? '(sans titre)',
          level: toLevel(a.type),
        })),
      })),
    }
  })
}

export function countByLevel(cocoon: TreeCocoon): Record<ArticleLevel, number> {
  const counts: Record<ArticleLevel, number> = { pilier: 0, intermediaire: 0, specifique: 0 }
  for (const a of cocoon.articles) counts[a.level]++
  return counts
}

/** Niveaux absents du cocon — sert à repérer les « trous » de l'arbre. */
export function missingLevels(cocoon: TreeCocoon): ArticleLevel[] {
  const counts = countByLevel(cocoon)
  return LEVELS.filter((l) => counts[l] === 0)
}

// --- Rendu ---

/** Habillage injecté : identité par défaut (texte brut, testable). */
export interface TreeTheme {
  silo: (s: string) => string
  cocoon: (s: string) => string
  empty: (s: string) => string
  level: (level: ArticleLevel, s: string) => string
  article: (s: string) => string
  dim: (s: string) => string
  marker: (s: string) => string
}

const identity = (s: string): string => s

export const PLAIN_THEME: TreeTheme = {
  silo: identity,
  cocoon: identity,
  empty: identity,
  level: (_l, s) => s,
  article: identity,
  dim: identity,
  marker: identity,
}

export interface RenderTreeOptions {
  /** Cocon à marquer « ◀ emplacement proposé ». */
  highlightCocoon?: string
  /** Nombre d'articles listés par cocon avant repli (défaut 3). */
  maxArticlesPerCocoon?: number
  /** Habillage (couleurs). Défaut : texte brut. */
  theme?: TreeTheme
  /** Largeur max d'un titre d'article (défaut 58). */
  titleWidth?: number
  /** N'affiche que ce silo — vue focalisée (Gate 1). */
  focusSilo?: string
  /** Masque l'en-tête et la légende — évite la redite quand l'arbre a déjà été vu. */
  compact?: boolean
}

const EMPTY_HINT = '— vide, à peupler —'

/**
 * Rendu arborescent lisible : silos (◆), cocons (● peuplé / ○ vide), et un
 * échantillon d'articles. La composition `P· I· S` est alignée en colonne pour
 * qu'on lise d'un coup d'œil la forme de chaque cocon.
 */
export function renderTree(tree: TreeSilo[], opts: RenderTreeOptions = {}): string {
  const maxArticles = opts.maxArticlesPerCocoon ?? 3
  const titleWidth = opts.titleWidth ?? 58
  const t = opts.theme ?? PLAIN_THEME
  const highlight = opts.highlightCocoon?.trim().toLowerCase()

  const focus = opts.focusSilo?.trim().toLowerCase()
  const shown = focus
    ? tree.filter((s) => s.name.trim().toLowerCase() === focus)
    : tree

  if (shown.length === 0) return '(arbre vide — aucun silo)'

  // Colonne d'alignement : nom de cocon le plus long (bornée pour éviter qu'un
  // nom aberrant ne pousse toute la colonne hors écran).
  const nameWidth = Math.min(
    52,
    Math.max(24, ...shown.flatMap((s) => s.cocoons.map((c) => c.name.length))),
  )

  const lines: string[] = opts.compact ? [] : ['🌳 Arbre SEO']

  shown.forEach((silo, si) => {
    const lastSilo = si === shown.length - 1
    const siloBranch = lastSilo ? '└─' : '├─'
    const siloIndent = lastSilo ? '   ' : '│  '
    const total = silo.cocoons.reduce((acc, c) => acc + c.articles.length, 0)

    lines.push(
      `${siloBranch} ${t.silo(`◆ ${silo.name}`)} ${t.dim(`(${total} article${total > 1 ? 's' : ''})`)}`,
    )

    silo.cocoons.forEach((cocoon, ci) => {
      const lastCocoon = ci === silo.cocoons.length - 1
      const cocoonBranch = lastCocoon ? '└─' : '├─'
      const articleIndent = siloIndent + (lastCocoon ? '   ' : '│  ')
      const isEmpty = cocoon.articles.length === 0
      const counts = countByLevel(cocoon)

      const paddedName = cocoon.name.padEnd(nameWidth)
      const bullet = isEmpty ? '○' : '●'
      const composition = isEmpty
        ? t.empty(EMPTY_HINT)
        : LEVELS.map((l) => t.level(l, `${LEVEL_ABBR[l]}${counts[l]}`)).join(t.dim(' · '))
      const marker = highlight && cocoon.name.trim().toLowerCase() === highlight
        ? '  ' + t.marker('◀ emplacement proposé')
        : ''
      const name = isEmpty ? t.empty(`${bullet} ${paddedName}`) : t.cocoon(`${bullet} ${paddedName}`)

      lines.push(`${siloIndent}${cocoonBranch} ${name} ${composition}${marker}`)

      cocoon.articles.slice(0, maxArticles).forEach((a) => {
        const badge = t.level(a.level, `[${LEVEL_ABBR[a.level]}]`)
        lines.push(`${articleIndent}   ${badge} ${t.article(truncateWords(a.title, titleWidth))}`)
      })
      const rest = cocoon.articles.length - maxArticles
      if (rest > 0) lines.push(`${articleIndent}   ${t.dim(`… +${rest} autre${rest > 1 ? 's' : ''}`)}`)
    })
  })

  if (!opts.compact) {
    lines.push('')
    lines.push(
      t.dim('   ') +
        [
          t.level('pilier', 'P') + t.dim(' Pilier'),
          t.level('intermediaire', 'I') + t.dim(' Intermédiaire'),
          t.level('specifique', 'S') + t.dim(' Spécialisé'),
        ].join(t.dim(' · ')) +
        t.dim('   ○ cocon vide — candidat naturel pour un Pilier'),
    )
  }

  return lines.join('\n')
}
