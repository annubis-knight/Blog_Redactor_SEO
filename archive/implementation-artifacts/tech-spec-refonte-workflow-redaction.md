> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Refonte workflow rédaction — fusion Brief+Sommaire, micro-contexte article, suppression stratégie redondante'
slug: 'refonte-workflow-redaction'
created: '2026-04-06'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3', 'Pinia', 'TypeScript', 'SSE streaming', 'marked', 'Vitest', 'Vue Test Utils']
files_to_modify:
  - shared/types/keyword.types.ts
  - shared/schemas/article-keywords.schema.ts
  - src/stores/article-keywords.store.ts
  - server/routes/keywords.routes.ts
  - src/components/moteur/LieutenantsSelection.vue
  - src/views/ArticleWorkflowView.vue
  - src/stores/outline.store.ts
  - src/composables/usePanelToggle.ts
  - server/routes/generate.routes.ts
  - server/routes/articles.routes.ts (NEW or existing)
  - server/services/data.service.ts
  - server/prompts/brief-ia-panel.md (NEW)
  - server/prompts/micro-context-suggest.md (NEW)
  - shared/types/article-micro-context.types.ts (NEW)
  - shared/schemas/article-micro-context.schema.ts (NEW)
  - data/article-micro-context.json (NEW)
  - src/components/workflow/BriefStructureStep.vue (NEW)
code_patterns: ['useStreaming SSE composable', 'CollapsableSection', 'OutlineEditor drag-drop', 'Panel IA markdown rendering via marked', 'article-progress checks emit', 'data.service JSON persistence', 'Zod schema validation on data load']
test_patterns: ['vitest + jsdom', 'mount() avec stubs', 'setActivePinia(createPinia())', 'vi.mock() API services', 'SSE stream mocking via fetch spy']
---

# Tech-Spec: Refonte workflow rédaction — fusion Brief+Sommaire, micro-contexte article, suppression stratégie redondante

**Created:** 2026-04-06

## Overview

### Problem Statement

Le workflow rédaction actuel impose 4 étapes séquentielles (Stratégie → Brief → Sommaire → Article). La première étape — un wizard stratégie de 6 sous-étapes (Cible, Douleur, Aiguillage, Angle, Promesse, CTA) — est redondante à ~95% avec le contexte déjà validé dans les workflows Cerveau (stratégie cocon) et Moteur (keywords + HN). La structure HN validée dans le Moteur n'est pas persistée ni réutilisée par le workflow rédaction. Le Brief et le Sommaire sont deux étapes séparées alors qu'ils sont fortement corrélés et interdépendants.

### Solution

Passer de 4 étapes à 2 étapes :
1. **Brief & Structure** — Vue unique scrollable : contexte stratégique auto-assemblé depuis cocon/thème, micro-contexte article (angle + ton + consignes), keywords validés, sommaire pré-rempli depuis la HN moteur (éditable), données SEO, et Panel IA explicatif en sidebar
2. **Article** — Génération IA + meta tags + lien éditeur (comportement actuel conservé)

### Scope

**In Scope :**
- Persistance de la structure HN dans `article-keywords.json` (ajout champ `hnStructure`)
- Nouveau step fusionné "Brief & Structure" (vue scrollable unique)
- Micro-contexte article : Angle différenciant (obligatoire), Ton/Style (optionnel), Consignes spécifiques (optionnel) — pré-remplis par IA depuis contexte cocon
- Panel IA explicatif en sidebar (réutilise pattern `useStreaming` + `marked`)
- Suppression du StrategyWizard comme step 1 du workflow
- Suppression de l'AiguillageStep (type déjà assigné dans Cerveau)
- Stepper passe de 4 → 2 étapes
- Adaptation de l'outline store pour charger la HN persistée comme base

**Out of Scope :**
- Workflow Moteur (inchangé sauf persistance HN dans LieutenantsSelection)
- Workflow Cerveau (inchangé)
- ArticleEditorView / éditeur full-screen (inchangé)
- Prompts de génération d'article body (inchangé pour cette spec)
- Suppression du code strategy.store / StrategyWizard (nettoyage différé)

## Context for Development

### Codebase Patterns

