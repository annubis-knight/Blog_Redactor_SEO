<script setup lang="ts">
/**
 * « Générer avec Claude », à l'étape Articles du Cerveau (U7, FR-CER-COCOON-PROGRESSIVE).
 *
 * Un menu plutôt qu'un bouton : la recette d'Arnaud du 2026-09-25 a montré
 * qu'un bouton unique, qui dessinait la carte entière du cocon, passait pour
 * le créateur d'articles. Le menu donne les deux chemins et dit lequel crée
 * de vrais articles : le pilier puis un article à la fois (le constructeur),
 * ou la carte complète, un aperçu qui ne crée rien.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  /** La carte complète est en cours de génération. */
  isGenerating: boolean
  /** Le constructeur peut faire naître le pilier (arbre chargé, sans pilier). */
  canStartPillar: boolean
  /** Le cocon a déjà son pilier. */
  hasPillar: boolean
}>()

const emit = defineEmits<{
  (e: 'pillar'): void
  (e: 'map'): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggleButton = ref<HTMLButtonElement | null>(null)

const pillarHint = computed(() => {
  if (props.canStartPillar) return 'Crée de vrais articles, en commençant par le pilier (recommandé).'
  if (props.hasPillar) return 'Le pilier existe déjà : chaque article suivant naît d’une section, dans « Construire le cocon ».'
  return 'L’arbre du cocon n’est pas encore prêt : voyez « Construire le cocon », plus haut.'
})

function toggle(): void {
  if (props.isGenerating) return
  open.value = !open.value
  // Au clavier, le premier choix possible prend le focus.
  if (open.value) {
    void nextTick(() => root.value?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus())
  }
}

function close(): void {
  if (!open.value) return
  open.value = false
  void nextTick(() => toggleButton.value?.focus())
}

function choose(choice: 'pillar' | 'map'): void {
  if (choice === 'pillar' && !props.canStartPillar) return
  open.value = false
  if (choice === 'pillar') emit('pillar')
  else emit('map')
}

function onDocumentMouseDown(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) close()
}

// Le clic à côté n'est écouté que menu ouvert.
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('mousedown', onDocumentMouseDown)
  else document.removeEventListener('mousedown', onDocumentMouseDown)
})

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMouseDown))
</script>

<template>
  <div ref="root" class="generate-menu" @keydown.escape.stop="close">
    <button
      ref="toggleButton"
      type="button"
      class="btn-generate"
      data-testid="brain-generate-menu"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      :disabled="isGenerating"
      @click="toggle"
    >
      <template v-if="isGenerating">Génération...</template>
      <template v-else>Générer avec Claude <span aria-hidden="true">▾</span></template>
    </button>

    <div
      v-if="open"
      class="generate-options"
      role="menu"
      aria-label="Que générer avec Claude ?"
      data-testid="brain-generate-options"
    >
      <button
        type="button"
        role="menuitem"
        class="generate-option"
        data-testid="brain-generate-pillar"
        :disabled="!canStartPillar"
        @click="choose('pillar')"
      >
        <span class="option-title">Le pilier, puis un article à la fois</span>
        <span class="option-hint">{{ pillarHint }}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        class="generate-option"
        data-testid="brain-generate-articles"
        @click="choose('map')"
      >
        <span class="option-title">La carte complète du cocon</span>
        <span class="option-hint">Un aperçu de tous les articles possibles : n’en crée aucun.</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.generate-menu {
  position: relative;
}

.btn-generate {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.btn-generate:hover:not(:disabled) {
  background: var(--color-bg-soft);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-generate:focus-visible,
.generate-option:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.generate-options {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  width: min(22rem, 90vw);
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.generate-option {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.generate-option:hover:not(:disabled) {
  background: var(--color-bg-soft);
}

.generate-option:disabled {
  cursor: not-allowed;
}

.generate-option:disabled .option-title {
  color: var(--color-text-muted);
}

.option-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.option-hint {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
