<script setup lang="ts">
import { computed } from 'vue'
import RadarCardLockable from '@/components/intent/RadarCardLockable.vue'
import { useKeywordModifiersStore } from '@/stores/article/keyword-modifiers.store'
import type { ExploredKeywordEntry } from '@/composables/keyword/useExploredKeywords'
import type { ArticleLevel } from '@shared/types/keyword-validate.types'
import type { RadarCard } from '@shared/types/intent.types'

const props = defineProps<{
  entry: ExploredKeywordEntry
  lockedKeyword: string | null
  articleLevel?: ArticleLevel
  articleId?: number | null
  /** Sprint 2 — propagé jusqu'à RadarKeywordCard (tooltip différencié) et
   *  RadarCardLockable (bouton recalcul Pertinence). */
  articlePainPoint?: string | null
}>()

const modifiersStore = useKeywordModifiersStore()

const keywordModifiers = computed(() =>
  modifiersStore.getEffective(props.articleId ?? null, props.entry.card.keyword),
)

function handleModifierUntag(index: number) {
  modifiersStore.setModifier(props.articleId ?? null, props.entry.card.keyword, index, null)
}

function handleModifierCycle(payload: { index: number; next: 'local' | 'persona' | null }) {
  modifiersStore.setModifier(props.articleId ?? null, props.entry.card.keyword, payload.index, payload.next)
}

const emit = defineEmits<{
  'lock': []
  'unlock': []
  'word-toggle': [activeIndices: number[]]
  /** Sprint 2 (2026-05-04) — propagé depuis RadarCardLockable.
   *  Le parent (CaptainPanel) re-validate la card avec le painPoint courant. */
  'recompute-relevance': [card: RadarCard]
}>()

const currentWords = computed(() => {
  return props.entry.originalCard.keyword.trim().split(/\s+/)
})

/**
 * Configuration des mots interactifs côté Capitaine.
 * Règles (révision 2026-05-01) :
 *   1. Capitaine < 3 mots → pas de mots cliquables (pas de racines à explorer).
 *   2. Capitaine ≥ 3 mots → toujours des mots cliquables, même sans racines
 *      pré-validées en cache (cohérence visuelle, l'utilisateur n'attend pas
 *      le pré-chargement pour voir l'interface).
 *   3. Les 2 premiers mots SIGNIFICATIFS (non-stopwords) sont SANCTUARISÉS
 *      via `lockedLeftWords: 2` : visuellement non-cliquables, ancrent la
 *      racine du capitaine. Aligné sur la contrainte d'`extractRoots` qui
 *      exige déjà ≥ 2 mots significatifs (cf. useCapitaineScan.ts).
 */
const interactiveWordsProps = computed(() => {
  if (currentWords.value.length < 3) return undefined
  return {
    words: currentWords.value,
    activeIndices: props.entry.activeWordIndices,
    loading: props.entry.isLoadingRoots,
    lockedLeftWords: 2,
  }
})

const isLocked = computed(() => {
  if (props.lockedKeyword === null) return false
  // Sprint 18 — Décision tranchée : lock UNIQUEMENT sur originalCard.keyword.
  // L'utilisateur ne peut pas locker une racine active sur une RadarCard dont
  // l'originalCard est différent (s'il veut locker la racine, il la cherche
  // explicitement via l'input Capitaine).
  return props.entry.originalCard.keyword === props.lockedKeyword
})

const isValidatingVariant = computed(() => props.entry.pendingVariants.size > 0)

function handleLockedUpdate(val: boolean) {
  if (val) emit('lock')
  else emit('unlock')
}
</script>

<template>
  <div class="radar-card-section">
    <RadarCardLockable
      :card="entry.card"
      :locked="isLocked"
      :interactive-words="interactiveWordsProps"
      :validating="isValidatingVariant"
      display-mode="relevance"
      :article-level="articleLevel"
      :modifiers="keywordModifiers"
      :article-pain-point="articlePainPoint"
      data-testid="carousel-radar-lockable"
      @update:locked="handleLockedUpdate"
      @word-toggle="$emit('word-toggle', $event)"
      @modifier-untag="handleModifierUntag"
      @modifier-cycle="handleModifierCycle"
      @recompute-relevance="(card) => emit('recompute-relevance', card)"
    />
  </div>
</template>

<style scoped>
.radar-card-section {
  margin-top: 1.25rem;
}
</style>
