---
name: tech-spec-remove-labo-explorateur
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-05-10
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-LAB-*, FR-EXP-*, sections 8.11/8.12)
  - _bmad-output/implementation-artifacts/sprint-status.yaml
---

# Tech-spec — Suppression onglets Labo & Explorateur du Dashboard

## Contexte

L'utilisateur juge les onglets **Labo** (`/labo`) et **Explorateur** (`/explorateur`) inutiles depuis le dashboard. Le code et les flux liés doivent disparaître **sans casser le workflow Moteur** qui partage des stores, composables et composants bimodaux (prop `mode: 'workflow' | 'libre'`).

## Objectifs

- Plus d'accès `/labo` ni `/explorateur` (router + nav DashboardView).
- Suppression du code 100% dashboard-only (vues, composants `intent/*` exclusifs, `MapsStep`, `KeywordEditor`, `keywords/DiscoveryPanel`).
- Suppression des routes API orphelines (`/api/intent/*`, `/api/keywords/audit`, `/api/keywords/translate-pain`, `/api/local/maps`, `/api/keywords/compare-local`, `/api/keywords/autocomplete`) après vérification qu'aucun appel ne subsiste.
- Conservation des stores partagés (`intent.store`, `keyword-audit.store`, `local.store`) — consommés par Moteur via `useArticleResults`, `KeywordAuditTable`, `useKeywordScoring`. Nettoyage des actions qui deviennent orphelines.
- Conservation des composants bimodaux (`DiscoveryPanel.vue`, `CaptainPanel.vue`) qui restent utiles en `mode='workflow'`. Nettoyage de la prop `mode` reporté hors-scope (chantier futur si confirmé mort).
- Doc PRD/sprint-status à jour.

## Hors-scope

- Nettoyage de la prop `mode` sur composants bimodaux Moteur (chantier séparé après stabilisation).
- Suppression de `EnginePhase.vue` (production/) orphelin — sera détecté par knip mais traité hors de ce chantier.
- Refonte du dashboard.

## Cartographie (Phase 1.bis)

### Éléments 100% dashboard → SUPPRIMER

| Type | Fichier | Pourquoi |
|------|---------|----------|
| Vue | `src/views/LaboView.vue` | Page `/labo` |
| Vue | `src/views/ExplorateurView.vue` | Page `/explorateur` |
| Composant | `src/components/intent/PainTranslator.vue` | Labo `mode='libre'` only |
| Composant | `src/components/intent/PainValidation.vue` | Référencé seulement par `RowDetail` (orphelin via PainTranslator) |
| Composant | `src/components/intent/RowDetail.vue` | Utilisé seulement par `PainValidation` |
| Composant | `src/components/intent/AutocompleteValidation.vue` | Explorateur `mode='libre'` only |
| Composant | `src/components/intent/AutocompleteChips.vue` | Utilisé seulement par `AutocompleteValidation` |
| Composant | `src/components/intent/ExplorationInput.vue` | Explorateur `mode='libre'` only |
| Composant | `src/components/intent/ExplorationVerdict.vue` | Explorateur `mode='libre'` only |
| Composant | `src/components/intent/IntentStep.vue` | Explorateur `mode='libre'` only |
| Composant | `src/components/intent/LocalComparisonStep.vue` | Explorateur `mode='libre'` only |
| Composant | `src/components/local/MapsStep.vue` | Explorateur `mode='libre'` only, jamais en workflow |
| Composant | `src/components/keywords/KeywordEditor.vue` | Utilisé uniquement par ExplorateurView |
| Composant | `src/components/keywords/DiscoveryPanel.vue` (≠ moteur/DiscoveryPanel) | Utilisé uniquement par ExplorateurView |
| Composable | `src/composables/intent/useIntentVerdict.ts` | Utilisé seulement par `ExplorationVerdict` |
| Route API | `POST /api/intent/analyze` | Appelée seulement par `IntentStep` |
| Route API | `POST /api/keywords/compare-local` | Appelée seulement par `LocalComparisonStep` |
| Route API | `POST /api/keywords/autocomplete` | Appelée seulement par `AutocompleteValidation` |
| Route API | `POST /api/keywords/audit` | Appelée seulement par `ExplorateurView.fetchAudit` |
| Route API | `POST /api/keywords/translate-pain` | Appelée seulement par `PainTranslator` |
| Route API | `POST /api/local/maps` | Appelée seulement par `useLocalStore.analyzeMaps` |

### À GARDER (utilisés par Moteur)

- `src/composables/keyword/useDiscoveryPanel.ts` — utilisé par MoteurView + DiscoveryPanel(moteur) en mode workflow
- `src/composables/keyword/useKeywordScoring.ts` — utilisé par KeywordAuditTable, KeywordComparison
- `src/composables/editor/useArticleResults.ts` — utilisé par MoteurView
- `src/components/moteur/DiscoveryPanel.vue` — bimodal, mode workflow utilisé par MoteurView
- `src/components/moteur/CaptainPanel.vue` — bimodal, mode workflow utilisé par MoteurView
- `src/components/intent/RadarPanel.vue` + `src/components/intent/scanner/*` + `src/components/intent/radar-card/*` — utilisés par MoteurView (Radar)
- `src/components/keywords/KeywordAuditTable.vue` + `KeywordComparison.vue` — utilisés par `LieutenantsPanel.vue` (Moteur)
- Stores `intent.store`, `keyword-audit.store`, `local.store` — consommés par composables/composants Moteur. **Nettoyer leurs actions devenues orphelines** (analyzeIntent, compareLocalNational, validateAutocomplete, fetchAudit, analyzeMaps).

