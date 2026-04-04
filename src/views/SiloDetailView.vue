<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSilosStore } from '@/stores/silos.store'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import ProgressBar from '@/components/shared/ProgressBar.vue'
import AsyncContent from '@/components/shared/AsyncContent.vue'

const route = useRoute()
const silosStore = useSilosStore()

const siloId = computed(() => Number(route.params.siloId))

const silo = computed(() =>
  silosStore.silos.find(s => s.id === siloId.value),
)

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: silo.value?.nom ?? 'Silo' },
])

onMounted(() => {
  if (silosStore.silos.length === 0) {
    silosStore.fetchSilos()
  }
})
</script>

<template>
  <div class="silo-detail">
    <Breadcrumb :items="breadcrumbItems" />

    <AsyncContent :is-loading="silosStore.isLoading" :error="silosStore.error" @retry="silosStore.fetchSilos()">
      <template v-if="silo">
      <div class="silo-header">
        <h2 class="silo-title">{{ silo.nom }}</h2>
        <p v-if="silo.description" class="silo-desc">{{ silo.description }}</p>
      </div>

      <div v-if="silo.stats" class="silo-stats">
        <div class="stat-item">
          <span class="stat-value">{{ silo.cocons.length }}</span>
          <span class="stat-label">Cocons</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ silo.stats.totalArticles }}</span>
          <span class="stat-label">Articles</span>
        </div>
        <div class="stat-group">
          <span class="stat-label">Par type</span>
          <div class="stat-badges">
            <span class="badge badge-blue">{{ silo.stats.byType.pilier }} Pilier</span>
            <span class="badge badge-amber">{{ silo.stats.byType.intermediaire }} Inter.</span>
            <span class="badge badge-green">{{ silo.stats.byType.specialise }} Sp&eacute;c.</span>
          </div>
        </div>
        <div class="stat-group">
          <span class="stat-label">Par statut</span>
          <div class="stat-badges">
            <span class="badge badge-slate">{{ silo.stats.byStatus.aRediger }} &Agrave; r&eacute;diger</span>
            <span class="badge badge-amber">{{ silo.stats.byStatus.brouillon }} Brouillon</span>
            <span class="badge badge-green">{{ silo.stats.byStatus.publie }} Publi&eacute;</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ silo.stats.completionPercent }}%</span>
          <span class="stat-label">Progression</span>
        </div>
      </div>

      <h3 class="section-title">Cocons s&eacute;mantiques</h3>
      <div class="cocoons-list">
        <RouterLink
          v-for="cocoon in silo.cocons"
          :key="cocoon.id"
          :to="`/cocoon/${cocoon.id}`"
          class="cocoon-row"
        >
          <div class="cocoon-info">
            <span class="cocoon-name">{{ cocoon.name }}</span>
            <span class="cocoon-meta">{{ cocoon.stats.totalArticles }} articles</span>
          </div>
          <div class="cocoon-progress">
            <ProgressBar
              :percent="cocoon.stats.completionPercent"
              :color="cocoon.stats.completionPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'"
            />
            <span class="cocoon-percent">{{ cocoon.stats.completionPercent }}%</span>
          </div>
        </RouterLink>
      </div>
      </template>

      <div v-else class="empty-state">
        <p>Silo introuvable.</p>
        <RouterLink to="/" class="back-link">&larr; Retour au dashboard</RouterLink>
      </div>
    </AsyncContent>
  </div>
</template>

<style scoped>
.silo-detail {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.silo-header {
  margin: 1rem 0 1.5rem;
}

.silo-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.silo-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

.silo-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.stat-badges {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-blue {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.badge-amber {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.badge-green {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.badge-slate {
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.cocoons-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cocoon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.cocoon-row:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
  text-decoration: none;
}

.cocoon-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.cocoon-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.cocoon-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.cocoon-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 150px;
}

.cocoon-percent {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted);
}

.back-link {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-primary);
}
</style>
