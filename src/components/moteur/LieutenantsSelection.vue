<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { apiPost } from '@/services/api.service'
import { useStreaming } from '@/composables/useStreaming'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { extractRoots } from '@/composables/useCapitaineValidation'
import { log } from '@/utils/logger'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import LieutenantCard from '@/components/moteur/LieutenantCard.vue'
import type { SelectedArticle, SerpAnalysisResult, SerpCompetitor, PaaQuestion } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'
import type { FilteredProposeLieutenantsResult, ProposedLieutenant, ProposeLieutenantsHnNode } from '@shared/types/serp-analysis.types.js'

export interface HnRecurrenceItem {
  level: number
  text: string
  count: number
  total: number
  percent: number
}

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
const showEliminated = ref(false)
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

function isCardSelected(keyword: string): boolean {
  return selectedCards.value.has(keyword)
}

// --- HN Structure save ---
const hnSaved = ref(false)
const isSavingHn = ref(false)

async function saveHnStructure() {
  const slug = props.selectedArticle?.slug
  if (!slug || !articleKeywordsStore.keywords || hnStructure.value.length === 0) return

  isSavingHn.value = true
  articleKeywordsStore.keywords.hnStructure = hnStructure.value
  await articleKeywordsStore.saveKeywords(slug)
  hnSaved.value = true
  isSavingHn.value = false
  setTimeout(() => { hnSaved.value = false }, 2000)
  log.info('[LieutenantsSelection] HN structure saved independently', { nodes: hnStructure.value.length })
}

// --- Lock/unlock Lieutenants ---
const isLocked = ref(props.initialLocked)

