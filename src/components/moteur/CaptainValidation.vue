<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onBeforeUnmount } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { marked } from 'marked'
import { useCapitaineValidation, articleTypeToLevel } from '@/composables/keyword/useCapitaineValidation'
import { useCompositionCheck } from '@/composables/seo/useCompositionCheck'
import { useRadarCarousel } from '@/composables/keyword/useRadarCarousel'
import type { CarouselEntry } from '@/composables/keyword/useRadarCarousel'
import { useStreaming } from '@/composables/editor/useStreaming'
import { VERDICT_COLORS } from '@/composables/ui/useVerdictColors'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { log } from '@/utils/logger'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import RadarKeywordCard from '@/components/intent/RadarKeywordCard.vue'
import CaptainInput from '@/components/moteur/CaptainInput.vue'
import CaptainVerdictPanel from '@/components/moteur/CaptainVerdictPanel.vue'
import CaptainCarousel from '@/components/moteur/CaptainCarousel.vue'
import CaptainAiPanel from '@/components/moteur/CaptainAiPanel.vue'
import CaptainLockPanel from '@/components/moteur/CaptainLockPanel.vue'
import CaptainInteractiveWords from '@/components/moteur/CaptainInteractiveWords.vue'
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
  result, currentResult, isLoading, error,
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
  carousel.addEntry(kw, articleLevel.value, props.selectedArticle?.title)
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
        carousel.addEntry(persisted, articleLevel.value, props.selectedArticle?.title)
      }
      lockedKeyword.value = persisted
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
        kpis: res.kpis.map((k: KpiResult) => ({ name: k.name, color: k.color, label: k.label })),
        verdict: { level: res.verdict.level, greenCount: res.verdict.greenCount, totalKpis: res.verdict.totalKpis },
      },
    )
  },
)

onUnmounted(() => aiAbort())

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

function unlockCaptaine() {
  isLocked.value = false
  log.info('CaptainValidation — Capitaine déverrouillé')
  if (props.mode !== 'libre') emit('check-removed', 'capitaine_locked')
}

function chipVerdictColor(entry: { verdict: { level: VerdictLevel } }): string {
  return VERDICT_COLORS[entry.verdict.level]
}

function handleSuggestedClick(kw: string) {
  keywordInput.value = kw
  validateKeyword(kw, articleLevel.value, props.selectedArticle?.title)
}

function handleHistoryClick(index: number) {
  navigateHistory(index)
  if (history.value[index]) keywordInput.value = history.value[index].keyword
}

// ===== CAROUSEL =====
const carousel = useRadarCarousel()
const lockedKeyword = ref<string | null>(null)

