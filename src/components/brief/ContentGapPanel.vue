<script setup lang="ts">
import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import type { ContentGapAnalysis, ThematicGap, ApiUsage } from '@shared/types/index.js'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

const props = defineProps<{
  keyword: string
}>()

const emit = defineEmits<{
  analyzed: [avgWordCount: number]
}>()

const gapData = ref<ContentGapAnalysis | null>(null)
const isAnalyzing = ref(false)
const error = ref<string | null>(null)

const themes = computed(() => gapData.value?.themes ?? [])
const gaps = computed(() => gapData.value?.gaps ?? [])
const localEntities = computed(() => gapData.value?.localEntitiesFromCompetitors ?? [])
const avgWordCount = computed(() => gapData.value?.averageWordCount ?? 0)
const competitorCount = computed(() => gapData.value?.competitors.length ?? 0)

// Enrichment: PAA not covered by any competitor
const uncoveredPaas = computed(() => {
  if (!gapData.value) return []
  const allPaas = new Set<string>()
  const coveredPaas = new Set<string>()
  for (const comp of gapData.value.competitors) {
    for (const paa of comp.paasCovered ?? []) {
      allPaas.add(paa)
      coveredPaas.add(paa)
    }
  }
  // PAA questions that are NOT covered by ANY competitor = opportunity
  // Actually, we want PAA not covered — but we only have covered ones
  // Return covered PAAs for display; gaps are themes with presentInArticle=false
  return Array.from(allPaas)
})

