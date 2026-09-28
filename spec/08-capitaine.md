---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Capitaine

Le Capitaine est le premier onglet de la phase ② « Valider ». L'utilisateur y étudie des candidats et en verrouille **un seul** : le Capitaine de l'article. Tout ce qui suit (Lieutenants, Structure, Lexique, Rédaction) part de ce choix. L'onglet montre une liste verticale de candidats et un panneau de détail pour le candidat sélectionné.

Au Capitaine, chaque carte affiche le **Score Pertinence** (« ce mot-clé sert-il la douleur de l'article ? »). Le Score Marché reste calculé et part dans l'avis de l'IA, mais ne s'affiche pas sur la carte.

## Deux scores, deux questions
*Exigences : FR-RAD-SCORING-BIMODAL, FR-CAP-SCORING-BIMODAL*

Chaque candidat reçoit deux notes sur 100, qui répondent à deux questions différentes. Les mélanger en une seule note cacherait ce qui compte : une note moyenne de 60 peut venir d'un mot-clé très cherché mais hors sujet, comme d'un mot-clé peu cherché mais en plein dans la douleur.

| | Score Marché (« Score KPI ») | Score Pertinence |
|---|---|---|
| Question | Ce mot-clé pèse-t-il en SEO ? | Ce mot-clé sert-il la douleur de cet article ? |
| Ce qu'il mesure | volume, difficulté, intention, questions PAA, suggestions Google, CPC | les mots du point de douleur retrouvés dans le mot-clé, ses questions PAA et ses suggestions ; ses racines ; l'intention de la SERP face à celle de l'article |
| Dépend de l'article | seulement par son niveau, qui fixe les seuils | oui : point de douleur, intention attendue |
| Où on le voit | cartes du Radar | cartes du Capitaine |
| Quand il est calculé | à chaque affichage | à chaque chargement des candidats |

- Une carte n'affiche jamais les deux notes.
- Les deux notes partagent les mêmes paliers : 70 et plus « GO », 40 à 69 « ORANGE », moins de 40 « NOGO ». Ces paliers sont indicatifs. Le verdict qui compte au verrouillage est celui de l'étude (voir « Le verdict »), et l'alarme vérifie aussi le volume et les suggestions.
- Une note absente s'affiche « — », jamais 0, et descend en bas des tris.
- Un mot-clé garde son Score Marché d'un article à l'autre (au niveau près). Son Score Pertinence change avec la douleur de chaque article.

> **En situation.** Point de douleur : « les artisans ne savent pas combien coûte un site vitrine ». « agence web toulouse » est très cherché : bon Score Marché au Radar. Mais ni le mot-clé ni ses questions ne parlent de prix : Score Pertinence faible au Capitaine. « prix site vitrine artisan » est peu cherché, mais il reprend les mots de la douleur : Score Marché moyen, Score Pertinence élevé.

## Arriver sur le Capitaine
*Exigences : FR-CAP-PERSIST, FR-CAP-SCAN, FR-CAP-PAA-JUDGE-HAIKU*

- À la sélection d'un article, l'outil relit ses candidats en base, avec leurs indicateurs et leur Score Pertinence recalculé.
- Si l'article n'a encore aucun candidat, l'outil étudie d'office le premier mot-clé suggéré par la stratégie pour ce titre, ou à défaut le mot-clé de l'article. Le champ de saisie est pré-rempli avec ce mot-clé (ou le Capitaine déjà verrouillé).
- En entrant dans l'onglet, l'outil lance le jugement IA des questions PAA de l'article (voir plus bas), une fois par article et par session.
- Liste vide : « Aucun mot-clé à valider pour cet article. »

## Étudier un candidat
*Exigences : FR-CAP-INPUT, FR-CAP-SCAN, FR-CAP-AUTO-NOGO, FR-CAP-LOCK-INTEGRITY*

- Champ « Tester un mot-clé capitaine… », bouton « Analyser » (grisé si le champ est vide), Entrée possible.
- Un mot-clé nouveau rejoint la liste ; un mot-clé déjà présent (casse ignorée) est ré-étudié à sa place.
- Pendant l'étude, la carte affiche « Validation en cours... » ; en cas d'échec, « Erreur : … ».

L'étude (le « scan » du Capitaine) produit six indicateurs, notés selon le niveau de l'article (mêmes seuils qu'au Radar) :

| Indicateur | Valeur |
|---|---|
| Volume | recherches mensuelles |
| KD | difficulté SEO |
| CPC | coût par clic, bonus au-dessus de 2 € |
| Intent | probabilité de l'intention DataForSEO, entre 0 et 1 |
| PAA | points pondérés des questions face au mot-clé et au titre de l'article |
| Autocomplete | **position** du mot-clé exact dans les suggestions Google : 1 = première ; 0 = « Non trouvé » ; « — » si les suggestions n'ont jamais été récupérées |

- Des mesures de moins de 7 jours sont réutilisées. Sinon, volume, suggestions, SERP (avec ses questions PAA) et intention sont demandés en parallèle, puis enregistrés pour tous les articles.
- Une donnée absente reste « — » et ne pèse pas dans le verdict. Une SERP en panne rend le PAA inconnu, pas nul.
- Le candidat et ses questions PAA sont enregistrés pour l'article dès l'étude.

**Le verdict** de chaque candidat :

| Verdict | Condition |
|---|---|
| GRAY | ni volume, ni PAA, ni suggestions mesurés : « Données insuffisantes » |
| NO-GO automatique | volume, PAA et position mesurés tous à 0 : « Aucun signal détecté — ce mot-clé n'existe pas dans les données. » |
| NO-GO | volume et KD rouges, ou PAA et volume rouges |
| GO | au moins 4 indicateurs verts (bonus CPC compris), aucun rouge sur volume, KD ou PAA : « Signaux positifs — mot-clé viable. » |
| ORANGE | tous les autres cas : « Signaux mixtes — à étudier. » |

Le verdict aide à décider ; il ne bloque pas le bouton de verrouillage, mais un NO-GO déclenche l'alarme (voir « Verrouiller »).

## La liste des candidats
*Exigences : FR-CAP-LIST-SIDEPANEL, FR-CAP-LOCK-INTEGRITY, FR-CAP-SCORING-BIMODAL*

- Une carte par candidat, sans doublon, même après plusieurs ajouts ou rechargements.
- Tris « A-Z » et « Score Pertinence », même fonctionnement qu'au Radar (décroissant, croissant, ordre d'arrivée). La carte verrouillée reste toujours en tête, bordure verte.
- Le tri lit le mot-clé et le Score Pertinence d'**origine** de la carte. Quand une racine est affichée à sa place, l'anneau montre le score de la racine, mais la carte ne bouge pas.
- Un clic (ou Entrée, Espace) sélectionne la carte (bordure bleue) et ouvre le panneau de détail.

Sur chaque carte, à gauche :
- le **cadenas** verrouille ou déverrouille ;
- le bouton **étiquettes** passe en mode où un clic sur un mot le marque « local » ou « persona » (chaque clic fait passer le mot de « local » à « persona », puis à aucune étiquette ; les mots étiquetés changent de couleur). Alt+clic fait de même hors de ce mode. Ces clics ne marchent que sur un mot-clé d'au moins 3 mots (les seuls dont les mots sont cliquables) ; ailleurs, le bouton ne change rien. Les villes et régions, et le mot qui suit « pour », sont étiquetés d'office. Les étiquettes sont un repère visuel : aucune note n'en tient compte, bien que l'info-bulle d'un mot étiqueté annonce « peu pris en compte dans les KPI ». Elles sont oubliées au rechargement de la page ;
- le bouton **recalcul** ré-étudie le mot-clé ; il est grisé sans point de douleur d'au moins 10 caractères (« Définis un point de douleur sur l'article pour pouvoir recalculer la Pertinence »).

