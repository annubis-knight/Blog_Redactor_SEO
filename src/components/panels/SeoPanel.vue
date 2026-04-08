<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSeoStore } from '@/stores/seo.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import SeoChecklist from '@/components/panels/SeoChecklist.vue'
import NlpTerms from '@/components/panels/NlpTerms.vue'
import KeywordListPanel from '@/components/panels/KeywordListPanel.vue'

const seoStore = useSeoStore()
const articleKeywordsStore = useArticleKeywordsStore()

type TabId = 'mots-clefs' | 'hierarchie' | 'balises' | 'checklist' | 'facteurs'

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: 'mots-clefs', label: 'Mots-clefs' },
  { id: 'hierarchie', label: 'Hiérarchie' },
  { id: 'balises', label: 'Balises' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'facteurs', label: 'Facteurs' },
]

const activeTab = ref<TabId>('mots-clefs')
const visitedTabs = ref<Partial<Record<TabId, boolean>>>({ 'mots-clefs': true })
watch(activeTab, (tab) => { visitedTabs.value[tab] = true })

type KeywordCategory = 'capitaine' | 'lieutenants' | 'lexique' | 'nlp'
const keywordCategory = ref<KeywordCategory>('capitaine')

const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  capitaine: 'Capitaine',
  lieutenants: 'Lieutenants',
  lexique: 'Lexique',
  nlp: 'Termes NLP',
}

const currentKeywords = computed(() => {
  const kw = articleKeywordsStore.keywords
  if (!kw) return []
  switch (keywordCategory.value) {
    case 'capitaine': return kw.capitaine ? [kw.capitaine] : []
    case 'lieutenants': return kw.lieutenants ?? []
    case 'lexique': return kw.lexique ?? []
    default: return []
  }
})

const currentKeywordLabel = computed(() => CATEGORY_LABELS[keywordCategory.value])

