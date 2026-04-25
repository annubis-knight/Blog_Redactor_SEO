<script setup lang="ts">
import type { CpcFilter } from './cpc-filter-types'
/**
 * Sprint 2.5 — Two mutually-exclusive toggle buttons ("Avec CPC" / "Sans CPC").
 * Exposes a v-model with three possible values: null (no filter), 'with', 'without'.
 *
 * Rule: pressing the active button returns to null — you can never have both
 * active at the same time.
 *
 * Usage:
 *   <CpcFilterToggle v-model="cpcFilter" />
 *   // then: cards.filter(c => matchesCpcFilter(c.kpis.cpc, cpcFilter))
 */

const model = defineModel<CpcFilter>({ default: null })

function toggle(value: 'with' | 'without') {
  model.value = model.value === value ? null : value
}
</script>

<template>
  <div class="cpc-filter" role="group" aria-label="Filtre CPC">
    <button
      type="button"
      class="cpc-btn"
      :class="{ 'cpc-btn--active': model === 'with' }"
      :aria-pressed="model === 'with'"
      @click="toggle('with')"
    >Avec CPC</button>
    <button
      type="button"
      class="cpc-btn"
      :class="{ 'cpc-btn--active': model === 'without' }"
      :aria-pressed="model === 'without'"
      @click="toggle('without')"
    >Sans CPC</button>
  </div>
</template>

<style scoped>
.cpc-filter {
  display: inline-flex;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 0.75rem;
}
.cpc-btn {
  padding: 0.25rem 0.625rem;
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.12s;
}
.cpc-btn + .cpc-btn { border-left: 1px solid var(--color-border); }
.cpc-btn:hover:not(.cpc-btn--active) {
  background: var(--color-background);
  color: var(--color-text);
}
.cpc-btn--active {
  background: var(--color-primary, #3b82f6);
  color: white;
}
</style>
