<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { log } from '@/utils/logger'
import { useKeywordsStore } from '@/stores/keywords.store'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'
import { apiPost } from '@/services/api.service'
import type { DataForSeoCacheEntry } from '@shared/types/index.js'
import KeywordBadge from '@/components/shared/KeywordBadge.vue'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import DataForSeoPanel from '@/components/brief/DataForSeoPanel.vue'
import ContentGapPanel from '@/components/brief/ContentGapPanel.vue'
import KeywordMigrationPreview from '@/components/keywords/KeywordMigrationPreview.vue'

const props = defineProps<{
  cocoonName: string
  cocoonId: number
}>()

const emit = defineEmits<{
  (e: 'next'): void
}>()

const router = useRouter()
const keywordsStore = useKeywordsStore()
const auditStore = useKeywordAuditStore()

// --- Keywords by type ---
const pilierKeywords = computed(() =>
  keywordsStore.keywords.filter(k => k.type === 'Pilier'),
)
const moyenneKeywords = computed(() =>
  keywordsStore.keywords.filter(k => k.type === 'Moyenne traine'),
)
const longueKeywords = computed(() =>
  keywordsStore.keywords.filter(k => k.type === 'Longue traine'),
)

const pilierKeyword = computed(() =>
  pilierKeywords.value[0]?.keyword ?? props.cocoonName,
)

function getTypeScore(type: string) {
  return auditStore.typeScores.find(ts => ts.type === type)
}

function navigateToAudit() {
  router.push(`/cocoon/${props.cocoonId}/moteur`)
}

// --- DataForSEO ---
const dataForSeo = ref<DataForSeoCacheEntry | null>(null)
const isLoadingDataForSeo = ref(false)
const isRefreshingDataForSeo = ref(false)

async function fetchDataForSeo(forceRefresh = false) {
  if (!pilierKeyword.value) return
  if (forceRefresh) {
    isRefreshingDataForSeo.value = true
  } else {
    isLoadingDataForSeo.value = true
  }
  try {
    log.info('Fetching DataForSEO', { keyword: pilierKeyword.value, forceRefresh })
    const result = await apiPost<DataForSeoCacheEntry>('/dataforseo/brief', {
      keyword: pilierKeyword.value,
      ...(forceRefresh ? { forceRefresh: true } : {}),
    })
    dataForSeo.value = result
    log.info('DataForSEO loaded', { keyword: pilierKeyword.value })
  } catch (err) {
    log.warn('DataForSEO unavailable', { keyword: pilierKeyword.value, error: (err as Error).message })
  } finally {
    isLoadingDataForSeo.value = false
    isRefreshingDataForSeo.value = false
  }
}

// --- Keyword migration ---
const showMigration = ref(false)
const migrationPreview = ref<{ assignments: any[]; warnings: string[] } | null>(null)
const isApplyingMigration = ref(false)
const migrationError = ref<string | null>(null)

async function startMigration() {
  migrationError.value = null
  try {
    log.info('Previewing keyword migration', { cocoon: props.cocoonName })
    const data = await apiPost<{ cocoonName: string; assignments: any[]; warnings: string[] }>(
      `/keywords/migrate/${encodeURIComponent(props.cocoonName)}/preview`,
      {},
    )
    migrationPreview.value = data
    showMigration.value = true
    log.info('Migration preview ready', { assignments: data.assignments.length, warnings: data.warnings.length })
  } catch (err) {
    log.error('Migration preview failed', { cocoon: props.cocoonName, error: (err as Error).message })
    migrationError.value = (err as Error).message
  }
}

async function handleApplyMigration(assignments: any[]) {
  isApplyingMigration.value = true
  migrationError.value = null
  try {
    log.info('Applying keyword migration', { cocoon: props.cocoonName, assignments: assignments.length })
    await apiPost(`/keywords/migrate/${encodeURIComponent(props.cocoonName)}/apply`, { assignments })
    showMigration.value = false
    migrationPreview.value = null
    log.info('Keyword migration applied', { cocoon: props.cocoonName })
  } catch (err) {
    log.error('Migration apply failed', { cocoon: props.cocoonName, error: (err as Error).message })
    migrationError.value = (err as Error).message
  } finally {
    isApplyingMigration.value = false
  }
}

function cancelMigration() {
  showMigration.value = false
  migrationPreview.value = null
  migrationError.value = null
}

onMounted(() => {
  // Load keywords if not already loaded
  if (keywordsStore.keywords.length === 0) {
    keywordsStore.fetchKeywordsByCocoon(props.cocoonName)
  }
  // Load audit cache status
  auditStore.fetchCacheStatus(props.cocoonName)
  // Load DataForSEO for pilier keyword
  fetchDataForSeo()
})
</script>

