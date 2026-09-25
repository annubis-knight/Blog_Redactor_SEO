/**
 * AUTHORITY: PostgreSQL `gate_waivers` (dérogations aux portes de qualité).
 * READS FROM: articles (type, slug, titre, pain_intent_expected, cocoon_id),
 *             article_keywords (capitaine, lieutenants), keyword_metrics,
 *             captain_explorations (candidats explorés), article_content,
 *             article_keywords des autres articles du cocon.
 * WRITES TO: gate_waivers (saveGateWaivers).
 * CONSUMERS: server/routes/gates.routes.ts (évaluation, dérogations),
 *            server/routes/articles.routes.ts (POST /progress/check, PUT /status),
 *            scripts/verify-content.ts (liste des dérogations).
 * RELATED FR: FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER, FR-CAP-LOCK-GATE,
 *             FR-LIE-LOCK-GATE, FR-RED-PUBLISH-GATE, FR-LEX-METIER-ONLY (lexique-lock),
 *             FR-RED-DRAFT-SINGLE-PASS (draft : article_micro_contexts.target_word_count)
 *
 * Le serveur est le seul évaluateur : il charge les données, appelle le
 * vérificateur partagé (`shared/verifiers/`) et applique les dérogations
 * enregistrées. L'écran affiche son verdict ; aucune empreinte ne peut donc
 * diverger entre le navigateur et le serveur.
 */
import { pool } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import { getArticleById, getArticleKeywords, loadArticleMicroContext } from '../infra/data.service.js'
import { getKeywordMetrics } from '../keyword/keyword-metrics.service.js'
import { captainKpisFromMetricsRow } from '../keyword/captain-kpis.js'
import { getArticleContent } from '../article/article-content.service.js'
import { computeVerdict, getThresholds, scoreKpi } from '../../../shared/kpi-scoring.js'
import {
  evaluateGate,
  hashGateInput,
  standingWaivers,
  waiverProblem,
  type GateEvaluation,
  type GateId,
  type GateIssue,
  type GateWaiver,
  type WaiverCategory,
  type WaiverDraft,
  type WaiverRefusal,
} from '../../../shared/verifiers/gate.js'
import { verifyCaptain, type CaptainGateInput } from '../../../shared/verifiers/captain.js'
import { verifyLieutenants, normalizeKeyword, type CocoonKeywordClaim } from '../../../shared/verifiers/lieutenants.js'
import { verifyPublish } from '../../../shared/verifiers/publish.js'
import { verifyLexique } from '../../../shared/verifiers/lexique.js'
import { verifyDraft } from '../../../shared/verifiers/draft.js'
import { targetWordsFor } from '../../../shared/constants/article-type-rules.js'
import { normalizeTerm } from '../../../shared/utils/generic-terms.js'
import { MOTEUR_CAPITAINE_LOCKED, MOTEUR_LEXIQUE_VALIDATED, MOTEUR_LIEUTENANTS_LOCKED } from '../../../shared/constants/workflow-checks.constants.js'
import type { PainIntentExpected } from '../../../shared/types/scoring.types.js'

export type { GateEvaluation }

/** Checks du Moteur gardés par une porte : le check n'est accordé que si la porte passe. */
export const CHECK_GATES: Record<string, GateId> = {
  [MOTEUR_CAPITAINE_LOCKED]: 'captain-lock',
  [MOTEUR_LIEUTENANTS_LOCKED]: 'lieutenants-lock',
  [MOTEUR_LEXIQUE_VALIDATED]: 'lexique-lock',
}

interface ArticleRow {
  id: number
  cocoonId: number | null
}

async function loadArticleRow(articleId: number): Promise<ArticleRow | null> {
  const res = await pool.query(`SELECT id, cocoon_id FROM articles WHERE id = $1`, [articleId])
  const row = res.rows[0]
  return row ? { id: row.id as number, cocoonId: (row.cocoon_id as number | null) ?? null } : null
}

