# Story 10.2: Bandeaux de transition adaptes au nouveau workflow

Status: done

## Story

As a consultant SEO,
I want des bandeaux de suggestion quand tous les checks d'une phase sont completes,
So that je sais quand passer a la phase suivante sans etre bloque.

## Acceptance Criteria

1. **Given** l'article en cours a les checks `discovery_done` + `radar_done` completes **When** l'utilisateur est dans la Phase ① Generer **Then** un bandeau PhaseTransitionBanner s'affiche : "Phase Generer complete — passer a Valider ?" (FR42) **And** un bouton "Passer a Valider" est present

2. **Given** l'article en cours a les checks `capitaine_locked` + `lieutenants_locked` + `lexique_validated` completes **When** l'utilisateur est dans la Phase ② Valider **Then** un bandeau s'affiche : "Validation complete — tous les mots-cles sont prets pour la redaction !" (FR42) **And** PAS de bouton de navigation (derniere phase)

3. **Given** un bandeau de transition ou de completion est affiche **When** l'utilisateur l'ignore **Then** le bandeau reste visible mais ne bloque rien (FR43) **And** l'utilisateur peut fermer/reduire le bandeau via le bouton dismiss

## Tasks / Subtasks

- [x] Task 1 : Modifier PhaseTransitionBanner.vue — rendre actionLabel optionnel (AC: #2, #3)
  - [x] 1.1 Rendre la prop `actionLabel` optionnelle (`actionLabel?: string`)
  - [x] 1.2 Conditionner le rendu du bouton `.phase-transition-btn` a `actionLabel` truthy (v-if="actionLabel")
  - [x] 1.3 Verifier que le bouton dismiss reste toujours visible

- [x] Task 2 : Modifier MoteurView.vue — ajouter bandeau de completion Phase ② (AC: #1, #2)
  - [x] 2.1 Modifier `transitionBanner` computed : quand `currentPhaseId === 'valider'` et `isCurrentPhaseComplete === true`, retourner `{ message: 'Validation complete — tous les mots-cles sont prets pour la redaction !', actionLabel: undefined, firstTab: undefined }`
  - [x] 2.2 Modifier la condition `showTransitionBanner` : retirer la condition `transitionBanner.value !== null` puisque le bandeau de completion a aussi un transitionBanner (ou bien modifier la logique pour distinguer transition vs completion)
  - [x] 2.3 Approche recommandee : supprimer la verification `PHASE_NEXT` dans `transitionBanner` et utiliser une logique unifiee qui retourne un message different selon qu'il y a un `PHASE_NEXT` ou non

- [x] Task 3 : Mettre a jour les tests phase-transition-banner.test.ts (AC: #1, #2, #3)
  - [x] 3.1 Ajouter test PhaseTransitionBanner "does NOT render action button when actionLabel is absent"
  - [x] 3.2 Ajouter test PhaseTransitionBanner "renders dismiss button even without actionLabel"
  - [x] 3.3 Modifier test integration "does NOT show banner for Phase ② Valider" → "shows completion banner for Phase ② Valider"
  - [x] 3.4 Ajouter test integration "completion banner message matches FR42 text" (merged into 3.3)
  - [x] 3.5 Ajouter test integration "completion banner has no actionLabel (no navigate button)" (merged into 3.3)
  - [x] 3.6 Ajouter test integration "completion banner can be dismissed"

- [x] Task 4 : Run full test suite — zero regressions (AC: #1, #2, #3)
  - [x] 4.1 Executer `vitest run` — tous les tests passent
  - [x] 4.2 Confirmer le total de tests : 1644 tests / 110 fichiers (+3 tests)

## Dev Notes

### IMPORTANT : Etat actuel du code — ce qui FONCTIONNE DEJA

| Element | Statut actuel | Action requise |
|---------|--------------|----------------|
| `src/views/MoteurView.vue` `PHASE_CHECKS` | **DEJA A JOUR** — generer: 2 checks, valider: 3 checks | Verifier seulement |
| `src/views/MoteurView.vue` `PHASE_NEXT` | **PARTIEL** — seulement `generer → Valider` | **MODIFIER** — ajouter logique completion |
| `src/views/MoteurView.vue` `transitionBanner` | **PARTIEL** — retourne `null` pour Phase ② | **MODIFIER** — retourner completion banner |
| `src/views/MoteurView.vue` `showTransitionBanner` | **PARTIEL** — exige `transitionBanner !== null` | **MODIFIER** — autoriser completion banner |
| `src/components/moteur/PhaseTransitionBanner.vue` | **PARTIEL** — `actionLabel` est requis | **MODIFIER** — rendre optionnel |
| `tests/unit/components/phase-transition-banner.test.ts` | **PARTIEL** — teste que Phase ② n'a PAS de banner | **MODIFIER** — tester completion banner |

### Architecture actuelle du bandeau dans MoteurView.vue (AVANT modification)

```typescript
// Ligne 160-163
const PHASE_CHECKS: Record<string, string[]> = {
  generer: ['discovery_done', 'radar_done'],
  valider: ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'],
}

// Ligne 165-167 — SEUL generer a un PHASE_NEXT
const PHASE_NEXT: Record<string, { phaseLabel: string; firstTab: Tab }> = {
  generer: { phaseLabel: 'Valider', firstTab: 'capitaine' },
}

// Ligne 189-198 — transitionBanner retourne null quand pas de PHASE_NEXT
const transitionBanner = computed(() => {
  const next = PHASE_NEXT[currentPhaseId.value]
  if (!next) return null  // ← ICI : Phase ② retourne null → pas de banner
  const phase = phases.value.find(p => p.id === currentPhaseId.value)
  return {
    message: `Phase ${phase?.label ?? currentPhaseId.value} complète — passer à ${next.phaseLabel} ?`,
    actionLabel: `Passer à ${next.phaseLabel}`,
    firstTab: next.firstTab,
  }
})

// Ligne 200-202 — showTransitionBanner exige transitionBanner !== null
const showTransitionBanner = computed(() =>
  isCurrentPhaseComplete.value && !bannerDismissed.value && transitionBanner.value !== null,
)
```

### Architecture cible du bandeau dans MoteurView.vue (APRES modification)

```typescript
// PHASE_CHECKS inchange
// PHASE_NEXT inchange

// transitionBanner modifie — gere transition ET completion
const transitionBanner = computed(() => {
  if (!isCurrentPhaseComplete.value) return null

  const next = PHASE_NEXT[currentPhaseId.value]
  if (next) {
    // Transition banner (Phase ① → Phase ②)
    const phase = phases.value.find(p => p.id === currentPhaseId.value)
    return {
      message: `Phase ${phase?.label ?? currentPhaseId.value} complète — passer à ${next.phaseLabel} ?`,
      actionLabel: `Passer à ${next.phaseLabel}`,
      firstTab: next.firstTab,
    }
  }

  // Completion banner (Phase ② — derniere phase)
  return {
    message: 'Validation complète — tous les mots-clés sont prêts pour la rédaction !',
    actionLabel: undefined,
    firstTab: undefined,
  }
})

// showTransitionBanner simplifie — transitionBanner gere deja isCurrentPhaseComplete
const showTransitionBanner = computed(() =>
  transitionBanner.value !== null && !bannerDismissed.value,
)
```

### PhaseTransitionBanner.vue — modification actionLabel

```typescript
// AVANT
defineProps<{
  message: string
  actionLabel: string  // requis
}>()

// APRES
defineProps<{
  message: string
  actionLabel?: string  // optionnel
}>()

// Template : ajouter v-if sur le bouton
<button v-if="actionLabel" class="phase-transition-btn" @click="emit('navigate')">
  {{ actionLabel }} &rarr;
</button>
```

### Tests existants a modifier (phase-transition-banner.test.ts)

Le fichier `tests/unit/components/phase-transition-banner.test.ts` contient :
- **Lignes 16-49** : Tests composant PhaseTransitionBanner (rendering, events) — ajouter tests pour actionLabel optionnel
- **Lignes 79-86** : `PHASE_NEXT` avec seulement `generer` — PAS de modification (c'est la logique actuelle du test harness)
- **Lignes 116-128** : `transitionBanner` computed dans le harness — **MODIFIER** pour gerer completion
- **Lignes 171-179** : Test "does NOT show banner for Phase ② Valider" — **MODIFIER** → "shows completion banner"

### Anti-patterns a eviter

- **NE PAS** creer un nouveau composant pour le bandeau de completion — reutiliser PhaseTransitionBanner avec `actionLabel` optionnel
- **NE PAS** ajouter de nouveaux emits a PhaseTransitionBanner — `navigate` et `dismiss` suffisent
- **NE PAS** toucher a `PHASE_CHECKS` — deja a jour depuis Story 10.1
- **NE PAS** modifier ProgressDots.vue — pas concerne par cette story
- **NE PAS** modifier le backend — pas de changement serveur

### Previous Story Intelligence (Story 10.1)

**Learnings from Story 10.1:**
- Le code review a identifie un bug dans `aria-label` (completedChecks.length comptait les anciens checks) — toujours verifier la coherence des computed
- ProgressDots migration complete : 5 checks, 2 groupes (Generer/Valider)
- Total tests apres 10.1 : 1641 tests / 110 fichiers
- Les tests du harness `createBannerHarness` dans phase-transition-banner.test.ts repliquent la logique de MoteurView — quand on modifie MoteurView, il FAUT aussi mettre a jour le harness

### Fichiers impactes

| Fichier | Action | Raison |
|---|---|---|
| `src/components/moteur/PhaseTransitionBanner.vue` | **MODIFIER** | Rendre `actionLabel` optionnel, v-if sur le bouton |
| `src/views/MoteurView.vue` | **MODIFIER** | Etendre `transitionBanner` pour gerer completion Phase ② |
| `tests/unit/components/phase-transition-banner.test.ts` | **MODIFIER** | Ajouter tests completion, modifier "no banner Phase ②" |

### Project Structure Notes

- `src/components/moteur/PhaseTransitionBanner.vue` — Composant de bandeau de transition entre phases (generic)
- `src/views/MoteurView.vue` — Vue principale du Moteur, contient la logique `transitionBanner` (lignes 159-202)
- `tests/unit/components/phase-transition-banner.test.ts` — Tests composant + integration logic (22 tests)
- La logique de transition est dans MoteurView, pas dans le composant banner (separation presentation/logique)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 10, Story 10.2, lignes 992-1011]
- [Source: _bmad-output/planning-artifacts/prd.md — FR42: bandeau suggestion phase complete, FR43: ignorer bandeau sans blocage]
- [Source: src/views/MoteurView.vue:159-202 — Logique transitionBanner actuelle]
- [Source: src/components/moteur/PhaseTransitionBanner.vue — Composant a modifier]
- [Source: tests/unit/components/phase-transition-banner.test.ts — Tests a modifier]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Made `actionLabel` prop optional in PhaseTransitionBanner.vue with v-if on the action button
- Extended `transitionBanner` computed in MoteurView.vue to handle completion banner for Phase ② Valider
- Moved `isCurrentPhaseComplete` check into `transitionBanner` computed for unified logic
- Simplified `showTransitionBanner` — no longer needs redundant `isCurrentPhaseComplete` check
- Completion banner message: "Validation complete — tous les mots-cles sont prets pour la redaction !"
- Completion banner has no actionLabel (no navigate button) since it's the last phase
- Added 2 component tests (no action button without actionLabel, dismiss still works)
- Replaced "no banner Phase ②" test with "shows completion banner" + "completion banner can be dismissed"
- Total: 1644 tests / 110 files — zero regressions

### File List

- `src/components/moteur/PhaseTransitionBanner.vue` — MODIFIED: actionLabel optional, v-if on action button
- `src/views/MoteurView.vue` — MODIFIED: transitionBanner handles completion banner, showTransitionBanner simplified
- `tests/unit/components/phase-transition-banner.test.ts` — MODIFIED: +3 tests (optional actionLabel, completion banner, dismiss)
