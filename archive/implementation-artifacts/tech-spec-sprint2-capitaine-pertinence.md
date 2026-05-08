---
name: Sprint 2 — Capitaine Pertinence (tooltip + recalcul manuel)
description: (a) Tooltip "score Pertinence indisponible" affiché à tort quand pain_point existe ; (b) icône de recalcul manuel manquante dans radar-card-lockable__actions.
type: tech-spec
status: ARCHIVED
version: 1.0.0
created: 2026-05-04
last_updated: 2026-05-04
synced_with:
  - docs/ui-sections-guide.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
---

> **🗄️ ARCHIVED — 2026-05-04** — Sprint livré et stable. Tests verts.

# Sprint 2 — Capitaine Pertinence (tooltip + recalcul manuel)

## 1. Cause racine

Le tooltip de `RadarKeywordCard.vue` ([l. 368-370](../../src/components/intent/RadarKeywordCard.vue#L368-L370)) affiche **systématiquement** *"Score Pertinence indisponible. Définis un point de douleur sur l'article et relance la validation"* quand `relevanceScore` est null.

Or `relevanceScore` peut être null pour plusieurs raisons :
1. **PainPoint absent** sur l'article (vraie cause d'origine).
2. **PainPoint présent mais signaux nuls** : le calcul backend ([keyword-validate.routes.ts:251](../../server/routes/keyword-validate.routes.ts#L251)) exige `hasAnyPainSignal = finalKwPainAlignment ≠ null OR finalPaaPainAvg ≠ null OR finalAutoPainAvg ≠ null`. Si la SERP/PAA est vide ou que l'embedding échoue, tous les signaux peuvent être null malgré un painPoint défini.
3. **Cache stale** : la card vient d'un ancien scan où le painPoint n'était pas encore défini.
4. **Longue traîne** (kpis: null par construction) → cache de pertinence sauté côté backend.

Le tooltip ment dans les cas 2 + 3 + 4. L'utilisateur voit un message qui contredit ce qu'il sait (le pain_point est en DB).

## 2. Acceptance Criteria

### AC1 — Tooltip différencié par cause

Le tooltip doit produire un message qui correspond à la cause réelle :
- **Cas A — PainPoint absent ou trop court (<10 chars)** : message d'origine *"Définis un point de douleur sur l'article…"*. La prop `articlePainPoint` doit être passée à `RadarKeywordCard` pour pouvoir distinguer.
- **Cas B — PainPoint présent, score absent** : message *"Le point de douleur est défini, mais les signaux SERP n'ont pas pu être calculés (PAA vides, autocomplete absent ou embedding indisponible). Relance la validation pour réessayer."* + bouton de recalcul intégré au tooltip.
- **Cas C — Longue traîne (kpis: null)** : message *"Score Pertinence non applicable aux longues traînes — utilise le score Pertinence de leur racine dans Capitaine."*.

### AC2 — Icône de recalcul Pertinence dans `radar-card-lockable__actions`

Nouveau bouton, troisième action dans la colonne d'actions de `RadarCardLockable.vue`, à droite du bouton tag :
- **Icône** : icône SVG "refresh" (rotation circulaire) — sémantiquement "recalculer".
- **`data-testid="radar-card-recompute-relevance"`**.
- **Tooltip natif** : *"Recalculer le score Pertinence pour ce mot-clé"*.
- **Émet un event `recompute-relevance`** que `CaptainValidation` câble pour relancer `validateKeyword(keyword, level, title, painPoint, articleId)` (donc revalidation à la volée avec le painPoint courant).
- **Visible uniquement** quand `displayMode === 'relevance'` (= mode Capitaine), pas en mode Radar.
- **Désactivé** si `validating === true` (déjà en cours) OU si `articlePainPoint` est absent (rien à recalculer sans painPoint).

### AC3 — Tests

- Tests unit `RadarKeywordCard` : le tooltip retourne le bon message selon `articlePainPoint` + `card.kpis === null`.
- Tests unit `RadarCardLockable` : le bouton recompute apparaît uniquement en mode `relevance` avec painPoint, émet l'event, désactivé pendant validating.
- Test d'intégration `CaptainValidation` : clic sur le bouton recompute déclenche un appel à `apiPost('/keywords/.../validate', { ..., painPoint })`.

## 3. Approche

1. Ajouter prop `articlePainPoint?: string | null` à `RadarKeywordCard.vue`.
2. Étendre le `displayedScore` tooltip avec un computed `relevanceMissingReason: 'no-pain' | 'no-signals' | 'long-tail' | null`.
3. Ajouter prop `articlePainPoint?` à `RadarCardLockable.vue` + bouton recompute conditionnel.
4. Émettre `@recompute-relevance` jusqu'à `CaptainValidation` qui appelle `carousel.addEntry(keyword, …)` (ré-injection avec painPoint à jour).

## 4. Hors-scope

- Diagnostiquer pourquoi les embeddings peuvent échouer (réseau, modèle absent) — c'est un bug d'infra, pas de UI.
- Recalcul automatique au mount si `painPoint` change — laissé en évaluation utilisateur (le bouton manuel suffit pour l'audit).
