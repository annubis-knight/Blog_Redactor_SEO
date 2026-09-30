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
import { articleMainKeyword, articleBriefKeyword, moteurWorkingKeyword } from '../../../shared/utils/article-keyword.js'

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

/**
 * FR-RED-BRIEF — l'analyse IA du brief porte sur le mot-clé de l'article :
 * capitaine verrouillé, à défaut mot-clé suggéré (recette du 2026-09-30, RED-1).
 * Un capitaine enregistré vide (`''`, pas `null`) passait tel quel : le serveur
 * refusait la demande (400, « keyword required ») et le panneau restait muet.
 */
describe('articleBriefKeyword (FR-RED-BRIEF)', () => {
  it('un capitaine enregistré vide ne compte pas : le mot-clé suggéré prend le relais', () => {
    expect(articleBriefKeyword({ storedCaptain: '', captainKeywordLocked: null, suggestedKeyword: 'questions à se poser', title: 'Questions : le guide' }))
      .toBe('questions à se poser')
  })

  it('le capitaine verrouillé passe avant le mot-clé suggéré', () => {
    expect(articleBriefKeyword({ storedCaptain: 'plombier toulouse', captainKeywordLocked: null, suggestedKeyword: 'plombier', title: 'T' }))
      .toBe('plombier toulouse')
    expect(articleBriefKeyword({ storedCaptain: null, captainKeywordLocked: 'plombier urgence', suggestedKeyword: 'plombier', title: 'T' }))
      .toBe('plombier urgence')
  })

  it('sans aucun mot-clé, le titre de l’article, jamais une chaîne vide', () => {
    expect(articleBriefKeyword({ storedCaptain: '  ', captainKeywordLocked: '', suggestedKeyword: null, title: 'Mon article' }))
      .toBe('Mon article')
  })
})

/**
 * FR-LIE-SERP-ANALYZE, FR-MOT-EXPLORATIONS-HYDRATATION — le mot-clé de travail
 * des onglets Lieutenants, Structure et Lexique (recette du 2026-09-30, FIN-4).
 * Après « Déverrouiller » puis « Les garder », le Capitaine enregistré vaut `''` :
 * le repli sur le mot-clé de l'article ne jouait pas (`??`), « Analyser SERP » et
 * « Extraire le Lexique » restaient grisés alors que des propositions et des
 * termes existaient. Un article jamais étudié a lui aussi un Capitaine `''`.
 */
describe('moteurWorkingKeyword (FIN-4)', () => {
  it('Capitaine enregistré vide : le mot-clé de l’article prend le relais', () => {
    expect(moteurWorkingKeyword('', 'budget à prévoir')).toBe('budget à prévoir')
    expect(moteurWorkingKeyword('   ', 'budget à prévoir')).toBe('budget à prévoir')
    expect(moteurWorkingKeyword(null, 'budget à prévoir')).toBe('budget à prévoir')
  })

  it('le Capitaine enregistré passe avant le mot-clé de l’article', () => {
    expect(moteurWorkingKeyword('budget travaux', 'budget à prévoir')).toBe('budget travaux')
  })

  it('ni l’un ni l’autre : aucun mot-clé (null), jamais une chaîne vide', () => {
    expect(moteurWorkingKeyword('', '')).toBeNull()
    expect(moteurWorkingKeyword(undefined, undefined)).toBeNull()
  })
})
