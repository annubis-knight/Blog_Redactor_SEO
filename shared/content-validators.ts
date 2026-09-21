/**
 * Valideurs de contenu — un par défaut constaté dans l'audit du 2026-09-19.
 *
 * Principe : chaque correction apportée au pipeline est doublée d'un contrôle
 * automatique, pour que le défaut ne revienne pas en silence. Ces règles sont
 * exécutées par `npm run verify` (via `scripts/verify-content.ts`) sur tous
 * les articles rédigés, et par le garde-fou d'export du robot.
 *
 * Fonctions PURES : HTML en entrée, liste de problèmes en sortie.
 *
 * | Règle | Défaut d'origine |
 * |---|---|
 * | `hn-h1-in-body`      | double H1 sur la page exportée (#455) |
 * | `hn-level-jump`      | hiérarchie de titres incohérente |
 * | `ai-monologue`       | « Je vais d'abord faire une recherche… » (#454-461) |
 * | `orphan-text`        | texte nu hors paragraphe (#456) |
 * | `truncated-block`    | paragraphe coupé au plafond de tokens |
 * | `markdown-residue`   | `**gras**` et bilans Markdown de l'IA (#460) |
 * | `forbidden-tag`      | `<nav>`/`<main>` avalés depuis des backticks (#459) |
 * | `unverifiable-claim` | faux cas clients (#455, #460, #461) — avertissement |
 * | `meta-*`             | titres et descriptions coupés (#456, #457, #459) |
 * | `page-*`             | contrôle de la page exportée |
 */

import { detectAiMetaLeaks } from './ai-text.js'
import { detectOrphanBlockText, trimTruncatedBlocks } from './content-repair.js'
import { BLOG_PATH, SITE_ORIGIN } from './constants/site.constants.js'

export type IssueSeverity = 'error' | 'warning'

export interface ContentIssue {
  rule: string
  severity: IssueSeverity
  message: string
  excerpt?: string
}

/** Longueurs utiles dans les résultats Google. */
export const META_TITLE_MAX = 60
export const META_DESCRIPTION_MAX = 160

/** Balises éditoriales admises dans le corps d'un article. */
const ALLOWED_TAGS = new Set([
  'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'br', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption', 'span', 'sup', 'sub', 'hr', 'mark', 'cite', 'small', 'time',
])

/** Mots qui ne terminent jamais un titre : signe d'une coupure. */
const DANGLING_WORDS = new Set([
  'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'à', 'au', 'aux', 'et', 'ou',
  'pour', 'par', 'en', 'dans', 'sur', 'avec', 'sans', 'que', 'qui', 'plus', 'votre',
  'vos', 'son', 'ses', 'leur', 'leurs', 'ce', 'cet', 'cette',
])

const text = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const excerpt = (value: string, max = 110): string =>
  value.length > max ? `${value.slice(0, max)}…` : value

/** Contrôle la hiérarchie des titres du corps d'article. */
function checkHeadings(html: string): ContentIssue[] {
  const issues: ContentIssue[] = []
  let previous = 2
  let h1Count = 0

  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const level = Number(match[1])
    const title = text(match[2] ?? '')

    if (level === 1) {
      h1Count++
      // Un H1 unique est voulu : le prompt le demande pour l'éditeur, et
      // `stripContentH1` le retire à l'export pour éviter le double H1 (#455).
      // Deux H1 dans le corps, en revanche, sont toujours une anomalie.
      issues.push({
        rule: h1Count > 1 ? 'hn-multiple-h1' : 'hn-h1-in-body',
        severity: h1Count > 1 ? 'error' : 'warning',
        message:
          h1Count > 1
            ? 'Plusieurs H1 dans le corps : il n\'en faut qu\'un.'
            : 'H1 présent dans le corps (toléré : l\'export le retire).',
        excerpt: excerpt(title),
      })
      continue
    }
    if (!title) {
      issues.push({ rule: 'hn-empty', severity: 'error', message: `Titre H${level} vide.` })
      continue
    }
    if (level > previous + 1) {
      issues.push({
        rule: 'hn-level-jump',
        severity: 'error',
        message: `Saut de niveau H${previous} → H${level} : la hiérarchie doit descendre d'un cran à la fois.`,
        excerpt: excerpt(title),
      })
    }
    previous = level
  }

  return issues
}

