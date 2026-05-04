<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/article/editor.store'
import { useAutoSave } from '@/composables/editor/useAutoSave'
import { useContextualActions } from '@/composables/editor/useContextualActions'
import { apiGet } from '@/services/api.service'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import ArticleEditor from '@/components/editor/ArticleEditor.vue'
import EditorBubbleMenu from '@/components/editor/EditorBubbleMenu.vue'
import SaveStatusIndicator from '@/components/editor/SaveStatusIndicator.vue'
import ArticleEditorActionOverlays from '@/components/article/ArticleEditorActionOverlays.vue'
// Vague 4 — sous-composants/composable factorisés (partagés avec ArticleWorkflowView)
import { useArticleGeneration } from '@/composables/article/useArticleGeneration'
import ArticlePanelsToolbar from '@/components/article/ArticlePanelsToolbar.vue'
import ArticlePanelsResizable from '@/components/article/ArticlePanelsResizable.vue'
import SectionProgressBar from '@/components/article/SectionProgressBar.vue'
import { useArticlesStore } from '@/stores/article/articles.store'
import { useKeywordsStore } from '@/stores/keyword/keywords.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useBriefStore } from '@/stores/strategy/brief.store'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useSeoScoring } from '@/composables/seo/useSeoScoring'
import { useGeoScoring } from '@/composables/seo/useGeoScoring'
import { useInternalLinking } from '@/composables/seo/useInternalLinking'
import { usePanelToggle } from '@/composables/ui/usePanelToggle'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import ResizablePanel from '@/components/panels/ResizablePanel.vue'
import ArticleMetaDisplay from '@/components/article/ArticleMetaDisplay.vue'
import ArticleActions from '@/components/article/ArticleActions.vue'
import ArticleStreamDisplay from '@/components/article/ArticleStreamDisplay.vue'
import OutlineRecap from '@/components/article/OutlineRecap.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import { useOutlineStore } from '@/stores/article/outline.store'
import { useKeyboardShortcuts } from '@/composables/ui/useKeyboardShortcuts'
import type { ArticleContent, ActionType, Article, LinkSuggestion } from '@shared/types/index.js'
import { log } from '@/utils/logger'

const route = useRoute()
const editorStore = useEditorStore()
const articlesStore = useArticlesStore()
const keywordsStore = useKeywordsStore()
const articleKeywordsStore = useArticleKeywordsStore()
const briefStore = useBriefStore()
const cocoonsStore = useCocoonsStore()
const outlineStore = useOutlineStore()

// --- Article ID from route ---
const articleId = ref<number | null>(null)
const slugResolutionError = ref<string | null>(null)

{
  const raw = Number(route.params.articleId)
  if (!isNaN(raw) && raw > 0) {
    articleId.value = raw
  } else {
    slugResolutionError.value = `Article ID "${route.params.articleId}" invalide`
  }
}

const cocoonId = computed(() => {
  const cocoonName = briefStore.briefData?.article.cocoonName
  return cocoonsStore.cocoons.find(c => c.name === cocoonName)?.id ?? null
})
const backLink = computed(() =>
  cocoonId.value ? `/cocoon/${cocoonId.value}/article/${articleId.value}` : '/',
)

const { activePanel, toggle, showSeoPanel, showGeoPanel, showLinkSuggestions, showBlocksPanel, hasActivePanel } = usePanelToggle('blocks')
async function handlePreview() {
  if (!articleId.value) return
  if (editorStore.isDirty) {
    await editorStore.saveArticle(articleId.value)
  }
  window.open(`/article/${articleId.value}/preview`, '_blank')
}

// --- Body gating for panels (same pattern as WorkflowView) ---
const hasBody = computed(() => !!editorStore.content)

function guardedToggle(panel: Parameters<typeof toggle>[0]) {
  if (!hasBody.value && (panel === 'seo' || panel === 'geo' || panel === 'linking' || panel === 'blocks')) return
  toggle(panel)
}

