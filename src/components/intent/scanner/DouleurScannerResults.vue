<script setup lang="ts">
import RadarCardCheckable from '@/components/intent/RadarCardCheckable.vue'
import RadarLongTailSuggestions from '@/components/intent/RadarLongTailSuggestions.vue'
import RadarThermometer from '@/components/shared/RadarThermometer.vue'
import CpcFilterToggle from '@/components/shared/CpcFilterToggle.vue'
import SortToggleBar from '@/components/moteur/SortToggleBar.vue'
import type { CpcFilter } from '@/components/shared/cpc-filter-types'
import type { RadarCard, KeywordRadarScanResult } from '@shared/types/intent.types'
import type { ArticleLevel } from '@shared/types/keyword-validate.types'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'
import type { ModifierKind } from '@shared/utils/keyword-modifiers'
import type { SortOption } from '@/composables/moteur/useSortableList'

interface AutoGroup {
  query: string
  items: KeywordRadarScanResult['autocomplete']['suggestions']
}

/**
 * Accepte `scanResult: null` pour rendre un squelette identique au vrai
 * layout (NFR-UX-STABLE-SKELETON) : RadarThermometer en état vide,
 * autocomplete <details> vide, section cards avec message d'invitation.
 * Conserve les vrais composants et leur ordre/structure → l'utilisateur
 * voit les sections se REMPLIR au lieu de la silhouette qui change.
 */
defineProps<{
  scanResult: KeywordRadarScanResult | null
  filteredCards: RadarCard[]
  radarSortOptions: SortOption[]
  radarSortState: { key: string | null; direction: 'asc' | 'desc' | 'neutral' }
  cpcFilter: CpcFilter
  allChecked: boolean
  checkedKeywords: Set<string>
  autoGroups: AutoGroup[]
  articleLevel?: ArticleLevel
  articleId: number | null
  articleTopic: string
  painPoint: string
  totalSelectedCount: number
  getModifiersFor: (keyword: string) => ModifierKind[]
}>()

defineEmits<{
  (e: 'update:cpc-filter', value: CpcFilter): void
  (e: 'update:radar-sort-state', value: { key: string | null; direction: 'asc' | 'desc' | 'neutral' }): void
  (e: 'toggle-check', keyword: string): void
  (e: 'toggle-all-checked'): void
  (e: 'modifier-untag', keyword: string, index: number): void
  (e: 'modifier-cycle', keyword: string, payload: { index: number; next: 'local' | 'persona' | null }): void
  (e: 'long-tail-selected', selection: LongTailSuggestion[]): void
  (e: 'send-to-captain'): void
}>()
</script>

