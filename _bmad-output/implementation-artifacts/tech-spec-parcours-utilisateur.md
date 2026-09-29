---
name: tech-spec-parcours-utilisateur
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-29
synced_with:
  - spec/requirements.md (NFR-TEST-PARCOURS-TRACE)
  - spec/parcours/
  - spec/01-produit.md
  - design/07-tests-et-outillage.md
---

# Tech-spec — Les parcours utilisateur

## Contexte

Le 2026-09-29, après la recette exhaustive, Arnaud demande : « est-ce que tu ne penses pas qu'il serait judicieux de créer des use cases et des user journey dans un ou plusieurs fichiers ou dossiers ? »

- **Ce qui existe.** Un seul parcours est décrit : le chemin idéal, dans `spec/01-produit.md` (§ « Le parcours de bout en bout »). Il y a aussi une douzaine de tests navigateur « parcours », et 217 exigences fonctionnelles, chacune un petit cas d'utilisation.
- **Ce qui manque.** Les autres chemins réels de l'utilisateur ne sont écrits nulle part : reprendre un article, faire naître un enfant, choisir un mot-clé, améliorer un article rédigé, travailler en mode automatique, repartir après une panne.

## Décisions d'Arnaud

1. **Des parcours, pas de fichier « cas d'utilisation » séparé.** Les exigences jouent déjà ce rôle. Un second fichier les répéterait et finirait par les contredire.
2. **Tout de suite**, avant la recette.

## Solution

- `spec/parcours/README.md` : le sommaire, et comment lire un parcours.
- `spec/parcours/PU-0N-<slug>.md` : huit parcours.
  - **En-tête** : But, Quand, Départ, Arrivée, Recette, Test automatique.
  - **« Les étapes »** et **« Ce qui peut mal tourner »** : une section `### …` par étape ou par situation, chacune avec une ligne `**Exigences :** FR-… ⚠`.
  - **« Défauts connus sur ce parcours »** : les exigences non tenues citées.
- Aucun nom de fichier dans ces parcours (règle de `spec/`). Un test automatique qui suit un parcours le cite par son identifiant `PU-0N`, dans son en-tête de commentaire.
- `spec/01-produit.md` renvoie aux parcours ; `spec/README.md` les liste.

| Parcours | But |
|---|---|
| PU-01 | Créer un cocon et publier son pilier (le chemin idéal ; parcours express de la recette) |
| PU-02 | Faire naître un article d'une section du pilier, puis le publier |
| PU-03 | Reprendre un article commencé un autre jour |
| PU-04 | Trouver et choisir le bon mot-clé d'un article |
| PU-05 | Améliorer un article déjà rédigé, puis le (re)publier |
| PU-06 | Laisser le mode automatique produire un article, puis le relire |
| PU-07 | Comprendre et repartir quand quelque chose coince |
| PU-08 | Décrire une fois son activité pour que l'IA en tienne compte partout |

## Garde-fou

`tests/unit/architecture/parcours-trace.test.ts`, dans `verify` (dossier `architecture`), cite `NFR-TEST-PARCOURS-TRACE`. Il contrôle :
- les identifiants concordants ;
- un en-tête complet ;
- une ligne d'exigences par section, avec des identifiants existants ;
- un `⚠` qui suit le statut ;
- chaque non tenue citée présente dans les défauts connus ;
- une ligne « Test automatique » qui dit vrai (« aucun » si et seulement si aucun test ne cite le parcours).

La lecture des exigences est partagée avec `recette-coverage`, dans `tests/helpers/spec-requirements.ts`.

## Critères d'acceptation → tests

| Critère | Test |
|---|---|
| Chaque étape cite des exigences existantes, et `⚠` suit leur statut | `parcours-trace.test.ts` |
| Chaque non tenue citée est dans les défauts connus | `parcours-trace.test.ts` |
| « Test automatique » cohérent avec les tests qui citent le parcours | `parcours-trace.test.ts` |
| La recette reste gardée après la mise en commun du code de lecture | `recette-coverage.test.ts` |

## Réalisation

- **Test d'abord.** `parcours-trace` était rouge (sentinelle : aucun parcours), et `recette-coverage` restait vert après sa refonte.
- **Rédaction.** Les parcours ont été écrits par trois agents en parallèle, d'après `spec/`, la recette et le code.

## Livraison

- **Huit parcours**, de 8 à 12 étapes et de 5 situations « Ce qui peut mal tourner » chacun.
- **Six parcours sont cités par leurs tests automatiques**, par une ligne de commentaire en tête de 14 fichiers de test. PU-07 (quand ça coince) et PU-08 (décrire son activité) disent « aucun (manque) ».
- **Garde-fous verts.** `parcours-trace`, `recette-coverage` (après sa refonte sur l'aide commune) et `requirements-trace`.
- **Défauts révélés en écrivant les parcours, corrigés dans la doc sans choix à faire :**
  - `FR-FIN-LINK-REDACTION` passe non tenue : « Aller à la Rédaction → » n'ouvre pas l'article ;
  - `FR-RED-PROGRESS` passe non tenue, avec un critère de réouverture sur l'étape Article ;
  - cinq compléments de statut ;
  - un critère de reprise du Cerveau ;
  - une phrase fausse du design du mode automatique ;
  - la vérification CAP-20.
- **Décisions d'Arnaud consignées** (journal de recette, « Décisions d'Arnaud — 2026-09-29 (suite) ») :
  - Capitaine étudié au clic ;
  - « IA Brief » gardée ;
  - nouvelle `FR-RED-REAL-CLAIMS-PROVEN`, avec la recette RED-R6 ;
  - identité PropulSite voulue ;
  - le maillage du cocon, reste à brainstormer.
- **Restent hors de ce chantier :**
  - les exigences du mode automatique (plus tard) ;
  - une exigence pour l'écran « Matrice de Maillage Interne » ;
  - la reprise de la rédaction et du Cerveau par des tests ;
  - `tests/functional/workflow-generer.test.ts`, périmé (5 onglets au lieu de 7).

