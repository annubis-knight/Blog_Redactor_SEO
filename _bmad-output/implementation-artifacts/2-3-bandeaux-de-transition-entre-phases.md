# Story 2.3: Bandeaux de transition entre phases

Status: done

## Story

As a consultant SEO,
I want un bandeau de suggestion quand tous les checks d'une phase sont complétés,
so that je sais quand passer à la phase suivante sans être bloqué si je veux rester.

## Acceptance Criteria

1. **Given** l'article en cours a tous les checks de la Phase ① Générer complétés (`discovery_done` + `radar_done`) **When** l'utilisateur est dans la Phase ① Générer **Then** un bandeau PhaseTransitionBanner s'affiche : "Phase Générer complète — passer à Valider ?" **And** le bandeau contient un bouton pour naviguer vers la Phase ② Valider.

2. **Given** l'article en cours a tous les checks de la Phase ② Valider complétés (`intent_done` + `audit_done` + `local_done`) **When** l'utilisateur est dans la Phase ② Valider **Then** un bandeau s'affiche : "Phase Valider complète — passer à Assigner ?"

3. **Given** un bandeau de transition est affiché **When** l'utilisateur clique sur le bouton de navigation **Then** il est redirigé vers la phase suivante.

4. **Given** un bandeau de transition est affiché **When** l'utilisateur l'ignore et continue à travailler dans la phase actuelle **Then** le bandeau reste visible mais ne bloque rien **And** l'utilisateur peut fermer/réduire le bandeau.

## Tasks / Subtasks

