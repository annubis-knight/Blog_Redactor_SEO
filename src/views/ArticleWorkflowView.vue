<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBriefStore } from '@/stores/brief.store'
import { useOutlineStore } from '@/stores/outline.store'
import { useEditorStore } from '@/stores/editor.store'
import { useKeywordsStore } from '@/stores/keywords.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { apiGet } from '@/services/api.service'
import { usePanelToggle } from '@/composables/usePanelToggle'
import { useSeoScoring } from '@/composables/useSeoScoring'
import { useGeoScoring } from '@/composables/useGeoScoring'
import { useInternalLinking } from '@/composables/useInternalLinking'
import { useStreaming } from '@/composables/useStreaming'
import { marked } from 'marked'
import type { ArticleContent } from '@shared/types/index.js'
import { useArticleProgressStore } from '@/stores/article-progress.store'
import { log } from '@/utils/logger'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import BriefStructureStep from '@/components/workflow/BriefStructureStep.vue'
import ArticleActions from '@/components/article/ArticleActions.vue'
import ArticleStreamDisplay from '@/components/article/ArticleStreamDisplay.vue'
import ArticleMetaDisplay from '@/components/article/ArticleMetaDisplay.vue'
import OutlineRecap from '@/components/article/OutlineRecap.vue'
import ApiCostBadge from '@/components/shared/ApiCostBadge.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import ResizablePanel from '@/components/panels/ResizablePanel.vue'
import SeoPanel from '@/components/panels/SeoPanel.vue'
import GeoPanel from '@/components/panels/GeoPanel.vue'
import LinkSuggestions from '@/components/linking/LinkSuggestions.vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import SkeletonText from '@/components/shared/SkeletonText.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

const route = useRoute()
const briefStore = useBriefStore()
const outlineStore = useOutlineStore()
const editorStore = useEditorStore()
const keywordsStore = useKeywordsStore()
const articleKeywordsStore = useArticleKeywordsStore()
const cocoonsStore = useCocoonsStore()
const articleProgressStore = useArticleProgressStore()

const slug = route.params.slug as string
const cocoonId = route.params.cocoonId as string | undefined

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

function isStepCompleted(stepId: string): boolean {
  const stepOrder = steps.map(s => s.id)
  const currentIdx = stepOrder.indexOf(currentStep.value)
  const stepIdx = stepOrder.indexOf(stepId as any)
  return stepIdx < currentIdx
}

// --- Body gating for scoring panels ---
const hasBody = computed(() => !!editorStore.content)

function handleBriefCheck(check: string) {
  articleProgressStore.addCheck(slug, check)
}

const { activePanel, toggle, showSeoPanel, showGeoPanel, showLinkSuggestions, showIaBriefPanel, hasActivePanel } = usePanelToggle('seo')

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
} = useInternalLinking(slug)

// Scoring composables — watch editorStore.content reactively
const { seoStore } = useSeoScoring(
  () => keywordsStore.keywords.length > 0 ? keywordsStore.keywords : (briefStore.briefData?.keywords ?? []),
  () => briefStore.briefData?.contentLengthRecommendation ?? undefined,
  () => briefStore.briefData?.dataForSeo?.relatedKeywords ?? [],
  () => articleKeywordsStore.keywords,
)
useGeoScoring()

// --- Word count (SSOT from editorStore — finding G5) ---
const wordCountTarget = computed(() => briefStore.briefData?.contentLengthRecommendation ?? null)
const wordCountPercent = computed(() => {
  if (!wordCountTarget.value || !editorStore.wordCount) return 0
  return Math.round((editorStore.wordCount / wordCountTarget.value) * 100)
})
const canReduce = computed(() => {
  if (!wordCountTarget.value || !editorStore.content) return false
  const delta = editorStore.wordCountDelta(wordCountTarget.value)
  if (delta === null) return false
  const pct = (delta / wordCountTarget.value) * 100
  return pct > 15
})
const wordCountDeltaDisplay = computed(() => editorStore.wordCountDelta(wordCountTarget.value))

