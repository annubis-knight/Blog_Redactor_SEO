# Story 1.3: Phase ② Valider — Validation, Exploration, Audit, Local fusionné + retrait Content Gap

Status: done

## Story

As a consultant SEO,
I want les onglets de validation regroupés dans la Phase Valider avec Local fusionné et sans Content Gap,
so that je valide mes mots-clés candidats avec toutes les données disponibles dans un espace épuré.

## Acceptance Criteria

1. **Given** un article est sélectionné **When** l'utilisateur ouvre la Phase ② Valider **Then** il voit 4 onglets : Validation, Exploration, Audit, Local **And** le Content Gap n'apparaît PAS dans le Moteur.

2. **Given** l'utilisateur ouvre l'onglet Validation **When** il lance la vérification **Then** la Validation multi-sources (FR10) fonctionne comme avant avec les composants existants.

3. **Given** l'utilisateur ouvre l'onglet Exploration **When** il lance l'analyse **Then** l'Exploration SERP + autocomplete (FR11) fonctionne comme avant.

4. **Given** l'utilisateur ouvre l'onglet Audit **When** il consulte les données d'un mot-clé **Then** les données DataForSEO (volume, difficulté, CPC) s'affichent (FR12).

5. **Given** l'utilisateur ouvre l'onglet Local **When** l'onglet s'affiche **Then** il voit deux sections dans un même onglet : ① Comparaison Local/National et ② Maps & GBP **And** les deux sections fonctionnent comme avant.

## Tasks / Subtasks

- [x] Task 1 : Tests unitaires Phase ② Valider (AC: #1-5)
  - [x] 1.1 : Test phases structure — Phase ② contient 4 onglets (validation, exploration, audit, local)
  - [x] 1.2 : Test ContentGap — aucun onglet 'concurrents' ou 'content-gap' n'existe dans les phases
  - [x] 1.3 : Test Local fusionné — l'onglet 'local' existe dans Phase ② (pas 'maps' séparé)
  - [x] 1.4 : Test navigation Phase ② — cliquer sur chaque onglet émet le bon tabId
  - [x] 1.5 : Test cross-phase — naviguer de Phase ① vers Phase ② change la phase active

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**TOUT est déjà implémenté dans Story 1.1 :**
- Phase ② Valider avec 4 onglets (validation, exploration, audit, local) ✅
- ContentGapPanel retiré du Moteur (FR5) ✅
- LocalComparisonStep + MapsStep fusionnés dans un seul onglet 'local' ✅
- Tous les composants internes préservés (PainValidation, ExplorationInput, IntentStep, AutocompleteValidation, ExplorationVerdict, KeywordAuditTable, LocalComparisonStep, MapsStep) ✅

**RIEN à modifier dans le code source — seulement des tests à écrire.**

### Composants Phase ② dans MoteurView (déjà en place)

```
Phase ② Valider :
  - validation   → PainValidation (translatedKeywords, radarHeat)
  - exploration   → ExplorationInput + AutocompleteValidation + IntentStep + ExplorationVerdict
  - audit         → KeywordAuditTable + KeywordComparison + KeywordEditor + DiscoveryPanel
  - local         → <section> LocalComparisonStep + <section> MapsStep (fusionné)
```

### Cross-tab communication Phase ② (déjà fonctionnel)

```
PainValidation → @select → handleValidationSelect → exploration tab + intentStore.exploreKeyword
PainValidation → @back → activeTab = 'douleur' (retour Phase ①)
ExplorationVerdict → @continue → activeTab = 'audit'
ExplorationVerdict → @add-to-audit → auditStore.addKeyword
```

### Enforcement Guidelines

- Tests dans `tests/unit/components/`
- Pas de modifications de code source nécessaires

### Project Structure Notes

- Nouveau test : `tests/unit/components/moteur-phase-valider.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/implementation-artifacts/1-1-layout-3-phases-navigation-et-selection-article.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All Phase ② implementation was already done in Story 1.1 (MoteurView restructuring)
- 15 new unit tests validating: Phase ② structure (3), navigation (4), cross-phase (5), cross-tab communication (3)
- ContentGap absence verified, Local fusion verified, no maps/concurrents tabs exist
- TypeScript check passes, no regressions

### File List

- tests/unit/components/moteur-phase-valider.test.ts (NEW — 15 tests)
