/**
 * Robust JSON parser for AI responses.
 * Handles: markdown ```json``` wrappers, preambles ("Voici le JSON :"),
 * balanced brace extraction, truncated JSON repair.
 *
 * Extracted from keyword-ai-panel.routes.ts + hardened for Gemini/OpenRouter
 * which emit more preambles than Claude.
 */
import { log } from './logger.js'

// ---------------------------------------------------------------------------
// Cleanup strip
// ---------------------------------------------------------------------------

/** Remove markdown code fences and common preambles before parsing. */
function stripMarkdownWrappers(content: string): string {
  let c = content.trim()
  // 1. Markdown fences: ```json ... ``` or ``` ... ```
  c = c.replace(/^```(?:json|JSON)?\s*\n?/i, '')
  c = c.replace(/\n?```\s*$/i, '')
  // 2. Common preambles before the first { or [
  const firstStructuralIdx = c.search(/[{\[]/)
  if (firstStructuralIdx > 0) {
    const before = c.slice(0, firstStructuralIdx).toLowerCase()
    if (/voici|here|below|result|output|json|réponse|response/i.test(before)) {
      c = c.slice(firstStructuralIdx)
    }
  }
  return c.trim()
}

// ---------------------------------------------------------------------------
// Truncation repair
// ---------------------------------------------------------------------------

/** Trim an incomplete trailing object from JSON arrays by tracking brace depth */
function trimIncompleteTrailingObject(json: string): string {
  let depth = 0, inStr = false, esc = false, lastCommaAtDepth1 = -1
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--
    else if (ch === ',' && depth === 1) lastCommaAtDepth1 = i
  }
  if (depth > 1 && lastCommaAtDepth1 > 0) {
    return json.slice(0, lastCommaAtDepth1)
  }
  return json
}

/** Attempt to repair truncated JSON by closing open brackets/braces */
export function repairTruncatedJson(json: string): string {
  let repaired = json.trim()
  repaired = repaired.replace(/,\s*$/, '')
  repaired = repaired.replace(/,?\s*"[^"]*":\s*"[^"]*$/, '')
  repaired = trimIncompleteTrailingObject(repaired)

  let openBraces = 0, openBrackets = 0
  let inString = false, escape = false
  for (const ch of repaired) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') openBraces++
    else if (ch === '}') openBraces--
    else if (ch === '[') openBrackets++
    else if (ch === ']') openBrackets--
  }

  if (inString) repaired += '"'
  openBrackets = Math.max(0, openBrackets)
  openBraces = Math.max(0, openBraces)
  while (openBrackets > 0) { repaired += ']'; openBrackets-- }
  while (openBraces > 0) { repaired += '}'; openBraces-- }

  return repaired
}

// ---------------------------------------------------------------------------
// Balanced brace extraction
// ---------------------------------------------------------------------------

/** Extract balanced JSON object from text — finds first '{' and its matching '}' */
export function extractBalancedJson(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse JSON from AI output — strips markdown wrappers/preambles, tries direct
 * parse, balanced extraction, then truncation repair.
 *
 * Works for all providers (Claude, Gemini, OpenRouter). Gemini and OpenRouter
 * emit more markdown wrappers and preambles than Claude, so the strip step
 * runs first.
 */
export function parseAiJson<T>(content: string): T {
  const stripped = stripMarkdownWrappers(content)

  // 1. Direct parse on stripped content
  try {
    const result = JSON.parse(stripped) as T
    log.debug('parseAiJson: direct parse succeeded', { contentChars: stripped.length })
    return result
  } catch { /* continue */ }

  // 2. Balanced extraction
  const extracted = extractBalancedJson(stripped)
  if (extracted) {
    try {
      const result = JSON.parse(extracted) as T
      log.debug('parseAiJson: balanced extraction succeeded', {
        extractedChars: extracted.length,
        originalChars: content.length,
      })
      return result
    } catch { /* continue */ }
  }

  // 3. Truncated JSON repair
  const jsonStart = stripped.indexOf('{')
  if (jsonStart >= 0) {
    const truncated = stripped.slice(jsonStart)
    const repaired = repairTruncatedJson(truncated)
    log.warn(`parseAiJson: repairing truncated JSON (${truncated.length} → ${repaired.length} chars)`)
    try {
      const result = JSON.parse(repaired) as T
      log.info('parseAiJson: repaired JSON parse succeeded', { repairedChars: repaired.length })
      return result
    } catch (err) {
      log.error('parseAiJson: repaired JSON parse failed', {
        error: (err as Error).message,
        repairedChars: repaired.length,
      })
    }
  }

  // 4. Give up — throw with preview for debugging
  const preview = stripped.slice(0, 300)
  throw new Error(`Failed to parse AI JSON response (preview: ${preview})`)
}
