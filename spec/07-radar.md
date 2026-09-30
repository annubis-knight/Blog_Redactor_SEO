---
status: référence
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Radar

Le Radar est le deuxième onglet de la phase ① « Générer » du Moteur. On y arrive avec des mots-clés candidats : envoyés depuis Discovery, ajoutés à la main, ou déjà en attente pour l'article. Le Radar les **scanne** : il mesure, pour chacun, ce que Google et DataForSEO (le fournisseur de données SEO payant) en disent. Chaque carte reçoit un Score Marché. L'utilisateur coche ensuite les meilleurs et les envoie au Capitaine.

L'onglet n'agit que sur l'article sélectionné. Il est verrouillé quand des mots-clés sont déjà validés pour l'article (bandeau renvoyant au Capitaine, voir [Moteur — cadre commun](05-moteur.md)).

## La liste d'attente
*Exigences : FR-RAD-DB-FIRST, FR-RAD-MANUAL-ADD*

Le bloc du haut s'intitule « Mots-clés à scanner », ou « N mots-clés à scanner » quand la liste n'est pas vide. Il reste visible après un scan, pour ajouter, retirer et relancer.

- **Source** : la liste vient de la base, pour l'article sélectionné. Elle est rechargée à chaque changement d'article.
- **Arrivée depuis Discovery** : les mots-clés envoyés sont ajoutés en un lot. Un mot-clé déjà présent (casse et espaces ignorés) n'est pas ajouté deux fois.
- **Ajout manuel** : champ « Ajouter un mot-clé à scanner… » et bouton « + Ajouter ». Entrée et le bouton font la même chose. Le bouton est grisé tant que le champ est vide. Le mot-clé est enregistré, puis sa puce apparaît et le champ se vide.
- **Doublon** : le champ se vide et rien n'est ajouté. Aucun message ne le signale.
- **Retrait** : le « × » d'une puce retire le mot-clé en base, puis la puce disparaît.
- **Liste vide** : « Aucun mot-clé en attente. Passe par l'onglet Discovery pour envoyer une sélection, ajoute un mot-clé manuellement ci-dessus, ou utilise les champs en haut pour en générer plusieurs. » Les champs de génération évoqués ne s'affichent pas dans le Moteur (voir « Générer une liste par l'IA »).

## Lancer le scan
*Exigences : FR-RAD-SCAN-2PASS, FR-RAD-AUTOCOMPLETE-PER-KEYWORD, FR-RAD-MARKET-LEVEL-AWARE, FR-RAD-CHECK*

Le bouton « Lancer le scan » est grisé tant que la liste est vide. Pendant le scan, une barre indique la phase (« Autocomplete + KPIs », « Analyse PAA », « Calcul du score ») et « s/t mots-cles ». Cette progression est estimée d'après le temps écoulé, pas mesurée.

Pour chaque mot-clé, le scan collecte :

| Signal | Source | Relu en base si… |
|---|---|---|
| Volume, difficulté, CPC, concurrence | DataForSEO, en un seul appel groupé | jamais (appel à chaque scan) |
| Intention de recherche et sa probabilité | DataForSEO, appel groupé | jamais |
| Suggestions Google (Google Suggest) | un appel par mot-clé, par lots de 3 | mesure de moins de 24 h (30 min si vide) |
| Questions PAA niveau 1 puis niveau 2 | SERP DataForSEO, une par mot-clé puis une par question | mesure de moins d'un jour, de même profondeur |

- La profondeur est toujours de deux niveaux de questions (choix produit : pas de sélecteur).
- Le niveau de l'article part avec le scan : il fixe les seuils de notation (cf. Score Marché).
- Chaque question PAA est comparée au titre de l'article : badge « Exact », « Match », « Partiel exact », « Partiel », « Semantique », « Sem. partiel » ou « Hors sujet ». Un calcul de similarité par embeddings (vecteurs de sens) peut relever « Hors sujet » en « partiel » (similarité ≥ 0,5) et « partiel » en « total » (≥ 0,7).
- Les cartes arrivent rangées par Score Marché décroissant, notes absentes en dernier.
- Un échec du scan affiche le message d'erreur et un bouton « Fermer ». Aucune carte n'est produite.
- Un scan réussi pose l'étape « Radar fait » de l'article (point de progression). Un nouveau scan ne la duplique pas.
- Le scan est enregistré en base pour l'article, avec la liste d'attente connue à ce moment côté scan (voir « Retrouver son exploration »).

## Le résultat du scan
*Exigences : FR-RAD-THERMOMETER, FR-RAD-AUTOCOMPLETE-PER-KEYWORD*

La zone de résultats garde la même silhouette avant et après le scan : elle se remplit au lieu d'apparaître.

**Le thermomètre** résume la chaleur du sujet.
- Avant scan : « ○ », « —/100 », « En attente ».
- Après scan : une icône (🔥 Brulante ≥ 70, 🟠 Chaude ≥ 45, 🔵 Tiede ≥ 20, ❄️ Froide), la note sur 100, une phrase de verdict (ex. « Sujet validé. Des questions et suggestions confirment l'intérêt. ») et trois compteurs : Keywords, Autocomplete, PAA Total.
- La note est la moyenne d'un ancien score hybride des cartes, pas celle des notes affichées sur les cartes. Une donnée absente y compte pour 0.

**Le bloc « Autocomplete (N) »** se déplie pour montrer les suggestions Google du sujet de l'article, groupées par requête (« → requête » en préfixe, « ← *requête » en suffixe), avec leur rang « #n ». Avant scan : « Aucune suggestion — lance un scan ».

## La carte de mot-clé au Radar
*Exigences : FR-RAD-SCORING-BIMODAL, FR-RAD-MARKET-COMPUTED-LIVE, FR-RAD-SCORE-RING-TOOLTIP, FR-RAD-PAA-TREE, FR-RAD-CARD-CHEVRON-TOGGLE, FR-RAD-NO-RELEVANCE-IN-SCAN*

La même carte sert au Radar et au Capitaine. Au Radar, elle affiche le **Score Marché**, libellé « Score KPI » : « ce mot-clé pèse-t-il en SEO ? ». Il ne dit rien de la douleur de l'article ; c'est le rôle du Score Pertinence, affiché au Capitaine (voir [Deux scores, deux questions](08-capitaine.md#deux-scores-deux-questions)). Une carte n'affiche jamais les deux.

En-tête, sur une ligne :
- une case à cocher, un chevron « ▶ », le mot-clé ; les noms de ville ou de région (« local ») et le mot qui suit « pour » (la cible, « persona ») y sont colorés en italique, comme simple repère visuel ;
- les icônes d'intention, dessinées, nommées en info-bulle (Informationnel, Commercial, Transactionnel, Navigationnel) ;
- les indicateurs « vol », « KD », « CPC », « PAA » (points pondérés, ex. « 2.5 pts ») ; « — » pour une donnée absente ;
- l'anneau de score.

Une longue traîne sans indicateurs n'affiche ni indicateurs ni icônes, et son anneau montre « — ».

**Le Score Marché** (0 à 100) est recalculé à l'écran à chaque affichage :

| Composante | Poids | Lecture |
|---|---|---|
| Volume | 30 % | vert au-dessus du seuil haut, orange entre les seuils, rouge en dessous |
| Difficulté (KD) | 20 % | plus elle est basse, mieux c'est |
| Intention | 15 % | valeur de l'intention la plus forte × sa probabilité (commercial 1, transactionnel 0,8, informationnel 0,5, navigationnel 0,2) |
| PAA | 10 % | points : 2 par question « total exact », 1 « total », 0,5 « partiel exact », 0,25 « partiel » |
| Autocomplete | 10 % | noté comme une position (voir ci-dessous) |
| CPC | 10 % | bonus au-dessus de 2 €, neutre sinon |

- Vert (et bonus CPC) vaut 100, orange 50, rouge 0, neutre 50. Une composante sans donnée est retirée et le total est ramené aux poids restants : il reste sur 100 même s'il manque des composantes. Sans aucune donnée, le total vaut 0.
- Une intention inconnue n'est pas retirée : elle compte comme rouge (0).
- Seuils par niveau :

| Indicateur | Pilier | Intermédiaire | Spécialisé |
|---|---|---|---|
| Volume vert / orange | ≥ 1000 / ≥ 200 | ≥ 200 / ≥ 50 | ≥ 30 / ≥ 5 |
| KD vert / orange | ≤ 40 / ≤ 65 | ≤ 30 / ≤ 50 | ≤ 20 / ≤ 40 |
| PAA vert / orange | ≥ 3 / ≥ 1 | ≥ 2 / ≥ 0,5 | ≥ 1 / ≥ 0,25 |
| Autocomplete vert / orange | ≤ 3 / ≤ 6 | ≤ 4 / ≤ 7 | ≤ 5 / ≤ 8 |
| Intention vert / orange | ≥ 0,7 / ≥ 0,4 | idem | idem |

- Verdict de la note : 70 et plus « GO », 40 à 69 « ORANGE », moins de 40 « NOGO ». Il sert au panneau « Suggestions IA Radar » ; il ne bloque rien.
- Limite : une carte sans aucune donnée DataForSEO vaut 0 et non « — » : l'intention inconnue, et au Radar les questions PAA et les suggestions absentes, comptent comme rouges.

- **Défaut connu** : au Radar, « Autocomplete » reçoit le **nombre** de suggestions Google du mot-clé, mais la grille le note comme une **position** (petit = bon). Un mot-clé riche en suggestions (au-delà de 6 à 8 selon le niveau) reçoit donc du rouge, un mot-clé à 1 ou 2 suggestions du vert, et 0 suggestion vaut rouge.

**L'info-bulle de l'anneau** (au survol) liste chaque composante : libellé, poids, description, valeur sur 100, puis « Total ». Un clic sur l'anneau ne fait rien d'autre.

**Le corps de la carte** s'ouvre par le chevron seulement. Il montre :
- la raison du mot-clé (en italique), s'il y en a une ;
- « PAA en cache » quand les questions viennent de la base ;
- l'arbre des questions : niveau 1, avec son badge, sa similarité en %, et « (n) » sous-questions ; un clic sur « ▶ » déplie les sous-questions, un clic sur la question déplie la réponse de Google ;
- « Aucune PAA trouvee » s'il n'y a aucune question.

Les badges du Radar ne parlent jamais de la douleur. Une carte d'un ancien scan qui porte encore un vieux signal de douleur inférieur à 35 est grisée.

## Trier, filtrer, cocher
*Exigences : FR-RAD-MARKET-COMPUTED-LIVE*

Au-dessus des cartes : un compteur (« N mots-clés », ou « x / y mots-clés » quand un filtre masque des cartes), deux tris, un filtre CPC et « Tout ».

- **Tris** « A-Z » et « Score KPI ». Un premier clic trie en ordre décroissant, un deuxième en croissant, un troisième revient à l'ordre d'arrivée. Pour « A-Z », le premier clic donne donc Z → A.
- Le tri « Score KPI » utilise exactement la note affichée dans l'anneau. Une carte sans note va en bas, dans les deux sens.
- **Filtre CPC** : « Avec CPC » ou « Sans CPC ». Les longues traînes passent toujours le filtre.
- **« Tout »** coche ou décoche les cartes visibles seulement.

## Longues traînes
*Exigences : FR-RAD-LONGTAIL-GENERATE, FR-RAD-LONGTAIL-UI, FR-RAD-LONGTAIL-REGENERATE*

La section « Suggestions longue-traine » apparaît sous les cartes dès que le scan en compte au moins deux. Sous-titre : « Combinaisons IA generees a partir des mots-cles Radar. Coche celles a envoyer au Capitaine. »

1. « ✨ Suggerer des combinaisons » lance la génération (« L'IA genere les suggestions… »). L'outil combine d'abord localement les mots des cartes, puis l'IA choisit et reformule au plus 10 suggestions, en tenant compte du titre, du point de douleur et de la stratégie du cocon.
2. Chaque ligne : case, note « N/10 » (vert ≥ 8, orange ≥ 6, gris sinon), mot-clé, justification, « Sources : » et les mots-clés d'origine.
3. Les 5 mieux notées sont pré-cochées.
4. Chaque clic sur une case est enregistré une demi-seconde après le dernier clic. La pré-sélection initiale n'est enregistrée qu'au premier clic.
5. « ⟳ Regenerer » relance avec les cartes du moment. Avec les mêmes entrées (mots-clés, titre, douleur), le résultat vient du cache de 7 jours, sans appel d'IA. Les cases encore présentes dans la nouvelle liste restent cochées.
6. En cas d'échec : « Erreur : … » et le bouton « Reessayer ». Réponse vide : « L'IA n'a propose aucune combinaison pertinente cette fois. »

Limites actuelles :
- Au rechargement de l'article, la section repart vide : les suggestions et les cases cochées enregistrées en base ne sont pas réaffichées.
- Un nouveau scan réécrit l'exploration en base et efface les suggestions enregistrées.

## Suggestions IA Radar
*Exigences : FR-RAD-AI-SUGGESTIONS*

Sous les résultats, le panneau « Suggestions IA Radar » (« Top candidats Capitaine — tri local par mix marché + pertinence (verdicts NOGO exclus). ») classe les cartes sans appel d'IA :
- note de classement = moyenne des scores disponibles ; comme le Radar n'a pas de Score Pertinence, c'est le Score Marché ;
- une carte au verdict marché NOGO (score < 40) est écartée ; les 5 premières sont affichées avec les pastilles « M n » et « P — » ; l'info-bulle de « P — » dit que la pertinence se calcule au Capitaine ;
- avant scan : « Lance un scan ci-dessus pour voir ici les meilleurs candidats… » ; aucun candidat : « Aucun candidat à proposer pour l'instant… ».
- Le bouton « Marquer comme candidats Capitaine (N) » vide la sélection, mais n'a aucun autre effet.

## Envoyer au Capitaine
*Exigences : FR-RAD-SEND-CAPTAIN*

Le bouton « Envoyer au Capitaine (N) » apparaît dès qu'une carte ou une longue traîne est cochée. N compte les mots-clés sans doublon (casse et espaces ignorés).

- En cas de doublon entre une carte et une longue traîne, la carte l'emporte (elle a des indicateurs).
- Le clic ouvre l'onglet Capitaine, qui étudie aussitôt chaque mot-clé reçu (voir [Moteur — Capitaine](08-capitaine.md)).
- La provenance (Radar, longue traîne, saisie) n'est pas enregistrée.

> **En situation.** Sur « Création de site vitrine à Toulouse », l'utilisateur coche 3 cartes et 2 longues traînes, dont une identique à une carte. Le bouton affiche « Envoyer au Capitaine (4) ». Le Capitaine s'ouvre avec 4 candidats en cours d'étude.

## Retrouver son exploration
*Exigences : FR-RAD-PERSIST, FR-RAD-DB-FIRST*

L'exploration Radar d'un article tient en une seule ligne en base : liste d'attente, dernier scan, longues traînes et leur sélection.

- La liste d'attente revient seule à chaque sélection de l'article.
- Les cartes du dernier scan reviennent seules si l'onglet Radar était déjà ouvert au moment où l'on sélectionne l'article. Sinon, le bandeau du bas propose « Charger Radar » (voir [Moteur — cadre commun](05-moteur.md)) ; un clic les réaffiche, sans nouvel appel externe.
- Changer le titre, le mot-clé ou la douleur de l'article vide l'affichage du scan (pas la base).
- Limite : l'enregistrement fait après un scan reprend la liste d'attente que le scan connaissait, qui peut être vide si l'exploration n'a pas été rechargée par « Charger Radar ». La liste d'attente en base peut alors être vidée par le scan.

## Générer une liste par l'IA
*Exigences : FR-RAD-GENERATE*

La génération d'une courte liste de mots-clés par l'IA (au plus 25, avec une raison chacun, sans doublon) est utilisée par Discovery (voir [Moteur — Discovery](06-discovery.md)) ; le mode libre qui l'utilisait aussi n'a plus d'écran. En mode workflow, le Radar ne montre pas les champs de génération. Un échec de l'IA donne une liste vide.