1. **Persistence pattern** : `data.service.ts` lit/écrit des JSON plats dans `/data/`. Chaque data file a un **Zod schema** associé dans `shared/schemas/` qui valide les données au chargement (ex: `articleKeywordsSchema` dans `article-keywords.schema.ts`). Le store frontend appelle `apiPut()` qui poste au route Express, qui appelle le data service.
2. **Route handler pattern** : Les handlers Express **destructurent explicitement** les champs du body. **Tout champ non destructuré est silencieusement ignoré.** Il faut donc toujours mettre à jour le handler ET le Zod schema quand on ajoute un champ.
3. **Streaming IA** : `useStreaming<T>()` composable retourne `{ chunks, isStreaming, error, result, usage, startStream, abort }`. SSE via POST avec events `chunk`, `done`, `error`. Le `done` event contient le résultat typé parsé (JSON). Le rendu markdown pour les panels IA se fait via `marked.parse(chunks.value)`.
4. **Outline editing** : `OutlineEditor.vue` gère add/remove/reorder/rename via events émis au parent. Les sections sont `{ id, level, title, annotation }`. Drag-drop intégré. IDs générés avec `h${level}-${Date.now()}`.
5. **CollapsableSection** : Composant wrapper pour sections repliables, utilisé partout dans le workflow.
6. **Progress tracking** : `article-progress.store.ts` via `emit('check-completed', checkName)` depuis les composants.
7. **HN structure** : Générée dans `LieutenantsSelection.vue` via `/api/keywords/:kw/ai-hn-structure`, format `ProposeLieutenantsHnNode[]` avec `{ level: number, text: string, children?: [] }`. Actuellement NON persistée. **Attention** : `level` est `number` (pas `1|2|3`).
8. **PanelToggle** : `usePanelToggle.ts` expose un type `PanelId = 'seo' | 'geo' | 'linking' | null`. Tout nouveau panel nécessite d'étendre ce type union.
9. **Route organisation** : Les endpoints REST CRUD sont dans des fichiers routes dédiés par ressource (`keywords.routes.ts`, etc.). Les endpoints SSE de génération IA sont dans `generate.routes.ts` sous `/api/generate/`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `shared/types/keyword.types.ts` | Interface `ArticleKeywords` — ajouter `hnStructure?` |
| `shared/schemas/article-keywords.schema.ts` | Zod schema — ajouter `hnStructure` optionnel |
| `src/stores/article-keywords.store.ts` | Store keywords — inclure hnStructure dans save/load |
| `server/routes/keywords.routes.ts` | PUT `/articles/:slug/keywords` — destructurer `hnStructure` + `rootKeywords` |
| `server/services/data.service.ts` | Ajouter `loadArticleMicroContext` + `saveArticleMicroContext` |
| `src/components/moteur/LieutenantsSelection.vue` | Assigner hnStructure au store avant save dans `lockLieutenants()` |
| `src/views/ArticleWorkflowView.vue` | Vue principale — refactorer en 2 steps, déléguer à BriefStructureStep |
| `src/stores/outline.store.ts` | Ajouter `hnToOutline()` + `loadFromHnStructure()` |
| `src/composables/usePanelToggle.ts` | Étendre `PanelId` avec `'ia-brief'` |
| `shared/types/outline.types.ts` | Types `Outline`, `OutlineSection`, `OutlineAnnotation` |
| `shared/types/serp-analysis.types.ts` | Type `ProposeLieutenantsHnNode` |
| `src/components/outline/OutlineEditor.vue` | Éditeur drag-drop existant — réutilisé tel quel |
| `src/components/outline/OutlineDisplay.vue` | Affichage read-only avec annotations — réutilisé tel quel |
| `src/components/brief/SeoBrief.vue` | Header brief — réutilisé, alimenté auto depuis contexte cocon |
| `src/components/brief/KeywordList.vue` | Liste keywords groupés — réutilisé tel quel |
| `src/components/brief/DataForSeoPanel.vue` | Métriques SEO + SERP + PAA — réutilisé tel quel |
| `src/components/brief/ContentRecommendation.vue` | Target word count — réutilisé en collapsed |
| `src/components/brief/ContentGapPanel.vue` | Analyse concurrents — réutilisé en collapsed |
| `src/components/strategy/ContextRecap.vue` | Panneau contexte stratégique — réutiliser avec props adaptées |
| `src/composables/useStreaming.ts` | Composable SSE — réutilisé pour Panel IA |
| `server/prompts/capitaine-ai-panel.md` | Prompt Panel IA capitaine — modèle pour le nouveau prompt |
| `src/stores/cocoon-strategy.store.ts` | Stratégie cocon — source données auto-assemblage |
| `src/stores/theme-config.store.ts` | Config thème — source données auto-assemblage |

