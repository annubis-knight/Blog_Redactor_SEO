<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { hnToOutline } from '@/stores/article/outline.store'
import { useStreaming } from '@/composables/editor/useStreaming'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { extractRoots } from '@/composables/keyword/useCapitaineValidation'
import { useLieutenantsSerp } from '@/composables/moteur/useLieutenantsSerp'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import { isResponseForCurrentArticle } from '@/utils/article-scope'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { MOTEUR_LIEUTENANTS_LOCKED } from '@shared/constants/workflow-checks.constants.js'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import LieutenantSerpAnalysis from '@/components/moteur/LieutenantSerpAnalysis.vue'
import LieutenantsAiPanel from '@/components/moteur/LieutenantsAiPanel.vue'
// Sprint 1 (2026-05-04) — restauration imports pré-C-1.
// Ces deux composants étaient importés ici avant Sprint C-1 puis migrés
// dans LieutenantsAiPanel. La régression UX a forcé leur retour ici en
// containers principaux de premier niveau. NE PAS les ré-importer dans
// LieutenantsAiPanel (test verrou architecture).
import LieutenantProposals from '@/components/moteur/LieutenantProposals.vue'
import LieutenantH2Structure from '@/components/moteur/LieutenantH2Structure.vue'
import KeywordAssistPanel from '@/components/moteur/KeywordAssistPanel.vue'
import type { SelectedArticle, SerpAnalysisResult } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'
import type { FilteredProposeLieutenantsResult, ProposedLieutenant, ProposeLieutenantsHnNode, HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'

export type { HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  mode?: 'workflow' | 'libre'
  captainKeyword: string | null
  articleLevel: ArticleLevel | null
  isCaptaineLocked: boolean
  wordGroups?: WordGroup[]
  rootKeywords?: string[]
  initialLocked?: boolean
  cocoonSlug?: string
}>(), {
  mode: 'workflow',
  wordGroups: () => [],
  rootKeywords: () => [],
  initialLocked: false,
  cocoonSlug: '',
})

