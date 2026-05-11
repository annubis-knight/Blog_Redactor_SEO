<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useKeywordRadar } from '@/composables/keyword/useResonanceScore'
import { useKeywordModifiersStore } from '@/stores/article/keyword-modifiers.store'
import { log } from '@/utils/logger'
import RadarAiPanel from '@/components/moteur/RadarAiPanel.vue'
import DouleurScannerInputs from '@/components/intent/scanner/DouleurScannerInputs.vue'
import DouleurScannerResults from '@/components/intent/scanner/DouleurScannerResults.vue'
import { matchesCpcFilter, type CpcFilter } from '@/components/shared/cpc-filter-types'
import { useSortableList, type SortOption } from '@/composables/moteur/useSortableList'
import { computeKpiScore } from '@shared/scoring-kpi.js'
import type { RadarKeyword, RadarCard } from '@shared/types/intent.types'
import type { ArticleLevel } from '@shared/types/keyword-validate.types'

const modifiersStore = useKeywordModifiersStore()

function getModifiersFor(keyword: string) {
  return modifiersStore.getEffective(null, keyword)
}

function handleModifierUntag(keyword: string, index: number) {
  modifiersStore.setModifier(null, keyword, index, null)
}

function handleModifierCycle(keyword: string, payload: { index: number; next: 'local' | 'persona' | null }) {
  modifiersStore.setModifier(null, keyword, payload.index, payload.next)
}

const props = withDefaults(defineProps<{
  pilierKeyword: string
  articleTopic: string
  articleKeyword: string
  articlePainPoint?: string
  articleLevel?: ArticleLevel
  injectedKeywords?: RadarKeyword[]
  mode?: 'workflow' | 'libre'
  /** Requis pour les suggestions longue-traîne (route POST /articles/:id/...).
   *  En mode `libre` (LaboView), peut être null → la section longue-traîne
   *  reste cachée. */
  articleId?: number | null
}>(), {
  mode: 'workflow',
  articleLevel: 'intermediaire',
  articleId: null,
})

const emit = defineEmits<{
  (e: 'scanned', payload: { globalScore: number; heatLevel: string }): void
  (e: 'keywords-cleared'): void
  (e: 'cards-selected', cards: RadarCard[]): void
  (e: 'captain-candidates-marked', keywords: string[]): void
}>()

// Handoff RadarAiPanel : remonte les keywords sélectionnés au parent
// (MoteurView) qui pourra écrire dans article_keywords.captainCandidates[].
// Aucun appel IA ici.
function handleMarkCaptainCandidates(keywords: string[]) {
  log.info(`[DouleurIntent] Marked ${keywords.length} keyword(s) as Capitaine candidate(s)`)
  emit('captain-candidates-marked', keywords)
}

const {
  generatedKeywords,
  scanResult,
  isGenerating,
  isScanning,
  scanProgress,
  error,
  radarCacheStatus,
  checkRadarCache,
  loadFromRadarCache,
  mergeFromRadarSource,
  generate,
  scan,
  removeKeyword,
  reset,
} = useKeywordRadar()

const isLoadingCache = ref(false)

// --- Checkbox selection for sending to Capitaine ---
const checkedKeywords = ref(new Set<string>())

// CPC filter (3 états : null / 'with' / 'without').
const cpcFilter = ref<CpcFilter>(null)

