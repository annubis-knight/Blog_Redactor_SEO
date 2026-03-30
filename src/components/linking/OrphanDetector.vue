<script setup lang="ts">
import type { OrphanArticle } from '@shared/types/index.js'

defineProps<{
  orphans: OrphanArticle[]
}>()
</script>

<template>
  <div class="orphan-detector">
    <h3 class="orphan-title">
      Articles orphelins
      <span class="orphan-count">{{ orphans.length }}</span>
    </h3>

    <div v-if="orphans.length === 0" class="orphan-empty">
      Aucun article orphelin. Tous les articles ont au moins un lien entrant.
    </div>

    <div v-else class="orphan-list">
      <RouterLink
        v-for="orphan in orphans"
        :key="orphan.slug"
        :to="`/article/${orphan.slug}/editor`"
        class="orphan-item"
      >
        <span class="orphan-article-title">{{ orphan.title }}</span>
        <span class="orphan-meta">
          <span class="orphan-cocoon">{{ orphan.cocoonName }}</span>
          <span class="orphan-type" :class="orphan.type">{{ orphan.type }}</span>
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.orphan-detector {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.orphan-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.orphan-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.375rem;
  border-radius: 11px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: var(--color-error-bg);
  color: var(--color-error);
}

.orphan-empty {
  padding: 0.75rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.orphan-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.orphan-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}

.orphan-item:hover {
  border-color: var(--color-primary);
  text-decoration: none;
}

.orphan-article-title {
  font-size: 0.8125rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.orphan-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.orphan-cocoon {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.orphan-type {
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
}

.orphan-type.Pilier { background: var(--color-badge-blue-bg); color: var(--color-badge-blue-text); }
.orphan-type.Intermédiaire { background: var(--color-badge-amber-bg); color: var(--color-badge-amber-text); }
.orphan-type.Spécialisé { background: var(--color-badge-green-bg); color: var(--color-badge-green-text); }
</style>