- [x] Task 1 : Créer le composant PhaseTransitionBanner.vue (AC: #1, #2, #3, #4)
  - [x] 1.1 : Créer `src/components/moteur/PhaseTransitionBanner.vue` avec props `message: string`, `actionLabel: string`
  - [x] 1.2 : Afficher un bandeau avec message + bouton d'action
  - [x] 1.3 : Ajouter un bouton de fermeture (dismiss) — emit `dismiss` + emit `navigate` au clic action
  - [x] 1.4 : Style cohérent avec le design system (variables CSS existantes, pas de fond trop agressif)
- [x] Task 2 : Intégrer PhaseTransitionBanner dans MoteurView (AC: #1, #2, #3, #4)
  - [x] 2.1 : Ajouter un computed `currentPhaseId` qui détermine la phase active depuis `activeTab`
  - [x] 2.2 : Ajouter un computed `phaseComplete` basé sur `articleProgressStore.getProgress(slug).completedChecks` et le mapping des checks par phase
  - [x] 2.3 : Ajouter un ref `bannerDismissed` (réinitialisé quand `currentPhaseId` change ou quand l'article change)
  - [x] 2.4 : Rendre le PhaseTransitionBanner dans le template entre MoteurPhaseNavigation et le contenu des onglets, visible uniquement si : phase complète + pas dismissed + pas la dernière phase (assigner)
  - [x] 2.5 : Câbler `@navigate` pour appeler `setActiveTab()` avec le premier onglet de la phase suivante
  - [x] 2.6 : Câbler `@dismiss` pour mettre `bannerDismissed = true`
- [x] Task 3 : Tests unitaires (AC: #1-4)
  - [x] 3.1 : Test PhaseTransitionBanner rend le message et le bouton d'action
  - [x] 3.2 : Test PhaseTransitionBanner émet `navigate` au clic du bouton d'action
  - [x] 3.3 : Test PhaseTransitionBanner émet `dismiss` au clic du bouton de fermeture
  - [x] 3.4 : Test computed `phaseComplete` retourne true quand tous les checks de la phase sont complétés
  - [x] 3.5 : Test computed `phaseComplete` retourne false quand des checks manquent
  - [x] 3.6 : Test le bandeau n'apparaît PAS quand la phase n'est pas complète
  - [x] 3.7 : Test le bandeau n'apparaît PAS pour la Phase ③ Assigner (dernière phase)
  - [x] 3.8 : Test `bannerDismissed` est reset quand la phase change
  - [x] 3.9 : Test `bannerDismissed` est reset quand l'article change

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `article-progress.store.ts` — store Pinia (progressMap, fetchProgress, getProgress, addCheck)
- `article-progress.service.ts` — service backend
- `ProgressDots.vue` — dots de progression (Story 2.1)
- `MoteurContextRecap.vue` — intégration ProgressDots (Story 2.1)
- `MoteurPhaseNavigation.vue` — navigation entre phases
- Tous les composants enfants des onglets — aucune modification
- Les handlers `emitCheckCompleted` ajoutés en Story 2.2

**MODIFIÉ :**
- `src/views/MoteurView.vue` — ajout import PhaseTransitionBanner, computed `currentPhaseId` et `phaseComplete`, ref `bannerDismissed`, intégration dans le template

**CRÉÉ :**
- `src/components/moteur/PhaseTransitionBanner.vue` — composant bandeau de transition
- `tests/unit/components/phase-transition-banner.test.ts` — tests

### Détail d'implémentation

#### PhaseTransitionBanner.vue — composant simple

```typescript
// Props
const props = defineProps<{
  message: string       // Ex: "Phase Générer complète — passer à Valider ?"
  actionLabel: string   // Ex: "Passer à Valider"
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
  (e: 'dismiss'): void
}>()
```

Template : bandeau horizontal avec message à gauche, bouton action à droite, bouton fermeture (×).
Style : fond `var(--color-primary-soft)`, bordure `var(--color-primary)`, texte `var(--color-text)`, bouton primaire.

#### Intégration dans MoteurView.vue

**Mapping checks → phases (réutiliser le même mapping que ProgressDots) :**

```typescript
const PHASE_CHECKS: Record<string, string[]> = {
  generer: ['discovery_done', 'radar_done'],
  valider: ['intent_done', 'audit_done', 'local_done'],
  assigner: ['captain_chosen', 'assignment_done'],
}

const PHASE_NEXT: Record<string, { phaseLabel: string; firstTab: Tab }> = {
  generer: { phaseLabel: 'Valider', firstTab: 'validation' },
  valider: { phaseLabel: 'Assigner', firstTab: 'assignation' },
}
```

**Computed pour déterminer la phase active :**

```typescript
const currentPhaseId = computed(() => {
  const genererTabs = ['discovery', 'douleur-intent', 'douleur']
  const validerTabs = ['validation', 'exploration', 'audit', 'local']
  if (genererTabs.includes(activeTab.value)) return 'generer'
  if (validerTabs.includes(activeTab.value)) return 'valider'
  return 'assigner'
})
```

**Computed pour savoir si la phase est complète :**

```typescript
const isCurrentPhaseComplete = computed(() => {
  const slug = selectedArticle.value?.slug
  if (!slug) return false
  const checks = articleProgressStore.getProgress(slug)?.completedChecks ?? []
  const requiredChecks = PHASE_CHECKS[currentPhaseId.value]
  if (!requiredChecks) return false
  return requiredChecks.every(c => checks.includes(c))
})
```

**Ref dismissed avec reset automatique :**

```typescript
const bannerDismissed = ref(false)

// Reset quand la phase change
watch(currentPhaseId, () => { bannerDismissed.value = false })

// Reset quand l'article change (déjà géré si handleSelectArticle reset)
watch(() => selectedArticle.value?.slug, () => { bannerDismissed.value = false })
```

**Computed pour le message et le label :**

```typescript
const transitionBanner = computed(() => {
  const next = PHASE_NEXT[currentPhaseId.value]
  if (!next) return null  // Phase assigner → pas de bandeau
  return {
    message: `Phase ${phases.value.find(p => p.id === currentPhaseId.value)?.label} complète — passer à ${next.phaseLabel} ?`,
    actionLabel: `Passer à ${next.phaseLabel}`,
    firstTab: next.firstTab,
  }
})

const showTransitionBanner = computed(() =>
  isCurrentPhaseComplete.value && !bannerDismissed.value && transitionBanner.value !== null
)
```

**Template — entre MoteurPhaseNavigation et le contenu :**

```html
<PhaseTransitionBanner
  v-if="showTransitionBanner"
  :message="transitionBanner!.message"
  :action-label="transitionBanner!.actionLabel"
  @navigate="setActiveTab(transitionBanner!.firstTab)"
  @dismiss="bannerDismissed = true"
/>
```

### Mapping des checks par phase (rappel)

| Phase | Checks | Tabs |
|-------|--------|------|
| ① Générer | `discovery_done`, `radar_done` | discovery, douleur-intent, douleur |
| ② Valider | `intent_done`, `audit_done`, `local_done` | validation, exploration, audit, local |
| ③ Assigner | `captain_chosen`, `assignment_done` | assignation |

### Enforcement Guidelines

- Utiliser composition API
- Pas de `console.log` — utiliser le logger si nécessaire
- Tests dans `tests/unit/components/`
- Variables CSS du design system (`--color-primary-soft`, `--color-primary`, `--color-text`, `--color-border`)
- **Ne PAS modifier les composants enfants** — PhaseTransitionBanner est un composant autonome
- **Ne PAS modifier MoteurPhaseNavigation** — le bandeau se place entre la navigation et le contenu
- Pattern `vi.spyOn(store, 'action').mockResolvedValue()` pour tester les stores Pinia (leçon Story 2.2)

### Risques identifiés

1. **Le bandeau ne doit PAS apparaître pour la Phase ③ Assigner** — pas de phase suivante. Le guard `PHASE_NEXT[currentPhaseId.value]` gère ce cas (retourne undefined).
2. **Reset du dismiss quand l'utilisateur change de phase manuellement** — le watch sur `currentPhaseId` suffit.
3. **Le bandeau apparaît même si l'utilisateur a déjà navigué vers la phase suivante puis revient** — acceptable, le dismiss est local à la session.

### Project Structure Notes

- Nouveau composant : `src/components/moteur/PhaseTransitionBanner.vue`
- Vue modifiée : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/components/phase-transition-banner.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Progression & guidage]
- [Source: src/views/MoteurView.vue — phases computed, activeTab, setActiveTab]
- [Source: src/stores/article-progress.store.ts — getProgress, completedChecks]
- [Source: src/components/moteur/ProgressDots.vue — PHASE_GROUPS check mapping]
- [Source: _bmad-output/implementation-artifacts/2-2-checks-automatiques-via-emit-check-completed.md] — Story précédente

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Created `PhaseTransitionBanner.vue` — simple component with `message`/`actionLabel` props, emits `navigate` and `dismiss`, uses design system CSS variables (`--color-block-info-bg`, `--color-primary`), has `role="status"` for accessibility
- Task 2: Integrated into MoteurView — added `watch` import, `PHASE_CHECKS`/`PHASE_NEXT` mapping constants, `currentPhaseId` computed (tab→phase mapping), `isCurrentPhaseComplete` computed (checks progress store), `bannerDismissed` ref with auto-reset watches on phase and article changes, `transitionBanner` computed (message/label/firstTab), `showTransitionBanner` guard computed. Template placed between lock-banner and tab content.
- Task 3: 15 tests — 3 rendering (message, dismiss button, accessibility), 2 events (navigate, dismiss), 4 phaseComplete logic (complete Phase ①, incomplete Phase ①, complete Phase ②, no article), 4 banner visibility (shows on complete, hidden for Phase ③, hidden when incomplete, hidden when dismissed), 2 bannerDismissed reset tests
- Build validation: vue-tsc PASS, vite build PASS, 15/15 new tests pass, 2 pre-existing failures (navigation-restructuring, production-phases) unrelated to this story

### File List

- `src/components/moteur/PhaseTransitionBanner.vue` — NEW
- `src/views/MoteurView.vue` — MODIFIED (import, watch, computed properties, template banner)
- `tests/unit/components/phase-transition-banner.test.ts` — NEW (15 tests)
