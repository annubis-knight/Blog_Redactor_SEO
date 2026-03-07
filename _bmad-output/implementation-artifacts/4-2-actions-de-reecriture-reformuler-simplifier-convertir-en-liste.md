# Story 4.2: Actions de Réécriture — Reformuler, Simplifier, Convertir en Liste

Status: done

## Story

As a rédacteur utilisant l'éditeur d'articles,
I want pouvoir reformuler, simplifier ou convertir en liste une sélection de texte via les actions contextuelles du Bubble Menu,
so that je puisse affiner rapidement le style et la structure de mon contenu sans quitter l'éditeur.

## Acceptance Criteria

1. **AC1 — Reformuler (FR25)** : Given que l'utilisateur a sélectionné du texte dans l'éditeur, When il choisit "Reformuler" dans le Bubble Menu, Then la sélection est réécrite dans un style différent en conservant le sens, And le ton Propulsite est maintenu (expert mais pas condescendant, concret, orienté action).

2. **AC2 — Simplifier (FR26)** : Given que l'utilisateur a sélectionné du texte, When il choisit "Simplifier", Then la sélection est réécrite de manière plus simple et accessible, And le texte conserve les informations clés mais avec un vocabulaire plus courant.

3. **AC3 — Convertir en liste (FR27)** : Given que l'utilisateur a sélectionné un paragraphe, When il choisit "Convertir en liste", Then le contenu est restructuré en liste à puces HTML (`<ul><li>...</li></ul>`), And chaque point clé du texte original devient un élément de la liste.

4. **AC4 — Prompts externalisés (NFR14)** : Les 3 prompts sont externalisés dans `server/prompts/actions/` et utilisent les variables `{{selectedText}}` et `{{keywordInstruction}}` du pipeline existant.

5. **AC5 — Tests** : Chaque prompt est couvert par un test vérifiant son chargement correct via `loadPrompt` et la validation du pipeline SSE complet.

## Tasks / Subtasks

