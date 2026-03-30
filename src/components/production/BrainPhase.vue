<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useSilosStore } from '@/stores/silos.store'
import { useThemeConfigStore } from '@/stores/theme-config.store'
import type { StrategyStepData, CocoonSuggestRequest, ProposedArticle, ThemeContext, SubQuestion } from '@shared/types/index.js'
import { apiPost } from '@/services/api.service'
import StrategyStep from '@/components/strategy/StrategyStep.vue'
import ContextRecap from '@/components/strategy/ContextRecap.vue'
import ProgressBar from '@/components/shared/ProgressBar.vue'
import ProposedArticleRow from '@/components/strategy/ProposedArticleRow.vue'

const props = defineProps<{
  cocoonName: string
  siloName: string
  cocoonId: number
}>()

const emit = defineEmits<{
  (e: 'next'): void
}>()

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
    cocoonArticles: cocoon.value?.articles.map(a => `${a.title} (${a.type})`) ?? [],
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
  ;(store.strategy as any)[step] = { ...stepData, suggestion }
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
    ;(store.strategy as any)[step] = { ...stepData, validated: suggestion }
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
    ;(store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
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
      ;(store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
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
      ;(store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
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
  ;(store.strategy as any)[stepName] = { ...stepData, subQuestions: subs }
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
    ;(store.strategy as any)[stepName] = { ...stepData, validated: subAnswer }
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
    ;(store.strategy as any)[stepName] = { ...stepData, validated: enriched }
  }
}

function updateStepData(step: string, data: StrategyStepData) {
  if (store.strategy) {
    ;(store.strategy as any)[step] = data
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

// --- Article proposal (step 6) ---
const truncationWarning = ref<string | null>(null)

function addProposedArticle(type: 'Pilier' | 'Intermédiaire' | 'Spécialisé' = 'Spécialisé') {
  if (!store.strategy) return
  store.strategy.proposedArticles.push({
    title: '',
    suggestedTitles: [],
    type,
    parentTitle: null,
    rationale: '',
    painPoint: '',
    suggestedKeyword: '',
    suggestedKeywords: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
  })
}

function removeProposedArticle(index: number) {
  if (!store.strategy) return
  store.strategy.proposedArticles.splice(index, 1)
}

async function createArticleInDb(article: ProposedArticle): Promise<void> {
  if (article.createdInDb || !article.title.trim()) return
  try {
    await apiPost('/articles/batch-create', {
      cocoonName: props.cocoonName,
      articles: [{ title: article.title, type: article.type }],
    })
    if (article.suggestedKeyword.trim()) {
      await apiPost('/keywords', {
        keyword: article.suggestedKeyword,
        cocoonName: props.cocoonName,
        type: article.type,
      })
    }
    article.createdInDb = true
  } catch {
    // Slug duplicate or other error — silently ignore
  }
}

async function toggleAccept(index: number) {
  if (!store.strategy) return
  const article = store.strategy.proposedArticles[index]
  if (!article) return
  const nowAccepted = !article.accepted
  store.strategy.proposedArticles[index] = { ...article, accepted: nowAccepted }
  if (nowAccepted && !article.createdInDb) {
    await createArticleInDb(store.strategy.proposedArticles[index])
    store.saveStrategy(cocoonSlug.value)
    await cocoonsStore.fetchCocoons()
  }
}

async function regenerateTitle(index: number) {
  if (!store.strategy) return
  const article = store.strategy.proposedArticles[index]
  if (!article) return
  const context = getSuggestContext()

  const typeRules: Record<string, string> = {
    'Pilier': 'Ton d\'expert, ancrage local naturel. Ne PAS écrire "PME" — utiliser "entreprises", "dirigeants". Ne PAS plaquer "Toulouse" — utiliser "toulousain", "Occitanie".',
    'Intermédiaire': 'Spécifique métier ou technique. PAS de ville. Utiliser des synonymes de PME ("activité", "structure", "équipe").',
    'Spécialisé': 'Question directe ou problème concret que le dirigeant se pose, en langage courant (pas de jargon).',
  }

  const allPreviousTitles = article.suggestedTitles?.length ? article.suggestedTitles.join('" / "') : article.title
  const suggestion = await store.requestSuggestion(cocoonSlug.value, {
    step: 'articles',
    currentInput: `Régénère uniquement le titre de cet article de type "${article.type}" pour le cocon "${props.cocoonName}". Mot-clé technique : "${article.suggestedKeyword}". Titres déjà générés à NE PAS réutiliser : "${allPreviousTitles}". Propose un titre DIFFÉRENT. Règle pour ce type : ${typeRules[article.type] ?? ''}. Le titre doit intégrer le mot-clé de façon naturelle, pas mot pour mot. Réponds avec un seul nouveau titre, sans guillemets, sans explication.`,
    context,
  })
  if (suggestion && store.strategy) {
    const newTitle = suggestion.trim().replace(/^["«]|["»]$/g, '')
    const history = [...(article.suggestedTitles || [article.title]), newTitle]
    const uniqueHistory = [...new Set(history)]
    store.strategy.proposedArticles[index] = { ...article, title: newTitle, suggestedTitles: uniqueHistory }
  }
}

function selectTitle(articleIndex: number, titleIndex: number) {
  if (!store.strategy) return
  const article = store.strategy.proposedArticles[articleIndex]
  if (!article?.suggestedTitles?.[titleIndex]) return
  store.strategy.proposedArticles[articleIndex] = {
    ...article,
    title: article.suggestedTitles[titleIndex],
  }
}

async function regenerateKeyword(index: number) {
  if (!store.strategy) return
  const article = store.strategy.proposedArticles[index]
  if (!article) return
  const context = getSuggestContext()

  const typeRules: Record<string, string> = {
    'Pilier': 'Moyenne traîne (3-4 mots), inclure la cible et la ville/région. Exemple : "stratégie digitale entreprises Toulouse".',
    'Intermédiaire': 'Moyenne traîne (3-4 mots), sujet + cible. PAS de ville. Exemple : "design émotionnel site professionnel".',
    'Spécialisé': 'Longue traîne (5+ mots), sous forme de question ou problème concret. Exemple : "comment choisir couleurs site web professionnel".',
  }

  const allPrevious = article.suggestedKeywords?.length ? article.suggestedKeywords.join(', ') : article.suggestedKeyword
  const suggestion = await store.requestSuggestion(cocoonSlug.value, {
    step: 'articles',
    currentInput: `Régénère uniquement le mot-clé technique de cet article de type "${article.type}" pour le cocon "${props.cocoonName}". Titre actuel : "${article.title}". Mots-clés déjà générés à NE PAS réutiliser : ${allPrevious}. Propose un mot-clé DIFFÉRENT. Règle pour ce type : ${typeRules[article.type] ?? ''}. Le mot-clé doit être une requête Google réaliste que tapent de vrais dirigeants d'entreprise. Réponds avec un seul mot-clé, sans guillemets, sans explication.`,
    context,
  })
  if (suggestion && store.strategy) {
    const newKeyword = suggestion.trim().replace(/^["«]|["»]$/g, '')
    const history = [...(article.suggestedKeywords || [article.suggestedKeyword]), newKeyword]
    const uniqueHistory = [...new Set(history)]
    store.strategy.proposedArticles[index] = { ...article, suggestedKeyword: newKeyword, suggestedKeywords: uniqueHistory }
  }
}

function selectKeyword(articleIndex: number, keywordIndex: number) {
  if (!store.strategy) return
  const article = store.strategy.proposedArticles[articleIndex]
  if (!article?.suggestedKeywords?.[keywordIndex]) return
  store.strategy.proposedArticles[articleIndex] = {
    ...article,
    suggestedKeyword: article.suggestedKeywords[keywordIndex],
  }
}

const articleColumns = computed(() => {
  if (!store.strategy) return []
  const cols = [
    { key: 'pilier', label: 'Pilier', cssClass: 'col-pilier', type: 'Pilier' as const, tooltip: 'Mot-clé : moyenne traîne (3-4 mots), inclure cible + ville.\nTitre : ancrage local naturel, pas de « PME » brut.\nEx : stratégie digitale entreprises Toulouse' },
    { key: 'inter', label: 'Intermédiaire', cssClass: 'col-inter', type: 'Intermédiaire' as const, tooltip: 'Mot-clé : moyenne traîne (3-4 mots), sans ville.\nTitre : spécifique métier/technique.\nEx : design émotionnel site professionnel' },
    { key: 'spec', label: 'Spécialisé', cssClass: 'col-spec', type: 'Spécialisé' as const, tooltip: 'Mot-clé : longue traîne (5+ mots), forme question.\nTitre : problème concret, langage du dirigeant.\nEx : comment choisir couleurs site web professionnel' },
  ]
  return cols.map(col => ({
    ...col,
    articles: store.strategy!.proposedArticles
      .map((a, i) => ({ ...a, originalIndex: i }))
      .filter(a => a.type === col.type),
  }))
})

/** Extract individual article objects from possibly-truncated JSON */
function extractArticlesFromJson(text: string): ProposedArticle[] {
  // Strip markdown code fences
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

  // Match each complete { ... } object that has at least a "title"
  const objectRegex = /\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/g
  const matches = stripped.match(objectRegex)
  if (!matches) return []

  const articles: ProposedArticle[] = []
  for (const raw of matches) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>
      if (typeof obj.title === 'string' && obj.title.trim()) {
        articles.push({
          title: obj.title.trim(),
          suggestedTitles: [obj.title.trim()],
          type: (['Pilier', 'Intermédiaire', 'Spécialisé'] as const).includes(obj.type as any) ? (obj.type as 'Pilier' | 'Intermédiaire' | 'Spécialisé') : 'Spécialisé',
          parentTitle: (obj.parentTitle as string) ?? null,
          rationale: (obj.rationale as string) ?? '',
          painPoint: (obj.painPoint as string) ?? '',
          suggestedKeyword: (obj.suggestedKeyword as string) ?? '',
          suggestedKeywords: (obj.suggestedKeyword as string) ? [(obj.suggestedKeyword as string)] : [],
          validatedSearchQuery: null,
          keywordValidated: false,
          searchQueryValidated: false,
          titleValidated: false,
          accepted: false,
          createdInDb: false,
        })
      }
    } catch { /* skip malformed object */ }
  }
  return articles
}

async function generateArticleProposals() {
  truncationWarning.value = null
  const context = getSuggestContext()
  const suggestion = await store.requestSuggestion(cocoonSlug.value, {
    step: 'articles',
    currentInput: `Génère les articles pour ce cocon.`,
    context,
  })

  if (suggestion && store.strategy) {
    // Count total "title" occurrences to detect truncation
    const titleOccurrences = (suggestion.match(/"title"\s*:/g) || []).length

    // 1. Try full JSON array parse
    try {
      const jsonMatch = suggestion.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const articles = JSON.parse(jsonMatch[0]) as ProposedArticle[]
        store.strategy.proposedArticles = articles.map(a => ({
          title: a.title ?? '',
          suggestedTitles: a.title ? [a.title] : [],
          type: a.type ?? 'Spécialisé',
          parentTitle: a.parentTitle ?? null,
          rationale: a.rationale ?? '',
          painPoint: a.painPoint ?? '',
          suggestedKeyword: a.suggestedKeyword ?? '',
          suggestedKeywords: a.suggestedKeyword ? [a.suggestedKeyword] : [],
          validatedSearchQuery: null,
          keywordValidated: false,
          searchQueryValidated: false,
          titleValidated: false,
          accepted: false,
          createdInDb: false,
        }))
        return
      }
    } catch { /* JSON parse failed (likely truncated) — try object-by-object */ }

    // 2. Extract individual objects (handles truncated JSON)
    const extracted = extractArticlesFromJson(suggestion)
    if (extracted.length > 0) {
      store.strategy.proposedArticles = extracted
      // Detect truncation
      const lost = titleOccurrences - extracted.length
      if (lost > 0) {
        truncationWarning.value = `${lost} article${lost > 1 ? 's' : ''} tronqué${lost > 1 ? 's' : ''} dans la réponse IA — seuls les articles complets sont affichés.`
      }
      return
    }

    // 3. Last resort
    store.strategy.proposedArticles = [{
      title: 'Article à définir',
      suggestedTitles: ['Article à définir'],
      type: 'Pilier',
      parentTitle: null,
      rationale: suggestion,
      painPoint: '',
      suggestedKeyword: '',
      suggestedKeywords: [],
      validatedSearchQuery: null,
      keywordValidated: false,
      searchQueryValidated: false,
      titleValidated: false,
      accepted: false,
      createdInDb: false,
    }]
  }
}

