> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 1.2: Phase ① Générer — Discovery, Douleur Intent, Douleur avec verrouillage

Status: done

## Story

As a consultant SEO,
I want les onglets Discovery, Douleur Intent et Douleur regroupés dans la Phase Générer avec verrouillage intelligent,
so that je sais quels outils utiliser pour trouver des mots-clés candidats et je ne perds pas de temps si j'ai déjà des mots-clés validés.

## Acceptance Criteria

1. **Given** un article est sélectionné et aucun mot-clé n'est encore validé **When** l'utilisateur ouvre la Phase ① Générer **Then** les onglets Discovery (FR6), Douleur Intent (FR7) et Douleur (FR8) sont tous accessibles **And** l'utilisateur peut lancer une analyse Discovery IA **And** l'utilisateur peut lancer un scan Douleur Intent (radar) **And** l'utilisateur peut traduire une douleur en mots-clés candidats.

2. **Given** un article est sélectionné et des mots-clés sont déjà validés pour cet article **When** l'utilisateur ouvre la Phase ① Générer **Then** les onglets Discovery et Douleur Intent affichent un état verrouillé avec un **message explicatif visible** (pas seulement un tooltip) **And** l'onglet Douleur reste accessible (traduction libre).

3. **Given** l'utilisateur lance Discovery IA **When** l'analyse se termine avec des résultats **Then** les mots-clés candidats sont affichés **And** les composants internes existants (KeywordDiscoveryTab, DouleurIntentScanner, PainTranslator) fonctionnent comme avant.

## Tasks / Subtasks

- [x] Task 1 : Ajouter un message explicatif visible quand Discovery/Douleur Intent sont verrouillés (AC: #2)
  - [x] 1.1 : Créer un bandeau/message dans MoteurView sous la navigation de phase quand `isDiscoveryAllowed === false` ET l'onglet actif est dans la Phase ① Générer (ou l'onglet actif est 'douleur')
  - [x] 1.2 : Le message affiche : "Les onglets Discovery et Douleur Intent sont verrouillés car des mots-clés sont déjà validés pour cet article." avec un lien vers l'onglet Audit
  - [x] 1.3 : Style CSS cohérent avec le design existant (warning banner avec `--color-warning`)