// 2026-05-02 — Tri unifié des radar cards.
//
// Score = `computeKpiScore(card.kpis, articleLevel).total` — exactement le
// score affiché par RadarKeywordCard en mode `displayMode='kpi'`. Ce calcul
// front garantit que "ce que je vois trié = ce que je vois affiché", peu
// importe l'âge des cards persistées (recalcul à la demande).
//
// Voir docs/scoring-kpi-vs-relevance.md pour la séparation KPI / Pertinence.
const radarCards = computed<RadarCard[]>(() => scanResult.value?.cards ?? [])
const radarSortOptions: SortOption[] = [
  { key: 'az', label: 'A-Z' },
  { key: 'score', label: 'Score KPI' },
]
const { sorted: filteredCards, sortState: radarSortState } = useSortableList<RadarCard>({
  items: radarCards,
  getValue: (card, key) => {
    if (key === 'az') return card.keyword
    if (key === 'score') {
      // kpis === null → card sans KPIs (longue-traîne) : tri en bas via null,
      // pas de fallback fantôme (CLAUDE.md §3.5).
      if (!card.kpis) return null
      try {
        return computeKpiScore(card.kpis, props.articleLevel ?? 'intermediaire').total
      } catch {
        // KPIs incomplets (ne devrait pas arriver) → fallback marketScore backend.
        // PAS de fallback combinedScore : c'est un score legacy hybride qui
        // contient des signaux pertinence interdits côté Radar.
        return card.marketScore?.total ?? null
      }
    }
    return null
  },
  // Filtre CPC : les cards sans kpis (longue-traîne) sont toujours laissées
  // passer (pas de critère CPC à appliquer).
  filter: (card) => (card.kpis ? matchesCpcFilter(card.kpis.cpc, cpcFilter.value) : true),
})

// "Tout" opère sur le filtre courant (visibles uniquement).
const allChecked = computed(() =>
  filteredCards.value.length > 0 &&
  filteredCards.value.every(c => checkedKeywords.value.has(c.keyword)),
)

function toggleCheck(keyword: string) {
  const next = new Set(checkedKeywords.value)
  if (next.has(keyword)) next.delete(keyword)
  else next.add(keyword)
  checkedKeywords.value = next
}

function toggleAllChecked() {
  if (!scanResult.value) return
  // Toggle opère sur les cartes visibles (filtre CPC respecté).
  const visible = filteredCards.value
  const next = new Set(checkedKeywords.value)
  if (allChecked.value) {
    for (const c of visible) next.delete(c.keyword)
  } else {
    for (const c of visible) next.add(c.keyword)
  }
  checkedKeywords.value = next
}

// --- Long-tail suggestions selection (S4) ---
// Keywords longue-traine selectionnes par l'utilisateur dans la section
// RadarLongTailSuggestions. Synchronise via @update:selected-suggestions.
import type { LongTailSuggestion } from '@shared/types/long-tail.types'
const longTailSelectedSuggestions = ref<LongTailSuggestion[]>([])

function handleLongTailSelected(selection: LongTailSuggestion[]) {
  longTailSelectedSuggestions.value = selection
}

/** Convertit une suggestion longue-traine en RadarCard "vide" (kpis: null,
 *  source: 'longtail') compatible avec le payload attendu par CaptainPanel. */
function toRadarCardFromLongTail(s: LongTailSuggestion): RadarCard {
  return {
    keyword: s.keyword,
    reasoning: s.rationale,
    kpis: null,
    paaItems: [],
    combinedScore: 0,
    scoreBreakdown: {
      paaMatchScore: 0,
      resonanceBonus: 0,
      opportunityScore: 0,
      intentValueScore: 0,
      cpcScore: 0,
      painAlignmentScore: 0,
      total: 0,
    },
    cachedPaa: false,
    source: 'longtail',
    preferenceScore: s.preferenceScore,
    rationale: s.rationale,
    derivedFromRoots: s.derivedFromRoots,
  }
}

function normalizeKeyword(s: string): string {
  return s.trim().toLowerCase()
}

/** Compteur unifie : cards racines cochees + longues-traines cochees, dedupliquees. */
const totalSelectedCount = computed(() => {
  const seen = new Set<string>()
  let count = 0
  if (scanResult.value) {
    for (const c of scanResult.value.cards) {
      if (checkedKeywords.value.has(c.keyword)) {
        const norm = normalizeKeyword(c.keyword)
        if (!seen.has(norm)) {
          seen.add(norm)
          count++
        }
      }
    }
  }
  for (const s of longTailSelectedSuggestions.value) {
    const norm = normalizeKeyword(s.keyword)
    if (!seen.has(norm)) {
      seen.add(norm)
      count++
    }
  }
  return count
})

