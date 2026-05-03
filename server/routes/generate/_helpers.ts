import { USAGE_SENTINEL } from '../../services/external/ai-provider.service.js'
import type { ApiUsage } from '../../services/external/claude.service.js'
import type { ArticleStrategy, ArticleKeywords, Outline, OutlineSection } from '../../../shared/types/index.js'

/** Detect if an error is a 429 rate-limit error from the Anthropic API */
export function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status === 429
  }
  return err instanceof Error && err.message.startsWith('429')
}

/** Extract retry-after seconds from an Anthropic SDK error, or return a default */
export function getRetryAfterSeconds(err: unknown, defaultSeconds: number): number {
  if (err && typeof err === 'object' && 'headers' in err) {
    const headers = (err as { headers: Record<string, string> }).headers
    const retryAfter = headers?.['retry-after']
    if (retryAfter) {
      const parsed = Number(retryAfter)
      if (!isNaN(parsed) && parsed > 0) return Math.ceil(parsed)
    }
  }
  return defaultSeconds
}

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Max retry attempts specifically for rate limit errors */
export const RATE_LIMIT_MAX_RETRIES = 4
/** Default wait time on first 429 (seconds) */
export const RATE_LIMIT_DEFAULT_WAIT = 60
/** Delay between sections to proactively avoid rate limits (ms). Set INTER_SECTION_DELAY=0 in env to disable (tests). */
export const INTER_SECTION_DELAY_MS = Number(process.env.INTER_SECTION_DELAY ?? 15_000)

/** Consume the async generator, separating content chunks from the usage sentinel */
export async function consumeStream(
  gen: AsyncGenerator<string>,
  onChunk: (chunk: string) => void,
): Promise<{ fullContent: string; usage: ApiUsage | null; chunkCount: number }> {
  let fullContent = ''
  let usage: ApiUsage | null = null
  let chunkCount = 0
  for await (const chunk of gen) {
    if (chunk.startsWith(USAGE_SENTINEL)) {
      usage = JSON.parse(chunk.slice(USAGE_SENTINEL.length)) as ApiUsage
    } else {
      chunkCount++
      fullContent += chunk
      onChunk(chunk)
    }
  }
  return { fullContent, usage, chunkCount }
}

/** Build a markdown strategy context block for prompt injection */
export function buildStrategyContext(strategy: ArticleStrategy | null): string {
  if (!strategy || strategy.completedSteps === 0) return ''

  const parts: string[] = ['## Contexte stratégique (Brain-First)\n']

  if (strategy.cible.validated) {
    parts.push(`- **Cible** : ${strategy.cible.validated}`)
  }
  if (strategy.douleur.validated) {
    parts.push(`- **Douleur adressée** : ${strategy.douleur.validated}`)
  }
  if (strategy.angle.validated) {
    parts.push(`- **Angle différenciateur** : ${strategy.angle.validated}`)
  }
  if (strategy.promesse.validated) {
    parts.push(`- **Promesse au lecteur** : ${strategy.promesse.validated}`)
  }
  if (strategy.cta.target) {
    parts.push(`- **CTA** : ${strategy.cta.type} — ${strategy.cta.target}`)
  }

  if (parts.length === 1) return '' // Only the header, no actual data

  parts.push('')
  parts.push('Utilise la douleur comme fil rouge du raisonnement. L\'angle différenciateur doit orienter tes arguments. Le CTA, s\'il est défini, doit être amené naturellement en conclusion.')

  return parts.join('\n')
}

/** Build a markdown keyword context block for prompt injection */
export function buildKeywordContext(articleKeywords: ArticleKeywords | null): string {
  if (!articleKeywords?.capitaine) return ''

  const parts: string[] = ['## Mots-clés par article (Capitaine/Lieutenants/Lexique)\n']
  parts.push(`- **Capitaine** (H1, Title, URL, intro) : ${articleKeywords.capitaine}`)

  if (articleKeywords.lieutenants.length > 0) {
    parts.push(`- **Lieutenants** (H2, H3) : ${articleKeywords.lieutenants.join(', ')}`)
  }

  if (articleKeywords.lexique.length > 0) {
    parts.push(`- **Lexique sémantique** (corps de texte) : ${articleKeywords.lexique.join(', ')}`)
  }

  parts.push('')
  parts.push('Place le Capitaine dans les zones chaudes (H1, intro, conclusion, Title). Répartis les Lieutenants dans les H2/H3. Intègre les termes du Lexique naturellement dans le corps de texte.')

  return parts.join('\n')
}

