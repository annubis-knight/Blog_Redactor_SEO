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
import { ref, computed, reactive } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { SelectedArticle, ArticleProgress } from '@shared/types/index.js'
import { MOTEUR_CAPITAINE_LOCKED, MOTEUR_HN_LOCKED, MOTEUR_LIEUTENANTS_LOCKED } from '@shared/constants/workflow-checks.constants.js'

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

const PROGRESS: ArticleProgress = { phase: 'moteur', completedChecks: [MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED], checkTimestamps: {} } as never

/** Store des mots-clés simulé : une lecture = une promesse qu'on libère quand on veut. */
function fakeKeywordsStore() {
  const pending = new Map<number, Array<(ok: boolean) => void>>()
  const store = reactive({
    loadedArticleId: null as number | null,
    $reset: vi.fn(() => { store.loadedArticleId = null }),
    fetchKeywordsMerge: vi.fn((id: number) => new Promise<void>((resolve) => {
      const list = pending.get(id) ?? []
      list.push((ok) => { if (ok) store.loadedArticleId = id; resolve() })
      pending.set(id, list)
    })),
  })
  /** Répond à la lecture des mots-clés de `id` (réussie ou non). */
  function answer(id: number, ok = true) {
    for (const done of pending.get(id) ?? []) done(ok)
    pending.delete(id)
  }
  return { store, answer }
}

function fakeProgressStore(progress: ArticleProgress | null = PROGRESS) {
  return {
    addCheck: vi.fn().mockResolvedValue(undefined),
    removeCheck: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn(() => null),
    fetchProgress: vi.fn().mockResolvedValue(progress),
  }
}

async function setup() {
  const calls: RunOpts[] = []
  const gateAlarm = {
    runThroughGate: vi.fn((_id: number, _action: () => Promise<unknown>, opts: RunOpts = {}) => {
      calls.push(opts)
      return new Promise<{ ok: false }>(() => {}) // la réponse du serveur n'est pas encore arrivée
    }),
  }
  const keywords = fakeKeywordsStore()
  const sync = useMoteurArticleSync({
    selectedArticle: ref({ id: 7, title: 'Article' } as unknown as SelectedArticle),
    cocoonName: computed(() => 'Cocon'),
    articleProgressStore: fakeProgressStore() as never,
    articleKeywordsStore: keywords.store as never,
    gateAlarm: gateAlarm as never,
  })
  keywords.answer(7)
  await flushPromises()
  return { sync, calls }
}

describe('FR-CAP-CHECK — une demande d’étape dépassée n’ouvre pas d’alarme', () => {
  it('déverrouiller après la demande rend son refus sans objet', async () => {
    const { sync, calls } = await setup()
    sync.emitCheckCompleted(MOTEUR_CAPITAINE_LOCKED)
    expect(calls[0]?.stillWanted, 'la demande dit si elle est encore voulue').toBeTypeOf('function')
    expect(calls[0]!.stillWanted!()).toBe(true)

    sync.handleCheckRemoved(MOTEUR_CAPITAINE_LOCKED)
    expect(calls[0]!.stillWanted!(), 'déverrouillé : le refus ne concerne plus rien').toBe(false)
  })

  it('une nouvelle demande remplace l’ancienne, sans toucher aux autres étapes', async () => {
    const { sync, calls } = await setup()
    sync.emitCheckCompleted(MOTEUR_CAPITAINE_LOCKED)
    sync.emitCheckCompleted(MOTEUR_LIEUTENANTS_LOCKED)
    sync.emitCheckCompleted(MOTEUR_CAPITAINE_LOCKED)
    expect(calls[0]!.stillWanted!(), 'la première demande est dépassée').toBe(false)
    expect(calls[1]!.stillWanted!(), 'une autre étape n’est pas concernée').toBe(true)
    expect(calls[2]!.stillWanted!()).toBe(true)
  })
})

/**
 * FR-MOT-CHECK-RECONCILIATION, FR-MOT-NO-AUTO-ACTION — choisir un article ne fait
 * que relire (recette du 2026-09-30, F4). Tant que ses mots-clés et ses étapes ne
 * sont pas arrivés, les panneaux ne sont pas montés et aucune étape n'est écrite :
 * un store vidé au choix faisait retirer « Lieutenants », puis « Structure
 * validée » par cascade du serveur, jamais rendue.
 */
