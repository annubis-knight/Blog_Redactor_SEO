# Story 6.1: Restructuration Moteur 3→2 phases + navigation sous-onglets

Status: done

## Story

As a consultant SEO,
I want le Moteur restructuré en 2 phases (Générer, Valider) avec 3 sous-onglets séquentiels dans Valider (Capitaine, Lieutenants, Lexique),
So that le workflow est aligné avec la logique GO/NO-GO et la Phase ③ Assigner ne pollue plus la navigation.

## Acceptance Criteria

1. **Given** l'utilisateur accède à la vue Moteur **When** il arrive sur la page **Then** il voit 2 groupes de phases visuellement distincts : ① Générer, ② Valider **And** la Phase ③ Assigner n'existe plus

2. **Given** l'utilisateur ouvre la Phase ② Valider **When** il clique dessus **Then** il voit 3 sous-onglets : Capitaine, Lieutenants, Lexique **And** le sous-onglet Capitaine est actif par défaut

3. **Given** l'utilisateur est sur le sous-onglet Capitaine **When** il clique sur Lieutenants ou Lexique **Then** il navigue librement vers le sous-onglet choisi sans blocage (FR2, FR34) **And** aucune action automatique ne se déclenche au changement de sous-onglet (FR34)

4. **Given** le sous-onglet Lieutenants nécessite un Capitaine verrouillé pour agir **When** le Capitaine n'est PAS verrouillé et l'utilisateur ouvre Lieutenants **Then** le sous-onglet s'affiche en lecture seule avec un message explicatif (gating souple) **And** l'utilisateur peut consulter mais pas lancer d'actions

5. **Given** le sous-onglet Lexique nécessite des Lieutenants verrouillés pour agir **When** les Lieutenants ne sont PAS verrouillés et l'utilisateur ouvre Lexique **Then** le sous-onglet s'affiche en lecture seule avec un message explicatif (gating souple) **And** l'utilisateur peut consulter mais pas lancer d'actions

6. **Given** les PHASE_CHECKS sont mis à jour **When** le système évalue la progression **Then** les checks sont : `discovery_done`, `radar_done` (Phase ①) + `capitaine_locked`, `lieutenants_locked`, `lexique_validated` (Phase ②) **And** les anciens checks `validation_done`, `captain_chosen`, `assignment_done` ne sont plus utilisés

## Tasks / Subtasks