/** Parse an Outline JSON from Claude's text response (may contain markdown fences) */
export function parseOutlineFromText(text: string): Outline {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as Outline
  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid outline format: missing sections array')
  }
  return parsed
}

/** Split an outline into section groups (one H2 + its H3 children per group) */
export interface SectionGroup {
  title: string
  position: 'intro' | 'middle' | 'conclusion'
  sections: OutlineSection[]
}

export function splitOutlineIntoGroups(outline: Outline): SectionGroup[] {
  const groups: SectionGroup[] = []
  let currentGroup: OutlineSection[] = []
  let currentTitle = ''

  for (const section of outline.sections) {
    if (section.level === 1) continue // skip H1
    if (section.level === 2) {
      // Flush previous group
      if (currentGroup.length > 0) {
        groups.push({ title: currentTitle, position: 'middle', sections: currentGroup })
      }
      currentGroup = [section]
      currentTitle = section.title
    } else {
      // H3 — add to current group
      currentGroup.push(section)
    }
  }
  // Flush last group
  if (currentGroup.length > 0) {
    groups.push({ title: currentTitle, position: 'middle', sections: currentGroup })
  }

  // Tag first as intro, last as conclusion
  if (groups.length > 0) groups[0]!.position = 'intro'
  if (groups.length > 1) groups[groups.length - 1]!.position = 'conclusion'

  return groups
}

/** Format a section group into a readable outline for the prompt */
export function formatSectionOutline(group: SectionGroup): string {
  return group.sections.map(s => {
    const tag = s.level === 2 ? 'H2' : 'H3'
    const ann = s.annotation ? ` [annotation: ${s.annotation}]` : ''
    return `- ${tag}: ${s.title}${ann}`
  }).join('\n')
}

/** Format the full outline for prompt context */
export function formatFullOutline(outline: Outline): string {
  return outline.sections.map(s => {
    const tag = s.level === 1 ? 'H1' : s.level === 2 ? 'H2' : 'H3'
    return `- ${tag}: ${s.title}`
  }).join('\n')
}

/** Get position-specific directives for the prompt */
export function getPositionDirectives(position: 'intro' | 'middle' | 'conclusion', keyword: string, articleTitle?: string): string {
  if (position === 'intro') {
    return `## Directives spécifiques (Introduction)

- Commence OBLIGATOIREMENT par le titre H1 de l'article : \`<h1>${articleTitle}</h1>\`.
- Ensuite, enchaîne avec des balises \`<p>\` (PAS de \`<h2>\` si le sommaire ne prévoit pas de H2 Intro).
- Place le mot-clé pilier « ${keyword} » dans l'introduction.
- Accroche le lecteur dès la première phrase — pose le problème ou le contexte sans détour.
- Présente brièvement ce que l'article va couvrir.`
  }
  if (position === 'conclusion') {
    return `## Directives spécifiques (Conclusion)

- Réintègre le mot-clé pilier « ${keyword} ».
- Récapitule les points clés de l'article en 3-5 bullet points.
- Propose des étapes concrètes et actionnables.
- Termine par un CTA clair si le contexte stratégique en définit un.`
  }
  return ''
}

/** Strip markdown code fences (```html ... ```) that Claude wraps around HTML output */
export function stripCodeFences(text: string): string {
  return text.replace(/^```\w*\n?/gm, '').replace(/\n?```$/gm, '').trim()
}

/**
 * Repair unclosed HTML tags at the end of generated section content.
 * Handles truncation patterns like `</p<h2>`, `</h<h2>`, or content
 * ending mid-tag when the model hits its token limit.
 */
export function repairHtmlTail(html: string): string {
  let result = html.trim()

  // Fix truncated closing tags fused with the next opening tag: `</p<h2>` → `</p>`
  // or `</h<h2>` → nothing (orphaned fragment, just remove it)
  result = result.replace(/<\/[a-z]*<[^>]*>$/i, '')

  // Remove any trailing incomplete tag: `<h2`, `</p`, `<div class="fo`
  result = result.replace(/<[^>]*$/i, '')

  // Collect open tags and close any that remain unclosed
  const openTags: string[] = []
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(result)) !== null) {
    const full = match[0]
    const tag = match[1]!.toLowerCase()
    const voidTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'source']
    if (voidTags.includes(tag) || full.endsWith('/>')) continue
    if (full.startsWith('</')) {
      // closing tag — pop the last matching open tag
      const idx = openTags.lastIndexOf(tag)
      if (idx !== -1) openTags.splice(idx, 1)
    } else {
      openTags.push(tag)
    }
  }

  // Close remaining open tags in reverse order
  for (let i = openTags.length - 1; i >= 0; i--) {
    result += `</${openTags[i]}>`
  }

  return result
}

