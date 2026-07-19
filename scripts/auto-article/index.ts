/**
 * Entrypoint du CLI de génération automatique d'article SEO.
 *
 *   npm run auto:article -- [--mode=mock|real] [--port=3400] [--verbose]
 *                           [--resume=<articleId>] [--config=run.json]
 *
 * Prérequis : le serveur dev doit tourner (`npm run dev`). Le CLI est un simple
 * client de l'API HTTP — voir epic-auto-article-pipeline.md §3.
 *
 * Story 1 : socle (préflight + toggle mode + orchestrateur + 2 gates + rapport).
 * Les phases sont des stubs jusqu'aux Stories 2-5.
 */

import { parseArgs } from './flags.js'
import { createLogger, type CliLogger } from './logger.js'
import { createHttpClient, ApiError, type HttpClient } from './http-client.js'
import { createStdIo, type Io } from './io.js'
import { promptInitialInput } from './prompts.js'
import { loadConfigInput } from './config-file.js'
import { createContext } from './context.js'
import { hydrateResume } from './resume.js'
import { makeInteractiveGate } from './gate-interactive.js'
import { runPipeline, type OrchestratorDeps } from './orchestrator.js'
import { RunReport } from './report.js'
import { makeCerveauPhase, makeCerveauCommit } from './phases/cerveau.js'
import { requiresConfirmation } from './heuristics/detect-cannibalization.js'
import { buildTree, renderTree } from './tree.js'
import { COLOR_TREE_THEME } from './tree-theme.js'
import { makeMoteurPhase } from './phases/moteur.js'
import { makeRedactionPhase } from './phases/redaction.js'
import { runInternalLinking } from './phases/linking.js'
import type { AutoRunConfig, InitialInput, PhaseName, RuntimeMode } from './types.js'

const HELP = `
auto:article — génération automatique d'un article SEO (Cerveau → Moteur → Rédaction)

Usage :
  npm run auto:article -- [options]

Options :
  --mode=mock|real   Sources externes mock (défaut) ou réelles (coûts API).
  --port=<n>         Port du serveur dev (défaut : $PORT ou 3400).
  --cocoon=<nom>     Impose le cocon cible (pas de proposition d'emplacement).
  --level=<niveau>   Impose pilier | intermediaire | specifique.
  --resume=<id>      Reprend un article existant par son id.
  --relink=<id>      Relance le maillage interne seul sur un article existant.
  --config=<file>    (à venir) rejoue un run sans prompts.
  --verbose, -v      Logs détaillés.
  --help, -h         Cette aide.

Prérequis : lance d'abord le serveur avec « npm run dev ».
`

/**
 * Dépense DataForSEO courante (fenêtre glissante du cost-guard).
 * `null` si l'endpoint est absent (serveur plus ancien) — le rapport se
 * contentera alors du coût IA.
 */
async function readSeoSpend(client: HttpClient): Promise<number | null> {
  try {
    const status = await client.apiGet<{ spentUsd: number }>('/cost-status')
    return typeof status.spentUsd === 'number' ? status.spentUsd : null
  } catch {
    return null
  }
}

/**
 * Affiche l'arbre SEO courant avant toute saisie : on choisit un sujet en
 * voyant où il pourra atterrir, pas à l'aveugle.
 */
