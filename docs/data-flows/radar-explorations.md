---
name: radar-explorations
description: Flux complet d'exploration Radar (scan bimodal + suggestions longue-traîne) — table article-scoped stockant cards racines, suggestions IA et sélections utilisateur dans un JSONB.
type: "{ seed: string, context: RadarExplorationContext, generatedKeywords: RadarKeyword[], scanResult: KeywordRadarScanResult & { longTailSuggestions?: LongTailSuggestion[], longTailSelectedKeywords?: string[] } }"
last_updated: 2026-05-05
related_fr: [FR-RAD-PERSIST, FR-RAD-LONGTAIL-GENERATE, FR-RAD-LONGTAIL-UI, FR-RAD-LONGTAIL-REGENERATE, FR-RAD-SEND-CAPTAIN, FR-RAD-SCORING-BIMODAL, FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-SCORING-NULLSAFE]
---

# Data Flow — radar-explorations

> **Description métier :** Table PostgreSQL article-scoped (clé primaire = `article_id`) contenant les résultats d'une exploration Radar complète : mots-clés générés par l'IA, résultats du scan (cards racines avec KPIs bimodaux + PAA), suggestions longue-traîne générées, et sélections persistées par l'utilisateur.
> **Type/format :** PostgreSQL JSONB persistant. Schéma = `RadarExploration` avec sous-structures `RadarExplorationContext`, `KeywordRadarScanResult` enrichie de `longTailSuggestions[]` et `longTailSelectedKeywords[]`.

## Producteurs

Qui crée ou met à jour cette donnée :

### Phase ① — Génération de keywords (IA)
- **Endpoint** `POST /api/keywords/radar/generate` ([server/routes/intent-scan.routes.ts:33-63](../../server/routes/intent-scan.routes.ts)) — reçoit `{ title, keyword, painPoint, cocoonSlug? }`, appelle `generateRadarKeywords()`, renvoie ~20 keywords avec reasoning.
- **Service** `generateRadarKeywords()` ([server/services/keyword/keyword-radar.service.ts:41-127](../../server/services/keyword/keyword-radar.service.ts)) — orchestre l'appel IA (Haiku) via `classifyWithTool`, déduplique, remplace les mots-clés en front.

### Phase ② — Scan des keywords (PAA + KPIs + Scoring bimodal)
- **Endpoint** `POST /api/keywords/radar/scan` ([server/routes/intent-scan.routes.ts:65-96](../../server/routes/intent-scan.routes.ts)) — reçoit `{ broadKeyword, specificTopic, keywords[], depth, painPoint? }`, appelle `scanRadarKeywords()`, produit `KeywordRadarScanResult` avec cards triées.
- **Service** `scanRadarKeywords()` ([server/services/keyword/keyword-radar.service.ts:208-485](../../server/services/keyword/keyword-radar.service.ts)) — pipeline 2 passes :
  - Fetch parallèle : Autocomplete (specificTopic), Keyword Overview batch, Intent batch, PAA depth 1-2 avec cache `paa-cache.service.ts`.
  - Calcul scoring bimodal : `computeMarketScore()` (`shared/scoring-kpi.ts`) + `computeRelevanceScore()` (`shared/scoring.ts`) **dans une même card**, éventuellement `null` si pas de painPoint.
  - Encodage sémantique des PAA items et alignement painPoint via `computeSemanticScores()` (embedding).
  - Tri par `combinedScore desc` (legacy, conservé pour compatibilité JSONB persisté).
  - Édition du `KeywordRadarScanResult` complet avec `cards[]`, `globalScore`, `heatLevel`.
- **Persistance** `saveRadarExploration()` ([server/services/infra/radar-exploration.service.ts:105-137](../../server/services/infra/radar-exploration.service.ts)) — UPSERT PostgreSQL, écrase la row existante ou crée si n'existe pas, stocke le scan en JSONB.

