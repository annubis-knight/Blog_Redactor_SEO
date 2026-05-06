<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useSilosStore } from '@/stores/strategy/silos.store'
import { useThemeConfigStore } from '@/stores/strategy/theme-config.store'
import { useWorkflowNavStore } from '@/stores/ui/workflow-nav.store'
import type { StrategyStepData, CocoonSuggestRequest, ThemeContext, SubQuestion } from '@shared/types/index.js'
import type { NavItem } from '@/components/shared/WorkflowNav.vue'
import StrategyStep from '@/components/strategy/StrategyStep.vue'
import ContextRecap from '@/components/strategy/ContextRecap.vue'
import BrainArticleProposalView from '@/components/production/brain/BrainArticleProposalView.vue'
import { useArticleProposals } from '@/composables/editor/useArticleProposals'
import { provideRecapRadioGroup } from '@/composables/ui/useRecapRadioGroup'

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

  // Build id→proposed map for accepted articles already created in DB
  const proposedById = new Map<number, (typeof proposed)[0]>()
  for (const p of proposed) {
    if (p.accepted && p.createdInDb && p.dbId) {
      proposedById.set(p.dbId, p)
    }
  }

  const seenIds = new Set<number>()
  const result: string[] = []

  // DB articles — overlay strategy-store title when available
  for (const dbArt of dbArticles) {
    const match = proposedById.get(dbArt.id)
    if (match) {
      result.push(`${match.title} (${match.type})`)
      seenIds.add(dbArt.id)
    } else {
      result.push(`${dbArt.title} (${dbArt.type})`)
    }
  }

  // Accepted proposed articles not yet in DB
  for (const p of proposed) {
    if (p.accepted && !p.createdInDb && p.title.trim()) {
      result.push(`${p.title} (${p.type})`)
    }
  }

  return result
})


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
  groupColors: _groupColors,
  groupedSpecArticles,
  compositionResults,
  intermediateTitles,
  normalizeTitle: _normalizeTitle,
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
  updatePainIntent,
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

// --- AppNavbar integration ---
// Cerveau = 6 linear steps. A step is `done` when its index < currentStep
// (store.goToStep validates the progression rules internally), and `locked`
// when it's beyond the highest step the user has reached so far.
const workflowNavStore = useWorkflowNavStore()

const CERVEAU_STEPS: { id: string; label: string }[] = [
  { id: 'cible',    label: 'Cible' },
  { id: 'douleur',  label: 'Douleur' },
  { id: 'angle',    label: 'Angle' },
  { id: 'promesse', label: 'Promesse' },
  { id: 'cta',      label: 'CTA' },
  { id: 'articles', label: 'Articles' },
]

const cerveauNavSteps = computed<NavItem[]>(() => {
  const current = store.currentStep ?? 0
  const completed = store.strategy?.completedSteps ?? 0
  return CERVEAU_STEPS.map((s, idx) => ({
    id: s.id,
    label: s.label,
    number: idx + 1,
    done: idx < completed,
    // Free navigation to any step already visited; future steps are locked
    // until the store's completedSteps counter unlocks them.
    locked: idx > Math.max(current, completed),
  }))
})

watch(
  [cerveauNavSteps, () => store.currentStep],
  ([steps, currentStep]) => {
    const activeId = CERVEAU_STEPS[currentStep ?? 0]?.id ?? 'cible'
    workflowNavStore.setWorkflowNav({
      workflow: 'cerveau',
      activeId,
      steps,
      onNavigate: (id: string) => {
        const idx = CERVEAU_STEPS.findIndex(s => s.id === id)
        if (idx >= 0) store.goToStep(idx)
      },
    })
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => { workflowNavStore.clearWorkflowNav() })
</script>

<template>
  <div class="brain-phase">
    <!-- Sprint — Brainstorm header + progress bar removed. The final "Continuer
         vers le Moteur" button at the end of step 6 remains the single CTA. -->

    <div v-if="store.isLoading" class="brain-loading">
      Chargement de la stratégie...
    </div>

    <template v-else-if="store.strategy">
      <!-- Sprint — wizard stepper moved into AppNavbar via workflow-nav store. -->


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
      <BrainArticleProposalView
        v-else
        :article-columns="articleColumns"
        :grouped-spec-articles="groupedSpecArticles"
        :composition-results="compositionResults"
        :article-warnings="articleWarnings"
        :intermediate-titles="intermediateTitles"
        :global-warnings="globalWarnings"
        :truncation-warning="truncationWarning"
        :generation-warning="generationWarning"
        :generation-phase="generationPhase"
        :adding-article-type="addingArticleType"
        :topics-loading="topicsLoading"
        :topics-error="topicsError"
        :proposed-articles-count="store.strategy.proposedArticles.length"
        :suggested-topics="store.strategy?.suggestedTopics ?? []"
        :topics-user-context="store.strategy?.topicsUserContext ?? ''"
        @generate-proposals="generateArticleProposals"
        @validate-articles="validateArticles"
        @toggle-topic="toggleTopic"
        @remove-topic="removeTopic"
        @add-topic="addTopic"
        @regenerate-topics="generateTopics"
        @update:user-context="updateUserContext"
        @add-empty="addEmptyArticle"
        @add-smart="(type, hint) => addSmartArticle(type, hint)"
        @remove-proposed="removeProposedArticle"
        @toggle-accept="toggleAccept"
        @regenerate-title="regenerateTitle"
        @select-title="selectTitle"
        @regenerate-keyword="regenerateKeyword"
        @select-keyword="selectKeyword"
        @regenerate-slug="regenerateSlug"
        @select-slug="selectSlug"
        @change-parent="changeParent"
        @edit-title="editTitle"
        @edit-keyword="editKeyword"
        @edit-slug="editSlug"
        @update-pain-intent="updatePainIntent"
      />

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

.brain-loading {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
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
</style>
