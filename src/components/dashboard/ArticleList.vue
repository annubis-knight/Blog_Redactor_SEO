<script setup lang="ts">
import type { Article, Keyword } from '@shared/types/index.js'
import ArticleCard from './ArticleCard.vue'

defineProps<{
  articles: Article[]
  keywords: Keyword[]
}>()
</script>

<template>
  <div v-if="articles.length === 0" class="article-list-empty">
    <p>Aucun article dans ce cocon.</p>
  </div>
  <div v-else class="article-list">
    <ArticleCard
      v-for="article in articles"
      :key="article.slug"
      :article="article"
      :keywords="keywords"
    />
  </div>
</template>

<style scoped>
.article-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.article-list-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
