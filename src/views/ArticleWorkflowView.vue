<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkflowNavStore } from '@/stores/ui/workflow-nav.store'
import type { NavItem } from '@/components/shared/WorkflowNav.vue'
import { useBriefStore } from '@/stores/strategy/brief.store'
import { useOutlineStore } from '@/stores/article/outline.store'
import { useEditorStore } from '@/stores/article/editor.store'
import { useKeywordsStore } from '@/stores/keyword/keywords.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useStrategyStore } from '@/stores/strategy/strategy.store'
import { apiGet } from '@/services/api.service'
import { usePanelToggle } from '@/composables/ui/usePanelToggle'
import { useSeoScoring } from '@/composables/seo/useSeoScoring'
import { useGeoScoring } from '@/composables/seo/useGeoScoring'
import { useInternalLinking } from '@/composables/seo/useInternalLinking'
import { useStreaming } from '@/composables/editor/useStreaming'
import { marked } from 'marked'
import type { ArticleContent } from '@shared/types/index.js'
import { log } from '@/utils/logger'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import BriefStructureStep from '@/components/workflow/BriefStructureStep.vue'
import ArticleActions from '@/components/article/ArticleActions.vue'
import ArticleStreamDisplay from '@/components/article/ArticleStreamDisplay.vue'
import ArticleMetaDisplay from '@/components/article/ArticleMetaDisplay.vue'
import OutlineRecap from '@/components/article/OutlineRecap.vue'
import ArticleCostBadges from '@/components/article/ArticleCostBadges.vue'
import ArticleWordCountBar from '@/components/article/ArticleWordCountBar.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import ResizablePanel from '@/components/panels/ResizablePanel.vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import SkeletonText from '@/components/shared/SkeletonText.vue'
import { useKeyboardShortcuts } from '@/composables/ui/useKeyboardShortcuts'
// Vague 4 — sous-composants/composable factorisés (partagés avec ArticleEditorView)
import { useArticleGeneration } from '@/composables/article/useArticleGeneration'
import ArticlePanelsToolbar from '@/components/article/ArticlePanelsToolbar.vue'
import ArticlePanelsResizable from '@/components/article/ArticlePanelsResizable.vue'
import ArticleWorkflowIaBrief from '@/components/article/ArticleWorkflowIaBrief.vue'
import SectionProgressBar from '@/components/article/SectionProgressBar.vue'

const route = useRoute()
const briefStore = useBriefStore()
const outlineStore = useOutlineStore()
const editorStore = useEditorStore()
const keywordsStore = useKeywordsStore()
const articleKeywordsStore = useArticleKeywordsStore()
const cocoonsStore = useCocoonsStore()
const strategyStore = useStrategyStore()

const cocoonId = route.params.cocoonId as string | undefined

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

// --- Back link to cocoon redaction or dashboard ---
const backLink = computed(() =>
  cocoonId ? `/cocoon/${cocoonId}/redaction` : '/',
)
const backLabel = computed(() =>
  cocoonId ? 'Retour à la rédaction' : 'Retour au dashboard',
)

// --- Strategy context lookups ---
const cocoonName = computed(() => briefStore.briefData?.article.cocoonName ?? '')
const articleTitle = computed(() => briefStore.briefData?.article.title ?? '')
const siloName = computed(() => {
  const cocoon = cocoonsStore.cocoons.find(c => c.name === cocoonName.value)
  return cocoon?.siloName ?? ''
})

// --- Linear workflow step tracker (2 steps) ---
const currentStep = ref<'brief-structure' | 'article'>('brief-structure')

const steps = [
  { id: 'brief-structure' as const, number: 1, label: 'Brief & Structure' },
  { id: 'article' as const, number: 2, label: 'Article' },
]

function goToStep(step: typeof currentStep.value) {
  currentStep.value = step
}

function _isStepCompleted(stepId: string): boolean {
  const stepOrder = steps.map(s => s.id)
  const currentIdx = stepOrder.indexOf(currentStep.value)
  const stepIdx = stepOrder.indexOf(stepId as any)
  return stepIdx < currentIdx
}

// --- Body gating for scoring panels ---
const hasBody = computed(() => !!editorStore.content)

const { activePanel, toggle, showSeoPanel, showGeoPanel, showLinkSuggestions, showIaBriefPanel, hasActivePanel } = usePanelToggle('seo')

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

