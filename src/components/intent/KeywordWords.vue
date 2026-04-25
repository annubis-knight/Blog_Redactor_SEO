<script setup lang="ts">
import { computed } from 'vue'
import { FRENCH_STOPWORDS } from '@/constants/french-nlp'
import type { ModifierKind } from '@shared/utils/keyword-modifiers'

/**
 * F4 — Chaque mot du mot-clé peut être désactivé individuellement (clic gauche
 * pour toggle). Remplace l'ancien système de troncature par la droite (activeCount).
 *
 * Contrat :
 *  - `words` : liste complète des mots.
 *  - `activeIndices` : tableau des indices actuellement actifs (dans l'ordre d'origine).
 *  - `loading` : state de chargement parent.
 *  - `modifiers?` : liste alignée sur `words` qui indique si chaque mot est
 *                   un modificateur local/persona (pour coloration visuelle).
 *                   Absent → pas de coloration de modificateurs.
 *
 * Garde-fou : on ne peut pas désactiver un mot si ça ferait passer le nombre de
 * mots significatifs actifs (non-stopwords) sous la barre de 2.
 *
 * Émission : `update:activeIndices` avec la nouvelle liste triée croissante.
 *            `modifier-untag` [index] quand l'utilisateur retire un tag modifier.
 */
const props = withDefaults(defineProps<{
  words: string[]
  activeIndices: number[]
  loading: boolean
  modifiers?: (ModifierKind | null)[]
  /** Si true, un clic sur un mot cycle son tag modifier (au lieu du toggle actif/inactif). */
  manualTagMode?: boolean
}>(), {
  manualTagMode: false,
})

const emit = defineEmits<{
  'update:activeIndices': [indices: number[]]
  'modifier-untag': [index: number]
  'modifier-cycle': [payload: { index: number; next: ModifierKind | null }]
}>()

function modifierOf(index: number): ModifierKind | null {
  if (!props.modifiers) return null
  return props.modifiers[index] ?? null
}

function modifierTooltip(kind: ModifierKind | null): string | undefined {
  if (props.manualTagMode) {
    if (kind === 'local') return 'Terme local — clic pour passer à persona, puis aucun.'
    if (kind === 'persona') return 'Terme cible/persona — clic pour retirer le tag.'
    return 'Clic pour tagger ce mot comme local, puis persona.'
  }
  if (kind === 'local') return 'Terme local — peu pris en compte dans les KPI. Alt+clic pour changer le tag.'
  if (kind === 'persona') return 'Terme cible/persona — peu pris en compte dans les KPI. Alt+clic pour retirer le tag.'
  return undefined
}

/**
 * Cycle de tag : null → local → persona → null.
 * Déclenché par :
 *   - Alt+clic en mode normal (raccourci avancé)
 *   - clic simple en mode manualTagMode (activé via le bouton tag de la card)
 *
 * Renvoie true si l'événement a été consommé (le toggle actif/inactif est alors skippé).
 */
function handleModifierClick(index: number, event: MouseEvent): boolean {
  const isManualMode = props.manualTagMode
  const isAltClick = event.altKey && !isManualMode
  if (!isManualMode && !isAltClick) return false
  event.stopPropagation()
  event.preventDefault()
  const current = modifierOf(index)
  let next: ModifierKind | null
  if (current === null) next = 'local'
  else if (current === 'local') next = 'persona'
  else next = null
  emit('modifier-cycle', { index, next })
  return true
}

const MIN_SIGNIFICANT = 2

const activeSet = computed(() => new Set(props.activeIndices))

function isActive(index: number): boolean {
  return activeSet.value.has(index)
}

function countSignificantActive(indices: number[]): number {
  let n = 0
  for (const i of indices) {
    const w = props.words[i]
    if (w && !FRENCH_STOPWORDS.has(w.toLowerCase())) n++
  }
  return n
}

function canDeactivate(index: number): boolean {
  // On peut désactiver si après retrait il reste >= 2 mots significatifs
  const next = props.activeIndices.filter(i => i !== index)
  return countSignificantActive(next) >= MIN_SIGNIFICANT
}

function handleClick(index: number) {
  if (isActive(index)) {
    if (!canDeactivate(index)) return
    const next = props.activeIndices.filter(i => i !== index)
    emit('update:activeIndices', next)
  } else {
    const next = [...props.activeIndices, index].sort((a, b) => a - b)
    emit('update:activeIndices', next)
  }
}
</script>

<template>
  <span class="kw-words" data-testid="kw-words">
    <span
      v-for="(word, i) in words"
      :key="`${word}-${i}`"
      class="kw-word"
      :class="{
        'kw-word--active': isActive(i),
        'kw-word--inactive': !isActive(i),
        'kw-word--locked': isActive(i) && !canDeactivate(i),
        'kw-word--modifier-local': modifierOf(i) === 'local',
        'kw-word--modifier-persona': modifierOf(i) === 'persona',
      }"
      :data-testid="`kw-word-${i}`"
      :data-active="isActive(i)"
      :data-locked="isActive(i) && !canDeactivate(i)"
      :data-modifier="modifierOf(i) ?? undefined"
      :title="isActive(i) && !canDeactivate(i) ? 'Minimum 2 mots significatifs requis' : modifierTooltip(modifierOf(i))"
      @click.stop="handleModifierClick(i, $event) || handleClick(i)"
    >{{ word }}</span>
    <span v-if="loading" class="kw-loading" />
  </span>
</template>

<style scoped>
.kw-words {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35em;
  align-items: baseline;
}

.kw-word {
  transition: color 0.15s, opacity 0.15s;
}

.kw-word--active {
  color: var(--color-text);
  text-decoration: underline dotted;
  cursor: pointer;
}

.kw-word--active:hover {
  color: var(--color-danger, #ef4444);
}

.kw-word--locked {
  color: var(--color-text);
  text-decoration: none;
  cursor: default;
  font-weight: 600;
}

.kw-word--locked:hover {
  color: var(--color-text);
}

.kw-word--inactive {
  color: var(--color-text-muted);
  opacity: 0.4;
  text-decoration: line-through;
  cursor: pointer;
}

.kw-word--inactive:hover {
  opacity: 0.7;
}

/* Modificateurs local/persona — couleur différente pour signaler que le mot
 * n'est pas vraiment pris en compte dans les KPI de la chaîne exacte.
 * Alt+clic retire le tag (événement modifier-untag). */
.kw-word--modifier-local {
  color: #0891b2; /* cyan — évoque la géolocalisation */
  font-style: italic;
}

.kw-word--modifier-persona {
  color: #c2410c; /* orange foncé — évoque une cible/audience */
  font-style: italic;
}

.kw-word--modifier-local.kw-word--active,
.kw-word--modifier-persona.kw-word--active {
  /* Le soulignement dotted normal est conservé pour garder la signalétique
   * d'interactivité, mais la couleur différenciée prime. */
  text-decoration: underline dotted;
}

.kw-loading {
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  border: 2px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  animation: kw-spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes kw-spin {
  to { transform: rotate(360deg); }
}
</style>
