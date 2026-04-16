// ---------------------------------------------------------------------------
// Structure validation — NormalizedTag + validateHtmlStructurePreserved
// ---------------------------------------------------------------------------
//
// Regex-based, stateless, usable both client-side (DOMParser NOT required) and
// server-side (Node without DOMParser). Used by humanize-section pipeline to
// ensure Claude preserves HTML structure bit-for-bit.
//
// Whitelist of attributes we consider critical for structural equivalence:
//   href, class, id, rel, target, data-*
// Rationale: TipTap custom blocks (ContentValeur, AnswerCapsule, InternalLink,
// DynamicBlock) store their state via class + data-*. Losing them = broken
// editor rendering.

export interface NormalizedTag {
  name: string
  closing: boolean
  selfClosing: boolean
  attrs: Record<string, string>
}

export interface StructureValidationResult {
  preserved: boolean
  originalTags: NormalizedTag[]
  modifiedTags: NormalizedTag[]
  diff?: {
    index: number
    reason: 'tag-name' | 'missing' | 'extra' | 'attr' | 'attr-value'
    expected?: string
    got?: string
  }
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const WHITELISTED_ATTRS = new Set(['href', 'class', 'id', 'rel', 'target'])

function isWhitelistedAttr(name: string): boolean {
  const lower = name.toLowerCase()
  return WHITELISTED_ATTRS.has(lower) || lower.startsWith('data-')
}

/**
 * Parse an HTML string into a flat sequence of NormalizedTag objects.
 * Only whitelisted attributes are captured (finding G8).
 * `<br>` and `<br/>` normalize identically.
 */
export function parseNormalizedTags(html: string): NormalizedTag[] {
  const rawTags = html.match(/<\/?[a-zA-Z][^>]*>/g) ?? []
  return rawTags.map((raw) => {
    const closing = raw.startsWith('</')
    const endsSelfClose = raw.endsWith('/>')
    const innerStart = closing ? 2 : 1
    const innerEnd = endsSelfClose ? raw.length - 2 : raw.length - 1
    const inner = raw.slice(innerStart, innerEnd).trim()
    const spaceIdx = inner.search(/\s/)
    const name = (spaceIdx === -1 ? inner : inner.slice(0, spaceIdx)).toLowerCase()
    const selfClosing = endsSelfClose || VOID_ELEMENTS.has(name)

    const attrs: Record<string, string> = {}
    if (!closing && spaceIdx !== -1) {
      const attrsStr = inner.slice(spaceIdx + 1)
      const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
      let m: RegExpExecArray | null
      while ((m = attrRegex.exec(attrsStr)) !== null) {
        const aname = m[1]!
        if (!isWhitelistedAttr(aname)) continue
        const aval = m[2] ?? m[3] ?? m[4] ?? ''
        attrs[aname.toLowerCase()] = aval
      }
    }
    return { name, closing, selfClosing, attrs }
  })
}

/**
 * Compare the tag sequences of two HTML strings.
 * Returns `preserved: true` if and only if:
 *   - Same number of tags
 *   - Same sequence of (name, closing) pairs
 *   - Same set of whitelisted attribute keys per tag
 *   - Same values for each whitelisted attribute
 *
 * Non-whitelisted attributes (style, title, etc.) are ignored.
 * Used both by client store (editor.store.reduceArticle / humanizeArticle)
 * and server route (/generate/humanize-section) for retry decision.
 */
export function validateHtmlStructurePreserved(
  original: string,
  modified: string,
): StructureValidationResult {
  const originalTags = parseNormalizedTags(original)
  const modifiedTags = parseNormalizedTags(modified)

  if (originalTags.length !== modifiedTags.length) {
    const idx = Math.min(originalTags.length, modifiedTags.length)
    const tooFew = modifiedTags.length < originalTags.length
    return {
      preserved: false,
      originalTags,
      modifiedTags,
      diff: {
        index: idx,
        reason: tooFew ? 'missing' : 'extra',
        expected: tooFew ? originalTags[idx]?.name : undefined,
        got: tooFew ? undefined : modifiedTags[idx]?.name,
      },
    }
  }

  for (let i = 0; i < originalTags.length; i++) {
    const o = originalTags[i]!
    const m = modifiedTags[i]!

    if (o.name !== m.name || o.closing !== m.closing) {
      return {
        preserved: false,
        originalTags,
        modifiedTags,
        diff: {
          index: i,
          reason: 'tag-name',
          expected: `${o.closing ? '/' : ''}${o.name}`,
          got: `${m.closing ? '/' : ''}${m.name}`,
        },
      }
    }

    const oKeys = Object.keys(o.attrs).sort()
    const mKeys = Object.keys(m.attrs).sort()
    if (oKeys.length !== mKeys.length || oKeys.some((k, idx) => k !== mKeys[idx])) {
      return {
        preserved: false,
        originalTags,
        modifiedTags,
        diff: {
          index: i,
          reason: 'attr',
          expected: oKeys.join(','),
          got: mKeys.join(','),
        },
      }
    }

    for (const k of oKeys) {
      if (o.attrs[k] !== m.attrs[k]) {
        return {
          preserved: false,
          originalTags,
          modifiedTags,
          diff: {
            index: i,
            reason: 'attr-value',
            expected: `${k}="${o.attrs[k]}"`,
            got: `${k}="${m.attrs[k]}"`,
          },
        }
      }
    }
  }

  return { preserved: true, originalTags, modifiedTags }
}

/**
 * Merge consecutive HTML block elements of the same tag (and same attributes)
 * into a single element, joining their inner content with <br>.
 *
 * Example: <p>A</p><p>B</p><p>C</p> → <p>A<br>\nB<br>\nC</p>
 *
 * Elements with different attributes are NOT merged.
 */
export function mergeConsecutiveElements(html: string): string {
  const blockRegex = /<(p|blockquote)(\s[^>]*)?>[\s\S]*?<\/\1>/gi

  const blocks: Array<{
    tag: string
    attrs: string
    start: number
    end: number
    raw: string
  }> = []

  let m
  while ((m = blockRegex.exec(html)) !== null) {
    blocks.push({
      tag: m[1]!.toLowerCase(),
      attrs: (m[2] || '').trim(),
      start: m.index,
      end: m.index + m[0]!.length,
      raw: m[0]!,
    })
  }

  if (blocks.length < 2) return html

  // Find mergeable groups: consecutive blocks with same tag+attrs, only whitespace between
  const merges: Array<{ start: number; end: number; replacement: string }> = []

  let i = 0
  while (i < blocks.length) {
    let j = i + 1
    while (j < blocks.length) {
      const prev = blocks[j - 1]!
      const curr = blocks[j]!
      const between = html.substring(prev.end, curr.start)
      if (curr.tag === prev.tag && curr.attrs === prev.attrs && !between.trim()) {
        j++
      } else {
        break
      }
    }

    if (j - i >= 2) {
      const group = blocks.slice(i, j)
      const contents = group.map(b => {
        const openEnd = b.raw.indexOf('>') + 1
        const closeStart = b.raw.lastIndexOf('</')
        return b.raw.substring(openEnd, closeStart).trim()
      })
      const openTag = group[0]!.raw.substring(0, group[0]!.raw.indexOf('>') + 1)
      const closeTag = `</${group[0]!.tag}>`

      merges.push({
        start: group[0]!.start,
        end: group[group.length - 1]!.end,
        replacement: `${openTag}${contents.join('<br>\n')}${closeTag}`,
      })
    }

    i = j
  }

  if (merges.length === 0) return html

  // Apply merges from end to start to preserve indices
  let result = html
  for (let k = merges.length - 1; k >= 0; k--) {
    const merge = merges[k]!
    result = result.substring(0, merge.start) + merge.replacement + result.substring(merge.end)
  }

  return result
}

/**
 * Remove empty block-level elements that add no visible content.
 * Handles: `<p></p>`, `<div class="..."><p></p></div>`, `<blockquote></blockquote>`, etc.
 * Repeated until stable (nested empties may create new empties when stripped).
 */
export function removeEmptyElements(html: string): string {
  let result = html
  let prev: string
  do {
    prev = result
    // Remove empty <p></p> (with optional whitespace inside)
    result = result.replace(/<p>\s*<\/p>/gi, '')
    // Remove <div ...> that only contains whitespace or empty <p>
    result = result.replace(/<div[^>]*>\s*<\/div>/gi, '')
    // Remove empty <blockquote></blockquote>
    result = result.replace(/<blockquote[^>]*>\s*<\/blockquote>/gi, '')
    // Clean up leftover whitespace between tags
    result = result.replace(/>\s{2,}</g, '> <')
  } while (result !== prev)
  return result.trim()
}

// ---------------------------------------------------------------------------
// splitByH2Regex — shared H2-based HTML splitter (regex-only, isomorphic)
// ---------------------------------------------------------------------------

export interface H2Section {
  title: string         // plain text of the H2 (tags stripped)
  fullHtml: string      // full HTML of the section (H2 tag included)
  bodyHtml: string      // HTML without the H2 tag
  isIntro: boolean      // true if title matches /^introduction$/i
  isConclusion: boolean // true if title contains "conclusion"
}

export interface H2Split {
  intro: string         // content before the first H2
  sections: H2Section[]
}

/**
 * Split an HTML string by `<h2>` boundaries into intro + sections.
 * Regex-only (no DOMParser), works client-side and server-side.
 * Used as the shared base for splitArticleSections() and export parseSections().
 */
export function splitByH2Regex(html: string): H2Split {
  if (!html || !html.trim()) return { intro: '', sections: [] }

  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  const h2Matches: Array<{ index: number; fullMatch: string; text: string }> = []
  let m: RegExpExecArray | null
  while ((m = h2Regex.exec(html)) !== null) {
    const text = m[1]!.replace(/<[^>]*>/g, '').trim()
    h2Matches.push({ index: m.index, fullMatch: m[0], text })
  }

  if (h2Matches.length === 0) {
    return { intro: html.trim(), sections: [] }
  }

  const intro = html.substring(0, h2Matches[0]!.index).trim()
  const sections: H2Section[] = []

  for (let i = 0; i < h2Matches.length; i++) {
    const current = h2Matches[i]!
    const nextIndex = i + 1 < h2Matches.length ? h2Matches[i + 1]!.index : html.length
    const fullHtml = html.substring(current.index, nextIndex).trim()
    const bodyHtml = fullHtml.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, '').trim()

    sections.push({
      title: current.text,
      fullHtml,
      bodyHtml,
      isIntro: /^introduction$/i.test(current.text),
      isConclusion: /conclusion/i.test(current.text),
    })
  }

