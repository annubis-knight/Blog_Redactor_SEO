---
name: Sprint 12 — Renommage useRadarCarousel → useExploredKeywords
version: 1.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 12 : Renommage useRadarCarousel → useExploredKeywords

## 1. Contexte

Décision produit (2026-05-06) : éliminer le terme « carousel » du codebase. Le mode workflow du Capitaine présente une **liste verticale** (CaptainRadarList), pas un carousel UI. Le composable conservait son nom historique (mode libre / Labo) qui n'a plus de sens.

L'utilisateur a aussi validé le terme **« exploredKeywords »** (préféré à « scanHistory ») car il englobe les recherches **manuelles** + **automatiques** que l'utilisateur fait sur l'onglet Capitaine.

## 2. Périmètre

### Renommage symbolique

| Avant | Après |
|-------|-------|
| `src/composables/keyword/useRadarCarousel.ts` | `src/composables/keyword/useExploredKeywords.ts` |
| `useRadarCarousel()` | `useExploredKeywords()` |
| `CarouselEntry` (interface) | `ExploredKeywordEntry` |
| `[useRadarCarousel]` (logs) | `[useExploredKeywords]` |

### Tests renommés (4 fichiers)

- `tests/unit/composables/useRadarCarousel.test.ts` → `useExploredKeywords.test.ts`
- `tests/unit/composables/useRadarCarousel-dedup.test.ts` → `useExploredKeywords-dedup.test.ts`
- `tests/unit/composables/useRadarCarousel-restore.test.ts` → `useExploredKeywords-restore.test.ts`
- `tests/unit/composables/useRadarCarousel-hydrate-scores.test.ts` → `useExploredKeywords-hydrate-scores.test.ts`

### Fichiers consommateurs adaptés (8 fichiers)

- `src/components/moteur/CaptainValidation.vue`
- `src/components/moteur/CaptainSidePanel.vue`
- `src/components/moteur/CaptainInteractiveWords.vue`
- `src/components/moteur/captain/CaptainRadarList.vue`
- `tests/unit/components/captain-validation.test.ts`
- `tests/unit/components/captain-validation-architecture.test.ts`
- `tests/unit/components/captain-validation-painpoint-frozen.test.ts`
- `tests/unit/components/captain-interactive-words.test.ts`
- `tests/unit/components/captain-side-panel.test.ts`

## 3. Hors-scope

- ❌ Renommage de la propriété TS `RichCaptain.validationHistory` → `exploredKeywords` — **Sprint 12B (futur)**, périmètre ~25 fichiers (front + back + types partagés + tests). Reporté pour limiter le risque de Sprint 12.
- ❌ Renommage des variables internes `carouselAiCache`, `carouselAiStreaming`, `carouselAiErrors` dans CaptainValidation.vue — possibles à faire en passing dans le Sprint 13 (refonte verrou).

## 4. FRs

### FR-CODE-NO-CAROUSEL (nouvelle, narrative)
Le terme « carousel » est éliminé du nommage des symboles publics côté frontend (composables, interfaces, fichiers de tests). Justification : en mode workflow (par défaut), le Capitaine présente une **liste verticale** de mots-clés explorés — pas un carousel UI. Le terme legacy datait du mode libre (Labo) où il y avait une vraie navigation carousel ; aujourd'hui il prête à confusion.

**Critères d'acceptation testables** :
- Recherche grep `useRadarCarousel|CarouselEntry` dans `src/`, `tests/`, `shared/` retourne 0 occurrence.
- Le composable est désormais accessible via `useExploredKeywords` exporté depuis `src/composables/keyword/useExploredKeywords.ts`.
- Tous les tests existants passent sans modification de logique.

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-12-rename-explored-keywords.

## 5. Validation

- `npm run type-check` ✅
- `tests/unit/components/captain*` + `tests/unit/composables/useExploredKeywords*` : 120 tests verts, 50 skipped (pré-existants)

## 6. Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Référence cachée à `CarouselEntry` dans un fichier non grep'é (commentaire ?) | Faible | Grep complet src+tests+shared, type-check vert prouve la cohérence |
| Imports dynamiques `import('./useRadarCarousel')` | Très faible | Aucun import dynamique trouvé pour ce composable |
| Collision avec un futur composable nommé `useExploredKeywords` ailleurs | Très faible | 1 seul composable de ce nom possible par convention |
