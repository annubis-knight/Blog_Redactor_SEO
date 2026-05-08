> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 6.4: Input alternatif, historique slider, découpage racine, forcer GO

Status: done

## Story

As a consultant SEO,
I want pouvoir tester un mot-clé alternatif, naviguer dans l'historique de mes tests, voir l'analyse racine pour les mots-clés longue traîne, et forcer GO si je le souhaite,
So that j'ai le contrôle total sur le choix de mon Capitaine sans être prisonnier de l'algorithme.

## Acceptance Criteria

1. **Given** l'utilisateur est sur le sous-onglet Capitaine **When** il saisit un mot-clé alternatif et lance la recherche **Then** le mot-clé est analysé via la route validate et les résultats s'affichent **And** le mot-clé précédent est ajouté à l'historique

2. **Given** l'utilisateur a testé 3 mots-clés **When** il utilise le slider d'historique **Then** il navigue entre les 3 résultats sans re-appel API **And** les KPIs et le verdict se mettent à jour instantanément

3. **Given** un mot-clé est longue traîne (3+ mots) avec données faibles (volume < seuil orange) **When** les résultats s'affichent **Then** une section "Analyse racine" apparaît avec les KPIs de la racine

4. **Given** le verdict est NO-GO ou ORANGE **When** l'utilisateur clique "Forcer GO" **Then** le verdict passe en GO forcé avec un indicateur visuel

## Tasks / Subtasks

- [x] Task 1 : Ajouter l'input alternatif et l'historique dans CaptainValidation (AC: #1, #2)
  - [x] 1.1 Ajouter un champ input + bouton "Tester" dans CaptainValidation.vue
  - [x] 1.2 Implémenter un historique local (ref<ValidateResponse[]>) dans le composable
  - [x] 1.3 Ajouter un slider (input range) pour naviguer dans l'historique
  - [x] 1.4 Le résultat courant est déterminé par la position du slider

- [x] Task 2 : Implémenter l'analyse racine (AC: #3)
  - [x] 2.1 Détecter les mots-clés longue traîne (3+ mots) côté frontend
  - [x] 2.2 Si longue traîne + volume faible, extraire la racine (1-2 premiers mots)
  - [x] 2.3 Lancer une validation supplémentaire sur la racine
  - [x] 2.4 Afficher la section "Analyse racine" sous les KPIs principaux

- [x] Task 3 : Implémenter le bouton "Forcer GO" (AC: #4)
  - [x] 3.1 Afficher le bouton quand verdict ≠ GO
  - [x] 3.2 Toggle forceGo dans le state local
  - [x] 3.3 Afficher un indicateur visuel "GO forcé" sur le verdict

- [x] Task 4 : Écrire les tests (AC: #1-#4)
  - [x] 4.1 Tests input alternatif + historique navigation
  - [x] 4.2 Tests analyse racine (longue traîne detection)
  - [x] 4.3 Tests forcer GO

## Dev Notes

### Architecture — Historique dans le composable

L'historique est géré dans `useCapitaineValidation` via un tableau réactif.

```typescript
const history = ref<ValidateResponse[]>([])
const historyIndex = ref(-1) // -1 = no history

// When validateKeyword succeeds, push to history
// historyIndex tracks the current position
// The slider sets historyIndex, and the displayed result comes from history[historyIndex]
```

### Racine extraction — Frontend simple

```typescript
function extractRoot(keyword: string): string | null {
  const words = keyword.trim().split(/\s+/)
  if (words.length < 3) return null
  return words.slice(0, 2).join(' ')
}
```

### Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `src/composables/useCapitaineValidation.ts` | **MODIFIER** | Ajouter historique, forceGo, extractRoot |
| `src/components/moteur/CaptainValidation.vue` | **MODIFIER** | Input alternatif, slider, racine, forcer GO |
| `tests/unit/composables/useCapitaineValidation.test.ts` | **MODIFIER** | Tests historique + racine |
| `tests/unit/components/captain-validation.test.ts` | **MODIFIER** | Tests input + slider + forcer GO |

### Anti-patterns à éviter

- **NE PAS** re-appeler l'API lors de la navigation historique
- **NE PAS** modifier le verdict original — le "forcer GO" est un flag local

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.4 lignes 698-721]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- useCapitaineValidation.ts enrichi : history[], historyIndex, currentResult (computed), forceGo, toggleForceGo, rootResult, isLoadingRoot, extractRoot, navigateHistory
- CaptainValidation.vue enrichi : input alternatif + bouton Tester, slider historique, bouton Forcer GO + badge "(forcé)", section Analyse racine
- 42 tests Story 6.4 (21 composable + 21 component) — tous verts
- Suite complète : 101 fichiers, 1365 tests — zéro régression

### File List

- `src/composables/useCapitaineValidation.ts` — Ajout historique, forceGo, rootResult, extractRoot
- `src/components/moteur/CaptainValidation.vue` — Input alternatif, slider, forcer GO, racine
- `tests/unit/composables/useCapitaineValidation.test.ts` — Réécrit (21 tests)
- `tests/unit/components/captain-validation.test.ts` — Réécrit (21 tests)
