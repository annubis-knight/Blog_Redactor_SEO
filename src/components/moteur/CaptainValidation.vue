<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import { useCapitaineValidation, articleTypeToLevel, FRENCH_STOPWORDS } from '@/composables/useCapitaineValidation'
import { useCompositionCheck } from '@/composables/useCompositionCheck'
import { useRadarCarousel } from '@/composables/useRadarCarousel'
import type { CarouselEntry } from '@/composables/useRadarCarousel'
import { useStreaming } from '@/composables/useStreaming'
import { VERDICT_COLORS, KPI_COLORS } from '@/composables/useVerdictColors'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { log } from '@/utils/logger'
import VerdictThermometer from '@/components/moteur/VerdictThermometer.vue'
import RadarKeywordCard from '@/components/intent/RadarKeywordCard.vue'
import RadarCardLockable from '@/components/intent/RadarCardLockable.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
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

// --- Keyword input (unified: replaces both activeKeyword display and alt input) ---
const keywordInput = ref('')

// --- Composition check (advisory) ---
const { warnings: compositionWarnings, allPass: compositionAllPass } = useCompositionCheck(keywordInput, articleLevel)

// --- Lock/unlock Capitaine ---
const isLocked = ref(props.initialLocked)

function handleValidate() {
  const kw = keywordInput.value.trim()
  if (!kw) return
  log.info('CaptainValidation — validation', { keyword: kw, level: articleLevel.value })
  carousel.addEntry(kw, articleLevel.value, props.selectedArticle?.title)
}

// Change 1: Populate input instead of auto-validating
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