const emit = defineEmits<{
  (e: 'serp-loaded', result: SerpAnalysisResult): void
  (e: 'lieutenants-updated', selected: string[]): void
  (e: 'check-completed', check: string): void
  (e: 'check-removed', check: string): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()
const activityLog = useCostLogStore()

// Direct exploration saves — each event persists to its dedicated table

/** Active tab for Structure Hn concurrents — '__all__' = merged view */
const activeHnTab = ref<string>('__all__')

// --- SERP State (Vague 3 — extracted to useLieutenantsSerp) ---
// canAnalyze + resolvedRootKeywords sont définis plus bas (dépendent de
// hasEverAnalyzed et du captainKeyword props) → on les passe en Ref via toRef
// quand le composable est appelé après leurs définitions. Pour éviter le
// chicken-and-egg, on passe des refs `computed` qui se résolvent à l'usage.
const canAnalyzeRef = computed(() => canAnalyze.value)
const resolvedRootKeywordsRef = computed(() => resolvedRootKeywords.value)
const captainKeywordRef = toRef(props, 'captainKeyword')
const articleLevelRef = toRef(props, 'articleLevel')
const selectedArticleIdRef = computed(() => props.selectedArticle?.id ?? undefined)

const {
  sliderValue,
  isLoading,
  error,
  serpResult,
  serpResultsByKeyword,
  serpDoneCount,
  serpTotalCount,
  serpPendingKeywords,
  serpCurrentKeyword,
  activeSerpTab,
  activeSerpTabResult,
  displayedCompetitors,
  hnRecurrence,
  analyzeSERP,
  computeHnRecurrenceFrom,
} = useLieutenantsSerp({
  captainKeyword: captainKeywordRef,
  articleLevel: articleLevelRef,
  selectedArticleId: selectedArticleIdRef,
  canAnalyze: canAnalyzeRef,
  resolvedRootKeywords: resolvedRootKeywordsRef,
  activityLog,
})

/** Hn recurrence for the active tab — '__all__' uses merged data, otherwise per-keyword */
const activeHnRecurrence = computed<HnRecurrenceItem[]>(() => {
  if (activeHnTab.value === '__all__') return hnRecurrence.value
  const result = serpResultsByKeyword.value.get(activeHnTab.value)
  if (!result) return []
  return computeHnRecurrenceFrom(result.competitors)
})

// F5 — La barrière `isCaptaineLocked` ne s'applique qu'au premier passage. Dès que
// l'IA a généré des propositions pour cet article, l'onglet reste accessible même
// si l'utilisateur déverrouille ensuite le Capitaine.
const hasEverAnalyzed = computed(() =>
  (articleKeywordsStore.keywords?.richLieutenants?.length ?? 0) > 0,
)

const canAnalyze = computed(() =>
  (props.isCaptaineLocked || hasEverAnalyzed.value) && !!props.captainKeyword && !isLoading.value,
)

/** Root keywords: use props if available, else generate from captain keyword */
const resolvedRootKeywords = computed(() => {
  if (props.rootKeywords.length > 0) return props.rootKeywords
  if (!props.captainKeyword) return []
  return extractRoots(props.captainKeyword).slice(0, 5)
})

// --- IA Proposal State (Phase 2 — NOUVEAU) ---
const { chunks: iaChunks, isStreaming: iaIsStreaming, error: iaError, startStream: iaStartStream, abort: iaAbort } = useStreaming<FilteredProposeLieutenantsResult>()
const lieutenantCards = ref<ProposedLieutenant[]>([])
const eliminatedCards = ref<ProposedLieutenant[]>([])
const totalGenerated = ref(0)
const hnStructure = ref<ProposeLieutenantsHnNode[]>([])
const contentGapInsights = ref('')

// --- Selection State (Phase 3) ---
const selectedCards = ref<Map<string, ProposedLieutenant>>(new Map())

function toggleLieutenant(card: ProposedLieutenant) {
  if (isLocked.value) return
  const next = new Map(selectedCards.value)
  if (next.has(card.keyword)) {
    next.delete(card.keyword)
  } else {
    next.set(card.keyword, card)
  }
  selectedCards.value = next
  emit('lieutenants-updated', Array.from(next.keys()))
}

// --- HN Structure save ---
const hnSaved = ref(false)
const isSavingHn = ref(false)

async function saveHnStructure() {
  const id = props.selectedArticle?.id
  const title = props.selectedArticle?.title
  if (!id || !title || !articleKeywordsStore.keywords || hnStructure.value.length === 0) return

  isSavingHn.value = true
  // Save outline directly to articles/{id}.json (single source of truth)
  const outline = hnToOutline(hnStructure.value, title)
  await apiPut(`/articles/${id}`, { outline })
  // Also keep hnStructure in keywords for backward compat
  articleKeywordsStore.keywords.hnStructure = hnStructure.value
  await articleKeywordsStore.saveDecisions(id)
  hnSaved.value = true
  isSavingHn.value = false
  setTimeout(() => { hnSaved.value = false }, 2000)
  log.info('[LieutenantsSelection] Outline saved from HN structure', { sections: outline.sections.length })
}

// --- Lock/unlock Lieutenants ---
const isLocked = ref(props.initialLocked)

// --- Debug log: state on mount ---
watch(
  () => articleKeywordsStore.keywords,
  (kw) => {
    log.debug('[LieutenantsSelection] store keywords snapshot', {
      articleId: props.selectedArticle?.id,
      richLieutenants: kw?.richLieutenants?.map(lt => ({
        keyword: lt.keyword,
        status: lt.status,
      })) ?? [],
      flatLieutenants: kw?.lieutenants ?? [],
      hnStructure: kw?.hnStructure ? `${(kw.hnStructure as unknown[]).length} nodes` : 'none',
      isCaptainLocked: props.isCaptaineLocked,
      captainKeyword: props.captainKeyword,
    })
  },
  { immediate: true },
)

async function lockLieutenants() {
  if (selectedCards.value.size === 0) return
  const id = props.selectedArticle?.id
  const title = props.selectedArticle?.title
  if (!id || !title || !articleKeywordsStore.keywords) return

  // Persist rich lieutenant data with status 'locked' / 'eliminated'
  const selected = Array.from(selectedCards.value.values())
  articleKeywordsStore.setRichLieutenants(selected, eliminatedCards.value)
  articleKeywordsStore.keywords.hnStructure = hnStructure.value
  await articleKeywordsStore.saveDecisions(id)
  // Save outline directly to articles/{id}.json (single source of truth)
  if (hnStructure.value.length > 0) {
    const outline = hnToOutline(hnStructure.value, title)
    await apiPut(`/articles/${id}`, { outline })
  }
  isLocked.value = true
  emit('check-completed', MOTEUR_LIEUTENANTS_LOCKED)
  emit('lieutenants-updated', Array.from(selectedCards.value.keys()))

  // targetWordCount recommendation : la structure HN est maintenant validée
  // + le SERP a été analysé → contexte max pour un conseil IA pertinent.
  // Non-bloquant : en cas d'échec, on n'empêche pas le lock.
  void recommendAndPropagateWordCount(id)
}

/**
 * Appelle l'endpoint de recommandation targetWordCount et, si l'utilisateur n'a
 * pas encore défini sa valeur manuellement, écrit la reco dans article_micro_contexts.
 * Un toast info est poussé dans l'activity log avec la valeur conseillée.
 */
async function recommendAndPropagateWordCount(articleId: number): Promise<void> {
  try {
    const reco = await apiPost<{ recommended: number; breakdown: { competitorsAvg: number | null; aiSuggestion: number | null; reasoning: string } }>(
      `/articles/${articleId}/recommend-word-count`,
      {},
    )
    if (!reco?.recommended) return

    // Lit le micro-context actuel pour ne pas écraser une valeur manuelle
    const existing = await apiGet<{ targetWordCount?: number; angle?: string; tone?: string; directives?: string } | null>(
      `/articles/${articleId}/micro-context`,
    ).catch(() => null)

    const alreadyHasCustomValue = existing?.targetWordCount != null
    if (!alreadyHasCustomValue) {
      // On écrit la reco dans le brief. Le PUT exige un `angle` → on met un placeholder
      // qui sera remplaçable par l'utilisateur.
      await apiPut(`/articles/${articleId}/micro-context`, {
        angle: existing?.angle ?? 'Angle à préciser (suggéré lors du lock Lieutenants)',
        tone: existing?.tone ?? '',
        directives: existing?.directives ?? '',
        targetWordCount: reco.recommended,
      })
    }

    const detail = reco.breakdown.reasoning
    activityLog.addMessage(
      'info',
      `💡 Longueur conseillée : ${reco.recommended.toLocaleString('fr-FR')} mots`,
      alreadyHasCustomValue
        ? `${detail} · Valeur manuelle conservée (${existing?.targetWordCount} mots).`
        : `${detail} · Modifiable dans la Rédaction.`,
    )
  } catch (err) {
    log.warn(`[LieutenantsSelection] recommend-word-count failed: ${(err as Error).message}`)
  }
}

function unlockLieutenants() {
  isLocked.value = false
  emit('check-removed', MOTEUR_LIEUTENANTS_LOCKED)
}

// --- Analysis step tracking ---
type AnalysisStep = 'idle' | 'serp' | 'ia-proposal' | 'filtering' | 'done'
const currentStep = ref<AnalysisStep>('idle')

// --- Auto-set active tabs when SERP results arrive ---
watch(serpResultsByKeyword, (map) => {
  if (map.size > 0 && !map.has(activeSerpTab.value)) {
    activeSerpTab.value = map.keys().next().value!
    activeHnTab.value = '__all__'
  }
})

// --- Reset when article changes ---
watch(
  () => props.selectedArticle?.id,
  () => {
    serpResult.value = null
    serpResultsByKeyword.value = new Map()
    error.value = null
    sliderValue.value = 10
    serpDoneCount.value = 0
    serpTotalCount.value = 0
    activeSerpTab.value = ''
    activeHnTab.value = '__all__'
    currentStep.value = 'idle'
    selectedCards.value = new Map()
    lieutenantCards.value = []
    eliminatedCards.value = []
    totalGenerated.value = 0
    hnStructure.value = []
    contentGapInsights.value = ''

    isLocked.value = props.initialLocked
    iaAbort()

    // Restore saved data if article was previously locked
    if (props.initialLocked) {
      if (articleKeywordsStore.keywords?.hnStructure && articleKeywordsStore.keywords.hnStructure.length > 0) {
        hnStructure.value = articleKeywordsStore.keywords.hnStructure
      }
      restoreLockedLieutenants()
    }
  },
)

// --- Restore hnStructure when keywords arrive (async fetch) ---
watch(
  () => articleKeywordsStore.keywords?.hnStructure,
  (hn) => {
    if (isLocked.value && hn && hn.length > 0 && hnStructure.value.length === 0) {
      hnStructure.value = hn
      log.info('[LieutenantsSelection] HN structure restored from store', { nodes: hn.length })
    }
  },
)

// --- Restore lieutenant cards when keywords arrive (async fetch) ---
watch(
  () => articleKeywordsStore.keywords?.lieutenants,
  (lts) => {
    if (isLocked.value && lts && lts.length > 0 && lieutenantCards.value.length === 0) {
      restoreLockedLieutenants()
    }
  },
)

// 2026-05-02 — Sync `lieutenantCards` quand `richLieutenants` change (TabLoadPrompt
// déclenche `mergeRichLieutenants` qui réassigne le tableau côté store).
// Le merge ajoute de nouveaux items que la liste UI doit refléter pour que le
// tri puisse les voir. Watcher en `deep: true` pour capter aussi les push
// éventuels en place.
watch(
  () => articleKeywordsStore.keywords?.richLieutenants,
  (richLts) => {
    if (!richLts || richLts.length === 0) return
    // Recalcule la liste courante depuis le store. Idempotent : si rien n'a
    // changé visuellement, le rendu Vue ne re-render pas.
    const locked = richLts.filter(lt => lt.status === 'locked')
    const suggested = richLts.filter(lt => lt.status === 'suggested')
    const eliminated = richLts.filter(lt => lt.status === 'eliminated')
    const nextActive = [...locked, ...suggested].map(lt => ({
      keyword: lt.keyword,
      reasoning: lt.reasoning,
      sources: lt.sources,
      suggestedHnLevel: lt.suggestedHnLevel,
      score: lt.score,
    }))
    // N'écrase que si la liste mémoire est plus petite (merge ajoute, ne retire jamais).
    if (nextActive.length > lieutenantCards.value.length) {
      lieutenantCards.value = nextActive
      eliminatedCards.value = eliminated.map(lt => ({
        keyword: lt.keyword,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
      }))
    }
  },
  { deep: true },
)

// Bloc 6 — Auto-trigger SERP supprimé. Le SERP était relancé silencieusement
// à chaque changement de captainKeyword, ce qui (a) gâchait des crédits API
// en dehors du contrôle utilisateur et (b) provoquait une pollution
// cross-keyword si le user changeait de Capitaine pendant qu'un SERP en vol
// finissait. L'utilisateur déclenche désormais le SERP manuellement via le
// bouton "Analyser SERP" du sous-composant (@analyze="analyzeSERP" plus bas).
// Les Lieutenants déjà verrouillés survivent à tout changement de Capitaine
// (cf. mergeRichLieutenants dans article-keywords.store.ts:156-181).

// --- Auto-trigger IA proposal after SERP success (skip if lieutenants already locked) ---
// U5 — règle TTL 7 jours : ne pas relancer l'IA si des propositions fraîches existent déjà en DB
watch(serpResult, (result) => {
  if (!result || iaIsStreaming.value || lieutenantCards.value.length !== 0 || isLocked.value) return
  const richLts = articleKeywordsStore.keywords?.richLieutenants ?? []
  const hasFreshProposals = richLts.length > 0 && richLts.every(lt => !shouldRegenerate(lt.exploredAt))
  if (hasFreshProposals) {
    log.info('[LieutenantsSelection] Skip IA proposal — DB has fresh proposals', { count: richLts.length })
    restoreLockedLieutenants()
    return
  }
  log.info('[LieutenantsSelection] Auto-triggering IA proposal after SERP')
  proposeLieutenants()
})

function refreshSERP() {
  // Reset SERP state via composable + IA state au parent (toujours ici car
  // useLieutenantsIa pas encore extrait — sera Bloc J.B).
  serpResult.value = null
  error.value = null
  currentStep.value = 'idle'
  selectedCards.value = new Map()
  lieutenantCards.value = []
  eliminatedCards.value = []
  totalGenerated.value = 0
  hnStructure.value = []
  contentGapInsights.value = ''
  emit('lieutenants-updated', [])
  void analyzeSERPWithStep()
}

// (analyzeSERP + mergeSerpResults moved to useLieutenantsSerp composable above)
//
// Wrapper local : positionne `currentStep='serp'` puis délègue au composable.
// L'émission `serp-loaded` reste au parent car elle dépend du contrat avec
// MoteurView (event).
async function analyzeSERPWithStep(): Promise<void> {
  currentStep.value = 'serp'
  await analyzeSERP()
  if (serpResult.value) {
    emit('serp-loaded', serpResult.value)
  } else if (error.value) {
    currentStep.value = 'idle'
  }
}

// --- IA Proposal flow ---
/** Restore lieutenant cards from saved data when in locked state */
function restoreLockedLieutenants() {
  if (lieutenantCards.value.length > 0) return // already restored

  // Prefer rich data if available
  const richLts = articleKeywordsStore.keywords?.richLieutenants
  if (richLts && richLts.length > 0) {
    const locked = richLts.filter(lt => lt.status === 'locked')
    const suggested = richLts.filter(lt => lt.status === 'suggested')
    const eliminated = richLts.filter(lt => lt.status === 'eliminated')
    // Affichage = locked + suggested (propositions IA persistées non encore verrouillées)
    lieutenantCards.value = [...locked, ...suggested].map(lt => ({
      keyword: lt.keyword,
      reasoning: lt.reasoning,
      sources: lt.sources,
      suggestedHnLevel: lt.suggestedHnLevel,
      score: lt.score,
    }))
    eliminatedCards.value = eliminated.map(lt => ({
      keyword: lt.keyword,
      reasoning: lt.reasoning,
      sources: lt.sources,
      suggestedHnLevel: lt.suggestedHnLevel,
      score: lt.score,
    }))
    // Pré-cocher uniquement les 'locked' (les 'suggested' restent non sélectionnées)
    const selected = new Map<string, ProposedLieutenant>()
    for (const lt of locked) {
      selected.set(lt.keyword, {
        keyword: lt.keyword,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
      })
    }
    selectedCards.value = selected
    emit('lieutenants-updated', Array.from(selected.keys()))
    log.info('[LieutenantsSelection] Lieutenants restored from rich data', {
      locked: locked.length, suggested: suggested.length, eliminated: eliminated.length,
    })
    return
  }

  // Fallback: flat lieutenants[] (backward compat)
  const lieutenants = articleKeywordsStore.keywords?.lieutenants
  if (!lieutenants || lieutenants.length === 0) return

  const cards: ProposedLieutenant[] = lieutenants.map(kw => ({
    keyword: kw,
    reasoning: '',
    sources: [],
    suggestedHnLevel: 2 as const,
    score: 0,
  }))
  lieutenantCards.value = cards
  const selected = new Map<string, ProposedLieutenant>()
  for (const card of cards) {
    selected.set(card.keyword, card)
  }
  selectedCards.value = selected
  emit('lieutenants-updated', Array.from(selected.keys()))
  log.info('[LieutenantsSelection] Lieutenants restored from flat data', { count: lieutenants.length })
}

/** F3 — Ajoute un mot-clé (suggéré par le basket) à la liste des propositions lieutenants
 *  sans lancer de SERP/IA. L'utilisateur pourra ensuite le cocher ou le laisser pour plus tard. */
function handleAssistAdd(keyword: string) {
  if (lieutenantCards.value.some(c => c.keyword.toLowerCase() === keyword.toLowerCase())) return
  lieutenantCards.value = [
    ...lieutenantCards.value,
    {
      keyword,
      reasoning: 'Proposé depuis votre panier',
      sources: [],
      suggestedHnLevel: 2 as const,
      score: 0,
    },
  ]
  log.info('[LieutenantsSelection] Assist add', { keyword, total: lieutenantCards.value.length })
}

function proposeLieutenants() {
  if (!props.captainKeyword || !serpResult.value || !props.selectedArticle) return
  iaAbort()
  lieutenantCards.value = []
  eliminatedCards.value = []
  totalGenerated.value = 0
  selectedCards.value = new Map()
  currentStep.value = 'ia-proposal'

  // Captain-only SERP data (high weight)
  const captainResult = serpResultsByKeyword.value.get(props.captainKeyword)
  const captainHn = captainResult
    ? computeHnRecurrenceFrom(captainResult.competitors)
        .filter(h => h.percent >= 10)
        .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))
    : hnRecurrence.value
        .filter(h => h.percent >= 10)
        .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))

  const captainCompetitors = captainResult
    ? captainResult.competitors.filter(c => !c.fetchError).map(c => ({ domain: c.domain, title: c.title, position: c.position }))
    : serpResult.value.competitors.filter(c => !c.fetchError).map(c => ({ domain: c.domain, title: c.title, position: c.position }))

  const captainPaa = captainResult
    ? captainResult.paaQuestions.map(q => ({ question: q.question, answer: q.answer }))
    : serpResult.value.paaQuestions.map(q => ({ question: q.question, answer: q.answer }))

  // Root keywords SERP data (lower weight — different search intent)
  const rootKeywordsSerpData: Array<{
    keyword: string
    competitors: { domain: string; title: string; position: number }[]
    hnRecurrence: { level: number; text: string; count: number; percent: number }[]
    paaQuestions: { question: string; answer?: string }[]
  }> = []

  for (const [kw, result] of serpResultsByKeyword.value) {
    if (kw === props.captainKeyword) continue
    rootKeywordsSerpData.push({
      keyword: kw,
      competitors: result.competitors.filter(c => !c.fetchError).map(c => ({ domain: c.domain, title: c.title, position: c.position })),
      hnRecurrence: computeHnRecurrenceFrom(result.competitors)
        .filter(h => h.percent >= 10)
        .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent })),
      paaQuestions: result.paaQuestions.map(q => ({ question: q.question, answer: q.answer ?? undefined })),
    })
  }

  iaStartStream(
    `/api/keywords/${encodeURIComponent(props.captainKeyword)}/propose-lieutenants`,
    {
      level: props.articleLevel ?? 'intermediaire',
      articleId: props.selectedArticle?.id ?? 0,
      serpHeadings: captainHn,
      paaQuestions: captainPaa,
      wordGroups: props.wordGroups.map(g => g.word),
      rootKeywords: resolvedRootKeywords.value,
      serpCompetitors: captainCompetitors,
      rootKeywordsSerpData,
      ...(props.cocoonSlug ? { cocoonSlug: props.cocoonSlug } : {}),
    },
    {
      onDone: (data) => {
        log.info(`[LieutenantsSelection] IA generated ${data.totalGenerated} lieutenants, selected ${data.selectedLieutenants.length}, eliminated ${data.eliminatedLieutenants.length}`)
        totalGenerated.value = data.totalGenerated
        hnStructure.value = data.hnStructure ?? []
        contentGapInsights.value = data.contentGapInsights ?? ''

        // Step 3: Assign cards directly from AI data (no batch KPI)
        currentStep.value = 'filtering'
        lieutenantCards.value = data.selectedLieutenants
        eliminatedCards.value = data.eliminatedLieutenants

        // Pre-select all filtered-in lieutenants
        const preSelected = new Map<string, ProposedLieutenant>()
        for (const lt of data.selectedLieutenants) {
          preSelected.set(lt.keyword, lt)
        }
        selectedCards.value = preSelected
        emit('lieutenants-updated', Array.from(preSelected.keys()))
        currentStep.value = 'done'
        log.info(`[LieutenantsSelection] Selection complete: ${preSelected.size} pre-selected`)

        // Auto-save lieutenant explorations directly to lieutenant_explorations table.
        // Respecte la règle métier : tout keyword approfondi DOIT être persisté.
        const articleId = props.selectedArticle?.id
        if (articleId && isResponseForCurrentArticle(articleKeywordsStore.keywords?.articleId, articleId)) {
          articleKeywordsStore.saveRichLieutenantProposals(data.selectedLieutenants, data.eliminatedLieutenants)
          // Build RichLieutenant entries for direct DB save
          const allEntries = [
            ...data.selectedLieutenants.map(lt => ({
              keyword: lt.keyword,
              status: 'suggested' as const,
              reasoning: lt.reasoning,
              sources: lt.sources,
              suggestedHnLevel: lt.suggestedHnLevel,
              score: lt.score,
              kpis: null,
              lockedAt: null,
            })),
            ...data.eliminatedLieutenants.map(lt => ({
              keyword: lt.keyword,
              status: 'eliminated' as const,
              reasoning: lt.reasoning,
              sources: lt.sources,
              suggestedHnLevel: lt.suggestedHnLevel,
              score: lt.score,
              kpis: null,
              lockedAt: null,
            })),
          ]
          articleKeywordsStore.saveLieutenantExplorationEntries(articleId, allEntries, props.captainKeyword!)
        }
      },
    },
  )
}

