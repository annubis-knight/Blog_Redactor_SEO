// @vitest-environment node
/**
 * FR-RED-META-CAPTAIN — le mot-clé principal d'un article est son capitaine
 * verrouillé au Moteur (épopée qualité SEO, R3).
 *
 * La rédaction prenait le « mot-clé pilier » du pool du cocon : pour un
 * intermédiaire, c'est celui du PILIER, pas le sien. Et quand le pool était
 * illisible, elle retombait sur le titre : la méta du pilier 1013 a été écrite
 * sur « croissance digitale » au lieu de « stratégie digitale ».
 */
import { describe, it, expect } from 'vitest'
import { articleMainKeyword } from '../../../shared/utils/article-keyword.js'

describe('articleMainKeyword', () => {
  it('prend le capitaine verrouillé de l’article', () => {
    expect(articleMainKeyword({ captainKeywordLocked: 'stratégie digitale pme', title: 'Propulser la croissance digitale' }))
      .toBe('stratégie digitale pme')
  })

  it('retombe sur le titre seulement si aucun capitaine n’est verrouillé', () => {
    expect(articleMainKeyword({ captainKeywordLocked: null, title: 'Mon article' })).toBe('Mon article')
    expect(articleMainKeyword({ captainKeywordLocked: '   ', title: 'Mon article' })).toBe('Mon article')
    expect(articleMainKeyword({ title: 'Mon article' })).toBe('Mon article')
  })
})
