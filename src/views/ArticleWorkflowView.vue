<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBriefStore } from '@/stores/brief.store'
import { useOutlineStore } from '@/stores/outline.store'
import { useEditorStore } from '@/stores/editor.store'
import { useKeywordsStore } from '@/stores/keywords.store'
import { useStrategyStore } from '@/stores/strategy.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { apiGet } from '@/services/api.service'
import { usePanelToggle } from '@/composables/usePanelToggle'
import { useSeoScoring } from '@/composables/useSeoScoring'
import { useGeoScoring } from '@/composables/useGeoScoring'
import { useInternalLinking } from '@/composables/useInternalLinking'
import type { ArticleContent } from '@shared/types/index.js'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import StrategyWizard from '@/components/strategy/StrategyWizard.vue'
import SeoBrief from '@/components/brief/SeoBrief.vue'
import KeywordList from '@/components/brief/KeywordList.vue'
import DataForSeoPanel from '@/components/brief/DataForSeoPanel.vue'
import ContentRecommendation from '@/components/brief/ContentRecommendation.vue'
import ContentGapPanel from '@/components/brief/ContentGapPanel.vue'
import OutlineActions from '@/components/outline/OutlineActions.vue'
import OutlineDisplay from '@/components/outline/OutlineDisplay.vue'
import OutlineEditor from '@/components/outline/OutlineEditor.vue'
import ArticleActions from '@/components/article/ArticleActions.vue'
import ArticleStreamDisplay from '@/components/article/ArticleStreamDisplay.vue'
import ArticleMetaDisplay from '@/components/article/ArticleMetaDisplay.vue'
import ApiCostBadge from '@/components/shared/ApiCostBadge.vue'
import ArticleKeywordsPanel from '@/components/keywords/ArticleKeywordsPanel.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import ResizablePanel from '@/components/panels/ResizablePanel.vue'
import SeoPanel from '@/components/panels/SeoPanel.vue'
import GeoPanel from '@/components/panels/GeoPanel.vue'
import LinkSuggestions from '@/components/linking/LinkSuggestions.vue'

const route = useRoute()
const briefStore = useBriefStore()
const outlineStore = useOutlineStore()
const editorStore = useEditorStore()
const keywordsStore = useKeywordsStore()
const strategyStore = useStrategyStore()
const articleKeywordsStore = useArticleKeywordsStore()
const cocoonsStore = useCocoonsStore()

const slug = route.params.slug as string
const cocoonId = route.params.cocoonId as string | undefined

// --- Keyword for all workflow sub-steps ---
const workflowKeyword = computed(() =>
  briefStore.pilierKeyword?.keyword ?? briefStore.briefData?.article.title ?? '',
)

// --- Back link to cocoon redaction or dashboard ---
const backLink = computed(() =>
  cocoonId ? `/cocoon/${cocoonId}/redaction` : '/',
)
const backLabel = computed(() =>
  cocoonId ? 'Retour \u00e0 la r\u00e9daction' : 'Retour au dashboard',
)

// --- Strategy context lookups ---
const cocoonName = computed(() => briefStore.briefData?.article.cocoonName ?? '')
const articleTitle = computed(() => briefStore.briefData?.article.title ?? '')
const siloName = computed(() => {
  const cocoon = cocoonsStore.cocoons.find(c => c.name === cocoonName.value)
  return cocoon?.siloName ?? ''
})

// --- Linear workflow step tracker ---
const currentStep = ref<'strategy' | 'brief' | 'outline' | 'article'>('strategy')

