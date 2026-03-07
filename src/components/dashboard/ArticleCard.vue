<script setup lang="ts">
import type { Article, Keyword } from '@shared/types/index.js'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import KeywordBadge from '@/components/shared/KeywordBadge.vue'

defineProps<{
  article: Article
  keywords: Keyword[]
}>()
</script>

<template>
  <RouterLink :to="`/article/${article.slug}`" class="article-card">
    <div class="article-header">
      <h4 class="article-title">{{ article.title }}</h4>
      <StatusBadge :status="article.status" />
    </div>

    <div class="article-meta">
      <span class="article-type" :class="{
        'type-pilier': article.type === 'Pilier',
        'type-inter': article.type === 'Intermédiaire',
        'type-spec': article.type === 'Spécialisé',
      }">{{ article.type }}</span>
    </div>

    <div v-if="keywords.length > 0" class="article-keywords">
      <KeywordBadge v-for="kw in keywords" :key="kw.keyword" :keyword="kw" />
    </div>
  </RouterLink>
</template>

<style scoped>
.article-card {
  display: block;
  padding: 1rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
  text-decoration: none;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.article-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
  flex: 1;
}

.article-meta {
  margin-bottom: 0.5rem;
}

.article-type {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-pilier {
  background: #dbeafe;
  color: var(--color-primary);
}

.type-inter {
  background: #fef3c7;
  color: var(--color-warning);
}

.type-spec {
  background: #dcfce7;
  color: var(--color-success);
}

.article-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
</style>
