<script setup lang="ts">
import { computed } from 'vue'
import type { SeoScore } from '@shared/types/seo.types.js'
import IndicatorCard from './IndicatorCard.vue'

const props = defineProps<{
  score: SeoScore | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const miniScore = computed(() => {
  if (!props.score) return null
  return Math.round(
    (props.score.factors.keywordPilierScore + props.score.factors.keywordSecondaryScore) / 2,
  )
})

const pilierDensity = computed(() =>
  props.score?.keywordDensities.find(d => d.type === 'Pilier') ?? null,
)

const lieutenantDensities = computed(() =>
  props.score?.keywordDensities.filter(d => d.type !== 'Pilier') ?? [],
)

/** Map checklist items by location for quick lookup */
const checklistMap = computed(() => {
  const map: Record<string, boolean> = {}
  for (const item of props.score?.checklistItems ?? []) {
    map[item.location] = item.isPresent
  }
  return map
})

const presenceLocations = [
  { key: 'metaTitle', label: 'meta', tooltip: 'Présence dans le meta title' },
  { key: 'h1', label: 'H1', tooltip: 'Présence dans le titre H1' },
  { key: 'intro', label: 'intro', tooltip: 'Présence dans l\'introduction' },
  { key: 'h2', label: 'H2', tooltip: 'Présence dans les sous-titres H2' },
  { key: 'conclusion', label: 'concl', tooltip: 'Présence dans la conclusion' },
  { key: 'metaDescription', label: 'desc', tooltip: 'Présence dans la meta description' },
  { key: 'slug', label: 'slug', tooltip: 'Présence dans l\'URL / slug de l\'article' },
  { key: 'imageAlt', label: 'alt', tooltip: 'Présence dans les attributs alt des images' },
] as const

function densityBarWidth(density: number, target: { min: number; max: number }): number {
  if (density >= target.min && density <= target.max) return 100
  if (density < target.min) return Math.max(0, (density / target.min) * 100)
  // Over max: cap at 100%, color handles the visual distinction
  return 100
}

function densityBarClass(density: number, target: { min: number; max: number }): string {
  if (density >= target.min && density <= target.max) return 'fill-good'
  if (density < target.min) return 'fill-fair'
  return 'fill-over'
}

function matchMethodIndicator(method: string): string {
  if (method === 'semantic') return ' ≈'
  if (method === 'partial') return ' ~'
  return ''
}
</script>

<template>
  <IndicatorCard
    title="Mots-clés"
    icon="🎯"
    tooltip="Densité des mots-clés et présence dans les zones stratégiques"
    :score="miniScore"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score" class="density-rows">
      <!-- Capitaine -->
      <div v-if="pilierDensity" class="keyword-block">
        <div
          class="keyword-header"
          :title="`Densité du capitaine « ${pilierDensity.keyword} » — cible : ${pilierDensity.target.min}%–${pilierDensity.target.max}%`"
        >
          <span class="keyword-name">{{ pilierDensity.keyword }}</span>
          <span
            class="keyword-density"
            :class="pilierDensity.inTarget ? 'val-ok' : pilierDensity.density > pilierDensity.target.max ? 'val-error' : 'val-warn'"
          >
            {{ pilierDensity.density }}%{{ matchMethodIndicator(pilierDensity.matchMethod) }}
            <span class="occ-count">({{ pilierDensity.occurrences }} occ.)</span>
          </span>
        </div>
        <div class="ind-bar-3">
          <div
            class="ind-fill"
            :class="densityBarClass(pilierDensity.density, pilierDensity.target)"
            :style="{ width: `${densityBarWidth(pilierDensity.density, pilierDensity.target)}%` }"
          />
        </div>
        <div class="density-range">{{ pilierDensity.target.min }}% – {{ pilierDensity.target.max }}%</div>

        <!-- Presence badges -->
        <div class="presence-row">
          <span
            v-for="loc in presenceLocations"
            :key="loc.key"
            class="presence-badge"
            :class="checklistMap[loc.key] ? 'badge-ok' : 'badge-missing'"
            :title="loc.tooltip"
          >
            {{ loc.label }}{{ checklistMap[loc.key] ? '✓' : '✗' }}
          </span>
        </div>
      </div>

      <!-- Lieutenants -->
      <div v-for="d in lieutenantDensities" :key="d.keyword" class="keyword-block lt-block">
        <div
          class="keyword-header"
          :title="`Densité de « ${d.keyword} » — cible : ${d.target.min}%–${d.target.max}%`"
        >
          <span class="keyword-name lt-name">{{ d.keyword }}</span>
          <span
            class="keyword-density"
            :class="d.inTarget ? 'val-ok' : d.density > d.target.max ? 'val-error' : 'val-warn'"
          >
            {{ d.density }}%{{ matchMethodIndicator(d.matchMethod) }}
            <span class="occ-count">({{ d.occurrences }} occ.)</span>
          </span>
        </div>
        <div class="ind-bar-3">
          <div
            class="ind-fill"
            :class="densityBarClass(d.density, d.target)"
            :style="{ width: `${densityBarWidth(d.density, d.target)}%` }"
          />
        </div>
        <div class="density-range">{{ d.target.min }}% – {{ d.target.max }}%</div>
      </div>

      <div v-if="!pilierDensity && lieutenantDensities.length === 0" class="no-kw">
        Aucun mot-clé article défini
      </div>
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import './indicators-shared.css';

.density-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.keyword-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.lt-block {
  padding-left: 0.25rem;
}

.keyword-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.keyword-name {
  font-weight: 600;
  color: var(--color-text, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 45%;
}

.lt-name {
  font-weight: 500;
  font-size: 0.6875rem;
}

.keyword-density {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.occ-count {
  font-weight: 400;
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
}

.density-range {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
}

.presence-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1875rem;
  margin-top: 0.25rem;
}

.presence-badge {
  font-size: 0.625rem;
  padding: 0.0625rem 0.25rem;
  border-radius: 3px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-ok {
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-badge-green-text, #15803d);
}

.badge-missing {
  background: var(--color-badge-red-bg, #fee2e2);
  color: var(--color-badge-red-text, #b91c1c);
}

.no-kw {
  color: var(--color-text-muted, #6b7280);
  font-style: italic;
}
</style>
