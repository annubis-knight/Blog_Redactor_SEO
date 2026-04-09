<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useSilosStore } from '@/stores/silos.store'
import { useThemeConfigStore } from '@/stores/theme-config.store'
import type { StrategyStepData, CocoonSuggestRequest, ThemeContext, SubQuestion } from '@shared/types/index.js'
import StrategyStep from '@/components/strategy/StrategyStep.vue'
import ContextRecap from '@/components/strategy/ContextRecap.vue'
import ProgressBar from '@/components/shared/ProgressBar.vue'
import ProposedArticleRow from '@/components/strategy/ProposedArticleRow.vue'
import AddArticleMenu from '@/components/production/AddArticleMenu.vue'
import ArticleColumn from '@/components/production/ArticleColumn.vue'
import GenerationStepper from '@/components/production/GenerationStepper.vue'
import TopicSuggestions from '@/components/production/TopicSuggestions.vue'
import { useArticleProposals } from '@/composables/useArticleProposals'
import { provideRecapRadioGroup } from '@/composables/useRecapRadioGroup'

const props = defineProps<{
  cocoonName: string
  siloName: string
  cocoonId: number
}>()

const emit = defineEmits<{
  (e: 'next'): void
}>()

provideRecapRadioGroup()

const store = useCocoonStrategyStore()
const cocoonsStore = useCocoonsStore()
const silosStore = useSilosStore()
const themeConfigStore = useThemeConfigStore()
const suggestingSubId = ref<string | null>(null)
const articleSlide = ref(0)
const columnsTrackRef = ref<HTMLElement>()

function scrollToSlide(n: number) {
  articleSlide.value = n
  const el = columnsTrackRef.value
  if (!el || typeof el.scrollTo !== 'function') return
  if (n === 0) {
    el.scrollTo({ left: 0, behavior: 'smooth' })
  } else {
    const cols = el.querySelectorAll('.article-column')
    if (cols[1]) {
      el.scrollTo({ left: (cols[1] as HTMLElement).offsetLeft, behavior: 'smooth' })
    }
  }
}

function onColumnsScroll() {
  const el = columnsTrackRef.value
  if (!el) return
  const maxScroll = el.scrollWidth - el.clientWidth
  articleSlide.value = el.scrollLeft > maxScroll * 0.3 ? 1 : 0
}

/* Drag-to-scroll */
const INTERACTIVE_SELECTOR = 'a,button,input,textarea,select,[role="button"]'
const isDragging = ref(false)
let dragStartX = 0
let dragScrollLeft = 0

function onDragStart(e: MouseEvent) {
  if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
  const el = columnsTrackRef.value
  if (!el) return
  isDragging.value = true
  dragStartX = e.pageX - el.offsetLeft
  dragScrollLeft = el.scrollLeft
  el.style.scrollBehavior = 'auto'
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  const el = columnsTrackRef.value
  if (!el) return
  e.preventDefault()
  const x = e.pageX - el.offsetLeft
  el.scrollLeft = dragScrollLeft - (x - dragStartX)
}

function onDragEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  const el = columnsTrackRef.value
  if (!el) return
  el.style.scrollBehavior = 'smooth'
  const maxScroll = el.scrollWidth - el.clientWidth
  scrollToSlide(el.scrollLeft > maxScroll * 0.3 ? 1 : 0)
}

const cocoonSlug = computed(() =>
  props.cocoonName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
)

const stepConfigs = [
  { key: 'cible', title: 'À qui parlez-vous ?', description: "Décrivez le persona du lecteur idéal pour ce cocon : son métier, la taille de son entreprise, sa maturité digitale." },
  { key: 'douleur', title: 'Quelle douleur adressez-vous ?', description: "Quel problème principal ce cocon résout-il ? Quel est le pain point commun aux lecteurs de cette thématique ?" },
  { key: 'angle', title: 'Quel est votre angle ?', description: "Qu'est-ce qui rend votre approche unique par rapport aux concurrents sur cette thématique ?" },
  { key: 'promesse', title: 'Quelle promesse faites-vous ?', description: "Quel résultat concret et tangible le lecteur obtiendra en parcourant les articles de ce cocon ?" },
  { key: 'cta', title: 'Call-to-Action', description: "Où voulez-vous guider le lecteur après avoir lu vos contenus ? Page de contact, guide PDF, prise de rendez-vous..." },
]

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.name === props.cocoonName) ?? null,
)

