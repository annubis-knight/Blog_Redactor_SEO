<script setup lang="ts">
import type { DiscoverySource, DiscoveredKeyword } from '@shared/types/discovery-tab.types'

interface SourceSection {
  key: DiscoverySource
  icon: string
  label: string
  list: DiscoveredKeyword[]
  loading: boolean
  showReasoning: boolean
  showKpis: boolean
}

defineProps<{
  sections: SourceSection[]
  filteredList: (list: DiscoveredKeyword[]) => DiscoveredKeyword[]
  visibleItems: <T>(list: T[], key: string) => T[]
  isCollapsed: (key: string) => boolean
  isSectionExpanded: (key: string) => boolean
  isSelected: (keyword: string) => boolean
  isMultiSource: (keyword: string) => boolean
  isRelevant: (keyword: string) => boolean
  isAllSourceSelected: (source: DiscoverySource) => boolean
  sourceCountLabel: (keyword: string) => string | null
  formatVolume: (vol: number | undefined) => string
  hasDiscovered: boolean
  visibleThreshold: number
}>()

defineEmits<{
  (e: 'toggle-collapsed', key: DiscoverySource): void
  (e: 'toggle-source', source: DiscoverySource): void
  (e: 'keyword-click', keyword: string): void
  (e: 'toggle-section-expanded', key: DiscoverySource): void
}>()
</script>

<template>
  <div class="discovery-sources">
    <template v-for="section in sections" :key="section.key">
      <section class="source-section">
        <div class="source-header" @click="$emit('toggle-collapsed', section.key)">
          <span class="source-header__chevron" :class="{ 'source-header__chevron--open': !isCollapsed(section.key) }">▸</span>
          <span class="source-header__icon">{{ section.icon }}</span>
          <span class="source-header__title">{{ section.label }}</span>
          <span class="source-header__count">
            <template v-if="section.loading">
              <span class="spinner-small" />
            </template>
            <template v-else-if="section.list.length > 0">
              ({{ filteredList(section.list).length }}<template v-if="filteredList(section.list).length !== section.list.length">/{{ section.list.length }}</template>)
            </template>
          </span>
          <label
            v-if="filteredList(section.list).length > 0"
            class="source-header__check-all"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="isAllSourceSelected(section.key)"
              @change="$emit('toggle-source', section.key)"
            />
            Tout
          </label>
        </div>
        <ul v-if="!isCollapsed(section.key) && filteredList(section.list).length > 0" class="source-list">
          <li
            v-for="kw in visibleItems(filteredList(section.list), section.key)"
            :key="section.key + '-' + kw.keyword"
            class="source-item"
            :class="{
              'source-item--selected': isSelected(kw.keyword),
              'source-item--multi': isMultiSource(kw.keyword),
              'source-item--irrelevant': !isRelevant(kw.keyword),
            }"
            @click="$emit('keyword-click', kw.keyword)"
          >
            <input
              type="checkbox"
              :checked="isSelected(kw.keyword)"
              @click.stop
              @change="$emit('keyword-click', kw.keyword)"
            />
            <span
              class="source-item__keyword"
              :class="{ 'source-item__keyword--multi': isMultiSource(kw.keyword) }"
            >{{ kw.keyword }}</span>
            <span v-if="sourceCountLabel(kw.keyword)" class="multi-badge">{{ sourceCountLabel(kw.keyword) }}</span>
            <small v-if="section.showReasoning && kw.reasoning" class="source-item__reasoning">{{ kw.reasoning }}</small>
            <span v-if="section.showKpis" class="source-item__kpis">
              <span v-if="kw.searchVolume != null" class="kpi-tag">Vol: {{ formatVolume(kw.searchVolume) }}</span>
              <span v-if="kw.difficulty != null" class="kpi-tag">KD: {{ kw.difficulty }}</span>
              <span v-if="kw.cpc != null" class="kpi-tag">CPC: {{ kw.cpc.toFixed(2) }}€</span>
              <span v-if="kw.intent" class="kpi-tag kpi-tag--intent">{{ kw.intent }}</span>
            </span>
          </li>
        </ul>
        <button
          v-if="!isCollapsed(section.key) && filteredList(section.list).length > visibleThreshold"
          type="button"
          class="source-list__expand-btn"
          @click="$emit('toggle-section-expanded', section.key)"
        >
          <template v-if="isSectionExpanded(section.key)">Réduire la liste</template>
          <template v-else>Afficher tout ({{ filteredList(section.list).length - visibleThreshold }} de plus)</template>
        </button>
        <p
          v-else-if="!isCollapsed(section.key) && !section.loading && section.list.length === 0"
          class="source-section__placeholder"
        >
          <template v-if="!hasDiscovered">Saisissez un mot-clé pour découvrir les suggestions.</template>
          <template v-else>Aucun résultat dans cette source.</template>
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.discovery-sources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.source-section__placeholder {
  margin: 0;
  padding: 12px 16px;
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--color-text-muted, #64748b);
  background: var(--color-surface-subtle, rgba(100, 116, 139, 0.03));
}

.source-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface);
  cursor: pointer;
  user-select: none;
}

.source-header:hover {
  background: var(--color-bg-hover);
}

.source-header__chevron {
  display: inline-block;
  font-size: 0.75rem;
  transition: transform 0.15s ease;
  color: var(--color-text-muted);
}

.source-header__chevron--open {
  transform: rotate(90deg);
}

.source-header__icon {
  font-size: 0.875rem;
}

.source-header__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.source-header__count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.source-header__check-all {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.source-header__check-all input {
  cursor: pointer;
}

.source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

.source-list__expand-btn {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  background: var(--color-surface-subtle, rgba(100, 116, 139, 0.04));
  border: 1px dashed var(--color-border, #e2e8f0);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.source-list__expand-btn:hover {
  background: var(--color-surface, #f8fafc);
  color: var(--color-primary, #3b82f6);
}

.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.8125rem;
  transition: background 0.1s;
}

.source-item:hover {
  background: var(--color-bg-hover);
}

.source-item--selected {
  background: rgba(37, 99, 235, 0.04);
}

.source-item input[type="checkbox"] {
  cursor: pointer;
  flex-shrink: 0;
}

.source-item__keyword {
  color: var(--color-text);
  font-weight: 500;
}

.source-item--irrelevant {
  opacity: 0.5;
}

.source-item--irrelevant .source-item__keyword {
  color: var(--color-text-muted);
  font-weight: 400;
}

.source-item__keyword--multi {
  color: var(--color-primary);
  font-weight: 600;
}

.source-item--irrelevant .source-item__keyword--multi {
  color: var(--color-text-muted);
  font-weight: 400;
}

.multi-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.source-item__reasoning {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  margin-left: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.source-item__kpis {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.kpi-tag {
  font-size: 0.6875rem;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}

.kpi-tag--intent {
  background: var(--color-block-info-bg);
  border-color: var(--color-block-info-border);
  color: var(--color-primary);
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
