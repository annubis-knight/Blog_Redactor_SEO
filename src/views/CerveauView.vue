<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import BrainPhase from '@/components/production/BrainPhase.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const cocoonsStore = useCocoonsStore()

const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: cocoon.value?.siloName ?? 'Silo' },
  { label: cocoon.value?.name ?? 'Cocon', to: `/cocoon/${cocoonId.value}` },
  { label: 'Cerveau' },
])

function handleNext() {
  router.push(`/cocoon/${cocoonId.value}`)
}

onMounted(() => {
  if (cocoonsStore.cocoons.length === 0) {
    cocoonsStore.fetchCocoons()
  }
})
</script>

<template>
  <div class="cerveau-view">
    <Breadcrumb :items="breadcrumbItems" />

    <LoadingSpinner v-if="cocoonsStore.isLoading" />

    <BrainPhase v-else-if="cocoon" :cocoon-name="cocoon.name" :silo-name="cocoon.siloName" :cocoon-id="cocoonId"
      @next="handleNext" />

    <div v-else class="empty-state">
      <p>Cocon introuvable.</p>
      <RouterLink to="/" class="back-link">&larr; Retour au dashboard</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.cerveau-view {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
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