const steps = [
  { id: 'strategy' as const, number: 1, label: 'Strat\u00e9gie' },
  { id: 'brief' as const, number: 2, label: 'Brief' },
  { id: 'outline' as const, number: 3, label: 'Sommaire' },
  { id: 'article' as const, number: 4, label: 'Article' },
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

const { activePanel, toggle, showSeoPanel, showGeoPanel, showLinkSuggestions, hasActivePanel } = usePanelToggle('seo')

const {
  suggestions: linkSuggestions,
  isSuggesting,
  requestSuggestions,
  dismissSuggestion,
  clearSuggestions,
} = useInternalLinking(slug)

// Scoring composables — watch editorStore.content reactively
useSeoScoring(
  () => keywordsStore.keywords.length > 0 ? keywordsStore.keywords : (briefStore.briefData?.keywords ?? []),
  () => briefStore.briefData?.contentLengthRecommendation ?? undefined,
  () => briefStore.briefData?.dataForSeo?.relatedKeywords ?? [],
  () => articleKeywordsStore.keywords,
)
useGeoScoring()

async function handleGenerateArticle() {
  await editorStore.generateArticle(briefStore.briefData!, outlineStore.outline!)
  if (editorStore.content && !editorStore.error) {
    const pilierKeyword = briefStore.briefData!.keywords.find(kw => kw.type === 'Pilier')
    const keyword = pilierKeyword?.keyword ?? briefStore.briefData!.article.title
    await editorStore.generateMeta(slug, keyword, briefStore.briefData!.article.title, editorStore.content)
    if (!editorStore.error) {
      await editorStore.saveArticle(slug)
    }
  }
}

function handleToggleLinkSuggestions() {
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
  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }

  articleKeywordsStore.fetchKeywords(slug)

  await briefStore.fetchBrief(slug)

  // Load strategy and auto-skip if already complete
  strategyStore.fetchStrategy(slug).then(() => {
    if (strategyStore.isComplete) {
      if (currentStep.value === 'strategy') {
        currentStep.value = 'brief'
      }
    }
  })

  // Hydrate outline & editor stores with existing saved content
  try {
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
  } catch {
    // No saved content yet — user will generate from scratch
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
      </div>

      <!-- Linear workflow stepper -->
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

      <!-- Step 1: Strategy -->
      <div v-if="currentStep === 'strategy'" class="workflow-step">
        <StrategyWizard
          :slug="slug"
          :article-title="articleTitle"
          :cocoon-name="cocoonName"
          :silo-name="siloName"
          @complete="goToStep('brief')"
          @skip="goToStep('brief')"
        />
      </div>

      <template v-else>
        <LoadingSpinner v-if="briefStore.isLoading" />

        <ErrorMessage
          v-else-if="briefStore.error"
          :message="briefStore.error"
          @retry="briefStore.fetchBrief(slug)"
        />

        <template v-else-if="briefStore.briefData">
        <!-- Step 2: Brief -->
        <div v-if="currentStep === 'brief'" class="workflow-step">
          <CollapsableSection title="Brief SEO">
            <SeoBrief
              :article="briefStore.briefData.article"
              :pilier-keyword="briefStore.pilierKeyword?.keyword ?? null"
              :strategy="strategyStore.strategy"
            />
          </CollapsableSection>

          <CollapsableSection title="Mots-cl&eacute;s">
            <KeywordList :keywords="briefStore.briefData.keywords" />
          </CollapsableSection>

          <CollapsableSection title="Mots-cl&eacute;s de l'article">
            <ArticleKeywordsPanel
              :slug="slug"
              :article-title="briefStore.briefData?.article.title ?? ''"
              :cocoon-name="cocoonName"
            />
          </CollapsableSection>

          <CollapsableSection title="DataForSEO">
            <DataForSeoPanel
              :data="briefStore.briefData.dataForSeo"
              :is-refreshing="briefStore.isRefreshing"
              @refresh="briefStore.refreshDataForSeo()"
            />

            <ApiCostBadge
              v-if="briefStore.dataForSeoFromCache !== null"
              label="DataForSEO"
              :from-cache="briefStore.dataForSeoFromCache"
            />
          </CollapsableSection>

          <CollapsableSection title="Recommandation de contenu">
            <ContentRecommendation
              :recommendation="briefStore.briefData.contentLengthRecommendation"
              :article-type="briefStore.briefData.article.type"
            />
          </CollapsableSection>

          <ContentGapPanel :keyword="workflowKeyword" />

          <div class="step-navigation">
            <button class="btn-review-strategy" @click="goToStep('strategy')">
              Revoir la strat\u00e9gie
            </button>
            <button class="btn btn-primary" @click="goToStep('outline')">
              Continuer vers le Sommaire
            </button>
          </div>
        </div>

        <!-- Step 3: Outline -->
        <div v-if="currentStep === 'outline'" class="workflow-step">
          <CollapsableSection title="Sommaire">
            <OutlineActions
              :is-generating="outlineStore.isGenerating"
              :has-outline="!!outlineStore.outline"
              :has-brief-data="!!briefStore.briefData"
              @generate="outlineStore.generateOutline(briefStore.briefData!)"
              @regenerate="outlineStore.generateOutline(briefStore.briefData!)"
            />

            <ApiCostBadge
              v-if="outlineStore.lastApiUsage"
              label="Sommaire"
              :usage="outlineStore.lastApiUsage"
            />

            <ErrorMessage
              v-if="outlineStore.error && !outlineStore.isGenerating"
              :message="outlineStore.error"
              @retry="outlineStore.generateOutline(briefStore.briefData!)"
            />

            <!-- Streaming view during generation -->
            <OutlineDisplay
              v-if="outlineStore.isGenerating || !outlineStore.outline"
              :outline="outlineStore.outline"
              :streamed-text="outlineStore.streamedText"
              :is-generating="outlineStore.isGenerating"
            />

            <!-- Interactive editor after generation -->
            <template v-else>
              <OutlineEditor
                v-if="!outlineStore.isValidated"
                :outline="outlineStore.outline"
                @update:outline="outlineStore.setOutline($event)"
              />

              <OutlineDisplay
                v-else
                :outline="outlineStore.outline"
                :streamed-text="''"
                :is-generating="false"
              />

              <div class="outline-validation">
                <p v-if="outlineStore.isValidated" class="validation-msg">
                  Sommaire valid&eacute; et sauvegard&eacute;.
                </p>
                <button
                  v-if="!outlineStore.isValidated"
                  class="btn btn-validate"
                  :disabled="outlineStore.isSaving"
                  @click="outlineStore.validateOutline(slug)"
                >
                  {{ outlineStore.isSaving ? 'Sauvegarde en cours...' : 'Valider le sommaire' }}
                </button>
              </div>
            </template>
          </CollapsableSection>

          <div v-if="outlineStore.isValidated" class="step-navigation">
            <button class="btn-review-strategy" @click="goToStep('strategy')">
              Revoir la strat\u00e9gie
            </button>
            <button class="btn btn-primary" @click="goToStep('article')">
              Continuer vers l'Article
            </button>
          </div>
        </div>

        <!-- Step 4: Article -->
        <div v-if="currentStep === 'article'" class="workflow-step">
          <CollapsableSection title="Article">
            <ArticleActions
              :is-generating="editorStore.isGenerating"
              :has-content="!!editorStore.content"
              :is-outline-validated="outlineStore.isValidated"
              @generate="handleGenerateArticle()"
              @regenerate="handleGenerateArticle()"
            />

            <ErrorMessage
              v-if="editorStore.error && !editorStore.isGenerating"
              :message="editorStore.error"
              @retry="handleGenerateArticle()"
            />

            <ArticleStreamDisplay
              :streamed-text="editorStore.streamedText"
              :content="editorStore.content"
              :is-generating="editorStore.isGenerating"
            />

            <div v-if="editorStore.lastArticleUsage || editorStore.lastMetaUsage" class="cost-badges">
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
            </div>

            <ArticleMetaDisplay
              :meta-title="editorStore.metaTitle"
              :meta-description="editorStore.metaDescription"
              :is-generating="editorStore.isGeneratingMeta"
            />

            <RouterLink
              v-if="editorStore.content && !editorStore.isGenerating"
              :to="`/article/${slug}/editor`"
              class="btn-edit-article"
            >
              &Eacute;diter l'article
            </RouterLink>
          </CollapsableSection>

          <div class="step-navigation">
            <button class="btn-review-strategy" @click="goToStep('strategy')">
              Revoir la strat\u00e9gie
            </button>
          </div>
        </div>
        </template>
      </template>
    </div>

    <Transition name="panel-slide">
      <ResizablePanel v-if="hasActivePanel" :key="activePanel!">
        <SeoPanel v-if="showSeoPanel" />
        <GeoPanel v-if="showGeoPanel" />
        <LinkSuggestions
          v-if="showLinkSuggestions"
          :suggestions="linkSuggestions"
          :is-suggesting="isSuggesting"
          @dismiss="dismissSuggestion($event)"
          @request="requestSuggestions"
          @close="handleCloseLinkSuggestions"
        />
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

.outline-validation {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.validation-msg {
  color: var(--color-success);
  font-weight: 500;
  font-size: 0.875rem;
  margin: 0;
}

.btn-validate {
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

.btn-validate:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-validate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
