> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 2.2: Checks automatiques via emit check-completed

Status: done

## Story

As a consultant SEO,
I want que le système coche automatiquement les étapes quand un onglet produit un résultat,
so that ma progression se met à jour sans action manuelle de ma part.

## Acceptance Criteria

1. **Given** un article est sélectionné et l'utilisateur est dans le Moteur **When** Discovery IA termine son analyse avec des résultats **Then** le composant émet `check-completed` avec la valeur `discovery_done` **And** MoteurView intercepte l'événement et appelle `progressStore.addCheck(slug, 'discovery_done')` **And** le backend persiste le check via `POST /api/articles/:slug/progress/check`.

2. **Given** un check est déjà complété pour un article (ex: `discovery_done`) **When** l'utilisateur relance Discovery pour le même article **Then** le check n'est PAS ajouté en doublon dans completedChecks[].

3. **Given** les 7 checks standardisés sont : `discovery_done`, `radar_done`, `intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done` **When** chaque onglet correspondant produit un résultat **Then** le check correspondant est émis et persisté **And** les dots de progression (Story 2.1) se mettent à jour en temps réel.

4. **Given** la route backend `POST /api/articles/:slug/progress/check` reçoit un check **When** le check est valide (fait partie des 7 standardisés) **Then** le check est ajouté à `completedChecks[]` dans `data/article-progress.json` **And** la réponse est `{ data: { slug, completedChecks } }`.

## Tasks / Subtasks

