---
title: Radar Card — anatomie du composant central du Moteur
last_updated: 2026-05-12
synced_with:
  - src/components/intent/RadarKeywordCard.vue
  - src/components/intent/RadarCardCheckable.vue
  - src/components/intent/RadarCardLockable.vue
  - src/components/intent/radar-card/RadarCardScoreRing.vue
  - src/components/intent/radar-card/RadarCardPaaTree.vue
  - src/components/intent/KeywordWords.vue
  - src/components/moteur/CaptainInteractiveWords.vue
  - src/components/moteur/captain/CaptainRadarList.vue
  - docs/scoring-kpi-vs-relevance.md
  - docs/moteur-data-flow.md
---

# Radar Card — anatomie du composant central du Moteur

> **Pourquoi cette doc ?** La "Radar Card" est le composant le plus structurant de l'expérience Moteur : c'est la carte qui matérialise un mot-clé candidat. Elle apparaît dans **deux onglets** (Radar et Capitaine) avec des contrôles et une sémantique de score différents, mais le rendu de la carte elle-même est **partagé** (un seul fichier, deux wrappers). Cette doc décrit qui contient quoi, qui passe quoi, et pourquoi les deux modes ne sont pas une duplication.

## TL;DR

- **Un cœur** : `RadarKeywordCard.vue` — affichage de la carte (header + KPIs + anneau de score + body PAA).
- **Deux wrappers** :
  - `RadarCardCheckable.vue` → onglet **Radar** (checkbox de sélection).
  - `RadarCardLockable.vue` → onglet **Capitaine** (cadenas + tag manuel + recalcul Pertinence).
- **Deux props pivot** :
  - `displayMode: 'kpi' | 'relevance'` change la **source du score** affiché (anneau).
  - `cardContext: 'radar' | 'capitaine'` (depuis 2026-05-12, FR-CAP-PAA-BADGE-SINGLE) change la **source du badge PAA** et de l'affichage "PAA pts" du header :
    - `'radar'` → badge lexical historique + somme brute `paaWeightedScore`.
    - `'capitaine'` → chip unique Haiku (`pertinent` / `partiel` / `hors-sujet`) + `overallPaaScore/100`. Fallback lexical transparent si jugement absent.
- **Trois sous-composants visuels** consommés par le cœur : `RadarCardScoreRing`, `RadarCardPaaTree`, `KeywordWords`.

## 1. Schéma global — qui contient qui

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VUES (router views)                              │
└─────────────────────────────────────────────────────────────────────────────┘

  MoteurView.vue                                          LaboView.vue
       │                                                       │
       ├──── DouleurIntentScanner ─────┐               (mode="libre")
       │     (onglet "Radar")          │                       │
       │                               ▼                       │
       │                  DouleurScannerResults                │
       │                               │                       │
       │                               │                       │
       └──── CaptainValidation ◄───────┼───────────────────────┘
             (onglet "Capitaine")      │
                    │                  │
                    ▼                  │
             CaptainRadarList          │
                    │                  │
                    ▼                  │
           CaptainInteractiveWords     │
                    │                  │
                    │                  │
┌───────────────────┼──────────────────┼──────────────────────────────────────┐
│                   ▼                  ▼                                      │
│         ┌──────────────────┐   ┌──────────────────────┐                     │
│         │ RadarCardLockable│   │ RadarCardCheckable   │                     │
│         │  ──────────────  │   │  ──────────────────  │                     │
│         │ • cadenas verrou │   │ • checkbox sélection │                     │
│         │ • bouton tag     │   │                      │                     │
│         │ • bouton recalc. │   │                      │                     │
│         │ • overlay valid. │   │                      │                     │
│         └────────┬─────────┘   └──────────┬───────────┘                     │
│                  │                        │                                 │
│                  │       (wrappent)       │                                 │
│                  └────────────┬───────────┘                                 │
│                               ▼                                             │
│                    ┌─────────────────────────┐                              │
│                    │   RadarKeywordCard      │  ◄── CŒUR RÉUTILISÉ          │
│                    │   ───────────────────   │                              │
│                    │ • header (keyword,      │                              │
│                    │   intents, KPIs)        │                              │
│                    │ • body dépliable        │                              │
│                    │ • prop displayMode :    │                              │
│                    │   'kpi' | 'relevance'   │                              │
│                    └────────┬────────────────┘                              │
│                             │                                               │
│            ┌────────────────┼─────────────────┬─────────────────┐           │
│            ▼                ▼                 ▼                 ▼           │
│   ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│   │ KeywordWords    │ │ RadarCard    │ │ RadarCard    │ │ (badges +    │    │
│   │ (mots cliquab.  │ │ ScoreRing    │ │ PaaTree      │ │  KPIs inline)│    │
│   │  optionnels)    │ │ (anneau %)   │ │ (arbre PAA)  │ │              │    │
│   └─────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                             │
│             SOUS-COMPOSANTS BAS NIVEAU (purement visuels)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Légende** : `▼` = "contient / monte" (le parent rend ce composant). `◄──` = "réutilise le même composant" (un seul fichier, plusieurs call-sites).

