---
name: Sprint 5 — Radar UX (auto-load DB + scanner-inputs + score-pill)
description: 3 frictions Radar (audit 2026-05-03)
type: tech-spec
status: ARCHIVED
version: 1.0.0
created: 2026-05-04
last_updated: 2026-05-04
---

> **🗄️ ARCHIVED — 2026-05-04** — Sprint livré, 7 tests verts.

# Sprint 5 — Radar UX

## ACs

- **#6** — Auto-load DB Radar au sélection d'article. Capitaine et Lexique avaient déjà l'auto-load (sprint 1) ; Radar a besoin d'un appel explicite à `radarRef.value.mergeFromRadarSource(articleId)` côté MoteurView. Discovery exclu (modèle seed-based).
- **#7** — `.scanner-inputs` (broadKeyword + specificTopic + painPoint inputs) masqué en mode `workflow`. Restait disponible en mode `libre` (Labo) où l'utilisateur saisit manuellement. En workflow, ces 3 valeurs sont injectées depuis l'article et les inputs étaient redondants avec Discovery.
- **#8** — `radar-ai-score-pill` affichait "M 0 / P 0" quand les scores étaient absents (`?? 0` fallback dans `useRadarRanking`), ce qui faisait croire à un bug. Maintenant : "—" si score absent, chiffre arrondi sinon. Ajout des flags `marketTotalAvailable` / `relevanceTotalAvailable` dans `RadarRankedCard`.

- **#9** — déclaré caduc par l'utilisateur (mock longue traîne déjà livré au P0).

## Tests

- 5 nouveaux tests `sprint5-radar-ux.test.ts` (pills "—" vs chiffre, tooltips contextuels).
- 2 nouveaux tests `douleur-intent-scanner-mode.test.ts` (scanner-inputs masqué/visible selon mode).
