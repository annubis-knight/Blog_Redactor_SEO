import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import type { SeoScore } from '@shared/types/seo.types.js'
import type { Keyword, ArticleKeywords } from '@shared/types/index.js'
import type { RelatedKeyword } from '@shared/types/dataforseo.types.js'
import { calculateSeoScore } from '@/utils/seo-calculator'
import { SEO_SCORE_LEVELS } from '@shared/constants/seo.constants.js'
import { useEditorStore } from '@/stores/editor.store'

export const useSeoStore = defineStore('seo', () => {
  const score = ref<SeoScore | null>(null)
  const isCalculating = ref(false)

  // SSOT wordCount — delegates to editorStore (finding G5).
  // Use this for the word-count-bar and reduce/humanize delta.
  const wordCount = computed(() => useEditorStore().wordCount)

  const scoreLevel = computed<'good' | 'fair' | 'poor' | null>(() => {
    if (!score.value) return null
    if (score.value.global >= SEO_SCORE_LEVELS.good) return 'good'
    if (score.value.global >= SEO_SCORE_LEVELS.fair) return 'fair'
    return 'poor'
  })

  const hasIssues = computed(() => {
    if (!score.value) return false
    return !score.value.headingValidation.isValid ||
      score.value.keywordDensities.some(d => !d.inTarget) ||
      !score.value.metaAnalysis.titleInRange ||
      !score.value.metaAnalysis.descriptionInRange
  })

  function recalculate(
    content: string,
    keywords: Keyword[],
    metaTitle: string | null,
    metaDescription: string | null,
    contentLengthTarget?: number,
    relatedKeywords?: RelatedKeyword[],
    articleKeywords?: ArticleKeywords | null,
    articleId?: number,
  ) {
    isCalculating.value = true
    log.debug(`[seo] recalculate`, {
      keywords: keywords.length,
      contentLen: content.length,
      metaTitle: metaTitle ? `${metaTitle.length}ch` : 'null',
      metaDesc: metaDescription ? `${metaDescription.length}ch` : 'null',
      articleKeywords: articleKeywords ? `cap=${articleKeywords.capitaine}, lt=${articleKeywords.lieutenants.length}` : 'null',
    })
    score.value = calculateSeoScore(content, keywords, metaTitle, metaDescription, contentLengthTarget, relatedKeywords, articleKeywords ?? undefined, articleId != null ? String(articleId) : undefined)
    log.info(`[seo] score: ${score.value?.global}`, {
      wordCount: score.value?.wordCount,
      densities: score.value?.keywordDensities.map(d => `${d.keyword}:${d.occurrences}x`).join(', '),
      checklist: score.value?.checklistItems.map(c => `${c.location}:${c.isPresent}`).join(', '),
    })
    isCalculating.value = false
  }

  function reset() {
    score.value = null
    isCalculating.value = false
  }

  return { score, isCalculating, scoreLevel, hasIssues, wordCount, recalculate, reset }
})
