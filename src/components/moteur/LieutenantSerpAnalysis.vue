<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SerpAnalysisResult, SerpCompetitor } from '@shared/types/index.js'

const props = defineProps<{
  serpResultsByKeyword: Map<string, SerpAnalysisResult>
  activeSerpTab: string
  activeSerpTabResult: SerpAnalysisResult | null
  displayedCompetitors: SerpCompetitor[]
  serpResult: SerpAnalysisResult | null
  sliderValue: number
  isLoading: boolean
  canAnalyze: boolean
  isLocked: boolean
  iaIsStreaming: boolean
  serpDoneCount: number
  serpTotalCount: number
  /** Sprint 4.1 — skeleton support */
  serpPendingKeywords?: string[]
  serpCurrentKeyword?: string | null
  iaChunks: string
  currentStep: string
}>()

defineEmits<{
  'analyze': []
  'refresh': []
  'update:sliderValue': [value: number]
  'update:activeSerpTab': [value: string]
}>()

// Sprint 4.4 — Blog filter. null = tous, 'blog' = blogs only, 'other' = non-blogs only.
type BlogFilter = 'blog' | 'other' | null
const blogFilter = ref<BlogFilter>(null)

const filteredCompetitors = computed<SerpCompetitor[]>(() => {
  const list = props.activeSerpTabResult?.competitors ?? []
  if (blogFilter.value === null) return list
  return list.filter(c => blogFilter.value === 'blog' ? c.isBlog === true : c.isBlog !== true)
})

function toggleBlogFilter(value: 'blog' | 'other') {
  blogFilter.value = blogFilter.value === value ? null : value
}

const blogStats = computed(() => {
  const list = props.activeSerpTabResult?.competitors ?? []
  return {
    blogs: list.filter(c => c.isBlog === true).length,
    others: list.filter(c => c.isBlog !== true).length,
  }
})
</script>

<template>
  <div>
    <!-- SERP controls -->
    <div class="serp-controls">
      <div class="slider-row">
        <label class="slider-label">Resultats SERP : <strong>{{ sliderValue }}</strong></label>
        <input
          type="range"
          min="3"
          max="10"
          :value="sliderValue"
          class="serp-slider"
          :disabled="!canAnalyze"
          @input="$emit('update:sliderValue', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <button class="btn-analyze" :disabled="!canAnalyze" @click="$emit('analyze')">
        {{ isLoading ? 'Analyse en cours...' : 'Analyser SERP' }}
      </button>
      <button
        v-if="serpResult && !isLocked"
        class="btn-refresh"
        :disabled="isLoading || iaIsStreaming"
        @click="$emit('refresh')"
      >
        Tout relancer (SERP + IA)
      </button>
    </div>

    <!-- Sprint 4.1 — Per-keyword skeleton during SERP scraping. -->
    <div v-if="isLoading && serpCurrentKeyword" class="serp-skeleton" data-testid="serp-skeleton">
      <div class="serp-skeleton-header">Analyse SERP en cours ({{ serpDoneCount }}/{{ serpTotalCount }})</div>
      <ul class="serp-skeleton-list">
        <li
          v-for="kw in [...Array.from(serpResultsByKeyword.keys()), serpCurrentKeyword, ...(serpPendingKeywords ?? []).filter(k => k !== serpCurrentKeyword)]"
          :key="kw"
          class="serp-skeleton-item"
          :class="{
            'serp-skeleton-item--done': serpResultsByKeyword.has(kw as string),
            'serp-skeleton-item--active': kw === serpCurrentKeyword,
          }"
        >
          <span class="serp-skeleton-icon">
            <span v-if="serpResultsByKeyword.has(kw as string)">&#10003;</span>
            <span v-else-if="kw === serpCurrentKeyword" class="spin-dot">&#9675;</span>
            <span v-else>&#8230;</span>
          </span>
          <span class="serp-skeleton-kw">{{ kw }}</span>
          <span v-if="serpResultsByKeyword.has(kw as string)" class="serp-skeleton-meta">
            {{ serpResultsByKeyword.get(kw as string)?.competitors.length ?? 0 }} concurrents
          </span>
          <span v-else-if="kw === serpCurrentKeyword" class="serp-skeleton-meta">scraping...</span>
          <span v-else class="serp-skeleton-meta">en attente</span>
        </li>
      </ul>
    </div>

    <!-- Multi-step progress -->
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

    <!-- Results summary -->
    <div v-if="serpResult" class="results-summary">
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

    <!-- Per-keyword SERP tabs -->
    <div v-if="serpResultsByKeyword.size > 0" class="serp-keyword-tabs" data-testid="serp-keyword-tabs">
      <div class="serp-tab-headers">
        <button
          v-for="[kw] in serpResultsByKeyword"
          :key="kw"
          class="serp-tab-btn"
          :class="{ active: activeSerpTab === kw }"
          @click="$emit('update:activeSerpTab', kw)"
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
          <!-- Sprint 4.4 — Blog filter chips. Toggle once to filter, again to clear. -->
          <span class="blog-filter" role="group" aria-label="Filtre blog / non-blog">
            <button
              type="button"
              class="blog-filter-btn"
              :class="{ 'blog-filter-btn--active': blogFilter === 'blog' }"
              @click="toggleBlogFilter('blog')"
            >Blogs ({{ blogStats.blogs }})</button>
            <button
              type="button"
              class="blog-filter-btn"
              :class="{ 'blog-filter-btn--active': blogFilter === 'other' }"
              @click="toggleBlogFilter('other')"
            >Autres ({{ blogStats.others }})</button>
          </span>
        </div>
        <div class="serp-urls" data-testid="serp-urls">
          <!-- Sprint 4.5 — strike-through + tooltip explaining scraping failure.
               Previously the strike-through alone made the user think the site
               was deliberately excluded. -->
          <div
            v-for="comp in filteredCompetitors"
            :key="comp.url"
            class="serp-url-item"
            :class="{ 'serp-url-error': comp.fetchError }"
            :title="comp.fetchError ? `Scraping impossible : ${comp.fetchError}. Le site apparait dans le top Google mais son contenu n'a pas pu etre analyse pour la TF-IDF.` : undefined"
          >
            <span class="serp-url-position">#{{ comp.position }}</span>
            <span
              class="serp-url-blog-badge"
              :class="{ 'serp-url-blog-badge--blog': comp.isBlog, 'serp-url-blog-badge--other': !comp.isBlog }"
              :title="comp.isBlog ? 'Detecte comme blog / article editorial' : 'Detecte comme non-blog (institutionnel, annuaire, marketing)'"
            >{{ comp.isBlog ? 'Blog' : 'Autre' }}</span>
            <span class="serp-url-domain">{{ comp.domain }}</span>
            <a :href="comp.url" target="_blank" rel="noopener" class="serp-url-link">{{ comp.title }}</a>
            <span v-if="comp.fetchError" class="serp-url-error-badge" aria-label="Scraping echoue">!</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.serp-slider { flex: 1; max-width: 200px; }

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

