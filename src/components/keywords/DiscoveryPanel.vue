<script setup lang="ts">
import { ref } from 'vue'
import { log } from '@/utils/logger'
import { useKeywordDiscoveryStore } from '@/stores/keyword-discovery.store'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'
import { useKeywordScoring } from '@/composables/useKeywordScoring'
import type { ClassifiedKeyword } from '../../../shared/types/index.js'
import ApiCostBadge from '@/components/shared/ApiCostBadge.vue'

const props = defineProps<{
  cocoonName: string
}>()

const emit = defineEmits<{
  keywordAdded: []
}>()

const discoveryStore = useKeywordDiscoveryStore()
const auditStore = useKeywordAuditStore()
const { getScoreColor } = useKeywordScoring()

const searchMode = ref<'seed' | 'domain'>('seed')
const seedInput = ref('')
const domainInput = ref('')
const selected = ref<Set<string>>(new Set())

async function handleSearch() {
  selected.value.clear()
  if (searchMode.value === 'seed' && seedInput.value.trim()) {
    await discoveryStore.discoverFromSeed(seedInput.value.trim())
  } else if (searchMode.value === 'domain' && domainInput.value.trim()) {
    await discoveryStore.discoverFromDomain(domainInput.value.trim())
  }
}

function toggleSelect(keyword: string) {
  if (selected.value.has(keyword)) {
    selected.value.delete(keyword)
  } else {
    selected.value.add(keyword)
  }
}

function toggleSelectAll() {
  if (selected.value.size === discoveryStore.filteredResults.length) {
    selected.value.clear()
  } else {
    selected.value = new Set(discoveryStore.filteredResults.map(k => k.keyword))
  }
}

const adding = ref(false)

async function addSelectedToCocoon() {
  if (selected.value.size === 0) return
  adding.value = true
  log.info('Adding discovered keywords to cocoon', { count: selected.value.size, cocoon: props.cocoonName })
  try {
    for (const keyword of selected.value) {
      const kw = discoveryStore.results.find(r => r.keyword === keyword)
      if (!kw) continue
      await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw.keyword, cocoonName: props.cocoonName, type: kw.type }),
      })
    }
    log.info('Keywords added to cocoon', { count: selected.value.size })
    selected.value.clear()
    emit('keywordAdded')
  } catch (err) {
    log.error('Failed to add keywords to cocoon', { cocoon: props.cocoonName, error: (err as Error).message })
  } finally {
    adding.value = false
  }
}

function formatIntent(intent?: string): string {
  if (!intent) return '—'
  const map: Record<string, string> = {
    informational: 'Info',
    navigational: 'Nav',
    commercial: 'Comm',
    transactional: 'Trans',
  }
  return map[intent] ?? intent
}
</script>