let lastAutoValidatedId: number | null = null
watch(
  () => props.selectedArticle?.id,
  (id, oldId) => {
    if (oldId && id !== oldId) {
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
    carousel.addEntry(kw, articleLevel.value, article.title)
    if (isLocked.value) lockedKeyword.value = kw
  },
  { immediate: true },
)

// --- Carousel AI streaming ---
const carouselAiCache = ref(new Map<string, string>())
const carouselAiStreaming = ref(new Set<string>())
const carouselAiErrors = ref(new Map<string, string>())
const carouselAiAbortMap = new Map<string, AbortController>()

function touchAiCache() { carouselAiCache.value = new Map(carouselAiCache.value) }
function touchAiStreaming() { carouselAiStreaming.value = new Set(carouselAiStreaming.value) }
function touchAiErrors() { carouselAiErrors.value = new Map(carouselAiErrors.value) }

function launchAiStream(keyword: string, validation: { keyword: string; articleLevel: string; kpis: KpiResult[]; verdict: { level: string; greenCount: number; totalKpis: number } }) {
  if (carouselAiCache.value.has(keyword) || carouselAiStreaming.value.has(keyword)) return

  const controller = new AbortController()
  carouselAiAbortMap.set(keyword, controller)
  carouselAiStreaming.value.add(keyword)
  touchAiStreaming()

  const url = `/api/keywords/${encodeURIComponent(validation.keyword)}/ai-panel`
  const body = {
    level: validation.articleLevel,
    kpis: validation.kpis.map((k: KpiResult) => ({ name: k.name, color: k.color, label: k.label })),
    verdict: { level: validation.verdict.level, greenCount: validation.verdict.greenCount, totalKpis: validation.verdict.totalKpis },
  }

  let accumulated = ''

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? `Erreur HTTP ${res.status}`)
      }
      if (!res.body) throw new Error('Pas de body streamable')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (eventType === 'chunk') {
                accumulated += parsed.content
                carouselAiCache.value.set(keyword, accumulated)
                touchAiCache()
              } else if (eventType === 'error') {
                carouselAiErrors.value.set(keyword, parsed.message ?? 'Erreur inconnue')
                touchAiErrors()
              }
            } catch { /* ignore malformed JSON */ }
            eventType = ''
          }
        }
      }
    })
    .catch((err) => {
      if ((err as Error).name === 'AbortError') return
      carouselAiErrors.value.set(keyword, (err as Error).message)
      touchAiErrors()
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

const carouselCurrentAiStreaming = computed(() => {
  const kw = carousel.currentEntry.value?.card.keyword
  return kw ? carouselAiStreaming.value.has(kw) : false
})

const carouselCurrentAiError = computed(() => {
  const kw = carousel.currentEntry.value?.card.keyword
  return kw ? carouselAiErrors.value.get(kw) ?? null : null
})

const carouselParsedMarkdown = computed(() => {
  const entry = carousel.currentEntry.value
  if (!entry) return ''
  const text = carouselAiCache.value.get(entry.card.keyword)
  if (text) return marked.parse(text) as string
  return ''
})

watch(
  () => props.radarCards,
  (cards) => {
    if (cards && cards.length > 0) {
      lockedKeyword.value = null
      abortAllAiStreams()
      carouselAiCache.value = new Map()
      carouselAiErrors.value = new Map()
      carousel.loadCards(cards, articleLevel.value, props.selectedArticle?.title)
    }
  },
  { deep: true, immediate: true },
)

// Track which entries have already been persisted to avoid duplicate saves
const persistedValidations = new Set<string>()
const persistedRoots = new Set<string>()
const persistedAiPanels = new Set<string>()

// Pre-fill sets from existing persisted history AND restore carousel
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
    // Restore carousel from history if it hasn't been populated yet
    if (!carousel.isActive.value && history.length > 0) {
      log.info('[CaptainValidation] Restoring carousel from history', {
        entryCount: history.length,
        keywords: history.map(h => h.keyword),
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
  { immediate: true },
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
        launchAiStream(kw, {
          keyword: entry.validation.keyword,
          articleLevel: entry.validation.articleLevel,
          kpis: entry.validation.kpis,
          verdict: entry.validation.verdict,
        })
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

function carouselEffectiveVerdict(entry: CarouselEntry): VerdictLevel | null {
  return carousel.effectiveVerdict(entry)
}

function carouselVerdictLabel(entry: CarouselEntry): string {
  if (!entry.validation) return ''
  return getVerdictLabel(entry.validation.verdict)
}

const carouselPaaQuestions = computed(() => {
  const paa = carousel.currentEntry.value?.validation?.paaQuestions
  if (!paa) return []
  return paa.filter(p => p.question?.trim())
})

const manualPaaQuestions = computed(() => {
  const paa = currentResult.value?.paaQuestions
  if (!paa) return []
  return paa.filter(p => p.question?.trim())
})

// --- Carousel lock ---
function lockCarouselEntry() {
  const entry = carousel.currentEntry.value
  if (!entry?.validation) return
  const keyword = entry.card.keyword
  lockedKeyword.value = keyword
  isLocked.value = true
  log.info('CaptainValidation — Capitaine verrouillé (carousel)', { keyword })
  if (props.mode !== 'libre') emit('check-completed', 'capitaine_locked')
  emit('validated', keyword)
  const aiMarkdown = carouselAiCache.value.get(keyword) ?? null
  articleKeywordsStore.lockCaptain(keyword, aiMarkdown, props.selectedArticle?.id)
  const rootKeys = entry ? Array.from(entry.rootVariants.keys()) : []
  articleKeywordsStore.setRootKeywords(rootKeys)
  if (props.selectedArticle?.id) articleKeywordsStore.saveKeywords(props.selectedArticle.id)
}

function sendToLieutenants() {
  if (!lockedKeyword.value) return
  const entry = carousel.currentEntry.value
  const rootKeywords = entry ? Array.from(entry.rootVariants.keys()) : []
  emit('send-to-lieutenants', { keyword: lockedKeyword.value, rootKeywords })
  log.info('CaptainValidation — Envoyé aux Lieutenants', { keyword: lockedKeyword.value, rootKeywords })
}

function unlockCarouselEntry() {
  lockedKeyword.value = null
  isLocked.value = false
  log.info('CaptainValidation — Capitaine déverrouillé (carousel)')
  if (props.mode !== 'libre') emit('check-removed', 'capitaine_locked')
}

// --- Interactive words: word-toggle handler ---
function handleWordToggle(activeCount: number) {
  const entry = carousel.currentEntry.value
  if (!entry) return
  const idx = carousel.currentIndex.value
  const words = entry.originalCard.keyword.trim().split(/\s+/)
  const activeKeywordStr = words.slice(0, activeCount).join(' ')

  if (activeCount === words.length) {
    carousel.entries.value[idx] = {
      ...entry,
      card: entry.originalCard,
      validation: entry.validation,
      activeWordCount: words.length,
    }
    return
  }

  const variant = entry.rootVariants.get(activeKeywordStr)
  if (variant) {
    carousel.entries.value[idx] = {
      ...entry,
      card: variant.card,
      validation: variant.validation,
      activeWordCount: activeCount,
    }
  } else {
    log.warn('[CaptainValidation] handleWordToggle — variant not found', { activeKeyword: activeKeywordStr })
  }
}

// --- Root variant switch ---
const currentRootVariants = computed(() => {
  const entry = carousel.currentEntry.value
  if (!entry) return []
  return Array.from(entry.rootVariants.values())
})

const activeVariantKeyword = computed(() => {
  const entry = carousel.currentEntry.value
  if (!entry) return ''
  return entry.card.keyword
})

function switchToVariant(variant: { keyword: string; card: RadarCard; validation: ValidateResponse }) {
  const entry = carousel.currentEntry.value
  if (!entry) return
  const idx = carousel.currentIndex.value
  const variantWords = variant.keyword.trim().split(/\s+/)
  carousel.entries.value[idx] = {
    ...entry,
    card: variant.card,
    validation: variant.validation,
    activeWordCount: variantWords.length,
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

    <!-- ===== CAROUSEL MODE ===== -->
    <div v-if="carousel.isActive.value" class="carousel-section" data-testid="carousel-section">
      <CaptainCarousel
        :current-keyword="carousel.currentEntry.value?.card.keyword ?? ''"
        :current-index="carousel.currentIndex.value"
        :count="carousel.count.value"
        @prev="carousel.prev()"
        @next="carousel.next()"
      />

      <template v-if="carousel.currentEntry.value">
        <div v-if="carousel.currentEntry.value.isLoading" class="captain-loading" data-testid="carousel-loading">
          <div class="captain-loading-spinner" />
          <p>Validation en cours...</p>
        </div>

        <div v-else-if="carousel.currentEntry.value.error" class="captain-error" data-testid="carousel-error">
          <p>Erreur : {{ carousel.currentEntry.value.error }}</p>
        </div>

        <div v-else-if="carousel.currentEntry.value.validation" class="captain-results" data-testid="carousel-results">
          <CaptainVerdictPanel
            :verdict="carouselEffectiveVerdict(carousel.currentEntry.value)"
            :verdict-label="carouselVerdictLabel(carousel.currentEntry.value)"
            :kpis="carousel.currentEntry.value.validation.kpis"
            :from-cache="carousel.currentEntry.value.validation.fromCache"
            :no-go-message="carousel.currentEntry.value.validation.verdict.level === 'NO-GO' ? noGoFeedback(carousel.currentEntry.value.validation.verdict, carousel.currentEntry.value.validation.kpis) : null"
            :article-level="articleLevel"
          >
            <template #root-zone>
              <template v-if="currentRootVariants.length > 0">
                <span class="kpi-root-head">Racines</span>
                <button
                  v-for="variant in currentRootVariants"
                  :key="variant.keyword"
                  class="kpi-root-item"
                  :class="{ 'kpi-root-item--active': variant.keyword === activeVariantKeyword }"
                  @click="switchToVariant(variant)"
                >
                  <span class="kpi-root-kw">{{ variant.keyword }}</span>
                  <span class="kpi-root-verdict" :style="{ color: VERDICT_COLORS[variant.validation.verdict.level] }">
                    {{ variant.validation.verdict.level }}
                  </span>
                </button>
              </template>
              <template v-else-if="carousel.currentEntry.value!.isLoadingRoots">
                <span class="kpi-root-head">Racines</span>
                <span class="kpi-root-loading" />
              </template>
              <span
                v-for="root in carousel.currentEntry.value!.failedRoots"
                :key="'fail-' + root"
                class="kpi-root-failed"
              >
                {{ root }} (échec)
              </span>
            </template>
          </CaptainVerdictPanel>

          <CollapsableSection
            v-if="carouselPaaQuestions.length > 0"
            :title="`Questions associées (${carouselPaaQuestions.length} PAA)`"
            :default-open="false"
          >
            <ul class="paa-list">
              <li v-for="paa in carouselPaaQuestions" :key="paa.question" class="paa-item">
                {{ paa.question }}
              </li>
            </ul>
          </CollapsableSection>

          <CaptainInteractiveWords
            :entry="carousel.currentEntry.value"
            :locked-keyword="lockedKeyword"
            @lock="lockCarouselEntry"
            @unlock="unlockCarouselEntry"
            @word-toggle="handleWordToggle"
          />

          <CaptainAiPanel
            :parsed-html="carouselParsedMarkdown"
            :is-streaming="carouselCurrentAiStreaming"
            :error="carouselCurrentAiError"
          />

          <CaptainLockPanel
            :is-locked="lockedKeyword === carousel.currentEntry.value.card.keyword"
            :can-lock="carouselEffectiveVerdict(carousel.currentEntry.value) === 'GO'"
            :show-send-to-lieutenants="true"
            test-id-prefix="carousel-"
            @lock="lockCarouselEntry"
            @unlock="unlockCarouselEntry"
            @send-to-lieutenants="sendToLieutenants"
          />
        </div>
      </template>
    </div>

    <!-- ===== MANUAL MODE ===== -->
    <div v-if="!carousel.isActive.value" class="manual-mode">
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

        <CaptainVerdictPanel
          :verdict="effectiveVerdict"
          :verdict-label="verdictLabel"
          :kpis="currentResult.kpis"
          :from-cache="currentResult.fromCache"
          :no-go-message="currentResult.verdict.level === 'NO-GO' ? noGoFeedback(currentResult.verdict, currentResult.kpis) : null"
          :article-level="articleLevel"
        >
          <template #root-zone>
            <template v-if="rootResult">
              <span class="kpi-root-head">Racine</span>
              <span class="kpi-root-kw" data-testid="root-analysis">{{ rootResult.keyword }}</span>
              <span class="kpi-root-verdict" :style="{ color: VERDICT_COLORS[rootResult.verdict.level] }">
                {{ rootResult.verdict.level }}
                <small>{{ rootResult.verdict.greenCount }}/{{ rootResult.verdict.totalKpis }}</small>
              </span>
            </template>
            <template v-else-if="isLoadingRoot">
              <span class="kpi-root-head" data-testid="root-loading">Racine</span>
              <span class="kpi-root-loading" />
            </template>
          </template>
        </CaptainVerdictPanel>

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

        <div class="radar-card-section" data-testid="radar-card-section">
          <RadarKeywordCard v-if="radarCard" :card="radarCard" data-testid="captain-radar-card" />
          <div v-else-if="isLoadingRadar" class="radar-loading" data-testid="radar-loading">
            <div class="captain-loading-spinner" />
            <p>Chargement de la fiche Radar...</p>
          </div>
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

        <CaptainAiPanel
          :parsed-html="parsedMarkdown"
          :is-streaming="aiIsStreaming"
          :error="aiError"
        />

        <CaptainLockPanel
          :is-locked="isLocked"
          :can-lock="effectiveVerdict === 'GO'"
          @lock="lockCaptaine"
          @unlock="unlockCaptaine"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.captain-validation {
  padding: 1rem 0;
}

.carousel-section {
  margin-bottom: 1rem;
  overflow-anchor: none;
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
</style>
