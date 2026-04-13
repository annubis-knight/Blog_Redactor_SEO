<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
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
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useBriefStore } from '@/stores/brief.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useSeoScoring } from '@/composables/useSeoScoring'
import { useGeoScoring } from '@/composables/useGeoScoring'
import { useInternalLinking } from '@/composables/useInternalLinking'
import { usePanelToggle } from '@/composables/usePanelToggle'
import SeoPanel from '@/components/panels/SeoPanel.vue'
import GeoPanel from '@/components/panels/GeoPanel.vue'
import BlocksPanel from '@/components/panels/BlocksPanel.vue'
import LinkSuggestions from '@/components/linking/LinkSuggestions.vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import ResizablePanel from '@/components/panels/ResizablePanel.vue'
import ExportButton from '@/components/export/ExportButton.vue'
import ExportPreview from '@/components/export/ExportPreview.vue'
import ArticleMetaDisplay from '@/components/article/ArticleMetaDisplay.vue'
import ArticleActions from '@/components/article/ArticleActions.vue'
import ArticleStreamDisplay from '@/components/article/ArticleStreamDisplay.vue'
import OutlineRecap from '@/components/article/OutlineRecap.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import { useOutlineStore } from '@/stores/outline.store'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
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

const slug = route.params.slug as string

const cocoonId = computed(() => {
  const cocoonName = briefStore.briefData?.article.cocoonName
  return cocoonsStore.cocoons.find(c => c.name === cocoonName)?.id ?? null
})
const backLink = computed(() =>
  cocoonId.value ? `/cocoon/${cocoonId.value}/article/${slug}` : '/',
)

const { activePanel, toggle, showSeoPanel, showGeoPanel, showLinkSuggestions, showBlocksPanel, hasActivePanel } = usePanelToggle('blocks')
const exportHtml = ref<string | null>(null)

// --- Body gating for panels (same pattern as WorkflowView) ---
const hasBody = computed(() => !!editorStore.content)

function guardedToggle(panel: Parameters<typeof toggle>[0]) {
  if (!hasBody.value && (panel === 'seo' || panel === 'geo' || panel === 'linking' || panel === 'blocks')) return
  toggle(panel)
}

// --- Generation data (reused from WorkflowView) ---
const wordCountTarget = computed(() => briefStore.briefData?.contentLengthRecommendation ?? null)
const canReduce = computed(() => {
  if (!wordCountTarget.value || !editorStore.content) return false
  const delta = editorStore.wordCountDelta(wordCountTarget.value)
  if (delta === null) return false
  return (delta / wordCountTarget.value) * 100 > 15
})
const wordCountDeltaDisplay = computed(() => editorStore.wordCountDelta(wordCountTarget.value))
const currentKeyword = computed(() =>
  articleKeywordsStore.keywords?.capitaine ?? briefStore.briefData?.article.title ?? '',
)
const allKeywords = computed(() =>
  briefStore.briefData?.keywords.map(kw => kw.keyword) ?? [],
)

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
  () => articleKeywordsStore.keywords,
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