**Mots cliquables** : sur un mot-clé d'au moins 3 mots, les mots au-delà des 2 premiers mots significatifs sont cliquables. En retirer un étudie la combinaison restante (au moins 2 mots) et l'affiche à la place, avec « Validation… » pendant l'étude. En cas d'échec : « Impossible de valider "…" », et la carte revient à l'état précédent.

## Le Score Pertinence
*Exigences : FR-CAP-RELEVANCE-LIVE, FR-CAP-RELEVANCE-INPUTS, FR-CAP-RELEVANCE-MEMOIZATION, FR-CAP-RELEVANCE-INTENT-SIGNAL, FR-CAP-PAINPOINT-FALLBACK, FR-CAP-RELEVANCE-UNAVAILABLE-REASON, FR-CAP-NO-PAINPOINT-WATCHER*

Le Score Pertinence (0 à 100) est recalculé à chaque chargement des candidats de l'article, et n'est enregistré nulle part.

| Composante | Poids | Mesure |
|---|---|---|
| Pain × Mot-clé | 30 % | le mot-clé partage-t-il les mots du point de douleur ? (100 total, 60 partiel exact, 50 partiel racine, 0 aucun) |
| PAA × Douleur | 25 % | moyenne de la même mesure sur les questions PAA ; remplacée par la note du jugement IA quand elle existe |
| Autocomplete × Douleur | 15 % | moyenne de la même mesure sur les suggestions Google |
| Racines | 20 % | moyenne des Scores Pertinence des racines du mot-clé |
| Intent × Douleur | 10 % | intention de la SERP croisée avec l'intention attendue de l'article |

