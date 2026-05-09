/**
 * AUTHORITY: PostgreSQL `keyword_metrics` (ligne par keyword × lang × country).
 *            Source unique cross-article pour les KPIs numériques DataForSEO :
 *            volume, difficulté, CPC, intent (raw + label), autocomplete, PAA.
 *            Artefacts SERP cross-article : voir keyword-serp.service.ts
 *            (keyword_serp_results, keyword_serp_scrapes, keyword_paa_questions,
 *             keyword_autocomplete).
 * READS FROM: SELECT keyword_metrics WHERE keyword = $1 AND lang/country.
 * WRITES TO: INSERT/UPSERT via upsertKeywordKpis, upsertKeywordAutocomplete,
 *            upsertKeywordPaa (autres helpers ci-dessous).
 *            COALESCE systématique : on n'écrase jamais une valeur existante par null.
 * CONSUMERS: keyword-scan.routes (validation card individuelle),
 *            captain-relevance.service (Score Pertinence live),
 *            radar-* services (scan SERP cross-article).
 * RELATED FR: FR-CAP-RELEVANCE-COMPUTED-LIVE, FR-CAP-RELEVANCE-INTENT-SIGNAL,
 *             FR-INFRA-KPI-NULLABLE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION.
 */
import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import {
  PAIN_INTENT_EXPECTED_VALUES,
  type PainIntentExpected,
} from '../../../shared/types/scoring.types.js'

const ALLOWED_INTENT_LABELS = new Set<string>(PAIN_INTENT_EXPECTED_VALUES)

/**
 * Coerce une chaîne arbitraire vers un `PainIntentExpected | null`. Sécurise
 * la lecture DB face à un éventuel contournement de la contrainte CHECK.
 */
