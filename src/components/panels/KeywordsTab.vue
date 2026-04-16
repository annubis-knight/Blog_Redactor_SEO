<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSeoStore } from '@/stores/article/seo.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import NlpTerms from '@/components/panels/NlpTerms.vue'
import SeoKeywordChip from '@/components/panels/SeoKeywordChip.vue'

const seoStore = useSeoStore()
const articleKeywordsStore = useArticleKeywordsStore()

type KeywordCategory = 'capitaine' | 'lieutenants' | 'lexique' | 'nlp'
const keywordCategory = ref<KeywordCategory>('capitaine')

const hasScore = computed(() => !!seoStore.score)

// --- Capitaine ---
const capitaineData = computed(() => {
  const score = seoStore.score
  const kw = articleKeywordsStore.keywords?.capitaine
  if (!score || !kw) return null
  const locations = score.checklistItems
    .filter(ci => ci.isPresent)
    .map(ci => ci.location)
  return { keyword: kw, detected: locations.length > 0, locations }
})

// --- Lieutenants ---
const lieutenantsData = computed(() => seoStore.score?.lieutenantPresence ?? [])
const lieutenantsSummary = computed(() => {
  const data = lieutenantsData.value
  if (data.length === 0) return ''
  const present = data.filter(d => d.detected).length
  return `${present}/${data.length} présents`
})

// --- Lexique ---
const lexiqueData = computed(() => seoStore.score?.lexiqueCoverage ?? null)
const lexiqueTermsSorted = computed(() => {
  if (!lexiqueData.value) return []
  return [...lexiqueData.value.terms].sort((a, b) => b.occurrences - a.occurrences)
})
const lexiqueSummary = computed(() => {
  const cov = lexiqueData.value
  if (!cov) return ''
  return `${cov.detected}/${cov.total} détectés`
})
</script>

<template>
  <div class="keywords-tab">
    <select v-model="keywordCategory" class="keyword-select" :disabled="!hasScore">
      <option value="capitaine">Capitaine</option>
      <option value="lieutenants">Lieutenants</option>
      <option value="lexique">Lexique</option>
      <option value="nlp">Termes NLP</option>
    </select>

    <template v-if="!hasScore">
      <span class="na-text">N/A</span>
    </template>

    <!-- NLP -->
    <template v-else-if="keywordCategory === 'nlp'">
      <NlpTerms :terms="seoStore.score!.nlpTerms" />
    </template>

    <!-- No article keywords warning -->
    <template v-else-if="!articleKeywordsStore.hasKeywords">
      <div class="panel-warning">
        Aucun mot-clé défini. Configurez le Capitaine dans le Moteur.
      </div>
    </template>

    <!-- Capitaine -->
    <template v-else-if="keywordCategory === 'capitaine'">
      <div v-if="capitaineData" class="chip-section">
        <div class="chip-summary">
          {{ capitaineData.detected ? `Présent dans : ${capitaineData.locations.length} zone${capitaineData.locations.length !== 1 ? 's' : ''}` : 'Non détecté' }}
        </div>
        <div class="chip-list">
          <SeoKeywordChip
            :keyword="capitaineData.keyword"
            :detected="capitaineData.detected"
            mode="presence"
            :locations="capitaineData.locations"
          />
        </div>
      </div>
      <div v-else class="chip-empty">Aucun capitaine défini</div>
    </template>

    <!-- Lieutenants -->
    <template v-else-if="keywordCategory === 'lieutenants'">
      <div v-if="lieutenantsData.length > 0" class="chip-section">
        <div class="chip-summary">{{ lieutenantsSummary }}</div>
        <div class="chip-list">
          <SeoKeywordChip
            v-for="lt in lieutenantsData"
            :key="lt.keyword"
            :keyword="lt.keyword"
            :detected="lt.detected"
            mode="presence"
            :locations="lt.locations"
          />
        </div>
      </div>
      <div v-else class="chip-empty">Aucun lieutenant défini</div>
    </template>

    <!-- Lexique -->
    <template v-else-if="keywordCategory === 'lexique'">
      <div v-if="lexiqueData" class="chip-section">
        <div class="chip-summary">{{ lexiqueSummary }}</div>
        <div class="chip-list">
          <SeoKeywordChip
            v-for="term in lexiqueTermsSorted"
            :key="term.term"
            :keyword="term.term"
            :detected="term.detected"
            mode="counter"
            :occurrences="term.occurrences"
            :recommended="term.recommended"
          />
        </div>
      </div>
      <div v-else class="chip-empty">Aucun terme lexique défini</div>
    </template>
  </div>
</template>

<style scoped>
.keywords-tab {
  padding-top: 0.25rem;
}

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

.panel-warning {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-warning-text, #92400e);
  background: var(--color-warning-bg, #fffbeb);
  border: 1px solid var(--color-warning-border, #fde68a);
  border-radius: 6px;
}

.na-text {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.75rem;
  font-style: italic;
}

.chip-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chip-summary {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 500;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.chip-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}
</style>
