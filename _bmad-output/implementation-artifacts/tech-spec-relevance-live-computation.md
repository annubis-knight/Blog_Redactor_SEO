---
title: Tech-spec — Score Pertinence en calcul à la volée + clic chevron Radar Card
version: 1.0.0
status: draft
created: 2026-05-05
last_updated: 2026-05-05
related_fr:
  - FR-RAD-MARKET-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-NO-DB-WRITE
  - FR-CAP-RELEVANCE-NO-CACHE
  - FR-CAP-RELEVANCE-ROOTS-FROM-DB
  - FR-CAP-ROOTS-PERSISTED-AT-ENTRY
  - FR-CAP-RELEVANCE-MEMOIZATION
  - FR-CAP-RELEVANCE-UNAVAILABLE-REASON
  - FR-RAD-NO-RELEVANCE-IN-SCAN
  - FR-CAP-RELEVANCE-LINEAR-ROOTS
  - FR-RAD-CARD-CHEVRON-TOGGLE
synced_with:
  - docs/data-flows/relevance-score-live-computation.md
  - docs/scoring-kpi-vs-relevance.md
  - docs/radar-card-component.md
  - _bmad-output/planning-artifacts/prd.md
---

# Tech-spec — Score Pertinence live + Clic chevron Radar Card

## 1. Contexte

Cette tech-spec couvre deux problèmes liés à l'onglet Capitaine du Moteur :

### Problème 1 — Score Pertinence absent au reload depuis DB
Symptôme : au reload, certaines cards Capitaine affichent `—` avec un tooltip *"signaux SERP nuls, recalcule"*. Pourtant le painPoint est défini en DB. Cause racine : le score Pertinence est **rapatrié depuis un snapshot Radar obsolète** qui peut être absent (saisie manuelle) ou incohérent (painPoint changé après le scan).

