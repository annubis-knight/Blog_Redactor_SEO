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