<template>
  <div class="scanner-results" :data-empty="!scanResult">
    <!-- Global thermometer (rendu toujours, état vide quand scanResult null). -->
    <RadarThermometer
      :global-score="scanResult ? scanResult.globalScore : null"
      :heat-level="scanResult ? scanResult.heatLevel : null"
      :keywords-count="scanResult ? scanResult.cards.length : 0"
      :autocomplete-count="scanResult ? scanResult.autocomplete.totalCount : 0"
      :paa-total="scanResult ? scanResult.cards.reduce((s, c) => s + (c.kpis?.paaTotal ?? 0), 0) : 0"
      :verdict="scanResult ? scanResult.verdict : undefined"
    />

    <!-- Autocomplete section : toujours rendue, summary affiche (0) si pas de scan. -->
    <details class="autocomplete-section" :class="{ 'autocomplete-section--empty': !scanResult || scanResult.autocomplete.totalCount === 0 }">
      <summary class="autocomplete-summary">
        <h4 class="section-title section-title--inline">
          Autocomplete ({{ scanResult ? scanResult.autocomplete.totalCount : 0 }})
        </h4>
        <span class="autocomplete-hint">
          {{ scanResult && scanResult.autocomplete.totalCount > 0 ? 'Cliquer pour déployer' : 'Aucune suggestion — lance un scan' }}
        </span>
      </summary>
      <div v-if="scanResult && scanResult.autocomplete.totalCount > 0" class="auto-groups">
        <div v-for="(group, gIdx) in autoGroups" :key="'ag-' + gIdx" class="auto-group">
          <span class="auto-group-label">
            <span class="auto-query-icon">{{ group.query.startsWith('*') ? '\u2190 ' : '\u2192 ' }}</span>
            "{{ group.query }}" ({{ group.items.length }})
          </span>
          <div class="auto-group-items">
            <span v-for="(s, i) in group.items" :key="i" class="auto-tag">
              <span class="auto-tag-pos">#{{ s.position }}</span>
              {{ s.text }}
            </span>
          </div>
        </div>
      </div>
    </details>

    <!-- Keyword cards with checkboxes (ou placeholder vide). -->
    <div class="radar-cards" :class="{ 'radar-cards--empty': !scanResult }">
      <SortToggleBar
        v-if="scanResult"
        :options="radarSortOptions"
        :model-value="radarSortState"
        :count-label="filteredCards.length !== scanResult.cards.length ? `${filteredCards.length} / ${scanResult.cards.length} mots-clés` : `${filteredCards.length} mots-clés`"
        @update:model-value="(s) => $emit('update:radar-sort-state', s)"
      >
        <template #filters>
          <CpcFilterToggle
            :model-value="cpcFilter"
            @update:model-value="(v) => $emit('update:cpc-filter', v)"
          />
          <label class="check-all-toggle" @click.stop>
            <input
              type="checkbox"
              :checked="allChecked"
              @change="$emit('toggle-all-checked')"
            />
            Tout
          </label>
        </template>
      </SortToggleBar>
      <!-- Header placeholder à l'identique pour l'état vide. -->
      <div v-else class="radar-cards__empty-header">
        <h4 class="section-title section-title--inline">Cartes radar (0)</h4>
        <span class="autocomplete-hint">Les cartes apparaîtront après le scan</span>
      </div>

      <RadarCardCheckable
        v-for="card in filteredCards"
        :key="card.keyword"
        :card="card"
        :checked="checkedKeywords.has(card.keyword)"
        display-mode="kpi"
        :article-level="articleLevel"
        :modifiers="getModifiersFor(card.keyword)"
        @update:checked="$emit('toggle-check', card.keyword)"
        @modifier-untag="(i: number) => $emit('modifier-untag', card.keyword, i)"
        @modifier-cycle="(p: { index: number; next: 'local' | 'persona' | null }) => $emit('modifier-cycle', card.keyword, p)"
      />

      <RadarLongTailSuggestions
        v-if="articleId && scanResult"
        :article-id="articleId"
        :article-title="articleTopic"
        :article-pain-point="painPoint"
        :radar-keywords="scanResult.cards.map(c => ({ keyword: c.keyword }))"
        @update:selected-suggestions="(sel) => $emit('long-tail-selected', sel)"
      />

      <button
        v-if="totalSelectedCount > 0"
        class="btn-send-captain"
        @click="$emit('send-to-captain')"
      >
        Envoyer au Capitaine ({{ totalSelectedCount }})
      </button>
    </div>
  </div>
</template>

<style scoped>
.scanner-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.autocomplete-section {
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.autocomplete-section--empty {
  opacity: 0.55;
  border-style: dashed;
  pointer-events: none;
}

.radar-cards--empty {
  opacity: 0.55;
}

.radar-cards__empty-header {
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.autocomplete-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  list-style: none;
}

.autocomplete-summary::-webkit-details-marker {
  display: none;
}

.section-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
}

.section-title--inline {
  display: inline-block;
}

.autocomplete-hint {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.auto-groups {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auto-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.auto-group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.auto-query-icon {
  margin-right: 0.25rem;
}

.auto-group-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.auto-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.auto-tag-pos {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.radar-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.check-all-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-send-captain {
  padding: 0.625rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
}

.btn-send-captain:hover {
  background: var(--color-primary-hover);
}
</style>
