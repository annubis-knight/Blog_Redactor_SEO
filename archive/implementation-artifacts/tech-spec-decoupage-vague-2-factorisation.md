---
title: 'Vague 2 — Factorisations CSS-heavy (ProposedArticleRow + RadarKeywordCard)'
slug: 'decoupage-vague-2-factorisation'
created: '2026-05-04'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
parent_roadmap: 'roadmap-decoupage-monstres-vue.md'
prerequisite: 'tech-spec-decoupage-vague-1-templates.md (livrée et stable)'
tech_stack:
  - 'Vue 3.5.29 (script setup + composition API)'
  - 'TypeScript 5.9.3'
  - 'Vitest 4.0.18 + @vue/test-utils'
  - 'Playwright 1.59.1 (tests visuels)'
files_to_modify:
  - 'src/components/strategy/ProposedArticleRow.vue (977L → cible <800L)'
  - 'src/components/intent/RadarKeywordCard.vue (900L → cible <800L)'
files_to_create:
  - 'src/components/strategy/proposed/ProposedArticleHeader.vue'
  - 'src/components/strategy/proposed/ProposedArticleSlider.vue'
  - 'src/components/strategy/proposed/ProposedArticleActions.vue'
  - 'src/components/intent/radar-card/RadarCardScoreRing.vue'
  - 'src/components/intent/radar-card/RadarCardPaaTree.vue'
  - 'tests/unit/components/proposed-article-row-architecture.test.ts'
  - 'tests/unit/components/radar-keyword-card-architecture.test.ts'
  - 'tests/unit/components/radar-keyword-card-visual.test.ts (snapshot HTML)'
  - 'tests/unit/components/proposed-article-row-visual.test.ts (snapshot HTML)'
---

# Tech-Spec Vague 2 — Factorisations CSS-heavy

**Created:** 2026-05-04
**Roadmap parent:** [roadmap-decoupage-monstres-vue.md](roadmap-decoupage-monstres-vue.md)
**Pré-requis :** Vague 1 livrée et stable (ces 2 composants enfants
sont consommés par des composants refactorés en Vague 1).

## Définition de la Vague 2

**Caractéristique unique** : factoriser des composants Vue qui sont
**saturés en CSS scoped et patterns markup répétés**. La technique mélange :
- extraction de **composants atomiques réutilisables** (ex: un slider générique
  réutilisé 3 fois pour titre/keyword/slug) ;
- **mutualisation du CSS** pour réduire la duplication ;
- **tests visuels** (snapshot HTML rendu) en complément du DOM-position
  parce que le risque ici est CSS/visuel, pas structurel.

C'est un chantier de nature différente de la Vague 1 : on accepte ici une
forme légère de refactor de pattern (paramétriser un slider via
`kind: 'title' | 'keyword' | 'slug'`), parce que la duplication actuelle est
le vrai problème de maintenance.

## Périmètre

| Bloc | Fichier | Lignes | Cible | Risque |
|---|---|---|---|---|
| K | `ProposedArticleRow.vue` | 977 | <800 | Modéré |
| L | `RadarKeywordCard.vue` | 900 | <800 | Modéré |

**5 sous-composants Vue + 2 tests architecturaux + 2 tests visuels** au total.

## Hors périmètre Vague 2

- **Refactor logique** dans les 2 fichiers : interdit. Les composables et
  watchers existants restent inchangés.
- **Refonte CSS globale** : interdit. On factorise uniquement le CSS qui est
  dupliqué AU SEIN d'un même fichier (entre les 3 sliders de
  ProposedArticleRow par exemple). Pas de migration vers un design system,
  pas de variables CSS globales nouvelles.
- **Composants atomiques globaux** : on crée des sous-composants **dans le
  domaine du parent** (`strategy/proposed/`, `intent/radar-card/`), pas dans
  un dossier `shared/atoms/`. La promotion d'un atomique en composant global
  réutilisable cross-domaine est une décision séparée.

## Pourquoi Vague 2 après Vague 1

