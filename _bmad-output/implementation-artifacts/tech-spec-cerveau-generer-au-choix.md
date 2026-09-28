---
name: tech-spec-cerveau-generer-au-choix
type: tech-spec
status: done
version: 1.1.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-CER-COCOON-PROGRESSIVE, amendée)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-CER-COCOON-PROGRESSIVE)
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (U7)
  - _bmad-output/implementation-artifacts/recette-manuelle-journal.md (R1)
  - docs/recette-manuelle.md (étape 1)
---

# Tech-spec — « Générer avec Claude » propose un choix (U7)

> **Révisée en 1.1.0 (recette, constat R1).** La version 1.0.0, décrite plus bas, faisait passer le choix
> « pilier » par le constructeur. La section « Révision 1.1 », en fin de document, la remplace.

## Contexte

Recette manuelle d'Arnaud, 2026-09-25, étape 1. Sur l'étape « Articles » du Cerveau, il a cliqué
« Générer avec Claude » en attendant une création pas à pas. Il a vu l'arbre entier du cocon.

Le code faisait ce que C7 prévoyait :
- le bouton ne dessine qu'une **carte indicative** (`proposedArticles`) et ne crée aucun article (vérifié en
  base : cocon 27413, 0 article) ;
- le vrai constructeur, qui crée les articles un par un, est le bloc « Construire le cocon »
  (`CocoonTreeBuilder.vue`), placé **au-dessus**.

Mais l'écran trompe : deux blocs se ressemblent. Celui du bas porte le bouton le plus visible, un titre
« Proposition d'articles », des colonnes Pilier / Intermédiaire / Spécialisé et des menus « + Ajouter ».
Il a l'air d'être le créateur.

## Besoin (Arnaud)

« Il devrait exister le choix au clic sur "générer via Claude", ça devrait être un dropdown, pas un bouton. »

## Solution

1. **`GenerateCocoonMenu.vue`** (nouveau) : un bouton « Générer avec Claude ▾ » qui ouvre un menu à
   deux choix.
   - **« Le pilier, puis un article à la fois »** (recommandé) : crée de vrais articles. Émet `pillar`.
     Il est désactivé quand le pilier existe déjà, ou que l'arbre n'est pas chargé ; le menu dit alors
     pourquoi.
   - **« La carte complète du cocon »** : un aperçu qui ne crée aucun article. Émet `map` ; c'est
     l'ancienne génération.

   Échap ou un clic à côté ferme le menu. Pendant la génération de la carte, le bouton affiche
   « Génération... » et reste désactivé.
2. **`BrainArticleProposalView.vue`** :
   - le bouton devient ce menu ;
   - le titre « Proposition d'articles » devient « Carte indicative du cocon » ;
   - nouvelles props `canStartPillar` et `hasPillar`, nouvel événement `start-pillar`.
3. **`CocoonTreeBuilder.vue`** expose `startPillar()`, `canStartPillar` et `hasPillar` (`defineExpose`).
   `startPillar()` fait défiler jusqu'au constructeur, puis lance **la même** proposition de candidats
   que « Créer le pilier » (`proposePillar`). Un seul chemin de création, deux portes d'entrée.
4. **`BrainPhase.vue`** relie les deux : une référence au constructeur, `@start-pillar`, et les
   props lues sur le constructeur.

Hors périmètre : les menus « + Ajouter » de la carte, qui n'agissent que sur la carte. La carte n'est
pas non plus rendue en lecture seule.

## Critères d'acceptation → tests

