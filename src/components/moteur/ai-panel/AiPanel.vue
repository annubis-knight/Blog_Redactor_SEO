<script setup lang="ts">
import AiPanelHeader from './AiPanelHeader.vue'
import AiTriggerButton from './AiTriggerButton.vue'
import AiPanelSkeleton from './AiPanelSkeleton.vue'
import type { AiPanelState } from '@/composables/moteur/useAiPanel'

withDefaults(defineProps<{
  variant: 'suggestion' | 'advice'
  title: string
  subtitle?: string
  state: AiPanelState
  error?: string | null
  isStale?: boolean
  ctaLabel?: string
  regenLabel?: string
  /** Cache la carte tant que l'utilisateur n'a pas déclenché. Défaut: false. */
  hideUntilTriggered?: boolean
  /**
   * Message de confirmation affiché avant régénération (state==='success' →
   * variant 'regen'). Opt-in. Utile pour protéger un appel coûteux (ex:
   * Claude). Propagé tel quel à AiTriggerButton.
   */
  regenConfirmMessage?: string
  /**
   * Désactive le CTA (en plus du loading auto pendant 'streaming'). Utile
   * pour les panels qui dépendent d'un préalable (ex: TF-IDF chargé pour
   * Lexique).
   */
  triggerDisabled?: boolean
}>(), {
  isStale: false,
  ctaLabel: "Analyser avec l'IA",
  regenLabel: 'Régénérer',
  hideUntilTriggered: false,
  error: null,
  triggerDisabled: false,
})

defineEmits<{ (e: 'trigger'): void }>()
</script>

<template>
  <section
    class="aip"
    :class="[`aip--${variant}`, { 'aip--idle': state === 'idle' }]"
    :data-testid="`ai-panel-${variant}`"
  >
    <AiPanelHeader :title="title" :subtitle="subtitle" />

    <div v-if="state === 'streaming'" class="aip__body">
      <AiPanelSkeleton v-if="variant === 'suggestion'" :lines="5" />
      <slot name="streaming">
        <AiPanelSkeleton :lines="3" />
      </slot>
    </div>

    <div v-else-if="state === 'error'" class="aip__error" data-testid="ai-panel-error">
      <p>{{ error || "Une erreur est survenue pendant l'analyse." }}</p>
    </div>

    <div v-else-if="state === 'success'" class="aip__body">
      <p v-if="isStale" class="aip__stale" data-testid="ai-panel-stale">
        Ces résultats commencent à dater — pense à régénérer.
      </p>
      <slot />
    </div>

    <div v-else class="aip__idle">
      <slot name="idle">
        <p class="aip__hint">Cliquez ci-dessous pour lancer l'analyse.</p>
      </slot>
    </div>

    <div class="aip__footer">
      <AiTriggerButton
        :variant="state === 'success' ? 'regen' : 'primary'"
        :loading="state === 'streaming'"
        :disabled="triggerDisabled"
        :label="state === 'success' ? regenLabel : ctaLabel"
        :confirm-message="state === 'success' ? regenConfirmMessage : undefined"
        @click="$emit('trigger')"
      />
    </div>
  </section>
</template>

<style scoped>
.aip {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--color-badge-purple-text);
  background: var(--color-badge-purple-bg);
  border-radius: 0 0 8px 8px;
}
.aip--advice {
  /* Variant sidepanel (Capitaine) — pas de margin-top, intégré à un side panel. */
  margin-top: 0;
  border-top: none;
  border-left: 2px solid var(--color-badge-purple-text);
  border-radius: 0 8px 8px 0;
}
.aip__body { display: flex; flex-direction: column; gap: 1rem; }
.aip__error {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg);
  color: var(--color-error);
  border-radius: 6px;
}
.aip__stale {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-warning);
  background: var(--color-block-warning-bg);
  border-radius: 4px;
}
.aip__idle, .aip__hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
.aip__footer {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
</style>
