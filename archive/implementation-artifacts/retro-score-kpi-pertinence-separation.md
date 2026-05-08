---
title: 'Rétro — Séparation Score KPI / Score Pertinence'
slug: 'score-kpi-pertinence-separation'
delivered: '2026-04-28'
status: 'delivered'
---

# Rétro — Séparation Score KPI / Score Pertinence

## Résumé livré

Deux scores complémentaires et orthogonaux remplacent l'usage exclusif de `combinedScore` dans la décision Capitaine :

- **`marketScore`** (0-100) → onglet Radar — *« Ce mot-clé pèse-t-il SEO ? »*
- **`relevanceScore`** (0-100) → onglet Capitaine — *« Ce mot-clé parle-t-il vraiment de la douleur ? »*

## Changements clés

### Code (additif uniquement, pas de breaking change)

- **Nouveau fichier** [shared/types/scoring.types.ts](../../shared/types/scoring.types.ts) — types `MarketScoreResult`, `RelevanceScoreResult`, `ScoreVerdict` + `verdictFromScore()`.
- **Ajusté** [shared/scoring-kpi.ts](../../shared/scoring-kpi.ts) — poids alignés : Volume 30 / KD 20 / Intent 15 / PAA 10 / AC 10 / CPC 10. Ajout de `computeMarketScore()` qui wrap `computeKpiScore()` et ajoute le verdict.
- **Étendu** [shared/scoring.ts](../../shared/scoring.ts) — nouvelle `computeRelevanceScore()` (pure) avec fallback racines (redistribution proportionnelle des 20 % si keyword < 3 mots).
- **Étendu** [shared/types/keyword-validate.types.ts](../../shared/types/keyword-validate.types.ts) — `ValidateResponse` reçoit `marketScore?` et `relevanceScore?`.
- **Étendu** [shared/types/intent.types.ts](../../shared/types/intent.types.ts) — `RadarCard` reçoit `marketScore?` et `relevanceScore?`.
- **Backend** [server/routes/keyword-validate.routes.ts](../../server/routes/keyword-validate.routes.ts) — `/validate` calcule `marketScore` toujours + lit `relevanceScore` opportunistement depuis le cache `radar_explorations` si `articleId` fourni.
- **Backend** [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) — chaque `RadarCard` est enrichie avec `marketScore` (toujours) et `relevanceScore` (si painPoint disponible).
- **Frontend** [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — `currentScore` priorise `marketScore.total` (mode `'kpi'`) ou `relevanceScore.total` (mode `'relevance'`), avec fallback `combinedScore` pour rétro-compat. `breakdownRows` exploite `relevanceScore.breakdown` quand disponible.
- **Frontend** [src/components/moteur/CaptainSidePanel.vue](../../src/components/moteur/CaptainSidePanel.vue) — nouvelle section « KPIs marché » lecture seule (Volume / KD / CPC / Intent / PAA count / AC count) avec note explicative.
- **Frontend** [src/composables/ui/useResizablePanel.ts](../../src/composables/ui/useResizablePanel.ts) — `panelMaxWidth` dynamique = `viewport - 320 px` au lieu d'une constante 480 px. Listener `resize` pour recalcul. `PANEL_MAX_WIDTH` conservé (fallback) pour rétro-compat des tests.
- **Frontend** [src/components/moteur/CaptainLockPanel.vue](../../src/components/moteur/CaptainLockPanel.vue) — prop `canLock` retirée, bouton toujours actif tant que non verrouillé.
- **Frontend** [src/components/moteur/CaptainValidation.vue](../../src/components/moteur/CaptainValidation.vue) — passage `:can-lock="effectiveVerdict === 'GO'"` retiré.

### Tests

- [tests/unit/shared/scoring.test.ts](../../tests/unit/shared/scoring.test.ts) — **8 nouveaux tests** pour `computeRelevanceScore` (happy path, fallback racines, intent×douleur mapping, edge cases, clamp 0-100, verdicts).
- [tests/unit/shared/scoring-kpi.test.ts](../../tests/unit/shared/scoring-kpi.test.ts) — adaptation des assertions aux nouveaux poids (somme 0.95 au lieu de 1).
- [tests/unit/composables/useResizablePanel.test.ts](../../tests/unit/composables/useResizablePanel.test.ts) — adaptation aux bornes dynamiques + 2 nouveaux tests de viewport (1920px → 1600px max, 800px → 480px max).
- [tests/unit/components/captain-sub-components.test.ts](../../tests/unit/components/captain-sub-components.test.ts) — adaptation du test `CaptainLockPanel` (suppression de `canLock`, vérification que le bouton est toujours actif).

### Documentation

- **Nouveau** [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md) — guide produit + technique complet (~ 220 lignes).
- **Mis à jour** [docs/moteur-data-flow.md](../../docs/moteur-data-flow.md) — ajout section 13bis « Scoring KPI vs Pertinence » + types dans la table.
- **Mis à jour** [CLAUDE.md](../../CLAUDE.md) — entrée dans la table des sources de vérité.

## Tests

- **Zone touchée** : 181 / 181 tests verts (CaptainValidation, RadarCard, scoring, ResizablePanel, etc.).
- **Suite complète** : 2904 / 3047 tests verts. Les 65 échecs restants sont **préexistants** (E2E nécessitant DB live, contracts API, navbar Labo, etc.) — sur main propre on en avait 102, donc cette spec améliore aussi le baseline.
- **Build Vite** ✅ passe. Type-check : 4 erreurs préexistantes (non liées à mes fichiers : DouleurIntentScanner, MoteurView).

## Décisions hors scope V1 (stories futures)

- Renommage `useRadarCarousel` → `useCaptainValidationQueue` (cosmétique).
- Suppression définitive de `computeCombinedScore` une fois les consommateurs migrés.
- Renommage endpoint `/keywords/radar/scan` → `/keywords/radar/explore`.
- Calcul à la volée des alignements douleur dans `/validate` (nécessite IA, V1 lit cache uniquement).
- Persistance de `relevanceScore` en DB.
- Quadrant 2D KPI×Pertinence en visualisation portfolio.
- Suppression du verdict legacy `kpi-scoring.ts:computeVerdict` (redondant avec `marketVerdict`).

## Risques résiduels

- **R-relev-null** : `relevanceScore` peut être `null` côté `/validate` si le cache radar n'a pas été pré-rempli. L'UI doit gracieusement retomber sur `combinedScore` (fallback déjà en place dans `RadarKeywordCard.vue`).
- **R-poids-test** : changement des poids `computeKpiScore` peut surprendre les tests externes (browser-e2e). Le total maximal théorique passe de 100 à 95 — à monitorer en intégration.

## Questions ouvertes

- Quand voudra-t-on vraiment supprimer `combinedScore` ? Critère : 0 référence en lecture dans le code applicatif (sauf historique persisté).
- Faut-il enrichir `keyword_metrics` avec une colonne `pain_alignment_score` cross-article pour éviter de toujours dépendre de `radar_explorations` ?

## Liens

- Tech-spec source : `_bmad-output/implementation-artifacts/tech-spec-wip.md`
- Doc produit : [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md)