// --- IA Brief Panel ---
const { chunks: iaBriefChunks, isStreaming: iaBriefStreaming, startStream: startBriefExplain } = useStreaming()
const iaBriefTriggered = ref(false)

const parsedBriefMarkdown = computed(() => {
  if (!iaBriefChunks.value) return ''
  return marked.parse(iaBriefChunks.value) as string
})

function triggerBriefExplain() {
  iaBriefTriggered.value = true
  const dfs = briefStore.briefData?.dataForSeo
  startBriefExplain('/api/generate/brief-explain', {
    slug,
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
          ?.articles.filter(a => a.slug !== slug).map(a => a.title) ?? []
      : [],
  })
}

function handleToggleIaBrief() {
  toggle('ia-brief')
  if (showIaBriefPanel.value && !iaBriefTriggered.value) {
    triggerBriefExplain()
  }
}

async function handleGenerateArticle() {
  log.info('[workflow] Starting article generation', {
    slug,
    briefKeywords: briefStore.briefData?.keywords.length,
    articleKeywords: articleKeywordsStore.keywords
      ? `cap=${articleKeywordsStore.keywords.capitaine}, lt=${articleKeywordsStore.keywords.lieutenants.length}`
      : 'null',
    outlineSections: outlineStore.outline?.sections.length,
  })
  await editorStore.generateArticle(briefStore.briefData!, outlineStore.outline!, wordCountTarget.value ?? undefined)
  if (editorStore.content && !editorStore.error) {
    const pilierKeyword = briefStore.briefData!.keywords.find(kw => kw.type === 'Pilier')
    const keyword = pilierKeyword?.keyword ?? briefStore.briefData!.article.title
    log.info('[workflow] Article done, generating meta', { slug, keyword, contentLength: editorStore.content.length })
    await editorStore.generateMeta(slug, keyword, briefStore.briefData!.article.title, editorStore.content)
    if (!editorStore.error) {
      log.info('[workflow] Meta done, saving', {
        slug,
        metaTitle: editorStore.metaTitle,
        metaDescription: editorStore.metaDescription?.substring(0, 50),
      })
      await editorStore.saveArticle(slug)
    }
  } else {
    log.warn('[workflow] Article generation failed or no content', { hasContent: !!editorStore.content, error: editorStore.error })
  }
}

// --- Reduce / Humanize handlers ---
const currentKeyword = computed(() =>
  articleKeywordsStore.keywords?.capitaine ?? briefStore.briefData?.article.title ?? '',
)
const allKeywords = computed(() =>
  briefStore.briefData?.keywords.map(kw => kw.keyword) ?? [],
)

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

onBeforeUnmount(() => {
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
  log.info('[workflow] ArticleWorkflowView mounted', { slug })
  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }

  // Fetch article keywords (await to ensure they're ready before SEO scoring)
  await articleKeywordsStore.fetchKeywords(slug)
  log.info('[workflow] Article keywords loaded', {
    hasKeywords: articleKeywordsStore.hasKeywords,
    capitaine: articleKeywordsStore.keywords?.capitaine,
    lieutenants: articleKeywordsStore.keywords?.lieutenants.length,
    lexique: articleKeywordsStore.keywords?.lexique.length,
  })

  await briefStore.fetchBrief(slug)
  log.info('[workflow] Brief loaded', {
    slug,
    briefKeywords: briefStore.briefData?.keywords.length,
    briefKeywordsList: briefStore.briefData?.keywords.map(k => k.keyword).join(', '),
  })

  // Hydrate outline & editor stores with existing saved content
  try {
    log.info('[workflow] Loading saved article content', { slug })
    const saved = await apiGet<ArticleContent>(`/articles/${slug}/content`)
    if (saved.outline) {
      outlineStore.loadExistingOutline(JSON.parse(saved.outline))
    }
    if (saved.content) {
      editorStore.loadExistingContent({
        content: saved.content,
        metaTitle: saved.metaTitle,
        metaDescription: saved.metaDescription,
      })
    }
    log.info('[workflow] Saved content hydrated', {
      slug,
      hasOutline: !!saved.outline,
      hasContent: !!saved.content,
      contentLength: saved.content?.length,
      metaTitle: saved.metaTitle,
    })
  } catch (err) {
    log.warn('[workflow] No saved content found, starting fresh', { slug, error: (err as Error).message })
  }
})
</script>

