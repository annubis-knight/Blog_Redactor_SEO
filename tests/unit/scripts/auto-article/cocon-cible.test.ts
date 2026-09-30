// @vitest-environment node
/**
 * FR-CER-CREATION-HONNETE — le mode automatique crée l'article dans le cocon
 * que l'utilisateur a nommé.
 *
 * Recette du 2026-09-30 (parcours PU-06) : à la question « Cocon cible », la
 * réponse « Recette B 2026-09-30 » n'était qu'un indice pour l'IA ; le robot a
 * créé un pilier dans un autre cocon (« Visibilité web locale à Toulouse »).
 * Décision : une réponse qui nomme un cocon existant (sans compter la casse ni
 * les espaces) impose l'emplacement, comme `--cocoon` ; un nom inconnu est dit,
 * et la question revient.
 */
import { describe, it, expect, vi } from 'vitest'
import { resolveCocoonAnswer, sameCocoonName } from '../../../../scripts/auto-article/cocoon.js'
import { COCOON_QUESTION, promptInitialInput } from '../../../../scripts/auto-article/prompts.js'
import { imposedCocoon, makeCerveauPhase } from '../../../../scripts/auto-article/phases/cerveau.js'
import { createContext } from '../../../../scripts/auto-article/context.js'
import { RunReport } from '../../../../scripts/auto-article/report.js'
import type { PhaseDeps } from '../../../../scripts/auto-article/deps.js'
import type { Io } from '../../../../scripts/auto-article/io.js'
import type { AutoRunConfig, InitialInput } from '../../../../scripts/auto-article/types.js'

const NAMES = ['Visibilité web locale à Toulouse', 'Recette B 2026-09-30', 'Création de site']

describe('auto:cocoon — la réponse « Cocon cible » (FR-CER-CREATION-HONNETE)', () => {
  it('un cocon existant, sans compter la casse ni les espaces, sous son nom exact', () => {
    expect(resolveCocoonAnswer(NAMES, '  recette b  2026-09-30 ')).toEqual({ kind: 'found', name: 'Recette B 2026-09-30' })
    expect(resolveCocoonAnswer(NAMES, 'CRÉATION DE SITE')).toEqual({ kind: 'found', name: 'Création de site' })
  })

  it('Entrée : le script propose', () => {
    expect(resolveCocoonAnswer(NAMES, '   ')).toEqual({ kind: 'none' })
  })

  it('un nom inconnu est inconnu (les accents comptent)', () => {
    expect(resolveCocoonAnswer(NAMES, 'Recette C')).toEqual({ kind: 'unknown' })
    expect(resolveCocoonAnswer(NAMES, 'Creation de site')).toEqual({ kind: 'unknown' })
  })

  it('deux cocons qui ne diffèrent que par la casse : le nom exact l’emporte, sinon ambigu', () => {
    const twins = ['Recette vide', 'recette vide']
    expect(resolveCocoonAnswer(twins, 'recette vide')).toEqual({ kind: 'found', name: 'recette vide' })
    expect(resolveCocoonAnswer(twins, 'RECETTE VIDE')).toEqual({ kind: 'ambiguous', names: twins })
  })

  it('sameCocoonName ignore la casse et les espaces, pas les lettres', () => {
    expect(sameCocoonName('Recette  B', 'recette b')).toBe(true)
    expect(sameCocoonName('Recette B', 'Recette C')).toBe(false)
  })
})

/** Faux terminal : rejoue des réponses, garde les questions posées. */
function fakeIo(answers: string[]): Io & { asked: string[] } {
  const asked: string[] = []
  return {
    asked,
    question: async (prompt: string) => { asked.push(prompt); return answers.shift() ?? '' },
    close: () => {},
  }
}

describe('auto:prompts — la question « Cocon cible » (PU-06, FR-CER-CREATION-HONNETE)', () => {
  it('un nom inconnu est dit, et la question revient', async () => {
    const io = fakeIo(['Aider les artisans', 'Recette Z', 'recette b 2026-09-30', ''])
    const warn = vi.fn()
    const input = await promptInitialInput(io, { cocoonNames: NAMES, warn })
    expect(input.cocoonName).toBe('Recette B 2026-09-30')
    expect(io.asked.filter(q => q === COCOON_QUESTION)).toHaveLength(2)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('Aucun cocon ne s\'appelle « Recette Z »')
    expect(warn.mock.calls[0]![0]).toContain('Recette B 2026-09-30')
  })

  it('Entrée : aucun cocon imposé', async () => {
    const input = await promptInitialInput(fakeIo(['Sujet', '', '']), { cocoonNames: NAMES, warn: vi.fn() })
    expect(input.cocoonName).toBe('')
  })

  it('avec --cocoon, la question n’est pas posée', async () => {
    const io = fakeIo(['Sujet', ''])
    const input = await promptInitialInput(io, { cocoonNames: NAMES, forcedCocoon: 'Création de site', warn: vi.fn() })
    expect(io.asked).not.toContain(COCOON_QUESTION)
    expect(input.cocoonName).toBe('Création de site')
  })
})

