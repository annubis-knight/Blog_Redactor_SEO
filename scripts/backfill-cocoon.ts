/**
 * Rattrapage des cocons d'avant l'arbre (chantier C7, FR-CER-COCOON-PROGRESSIVE).
 *
 * Avant C7, un article ne connaissait pas son parent, et « rédigé » ne se
 * lisait nulle part. Ce script, pour chaque cocon :
 *   1. rattache chaque article sans parent à son parent et à la section qui
 *      parle de lui (plan pur : `backfill-cocoon-plan.ts`) ; ce qui ne se
 *      rapproche pas sûrement est listé, à rattacher à la main ;
 *   2. pose l'étape « premier jet accepté » (`redaction:draft_accepted`) sur
 *      les articles publiés, et sur les articles rédigés dont le premier jet
 *      passe sa porte — les autres sont listés avec leurs défauts.
 *
 * Simulation par défaut : rien n'est écrit.
 *   npm run db:backfill-cocoon            → liste ce qui serait fait
 *   npm run db:backfill-cocoon -- --apply → écrit
 */
import 'dotenv/config'
import { pool } from '../server/db/client.js'
import { getArticlesByCocoon, getArticleKeywords, addArticleCheck } from '../server/services/infra/data.service.js'
import { getArticleContent } from '../server/services/article/article-content.service.js'
import { getCocoonStrategy } from '../server/services/strategy/cocoon-strategy.service.js'
import { evaluateArticleGate } from '../server/services/gates/gate.service.js'
import { parentSectionsOf } from '../shared/verifiers/cocoon-hierarchy.js'
import { REDACTION_DRAFT_ACCEPTED } from '../shared/constants/workflow-checks.constants.js'
import { planCocoonBackfill, type PlanArticle } from './backfill-cocoon-plan.js'

const LEVEL_ICONS: Record<string, string> = { technique: '⛔', risque: '🔴', attention: '🟠' }

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  console.log(`${apply ? 'Application' : 'Simulation'} — rattrapage de l’arbre des cocons.\n`)
  const cocoons = (await pool.query(`SELECT id, nom FROM cocoons ORDER BY id`)).rows as Array<{ id: number; nom: string }>
  let linked = 0
  let drafted = 0

  for (const cocoon of cocoons) {
    const articles = await getArticlesByCocoon(cocoon.id)
    if (!articles || articles.length === 0) continue
    console.log(`▸ Cocon « ${cocoon.nom} » (${articles.length} article(s))`)

    // 1. Parents et sections.
    const sections = new Map<number, string[]>()
    for (const a of articles.filter(x => x.type !== 'specifique')) {
      const [content, { data: kw }] = await Promise.all([getArticleContent(a.id), getArticleKeywords(a.id)])
      sections.set(a.id, parentSectionsOf(content.content, kw?.hnStructure ?? []))
    }
    const strategy = await getCocoonStrategy(cocoon.nom).catch(() => null)
    const planArticles: PlanArticle[] = articles.map(a => ({
      id: a.id, title: a.title, level: a.type, parentId: a.parentId ?? null, parentSection: a.parentSection ?? null,
      keyword: a.captainKeywordLocked ?? a.suggestedKeyword ?? null,
    }))
    const plan = planCocoonBackfill(
      planArticles,
      (strategy?.proposedArticles ?? []).map(p => ({ title: p.title, parentTitle: p.parentTitle, dbId: p.dbId || undefined })),
      id => sections.get(id) ?? [],
    )
    for (const link of plan.links) {
      const child = articles.find(a => a.id === link.childId)!
      const parent = articles.find(a => a.id === link.parentId)!
      if (apply) {
        await pool.query(
          `UPDATE articles SET parent_id = $1, parent_section = $2 WHERE id = $3 AND parent_id IS NULL`,
          [link.parentId, link.section, link.childId],
        )
      }
      linked++
      console.log(`  ✓ #${child.id} « ${child.title} » → « ${parent.title} », section « ${link.section} »`)
    }
    for (const u of plan.unmatched) console.log(`  ○ #${u.childId} « ${u.title} » — ${u.reason}`)

    // 2. « Rédigé » : premier jet accepté.
    for (const a of articles.filter(x => !x.completedChecks.includes(REDACTION_DRAFT_ACCEPTED))) {
      const published = a.status === 'publié'
      const { content } = await getArticleContent(a.id)
      if (!published && !(content ?? '').trim()) continue
      const evaluation = published ? null : await evaluateArticleGate(a.id, 'draft')
      if (published || evaluation!.passed) {
        if (apply) await addArticleCheck(a.id, REDACTION_DRAFT_ACCEPTED)
        drafted++
        console.log(`  ✓ #${a.id} « ${a.title} » — ${published ? 'publié' : 'premier jet qui passe sa porte'} : étape « premier jet accepté » ${apply ? 'posée' : 'à poser'}.`)
        continue
      }
      console.log(`  ✗ #${a.id} « ${a.title} » — premier jet retenu par sa porte :`)
      for (const issue of evaluation!.blocking) console.log(`      ${LEVEL_ICONS[issue.level] ?? '•'} ${issue.message}`)
    }
  }

  console.log(`\n${linked} rattachement(s) et ${drafted} étape(s) « premier jet accepté » ${apply ? 'écrits' : 'à écrire'}.${apply ? '' : ' Relancez avec --apply pour les écrire.'}`)
}

try {
  await main()
} finally {
  await pool.end()
}