function guardedToggle(panel: Parameters<typeof toggle>[0]) {
  if (!hasBody.value && (panel === 'seo' || panel === 'geo' || panel === 'linking')) return
  toggle(panel)
}

const {
  suggestions: linkSuggestions,
  isSuggesting,
  requestSuggestions,
  dismissSuggestion,
  clearSuggestions,
} = useInternalLinking(computed(() => articleId.value ?? 0))

// Scoring composables — watch editorStore.content reactively
const { seoStore: _seoStore } = useSeoScoring(
  () => keywordsStore.keywords.length > 0 ? keywordsStore.keywords : (briefStore.briefData?.keywords ?? []),
  () => briefStore.briefData?.contentLengthRecommendation ?? undefined,
  () => briefStore.briefData?.dataForSeo?.relatedKeywords ?? [],
  () => articleKeywordsStore.keywords,
)
useGeoScoring()

// --- Article generation (Vague 4 — extracted to useArticleGeneration) ---
const {
  wordCountTarget,
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

// (wordCountPercent moved into ArticleWordCountBar sub-component)

// --- IA Brief Panel ---
const { chunks: iaBriefChunks, isStreaming: iaBriefStreaming, startStream: startBriefExplain } = useStreaming()
const iaBriefTriggered = ref(false)

const parsedBriefMarkdown = computed(() => {
  if (!iaBriefChunks.value) return ''
  return marked.parse(iaBriefChunks.value) as string
})

function triggerBriefExplain() {
  if (!articleId.value) return
  iaBriefTriggered.value = true
  const dfs = briefStore.briefData?.dataForSeo
  startBriefExplain('/api/generate/brief-explain', {
    articleId: articleId.value,
    articleTitle: articleTitle.value,
    keyword: articleKeywordsStore.keywords?.capitaine ?? articleTitle.value,
    cocoonName: cocoonName.value,
    articleType: briefStore.briefData?.article.type ?? 'Spécialisé',
    keywords: articleKeywordsStore.keywords?.lieutenants ?? [],
    lexique: articleKeywordsStore.keywords?.lexique ?? [],
    hnStructure: articleKeywordsStore.keywords?.hnStructure ?? [],
    paaQuestions: dfs?.paa?.map(p => p.question) ?? [],
    topCompetitors: dfs?.serp?.slice(0, 5).map(s => ({ title: s.title, domain: s.domain })) ?? [],
    cocoonArticles: briefStore.briefData?.article.cocoonName
      ? cocoonsStore.cocoons
          .find(c => c.name === briefStore.briefData!.article.cocoonName)
          ?.articles.filter(a => a.id !== articleId.value).map(a => a.title) ?? []
      : [],
  })
}

function handleToggleIaBrief() {
  toggle('ia-brief')
  if (showIaBriefPanel.value && !iaBriefTriggered.value) {
    triggerBriefExplain()
  }
}

// (handleGenerateArticle, handleReduce, handleHumanize, handleAbort*,
//  currentKeyword, allKeywords moved to useArticleGeneration above)

onBeforeUnmount(() => {
  editorStore.abortReduce()
  editorStore.abortHumanize()
})

function handleToggleLinkSuggestions() {
  if (!hasBody.value) return
  toggle('linking')
  if (showLinkSuggestions.value && linkSuggestions.value.length === 0) {
    requestSuggestions()
  }
}

function handleCloseLinkSuggestions() {
  toggle('linking')
  clearSuggestions()
}

onMounted(async () => {
  if (!articleId.value) return
  const id = articleId.value
  log.info('[workflow] ArticleWorkflowView mounted', { articleId: id })

  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }

  // Fetch article keywords (await to ensure they're ready before SEO scoring)
  await articleKeywordsStore.fetchKeywords(id)
  log.info('[workflow] Article keywords loaded', {
    hasKeywords: articleKeywordsStore.hasKeywords,
    capitaine: articleKeywordsStore.keywords?.capitaine,
    lieutenants: articleKeywordsStore.keywords?.lieutenants.length,
    lexique: articleKeywordsStore.keywords?.lexique.length,
  })

  await briefStore.fetchBrief(id)
  log.info('[workflow] Brief loaded', {
    articleId: id,
    briefKeywords: briefStore.briefData?.keywords.length,
    briefKeywordsList: briefStore.briefData?.keywords.map(k => k.keyword).join(', '),
  })

  // FR-RED-GEN-UNLOCK : hydrate la stratégie Cerveau pour piloter le verrouillage
  // de l'étape « Article » (génération). Pas await — le gating se met à jour
  // réactivement dès que `strategyStore.strategy` est posé.
  void strategyStore.fetchStrategy(id)

  // Hydrate outline & editor stores with existing saved content
  try {
    log.info('[workflow] Loading saved article content', { articleId: id })
    const saved = await apiGet<ArticleContent>(`/articles/${id}/content`)
    if (saved.outline) {
      const outline = typeof saved.outline === 'string' ? JSON.parse(saved.outline) : saved.outline
      outlineStore.loadExistingOutline(outline)
    }
    if (saved.content) {
      editorStore.loadExistingContent({
        content: saved.content,
        metaTitle: saved.metaTitle,
        metaDescription: saved.metaDescription,
      })
    }
    log.info('[workflow] Saved content hydrated', {
      articleId: id,
      hasOutline: !!saved.outline,
      hasContent: !!saved.content,
      contentLength: saved.content?.length,
      metaTitle: saved.metaTitle,
    })
  } catch (err) {
    log.warn('[workflow] No saved content found, starting fresh', { articleId: id, error: (err as Error).message })
  }
})