### Phase ③ — Génération de suggestions longue-traîne (IA optionnelle)
- **Endpoint** `POST /api/articles/:id/radar-exploration/long-tail` ([server/routes/long-tail-suggest.routes.ts:24-58](../../server/routes/long-tail-suggest.routes.ts)) — reçoit `{ radarKeywords[], articleTitle, articlePainPoint, strategyContext }`, appelle `generateLongTailSuggestions()`.
- **Service** `generateLongTailSuggestions()` ([server/services/keyword/long-tail-suggest.service.ts:59-158](../../server/services/keyword/long-tail-suggest.service.ts)) — pipeline :
  - Validation Zod du request.
  - Génération déterministe de candidates via `combineRoots()` (dérivées des keywords racines).
  - Consultation `api_cache` (clé = hash des inputs, TTL 7j).
  - Si miss : prompt IA (`radar-long-tail-suggest.md`) → `classifyWithTool` → Zod validation stricte.
  - Persistance JSONB `longTailSuggestions[]` et optionnellement `longTailSelectedKeywords[]` via `persistLongTailSuggestions()`.
  - Cache TTL 7j.
- **Service** `persistLongTailSuggestions()` ([server/services/infra/radar-exploration.service.ts:161-210](../../server/services/infra/radar-exploration.service.ts)) — merge JSONB intelligent : préserve les `cards[]` existants, écrase/ajoute les `longTailSuggestions[]`, merge ou overwrite `longTailSelectedKeywords[]`.

### Phase ④ — Persistance des sélections (toggle UI)
- **Endpoint** `PATCH /api/articles/:id/radar-exploration/long-tail/selection` ([server/routes/long-tail-suggest.routes.ts:65-90](../../server/routes/long-tail-suggest.routes.ts)) — reçoit `{ selectedKeywords[] }`, appelle `persistLongTailSelection()`.
- **Composable** `useLongTailSuggestions()` ([src/composables/intent/useLongTailSuggestions.ts:113-135](../../src/composables/intent/useLongTailSuggestions.ts)) — toggle local + debounce 500ms avant PATCH.
- **Service** `persistLongTailSelection()` ([server/services/keyword/long-tail-suggest.service.ts:165-178](../../server/services/keyword/long-tail-suggest.service.ts)) — upsert `longTailSelectedKeywords[]` in-place sans toucher aux suggestions.

## Persistance

**Autorité unique** : `radar_explorations` (PostgreSQL, article-scoped, clé primaire `article_id`).

### Structure PostgreSQL
- **Table** `radar_explorations(article_id INT PRIMARY KEY, seed TEXT, broad_keyword, specific_topic, pain_point, depth, generated_keywords JSONB, scan_result JSONB, scanned_at TIMESTAMP)`.
- **Colonne `scan_result` JSONB** — contient la structure complète :
  ```typescript
  {
    specificTopic: string,
    broadKeyword: string,
    autocomplete: { suggestions[], totalCount },
    cards: RadarCard[], // Racines + longues-traînes (source:'radar' | 'longtail')
    globalScore: number,
    heatLevel: 'brulante' | 'chaude' | 'tiede' | 'froide',
    verdict: string,
    scannedAt: string,
    // Depuis S2 (2026-05-03) :
    longTailSuggestions?: LongTailSuggestion[],    // Top ~10 suggestions IA
    longTailSelectedKeywords?: string[]             // Sélection persistée par l'utilisateur
  }
  ```

### Caches annexes
- **`api_cache(type='long-tail-suggest', key=SHA256(...), value, ttl_ms)`** — cache de la réponse IA longue-traîne (7j TTL). Clé = hash(articleTitle + articlePainPoint + sorted_radarKeywords + strategyContext). Idempotence à la régénération.
- **`paa_cache(keyword, paaItems[], depth, cachedAt)`** — cache des questions PAA brutes par keyword, récupérées via DataForSEO SERP API.

## Consommateurs

### Affichage (UI)

