<script setup lang="ts">
/**
 * Vague 4 — Sous-composant Vue extrait de ArticleWorkflowView et ArticleEditorView.
 *
 * Wrapper Transition + ResizablePanel qui héberge les 4 panels d'analyse
 * (SEO, GEO, LinkSuggestions, Blocs) communs aux 2 vues.
 *
 * NOTE : le panel "IA Brief" (workflow uniquement) reste dans le parent
 * (markup spécifique avec markdown). Ce sous-composant rend uniquement les
 * panels factorisables.
 *
 * Le panel BlocksPanel n'est rendu que si `showBlocksPanel` est true (côté
 * éditeur uniquement). Workflow ne l'utilise pas.
 */
import SeoPanel from '@/components/panels/SeoPanel.vue'
import GeoPanel from '@/components/panels/GeoPanel.vue'
import BlocksPanel from '@/components/panels/BlocksPanel.vue'
import LinkSuggestions from '@/components/linking/LinkSuggestions.vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import type { LinkSuggestion } from '@shared/types/index.js'

defineProps<{
  hasBody: boolean
  showSeoPanel: boolean
  showGeoPanel: boolean
  showLinkSuggestions: boolean
  showBlocksPanel?: boolean
  linkSuggestions: LinkSuggestion[]
  isSuggesting: boolean
}>()

defineEmits<{
  (e: 'accept-suggestion', suggestion: LinkSuggestion): void
  (e: 'dismiss-suggestion', suggestion: LinkSuggestion): void
  (e: 'request-suggestions'): void
  (e: 'close-link-suggestions'): void
}>()
</script>

<template>
  <div v-if="!hasBody && (showSeoPanel || showGeoPanel || showLinkSuggestions || showBlocksPanel)" class="panel-disabled-overlay">
    <p class="panel-disabled-msg">Generez un article pour activer ce panneau</p>
  </div>

  <ErrorBoundary v-if="showSeoPanel" fallback-message="Erreur dans le panneau SEO.">
    <SeoPanel />
  </ErrorBoundary>

  <ErrorBoundary v-if="showGeoPanel" fallback-message="Erreur dans le panneau géo.">
    <GeoPanel />
  </ErrorBoundary>

  <ErrorBoundary v-if="showLinkSuggestions" fallback-message="Erreur dans les suggestions de liens.">
    <LinkSuggestions
      :suggestions="linkSuggestions"
      :is-suggesting="isSuggesting"
      @accept="(suggestion: LinkSuggestion) => $emit('accept-suggestion', suggestion)"
      @dismiss="(suggestion: LinkSuggestion) => $emit('dismiss-suggestion', suggestion)"
      @request="$emit('request-suggestions')"
      @close="$emit('close-link-suggestions')"
    />
  </ErrorBoundary>

  <ErrorBoundary v-if="showBlocksPanel" fallback-message="Erreur dans le panneau blocs.">
    <BlocksPanel />
  </ErrorBoundary>
</template>

<style scoped>
.panel-disabled-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-bg-rgb, 255, 255, 255), 0.7);
  backdrop-filter: blur(2px);
}

.panel-disabled-msg {
  margin: 0;
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
</style>
