<script setup lang="ts">
import RecapToggle from '@/components/shared/RecapToggle.vue'

const props = defineProps<{
  cible: string | null
  douleur: string | null
  angle: string | null
  promesse: string | null
  cta: string | null
}>()

const fields = [
  { key: 'cible', label: 'Cible' },
  { key: 'douleur', label: 'Douleur' },
  { key: 'angle', label: 'Angle' },
  { key: 'promesse', label: 'Promesse' },
  { key: 'cta', label: 'CTA' },
] as const

const visibleFields = () =>
  fields.filter(f => props[f.key])
</script>

<template>
  <RecapToggle panel-id="strategy-context" label="Contexte stratégique" class="strategy-context">
    <dl class="strategy-context-list">
      <template v-for="field in visibleFields()" :key="field.key">
        <dt class="strategy-context-label">{{ field.label }}</dt>
        <dd class="strategy-context-value">{{ props[field.key] }}</dd>
      </template>
    </dl>
  </RecapToggle>
</template>

<style scoped>
.strategy-context {
  margin-bottom: 0.75rem;
}

.strategy-context-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.375rem 0.75rem;
  margin: 0;
}

.strategy-context-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.strategy-context-value {
  font-size: 0.8125rem;
  color: var(--color-text);
  margin: 0;
  line-height: 1.4;
}
</style>
