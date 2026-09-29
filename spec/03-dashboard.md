---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Dashboard et page du cocon

L'accueil est le point d'entrée de l'outil. Il montre le plan éditorial : les silos (les grands thèmes du site), les cocons de chaque silo (un cocon est un groupe d'articles liés autour d'un même sujet) et leur avancement. Un clic sur un cocon ouvre sa page, d'où l'on entre dans l'un des trois ateliers : Cerveau, Moteur, Rédaction.

## L'accueil
*Exigences : FR-DASH-NAV, FR-DASH-COCOON-CREATE*

**Ce que l'on voit, de haut en bas :**

- Le titre et la description du thème. La configuration du thème ne saisit pas de nom : en pratique, l'accueil reprend le nom et la description du premier silo (« Plan Éditorial » tant que rien n'est chargé).
- Trois accès en haut à droite : « Maillage », « GSC », et une roue dentée « Configuration du thème ».
- Quatre compteurs : « Silos », « Cocons », « Articles », « Progression » (en %). Ils sont masqués pendant le chargement, en cas d'erreur, ou s'il n'y a aucun silo.
- Chaque silo, dans une carte :
  - son nom (un lien vers la page du silo, doublé d'une roue dentée « Configuration du silo » qui mène à la même page) et sa description ;
  - « N cocons · N articles · P % » et une barre d'avancement (verte à 100 %) ;
  - un carrousel horizontal de ses cocons, avec des flèches quand tout ne tient pas à l'écran.
- Chaque carte de cocon : son nom, « N articles | N Pilier N Inter. N Spéc. », une barre d'avancement et « P % complété ». Un clic ouvre la page du cocon.

**Avancement.** L'avancement d'un cocon est la part de ses articles au statut « brouillon » ou « publié ». Celui d'un silo porte sur tous ses articles. La « Progression » globale en est la moyenne pondérée par le nombre d'articles.

**Chargement.** Trois cartes grises s'affichent pendant le chargement. En cas d'erreur, un message et « Réessayer ».

**Créer un cocon.**

1. Chaque carrousel se termine par une carte en pointillés « Nouveau cocon ».
2. Un clic (ou Entrée) la change en champ « Nom du cocon... ».
3. Entrée crée le cocon. Quitter le champ le crée aussi s'il n'est pas vide, sinon annule. Échap annule.
4. Le cocon créé s'ouvre aussitôt sur sa page.

Un nom déjà pris dans le même silo est refusé, et rien n'est créé.

**Limites connues.**
- Un refus de création remplace toute la liste des silos par le message d'erreur du serveur, en anglais (« Cocoon "…" already exists in silo "…" »), avec « Réessayer ».
- L'écran ne crée pas de silo, et ne supprime ni ne renomme un cocon.

## La page d'un silo
*Exigences : FR-DASH-NAV*

- En tête : le fil d'Ariane (Dashboard / silo), le nom et la description du silo.
- Des compteurs : « Cocons », « Articles », « Par type » (« N Pilier », « N Inter. », « N Spéc. »), « Par statut » (« N À rédiger », « N Brouillon », « N Publié »), « Progression ».
- Sous « Cocons sémantiques », une ligne par cocon : son nom, « N articles », une barre et son pourcentage. Un clic ouvre la page du cocon.
- Un silo inconnu affiche « Silo introuvable. » et « ← Retour au dashboard ».

## La page d'un cocon : trois cartes
*Exigences : FR-DASH-WORKFLOW-CHOICE, FR-DASH-NAV*

En tête : le fil d'Ariane (Dashboard / silo / cocon), le nom du cocon, « N articles · P % complété ». Puis « Choisissez une phase de travail : » et trois cartes.

| Carte | Texte | Repère | Ouvre |
|---|---|---|---|
| « Cerveau » | « Brainstorming stratégique : cible, douleur, angle, promesse, CTA et aiguillage articles » | « 6 étapes » (toujours) | le Cerveau du cocon |
| « Moteur » | « Exploration, intention, local, concurrents, mots-clés et audit DataForSEO » | « N mots-clés » (le pool de mots-clés du cocon) | le Moteur du cocon |
| « Rédaction » | « Stratégie article, brief, sommaire et rédaction pour chaque article du cocon » | « N articles, P % » | la liste des articles du cocon, à rédiger |

**Règles.**
- Aucune carte n'est désactivée : on entre par celle que l'on veut, dans l'ordre que l'on veut.
- Dans la Rédaction, l'étape de génération d'un article reste verrouillée tant que le Cerveau du cocon n'est pas terminé (voir [Rédaction](13-redaction.md)).
- La page ne liste pas les articles. On les trouve dans la Rédaction (trois colonnes Pilier / Intermédiaire / Spécialisé, un clic ouvre l'article), dans la liste du haut du Moteur et dans l'arbre du Cerveau.

## Les points de progression des articles
*Exigences : FR-DASH-PROGRESS*

Six points s'affichent à côté de chaque article dans les listes du haut du Moteur (« Articles suggérés », « Articles publiés »). Ils s'affichent aussi dans la même liste, en lecture seule, en haut de la Rédaction.

- Deux groupes : Explorer (Discovery, Radar), puis Valider (Capitaine, Lieutenants, Structure, Lexique).
- Plein = étape franchie ; vide = restante. Le nom de l'étape s'affiche au survol.
- Pour un lecteur d'écran : « Progression : n sur 6 ».
- Verrouiller ou déverrouiller une étape dans le Moteur met le point à jour aussitôt, sans recharger la page.
- Un article de la carte du Cerveau qui n'est pas encore créé a six points vides.

Les cartes de l'accueil n'ont aucun point. Le Cerveau n'a pas de points : sa progression se lit dans sa barre d'étapes. L'étape « premier jet accepté » de la Rédaction n'est pas un point non plus (cf. « Rédigé » ci-dessous).