/** Balises interdites dans le corps (mise en page, scripts, landmarks). */
function checkTags(html: string): ContentIssue[] {
  const seen = new Set<string>()
  for (const match of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)) {
    const name = match[1]!.toLowerCase()
    if (!ALLOWED_TAGS.has(name) && !/^h[1-6]$/.test(name)) seen.add(name)
  }
  return [...seen].map((name) => ({
    rule: 'forbidden-tag',
    severity: 'error' as const,
    message: `Balise <${name}> interdite dans le corps d'un article.`,
  }))
}

/**
 * Valide le contenu HTML d'un article.
 * `error` = bloquant pour une publication, `warning` = à relire.
 */
export function validateArticleContent(html: string): ContentIssue[] {
  if (!html || !html.trim()) {
    return [{ rule: 'content-empty', severity: 'error', message: 'Contenu vide.' }]
  }

  const issues: ContentIssue[] = [...checkHeadings(html), ...checkTags(html)]

  for (const leak of detectAiMetaLeaks(html, { max: 5 })) {
    issues.push({
      rule: 'ai-monologue',
      severity: 'error',
      message: 'L\'IA parle d\'elle-même dans l\'article.',
      excerpt: excerpt(leak.excerpt),
    })
  }

  for (const orphan of detectOrphanBlockText(html).slice(0, 5)) {
    issues.push({
      rule: 'orphan-text',
      severity: 'error',
      message: 'Texte hors de tout paragraphe.',
      excerpt: excerpt(orphan),
    })
  }

  for (const fragment of trimTruncatedBlocks(html).trimmed.slice(0, 5)) {
    issues.push({
      rule: 'truncated-block',
      severity: 'error',
      message: 'Bloc coupé avant la fin d\'une phrase.',
      excerpt: excerpt(fragment, 70),
    })
  }

  const plain = text(html)
  if (plain.includes('**') || /(^|\s)##\s/.test(plain) || /(^|\s)---(\s|$)/.test(plain)) {
    issues.push({
      rule: 'markdown-residue',
      severity: 'error',
      message: 'Markdown resté dans le HTML (**gras**, ## titre ou ---).',
    })
  }

  for (const claim of detectUnverifiableClaimsInline(html)) {
    issues.push({
      rule: 'unverifiable-claim',
      severity: 'warning',
      message: 'Affirmation que PropulSite ne peut pas prouver — à relire.',
      excerpt: excerpt(claim),
    })
  }

  return issues
}

/**
 * Repère les preuves sociales invérifiables. Volontairement dupliqué du
 * heuristique CLI : `shared/` ne peut pas importer `scripts/`.
 */
function detectUnverifiableClaimsInline(html: string): string[] {
  const plain = text(html)
  const patterns = [
    /\bnous avons (?:testé(?:e?s)?|accompagné(?:e?s)?|aidé(?:e?s)?|audité(?:e?s)?|travaillé avec|suivi)(?![\p{L}\p{N}_])/giu,
    /\b(?:plus de|près de|environ)\s*\d{2,}\s*(?:pme|tpe|clients|entreprises|artisans|sites)(?![\p{L}\p{N}_])/giu,
    /\bnos (?:clients|pme|artisans)\b[^.!?]{0,80}\b(?:ont|a) (?:augmenté|doublé|triplé|gagné|multiplié)(?![\p{L}\p{N}_])/giu,
    /\b(?:nous observons|nous constatons|chez nos clients)(?![\p{L}\p{N}_])/giu,
    /\brésultats? réels?(?![\p{L}\p{N}_])/giu,
  ]

  const found: string[] = []
  for (const re of patterns) {
    for (const match of plain.matchAll(re)) {
      found.push(plain.slice(Math.max(0, match.index - 40), match.index + 90).trim())
    }
  }
  return found.slice(0, 5)
}

