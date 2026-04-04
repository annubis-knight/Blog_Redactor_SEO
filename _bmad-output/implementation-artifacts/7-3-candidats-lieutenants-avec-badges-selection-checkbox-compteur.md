# Story 7.3: Candidats Lieutenants avec badges + sélection checkbox + compteur

Status: done

## Story

As a consultant SEO,
I want voir les candidats Lieutenants avec leurs badges de provenance et pertinence, les sélectionner via checkboxes avec un compteur recommandé,
So that je choisis mes mots-clés secondaires en connaissance de cause et avec un guidage clair.

## Acceptance Criteria

1. **Given** l'analyse SERP est terminée **When** la section de sélection des Lieutenants s'affiche **Then** les candidats sont présentés avec des badges multi-source : [SERP], [PAA], [Groupe] (FR24) **And** chaque candidat a un badge de pertinence : Fort, Moyen, Faible (FR24) **And** la pertinence est basée sur la complémentarité avec le Capitaine

2. **Given** le niveau d'article est "Intermédiaire" **When** la section s'affiche **Then** un compteur indique "3-5 recommandés" (FR25)

3. **Given** le niveau d'article est "Pilier" **When** la section s'affiche **Then** un compteur indique "5-8 recommandés" (FR25)

4. **Given** l'utilisateur sélectionne des Lieutenants via checkboxes **When** il coche/décoche des candidats **Then** le compteur se met à jour en temps réel (ex: "4/5 recommandés") (FR25)

## Tasks / Subtasks

