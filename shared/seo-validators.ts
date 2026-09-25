/**
 * Valideurs de qualité SEO d'un article — le livrable, pas seulement sa propreté.
 *
 * `content-validators.ts` vérifie qu'un texte n'est pas CASSÉ (monologue de
 * l'IA, blocs tronqués, balises avalées). Ici, on vérifie qu'il est BON pour
 * Google et pour le lecteur : le mot-clé est-il là où il doit être, l'article
 * a-t-il la taille de son rôle dans le cocon, reste-t-il dans l'offre ?
 *
 * Seuils choisis pour signaler l'anormal, pas pour dicter une recette :
 * `error` = l'article ne remplit pas son rôle, `warning` = à relire.
 *
 * Fonctions PURES. Lancées par `npm run verify` via `scripts/verify-content.ts`.
 */

import type { ContentIssue } from './content-validators.js'
import { ARTICLE_TYPE_RULES } from './constants/article-type-rules.js'

export type SeoLevel = 'pilier' | 'intermediaire' | 'specifique'

export interface SeoInput {
  title: string
  slug: string
  level: SeoLevel
  content: string
  metaTitle?: string | null
  metaDescription?: string | null
  capitaine?: string | null
  lieutenants?: string[]
  /** Ville d'ancrage quand le cocon est local (ex. « Toulouse »). */
  localCity?: string | null
}

/**
 * Offres que PropulSite ne vend pas. Un article qui vise ces requêtes attire
 * un trafic qui ne peut pas devenir client. Né du run réel du 2026-09-21 :
 * l'heuristique avait choisi « site e-commerce » comme Capitaine du pilier.
 */
const EXCLUDED_OFFER_TERMS = ['e-commerce', 'ecommerce', 'boutique en ligne', 'marketplace']

/** Terme hors offre contenu dans un mot-clé, ou `null`. */
export function offOfferTerm(keyword: string): string | null {
  const normalized = tokens(keyword).join(' ')
  return EXCLUDED_OFFER_TERMS.find((term) => normalized.includes(tokens(term).join(' '))) ?? null
}

/** Planchers de longueur et de chapitres : la source unique (FR-INFRA-TYPE-RULES-SSOT). */
const MIN_WORDS = (level: SeoLevel): number => ARTICLE_TYPE_RULES[level].wordsFloor
const MIN_H2 = (level: SeoLevel): number => ARTICLE_TYPE_RULES[level].h2Floor

/** Au-delà de ce nombre de mentions pour 1 000 mots, la ville sonne forcé. */
const CITY_PER_1000_MAX = 6

const SLUG_MAX_LENGTH = 75

const STOPWORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'a', 'au', 'aux', 'en', 'et', 'ou',
  'pour', 'par', 'sur', 'd', 'l', 'qu', 'que', 'qui', 'dans', 'avec', 'son', 'sa', 'ses',
  'votre', 'vos', 'mon', 'ma', 'mes', 'ce', 'cette',
])

/** Mots significatifs, sans accents ni casse. */
function tokens(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

/** Deux mots se valent au pluriel/féminin près, ou par une racine commune de 5 lettres. */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (long.startsWith(short) && long.length - short.length <= 2) return true
  return short.length >= 5 && long.slice(0, 5) === short.slice(0, 5)
}

/**
 * Part des mots significatifs d'un mot-clé présents dans un texte (0 à 1).
 * Tolère accents, casse, mots vides et variations de fin de mot.
 */
export function keywordCoverage(keyword: string, text: string): number {
  const wanted = tokens(keyword)
  if (wanted.length === 0) return 0
  const available = [...new Set(tokens(text))]
  const found = wanted.filter((w) => available.some((t) => tokensMatch(w, t)))
  return found.length / wanted.length
}

const plain = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/** Texte de l'introduction : ce qui précède le premier H2, sans le H1. */
function introText(html: string): string {
  const withoutH1 = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')
  const firstH2 = withoutH1.search(/<h2\b/i)
  const intro = plain(firstH2 >= 0 ? withoutH1.slice(0, firstH2) : withoutH1)
  return intro || plain(withoutH1).split(' ').slice(0, 100).join(' ')
}

function issue(rule: string, severity: 'error' | 'warning', message: string, excerpt?: string): ContentIssue {
  return excerpt ? { rule, severity, message, excerpt } : { rule, severity, message }
}

