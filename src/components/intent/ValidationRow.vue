<script setup lang="ts">
import type { TranslatedKeyword, MultiSourceVerdict } from '@shared/types/intent.types.js'
import VerdictBadge from './VerdictBadge.vue'
import ConfidenceBar from './ConfidenceBar.vue'

defineProps<{
  keyword: TranslatedKeyword
  verdict: MultiSourceVerdict | null
  perSourceScores: Record<string, number> | null
  selected: boolean
  longTail: boolean
}>()

defineEmits<{
  select: []
  'toggle-detail': []
}>()

function scoreClass(score: number): string {
  if (score >= 0.6) return 'score--strong'
  if (score >= 0.3) return 'score--medium'
  return 'score--weak'
}
</script>

<template>
  <tr
    class="validation-row"
    :class="{ 'validation-row--selected': selected }"
    @click="$emit('toggle-detail')"
  >
    <!-- Radio -->
    <td class="col-select" @click.stop>
      <input
        type="radio"
        :checked="selected"
        name="pain-keyword"
        @click="$emit('select')"
      />
    </td>

    <!-- Mot-clé + reasoning -->
    <td class="col-keyword">
      <template v-if="verdict">
        <span class="kw-name">
          {{ keyword.keyword }}
          <span v-if="longTail" class="kw-tail-badge" title="Longue traîne — scoring adapté (autocomplete prioritaire)">LT</span>
        </span>
        <span class="kw-reasoning">{{ keyword.reasoning }}</span>
      </template>
      <template v-else>
        <div class="skeleton skeleton-text" />
        <div class="skeleton skeleton-text-sm" />
      </template>
    </td>

    <!-- Verdict -->
    <td class="col-verdict">
      <VerdictBadge
        v-if="verdict"
        :category="verdict.category"
        :provisional="verdict.sourcesAvailable < 3"
      />
      <div v-else class="skeleton skeleton-badge" />
    </td>

    <!-- Confiance -->
    <td class="col-confidence">
      <ConfidenceBar v-if="verdict" :value="verdict.confidence" />
      <div v-else class="skeleton skeleton-bar" />
    </td>

    <!-- DataForSEO score -->
    <td class="col-score">
      <template v-if="perSourceScores">
        <span
          v-if="perSourceScores.dataforseo !== undefined"
          class="score-value"
          :class="scoreClass(perSourceScores.dataforseo)"
        >{{ perSourceScores.dataforseo.toFixed(2) }}</span>
        <span v-else class="score-na">—</span>
      </template>
      <div v-else class="skeleton skeleton-num" />
    </td>

    <!-- Community score -->
    <td class="col-score">
      <template v-if="perSourceScores">
        <span
          v-if="perSourceScores.community !== undefined"
          class="score-value"
          :class="scoreClass(perSourceScores.community)"
        >{{ perSourceScores.community.toFixed(2) }}</span>
        <span v-else class="score-na">—</span>
      </template>
      <div v-else class="skeleton skeleton-num" />
    </td>

    <!-- Autocomplete score -->
    <td class="col-score">
      <template v-if="perSourceScores">
        <span
          v-if="perSourceScores.autocomplete !== undefined"
          class="score-value"
          :class="scoreClass(perSourceScores.autocomplete)"
        >{{ perSourceScores.autocomplete.toFixed(2) }}</span>
        <span v-else class="score-na">—</span>
      </template>
      <div v-else class="skeleton skeleton-num" />
    </td>
  </tr>
</template>

<style scoped>
.validation-row {
  cursor: pointer;
  transition: background 0.15s;
}

.validation-row:hover {
  background: var(--color-bg-hover, #f1f5f9);
}

.validation-row--selected {
  background: var(--color-primary-soft, #eff6ff);
}

.col-select {
  width: 32px;
  text-align: center;
}

.col-keyword {
  min-width: 180px;
}

.col-verdict {
  width: 110px;
}

.col-confidence {
  width: 120px;
}

.col-score {
  width: 60px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.score-value {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.score--strong {
  color: var(--color-badge-green-text, #166534);
  background: var(--color-badge-green-bg, #dcfce7);
}

.score--medium {
  color: var(--color-badge-amber-text, #92400e);
  background: var(--color-badge-amber-bg, #fef3c7);
}

.score--weak {
  color: var(--color-badge-red-text, #991b1b);
  background: var(--color-badge-red-bg, #fee2e2);
}

.score-na {
  color: var(--color-text-muted, #94a3b8);
  font-size: 0.75rem;
}

.kw-name {
  display: block;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.kw-tail-badge {
  display: inline-block;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.0625rem 0.25rem;
  margin-left: 0.375rem;
  border-radius: 3px;
  vertical-align: middle;
  color: var(--color-badge-blue-text, #1e40af);
  background: var(--color-badge-blue-bg, #dbeafe);
}

.kw-reasoning {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  margin-top: 0.125rem;
}

/* Skeleton shimmer */
.skeleton {
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-bg-soft, #f1f5f9) 25%, var(--color-bg-muted, #e2e8f0) 50%, var(--color-bg-soft, #f1f5f9) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  width: 120px;
  height: 14px;
  margin-bottom: 4px;
}

.skeleton-text-sm {
  width: 80px;
  height: 10px;
}

.skeleton-badge {
  width: 80px;
  height: 22px;
  border-radius: 9999px;
}

.skeleton-bar {
  width: 60px;
  height: 6px;
}

.skeleton-num {
  width: 40px;
  height: 14px;
  margin-left: auto;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