### Technical Decisions

1. **HN → Outline transformation** : Fonction pure `hnToOutline(hnNodes, articleTitle)` dans `outline.store.ts`. **Clamping** des niveaux : tout `level` hors `[1,3]` est clampé (< 1 → 2, > 3 → 3). Les IDs utilisent le format `h${level}-${Date.now()}-${index}` pour être **compatibles** avec les IDs générés par `addSection()` dans `OutlineEditor` (qui utilise `h${level}-${Date.now()}`).

2. **Micro-contexte article** : Nouveau type `ArticleMicroContext { slug, angle, tone?, directives?, updatedAt }` persisté dans `data/article-micro-context.json` via `data.service.ts` avec **Zod schema** de validation. Endpoints REST GET/PUT dans un fichier route dédié articles (`server/routes/articles.routes.ts`). Endpoint SSE suggest dans `generate.routes.ts`.

3. **Panel IA Brief** : Endpoint SSE `POST /api/generate/brief-explain` dans `generate.routes.ts`. Streame du markdown, événement `done` signale la fin.

4. **Injection micro-contexte dans génération** : Le serveur charge le micro-contexte depuis le JSON via `loadArticleMicroContext(slug)` côté serveur. Le client n'envoie PAS le micro-contexte dans les bodies de génération — c'est le serveur qui l'injecte. Ceci évite de modifier les signatures de `generateArticle()`/`generateOutline()`.

5. **ContextRecap adaptation** : Le composant `ContextRecap.vue` est réutilisé tel quel. La prop `previousAnswers` reçoit un objet vide `{}` (plus de stratégie article-level). Les données stratégiques viennent de la prop `cocoonStrategy` (stratégie cocon validée). La prop `themeConfig` continue de fonctionner.

6. **Extraction sous-composant** : Le step Brief & Structure est extrait dans `src/components/workflow/BriefStructureStep.vue` pour éviter de surcharger `ArticleWorkflowView.vue` (déjà 680 lignes). Le pattern suit celui de `StrategyWizard.vue` (composant dédié, props + emits).

7. **cocoonSlug derivation** : `cocoonSlug` est dérivé depuis `briefStore.briefData.article.cocoonName` via slugification (`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`). Ce pattern est déjà utilisé dans `StrategyWizard.vue` ligne 304-310.

8. **Backward compatibility** : `hnStructure` est optionnel (`?`) dans `ArticleKeywords` et dans le Zod schema (`.optional().default([])`). Les articles sans HN affichent un bouton "Générer le sommaire" classique comme fallback. Le check `strategy-done` de l'ancien flow n'est plus vérifié — les articles legacy qui l'ont gardent l'info mais elle n'est plus bloquante.

9. **Pas de suppression immédiate** : Le code du StrategyWizard, strategy.store, et les 6 sous-composants restent dans le codebase mais ne sont plus importés. Nettoyage dans une spec séparée.

---

## Implementation Plan

### Tasks

#### Phase A : Persistance HN (couche basse → haute)

- [x] Task 1 : Ajouter `hnStructure` au type et au Zod schema
  - Files : `shared/types/keyword.types.ts`, `shared/schemas/article-keywords.schema.ts`
  - Action type : Ajouter `hnStructure?: ProposeLieutenantsHnNode[]` à l'interface `ArticleKeywords`. Importer `ProposeLieutenantsHnNode` depuis `serp-analysis.types.ts`.
  - Action schema : Ajouter au Zod schema `articleKeywordsSchema` :
    ```typescript
    hnStructure: z.array(z.object({
      level: z.number(),
      text: z.string(),
      children: z.array(z.object({ level: z.number(), text: z.string() })).optional(),
    })).optional().default([])
    ```
  - Notes : Le `.optional().default([])` garantit que les entrées existantes sans `hnStructure` passent la validation Zod sans erreur.

- [x] Task 2 : Corriger et étendre le route handler PUT keywords
  - File : `server/routes/keywords.routes.ts`
  - Action : Dans le handler `PUT /api/articles/:slug/keywords`, **remplacer** la destructuration actuelle `const { capitaine, lieutenants, lexique } = req.body` par `const { capitaine, lieutenants, lexique, rootKeywords, hnStructure } = req.body`. Passer **tous les champs** à `saveArticleKeywords()` :
    ```typescript
    const saved = await saveArticleKeywords(req.params.slug, {
      capitaine,
      lieutenants: lieutenants ?? [],
      lexique: lexique ?? [],
      rootKeywords: rootKeywords ?? [],
      hnStructure: hnStructure ?? [],
    })
    ```
  - Notes : Ceci corrige aussi le bug existant où `rootKeywords` était silencieusement droppé par le handler.

