/**
 * Génère tests/.baseline.json à partir de la suite Vitest courante.
 *
 * Le baseline liste les tests rouges au moment du snapshot + métadonnées
 * (commit, branche, totals, fingerprint sha256). Sert de référence pour
 * `npm run test:check` qui répond à la question :
 *   "Mon chantier a-t-il cassé un test, ou ces rouges étaient-ils déjà là ?"
 *
 * Usage :
 *   npm run test:snapshot
 */

import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { runVitestJson, type Failure } from './test-baseline-utils.js'

const BASELINE_PATH = resolve('tests/.baseline.json')

interface GitInfo {
  commit: string
  branch: string
  subject: string
  clean: boolean
}

function getGitInfo(): GitInfo {
  const safe = (cmd: string): string => {
    try {
      return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    } catch {
      return '(git non disponible)'
    }
  }
  const status = safe('git status --porcelain')
  return {
    commit: safe('git rev-parse --short HEAD'),
    branch: safe('git rev-parse --abbrev-ref HEAD'),
    subject: safe('git log -1 --pretty=%s'),
    clean: status === '',
  }
}

function fingerprint(failures: Failure[]): string {
  const canonical = JSON.stringify(
    failures.map((f) => ({ file: f.file, name: f.name })),
  )
  return createHash('sha256').update(canonical).digest('hex')
}

async function main(): Promise<void> {
  console.log('▶ Lancement de la suite Vitest pour snapshot…')
  const { failures, totals } = await runVitestJson()
  const git = getGitInfo()

  const baseline = {
    generated_at: new Date().toISOString(),
    git,
    totals,
    fingerprint: `sha256:${fingerprint(failures)}`,
    failures,
    note: 'Fichier généré par `npm run test:snapshot`. Ne pas éditer à la main. Régénérer après réparation/ajout de tests.',
  }

  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')

  console.log(`✓ Baseline écrit : ${BASELINE_PATH}`)
  console.log(`  Tests passés    : ${totals.passed}`)
  console.log(`  Tests rouges    : ${totals.failed}`)
  console.log(`  Tests skipped   : ${totals.skipped}`)
  console.log(`  Empreinte       : ${baseline.fingerprint.slice(0, 23)}…`)
  console.log(`  Commit          : ${git.commit} (${git.branch})${git.clean ? '' : '  ⚠️  dirty'}`)

  // exit 0 même si tests rouges : on snapshot l'état tel quel
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Échec snapshot :', err.message)
  process.exit(1)
})
