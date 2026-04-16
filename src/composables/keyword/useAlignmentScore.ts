import type { StrategyContextData } from '@shared/types/index.js'

export interface AlignmentResult {
  score: number
  level: 'fort' | 'moyen' | 'faible' | 'aucun'
  matchedTerms: string[]
}

const EMPTY: AlignmentResult = { score: 0, level: 'aucun', matchedTerms: [] }

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter(t => t.length > 2)
}

export function computeAlignmentScore(
  keyword: string,
  ctx: StrategyContextData,
): AlignmentResult {
  const refParts = [ctx.cible, ctx.douleur, ctx.angle].filter(Boolean) as string[]
  if (refParts.length === 0) return EMPTY

  const kwNorm = normalize(keyword)
  const kwTokens = tokenize(keyword)
  if (kwTokens.length === 0) return EMPTY

  const refText = normalize(refParts.join(' '))
  const refTokens = new Set(tokenize(refParts.join(' ')))

  // Full keyword contained in reference text
  if (refText.includes(kwNorm)) {
    return { score: 80, level: 'fort', matchedTerms: [kwNorm] }
  }

  // Exact token matching
  const matched: string[] = []
  for (const token of kwTokens) {
    if (refTokens.has(token)) {
      matched.push(token)
    }
  }

  // Partial substring matching for remaining tokens
  if (matched.length === 0) {
    for (const token of kwTokens) {
      if (refText.includes(token)) {
        matched.push(token)
      }
    }
  }

  if (matched.length === 0) return EMPTY

  const ratio = matched.length / kwTokens.length
  const score = Math.min(Math.round(ratio * 100), 100)
  const level = score >= 60 ? 'fort' : score >= 30 ? 'moyen' : 'faible'

  return { score, level, matchedTerms: [...new Set(matched)] }
}