// --- Generation data (Vague 4 — extracted to useArticleGeneration) ---
const {
  canReduce,
  wordCountDeltaDisplay,
  handleGenerateArticle,
  handleReduce,
  handleHumanize,
  handleAbortReduce,
  handleAbortHumanize,
} = useArticleGeneration({
  articleId,
  editorStore,
  briefStore,
  outlineStore,
  articleKeywordsStore,
})

const {
  suggestions: linkSuggestions,
  isSuggesting,
  requestSuggestions,
  applySuggestion,
  dismissSuggestion,
  clearSuggestions,
} = useInternalLinking(computed(() => articleId.value ?? 0))
useSeoScoring(
  () => keywordsStore.keywords,
  () => briefStore.briefData?.contentLengthRecommendation ?? undefined,
  () => briefStore.briefData?.dataForSeo?.relatedKeywords ?? [],
  () => articleKeywordsStore.keywords,
)
useGeoScoring()
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const articleEditorRef = ref<InstanceType<typeof ArticleEditor> | null>(null)

const showActionMenu = ref(false)
const showActionResult = ref(false)

// useAutoSave is initialized in onMounted

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

useKeyboardShortcuts([
  {
    keys: 'ctrl+s',
    global: true,
    action: () => {
      if (articleId.value && editorStore.isDirty && !editorStore.isSaving) {
        editorStore.saveArticle(articleId.value)
      }
    },
  },
  {
    keys: 'escape',
    global: true,
    action: () => {
      if (hasActivePanel.value) toggle(activePanel.value!)
    },
  },
])

