<script setup lang="ts">
import { ref, watch } from 'vue'
import { useIntentStore } from '@/stores/keyword/intent.store'
import { useLocalStore } from '@/stores/external/local.store'
import { useKeywordAuditStore } from '@/stores/keyword/keyword-audit.store'
import { log } from '@/utils/logger'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import { useKeywordScoring } from '@/composables/keyword/useKeywordScoring'

// Intention tab
import ExplorationInput from '@/components/intent/ExplorationInput.vue'
import IntentStep from '@/components/intent/IntentStep.vue'
import AutocompleteValidation from '@/components/intent/AutocompleteValidation.vue'
import ExplorationVerdict from '@/components/intent/ExplorationVerdict.vue'

// Audit tab
import KeywordAuditTable from '@/components/keywords/KeywordAuditTable.vue'
import KeywordComparison from '@/components/keywords/KeywordComparison.vue'
import KeywordEditor from '@/components/keywords/KeywordEditor.vue'
import DiscoveryPanel from '@/components/keywords/DiscoveryPanel.vue'

// Local tab
import LocalComparisonStep from '@/components/intent/LocalComparisonStep.vue'
import MapsStep from '@/components/local/MapsStep.vue'

const intentStore = useIntentStore()
const localStore = useLocalStore()
const auditStore = useKeywordAuditStore()
const { getScoreColor, getScoreLabel } = useKeywordScoring()

const keywordInput = ref('')
const activeKeyword = ref('')

const TAB_IDS = ['intention', 'audit', 'local'] as const
type Tab = typeof TAB_IDS[number]
const activeTab = ref<Tab>('intention')

// v-if + v-show pattern for tab state preservation
const visitedTabs = ref<Record<string, boolean>>({ intention: true })
watch(activeTab, (tab) => { visitedTabs.value[tab] = true })

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Explorateur' },
]

// --- Audit state ---
const cocoonNameInput = ref('')
const activeCocoonName = ref('')
const showComparison = ref(false)
const comparisonKeyword = ref('')
const showEditor = ref(false)

function setKeyword() {
  const trimmed = keywordInput.value.trim()
  if (trimmed.length < 2) return

  log.info(`[ExplorateurView] Keyword set: "${trimmed}"`)

  // Reset stores
  intentStore.reset()
  localStore.reset()

  activeKeyword.value = trimmed
  visitedTabs.value = { [activeTab.value]: true }
}

function handleExplore(keyword: string) {
  intentStore.exploreKeyword(keyword)
}

// --- Audit handlers ---
function setCocoonName() {
  const trimmed = cocoonNameInput.value.trim()
  if (trimmed.length < 2) return
  activeCocoonName.value = trimmed
  auditStore.$reset()
  auditStore.fetchAudit(trimmed, false)
}

function openComparison(keyword: string) {
  comparisonKeyword.value = keyword
  showComparison.value = true
}

function closeComparison() {
  showComparison.value = false
  comparisonKeyword.value = ''
}

function openEditor() {
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
}

async function handleKeywordChange() {
  if (activeCocoonName.value) {
    await auditStore.fetchAudit(activeCocoonName.value, false)
  }
}
</script>

