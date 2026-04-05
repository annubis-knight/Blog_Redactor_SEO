<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { apiPost } from '@/services/api.service'
import { useStreaming } from '@/composables/useStreaming'
import { log } from '@/utils/logger'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import type { SelectedArticle, SerpAnalysisResult } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'
import type { LieutenantCandidate } from '@shared/types/serp-analysis.types.js'

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

const sliderValue = ref(10)
const isLoading = ref(false)
const error = ref<string | null>(null)
const serpResult = ref<SerpAnalysisResult | null>(null)

// Smart cursor: filter competitors locally when slider decreases
const displayedCompetitors = computed(() => {
  if (!serpResult.value) return []
  return serpResult.value.competitors.slice(0, sliderValue.value)
})

// Hn recurrence: aggregate headings across displayed competitors
const hnRecurrence = computed<HnRecurrenceItem[]>(() => {
  const comps = displayedCompetitors.value.filter(c => !c.fetchError)
  const total = comps.length
  if (total === 0) return []

  const freqMap = new Map<string, { level: number; text: string; count: number }>()

  for (const comp of comps) {
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
})

const canAnalyze = computed(() =>
  props.isCaptaineLocked && !!props.captainKeyword && !isLoading.value,
)

// Lieutenant candidate selection
const selectedLieutenants = ref<Set<string>>(new Set())

// Generate lieutenant candidates from 4 sources
const lieutenantCandidates = computed<LieutenantCandidate[]>(() => {
  if (!serpResult.value) return []

  const candidateMap = new Map<string, LieutenantCandidate>()

  // Source 1: H2/H3 recurrent headings (≥ 2 occurrences)
  for (const item of hnRecurrence.value) {
    if (item.count < 2) continue
    const key = item.text.toLowerCase().trim()
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('serp')) existing.sources.push('serp')
    } else {
      candidateMap.set(key, { text: item.text, sources: ['serp'], relevance: 'faible' })
    }
  }

  // Source 2: PAA questions
  for (const paa of serpResult.value.paaQuestions) {
    const key = paa.question.toLowerCase().trim()
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('paa')) existing.sources.push('paa')
    } else {
      candidateMap.set(key, { text: paa.question, sources: ['paa'], relevance: 'faible' })
    }
  }

  // Source 3: Word groups from discovery
  for (const g of props.wordGroups) {
    const key = g.word.toLowerCase().trim()
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('group')) existing.sources.push('group')
    } else {
      candidateMap.set(key, { text: g.word, sources: ['group'], relevance: 'faible' })
    }
  }

  // Source 4: Root keywords from Capitaine deconstruction
  for (const rk of props.rootKeywords) {
    const key = rk.toLowerCase().trim()
    if (!key) continue
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('root')) existing.sources.push('root')
    } else {
      candidateMap.set(key, { text: rk, sources: ['root'], relevance: 'faible' })
    }
  }

  // Compute relevance based on number of sources
  const candidates = Array.from(candidateMap.values())
  for (const c of candidates) {
    c.relevance = c.sources.length >= 3 ? 'fort' : c.sources.length === 2 ? 'moyen' : 'faible'
  }

  // Sort: Fort first, then Moyen, then Faible
  const order: Record<string, number> = { fort: 0, moyen: 1, faible: 2 }
  return candidates
    .filter(c => !(c.sources.length === 1 && c.sources[0] === 'root'))
    .sort((a, b) => (order[a.relevance] ?? 2) - (order[b.relevance] ?? 2))
})

