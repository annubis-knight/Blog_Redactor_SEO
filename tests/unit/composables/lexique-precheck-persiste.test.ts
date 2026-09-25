/**
 * FR-LEX-PRECHECK-PERSISTE (amendée par FR-LEX-METIER-ONLY) — ce que l'écran
 * coche est réellement retenu, et rien n'est coché d'office.
 *
 * Historique : le 2026-09-23, le Lexique pré-cochait les termes « obligatoires »
 * sans rien enregistrer ; on les a alors verrouillés d'un coup (`lockMany`).
 * L'épopée qualité SEO (M11) a montré que ce pré-cochage validait l'étape sans
 * geste, mots vides compris (« être », « votre »). Désormais l'utilisateur
 * choisit, et chaque case cochée ou décochée est enregistrée aussitôt.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useLexiqueLocking } from '../../../src/composables/lexique/useLexiqueLocking'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'

describe('useLexiqueLocking — chaque geste de l’utilisateur est enregistré', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function preparer(articleId = 7) {
    const store = useArticleKeywordsStore()
    store.initEmpty(articleId)
    store.saveDecisions = vi.fn().mockResolvedValue(true)
    return { store, api: useLexiqueLocking({ articleId: ref(articleId) }) }
  }

  it('rien n’est retenu tant que l’utilisateur n’a rien coché', () => {
    const { store, api } = preparer()
    expect(api.lockedTerms.value).toEqual([])
    expect(api.isLocked.value, 'l’étape ne se valide pas toute seule').toBe(false)
    expect(store.saveDecisions).not.toHaveBeenCalled()
  })

  it('cocher un terme l’enregistre ; l’étape peut alors se valider', () => {
    const { store, api } = preparer()
    api.toggleTerm('pare-vapeur')
    expect(api.lockedTerms.value).toEqual(['pare-vapeur'])
    expect(api.isLocked.value).toBe(true)
    expect(store.saveDecisions).toHaveBeenCalledTimes(1)
  })

  it('décocher un terme l’enregistre aussi', () => {
    const { store, api } = preparer()
    api.toggleTerm('pare-vapeur')
    api.toggleTerm('laine soufflée')
    api.toggleTerm('pare-vapeur')
    expect(api.lockedTerms.value).toEqual(['laine soufflée'])
    expect(store.saveDecisions).toHaveBeenCalledTimes(3)
  })

  it('sans article, aucun geste n’est enregistré', () => {
    const store = useArticleKeywordsStore()
    store.saveDecisions = vi.fn().mockResolvedValue(true)
    const api = useLexiqueLocking({ articleId: ref(undefined) })
    api.toggleTerm('pare-vapeur')
    expect(store.saveDecisions).not.toHaveBeenCalled()
  })
})
