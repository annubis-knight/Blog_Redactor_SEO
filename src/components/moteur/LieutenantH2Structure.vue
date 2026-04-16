<script setup lang="ts">
import type { SerpAnalysisResult } from '@shared/types/index.js'
import type { ProposeLieutenantsHnNode } from '@shared/types/serp-analysis.types.js'
import type { HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

defineProps<{
  hnStructure: ProposeLieutenantsHnNode[]
  activeHnRecurrence: HnRecurrenceItem[]
  hnRecurrence: HnRecurrenceItem[]
  serpResultsByKeyword: Map<string, SerpAnalysisResult>
  activeHnTab: string
  isLocked: boolean
  hnSaved: boolean
  isSavingHn: boolean
}>()

defineEmits<{
  'save-hn': []
  'update:activeHnTab': [value: string]
}>()
</script>

<template>
  <div>
    <!-- HN Structure from IA -->
    <CollapsableSection
      v-if="hnStructure.length > 0"
      title="Structure Hn recommandee (IA)"
      :default-open="true"
      data-testid="hn-structure-section"
    >
      <ul class="hn-structure-list">
        <li v-for="(node, idx) in hnStructure" :key="idx" class="hn-structure-item">
          <span class="hn-level-tag">H{{ node.level }}</span>
          <span class="hn-text">{{ node.text }}</span>
          <ul v-if="node.children && node.children.length > 0" class="hn-structure-children">
            <li v-for="(child, cidx) in node.children" :key="cidx" class="hn-structure-child">
              <span class="hn-level-tag">H{{ child.level }}</span>
              <span class="hn-text">{{ child.text }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <div class="hn-structure-actions">
        <button v-if="!isLocked" class="btn-save-hn" :disabled="isSavingHn" @click="$emit('save-hn')">
          {{ isSavingHn ? 'Sauvegarde...' : 'Sauvegarder la structure' }}
        </button>
        <Transition name="fade">
          <span v-if="hnSaved" class="hn-saved-badge">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Sauvegardee
          </span>
        </Transition>
        <span v-if="isLocked && !hnSaved" class="hn-saved-badge">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Validee avec les lieutenants
        </span>
      </div>
    </CollapsableSection>

    <!-- HN Concurrents -->
    <CollapsableSection title="Structure Hn concurrents" :default-open="false" data-testid="hn-concurrents-section">
      <div v-if="serpResultsByKeyword.size > 1" class="kw-tab-headers">
        <button class="kw-tab-btn" :class="{ active: activeHnTab === '__all__' }" @click="$emit('update:activeHnTab', '__all__')">
          Tous ({{ hnRecurrence.length }})
        </button>
        <button
          v-for="[kw] in serpResultsByKeyword"
          :key="kw"
          class="kw-tab-btn"
          :class="{ active: activeHnTab === kw }"
          @click="$emit('update:activeHnTab', kw)"
        >
          {{ kw }}
        </button>
      </div>
      <ul v-if="activeHnRecurrence.length > 0" class="hn-recurrence-list">
        <li v-for="item in activeHnRecurrence" :key="`${item.level}:${item.text}`" class="hn-recurrence-item">
          <span class="hn-level-tag">H{{ item.level }}</span>
          <span class="hn-text">{{ item.text }}</span>
          <span class="hn-freq">{{ item.count }}/{{ item.total }}</span>
          <span class="hn-percent">({{ item.percent }}%)</span>
          <div class="hn-bar" :style="{ width: item.percent + '%' }" />
        </li>
      </ul>
      <p v-else class="section-empty">Aucun heading extrait des concurrents.</p>
    </CollapsableSection>
  </div>
</template>

<style scoped>
.hn-structure-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hn-structure-item {
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.hn-structure-children {
  list-style: none;
  padding: 0 0 0 1.5rem;
  margin: 0.25rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hn-structure-child { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; }

.hn-structure-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.btn-save-hn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save-hn:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-save-hn:disabled { opacity: 0.6; cursor: not-allowed; }

.hn-saved-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-success, #16a34a);
}

.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.kw-tab-headers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.kw-tab-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kw-tab-btn:hover { color: var(--color-primary); background: var(--color-bg-secondary, #f9fafb); }

.kw-tab-btn.active {
  color: var(--color-primary);
  font-weight: 600;
  border-color: var(--color-border);
  border-bottom-color: var(--color-primary);
  background: var(--color-bg-secondary, #f9fafb);
}

.hn-recurrence-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hn-recurrence-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.hn-level-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.hn-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hn-freq { font-weight: 600; font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap; flex-shrink: 0; }
.hn-percent { font-size: 0.6875rem; color: var(--color-text-muted); white-space: nowrap; flex-shrink: 0; }
.hn-bar { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--color-primary); transition: width 0.2s ease; }

.section-empty { margin: 0; padding: 0.5rem 0; font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; }
</style>