// Root-only candidates (separate display section)
const rootOnlyCandidates = computed(() => {
  if (!serpResult.value) {
    // Show root keywords even before SERP analysis
    return props.rootKeywords
      .filter(rk => rk.trim())
      .map(rk => ({ text: rk, sources: ['root'] as ('root')[], relevance: 'faible' as const }))
  }
  // After SERP: roots that didn't match any other source
  const allCandidates = (() => {
    const map = new Map<string, LieutenantCandidate>()
    for (const rk of props.rootKeywords) {
      const key = rk.toLowerCase().trim()
      if (!key) continue
      map.set(key, { text: rk, sources: ['root'], relevance: 'faible' })
    }
    // Check if any root appeared in other sources
    for (const item of hnRecurrence.value) {
      if (item.count < 2) continue
      const key = item.text.toLowerCase().trim()
      if (map.has(key)) map.delete(key)
    }
    for (const paa of serpResult.value!.paaQuestions) {
      const key = paa.question.toLowerCase().trim()
      if (map.has(key)) map.delete(key)
    }
    for (const g of props.wordGroups) {
      const key = g.word.toLowerCase().trim()
      if (map.has(key)) map.delete(key)
    }
    return Array.from(map.values())
  })()
  return allCandidates
})

function toggleLieutenant(text: string) {
  if (isLocked.value) return
  const next = new Set(selectedLieutenants.value)
  if (next.has(text)) {
    next.delete(text)
  } else {
    next.add(text)
  }
  selectedLieutenants.value = next
  emit('lieutenants-updated', Array.from(next))
}

// --- AI panel for Hn structure recommendation ---
const { chunks: aiChunks, isStreaming: aiIsStreaming, error: aiError, startStream: aiStartStream, abort: aiAbort } = useStreaming()
const aiPanelOpen = ref(false)

function generateHnStructure() {
  if (!props.captainKeyword || selectedLieutenants.value.size === 0) return
  aiAbort()
  aiStartStream(
    `/api/keywords/${encodeURIComponent(props.captainKeyword)}/ai-hn-structure`,
    {
      lieutenants: Array.from(selectedLieutenants.value),
      level: props.articleLevel ?? 'intermediaire',
      hnStructure: hnRecurrence.value
        .filter(h => h.count >= 2)
        .map(h => ({ level: h.level, text: h.text, count: h.count })),
      ...(props.cocoonSlug ? { cocoonSlug: props.cocoonSlug } : {}),
    },
  )
}

// --- Lock/unlock Lieutenants ---
const isLocked = ref(props.initialLocked)

function lockLieutenants() {
  isLocked.value = true
  emit('check-completed', 'lieutenants_locked')
}

function unlockLieutenants() {
  isLocked.value = false
  emit('check-removed', 'lieutenants_locked')
}

// Reset when article changes
watch(
  () => props.selectedArticle?.slug,
  () => {
    serpResult.value = null
    error.value = null
    sliderValue.value = 10
    selectedLieutenants.value = new Set()
    isLocked.value = props.initialLocked
    aiAbort()
  },
)

// Auto-trigger/restore SERP when captain is locked (covers both initial mount and article switching)
watch(
  [() => props.isCaptaineLocked, () => props.captainKeyword],
  ([locked, keyword]) => {
    if (locked && keyword && !serpResult.value && !isLoading.value) {
      log.info('[LieutenantsSelection] Auto-triggering SERP analysis')
      analyzeSERP()
    }
  },
  { immediate: true, flush: 'post' },
)

function refreshSERP() {
  serpResult.value = null
  error.value = null
  selectedLieutenants.value = new Set()
  emit('lieutenants-updated', [])
  analyzeSERP()
}

