---
title: 'Amélioration UI du composant ProposedArticleRow'
slug: 'ui-proposed-article-row'
created: '2026-04-04'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3 SFC', 'CSS scoped', 'Design tokens CSS variables']
files_to_modify: ['src/components/strategy/ProposedArticleRow.vue', 'tests/unit/components/proposed-article-row-parent.test.ts', 'src/components/production/BrainPhase.vue']
code_patterns: ['keyword-label uppercase au-dessus du contenu', 'design tokens --color-badge-*-bg/text', 'article.accepted boolean pour état validé']
test_patterns: ['vitest + @vue/test-utils mount', 'data-testid pour sélecteurs', 'makeArticle() helper avec overrides']
---

# Tech-Spec: Amélioration UI du composant ProposedArticleRow

**Created:** 2026-04-04

## Overview

### Problem Statement

Le composant `ProposedArticleRow` (item article avec collapse dans l'onglet Articles du Cerveau) est fonctionnellement complet mais présente des défauts de layout et d'homogénéité UI :
- Les blocs en expanded manquent de distinction visuelle entre eux
- Le bloc "Douleur" a un layout incohérent (label à gauche au lieu d'au-dessus comme les autres blocs)
- Le bloc "Requête validée" est horizontal (label à côté du badge) alors que les autres blocs sont verticaux
- La border de la carte ne transmet pas d'information utile (gris neutre) alors qu'elle pourrait signaler l'état de validation
- Les maturity tags sont affichés mais inutiles dans le contexte de l'onglet Articles du Cerveau
- Le parent badge collapsed prend de la place sans apporter de valeur

### Solution

Nettoyer le layout du composant en supprimant les éléments superflus, en homogénéisant la structure des blocs (tous verticaux : label au-dessus, contenu en dessous), et en utilisant la border comme indicateur d'état de validation.

### Scope

**In Scope:**
- Supprimer les maturity tags du template et CSS
- Supprimer le parent badge en collapsed
- Homogénéiser le bloc "Douleur" : label AU-DESSUS du texte (cohérent avec keyword/slug)
- Homogénéiser le bloc "Requête validée" : passer en layout vertical (label au-dessus, badge en dessous)
- Meilleure distinction visuelle entre les blocs expanded (séparateurs, espacement)
- Border de la carte signifiante : orange pour "non validé", vert pour "validé" (au lieu du gris neutre)
- Retirer les bindings `:group-color` dans BrainPhase.vue

**Out of Scope:**
- Pas de badge type d'article (Pilier/Inter/Spé) sur la carte
- Pas de transition animée expand/collapse
- Pas de modification des sliders titre/keyword/slug
- Pas de modification des actions (collapsed et expanded) — le rendu actuel est apprécié
- Pas de correction du token `--color-primary-soft` manquant (bug pré-existant, hors scope)

## Context for Development

### Codebase Patterns

- Composant Vue 3 SFC : `<script setup>` (84 lignes) + template (284 lignes) + `<style scoped>` (516 lignes) = 886 lignes total
- Design tokens CSS variables depuis `src/assets/styles/variables.css`
- Pattern de bloc : `.keyword-label` (uppercase, 0.6875rem, font-weight 600, muted) AU-DESSUS du contenu
- Couleurs sémantiques existantes :
  - Validé : `--color-badge-green-bg` (#dcfce7) / `--color-badge-green-text` (#166534)
  - Warning/non-validé : `--color-badge-amber-bg` (#fef3c7) / `--color-badge-amber-text` (#92400e)
  - Neutre : `--color-badge-slate-bg` (#f1f5f9) / `--color-badge-slate-text` (#475569)
- **Bug pré-existant :** `--color-primary-soft` utilisé 6 fois dans le composant sans être défini dans aucun `:root`. Résulte en `background: transparent` sur hover des boutons/arrows. NON CORRIGÉ dans cette spec (hors scope).

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/strategy/ProposedArticleRow.vue` | Composant cible — script (84 lignes) + template (284 lignes) + CSS scoped (516 lignes) |
| `tests/unit/components/proposed-article-row-parent.test.ts` | 30 tests existants : 4 parent badge, 2 groupColor, 7 kebab, 7 link parent, 6 regen, 4 tooltip |
| `src/assets/styles/variables.css` | Design tokens centraux (85 lignes) |
| `src/components/production/BrainPhase.vue` | Parent — passe `:group-color` à ProposedArticleRow en 2 endroits (ligne ~544 colonne Inter, ligne ~576 colonne Spé) |

### Technical Decisions

- **`article.accepted`** (boolean) pilote la border : `accepted=true` → border verte, `accepted=false` → border orange
- **Maturity tags** : supprimés du template + constante `maturityTags` dans `<script setup>` + CSS associé nettoyé
- **Parent badge** : supprimé du template collapsed + computed `truncatedParentTitle` nettoyé dans `<script setup>`
- **Bloc douleur** : restructuré en layout vertical (label au-dessus, texte en dessous) comme les blocs keyword/slug
- **Bloc requête validée** : restructuré en layout vertical (label au-dessus, badge en dessous) pour cohérence
- **Distinction des blocs expanded** : ajout de `border-top` + `padding-top` entre les sections
- **`groupColor`** : prop supprimée du composant ET bindings `:group-color` retirés dans BrainPhase.vue

### Impact sur les tests existants

| Test describe | Nb tests | Impact |
| ------------- | -------- | ------ |
| `parentTitle display` | 4 | **Supprimer** — le parent badge est retiré |
| `groupColor` | 2 | **Réécrire** — tester `accepted` class au lieu de `border-left` inline |
| `kebab dropdown (collapsed)` | 7 | **Aucun** |
| `link parent via kebab` | 7 | **Aucun** |
| `regen dropdown (expanded)` | 6 | **Aucun** |
| `composition tooltip` | 4 | **Aucun** |
| **Total** | **30** | **4 supprimés, 2 réécris, 24 inchangés** |

## Implementation Plan

### Tasks

**IMPORTANT : Les tâches 4 et 4b doivent être complétées AVANT la tâche 5** (le déplacement du fond ambre du conteneur vers le texte en Task 4 doit avoir lieu avant l'ajout de border-top sur le conteneur en Task 5).

- [ ] Task 1: Supprimer les maturity tags (template + script + CSS)
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Dans `<script setup>`, supprimer la constante `maturityTags` (lignes 79-83)
  - Action: Dans le template, supprimer le bloc `.maturity-tags` (lignes 94-103)
  - Action: Dans `<style scoped>`, supprimer les classes CSS `.maturity-tags`, `.maturity-tag`, `.maturity-tag--pending`, `.maturity-tag--done` (lignes 385-411)
  - Action: Le header `.proposal-header` devient le premier élément visible — modifier son `padding-top` de `0.375rem` à `0.625rem`

- [ ] Task 2: Supprimer le parent badge collapsed
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Dans `<script setup>`, supprimer le computed `truncatedParentTitle` (lignes 49-53)
  - Action: Dans le template, supprimer le bloc `parent-title-badge` (lignes 256-261)
  - Action: Dans `<style scoped>`, supprimer les classes `.parent-title-badge` et `.parent-title-badge svg` (lignes 672-685)
  - Action: Ajuster le `padding-bottom` de `.collapsed-slug` à `0.5rem` (il devient le dernier élément en collapsed)

- [ ] Task 3: Border de carte signifiante (orange/vert) + réordonnancement CSS
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Dans le template, sur la div racine `.proposal-item` supprimer le binding `:style="groupColor ? { borderLeft: ... } : undefined"`
  - Action: CSS — modifier `.proposal-item` : remplacer `border: 1px solid var(--color-border)` par `border: 1.5px solid var(--color-badge-amber-text)` (orange = non validé par défaut)
  - Action: CSS — vérifier que `.proposal-item.accepted` contient `border-color: var(--color-badge-green-text)`. La `border-width: 1.5px` est héritée de la règle de base `.proposal-item`, seule la couleur change.
  - Action: **RÉORDONNER les règles CSS** pour garantir la cascade correcte. L'ordre DOIT être :
    1. `.proposal-item` (border orange par défaut)
    2. `.proposal-item.accepted` (border verte — override la couleur)
    3. `.proposal-item:hover` (border bleu primary — override tout via `:hover`)
  - Action: Dans le CSS actuel, `.proposal-item:hover` est déclaré à la ligne 379, AVANT `.proposal-item.accepted` (ligne 495). **Déplacer** `.proposal-item:hover` APRÈS `.proposal-item.accepted` dans le fichier pour que le hover override bien l'état accepted.
  - Notes: Ne PAS toucher au contenu des règles hover/accepted existantes sauf la réorganisation de leur position dans le fichier

- [ ] Task 4: Homogénéiser le bloc douleur (layout vertical)
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Modifier le template `.detail-pain-point` :
    ```html
    <div v-if="article.painPoint" class="detail-pain-point">
      <span class="keyword-label">Douleur</span>
      <span class="pain-point-text">{{ article.painPoint }}</span>
    </div>
    ```
    (remplacer `<span class="pain-point-label">` par `<span class="keyword-label">`)
  - Action: CSS — modifier la règle EXISTANTE `.detail-pain-point` : remplacer `display: flex; align-items: baseline; gap: 0.375rem; padding: 0.375rem 0.625rem; border-radius: 4px; background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.1));` par `display: flex; flex-direction: column; gap: 0.25rem;` (supprimer le background du conteneur)
  - Action: CSS — **étendre** (PAS remplacer) la règle EXISTANTE `.pain-point-text` en ajoutant : `padding: 0.25rem 0.625rem; border-radius: 4px; background: var(--color-badge-amber-bg);` (le fond ambre est déplacé du conteneur vers le texte)
  - Action: CSS — supprimer la règle `.pain-point-label` (remplacée par `.keyword-label` existant)

- [ ] Task 4b: Homogénéiser le bloc requête validée (layout vertical)
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Modifier le template `.detail-keyword` :
    ```html
    <div v-if="article.validatedSearchQuery" class="detail-keyword">
      <span class="keyword-label">Requête validée</span>
      <span class="keyword-badge keyword-badge--validated">{{ article.validatedSearchQuery }}</span>
    </div>
    ```
    (structure identique à l'actuelle, seul le CSS change)
  - Action: CSS — modifier la règle `.detail-keyword` : remplacer `display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap;` par `display: flex; flex-direction: column; gap: 0.25rem;`

- [ ] Task 5: Meilleure distinction entre les blocs expanded (DOIT être après Tasks 4 et 4b)
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Augmenter le gap de `.proposal-details` de `0.5rem` à `0.75rem`
  - Action: Ajouter un `padding-top: 0.625rem` et `border-top: 1px solid var(--color-border)` sur les blocs `.slug-slider`, `.detail-keyword`, `.detail-pain-point` et `.detail-rationale`
  - Notes: Le premier bloc (`.keyword-slider`) ne reçoit PAS de border-top car il est directement sous le header. La barre d'actions `.proposal-actions--bottom` a déjà un `border-top`.
  - Notes: Quand `validatedSearchQuery` est absent, `.slug-slider` est le 2ème bloc et portera la première séparation visible — l'espacement sera `gap (0.75rem) + padding-top (0.625rem)` = ~1.375rem, ce qui reste visuellement acceptable.

- [ ] Task 6: Retirer les bindings groupColor dans BrainPhase
  - File: `src/components/production/BrainPhase.vue`
  - Action: Rechercher toutes les occurrences de `:group-color` et les supprimer. Il y en a 2 :
    - Colonne Intermédiaire (~ligne 544) : `:group-color="groupColors.get(normalizeTitle(article.title))"`
    - Colonne Spécialisé (~ligne 576) : `:group-color="group.color"`
  - Action: Retirer ces 2 attributs des balises `<ProposedArticleRow>`. Ne PAS supprimer le computed `groupColors` ni `normalizeTitle` — ils sont peut-être utilisés ailleurs (ex: `spec-group-dot`).

- [ ] Task 7: Retirer la prop groupColor du composant
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Retirer `groupColor?: string` du `defineProps<{...}>`
  - Action: Vérifier qu'aucun code mort ne subsiste (imports inutilisés, CSS orphelin)
  - Notes: Cette tâche DOIT venir APRÈS Task 6 pour éviter les warnings Vue "extraneous prop"

- [ ] Task 8: Adapter les tests
  - File: `tests/unit/components/proposed-article-row-parent.test.ts`
  - Action: Supprimer le bloc `describe('ProposedArticleRow — parentTitle display')` (4 tests)
  - Action: Réécrire le bloc `describe('ProposedArticleRow — groupColor')` → renommer en `describe('ProposedArticleRow — accepted border')` avec 2 tests :
    - Test 1 : `it('does not have accepted class when article is not accepted')` — mount avec `makeArticle({ accepted: false })`, vérifier que `.proposal-item` n'a PAS la classe `accepted`
    - Test 2 : `it('has accepted class when article is accepted')` — mount avec `makeArticle({ accepted: true })`, vérifier que `.proposal-item` a la classe `accepted`
  - Action: Retirer la prop `groupColor` de tous les tests qui la passaient dans `props`
  - Notes: Les 24 autres tests (7 kebab, 7 link parent, 6 regen, 4 tooltip) ne doivent PAS être modifiés

- [ ] Task 9: Vérification finale
  - Action: Exécuter `npx vitest run tests/unit/components/proposed-article-row-parent.test.ts` — les 28 tests (30 - 4 supprimés + 2 réécris) doivent passer
  - Action: Exécuter `npx vitest run` — aucune régression sur les autres suites
  - Action: Vérifier que le composant compile sans warning Vue

### Acceptance Criteria

- [ ] AC 1: Given un article avec `accepted: false`, when la carte est rendue, then `.proposal-item` n'a PAS la classe `accepted` (la border orange est pilotée par la règle CSS de base)
- [ ] AC 2: Given un article avec `accepted: true`, when la carte est rendue, then `.proposal-item` a la classe `accepted` (la border verte override l'orange via CSS)
- [ ] AC 3: Given un article quelconque, when la carte est rendue en collapsed, then aucun maturity tag n'est visible (le bloc `.maturity-tags` n'existe plus dans le DOM)
- [ ] AC 4: Given un article avec `parentTitle` défini, when la carte est rendue en collapsed, then aucun parent badge n'est visible (le bloc `.parent-title-badge` n'existe plus dans le DOM)
- [ ] AC 5: Given un article avec `painPoint` défini, when la carte est expanded, then le label "Douleur" est AU-DESSUS du texte (`.detail-pain-point` a `flex-direction: column`)
- [ ] AC 6: Given un article avec `painPoint` défini, when la carte est expanded, then le label "Douleur" utilise la classe `.keyword-label` (même style que "Mot-clé suggéré" et "Slug")
- [ ] AC 7: Given un article avec `validatedSearchQuery` défini, when la carte est expanded, then le label "Requête validée" est AU-DESSUS du badge (`.detail-keyword` a `flex-direction: column`)
- [ ] AC 8: Given la carte expanded avec plusieurs blocs (keyword, slug, douleur, rationale), when le contenu est affiché, then chaque bloc (sauf le premier) a un `border-top` visible
- [ ] AC 9: Given un hover sur la carte, when le curseur survole l'item, then la border passe en bleu primary (comportement existant conservé)
- [ ] AC 10: Given les actions collapsed (✓, ⋮, ×) et expanded (Valider, Régénérer, Lien, Supprimer), when la carte est rendue, then le rendu des actions est strictement identique à l'existant
- [ ] AC 11: Given BrainPhase.vue, when les ProposedArticleRow sont rendus, then aucun binding `:group-color` n'est présent et aucun warning Vue n'est émis
- [ ] AC 12: Given le fichier de tests, when `npx vitest run` est exécuté, then tous les tests passent (4 supprimés, 2 réécris, 24 inchangés)

## Additional Context

### Dependencies

Aucune dépendance externe. Modifications CSS et template uniquement.

### Testing Strategy

- **Supprimer** : 4 tests `parentTitle display` (feature retirée)
- **Réécrire** : 2 tests `groupColor` → `accepted border` (classe CSS, pas couleur — jsdom ne résout pas les CSS variables)
- **Inchangés** : 24 tests (7 kebab, 7 link parent, 6 regen, 4 tooltip)
- **Exécution** : `npx vitest run tests/unit/components/proposed-article-row-parent.test.ts`
- **Vérification globale** : `npx vitest run` pour s'assurer qu'aucun autre test n'est cassé

### Notes

- L'utilisateur apprécie fortement le rendu actuel des actions (collapsed et expanded) — NE PAS Y TOUCHER
- Le layout doit rester vertical, pas de colonnes côte à côte pour les textes
- **Bug pré-existant non corrigé** : `--color-primary-soft` n'est défini nulle part en `:root`. 6 usages dans le composant rendent un fond transparent sur hover. Hors scope de cette spec.
- Les champs type `keywordValidated`, `searchQueryValidated`, `titleValidated` sur `ProposedArticle` deviennent du code mort dans le composant après suppression des maturity tags. Ils restent dans le type car utilisés ailleurs (Moteur). Pas de nettoyage nécessaire.
