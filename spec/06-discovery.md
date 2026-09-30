---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Discovery

Discovery est le premier onglet de « 1 Générer ». À partir d'un mot-clé racine, il rassemble des idées de mots-clés venues de plusieurs sources. Il écarte le hors-sujet, propose une sélection par l'IA et envoie le tri au Radar. Rien n'y est encore une décision.

## L'écran
*Exigences : FR-DIS-SOURCES, FR-DIS-AI-ANALYSIS*

De haut en bas :

1. « Mot-clé racine » : un champ (exemple « Ex: design émotionnel ») et deux boutons, « Découvrir » (« Recherche... » pendant le travail) et « Courte-traîne IA » (« Génération… »).
2. Une ligne de contexte : « Article : {titre} · Douleur : {douleur} ».
3. Le bandeau de sauvegarde, s'il y en a une.
4. Après un lancement : le filtre de pertinence et ses compteurs.
5. Les sept sections de sources.
6. Le panneau « Analyse IA Discovery ».
7. À droite, après un lancement : la colonne « Groupes de mots ».
8. En bas, dès qu'un mot-clé est coché : une barre fixe.

Le champ est prérempli avec le mot-clé de l'article, sinon avec le nom du cocon. Changer d'article remplace le mot-clé racine. Changer de cocon vide l'onglet.

## Lancer une découverte
*Exigences : FR-DIS-SOURCES, FR-DIS-LONGTAIL-GENERATION*

« Découvrir » (ou Entrée) est désactivé si le champ est vide ou si une recherche tourne. Il lance en parallèle :

| Section | Origine | Lancée par | Affiche |
|---|---|---|---|
| 🔤 Alphabet (A-Z) | Google Suggest, racine + lettre | « Découvrir » | mot-clé |
| ❓ Questions | Google Suggest, racine + mot interrogatif | « Découvrir » | mot-clé |
| 🎯 Intent Modifiers | Google Suggest, racine + mot d'intention | « Découvrir » | mot-clé |
| 🔗 Prepositions | Google Suggest, racine + préposition | « Découvrir » | mot-clé |
| 🤖 IA Claude | IA (Claude Haiku) | « Découvrir », si l'article est connu | mot-clé + raison |
| 📊 DataForSEO | DataForSEO, jusqu'à 100 suggestions | « Découvrir » | mot-clé + Vol, KD, CPC, intention |
| 🎯 Courte-traîne IA (PAA-friendly) | IA (Claude Haiku) | « Courte-traîne IA », ou « Générer » dans la section vide | mot-clé + raison |

Règles :
- Chaque section se remplit dès que sa source répond. Une source en échec laisse sa section vide, sans message.
- Relancer la même recherche (même racine, même article) sans rien changer ne refait aucun appel.
- Les sections sont toujours affichées. En-tête : icône, nom, compteur « (visibles) » ou « (visibles/total) » quand le filtre masque des mots-clés, spinner pendant le chargement, case « Tout ».
- Section vide : « Saisissez un mot-clé pour découvrir les suggestions. » avant tout lancement, « Aucun résultat dans cette source. » après.
- Rien trouvé nulle part : « Aucun mot-clé trouvé. Essayez un autre mot-clé racine. »
- Un mot-clé présent dans plusieurs sources porte « ×N » et remonte en tête de chaque section.
- Au-delà de 100 lignes, une section est tronquée ; « Afficher tout (N de plus) » / « Réduire la liste ».
- Une métrique absente n'est pas affichée ; un volume de plus de 1 000 s'écrit « 1.2k ».
- La courte-traîne génère une vingtaine de mots-clés courts, pensés pour les questions PAA et l'autocomplétion. Elle passe ensuite par le filtre de pertinence.

## Le filtre de pertinence
*Exigences : FR-DIS-RELEVANCE-FILTER*

Après un lancement, une ligne affiche la case « Filtre de pertinence » (cochée par défaut) et « X pertinents / N total ».

Déroulé :
1. Chaque nouveau mot-clé est jugé par l'IA : pertinent ou hors-sujet pour un article sur la racine, dans le contexte métier du site (secteur, audience, services). Les mots-clés sont envoyés par lots de 120, quatre lots à la fois.
2. Si au moins 10 % sont rejetés, un second passage plus strict revoit les mots-clés retenus.
3. Une douleur d'au moins 10 caractères devient un critère éliminatoire : un mot-clé qu'une personne vivant cette douleur ne taperait pas est rejeté.

Affichage :
- Pendant le calcul : une barre « Filtrage 1/2 · n/total », puis « Filtrage 2/2 · … ».
- Ensuite : « N hors-sujet masqués » si le filtre masque quelque chose.
- Décocher le filtre réaffiche tout sans nouveau calcul. Les mots-clés hors-sujet apparaissent alors grisés.
- Un mot-clé pas encore jugé, ou dont le lot a échoué, reste visible.
- Les mots-clés arrivés plus tard (source lente, courte-traîne) sont jugés à leur tour, sans rejuger les autres.
- Une racine dont aucun mot n'a trois lettres n'est pas filtrée.

Si plus de 90 % d'au moins 20 mots-clés passent le filtre, un avertissement s'affiche : « Attention : le filtrage de pertinence semble ne pas avoir fonctionné (x/N mots-clés conservés). Les appels API de scoring ont probablement échoué. Vérifiez votre clé API Claude ou relancez la découverte. » Il ne s'affiche pas en mode « MOCK » : le filtre simulé garde presque tout, ce n'est pas une panne.

**Limite actuelle :** « pertinents » compte des mots-clés uniques, « hors-sujet masqués » compte chaque apparition dans une section. Les deux ne s'additionnent pas pour donner le total.

