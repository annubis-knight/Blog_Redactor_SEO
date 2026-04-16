---
title: 'Refacto Architecture — God Components, API Service, Code DRY'
slug: 'refacto-architecture-v1'
created: '2026-04-09'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3.4', 'TypeScript 5', 'Pinia 2', 'Vitest']
files_to_modify:
  - 'src/components/moteur/CaptainValidation.vue'
  - 'src/components/moteur/LieutenantsSelection.vue'
  - 'src/composables/useKeywordDiscoveryTab.ts'
  - 'src/composables/useMultiSourceVerdict.ts'
  - 'src/utils/seo-calculator.ts'
  - 'src/utils/geo-calculator.ts'
  - 'src/services/api.service.ts'
files_to_create:
  - 'src/components/moteur/CaptainInput.vue'
  - 'src/components/moteur/CaptainVerdictPanel.vue'
  - 'src/components/moteur/CaptainCarousel.vue'
  - 'src/components/moteur/CaptainAiPanel.vue'
  - 'src/components/moteur/CaptainInteractiveWords.vue'
  - 'src/components/moteur/CaptainLockPanel.vue'
  - 'src/components/moteur/LieutenantSerpAnalysis.vue'
  - 'src/components/moteur/LieutenantH2Structure.vue'
  - 'src/components/moteur/LieutenantProposals.vue'
  - 'src/components/moteur/LieutenantCardGrid.vue'
  - 'src/composables/useDiscoveryCache.ts'
  - 'src/composables/useRelevanceScoring.ts'
  - 'src/composables/useDiscoverySelection.ts'
  - 'src/utils/text-utils.ts'
  - 'src/constants/french-nlp.ts'
code_patterns:
  - 'Stores Pinia en composition API'
  - 'Composables single-responsibility'
  - 'Props down, emits up'
  - 'CSS variables --color-*'
test_patterns:
  - 'Vitest + @vue/test-utils mount()'
  - 'Tests de composants via data-testid'
---

# Tech-Spec: Refacto Architecture — God Components, API Service, Code DRY

**Created:** 2026-04-09

## Overview

### Problem Statement

L'application souffre de 3 problèmes architecturaux :

1. **God Components** — 3 fichiers dépassent 850 lignes et cumulent trop de responsabilités :
   - `CaptainValidation.vue` (1 636 lignes, 8 responsabilités)
   - `LieutenantsSelection.vue` (1 514 lignes, 7 responsabilités)
   - `useKeywordDiscoveryTab.ts` (850 lignes, 9 responsabilités)
2. **Code dupliqué** :
   - `FRENCH_STOPWORDS` défini 2 fois avec des listes différentes (25 vs 13 mots)
   - `stripHtml()` défini à l'identique dans `seo-calculator.ts` et `geo-calculator.ts`
3. **API Service répétitif** — Le même bloc de gestion d'erreur (8 lignes) est copié 5 fois dans `api.service.ts`

### Solution

- **Phase 1 (Quick wins)** : Consolider le code dupliqué + refactorer le service API
- **Phase 2 (Refacto majeure)** : Décomposer les god components en sous-composants et sous-composables

### Scope

**In Scope :**
- Décomposition de CaptainValidation en 6 sous-composants
- Décomposition de LieutenantsSelection en 4 sous-composants
- Extraction de 3 composables depuis useKeywordDiscoveryTab
- Consolidation de `FRENCH_STOPWORDS` dans un fichier centralisé
- Consolidation de `stripHtml()` dans un utilitaire partagé
- Extraction du handler d'erreur API en helper function
- Tests unitaires pour les nouveaux composants/composables

**Out of Scope :**
- Changements fonctionnels / nouvelles features
- Modifications de style CSS
- Autres god components (BrainPhase.vue, EnginePhase.vue)

## Context for Development

### Technical Decisions

1. **Découpage par responsabilité, pas par taille** : chaque sous-composant gère UNE responsabilité. Même si un sous-composant fait 200 lignes, c'est OK tant qu'il ne fait qu'un truc.
2. **Props down, emits up** : les sous-composants reçoivent des données via props et communiquent vers le parent via emits. Pas de store direct dans les sous-composants quand le parent peut faire le relais.
3. **Rétro-compatibilité** : les composants parents (CaptainValidation, LieutenantsSelection) gardent la même API externe (mêmes props, mêmes emits). Seul l'intérieur change.
4. **Composables single-responsibility** : chaque nouveau composable extrait de useKeywordDiscoveryTab a un seul rôle et retourne `{ state, actions }`.

