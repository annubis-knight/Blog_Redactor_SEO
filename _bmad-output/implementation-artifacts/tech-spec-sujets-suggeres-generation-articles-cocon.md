---
title: 'Sujets suggérés pour la génération d articles du cocon'
slug: 'sujets-suggeres-generation-articles-cocon'
created: '2026-04-04'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3', 'TypeScript', 'Pinia', 'Zod', 'Node.js/Express', 'Anthropic SDK', 'Vitest']
files_to_modify: ['shared/types/strategy.types.ts', 'shared/schemas/strategy.schema.ts', 'src/composables/useArticleProposals.ts', 'src/components/production/BrainPhase.vue', 'src/components/production/TopicSuggestions.vue', 'server/routes/strategy.routes.ts', 'server/prompts/cocoon-articles-topics.md']
code_patterns: ['composable pattern (useArticleProposals)', 'Pinia store with requestSuggestion()', 'Zod schema validation in route handler', 'CocoonSuggestRequest step enum routing', 'prompt template with {{mustache}} placeholders', 'streamChatCompletion() async generator', 'JSON file persistence in data/strategies/']
test_patterns: ['Vitest + @vue/test-utils', 'vi.mock() for services/stores', 'setActivePinia(createPinia()) in beforeEach', '@vitest-environment node for backend tests', 'flushPromises() for async component tests', 'tests/unit/{category}/{name}.test.ts']
---

# Tech-Spec: Sujets suggérés pour la génération d'articles du cocon

**Created:** 2026-04-04

## Overview

### Problem Statement

Lors de la génération d'articles intermédiaires dans le workflow Cerveau, Claude manque de contexte sur les sous-thèmes que l'utilisateur souhaite couvrir. Le pilier s'aligne naturellement au nom du cocon, mais les articles intermédiaires peuvent partir dans des directions non pertinentes ou ne pas refléter les souhaits de l'utilisateur. Il n'existe actuellement aucun mécanisme pour guider la génération avec des orientations thématiques.

### Solution

Ajouter au-dessus du bouton "Générer les articles avec Claude" (step 6 du Cerveau) une section interactive de sujets/sous-thèmes :
- **Génération automatique** par Claude au chargement du step 6, basée sur les 5 réponses stratégiques précédentes + contexte du cocon/silo
- **Checkboxes sélectionnables** pour chaque sujet suggéré
- **Actions utilisateur** : supprimer un sujet, régénérer la liste, ajouter un sujet manuellement
- **Champ texte libre** pour du contexte additionnel
- **Persistance** dans `CocoonStrategy` pour éviter la re-génération à chaque visite

### Scope

**In Scope:**
- Génération automatique des sujets via Claude au chargement du step 6 (Articles)
- Persistance des sujets dans `CocoonStrategy` (nouveau champ `suggestedTopics`)
- UI : checkboxes, icônes de suppression, bouton régénérer, possibilité d'ajouter un sujet
- Champ texte libre pour contexte additionnel (persisté aussi)
- Nouveau step `articles-topics` dans le schema de suggestion backend
- Nombre de sujets dynamique (Claude décide selon la richesse du cocon)

**Out of Scope:**
- Injection des sujets cochés / texte libre comme input dans `generateArticleProposals()` (phase ultérieure)
- Modification des prompts de génération d'articles existants
- Modification du flux de génération 3 phases (structure → PAA → spécialisés)

## Context for Development

### Codebase Patterns

