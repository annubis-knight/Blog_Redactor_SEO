/**
 * FR-CER-TYPE-TOLERANT — lire le niveau d'article tel que l'IA le rend.
 *
 * Les prompts du Cerveau demandent le format de la base (`"type": "Pilier"`),
 * le code manipule le canonique (`'pilier'`). Le parseur des propositions
 * comparait à la liste canonique : aucun type renvoyé par l'IA n'était donc
 * reconnu, et tous les articles retombaient sur le niveau par défaut.
 *
 * Constaté sur un passage réel le 2026-09-23 : 17 articles générés, tous
 * classés « Spécialisé », sans pilier ni intermédiaire — un cocon sans tête,
 * alors que les titres produits étaient eux parfaitement hiérarchisés. Le défaut
 * était invisible en mode simulé, dont les fixtures écrivaient déjà le
 * canonique.
 */
import { describe, it, expect } from 'vitest'
import { parseArticleLevel } from '../../../shared/utils/article-level'
import { buildSingleArticle } from '../../../src/composables/editor/article-proposals/builders'

describe('parseArticleLevel — accepter les deux écritures', () => {
  it('lit le format demandé aux prompts (celui de la base)', () => {
    expect(parseArticleLevel('Pilier')).toBe('pilier')
    expect(parseArticleLevel('Intermédiaire')).toBe('intermediaire')
    expect(parseArticleLevel('Spécialisé')).toBe('specifique')
  })

  it('lit le format canonique du code', () => {
    expect(parseArticleLevel('pilier')).toBe('pilier')
    expect(parseArticleLevel('intermediaire')).toBe('intermediaire')
    expect(parseArticleLevel('specifique')).toBe('specifique')
  })

  it('pardonne la casse, les espaces et les accents manquants', () => {
    expect(parseArticleLevel('  PILIER ')).toBe('pilier')
    expect(parseArticleLevel('Intermediaire')).toBe('intermediaire')
    expect(parseArticleLevel('specialise')).toBe('specifique')
    expect(parseArticleLevel('Spécifique')).toBe('specifique')
  })

  it('rend null sur une valeur inconnue, sans choisir à la place de l’appelant', () => {
    for (const valeur of ['', '   ', 'article', 'H2', null, undefined, 42, {}]) {
      expect(parseArticleLevel(valeur), `« ${String(valeur)} »`).toBeNull()
    }
  })
})

describe('buildSingleArticle — un cocon garde sa tête', () => {
  it('respecte le niveau annoncé par l’IA au format des prompts', () => {
    const article = buildSingleArticle(
      { title: 'Création de site internet à Toulouse', type: 'Pilier' },
      'specifique',
    )
    expect(article.type, 'le pilier ne doit pas être dégradé en spécialisé').toBe('pilier')
  })

  it('classe correctement un intermédiaire accentué', () => {
    const article = buildSingleArticle({ title: 'Prix d’un site', type: 'Intermédiaire' }, 'specifique')
    expect(article.type).toBe('intermediaire')
  })

  it('ne retombe sur le niveau par défaut que si le type est illisible', () => {
    expect(buildSingleArticle({ title: 'X', type: 'inconnu' }, 'specifique').type).toBe('specifique')
    expect(buildSingleArticle({ title: 'X' }, 'intermediaire').type).toBe('intermediaire')
  })

  it('hiérarchise une proposition complète comme l’IA la rend vraiment', () => {
    const bruts = [
      { title: 'Stratégie digitale pour entreprises toulousaines', type: 'Pilier' },
      { title: 'Clarifier votre positionnement marketing', type: 'Intermédiaire' },
      { title: 'Comment analyser vos concurrents', type: 'Spécialisé' },
    ]
    const niveaux = bruts.map(b => buildSingleArticle(b, 'specifique').type)
    expect(niveaux).toEqual(['pilier', 'intermediaire', 'specifique'])
  })
})