const currentSilo = computed(() =>
  silosStore.silos.find(s => s.nom === props.siloName) ?? null,
)

/** Merge DB articles with strategy-store proposed articles so edits show in recap */
const mergedCocoonArticles = computed(() => {
  const dbArticles = cocoon.value?.articles ?? []
  const proposed = store.strategy?.proposedArticles ?? []

  // Build slug→proposed map for accepted articles already created in DB
  const proposedBySlug = new Map<string, (typeof proposed)[0]>()
  for (const p of proposed) {
    if (p.accepted && p.createdInDb && p.dbSlug) {
      proposedBySlug.set(p.dbSlug, p)
    }
  }

  const seenSlugs = new Set<string>()
  const result: string[] = []

  // DB articles — overlay strategy-store title when available
  for (const dbArt of dbArticles) {
    const match = proposedBySlug.get(dbArt.slug)
    if (match) {
      result.push(`${match.title} (${match.type})`)
      seenSlugs.add(dbArt.slug)
    } else {
      result.push(`${dbArt.title} (${dbArt.type})`)
    }
  }

  // Accepted proposed articles not yet in DB
  for (const p of proposed) {
    if (p.accepted && !p.createdInDb && p.title.trim() && !seenSlugs.has(p.suggestedSlug)) {
      result.push(`${p.title} (${p.type})`)
    }
  }

  return result
})

const progressPercent = computed(() =>
  Math.round(((store.strategy?.completedSteps ?? 0) / 6) * 100),
)

function hasAnyConfigData(cfg: typeof themeConfigStore.config): boolean {
  return !!(cfg.positioning.targetAudience || cfg.positioning.mainPromise || cfg.avatar.sector || cfg.toneOfVoice.style)
}

function buildThemeContext(): ThemeContext {
  const cfg = themeConfigStore.config
  return {
    themeName: silosStore.theme?.nom || undefined,
    themeDescription: silosStore.theme?.description || undefined,
    siloDescription: currentSilo.value?.description || undefined,
    cocoonArticles: mergedCocoonArticles.value,
    themeConfig: hasAnyConfigData(cfg) ? {
      mainPromise: cfg.positioning.mainPromise || undefined,
      differentiators: cfg.positioning.differentiators.length ? cfg.positioning.differentiators : undefined,
      services: cfg.offerings.services.length ? cfg.offerings.services : undefined,
      mainCTA: cfg.offerings.mainCTA || undefined,
      location: cfg.avatar.location || undefined,
      targetAudience: cfg.positioning.targetAudience || undefined,
      sector: cfg.avatar.sector || undefined,
      companySize: cfg.avatar.companySize || undefined,
      budget: cfg.avatar.budget || undefined,
      digitalMaturity: cfg.avatar.digitalMaturity || undefined,
      painPoints: cfg.positioning.painPoints.length ? cfg.positioning.painPoints : undefined,
      toneStyle: cfg.toneOfVoice.style || undefined,
      vocabulary: cfg.toneOfVoice.vocabulary.length ? cfg.toneOfVoice.vocabulary : undefined,
    } : undefined,
  }
}

function getSuggestContext(): CocoonSuggestRequest['context'] {
  return {
    cocoonName: props.cocoonName,
    siloName: props.siloName,
    previousAnswers: store.getPreviousAnswers(),
    existingArticles: [
      ...(cocoon.value?.articles.map(a => a.title) ?? []),
      ...(store.strategy?.proposedArticles.filter(a => a.accepted).map(a => `${a.title} [mot-clé: ${a.suggestedKeyword}]`) ?? []),
    ],
    themeContext: buildThemeContext(),
  }
}

function getCurrentInput(): string {
  const step = store.currentStepName
  return (store.strategy as any)?.[step]?.input ?? ''
}

function applySuggestion(suggestion: string) {
  const step = store.currentStepName
  if (!store.strategy || step === 'articles') return
  const stepData = store.strategy[step as keyof typeof store.strategy] as StrategyStepData
    ; (store.strategy as any)[step] = { ...stepData, suggestion }
}

