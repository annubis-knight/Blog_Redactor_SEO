<script setup lang="ts">
/**
 * Vague 5 — Micro composant atomique extrait de ArticleWorkflowView et
 * ArticleEditorView (markup dupliqué à l'identique dans les 2 vues).
 *
 * Affiche la barre de progression "Section X/N" pendant la génération
 * d'article (editorStore.sectionProgress).
 */

defineProps<{
  current: number
  total: number
  title: string
}>()
</script>

<template>
  <div class="section-progress">
    <div class="section-progress-header">
      <span class="section-progress-label">
        Section {{ current + 1 }}/{{ total }}
      </span>
      <span class="section-progress-title">{{ title }}</span>
    </div>
    <div class="section-progress-bar">
      <div
        class="section-progress-fill"
        :style="{ width: ((current + 1) / total * 100) + '%' }"
      />
    </div>
  </div>
</template>

<style scoped>
.section-progress {
  margin-top: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.section-progress-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.section-progress-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-progress-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
}

.section-progress-bar {
  position: relative;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.section-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
