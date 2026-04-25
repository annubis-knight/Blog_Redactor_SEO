<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useLocalStore } from '@/stores/external/local.store'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'

const props = withDefaults(defineProps<{
  keyword: string
  articleId?: number | null
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
  articleId: null,
})

const emit = defineEmits<{
  continue: []
}>()

const localStore = useLocalStore()

const mapsData = computed(() => localStore.mapsData)
const reviewGap = computed(() => localStore.reviewGap)

const gapPercent = computed(() => {
  if (!reviewGap.value) return 0
  const target = reviewGap.value.averageCompetitorReviews
  if (target <= 0) return 100
  const ratio = reviewGap.value.myReviews / target
  return Math.min(100, Math.round(ratio * 100))
})

const gapColor = computed(() => {
  if (gapPercent.value >= 80) return 'var(--color-success)'
  if (gapPercent.value >= 50) return 'var(--color-warning)'
  return 'var(--color-error)'
})

watch(() => props.keyword, (newKw) => {
  if (newKw) {
    localStore.analyzeMaps(newKw, undefined, props.articleId ?? undefined)
  }
})

onMounted(() => {
  if (!localStore.mapsData && props.keyword) {
    localStore.analyzeMaps(props.keyword, undefined, props.articleId ?? undefined)
  }
})
</script>

<template>
  <section class="maps-step">
    <div class="step-header">
      <h2 class="step-title">Analyse Google Maps</h2>
      <p class="step-keyword">{{ keyword }}</p>
    </div>

    <LoadingSpinner v-if="localStore.isAnalyzingMaps" />

    <ErrorMessage
      v-if="localStore.mapsError && !localStore.isAnalyzingMaps"
      :message="localStore.mapsError"
      @retry="localStore.analyzeMaps(keyword, undefined, articleId ?? undefined)"
    />

    <template v-if="mapsData && !localStore.isAnalyzingMaps">
      <!-- Local Pack badge -->
      <div class="maps-badges">
        <span
          class="local-pack-badge"
          :class="mapsData.hasLocalPack ? 'pack-detected' : 'pack-absent'"
        >
          <span class="pack-dot"></span>
          Local Pack {{ mapsData.hasLocalPack ? 'detecte' : 'absent' }}
        </span>
        <span class="listing-count">
          {{ mapsData.listings.length }} etablissement{{ mapsData.listings.length > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- GBP Listings table -->
      <div class="table-wrapper">
        <table class="listings-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th>Nom</th>
              <th>Categorie</th>
              <th class="col-num">Note</th>
              <th class="col-num">Avis</th>
              <th class="col-status">Revendique</th>
              <th>Adresse</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="listing in mapsData.listings"
              :key="listing.position"
              :class="{ 'row-unclaimed': !listing.isClaimed }"
            >
              <td class="cell-rank">{{ listing.position }}</td>
              <td class="cell-name">
                <a
                  v-if="listing.url"
                  :href="listing.url"
                  target="_blank"
                  rel="noopener"
                  class="listing-link"
                >
                  {{ listing.title }}
                </a>
                <span v-else>{{ listing.title }}</span>
              </td>
              <td class="cell-category">{{ listing.category ?? '-' }}</td>
              <td class="cell-num">
                <span v-if="listing.rating !== null" class="rating">
                  {{ listing.rating.toFixed(1) }}
                </span>
                <span v-else class="no-data">-</span>
              </td>
              <td class="cell-num">{{ listing.votesCount }}</td>
              <td class="cell-status">
                <span
                  class="claimed-badge"
                  :class="listing.isClaimed ? 'claimed-yes' : 'claimed-no'"
                >
                  {{ listing.isClaimed ? 'Oui' : 'Non' }}
                </span>
              </td>
              <td class="cell-address">{{ listing.address ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Review Gap -->
      <div v-if="reviewGap" class="review-gap-section">
        <h3 class="section-label">Review Gap</h3>
        <div class="review-gap-row">
          <ScoreGauge :score="gapPercent" label="Avis" size="md" />
          <div class="review-gap-details">
            <p class="gap-summary">
              Vous avez <strong>{{ reviewGap.myReviews }}</strong> avis
              &mdash; Objectif : <strong>{{ reviewGap.averageCompetitorReviews }}</strong>
              <span class="gap-delta" :style="{ color: gapColor }">
                (gap : {{ reviewGap.gap > 0 ? '+' : '' }}{{ reviewGap.gap }})
              </span>
            </p>
            <div class="gap-bar-track">
              <div
                class="gap-bar-fill"
                :style="{ width: `${gapPercent}%`, background: gapColor }"
              ></div>
            </div>
            <p class="gap-objective">{{ reviewGap.objective }}</p>
          </div>
        </div>
      </div>

      <p class="cache-info">
        Donnees mises en cache le {{ new Date(mapsData.cachedAt).toLocaleDateString('fr-FR') }}
      </p>

      <!-- Continue -->
      <div class="step-actions">
        <button class="btn btn-primary" @click="emit('continue')">
          Continuer
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.maps-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-header {
  margin-bottom: 0.5rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 0.25rem;
}

.step-keyword {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

/* Badges */
.maps-badges {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.local-pack-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.pack-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pack-detected {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.pack-detected .pack-dot {
  background: var(--color-badge-green-text);
}

.pack-absent {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

.pack-absent .pack-dot {
  background: var(--color-badge-slate-text);
}

.listing-count {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.listings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.listings-table th {
  padding: 0.5rem 0.625rem;
  text-align: left;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.listings-table td {
  padding: 0.5rem 0.625rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.col-rank {
  width: 2rem;
}

.col-num {
  width: 3.5rem;
  text-align: right !important;
}

.col-status {
  width: 5rem;
  text-align: center !important;
}

.cell-rank {
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
}

.cell-name {
  font-weight: 500;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listing-link {
  color: var(--color-primary);
  text-decoration: none;
}

.listing-link:hover {
  text-decoration: underline;
}

.cell-category {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.cell-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.rating {
  font-weight: 600;
}

.no-data {
  color: var(--color-text-muted);
}

.cell-status {
  text-align: center;
}

.claimed-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.claimed-yes {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.claimed-no {
  background: #fee2e2;
  color: #991b1b;
}

.cell-address {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Unclaimed row highlight */
.row-unclaimed {
  background: #fefce8;
}

.row-unclaimed:hover {
  background: #fef9c3;
}

/* Review gap */
.review-gap-section {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.section-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}

.review-gap-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.review-gap-details {
  flex: 1;
}

.gap-summary {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.gap-delta {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.gap-bar-track {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.gap-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.gap-objective {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.cache-info {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: right;
}

/* Buttons */
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

.step-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
}
</style>
