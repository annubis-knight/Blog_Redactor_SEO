<script setup lang="ts">
/**
 * Vague 4 — Sous-composant Vue extrait de ArticleWorkflowView et ArticleEditorView.
 *
 * Toolbar de panels d'analyse (SEO / GEO / Maillage / Blocs / IA Brief).
 * Présente dans les 2 vues Rédaction avec quasi-identique : seul le panel
 * spécifique varie (Blocs côté éditeur, IA Brief côté workflow).
 *
 * Tous les panels gated par `hasBody` (= `editorStore.content` non null).
 * Sauf IA Brief qui ne dépend pas du contenu.
 */

defineProps<{
  hasBody: boolean
  showSeoPanel: boolean
  showGeoPanel: boolean
  showLinkSuggestions: boolean
  /** True si on doit afficher le bouton "Blocs" (mode éditeur). */
  showBlocksButton?: boolean
  showBlocksPanel?: boolean
  /** True si on doit afficher le bouton "IA Brief" (mode workflow). */
  showIaBriefButton?: boolean
  showIaBriefPanel?: boolean
}>()

defineEmits<{
  (e: 'toggle-seo'): void
  (e: 'toggle-geo'): void
  (e: 'toggle-linking'): void
  (e: 'toggle-blocks'): void
  (e: 'toggle-ia-brief'): void
}>()
</script>

<template>
  <div class="panel-toggles" role="toolbar" aria-label="Panneaux d'analyse">
    <button
      class="btn-toggle"
      :class="{ active: showSeoPanel, disabled: !hasBody }"
      :aria-pressed="showSeoPanel"
      :disabled="!hasBody"
      :title="!hasBody ? 'Generez un article pour activer le scoring SEO' : undefined"
      @click="$emit('toggle-seo')"
    >
      SEO
    </button>
    <button
      class="btn-toggle"
      :class="{ active: showGeoPanel, disabled: !hasBody }"
      :aria-pressed="showGeoPanel"
      :disabled="!hasBody"
      :title="!hasBody ? 'Generez un article pour activer le scoring GEO' : undefined"
      @click="$emit('toggle-geo')"
    >
      GEO
    </button>
    <button
      class="btn-toggle"
      :class="{ active: showLinkSuggestions, disabled: !hasBody }"
      :aria-pressed="showLinkSuggestions"
      :disabled="!hasBody"
      :title="!hasBody ? 'Generez un article pour activer le maillage' : undefined"
      @click="$emit('toggle-linking')"
    >
      Maillage
    </button>
    <button
      v-if="showBlocksButton"
      class="btn-toggle"
      :class="{ active: showBlocksPanel, disabled: !hasBody }"
      :aria-pressed="showBlocksPanel"
      :disabled="!hasBody"
      :title="!hasBody ? 'Generez un article pour activer les blocs' : undefined"
      @click="$emit('toggle-blocks')"
    >
      Blocs
    </button>
    <button
      v-if="showIaBriefButton"
      class="btn-toggle"
      :class="{ active: showIaBriefPanel }"
      :aria-pressed="showIaBriefPanel"
      @click="$emit('toggle-ia-brief')"
    >
      IA Brief
    </button>
  </div>
</template>

<style scoped>
.panel-toggles {
  display: flex;
  gap: 2px;
  background: var(--color-bg-soft);
  border-radius: 6px;
  padding: 2px;
}

.btn-toggle {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-toggle:hover {
  background: var(--color-bg-hover);
}

.btn-toggle.active {
  color: var(--color-primary);
  background: var(--color-bg-elevated);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-toggle.disabled,
.btn-toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-toggle:disabled:hover {
  background: transparent;
}
</style>