async function lockLieutenants() {
  if (selectedCards.value.size === 0) return
  const slug = props.selectedArticle?.slug
  if (!slug || !articleKeywordsStore.keywords) return

  articleKeywordsStore.keywords.lieutenants = Array.from(selectedCards.value.keys())
  articleKeywordsStore.keywords.hnStructure = hnStructure.value
  await articleKeywordsStore.saveKeywords(slug)
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
  () => props.selectedArticle?.slug,
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
    showEliminated.value = false
    hnStructure.value = []
    contentGapInsights.value = ''

    isLocked.value = props.initialLocked
    iaAbort()

    // Restore hnStructure from store if article was previously locked
    if (props.initialLocked) {
      if (articleKeywordsStore.keywords?.hnStructure && articleKeywordsStore.keywords.hnStructure.length > 0) {
        hnStructure.value = articleKeywordsStore.keywords.hnStructure
      }
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
  showEliminated.value = false
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
function proposeLieutenants() {
  if (!props.captainKeyword || !serpResult.value || !props.selectedArticle) return
  iaAbort()
  lieutenantCards.value = []
  eliminatedCards.value = []
  totalGenerated.value = 0
  showEliminated.value = false
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
      articleSlug: props.selectedArticle?.slug ?? '',
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

    <!-- SERP controls -->
    <div class="serp-controls">
      <div class="slider-row">
        <label class="slider-label">Resultats SERP : <strong>{{ sliderValue }}</strong></label>
        <input
          type="range"
          min="3"
          max="10"
          v-model.number="sliderValue"
          class="serp-slider"
          :disabled="!isCaptaineLocked"
        />
      </div>
      <button
        class="btn-analyze"
        :disabled="!canAnalyze"
        @click="analyzeSERP"
      >
        {{ isLoading ? 'Analyse en cours...' : 'Analyser SERP' }}
      </button>
      <button
        v-if="serpResult && !isLocked"
        class="btn-refresh"
        :disabled="isLoading || iaIsStreaming"
        @click="refreshSERP"
      >
        Tout relancer (SERP + IA)
      </button>
    </div>

    <!-- Multi-step progress loader -->
    <div v-if="currentStep !== 'idle' && currentStep !== 'done'" class="analysis-steps" data-testid="analysis-steps">
      <div class="step-item" :class="{ active: currentStep === 'serp', done: currentStep !== 'serp' }">
        <span class="step-icon">{{ currentStep === 'serp' ? '&#9899;' : '&#9989;' }}</span>
        <span class="step-label">Scraping SERP Google
          <span class="step-progress">({{ serpDoneCount }} / {{ serpTotalCount }} mots-cles)</span>
        </span>
      </div>
      <div class="step-item" :class="{ active: currentStep === 'ia-proposal', done: currentStep === 'filtering', pending: currentStep === 'serp' }">
        <span class="step-icon">{{ currentStep === 'ia-proposal' ? '&#9899;' : currentStep === 'serp' ? '&#9898;' : '&#9989;' }}</span>
        <span class="step-label">Analyse IA — proposition de lieutenants
          <span v-if="currentStep === 'ia-proposal' && iaChunks" class="step-progress">({{ Math.round(iaChunks.length / 1000) }}k car. recus)</span>
        </span>
      </div>
      <div class="step-item" :class="{ active: currentStep === 'filtering', pending: currentStep === 'serp' || currentStep === 'ia-proposal' }">
        <span class="step-icon">{{ currentStep === 'filtering' ? '&#9899;' : (currentStep === 'serp' || currentStep === 'ia-proposal') ? '&#9898;' : '&#9989;' }}</span>
        <span class="step-label">Filtrage et selection des meilleurs candidats</span>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- Results summary -->
    <div v-if="serpResult" class="serp-results">
      <div class="results-summary">
        <p>
          {{ displayedCompetitors.length }} concurrent{{ displayedCompetitors.length > 1 ? 's' : '' }}
          affiche{{ displayedCompetitors.length > 1 ? 's' : '' }}
          <span v-if="serpResult.fromCache" class="cache-badge">(cache)</span>
        </p>
        <p v-if="serpResult.paaQuestions.length > 0" class="paa-count">
          {{ serpResult.paaQuestions.length }} questions PAA
        </p>
        <p v-else class="paa-count paa-warning">0 PAA — les lieutenants seront bases sur les headings et la strategie du cocon</p>
      </div>

      <!-- Per-keyword SERP results with tabs -->
      <div v-if="serpResultsByKeyword.size > 0" class="serp-keyword-tabs" data-testid="serp-keyword-tabs">
        <div class="serp-tab-headers">
          <button
            v-for="[kw] in serpResultsByKeyword"
            :key="kw"
            class="serp-tab-btn"
            :class="{ active: activeSerpTab === kw }"
            @click="activeSerpTab = kw"
          >
            {{ kw }}
            <span class="serp-tab-count">{{ serpResultsByKeyword.get(kw)?.competitors.filter(c => !c.fetchError).length ?? 0 }}</span>
          </button>
        </div>
        <div v-if="activeSerpTabResult" class="serp-tab-content">
          <div class="serp-tab-summary">
            {{ activeSerpTabResult.competitors.filter(c => !c.fetchError).length }} concurrents,
            {{ activeSerpTabResult.paaQuestions.length }} PAA
            <span v-if="activeSerpTabResult.fromCache" class="cache-badge">(cache)</span>
          </div>
          <div class="serp-urls" data-testid="serp-urls">
            <div
              v-for="comp in activeSerpTabResult.competitors"
              :key="comp.url"
              class="serp-url-item"
              :class="{ 'serp-url-error': comp.fetchError }"
            >
              <span class="serp-url-position">#{{ comp.position }}</span>
              <span class="serp-url-domain">{{ comp.domain }}</span>
              <a :href="comp.url" target="_blank" rel="noopener" class="serp-url-link">{{ comp.title }}</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: IA Proposal — Propositions IA (NOUVEAU) -->
      <div class="ia-proposal-section" data-testid="ia-proposal-section">
        <h3 class="section-title">
          Lieutenants proposes par l'IA
          <span v-if="iaIsStreaming" class="pulse-dot" />
        </h3>

        <!-- IA streaming state -->
        <div v-if="iaIsStreaming" class="ia-loading" data-testid="ia-loading">
          <span class="pulse-dot" /> Analyse IA en cours...
        </div>

        <!-- IA error -->
        <div v-else-if="iaError" class="ia-error" data-testid="ia-error">
          <p>{{ iaError }}</p>
          <button class="btn-retry" @click="proposeLieutenants">Relancer la proposition IA</button>
        </div>

        <!-- Lieutenant RadarCards -->
        <template v-else-if="lieutenantCards.length > 0">
          <div class="lieutenant-counter" data-testid="lieutenant-counter">
            {{ selectedCards.size }} lieutenant{{ selectedCards.size > 1 ? 's' : '' }}
            selectionne{{ selectedCards.size > 1 ? 's' : '' }}
            sur {{ totalGenerated }} generes par l'IA
            <span v-if="eliminatedCards.length > 0" class="filter-info">
              ({{ lieutenantCards.length }} retenus, {{ eliminatedCards.length }} elimines)
            </span>
          </div>

          <!-- Selected lieutenant cards -->
          <div class="lieutenant-cards-list" data-testid="lieutenant-cards-list">
            <LieutenantCard
              v-for="lt in lieutenantCards"
              :key="lt.keyword"
              :lieutenant="lt"
              :checked="isCardSelected(lt.keyword)"
              :disabled="isLocked"
              @update:checked="toggleLieutenant(lt)"
            />
          </div>

          <!-- Eliminated candidates (collapsible) -->
          <div v-if="eliminatedCards.length > 0" class="eliminated-section" data-testid="eliminated-section">
            <button
              class="eliminated-toggle"
              @click="showEliminated = !showEliminated"
            >
              <span class="eliminated-toggle-icon">{{ showEliminated ? '\u25BC' : '\u25B6' }}</span>
              Autres candidats ({{ eliminatedCards.length }})
            </button>
            <div v-if="showEliminated" class="eliminated-cards-list" data-testid="eliminated-cards-list">
              <LieutenantCard
                v-for="lt in eliminatedCards"
                :key="lt.keyword"
                :lieutenant="lt"
                :checked="isCardSelected(lt.keyword)"
                :disabled="isLocked"
                class="eliminated"
                @update:checked="toggleLieutenant(lt)"
              />
            </div>
          </div>

          <!-- Content gap insights -->
          <div v-if="contentGapInsights" class="content-gap-section">
            <strong>Failles de contenu :</strong> {{ contentGapInsights }}
          </div>
        </template>

        <p v-else class="section-empty">L'IA proposera des lieutenants apres l'analyse SERP.</p>
      </div>

      <!-- Section: Structure Hn recommandee (from IA proposal) -->
      <CollapsableSection
        v-if="hnStructure.length > 0"
        title="Structure Hn recommandee (IA)"
        :default-open="true"
        data-testid="hn-structure-section"
      >
        <ul class="hn-structure-list">
          <li v-for="(node, idx) in hnStructure" :key="idx" class="hn-structure-item">
            <span class="hn-level-tag">H{{ node.level }}</span>
            <span class="hn-text">{{ node.text }}</span>
            <ul v-if="node.children && node.children.length > 0" class="hn-structure-children">
              <li v-for="(child, cidx) in node.children" :key="cidx" class="hn-structure-child">
                <span class="hn-level-tag">H{{ child.level }}</span>
                <span class="hn-text">{{ child.text }}</span>
              </li>
            </ul>
          </li>
        </ul>
        <div class="hn-structure-actions">
          <button
            v-if="!isLocked"
            class="btn-save-hn"
            :disabled="isSavingHn"
            @click="saveHnStructure"
          >
            {{ isSavingHn ? 'Sauvegarde...' : 'Sauvegarder la structure' }}
          </button>
          <Transition name="fade">
            <span v-if="hnSaved" class="hn-saved-badge">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Sauvegardee
            </span>
          </Transition>
          <span v-if="isLocked && !hnSaved" class="hn-saved-badge">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Validee avec les lieutenants
          </span>
        </div>
      </CollapsableSection>

      <!-- Section: Structure Hn concurrents (collapsed by default, tabs per keyword) -->
      <CollapsableSection title="Structure Hn concurrents" :default-open="false" data-testid="hn-concurrents-section">
        <div v-if="serpResultsByKeyword.size > 1" class="kw-tab-headers">
          <button
            class="kw-tab-btn"
            :class="{ active: activeHnTab === '__all__' }"
            @click="activeHnTab = '__all__'"
          >
            Tous ({{ hnRecurrence.length }})
          </button>
          <button
            v-for="[kw] in serpResultsByKeyword"
            :key="kw"
            class="kw-tab-btn"
            :class="{ active: activeHnTab === kw }"
            @click="activeHnTab = kw"
          >
            {{ kw }}
          </button>
        </div>
        <ul v-if="activeHnRecurrence.length > 0" class="hn-recurrence-list">
          <li v-for="item in activeHnRecurrence" :key="`${item.level}:${item.text}`" class="hn-recurrence-item">
            <span class="hn-level-tag">H{{ item.level }}</span>
            <span class="hn-text">{{ item.text }}</span>
            <span class="hn-freq">{{ item.count }}/{{ item.total }}</span>
            <span class="hn-percent">({{ item.percent }}%)</span>
            <div class="hn-bar" :style="{ width: item.percent + '%' }" />
          </li>
        </ul>
        <p v-else class="section-empty">Aucun heading extrait des concurrents.</p>
      </CollapsableSection>

      <!-- Section: PAA associes (collapsed by default) -->
      <CollapsableSection title="PAA associes" :default-open="false">
        <ul v-if="serpResult.paaQuestions.length > 0" class="paa-list">
          <li v-for="paa in serpResult.paaQuestions" :key="paa.question" class="paa-item">
            <div class="paa-question">{{ paa.question }}</div>
            <div v-if="paa.answer" class="paa-answer">{{ paa.answer }}</div>
          </li>
        </ul>
        <p v-else class="section-empty">Aucune question PAA trouvee.</p>
      </CollapsableSection>

      <!-- Section: Groupes de mots-cles (collapsed by default) -->
      <CollapsableSection title="Groupes de mots-cles" :default-open="false">
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

/* --- Analysis steps loader --- */
.analysis-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-info-bg, #eff6ff);
  border: 1px solid var(--color-info, #3b82f6);
  border-radius: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #6b7280);
  transition: color 0.2s;
}

.step-item.active {
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.step-item.done {
  color: var(--color-success, #22c55e);
}

.step-item.active .step-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

.step-progress {
  font-weight: 400;
  font-size: 0.75rem;
  opacity: 0.7;
}

.paa-warning {
  color: var(--color-warning, #f59e0b);
  font-style: italic;
}

/* --- Keyword tabs (shared for SERP URLs + Hn concurrents) --- */
.kw-tab-headers,
.serp-tab-headers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.kw-tab-btn,
.serp-tab-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kw-tab-btn:hover,
.serp-tab-btn:hover {
  color: var(--color-primary);
  background: var(--color-bg-secondary, #f9fafb);
}

.kw-tab-btn.active,
.serp-tab-btn.active {
  color: var(--color-primary);
  font-weight: 600;
  border-color: var(--color-border);
  border-bottom-color: var(--color-primary);
  background: var(--color-bg-secondary, #f9fafb);
}

.serp-tab-count {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  border-radius: 4px;
}

.serp-keyword-tabs {
  margin-top: 0.5rem;
}

.serp-tab-content {
  padding: 0.5rem 0;
}

.serp-tab-summary {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

/* --- Competitor URLs --- */
.serp-urls {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 6px;
  font-size: 0.8125rem;
  max-height: 200px;
  overflow-y: auto;
}

.serp-url-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.serp-url-item.serp-url-error {
  opacity: 0.5;
  text-decoration: line-through;
}

.serp-url-position {
  flex-shrink: 0;
  color: var(--color-text-muted, #6b7280);
  font-weight: 600;
  width: 1.75rem;
}

.serp-url-domain {
  flex-shrink: 0;
  color: var(--color-primary, #3b82f6);
  font-weight: 500;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.serp-url-link {
  color: var(--color-text-muted, #6b7280);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.serp-url-link:hover {
  text-decoration: underline;
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

.captain-icon {
  font-size: 1.125rem;
}

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

.soft-gate-message p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
}

/* --- Controls --- */
.serp-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.slider-label {
  font-size: 0.8125rem;
  white-space: nowrap;
  color: var(--color-text);
}

.serp-slider {
  flex: 1;
  max-width: 200px;
}

.btn-analyze {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-analyze:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-analyze:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Error --- */
.error-message {
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 8px;
}

.error-message p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

/* --- Results --- */
.serp-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.results-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.results-summary p {
  margin: 0;
}

.cache-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border-radius: 4px;
}

/* --- IA Proposal Section --- */
.ia-proposal-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-heading);
}

.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success, #22c55e);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ia-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.ia-error {
  padding: 0.5rem;
  background: var(--color-block-error-bg, #fef2f2);
  border-radius: 6px;
}

.ia-error p {
  margin: 0 0 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

.btn-retry {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
}

.btn-retry:hover {
  background: var(--color-primary);
  color: white;
}

/* --- Lieutenant cards --- */
.lieutenant-counter {
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.lieutenant-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}


/* --- Content gap --- */
.content-gap-section {
  margin-top: 0.5rem;
  padding: 0.75rem;
  font-size: 0.8125rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 6px;
  line-height: 1.5;
}

/* --- Hn structure from IA --- */
.hn-structure-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hn-structure-item {
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.hn-structure-children {
  list-style: none;
  padding: 0 0 0 1.5rem;
  margin: 0.25rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hn-structure-child {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.hn-structure-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.btn-save-hn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save-hn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-save-hn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hn-saved-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-success, #16a34a);
}

.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* --- Hn recurrence --- */
.hn-recurrence-list,
.paa-list,
.group-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hn-recurrence-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.hn-level-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.hn-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hn-freq {
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.hn-percent {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.hn-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--color-primary);
  transition: width 0.2s ease;
}

/* --- PAA --- */
.paa-item {
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.paa-question {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-heading);
}

.paa-answer {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

/* --- Groups --- */
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

.group-word {
  font-weight: 600;
}

.group-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

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

.lock-btn:hover:not(:disabled) {
  background: #16a34a;
}

.lock-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locked-state {
  display: flex;
  align-items: center;
  gap: 1rem;
}

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

.unlock-btn:hover {
  border-color: var(--color-error, #ef4444);
  color: var(--color-error, #ef4444);
}

/* --- Refresh button --- */
.btn-refresh {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Filter info --- */
.filter-info {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

/* --- Eliminated section --- */
.eliminated-section {
  margin-top: 0.5rem;
}

.eliminated-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.eliminated-toggle:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.eliminated-toggle-icon {
  font-size: 0.625rem;
  flex-shrink: 0;
}

.eliminated-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
}

.eliminated {
  opacity: 0.7;
}

/* --- Empty section --- */
.section-empty {
  margin: 0;
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
