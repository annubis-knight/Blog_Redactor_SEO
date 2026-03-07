<script setup lang="ts">
import type { Cocoon } from '@shared/types/index.js'
import CocoonCard from './CocoonCard.vue'

defineProps<{
  cocoons: Cocoon[]
}>()
</script>

<template>
  <div class="cocoon-list">
    <CocoonCard v-for="cocoon in cocoons" :key="cocoon.id" :cocoon="cocoon" />
  </div>
</template>

<style scoped>
.cocoon-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
}
</style>
