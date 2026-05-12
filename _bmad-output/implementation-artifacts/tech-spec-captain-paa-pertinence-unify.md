---
name: tech-spec-captain-paa-pertinence-unify
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-05-12
synced_with:
  - _bmad-output/planning-artifacts/prd.md (nouvelles FR : FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-BADGE-SINGLE, FR-CAP-PAA-JUDGE-CACHE-SESSION ; cohérence avec FR-CAP-RELEVANCE-COMPUTED-LIVE, FR-CAP-RELEVANCE-NO-DB-WRITE, FR-CAP-RELEVANCE-NO-CACHE (legacy algorithmique), FR-CAP-RELEVANCE-MEMOIZATION, FR-CAP-NO-PAINPOINT-WATCHER, FR-PAIN-IMMUTABLE-AFTER-CEREVEAU)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (entrée captain-paa-pertinence-unify, à créer)
  - docs/scoring-kpi-vs-relevance.md (mise à jour signal PAA × douleur, devient produit Haiku)
  - docs/data-flows/captain-relevance.md (à créer — cartographie Haiku PAA × douleur)
  - docs/radar-card-component.md (mise à jour : prop bimodale `cardContext`)
  - server/prompts/captain-paa-judge.md (nouveau prompt, à créer)
---

# Tech-spec — Jugement Haiku de la pertinence PAA × douleur en Capitaine

## Contexte

Trois mesures distinctes du même axe **PAA × douleur** coexistent dans le code, produisant des incohérences visibles (PAA "0.0 pts" affiché sur une card dont les 4 PAA sont taggués "Exact", score Pertinence total ~62 sans lien apparent) :

| Réf | Nom | Formule | Localisation | Usage actuel |
|---|---|---|---|---|
| **(A)** | `computePaaWeightedScore` | Σ par PAA `0.5×topic + 0.5×pain`, **somme brute non normalisée** | `server/services/intent/intent-scan.service.ts:207-221` | "PAA pts" affiché sur card Capitaine + signal 10 % score KPI marché Radar |
| **(B)** | `computePaaPainAlignmentCumulative` | `(somme / (nbPAA × 2.0)) × 100` → **0-100 normalisé par count** | `server/services/intent/intent-scan.service.ts:246-253` | Définie, jamais appelée |
| **(C)** | `avgLexicalPainAlignment` | Moyenne lexicale présence mots-douleur dans textes PAA | `server/services/keyword/captain-relevance.service.ts:142-146` | Composante 25 % score Pertinence total |

**Décision produit (validée 2026-05-12)** : on remplace **(B) + (C)** dans le chemin Capitaine par un **jugement IA Haiku** appelé à la volée au mount de l'onglet Capitaine. Le LLM analyse chaque PAA en croisant le **sujet** du keyword et le **point de douleur** de l'article, retourne via `tool_use` un schéma strict utilisé pour produire à la fois les badges PAA et le signal 2 du score Pertinence total. La mesure (A) reste utilisée côté Radar (axe marché) **sans modification** : Radar = volume, Capitaine = pertinence.