// --- AppNavbar integration ---
// Rédaction = 2 linear steps. L'étape « Article » est verrouillée tant que
// la stratégie Cerveau n'est pas complète (6 étapes validées) — cf.
// FR-RED-GEN-UNLOCK. Les checks `redaction:*` historiques ont été retirés
// 2026-05-13 (cf. DRIFT-002) ; le signal de déverrouillage est désormais lu
// directement sur `article_strategies.completed_steps` via useStrategyStore.
const workflowNavStore = useWorkflowNavStore()

const REDACTION_STEPS: { id: 'brief-structure' | 'article'; label: string }[] = [
  { id: 'brief-structure', label: 'Brief & Structure' },
  { id: 'article',         label: 'Article' },
]

const redactionNavSteps = computed<NavItem[]>(() => {
  const cerveauComplete = strategyStore.isComplete
  return REDACTION_STEPS.map((s, idx) => ({
    id: s.id,
    label: s.label,
    number: idx + 1,
    done: false,
    locked: s.id === 'article' && !cerveauComplete,
    hint: s.id === 'article' && !cerveauComplete
      ? 'Complétez le Cerveau pour générer cet article'
      : undefined,
  }))
})

watch(
  [redactionNavSteps, currentStep],
  ([steps, active]) => {
    workflowNavStore.setWorkflowNav({
      workflow: 'redaction',
      activeId: active,
      steps,
      onNavigate: (id: string) => goToStep(id as typeof currentStep.value),
    })
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => { workflowNavStore.clearWorkflowNav() })
</script>

<template>
  <div class="workflow-layout">
    <div class="workflow-main">
      <div class="workflow-header">
        <RouterLink :to="backLink" class="back-link">&larr; {{ backLabel }}</RouterLink>
        <ArticlePanelsToolbar
          :has-body="hasBody"
          :show-seo-panel="showSeoPanel"
          :show-geo-panel="showGeoPanel"
          :show-link-suggestions="showLinkSuggestions"
          :show-ia-brief-button="true"
          :show-ia-brief-panel="showIaBriefPanel"
          @toggle-seo="guardedToggle('seo')"
          @toggle-geo="guardedToggle('geo')"
          @toggle-linking="handleToggleLinkSuggestions"
          @toggle-ia-brief="handleToggleIaBrief"
        />
      </div>

      <!-- Slug resolution error -->
      <div v-if="slugResolutionError" class="slug-error">
        <p>{{ slugResolutionError }}</p>
        <RouterLink to="/" class="back-link">&larr; Retour au dashboard</RouterLink>
      </div>

      <AsyncContent v-else-if="articleId" :is-loading="briefStore.isLoading" :error="briefStore.error" @retry="briefStore.fetchBrief(articleId!)">
        <template #skeleton>
          <SkeletonText :lines="5" />
        </template>
        <template v-if="briefStore.briefData">
          <!-- Step 1: Brief & Structure -->
          <div v-if="currentStep === 'brief-structure'" class="workflow-step">
            <BriefStructureStep
              :article-id="articleId"
              :cocoon-name="cocoonName"
              :silo-name="siloName"
              :article-title="articleTitle"
              @outline-validated="goToStep('article')"
            />
          </div>

          <!-- Step 2: Article -->
          <div v-if="currentStep === 'article'" class="workflow-step">
            <CollapsableSection title="Article">
              <label class="web-search-toggle">
                <input
                  v-model="editorStore.webSearchEnabled"
                  type="checkbox"
                  :disabled="editorStore.isGenerating"
                />
                Recherche web
              </label>

              <ArticleActions
                :is-generating="editorStore.isGenerating"
                :has-content="!!editorStore.content"
                :is-outline-validated="outlineStore.isValidated"
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

              <SectionProgressBar
                v-if="editorStore.isGenerating && editorStore.sectionProgress"
                :current="editorStore.sectionProgress.current"
                :total="editorStore.sectionProgress.total"
                :title="editorStore.sectionProgress.title"
              />

              <ErrorMessage
                v-if="editorStore.error && !editorStore.isGenerating"
                :message="editorStore.error"
                @retry="handleGenerateArticle()"
              />

              <ArticleMetaDisplay
                :meta-title="editorStore.metaTitle"
                :meta-description="editorStore.metaDescription"
                :is-generating="editorStore.isGeneratingMeta"
              />

              <OutlineRecap :outline="outlineStore.outline" />

              <ErrorBoundary fallback-message="Erreur dans le contenu de l'article.">
                <ArticleStreamDisplay
                  :streamed-text="editorStore.streamedText"
                  :content="editorStore.content"
                  :is-generating="editorStore.isGenerating"
                />
              </ErrorBoundary>

              <ArticleCostBadges
                :article-usage="editorStore.lastArticleUsage"
                :meta-usage="editorStore.lastMetaUsage"
                :reduce-usage="editorStore.lastReduceUsage"
                :humanize-usage="editorStore.lastHumanizeUsage"
              />

              <ArticleWordCountBar
                v-if="editorStore.content"
                :word-count="editorStore.wordCount"
                :target="wordCountTarget"
              />

              <RouterLink
                v-if="editorStore.content && !editorStore.isGenerating"
                :to="`/article/${articleId}/editor`"
                class="btn-edit-article"
              >
                &Eacute;diter l'article
              </RouterLink>
            </CollapsableSection>

            <div class="step-navigation">
              <button class="btn-review-strategy" @click="goToStep('brief-structure')">
                Revoir le Brief
              </button>
            </div>
          </div>
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
          :link-suggestions="linkSuggestions"
          :is-suggesting="isSuggesting"
          @dismiss-suggestion="dismissSuggestion($event)"
          @request-suggestions="requestSuggestions"
          @close-link-suggestions="handleCloseLinkSuggestions"
        />
        <ArticleWorkflowIaBrief
          v-if="showIaBriefPanel"
          :parsed-brief-markdown="parsedBriefMarkdown"
          :ia-brief-streaming="iaBriefStreaming"
          @relaunch="triggerBriefExplain"
        />
      </ResizablePanel>
    </Transition>
  </div>
</template>

<style scoped>
.slug-error {
  text-align: center;
  padding: 3rem;
  color: var(--color-error, #e53e3e);
}

.web-search-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--color-text-muted, #888);
  cursor: pointer;
  margin-bottom: 0.5rem;
}
.web-search-toggle input { cursor: pointer; }

.workflow-layout {
  display: flex;
  width: 100%;
}

.workflow-main {
  flex: 1;
  min-width: 480px;
  padding: 2rem;
}

.workflow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
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

/* --- Workflow stepper moved to AppNavbar (WorkflowNav) — styles dropped. --- */

.workflow-step {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-navigation {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.step-navigation .btn-primary {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--color-primary);
  color: white;
  transition: background 0.15s;
}

.step-navigation .btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-review-strategy {
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-review-strategy:hover {
  color: var(--color-primary);
}

/* --- Toggle buttons (segment control) --- */
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

/* Panel disabled overlay */
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
  border-radius: 8px;
  text-align: center;
}

.btn-edit-article {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  transition: background 0.15s;
}

.btn-edit-article:hover {
  background: var(--color-primary-hover);
  text-decoration: none;
}

/* --- IA Brief panel --- */
.ia-brief-panel {
  padding: 1rem;
}

.ia-brief-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.ia-brief-header h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.btn-relaunch {
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  background: var(--color-bg-soft);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-relaunch:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-relaunch:disabled {
  opacity: 0.6;
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

@media (max-width: 1200px) {
  .workflow-main {
    min-width: unset;
  }
}
</style>
