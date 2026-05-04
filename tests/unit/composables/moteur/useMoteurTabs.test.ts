/**
 * Vague 3 — Tests isolés useMoteurTabs.
 *
 * Référence FR PRD : FR-MOT-PHASES (3 phases : Générer/Valider/Finaliser),
 * FR-MOT-FREE-NAV (navigation libre, gating souple).
 *
 * Tests sans monter MoteurView. Stores + refs injectés.
 *
 * NOTE : on ne teste PAS l'`onBeforeUnmount` — il dépend du cycle de vie Vue
 * et serait testé via mount(MoteurView). On vérifie uniquement que
 * `setWorkflowNav` est appelé via le watcher (le clear unmount est trivial).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import {
  useMoteurTabs,
  TAB_IDS,
  TAB_LABELS,
  type MoteurTabsApi,
  type MoteurTabsDeps,
} from '../../../../src/composables/moteur/useMoteurTabs'
import { useArticleProgressStore } from '../../../../src/stores/article/article-progress.store'
import { useWorkflowNavStore } from '../../../../src/stores/ui/workflow-nav.store'
import type { SelectedArticle } from '../../../../shared/types/index'

function makeArticle(id = 1): SelectedArticle {
  return {
    id,
    slug: 'art-' + id,
    title: 'Article ' + id,
    keyword: 'seo local',
    painPoint: 'pain',
    type: 'Pilier',
    locked: false,
    source: 'proposed',
  } as never as SelectedArticle
}

/**
 * Helper : monte un composant minimal qui utilise le composable, pour qu'il
 * soit dans un setup() valide (les watchers + onBeforeUnmount nécessitent ça).
 */
function mountComposable(deps: MoteurTabsDeps): { api: MoteurTabsApi; unmount: () => void } {
  let captured: MoteurTabsApi | null = null
  const Comp = defineComponent({
    setup() {
      captured = useMoteurTabs(deps)
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { api: captured!, unmount: () => wrapper.unmount() }
}

describe('useMoteurTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AC.I.1 — TAB_IDS et TAB_LABELS exportent les 6 onglets attendus', () => {
    expect(TAB_IDS).toEqual(['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique', 'finalisation'])
    expect(Object.keys(TAB_LABELS).length).toBe(6)
  })

  it('AC.I.2 — activeTab par défaut = "capitaine", visitedTabs initialisé', () => {
    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed: ref(true),
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore: useWorkflowNavStore(),
    })
    expect(api.activeTab.value).toBe('capitaine')
    expect(api.visitedTabs.value['capitaine']).toBe(true)
    unmount()
  })

  it('AC.I.3 — nextTab retourne le bon onglet selon activeTab', () => {
    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed: ref(true),
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore: useWorkflowNavStore(),
    })

    api.setActiveTab('discovery')
    expect(api.nextTab.value).toBe('radar')

    api.setActiveTab('capitaine')
    expect(api.nextTab.value).toBe('lieutenants')

    api.setActiveTab('finalisation')
    expect(api.nextTab.value).toBe(null)
    unmount()
  })

  it('AC.I.4 — setActiveTab ignore les ids inconnus', () => {
    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed: ref(true),
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore: useWorkflowNavStore(),
    })
    api.setActiveTab('unknown-tab')
    expect(api.activeTab.value).toBe('capitaine')
    unmount()
  })

  it('AC.I.5 — computeSmartTab choisit l\'onglet pertinent selon les checks', () => {
    const articleProgressStore = useArticleProgressStore()
    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed: ref(true),
      articleProgressStore,
      workflowNavStore: useWorkflowNavStore(),
    })

    // Aucun check → capitaine
    articleProgressStore.progressMap['1'] = {
      articleId: 1,
      phase: 'moteur',
      completedChecks: [],
      lastCheckAt: null,
    } as never
    expect(api.computeSmartTab(1)).toBe('capitaine')

    // capitaine_locked → lieutenants
    articleProgressStore.progressMap['1'].completedChecks = ['capitaine_locked']
    expect(api.computeSmartTab(1)).toBe('lieutenants')

    // lieutenants_locked → lexique
    articleProgressStore.progressMap['1'].completedChecks = ['capitaine_locked', 'lieutenants_locked']
    expect(api.computeSmartTab(1)).toBe('lexique')

    // Sprint 4 friction #1 : lexique_validated NE devient PAS finalisation
    articleProgressStore.progressMap['1'].completedChecks = [
      'capitaine_locked', 'lieutenants_locked', 'lexique_validated',
    ]
    expect(api.computeSmartTab(1)).toBe('lexique')
    unmount()
  })

  it('AC.I.6 — phases reflète isDiscoveryAllowed (locked sur Phase ① quand false)', () => {
    const isDiscoveryAllowed = ref(true)
    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed,
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore: useWorkflowNavStore(),
    })

    // Allowed
    expect(api.phases.value[0]!.tabs[0]!.locked).toBe(false)
    expect(api.phases.value[0]!.tabs[1]!.locked).toBe(false)

    // Disallowed
    isDiscoveryAllowed.value = false
    expect(api.phases.value[0]!.tabs[0]!.locked).toBe(true)
    expect(api.phases.value[0]!.tabs[1]!.locked).toBe(true)
    unmount()
  })

  it('AC.I.7 — isInGenererPhase reflète activeTab', () => {
    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed: ref(true),
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore: useWorkflowNavStore(),
    })

    api.setActiveTab('discovery')
    expect(api.isInGenererPhase.value).toBe(true)

    api.setActiveTab('capitaine')
    expect(api.isInGenererPhase.value).toBe(false)
    unmount()
  })

  it('AC.I.8 — navGroups verrouille tous les onglets si selectedArticle = null', () => {
    const selectedArticle = ref<SelectedArticle | null>(null)
    const { api, unmount } = mountComposable({
      selectedArticle,
      isDiscoveryAllowed: ref(true),
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore: useWorkflowNavStore(),
    })

    const groups = api.navGroups.value
    for (const group of groups) {
      for (const item of group.items) {
        expect(item.locked).toBe(true)
        expect(item.hint).toBe('Sélectionnez un article ci-dessus')
      }
    }

    selectedArticle.value = makeArticle(1)
    const groups2 = api.navGroups.value
    expect(groups2[1]!.items[0]!.locked).toBe(false)
    unmount()
  })

  it('AC.I.9 — watcher publie l\'état dans workflowNavStore (immediate + au changement)', async () => {
    const workflowNavStore = useWorkflowNavStore()
    const setSpy = vi.spyOn(workflowNavStore, 'setWorkflowNav')

    const { api, unmount } = mountComposable({
      selectedArticle: ref(null),
      isDiscoveryAllowed: ref(true),
      articleProgressStore: useArticleProgressStore(),
      workflowNavStore,
    })

    // Immediate watch → 1 call
    expect(setSpy).toHaveBeenCalled()
    expect(setSpy.mock.calls[0]![0].workflow).toBe('moteur')
    expect(setSpy.mock.calls[0]![0].activeId).toBe('capitaine')

    // Switch tab → another call
    setSpy.mockClear()
    api.setActiveTab('lieutenants')
    await new Promise(r => setTimeout(r, 0))
    expect(setSpy).toHaveBeenCalled()
    expect(setSpy.mock.calls[setSpy.mock.calls.length - 1]![0].activeId).toBe('lieutenants')
    unmount()
  })
})
