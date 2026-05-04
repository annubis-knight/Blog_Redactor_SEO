<script setup lang="ts">
/**
 * Vague 5 — Sous-composant Vue extrait de ArticleWorkflowView.
 *
 * Affiche les badges de coût API pour les 4 phases de génération
 * (Article / Meta / Réduction / Humanisation). Affiche le wrapper
 * `cost-badges` uniquement si au moins un usage est défini.
 */
import ApiCostBadge from '@/components/shared/ApiCostBadge.vue'
import type { ApiUsage } from '@shared/types/index.js'

defineProps<{
  articleUsage: ApiUsage | null
  metaUsage: ApiUsage | null
  reduceUsage: ApiUsage | null
  humanizeUsage: ApiUsage | null
}>()
</script>

<template>
  <div v-if="articleUsage || metaUsage || reduceUsage || humanizeUsage" class="cost-badges">
    <ApiCostBadge v-if="articleUsage" label="Article" :usage="articleUsage" />
    <ApiCostBadge v-if="metaUsage" label="Meta" :usage="metaUsage" />
    <ApiCostBadge v-if="reduceUsage" label="Réduction" :usage="reduceUsage" />
    <ApiCostBadge v-if="humanizeUsage" label="Humanisation" :usage="humanizeUsage" />
  </div>
</template>

<style scoped>
.cost-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
</style>
