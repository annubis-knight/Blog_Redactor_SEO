---
title: 'Fix réactivité Capitaine verrouillé + ProgressDots — lecture directe du store'
slug: 'reactive-captain-and-progress-v2'
created: '2026-05-07'
last_updated: '2026-05-07'
version: '2.1.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
status: 'implementation-complete'
supersedes: '_archive/tech-spec-reactive-captain-and-progress-superseded-2026-05-07.md'
tech_stack: ['Vue 3.5.29', 'Pinia 3.0.4', 'TypeScript 5.9.3', 'Vitest 4.0.18', '@vue/test-utils']
files_to_modify:
  - 'src/components/moteur/MoteurContextRecap.vue'
  - 'src/components/moteur/LexiquePanel.vue'
  - 'docs/data-flows/captain-keyword-locked.md'
  - 'docs/data-flows/completed-checks.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - 'tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts'
---

# Tech-Spec: Fix réactivité Capitaine verrouillé + ProgressDots — lecture directe du store

**Created:** 2026-05-07
**Version:** 2.0.0 (refonte simplifiée — le pattern unique remplace 600+ lignes de planning)

> **Origine** : ce v2 remplace le v0.2.0 (archivé) qui sur-engineerait la solution avec `refreshCocoon`, watcher Pinia, Phase 2 robustesse. Après 2 Adversarial Reviews (F1-F23 findings), le pattern simple est apparu : **les composants qui affichent une donnée live doivent lire le store Pinia directement, pas des props passées par le parent**.

---

## Overview

### Problem Statement

Quand l'utilisateur change le mot-clé Capitaine verrouillé d'un article, **3 emplacements UI ne se rafraîchissent pas** :

1. **Tree des articles à gauche** (`MoteurContextRecap`) : la colonne "mot-clé" reste figée sur l'ancienne valeur.
2. **Header du Lexique** (`LexiquePanel` lexique-header) : le `<span class="captain-keyword">` reste figé.
3. **ProgressDots du tree** : les dots ne reflètent pas les checks workflow ajoutés/retirés en live.

**Pattern commun aux 3 bugs** :

```
DB (frais)  ──►  Store Pinia (frais)  ──►  Prop figée  ──►  Composant (lit la prop)
                                              ❌ cassure ici
```

Les stores Pinia **ont la donnée fraîche** dès la mutation utilisateur (optimistic update). Mais les composants lisent des props qui viennent du parent, lui-même nourri par des sources statiques (computed figés sur `strategyStore.proposedArticles` ou `cocoon.articles` chargés au mount).

### Solution

**Règle unique** : les composants qui affichent une donnée live lisent le store Pinia directement.

```
DB (frais)  ──►  Store Pinia (frais)  ──►  Composant (lit le store)
                                              ✅ chaîne réactive Vue
```

Pas de nouveau store, pas de nouvelle méthode de refresh, pas de watcher Pinia, pas de propagation HTTP supplémentaire.

### Scope

**In Scope** :

- **Code** :
  - `MoteurContextRecap.vue` : lire `articleKeywordsStore` pour le keyword de l'article sélectionné
  - `LexiquePanel.vue` : lire `articleKeywordsStore` pour le lexique-header
  - `MoteurContextRecap.vue` : diagnostic + fix ProgressDots si Vue ne traque pas correctement
- **PRD** :
  - Ajout `FR-MOT-DISPLAY-FROM-STORE` (règle "store > prop pour données live")
- **Documentation** :
  - Création `docs/data-flows/captain-keyword-locked.md` (cartographie producteurs/persistance/consommateurs)
  - Mise à jour `docs/data-flows/completed-checks.md` (note sur le bug ProgressDots)
- **Tests** :
  - 1 fichier `tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts` couvrant les 3 bugs

**Out of Scope** :

- Renommage colonne DB `captain_keyword_locked`
- Discipline AUTHORITY headers (tech-spec dédié futur si priorisé)
- Cohérence cross-article (changements faits sur un autre onglet/session)
- Cohérence cross-tab (2 onglets ouverts)
- Stratégie revert-on-error sur optimistic updates
- Migration TanStack Query
- Modifications backend

---

## Context for Development

### Cartographie data-flow vérifiée (à conserver)