.btn-analyze:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }

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

.btn-refresh:hover:not(:disabled) { background: var(--color-primary); color: white; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

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

.step-item.active { color: var(--color-primary, #3b82f6); font-weight: 600; }
.step-item.done { color: var(--color-success, #22c55e); }
.step-item.active .step-icon { animation: pulse 1.5s ease-in-out infinite; }
.step-progress { font-weight: 400; font-size: 0.75rem; opacity: 0.7; }
.paa-warning { color: var(--color-warning, #f59e0b); font-style: italic; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.results-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.results-summary p { margin: 0; }

.cache-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border-radius: 4px;
}

.serp-keyword-tabs { margin-top: 0.5rem; }

.serp-tab-headers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

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

.serp-tab-btn:hover { color: var(--color-primary); background: var(--color-bg-secondary, #f9fafb); }

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

.serp-tab-content { padding: 0.5rem 0; }

.serp-tab-summary { font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem; }

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

.serp-url-item { display: flex; align-items: center; gap: 0.5rem; min-width: 0; cursor: default; }
.serp-url-item.serp-url-error { opacity: 0.6; text-decoration: line-through; }
.serp-url-error-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-warning, #f59e0b);
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  flex-shrink: 0;
  text-decoration: none;
}
/* Sprint 4.1 — SERP skeleton list during scraping */
.serp-skeleton {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-secondary, #f8fafc);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.serp-skeleton-header {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  margin-bottom: 0.5rem;
}
.serp-skeleton-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.serp-skeleton-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-muted);
}
.serp-skeleton-item--done { color: var(--color-success, #16a34a); }
.serp-skeleton-item--active { color: var(--color-primary, #3b82f6); border-color: var(--color-primary, #3b82f6); }
.serp-skeleton-icon { width: 16px; flex-shrink: 0; text-align: center; font-weight: 700; }
.serp-skeleton-kw { flex: 1; font-weight: 500; color: var(--color-text, #1e293b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.serp-skeleton-meta { font-size: 0.6875rem; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
.spin-dot { display: inline-block; animation: spin 1.2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Sprint 4.4 — Blog classification badges & filter */
.serp-url-blog-badge {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  cursor: help;
}
.serp-url-blog-badge--blog { background: #dcfce7; color: #166534; }
.serp-url-blog-badge--other { background: #f1f5f9; color: #64748b; }

.blog-filter {
  display: inline-flex;
  gap: 0;
  margin-left: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  font-size: 0.6875rem;
}
.blog-filter-btn {
  padding: 0.125rem 0.375rem;
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.blog-filter-btn + .blog-filter-btn { border-left: 1px solid var(--color-border); }
.blog-filter-btn--active {
  background: var(--color-primary, #3b82f6);
  color: white;
}
.serp-url-position { flex-shrink: 0; color: var(--color-text-muted, #6b7280); font-weight: 600; width: 1.75rem; }
.serp-url-domain { flex-shrink: 0; color: var(--color-primary, #3b82f6); font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.serp-url-link { color: var(--color-text-muted, #6b7280); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.serp-url-link:hover { text-decoration: underline; }
</style>