function coerceIntentLabel(value: unknown): PainIntentExpected | null {
  if (typeof value !== 'string') return null
  return ALLOWED_INTENT_LABELS.has(value) ? (value as PainIntentExpected) : null
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutocompleteSuggestion {
  text: string
  position: number
  query?: string
}

export interface PaaQuestion {
  question: string
  answer?: string | null
  depth?: number
  parentQuestion?: string
  match?: 'none' | 'partial' | 'total'
  matchQuality?: 'exact' | 'stem'
}

export interface KeywordMetrics {
  keyword: string
  lang: string
  country: string
  searchVolume: number | null
  keywordDifficulty: number | null
  cpc: number | null
  competition: number | null
  intentRaw: number | null
  /**
   * Label intent SERP issu de DataForSEO (`search_intent.keyword_intent.label`).
   * Croisé avec `articles.pain_intent_expected` pour le 5e signal Pertinence.
   * cf. FR-CAP-RELEVANCE-INTENT-SIGNAL.
   */
  intentLabel: PainIntentExpected | null
  autocompleteSuggestions: AutocompleteSuggestion[]
  autocompleteSource: 'google' | 'dataforseo' | null
  paaQuestions: PaaQuestion[]
  localAnalysis: unknown | null           // Sprint 15.5 — MapsResult shape
  contentGapAnalysis: unknown | null      // Sprint 15.5 — ContentGapAnalysis shape
  localComparison: unknown | null         // Sprint 15.5 — LocalNationalComparison shape
  fetchedAt: string
}

interface KeywordMetricsRow {
  keyword: string
  lang: string
  country: string
  search_volume: number | null
  keyword_difficulty: number | null
  cpc: string | null
  competition: string | null
  intent_raw: string | null
  intent_label: string | null
  autocomplete_suggestions: AutocompleteSuggestion[]
  autocomplete_source: string | null
  paa_questions: PaaQuestion[]
  local_analysis: unknown | null
  content_gap_analysis: unknown | null
  local_comparison: unknown | null
  fetched_at: Date
}

function rowToMetrics(row: KeywordMetricsRow): KeywordMetrics {
  return {
    keyword: row.keyword,
    lang: row.lang,
    country: row.country,
    searchVolume: row.search_volume,
    keywordDifficulty: row.keyword_difficulty,
    cpc: row.cpc !== null ? Number(row.cpc) : null,
    competition: row.competition !== null ? Number(row.competition) : null,
    intentRaw: row.intent_raw !== null ? Number(row.intent_raw) : null,
    intentLabel: coerceIntentLabel(row.intent_label),
    autocompleteSuggestions: row.autocomplete_suggestions ?? [],
    autocompleteSource: (row.autocomplete_source as KeywordMetrics['autocompleteSource']) ?? null,
    paaQuestions: row.paa_questions ?? [],
    localAnalysis: row.local_analysis,
    contentGapAnalysis: row.content_gap_analysis,
    localComparison: row.local_comparison,
    fetchedAt: row.fetched_at.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public API — CRUD
// ---------------------------------------------------------------------------

/**
 * Read the full metrics row for a keyword. Returns null on miss.
 */
export async function getKeywordMetrics(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<KeywordMetrics | null> {
  const res = await query<KeywordMetricsRow>(
    `SELECT keyword, lang, country, search_volume, keyword_difficulty, cpc, competition,
            intent_raw, intent_label, autocomplete_suggestions, autocomplete_source, paa_questions,
            local_analysis, content_gap_analysis, local_comparison, fetched_at
       FROM keyword_metrics
      WHERE keyword = $1 AND lang = $2 AND country = $3`,
    [keyword, lang, country],
  )
  return res.rows[0] ? rowToMetrics(res.rows[0]) : null
}

/**
 * Upsert ONLY the KPI fields (volume, KD, CPC, competition, intent_raw, intent_label).
 * Leaves autocomplete and PAA untouched.
 */
export async function upsertKeywordKpis(
  keyword: string,
  kpis: {
    searchVolume?: number | null
    keywordDifficulty?: number | null
    cpc?: number | null
    competition?: number | null
    intentRaw?: number | null
    /** Label intent SERP DataForSEO (FR-CAP-RELEVANCE-INTENT-SIGNAL). */
    intentLabel?: PainIntentExpected | null
  },
  lang: string = 'fr',
  country: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics
       (keyword, lang, country, search_volume, keyword_difficulty, cpc, competition, intent_raw, intent_label, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (keyword, lang, country) DO UPDATE
       SET search_volume = COALESCE(EXCLUDED.search_volume, keyword_metrics.search_volume),
           keyword_difficulty = COALESCE(EXCLUDED.keyword_difficulty, keyword_metrics.keyword_difficulty),
           cpc = COALESCE(EXCLUDED.cpc, keyword_metrics.cpc),
           competition = COALESCE(EXCLUDED.competition, keyword_metrics.competition),
           intent_raw = COALESCE(EXCLUDED.intent_raw, keyword_metrics.intent_raw),
           intent_label = COALESCE(EXCLUDED.intent_label, keyword_metrics.intent_label),
           fetched_at = NOW()`,
    [
      keyword, lang, country,
      kpis.searchVolume ?? null,
      kpis.keywordDifficulty ?? null,
      kpis.cpc ?? null,
      kpis.competition ?? null,
      kpis.intentRaw ?? null,
      kpis.intentLabel ?? null,
    ],
  )
}

export async function upsertKeywordAutocomplete(
  keyword: string,
  suggestions: AutocompleteSuggestion[],
  source: 'google' | 'dataforseo',
  lang: string = 'fr',
  country: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics
       (keyword, lang, country, autocomplete_suggestions, autocomplete_source, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
     ON CONFLICT (keyword, lang, country) DO UPDATE
       SET autocomplete_suggestions = EXCLUDED.autocomplete_suggestions,
           autocomplete_source = EXCLUDED.autocomplete_source,
           fetched_at = NOW()`,
    [keyword, lang, country, JSON.stringify(suggestions), source],
  )
}

export async function upsertKeywordPaa(
  keyword: string,
  questions: PaaQuestion[],
  lang: string = 'fr',
  country: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics
       (keyword, lang, country, paa_questions, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (keyword, lang, country) DO UPDATE
       SET paa_questions = EXCLUDED.paa_questions,
           fetched_at = NOW()`,
    [keyword, lang, country, JSON.stringify(questions)],
  )
}

/** Sprint 15.5 — Local SEO maps analysis stored on keyword_metrics. */
export async function upsertKeywordLocalAnalysis(
  keyword: string,
  analysis: unknown,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics (keyword, lang, country, local_analysis, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (keyword, lang, country) DO UPDATE
       SET local_analysis = EXCLUDED.local_analysis,
           fetched_at = NOW()`,
    [keyword, lang, country, JSON.stringify(analysis)],
  )
}

/** Sprint 15.5 — Content gap analysis stored on keyword_metrics. */
export async function upsertKeywordContentGap(
  keyword: string,
  analysis: unknown,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics (keyword, lang, country, content_gap_analysis, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (keyword, lang, country) DO UPDATE
       SET content_gap_analysis = EXCLUDED.content_gap_analysis,
           fetched_at = NOW()`,
    [keyword, lang, country, JSON.stringify(analysis)],
  )
}

/** Sprint 15.5 — Local vs national comparison stored on keyword_metrics. */
export async function upsertKeywordLocalComparison(
  keyword: string,
  comparison: unknown,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics (keyword, lang, country, local_comparison, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (keyword, lang, country) DO UPDATE
       SET local_comparison = EXCLUDED.local_comparison,
           fetched_at = NOW()`,
    [keyword, lang, country, JSON.stringify(comparison)],
  )
}

/**
 * Freshness check (TTL 7 days by default).
 */
export function isKeywordMetricsFresh(fetchedAt: string | Date | null | undefined, ttlDays: number = 7): boolean {
  if (!fetchedAt) return false
  const ts = typeof fetchedAt === 'string' ? new Date(fetchedAt).getTime() : fetchedAt.getTime()
  return Date.now() - ts < ttlDays * 24 * 60 * 60 * 1000
}

export async function deleteKeywordMetrics(keyword: string, lang: string = 'fr', country: string = 'fr'): Promise<void> {
  await query(
    `DELETE FROM keyword_metrics WHERE keyword = $1 AND lang = $2 AND country = $3`,
    [keyword, lang, country],
  )
  log.info(`keyword-metrics: deleted "${keyword}" (${lang}/${country})`)
}
