/**
 * Enrobage interactif des gates : affiche le récap de la phase puis lit la
 * décision via `parseGateInput` (pure). `renderGateRecap` est pure et testée.
 *
 * Cas particulier du Gate 1 : la décision « éditer » ne relance PAS la phase
 * (ce qui recoûterait deux appels IA). Elle ouvre un sélecteur local qui
 * corrige l'emplacement dans le contexte, puis on ré-affiche le récap.
 */

import { gatePromptLabel, parseGateInput } from './gate.js'
import type { Io } from './io.js'
import type { CliLogger } from './logger.js'
import type {
  AutoRunContext,
  CanonicalArticleType,
  GateDecision,
  GateName,
  PlacementDecision,
} from './types.js'
import { LEVEL_LABEL } from './tree.js'
import { requiresConfirmation } from './heuristics/detect-cannibalization.js'

const LEVEL_BY_INDEX: Record<string, CanonicalArticleType> = {
  '1': 'pilier',
  '2': 'intermediaire',
  '3': 'specifique',
}

function renderPlacement(p: PlacementDecision | null): string[] {
  if (!p) return ['  (aucun emplacement proposé)']
  const lines = [
    `  Silo   : ${p.siloName}`,
    `  Cocon  : ${p.cocoonName}${p.createCocoon ? '   ⚠ à créer' : ''}`,
    `  Niveau : ${LEVEL_LABEL[p.level]}`,
    `  Raison : ${p.rationale}`,
  ]
  if (p.outOfScope) {
    lines.unshift('  ⚠ HORS PÉRIMÈTRE — l\'IA juge ce sujet étranger à ton activité.')
  }
  return lines
}

export function renderGateRecap(gate: GateName, ctx: AutoRunContext): string {
  if (gate === 'gate1') {
    const s = ctx.strategy
    const lines = ['── Gate 1 — Emplacement & brief ──', '']

    // Le mock renvoie un brief figé, sans rapport avec le sujet saisi : le dire
    // franchement, sinon l'utilisateur croit que le script l'a mal compris.
    if (ctx.config.mode === 'mock') {
      lines.push(
        '⚠  MODE MOCK — le brief ci-dessous est simulé et ne correspond PAS',
        '   à ton sujet. Utilise --mode=real pour un vrai brief.',
        '',
      )
    }

    if (ctx.treeRender) {
      lines.push('Arbre SEO actuel', ctx.treeRender, '')
    }

    lines.push('Emplacement proposé', ...renderPlacement(ctx.placement), '')

    // Alternatives évaluées : rendre la décision auditable sans appuyer sur [e].
    if (ctx.placementOptions.length > 0) {
      lines.push('Alternatives évaluées')
      const chosen = ctx.placement?.cocoonName.trim().toLowerCase()
      const width = Math.max(...ctx.placementOptions.map((o) => o.cocoonName.length))
      for (const o of ctx.placementOptions) {
        const isChosen = o.cocoonName.trim().toLowerCase() === chosen
        const bullet = isChosen ? '▸' : ' '
        const score = `${Math.round(o.score * 100)} %`.padStart(5)
        lines.push(
          `  ${bullet} ${o.cocoonName.padEnd(width)}  ${score}   ${o.summary} → ${LEVEL_LABEL[o.level]}`,
        )
      }
      lines.push('')
    }
    lines.push(
      'Article',
      `  Titre    : ${ctx.articleTitle || '—'}`,
      `  Mot-clé  : ${ctx.pilierKeyword || '—'}`,
      `  Douleur  : ${ctx.painPoint || '—'}`,
      `  Cible    : ${s.cible ?? '—'}`,
      `  Angle    : ${s.angle ?? '—'}`,
      `  Promesse : ${s.promesse ?? '—'}`,
      `  CTA      : ${s.cta ?? '—'}`,
    )
    return lines.join('\n')
  }

  const lines = ['── Gate 2 — Mots-clés Moteur ──', `  Capitaine   : ${ctx.capitaine ?? '—'}`]
  if (ctx.cannibalization.length > 0) {
    lines.push('  ⚠ Proximité détectée :')
    for (const c of ctx.cannibalization) {
      lines.push(`      « ${c.keyword} » — article #${c.articleId} (${c.similarityPercent} %)`)
    }
  }
  lines.push(
    `  Lieutenants : ${ctx.lieutenants.length ? ctx.lieutenants.join(', ') : '—'}`,
    `  Lexique     : ${ctx.lexique.length ? ctx.lexique.join(', ') : '—'}`,
  )
  return lines.join('\n')
}

/** Sélecteur local d'emplacement — ne consomme aucun appel IA. */
async function editPlacement(io: Io, logger: CliLogger, ctx: AutoRunContext): Promise<void> {
  const options = ctx.placementOptions
  if (options.length === 0) {
    logger.warn('Aucune alternative présélectionnée.')
    return
  }

  logger.info('\nEmplacements candidats :')
  options.forEach((o, i) => {
    logger.info(
      `  ${i + 1}. ${o.siloName} → ${o.cocoonName}  [${LEVEL_LABEL[o.level]}]  ${Math.round(o.score * 100)} % · ${o.summary}`,
    )
  })

  const raw = (await io.question('Numéro du cocon ([Entrée] garder l\'actuel) › ')).trim()
  if (raw === '') return

  const index = Number(raw) - 1
  const chosen = options[index]
  if (!chosen) {
    logger.warn('Numéro invalide — emplacement inchangé.')
    return
  }

  const levelRaw = await io.question(
    `Niveau — [1] Pilier · [2] Intermédiaire · [3] Spécialisé (défaut ${LEVEL_LABEL[chosen.level]}) › `,
  )
  const level = LEVEL_BY_INDEX[levelRaw.trim()] ?? chosen.level

  ctx.placement = {
    siloName: chosen.siloName,
    cocoonName: chosen.cocoonName,
    level,
    rationale: 'emplacement choisi manuellement',
    createCocoon: false,
  }
  ctx.cocoonName = chosen.cocoonName
  logger.success(`Emplacement corrigé : « ${chosen.cocoonName} » (${LEVEL_LABEL[level]}).`)
}

export function makeInteractiveGate(io: Io, logger: CliLogger) {
  return async (gate: GateName, ctx: AutoRunContext): Promise<GateDecision> => {
    for (;;) {
      logger.info('\n' + renderGateRecap(gate, ctx))
      const raw = await io.question(`${gatePromptLabel(gate)} › `)
      const decision = parseGateInput(raw, gate)

      if (!decision) {
        logger.warn('Choix non reconnu, réessaie.')
        continue
      }
      // Gate 1 : corriger l'emplacement localement plutôt que rejouer la phase.
      if (decision === 'edit' && gate === 'gate1') {
        await editPlacement(io, logger, ctx)
        continue
      }
      // Gate 2 : cannibalisation forte → confirmation explicite exigée.
      if (gate === 'gate2' && decision === 'validate' && requiresConfirmation(ctx.cannibalization)) {
        const confirm = await io.question('⚠ Cannibalisation forte — taper « oui » pour confirmer › ')
        if (confirm.trim().toLowerCase() !== 'oui') {
          logger.warn('Non confirmé — retour au récap.')
          continue
        }
      }
      return decision
    }
  }
}
