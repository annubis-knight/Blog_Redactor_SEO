/**
 * AUTHORITY: le mode effectif du serveur (GET /api/runtime-mode, `effective`) ;
 *            localStorage `runtime-mode` garde le dernier choix de l'utilisateur.
 * READS FROM: GET /api/runtime-mode au boot (hydratation), puis au retour du
 *             focus, quand l'onglet redevient visible et à intervalle régulier
 *             (resynchronisation, FR-INFRA-RUNTIME-MODE) ;
 *             localStorage en pré-hydratation optimiste.
 * WRITES TO: POST /api/runtime-mode au clic du toggle navbar, et quand le
 *            serveur a perdu le choix de l'utilisateur (redémarrage).
 * CONSUMERS: AppNavbar.vue (badge MOCK / RÉEL).
 * RELATED FR: FR-INFRA-RUNTIME-MODE, NFR-COST-AI-MOCK.
 *
 * Toggle global mock/réel — un seul switch couvre AI provider + DataForSEO
 * sandbox côté serveur. Quand l'utilisateur n'a pas explicitement basculé,
 * `override` reste `null` et le serveur retombe sur les valeurs `.env`.
 * Le badge affiche toujours le mode EFFECTIF du serveur : c'est celui qui
 * décide de la facturation.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'

export type RuntimeMode = 'mock' | 'real'

const STORAGE_KEY = 'runtime-mode'

/** Intervalle de resynchronisation du badge (un GET local, sans coût). */
export const RUNTIME_MODE_RESYNC_MS = 15_000

interface RuntimeModeState {
  override: RuntimeMode | null
  effective: RuntimeMode
}

function readLocalStorage(): RuntimeMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'mock' || raw === 'real') return raw
    return null
  } catch {
    return null
  }
}

function writeLocalStorage(mode: RuntimeMode | null): void {
  try {
    if (mode === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // localStorage indisponible (mode privé) — ignore silencieusement.
  }
}

export const useRuntimeModeStore = defineStore('runtime-mode', () => {
  const override = ref<RuntimeMode | null>(readLocalStorage())
  const effective = ref<RuntimeMode>(override.value ?? 'real')
  const isHydrated = ref(false)

  let inFlight: Promise<void> | null = null

  async function syncFromServer(): Promise<void> {
    try {
      const data = await apiGet<RuntimeModeState>('/runtime-mode')
      const local = readLocalStorage()
      if (local !== null && data.override === null) {
        // Redémarrage du serveur : il a perdu le choix de l'utilisateur → on le lui rend.
        await setMode(local)
      } else {
        // Le serveur fait foi. S'il porte un autre choix que le nôtre (posé par
        // le mode automatique ou un autre onglet), on l'adopte au lieu de le
        // renverser : repousser l'ancien choix pourrait faire payer un run lancé
        // en simulé.
        override.value = data.override
        effective.value = data.effective
        if (data.override !== null && data.override !== local) writeLocalStorage(data.override)
      }
    } catch (err) {
      log.warn('runtime-mode hydrate failed', err)
    } finally {
      isHydrated.value = true
    }
  }

  /** Hydrate depuis le serveur (une seule requête à la fois). */
  function hydrate(): Promise<void> {
    if (!inFlight) {
      inFlight = syncFromServer().finally(() => { inFlight = null })
    }
    return inFlight
  }

  /**
   * Resynchronise le badge sans rechargement de la page : au retour du focus,
   * quand l'onglet redevient visible, et toutes les `intervalMs`. Couvre le
   * redémarrage du serveur en cours de session. Renvoie la fonction d'arrêt.
   */
  function startAutoResync(intervalMs: number = RUNTIME_MODE_RESYNC_MS): () => void {
    if (typeof window === 'undefined') return () => {}
    const onFocus = () => { void hydrate() }
    const onVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void hydrate()
    }
    window.addEventListener('focus', onFocus)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => { void hydrate() }, intervalMs)
    return () => {
      window.removeEventListener('focus', onFocus)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }

  async function setMode(mode: RuntimeMode | null): Promise<void> {
    const previousOverride = override.value
    const previousEffective = effective.value
    override.value = mode
    effective.value = mode ?? 'real'
    writeLocalStorage(mode)
    try {
      const data = await apiPost<RuntimeModeState>('/runtime-mode', { mode })
      override.value = data.override
      effective.value = data.effective
    } catch (err) {
      log.error('runtime-mode setMode failed — rolling back', err)
      override.value = previousOverride
      effective.value = previousEffective
      writeLocalStorage(previousOverride)
      throw err
    }
  }

  function toggle(): Promise<void> {
    const next: RuntimeMode = effective.value === 'mock' ? 'real' : 'mock'
    return setMode(next)
  }

  return { override, effective, isHydrated, hydrate, startAutoResync, setMode, toggle }
})