- [x] **Task 1 : Finaliser le prompt `reformulate.md`** (AC: #1, #4)
  - [x] Relire `server/prompts/actions/reformulate.md` existant (créé en Story 4.1 comme placeholder)
  - [x] Vérifier que le prompt produit une reformulation de qualité avec ton Propulsite
  - [x] S'assurer que `{{selectedText}}` et `{{keywordInstruction}}` sont les seules variables utilisées

- [x] **Task 2 : Créer le prompt `simplify.md`** (AC: #2, #4)
  - [x] Créer `server/prompts/actions/simplify.md`
  - [x] Le prompt doit : simplifier le vocabulaire, raccourcir les phrases complexes, rendre le texte accessible
  - [x] Utiliser les mêmes variables `{{selectedText}}` et `{{keywordInstruction}}`
  - [x] Conserver la longueur approximative du texte original
  - [x] Répondre UNIQUEMENT avec le texte simplifié

- [x] **Task 3 : Créer le prompt `convert-list.md`** (AC: #3, #4)
  - [x] Créer `server/prompts/actions/convert-list.md`
  - [x] Le prompt doit produire du HTML : `<ul><li>Point 1</li><li>Point 2</li>...</ul>`
  - [x] Extraire les idées clés du texte sélectionné comme éléments de liste
  - [x] Utiliser les mêmes variables `{{selectedText}}` et `{{keywordInstruction}}`
  - [x] Répondre UNIQUEMENT avec le HTML de la liste

- [x] **Task 4 : Tests des prompts et du pipeline** (AC: #5)
  - [x] Test unitaire : `loadPrompt('actions/simplify', variables)` charge le fichier correctement
  - [x] Test unitaire : `loadPrompt('actions/convert-list', variables)` charge le fichier correctement
  - [x] Test d'intégration : POST /api/generate/action avec `actionType: 'simplify'` → SSE valide
  - [x] Test d'intégration : POST /api/generate/action avec `actionType: 'convert-list'` → SSE valide
  - [x] `npx vitest run` — tous les tests passent (209/209)
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Actions de Réécriture [Source: architecture.md#FR25-FR27]

Les 3 actions de réécriture sont le premier groupe d'actions contextuelles :
- **Reformuler (FR25)** : `actionType: 'reformulate'` → `server/prompts/actions/reformulate.md`
- **Simplifier (FR26)** : `actionType: 'simplify'` → `server/prompts/actions/simplify.md`
- **Convertir en liste (FR27)** : `actionType: 'convert-list'` → `server/prompts/actions/convert-list.md`

### Prompt File Naming — IMPORTANT [Source: architecture.md#server/prompts/]

L'architecture mentionne `to-list.md` comme nom de fichier pour FR27, MAIS le `ActionType` est `'convert-list'` et le route handler utilise `loadPrompt('actions/${actionType}', variables)`. Donc le fichier doit s'appeler **`convert-list.md`** pour correspondre à l'ActionType. Même logique pour tous les prompts : le nom de fichier = l'ActionType.

### Existing Pipeline — Infrastructure Story 4.1 [Source: server/routes/generate.routes.ts]

Le pipeline complet est déjà en place (Story 4.1) :
1. `POST /api/generate/action` valide avec `generateActionRequestSchema`
2. Charge `system-propulsite` comme system prompt
3. Construit `keywordInstruction` conditionnellement si `keyword` est fourni
4. Charge `loadPrompt('actions/${actionType}', { selectedText, keywordInstruction })`
5. Streame via `streamChatCompletion(systemPrompt, userPrompt, 2048)`
6. Events SSE : `chunk` → `done` → `error`

```typescript
// Route handler existant — NE PAS MODIFIER (Story 4.1)
const variables: Record<string, string> = {
  selectedText,
  keywordInstruction: keyword
    ? `Mot-clé principal de l'article : ${keyword}. Intègre-le naturellement si pertinent.`
    : '',
}
const userPrompt = await loadPrompt(`actions/${actionType}`, variables)
```

### Existing Reformulate Prompt Pattern [Source: server/prompts/actions/reformulate.md]

Le prompt `reformulate.md` est le modèle à suivre pour les 2 autres prompts :
```markdown
Tu es un rédacteur web expert spécialisé dans le contenu SEO pour les PME françaises.

L'utilisateur te demande de REFORMULER le texte suivant en conservant :
- Le même sens et les mêmes informations
- Un style professionnel mais accessible
- La longueur approximative du texte original
- Le ton Propulsite : expert mais pas condescendant, concret, orienté action

Texte à reformuler :
"""
{{selectedText}}
"""

{{keywordInstruction}}

Réponds UNIQUEMENT avec le texte reformulé, sans explication ni commentaire.
```

**Pattern clé :**
- Rôle du rédacteur en intro
- Instructions claires sur le résultat attendu (liste de critères)
- Texte sélectionné entre triple guillemets
- `{{keywordInstruction}}` en fin (sera vide si pas de keyword)
- Instruction finale "Réponds UNIQUEMENT avec..." pour éviter le bavardage

### Convert-List HTML Output — ATTENTION

L'action `convert-list` doit produire du **HTML** car TipTap utilise `insertContent(result)` qui interprète le HTML. Le prompt doit explicitement demander un output `<ul><li>...</li></ul>`. Les autres actions (reformulate, simplify) produisent du texte brut qui sera inséré comme texte dans l'éditeur.

### Prompt Loader Behavior [Source: server/utils/prompt-loader.ts]

`loadPrompt(name, variables)` :
- Résout `server/prompts/${name}.md`
- Fait `replaceAll('{{variable}}', value)` pour chaque variable
- NE supporte PAS de conditionnels Handlebars (`{{#if}}`)
- Si une variable n'est pas fournie, `{{variable}}` reste en l'état dans le texte
- `keywordInstruction` sera une chaîne vide si pas de keyword → la ligne sera juste vide

### useContextualActions Composable [Source: src/composables/useContextualActions.ts]

Le composable est générique et fonctionne déjà pour tous les ActionTypes. Aucune modification nécessaire pour Story 4.2 — seuls les fichiers de prompts sont à créer.

### Existing Tests [Source: tests/unit/routes/generate.routes.test.ts]

Les tests backend existants pour `/generate/action` couvrent :
- Validation du schéma (rejet 400 si invalide)
- Stream SSE correct avec mock de Claude

Les nouveaux tests doivent vérifier que les prompts `simplify` et `convert-list` sont chargés correctement par `loadPrompt`.

### Anti-patterns

- PAS de logique conditionnelle dans les prompts (pas de `{{#if}}`) — `loadPrompt` ne le supporte pas
- PAS de modification au route handler ou au composable — l'infrastructure est générique
- PAS de fichier nommé `to-list.md` — utiliser `convert-list.md` pour correspondre à l'ActionType
- PAS de texte markdown dans le output de convert-list — produire du HTML `<ul><li>...</li></ul>`
- PAS de préambule ou explication dans le output des prompts — "Réponds UNIQUEMENT avec..."

### Previous Story Intelligence (4.1)

**Code review findings Story 4.1 :**
- M1: Variables inutilisées (`chunks`, `streamError`) dans useContextualActions — supprimées
- M2: Lecture de sélection redondante dans la vue et le composable — éliminée
- M3: Cleanup `onUnmounted` manquant pour abort — ajouté avec guard `getCurrentInstance()`
- L1: Import dupliqué combiné
- L2: `$emit` remplacé par variable `emit` capturée
- L3: Test manquant pour emit `open-actions` — ajouté

**Patterns établis dans Story 4.1 :**
- Prompt utilise `{{selectedText}}` et `{{keywordInstruction}}` comme seules variables
- `loadPrompt` résout `actions/reformulate` → `server/prompts/actions/reformulate.md`
- Les tests mock `loadPrompt` pour éviter de dépendre du filesystem
- Le route handler construit `keywordInstruction` en JavaScript avant d'appeler `loadPrompt`
- Zod v4 import: `from 'zod/v4'` (NOT `from 'zod'`)

**205 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 4.1 (infrastructure BubbleMenu, endpoint, composable, ActionMenu) — DONE
- **Consumed by** : Story 4.3 (actions d'enrichissement) et Story 4.4 (actions structurelles) réutiliseront le même pattern de prompts

### Project Structure Notes

- `server/prompts/actions/reformulate.md` — Existant (vérifier/finaliser)
- `server/prompts/actions/simplify.md` — Nouveau fichier
- `server/prompts/actions/convert-list.md` — Nouveau fichier
- Aucun autre fichier modifié — l'infrastructure est entièrement en place

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2 — Actions de Réécriture]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR25-FR27 — Actions de Réécriture]
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR14 — Prompts externalisés]
- [Source: _bmad-output/planning-artifacts/architecture.md#server/prompts/ — Prompt file structure]
- [Source: server/prompts/actions/reformulate.md] — Existing prompt pattern
- [Source: server/routes/generate.routes.ts] — Existing route handler (lines 168-216)
- [Source: server/utils/prompt-loader.ts] — Prompt loader utility
- [Source: src/composables/useContextualActions.ts] — Existing composable (no changes needed)
- [Source: _bmad-output/implementation-artifacts/4-1-infrastructure-du-bubble-menu-et-endpoint-dactions.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no issues.

### Completion Notes List

- Task 1: Verified reformulate.md prompt (created in Story 4.1) — already production quality with correct variables and Propulsite tone
- Task 2: Created simplify.md prompt following the reformulate.md pattern — emphasizes accessible vocabulary, shorter sentences, maintains information
- Task 3: Created convert-list.md prompt — outputs HTML `<ul><li>` format for TipTap insertContent compatibility
- Task 4: Added 2 prompt-loader unit tests (simplify, convert-list) and 2 integration tests (SSE pipeline for each action type)
- All 209 tests pass, type-check clean
- Architecture naming discrepancy resolved: used `convert-list.md` (matching ActionType) instead of `to-list.md` (architecture suggestion)

**Code review fixes (2 Medium fixed):**
- M1: Removed redundant role definition ("Tu es un rédacteur...") from all 3 action prompts — system-propulsite already sets this context
- M2: Added explicit "sans balises HTML" to reformulate and simplify prompts to prevent conflict with system-propulsite's "Génère TOUJOURS du contenu en HTML structuré" directive
- L1-L2: Acknowledged, no fix needed (consistent with existing patterns)

### File List

- `server/prompts/actions/reformulate.md` — MODIFIED: Removed redundant role, added "sans balises HTML" (code review M1+M2)
- `server/prompts/actions/simplify.md` — NEW: Simplification prompt (FR26), then fixed (code review M1+M2)
- `server/prompts/actions/convert-list.md` — NEW: Convert-to-list prompt (FR27), then fixed (code review M1)
- `tests/unit/utils/prompt-loader.test.ts` — MODIFIED: Added 2 tests for simplify/convert-list prompt loading
- `tests/unit/routes/generate.routes.test.ts` — MODIFIED: Added 2 integration tests for simplify/convert-list SSE pipeline