## Implementation Plan

### Tasks

#### Phase 1 — Quick Wins DRY (Priorité 1, ~2h)

- [x] **Task 1 : Créer `src/constants/french-nlp.ts`**
  - Action : Créer le fichier avec la liste COMPLÈTE de stopwords (union des 2 listes existantes + les stopwords de `keyword-matcher.ts`) :
    ```typescript
    export const FRENCH_STOPWORDS = new Set([
      'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'en',
      'à', 'au', 'aux', 'ce', 'ces', 'cette', 'est', 'sont', 'pour', 'par',
      'sur', 'dans', 'avec', 'que', 'qui', 'ne', 'pas', 'plus', 'se', 'son',
      'sa', 'ses', 'leur', 'leurs', 'nous', 'vous', 'ils', 'elles', 'mon',
      'ma', 'mes', 'ton', 'ta', 'tes', 'je', 'tu', 'il', 'elle', 'on',
      // ... compléter avec l'union des 3 sources
    ])
    ```

- [x] **Task 2 : Remplacer les imports de FRENCH_STOPWORDS**
  - Files : `src/composables/useCapitaineValidation.ts` (L19-26), `src/composables/useMultiSourceVerdict.ts` (L37-42), `src/components/moteur/CaptainValidation.vue` (L4)
  - Action : Supprimer les définitions locales, importer depuis `@/constants/french-nlp`

- [x] **Task 3 : Créer `src/utils/text-utils.ts`**
  - Action : Extraire `stripHtml()` :
    ```typescript
    export function stripHtml(html: string): string {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }
    ```

- [x] **Task 4 : Remplacer les stripHtml dupliqués**
  - Files : `src/utils/seo-calculator.ts` (L35-36), `src/utils/geo-calculator.ts` (L21-22)
  - Action : Supprimer les fonctions locales, importer depuis `@/utils/text-utils`

- [x] **Task 5 : Refactorer `api.service.ts`**
  - File : `src/services/api.service.ts`
  - Action : Extraire le handler d'erreur en helper interne :
    ```typescript
    async function handleApiError(res: Response, method: string, path: string): Promise<never> {
      const json = await res.json().catch(() => null)
      const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
      log.error(`${method} /api${path} — ${message}`)
      throw new Error(message)
    }
    ```
    Puis chaque méthode devient : `if (!res.ok) await handleApiError(res, 'GET', path)`
  - Notes : Élimine 35 lignes de boilerplate

#### Phase 2A — Décomposition CaptainValidation (Priorité 2)

- [x] **Task 6 : Créer `CaptainInput.vue`**
  - File : `src/components/moteur/CaptainInput.vue`
  - Responsabilité : Champ de saisie du mot-clé + composition check
  - Props : `selectedArticle`, `mode`, `compositionWarnings[]`, `isLoading`
  - Emits : `submit(keyword: string)`
  - Lignes extraites de CaptainValidation : ~100 lignes (input, validation, KPI labels)

- [x] **Task 7 : Créer `CaptainVerdictPanel.vue`**
  - File : `src/components/moteur/CaptainVerdictPanel.vue`
  - Responsabilité : Affichage du verdict (thermomètre, KPIs, feedback NO-GO)
  - Props : `verdict: VerdictLevel`, `kpis: KpiResult[]`, `articleLevel: ArticleLevel`
  - Emits : aucun (display only)
  - Lignes extraites : ~100 lignes

- [x] **Task 8 : Créer `CaptainCarousel.vue`**
  - File : `src/components/moteur/CaptainCarousel.vue`
  - Responsabilité : Navigation entre les entrées radar, gestion de l'historique
  - Props : `entries: CarouselEntry[]`, `currentIndex: number`, `lockedKeyword: string | null`
  - Emits : `navigate(index: number)`, `lock(keyword: string)`, `send-to-lieutenants(payload)`
  - Lignes extraites : ~180 lignes