useKeyboardShortcuts([
  {
    keys: 'ctrl+s',
    global: true,
    action: () => {
      if (editorStore.isDirty && !editorStore.isSaving) {
        editorStore.saveArticle(slug)
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
  isLoading.value = true
  loadError.value = null

  try {
    log.info('Loading article content', { slug })
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
    if (data.outline) {
      outlineStore.loadExistingOutline(JSON.parse(data.outline))
    }
    log.info('Article content loaded', { slug })
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
    log.error('Failed to load article content', { slug, error: (err as Error).message })
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

  log.info('Executing contextual action', { actionType, slug })
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

// --- Article generation handlers ---
async function handleGenerateArticle() {
  if (!briefStore.briefData || !outlineStore.outline) return
  log.info('[editor-view] Starting article generation', { slug })

  await editorStore.generateArticle(briefStore.briefData, outlineStore.outline, wordCountTarget.value ?? undefined)

  if (editorStore.content && !editorStore.error) {
    const keyword = briefStore.briefData.keywords.find(kw => kw.type === 'Pilier')?.keyword
      ?? briefStore.briefData.article.title
    await editorStore.generateMeta(slug, keyword, briefStore.briefData.article.title, editorStore.content)
    if (!editorStore.error) {
      await editorStore.saveArticle(slug)
    }
  }
}

async function handleReduce() {
  if (!wordCountTarget.value) return
  await editorStore.reduceArticle(slug, wordCountTarget.value, currentKeyword.value, allKeywords.value)
  if (editorStore.content && !editorStore.error) {
    await editorStore.saveArticle(slug)
  }
}

async function handleHumanize() {
  await editorStore.humanizeArticle(slug, currentKeyword.value, allKeywords.value)
  if (editorStore.content && !editorStore.error) {
    await editorStore.saveArticle(slug)
  }
}

function handleAbortHumanize() {
  editorStore.abortHumanize()
}

async function handleDeleteContent() {
  if (!confirm('Supprimer le contenu de l\'article ? Le brief et le sommaire seront conservés.')) return
  log.info('[editor-view] Deleting article content', { slug })
  editorStore.$patch({
    content: null,
    streamedText: '',
    metaTitle: null,
    metaDescription: null,
    isDirty: false,
  })
  await editorStore.saveArticle(slug)
}

onBeforeUnmount(() => {
  editorStore.abortHumanize()
})

onMounted(async () => {
  log.info('ArticleEditorView mounted', { slug })
  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }
  await articleKeywordsStore.fetchKeywords(slug)
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
            :class="{ active: showSeoPanel, disabled: !hasBody }"
            :aria-pressed="showSeoPanel"
            :disabled="!hasBody"
            :title="!hasBody ? 'Générez un article pour activer le scoring SEO' : undefined"
            @click="guardedToggle('seo')"
          >
            SEO
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showGeoPanel, disabled: !hasBody }"
            :aria-pressed="showGeoPanel"
            :disabled="!hasBody"
            :title="!hasBody ? 'Générez un article pour activer le scoring GEO' : undefined"
            @click="guardedToggle('geo')"
          >
            GEO
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showLinkSuggestions, disabled: !hasBody }"
            :aria-pressed="showLinkSuggestions"
            :disabled="!hasBody"
            :title="!hasBody ? 'Générez un article pour activer le maillage' : undefined"
            @click="handleToggleLinkSuggestions"
          >
            Maillage
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showBlocksPanel, disabled: !hasBody }"
            :aria-pressed="showBlocksPanel"
            :disabled="!hasBody"
            :title="!hasBody ? 'Générez un article pour activer les blocs' : undefined"
            @click="guardedToggle('blocks')"
          >
            Blocs
          </button>
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
            @click="editorStore.saveArticle(slug)"
          >
            Sauvegarder
          </button>
          <ExportButton :slug="slug" @export-ready="exportHtml = $event" />
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
          />

          <div v-if="editorStore.sectionProgress" class="section-progress">
            <div class="section-progress-header">
              <span class="section-progress-label">
                Section {{ editorStore.sectionProgress.current + 1 }}/{{ editorStore.sectionProgress.total }}
              </span>
              <span class="section-progress-title">{{ editorStore.sectionProgress.title }}</span>
            </div>
            <div class="section-progress-bar">
              <div
                class="section-progress-fill"
                :style="{ width: ((editorStore.sectionProgress.current + 1) / editorStore.sectionProgress.total * 100) + '%' }"
              />
            </div>
          </div>

          <ErrorBoundary fallback-message="Erreur dans le contenu de l'article.">
            <ArticleStreamDisplay
              :streamed-text="editorStore.streamedText"
              :content="null"
              :is-generating="true"
            />
          </ErrorBoundary>
        </div>

        <!-- STATE 3: Content exists → TipTap editor (unchanged) -->
        <template v-else>
        <EditorToolbar :editor="articleEditorRef?.editor" />

        <EditorBubbleMenu
          v-if="articleEditorRef?.editor"
          :editor="articleEditorRef.editor"
          @open-actions="handleOpenActions"
        />

        <ArticleEditor
          ref="articleEditorRef"
          :content="editorStore.content"
          :article-slug="slug"
          :keyword="articleKeywordsStore.keywords?.capitaine"
          :keywords="articleKeywordsStore.keywords?.lieutenants ?? []"
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

      </AsyncContent>
    </div>

    <Transition name="panel-slide">
      <ResizablePanel v-if="hasActivePanel" :key="activePanel!">
        <div v-if="!hasBody && (showSeoPanel || showGeoPanel || showLinkSuggestions || showBlocksPanel)" class="panel-disabled-overlay">
          <p class="panel-disabled-msg">Générez un article pour activer ce panneau</p>
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
            @accept="handleAcceptSuggestion"
            @dismiss="handleDismissSuggestion"
            @request="requestSuggestions"
            @close="handleCloseLinkSuggestions"
          />
        </ErrorBoundary>
        <ErrorBoundary v-if="showBlocksPanel" fallback-message="Erreur dans le panneau blocs.">
          <BlocksPanel />
        </ErrorBoundary>
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

/* --- Generation view --- */
.generation-view {
  padding: 1rem 0;
}

/* --- Section progress bar --- */
.section-progress {
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.section-progress-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.section-progress-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.section-progress-title {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-progress-bar {
  height: 4px;
  background: var(--color-bg-soft);
  border-radius: 2px;
  overflow: hidden;
}

.section-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
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
