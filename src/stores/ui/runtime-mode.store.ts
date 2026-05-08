/**
 * AUTHORITY: localStorage `runtime-mode` (front) + GET/POST /api/runtime-mode (back)
 * READS FROM: GET /api/runtime-mode au boot (hydratation),
 *             localStorage en pré-hydratation optimiste
 * WRITES TO: POST /api/runtime-mode au clic du toggle navbar
 * CONSUMERS: AppNavbar.vue (toggle visuel)
 *
 * Toggle global mock/réel — un seul switch couvre AI provider + DataForSEO
 * sandbox côté serveur. Quand l'utilisateur n'a pas explicitement basculé,
 * `override` reste `null` et le serveur retombe sur les valeurs `.env`.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'

export type RuntimeMode = 'mock' | 'real'

const STORAGE_KEY = 'runtime-mode'

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

  /** Hydrate depuis le serveur. Si le front a un override en localStorage qui
   *  diffère du serveur (cas restart serveur), on force le serveur à reprendre
   *  la valeur du front. */
  async function hydrate(): Promise<void> {
    try {
      const data = await apiGet<RuntimeModeState>('/runtime-mode')
      const local = readLocalStorage()
      if (local !== null && local !== data.override) {
        // Restart serveur : front avait un override, serveur l'a perdu → on le repousse.
        await setMode(local)
      } else {
        override.value = data.override
        effective.value = data.effective
      }
    } catch (err) {
      log.warn('runtime-mode hydrate failed', err)
    } finally {
      isHydrated.value = true
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

  return { override, effective, isHydrated, hydrate, setMode, toggle }
})