export async function listArticleWaivers(articleId: number): Promise<GateWaiver[]> {
  const res = await pool.query(
    `SELECT gate_id, rule, level, category, reason, input_hash, created_at
     FROM gate_waivers WHERE article_id = $1 ORDER BY created_at`,
    [articleId],
  )
  return res.rows.map(r => ({
    gateId: r.gate_id as GateId,
    rule: r.rule as string,
    level: r.level as 'attention' | 'risque',
    category: (r.category as WaiverCategory | null) ?? null,
    reason: (r.reason as string | null) ?? null,
    inputHash: r.input_hash as string,
    createdAt: (r.created_at as Date).toISOString(),
  }))
}

/** Candidats capitaine explorés pour l'article, avec leur volume mesuré. */
async function exploredCandidates(articleId: number): Promise<Array<{ keyword: string; volume: number }>> {
  const res = await pool.query(
    `SELECT DISTINCT ce.keyword, km.search_volume
     FROM captain_explorations ce
     JOIN keyword_metrics km ON LOWER(km.keyword) = LOWER(ce.keyword)
     WHERE ce.article_id = $1 AND km.search_volume IS NOT NULL`,
    [articleId],
  )
  return res.rows.map(r => ({ keyword: r.keyword as string, volume: Number(r.search_volume) }))
}

async function captainGate(articleId: number, keywordOverride?: string): Promise<{ issues: GateIssue[]; hashInput: unknown }> {
  const found = await getArticleById(articleId)
  if (!found) throw new Error(`Article ${articleId} introuvable`)
  const { article } = found
  const { data: kw } = await getArticleKeywords(articleId)
  const keyword = (keywordOverride ?? kw?.capitaine ?? article.captainKeywordLocked ?? '').trim()
  if (!keyword) {
    return {
      issues: [{ rule: 'captain-missing', level: 'technique', message: 'Aucun capitaine verrouillé pour cet article.' }],
      hashInput: { keyword: '' },
    }
  }

  const metrics = await getKeywordMetrics(keyword)
  let verdict: CaptainGateInput['verdict'] = null
  if (metrics) {
    const summaries = captainKpisFromMetricsRow({
      keyword,
      search_volume: metrics.searchVolume,
      keyword_difficulty: metrics.keywordDifficulty,
      cpc: metrics.cpc,
      intent_raw: metrics.intentRaw,
      autocomplete_suggestions: metrics.autocompleteSuggestions,
      autocomplete_source: metrics.autocompleteSource,
      metrics_fetched_at: metrics.fetchedAt,
      article_title: article.title,
    }, metrics.paaQuestions ?? [])
    const config = getThresholds(article.type)
    verdict = summaries.length > 0 ? computeVerdict(summaries.map(s => scoreKpi(s.name, s.rawValue, config))).level : null
  }

  const input: CaptainGateInput = {
    keyword,
    level: article.type,
    volume: metrics?.searchVolume ?? null,
    autocompleteCount: metrics && metrics.autocompleteSource ? metrics.autocompleteSuggestions.length : null,
    verdict,
    serpIntent: (metrics?.intentLabel ?? null) as PainIntentExpected | null,
    expectedIntent: article.painIntentExpected ?? null,
    alternatives: await exploredCandidates(articleId),
  }
  // Les alternatives n'entrent pas dans l'empreinte : explorer un nouveau
  // candidat ne doit pas annuler une dérogation sur le capitaine choisi.
  const { alternatives: _alternatives, ...hashInput } = { ...input, keyword: normalizeKeyword(keyword) }
  return { issues: verifyCaptain(input), hashInput }
}

