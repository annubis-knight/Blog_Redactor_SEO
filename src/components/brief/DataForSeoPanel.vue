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
  <section class="dataforseo-panel">
    <div class="panel-header">
      <h3 class="section-title">Données DataForSEO</h3>
      <button class="refresh-btn" :disabled="isRefreshing" @click="emit('refresh')">
        <span v-if="isRefreshing">Rafraîchissement...</span>
        <span v-else>Rafraîchir les données SEO</span>
      </button>
    </div>

    <div v-if="!data" class="no-data">
      Aucune donnée DataForSEO disponible. Cliquez sur "Rafraîchir" pour lancer l'analyse.
    </div>

    <template v-else>
      <!-- Keyword Overview -->
      <div class="overview-cards">
        <div class="overview-card">
          <span class="card-label">Volume</span>
          <span class="card-value">{{ data.keywordData.searchVolume.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="overview-card">
          <span class="card-label">Difficulté</span>
          <span class="card-value">{{ data.keywordData.difficulty }}/100</span>
        </div>
        <div class="overview-card">
          <span class="card-label">CPC</span>
          <span class="card-value">{{ data.keywordData.cpc.toFixed(2) }} €</span>
        </div>
        <div class="overview-card">
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
          <table class="serp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Titre</th>
                <th>Domaine</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="result in data.serp" :key="result.position">
                <td class="position">{{ result.position }}</td>
                <td>
                  <a :href="result.url" target="_blank" rel="noopener" class="serp-link">{{ result.title }}</a>
                </td>
                <td class="domain">{{ result.domain }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAA -->
      <div class="collapsible" :class="{ open: expandedSection === 'paa' }">
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
      <div class="collapsible" :class="{ open: expandedSection === 'related' }">
        <button class="collapsible-header" @click="toggleSection('related')">
          <span>Mots-clés associés ({{ data.relatedKeywords.length }})</span>
          <span class="toggle-icon">{{ expandedSection === 'related' ? '−' : '+' }}</span>
        </button>
        <div v-if="expandedSection === 'related'" class="collapsible-body">
          <table class="related-table">
            <thead>
              <tr>
                <th>Mot-clé</th>
                <th>Volume</th>
                <th>Concurrence</th>
                <th>CPC</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="kw in data.relatedKeywords" :key="kw.keyword">
                <td>{{ kw.keyword }}</td>
                <td class="number">{{ kw.searchVolume.toLocaleString('fr-FR') }}</td>
                <td class="number">{{ (kw.competition * 100).toFixed(0) }}%</td>
                <td class="number">{{ kw.cpc.toFixed(2) }} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="cache-info">Données mises en cache le {{ new Date(data.cachedAt).toLocaleDateString('fr-FR') }}</p>
    </template>
  </section>
</template>

<style scoped>
.dataforseo-panel {
  margin-bottom: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.refresh-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-data {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.overview-card {
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  text-align: center;
}

.card-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.card-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}

.collapsible {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.collapsible.open {
  border-color: var(--color-primary);
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.collapsible-header:hover {
  background: var(--color-border);
}

.toggle-icon {
  font-size: 1.125rem;
  line-height: 1;
}

.collapsible-body {
  padding: 0.75rem 1rem;
}

.serp-table,
.related-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.serp-table th,
.serp-table td,
.related-table th,
.related-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.serp-table th,
.related-table th {
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.position {
  font-weight: 600;
  color: var(--color-primary);
  width: 2rem;
}

.domain {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.serp-link {
  color: var(--color-primary);
  text-decoration: none;
}

.serp-link:hover {
  text-decoration: underline;
}

.number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.paa-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.paa-item:last-child {
  border-bottom: none;
}

.paa-question {
  margin: 0;
  font-weight: 500;
  color: var(--color-text);
}

.paa-answer {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.cache-info {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: right;
}
</style>