<template>
  <div class="engine-phase">
    <!-- Keywords section -->
    <div v-if="keywordsStore.keywords.length > 0" class="engine-keywords">
      <div class="engine-keywords-header">
        <span class="engine-keywords-title">Mots-clés du cocon</span>
        <div class="engine-keywords-actions">
          <button class="btn-migrate" @click="startMigration">
            Assigner aux articles
          </button>
          <button class="btn-audit" @click="navigateToAudit">
            Améliorer les mots-clés &rarr;
          </button>
        </div>
      </div>

      <p v-if="migrationError" class="migration-error">{{ migrationError }}</p>

      <KeywordMigrationPreview
        v-if="showMigration && migrationPreview"
        :assignments="migrationPreview.assignments"
        :warnings="migrationPreview.warnings"
        :is-applying="isApplyingMigration"
        @apply="handleApplyMigration"
        @cancel="cancelMigration"
      />

      <div v-if="pilierKeywords.length > 0" class="keywords-section">
        <div class="keywords-section-header">
          <span class="keywords-label">Courte traîne</span>
          <ScoreGauge
            v-if="getTypeScore('Pilier')?.averageScore != null && auditStore.results.length > 0"
            :score="getTypeScore('Pilier')!.averageScore"
            label="Pilier"
            size="sm"
          />
          <span v-else class="score-placeholder">Audit non effectué</span>
        </div>
        <div class="keywords-list">
          <KeywordBadge v-for="kw in pilierKeywords" :key="kw.keyword" :keyword="kw" />
        </div>
      </div>

      <div v-if="moyenneKeywords.length > 0" class="keywords-section">
        <div class="keywords-section-header">
          <span class="keywords-label">Moyenne traîne</span>
          <ScoreGauge
            v-if="getTypeScore('Moyenne traine')?.averageScore != null && auditStore.results.length > 0"
            :score="getTypeScore('Moyenne traine')!.averageScore"
            label="Moy."
            size="sm"
          />
          <span v-else class="score-placeholder">Audit non effectué</span>
        </div>
        <div class="keywords-list">
          <KeywordBadge v-for="kw in moyenneKeywords" :key="kw.keyword" :keyword="kw" />
        </div>
      </div>

      <div v-if="longueKeywords.length > 0" class="keywords-section">
        <div class="keywords-section-header">
          <span class="keywords-label">Longue traîne</span>
          <ScoreGauge
            v-if="getTypeScore('Longue traine')?.averageScore != null && auditStore.results.length > 0"
            :score="getTypeScore('Longue traine')!.averageScore"
            label="Long."
            size="sm"
          />
          <span v-else class="score-placeholder">Audit non effectué</span>
        </div>
        <div class="keywords-list">
          <KeywordBadge v-for="kw in longueKeywords" :key="kw.keyword" :keyword="kw" />
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>Aucun mot-clé défini pour ce cocon.</p>
    </div>

    <!-- DataForSEO section -->
    <div class="engine-dataforseo">
      <h3 class="section-title">Données DataForSEO</h3>
      <p v-if="isLoadingDataForSeo" class="loading-text">Chargement des données SEO...</p>
      <DataForSeoPanel
        v-else
        :data="dataForSeo"
        :is-refreshing="isRefreshingDataForSeo"
        @refresh="fetchDataForSeo(true)"
      />
    </div>

    <!-- Content gap -->
    <ContentGapPanel :keyword="pilierKeyword" />

    <!-- Navigation -->
    <div class="engine-nav">
      <button class="btn btn-primary" @click="$emit('next')">
        Continuer vers la Rédaction &rarr;
      </button>
    </div>
  </div>
</template>

<style scoped>
.engine-phase {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.engine-keywords {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.engine-keywords-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.engine-keywords-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.engine-keywords-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-migrate {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-success, #16a34a);
  background: var(--color-badge-green-bg, #dcfce7);
  border: 1px solid var(--color-success, #16a34a);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-migrate:hover {
  background: var(--color-success, #16a34a);
  color: white;
}

.btn-audit {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-audit:hover {
  background: var(--color-primary);
  color: white;
}

.migration-error {
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-error, #dc2626);
  background: var(--color-error-soft, #fef2f2);
  border: 1px solid var(--color-error, #dc2626);
  border-radius: 6px;
}

.keywords-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.keywords-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.keywords-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.score-placeholder {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.engine-dataforseo {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.loading-text {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.engine-nav {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}
</style>