<template>
  <div class="discovery-panel">
    <div class="discovery-header">
      <h3 class="discovery-title">Découverte de mots-clés</h3>
      <ApiCostBadge v-if="discoveryStore.apiCost > 0" :cost="discoveryStore.apiCost" />
    </div>

    <!-- Search form -->
    <div class="discovery-search">
      <div class="search-mode-toggle">
        <button
          :class="['mode-btn', { active: searchMode === 'seed' }]"
          @click="searchMode = 'seed'"
        >
          Par mot-clé
        </button>
        <button
          :class="['mode-btn', { active: searchMode === 'domain' }]"
          @click="searchMode = 'domain'"
        >
          Par domaine concurrent
        </button>
      </div>
      <div class="search-input-row">
        <input
          v-if="searchMode === 'seed'"
          v-model="seedInput"
          type="text"
          placeholder="Ex: refonte site web"
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <input
          v-else
          v-model="domainInput"
          type="text"
          placeholder="Ex: competitor.com"
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <button
          class="btn-discover"
          :disabled="discoveryStore.loading"
          @click="handleSearch"
        >
          {{ discoveryStore.loading ? 'Recherche...' : 'Découvrir' }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="discoveryStore.results.length > 0" class="discovery-filters">
      <select v-model="discoveryStore.typeFilter" class="filter-select">
        <option :value="null">Tous les types</option>
        <option value="Pilier">Pilier</option>
        <option value="Moyenne traine">Moyenne traîne</option>
        <option value="Longue traine">Longue traîne</option>
      </select>
      <select v-model="discoveryStore.intentFilter" class="filter-select">
        <option :value="null">Tous les intents</option>
        <option v-for="intent in discoveryStore.intents" :key="intent" :value="intent">
          {{ intent }}
        </option>
      </select>
      <div class="filter-range">
        <label>Vol. min</label>
        <input v-model.number="discoveryStore.minVolume" type="number" min="0" class="filter-number" />
      </div>
      <div class="filter-range">
        <label>Diff. max</label>
        <input v-model.number="discoveryStore.maxDifficulty" type="number" min="0" max="100" class="filter-number" />
      </div>
      <div class="filter-range">
        <label>Score min</label>
        <input v-model.number="discoveryStore.minScore" type="number" min="0" max="100" class="filter-number" />
      </div>
      <button class="btn-reset-filters" @click="discoveryStore.resetFilters">
        Réinitialiser
      </button>
    </div>

    <!-- Stats -->
    <div v-if="discoveryStore.results.length > 0" class="discovery-stats">
      <span>{{ discoveryStore.totalBeforeDedup }} trouvés</span>
      <span class="stats-sep">&rarr;</span>
      <span>{{ discoveryStore.totalAfterDedup }} après dédup</span>
      <span class="stats-sep">&middot;</span>
      <span>{{ discoveryStore.filteredResults.length }} affichés</span>
    </div>

    <!-- Add selected button -->
    <div v-if="selected.size > 0" class="discovery-actions">
      <button
        class="btn-add-selected"
        :disabled="adding"
        @click="addSelectedToCocoon"
      >
        {{ adding ? 'Ajout...' : `Ajouter ${selected.size} mot(s)-clé(s) au cocon` }}
      </button>
    </div>

    <!-- Error -->
    <p v-if="discoveryStore.error" class="discovery-error">{{ discoveryStore.error }}</p>

    <!-- Results table -->
    <div v-if="discoveryStore.filteredResults.length > 0" class="discovery-table-wrapper">
      <table class="discovery-table">
        <thead>
          <tr>
            <th class="col-check">
              <input
                type="checkbox"
                :checked="selected.size === discoveryStore.filteredResults.length && selected.size > 0"
                @change="toggleSelectAll"
              />
            </th>
            <th>Mot-clé</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Diff.</th>
            <th>CPC</th>
            <th>Intent</th>
            <th>Score</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="kw in discoveryStore.filteredResults"
            :key="kw.keyword"
            :class="{ 'exists-in-cocoon': kw.existsInCocoon }"
          >
            <td class="col-check">
              <input
                type="checkbox"
                :checked="selected.has(kw.keyword)"
                :disabled="kw.existsInCocoon"
                @change="toggleSelect(kw.keyword)"
              />
            </td>
            <td class="col-keyword">
              {{ kw.keyword }}
              <span v-if="kw.existsInCocoon" class="badge-exists">déjà ajouté</span>
            </td>
            <td>
              <select
                class="type-select"
                :data-type="kw.type"
                :value="kw.type"
                @change="discoveryStore.updateKeywordType(kw.keyword, ($event.target as HTMLSelectElement).value as any)"
              >
                <option value="Pilier">Pilier</option>
                <option value="Moyenne traine">Moyenne traîne</option>
                <option value="Longue traine">Longue traîne</option>
              </select>
            </td>
            <td class="col-number">{{ kw.searchVolume.toLocaleString() }}</td>
            <td class="col-number">{{ kw.difficulty }}</td>
            <td class="col-number">{{ kw.cpc.toFixed(2) }}€</td>
            <td>
              <span class="badge-intent" :data-intent="kw.intent">{{ formatIntent(kw.intent) }}</span>
            </td>
            <td class="col-score">
              <span class="score-value" :style="{ color: getScoreColor(kw.compositeScore.total) }">
                {{ kw.compositeScore.total }}
              </span>
            </td>
            <td>
              <span class="badge-source">{{ kw.source }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else-if="!discoveryStore.loading && discoveryStore.results.length === 0 && (discoveryStore.seed || discoveryStore.domain)" class="discovery-empty">
      <p>Aucun mot-clé trouvé. Essayez un autre terme de recherche.</p>
    </div>
  </div>
</template>

<style scoped>
.discovery-panel {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.discovery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.discovery-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.discovery-search {
  margin-bottom: 1rem;
}

.search-mode-toggle {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.mode-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.15s;
}

.mode-btn.active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.search-input-row {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-discover {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-discover:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-discover:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.discovery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.filter-select {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
}

.filter-range {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.filter-range label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.filter-number {
  width: 60px;
  padding: 0.375rem 0.375rem;
  font-size: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
}

.btn-reset-filters {
  padding: 0.375rem 0.5rem;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
}

.btn-reset-filters:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.discovery-stats {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.stats-sep {
  color: var(--color-border);
}

.discovery-actions {
  margin-bottom: 0.75rem;
}

.btn-add-selected {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-success);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-add-selected:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-add-selected:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.discovery-error {
  color: var(--color-danger);
  font-size: 0.8125rem;
  margin: 0.5rem 0;
}

.discovery-table-wrapper {
  overflow-x: auto;
}

.discovery-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.discovery-table th,
.discovery-table td {
  padding: 0.5rem 0.625rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.discovery-table th {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.col-check {
  width: 32px;
}

.col-keyword {
  font-weight: 500;
}

.col-number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-score {
  text-align: right;
}

.score-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.type-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 0.125rem 1.25rem 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  background:
    var(--color-primary-soft)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
    no-repeat right 0.3rem center;
  color: var(--color-primary);
  transition: border-color 0.15s;
}

.type-select:hover {
  border-color: var(--color-primary);
}

.type-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.type-select[data-type="Pilier"] {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
}

.type-select[data-type="Moyenne traine"] {
  background-color: var(--color-warning-soft, #fef3c7);
  color: var(--color-warning, #d97706);
}

.type-select[data-type="Longue traine"] {
  background-color: var(--color-success-soft, #d1fae5);
  color: var(--color-success, #059669);
}

.badge-intent {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}

.badge-source {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.badge-exists {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-left: 0.25rem;
}

.exists-in-cocoon {
  opacity: 0.5;
}

.discovery-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}
</style>
