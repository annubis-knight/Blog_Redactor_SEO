/**
 * Phase 1 — Cerveau, en deux temps :
 *
 * A. `makeCerveauPhase` — **proposition, aucune écriture** :
 *      1. POST /generate/auto-intake        → brief structuré
 *      2. GET  /silos                       → arbre SEO
 *      3. présélection heuristique de 2-3 emplacements
 *      4. POST /generate/placement-suggest  → l'IA tranche et justifie
 *      5. remplit le contexte pour le Gate 1 (arbre + emplacement + brief)
 *
 * B. `makeCerveauCommit` — **écritures, après validation du Gate 1** :
 *      6. création du cocon si nécessaire
 *      7. création de l'article au niveau validé (ou réutilisation par slug)
 *      8. PUT /strategy/:id
 *
 * Rien n'est créé tant que l'utilisateur n'a pas accepté l'emplacement.
 */

import type { PhaseFn } from '../orchestrator.js'
import type { PhaseDeps } from '../deps.js'
import type { ApiUsageLike, AutoIntake, AutoRunContext, PlacementDecision } from '../types.js'
import { fromCanonicalType } from '../canonical.js'
import { findCocoonByName, type CocoonSummary } from '../cocoon.js'
import { slugify } from '../slug.js'
import { buildTree, renderTree } from '../tree.js'
import { COLOR_TREE_THEME } from '../tree-theme.js'
import { preselectPlacements, suggestLevel } from '../heuristics/pick-placement.js'
import { buildStrategyPayload, buildStrategyRecap } from './cerveau-map.js'

/**
 * Texte servant à mesurer l'affinité avec les cocons de l'arbre :
 * **le sujet de l'article, et lui seul**.
 *
 * Deux pollutions ont été retirées successivement (banc d'essai 2026-07-19) :
 *
 *  1. Le **brief IA** (titre, mot-clé, douleur) : la reformulation pilotait le
 *     placement à la place de l'intention — et en mock, un brief figé envoyait
 *     un article sur la croissance dans « Visibilité web locale ».
 *  2. Le **contexte business** : étant constant d'un article à l'autre, tout
 *     cocon dont le nom y figure décrochait un score maximal **permanent**.
 *     Mesuré : « Stratégie de croissance » sortait à 85 % sur les 7 sujets du
 *     banc, y compris une recette de cassoulet. Le contexte business reste
 *     transmis à l'IA (utile au jugement) mais ne pèse plus sur le score.
 *
 * La présélection vise le **rappel** (ne pas manquer le bon cocon) ; c'est l'IA
 * qui tranche ensuite avec précision.
 */
function placementTopic(ctx: AutoRunContext): string {
  return ctx.input.topic
}

