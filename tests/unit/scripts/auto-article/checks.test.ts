// @vitest-environment node
/**
 * FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE — le run automatique face à une porte.
 *
 * Le script ne déroge jamais à la place d'un humain : un check refusé en 422
 * `GATE_BLOCKED` arrête le run avec la liste lisible des points — sauf une
 * porte toute 🟠 que l'utilisateur, au terminal, dit avoir lue (voir plus bas).
 */
import { describe, it, expect } from 'vitest'
import { ACKNOWLEDGE_QUESTION, describeGateRefusal, emitCheck, isYes, saveThenEmit } from '../../../../scripts/auto-article/checks.js'
import { ApiError, type HttpClient } from '../../../../scripts/auto-article/http-client.js'

const refusal = {
  gateId: 'captain-lock',
  blocking: [
    { rule: 'captain-volume-zero', level: 'risque', message: 'Personne ne cherche « croissance digitale toulouse ».' },
    { rule: 'captain-autocomplete-empty', level: 'attention', message: 'Google ne suggère rien.' },
  ],
}

function clientRejecting(err: unknown): HttpClient {
  return { apiPost: () => Promise.reject(err) } as unknown as HttpClient
}

describe('auto:checks — emitCheck face à une porte', () => {
  it('un refus de porte arrête le run avec chaque point, niveau compris', async () => {
    const blocked = new ApiError('Étape non validée : 2 point(s) à traiter.', 'GATE_BLOCKED', 422, refusal)
    const error = await emitCheck(clientRejecting(blocked), 1013, 'moteur:capitaine_locked').then(
      () => { throw new Error('le refus de porte devait arrêter le run') },
      (e: unknown) => e as ApiError,
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('GATE_BLOCKED')
    expect(error.message).toContain('🔴 Personne ne cherche « croissance digitale toulouse ».')
    expect(error.message).toContain('🟠 Google ne suggère rien.')
    expect(error.message).toContain('Décidez dans le Moteur')
  })

  // C7 : l'étape « premier jet accepté » se décide dans la Rédaction, pas au Moteur.
  it('refus du premier jet : le message renvoie à la Rédaction', () => {
    const message = describeGateRefusal('redaction:draft_accepted', {
      gateId: 'draft',
      blocking: [{ rule: 'draft-length', level: 'risque', message: '15 601 mots pour 2 500 visés.' }],
    })
    expect(message).toContain('🔴 15 601 mots pour 2 500 visés.')
    expect(message).toContain('Décidez dans la Rédaction')
    expect(message).not.toContain('Moteur')
  })

  it('les autres erreurs passent telles quelles', async () => {
    const other = new ApiError('Article introuvable', 'NOT_FOUND', 404)
    await expect(emitCheck(clientRejecting(other), 1, 'moteur:radar_done')).rejects.toBe(other)
  })

  it('un détail absent reste lisible', () => {
    expect(describeGateRefusal('moteur:lieutenants_locked', undefined))
      .toContain('Étape « moteur:lieutenants_locked » refusée par la porte')
  })
})

describe('auto:checks — saveThenEmit : la porte lit la base, pas le script', () => {
  it('enregistre les décisions AVANT de demander l’étape', async () => {
    const calls: string[] = []
    const client = {
      apiPut: async (path: string) => { calls.push(`PUT ${path}`) },
      apiPost: async (path: string) => { calls.push(`POST ${path}`) },
    } as unknown as HttpClient
    await saveThenEmit(client, 42, { capitaine: 'isolation combles', lieutenants: [], lexique: [], hnStructure: [] }, 'moteur:capitaine_locked')
    expect(calls).toEqual(['PUT /articles/42/keywords', 'POST /articles/42/progress/check'])
  })

  it('un enregistrement raté ne demande pas l’étape', async () => {
    const calls: string[] = []
    const client = {
      apiPut: async () => { throw new ApiError('Base indisponible', 'INTERNAL_ERROR', 500) },
      apiPost: async (path: string) => { calls.push(`POST ${path}`) },
    } as unknown as HttpClient
    await expect(saveThenEmit(client, 42, { capitaine: 'x', lieutenants: [], lexique: [], hnStructure: [] }, 'moteur:capitaine_locked'))
      .rejects.toThrow('Base indisponible')
    expect(calls).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// FR-INFRA-VERIFIER-SHARED — recette du 2026-09-30 (parcours PU-06) : en MOCK,
// la porte du capitaine lève toujours un seul 🟠 (intention « navigation ») et
// le robot s'arrêtait à chaque run. Décision : une porte toute 🟠 se lit au
// terminal (« J'ai lu, continuer ? [o/N] ») ; sur « o », le robot envoie la
// même reconnaissance que la case « J'ai lu » de l'écran, puis redemande
// l'étape. Un 🔴 ou un ⛔ garde l'arrêt ; sans humain, tout refus arrête.
// ---------------------------------------------------------------------------

const ATTENTION = {
  gateId: 'captain-lock', passed: false, inputHash: 'h1', waived: [],
  blocking: [{ rule: 'captain-intent-mismatch', level: 'attention', message: 'Google traite cette requête comme de navigation.' }],
  issues: [],
}

/** Faux serveur : la 1re demande d'étape est refusée par `first`, les suivantes par `then` (ou acceptées). */
function gateServer(first: unknown, opts: { then?: unknown; afterWaiver?: { passed: boolean; blocking?: unknown[] } } = {}) {
  const calls: Array<{ path: string; body: unknown }> = []
  let checks = 0
  const client = {
    apiPost: async (path: string, body: unknown) => {
      calls.push({ path, body })
      if (path.endsWith('/progress/check')) {
        checks++
        const refusal = checks === 1 ? first : opts.then
        if (refusal) throw new ApiError('Étape non validée', 'GATE_BLOCKED', 422, refusal)
        return { completedChecks: ['moteur:capitaine_locked'] }
      }
      if (path.endsWith('/waivers')) return { evaluation: { ...ATTENTION, blocking: [], passed: true, ...opts.afterWaiver }, refused: [] }
      throw new Error(`POST inattendu : ${path}`)
    },
  } as unknown as HttpClient
  return { client, calls }
}

function reader(answer: boolean) {
  const shown: string[] = []
  const asked: string[] = []
  return {
    shown, asked,
    show: (text: string) => { shown.push(text) },
    confirm: async (question: string) => { asked.push(question); return answer },
  }
}

describe('auto:checks — une porte toute 🟠 se lit au terminal (FR-INFRA-VERIFIER-SHARED)', () => {
  it('« o » : les points sont montrés, la reconnaissance part comme à l’écran, l’étape est redemandée', async () => {
    const { client, calls } = gateServer(ATTENTION)
    const human = reader(true)
    await emitCheck(client, 1353, 'moteur:capitaine_locked', human)
    expect(human.shown.join('\n')).toContain('🟠 Google traite cette requête comme de navigation.')
    expect(human.asked).toEqual([ACKNOWLEDGE_QUESTION])
    expect(calls.map(c => c.path)).toEqual([
      '/articles/1353/progress/check',
      '/articles/1353/gates/captain-lock/waivers',
      '/articles/1353/progress/check',
    ])
    // Exactement ce que l'écran envoie pour une case « J'ai lu » : la règle, rien d'autre.
    expect(calls[1]!.body).toEqual({ waivers: [{ rule: 'captain-intent-mismatch' }] })
  })

  it('« N » (ou Entrée) : arrêt, comme avant, sans rien enregistrer', async () => {
    const { client, calls } = gateServer(ATTENTION)
    const error = await emitCheck(client, 1353, 'moteur:capitaine_locked', reader(false)).then(() => null, (e: unknown) => e as ApiError)
    expect(error?.code).toBe('GATE_BLOCKED')
    expect(error?.message).toContain('Décidez dans le Moteur')
    expect(calls.map(c => c.path)).toEqual(['/articles/1353/progress/check'])
  })

  it.each([
    ['🔴 risque', 'risque'],
    ['⛔ technique', 'technique'],
  ])('un point %s : aucune question, arrêt', async (_label, level) => {
    const mixed = { ...ATTENTION, blocking: [...ATTENTION.blocking, { rule: 'captain-volume-zero', level, message: 'Personne ne cherche ce mot-clé.' }] }
    const { client, calls } = gateServer(mixed)
    const human = reader(true)
    await expect(emitCheck(client, 1353, 'moteur:capitaine_locked', human)).rejects.toMatchObject({ code: 'GATE_BLOCKED' })
    expect(human.asked).toEqual([])
    expect(calls.map(c => c.path)).toEqual(['/articles/1353/progress/check'])
  })

  it('sans humain (--config, --resume) : arrêt, même sur une porte toute 🟠', async () => {
    const { client, calls } = gateServer(ATTENTION)
    await expect(emitCheck(client, 1353, 'moteur:capitaine_locked')).rejects.toMatchObject({ code: 'GATE_BLOCKED' })
    expect(calls).toHaveLength(1)
  })

  it('la porte refuse encore après la reconnaissance : arrêt avec ses nouveaux points', async () => {
    const still = { passed: false, blocking: [{ rule: 'captain-volume-zero', level: 'risque', message: 'Les données ont changé.' }] }
    const { client, calls } = gateServer(ATTENTION, { afterWaiver: still })
    const error = await emitCheck(client, 1353, 'moteur:capitaine_locked', reader(true)).then(() => null, (e: unknown) => e as ApiError)
    expect(error?.message).toContain('🔴 Les données ont changé.')
    expect(calls.filter(c => c.path.endsWith('/progress/check'))).toHaveLength(1)
  })

  it('saveThenEmit transmet l’humain à la porte', async () => {
    const { client } = gateServer(ATTENTION)
    ;(client as unknown as { apiPut: () => Promise<void> }).apiPut = async () => {}
    await expect(saveThenEmit(client, 1353, { capitaine: 'plombier toulouse', lieutenants: [], lexique: [], hnStructure: [] }, 'moteur:capitaine_locked', reader(true)))
      .resolves.toBeUndefined()
  })

  it('isYes : « o », « oui » ; tout le reste vaut non', () => {
    expect(['o', 'O', 'oui', ' Oui ', 'y'].every(isYes)).toBe(true)
    expect(['', 'n', 'non', 'ok', 'oo'].some(isYes)).toBe(false)
  })
})