**Adresse Finding #7** : `ProposedArticleRow` est consommé par `BrainPhase`
(Vague 1 Bloc C). `RadarKeywordCard` est consommé par `CaptainValidation`
(Vague 1 Bloc B), `DouleurIntentScanner` (Vague 1 Bloc E) et
`KeywordDiscoveryTab` (Vague 1 Bloc A — indirect via `DouleurIntentScanner`).

On refactore l'enfant **après** que ses parents-consommateurs aient stabilisé
leurs bindings en Vague 1. Sinon, refactorer l'enfant au moment où le parent
bouge crée une fenêtre où les tests S2 des deux côtés sont rouges en même
temps — impossible à diagnostiquer.

## Pourquoi tests visuels en Vague 2

**Adresse Finding #12** : un test architectural DOM-position vérifie l'arbre,
pas l'affichage. Une régression visuelle (padding qui fusionne 2 containers,
border qui disparaît, score ring qui change de couleur en mode dark) ne
casse aucune assertion `isDescendantOf`. Pour ces 2 composants, on ajoute
des **snapshots HTML rendu** :

```typescript
// tests/unit/components/radar-keyword-card-visual.test.ts
it('renders the same HTML structure as before refactor (regression snapshot)', () => {
  const wrapper = mount(RadarKeywordCard, { props: typicalProps })
  expect(wrapper.html()).toMatchSnapshot()
})
```

**Régénération du snapshot** : autorisée uniquement avec justification
écrite dans le PR (idem AC2 Vague 1 pour les tests S2).

## Tasks

### Bloc 0 — Safety net Git

- 0.1 Vérifier que la Vague 1 est mergée sur `main` et que les tests sont
  verts depuis au moins 24h.
- 0.2 `git checkout main && git pull`.
- 0.3 Créer la branche : `git checkout -b chore/decoupage-vague-2-factorisation`.
- 0.4 Commit pré-refactor :
  ```bash
  git commit --allow-empty -m "chore(refactor): pre-refactor safety net — vague 2 factorisation

  Snapshot avant la factorisation CSS-heavy de ProposedArticleRow et
  RadarKeywordCard. Cf. tech-spec-decoupage-vague-2-factorisation.md."
  ```
- 0.5 Push : `git push -u origin chore/decoupage-vague-2-factorisation`.
  Si échec auth, idem Vague 1 §0.5 : tag local + alerte.

### Bloc K — ProposedArticleRow.vue *(factorisation 3 sliders)*

- K.1 Investigation : confirmer que les 3 blocs slider (titre lignes 116-171,
  keyword 287-325, slug 327-364) suivent **exactement** le même pattern
  (label-with-edit + edit input/badge + slider-nav arrows + counter).
  Si différences, paramétriser via slot OU rejeter la factorisation totale et
  faire 3 sous-composants distincts. **Décision documentée dans le PR.**
