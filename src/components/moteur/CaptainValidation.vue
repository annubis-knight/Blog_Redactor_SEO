<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onBeforeUnmount } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { marked } from 'marked'
import { useCapitaineValidation, articleTypeToLevel } from '@/composables/keyword/useCapitaineValidation'
import { useCompositionCheck } from '@/composables/seo/useCompositionCheck'
import { useExploredKeywords } from '@/composables/keyword/useExploredKeywords'
import type { ExploredKeywordEntry } from '@/composables/keyword/useExploredKeywords'
import { useSortableList, type SortOption } from '@/composables/moteur/useSortableList'
import { useStreaming } from '@/composables/editor/useStreaming'
import { apiStream } from '@/services/api.service'
import { VERDICT_COLORS } from '@/composables/ui/useVerdictColors'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useNotify } from '@/composables/ui/useNotify'
import { log } from '@/utils/logger'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import RadarKeywordCard from '@/components/intent/RadarKeywordCard.vue'
import CaptainInput from '@/components/moteur/CaptainInput.vue'
import CaptainRootsSidebar from '@/components/moteur/CaptainRootsSidebar.vue'
import AiPanel from '@/components/moteur/ai-panel/AiPanel.vue'
import AiAdviceMarkdown from '@/components/moteur/ai-panel/AiAdviceMarkdown.vue'
import { VERDICT_CONFIG } from '@/composables/ui/useVerdictColors'
import type { AiPanelState } from '@/composables/moteur/useAiPanel'
import CaptainLockPanel from '@/components/moteur/CaptainLockPanel.vue'
import UnlockLieutenantsModal from '@/components/moteur/UnlockLieutenantsModal.vue'
import CaptainSidePanel from '@/components/moteur/CaptainSidePanel.vue'
import CaptainRadarList from '@/components/moteur/captain/CaptainRadarList.vue'
import type { SelectedArticle, KpiResult, VerdictLevel, ValidateVerdict, ValidateResponse, ArticleLevel } from '@shared/types/index.js'
import type { RadarCard } from '@shared/types/intent.types.js'

// Configure marked
marked.setOptions({ breaks: true, gfm: true })

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  mode?: 'workflow' | 'libre'
  initialLocked?: boolean
  suggestedKeywords?: string[]
  radarCards?: RadarCard[]
}>(), {
  mode: 'workflow',
  initialLocked: false,
  suggestedKeywords: () => [],
  radarCards: () => [],
})

