<script setup lang="ts">
import { ref, watch } from 'vue'
import AiPanelHeader from './AiPanelHeader.vue'
import AiTriggerButton from './AiTriggerButton.vue'
import AiPanelSkeleton from './AiPanelSkeleton.vue'
import type { AiPanelState } from '@/composables/moteur/useAiPanel'

const props = withDefaults(defineProps<{
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
  /**
   * Sprint 3 (2026-05-04) — Le panel s'affiche replié par défaut. L'utilisateur
   * clique sur le header pour le déployer. Auto-déploie si state devient
   * 'streaming' ou 'error' (l'utilisateur veut voir l'opération en cours).
   * `false` = comportement legacy (toujours déployé).
   */
  defaultCollapsed?: boolean
}>(), {
  isStale: false,
  ctaLabel: "Analyser avec l'IA",
  regenLabel: 'Régénérer',
  hideUntilTriggered: false,
  error: null,
  triggerDisabled: false,
  defaultCollapsed: true,
})

defineEmits<{ (e: 'trigger'): void }>()

const isCollapsed = ref(props.defaultCollapsed)

// Auto-uncollapse pendant streaming/error : l'utilisateur veut voir
// l'opération en cours. NE refait PAS l'inverse à la fin (success) → si
// l'utilisateur a explicitement replié, son choix est respecté.
// `immediate: true` couvre aussi le cas où le panel est monté avec un
// state déjà à 'streaming' ou 'error'.
watch(() => props.state, (s) => {
  if (s === 'streaming' || s === 'error') isCollapsed.value = false
}, { immediate: true })

function toggle() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <section
    class="aip"
    :class="[`aip--${variant}`, { 'aip--idle': state === 'idle', 'aip--collapsed': isCollapsed }]"
    :data-testid="`ai-panel-${variant}`"
  >
    <!-- Sprint 3 (2026-05-04) — header cliquable pour collapse/expand. -->
    <button
      type="button"
      class="aip__toggle"
      :aria-expanded="!isCollapsed"
      data-testid="ai-panel-toggle"
      @click="toggle"
    >
      <AiPanelHeader :title="title" :subtitle="subtitle" />
      <span class="aip__chevron" :class="{ 'aip__chevron--open': !isCollapsed }" aria-hidden="true">&#9654;</span>
    </button>

    <!-- État replié : aucun body, juste un hint sobre. -->
    <div v-if="isCollapsed" class="aip__hint-collapsed" data-testid="ai-panel-collapsed">
      <span>Cliquez pour {{ state === 'success' ? 'voir les suggestions IA' : "lancer l'analyse IA" }}.</span>
    </div>

    <!-- État déployé : bodies par état. -->
    <template v-else>
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
    </template>
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
.aip--collapsed {
  /* Replié : moins d'espace vertical pour ne pas occuper l'écran. */
  padding: 0.75rem 1rem;
}
.aip--advice {
  /* Variant sidepanel (Capitaine) — pas de margin-top, intégré à un side panel. */
  margin-top: 0;
  border-top: none;
  border-left: 2px solid var(--color-badge-purple-text);
  border-radius: 0 8px 8px 0;
}

/* Sprint 3 — header cliquable + chevron. */
.aip__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
}
.aip__chevron {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--color-badge-purple-text);
  transition: transform 0.2s ease;
}
.aip__chevron--open {
  transform: rotate(90deg);
}

.aip__hint-collapsed {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
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