- [x] Task 3 : Inclure `hnStructure` dans le payload save côté store
  - File : `src/stores/article-keywords.store.ts`
  - Action : Dans `saveKeywords()`, ajouter `hnStructure: keywords.value.hnStructure ?? []` au body du PUT, à côté de `rootKeywords`. Le `fetchKeywords()` récupère déjà tous les champs du type `ArticleKeywords` automatiquement.

- [x] Task 4 : Persister la HN lors du lock lieutenants
  - File : `src/components/moteur/LieutenantsSelection.vue`
  - Action : Dans la fonction `lockLieutenants()`, avant l'appel `store.saveKeywords(slug)`, assigner `store.keywords.hnStructure = hnStructure.value`.
  - Notes : **Limitation connue** — si l'utilisateur modifie les lieutenants sélectionnés après la proposition IA sans relancer la génération HN, la structure HN persistée peut contenir des H2 pour des lieutenants désélectionnés. Mitigation : la HN est un point de départ éditable dans le workflow rédaction, l'utilisateur peut ajuster. Documenter dans les notes de release.

#### Phase B : Transformation HN → Outline

- [x] Task 5 : Créer la fonction `hnToOutline()` dans le outline store
  - File : `src/stores/outline.store.ts`
  - Action : Ajouter une fonction pure **exportée** :
    ```typescript
    export function hnToOutline(hnNodes: ProposeLieutenantsHnNode[], articleTitle: string): Outline
    ```
    Logique :
    1. Crée la section H1 : `{ id: 'h1-${Date.now()}', level: 1, title: articleTitle, annotation: 'sommaire-cliquable' }`
    2. Crée une section H2 "Introduction" : `{ id: 'h2-${Date.now()}-intro', level: 2, title: 'Introduction', annotation: 'content-valeur' }`
    3. Pour chaque `hnNode` : **clamper** `node.level` dans `[2, 3]` (si `< 2` → `2`, si `> 3` → `3`). Créer un `OutlineSection` avec `id: 'h${clampedLevel}-${Date.now()}-${index}'`. Si le noeud a des `children`, aplatir en créant des sections additionnelles (chacune clampée de la même manière).
    4. Crée une section H2 "Conclusion" : `{ id: 'h2-${Date.now()}-conclusion', level: 2, title: 'Conclusion', annotation: 'content-reminder' }`
  - Notes : Fonction pure, facilement testable unitairement. Le format d'ID `h${level}-${Date.now()}-${suffix}` est compatible avec `addSection()` de `OutlineEditor` qui utilise `h${level}-${Date.now()}`.

- [x] Task 6 : Ajouter `loadFromHnStructure()` au outline store
  - File : `src/stores/outline.store.ts`
  - Action : Ajouter une méthode :
    ```typescript
    function loadFromHnStructure(hnNodes: ProposeLieutenantsHnNode[], articleTitle: string) {
      outline.value = hnToOutline(hnNodes, articleTitle)
      isValidated.value = false
    }
    ```

#### Phase C : Micro-contexte article

- [x] Task 7 : Créer le type et le Zod schema micro-contexte
  - Files : `shared/types/article-micro-context.types.ts` (NEW), `shared/schemas/article-micro-context.schema.ts` (NEW)
  - Action type :
    ```typescript
    export interface ArticleMicroContext {
      slug: string
      angle: string           // Obligatoire — angle différenciant de cet article
      tone?: string           // Optionnel — ton/style spécifique
      directives?: string     // Optionnel — consignes libres pour la rédaction
      updatedAt: string       // ISO timestamp
    }
    ```
    Exporter depuis `shared/types/index.ts`.
  - Action schema :
    ```typescript
    export const articleMicroContextSchema = z.object({
      slug: z.string().min(1),
      angle: z.string(),
      tone: z.string().optional().default(''),
      directives: z.string().optional().default(''),
      updatedAt: z.string(),
    })
    export const microContextDbSchema = z.object({
      micro_contexts: z.array(articleMicroContextSchema),
    })
    ```

