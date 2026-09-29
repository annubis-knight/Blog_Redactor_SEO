---
title: Parcours utilisateur — sommaire
last_updated: 2026-09-29
synced_with:
  - spec/requirements.md (NFR-TEST-PARCOURS-TRACE)
  - spec/01-produit.md (§ Le parcours de bout en bout)
  - spec/18-recette-manuelle.md
---

# Parcours utilisateur

Un **parcours**, c'est **un but réel** de l'utilisateur, et **le chemin qu'il suit**, écran après écran, pour l'atteindre. Il compte aussi ce qui peut mal tourner en route.

Un parcours relie trois choses qui existent déjà :

| | Répond à | Où |
|---|---|---|
| Les **exigences** | Que doit savoir faire l'outil ? Une capacité à la fois : « étudier un mot-clé saisi à la main ». | [`requirements.md`](../requirements.md) |
| Les **parcours** (ici) | Comment l'utilisateur enchaîne ces capacités pour arriver à son but ? | ce dossier |
| La **recette** | Est-ce que ça marche vraiment, à la main ? | [`18-recette-manuelle.md`](../18-recette-manuelle.md) et [`recette/`](../recette/) |

Il n'y a pas de fichier « cas d'utilisation » à part : chaque exigence en est déjà un, à petite échelle.

## Les parcours

| Parcours | Le but de l'utilisateur |
|---|---|
| [PU-01](PU-01-premier-article-du-cocon.md) | Créer un cocon et publier son article pilier : le chemin idéal, que suit le parcours express de la recette |
| [PU-02](PU-02-article-enfant.md) | Faire naître un article d'une section du pilier, puis le publier |
| [PU-03](PU-03-reprendre-un-article.md) | Reprendre un article commencé un autre jour, sans rien perdre ni repayer |
| [PU-04](PU-04-choisir-le-mot-cle.md) | Trouver et choisir le bon mot-clé d'un article |
| [PU-05](PU-05-ameliorer-un-article-redige.md) | Améliorer un article déjà rédigé, puis le (re)publier |
| [PU-06](PU-06-mode-automatique.md) | Laisser le mode automatique produire un article, puis le relire |
| [PU-07](PU-07-quand-ca-coince.md) | Comprendre et repartir quand quelque chose coince (panne, plafond, redémarrage) |
| [PU-08](PU-08-decrire-son-activite.md) | Décrire une fois son activité pour que l'IA en tienne compte partout |

## Lire un parcours

- **En-tête** : le but, la situation réelle (« Quand »), le point de départ et d'arrivée. Puis ce qui le vérifie : la **recette** et le **test automatique**, ou « aucun (manque) ».
- **Les étapes** : ce que fait l'utilisateur et ce qu'il voit. Chaque étape cite les exigences qu'elle utilise (« **Exigences :** FR-… »).
- **Ce qui peut mal tourner** : une panne, un retour en arrière, un rechargement… et ce que l'outil doit faire.
- **⚠** après une exigence : elle est **non tenue**, c'est un défaut connu. Il est repris dans « Défauts connus sur ce parcours ».

## À quoi ils servent

- **Trier les défauts.** Un défaut sur PU-01, le chemin de tous les jours, passe avant un défaut sur un chemin rare.
- **Repérer un besoin oublié.** Une étape qui ne s'appuie sur aucune exigence signale un besoin jamais écrit.
- **Guider la recette et les tests.** Chaque parcours dit ce qui le vérifie. Un test automatique qui suit un parcours le cite par son identifiant (`PU-0N`).

## Garde-fou

Un test lancé par la vérification rapide du projet (`NFR-TEST-PARCOURS-TRACE`) contrôle quatre choses :
- chaque étape cite des exigences qui existent ;
- « ⚠ » suit leur statut, et chaque défaut connu est listé ;
- un parcours suivi par un test automatique est cité par ce test ;
- un parcours sans test automatique le dit.

Un parcours ne peut donc pas vieillir en silence.
