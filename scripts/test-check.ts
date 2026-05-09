/**
 * Compare l'état courant de la suite Vitest au baseline tests/.baseline.json.
 *
 * - Aucun nouveau rouge → exit 0 (chantier safe sur les tests)
 * - Nouveaux rouges     → exit 1 + liste (le chantier a cassé X tests)
 * - Nouveaux verts      → infos (peuvent être retirés du baseline via test:snapshot)
 *
 * Usage :
 *   npm run test:check
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  runVitestJson,
  type Failure,
} from './test-baseline-utils.js'

const BASELINE_PATH = resolve('tests/.baseline.json')

interface Baseline {
  generated_at: string
  git: { commit: string; branch: string }
  totals: { passed: number; failed: number; skipped: number }
  fingerprint: string
  failures: Failure[]
}

function key(f: Failure): string {
  return `${f.file} :: ${f.name}`
}

async function main(): Promise<void> {
  if (!existsSync(BASELINE_PATH)) {
    console.error('✗ Aucun baseline trouvé à tests/.baseline.json')
    console.error('  → Lance `npm run test:snapshot` pour en générer un.')
    process.exit(1)
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline
  const baselineKeys = new Set(baseline.failures.map(key))

  console.log('▶ Lancement de la suite Vitest pour check…')
  const { failures: current } = await runVitestJson()
  const currentKeys = new Set(current.map(key))

  const newRed = current.filter((f) => !baselineKeys.has(key(f)))
  const newGreen = baseline.failures.filter((f) => !currentKeys.has(key(f)))

  console.log('')
  console.log(`Baseline : ${baseline.git.commit} (${baseline.git.branch}) — ${baseline.failures.length} rouge(s)`)
  console.log(`Courant  : ${current.length} rouge(s)`)
  console.log('')

  if (newRed.length === 0 && newGreen.length === 0) {
    console.log('✓ Aucun changement — état des tests identique au baseline.')
    process.exit(0)
  }

  if (newGreen.length > 0) {
    console.log(`✓ ${newGreen.length} nouveau(x) vert(s) (rouges du baseline qui passent maintenant) :`)
    for (const f of newGreen) console.log(`    • ${key(f)}`)
    console.log('  → si voulu, régénère le baseline : `npm run test:snapshot`')
    console.log('')
  }

  if (newRed.length > 0) {
    console.error(`⚠️  ${newRed.length} nouveau(x) rouge(s) — probablement cassé(s) par le chantier :`)
    for (const f of newRed) console.error(`    • ${key(f)}`)
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Échec check :', err.message)
  process.exit(1)
})
