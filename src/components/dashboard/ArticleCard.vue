<script setup lang="ts">
import type { Article } from '@shared/types/index.js'
import StatusBadge from '@/components/shared/StatusBadge.vue'

const props = defineProps<{
  article: Article
  cocoonId?: number
  opportunityScore?: number | null
}>()
</script>

<template>
  <RouterLink :to="cocoonId != null ? `/cocoon/${cocoonId}/article/${article.id}` : `/article/${article.id}/editor`" class="article-card">
    <div class="article-header">
      <span class="article-title">{{ article.title }}</span>
      <div class="article-badges">
        <span
          v-if="opportunityScore != null"
          class="opportunity-badge"
          :class="opportunityScore >= 70 ? 'opp-high' : opportunityScore >= 50 ? 'opp-medium' : opportunityScore >= 30 ? 'opp-low' : 'opp-very-low'"
          :title="`Score d'opportunité: ${opportunityScore}/100`"
        >
          {{ opportunityScore }}
        </span>
        <StatusBadge :status="article.status" />
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.article-card {
  display: block;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
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
  align-items: center;
  gap: 0.75rem;
}

.article-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-badges {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.opportunity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 20px;
  padding: 0 0.25rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.opp-high { background: var(--color-badge-green-bg, #dcfce7); color: var(--color-badge-green-text, #166534); }
.opp-medium { background: var(--color-badge-amber-bg, #fef3c7); color: var(--color-badge-amber-text, #92400e); }
.opp-low { background: var(--color-badge-orange-bg, #fed7aa); color: var(--color-badge-orange-text, #9a3412); }
.opp-very-low { background: var(--color-error-bg, #fee2e2); color: var(--color-error, #991b1b); }
</style>
