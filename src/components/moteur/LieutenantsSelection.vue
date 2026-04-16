<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { apiPost, apiPut } from '@/services/api.service'
import { hnToOutline } from '@/stores/article/outline.store'
import { useStreaming } from '@/composables/editor/useStreaming'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { extractRoots } from '@/composables/keyword/useCapitaineValidation'
import { log } from '@/utils/logger'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import LieutenantSerpAnalysis from '@/components/moteur/LieutenantSerpAnalysis.vue'
import LieutenantH2Structure from '@/components/moteur/LieutenantH2Structure.vue'
import LieutenantProposals from '@/components/moteur/LieutenantProposals.vue'
import type { SelectedArticle, SerpAnalysisResult, SerpCompetitor, PaaQuestion } from '@shared/types/index.js'
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

// Debounced save: coalesces rafales de mutations (auto-save propositions IA + saveHn)
// avec garde anti-cross-article. Cohérent avec CaptainValidation pour éviter le spam EPERM.
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

onBeforeUnmount(() => {
  if (saveRequested) {
    saveRequested = false
    persistIfOwned()
  }
})

// --- SERP State (Phase 1) ---
const sliderValue = ref(10)
const isLoading = ref(false)
const error = ref<string | null>(null)
const serpResult = ref<SerpAnalysisResult | null>(null)

/** Individual SERP results keyed by keyword — preserves per-keyword data for display */
const serpResultsByKeyword = ref<Map<string, SerpAnalysisResult>>(new Map())

/** SERP progress tracking: "2 / 4" */
const serpDoneCount = ref(0)
const serpTotalCount = ref(0)

/** Active tab for per-keyword competitor URLs */
const activeSerpTab = ref<string>('')
const activeSerpTabResult = computed(() => {
  if (!activeSerpTab.value) return null
  return serpResultsByKeyword.value.get(activeSerpTab.value) ?? null
})

/** Active tab for Structure Hn concurrents — '__all__' = merged view */
const activeHnTab = ref<string>('__all__')

const displayedCompetitors = computed(() => {
  if (!serpResult.value) return []
  return serpResult.value.competitors.slice(0, sliderValue.value)
})

/** Compute Hn recurrence from a list of competitors */
function computeHnRecurrenceFrom(comps: SerpCompetitor[]): HnRecurrenceItem[] {
  const valid = comps.filter(c => !c.fetchError)
  const total = valid.length
  if (total === 0) return []

  const freqMap = new Map<string, { level: number; text: string; count: number }>()

  for (const comp of valid) {
    const seen = new Set<string>()
    for (const h of comp.headings) {
      const key = `${h.level}:${h.text.toLowerCase().trim()}`
      if (seen.has(key)) continue
      seen.add(key)

      const existing = freqMap.get(key)
      if (existing) {
        existing.count++
      } else {
        freqMap.set(key, { level: h.level, text: h.text, count: 1 })
      }
    }
  }

  return Array.from(freqMap.values())
    .map(item => ({ ...item, total, percent: Math.round(item.count / total * 100) }))
    .sort((a, b) => b.percent - a.percent || a.level - b.level)
}

const hnRecurrence = computed<HnRecurrenceItem[]>(() => {
  return computeHnRecurrenceFrom(displayedCompetitors.value)
})

/** Hn recurrence for the active tab — '__all__' uses merged data, otherwise per-keyword */
const activeHnRecurrence = computed<HnRecurrenceItem[]>(() => {
  if (activeHnTab.value === '__all__') return hnRecurrence.value
  const result = serpResultsByKeyword.value.get(activeHnTab.value)
  if (!result) return []
  return computeHnRecurrenceFrom(result.competitors)
})

const canAnalyze = computed(() =>
  props.isCaptaineLocked && !!props.captainKeyword && !isLoading.value,
)

/** Root keywords: use props if available, else generate from captain keyword */
const resolvedRootKeywords = computed(() => {
  if (props.rootKeywords.length > 0) return props.rootKeywords
  if (!props.captainKeyword) return []
  return extractRoots(props.captainKeyword).slice(0, 5)
})

