---
title: 'Refonte SeoPanel — Onglets + Onglet Mots-clefs'
slug: 'refonte-seo-panel-onglets'
created: '2026-04-08'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3', 'Pinia', 'TypeScript', 'Composition API', 'Vitest']
files_to_modify: ['src/components/panels/SeoPanel.vue', 'src/components/panels/KeywordListPanel.vue (new)']
code_patterns: ['Store-driven components (no props from parent)', 'v-if/v-show lazy tab pattern (MoteurView)', 'Standalone presentational sub-components']
test_patterns: ['Vitest + Pinia createPinia() + describe/it/expect', 'No existing panel component tests']
---

# Tech-Spec: Refonte SeoPanel — Onglets + Onglet Mots-clefs

**Created:** 2026-04-08

## Overview

### Problem Statement

Le SeoPanel (`src/components/panels/SeoPanel.vue`) est une liste plate de sections empilées verticalement. Dans un sidebar étroit (~250-300px), la navigation entre les sections est fastidieuse. De plus, il n'y a aucune visibilité rapide sur les mots-clefs validés (capitaine, lieutenants, lexique) pendant la phase de rédaction.

### Solution

Transformer les sections existantes du SeoPanel en onglets horizontaux scrollables, placés sous la section score globale (qui reste fixe). Ajouter un nouvel onglet "Mots-clefs" comme onglet par défaut, offrant un dropdown à 4 catégories (Capitaine, Lieutenants, Lexique, NLP) affichant les termes validés dans le workflow Moteur.

### Scope

**In Scope:**
- Score-section reste fixe en haut (inchangé)
- Container d'onglets horizontaux scrollables sous le score
- Onglets : Mots-clefs (défaut), Hiérarchie, Balises, Checklist, Facteurs
- Suppression de l'onglet Densité (conserver les fonctions de calcul dans `seo-calculator.ts`)
- Suppression du Sommaire du SeoPanel (déjà affiché dans ArticleWorkflowView via OutlineRecap)
- Onglet "Mots-clefs" avec dropdown 4 options (Capitaine, Lieutenants, Lexique, NLP) — une seule catégorie visible à la fois
- Les mots-clefs affichés proviennent de `article-keywords.store` (données validées/verrouillées dans le Moteur)
- Nouveau composant dédié pour l'affichage des listes de mots-clefs (extensible pour futurs calculs)
- Réutilisation maximale de l'existant

**Out of Scope:**
- Calculs/scores par mot-clef individuel (futur)
- Modification des mots-clefs depuis le SeoPanel
- Refactoring du scoring SEO

## Context for Development

### Codebase Patterns

