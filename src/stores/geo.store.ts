import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import type { GeoScore } from '@shared/types/geo.types.js'
import { calculateGeoScore } from '@/utils/geo-calculator'
import { GEO_SCORE_LEVELS } from '@shared/constants/geo.constants.js'

export const useGeoStore = defineStore('geo', () => {
  const score = ref<GeoScore | null>(null)
  const isCalculating = ref(false)

  const scoreLevel = computed<'good' | 'fair' | 'poor' | null>(() => {
    if (!score.value) return null
    if (score.value.global >= GEO_SCORE_LEVELS.good) return 'good'
    if (score.value.global >= GEO_SCORE_LEVELS.fair) return 'fair'
    return 'poor'
  })

  const hasIssues = computed(() => {
    if (!score.value) return false
    return score.value.questionHeadings.percentage < 70 ||
      !score.value.sourcedStats.inTarget ||
      score.value.answerCapsules.some(c => !c.hasAnswerCapsule)
  })

  function recalculate(content: string) {
    isCalculating.value = true
    log.debug(`[geo] recalculate (content length: ${content.length})`)
    score.value = calculateGeoScore(content)
    log.debug(`[geo] score: ${score.value?.global}`)
    isCalculating.value = false
  }

  function reset() {
    score.value = null
    isCalculating.value = false
  }

  return { score, isCalculating, scoreLevel, hasIssues, recalculate, reset }
})