- [x] Task 8 : Créer le data file et les méthodes data service
  - Files : `data/article-micro-context.json` (NEW), `server/services/data.service.ts`
  - Action :
    - Créer `data/article-micro-context.json` : `{ "micro_contexts": [] }`
    - Dans `data.service.ts`, ajouter `loadArticleMicroContext(slug): ArticleMicroContext | null` et `saveArticleMicroContext(slug, data): ArticleMicroContext` en suivant le pattern exact de `loadArticleKeywords/saveArticleKeywords` avec **validation Zod** via `microContextDbSchema.parse(raw)`.

- [x] Task 9 : Ajouter les endpoints REST micro-contexte
  - File : `server/routes/articles.routes.ts` (NEW ou existant)
  - Action : Créer un router Express pour les articles, monté sur `/api/articles` :
    - `GET /api/articles/:slug/micro-context` — Appelle `loadArticleMicroContext(slug)`, retourne `{ data: result }` ou `{ data: null }` si absent.
    - `PUT /api/articles/:slug/micro-context` — Extrait `{ angle, tone, directives }` du body. Appelle `saveArticleMicroContext(slug, { angle, tone, directives, updatedAt: new Date().toISOString() })`. Retourne `{ data: saved }`.
  - Notes : Les endpoints REST CRUD sont séparés des endpoints SSE de génération, conformément au pattern d'organisation des routes du projet.

- [x] Task 10 : Ajouter l'endpoint SSE micro-context suggest
  - File : `server/routes/generate.routes.ts`
  - Action : `POST /api/generate/micro-context-suggest` — Endpoint SSE qui :
    1. Reçoit dans le body : `{ slug, articleTitle, articleType, keyword, cocoonName, siloName, cocoonStrategy, themeConfig }`
    2. Charge le prompt `micro-context-suggest.md`
    3. Streame la réponse Claude
    4. L'événement `done` contient le JSON parsé `{ angle: string, tone: string, directives: string }`
    5. Le client utilise `useStreaming<{ angle: string, tone: string, directives: string }>()` et accède au résultat typé via `result.value`

- [x] Task 11 : Créer le prompt de suggestion micro-contexte
  - File : `server/prompts/micro-context-suggest.md` (NEW)
  - Action : Prompt expert SEO qui reçoit le contexte complet et génère un JSON :
    ```json
    { "angle": "...", "tone": "...", "directives": "..." }
    ```
    - **angle** : Ce qui différencie cet article des autres du cocon et des concurrents SERP
    - **tone** : Le ton recommandé vu le type d'article (pilier=exhaustif/pédagogique, spécialisé=expert/précis)
    - **directives** : Points d'attention rédactionnels spécifiques (longueur, CTA, maillage interne)
  - Notes : S'inspirer de `capitaine-ai-panel.md`. Le JSON doit être renvoyé encapsulé dans un bloc code pour parsing fiable.

#### Phase D : Panel IA Brief & Structure

- [x] Task 12 : Créer le prompt Panel IA Brief
  - File : `server/prompts/brief-ia-panel.md` (NEW)
  - Action : Prompt expert SEO. Sortie markdown structurée en 3 parties :
    1. **Analyse du brief** : Forces du positionnement, couverture sémantique, opportunités PAA
    2. **Explication de la structure** : Pourquoi cette structure HN est pertinente, comment elle couvre l'intention de recherche
    3. **Recommandations** : Points d'attention pour la rédaction, maillage interne suggéré, densité keyword recommandée

- [x] Task 13 : Ajouter l'endpoint SSE brief-explain
  - File : `server/routes/generate.routes.ts`
  - Action : `POST /api/generate/brief-explain` — Endpoint SSE qui streame du markdown. Events : `chunk` (markdown incrémental), `done` (fin), `error`. Pas de résultat JSON typé — le client affiche directement `chunks` via `marked.parse()`.

#### Phase E : Refonte vue principale + sous-composant

- [x] Task 14 : Étendre `PanelId` dans `usePanelToggle`
  - File : `src/composables/usePanelToggle.ts`
  - Action : Ajouter `'ia-brief'` au type `PanelId`. Ajouter un computed `showIaBriefPanel`. Mettre à jour les exports.