| Critère | Test |
|---|---|
| Le bouton ouvre un menu à deux choix, libellés et explications compris | `generate-cocoon-menu.test.ts` |
| « La carte complète » émet `map`, « Le pilier… » émet `pillar`, et le menu se ferme | `generate-cocoon-menu.test.ts` |
| Pilier existant, ou arbre pas prêt (chargement, erreur) : choix « pilier » désactivé, raison affichée | `generate-cocoon-menu.test.ts` |
| Échap ferme le menu ; pendant la génération, le bouton est désactivé | `generate-cocoon-menu.test.ts` |
| `startPillar()` lance la même proposition que « Créer le pilier », et rien quand le pilier existe | `cocoon-tree-builder.test.ts` |
| À l'étape Articles, le choix « pilier » appelle le constructeur | `brain-phase-architecture.test.ts` |
| Le panneau s'appelle « Carte indicative du cocon » | `production-phases.test.ts` |
| Navigateur : le menu « pilier » ouvre les candidats du pilier ; « carte » ne crée aucun article | `cerveau.parcours.test.ts` |

## Livraison

- Tests ciblés : 4 fichiers, 46 tests verts. Ils étaient rouges avant le code (6 échecs : composant absent, `startPillar` non exposé, ancien titre).
- Parcours navigateur `cerveau.parcours.test.ts` : 5 sur 5, en mode simulé sur la base de test. Le pilier naît par le menu, puis le choix est grisé.
- Types (vue-tsc) verts ; lint sans erreur. Les 16 avertissements existaient déjà : ce sont des `any` de `BrainPhase.vue`, hors des lignes touchées.
- Jeton `--color-primary-soft` (non défini) remplacé par `--color-bg-soft` pour le survol du bouton.

---

## Révision 1.1 — le menu fait grandir la carte, un article à la fois (recette R1)

### Contexte

Recette manuelle d'Arnaud, 2026-09-25, étape 1.6. Il a choisi « Le pilier, puis un article à la fois » : le
panneau des candidats du constructeur s'est ouvert. Ce n'est pas ce qu'il attendait.

### Besoin (Arnaud)

« Je préfèrerais que ça remplisse juste l'arbre, mais juste avec l'élément pilier. »

Il a précisé ensuite :
- l'arbre visé est la **carte indicative** : c'est un aperçu, rien n'est créé en base ;
- une fois le pilier posé, son choix est **grisé**, et « 1 article intermédiaire » apparaît ;
- dès qu'il y a un intermédiaire, « 1 article spécialisé » apparaît : Claude choisit l'intermédiaire parent ;
- la règle : **un article ne s'ajoute que si son parent existe** ;
- le mot-clé suit les principes de la carte complète : Claude le propose, sans le mesurer.

### Solution

1. **`GenerateCocoonMenu.vue`** : un menu progressif, qui lit le contenu de la carte.
   - **« Le pilier »** : actif tant que la carte n'a pas de pilier, **grisé** ensuite.
   - **« 1 article intermédiaire »** : n'apparaît que si la carte a son pilier.
   - **« 1 article spécialisé »** : n'apparaît que si la carte a au moins un intermédiaire.
   - **« La carte complète du cocon »** : inchangée. Elle remplace la carte actuelle, et le menu le dit.
   - En tête du menu : « Sur la carte seulement : aucun article n'est créé. »
   - Props : `isGenerating`, `hasPillar`, `hasIntermediate`. Événements : `add` (avec le niveau) et `map`.
2. **`BrainArticleProposalView.vue`**
   - `hasPillar` : un pilier **titré** existe dans la carte.
   - `hasIntermediate` : `intermediateTitles` n'est pas vide, avec la même règle (une ligne sans titre ne
     compte pas, car Claude ne pourrait pas y rattacher d'enfant).
   - Le choix émet `add-smart` avec son niveau. C'est **le même** `addSmartArticle` que « + Ajouter … ›
     Article complémentaire ».
   - Le bouton reste « Génération... » pendant la carte complète **et** pendant un ajout
     (`addingArticleLevel`).
3. **`addSmartArticle`** (existant, inchangé) : étape `add-article`, prompt `cocoon-add-article.md`. Claude
   reçoit les articles déjà sur la carte et rattache le nouveau à son parent : l'intermédiaire au pilier, le
   spécialisé à l'intermédiaire qui en a le plus besoin.