- [x] Task 1 : Restructurer la config phases dans MoteurView (AC: #1, #2)
  - [x] 1.1 Modifier `TAB_IDS` : remplacer `['discovery', 'radar', 'validation', 'assignation']` par `['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique']`
  - [x] 1.2 Modifier le tableau `phases` : supprimer Phase ③ Assigner, remplacer Phase ② par 3 onglets (capitaine, lieutenants, lexique)
  - [x] 1.3 Le sous-onglet `capitaine` est l'onglet par défaut quand Phase ② est cliquée

- [x] Task 2 : Adapter MoteurPhaseNavigation pour les sous-onglets (AC: #2, #3)
  - [x] 2.1 Vérifier que le composant `MoteurPhaseNavigation` supporte déjà la nouvelle structure — aucun changement nécessaire
  - [x] 2.2 Visuellement, les 3 sous-onglets de Phase ② apparaissent comme des tabs sous le header "② Valider"

- [x] Task 3 : Supprimer Phase ③ Assigner et son contenu (AC: #1)
  - [x] 3.1 Retirer le bloc `v-if="activeTab === 'assignation'"` du template
  - [x] 3.2 Retirer les imports de `KeywordMigrationPreview` et `KeywordBadge`
  - [x] 3.3 Retirer `handleAssign`, `GROUPING_MAP` et la logique de migration
  - [x] 3.4 Nettoyer le `PHASE_NEXT` map

- [x] Task 4 : Mettre à jour PHASE_CHECKS (AC: #6)
  - [x] 4.1 Remplacer `PHASE_CHECKS` par : `{ generer: ['discovery_done', 'radar_done'], valider: ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'] }`
  - [x] 4.2 Mettre à jour `PHASE_NEXT` : ne garder que `{ generer: { phaseLabel: 'Valider', firstTab: 'capitaine' } }`

- [x] Task 5 : Ajouter les placeholders pour les 3 sous-onglets Phase ② (AC: #2, #4, #5)
  - [x] 5.1 Créer un bloc `v-if="activeTab === 'capitaine'"` avec placeholder
  - [x] 5.2 Créer un bloc `v-if="activeTab === 'lieutenants'"` avec gating souple
  - [x] 5.3 Créer un bloc `v-if="activeTab === 'lexique'"` avec gating souple

- [x] Task 6 : Adapter le TabCachePanel (AC: #2)
  - [x] 6.1 Mettre à jour `tabCacheEntries` : 3 nouvelles entrées capitaine, lieutenants, lexique
  - [x] 6.2 `hasCachedData: false` pour les 3 sous-onglets (sera implémenté plus tard)

- [x] Task 7 : Supprimer le lien vers PainValidation dans Phase ② (AC: #1)
  - [x] 7.1 Retirer le bloc `v-if="activeTab === 'validation'"`
  - [x] 7.2 PainValidation.vue conservé pour réutilisation future

- [x] Task 8 : Mettre à jour les tests (AC: #1-#6)
  - [x] 8.1 `moteur-phase-navigation.test.ts` : 2 phases, 5 tabs (13 tests)
  - [x] 8.2 `moteur-phase-assigner.test.ts` : réécrit pour Phase ② sous-onglets + gating souple (15 tests)
  - [x] 8.3 `moteur-phase-valider.test.ts` : 3 sous-onglets, cross-phase navigation (13 tests)
  - [x] 8.4 `moteur-check-completed.test.ts` : 5 checks standardisés (6 tests)
  - [x] 8.5 `phase-transition-banner.test.ts` : pas de Phase ③, PHASE_NEXT uniquement generer→valider (15 tests)
  - [x] 8.6 `dual-mode-props.test.ts` : passe sans changement (12 tests)

- [x] Task 9 : Vérifier le router (AC: aucun changement requis)
  - [x] 9.1 Route `/cocoon/:cocoonId/moteur` inchangée — navigation interne à MoteurView

## Dev Notes

### Architecture Pattern — Navigation interne (pas de routes imbriquées)

Toute la navigation par phase et par onglet est gérée en INTERNE par `MoteurView.vue` via le state `activeTab: ref<string>`. Pas de routes Vue Router pour chaque onglet. Le composant `MoteurPhaseNavigation` reçoit un tableau `phases: Phase[]` et émet `update:activeTab`.

**Structure cible de `phases` :**
```typescript
const phases: Phase[] = [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: !isDiscoveryAllowed },
      { id: 'radar', label: 'Radar', optional: true, locked: !isDiscoveryAllowed },
    ],
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'capitaine', label: 'Capitaine' },
      { id: 'lieutenants', label: 'Lieutenants' },
      { id: 'lexique', label: 'Lexique' },
    ],
  },
]
```

### Gating souple — Pattern recommandé

Le gating souple signifie : **navigation libre, actions bloquées**. L'utilisateur peut VOIR le contenu du sous-onglet Lieutenants ou Lexique même sans prérequis verrouillé, mais les boutons d'action sont désactivés et un message explicatif est affiché en haut. Ce pattern est déjà utilisé pour le gating de l'Assignation (lignes 580-588 actuelles).

```vue
<div v-if="activeTab === 'lieutenants'">
  <div v-if="!isCaptaineLocked" class="soft-gate-message">
    <p>Verrouillez d'abord le Capitaine pour débloquer les actions Lieutenants.</p>
  </div>
  <!-- Contenu placeholder du sous-onglet -->
  <div :class="{ 'content-disabled': !isCaptaineLocked }">
    <p>Sous-onglet Lieutenants — implémentation complète dans Stories 7.1-7.4</p>
  </div>
</div>
```

Le computed `isCaptaineLocked` vérifie `progressStore.getProgress(slug)?.completedChecks?.includes('capitaine_locked')`.

### Fichiers impactés — Liste exhaustive

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/views/MoteurView.vue` | **MODIFIER** | Restructurer phases, supprimer Phase ③, ajouter placeholders sous-onglets |
| `src/components/moteur/MoteurPhaseNavigation.vue` | **VÉRIFIER** | Doit déjà supporter 3 tabs dans une phase — aucun changement si OK |
| `tests/unit/components/moteur-phase-navigation.test.ts` | **MODIFIER** | Mettre à jour la structure de test pour 2 phases |
| `tests/unit/components/moteur-phase-assigner.test.ts` | **SUPPRIMER** | Phase ③ n'existe plus |
| `tests/unit/components/moteur-phase-valider.test.ts` | **MODIFIER** | Tester 3 sous-onglets + gating souple |
| `tests/unit/components/moteur-check-completed.test.ts` | **MODIFIER** | Nouveaux noms de checks |
| `tests/unit/components/phase-transition-banner.test.ts` | **MODIFIER** | Plus de transition vers Phase ③ |

### Composants à NE PAS TOUCHER

- `PainValidation.vue` — sera réutilisé/recomposé dans CaptainValidation (Story 6.3)
- `DouleurIntentScanner.vue` — Phase ① inchangée
- `KeywordDiscoveryTab.vue` — Phase ① inchangée
- `PainTranslator.vue` — Phase ① inchangée
- `MoteurStrategyContext.vue` — contexte Cerveau inchangé
- `SelectedArticlePanel.vue` — sélection article inchangée
- `BasketStrip.vue` — panier inchangé
- `RadarThermometer.vue` — sera utilisé dans CaptainValidation (Story 6.3), pas ici

### Convention check-completed events

L'architecture définit 5 checks standardisés. Pour cette story, seules les DÉCLARATIONS des checks changent dans `PHASE_CHECKS`. Les émissions `check-completed` réelles arriveront avec les stories 6.2-6.5 (capitaine) et 7.x/8.x (lieutenants/lexique).

### Anti-patterns à éviter

- **NE PAS bloquer la navigation** vers les sous-onglets — le gating est SOUPLE (message + désactivation des actions)
- **NE PAS déclencher d'action automatique** au changement de sous-onglet (FR34)
- **NE PAS créer de sous-routes** Vue Router pour les onglets — tout est géré par state interne
- **NE PAS supprimer** `PainValidation.vue`, `KeywordMigrationPreview.vue` ou d'autres composants existants — ils seront réutilisés ou supprimés dans d'autres stories
- **NE PAS modifier** le store `article-progress.store.ts` — les nouveaux noms de checks sont des strings libres dans `completedChecks: string[]`

### Conventions de nommage

- Fichiers Vue : PascalCase (`CaptainValidation.vue`)
- Fichiers stores : kebab-case + `.store.ts`
- Events Vue : kebab-case (`@check-completed`, `@update:active-tab`)
- Variables : camelCase (`isCaptaineLocked`, `activeSubTab`)
- Constantes : UPPER_SNAKE_CASE (`PHASE_CHECKS`, `TAB_IDS`)

### Project Structure Notes

- Les 3 sous-onglets sont des TABS dans la Phase ② — pas un composant wrapper imbriqué
- `MoteurPhaseNavigation.vue` utilise `Phase[]` avec `tabs: PhaseTab[]` — la structure existante supporte déjà N tabs par phase
- Le router reste inchangé : route unique `/cocoon/:cocoonId/moteur`
- Pas de nouveaux fichiers backend — cette story est 100% frontend

### Testing Standards

- Framework : Vitest + Vue Test Utils
- Pattern de montage : `mount(Component, { props, global: { plugins: [pinia] } })`
- Localisation tests : `tests/unit/components/` en miroir de la source
- Assertion sur la structure DOM, les events émis, les computed values

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.1 lignes 605-631]
- [Source: _bmad-output/planning-artifacts/architecture.md — Phase ② Valider architecture lignes 220-301]
- [Source: _bmad-output/planning-artifacts/architecture.md — Boundary composants Moteur lignes 787-827]
- [Source: _bmad-output/planning-artifacts/architecture.md — Communication Patterns lignes 442-497]
- [Source: _bmad-output/planning-artifacts/architecture.md — Anti-patterns lignes 538-548]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1, FR2, FR34, FR35 lignes 237-243, 289-293]
- [Source: src/views/MoteurView.vue — Structure actuelle des phases lignes 114-149]
- [Source: src/components/moteur/MoteurPhaseNavigation.vue — Types Phase/PhaseTab]
- [Source: src/stores/article-progress.store.ts — addCheck(), completedChecks]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- MoteurView.vue entièrement réécrit : 3 phases → 2 phases, 7 tabs → 5 tabs
- Phase ③ Assigner supprimée (imports, template, handlers, CSS)
- 3 sous-onglets Capitaine/Lieutenants/Lexique avec placeholders et gating souple
- PHASE_CHECKS et PHASE_NEXT mis à jour pour 5 checks
- 6 fichiers de tests mis à jour/réécrits : 74 tests passent
- Suite complète : 97 fichiers, 1264 tests — zéro régression
- MoteurPhaseNavigation.vue inchangé (supporte déjà N tabs/phase)
- Router inchangé (navigation interne à MoteurView)

### File List

- `src/views/MoteurView.vue` — Rewrite complet (911→701 lignes)
- `tests/unit/components/moteur-phase-navigation.test.ts` — Réécrit (2 phases, 5 tabs)
- `tests/unit/components/moteur-sous-onglets-gating.test.ts` — Réécrit (ex moteur-phase-assigner, sous-onglets + gating souple)
- `tests/unit/components/moteur-phase-valider.test.ts` — Réécrit (3 sous-onglets)
- `tests/unit/components/moteur-check-completed.test.ts` — Mis à jour (5 checks)
- `tests/unit/components/phase-transition-banner.test.ts` — Mis à jour (pas de Phase ③)