describe('FR-MOT-CHECK-RECONCILIATION — choisir un article ne fait que relire', () => {
  function mountSync(progress: ArticleProgress | null = PROGRESS) {
    const selectedArticle = ref<SelectedArticle | null>(null)
    const keywords = fakeKeywordsStore()
    const progressStore = fakeProgressStore(progress)
    const sync = useMoteurArticleSync({
      selectedArticle,
      cocoonName: computed(() => 'Cocon'),
      articleProgressStore: progressStore as never,
      articleKeywordsStore: keywords.store as never,
    })
    const choose = async (id: number | null) => {
      selectedArticle.value = id === null ? null : ({ id, title: `Article ${id}` } as unknown as SelectedArticle)
      await flushPromises()
    }
    return { sync, keywords, progressStore, choose }
  }

  it('pendant la lecture, l’article n’est pas prêt et aucune étape n’est retirée ni demandée', async () => {
    const { sync, progressStore, choose } = mountSync()
    await choose(1339)

    expect(sync.articleReady.value).toBe(false)
    sync.handleCheckRemoved(MOTEUR_LIEUTENANTS_LOCKED)
    sync.emitCheckCompleted(MOTEUR_LIEUTENANTS_LOCKED)
    await flushPromises()
    expect(progressStore.removeCheck, 'aucun retrait pendant la lecture').not.toHaveBeenCalled()
    expect(progressStore.addCheck, 'aucune demande pendant la lecture').not.toHaveBeenCalled()
  })

  it('mots-clés et étapes relus : l’article est prêt, les gestes écrivent de nouveau', async () => {
    const { sync, keywords, progressStore, choose } = mountSync()
    await choose(1339)
    expect(keywords.store.$reset, 'le store de l’article précédent est vidé').toHaveBeenCalled()
    expect(keywords.store.fetchKeywordsMerge).toHaveBeenCalledWith(1339)
    expect(progressStore.fetchProgress).toHaveBeenCalledWith(1339)

    keywords.answer(1339)
    await flushPromises()
    expect(sync.articleReady.value).toBe(true)

    sync.handleCheckRemoved(MOTEUR_LIEUTENANTS_LOCKED)
    expect(progressStore.removeCheck).toHaveBeenCalledWith(1339, MOTEUR_LIEUTENANTS_LOCKED)
  })

  it('rechoisir un article (désélection puis choix) le relit : pas prêt avant la nouvelle réponse', async () => {
    const { sync, keywords, choose } = mountSync()
    await choose(1339)
    keywords.answer(1339)
    await flushPromises()
    expect(sync.articleReady.value).toBe(true)

    await choose(null)
    expect(sync.articleReady.value).toBe(false)
    await choose(1339)
    expect(sync.articleReady.value, 'relu à chaque choix').toBe(false)
    keywords.answer(1339)
    await flushPromises()
    expect(sync.articleReady.value).toBe(true)
  })

  it('la lecture d’un article quitté n’en rend pas un autre prêt', async () => {
    const { sync, keywords, choose } = mountSync()
    await choose(1335)
    await choose(1339)
    keywords.answer(1335)
    await flushPromises()
    expect(sync.articleReady.value).toBe(false)

    keywords.answer(1339)
    await flushPromises()
    expect(sync.articleReady.value).toBe(true)
  })

  it('lecture impossible : un message, pas de panneau, et « Réessayer » relit', async () => {
    const { sync, keywords, choose } = mountSync()
    await choose(1339)
    keywords.answer(1339, false)
    await flushPromises()
    expect(sync.articleReady.value).toBe(false)
    expect(sync.articleLoadError.value).toContain('Réessayez')

    const retry = sync.reloadSelectedArticle()
    await flushPromises()
    keywords.answer(1339)
    await retry
    expect(sync.articleLoadError.value).toBeNull()
    expect(sync.articleReady.value).toBe(true)
  })

  it('progression introuvable : l’article n’est pas prêt (les étapes ne sont pas jugées sur du vide)', async () => {
    const { sync, keywords, choose } = mountSync(null)
    await choose(1339)
    keywords.answer(1339)
    await flushPromises()
    expect(sync.articleReady.value).toBe(false)
    expect(sync.articleLoadError.value).not.toBeNull()
  })
})