- **Store-driven** : SeoPanel consomme `useSeoStore()` et `useOutlineStore()` directement, pas de props du parent. Même pattern pour `useArticleKeywordsStore()`.
- **Lazy tabs (v-if/v-show)** : MoteurView utilise `visitedTabs` + `watch(activeTab)` pour créer les onglets au premier accès et les garder en vie ensuite. Pattern à réutiliser.
- **Composants présentationnels standalone** : `KeywordDensity.vue`, `SeoChecklist.vue`, `NlpTerms.vue` reçoivent leurs données via props et sont réutilisables tel quel.
- **Pas de composant tab générique** : Le projet utilise des implémentations custom à chaque fois (chip buttons, segment controls).

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/panels/SeoPanel.vue` | Composant principal à refactorer — ajout tabs, suppression densité/sommaire |
| `src/components/panels/KeywordDensity.vue` | Composant densité — NE PAS supprimer, retirer uniquement du template SeoPanel |
| `src/components/panels/SeoChecklist.vue` | Composant checklist — réutiliser tel quel dans onglet Checklist |
| `src/components/panels/NlpTerms.vue` | Composant NLP — réutiliser dans dropdown Mots-clefs (option NLP) |
| `src/stores/seo.store.ts` | Store SEO — fournit `score.nlpTerms`, `score.headingValidation`, `score.metaAnalysis`, etc. |
| `src/stores/article-keywords.store.ts` | Store mots-clefs — fournit `capitaine`, `lieutenants`, `lexique` |
| `src/utils/seo-calculator.ts` | Fonctions de calcul — `calculateKeywordDensity()`, `detectNlpTerms()` à conserver intacts |
| `src/views/MoteurView.vue` | Pattern tabs (v-if/v-show + visitedTabs) à réutiliser |
| `shared/types/seo.types.ts` | Types : `SeoScore`, `KeywordDensity`, `NlpTermResult`, `ChecklistItem` |

### Technical Decisions

1. **Tabs inline dans SeoPanel** : Pas de composant tab générique — le pattern inline v-if/v-show de MoteurView est suffisant et cohérent avec le projet.
2. **Nouveau composant `KeywordListPanel.vue`** : Composant dédié pour afficher les listes de mots-clefs par catégorie (Capitaine, Lieutenants, Lexique). Extensible pour futurs calculs. Reçoit les données du `article-keywords.store`.
3. **NlpTerms réutilisé** : Le composant NlpTerms.vue existant est intégré comme 4ème option du dropdown, pas de nouveau composant NLP.
4. **Densité retirée du template uniquement** : On supprime l'import et l'usage de `KeywordDensity` dans SeoPanel.vue, mais le composant et les fonctions de calcul restent intacts.
5. **Sommaire supprimé** : Le rendu inline du sommaire est retiré du SeoPanel (déjà dupliqué dans ArticleWorkflowView via OutlineRecap). L'import de `useOutlineStore` est retiré si plus aucune référence.

## Implementation Plan

### Tasks

- [x] Task 1: Créer le composant `KeywordListPanel.vue`
  - File: `src/components/panels/KeywordListPanel.vue` (nouveau)
  - Action: Créer un composant présentationnel qui reçoit en props les mots-clefs par catégorie et affiche une liste de termes. Le composant affiche chaque mot-clef comme un tag/badge cliquable (préparé pour les futurs calculs). Il doit supporter 3 types de données : un string unique (capitaine), un tableau de strings (lieutenants), un tableau de strings (lexique).
  - Props: `keywords: string[]`, `label: string` (nom de la catégorie)
  - Notes: Le composant doit être extensible — chaque mot-clef est rendu dans un élément distinct (pas un simple join). Utiliser le style des tags existants (`.nlp-tag` de NlpTerms.vue comme référence visuelle). Afficher un compteur `N terme(s)` en haut de la liste. Si la liste est vide (ou ne contient que des strings vides), afficher "Aucun terme défini". **IMPORTANT (F1/F12)** : Filtrer les strings vides avant le rendu via un computed : `const filteredKeywords = computed(() => props.keywords.filter(k => k.trim() !== ''))`.

- [x] Task 2: Refactorer le `<script setup>` de `SeoPanel.vue`
  - File: `src/components/panels/SeoPanel.vue`
  - Action:
    - Ajouter import de `useArticleKeywordsStore` depuis `@/stores/article-keywords.store`
    - Ajouter import de `KeywordListPanel` depuis `@/components/panels/KeywordListPanel.vue`
    - Supprimer import de `KeywordDensity` (composant retiré du template)
    - Supprimer import de `useOutlineStore` (sommaire supprimé)
    - Ajouter la logique de tabs : `activeTab` ref avec type union `'mots-clefs' | 'hierarchie' | 'balises' | 'checklist' | 'facteurs'`, valeur par défaut `'mots-clefs'`
    - Ajouter `visitedTabs` ref initialisé à `{ 'mots-clefs': true }` (onglet par défaut pré-visité) et `watch(activeTab, (tab) => { visitedTabs.value[tab] = true })` pour lazy loading (pattern MoteurView) **(F8)**
    - Ajouter `keywordCategory` ref avec type `'capitaine' | 'lieutenants' | 'lexique' | 'nlp'`, valeur par défaut `'capitaine'`
    - Ajouter computed `currentKeywords` avec null guard **(F1/F2)** :
      ```ts
      const currentKeywords = computed(() => {
        const kw = articleKeywordsStore.keywords
        if (!kw) return []
        switch (keywordCategory.value) {
          case 'capitaine': return kw.capitaine ? [kw.capitaine] : []
          case 'lieutenants': return kw.lieutenants ?? []
          case 'lexique': return kw.lexique ?? []
          default: return []
        }
      })
      ```
    - Ajouter computed `currentKeywordLabel` **(F5)** :
      ```ts
      const CATEGORY_LABELS: Record<string, string> = {
        capitaine: 'Capitaine',
        lieutenants: 'Lieutenants',
        lexique: 'Lexique',
        nlp: 'Termes NLP',
      }
      const currentKeywordLabel = computed(() => CATEGORY_LABELS[keywordCategory.value] ?? '')
      ```
  - Notes: Conserver l'instanciation de `useSeoStore()`. Supprimer `const outlineStore = useOutlineStore()` et tout code lié au sommaire (import + instanciation). **(F4/F7)** La suppression de l'import `useOutlineStore` EST couplée à la suppression du template sommaire dans Task 5 — les deux doivent être faits ensemble.

- [x] Task 3: Refactorer le `<template>` de `SeoPanel.vue` — Section fixe + barre d'onglets
  - File: `src/components/panels/SeoPanel.vue`
  - Action:
    - Conserver la `div.panel-section.score-section` (ScoreGauge + word count) en haut, inchangée
    - Conserver le `panel-warning` (hasArticleKeywords) au-dessus du score, inchangé
    - Sous le score, ajouter un container `div.seo-tabs` contenant des boutons d'onglets horizontaux scrollables
    - Chaque bouton : `<button class="seo-tab" :class="{ active: activeTab === id }" @click="activeTab = id">{{ label }}</button>`
    - Onglets dans l'ordre : Mots-clefs, Hiérarchie, Balises, Checklist, Facteurs
    - Sous la barre d'onglets, un `div.tab-content` qui contient les 5 panneaux avec le pattern v-if/v-show
  - Notes: La barre d'onglets doit être `overflow-x: auto` avec `white-space: nowrap` pour le scroll horizontal. Masquer la scrollbar avec `-webkit-scrollbar: none`.

- [x] Task 4: Refactorer le `<template>` — Contenu de l'onglet "Mots-clefs"
  - File: `src/components/panels/SeoPanel.vue`
  - Action:
    - Dans le panneau `mots-clefs`, ajouter un `<select>` dropdown en haut avec les 4 options : Capitaine, Lieutenants, Lexique, NLP
    - Lier le select à `keywordCategory` via v-model
    - Quand catégorie = `capitaine`, `lieutenants` ou `lexique` : afficher `<KeywordListPanel :keywords="currentKeywords" :label="currentKeywordLabel" />`
    - Quand catégorie = `nlp` : afficher `<NlpTerms :terms="seoStore.score?.nlpTerms ?? []" />` **(F3/F6)** — le guard `?.` évite le crash si `score` est null, et le `?? []` passe un array vide au composant qui affichera son message "Aucun terme NLP disponible"
    - Si `!articleKeywordsStore.hasKeywords` et catégorie ≠ `nlp` : afficher un message "Aucun mot-clé défini. Configurez le Capitaine dans le Moteur."
  - Notes: Le select doit utiliser le style natif compact, cohérent avec le panel étroit. Pas de librairie UI supplémentaire. Le dropdown NLP reste fonctionnel même sans keywords définis (les NLP viennent du score SEO, pas du store keywords).

- [x] Task 5: Refactorer le `<template>` — Onglets Hiérarchie, Balises, Checklist, Facteurs
  - File: `src/components/panels/SeoPanel.vue`
  - Action:
    - **Onglet Hiérarchie** : Reprendre le contenu existant du `headingValidation` (validation-ok / validation-errors) tel quel
    - **Onglet Balises** : Reprendre le contenu existant du `metaAnalysis` (meta-item title + description) tel quel
    - **Onglet Checklist** : Reprendre `<SeoChecklist :items="..." :has-article-keywords="..." />` tel quel
    - **Onglet Facteurs** : Reprendre le contenu existant du `factor-list` (6 factor-items) tel quel
    - Supprimer : la section Densité (KeywordDensity), la section Sommaire (outline-recap lignes 71-85 du SeoPanel actuel), la section NLP standalone (déplacée dans dropdown Mots-clefs) **(F4/F7/F9)**
    - Chaque onglet utilise le pattern : `<div v-if="visitedTabs['id']" v-show="activeTab === 'id'" class="tab-panel">`
  - Notes: Le contenu de chaque onglet est un copier-coller de l'existant, wrappé dans le pattern lazy tab. Aucun changement fonctionnel sur ces sections. **IMPORTANT** : La suppression du template Sommaire (lignes 71-85) est couplée à la suppression de l'import `useOutlineStore` dans Task 2 — les deux doivent être faits ensemble.
  - **Clarification (F11)** : Toutes les données dans `store.keywords.lieutenants` et `store.keywords.lexique` sont considérées comme validées — pas de check de verrouillage Moteur requis pour l'affichage en lecture seule dans le SeoPanel.

- [x] Task 6: Refactorer le `<template>` — État vide (v-else quand pas de score)
  - File: `src/components/panels/SeoPanel.vue`
  - Action:
    - Mettre à jour le bloc `v-else` (quand `!seoStore.score`) pour refléter la nouvelle structure à onglets
    - Conserver le score-section vide (ScoreGauge :score="0")
    - Afficher la barre d'onglets (mêmes onglets, tous désactivés visuellement ou avec contenu N/A)
    - Chaque onglet affiche son contenu "N/A" ou "-" comme actuellement
    - Supprimer les sections Densité et Sommaire de l'état vide
  - Notes: L'état vide doit être visuellement cohérent avec l'état chargé — mêmes onglets, même structure.

- [x] Task 7: Refactorer le `<style scoped>` de `SeoPanel.vue`
  - File: `src/components/panels/SeoPanel.vue`
  - Action:
    - Ajouter les styles pour `.seo-tabs` (container flex, overflow-x auto, gap, border-bottom)
    - Ajouter les styles pour `.seo-tab` (bouton compact, font-size 0.6875rem, padding léger, border-bottom actif, transition)
    - Ajouter `.seo-tab.active` (couleur accent, border-bottom 2px solid)
    - Ajouter `.tab-panel` (padding-top pour espacer du tab bar)
    - Ajouter `.keyword-select` (style pour le dropdown natif, width 100%, font-size compact)
    - Supprimer les styles orphelins (après suppression template Task 5) **(F9)** : `.outline-recap`, `.outline-item`, `.outline-h2`, `.outline-h3`, `.outline-level`, `.outline-title`
    - Ajouter `.keyword-select:disabled` avec `opacity: 0.5; cursor: not-allowed` **(F14)**
    - Conserver tous les autres styles existants (meta-item, validation, factor, etc.)
  - Notes: Utiliser les CSS variables existantes du projet (`--color-border`, `--color-primary`, `--color-text-muted`). Pas de scrollbar visible sur la barre d'onglets.

### Acceptance Criteria

- [x] AC 1: Given le SeoPanel est affiché avec un score SEO calculé, when l'utilisateur voit le panel, then le score global (ScoreGauge) est affiché en haut, suivi d'une barre d'onglets horizontale avec 5 onglets (Mots-clefs, Hiérarchie, Balises, Checklist, Facteurs), et l'onglet "Mots-clefs" est actif par défaut.

- [x] AC 2: Given l'onglet "Mots-clefs" est actif, when l'utilisateur sélectionne "Capitaine" dans le dropdown, then le mot-clef capitaine validé dans le Moteur est affiché comme un tag. When il sélectionne "Lieutenants", then les lieutenants validés sont affichés. When il sélectionne "Lexique", then les termes du lexique validé sont affichés.

- [x] AC 3: Given l'onglet "Mots-clefs" est actif et le dropdown est sur "NLP", when des termes NLP sont détectés dans le score SEO, then le composant NlpTerms existant est affiché avec les termes détectés/non détectés.

- [x] AC 4: Given aucun mot-clé article n'est défini (pas de capitaine), when l'onglet "Mots-clefs" est affiché, then un message d'avertissement indique de configurer le Capitaine dans le Moteur.

- [x] AC 5: Given le SeoPanel affiche les onglets, when l'utilisateur clique sur l'onglet "Hiérarchie", then la validation de la hiérarchie des titres (H1/H2/H3) est affichée avec les erreurs ou la validation OK, identique au rendu actuel.

- [x] AC 6: Given le SeoPanel affiche les onglets, when l'utilisateur clique sur l'onglet "Balises", then l'analyse meta title et meta description est affichée avec les longueurs et statuts, identique au rendu actuel.

- [x] AC 7: Given le SeoPanel affiche les onglets, when l'utilisateur clique sur l'onglet "Checklist", then la checklist SEO est affichée via le composant SeoChecklist existant, identique au rendu actuel.

- [x] AC 8: Given le SeoPanel affiche les onglets, when l'utilisateur clique sur l'onglet "Facteurs", then les 6 facteurs de scoring pondérés sont affichés, identique au rendu actuel.

- [x] AC 9: Given les onglets sont dans un sidebar étroit, when le nombre d'onglets dépasse la largeur disponible, then la barre d'onglets est scrollable horizontalement sans scrollbar visible.

- [x] AC 10: Given le composant `KeywordDensity.vue` et les fonctions `calculateKeywordDensity()` / `detectNlpTerms()` dans `seo-calculator.ts`, when la refonte est terminée, then ces fichiers sont intacts et non modifiés. Vérification : `git diff src/components/panels/KeywordDensity.vue src/utils/seo-calculator.ts` doit être vide **(F13)**.

- [x] AC 12: Given `articleKeywordsStore.keywords` est null (article sans Moteur), when l'onglet "Mots-clefs" est affiché avec catégorie capitaine/lieutenants/lexique, then aucun crash runtime ne se produit et le message d'avertissement est affiché **(F2)**.

- [x] AC 13: Given `seoStore.score` est null (pas encore de calcul SEO), when l'onglet "Mots-clefs" est affiché avec catégorie NLP, then aucun crash runtime ne se produit et NlpTerms affiche "Aucun terme NLP disponible" **(F3)**.

- [x] AC 14: Given le capitaine est une string vide `''`, when l'onglet "Mots-clefs" affiche la catégorie Capitaine, then aucun tag vide n'est rendu et le message "Aucun terme défini" est affiché **(F1/F12)**.

- [x] AC 11: Given le SeoPanel n'a pas de score calculé (état vide), when l'utilisateur voit le panel, then le score affiche 0, la barre d'onglets est présente, et chaque onglet affiche un contenu N/A cohérent.

## Additional Context

### Dependencies

- `useArticleKeywordsStore()` — nouveau import dans SeoPanel, fournit les données mots-clefs validés
- `useSeoStore()` — déjà importé, fournit `score.nlpTerms`, `score.headingValidation`, `score.metaAnalysis`, `score.checklistItems`, `score.factors`
- Composants existants : `ScoreGauge`, `SeoChecklist`, `NlpTerms` — aucune modification requise
- Composant `KeywordDensity` — conservé tel quel mais retiré du template SeoPanel

### Testing Strategy

**Tests unitaires (Vitest) :**
- `KeywordListPanel.vue` : Test du rendu avec une liste vide, un seul mot-clef, plusieurs mots-clefs. Vérifier le compteur et le message vide.
- `SeoPanel.vue` : Test de la navigation entre onglets (clic → changement de contenu visible). Test du dropdown catégorie mots-clefs (switch entre capitaine/lieutenants/lexique/nlp). Test de l'état vide (pas de score).

**Tests manuels :**
- Ouvrir un article avec des mots-clefs validés dans le Moteur → vérifier que l'onglet Mots-clefs affiche les bons termes
- Switcher entre toutes les catégories du dropdown → vérifier la cohérence des données
- Vérifier le scroll horizontal des onglets en réduisant la largeur du panel
- Vérifier que KeywordDensity.vue et seo-calculator.ts n'ont pas été modifiés (git diff)

### Notes

- Le composant `KeywordDensity.vue` et les fonctions de calcul dans `seo-calculator.ts` doivent être conservés intacts — ils seront réutilisés plus tard.
- Le composant `NlpTerms.vue` existant est intégré comme 4ème option du dropdown, pas de nouveau composant NLP.
- Les données mots-clefs proviennent de `useArticleKeywordsStore()` : `capitaine` (string), `lieutenants` (string[]), `lexique` (string[]).
- Les données NLP proviennent de `useSeoStore().score.nlpTerms` (NlpTermResult[]).
- Le composant `KeywordListPanel` est conçu pour être extensible : chaque mot-clef est un élément distinct, prêt à recevoir des badges de calcul (densité, occurrences, score) dans une future itération.
- **Risque identifié** : Si `articleKeywordsStore.keywords` est null (article sans workflow Moteur), l'onglet Mots-clefs doit gracieusement afficher le message d'avertissement sans erreur. Mitigé par le null guard dans `currentKeywords` computed (F2).
- **Ordre des tasks** : Task 1 (créer KeywordListPanel) DOIT être complétée avant Task 2 (import dans SeoPanel). Tasks 2-5 sont interdépendantes et doivent être faites ensemble. Task 7 (styles) vient en dernier après suppression du template outline **(F10/F9)**.
- **Données "validées"** : Toutes les données dans `article-keywords.store` sont considérées validées pour l'affichage. Pas de check de verrouillage Moteur dans le SeoPanel — c'est de la lecture seule **(F11)**.

## Review Notes

- Adversarial review completed (12 findings)
- Findings: 12 total, 7 fixed, 5 skipped (noise)
- Resolution approach: auto-fix
- Fixed: F1 (template dedup), F4 (label → aria-label), F5 (ARIA tablist/tab/tabpanel), F6 (typed visitedTabs), F7 (optional chaining consistency), F8 (test mock fields), F12 (empty state tab nav tests)
- Skipped (noise): F2, F3, F9, F10, F11
