<script setup lang="ts">
/**
 * Icône triangle d'avertissement réutilisable.
 *
 * Centralise les variantes SVG triangle qui étaient dupliquées dans plusieurs
 * composants (MoteurContextRecap, CaptainCarousel, LieutenantSerpAnalysis).
 *
 * Variants :
 *  - default : trait simple, hérite de currentColor
 *  - filled  : triangle plein avec couleur de fill et stroke distincts
 *              (utilisé pour le badge cannibalisation orange dans le recap)
 *
 * Usage :
 *   <IconWarning :size="14" />
 *   <IconWarning :size="14" filled stroke-color="#f59e0b" fill-color="#fef3c7" />
 */
withDefaults(defineProps<{
  size?: number
  filled?: boolean
  /** Couleur du trait (par défaut currentColor pour hériter du parent). */
  strokeColor?: string
  /** Couleur de remplissage si filled=true. */
  fillColor?: string
  /** Texte d'accessibilité (rendu en <title> SVG). */
  title?: string
}>(), {
  size: 16,
  filled: false,
  strokeColor: 'currentColor',
  fillColor: 'transparent',
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    :aria-hidden="title ? undefined : true"
    :role="title ? 'img' : undefined"
  >
    <title v-if="title">{{ title }}</title>
    <path
      :d="filled ? 'M8 1.5L1 14h14L8 1.5z' : 'M8 1.5l6.5 12H1.5L8 1.5z'"
      :stroke="strokeColor"
      stroke-width="1.2"
      stroke-linejoin="round"
      :fill="filled ? fillColor : 'none'"
    />
    <path
      d="M8 6v3M8 11v.5"
      :stroke="strokeColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
</template>
