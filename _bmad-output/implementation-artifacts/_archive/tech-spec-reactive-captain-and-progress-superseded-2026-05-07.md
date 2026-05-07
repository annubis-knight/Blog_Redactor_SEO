---
title: 'Fix réactivité Capitaine verrouillé + ProgressDots dans MoteurContextRecap'
slug: 'reactive-captain-and-progress'
created: '2026-05-07'
last_updated: '2026-05-07'
version: '0.2.0'
stepsCompleted: [1, 2, 3, 4]
status: 'superseded'
superseded_by: 'tech-spec-reactive-captain-and-progress-v2.md'
superseded_date: '2026-05-07'
superseded_reason: 'Over-engineering. 2 reviews adversariales (F1-F23) ont révélé que le pattern simple "lire le store directement plutôt que des props figées" résout les 3 bugs avec ~15 lignes de code, sans `refreshCocoon`, sans watcher Pinia, sans Phase 2 robustesse.'
tech_stack: ['Vue 3.5.29', 'Pinia 3.0.4', 'TypeScript 5.9.3', 'Vitest 4.0.18', '@vue/test-utils']
files_to_modify:
  - 'src/components/moteur/MoteurContextRecap.vue'
  - 'src/views/MoteurView.vue'
  - 'src/composables/moteur/useMoteurArticleSync.ts'
  - 'src/components/moteur/CaptainPanel.vue'
  - 'src/stores/article/article-keywords.store.ts'
  - 'docs/data-flows/captain-keyword-locked.md'
  - 'docs/data-flows/completed-checks.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - 'tests/unit/coherence/captain-keyword-locked.test.ts'
  - 'tests/unit/coherence/progress-dots-reactive.test.ts'
related_specs:
  - 'tech-spec-authority-headers-rollout.md (à créer séparément, scope discipline)'
review_findings_addressed: 'F1-F20 du Adversarial Review v0.1.0'
---

# Tech-Spec: Fix réactivité Capitaine verrouillé + ProgressDots dans MoteurContextRecap

> ⚠️ **SUPERSEDED le 2026-05-07** par `tech-spec-reactive-captain-and-progress-v2.md`.
>
> **Pourquoi conservé** : la cartographie data-flow vérifiée (DB → store → composants), les pièges identifiés (`captainKeywordLocked: null` hardcodé pour suggérés, backend idempotent sur `addCheck`, LRU 50 items), et les findings des 2 Adversarial Reviews (F1-F23) restent **utiles** pour comprendre le contexte historique et éviter de retomber dans les mêmes pièges.
>
> **Pourquoi superseded** : le plan d'implémentation (refreshCocoon, watcher Pinia, Phase 2 robustesse) a été identifié comme over-engineering du mauvais layer après 2 reviews. La solution simple est dans le v2 : lire le store directement plutôt que les props figées.
>
> **À lire dans ce document** : sections "Problem Statement" (cartographie + pièges), "Notes" (tableau résolution F1-F20). **À ignorer** : sections "Solution", "Tasks", "Acceptance Criteria" (remplacées par v2).

---

**Created:** 2026-05-07
**Version:** 0.2.0 (refonte complète post Adversarial Review — superseded)

> **Changements majeurs vs v0.1.0** :
> - **F1+F2** : abandon du `refreshCocoon` over-engineered. Vraie cause = `captainKeywordLocked` hardcodé `null` pour suggérés + non-utilisation de `unifiedCapitainesMap` pour l'affichage du keyword.
> - **F8** : ajout déclenchement explicite du refresh dans `lockCaptain`/`unlockCaptain` du store (pas seulement via `check-completed` qui ne fire pas en re-lock).
> - **F19** : scope split — la discipline AUTHORITY headers est sortie dans un tech-spec séparé.
> - **F12** : ordre des tâches inversé — PRD (FRs) en Task 1, code en Tasks 2+.
> - **F18** : ajout test E2E Playwright en P1 (pas P2) pour vérifier le bug en VRAI.

## Overview

### Problem Statement

Quand l'utilisateur change le mot-clé Capitaine verrouillé d'un article (lock / unlock / re-lock via `CaptainPanel`), **trois** emplacements UI ne se rafraîchissent pas en live :

#### Bug n°1 — Le tree de `MoteurContextRecap` (RecapToggle articles suggérés / publiés)

**Cause racine confirmée par lecture du code** :