const emit = defineEmits<{
  (e: 'validated', keyword: string): void
  (e: 'check-completed', checkName: string): void
  (e: 'check-removed', checkName: string): void
  (e: 'send-to-lieutenants', payload: { keyword: string; rootKeywords: string[] }): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()
const notify = useNotify()

// Debounced save: coalesces rafales de mutations (validate, root variants, AI panel)
// en un seul PUT. Évite les races read-modify-write et le spam EPERM Windows.
// 300 ms = rapide pour l'utilisateur, assez long pour absorber une rafale typique.
let saveRequested = false

function persistIfOwned() {
  const id = props.selectedArticle?.id
  if (id && articleKeywordsStore.keywords?.articleId === id) {
    articleKeywordsStore.saveKeywords(id)
  }
}

const debouncedSave = useDebounceFn(() => {
  saveRequested = false
  persistIfOwned()
}, 300)

function requestSave() {
  saveRequested = true
  debouncedSave()
}

// Flush pending save on unmount to avoid dropping last mutation
onBeforeUnmount(() => {
  if (saveRequested) {
    saveRequested = false
    persistIfOwned()
  }
})

const {
  currentResult, isLoading, error,
  history, historyIndex, rootResult, isLoadingRoot,
  radarCard, isLoadingRadar,
  validateKeyword, navigateHistory, reset,
} = useCapitaineValidation()

const articleLevel = computed<ArticleLevel>(() => {
  if (props.mode === 'libre' || !props.selectedArticle) return 'intermediaire'
  return articleTypeToLevel(props.selectedArticle.type)
})

const activeKeyword = computed(() => props.selectedArticle?.keyword ?? '')

// --- Keyword input ---
const keywordInput = ref('')
const { warnings: compositionWarnings, allPass: compositionAllPass } = useCompositionCheck(keywordInput, articleLevel)

// --- Lock/unlock Capitaine ---
const isLocked = ref(props.initialLocked)

// --- Debug log: state on mount ---
watch(
  () => articleKeywordsStore.keywords,
  (kw) => {
    log.debug('[CaptainValidation] store keywords snapshot', {
      articleId: props.selectedArticle?.id,
      richCaptain: kw?.richCaptain ? {
        keyword: kw.richCaptain.keyword,
        status: kw.richCaptain.status,
        historyCount: kw.richCaptain.validationHistory.length,
        historyKeywords: kw.richCaptain.validationHistory.map(h => h.keyword),
        lockedAt: kw.richCaptain.lockedAt,
      } : null,
      flatCapitaine: kw?.capitaine,
      richRootCount: kw?.richRootKeywords?.length ?? 0,
    })
  },
  { immediate: true },
)

function handleValidate() {
  const kw = keywordInput.value.trim()
  if (!kw) return
  log.info('CaptainValidation — validation', { keyword: kw, level: articleLevel.value })
  carousel.addEntry(kw, articleLevel.value, props.selectedArticle?.title, props.selectedArticle?.id, props.selectedArticle?.painPoint ?? undefined)
}

watch(
  () => activeKeyword.value,
  (kw) => {
    isLocked.value = props.initialLocked
    if (kw) {
      keywordInput.value = kw
      log.debug('CaptainValidation — input pré-rempli', { keyword: kw })
    } else {
      keywordInput.value = ''
      reset()
    }
  },
  { immediate: true },
)

watch(
  () => articleKeywordsStore.keywords?.capitaine,
  (persisted) => {
    if (!persisted) return
    keywordInput.value = persisted
    log.debug('CaptainValidation — restauré depuis store', { keyword: persisted })
    if (isLocked.value) {
      const currentKw = carousel.currentEntry.value?.card.keyword
      if (currentKw !== persisted) {
        carousel.addEntry(persisted, articleLevel.value, props.selectedArticle?.title, props.selectedArticle?.id, props.selectedArticle?.painPoint ?? undefined)
      }
      lockedKeyword.value = persisted
    }
  },
  { immediate: true },
)

// Sprint 16 hotfix — keep `isLocked` in sync with DB state. Without this, a
// captain persisted with `status === 'locked'` in `captain_explorations` never
// surfaced its locked state in the UI (the user saw the card but no lock badge).
watch(
  () => articleKeywordsStore.keywords?.richCaptain?.status,
  (status) => {
    const storeArticleId = articleKeywordsStore.keywords?.articleId
    const selectedId = props.selectedArticle?.id
    if (storeArticleId !== selectedId) return
    const shouldLock = status === 'locked'
    if (shouldLock !== isLocked.value) {
      isLocked.value = shouldLock
      if (shouldLock) {
        lockedKeyword.value = articleKeywordsStore.keywords?.richCaptain?.keyword ?? null
      }
      log.debug('CaptainValidation — isLocked synced from store', { status, isLocked: shouldLock, lockedKeyword: lockedKeyword.value })
    }
  },
  { immediate: true },
)

// --- Verdict display ---
function getVerdictLabel(verdict: ValidateVerdict): string {
  if (verdict.autoNoGo) return 'Aucun signal détecté — ce mot-clé n\'existe pas dans les données.'
  if (verdict.level === 'GO') return 'Signaux positifs — mot-clé viable.'
  if (verdict.level === 'ORANGE') return 'Signaux mixtes — à étudier.'
  return 'KPIs insuffisants pour valider ce mot-clé.'
}

const effectiveVerdict = computed(() => {
  if (!currentResult.value) return null
  return currentResult.value.verdict.level
})

const verdictLabel = computed(() => {
  if (!currentResult.value) return ''
  return getVerdictLabel(currentResult.value.verdict)
})

function noGoFeedback(verdict: ValidateVerdict, kpis: KpiResult[]): string {
  if (verdict.autoNoGo) return 'Aucun signal détecté — ce mot-clé n\'existe pas dans les données.'
  const volume = kpis.find(k => k.name === 'volume')
  const kd = kpis.find(k => k.name === 'kd')
  const paa = kpis.find(k => k.name === 'paa')
  if (volume?.color === 'red' && kd?.color === 'red') return 'KPIs faibles — volume et difficulté défavorables.'
  if (paa?.color === 'red' && volume?.color === 'red') return 'Hors sujet — pas de PAA ni de volume suffisant.'
  return 'KPIs insuffisants pour valider ce mot-clé.'
}

// --- Thresholds reference table ---
const THRESHOLDS_TABLE = {
  volume: { pilier: { green: 1000, orange: 200 }, intermediaire: { green: 200, orange: 50 }, specifique: { green: 30, orange: 5 } },
  kd: { pilier: { green: 40, orange: 65 }, intermediaire: { green: 30, orange: 50 }, specifique: { green: 20, orange: 40 } },
  cpc: { pilier: { bonus: 2 }, intermediaire: { bonus: 2 }, specifique: { bonus: 2 } },
  paa: { pilier: { green: 3.0, orange: 1.0 }, intermediaire: { green: 2.0, orange: 0.5 }, specifique: { green: 1.0, orange: 0.25 } },
  autocomplete: { pilier: { green: 3, orange: 6 }, intermediaire: { green: 4, orange: 7 }, specifique: { green: 5, orange: 8 } },
}

type ThresholdRow = { label: string; key: string }
const thresholdRows: ThresholdRow[] = [
  { label: 'Volume', key: 'volume' },
  { label: 'Difficulté (KD)', key: 'kd' },
  { label: 'CPC', key: 'cpc' },
  { label: 'PAA', key: 'paa' },
  { label: 'Autocomplete', key: 'autocomplete' },
]

function thresholdCell(key: string, level: string): string {
  const t = THRESHOLDS_TABLE[key as keyof typeof THRESHOLDS_TABLE]?.[level as keyof (typeof THRESHOLDS_TABLE)['volume']]
  if (!t) return '-'
  if ('bonus' in t) return `> ${(t as { bonus: number }).bonus}\u20ac`
  const typed = t as { green: number; orange: number }
  if (key === 'kd' || key === 'autocomplete') return `\u2264 ${typed.green} / \u2264 ${typed.orange}`
  return `\u2265 ${typed.green} / \u2265 ${typed.orange}`
}

// --- AI Panel (manual mode streaming) ---
const { chunks: aiChunks, isStreaming: aiIsStreaming, error: aiError, startStream: aiStartStream, abort: aiAbort } = useStreaming()

const parsedMarkdown = computed(() => {
  if (!aiChunks.value) return ''
  return marked.parse(aiChunks.value) as string
})

watch(
  () => currentResult.value,
  (res) => {
    if (!res) return
    log.debug('CaptainValidation — lancement panel IA', { keyword: res.keyword, verdict: res.verdict.level })
    aiAbort()
    aiStartStream(
      `/api/keywords/${encodeURIComponent(res.keyword)}/ai-panel`,
      {
        level: res.articleLevel,
        articleId: props.selectedArticle?.id,
        marketScore: res.marketScore,
        relevanceScore: res.relevanceScore,
        // Champs legacy conservés pour rétro-compat — le prompt refondu (S1) ne les utilise plus
        // mais d'autres consommateurs éventuels du body peuvent encore les attendre.
        kpis: res.kpis.map((k: KpiResult) => ({ name: k.name, color: k.color, label: k.label })),
        verdict: { level: res.verdict.level, greenCount: res.verdict.greenCount, totalKpis: res.verdict.totalKpis },
      },
    )
  },
)

onUnmounted(() => aiAbort())

// Sprint B (2026-05-02) — État AiPanel pour le mode libre (manual streaming).
// Mapping props legacy → AiPanelState attendu par <AiPanel>.
const manualAiState = computed<AiPanelState>(() => {
  if (aiError.value) return 'error'
  if (aiIsStreaming.value) return 'streaming'
  if (parsedMarkdown.value && parsedMarkdown.value.trim().length > 0) return 'success'
  return 'idle'
})

const manualVerdictConfig = computed(() => {
  const v = manualVerdictSummary.value
  return v ? VERDICT_CONFIG[v.level] : null
})

// Sprint B — Régénération du panel IA en mode libre (re-stream sur le mot-clé courant).
function handleManualAiRegenerate() {
  const kw = currentResult.value?.keyword
  if (!kw) return
  aiAbort()
  aiStartStream(
    `/api/keywords/${encodeURIComponent(kw)}/ai-panel`,
    {
      level: currentResult.value!.articleLevel,
      articleId: props.selectedArticle?.id,
      marketScore: currentResult.value!.marketScore,
      relevanceScore: currentResult.value!.relevanceScore,
      kpis: currentResult.value!.kpis.map((k: KpiResult) => ({ name: k.name, color: k.color, label: k.label })),
      verdict: { level: currentResult.value!.verdict.level, greenCount: currentResult.value!.verdict.greenCount, totalKpis: currentResult.value!.verdict.totalKpis },
    },
  )
}

// --- Lock/Unlock (manual mode) ---
function lockCaptaine() {
  isLocked.value = true
  const keyword = currentResult.value?.keyword
  log.info('CaptainValidation — Capitaine verrouillé', { keyword, verdict: effectiveVerdict.value })
  if (props.mode !== 'libre') emit('check-completed', 'capitaine_locked')
  if (keyword) {
    emit('validated', keyword)
    const aiMarkdown = aiChunks.value ?? null
    articleKeywordsStore.lockCaptain(keyword, aiMarkdown, props.selectedArticle?.id)
    if (props.selectedArticle?.id) articleKeywordsStore.saveKeywords(props.selectedArticle.id)
  }
}

// État de la modale UnlockLieutenants. Quand l'utilisateur a déjà des
// Lieutenants verrouillés, déverrouiller le Capitaine est une décision lourde
// qu'on ne veut pas qu'il fasse par accident. La modale propose 3 choix :
// "Garder" (les lieutenants sont peut-être encore valides pour le nouveau
// Capitaine), "Archiver" (les passer en status 'archived'), "Annuler".
type UnlockSource = 'manual' | 'carousel'
const pendingUnlock = ref<UnlockSource | null>(null)

const lockedLieutenantCount = computed(() => articleKeywordsStore.lockedLieutenants?.length ?? 0)

function requestUnlock(source: UnlockSource) {
  if (lockedLieutenantCount.value > 0) {
    // Trigger modal — defer actual unlock until user choice
    pendingUnlock.value = source
    return
  }
  // No lieutenants locked → straight unlock
  performUnlock(source)
}

function performUnlock(source: UnlockSource) {
  if (source === 'manual') {
    isLocked.value = false
  } else {
    lockedKeyword.value = null
    isLocked.value = false
  }
  log.info('CaptainValidation — Capitaine déverrouillé', { source })
  if (props.mode !== 'libre') emit('check-removed', 'capitaine_locked')
  pendingUnlock.value = null
}

function handleUnlockKeep() {
  if (!pendingUnlock.value) return
  log.info('[CaptainValidation] Unlock — keep lieutenants')
  performUnlock(pendingUnlock.value)
}

function handleUnlockArchive() {
  if (!pendingUnlock.value) return
  log.info('[CaptainValidation] Unlock — archive lieutenants', { count: lockedLieutenantCount.value })
  articleKeywordsStore.archiveLockedLieutenants()
  if (props.selectedArticle?.id) articleKeywordsStore.saveKeywords(props.selectedArticle.id)
  notify.info(`${lockedLieutenantCount.value} lieutenant(s) archivé(s)`)
  performUnlock(pendingUnlock.value)
}

function handleUnlockCancel() {
  log.debug('[CaptainValidation] Unlock cancelled')
  pendingUnlock.value = null
}

function unlockCaptaine() {
  requestUnlock('manual')
}

function chipVerdictColor(entry: { verdict: { level: VerdictLevel } }): string {
  return VERDICT_COLORS[entry.verdict.level]
}

function handleSuggestedClick(kw: string) {
  keywordInput.value = kw
  validateKeyword(kw, articleLevel.value, props.selectedArticle?.title, props.selectedArticle?.painPoint ?? undefined, props.selectedArticle?.id)
}

function handleHistoryClick(index: number) {
  navigateHistory(index)
  if (history.value[index]) keywordInput.value = history.value[index].keyword
}

// ===== CAROUSEL (data layer) + RADAR-LIST UI (workflow) =====
const carousel = useExploredKeywords()
const carouselEntries = computed(() => carousel.entries.value)
const lockedKeyword = ref<string | null>(null)

// 2026-05-02 — Tri unifié de la radar-list (Capitaine).
// L'item verrouillé reste TOUJOURS en tête, peu importe le critère choisi.
//
// Score = `card.relevanceScore.total` (Score Pertinence STRICT, sans fallback
// sur combinedScore). Cohérent avec le score affiché par RadarKeywordCard en
// mode `displayMode='relevance'` après la migration scoring du 2026-05-02.
//
// Items sans relevanceScore (painPoint absent ou cache obsolète) → valeur null
// → toujours en bas du tri (gestion native de useSortableList). Le score
// affiché sur ces cards est "—", donc l'absence de tri sur ces items est
// visuellement cohérente.
//
// Voir docs/scoring-kpi-vs-relevance.md.
const captainSortOptions: SortOption[] = [
  { key: 'az', label: 'A-Z' },
  { key: 'score', label: 'Score Pertinence' },
]
const { sorted: sortedEntries, sortState: captainSortState } = useSortableList<ExploredKeywordEntry>({
  items: carouselEntries,
  getValue: (entry, key) => {
    if (key === 'az') return entry.card.keyword
    if (key === 'score') return entry.card.relevanceScore?.total ?? null
    return null
  },
  pinnedPredicate: (entry) => lockedKeyword.value !== null && entry.card.keyword === lockedKeyword.value,
})

/**
 * Convertit l'index visuel (dans la liste triée) vers l'index brut de
 * `carousel.entries`. Indispensable pour rester rétro-compatible avec
 * `selectedIndex`, `lockEntry(idx)`, `lockedIndex`, watchers, qui parlent
 * tous en index brut.
 */
function rawIndexOf(entry: ExploredKeywordEntry): number {
  return carousel.entries.value.findIndex(e => e.originalCard.keyword === entry.originalCard.keyword)
}

// Sprint 2026-04 — Pointeur de sélection UI pour la liste verticale (mode workflow).
// Indépendant de carousel.currentIndex (qui sert l'auto-validation interne).
const selectedIndex = ref<number | null>(null)
const selectedEntry = computed<ExploredKeywordEntry | null>(() => {
  if (selectedIndex.value === null) return null
  return carousel.entries.value[selectedIndex.value] ?? null
})
const lockedIndex = computed(() => {
  if (lockedKeyword.value === null) return -1
  return carousel.entries.value.findIndex(e => e.card.keyword === lockedKeyword.value)
})
const lockedEntryExists = computed(() => lockedIndex.value !== -1)
const selectedIsLocked = computed(() => {
  if (!selectedEntry.value || !lockedKeyword.value) return false
  return selectedEntry.value.card.keyword === lockedKeyword.value
})

// Reset selectedIndex si entries shrink en dessous de l'index pointé
watch(
  () => carousel.entries.value.length,
  (len) => {
    if (selectedIndex.value !== null && selectedIndex.value >= len) {
      selectedIndex.value = null
    }
  },
)

let lastAutoValidatedId: number | null = null
watch(
  () => props.selectedArticle?.id,
  (id, oldId) => {
    if (oldId && id !== oldId) {
      selectedIndex.value = null
      carousel.reset()
      lockedKeyword.value = null
      lastAutoValidatedId = null
      abortAllAiStreams()
      carouselAiCache.value = new Map()
      carouselAiErrors.value = new Map()
      persistedValidations.clear()
      persistedRoots.clear()
      persistedAiPanels.clear()
    }
    if (!id || id === lastAutoValidatedId) return
    const article = props.selectedArticle
    if (!article) return
    // Skip auto-validation if validation history exists (will be restored by history watcher)
    // Guard: only trust history if the store data belongs to this article (prevents race condition)
    const storeMatchesArticle = articleKeywordsStore.keywords?.articleId === id
    const existingHistory = storeMatchesArticle
      ? articleKeywordsStore.keywords?.richCaptain?.validationHistory
      : undefined
    if (existingHistory && existingHistory.length > 0) {
      lastAutoValidatedId = id
      if (isLocked.value) {
        const lockedKw = existingHistory.find(h => h.keyword === articleKeywordsStore.keywords?.richCaptain?.keyword)
        lockedKeyword.value = lockedKw?.keyword ?? articleKeywordsStore.keywords?.richCaptain?.keyword ?? null
      }
      return
    }
    const suggestions = props.suggestedKeywords
    const kw = (suggestions && suggestions.length > 0) ? suggestions[0] : article.keyword
    if (!kw) return
    lastAutoValidatedId = id
    keywordInput.value = kw
    carousel.addEntry(kw, articleLevel.value, article.title, article.id, article.painPoint ?? undefined)
    if (isLocked.value) lockedKeyword.value = kw
  },
  { immediate: true },
)

// Note Sprint 10.5 (2026-05-06) — Le watcher painPoint qui re-fetchait
// /captain-explorations sur changement de painPoint a été supprimé.
// Le painPoint est désormais figé après la sortie du Cerveau (cf.
// FR-PAIN-IMMUTABLE-AFTER-CEREVEAU). Le calcul live de la Pertinence reste
// effectué côté backend à chaque hydratation initiale de l'onglet Capitaine.

// --- Carousel AI streaming ---
const carouselAiCache = ref(new Map<string, string>())
const carouselAiStreaming = ref(new Set<string>())
const carouselAiErrors = ref(new Map<string, string>())
const carouselAiAbortMap = new Map<string, AbortController>()

function touchAiCache() { carouselAiCache.value = new Map(carouselAiCache.value) }
function touchAiStreaming() { carouselAiStreaming.value = new Set(carouselAiStreaming.value) }
function touchAiErrors() { carouselAiErrors.value = new Map(carouselAiErrors.value) }

function launchAiStream(keyword: string, validation: ValidateResponse, force = false) {
  // Sprint 3.2 — `force` allows the regenerate button to bypass the in-memory
  // cache and re-stream from Claude. We also drop the persistedAiPanels guard
  // so the new markdown is re-saved.
  if (!force && (carouselAiCache.value.has(keyword) || carouselAiStreaming.value.has(keyword))) return
  if (force) {
    carouselAiCache.value.delete(keyword)
    persistedAiPanels.delete(keyword)
  }

  const controller = new AbortController()
  carouselAiAbortMap.set(keyword, controller)
  carouselAiStreaming.value.add(keyword)
  touchAiStreaming()

  const path = `/keywords/${encodeURIComponent(validation.keyword)}/ai-panel`
  const body = {
    level: validation.articleLevel,
    articleId: props.selectedArticle?.id,
    marketScore: validation.marketScore,
    relevanceScore: validation.relevanceScore,
    // Champs legacy conservés pour rétro-compat — cf. S1.
    kpis: validation.kpis.map((k: KpiResult) => ({ name: k.name, color: k.color, label: k.label })),
    verdict: { level: validation.verdict.level, greenCount: validation.verdict.greenCount, totalKpis: validation.verdict.totalKpis },
  }

  let accumulated = ''

  // FR-INFRA-API-STREAM : passe par apiStream qui gere automatiquement
  // cost-log, KNOWN_ERROR_CODES (toast UI) et AbortController.
  apiStream<unknown>(path, body, {
    onChunkRaw: (piece) => {
      accumulated += piece
      carouselAiCache.value.set(keyword, accumulated)
      touchAiCache()
    },
    onError: (msg) => {
      carouselAiErrors.value.set(keyword, msg)
      touchAiErrors()
    },
  }, { signal: controller.signal })
    .then((out) => {
      if (out.aborted) return
      if (out.errorMessage) {
        carouselAiErrors.value.set(keyword, out.errorMessage)
        touchAiErrors()
      }
    })
    .finally(() => {
      carouselAiStreaming.value.delete(keyword)
      touchAiStreaming()
      carouselAiAbortMap.delete(keyword)
      if (accumulated && !carouselAiErrors.value.has(keyword)) {
        carouselAiCache.value.set(keyword, accumulated)
        touchAiCache()
      }
    })
}

function abortAllAiStreams() {
  for (const controller of carouselAiAbortMap.values()) controller.abort()
  carouselAiAbortMap.clear()
  carouselAiStreaming.value.clear()
  touchAiStreaming()
}

const selectedAiStreaming = computed(() => {
  const kw = selectedEntry.value?.card.keyword
  return kw ? carouselAiStreaming.value.has(kw) : false
})

const selectedAiError = computed(() => {
  const kw = selectedEntry.value?.card.keyword
  return kw ? carouselAiErrors.value.get(kw) ?? null : null
})

const selectedParsedMarkdown = computed(() => {
  const entry = selectedEntry.value
  if (!entry) return ''
  const text = carouselAiCache.value.get(entry.card.keyword)
  if (text) return marked.parse(text) as string
  return ''
})

// Sprint 2026-04 — Regenerate l'IA pour l'entrée sélectionnée dans la side panel.
function handleAiRegenerate() {
  const entry = selectedEntry.value
  if (!entry?.validation) return
  const kw = entry.card.keyword
  log.info('[CaptainValidation] AI panel regenerate requested', { keyword: kw })
  launchAiStream(kw, entry.validation, true)
}

watch(
  () => props.radarCards,
  (cards) => {
    if (cards && cards.length > 0) {
      lockedKeyword.value = null
      abortAllAiStreams()
      carouselAiCache.value = new Map()
      carouselAiErrors.value = new Map()
      carousel.loadCards(cards, articleLevel.value, props.selectedArticle?.title, props.selectedArticle?.id, props.selectedArticle?.painPoint ?? undefined)
    }
  },
  { deep: true, immediate: true },
)

// Track which entries have already been persisted to avoid duplicate saves
const persistedValidations = new Set<string>()
const persistedRoots = new Set<string>()
const persistedAiPanels = new Set<string>()

// Pre-fill sets from existing persisted history AND restore carousel
//
// 2026-05-02 — `deep: true` indispensable : `mergeCaptainHistory` (TabLoadPrompt)
// fait un `history.push(entry)` qui mute le tableau en place. Sans deep, le
// watcher ne se déclenche pas et le carousel n'est pas rebuild → le tri n'a
// aucun nouvel item à trier.
watch(
  () => articleKeywordsStore.keywords?.richCaptain?.validationHistory,
  (history) => {
    if (!history) return
    // Guard: only process history that belongs to the currently selected article
    const storeArticleId = articleKeywordsStore.keywords?.articleId
    const selectedId = props.selectedArticle?.id
    if (storeArticleId !== selectedId) return

    for (const entry of history) {
      persistedValidations.add(entry.keyword)
      if (entry.aiPanelMarkdown) persistedAiPanels.add(entry.keyword)
      if (entry.rootKeywords.length > 0) persistedRoots.add(`${entry.keyword}:${entry.rootKeywords.length}`)
    }

    // Sprint 16 hotfix — restore whenever DB history brings MORE entries than
    // the carousel currently holds. Previously this watcher used
    // `!carousel.isActive.value`, which silently skipped the restore when a
    // race-condition watcher had already inserted 1 stub entry from
    // `props.selectedArticle.keyword` before fetchKeywords() returned. Result:
    // 1/34 entries displayed instead of 34/34. `restoreFromHistory` rebuilds
    // `entries` from scratch so it naturally supersedes any prior stub.
    if (history.length > carousel.entries.value.length) {
      log.info('[CaptainValidation] Restoring carousel from history', {
        entryCount: history.length,
        previousCarouselCount: carousel.entries.value.length,
        level: articleLevel.value,
        rootKeywordsCount: articleKeywordsStore.keywords?.richRootKeywords?.length ?? 0,
      })
      carousel.restoreFromHistory(
        history,
        articleLevel.value,
        articleKeywordsStore.keywords?.richRootKeywords,
      )
      // Restore AI panel cache from persisted markdown
      for (const entry of history) {
        if (entry.aiPanelMarkdown) {
          carouselAiCache.value.set(entry.keyword, entry.aiPanelMarkdown)
        }
      }
      touchAiCache()
    }
  },
  { immediate: true, deep: true },
)

const toKpiSummary = (kpis: { name: string; rawValue: number }[]) =>
  kpis.map(({ name, rawValue }) => ({ name, rawValue }))

// Watcher 1: fires when a carousel entry gets its validation result
watch(
  () => carousel.entries.value.map(e => e.validation),
  () => {
    // Guard: only persist if store data belongs to the currently selected article
    const articleId = props.selectedArticle?.id
    if (!articleId || articleKeywordsStore.keywords?.articleId !== articleId) return

    for (const entry of carousel.entries.value) {
      if (!entry.validation) continue
      const kw = entry.card.keyword

      // Launch AI stream if not cached/streaming
      if (!carouselAiCache.value.has(kw) && !carouselAiStreaming.value.has(kw)) {
        launchAiStream(kw, entry.validation)
      }

      // Persist captain validation entry (once per keyword)
      if (!persistedValidations.has(kw)) {
        persistedValidations.add(kw)
        articleKeywordsStore.addCaptainValidation({
          keyword: kw,
          kpis: toKpiSummary(entry.validation.kpis),
          articleLevel: entry.validation.articleLevel,
          rootKeywords: [],  // filled later by watcher 2 when roots arrive
          paaQuestions: entry.validation.paaQuestions,
        }, articleId)
        requestSave()
      }
    }
  },
  { deep: true },
)

// Watcher 2: fires when root variants arrive (async, after main validation)
watch(
  () => carousel.entries.value.map(e => e.rootVariants.size),
  () => {
    const articleId = props.selectedArticle?.id
    if (!articleId || articleKeywordsStore.keywords?.articleId !== articleId) return
    for (const entry of carousel.entries.value) {
      if (entry.rootVariants.size === 0) continue
      const kw = entry.card.keyword
      const rootKey = `${kw}:${entry.rootVariants.size}`
      if (persistedRoots.has(rootKey)) continue
      persistedRoots.add(rootKey)

      // Update rootKeywords on the captain validation entry
      const rootKeys = Array.from(entry.rootVariants.keys())
      const history = articleKeywordsStore.keywords?.richCaptain?.validationHistory
      const captainEntry = history?.find(h => h.keyword === kw)
      if (captainEntry) captainEntry.rootKeywords = rootKeys

      // Persist each root keyword validation
      for (const [rootKw, variant] of entry.rootVariants.entries()) {
        articleKeywordsStore.addRootKeywordValidation({
          keyword: rootKw,
          parentKeyword: kw,
          kpis: toKpiSummary(variant.validation.kpis),
          articleLevel: variant.validation.articleLevel,
          timestamp: new Date().toISOString(),
        }, articleId)
      }
      requestSave()
    }
  },
)

// Watcher 3: fires when AI panel streaming completes for a keyword
watch(
  () => [...carouselAiCache.value.keys()].filter(k => !carouselAiStreaming.value.has(k)),
  (finishedKeys) => {
    const articleId = props.selectedArticle?.id
    if (!articleId || articleKeywordsStore.keywords?.articleId !== articleId) return
    let changed = false
    for (const kw of finishedKeys) {
      if (persistedAiPanels.has(kw)) continue
      const markdown = carouselAiCache.value.get(kw)
      if (!markdown) continue
      persistedAiPanels.add(kw)
      articleKeywordsStore.updateCaptainValidationAiPanel(kw, markdown)
      changed = true
    }
    if (changed) requestSave()
  },
)

function carouselEffectiveVerdict(entry: ExploredKeywordEntry): VerdictLevel | null {
  return carousel.effectiveVerdict(entry)
}


// Étape 3F — Mini résumé verdict injecté dans le slot AiPanel à la place
// du CaptainVerdictPanel (qui prenait toute la largeur). On garde l'info
// d'évaluation mais sans bloc dédié qui étouffait la lecture.
const selectedVerdictSummary = computed(() => {
  const entry = selectedEntry.value
  if (!entry?.validation) return null
  const level = carouselEffectiveVerdict(entry)
  if (!level) return null
  const v = entry.validation.verdict
  return {
    level,
    label: getVerdictLabel(v),
    reason: level === 'NO-GO' ? noGoFeedback(v, entry.validation.kpis) : v.reason,
  }
})

const manualVerdictSummary = computed(() => {
  if (!currentResult.value || !effectiveVerdict.value) return null
  const v = currentResult.value.verdict
  return {
    level: effectiveVerdict.value,
    label: verdictLabel.value,
    reason: effectiveVerdict.value === 'NO-GO' ? noGoFeedback(v, currentResult.value.kpis) : v.reason,
  }
})

const manualPaaQuestions = computed(() => {
  const paa = currentResult.value?.paaQuestions
  if (!paa) return []
  return paa.filter(p => p.question?.trim())
})

// --- Sélection / lock / unlock dans la liste verticale ---
function selectEntry(idx: number) {
  if (idx < 0 || idx >= carousel.entries.value.length) return
  selectedIndex.value = idx
  carousel.goTo(idx)
}

async function lockEntry(idx: number) {
  const entry = carousel.entries.value[idx]
  if (!entry?.validation) {
    log.debug('[CaptainValidation] lockEntry no-op (entry incomplete)', { idx })
    return
  }
  const newKw = entry.card.keyword
  const previousKw = lockedKeyword.value
  const isTransfer = previousKw !== null && previousKw !== newKw

  if (isTransfer) {
    log.info('CaptainValidation — lock transfert', { from: previousKw, to: newKw })
    if (props.mode !== 'libre') emit('check-removed', 'capitaine_locked')
    await nextTick()
  }

  selectedIndex.value = idx
  lockedKeyword.value = newKw
  isLocked.value = true

  if (props.mode !== 'libre') emit('check-completed', 'capitaine_locked')
  emit('validated', newKw)

  const aiMarkdown = carouselAiCache.value.get(newKw) ?? null
  articleKeywordsStore.lockCaptain(newKw, aiMarkdown, props.selectedArticle?.id)
  const rootKeys = Array.from(entry.rootVariants.keys())
  articleKeywordsStore.setRootKeywords(rootKeys)
  if (props.selectedArticle?.id) articleKeywordsStore.saveKeywords(props.selectedArticle.id)
}

function unlockEntry() {
  // Délègue à requestUnlock — déclenche la modale UnlockLieutenants si des
  // lieutenants verrouillés existent, sinon déverrouille direct.
  requestUnlock('carousel')
}

function gotoLocked() {
  if (lockedIndex.value === -1) return
  const idx = lockedIndex.value
  selectEntry(idx)
  nextTick(() => {
    const el = document.querySelector(`[data-testid="radar-list-item-${idx}"]`)
    if (el && 'scrollIntoView' in el) {
      ;(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

// --- Interactive words: word-toggle handler (par index) ---
// Bascule sur la variante racine correspondant aux indices actifs (ou la card
// originale si tous les mots sont actifs). Opère sur l'entrée d'index `idx`
// passé explicitement par la liste.
function handleWordToggleAt(idx: number, activeIndices: number[]) {
  const entry = carousel.entries.value[idx]
  if (!entry) return
  const words = entry.originalCard.keyword.trim().split(/\s+/)
  const sorted = [...activeIndices].sort((a, b) => a - b)
  const activeKeywordStr = sorted.map(i => words[i]).filter(Boolean).join(' ')

  if (sorted.length === words.length) {
    carousel.entries.value[idx] = {
      ...entry,
      card: entry.originalCard,
      validation: entry.validation,
      activeWordIndices: sorted,
    }
    return
  }

  const variant = entry.rootVariants.get(activeKeywordStr)
  if (variant) {
    carousel.entries.value[idx] = {
      ...entry,
      card: variant.card,
      validation: variant.validation,
      activeWordIndices: sorted,
    }
    return
  }

  // Pas de variant pré-validé : on valide à la volée et on enrichit rootVariants.
  if (activeKeywordStr.split(/\s+/).length < 2) {
    carousel.entries.value[idx] = { ...entry, activeWordIndices: sorted }
    return
  }

  const previousActiveIndices = entry.activeWordIndices
  log.info('[CaptainValidation] handleWordToggleAt — validating root variant in-place', { parent: entry.originalCard.keyword, variant: activeKeywordStr, idx })
  // Aligne currentIndex pour cohérence interne du composable (pas critique mais propre)
  carousel.goTo(idx)
  carousel.addRootVariantToEntry(
    idx,
    activeKeywordStr,
    sorted,
    articleLevel.value,
    props.selectedArticle?.title,
    props.selectedArticle?.id,
    props.selectedArticle?.painPoint ?? undefined,
  ).catch((err) => {
    log.warn('[CaptainValidation] Root variant validation failed', { variant: activeKeywordStr, error: (err as Error).message })
    notify.error(`Impossible de valider "${activeKeywordStr}"`)
    const current = carousel.entries.value[idx]
    if (current) {
      carousel.entries.value[idx] = { ...current, activeWordIndices: previousActiveIndices }
    }
  })
}

/**
 * Sprint 2 (2026-05-04) — Recalcul manuel du score Pertinence pour une card
 * du carousel. L'utilisateur clique sur le bouton "refresh" dans
 * `radar-card-lockable__actions` quand il voit que la Pertinence est null
 * malgré un painPoint défini (cas "no-signals").
 *
 * On délègue à `carousel.addEntry()` qui ré-injecte la card via
 * `validateKeyword(keyword, level, title, painPoint, articleId)` —
 * même chemin que la validation initiale, donc cohérent.
 */
async function handleRecomputeRelevance(card: { keyword: string }) {
  const articleId = props.selectedArticle?.id
  const painPoint = props.selectedArticle?.painPoint
  if (!articleId || !painPoint || painPoint.trim().length < 10) {
    log.warn('[CaptainValidation] recompute-relevance skipped (no articleId or painPoint)', { keyword: card.keyword })
    return
  }
  log.info('[CaptainValidation] Manual recompute relevance', { keyword: card.keyword })
  await carousel.addEntry(
    card.keyword,
    articleLevel.value,
    props.selectedArticle?.title,
    articleId,
    painPoint,
  )
}

// --- Root variant switch (sur l'entrée sélectionnée) ---
const currentRootVariants = computed(() => {
  const entry = selectedEntry.value
  if (!entry) return []
  return Array.from(entry.rootVariants.values())
})

const activeVariantKeyword = computed(() => {
  const entry = selectedEntry.value
  if (!entry) return ''
  return entry.card.keyword
})

function switchToVariant(variant: { keyword: string; card: RadarCard; validation: ValidateResponse }) {
  if (selectedIndex.value === null) return
  const idx = selectedIndex.value
  const entry = carousel.entries.value[idx]
  if (!entry) return
  const variantWords = variant.keyword.trim().split(/\s+/)
  carousel.entries.value[idx] = {
    ...entry,
    card: variant.card,
    validation: variant.validation,
    activeWordIndices: Array.from({ length: variantWords.length }, (_, i) => i),
  }
}

onUnmounted(() => abortAllAiStreams())
</script>

<template>
  <div class="captain-validation">
    <CaptainInput
      :model-value="keywordInput"
      :composition-warnings="compositionWarnings"
      :composition-all-pass="compositionAllPass"
      :article-level="articleLevel"
      :disabled="isLoading"
      @update:model-value="keywordInput = $event"
      @submit="handleValidate"
    />

    <!-- ===== MODE WORKFLOW : Liste verticale + Side Panel sticky ===== -->
    <div v-if="mode === 'workflow'" class="captain-layout" data-testid="captain-layout">
      <CaptainRadarList
        :entries="carouselEntries"
        :sorted-entries="sortedEntries"
        :selected-index="selectedIndex"
        :locked-index="lockedIndex"
        :locked-keyword="lockedKeyword"
        :article-level="articleLevel"
        :article-id="props.selectedArticle?.id ?? null"
        :article-pain-point="props.selectedArticle?.painPoint ?? null"
        :sort-options="captainSortOptions"
        :sort-state="captainSortState"
        :raw-index-of="rawIndexOf"
        @select="selectEntry"
        @lock="lockEntry"
        @unlock="unlockEntry"
        @word-toggle="(p) => handleWordToggleAt(p.index, p.indices)"
        @recompute-relevance="handleRecomputeRelevance"
        @sort-change="(s) => captainSortState = s"
      />

      <CaptainSidePanel
        :entry="selectedEntry"
        :parsed-markdown="selectedParsedMarkdown"
        :ai-is-streaming="selectedAiStreaming"
        :ai-error="selectedAiError"
        :verdict-summary="selectedVerdictSummary"
        :root-variants="currentRootVariants"
        :is-loading-roots="selectedEntry?.isLoadingRoots ?? false"
        :failed-roots="selectedEntry?.failedRoots ?? []"
        :active-variant-keyword="activeVariantKeyword"
        :show-goto-locked="lockedEntryExists && !selectedIsLocked"
        @switch-variant="switchToVariant"
        @ai-regenerate="handleAiRegenerate"
        @goto-locked="gotoLocked"
        @close="selectedIndex = null"
      />
    </div>

    <!-- ===== MODE LIBRE (Labo) : manual-mode conservé tel quel ===== -->
    <div v-else class="manual-mode">
      <div v-if="history.length > 1" class="history-carousel" data-testid="history-carousel">
        <span class="history-label">Historique ({{ history.length }})</span>
        <div class="history-chips">
          <button
            v-for="(entry, idx) in history"
            :key="`${entry.keyword}-${idx}`"
            class="history-chip"
            :class="{ 'history-chip--active': idx === historyIndex }"
            :style="{ borderColor: chipVerdictColor(entry) }"
            @click="handleHistoryClick(idx)"
          >
            <span class="history-chip-verdict" :style="{ color: chipVerdictColor(entry) }">
              {{ entry.verdict.level }}
            </span>
            <span class="history-chip-keyword">{{ entry.keyword }}</span>
          </button>
        </div>
      </div>

      <div v-if="!keywordInput && !isLoading && history.length === 0" class="captain-empty" data-testid="captain-empty">
        <p class="captain-empty-text">Sélectionnez un article avec un mot-clé pour lancer la validation Capitaine.</p>
      </div>

      <div v-else-if="isLoading" class="captain-loading" data-testid="captain-loading">
        <div class="captain-loading-spinner" />
        <p>Validation en cours...</p>
      </div>

      <div v-else-if="error" class="captain-error" data-testid="captain-error">
        <p>Erreur : {{ error }}</p>
      </div>

      <div v-else-if="currentResult" class="captain-results" data-testid="captain-results">
        <CollapsableSection title="Seuils de référence" :default-open="false">
          <div class="thresholds-table-wrap">
            <table class="thresholds-table" data-testid="thresholds-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th :class="{ 'th-active': articleLevel === 'pilier' }">Pilier</th>
                  <th :class="{ 'th-active': articleLevel === 'intermediaire' }">Intermédiaire</th>
                  <th :class="{ 'th-active': articleLevel === 'specifique' }">Spécialisé</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in thresholdRows" :key="row.key">
                  <td class="th-label">{{ row.label }}</td>
                  <td :class="{ 'td-active': articleLevel === 'pilier' }">{{ thresholdCell(row.key, 'pilier') }}</td>
                  <td :class="{ 'td-active': articleLevel === 'intermediaire' }">{{ thresholdCell(row.key, 'intermediaire') }}</td>
                  <td :class="{ 'td-active': articleLevel === 'specifique' }">{{ thresholdCell(row.key, 'specifique') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsableSection>

        <CollapsableSection
          v-if="manualPaaQuestions.length > 0"
          :title="`Questions associées (${manualPaaQuestions.length} PAA)`"
          :default-open="false"
        >
          <ul class="paa-list" data-testid="paa-list">
            <li v-for="paa in manualPaaQuestions" :key="paa.question" class="paa-item">
              {{ paa.question }}
            </li>
          </ul>
        </CollapsableSection>

        <!-- Layout horizontal : radar card + sidebar racines à droite -->
        <div class="radar-card-section captain-card-with-sidebar" data-testid="radar-card-section">
          <RadarKeywordCard
            v-if="radarCard"
            class="captain-card-with-sidebar__card"
            :card="radarCard"
            display-mode="relevance"
            :article-level="articleLevel"
            data-testid="captain-radar-card"
          />
          <div v-else-if="isLoadingRadar" class="radar-loading captain-card-with-sidebar__card" data-testid="radar-loading">
            <div class="captain-loading-spinner" />
            <p>Chargement de la fiche Radar...</p>
          </div>
          <CaptainRootsSidebar
            v-if="radarCard"
            :single-root="rootResult"
            :is-loading="isLoadingRoot"
          />
        </div>

        <CollapsableSection v-if="suggestedKeywords.length > 0" title="Mots-clés suggérés" :default-open="true">
          <div class="suggested-chips" data-testid="suggested-keywords">
            <button v-for="sk in suggestedKeywords" :key="sk" class="suggested-chip" @click="handleSuggestedClick(sk)">
              {{ sk }}
            </button>
          </div>
        </CollapsableSection>

        <p class="level-info">
          Niveau : <strong>{{ currentResult.articleLevel }}</strong>
          <span v-if="currentResult.fromCache"> — résultat en cache</span>
        </p>

        <AiPanel
          variant="advice"
          title="Avis expert IA"
          subtitle="Analyse Capitaine basée sur les KPIs marché et la pertinence."
          :state="manualAiState"
          :error="aiError"
          regen-confirm-message="Régénérer l'avis expert IA ? Cela consommera un appel Claude."
          @trigger="handleManualAiRegenerate"
        >
          <div
            v-if="manualVerdictSummary && manualVerdictConfig"
            class="ai-panel-verdict"
            data-testid="ai-panel-verdict"
            :style="{ borderColor: manualVerdictConfig.color, background: manualVerdictConfig.bg }"
          >
            <span class="ai-panel-verdict__icon" :aria-hidden="true">{{ manualVerdictConfig.icon }}</span>
            <span class="ai-panel-verdict__level" :style="{ color: manualVerdictConfig.color }">{{ manualVerdictSummary.level }}</span>
            <span class="ai-panel-verdict__label">{{ manualVerdictSummary.label }}</span>
            <span v-if="manualVerdictSummary.reason" class="ai-panel-verdict__reason">· {{ manualVerdictSummary.reason }}</span>
          </div>
          <AiAdviceMarkdown :markdown="parsedMarkdown" />

          <template #streaming>
            <div
              v-if="manualVerdictSummary && manualVerdictConfig"
              class="ai-panel-verdict"
              :style="{ borderColor: manualVerdictConfig.color, background: manualVerdictConfig.bg }"
            >
              <span class="ai-panel-verdict__icon" :aria-hidden="true">{{ manualVerdictConfig.icon }}</span>
              <span class="ai-panel-verdict__level" :style="{ color: manualVerdictConfig.color }">{{ manualVerdictSummary.level }}</span>
              <span class="ai-panel-verdict__label">{{ manualVerdictSummary.label }}</span>
            </div>
            <AiAdviceMarkdown :markdown="parsedMarkdown" :streaming="true" />
          </template>
        </AiPanel>

        <CaptainLockPanel
          :is-locked="isLocked"
          :can-lock="effectiveVerdict === 'GO'"
          @lock="lockCaptaine"
          @unlock="unlockCaptaine"
        />
      </div>
    </div>

    <!-- Modale de protection contre la perte de travail :
         si l'utilisateur déverrouille le Capitaine alors qu'il a déjà des
         Lieutenants verrouillés, on lui propose de les Garder, Archiver, ou
         Annuler le déverrouillage. -->
    <UnlockLieutenantsModal
      v-if="pendingUnlock !== null"
      :lieutenant-count="lockedLieutenantCount"
      :capitaine-keyword="lockedKeyword ?? currentResult?.keyword ?? ''"
      @keep="handleUnlockKeep"
      @archive="handleUnlockArchive"
      @cancel="handleUnlockCancel"
    />
  </div>
</template>

<style scoped>
.captain-validation {
  padding: 1rem 0;
}

/* 2026-04-30 — Le side-panel est désormais purement flottant (position: fixed,
   redimensionnable sans limite). Il ne fait plus partie du grid et n'occupe
   plus de colonne réservée. Le container de la radar list utilise toute la
   largeur disponible en permanence — qu'une carte soit sélectionnée ou non. */
.captain-layout {
  display: block;
  margin-top: 1rem;
}

.radar-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.radar-list-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted, #64748b);
  border: 1px dashed var(--color-border, #e2e8f0);
  border-radius: 10px;
  font-size: 0.875rem;
}

/* 2026-04-30 — Refonte UX (demande utilisateur) :
   - Sélection : effet "bouton enfoncé" au lieu d'une border bleue extérieure.
     Léger background, ombre interne (creux), translation 1px verticale.
   - Verrouillage : plus de border verte parent — le seul indicateur reste le
     bouton cadenas (côté RadarCardLockable) qui passe en vert plein quand actif.
   - Hover/focus : ombre douce élévée, sans border colorée. */
.radar-list-item {
  cursor: pointer;
  border-radius: 10px;
  background: transparent;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
}

.radar-list-item:hover {
  background: rgba(15, 23, 42, 0.025);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.radar-list-item:focus-visible {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}

/* "Bouton enfoncé" : creux interne + translation verticale + background plus marqué */
.radar-list-item--selected {
  background: rgba(15, 23, 42, 0.05);
  box-shadow:
    inset 0 2px 4px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  transform: translateY(1px);
}

.radar-list-item--selected:hover {
  background: rgba(15, 23, 42, 0.06);
}

.captain-empty,
.captain-loading,
.captain-error {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted, #64748b);
}

.captain-loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.captain-error {
  color: var(--color-error, #ef4444);
}

.history-carousel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface, #f8fafc);
  border-radius: 6px;
}

.history-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
  white-space: nowrap;
  flex-shrink: 0;
}

.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.75rem;
  background: var(--color-surface, #fff);
  cursor: pointer;
  transition: all 0.15s;
  max-width: 200px;
}

.history-chip:hover {
  background: var(--color-bg-hover, #f1f5f9);
}

.history-chip--active {
  border-width: 2px;
  box-shadow: 0 0 0 1px var(--color-primary, #2563eb);
}

.history-chip-verdict {
  font-weight: 700;
  font-size: 0.625rem;
  text-transform: uppercase;
  flex-shrink: 0;
}

.history-chip-keyword {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text, #1e293b);
}

.paa-list {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

.paa-item {
  font-size: 0.8125rem;
  color: var(--color-text, #1e293b);
  margin-bottom: 0.25rem;
}

.radar-card-section {
  margin-top: 1.25rem;
}

/* Étape 3E — Layout horizontal : radar card (flex 1) + sidebar racines (200px). */
.captain-card-with-sidebar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.captain-card-with-sidebar__card {
  flex: 1;
  min-width: 0;
}

.radar-loading {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-muted, #64748b);
  font-size: 0.8125rem;
}

.suggested-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.25rem 0;
}

.suggested-chip {
  padding: 0.25rem 0.625rem;
  background: var(--color-bg-hover, #f1f5f9);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--color-text, #1e293b);
  cursor: pointer;
  transition: all 0.15s;
}

.suggested-chip:hover {
  border-color: var(--color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
}

.thresholds-table-wrap {
  overflow-x: auto;
  padding: 0.25rem 0;
}

.thresholds-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.thresholds-table th,
.thresholds-table td {
  padding: 0.375rem 0.625rem;
  text-align: center;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.thresholds-table th {
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.th-label {
  text-align: left;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.th-active {
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-primary, #3b82f6);
}

.td-active {
  background: rgba(59, 130, 246, 0.05);
  font-weight: 600;
}

.level-info {
  margin-top: 1.25rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

/* Mini bandeau verdict en tête du slot AiPanel (Sprint B). */
.ai-panel-verdict {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.8125rem;
}
.ai-panel-verdict__icon { font-size: 0.875rem; }
.ai-panel-verdict__level { font-weight: 700; letter-spacing: 0.02em; }
.ai-panel-verdict__label { color: var(--color-text, #1e293b); }
.ai-panel-verdict__reason { color: var(--color-text-muted, #64748b); font-style: italic; }
</style>
