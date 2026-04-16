import {
  validateHtmlStructurePreserved as sharedValidate,
  parseNormalizedTags as sharedParseTags,
  type NormalizedTag,
  type StructureValidationResult,
} from '@shared/html-utils'

/**
 * Strip HTML tags and return plain text.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Count words from raw HTML. Uses stripHtml + split on whitespace.
 * Kept local (not imported from seo-calculator.ts) to avoid a circular
 * dependency on the SEO scoring pipeline during tests.
 *
 * This is the SSOT for word counting consumed by editor.store.wordCount
 * (finding G5). The seo.store reads `editorStore.wordCount`.
 */
export function countWordsFromHtml(html: string): number {
  if (!html) return 0
  const text = stripHtml(html)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

// ---------------------------------------------------------------------------
// splitArticleByH2 — split an article HTML into N sections keyed by <h2>
// ---------------------------------------------------------------------------

export interface ArticleSectionPart {
  index: number
  title: string
  html: string
}

export interface SplitByH2Result {
  intro: string
  sections: ArticleSectionPart[]
}

/**
 * Split an HTML article into:
 *   - `intro`: everything before the first <h2>
 *   - `sections`: one entry per top-level <h2>, including the H2 itself and
 *     all following siblings up to (but excluding) the next H2.
 *
 * Iterates over `body.childNodes` (NOT `body.children` — the latter skips
 * #text and #comment nodes and would drop inter-block content; finding F4).
 *
 * Input contract: raw persisted HTML from `editorStore.content` (DOMPurify
 * sanitized at hydration). NOT TipTap's re-emitted HTML (decision #13).
 *
 * Fallback behavior (tolerates malformed HTML, risk #5):
 *   - If DOMParser is unavailable → { intro: html, sections: [] }
 *   - If no <h2> is found → { intro: html, sections: [] }
 *   - If any exception is thrown → { intro: html, sections: [] }
 */
export function splitArticleByH2(html: string): SplitByH2Result {
  if (!html) return { intro: '', sections: [] }

  try {
    if (typeof DOMParser === 'undefined') {
      return { intro: html, sections: [] }
    }

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const body = doc.body
    if (!body) return { intro: html, sections: [] }

    const serialize = (node: Node): string => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).outerHTML
      }
      if (node.nodeType === Node.TEXT_NODE) {
        return (node as Text).data
      }
      if (node.nodeType === Node.COMMENT_NODE) {
        return `<!--${(node as Comment).data}-->`
      }
      return ''
    }

    const sections: ArticleSectionPart[] = []
    let intro = ''
    let currentBuffer: string | null = null
    let currentIndex = -1
    let currentTitle = ''

    const flush = () => {
      if (currentBuffer !== null) {
        sections.push({
          index: currentIndex,
          title: currentTitle,
          html: currentBuffer.trim(),
        })
        currentBuffer = null
      }
    }

    for (const node of Array.from(body.childNodes)) {
      const isH2
        = node.nodeType === Node.ELEMENT_NODE
        && (node as Element).nodeName === 'H2'

      if (isH2) {
        flush()
        const h2 = node as Element
        currentIndex = sections.length
        currentTitle = (h2.textContent || '').trim()
        currentBuffer = h2.outerHTML
      } else if (currentBuffer !== null) {
        currentBuffer += serialize(node)
      } else {
        intro += serialize(node)
      }
    }
    flush()

    if (sections.length === 0) {
      return { intro: html, sections: [] }
    }

    return { intro: intro.trim(), sections }
  } catch {
    return { intro: html, sections: [] }
  }
}

// ---------------------------------------------------------------------------
// validateHtmlStructurePreserved — re-exported from shared/html-utils
// ---------------------------------------------------------------------------
// Kept in shared/ so the server /generate/humanize-section route can reuse
// the exact same whitelist + diff logic (Task 11 is a no-op: just import).
// Re-exported here for ergonomic client-side imports from `@/utils/text-utils`.

export type { NormalizedTag, StructureValidationResult }

export function validateHtmlStructurePreserved(
  original: string,
  modified: string,
): StructureValidationResult {
  return sharedValidate(original, modified)
}

export function parseNormalizedTags(html: string): NormalizedTag[] {
  return sharedParseTags(html)
}
