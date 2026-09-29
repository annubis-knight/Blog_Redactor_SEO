/**
 * Navigation intelligente du Moteur : l'onglet ouvert à la sélection d'un
 * article dépend de ses checks (FR-MOT-FREE-NAV, FR-HN-TAB).
 *
 * Le test appelle le VRAI `computeSmartTab` de `useMoteurTabs` (l'ancienne
 * copie locale renvoyait « capitaine » quand tout était verrouillé, alors que
 * l'application ouvre Lexique depuis le Sprint 4, et ignorait l'onglet
 * Structure).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useMoteurTabs, type MoteurTabsApi } from '../../../src/composables/moteur/useMoteurTabs'
import { useArticleProgressStore } from '../../../src/stores/article/article-progress.store'
import { useWorkflowNavStore } from '../../../src/stores/ui/workflow-nav.store'
import {
  MOTEUR_DISCOVERY_DONE,
  MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_HN_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
} from '../../../shared/constants/workflow-checks.constants.js'

let api: MoteurTabsApi
let progressStore: ReturnType<typeof useArticleProgressStore>

function computeSmartTab(completedChecks: string[]) {
  progressStore.progressMap['7'] = {
    articleId: 7,
    phase: 'moteur',
    completedChecks,
    lastCheckAt: null,
  } as never
  return api.computeSmartTab(7)
}

beforeEach(() => {
  setActivePinia(createPinia())
  progressStore = useArticleProgressStore()
  const workflowNavStore = useWorkflowNavStore()
  mount(defineComponent({
    setup() {
      api = useMoteurTabs({
        selectedArticle: ref(null),
        isDiscoveryAllowed: ref(true),
        articleProgressStore: progressStore,
        workflowNavStore,
      })
      return () => h('div')
    },
  }))
})

describe('computeSmartTab — smart navigation', () => {
  it('AC 9: no checks → capitaine', () => {
    expect(computeSmartTab([])).toBe('capitaine')
  })

  it('AC 7: capitaine_locked → lieutenants', () => {
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED])).toBe('lieutenants')
  })

  it('AC 8 (FR-HN-TAB): capitaine_locked + lieutenants_locked → structure', () => {
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED])).toBe('structure')
  })

  it('FR-HN-TAB: capitaine_locked + lieutenants_locked + hn_locked → lexique', () => {
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED])).toBe('lexique')
  })

  it('AC 10 (Sprint 4): all Phase 2 checks → lexique, never finalisation', () => {
    expect(computeSmartTab([
      MOTEUR_CAPITAINE_LOCKED,
      MOTEUR_LIEUTENANTS_LOCKED,
      MOTEUR_HN_LOCKED,
      MOTEUR_LEXIQUE_VALIDATED,
    ])).toBe('lexique')
  })

  it('discovery_done only → capitaine (Phase 1 checks do not affect Phase 2 nav)', () => {
    expect(computeSmartTab([MOTEUR_DISCOVERY_DONE])).toBe('capitaine')
  })

  it('discovery_done + radar_done → capitaine', () => {
    expect(computeSmartTab([MOTEUR_DISCOVERY_DONE, MOTEUR_RADAR_DONE])).toBe('capitaine')
  })

  it('discovery + capitaine_locked → lieutenants', () => {
    expect(computeSmartTab([MOTEUR_DISCOVERY_DONE, MOTEUR_RADAR_DONE, MOTEUR_CAPITAINE_LOCKED])).toBe('lieutenants')
  })
})
