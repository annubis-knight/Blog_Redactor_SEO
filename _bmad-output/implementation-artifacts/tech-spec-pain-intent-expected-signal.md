---
name: tech-spec-pain-intent-expected-signal
version: 1.0
last_updated: 2026-05-06
status: active
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - docs/pain-point-editorial-backbone.md
  - docs/scoring-kpi-vs-relevance.md
  - server/db/migrations/014_articles_pain_intent_expected.sql
related_fr:
  - FR-CAP-RELEVANCE-INTENT-SIGNAL
  - FR-PIE-AI-GENERATION
  - FR-PIE-CERVEAU-OVERRIDE
---

# Tech-spec — Activation du 5e signal Pertinence (`painIntentExpected`)

## 1. Contexte

Le Score Pertinence prévoit 5 signaux. Quatre sont actifs ; le 5e (« Intent SERP × Intent éditorial attendu ») est aujourd'hui **neutralisé à 50/100** parce que le champ `articles.pain_intent_expected` n'est jamais alimenté en DB.

**État existant (à conserver)** :
- Migration DB `014_articles_pain_intent_expected.sql` (TEXT single-value, valeurs `commercial | transactional | informational | navigational`).
- Type `painIntentExpected` dans `shared/types/scoring.types.ts`.
- `computeRelevanceScore` accepte le champ et applique un malus si mismatch.
- Tests `tests/unit/shared/intent-mismatch-malus.test.ts` couvrent le scoring pur.

**État à finir** :
- Génération IA du champ dans les prompts de création d'articles.
- Persistance du champ depuis `addArticlesToCocoon`.
- Lecture du champ et propagation vers `computeRelevanceForCaptainTab`.
- UI Cerveau (dropdown radio dans `ProposedArticleRow.vue`).
- Backfill manuel des articles existants.

## 2. Cartographie de la donnée (Phase 1.bis CLAUDE.md)

| Axe | Réponse |
|---|---|
| **AUTHORITY** | `articles.pain_intent_expected` (PostgreSQL, TEXT, nullable, contrainte CHECK sur 4 valeurs). |
| **PRODUCERS** | (1) Prompts IA `cocoon-articles.md` / `cocoon-articles-spe.md` / `cocoon-add-article.md` → JSON → `addArticlesToCocoon` → INSERT. (2) UI `ProposedArticleRow.vue` (override) → PUT `/articles/:id` → UPDATE. (3) Backfill manuel ponctuel. |
| **CONSUMERS** | (1) `getArticlePainIntent(articleId)` (nouveau helper) lu par `captain-relevance.service.ts:computeRelevanceForCaptainTab`. (2) `ProposedArticleRow.vue` (affichage). |
| **PERSISTENCE** | DB unique. Pas de cache, pas de store Pinia dédié — la valeur est toujours fraîche depuis DB côté serveur ; côté front elle vit dans la prop `proposedArticle.painIntentExpected`. |
| **CAS D'USAGE** | (a) Création article par IA → champ peuplé automatiquement. (b) Reload onglet Capitaine → recompute relevance avec intent → score 5/5 signaux. (c) Override utilisateur dans Cerveau → invalidate computed score (déjà géré par `captainRelevanceStore.hasPainPointChanged` — on ajoutera `hasPainIntentChanged`). |

## 3. Décomposition en sprints

### Sprint A — Tests RED (anti-régression)

Tests à écrire **avant** le code (CLAUDE.md §2.1 TDD strict) :

1. **`tests/unit/services/article-pain-intent.service.test.ts`** (nouveau) — couvre `getArticlePainIntent(articleId)` :
   - Article inexistant → `null`.
   - Article sans `pain_intent_expected` → `null`.
   - Article avec valeur valide → la valeur.
   - Article avec valeur invalide en DB → `null` + log warn (ne throw pas).

2. **`tests/unit/coherence/relevance-live-computation.test.ts`** (étendre) — vérifie que `computeRelevanceForCaptainTab` lit `painIntentExpected` et le passe à `computeRelevanceScore`.

3. **`tests/unit/components/proposed-article-row-pain-intent.test.ts`** (nouveau) — dropdown radio :
   - Affiche la valeur courante.
   - Émet event au changement.
   - 4 options + « Non défini ».

4. **`tests/contract-api/articles-pain-intent.test.ts`** (nouveau) — `PUT /articles/:id` accepte `painIntentExpected` et persiste.

### Sprint B — Schéma Zod + Prompts IA

1. Étendre le schéma Zod de la réponse `cocoon-articles` pour valider `painIntentExpected`.
2. Modifier les 3 prompts pour générer le champ avec règles d'inférence claires.
3. Adapter `addArticlesToCocoon` pour persister le champ.

### Sprint C — Lecture + Câblage scoring

1. Créer `server/services/queries/article-pain-intent.service.ts` (helper `getArticlePainIntent`).
2. Adapter `getCaptainExplorations` → passer `painIntentExpected` à `computeRelevanceForCaptainTab`.
3. Étendre `CaptainKeywordInput` (interface dans `captain-relevance.service.ts`) pour transporter le champ.
4. Mapper `metrics.intent_raw` → `intentTypes` (vérifier le format DB et l'aligner sur le type attendu par `computeRelevanceScore`).

### Sprint D — UI Cerveau + Route PUT

1. Étendre la route `PUT /articles/:id` (ou créer si absente) pour accepter `painIntentExpected`.
2. Ajouter dropdown radio dans `ProposedArticleRow.vue` à côté du `painPoint`.
3. Brancher la mutation Pinia + toast de confirmation.

### Sprint E — Nettoyage clean

1. **Supprimer le legacy `painType`** deprecated (cf. `shared/types/scoring.types.ts:60-64` et son usage dans `shared/scoring.ts:235`). C'est obsolète depuis l'arrivée de `painIntentExpected`, on ne garde pas de rétro-compat (CLAUDE.md anti-pattern : pas de shim si on peut juste changer le code).
2. Nettoyer le TODO `[chantier:pain-intent-signal]` dans `captain-relevance.service.ts` (chantier terminé).
3. Mettre à jour `docs/pain-point-editorial-backbone.md` : section sur `painIntentExpected` actif.

### Sprint F — Backfill manuel

Je lis chaque article existant (titre + painPoint), je détermine l'intent moi-même, j'écris la valeur via `UPDATE` SQL un par un. L'utilisateur reviewe.

## 4. Anti-patterns à éviter

- ❌ Garder le champ `painType` deprecated « au cas où » — on le supprime proprement.
- ❌ Multi-select : single-value uniquement (cohérent avec la matrice 4×4 du scoring).
- ❌ Cache TTL sur `painIntentExpected` — recompute systématique côté Capitaine (cohérent avec FR-CAP-RELEVANCE-NO-CACHE).
- ❌ Fail si l'IA omet le champ — fallback gracieux à `NULL` (5e signal neutralisé à 50/100).

## 5. Validation

- Tous les tests Sprint A passent avant code.
- `npm run lint` + `npm run type-check` verts.
- Backfill manuel relu par l'utilisateur avant exécution.
