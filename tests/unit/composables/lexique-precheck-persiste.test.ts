/**
 * FR-LEX-PRECHECK-PERSISTE — ce que l'écran coche doit exister en base.
 *
 * Après l'analyse, le Lexique pré-coche tous les termes « obligatoires »
 * (présents chez au moins 70 % des concurrents). Ce pré-cochage ne remplissait
 * qu'un `Set` d'affichage : la colonne `article_keywords.lexique`, seule source
 * du verrou `moteur:lexique_validated`, restait vide.
 *
 * Résultat observé le 2026-09-23 : l'écran annonçait « 38 termes sélectionnés »,
 * les 38 cases étaient cochées, et l'étape ne se validait pas. Pour la
 * débloquer il fallait décocher puis recocher un terme — un geste que rien
 * n'indique. Le parcours de bout en bout restait donc coincé avant la Rédaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useLexiqueLocking } from '../../../src/composables/lexique/useLexiqueLocking'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'

describe('useLexiqueLocking — verrouillage groupé du pré-cochage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function preparer(articleId = 7) {
    const store = useArticleKeywordsStore()
    store.initEmpty(articleId)
    store.saveDecisions = vi.fn().mockResolvedValue(undefined)
    return { store, api: useLexiqueLocking({ articleId: ref(articleId) }) }
  }

  it('verrouille tous les termes pré-cochés, en un seul enregistrement', () => {
    const { store, api } = preparer()

    api.lockMany(['garantie', 'devis gratuit', 'artisan certifié'])

    expect(api.lockedTerms.value).toEqual(['garantie', 'devis gratuit', 'artisan certifié'])
    expect(api.isLocked.value, 'l’étape peut désormais se valider').toBe(true)
    expect(store.saveDecisions, 'un seul aller-retour, pas un par terme').toHaveBeenCalledTimes(1)
  })

  it('n’enregistre rien si tous les termes sont déjà verrouillés', () => {
    const { store, api } = preparer()
    api.lockMany(['garantie'])
    ;(store.saveDecisions as ReturnType<typeof vi.fn>).mockClear()

    api.lockMany(['garantie'])

    expect(store.saveDecisions, 'aucune écriture inutile').not.toHaveBeenCalled()
  })

  it('n’ajoute que les termes vraiment nouveaux', () => {
    const { api } = preparer()
    api.lockMany(['garantie'])

    api.lockMany(['garantie', 'devis gratuit'])

    expect(api.lockedTerms.value).toEqual(['garantie', 'devis gratuit'])
  })

  it('ignore une liste vide sans rien écrire', () => {
    const { store, api } = preparer()

    api.lockMany([])

    expect(store.saveDecisions).not.toHaveBeenCalled()
    expect(api.isLocked.value).toBe(false)
  })

  it('laisse le retrait d’un terme fonctionner ensuite', () => {
    const { api } = preparer()
    api.lockMany(['garantie', 'devis gratuit'])

    api.toggleTerm('garantie')

    expect(api.lockedTerms.value, 'l’utilisateur garde la main').toEqual(['devis gratuit'])
  })
})