- Sans racine (mot-clé de moins de 3 mots), les 20 % sont répartis au prorata sur les quatre autres (37,5 / 31,25 / 18,75 / 12,5).
- Une composante sans donnée vaut 50 (neutre).
- **Intent × Douleur** : table de correspondance (ex. article informationnel : informationnel 100, commercial 50, transactionnel 40, navigationnel 30), moins 10 points si l'intention de la SERP diffère de l'attendue. 50 si l'une manque. L'intention attendue est celle de l'article, qu'elle vienne de l'IA du Cerveau, de l'utilisateur ou du candidat d'origine.
- Une racine commune à plusieurs candidats n'est évaluée qu'une fois par calcul.
- Changer le point de douleur pendant la visite ne relance pas le calcul ; le prochain chargement en tient compte.

**Quand le score manque**, l'anneau affiche « — » et l'info-bulle donne la raison :

| Raison | Message |
|---|---|
| point de douleur absent ou < 10 caractères | « Score Pertinence indisponible. Définis un point de douleur sur l'article et recharge l'onglet Capitaine pour obtenir le score. » |
| aucune question PAA en base (ou mot-clé jamais mesuré) | « Score Pertinence indisponible — aucune question PAA trouvée pour ce mot-clé. Relance la validation pour récupérer les PAA depuis la SERP. » |
| aucune suggestion Google en base | « … aucune suggestion autocomplete trouvée. Relance la validation… » |
| raison non transmise, carte sans indicateurs | « Score Pertinence non applicable aux longues traînes — utilise plutôt le score Pertinence de leur racine dans l'onglet Capitaine. » |
| raison non transmise, douleur définie | « Le point de douleur est défini, mais les signaux SERP n'ont rien produit. Relance la validation pour réessayer. » |

Limites actuelles :
- Le serveur ne signale jamais une longue traîne : faute de données, elle tombe dans « aucune question PAA ».
- Juste après une étude, la note affichée vient du calcul de l'étude : sans racines, et avec les anciens signaux d'un scan Radar s'il en existe un pour ce mot-clé. Ce calcul peut donner une note même sans point de douleur. La réouverture de l'article remplace cette note par le calcul complet.
- Une carte reçue du Radar affiche « — » jusqu'à la réouverture de l'article, car la carte du Radar ne porte pas de Score Pertinence.

## Le jugement IA des questions PAA
*Exigences : FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-JUDGE-CACHE-SESSION, FR-CAP-PAA-BADGE-SINGLE*

À l'entrée dans l'onglet, l'outil demande à une IA rapide de juger, pour chaque candidat, ses questions PAA face au titre, au point de douleur et à l'intention de l'article.

- Un appel par candidat. Pas d'appel sans point de douleur (≥ 10 caractères) ni sans question.
- Chaque question reçoit « pertinent », « partiel » ou « hors-sujet », une note sur 100 et une justification de 10 mots au plus. Le candidat reçoit une note globale et une phrase de synthèse.
- La note globale remplace la mesure lexicale de « PAA × Douleur » (25 %). Si l'IA échoue pour un candidat, la mesure lexicale reste, sans message.
- Les jugements restent en mémoire du navigateur pour la session, par article : revenir sur l'article ne relance pas l'IA. Un rechargement de page (F5) les efface. Rien n'est écrit en base.
- Limite actuelle : dans la liste du Capitaine, les questions gardent leurs badges lexicaux et l'indicateur « PAA » ses points. Les scores corrigés par le jugement ne remplacent pas ceux déjà affichés.

## Le panneau de détail
*Exigences : FR-CAP-LIST-SIDEPANEL, FR-CAP-KPIS-READONLY, FR-CAP-ROOTS, FR-CAP-AI-PANEL*

Le panneau « Capitaine » s'ouvre à droite de l'écran sur toute la hauteur. Sa largeur se règle en tirant son bord gauche. Il se ferme par « × » ou par un clic à l'extérieur (sauf sur une autre carte, qui le met à jour).

Contenu, de haut en bas :
1. Le mot-clé et son badge de verdict.
2. « Aller à la carte verrouillée », quand un autre candidat est verrouillé : fait défiler la liste jusqu'à lui.
3. **KPIs marché** en lecture seule : Volume (« n rech/m »), Difficulté, CPC (« n,nn € »), Intent, PAA (« n questions »), Autocomplete (« n matches ») ; « — » si absent. Note : « Ces indicateurs alimentent le Score KPI affiché dans l'onglet Radar. »
   - Limites : Intent affiche « — » pour tout candidat étudié hors Radar. « Autocomplete » montre le nombre de suggestions pour une carte venue du Radar, et la position du mot-clé pour un candidat étudié au Capitaine.