- [x] Task 15 : Créer le sous-composant `BriefStructureStep.vue`
  - File : `src/components/workflow/BriefStructureStep.vue` (NEW)
  - Props : `slug: string`, `cocoonName: string`, `siloName: string`, `articleTitle: string`
  - Emits : `'outline-validated'`, `'brief-validated'`, `'check-completed'`
  - Action : Ce composant encapsule tout le step Brief & Structure. Il contient :
    - **Section 1 : Contexte stratégique** — `ContextRecap` dans un `CollapsableSection` ouvert par défaut. Props : `previousAnswers` reçoit `{}` (objet vide), `cocoonStrategy` alimenté depuis `cocoonStrategyStore.getPreviousAnswers()`, `themeConfig` depuis `themeConfigStore`. Le `cocoonSlug` est dérivé depuis `props.cocoonName` via slugification (pattern existant `StrategyWizard.vue:304-310`).
    - **Section 2 : Micro-contexte article** — 3 champs formulaire :
      - `<textarea>` "Angle différenciant" (obligatoire, 2 lignes)
      - `<input>` "Ton / Style" (optionnel)
      - `<textarea>` "Consignes spécifiques" (optionnel, 3 lignes)
      - Bouton "Suggérer par IA" → `useStreaming<{ angle, tone, directives }>` sur `/api/generate/micro-context-suggest`. Au `result.value`, pré-remplir les champs.
      - Auto-save via `apiPut('/articles/:slug/micro-context')` déclenché sur `@blur` de chaque champ.
      - Au montage : `apiGet('/articles/:slug/micro-context')` pour pré-remplir les champs sauvegardés.
    - **Section 3 : Brief SEO** — `SeoBrief` sans prop `strategy` (omise).
    - **Section 4 : Mots-clés** — `CollapsableSection` avec `KeywordList` + `ArticleKeywordsPanel`
    - **Section 5 : DataForSEO** — `CollapsableSection` avec `DataForSeoPanel` + `ApiCostBadge`
    - **Section 6 : Recommandation** — `CollapsableSection` collapsed par défaut avec `ContentRecommendation`
    - **Section 7 : Content Gap** — `ContentGapPanel`
    - **Section 8 : Structure HN / Sommaire** — `CollapsableSection` ouvert par défaut :
      - **Priorité de chargement** : (1) Outline sauvegardé en base → `loadExistingOutline()`, (2) `hnStructure` persisté → `loadFromHnStructure()`, (3) Rien → bouton "Générer le sommaire" (fallback)
      - `OutlineEditor` si `!outlineStore.isValidated`, sinon `OutlineDisplay` read-only
      - Bouton "Valider le sommaire" → `outlineStore.validateOutline(slug)` + emit `'outline-validated'`
      - Bouton "Régénérer" → `outlineStore.generateOutline(briefStore.briefData!)` (génération IA fresh, écrase la HN)
    - **Navigation** : Bouton "Continuer vers l'Article" visible si `outlineStore.isValidated`, émet `'outline-validated'`.

- [x] Task 16 : Refactorer `ArticleWorkflowView` — stepper 2 étapes
  - File : `src/views/ArticleWorkflowView.vue`
  - Action :
    - Remplacer `steps` : `[{ id: 'brief-structure', number: 1, label: 'Brief & Structure' }, { id: 'article', number: 2, label: 'Article' }]`
    - Type `currentStep`: `'brief-structure' | 'article'`, default `'brief-structure'`
    - **Supprimer** : imports `StrategyWizard`, `useStrategyStore`, template blocks `strategy` et `outline`
    - **Ajouter** : import `BriefStructureStep`, template block pour `currentStep === 'brief-structure'`
    - Le step Article reste quasi identique. Seul changement : "Revoir la stratégie" → "Revoir le Brief" pointant vers `goToStep('brief-structure')`
    - **Supprimer** l'auto-skip stratégie (lignes 150-155 actuelles)

- [x] Task 17 : Intégrer le Panel IA Brief en sidebar
  - File : `src/views/ArticleWorkflowView.vue`
  - Action :
    - Ajouter toggle "IA Brief" dans `.panel-toggles` (utilise le nouveau `showIaBriefPanel` de `usePanelToggle`)
    - Quand actif : `ResizablePanel` avec `useStreaming` sur `/api/generate/brief-explain`
    - Auto-trigger au premier affichage (comme `CaptainValidation.vue`)
    - Body : contexte cocon, keywords, hnStructure, micro-contexte, DataForSEO summary
    - Rendu : `<div v-html="parsedMarkdown">` avec `parsedMarkdown = computed(() => marked.parse(chunks.value))`
    - Bouton "Relancer l'analyse" pour re-streamer

#### Phase F : Injection micro-contexte côté serveur

