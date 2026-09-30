/**
 * FR-CER-AIGUILLAGE — le niveau d'un article s'affiche en toutes lettres, avec
 * la couleur de son badge, dans les listes groupées par niveau.
 *
 * Recette du 2026-09-30 :
 *   - CER-24 : au Moteur (et à la Rédaction, même liste), groupes
 *     « INTERMEDIAIRE » / « SPECIFIQUE » et badge « specifique » sans couleur ;
 *   - CER-7, CER-12, 01-T4 : « Articles du cocon (N) » rangeait tout sous « AUTRE » ;
 *   - CER-24 : « Base : ~1 200 mots (type specifique) ».
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import ContextRecap from '@/components/strategy/ContextRecap.vue'
import ContentRecommendation from '@/components/brief/ContentRecommendation.vue'
import type { Article } from '@shared/types/index.js'

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn().mockResolvedValue({ phase: 'moteur', completedChecks: [] }),
  apiPost: vi.fn().mockResolvedValue(null),
  apiPut: vi.fn().mockResolvedValue(null),
  apiPatch: vi.fn().mockResolvedValue(null),
  apiDelete: vi.fn().mockResolvedValue(null),
}))

function article(id: number, type: Article['type'], title: string): Article {
  return { id, slug: `a-${id}`, title, type, status: 'à rédiger', suggestedKeyword: null, captainKeywordLocked: null } as unknown as Article
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('FR-CER-AIGUILLAGE — Moteur et Rédaction : « Articles suggérés » par niveau', () => {
  it('les groupes s’intitulent Pilier, Intermédiaire, Spécialisé, chacun avec sa classe de couleur', () => {
    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [
          article(1, 'pilier', 'Le guide'),
          article(2, 'intermediaire', 'Le budget'),
          article(3, 'specifique', 'Comment choisir'),
        ],
        publishedArticles: [],
        selectedSlug: null,
      },
      global: { stubs: { RecapToggle: { template: '<div><slot /></div>' } } },
    })
    const badges = wrapper.findAll('.tree-type-badge')
    expect(badges.map(b => b.text())).toEqual(['Pilier', 'Intermédiaire', 'Spécialisé'])
    expect(badges.map(b => b.classes().find(c => c.startsWith('tree-type--')))).toEqual([
      'tree-type--pilier', 'tree-type--intermediaire', 'tree-type--specifique',
    ])
  })
})

describe('FR-CER-AIGUILLAGE — « Articles du cocon (N) » range chaque article sous son niveau', () => {
  function groups(cocoonArticles: string[]) {
    const wrapper = mount(ContextRecap, {
      props: { siloName: 'Silo', cocoonName: 'Cocon', cocoonArticles },
      global: { stubs: { RecapToggle: { template: '<div><slot /></div>' } } },
    })
    return wrapper.findAll('.tree-group').map(g => ({
      label: g.find('.tree-type-badge').text(),
      cls: g.find('.tree-type-badge').classes().find(c => c.startsWith('tree-type--')),
      titles: g.findAll('.tree-article-title').map(t => t.text()),
    }))
  }

  it('niveaux au format du code (« pilier ») : trois groupes, aucun « Autre »', () => {
    expect(groups(['Le guide (pilier)', 'Le budget (intermediaire)', 'Comment choisir (specifique)'])).toEqual([
      { label: 'Pilier', cls: 'tree-type--pilier', titles: ['Le guide'] },
      { label: 'Intermédiaire', cls: 'tree-type--intermediaire', titles: ['Le budget'] },
      { label: 'Spécialisé', cls: 'tree-type--specifique', titles: ['Comment choisir'] },
    ])
  })

  it('niveaux au format de la base (« Pilier ») : même rangement', () => {
    expect(groups(['Le guide (Pilier)', 'Le budget (Intermédiaire)']).map(g => g.label)).toEqual(['Pilier', 'Intermédiaire'])
  })

  it('une entrée sans niveau lisible va sous « Autre », titre intact', () => {
    expect(groups(['Le guide (2026)'])).toEqual([{ label: 'Autre', cls: 'tree-type--autre', titles: ['Le guide (2026)'] }])
  })
})

describe('FR-CER-AIGUILLAGE — la longueur conseillée nomme le niveau en toutes lettres', () => {
  it('« (type Spécialisé) », pas « (type specifique) »', () => {
    const wrapper = mount(ContentRecommendation, { props: { recommendation: 1200, articleType: 'specifique' } })
    expect(wrapper.find('[data-testid="recommendation-level"]').text()).toBe('Spécialisé')
  })
})
