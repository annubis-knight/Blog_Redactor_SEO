---
title: Journal de recette manuelle
last_updated: 2026-09-28
synced_with:
  - spec/18-recette-manuelle.md
  - _bmad-output/implementation-artifacts/tech-spec-cerveau-generer-au-choix.md
---

# Journal de recette manuelle — 2026-09-25

- **Mode :** MOCK
- **Branche :** `feat/cerveau-generer-au-choix`. La recette a porté sur l'arbre de travail, avant tout commit
  de la révision : les références de code d'un constat décrivent l'état **au moment du constat** (commit
  `0f16e87`), sauf mention contraire. Le correctif de R1 est le commit `60b9818`.
- **Règle :** on note, on ne corrige pas. Les correctifs se font ensemble à la fin.

**Taille du correctif :** XS (< 15 min) · S (< 1 h) · M (demi-journée) · L (plus).

## Constats

<!-- Un bloc par constat, numérotés R1, R2… -->

### R1 — « Le pilier, puis un article à la fois » ouvre le panneau des candidats

- **Étape :** 1.6
- **Vu :** dans « Générer avec Claude ▾ », le choix « Le pilier, puis un article à la fois » déclenche « Créer le pilier » et ouvre le panneau des candidats (`cocoon-candidates-panel`).
- **Attendu par Arnaud :** une génération du même type que « La carte complète du cocon », qui remplit l'arbre avec **le pilier seul**.
- **Verdict :** comportement prévu, donc **demande d'évolution** (pas un bug).
- **Cause :** choix de conception U7, fait aujourd'hui : « un seul chemin de création, deux portes d'entrée ».
  - `CocoonTreeBuilder.vue:89-93` (au commit `0f16e87` ; `startPillar()` a été retiré par le correctif) : `startPillar()` appelle `proposePillar()`, c'est-à-dire le même panneau que le bouton du haut.
  - `tech-spec-cerveau-generer-au-choix.md` § Solution, point 3.
  - Ce qui s'en rapproche le plus : la carte complète (`generation.ts:53-72`) fait d'abord un appel `articles-structure` qui renvoie **Pilier + Intermédiaires ensemble**. Aucun appel ne renvoie le pilier seul.
- **Décision d'Arnaud :**
  - le pilier va dans la **carte indicative** : c'est un aperçu, aucun article réel n'est créé ;
  - le mot-clé suit **les mêmes règles que la carte complète**. Claude invente le titre, le `suggestedKeyword` et le slug à partir de la stratégie et des pistes cochées (`server/prompts/cocoon-articles.md`, § Mission structure). Le mot-clé n'est pas mesuré.
- **Règle voulue** (précisée par Arnaud) : le menu fait grandir la carte **un article à la fois**, et un article ne s'ajoute que si son parent existe dans la carte. Les libellés ci-dessous sont ceux de la discussion ; les libellés livrés sont « Le pilier », « 1 article intermédiaire », « 1 article spécialisé » (cf. correctif).
  1. Carte sans pilier : le choix du pilier est actif.
  2. Pilier présent : ce choix est **grisé**, et le choix « 1 article intermédiaire » apparaît.
  3. *(Supposé pendant la recette, puis retenu et livré ; à revérifier à l'écran)* Au moins un intermédiaire présent : le choix « 1 article spécialisé » apparaît. Chaque clic ajoute un article.
- **Correctif retenu :** réutiliser `addSmartArticle(type)` (`useArticleProposals.ts:109-154`). Il existe déjà derrière « + Ajouter … › Article complémentaire » :
  - Claude ajoute **un** article du niveau demandé, en connaissant ceux qui sont déjà dans la carte (étape `add-article`, `cocoon-add-article.md`) ;
  - le parent se rattache tout seul : l'intermédiaire au pilier (`cocoon-add-article.md:67` après correctif), le spécialisé à l'intermédiaire qui a le moins de spécialisés, ou dont un angle reste non couvert (`:76-77` après correctif) ;
  - il a une réponse simulée pour le mode MOCK (`mock-fixtures/strategy.ts:172` au moment du constat).
  Aucun nouveau prompt n'est à écrire. Deux compléments se sont révélés nécessaires en corrigeant (cf. « Corrigé le 2026-09-25 ») : la règle Pilier du prompt, et la réponse simulée, qui renvoyait toujours un spécialisé.
- **À modifier :**
  - `GenerateCocoonMenu.vue` : choix progressifs, calculés d'après le contenu de la carte (`proposedArticles`) et non plus d'après l'arbre réel. L'explication « Crée de vrais articles… » disparaît ;
  - `BrainArticleProposalView.vue` et `BrainPhase.vue` : relier les choix à `addSmartArticle`, et retirer le lien avec `CocoonTreeBuilder.startPillar()`. Ce `defineExpose` devient inutile ;
  - les tests : menu, BrainPhase, CocoonTreeBuilder, parcours `cerveau` ;
  - la recette (étape 1, geste 6 et « Tu dois voir »), la tech-spec U7, puis la PRD et le design registry (`FR/DESIGN-CER-COCOON-PROGRESSIVE`).
- **Taille :** M (le code est S, le reste vient des tests et de la doc).
- **Corrigé le 2026-09-25**, à la demande d'Arnaud, sur `feat/cerveau-generer-au-choix` (tech-spec U7, révision 1.1, commit `60b9818`) :
  - libellés retenus : « Le pilier », « 1 article intermédiaire », « 1 article spécialisé ». Le verbe « Créer » est évité, pour ne pas confondre ces choix avec « Créer le pilier » du constructeur ;
  - la réponse simulée d'un ajout d'article suit désormais le niveau demandé. Avant, c'était toujours un spécialisé : en MOCK, « Le pilier » n'aurait rien donné ;
  - le prompt `cocoon-add-article.md` demande le pilier **fondateur** quand la carte n'en a pas, et non plus un pilier « complémentaire ».
- **À savoir en recette :**
  - la carte et l'arbre sont deux listes. Si le vrai pilier (« Créer le pilier ») a un autre titre que celui de la carte, la carte en montre deux (`registerInStrategy`, `useCocoonBuilder.ts:205` et suiv.). C'était déjà le cas avec la carte complète ;
  - si Claude échoue pendant un ajout, une ligne vide apparaît sur la carte, sans message. C'est l'ancien repli de `addSmartArticle` (`useArticleProposals.ts:146-150`), déjà là avant.

## Récapitulatif

| # | Étape | Verdict | Taille | Statut |
|---|---|---|---|---|
| R1 | 1.6 | Évolution (prévu par U7) | M | Corrigé (`60b9818`), à revérifier à l'écran |