async function validateArticles() {
  if (!store.strategy) return
  store.strategy.proposedArticles = store.strategy.proposedArticles.map(a => ({ ...a, accepted: true }))
  const toCreate = store.strategy.proposedArticles.filter(a => !a.createdInDb)
  for (const article of toCreate) {
    await createArticleInDb(article)
  }
  if (toCreate.length > 0) {
    store.saveStrategy(cocoonSlug.value)
    await cocoonsStore.fetchCocoons()
  }
}

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
      <ProgressBar
        :percent="progressPercent"
        :color="progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'"
      />
    </div>

    <div v-if="store.isLoading" class="brain-loading">
      Chargement de la stratégie...
    </div>

    <template v-else-if="store.strategy">
      <!-- Wizard stepper -->
      <div class="wizard-stepper">
        <button
          v-for="(config, idx) in [...stepConfigs, { key: 'articles', title: 'Articles' }]"
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

      <!-- Context recap (collapsible) -->
      <ContextRecap
        :theme-name="silosStore.theme?.nom"
        :theme-description="silosStore.theme?.description"
        :silo-name="props.siloName"
        :silo-description="currentSilo?.description"
        :cocoon-name="props.cocoonName"
        :cocoon-articles="cocoon?.articles.map(a => `${a.title} (${a.type})`)"
        :previous-answers="store.getPreviousAnswers()"
        :theme-config="buildThemeContext().themeConfig"
      />

      <!-- Steps 1-5: Q&A with StrategyStep -->
      <StrategyStep
        v-if="store.currentStep < 5"
        :key="store.currentStepName"
        :title="stepConfigs[store.currentStep]?.title ?? ''"
        :description="stepConfigs[store.currentStep]?.description ?? ''"
        :step-data="(store.strategy as any)[store.currentStepName]"
        :is-suggesting="store.isSuggesting"
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

      <!-- Step 6: Article proposal -->
      <div v-else class="brain-step-content article-proposal">
        <h3 class="step-title">Proposition d'articles</h3>
        <p class="step-desc">
          En se basant sur vos réponses stratégiques, Claude peut proposer une liste
          d'articles pour ce cocon avec leur type (Pilier, Intermédiaire, Spécialisé).
        </p>

        <button
          class="btn-generate"
          :disabled="store.isSuggesting"
          @click="generateArticleProposals"
        >
          {{ store.isSuggesting ? 'Génération en cours...' : 'Générer les articles avec Claude' }}
        </button>

        <!-- Truncation warning -->
        <div v-if="truncationWarning" class="truncation-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ truncationWarning }}
        </div>

        <!-- 3-column article grid (always visible) -->
        <div class="article-columns">
          <div
            v-for="col in articleColumns"
            :key="col.key"
            class="article-column"
          >
            <div class="column-header" :class="col.cssClass">
              <span class="column-label">{{ col.label }}</span>
              <span class="column-info-wrapper">
                <svg class="column-info-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2" />
                  <path d="M8 7v4M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <div class="column-tooltip">{{ col.tooltip }}</div>
              </span>
              <span class="column-count">{{ col.articles.length }}</span>
            </div>
            <div class="column-cards">
              <ProposedArticleRow
                v-for="article in col.articles"
                :key="article.originalIndex"
                :article="article"
                :index="article.originalIndex"
                @regenerate-title="regenerateTitle"
                @regenerate-keyword="regenerateKeyword"
                @select-keyword="selectKeyword"
                @select-title="selectTitle"
                @toggle-accept="toggleAccept"
                @remove="removeProposedArticle"
              />
              <button class="add-article-placeholder" @click="addProposedArticle(col.type)">
                + Ajouter un {{ col.label.toLowerCase() }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="store.strategy.proposedArticles.length > 0" class="article-actions">
          <button class="btn btn-primary" @click="validateArticles">
            Tout valider
          </button>
        </div>
      </div>

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

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.375rem;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0 0 1rem;
  line-height: 1.5;
}

.btn-generate {
  padding: 0.625rem 1.25rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  margin-bottom: 1rem;
}

.btn-generate:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.article-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: start;
  margin-bottom: 1rem;
}

.article-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.column-label {
  letter-spacing: 0.025em;
}

.column-info-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  margin-right: 0.375rem;
}

.column-info-icon {
  opacity: 0.5;
  cursor: help;
  transition: opacity 0.15s;
}

.column-info-wrapper:hover .column-info-icon {
  opacity: 1;
}

.column-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  padding: 0.625rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.5;
  white-space: pre-line;
  background: var(--color-text, #1a1a2e);
  color: var(--color-background, #fff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.column-info-wrapper:hover .column-tooltip {
  display: block;
}

.column-count {
  font-weight: 700;
  font-size: 0.75rem;
  opacity: 0.7;
}

.col-pilier {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.col-inter {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.col-spec {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.column-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-article-placeholder {
  width: 100%;
  padding: 0.5rem;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
  text-align: center;
}

.add-article-placeholder:hover {
  background: var(--color-bg-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .article-columns {
    grid-template-columns: 1fr;
  }
}

.empty-articles {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.empty-articles p {
  margin: 0;
  font-size: 0.8125rem;
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
</style>