// ---------------------------------------------------------------------------
// Phase Cerveau rejouée sans serveur : le cocon répondu impose l'emplacement.
// ---------------------------------------------------------------------------

const CONFIG: AutoRunConfig = {
  mode: 'mock', baseUrl: 'http://localhost:3400/api', verbose: false, configPath: null,
  resumeArticleId: null, nonInteractive: false, forcedCocoon: null, forcedLevel: null, forcedCapitaine: null,
}

const SILOS = [{
  nom: 'Stratégie & Visibilité',
  cocons: [
    { name: 'Visibilité web locale à Toulouse', articles: [{ id: 1, title: 'SEO local', type: 'Pilier' }] },
    { name: 'Recette B 2026-09-30', articles: [] },
  ],
}]

const INTAKE = {
  articleTitle: 'Référencement local : rendre votre TPE visible sur Google', pilierKeyword: 'référencement local',
  painPoint: 'Personne ne me trouve', cible: 'Artisans', douleur: 'Invisibles', angle: 'Concret', promesse: 'Être trouvé', cta: 'Appeler',
}

function replay(input: Partial<InitialInput>, config: Partial<AutoRunConfig> = {}) {
  const posts: string[] = []
  const client = {
    apiGet: vi.fn(async (path: string) => {
      if (path === '/silos') return SILOS
      throw new Error(`GET inattendu : ${path}`)
    }),
    apiPost: vi.fn(async (path: string) => {
      posts.push(path)
      if (path === '/generate/auto-intake') return { intake: INTAKE, usage: null }
      if (path === '/generate/placement-suggest') {
        return { placement: { siloName: 'Stratégie & Visibilité', cocoonName: 'Visibilité web locale à Toulouse', level: 'intermediaire', rationale: 'IA', createCocoon: false }, usage: null }
      }
      throw new Error(`POST inattendu : ${path}`)
    }),
  }
  const logger = { step: vi.fn(), info: vi.fn(), dim: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), phase: vi.fn() }
  const deps = { client, logger, report: new RunReport() } as unknown as PhaseDeps
  const ctx = createContext({ ...CONFIG, ...config }, { topic: 'Aider les artisans', cocoonName: '', businessContext: '', articleType: 'Intermédiaire', ...input })
  return { run: () => makeCerveauPhase(deps)(ctx), ctx, posts }
}

describe('auto:cerveau — le cocon nommé impose l’emplacement (PU-06, FR-CER-CREATION-HONNETE)', () => {
  it('réponse « Recette B 2026-09-30 » : l’article va dans ce cocon, sans proposition de l’IA', async () => {
    const { run, ctx, posts } = replay({ cocoonName: 'Recette B 2026-09-30' })
    await run()
    expect(ctx.placement?.cocoonName).toBe('Recette B 2026-09-30')
    expect(ctx.placement?.level).toBe('pilier') // cocon vide : son pilier d'abord
    expect(ctx.placement?.rationale).toBe('cocon choisi à la question « Cocon cible »')
    expect(posts).not.toContain('/generate/placement-suggest')
  })

  it('sans réponse, l’emplacement reste proposé par l’IA', async () => {
    const { run, ctx, posts } = replay({ cocoonName: '' })
    await run()
    expect(posts).toContain('/generate/placement-suggest')
    expect(ctx.placement?.cocoonName).toBe('Visibilité web locale à Toulouse')
  })

  it('--cocoon l’emporte sur la réponse', () => {
    const ctx = createContext({ ...CONFIG, forcedCocoon: 'Création de site' }, { topic: 't', cocoonName: 'Recette B 2026-09-30', businessContext: '', articleType: 'Intermédiaire' })
    expect(imposedCocoon(ctx)).toEqual({ name: 'Création de site', byFlag: true })
  })

  it('un nom qui n’existe plus arrête le run en listant les cocons, sans rien créer', async () => {
    const { run, posts } = replay({ cocoonName: 'Cocon disparu' })
    await expect(run()).rejects.toThrow('Cocon imposé « Cocon disparu » introuvable. Disponibles : Visibilité web locale à Toulouse, Recette B 2026-09-30')
    expect(posts).not.toContain('/generate/placement-suggest')
  })
})