/** Contrôles portant sur le Capitaine (mot-clé principal). */
function checkCapitaine(input: SeoInput): ContentIssue[] {
  const capitaine = (input.capitaine ?? '').trim()
  if (!capitaine) {
    return [issue('seo-capitaine-missing', 'error', 'Aucun Capitaine : l\'article ne vise aucune recherche précise.')]
  }

  const issues: ContentIssue[] = []
  const offTerm = offOfferTerm(capitaine)
  if (offTerm) {
    issues.push(issue('seo-off-offer', 'error', `Le Capitaine vise « ${offTerm} », une offre que PropulSite ne vend pas.`, capitaine))
  }

  // Titre et meta title : le Capitaine EN ENTIER (variantes grammaticales
  // admises par tokensMatch). À 75 %, un capitaine de 4 mots pouvait perdre sa
  // tête de requête : « stratégie » manquait au H1 du pilier 1013 sans alerte
  // (épopée qualité SEO, C2).
  if (keywordCoverage(capitaine, input.title) < 1) {
    issues.push(issue('seo-capitaine-not-in-title', 'error', 'Le Capitaine n\'apparaît pas en entier dans le titre (H1).', capitaine))
  }
  if (input.metaTitle && keywordCoverage(capitaine, input.metaTitle) < 1) {
    issues.push(issue('seo-capitaine-not-in-meta-title', 'warning', 'Le Capitaine n\'apparaît pas dans le titre affiché par Google.', input.metaTitle))
  }
  if (keywordCoverage(capitaine, introText(input.content)) < 0.75) {
    issues.push(issue('seo-capitaine-not-in-intro', 'warning', 'Le Capitaine n\'apparaît pas dans l\'introduction.', capitaine))
  }
  if (keywordCoverage(capitaine, input.slug) < 0.5) {
    issues.push(issue('seo-capitaine-not-in-slug', 'warning', 'L\'adresse de la page ne reprend pas le Capitaine.', input.slug))
  }
  return issues
}

/** Contrôles de longueur et de structure, selon le rôle dans le cocon. */
function checkStructure(input: SeoInput): ContentIssue[] {
  const issues: ContentIssue[] = []
  const words = plain(input.content).split(' ').filter(Boolean).length
  if (words < MIN_WORDS(input.level)) {
    issues.push(issue('seo-thin-content', 'error', `${words} mots : trop mince pour un article de niveau ${input.level} (minimum ${MIN_WORDS(input.level)}).`))
  }

  const h2 = [...input.content.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => plain(m[1] ?? '').toLowerCase())
  if (h2.length < MIN_H2(input.level)) {
    issues.push(issue('seo-too-few-sections', 'warning', `${h2.length} chapitre(s) H2 : peu pour un article de niveau ${input.level} (${MIN_H2(input.level)} attendus).`))
  }
  const duplicates = h2.filter((title, i) => title && h2.indexOf(title) !== i)
  if (duplicates.length > 0) {
    issues.push(issue('seo-duplicate-h2', 'warning', 'Deux chapitres portent le même titre.', duplicates[0]))
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > SLUG_MAX_LENGTH) {
    issues.push(issue('seo-slug-format', 'error', `Adresse mal formée ou trop longue (${input.slug.length} caractères, ${SLUG_MAX_LENGTH} maximum, minuscules et tirets).`, input.slug))
  }
  return issues
}

/** Ancrage local et couverture des mots-clés secondaires. */
function checkCoverage(input: SeoInput): ContentIssue[] {
  const issues: ContentIssue[] = []
  const text = plain(input.content)

  if (input.localCity) {
    const city = tokens(input.localCity)[0] ?? ''
    const words = tokens(text)
    const count = words.filter((w) => w === city).length
    const per1000 = (count / Math.max(1, words.length)) * 1000
    if (count === 0) {
      issues.push(issue('seo-local-missing', 'warning', `Article d'un cocon local qui ne cite jamais « ${input.localCity} ».`))
    } else if (count > 10 && per1000 > CITY_PER_1000_MAX) {
      issues.push(issue('seo-local-overuse', 'warning', `« ${input.localCity} » cité ${count} fois (${per1000.toFixed(1)} pour 1 000 mots) : ça sonne forcé.`))
    }
  }

  const lieutenants = (input.lieutenants ?? []).filter((l) => l.trim())
  const offLieutenants = lieutenants.filter((l) => offOfferTerm(l))
  if (offLieutenants.length > 0) {
    issues.push(issue('seo-off-offer-lieutenant', 'warning', 'Lieutenant(s) hors de l\'offre PropulSite.', offLieutenants.join(', ')))
  }
  if (lieutenants.length > 0) {
    const present = lieutenants.filter((l) => keywordCoverage(l, text) >= 0.75)
    if (present.length < Math.ceil(lieutenants.length / 2)) {
      issues.push(issue('seo-lieutenants-coverage', 'warning', `${present.length} Lieutenant(s) sur ${lieutenants.length} traité(s) dans le texte.`))
    }
  }
  return issues
}

/** Valide la qualité SEO d'un article rédigé. */
export function validateArticleSeo(input: SeoInput): ContentIssue[] {
  return [...checkCapitaine(input), ...checkStructure(input), ...checkCoverage(input)]
}