async function loadContent() {
  if (!articleId.value) return
  const id = articleId.value
  isLoading.value = true
  loadError.value = null

  try {
    log.info('Loading article content', { articleId: id })
    const data = await apiGet<ArticleContent>(`/articles/${id}/content`)
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
    if (data.outline) {
      const outline = typeof data.outline === 'string' ? JSON.parse(data.outline) : data.outline
      outlineStore.loadExistingOutline(outline)
    }
    log.info('Article content loaded', { articleId: id })
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
    log.error('Failed to load article content', { articleId: id, error: (err as Error).message })
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

  log.info('Executing contextual action', { actionType, articleId: articleId.value })
  await executeAction(actionType, selectedText, { articleId: articleId.value! }, editor)
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
  if (!hasBody.value) return
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

// (handleGenerateArticle, handleReduce, handleHumanize, handleAbort*,
//  currentKeyword, allKeywords moved to useArticleGeneration above)

async function handleDeleteContent() {
  if (!articleId.value) return
  if (!confirm('Supprimer le contenu de l\'article ? Le brief et le sommaire seront conservés.')) return
  log.info('[editor-view] Deleting article content', { articleId: articleId.value })
  editorStore.$patch({
    content: null,
    streamedText: '',
    metaTitle: null,
    metaDescription: null,
    isDirty: false,
  })
  await editorStore.saveArticle(articleId.value)
}

onBeforeUnmount(() => {
  editorStore.abortHumanize()
})

onMounted(async () => {
  if (!articleId.value) return
  const id = articleId.value
  log.info('ArticleEditorView mounted', { articleId: id })

  // Initialize auto-save
  useAutoSave(id)

  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }
  await articleKeywordsStore.fetchKeywords(id)
  briefStore.fetchBrief(id)
  loadContent()
})
</script>

<template>
  <div class="article-editor-layout">
    <!-- Slug resolution error -->
    <div v-if="slugResolutionError" class="slug-error">
      <p>{{ slugResolutionError }}</p>
      <RouterLink to="/" class="back-link">&larr; Retour au dashboard</RouterLink>
    </div>

    <template v-else>
    <div class="article-editor-view">
      <header class="editor-header">
        <div class="header-left">
          <RouterLink :to="backLink" class="back-link">&larr; Retour</RouterLink>
          <SaveStatusIndicator />
        </div>

        <div class="header-center">
          <ArticlePanelsToolbar
            :has-body="hasBody"
            :show-seo-panel="showSeoPanel"
            :show-geo-panel="showGeoPanel"
            :show-link-suggestions="showLinkSuggestions"
            :show-blocks-button="true"
            :show-blocks-panel="showBlocksPanel"
            @toggle-seo="guardedToggle('seo')"
            @toggle-geo="guardedToggle('geo')"
            @toggle-linking="handleToggleLinkSuggestions"
            @toggle-blocks="guardedToggle('blocks')"
          />
        </div>

        <div class="header-right">
          <button
            v-if="hasBody"
            class="btn-delete-content"
            title="Supprimer le contenu (conserve le brief et le sommaire)"
            :disabled="editorStore.isGenerating || editorStore.isSaving"
            @click="handleDeleteContent"
          >
            Supprimer le contenu
          </button>
          <button
            class="btn-save"
            aria-label="Sauvegarder (Ctrl+S)"
            :disabled="!editorStore.isDirty || editorStore.isSaving"
            @click="articleId && editorStore.saveArticle(articleId)"
          >
            Sauvegarder
          </button>
          <button
            v-if="hasBody && editorStore.metaTitle && editorStore.metaDescription"
            class="btn-preview"
            :disabled="editorStore.isSaving"
            @click="handlePreview"
          >
            Visualiser l'article
          </button>
        </div>
      </header>

      <CollapsableSection
        v-if="editorStore.metaTitle || editorStore.metaDescription"
        title="Meta SEO"
        :default-open="false"
      >
        <ArticleMetaDisplay
          :meta-title="editorStore.metaTitle"
          :meta-description="editorStore.metaDescription"
          :is-generating="editorStore.isGeneratingMeta"
        />
      </CollapsableSection>

      <CollapsableSection
        v-if="outlineStore.outline"
        title="Table des matières"
        :default-open="false"
      >
        <OutlineRecap :outline="outlineStore.outline" />
      </CollapsableSection>

      <AsyncContent :is-loading="isLoading" :error="loadError" @retry="loadContent()">

        <!-- STATE 1: No content, not generating → show generate button -->
        <div v-if="!editorStore.content && !editorStore.isGenerating" class="empty-state">
          <p>Aucun contenu. Générez l'article ou retournez au workflow.</p>
          <ArticleActions
            :is-generating="false"
            :has-content="false"
            :is-outline-validated="!!outlineStore.outline"
            :is-reducing="false"
            :is-humanizing="false"
            :can-reduce="false"
            :word-count-delta="null"
            :humanize-progress="null"
            :reduce-progress="null"
            @generate="handleGenerateArticle()"
          />
          <RouterLink :to="backLink" class="btn-back">Retour au workflow</RouterLink>
        </div>

        <!-- STATE 2: Generating → streaming read-only display -->
        <div v-else-if="editorStore.isGenerating" class="generation-view">
          <ArticleActions
            :is-generating="true"
            :has-content="false"
            :is-outline-validated="true"
            :is-reducing="false"
            :is-humanizing="false"
            :can-reduce="false"
            :word-count-delta="null"
            :humanize-progress="null"
            :reduce-progress="null"
          />

          <SectionProgressBar
            v-if="editorStore.sectionProgress"
            :current="editorStore.sectionProgress.current"
            :total="editorStore.sectionProgress.total"
            :title="editorStore.sectionProgress.title"
          />

          <ErrorBoundary fallback-message="Erreur dans le contenu de l'article.">
            <ArticleStreamDisplay
              :streamed-text="editorStore.streamedText"
              :content="null"
              :is-generating="true"
            />
          </ErrorBoundary>
        </div>

        <!-- STATE 3: Content exists → TipTap editor -->
        <template v-else>
        <div class="editor-actions-bar">
          <ArticleActions
            :is-generating="editorStore.isGenerating"
            :has-content="true"
            :is-outline-validated="true"
            :is-reducing="editorStore.isReducing"
            :is-humanizing="editorStore.isHumanizing"
            :can-reduce="canReduce"
            :word-count-delta="wordCountDeltaDisplay"
            :humanize-progress="editorStore.humanizeProgress"
            :reduce-progress="editorStore.reduceProgress"
            @generate="handleGenerateArticle()"
            @regenerate="handleGenerateArticle()"
            @reduce="handleReduce()"
            @abort-reduce="handleAbortReduce()"
            @humanize="handleHumanize()"
            @abort-humanize="handleAbortHumanize()"
          />
          <label class="web-search-toggle">
            <input
              v-model="editorStore.webSearchEnabled"
              type="checkbox"
              :disabled="editorStore.isGenerating"
            />
            Recherche web
          </label>
        </div>
        <EditorToolbar :editor="articleEditorRef?.editor" />

        <EditorBubbleMenu
          v-if="articleEditorRef?.editor"
          :editor="articleEditorRef.editor"
          @open-actions="handleOpenActions"
        />

        <ArticleEditor
          ref="articleEditorRef"
          :content="editorStore.content ?? ''"
          :article-id="articleId ?? 0"
          :keyword="articleKeywordsStore.keywords?.capitaine"
          :keywords="articleKeywordsStore.keywords?.lieutenants ?? []"
          @update:content="handleContentUpdate"
        />

        <ArticleEditorActionOverlays
          :show-action-menu="showActionMenu"
          :show-action-result="showActionResult"
          :show-article-picker="showArticlePicker"
          :is-executing="isExecuting"
          :is-streaming="isStreaming"
          :streamed-result="streamedResult"
          :articles="articlesStore.articles.filter(a => a.id !== articleId)"
          :action-error="actionError"
          @close-menu="showActionMenu = false"
          @select-action="handleSelectAction"
          @accept-result="handleAcceptResult"
          @reject-result="handleRejectResult"
          @select-article="handleSelectArticle"
          @cancel-link="handleCancelLink"
        />
        </template>

      </AsyncContent>
    </div>

    <Transition name="panel-slide">
      <ResizablePanel v-if="hasActivePanel" :key="activePanel!">
        <ArticlePanelsResizable
          :has-body="hasBody"
          :show-seo-panel="showSeoPanel"
          :show-geo-panel="showGeoPanel"
          :show-link-suggestions="showLinkSuggestions"
          :show-blocks-panel="showBlocksPanel"
          :link-suggestions="linkSuggestions"
          :is-suggesting="isSuggesting"
          @accept-suggestion="handleAcceptSuggestion"
          @dismiss-suggestion="handleDismissSuggestion"
          @request-suggestions="requestSuggestions"
          @close-link-suggestions="handleCloseLinkSuggestions"
        />
      </ResizablePanel>
    </Transition>
    </template>
  </div>
</template>

<style scoped>
.slug-error {
  text-align: center;
  padding: 3rem;
  color: var(--color-error, #e53e3e);
}

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

.btn-toggle.disabled,
.btn-toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Delete content button --- */
.btn-delete-content {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-error, #e53e3e);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: transparent;
  color: var(--color-error, #e53e3e);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-delete-content:hover:not(:disabled) {
  background: var(--color-error, #e53e3e);
  color: white;
}

.btn-delete-content:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

/* --- Preview button --- */
.btn-preview {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: transparent;
  color: var(--color-success);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-preview:hover:not(:disabled) {
  background: var(--color-success);
  color: white;
}

.btn-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

.editor-actions-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.web-search-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
}
.web-search-toggle input { cursor: pointer; }

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

/* --- Generation view --- */
.generation-view {
  padding: 1rem 0;
}

/* --- Panel disabled overlay --- */
.panel-disabled-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(2px);
}

.panel-disabled-msg {
  margin: 0;
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  background: var(--color-bg-elevated);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