4. **Racines** : pour un mot-clé d'au moins 3 mots dont le volume n'est pas vert, jusqu'à 5 racines (troncatures depuis la fin, au moins 2 mots significatifs) sont étudiées d'office. Chacune montre son Score Pertinence dans un petit anneau ; « Moyenne n/100 » les résume (vert ≥ 65, orange ≥ 40). Un clic sur une racine l'affiche à la place du mot-clé. Une racine en échec est marquée « (échec) » ; sans racine : « Aucune racine ».
5. **« Avis expert IA »** : bannière de verdict, puis l'avis rédigé en trois parties (potentiel éditorial, opportunités et risques, recommandation), affiché au fil de la génération. « Régénérer » demande confirmation : « Régénérer l'avis expert IA ? Cela consommera un appel Claude. »

Fonctionnement de l'avis :
- Il est demandé d'office pour **chaque** candidat dès que son étude aboutit, pas seulement pour le candidat sélectionné.
- Il reçoit le mot-clé, le niveau, le point de douleur et les deux scores de l'étude. La stratégie du cocon ne lui est pas transmise.
- Il n'est pas enregistré : chaque réouverture de l'article le redemande pour chaque candidat.

## Verrouiller le Capitaine
*Exigences : FR-CAP-LOCK-RADIO, FR-CAP-LOCK-GATE, FR-CAP-CHECK, FR-CAP-LOCK-INTEGRITY*

Le cadenas d'une carte verrouille son mot-clé d'origine (jamais la racine affichée).

1. **La porte** est consultée avant tout changement, avec ce candidat.
2. Si elle relève un risque, l'alarme graduée s'ouvre (« Avant de verrouiller le capitaine », voir [Infrastructure transversale](16-infrastructure.md) pour l'alarme et la dérogation écrite) :

| Point | Niveau | Message |
|---|---|---|
| volume jamais mesuré | 🔴 | « Aucun volume de recherche mesuré pour « … ». » |
| volume nul | 🔴 | « « … » : 0 recherche par mois selon DataForSEO. » |
| verdict NO-GO | 🔴 | « Le verdict du mot-clé est NO-GO : aucun signal de demande (volume, questions, suggestions). » |
| SERP commerciale ou transactionnelle, article informationnel | 🔴 | « Google traite cette requête comme commerciale (on compare des prestataires), alors que l'article vise une intention informationnelle (on cherche à comprendre). » |
| autre écart d'intention | 🟠 | même forme de message |
| aucune suggestion Google | 🟠 | « Google ne suggère pas cette requête quand on commence à la taper. » |

   - L'intention attendue est celle de l'article ; à défaut, un pilier est traité comme un guide (informationnel). Une intention inconnue ne lève rien.
   - Sous les points 🔴, « À la place : » propose jusqu'à 5 autres candidats de l'article, avec leur volume (« mot-clé (n recherches/mois) »), du plus recherché au moins recherché.
3. « Revenir corriger » : rien ne change, l'ancien Capitaine reste verrouillé. Passer outre exige une dérogation écrite.
4. Si la vérification échoue (serveur injoignable) : « Vérification du capitaine impossible : … », rien n'est verrouillé.
5. Porte franchie : le Capitaine est enregistré (il remplace l'ancien), puis l'étape « Capitaine verrouillé » est demandée. Si l'enregistrement échoue : « Le capitaine n'a pas pu être enregistré : l'étape n'est pas validée. Réessayez. », et l'écran revient à l'état d'avant.
6. Le serveur réévalue la porte avant d'accorder l'étape, quel que soit l'appelant. Une dérogation reste valable tant que le Capitaine et ses mesures ne changent pas ; explorer d'autres candidats ne la fait pas tomber.

**Déverrouiller** (cadenas de la carte verrouillée) vide le Capitaine et retire l'étape. Si des Lieutenants sont verrouillés, une fenêtre propose « Les garder » ou « Tout réinitialiser » (ils sont archivés) ; un clic à côté ou Échap annule.

À l'ouverture de l'onglet, l'étape est réconciliée : ajoutée si un Capitaine est verrouillé sans elle, retirée dans le cas inverse.

> **En situation.** Pour son pilier, l'utilisateur verrouille « stratégie digitale entreprises Toulouse » : volume jamais mesuré, aucune suggestion, SERP d'agences. L'alarme montre deux points 🔴 et un 🟠, puis trois candidats mesurés. Il clique « Revenir corriger » ; son ancien Capitaine reste en place, il verrouille l'un des candidats proposés.
