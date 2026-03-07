<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  recommendation: number | null
  articleType: string
}>()

const range = computed(() => {
  if (!props.recommendation) return null
  const min = Math.round(props.recommendation * 0.8)
  const max = Math.round(props.recommendation * 1.2)
  return { min, max }
})
</script>

<template>
  <section class="content-recommendation">
    <h3 class="section-title">Longueur de contenu recommandée</h3>

    <div v-if="range" class="recommendation-card">
      <div class="recommendation-value">
        <span class="value-range">{{ range.min.toLocaleString('fr-FR') }} – {{ range.max.toLocaleString('fr-FR') }}</span>
        <span class="value-unit">mots</span>
      </div>
      <p class="recommendation-note">
        Basé sur le type d'article <strong>{{ articleType }}</strong> (cible : ~{{ recommendation?.toLocaleString('fr-FR') }} mots)
      </p>
    </div>

    <div v-else class="no-data">
      Aucune recommandation disponible
    </div>
  </section>
</template>

<style scoped>
.content-recommendation {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--color-text);
}

.recommendation-card {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.recommendation-value {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.value-range {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.value-unit {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.recommendation-note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.no-data {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