async function analyzeSERP() {
  if (!props.captainKeyword || !canAnalyze.value) return

  isLoading.value = true
  error.value = null

  try {
    log.info(`[LieutenantsSelection] Analyzing SERP for "${props.captainKeyword}"`)
    const result = await apiPost<SerpAnalysisResult>('/serp/analyze', {
      keyword: props.captainKeyword,
      topN: 10, // Always scrape max, filter locally
      articleLevel: props.articleLevel ?? 'intermediaire',
    })
    serpResult.value = result
    emit('serp-loaded', result)
    log.info(`[LieutenantsSelection] SERP loaded: ${result.competitors.length} competitors`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    log.error(`[LieutenantsSelection] SERP analysis failed`, { error: error.value })
  } finally {
    isLoading.value = false
  }
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
        :disabled="isLoading"
        @click="refreshSERP"
      >
        Relancer l'analyse
      </button>
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
      </div>

      <!-- Section 1: Structure Hn concurrents -->
      <CollapsableSection title="Structure Hn concurrents" :default-open="true">
        <ul v-if="hnRecurrence.length > 0" class="hn-recurrence-list">
          <li v-for="item in hnRecurrence" :key="`${item.level}:${item.text}`" class="hn-recurrence-item">
            <span class="hn-level-tag">H{{ item.level }}</span>
            <span class="hn-text">{{ item.text }}</span>
            <span class="hn-freq">{{ item.count }}/{{ item.total }}</span>
            <span class="hn-percent">({{ item.percent }}%)</span>
            <div class="hn-bar" :style="{ width: item.percent + '%' }" />
          </li>
        </ul>
        <p v-else class="section-empty">Aucun heading extrait des concurrents.</p>
      </CollapsableSection>

      <!-- Section 2: PAA associes -->
      <CollapsableSection title="PAA associes" :default-open="false">
        <ul v-if="serpResult.paaQuestions.length > 0" class="paa-list">
          <li v-for="paa in serpResult.paaQuestions" :key="paa.question" class="paa-item">
            <div class="paa-question">{{ paa.question }}</div>
            <div v-if="paa.answer" class="paa-answer">{{ paa.answer }}</div>
          </li>
        </ul>
        <p v-else class="section-empty">Aucune question PAA trouvee.</p>
      </CollapsableSection>

      <!-- Section 3: Groupes de mots-cles -->
      <CollapsableSection title="Groupes de mots-cles" :default-open="false">
        <ul v-if="wordGroups.length > 0" class="group-list">
          <li v-for="g in wordGroups" :key="g.normalized" class="group-item">
            <span class="group-word">{{ g.word }}</span>
            <span class="group-count">{{ g.count }} termes</span>
          </li>
        </ul>
        <p v-else class="section-empty">Lancez d'abord la Decouverte pour voir les groupes thematiques.</p>
      </CollapsableSection>

      <!-- Root keywords from Capitaine (reference section) -->
      <div v-if="rootOnlyCandidates.length > 0" class="root-keywords-section">
        <span class="root-section-label">Racines du Capitaine</span>
        <div class="root-keywords-chips">
          <span v-for="rk in rootOnlyCandidates" :key="rk.text" class="root-chip">
            {{ rk.text }}
            <span class="badge-source badge-root">ROOT</span>
          </span>
        </div>
      </div>

      <!-- Section 4: Candidats Lieutenants -->
      <CollapsableSection title="Candidats Lieutenants" :default-open="true">
        <div class="lieutenant-counter">
          {{ selectedLieutenants.size }} sélectionné{{ selectedLieutenants.size > 1 ? 's' : '' }}
        </div>
        <div v-if="lieutenantCandidates.length > 0" class="lieutenant-list">
          <div
            v-for="candidate in lieutenantCandidates"
            :key="candidate.text"
            class="lieutenant-row"
            :class="{ selected: selectedLieutenants.has(candidate.text), locked: isLocked }"
            @click="toggleLieutenant(candidate.text)"
          >
            <input
              type="checkbox"
              :checked="selectedLieutenants.has(candidate.text)"
              class="lieutenant-checkbox"
              :disabled="isLocked"
              @click.stop="toggleLieutenant(candidate.text)"
            />
            <span class="lieutenant-text">{{ candidate.text }}</span>
            <span class="lieutenant-badges">
              <span v-for="s in candidate.sources" :key="s" :class="'badge-source badge-' + s">{{ s.toUpperCase() }}</span>
            </span>
            <span :class="'badge-relevance badge-relevance-' + candidate.relevance">{{ candidate.relevance }}</span>
          </div>
        </div>
        <p v-else class="section-empty">Aucun candidat identifie. Lancez l'analyse SERP.</p>
      </CollapsableSection>

      <!-- AI Panel: Hn structure recommendation -->
      <div class="ai-panel" data-testid="ai-panel">
        <button class="ai-panel-toggle" data-testid="ai-panel-toggle" @click="aiPanelOpen = !aiPanelOpen">
          <span class="ai-panel-toggle-icon">{{ aiPanelOpen ? '\u25BC' : '\u25B6' }}</span>
          Structure Hn recommandee
          <span v-if="aiIsStreaming" class="ai-panel-streaming-dot" />
        </button>
        <div v-if="aiPanelOpen" class="ai-panel-content" data-testid="ai-panel-content">
          <button
            v-if="!isLocked && !aiIsStreaming"
            class="btn-generate"
            data-testid="btn-generate"
            :disabled="selectedLieutenants.size === 0"
            @click="generateHnStructure"
          >
            Generer la structure
          </button>
          <div v-if="aiIsStreaming && !aiChunks" class="ai-panel-loading">Analyse en cours...</div>
          <div v-else-if="aiError" class="ai-panel-error">{{ aiError }}</div>
          <div v-else-if="aiChunks" class="ai-panel-text" data-testid="ai-panel-text">{{ aiChunks }}</div>
          <div v-else class="ai-panel-empty">Selectionnez des Lieutenants puis cliquez sur "Generer".</div>
        </div>
      </div>

      <!-- Lock/unlock Lieutenants -->
      <div class="lieutenant-lock" data-testid="lieutenant-lock">
        <button
          v-if="!isLocked"
          class="lock-btn"
          data-testid="lock-btn"
          :disabled="selectedLieutenants.size === 0"
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

/* --- Lieutenant candidates --- */
.lieutenant-counter {
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.lieutenant-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.lieutenant-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.lieutenant-row:hover {
  border-color: var(--color-primary);
}

.lieutenant-row.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, #eff6ff);
}

.lieutenant-checkbox {
  cursor: pointer;
  flex-shrink: 0;
}

.lieutenant-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lieutenant-badges {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.badge-source {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.badge-serp { background: var(--color-badge-blue-bg, #dbeafe); color: var(--color-primary); }
.badge-paa { background: var(--color-badge-amber-bg, #fef3c7); color: #b45309; }
.badge-group { background: var(--color-badge-green-bg, #dcfce7); color: #15803d; }
.badge-root { background: var(--color-badge-purple-bg, #f3e8ff); color: #7c3aed; }

.badge-relevance {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: capitalize;
  flex-shrink: 0;
}

.badge-relevance-fort { background: var(--color-success, #22c55e); color: white; }
.badge-relevance-moyen { background: var(--color-warning, #f59e0b); color: white; }
.badge-relevance-faible { background: var(--color-border); color: var(--color-text-muted); }

/* --- Locked row state --- */
.lieutenant-row.locked {
  cursor: default;
  opacity: 0.7;
}

.lieutenant-row.locked:hover {
  border-color: var(--color-border);
}

/* --- AI Panel --- */
.ai-panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.ai-panel-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-heading);
  background: var(--color-bg-secondary, #f9fafb);
  border: none;
  cursor: pointer;
  text-align: left;
}

.ai-panel-toggle:hover {
  background: var(--color-border);
}

.ai-panel-toggle-icon {
  font-size: 0.625rem;
  flex-shrink: 0;
}

.ai-panel-streaming-dot {
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

.ai-panel-content {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
}

.ai-panel-loading,
.ai-panel-empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.ai-panel-error {
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

.ai-panel-text {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
}

.btn-generate {
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-generate:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* --- Root keywords section --- */
.root-keywords-section {
  padding: 0.75rem 1rem;
  background: var(--color-badge-purple-bg, #f3e8ff);
  border: 1px solid #d8b4fe;
  border-radius: 8px;
}

.root-section-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.root-keywords-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.root-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  background: white;
  border: 1px solid #d8b4fe;
  border-radius: 6px;
  color: var(--color-text);
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
