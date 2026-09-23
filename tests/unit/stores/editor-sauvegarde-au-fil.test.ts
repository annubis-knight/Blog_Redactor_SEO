/**
 * FR-RED-GEN-SAUVEGARDE-AU-FIL — ne pas perdre vingt minutes de rédaction.
 *
 * Un article pilier fait couramment une vingtaine de sections. Mesuré le
 * 2026-09-23 en conditions réelles : 24 sections, environ 45 secondes chacune,
 * soit près de vingt minutes de génération. Rien n'était enregistré avant la
 * toute dernière : fermer l'onglet, rafraîchir ou perdre la connexion à
 * l'avant-dernière section faisait tout perdre — le texte comme l'argent
 * dépensé à le produire.
 *
 * Le filet écrit le corps déjà rédigé après chaque section, sans toucher aux
 * méta (qui n'existent pas encore) ni à l'état « modifié » de l'éditeur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiPut = vi.fn()

vi.mock('../../../src/services/api.service', () => ({
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
}))

import { useEditorStore } from '../../../src/stores/article/editor.store'

describe('saveContenuPartiel — le filet pendant la génération', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiPut.mockReset()
    apiPut.mockResolvedValue({})
  })

  it('écrit le corps déjà rédigé, et rien d’autre', async () => {
    const store = useEditorStore()

    await store.saveContenuPartiel(42, '<h2>Première section</h2><p>Du texte.</p>')

    expect(apiPut).toHaveBeenCalledTimes(1)
    const [url, corps] = apiPut.mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/articles/42')
    expect(corps.content).toContain('Première section')
    expect(Object.keys(corps), 'les méta n’existent pas encore à ce stade').toEqual(['content'])
  })

  it('note l’heure du dernier enregistrement', async () => {
    const store = useEditorStore()
    expect(store.lastSavedAt).toBeNull()

    await store.saveContenuPartiel(42, '<p>Texte</p>')

    expect(store.lastSavedAt, 'l’utilisateur voit que quelque chose est sauvegardé').toBeTruthy()
  })

  it('ne touche pas à l’état « modifié » de l’éditeur', async () => {
    const store = useEditorStore()
    store.markDirty()

    await store.saveContenuPartiel(42, '<p>Texte</p>')

    expect(store.isDirty, 'un filet n’est pas une sauvegarde utilisateur').toBe(true)
  })

  it('n’écrit rien sur un contenu vide', async () => {
    const store = useEditorStore()

    await store.saveContenuPartiel(42, '')
    await store.saveContenuPartiel(42, '   ')

    expect(apiPut).not.toHaveBeenCalled()
  })

  it('n’interrompt pas la génération si l’enregistrement échoue', async () => {
    apiPut.mockRejectedValue(new Error('réseau indisponible'))
    const store = useEditorStore()

    await expect(store.saveContenuPartiel(42, '<p>Texte</p>')).resolves.toBeUndefined()
    expect(store.error, 'l’échec du filet ne remonte pas comme une erreur d’article').toBeNull()
  })
})
