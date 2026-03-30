<script setup lang="ts">
import { onMounted } from 'vue'
import { useLinkingStore } from '@/stores/linking.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import LinkingMatrix from '@/components/linking/LinkingMatrix.vue'
import OrphanDetector from '@/components/linking/OrphanDetector.vue'
import AnchorDiversityPanel from '@/components/linking/AnchorDiversityPanel.vue'
import CrossCocoonPanel from '@/components/linking/CrossCocoonPanel.vue'

const linkingStore = useLinkingStore()
const cocoonsStore = useCocoonsStore()

onMounted(async () => {
  await Promise.all([
    linkingStore.fetchMatrix(),
    cocoonsStore.fetchCocoons(),
  ])
})
</script>

<template>
  <div class="linking-view">
    <div class="linking-header">
      <RouterLink to="/" class="back-link">&larr; Dashboard</RouterLink>
      <h1 class="linking-title">Matrice de Maillage Interne</h1>
      <div class="linking-stats" v-if="linkingStore.matrix">
        <span class="stat">{{ linkingStore.totalLinks }} liens</span>
        <span class="stat orphan-stat">{{ linkingStore.orphanCount }} orphelins</span>
      </div>
    </div>

    <LoadingSpinner v-if="linkingStore.isLoading || cocoonsStore.isLoading" />

    <ErrorMessage
      v-else-if="linkingStore.error"
      :message="linkingStore.error"
      @retry="linkingStore.fetchMatrix()"
    />

    <template v-else-if="linkingStore.matrix">
      <div class="linking-content">
        <div class="matrix-section">
          <LinkingMatrix
            :links="linkingStore.matrix.links"
            :cocoons="cocoonsStore.cocoons"
          />
        </div>

        <div class="sidebar-section">
          <OrphanDetector :orphans="linkingStore.orphans" />
          <AnchorDiversityPanel :alerts="linkingStore.anchorAlerts" />
          <CrossCocoonPanel :opportunities="linkingStore.crossCocoonOpportunities" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.linking-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.linking-header {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.back-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.linking-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.linking-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.orphan-stat {
  color: var(--color-error);
}

.linking-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  align-items: start;
}

.matrix-section {
  min-width: 0;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 900px) {
  .linking-content {
    grid-template-columns: 1fr;
  }
}
</style>
