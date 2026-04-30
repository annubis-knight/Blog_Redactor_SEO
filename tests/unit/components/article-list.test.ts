/**
 * Tests anti-régression pour ArticleList — 3 colonnes Pilier/Intermédiaire/Spécialisé.
 *
 * Composant macro affiché en page Rédaction. Couvre :
 *   1. articles=[] → message "Aucun article"
 *   2. articles peuplés → 3 colonnes rendues avec compteur correct
 *   3. répartition par type : Pilier / Intermédiaire / Spécialisé
 *   4. colonne vide → message dédié "Aucun article" dans la colonne
 *   5. cocoonId transmis aux cartes enfants
 *   6. ordre des colonnes stable : pilier → inter → spec
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleList from '../../../src/components/dashboard/ArticleList.vue'

const ArticleCardStub = {
  name: 'ArticleCard',
  props: ['article', 'cocoonId'],
  template: '<div class="stub-card" :data-slug="article.slug" :data-cocoon="cocoonId">{{ article.title }}</div>',
}

function makeArticle(slug: string, type: 'Pilier' | 'Intermédiaire' | 'Spécialisé', title?: string) {
  return {
    id: Math.random(),
    slug,
    title: title ?? slug,
    type,
    cocoonId: 1,
    keyword: '',
    painPoint: null,
    locked: false,
    status: 'proposed' as const,
    phase: 'proposed' as const,
  }
}

describe('ArticleList', () => {
  it('liste vide → message "Aucun article dans cette thématique"', () => {
    const wrapper = mount(ArticleList, {
      props: { articles: [] },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })
    expect(wrapper.find('.article-list-empty').exists()).toBe(true)
    expect(wrapper.find('.article-columns').exists()).toBe(false)
  })

  it('articles peuplés → 3 colonnes rendues', () => {
    const wrapper = mount(ArticleList, {
      props: {
        articles: [
          makeArticle('p1', 'Pilier'),
          makeArticle('i1', 'Intermédiaire'),
          makeArticle('s1', 'Spécialisé'),
        ],
      },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })
    expect(wrapper.findAll('.article-column')).toHaveLength(3)
  })

  it('répartition correcte par type avec bon compteur', () => {
    const wrapper = mount(ArticleList, {
      props: {
        articles: [
          makeArticle('p1', 'Pilier'),
          makeArticle('p2', 'Pilier'),
          makeArticle('i1', 'Intermédiaire'),
          makeArticle('s1', 'Spécialisé'),
          makeArticle('s2', 'Spécialisé'),
          makeArticle('s3', 'Spécialisé'),
        ],
      },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })

    const counts = wrapper.findAll('.column-count').map(c => c.text())
    expect(counts).toEqual(['2', '1', '3']) // Pilier 2 / Inter 1 / Spec 3
  })

  it('REGRESSION GUARD : ordre des colonnes Pilier → Intermédiaire → Spécialisé', () => {
    const wrapper = mount(ArticleList, {
      props: {
        articles: [makeArticle('s1', 'Spécialisé'), makeArticle('p1', 'Pilier'), makeArticle('i1', 'Intermédiaire')],
      },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })
    const labels = wrapper.findAll('.column-label').map(l => l.text())
    expect(labels).toEqual(['Pilier', 'Intermédiaire', 'Spécialisé'])
  })

  it('colonne vide → message "Aucun article" dans la colonne', () => {
    const wrapper = mount(ArticleList, {
      props: { articles: [makeArticle('p1', 'Pilier')] },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })
    // Pilier a 1 carte, Intermédiaire et Spécialisé ont chacune leur message vide.
    const emptyMessages = wrapper.findAll('.column-empty')
    expect(emptyMessages).toHaveLength(2)
  })

  it('cocoonId transmis aux ArticleCard enfants', () => {
    const wrapper = mount(ArticleList, {
      props: {
        articles: [makeArticle('p1', 'Pilier')],
        cocoonId: 42,
      },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })
    const card = wrapper.find('.stub-card')
    expect(card.attributes('data-cocoon')).toBe('42')
  })

  it('cocoonId optionnel : pas d\'erreur si absent', () => {
    const wrapper = mount(ArticleList, {
      props: { articles: [makeArticle('p1', 'Pilier')] },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })
    expect(wrapper.find('.stub-card').exists()).toBe(true)
  })

  it('chaque article rendu dans la bonne colonne', () => {
    const wrapper = mount(ArticleList, {
      props: {
        articles: [
          makeArticle('p1', 'Pilier'),
          makeArticle('i1', 'Intermédiaire'),
          makeArticle('s1', 'Spécialisé'),
        ],
      },
      global: { stubs: { ArticleCard: ArticleCardStub } },
    })

    const columns = wrapper.findAll('.article-column')
    expect(columns[0].text()).toContain('p1')
    expect(columns[0].text()).not.toContain('i1')
    expect(columns[1].text()).toContain('i1')
    expect(columns[2].text()).toContain('s1')
  })
})