  return { intro, sections }
}

// ---------------------------------------------------------------------------
// splitArticleSections — split article HTML into 3 logical sections
// ---------------------------------------------------------------------------

export interface ArticleSections {
  intro: string
  body: string
  conclusion: string
}

/**
 * Split a full article HTML string into 3 sections:
 *  - **intro**: everything up to (but excluding) the first non-introduction `<h2>`
 *  - **body**: from the first non-introduction `<h2>` up to (but excluding)
 *    the conclusion `<h2>`
 *  - **conclusion**: from the conclusion `<h2>` to the end
 *
 * The table of contents is handled separately via the outline store / OutlineRecap.
 */
export function splitArticleSections(html: string): ArticleSections {
  const empty: ArticleSections = { intro: '', body: '', conclusion: '' }
  if (!html || !html.trim()) return empty

  const split = splitByH2Regex(html)

  if (split.sections.length === 0) {
    // No H2s: everything goes to body
    return { intro: '', body: split.intro || html.trim(), conclusion: '' }
  }

  // Classify sections
  const introSections = split.sections.filter(s => s.isIntro)
  const conclusionSection = [...split.sections].reverse().find(s => s.isConclusion)
  const bodySections = split.sections.filter(s => !s.isIntro && s !== conclusionSection)

  // Build intro: pre-H2 content + introduction H2 sections
  const introParts = [split.intro, ...introSections.map(s => s.fullHtml)].filter(Boolean)
  const introHtml = introParts.join('\n').trim()

  // Build body: all non-intro, non-conclusion sections
  const bodyHtml = bodySections.map(s => s.fullHtml).join('\n').trim()

  // Build conclusion
  const conclusionHtml = conclusionSection?.fullHtml?.trim() ?? ''

  // Fallback: if body is empty but we have content, put intro overflow into body
  if (!bodyHtml && !conclusionHtml && introHtml) {
    return { intro: '', body: introHtml, conclusion: '' }
  }

  return { intro: introHtml, body: bodyHtml, conclusion: conclusionHtml }
}
