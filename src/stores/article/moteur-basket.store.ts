import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { compareScores } from '@shared/score'
import { log } from '@/utils/logger'

export interface BasketKeyword {
  keyword: string
  source: 'discovery' | 'radar' | 'pain-translator' | 'validation' | 'exploration' | 'manual'
  addedAt: string
  reasoning?: string
  validated?: boolean
  score?: number
  /**
   * Marqué « poussé vers Radar » par panel Discovery IA. Évite double-push (grise coche).
   */
  pushedToRadar?: boolean
}

export const useMoteurBasketStore = defineStore('moteurBasket', () => {
  const keywords = ref<BasketKeyword[]>([])
  const articleId = ref<number | null>(null)

  const keywordStrings = computed(() => keywords.value.map(k => k.keyword))

  const count = computed(() => keywords.value.length)

  const isEmpty = computed(() => keywords.value.length === 0)

  const bestKeyword = computed<BasketKeyword | null>(() => {
    if (keywords.value.length === 0) return null
    // null en bas, descendant — cohérent avec affichage (CLAUDE.md §2.0)
    const sorted = [...keywords.value].sort((a, b) => compareScores(a.score ?? null, b.score ?? null))
    return sorted.find(k => k.validated) ?? sorted[0] ?? null
  })

  const validatedKeywords = computed(() => keywords.value.filter(k => k.validated))

  function setArticle(id: number | null) {
    if (id !== articleId.value) {
      log.debug('[basket] Article changed, clearing basket', { old: articleId.value, new: id })
      keywords.value = []
      articleId.value = id
    }
  }

  function addKeywords(
    newKeywords: Array<{
      keyword: string
      source: BasketKeyword['source']
      reasoning?: string
      score?: number
    }>,
  ) {
    const existing = new Set(keywords.value.map(k => k.keyword.toLowerCase()))
    let added = 0
    for (const kw of newKeywords) {
      if (!existing.has(kw.keyword.toLowerCase())) {
        existing.add(kw.keyword.toLowerCase())
        keywords.value.push({
          keyword: kw.keyword,
          source: kw.source,
          addedAt: new Date().toISOString(),
          reasoning: kw.reasoning,
          score: kw.score,
          validated: false,
        })
        added++
      }
    }
    if (added > 0) log.info(`[basket] Added ${added} keywords (total: ${keywords.value.length})`)
  }

  function removeKeyword(keyword: string) {
    keywords.value = keywords.value.filter(k => k.keyword.toLowerCase() !== keyword.toLowerCase())
  }

  function markValidated(keyword: string, score?: number) {
    const kw = keywords.value.find(k => k.keyword.toLowerCase() === keyword.toLowerCase())
    if (kw) {
      kw.validated = true
      if (score !== undefined) kw.score = score
    }
  }

  /**
   * Marque un mot-clé du basket comme poussé vers Radar.
   * Idempotent ; lower-case match.
   */
  function markPushedToRadar(keywordsToPush: string[]) {
    const set = new Set(keywordsToPush.map(k => k.toLowerCase()))
    let updated = 0
    for (const kw of keywords.value) {
      if (set.has(kw.keyword.toLowerCase()) && !kw.pushedToRadar) {
        kw.pushedToRadar = true
        updated++
      }
    }
    if (updated > 0) log.info(`[basket] Marked ${updated} keyword(s) as pushed to Radar`)
  }

  function clear() {
    keywords.value = []
  }

  function $reset() {
    keywords.value = []
    articleId.value = null
  }

  return {
    keywords,
    keywordStrings,
    count,
    isEmpty,
    bestKeyword,
    validatedKeywords,
    articleId,
    setArticle,
    addKeywords,
    removeKeyword,
    markValidated,
    markPushedToRadar,
    clear,
    $reset,
  }
})
