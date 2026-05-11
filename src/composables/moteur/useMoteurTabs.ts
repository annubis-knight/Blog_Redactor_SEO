import { ref, computed, watch, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import type { NavGroup } from '@/components/shared/WorkflowNav.vue'
import type { useWorkflowNavStore } from '@/stores/ui/workflow-nav.store'
import type { useArticleProgressStore } from '@/stores/article/article-progress.store'
import type { SelectedArticle } from '@shared/types/index.js'
import {
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
} from '@shared/constants/workflow-checks.constants.js'

/**
 * Vague 3 — Composable extrait de MoteurView.
 *
 * Gestion des onglets Moteur : 6 onglets répartis en 3 phases (Générer,
 * Valider, Finaliser). Implémente FR-MOT-PHASES (3 phases) et
 * FR-MOT-FREE-NAV (navigation libre, gating souple).
 *
 * Encapsule :
 *  - state des onglets (`activeTab`, `visitedTabs`)
 *  - définition des phases / labels
 *  - calcul de `nextTab` / `isInGenererPhase`
 *  - publication vers `workflowNavStore` (slot droit AppNavbar) avec
 *    cleanup au unmount.
 *  - `computeSmartTab(articleId)` qui choisit l'onglet de départ pertinent.
 *
 * Dépendances explicites en paramètres → testable en isolation.
 */
export const TAB_IDS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique', 'finalisation'] as const
export type Tab = typeof TAB_IDS[number]

export interface Phase {
  id: string
  label: string
  number: number
  tabs: { id: string; label: string; optional?: boolean; locked?: boolean }[]
}

export const TAB_LABELS: Record<Tab, string> = {
  discovery: 'Discovery',
  radar: 'Radar',
  capitaine: 'Capitaine',
  lieutenants: 'Lieutenants',
  lexique: 'Lexique',
  finalisation: 'Finalisation',
}

export interface MoteurTabsDeps {
  selectedArticle: Ref<SelectedArticle | null>
  isDiscoveryAllowed: Ref<boolean>
  articleProgressStore: ReturnType<typeof useArticleProgressStore>
  workflowNavStore: ReturnType<typeof useWorkflowNavStore>
}

export interface MoteurTabsApi {
  /** Onglet actuellement actif. */
  activeTab: Ref<Tab>
  /** Onglets déjà visités (clés `Tab` → boolean). v-show keep-alive lazy mount. */
  visitedTabs: Ref<Record<string, boolean>>
  /** Onglet suivant logique (selon TAB_IDS). null si dernier. */
  nextTab: ComputedRef<Tab | null>
  /** Définition des 3 phases avec leurs onglets. */
  phases: ComputedRef<Phase[]>
  /** True si activeTab ∈ {discovery, radar} (Phase ① Générer). */
  isInGenererPhase: ComputedRef<boolean>
  /** Setter type-safe ; ignore les ids inconnus. */
  setActiveTab: (tabId: string) => void
  /**
   * Premier onglet utile par checks : aucun→'capitaine', capitaine_locked→'lieutenants',
   * lieutenants_locked→'lexique'. Pas d'auto-nav vers Finalisation.
   */
  computeSmartTab: (articleId: number) => Tab
  /** Groupes nav publiés vers `workflowNavStore` (slot droit AppNavbar). */
  navGroups: ComputedRef<NavGroup[]>
}

export function useMoteurTabs(deps: MoteurTabsDeps): MoteurTabsApi {
  const { selectedArticle, isDiscoveryAllowed, articleProgressStore, workflowNavStore } = deps

  const activeTab = ref<Tab>('capitaine')

  // Track which tabs have been visited — v-if creates them lazily, v-show keeps them alive
  const visitedTabs = ref<Record<string, boolean>>({ capitaine: true })
  watch(activeTab, (tab) => { visitedTabs.value[tab] = true })

  const nextTab = computed<Tab | null>(() => {
    const idx = TAB_IDS.indexOf(activeTab.value)
    if (idx < 0 || idx >= TAB_IDS.length - 1) return null
    return TAB_IDS[idx + 1] ?? null
  })

  const phases = computed<Phase[]>(() => [
    {
      id: 'generer',
      label: 'Générer',
      number: 1,
      tabs: [
        { id: 'discovery', label: 'Discovery', optional: true, locked: !isDiscoveryAllowed.value },
        { id: 'radar', label: 'Radar', optional: true, locked: !isDiscoveryAllowed.value },
      ],
    },
    {
      id: 'valider',
      label: 'Valider',
      number: 2,
      tabs: [
        { id: 'capitaine', label: 'Capitaine' },
        { id: 'lieutenants', label: 'Lieutenants' },
        { id: 'lexique', label: 'Lexique' },
      ],
    },
    {
      id: 'finaliser',
      label: 'Finaliser',
      number: 3,
      tabs: [
        { id: 'finalisation', label: 'Finalisation' },
      ],
    },
  ])

  const isInGenererPhase = computed(() =>
    activeTab.value === 'discovery' || activeTab.value === 'radar',
  )

  function setActiveTab(tabId: string) {
    if ((TAB_IDS as readonly string[]).includes(tabId)) {
      activeTab.value = tabId as Tab
    }
  }

  function computeSmartTab(articleId: number): Tab {
    const progress = articleProgressStore.getProgress(articleId)
    const checks = progress?.completedChecks ?? []
    if (checks.length === 0) return 'capitaine'
    // Pas d'auto-nav vers Finalisation.
    if (checks.includes(MOTEUR_LIEUTENANTS_LOCKED)) return 'lexique'
    if (checks.includes(MOTEUR_CAPITAINE_LOCKED)) return 'lieutenants'
    return 'capitaine'
  }

  const navGroups = computed<NavGroup[]>(() =>
    phases.value.map(p => ({
      id: p.id,
      label: p.label,
      number: p.number,
      items: p.tabs.map(t => ({
        id: t.id,
        label: t.label,
        locked: t.locked || !selectedArticle.value,
        hint: !selectedArticle.value
          ? 'Sélectionnez un article ci-dessus'
          : t.locked
            ? 'Mots-clés déjà validés — onglet verrouillé'
            : undefined,
      })),
    })),
  )

  watch(
    [navGroups, activeTab],
    ([groups, active]) => {
      workflowNavStore.setWorkflowNav({
        workflow: 'moteur',
        activeId: active,
        groups,
        onNavigate: (id: string) => setActiveTab(id),
      })
    },
    { immediate: true, deep: true },
  )

  onBeforeUnmount(() => { workflowNavStore.clearWorkflowNav() })

  return {
    activeTab,
    visitedTabs,
    nextTab,
    phases,
    isInGenererPhase,
    setActiveTab,
    computeSmartTab,
    navGroups,
  }
}
