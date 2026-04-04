<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'
import { useAutoSave } from '@/composables/useAutoSave'
import { useContextualActions } from '@/composables/useContextualActions'
import { apiGet } from '@/services/api.service'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import ArticleEditor from '@/components/editor/ArticleEditor.vue'
import EditorBubbleMenu from '@/components/editor/EditorBubbleMenu.vue'
import SaveStatusIndicator from '@/components/editor/SaveStatusIndicator.vue'
import ActionMenu from '@/components/actions/ActionMenu.vue'
import ActionResult from '@/components/actions/ActionResult.vue'
import ArticlePicker from '@/components/actions/ArticlePicker.vue'
import { useArticlesStore } from '@/stores/articles.store'
import { useKeywordsStore } from '@/stores/keywords.store'
import { useBriefStore } from '@/stores/brief.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useSeoScoring } from '@/composables/useSeoScoring'
import { useGeoScoring } from '@/composables/useGeoScoring'
import { useInternalLinking } from '@/composables/useInternalLinking'
import { usePanelToggle } from '@/composables/usePanelToggle'
import SeoPanel from '@/components/panels/SeoPanel.vue'
import GeoPanel from '@/components/panels/GeoPanel.vue'
import LinkSuggestions from '@/components/linking/LinkSuggestions.vue'
import ResizablePanel from '@/components/panels/ResizablePanel.vue'
import ExportButton from '@/components/export/ExportButton.vue'
import ExportPreview from '@/components/export/ExportPreview.vue'
import type { ArticleContent, ActionType, Article, LinkSuggestion } from '@shared/types/index.js'

const route = useRoute()
const editorStore = useEditorStore()
const articlesStore = useArticlesStore()
const keywordsStore = useKeywordsStore()
const briefStore = useBriefStore()
const cocoonsStore = useCocoonsStore()

const slug = route.params.slug as string

const cocoonId = computed(() => {
  const cocoonName = briefStore.briefData?.article.cocoonName
  return cocoonsStore.cocoons.find(c => c.name === cocoonName)?.id ?? null
})
const backLink = computed(() =>
  cocoonId.value ? `/cocoon/${cocoonId.value}/article/${slug}` : '/',
)

const { activePanel, toggle, showSeoPanel, showGeoPanel, showLinkSuggestions, hasActivePanel } = usePanelToggle('seo')
const exportHtml = ref<string | null>(null)

const {
  suggestions: linkSuggestions,
  isSuggesting,
  requestSuggestions,
  applySuggestion,
  dismissSuggestion,
  clearSuggestions,
} = useInternalLinking(slug)
useSeoScoring(
  () => keywordsStore.keywords,
  () => briefStore.briefData?.contentLengthRecommendation ?? undefined,
  () => briefStore.briefData?.dataForSeo?.relatedKeywords ?? [],
)
useGeoScoring()
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

function handleToggleLinkSuggestions() {
  toggle('linking')
  if (showLinkSuggestions.value && linkSuggestions.value.length === 0) {
    requestSuggestions()
  }
}

function handleAcceptSuggestion(suggestion: LinkSuggestion) {
  const editor = articleEditorRef.value?.editor
  if (!editor) return
  applySuggestion(suggestion, editor)
}

function handleDismissSuggestion(suggestion: LinkSuggestion) {
  dismissSuggestion(suggestion)
}

function handleCloseLinkSuggestions() {
  toggle('linking')
  clearSuggestions()
}

onMounted(() => {
  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }
  briefStore.fetchBrief(slug)
  loadContent()
})
</script>

<template>
  <div class="article-editor-layout">
    <div class="article-editor-view">
      <header class="editor-header">
        <div class="header-left">
          <RouterLink :to="backLink" class="back-link">&larr; Retour</RouterLink>
          <SaveStatusIndicator />
        </div>

        <div class="header-center" role="toolbar" aria-label="Panneaux d'analyse">
          <button
            class="btn-toggle"
            :class="{ active: showSeoPanel }"
            :aria-pressed="showSeoPanel"
            @click="toggle('seo')"
          >
            SEO
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showGeoPanel }"
            :aria-pressed="showGeoPanel"
            @click="toggle('geo')"
          >
            GEO
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showLinkSuggestions }"
            :aria-pressed="showLinkSuggestions"
            @click="handleToggleLinkSuggestions"
          >
            Maillage
          </button>
        </div>

        <div class="header-right">
          <button
            class="btn-save"
            aria-label="Sauvegarder (Ctrl+S)"
            :disabled="!editorStore.isDirty || editorStore.isSaving"
            @click="editorStore.saveArticle(slug)"
          >
            Sauvegarder
          </button>
          <ExportButton :slug="slug" @export-ready="exportHtml = $event" />
        </div>
      </header>

      <AsyncContent :is-loading="isLoading" :error="loadError" @retry="loadContent()">
        <template v-if="editorStore.content">
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

        <!-- Export Preview -->
        <div v-if="exportHtml" class="action-overlay" @click.self="exportHtml = null">
          <ExportPreview
            :html="exportHtml"
            :slug="slug"
            @close="exportHtml = null"
          />
        </div>

        <div v-if="actionError" class="action-error">
          {{ actionError }}
        </div>
        </template>

        <div v-else class="empty-state">
          <p>Aucun contenu &agrave; &eacute;diter. G&eacute;n&eacute;rez d'abord un article depuis le workflow.</p>
          <RouterLink :to="backLink" class="btn-back">Retour au workflow</RouterLink>
        </div>
      </AsyncContent>
    </div>

    <Transition name="panel-slide">
      <ResizablePanel v-if="hasActivePanel" :key="activePanel!">
        <SeoPanel v-if="showSeoPanel" />
        <GeoPanel v-if="showGeoPanel" />
        <LinkSuggestions
          v-if="showLinkSuggestions"
          :suggestions="linkSuggestions"
          :is-suggesting="isSuggesting"
          @accept="handleAcceptSuggestion"
          @dismiss="handleDismissSuggestion"
          @request="requestSuggestions"
          @close="handleCloseLinkSuggestions"
        />
      </ResizablePanel>
    </Transition>
  </div>
</template>

<style scoped>
.article-editor-layout {
  display: flex;
}

.article-editor-view {
  flex: 1;
  min-width: 480px;
  padding: 2rem;
}

/* --- Header restructuré en 3 groupes --- */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-center {
  display: flex;
  gap: 2px;
  background: var(--color-bg-soft);
  border-radius: 6px;
  padding: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.back-link {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.back-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

/* --- Toggle buttons (segment control) --- */
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

/* --- Save button --- */
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
  background: var(--color-primary-hover);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Overlays --- */
.action-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  z-index: 50;
}

.action-error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-error-bg);
  color: var(--color-error);
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

/* --- Panel slide transition --- */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: width 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  width: 0 !important;
  opacity: 0;
  padding-left: 0;
  padding-right: 0;
}

/* --- Responsive: drawer on tablet --- */
@media (max-width: 1200px) {
  .article-editor-view {
    min-width: unset;
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .article-editor-view {
    padding: 1rem;
  }

  .editor-header {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .header-left,
  .header-right {
    flex: 1 1 auto;
  }

  .header-center {
    order: 3;
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