- **Composable pattern** : `useArticleProposals.ts` (761 lignes) encapsule toute la logique article proposals — refs réactives, fonctions async, watchers. Le nouveau code topics suit ce même pattern dans le même composable.
- **Store Pinia** : `cocoon-strategy.store.ts` expose `requestSuggestion(cocoonSlug, { step, currentInput, context })` qui POST vers `/strategy/cocoon/:slug/suggest` et retourne `suggestion: string`.
- **Route handler** : `strategy.routes.ts` (lignes 242-380) parse le body avec Zod, route vers le bon template via un switch sur `parsed.step`, puis appelle `streamChatCompletion(prompt, userMessage, maxTokens)`.
- **Template routing** : chaque step mappe vers un fichier `.md` dans `server/prompts/` avec placeholders `{{mustache}}` (`{{cocoonName}}`, `{{siloName}}`, blocs conditionnels `{{#themeContext}}...{{/themeContext}}`).
- **Persistance JSON** : `data/strategies/cocoon-{slug}.json` via `server/services/cocoon-strategy.service.ts` + `server/utils/json-storage.ts` (écriture atomique tmp → rename).
- **Pas de migration nécessaire** : le stockage JSON accepte les nouveaux champs sans migration. Les anciens fichiers auront simplement `suggestedTopics: undefined`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `shared/types/strategy.types.ts` | Types TS — `CocoonStrategy`, `CocoonSuggestRequest`, `SuggestedTopic` (à créer) |
| `shared/schemas/strategy.schema.ts` | Schemas Zod — `cocoonStrategySchema`, `cocoonSuggestRequestSchema` |
| `src/composables/useArticleProposals.ts` | Composable — logique génération articles + topics |
| `src/components/production/BrainPhase.vue` | Composant Vue — UI step 6 Articles (1043 lignes) |
| `src/components/production/TopicSuggestions.vue` | Nouveau composant — UI section topics (à créer) |
| `server/routes/strategy.routes.ts` | Route handler — `COCOON_STEP_DESCRIPTIONS`, template routing, maxTokens |
| `server/prompts/cocoon-articles-topics.md` | Nouveau prompt template pour la génération de sujets (à créer) |
| `server/services/claude.service.ts` | `streamChatCompletion()` — appel Anthropic SDK |
| `server/services/cocoon-strategy.service.ts` | Persistance JSON des stratégies cocon |

### Technical Decisions

- **Persistance dans CocoonStrategy** plutôt qu'un store séparé : les topics font partie intégrante de la stratégie du cocon, même cycle de vie. Pas de migration DB nécessaire (JSON).
- **Extraction en composant `TopicSuggestions.vue`** : vu la taille de BrainPhase (1043 lignes), la section topics sera un composant enfant dédié pour éviter le bloat.
- **Génération auto au mount du step 6** avec garde : ne génère que si `suggestedTopics` est vide/absent et que les étapes 1-5 sont remplies.
- **Nombre dynamique** : le prompt Claude demande de couvrir exhaustivement le scope du cocon sans limite fixe.
- **maxTokens = 2048** pour le step `articles-topics` : suffisant pour une liste de sujets JSON, pas besoin de 4096.
- **Format de réponse Claude** : tableau JSON de strings `["sujet 1", "sujet 2", ...]` parsé côté frontend puis transformé en objets `SuggestedTopic`.

## Implementation Plan

### Tasks

- [ ] **Task 1 : Types partagés — Ajouter `SuggestedTopic` et étendre `CocoonStrategy` et `CocoonSuggestRequest`**
  - File : `shared/types/strategy.types.ts`
  - Action : Ajouter l'interface `SuggestedTopic` avec les champs `topic: string` et `checked: boolean`. Ajouter les champs `suggestedTopics?: SuggestedTopic[]` et `topicsUserContext?: string` à l'interface `CocoonStrategy`. Ajouter `'articles-topics'` à l'union de `step` dans `CocoonSuggestRequest`.
  - Notes : `SuggestedTopic` est volontairement simple — un label + un booléen. Pas de `id` nécessaire car le `topic` string est unique dans la liste.

- [ ] **Task 2 : Schemas Zod — Ajouter validation pour les topics**
  - File : `shared/schemas/strategy.schema.ts`
  - Action : Créer `suggestedTopicSchema = z.object({ topic: z.string(), checked: z.boolean() })`. Ajouter `.suggestedTopics: z.array(suggestedTopicSchema).default([])` et `.topicsUserContext: z.string().default('')` au `cocoonStrategySchema`. Ajouter `'articles-topics'` à l'enum `step` dans `cocoonSuggestRequestSchema`.
  - Notes : `.default([])` et `.default('')` garantissent la rétrocompatibilité avec les fichiers JSON existants.

- [ ] **Task 3 : Prompt template — Créer `cocoon-articles-topics.md`**
  - File : `server/prompts/cocoon-articles-topics.md` (nouveau fichier)
  - Action : Créer le prompt qui demande à Claude de proposer des sujets/sous-thèmes couvrant exhaustivement le scope du cocon. Le prompt utilise les placeholders `{{cocoonName}}`, `{{siloName}}`, `{{#themeContext}}`, `{{#previousAnswers}}`. Claude doit retourner un tableau JSON de strings `["sujet 1", "sujet 2", ...]`. Le prompt insiste sur : couvrir le maximum de facettes du cocon, chaque sujet = un angle distinct, pas de doublon, pas de limite de nombre, adapté au secteur et à la cible.
  - Notes : Suivre le style des prompts existants (`cocoon-articles.md`, `cocoon-add-article.md`). Format de sortie JSON sans code fence.

