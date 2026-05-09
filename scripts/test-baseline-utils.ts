/**
 * Utilitaires partagés entre test-snapshot.ts et test-check.ts :
 * lance Vitest avec le reporter JSON, extrait les tests rouges et les totals.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'

export interface Failure {
  file: string
  name: string
}

export interface Totals {
  passed: number
  failed: number
  skipped: number
}

interface VitestAssertion {
  fullName?: string
  title?: string
  ancestorTitles?: string[]
  status: 'passed' | 'failed' | 'pending' | 'skipped' | 'todo'
}

interface VitestTestResult {
  name?: string
  testFilePath?: string
  assertionResults: VitestAssertion[]
}

interface VitestJson {
  numPassedTests?: number
  numFailedTests?: number
  numPendingTests?: number
  numTodoTests?: number
  testResults: VitestTestResult[]
}

function buildName(a: VitestAssertion): string {
  if (a.fullName) return a.fullName
  const ancestors = a.ancestorTitles?.join(' > ') ?? ''
  return ancestors ? `${ancestors} > ${a.title ?? ''}` : (a.title ?? '(sans nom)')
}

function toRelative(p: string): string {
  const norm = (s: string) => s.replace(/\\/g, '/').replace(/\/+$/, '')
  const root = norm(resolve('.'))
  const file = norm(p)
  // Comparaison case-insensitive sur Windows (c:\ vs C:\)
  const isWin = process.platform === 'win32'
  const eq = isWin
    ? file.toLowerCase().startsWith(root.toLowerCase() + '/')
    : file.startsWith(root + '/')
  return eq ? file.slice(root.length + 1) : file
}

export async function runVitestJson(): Promise<{
  failures: Failure[]
  totals: Totals
  exitCode: number
}> {
  const outFile = resolve(tmpdir(), `vitest-baseline-${Date.now()}.json`)
  mkdirSync(dirname(outFile), { recursive: true })

  const result = spawnSync(
    'npx',
    ['vitest', 'run', '--reporter=json', `--outputFile=${outFile}`],
    { stdio: ['ignore', 'inherit', 'inherit'], encoding: 'utf8', shell: true },
  )

  if (!existsSync(outFile)) {
    throw new Error(
      `Vitest n'a pas écrit ${outFile} (exit ${result.status}). Vérifie que la suite peut tourner.`,
    )
  }

  const json = JSON.parse(readFileSync(outFile, 'utf8')) as VitestJson
  rmSync(outFile, { force: true })

  const failures: Failure[] = []
  for (const file of json.testResults ?? []) {
    const filePath = toRelative(file.name ?? file.testFilePath ?? '(unknown)')
    for (const a of file.assertionResults ?? []) {
      if (a.status === 'failed') {
        failures.push({ file: filePath, name: buildName(a) })
      }
    }
  }
  failures.sort((a, b) => (a.file + a.name).localeCompare(b.file + b.name))

  const totals: Totals = {
    passed: json.numPassedTests ?? 0,
    failed: json.numFailedTests ?? failures.length,
    skipped: (json.numPendingTests ?? 0) + (json.numTodoTests ?? 0),
  }

  return { failures, totals, exitCode: result.status ?? 0 }
}