// Change 8: Pre-fill from persisted capitaine keyword
watch(
  () => articleKeywordsStore.keywords?.capitaine,
  (persisted) => {
    if (!persisted) return
    keywordInput.value = persisted
    log.debug('CaptainValidation — restauré depuis store', { keyword: persisted })
    // If article has a locked capitaine with a different keyword than what's in carousel, re-validate
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

// --- KPI display helpers ---
const KPI_LABELS: Record<string, string> = {
  volume: 'Vol.',
  kd: 'KD',
  cpc: 'CPC',
  paa: 'PAA',
  intent: 'Intent',
  autocomplete: 'Auto.',
}

function kpiDisplayName(name: string): string {
  return KPI_LABELS[name] ?? name
}

function tooltipText(kpi: KpiResult): string {
  const levelLabel = articleLevel.value
  const g = kpi.thresholds.green
  const o = kpi.thresholds.orange

  if (kpi.name === 'cpc') return `CPC — ${levelLabel} : BONUS >${g}\u20ac, sinon NEUTRE`
  if (kpi.name === 'intent') return `Intent — ${levelLabel} : VERT = match, ORANGE = mixed, ROUGE = mismatch`
  if (kpi.name === 'kd') return `Difficulté — ${levelLabel} : VERT <${g}, ORANGE ${g}-${o}, ROUGE >${o}`
  if (kpi.name === 'autocomplete') return `Autocomplete — ${levelLabel} : VERT pos \u2264${g}, ORANGE pos \u2264${o}, ROUGE au-delà`
  if (o != null) return `${kpiDisplayName(kpi.name)} — ${levelLabel} : VERT >${g}, ORANGE ${o}-${g - 1}, ROUGE <${o}`
  return `${kpiDisplayName(kpi.name)} — ${levelLabel} : VERT >${g}`
}

// --- NO-GO feedback ---
function noGoFeedback(verdict: ValidateVerdict, kpis: KpiResult[]): string {
  if (verdict.autoNoGo) return 'Aucun signal détecté — ce mot-clé n\'existe pas dans les données.'
  const volume = kpis.find(k => k.name === 'volume')
  const kd = kpis.find(k => k.name === 'kd')
  const paa = kpis.find(k => k.name === 'paa')
  if (volume?.color === 'red' && kd?.color === 'red') return 'KPIs faibles — volume et difficulté défavorables.'
  if (paa?.color === 'red' && volume?.color === 'red') return 'Hors sujet — pas de PAA ni de volume suffisant.'
  return 'KPIs insuffisants pour valider ce mot-clé.'
}

// --- Hover tooltip state ---
const hoveredKpi = ref<string | null>(null)

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

// --- AI Panel (streaming) ---
const { chunks: aiChunks, isStreaming: aiIsStreaming, error: aiError, startStream: aiStartStream, abort: aiAbort } = useStreaming()
const aiPanelOpen = ref(true)

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

// Change 8: Persist capitaine keyword on lock
function lockCaptaine() {
  isLocked.value = true
  const keyword = currentResult.value?.keyword
  log.info('CaptainValidation — Capitaine verrouillé', { keyword, verdict: effectiveVerdict.value })
  if (props.mode !== 'libre') {
    emit('check-completed', 'capitaine_locked')
  }
  if (keyword) {
    emit('validated', keyword)
    // Persist to store
    articleKeywordsStore.setCapitaine(keyword)
    if (props.selectedArticle?.slug) {
      articleKeywordsStore.saveKeywords(props.selectedArticle.slug)
    }
  }
}

function unlockCaptaine() {
  isLocked.value = false
  log.info('CaptainValidation — Capitaine déverrouillé')
  if (props.mode !== 'libre') {
    emit('check-removed', 'capitaine_locked')
  }
}

// --- History chip verdict color ---
function chipVerdictColor(entry: { verdict: { level: VerdictLevel } }): string {
  return VERDICT_COLORS[entry.verdict.level]
}

// --- Handle suggested keyword click ---
function handleSuggestedClick(kw: string) {
  keywordInput.value = kw
  validateKeyword(kw, articleLevel.value, props.selectedArticle?.title)
}

// --- Handle history chip click ---
function handleHistoryClick(index: number) {
  navigateHistory(index)
  if (history.value[index]) {
    keywordInput.value = history.value[index].keyword
  }
}

// ===== CAROUSEL (radar cards from Radar tab) =====
const carousel = useRadarCarousel()
const lockedKeyword = ref<string | null>(null)

// Auto-validate suggested keyword (or article keyword) when article is selected
let lastAutoValidatedSlug: string | null = null
watch(
  () => props.selectedArticle?.slug,
  (slug, oldSlug) => {
    // Reset carousel + AI state when switching to a different article
    if (oldSlug && slug !== oldSlug) {
      carousel.reset()
      lockedKeyword.value = null
      lastAutoValidatedSlug = null
      abortAllAiStreams()
      carouselAiCache.value = new Map()
      carouselAiErrors.value = new Map()
    }
    if (!slug || slug === lastAutoValidatedSlug) return
    const article = props.selectedArticle
    if (!article) return
    const suggestions = props.suggestedKeywords
    const kw = (suggestions && suggestions.length > 0) ? suggestions[0] : article.keyword
    if (!kw) return
    lastAutoValidatedSlug = slug
    keywordInput.value = kw
    carousel.addEntry(kw, articleLevel.value, article.title)
    // Restore locked state if article already has a validated capitaine
    if (isLocked.value) {
      lockedKeyword.value = kw
    }
  },
  { immediate: true },
)

// AI panel — per-keyword independent streams (no shared useStreaming)
const carouselAiCache = ref(new Map<string, string>())       // keyword → final markdown
const carouselAiStreaming = ref(new Set<string>())            // keywords currently streaming
const carouselAiErrors = ref(new Map<string, string>())       // keyword → error message
const carouselAiAbortMap = new Map<string, AbortController>() // keyword → abort (non-reactive)
const carouselAiPanelOpen = ref(true)

/** Trigger reactivity on Maps/Sets by replacing the ref value */
function touchAiCache() { carouselAiCache.value = new Map(carouselAiCache.value) }
function touchAiStreaming() { carouselAiStreaming.value = new Set(carouselAiStreaming.value) }
function touchAiErrors() { carouselAiErrors.value = new Map(carouselAiErrors.value) }

/** Launch an independent SSE stream for a keyword — writes directly into the cache */
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
                // Write progressive chunks into cache for live rendering
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
      // Ensure final accumulated text is in cache
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

// Watch radarCards prop → load carousel
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

// Watch each entry's validation → launch AI stream as soon as validation is ready
watch(
  () => carousel.entries.value.map(e => e.validation),
  () => {
    for (const entry of carousel.entries.value) {
      if (entry.validation && !carouselAiCache.value.has(entry.card.keyword) && !carouselAiStreaming.value.has(entry.card.keyword)) {
        launchAiStream(entry.card.keyword, {
          keyword: entry.validation.keyword,
          articleLevel: entry.validation.articleLevel,
          kpis: entry.validation.kpis,
          verdict: entry.validation.verdict,
        })
      }
    }
  },
  { deep: true },
)

// Carousel verdict helpers
function carouselEffectiveVerdict(entry: CarouselEntry): VerdictLevel | null {
  return carousel.effectiveVerdict(entry)
}

function carouselVerdictLabel(entry: CarouselEntry): string {
  if (!entry.validation) return ''
  return getVerdictLabel(entry.validation.verdict)
}

// Filtered PAA questions (exclude empty entries)
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

// Carousel lock
function lockCarouselEntry() {
  const entry = carousel.currentEntry.value
  if (!entry?.validation) return
  const keyword = entry.card.keyword
  lockedKeyword.value = keyword
  isLocked.value = true
  log.info('CaptainValidation — Capitaine verrouillé (carousel)', { keyword })
  if (props.mode !== 'libre') {
    emit('check-completed', 'capitaine_locked')
  }
  emit('validated', keyword)
  articleKeywordsStore.setCapitaine(keyword)
  const rootKeys = entry ? Array.from(entry.rootVariants.keys()) : []
  articleKeywordsStore.setRootKeywords(rootKeys)
  if (props.selectedArticle?.slug) {
    articleKeywordsStore.saveKeywords(props.selectedArticle.slug)
  }
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
  if (props.mode !== 'libre') {
    emit('check-removed', 'capitaine_locked')
  }
}

// --- Interactive keyword words (root variant swap) ---
const currentWords = computed(() => {
  const entry = carousel.currentEntry.value
  if (!entry) return []
  return entry.originalCard.keyword.trim().split(/\s+/)
})

const minActiveCount = computed(() => {
  const words = currentWords.value
  let count = 0
  let significant = 0
  for (const w of words) {
    count++
    if (!FRENCH_STOPWORDS.has(w.toLowerCase())) significant++
    if (significant >= 2) return count
  }
  return words.length // fallback: all words are core
})

const interactiveWordsProps = computed(() => {
  const entry = carousel.currentEntry.value
  if (!entry || (entry.rootVariants.size === 0 && !entry.isLoadingRoots)) return undefined
  return {
    words: currentWords.value,
    activeCount: entry.activeWordCount,
    minActiveCount: minActiveCount.value,
    loading: entry.isLoadingRoots,
  }
})

function handleWordToggle(activeCount: number) {
  const entry = carousel.currentEntry.value
  if (!entry) return
  const idx = carousel.currentIndex.value

  const words = currentWords.value
  const activeKeyword = words.slice(0, activeCount).join(' ')

  if (activeCount === words.length) {
    // Reset to original card
    carousel.entries.value[idx] = {
      ...entry,
      card: entry.originalCard,
      validation: entry.validation,
      activeWordCount: words.length,
    }
    return
  }

  const variant = entry.rootVariants.get(activeKeyword)
  if (variant) {
    carousel.entries.value[idx] = {
      ...entry,
      card: variant.card,
      validation: variant.validation,
      activeWordCount: activeCount,
    }
  } else {
    log.warn('[CaptainValidation] handleWordToggle — variant not found', { activeKeyword })
  }
}

// Computed for root zone dropdown
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
    <!-- Keyword input -->
    <div class="keyword-input" data-testid="keyword-input">
      <input v-model="keywordInput" type="text" class="keyword-input-field" placeholder="Mot-clé capitaine à valider..."
        @keyup.enter="handleValidate" />
      <button class="keyword-input-btn" :disabled="!keywordInput.trim() || isLoading" @click="handleValidate">
        Valider
      </button>
    </div>

    <!-- Composition warnings (advisory — never blocks GO/NO-GO) -->
    <div v-if="keywordInput.trim().length >= 2 && compositionWarnings.length > 0" class="composition-warnings"
      data-testid="composition-warnings">
      <div v-for="warning in compositionWarnings" :key="warning.rule" class="composition-warning">
        <span class="composition-icon">&#9888;</span>
        <span class="composition-msg">{{ warning.message }}</span>
      </div>
    </div>
    <div v-else-if="keywordInput.trim().length >= 2 && compositionAllPass" class="composition-ok"
      data-testid="composition-ok">
      <span class="composition-icon">&#10003;</span>
      <span class="composition-msg">Composition conforme pour un {{ articleLevel === 'pilier' ? 'Pilier' : articleLevel
        === 'intermediaire' ? 'Intermédiaire' : 'Spécialisé' }}</span>
    </div>

    <!-- ===== CAROUSEL MODE (radar cards from Radar tab) ===== -->
    <div v-if="carousel.isActive.value" class="carousel-section" data-testid="carousel-section">
      <!-- Navigation header -->
      <div class="carousel-nav" data-testid="carousel-nav">
        <button type="button" class="carousel-arrow" :disabled="carousel.currentIndex.value === 0"
          data-testid="carousel-prev" @click.prevent="carousel.prev()">
          &larr;
        </button>
        <div class="carousel-info">
          <span class="carousel-keyword">{{ carousel.currentEntry.value?.card.keyword }}</span>
          <span class="carousel-counter">({{ carousel.currentIndex.value + 1 }}/{{ carousel.count.value }})</span>
        </div>
        <button type="button" class="carousel-arrow"
          :disabled="carousel.currentIndex.value === carousel.count.value - 1" data-testid="carousel-next"
          @click.prevent="carousel.next()">
          &rarr;
        </button>
      </div>

      <!-- Current entry content -->
      <template v-if="carousel.currentEntry.value">
        <!-- Loading -->
        <div v-if="carousel.currentEntry.value.isLoading" class="captain-loading" data-testid="carousel-loading">
          <div class="captain-loading-spinner" />
          <p>Validation en cours...</p>
        </div>

        <!-- Error -->
        <div v-else-if="carousel.currentEntry.value.error" class="captain-error" data-testid="carousel-error">
          <p>Erreur : {{ carousel.currentEntry.value.error }}</p>
        </div>

        <!-- Validation results -->
        <div v-else-if="carousel.currentEntry.value.validation" class="captain-results" data-testid="carousel-results">
          <!-- Verdict thermometer -->
          <VerdictThermometer v-if="carouselEffectiveVerdict(carousel.currentEntry.value)"
            :verdict="carouselEffectiveVerdict(carousel.currentEntry.value)!"
            :verdict-label="carouselVerdictLabel(carousel.currentEntry.value)"
            :kpis="carousel.currentEntry.value.validation.kpis"
            :from-cache="carousel.currentEntry.value.validation.fromCache" />

          <!-- NO-GO feedback -->
          <div
            v-if="carousel.currentEntry.value.validation.verdict.level === 'NO-GO'"
            class="nogo-feedback">
            <p>{{ noGoFeedback(carousel.currentEntry.value.validation.verdict,
              carousel.currentEntry.value.validation.kpis) }}</p>
          </div>

          <!-- KPI row -->
          <div class="kpi-row" data-testid="carousel-kpi-list">
            <div class="kpi-grid">
              <div v-for="kpi in carousel.currentEntry.value.validation.kpis" :key="kpi.name" class="kpi-cell"
                @mouseenter="hoveredKpi = kpi.name" @mouseleave="hoveredKpi = null">
                <span class="kpi-label">{{ kpiDisplayName(kpi.name) }}</span>
                <span class="kpi-value" :style="{ color: KPI_COLORS[kpi.color] }">{{ kpi.label }}</span>
                <div v-if="hoveredKpi === kpi.name" class="kpi-tooltip">
                  {{ tooltipText(kpi) }}
                </div>
              </div>
            </div>
            <div class="kpi-root-zone">
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
                  <span class="kpi-root-verdict"
                    :style="{ color: VERDICT_COLORS[variant.validation.verdict.level] }">
                    {{ variant.validation.verdict.level }}
                  </span>
                </button>
              </template>
              <template v-else-if="carousel.currentEntry.value.isLoadingRoots">
                <span class="kpi-root-head">Racines</span>
                <span class="kpi-root-loading" />
              </template>
              <span
                v-for="root in carousel.currentEntry.value.failedRoots"
                :key="'fail-' + root"
                class="kpi-root-failed"
              >
                {{ root }} (échec)
              </span>
            </div>
          </div>

          <!-- PAA questions -->
          <CollapsableSection v-if="carouselPaaQuestions.length > 0"
            :title="`Questions associées (${carouselPaaQuestions.length} PAA)`" :default-open="false">
            <ul class="paa-list">
              <li v-for="paa in carouselPaaQuestions" :key="paa.question" class="paa-item">
                {{ paa.question }}
              </li>
            </ul>
          </CollapsableSection>

          <!-- Radar card with lock toggle + interactive words -->
          <div class="radar-card-section">
            <RadarCardLockable :card="carousel.currentEntry.value.card"
              :locked="carousel.currentEntry.value.card.keyword === lockedKeyword"
              :interactive-words="interactiveWordsProps"
              data-testid="carousel-radar-lockable"
              @update:locked="(val: boolean) => val ? lockCarouselEntry() : unlockCarouselEntry()"
              @word-toggle="handleWordToggle" />
          </div>

          <!-- AI Panel (carousel) -->
          <div class="ai-panel" data-testid="carousel-ai-panel">
            <button class="ai-panel-toggle" @click="carouselAiPanelOpen = !carouselAiPanelOpen">
              <span class="ai-panel-toggle-icon">{{ carouselAiPanelOpen ? '\u25BC' : '\u25B6' }}</span>
              Avis expert IA
              <span v-if="carouselCurrentAiStreaming" class="ai-panel-streaming-dot" />
            </button>
            <div v-if="carouselAiPanelOpen" class="ai-panel-content">
              <div v-if="carouselCurrentAiStreaming && !carouselParsedMarkdown" class="ai-panel-loading">
                Analyse en cours...
              </div>
              <div v-else-if="carouselCurrentAiError" class="ai-panel-error">
                {{ carouselCurrentAiError }}
              </div>
              <div v-else-if="carouselParsedMarkdown" class="ai-panel-text ai-markdown"
                v-html="carouselParsedMarkdown" />
              <div v-else class="ai-panel-empty">
                En attente des résultats de validation...
              </div>
            </div>
          </div>

          <!-- Lock/Unlock -->
          <div class="captain-lock" data-testid="carousel-lock">
            <button v-if="lockedKeyword !== carousel.currentEntry.value.card.keyword" class="lock-btn"
              data-testid="carousel-lock-btn" :disabled="carouselEffectiveVerdict(carousel.currentEntry.value) !== 'GO'"
              @click="lockCarouselEntry">
              Valider ce Capitaine
            </button>
            <div v-else class="locked-state" data-testid="carousel-locked-state">
              <span class="locked-badge">Capitaine verrouillé</span>
              <button class="send-lieutenant-btn" data-testid="send-to-lieutenants-btn" @click="sendToLieutenants">
                Envoyer aux Lieutenants &rarr;
              </button>
              <button class="unlock-btn" data-testid="carousel-unlock-btn" @click="unlockCarouselEntry">
                Déverrouiller
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== MANUAL MODE (keyword input validation) ===== -->
    <div v-if="!carousel.isActive.value" class="manual-mode">
      <!-- History carousel (Change 2) -->
      <div v-if="history.length > 1" class="history-carousel" data-testid="history-carousel">
        <span class="history-label">Historique ({{ history.length }})</span>
        <div class="history-chips">
          <button v-for="(entry, idx) in history" :key="`${entry.keyword}-${idx}`" class="history-chip"
            :class="{ 'history-chip--active': idx === historyIndex }" :style="{ borderColor: chipVerdictColor(entry) }"
            @click="handleHistoryClick(idx)">
            <span class="history-chip-verdict" :style="{ color: chipVerdictColor(entry) }">
              {{ entry.verdict.level }}
            </span>
            <span class="history-chip-keyword">{{ entry.keyword }}</span>
          </button>
        </div>
      </div>

      <!-- Empty state: no article selected -->
      <div v-if="!keywordInput && !isLoading && history.length === 0" class="captain-empty" data-testid="captain-empty">
        <p class="captain-empty-text">Sélectionnez un article avec un mot-clé pour lancer la validation Capitaine.</p>
      </div>

      <!-- Loading state -->
      <div v-else-if="isLoading" class="captain-loading" data-testid="captain-loading">
        <div class="captain-loading-spinner" />
        <p>Validation en cours...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="captain-error" data-testid="captain-error">
        <p>Erreur : {{ error }}</p>
      </div>

      <!-- Results -->
      <div v-else-if="currentResult" class="captain-results" data-testid="captain-results">
        <!-- Thresholds reference (Change 3c) -->
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
                  <td :class="{ 'td-active': articleLevel === 'intermediaire' }">{{ thresholdCell(row.key,
                    'intermediaire')
                  }}</td>
                  <td :class="{ 'td-active': articleLevel === 'specifique' }">{{ thresholdCell(row.key, 'specifique') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsableSection>

        <!-- Verdict thermometer (Change 3a) -->
        <VerdictThermometer v-if="effectiveVerdict" :verdict="effectiveVerdict" :verdict-label="verdictLabel"
          :kpis="currentResult.kpis" :from-cache="currentResult.fromCache" />

        <!-- NO-GO feedback -->
        <div v-if="currentResult.verdict.level === 'NO-GO'" class="nogo-feedback"
          data-testid="nogo-feedback">
          <p>{{ noGoFeedback(currentResult.verdict, currentResult.kpis) }}</p>
        </div>

        <!-- KPI row (Change 3b) -->
        <div class="kpi-row" data-testid="kpi-list">
          <div class="kpi-grid">
            <div v-for="kpi in currentResult.kpis" :key="kpi.name" class="kpi-cell" :data-testid="`kpi-${kpi.name}`"
              @mouseenter="hoveredKpi = kpi.name" @mouseleave="hoveredKpi = null">
              <span class="kpi-label">{{ kpiDisplayName(kpi.name) }}</span>
              <span class="kpi-value" :style="{ color: KPI_COLORS[kpi.color] }">{{ kpi.label }}</span>
              <div v-if="hoveredKpi === kpi.name" class="kpi-tooltip" :data-testid="`tooltip-${kpi.name}`">
                {{ tooltipText(kpi) }}
              </div>
            </div>
          </div>
          <div class="kpi-root-zone">
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
          </div>
        </div>

        <!-- PAA questions (Change 3c) -->
        <CollapsableSection v-if="manualPaaQuestions.length > 0"
          :title="`Questions associées (${manualPaaQuestions.length} PAA)`" :default-open="false">
          <ul class="paa-list" data-testid="paa-list">
            <li v-for="paa in manualPaaQuestions" :key="paa.question" class="paa-item">
              {{ paa.question }}
            </li>
          </ul>
        </CollapsableSection>

        <!-- Radar card (parallel fetch) -->
        <div class="radar-card-section" data-testid="radar-card-section">
          <RadarKeywordCard v-if="radarCard" :card="radarCard" data-testid="captain-radar-card" />
          <div v-else-if="isLoadingRadar" class="radar-loading" data-testid="radar-loading">
            <div class="captain-loading-spinner" />
            <p>Chargement de la fiche Radar...</p>
          </div>
        </div>

        <!-- Suggested keywords collapse (Change 5) -->
        <CollapsableSection v-if="suggestedKeywords.length > 0" title="Mots-clés suggérés" :default-open="true">
          <div class="suggested-chips" data-testid="suggested-keywords">
            <button v-for="sk in suggestedKeywords" :key="sk" class="suggested-chip" @click="handleSuggestedClick(sk)">
              {{ sk }}
            </button>
          </div>
        </CollapsableSection>

        <!-- Article level info -->
        <p class="level-info">
          Niveau : <strong>{{ currentResult.articleLevel }}</strong>
          <span v-if="currentResult.fromCache"> — résultat en cache</span>
        </p>

        <!-- AI Expert Panel (Change 7: markdown rendering) -->
        <div class="ai-panel" data-testid="ai-panel">
          <button class="ai-panel-toggle" data-testid="ai-panel-toggle" @click="aiPanelOpen = !aiPanelOpen">
            <span class="ai-panel-toggle-icon">{{ aiPanelOpen ? '\u25BC' : '\u25B6' }}</span>
            Avis expert IA
            <span v-if="aiIsStreaming" class="ai-panel-streaming-dot" />
          </button>
          <div v-if="aiPanelOpen" class="ai-panel-content" data-testid="ai-panel-content">
            <div v-if="aiIsStreaming && !aiChunks" class="ai-panel-loading">
              Analyse en cours...
            </div>
            <div v-else-if="aiError" class="ai-panel-error">
              {{ aiError }}
            </div>
            <div v-else-if="aiChunks" class="ai-panel-text ai-markdown" data-testid="ai-panel-text"
              v-html="parsedMarkdown" />
            <div v-else class="ai-panel-empty">
              En attente des résultats de validation...
            </div>
          </div>
        </div>

        <!-- Lock/Unlock Capitaine -->
        <div class="captain-lock" data-testid="captain-lock">
          <button v-if="!isLocked" class="lock-btn" data-testid="lock-btn" :disabled="effectiveVerdict !== 'GO'"
            @click="lockCaptaine">
            Valider ce Capitaine
          </button>
          <div v-else class="locked-state" data-testid="locked-state">
            <span class="locked-badge">Capitaine verrouillé</span>
            <button class="unlock-btn" data-testid="unlock-btn" @click="unlockCaptaine">
              Déverrouiller
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.captain-validation {
  padding: 1rem 0;
}

/* Keyword input */
.keyword-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.keyword-input-field {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
}

.keyword-input-btn {
  padding: 0.5rem 1rem;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.keyword-input-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* History carousel */
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
  to {
    transform: rotate(360deg);
  }
}

.captain-error {
  color: var(--color-error, #ef4444);
}

/* NO-GO feedback */
.nogo-feedback {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg, #fef2f2);
  border-radius: 8px;
  color: var(--color-error, #ef4444);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* KPI row — compact inline flex with root zone */
.kpi-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  margin-bottom: 0.75rem;
  height: 70px;
  background: var(--color-surface, #f8fafc);
  border-radius: 6px;
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.kpi-grid {
  display: flex;
  flex: 1;
  min-width: 0;
  max-width: 700px;
}

.kpi-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  position: relative;
  padding: 0.375rem 0.125rem;
  border-right: 1px solid var(--color-border-light, #f1f5f9);
}

.kpi-cell:last-child {
  border-right: none;
}

.kpi-label {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #94a3b8);
  white-space: nowrap;
}

.kpi-value {
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: center;
}

.kpi-tooltip {
  position: absolute;
  top: -2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-text, #1e293b);
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}

/* Root zone — fixed right slot */
.kpi-root-zone {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  width: 200px;
  max-height: 70px;
  overflow-y: auto;
  flex-shrink: 0;
  padding: 0.25rem 0.375rem;
  border-left: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface-dim, #f1f5f9);
  gap: 2px;
}

.kpi-root-head {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #94a3b8);
  text-align: center;
}

.kpi-root-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 2px 6px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 0.625rem;
  transition: background 0.1s;
}

.kpi-root-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.kpi-root-item--active {
  background: rgba(0, 0, 0, 0.08);
  font-weight: 600;
}

.kpi-root-kw {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.kpi-root-verdict {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  flex-shrink: 0;
}

.kpi-root-verdict small {
  font-size: 0.5rem;
  font-weight: 500;
  opacity: 0.7;
}

.kpi-root-loading {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.kpi-root-failed {
  font-size: 0.625rem;
  color: var(--color-text-muted, #94a3b8);
  font-style: italic;
  opacity: 0.6;
  padding: 0.125rem 0.375rem;
}

/* PAA list */
.paa-list {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

.paa-item {
  font-size: 0.8125rem;
  color: var(--color-text, #1e293b);
  margin-bottom: 0.25rem;
}

/* Radar card section */
.radar-card-section {
  margin-top: 1.25rem;
}

.radar-loading {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-muted, #64748b);
  font-size: 0.8125rem;
}

/* Suggested keywords */
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

/* Thresholds table */
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

/* Level info */
.level-info {
  margin-top: 1.25rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

/* AI Panel */
.ai-panel {
  margin-top: 1.25rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.ai-panel-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-surface, #f8fafc);
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  cursor: pointer;
  text-align: left;
}

.ai-panel-toggle-icon {
  font-size: 0.625rem;
  color: var(--color-text-muted, #64748b);
}

.ai-panel-streaming-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary, #3b82f6);
  animation: pulse 1s ease infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 1;
  }
}

.ai-panel-content {
  padding: 1rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.ai-panel-loading,
.ai-panel-empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  font-style: italic;
}

.ai-panel-error {
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

/* AI markdown styles */
.ai-markdown {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-text, #1e293b);
}

.ai-markdown :deep(h1),
.ai-markdown :deep(h2),
.ai-markdown :deep(h3) {
  margin: 0.75rem 0 0.375rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-heading, #0f172a);
}

.ai-markdown :deep(h3) {
  font-size: 0.875rem;
}

.ai-markdown :deep(p) {
  margin: 0.375rem 0;
}

.ai-markdown :deep(ul),
.ai-markdown :deep(ol) {
  margin: 0.375rem 0;
  padding-left: 1.25rem;
}

.ai-markdown :deep(li) {
  margin-bottom: 0.25rem;
}

.ai-markdown :deep(code) {
  background: var(--color-bg-hover, #f1f5f9);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-size: 0.75rem;
}

.ai-markdown :deep(strong) {
  font-weight: 700;
}

/* Lock/Unlock */
.captain-lock {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lock-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-success, #22c55e);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.lock-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locked-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success, #22c55e);
}

.send-lieutenant-btn {
  padding: 0.375rem 0.75rem;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.send-lieutenant-btn:hover {
  background: var(--color-primary-hover);
}

.unlock-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
}

.unlock-btn:hover {
  border-color: var(--color-warning, #f59e0b);
  color: var(--color-warning, #f59e0b);
}

/* Carousel section */
.carousel-section {
  margin-bottom: 1rem;
  overflow-anchor: none;
}

.carousel-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.carousel-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: #fff;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-text, #1e293b);
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.carousel-arrow:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
}

.carousel-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.carousel-info {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.carousel-keyword {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text, #1e293b);
}

.carousel-counter {
  margin-left: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

/* --- Composition warnings (advisory) --- */
.composition-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.composition-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.1));
  color: var(--color-badge-amber-text, #d97706);
  line-height: 1.4;
}

.composition-ok {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  background: var(--color-badge-green-bg, rgba(34, 197, 94, 0.1));
  color: var(--color-badge-green-text, #16a34a);
}

.composition-icon {
  flex-shrink: 0;
  font-size: 0.8125rem;
}

.composition-msg {
  flex: 1;
}
</style>