function sendToCaptain() {
  // CTA unifie : cards racines cochees + longues-traines cochees, dedupliquees
  // par keyword normalise. Card racine prime sur longue-traine (KPIs > pas KPIs).
  const racines = scanResult.value
    ? scanResult.value.cards.filter(c => checkedKeywords.value.has(c.keyword))
    : []
  const longues = longTailSelectedSuggestions.value.map(toRadarCardFromLongTail)

  if (racines.length === 0 && longues.length === 0) return

  const seen = new Set<string>()
  const merged: RadarCard[] = []
  // Racines d'abord (priorité KPIs)
  for (const c of racines) {
    const norm = normalizeKeyword(c.keyword)
    if (!seen.has(norm)) {
      seen.add(norm)
      merged.push(c)
    }
  }
  for (const c of longues) {
    const norm = normalizeKeyword(c.keyword)
    if (!seen.has(norm)) {
      seen.add(norm)
      merged.push(c)
    }
  }

  log.info(`[DouleurIntent] Send ${merged.length} cards to Capitaine (${racines.length} racines + ${longues.length} longues-traines, ${racines.length + longues.length - merged.length} doublons evites)`)
  emit('cards-selected', merged)
}

// Editable fields
const broadKeyword = ref(props.pilierKeyword)
const specificTopic = ref(props.articleTopic || props.articleKeyword || props.pilierKeyword)
const painPoint = ref(props.articlePainPoint || '')
// Depth locked at N+2 (deeper PAA tree).
// Why: the N+1/N+2 toggle was causing confusion (user thought it might
// trigger a keyword regeneration that would overwrite Discovery data).
// Product decision is N+2 everywhere.
const depth = ref(2)

// Phase tracking
type Phase = 'input' | 'keywords' | 'scanning' | 'results'
const phase = computed<Phase>(() => {
  if (scanResult.value) return 'results'
  if (isScanning.value) return 'scanning'
  if (generatedKeywords.value.length > 0) return 'keywords'
  return 'input'
})

// Check cache for seed keyword
const cacheSeed = computed(() => props.articleKeyword || props.pilierKeyword)

function triggerCacheCheck() {
  if (cacheSeed.value && !scanResult.value) {
    checkRadarCache(cacheSeed.value)
  }
}

onMounted(triggerCacheCheck)

// Reset when article changes (workflow mode only — in libre mode, reset is handled by LaboView)
if (props.mode === 'workflow') {
  watch(() => [props.pilierKeyword, props.articleTopic, props.articleKeyword, props.articlePainPoint], () => {
    log.debug('[DouleurIntent] Article changed, resetting radar', {
      keyword: props.pilierKeyword,
      topic: props.articleTopic,
      articleKw: props.articleKeyword,
    })
    broadKeyword.value = props.pilierKeyword
    specificTopic.value = props.articleTopic || props.articleKeyword || props.pilierKeyword
    painPoint.value = props.articlePainPoint || ''
    reset()
    triggerCacheCheck()
  })
}

async function handleLoadFromCache() {
  if (!cacheSeed.value) return
  isLoadingCache.value = true
  try {
    const loaded = await loadFromRadarCache(cacheSeed.value)
    if (loaded && scanResult.value) {
      emit('scanned', { globalScore: scanResult.value.globalScore, heatLevel: scanResult.value.heatLevel })
    }
  } finally {
    isLoadingCache.value = false
  }
}

// Receive keywords injected from Discovery tab
watch(() => props.injectedKeywords, (newKeywords) => {
  if (newKeywords && newKeywords.length > 0) {
    log.info(`[DouleurIntent] Received ${newKeywords.length} keywords from Discovery tab`)
    generatedKeywords.value = [...newKeywords]
    scanResult.value = null
  }
}, { immediate: true })

