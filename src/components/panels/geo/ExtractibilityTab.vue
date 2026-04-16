<script setup lang="ts">
import { ref } from 'vue'
import { useGeoStore } from '@/stores/geo.store'
import QuestionsCard from './QuestionsCard.vue'
import CapsulesCard from './CapsulesCard.vue'
import StatsCard from './StatsCard.vue'

const geoStore = useGeoStore()

const openCard = ref<string | null>('questions')

function toggleCard(id: string) {
  openCard.value = openCard.value === id ? null : id
}
</script>

<template>
  <div class="extractibility-tab">
    <QuestionsCard
      :score="geoStore.score"
      :is-open="openCard === 'questions'"
      @toggle="toggleCard('questions')"
    />
    <CapsulesCard
      :score="geoStore.score"
      :is-open="openCard === 'capsules'"
      @toggle="toggleCard('capsules')"
    />
    <StatsCard
      :score="geoStore.score"
      :is-open="openCard === 'stats'"
      @toggle="toggleCard('stats')"
    />
  </div>
</template>

<style scoped>
.extractibility-tab {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