const hasScore = computed(() => !!seoStore.score)
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
      <span class="word-count" title="Nombre total de mots dans le contenu de l'article">{{ seoStore.score ? `${seoStore.score.wordCount} mots` : '- mots' }}</span>
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
        <select v-model="keywordCategory" class="keyword-select" :disabled="!hasScore">
          <option value="capitaine">Capitaine</option>
          <option value="lieutenants">Lieutenants</option>
          <option value="lexique">Lexique</option>
          <option value="nlp">Termes NLP</option>
        </select>

        <template v-if="!hasScore">
          <span class="na-text">N/A</span>
        </template>
        <template v-else-if="keywordCategory === 'nlp'">
          <NlpTerms :terms="seoStore.score!.nlpTerms" />
        </template>
        <template v-else>
          <div v-if="!articleKeywordsStore.hasKeywords" class="panel-warning">
            Aucun mot-clé défini. Configurez le Capitaine dans le Moteur.
          </div>
          <KeywordListPanel
            v-else
            :keywords="currentKeywords"
            :label="currentKeywordLabel"
          />
        </template>
      </div>

      <!-- Hiérarchie -->
      <div
        v-if="visitedTabs['hierarchie']"
        v-show="activeTab === 'hierarchie'"
        id="seo-tabpanel-hierarchie"
        role="tabpanel"
        class="tab-panel"
      >
        <template v-if="seoStore.score">
          <div v-if="seoStore.score.headingValidation.isValid" class="validation-ok">
            &#10003; Hiérarchie valide
          </div>
          <ul v-else class="validation-errors">
            <li v-for="(err, i) in seoStore.score.headingValidation.errors" :key="i" class="validation-error">
              {{ err.message }}
            </li>
          </ul>
        </template>
        <span v-else class="na-text">N/A</span>
      </div>

      <!-- Balises -->
      <div
        v-if="visitedTabs['balises']"
        v-show="activeTab === 'balises'"
        id="seo-tabpanel-balises"
        role="tabpanel"
        class="tab-panel"
      >
        <template v-if="seoStore.score">
          <div class="meta-item" title="Longueur optimale du meta title : 50–60 caractères. Le Capitaine doit y figurer.">
            <span class="meta-label">Title</span>
            <span :class="seoStore.score.metaAnalysis.titleInRange ? 'meta-ok' : 'meta-warn'">
              {{ seoStore.score.metaAnalysis.titleLength }} car.
              <span class="meta-range">(50–60)</span>
            </span>
          </div>
          <div class="meta-item" title="Longueur optimale de la meta description : 150–160 caractères. Le Capitaine doit y figurer.">
            <span class="meta-label">Description</span>
            <span :class="seoStore.score.metaAnalysis.descriptionInRange ? 'meta-ok' : 'meta-warn'">
              {{ seoStore.score.metaAnalysis.descriptionLength }} car.
              <span class="meta-range">(150–160)</span>
            </span>
          </div>
        </template>
        <template v-else>
          <div class="meta-item">
            <span class="meta-label">Title</span>
            <span class="na-text">-</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Description</span>
            <span class="na-text">-</span>
          </div>
        </template>
      </div>

      <!-- Checklist -->
      <div
        v-if="visitedTabs['checklist']"
        v-show="activeTab === 'checklist'"
        id="seo-tabpanel-checklist"
        role="tabpanel"
        class="tab-panel"
      >
        <SeoChecklist
          v-if="seoStore.score && seoStore.score.checklistItems.length > 0"
          :items="seoStore.score.checklistItems"
          :has-article-keywords="seoStore.score.hasArticleKeywords"
        />
        <span v-else class="na-text">{{ seoStore.score ? 'Aucun élément' : 'N/A' }}</span>
      </div>

      <!-- Facteurs -->
      <div
        v-if="visitedTabs['facteurs']"
        v-show="activeTab === 'facteurs'"
        id="seo-tabpanel-facteurs"
        role="tabpanel"
        class="tab-panel"
      >
        <div class="factor-list">
          <div class="factor-item" title="Score de densité du Capitaine. Cible : 1.5%–2.5%. Poids : 25%.">
            <span>Mot-clé pilier</span>
            <span class="factor-score" :class="{ 'na-text': !seoStore.score }">{{ seoStore.score?.factors.keywordPilierScore ?? '-' }}</span>
          </div>
          <div class="factor-item" title="Score moyen de densité des Lieutenants. Cible : 0.8%–1.5%. Poids : 15%.">
            <span>Mots-clés secondaires</span>
            <span class="factor-score" :class="{ 'na-text': !seoStore.score }">{{ seoStore.score?.factors.keywordSecondaryScore ?? '-' }}</span>
          </div>
          <div class="factor-item" title="1 seul H1, pas de sauts de niveau (H1→H2→H3). Poids : 20%.">
            <span>Hiérarchie Hn</span>
            <span class="factor-score" :class="{ 'na-text': !seoStore.score }">{{ seoStore.score?.factors.headingScore ?? '-' }}</span>
          </div>
          <div class="factor-item" title="Longueur 50–60 car. + présence du Capitaine. Poids : 15%.">
            <span>Meta title</span>
            <span class="factor-score" :class="{ 'na-text': !seoStore.score }">{{ seoStore.score?.factors.metaTitleScore ?? '-' }}</span>
          </div>
          <div class="factor-item" title="Longueur 150–160 car. + présence du Capitaine. Poids : 10%.">
            <span>Meta description</span>
            <span class="factor-score" :class="{ 'na-text': !seoStore.score }">{{ seoStore.score?.factors.metaDescriptionScore ?? '-' }}</span>
          </div>
          <div class="factor-item" title="Progression vers l'objectif de longueur du contenu en nombre de mots. Poids : 15%.">
            <span>Longueur contenu</span>
            <span class="factor-score" :class="{ 'na-text': !seoStore.score }">{{ seoStore.score?.factors.contentLengthScore ?? '-' }}</span>
          </div>
        </div>
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
  gap: 0.5rem;
}

.word-count {
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
  padding: 0.375rem 0.5rem;
  font-size: 0.6875rem;
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

/* --- Keyword select --- */
.keyword-select {
  width: 100%;
  padding: 0.25rem 0.375rem;
  font-size: 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--color-bg, #fff);
  color: var(--color-text, #1f2937);
  margin-bottom: 0.5rem;
}

.keyword-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Validation --- */
.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #6b7280);
  margin: 0 0 0.5rem;
}

.validation-ok {
  color: var(--color-success);
  font-weight: 500;
}

.validation-errors {
  list-style: none;
  padding: 0;
  margin: 0;
}

.validation-error {
  padding: 0.25rem 0;
  color: var(--color-error);
  font-size: 0.75rem;
}

.validation-error::before {
  content: '\2717 ';
}

/* --- Meta --- */
.meta-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.meta-label {
  font-weight: 500;
}

.meta-ok {
  color: var(--color-success);
}

.meta-warn {
  color: var(--color-warning);
}

.meta-range {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* --- Factors --- */
.factor-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.factor-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.factor-score {
  font-weight: 600;
  min-width: 2rem;
  text-align: right;
}

.na-text {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-style: italic;
}
</style>