<template>
  <div class="explorateur-view">
    <Breadcrumb :items="breadcrumbItems" />

    <!-- Search bar -->
    <div class="explorateur-search">
      <div class="search-row">
        <input
          v-model="keywordInput"
          type="text"
          class="search-input"
          placeholder="Saisissez un mot-cle (ex: refonte site web pme)"
          @keydown.enter="setKeyword"
        />
        <button class="search-btn" :disabled="keywordInput.trim().length < 2" @click="setKeyword">
          Explorer
        </button>
      </div>
      <p v-if="activeKeyword" class="active-keyword">
        Mot-cle actif : <strong>{{ activeKeyword }}</strong>
      </p>
    </div>

    <!-- Gate message -->
    <div v-if="!activeKeyword" class="explorateur-gate">
      <p class="explorateur-gate-message">Saisissez un mot-cle pour analyser son intention, auditer les mots-cles, ou explorer le SEO local.</p>
    </div>

    <!-- Tab navigation -->
    <nav v-if="activeKeyword" class="explorateur-tabs">
      <button
        v-for="tab in TAB_IDS"
        :key="tab"
        class="explorateur-tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'intention' ? 'Intention' : tab === 'audit' ? 'Audit' : 'Local' }}
      </button>
    </nav>

    <!-- Tab content -->
    <template v-if="activeKeyword">
      <!-- Intention -->
      <div v-if="visitedTabs.intention" v-show="activeTab === 'intention'" class="tab-content">
        <ExplorationInput mode="libre" :default-keyword="activeKeyword" @explore="handleExplore" />
        <template v-if="intentStore.explorationKeyword">
          <AutocompleteValidation mode="libre" :keyword="intentStore.explorationKeyword" @explore-keyword="handleExplore" />
          <IntentStep mode="libre" :keyword="intentStore.explorationKeyword" />
          <ExplorationVerdict mode="libre" />
        </template>
      </div>

      <!-- Audit -->
      <div v-if="visitedTabs.audit" v-show="activeTab === 'audit'" class="tab-content">
        <!-- Cocoon name input for audit context -->
        <div class="audit-cocoon-input">
          <label class="audit-cocoon-label">Nom du cocon (requis pour l'audit)</label>
          <div class="search-row">
            <input
              v-model="cocoonNameInput"
              type="text"
              class="search-input"
              placeholder="Ex: Design web, SEO local..."
              @keydown.enter="setCocoonName"
            />
            <button class="search-btn" :disabled="cocoonNameInput.trim().length < 2" @click="setCocoonName">
              Charger l'audit
            </button>
          </div>
        </div>

        <template v-if="activeCocoonName">
          <div class="audit-header">
            <div>
              <h3 class="audit-title">Audit des mots-cles</h3>
              <p class="audit-subtitle">{{ activeCocoonName }}</p>
            </div>
            <div class="audit-actions">
              <button class="btn-secondary" @click="openEditor">+ Ajouter un mot-cle</button>
              <button
                class="btn-primary"
                :disabled="auditStore.loading"
                @click="auditStore.fetchAudit(activeCocoonName, true)"
              >
                {{ auditStore.loading ? 'Analyse en cours...' : 'Relancer l\'audit' }}
              </button>
            </div>
          </div>

          <div v-if="auditStore.results.length > 0" class="audit-summary">
            <div
              v-for="ts in auditStore.typeScores"
              :key="ts.type"
              class="summary-card"
            >
              <div class="summary-card-header">
                <span class="summary-card-type">{{ ts.type }}</span>
                <span class="summary-card-count">{{ ts.keywordCount }} mots-cles</span>
              </div>
              <div class="summary-card-score">
                <ScoreGauge :score="ts.averageScore" :label="ts.type" size="md" />
                <span class="summary-card-label" :style="{ color: getScoreColor(ts.averageScore) }">
                  {{ getScoreLabel(ts.averageScore) }}
                </span>
              </div>
              <div v-if="ts.alertCount > 0" class="summary-card-alerts">
                {{ ts.alertCount }} alerte{{ ts.alertCount > 1 ? 's' : '' }}
              </div>
            </div>
          </div>

          <div v-if="auditStore.loading" class="audit-loading">
            <LoadingSpinner />
            <p>Analyse des mots-cles via DataForSEO...</p>
          </div>

          <ErrorMessage
            v-else-if="auditStore.error"
            :message="auditStore.error"
            @retry="auditStore.fetchAudit(activeCocoonName)"
          />

          <KeywordAuditTable
            v-else-if="auditStore.results.length > 0"
            :results="auditStore.results"
            :redundancies="auditStore.redundancies"
            @compare="openComparison"
            @delete="handleKeywordChange"
          />

          <KeywordComparison
            v-if="showComparison"
            :keyword="comparisonKeyword"
            :cocoon-name="activeCocoonName"
            @close="closeComparison"
            @replace="handleKeywordChange"
          />

          <KeywordEditor
            v-if="showEditor"
            :cocoon-name="activeCocoonName"
            @close="closeEditor"
            @saved="handleKeywordChange"
          />

          <DiscoveryPanel
            v-if="activeCocoonName"
            :cocoon-name="activeCocoonName"
            @keyword-added="handleKeywordChange"
          />
        </template>

        <div v-else class="audit-gate">
          <p>Entrez un nom de cocon ci-dessus pour charger l'audit des mots-cles.</p>
        </div>
      </div>

      <!-- Local -->
      <div v-if="visitedTabs.local" v-show="activeTab === 'local'" class="tab-content">
        <section class="local-section">
          <h3 class="local-section-title">Comparaison Local / National</h3>
          <LocalComparisonStep mode="libre" :keyword="activeKeyword" />
        </section>
        <section class="local-section">
          <h3 class="local-section-title">Maps &amp; GBP</h3>
          <MapsStep mode="libre" :keyword="activeKeyword" />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.explorateur-view {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* --- Search --- */
.explorateur-search {
  margin-bottom: 1.5rem;
}

.search-row {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  padding: 0.625rem 1rem;
  font-size: 0.9375rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--color-primary);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-btn {
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.search-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.active-keyword {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* --- Gate --- */
.explorateur-gate {
  padding: 2rem;
  text-align: center;
  background: var(--color-block-info-bg);
  border: 1px solid var(--color-block-info-border);
  border-radius: 8px;
}

.explorateur-gate-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text);
}

/* --- Tabs --- */
.explorateur-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.explorateur-tab {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.explorateur-tab:hover {
  color: var(--color-primary);
}

.explorateur-tab.active {
  color: var(--color-primary);
  font-weight: 600;
  border-bottom-color: var(--color-primary);
}

/* --- Tab content --- */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Audit --- */
.audit-cocoon-input {
  margin-bottom: 1.5rem;
}

.audit-cocoon-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.audit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.audit-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-heading);
}

.audit-subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0.125rem 0 0;
}

.audit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-secondary {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: var(--color-primary);
  color: white;
}

.btn-primary {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.audit-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-card {
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.summary-card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.summary-card-type {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.summary-card-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.summary-card-score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summary-card-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.summary-card-alerts {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-error, #dc2626);
  font-weight: 500;
}

.audit-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.audit-gate {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
}

/* --- Local sections --- */
.local-section {
  margin-bottom: 1.5rem;
}

.local-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-heading);
}
</style>
