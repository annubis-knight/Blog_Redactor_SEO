<script setup lang="ts">
import { computed } from 'vue'
import type { ValidatePainResult, MultiSourceVerdict } from '@shared/types/intent.types.js'
import { normalizeDataForSeoSignal, normalizeCommunitySignal, normalizeAutocompleteSignal } from '@/composables/useMultiSourceVerdict'
import SourceBlock from './SourceBlock.vue'
import DiscussionList from './DiscussionList.vue'
import AutocompleteChips from './AutocompleteChips.vue'

const props = defineProps<{
  result: ValidatePainResult
  verdict: MultiSourceVerdict
  explanation: string | null
}>()

const emit = defineEmits<{
  'retry-source': [sourceName: string]
}>()

// Compute per-source scores
const dfScore = computed(() => normalizeDataForSeoSignal(props.result.dataforseo))
const commScore = computed(() => normalizeCommunitySignal(props.result.community))
const autoScore = computed(() => normalizeAutocompleteSignal(props.result.autocomplete, props.result.keyword))

// DataForSEO summary
const dfSummary = computed(() => {
  const d = props.result.dataforseo
  if (!d) return 'Non disponible'
  return `Vol: ${d.searchVolume.toLocaleString('fr-FR')} CPC: ${d.cpc.toFixed(2)}€ KD: ${d.difficulty}% Related: ${d.relatedCount}`
})

// Community summary
const commSummary = computed(() => {
  const c = props.result.community
  if (!c) return 'Non disponible'
  const freshLabels: Record<string, string> = { recent: 'récentes', moderate: 'modérées', old: 'anciennes' }
  return `${c.discussionsCount} discussions · ${c.domainDiversity} plateformes · ${freshLabels[c.freshness] ?? c.freshness}`
})

// Autocomplete summary
const autoSummary = computed(() => {
  const a = props.result.autocomplete
  if (!a) return 'Non disponible'
  return `${a.suggestionsCount} suggestions trouvées`
})

// Source states
function getState(source: 'dataforseo' | 'community' | 'autocomplete'): 'ok' | 'error' | 'disabled' {
  if (source === 'dataforseo') return props.result.dataforseo ? 'ok' : 'error'
  if (source === 'community') return props.result.community ? 'ok' : 'error'
  if (source === 'autocomplete') return props.result.autocomplete ? 'ok' : 'error'
  return 'disabled'
}

const sourcesAvailable = computed(() => props.verdict.sourcesAvailable)
const sourcesTotal = computed(() => props.verdict.sourcesTotal)
const showReducedConfidence = computed(() => sourcesAvailable.value < sourcesTotal.value)

// Freshness color class
const freshnessClass = computed(() => {
  const f = props.result.community?.freshness
  if (f === 'recent') return 'freshness--recent'
  if (f === 'moderate') return 'freshness--moderate'
  return 'freshness--old'
})
</script>

<template>
  <div class="row-detail">
    <!-- Source blocks -->
    <SourceBlock
      source-name="DataForSEO"
      :source-state="getState('dataforseo')"
      :score="dfScore"
      :summary="dfSummary"
      :expandable="false"
      @retry="emit('retry-source', 'dataforseo')"
    />

    <SourceBlock
      source-name="Discussions"
      :source-state="getState('community')"
      :score="commScore"
      :summary="commSummary"
      :expandable="result.community !== null"
      @retry="emit('retry-source', 'community')"
    >
      <DiscussionList
        v-if="result.community"
        :discussions="result.community.topDiscussions"
      />
    </SourceBlock>

    <SourceBlock
      source-name="Autocomplete"
      :source-state="getState('autocomplete')"
      :score="autoScore"
      :summary="autoSummary"
      :expandable="result.autocomplete !== null"
      @retry="emit('retry-source', 'autocomplete')"
    >
      <AutocompleteChips
        v-if="result.autocomplete"
        :suggestions="result.autocomplete.suggestions"
      />
    </SourceBlock>

    <SourceBlock
      source-name="NLP"
      source-state="disabled"
      :score="0"
      summary="Désactivé"
      :expandable="false"
    />

    <!-- Reduced confidence warning -->
    <p v-if="showReducedConfidence" class="reduced-confidence">
      ⚠️ Confiance réduite : {{ sourcesAvailable }}/{{ sourcesTotal }} sources actives
    </p>

    <!-- Explanation -->
    <div v-if="explanation" class="confidence-explanation">
      <p class="explanation-text">{{ explanation }}</p>
    </div>
  </div>
</template>

<style scoped>
.row-detail {
  padding: 0.75rem 1rem;
  background: var(--color-bg-soft, #f8fafc);
  animation: detailExpand 0.35s ease;
}

@keyframes detailExpand {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 1000px; }
}

.reduced-confidence {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--color-warning, #d97706);
}

.confidence-explanation {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #d97706);
  border-radius: 6px;
}

.explanation-text {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-badge-amber-text, #92400e);
}
</style>
