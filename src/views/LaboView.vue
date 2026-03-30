<script setup lang="ts">
import { ref } from 'vue'
import { useIntentStore } from '@/stores/intent.store'
import { useLocalStore } from '@/stores/local.store'
import { useKeywordDiscoveryTab } from '@/composables/useKeywordDiscoveryTab'
import { log } from '@/utils/logger'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'

// Phase ① — Discovery / Douleur
import KeywordDiscoveryTab from '@/components/moteur/KeywordDiscoveryTab.vue'
import PainTranslator from '@/components/intent/PainTranslator.vue'

// Phase ② — Exploration
import ExplorationInput from '@/components/intent/ExplorationInput.vue'
import IntentStep from '@/components/intent/IntentStep.vue'
import AutocompleteValidation from '@/components/intent/AutocompleteValidation.vue'
import ExplorationVerdict from '@/components/intent/ExplorationVerdict.vue'

// Phase ② — Local
import LocalComparisonStep from '@/components/intent/LocalComparisonStep.vue'
import MapsStep from '@/components/local/MapsStep.vue'

const intentStore = useIntentStore()
const localStore = useLocalStore()
const { reset: resetDiscovery } = useKeywordDiscoveryTab()

const keywordInput = ref('')
const activeKeyword = ref('')

const TAB_IDS = ['discovery', 'douleur', 'exploration', 'local'] as const
type Tab = typeof TAB_IDS[number]
const activeTab = ref<Tab>('discovery')

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Labo' },
]

function setKeyword() {
  const trimmed = keywordInput.value.trim()
  if (trimmed.length < 2) return

  log.info(`[LaboView] Keyword set: "${trimmed}"`)

  // Reset stores for new keyword
  intentStore.reset()
  localStore.reset()
  resetDiscovery()

  activeKeyword.value = trimmed
  activeTab.value = 'discovery'
}

function handleExplore(keyword: string) {
  intentStore.exploreKeyword(keyword)
}
</script>

<template>
  <div class="labo-view">
    <Breadcrumb :items="breadcrumbItems" />

    <!-- Search bar -->
    <div class="labo-search">
      <div class="search-row">
        <input
          v-model="keywordInput"
          type="text"
          class="search-input"
          placeholder="Saisissez un mot-clé libre (ex: erp cloud pme)"
          @keydown.enter="setKeyword"
        />
        <button class="search-btn" :disabled="keywordInput.trim().length < 2" @click="setKeyword">
          Rechercher
        </button>
      </div>
      <p v-if="activeKeyword" class="active-keyword">
        Mot-clé actif : <strong>{{ activeKeyword }}</strong>
      </p>
    </div>

    <!-- Gate message -->
    <div v-if="!activeKeyword" class="labo-gate">
      <p class="labo-gate-message">Saisissez un mot-clé pour commencer la recherche libre.</p>
    </div>

    <!-- Tab navigation -->
    <nav v-if="activeKeyword" class="labo-tabs">
      <button
        v-for="tab in TAB_IDS"
        :key="tab"
        class="labo-tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'discovery' ? 'Discovery' : tab === 'douleur' ? 'Douleur' : tab === 'exploration' ? 'Exploration' : 'Local' }}
      </button>
    </nav>

    <!-- Tab content -->
    <template v-if="activeKeyword">
      <div v-if="activeTab === 'discovery'" class="tab-content">
        <KeywordDiscoveryTab
          mode="libre"
          :pilier-keyword="activeKeyword"
          :article-title="''"
          :article-keyword="activeKeyword"
          :article-pain-point="''"
          :cocoon-name="''"
        />
      </div>

      <div v-if="activeTab === 'douleur'" class="tab-content">
        <PainTranslator
          mode="libre"
          :suggested-keyword="activeKeyword"
          @explore="handleExplore"
        />
      </div>

      <div v-if="activeTab === 'exploration'" class="tab-content">
        <ExplorationInput mode="libre" :default-keyword="activeKeyword" @explore="handleExplore" />
        <template v-if="intentStore.explorationKeyword">
          <AutocompleteValidation mode="libre" :keyword="intentStore.explorationKeyword" @explore-keyword="handleExplore" />
          <IntentStep mode="libre" :keyword="intentStore.explorationKeyword" />
          <ExplorationVerdict mode="libre" />
        </template>
      </div>

      <div v-if="activeTab === 'local'" class="tab-content">
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
.labo-view {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* --- Search --- */
.labo-search {
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
.labo-gate {
  padding: 2rem;
  text-align: center;
  background: var(--color-block-info-bg);
  border: 1px solid var(--color-block-info-border);
  border-radius: 8px;
}

.labo-gate-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text);
}

/* --- Tabs --- */
.labo-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.labo-tab {
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

.labo-tab:hover {
  color: var(--color-primary);
}

.labo-tab.active {
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
