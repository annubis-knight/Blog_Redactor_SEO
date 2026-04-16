<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKeywordDiscoveryTab } from '@/composables/keyword/useKeywordDiscoveryTab'
import { log } from '@/utils/logger'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import type { SelectedArticle } from '@shared/types/index.js'
import type { ArticleType } from '@shared/types/article.types.js'

// Discovery / Douleur
import KeywordDiscoveryTab from '@/components/moteur/KeywordDiscoveryTab.vue'
import PainTranslator from '@/components/intent/PainTranslator.vue'

// Verdict GO/NO-GO
import CaptainValidation from '@/components/moteur/CaptainValidation.vue'

const { reset: resetDiscovery } = useKeywordDiscoveryTab()

const keywordInput = ref('')
const activeKeyword = ref('')
const selectedType = ref<ArticleType>('Intermédiaire')

const TAB_IDS = ['discovery', 'douleur', 'capitaine'] as const
type Tab = typeof TAB_IDS[number]
const activeTab = ref<Tab>('discovery')

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Labo' },
]

const libreArticle = computed<SelectedArticle | null>(() => {
  if (!activeKeyword.value) return null
  return {
    id: 0,
    slug: '',
    title: '',
    keyword: activeKeyword.value,
    type: selectedType.value,
    locked: false,
    source: 'proposed',
  }
})

function setKeyword() {
  const trimmed = keywordInput.value.trim()
  if (trimmed.length < 2) return

  log.info(`[LaboView] Keyword set: "${trimmed}"`)

  resetDiscovery()

  activeKeyword.value = trimmed
  activeTab.value = 'discovery'
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
      <div v-if="activeKeyword" class="active-keyword-row">
        <p class="active-keyword">
          Mot-clé actif : <strong>{{ activeKeyword }}</strong>
        </p>
        <label class="type-selector">
          <span class="type-label">Type :</span>
          <select v-model="selectedType" class="type-select" data-testid="labo-type-select">
            <option value="Pilier">Pilier</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Spécialisé">Spécialisé</option>
          </select>
        </label>
      </div>
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
        {{ tab === 'discovery' ? 'Discovery' : tab === 'douleur' ? 'Douleur' : 'Verdict' }}
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
        />
      </div>

      <div v-if="activeTab === 'capitaine'" class="tab-content">
        <CaptainValidation mode="libre" :selected-article="libreArticle" />
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

.active-keyword-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.active-keyword {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.type-selector {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.type-label {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.type-select {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
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
</style>
