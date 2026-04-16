<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGeoStore } from '@/stores/article/geo.store'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import ExtractibilityTab from '@/components/panels/geo/ExtractibilityTab.vue'
import ReadabilityTab from '@/components/panels/geo/ReadabilityTab.vue'

const geoStore = useGeoStore()

// Tab management
type TabId = 'extractibilite' | 'lisibilite'

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: 'extractibilite', label: 'Extractibilité' },
  { id: 'lisibilite', label: 'Lisibilité' },
]

const activeTab = ref<TabId>('extractibilite')
const visitedTabs = ref<Partial<Record<TabId, boolean>>>({ extractibilite: true })
watch(activeTab, (tab) => { visitedTabs.value[tab] = true })
</script>

<template>
  <div class="geo-panel">
    <h3 class="panel-title">GEO</h3>

    <!-- Global Score -->
    <div class="panel-section score-section" title="Score GEO global — extractibilité + lisibilité">
      <ScoreGauge :score="geoStore.score?.global ?? 0" label="GEO" />
    </div>

    <!-- Factors -->
    <div class="panel-section factor-section">
      <div class="factor-list">
        <div class="factor-item">
          <span>Extractibilité</span>
          <span class="factor-score">{{ geoStore.score?.factors.extractibilityScore ?? '-' }}</span>
        </div>
        <div class="factor-item">
          <span>Questions H2/H3</span>
          <span class="factor-score">{{ geoStore.score?.factors.questionHeadingsScore ?? '-' }}</span>
        </div>
        <div class="factor-item">
          <span>Answer Capsules</span>
          <span class="factor-score">{{ geoStore.score?.factors.answerCapsulesScore ?? '-' }}</span>
        </div>
        <div class="factor-item">
          <span>Stats sourcées</span>
          <span class="factor-score">{{ geoStore.score?.factors.sourcedStatsScore ?? '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="geo-tabs" role="tablist">
      <button
        v-for="tab in TAB_DEFS"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`geo-tabpanel-${tab.id}`"
        class="geo-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab content -->
    <div class="tab-content">
      <div
        v-if="visitedTabs['extractibilite']"
        v-show="activeTab === 'extractibilite'"
        id="geo-tabpanel-extractibilite"
        role="tabpanel"
        class="tab-panel"
      >
        <ExtractibilityTab />
      </div>

      <div
        v-if="visitedTabs['lisibilite']"
        v-show="activeTab === 'lisibilite'"
        id="geo-tabpanel-lisibilite"
        role="tabpanel"
        class="tab-panel"
      >
        <ReadabilityTab />
      </div>
    </div>
  </div>
</template>

<style scoped>
.geo-panel {
  padding: 1rem;
  font-size: 0.8125rem;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.panel-section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.factor-section {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
}

.factor-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.factor-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.factor-score {
  font-weight: 600;
  min-width: 2rem;
  text-align: right;
}

/* --- Tab bar --- */
.geo-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  margin-bottom: 0.75rem;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.geo-tabs::-webkit-scrollbar {
  display: none;
}

.geo-tab {
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted, #6b7280);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.geo-tab:hover {
  color: var(--color-text, #1f2937);
}

.geo-tab.active {
  color: var(--color-primary, #2563eb);
  border-bottom-color: var(--color-primary, #2563eb);
}

/* --- Tab content --- */
.tab-content {
  min-height: 3rem;
}

.tab-panel {
  padding-top: 0.5rem;
}
</style>