- [x] Task 18 : Injecter le micro-contexte dans la génération outline
  - File : `server/routes/generate.routes.ts`
  - Action : Dans `POST /api/generate/outline`, **après** le parsing du body (qui contient `slug`) :
    1. Charger `const microCtx = await loadArticleMicroContext(parsed.data.slug)`
    2. Si `microCtx` existe, injecter dans le prompt : `## Micro-contexte article\n- Angle: ${microCtx.angle}\n- Ton: ${microCtx.tone || 'non spécifié'}\n- Consignes: ${microCtx.directives || 'aucune'}`
  - Notes : Le `slug` est déjà présent dans le body validé par `generateOutlineRequestSchema`. Aucune modification de schema côté request.

- [x] Task 19 : Injecter le micro-contexte dans la génération article
  - File : `server/routes/generate.routes.ts`
  - Action : Même logique que Task 18 dans le handler `POST /api/generate/article`. Le `slug` est déjà dans le body. Le micro-contexte influence l'angle et le ton de rédaction.

#### Phase G : Progress tracking

- [x] Task 20 : Adapter les checks de progression
  - File : `src/components/workflow/BriefStructureStep.vue`
  - Action :
    - Émettre `check-completed('brief-validated')` quand le micro-contexte est sauvegardé avec un `angle` non vide.
    - Le check `outline-validated` est émis via `outlineStore.validateOutline()` (inchangé).
    - Le check `strategy-done` de l'ancien flow **n'est plus vérifié ni émis**. Les articles legacy qui l'ont en base le conservent comme donnée inerte — il n'est pas bloquant car le nouveau flow ne le consulte jamais.

---

## Acceptance Criteria

### Persistance HN

- [x] AC 1 : Given un article avec lieutenants sélectionnés et HN générée dans le Moteur, when l'utilisateur clique "Verrouiller les lieutenants", then la structure HN est persistée dans `article-keywords.json` avec le champ `hnStructure` contenant un tableau de `ProposeLieutenantsHnNode`.

- [x] AC 2 : Given un article avec `hnStructure` persisté et pas d'outline sauvegardé, when le workflow rédaction charge l'article, then le sommaire est automatiquement pré-rempli avec la structure HN transformée en `Outline` (H1 + Introduction + sections HN aplaties clampées `[2,3]` + Conclusion).

- [x] AC 3 : Given un article SANS `hnStructure` (article legacy ou tableau vide `[]`), when le workflow rédaction charge l'article, then un bouton "Générer le sommaire" est affiché (fallback, comportement actuel conservé).

### Stepper 2 étapes

- [x] AC 4 : Given le workflow rédaction ouvert sur un article, when la vue se charge, then le stepper affiche 2 étapes : "Brief & Structure" et "Article" (pas 4).

- [x] AC 5 : Given l'utilisateur est sur le step "Brief & Structure", when il scrolle, then il voit dans l'ordre : contexte stratégique (avec données cocon/thème, sans previousAnswers article), micro-contexte article, brief SEO, mots-clés, DataForSEO, recommandation de contenu, content gap, et sommaire éditable.

### Micro-contexte article

- [x] AC 6 : Given l'utilisateur clique "Suggérer par IA" dans la section micro-contexte, when le streaming complète, then les 3 champs (angle, ton, consignes) sont pré-remplis avec la suggestion IA parsée depuis le résultat JSON typé.

- [x] AC 7 : Given l'utilisateur modifie le champ "Angle différenciant" et quitte le champ, when l'événement `blur` se déclenche, then le micro-contexte est sauvegardé via `PUT /api/articles/:slug/micro-context`.

- [x] AC 8 : Given un article dont le micro-contexte a déjà été sauvegardé, when l'utilisateur revient sur le workflow, then les champs sont pré-remplis avec les valeurs chargées via `GET /api/articles/:slug/micro-context`.

### Panel IA Brief

- [x] AC 9 : Given l'utilisateur active le toggle "IA Brief" dans la barre supérieure, when le panel s'ouvre pour la première fois, then un stream SSE démarre automatiquement et affiche progressivement une analyse markdown du brief et de la structure.

- [x] AC 10 : Given le panel IA Brief est ouvert et l'utilisateur a modifié le micro-contexte, when il clique "Relancer l'analyse", then le stream est relancé avec le contexte mis à jour.

### Sommaire éditable

- [x] AC 11 : Given le sommaire est pré-rempli depuis la HN, when l'utilisateur modifie un titre de section via double-clic, then la modification est reflétée dans l'outline store et les IDs restent stables.

- [x] AC 12 : Given le sommaire est affiché et non validé, when l'utilisateur clique "Valider le sommaire", then l'outline est sauvegardé en base et le bouton "Continuer vers l'Article" apparaît.

