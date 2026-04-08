<script setup lang="ts">
import type { ChecklistItem } from '@shared/types/seo.types.js'

defineProps<{
  items: ChecklistItem[]
  hasArticleKeywords?: boolean
}>()

function checklistTooltip(item: ChecklistItem): string {
  const base = `Vérifie la présence de « ${item.keyword} » dans : ${item.label}`
  if (!item.isPresent) return `${base} — Non détecté`
  const methodLabels: Record<string, string> = {
    exact: 'Correspondance exacte',
    semantic: `Correspondance sémantique (score : ${Math.round(item.matchScore * 100)}%)`,
    partial: `Correspondance partielle (score : ${Math.round(item.matchScore * 100)}%)`,
    none: 'Non détecté',
  }
  return `${base} — ${methodLabels[item.matchMethod] ?? 'Inconnu'}`
}
</script>

<template>
  <div class="seo-checklist">
    <div v-if="hasArticleKeywords === false" class="checklist-warning">
      D&eacute;finissez un Capitaine pour activer la checklist SEO
    </div>
    <div
      v-for="(item, i) in items"
      :key="i"
      class="checklist-item"
      :class="{ present: item.isPresent }"
      :title="checklistTooltip(item)"
    >
      <span class="checklist-icon">{{ item.isPresent ? '&#10003;' : '&#10007;' }}</span>
      <span class="checklist-label">{{ item.label }}</span>
      <span v-if="item.isPresent && item.matchMethod !== 'exact'" class="match-badge">
        {{ item.matchMethod === 'semantic' ? '~' : '?' }}
      </span>
    </div>
    <div v-if="items.length === 0 && hasArticleKeywords !== false" class="checklist-empty">
      Aucun mot-cl&eacute; pilier d&eacute;fini
    </div>
  </div>
</template>

<style scoped>
.seo-checklist {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-score-poor);
}

.checklist-item.present {
  color: var(--color-score-good);
}

.checklist-icon {
  font-size: 0.6875rem;
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.checklist-label {
  flex: 1;
}

.match-badge {
  font-size: 0.5625rem;
  padding: 0 0.25rem;
  border-radius: 2px;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-badge-blue-text, #2563eb);
  font-weight: 600;
  flex-shrink: 0;
}

.checklist-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.checklist-warning {
  font-size: 0.75rem;
  color: var(--color-warning-text, #92400e);
  background: var(--color-warning-bg, #fffbeb);
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}
</style>