- K.2 *(Adresse Finding #16)* Décision technique : `ProposedArticleSlider`
  paramétré par `kind: 'title' | 'keyword' | 'slug'`. Justification :
  - Les 3 sliders ont le même comportement (label + edit + nav).
  - L'union-type est explicite et discriminé (3 valeurs nommées).
  - Si un 4e kind apparaît (description, etc.), l'union s'étend.
  - **Pas** d'utilisation de `<slot>` ici parce que le markup interne
    (input vs badge selon `kind`) varie de manière non-slot-friendly.
- K.3 Créer `src/components/strategy/proposed/ProposedArticleSlider.vue`
  - Props :
    ```typescript
    {
      kind: 'title' | 'keyword' | 'slug'
      label: string
      currentValue: string
      currentIndex: number
      total: number
      editing: boolean
      editValue: string
      colorClass?: string
      disabled?: boolean
    }
    ```
  - Emits : `start-edit`, `commit` (value), `cancel-edit`, `prev`, `next`,
    `update:edit-value`.
  - Markup : pattern label-with-edit + input/badge + slider-nav (~30L net).
  - **CSS scoped** : déplacer les classes communes (`.label-with-edit`,
    `.keyword-slider`, `.slider-nav`, `.slider-arrow`, `.slider-counter`,
    `.inline-edit-input`) vers ce composant. Le parent perd ces classes,
    réduisant son CSS d'~80L.
- K.4 Créer `src/components/strategy/proposed/ProposedArticleHeader.vue`
  - Props : `title`, `expanded`, `editingTitle`, `editValue`, `titles[]`,
    `currentTitleIndex`, `compositionResult`, `structuralWarnings`,
    `tooltipVisible`, `hasAnyIssue`, `totalWarningCount`, `accepted`.
  - Emits : `start-edit-title`, `commit-title`, `show-tooltip`,
    `hide-tooltip`, `keep-tooltip`, `select-title-index`, `toggle-accept`,
    `toggle-actions-menu`, `remove`.
  - Markup : header collapsed (lignes 116-227) — title block + composition
    badge + slider-nav titre + tooltip + actions header.
- K.5 Créer `src/components/strategy/proposed/ProposedArticleActions.vue`
  - Props : `expanded`, `accepted`, `actionsMenuOpen`, `parentMenuOpen`,
    `availableParents?`.
  - Emits : `regenerate-title`, `regenerate-keyword`, `regenerate-slug`,
    `toggle-accept`, `remove`, `change-parent`, `toggle-actions-menu`,
    `toggle-parent-menu`.
- K.6 Mettre à jour `ProposedArticleRow.vue` :
  - Template : 3 instances de `<ProposedArticleSlider :kind="...">` pour
    titre/keyword/slug + `<ProposedArticleHeader>` + `<ProposedArticleActions>`.
  - Cible : 977 → ~700L.
- K.7 Créer `tests/unit/components/proposed-article-row-architecture.test.ts`
  Commentaire de tête : référence FR-CER-STEPS-ARTICLE (PRD §8.1).
  - AC.K.1 `ProposedArticleSlider` est rendu 3 fois.
  - AC.K.2 Chaque instance a la prop `kind` correcte (`title`, `keyword`,
    `slug`) — vérifier via `wrapper.findAllComponents({ name: 'ProposedArticleSlider' })[0].props('kind')`.
  - AC.K.3 Le badge composition (`composition-badge-warn` ou
    `composition-badge-ok`) reste descendant de `proposal-header`.
  - AC.K.4 Actions menu et parent menu coexistent sans chevauchement DOM.
- K.8 Créer `tests/unit/components/proposed-article-row-visual.test.ts`
  - Snapshot HTML de la card en mode collapsed (default).
  - Snapshot HTML de la card en mode expanded.
  - Snapshot HTML de la card avec composition warnings.
- K.9 Lancer tests : `npm run test:unit -- proposed-article` + tests S2 brain
  (`brain-*.test.ts`). Tous verts (snapshots créés au premier passage).
- K.10 Lint + type-check.
- K.11 Manual UX Checklist Bloc K (voir Niveau 3).
- K.12 Commit : `chore(refactor): factorize ProposedArticleRow sliders and actions`.

### Bloc L — RadarKeywordCard.vue *(extraction score ring + PAA tree)*

- L.1 Investigation : confirmer les 2 zones extractibles dans le template
  (score ring + tooltip lignes 376-421 ~46L, PAA tree lignes 425-479 ~55L).
- L.2 Créer `src/components/intent/radar-card/RadarCardScoreRing.vue`
  - Props :
    ```typescript
    {
      displayedScore: number | null
      scoreColor: string
      scoreLabel: string
      breakdownRows: BreakdownRow[]
      hasScore: boolean
      relevanceMissingReason: 'no-pain' | 'no-signals' | 'long-tail' | null
      CIRCLE_RADIUS: number
      CIRCLE_CIRCUMFERENCE: number
      scoreDashoffset: number
    }
    ```
  - Emit : aucun (composant purement présentationnel).
  - Markup : SVG ring + tooltip avec les 4 messages contextuels (no-pain,
    no-signals, long-tail, fallback).
  - CSS scoped : `.radar-card__score-ring`, `.score-ring__value`,
    `.score-ring__label`, `.score-tooltip`, `.tooltip-*` — déménagement
    direct.
- L.3 Créer `src/components/intent/radar-card/RadarCardPaaTree.vue`
  - Props :
    ```typescript
    {
      paaTree: PaaNode[]
      expandedParents: Set<number>
      expandedPaa: Set<number>
      cachedPaa: boolean
      itemBorderClass: (paa: PaaItem) => string
      badgeClass: (paa: PaaItem) => string
      matchLabel: (paa: PaaItem) => string
    }
    ```
  - Emits : `toggle-children` (index), `toggle-answer` (index).
  - Markup : PAA tree récursif (parent → children).
  - CSS scoped : `.paa-tree*`, `.paa-node*`, `.paa-item*`, `.paa-question`,
    `.paa-answer`, `.paa-badge`, `.paa-chevron*`, `.paa-children*`,
    `.paa-semantic`.
- L.4 Mettre à jour `RadarKeywordCard.vue` :
  - Template : score ring → `<RadarCardScoreRing ... />`, PAA tree →
    `<RadarCardPaaTree ... />`.
  - Cible : 900 → ~720L. Le gain principal vient du **CSS** (les 2
    sous-composants emportent ~250L de CSS scoped).
- L.5 Créer `tests/unit/components/radar-keyword-card-architecture.test.ts`
  Commentaire de tête : référence FR-CAP-RADAR-CARD (PRD §8.6 — vérifier le
  nom exact ou ajouter au PRD si manquant).
  - AC.L.1 `RadarCardScoreRing` est descendant direct de `radar-card__header`.
  - AC.L.2 `RadarCardPaaTree` est descendant de `radar-card__body`, visible
    seulement si `expanded`.
  - AC.L.3 `@click.stop` est préservé sur le score ring (sinon propagation
    au parent radar-list-item ouvre la sidebar à tort).
  - AC.L.4 Pour `displayedScore === null`, chaque `relevanceMissingReason`
    rend le bon message contextuel (4 cas : no-pain, no-signals, long-tail,
    fallback).
- L.6 Créer `tests/unit/components/radar-keyword-card-visual.test.ts`
  - Snapshot card collapsed (default).
  - Snapshot card expanded avec PAA tree.
  - Snapshot score ring avec `displayedScore = 75`.
  - Snapshot score ring avec `displayedScore = null` + chaque
    `relevanceMissingReason`.
- L.7 Lancer tests : `npm run test:unit` complet (RadarKeywordCard est
  consommé par 3 composants Vague 1 — il faut vérifier qu'aucun consommateur
  ne casse).
- L.8 Lint + type-check + check:cycles + check:arch.
- L.9 Manual UX Checklist Bloc L.
- L.10 Commit : `chore(refactor): extract RadarCardScoreRing and RadarCardPaaTree`.

### Bloc Final — Validation Vague 2 + PR

- Z.1 `npm run check:health` : vert.
- Z.2 `npm run test:unit` complet : tous verts (snapshots inclus).
- Z.3 `npm run test:browser` : vert.
- Z.4 Vérifier les 2 cibles de lignes :
  - `ProposedArticleRow.vue` < 800L
  - `RadarKeywordCard.vue` < 800L
- Z.5 Vérifier que les snapshots HTML sont **commitées** (Vitest les crée
  dans `__snapshots__/`). Sans le snapshot, le test ne sert à rien.
- Z.6 Vérifier qu'aucune nouvelle FR n'a été ajoutée au PRD si elle n'était
  pas absolument nécessaire. Si une FR est ajoutée (ex: nouvelle FR sur la
  factorisation slider), elle est intégrée au PR de la Vague 2.
- Z.7 Manual UX Checklist Niveau 3 complète.
- Z.8 MAJ `sprint-status.yaml`.
- Z.9 PR :
  - Titre : `chore(refactor): vague 2 — factorisation CSS-heavy (ProposedArticleRow + RadarKeywordCard)`
  - Body : référence roadmap, liste des 5 sous-composants créés,
    référence aux snapshots créés, AC review.

## Acceptance Criteria

**AC1 — API publique inchangée**
- Given un consumer (`BrainPhase`, `CaptainValidation`, `DouleurIntentScanner`,
  `KeywordDiscoveryTab`),
- When il importe et instancie `ProposedArticleRow` ou `RadarKeywordCard`,
- Then les props et events sont strictement identiques au pré-refactor.

**AC2 — Tests S2 + Vague 1 caractérisation préservés**
- Given les tests de la Vague 1 (déjà mergés) et les tests S2 existants,
- When `npm run test:unit` est exécuté,
- Then tous restent verts.
- Exception modification : voir AC2 Vague 1.

**AC3 — Verrous architecturaux ajoutés**
- 2 nouveaux fichiers `*-architecture.test.ts`, chacun avec ≥3 ACs DOM-position,
  commentaire de tête référençant une FR PRD.

**AC4 — Tests visuels en place** *(adresse Finding #12)*
- 2 nouveaux fichiers `*-visual.test.ts` avec snapshots HTML.
- Les snapshots sont commitées.
- Modification d'un snapshot post-refactor : autorisée uniquement avec
  justification écrite dans le PR + review humaine.

**AC5 — Tailles cibles Vague 2**
- ProposedArticleRow < 800L
- RadarKeywordCard < 800L

**AC6 — Hygiène statique verte**
- lint + type-check + check:dead + check:cycles + check:arch verts.

**AC7 — Aucun cycle d'import introduit**
- Types comme `BreakdownRow`, `PaaNode`, `PaaItem` peuvent nécessiter une
  migration dans `shared/types/`. Si oui, faite dans le commit dédié avec
  justification.

**AC8 — `@click.stop` préservé sur score ring** *(invariant FR-CAP-RADAR
ou similaire)*
- Le `@click.stop` sur le `radar-card__score-ring` empêche la propagation au
  parent `radar-list-item` (CaptainValidation workflow). Sa préservation
  est explicitement testée (AC.L.3).

**AC9 — CSS factorisation propre**
- Le CSS dupliqué entre les 3 sliders ProposedArticleRow est factorisé dans
  `ProposedArticleSlider.vue`.
- Le CSS du score ring et du PAA tree est entièrement dans les sous-composants
  L.
- Le parent `ProposedArticleRow.vue` perd au moins **80L de CSS scoped** ;
  `RadarKeywordCard.vue` perd au moins **200L de CSS scoped**.

## Testing Strategy (3 niveaux)

### Niveau 1 — Tests architecturaux + visuels

- 2 fichiers `*-architecture.test.ts` (DOM-position, FR PRD référencée).
- 2 fichiers `*-visual.test.ts` (snapshot HTML rendu).

### Niveau 2 — Tests S2 fonctionnels (préexistants)

À garder verts :
- Tests S2 existants utilisés par BrainPhase, CaptainValidation,
  DouleurIntentScanner, KeywordDiscoveryTab (déjà refactorés en Vague 1).
- Si une assertion devient trop dépendante de la profondeur DOM interne d'un
  des 2 composants Vague 2, autorisation modif avec justification PR.

### Niveau 3 — Manual UX Checklist Vague 2

**Bloc K (ProposedArticleRow)** :
- [ ] Cerveau étape 6 → générer 10+ articles.
- [ ] Card collapsed : titre + composition badge + actions kebab visibles.
- [ ] Cliquer card → expansion fluide, pas de "saut" CSS.
- [ ] Slider titre : flèches < / > naviguent ; counter `N/total` correct.
- [ ] Slider keyword : idem, avec badge couleur selon type article (Pilier/Inter/Spé).
- [ ] Slider slug : idem.
- [ ] Edit inline : cliquer icône edit → input → blur valide.
- [ ] Composition tooltip : hover badge → tooltip s'affiche, lecture stable
  (le hideTooltip 150ms permet de migrer la souris au tooltip).
- [ ] Kebab menu : Régénérer titre/keyword/slug + Rattacher à un intermédiaire.
- [ ] Mode expanded : actions row en bas, regenerate dropdown fonctionne.
- [ ] Suppression article : confirmation visuelle (× supprime).

**Bloc L (RadarKeywordCard)** :
- [ ] Capitaine workflow : radar-list affiche cards avec score ring.
- [ ] Score ring 75 (vert) → couleur correcte, tooltip au hover affiche
  breakdown.
- [ ] Score ring null + `relevanceMissingReason='no-pain'` → "—" + tooltip
  message "Définis un point de douleur...".
- [ ] Score ring null + `no-signals` → message PAA/autocomplete vides.
- [ ] Score ring null + `long-tail` → message "Score Pertinence non
  applicable...".
- [ ] Cliquer score ring → ne propage PAS au parent (sidebar ne s'ouvre pas).
- [ ] Expanded : PAA tree affiche parent → children.
- [ ] Cliquer chevron parent → déplie children.
- [ ] Cliquer question → déplie réponse.
- [ ] PAA tree avec `cachedPaa: true` → indicateur "PAA en cache" visible.
- [ ] Card sur off-pain (orange) : classe `radar-card--off-pain` appliquée.

**a11y et perf** :
- [ ] Lighthouse Accessibility ≥ pré-Vague-2.
- [ ] Pas de regression layout shift.
- [ ] Aucun warning Vue console.

## Pre-mortem Vague 2

### Risque 2.1 — Snapshot visuel devient un test "stamp humain"
**Symptôme** : à chaque modification CSS mineure (padding 8 → 10), le
snapshot casse, le dev régénère sans relire, et au bout de 6 mois le test
ne sert plus à rien.
**Mitigation** : règle PR explicite — toute régénération de snapshot
nécessite (a) une justification écrite, (b) une lecture diff par un humain,
(c) un screenshot avant/après pour les changements >5 lignes diff.
**Note** : si la régénération devient routine, le test est mal écrit —
revoir le scope du snapshot (ex: seulement le score ring, pas toute la card).

### Risque 2.2 — Régression CSS cross-mode (light vs dark theme)
**Symptôme** : un sous-composant rend mal en dark mode parce que le CSS
parent appliquait des variables.
**Mitigation** : si l'app a un dark mode, lancer la checklist Niveau 3 dans
**les deux thèmes**. Sinon noter dans le PR "single theme app".

### Risque 2.3 — Migration de types vers `shared/types/` rate
**Symptôme** : `BreakdownRow` ou `PaaNode` est défini localement dans
RadarKeywordCard. Le sous-composant `RadarCardScoreRing` l'importe via un
chemin relatif fragile.
**Mitigation** : audit AVANT extraction. Si type défini localement, le
déplacer dans `shared/types/intent.types.ts` AVANT le Bloc L.

### Risque 2.4 — Performance dégradée par re-render des sliders
**Symptôme** : taper dans le `editValue` d'un slider re-render les 2 autres.
**Mitigation** : Vue 3 fait du re-render granulaire mais une prop fonction
inline (`@start-edit="() => handleStartEdit('title')"`) recrée la prop.
Préférer `@start-edit="handleStartEditTitle"` (référence stable).

### Risque 2.5 — Sous-composant `ProposedArticleSlider` trop générique
**Symptôme** : on essaie d'ajouter un 4e kind ('description', 'category')
et le composant gonfle de conditions `v-if="kind === ..."`.
**Mitigation** : si l'union dépasse 4 kinds, refactor en 4 composants
distincts (la factorisation ne sert plus la maintenabilité). À surveiller en
revue Vague 2.

## Notes

- Estimation T-shirt size : **M (1-2 jours plein temps)**.
- L'introduction de tests visuels peut surprendre : c'est la première fois
  qu'on en utilise dans le projet. Documenter dans la rétro Vague 2 si la
  pratique est conservée pour les futures vagues.
