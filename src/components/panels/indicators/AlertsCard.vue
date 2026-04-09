<script setup lang="ts">
import { computed } from 'vue'
import type { SeoScore, CannibalizationWarning } from '@shared/types/seo.types.js'
import IndicatorCard from './IndicatorCard.vue'

const props = defineProps<{
  score: SeoScore | null
  cannibalizationWarnings: CannibalizationWarning[]
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

interface Alert {
  level: 'danger' | 'warning' | 'info'
  message: string
  tooltip: string
}

const LEVEL_ORDER: Record<Alert['level'], number> = { danger: 0, warning: 1, info: 2 }

const alerts = computed<Alert[]>(() => {
  const result: Alert[] = []
  if (!props.score) return result

  // Cannibalization
  for (const w of props.cannibalizationWarnings) {
    result.push({
      level: 'danger',
      message: `Cannibalisation : « ${w.keyword} » aussi ciblé par ${w.conflictingTitle}`,
      tooltip: 'Deux articles ne doivent pas cibler le même mot-clé principal pour éviter la cannibalisation SEO',
    })
  }

  // Over-optimization (density > max)
  for (const d of props.score.keywordDensities) {
    if (d.density > d.target.max) {
      result.push({
        level: 'warning',
        message: `Sur-optimisation : « ${d.keyword} » à ${d.density}% (max ${d.target.max}%)`,
        tooltip: 'Une densité trop élevée peut être pénalisée par Google (keyword stuffing)',
      })
    }
  }

  // Under-optimization — Pilier (density < min)
  for (const d of props.score.keywordDensities) {
    if (d.type === 'Pilier' && d.density < d.target.min && d.density > 0) {
      result.push({
        level: 'warning',
        message: `Sous-optimisation : « ${d.keyword} » à ${d.density}% (min ${d.target.min}%)`,
        tooltip: 'Le mot-clé principal n\'est pas assez présent dans le contenu',
      })
    }
  }

  // Under-optimization — Lieutenants (only if very low: density < min * 0.5)
  for (const d of props.score.keywordDensities) {
    if (d.type !== 'Pilier' && d.density > 0 && d.density < d.target.min * 0.5) {
      result.push({
        level: 'info',
        message: `Sous-optimisation : « ${d.keyword} » à ${d.density}% (min ${d.target.min}%)`,
        tooltip: 'Ce mot-clé secondaire est très peu présent dans le contenu',
      })
    }
  }

  // Missing meta
  if (props.score.metaAnalysis.titleLength === 0) {
    result.push({
      level: 'warning',
      message: 'Meta title non défini',
      tooltip: 'Le meta title est essentiel pour le référencement et l\'affichage dans les SERP',
    })
  }
  if (props.score.metaAnalysis.descriptionLength === 0) {
    result.push({
      level: 'warning',
      message: 'Meta description non définie',
      tooltip: 'La meta description influence le taux de clic dans les résultats de recherche',
    })
  }

  // Images without alt
  if (props.score.imageAnalysis.total > 0) {
    const missingAlt = props.score.imageAnalysis.total - props.score.imageAnalysis.withAlt
    if (missingAlt > 0) {
      result.push({
        level: 'info',
        message: `${missingAlt} image${missingAlt > 1 ? 's' : ''} sans attribut alt`,
        tooltip: 'Les attributs alt des images améliorent le référencement et l\'accessibilité',
      })
    }
    if (props.score.imageAnalysis.withKeywordInAlt === 0) {
      result.push({
        level: 'info',
        message: 'Aucune image avec le capitaine dans l\'alt',
        tooltip: 'Inclure le mot-clé principal dans au moins un alt d\'image renforce le référencement',
      })
    }
  }

  // No article keywords
  if (!props.score.hasArticleKeywords) {
    result.push({
      level: 'warning',
      message: 'Aucun mot-clé article défini — configurez le Capitaine dans le Moteur',
      tooltip: 'Les mots-clés article (Capitaine/Lieutenants) sont nécessaires pour le scoring SEO',
    })
  }

  // Sort by severity: danger first, then warning, then info
  result.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])

  return result
})

const alertCount = computed(() => alerts.value.length)
</script>

<template>
  <IndicatorCard
    title="Alertes"
    icon="⚠"
    tooltip="Alertes et recommandations SEO détectées automatiquement"
    :alert-count="alertCount"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="alerts.length > 0" class="alert-list">
      <div
        v-for="(alert, i) in alerts"
        :key="i"
        class="alert-item"
        :class="`alert-${alert.level}`"
        :title="alert.tooltip"
      >
        <span class="alert-dot" aria-hidden="true" />
        <span class="alert-message">{{ alert.message }}</span>
      </div>
    </div>
    <div v-else class="no-alerts">
      Aucune alerte — tout est en ordre
    </div>
  </IndicatorCard>
</template>

<style scoped>
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  font-size: 0.6875rem;
  padding: 0.25rem 0.375rem;
  border-radius: 4px;
  line-height: 1.4;
}

.alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.alert-danger {
  background: var(--color-badge-red-bg, #fee2e2);
  color: var(--color-badge-red-text, #b91c1c);
}

.alert-danger .alert-dot {
  background: var(--color-error, #b91c1c);
}

.alert-warning {
  background: var(--color-warning-bg, #fffbeb);
  color: var(--color-warning-text, #92400e);
}

.alert-warning .alert-dot {
  background: var(--color-warning, #b45309);
}

.alert-info {
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-badge-blue-text, #2563eb);
}

.alert-info .alert-dot {
  background: var(--color-primary, #2563eb);
}

.alert-message {
  flex: 1;
}

.no-alerts {
  color: var(--color-success, #15803d);
  font-size: 0.6875rem;
  font-weight: 500;
}
</style>
