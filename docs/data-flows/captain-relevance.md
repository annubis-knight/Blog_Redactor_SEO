---
name: captain-relevance
description: Jugement Haiku PAA × douleur pour un keyword sur un article — calculé à la volée au mount Capitaine, mis en cache session par articleId dans le store Pinia, jamais persisté en DB.
type: "PaaJudgmentBlock (mémoire JS, store Pinia)"
last_updated: 2026-05-12
related_fr: [FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-BADGE-SINGLE, FR-CAP-PAA-JUDGE-CACHE-SESSION, FR-CAP-RELEVANCE-COMPUTED-LIVE, FR-CAP-RELEVANCE-NO-DB-WRITE, FR-PAIN-IMMUTABLE-AFTER-CEREVEAU]
synced_with: [_bmad-output/implementation-artifacts/tech-spec-captain-paa-pertinence-unify.md]
---

# Data Flow — captain-relevance (jugement Haiku PAA × douleur)

> **Description métier :** Pour chaque keyword exploré dans l'onglet Capitaine d'un article, on demande à **Claude Haiku 4.5** d'évaluer en bloc la pertinence des PAA scannés vis-à-vis du **sujet** du keyword **et** du **point de douleur** de l'article. Le LLM retourne via `tool_use` un `PaaJudgmentBlock` : un badge synthétique par PAA (`pertinent` / `partiel` / `hors-sujet`), un score global 0-100, et un résumé. Ce bloc alimente à la fois l'affichage (badge, "PAA pts") et le signal 2 du score Pertinence total.
> **Type/format :** `PaaJudgmentBlock` (TypeScript, `shared/types/captain-paa-judgment.types.ts`). Strictement en mémoire JS, jamais persisté en DB ni localStorage.

## Producteurs

Qui crée ou met à jour cette donnée :