## 2. Lecture par onglet

### Onglet Radar (scanner de douleur)

```
MoteurView → DouleurIntentScanner → DouleurScannerResults
          → RadarCardCheckable (checkbox)
          → RadarKeywordCard (mode 'kpi')
          → ScoreRing + PaaTree + KeywordWords
```

L'utilisateur scanne sa douleur, voit une liste de mots-clés candidats avec leur **Score KPI** (volume × difficulté × CPC × intent × PAA × autocomplete). Il en coche 5 à 10 — ce qui les ajoute au panier (basket) destiné au Capitaine.

### Onglet Capitaine (validation du mot-clé pivot)

```
MoteurView (ou LaboView) → CaptainValidation → CaptainRadarList
          → CaptainInteractiveWords
          → RadarCardLockable (cadenas + tag + recalc)
          → RadarKeywordCard (mode 'relevance')
          → ScoreRing + PaaTree + KeywordWords
```

L'utilisateur examine les mots-clés cochés en mode "Pertinence" (alignement avec la douleur de l'article). Il peut **verrouiller** un mot-clé comme pivot du Capitaine, **tagger manuellement** des mots (local / persona) et **recalculer la Pertinence** quand il a affiné le pain point.

## 3. Anatomie de chaque composant

### 3.1 `RadarKeywordCard.vue` — le cœur

**Rôle** : afficher une carte de mot-clé. Header en une ligne (chevron, keyword, badges intent, KPIs marché, anneau de score) + body dépliable (reasoning + arbre PAA).

**Props clés** :

| Prop | Type | Rôle |
|---|---|---|
| `card` | `RadarCard` | La donnée du mot-clé (kpis, paaItems, scores, reasoning, etc.) |
| `displayMode` | `'kpi' \| 'relevance'` | **Source du score affiché** (voir §4) |
| `articleLevel` | `ArticleLevel` | Pondération du calcul KPI (débutant / intermédiaire / expert) |
| `interactiveWords` | `InteractiveWordsProps?` | Active les mots cliquables du keyword (Capitaine seulement) |
| `modifiers` | `(ModifierKind \| null)[]?` | Tags par mot (`local` / `persona`) |
| `manualTagMode` | `boolean?` | Mode où un clic sur un mot cycle son tag |
| `articlePainPoint` | `string \| null?` | Permet au tooltip "Pertinence absente" de différencier les causes |

**Emits** : `word-toggle`, `modifier-untag`, `modifier-cycle`.

**Logique critique** :
- `displayedScore` est **strict** : pas de fallback `combinedScore` legacy (cf. [scoring-kpi-vs-relevance.md](scoring-kpi-vs-relevance.md)). Si le score est `null`, on affiche `—` et un tooltip explique pourquoi (`no-pain` / `no-signals` / `long-tail`).
- `isOffPain` (seuil 35) grise visuellement les cartes mal alignées avec la douleur, sans les rendre inactives.
- Les KPIs marché (volume / KD / CPC / PAA) sont **masqués** si `card.kpis === null` (cas longue-traîne) — pas de fallback fantôme.

### 3.2 `RadarCardCheckable.vue` — wrapper "Radar"

**Rôle** : ajouter une checkbox de sélection à gauche d'une `RadarKeywordCard`. C'est tout.

**Props** : `card`, `checked`, `disabled?`, `displayMode?`, `articleLevel?`, `modifiers?`.
**Emits** : `update:checked`, `modifier-untag`, `modifier-cycle`.

**Usage** : [DouleurScannerResults.vue](../src/components/intent/scanner/DouleurScannerResults.vue) (onglet Radar du Moteur) et [RadarPanel.vue](../src/components/intent/RadarPanel.vue).

