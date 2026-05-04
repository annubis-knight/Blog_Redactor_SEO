<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import AiPanelHeader from '@/components/moteur/ai-panel/AiPanelHeader.vue'
import { useRadarRanking } from '@/composables/moteur/useRadarRanking'
import type { RadarCard } from '@shared/types/intent.types'

/**
 * Sprint D-2 (2026-05-02) — Panel suggestion bas de page sur l'onglet Radar.
 * **Aucun appel IA** : tri local des RadarCard déjà scorées par mix
 * marketScore + relevanceScore. Cf. tech-spec §4.2, décision D3.
 *
 * Handoff : emit('mark-captain-candidates', selectedKeywords[]). Le parent
 * écrit ensuite dans `article_keywords.captainCandidates[]` côté store.
 */
const props = defineProps<{
  cards: RadarCard[]
  isLocked: boolean
}>()

const emit = defineEmits<{
  'mark-captain-candidates': [keywords: string[]]
}>()

const { ranked } = useRadarRanking({
  cards: toRef(props, 'cards') as unknown as ReturnType<typeof computed<RadarCard[]>>,
  topN: 5,
})

const selected = ref<Set<string>>(new Set())

function toggle(keyword: string, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) next.add(keyword)
  else next.delete(keyword)
  selected.value = next
}

function markCandidates() {
  if (selected.value.size === 0) return
  emit('mark-captain-candidates', [...selected.value])
  selected.value = new Set()
}
</script>

<template>
  <section class="radar-ai-panel" data-testid="ai-panel-suggestion">
    <AiPanelHeader
      title="Suggestions IA Radar"
      subtitle="Top candidats Capitaine — tri local par mix marché + pertinence (verdicts NOGO exclus)."
    />

    <div v-if="ranked.length === 0" class="radar-ai-empty">
      Aucun candidat à proposer pour l'instant. Lance un scan Radar ou ajuste
      ta sélection — les cartes verdict NOGO/NOGO sont filtrées.
    </div>

    <ul v-else class="radar-ai-list" data-testid="radar-ai-list">
      <li v-for="item in ranked" :key="item.keyword" class="radar-ai-item">
        <label class="radar-ai-label">
          <input
            type="checkbox"
            :checked="selected.has(item.keyword)"
            :disabled="isLocked"
            @change="(e) => toggle(item.keyword, (e.target as HTMLInputElement).checked)"
          >
          <span class="radar-ai-keyword">{{ item.keyword }}</span>
          <!-- Sprint 5 (2026-05-04) — friction #8 : afficher "—" si score absent
               (cohérent avec RadarKeywordCard tooltip "Pertinence indisponible"
               sprint 2). Avant : "M 0 / P 0" donnait l'impression d'un bug.
               On distingue "absent" (marketTotalAvailable=false) vs "présent à 0". -->
          <span class="radar-ai-scores">
            <span class="radar-ai-score-pill" :title="item.marketTotalAvailable ? 'Score Marché' : 'Score Marché indisponible'">
              M {{ item.marketTotalAvailable ? Math.round(item.marketTotal) : '—' }}
            </span>
            <span class="radar-ai-score-pill radar-ai-score-pill--rel" :title="item.relevanceTotalAvailable ? 'Score Pertinence' : 'Score Pertinence indisponible (PainPoint absent ou signaux nuls)'">
              P {{ item.relevanceTotalAvailable ? Math.round(item.relevanceTotal) : '—' }}
            </span>
          </span>
        </label>
      </li>
    </ul>

    <div class="radar-ai-footer">
      <button
        type="button"
        class="radar-ai-handoff"
        data-testid="radar-ai-handoff"
        :disabled="selected.size === 0 || isLocked"
        @click="markCandidates"
      >
        Marquer comme candidats Capitaine ({{ selected.size }})
      </button>
    </div>
  </section>
</template>

<style scoped>
.radar-ai-panel {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--color-badge-purple-text);
  background: var(--color-badge-purple-bg);
  border-radius: 0 0 8px 8px;
}
.radar-ai-empty {
  margin: 1rem 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.radar-ai-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.radar-ai-label {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}
.radar-ai-label:hover { background: rgba(124, 58, 237, 0.06); }
.radar-ai-keyword { flex: 1; font-size: 0.875rem; font-weight: 500; }
.radar-ai-scores { display: flex; gap: 0.25rem; }
.radar-ai-score-pill {
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  font-variant-numeric: tabular-nums;
}
.radar-ai-score-pill--rel {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}
.radar-ai-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
.radar-ai-handoff {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--color-badge-purple-text);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.radar-ai-handoff:disabled { cursor: not-allowed; opacity: 0.6; }
.radar-ai-handoff:hover:not(:disabled) { background: #6d28d9; }
</style>