- **Service backend** `server/services/keyword/captain-paa-judge.service.ts` (nouveau, Sprint A.1) :
  - `judgePaaForKeyword({ articleId, keyword, paaItems, painPoint, articleTitle, painIntentExpected })` → `PaaJudgmentBlock | null` (le sujet du cocon n'est pas injecté — le LLM se contente du titre article + painPoint + keyword, option 3 validée 2026-05-12).
  - Charge le prompt `server/prompts/captain-paa-judge.md` via `loadPrompt()` (injection sécurisée variables).
  - Appelle Claude Haiku 4.5 via `aiProvider.classifyWithTool()` (pattern existant, `tool_choice` forcé sur `submit_paa_judgments`, `temperature: 0`).
  - Retourne `null` si `painPoint` < 10 chars ou `paaItems` vide.

- **Endpoint REST** (Sprint A.1) :
  - `POST /api/articles/:id/captain/judge-paa` body `{ keywords: string[] }` → retourne `{ data: { judgments: Record<keyword, PaaJudgmentBlock> } }`.
  - Orchestré côté serveur par `Promise.all` (10 keywords parallèles, throttle p-limit concurrence 5-6 si rate limit Anthropic).

- **Action store** `articleKeywordsStore.loadCaptainPaaJudgments(articleId, keywords?)` :
  - Si `keywords` absent → charge tous les explorés manquants pour l'article (intersect avec ce qui est déjà dans la Map cache).
  - Si `keywords` fourni → charge uniquement la liste donnée.
  - Setter sur `paaJudgmentsLoading: Map<articleId, Set<keyword>>` pendant l'appel pour piloter le skeleton.

- **Émetteur frontend principal** `CaptainPanel.vue` :
  - `onMounted` : pour chaque keyword exploré de l'article actif **non encore présent dans le cache** → déclenche `loadCaptainPaaJudgments`.
  - `watch` sur ajout/suppression de keyword exploré → relance pour le seul nouveau keyword, n'invalide pas les autres.

## Persistance

**Autorité absolue (en session)** : Map en mémoire JS dans le store Pinia `article-keywords.store.ts`.

```typescript
paaJudgmentsByArticle: Map<number, Map<string, PaaJudgmentBlock>>
paaJudgmentsLoading:   Map<number, Set<string>>
```

**Persistance DB** : aucune. Pas de table, pas de colonne. Conforme **FR-CAP-RELEVANCE-NO-DB-WRITE** et **FR-CAP-PAA-JUDGE-CACHE-SESSION**.

**Politique de cache** :
- **Survie aux switch d'onglet** (Radar ↔ Capitaine, même article) : cache hit.
- **Survie aux switch d'article** (A → B → A) : cache hit sur A au retour. **Pas de `$reset()` au switch**.
- **F5 navigateur** : Map vidée → recalcul intégral.
- **Mutation `painPoint`** (cas marginal Cerveau, **interdit** post-Cerveau par FR-PAIN-IMMUTABLE-AFTER-CEREVEAU) : action `invalidatePaaJudgments(articleId)` vide la sous-Map de l'article concerné.
- **Borne mémoire** : ~quelques Ko par PaaJudgmentBlock × N keywords × M articles. 100 articles × 10 keywords ≈ ~1 Mo. Pas de LRU dans v1.

**Justification du cache cross-switch** : `painPoint` est immutable post-Cerveau (FR-PAIN-IMMUTABLE-AFTER-CEREVEAU). Les entrées de `paa_explorations` ne changent que par re-scan Radar (cas rare en session). Le jugement Haiku est donc **stable pendant toute la session** pour un `(articleId, keyword)` donné.

## Consommateurs

Qui lit cette donnée :

- **Composant Vue** `RadarKeywordCard.vue` (mode `cardContext="capitaine"`, Sprint A.2) :
  - Badge par PAA : un seul chip par PAA, classe CSS dérivée du champ `badge` (`pertinent` → vert, `partiel` → orange, `hors-sujet` → gris). Tooltip = `reasonShort`.
  - "PAA pts" (ligne ~373) : affiche `overallPaaScore + '/100'`.
  - Tooltip global card : `summary`.
  - État skeleton : si `paaJudgmentLoading` true → shimmer sur badge + score.

- **Service backend** `captain-relevance.service.ts` (Sprint A.1) :
  - Signal 2 du score Pertinence total (`paaPain`, poids 25 %) consomme `paaJudgment.overallPaaScore` au lieu de `avgLexicalPainAlignment` (supprimée du chemin Capitaine).

- **Tooltip Pertinence** (FR-CAP-RELEVANCE-UNAVAILABLE-REASON étendu) :
  - Si Haiku échoue (network, rate limit, schéma malformé) → `unavailableReason: 'haiku-unavailable'` → message *"Jugement Haiku indisponible — réessayer"*.

**NON-consommateurs (volontaire)** :
- **Onglet Radar** : `cardContext="radar"` ne lit jamais `paaJudgmentsByArticle`. Le badge Radar reste lexical pur (`paa.match` + `paa.matchQuality`), le "PAA pts" Radar reste `paaWeightedScore` (somme brute, axe marché).
- **Onglets Lieutenants / Lexique / Discovery** : ne lisent jamais ce slot du store.
- **Backend hors `captain-paa-judge.service.ts`** : aucun import croisé.

## Cas d'usage

| Cas | Comportement |
|---|---|
| Premier load article, onglet Radar actif | Aucun appel Haiku. Cache vide. |
| Switch Radar → Capitaine (1re fois sur cet article) | Skeleton sur badges + "PAA pts" pour les N keywords explorés. Promise.all parallèle. Résultats remplissent au fur et à mesure (~700ms total typique). |
| Switch Capitaine → Radar → Capitaine (même article) | Cache hit. Affichage immédiat sans appel API. |
| Switch article A → B → A | Cache hit sur A au retour. Pas de re-call Haiku. |
| Ajout keyword depuis Radar → Capitaine, validation | Appel Haiku pour le seul nouveau keyword (`loadCaptainPaaJudgments(articleId, [newKeyword])`). Autres cards inchangées. |
| F5 sur Capitaine | Cache vidé (Pinia ne persiste pas). Re-call Haiku pour tous les keywords explorés. |
| `painPoint` modifié (cas marginal, voir FR-PAIN-IMMUTABLE-AFTER-CEREVEAU) | `invalidatePaaJudgments(articleId)` vide la sous-Map → recalcul au prochain mount Capitaine. |
| Haiku échoue (network, rate limit) | Badge "?" + tooltip "Jugement indisponible". Signal 2 = `null` + `unavailableReason: 'haiku-unavailable'`. |
| `AI_PROVIDER=mock` (tests CI) | Mock retourne schéma valide déterministe (tous `badge: 'partiel'`, `paaScore: 50`). Permet tests sans clé Anthropic. |

## Régressions historiques

| Date | Événement | Conséquence |
|---|---|---|
| 2026-04-28 | Ajout `computePaaPainAlignmentCumulative` (mesure B normalisée 0-100) | Définie mais jamais branchée — dette technique non-bloquante. |
| 2026-05-05 | Ajout `avgLexicalPainAlignment` pour signal 2 score Pertinence (mesure C) | Crée un drift à 3 mesures (A somme brute + B normalisée + C moyenne lexicale) du même axe "PAA × douleur". |
| 2026-05-12 | Tech-spec `captain-paa-pertinence-unify` | Décision : remplacer (B) + (C) par jugement Haiku. (A) conservée côté Radar (axe marché). Nettoyage zombie `painAlignment` scan Radar reporté à un sprint séparé. |

## Décisions architecturales clés

1. **Pourquoi LLM plutôt qu'algorithmique** : le jugement sémantique fin (PAA générique vs PAA aligné douleur) est mal capturé par un embedding générique. Haiku 4.5 raisonne explicitement sur le couple `(keyword, painPoint)` et synthétise en 1 badge par PAA, plus expressif et plus juste.

2. **Pourquoi cache session par article** : `painPoint` immutable post-Cerveau ⇒ jugement stable. Switch fréquent A → B → A ne doit pas re-payer ~10 appels Haiku. F5 reste un re-calcul propre (conforme à l'esprit "rien n'est persisté").

3. **Pourquoi pas de table DB** :
   - 25 tables existent déjà (`server/db/schema.sql`) — éviter l'inflation.
   - Cohérent avec FR-CAP-RELEVANCE-NO-DB-WRITE / FR-CAP-RELEVANCE-NO-CACHE qui régissent le score Pertinence depuis 2026-05-05.
   - Session = ~quelques Mo en RAM, négligeable.

4. **Pourquoi un seul badge issu du LLM** : éviter de transporter 2 dimensions (`lexicalMatch`, `painAlignment`) et de les recomposer côté UI — qui réintroduirait un risque de drift affichage/calcul (anti-pattern CLAUDE.md §2.0). Le LLM rend une décision atomique, le front l'affiche tel quel.

5. **Pourquoi prop bimodale `cardContext` plutôt qu'extension de `displayMode`** : `displayMode: 'kpi' | 'relevance'` régit le **score-ring** (gauche : marché, droite : pertinence). `cardContext: 'radar' | 'capitaine'` régit la **source des données PAA** (lexical pur vs Haiku). Sémantique orthogonale.

## Tests de cohérence (Sprint A.2)

- `tests/unit/stores/article-keywords-paa-judgments.test.ts` :
  - Cache cross-switch A → B → A retourne `getPaaJudgment(A, kw)` sans nouvel appel API.
  - F5 simulé (nouvelle instance store) → Map vide.
  - `loadCaptainPaaJudgments(A, [kw])` ciblé n'écrase pas les autres entrées de A.
  - `invalidatePaaJudgments(A)` vide A uniquement, pas B.
- `tests/unit/components/radar-keyword-card-paa-badge-capitaine.test.ts` :
  - 4 PAA tous `pertinent` → 4 chips verts + "95/100".
  - 4 PAA tous `hors-sujet` → 4 chips gris + "10/100".
  - `paaJudgmentLoading: true` → skeleton, pas de valeur.
  - `cardContext: 'radar'` → badge lexical pur (existant), `paaJudgment` prop ignorée.
- `tests/unit/services/captain-paa-judge.service.test.ts` :
  - Mock Haiku 4 PAA `pertinent` → `overallPaaScore` 95-100.
  - Mock Haiku 4 PAA `hors-sujet` → `overallPaaScore` 0-20.
  - Parité 4 vs 16 PAA même qualité → scores similaires (normalisation par construction LLM).
  - `painPoint` vide → retour `null` + `unavailableReason: 'no-pain'`.
  - Timeout/erreur réseau → throw `HaikuJudgmentError` → `unavailableReason: 'haiku-unavailable'`.

## Voir aussi

- [Tech-spec captain-paa-pertinence-unify](../../_bmad-output/implementation-artifacts/tech-spec-captain-paa-pertinence-unify.md) — plan d'exécution complet.
- [data-flows/captain-keyword-locked](captain-keyword-locked.md) — autre donnée Capitaine (TEXT verrouillé).
- [scoring-kpi-vs-relevance](../scoring-kpi-vs-relevance.md) — vue d'ensemble scoring marché vs pertinence (à mettre à jour Sprint A.3).
- [radar-card-component](../radar-card-component.md) — props et modes du composant (à mettre à jour Sprint A.3 avec prop `cardContext`).
