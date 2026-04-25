<script setup lang="ts">
import { computed } from 'vue'
import RadarCardLockable from '@/components/intent/RadarCardLockable.vue'
import { useKeywordModifiersStore } from '@/stores/article/keyword-modifiers.store'
import type { CarouselEntry } from '@/composables/keyword/useRadarCarousel'
import type { ArticleLevel } from '@shared/types/keyword-validate.types'

const props = defineProps<{
  entry: CarouselEntry
  lockedKeyword: string | null
  articleLevel?: ArticleLevel
  articleId?: number | null
}>()

const modifiersStore = useKeywordModifiersStore()

const keywordModifiers = computed(() =>
  modifiersStore.getEffective(props.articleId ?? null, props.entry.card.keyword),
)

function handleModifierUntag(index: number) {
  modifiersStore.setModifier(props.articleId ?? null, props.entry.card.keyword, index, null)
}

function handleModifierCycle(payload: { index: number; next: 'local' | 'persona' | null }) {
  modifiersStore.setModifier(props.articleId ?? null, props.entry.card.keyword, payload.index, payload.next)
}

const emit = defineEmits<{
  'lock': []
  'unlock': []
  'word-toggle': [activeIndices: number[]]
}>()

const currentWords = computed(() => {
  return props.entry.originalCard.keyword.trim().split(/\s+/)
})

const interactiveWordsProps = computed(() => {
  if (props.entry.rootVariants.size === 0 && !props.entry.isLoadingRoots) return undefined
  return {
    words: currentWords.value,
    activeIndices: props.entry.activeWordIndices,
    loading: props.entry.isLoadingRoots,
  }
})

const isLocked = computed(() => {
  return props.entry.card.keyword === props.lockedKeyword
})

const isValidatingVariant = computed(() => props.entry.pendingVariants.size > 0)

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
      :validating="isValidatingVariant"
      display-mode="relevance"
      :article-level="articleLevel"
      :modifiers="keywordModifiers"
      data-testid="carousel-radar-lockable"
      @update:locked="handleLockedUpdate"
      @word-toggle="$emit('word-toggle', $event)"
      @modifier-untag="handleModifierUntag"
      @modifier-cycle="handleModifierCycle"
    />
  </div>
</template>

<style scoped>
.radar-card-section {
  margin-top: 1.25rem;
}
</style>