- [x] Task 1 : Générer les candidats Lieutenants depuis les données SERP existantes (AC: #1)
  - [x]1.1 Créer un computed `lieutenantCandidates` dans LieutenantsSelection qui fusionne 3 sources : (a) headings H2 récurrents (depuis hnRecurrence ≥ 2 occurrences), (b) questions PAA (depuis serpResult.paaQuestions), (c) mots-clés des groupes (depuis prop wordGroups)
  - [x]1.2 Pour chaque candidat, attribuer les badges de provenance : [SERP] si issu de hnRecurrence, [PAA] si issu des PAA, [Groupe] si issu des wordGroups. Un candidat peut avoir plusieurs badges s'il apparaît dans plusieurs sources
  - [x]1.3 Calculer un badge de pertinence (Fort/Moyen/Faible) basé sur : nombre de sources (3=Fort, 2=Moyen, 1=Faible) — logique simple, la complémentarité avec le Capitaine est implicite via les données SERP

- [x] Task 2 : Créer le type `LieutenantCandidate` dans les types partagés (AC: #1)
  - [x]2.1 Ajouter l'interface `LieutenantCandidate` dans `shared/types/serp-analysis.types.ts` : `{ text: string, sources: ('serp' | 'paa' | 'group')[], relevance: 'fort' | 'moyen' | 'faible', selected: boolean }`

- [x] Task 3 : Ajouter la section de sélection checkbox avec compteur (AC: #2, #3, #4)
  - [x]3.1 Ajouter une 4ème CollapsableSection "Candidats Lieutenants" (default-open=true) APRÈS les 3 sections existantes
  - [x]3.2 En en-tête de la section, afficher le compteur recommandé basé sur `articleLevel` : Pilier → "5-8 recommandés", Intermédiaire → "3-5 recommandés", Spécifique → "1-3 recommandés"
  - [x]3.3 Chaque candidat est un row cliquable avec : checkbox, texte du candidat, badges de provenance ([SERP] [PAA] [Groupe]), badge de pertinence (Fort/Moyen/Faible)
  - [x]3.4 Le compteur se met à jour en temps réel : "X sélectionnés / Y-Z recommandés"
  - [x]3.5 Utiliser un `ref<Set<string>>` pour tracker les sélections (pattern existant dans DiscoveryPanel.vue)

- [x] Task 4 : Émettre les Lieutenants sélectionnés (AC: #4)
  - [x]4.1 Ajouter un emit `lieutenants-updated` avec la liste des textes sélectionnés
  - [x]4.2 Émettre à chaque changement de sélection (coche/décoche)

- [x] Task 5 : Écrire les tests (AC: #1-#4)
  - [x]5.1 Tests computed `lieutenantCandidates` : fusion des 3 sources, déduplication, badges de provenance multi-source, badge de pertinence
  - [x]5.2 Tests compteur recommandé : "5-8" pour Pilier, "3-5" pour Intermédiaire, "1-3" pour Spécifique
  - [x]5.3 Tests sélection checkbox : coche/décoche met à jour le compteur, le set de sélection, et émet l'événement
  - [x]5.4 Tests badges : chaque candidat affiche les bons badges de provenance et pertinence
  - [x]5.5 Tests section vide : message si aucun candidat (pas de données SERP)

## Dev Notes

### Architecture — Génération des candidats (côté frontend)

Les candidats Lieutenants sont générés **côté client** à partir de 3 sources déjà disponibles dans le composant :

1. **hnRecurrence** (déjà computed dans le composant) — les H2/H3 récurrents extraits des concurrents SERP
2. **serpResult.paaQuestions** — les questions PAA retournées par DataForSEO
3. **wordGroups** (prop passée depuis MoteurView) — les groupes de mots-clés de la Phase Cerveau

**Aucune nouvelle route API** n'est nécessaire. Tout se fait en frontend.

```typescript
// Pattern de génération des candidats :
interface LieutenantCandidate {
  text: string
  sources: ('serp' | 'paa' | 'group')[]
  relevance: 'fort' | 'moyen' | 'faible'
}

const lieutenantCandidates = computed<LieutenantCandidate[]>(() => {
  if (!serpResult.value) return []

  // Map : normalized text → candidate
  const candidateMap = new Map<string, LieutenantCandidate>()

  // Source 1 : H2/H3 récurrents (≥ 2 occurrences)
  for (const item of hnRecurrence.value) {
    if (item.count < 2) continue
    const key = item.text.toLowerCase().trim()
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('serp')) existing.sources.push('serp')
    } else {
      candidateMap.set(key, { text: item.text, sources: ['serp'], relevance: 'faible' })
    }
  }

  // Source 2 : PAA questions
  for (const paa of serpResult.value.paaQuestions) {
    const key = paa.question.toLowerCase().trim()
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('paa')) existing.sources.push('paa')
    } else {
      candidateMap.set(key, { text: paa.question, sources: ['paa'], relevance: 'faible' })
    }
  }

  // Source 3 : WordGroups
  for (const g of props.wordGroups) {
    const key = g.word.toLowerCase().trim()
    const existing = candidateMap.get(key)
    if (existing) {
      if (!existing.sources.includes('group')) existing.sources.push('group')
    } else {
      candidateMap.set(key, { text: g.word, sources: ['group'], relevance: 'faible' })
    }
  }

  // Calcul pertinence basée sur le nombre de sources
  const candidates = Array.from(candidateMap.values())
  for (const c of candidates) {
    c.relevance = c.sources.length >= 3 ? 'fort' : c.sources.length === 2 ? 'moyen' : 'faible'
  }

  // Tri : Fort d'abord, puis Moyen, puis Faible
  const order = { fort: 0, moyen: 1, faible: 2 }
  return candidates.sort((a, b) => order[a.relevance] - order[b.relevance])
})
```

### Architecture — Compteur recommandé par niveau

```typescript
const RECOMMENDED_COUNTS: Record<string, { min: number; max: number }> = {
  pilier: { min: 5, max: 8 },
  intermediaire: { min: 3, max: 5 },
  specifique: { min: 1, max: 3 },
}

const recommendedRange = computed(() => {
  const level = props.articleLevel ?? 'intermediaire'
  return RECOMMENDED_COUNTS[level] ?? RECOMMENDED_COUNTS.intermediaire
})
```

### Architecture — Sélection checkbox (pattern existant)

Réutiliser le pattern `Set<string>` + `toggleSelect` déjà utilisé dans `DiscoveryPanel.vue` :

```typescript
const selectedLieutenants = ref<Set<string>>(new Set())

function toggleLieutenant(text: string) {
  const next = new Set(selectedLieutenants.value)
  if (next.has(text)) {
    next.delete(text)
  } else {
    next.add(text)
  }
  selectedLieutenants.value = next
  emit('lieutenants-updated', Array.from(next))
}
```

**IMPORTANT** : Créer un nouveau `Set` à chaque modification pour que Vue détecte le changement de réactivité.

### Architecture — Badges visuels

Suivre le pattern de badges existant dans `DiscoveryPanel.vue` :

```css
/* Badge de provenance — petit tag coloré */
.badge-source {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.badge-serp { background: var(--color-badge-blue-bg, #dbeafe); color: var(--color-primary); }
.badge-paa { background: var(--color-badge-amber-bg, #fef3c7); color: #b45309; }
.badge-group { background: var(--color-badge-green-bg, #dcfce7); color: #15803d; }

/* Badge de pertinence */
.badge-relevance-fort { background: var(--color-success, #22c55e); color: white; }
.badge-relevance-moyen { background: var(--color-warning, #f59e0b); color: white; }
.badge-relevance-faible { background: var(--color-border); color: var(--color-text-muted); }
```

### Architecture — Composant LieutenantsSelection (extension)

Le composant `LieutenantsSelection.vue` est ÉTENDU (pas recréé). Ajouter la 4ème CollapsableSection dans le `<div v-if="serpResult" class="serp-results">` existant, APRÈS les 3 sections de Story 7.2.

**Structure template mise à jour :**

```html
<div v-if="serpResult" class="serp-results">
  <!-- Summary existant -->
  <div class="results-summary">...</div>

  <!-- 3 sections Story 7.2 (conserver) -->
  <CollapsableSection title="Structure Hn concurrents" :default-open="true">...</CollapsableSection>
  <CollapsableSection title="PAA associés" :default-open="false">...</CollapsableSection>
  <CollapsableSection title="Groupes de mots-clés" :default-open="false">...</CollapsableSection>

  <!-- NOUVELLE section Story 7.3 -->
  <CollapsableSection title="Candidats Lieutenants" :default-open="true">
    <div class="lieutenant-counter">
      {{ selectedLieutenants.size }} sélectionné{{ selectedLieutenants.size > 1 ? 's' : '' }}
      / {{ recommendedRange.min }}-{{ recommendedRange.max }} recommandés
    </div>
    <div v-if="lieutenantCandidates.length > 0" class="lieutenant-list">
      <div
        v-for="candidate in lieutenantCandidates"
        :key="candidate.text"
        class="lieutenant-row"
        :class="{ selected: selectedLieutenants.has(candidate.text) }"
        @click="toggleLieutenant(candidate.text)"
      >
        <input type="checkbox" :checked="selectedLieutenants.has(candidate.text)" @click.stop="toggleLieutenant(candidate.text)" />
        <span class="lieutenant-text">{{ candidate.text }}</span>
        <span v-for="s in candidate.sources" :key="s" :class="'badge-source badge-' + s">{{ s.toUpperCase() }}</span>
        <span :class="'badge-relevance badge-relevance-' + candidate.relevance">{{ candidate.relevance }}</span>
      </div>
    </div>
    <p v-else class="section-empty">Aucun candidat identifié. Lancez l'analyse SERP.</p>
  </CollapsableSection>
</div>
```

### Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `shared/types/serp-analysis.types.ts` | **MODIFIER** | Ajouter interface `LieutenantCandidate` |
| `src/components/moteur/LieutenantsSelection.vue` | **MODIFIER** | Ajouter computed `lieutenantCandidates`, sélection checkbox, compteur, badges, emit `lieutenants-updated` |
| `tests/unit/components/lieutenants-selection.test.ts` | **MODIFIER** | Ajouter tests candidats, badges, sélection, compteur |

### Anti-patterns à éviter

- **NE PAS** créer une nouvelle route API pour les candidats — tout se calcule côté client
- **NE PAS** recréer LieutenantsSelection — l'ÉTENDRE avec la 4ème section
- **NE PAS** supprimer les 3 sections de Story 7.2 — les conserver telles quelles
- **NE PAS** utiliser un tableau `boolean[]` pour les sélections — utiliser `Set<string>` (pattern existant DiscoveryPanel)
- **NE PAS** modifier directement le `Set` en place — créer un nouveau `Set` à chaque mutation pour la réactivité Vue
- **NE PAS** stocker les candidats dans un store Pinia — c'est un calcul local au composant
- **NE PAS** ajouter de logique NLP complexe pour la pertinence — le nombre de sources suffit (Fort/Moyen/Faible)
- **NE PAS** oublier le reset des sélections quand l'article change (watcher existant ligne 79-86)

### Testing Standards

- **Framework** : Vitest
- **Fichier existant** : `tests/unit/components/lieutenants-selection.test.ts` — AJOUTER de nouveaux tests (ne pas recréer)
- **Tests computed lieutenantCandidates** : mocker un serpResult + wordGroups, vérifier la fusion, les badges multi-source, le tri par pertinence
- **Tests compteur** : tester les 3 niveaux (pilier/intermediaire/specifique), vérifier le format "X / Y-Z recommandés"
- **Tests checkbox** : monter le composant, cliquer sur un candidat, vérifier le set et l'emit
- **Tests badges** : vérifier que chaque badge de provenance et pertinence est rendu avec la bonne classe CSS
- **NODE_OPTIONS** : `--max-old-space-size=4096` requis pour la suite complète

### Project Structure Notes

- `src/components/moteur/LieutenantsSelection.vue` — composant principal à étendre
- `shared/types/serp-analysis.types.ts` — types SERP existants, ajouter LieutenantCandidate
- `src/components/keywords/DiscoveryPanel.vue` — référence pour le pattern checkbox Set<string>
- `src/stores/article-keywords.store.ts` — stockage final des lieutenants (Story 7.4 — pas cette story)
- `src/views/MoteurView.vue` — parent, pas de modification nécessaire (props déjà passées)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 7.3 Candidats Lieutenants]
- [Source: _bmad-output/planning-artifacts/prd.md — FR24, FR25 lignes 275-277]
- [Source: _bmad-output/planning-artifacts/architecture.md — LieutenantsSelection boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md — Cascade SERP + badges pertinence]
- [Source: shared/types/serp-analysis.types.ts — SerpCompetitor, SerpAnalysisResult, HnNode]
- [Source: shared/types/keyword-validate.types.ts — ArticleLevel type]
- [Source: src/components/moteur/LieutenantsSelection.vue — Composant existant à étendre]
- [Source: src/components/keywords/DiscoveryPanel.vue — Pattern checkbox Set<string>]
- [Source: _bmad-output/implementation-artifacts/7-2-sections-depliables-hn-concurrents-paa-et-groupes.md — Story 7.2 learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 2: Added `LieutenantCandidate` interface to `shared/types/serp-analysis.types.ts` with `text`, `sources`, `relevance` fields.
- Task 1: Created `lieutenantCandidates` computed in LieutenantsSelection.vue — fuses 3 sources (hnRecurrence ≥2 count, PAA questions, wordGroups), deduplicates by normalized text key, assigns multi-source badges, computes relevance (fort=3 sources, moyen=2, faible=1), sorts by relevance descending.
- Task 3: Added 4th CollapsableSection "Candidats Lieutenants" (default-open=true) with counter showing "X selectionne(s) / Y-Z recommandes" based on articleLevel. Each candidate row is clickable with checkbox, text, provenance badges ([SERP] [PAA] [GROUP]), and relevance badge (fort/moyen/faible). Uses `ref<Set<string>>` for reactive selection tracking.
- Task 4: Added `lieutenants-updated` emit with `string[]` payload, fired on every toggle. Reset selection when article changes.
- Task 5: Added 30 new tests (43→73 total) covering: candidate generation (11 tests), badges (5 tests), recommended counter (4 tests), checkbox selection (8 tests), plus 2 additional collapsible section tests and 1 reset test.

### File List

- `shared/types/serp-analysis.types.ts` — MODIFIED (added LieutenantCandidate interface)
- `src/components/moteur/LieutenantsSelection.vue` — MODIFIED (added LieutenantCandidate import, lieutenants-updated emit, selectedLieutenants ref, RECOMMENDED_COUNTS, recommendedRange computed, lieutenantCandidates computed, toggleLieutenant function, 4th CollapsableSection, lieutenant CSS)
- `tests/unit/components/lieutenants-selection.test.ts` — MODIFIED (43→73 tests, new sections: Lieutenant candidates, Lieutenant badges, Recommended counter, Checkbox selection)
