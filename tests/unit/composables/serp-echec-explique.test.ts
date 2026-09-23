/**
 * FR-LIE-SERP-ECHEC-EXPLIQUE — un échec d'analyse SERP se lit et se répare.
 *
 * L'écran affichait le message brut du serveur : « SERP analysis failed », en
 * anglais, sans cause ni action possible, dans une application par ailleurs
 * entièrement en français.
 *
 * Constaté sur un passage réel le 2026-09-23 : l'analyse de « stratégie
 * digitale entreprises Toulouse » échoue parce que Google ne renvoie aucun
 * résultat exploitable — le mot-clé est trop étroit. Ce n'est pas une panne,
 * c'est une information sur le mot-clé. L'utilisateur, lui, voyait un bandeau
 * rouge en anglais et n'avait aucune piste.
 */
import { describe, it, expect } from 'vitest'
import { expliquerEchecSerp } from '../../../src/composables/moteur/useLieutenantsSerp'

describe('expliquerEchecSerp — dire la cause et la suite', () => {
  it('traduit l’absence de résultats en information sur le mot-clé', () => {
    const message = expliquerEchecSerp('DataForSEO: empty result', 'stratégie digitale entreprises Toulouse')

    expect(message, 'le mot-clé fautif est nommé').toContain('stratégie digitale entreprises Toulouse')
    expect(message, 'la cause est donnée').toMatch(/aucun résultat/i)
    expect(message, 'et la marche à suivre aussi').toMatch(/trop étroit|élargissez/i)
    expect(message, 'plus un mot d’anglais').not.toMatch(/failed|empty result/i)
  })

  it('distingue un budget atteint d’une panne', () => {
    const message = expliquerEchecSerp('DataForSEO cost budget exceeded — HTTP 429', 'agence web toulouse')

    expect(message).toMatch(/budget/i)
    expect(message, 'on invite à réessayer plus tard').toMatch(/Réessayez/i)
    expect(message, 'pas de faux diagnostic sur le mot-clé').not.toMatch(/trop étroit/i)
  })

  it('distingue une source qui ne répond pas', () => {
    const message = expliquerEchecSerp('fetch failed', 'plombier toulouse')

    expect(message).toMatch(/pas répondu à temps/i)
    expect(message).toContain('plombier toulouse')
  })

  it('reste lisible sur une cause inconnue, sans perdre le détail technique', () => {
    const message = expliquerEchecSerp('Erreur 500 côté fournisseur', 'devis site internet')

    expect(message, 'le détail brut reste accessible').toContain('Erreur 500 côté fournisseur')
    expect(message, 'une action est toujours proposée').toMatch(/Relancez|autre mot-clé/i)
  })

  it('se passe du mot-clé quand il n’est pas connu', () => {
    const message = expliquerEchecSerp('DataForSEO: empty result', null)

    expect(message).toContain('ce mot-clé')
    expect(message).not.toContain('« »')
  })

  it('ne renvoie jamais une chaîne vide', () => {
    for (const brut of ['', '   ']) {
      expect(expliquerEchecSerp(brut, 'un mot-clé').trim().length).toBeGreaterThan(20)
    }
  })
})
