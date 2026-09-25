/**
 * Réconciliation des étapes « Structure » (chantier C6, FR-HN-TAB).
 *
 * Avant C6, l'étape Lieutenants exigeait une structure Hn, et il n'existait pas
 * d'étape Structure. Les articles déjà avancés ont donc `lieutenants_locked`
 * sans `hn_locked` : la Finalisation (4 verrous) leur reste fermée. Ce script
 * passe leur structure à la porte `hn-lock` — la même que l'écran — et n'ajoute
 * l'étape qu'aux structures qui la passent. Les autres sont listées avec leurs
 * défauts, à reprendre dans l'onglet Structure.
 *
 * Simulation par défaut : rien n'est écrit.
 *   npm run db:reconcile-hn            → liste ce qui serait fait
 *   npm run db:reconcile-hn -- --apply → ajoute `moteur:hn_locked` aux structures qui passent
 */
import 'dotenv/config'
import { pool } from '../server/db/client.js'
import { evaluateArticleGate } from '../server/services/gates/gate.service.js'
import { addArticleCheck } from '../server/services/infra/data.service.js'
import { MOTEUR_HN_LOCKED, MOTEUR_LIEUTENANTS_LOCKED } from '../shared/constants/workflow-checks.constants.js'

const LEVEL_ICONS: Record<string, string> = { technique: '⛔', risque: '🔴', attention: '🟠' }

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  const { rows } = await pool.query(
    `SELECT a.id, a.titre, COALESCE(jsonb_array_length(ak.hn_structure), 0) AS nodes
     FROM articles a
     LEFT JOIN article_keywords ak ON ak.article_id = a.id
     WHERE $1 = ANY(a.completed_checks) AND NOT ($2 = ANY(a.completed_checks))
     ORDER BY a.id`,
    [MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED],
  )

  console.log(`${apply ? 'Application' : 'Simulation'} — ${rows.length} article(s) avec des lieutenants validés et sans étape Structure.\n`)
  let granted = 0
  for (const row of rows as Array<{ id: number; titre: string; nodes: number }>) {
    const label = `#${row.id} ${row.titre}`
    if (Number(row.nodes) === 0) {
      console.log(`  ○ ${label} — aucune structure : à construire dans l'onglet Structure.`)
      continue
    }
    const evaluation = await evaluateArticleGate(row.id, 'hn-lock')
    if (evaluation.passed) {
      if (apply) await addArticleCheck(row.id, MOTEUR_HN_LOCKED)
      granted++
      console.log(`  ✓ ${label} — la structure passe la porte : étape ${apply ? 'ajoutée' : 'à ajouter'}.`)
      continue
    }
    console.log(`  ✗ ${label} — la porte retient la structure :`)
    for (const issue of evaluation.blocking) {
      console.log(`      ${LEVEL_ICONS[issue.level] ?? '•'} ${issue.message}`)
    }
  }

  console.log(`\n${granted} étape(s) ${apply ? 'ajoutée(s)' : 'à ajouter'}.${apply ? '' : ' Relancez avec --apply pour les écrire.'}`)
}

try {
  await main()
} finally {
  await pool.end()
}