async function lieutenantsGate(articleId: number): Promise<{ issues: GateIssue[]; hashInput: unknown }> {
  const found = await getArticleById(articleId)
  if (!found) throw new Error(`Article ${articleId} introuvable`)
  const row = await loadArticleRow(articleId)
  const { data: kw } = await getArticleKeywords(articleId)
  const lieutenants = [...(kw?.lieutenants ?? [])]

  const claims: CocoonKeywordClaim[] = []
  if (row?.cocoonId) {
    const res = await pool.query(
      `SELECT a.titre, ak.capitaine, ak.lieutenants
       FROM articles a JOIN article_keywords ak ON ak.article_id = a.id
       WHERE a.cocoon_id = $1 AND a.id <> $2`,
      [row.cocoonId, articleId],
    )
    for (const r of res.rows) {
      if (r.capitaine) claims.push({ keyword: r.capitaine as string, articleTitle: r.titre as string, role: 'capitaine' })
      for (const l of (r.lieutenants as string[] | null) ?? []) {
        claims.push({ keyword: l, articleTitle: r.titre as string, role: 'lieutenant' })
      }
    }
  }

  const input = {
    level: found.article.type,
    captain: kw?.capitaine ?? null,
    lieutenants,
    cocoonClaims: claims,
    unselectedCandidates: [] as string[],
  }
  // Seuls les mots-clés du cocon qui recoupent ceux de l'article entrent dans
  // l'empreinte : un voisin sans rapport, créé plus tard, ne doit pas faire
  // tomber une dérogation ; un voisin qui prend un de nos lieutenants, si.
  const own = new Set([input.captain ?? '', ...lieutenants].filter(Boolean).map(normalizeKeyword))
  const hashInput = {
    level: input.level,
    captain: input.captain ? normalizeKeyword(input.captain) : null,
    lieutenants: lieutenants.map(normalizeKeyword).sort(),
    claims: claims
      .filter(c => own.has(normalizeKeyword(c.keyword)))
      .map(c => `${c.role}:${normalizeKeyword(c.keyword)}`)
      .sort(),
  }
  return { issues: verifyLieutenants(input), hashInput }
}

/** Lexique retenu (FR-LEX-METIER-ONLY) : ⛔ vide, 🔴 terme générique. */
async function lexiqueGate(articleId: number): Promise<{ issues: GateIssue[]; hashInput: unknown }> {
  const found = await getArticleById(articleId)
  if (!found) throw new Error(`Article ${articleId} introuvable`)
  const { data: kw } = await getArticleKeywords(articleId)
  const terms = [...(kw?.lexique ?? [])]
  return {
    issues: verifyLexique({ terms }),
    hashInput: { terms: terms.map(normalizeTerm).sort() },
  }
}

/**
 * Premier jet (FR-RED-DRAFT-SINGLE-PASS) : le texte enregistré, jugé contre la
 * longueur visée (micro-contexte, sinon règle du type) et le sommaire validé.
 */
async function draftGate(articleId: number): Promise<{ issues: GateIssue[]; hashInput: unknown }> {
  const found = await getArticleById(articleId)
  if (!found) throw new Error(`Article ${articleId} introuvable`)
  const { article } = found
  const [content, { data: kw }, micro] = await Promise.all([
    getArticleContent(articleId),
    getArticleKeywords(articleId),
    loadArticleMicroContext(articleId),
  ])
  // Le sommaire enregistré peut être une chaîne JSON ou un objet.
  const outline = (typeof content.outline === 'string' ? JSON.parse(content.outline) : content.outline) as
    { sections?: Array<{ level: number }> } | null
  const input = {
    content: content.content ?? '',
    captain: kw?.capitaine ?? article.captainKeywordLocked ?? null,
    targetWords: micro?.targetWordCount ?? targetWordsFor(article.type),
    outlineH2Count: outline?.sections?.filter(s => s.level === 2).length ?? 0,
  }
  return { issues: verifyDraft(input), hashInput: input }
}