**Périmètre du chantier** :
- Onglet Capitaine uniquement.
- Pas de modification du scan Radar (le `painAlignment` qu'il calcule actuellement devient inutilisé en Capitaine — nettoyage zombie planifié dans un sprint séparé).
- Pas de persistance DB des jugements Haiku (conforme FR-CAP-RELEVANCE-NO-CACHE).

## Objectifs

1. **Prompt Haiku batch** : 1 appel par keyword, juge en bloc tous les PAA du keyword contre le sujet **et** le painPoint de l'article. Retour `tool_use` schéma strict (cf. §Format de sortie).
2. **Affichage Capitaine** :
   - **Un seul badge par PAA**, valeur directe issue du LLM (`pertinent` / `partiel` / `hors-sujet`). Pas de combo lexical+douleur côté UI — le LLM produit déjà la synthèse.
   - Score "PAA pts" remplacé par `overallPaaScore` Haiku (0-100), normalisé par construction (le LLM raisonne sur les N PAA fournis).
   - Pendant l'appel : skeleton/shimmer sur badge + score-ring (latence asynchrone acceptée, pas de streaming).
3. **Signal 2 du score Pertinence total** : alimenté par `overallPaaScore` Haiku au lieu de `avgLexicalPainAlignment`. Poids 25 % conservé.
4. **Stockage** : Map dans le store Pinia `article-keywords.store.ts` keyed par `articleId` → `keyword` → `PaaJudgmentBlock`. **Cache session cross-article-switch** : pas de `$reset()` au changement d'article, on conserve les jugements pour réutilisation. F5 = perdu = recalcul. Pas de table DB, pas de localStorage.
5. **Badge Radar inchangé** : `RadarKeywordCard.vue` étant partagé entre Radar et Capitaine, prop bimodale `cardContext: 'radar' | 'capitaine'` pour conditionner l'affichage badge (Radar = lexical pur, Capitaine = badge unique Haiku).
6. **Lazy au mount Capitaine** : aucune dépense Haiku tant que l'utilisateur n'entre pas sur l'onglet Capitaine.

## Hors-scope

- Suppression du `painAlignment` côté scan Radar (zombie après ce chantier — sprint "dead code" séparé).
- Refonte du score KPI marché Radar (mesure A continue de l'alimenter, OK car axe marché).
- Embedding sémantique côté Capitaine (remplacé par jugement LLM).
- Persistance DB des jugements (cache jamais nécessaire vu les FR existantes).
- Refonte UX globale Capitaine (badge et score-ring uniquement).

## Cartographie (Phase 1.bis)

### Donnée partagée : "Jugement PAA pour un keyword sur un article"

| Axe | État actuel | État cible |
|---|---|---|
| **Producteurs** | (1) Scan Radar : `keyword-radar.service.ts:344-405` calcule `match`, `matchQuality`, `painAlignment` (embedding 0.6/0.35). (2) `computePaaWeightedScore` (somme brute) à la volée. (3) `avgLexicalPainAlignment` (moyenne lexicale) à la volée. | (1) Scan Radar inchangé (le `painAlignment` produit devient zombie pour Capitaine). (2) Conservée pour Radar uniquement. (3) **Supprimée du chemin Capitaine**. **(4) Nouveau : Haiku via prompt `captain-paa-judge.md`** au mount Capitaine. |
| **Persistance** | `paa_explorations.is_match` + `match_quality` (binaire lexical). `painAlignment` volatile au scan. | Idem côté DB. Jugements Haiku **strictement en mémoire JS** : Map `articleId → keyword → PaaJudgmentBlock` dans le store Pinia. Survit aux switch d'onglet **et aux switch d'article** dans la même session. F5 = perdu (FR-CAP-PAA-JUDGE-CACHE-SESSION). |
| **Consommateurs** | (a) Badge `RadarKeywordCard.vue:282-293`. (b) "PAA pts" `RadarKeywordCard.vue:373-376`. (c) Signal 2 score total `shared/scoring.ts:227-293`. (d) Tooltips Pertinence. | (a) Badge bimodal selon `cardContext`, **un seul chip** en mode Capitaine (valeur directe `pertinent`/`partiel`/`hors-sujet`). (b) "PAA pts" lit `overallPaaScore` Haiku. (c) Signal 2 lit `overallPaaScore` Haiku. (d) Tooltip cite "Calculé avec Claude Haiku" + `summary` produit par le LLM. |
| **Cas d'usage** | Premier load article → scoring algorithmique systématique au select article. | Premier load onglet Capitaine → appel Haiku parallèle pour les N keywords explorés. Switch d'onglet sans changer d'article → cache hit. **Switch article A → B → A → cache hit sur A** (pas de re-call). F5 → cache vidé, recalcul. Ajout keyword Radar→Capitaine → appel Haiku pour le seul nouveau keyword. |
| **Régressions historiques** | Normalisation par count (mesure B) ajoutée puis branchée nulle part. | (B) abandonnée définitivement au profit du jugement LLM (plus expressif, plus juste sémantiquement). |

### Règle de cohérence affichage / calcul (cible)

> **Une seule source** (`paaJudgments` retourné par Haiku via tool_use) produit le badge **et** le signal 2 du score Pertinence total. Le `overallPaaScore` global sert à l'affichage "PAA pts" et au signal 2. Le champ `badge` par PAA sert directement au chip affiché (pas de transformation côté front). Pas de fallback différent. Si Haiku échoue → signal 2 = `null` + `unavailableReason: 'haiku-unavailable'` (cohérent FR-CAP-RELEVANCE-UNAVAILABLE-REASON, extension).

### Cas d'usage à tracer

| Cas | Comportement attendu |
|---|---|
| Premier load article, onglet Radar actif | Aucun appel Haiku. Store Capitaine vide. |
| Switch Radar → Capitaine, première fois | Skeleton sur badges + scores pendant ~700ms (parallèle Haiku). Résultats remplissent au fur et à mesure. |
| Switch Capitaine → Radar → Capitaine, même article | Store conservé. Pas de re-call Haiku. Affichage immédiat. |
| Ajout keyword Radar → Capitaine (envoi + validation) | Appel Haiku pour le seul nouveau keyword, autres cards inchangées. |
| F5 sur Capitaine | Store vidé. Re-call Haiku pour tous les keywords explorés. |
| `AI_PROVIDER=mock` (tests) | Mock retourne un schéma valide avec valeurs déterministes (cf. Sprint A.1 tests). |
| Haiku échoue (network, rate limit) | Badge "?" + tooltip "Jugement indisponible — réessayer". Score signal 2 = `null`. |
| painPoint vide (< 10 chars) | Pas d'appel Haiku. `unavailableReason: 'no-pain'` (existant). |

## Format de sortie (contrat d'interface)

Appel Anthropic API avec `tool_use` forcé, `temperature: 0`, modèle `claude-haiku-4-5-20251001`.

### Tool definition

```typescript
{
  name: "submit_paa_judgments",
  description: "Soumet le jugement de pertinence pour chaque PAA d'un keyword vis-à-vis du sujet et du point de douleur de l'article. Un seul badge synthétique par PAA, dérivé de l'analyse combinée sujet + douleur.",
  input_schema: {
    type: "object",
    required: ["paaJudgments", "overallPaaScore", "summary"],
    properties: {
      paaJudgments: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["paaIndex", "badge", "paaScore", "reasonShort"],
          properties: {
            paaIndex: {
              type: "integer",
              minimum: 0,
              description: "Index 0-based de la PAA dans la liste fournie."
            },
            badge: {
              enum: ["pertinent", "partiel", "hors-sujet"],
              description: "Verdict de synthèse, dérivé de l'analyse interne sujet + douleur. `pertinent` = aligné sur le sujet ET utile pour la douleur. `partiel` = aligné sur un des deux axes seulement, ou alignement modéré sur les deux. `hors-sujet` = ne sert pas l'article."
            },
            paaScore: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description: "Score 0-100 de pertinence du PAA. Permet tri et agrégat. ≥70 = pertinent. 40-69 = partiel. <40 = hors-sujet. Doit être cohérent avec `badge`."
            },
            reasonShort: {
              type: "string",
              maxLength: 60,
              description: "Justification courte du verdict (≤ 10 mots, en français). Affichée en tooltip du badge."
            }
          }
        }
      },
      overallPaaScore: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description: "Score agrégé 0-100 reflétant la pertinence globale des PAA pour cet article. 100 = tous les PAA pertinents. 0 = aucun ne sert l'article."
      },
      summary: {
        type: "string",
        maxLength: 140,
        description: "Synthèse 1 phrase de l'apport éditorial des PAA pour cet article. Affichée en tooltip global de la card."
      }
    }
  }
}
```

Appel : `tool_choice: { type: "tool", name: "submit_paa_judgments" }`. Le LLM est forcé d'utiliser le tool, le parsing est trivial : `response.content[0].input as PaaJudgmentBlock`.

### Type TypeScript partagé (`shared/types/captain-paa-judgment.types.ts` — nouveau)

```typescript
export type PaaBadge = 'pertinent' | 'partiel' | 'hors-sujet'

export interface PaaJudgment {
  paaIndex: number
  badge: PaaBadge
  paaScore: number      // 0-100
  reasonShort: string   // ≤60 chars
}

export interface PaaJudgmentBlock {
  paaJudgments: PaaJudgment[]
  overallPaaScore: number  // 0-100
  summary: string          // ≤140 chars
}
```

## Prompt (`server/prompts/captain-paa-judge.md`)

Convention CLAUDE.md §3.7 : variables `{{...}}` injectées via `loadPrompt()`, jamais en dur.

Structure cible (à affiner au Sprint A.1) :

```markdown
Tu es un analyste SEO expert qui évalue la pertinence éditoriale des questions PAA (People Also Ask) Google pour un article donné.

## Contexte de l'article

**Titre de l'article** : {{article_title}}
**Point de douleur central** : {{pain_point}}
**Intention éditoriale attendue** : {{pain_intent_expected}}

## Mot-clé en cours d'évaluation

{{keyword}}

## PAA scannés à juger

{{paa_list_formatted}}
<!-- Format : index | question | extrait de réponse -->

## Ta tâche

Pour chaque PAA, raisonne en interne sur deux axes :
- **Sujet** : le PAA traite-t-il du même sujet que le mot-clé ? (alignement lexical et sémantique avec le keyword)
- **Douleur** : le PAA aide-t-il l'article à répondre à son point de douleur, ou apporte-t-il une info clé pour le rédiger ?

Puis **synthétise les deux axes en un verdict unique** pour le champ `badge` :
- `pertinent` : aligné sur le sujet **ET** utile pour la douleur. Le PAA mérite d'être traité dans l'article.
- `partiel` : aligné sur **un seul** des deux axes, ou alignement modéré sur les deux. À mentionner mais sans en faire un pilier.
- `hors-sujet` : ne sert pas l'article. À écarter.

Donne ensuite un `paaScore` 0-100 cohérent avec le badge (≥70 pour `pertinent`, 40-69 pour `partiel`, <40 pour `hors-sujet`), et une justification `reasonShort` ≤10 mots.

Calcule **overallPaaScore** (0-100) comme moyenne pondérée reflétant l'apport éditorial global :
- 100 = tous les PAA `pertinent`, contenu très exploitable.
- 50 = moitié pertinent/partiel.
- 0 = tous `hors-sujet`.

Réponds **exclusivement** via l'outil `submit_paa_judgments`. Ne produis aucun texte en dehors de l'appel d'outil.
```

## Plan d'exécution

### Sprint A.0 — Audit + cartographie (1-2 h, 0 LoC)

- Confirmer la prop bimodale à ajouter (`cardContext` ou réutilisation d'une prop existante) sur `RadarKeywordCard.vue`. Vérifier comment `RadarCardLockable.vue` et `RadarCardCheckable.vue` (variantes) consomment le badge.
- Tracer le chemin du payload `getCaptainExplorations` → `article-keywords.store.ts` → `CaptainPanel.vue` → `RadarKeywordCard.vue`. Documenter dans `docs/data-flows/captain-relevance.md` (à créer).
- Inventorier les tests existants sur `RadarKeywordCard` (8+ fichiers `radar-keyword-card-*.test.ts`) pour éviter de casser un invariant déjà couvert.

### Sprint A.1 — Backend : prompt Haiku + service (TDD strict)

**Fichiers à créer** :
- `server/prompts/captain-paa-judge.md` (prompt).
- `server/services/keyword/captain-paa-judge.service.ts` (service appelant Haiku).
- `shared/types/captain-paa-judgment.types.ts` (types).
- `tests/unit/services/captain-paa-judge.service.test.ts` (Vitest).
- `tests/unit/contract-api/captain-paa-judge.contract.test.ts` (mock fixture Haiku).

**Fichiers à modifier** :
- `server/services/external/ai-provider.service.ts` — ajout d'une méthode `judgePaa(input, schema): Promise<PaaJudgmentBlock>` qui route Claude/Mock selon `AI_PROVIDER`.
- `server/services/keyword/captain-relevance.service.ts` — signal 2 lit `overallPaaScore` Haiku au lieu de `avgLexicalPainAlignment`. Header `AUTHORITY:` mis à jour.
- `shared/scoring.ts:227-293` — signal 2 (`paaPain`) accepte la nouvelle source.
- `server/services/infra/data.service.ts` `getCaptainExplorations` — orchestre les appels Haiku parallèles via `Promise.all` pour les N keywords explorés.

**Tests Red→Green** (préfixe `moteur:`, conformes §3.1 TDD strict) :
1. `captain-paa-judge.service.test.ts` :
   - Étant donné un mock Haiku qui retourne 4 PAA `aligned` → service retourne `overallPaaScore: 95-100`, 4 badges complets.
   - Étant donné un mock Haiku qui retourne 4 PAA `off` → service retourne `overallPaaScore: 0-20`.
   - Étant donné Haiku qui timeout → service throw `HaikuJudgmentError`, capté par `getCaptainExplorations` → `unavailableReason: 'haiku-unavailable'`.
   - Étant donné `painPoint` vide → service skip, retourne `null` + `unavailableReason: 'no-pain'`.
   - **Parité 4 vs 16 PAA** : même qualité moyenne → `overallPaaScore` similaire (le LLM normalise par construction, pas de division manuelle requise).
2. `captain-paa-judge.contract.test.ts` :
   - Mock fixture Anthropic SDK retourne le schéma `tool_use` complet — vérifie parsing + typage.
   - Schéma malformé → throw + log.
3. `captain-relevance.service.test.ts` (modification) :
   - Signal 2 utilise `overallPaaScore` injecté, plus de `avgLexicalPainAlignment`.
   - Poids 25 % vérifié dans le total.
   - `INTENT_MISMATCH_MALUS` inchangé.

**Implémentation Green** (squelette) :

```typescript
// server/services/keyword/captain-paa-judge.service.ts
import { loadPrompt } from '../prompts/load-prompt'
import { aiProvider } from '../external/ai-provider.service'
import type { PaaJudgmentBlock } from '../../../shared/types/captain-paa-judgment.types'

/**
 * AUTHORITY: Jugement Haiku PAA × douleur pour un keyword sur un article.
 * READS FROM: paa_explorations (PAA scannés), articles.pain_point, cocoons.topic.
 * WRITES TO: rien (volatile, retour HTTP uniquement).
 * CONSUMERS: getCaptainExplorations → article-keywords.store.ts → RadarKeywordCard.vue (mode capitaine).
 * RELATED FR: FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-JUDGE-STORE-VOLATILE.
 */
export async function judgePaaForKeyword(input: {
  articleId: number
  keyword: string
  paaItems: Array<{ question: string; answer: string }>
  painPoint: string
  articleTitle: string
  painIntentExpected: string | null
}): Promise<PaaJudgmentBlock | null> {
  if (!input.painPoint || input.painPoint.length < 10) return null
  if (input.paaItems.length === 0) return null

  const prompt = loadPrompt('captain-paa-judge', {
    article_title: input.articleTitle,
    pain_point: input.painPoint,
    pain_intent_expected: input.painIntentExpected ?? 'non précisé',
    keyword: input.keyword,
    paa_list_formatted: formatPaaList(input.paaItems),
  })

  const result = await aiProvider.judgePaa({
    prompt,
    model: 'claude-haiku-4-5-20251001',
    temperature: 0,
    tool: PAA_JUDGE_TOOL,
  })
  return result
}
```

**Critère de sortie** : tous les tests Vitest verts, `npm run type-check` vert, `npm run test:check` ≤ baseline.

### Sprint A.2 — Frontend : store + skeleton + badges (TDD UI)

**Fichiers à modifier** :
- `src/stores/article/article-keywords.store.ts` — :
  - Nouveau slot d'état : `paaJudgmentsByArticle: Map<number, Map<string, PaaJudgmentBlock>>` (cache session cross-switch).
  - Nouveau slot loading : `paaJudgmentsLoading: Map<number, Set<string>>` (par `(articleId, keyword)`).
  - Action `loadCaptainPaaJudgments(articleId, keywords?: string[])` : si argument `keywords` absent → charge tous les explorés manquants ; sinon charge uniquement la liste fournie. **Pas de `$reset` au switch d'article** (la Map garde toutes les sessions).
  - Getter `getPaaJudgment(articleId, keyword): PaaJudgmentBlock | null`.
  - Action `invalidatePaaJudgments(articleId)` (uniquement appelée si painPoint change — cas marginal Cerveau, hors session normale).
  - Header `AUTHORITY:` mis à jour.
- `src/components/moteur/CaptainPanel.vue` — `onMounted` : pour chaque keyword exploré de l'article actif **non encore présent dans le cache**, déclencher `loadCaptainPaaJudgments(articleId, [missingKeywords])`. `watch` sur ajout de keyword exploré → relancer pour le seul nouveau keyword. Passe `cardContext="capitaine"` aux cards.
- `src/components/intent/RadarKeywordCard.vue` — :
  - Nouvelle prop `cardContext: 'radar' | 'capitaine'` (default `'radar'`).
  - Nouvelle prop `paaJudgment: PaaJudgmentBlock | null` (sourcée par le parent depuis le store).
  - Nouvelle prop `paaJudgmentLoading: boolean`.
  - Badge : si `cardContext === 'capitaine'` ET `paaJudgment` disponible → afficher **un seul chip** par PAA avec valeur `paaJudgment.paaJudgments[i].badge`, tooltip = `reasonShort`. Si `paaJudgmentLoading` → skeleton shimmer. Si `cardContext === 'radar'` → badge lexical pur (existant, inchangé).
  - "PAA pts" : si `cardContext === 'capitaine'` → `paaJudgment?.overallPaaScore + '/100'`. Si chargement → skeleton. Si Radar → `paaWeightedScore.toFixed(1) + ' pts'` (existant).
  - Tooltip global card en mode Capitaine : `paaJudgment?.summary`.

**Tests** (préfixe `moteur:`) :
- `tests/unit/components/radar-keyword-card-paa-badge-capitaine.test.ts` :
  - 4 PAA tous `pertinent` → 4 chips verts "pertinent" + `overallPaaScore=95` affiché "95/100".
  - 4 PAA tous `hors-sujet` → 4 chips gris "hors-sujet" + "10/100".
  - Mix 2 `pertinent` + 2 `partiel` → 2 verts + 2 orange + score intermédiaire.
  - `paaJudgmentLoading: true` → skeleton shimmer sur badge + score, pas de valeur affichée.
  - `cardContext: 'radar'` → badge lexical pur, `cardContext` n'affecte pas le rendu marché.
  - Tooltip badge = `reasonShort` du jugement. Tooltip global card = `summary`.
- `tests/unit/stores/article-keywords-paa-judgments.test.ts` :
  - `loadCaptainPaaJudgments` appelle bien l'endpoint, hydrate la Map, gère le loading flag.
  - **Cache cross-switch** : load article A, switch B, switch retour A → `getPaaJudgment(A, kw)` retourne la valeur sans nouvel appel API (test critique).
  - F5 simulé (`$reset()` global ou nouveau store instancié) → Map vide.
  - `loadCaptainPaaJudgments(A, [kw])` ciblé n'écrase pas les autres entrées de A.
  - `invalidatePaaJudgments(A)` vide uniquement la sous-Map de A, pas celles des autres articles.
- Tests existants `radar-keyword-card-*.test.ts` (8 fichiers) : adaptés avec `cardContext` explicite (défaut `'radar'`), pas de régression.

**Décision UX badge** : tranchée — **un seul chip** par PAA, valeur directe `pertinent` / `partiel` / `hors-sujet` issue du LLM. Pas de variante à proposer.
- `pertinent` → chip vert (réutiliser palette existante `--success` / `bg-emerald-50 text-emerald-700`).
- `partiel` → chip orange (`--warning` / `bg-amber-50 text-amber-700`).
- `hors-sujet` → chip gris (`--neutral` / `bg-zinc-100 text-zinc-600`).

### Sprint A.3 — Documentation + nouvelles FR PRD

- Créer `docs/data-flows/captain-relevance.md` avec cartographie Phase 1.bis complète.
- Mettre à jour `docs/scoring-kpi-vs-relevance.md` : signal 2 = sortie Haiku, plus `avgLexicalPainAlignment`.
- Mettre à jour `docs/radar-card-component.md` : prop bimodale documentée.
- Ajouter au PRD (`_bmad-output/planning-artifacts/prd.md`) :
  - **FR-CAP-PAA-JUDGE-HAIKU** : "Le signal 2 du score Pertinence Capitaine (PAA × douleur) est produit par un appel Claude Haiku 4.5 à la volée au mount de l'onglet Capitaine. Le prompt batch tous les PAA d'un keyword en un seul appel, retourne via `tool_use` un schéma strict `submit_paa_judgments`. Le LLM raisonne en interne sur sujet + douleur et produit une synthèse par PAA."
  - **FR-CAP-PAA-BADGE-SINGLE** : "Sur l'onglet Capitaine, chaque PAA affiche un seul chip dont la valeur (`pertinent` / `partiel` / `hors-sujet`) vient directement du LLM. Sur Radar, le badge reste lexical pur (`paa.matchQuality`). Composant bimodal via prop `cardContext: 'radar' | 'capitaine'`."
  - **FR-CAP-PAA-JUDGE-CACHE-SESSION** : "Les jugements Haiku sont stockés dans une `Map<articleId, Map<keyword, PaaJudgmentBlock>>` du store Pinia `article-keywords.store.ts`. Le cache **survit aux switch d'article** dans la même session navigateur. F5 vide tout. Pas de persistance DB ni localStorage. Justification : `painPoint` immutable post-Cerveau (FR-PAIN-IMMUTABLE-AFTER-CEREVEAU) → pas de risque de divergence du jugement pendant la session."
  - **Extension FR-CAP-RELEVANCE-UNAVAILABLE-REASON** : ajout de la valeur `'haiku-unavailable'` quand l'appel Haiku échoue (network, rate limit, schéma malformé).
  - **Note** : FR-CAP-RELEVANCE-NO-CACHE reste applicable au score Pertinence algorithmique legacy. Pour la composante PAA × douleur (devenue jugement Haiku), c'est FR-CAP-PAA-JUDGE-CACHE-SESSION qui s'applique. Les deux FR cohabitent sans contradiction (champs distincts du store).
- Mettre à jour `sprint-status.yaml` (entrée `captain-paa-pertinence-unify`).

## Validation (Phase 5)

```bash
npm run lint
npm run type-check
npm run test:unit
npm run test:check         # ≤ baseline (pas de nouveau rouge introduit)
npm run test:browser       # Si Sprint A.2 touche UI
npm run check:dead
npm run check:cycles
npm run build
```

**Tests E2E Playwright** (Sprint A.2 obligatoire) : ouvrir Moteur sur Radar → vérifier 0 appel Haiku via spy network. Switch Capitaine → vérifier appels Haiku parallèles → vérifier skeleton → vérifier badges remplis.

## Self-Review (Phase 4) — items spécifiques

- [ ] **Sources unifiées** : `grep -r "computePaaPainAlignmentCumulative\|avgLexicalPainAlignment" server/services/keyword/captain-*` ne retourne rien — seul `judgePaaForKeyword` est consommé dans le chemin Capitaine.
- [ ] **Bimodal badge** : prop `cardContext` typée, tests couvrant les 2 modes (radar lexical pur / capitaine chip unique Haiku).
- [ ] **Skeleton** : badge + score-ring en shimmer pendant `paaJudgmentLoading: true`.
- [ ] **Schéma tool_use** : validé par test contract-api avec mock fixture Anthropic.
- [ ] **Cache session cross-switch** : test store dédié vérifie que load A → switch B → switch retour A ne re-call pas l'API. F5 simulé vide bien la Map.
- [ ] **Pas de persistance** : aucun `localStorage`/`sessionStorage`/`INSERT INTO` autour des `paaJudgments`. Schema DB inchangé sur ce chantier.
- [ ] **Lazy Capitaine** : test Playwright vérifie 0 appel Haiku tant que l'onglet Capitaine n'est pas actif.
- [ ] **Headers AUTHORITY** : `captain-paa-judge.service.ts`, `captain-relevance.service.ts`, `article-keywords.store.ts` mis à jour avec les nouveaux producteurs/consommateurs/FR.
- [ ] **Mock provider** : `AI_PROVIDER=mock` retourne un schéma déterministe permettant aux tests CI de passer sans clé Anthropic.
- [ ] **3 nouvelles FR ajoutées au PRD** (FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-BADGE-SINGLE, FR-CAP-PAA-JUDGE-CACHE-SESSION) avec ACs Vitest testables.
- [ ] **Logs** : `log.info('[Capitaine] Haiku PAA judge', { articleId, keyword, paaCount, latencyMs, tokensIn, tokensOut, badgeDistribution })` à chaque appel.

## Risques et points à valider

1. ~~**Décision UX badge**~~ → tranchée : un seul chip par PAA, valeur directe `pertinent`/`partiel`/`hors-sujet`.
2. ~~**Latence perçue**~~ → tranchée : asynchrone acceptée, `Promise.all` + skeleton, pas de streaming.
3. **Coût Haiku** : ~$0.0005 par keyword × ~10 keywords × Y F5 par session. Le cache cross-switch réduit drastiquement les re-calls intra-session. Monitorable via logs.
4. **Variabilité LLM** : `temperature: 0` réduit mais n'élimine pas. Si un même `(keyword, painPoint, paaList)` donne 2 jugements différents en 2 appels (entre 2 F5) → c'est acceptable tant que la variation reste dans `±5/100` sur `overallPaaScore` et que les badges restent stables. Test à ajouter si le risque se matérialise.
5. **Rate limit Anthropic** : 10 appels parallèles au mount → vérifier que la clé n'a pas de limite stricte. Sinon throttle côté backend (p-limit ou similaire, concurrence 5-6 max).
6. **Fallback mode mock** : `AI_PROVIDER=mock` retourne un schéma valide mais sémantiquement vide (tous `badge: 'partiel'`, `paaScore: 50`, `overallPaaScore: 50`, `reasonShort: 'mock'`, `summary: 'mock judgment'`). Permet aux tests CI et au mode démo de fonctionner sans facture Anthropic.
7. **Borne du cache mémoire** : `Map<articleId, Map<keyword, ...>>` peut grossir si l'utilisateur visite beaucoup d'articles. Ordre de grandeur : 1 entrée ≈ quelques Ko (N PAA × ~100 bytes). 100 articles × 10 keywords ≈ ~1 Mo en mémoire — négligeable. Pas de LRU dans v1.