- [x] Task 2 : Tests unitaires de la Phase ① Générer (AC: #1, #2, #3)
  - [x] 2.1 : Test MoteurView : les 3 onglets de Phase ① sont accessibles quand keyword status = 'suggested'
  - [x] 2.2 : Test MoteurView : Discovery et Douleur Intent sont verrouillés quand keyword status = 'validated'
  - [x] 2.3 : Test MoteurView : le message explicatif de verrouillage s'affiche quand `isDiscoveryAllowed === false`
  - [x] 2.4 : Test MoteurView : le message de verrouillage ne s'affiche PAS quand `isDiscoveryAllowed === true`
  - [x] 2.5 : Test MoteurView : redirect de 'discovery' vers 'validation' quand on sélectionne un article validé
  - [x] 2.6 : Test cross-tab : handleSendToRadar navigue vers 'douleur-intent' et passe les keywords

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ (ne pas toucher) :**
- KeywordDiscoveryTab.vue — composant Discovery existant (multi-source + AI + cache)
- DouleurIntentScanner.vue — composant Radar existant (PAA + autocomplete scan + heat scoring)
- PainTranslator.vue — composant Douleur existant (pain → keywords translation)
- MoteurPhaseNavigation.vue — composant de navigation 3 phases (créé en Story 1.1)
- Le mécanisme de locking dans MoteurView (`isDiscoveryAllowed` computed) — déjà implémenté en Story 1.1

**MODIFIÉ :**
- `src/views/MoteurView.vue` — ajout d'un bandeau/message explicatif pour le verrouillage

**CRÉÉ :**
- `tests/unit/components/moteur-phase-generer.test.ts` — tests de la Phase ① Générer

### État actuel du verrouillage (implémenté en Story 1.1)

Le verrouillage Discovery/Douleur Intent est DÉJÀ en place dans MoteurView.vue :

```typescript
// Locking mechanism - ALREADY EXISTS
const isDiscoveryAllowed = computed(() => {
  if (!selectedArticle.value) return true
  const articleKw = selectedArticle.value.keyword
  if (!articleKw) return true
  const kw = keywordsStore.keywords.find(
    k => k.keyword.toLowerCase() === articleKw.toLowerCase(),
  )
  return !kw || kw.status === 'suggested'
})
```

Ce qui manque : un **message visible** dans le contenu de la phase quand le verrouillage est actif. Actuellement seuls les indicateurs visuels dans la navigation (opacity + 🔒 + tooltip) signalent le verrouillage.

### Composants existants — props et émissions à connaître

**KeywordDiscoveryTab.vue** (Phase ①) :
- Props : `pilierKeyword, articleTitle, articleKeyword, articlePainPoint, articleType, cocoonName, cocoonTheme`
- Émet : `send-to-radar(RadarKeyword[])` → déclenche `handleSendToRadar` qui navigue vers 'douleur-intent'

**DouleurIntentScanner.vue** (Phase ①) :
- Props : `pilierKeyword, articleTopic, articleKeyword, articlePainPoint, injectedKeywords`
- Émet : `scanned({globalScore, heatLevel})`, `keywords-cleared()`

**PainTranslator.vue** (Phase ①) :
- Props : `initialPainText, suggestedKeyword`
- Émet : `explore(keyword)`, `translated(TranslatedKeyword[])`

### Cross-tab communication dans Phase ① (déjà implémenté)

```
Discovery → "Envoyer au Radar" → handleSendToRadar(keywords)
  → discoveryRadarKeywords.value = keywords
  → activeTab.value = 'douleur-intent'

DouleurIntentScanner → scan terminé → handleRadarScanned({globalScore, heatLevel})
  → radarScanResult.value = payload

PainTranslator → "Valider" → handleTranslated(keywords)
  → translatedKeywords.value = keywords
```

### Pattern du message de verrouillage recommandé

```html
<!-- Dans MoteurView.vue, après MoteurPhaseNavigation et avant le tab content -->
<div
  v-if="selectedArticle && !isDiscoveryAllowed && isInGenererPhase"
  class="lock-banner"
>
  <p>Les onglets Discovery et Douleur Intent sont verrouillés car des mots-clés
  sont déjà validés pour cet article.</p>
  <button @click="activeTab = 'audit'">Voir l'Audit →</button>
</div>
```

### Convention CSS

Réutiliser les variables CSS existantes du design system :
- `--color-block-info-bg` / `--color-block-info-border` pour le bandeau info
- `--color-primary` pour le lien/bouton vers l'Audit
- `--color-text-muted` pour le texte explicatif

### Enforcement Guidelines

- Utiliser composition API (pas d'options API)
- Pas de `console.log` — utiliser le logger si besoin
- Tests dans `tests/unit/components/`
- Pas de gating dur — le message est informatif, la navigation reste libre

### Risques identifiés

1. Les tests MoteurView nécessitent beaucoup de mocks (vue-router, Pinia stores, etc.) — utiliser `createTestingPinia()` avec initialState
2. Ne pas modifier les composants internes (Discovery, Radar, PainTranslator) — ils fonctionnent déjà
3. Le message de verrouillage ne doit s'afficher que quand l'article est sélectionné ET les mots-clés sont validés — double condition

### Project Structure Notes

- Fichier modifié : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/components/moteur-phase-generer.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/implementation-artifacts/1-1-layout-3-phases-navigation-et-selection-article.md] — Story précédente

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Added lock banner in MoteurView.vue: visible warning message when Discovery/Douleur Intent are locked (article has validated keywords), with "Voir l'Audit →" button
- Added `isInGenererPhase` computed to control banner visibility (only shows in Phase ① tabs)
- 22 new unit tests: locking logic (7), navigation with unlocked tabs (2), navigation with locked tabs (4), lock banner visibility (5), cross-tab communication (1), redirect on article selection (3)
- TypeScript check passes (vue-tsc --noEmit)
- Vite build passes
- No regressions: 1065 tests pass (8 pre-existing failures in unrelated tests)

### File List

- src/views/MoteurView.vue (MODIFIED — added lock banner, isInGenererPhase computed, lock-banner CSS)
- tests/unit/components/moteur-phase-generer.test.ts (NEW — 22 tests)
