import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'

export interface BasketKeyword {
  keyword: string
  source: 'discovery' | 'radar' | 'pain-translator' | 'validation' | 'exploration' | 'manual'
  addedAt: string
  reasoning?: string
  validated?: boolean
  score?: number
}

export const useMoteurBasketStore = defineStore('moteurBasket', () => {
  const keywords = ref<BasketKeyword[]>([])
  const articleId = ref<number | null>(null)

  const keywordStrings = computed(() => keywords.value.map(k => k.keyword))

  const count = computed(() => keywords.value.length)

  const isEmpty = computed(() => keywords.value.length === 0)

  const bestKeyword = computed<BasketKeyword | null>(() => {
    if (keywords.value.length === 0) return null
    const sorted = [...keywords.value].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
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
    clear,
    $reset,
  }
})