function freshnessLabel(publishDate?: string): { label: string; cls: string } {
  if (!publishDate) return { label: 'Inconnu', cls: 'freshness-unknown' }
  const months = (Date.now() - new Date(publishDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (months < 6) return { label: 'Frais', cls: 'freshness-fresh' }
  if (months < 18) return { label: 'Ancien', cls: 'freshness-old' }
  return { label: 'Obsolète', cls: 'freshness-obsolete' }
}

function readabilityLabel(score?: number): string {
  if (score == null) return '—'
  if (score >= 70) return `${score} (Facile)`
  if (score >= 50) return `${score} (Moyen)`
  return `${score} (Difficile)`
}

function frequencyClass(theme: ThematicGap): string {
  if (!theme.presentInArticle) return 'freq-gap'
  if (theme.frequency >= 4) return 'freq-high'
  if (theme.frequency >= 2) return 'freq-medium'
  return 'freq-low'
}

async function handleAnalyze() {
  isAnalyzing.value = true
  error.value = null
  try {
    log.info('Analyzing content gap', { keyword: props.keyword })
    const raw = await apiPost<ContentGapAnalysis & { _apiUsage?: ApiUsage }>('/content-gap/analyze', { keyword: props.keyword })
    if (raw._apiUsage) {
      try { useCostLogStore().addEntry('Analyse content gap', raw._apiUsage) } catch { /* noop */ }
    }
    gapData.value = raw
    log.info('Content gap analysis complete', { competitors: gapData.value?.competitors.length, gaps: gapData.value?.gaps.length })
    if (gapData.value?.averageWordCount) {
      emit('analyzed', gapData.value.averageWordCount)
    }
  } catch (err) {
    log.error('Content gap analysis failed', { keyword: props.keyword, error: (err as Error).message })
    error.value = err instanceof Error ? err.message : 'Erreur analyse content gap'
  } finally {
    isAnalyzing.value = false
  }
}
</script>

<template>
  <section class="content-gap-panel">
    <div class="panel-header">
      <h3 class="section-title">Analyse des concurrents</h3>
      <button
        class="analyze-btn"
        :disabled="isAnalyzing"
        @click="handleAnalyze"
      >
        {{ isAnalyzing ? 'Analyse...' : 'Analyser les concurrents' }}
      </button>
    </div>

    <LoadingSpinner v-if="isAnalyzing" />

    <ErrorMessage
      v-if="error && !isAnalyzing"
      :message="error"
      @retry="handleAnalyze"
    />

    <template v-if="gapData && !isAnalyzing">
      <!-- Overview -->
      <div class="overview-row">
        <div class="overview-card">
          <span class="card-label">Concurrents</span>
          <span class="card-value">{{ competitorCount }}</span>
        </div>
        <div class="overview-card">
          <span class="card-label">Mots moyens</span>
          <span class="card-value">{{ avgWordCount.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="overview-card">
          <span class="card-label">Themes</span>
          <span class="card-value">{{ themes.length }}</span>
        </div>
        <div class="overview-card overview-card--danger">
          <span class="card-label">Lacunes</span>
          <span class="card-value">{{ gaps.length }}</span>
        </div>
      </div>

      <!-- Themes with frequency -->
      <CollapsableSection title="Themes identifies">
        <div class="themes-list">
          <div
            v-for="theme in themes"
            :key="theme.theme"
            class="theme-row"
            :class="{ 'theme-missing': !theme.presentInArticle }"
          >
            <span class="theme-name">{{ theme.theme }}</span>
            <span class="theme-freq" :class="frequencyClass(theme)">
              {{ theme.frequency }}/{{ competitorCount }}
            </span>
            <span v-if="!theme.presentInArticle" class="theme-gap-label">Manquant</span>
          </div>
        </div>
      </CollapsableSection>

      <!-- Gaps highlighted -->
      <CollapsableSection v-if="gaps.length > 0" title="Lacunes a combler">
        <div class="gaps-list">
          <div v-for="gap in gaps" :key="gap.theme" class="gap-item">
            <span class="gap-name">{{ gap.theme }}</span>
            <span class="gap-freq">
              Present chez {{ gap.frequency }}/{{ competitorCount }} concurrents
            </span>
          </div>
        </div>
      </CollapsableSection>

      <!-- Local entities from competitors -->
      <CollapsableSection
        v-if="localEntities.length > 0"
        title="Entites locales des concurrents"
        :default-open="false"
      >
        <div class="entities-tags">
          <span
            v-for="entity in localEntities"
            :key="entity.entity"
            class="entity-tag"
          >
            {{ entity.entity }}
            <span class="entity-freq">{{ entity.frequency }}x</span>
          </span>
        </div>
      </CollapsableSection>

      <!-- PAA opportunities -->
      <CollapsableSection
        v-if="uncoveredPaas.length > 0"
        title="Questions PAA couvertes par les concurrents"
        :default-open="false"
      >
        <div class="paa-list">
          <div v-for="paa in uncoveredPaas" :key="paa" class="paa-item">
            {{ paa }}
          </div>
        </div>
      </CollapsableSection>

      <!-- Competitor details -->
      <CollapsableSection title="Detail concurrents" :default-open="false">
        <div class="competitors-list">
          <div
            v-for="comp in gapData.competitors"
            :key="comp.url"
            class="competitor-card"
          >
            <div class="comp-header">
              <a :href="comp.url" target="_blank" rel="noopener" class="comp-title">
                {{ comp.title }}
              </a>
              <div class="comp-badges">
                <span class="comp-badge" :class="freshnessLabel(comp.publishDate).cls">
                  {{ freshnessLabel(comp.publishDate).label }}
                </span>
                <span v-if="comp.readabilityScore != null" class="comp-badge comp-readability">
                  {{ readabilityLabel(comp.readabilityScore) }}
                </span>
              </div>
            </div>
            <span class="comp-words">{{ comp.wordCount.toLocaleString('fr-FR') }} mots</span>
            <div v-if="(comp.paasCovered ?? []).length > 0" class="comp-paas">
              <span class="comp-paas-label">PAA couvertes:</span>
              {{ (comp.paasCovered ?? []).length }}
            </div>
            <div v-if="comp.localEntities.length > 0" class="comp-entities">
              <span
                v-for="e in comp.localEntities"
                :key="e"
                class="comp-entity-tag"
              >
                {{ e }}
              </span>
            </div>
          </div>
        </div>
      </CollapsableSection>

      <p class="cache-info">
        Donnees mises en cache le {{ new Date(gapData.cachedAt).toLocaleDateString('fr-FR') }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.content-gap-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.analyze-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.analyze-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.analyze-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Overview */
.overview-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.overview-card {
  padding: 0.625rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  text-align: center;
}

.overview-card--danger {
  border-color: var(--color-error);
  background: var(--color-error-bg);
}

.card-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.125rem;
}

.card-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}

.overview-card--danger .card-value {
  color: var(--color-error);
}

/* Themes */
.themes-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.theme-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  transition: background 0.15s;
}

.theme-row:hover {
  background: var(--color-bg-hover);
}

.theme-missing {
  background: var(--color-error-bg);
}

.theme-missing:hover {
  background: var(--color-bg-danger-hover);
}

.theme-name {
  flex: 1;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.theme-freq {
  flex-shrink: 0;
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.freq-high {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.freq-medium {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.freq-low {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

.freq-gap {
  background: var(--color-error-bg, #fee2e2);
  color: var(--color-error, #991b1b);
}

.theme-gap-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-error);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Gaps */
.gaps-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.25rem 0;
}

.gap-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-border, #fecaca);
  border-radius: 6px;
}

.gap-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-error);
}

.gap-freq {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

/* Entity tags */
.entities-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.25rem 0;
}

.entity-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  background: var(--color-badge-purple-bg);
  color: var(--color-badge-purple-text);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.entity-freq {
  font-size: 0.625rem;
  font-weight: 700;
  opacity: 0.8;
}

/* Competitors */
.competitors-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.competitor-card {
  padding: 0.625rem;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.comp-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}

.comp-title:hover {
  text-decoration: underline;
}

.comp-words {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.375rem;
}

.comp-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.comp-entity-tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: var(--color-bg-hover);
  border-radius: 3px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

/* PAA */
.paa-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.paa-item {
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  border-left: 3px solid var(--color-primary);
  background: var(--color-bg-soft);
  border-radius: 0 4px 4px 0;
}

/* Competitor enrichments */
.comp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.comp-badges {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.comp-badge {
  display: inline-block;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 600;
}

.freshness-fresh { background: var(--color-badge-green-bg, #dcfce7); color: var(--color-badge-green-text, #166534); }
.freshness-old { background: var(--color-badge-amber-bg, #fef3c7); color: var(--color-badge-amber-text, #92400e); }
.freshness-obsolete { background: var(--color-error-bg, #fee2e2); color: var(--color-error, #991b1b); }
.freshness-unknown { background: var(--color-badge-slate-bg, #f1f5f9); color: var(--color-badge-slate-text, #475569); }

.comp-readability {
  background: var(--color-badge-blue-bg, #eff6ff);
  color: var(--color-badge-blue-text, #1e40af);
}

.comp-paas {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.comp-paas-label {
  font-weight: 600;
}

.cache-info {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: right;
}
</style>
