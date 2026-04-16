<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSeoStore } from '@/stores/seo.store'
import { useBriefStore } from '@/stores/brief.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useCannibalization } from '@/composables/seo/useCannibalization'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import KeywordsTab from '@/components/panels/KeywordsTab.vue'
import IndicatorsTab from '@/components/panels/indicators/IndicatorsTab.vue'
import SerpDataTab from '@/components/panels/SerpDataTab.vue'

const props = withDefaults(defineProps<{
  articleSlug?: string
  articleId?: number
  cocoonName?: string
}>(), {
  articleSlug: '',
  articleId: 0,
  cocoonName: '',
})

const seoStore = useSeoStore()
const briefStore = useBriefStore()
const articleKeywordsStore = useArticleKeywordsStore()

// Cannibalization detection
const articleIdRef = computed(() => props.articleId || briefStore.briefData?.article?.id || 0)
const cocoonRef = computed(() => props.cocoonName || briefStore.briefData?.article?.cocoonName || '')
const { warnings: cannibalizationWarnings } = useCannibalization(articleIdRef, cocoonRef)

// Content length target
const contentLengthTarget = computed(() => briefStore.briefData?.contentLengthRecommendation ?? 1500)

// Tab management
type TabId = 'mots-clefs' | 'indicateurs' | 'serp-data'

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: 'mots-clefs', label: 'Mots-clefs' },
  { id: 'indicateurs', label: 'Indicateurs' },
  { id: 'serp-data', label: 'SERP Data' },
]

const activeTab = ref<TabId>('indicateurs')
const visitedTabs = ref<Partial<Record<TabId, boolean>>>({ indicateurs: true })
watch(activeTab, (tab) => { visitedTabs.value[tab] = true })

// SERP Data
const serpData = computed(() => briefStore.briefData?.dataForSeo ?? null)
</script>

<template>
  <div class="seo-panel">
    <h3 class="panel-title">SEO</h3>

    <!-- Article keywords warning -->
    <div v-if="seoStore.score && !seoStore.score.hasArticleKeywords" class="panel-warning">
      Aucun mot-clé article défini. Configurez le Capitaine et les Lieutenants dans le Moteur.
    </div>

    <!-- Global Score -->
    <div class="panel-section score-section" title="Score SEO global calculé à partir de 6 facteurs pondérés (100 = optimal)">
      <ScoreGauge :score="seoStore.score?.global ?? 0" label="SEO" />
      <div class="score-meta">
        <span class="word-count" title="Nombre total de mots dans le contenu de l'article">
          {{ seoStore.score ? `${seoStore.score.wordCount} mots` : '- mots' }}
        </span>
        <span v-if="seoStore.score" class="reading-time" title="Temps de lecture estimé à 200 mots/min">
          ~{{ seoStore.score.readingTimeMinutes }} min
        </span>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="seo-tabs" role="tablist">
      <button
        v-for="tab in TAB_DEFS"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`seo-tabpanel-${tab.id}`"
        class="seo-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab content -->
    <div class="tab-content">
      <!-- Mots-clefs -->
      <div
        v-if="visitedTabs['mots-clefs']"
        v-show="activeTab === 'mots-clefs'"
        id="seo-tabpanel-mots-clefs"
        role="tabpanel"
        class="tab-panel"
      >
        <KeywordsTab />
      </div>

      <!-- Indicateurs -->
      <div
        v-if="visitedTabs['indicateurs']"
        v-show="activeTab === 'indicateurs'"
        id="seo-tabpanel-indicateurs"
        role="tabpanel"
        class="tab-panel"
      >
        <IndicatorsTab
          :cannibalization-warnings="cannibalizationWarnings"
          :content-length-target="contentLengthTarget"
        />
      </div>

      <!-- SERP Data -->
      <div
        v-if="visitedTabs['serp-data']"
        v-show="activeTab === 'serp-data'"
        id="seo-tabpanel-serp-data"
        role="tabpanel"
        class="tab-panel"
      >
        <SerpDataTab
          :data="serpData"
          :is-refreshing="briefStore.isRefreshing"
          @refresh="briefStore.refreshDataForSeo()"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.seo-panel {
  padding: 1rem;
  font-size: 0.8125rem;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.panel-warning {
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-warning-text, #92400e);
  background: var(--color-warning-bg, #fffbeb);
  border: 1px solid var(--color-warning-border, #fde68a);
  border-radius: 6px;
}

.panel-section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.score-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.word-count,
.reading-time {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

/* --- Tab bar --- */
.seo-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  margin-bottom: 0.75rem;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.seo-tabs::-webkit-scrollbar {
  display: none;
}

.seo-tab {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted, #6b7280);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.seo-tab:hover {
  color: var(--color-text, #1f2937);
}

.seo-tab.active {
  color: var(--color-primary, #2563eb);
  border-bottom-color: var(--color-primary, #2563eb);
}

/* --- Tab content --- */
.tab-content {
  min-height: 3rem;
}

.tab-panel {
  padding-top: 0.5rem;
}
</style>
