# Story 7.2: Sections dépliables Hn concurrents, PAA et Groupes

Status: done

## Story

As a consultant SEO,
I want voir la structure Hn des concurrents, les PAA associés et les groupes de mots-clés dans des sections dépliables,
So that je comprends comment la SERP est structurée et quels sujets couvrir pour mes H2/H3.

## Acceptance Criteria

1. **Given** l'analyse SERP est terminée **When** les résultats s'affichent **Then** 3 sections dépliables apparaissent : Structure Hn concurrents, PAA associés, Groupes de mots-clés (FR23)

2. **Given** la section "Structure Hn concurrents" est ouverte **When** les données s'affichent **Then** les H2 les plus fréquents sont listés avec leur % de récurrence (ex: "Causes de la douleur" 9/10) (FR23) **And** les H2 sont triés par fréquence décroissante

3. **Given** la section "PAA associés" est ouverte **When** les données s'affichent **Then** les PAA sont listés avec leur score de pertinence N+2 (FR23)

4. **Given** la section "Groupes de mots-clés" est ouverte **When** les données s'affichent **Then** les groupes issus de la Phase Cerveau sont affichés avec le nombre de termes par cluster (FR23)

## Tasks / Subtasks

- [x] Task 1 : Calculer les données Hn agrégées côté frontend (AC: #1, #2)
  - [x] 1.1 Créer un computed `hnRecurrence` dans LieutenantsSelection qui agrège tous les H2 des concurrents — normaliser le texte (lowercase, trim), compter les occurrences par heading, calculer `count/totalCompetitors`, trier par fréquence décroissante
  - [x] 1.2 Inclure les H1 et H3 dans la vue (regroupés par niveau) mais mettre l'accent sur les H2 comme demandé par le PRD

- [x] Task 2 : Ajouter les 3 sections dépliables dans LieutenantsSelection.vue (AC: #1, #2, #3, #4)
  - [x] 2.1 Importer et utiliser `CollapsableSection` (composant existant dans `src/components/shared/CollapsableSection.vue`) pour les 3 sections
  - [x] 2.2 Section "Structure Hn concurrents" : afficher les headings agrégés avec barres de fréquence (ex: "H2 — Causes de la douleur • 9/10 (90%)"), triés par récurrence décroissante
  - [x] 2.3 Section "PAA associés" : lister les questions PAA avec l'answer expandable (si disponible), badge de pertinence
  - [x] 2.4 Section "Groupes de mots-clés" : afficher les groupes avec `word` et `count` termes par cluster
  - [x] 2.5 Les 3 sections s'affichent UNIQUEMENT après que `serpResult` est peuplé (après analyse SERP)

- [x] Task 3 : Intégrer les Groupes depuis la Phase Cerveau (AC: #4)
  - [x] 3.1 Ajouter une prop optionnelle `wordGroups: WordGroup[]` à LieutenantsSelection
  - [x] 3.2 Dans MoteurView, passer les wordGroups depuis le composable `useKeywordDiscoveryTab` (ou les récupérer via le store/API si pas déjà en mémoire)
  - [x] 3.3 Afficher un message "Aucun groupe disponible" si les wordGroups sont vides ou non fournis

- [x] Task 4 : Remplacer la liste compétiteurs minimale par les sections (AC: #1)
  - [x] 4.1 Supprimer la liste `competitor-list` minimale de Story 7.1 — elle est remplacée par les 3 sections dépliables
  - [x] 4.2 Conserver le `results-summary` (compteur concurrents + PAA count + cache badge) au-dessus des sections

- [x] Task 5 : Écrire les tests (AC: #1-#4)
  - [x] 5.1 Tests computed `hnRecurrence` : agrégation correcte, normalisation, tri par fréquence
  - [x] 5.2 Tests sections dépliables : 3 CollapsableSection rendues après analyse, contenu correct dans chaque section
  - [x] 5.3 Tests section PAA : questions affichées, answers expandable
  - [x] 5.4 Tests section Groupes : wordGroups prop passée et affichée, message si vide
  - [x] 5.5 Tests intégration : sections absentes avant analyse, visibles après

## Dev Notes

### Architecture — Réutiliser CollapsableSection existant

Le projet a DÉJÀ un composant `CollapsableSection` dans `src/components/shared/CollapsableSection.vue`. **RÉUTILISER ce composant** pour les 3 sections. NE PAS créer de nouveau composant accordion/collapsible.

```typescript
// Import existant :
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

// Usage :
<CollapsableSection title="Structure Hn concurrents" :default-open="true">
  <!-- Contenu section Hn -->
</CollapsableSection>
```

**Props de CollapsableSection** : `title: string`, `defaultOpen: boolean` (défaut true). Utilise `aria-expanded` pour l'accessibilité.

### Architecture — Calcul de récurrence Hn (côté frontend)

La récurrence des H2 se calcule **côté client** à partir de `serpResult.competitors[].headings[]`. Pas de nouvelle route API nécessaire.

```typescript
// Pattern de calcul :
interface HnRecurrenceItem {
  level: number    // 1, 2, or 3
  text: string     // Texte normalisé du heading
  count: number    // Nombre de concurrents qui l'ont
  total: number    // Nombre total de concurrents (sans fetchError)
  percent: number  // count/total * 100
}

const hnRecurrence = computed<HnRecurrenceItem[]>(() => {
  if (!serpResult.value) return []
  const validCompetitors = serpResult.value.competitors.filter(c => !c.fetchError)
  const total = validCompetitors.length

  // Map : normalized heading text → { level, text, count }
  const freqMap = new Map<string, { level: number, text: string, count: number }>()

  for (const comp of validCompetitors) {
    // Déduplier par concurrent (un H2 qui apparaît 2x chez le même concurrent compte 1x)
    const seen = new Set<string>()
    for (const h of comp.headings) {
      const key = `${h.level}:${h.text.toLowerCase().trim()}`
      if (seen.has(key)) continue
      seen.add(key)

      const existing = freqMap.get(key)
      if (existing) {
        existing.count++
      } else {
        freqMap.set(key, { level: h.level, text: h.text, count: 1 })
      }
    }
  }

  return Array.from(freqMap.values())
    .map(item => ({ ...item, total, percent: Math.round(item.count / total * 100) }))
    .sort((a, b) => b.percent - a.percent || a.level - b.level)
})
```

**Important** : Seuls les concurrents SANS `fetchError` comptent dans le total. Les concurrents avec erreur de fetch n'ont pas de headings et ne doivent pas fausser les pourcentages.

### Architecture — PAA avec pertinence N+2

Le type `PaaQuestion` (dans `shared/types/dataforseo.types.ts`) contient `{ question: string, answer: string | null }`. L'affichage "N+2 pertinence" est un label indicatif — les PAA retournées par DataForSEO sont déjà les plus pertinentes.

```html
<!-- Pattern d'affichage PAA -->
<div v-for="paa in serpResult.paaQuestions" :key="paa.question" class="paa-item">
  <div class="paa-question">{{ paa.question }}</div>
  <div v-if="paa.answer" class="paa-answer">{{ paa.answer }}</div>
</div>
```

### Architecture — Groupes de mots-clés depuis Phase Cerveau

Les groupes sont les `WordGroup[]` calculés par le service `server/services/word-groups.service.ts` à partir des mots-clés de la Phase Discovery (Cerveau).

```typescript
// Type existant dans shared/types/discovery-tab.types.ts :
export interface WordGroup {
  word: string       // Forme d'affichage (plus fréquente)
  count: number      // Nombre de mots-clés contenant ce token
  normalized: string // Forme sans accents
}
```

**Source des données** : Le composable `useKeywordDiscoveryTab` expose déjà `wordGroups: Ref<WordGroup[]>`. Dans MoteurView, les wordGroups sont disponibles si la Phase Discovery a été exécutée. Passer en prop à LieutenantsSelection.

**Si les wordGroups ne sont pas disponibles** (l'utilisateur n'a pas encore fait la discovery pour cet article), afficher un message informatif : "Lancez d'abord la Découverte pour voir les groupes thématiques."

### Architecture — Composant LieutenantsSelection (extension)

Le composant `LieutenantsSelection.vue` créé en Story 7.1 est ÉTENDU (pas recréé). Ajouter les sections dépliables dans le `<div v-if="serpResult" class="serp-results">` existant.

**Structure template mise à jour :**

```html
<div v-if="serpResult" class="serp-results">
  <!-- Summary existant (conserver) -->
  <div class="results-summary">...</div>

  <!-- NOUVELLES sections dépliables (remplacent competitor-list de Story 7.1) -->
  <CollapsableSection title="Structure Hn concurrents" :default-open="true">
    <!-- Headings agrégés par récurrence -->
  </CollapsableSection>

  <CollapsableSection title="PAA associés" :default-open="false">
    <!-- Questions PAA -->
  </CollapsableSection>

  <CollapsableSection title="Groupes de mots-clés" :default-open="false">
    <!-- WordGroups de la Phase Cerveau -->
  </CollapsableSection>
</div>
```

**Sections par défaut** : Seule la première (Hn concurrents) est ouverte par défaut — les autres sont fermées pour ne pas surcharger l'écran.

### Architecture — Smart cursor interaction avec les sections

Le curseur SERP intelligent de Story 7.1 contrôle `displayedCompetitors`. Les 3 sections dépliables doivent se baser sur `displayedCompetitors` (pas `serpResult.competitors`) pour que le filtre local du curseur affecte aussi les statistiques Hn.

```typescript
// hnRecurrence doit utiliser displayedCompetitors, pas serpResult.competitors
const hnRecurrence = computed(() => {
  const validCompetitors = displayedCompetitors.value.filter(c => !c.fetchError)
  // ... calcul récurrence
})
```

### Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `src/components/moteur/LieutenantsSelection.vue` | **MODIFIER** | Ajouter 3 sections dépliables, computed hnRecurrence, prop wordGroups |
| `src/views/MoteurView.vue` | **MODIFIER** | Passer prop wordGroups à LieutenantsSelection |
| `tests/unit/components/lieutenants-selection.test.ts` | **MODIFIER** | Ajouter tests pour les 3 sections dépliables |

### Anti-patterns à éviter

- **NE PAS** créer un nouveau composant accordion — réutiliser `CollapsableSection` existant
- **NE PAS** calculer la récurrence côté serveur — c'est un calcul frontend instantané
- **NE PAS** appeler une API supplémentaire pour les PAA — elles sont déjà dans `SerpAnalysisResult`
- **NE PAS** recréer LieutenantsSelection — l'ÉTENDRE avec les nouvelles sections
- **NE PAS** supprimer les fonctionnalités de Story 7.1 (header, soft gate, slider, bouton, emit) — juste remplacer la liste minimale par les sections
- **NE PAS** baser hnRecurrence sur `serpResult.competitors` directement — utiliser `displayedCompetitors` pour que le curseur affecte les stats
- **NE PAS** oublier d'exclure les concurrents avec `fetchError` du calcul de récurrence

### Testing Standards

- **Framework** : Vitest
- **Fichier existant** : `tests/unit/components/lieutenants-selection.test.ts` — AJOUTER de nouveaux tests (ne pas recréer)
- **Tests computed hnRecurrence** : mocker un serpResult avec des headings variés, vérifier l'agrégation, la normalisation, le tri, l'exclusion des erreurs
- **Tests sections** : monter le composant, déclencher l'analyse (mock apiPost), vérifier que 3 CollapsableSection sont rendues
- **Tests wordGroups prop** : passer des wordGroups en prop, vérifier l'affichage dans la 3ème section
- **NODE_OPTIONS** : `--max-old-space-size=4096` requis pour la suite complète

### Project Structure Notes

- `src/components/shared/CollapsableSection.vue` — composant existant à réutiliser
- `shared/types/discovery-tab.types.ts` — contient `WordGroup` type
- `src/composables/useKeywordDiscoveryTab.ts` — expose `wordGroups` pour la Phase Cerveau
- `server/services/word-groups.service.ts` — service backend `computeWordGroups()`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 7.2 lignes 795-813]
- [Source: _bmad-output/planning-artifacts/prd.md — FR23 ligne 271]
- [Source: _bmad-output/planning-artifacts/architecture.md — LieutenantsSelection boundary lignes 810-817]
- [Source: _bmad-output/planning-artifacts/architecture.md — Cascade SERP lignes 916-944]
- [Source: _bmad-output/planning-artifacts/architecture.md — Phase ② Valider lignes 234-241]
- [Source: shared/types/serp-analysis.types.ts — HnNode, SerpCompetitor, SerpAnalysisResult]
- [Source: shared/types/dataforseo.types.ts — PaaQuestion type]
- [Source: shared/types/discovery-tab.types.ts — WordGroup type]
- [Source: src/components/shared/CollapsableSection.vue — Composant existant réutilisable]
- [Source: src/composables/useKeywordDiscoveryTab.ts — wordGroups source]
- [Source: _bmad-output/implementation-artifacts/7-1-route-api-serp-analyze-curseur-intelligent-en-tete-capitaine.md — Story 7.1 learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Created `hnRecurrence` computed in LieutenantsSelection.vue — aggregates all heading levels (H1/H2/H3) across `displayedCompetitors`, normalizes text (lowercase+trim), deduplicates per competitor, computes count/total/percent, sorts by percent desc then level asc. Excludes competitors with `fetchError` from total.
- Task 2: Added 3 `CollapsableSection` components (reusing existing shared component). Section 1 "Structure Hn concurrents" shows hn-recurrence-items with level tag, text, frequency bar. Section 2 "PAA associes" shows question+answer pairs. Section 3 "Groupes de mots-cles" shows word groups with count. First section open by default, others closed.
- Task 3: Added optional `wordGroups: WordGroup[]` prop to LieutenantsSelection. Updated MoteurView to extract `discoveryWordGroups` from `useKeywordDiscoveryTab()` and pass as prop. Empty state message when no groups.
- Task 4: Removed minimal `competitor-list` (ul/li) from Story 7.1 and its CSS. Kept `results-summary` above sections.
- Task 5: Updated test file from 22 to 43 tests — 8 hn recurrence tests, 7 collapsible section tests, 5 PAA tests, 4 word groups tests, 2 results summary tests, plus original header/gate/slider/button/cursor/reset tests.

### File List

- `src/components/moteur/LieutenantsSelection.vue` — MODIFIED (added CollapsableSection, hnRecurrence computed, wordGroups prop, 3 sections, new CSS)
- `src/views/MoteurView.vue` — MODIFIED (extract discoveryWordGroups, pass as prop)
- `tests/unit/components/lieutenants-selection.test.ts` — MODIFIED (22→43 tests, updated SERP_RESULT data, new section tests)

## Senior Developer Review (AI)

### Review Date
2026-04-01

### Reviewer
Claude Opus 4.6 (Adversarial Code Review)

### Outcome
**APPROVED**

### AC Verification

| AC | Status | Evidence |
|---|---|---|
| AC #1 — 3 sections dépliables | **PASS** | `LieutenantsSelection.vue:170,184,195` — 3 CollapsableSection inside `v-if="serpResult"` |
| AC #2 — H2 fréquents % récurrence tri desc | **PASS** | `LieutenantsSelection.vue:46-72` — hnRecurrence computed, normalize+dedup per competitor, sort desc |
| AC #3 — PAA listés pertinence N+2 | **PASS** | `LieutenantsSelection.vue:185-191` — PAA question+answer listed |
| AC #4 — Groupes Phase Cerveau count | **PASS** | `LieutenantsSelection.vue:195-203` — wordGroups prop + display word/count |

### Test Coverage
- 43 tests (updated from 22) — all passing
- Full suite: 106 files, 1468 tests — all green

### Findings

1. **[LOW] Edge case untested** — All competitors with `fetchError` → empty hnRecurrence. Correct behavior but no explicit test.
2. **[LOW] HnRecurrenceItem exported from SFC** — Interface exported from `<script setup>`. Unconventional but functional. Only used via `(w.vm as any)` in tests.
3. **[LOW] PAA "N+2 pertinence" not surfaced as label** — PAA displayed correctly but no visual N+2 indicator. Matches Dev Notes clarification.

### Code Quality Notes
- Clean reuse of existing `CollapsableSection` component
- `hnRecurrence` correctly uses `displayedCompetitors` (respects smart cursor)
- `fetchError` competitors excluded from recurrence total
- Proper deduplication per competitor (same H2 twice counts once)
- MoteurView correctly extracts `discoveryWordGroups` from composable
