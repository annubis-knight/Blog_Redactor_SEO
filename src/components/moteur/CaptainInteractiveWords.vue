<script setup lang="ts">
import { computed } from 'vue'
import { FRENCH_STOPWORDS } from '@/constants/french-nlp'
import RadarCardLockable from '@/components/intent/RadarCardLockable.vue'
import type { CarouselEntry } from '@/composables/keyword/useRadarCarousel'

const props = defineProps<{
  entry: CarouselEntry
  lockedKeyword: string | null
}>()

const emit = defineEmits<{
  'lock': []
  'unlock': []
  'word-toggle': [activeCount: number]
}>()

const currentWords = computed(() => {
  return props.entry.originalCard.keyword.trim().split(/\s+/)
})

const minActiveCount = computed(() => {
  const words = currentWords.value
  let count = 0
  let significant = 0
  for (const w of words) {
    count++
    if (!FRENCH_STOPWORDS.has(w.toLowerCase())) significant++
    if (significant >= 2) return count
  }
  return words.length
})

const interactiveWordsProps = computed(() => {
  if (props.entry.rootVariants.size === 0 && !props.entry.isLoadingRoots) return undefined
  return {
    words: currentWords.value,
    activeCount: props.entry.activeWordCount,
    minActiveCount: minActiveCount.value,
    loading: props.entry.isLoadingRoots,
  }
})

const isLocked = computed(() => {
  return props.entry.card.keyword === props.lockedKeyword
})

function handleLockedUpdate(val: boolean) {
  if (val) emit('lock')
  else emit('unlock')
}
</script>

<template>
  <div class="radar-card-section">
    <RadarCardLockable
      :card="entry.card"
      :locked="isLocked"
      :interactive-words="interactiveWordsProps"
      data-testid="carousel-radar-lockable"
      @update:locked="handleLockedUpdate"
      @word-toggle="$emit('word-toggle', $event)"
    />
  </div>
</template>

<style scoped>
.radar-card-section {
  margin-top: 1.25rem;
}
</style>
