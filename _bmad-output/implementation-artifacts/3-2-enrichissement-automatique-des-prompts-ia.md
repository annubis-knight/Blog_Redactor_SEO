# Story 3.2: Enrichissement automatique des prompts IA

Status: done

## Story

As a consultant SEO,
I want que le contexte stratégique du Cerveau soit injecté automatiquement dans les prompts IA du Moteur,
so that les suggestions IA (Discovery, PainTranslator, etc.) sont alignées avec ma stratégie sans action de ma part.

## Acceptance Criteria

1. **Given** un prompt IA est chargé via `loadPrompt()` avec un `cocoonSlug` fourni **When** une stratégie existe pour ce cocon dans `data/strategies/` **Then** un bloc de contexte stratégique (cible, douleur, angle, promesse) est ajouté automatiquement au prompt **And** le prompt enrichi est envoyé à Claude API.

2. **Given** un prompt IA est chargé via `loadPrompt()` avec un `cocoonSlug` fourni **When** aucune stratégie n'existe pour ce cocon **Then** aucun enrichissement n'est ajouté **And** le prompt fonctionne normalement (NFR9).

3. **Given** un prompt IA est chargé via `loadPrompt()` sans `cocoonSlug` (ex: depuis le Labo) **When** le prompt est traité **Then** aucun enrichissement n'est ajouté **And** aucun appel au service de stratégie n'est effectué.

4. **Given** les prompts `.md` dans `server/prompts/` **When** l'enrichissement est implémenté **Then** les fichiers `.md` sources ne sont PAS modifiés — l'enrichissement est un pré-processing dans `loadPrompt()` (NFR12).

## Tasks / Subtasks