```
PostgreSQL articles.captain_keyword_locked TEXT
   │
   ▼ data.service.ts (snake_case → camelCase)
   ▼   - Article.captainKeywordLocked  (via GET /cocoons/:id/articles)
   ▼   - ArticleKeywords.capitaine     (via GET /articles/:id/keywords)
   │
   ▼ Express routes :
   │   - GET /cocoons/:id/articles         → publishedArticles (figé après mount)
   │   - GET /cocoons/:name/capitaines     → capitainesMap Record (refreshable)
   │   - GET /articles/:id/keywords        → articleKeywordsStore.keywords (mutation live)
   │   - POST /articles/:id/keywords       → save lock/unlock
   │   - POST /articles/:id/progress/check → addCheck (idempotent côté backend)
   │
   ▼ Pinia stores :
   │   - articleKeywordsStore.keywords     ← MUTATION LIVE via lockCaptain() / unlockCaptain()
   │   - articleProgressStore.progressMap  ← MUTATION LIVE via addCheck() / removeCheck() (LRU 50)
   │   - cocoonsStore.cocoons[]            ← chargé une fois au démarrage
   │
   ▼ Composants Vue (consommateurs) :
   │   - MoteurContextRecap : tree + ProgressDots
   │   - LexiquePanel       : lexique-header
   │   - LieutenantsPanel   : header
   │   - CaptainPanel       : producteur principal des locks
```

### Pièges identifiés dans le code (à conserver)

