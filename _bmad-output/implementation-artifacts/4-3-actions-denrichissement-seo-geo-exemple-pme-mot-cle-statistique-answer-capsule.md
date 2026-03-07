# Story 4.3: Actions d'Enrichissement SEO/GEO — Exemple PME, Mot-clé, Statistique, Answer Capsule

Status: done

## Story

As a rédacteur utilisant l'éditeur d'articles,
I want enrichir mon contenu avec des exemples PME, optimiser pour un mot-clé, ajouter des statistiques sourcées et créer des answer capsules via les actions contextuelles du Bubble Menu,
so that mon contenu soit plus riche, plus concret et mieux optimisé SEO/GEO.

## Acceptance Criteria

1. **AC1 — Exemple PME (FR28)** : Given que l'utilisateur a sélectionné du texte, When il choisit "Exemple PME" dans le Bubble Menu, Then un exemple suivant le pattern grandes marques → PME est généré pour illustrer le concept, And le ton Propulsite est maintenu.

2. **AC2 — Optimiser mot-clé (FR29)** : Given que l'utilisateur a sélectionné du texte, When il choisit "Optimiser mot-clé", Then le paragraphe est réécrit avec le mot-clé intégré naturellement, And l'intégration est indétectable à la lecture.

3. **AC3 — Statistique sourcée (FR30)** : Given que l'utilisateur a sélectionné un emplacement, When il choisit "Statistique sourcée", Then une statistique pertinente avec sa source est générée (format "selon [Source], [Année]"), And la statistique est plausible et en lien avec le contexte.

4. **AC4 — Answer Capsule (FR31)** : Given que l'utilisateur a sélectionné du texte, When il choisit "Answer Capsule", Then une capsule de 20-25 mots résumant le point clé est créée, And la capsule est auto-suffisante et extractible par un moteur IA.

5. **AC5 — Prompts externalisés (NFR14)** : Les 4 prompts sont externalisés dans `server/prompts/actions/` et utilisent les variables `{{selectedText}}` et `{{keywordInstruction}}` du pipeline existant.

6. **AC6 — Tests** : Chaque prompt est couvert par un test vérifiant son chargement correct via `loadPrompt` et la validation du pipeline SSE complet.

## Tasks / Subtasks

