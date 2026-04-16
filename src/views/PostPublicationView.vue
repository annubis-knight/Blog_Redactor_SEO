<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useGscStore } from '@/stores/external/gsc.store'
import AsyncContent from '@/components/shared/AsyncContent.vue'

const gscStore = useGscStore()

const siteUrl = ref(localStorage.getItem('gsc_site_url') ?? '')
const period = ref<'7' | '30' | '90'>('30')

const endDate = computed(() => new Date().toISOString().split('T')[0]!)
const startDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - parseInt(period.value))
  return d.toISOString().split('T')[0]!
})

// Group rows by page
const pageMetrics = computed(() => {
  if (!gscStore.performance?.rows) return []
  const map = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; count: number }>()
  for (const row of gscStore.performance.rows) {
    const page = row.keys[1] ?? row.keys[0]
    if (!page) continue
    const existing = map.get(page)
    if (existing) {
      existing.clicks += row.clicks
      existing.impressions += row.impressions
      existing.position += row.position
      existing.count++
    } else {
      map.set(page, { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position, count: 1 })
    }
  }
  return [...map.entries()].map(([page, m]) => ({
    page,
    clicks: m.clicks,
    impressions: m.impressions,
    ctr: m.count > 0 ? m.clicks / Math.max(m.impressions, 1) : 0,
    position: m.count > 0 ? Math.round(m.position / m.count * 10) / 10 : 0,
  })).sort((a, b) => b.clicks - a.clicks)
})

function saveSiteUrl() {
  localStorage.setItem('gsc_site_url', siteUrl.value)
}

async function fetchData() {
  if (!siteUrl.value) return
  saveSiteUrl()
  await gscStore.fetchPerformance(siteUrl.value, startDate.value, endDate.value)
}

function connectGsc() {
  window.open('/api/gsc/auth', '_blank')
}

onMounted(async () => {
  await gscStore.checkConnection()
  if (gscStore.isConnected && siteUrl.value) {
    await fetchData()
  }
})
</script>

<template>
  <div class="post-publication">
    <div class="page-header">
      <RouterLink to="/" class="back-link">&larr; Retour au dashboard</RouterLink>
      <h1>Post-Publication — Google Search Console</h1>
    </div>

    <div v-if="!gscStore.isConnected" class="connect-section">
      <p>Connectez votre Google Search Console pour voir les performances post-publication.</p>
      <button class="btn btn-primary" @click="connectGsc">Connecter Google Search Console</button>
      <button class="btn btn-secondary" style="margin-left: 0.5rem" @click="gscStore.checkConnection()">Vérifier la connexion</button>
    </div>

    <template v-else>
      <div class="controls">
        <div class="site-url-input">
          <label>Propriété GSC</label>
          <input v-model="siteUrl" type="text" placeholder="https://votre-site.com/" @keyup.enter="fetchData" />
        </div>
        <div class="period-selector">
          <label>Période</label>
          <select v-model="period" @change="fetchData">
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
          </select>
        </div>
        <button class="btn btn-primary" :disabled="!siteUrl || gscStore.isLoading" @click="fetchData">
          {{ gscStore.isLoading ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>

      <AsyncContent :is-loading="gscStore.isLoading" :error="gscStore.error" @retry="fetchData">
        <div v-if="gscStore.hasData" class="results">
        <h2>Performance par page</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Clics</th>
              <th>Impressions</th>
              <th>CTR</th>
              <th>Position moy.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pageMetrics" :key="row.page">
              <td class="page-cell" :title="row.page">{{ row.page.replace(siteUrl, '/') }}</td>
              <td class="num">{{ row.clicks }}</td>
              <td class="num">{{ row.impressions }}</td>
              <td class="num">{{ (row.ctr * 100).toFixed(1) }}%</td>
              <td class="num" :class="{ good: row.position <= 10, mid: row.position <= 30, bad: row.position > 30 }">
                {{ row.position }}
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <div v-else class="empty-state">
          <p>Saisissez votre propriété GSC et cliquez sur Actualiser pour voir les données.</p>
        </div>
      </AsyncContent>
    </template>
  </div>
</template>

<style scoped>
.post-publication { padding: 2rem; max-width: 1200px; }
.page-header { margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; margin-top: 0.5rem; }
.back-link { font-size: 0.875rem; color: var(--color-text-muted); }
.back-link:hover { color: var(--color-primary); text-decoration: none; }

.connect-section { text-align: center; padding: 3rem; background: var(--color-bg-soft); border-radius: 8px; }
.connect-section p { color: var(--color-text-muted); margin-bottom: 1rem; }

.controls { display: flex; align-items: end; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.controls label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.25rem; }
.site-url-input { flex: 1; min-width: 200px; }
.site-url-input input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border, #ddd); border-radius: 6px; font-size: 0.875rem; }
.period-selector select { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border, #ddd); border-radius: 6px; font-size: 0.875rem; }

.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--color-bg-soft); color: var(--color-text-muted); }

.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--color-bg-soft); font-weight: 600; font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; }
.data-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-bg-soft); }
.data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.page-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.good { color: var(--color-success); font-weight: 600; }
.mid { color: var(--color-warning); }
.bad { color: var(--color-danger); }

.empty-state { text-align: center; padding: 2rem; color: var(--color-text-muted); }
</style>
