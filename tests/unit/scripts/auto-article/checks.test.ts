// @vitest-environment node
/**
 * FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE — le run automatique face à une porte.
 *
 * Le script ne déroge jamais à la place d'un humain : un check refusé en 422
 * `GATE_BLOCKED` arrête le run avec la liste lisible des points.
 */
import { describe, it, expect } from 'vitest'
import { describeGateRefusal, emitCheck, saveThenEmit } from '../../../../scripts/auto-article/checks.js'
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