// Autocomplete grouped by query
const autoGroups = computed(() => {
  if (!scanResult.value) return []
  const groups: Array<{ query: string; items: typeof scanResult.value.autocomplete.suggestions }> = []
  const map = new Map<string, typeof scanResult.value.autocomplete.suggestions>()

  for (const s of scanResult.value.autocomplete.suggestions) {
    const key = s.query || '(direct)'
    if (!map.has(key)) {
      const arr: typeof scanResult.value.autocomplete.suggestions = []
      map.set(key, arr)
      groups.push({ query: key, items: arr })
    }
    map.get(key)!.push(s)
  }
  return groups
})

async function handleGenerate() {
  if (!specificTopic.value.trim() || !broadKeyword.value.trim()) return
  log.info('[DouleurIntent] Generate clicked', { broad: broadKeyword.value, topic: specificTopic.value })
  await generate(
    specificTopic.value.trim(),
    broadKeyword.value.trim(),
    painPoint.value.trim() || specificTopic.value.trim(),
  )
}

async function handleScan() {
  if (generatedKeywords.value.length === 0) return
  log.info(`[DouleurIntent] Scan clicked: ${generatedKeywords.value.length} keywords, depth=${depth.value}`)
  await scan(
    broadKeyword.value.trim(),
    specificTopic.value.trim(),
    generatedKeywords.value,
    depth.value,
    cacheSeed.value ? { seed: cacheSeed.value } : undefined,
  )
  if (scanResult.value) {
    log.info(`[DouleurIntent] Scan result: score=${scanResult.value.globalScore}`)
    emit('scanned', { globalScore: scanResult.value.globalScore, heatLevel: scanResult.value.heatLevel })
  }
}

function handleReset() {
  log.debug('[DouleurIntent] Reset')
  reset()
  emit('keywords-cleared')
}

/**
 * 2026-05-01 — Exposé pour le TabLoadPrompt : permet à MoteurView d'invoquer
 * le merge depuis DB ou cache sans écraser l'état mémoire.
 */
defineExpose({ mergeFromRadarSource })
</script>