</script>

<template>
  <div class="lieutenants-selection">
    <!-- Sprint 1 (2026-05-04) — `lieutenants-header` legacy supprimé.
         Le rappel Capitaine était redondant avec MoteurContextRecap.
         Le badge "level article" migre dans le header de LieutenantProposals
         (= container principal n°1) pour rester visible. -->

    <!-- F5 — Soft gate uniquement au premier passage (avant toute analyse IA) -->
    <div v-if="!isCaptaineLocked && !hasEverAnalyzed" class="soft-gate-message">
      <p>Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP.</p>
    </div>

    <!-- F3 — Suggestions depuis le basket, ajoutées comme lieutenants candidats -->
    <KeywordAssistPanel
      context="lieutenants"
      :exclude-keywords="lieutenantCards.map(c => c.keyword)"
      @add="handleAssistAdd"
    />

    <!-- SERP Analysis: controls, progress, results summary, per-keyword tabs -->
    <LieutenantSerpAnalysis
      :serp-results-by-keyword="serpResultsByKeyword"
      :active-serp-tab="activeSerpTab"
      :active-serp-tab-result="activeSerpTabResult"
      :displayed-competitors="displayedCompetitors"
      :serp-result="serpResult"
      :slider-value="sliderValue"
      :is-loading="isLoading"
      :can-analyze="canAnalyze"
      :is-locked="isLocked"
      :ia-is-streaming="iaIsStreaming"
      :serp-done-count="serpDoneCount"
      :serp-total-count="serpTotalCount"
      :serp-pending-keywords="serpPendingKeywords"
      :serp-current-keyword="serpCurrentKeyword"
      :ia-chunks="iaChunks"
      :current-step="currentStep"
      @analyze="analyzeSERPWithStep"
      @refresh="refreshSERP"
      @update:slider-value="sliderValue = $event"
      @update:active-serp-tab="activeSerpTab = $event"
    />

    <!-- Error -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- Sprint 1 (2026-05-04) — condition élargie : on monte aussi la section
         si l'utilisateur a déjà ajouté des cards depuis le basket
         (`lieutenantCards.length > 0`). Avant, la section n'apparaissait que
         si SERP ou lock — bloquant l'observation des cards "assist-add". -->
    <div v-if="serpResult || isLocked || lieutenantCards.length > 0" class="serp-results">

      <!-- ⚠️ ARCHITECTURE — Sprint 1 (2026-05-04)
           Restauration de l'architecture pré-Sprint C-1 : les containers
           PRINCIPAUX (LieutenantProposals + LieutenantH2Structure) vivent ici
           au premier niveau, PAS dans LieutenantsAiPanel.

           Pourquoi : Sprint C-1 (2026-05-02, commit 890b285) avait wrappé
           ces deux composants dans la coque "Suggestions IA Lieutenants".
           Conséquence UX : l'utilisateur voyait ses propres données (cards
           Lieutenants verrouillés, structure Hn validée) sous l'étiquette
           "Suggestions IA", ce qui brouillait totalement la frontière entre
           "données utilisateur" et "suggestions IA".

           Test verrou anti-régression :
             tests/unit/components/lieutenants-selection-architecture.test.ts
           NE JAMAIS re-wrapper ces composants dans LieutenantsAiPanel. -->

      <!-- Container principal #1 : Propositions Lieutenants (cards + éliminés) -->
      <LieutenantProposals
        :ia-is-streaming="iaIsStreaming"
        :ia-chunks="iaChunks"
        :ia-error="iaError"
        :lieutenant-cards="lieutenantCards"
        :eliminated-cards="eliminatedCards"
        :total-generated="totalGenerated"
        :selected-cards="selectedCards"
        :is-locked="isLocked"
        :content-gap-insights="contentGapInsights"
        :article-level="articleLevel"
        @toggle="toggleLieutenant"
        @retry="proposeLieutenants"
      />

      <!-- Container principal #2 : Structure Hn (IA + concurrents intégrés) -->
      <LieutenantH2Structure
        :hn-structure="hnStructure"
        :active-hn-recurrence="activeHnRecurrence"
        :hn-recurrence="hnRecurrence"
        :serp-results-by-keyword="serpResultsByKeyword"
        :active-hn-tab="activeHnTab"
        :is-locked="isLocked"
        :hn-saved="hnSaved"
        :is-saving-hn="isSavingHn"
        @save-hn="saveHnStructure"
        @update:active-hn-tab="activeHnTab = $event"
      />

      <!-- Sprint 4.6 — PAA section relabeled: clarifies that these are the raw
           Google questions the AI *consulted* to build its proposal, not extra
           content to use directly. -->
      <CollapsableSection v-if="serpResult" title="Sources IA : questions Google (PAA)" :default-open="false">
        <p class="section-hint">Questions "People Also Ask" scrapees depuis Google pour tes mots-cles. Elles ont deja ete prises en compte par l'IA pour proposer les lieutenants ci-dessus — affichees ici pour transparence.</p>
        <ul v-if="serpResult.paaQuestions.length > 0" class="paa-list">
          <li v-for="paa in serpResult.paaQuestions" :key="paa.question" class="paa-item">
            <div class="paa-question">{{ paa.question }}</div>
            <div v-if="paa.answer" class="paa-answer">{{ paa.answer }}</div>
          </li>
        </ul>
        <p v-else class="section-empty">Google n'a renvoye aucune question PAA pour ces mots-cles — c'est normal sur des requetes techniques ou de niche.</p>
      </CollapsableSection>

      <!-- Word groups -->
      <CollapsableSection v-if="serpResult" title="Sources IA : clusters Discovery" :default-open="false">
        <p class="section-hint">Regroupements thematiques (par racine commune) calcules a partir des mots-cles trouves dans l'onglet Discovery. Utilises par l'IA pour reperer les sous-themes a traiter.</p>
        <ul v-if="wordGroups.length > 0" class="group-list">
          <li v-for="g in wordGroups" :key="g.normalized" class="group-item">
            <span class="group-word">{{ g.word }}</span>
            <span class="group-count">{{ g.count }} termes</span>
          </li>
        </ul>
        <p v-else class="section-empty">Aucun cluster disponible. Lance un scan Discovery pour ce cocon, puis reviens ici.</p>
      </CollapsableSection>

      <!-- Lock/unlock Lieutenants -->
      <div class="lieutenant-lock" data-testid="lieutenant-lock">
        <button
          v-if="!isLocked"
          class="lock-btn"
          data-testid="lock-btn"
          :disabled="selectedCards.size === 0"
          @click="lockLieutenants"
        >
          Valider les Lieutenants
        </button>
        <div v-else class="locked-state" data-testid="locked-state">
          <span class="locked-badge">Lieutenants verrouilles</span>
          <button class="unlock-btn" data-testid="unlock-btn" @click="unlockLieutenants">Deverrouiller</button>
        </div>
      </div>

      <!-- Section IA pure — coque purple commune avec les autres onglets.
           NE contient PAS de cards Lieutenants ni de structure Hn (sinon
           régression Sprint C-1). Cf. test verrou architecture. -->
      <LieutenantsAiPanel
        :ia-is-streaming="iaIsStreaming"
        :ia-chunks="iaChunks"
        :ia-error="iaError"
        :is-locked="isLocked"
        :content-gap-insights="contentGapInsights"
        :total-generated="totalGenerated"
        @retry="proposeLieutenants"
      />
    </div>
  </div>