// --- IA Proposal State (Phase 2 — NOUVEAU) ---
const { chunks: iaChunks, isStreaming: iaIsStreaming, error: iaError, result: iaResult, startStream: iaStartStream, abort: iaAbort } = useStreaming<FilteredProposeLieutenantsResult>()
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
  await articleKeywordsStore.saveKeywords(id)
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
  await articleKeywordsStore.saveKeywords(id)
  // Save outline directly to articles/{id}.json (single source of truth)
  if (hnStructure.value.length > 0) {
    const outline = hnToOutline(hnStructure.value, title)
    await apiPut(`/articles/${id}`, { outline })
  }
  isLocked.value = true
  emit('check-completed', 'lieutenants_locked')
  emit('lieutenants-updated', Array.from(selectedCards.value.keys()))
}

function unlockLieutenants() {
  isLocked.value = false
  emit('check-removed', 'lieutenants_locked')
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

// --- Auto-trigger SERP when captain is locked (skip if lieutenants already locked) ---
watch(
  [() => props.isCaptaineLocked, () => props.captainKeyword],
  ([locked, keyword]) => {
    if (locked && keyword && !serpResult.value && !isLoading.value && !isLocked.value) {
      log.info('[LieutenantsSelection] Auto-triggering SERP analysis')
      analyzeSERP()
    }
  },
  { immediate: true, flush: 'post' },
)

// --- Auto-trigger IA proposal after SERP success (skip if lieutenants already locked) ---
watch(serpResult, (result) => {
  if (result && !iaIsStreaming.value && lieutenantCards.value.length === 0 && !isLocked.value) {
    log.info('[LieutenantsSelection] Auto-triggering IA proposal after SERP')
    proposeLieutenants()
  }
})

function refreshSERP() {
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
  analyzeSERP()
}

/** Merge multiple SerpAnalysisResult — dedup competitors by URL, PAA by question */
function mergeSerpResults(results: SerpAnalysisResult[]): SerpAnalysisResult {
  if (results.length === 1) return results[0]!

  const base = results[0]!
  const seenUrls = new Set<string>()
  const mergedCompetitors: SerpCompetitor[] = []
  const seenPaa = new Set<string>()
  const mergedPaa: PaaQuestion[] = []

  for (const r of results) {
    for (const c of r.competitors) {
      if (!seenUrls.has(c.url)) {
        seenUrls.add(c.url)
        mergedCompetitors.push(c)
      }
    }
    for (const p of r.paaQuestions) {
      const key = p.question.toLowerCase().trim()
      if (!seenPaa.has(key)) {
        seenPaa.add(key)
        mergedPaa.push(p)
      }
    }
  }

  return {
    ...base,
    competitors: mergedCompetitors,
    paaQuestions: mergedPaa,
    maxScraped: mergedCompetitors.length,
  }
}

async function analyzeSERP() {
  if (!props.captainKeyword || !canAnalyze.value) return

  isLoading.value = true
  error.value = null
  currentStep.value = 'serp'
  serpResultsByKeyword.value = new Map()

  // Build list of keywords: captain + root keywords (deduped)
  const allKeywords = [props.captainKeyword]
  const captainLower = props.captainKeyword.toLowerCase().trim()
  for (const rk of resolvedRootKeywords.value) {
    if (rk.toLowerCase().trim() !== captainLower && !allKeywords.includes(rk)) {
      allKeywords.push(rk)
    }
  }

  serpTotalCount.value = allKeywords.length
  serpDoneCount.value = 0
  log.info(`[LieutenantsSelection] Multi-SERP analysis: ${allKeywords.length} keywords`, allKeywords)

  try {
    const results: SerpAnalysisResult[] = []

    // Analyze each keyword sequentially for visible progress
    for (const kw of allKeywords) {
      const result = await apiPost<SerpAnalysisResult>('/serp/analyze', {
        keyword: kw,
        topN: 10,
        articleLevel: props.articleLevel ?? 'intermediaire',
      })
      results.push(result)
      serpResultsByKeyword.value = new Map(serpResultsByKeyword.value).set(kw, result)
      serpDoneCount.value++
      log.info(`[LieutenantsSelection] SERP ${serpDoneCount.value}/${allKeywords.length}: "${kw}" → ${result.competitors.length} comp, ${result.paaQuestions.length} PAA`)
    }

    const merged = mergeSerpResults(results)
    serpResult.value = merged
    emit('serp-loaded', merged)
    log.info(`[LieutenantsSelection] Multi-SERP merged: ${merged.competitors.length} competitors, ${merged.paaQuestions.length} PAA`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    currentStep.value = 'idle'
    log.error(`[LieutenantsSelection] SERP analysis failed`, { error: error.value })
  } finally {
    isLoading.value = false
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
    const eliminated = richLts.filter(lt => lt.status === 'eliminated')
    lieutenantCards.value = locked.map(lt => ({
      keyword: lt.keyword,
      reasoning: lt.reasoning,
      sources: lt.sources,
      aiConfidence: lt.aiConfidence,
      suggestedHnLevel: lt.suggestedHnLevel,
      score: lt.score,
    }))
    eliminatedCards.value = eliminated.map(lt => ({
      keyword: lt.keyword,
      reasoning: lt.reasoning,
      sources: lt.sources,
      aiConfidence: lt.aiConfidence,
      suggestedHnLevel: lt.suggestedHnLevel,
      score: lt.score,
    }))
    const selected = new Map<string, ProposedLieutenant>()
    for (const card of lieutenantCards.value) {
      selected.set(card.keyword, card)
    }
    selectedCards.value = selected
    emit('lieutenants-updated', Array.from(selected.keys()))
    log.info('[LieutenantsSelection] Lieutenants restored from rich data', { locked: locked.length, eliminated: eliminated.length })
    return
  }

  // Fallback: flat lieutenants[] (backward compat)
  const lieutenants = articleKeywordsStore.keywords?.lieutenants
  if (!lieutenants || lieutenants.length === 0) return

  const cards: ProposedLieutenant[] = lieutenants.map(kw => ({
    keyword: kw,
    reasoning: '',
    sources: [],
    aiConfidence: 'fort' as const,
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

        // Auto-save rich lieutenant proposals (status='suggested') dès que l'IA répond.
        // Respecte la règle métier : tout keyword approfondi DOIT être persisté,
        // même avant que l'utilisateur ne clique "Valider". Guard cross-article.
        const articleId = props.selectedArticle?.id
        if (articleId && articleKeywordsStore.keywords?.articleId === articleId) {
          articleKeywordsStore.saveRichLieutenantProposals(data.selectedLieutenants, data.eliminatedLieutenants)
          requestSave()
        }
      },
    },
  )
}

</script>

<template>
  <div class="lieutenants-selection">
    <!-- Captain header -->
    <div class="lieutenants-header">
      <div class="captain-badge">
        <span class="captain-icon">&#127894;</span>
        <span class="captain-keyword">{{ captainKeyword ?? '—' }}</span>
      </div>
      <span v-if="articleLevel" class="level-badge">{{ articleLevel }}</span>
    </div>

    <!-- Soft gate if captain not locked -->
    <div v-if="!isCaptaineLocked" class="soft-gate-message">
      <p>Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP.</p>
    </div>

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
      :ia-chunks="iaChunks"
      :current-step="currentStep"
      @analyze="analyzeSERP"
      @refresh="refreshSERP"
      @update:slider-value="sliderValue = $event"
      @update:active-serp-tab="activeSerpTab = $event"
    />

    <!-- Error -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <div v-if="serpResult || isLocked" class="serp-results">
      <!-- IA Proposals: streaming, cards, eliminated, content gap -->
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
        @toggle="toggleLieutenant"
        @retry="proposeLieutenants"
      />

      <!-- HN Structure: IA recommendations + competitor recurrence -->
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

      <!-- PAA -->
      <CollapsableSection v-if="serpResult" title="PAA associes" :default-open="false">
        <ul v-if="serpResult.paaQuestions.length > 0" class="paa-list">
          <li v-for="paa in serpResult.paaQuestions" :key="paa.question" class="paa-item">
            <div class="paa-question">{{ paa.question }}</div>
            <div v-if="paa.answer" class="paa-answer">{{ paa.answer }}</div>
          </li>
        </ul>
        <p v-else class="section-empty">Aucune question PAA trouvee.</p>
      </CollapsableSection>

      <!-- Word groups -->
      <CollapsableSection v-if="serpResult" title="Groupes de mots-cles" :default-open="false">
        <ul v-if="wordGroups.length > 0" class="group-list">
          <li v-for="g in wordGroups" :key="g.normalized" class="group-item">
            <span class="group-word">{{ g.word }}</span>
            <span class="group-count">{{ g.count }} termes</span>
          </li>
        </ul>
        <p v-else class="section-empty">Lancez d'abord la Decouverte pour voir les groupes thematiques.</p>
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

/* --- Header --- */
.lieutenants-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 8px;
}

.captain-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
}

.captain-icon { font-size: 1.125rem; }

.level-badge {
  margin-left: auto;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  background: var(--color-badge-blue-bg, #dbeafe);
  border-radius: 999px;
}

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
</style>
