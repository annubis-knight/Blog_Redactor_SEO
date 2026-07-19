/**
 * Injection PURE de liens internes dans le HTML d'un article.
 *
 * Réplique le maillage manuel (`useInternalLinking.applySuggestion`) : pour
 * chaque cible, on pose un `<a>` à la **première occurrence exploitable** de
 * l'ancre — et on n'enregistre le lien que si cette occurrence existe (le
 * manuel abandonne aussi quand `indexOf(anchor) < 0`).
 *
 * « Exploitable » = dans du texte visible, **hors d'un `<a>` existant** (pas de
 * lien imbriqué) et **hors d'un titre `<h1>`-`<h6>`** (on ne transforme pas un
 * titre en lien). Une ancre déjà consommée par une cible n'est pas réutilisée.
 *
 * Le texte est traité tel quel (entités HTML laissées littérales) : les ancres
 * proposées sont des mots normaux, un `&amp;` isolé ne créera pas de faux match.
 */

export interface LinkTarget {
  targetId: number
  slug: string
  anchor: string
}

export interface AppliedLink {
  targetId: number
  anchorText: string
  /** Position textuelle, au format du maillage manuel (`char-<index>`). */
  position: string
}

export interface InjectResult {
  html: string
  applied: AppliedLink[]
}

interface TextChar {
  htmlPos: number
  linkable: boolean
}

/** Décompose le HTML : suite de caractères de texte, chacun situé et « exploitable ». */
function scanText(html: string): { text: string; chars: TextChar[] } {
  const chars: TextChar[] = []
  let text = ''
  let anchorDepth = 0
  let headingDepth = 0
  let i = 0

  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      if (end === -1) break
      const raw = html.slice(i + 1, end).trim()
      const closing = raw.startsWith('/')
      const name = raw.replace(/^\//, '').split(/[\s/>]/)[0]?.toLowerCase() ?? ''
      if (name === 'a') anchorDepth += closing ? -1 : 1
      else if (/^h[1-6]$/.test(name)) headingDepth += closing ? -1 : 1
      i = end + 1
      continue
    }
    chars.push({ htmlPos: i, linkable: anchorDepth <= 0 && headingDepth <= 0 })
    text += html[i]
    i++
  }

  return { text, chars }
}

const MAX_LINKS = 8

export function injectInternalLinks(
  html: string,
  targets: LinkTarget[],
  opts: { max?: number } = {},
): InjectResult {
  const max = opts.max ?? MAX_LINKS
  if (!html || targets.length === 0) return { html, applied: [] }

  const { text, chars } = scanText(html)
  const lower = text.toLowerCase()

  interface Injection {
    htmlStart: number
    htmlEnd: number
    slug: string
    matched: string
    targetId: number
    textIndex: number
  }
  const injections: Injection[] = []
  const used: { start: number; end: number }[] = []

  const overlaps = (start: number, end: number): boolean =>
    used.some((u) => start < u.end && end > u.start)

  for (const target of targets) {
    if (injections.length >= max) break
    const anchor = target.anchor.trim().toLowerCase()
    if (!anchor || !target.slug) continue

    let from = 0
    for (;;) {
      const idx = lower.indexOf(anchor, from)
      if (idx === -1) break
      const endIdx = idx + anchor.length
      const span = chars.slice(idx, endIdx)
      const allLinkable = span.length === anchor.length && span.every((c) => c.linkable)
      if (allLinkable && !overlaps(idx, endIdx)) {
        injections.push({
          htmlStart: chars[idx].htmlPos,
          htmlEnd: chars[endIdx - 1].htmlPos + 1,
          slug: target.slug,
          matched: text.slice(idx, endIdx),
          targetId: target.targetId,
          textIndex: idx,
        })
        used.push({ start: idx, end: endIdx })
        break
      }
      from = idx + 1
    }
  }

  // Applique de la fin vers le début pour préserver les offsets HTML.
  const ordered = [...injections].sort((a, b) => b.htmlStart - a.htmlStart)
  let out = html
  for (const inj of ordered) {
    const link = `<a href="/${inj.slug}" data-slug="${inj.slug}">${inj.matched}</a>`
    out = out.slice(0, inj.htmlStart) + link + out.slice(inj.htmlEnd)
  }

  const applied: AppliedLink[] = injections
    .sort((a, b) => a.textIndex - b.textIndex)
    .map((inj) => ({
      targetId: inj.targetId,
      anchorText: inj.matched,
      position: `char-${inj.textIndex}`,
    }))

  return { html: out, applied }
}