- **`MoteurView.vue:127`** : `captainKeywordLocked: null` est **hardcodé** dans le mapping `proposedArticle → Article` pour les articles suggérés. La projection ne pourra jamais refléter un lock — d'où l'importance de **lire le store** plutôt que cette projection.
- **Backend idempotent** ([data.service.ts:296-310](server/services/infra/data.service.ts#L296-L310)) : `addCheck` skip si le check est déjà présent (`array_append`). Donc un re-lock sans uncheck n'incrémente pas `completed_checks` côté DB.
- **LRU cache 50 items** ([article-progress.store.ts:7-15](src/stores/article/article-progress.store.ts#L7-L15)) : si l'utilisateur navigue beaucoup d'articles, les anciennes entrées sortent du cache. Limite à surveiller, pas à fixer ce sprint.
- **Régression historique cannibalization** ([MoteurContextRecap.vue:16-19](src/components/moteur/MoteurContextRecap.vue#L16-L19)) : un changement de typage `capitainesMap` avait causé des faux-positifs systématiques. Le fix actuel ne touche pas le typage donc pas de risque, mais un test reste prudent.
- **`unifiedCapitainesMap` existe déjà** ([:89-98](src/components/moteur/MoteurContextRecap.vue#L89-L98)) mais sa priorité (`!map[id]`) fait que `props.capitainesMap` fresh est ignoré si l'article a déjà une valeur dérivée. À ne **pas** réutiliser pour ce fix — lire le store directement est plus simple.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| [src/components/moteur/MoteurContextRecap.vue](src/components/moteur/MoteurContextRecap.vue) | **À MODIFIER** : helper `getDisplayedKeyword(art)` qui lit le store pour l'article sélectionné. |
| [src/components/moteur/LexiquePanel.vue](src/components/moteur/LexiquePanel.vue) | **À MODIFIER** : computed `displayedCaptainKeyword` qui lit le store. |
| [src/stores/article/article-keywords.store.ts](src/stores/article/article-keywords.store.ts) | **À LIRE** : `keywords.capitaine` (string) et `keywords.articleId` (pour garde de cohérence). |
| [src/stores/article/article-progress.store.ts](src/stores/article/article-progress.store.ts) | **À LIRE** : `getProgress(id)?.completedChecks`. |
| [docs/data-flows/completed-checks.md](docs/data-flows/completed-checks.md) | Cartographie existante à enrichir. |
| [tests/unit/coherence/completed-checks.test.ts](tests/unit/coherence/completed-checks.test.ts) | Pattern de tests coherence à reproduire. |

---

## Implementation Plan

### Tasks

**Tâche 1 — Fix Bug n°1 (tree keyword)** ✅
- File : `src/components/moteur/MoteurContextRecap.vue`
- Action : importer `useArticleKeywordsStore`, ajouter helper `getDisplayedKeyword(art)`, remplacer `{{ art.keyword }}` dans le template par `{{ getDisplayedKeyword(art) }}`.
- Logique du helper :
  ```typescript
  function getDisplayedKeyword(art: GroupedArticle): string {
    // Pour l'article sélectionné, le store est la source fraîche.
    if (art.slug === props.selectedSlug && articleKeywordsStore.keywords?.articleId === art.id) {
      return articleKeywordsStore.keywords.capitaine || art.keyword
    }
    // Pour les autres articles, props.capitainesMap est rafraîchie par useMoteurArticleSync.
    return props.capitainesMap[art.id] || art.keyword
  }
  ```

**Tâche 2 — Fix Bug n°2 (lexique-header)** ✅
- File : `src/components/moteur/LexiquePanel.vue`
- Action : importer `useArticleKeywordsStore`, ajouter computed `displayedCaptainKeyword`, remplacer `{{ captainKeyword ?? '—' }}` par `{{ displayedCaptainKeyword ?? '—' }}` dans le template.
- Logique :
  ```typescript
  const displayedCaptainKeyword = computed(() => {
    if (articleKeywordsStore.keywords?.articleId === props.selectedArticle?.id) {
      return articleKeywordsStore.keywords.capitaine || props.captainKeyword
    }
    return props.captainKeyword
  })
  ```

**Tâche 3 — Diagnostic + fix Bug n°3 (ProgressDots)** ✅
> Fix appliqué en préventif : `checksByArticleId` exposé via `computed<Record<number, string[]>>` qui itère `progressStore.progressMap`, garantissant que la dépendance Vue est traquée explicitement (pas de risque que l'indexation par `String(id)` à chaque appel ne déclenche pas le re-render). La diagnostic dev manuel reste recommandé en validation utilisateur.
- File : `src/components/moteur/MoteurContextRecap.vue`
- Action : reproduire le bug en `npm run dev`. Ouvrir la console + Vue DevTools. Observer :
  - Quand un check est validé : est-ce que `articleProgressStore.progressMap[id]` mute bien ? (DevTools onglet Pinia)
  - Le composant re-render-t-il ? (Vue DevTools : Components → highlight updates)
  - `getChecks(id)` retourne-t-il la bonne valeur ?
- **Si le store mute mais le DOM ne re-render pas** : convertir `getChecks` en `computed<Map<number, string[]>>` indexé pour rendre la dépendance réactive explicite.
- **Si le store ne mute pas pour cet article** : remonter dans `useMoteurArticleSync.emitCheckCompleted` pour vérifier l'`articleProgressStore.addCheck(id, check)`.
- **Si articleId est faux** : tracer la provenance de l'`id` dans le call.

**Tâche 4 — Ajouter la FR au PRD** ✅
- File : `_bmad-output/planning-artifacts/prd.md`
- Action : insérer `FR-MOT-DISPLAY-FROM-STORE` au format des FRs existantes (cf. FR-MOT-LOCK-DERIVED). Texte :
  > "Les composants UI du Moteur qui affichent des données live (Capitaine verrouillé, checks workflow) lisent ces données depuis le store Pinia (`articleKeywordsStore`, `articleProgressStore`) plutôt que depuis des props passées par le parent. Les props restent acceptables pour les données figées (titre article, type, suggestedKeyword initial). Justification : les props sont nourries par des computeds figés sur des sources statiques (`strategyStore.proposedArticles`, `cocoonsStore.cocoons`) qui ne sont pas invalidées sur mutation utilisateur. Le store Pinia est muté en optimistic update lors de chaque action et reste donc la source réactive fraîche. Limitation connue : la cohérence cross-article (article B affiché dans le tree pendant qu'on travaille sur A) n'est garantie que pour l'article actuellement sélectionné — sprint dédié futur pour propagation cross-tab si nécessaire."

**Tâche 5 — Cartographie data-flow** ✅
- File : `docs/data-flows/captain-keyword-locked.md` (nouveau)
- Action : suivre format de [completed-checks.md](docs/data-flows/completed-checks.md). Sections : frontmatter, Producteurs, Persistance, Consommateurs (tree + lexique-header + lieutenants header + cannibalization), Cas à risque, Diagramme Mermaid, Régressions historiques (mentionner ce sprint), Tests à écrire.

**Tâche 6 — Enrichir `completed-checks.md`** ✅
- File : `docs/data-flows/completed-checks.md`
- Action : dans "Cas d'usage à risque", ajouter une ligne "ProgressDots non réactifs" avec cause selon diagnostic Tâche 3 + mitigation. Ajouter `synced_with: [captain-keyword-locked.md]` au frontmatter.

**Tâche 7 — Test de cohérence** ✅
- File : `tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts` (nouveau)
- Action : `@vue/test-utils` + Pinia. 3 scénarios :
  1. **Bug n°1** : monter `MoteurContextRecap` avec un article sélectionné. Trigger `articleKeywordsStore.lockCaptain("Y", null, articleId)`. Asserter `wrapper.find('.tree-article-keyword').text() === "Y"` après `nextTick`.
  2. **Bug n°2** : monter `LexiquePanel` avec un article sélectionné. Trigger `articleKeywordsStore.lockCaptain("Z", null, articleId)`. Asserter le lexique-header affiche "Z".
  3. **Bug n°3** : monter `MoteurContextRecap`. Trigger `articleProgressStore.addCheck(articleId, MOTEUR_CAPITAINE_LOCKED)`. Asserter `wrapper.findAll('.progress-dot--filled')` contient le bon nombre.

### Acceptance Criteria

- **AC1** : Lock Capitaine "X" → "Y" sur article sélectionné → tree affiche "Y" sans reload.
- **AC2** : Lock Capitaine "X" → "Y" sur article sélectionné → lexique-header affiche "Y" sans reload (si onglet Lexique ouvert).
- **AC3** : Validation d'un check Moteur (Discovery / Radar / Capitaine / Lieutenants / Lexique) sur l'article sélectionné → dot correspondant dans ProgressDots passe à `--filled` sans reload.
- **AC4** : Uncheck → dot redevient vide sans reload.
- **AC5** : Switch article A → B → A : pas de bleed-through (pas d'affichage du Capitaine de B sur A).
- **AC6** : `FR-MOT-DISPLAY-FROM-STORE` ajoutée au PRD avec ACs testables, statut active, depuis 2026-05-07, source = ce tech-spec.
- **AC7** : `docs/data-flows/captain-keyword-locked.md` existe et suit le format standard.
- **AC8** : `docs/data-flows/completed-checks.md` enrichi avec note ProgressDots + `synced_with`.
- **AC9** : Test `tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts` passe au vert.
- **AC10** : Pas de régression cannibalization — assertion sur `hasCannibalization()` après lock pour 2 articles avec même keyword (icône warning sur les 2).

---

## Additional Context

### Risques évités (issus des 2 Adversarial Reviews du v0.2.0)

| Risque | Évité par |
|--------|-----------|
| Over-engineering `refreshCocoon` (F2) | On lit le store directement — pas de méthode HTTP supplémentaire. |
| Watcher Pinia introduit duplicate refresh + race init-order (#2, #16, #17, #19 du 2nd review) | Pas de watcher. La réactivité Vue suffit quand le composant lit le store directement. |
| `captainKeywordLocked: null` hardcodé pour suggérés (F1) | Le store contient le vrai Capitaine pour l'article sélectionné — court-circuite la projection cassée. |
| Re-lock direct ne fire pas check-completed (F8) | Le store mute à chaque `lockCaptain`, donc le composant qui lit le store voit toujours la mutation, peu importe les events. |
| Phase 2 robustesse sur des risques hypothétiques (F11, F20) | Pas de Phase 2. Le fix ne touche pas le réseau, donc pas besoin de debounce/cache-busting/AbortController. |
| Test E2E qui passe sans fixer le bug (F18) | Test cohérence (Vitest + @vue/test-utils) qui mute le store et vérifie le DOM — couvre directement le mécanisme. |
| Scope creep AUTHORITY headers (F19) | Sorti du scope. Sera traité dans un sprint dédié si priorisé. |

### Limitations connues

- **Cohérence cross-article** : le tree affiche le Capitaine "frais" uniquement pour l'article actuellement sélectionné. Les autres articles affichent ce que `props.capitainesMap` contient (rafraîchi par `useMoteurArticleSync` au check `capitaine_locked`, mais pas live si lock fait sur un autre onglet/session).
- **Cohérence cross-tab** : 2 onglets ouverts du même article ne se synchronisent pas (cache Pinia par session, pas de WebSocket).
- **Articles `dbId <= 0`** (proposés non-persistés) : pas de Capitaine possible (pas de ligne DB), donc le store n'a rien à fournir. Le tree affiche le `suggestedKeyword` initial.

### Dependencies

**Stack existante (rien à installer)** :
- Pinia stores existants : `articleKeywordsStore`, `articleProgressStore`
- Composant Vue 3.5 + TypeScript
- Type `ArticleKeywords` ([shared/types/](shared/types/index.ts))
- Constantes `MOTEUR_*` ([shared/constants/workflow-checks.constants.ts](shared/constants/workflow-checks.constants.ts))

**Aucune nouvelle dépendance npm. Aucune migration DB. Aucun changement de contrat API.**

### Testing Strategy

- **Tests coherence (Vitest + @vue/test-utils)** : 1 fichier (Tâche 7) couvrant les 3 bugs.
- **Validation manuelle** :
  1. `npm run dev` sur cocon avec ≥3 articles
  2. Lock Capitaine "X" sur article A → tree + lexique-header + dots à jour
  3. Re-lock direct "Y" → tree + lexique-header à jour sans reload
  4. Unlock → tree affiche `suggestedKeyword`
  5. Switch A → B → A : pas de bleed-through
- **Tests E2E Playwright** : non requis ce sprint. Si symptôme observé après livraison, ajouter en bug-fix dédié.

### Notes — référence historique

Pour le contexte complet (cartographie initiale, 23 findings adversariaux, exploration des solutions over-engineered), voir l'archive : [`_archive/tech-spec-reactive-captain-and-progress-superseded-2026-05-07.md`](_archive/tech-spec-reactive-captain-and-progress-superseded-2026-05-07.md).

### Philosophie d'implémentation

> **Simplicité radicale**. ~15 lignes de code modifiées. Pas de méthode utilitaire, pas de watcher, pas de Phase 2. Si le diagnostic Tâche 3 révèle une cause complexe pour Bug n°3, créer un tech-spec dédié plutôt que d'enfler celui-ci.
