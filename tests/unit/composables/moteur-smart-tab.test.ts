/**
 * Sprint 4 (2026-05-04) — Test computeSmartTab.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « La navigation était par défaut sur l'onglet finalisation, c'est
 *     totalement faux. »
 *
 * Avant Sprint 4 : si les verrous Phase ② étaient posés, sélectionner
 * l'article ramenait sur Finalisation (récap pré-Rédaction).
 *
 * Après Sprint 4 : Finalisation n'est plus jamais retournée par computeSmartTab.
 * L'utilisateur y va explicitement via le CTA bas-de-page de Lexique.
 *
 * FR-HN-TAB (chantier C6) : l'onglet Structure s'insère entre Lieutenants et
 * Lexique. `lieutenants_locked` mène à Structure, `hn_locked` à Lexique.
 *
 * Le test appelle le VRAI `computeSmartTab` de `useMoteurTabs`, avec les
 * constantes de `workflow-checks.constants` (une copie locale de la fonction
 * pouvait rester verte alors que l'application avait changé).
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

const ARTICLE_ID = 1

let api: MoteurTabsApi
let progressStore: ReturnType<typeof useArticleProgressStore>

function computeSmartTab(checks: string[]) {
  progressStore.progressMap[String(ARTICLE_ID)] = {
    articleId: ARTICLE_ID,
    phase: 'moteur',
    completedChecks: checks,
    lastCheckAt: null,
  } as never
  return api.computeSmartTab(ARTICLE_ID)
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

describe('computeSmartTab — Sprint 4 (#1) + FR-HN-TAB', () => {
  it('article neuf (0 checks) → capitaine', () => {
    expect(computeSmartTab([])).toBe('capitaine')
  })

  it('capitaine_locked seul → lieutenants', () => {
    expect(computeSmartTab([MOTEUR_DISCOVERY_DONE, MOTEUR_CAPITAINE_LOCKED])).toBe('lieutenants')
  })

  it('FR-HN-TAB — lieutenants_locked → structure', () => {
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED])).toBe('structure')
  })

  it('FR-HN-TAB — hn_locked → lexique', () => {
    expect(computeSmartTab([MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED])).toBe('lexique')
  })

  it('AC1 — TOUS les 4 verrous Phase ② → reste sur lexique (PAS finalisation)', () => {
    // C'était le bug : avant Sprint 4 ça retournait 'finalisation'.
    const checks = [MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED, MOTEUR_LEXIQUE_VALIDATED]
    expect(computeSmartTab(checks)).toBe('lexique')
  })

  it('les anciennes valeurs sans préfixe ne sont pas reconnues (checks préfixés moteur:*)', () => {
    expect(computeSmartTab(['capitaine_locked', 'lieutenants_locked'])).toBe('capitaine')
  })

  it('AC1 — Finalisation n\'est JAMAIS retournée par computeSmartTab (anti-régression)', () => {
    const cases = [
      [],
      [MOTEUR_DISCOVERY_DONE],
      [MOTEUR_DISCOVERY_DONE, MOTEUR_RADAR_DONE],
      [MOTEUR_CAPITAINE_LOCKED],
      [MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED],
      [MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED],
      [MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED, MOTEUR_LEXIQUE_VALIDATED],
      // Ordre différent ne doit pas changer le résultat
      [MOTEUR_LEXIQUE_VALIDATED, MOTEUR_HN_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_CAPITAINE_LOCKED],
    ]
    for (const checks of cases) {
      expect(computeSmartTab(checks)).not.toBe('finalisation')
    }
  })
})
