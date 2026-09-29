<script setup lang="ts">
/**
 * « Générer avec Claude », à l'étape Articles du Cerveau (U7, FR-CER-COCOON-PROGRESSIVE).
 *
 * Le menu fait grandir la carte indicative, un article à la fois : le pilier
 * seul d'abord, puis un intermédiaire, puis un spécialisé. Un article ne
 * s'ajoute que si son parent est déjà sur la carte (recette d'Arnaud du
 * 2026-09-25, constat R1). La carte complète reste proposée. Aucun choix ne
 * crée d'article en base : seul « Construire le cocon » le fait.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'

const props = defineProps<{
  /** Une génération est en cours : la carte complète, ou un article ajouté. */
  isGenerating: boolean
  /** La carte a son pilier. */
  hasPillar: boolean
  /** La carte a au moins un intermédiaire. */
  hasIntermediate: boolean
}>()

const emit = defineEmits<{
  (e: 'add', level: ArticleLevel): void
  (e: 'map'): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggleButton = ref<HTMLButtonElement | null>(null)
const noteId = useId()

const pillarHint = computed(() => props.hasPillar
  ? 'Déjà sur la carte : un seul pilier par cocon.'
  : 'Claude pose le pilier seul sur la carte. Les articles suivants s’ajoutent ensuite, un par un.')

/** Le parent de chaque niveau est-il sur la carte ? */
function canAdd(level: ArticleLevel): boolean {
  if (level === 'pilier') return !props.hasPillar
  if (level === 'intermediaire') return props.hasPillar
  return props.hasIntermediate
}

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

function add(level: ArticleLevel): void {
  if (!canAdd(level)) return
  open.value = false
  emit('add', level)
}

function chooseMap(): void {
  open.value = false
  emit('map')
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

    <div v-if="open" class="generate-options" data-testid="brain-generate-options">
      <p :id="noteId" class="generate-note">Sur la carte seulement : aucun article n’est créé.</p>
      <div role="menu" class="generate-list" aria-label="Que générer avec Claude ?" :aria-describedby="noteId">
        <button
          type="button"
          role="menuitem"
          class="generate-option"
          data-testid="brain-generate-pillar"
          :disabled="!canAdd('pilier')"
          @click="add('pilier')"
        >
          <span class="option-title">Le pilier</span>
          <span class="option-hint">{{ pillarHint }}</span>
        </button>
        <button
          v-if="canAdd('intermediaire')"
          type="button"
          role="menuitem"
          class="generate-option"
          data-testid="brain-generate-intermediate"
          @click="add('intermediaire')"
        >
          <span class="option-title">1 article intermédiaire</span>
          <span class="option-hint">Claude en ajoute un sous le pilier.</span>
        </button>
        <button
          v-if="canAdd('specifique')"
          type="button"
          role="menuitem"
          class="generate-option"
          data-testid="brain-generate-specialized"
          @click="add('specifique')"
        >
          <span class="option-title">1 article spécialisé</span>
          <span class="option-hint">Claude en ajoute un sous l’intermédiaire qui en a le plus besoin.</span>
        </button>
        <button
          type="button"
          role="menuitem"
          class="generate-option"
          data-testid="brain-generate-articles"
          @click="chooseMap"
        >
          <span class="option-title">La carte complète du cocon</span>
          <span class="option-hint">Tous les articles d’un coup, à la place de la carte actuelle.</span>
        </button>
      </div>
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
  width: min(22rem, 90vw);
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.generate-note {
  margin: 0;
  padding: 0.375rem 0.625rem 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.generate-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
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