- [ ] **Task 4 : Route backend — Ajouter le step `articles-topics`**
  - File : `server/routes/strategy.routes.ts`
  - Action :
    1. Ajouter `'articles-topics': "Propose les sujets et sous-thèmes à couvrir dans ce cocon pour guider la génération d'articles."` dans `COCOON_STEP_DESCRIPTIONS` (ligne ~217).
    2. Ajouter `else if (parsed.step === 'articles-topics') { templateFile = 'cocoon-articles-topics.md' }` dans le switch de template routing (après le check `articles-structure`, avant `articles-paa-queries`).
    3. Ajouter `parsed.step === 'articles-topics'` à la condition maxTokens 2048 (avec `articles-paa-queries`).
  - Notes : Pas besoin de post-processing spécial côté route. Le parsing JSON se fait côté frontend.

- [ ] **Task 5 : Composable — Ajouter la logique de gestion des topics dans `useArticleProposals.ts`**
  - File : `src/composables/useArticleProposals.ts`
  - Action : Ajouter les éléments suivants au composable existant :
    1. `topicsLoading = ref(false)` — état de chargement de la génération topics.
    2. `topicsError = ref<string | null>(null)` — erreur éventuelle.
    3. `async function generateTopics()` — appelle `store.requestSuggestion(cocoonSlug, { step: 'articles-topics', currentInput: 'Propose les sujets du cocon.', context })`, parse le JSON retourné en `SuggestedTopic[]` (chaque string → `{ topic, checked: true }`), écrit dans `store.strategy.suggestedTopics`, appelle `store.saveStrategy()`.
    4. `function toggleTopic(index: number)` — inverse `checked` du topic à l'index donné, appelle `store.saveStrategy()`.
    5. `function removeTopic(index: number)` — retire le topic via `splice()`, appelle `store.saveStrategy()`.
    6. `function addTopic(topic: string)` — push `{ topic, checked: true }` dans la liste, appelle `store.saveStrategy()`.
    7. `function updateUserContext(text: string)` — écrit dans `store.strategy.topicsUserContext`, appelle `store.saveStrategy()` (debounced 500ms).
    8. Watcher sur `store.currentStep` : quand `=== 5` (step 6 Articles), si `store.strategy.suggestedTopics` est vide/undefined et `store.strategy.completedSteps >= 5`, appeler `generateTopics()` automatiquement.
    9. Exposer `topicsLoading`, `topicsError`, `generateTopics`, `toggleTopic`, `removeTopic`, `addTopic`, `updateUserContext` dans le return du composable.
  - Notes : Le `saveStrategy` est déjà debounced-safe dans le store (appels successifs écrasent). Le watcher doit avoir une garde `topicsLoading.value` pour éviter les doubles appels.

- [ ] **Task 6 : Composant Vue — Créer `TopicSuggestions.vue`**
  - File : `src/components/production/TopicSuggestions.vue` (nouveau fichier)
  - Action : Créer un composant qui reçoit via props :
    - `topics: SuggestedTopic[]` — la liste des sujets
    - `userContext: string` — le texte libre
    - `loading: boolean` — état de chargement
    - `error: string | null` — erreur éventuelle
  - Émet les events : `@toggle(index)`, `@remove(index)`, `@add(topic)`, `@regenerate`, `@update:user-context(text)`
  - Structure du template :
    1. **En-tête** : titre "Sujets suggérés" avec un bouton icône "régénérer" (flèche circulaire SVG) qui émet `@regenerate`.
    2. **État loading** : texte "Génération des sujets..." avec animation.
    3. **État erreur** : message d'erreur avec bouton "Réessayer".
    4. **Liste de checkboxes** : pour chaque topic, une ligne avec `<input type="checkbox" :checked="topic.checked">`, le label `topic.topic`, et une icône poubelle SVG (× ou trash) pour supprimer. Click sur checkbox → `@toggle(index)`. Click sur icône → `@remove(index)`.
    5. **Ligne d'ajout** : un mini-formulaire inline avec `<input type="text" placeholder="Ajouter un sujet...">` et un bouton "+" qui émet `@add(inputValue)` puis vide l'input.
    6. **Champ texte libre** : `<textarea placeholder="Contexte additionnel (optionnel)..." :value="userContext">` qui émet `@update:user-context` sur `@input`.
  - Style : utiliser les classes CSS existantes de BrainPhase (`.brain-step-content`, etc.) pour la cohérence visuelle. Section entourée d'un cadre léger (`.topic-suggestions` wrapper).
  - Notes : Composant "dumb" (presentational) — toute la logique est dans le composable. Pas de dépendance directe au store.

