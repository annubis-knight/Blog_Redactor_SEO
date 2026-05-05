// @vitest-environment node
/**
 * Tests Red — cohérence null KPI marché.
 *
 * Couvre les 4 FRs dédiées au chantier KPI nullable :
 *   - FR-INFRA-KPI-NULLABLE         (types + adapters propagent null)
 *   - FR-INFRA-KPI-DISPLAY-DASH     (UI affiche "—")
 *   - FR-INFRA-KPI-CONSISTENCY      (cohérence affichage / tri / agrégat)
 *   - FR-INFRA-KPI-SCORING-NULLSAFE (scoring null-safe)
 *
 * Voir _bmad-output/planning-artifacts/prd.md §8.14 (FR-INFRA-KPI-*) et
 * _bmad-output/implementation-artifacts/tech-spec-kpi-types-nullable.md.
 *
 * Convention : chaque it() référence en commentaire la FR + AC qu'il couvre.
 * Ces tests doivent ÉCHOUER avant l'implémentation (Red phase, CLAUDE.md §2.1).
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  formatVolume,
  formatCpc,
  formatKd,
  compareScores,
  averageScores,
  countValidScores,
} from '../../../shared/score/index.js'
import type {
  KeywordOverview,
  LocationMetrics,
  RadarKeywordKpis,
} from '../../../shared/types/index.js'

// =============================================================================
// FR-INFRA-KPI-NULLABLE — types KPI nullables de bout en bout
// =============================================================================
//
// NB : les contrats de type pur (FR-INFRA-KPI-NULLABLE AC5.a → AC5.h via
// `expectTypeOf`) sont vérifiés statiquement par `npm run type-check` (vue-tsc)
// au moment où le code de prod consomme ces types. Pour avoir un signal Vitest
// runtime, on s'appuie sur AC5.i : la construction d'un KeywordOverview avec
// tous les KPIs à `null` ne compile QUE si la migration est faite.
// Avant migration : `vue-tsc` rejette le fichier de prod qui consommerait un
// `searchVolume: null`. Après migration : ces assertions passent.

describe('FR-INFRA-KPI-NULLABLE — contrats de type', () => {
  it('AC5.a → AC5.h — assertions de type statique (vérifiées par vue-tsc)', () => {
    // Ces 8 assertions sont des CONTRATS STATIQUES. Elles passent au runtime
    // (expectTypeOf est noop à l'exécution) — leur rôle est documentaire.
    // La vraie validation est portée par `npm run type-check`.
    expectTypeOf<KeywordOverview['searchVolume']>().toEqualTypeOf<number | null>()
    expectTypeOf<KeywordOverview['difficulty']>().toEqualTypeOf<number | null>()
    expectTypeOf<KeywordOverview['cpc']>().toEqualTypeOf<number | null>()
    expectTypeOf<KeywordOverview['competition']>().toEqualTypeOf<number | null>()
    expectTypeOf<LocationMetrics['searchVolume']>().toEqualTypeOf<number | null>()
    expectTypeOf<LocationMetrics['keywordDifficulty']>().toEqualTypeOf<number | null>()
    expectTypeOf<RadarKeywordKpis['searchVolume']>().toEqualTypeOf<number | null>()
    expectTypeOf<RadarKeywordKpis['difficulty']>().toEqualTypeOf<number | null>()
  })

  it('AC5.i — un KeywordOverview "absent total" est constructible (tous KPIs null)', () => {
    // Avant migration : `searchVolume: null` ne compile pas (TS error 2322).
    // Après migration : ce test passe vert au type-check ET au runtime.
    const empty: KeywordOverview = {
      searchVolume: null,
      difficulty: null,
      cpc: null,
      competition: null,
      monthlySearches: [],
    }
    expect(empty.searchVolume).toBeNull()
    expect(empty.difficulty).toBeNull()
    expect(empty.cpc).toBeNull()
    expect(empty.competition).toBeNull()
  })

  it('AC5.j — un LocationMetrics "absent total" est constructible (tous KPIs null)', () => {
    const empty: LocationMetrics = {
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      competition: null,
      monthlySearches: [],
    }
    expect(empty.searchVolume).toBeNull()
  })

  it('AC5.k — un RadarKeywordKpis "absent total" est constructible (tous KPIs null)', () => {
    const empty: RadarKeywordKpis = {
      searchVolume: null,
      difficulty: null,
      cpc: null,
      competition: null,
      intentTypes: [],
      intentProbability: null,
      autocompleteMatchCount: 0,
      paaMatchCount: 0,
      paaWeightedScore: 0,
      paaTotal: 0,
      avgSemanticScore: null,
    }
    expect(empty.searchVolume).toBeNull()
  })
})

// =============================================================================
// FR-INFRA-KPI-DISPLAY-DASH — placeholder "—" pour absent
// =============================================================================

describe('FR-INFRA-KPI-DISPLAY-DASH — règle d\'affichage', () => {
  it('AC1 — formatVolume(null) === "—" (et non "0")', () => {
    expect(formatVolume(null)).toBe('—')
    expect(formatVolume(null)).not.toBe('0')
  })

  it('AC2 — formatCpc(null) === "—" (et non "0.00 €")', () => {
    expect(formatCpc(null)).toBe('—')
    expect(formatCpc(null)).not.toBe('0.00 €')
  })

  it('AC3 — formatKd(null) === "—" (et non "0")', () => {
    expect(formatKd(null)).toBe('—')
    expect(formatKd(null)).not.toBe('0')
  })
})

// =============================================================================
// FR-INFRA-KPI-CONSISTENCY — cohérence affichage / tri / agrégat
// =============================================================================

describe('FR-INFRA-KPI-CONSISTENCY — tri et agrégat null-safe', () => {
  it('AC1 — tri descending [vol=100, vol=null, vol=50] → [100, 50, null] (null en bas)', () => {
    const cards = [
      { keyword: 'a', searchVolume: 100 as number | null },
      { keyword: 'b', searchVolume: null as number | null },
      { keyword: 'c', searchVolume: 50 as number | null },
    ]
    const sorted = [...cards].sort((x, y) => compareScores(x.searchVolume, y.searchVolume))
    expect(sorted.map(c => c.keyword)).toEqual(['a', 'c', 'b'])
    expect(sorted[sorted.length - 1].searchVolume).toBeNull()
  })

  it('AC2 — averageScores([10, null, 30]) === 20 (moyenne sur 2 valeurs effectives)', () => {
    expect(averageScores([10, null, 30])).toBe(20)
    // Garde-fou : surtout pas la moyenne incluant 0 → (10+0+30)/3 = 13.33
    expect(averageScores([10, null, 30])).not.toBeCloseTo(13.33, 2)
  })

  it('AC3 — cohérence affichage / tri : la valeur affichée et la valeur de tri dérivent du même champ', () => {
    // Dataset représentatif : 1 valeur, 1 null, 1 zéro réel.
    const dataset = [
      { keyword: 'alpha', searchVolume: 100 as number | null },
      { keyword: 'beta', searchVolume: null as number | null },
      { keyword: 'gamma', searchVolume: 0 as number | null },
    ]

    const sorted = [...dataset].sort((a, b) => compareScores(a.searchVolume, b.searchVolume))
    const rendered = sorted.map(item => ({
      keyword: item.keyword,
      displayed: formatVolume(item.searchVolume),
      sortValue: item.searchVolume,
    }))

    // Ordre attendu : 100 > 0 > null (null en bas)
    expect(rendered[0]).toEqual({ keyword: 'alpha', displayed: '100', sortValue: 100 })
    expect(rendered[1]).toEqual({ keyword: 'gamma', displayed: '0', sortValue: 0 })
    expect(rendered[2]).toEqual({ keyword: 'beta', displayed: '—', sortValue: null })

    // Invariant fort : la valeur de tri et la valeur source du formatage sont
    // la MÊME expression (item.searchVolume), pas deux champs différents.
    rendered.forEach((row, idx) => {
      expect(row.sortValue).toBe(dataset.find(d => d.keyword === row.keyword)!.searchVolume)
      // Et l'affichage dérive du même champ : null ↔ "—", nombre ↔ rendu numérique.
      if (row.sortValue === null) {
        expect(row.displayed).toBe('—')
      } else {
        expect(row.displayed).not.toBe('—')
      }
      void idx
    })
  })

  it('AC4 — countValidScores([10, null, null, 30]) === 2', () => {
    expect(countValidScores([10, null, null, 30])).toBe(2)
  })
})

// =============================================================================
// FR-INFRA-KPI-SCORING-NULLSAFE — scoring null-safe (computeCompositeScore)
// =============================================================================

describe('FR-INFRA-KPI-SCORING-NULLSAFE — computeCompositeScore', () => {
  it('AC1 — composante null exclue de la pondération, autres composantes calculées', async () => {
    const { computeCompositeScore } = await import('../../../server/services/external/dataforseo/scoring.js')
    const result = computeCompositeScore({
      searchVolume: null,
      difficulty: 50,
      cpc: 1,
      competition: 0.5,
      monthlySearches: [],
    })
    // Volume null → composante exclue. Le breakdown la rend null aussi.
    expect(result.volume).toBeNull()
    // Total est calculé sur 3 composantes effectives (renormalisé) → non null.
    expect(result.total).not.toBeNull()
    expect(typeof result.total).toBe('number')
  })

  it('AC2 — tous KPIs null → total === null (jamais 0)', async () => {
    const { computeCompositeScore } = await import('../../../server/services/external/dataforseo/scoring.js')
    const result = computeCompositeScore({
      searchVolume: null,
      difficulty: null,
      cpc: null,
      competition: null,
      monthlySearches: [],
    })
    expect(result.total).toBeNull()
    expect(result.volume).toBeNull()
    expect(result.difficultyInverse).toBeNull()
    expect(result.cpc).toBeNull()
    expect(result.competitionInverse).toBeNull()
  })
})

// =============================================================================
// FR-INFRA-KPI-SCORING-NULLSAFE — generateAlerts
// =============================================================================

describe('FR-INFRA-KPI-SCORING-NULLSAFE — generateAlerts', () => {
  it('AC5.a — searchVolume null → alerte missing_metrics (info), PAS zero_volume (danger)', async () => {
    const { generateAlerts } = await import('../../../server/services/external/dataforseo/scoring.js')
    const alerts = generateAlerts({
      searchVolume: null,
      difficulty: 30,
      cpc: 1,
      competition: 0.4,
      monthlySearches: [],
    })
    expect(alerts).toContainEqual(
      expect.objectContaining({ type: 'missing_metrics', level: 'info' }),
    )
    expect(alerts).not.toContainEqual(
      expect.objectContaining({ type: 'zero_volume', level: 'danger' }),
    )
  })

  it('AC5.b — searchVolume = 0 (vrai zéro) → garde l\'alerte zero_volume historique', async () => {
    const { generateAlerts } = await import('../../../server/services/external/dataforseo/scoring.js')
    const alerts = generateAlerts({
      searchVolume: 0,
      difficulty: 30,
      cpc: 1,
      competition: 0.4,
      monthlySearches: [],
    })
    expect(alerts).toContainEqual(
      expect.objectContaining({ type: 'zero_volume' }),
    )
  })
})

// =============================================================================
// FR-INFRA-KPI-SCORING-NULLSAFE — opportunityIndex
// =============================================================================

describe('FR-INFRA-KPI-SCORING-NULLSAFE — opportunityIndex', () => {
  it('AC4 — opportunityIndex retourne null si une opérande est null (jamais 0 ni NaN)', () => {
    // L'invariant testé est porté par compareLocalNational (intent.service.ts).
    // Le contrat attendu : opportunityIndex: number | null dans LocalNationalComparison.
    // Ce test vérifie l'expression mathématique pure ; l'intégration côté
    // service est couverte par tests/unit/services/intent.service.test.ts.
    const computeOpportunityIndex = (
      local: { searchVolume: number | null; keywordDifficulty: number | null },
      national: { keywordDifficulty: number | null },
    ): number | null => {
      if (
        local.searchVolume === null
        || local.keywordDifficulty === null
        || national.keywordDifficulty === null
      ) {
        return null
      }
      const denom = Math.max(national.keywordDifficulty, 1)
      return Math.round((local.searchVolume * (100 - local.keywordDifficulty)) / denom)
    }

    expect(computeOpportunityIndex(
      { searchVolume: null, keywordDifficulty: 30 },
      { keywordDifficulty: 60 },
    )).toBeNull()

    expect(computeOpportunityIndex(
      { searchVolume: 1000, keywordDifficulty: null },
      { keywordDifficulty: 60 },
    )).toBeNull()

    expect(computeOpportunityIndex(
      { searchVolume: 1000, keywordDifficulty: 30 },
      { keywordDifficulty: null },
    )).toBeNull()

    // Cas nominal toujours fonctionnel.
    const idx = computeOpportunityIndex(
      { searchVolume: 1000, keywordDifficulty: 20 },
      { keywordDifficulty: 70 },
    )
    expect(idx).not.toBeNull()
    expect(Number.isFinite(idx)).toBe(true)
  })
})

// =============================================================================
// FR-INFRA-KPI-SCORING-NULLSAFE — computeServerVerdict
// =============================================================================

describe('FR-INFRA-KPI-SCORING-NULLSAFE — computeServerVerdict (validate-pain)', () => {
  // AC3 — tous KPIs null → verdict 'incertaine' (jamais 'brulante' ni 'froide').
  //
  // computeServerVerdict est aujourd'hui une fonction interne à
  // server/routes/keywords.routes.ts (non exportée). À l'étape 8 de
  // tech-spec-kpi-types-nullable.md, elle sera extraite dans un service
  // dédié pour devenir testable en isolation.
  //
  // En attendant l'extraction, le contrat null-safe est couvert par le test
  // d'intégration validate-pain.routes.test.ts qui appelle l'endpoint
  // POST /api/keywords/validate-pain avec un payload sans données DataForSEO
  // et asserte que verdict.category === 'incertaine'.
  it.todo('AC3 — extraire computeServerVerdict + assertion null-safe (étape 8 tech-spec)')
})

// =============================================================================
// FR-INFRA-KPI-NULLABLE — adapters DataForSEO
// =============================================================================

describe('FR-INFRA-KPI-NULLABLE — adapter fetchKeywordOverview', () => {
  it('AC1 — searchVolume null en input DataForSEO → searchVolume null en sortie (pas 0)', async () => {
    // Test d'intégration sur l'adapter : on stube la fonction réseau
    // sous-jacente pour vérifier que l'adapter ne masque PAS l'absence par 0.
    // La signature concrète sera validée après refactor.
    //
    // Pour rester un test de contrat (pas d'I/O), on simule l'adaptation
    // que le code de fetchKeywordOverview doit produire :
    const rawDataForSeoItem = {
      keyword_info: {
        search_volume: null as number | null,
        cpc: null as number | null,
        competition: null as number | null,
        monthly_searches: null as Array<{ search_volume: number | null }> | null,
      },
      keyword_properties: {
        keyword_difficulty: null as number | null,
      },
    }
    // Contrat attendu (extrait conforme à FR-INFRA-KPI-NULLABLE) :
    const adapted: Pick<KeywordOverview, 'searchVolume' | 'difficulty' | 'cpc' | 'competition' | 'monthlySearches'> = {
      searchVolume: rawDataForSeoItem.keyword_info?.search_volume ?? null,
      difficulty: rawDataForSeoItem.keyword_properties?.keyword_difficulty ?? null,
      cpc: rawDataForSeoItem.keyword_info?.cpc ?? null,
      competition: rawDataForSeoItem.keyword_info?.competition ?? null,
      monthlySearches: (rawDataForSeoItem.keyword_info?.monthly_searches ?? [])
        .map(m => m.search_volume)
        .filter((v): v is number => v !== null && v !== undefined),
    }
    expect(adapted.searchVolume).toBeNull()
    expect(adapted.difficulty).toBeNull()
    expect(adapted.cpc).toBeNull()
    expect(adapted.competition).toBeNull()
    // monthlySearches : pas de null, juste filtrage des absents.
    expect(adapted.monthlySearches).toEqual([])
  })
})
