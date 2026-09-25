---
name: tech-spec-cerveau-generer-au-choix
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-CER-COCOON-PROGRESSIVE, amendée)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-CER-COCOON-PROGRESSIVE)
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (U7)
  - docs/recette-manuelle.md (étape 1)
---

# Tech-spec — « Générer avec Claude » propose un choix (U7)

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