- [x] **Task 1 : Créer le prompt `pme-example.md`** (AC: #1, #5)
  - [x] Créer `server/prompts/actions/pme-example.md`
  - [x] Le prompt doit suivre le pattern Propulsite : citer une stratégie de grande marque connue, puis montrer comment une PME peut l'adapter
  - [x] Utiliser `{{selectedText}}` comme contexte et `{{keywordInstruction}}` pour le mot-clé
  - [x] Output en texte brut, sans balises HTML
  - [x] Répondre UNIQUEMENT avec l'exemple, sans explication

- [x] **Task 2 : Créer le prompt `keyword-optimize.md`** (AC: #2, #5)
  - [x] Créer `server/prompts/actions/keyword-optimize.md`
  - [x] Le prompt doit réécrire le texte en intégrant le mot-clé de manière naturelle et indétectable
  - [x] `{{keywordInstruction}}` contient le mot-clé à intégrer — ESSENTIEL pour cette action
  - [x] Ne pas forcer le mot-clé — la fluidité du texte prime
  - [x] Output en texte brut, sans balises HTML

- [x] **Task 3 : Créer le prompt `add-statistic.md`** (AC: #3, #5)
  - [x] Créer `server/prompts/actions/add-statistic.md`
  - [x] Le prompt doit générer une statistique pertinente liée au contexte du texte sélectionné
  - [x] Format de citation obligatoire : "selon [Source], [Année]" (ex: "selon HubSpot, 2024")
  - [x] La statistique doit être plausible et en rapport avec le contenu
  - [x] Output en texte brut, sans balises HTML

- [x] **Task 4 : Créer le prompt `answer-capsule.md`** (AC: #4, #5)
  - [x] Créer `server/prompts/actions/answer-capsule.md`
  - [x] Le prompt doit synthétiser le texte sélectionné en exactement 20-25 mots
  - [x] La capsule doit être auto-suffisante et directement extractible par un moteur IA (GEO)
  - [x] Pas de question, pas de jargon — réponse directe et factuelle
  - [x] Output en texte brut, sans balises HTML

- [x] **Task 5 : Tests des prompts et du pipeline** (AC: #6)
  - [x] Test unitaire : `loadPrompt('actions/pme-example', variables)` charge correctement
  - [x] Test unitaire : `loadPrompt('actions/keyword-optimize', variables)` charge correctement
  - [x] Test unitaire : `loadPrompt('actions/add-statistic', variables)` charge correctement
  - [x] Test unitaire : `loadPrompt('actions/answer-capsule', variables)` charge correctement
  - [x] Test d'intégration : POST /api/generate/action pour chaque actionType → SSE valide
  - [x] `npx vitest run` — tous les tests passent
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Actions d'Enrichissement [Source: architecture.md#FR28-FR31]

Les 4 actions d'enrichissement sont le deuxième groupe d'actions contextuelles :
- **Exemple PME (FR28)** : `actionType: 'pme-example'` → `server/prompts/actions/pme-example.md`
- **Optimiser mot-clé (FR29)** : `actionType: 'keyword-optimize'` → `server/prompts/actions/keyword-optimize.md`
- **Statistique sourcée (FR30)** : `actionType: 'add-statistic'` → `server/prompts/actions/add-statistic.md`
- **Answer Capsule (FR31)** : `actionType: 'answer-capsule'` → `server/prompts/actions/answer-capsule.md`

### Différences clés vs Actions de Réécriture (Story 4.2)

Les actions d'enrichissement sont fondamentalement différentes des actions de réécriture :
- **Réécriture** (FR25-27) : transforme le texte existant (même sens, style différent)
- **Enrichissement** (FR28-31) : **génère du nouveau contenu** basé sur le texte sélectionné

Cela signifie que les prompts doivent être plus directifs et contextuels :
- FR28 : doit AJOUTER un exemple (nouvelle information)
- FR29 : doit RÉÉCRIRE en intégrant un mot-clé spécifique
- FR30 : doit GÉNÉRER une statistique plausible avec source
- FR31 : doit SYNTHÉTISER en 20-25 mots exact (contrainte stricte)

### Prompt File Naming — IMPORTANT

L'architecture mentionne `enrich-example.md` et `optimize-keyword.md` comme noms de fichiers, MAIS les ActionTypes sont `'pme-example'` et `'keyword-optimize'`. Le route handler utilise `loadPrompt('actions/${actionType}', ...)` donc les fichiers doivent correspondre à l'ActionType :
- `pme-example.md` (PAS `enrich-example.md`)
- `keyword-optimize.md` (PAS `optimize-keyword.md`)
- `add-statistic.md` (correspond)
- `answer-capsule.md` (correspond)

### Existing Pipeline — Aucune modification nécessaire

Le pipeline est entièrement générique (Story 4.1) et fonctionne pour tous les ActionTypes :
```typescript
// server/routes/generate.routes.ts — NE PAS MODIFIER
const variables: Record<string, string> = {
  selectedText,
  keywordInstruction: keyword
    ? `Mot-clé principal de l'article : ${keyword}. Intègre-le naturellement si pertinent.`
    : '',
}
const userPrompt = await loadPrompt(`actions/${actionType}`, variables)
```

### Prompt Pattern établi en Story 4.2 (après code review)

Les prompts d'action NE doivent PAS inclure "Tu es un rédacteur..." car le system prompt (`system-propulsite.md`) définit déjà le rôle. Le pattern à suivre :

```markdown
[VERBE D'ACTION] le texte suivant en :
- Critère 1
- Critère 2
- ...

Texte :
"""
{{selectedText}}
"""

{{keywordInstruction}}

Réponds UNIQUEMENT avec [le résultat], sans explication ni commentaire.
```

Pour les actions produisant du texte brut (reformulate, simplify, et toutes les enrichment actions) :
- Ajouter "en texte brut, sans balises HTML" dans l'instruction finale

### Contexte Propulsite pour les prompts [Source: server/prompts/system-propulsite.md]

Le system prompt `system-propulsite.md` contient déjà les directives clés que les prompts d'action peuvent référencer :

- **Pattern grandes marques → PME** (ligne 9) : "cite d'abord une stratégie d'une grande marque connue, puis montre comment une PME peut l'adapter"
- **Statistiques sourcées** (ligne 11) : "Intègre des statistiques récentes et sourcées. Cite toujours la source entre parenthèses (ex: « selon HubSpot, 2024 »)"
- **Answer capsules GEO** (ligne 26) : "paragraphe synthétique de 20 à 25 mots qui résume le point clé. Ce paragraphe doit être auto-suffisant et directement extractible par un moteur IA"
- **SEO mots-clés** (ligne 19) : "Intègre les mots-clés de manière naturelle et indétectable à la lecture"

Ces directives sont DÉJÀ dans le system prompt — les action prompts doivent les RENFORCER, pas les dupliquer.

### Anti-patterns

- PAS de "Tu es un rédacteur..." dans les prompts d'action (code review Story 4.2 M1)
- PAS de balises HTML dans l'output des enrichment actions (code review Story 4.2 M2)
- PAS de fichier nommé `enrich-example.md` ou `optimize-keyword.md` — utiliser les noms qui correspondent à l'ActionType
- PAS de modification au route handler ou au composable — l'infrastructure est générique
- PAS de `{{#if}}` dans les prompts — `loadPrompt` ne supporte que `replaceAll`
- ATTENTION pour FR31 (answer-capsule) : la contrainte de 20-25 mots est STRICTE, pas approximative

### Previous Story Intelligence (4.2)

**Code review findings Story 4.2 :**
- M1: Rôle redondant ("Tu es un rédacteur...") supprimé des 3 prompts — system-propulsite suffit
- M2: Conflit HTML vs texte brut résolu — ajout de "sans balises HTML" pour reformulate/simplify
- L1-L2: Tests mock le contenu plutôt que tester les fichiers réels — pattern acceptable

**Patterns établis dans Stories 4.1-4.2 :**
- Prompt utilise `{{selectedText}}` et `{{keywordInstruction}}` comme seules variables
- `loadPrompt` résout `actions/{actionType}` → `server/prompts/actions/{actionType}.md`
- Tests mock `loadPrompt` et `streamChatCompletion` pour les tests unitaires/intégration
- Le route handler construit `keywordInstruction` en JavaScript avant d'appeler `loadPrompt`
- Zod v4 import: `from 'zod/v4'` (NOT `from 'zod'`)
- Fichiers prompts : NE PAS dupliquer le rôle du system prompt

**209 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 4.1 (infrastructure) — DONE, Story 4.2 (pattern de prompts) — DONE
- **Consumed by** : Story 4.4 (actions structurelles) réutilisera le même pattern

### Project Structure Notes

- `server/prompts/actions/pme-example.md` — Nouveau fichier
- `server/prompts/actions/keyword-optimize.md` — Nouveau fichier
- `server/prompts/actions/add-statistic.md` — Nouveau fichier
- `server/prompts/actions/answer-capsule.md` — Nouveau fichier
- Aucun autre fichier modifié — l'infrastructure est entièrement en place

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3 — Actions d'Enrichissement]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR28-FR31 — Actions d'Enrichissement]
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR14 — Prompts externalisés]
- [Source: server/prompts/system-propulsite.md] — System prompt with Propulsite directives
- [Source: server/prompts/actions/reformulate.md] — Existing prompt pattern (post code-review)
- [Source: server/routes/generate.routes.ts] — Route handler (lines 168-216)
- [Source: server/utils/prompt-loader.ts] — Prompt loader utility
- [Source: shared/types/action.types.ts] — ActionType union
- [Source: _bmad-output/implementation-artifacts/4-2-actions-de-reecriture-reformuler-simplifier-convertir-en-liste.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A — clean implementation, no debugging needed.

### Completion Notes List

- Created 4 enrichment action prompts following the established pattern from Story 4.2 (post code-review)
- All prompts use `{{selectedText}}` and `{{keywordInstruction}}` variables — no other variables needed
- All prompts start with action verb (GÉNÈRE, RÉÉCRIS, SYNTHÉTISE) — no redundant role definition
- All prompts output plain text ("sans balises HTML") per Story 4.2 M2 finding
- pme-example.md: follows "grandes marques → PME" pattern from system-propulsite.md line 9
- keyword-optimize.md: reinforces natural keyword integration from system-propulsite.md line 19
- add-statistic.md: enforces "selon [Source], [Année]" citation format from system-propulsite.md line 11
- answer-capsule.md: strict 20-25 word constraint, auto-sufficient for GEO per system-propulsite.md line 26
- Added 4 unit tests (prompt-loader) + 4 integration tests (SSE pipeline) = 8 new tests
- Total: 217 tests pass, type-check clean
- No infrastructure changes — pipeline is fully generic from Story 4.1

### File List

- `server/prompts/actions/pme-example.md` — NEW
- `server/prompts/actions/keyword-optimize.md` — NEW
- `server/prompts/actions/add-statistic.md` — NEW
- `server/prompts/actions/answer-capsule.md` — NEW
- `tests/unit/utils/prompt-loader.test.ts` — MODIFIED (4 new tests)
- `tests/unit/routes/generate.routes.test.ts` — MODIFIED (4 new tests)