### Problème 2 — Clic sur Radar Card ouvre le PAA au lieu du side panel
Symptôme : tout clic sur une card Capitaine déclenche le toggle PAA, alors que le side panel (qui devrait s'ouvrir) ne s'ouvre jamais. Cause : `@click.stop` sur le `radar-card__header` complet, qui (a) toggle le PAA et (b) bloque la propagation vers `radar-list-item`.

## 2. Décisions architecturales

Cf. document figé : [docs/data-flows/relevance-score-live-computation.md](../../docs/data-flows/relevance-score-live-computation.md).

Synthèse :

| # | Décision |
|---|---|
| 1 | Score Marché : calcul à la volée front, jamais persisté |
| 2 | Score Pertinence : calcul à la volée back à chaque hydratation Capitaine, jamais persisté |
| 3 | Scan Radar : ne calcule plus la Pertinence (uniquement Marché) |
| 4 | Snapshot `radar_explorations.scan_result.cards[].relevanceScore` : suppression de l'écriture, ignoré à la lecture |
| 5 | `root_keywords` : persistées DÈS l'entrée du keyword dans `captain_explorations` |
| 6 | Algo extraction racines : linéaire (statu quo, verrouillé par FR) |
| 7 | Mémoïsation racines : Map locale serveur (durée = 1 requête HTTP) |
| 8 | Aucune modification de schéma DB |
| 9 | Tooltip honnête avec cause typée renvoyée par le backend |
| 10 | Store Pinia front conserve breakdown des 5 composantes |
| 11 | Clic chevron : toggle PAA UNIQUEMENT sur le chevron, reste de la card propage vers side panel |

## 3. Exigences fonctionnelles (FRs)

### FR-RAD-MARKET-COMPUTED-LIVE
**Énoncé** : Le Score Marché (`marketScore`) est calculé à la volée côté front à chaque rendu d'une `RadarKeywordCard`, à partir des `kpis` reçus du backend. Il n'est jamais persisté en DB ni en cache.

**Critères d'acceptation** :
- Le store Pinia front ne contient pas de champ `marketScore` persisté.
- Aucune colonne SQL ne contient `market_score` (ou équivalent).
- Le score affiché dans la card est la valeur retournée par `computeKpiScore(kpis, articleLevel).total` à l'instant du rendu.
- Si `kpis === null` (longue-traîne), le score affiche `—`.

### FR-CAP-RELEVANCE-COMPUTED-LIVE
**Énoncé** : Le Score Pertinence (`relevanceScore`) est calculé à la volée côté backend dans `getCaptainExplorations()` (ou un endpoint dédié), à chaque hydratation de l'onglet Capitaine. Il n'est jamais persisté.

**Critères d'acceptation** :
- À chaque appel `GET /articles/:id` ou endpoint équivalent, le serveur exécute le calcul complet (phases 1-2-3 du schéma de référence).
- Le score retourné reflète **toujours** le `painPoint` actuel de l'article, pas un painPoint historique.
- Modifier `articles.pain_point` en DB et recharger l'onglet doit produire un score différent (sans aucune action de "recompute" manuelle).

### FR-CAP-RELEVANCE-NO-DB-WRITE
**Énoncé** : Aucune écriture DB ne contient le champ `relevanceScore`. Le calcul Pertinence ne fait que des lectures DB.

**Critères d'acceptation** :
- Spy/mock sur `pg.query` pendant un calcul Pertinence : aucun `INSERT` ou `UPDATE` ne contient `relevanceScore`, `relevance_score`, ou `relevance_*` dans son payload.
- La table `captain_explorations` ne contient pas de colonne `relevance_score`.
- La cellule JSONB `radar_explorations.scan_result` ne contient plus de champ `relevanceScore` après refonte.

### FR-CAP-RELEVANCE-NO-CACHE
**Énoncé** : Le Score Pertinence n'est pas mis en cache TTL serveur. Aucun store front (Pinia, localStorage, sessionStorage) ne le persiste au-delà de la session navigateur courante.

**Critères d'acceptation** :
- Aucun appel à `api_cache.get('relevance:*')` ou clé similaire.
- F5 du navigateur vide complètement le score Pertinence côté front.
- Le store Pinia se recharge depuis le serveur à chaque mount.

### FR-CAP-RELEVANCE-ROOTS-FROM-DB
**Énoncé** : Pour le calcul du signal 4 (Racines), le serveur lit le tableau `captain_explorations.root_keywords` persisté. En fallback (entrée DB absente), il appelle `extractRoots(keyword)` à la volée mais sans persister le résultat.

**Critères d'acceptation** :
- Si `root_keywords` existe en DB → utilisé tel quel pour le calcul.
- Si `root_keywords` absent ou vide → fallback `extractRoots()` mémoire seule, pas d'écriture DB.

### FR-CAP-ROOTS-PERSISTED-AT-ENTRY
**Énoncé** : Le tableau `root_keywords` est calculé et persisté en DB **au moment où un keyword entre dans `captain_explorations`**. Pas avant, pas après.

**Critères d'acceptation** :
- Toutes les portes d'entrée de `captain_explorations` (envoi depuis Radar, input manuel, longue-traîne IA) appellent `extractRoots(keyword)` et incluent le résultat dans l'`INSERT`.
- Le verrouillage Capitaine d'un keyword existant ne déclenche aucun nouvel `UPDATE` sur `root_keywords`.
- Le calcul Pertinence ne déclenche aucun `INSERT/UPDATE` sur `root_keywords`.

### FR-CAP-RELEVANCE-MEMOIZATION
**Énoncé** : Pendant un calcul Pertinence pour 30 cards, chaque racine partagée est calculée **une seule fois** via une Map locale serveur, puis lue plusieurs fois sans recalcul.

**Critères d'acceptation** :
- 5 cards qui partagent la racine `cours piano` → `computeRelevanceScore` est appelé une seule fois pour `cours piano` (vérifiable par spy).
- La Map est créée à l'entrée de la fonction, libérée à la sortie (vérifiable par profiling mémoire ou simplement par tests unitaires sur le scope local).

### FR-CAP-RELEVANCE-UNAVAILABLE-REASON
**Énoncé** : Quand `relevanceScore.total === null`, le backend retourne un champ `unavailableReason` typé qui décrit la cause précise. Le frontend affiche un message honnête correspondant.

**Critères d'acceptation** :
- Type : `'no-pain' | 'long-tail' | 'missing-paa' | 'missing-autocomplete' | null`.
- Mapping :
  - `painPoint` absent ou < 10 chars → `'no-pain'` → *"Définis un point de douleur sur l'article"*.
  - `kpis === null` (longue-traîne) → `'long-tail'` → *"Score non applicable (longue-traîne)"*.
  - `paa_questions` vide en DB → `'missing-paa'` → *"Pas de PAA disponible — relance un scan Radar pour ce keyword"*.
  - `autocomplete_suggestions` vide en DB → `'missing-autocomplete'` → *"Pas d'autocomplete — relance un scan Radar"*.
  - Score présent → `unavailableReason: null` ou champ absent.
- Backend logge la cause à chaque retour `null` : `log.info('[Capitaine] relevanceScore null', { articleId, keyword, reason })`.

### FR-RAD-NO-RELEVANCE-IN-SCAN
**Énoncé** : Le scan Radar (`scanRadarKeywords`) n'inclut plus le calcul ni la persistance du Score Pertinence. Il ne produit que `marketScore` et les `kpis` bruts.

**Critères d'acceptation** :
- Après refonte, `keyword-radar.service.ts` n'appelle plus `computeRelevanceScore` ni n'inclut `relevanceScore` dans la réponse `KeywordRadarScanResult.cards[]`.
- Les futures écritures de snapshot dans `radar_explorations.scan_result` ne contiennent plus le champ `relevanceScore`.
- Les anciennes lignes en DB qui contiennent encore ce champ sont **ignorées** par le code de lecture (pas de migration destructive).

### FR-CAP-RELEVANCE-LINEAR-ROOTS
**Énoncé** : L'algorithme d'extraction des racines `extractRoots()` reste linéaire (troncature progressive depuis la fin, max 5 racines, minimum 2 mots significatifs). Toute évolution vers une extraction sémantique (LLM) requiert une nouvelle tech-spec dédiée.

**Critères d'acceptation** :
- `extractRoots('cours piano intermédiaire paris')` retourne `['cours piano intermédiaire', 'cours piano']`.
- `extractRoots('cours piano')` retourne `[]`.
- Stopwords filtrés via `FRENCH_STOPWORDS`.
- Aucun appel LLM dans le chemin de calcul.

### FR-RAD-CARD-CHEVRON-TOGGLE
**Énoncé** : Sur une `RadarKeywordCard`, le toggle expand/collapse de la section PAA est déclenché **uniquement par un clic sur le chevron**. Tout autre clic dans la card propage normalement vers le parent (ex: ouverture du side panel via `radar-list-item` dans `CaptainValidation`).

**Critères d'acceptation** :
- Clic sur le chevron : toggle PAA + `event.stopPropagation()` (ne propage pas au parent).
- Clic sur le keyword text (mode non-interactif) : propage vers parent.
- Clic sur les KPIs : propage vers parent.
- Clic sur le score-ring (zone tooltip) : propage vers parent (le tooltip a son propre `mouseenter`/`mouseleave`, pas de `@click.stop`).
- Clic sur le chevron PAA dans le body (sous-niveaux PAA) : `@click.stop` (existant, conservé).
- Clic sur cadenas / tag / recompute (côté `RadarCardLockable`) : `@click.stop` (existant, conservé).
- Clic sur les mots interactifs (`KeywordWords`) : `@click.stop` (le toggle racine ne doit pas ouvrir le side panel).

## 4. Plan d'implémentation

### Étape 0 — Documentation (FAIT — 2026-05-05)
- ✅ [docs/data-flows/relevance-score-live-computation.md](../../docs/data-flows/relevance-score-live-computation.md) créé
- ⏳ [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md) à compléter (référence vers nouvelle archi)
- ⏳ [docs/data-flows/score-capitaine.md](../../docs/data-flows/score-capitaine.md) à corriger (pas de persistance)
- ⏳ [docs/radar-card-component.md](../../docs/radar-card-component.md) à enrichir (nouvelle archi)
- ⏳ [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) à étendre avec les 11 FRs ci-dessus

### Étape 1 — Tests anti-régression écrits AVANT le code (TDD)
Fichier nouveau : `tests/unit/coherence/relevance-live-computation.test.ts`
1. `FR-CAP-RELEVANCE-COMPUTED-LIVE — recalcul à chaque hydratation`
2. `FR-CAP-RELEVANCE-NO-DB-WRITE — interdiction d'écriture DB`
3. `FR-CAP-RELEVANCE-MEMOIZATION — racines partagées calculées une fois`
4. `FR-CAP-ROOTS-PERSISTED-AT-ENTRY — racines persistées à l'entrée`
5. `FR-RAD-NO-RELEVANCE-IN-SCAN — scan Radar ne calcule plus la Pertinence`
6. `FR-CAP-RELEVANCE-UNAVAILABLE-REASON — tooltip honnête`
7. `FR-CAP-RELEVANCE-LINEAR-ROOTS — extraction linéaire`
8. `FR-CAP-RELEVANCE-NO-CACHE — pas de cache TTL`

Fichier nouveau : `tests/unit/components/radar-keyword-card-chevron-toggle.test.ts`
- `FR-RAD-CARD-CHEVRON-TOGGLE — toggle PAA uniquement sur chevron`

### Étape 2 — Backend : nouveau service de calcul
Créer [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) avec :

```ts
export async function computeRelevanceForCaptainTab(
  articleId: number
): Promise<{
  cards: Map<string, RelevanceScoreEnriched>
  roots: Map<string, RelevanceScoreEnriched>
  computedAt: Date
  painPointSnapshot: string | null
}>
```

Implémente les phases 1-2-3 du schéma référence. Mémoïsation par Map locale.

### Étape 3 — Backend : adaptation `getCaptainExplorations`
Dans [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) :
- Retirer le lookup `radar_explorations.scan_result.cards[].relevanceScore` (lignes 614-633).
- Appeler `computeRelevanceForCaptainTab(articleId)` à la place.
- Inclure le résultat dans la réponse de `getCaptainExplorations`.

### Étape 4 — Backend : retirer le calcul Pertinence du scan Radar
Dans [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) :
- Retirer l'appel `computeRelevanceScore` (lignes 456-464).
- Adapter la structure retournée `KeywordRadarScanResult.cards[]` pour ne plus contenir `relevanceScore` (ou le mettre toujours `undefined`).
- Conserver le calcul `marketScore`.

### Étape 5 — Backend : persistance racines à l'entrée
Pour chaque porte d'entrée `captain_explorations`, garantir l'écriture de `root_keywords` :
- [server/routes/keyword-validate.routes.ts](../../server/routes/keyword-validate.routes.ts) (input manuel + envoi Radar). Vérifier que `extractRoots()` est appelé avant l'INSERT.
- [server/routes/keywords.routes.ts](../../server/routes/keywords.routes.ts) (envoi depuis Radar batch).
- [server/services/keyword/long-tail-suggest.service.ts](../../server/services/keyword/long-tail-suggest.service.ts) (acceptation longue-traîne IA).

Si certaines portes ne le font pas aujourd'hui : ajouter l'écriture.

### Étape 6 — Backend : type `unavailableReason`
Dans [shared/types/scoring.types.ts](../../shared/types/scoring.types.ts) :
```ts
export type RelevanceUnavailableReason = 'no-pain' | 'long-tail' | 'missing-paa' | 'missing-autocomplete'

export interface RelevanceScoreResult {
  total: number | null
  verdict: ScoreVerdict | null
  breakdown: RelevanceScoreBreakdown
  rootsContext: { rootsAverageScore: number | null; fallbackApplied: boolean }
  unavailableReason: RelevanceUnavailableReason | null  // NOUVEAU
}
```

### Étape 7 — Frontend : nouveau store Pinia
Créer [src/stores/article/captain-relevance.store.ts](../../src/stores/article/captain-relevance.store.ts) avec header `AUTHORITY:`. Structure :
```ts
state = {
  loading: 'idle' | 'computing' | 'ready' | 'error',
  cards: Map<keyword, RelevanceCardEntry>,
  roots: Map<rootKeyword, RelevanceRootEntry>,
  computedAt: Date | null,
  painPointSnapshot: string | null,
}

// Actions :
//   hydrateFromArticle(articleId)
//   addKeyword(keyword)
//   removeKeyword(keyword)
//   invalidateIfPainPointChanged(currentPainPoint)
```

### Étape 8 — Frontend : adaptation `RadarKeywordCard.vue`
Dans [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) :
- Retirer `@click.stop` du `<div class="radar-card__header">` (ligne 324).
- Ajouter `@click.stop="expanded = !expanded"` UNIQUEMENT sur `<span class="radar-card__chevron">` (ligne 325).
- Adapter le mapping `relevanceMissingReason` pour utiliser le nouveau champ `unavailableReason` du backend.

### Étape 9 — Frontend : composant `CaptainValidation.vue`
- Hooker le nouveau store `captain-relevance.store` au mount.
- Afficher un loader pendant `loading === 'computing'`.
- Détecter changement de painPoint via watch sur `articleStore.painPoint` → invalidation store.

### Étape 10 — Migration douce (rétrocompatibilité)
- Le code de lecture des anciens snapshots `radar_explorations` doit ignorer `relevanceScore` s'il est présent.
- Pas de migration SQL destructive.
- Logger un warn une fois par session : *"Snapshot Radar contient un relevanceScore historique ignoré"*.

### Étape 11 — Validation finale
- `npm run lint` ✅
- `npm run type-check` ✅
- `npm run test:unit` ✅
- `npm run test:browser` ✅
- `npm run check:dead` ✅
- `npm run check:cycles` ✅
- Test manuel : reload onglet Capitaine, scores cohérents, ajout keyword à la volée OK, clic sur card ouvre side panel sauf chevron.

## 5. Risques de régression identifiés

Cf. cartographie 2026-05-05 :

1. **Backend `/keywords/:keyword/validate`** (keyword-validate.routes.ts:255) — calcul actuel utilise cache Radar + lexical fallback. Si on retire la dépendance au snapshot, le fallback lexical doit rester robuste. Test d'intégration nécessaire.

2. **Frontend carousel `validateKeyword()`** (useCapitaineValidation.ts:60-147) — race condition entre `validatePromise` et `radarPromise`. La refonte peut simplifier ce flux (radar plus nécessaire pour Pertinence).

3. **`computeRootsRelevanceScore`** (shared/scoring.ts) — déjà robuste (cas null géré). Vérifier qu'on lui passe bien la moyenne calculée à partir de la Map mémoïsée et pas un fallback `?? 0`.

4. **Composants qui lisent `relevanceScore`** — RadarKeywordCard, CaptainRootsSidebar, CaptainSidePanel. Vérifier qu'ils ne plantent pas avec le nouveau format `unavailableReason`.

5. **Tests existants** — `radar-keyword-card-relevance-tooltip.test.ts` utilise les 3 anciens cas. À étendre aux 5 nouveaux cas (`unavailableReason`).

## 6. Estimation

| Étape | Effort | Notes |
|---|---|---|
| 0 — Doc | 2h | FAIT |
| 1 — Tests | 4h | TDD strict |
| 2 — Service backend | 4h | Nouveau fichier |
| 3 — Adaptation `getCaptainExplorations` | 2h | |
| 4 — Retrait calcul Radar | 2h | |
| 5 — Persistance racines à l'entrée | 3h | Multi-portes |
| 6 — Type `unavailableReason` | 1h | |
| 7 — Store Pinia | 3h | |
| 8 — `RadarKeywordCard` chevron + tooltip | 2h | |
| 9 — `CaptainValidation` hookup | 3h | |
| 10 — Migration douce | 1h | |
| 11 — Validation finale | 2h | |
| **Total** | **~29h** | |

## 7. Tests d'acceptation manuels

### Scenario A — Reload après changement de painPoint
1. Article piano avec painPoint A. Scan Radar. Validation Capitaine d'un keyword.
2. Modifier le painPoint en B dans l'onglet Cerveau.
3. Revenir sur Capitaine.
4. Attendu : score Pertinence du keyword reflète le painPoint B (recalculé).

### Scenario B — Saisie manuelle Capitaine sans scan Radar
1. Onglet Capitaine, input manuel d'un keyword jamais scanné.
2. Validation.
3. Reload (F5).
4. Attendu : score Pertinence calculé et affiché (pas `—`).

### Scenario C — Cas longue-traîne
1. Acceptation d'une longue-traîne IA (kpis null).
2. Reload.
3. Attendu : tooltip dit *"Score non applicable (longue-traîne)"*, `unavailableReason = 'long-tail'`.

### Scenario D — Cas missing-paa
1. Keyword en DB avec `paa_questions` vide.
2. PainPoint défini.
3. Hydratation Capitaine.
4. Attendu : tooltip dit *"Pas de PAA disponible — relance un scan Radar pour ce keyword"*.

### Scenario E — Clic chevron Radar Card
1. Onglet Capitaine, card visible.
2. Clic sur le chevron (icône triangle à gauche du header).
3. Attendu : PAA s'ouvre/se ferme. Side panel ne s'ouvre PAS.
4. Clic sur le keyword text de la card.
5. Attendu : side panel s'ouvre. PAA reste dans son état précédent.

## 8. Documents à mettre à jour après implémentation

- [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md) — section "Architecture live computation 2026-05-05"
- [docs/data-flows/score-capitaine.md](../../docs/data-flows/score-capitaine.md) — retirer mention persistance, ajouter live computation
- [docs/data-flows/keywords.md](../../docs/data-flows/keywords.md) — règle persistance racines à l'entrée
- [docs/data-flows/radar-explorations.md](../../docs/data-flows/radar-explorations.md) — clarifier que `relevanceScore` n'est plus dans le snapshot
- [docs/moteur-data-flow.md](../../docs/moteur-data-flow.md) — nouveau flux Capitaine
- [docs/radar-card-component.md](../../docs/radar-card-component.md) — chevron toggle isolé
- [_bmad-output/implementation-artifacts/sprint-status.yaml](sprint-status.yaml) — ajouter sprint dédié

## 9. Voir aussi

- [docs/data-flows/relevance-score-live-computation.md](../../docs/data-flows/relevance-score-live-computation.md) — document figé de référence
- [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md) — composition des deux scores
- [docs/radar-card-component.md](../../docs/radar-card-component.md) — anatomie composants
