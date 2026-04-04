<script setup lang="ts">
import KpiItem from '@/components/shared/KpiItem.vue'

defineProps<{
  kpis: Array<{ name: string; value: string | number; color?: string; label?: string }>
}>()
</script>

<template>
  <div class="kpi-row">
    <template v-for="(kpi, i) in kpis" :key="kpi.name">
      <KpiItem :label="kpi.label ?? kpi.name" :value="kpi.value" :color="kpi.color" />
      <span v-if="i < kpis.length - 1" class="kpi-sep">&middot;</span>
    </template>
  </div>
</template>

<style scoped>
.kpi-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.kpi-sep {
  font-size: 1rem;
  color: var(--color-border, #e2e8f0);
  user-select: none;
}
</style>
