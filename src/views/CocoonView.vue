<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useArticlesStore } from '@/stores/articles.store'
import { useKeywordsStore } from '@/stores/keywords.store'
import ArticleList from '@/components/dashboard/ArticleList.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'

const route = useRoute()
const cocoonsStore = useCocoonsStore()
const articlesStore = useArticlesStore()
const keywordsStore = useKeywordsStore()

const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const isLoading = computed(() =>
  articlesStore.isLoading || keywordsStore.isLoading,
)

const error = computed(() =>
  articlesStore.error || keywordsStore.error,
)

async function loadData() {
  // Ensure cocoons are loaded (for direct URL access)
  if (cocoonsStore.cocoons.length === 0) {
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
  <div class="cocoon-view">
    <RouterLink to="/" class="back-link">← Retour au dashboard</RouterLink>

    <h2 class="cocoon-title">{{ cocoon?.name ?? 'Cocon' }}</h2>

    <LoadingSpinner v-if="isLoading" />

    <ErrorMessage
      v-else-if="error"
      :message="error"
      @retry="loadData()"
    />

    <ArticleList
      v-else
      :articles="articlesStore.articles"
      :keywords="keywordsStore.keywords"
    />
  </div>
</template>

<style scoped>
.cocoon-view {
  max-width: 900px;
}

.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.back-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.cocoon-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
</style>
