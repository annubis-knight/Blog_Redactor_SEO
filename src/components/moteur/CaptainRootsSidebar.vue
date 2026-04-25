<script setup lang="ts">
import { computed } from 'vue'
import type { ValidateResponse } from '@shared/types/index.js'
import type { RadarCard, KeywordRootVariant } from '@shared/types/intent.types.js'
import ScoreRing from '@/components/shared/ScoreRing.vue'

/**
 * Étape 3E — Sidebar latérale qui liste les variantes "racines" du capitaine
 * (troncatures progressives N-1, N-2, etc.). Affichée à droite de la radar
 * card, à la manière de l'icône de verrou. Permet de basculer rapidement vers
 * une racine pour voir son score pertinence.
 *
 * Mode 1 — carousel : `variants` (Map<string, KeywordRootVariant>) avec rotation
 *                     de l'active et des isLoadingRoots/failedRoots.
 * Mode 2 — manual    : `singleRoot` (ValidateResponse) pour le mode historique
 *                     non-carousel (ne montre qu'une racine).
 */
const props = defineProps<{
  /** Variantes racines (mode carousel). */
  variants?: KeywordRootVariant[]
  /** Keyword actuellement actif (pour highlight). */
  activeKeyword?: string
  /** True quand les racines sont en cours de validation. */
  isLoading?: boolean
  /** Liste des racines dont la validation a échoué. */
  failedRoots?: string[]
  /** Mode manuel : une seule racine en lecture seule. */
  singleRoot?: ValidateResponse | null
}>()

const emit = defineEmits<{
  (e: 'select', variant: { keyword: string; card: RadarCard; validation: ValidateResponse }): void
}>()

function handleSelect(variant: KeywordRootVariant) {
  emit('select', variant)
}

// Étape 3C — Score moyen des racines (information contextuelle).
// On ne modifie pas le combinedScore back ; on expose ici la moyenne des
// scores pertinence des racines pour donner à l'utilisateur le signal SEO :
//   "même si la chaîne exacte est faible, ses racines portent ce score-là".
const rootsAverageScore = computed(() => {
  if (!props.variants || props.variants.length === 0) return null
  const sum = props.variants.reduce((acc, v) => acc + (v.card.combinedScore ?? 0), 0)
  return Math.round(sum / props.variants.length)
})

const rootsAverageColor = computed(() => {
  const score = rootsAverageScore.value
  if (score === null) return undefined
  if (score >= 65) return 'var(--color-success, #22c55e)'
  if (score >= 40) return 'var(--color-warning, #f59e0b)'
  return 'var(--color-error, #ef4444)'
})
</script>

<template>
  <aside class="captain-roots-sidebar" data-testid="captain-roots-sidebar">
    <span class="roots-sidebar__head">Racines</span>

    <!-- Mode 1 : carousel avec multiples variantes -->
    <template v-if="variants && variants.length > 0">
      <button
        v-for="variant in variants"
        :key="variant.keyword"
        class="roots-sidebar__item"
        :class="{ 'roots-sidebar__item--active': variant.keyword === activeKeyword }"
        :title="`Score pertinence : ${variant.card.combinedScore}/100 · verdict ${variant.validation.verdict.level}`"
        data-testid="root-sidebar-item"
        @click="handleSelect(variant)"
      >
        <span class="roots-sidebar__kw">{{ variant.keyword }}</span>
        <!-- Sprint 3.6 — ScoreRing (réplique du score-ring principal) au lieu
             du verdict catégoriel. Permet de comparer les variants racines
             d'un coup d'oeil sur la même échelle 0-100 que la card principale. -->
        <ScoreRing
          :value="variant.card.combinedScore"
          :size="22"
          :stroke-width="2.5"
        />
      </button>

      <!-- Étape 3C — Score moyen pertinence des racines (info contextuelle SEO). -->
      <div
        v-if="rootsAverageScore !== null"
        class="roots-sidebar__average"
        :title="'Moyenne des scores pertinence des racines — proxy de la demande agrégée même si la chaîne exacte est faible.'"
        data-testid="roots-sidebar-average"
      >
        <span class="roots-sidebar__average-label">Moyenne</span>
        <span class="roots-sidebar__average-value" :style="{ color: rootsAverageColor }">
          {{ rootsAverageScore }}<small>/100</small>
        </span>
      </div>
    </template>

    <!-- Mode 2 : manuel — une seule racine -->
    <template v-else-if="singleRoot">
      <div class="roots-sidebar__item roots-sidebar__item--readonly" data-testid="root-sidebar-single">
        <span class="roots-sidebar__kw">{{ singleRoot.keyword }}</span>
        <!-- Sprint 3.6 — ScoreRing (verdict.greenCount/totalKpis projeté sur 0-100). -->
        <ScoreRing
          :value="(singleRoot.verdict.greenCount / singleRoot.verdict.totalKpis) * 100"
          :size="22"
          :stroke-width="2.5"
          :title="`Verdict: ${singleRoot.verdict.level}`"
        />
      </div>
    </template>

    <!-- Loading state -->
    <span v-else-if="isLoading" class="roots-sidebar__loading" data-testid="root-sidebar-loading" />

    <!-- Failed roots (info) -->
    <span
      v-for="root in failedRoots"
      :key="'fail-' + root"
      class="roots-sidebar__failed"
    >
      {{ root }} (échec)
    </span>

    <!-- Empty state -->
    <span
      v-if="!isLoading && (!variants || variants.length === 0) && !singleRoot && (!failedRoots || failedRoots.length === 0)"
      class="roots-sidebar__empty"
    >
      Aucune racine
    </span>
  </aside>
</template>

<style scoped>
.captain-roots-sidebar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  width: 200px;
  flex-shrink: 0;
  padding: 0.5rem 0.5rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface-dim, #f1f5f9);
  gap: 4px;
  align-self: stretch;
  overflow-y: auto;
  max-height: 280px;
}

.roots-sidebar__head {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
  text-align: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  margin-bottom: 0.25rem;
}

.roots-sidebar__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0.25rem 0.375rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.6875rem;
  text-align: left;
  transition: background 0.1s;
}

.roots-sidebar__item:hover:not(.roots-sidebar__item--readonly) {
  background: rgba(0, 0, 0, 0.05);
}

.roots-sidebar__item--active {
  background: rgba(74, 144, 217, 0.12);
  font-weight: 600;
}

.roots-sidebar__item--readonly {
  cursor: default;
}

.roots-sidebar__kw {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.roots-sidebar__verdict {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.roots-sidebar__verdict small {
  font-size: 0.5rem;
  font-weight: 500;
  opacity: 0.7;
}

.roots-sidebar__loading {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  animation: roots-sidebar-spin 0.8s linear infinite;
  align-self: center;
  margin-top: 0.25rem;
}

@keyframes roots-sidebar-spin {
  to { transform: rotate(360deg); }
}

.roots-sidebar__failed {
  font-size: 0.625rem;
  color: var(--color-text-muted, #64748b);
  font-style: italic;
  opacity: 0.6;
  padding: 0.125rem 0.375rem;
}

.roots-sidebar__empty {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
  font-style: italic;
  text-align: center;
  padding: 0.25rem;
  opacity: 0.7;
}

.roots-sidebar__average {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem;
  margin-top: 0.25rem;
  border-top: 1px dashed var(--color-border, #e2e8f0);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.02);
  cursor: help;
}

.roots-sidebar__average-label {
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.roots-sidebar__average-value {
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.roots-sidebar__average-value small {
  font-size: 0.625rem;
  font-weight: 400;
  opacity: 0.7;
}
</style>
