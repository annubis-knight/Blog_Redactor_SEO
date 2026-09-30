<script setup lang="ts">
/**
 * Vague 4 — Sous-composant Vue extrait de ArticleWorkflowView.
 *
 * Panel "IA Brief" — affiche l'analyse markdown streamée du brief.
 * Spécifique au WorkflowView (ArticleEditorView ne propose pas ce panel).
 */

withDefaults(defineProps<{
  parsedBriefMarkdown: string
  iaBriefStreaming: boolean
  /** Échec de l'analyse (FR-RED-BRIEF) : dit à l'écran, jamais en silence (RED-1). */
  iaBriefError?: string | null
}>(), {
  iaBriefError: null,
})

defineEmits<{
  (e: 'relaunch'): void
}>()
</script>

<template>
  <div class="ia-brief-panel">
    <div class="ia-brief-header">
      <h3>Analyse IA du Brief</h3>
      <button
        class="btn-relaunch"
        :disabled="iaBriefStreaming"
        @click="$emit('relaunch')"
      >
        {{ iaBriefStreaming ? 'Analyse en cours...' : 'Relancer l\'analyse' }}
      </button>
    </div>
    <p v-if="iaBriefError && !iaBriefStreaming" class="ia-brief-error" role="alert" data-testid="ia-brief-error">
      L’analyse n’a pas abouti : {{ iaBriefError }}
    </p>
    <div
      v-if="parsedBriefMarkdown"
      class="ia-brief-content markdown-body"
      v-safe-html="parsedBriefMarkdown"
    />
    <p v-else-if="iaBriefStreaming" class="ia-brief-loading">Analyse en cours...</p>
    <p v-else class="ia-brief-empty">Cliquez sur "Relancer l'analyse" pour générer une analyse IA.</p>
  </div>
</template>

<style scoped>
.ia-brief-panel {
  padding: 1rem 1.25rem;
}

.ia-brief-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.ia-brief-header h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
}

.btn-relaunch {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}

.btn-relaunch:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-relaunch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ia-brief-content {
  font-size: 0.8125rem;
  line-height: 1.6;
}

.ia-brief-loading,
.ia-brief-empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.ia-brief-error {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-error, #dc2626);
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 6px;
}
</style>