- [x] AC 13 : Given le sommaire est pré-rempli depuis la HN, when l'utilisateur clique "Régénérer", then un nouveau sommaire est généré par IA (écrase la HN) en utilisant le prompt `generate-outline.md` enrichi du micro-contexte chargé côté serveur.

### Edge cases

- [x] AC 14 : Given un article dont l'outline a déjà été validé et sauvegardé en base, when le workflow se charge, then l'outline sauvegardé est affiché en mode read-only (priorité sur la HN persistée).

- [x] AC 15 : Given un `hnNode` avec `level: 5`, when `hnToOutline()` le transforme, then le level est clampé à `3` et la section est créée avec `level: 3`.

- [x] AC 16 : Given un article legacy sans `hnStructure` dans le JSON, when le Zod schema parse l'entrée, then le champ est initialisé à `[]` via le `.default([])` sans erreur de validation.

---

## Additional Context

### Dependencies

- **Aucune nouvelle dépendance npm**. Tout repose sur les packages existants.
- **Dépendance data** : L'article doit avoir passé le workflow Moteur avec lieutenants verrouillés pour que la HN soit disponible. Sinon fallback.
- **Dépendance stores** : `BriefStructureStep` charge 7 stores : `briefStore`, `articleKeywordsStore`, `outlineStore`, `cocoonStrategyStore`, `themeConfigStore`, `cocoonsStore`, `silosStore`. Les chargements sont asynchrones et non-bloquants.

### Testing Strategy

**Unit tests (priorité haute) :**
- `hnToOutline()` : Tester avec arbre vide, niveaux H2/H3, children imbriqués, **levels hors bornes** (1, 4, 5). Vérifier IDs, annotations Intro/Conclusion, clamping.
- `loadFromHnStructure()` : Vérifier `outline.value` peuplé et `isValidated = false`.
- Zod schemas : Tester parse avec/sans `hnStructure`, vérifier `.default([])`.
- Route PUT keywords : Tester que `hnStructure` et `rootKeywords` sont bien passés au data service.
- Endpoints REST micro-contexte : Tester GET/PUT avec mocks data service.
- Endpoint SSE micro-context-suggest : Tester headers SSE + résultat JSON parsé dans `done` event.
- Endpoint SSE brief-explain : Tester headers SSE + streaming markdown.

**Component tests (priorité moyenne) :**
- `BriefStructureStep` : Vérifier sections rendues dans l'ordre, fallback quand hnStructure absent, pré-remplissage micro-contexte, auto-save blur.
- `ArticleWorkflowView` : Vérifier stepper 2 étapes, toggle IA Brief.

**Manual testing :**
- Parcourir le workflow complet sur l'article pilier "création site web entreprise toulouse".
- Vérifier persistance HN après un lock lieutenants.
- Tester fallback sur un article sans HN.
- Tester suggestion IA micro-contexte + auto-save.

### Notes

**Risques identifiés :**
- La HN du moteur peut être désynchronisée des lieutenants finaux si l'utilisateur modifie après la proposition IA → le sommaire pré-rempli est toujours éditable, donc l'impact est faible.
- Le micro-contexte suggestion IA nécessite un prompt bien calibré → itérer après les premiers tests.
- Le `Date.now()` dans les IDs outline peut créer des doublons si deux sections sont créées dans la même milliseconde → risque négligeable en pratique.

**Considérations futures (hors scope) :**
- Supprimer le code mort (StrategyWizard, AiguillageStep, strategy.store article-level).
- Ajouter la possibilité de re-générer la HN depuis le workflow rédaction.
- Envisager un panel IA conversationnel pour le micro-contexte (V2).

## Review Notes

- Adversarial review completed (17 findings)
- Findings: 17 total, 6 fixed, 11 skipped (pre-existing/noise/by-design)
- Resolution approach: auto-fix
- Fixed: F3 (Zod validation on PUT micro-context), F4 (type mismatch tone/directives), F6 (IA Brief empty micro-context bug), F12 (24 new tests added), F13 (any→Record types), F16 (pendingSave debounce guard)
- Skipped: F1 (pre-existing XSS pattern), F2/F17 (pre-existing data.service pattern), F5 (pre-existing JSON.parse pattern), F7/F8 (not from this diff), F9 (acknowledged risk per spec), F10 (by design), F11 (consistent with type), F14 (low/undecided), F15 (noise)
