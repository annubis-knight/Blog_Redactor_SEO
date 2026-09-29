/**
 * `npm run verify:content` — la porte de publication et les dérogations
 * (FR-RED-PUBLISH-GATE, FR-INFRA-GATE-WAIVER), mises en mots.
 *
 * Le verdict vient de l'évaluation du serveur elle-même (`evaluateArticleGate`) :
 * le même code sert l'écran, le serveur et l'audit. Ce module ne fait que le
 * rendre lisible — fonctions pures, testées.
 */
import type { ContentIssue } from '../shared/content-validators.js'
import {
  GATE_LABELS,
  WAIVER_CATEGORY_LABELS,
  type GateEvaluation,
  type GateLevel,
  type GateWaiver,
} from '../shared/verifiers/gate.js'

const ICONS: Record<GateLevel, string> = { technique: '⛔', risque: '🔴', attention: '🟠' }

/**
 * Une porte de publication qui refuse un article déjà rédigé est un
 * AVERTISSEMENT : les défauts eux-mêmes sont déjà comptés en erreurs par les
 * validateurs ; ici, on signale que l'article ne pourrait plus être publié.
 */
export function publishGateIssues(evaluation: GateEvaluation): ContentIssue[] {
  if (evaluation.passed) return []
  const count: Record<GateLevel, number> = { technique: 0, risque: 0, attention: 0 }
  for (const issue of evaluation.blocking) count[issue.level]++
  const detail = (Object.keys(count) as GateLevel[])
    .filter(level => count[level] > 0)
    .map(level => `${ICONS[level]} ${count[level]}`)
    .join(' ')
  return [{
    rule: 'publish-gate-refused',
    severity: 'warning',
    message: `La porte de publication refuserait cet article : ${evaluation.blocking.length} point(s) (${detail}).`,
  }]
}

/** Une ligne par dérogation : porte, règle, catégorie et raison. */
export function describeWaivers(waivers: GateWaiver[]): string[] {
  return waivers.map((w) => {
    const category = w.category ? WAIVER_CATEGORY_LABELS[w.category] : 'lu'
    const reason = w.reason ? ` — « ${w.reason} »` : ''
    return `🛡 [${w.gateId} · ${w.rule}] ${GATE_LABELS[w.gateId]} : ${category}${reason}`
  })
}

/** Scores enregistrés (FR-RED-SEO-SCORE-PERSIST) : « — » quand ils sont inconnus. */
export function describeScores(seo: number | string | null, geo: number | string | null): string {
  const show = (v: number | string | null) => (v === null ? '—' : String(Math.round(Number(v))))
  return `Scores enregistrés : SEO ${show(seo)} · GEO ${show(geo)}`
}
