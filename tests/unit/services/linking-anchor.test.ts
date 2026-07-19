import { describe, it, expect } from 'vitest'
import { bestContiguousAnchor } from '../../../server/services/article/linking.service.js'

/**
 * Régression : `suggestLinks` fabriquait l'ancre en collant les mots du titre
 * présents dans le contenu — une chaîne quasi jamais contiguë, donc jamais
 * plaçable (éditeur comme CLI). `bestContiguousAnchor` garantit une ancre
 * réellement présente. Constaté sur le lot de piliers du 2026-07-19 (10
 * suggestions → 0 posable avant, 8 après).
 */
describe('linking — bestContiguousAnchor', () => {
  const content = 'Cet article parle de stratégie digitale et de la conversion des prospects en clients.'

  it('retourne le plus long n-gram du titre présent dans le contenu', () => {
    expect(bestContiguousAnchor('Guide de la stratégie digitale locale', content)).toBe('stratégie digitale')
  })

  it('retourne null si aucun groupe de mots du titre n\'est présent', () => {
    expect(bestContiguousAnchor('Recette de cassoulet traditionnel', content)).toBeNull()
  })

  it('préfère un groupe plus long à un plus court', () => {
    const c = 'On évoque ici la conversion des prospects tout au long du texte.'
    const anchor = bestContiguousAnchor('La conversion des prospects qualifiés', c)
    expect(anchor).toBe('conversion des prospects')
  })

  it('n\'accepte pas un mot isolé trop court', () => {
    // « web » (3) est présent mais trop court pour une ancre
    expect(bestContiguousAnchor('web', 'un site web ici')).toBeNull()
  })

  it('ne retient jamais une ancre de mots vides (bords substantiels)', () => {
    // « de la » est présent mais commence et finit par un mot vide → rejeté au
    // profit de « stratégie digitale ».
    const anchor = bestContiguousAnchor('Guide de la stratégie digitale', content)
    expect(anchor).toBe('stratégie digitale')
  })

  it('l\'ancre retournée est toujours réellement présente dans le contenu', () => {
    const anchor = bestContiguousAnchor('Stratégie digitale pour entreprises', content)
    expect(anchor).not.toBeNull()
    expect(content.toLowerCase()).toContain(anchor!.toLowerCase())
  })
})
