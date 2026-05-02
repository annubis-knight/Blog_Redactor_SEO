<script setup lang="ts">
import { computed } from 'vue'
import AiPanel from '@/components/moteur/ai-panel/AiPanel.vue'
import type { AiPanelState } from '@/composables/moteur/useAiPanel'

/**
 * Sprint C-2 (2026-05-02) — Panel IA Lexique en bas de page.
 *
 * L'extraction TF-IDF reste à sa place dans LexiqueExtraction.vue (les badges
 * IA-recommandés sont apposés sur les termes du tableau). Ce composant
 * agrège l'état IA et offre :
 *   - le CTA standardisé d'analyse / régénération (variant suggestion)
 *   - un récap des stats (nb termes analysés, recommandés, écartés)
 *   - le bandeau d'erreur unifié
 *
 * Pas de handoff — la sélection des termes valide directement vers le store
 * via le tableau TF-IDF en haut de page.
 */
const props = defineProps<{
  iaIsStreaming: boolean
  iaError: string | null
  /** Nombre total de termes analysés (recommandations.length). */
  recommendationsCount: number
  /** Nombre de termes que l'IA a marqués comme recommandés. */
  recommendedCount: number
  /** Nombre de termes que l'IA a écartés (recommandé=false). */
  notRecommendedCount: number
  /** Désactive le CTA si on n'a pas encore de TF-IDF. */
  canTrigger: boolean
}>()

defineEmits<{ trigger: [] }>()

const aiState = computed<AiPanelState>(() => {
  if (props.iaError) return 'error'
  if (props.iaIsStreaming) return 'streaming'
  if (props.recommendationsCount > 0) return 'success'
  return 'idle'
})
</script>

<template>
  <AiPanel
    variant="suggestion"
    title="Analyse IA Lexique"
    subtitle="Recommandations sur les termes lexicaux à privilégier."
    :state="aiState"
    :error="iaError"
    :trigger-disabled="!canTrigger"
    cta-label="Analyser avec l'IA"
    regen-label="Régénérer l'analyse"
    regen-confirm-message="Régénérer l'analyse IA Lexique ? Cela consommera un appel Claude."
    @trigger="$emit('trigger')"
  >
    <div class="lexique-ai-stats" data-testid="lexique-ai-stats">
      <p class="lexique-ai-stats__line">
        <strong>{{ recommendationsCount }}</strong> termes analysés —
        <strong class="lexique-ai-stats__ok">{{ recommendedCount }}</strong> recommandés ·
        <strong class="lexique-ai-stats__ko">{{ notRecommendedCount }}</strong> écartés.
      </p>
      <p class="lexique-ai-stats__hint">
        Les badges IA sont visibles dans le tableau TF-IDF ci-dessus.
      </p>
    </div>

    <template #idle>
      <p class="lexique-ai-idle">
        Lance l'analyse IA pour obtenir des recommandations sur les termes TF-IDF.
      </p>
    </template>
  </AiPanel>
</template>

<style scoped>
.lexique-ai-stats__line {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text);
}
.lexique-ai-stats__ok { color: var(--color-success, #16a34a); }
.lexique-ai-stats__ko { color: var(--color-text-muted, #64748b); }
.lexique-ai-stats__hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.lexique-ai-idle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
