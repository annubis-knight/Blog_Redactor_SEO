/**
 * CocoonTreeBuilder — l'écran du Cerveau qui construit le cocon depuis son
 * pilier (FR-CER-COCOON-PROGRESSIVE, FR-CER-CHILD-FROM-PILLAR-H2) : un cocon
 * vide propose de créer son pilier ; un parent non rédigé ne donne naissance à
 * rien, et l'écran dit pourquoi ; une section déjà prise mène à son article ;
 * un candidat mesuré choisi + un titre créent l'article.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const apiGet = vi.fn()
const apiPost = vi.fn()
const apiPut = vi.fn()

vi.mock('../../../src/services/api.service', async (importOriginal) => ({
  ApiRequestError: (await importOriginal<typeof import('../../../src/services/api.service')>()).ApiRequestError,
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

const runThroughGate = vi.fn(async (_id: number, action: () => Promise<unknown>) => ({ ok: true, value: await action() }))
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({ runThroughGate }),
}))

vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}))

vi.mock('../../../src/stores/strategy/cocoons.store', () => ({
  useCocoonsStore: () => ({ fetchCocoons: vi.fn(), cocoons: [] }),
}))

import CocoonTreeBuilder from '../../../src/components/production/brain/CocoonTreeBuilder.vue'
import { useCocoonStrategyStore } from '../../../src/stores/strategy/cocoon-strategy.store'
import type { ChildCandidate, CocoonTreeNode } from '../../../shared/types/cocoon-tree.types.js'

const COCOON_ID = 7

const RouterLinkStub = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

function node(overrides: Partial<CocoonTreeNode> & Pick<CocoonTreeNode, 'id' | 'title' | 'level'>): CocoonTreeNode {
  return { parentId: null, parentSection: null, keyword: null, drafted: false, sections: [], ...overrides }
}

function candidate(overrides: Partial<ChildCandidate> = {}): ChildCandidate {
  return {
    keyword: 'refonte site internet toulouse',
    title: 'Refonte de site internet à Toulouse',
    rationale: 'La section annonce ce sujet.',
    painPoint: null,
    painIntentExpected: null,
    metrics: { searchVolume: 320, keywordDifficulty: 18, cpc: 2.1, intent: 'commercial' },
    serp: [
      { position: 1, title: 'Refonte de site : le guide', domain: 'agence-un.fr', url: 'https://agence-un.fr/refonte' },
      { position: 2, title: 'Refondre son site', domain: 'agence-deux.fr', url: 'https://agence-deux.fr' },
      { position: 3, title: 'Pourquoi refondre', domain: 'blog-trois.fr', url: 'https://blog-trois.fr' },
      { position: 4, title: 'Quatrième', domain: 'quatre.fr', url: 'https://quatre.fr' },
    ],
    ...overrides,
  }
}

function serveTree(tree: CocoonTreeNode[]) {
  apiGet.mockImplementation(async (url: string) => {
    if (url === `/cocoons/${COCOON_ID}/tree`) return tree
    throw new Error(`GET inattendu : ${url}`)
  })
}

async function mountBuilder(tree: CocoonTreeNode[]) {
  serveTree(tree)
  const store = useCocoonStrategyStore()
  store.strategy = { cocoonSlug: 'cocon-test', proposedArticles: [], suggestedTopics: [] } as never
  store.saveStrategy = vi.fn(async () => {})
  const wrapper = mount(CocoonTreeBuilder, {
    props: { cocoonId: COCOON_ID, cocoonName: 'Cocon test', cocoonSlug: 'cocon-test' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('CocoonTreeBuilder — un cocon vide', () => {
  it('propose de créer le pilier, et ne lance l’appel payant qu’au clic', async () => {
    apiPost.mockResolvedValue({ level: 'pilier', parentId: null, parentSection: null, candidates: [candidate()], usage: null })
    const wrapper = await mountBuilder([])

    expect(wrapper.get('[data-testid="cocoon-tree"]').exists()).toBe(true)
    const bouton = wrapper.get('[data-testid="cocoon-create-pillar"]')
    expect(bouton.text()).toBe('Créer le pilier')
    expect(apiPost, 'rien de payant au chargement').not.toHaveBeenCalled()

    await bouton.trigger('click')
    await flushPromises()

    expect(apiPost).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/child-candidates`, { parentId: null, parentSection: null })
    expect(wrapper.find('[data-testid="cocoon-candidates-panel"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="candidate"]')).toHaveLength(1)
  })
})

// U7 : le menu « Générer avec Claude » de la carte ouvre la même porte que
// « Créer le pilier ». Un seul chemin de création, deux entrées.
describe('CocoonTreeBuilder — startPillar, l’entrée du menu « Générer avec Claude »', () => {
  type Exposed = { startPillar: () => void; canStartPillar: boolean; hasPillar: boolean }

  it('cocon vide : même proposition que « Créer le pilier »', async () => {
    apiPost.mockResolvedValue({ level: 'pilier', parentId: null, parentSection: null, candidates: [candidate()], usage: null })
    const wrapper = await mountBuilder([])
    const exposed = wrapper.vm as unknown as Exposed

    expect(exposed.canStartPillar).toBe(true)
    expect(exposed.hasPillar).toBe(false)
    exposed.startPillar()
    await flushPromises()

    expect(apiPost).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/child-candidates`, { parentId: null, parentSection: null })
    expect(wrapper.find('[data-testid="cocoon-candidates-panel"]').exists()).toBe(true)
  })

  it('proposition déjà en cours : pas de second appel', async () => {
    let resolve: (v: unknown) => void = () => {}
    apiPost.mockImplementation(() => new Promise((r) => { resolve = r }))
    const wrapper = await mountBuilder([])
    const exposed = wrapper.vm as unknown as Exposed

    exposed.startPillar()
    exposed.startPillar()
    await flushPromises()
    expect(apiPost, 'le second clic attend le premier').toHaveBeenCalledTimes(1)

    resolve({ level: 'pilier', parentId: null, parentSection: null, candidates: [candidate()], usage: null })
    await flushPromises()
  })

  it('pilier existant : rien n’est proposé', async () => {
    const wrapper = await mountBuilder([node({ id: 10, title: 'Un pilier', level: 'pilier', drafted: true })])
    const exposed = wrapper.vm as unknown as Exposed

    expect(exposed.canStartPillar).toBe(false)
    expect(exposed.hasPillar).toBe(true)
    exposed.startPillar()
    await flushPromises()

    expect(apiPost, 'un seul pilier par cocon').not.toHaveBeenCalled()
  })
})

describe('CocoonTreeBuilder — l’arbre', () => {
  it('parent non rédigé : le bouton de section est désactivé, avec l’explication', async () => {
    const wrapper = await mountBuilder([
      node({ id: 10, title: 'Création de site internet', level: 'pilier', drafted: false, sections: [{ title: 'La refonte', childId: null, childTitle: null }] }),
    ])

    const noeud = wrapper.get('[data-testid="tree-node-10"]')
    expect(noeud.text()).toContain('Création de site internet')
    expect(noeud.text()).toContain('Pilier')
    expect(noeud.get('[data-testid="tree-node-state"]').text()).toBe('À rédiger')
    expect(noeud.get('[data-testid="tree-node-link"]').attributes('href')).toBe(`/cocoon/${COCOON_ID}/article/10`)

    const bouton = noeud.get('[data-testid="tree-section-create"]')
    expect(bouton.attributes('data-section')).toBe('La refonte')
    expect(bouton.attributes('disabled'), 'un article ne naît que d’un parent rédigé').toBeDefined()
    expect(noeud.text()).toContain('Validez d\'abord le premier jet de « Création de site internet »')

    await bouton.trigger('click')
    expect(apiPost, 'aucune proposition pour un parent non rédigé').not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="cocoon-create-pillar"]').exists(), 'le cocon a déjà son pilier').toBe(false)
  })

  it('section déjà prise : un lien mène à l’article qui en est né, sans bouton de création', async () => {
    const wrapper = await mountBuilder([
      node({
        id: 10,
        title: 'Création de site internet',
        level: 'pilier',
        drafted: true,
        sections: [
          { title: 'Le référencement', childId: 11, childTitle: 'Référencer son site' },
          { title: 'La refonte', childId: null, childTitle: null },
        ],
      }),
      node({ id: 11, title: 'Référencer son site', level: 'intermediaire', parentId: 10, parentSection: 'Le référencement', drafted: true }),
    ])

    const noeud = wrapper.get('[data-testid="tree-node-10"]')
    const lien = noeud.get('[data-testid="tree-section-child"]')
    expect(lien.text()).toBe('Référencer son site')
    expect(lien.attributes('href')).toBe(`/cocoon/${COCOON_ID}/article/11`)
    const boutons = noeud.findAll('[data-testid="tree-section-create"]')
    expect(boutons.map(b => b.attributes('data-section')), 'seule la section libre se crée').toEqual(['La refonte'])
    expect(boutons[0]!.attributes('disabled'), 'parent rédigé : la section libre est ouverte').toBeUndefined()
    expect(wrapper.find('[data-testid="tree-node-11"]').exists(), 'l’intermédiaire a son propre bloc').toBe(true)
  })

  it('liste à part les articles sans parent ; sans section libre d’un parent rédigé, « Rattacher » est grisé', async () => {
    const wrapper = await mountBuilder([
      node({ id: 10, title: 'Pilier', level: 'pilier', drafted: true }),
      node({ id: 20, title: 'Ancien article', level: 'intermediaire' }),
    ])

    const aPart = wrapper.get('[data-testid="tree-orphans"]')
    expect(aPart.text()).toContain('Ancien article')
    expect(aPart.get('[data-testid="tree-orphan-attach"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="tree-node-20"]').exists()).toBe(false)
  })

  // K8 : un article d'avant l'arbre se rattache depuis l'écran, sans SQL.
  it('rattacher : choisir la section libre d’un parent rédigé, puis confirmer', async () => {
    const wrapper = await mountBuilder([
      node({ id: 10, title: 'Pilier', level: 'pilier', drafted: true, sections: [{ title: 'La refonte', childId: null, childTitle: null }] }),
      node({ id: 20, title: 'Ancien article', level: 'intermediaire' }),
    ])
    apiPut.mockResolvedValue({ id: 20, parentId: 10, parentSection: 'La refonte' })

    await wrapper.get('[data-testid="tree-orphan-attach"]').trigger('click')
    const choix = wrapper.get('[data-testid="tree-orphan-attach-select"]')
    expect(choix.findAll('option').map(o => o.text())).toContain('« La refonte » — Pilier')
    const confirmer = wrapper.get('[data-testid="tree-orphan-attach-confirm"]')
    expect(confirmer.attributes('disabled'), 'rien de choisi').toBeDefined()

    await choix.setValue('10::La refonte')
    await confirmer.trigger('click')
    await flushPromises()

    expect(apiPut).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/articles/20/parent`, { parentId: 10, parentSection: 'La refonte' })
    expect(apiGet.mock.calls.filter(c => c[0] === `/cocoons/${COCOON_ID}/tree`), 'l’arbre est rechargé').toHaveLength(2)
  })
})

describe('CocoonTreeBuilder — choisir un candidat et créer l’article', () => {
  const PILIER_REDIGE = node({
    id: 10,
    title: 'Création de site internet',
    level: 'pilier',
    drafted: true,
    sections: [{ title: 'La refonte', childId: null, childTitle: null }],
  })

  async function openSection() {
    apiPost.mockImplementation(async (url: string) => {
      if (url === `/cocoons/${COCOON_ID}/child-candidates`) {
        return {
          level: 'intermediaire',
          parentId: 10,
          parentSection: 'La refonte',
          candidates: [candidate(), candidate({ keyword: 'refonte site vitrine', title: 'Refondre un site vitrine', metrics: null, serp: [] })],
          usage: null,
        }
      }
      if (url === `/cocoons/${COCOON_ID}/articles`) return { id: 99, slug: 'refonte' }
      if (url === '/keywords') return { success: true }
      throw new Error(`POST inattendu : ${url}`)
    })
    const wrapper = await mountBuilder([PILIER_REDIGE])
    await wrapper.get('[data-testid="tree-section-create"][data-section="La refonte"]').trigger('click')
    await flushPromises()
    return wrapper
  }

  it('montre les données réelles de chaque candidat, et marque celui qui n’a pas pu être mesuré', async () => {
    const wrapper = await openSection()

    expect(apiPost).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/child-candidates`, { parentId: 10, parentSection: 'La refonte' })
    const panneau = wrapper.get('[data-testid="tree-node-10"] [data-testid="cocoon-candidates-panel"]')
    const [mesure, nonMesure] = panneau.findAll('[data-testid="candidate"]')
    expect(mesure!.attributes('data-keyword')).toBe('refonte site internet toulouse')
    expect(mesure!.text()).toContain('320 recherches par mois')
    expect(mesure!.text()).toContain('18/100')
    expect(mesure!.text()).toContain('Commerciale')
    expect(mesure!.text()).toContain('agence-un.fr')
    expect(mesure!.text()).toContain('blog-trois.fr')
    expect(mesure!.text(), 'trois premiers résultats seulement').not.toContain('quatre.fr')
    expect(mesure!.text()).toContain('La section annonce ce sujet.')

    expect(nonMesure!.text()).toContain('Non mesuré')
    expect(nonMesure!.get('input[type="radio"]').attributes('disabled')).toBeDefined()
    expect(panneau.text(), 'les chiffres sont expliqués').toContain('cherché par mois sur Google')
  })

  it('le bouton reste désactivé sans candidat choisi ou avec un titre trop court', async () => {
    const wrapper = await openSection()
    const creer = wrapper.get('[data-testid="candidate-create"]')
    expect(creer.attributes('disabled'), 'aucun candidat choisi').toBeDefined()

    await wrapper.findAll('[data-testid="candidate"]')[0]!.get('input[type="radio"]').setValue(true)
    const titre = wrapper.get('[data-testid="candidate-title-input"]')
    expect((titre.element as HTMLInputElement).value, 'prérempli par le titre du candidat').toBe('Refonte de site internet à Toulouse')
    expect(creer.attributes('disabled')).toBeUndefined()

    await titre.setValue('ab')
    expect(creer.attributes('disabled'), 'moins de 3 caractères').toBeDefined()
  })

  it('choix d’un candidat + titre → l’article est créé avec ce mot-clé et ce titre', async () => {
    const wrapper = await openSection()

    await wrapper.findAll('[data-testid="candidate"]')[0]!.get('input[type="radio"]').setValue(true)
    await wrapper.get('[data-testid="candidate-title-input"]').setValue('Refonte de site à Toulouse : le guide')
    await wrapper.get('[data-testid="candidate-create"]').trigger('click')
    await flushPromises()

    expect(runThroughGate).toHaveBeenCalledWith(10, expect.any(Function))
    const creation = apiPost.mock.calls.find(c => c[0] === `/cocoons/${COCOON_ID}/articles`)
    expect(creation![1]).toMatchObject({
      title: 'Refonte de site à Toulouse : le guide',
      type: 'intermediaire',
      parentId: 10,
      parentSection: 'La refonte',
      suggestedKeyword: 'refonte site internet toulouse',
    })
    expect(wrapper.find('[data-testid="cocoon-candidates-panel"]').exists(), 'le panneau se referme').toBe(false)
  })
})
