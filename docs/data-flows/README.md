# Data Flows — discipline blog-redactor-seo

Ce dossier contient les **cartographies des données partagées** du projet : pour chaque donnée critique (score, identifiant, état persisté, payload cross-modules), un fichier décrit ses producteurs, sa persistance et ses consommateurs.

## Pourquoi cette discipline existe

Les données partagées sont la première source de bugs subtils dans une app web :

- **Drift affichage vs calcul** — la valeur montrée à l'utilisateur n'est pas celle utilisée pour le tri ou le filtre. L'utilisateur clique sur « trier par score » et la liste ne bouge pas.
- **Fallback silencieux** — `?? 0` sur un score absent fait mentir le tri sans signaler l'absence de donnée. La règle ESLint `no-restricted-syntax` (eslint.config.ts:49-78) bloque ce pattern.
- **Strings hardcodées** — au lieu d'utiliser une constante (`MOTEUR_CAPITAINE_LOCKED`), un composant écrit `'capitaine_locked'`. À la prochaine refonte, certains usages migrent et d'autres pas.
- **Cache divergent** — la même donnée vit en cache, en store, en DB. Personne ne sait qui a l'autorité.
- **Reload différent du premier load** — la donnée est créée par un chemin et restaurée par un autre, et les deux ne produisent pas exactement la même chose.

## Comment ce dossier est structuré

```
docs/data-flows/
├── README.md                    # ce fichier
├── _template.md                 # squelette à copier
├── _audit-YYYY-MM-DD.md         # rapports d'audit générés
├── score-capitaine.md           # Scoring Marché + Pertinence article Capitaine (2026-05-04)
├── relevance-score-live-computation.md  # Architecture live computation Pertinence + persistance racines (2026-05-05) — DOC FIGÉE
├── strategy-context.md          # Contexte stratégique Brain-First + painPoint injection IA (2026-05-04)
├── completed-checks.md
├── keyword-metrics.md
└── ...
```

Préfixes de checks détectés/configurés dans ce projet : `moteur:`, `cerveau:`, `redaction:` (cf. `shared/constants/workflow-checks.constants.ts`).

## Comment ajouter une cartographie

```
/data-flow-discipline cartographier <nom-de-la-donnée>
```

Le skill te pose les questions par bloc (producteurs / persistance / consommateurs / cas d'usage / régressions historiques) et génère le fichier.

## La règle de cohérence (la plus violée)

> Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout (item placé en bas du tri, exclu de la moyenne).

## Header AUTHORITY

Chaque store, service ou composable qui touche une donnée partagée DOIT porter en tête un commentaire qui rend le flux **cherchable** :

```typescript
/**
 * AUTHORITY: PostgreSQL `articles.completed_checks` TEXT[]
 * READS FROM: GET /articles/:id (hydrate au mount)
 * WRITES TO: POST /progress/check (action addCheck)
 * CONSUMERS: ArticleListItem dots, PhaseTransitionBanner, FinalisationRecap
 * RELATED FR: FR-MOT-CHECKS, NFR-INT-COMPLETED-CHECKS-SSOT
 */
```

Pas de structure rigide — un format texte cherchable suffit. `grep "AUTHORITY: PostgreSQL articles.completed_checks"` doit te renvoyer tous les fichiers qui parlent à cette donnée.

## Audit régulier

```
/data-flow-discipline audit
```

Produit un rapport des violations (fallbacks silencieux, strings hardcodées, fetch directs, fichiers > 400 lignes, données cartographiées sans tests).

## Tests de cohérence

Pour chaque donnée cartographiée, écrire **au moins un test** dans `tests/unit/coherence/` qui vérifie que l'affichage et le calcul utilisent la même expression. Un template existe dans `_template.test.ts`.

Convention : préfixer le `describe()` par l'ID de l'exigence du PRD (`FR-CAP-SCORING-BIMODAL`, `FR-MOT-CHECKS`, etc.) — cela crée la traçabilité tests ↔ exigences. PRD à `_bmad-output/planning-artifacts/prd.md`.