async function showTree(client: HttpClient, logger: CliLogger): Promise<void> {
  try {
    const silos = await client.apiGet<Parameters<typeof buildTree>[0]>('/silos')
    const tree = buildTree(silos)
    logger.info('\n' + renderTree(tree, { theme: COLOR_TREE_THEME }))
  } catch (err) {
    logger.warn(`Arbre SEO indisponible — ${(err as Error).message}`)
  }
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2))
  if (flags.help) {
    console.log(HELP)
    return
  }

  const logger = createLogger(flags.verbose ?? false)
  const port = flags.port ?? (Number(process.env.PORT) || 3400)
  const mode: RuntimeMode = flags.mode ?? 'mock'
  const baseUrl = `http://localhost:${port}/api`

  const config: AutoRunConfig = {
    mode,
    baseUrl,
    verbose: flags.verbose ?? false,
    configPath: flags.configPath ?? null,
    resumeArticleId: flags.resumeArticleId ?? null,
    nonInteractive: false,
    forcedCocoon: flags.cocoon ?? null,
    forcedLevel: flags.level ?? null,
  }

  const client = createHttpClient(baseUrl)

  // --- Préflight : le serveur répond-il ? ---
  try {
    await client.apiGet('/runtime-mode')
  } catch {
    logger.error(`Serveur injoignable sur ${baseUrl}.`)
    logger.info('  → Lance « npm run dev » dans un autre terminal, puis relance.')
    process.exitCode = 1
    return
  }

  // --- Applique le mode demandé (override runtime, sans redémarrer le serveur) ---
  const rt = await client.apiPost<{ effective: RuntimeMode }>('/runtime-mode', { mode })
  if (mode === 'real') {
    logger.success(`Mode : réel (effectif serveur : ${rt.effective})`)
    logger.warn('Les appels DataForSEO / Claude sont facturés (~$0.35 par run).')
  } else {
    // Défaut volontaire (pas de dépense involontaire), mais il faut que ce soit
    // impossible à rater : le brief sera simulé et sans rapport avec le sujet.
    logger.warn('MODE MOCK (défaut) — brief et données SEO SIMULÉS, sans rapport avec ton sujet.')
    logger.warn('Pour un vrai résultat : npm run auto:article -- --mode=real')
    logger.dim(`  (effectif serveur : ${rt.effective})`)
  }

  // --- Mode rétroactif : maillage interne seul sur un article existant ---
  if (flags.relink != null) {
    const relinkReport = new RunReport()
    logger.phase(`Maillage interne — article #${flags.relink}`)
    await runInternalLinking({ client, logger, report: relinkReport }, flags.relink)
    logger.info('\n' + relinkReport.render())
    return
  }

  // --- Saisie initiale : config non-interactive OU prompts ---
  const report = new RunReport()
  // En mock, les appels partent vers le sandbox DataForSEO (gratuit) mais le
  // cost-guard les comptabilise quand même : on n'agrège le coût SEO qu'en réel,
  // sinon le récap afficherait une dépense fantôme.
  const trackSeoCost = mode === 'real'
  if (trackSeoCost) {
    const seoBaseline = await readSeoSpend(client)
    if (seoBaseline != null) report.setSeoBaseline(seoBaseline)
  }

  let io: Io | null = null
  let input: InitialInput
  let gate: OrchestratorDeps['gate']

  if (config.resumeArticleId != null) {
    input = { topic: '(reprise)', cocoonName: '', businessContext: '', articleType: 'Intermédiaire' }
    config.nonInteractive = true
    gate = async (g, gateCtx) => {
      // Pas d'humain pour confirmer : on avertit fortement mais on ne bloque pas
      // (choix produit : la détection ne doit jamais être bloquante).
      if (g === 'gate2' && requiresConfirmation(gateCtx.cannibalization)) {
        logger.warn('Cannibalisation FORTE — run non-interactif : poursuite sans confirmation.')
      }
      return 'validate'
    }
  } else if (config.configPath) {
    input = await loadConfigInput(config.configPath)
    config.nonInteractive = true
    gate = async (g, gateCtx) => {
      // Pas d'humain pour confirmer : on avertit fortement mais on ne bloque pas
      // (choix produit : la détection ne doit jamais être bloquante).
      if (g === 'gate2' && requiresConfirmation(gateCtx.cannibalization)) {
        logger.warn('Cannibalisation FORTE — run non-interactif : poursuite sans confirmation.')
      }
      return 'validate'
    }
    logger.success(`Config chargée : ${config.configPath} (run non-interactif, gates auto-validés)`)
  } else {
    io = createStdIo()
    await showTree(client, logger)
    logger.phase('Génération automatique — saisie')
    input = await promptInitialInput(io)
    gate = makeInteractiveGate(io, logger)
  }

  try {
    const ctx = createContext(config, input)

    if (config.resumeArticleId != null) {
      logger.phase(`Reprise de l'article #${config.resumeArticleId}`)
      await hydrateResume(client, ctx)
      logger.success(
        `État chargé : « ${ctx.articleTitle} » — skip Cerveau=${ctx.resume.skipCerveau} · Moteur=${ctx.resume.skipMoteur} · Rédaction=${ctx.resume.skipRedaction}`,
      )
    } else if (!input.topic) {
      logger.error('Sujet vide — abandon.')
      process.exitCode = 1
      return
    }
    const deps = { client, logger, report }

    const outcome = await runPipeline(ctx, {
      runCerveau: makeCerveauPhase(deps),
      commitCerveau: makeCerveauCommit(deps),
      runMoteur: makeMoteurPhase(deps),
      runRedaction: makeRedactionPhase(deps),
      gate,
      onPhaseStart: (phase: PhaseName) => logger.dim(`→ phase ${phase}`),
    })

    if (trackSeoCost) {
      const seoFinal = await readSeoSpend(client)
      if (seoFinal != null) report.setSeoFinal(seoFinal)
    }
    logger.info('\n' + report.render())
    if (outcome.status === 'aborted') {
      logger.warn('Run interrompu au gate.')
    } else {
      logger.success('Run terminé.')
      if (outcome.ctx.exportPath) logger.info(`  Export : ${outcome.ctx.exportPath}`)
    }
  } finally {
    io?.close()
  }
}

main().catch((err) => {
  const msg = err instanceof ApiError ? `${err.code} — ${err.message}` : (err as Error).message
  console.error(`\n✗ Échec du run : ${msg}`)
  process.exitCode = 1
})
