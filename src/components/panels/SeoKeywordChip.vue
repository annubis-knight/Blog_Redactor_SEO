<script setup lang="ts">
import type { ChecklistLocation } from '@shared/types/seo.types.js'

const props = withDefaults(defineProps<{
  keyword: string
  detected: boolean
  mode: 'presence' | 'counter'
  locations?: ChecklistLocation[]
  occurrences?: number
  recommended?: number
}>(), {
  locations: () => [],
  occurrences: 0,
  recommended: 1,
})

const LOCATION_LABELS: Record<ChecklistLocation, string> = {
  metaTitle: 'Meta',
  h1: 'H1',
  intro: 'Intro',
  metaDescription: 'Desc',
  h2: 'H2',
  conclusion: 'Concl.',
  slug: 'URL',
  imageAlt: 'Alt',
}
</script>

<template>
  <span
    class="seo-chip"
    :class="{ detected }"
    :title="detected ? `Détecté${mode === 'presence' && locations.length ? ` dans : ${locations.map(l => LOCATION_LABELS[l]).join(', ')}` : ''}` : 'Non détecté'"
  >
    <span class="chip-keyword">{{ keyword }}</span>
    <template v-if="mode === 'presence' && detected && locations.length">
      <span
        v-for="loc in locations"
        :key="loc"
        class="chip-location"
      >{{ LOCATION_LABELS[loc] }}</span>
    </template>
    <template v-if="mode === 'counter'">
      <span class="chip-counter">{{ occurrences }}/{{ recommended }}</span>
    </template>
  </span>
</template>

<style scoped>
.seo-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.6875rem;
  background: var(--color-border, #e5e7eb);
  color: var(--color-text-muted, #6b7280);
  line-height: 1.4;
}

.seo-chip.detected {
  background: var(--color-badge-green-bg, #d1fae5);
  color: var(--color-badge-green-text, #065f46);
}

.chip-keyword {
  font-weight: 500;
}

.chip-location {
  font-size: 0.5625rem;
  font-weight: 600;
  padding: 0 0.1875rem;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.08);
  line-height: 1.3;
}

.seo-chip.detected .chip-location {
  background: rgba(6, 95, 70, 0.12);
}

.chip-counter {
  font-size: 0.625rem;
  font-weight: 600;
  opacity: 0.75;
}
</style>