export function makeCerveauPhase(deps: PhaseDeps): PhaseFn {
  const { client, logger, report } = deps

  return async (ctx) => {
    logger.phase('Phase 1 — Cerveau')
    if (ctx.resume.skipCerveau) {
      logger.dim('reprise : stratégie déjà présente — Cerveau ignoré')
      report.addStep('Cerveau (repris)')
      return
    }

    // 1. Brief éditorial depuis le sujet vague
    logger.step('Génération du brief éditorial (intake IA)…')
    const { intake, usage } = await client.apiPost<{ intake: AutoIntake; usage: ApiUsageLike | null }>(
      '/generate/auto-intake',
      {
        topic: ctx.input.topic,
        businessContext: ctx.input.businessContext,
        cocoonName: ctx.input.cocoonName,
      },
    )
    report.addUsage(usage)
    report.addStep('Cerveau · intake IA')
    ctx.intake = intake
    logger.dim(`intake: "${intake.articleTitle}" · pilier="${intake.pilierKeyword}"`)

    // 2. Arbre SEO
    logger.step('Lecture de l\'arbre SEO (silos → cocons → articles)…')
    const silos = await client.apiGet<Parameters<typeof buildTree>[0]>('/silos')
    const tree = buildTree(silos)
    if (tree.length === 0) throw new Error('Arbre SEO vide : aucun silo en base')

    // 3-4. Emplacement : imposé (--cocoon/--level) ou proposé puis arbitré par l'IA.
    let placement: PlacementDecision
    let candidates = preselectPlacements(tree, placementTopic(ctx), 3)

    if (ctx.config.forcedCocoon) {
      const target = tree
        .flatMap((s) => s.cocoons.map((c) => ({ silo: s.name, cocoon: c })))
        .find((e) => e.cocoon.name.trim().toLowerCase() === ctx.config.forcedCocoon!.trim().toLowerCase())
      if (!target) {
        const available = tree.flatMap((s) => s.cocoons.map((c) => c.name)).join(', ')
        throw new Error(`Cocon imposé « ${ctx.config.forcedCocoon} » introuvable. Disponibles : ${available}`)
      }
      const level = ctx.config.forcedLevel ?? suggestLevel(target.cocoon)
      placement = {
        siloName: target.silo,
        cocoonName: target.cocoon.name,
        level,
        rationale: 'emplacement imposé en ligne de commande',
        createCocoon: false,
      }
      // Le cocon imposé doit figurer parmi les options affichées au Gate.
      candidates = candidates.filter((c) => c.cocoonName !== target.cocoon.name)
      report.addStep('Cerveau · emplacement (imposé)')
      logger.dim(`emplacement imposé : « ${placement.cocoonName} » (${level})`)
    } else {
      if (candidates.length === 0) throw new Error('Arbre SEO sans cocon : impossible de placer l\'article')
      logger.dim(`candidats : ${candidates.map((c) => `${c.cocoonName} (${(c.affinity * 100).toFixed(0)}%)`).join(' · ')}`)

      logger.step('Proposition d\'emplacement dans l\'arbre…')
      const suggested = await client.apiPost<{
        placement: PlacementDecision
        usage: ApiUsageLike | null
      }>('/generate/placement-suggest', {
        idea: ctx.input.topic,
        businessContext: ctx.input.businessContext,
        articleTitle: intake.articleTitle,
        pilierKeyword: intake.pilierKeyword,
        painPoint: intake.painPoint,
        candidates,
      })
      placement = suggested.placement
      report.addUsage(suggested.usage)
      report.addStep('Cerveau · emplacement')
    }

    // 5. Contexte pour le Gate 1 (aucune écriture à ce stade)
    ctx.placement = placement
    ctx.placementOptions = candidates.map((c) => ({
      siloName: c.siloName,
      cocoonName: c.cocoonName,
      level: c.suggestedLevel,
      score: c.affinity,
      isEmpty: c.isEmpty,
      summary: c.isEmpty
        ? 'vide'
        : `P${c.counts.pilier} · I${c.counts.intermediaire} · S${c.counts.specifique}`,
    }))
    // Vue focalisée sur le silo retenu : l'arbre complet a déjà été affiché au
    // démarrage, le redérouler ici noierait l'emplacement et le brief.
    ctx.treeRender = renderTree(tree, {
      highlightCocoon: placement.cocoonName,
      focusSilo: placement.siloName,
      compact: true,
      theme: COLOR_TREE_THEME,
    })
    ctx.cocoonName = placement.cocoonName
    ctx.articleType = fromCanonicalType(placement.level)
    ctx.articleTitle = intake.articleTitle
    ctx.pilierKeyword = intake.pilierKeyword
    ctx.painPoint = intake.painPoint
    ctx.strategy = buildStrategyRecap(intake)

    logger.success(`Emplacement proposé : « ${placement.cocoonName} » (${placement.level}) — ${placement.rationale}`)
  }
}

export function makeCerveauCommit(deps: PhaseDeps): PhaseFn {
  const { client, logger, report } = deps

  return async (ctx) => {
    if (ctx.resume.skipCerveau) return
    const placement = ctx.placement
    const intake = ctx.intake
    if (!placement || !intake) throw new Error('Cerveau : emplacement ou brief manquant au commit')

    // 6. Création du cocon si l'emplacement validé n'existe pas encore
    const cocoons = await client.apiGet<CocoonSummary[]>('/cocoons')
    let cocoon = findCocoonByName(cocoons, placement.cocoonName)
    if (!cocoon) {
      logger.step(`Création du cocon « ${placement.cocoonName} » dans le silo « ${placement.siloName} »…`)
      await client.apiPost(`/silos/${encodeURIComponent(placement.siloName)}/cocoons`, {
        name: placement.cocoonName,
      })
      const refreshed = await client.apiGet<CocoonSummary[]>('/cocoons')
      cocoon = findCocoonByName(refreshed, placement.cocoonName)
      if (!cocoon) throw new Error(`Cocon « ${placement.cocoonName} » introuvable après création`)
      report.addStep('Cerveau · cocon créé')
    }

    // 7. Création de l'article au niveau validé
    if (ctx.articleId == null) {
      const created = await client.apiPost<{ id: number }[]>('/articles/batch-create', {
        cocoonName: cocoon.name,
        articles: [
          {
            title: intake.articleTitle,
            type: placement.level,
            suggestedKeyword: intake.pilierKeyword,
            painPoint: intake.painPoint,
          },
        ],
      })
      const first = created[0]
      if (first) {
        ctx.articleId = first.id
        logger.success(`Article #${ctx.articleId} créé — ${placement.level} dans « ${cocoon.name} »`)
      } else {
        // Slug déjà pris (ON CONFLICT DO NOTHING) → réutilisation de l'existant.
        const slug = slugify(intake.articleTitle)
        const existing = await client
          .apiGet<{ id: number }>(`/articles/by-slug/${encodeURIComponent(slug)}`)
          .catch(() => null)
        if (!existing) {
          throw new Error(`Article non créé (slug "${slug}" en conflit) et introuvable par slug`)
        }
        ctx.articleId = existing.id
        logger.warn(`Article déjà existant (slug « ${slug} ») — réutilisation #${ctx.articleId}.`)
      }
    }

    // 8. Persistance de la stratégie
    await client.apiPut(`/strategy/${ctx.articleId}`, buildStrategyPayload(intake, placement.level))
    report.addStep('Cerveau · stratégie')
    logger.success('Stratégie Cerveau persistée.')
  }
}
