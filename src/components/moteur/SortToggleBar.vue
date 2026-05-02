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
/* Même DA verte que TabCachePanel/TabLoadPrompt pour cohérence visuelle dans le Moteur. */
.stb {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.625rem;
  background: linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, rgba(22, 163, 74, 0.04) 100%);
  border: 1px solid rgba(22, 163, 74, 0.25);
  border-radius: 10px;
  font-size: 0.8125rem;
  flex-wrap: wrap;
}

.stb__count {
  font-weight: 700;
  color: #15803d;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-right: 0.25rem;
}

.stb__chips {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.stb__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(22, 163, 74, 0.35);
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #166534;
  cursor: pointer;
  transition: all 0.15s;
}
.stb__chip:hover {
  background: #fff;
  border-color: rgba(22, 163, 74, 0.7);
  transform: translateY(-1px);
}

.stb__chip--active {
  background: #166534;
  color: #fff;
  border-color: #166534;
}
.stb__chip--active:hover {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}

.stb__chip-arrow {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  opacity: 0.7;
  min-width: 12px;
  text-align: center;
}
.stb__chip--active .stb__chip-arrow {
  opacity: 1;
}

.stb__filters {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(22, 163, 74, 0.2);
}
</style>
