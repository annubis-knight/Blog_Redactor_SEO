---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — cadre commun

Le Moteur est la deuxième étape du parcours d'un cocon (un groupe d'articles liés autour d'un même sujet), entre le Cerveau (la stratégie) et la Rédaction. On l'ouvre depuis la page du cocon, carte « Moteur ». On y choisit, pour un article à la fois, ses mots-clés : le Capitaine (le mot-clé principal), les Lieutenants (les mots-clés secondaires, futurs titres de parties), la Structure (le plan H1/H2/H3), le Lexique (le vocabulaire du métier). Cette section décrit ce qui est commun à tous les onglets ; chaque onglet a sa propre section (§ 11 à § 17).

## L'écran à l'ouverture
*Exigences : FR-MOT-ARTICLE-SELECTION, FR-MOT-RECAP-PUBLISHED, FR-MOT-RECAP-LOCK-SYNC, FR-MOT-CANNIBALIZATION, FR-MOT-DISPLAY-FROM-STORE*

De haut en bas :

1. Un fil d'Ariane : « Dashboard › {silo} › {cocon} › Moteur ».
2. « Contexte stratégique » (repliable), si le Cerveau en a posé un : Cible, Douleur, Angle, Promesse, CTA.
3. « Articles suggérés (N) » (repliable) : les articles proposés par la stratégie du cocon, groupés par niveau (pilier, intermédiaire, spécialisé ; le badge affiche « PILIER », « INTERMEDIAIRE », « SPECIFIQUE »).
4. « Articles publiés (N) » (repliable, avec un cadenas) : les articles du cocon entrés en rédaction ou publiés.
5. Sans article choisi : « Sélectionnez un article ci-dessus pour accéder au Moteur. »

Les trois blocs repliables fonctionnent comme des onglets radio : en ouvrir un referme l'autre.

Chaque ligne d'article montre :

| Élément | Règle |
|---|---|
| Titre | — |
| Icône d'alerte | Visible si un autre article du cocon porte le même mot-clé (casse ignorée). Infobulle : « Cannibalisation : un autre article utilise le même capitaine ». |
| Six points de progression | Deux groupes : Discovery, Radar · Capitaine, Lieutenants, Structure, Lexique. Point plein = étape franchie. |
| Mot-clé | Le Capitaine verrouillé s'il existe, sinon le mot-clé suggéré. Pointillé et estompé tant qu'il n'est qu'une suggestion, plein une fois verrouillé. |

Le mot-clé affiché passe de « suggéré » à « verrouillé » dans la seconde qui suit le verrouillage, et inversement, sans rechargement. Un mot-clé enregistré vide compte comme absent. Pour l'article choisi, le mot-clé affiché suit le Capitaine en cours.

**Limites actuelles.**
- « Articles suggérés » reprend toutes les propositions de la stratégie, sans regarder leur phase : un article déjà en rédaction apparaît aussi dans « Articles publiés ».
- L'alerte de cannibalisation compare aussi les mots-clés simplement suggérés. Elle ne dit pas quel article est concerné. Les cartes du Radar et du Capitaine n'ont pas d'alerte.
- Une proposition de la stratégie qui n'a pas encore d'article en base peut être choisie, mais aucune étape n'est enregistrée pour elle.

**La phase d'un article** (proposé, moteur, rédaction, publié) avance seule : un contenu non vide enregistré le fait entrer en rédaction, la publication le fait passer à « publié ». Elle ne recule jamais.

## Choisir un article
*Exigences : FR-MOT-ARTICLE-SELECTION, FR-MOT-PHASES, FR-MOT-CROSS-TAB-PAYLOAD*

Un clic sur une ligne choisit l'article. Un second clic sur la même ligne le désélectionne.

Au choix d'un article :
- le bloc ouvert (suggérés ou publiés) se referme ;
- les onglets s'activent ;
- l'outil ouvre le premier onglet utile :

| Étapes déjà franchies | Onglet ouvert |
|---|---|
| aucune | Capitaine |
| Capitaine verrouillé | Lieutenants |
| Lieutenants verrouillés | Structure |
| Structure validée | Lexique |
| les quatre | Lexique (jamais Finalisation) |

