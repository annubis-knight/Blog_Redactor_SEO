<script setup lang="ts">
/**
 * 2026-05-02 — Barre de tri unifiée pour les conteneurs de cards du Moteur
 * (Radar, Capitaine, Lieutenants, Lexique).
 *
 * Affiche une suite de chips cliquables (A-Z, Score, Densité, …). Chaque chip
 * a 3 états visuels selon `modelValue.direction` : neutral / desc / asc.
 * Cycle au clic : neutral → desc → asc → neutral.
 *
 * Le slot `#filters` permet d'insérer des contrôles de filtre dans la même
 * barre (ex: filtre CPC du Radar) pour cohérence visuelle.
 */
import type { SortState, SortOption } from '@/composables/moteur/useSortableList'

defineProps<{
  options: SortOption[]
  modelValue: SortState
  /** Compteur affiché en label gauche (ex: "5 / 12 cartes"). */
  countLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [state: SortState]
}>()

function cycle(key: string, current: SortState) {
  if (current.key !== key) {
    emit('update:modelValue', { key, direction: 'desc' })
    return
  }
  const next = current.direction === 'desc' ? 'asc'
    : current.direction === 'asc' ? 'neutral'
    : 'desc'
  emit('update:modelValue', { key: next === 'neutral' ? null : key, direction: next })
}

function ariaSort(option: SortOption, state: SortState): 'ascending' | 'descending' | 'none' {
  if (state.key !== option.key) return 'none'
  return state.direction === 'asc' ? 'ascending' : state.direction === 'desc' ? 'descending' : 'none'
}
</script>

<template>
  <div class="stb" data-testid="sort-toggle-bar">
    <span v-if="countLabel" class="stb__count">{{ countLabel }}</span>

    <div class="stb__chips" role="group" aria-label="Trier la liste">
      <button
        v-for="opt in options"
        :key="opt.key"
        type="button"
        class="stb__chip"
        :class="{
          'stb__chip--active': modelValue.key === opt.key,
          'stb__chip--desc': modelValue.key === opt.key && modelValue.direction === 'desc',
          'stb__chip--asc': modelValue.key === opt.key && modelValue.direction === 'asc',
        }"
        :aria-sort="ariaSort(opt, modelValue)"
        :data-testid="`stb-chip-${opt.key}`"
        @click="cycle(opt.key, modelValue)"
      >
        <span class="stb__chip-label">{{ opt.label }}</span>
        <span class="stb__chip-arrow" aria-hidden="true">
          <template v-if="modelValue.key === opt.key && modelValue.direction === 'desc'">&darr;</template>
          <template v-else-if="modelValue.key === opt.key && modelValue.direction === 'asc'">&uarr;</template>
          <template v-else>&#8645;</template>
        </span>
      </button>
    </div>

    <!-- Slot dédié aux filtres (ex: CpcFilterToggle pour Radar). Reste à droite, séparé visuellement. -->
    <div v-if="$slots.filters" class="stb__filters">
      <slot name="filters" />
    </div>
  </div>
</template>

<style scoped>
/*
 * 2026-05-02 — Refonte design : sobre, neutre, moderne.
 * Plus de vert vif (la DA verte est réservée au TabCachePanel/TabLoadPrompt
 * qui sont des éléments contextuels persistants). Ici on a une barre d'outils
 * fonctionnelle, donc tons gris neutres avec accent foncé sur l'état actif.
 */
.stb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  margin: 0 0 0.5rem 0;
  font-size: 0.8125rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  padding-bottom: 0.5rem;
}

.stb__count {
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  font-weight: 500;
}

.stb__chips {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.stb__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.stb__chip:hover {
  background: var(--color-bg-soft, #f1f5f9);
  color: var(--color-text, #1e293b);
}

.stb__chip--active {
  background: var(--color-text, #1e293b);
  color: #fff;
  border-color: var(--color-text, #1e293b);
}
.stb__chip--active:hover {
  background: #0f172a;
  color: #fff;
}

.stb__chip-arrow {
  font-family: var(--font-mono, monospace);
  font-size: 0.6875rem;
  opacity: 0.5;
  min-width: 10px;
  text-align: center;
}
.stb__chip--active .stb__chip-arrow {
  opacity: 0.95;
}

.stb__filters {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
  padding-left: 0.625rem;
  border-left: 1px solid var(--color-border, #e2e8f0);
}
</style>