Émet `check-completed` (workflow) côté parent quand la sélection franchit les seuils — voir [data-flows/completed-checks.md](data-flows/completed-checks.md).

### 3.3 `RadarCardLockable.vue` — wrapper "Capitaine"

**Rôle** : ajouter une **colonne d'actions** à gauche d'une `RadarKeywordCard` :

1. **Cadenas** — verrouille le mot-clé comme pivot du Capitaine.
2. **Bouton tag manuel** — active le mode où un clic sur un mot cycle son tag (`null` → `local` → `persona` → `null`). Réservé aux cas où la détection auto se trompe.
3. **Bouton recalcul Pertinence** — visible uniquement en mode `'relevance'`, désactivé si pas de painPoint OU validation en cours.
4. **Overlay de validation** — quand `validating=true`, voile la carte avec un spinner.

**Props** : `card`, `locked`, `interactiveWords?`, `displayMode?`, `articleLevel?`, `modifiers?`, `validating?`, `articlePainPoint?`.
**Emits** : `update:locked`, `word-toggle`, `modifier-untag`, `modifier-cycle`, `recompute-relevance`.

**Usage** : monté par [CaptainInteractiveWords.vue](../src/components/moteur/CaptainInteractiveWords.vue), lui-même monté par [CaptainRadarList.vue](../src/components/moteur/captain/CaptainRadarList.vue), affiché dans [CaptainPanel.vue](../src/components/moteur/CaptainPanel.vue).

### 3.4 Sous-composants bas niveau

| Composant | Rôle | Notes |
|---|---|---|
| [RadarCardScoreRing.vue](../src/components/intent/radar-card/RadarCardScoreRing.vue) | Anneau SVG circulaire avec valeur du score + tooltip de breakdown au survol | Affiche `—` si `hasScore=false`. Tooltip différencié selon `relevanceMissingReason`. |
| [RadarCardPaaTree.vue](../src/components/intent/radar-card/RadarCardPaaTree.vue) | Arbre PAA (parents/enfants) avec expand/collapse, badges de match (exact / sémantique / partiel / hors-sujet) | Émet `toggle-children` et `toggle-answer`. |
| [KeywordWords.vue](../src/components/intent/KeywordWords.vue) | Affiche les mots du keyword, optionnellement cliquables (Capitaine) avec sanctuarisation des N premiers mots significatifs | Cycle de tag manuel quand `manualTagMode=true`. |

## 4. La prop `displayMode` — la clé de la bimodalité

C'est la prop qui justifie pourquoi on n'a pas dupliqué le composant entre Radar et Capitaine.

| Mode | Onglet | Source du score | Calculé par | Peut être null ? |
|---|---|---|---|---|
| `'kpi'` | Radar | `computeKpiScore(card.kpis, articleLevel).total` | **Front** (recalcul à chaque rendu) | Oui — si `card.kpis === null` (longue-traîne) |
| `'relevance'` | Capitaine | `card.relevanceScore.total` | **Back** (au scan / validate) | Oui — si painPoint absent OU signaux nuls |

**Règle de cohérence affichage / calcul** (cf. [.claude/CLAUDE.md §2.0](../.claude/CLAUDE.md)) : la valeur affichée par `displayedScore` est la **même** que celle utilisée pour le tri dans `useSortableList`. Si tu touches l'une, vérifie l'autre.

**Pourquoi pas de fallback `combinedScore`** : `combinedScore` est un legacy qui mélangeait marché et pertinence. Il a été banni — voir [scoring-kpi-vs-relevance.md](scoring-kpi-vs-relevance.md). Si le score est `null`, on affiche `—` honnêtement plutôt que de masquer l'absence par un chiffre bricolé.

## 5. Données partagées (header `AUTHORITY:`)

`RadarKeywordCard` consomme principalement :

- **`card: RadarCard`** (cf. [shared/types/intent.types.ts](../shared/types/intent.types.ts)) — contient `kpis`, `relevanceScore`, `paaItems`, `intentType`, `scoreBreakdown` legacy.
- **`modifiers`** — provient du store `useKeywordModifiersStore` ([keyword-modifiers.store.ts](../src/stores/article/keyword-modifiers.store.ts)).

