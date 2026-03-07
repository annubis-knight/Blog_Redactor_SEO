<script setup lang="ts">
import type { Article } from '@shared/types/index.js'

defineProps<{
  articles: Article[]
}>()

const emit = defineEmits<{
  'select-article': [article: Article]
  'cancel': []
}>()
</script>

<template>
  <div class="article-picker">
    <div class="picker-header">
      <span class="picker-title">Choisir l'article cible</span>
      <button class="picker-close" @click="emit('cancel')">✕</button>
    </div>
    <div class="picker-list">
      <button
        v-for="article in articles"
        :key="article.slug"
        class="picker-item"
        @click="emit('select-article', article)"
      >
        <span class="article-title">{{ article.title }}</span>
        <span class="article-slug">/{{ article.slug }}</span>
      </button>
      <div v-if="articles.length === 0" class="picker-empty">
        Aucun article disponible dans ce cocon.
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-picker {
  min-width: 260px;
  max-height: 300px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.picker-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.picker-close {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
}

.picker-close:hover {
  background: var(--color-bg-hover, #f1f5f9);
  color: var(--color-text);
}

.picker-list {
  overflow-y: auto;
  padding: 0.25rem;
}

.picker-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.picker-item:hover {
  background: var(--color-bg-hover, #f1f5f9);
}

.article-title {
  font-size: 0.8125rem;
  font-weight: 500;
}

.article-slug {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.picker-empty {
  padding: 1rem 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
</style>
