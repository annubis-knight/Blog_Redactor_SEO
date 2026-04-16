<script setup lang="ts">
defineProps<{
  isGenerating: boolean
  hasContent: boolean
  isOutlineValidated: boolean
  isReducing: boolean
  isHumanizing: boolean
  canReduce: boolean
  wordCountDelta: number | null
  humanizeProgress: { current: number; total: number; title: string } | null
  reduceProgress: { current: number; total: number; title: string } | null
}>()

defineEmits<{
  generate: []
  regenerate: []
  reduce: []
  'abort-reduce': []
  humanize: []
  'abort-humanize': []
}>()
</script>

<template>
  <div class="article-actions">
    <h3 class="section-title">Article</h3>

    <button
      v-if="!hasContent && isOutlineValidated"
      class="action-btn primary"
      :disabled="isGenerating"
      data-testid="generate-button"
      @click="$emit('generate')"
    >
      <span v-if="isGenerating">Génération en cours...</span>
      <span v-else>Générer l'article</span>
    </button>

    <button
      v-if="hasContent"
      class="action-btn secondary"
      :disabled="isGenerating || isReducing || isHumanizing"
      data-testid="regenerate-button"
      @click="$emit('regenerate')"
    >
      <span v-if="isGenerating">Régénération en cours...</span>
      <span v-else>Régénérer l'article</span>
    </button>

    <button
      v-if="!isReducing"
      class="action-btn secondary"
      :disabled="!hasContent || !canReduce || isHumanizing || isGenerating"
      data-testid="reduce-button"
      @click="$emit('reduce')"
    >
      <span v-if="wordCountDelta && wordCountDelta > 0">Réduire (-{{ wordCountDelta }} mots)</span>
      <span v-else>Réduire l'article</span>
    </button>

    <button
      v-if="isReducing"
      class="action-btn danger"
      data-testid="abort-reduce-button"
      @click="$emit('abort-reduce')"
    >
      Annuler réduction
    </button>

    <button
      v-if="!isHumanizing"
      class="action-btn secondary"
      :disabled="!hasContent || isReducing || isGenerating"
      data-testid="humanize-button"
      @click="$emit('humanize')"
    >
      Humaniser l'article
    </button>

    <button
      v-if="isHumanizing"
      class="action-btn danger"
      data-testid="abort-humanize-button"
      @click="$emit('abort-humanize')"
    >
      Annuler humanisation
    </button>

    <span
      v-if="reduceProgress"
      class="humanize-progress"
      data-testid="reduce-progress-indicator"
    >
      Réduction {{ reduceProgress.current + 1 }}/{{ reduceProgress.total }}
      — {{ reduceProgress.title }}
    </span>

    <span
      v-if="humanizeProgress"
      class="humanize-progress"
      data-testid="humanize-progress-indicator"
    >
      Humanisation {{ humanizeProgress.current + 1 }}/{{ humanizeProgress.total }}
      — {{ humanizeProgress.title }}
    </span>
  </div>
</template>

<style scoped>
.article-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.action-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-btn.danger {
  background: #dc3545;
  color: white;
}

.action-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.humanize-progress {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
}
</style>
