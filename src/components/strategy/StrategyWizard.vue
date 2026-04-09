<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStrategyStore } from '@/stores/strategy.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useSilosStore } from '@/stores/silos.store'
import { useThemeConfigStore } from '@/stores/theme-config.store'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import type { StrategySuggestRequest, StrategyStepData, CtaData, AiguillageData, ThemeContext, SubQuestion } from '@shared/types/index.js'
import StrategyStep from './StrategyStep.vue'
import AiguillageStep from './AiguillageStep.vue'
import CtaStep from './CtaStep.vue'
import ContextRecap from './ContextRecap.vue'
import { provideRecapRadioGroup } from '@/composables/useRecapRadioGroup'

const props = defineProps<{
  slug: string
  articleTitle: string
  cocoonName: string
  siloName: string
}>()

const emit = defineEmits<{
  (e: 'complete'): void
  (e: 'skip'): void
}>()

provideRecapRadioGroup()

const store = useStrategyStore()
const cocoonsStore = useCocoonsStore()
const silosStore = useSilosStore()
const themeConfigStore = useThemeConfigStore()
const cocoonStrategyStore = useCocoonStrategyStore()
const suggestingSubId = ref<string | null>(null)

const stepConfigs = [
  { key: 'cible', title: 'Qui est votre cible ?', description: "Décrivez le persona du lecteur idéal : son métier, la taille de son entreprise, sa situation actuelle." },
  { key: 'douleur', title: 'Quelle douleur adressez-vous ?', description: "Quel problème, frustration ou besoin non comblé cet article vient résoudre ?" },
  { key: 'aiguillage', title: 'Aiguillage sémantique', description: "Où se positionne cet article dans l'arborescence du cocon ?" },
  { key: 'angle', title: 'Quel est votre angle ?', description: "Qu'est-ce qui rend votre approche unique par rapport aux concurrents ?" },
  { key: 'promesse', title: 'Quelle promesse faites-vous ?', description: "Quel résultat concret et tangible le lecteur obtiendra après avoir lu cet article ?" },
  { key: 'cta', title: 'Call-to-Action', description: "Où voulez-vous envoyer le lecteur après sa lecture ?" },
]

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.name === props.cocoonName) ?? null
)

const currentSilo = computed(() =>
  silosStore.silos.find(s => s.nom === props.siloName) ?? null
)