- [MoteurContextRecap.vue:52](src/components/moteur/MoteurContextRecap.vue#L52) : `keyword: a.captainKeywordLocked ?? a.suggestedKeyword ?? ''` — la valeur affichée vient du champ `captainKeywordLocked` de l'objet `Article` reçu en prop.
- [MoteurView.vue:127](src/views/MoteurView.vue#L127) : `captainKeywordLocked: null` est **hardcodé** dans le mapping `proposedArticle → Article` (articles suggérés). **Aucun refresh ne pourra changer ce champ** car la projection écrase systématiquement avec `null`.
- Pour les articles publiés : `cocoon.value?.articles` est figé après `cocoonsStore.fetchCocoons()` initial.

**MAIS** un mécanisme réactif existe déjà ([MoteurContextRecap.vue:89-98](src/components/moteur/MoteurContextRecap.vue#L89-L98)) :

```typescript
const unifiedCapitainesMap = computed<Record<number, string>>(() => {
  const map: Record<number, string> = {}
  for (const g of suggestedGroups.value) for (const a of g.articles) if (a.keyword && a.id > 0) map[a.id] = a.keyword
  for (const g of publishedGroups.value) for (const a of g.articles) if (a.keyword && a.id > 0) map[a.id] = a.keyword
  for (const [idStr, kw] of Object.entries(props.capitainesMap)) {
    const id = Number(idStr)
    if (kw && Number.isFinite(id) && !map[id]) map[id] = kw
  }
  return map
})
```

`props.capitainesMap` est rafraîchi par `useMoteurArticleSync.refreshCapitainesMap()` à chaque `check-completed === 'capitaine_locked'` ([useMoteurArticleSync.ts:103](src/composables/moteur/useMoteurArticleSync.ts#L103)).

**La vraie fix** : utiliser `unifiedCapitainesMap` pour piloter l'affichage du keyword (au lieu de `art.captainKeywordLocked`). Pas besoin d'un nouveau `refreshCocoon`.

#### Bug n°2 — Le re-lock direct ne déclenche pas le refresh

**Cause racine** : si l'utilisateur change Capitaine "X" → "Y" sans uncheck préalable (l'article est déjà locked), aucun event `check-completed` ne fire (le check `moteur:capitaine_locked` est déjà présent dans `completed_checks`, l'append SQL est idempotent côté backend [data.service.ts:296-310](server/services/infra/data.service.ts#L296-L310)). Conséquence : `useMoteurArticleSync.refreshCapitainesMap` n'est **jamais appelé**, et la `unifiedCapitainesMap` reste avec l'ancienne valeur "X".

**La vraie fix** : déclencher un signal de "Capitaine changé" depuis `articleKeywordsStore.lockCaptain()` (mutation déjà appelée dans tous les chemins de lock/re-lock). Plus simple : `MoteurView.vue` ajoute un `watch` sur `articleKeywordsStore.keywords?.capitaine` qui appelle `refreshCapitainesMap` à chaque changement.

#### Bug n°3 — ProgressDots non rafraîchis

**Cause racine** (à confirmer empiriquement par diagnostic au début du dev) :

3 hypothèses non-mutuellement-exclusives identifiées :
- **H1 (LRU eviction)** : cache 50 items dans `articleProgressStore.progressMap` — si user navigue beaucoup d'articles, les anciens sortent du cache, `getProgress(id)` retourne `null`, dots vides.
- **H2 (skip silencieux au mount)** : [MoteurContextRecap.vue:117](src/components/moteur/MoteurContextRecap.vue#L117) `if (!progressStore.getProgress(id))` skip si déjà en cache — donc une entrée évincée puis re-affichée n'est PAS re-fetchée.
- **H3 (article actif vs autres)** : `useMoteurArticleSync.emitCheckCompleted` met à jour le store pour l'article actif, mais le tree affiche aussi d'autres articles dont le store n'est jamais re-fetched.

**Pas de fix de "tracking réactif fragile"** — Vue traque bien `progressMap` à travers `getChecks()`. Le refactor en `computed<Map>` est cosmétique et ne fixe rien.

### Solution

#### Pour Bug n°1 (tree keyword)

**Modifier `MoteurContextRecap.vue`** dans le template ([:175](src/components/moteur/MoteurContextRecap.vue#L175) et l'équivalent panel publiés) pour préférer `unifiedCapitainesMap[art.id]` :

```html
<span v-if="unifiedCapitainesMap[art.id] || art.keyword" class="tree-article-keyword"
      :class="{ 'is-suggested': !unifiedCapitainesMap[art.id] && !art.keywordLocked }">
  {{ unifiedCapitainesMap[art.id] || art.keyword }}
</span>
```

Cette option (template-level) évite tout refactor d'ordre des computeds et garantit la réactivité directe.

#### Pour Bug n°2 (re-lock direct)

**Watcher dans `MoteurView.vue`** sur `articleKeywordsStore.keywords?.capitaine` qui appelle `refreshCapitainesMap` (déjà exposé par `useMoteurArticleSync`).

#### Pour Bug n°3 (ProgressDots)

**Approche en 2 temps** :

1. **D'abord diagnostiquer** (Task 0b = test manuel rapide) : reproduire le bug, identifier laquelle des 3 hypothèses (H1/H2/H3) tient.
2. **Fix selon hypothèse confirmée** :
   - Si **H1 (LRU)** : augmenter `MAX_CACHED_ITEMS` de 50 à 200 (mitigation provisoire).
   - Si **H2 (skip mount)** : ajouter un TTL de fraîcheur au guard du watcher.
   - Si **H3 (refresh non propagé)** : étendre `useMoteurArticleSync.emitCheckCompleted` pour aussi appeler `progressStore.fetchProgress(id)` après `addCheck`.

**Engagement minimum Phase 1** : la solution H3 est la plus probable et déjà partiellement présente.

### Scope

**In Scope (Phase 1, obligatoire — pas de Phase 2)** :

- **Code** :
  - Fix Bug n°1 : `MoteurContextRecap.vue` lit `unifiedCapitainesMap` pour l'affichage du keyword
  - Fix Bug n°2 : `MoteurView.vue` ajoute un watcher sur `articleKeywordsStore.keywords?.capitaine`
  - Fix Bug n°3 : diagnostic empirique + fix ciblé selon hypothèse confirmée
  - Correction typage `useMoteurArticleSync.capitainesMap` : `Record<string, string>` → `Record<number, string>`
- **PRD (Task 1, AVANT le code)** :
  - Ajout `FR-CAP-LOCKED-KEYWORD-REACTIVE`
  - Ajout `FR-MOT-PROGRESS-DOTS-REACTIVE` (avec section "Limitation connue" sur cohérence cross-article)
- **Documentation** :
  - Création `docs/data-flows/captain-keyword-locked.md`
  - Mise à jour `docs/data-flows/completed-checks.md` : enrichir cas à risque ProgressDots, lien `synced_with`
- **Tests** :
  - Test cohérence keyword : `tests/unit/coherence/captain-keyword-locked.test.ts` (inclut le scénario re-lock direct sans uncheck + régression cannibalization)
  - Test cohérence ProgressDots : `tests/unit/coherence/progress-dots-reactive.test.ts`
  - **Test E2E Playwright OBLIGATOIRE** : `tests/browser-e2e/moteur-captain-lock-reactivity.browser.test.ts`

**Out of Scope** :

- **Discipline AUTHORITY headers** : sortie dans tech-spec séparé `tech-spec-authority-headers-rollout.md` (cf. F19)
- **`refreshCocoon` méthode générique** : abandonné (over-engineering, F2)
- **Phase 2 robustesse** (debounce, cache-busting, idempotence) : abandonnée
- Renommage colonne DB `captain_keyword_locked`
- Migration TanStack Query
- Refonte propagation cross-tab
- Modifications backend
- Audit générique du prop-drilling
- Stratégie revert-on-error
- **Cohérence cross-article du tree** : ce sprint corrige pour l'article actif uniquement. Limitation documentée dans `FR-MOT-PROGRESS-DOTS-REACTIVE`.

## Context for Development

### Codebase Patterns

**Architecture de la donnée `captain_keyword_locked` (vérifiée)** :

```
PostgreSQL articles.captain_keyword_locked TEXT
   │
   ▼ data.service.ts (snake_case → camelCase) → Article.captainKeywordLocked
   ▼ data.service.ts → ArticleKeywords.capitaine (via /articles/:id/keywords)
   │
   ▼ Express routes :
   │   - GET /cocoons/:id/articles      → publishedArticles (figé après mount)
   │   - GET /cocoons/:name/capitaines  → capitainesMap Record<articleId, keyword> (refreshable)
   │   - GET /articles/:id/keywords     → articleKeywordsStore.keywords (mutation live)
   │
   ▼ Pinia stores :
   │   - cocoonsStore.cocoons[]                ← jamais re-fetched sur lock
   │   - useMoteurArticleSync.capitainesMap    ← refresh sur 'capitaine_locked' check
   │   - articleKeywordsStore.keywords         ← mutation live via lockCaptain()
   │
   ▼ MoteurContextRecap props :
   │   - props.suggestedArticles / publishedArticles  → captainKeywordLocked figé / null
   │   - props.capitainesMap                          → Record<number, string> réactif
   │
   ▼ Computeds dérivés DANS MoteurContextRecap :
   │   - suggestedGroups.articles[].keyword  ← captainKeywordLocked ?? suggestedKeyword (BUG)
   │   - unifiedCapitainesMap                ← merge des 3 sources, RÉACTIF (FIX = utiliser ça)
   │
   ▼ Template :
   │   - art.keyword                  → utilisé pour affichage (BUG, ligne 175)
   │   - hasCannibalization(art.id)   → utilise déjà unifiedCapitainesMap (OK)
```

**Pattern de propagation des checks workflow (vérifié)** :

`CaptainPanel.lockEntry()` → emit `check-completed` → `MoteurView.emitCheckCompleted()` → `useMoteurArticleSync.emitCheckCompleted()` → :
- `articleProgressStore.addCheck(id, check)` (mute le store + POST /progress/check)
- Si `check === 'capitaine_locked'` : `refreshCapitainesMap()` (re-fetch /cocoons/:name/capitaines)
- `refreshExplorationCounts()`

**MAIS** : `articleKeywordsStore.lockCaptain()` peut être appelé sans déclencher `check-completed` (idempotence côté backend) → re-lock direct ne fire pas le refresh.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| [src/components/moteur/MoteurContextRecap.vue](src/components/moteur/MoteurContextRecap.vue) | **À MODIFIER** : template ligne 175 lit `unifiedCapitainesMap[art.id] \|\| art.keyword`. Idem panel publiés. |
| [src/views/MoteurView.vue](src/views/MoteurView.vue) | **À MODIFIER** : ajouter `watch` sur `articleKeywordsStore.keywords?.capitaine` qui appelle `refreshCapitainesMap`. |
| [src/composables/moteur/useMoteurArticleSync.ts](src/composables/moteur/useMoteurArticleSync.ts) | **À MODIFIER** : corriger typage `capitainesMap` → `Record<number, string>`. Selon hypothèse Bug n°3, étendre `emitCheckCompleted` pour fetcher progress. |
| [src/components/moteur/CaptainPanel.vue](src/components/moteur/CaptainPanel.vue) | **À LIRE** : producteur des `lockCaptain()` / `lockEntry()` appels. Référence pour comprendre le flow. |
| [src/stores/article/article-keywords.store.ts](src/stores/article/article-keywords.store.ts) | **À LIRE** : méthode `lockCaptain` (ligne 317) — mutation cible du watcher Bug n°2. |
| [src/stores/article/article-progress.store.ts](src/stores/article/article-progress.store.ts) | **POTENTIELLEMENT À MODIFIER** : si Bug n°3 H1, augmenter `MAX_CACHED_ITEMS`. |
| [src/stores/strategy/cocoons.store.ts](src/stores/strategy/cocoons.store.ts) | **À LIRE (PAS MODIFIER)** : `refreshCocoon` abandonné après review. |
| [server/routes/cocoons.routes.ts](server/routes/cocoons.routes.ts#L87-L105) | Référence : `GET /cocoons/:cocoonName/capitaines` retourne `Record<number, string>`. |
| [shared/types/article.types.ts](shared/types/article.types.ts) | Type `Article` avec `captainKeywordLocked` et `completedChecks`. |
| [shared/constants/workflow-checks.constants.ts](shared/constants/workflow-checks.constants.ts) | Constante `MOTEUR_CAPITAINE_LOCKED`. |
| [docs/data-flows/completed-checks.md](docs/data-flows/completed-checks.md) | Cartographie existante à enrichir. |
| [tests/unit/coherence/completed-checks.test.ts](tests/unit/coherence/completed-checks.test.ts) | Pattern de tests coherence à reproduire. |

### Technical Decisions

**Décisions tranchées (Adversarial Review v0.1.0 → v0.2.0)** :

- **Pas de `refreshCocoon`** : la `unifiedCapitainesMap` existante fournit déjà la réactivité (F2).
- **Watcher sur `keywords.capitaine` au lieu de hook dans `lockCaptain`** : évite couplage store ↔ composable.
- **Diagnostic empirique avant code pour Bug n°3** : 3 hypothèses (H1/H2/H3) — le dev DOIT reproduire le bug et identifier laquelle tient avant d'écrire le fix (F6).
- **Test E2E Playwright en P1, pas P2** : seule façon de combler le verification gap F18.
- **Test régression cannibalization** : F16 — assertion sur `hasCannibalization()` post-fix.
- **Scope split (F19)** : la discipline AUTHORITY headers sort dans un tech-spec séparé.
- **Ordre PRD-first (F12)** : Task 1 = écrire les FRs, Task 2+ = code.
- **Ne pas forcer `fetchProgress` pour tous articles à chaque mount (F5)** : guard intentionnel conservé.
- **Edge case `id <= 0` (F17)** : documenté comme limitation connue dans `FR-CAP-LOCKED-KEYWORD-REACTIVE`.

## Implementation Plan

### Tasks

> **Ordre obligatoire** : PRD avant code (F12). Diagnostic avant fix Bug n°3 (F6).

---

#### Phase 0 — Vérifications préalables

**Tâche 0a — Vérifier l'existence des FR IDs cités (F12 partiel)**
- File : `_bmad-output/planning-artifacts/prd.md`
- Action : `grep` `FR-MOT-LOCK-DERIVED`, `FR-CAP-LOCK-ORIGINAL-ONLY`, `FR-PAIN-IMMUTABLE-AFTER-CEREVEAU` pour confirmer leur existence et obtenir leur format exact (numérotation, structure des sections, syntaxe des ACs).
- Notes : prérequis pour insérer les nouvelles FRs avec format cohérent.

**Tâche 0b — Diagnostic empirique Bug n°3 (F6, F7)**
- File : aucun (test manuel)
- Action : reproduire le bug en local. Procédure :
  1. `npm run dev` et ouvrir Moteur sur un cocon avec ≥3 articles
  2. **Scénario A (test H3)** : lock Capitaine sur article actif → observer dots de cet article. Si pas de mise à jour → H3 confirmée.
  3. **Scénario B (test H1)** : lock 50+ articles différents successivement → revenir au premier → observer dots. Si vides → H1 confirmée.
  4. **Scénario C (test H2)** : lock article A, sortir vers Dashboard, revenir au Moteur → si dots de A sont vides → H2 confirmée.
- Notes : LIVRABLE = note dans le tech-spec final indiquant laquelle des hypothèses tient. Conditionne la Task 4.

---

#### Phase 1 — PRD avant code (F12)

**Tâche 1 — Ajouter les FRs au PRD**
- File : `_bmad-output/planning-artifacts/prd.md`
- Action : Insérer 2 nouvelles FRs en suivant le format vérifié en Task 0a :
  - **FR-CAP-LOCKED-KEYWORD-REACTIVE** : "L'affichage du Capitaine verrouillé d'un article dans le tree `MoteurContextRecap` reflète en temps réel la valeur de `articles.captain_keyword_locked` (DB). Toute mutation via `articleKeywordsStore.lockCaptain()` ou `unlockCaptain()` met à jour le tree sans reload. Mécanisme : lecture de la `unifiedCapitainesMap` (déjà réactive via `useMoteurArticleSync.refreshCapitainesMap`), invalidation propagée via watcher Pinia sur `keywords.capitaine`. Limitation connue : pour les articles `dbId <= 0` (proposés non-persistés), le keyword reste celui de la proposition initiale."
  - **FR-MOT-PROGRESS-DOTS-REACTIVE** : "Les `ProgressDots` d'un article dans le tree reflètent en temps réel les `articles.completed_checks` (DB) pour l'article actif. Toute émission d'un check Moteur via `articleProgressStore.addCheck/removeCheck` met à jour les dots sans reload. Mécanisme : selon hypothèse confirmée (H1 LRU bump, H2 retrait skip, H3 fetch progress dans emitCheckCompleted). Limitation connue : la cohérence cross-article (changements faits sur un autre article du tree depuis un autre onglet/session) n'est pas garantie ce sprint."
- Notes : suivre exactement le format des FRs existantes. Inclure ACs testables, source = ce tech-spec, statut active, depuis 2026-05-07.

---

#### Phase 2 — Fix Bug n°1 (tree keyword)

**Tâche 2 — Modifier le template `MoteurContextRecap.vue`**
- File : `src/components/moteur/MoteurContextRecap.vue`
- Action : Modifier le template ligne 175 (panneau suggérés) ET son équivalent panneau publiés (~ligne 214) pour lire `unifiedCapitainesMap[art.id] || art.keyword` :
  ```html
  <span v-if="unifiedCapitainesMap[art.id] || art.keyword" class="tree-article-keyword"
        :class="{ 'is-suggested': !unifiedCapitainesMap[art.id] && !art.keywordLocked }">
    {{ unifiedCapitainesMap[art.id] || art.keyword }}
  </span>
  ```
- Notes : 2 emplacements identiques. Pas d'autre changement. **Bénéfice** : la cannibalization warning et le keyword affiché sont désormais cohérents (même source).

---

#### Phase 3 — Fix Bug n°2 (re-lock direct)

**Tâche 3 — Watcher dans `MoteurView.vue` sur `keywords.capitaine`**
- File : `src/views/MoteurView.vue`
- Action : Ajouter (après les imports composables existants) :
  ```typescript
  // Bug n°2 — re-lock direct ne déclenche pas check-completed (backend idempotent).
  // On watch la mutation directe du store pour forcer un refresh capitainesMap.
  watch(
    () => articleKeywordsStore.keywords?.capitaine,
    (newCapitaine, oldCapitaine) => {
      if (newCapitaine !== oldCapitaine) {
        refreshCapitainesMap()
      }
    },
  )
  ```
- Notes : `refreshCapitainesMap` est déjà exposé par `useMoteurArticleSync`. Pas de nouvelle méthode, juste un wiring.

---

#### Phase 4 — Fix Bug n°3 (ProgressDots)

**Tâche 4 — Fix selon hypothèse confirmée Task 0b**
- Files : variables selon hypothèse :
  - **Si H1 (LRU eviction)** :
    - File : `src/stores/article/article-progress.store.ts`
    - Action : `MAX_CACHED_ITEMS = 50` → `MAX_CACHED_ITEMS = 200`. Documenter en commentaire que c'est une mitigation provisoire.
  - **Si H2 (skip silencieux au mount)** :
    - File : `src/components/moteur/MoteurContextRecap.vue`
    - Action : Modifier le watcher [:109-123](src/components/moteur/MoteurContextRecap.vue#L109-L123) pour ajouter un TTL de fraîcheur (re-fetch si plus de 30s) au lieu de skip total.
  - **Si H3 (refresh manquant)** :
    - File : `src/composables/moteur/useMoteurArticleSync.ts`
    - Action : Dans `emitCheckCompleted` et `handleCheckRemoved`, après `addCheck/removeCheck`, ajouter `await articleProgressStore.fetchProgress(id)` pour s'assurer que le store reflète la DB.
- Notes : **ne PAS faire les 3 fixes en parallèle**. Confirmer hypothèse, fixer 1, tester.

**Tâche 5 — Correction typage `capitainesMap` (F4)**
- File : `src/composables/moteur/useMoteurArticleSync.ts`
- Action : `capitainesMap = ref<Record<string, string>>({})` → `capitainesMap = ref<Record<number, string>>({})`. Mettre à jour le type d'API correspondant.
- Notes : aligne avec contrat backend. Test : `vue-tsc` doit passer.

---

#### Phase 5 — Documentation

**Tâche 6 — Créer la cartographie data-flow**
- File : `docs/data-flows/captain-keyword-locked.md` (nouveau)
- Action : Suivre format de [completed-checks.md](docs/data-flows/completed-checks.md) :
  - Frontmatter (`name`, `description`, `type`, `last_updated`, `related_fr`)
  - Producteurs : DB column, endpoint POST, service, mutation store
  - Persistance : DB autorité + store cache + duration
  - Consommateurs : 3 emplacements UI (tree, lexique-header, lieutenants header) + cannibalization
  - Cas d'usage à risque : tableau (premier load, reload, switch, re-lock, refresh, etc.)
  - Diagramme Mermaid
  - Régressions historiques : mentionner les 3 bugs identifiés ce sprint
  - Tests à écrire : référencer les fichiers Tasks 8-9-10
- Notes : ~100 lignes de doc.

**Tâche 7 — Enrichir `completed-checks.md`**
- File : `docs/data-flows/completed-checks.md`
- Action : Ajouter dans "Cas d'usage à risque" une ligne dédiée au bug ProgressDots non réactif. Ajouter dans le frontmatter : `synced_with: [captain-keyword-locked.md]`.
- Notes : ~5 lignes.

---

#### Phase 6 — Tests

**Tâche 8 — Test cohérence keyword (F10, F15, F16 résolus)**
- File : `tests/unit/coherence/captain-keyword-locked.test.ts` (nouveau)
- Action : Pattern @vue/test-utils. Tests :
  - **Scenario lock initial** : monter `MoteurContextRecap` avec article + `props.capitainesMap = {}`. Mock `apiGet` HTTP pour `/cocoons/:name/capitaines` retournant `{42: "X"}`. Trigger refresh via mutation des props. Asserter `wrapper.find('.tree-article-keyword').text() === "X"`.
  - **Scenario re-lock direct (F8)** : après lock initial, simuler que la map est rafraîchie avec `{42: "Y"}` via `props.capitainesMap` updated par parent. Asserter le DOM affiche "Y" sans avoir émis `check-completed`.
  - **Scenario cannibalization régression (F16)** : lock 2 articles avec même keyword "X". Asserter que `wrapper.find('.warning-cannibal')` apparaît sur les 2. Aucun faux-positif sur articles avec keywords différents.
- Notes : NE PAS mocker `cocoonsStore` directement — utiliser le vrai store, mock niveau `apiGet`.

**Tâche 9 — Test cohérence ProgressDots**
- File : `tests/unit/coherence/progress-dots-reactive.test.ts` (nouveau)
- Action : Selon hypothèse Bug n°3 :
  - Monter `MoteurContextRecap` avec un article. Trigger `articleProgressStore.addCheck(id, MOTEUR_CAPITAINE_LOCKED)`.
  - Asserter `wrapper.findAll('.progress-dot--filled').length === expectedCount`.
  - Si H1 : test eviction (mount > MAX_CACHED_ITEMS articles puis vérifier que les premiers ne perdent pas leurs dots).
  - Si H2 : test re-mount du composant pour le même article, vérifier dots toujours présents.
  - Si H3 : asserter qu'`emitCheckCompleted` déclenche bien un `fetchProgress`.
  - Test uncheck : `removeCheck` retire bien le dot.
- Notes : tester aussi un switch d'article puis retour.

**Tâche 10 — Test E2E Playwright (F18 résolu)**
- File : `tests/browser-e2e/moteur-captain-lock-reactivity.browser.test.ts` (nouveau)
- Action : Scénario user complet (vraie navigation, vraie HTTP, vrai DOM) :
  1. Démarrer le serveur (déjà géré par `pretest:browser`)
  2. Naviguer vers `/cocoon/:id/moteur` avec un cocon préparé (fixture)
  3. Sélectionner un article
  4. Cliquer "Verrouiller Capitaine" pour keyword "X"
  5. Asserter visuellement (locator-based) :
     - tree affiche "X" pour cet article
     - lexique-header affiche "X" si onglet ouvert
     - ProgressDots de l'article a un dot Capitaine rempli
  6. Re-lock pour keyword "Y" (sans uncheck)
  7. Asserter tree affiche "Y" sans reload
  8. Asserter pas de cascade HTTP suspecte
- Notes : c'est le SEUL test qui couvre vraiment le verification gap F18. **Obligatoire P1.**

### Acceptance Criteria

> **Format Given/When/Then**. Tous les ACs sont **obligatoires Phase 1** (pas de P2 optionnel — refonte v0.2.0).

**Comportement utilisateur** :

- **AC1 — Keyword tree (lock initial)** : **Étant donné** un article publié avec `captainKeywordLocked = "X"` en DB, **quand** l'utilisateur ouvre le Moteur, **alors** le tree affiche "X" pour cet article.

- **AC2 — Keyword tree (re-lock sans uncheck)** : **Étant donné** un article actif avec Capitaine "X" verrouillé, **quand** l'utilisateur change le Capitaine pour "Y" via `CaptainPanel.lockEntry()` sans uncheck préalable, **alors** le tree affiche "Y" pour cet article sans reload de page. *(Couvre F8)*

- **AC3 — Keyword tree (unlock)** : **Étant donné** un article avec Capitaine "X" verrouillé affiché dans le tree, **quand** l'utilisateur déverrouille via `unlockCaptain`, **alors** le tree affiche le `suggestedKeyword` initial (ou rien si absent), sans reload.

- **AC4 — Keyword tree (suggérés)** : **Étant donné** un article suggéré (`dbId > 0`) sans Capitaine verrouillé, **quand** l'utilisateur le sélectionne et lock un Capitaine "X", **alors** le tree (panneau suggérés) affiche "X" sans reload. *(Couvre F1)*

- **AC5 — LexiquePanel header** : **Étant donné** un article avec Capitaine "X" et l'onglet Lexique ouvert, **quand** le Capitaine change pour "Y", **alors** `<span class="captain-keyword">` du lexique-header affiche "Y" sans reload. *(À vérifier en E2E AC17 — peut-être déjà couvert par fix Bug n°2)*

- **AC6 — ProgressDots Moteur (article actif)** : **Étant donné** un article actif avec aucun check, **quand** l'utilisateur émet un check Moteur, **alors** le dot correspondant dans `ProgressDots` (du tree) passe à `--filled` sans reload.

- **AC7 — ProgressDots uncheck** : **Étant donné** un article avec un dot rempli, **quand** l'utilisateur retire ce check, **alors** le dot repasse à vide sans reload.

- **AC8 — Switch article + retour** : **Étant donné** un user qui lock "X" sur article A, switche vers B, revient sur A, **quand** le tree re-render, **alors** "X" est toujours affiché et les dots de A reflètent ses checks réels (pas de bleed-through).

**Robustesse technique** :

- **AC9 — Pas de régression cannibalization (F16)** : **Étant donné** 2 articles avec le même Capitaine verrouillé "X", **quand** le tree render après lock, **alors** `IconWarning` apparaît sur les 2 articles. **Et** aucune icône n'apparaît sur des articles avec keywords différents.

- **AC10 — Typage capitainesMap (F4)** : **Étant donné** `useMoteurArticleSync.capitainesMap` typé `Record<number, string>`, **quand** on exécute `npm run type-check`, **alors** aucune erreur de type.

- **AC11 — Refresh ciblé** : **Étant donné** que les checks Moteur autres que Capitaine ne mutent pas `articles.captain_keyword_locked`, **quand** un check `MOTEUR_DISCOVERY_DONE` est émis, **alors** `refreshCapitainesMap` n'est PAS rappelé inutilement (le watcher Bug n°2 ne fire que sur changement de `keywords.capitaine`).

**Documentation** :

- **AC12 — Cartographie créée** : **Étant donné** la convention `docs/data-flows/*.md`, **quand** on cherche `captain-keyword-locked.md`, **alors** il existe et suit le format standard (frontmatter + 7 sections complètes).

- **AC13 — Cartographie checks enrichie** : **Étant donné** `docs/data-flows/completed-checks.md`, **quand** on lit "Cas d'usage à risque", **alors** une ligne dédiée au bug ProgressDots est présente. Frontmatter contient `synced_with: [captain-keyword-locked.md]`.

- **AC14 — PRD enrichi (F12)** : **Étant donné** `_bmad-output/planning-artifacts/prd.md`, **quand** on grep `FR-CAP-LOCKED-KEYWORD-REACTIVE` et `FR-MOT-PROGRESS-DOTS-REACTIVE`, **alors** chacune existe avec ACs testables, statut active, depuis 2026-05-07. Format cohérent vérifié en Task 0a.

**Tests** :

- **AC15 — Test coherence keyword** : **Étant donné** `tests/unit/coherence/captain-keyword-locked.test.ts`, **quand** on exécute `npm run test:unit`, **alors** tous les tests passent.

- **AC16 — Test coherence ProgressDots** : **Étant donné** `tests/unit/coherence/progress-dots-reactive.test.ts`, **quand** on exécute `npm run test:unit`, **alors** les tests passent (selon hypothèse confirmée Task 0b).

- **AC17 — Test E2E Playwright (F18)** : **Étant donné** `tests/browser-e2e/moteur-captain-lock-reactivity.browser.test.ts`, **quand** on exécute `npm run test:browser`, **alors** le scénario user complet (lock + re-lock sans reload, vérification visuelle tree + LexiquePanel + dots) passe au vert.

## Additional Context

### Dependencies

**Stack existante (rien à installer)** :

- Pinia stores existants : `articleKeywordsStore`, `articleProgressStore`, `cocoonsStore`
- Composable existant à étendre : `useMoteurArticleSync`
- Constantes existantes : `MOTEUR_CAPITAINE_LOCKED`
- Type `Article`
- Endpoints backend existants : `GET /cocoons/:name/capitaines`, `POST /articles/:id/progress/check`

**Aucune nouvelle dépendance npm. Aucune migration DB. Aucun changement de contrat API.**

**Dépendance inter-spec** : `tech-spec-authority-headers-rollout.md` à créer séparément (cf. F19). Indépendant.

### Testing Strategy

**Tests unitaires (Vitest)** :
- `tests/unit/composables/useMoteurArticleSync.test.ts` (si existe, sinon créer) : test typage `capitainesMap`.
- `tests/unit/stores/article-progress.store.test.ts` : si Task 4 = H1, ajouter test de la nouvelle taille LRU.

**Tests coherence (Vitest + @vue/test-utils)** :
- `tests/unit/coherence/captain-keyword-locked.test.ts` (Task 8)
- `tests/unit/coherence/progress-dots-reactive.test.ts` (Task 9)

**Tests E2E (Playwright) — OBLIGATOIRE P1** :
- `tests/browser-e2e/moteur-captain-lock-reactivity.browser.test.ts` (Task 10)

**Validation manuelle (avant clôture)** :
1. `npm run dev` sur cocon avec ≥3 articles
2. Lock Capitaine "X" sur article A → vérifier tree + lexique-header + dots
3. Re-lock direct "Y" sans uncheck → vérifier tree affiche "Y"
4. Unlock → vérifier tree affiche le keyword suggéré
5. Switch entre 5+ articles rapidement → pas de désynchro
6. Inspecter Network tab : ≤ 1 appel `/capitaines` par lock

### Notes

**Findings Adversarial Review v0.1.0 — résolution complète** :

| Finding | Sévérité | Résolution v0.2.0 |
|---------|----------|-------------------|
| F1 | 🔴 Critical | Diagnostic refait : `captainKeywordLocked` hardcodé null pour suggérés. Solution = lire `unifiedCapitainesMap`. AC4 dédié. |
| F2 | 🔴 Critical | `unifiedCapitainesMap` réutilisée. `refreshCocoon` abandonné. |
| F3 | 🔴 Critical | Contradiction levée : Task v0.1.0 reformulée. Le vrai problème était l'absence d'un consumer qui lit la map. |
| F4 | 🟡 Medium | AC10 reformulé : juste vérifier que `vue-tsc` passe. |
| F5 | 🟠 High | AC8 v0.1.0 supprimée. Guard `if (!getProgress(id))` conservé. Fix H2 = TTL si confirmé. |
| F6 | 🟠 High | Diagnostic empirique (Task 0b) avant fix. Refactor cosmétique abandonné. |
| F7 | 🟠 High | Hypothèse H1 (LRU) explicitement traitée en Task 4. |
| F8 | 🔴 Critical | Bug n°2 dédié, Task 3 (watcher dans MoteurView). AC2 dédié. |
| F9 | 🟠 High | `refreshCocoon` abandonné, problème caduc. |
| F10 | 🔴 Critical | AC15 reformulée : déclenche refresh via `props.capitainesMap` updated, pas via `lockCaptain` du store. |
| F11 | 🟠 High | Phase 2 robustesse complètement abandonnée. Décisions Pre-mortem retirées. |
| F12 | 🟠 High | Task 1 = PRD. Task 0a = vérification IDs existants. Code en Tasks 2+. |
| F13 | 🟡 Medium | ProgressDots NON inclus dans AUTHORITY headers. Discipline header sortie du scope (F19). |
| F14 | 🟡 Medium | `RELATED DOCS:` abandonné. Déféré au spec AUTHORITY rollout. |
| F15 | 🟡 Medium | AC5 marquée comme couverte par fix Bug n°2 (watcher). À vérifier en E2E (AC17). |
| F16 | 🟡 Medium | AC9 dédié à la régression cannibalization. Test obligatoire. |
| F17 | 🟢 Low | Limitation `dbId <= 0` documentée explicitement dans `FR-CAP-LOCKED-KEYWORD-REACTIVE`. |
| F18 | 🟠 High | AC17 = test E2E Playwright OBLIGATOIRE P1. |
| F19 | 🟡 Medium | Scope split. Tech-spec AUTHORITY rollout à créer séparément. |
| F20 | 🟢 Low | Pas de Phase 2 conditionnelle = pas de critère de déclenchement à définir. |

**Risques résiduels** :

- **Bug n°3 root cause incertain** : si Task 0b ne confirme aucune des 3 hypothèses, retour à investigation. Créer un nouveau tech-spec dédié si nécessaire.
- **AC5 (LexiquePanel) potentiellement non couverte** : si l'E2E révèle que le watcher Bug n°2 ne suffit pas pour le lexique-header, ajouter une Task 11 pour fix dédié.
- **Cohérence cross-article** : reste hors scope. Documenté.

**Pour discussion produit** (out of scope ce sprint) :

- Vocabulaire incohérent `captain_keyword_locked` (DB) vs `capitaineKeyword` (backend) vs `keywords.capitaine` (store).
- Stratégie revert-on-DB-error sur les optimistic updates.
- Propagation cross-tab.
- Discipline AUTHORITY headers (tech-spec séparé).

**Philosophie d'implémentation v0.2.0** :

> **Simplicité** : pas de Phase 2, pas de pré-design. Diagnostic empirique pour le Bug n°3 plutôt que refactor cosmétique. Une seule modification de template pour Bug n°1, un seul watcher pour Bug n°2. Test E2E obligatoire pour vérifier que le bug est VRAIMENT fixé.
