<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import AiPanelHeader from '@/components/moteur/ai-panel/AiPanelHeader.vue'
import { useDiscoveryRanking } from '@/composables/moteur/useDiscoveryRanking'
import type { BasketKeyword } from '@/stores/article/moteur-basket.store'

/**
 * Sprint D-1 (2026-05-02) — Panel suggestion bas de page sur l'onglet
 * Discovery. **Aucun appel IA** : tri local du basket (déjà collecté) par
 * signal × alignement douleur (Jaccard). Cf. tech-spec §4.1, décision D3.
 *
 * Handoff : checkboxes utilisateur → emit('push-to-radar', selectedKeywords[]).
 * Le parent appelle ensuite `basket.markPushedToRadar(...)`.
 */
const props = defineProps<{
  basket: BasketKeyword[]
  painPoint: string | null | undefined
  isLocked: boolean
}>()

const emit = defineEmits<{
  'push-to-radar': [keywords: string[]]
}>()

const { ranked } = useDiscoveryRanking({
  basket: computed(() => props.basket),
  painPoint: toRef(props, 'painPoint') as unknown as ReturnType<typeof computed<string | null | undefined>>,
  topN: 10,
})

const selected = ref<Set<string>>(new Set())

function toggle(keyword: string, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) next.add(keyword)
  else next.delete(keyword)
  selected.value = next
}

function pushToRadar() {
  if (selected.value.size === 0) return
  emit('push-to-radar', [...selected.value])
  selected.value = new Set()
}
</script>

<template>
  <section class="discovery-ai-panel" data-testid="ai-panel-suggestion">
    <AiPanelHeader
      title="Suggestions IA Discovery"
      subtitle="Meilleurs candidats du basket à pousser vers Radar (tri local — signal × alignement douleur)."
    />

    <div v-if="basket.length === 0" class="discovery-ai-empty">
      Le basket Discovery est vide. Utilise les sources alphabétiques /
      questions / IA en haut de page pour le remplir, puis reviens ici.
    </div>

    <ul v-else class="discovery-ai-list" data-testid="discovery-ai-list">
      <li
        v-for="item in ranked"
        :key="item.keyword"
        class="discovery-ai-item"
        :class="{ 'discovery-ai-item--pushed': basket.find(k => k.keyword === item.keyword)?.pushedToRadar }"
      >
        <label class="discovery-ai-label">
          <input
            type="checkbox"
            :checked="selected.has(item.keyword)"
            :disabled="isLocked || !!basket.find(k => k.keyword === item.keyword)?.pushedToRadar"
            @change="(e) => toggle(item.keyword, (e.target as HTMLInputElement).checked)"
          >
          <span class="discovery-ai-keyword">{{ item.keyword }}</span>
          <span class="discovery-ai-reason">{{ item.reason }}</span>
          <span class="discovery-ai-score" :title="`signal=${item.signalScore.toFixed(2)} · pain=${item.painAlignment.toFixed(2)}`">
            {{ Math.round(item.finalScore * 100) }}
          </span>
        </label>
      </li>
    </ul>

    <div class="discovery-ai-footer">
      <button
        type="button"
        class="discovery-ai-handoff"
        data-testid="discovery-ai-handoff"
        :disabled="selected.size === 0 || isLocked"
        @click="pushToRadar"
      >
        Pousser vers Radar ({{ selected.size }})
      </button>
    </div>
  </section>
</template>

<style scoped>
.discovery-ai-panel {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--color-badge-purple-text);
  background: var(--color-badge-purple-bg);
  border-radius: 0 0 8px 8px;
}
.discovery-ai-empty {
  margin: 1rem 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.discovery-ai-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.discovery-ai-item--pushed { opacity: 0.5; }
.discovery-ai-label {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}
.discovery-ai-label:hover { background: rgba(124, 58, 237, 0.06); }
.discovery-ai-keyword { flex: 1; font-size: 0.875rem; font-weight: 500; }
.discovery-ai-reason {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.discovery-ai-score {
  min-width: 2rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: right;
  color: var(--color-badge-purple-text);
  font-variant-numeric: tabular-nums;
}
.discovery-ai-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
.discovery-ai-handoff {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--color-badge-purple-text);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.discovery-ai-handoff:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.discovery-ai-handoff:hover:not(:disabled) {
  background: #6d28d9;
}
</style>
