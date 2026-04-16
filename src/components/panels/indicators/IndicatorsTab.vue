<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSeoStore } from '@/stores/article/seo.store'
import { useEditorStore } from '@/stores/article/editor.store'
import type { CannibalizationWarning } from '@shared/types/seo.types.js'
import StructureCard from './StructureCard.vue'
import DensityCard from './DensityCard.vue'
import MetaCard from './MetaCard.vue'
import AlertsCard from './AlertsCard.vue'

const props = defineProps<{
  cannibalizationWarnings: CannibalizationWarning[]
  contentLengthTarget: number
}>()

const seoStore = useSeoStore()
const editorStore = useEditorStore()

// Accordion: only one card open at a time
const openCard = ref<string | null>('meta')

function toggleCard(id: string) {
  openCard.value = openCard.value === id ? null : id
}

// Auto-open Alerts card when alerts appear
const alertCount = computed(() => {
  if (!seoStore.score) return 0
  let count = props.cannibalizationWarnings.length
  for (const d of seoStore.score.keywordDensities) {
    if (d.density > d.target.max) count++
    if (d.type === 'Pilier' && d.density < d.target.min && d.density > 0) count++
  }
  if (seoStore.score.metaAnalysis.titleLength === 0) count++
  if (seoStore.score.metaAnalysis.descriptionLength === 0) count++
  if (seoStore.score.imageAnalysis.total > 0) {
    if (seoStore.score.imageAnalysis.total - seoStore.score.imageAnalysis.withAlt > 0) count++
    if (seoStore.score.imageAnalysis.withKeywordInAlt === 0) count++
  }
  if (!seoStore.score.hasArticleKeywords) count++
  return count
})

watch(alertCount, (count) => {
  if (count > 0 && openCard.value === null) {
    openCard.value = 'alerts'
  }
})
</script>

<template>
  <div class="indicators-tab">
    <MetaCard
      :score="seoStore.score"
      :meta-title="editorStore.metaTitle"
      :meta-description="editorStore.metaDescription"
      :is-open="openCard === 'meta'"
      @toggle="toggleCard('meta')"
    />
    <StructureCard
      :score="seoStore.score"
      :content-length-target="contentLengthTarget"
      :is-open="openCard === 'structure'"
      @toggle="toggleCard('structure')"
    />
    <DensityCard
      :score="seoStore.score"
      :is-open="openCard === 'density'"
      @toggle="toggleCard('density')"
    />
    <AlertsCard
      :score="seoStore.score"
      :cannibalization-warnings="cannibalizationWarnings"
      :is-open="openCard === 'alerts'"
      @toggle="toggleCard('alerts')"
    />
  </div>
</template>

<style scoped>
.indicators-tab {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
