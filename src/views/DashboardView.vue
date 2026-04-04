<script setup lang="ts">
import { onMounted } from 'vue'
import { useSilosStore } from '@/stores/silos.store'
import SiloCard from '@/components/dashboard/SiloCard.vue'
import AsyncContent from '@/components/shared/AsyncContent.vue'

const store = useSilosStore()

onMounted(() => {
  store.fetchSilos()
})
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="dashboard-title">{{ store.theme?.nom ?? 'Plan Éditorial' }}</h2>
        <p v-if="store.theme?.description" class="dashboard-desc">{{ store.theme.description }}</p>
      </div>
      <div class="dashboard-actions">
        <RouterLink to="/linking" class="btn-linking">Maillage</RouterLink>
        <RouterLink to="/post-publication" class="btn-linking">GSC</RouterLink>
        <RouterLink to="/labo" class="btn-linking">Labo</RouterLink>
        <RouterLink to="/explorateur" class="btn-linking">Explorateur</RouterLink>
        <RouterLink to="/config" class="btn-config" title="Configuration du thème">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.2" />
            <path d="M6.83 1.58l-.23 1.37a5.02 5.02 0 00-1.22.7L4.08 3.2l-1.17 2.02.93.99c-.06.26-.09.52-.09.79s.03.53.09.79l-.93.99 1.17 2.02 1.3-.45c.37.29.78.52 1.22.7l.23 1.37h2.34l.23-1.37c.44-.18.85-.41 1.22-.7l1.3.45 1.17-2.02-.93-.99c.06-.26.09-.52.09-.79s-.03-.53-.09-.79l.93-.99-1.17-2.02-1.3.45a5.02 5.02 0 00-1.22-.7L9.17 1.58H6.83z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
          </svg>
        </RouterLink>
      </div>
    </div>

    <div v-if="!store.isLoading && !store.error && store.silos.length > 0" class="dashboard-stats">
      <div class="stat-item">
        <span class="stat-value">{{ store.silos.length }}</span>
        <span class="stat-label">Silos</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ store.totalCocoons }}</span>
        <span class="stat-label">Cocons</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ store.totalArticles }}</span>
        <span class="stat-label">Articles</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ store.globalCompletion }}%</span>
        <span class="stat-label">Progression</span>
      </div>
    </div>

    <AsyncContent :is-loading="store.isLoading" :error="store.error" @retry="store.fetchSilos()">
      <div class="silos-list">
        <SiloCard v-for="silo in store.silos" :key="silo.id" :silo="silo" />
      </div>
    </AsyncContent>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.dashboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.dashboard-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
  max-width: 600px;
}

.dashboard-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-linking {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  white-space: nowrap;
}

.btn-linking:hover {
  background: var(--color-bg-hover);
  text-decoration: none;
}

.btn-config {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}

.btn-config:hover {
  color: var(--color-primary);
  background: var(--color-bg-hover);
  text-decoration: none;
}

.dashboard-stats {
  display: flex;
  gap: 2rem;
  padding: 1rem 1.5rem;
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
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.silos-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
