<script setup lang="ts">
import { ref } from 'vue'
import type { DataForSeoCacheEntry } from '@shared/types/index.js'

defineProps<{
  data: DataForSeoCacheEntry | null
  isRefreshing: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const expandedSection = ref<string | null>(null)

function toggleSection(section: string) {
  expandedSection.value = expandedSection.value === section ? null : section
}
</script>

<template>
  <div class="serp-data-tab">
    <div v-if="!data" class="no-data">
      <p>Aucune donnée SERP disponible.</p>
      <button class="refresh-btn" :disabled="isRefreshing" @click="emit('refresh')">
        {{ isRefreshing ? 'Chargement...' : 'Lancer l\'analyse SERP' }}
      </button>
    </div>

    <template v-else>
      <!-- Overview cards -->
      <div class="overview-grid">
        <div class="overview-card" title="Volume de recherche mensuel estimé pour ce mot-clé">
          <span class="card-label">Volume</span>
          <span class="card-value">{{ data.keywordData.searchVolume.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="overview-card" title="Difficulté SEO : 0 = facile, 100 = très compétitif">
          <span class="card-label">Difficulté</span>
          <span class="card-value">{{ data.keywordData.difficulty }}/100</span>
        </div>
        <div class="overview-card" title="Coût par clic moyen en publicité Google Ads">
          <span class="card-label">CPC</span>
          <span class="card-value">{{ data.keywordData.cpc.toFixed(2) }} &euro;</span>
        </div>
        <div class="overview-card" title="Niveau de concurrence publicitaire : 0% = aucun, 100% = très fort">
          <span class="card-label">Concurrence</span>
          <span class="card-value">{{ (data.keywordData.competition * 100).toFixed(0) }}%</span>
        </div>
      </div>

      <!-- SERP Top 10 -->
      <div class="collapsible" :class="{ open: expandedSection === 'serp' }">
        <button class="collapsible-header" @click="toggleSection('serp')">
          <span>SERP Top {{ data.serp.length }}</span>
          <span class="toggle-icon">{{ expandedSection === 'serp' ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedSection === 'serp'" class="collapsible-body">
          <div v-for="result in data.serp" :key="result.position" class="serp-item">
            <span class="serp-pos">{{ result.position }}</span>
            <div class="serp-info">
              <a :href="result.url" target="_blank" rel="noopener" class="serp-title">{{ result.title }}</a>
              <span class="serp-domain">{{ result.domain }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PAA -->
      <div v-if="data.paa.length > 0" class="collapsible" :class="{ open: expandedSection === 'paa' }">
        <button class="collapsible-header" @click="toggleSection('paa')">
          <span>People Also Ask ({{ data.paa.length }})</span>
          <span class="toggle-icon">{{ expandedSection === 'paa' ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedSection === 'paa'" class="collapsible-body">
          <div v-for="(item, idx) in data.paa" :key="idx" class="paa-item">
            <p class="paa-question">{{ item.question }}</p>
            <p v-if="item.answer" class="paa-answer">{{ item.answer }}</p>
          </div>
        </div>
      </div>

      <!-- Related Keywords -->
      <div v-if="data.relatedKeywords.length > 0" class="collapsible" :class="{ open: expandedSection === 'related' }">
        <button class="collapsible-header" @click="toggleSection('related')">
          <span>Mots-clés associés ({{ data.relatedKeywords.length }})</span>
          <span class="toggle-icon">{{ expandedSection === 'related' ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedSection === 'related'" class="collapsible-body">
          <div v-for="kw in data.relatedKeywords" :key="kw.keyword" class="related-item">
            <span class="related-kw">{{ kw.keyword }}</span>
            <span class="related-vol">{{ kw.searchVolume.toLocaleString('fr-FR') }}</span>
          </div>
        </div>
      </div>

      <!-- Refresh & Cache info -->
      <div class="footer">
        <button class="refresh-btn-sm" :disabled="isRefreshing" @click="emit('refresh')">
          {{ isRefreshing ? '...' : 'Rafraîchir' }}
        </button>
        <span class="cache-info">{{ new Date(data.cachedAt).toLocaleDateString('fr-FR') }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.serp-data-tab {
  padding-top: 0.25rem;
}

.no-data {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-muted, #6b7280);
  font-size: 0.75rem;
}

.no-data p {
  margin: 0 0 0.5rem;
}

.refresh-btn {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  background: var(--color-primary, #2563eb);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Overview cards - compact 2x2 grid */
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.overview-card {
  padding: 0.375rem 0.5rem;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  text-align: center;
}

.card-label {
  display: block;
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #6b7280);
}

.card-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text, #1f2937);
}

/* Collapsible sections */
.collapsible {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  margin-bottom: 0.375rem;
  overflow: hidden;
}

.collapsible.open {
  border-color: var(--color-primary, #2563eb);
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.375rem 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text, #1f2937);
}

.collapsible-header:hover {
  background: var(--color-bg-hover, #f9fafb);
}

.toggle-icon {
  font-size: 0.875rem;
  line-height: 1;
}

.collapsible-body {
  padding: 0.375rem 0.625rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  max-height: 200px;
  overflow-y: auto;
}

/* SERP items */
.serp-item {
  display: flex;
  gap: 0.375rem;
  padding: 0.25rem 0;
  align-items: flex-start;
}

.serp-item + .serp-item {
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.serp-pos {
  font-weight: 700;
  color: var(--color-primary, #2563eb);
  font-size: 0.6875rem;
  min-width: 1.25rem;
  flex-shrink: 0;
}

.serp-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.serp-title {
  font-size: 0.6875rem;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.serp-title:hover {
  text-decoration: underline;
}

.serp-domain {
  font-size: 0.5625rem;
  color: var(--color-text-muted, #6b7280);
}

/* PAA */
.paa-item {
  padding: 0.25rem 0;
}

.paa-item + .paa-item {
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.paa-question {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 500;
}

.paa-answer {
  margin: 0.125rem 0 0;
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
}

/* Related keywords */
.related-item {
  display: flex;
  justify-content: space-between;
  padding: 0.125rem 0;
  font-size: 0.6875rem;
}

.related-kw {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 65%;
}

.related-vol {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, #6b7280);
}

/* Footer */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.375rem;
}

.refresh-btn-sm {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  background: none;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-muted, #6b7280);
}

.refresh-btn-sm:hover:not(:disabled) {
  border-color: var(--color-primary, #2563eb);
  color: var(--color-primary, #2563eb);
}

.refresh-btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cache-info {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
}
</style>