<template>
  <div class="intent-scanner">
    <DouleurScannerInputs
      :broad-keyword="broadKeyword"
      :specific-topic="specificTopic"
      :pain-point="painPoint"
      :phase="phase"
      :is-generating="isGenerating"
      :radar-cache-status="radarCacheStatus"
      :is-loading-cache="isLoadingCache"
      :error="error"
      :show-inputs="true"
      :workflow-hint="mode === 'workflow' ? 'Tu peux générer des mots-clés Radar manuellement à partir du contexte ci-dessous. Cela ne touche pas aux mots-clés déjà envoyés depuis Discovery ni au panier — la génération remplace uniquement la liste de mots-clés Radar en attente de scan.' : null"
      @update:broad-keyword="(v) => broadKeyword = v"
      @update:specific-topic="(v) => specificTopic = v"
      @update:pain-point="(v) => painPoint = v"
      @generate="handleGenerate"
      @reset-scan="handleReset"
      @load-cache="handleLoadFromCache"
      @dismiss-cache="radarCacheStatus = null"
      @clear-error="error = null"
    />

    <!-- Phase 2: Keywords Preview (editable tags) -->
    <div v-if="phase === 'keywords' && !isScanning" class="keywords-preview" data-testid="radar-keywords-preview">
      <div class="keywords-header">
        <h4>{{ generatedKeywords.length }} mots-cles generes</h4>
        <button
          class="btn-action"
          :disabled="generatedKeywords.length === 0"
          @click="handleScan"
        >
          Lancer le scan
        </button>
      </div>

      <div class="keywords-tags">
        <span
          v-for="(kw, i) in generatedKeywords"
          :key="i"
          class="keyword-tag"
          :title="kw.reasoning"
        >
          {{ kw.keyword }}
          <button class="tag-remove" @click="removeKeyword(i)">&times;</button>
        </span>
      </div>
    </div>

    <!-- Placeholder grisé quand aucun mot-clé n'est en attente de scan (skeleton stable). -->
    <div
      v-else-if="!isScanning && phase !== 'results'"
      class="keywords-preview keywords-preview--empty"
      data-testid="radar-keywords-empty"
    >
      <div class="keywords-header">
        <h4>Mots-clés à scanner</h4>
        <button class="btn-action" disabled>Lancer le scan</button>
      </div>
      <p class="keywords-empty-hint">
        Aucun mot-clé en attente. Passe par l'onglet <strong>Discovery</strong> pour envoyer une sélection ici,
        ou utilise les champs ci-dessus pour en générer manuellement.
      </p>
    </div>

    <!-- Phase: Scanning with progress -->
    <div v-if="isScanning" class="scanner-loading">
      <div class="scanner-loading__top">
        <div class="spinner" />
        <p>{{ scanProgress.phase || 'Initialisation' }}...</p>
      </div>
      <div v-if="scanProgress.total > 0" class="scanner-progress">
        <div class="scanner-progress__bar">
          <div
            class="scanner-progress__fill"
            :style="{ width: Math.round((scanProgress.scanned / scanProgress.total) * 100) + '%' }"
          />
        </div>
        <span class="scanner-progress__text">
          {{ scanProgress.scanned }}/{{ scanProgress.total }} mots-cles
        </span>
      </div>
    </div>

    <!-- Phase 3: Results -->
    <DouleurScannerResults
      v-if="phase === 'results' && scanResult"
      :scan-result="scanResult"
      :filtered-cards="filteredCards"
      :radar-sort-options="radarSortOptions"
      :radar-sort-state="radarSortState"
      :cpc-filter="cpcFilter"
      :all-checked="allChecked"
      :checked-keywords="checkedKeywords"
      :auto-groups="autoGroups"
      :article-level="props.articleLevel"
      :article-id="props.articleId"
      :article-topic="props.articleTopic"
      :pain-point="painPoint"
      :total-selected-count="totalSelectedCount"
      :get-modifiers-for="getModifiersFor"
      @update:cpc-filter="(v) => cpcFilter = v"
      @update:radar-sort-state="(s) => radarSortState = s"
      @toggle-check="toggleCheck"
      @toggle-all-checked="toggleAllChecked"
      @modifier-untag="handleModifierUntag"
      @modifier-cycle="handleModifierCycle"
      @long-tail-selected="handleLongTailSelected"
      @send-to-captain="sendToCaptain"
    />

    <!-- Placeholder grisé quand aucun scan n'a encore tourné (skeleton stable). -->
    <div
      v-else-if="!isScanning"
      class="results-placeholder"
      data-testid="radar-results-empty"
    >
      <h4 class="results-placeholder__title">Résultats du scan</h4>
      <p class="results-placeholder__hint">
        Le thermomètre de résonance, les radar cards et les suggestions Autocomplete
        s'afficheront ici dès que tu auras lancé un scan.
      </p>
    </div>

    <RadarAiPanel
      :cards="scanResult?.cards ?? []"
      :has-scan-result="scanResult !== null"
      :is-locked="false"
      @mark-captain-candidates="handleMarkCaptainCandidates"
    />
  </div>
</template>

<style scoped>
.intent-scanner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* --- btn-action used by keywords-preview "Lancer le scan" --- */
.btn-action {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-action:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Keywords Preview --- */
.keywords-preview {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  animation: fadeSlideIn 0.3s ease;
}

.keywords-preview--empty {
  opacity: 0.55;
  animation: none;
}

.keywords-empty-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.results-placeholder {
  padding: 1.25rem 1.5rem;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  opacity: 0.6;
}

.results-placeholder__title {
  margin: 0 0 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.results-placeholder__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.keywords-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.keywords-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.keywords-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: var(--color-primary-bg, #eff6ff);
  border: 1px solid var(--color-primary-light, #bfdbfe);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-primary);
  font-weight: 500;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 14px;
  cursor: pointer;
  border-radius: 50%;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.tag-remove:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

/* --- Loading --- */
.scanner-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--color-text-muted);
}

.scanner-loading__top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.scanner-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 400px;
}

.scanner-progress__bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.scanner-progress__fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.scanner-progress__text {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>