async function handleSuggest() {
  const suggestion = await store.requestSuggestion(cocoonSlug.value, {
    step: store.currentStepName,
    currentInput: getCurrentInput(),
    context: getSuggestContext(),
  })
  if (suggestion) applySuggestion(suggestion)
}

async function handleMerge() {
  const step = store.currentStepName
  const stepData = (store.strategy as any)?.[step] as StrategyStepData
  const currentSuggestion = stepData?.suggestion
  if (!currentSuggestion) return

  const suggestion = await store.requestSuggestion(cocoonSlug.value, {
    step,
    currentInput: getCurrentInput(),
    mergeWith: currentSuggestion,
    existingValidated: stepData.validated || undefined,
    context: getSuggestContext(),
  })
  if (suggestion && store.strategy) {
    ; (store.strategy as any)[step] = { ...stepData, validated: suggestion }
  }
}

async function handleDeepen() {
  if (!store.strategy) return
  const stepName = store.currentStepName as 'cible' | 'douleur' | 'angle' | 'promesse'
  const stepData = (store.strategy as any)[stepName] as StrategyStepData
  const config = stepConfigs[store.currentStep]
  if (!config) return

  const result = await store.requestDeepen(cocoonSlug.value, {
    step: stepName,
    mainQuestion: config.title,
    mainAnswer: stepData.input || stepData.validated,
    existingSubQuestions: (stepData.subQuestions ?? []).map(sq => ({ question: sq.question, answer: sq.validated || sq.input })),
    context: {
      cocoonName: props.cocoonName,
      siloName: props.siloName,
      previousAnswers: store.getPreviousAnswers(),
      themeContext: buildThemeContext(),
    },
  })

  if (result) {
    const newSub: SubQuestion = {
      id: crypto.randomUUID(),
      question: result.question,
      description: result.description,
      input: '',
      suggestion: null,
      validated: '',
    }
    const subs = [...(stepData.subQuestions ?? []), newSub]
      ; (store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
  }
}

async function handleSubSuggest(subId: string) {
  if (!store.strategy) return
  const stepName = store.currentStepName
  const stepData = (store.strategy as any)[stepName] as StrategyStepData
  const sub = stepData.subQuestions?.find(sq => sq.id === subId)
  if (!sub) return

  suggestingSubId.value = subId
  try {
    const suggestion = await store.requestSuggestion(cocoonSlug.value, {
      step: stepName,
      currentInput: `[Sous-question : "${sub.question}"] ${sub.input}`,
      context: getSuggestContext(),
    })

    if (suggestion && store.strategy) {
      const subs = (stepData.subQuestions ?? []).map(sq =>
        sq.id === subId ? { ...sq, suggestion } : sq,
      )
        ; (store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
    }
  } finally {
    suggestingSubId.value = null
  }
}

async function handleSubMerge(subId: string) {
  if (!store.strategy) return
  const stepName = store.currentStepName
  const stepData = (store.strategy as any)[stepName] as StrategyStepData
  const sub = stepData.subQuestions?.find(sq => sq.id === subId)
  if (!sub?.suggestion) return

  suggestingSubId.value = subId
  try {
    const suggestion = await store.requestSuggestion(cocoonSlug.value, {
      step: stepName,
      currentInput: `[Sous-question : "${sub.question}"] ${sub.input}`,
      mergeWith: sub.suggestion,
      context: getSuggestContext(),
    })

    if (suggestion && store.strategy) {
      const subs = (stepData.subQuestions ?? []).map(sq =>
        sq.id === subId ? { ...sq, suggestion, validated: suggestion } : sq,
      )
        ; (store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
    }
  } finally {
    suggestingSubId.value = null
  }
  // Trigger enrichment after sub-question merge-validation
  if (store.strategy) {
    await handleSubEnrich(subId)
  }
}

function handleDeleteSubQuestion(subId: string) {
  if (!store.strategy) return
  const stepName = store.currentStepName
  const stepData = (store.strategy as any)[stepName] as StrategyStepData
  const subs = (stepData.subQuestions ?? []).filter(sq => sq.id !== subId)
    ; (store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
}

async function handleSubEnrich(subId: string) {
  if (!store.strategy) return
  const stepName = store.currentStepName as 'cible' | 'douleur' | 'angle' | 'promesse'
  const stepData = (store.strategy as any)[stepName] as StrategyStepData
  const sub = stepData.subQuestions?.find(sq => sq.id === subId)
  if (!sub) return

  const subAnswer = sub.validated || sub.input
  if (!subAnswer.trim()) return

  // If no main validated text yet, use the sub-answer directly
  if (!stepData.validated.trim()) {
    ; (store.strategy as any)[stepName] = { ...stepData, validated: subAnswer }
    return
  }

  const enriched = await store.requestEnrich(cocoonSlug.value, {
    step: stepName,
    existingValidated: stepData.validated,
    subQuestion: sub.question,
    subAnswer,
    context: {
      cocoonName: props.cocoonName,
      siloName: props.siloName,
      previousAnswers: store.getPreviousAnswers(),
      themeContext: buildThemeContext(),
    },
  })

  if (enriched && store.strategy) {
    ; (store.strategy as any)[stepName] = { ...stepData, validated: enriched }
  }
}

function updateStepData(step: string, data: StrategyStepData) {
  if (store.strategy) {
    ; (store.strategy as any)[step] = data
  }
}

function handleNext() {
  if (store.currentStep === 5) {
    // Last step — mark as complete
    if (store.strategy) {
      store.strategy.completedSteps = 6
    }
    store.saveStrategy(cocoonSlug.value)
    emit('next')
  } else {
    store.nextStep(cocoonSlug.value)
  }
}

// --- Article proposal (step 6) — extracted to composable ---
const cocoonNameRef = computed(() => props.cocoonName)

const {
  truncationWarning,
  generationPhase,
  generationWarning,
  addingArticleType,
  articleColumns,
  articleWarnings,
  globalWarnings,
  groupColors,
  groupedSpecArticles,
  compositionResults,
  intermediateTitles,
  normalizeTitle,
  addEmptyArticle,
  addSmartArticle,
  removeProposedArticle,
  toggleAccept,
  regenerateTitle,
  selectTitle,
  regenerateKeyword,
  selectKeyword,
  regenerateSlug,
  selectSlug,
  changeParent,
  editTitle,
  editKeyword,
  editSlug,
  generateArticleProposals,
  validateArticles,
  topicsLoading,
  topicsError,
  generateTopics,
  toggleTopic,
  removeTopic,
  addTopic,
  updateUserContext,
} = useArticleProposals({
  cocoonSlug,
  cocoonName: cocoonNameRef,
  getSuggestContext,
})

onMounted(async () => {
  await store.fetchStrategy(cocoonSlug.value)
  if (!store.strategy) {
    store.initEmpty(cocoonSlug.value)
  }
  if (cocoonsStore.cocoons.length === 0) {
    await cocoonsStore.fetchCocoons()
  }
  if (silosStore.silos.length === 0) {
    await silosStore.fetchSilos()
  }
  await themeConfigStore.fetchConfig()
})
</script>

<template>
  <div class="brain-phase">
    <!-- Header with progress -->
    <div class="brain-header">
      <div class="brain-header-row">
        <div>
          <h3 class="brain-title">Brainstorm stratégique : {{ cocoonName }}</h3>
          <p class="brain-subtitle">
            Définissez la direction stratégique de ce cocon avant de rédiger.
          </p>
        </div>
        <button class="btn btn-primary btn-sm" @click="$emit('next')">
          Continuer vers le Moteur &rarr;
        </button>
      </div>
      <ProgressBar :percent="progressPercent"
        :color="progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'" />
    </div>

    <div v-if="store.isLoading" class="brain-loading">
      Chargement de la stratégie...
    </div>

    <template v-else-if="store.strategy">
      <!-- Wizard stepper -->
      <div class="wizard-stepper">
        <button v-for="(config, idx) in [...stepConfigs, { key: 'articles', title: 'Articles' }]" :key="config.key"
          class="wizard-step-btn" :class="{
            active: store.currentStep === idx,
            completed: idx < store.currentStep,
          }" @click="store.goToStep(idx)">
          <span class="wizard-step-num">{{ idx + 1 }}</span>
          <span class="wizard-step-label">{{ config.title.split('?')[0]?.split(':')[0]?.trim() }}</span>
        </button>
      </div>

      <!-- Context recap (collapsible) -->
      <ContextRecap :theme-name="silosStore.theme?.nom" :theme-description="silosStore.theme?.description"
        :silo-name="props.siloName" :silo-description="currentSilo?.description" :cocoon-name="props.cocoonName"
        :cocoon-articles="mergedCocoonArticles"
        :previous-answers="store.getPreviousAnswers()" :theme-config="buildThemeContext().themeConfig" />

      <!-- Steps 1-5: Q&A with StrategyStep -->
      <StrategyStep v-if="store.currentStep < 5" :key="store.currentStepName"
        :title="stepConfigs[store.currentStep]?.title ?? ''"
        :description="stepConfigs[store.currentStep]?.description ?? ''"
        :step-data="(store.strategy as any)[store.currentStepName]" :is-suggesting="store.isProcessing"
        :is-deepening="store.isDeepening" :suggesting-sub-id="suggestingSubId"
        @update:step-data="updateStepData(store.currentStepName as string, $event)" @request-suggestion="handleSuggest"
        @request-merge="handleMerge" @request-deepen="handleDeepen" @request-sub-suggestion="handleSubSuggest"
        @request-sub-merge="handleSubMerge" @delete-sub-question="handleDeleteSubQuestion"
        @request-enrich="handleSubEnrich" />

      <!-- Step 6: Article proposal -->
      <div v-else class="article-proposal-wrapper">
      <div class="brain-step-content article-proposal">
        <div class="step-header-row">
          <div class="step-header-text">
            <h3 class="step-title">Proposition d'articles</h3>
            <p class="step-desc">
              En se basant sur vos réponses stratégiques, Claude peut proposer une liste
              d'articles pour ce cocon avec leur type (Pilier, Intermédiaire, Spécialisé).
            </p>
          </div>
          <div class="step-header-actions">
            <button class="btn-generate"
              :disabled="generationPhase !== 'idle' && generationPhase !== 'done' && generationPhase !== 'error'"
              @click="generateArticleProposals">
              {{ (generationPhase !== 'idle' && generationPhase !== 'done' && generationPhase !== 'error') ? 'Génération...' : 'Générer avec Claude' }}
            </button>
            <div class="swiper-nav">
              <button class="swiper-arrow" :disabled="articleSlide === 0" @click="scrollToSlide(0)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button class="swiper-arrow" :disabled="articleSlide === 1" @click="scrollToSlide(1)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <TopicSuggestions
          :topics="store.strategy?.suggestedTopics ?? []"
          :user-context="store.strategy?.topicsUserContext ?? ''"
          :loading="topicsLoading"
          :error="topicsError"
          :initially-collapsed="true"
          @toggle="toggleTopic"
          @remove="removeTopic"
          @add="addTopic"
          @regenerate="generateTopics"
          @update:user-context="updateUserContext"
        />

        <GenerationStepper :phase="generationPhase" />

        <!-- Generation error -->
        <div v-if="generationPhase === 'error'" class="truncation-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2" />
            <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          Erreur lors de la génération des articles. Réessayez.
        </div>

        <!-- Phase 3 warning (Spé not generated) -->
        <div v-if="generationWarning" class="truncation-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ generationWarning }}
        </div>

        <!-- Truncation warning -->
        <div v-if="truncationWarning" class="truncation-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ truncationWarning }}
        </div>

        <!-- Global warnings (e.g. no Pilier at all) -->
        <div v-if="globalWarnings.length > 0" class="structural-warnings" data-testid="structural-warnings">
          <div v-for="(w, wi) in globalWarnings" :key="wi" class="structural-warning-item">
            <span class="structural-warning-icon">&#9888;</span>
            <span>{{ w.message }}</span>
          </div>
        </div>

        <!-- 3-column article swiper -->
        <div class="article-columns">
          <div ref="columnsTrackRef" class="article-columns-track" :class="{ 'is-dragging': isDragging }" @scroll="onColumnsScroll" @mousedown="onDragStart" @mousemove="onDragMove" @mouseup="onDragEnd" @mouseleave="onDragEnd">
            <!-- Pilier column -->
            <ArticleColumn
              label="Pilier"
              header-class="col-pilier"
              :tooltip="articleColumns[0]?.tooltip"
              :count="articleColumns[0]?.articles.length ?? 0"
              :peek="articleSlide === 1"
              @click-peek="scrollToSlide(0)"
            >
              <ProposedArticleRow v-for="article in articleColumns[0]?.articles ?? []" :key="article.originalIndex"
                :article="article" :index="article.originalIndex"
                :composition-result="compositionResults.get(article.originalIndex) ?? null"
                :structural-warnings="articleWarnings.get(article.originalIndex) ?? []"
                @regenerate-title="regenerateTitle" @regenerate-keyword="regenerateKeyword"
                @regenerate-slug="regenerateSlug" @select-keyword="selectKeyword" @select-title="selectTitle"
                @select-slug="selectSlug" @toggle-accept="toggleAccept" @remove="removeProposedArticle"
                @edit-title="editTitle" @edit-keyword="editKeyword" @edit-slug="editSlug" />
              <AddArticleMenu
                :is-loading="addingArticleType === 'Pilier'"
                :disabled="addingArticleType !== null"
                label="+ Ajouter un pilier"
                @add-empty="addEmptyArticle('Pilier')"
                @add-smart="addSmartArticle('Pilier')"
                @add-guided="addSmartArticle('Pilier', $event)"
              />
            </ArticleColumn>

            <!-- Intermédiaire column -->
            <ArticleColumn
              label="Intermédiaire"
              header-class="col-inter"
              :tooltip="articleColumns[1]?.tooltip"
              :count="articleColumns[1]?.articles.length ?? 0"
            >
              <ProposedArticleRow v-for="article in articleColumns[1]?.articles ?? []" :key="article.originalIndex"
                :article="article" :index="article.originalIndex"
                :composition-result="compositionResults.get(article.originalIndex) ?? null"
                :structural-warnings="articleWarnings.get(article.originalIndex) ?? []"
                @regenerate-title="regenerateTitle" @regenerate-keyword="regenerateKeyword"
                @regenerate-slug="regenerateSlug" @select-keyword="selectKeyword" @select-title="selectTitle"
                @select-slug="selectSlug" @toggle-accept="toggleAccept" @remove="removeProposedArticle"
                @edit-title="editTitle" @edit-keyword="editKeyword" @edit-slug="editSlug" />
              <AddArticleMenu
                :is-loading="addingArticleType === 'Intermédiaire'"
                :disabled="addingArticleType !== null"
                label="+ Ajouter un intermédiaire"
                @add-empty="addEmptyArticle('Intermédiaire')"
                @add-smart="addSmartArticle('Intermédiaire')"
                @add-guided="addSmartArticle('Intermédiaire', $event)"
              />
            </ArticleColumn>

            <!-- Spécialisé column (grouped by parent Inter) -->
            <ArticleColumn
              label="Spécialisé"
              header-class="col-spec"
              :tooltip="articleColumns[2]?.tooltip"
              :count="articleColumns[2]?.articles.length ?? 0"
              :peek="articleSlide === 0"
              @click-peek="scrollToSlide(1)"
            >
              <div v-for="group in groupedSpecArticles" :key="group.parentTitle" class="spec-group"
                :class="{ 'spec-group--orphan': group.parentTitle === 'Non rattachés' }">
                <div class="spec-group-header">
                  <span class="spec-group-dot" :style="{ background: group.color }"></span>
                  <span class="spec-group-label">{{ group.parentTitle.length > 40 ? group.parentTitle.slice(0, 40) + '…' : group.parentTitle }}</span>
                </div>
                <ProposedArticleRow v-for="article in group.articles" :key="article.originalIndex" :article="article"
                  :index="article.originalIndex"
                  :composition-result="compositionResults.get(article.originalIndex) ?? null"
                  :structural-warnings="articleWarnings.get(article.originalIndex) ?? []"
                  :available-parents="intermediateTitles" @regenerate-title="regenerateTitle"
                  @regenerate-keyword="regenerateKeyword" @regenerate-slug="regenerateSlug"
                  @select-keyword="selectKeyword" @select-title="selectTitle" @select-slug="selectSlug"
                  @toggle-accept="toggleAccept" @remove="removeProposedArticle" @change-parent="changeParent"
                  @edit-title="editTitle" @edit-keyword="editKeyword" @edit-slug="editSlug" />
              </div>
              <AddArticleMenu
                :is-loading="addingArticleType === 'Spécialisé'"
                :disabled="addingArticleType !== null"
                label="+ Ajouter un spécialisé"
                @add-empty="addEmptyArticle('Spécialisé')"
                @add-smart="addSmartArticle('Spécialisé')"
                @add-guided="addSmartArticle('Spécialisé', $event)"
              />
            </ArticleColumn>
          </div>
        </div>

        <div v-if="store.strategy.proposedArticles.length > 0" class="article-actions">
          <button class="btn btn-primary" @click="validateArticles">
            Tout valider
          </button>
        </div>
      </div>
      </div>

      <!-- Navigation -->
      <div class="wizard-nav">
        <button v-if="store.currentStep > 0" class="btn-prev" @click="store.prevStep()">
          Précédent
        </button>
        <div class="wizard-nav-right">
          <button class="btn-next" @click="handleNext">
            {{ store.currentStep === 5 ? 'Terminer le brainstorm' : 'Suivant' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.brain-phase {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* --- Header --- */
.brain-header {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.brain-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.brain-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.brain-subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
}

.brain-loading {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
}

/* --- Wizard stepper --- */
.wizard-stepper {
  display: flex;
  gap: 2px;
  overflow-x: auto;
}

.wizard-step-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: var(--color-bg-soft);
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}

.wizard-step-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.wizard-step-btn:last-child {
  border-radius: 0 6px 6px 0;
}

.wizard-step-btn.active {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.wizard-step-btn.completed {
  background: var(--color-bg-elevated, #e8f5e9);
  color: var(--color-success);
}

.wizard-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.1);
}

.wizard-step-btn.active .wizard-step-num {
  background: rgba(255, 255, 255, 0.3);
}

.wizard-step-btn.completed .wizard-step-num {
  background: var(--color-success);
  color: white;
}

/* --- Step content --- */
.brain-step-content {
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

/* --- Article proposal (step 6) --- */
.truncation-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.step-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.step-header-text {
  flex: 1;
  min-width: 0;
}

.step-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.375rem;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.btn-generate {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.btn-generate:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.article-columns {
  position: relative;
  margin-bottom: 1rem;
}

.article-columns-track {
  display: flex;
  gap: 1.25rem;
  align-items: start;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.article-columns-track::-webkit-scrollbar {
  display: none;
}

/* Spacer — extends scrollable area so slide 2 (Inter+Spé) is fully reachable */
.article-columns-track::after {
  content: '';
  flex: 0 0 calc(50% - 2rem);
}

/* --- Structural warnings --- */
.structural-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
  font-size: 0.8125rem;
}

.structural-warning-item {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.structural-warning-icon {
  flex-shrink: 0;
  font-size: 0.75rem;
}

/* --- Spec group (grouped by parent Inter) --- */
.spec-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spec-group+.spec-group {
  margin-top: 0.75rem;
}

.spec-group--orphan .spec-group-header {
  border-style: dashed;
}

.spec-group-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
}

.spec-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.spec-group-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* --- Navigation --- */
.wizard-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.wizard-nav-right {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.btn-prev {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
}

.btn-prev:hover {
  background: var(--color-bg-soft);
}

.btn-next {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.btn-next:hover {
  background: var(--color-primary-hover);
}

/* --- Shared --- */
.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-sm {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

/* --- Drag-to-scroll --- */
.article-columns-track.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
  user-select: none;
}

.article-columns-track:not(.is-dragging) {
  cursor: grab;
}

/* --- Swiper nav (inline in header) --- */
.article-proposal-wrapper {
  display: flex;
  flex-direction: column;
}

.swiper-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.swiper-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
}

.swiper-arrow:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.swiper-arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

@media (max-width: 900px) {
  .step-header-row {
    flex-direction: column;
  }

  .step-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .article-columns-track {
    flex-direction: column;
    overflow-x: visible;
    scroll-snap-type: none;
  }

  .article-columns-track::after {
    display: none;
  }

  .swiper-nav {
    display: none;
  }

  .article-column--peek {
    opacity: 1;
    cursor: default;
  }

  .article-column {
    flex: 0 0 auto;
    width: 100%;
    max-width: none;
    scroll-snap-align: none;
  }
}
</style>
