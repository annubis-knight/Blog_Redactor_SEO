import { describe, it, expect } from 'vitest'
import { runPipeline, type OrchestratorDeps } from '../../../../scripts/auto-article/orchestrator.js'
import { createContext } from '../../../../scripts/auto-article/context.js'
import type { AutoRunConfig, AutoRunContext, GateDecision, GateName } from '../../../../scripts/auto-article/types.js'

function makeCtx(): AutoRunContext {
  const config: AutoRunConfig = {
    mode: 'mock',
    baseUrl: 'http://localhost:3400/api',
    verbose: false,
    configPath: null,
    resumeArticleId: null,
    nonInteractive: false,
    forcedCocoon: null,
    forcedLevel: null,
  }
  return createContext(config, {
    topic: 'sujet test',
    cocoonName: 'cocon test',
    businessContext: '',
    articleType: 'Intermédiaire',
  })
}

/** Construit des deps traçant l'ordre d'appel, avec un gate scripté. */
function makeDeps(gateScript: Partial<Record<GateName, GateDecision[]>>) {
  const calls: string[] = []
  const queues: Record<GateName, GateDecision[]> = {
    gate1: [...(gateScript.gate1 ?? ['validate'])],
    gate2: [...(gateScript.gate2 ?? ['validate'])],
  }
  const deps: OrchestratorDeps = {
    runCerveau: async () => { calls.push('cerveau') },
    commitCerveau: async () => { calls.push('commit-cerveau') },
    runMoteur: async () => { calls.push('moteur') },
    runRedaction: async () => { calls.push('redaction') },
    gate: async (gate: GateName) => {
      calls.push(`gate:${gate}`)
      const next = queues[gate].shift()
      return next ?? 'validate'
    },
  }
  return { deps, calls }
}

describe('auto:orchestrator — runPipeline', () => {
  it('happy path : cerveau → gate1 → commit → moteur → gate2 → rédaction', async () => {
    const { deps, calls } = makeDeps({})
    const outcome = await runPipeline(makeCtx(), deps)
    expect(outcome.status).toBe('completed')
    expect(calls).toEqual([
      'cerveau', 'gate:gate1', 'commit-cerveau', 'moteur', 'gate:gate2', 'redaction',
    ])
  })

  it('abort au gate1 : AUCUNE écriture (commit non appelé)', async () => {
    const { deps, calls } = makeDeps({ gate1: ['abort'] })
    const outcome = await runPipeline(makeCtx(), deps)
    expect(outcome.status).toBe('aborted')
    expect(calls).toEqual(['cerveau', 'gate:gate1'])
    expect(calls).not.toContain('commit-cerveau')
  })

  it('le commit n\'a lieu qu\'après validation, pas à chaque relance', async () => {
    const { deps, calls } = makeDeps({ gate1: ['regenerate', 'validate'] })
    await runPipeline(makeCtx(), deps)
    expect(calls.filter((c) => c === 'commit-cerveau')).toHaveLength(1)
  })

  it('abort au gate2 : pas de rédaction', async () => {
    const { deps, calls } = makeDeps({ gate2: ['abort'] })
    const outcome = await runPipeline(makeCtx(), deps)
    expect(outcome.status).toBe('aborted')
    expect(calls).toContain('moteur')
    expect(calls).not.toContain('redaction')
  })

  it('regenerate au gate1 rejoue la phase Cerveau', async () => {
    const { deps, calls } = makeDeps({ gate1: ['regenerate', 'validate'] })
    await runPipeline(makeCtx(), deps)
    const cerveauCount = calls.filter((c) => c === 'cerveau').length
    expect(cerveauCount).toBe(2)
  })

  it('rerun au gate2 rejoue la phase Moteur', async () => {
    const { deps, calls } = makeDeps({ gate2: ['rerun', 'validate'] })
    await runPipeline(makeCtx(), deps)
    expect(calls.filter((c) => c === 'moteur').length).toBe(2)
  })

  it('lève au-delà du plafond de relances', async () => {
    const { deps } = makeDeps({ gate1: ['regenerate', 'regenerate', 'regenerate'] })
    await expect(runPipeline(makeCtx(), { ...deps, maxReruns: 2 })).rejects.toThrow(/relances/)
  })
})
