<script setup lang="ts">
import { ref } from 'vue'
import { useGeoStore } from '@/stores/geo.store'
import ParagraphsCard from './ParagraphsCard.vue'
import JargonCard from './JargonCard.vue'

const geoStore = useGeoStore()

const openCard = ref<string | null>('paragraphs')

function toggleCard(id: string) {
  openCard.value = openCard.value === id ? null : id
}
</script>

<template>
  <div class="readability-tab">
    <ParagraphsCard
      :score="geoStore.score"
      :is-open="openCard === 'paragraphs'"
      @toggle="toggleCard('paragraphs')"
    />
    <JargonCard
      :score="geoStore.score"
      :is-open="openCard === 'jargon'"
      @toggle="toggleCard('jargon')"
    />
  </div>
</template>

<style scoped>
.readability-tab {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
