<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  phase: 'idle' | 'structure' | 'paa-queries' | 'paa-fetch' | 'specialises' | 'done' | 'error'
}>()

const stepperIndex = computed(() => {
  const map: Record<string, number> = {
    idle: -1, structure: 0, 'paa-queries': 1, 'paa-fetch': 1, specialises: 2, done: 3, error: -1,
  }
  return map[props.phase] ?? -1
})
</script>

<template>
  <div v-if="phase !== 'idle'" class="generation-stepper" data-testid="generation-stepper">
    <div class="stepper-step" :class="{ active: phase === 'structure', done: stepperIndex > 0 }">
      <span class="stepper-dot" />
      <span>Structure (Pilier + Inter)</span>
    </div>
    <div class="stepper-step" :class="{ active: ['paa-queries', 'paa-fetch'].includes(phase), done: stepperIndex > 1 }">
      <span class="stepper-dot" />
      <span>Recherche PAA</span>
    </div>
    <div class="stepper-step" :class="{ active: phase === 'specialises', done: stepperIndex > 2 }">
      <span class="stepper-dot" />
      <span>Articles Spécialisés</span>
    </div>
  </div>
</template>

<style scoped>
.generation-stepper {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  background: var(--color-surface-alt, #f8f9fa);
  font-size: 0.8125rem;
}

.stepper-step {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-muted, #8b8fa3);
  transition: color 0.2s;
}

.stepper-step.active {
  color: var(--color-warning, #f59e0b);
  font-weight: 600;
}

.stepper-step.done {
  color: var(--color-success, #22c55e);
}

.stepper-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted, #8b8fa3);
  transition: background 0.2s, box-shadow 0.2s;
}

.stepper-step.active .stepper-dot {
  background: var(--color-warning, #f59e0b);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  animation: stepper-pulse 1.5s infinite;
}

.stepper-step.done .stepper-dot {
  background: var(--color-success, #22c55e);
}

@keyframes stepper-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.1); }
}
</style>