/** Aggregate usage from multiple API calls */
export function aggregateUsage(total: ApiUsage, section: ApiUsage | null): void {
  if (!section) return
  total.inputTokens += section.inputTokens
  total.outputTokens += section.outputTokens
  total.cacheReadTokens += section.cacheReadTokens
  total.cacheCreationTokens += section.cacheCreationTokens
  total.estimatedCost += section.estimatedCost
}

/** Default target word counts per article type (used as fallback when client/microCtx don't provide one) */
export const DEFAULT_TARGET_WORDS_BY_TYPE: Record<'Pilier' | 'Intermédiaire' | 'Spécialisé', number> = {
  'Pilier': 2500,
  'Intermédiaire': 1800,
  'Spécialisé': 1200,
}
export const DEFAULT_TARGET_WORDS_FALLBACK = 2000

/**
 * Compute the word budget + max_tokens for a given section group.
 * Repartition is 15/75/10 for intro/corps/conclusion, with F6 guards for
 * articles with 1 or 2 groups only.
 */
export function computeSectionBudget(
  group: SectionGroup,
  groupIndex: number,
  totalGroups: number,
  targetWordCount: number,
): { role: 'introduction' | 'corps' | 'conclusion'; budget: number; hint: string; maxTokens: number } {
  let role: 'introduction' | 'corps' | 'conclusion'
  let budget: number

  if (totalGroups === 1) {
    // Single group handles the whole article
    role = 'corps'
    budget = targetWordCount
  } else if (totalGroups === 2) {
    // No middle, split 40/60 between intro and conclusion
    if (groupIndex === 0) {
      role = 'introduction'
      budget = Math.ceil(targetWordCount * 0.4)
    } else {
      role = 'conclusion'
      budget = Math.ceil(targetWordCount * 0.6)
    }
  } else {
    // Standard 15/75/10 with nbMiddleGroups = totalGroups - 2
    const nbMiddleGroups = totalGroups - 2
    if (groupIndex === 0) {
      role = 'introduction'
      budget = Math.ceil(targetWordCount * 0.15)
    } else if (groupIndex === totalGroups - 1) {
      role = 'conclusion'
      budget = Math.ceil(targetWordCount * 0.10)
    } else {
      role = 'corps'
      budget = Math.ceil((targetWordCount * 0.75) / nbMiddleGroups)
    }
  }

  const ratio = Math.round((budget / targetWordCount) * 100)
  const hint = `~${budget} mots, soit ~${ratio}% du budget total`

  // max_tokens: ~4 tokens/word for HTML output (tags, attributes, structured lists consume ~60% of tokens).
  // Clamped [2048, 8192] — 2048 minimum so even small sections aren't truncated.
  const maxTokens = Math.min(8192, Math.max(2048, Math.ceil(budget * 4)))

  return { role, budget, hint, maxTokens }
}

/** Build micro-context block from article data */
export function buildMicroContextBlock(microCtx: { angle?: string; tone?: string; directives?: string; targetWordCount?: number } | null): string {
  if (!microCtx || !microCtx.angle) return ''
  const lines = ['## Micro-contexte article']
  lines.push(`- Angle: ${microCtx.angle}`)
  lines.push(`- Ton: ${microCtx.tone || 'non spécifié'}`)
  lines.push(`- Consignes: ${microCtx.directives || 'aucune'}`)
  if (microCtx.targetWordCount) {
    lines.push(`- Nombre de mots cible: ${microCtx.targetWordCount}`)
  }
  lines.push('')
  return lines.join('\n')
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

export const REINFORCEMENT_BLOCK = `## IMPORTANT — Retry

Tu as altéré la structure HTML à la tentative précédente. Reprends la section en préservant EXACTEMENT les mêmes balises dans le même ordre ET tous les attributs \`href\`, \`class\`, \`id\`, \`rel\`, \`target\` et \`data-*\`. Ne modifie QUE le texte des nœuds texte. Ne supprime aucun \`<p>\`, \`<ul>\`, \`<li>\`, \`<strong>\`, \`<a>\` ni aucun bloc. Ne fusionne pas, ne splitte pas, ne remplace aucune balise.
`
