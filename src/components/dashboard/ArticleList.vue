<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@shared/types/index.js'
import ArticleCard from './ArticleCard.vue'

const props = defineProps<{
  articles: Article[]
  cocoonId?: number
}>()

const pilierArticles = computed(() =>
  props.articles.filter(a => a.type === 'Pilier'),
)
const interArticles = computed(() =>
  props.articles.filter(a => a.type === 'Intermédiaire'),
)
const specArticles = computed(() =>
  props.articles.filter(a => a.type === 'Spécialisé'),
)

const columns = computed(() => [
  { key: 'pilier', label: 'Pilier', articles: pilierArticles.value, cssClass: 'col-pilier' },
  { key: 'inter', label: 'Intermédiaire', articles: interArticles.value, cssClass: 'col-inter' },
  { key: 'spec', label: 'Spécialisé', articles: specArticles.value, cssClass: 'col-spec' },
])
</script>

<template>
  <div v-if="articles.length === 0" class="article-list-empty">
    <p>Aucun article dans cette th\u00e9matique.</p>
  </div>
  <div v-else class="article-columns">
    <div
      v-for="col in columns"
      :key="col.key"
      class="article-column"
    >
      <div class="column-header" :class="col.cssClass">
        <span class="column-label">{{ col.label }}</span>
        <span class="column-count">{{ col.articles.length }}</span>
      </div>
      <div v-if="col.articles.length === 0" class="column-empty">
        Aucun article
      </div>
      <div v-else class="column-cards">
        <ArticleCard
          v-for="article in col.articles"
          :key="article.slug"
          :article="article"
          :cocoon-id="cocoonId"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: start;
}

.article-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.column-label {
  letter-spacing: 0.025em;
}

.column-count {
  font-weight: 700;
  font-size: 0.75rem;
  opacity: 0.7;
}

.col-pilier {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.col-inter {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.col-spec {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.column-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.column-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
}

.article-list-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

@media (max-width: 900px) {
  .article-columns {
    grid-template-columns: 1fr;
  }
}
</style>
