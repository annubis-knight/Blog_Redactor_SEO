<script setup lang="ts">
import type { RadarPaaItem } from '@shared/types/intent.types.js'

interface PaaTreeNode {
  paa: RadarPaaItem
  index: number
  children: PaaTreeNode[]
}

withDefaults(defineProps<{
  paaTree: PaaTreeNode[]
  expandedPaa: Set<number>
  expandedParents: Set<number>
  cachedPaa: boolean
  itemBorderClass: (paa: RadarPaaItem) => string
  badgeClass: (paa: RadarPaaItem) => string
  matchLabel: (paa: RadarPaaItem) => string
  /** Tooltip optionnel sur le badge (justification Haiku reasonShort en mode capitaine). */
  matchTitle?: (paa: RadarPaaItem) => string
}>(), {
  matchTitle: () => () => '',
})

defineEmits<{
  (e: 'toggle-children', index: number): void
  (e: 'toggle-answer', index: number): void
}>()
</script>

<template>
  <div class="paa-tree">
    <div v-if="cachedPaa" class="paa-tree__cache-hint">PAA en cache</div>
    <div v-for="node in paaTree" :key="node.index" class="paa-node">
      <!-- Parent PAA -->
      <div class="paa-item" :class="[
        itemBorderClass(node.paa),
        { 'paa-item--clickable': !!node.paa.answer || node.children.length > 0 },
      ]">
        <span v-if="node.children.length > 0" class="paa-tree-chevron"
          :class="{ 'paa-tree-chevron--open': expandedParents.has(node.index) }"
          @click.stop="$emit('toggle-children', node.index)">&#9654;</span>
        <span v-else class="paa-tree-chevron paa-tree-chevron--empty" />

        <span class="paa-badge" :class="badgeClass(node.paa)" :title="matchTitle(node.paa) || undefined">{{ matchLabel(node.paa) }}</span>
        <span class="paa-question" @click.stop="node.paa.answer ? $emit('toggle-answer', node.index) : undefined">{{
          node.paa.question }}</span>
        <span v-if="node.paa.semanticScore != null" class="paa-semantic">{{ Math.round(node.paa.semanticScore * 100)
          }}%</span>
        <span v-if="node.children.length > 0" class="paa-children-count">({{ node.children.length }})</span>
      </div>

      <!-- Answer (inline expand) -->
      <div v-if="node.paa.answer && expandedPaa.has(node.index)" class="paa-answer" @click.stop>
        {{ node.paa.answer }}
      </div>

      <!-- Children (collapsible) -->
      <div v-if="node.children.length > 0 && expandedParents.has(node.index)" class="paa-children">
        <div v-for="child in node.children" :key="child.index" class="paa-node paa-node--child">
          <div class="paa-item" :class="[
            itemBorderClass(child.paa),
            { 'paa-item--clickable': !!child.paa.answer },
          ]" @click.stop="child.paa.answer ? $emit('toggle-answer', child.index) : undefined">
            <span v-if="child.paa.answer" class="paa-chevron"
              :class="{ 'paa-chevron--open': expandedPaa.has(child.index) }">&#9654;</span>
            <span v-else class="paa-chevron paa-chevron--empty" />
            <span class="paa-badge" :class="badgeClass(child.paa)" :title="matchTitle(child.paa) || undefined">{{ matchLabel(child.paa) }}</span>
            <span class="paa-question">{{ child.paa.question }}</span>
            <span v-if="child.paa.semanticScore != null" class="paa-semantic">{{ Math.round(child.paa.semanticScore
              * 100) }}%</span>
          </div>
          <div v-if="child.paa.answer && expandedPaa.has(child.index)" class="paa-answer" @click.stop>
            {{ child.paa.answer }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paa-tree {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.paa-tree__cache-hint {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.125rem 0.375rem;
  background: var(--color-bg-soft, #f1f5f9);
  border-radius: 4px;
  align-self: flex-start;
}

.paa-node {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paa-node--child {
  margin-left: 1.25rem;
}

.paa-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--color-bg-soft, #f8fafc);
  transition: background 0.1s, border-color 0.1s;
  font-size: 0.8125rem;
}

.paa-item--clickable {
  cursor: pointer;
}

.paa-item--clickable:hover {
  background: var(--color-primary-soft);
}

.paa-item--exact {
  border-color: var(--color-badge-green-text);
}

.paa-item--match {
  border-color: var(--color-border);
}

.paa-tree-chevron,
.paa-chevron {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  width: 0.875rem;
  flex-shrink: 0;
  transition: transform 0.15s;
  display: inline-block;
}

.paa-tree-chevron--open,
.paa-chevron--open {
  transform: rotate(90deg);
}

.paa-tree-chevron--empty,
.paa-chevron--empty {
  visibility: hidden;
}

.paa-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}

.badge--total {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.badge--partial {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.badge--none {
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
}

/* Badges produits par Haiku en mode Capitaine (FR-CAP-PAA-BADGE-SINGLE).
   Réutilise la palette de tokens existante pour rester cohérent avec le design system. */
.badge--judge-pertinent {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.badge--judge-partiel {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.badge--judge-hors-sujet {
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
}

.paa-question {
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  word-break: break-word;
  line-height: 1.4;
}

.paa-semantic {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.paa-children-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.paa-answer {
  margin-left: 1.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border-left: 2px solid var(--color-primary);
  border-radius: 0 4px 4px 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-text);
  white-space: pre-wrap;
}

.paa-children {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
