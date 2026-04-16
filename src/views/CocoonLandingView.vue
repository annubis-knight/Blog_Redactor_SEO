<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useArticlesStore } from '@/stores/article/articles.store'
import { useKeywordsStore } from '@/stores/keyword/keywords.store'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import WorkflowChoice from '@/components/dashboard/WorkflowChoice.vue'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import SkeletonCard from '@/components/shared/SkeletonCard.vue'

const route = useRoute()
const cocoonsStore = useCocoonsStore()
const articlesStore = useArticlesStore()
const keywordsStore = useKeywordsStore()

const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: cocoon.value?.siloName ?? 'Silo' },
  { label: cocoon.value?.name ?? 'Cocon' },
])

const isLoading = computed(() =>
  articlesStore.isLoading || keywordsStore.isLoading,
)

const error = computed(() => articlesStore.error)

async function loadData() {
  const needsFetch = cocoonsStore.cocoons.length === 0
    || !cocoonsStore.cocoons.some(c => c.id === cocoonId.value)
  if (needsFetch) {
    await cocoonsStore.fetchCocoons()
  }

  const name = cocoonsStore.cocoons.find(c => c.id === cocoonId.value)?.name

  await Promise.all([
    articlesStore.fetchArticlesByCocoon(cocoonId.value),
    name ? keywordsStore.fetchKeywordsByCocoon(name) : Promise.resolve(),
  ])
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="cocoon-landing">
    <div class="landing-header">
      <Breadcrumb :items="breadcrumbItems" />
      <div class="title-row">
        <h2 class="cocoon-title">{{ cocoon?.name ?? 'Cocon' }}</h2>
        <div v-if="cocoon" class="cocoon-summary">
          <span class="summary-stat">{{ cocoon.stats.totalArticles }} articles</span>
          <span class="summary-sep">&middot;</span>
          <span class="summary-stat">{{ cocoon.stats.completionPercent }}% complété</span>
        </div>
      </div>
    </div>

    <AsyncContent :is-loading="isLoading" :error="error" @retry="loadData()">
      <template #skeleton>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <SkeletonCard v-for="i in 3" :key="i" width="280px" height="160px" />
        </div>
      </template>
      <WorkflowChoice
        v-if="cocoon"
        :cocoon-id="cocoonId"
        :cocoon="cocoon"
        :keyword-count="keywordsStore.keywords.length"
      />
    </AsyncContent>
  </div>
</template>

<style scoped>
.cocoon-landing {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}

.landing-header {
  margin-bottom: 1.5rem;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}

.cocoon-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.cocoon-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.summary-sep {
  color: var(--color-border);
}
</style>