## Plan d'exécution — 3 sprints

### Sprint A — Suppression UI (front)

1. Retirer routes `/labo` et `/explorateur` de `src/router/index.ts`.
2. Retirer boutons nav dans `src/views/DashboardView.vue`.
3. Supprimer `LaboView.vue` et `ExplorateurView.vue`.
4. Supprimer composants 100% dashboard listés ci-dessus.
5. Supprimer `useIntentVerdict` composable (orphelin après).
6. Supprimer tests correspondants : `tests/unit/components/labo-view.test.ts`, `tests/unit/views/explorateur-view.test.ts`, tests browser-e2e dashboard navigation labo/explorateur.

**ACs Sprint A** :
- AC-A1 : `npm run type-check` vert.
- AC-A2 : `npm run lint` vert.
- AC-A3 : `npm run test:unit` vert.
- AC-A4 : `npm run build` vert.
- AC-A5 : `git grep "LaboView\|ExplorateurView\|/labo\|/explorateur"` retourne uniquement docs (pas de code actif).

### Sprint B — Nettoyage post-suppression (knip + backend)

1. `npm run check:dead` → liste exports/fichiers morts.
2. Supprimer routes API orphelines :
   - Supprimer fichier `server/routes/intent.routes.ts` complet (les 3 routes deviennent orphelines).
   - Retirer enregistrement dans `server/index.ts` (`/api/intent`).
   - Retirer routes `audit` et `translate-pain` de `server/routes/keywords.routes.ts`.
   - Supprimer fichier `server/routes/local.routes.ts` complet (route unique `/api/local/maps`) + désenregistrer.
3. Supprimer services/handlers backend devenus orphelins :
   - `server/services/intent/intent.service.ts` (export `analyzeIntent`, `compareLocalNational`, `validateAutocomplete` — vérifier si utilisé ailleurs).
   - Service `keyword-audit` si exclusif.
   - Service `pain-translator` si exclusif.
   - Service `local/maps` si exclusif (ou conserver seulement les fonctions utilisées par d'autres routes).
4. Nettoyer actions orphelines des stores :
   - `intent.store.ts` : retirer `analyzeIntent`, `compareLocalNational`, `validateAutocomplete` ; conserver state hydratable depuis cache.
   - `keyword-audit.store.ts` : retirer `fetchAudit`.
   - `local.store.ts` : retirer `analyzeMaps`.
5. Supprimer tests backend des routes/services supprimés.
6. Mettre à jour `tests/.baseline.json` via `npm run test:snapshot`.

**ACs Sprint B** :
- AC-B1 : `npm run check:health` vert (lint + type-check + cycles + dead + arch).
- AC-B2 : `npm run test:unit` vert.
- AC-B3 : `npm run build` vert.
- AC-B4 : `npm run test:browser` vert (kill-ports auto via pretest:browser).
- AC-B5 : Aucune route `/api/intent/*`, `/api/keywords/audit`, `/api/keywords/translate-pain`, `/api/local/maps`, `/api/keywords/compare-local`, `/api/keywords/autocomplete` ne renvoie 200.

### Sprint C — Doc + clôture

1. **PRD** :
   - Marquer FR-LAB-*, FR-EXP-* comme **DEPRECATED** avec note de retrait + date.
   - Sections 8.11 (Labo) et 8.12 (Explorateur) : ajouter bandeau **REMOVED 2026-05-10** en tête, conserver le texte historique.
   - Retirer Journey 2 (Labo) et autres mentions opérationnelles dans le PRD principal (parcours utilisateurs).
   - Retirer ligne table `FR-LAB` / `FR-EXP` de la légende préfixes (ligne 59-60).
2. **sprint-status.yaml** : ajouter entrée chantier "remove-labo-explorateur" — done.
3. **ARCHITECTURE_FLOWS.md** : retirer mentions des endpoints supprimés.
4. **docs/data-flows/local.md** : marquer obsolète ou supprimer si entièrement lié à `/api/local/maps`.
5. **CHANGELOG/clôture** : commit final + bump tech-spec en `status: done` + déplacement dans `_archive/` si stable.

**ACs Sprint C** :
- AC-C1 : PRD ne mentionne plus FR-LAB/FR-EXP comme actifs.
- AC-C2 : sprint-status.yaml inclut le chantier.
- AC-C3 : `npm run check:health` toujours vert.

## Risques & mitigations

- **Risque 1** — Une route ou un store paraissant orphelin est en réalité appelé par un test ou un script externe (cron, CI).
  - *Mitigation* : grep avant suppression dans `tests/`, `scripts/`, `server/jobs/`.
- **Risque 2** — Suppression d'une méthode partagée du store casse `useArticleResults` (qui appelle peut-être `restore` ou des selectors).
  - *Mitigation* : conserver state + getters + reset des stores ; ne supprimer que les actions network confirmées orphelines.
- **Risque 3** — Tests browser dépendent de `/labo` ou `/explorateur` dans des fixtures.
  - *Mitigation* : mettre à jour tests browser-e2e ; lancer `npm run test:browser` en fin de Sprint B.

## Validation finale (Phase 5)

```bash
npm run lint && npm run type-check && npm run test:unit && npm run check:dead && npm run check:cycles && npm run build && npm run test:browser
```

## Clôture (Phase 6)

- bump `version: 1.0.0`, `status: done`, `last_updated`
- mv vers `_bmad-output/implementation-artifacts/_archive/`
- commit + merge dans `main` après confirmation utilisateur
- `git branch -d chore/remove-labo-explorateur && git push origin --delete chore/remove-labo-explorateur`