- les données en transit entre onglets (liste envoyée au Radar, cartes envoyées au Capitaine, racines envoyées aux Lieutenants, sélection de Lieutenants) sont vidées ;
- les décisions, explorations et le Radar de l'article sont relus en base.

**Limite actuelle.** L'onglet Discovery garde ses résultats et ses cases cochées d'un article à l'autre ; seul le mot-clé racine change. Des mots-clés cochés pour un article peuvent donc être envoyés au Radar d'un autre.

> **En situation.** L'utilisateur choisit « Calcul indemnité rupture conventionnelle », dont le Capitaine et les Lieutenants sont verrouillés. Le Moteur s'ouvre sur Structure. Il clique à nouveau sur le titre : l'article est désélectionné, les onglets se grisent.

## La barre d'onglets
*Exigences : FR-MOT-PHASES, FR-MOT-FREE-NAV, FR-MOT-SOFT-GATING*

La barre d'onglets du Moteur s'affiche dans la barre de navigation générale :

| Groupe | Onglets |
|---|---|
| 1 Générer | Discovery, Radar |
| 2 Valider | Capitaine, Lieutenants, Structure, Lexique |
| 3 Finaliser | Finalisation |

- Un clic sur un onglet l'ouvre, quel que soit l'avancement.
- Un clic sur le titre d'un groupe ouvre son premier onglet disponible.
- Un onglet ouvert une fois garde son état quand on en change.

Un onglet est désactivé dans deux cas seulement :

| Cas | Onglets | Infobulle |
|---|---|---|
| Aucun article choisi | tous | « Sélectionnez un article ci-dessus » |
| Le mot-clé de l'article n'est plus « suggéré » au niveau du cocon (validé ou rejeté) | Discovery, Radar | « Mots-clés déjà validés — onglet verrouillé » |

Si l'onglet Discovery ou Radar est affiché alors qu'il est verrouillé, un bandeau dit « Les onglets Discovery et Radar sont verrouillés car des mots-clés sont déjà validés pour cet article. », avec un bouton « Voir le Capitaine → ».

**Verrouillage doux.** On peut toujours ouvrir un onglet. Ce sont les gestes qui figent un choix qui attendent les étapes précédentes :
- onglet Lexique : tant que le Capitaine n'est pas verrouillé, un bandeau dit « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. » ;
- onglet Structure : il invite à retenir un Lieutenant d'abord (voir [Moteur — Structure](10-structure.md)) ;
- Rédaction : fermée tant qu'un des quatre verrous manque (voir [Moteur — Finalisation](12-finalisation.md)).

## Les étapes de progression
*Exigences : FR-MOT-CHECKS, FR-MOT-CHECKS-CONSTANTS, FR-MOT-WORKFLOW-GATING-DUAL, FR-MOT-CHECK-RECONCILIATION, FR-MOT-LOCK-DERIVED, FR-DIS-CHECK, FR-FIN-CHECK*

Le Moteur enregistre six étapes par article :

| Point | Étape | Posée par | Porte | Retirée quand |
|---|---|---|---|---|
| 1 | Discovery faite | l'envoi d'une sélection au Radar | non | jamais par l'écran |
| 2 | Radar fait | un scan Radar qui renvoie un résultat | non | jamais par l'écran |
| 3 | Capitaine verrouillé | le verrouillage du Capitaine | oui | le déverrouillage |
| 4 | Lieutenants verrouillés | le premier Lieutenant retenu | oui | plus aucun Lieutenant retenu |
| 5 | Structure validée | « Valider la structure » | oui | une structure validée modifiée puis enregistrée ; un changement des Lieutenants retenus ; le retrait de l'étape Capitaine ou Lieutenants |
| 6 | Lexique validé | le premier terme retenu | oui | plus aucun terme retenu |

