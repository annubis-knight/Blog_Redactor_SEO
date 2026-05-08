---
name: Sprint 4 — Refonte cache-bar + recap-toggle
description: 4 frictions UX générales (#1 navigation par défaut, #2 chips read-only, #3 panel article redondant, #4 collapse au sélection)
type: tech-spec
status: ARCHIVED
version: 1.0.0
created: 2026-05-04
last_updated: 2026-05-04
---

> **🗄️ ARCHIVED — 2026-05-04** — Sprint livré, 22 tests verts.

# Sprint 4 — Refonte cache-bar + recap-toggle

## ACs implémentés

- **#1** — `computeSmartTab` ne retourne JAMAIS `'finalisation'`. Sélection d'article = navigation vers le 1er onglet utile à compléter (capitaine → lieutenants → lexique). Finalisation = CTA explicite uniquement.
- **#2** — Refonte `TabCachePanel` : chips `<button>` → `<span>` read-only. Plus d'event `navigate`. Classe `tcp__chip--current` (border bleue) supprimée. `cursor: default` partout.
- **#3** — `SelectedArticlePanel` supprimé (fichier + test). Redondant avec `MoteurContextRecap`. La progression survit via `ProgressDots` de la navbar.
- **#4** — Au clic sélection article, `recapRadioGroup.toggle()` referme le panel ouvert pour libérer l'espace vertical.

## Tests

- 7 nouveaux tests `tab-cache-panel-readonly.test.ts` (chips read-only, no navigate event, no `--current`).
- 5 tests `moteur-smart-tab.test.ts` (anti-régression #1 : finalisation jamais retournée).
- 3 tests `radar-keyword-card-interactions.test.ts` inversés (sprint 3 propagation).
- 2 tests legacy `tab-cache-panel.test.ts` retirés (par essence obsolètes).
