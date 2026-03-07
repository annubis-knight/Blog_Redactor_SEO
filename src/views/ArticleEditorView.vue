<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'
import { useAutoSave } from '@/composables/useAutoSave'
import { useContextualActions } from '@/composables/useContextualActions'
import { apiGet } from '@/services/api.service'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import ArticleEditor from '@/components/editor/ArticleEditor.vue'
import EditorBubbleMenu from '@/components/editor/EditorBubbleMenu.vue'
import SaveStatusIndicator from '@/components/editor/SaveStatusIndicator.vue'
import ActionMenu from '@/components/actions/ActionMenu.vue'
import ActionResult from '@/components/actions/ActionResult.vue'
import ArticlePicker from '@/components/actions/ArticlePicker.vue'
import { useArticlesStore } from '@/stores/articles.store'
import type { ArticleContent, ActionType, Article } from '@shared/types/index.js'

const route = useRoute()
const editorStore = useEditorStore()
const articlesStore = useArticlesStore()

const slug = route.params.slug as string
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const articleEditorRef = ref<InstanceType<typeof ArticleEditor> | null>(null)

const showActionMenu = ref(false)
const showActionResult = ref(false)

useAutoSave(slug)

const {
  isExecuting,
  isStreaming,
  streamedResult,
  actionError,
  showArticlePicker,
  executeAction,
  acceptResult,
  rejectResult,
  applyInternalLink,
  cancelLink,
} = useContextualActions()

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (editorStore.isDirty && !editorStore.isSaving) {
      editorStore.saveArticle(slug)
    }
  }
})

async function loadContent() {
  isLoading.value = true
  loadError.value = null

  try {
    const data = await apiGet<ArticleContent>(`/articles/${slug}/content`)
    if (data.content) {
      editorStore.setContent(data.content)
      editorStore.markClean()
    }
    if (data.metaTitle || data.metaDescription) {
      editorStore.$patch({
        metaTitle: data.metaTitle ?? editorStore.metaTitle,
        metaDescription: data.metaDescription ?? editorStore.metaDescription,
      })
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
  } finally {
    isLoading.value = false
  }
}

function handleContentUpdate(html: string) {
  editorStore.setContent(html)
}

function handleOpenActions() {
  showActionMenu.value = true
  showActionResult.value = false
}

async function handleSelectAction(actionType: ActionType) {
  showActionMenu.value = false

  const editor = articleEditorRef.value?.editor
  if (!editor) return

  const { from, to } = editor.state.selection
  const selectedText = editor.state.doc.textBetween(from, to, ' ')
  if (!selectedText) return

  // internal-link shows article picker, not action result
  if (actionType !== 'internal-link') {
    showActionResult.value = true
  }

  await executeAction(actionType, selectedText, { articleSlug: slug }, editor)
}

function handleSelectArticle(article: Article) {
  applyInternalLink(article)
}

function handleCancelLink() {
  cancelLink()
}

function handleAcceptResult() {
  const editor = articleEditorRef.value?.editor
  if (!editor) return
  acceptResult(editor)
  showActionResult.value = false
}

function handleRejectResult() {
  rejectResult()
  showActionResult.value = false
}

onMounted(() => {
  loadContent()
})
</script>

<template>
  <div class="article-editor-view">
    <div class="editor-header">
      <RouterLink :to="`/article/${slug}`" class="back-link">← Retour au workflow</RouterLink>
      <div class="header-actions">
        <SaveStatusIndicator />
        <button
          class="btn-save"
          title="Ctrl+S"
          :disabled="!editorStore.isDirty || editorStore.isSaving"
          @click="editorStore.saveArticle(slug)"
        >
          Sauvegarder
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="isLoading" />

    <ErrorMessage
      v-else-if="loadError"
      :message="loadError"
      @retry="loadContent()"
    />

    <template v-else-if="editorStore.content">
      <EditorToolbar :editor="articleEditorRef?.editor" />

      <EditorBubbleMenu
        v-if="articleEditorRef?.editor"
        :editor="articleEditorRef.editor"
        @open-actions="handleOpenActions"
      />

      <ArticleEditor
        ref="articleEditorRef"
        :content="editorStore.content"
        @update:content="handleContentUpdate"
      />

      <!-- Action Menu Popover -->
      <div v-if="showActionMenu" class="action-overlay" @click.self="showActionMenu = false">
        <ActionMenu
          :disabled="isExecuting"
          @select-action="handleSelectAction"
        />
      </div>

      <!-- Action Result Panel -->
      <div v-if="showActionResult" class="action-overlay" @click.self="handleRejectResult">
        <ActionResult
          :result="streamedResult"
          :is-streaming="isStreaming"
          @accept="handleAcceptResult"
          @reject="handleRejectResult"
        />
      </div>

      <!-- Article Picker for internal-link action -->
      <div v-if="showArticlePicker" class="action-overlay" @click.self="handleCancelLink">
        <ArticlePicker
          :articles="articlesStore.articles.filter(a => a.slug !== slug)"
          @select-article="handleSelectArticle"
          @cancel="handleCancelLink"
        />
      </div>

      <div v-if="actionError" class="action-error">
        {{ actionError }}
      </div>
    </template>

    <div v-else class="empty-state">
      <p>Aucun contenu à éditer. Générez d'abord un article depuis le workflow.</p>
      <RouterLink :to="`/article/${slug}`" class="btn-back">Retour au workflow</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.article-editor-view {
  max-width: 900px;
  padding: 2rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.back-link {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.back-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-save {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.btn-save:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  z-index: 50;
}

.action-error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

.btn-back {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
}

.btn-back:hover {
  opacity: 0.9;
  text-decoration: none;
}
</style>