Pour les flux de données complets, voir :
- [data-flows/intent.md](data-flows/intent.md) — intent type + PAA tree.
- [data-flows/keyword-metrics.md](data-flows/keyword-metrics.md) — KPIs marché.
- [data-flows/score-capitaine.md](data-flows/score-capitaine.md) — score Pertinence backend.
- [data-flows/radar-explorations.md](data-flows/radar-explorations.md) — payload complet de la carte.

## 6. Tests

| Composant | Tests |
|---|---|
| `RadarKeywordCard` | [radar-keyword-card-display-mode.test.ts](../tests/unit/components/radar-keyword-card-display-mode.test.ts), [radar-keyword-card-interactions.test.ts](../tests/unit/components/radar-keyword-card-interactions.test.ts) |
| `RadarCardCheckable` | [radar-card-checkable.test.ts](../tests/unit/components/radar-card-checkable.test.ts) |
| `RadarCardLockable` | [radar-card-lockable.test.ts](../tests/unit/components/radar-card-lockable.test.ts) |

Voir [ui-sections-guide.md §1288-1290](ui-sections-guide.md) pour la liste détaillée des assertions couvertes.

## 7. Pièges historiques (à connaître avant de modifier)

1. **Fallback silencieux du score** — interdit. `displayedScore` retourne `null`, l'UI affiche `—`. Pas de `?? card.combinedScore`.
2. **KPIs masqués si `kpis === null`** — `v-if="card.kpis"` sur le bloc KPI. Pas de fallback `0` pour le tri non plus.
3. **Propagation de clic — REFONTE 2026-05-05** (FR-RAD-CARD-CHEVRON-TOGGLE) : `@click.stop="expanded = !expanded"` est UNIQUEMENT sur le **chevron** (icône triangle), pas sur tout le header. Le reste du header propage normalement vers `radar-list-item` qui ouvre le side panel. Avant cette refonte, le `@click.stop` couvrait tout le header et bloquait le side panel.
4. **Border verte du `lockable`** — supprimée en 2026-04-30 (doublure visuelle gênante). Le seul indicateur de verrouillage est le bouton cadenas qui passe en vert plein.
5. **Cohérence affichage / tri** — la même expression doit produire la valeur affichée et celle utilisée pour le tri. Si tu changes `displayedScore`, vérifie les composables de tri (`useSortableList`).
6. **Score Pertinence calculé à la volée** (FR-CAP-RELEVANCE-COMPUTED-LIVE, 2026-05-05) : `card.relevanceScore` n'est plus rapatrié depuis un snapshot Radar. Il est calculé à chaque hydratation Capitaine côté backend. Voir [data-flows/relevance-score-live-computation.md](data-flows/relevance-score-live-computation.md).
7. **Tooltip 5 causes typées** (FR-CAP-RELEVANCE-UNAVAILABLE-REASON, 2026-05-05) : ne plus deviner la cause de `relevanceScore = null` côté front. Lire le champ `unavailableReason` typé renvoyé par le backend.

## 8. Quand modifier ce composant ?

- ✅ Ajouter une nouvelle métrique au header → modifier `RadarKeywordCard`.
- ✅ Ajouter un nouveau bouton d'action côté Capitaine → modifier `RadarCardLockable`.
- ✅ Ajouter un nouveau type d'item PAA → modifier `RadarCardPaaTree`.
- ❌ Dupliquer la carte pour un troisième contexte → préférer un nouveau wrapper qui réutilise `RadarKeywordCard`.
- ❌ Ajouter un mode d'affichage `'mixed'` qui mélange KPI et Pertinence → c'est précisément ce qui a été banni (cf. `combinedScore` legacy).

## 9. Références croisées

- Bimodalité de score : [scoring-kpi-vs-relevance.md](scoring-kpi-vs-relevance.md)
- **Architecture live computation Pertinence** (FIGÉ 2026-05-05) : [data-flows/relevance-score-live-computation.md](data-flows/relevance-score-live-computation.md)
- Workflow Moteur global : [moteur-data-flow.md](moteur-data-flow.md)
- Améliorations UI Capitaine : [captain-ui-improvements.md](captain-ui-improvements.md)
- Crafting de mot-clé Capitaine : [captain-keyword-crafting.md](captain-keyword-crafting.md)
- Diagrammes de flux : [ARCHITECTURE_FLOWS.md](ARCHITECTURE_FLOWS.md)
- Tech-spec implémentation : [tech-spec-relevance-live-computation.md](../_bmad-output/implementation-artifacts/tech-spec-relevance-live-computation.md)
