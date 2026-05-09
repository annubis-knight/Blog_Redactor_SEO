/**
 * Sprint keyword-metrics-decomposition — Story D1
 *
 * Bench perf : prouver que la décomposition réduit le payload du brief
 * Capitaine d'au moins 80 % (cf. AC.SCHEMA.4 + AC.D1.1).
 *
 * Mesures (3 runs, médiane) sur la DB locale :
 *   - "BEFORE" : SELECT * FROM keyword_metrics … (inclut serp_raw_json
 *     ~50-115 ko sur les top-5 keywords).
 *   - "AFTER"  : SELECT clés numériques uniquement (post-C4 — getKeywordMetrics
 *     ne lit plus serp_raw_json) + lecture optionnelle keyword_serp_results
 *     (URLs only, ~5 ko/keyword).
 *
 * Output : bytes + ms par mesure, console + écrit dans
 * docs/perf-bench-keyword-metrics-decomposition.md (ad-hoc, archivé en D3).
 *
 * Usage : npx tsx scripts/bench-keyword-metrics.ts
 *
 * Script jetable : supprimé en Story D3.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { query, pool } from '../server/db/client.js'

const KEYWORDS_WITH_SERP_QUERY = `
  SELECT keyword
    FROM keyword_metrics
   WHERE serp_raw_json IS NOT NULL
   ORDER BY pg_column_size(serp_raw_json) DESC
   LIMIT 5
`

const SELECT_BEFORE = `
  SELECT keyword, lang, country, search_volume, keyword_difficulty, cpc, competition,
         intent_raw, intent_label, autocomplete_suggestions, autocomplete_source, paa_questions,
         local_analysis, content_gap_analysis, local_comparison, serp_raw_json, fetched_at
    FROM keyword_metrics
   WHERE keyword = $1 AND lang = 'fr' AND country = 'fr'
`

const SELECT_AFTER = `
  SELECT keyword, lang, country, search_volume, keyword_difficulty, cpc, competition,
         intent_raw, intent_label, autocomplete_suggestions, autocomplete_source, paa_questions,
         local_analysis, content_gap_analysis, local_comparison, fetched_at
    FROM keyword_metrics
   WHERE keyword = $1 AND lang = 'fr' AND country = 'fr'
`

const SELECT_SERP_RESULTS = `
  SELECT keyword, position, url, title, domain
    FROM keyword_serp_results
   WHERE keyword = $1 AND lang = 'fr' AND country = 'fr'
   ORDER BY position
`

interface RunResult {
  ms: number
  bytes: number
}

async function timeRun(sql: string, params: unknown[]): Promise<RunResult> {
  const start = performance.now()
  const res = await query(sql, params)
  const ms = performance.now() - start
  const bytes = Buffer.byteLength(JSON.stringify(res.rows), 'utf8')
  return { ms, bytes }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

interface KeywordBench {
  keyword: string
  before: RunResult
  after: RunResult
  reductionPct: number
}

async function benchKeyword(keyword: string): Promise<KeywordBench> {
  const beforeRuns: RunResult[] = []
  const afterRuns: RunResult[] = []
  for (let i = 0; i < 3; i++) {
    beforeRuns.push(await timeRun(SELECT_BEFORE, [keyword]))
  }
  for (let i = 0; i < 3; i++) {
    const km = await timeRun(SELECT_AFTER, [keyword])
    const serp = await timeRun(SELECT_SERP_RESULTS, [keyword])
    afterRuns.push({ ms: km.ms + serp.ms, bytes: km.bytes + serp.bytes })
  }
  const before = { ms: median(beforeRuns.map((r) => r.ms)), bytes: median(beforeRuns.map((r) => r.bytes)) }
  const after = { ms: median(afterRuns.map((r) => r.ms)), bytes: median(afterRuns.map((r) => r.bytes)) }
  const reductionPct = before.bytes > 0 ? Math.round((1 - after.bytes / before.bytes) * 1000) / 10 : 0
  return { keyword, before, after, reductionPct }
}

async function main(): Promise<void> {
  const kwRes = await query<{ keyword: string }>(KEYWORDS_WITH_SERP_QUERY)
  const keywords = kwRes.rows.map((r) => r.keyword)
  if (keywords.length === 0) {
    console.log('Aucun keyword avec serp_raw_json — bench skippé.')
    await pool.end()
    return
  }

  const results: KeywordBench[] = []
  for (const kw of keywords) {
    results.push(await benchKeyword(kw))
  }

  const lines: string[] = []
  lines.push('# Bench perf — Décomposition `keyword_metrics` (Story D1)')
  lines.push('')
  lines.push(`Date : ${new Date().toISOString()}`)
  lines.push(`Top-${keywords.length} keywords avec \`serp_raw_json\` (les plus lourds en DB).`)
  lines.push('')
  lines.push('| Keyword | Before bytes | After bytes | Réduction | Before ms | After ms |')
  lines.push('|---|---:|---:|---:|---:|---:|')
  for (const r of results) {
    lines.push(
      `| \`${r.keyword}\` | ${r.before.bytes.toLocaleString()} | ${r.after.bytes.toLocaleString()} | **${r.reductionPct}%** | ${r.before.ms.toFixed(1)} | ${r.after.ms.toFixed(1)} |`,
    )
  }
  const avgReduction = results.reduce((s, r) => s + r.reductionPct, 0) / results.length
  lines.push('')
  lines.push(`**Réduction moyenne payload : ${avgReduction.toFixed(1)}%**`)
  lines.push('')
  lines.push(
    'AC.D1.1 : ≥ 80 % attendu sur top-5 keywords avec serp_raw_json rempli — ' +
      (avgReduction >= 80 ? '✅ atteint' : '❌ NON atteint, investiguer'),
  )
  lines.push('')
  lines.push(
    'AC.D1.2 : le SELECT Capitaine post-C4 n\'inclut plus `serp_raw_json` ' +
      '(vérifié par lecture du source — `getKeywordMetrics` n\'a plus la colonne dans son SELECT).',
  )

  const out = lines.join('\n') + '\n'
  const outPath = resolve('docs/perf-bench-keyword-metrics-decomposition.md')
  writeFileSync(outPath, out, 'utf8')

  console.log(out)
  console.log(`\n✓ Rapport écrit : ${outPath}`)

  await pool.end()
}

main().catch((err) => {
  console.error('[bench] failed:', err)
  process.exit(1)
})