- [ ] **Task 7 : Intégration BrainPhase — Câbler `TopicSuggestions` dans le step 6**
  - File : `src/components/production/BrainPhase.vue`
  - Action :
    1. Importer `TopicSuggestions` et les nouvelles valeurs exposées par `useArticleProposals` (`topicsLoading`, `topicsError`, `generateTopics`, `toggleTopic`, `removeTopic`, `addTopic`, `updateUserContext`).
    2. Insérer `<TopicSuggestions>` dans le template entre le `<p class="step-desc">` (ligne 461) et le `<button class="btn-generate">` (ligne 463), dans la section `.article-proposal-wrapper`.
    3. Binder les props : `:topics="store.strategy?.suggestedTopics ?? []"`, `:user-context="store.strategy?.topicsUserContext ?? ''"`, `:loading="topicsLoading"`, `:error="topicsError"`.
    4. Binder les events : `@toggle="toggleTopic"`, `@remove="removeTopic"`, `@add="addTopic"`, `@regenerate="generateTopics"`, `@update:user-context="updateUserContext"`.
  - Notes : L'insertion est localisée — une seule zone du template est touchée. Le reste de BrainPhase ne change pas.

- [ ] **Task 8 : Tests — Composant `TopicSuggestions`**
  - File : `tests/unit/components/topic-suggestions.test.ts` (nouveau fichier)
  - Action : Tester :
    1. Rendu des checkboxes quand `topics` est non-vide.
    2. Pas de rendu checkboxes quand `topics` est vide et `loading` est false.
    3. Affichage du loader quand `loading` est true.
    4. Affichage de l'erreur quand `error` est non-null.
    5. Click checkbox → émet `toggle` avec le bon index.
    6. Click icône suppression → émet `remove` avec le bon index.
    7. Saisie dans l'input + click "+" → émet `add` avec la valeur saisie.
    8. Click régénérer → émet `regenerate`.
    9. Saisie textarea → émet `update:user-context` avec la valeur.
  - Notes : Pattern identique à `brain-article-hierarchy.test.ts` — mount avec props, trigger events, assert emits.

- [ ] **Task 9 : Tests — Logique composable topics**
  - File : `tests/unit/composables/useTopicSuggestions.test.ts` (nouveau fichier)
  - Action : Tester :
    1. `generateTopics()` — mock `requestSuggestion` retournant un JSON de strings → vérifie que `store.strategy.suggestedTopics` contient les bons objets `{ topic, checked: true }`.
    2. `generateTopics()` — mock `requestSuggestion` retournant null → vérifie `topicsError`.
    3. `toggleTopic(index)` — vérifie inversion du `checked`.
    4. `removeTopic(index)` — vérifie suppression du bon élément.
    5. `addTopic('nouveau sujet')` — vérifie ajout.
    6. Watcher auto-génération — simuler `currentStep = 5` avec `suggestedTopics` vide → vérifie que `generateTopics` est appelé.
    7. Watcher garde — simuler `currentStep = 5` avec `suggestedTopics` déjà rempli → vérifie que `generateTopics` n'est PAS appelé.
  - Notes : Utiliser `setActivePinia(createPinia())` + mock de `requestSuggestion` via `vi.mock`.

- [ ] **Task 10 : Tests — Schema et route backend**
  - File : `tests/unit/schemas/zod-schemas.test.ts` (existant) + `tests/unit/routes/strategy.routes.test.ts` (existant)
  - Action :
    1. Schema : ajouter un test vérifiant que `cocoonStrategySchema.parse()` accepte un objet avec `suggestedTopics` et `topicsUserContext`. Vérifier aussi qu'un objet sans ces champs est accepté (defaults).
    2. Schema : ajouter un test vérifiant que `cocoonSuggestRequestSchema.parse()` accepte `step: 'articles-topics'`.
    3. Route : ajouter un test vérifiant que le step `articles-topics` route vers le bon template (mock de `readFile` + `streamChatCompletion`).
  - Notes : S'insérer dans les describe existants pour maintenir la cohérence.

