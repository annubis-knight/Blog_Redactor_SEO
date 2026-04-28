---
title: 'Rétro — Sprints S1-S5 painPoint × Pertinence'
slug: 'sprints-pain-point-relevance-evolution'
delivered: '2026-04-28'
status: 'delivered'
parent_spec: 'sprints-pain-point-relevance-evolution.md'
---

# Rétro — Sprints S1-S5 (painPoint × Pertinence)

## Résumé livré

| Sprint | Thème | Stories | État | Tests |
| ------ | ----- | ------- | ---- | ----- |
| **S1** | painPoint dans les prompts Moteur | 6 prompts + helper | ✅ | 7 |
| **S2** | UI Lexique toggle + transmission `articleId` | LexiqueExtraction + utilitaire pur + restauration types V1 | ✅ | 9 |
| **S3** | Score Pertinence cumulatif (PAA) | formule F1 | ✅ | 7 |
| **S4** | Gestion fine des racines | Jaccard hybride seuil 0.75 | ✅ | 8 |
| **S5** | Intent mismatch + verdict legacy | migration DB + malus intégré + dépréciation | ✅ | 9 |

**Total : 5 commits, 40 tests unitaires, 0 erreur introduite, builds Vite tous verts.**

## Commits

```
d63a2bb feat(S1): inject painPoint dans les prompts Moteur
3384616 feat(S2): UI Lexique — toggle tri par alignement douleur + transmission articleId
38f31c7 feat(S3): score Pertinence cumulatif sur PAA (formule F1)
8cf052e feat(S4): gestion fine des racines (doublons / divergence / fallback)
[S5]    feat(S5): intent mismatch + dépréciation verdict legacy
```

## Décisions structurantes

### Scope & UX (validations utilisateur)
- **Q1** — Refonte complète prompt Capitaine en S1 (au lieu de double-passage S1+S5).
- **Q2** — Fallback painPoint absent = `(non défini)` (pas string vide).
- **Q3** — Lexique : pas d'icônes UI, juste toggle de tri.
- **Q4** — Tri par défaut TF-IDF pur (pas de pondération douleur invisible).
- **Q5** — Formule cumulative **F1** retenue : `(somme / (nbPAA × 2)) × 100`.
- **Q7** — Doublons racines : Piste 3 hybride, seuil **0.75**.
- **Q8** — Pas de UI sur les doublons racines (calcul backend pur).
- **Q9** — Champ DB nommé **`pain_intent_expected`** (option α).
- **Q10** — Malus **intégré dans la composante** (pas une variable séparée). -10 points.
- **Q11** — `computeVerdict` legacy : dépréciation seulement, suppression future.

### Pattern « malus intégré » (extensible)

> Le malus n'est jamais une variable séparée. Il est soustrait directement du `normalized` de la composante concernée.

Cette décision (Q10) est **structurante**. Elle ouvre la voie à d'autres malus (cannibalisation sur `painKeyword`, longueur excessive sur `acPain`, etc.) sans complexifier le calcul global. Le pattern est documenté dans [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md).

## Migrations DB

- **014_articles_pain_intent_expected.sql** : nouvelle colonne nullable sur `articles`. À appliquer manuellement (pas de runner automatique). Valeurs autorisées : `commercial | transactional | informational | navigational | NULL`.

## Risques résolus en cours

- **Revert types V1** détecté en début de S2 (commit `9272938` avait restauré l'ancien `keyword-validate.types.ts`). Reconstruction complète des types `ScoreVerdict`, `MarketScoreResult`, `RelevanceScoreResult` et fonctions `computeMarketScore`, `computeRelevanceScore`. Documenté dans le commit S2.
- **Hooks pre-commit lint** sur fichiers préexistants (CaptainValidation `_result`/`_carouselVerdictLabel`, keywords routes `computeIntentScore` unused, `LexiqueExtraction` `iaChunks` unused). Nettoyés au passage.

## Ce qui reste hors scope

- **Phase E** — Persistance painPoint dans `keyword_metrics` (colonne JSONB par article).
- **Prompts Rédaction** : brief-ia-panel, generate-outline, micro-context-suggest, humanize-section.
- **Renommage `useRadarCarousel`** → `useCaptainValidationQueue` (cosmétique).
- **Suppression effective `computeVerdict`** — story dédiée quand 0 consommateur.
- **Renommage endpoint `/keywords/radar/scan`** → `/explore/scan`.
- **UI badges intent mismatch / doublons racines** — décidé en bypass (Q8, Q10).
- **Embedding cosine fallback** sur racines ambiguës (Jaccard ∈ [0.5, 0.75]) — V1 = Jaccard pur.

## Tests : couverture par sprint

| Sprint | Fichier de test | Tests | Type |
| ------ | --------------- | ----- | ---- |
| S1 | `tests/unit/services/article-pain-point.test.ts` | 7 | Helper DB (mocks pg) |
| S2 | `tests/unit/components/lexique-sort-by-alignment.test.ts` | 9 | Utilitaire pur Jaccard |
| S3 | `tests/unit/services/paa-pain-cumulative.test.ts` | 7 | Logique pure cumulatif |
| S4 | `tests/unit/shared/roots-relevance.test.ts` | 8 | Logique pure dédup |
| S5 | `tests/unit/shared/intent-mismatch-malus.test.ts` | 9 | Logique pure malus |

**Mocks uniquement** (pas d'appel API Claude) — pas de crédit consommé pendant les sprints.

## Couverture painPoint finale

```
Cerveau     : painPoint saisi à création article (DB articles)
            ↓
Moteur      :
  Discovery   ✅ (existant)
  Radar       ✅ (existant)
  Capitaine   ✅ S1+S2 (prompts + scores + side-panel)
  Lieutenants ✅ S2 (transmission articleId → backend récupère painPoint)
  Lexique     ✅ S2 (toggle tri + injection prompts)
  Hn          ✅ S2 (transmission articleId → ai-hn-structure)
            ↓
Rédaction   : partiel (via strategyContext) — story future pour les 4 prompts restants
```

## Suite recommandée

1. **Story d'hygiène** — Renommage `useRadarCarousel`, suppression `combinedScore`, suppression effective `computeVerdict`.
2. **Story prompts Rédaction** — 4 prompts restants à enrichir.
3. **Story persistance painPoint cache** (Phase E).
4. **Story optionnelle UX** — badges UI mismatch/doublons si feedback utilisateur le justifie.

## Liens

- Plan source : [_bmad-output/implementation-artifacts/sprints-pain-point-relevance-evolution.md](./sprints-pain-point-relevance-evolution.md)
- Doc backbone painPoint : [docs/pain-point-editorial-backbone.md](../../docs/pain-point-editorial-backbone.md)
- Doc scoring : [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md)
- Tech-spec parent : [tech-spec-score-kpi-pertinence-separation.md](./tech-spec-score-kpi-pertinence-separation.md)