<template>
  <div class="workflow-layout">
    <div class="workflow-main">
      <div class="workflow-header">
        <RouterLink :to="backLink" class="back-link">&larr; {{ backLabel }}</RouterLink>
        <div class="panel-toggles" role="toolbar" aria-label="Panneaux d'analyse">
          <button
            class="btn-toggle"
            :class="{ active: showSeoPanel, disabled: !hasBody }"
            :aria-pressed="showSeoPanel"
            :disabled="!hasBody"
            :title="!hasBody ? 'Generez un article pour activer le scoring SEO' : undefined"
            @click="guardedToggle('seo')"
          >
            SEO
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showGeoPanel, disabled: !hasBody }"
            :aria-pressed="showGeoPanel"
            :disabled="!hasBody"
            :title="!hasBody ? 'Generez un article pour activer le scoring GEO' : undefined"
            @click="guardedToggle('geo')"
          >
            GEO
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showLinkSuggestions, disabled: !hasBody }"
            :aria-pressed="showLinkSuggestions"
            :disabled="!hasBody"
            :title="!hasBody ? 'Generez un article pour activer le maillage' : undefined"
            @click="handleToggleLinkSuggestions"
          >
            Maillage
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showIaBriefPanel }"
            :aria-pressed="showIaBriefPanel"
            @click="handleToggleIaBrief"
          >
            IA Brief
          </button>
        </div>
      </div>

      <!-- Linear workflow stepper (2 steps) -->
      <div class="workflow-stepper">
        <button
          v-for="step in steps"
          :key="step.id"
          class="step-btn"
          :class="{ active: currentStep === step.id, completed: isStepCompleted(step.id) }"
          @click="goToStep(step.id)"
        >
          <span class="step-number">{{ step.number }}</span>
          <span class="step-label">{{ step.label }}</span>
        </button>
      </div>

      <AsyncContent :is-loading="briefStore.isLoading" :error="briefStore.error" @retry="briefStore.fetchBrief(slug)">
        <template #skeleton>
          <SkeletonText :lines="5" />
        </template>
        <template v-if="briefStore.briefData">
          <!-- Step 1: Brief & Structure -->
          <div v-if="currentStep === 'brief-structure'" class="workflow-step">
            <BriefStructureStep
              :slug="slug"
              :cocoon-name="cocoonName"
              :silo-name="siloName"
              :article-title="articleTitle"
              @outline-validated="goToStep('article')"
              @check-completed="handleBriefCheck"
            />
          </div>

          <!-- Step 2: Article -->
          <div v-if="currentStep === 'article'" class="workflow-step">
            <CollapsableSection title="Article">
              <ArticleActions
                :is-generating="editorStore.isGenerating"
                :has-content="!!editorStore.content"
                :is-outline-validated="outlineStore.isValidated"
                :is-reducing="editorStore.isReducing"
                :is-humanizing="editorStore.isHumanizing"
                :can-reduce="canReduce"
                :word-count-delta="wordCountDeltaDisplay"
                :humanize-progress="editorStore.humanizeProgress"
                @generate="handleGenerateArticle()"
                @regenerate="handleGenerateArticle()"
                @reduce="handleReduce()"
                @humanize="handleHumanize()"
                @abort-humanize="handleAbortHumanize()"
              />

              <div v-if="editorStore.isGenerating && editorStore.sectionProgress" class="section-progress">
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

              <div v-if="editorStore.lastArticleUsage || editorStore.lastMetaUsage || editorStore.lastReduceUsage || editorStore.lastHumanizeUsage" class="cost-badges">
                <ApiCostBadge
                  v-if="editorStore.lastArticleUsage"
                  label="Article"
                  :usage="editorStore.lastArticleUsage"
                />
                <ApiCostBadge
                  v-if="editorStore.lastMetaUsage"
                  label="Meta"
                  :usage="editorStore.lastMetaUsage"
                />
                <ApiCostBadge
                  v-if="editorStore.lastReduceUsage"
                  label="Réduction"
                  :usage="editorStore.lastReduceUsage"
                />
                <ApiCostBadge
                  v-if="editorStore.lastHumanizeUsage"
                  label="Humanisation"
                  :usage="editorStore.lastHumanizeUsage"
                />
              </div>

              <div v-if="editorStore.content" class="word-count-bar">
                <div class="word-count-info">
                  <span class="word-count-value">{{ editorStore.wordCount }} mots</span>
                  <span v-if="wordCountTarget" class="word-count-target">/ {{ wordCountTarget }} cible</span>
                </div>
                <div v-if="wordCountTarget" class="word-count-progress">
                  <div
                    class="word-count-fill"
                    :class="wordCountPercent >= 80 ? 'fill-good' : 'fill-fair'"
                    :style="{ width: Math.min(100, wordCountPercent) + '%' }"
                  />
                </div>
              </div>

              <RouterLink
                v-if="editorStore.content && !editorStore.isGenerating"
                :to="`/article/${slug}/editor`"
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
        <div v-if="!hasBody && (showSeoPanel || showGeoPanel || showLinkSuggestions)" class="panel-disabled-overlay">
          <p class="panel-disabled-msg">Generez un article pour activer le scoring</p>
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
            @dismiss="dismissSuggestion($event)"
            @request="requestSuggestions"
            @close="handleCloseLinkSuggestions"
          />
        </ErrorBoundary>
        <div v-if="showIaBriefPanel" class="ia-brief-panel">
          <div class="ia-brief-header">
            <h3>Analyse IA du Brief</h3>
            <button
              class="btn-relaunch"
              :disabled="iaBriefStreaming"
              @click="triggerBriefExplain"
            >
              {{ iaBriefStreaming ? 'Analyse en cours...' : 'Relancer l\'analyse' }}
            </button>
          </div>
          <div
            v-if="parsedBriefMarkdown"
            class="ia-brief-content markdown-body"
            v-safe-html="parsedBriefMarkdown"
          />
          <p v-else-if="iaBriefStreaming" class="ia-brief-loading">Analyse en cours...</p>
          <p v-else class="ia-brief-empty">Cliquez sur "Relancer l'analyse" pour générer une analyse IA.</p>
        </div>
      </ResizablePanel>
    </Transition>
  </div>
</template>

<style scoped>
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

/* --- Workflow stepper --- */
.workflow-stepper {
  display: flex;
  gap: 2px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.step-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: var(--color-bg-soft);
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}

.step-btn:first-child { border-radius: 6px 0 0 6px; }
.step-btn:last-child { border-radius: 0 6px 6px 0; }

.step-btn.active {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.step-btn.completed {
  background: var(--color-bg-elevated, #e8f5e9);
  color: var(--color-success);
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(0,0,0,0.1);
}

.step-btn.active .step-number { background: rgba(255,255,255,0.3); }
.step-btn.completed .step-number { background: var(--color-success); color: white; }

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

.cost-badges {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

/* --- Word count bar --- */
.word-count-bar {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.word-count-info {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.word-count-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.word-count-target {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.word-count-progress {
  height: 4px;
  background: var(--color-bg-soft);
  border-radius: 2px;
  overflow: hidden;
}

.word-count-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.word-count-fill.fill-good {
  background: var(--color-success);
}

.word-count-fill.fill-fair {
  background: var(--color-warning);
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