## Les groupes de mots
*Exigences : FR-DIS-SOURCES*

La colonne « Groupes de mots » liste les mots qui reviennent dans les candidats, avec leur nombre. Elle se calcule dès qu'il y a au moins 5 candidats. Sinon : « Pas assez de données pour les groupes. »

Un clic sur un mot filtre toutes les sections et affiche « Filtre actif : {mot} » avec « Effacer ». Un second clic retire le filtre.

## L'analyse IA
*Exigences : FR-DIS-AI-ANALYSIS*

Le panneau « Analyse IA Discovery » (« Sélection intelligente des 20-30 mots-clés les plus stratégiques (groupes, métriques, douleur). ») est toujours affiché. Son contenu change avec l'état :

| État | Bouton | Message |
|---|---|---|
| Pas de découverte | désactivé | « Lance d'abord une découverte de mots-clés ci-dessus, puis l'IA pourra analyser et te proposer une sélection stratégique. » |
| Filtrage en cours | désactivé | « Filtrage de pertinence en cours… L'analyse IA sera disponible une fois le filtrage terminé. » |
| Aucun pertinent | désactivé | « Aucun mot-clé pertinent à analyser. Élargis ta recherche ou désactive le filtre de pertinence. » |
| Prêt | « Analyser les N résultats pertinents » | « Prêt à analyser N mots-clés pertinents. » |
| En cours | — | chargement |
| Réussi | « Relancer l'analyse » (confirmation : « Relancer l'analyse IA ? Cela consommera un appel Claude. ») | résultats |
| Échec | — | état d'erreur ; « Échec de l'analyse IA. Réessayez. » s'affiche aussi au-dessus des sections |

L'IA reçoit les mots-clés visibles (dédupliqués, avec leurs sources et métriques), les 30 premiers groupes de mots, la racine, le titre et la douleur de l'article, et le contexte métier du site. Elle rend 20 à 30 mots-clés.

Résultat, sous le titre « Recommandation IA » :
- le nombre de mots-clés et une case « Tout selectionner » ;
- un paragraphe de synthèse ;
- pour chaque mot-clé : son rang, sa priorité (🔴 haute, 🟡 moyenne, 🟢 basse), son badge « ×N » s'il y a lieu, sa raison et une case.

Les cases de l'analyse et celles des sections partagent la même sélection.

## Sauvegarde et reprise
*Exigences : FR-DIS-CACHE*

Quand toutes les sources et le filtre ont fini, la découverte est sauvegardée pour son mot-clé racine (à la lettre près). Elle est sauvegardée de nouveau après une analyse IA réussie. La sauvegarde contient les six premières sections, les jugements de pertinence, les groupes de mots et l'analyse IA. Elle est commune à tous les articles : une même racine donne la même sauvegarde.

Quand le champ change (saisie, ou changement d'article avec l'onglet déjà ouvert), l'outil vérifie 400 ms plus tard s'il existe une sauvegarde. Tant qu'aucune découverte n'a été lancée dans l'onglet, un bandeau s'affiche alors : « Derniere analyse du {date} · N mots-cles · analyse IA incluse ». Il porte deux boutons :
- « Charger » (« Chargement... ») restaure la découverte sans aucun appel externe ;
- « Rafraichir » supprime la sauvegarde et vide l'écran.

**Limites actuelles.**
- Une sauvegarde n'expire jamais : elle est proposée quel que soit son âge.
- La section Courte-traîne n'est ni sauvegardée ni restaurée.
- À la première ouverture de l'onglet, le bandeau n'apparaît pas tant que le champ ne change pas.

> **En situation.** Jeudi, l'utilisateur tape « indemnité rupture conventionnelle » : le bandeau annonce la découverte de mardi, 487 mots-clés, analyse IA incluse. « Charger » remplit les sections et l'analyse en un instant, sans rien payer.

## Pré-analyse Capitaine
*Exigences : FR-DIS-CAPTAIN-PRESCAN, FR-MOT-NO-AUTO-ACTION*

Cocher un mot-clé dans une section, pour un article choisi, programme son analyse Capitaine cinq secondes plus tard. Une notification affiche « Validation Capitaine dans Ns », le mot-clé et un bouton « Annuler ». Décocher le mot-clé annule aussi.

À l'échéance, l'outil mesure le mot-clé (métriques, suggestions, questions PAA) et l'ajoute aux candidats Capitaine de l'article, sans le verrouiller. Un échec n'est pas signalé à l'utilisateur. Les cases de l'analyse IA et « Tout » ne déclenchent pas cette pré-analyse.

## Envoyer au Radar
*Exigences : FR-DIS-SEND-TO-RADAR, FR-DIS-CHECK*

Dès qu'un mot-clé est coché, une barre fixe apparaît en bas : « N mot(s)-clé(s) sélectionné(s) » et le bouton « Envoyer au Radar → ».

Au clic :
1. l'outil rassemble les mots-clés cochés des six premières sections et de l'analyse IA, sans doublon, avec leur raison quand l'IA en a donné une ;
2. il ouvre le Radar ;
3. il demande l'étape « Discovery faite » ;
4. il enregistre la liste dans le Radar de l'article. Renvoyer une liste déjà envoyée ne crée pas de doublon.

L'étape « Discovery faite » ne se pose qu'à ce clic. Lancer, cocher, charger ou rafraîchir ne la posent pas.

**Limites actuelles.**
- Le Radar s'ouvre et l'étape est demandée avant l'enregistrement, sans en vérifier la réussite.
- Un mot-clé coché seulement dans la section Courte-traîne est compté dans la barre mais n'est pas envoyé.

---