- [x] **Task 9 : Créer `CaptainAiPanel.vue`**
  - File : `src/components/moteur/CaptainAiPanel.vue`
  - Responsabilité : Panneau IA streaming avec markdown rendu
  - Props : `chunks: string`, `isStreaming: boolean`, `error: string | null`
  - Emits : `abort()`
  - Notes : Utilise `marked` pour le rendu markdown + `v-safe-html` (de Spec 1)
  - Lignes extraites : ~100 lignes

- [x] **Task 10 : Créer `CaptainInteractiveWords.vue`**
  - File : `src/components/moteur/CaptainInteractiveWords.vue`
  - Responsabilité : Toggle des mots significatifs, sélection de variantes
  - Props : `words: string[]`, `activeCount: number`, `minActiveCount: number`, `loading: boolean`
  - Emits : `word-toggle(activeCount: number)`, `variant-change(variant: string)`
  - Lignes extraites : ~80 lignes

- [x] **Task 11 : Créer `CaptainLockPanel.vue`**
  - File : `src/components/moteur/CaptainLockPanel.vue`
  - Responsabilité : Boutons lock/unlock du capitaine
  - Props : `isLocked: boolean`, `canLock: boolean`, `keyword: string`
  - Emits : `lock()`, `unlock()`
  - Lignes extraites : ~45 lignes

- [x] **Task 12 : Refactorer CaptainValidation.vue comme orchestrateur**
  - File : `src/components/moteur/CaptainValidation.vue`
  - Action : Garder la logique d'orchestration (composable useCapitaineValidation, useCompositionCheck, useRadarCarousel) et remplacer les blocs template par les nouveaux sous-composants
  - Objectif : réduire de ~1636 lignes à ~400 lignes

#### Phase 2B — Décomposition LieutenantsSelection (Priorité 3)

- [x] **Task 13 : Créer `LieutenantSerpAnalysis.vue`**
  - File : `src/components/moteur/LieutenantSerpAnalysis.vue`
  - Responsabilité : Analyse SERP, slider de concurrents
  - Props : `selectedArticle`, `rootKeywords: string[]`, `captainKeyword: string`
  - Emits : `serp-loaded(result)`, `slider-change(value: number)`
  - Lignes extraites : ~100 lignes

- [x] **Task 14 : Créer `LieutenantH2Structure.vue`**
  - File : `src/components/moteur/LieutenantH2Structure.vue`
  - Responsabilité : Tabs H2, récurrence, structure hiérarchique
  - Props : `competitors: SerpCompetitor[]`, `activeTab: string`
  - Emits : `tab-change(tab: string)`, `structure-saved()`
  - Lignes extraites : ~120 lignes

- [x] **Task 15 : Créer `LieutenantProposals.vue`**
  - File : `src/components/moteur/LieutenantProposals.vue`
  - Responsabilité : Streaming IA des propositions de lieutenants, filtrage
  - Props : `serpResult`, `captainKeyword`, `articleLevel`
  - Emits : `proposals-ready(cards: LieutenantCard[])`
  - Lignes extraites : ~150 lignes

- [x] **Task 16 : Créer `LieutenantCardGrid.vue`**
  - File : `src/components/moteur/LieutenantCardGrid.vue`
  - Responsabilité : Grille de cartes lieutenant, sélection, lock
  - Props : `cards: LieutenantCard[]`, `selectedIds: Set<string>`, `isLocked: boolean`
  - Emits : `toggle(cardId: string)`, `lock()`, `unlock()`
  - Lignes extraites : ~80 lignes

- [x] **Task 17 : Refactorer LieutenantsSelection.vue comme orchestrateur**
  - File : `src/components/moteur/LieutenantsSelection.vue`
  - Action : Orchestration + sous-composants. Objectif : ~400 lignes

#### Phase 2C — Extraction de composables depuis useKeywordDiscoveryTab (Priorité 4)

- [x] **Task 18 : Créer `useDiscoveryCache.ts`**
  - File : `src/composables/useDiscoveryCache.ts`
  - Responsabilité : Opérations cache (check, load, save, clear)
  - Extrait des lignes 585-663 de useKeywordDiscoveryTab
  - Return : `{ checkCache, loadFromCache, saveToCache, clearCache, cacheStatus }`