4. **`cocoon-add-article.md`** : la section Pilier demandait un pilier « complémentaire, d'un angle
   différent ». Si la carte n'a encore aucun pilier, Claude doit écrire le **pilier fondateur** du cocon, qui
   couvre son sujet principal, comme dans la carte complète.
5. **Fixture MOCK `cocoon-add-article`** : elle renvoyait toujours un spécialisé rattaché au pilier. Elle
   renvoie désormais le type demandé, rattaché à un parent présent dans la liste des articles existants. Sans
   cela, « Le pilier » n'ajoutait qu'un spécialisé en mode simulé, et le menu restait bloqué.
6. **Retrait du lien U7 avec le constructeur** : `startPillar`, `defineExpose` et la référence `ref="root"`
   (`CocoonTreeBuilder.vue`) ; la référence `treeBuilder` (`BrainPhase.vue`). Le constructeur garde son
   bouton « Créer le pilier » : c'est le seul chemin qui crée de vrais articles.

Libellés : « Le pilier », « 1 article intermédiaire », « 1 article spécialisé ». Le verbe « Créer » est
évité, pour ne pas confondre ces choix avec « Créer le pilier » du constructeur, qui crée un vrai article
(c'est la confusion qu'U7 corrigeait).

### Critères d'acceptation → tests

| Critère | Test |
|---|---|
| Carte vide : « Le pilier » actif, ni intermédiaire ni spécialisé proposés | `generate-cocoon-menu.test.ts` |
| Pilier présent : « Le pilier » grisé avec sa raison, « 1 article intermédiaire » proposé | `generate-cocoon-menu.test.ts` |
| Intermédiaire présent : « 1 article spécialisé » proposé | `generate-cocoon-menu.test.ts` |
| Chaque choix émet `add` avec son niveau, ou `map`, puis ferme le menu | `generate-cocoon-menu.test.ts` |
| Un choix dont le parent manque n'émet rien | `generate-cocoon-menu.test.ts` |
| Dans BrainPhase, le choix appelle l'ajout d'un article, sans passer par le constructeur | `brain-phase-architecture.test.ts` |
| Le menu lit la carte : un pilier sans titre ne compte pas | `brain-phase-architecture.test.ts` |
| MOCK : la réponse a le type demandé, et son parent existe dans la carte | `mock-add-article.test.ts` |
| Le prompt demande le pilier fondateur quand la carte n'en a pas | `cocoon-add-article-prompt.test.ts` |
| Navigateur, MOCK : pilier → intermédiaire → spécialisé sur la carte, 0 article en base | `cerveau.parcours.test.ts` |

### Livraison (1.1)

- Tests unitaires ciblés rouges d'abord : 16 échecs (menu, BrainPhase, réponse simulée, prompt), tous pour
  la bonne raison. Puis 70/70 verts sur les 7 fichiers touchés, dont `brain-paa-cascade` et
  `production-phases`, inchangés.
- Parcours navigateur `cerveau.parcours.test.ts` : 6/6, en mode simulé sur la base de test. Le nouveau
  parcours (pilier → intermédiaire → spécialisé, hiérarchie enregistrée, 0 article en base) a été écrit
  avec le code, pas avant.
- `npm run verify` vert (981 tests) ; `test:check` sans nouveau rouge ; `check:cycles` : aucun cycle.
- eslint sans erreur. Les 16 avertissements de `BrainPhase.vue` (des `any`) existaient déjà, hors des
  lignes touchées. `check:dead` ne signale aucun des fichiers touchés.
- Limites connues, déjà là avant la révision :
  - la carte et l'arbre sont deux listes. Un vrai pilier créé avec un autre titre que celui de la carte y
    ajoute une seconde ligne Pilier (`registerInStrategy`) ;
  - un ajout qui échoue laisse une ligne vide sur la carte, sans message (`addSmartArticle`, repli
    `addEmptyArticle`).