</template>

<style scoped>
.lieutenants-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.serp-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Sprint 1 (2026-05-04) — styles legacy `.lieutenants-header`, `.captain-badge`,
   `.captain-icon`, `.level-badge` supprimés. Le bloc DOM correspondant a été
   supprimé du template. Le badge level migré dans LieutenantProposals.vue. */

/* --- Soft gate --- */
.soft-gate-message {
  padding: 0.75rem 1rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 8px;
}

.soft-gate-message p { margin: 0; font-size: 0.8125rem; color: var(--color-text); }

/* --- Error --- */
.error-message {
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 8px;
}

.error-message p { margin: 0; font-size: 0.8125rem; color: var(--color-error, #ef4444); }

/* --- PAA --- */
.paa-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.paa-item {
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.paa-question { font-size: 0.8125rem; font-weight: 600; color: var(--color-heading); }
.paa-answer { margin-top: 0.25rem; font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.4; }

/* --- Groups --- */
.group-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.group-word { font-weight: 600; }
.group-count { font-size: 0.6875rem; color: var(--color-text-muted); }

/* --- Lock/unlock --- */
.lieutenant-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
}

.lock-btn {
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-success, #22c55e);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.lock-btn:hover:not(:disabled) { background: #16a34a; }
.lock-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.locked-state { display: flex; align-items: center; gap: 1rem; }

.locked-badge {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-success, #22c55e);
  border-radius: 6px;
}

.unlock-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.unlock-btn:hover { border-color: var(--color-error, #ef4444); color: var(--color-error, #ef4444); }

/* --- Empty section --- */
.section-empty { margin: 0; padding: 0.5rem 0; font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; }
.section-hint { margin: 0 0 0.5rem; padding: 0.375rem 0.625rem; font-size: 0.75rem; color: var(--color-text-muted); background: var(--color-bg-secondary, #f8fafc); border-left: 2px solid var(--color-border, #e2e8f0); border-radius: 3px; }
</style>