- [x] **Task 19 : Créer `useRelevanceScoring.ts`**
  - File : `src/composables/useRelevanceScoring.ts`
  - Responsabilité : Scoring sémantique, filtrage par seuils, two-pass scoring
  - Extrait des lignes 156-209 et 411-473
  - Return : `{ relevanceScores, fetchRelevanceScores, filterByRelevance, resetScores }`

- [x] **Task 20 : Créer `useDiscoverySelection.ts`**
  - File : `src/composables/useDiscoverySelection.ts`
  - Responsabilité : Tracking de sélection, opérations bulk (select-all, deselect)
  - Extrait des lignes 505-577
  - Return : `{ selectedKeywords, toggleSelection, selectAllBySource, deselectAll, selectionCount }`

- [x] **Task 21 : Refactorer useKeywordDiscoveryTab.ts**
  - File : `src/composables/useKeywordDiscoveryTab.ts`
  - Action : Importer et composer les 3 nouveaux composables. Garder la logique d'orchestration (discover, main flow). Objectif : ~350 lignes

#### Phase 3 — Tests

- [x] **Task 22 : Tests des sous-composants CaptainValidation**
  - File : `tests/unit/components/captain-sub-components.test.ts`
  - Action :
    - `CaptainInput` : `it('émet submit quand on valide le keyword')`, `it('affiche les warnings de composition')`
    - `CaptainVerdictPanel` : `it('affiche le thermomètre au bon niveau')`, `it('affiche les KPIs')`
    - `CaptainLockPanel` : `it('désactive le lock si canLock est false')`, `it('émet lock au clic')`

- [x] **Task 23 : Tests des composables extraits**
  - File : `tests/unit/composables/discovery-extracts.test.ts`
  - Action :
    - `useDiscoveryCache` : `it('sauvegarde et charge depuis le cache')`, `it('clear supprime le cache')`
    - `useRelevanceScoring` : `it('score les keywords par pertinence sémantique')`, `it('filtre en dessous du seuil')`
    - `useDiscoverySelection` : `it('toggle ajoute/retire de la sélection')`, `it('selectAll sélectionne par source')`

- [x] **Task 24 : Tests code DRY**
  - File : `tests/unit/utils/text-utils.test.ts`
  - Action :
    - `stripHtml` : `it('supprime les tags HTML')`, `it('normalise les espaces')`, `it('gère les strings vides')`
    - `FRENCH_STOPWORDS` : `it('contient au moins 40 stopwords')`, `it('contient les mots communs')`

## Additional Context

### Dependencies

Aucune nouvelle dépendance. Refactoring pur.

### Testing Strategy

- ~15 cas de test pour les sous-composants (Tasks 22-23)
- ~6 cas de test pour les utilitaires DRY (Task 24)
- Tests d'intégration : vérifier que CaptainValidation et LieutenantsSelection fonctionnent identiquement après refacto (mêmes data-testid, mêmes emits)

### Notes

**Risques :**
1. **Régression fonctionnelle** : Le découpage ne doit PAS changer le comportement visible. Garder les mêmes `data-testid` pour que les tests existants passent.
2. **CSS scoped** : Les styles scoped de CaptainValidation devront être répartis dans les sous-composants. Attention aux sélecteurs `:deep()` qui ciblent des enfants.
3. **Ordre d'implémentation** : Phase 1 d'abord (quick wins), puis Phase 2A (CaptainValidation), puis 2B et 2C. CaptainValidation est le plus gros et le plus risqué.

**Métriques de succès :**
- Aucun fichier > 500 lignes après refacto
- Tous les tests existants passent sans modification
- Zéro changement fonctionnel visible

## Review Notes
- Adversarial review completed
- Findings: 17 total, 6 fixed, 11 skipped (noise/undecided)
- Resolution approach: auto-fix
- Fixed: F1 (loadFromCacheAndHydrate double-set scores), F2 (CaptainAiPanel defaultOpen prop), F4 (CaptainLockPanel wrapper testid), F6 (dead LieutenantCardGrid.vue deleted), F13 (circular type dep resolved), F16 (type import from .vue moved to shared types)
