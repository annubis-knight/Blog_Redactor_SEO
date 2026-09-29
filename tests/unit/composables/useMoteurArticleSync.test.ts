/**
 * FR-CAP-CHECK — un refus de la porte qui arrive après un déverrouillage
 * n'ouvre pas d'alarme.
 *
 * Verrouiller demande l'étape « Capitaine verrouillé » ; le serveur juge la
 * porte sur le capitaine enregistré au moment où la demande arrive. Si
 * l'utilisateur a déverrouillé entre-temps, le serveur juge un capitaine vide
 * et refuse : l'écran ouvrait alors une alarme pour un verrou qui n'existe plus
 * (et le test navigateur d'anti-duplication restait bloqué derrière).
 */
import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import type { SelectedArticle } from '@shared/types/index.js'
import { MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED } from '@shared/constants/workflow-checks.constants.js'

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({ cleared: 0 }),
}))
vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/composables/ui/useNotify', () => ({ useNotify: () => ({ warning: vi.fn() }) }))

const { useMoteurArticleSync } = await import('@/composables/moteur/useMoteurArticleSync')

type RunOpts = { stillWanted?: () => boolean }

function setup() {
  const calls: RunOpts[] = []
  const gateAlarm = {
    runThroughGate: vi.fn((_id: number, _action: () => Promise<unknown>, opts: RunOpts = {}) => {
      calls.push(opts)
      return new Promise<{ ok: false }>(() => {}) // la réponse du serveur n'est pas encore arrivée
    }),
  }
  const articleProgressStore = {
    addCheck: vi.fn().mockResolvedValue(undefined),
    removeCheck: vi.fn().mockResolvedValue(undefined),
  }
  const sync = useMoteurArticleSync({
    selectedArticle: ref({ id: 7, title: 'Article' } as unknown as SelectedArticle),
    cocoonName: computed(() => 'Cocon'),
    articleProgressStore: articleProgressStore as never,
    gateAlarm: gateAlarm as never,
  })
  return { sync, calls }
}

describe('FR-CAP-CHECK — une demande d’étape dépassée n’ouvre pas d’alarme', () => {
  it('déverrouiller après la demande rend son refus sans objet', () => {
    const { sync, calls } = setup()
    sync.emitCheckCompleted(MOTEUR_CAPITAINE_LOCKED)
    expect(calls[0]?.stillWanted, 'la demande dit si elle est encore voulue').toBeTypeOf('function')
    expect(calls[0]!.stillWanted!()).toBe(true)

    sync.handleCheckRemoved(MOTEUR_CAPITAINE_LOCKED)
    expect(calls[0]!.stillWanted!(), 'déverrouillé : le refus ne concerne plus rien').toBe(false)
  })

  it('une nouvelle demande remplace l’ancienne, sans toucher aux autres étapes', () => {
    const { sync, calls } = setup()
    sync.emitCheckCompleted(MOTEUR_CAPITAINE_LOCKED)
    sync.emitCheckCompleted(MOTEUR_LIEUTENANTS_LOCKED)
    sync.emitCheckCompleted(MOTEUR_CAPITAINE_LOCKED)
    expect(calls[0]!.stillWanted!(), 'la première demande est dépassée').toBe(false)
    expect(calls[1]!.stillWanted!(), 'une autre étape n’est pas concernée').toBe(true)
    expect(calls[2]!.stillWanted!()).toBe(true)
  })
})
