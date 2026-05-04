<script setup lang="ts">
/**
 * Vague 5 — Sous-composant Vue extrait de ArticleWorkflowView.
 *
 * Affiche la barre de progression "X mots / N cible" + remplissage coloré
 * (vert si >= 80% du target, sinon orange).
 */

const props = defineProps<{
  wordCount: number
  target: number | null
}>()

import { computed } from 'vue'

const percent = computed(() => {
  if (!props.target || !props.wordCount) return 0
  return Math.round((props.wordCount / props.target) * 100)
})
</script>

<template>
  <div class="word-count-bar">
    <div class="word-count-info">
      <span class="word-count-value">{{ wordCount }} mots</span>
      <span v-if="target" class="word-count-target">/ {{ target }} cible</span>
    </div>
    <div v-if="target" class="word-count-progress">
      <div
        class="word-count-fill"
        :class="percent >= 80 ? 'fill-good' : 'fill-fair'"
        :style="{ width: Math.min(100, percent) + '%' }"
      />
    </div>
  </div>
</template>

<style scoped>
.word-count-bar {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.word-count-info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.word-count-value {
  font-weight: 600;
  color: var(--color-text);
}

.word-count-target {
  color: var(--color-text-muted);
}

.word-count-progress {
  position: relative;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.word-count-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.fill-good {
  background: var(--color-success, #22c55e);
}

.fill-fair {
  background: var(--color-warning, #eab308);
}
</style>