const cocoonStrategyAnswers = computed(() =>
  cocoonStrategyStore.getPreviousAnswers()
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
    cocoonArticles: cocoon.value?.articles.map(a => `${a.title} (${a.type})`) ?? [],
    cocoonStrategy: Object.keys(cocoonStrategyAnswers.value).length ? cocoonStrategyAnswers.value : undefined,
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

function getSuggestContext(): StrategySuggestRequest['context'] {
  return {
    articleTitle: props.articleTitle,
    cocoonName: props.cocoonName,
    siloName: props.siloName,
    existingArticles: cocoon.value?.articles.map(a => a.title) ?? [],
    previousAnswers: store.getPreviousAnswers(),
    themeContext: buildThemeContext(),
  }
}

function getCurrentInput(): string {
  const step = store.currentStepName
  if (step === 'aiguillage') return `Type actuel: ${store.strategy?.aiguillage.suggestedType ?? 'non défini'}`
  if (step === 'cta') return `Type: ${store.strategy?.cta.type}, Target: ${store.strategy?.cta.target}`
  return (store.strategy as any)?.[step]?.input ?? ''
}

function applySuggestion(suggestion: string) {
  const step = store.currentStepName
  if (!store.strategy) return
  if (step === 'aiguillage') {
    // For aiguillage, just store suggestion text — the component handles the rest
  } else if (step === 'cta') {
    store.strategy.cta = { ...store.strategy.cta, suggestion }
  } else {
    const stepData = (store.strategy as any)[step] as StrategyStepData
    ;(store.strategy as any)[step] = { ...stepData, suggestion }
  }
}

async function handleSuggest() {
  const suggestion = await store.requestSuggestion(props.slug, {
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

  const suggestion = await store.requestSuggestion(props.slug, {
    step,
    currentInput: getCurrentInput(),
    mergeWith: currentSuggestion,
    existingValidated: stepData.validated || undefined,
    context: getSuggestContext(),
  })
  if (suggestion && store.strategy) {
    ;(store.strategy as any)[step] = { ...stepData, validated: suggestion }
  }
}

async function handleDeepen() {
  const step = store.currentStepName
  if (step === 'aiguillage' || step === 'cta') return
  const stepData = (store.strategy as any)?.[step] as StrategyStepData
  if (!stepData) return

  const result = await store.requestDeepen(props.slug, {
    step: step as 'cible' | 'douleur' | 'angle' | 'promesse',
    mainQuestion: stepConfigs.find(c => c.key === step)?.title ?? '',
    mainAnswer: stepData.input || stepData.validated,
    existingSubQuestions: (stepData.subQuestions ?? []).map(sq => ({
      question: sq.question,
      answer: sq.validated || sq.input,
    })),
    context: getSuggestContext(),
  })

  if (result) {
    const newSq: SubQuestion = {
      id: crypto.randomUUID(),
      question: result.question,
      description: result.description,
      input: '',
      suggestion: null,
      validated: '',
    }
    ;(store.strategy as any)[step] = {
      ...stepData,
      subQuestions: [...(stepData.subQuestions ?? []), newSq],
    }
  }
}

async function handleSubSuggest(subId: string) {
  const step = store.currentStepName
  const stepData = (store.strategy as any)?.[step] as StrategyStepData
  const sq = stepData?.subQuestions?.find((s: SubQuestion) => s.id === subId)
  if (!sq) return

  suggestingSubId.value = subId
  try {
    const suggestion = await store.requestSuggestion(props.slug, {
      step: store.currentStepName,
      currentInput: `[Sous-question : "${sq.question}"] ${sq.input}`,
      context: getSuggestContext(),
    })

    if (suggestion) {
      const updatedSubs = (stepData.subQuestions ?? []).map((s: SubQuestion) =>
        s.id === subId ? { ...s, suggestion } : s,
      )
      ;(store.strategy as any)[step] = { ...stepData, subQuestions: updatedSubs }
    }
  } finally {
    suggestingSubId.value = null
  }
}

async function handleSubMerge(subId: string) {
  const step = store.currentStepName
  const stepData = (store.strategy as any)?.[step] as StrategyStepData
  const sq = stepData?.subQuestions?.find((s: SubQuestion) => s.id === subId)
  if (!sq?.suggestion) return

  suggestingSubId.value = subId
  try {
    const suggestion = await store.requestSuggestion(props.slug, {
      step: store.currentStepName,
      currentInput: `[Sous-question : "${sq.question}"] ${sq.input}`,
      mergeWith: sq.suggestion,
      context: getSuggestContext(),
    })

    if (suggestion) {
      const updatedSubs = (stepData.subQuestions ?? []).map((s: SubQuestion) =>
        s.id === subId ? { ...s, suggestion, validated: suggestion } : s,
      )
      ;(store.strategy as any)[step] = { ...stepData, subQuestions: updatedSubs }
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
  const step = store.currentStepName
  const stepData = (store.strategy as any)?.[step] as StrategyStepData
  if (!stepData?.subQuestions) return
  ;(store.strategy as any)[step] = {
    ...stepData,
    subQuestions: stepData.subQuestions.filter((sq: SubQuestion) => sq.id !== subId),
  }
}

async function handleSubEnrich(subId: string) {
  const step = store.currentStepName
  const stepData = (store.strategy as any)?.[step] as StrategyStepData
  if (!stepData?.subQuestions) return

  const sub = stepData.subQuestions.find((sq: SubQuestion) => sq.id === subId)
  if (!sub) return

  const subAnswer = sub.validated || sub.input
  if (!subAnswer.trim()) return

  // If no main validated text yet, use the sub-answer directly
  if (!stepData.validated.trim()) {
    ;(store.strategy as any)[step] = { ...stepData, validated: subAnswer }
    return
  }

  const enriched = await store.requestEnrich(props.slug, {
    step: step as 'cible' | 'douleur' | 'angle' | 'promesse',
    existingValidated: stepData.validated,
    subQuestion: sub.question,
    subAnswer,
    context: getSuggestContext(),
  })

  if (enriched) {
    ;(store.strategy as any)[step] = { ...stepData, validated: enriched }
  }
}

function updateStepData(step: string, data: StrategyStepData) {
  if (store.strategy) {
    ;(store.strategy as any)[step] = data
  }
}

function updateAiguillage(data: AiguillageData) {
  if (store.strategy) {
    store.strategy.aiguillage = data
  }
}

function updateCta(data: CtaData) {
  if (store.strategy) {
    store.strategy.cta = data
  }
}

function handleNext() {
  if (store.currentStep === 5) {
    // Last step — mark as complete
    if (store.strategy) {
      store.strategy.completedSteps = 6
    }
    store.saveStrategy(props.slug)
    emit('complete')
  } else {
    store.nextStep(props.slug)
  }
}

const cocoonSlug = computed(() =>
  props.cocoonName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
)

onMounted(async () => {
  await store.fetchStrategy(props.slug)
  if (!store.strategy) {
    store.initEmpty(props.slug)
  }
  if (cocoonsStore.cocoons.length === 0) {
    await cocoonsStore.fetchCocoons()
  }
  if (silosStore.silos.length === 0) {
    await silosStore.fetchSilos()
  }
  await themeConfigStore.fetchConfig()
  await cocoonStrategyStore.fetchStrategy(cocoonSlug.value)
})
</script>

<template>
  <div class="strategy-wizard">
    <!-- Stepper progress -->
    <div class="wizard-stepper">
      <button
        v-for="(config, idx) in stepConfigs"
        :key="config.key"
        class="wizard-step-btn"
        :class="{
          active: store.currentStep === idx,
          completed: idx < store.currentStep,
        }"
        @click="store.goToStep(idx)"
      >
        <span class="wizard-step-num">{{ idx + 1 }}</span>
        <span class="wizard-step-label">{{ config.title.split('?')[0]?.split(':')[0]?.trim() }}</span>
      </button>
    </div>

    <div v-if="store.isLoading" class="loading">Chargement...</div>

    <template v-else-if="store.strategy">
      <!-- Context recap (collapsible) -->
      <ContextRecap
        :theme-name="silosStore.theme?.nom"
        :theme-description="silosStore.theme?.description"
        :silo-name="props.siloName"
        :silo-description="currentSilo?.description"
        :cocoon-name="props.cocoonName"
        :cocoon-articles="cocoon?.articles.map(a => `${a.title} (${a.type})`)"
        :article-title="props.articleTitle"
        :previous-answers="store.getPreviousAnswers()"
        :cocoon-strategy="cocoonStrategyAnswers"
        :theme-config="buildThemeContext().themeConfig"
      />

      <!-- Steps 1, 2, 4, 5 — generic StrategyStep -->
      <StrategyStep
        v-if="['cible', 'douleur', 'angle', 'promesse'].includes(store.currentStepName)"
        :key="store.currentStepName"
        :title="stepConfigs[store.currentStep]?.title ?? ''"
        :description="stepConfigs[store.currentStep]?.description ?? ''"
        :step-data="(store.strategy as any)?.[store.currentStepName]"
        :is-suggesting="store.isProcessing"
        :is-deepening="store.isDeepening"
        :suggesting-sub-id="suggestingSubId"
        @update:step-data="updateStepData(store.currentStepName as string, $event)"
        @request-suggestion="handleSuggest"
        @request-merge="handleMerge"
        @request-deepen="handleDeepen"
        @request-sub-suggestion="handleSubSuggest"
        @request-sub-merge="handleSubMerge"
        @delete-sub-question="handleDeleteSubQuestion"
        @request-enrich="handleSubEnrich"
      />

      <!-- Step 3 — AiguillageStep -->
      <AiguillageStep
        v-else-if="store.currentStepName === 'aiguillage'"
        :aiguillage="store.strategy.aiguillage"
        :cocoon="cocoon"
        :is-suggesting="store.isProcessing"
        @update:aiguillage="updateAiguillage"
        @request-suggestion="handleSuggest"
      />

      <!-- Step 6 — CtaStep -->
      <CtaStep
        v-else-if="store.currentStepName === 'cta'"
        :cta="store.strategy.cta"
        :is-suggesting="store.isProcessing"
        @update:cta="updateCta"
        @request-suggestion="handleSuggest"
      />
    </template>

    <!-- Navigation -->
    <div class="wizard-nav">
      <button
        v-if="store.currentStep > 0"
        class="btn-prev"
        @click="store.prevStep()"
      >
        Précédent
      </button>
      <div class="wizard-nav-right">
        <button class="btn-skip" @click="$emit('skip')">
          Passer au Brief
        </button>
        <button class="btn-next" @click="handleNext">
          {{ store.currentStep === 5 ? 'Terminer la stratégie' : 'Suivant' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.strategy-wizard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

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

.wizard-step-btn:first-child { border-radius: 6px 0 0 6px; }
.wizard-step-btn:last-child { border-radius: 0 6px 6px 0; }

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

.wizard-step-btn.active .wizard-step-num { background: rgba(255, 255, 255, 0.3); }
.wizard-step-btn.completed .wizard-step-num { background: var(--color-success); color: white; }

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
}

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

.btn-skip {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
}

.btn-skip:hover {
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