- [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — rendu d'une card Radar (racine ou longue-traîne), mode `'kpi' | 'relevance'` :
  - Mode `'kpi'` : affiche `computeKpiScore(card.kpis, level).total` (recalcul front). Pas de fallback `combinedScore`.
  - Mode `'relevance'` : affiche `card.relevanceScore?.total ?? null` (strict, pas de fallback). Peut être `null` si pas de painPoint ou pas de signaux lexicaux.
  - Pour longues-traînes (`source:'longtail'`) : `kpis: null` par construction → affichage neutre `—` (pas d'arc score KPI).
  - **Particularité 2026-05-04** : tooltip aide utilisateur à diagnostiquer absence de score Pertinence (painPoint manquant vs signaux nuls).
  
- [src/components/intent/RadarLongTailSuggestions.vue](../../src/components/intent/RadarLongTailSuggestions.vue) — section optionnelle (si `radarCards.length >= 2`) :
  - Affichage liste triée par `preferenceScore desc`.
  - Checkbox par suggestion.
  - Badge score sur 10.
  - Rationale IA.
  - Badges sources racines.
  - Bouton « ✨ Suggérer » au premier appel, remplacé par « ⟳ Régénérer » après succès.

- [src/components/moteur/DiscoveryPanel.vue](../../src/components/moteur/DiscoveryPanel.vue) — tab ① Découverte (source utilisateur), n'affiche pas directement le Radar mais émet `send-to-radar` pour transition.

### Calcul / tri / filtre / agrégat

- **Tri Radar cards** — utilise `compareScores()` ([shared/score/compare.ts](../../shared/score/compare.ts)) :
  - Mode `'kpi'` : compare `kpiBreakdown.total` (recalculé front depuis `kpis`).
  - Mode `'relevance'` : compare `relevanceScore.total` (peut être `null` → en bas, jamais 0).
  - Longues-traînes (`kpis:null`) : excluent du tri par KPI (elles vont naturellement en bas).
  
- **Tri longues-traînes** — utilise `preferenceScore desc` (tri décroissant strict, ties cassés par `keyword` alpha) dans `useLongTailSuggestions::sortDesc()`.

- **Pré-cochage longues-traînes** — au premier appel `generate()`, top 5 par `preferenceScore desc` via `precheckTopN()`.

- **Agrégation défaillance à l'envoi Capitaine** — dans `MoteurView.handleCardsSelected()` ([src/views/MoteurView.vue:424-428](../../src/views/MoteurView.vue)) et `DouleurIntentScanner.sendToCaptain()` :
  - Cards racines cochées : `Set<RadarCard>` filtrées par prop `selected`.
  - Longues-traînes cochées : `Set<string>` récupérées via `composable.selectedKeywords`.
  - Dédup par `keyword.toLowerCase().trim()` — les longues-traînes **non** dans `cards[]` ajoutent des items synthétiques avec `source:'longtail'`, `kpis:null`.
  - Cas tordu : si une longue-traîne génère accidentellement le même keyword qu'une racine cochée → **garde la racine** (KPIs présents).

- **Scoring relevance** — pour une card Radar qui a du `painPoint` :
  - `computeRelevanceScore()` ([shared/scoring.ts:165-250](../../shared/scoring.ts)) — pondération Pain 30 / PAA×douleur 25 / AC×douleur 15 / Racines 20 / Intent×douleur 10.
  - Entrées depuis card : `painAlignmentScore`, `paaPainAlignmentAvg`, `autocompletePainAlignmentAvg`, `rootsAverageScore` (null pour Radar).
  - Résultat `null` si aucun signal exploitable.

> **Règle de cohérence affichage / calcul** — Le score affiché sur le cercle (affichage) et le score utilisé pour `compareScores()` au tri **DOIVENT venir du même calcul** :
> - Mode KPI : `computeKpiScore(card.kpis, articleLevel)` recalculé front. **Jamais** combiner avec `combinedScore`.
> - Mode Relevance : `card.relevanceScore?.total` (peut être `null`). **Jamais** utiliser un fallback ou 0 au tri.
> - Longues-traînes : `preferenceScore` (score IA 1-10) pour le tri propre, distinct des deux scores bimodaux.

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque de divergence |
|---|---|---|---|
| **Premier scan Radar** | — | POST generate → POST scan → saveRadarExploration | Faible si POST atomique. |
| **Reload article — restoration des cards racines** | `radar_explorations.scan_result.cards[]` | Aucune (sauf TTL expiré > 7j) | **Risque** : si `marketScore` ou `relevanceScore` sont recalculés au reload (formules changées, painPoint changé), les scores affichés divergent du premier load. **Mitigation** : stocker les scores dans JSONB, pas les recalculer. |
| **Reload article — restoration des longues-traînes** | `radar_explorations.scan_result.longTailSuggestions[]` + `longTailSelectedKeywords[]` | Aucune (sauf régénération) | **Risque** : si la section composant appelle `hydrate()` avec des données stale du cache. **Mitigation** : `useLongTailSuggestions` hydrate au mount si props fournis, puis ignore les changements de props. |
| **Régénération longue-traîne (utilisateur clique « Régénérer »)** | `api_cache` miss → IA appel | Cache HIT (si inputs inchangés) → response identique | **Risque** : inputs triés non-déterministe (ordre des keywords) → cache key diverge. **Mitigation** : normalisation + tri alpha obligatoires en `computeCacheKey()` ([long-tail-suggest.service.ts:184-198](../../server/services/keyword/long-tail-suggest.service.ts)). |
| **Toggle checkbox longue-traîne** | UI local Set | Debounce 500ms → PATCH persistance DB | **Risque** : pendant les 500ms, si utilisateur recharge, perd la sélection en-cours. **Mitigation** : debounce est best-effort, cible UX acceptable (5s de latence max avant sync). |
| **Switch article** | Restaure depuis DB article N | Écriture pour article N | Faible : clé primaire article_id isole les articles. |
| **Envoi unifié Capitaine (fusion cards + longues-traînes)** | `radarCards[]` + `selectedKeywords[]` | Upsert `captain_explorations` avec `source` col. | **Risque** : dédup incomplète si keyword variant (casse, trim, diacritiques). **Mitigation** : normalisation canonique `keyword.toLowerCase().trim()` stricte. |
| **Cas — keyword identity (racine = longue-traîne accidentelle)** | Si longue-traîne retourne exactement keyword d'une racine | Fusion dédup avant emit | **Risque** : quelle version garder ? **Décision** : garder la racine (source='radar', kpis présents), perdre la longue-traîne (source='longtail', kpis null). **Raison** : racine = données primaires scanrisées, longue-traîne = donnée dérivée. |

## Diagramme

```mermaid
flowchart TD
    subgraph Producteurs["Producteurs"]
        AI["IA — generateRadarKeywords<br/>intent-scan.routes.ts:33"]
        Scan["Scan 2 passes — scanRadarKeywords<br/>keyword-radar.service.ts:208"]
        DF["DataForSEO + Embedding :<br/>Autocomplete / KPI / Intent / PAA / Semantic"]
        LT["IA — generateLongTailSuggestions<br/>long-tail-suggest.routes.ts:24"]
        Combo["Combinator — combineRoots<br/>long-tail-combinator.service.ts"]
        ToggleLT["Toggle UI — toggle()<br/>useLongTailSuggestions:113"]
    end

    subgraph Persistance["Persistance (PostgreSQL)"]
        DB["radar_explorations<br/>article_id PK | JSONB scan_result"]
        AC["api_cache<br/>key=SHA256(inputs) | TTL 7d"]
        PAAC["paa_cache<br/>keyword → PAA items | TTL implicit"]
    end

    subgraph Consommateurs["Consommateurs"]
        Radar["RadarKeywordCard.vue<br/>mode='kpi'|'relevance'"]
        LTComp["RadarLongTailSuggestions.vue<br/>affichage + checkbox"]
        Tri["compareScores()<br/>shared/score/compare.ts"]
        Agg["Agrégation CTA<br/>MoteurView.handleCardsSelected"]
        Cap["CaptainPanel.vue<br/>radarCards prop"]
    end

    AI -->|POST /radar/generate| Scan
    Scan -->|POST /radar/scan| DB
    DF -->|fetch parallel| Scan
    Combo -->|local deterministic| LT
    AC -->|SHA256 lookup| LT
    LT -->|IA + POST /long-tail| DB
    ToggleLT -->|PATCH /long-tail/selection| DB
    
    DB -->|scan_result.cards[]| Radar
    DB -->|scan_result.longTailSuggestions[]| LTComp
    DB -->|scan_result.longTailSelectedKeywords[]| LTComp
    
    Radar -->|card.marketScore / card.relevanceScore| Tri
    Radar -->|card| Agg
    LTComp -->|selectedKeywords| Agg
    Agg -->|cards[] merged + dedup| Cap
    
    LTComp -->|suggestions: LongTailSuggestion[]| LTComp
    Tri -->|sorted| Radar

    classDef persistence fill:#e8f4f8,stroke:#0284c7,color:#000
    classDef calc fill:#fee,stroke:#c66,color:#000
    class DB,AC,PAAC persistence
    class Tri,Agg calc
```

## Régressions historiques

- **2026-05-03 (sprint radar-long-tail)** — Avant cette date, les cards Radar ne stockaient que `cards[]`. Ajout de `longTailSuggestions[]` et `longTailSelectedKeywords[]` dans le JSONB `scan_result`. Schéma rétrocompatible : champs optionnels.
- **2026-05-02 (sprint score-bimodal)** — Avant, un seul score `combinedScore` (hybride marché+pertinence). Risque : fallback silencieux masquait l'absence d'un signal. Refactor : cards embarquent maintenant `marketScore` et `relevanceScore` (tous deux peuvent être `null` séparément). Pour longues-traînes, `kpis:null` **explicite** (pas de fallback combinedScore).
- **Côté longues-traînes — identité avec racines** — Pas de régression connue, mais cas à surveiller : si l'IA génère un keyword identique à une racine, la dédup doit garder la racine (données primaires).
- **Côté persistance — toggle selection** — Debounce 500ms = best-effort (pas de garantie si reload immédiat). Acceptable UX, documenté dans composable.
- **2026-05-05 (KPI nullable)** — `RadarKeywordKpis.searchVolume / difficulty / cpc / competition` passent à `number | null`. `computeKpiScore` (shared/scoring-kpi.ts) renormalise sur les composantes effectives (rawLabel !== '—') au lieu de pondérer un faux `0`. Adapter `keyword-radar.service.ts` propage `null` depuis `KeywordOverview` plutôt que `?? 0`. **Compat payloads JSONB persistés** : les anciens scans avec KPIs en `0` restent valides (≠ `null`), interprétés comme « scan ancien sans data ». Voir FR-INFRA-KPI-NULLABLE / FR-INFRA-KPI-SCORING-NULLSAFE.

## Tests de cohérence à écrire

À placer dans `tests/unit/coherence/radar-explorations.test.ts` :

1. **`describe('FR-RAD-PERSIST — JSONB complet preserve vs upsert')`**
   - Crée un scan avec cards[], puis appelle `persistLongTailSuggestions()`.
   - Vérifie que `cards[]` n'est pas écrasé → test `existing.scanResult.cards.length === 5` après persistence longue-traîne.
   - Teste régénération : `longTailSuggestions[]` écrasé, `cards[]` intact, `longTailSelectedKeywords[]` conservé (intersect).

2. **`describe('FR-RAD-LONGTAIL-REGENERATE — sélection filtree aux nouveaux keywords')`**
   - Gen 1 : 10 suggestions, cocher 3.
   - Gen 2 (cache miss) : 8 suggestions (2 perdues, 3 nouvelles gagnées).
   - Vérifie : `selectedKeywords` = intersect(ancien 3, nouveau 8) = 2 ou 3 (selon chevauchement).
   - Test variante : aucune intersection → `selectedKeywords` devient vide.

3. **`describe('FR-RAD-SEND-CAPTAIN — dédup cards + longues-traînes')`**
   - Crée cards racines cochées (`['kw1', 'kw2']`).
   - Crée longues-traînes cochées (`['kw1-variant', 'kw3']`).
   - Appelle agrégation → vérifie SET sans doublon, `kw1` est racine (pas variant).
   - Test cas extrême : même keyword (case-insensitive) dans les 2 → garde racine.

4. **`describe('FR-RAD-SCORING-BIMODAL — affichage vs tri identical')`**
   - Card avec `marketScore.total = 75`, `relevanceScore.total = null`.
   - Mode KPI affichage : 75. Mode KPI tri : 75. ✅
   - Mode Relevance affichage : `—`. Mode Relevance tri : `null` (en bas). ✅
   - Test variante avec `relevanceScore.total = 60` : affichage 60, tri 60. ✅

5. **`it.todo('FR-RAD-LONGTAIL-UI — pre-check top 5 par preferenceScore desc')`** — Placeholder. Tester `precheckTopN()` avec scoreMap inégal.

6. **`it.todo('FR-RAD-SCORING-BIMODAL — reload restaure scores identiques (pas recalc)')`** — Placeholder. Risque majeure si scores recalculés front vs stockés JSONB.

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
