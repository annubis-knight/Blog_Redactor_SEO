/**
 * FR-MOT-RECAP-LOCK-SYNC — la barre du haut du Moteur affiche le mot-clé d'un
 * article en « suggéré » (pointillés, estompé) ou en « verrouillé » selon
 * `captainKeywordLocked`.
 *
 * Ce champ était écrit `null` en dur dans `MoteurView` : l'article affichait
 * donc toujours « suggéré », même Capitaine verrouillé et même après
 * rechargement. Le valideur ci-dessous interdit ce retour en arrière.
 */
import { describe, it, expect } from 'vitest'
import { buildRecapArticles } from '../../../src/utils/recap-articles'
import type { ProposedArticle } from '../../../shared/types/index.js'

function proposed(overrides: Partial<ProposedArticle> = {}): ProposedArticle {
  return {
    id: 'p-1',
    title: 'Création de site internet à Toulouse',
    suggestedTitles: [],
    type: 'pilier',
    parentTitle: null,
    rationale: '',
    painPoint: 'Mon site ne m’amène aucun client.',
    painIntentExpected: 'commercial',
    suggestedKeyword: 'creation site internet toulouse',
    suggestedKeywords: [],
    suggestedSlug: 'creation-site-internet-toulouse',
    suggestedSlugs: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: true,
    createdInDb: true,
    dbId: 42,
    ...overrides,
  } as ProposedArticle
}

describe('buildRecapArticles — état de verrouillage du Capitaine', () => {
  it('affiche le mot-clé comme verrouillé quand la carte des capitaines le connaît', () => {
    const [article] = buildRecapArticles([proposed()], { 42: 'creation site internet toulouse' })

    expect(article.captainKeywordLocked).toBe('creation site internet toulouse')
  })

  it('laisse le mot-clé en suggestion quand aucun Capitaine n’est verrouillé', () => {
    const [article] = buildRecapArticles([proposed()], {})

    expect(article.captainKeywordLocked).toBeNull()
    expect(article.suggestedKeyword, 'la suggestion reste visible').toBe('creation site internet toulouse')
  })

  it('traite une chaîne vide comme une absence, pas comme un mot-clé verrouillé', () => {
    const [article] = buildRecapArticles([proposed()], { 42: '' })

    expect(article.captainKeywordLocked).toBeNull()
  })

  it('n’attribue le verrou qu’à l’article concerné', () => {
    const articles = buildRecapArticles(
      [proposed({ dbId: 42 }), proposed({ id: 'p-2', dbId: 43, suggestedSlug: 'prix-site-internet' })],
      { 42: 'creation site internet toulouse' },
    )

    expect(articles[0].captainKeywordLocked).toBe('creation site internet toulouse')
    expect(articles[1].captainKeywordLocked).toBeNull()
  })

  it('conserve les champs que la barre du haut affiche', () => {
    const [article] = buildRecapArticles([proposed()], {})

    expect(article.id).toBe(42)
    expect(article.title).toBe('Création de site internet à Toulouse')
    expect(article.type).toBe('pilier')
    expect(article.slug).toBe('creation-site-internet-toulouse')
    expect(article.painPoint).toBe('Mon site ne m’amène aucun client.')
    expect(article.phase).toBe('proposed')
  })

  it('remplace un mot-clé suggéré vide par une absence explicite', () => {
    const [article] = buildRecapArticles([proposed({ suggestedKeyword: '' })], {})

    expect(article.suggestedKeyword).toBeNull()
  })
})
