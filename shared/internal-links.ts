/**
 * Normalisation des liens internes au moment de l'export.
 *
 * Le contenu stocké en base porte deux formes de lien, selon l'outil qui l'a
 * écrit : l'éditeur pose `#article-<id>`, le robot pose `/<slug>`. Aucune des
 * deux n'est l'URL réelle d'un article publié. L'export les ramène toutes à la
 * forme canonique `/blog/<slug>` (audit 2026-09-19, tranché le 21/09).
 *
 * Un lien dont la cible est inconnue est **déballé** : on garde le texte, on
 * retire le lien. Mieux vaut une phrase sans lien qu'une erreur 404.
 *
 * Fonction PURE.
 */

import { blogPath } from './constants/site.constants.js'

interface RewriteOptions {
  /** slug de chaque article connu, par id — pour résoudre `#article-<id>`. */
  slugById?: Record<number, string>
  /** slugs autorisés comme cible. Absent = tout slug est accepté. */
  knownSlugs?: string[]
}

interface RewriteResult {
  html: string
  /** Liens conservés, en forme canonique. */
  rewritten: string[]
  /** Liens déballés faute de cible connue. */
  unwrapped: string[]
}

const LINK_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
const HREF_RE = /\shref\s*=\s*"([^"]*)"/i

/** Ramène tous les liens internes à `/blog/<slug>`. */
export function rewriteInternalLinks(html: string, options: RewriteOptions = {}): RewriteResult {
  if (!html) return { html, rewritten: [], unwrapped: [] }

  const { slugById = {}, knownSlugs } = options
  const allowed = knownSlugs ? new Set(knownSlugs) : null
  const rewritten: string[] = []
  const unwrapped: string[] = []

  const out = html.replace(LINK_RE, (full: string, attrs: string, inner: string) => {
    const href = HREF_RE.exec(attrs)?.[1]
    if (!href) return full

    // Liens externes, ancres de sommaire, mailto/tel : on ne touche pas.
    if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) return full
    if (href.startsWith('#') && !/^#article-\d+$/.test(href)) return full
    if (href.startsWith(`${blogPath('').replace(/\/$/, '')}/`)) return full

    const slug = resolveSlug(href, attrs, slugById)
    if (!slug || (allowed && !allowed.has(slug))) {
      unwrapped.push(inner.replace(/<[^>]*>/g, '').trim())
      return inner
    }

    rewritten.push(slug)
    const cleanedAttrs = attrs.replace(HREF_RE, '')
    return `<a href="${blogPath(slug)}"${cleanedAttrs}>${inner}</a>`
  })

  return { html: out, rewritten, unwrapped }
}

/** Slug cible d'un lien, quelle que soit la forme laissée par l'outil d'origine. */
function resolveSlug(
  href: string,
  attrs: string,
  slugById: Record<number, string>,
): string | null {
  const byId = /^#article-(\d+)$/.exec(href)
  if (byId) return slugById[Number(byId[1])] ?? null

  const dataSlug = /\sdata-slug\s*=\s*"([^"]+)"/i.exec(attrs)?.[1]
  if (dataSlug) return dataSlug

  const path = href.replace(/^\/+/, '').replace(/\/+$/, '').split(/[?#]/)[0]
  return path || null
}