Une « porte » est un contrôle de qualité fait par le serveur avant d'accorder l'étape. Si elle refuse, l'étape n'est pas cochée et l'écran ouvre l'alarme de la porte (règles et dérogations : voir [Infrastructure transversale](16-infrastructure.md), « Les portes de qualité et l'alarme graduée »). Si l'utilisateur déroge, l'étape est redemandée. Si elle est encore refusée, un message dit « Étape toujours refusée : N point(s) à revoir. »

Règles :
- Un point ne se remplit qu'après la réponse du serveur. Une étape refusée ne s'affiche jamais cochée.
- Les noms d'étapes suivent le format `moteur:<action>`. Le serveur refuse un nom mal formé. Il accepte en revanche un nom inventé au bon format.
- Il n'existe pas d'étape « Finalisation ».
- La progression d'un article porte aussi une étape de la Rédaction, « Premier jet accepté ». Elle n'a pas de point dans le Moteur.

**Réconciliation.** À la première ouverture des onglets Capitaine, Lieutenants et Lexique pendant la visite du Moteur, l'outil compare l'étape enregistrée aux données :

| Données | Étape | Action |
|---|---|---|
| vides | présente | l'étape est retirée |
| présentes | absente | l'étape est demandée (par la porte pour Lieutenants et Lexique) |
| cohérentes | cohérente | rien |

L'onglet Structure ne réconcilie pas. Tant que les décisions du nouvel article ne sont pas arrivées, l'état « verrouillé » affiché est celui de l'étape enregistrée.

> **En situation.** L'utilisateur verrouille « indemnité rupture conventionnelle 2026 » : le troisième point se remplit. Il déverrouille pour tester un autre mot-clé : le troisième point se vide, et le cinquième aussi si la structure était validée.

## Passer d'un onglet à l'autre
*Exigences : FR-MOT-PHASE-TRANSITION, FR-MOT-CROSS-TAB-PAYLOAD, FR-MOT-BASKET-DEPRECATED*

En bas de l'écran :
- « ← Retour au cocon », toujours ;
- « Continuer vers {onglet suivant} → » sur les six premiers onglets (par exemple « Continuer vers Structure → » depuis Lieutenants) ;
- « Continuer vers la Rédaction → » sur Finalisation (règle des quatre verrous).

L'outil ne change jamais d'onglet tout seul, sauf après un bouton « Envoyer au… » :

| Depuis | Bouton | Ce qui passe | Onglet ouvert |
|---|---|---|---|
| Discovery | « Envoyer au Radar → » | les mots-clés cochés, avec leur raison si l'IA en a donné une | Radar |
| Radar | envoi au Capitaine | les cartes cochées, sans doublon | Capitaine |
| Capitaine | envoi aux Lieutenants | les mots-clés racines | Lieutenants |
| Lieutenants | — | les Lieutenants retenus nourrissent la Structure et le Lexique | — |

Il n'y a pas de panier en mémoire : les mots-clés envoyés au Radar sont enregistrés sur l'article et reviennent au rechargement.

## Ce que coûte la navigation
*Exigences : FR-MOT-NO-AUTO-ACTION, FR-MOT-CACHE-CASCADE, FR-MOT-RAW-KPIS*

Choisir un article ou ouvrir un onglet relit la base : progression, décisions, explorations, Radar de l'article, compteurs, capitaines du cocon. Deux cas font plus que relire (ci-dessous).

**Une exception.** Ouvrir l'onglet Capitaine lance le jugement par l'IA des questions « Autres questions posées » (PAA, les questions que Google affiche sous ses résultats). Il porte sur chaque mot-clé exploré qui a des questions, si la douleur de l'article fait au moins 10 caractères. Le résultat est gardé en mémoire pour la session : revenir sur l'article ne relance rien, un rechargement de la page si.

Toutes les autres actions payantes partent d'un geste : « Découvrir », « Courte-traîne IA », l'analyse IA, le scan Radar, et la case d'un mot-clé en Discovery (voir « Pré-analyse Capitaine »).

**Limite actuelle.** Ouvrir l'onglet Lexique, Capitaine verrouillé, relit en base l'extraction du lexique. Si elle manque mais que les pages concurrentes sont déjà lues, l'outil recalcule l'extraction sur place. Dès qu'une extraction est affichée sans recommandations enregistrées, l'analyse IA du lexique part seule, et elle est payante (détail : [Moteur — Lexique](11-lexique.md)).

**Réutilisation avant paiement :**

| Donnée | Réutilisée pendant |
|---|---|
| Suggestions Google (Discovery) | 1 heure |
| Mots-clés DataForSEO d'un mot-clé racine (Discovery) | 24 heures |
| Réponses brutes DataForSEO | 7 jours |
| Métriques d'un mot-clé scanné au Capitaine, pour tous les articles | 7 jours |
| Découverte complète sauvegardée | jusqu'à « Rafraîchir » |

Les appels d'IA de Discovery (génération, filtre, analyse) ne sont pas réutilisés, sauf en rechargeant une découverte sauvegardée.

**Métriques absentes.** Une métrique de marché inconnue s'affiche « — » ou n'est pas affichée, jamais « 0 ».

## Le contexte donné à l'IA
*Exigences : FR-MOT-PAINPOINT-INJECTION, FR-MOT-STRATEGY-INJECTION, FR-PAIN-IMMUTABLE-AFTER-CEREVEAU*

| Analyse | Douleur de l'article | Stratégie du cocon |
|---|---|---|
| Conseil IA du Capitaine | oui, « (non défini) » si absente | non |
| Propositions de Lieutenants | oui, « (non défini) » si absente | oui |
| Structure | oui | oui |
| Lexique (analyse IA) | oui | oui |
| Lexique (suggestion) | oui | oui |
| Discovery : génération IA | oui, sinon le mot-clé racine | non |
| Discovery : filtre et analyse | si au moins 10 caractères | non (contexte métier du site à la place) |

La douleur et la stratégie sont relues en base à chaque demande. Aucun écran du Moteur ne propose de changer la douleur. Limite connue : aucun autre écran non plus, pas même le Cerveau ; la douleur d'un article est fixée à sa création.

## La barre « Résultats déjà calculés »
*Exigences : FR-MOT-EXPLORATION-COUNTS, FR-MOT-CACHE-PANEL-COUNT, FR-MOT-EXPLORATIONS-HYDRATATION, FR-MOT-EXTERNAL-CACHE-CLEAR*

Quand un article est choisi, une barre fixe en bas d'écran s'intitule « Résultats déjà calculés ». Elle porte quatre puces : Radar, Capitaine, Lieutenants, Lexique. Chaque puce montre « DB n » (enregistré en base) et « C n » (en mémoire, non encore sauvegardé), même à 0.

| Puce | « DB » compte | Infobulle |
|---|---|---|
| Radar | les mots-clés en attente + les cartes scannées | « Score N/100 » si un scan est connu |
| Capitaine | tous les mots-clés testés, verrouillés ou non | « n mots-clés testés », « … — verrouillé : X » |
| Lieutenants | toutes les propositions enregistrées | « n propositions en base · k verrouillés » |
| Lexique | toutes les extractions | « n extractions · k termes validés » |

Les compteurs se relisent après chaque étape ajoutée ou retirée et à chaque changement d'article.

Dans les onglets Radar, Capitaine, Lieutenants et Lexique, si la puce de l'onglet n'est pas à zéro, une invite « Charger {onglet} » s'affiche à côté. Elle propose un bouton « DB n » et, s'il y a lieu, « C n ». Le chargement ajoute ce qui manque à l'écran, sans doublon. La croix ferme l'invite jusqu'au prochain changement d'onglet ou d'article.

Les candidats Capitaine et les Lieutenants déjà explorés reviennent à la réouverture, même sans verrou. Les candidats Capitaine reviennent en « suggéré ».

Un bouton « Vider le cache » apparaît dans la barre quand un scan Radar non sauvegardé est en mémoire. Il supprime des réponses externes liées au Capitaine de l'article, sans toucher aux explorations ni aux décisions. **Limite actuelle :** les types de réponses visés ne sont plus produits par l'outil ; le clic ne force aucun nouvel appel.

## Vocabulaire et modes
*Exigences : FR-UI-VOCABULAIRE-VERROUILLER, FR-MOT-MODE-BIMODAL, NFR-MOT-LEXIQUE-DECOUPLAGE*

- Le geste qui fige le Capitaine s'appelle « Verrouiller ce mot-clé ». Lieutenants et termes du Lexique se retiennent en cochant. La Structure se valide par « Valider la structure ».
- Le Moteur ne fonctionne aujourd'hui qu'en mode guidé, sur un article. Aucun écran d'exploration libre n'existe.
- Lexique et Lieutenants se lancent dans n'importe quel ordre.

---