### Acceptance Criteria

- [ ] **AC 1** : Given l'utilisateur navigue vers le step 6 (Articles) pour la première fois, when le step se charge et `suggestedTopics` est vide, then une requête `articles-topics` est envoyée à Claude et les sujets retournés s'affichent comme checkboxes cochées.

- [ ] **AC 2** : Given les sujets ont déjà été générés et sont persistés, when l'utilisateur revient sur le step 6, then les sujets sont affichés depuis la donnée persistée sans nouveau call à Claude.

- [ ] **AC 3** : Given la liste de sujets est affichée, when l'utilisateur décoche un sujet, then le `checked` passe à false, le changement est persisté, et la checkbox reflète le nouvel état.

- [ ] **AC 4** : Given la liste de sujets est affichée, when l'utilisateur clique sur l'icône de suppression d'un sujet, then le sujet est retiré de la liste et la suppression est persistée.

- [ ] **AC 5** : Given la liste de sujets est affichée, when l'utilisateur saisit un texte dans l'input d'ajout et clique "+", then un nouveau sujet coché est ajouté en fin de liste et persisté.

- [ ] **AC 6** : Given la liste de sujets est affichée, when l'utilisateur clique sur le bouton régénérer, then une nouvelle requête Claude est envoyée et la liste est remplacée par les nouveaux sujets (tous cochés).

- [ ] **AC 7** : Given la section topics est affichée, when l'utilisateur saisit du texte dans le champ "Contexte additionnel", then le texte est persisté dans `topicsUserContext` de la stratégie.

- [ ] **AC 8** : Given la génération de sujets est en cours, when Claude n'a pas encore répondu, then un indicateur de chargement est affiché et le bouton régénérer est désactivé.

- [ ] **AC 9** : Given la génération de sujets échoue, when une erreur survient, then un message d'erreur est affiché avec un bouton "Réessayer".

- [ ] **AC 10** : Given un ancien fichier de stratégie JSON sans champ `suggestedTopics`, when il est chargé par le frontend, then il est parsé sans erreur avec `suggestedTopics: []` et `topicsUserContext: ''` par défaut.

## Additional Context

### Dependencies

- API backend existante `/strategy/cocoon/:slug/suggest` — route, validation Zod, template routing
- `streamChatCompletion()` dans `claude.service.ts` — aucun changement nécessaire
- Persistance JSON — aucun changement nécessaire (nouveau champ ajouté au type/schema suffit)
- Aucune dépendance externe nouvelle (pas de nouveau package npm)

### Testing Strategy

- **Composant `TopicSuggestions`** : 9 tests unitaires couvrant rendu, interactions, et edge cases (vide, loading, erreur) — `tests/unit/components/topic-suggestions.test.ts`
- **Composable topics** : 7 tests unitaires couvrant génération, manipulation, watcher auto, et garde — `tests/unit/composables/useTopicSuggestions.test.ts`
- **Schema + Route** : 3 tests ajoutés aux suites existantes — rétrocompatibilité schema, nouveau step enum, routing template
- **Test manuel** : vérifier visuellement l'intégration dans BrainPhase, la cohérence CSS, et le cycle complet (génération → manipulation → persistance → rechargement)

### Notes

- L'intégration des topics sélectionnés dans le flux de génération d'articles sera traitée dans une spec séparée (phase 2). Le composable expose déjà les données nécessaires via `store.strategy.suggestedTopics` et `store.strategy.topicsUserContext`.
- Le champ texte libre (`topicsUserContext`) est persisté mais pas consommé par la génération pour l'instant.
- Les anciens fichiers JSON de stratégie sans `suggestedTopics` restent valides grâce à `.default([])` et `.default('')` dans le Zod schema.
- Risque : si Claude retourne un JSON malformé, le parsing échouera. Prévoir un try/catch dans `generateTopics()` avec fallback sur `topicsError`.
- La régénération remplace toute la liste — pas de merge avec les sujets existants. Choix volontaire pour la simplicité.
