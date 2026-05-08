> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 3.1: Contexte stratégique collapsable dans le Moteur

Status: done

## Story

As a consultant SEO,
I want voir un résumé du contexte stratégique du Cerveau (cible, angle, promesse) en haut du Moteur,
so that je garde ma stratégie en tête pendant la recherche de mots-clés.

## Acceptance Criteria

1. **Given** un article est sélectionné dans un cocon qui a une stratégie définie dans le Cerveau **When** l'utilisateur est sur le Moteur **Then** une section collapsable s'affiche en haut, montrant : cible, angle, promesse du cocon **And** la section est fermée par défaut (collapsée).

2. **Given** un article est sélectionné dans un cocon qui n'a PAS de stratégie définie **When** l'utilisateur est sur le Moteur **Then** la section de contexte stratégique ne s'affiche PAS (pas de section vide).

3. **Given** la route backend `GET /api/cocoons/:id/strategy/context` est appelée **When** une stratégie existe pour le cocon **Then** la réponse contient `{ data: { cible, angle, promesse, ... } }`.

4. **Given** la route backend `GET /api/cocoons/:id/strategy/context` est appelée **When** aucune stratégie n'existe pour le cocon **Then** la réponse contient `{ data: null }`.

## Tasks / Subtasks

- [x] Task 1 : Créer la route backend GET /api/cocoons/:id/strategy/context (AC: #3, #4)
  - [x] 1.1 : Ajouter un endpoint GET dans `server/routes/cocoons.routes.ts` qui prend un `cocoonId` numérique
  - [x] 1.2 : Résoudre le `cocoonSlug` depuis le `cocoonId` via `data.service.getCocoons()`
  - [x] 1.3 : Appeler `cocoon-strategy.service.getCocoonStrategy(slug)` pour récupérer la stratégie
  - [x] 1.4 : Extraire les champs validés (cible, douleur, angle, promesse, cta) et retourner `{ data: { cible, douleur, angle, promesse, cta, cocoonName, siloName } }` ou `{ data: null }` si pas de stratégie
- [x] Task 2 : Ajouter la méthode fetchContext dans le store cocoon-strategy (AC: #1, #2)
  - [x] 2.1 : Ajouter un ref `strategicContext` dans `cocoon-strategy.store.ts`
  - [x] 2.2 : Ajouter une méthode `fetchContext(cocoonId: number)` qui appelle `GET /api/cocoons/:id/strategy/context`
  - [x] 2.3 : Stocker le résultat dans `strategicContext` (ou null si absent)
- [x] Task 3 : Créer le composant MoteurStrategyContext.vue (AC: #1, #2)
  - [x] 3.1 : Créer `src/components/moteur/MoteurStrategyContext.vue` avec props typées pour les champs stratégiques
  - [x] 3.2 : Afficher une section collapsable (toggle chevron) avec les champs : Cible, Angle, Promesse (minimum) + Douleur, CTA (optionnels)
  - [x] 3.3 : Section fermée par défaut (`isOpen = ref(false)`)
  - [x] 3.4 : Style cohérent avec le design system (même pattern que MoteurContextRecap toggle)
- [x] Task 4 : Intégrer MoteurStrategyContext dans MoteurView (AC: #1, #2)
  - [x] 4.1 : Importer MoteurStrategyContext dans MoteurView
  - [x] 4.2 : Appeler `strategyStore.fetchContext(cocoonId)` quand un article est sélectionné (dans handleSelectArticle ou via watch)
  - [x] 4.3 : Rendre `<MoteurStrategyContext>` dans le template au-dessus de MoteurContextRecap, conditionné à `strategyStore.strategicContext !== null`
- [x] Task 5 : Tests unitaires (AC: #1-4)
  - [x] 5.1 : Test backend — GET /api/cocoons/:id/strategy/context retourne les champs validés quand stratégie existe
  - [x] 5.2 : Test backend — GET /api/cocoons/:id/strategy/context retourne null quand pas de stratégie
  - [x] 5.3 : Test composant — MoteurStrategyContext rend les champs cible, angle, promesse
  - [x] 5.4 : Test composant — MoteurStrategyContext est collapsé par défaut
  - [x] 5.5 : Test composant — MoteurStrategyContext s'ouvre au clic du toggle
  - [x] 5.6 : Test intégration — le composant ne s'affiche PAS quand strategicContext est null

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `server/services/cocoon-strategy.service.ts` — service backend existant (getCocoonStrategy, saveCocoonStrategy)
- `data/strategies/*.json` — fichiers de données stratégiques (2 existants)
- `shared/types/strategy.types.ts` — types existants (CocoonStrategy, ThemeContext, etc.)
- `shared/schemas/strategy.schema.ts` — schemas Zod existants
- `server/routes/strategy.routes.ts` — routes stratégie existantes (GET/PUT/POST suggest/deepen/consolidate/enrich)
- `MoteurContextRecap.vue` — liste d'articles (aucune modification)
- `ProgressDots.vue`, `PhaseTransitionBanner.vue` — composants Epic 2

**MODIFIÉ :**
- `server/routes/cocoons.routes.ts` — ajout route GET /api/cocoons/:id/strategy/context
- `src/stores/cocoon-strategy.store.ts` — ajout ref `strategicContext`, méthode `fetchContext()`
- `src/views/MoteurView.vue` — import MoteurStrategyContext, intégration dans template

**CRÉÉ :**
- `src/components/moteur/MoteurStrategyContext.vue` — composant collapsable
- `tests/unit/components/moteur-strategy-context.test.ts` — tests

### Infrastructure existante

#### Service backend — cocoon-strategy.service.ts
```typescript
// Fonctions existantes :
export async function getCocoonStrategy(cocoonSlug: string): Promise<CocoonStrategy | null>
export async function saveCocoonStrategy(cocoonSlug: string, strategy: Partial<CocoonStrategy>): Promise<CocoonStrategy>
// Lit depuis data/strategies/cocoon-{slug}.json
```

#### Store Pinia — cocoon-strategy.store.ts
```typescript
// Déjà importé dans MoteurView (ligne 9) et instancié (ligne 57)
const strategyStore = useCocoonStrategyStore()
// Méthodes existantes : fetchStrategy, saveStrategy, getPreviousAnswers
// Contient déjà un ref `strategy` pour le workflow Cerveau
```

#### Structure données stratégie — data/strategies/cocoon-*.json
```json
{
  "cocoonSlug": "strategie-de-croissance",
  "cible": { "input": "...", "suggestion": null, "validated": "Dirigeants PME..." },
  "douleur": { "input": "...", "suggestion": null, "validated": "Manque de visibilité..." },
  "angle": { "input": "...", "suggestion": null, "validated": "Approche pragmatique..." },
  "promesse": { "input": "...", "suggestion": null, "validated": "Résultats mesurables..." },
  "cta": { "input": "...", "suggestion": null, "validated": "Audit gratuit..." },
  "proposedArticles": [...],
  "completedSteps": 6
}
```

**Les champs `validated` sont ceux à afficher dans le composant collapsable.** Si `validated` est null/vide, le champ n'a pas été complété.

#### Routes cocoons existantes — cocoons.routes.ts
```typescript
// GET /api/cocoons → liste des cocons
// GET /api/cocoons/:id/articles → articles par cocon
// AJOUTER : GET /api/cocoons/:id/strategy/context → contexte stratégique
```

### Détail d'implémentation

#### Task 1 — Route backend

```typescript
// cocoons.routes.ts — ajout endpoint
router.get('/cocoons/:id/strategy/context', async (req, res, next) => {
  const cocoonId = Number(req.params.id)
  const cocoons = await getCocoons()
  const cocoon = cocoons.find(c => c.id === cocoonId)
  if (!cocoon) return res.json({ data: null })

  const slug = slugify(cocoon.name)
  const strategy = await getCocoonStrategy(slug)
  if (!strategy) return res.json({ data: null })

  res.json({
    data: {
      cocoonName: cocoon.name,
      siloName: cocoon.siloName,
      cible: strategy.cible?.validated ?? null,
      douleur: strategy.douleur?.validated ?? null,
      angle: strategy.angle?.validated ?? null,
      promesse: strategy.promesse?.validated ?? null,
      cta: strategy.cta?.validated ?? null,
    },
  })
})
```

**Note :** La fonction `slugify` doit reproduire la même logique que celle de `MoteurContextRecap.vue` (normalize NFD, replace diacritics, replace non-alphanum with dash).

#### Task 2 — Store fetchContext

```typescript
// cocoon-strategy.store.ts — ajout
const strategicContext = ref<StrategyContextData | null>(null)

async function fetchContext(cocoonId: number): Promise<void> {
  strategicContext.value = await apiGet<StrategyContextData | null>(
    `/cocoons/${cocoonId}/strategy/context`
  )
}

return { /* existants */, strategicContext, fetchContext }
```

Type `StrategyContextData` :
```typescript
interface StrategyContextData {
  cocoonName: string
  siloName: string
  cible: string | null
  douleur: string | null
  angle: string | null
  promesse: string | null
  cta: string | null
}
```

#### Task 3 — Composant MoteurStrategyContext.vue

Pattern toggle identique à MoteurContextRecap — chevron SVG, `.recap-toggle`, section collapsable.

```typescript
// Props
defineProps<{
  cible: string | null
  douleur: string | null
  angle: string | null
  promesse: string | null
  cta: string | null
}>()

const isOpen = ref(false)  // Fermé par défaut (AC #1)
```

Affichage : chaque champ non-null s'affiche en `<dt>/<dd>` ou label/value.

#### Task 4 — Intégration MoteurView

```html
<!-- Au-dessus de MoteurContextRecap, conditionné -->
<MoteurStrategyContext
  v-if="strategyStore.strategicContext"
  :cible="strategyStore.strategicContext.cible"
  :douleur="strategyStore.strategicContext.douleur"
  :angle="strategyStore.strategicContext.angle"
  :promesse="strategyStore.strategicContext.promesse"
  :cta="strategyStore.strategicContext.cta"
/>
```

Appel `fetchContext` dans le watcher `cocoonId` ou dans `onMounted`.

### Enforcement Guidelines

- Utiliser `apiGet` (jamais `fetch`) — pattern api.service.ts existant
- Envelopper réponses backend dans `{ data: T }` — format standard
- Composition API Pinia — pattern existant dans tous les stores
- Tests dans `tests/unit/components/` — pattern existant
- Logger (jamais `console.log`)
- `slugify` côté backend — même algorithme que frontend (MoteurContextRecap)
- **Ne PAS modifier la structure des fichiers `data/strategies/*.json`** — lecture seule
- **Ne PAS modifier `cocoon-strategy.service.ts`** — utiliser tel quel

### Risques identifiés

1. **Résolution cocoonId → cocoonSlug** : Le cocoonId est numérique (index dans le tableau data), mais les stratégies sont stockées par slug. Il faut résoudre via `getCocoons()` pour trouver le nom.
2. **Pas de stratégie pour tous les cocons** : Seuls 2 fichiers existent dans `data/strategies/`. Le composant doit gérer gracieusement l'absence (AC #2).
3. **Champs validated peuvent être null** : Un cocon peut avoir une stratégie partiellement complétée (ex: `cible` remplie mais `promesse` pas encore).

### Project Structure Notes

- Nouveau composant : `src/components/moteur/MoteurStrategyContext.vue`
- Route modifiée : `server/routes/cocoons.routes.ts`
- Store modifié : `src/stores/cocoon-strategy.store.ts`
- Vue modifiée : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/components/moteur-strategy-context.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pont Cerveau→Moteur]
- [Source: server/services/cocoon-strategy.service.ts — getCocoonStrategy]
- [Source: src/stores/cocoon-strategy.store.ts — strategy, fetchStrategy]
- [Source: shared/types/strategy.types.ts — CocoonStrategy, ThemeContext]
- [Source: server/routes/cocoons.routes.ts — existing routes]
- [Source: data/strategies/ — 2 existing strategy files]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-30.md] — Epic précédent

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Added `GET /api/cocoons/:id/strategy/context` route in `cocoons.routes.ts` — resolves cocoonId→slug via getCocoons(), calls getCocoonStrategy(slug), extracts `validated` fields, returns `{ data: { cocoonName, siloName, cible, douleur, angle, promesse, cta } }` or `{ data: null }`
- Task 2: Added `StrategyContextData` type in `shared/types/strategy.types.ts`, exported from index. Added `strategicContext` ref and `fetchContext(cocoonId)` method in `cocoon-strategy.store.ts`, added to $reset and return.
- Task 3: Created `MoteurStrategyContext.vue` — collapsable section with chevron toggle, closed by default (`isOpen = ref(false)`), renders only non-null fields as dt/dd pairs, aria-expanded for accessibility.
- Task 4: Imported component in MoteurView, added `strategyStore.fetchContext(cocoonId.value)` in loadData, rendered above MoteurContextRecap with `v-if="strategyStore.strategicContext"`.
- Task 5: 13 tests — 3 backend route logic, 2 rendering, 1 collapsed default, 2 toggle interaction, 2 integration visibility, 3 store fetchContext. All pass.
- Build validation: vue-tsc PASS, vite build PASS

### File List

- `server/routes/cocoons.routes.ts` — MODIFIED (added GET /api/cocoons/:id/strategy/context)
- `shared/types/strategy.types.ts` — MODIFIED (added StrategyContextData interface)
- `shared/types/index.ts` — MODIFIED (exported StrategyContextData)
- `src/stores/cocoon-strategy.store.ts` — MODIFIED (strategicContext ref, fetchContext method, $reset, return)
- `src/components/moteur/MoteurStrategyContext.vue` — NEW (collapsable component, 95 lines)
- `src/views/MoteurView.vue` — MODIFIED (import, fetchContext call, template integration)
- `tests/unit/components/moteur-strategy-context.test.ts` — NEW (13 tests)
