<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useArticlesStore } from '@/stores/article/articles.store'
import { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { useKeywordsStore } from '@/stores/keyword/keywords.store'
import { provideRecapRadioGroup } from '@/composables/ui/useRecapRadioGroup'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import ArticleList from '@/components/dashboard/ArticleList.vue'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import SkeletonCard from '@/components/shared/SkeletonCard.vue'
import MoteurStrategyContext from '@/components/moteur/MoteurStrategyContext.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'

const route = useRoute()
const cocoonsStore = useCocoonsStore()
const articlesStore = useArticlesStore()
const strategyStore = useCocoonStrategyStore()
const keywordsStore = useKeywordsStore()

provideRecapRadioGroup()

const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const cocoonSlug = computed(() =>
  (cocoon.value?.name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
)

const allArticles = computed(() => cocoon.value?.articles ?? [])
const suggestedArticles = computed(() => allArticles.value.filter(a => a.status !== 'publié'))
const publishedArticles = computed(() => allArticles.value.filter(a => a.status === 'publié'))

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

  const name = cocoonsStore.cocoons.find(c => c.id === cocoonId.value)?.name
  if (name) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    await Promise.all([
      articlesStore.fetchArticlesByCocoon(cocoonId.value),
      keywordsStore.fetchKeywordsByCocoon(name),
      slug ? strategyStore.fetchStrategy(slug) : Promise.resolve(),
      strategyStore.fetchContext(cocoonId.value),
    ])
  } else {
    await articlesStore.fetchArticlesByCocoon(cocoonId.value)
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="redaction-view">
    <Breadcrumb :items="breadcrumbItems" />

    <!-- Strategic context -->
    <MoteurStrategyContext
      v-if="strategyStore.strategicContext"
      :cible="strategyStore.strategicContext.cible"
      :douleur="strategyStore.strategicContext.douleur"
      :angle="strategyStore.strategicContext.angle"
      :promesse="strategyStore.strategicContext.promesse"
      :cta="strategyStore.strategicContext.cta"
    />

    <!-- Context Recap: proposed + published articles (readonly) -->
    <MoteurContextRecap
      v-if="suggestedArticles.length > 0 || publishedArticles.length > 0"
      :suggested-articles="suggestedArticles"
      :published-articles="publishedArticles"
      :selected-slug="null"
      :readonly="true"
    />

    <AsyncContent :is-loading="articlesStore.isLoading" :error="articlesStore.error" @retry="loadData()">
      <template #skeleton>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <SkeletonCard v-for="i in 4" :key="i" height="80px" />
        </div>
      </template>
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
