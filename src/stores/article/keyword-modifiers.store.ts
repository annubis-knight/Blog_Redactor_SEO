import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ModifierKind } from '@shared/utils/keyword-modifiers'
import { detectModifiers } from '@shared/utils/keyword-modifiers'
import { log } from '@/utils/logger'

/**
 * Store des overrides utilisateur sur les modificateurs d'un mot-clé.
 *
 * Pour un keyword donné, la détection auto ([detectModifiers]) peut être
 * surchargée manuellement par l'utilisateur (clic sur un mot pour retirer
 * un tag, ou pour en ajouter un). Les overrides sont stockés par
 * `articleId + keyword`, purement côté front, en mémoire (pas de persistance
 * backend pour cette v1).
 *
 * Un override vaut toujours sur la détection auto. Si aucun override, on
 * retombe sur la détection automatique.
 */

type KeyForMap = string // `${articleId}::${keyword}`

function makeKey(articleId: number | null, keyword: string): KeyForMap {
  return `${articleId ?? 0}::${keyword.trim().toLowerCase()}`
}

export const useKeywordModifiersStore = defineStore('keywordModifiers', () => {
  /** Map: (articleId + keyword) → override[] aligné sur les mots. */
  const overrides = ref<Record<KeyForMap, ModifierKind[]>>({})

  /**
   * Retourne la liste effective de modificateurs pour un keyword :
   * - override utilisateur s'il existe, sinon
   * - résultat de la détection automatique.
   */
  function getEffective(articleId: number | null, keyword: string): ModifierKind[] {
    const key = makeKey(articleId, keyword)
    if (overrides.value[key]) return overrides.value[key]!
    return detectModifiers(keyword)
  }

  /**
   * Fixe le kind d'un mot à un index donné (clic utilisateur).
   * Passe null pour retirer le tag.
   */
  function setModifier(
    articleId: number | null,
    keyword: string,
    wordIndex: number,
    kind: ModifierKind,
  ) {
    const key = makeKey(articleId, keyword)
    const current = overrides.value[key] ?? detectModifiers(keyword).slice()
    if (wordIndex < 0 || wordIndex >= current.length) {
      log.warn('[keyword-modifiers] setModifier out of range', { wordIndex, length: current.length })
      return
    }
    current[wordIndex] = kind
    overrides.value = { ...overrides.value, [key]: current }
    log.debug('[keyword-modifiers] override set', { articleId, keyword, wordIndex, kind })
  }

  /** Efface tous les overrides d'un keyword (retour à la détection auto). */
  function resetKeyword(articleId: number | null, keyword: string) {
    const key = makeKey(articleId, keyword)
    if (overrides.value[key]) {
      const next = { ...overrides.value }
      delete next[key]
      overrides.value = next
    }
  }

  /** Efface tous les overrides (ex: changement d'article). */
  function resetAll() {
    overrides.value = {}
  }

  const hasOverrides = computed(() => Object.keys(overrides.value).length > 0)

  return {
    overrides,
    hasOverrides,
    getEffective,
    setModifier,
    resetKeyword,
    resetAll,
  }
})