/** Valide le titre et la description affichés par Google. */
export function validateArticleMeta(meta: {
  metaTitle?: string | null
  metaDescription?: string | null
}): ContentIssue[] {
  const issues: ContentIssue[] = []
  const title = (meta.metaTitle ?? '').trim()
  const description = (meta.metaDescription ?? '').trim()

  const endsDangling = (value: string): boolean => {
    const last = value.replace(/[.!?…]+$/, '').split(/\s+/).pop()?.toLowerCase() ?? ''
    return DANGLING_WORDS.has(last)
  }

  if (!title) {
    issues.push({ rule: 'meta-title-missing', severity: 'error', message: 'Meta title absent.' })
  } else {
    if (title.length > META_TITLE_MAX) {
      issues.push({
        rule: 'meta-title-length',
        severity: 'error',
        message: `Meta title de ${title.length} caractères (maximum ${META_TITLE_MAX}).`,
        excerpt: title,
      })
    }
    if (title.endsWith('...') || title.endsWith('…') || endsDangling(title)) {
      issues.push({
        rule: 'meta-title-truncated',
        severity: 'error',
        message: 'Meta title coupé en plein vol.',
        excerpt: title,
      })
    }
  }

  if (!description) {
    issues.push({
      rule: 'meta-description-missing',
      severity: 'error',
      message: 'Meta description absente.',
    })
  } else {
    if (description.length > META_DESCRIPTION_MAX) {
      issues.push({
        rule: 'meta-description-length',
        severity: 'error',
        message: `Meta description de ${description.length} caractères (maximum ${META_DESCRIPTION_MAX}).`,
        excerpt: excerpt(description),
      })
    }
    if (description.endsWith('...') || description.endsWith('…') || endsDangling(description)) {
      issues.push({
        rule: 'meta-description-truncated',
        severity: 'error',
        message: 'Meta description coupée en plein vol.',
        excerpt: excerpt(description),
      })
    }
  }

  return issues
}

/**
 * Valide la page HTML finale : un seul H1, et aucun lien interne mort.
 *
 * @param publishedSlugs slugs des articles réellement publiés
 */
export function validateExportedPage(
  html: string,
  options: { publishedSlugs?: string[]; expectCanonical?: boolean } = {},
): ContentIssue[] {
  const issues: ContentIssue[] = []
  const h1Count = [...html.matchAll(/<h1\b[^>]*>/gi)].length

  if (options.expectCanonical !== false) {
    const canonical = /<link\s+rel="canonical"\s+href="([^"]+)"/i.exec(html)?.[1]
    if (!canonical) {
      issues.push({
        rule: 'page-missing-canonical',
        severity: 'error',
        message: 'Aucun lien canonique : deux adresses du même article se feraient concurrence.',
      })
    } else if (!canonical.startsWith(`${SITE_ORIGIN}${BLOG_PATH}/`)) {
      issues.push({
        rule: 'page-wrong-canonical',
        severity: 'error',
        message: `Lien canonique hors du domaine validé : ${canonical}`,
      })
    }
  }

  // Le domaine historique `propulsite.fr` n'est pas celui du site.
  for (const match of html.matchAll(/https?:\/\/(?:www\.)?propulsite\.fr[^"'\s]*/gi)) {
    issues.push({
      rule: 'page-wrong-domain',
      severity: 'error',
      message: `Adresse pointant vers un domaine obsolète : ${match[0]}`,
    })
    break
  }

  if (h1Count === 0) {
    issues.push({ rule: 'page-missing-h1', severity: 'error', message: 'La page n\'a aucun H1.' })
  } else if (h1Count > 1) {
    issues.push({
      rule: 'page-multiple-h1',
      severity: 'error',
      message: `La page contient ${h1Count} H1 — il n'en faut qu'un.`,
    })
  }

  const published = new Set(options.publishedSlugs ?? [])
  for (const match of html.matchAll(/<a\b[^>]*href="\/([^"#?]+)"[^>]*>/gi)) {
    const path = match[1]!.replace(/\/$/, '')
    if (path.startsWith('css/') || path.startsWith('assets/') || path.startsWith('components/')) continue

    const prefix = `${BLOG_PATH.replace(/^\//, '')}/`
    if (!path.startsWith(prefix)) {
      issues.push({
        rule: 'internal-link-not-canonical',
        severity: 'error',
        message: `Lien interne « /${path} » : les articles vivent sous ${BLOG_PATH}/.`,
      })
      continue
    }

    const slug = path.slice(prefix.length)
    if (!published.has(slug)) {
      issues.push({
        rule: 'dead-internal-link',
        severity: 'error',
        message: `Lien interne vers « ${BLOG_PATH}/${slug} », qui ne correspond à aucun article publié.`,
      })
    }
  }

  return issues
}
