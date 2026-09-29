/**
 * Plan de rattrapage d'un cocon d'avant l'arbre (C7) — PUR, sans base.
 *
 * Chaque article sans parent est rapproché :
 *   1. de son parent : celui que nomme la carte de stratégie (`parentTitle` de
 *      sa proposition), sinon, pour un intermédiaire, le pilier unique du cocon ;
 *   2. de la section de ce parent qui parle de son sujet (mots communs avec son
 *      titre et son mot-clé), parmi celles qu'aucun autre article n'a prises.
 *      Les mots du sujet du parent (son titre, son mot-clé) ne comptent pas :
 *      tout le cocon les partage, ils ne désignent aucune section. Il faut au
 *      moins deux mots propres à la section en commun.
 *      L'affectation est globale : du rapprochement le plus fort au plus faible,
 *      à égalité celui dont le TITRE parle le plus de la section — jamais « au
 *      premier article venu ».
 * Ce qui ne se rapproche pas sûrement est listé, jamais deviné : on le rattache
 * à la main depuis le Cerveau.
 */
import type { ArticleLevel } from '../shared/types/keyword-validate.types.js'

export interface PlanArticle {
  id: number
  title: string
  level: ArticleLevel
  parentId: number | null
  parentSection: string | null
  keyword: string | null
}

export interface PlanProposal {
  title: string
  parentTitle: string | null
  dbId?: number
}

export interface CocoonBackfillPlan {
  links: Array<{ childId: number; parentId: number; section: string }>
  unmatched: Array<{ childId: number; title: string; reason: string }>
}

const PARENT_LEVEL: Record<ArticleLevel, ArticleLevel | null> = { pilier: null, intermediaire: 'pilier', specifique: 'intermediaire' }
/** Du haut de l'arbre vers le bas : les parents sont traités avant leurs enfants. */
const TOP_DOWN: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']
const STOP = new Set(['les', 'des', 'une', 'pour', 'dans', 'avec', 'sur', 'par', 'son', 'ses', 'sa', 'aux', 'du', 'de', 'la', 'le', 'et', 'ou', 'un', 'vos', 'votre', 'nos', 'notre', 'comment', 'quoi', 'quel', 'quelle'])
/** Part des mots propres à une section retrouvés dans le sujet de l'article, au-delà de laquelle on rattache. */
const MIN_AFFINITY = 0.5
/** Nombre minimal de mots propres à la section en commun : un seul mot ne désigne rien sûrement. */
const MIN_SHARED_WORDS = 2

const norm = (s: string): string => s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/** Racine grossière : pluriel, puis terminaisons verbales courantes (« auditer » → « audit »). */
const stem = (t: string): string => t.replace(/[sx]$/, '').replace(/(er|ez|e)$/, '')

function tokens(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOP.has(t))
    .map(t => (t.length > 4 ? stem(t) : t.replace(/[sx]$/, '')))
}

/** Mots propres à la section (hors sujet du parent) retrouvés dans `subject`, et leur part. */
function coverage(sectionTokens: string[], subject: string): { shared: number; ratio: number } {
  if (sectionTokens.length === 0) return { shared: 0, ratio: 0 }
  const words = new Set(tokens(subject))
  const shared = sectionTokens.filter(t => words.has(t)).length
  return { shared, ratio: shared / sectionTokens.length }
}

export function planCocoonBackfill(
  articles: PlanArticle[],
  proposals: PlanProposal[],
  sectionsOf: (articleId: number) => string[],
): CocoonBackfillPlan {
  const plan: CocoonBackfillPlan = { links: [], unmatched: [] }
  const taken = new Set(articles.filter(a => a.parentId !== null && a.parentSection).map(a => `${a.parentId}:${norm(a.parentSection!)}`))
  const pillars = articles.filter(a => a.level === 'pilier')

  const orphans = articles
    .filter(a => a.level !== 'pilier' && a.parentId === null)
    .sort((x, y) => TOP_DOWN.indexOf(x.level) - TOP_DOWN.indexOf(y.level) || x.id - y.id)

  // 1. Le parent de chaque orphelin.
  const parentOf = new Map<number, PlanArticle>()
  for (const child of orphans) {
    const proposal = proposals.find(p => p.dbId === child.id) ?? proposals.find(p => norm(p.title) === norm(child.title))
    let parent: PlanArticle | undefined
    if (proposal?.parentTitle) {
      parent = articles.find(a => norm(a.title) === norm(proposal.parentTitle!))
    } else if (child.level === 'intermediaire' && pillars.length === 1) {
      parent = pillars[0]
    }
    if (!parent) {
      plan.unmatched.push({ childId: child.id, title: child.title, reason: 'Parent introuvable : ni la carte de stratégie ni le cocon ne le désignent sans ambiguïté.' })
    } else if (parent.level !== PARENT_LEVEL[child.level]) {
      plan.unmatched.push({ childId: child.id, title: child.title, reason: `Le parent désigné (« ${parent.title} ») n’est pas du niveau attendu.` })
    } else {
      parentOf.set(child.id, parent)
    }
  }

  // 2. Les sections : tous les rapprochements possibles, du plus fort au plus
  //    faible ; à égalité, celui dont le titre parle le plus de la section.
  const candidates = orphans.flatMap((child) => {
    const parent = parentOf.get(child.id)
    if (!parent) return []
    const parentTopic = new Set(tokens(`${parent.title} ${parent.keyword ?? ''}`))
    return sectionsOf(parent.id)
      .filter(section => !taken.has(`${parent.id}:${norm(section)}`))
      .map((section) => {
        const own = [...new Set(tokens(section))].filter(t => !parentTopic.has(t))
        const subject = coverage(own, `${child.title} ${child.keyword ?? ''}`)
        return { child, parent, section, shared: subject.shared, score: subject.ratio, byTitle: coverage(own, child.title).ratio }
      })
      .filter(c => c.score >= MIN_AFFINITY && c.shared >= MIN_SHARED_WORDS)
  }).sort((x, y) => y.score - x.score || y.byTitle - x.byTitle || x.child.id - y.child.id)

  const placed = new Set<number>()
  for (const c of candidates) {
    const key = `${c.parent.id}:${norm(c.section)}`
    if (placed.has(c.child.id) || taken.has(key)) continue
    taken.add(key)
    placed.add(c.child.id)
    plan.links.push({ childId: c.child.id, parentId: c.parent.id, section: c.section })
  }
  for (const child of orphans) {
    const parent = parentOf.get(child.id)
    if (parent && !placed.has(child.id)) {
      plan.unmatched.push({ childId: child.id, title: child.title, reason: `Aucune section libre de « ${parent.title} » ne parle de ce sujet : à rattacher à la main.` })
    }
  }
  plan.links.sort((x, y) => x.childId - y.childId)
  plan.unmatched.sort((x, y) => x.childId - y.childId)
  return plan
}