async function publishGate(articleId: number): Promise<{ issues: GateIssue[]; hashInput: unknown }> {
  const found = await getArticleById(articleId)
  if (!found) throw new Error(`Article ${articleId} introuvable`)
  const { article } = found
  const content = await getArticleContent(articleId)
  const { data: kw } = await getArticleKeywords(articleId)
  const html = content.content ?? ''
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim()
  // Publier rejoue les portes en amont (capitaine, lieutenants) sur les données
  // d'aujourd'hui. Une dérogation encore debout est réaffichée pour être
  // reconfirmée ; une dérogation tombée (données changées) ne l'est pas, et
  // l'alerte qu'elle couvrait revient à la place, à son niveau d'origine.
  const upstream = [
    await evaluateArticleGate(articleId, 'captain-lock'),
    await evaluateArticleGate(articleId, 'lieutenants-lock'),
    await evaluateArticleGate(articleId, 'lexique-lock'),
  ]
  const existingWaivers = standingWaivers(upstream.flatMap(e => e.waived.map(w => w.waiver)), {})
  const upstreamBlocking: GateIssue[] = upstream.flatMap(e => e.blocking.map(i => ({ ...i, rule: `${e.gateId}:${i.rule}` })))
  const input = {
    title: h1 || article.title,
    slug: article.slug,
    level: article.type,
    content: html,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    capitaine: kw?.capitaine ?? article.captainKeywordLocked ?? null,
    lieutenants: kw?.lieutenants ?? [],
    existingWaivers,
  }
  const { existingWaivers: _waivers, ...rest } = input
  // L'empreinte des portes amont et leurs dérogations debout entrent dans celle
  // de la publication : un changement en amont rouvre la décision. Les
  // dérogations de la publication elle-même en sont exclues : sinon, en
  // enregistrer une changerait l'empreinte et l'annulerait aussitôt.
  const hashInput = {
    ...rest,
    upstream: upstream.map(e => `${e.gateId}:${e.inputHash}`),
    waivers: existingWaivers.map(w => `${w.gateId}:${w.rule}:${w.inputHash}`).sort(),
  }
  return { issues: [...upstreamBlocking, ...verifyPublish(input)], hashInput }
}

export async function evaluateArticleGate(
  articleId: number,
  gateId: GateId,
  opts: { keyword?: string } = {},
): Promise<GateEvaluation> {
  let built: { issues: GateIssue[]; hashInput: unknown }
  switch (gateId) {
    case 'captain-lock': built = await captainGate(articleId, opts.keyword); break
    case 'lieutenants-lock': built = await lieutenantsGate(articleId); break
    case 'lexique-lock': built = await lexiqueGate(articleId); break
    case 'draft': built = await draftGate(articleId); break
    case 'publish': built = await publishGate(articleId); break
    default:
      // Porte livrée par un chantier suivant (structure, C6).
      built = { issues: [], hashInput: {} }
  }
  const inputHash = hashGateInput(built.hashInput)
  const waivers = (await listArticleWaivers(articleId)).filter(w => w.gateId === gateId)
  const result = evaluateGate(gateId, built.issues, waivers, inputHash)
  log.info('[gate] évaluation', {
    articleId, gateId, passed: result.passed,
    blocking: result.blocking.map(i => `${i.level}:${i.rule}`),
    waived: result.waived.length,
  })
  return { gateId, issues: built.issues, inputHash, ...result }
}

/**
 * Enregistre les dérogations recevables pour l'évaluation COURANTE de la porte
 * (même empreinte), et renvoie la nouvelle évaluation ainsi que les refus motivés.
 */
export async function saveGateWaivers(
  articleId: number,
  gateId: GateId,
  drafts: WaiverDraft[],
  opts: { keyword?: string } = {},
): Promise<{ evaluation: GateEvaluation; refused: WaiverRefusal[] }> {
  const before = await evaluateArticleGate(articleId, gateId, opts)
  const refused: WaiverRefusal[] = []
  for (const draft of drafts) {
    const issue = before.issues.find(i => i.rule === draft.rule)
    if (!issue) {
      refused.push({ rule: draft.rule, problem: 'Cette alerte n’existe plus : les données ont changé, relancez la vérification.' })
      continue
    }
    const problem = waiverProblem(issue, draft)
    if (problem) {
      refused.push({ rule: draft.rule, problem })
      continue
    }
    await pool.query(
      `INSERT INTO gate_waivers (article_id, gate_id, rule, level, category, reason, input_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (article_id, gate_id, rule, input_hash)
       DO UPDATE SET level = EXCLUDED.level, category = EXCLUDED.category, reason = EXCLUDED.reason, created_at = now()`,
      [articleId, gateId, issue.rule, issue.level, draft.category ?? null, draft.reason?.trim() || null, before.inputHash],
    )
  }
  log.info('[gate] dérogations', { articleId, gateId, saved: drafts.length - refused.length, refused: refused.length })
  return { evaluation: await evaluateArticleGate(articleId, gateId, opts), refused }
}
