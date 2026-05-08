> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Génération articles enrichie PAA — cascade 3 phases'
slug: 'paa-enhanced-article-generation'
created: '2026-04-03'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [Vue 3, TypeScript, Pinia, Express, DataForSEO API, Claude API]
files_to_modify:
  - shared/types/strategy.types.ts
  - shared/schemas/strategy.schema.ts
  - server/prompts/cocoon-articles.md
  - server/prompts/cocoon-paa-queries.md (new)
  - server/prompts/cocoon-articles-spe.md (new)
  - server/routes/strategy.routes.ts
  - server/routes/paa.routes.ts (new)
  - server/index.ts
  - src/components/production/BrainPhase.vue
  - tests/unit/routes/paa.routes.test.ts (new)
  - tests/unit/components/brain-paa-cascade.test.ts (new)
code_patterns:
  - Mustache templates ({{var}}, {{#block}}...{{/block}}) in prompt files
  - Streaming Claude via streamChatCompletion(system, user, maxTokens)
  - JSON 3-tier parsing (full array → individual objects → fallback)
  - Cache 2 tiers (memory Map + disk JSON) with TTL 7 days
  - Promise.allSettled for parallel fetches with graceful degradation
  - store.isSuggesting for loading state
test_patterns:
  - Vitest + @vue/test-utils mount with stubs
  - vi.mock for stores/services, vi.hoisted for mock declarations
  - findHandler(method, path) pattern for route testing
  - flushPromises() for async component tests
---

# Tech-Spec: Génération articles enrichie PAA — cascade 3 phases

**Created:** 2026-04-03

## Overview

### Problem Statement

Les titres d'articles Spécialisés (N4) sont générés par Claude sans aucun ancrage dans les recherches réelles des internautes. Le prompt actuel (`cocoon-articles.md`) produit des titres sémantiquement cohérents mais qui ne correspondent pas forcément à des intentions de recherche existantes. Les "People Also Ask" (PAA) de Google sont des preuves directes de questions posées par de vrais utilisateurs, et constituent une source d'inspiration précieuse pour créer des titres qui répondent à des douleurs réelles.

### Solution

Transformer la génération mono-passe actuelle en **cascade 3 phases** :

1. **Phase 1 — Structure** : Claude génère le Pilier + les Intermédiaires. En parallèle, `fetchPaa()` est appelé sur le nom du cocon pour fournir un contexte PAA initial.
2. **Phase 2 — Requêtes PAA intelligentes** : Claude analyse les Intermédiaires générés et propose 2-3 requêtes de recherche "grand public" par Inter → `fetchPaa()` en parallèle sur chaque requête → résultats agrégés par Intermédiaire.
3. **Phase 3 — Spécialisés enrichis** : Claude génère les Spécialisés avec les PAA récupérées en contexte d'inspiration (pas des impératifs). Fallback gracieux si 0 PAA.

Les PAA sont du matériau d'inspiration : Claude reste maître de la création, les PAA ancrent ses propositions dans la réalité des recherches sans imposer de titres.

### Scope

**In Scope :**
- Cascade 3 phases dans `generateArticleProposals()` de BrainPhase.vue
- Nouveau prompt pour demander à Claude les requêtes PAA à partir des Inter générés
- Nouveau prompt pour générer les Spé avec PAA en contexte
- Progress stepper UI visible (3 étapes) pendant la génération
- Persistance des PAA récupérées (cache DataForSEO existant via `fetchPaa()`)
- Fallbacks robustes : 0 PAA → génération classique, erreur DataForSEO → fallback silencieux
- Route API `/api/paa/batch` pour orchestrer les appels PAA côté serveur

**Out of Scope :**
- Modification du workflow Moteur existant
- Régénération individuelle de titres Spé avec PAA
- UI de visualisation/exploration des PAA dans le Cerveau (juste le stepper)
- Modification du type `ProposedArticle` (les PAA sont du contexte de génération, pas un champ persisté sur l'article)

## Context for Development

### Codebase Patterns

**Prompt templates** : Fichiers `.md` dans `server/prompts/` avec placeholders Mustache (`{{cocoonName}}`, `{{#themeContext}}...{{/themeContext}}`). Remplacement par `String.replace()` dans la route.

**Claude streaming** : `streamChatCompletion(systemPrompt, userMessage, maxTokens)` retourne un `AsyncIterable<string>`. Les chunks sont accumulés jusqu'au sentinel `USAGE_SENTINEL`. Max tokens = 4096 pour `step === 'articles'`, 1024 sinon.

**DataForSEO PAA** : `fetchPaa(keyword, locationCode=2250, languageCode='fr')` retourne `PaaQuestion[]` = `{ question: string, answer: string | null }`. L'appel passe par `/serp/google/organic/live/advanced` et filtre les items `type === 'people_also_ask'`.

**Cache DataForSEO** : `fetchPaa()` est appelé par `getBrief()` qui gère un cache disque JSON dans `data/cache/`. Pattern `Promise.allSettled` pour dégradation gracieuse.

**JSON parsing** : 3 niveaux de fallback dans `extractArticlesFromJson()` : (1) parse JSON array complet, (2) extraction regex objet par objet, (3) article placeholder.

**Loading state** : `store.isSuggesting` (boolean) contrôle le bouton + texte. Pas de stepper existant dans BrainPhase.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/production/BrainPhase.vue` | `generateArticleProposals()` (L620-680), `extractArticlesFromJson()` (L584-618), `getSuggestContext()` (L90-102) |
| `server/prompts/cocoon-articles.md` | Prompt actuel mono-passe (116 lignes) — sera scindé |
| `server/routes/strategy.routes.ts` | Handler `/suggest` — template selection (L276), placeholder replacement (L285-300), streaming (L307-313) |
| `server/services/dataforseo.service.ts` | `fetchPaa()` (L233-249), `getBrief()` (L486-539) |
| `shared/types/strategy.types.ts` | `CocoonSuggestRequest` (L195-209), `ProposedArticle` (L152-168) |
| `shared/types/dataforseo.types.ts` | `PaaQuestion` (L9-12) |
| `src/components/moteur/ProgressDots.vue` | Pattern stepper — grouped dots, filled/empty |
| `server/services/radar-cache.service.ts` | Pattern cache 2 tiers |
| `tests/unit/components/brain-article-hierarchy.test.ts` | Tests BrainPhase — mount pattern, stubs |
| `tests/unit/routes/strategy.routes.test.ts` | Tests routes — findHandler, mocks Claude |

### Technical Decisions

- **PAA = inspiration** : Le prompt spécifie clairement que les PAA ne sont pas des titres à copier mais du matériau d'inspiration
- **Claude génère les requêtes PAA** : Pas les keywords bruts des Inter — Claude formule des recherches "grand public" plus susceptibles de retourner des résultats
- **Cache DataForSEO partagé** : `fetchPaa()` utilise le même cache que le Moteur — les PAA récupérées ici seront réutilisables
- **Fallback en cascade** : PAA ciblées par Inter → PAA du cocon → génération classique sans PAA
- **3 prompts séparés** : `cocoon-articles.md` (Phase 1), `cocoon-paa-queries.md` (Phase 2), `cocoon-articles-spe.md` (Phase 3)
- **3 nouvelles valeurs de step** : `'articles-structure'`, `'articles-paa-queries'`, `'articles-spe'` — le step `'articles'` existant est conservé comme alias backward-compatible qui redirige vers `'articles-structure'`
- **Route PAA dédiée** : `POST /api/paa/batch` — sépare la logique DataForSEO de la logique Claude
- **Progress stepper inline** : 3 étapes textuelles dans BrainPhase, pas un composant séparé

## Implementation Plan

### Tasks

- [x] **Task 1 : Types — étendre CocoonSuggestRequest**
  - File : `shared/types/strategy.types.ts`
  - Action : Ajouter `'articles-structure' | 'articles-paa-queries' | 'articles-spe'` au type union `step` de `CocoonSuggestRequest` (L197). Ajouter un champ optionnel `paaContext?: Record<string, Array<{ question: string; answer: string | null }>>` dans le type `context` (L204). Ce champ mappe un titre d'Intermédiaire vers ses PAA associées.
  - File : `shared/schemas/strategy.schema.ts`
  - Action : Mettre à jour le schema Zod `cocoonSuggestRequestSchema` pour accepter les nouvelles valeurs de step et le champ `paaContext` optionnel.

- [x] **Task 2 : Prompt Phase 1 — modifier cocoon-articles.md**
  - File : `server/prompts/cocoon-articles.md`
  - Action : Modifier le prompt pour ne générer **que** le Pilier + les Intermédiaires (pas de Spécialisés). Retirer la Phase 3 (Spécialisés) des instructions. Retirer les Spécialisés du tableau récapitulatif et des exemples. Ajuster le format de sortie JSON pour ne contenir que des articles de type `Pilier` et `Intermédiaire`. Conserver toutes les règles SEO existantes pour Pilier et Inter. Ajuster la contrainte de ratio : "Chaque Intermédiaire devra recevoir 2-3 Spécialisés dans une prochaine étape — planifiez des facettes qui s'y prêtent."

- [x] **Task 3 : Prompt Phase 2 — créer cocoon-paa-queries.md**
  - File : `server/prompts/cocoon-paa-queries.md` (nouveau)
  - Action : Créer un prompt qui reçoit la liste des articles Pilier + Intermédiaires générés (en JSON) et le contexte stratégique, et demande à Claude de proposer 2-3 requêtes de recherche Google "grand public" par Intermédiaire. Ces requêtes doivent être formulées comme un internaute les taperait (pas des keywords SEO techniques). Format de sortie attendu :
    ```json
    [
      {
        "interTitle": "Titre exact de l'Intermédiaire",
        "searchQueries": ["requête 1", "requête 2", "requête 3"]
      }
    ]
    ```
  - Variables template : `{{cocoonName}}`, `{{articles}}` (JSON des Pilier+Inter), `{{#previousAnswers}}...{{/previousAnswers}}`, `{{#themeContext}}...{{/themeContext}}`
  - Notes : Le prompt doit expliquer que ces requêtes seront envoyées à Google pour récupérer les "People Also Ask" — donc elles doivent être des requêtes réalistes qui retournent des PAA pertinentes. Max tokens : 1024 (réponse courte).

- [x] **Task 4 : Prompt Phase 3 — créer cocoon-articles-spe.md**
  - File : `server/prompts/cocoon-articles-spe.md` (nouveau)
  - Action : Créer un prompt qui reçoit les articles Pilier + Intermédiaires, les PAA par Intermédiaire, et le contexte stratégique. Claude génère les articles Spécialisés (2-3 par Inter). Le prompt doit :
    - Reprendre les règles SEO des Spécialisés de l'ancien prompt (5+ mots, format question, zéro localisation)
    - Injecter les PAA par Inter dans une section dédiée : "Questions réellement posées par les internautes pour [Inter Title]"
    - Spécifier clairement : "Ces questions PAA sont une source d'inspiration. Tu peux t'en inspirer, les reformuler, les combiner, ou les ignorer si elles ne correspondent pas. Ne les reproduis pas telles quelles comme titres."
    - Si un Inter a 0 PAA : "Aucune question PAA trouvée pour cet Intermédiaire — génère les Spécialisés en te basant uniquement sur le contexte stratégique."
  - Variables template : `{{cocoonName}}`, `{{siloName}}`, `{{articles}}` (JSON Pilier+Inter), `{{#paaContext}}...{{/paaContext}}`, `{{#previousAnswers}}...{{/previousAnswers}}`, `{{#themeContext}}...{{/themeContext}}`
  - Format de sortie : même JSON que l'ancien prompt mais uniquement des articles `Spécialisé`, chacun avec `parentTitle` = titre exact d'un Intermédiaire.
  - Max tokens : 4096

- [x] **Task 5 : Route PAA batch — créer paa.routes.ts**
  - File : `server/routes/paa.routes.ts` (nouveau)
  - Action : Créer une route `POST /api/paa/batch` qui accepte `{ queries: string[] }` et retourne `{ data: Record<string, PaaQuestion[]> }`. Pour chaque requête, appeler `fetchPaa(query)` via `Promise.allSettled`. Mapper les résultats : clé = query, valeur = PaaQuestion[]. Les requêtes en échec retournent un tableau vide (dégradation gracieuse). Log les échecs avec `log.warn`.
  - Validation : schema Zod `{ queries: z.array(z.string().min(1)).min(1).max(20) }` — min 1, max 20 requêtes.
  - File : `server/index.ts`
  - Action : Importer et monter `paaRoutes` sur `/api`.

- [x] **Task 6 : Route strategy — supporter les nouveaux steps**
  - File : `server/routes/strategy.routes.ts`
  - Action : Dans le handler `POST /strategy/cocoon/:cocoonSlug/suggest`, modifier la logique de sélection de template (L276) :
    - `step === 'articles'` ou `step === 'articles-structure'` → `cocoon-articles.md`
    - `step === 'articles-paa-queries'` → `cocoon-paa-queries.md`
    - `step === 'articles-spe'` → `cocoon-articles-spe.md`
  - Pour `articles-paa-queries` : remplacer `{{articles}}` par le JSON des articles passés dans `currentInput`. Max tokens = 1024.
  - Pour `articles-spe` : construire un bloc `{{#paaContext}}` à partir de `parsed.context.paaContext`. Format du bloc PAA :
    ```
    ### Questions PAA pour "Titre Inter"
    - Question 1
    - Question 2
    ```
    Si `paaContext` est vide ou absent, le bloc `{{#paaContext}}...{{/paaContext}}` est supprimé (le prompt gère le fallback).
  - Max tokens : 4096 pour `articles-spe`.
  - Mettre à jour `COCOON_STEP_DESCRIPTIONS` avec les 3 nouvelles entrées.

- [x] **Task 7 : BrainPhase.vue — cascade 3 phases + stepper**
  - File : `src/components/production/BrainPhase.vue`
  - Action (script) : Remplacer `generateArticleProposals()` par une orchestration en 3 phases :
    1. Ajouter un ref `generationPhase` de type `'idle' | 'structure' | 'paa-queries' | 'paa-fetch' | 'specialises' | 'done' | 'error'`.
    2. **Phase 1** : `generationPhase.value = 'structure'`. Appeler `store.requestSuggestion(slug, { step: 'articles-structure', currentInput: 'Génère le Pilier et les Intermédiaires.', context })`. Parser le JSON retourné en articles Pilier+Inter. En parallèle, appeler `apiPost('/paa/batch', { queries: [props.cocoonName] })` pour les PAA du cocon (seed initial, stocké dans une variable `cocoonPaa`).
    3. **Phase 2** : `generationPhase.value = 'paa-queries'`. Appeler `store.requestSuggestion(slug, { step: 'articles-paa-queries', currentInput: JSON.stringify(pilierAndInterArticles), context })`. Parser le JSON retourné en `Array<{ interTitle: string, searchQueries: string[] }>`. Extraire toutes les queries. `generationPhase.value = 'paa-fetch'`. Appeler `apiPost('/paa/batch', { queries: allQueries })`. Construire `paaContext: Record<string, PaaQuestion[]>` en mappant les résultats par interTitle. Fallback : si toutes les PAA par Inter sont vides, utiliser `cocoonPaa` comme PAA de fallback pour chaque Inter.
    4. **Phase 3** : `generationPhase.value = 'specialises'`. Appeler `store.requestSuggestion(slug, { step: 'articles-spe', currentInput: 'Génère les Spécialisés.', context: { ...context, paaContext } })`. Parser le JSON retourné en articles Spécialisés. Fusionner avec les articles Phase 1 : `store.strategy.proposedArticles = [...pilierAndInterArticles, ...speArticles]`.
    5. `generationPhase.value = 'done'`.
    6. **Error handling** : Wrap chaque phase dans try/catch. Si Phase 1 échoue → `generationPhase.value = 'error'`, afficher erreur. Si Phase 2 ou fetch PAA échouent → log warning, continuer Phase 3 sans PAA (fallback gracieux). Si Phase 3 échoue → conserver les articles Phase 1 (Pilier+Inter) et afficher un warning "Spécialisés non générés".
  - Action (template) : Remplacer le texte du bouton par un stepper inline quand `generationPhase !== 'idle'` :
    ```html
    <div v-if="generationPhase !== 'idle'" class="generation-stepper">
      <div class="stepper-step" :class="{ active: generationPhase === 'structure', done: stepperIndex > 0 }">
        <span class="stepper-dot" />
        <span>Structure (Pilier + Inter)</span>
      </div>
      <div class="stepper-step" :class="{ active: ['paa-queries', 'paa-fetch'].includes(generationPhase), done: stepperIndex > 1 }">
        <span class="stepper-dot" />
        <span>Recherche PAA</span>
      </div>
      <div class="stepper-step" :class="{ active: generationPhase === 'specialises', done: stepperIndex > 2 }">
        <span class="stepper-dot" />
        <span>Articles Spécialisés</span>
      </div>
    </div>
    ```
    Avec `stepperIndex` computed : `idle=−1, structure=0, paa-queries/paa-fetch=1, specialises=2, done=3`.
  - Action (style) : Ajouter CSS `.generation-stepper`, `.stepper-step`, `.stepper-dot` avec états `active` (orange pulse), `done` (vert check). Style horizontal, compact, dans la zone du bouton.
  - Notes : Le parsing JSON utilise les mêmes fonctions `extractArticlesFromJson()` existantes. La Phase 2 parse un format différent (pas ProposedArticle) — ajouter une petite fonction `extractPaaQueries(text)` qui parse le JSON `[{ interTitle, searchQueries }]` avec le même pattern regex fallback.

- [x] **Task 8 : Tests route PAA batch**
  - File : `tests/unit/routes/paa.routes.test.ts` (nouveau)
  - Action : Créer des tests pour `POST /api/paa/batch` :
    - `it('returns PAA results for valid queries')` — mock `fetchPaa` pour 2 queries, vérifie le mapping `Record<string, PaaQuestion[]>`
    - `it('returns empty array for failed queries (graceful degradation)')` — mock `fetchPaa` qui rejette pour 1 query sur 2, vérifie que la query en échec retourne `[]`
    - `it('returns 400 for empty queries array')` — body `{ queries: [] }`
    - `it('returns 400 for missing queries field')` — body `{}`
    - `it('returns 500 on total service failure')` — mock `fetchPaa` qui throw pour toutes les queries
  - Pattern : Suivre le pattern `findHandler` + `createMockRes()` de `articles.routes.test.ts`.

- [x] **Task 9 : Tests cascade BrainPhase**
  - File : `tests/unit/components/brain-paa-cascade.test.ts` (nouveau)
  - Action : Tester la cascade 3 phases en mockant `store.requestSuggestion` et `apiPost` :
    - `it('calls 3 phases in sequence: structure → paa-queries → spe')` — vérifie que `requestSuggestion` est appelé 3 fois avec les bons step values
    - `it('fetches PAA via /paa/batch with queries from Phase 2')` — vérifie que `apiPost('/paa/batch', ...)` est appelé avec les queries retournées par Claude
    - `it('passes paaContext to Phase 3 context')` — vérifie que le 3ème appel `requestSuggestion` contient `paaContext` dans le context
    - `it('merges Phase 1 + Phase 3 articles into proposedArticles')` — vérifie que `store.strategy.proposedArticles` contient Pilier+Inter+Spé
    - `it('falls back gracefully when PAA fetch returns 0 results')` — mock PAA batch qui retourne `{}`, vérifie que Phase 3 est quand même appelée sans PAA
    - `it('falls back to cocoon PAA when Inter PAA are empty')` — mock PAA batch Inter vide mais cocoon PAA présentes, vérifie injection cocoon PAA
    - `it('continues with Phase 1 articles when Phase 3 fails')` — mock Phase 3 qui échoue, vérifie que Pilier+Inter sont préservés
    - `it('shows stepper with correct phase during generation')` — mount, trigger generation, check `.stepper-step.active` text
    - `it('shows error state when Phase 1 fails')` — mock Phase 1 qui échoue, vérifie `generationPhase === 'error'`
  - Pattern : Suivre le pattern de `brain-article-hierarchy.test.ts` — même stubs, même `mountBrainPhase` helper, mais avec mocks `apiPost` additionnels.

### Acceptance Criteria

- [x] **AC 1** : Given un cocon avec stratégie complétée (5 étapes), when l'utilisateur clique "Générer les articles", then le stepper affiche 3 phases séquentielles et les articles générés contiennent Pilier + Intermédiaires + Spécialisés.
- [x] **AC 2** : Given la Phase 1 terminée avec 1 Pilier et 3 Inter, when la Phase 2 demande des requêtes PAA à Claude, then Claude retourne 2-3 requêtes par Inter et `fetchPaa()` est appelé pour chaque requête.
- [x] **AC 3** : Given des PAA récupérées pour chaque Inter, when la Phase 3 génère les Spécialisés, then le prompt contient les PAA comme contexte d'inspiration (pas comme impératif) et les titres Spé générés reflètent des intentions de recherche réelles.
- [x] **AC 4** : Given `fetchPaa()` retourne 0 résultats pour toutes les requêtes d'un Inter, when la Phase 3 génère les Spé pour cet Inter, then Claude génère quand même des Spécialisés en fallback (mode classique sans PAA).
- [x] **AC 5** : Given `fetchPaa()` échoue (erreur réseau/API), when la cascade continue, then la Phase 3 est exécutée sans PAA et aucune erreur n'est affichée à l'utilisateur.
- [x] **AC 6** : Given la Phase 1 échoue (erreur Claude), when la génération s'arrête, then le stepper affiche un état d'erreur et un message explicatif est affiché.
- [x] **AC 7** : Given la Phase 3 échoue (erreur Claude), when les articles Phase 1 existent déjà, then les Pilier+Inter sont conservés dans `proposedArticles` et un warning "Spécialisés non générés" est affiché.
- [x] **AC 8** : Given la génération en cours, when l'utilisateur observe le stepper, then chaque phase est visuellement distinguée (active = orange, done = vert, pending = gris) et le texte de la phase active est lisible.
- [x] **AC 9** : Given `POST /api/paa/batch` avec `{ queries: ["seo site web", "ux design conversion"] }`, when le serveur traite la requête, then il retourne `{ data: { "seo site web": [...PaaQuestion], "ux design conversion": [...PaaQuestion] } }` avec dégradation gracieuse par query.

## Additional Context

### Dependencies

- **DataForSEO API** (`fetchPaa()`) — déjà intégré via `dataforseo.service.ts`, aucune modification nécessaire
- **Claude API** (streaming) — déjà intégré via `streamChatCompletion()`, aucune modification nécessaire
- **Cache PAA** — utilise le cache DataForSEO existant via `fetchPaa()` qui passe par `getBrief()`
- **apiPost** (frontend) — déjà importé dans BrainPhase.vue

### Testing Strategy

**Tests unitaires route :**
- `paa.routes.test.ts` : 5 tests couvrant happy path, dégradation gracieuse, validation, erreurs
- Pattern : findHandler + mocks DataForSEO

**Tests unitaires composant :**
- `brain-paa-cascade.test.ts` : 9 tests couvrant la cascade complète, fallbacks, stepper UI
- Pattern : mount avec stubs + mocks store/API

**Tests manuels :**
- Vérifier la cascade complète sur un vrai cocon avec DataForSEO actif
- Vérifier le fallback en coupant la connexion DataForSEO pendant Phase 2
- Vérifier la qualité des titres Spé générés vs l'ancien mono-passe

### Notes

**Risques identifiés :**
- **Qualité des requêtes PAA de Claude** : Si Claude génère des requêtes trop techniques, les PAA retournées seront pauvres. Mitigation : le prompt `cocoon-paa-queries.md` insiste sur "requêtes grand public" et donne des exemples.
- **Latence totale ~12s** : 3 appels Claude (~3s chacun) + appels DataForSEO (~1-2s). Mitigation : le stepper donne du feedback visuel, et le parallélisme (PAA cocon en Phase 1) réduit le temps perçu.
- **Budget DataForSEO** : 4-12 appels fetchPaa() par génération. Accepté par l'utilisateur.
- **Troncature Phase 3** : Avec 2-4 Inter × 2-3 Spé = 4-12 articles à générer, le JSON peut être long. Max tokens 4096 devrait suffire. Si troncature détectée, le warning existant `truncationWarning` s'affiche.

**Considérations futures (hors scope) :**
- Afficher les PAA récupérées dans l'UI pour que l'utilisateur puisse s'en inspirer manuellement
- Régénérer un titre Spé individuel avec ses PAA en contexte
- Utiliser les PAA récupérées comme base pour la structure Hn dans le Moteur

## Review Notes
- Adversarial review completed
- Findings: 18 total, 6 fixed, 2 skipped (pre-existing), 10 noise/info
- Resolution approach: auto-fix
- Fixes applied: F2/F15 (isSuggesting race), F7 (PAA dedup), F10 (maxTokens 2048), F11 (rate limit), F12 (siloName in prompt)