- [x] Task 1 : Importer et intégrer articleProgressStore dans MoteurView (AC: #1, #3)
  - [x] 1.1 : Importer `useArticleProgressStore` dans MoteurView
  - [x] 1.2 : Créer une fonction helper `emitCheckCompleted(check: string)` qui appelle `progressStore.addCheck(selectedArticle.value!.slug, check)` avec guard si pas d'article sélectionné
  - [x] 1.3 : Reset le store à la déselection d'article (dans handleSelectArticle)
- [x] Task 2 : Ajouter les émissions check-completed dans les handlers existants de MoteurView (AC: #1, #3)
  - [x] 2.1 : `discovery_done` → dans `handleSendToRadar` (quand Discovery envoie ses keywords au Radar)
  - [x] 2.2 : `radar_done` → dans `handleRadarScanned` (quand DouleurIntentScanner émet `scanned`)
  - [x] 2.3 : `intent_done` → dans le handler inline de ExplorationVerdict `@continue` (quand l'utilisateur clique "Continuer" vers Audit)
  - [x] 2.4 : `audit_done` → dans `handleKeywordChange` (quand l'utilisateur modifie/valide des mots-clés dans l'Audit)
  - [x] 2.5 : `local_done` → ajouter un handler @continue sur LocalComparisonStep OU MapsStep (la dernière section Local fusionné)
  - [x] 2.6 : `captain_chosen` → dans `handleApplyMigration` (quand l'assignation est confirmée avec un capitaine)
  - [x] 2.7 : `assignment_done` → dans `handleApplyMigration` après succès de l'API (quand les assignments sont persistés)
- [x] Task 3 : Vérifier la protection contre les doublons (AC: #2)
  - [x] 3.1 : Vérifier que `progressStore.addCheck()` côté frontend et `POST /api/articles/:slug/progress/check` côté backend empêchent les doublons
  - [x] 3.2 : Si ce n'est pas le cas, ajouter la vérification dans le service backend
- [x] Task 4 : Tests unitaires (AC: #1-4)
  - [x] 4.1 : Test emitCheckCompleted appelle progressStore.addCheck avec le bon slug et check
  - [x] 4.2 : Test emitCheckCompleted ne fait rien si aucun article sélectionné
  - [x] 4.3 : Test chaque handler déclenche le bon check (7 tests, un par check)
  - [x] 4.4 : Test doublon — addCheck avec un check existant ne crée pas de doublon
  - [x] 4.5 : Test intégration — handleSendToRadar émet discovery_done ET navigue vers douleur-intent

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `article-progress.service.ts` — service backend (getProgress, addCheck, saveProgress) — DÉJÀ empêche les doublons via `Set`-like logic
- `article-progress.routes.ts` — routes API existantes (GET/PUT/POST progress)
- `article-progress.store.ts` — store Pinia (progressMap, fetchProgress, getProgress, addCheck)
- `article-progress.schema.ts` — schémas Zod (articleProgressSchema, addCheckSchema)
- Tous les composants enfants (KeywordDiscoveryTab, DouleurIntentScanner, ExplorationVerdict, KeywordAuditTable, LocalComparisonStep, MapsStep, KeywordMigrationPreview) — **aucune modification de composant enfant nécessaire**
- `ProgressDots.vue` — affichage réactif (Story 2.1)
- `MoteurContextRecap.vue` — intégration ProgressDots (Story 2.1)

**MODIFIÉ :**
- `src/views/MoteurView.vue` — ajout articleProgressStore, function emitCheckCompleted, appels dans les handlers existants

**CRÉÉ :**
- `tests/unit/components/moteur-check-completed.test.ts` — tests

### Stratégie d'implémentation — HANDLERS EXISTANTS UNIQUEMENT

**CRITIQUE : Ne PAS modifier les composants enfants. Toute la logique check-completed est dans MoteurView via les handlers existants.**

Les composants enfants émettent déjà des événements que MoteurView intercepte. Il suffit d'ajouter un appel `emitCheckCompleted()` dans chaque handler existant. Aucun nouvel emit `check-completed` sur les composants enfants.

### Mapping des 7 checks vers les handlers MoteurView existants

| # | Check | Handler MoteurView | Événement source | Composant | Justification |
|---|-------|-------------------|-----------------|-----------|---------------|
| 1 | `discovery_done` | `handleSendToRadar` | `@send-to-radar` | KeywordDiscoveryTab | Discovery produit des keywords → envoyées au Radar |
| 2 | `radar_done` | `handleRadarScanned` | `@scanned` | DouleurIntentScanner | Scan radar terminé avec résultats |
| 3 | `intent_done` | handler inline `@continue` | `@continue` | ExplorationVerdict | L'utilisateur valide l'intention → navigue vers Audit |
| 4 | `audit_done` | `handleKeywordChange` | `@delete`, `@saved`, `@keyword-added` | KeywordAuditTable, KeywordEditor, DiscoveryPanel | L'utilisateur modifie/valide des keywords dans l'Audit |
| 5 | `local_done` | **NOUVEAU handler** `handleLocalContinue` | `@continue` | MapsStep (dernier composant de la section Local) | L'utilisateur termine les 2 sections Local |
| 6 | `captain_chosen` | `handleApplyMigration` | `@apply` | KeywordMigrationPreview | Capitaine défini lors de l'assignation |
| 7 | `assignment_done` | `handleApplyMigration` | `@apply` | KeywordMigrationPreview | Assignation complète (même handler, après succès API) |

### Détail de chaque intégration

#### 1. `discovery_done` dans handleSendToRadar
```typescript
// EXISTANT dans MoteurView :
function handleSendToRadar(keywords: RadarKeyword[]) {
  discoveryRadarKeywords.value = keywords
  activeTab.value = 'douleur-intent'
  // AJOUTER :
  emitCheckCompleted('discovery_done')
}
```

#### 2. `radar_done` dans handleRadarScanned
```typescript
// EXISTANT :
function handleRadarScanned(payload: { globalScore: number; heatLevel: string }) {
  radarScanResult.value = payload
  // AJOUTER :
  emitCheckCompleted('radar_done')
}
```

#### 3. `intent_done` dans ExplorationVerdict @continue
```typescript
// EXISTANT (inline handler) :
// @continue="activeTab = 'audit'"
// REMPLACER PAR :
function handleExplorationContinue() {
  activeTab.value = 'audit'
  emitCheckCompleted('intent_done')
}
// Template: @continue="handleExplorationContinue"
```

#### 4. `audit_done` dans handleKeywordChange
```typescript
// EXISTANT :
async function handleKeywordChange() {
  await auditStore.refreshResults(cocoonSlug.value)
  // AJOUTER :
  emitCheckCompleted('audit_done')
}
```

#### 5. `local_done` — nouveau handler pour MapsStep @continue
```typescript
// NOUVEAU :
function handleLocalContinue() {
  emitCheckCompleted('local_done')
}
// Template MapsStep: @continue="handleLocalContinue"
```
**Note :** LocalComparisonStep et MapsStep émettent déjà `continue` mais les handlers ne sont pas câblés. Câbler uniquement MapsStep (dernier composant Local) pour marquer local_done.

#### 6-7. `captain_chosen` + `assignment_done` dans handleApplyMigration
```typescript
// EXISTANT :
async function handleApplyMigration(assignments: any[]) {
  isApplyingMigration.value = true
  // ... API call ...
  showMigration.value = false
  // AJOUTER (après succès API) :
  emitCheckCompleted('captain_chosen')
  emitCheckCompleted('assignment_done')
}
```

### Fonction helper emitCheckCompleted

```typescript
const articleProgressStore = useArticleProgressStore()

function emitCheckCompleted(check: string) {
  const slug = selectedArticle.value?.slug
  if (!slug) return
  articleProgressStore.addCheck(slug, check)
}
```

### Protection contre les doublons

Le backend `article-progress.service.ts` utilise `addCheck()` qui vérifie si le check existe déjà :
```typescript
// article-progress.store.ts (frontend)
async function addCheck(slug: string, check: string): Promise<void> {
  const res = await apiPost<ArticleProgress>(
    `/articles/${encodeURIComponent(slug)}/progress/check`,
    { check }
  )
  progressMap.value[slug] = res
}
```

Le service backend doit vérifier :
```typescript
// article-progress.service.ts (backend)
// VÉRIFIER que addCheck empêche les doublons :
// if (!progress.completedChecks.includes(check)) {
//   progress.completedChecks.push(check)
// }
```

### Enforcement Guidelines

- Utiliser composition API
- Pas de `console.log` — utiliser le logger
- Tests dans `tests/unit/components/`
- **Ne PAS modifier les composants enfants** — toute la logique est dans MoteurView handlers
- Ne PAS modifier les checks existants dans SelectedArticlePanel (coexistence snake_case/kebab-case)

### Risques identifiés

1. **handleKeywordChange est appelé pour plusieurs actions (delete, saved, keyword-added)** — `audit_done` sera émis à chaque modification. C'est acceptable car addCheck empêche les doublons.
2. **captain_chosen et assignment_done sont émis ensemble** dans handleApplyMigration — logique correcte car l'assignation inclut toujours le capitaine.
3. **ExplorationVerdict @continue inline handler** — doit être extrait vers une fonction nommée pour y ajouter emitCheckCompleted.

### Project Structure Notes

- Fichier modifié : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/components/moteur-check-completed.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Progression & guidage]
- [Source: src/views/MoteurView.vue — handlers existants]
- [Source: src/stores/article-progress.store.ts — addCheck]
- [Source: server/services/article-progress.service.ts — addCheck backend]
- [Source: _bmad-output/implementation-artifacts/2-1-dots-de-progression-par-article-dans-la-liste.md] — Story précédente

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Added `useArticleProgressStore` import, store instantiation, and `emitCheckCompleted(check)` helper with null-slug guard in MoteurView.vue
- Task 2: All 7 checks wired into existing handlers — `handleSendToRadar` (discovery_done), `handleRadarScanned` (radar_done), new `handleExplorationContinue` extracted from inline (intent_done), `handleKeywordChange` (audit_done), new `handleLocalContinue` wired to MapsStep @continue (local_done), `handleApplyMigration` after API success (captain_chosen + assignment_done)
- Task 3: Backend `article-progress.service.ts` line 40 already prevents duplicates via `if (!existing.completedChecks.includes(check))` — no changes needed
- Task 4: 10 tests in moteur-check-completed.test.ts — 3 helper logic + 6 handler integration + 1 backend duplicate prevention. Used `vi.spyOn(progressStore, 'addCheck').mockResolvedValue()` pattern for Pinia action spying.
- Build validation: vue-tsc PASS, vite build PASS

### File List

- `src/views/MoteurView.vue` — MODIFIED (import, store, helper, 7 handler integrations, 2 template bindings)
- `tests/unit/components/moteur-check-completed.test.ts` — NEW (10 tests)
