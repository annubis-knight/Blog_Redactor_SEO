<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useArticlesStore } from '@/stores/articles.store'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import ArticleList from '@/components/dashboard/ArticleList.vue'
import AsyncContent from '@/components/shared/AsyncContent.vue'

const route = useRoute()
const cocoonsStore = useCocoonsStore()
const articlesStore = useArticlesStore()

const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: cocoon.value?.siloName ?? 'Silo' },
  { label: cocoon.value?.name ?? 'Cocon', to: `/cocoon/${cocoonId.value}` },
  { label: 'Rédaction' },
])

async function loadData() {
  if (cocoonsStore.cocoons.length === 0) {
    await cocoonsStore.fetchCocoons()
  }
  await articlesStore.fetchArticlesByCocoon(cocoonId.value)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="redaction-view">
    <Breadcrumb :items="breadcrumbItems" />

    <AsyncContent :is-loading="articlesStore.isLoading" :error="articlesStore.error" @retry="loadData()">
      <ArticleList
        :articles="articlesStore.articles"
        :cocoon-id="cocoonId"
      />
    </AsyncContent>
  </div>
</template>

<style scoped>
.redaction-view {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}
</style>
