<script setup lang="ts">
/**
 * Vague 5 — Sous-composant Vue extrait de ArticleEditorView.
 *
 * Encapsule les 3 overlays modaux de l'éditeur :
 * - ActionMenu : palette d'actions contextuelles (sélection texte → IA)
 * - ActionResult : preview du résultat IA streamé (accept/reject)
 * - ArticlePicker : picker d'article pour internal-link
 * - ActionError : message d'erreur en bas si action échoue
 */
import ActionMenu from '@/components/actions/ActionMenu.vue'
import ActionResult from '@/components/actions/ActionResult.vue'
import ArticlePicker from '@/components/actions/ArticlePicker.vue'
import type { Article, ActionType } from '@shared/types/index.js'

defineProps<{
  showActionMenu: boolean
  showActionResult: boolean
  showArticlePicker: boolean
  isExecuting: boolean
  isStreaming: boolean
  streamedResult: string
  articles: Article[]
  actionError: string | null
}>()

defineEmits<{
  (e: 'close-menu'): void
  (e: 'select-action', actionType: ActionType): void
  (e: 'accept-result'): void
  (e: 'reject-result'): void
  (e: 'select-article', article: Article): void
  (e: 'cancel-link'): void
}>()
</script>

<template>
  <!-- Action Menu Popover -->
  <div v-if="showActionMenu" class="action-overlay" @click.self="$emit('close-menu')">
    <ActionMenu
      :disabled="isExecuting"
      @select-action="(t: ActionType) => $emit('select-action', t)"
    />
  </div>

  <!-- Action Result Panel -->
  <div v-if="showActionResult" class="action-overlay" @click.self="$emit('reject-result')">
    <ActionResult
      :result="streamedResult"
      :is-streaming="isStreaming"
      @accept="$emit('accept-result')"
      @reject="$emit('reject-result')"
    />
  </div>

  <!-- Article Picker for internal-link action -->
  <div v-if="showArticlePicker" class="action-overlay" @click.self="$emit('cancel-link')">
    <ArticlePicker
      :articles="articles"
      @select-article="(a: Article) => $emit('select-article', a)"
      @cancel="$emit('cancel-link')"
    />
  </div>

  <div v-if="actionError" class="action-error">
    {{ actionError }}
  </div>
</template>

<style scoped>
.action-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.action-error {
  margin-top: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-error);
}
</style>