- [x] Task 1 : Créer la fonction buildCocoonStrategyBlock (AC: #1, #2)
  - [x] 1.1 : Créer une fonction `buildCocoonStrategyBlock(strategy: CocoonStrategy): string` dans `server/utils/prompt-loader.ts`
  - [x] 1.2 : Importer `getCocoonStrategy` depuis `cocoon-strategy.service.ts`
  - [x] 1.3 : Charger la stratégie, extraire les champs `validated` non-vides (cible, douleur, angle, promesse, cta)
  - [x] 1.4 : Formater en bloc markdown : `## Contexte stratégique du cocon\n- **Cible** : ...\n- **Angle** : ...` + instruction d'intégration
  - [x] 1.5 : Retourner une string vide si pas de stratégie ou aucun champ validé
- [x] Task 2 : Étendre loadPrompt() avec paramètre cocoonSlug optionnel (AC: #1, #2, #3, #4)
  - [x] 2.1 : Ajouter un paramètre optionnel `options?: { cocoonSlug?: string }` à `loadPrompt()`
  - [x] 2.2 : Si `cocoonSlug` fourni, appeler `loadCocoonStrategyBlock(cocoonSlug)`
  - [x] 2.3 : Ajouter le résultat comme variable `strategy_context` avant le replacement (le prompt peut contenir `{{strategy_context}}`)
  - [x] 2.4 : Si le résultat final ne contient PAS `{{strategy_context}}` remplacé (prompt .md n'a pas le placeholder), appender le bloc à la fin du prompt
  - [x] 2.5 : Si pas de cocoonSlug ou bloc vide, ne rien changer au prompt
- [x] Task 3 : Mettre à jour les callers Moteur pour passer cocoonSlug (AC: #1)
  - [x] 3.1 : `keywords.routes.ts` — route `POST /api/keywords/lexique-suggest` : passer `cocoonSlug` à `loadPrompt()` (dérivé de `cocoonName` déjà reçu dans le body)
  - [x] 3.2 : `keywords.routes.ts` — route `POST /api/keywords/translate-pain` : ajouter `cocoonName` optionnel dans le body, dériver le slug, passer à `loadPrompt()`
  - [x] 3.3 : `keyword-radar.service.ts` — `generateRadarKeywords()` : ajouter `cocoonSlug` optionnel, passer à `loadPrompt()`
- [x] Task 4 : Tests unitaires (AC: #1-4)
  - [x] 4.1 : Test buildCocoonStrategyBlock — retourne bloc markdown quand stratégie existe avec champs validés
  - [x] 4.2 : Test buildCocoonStrategyBlock — retourne string vide quand pas de stratégie
  - [x] 4.3 : Test buildCocoonStrategyBlock — retourne string vide quand tous les champs validated sont vides
  - [x] 4.4 : Test loadPrompt — enrichit le prompt quand cocoonSlug fourni
  - [x] 4.5 : Test loadPrompt — n'enrichit pas quand cocoonSlug absent
  - [x] 4.6 : Test loadPrompt — n'enrichit pas quand stratégie absente

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `server/services/cocoon-strategy.service.ts` — lecture seule (getCocoonStrategy)
- `data/strategies/*.json` — fichiers de données stratégiques
- `server/prompts/*.md` — fichiers de prompts sources **NON MODIFIÉS** (AC #4, NFR12)
- `server/routes/generate.routes.ts` — continue à utiliser `buildStrategyContext()` pour l'ArticleStrategy (article-level, pas cocoon-level)
- Frontend — aucune modification de composant Vue ou store

**MODIFIÉ :**
- `server/utils/prompt-loader.ts` — ajout `buildCocoonStrategyBlock()`, extension signature `loadPrompt()`
- `server/routes/keywords.routes.ts` — passer cocoonSlug aux callers `loadPrompt()`
- `server/services/keyword-radar.service.ts` — ajouter cocoonSlug optionnel

**CRÉÉ :**
- `tests/unit/services/prompt-enrichment.test.ts` — tests

### Infrastructure existante

#### prompt-loader.ts — État actuel
```typescript
export async function loadPrompt(
  name: string,
  variables: Record<string, string> = {},
): Promise<string> {
  const content = await readFile(join(PROMPTS_DIR, `${name}.md`), 'utf-8')
  const result = Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content,
  )
  return result
}
```

#### generate.routes.ts — Enrichissement article-level existant
```typescript
// Déjà en place pour ArticleStrategy (différent de CocoonStrategy!)
function buildStrategyContext(strategy: ArticleStrategy | null): string {
  // Utilise strategy.cible.validated, strategy.douleur.validated, etc.
  // Retourne un bloc markdown "## Contexte stratégique (Brain-First)"
}
// Passé comme variable 'strategyContext' aux prompts generate-outline et generate-article
```

**IMPORTANT : `buildStrategyContext()` est pour ArticleStrategy (article-level) — Story 3.2 concerne CocoonStrategy (cocoon-level). Les deux coexistent.**

#### Callers loadPrompt() dans le Moteur

| Route/Service | Prompt | cocoonSlug disponible ? |
|---|---|---|
| keywords.routes.ts → `lexique-suggest` | `lexique-suggest.md` | ✓ via `cocoonName` dans body |
| keywords.routes.ts → `translate-pain` | `pain-translate.md` | ✗ pas dans body actuel |
| keyword-radar.service.ts → `generateRadarKeywords` | `intent-keywords.md` | ✗ pas passé au service |

#### Slugify pattern (backend — même que Story 3.1)
```typescript
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

### Détail d'implémentation

#### Task 1 — buildCocoonStrategyBlock

```typescript
// prompt-loader.ts — ajout
import { getCocoonStrategy } from '../services/cocoon-strategy.service.js'

export async function buildCocoonStrategyBlock(cocoonSlug: string): Promise<string> {
  const strategy = await getCocoonStrategy(cocoonSlug)
  if (!strategy) return ''

  const parts: string[] = ['## Contexte stratégique du cocon\n']

  if (strategy.cible.validated) parts.push(`- **Cible** : ${strategy.cible.validated}`)
  if (strategy.douleur.validated) parts.push(`- **Douleur** : ${strategy.douleur.validated}`)
  if (strategy.angle.validated) parts.push(`- **Angle** : ${strategy.angle.validated}`)
  if (strategy.promesse.validated) parts.push(`- **Promesse** : ${strategy.promesse.validated}`)
  if (strategy.cta.validated) parts.push(`- **CTA** : ${strategy.cta.validated}`)

  if (parts.length === 1) return '' // Only header, no data

  parts.push('')
  parts.push('Tiens compte de ce contexte stratégique pour aligner tes suggestions avec la stratégie du cocon.')

  return parts.join('\n')
}
```

#### Task 2 — Étendre loadPrompt()

```typescript
export async function loadPrompt(
  name: string,
  variables: Record<string, string> = {},
  options?: { cocoonSlug?: string },
): Promise<string> {
  const content = await readFile(join(PROMPTS_DIR, `${name}.md`), 'utf-8')

  // Build cocoon strategy enrichment
  let strategyBlock = ''
  if (options?.cocoonSlug) {
    strategyBlock = await buildCocoonStrategyBlock(options.cocoonSlug)
  }

  // Add strategy_context to variables for explicit {{strategy_context}} placeholders
  const allVariables = { ...variables, strategy_context: strategyBlock }

  let result = Object.entries(allVariables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content,
  )

  // If prompt didn't have {{strategy_context}} placeholder and we have a block, append it
  if (strategyBlock && !content.includes('{{strategy_context}}')) {
    result = result + '\n\n' + strategyBlock
  }

  return result
}
```

#### Task 3 — Mise à jour callers

**3.1 keywords.routes.ts → lexique-suggest :**
```typescript
// Déjà reçoit cocoonName dans le body
const slug = cocoonName.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const prompt = await loadPrompt('lexique-suggest', { capitaine, articleTitle, cocoonName }, { cocoonSlug: slug })
```

**3.2 keywords.routes.ts → translate-pain :**
```typescript
// Ajouter cocoonName optionnel dans le body parsing
const cocoonName = req.body.cocoonName as string | undefined
const slug = cocoonName ? slugify(cocoonName) : undefined
const prompt = await loadPrompt('pain-translate', {}, slug ? { cocoonSlug: slug } : undefined)
```

**3.3 keyword-radar.service.ts → generateRadarKeywords :**
```typescript
// Ajouter cocoonSlug optionnel au paramètre
export async function generateRadarKeywords(
  title: string, keyword: string, painPoint: string,
  cocoonSlug?: string,
): Promise<RadarKeyword[]> {
  const prompt = await loadPrompt('intent-keywords', { title, keyword, painPoint }, cocoonSlug ? { cocoonSlug } : undefined)
  // ...
}
```

### Enforcement Guidelines

- Ne PAS modifier les fichiers `.md` dans `server/prompts/` (AC #4, NFR12)
- Utiliser le logger (jamais `console.log`)
- L'enrichissement est OPTIONNEL — si pas de cocoonSlug ou pas de stratégie, le prompt reste identique (NFR9)
- `buildCocoonStrategyBlock` est pour CocoonStrategy, `buildStrategyContext` dans generate.routes.ts est pour ArticleStrategy — les deux coexistent
- Composition API Pinia — pas de modification frontend
- Tests dans `tests/unit/services/`

### Risques identifiés

1. **Signature change de loadPrompt()** : Le 3ème paramètre optionnel est backward-compatible. Aucun caller existant ne sera cassé.
2. **Doublon stratégie** : `generate.routes.ts` injecte déjà un `strategyContext` (article-level) via variable. L'enrichissement cocoon-level est différent (CocoonStrategy vs ArticleStrategy). Les deux ne sont PAS en conflit.
3. **Performance** : `getCocoonStrategy()` lit un fichier JSON par appel. Pour le Moteur, c'est un seul appel par prompt — acceptable (< 10ms).
4. **Prompt sans placeholder** : Si un prompt `.md` n'a pas `{{strategy_context}}`, le bloc est appendé en fin — ce qui est le comportement voulu pour les prompts Moteur existants.

### Project Structure Notes

- Fichier modifié : `server/utils/prompt-loader.ts`
- Fichier modifié : `server/routes/keywords.routes.ts`
- Fichier modifié : `server/services/keyword-radar.service.ts`
- Nouveau test : `tests/unit/services/prompt-enrichment.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pont Cerveau→Moteur]
- [Source: server/utils/prompt-loader.ts — loadPrompt]
- [Source: server/services/cocoon-strategy.service.ts — getCocoonStrategy]
- [Source: server/routes/generate.routes.ts — buildStrategyContext (article-level)]
- [Source: server/routes/keywords.routes.ts — lexique-suggest, translate-pain]
- [Source: server/services/keyword-radar.service.ts — generateRadarKeywords]
- [Source: _bmad-output/implementation-artifacts/3-1-contexte-strategique-collapsable-dans-le-moteur.md] — Story précédente

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

1. `buildCocoonStrategyBlock` made synchronous (takes `CocoonStrategy` object directly) — private `loadCocoonStrategyBlock` handles async loading + error handling
2. `loadPrompt()` extended with backward-compatible 3rd parameter `options?: { cocoonSlug?: string }`
3. Dual injection: `{{strategy_context}}` placeholder replacement OR append at end (for prompts without placeholder)
4. 3 callers updated: lexique-suggest, translate-pain (with new optional cocoonName body param), generateRadarKeywords
5. `intent-scan.routes.ts` radar/generate route also updated to pass cocoonSlug from body to service
6. 10 tests pass (4 buildCocoonStrategyBlock + 6 loadPrompt), vue-tsc PASS, vite build PASS

### File List

- `server/utils/prompt-loader.ts` — MODIFIED (buildCocoonStrategyBlock, loadCocoonStrategyBlock, loadPrompt extended)
- `server/routes/keywords.routes.ts` — MODIFIED (lexique-suggest + translate-pain pass cocoonSlug)
- `server/services/keyword-radar.service.ts` — MODIFIED (cocoonSlug optional param)
- `server/routes/intent-scan.routes.ts` — MODIFIED (radar/generate passes cocoonSlug)
- `tests/unit/services/prompt-enrichment.test.ts` — NEW (10 tests)
