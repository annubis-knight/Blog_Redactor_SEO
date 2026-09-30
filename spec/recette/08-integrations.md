---
title: Recette — Intégrations externes
module: 08
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/14-integrations.md
---

# Module 08 — Intégrations externes

**Durée :** ~30 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express terminé (cocon « Recette <date> », pilier rédigé, capitaine verrouillé, lieutenants analysés, un article enfant), le bouton sur **MOCK**, une connexion internet. Pour Search Console : un compte Google qui gère un site.

Ce module vérifie ce que tu vois des services extérieurs : le bouton MOCK / RÉEL et ce qu'il change, la pile d'activité (le petit panneau « Coûts API » en bas à gauche), le plafond de dépense, les réponses déjà achetées qui ne se rachètent pas, les messages quand un service tombe, et l'écran Search Console. La section RÉEL coûte environ 0,20 $ en tout.

## Vérifications

### EXT-1 — Le bouton MOCK / RÉEL et la pile d'activité disent la même chose
**Exigences :** FR-EXT-AI-MULTI-PROVIDER, FR-EXT-DATAFORSEO-SANDBOX ⚠, FR-EXT-DATAFORSEO-COSTGUARD ⚠, NFR-COST-AI-MOCK, NFR-OBS-COST-LOG

**Gestes :**
1. Va sur l'accueil : rien n'y part tout seul, tu peux basculer sans rien payer.
2. Survole le bouton **« MOCK »** à droite de la barre du haut, et lis son info-bulle.
3. En bas à gauche, clique sur la pastille (un montant, puis « N appels »). Le panneau « Coûts API » se déplie.
4. Clique sur le bouton **« MOCK »**. Il passe à « RÉEL ». Attends 15 secondes sans rien lancer.
5. Recharge la page (F5).
6. Clique sur **« RÉEL »** pour revenir à « MOCK ». Attends encore 15 secondes.

**Tu dois voir :**
- en MOCK, un bouton orangé et l'info-bulle « Sources : MOCK (cliquer pour passer en réel) » ; en RÉEL, un bouton vert et « Sources : RÉEL (cliquer pour passer en mock) » ;
- dans le panneau déplié : « Coûts API », le total de la session, **« Effacer »**, puis une bande « DataForSEO » avec la mention « SANDBOX » en MOCK ;
- sur cette bande : « dépensé / plafond (30min) ». Sans dépense, la partie dépensée s'écrit « < $0.001 ». Le plafond est celui de ton poste (« $0.50 » si rien n'est réglé) ;
- une fine barre sous ces chiffres. Elle se remplit avec la dépense, et la bande passe sur fond jaune au-delà de 80 % du plafond ;
- après le passage en RÉEL et 15 secondes d'attente : « PROD » à la place de « SANDBOX » ;
- après le rechargement : toujours « RÉEL » et « PROD » ;
- après le retour en MOCK : « SANDBOX » de nouveau, et la dépense n'a pas bougé.

**C'est un bug si :**
- après 15 secondes, le bouton dit « MOCK » et la bande « PROD », ou l'inverse ;
- le rechargement de la page change le mode ;
- la dépense DataForSEO augmente alors que tu n'as fait que basculer.

**⚠ Défaut connu :** FR-EXT-DATAFORSEO-SANDBOX — les mesures gardées par mot-clé pour tous les articles (volume, CPC, difficulté, intention, questions PAA, pages concurrentes lues par le Lexique) obtenues en simulé restent servies en réel : un mot-clé mesuré en simulé depuis moins de 7 jours y affiche des chiffres factices. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-EXT-DATAFORSEO-COSTGUARD — le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-2 — Au Radar, en MOCK, chaque mot-clé reçoit une mesure factice et gratuite
**Exigences :** FR-EXT-DATAFORSEO-SANDBOX ⚠, FR-EXT-AUTOCOMPLETE-GOOGLE

**Gestes :**
1. Page du cocon, carte **« Moteur »**. Ouvre « Articles suggérés » et clique sur le titre de l'**article enfant**, puis sur l'onglet **Radar**.
   - Si l'onglet refuse de s'ouvrir, c'est un bug (voir le module 03) : prends un autre article. Au besoin, crée un autre enfant depuis une section du pilier (étape 7 du parcours express).
2. Dans « Ajouter un mot-clé à scanner… », ajoute deux mots-clés différents avec **« + Ajouter »**, par exemple `devis plombier` et `plombier urgence nuit`.
3. Déplie la pile d'activité et note la dépense DataForSEO.
4. Clique sur **« Lancer le scan »** et attends la fin.
5. Clique sur la ligne « Autocomplete (N) » pour la déplier.
6. Dans un autre onglet, tape le sujet de l'article dans Google, sans valider, et regarde ses suggestions.

**Tu dois voir :**
- une carte par mot-clé, avec des chiffres après « vol », « KD » et « CPC » : aucune carte n'a « — » partout ;
- des valeurs factices, souvent identiques d'un mot-clé à l'autre : ce sont celles du bac à sable ;
- la bande « DataForSEO » toujours en « SANDBOX », et la même dépense qu'au geste 3 ;
- « Autocomplete (N) » avec N plus grand que 0 et « Cliquer pour déployer ». Déplié, des groupes « → "…" (n) », et des suggestions numérotées « #1 », « #2 »… ;
- des suggestions proches de celles que Google te montre : elles sont réelles, même en MOCK.

**C'est un bug si :**
- en MOCK, une carte n'a aucune mesure (« — » partout) ;
- la dépense DataForSEO augmente en MOCK ;
- « Autocomplete (0) » alors que Google propose des suggestions pour ce sujet et que tu as internet.

**⚠ Défaut connu :** FR-EXT-DATAFORSEO-SANDBOX — les mesures gardées par mot-clé pour tous les articles (volume, CPC, difficulté, intention, questions PAA, pages concurrentes lues par le Lexique) obtenues en simulé restent servies en réel : un mot-clé mesuré en simulé depuis moins de 7 jours y affiche des chiffres factices. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-3 — Au Radar, la proximité de sens de chaque question
**Exigences :** FR-EXT-EMBEDDINGS

**Gestes :**
1. *(Facultatif, pour voir le chargement.)* Redémarre le serveur de développement, puis refais le scan d'EXT-2.
2. Sur une carte du Radar, clique sur le chevron **« ▶ »** pour ouvrir son corps.
3. Regarde les questions « Autres questions posées » (PAA) de la carte.

**Tu dois voir :**
- pour chaque question : un badge d'accord avec le sujet, puis un pourcentage (« 42% » par exemple) : la proximité de sens entre la question et le sujet de l'article, calculée sur ton ordinateur, gratuitement ;
- après un redémarrage, le premier scan peut durer jusqu'à une minute de plus : le modèle de calcul se charge. Les scans suivants sont plus rapides ;
- si le bac à sable ne renvoie aucune question (« Aucune PAA trouvée »), tu ne peux pas conclure : refais ce geste au Radar pendant la section RÉEL.

**C'est un bug si :**
- le scan échoue ou l'écran se bloque pendant le calcul de proximité ;
- un pourcentage dépasse 100 %.

### EXT-4 — Au Capitaine, l'IA simulée signe ses réponses
**Exigences :** FR-EXT-AI-MULTI-PROVIDER, FR-EXT-DATAFORSEO-SANDBOX ⚠, FR-EXT-AUTOCOMPLETE-GOOGLE

**Gestes :**
1. Moteur, sélectionne le **pilier**, onglet **Capitaine**. Clique sur la carte du capitaine verrouillé : le panneau « Capitaine » s'ouvre à droite.
2. Lis le bloc « KPIs marché ».
3. Clique sur le titre « Avis expert IA » pour le déplier, puis sur **« Régénérer »** (ou **« Analyser avec l'IA »** s'il n'y a pas encore d'avis). Lis la question du navigateur, puis clique OK.
4. Refais le geste 3 une deuxième fois.
5. Déplie la pile d'activité.
6. Dans « Tester un mot-clé capitaine… », tape `zqxw plomberie kvj`, puis Entrée. Clique sur sa carte et relis « KPIs marché ».

**Tu dois voir :**
- la question « Régénérer l'avis expert IA ? Cela consommera un appel Claude. ». En MOCK, aucun appel Claude ne part malgré ce texte ;
- un avis qui arrive presque aussitôt : un texte préparé à partir de la demande (trois parties, « 1. Potentiel éditorial »…, qui citent le capitaine), le même aux gestes 3 et 4 ;
- dans la pile, une ligne « Analyse IA capitaine » par avis, avec le modèle « mock-provider-v1 » et le coût « < $0.001 » ;
- dans « KPIs marché » : « Volume » en « rech/m », « Difficulté », « CPC » en €. Ce sont des valeurs factices du bac à sable, souvent les mêmes d'un mot-clé à l'autre, même pour le mot-clé absurde ;
- pour le mot-clé absurde, « Autocomplete » à « 0 matches » : Google ne le suggère pas. Aucun message d'erreur. Ce chiffre est le rang du mot-clé dans les suggestions Google, 0 s'il n'y figure pas.

**C'est un bug si :**
- en MOCK, la ligne de la pile nomme un modèle Claude, Gemini ou OpenRouter, ou affiche un coût supérieur à « < $0.001 » ;
- l'absence de suggestion Google fait apparaître un message d'erreur.

**⚠ Défaut connu :** FR-EXT-DATAFORSEO-SANDBOX — les mesures gardées par mot-clé pour tous les articles (volume, CPC, difficulté, intention, questions PAA, pages concurrentes lues par le Lexique) obtenues en simulé restent servies en réel : un mot-clé mesuré en simulé depuis moins de 7 jours y affiche des chiffres factices. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-5 — Une mesure déjà faite est resservie, « Rafraîchir » la refait
**Exigences :** FR-EXT-DATAFORSEO ⚠, NFR-COST-CACHE-FIRST ⚠

**Gestes :**
1. Moteur, pilier, onglet **Lieutenants**. Clique sur **« Analyser SERP »**.
2. Ouvre la Rédaction du pilier : page du cocon, carte **« Rédaction »**, puis la carte du pilier.
3. Ouvre le panneau **« SEO »** (barre en haut à droite, s'il n'est pas déjà ouvert), puis l'onglet **« SERP Data »**.
4. Note les valeurs et la date en bas du bloc.
5. Clique sur **« Rafraîchir »**. Si le bloc dit « Aucune donnée SERP disponible. », clique sur **« Lancer l'analyse SERP »**.

**Tu dois voir :**
- aux Lieutenants : les résultats reviennent presque aussitôt, avec « (cache) » à côté du nombre de concurrents affichés et dans chaque onglet de mot-clé. Les propositions de lieutenants restent les mêmes ;
- la pile affiche quand même « Analyse SERP lancée (N mots-clés) » : ce message ne dit pas si la base a servi ;
- dans « SERP Data » : quatre cases « Volume », « Difficulté », « CPC », « Concurrence », puis « SERP Top N » et, s'il y en a, « People Also Ask (N) » ; en bas, **« Rafraîchir »** et la date de la mesure ;
- pendant le rafraîchissement, le bouton affiche « ... ». Ensuite, la date du jour, et parfois un bloc « Mots-clés associés (N) » en plus : la copie gardée en base ne les conserve pas ;
- une mesure absente s'affiche « — », jamais 0.

**C'est un bug si :**
- le deuxième « Analyser SERP » relance la longue lecture des pages (« Analyse SERP en cours (x/y) » qui dure) sans « (cache) » ;
- la mesure datait d'un autre jour et, après « Rafraîchir », la date ne change pas ;
- une mesure absente s'affiche 0.

**⚠ Défaut connu :** les mesures demandées en groupe (Radar) et la fiche « SERP Data » taisent un échec du fournisseur, même un refus du plafond de dépense : les valeurs restent vides (« — »), sans message. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** NFR-COST-CACHE-FIRST — un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-6 — Sans internet, l'IA simulée et les mesures déjà faites continuent
**Exigences :** FR-EXT-AI-MULTI-PROVIDER, NFR-COST-AI-MOCK, NFR-COST-CACHE-FIRST ⚠

**Gestes :**
1. Reste en MOCK. Coupe internet (Wi-Fi ou câble). L'outil tourne sur ton ordinateur : il reste ouvert.
2. Moteur, pilier, Capitaine : ouvre le panneau du capitaine, déplie « Avis expert IA », clique sur **« Régénérer »**, puis OK.
3. Onglet **Lieutenants** : clique sur **« Analyser SERP »**.
4. Garde internet coupé pour EXT-7.

**Tu dois voir :**
- l'avis revient comme avec internet : la simulation ne sort pas de ton ordinateur. Une ligne « mock-provider-v1 » de plus dans la pile ;
- aux Lieutenants, les résultats marqués « (cache) » : les mesures de moins de 7 jours sont relues en base, sans réseau.

**C'est un bug si :**
- l'avis échoue sans internet en MOCK : la simulation ferait un appel réseau ;
- les Lieutenants affichent une erreur alors que ces mots-clés ont été analysés il y a moins de 7 jours.

**⚠ Défaut connu :** NFR-COST-CACHE-FIRST — un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-7 — Sans internet, une nouvelle mesure échoue : ce que dit l'écran
**Exigences :** FR-EXT-DATAFORSEO ⚠

**Gestes :**
1. Internet toujours coupé. Capitaine du pilier : dans « Tester un mot-clé capitaine… », tape un mot-clé jamais testé, par exemple `recette hors ligne` suivi de l'heure, puis Entrée.
2. Rédaction du pilier, panneau **« SEO »**, onglet **« SERP Data »** : clique sur **« Rafraîchir »**.
3. Rebranche internet. Recharge la page de Rédaction et rouvre « SERP Data ».

**Tu dois voir :**
- au Capitaine, la nouvelle carte passe de « Validation en cours... » à « Erreur : Keyword validation failed » en quelques secondes : un message générique, en anglais, mais aucune mesure inventée ;
- dans « SERP Data », après le rafraîchissement : « — » dans les quatre cases, « SERP Top 0 », et aucun message (défaut connu ci-dessous) ;
- après le retour d'internet et le rechargement : les valeurs d'avant reviennent. La base a gardé la dernière bonne mesure.

**C'est un bug si :**
- la carte du Capitaine affiche des volumes pour ce mot-clé jamais mesuré ;
- la carte reste sur « Validation en cours... » plus de 30 secondes ;
- après le rechargement, « SERP Data » reste à « — » : le rafraîchissement raté aurait effacé la mesure.

**⚠ Défaut connu :** les mesures demandées en groupe (Radar) et la fiche « SERP Data » taisent un échec du fournisseur, même un refus du plafond de dépense : les valeurs restent vides (« — »), sans message. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-8 — Search Console : se connecter en lecture seule
**Exigences :** FR-EXT-GSC-OAUTH ⚠

**Gestes :**
1. Sur l'accueil, clique sur **« GSC »**.
2. Si l'écran propose de se connecter, clique d'abord sur **« Vérifier la connexion »**.
3. Clique sur **« Connecter Google Search Console »**.
4. Dans l'onglet Google : choisis ton compte, lis les droits demandés, accepte.
5. Reviens sur l'onglet de l'outil et clique sur **« Vérifier la connexion »**.
6. Recharge la page. Puis redémarre le serveur de développement et recharge encore.
7. *(Facultatif, pour le défaut.)* Dans les réglages de ton compte Google, retire l'accès donné à l'outil. Dans l'outil, choisis une « Période » que tu n'as pas encore chargée aujourd'hui (voir EXT-9).

**Tu dois voir :**
- le titre « Post-Publication — Google Search Console » ;
- non connecté : « Connectez votre Google Search Console pour voir les performances post-publication. » et les deux boutons. « Vérifier la connexion » ne change rien et n'affiche pas d'erreur ;
- la page Google s'ouvre dans un **nouvel onglet**, l'outil reste ouvert. Google demande seulement de **voir** tes données Search Console, pas de les modifier ;
- après l'accord, l'onglet affiche « Google Search Console connecte ! » et « Vous pouvez fermer cette page. » ;
- après « Vérifier la connexion » : les réglages « Propriété GSC », « Période » et **« Actualiser »** apparaissent ;
- toujours connecté après le rechargement et après le redémarrage du serveur ;
- si l'onglet Google affiche plutôt un texte technique qui parle d'un identifiant Google manquant, la connexion Google n'est pas réglée sur ce poste : note-le et passe à la suite.

**C'est un bug si :**
- le bouton remplace l'outil au lieu d'ouvrir un nouvel onglet ;
- Google demande le droit de modifier tes données ;
- la connexion est perdue au rechargement ou au redémarrage.

**⚠ Défaut connu :** un accès révoqué n'est pas détecté : le statut reste « connecté », et l'erreur affichée (par exemple « GSC API error: 401 », avec **« Réessayer »**) ne propose pas de refaire la connexion. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-9 — Search Console : lire les performances de son site
**Exigences :** FR-EXT-GSC-PERFORMANCE

**Gestes :**
1. Connecté (EXT-8), laisse « Propriété GSC » vide.
2. Tape ta propriété telle qu'elle est écrite dans Search Console (par exemple `https://ton-site.fr/`), puis Entrée.
3. Dans « Période », choisis « 7 jours », puis « 90 jours ».
4. Clique deux fois de suite sur **« Actualiser »**.
5. Recharge la page.
6. Tape l'adresse d'un site qui n'est pas à toi, puis clique sur **« Actualiser »**. Remets ta propriété à la fin.

**Tu dois voir :**
- champ vide : **« Actualiser »** grisé, et « Saisissez votre propriété GSC et cliquez sur Actualiser pour voir les données. » ;
- pendant le chargement, « Chargement... ». Ensuite, un tableau « Performance par page » : « Page », « Clics », « Impressions », « CTR », « Position moy. » ;
- les pages rangées par clics, du plus au moins cliqué. L'adresse du site est remplacée par « / » ;
- le taux de clic en %, la position en orange jusqu'à 30, en rouge au-delà ;
- chaque changement de période recharge le tableau ;
- le deuxième « Actualiser » répond aussitôt : la même demande, le même jour, sort du cache, sans appel à Google ;
- après le rechargement : ta propriété déjà remplie, les données chargées seules, et la période revenue à « 30 jours » ;
- pour un site qui n'est pas à toi : un message d'erreur (par exemple « GSC API error: 403 ») et **« Réessayer »**, sans plantage.

**C'est un bug si :**
- les pages ne sont pas rangées par clics décroissants ;
- la propriété est oubliée au rechargement alors que tu l'avais chargée ;
- une erreur de Google fige l'écran sans message.

## En mode RÉEL (payant)

Passe le bouton sur **RÉEL** avant ces vérifications, et repasse sur **MOCK** à la fin. Le coût estimé de chaque vérification est donné dans ses gestes. À l'écran, seuls deux gestes préviennent avant de partir : l'analyse SERP du Lexique (« ~$0.003 ») et la régénération d'un avis IA (« Cela consommera un appel Claude. », sans montant). EXT-R3 et EXT-R4 changent la configuration du serveur : note la valeur d'origine, et remets-la à la fin.

### EXT-R1 — L'IA réelle : Claude répond, avec son modèle et son coût
**Exigences :** FR-EXT-AI-MULTI-PROVIDER, FR-EXT-CLAUDE
**Mode :** RÉEL (payant)
**Gestes :**
1. Coût estimé : ~0,02 $.
2. En RÉEL, attends que la bande DataForSEO affiche « PROD ».
3. Capitaine du pilier : ouvre le panneau du capitaine, déplie « Avis expert IA », clique sur **« Régénérer »**, puis OK.
4. Déplie la pile d'activité.

**Tu dois voir :**
- un vrai avis, qui parle de ton mot-clé, et qui s'écrit morceau par morceau ;
- dans la pile, une ligne « Analyse IA capitaine » avec un modèle Claude (par défaut « sonnet-4-6 »), des jetons lus et écrits (par exemple « 2.4k→700 ») et un coût en dollars de quelques centimes ;
- le total de la pastille augmenté d'autant ;
- Claude, même si la configuration du serveur désigne un autre fournisseur d'IA : RÉEL impose Claude ;
- *(si tu lances une action à réponse structurée, comme le classement de pertinence de Discovery)* le modèle « haiku-4-5 ».

**C'est un bug si :**
- en RÉEL, la ligne dit « mock-provider-v1 » ou le texte est l'avis préparé du MOCK ;
- un texte de plusieurs milliers de jetons coûte « < $0.001 » avec un modèle Claude ;
- l'avis arrive sans ligne dans la pile.

### EXT-R2 — Une mesure payée une fois, puis resservie sans frais
**Exigences :** FR-EXT-DATAFORSEO ⚠, FR-EXT-DATAFORSEO-COSTGUARD ⚠, NFR-COST-DATAFORSEO-BUDGET, NFR-COST-CACHE-FIRST ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Coût estimé : ~0,10 $ (mesures, plus un avis IA qui part seul pour chaque nouveau mot-clé).
2. Déplie la pile et note la dépense DataForSEO.
3. Capitaine du pilier : tape un mot-clé réel de **deux mots**, jamais testé (par exemple ton métier et une ville voisine), puis Entrée. Deux mots seulement : au-delà, l'outil mesure aussi ses variantes, et chacune se paie.
4. Attends 15 secondes et relis la dépense.
5. Retape exactement le même mot-clé, puis Entrée. Attends 15 secondes.
6. Tape un mot-clé absurde de deux mots, par exemple `zqxw kvjpl`, puis Entrée. Clique sur sa carte et lis « KPIs marché ». Ne le retape pas : un mot-clé sans aucune donnée est remesuré, donc repayé, à chaque fois (constaté en écrivant cette recette).
7. *(Facultatif.)* Si un article a son capitaine verrouillé sans analyse SERP, ouvre son onglet **Lexique**.

**Tu dois voir :**
- au geste 4 : la dépense a augmenté d'environ 2 centimes (« $0.02 » de plus) ;
- au geste 5 : la carte se met à jour tout de suite, et la dépense ne bouge pas. Un mot-clé mesuré depuis moins de 7 jours est relu en base ;
- des valeurs différentes d'un mot-clé à l'autre (en MOCK, elles étaient identiques) ;
- pour le mot-clé absurde : « Volume », « Difficulté » et « CPC » à « — », jamais 0 ;
- au geste 7 : le bouton **« Lancer l'analyse SERP (~$0.003 DataForSEO) »**, puis une fenêtre « Lancer l'analyse SERP DataForSEO ? » avec **« Confirmer (~$0.003) »** et **« Annuler »**. « Annuler » ne dépense rien ; « Confirmer » ajoute environ $0.003 à la dépense DataForSEO (l'analyse IA du lexique qui peut suivre se paie à part).

**C'est un bug si :**
- le geste 5 fait monter la dépense ;
- une mesure absente s'affiche 0 ;
- la bande dit « PROD » et la dépense ne bouge pas après un mot-clé jamais mesuré.

**⚠ Défaut connu :** les mesures demandées en groupe (Radar) et la fiche « SERP Data » taisent un échec du fournisseur, même un refus du plafond de dépense : les valeurs restent vides (« — »), sans message. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-EXT-DATAFORSEO-COSTGUARD — le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** NFR-COST-CACHE-FIRST — un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-R3 — Le plafond refuse la dépense avant qu'elle parte
**Exigences :** FR-EXT-DATAFORSEO-COSTGUARD ⚠, FR-EXT-DATAFORSEO ⚠, NFR-COST-DATAFORSEO-RESERVE
**Mode :** RÉEL (payant)
**Gestes :**
1. Coût estimé : ~0,05 $.
2. Dans la configuration du serveur, règle le plafond de dépense DataForSEO à `0.025` (la variable de réglage du plafond, citée dans « Avant de commencer » du parcours express). Redémarre le serveur de développement, puis recharge la page : le bouton renvoie tout seul « RÉEL » au serveur.
3. Déplie la pile d'activité.
4. Capitaine du pilier : tape un mot-clé réel de deux mots jamais testé (le mot-clé A), puis Entrée. Attends 15 secondes.
5. Tape un autre mot-clé de deux mots jamais testé (le mot-clé B), puis Entrée. Attends 15 secondes.
6. *(Pour le défaut.)* Au Radar de l'article enfant, ajoute un mot-clé jamais scanné, puis **« Lancer le scan »**.
7. Remets le plafond d'origine, redémarre le serveur, recharge la page.

**Tu dois voir :**
- au geste 3 : « PROD », et une dépense repartie de zéro (« < $0.001 ») : le redémarrage remet le compteur à zéro. Le plafond s'affiche « $0.03 », arrondi au centime ;
- au geste 4 : la carte A mesurée, puis la bande à « $0.02 / $0.03 (30min) » sur fond jaune : plus de 80 % du plafond ;
- au geste 5 : la carte B affiche « Erreur : Plafond de dépense DataForSEO atteint ($0.0220 / $0.03 sur 30min). ». La bande reste à « $0.02 » : les appels qui auraient dépassé le plafond ne sont pas partis, donc pas payés (un petit appel qui tenait encore sous le plafond a pu passer) ;
- aucune ligne d'erreur dans la pile pour ce refus (le refus ne s'y inscrit pas) ;
- au geste 6 : des cartes avec « — » en volume, et aucun message qui parle du plafond (défaut connu ci-dessous) ;
- après le geste 7 : une nouvelle mesure repasse normalement.

**C'est un bug si :**
- la dépense dépasse le plafond ;
- la carte B affiche des mesures : l'appel serait passé malgré le plafond ;
- le message de refus ne donne pas la dépense, le plafond et la durée de la fenêtre.

**⚠ Défaut connu :** les mesures demandées en groupe (Radar) et la fiche « SERP Data » taisent un échec du fournisseur, même un refus du plafond de dépense : les valeurs restent vides (« — »), sans message. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-EXT-DATAFORSEO-COSTGUARD — le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### EXT-R4 — Claude hors service : un autre fournisseur prend le relais
**Exigences :** FR-EXT-AI-FALLBACK ⚠, FR-EXT-GEMINI ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Coût estimé : 0 $ (Claude refuse la demande ; Gemini et OpenRouter sont gratuits ici). Facultatif.
2. Dans la configuration du serveur, remplace la clé d'API Claude par une valeur fausse. Garde la vraie de côté. Redémarre le serveur, recharge la page, vérifie « RÉEL ».
3. Capitaine du pilier : ouvre le panneau du capitaine, déplie « Avis expert IA », clique sur **« Régénérer »**, puis OK.
4. Lis l'avis et la nouvelle ligne de la pile.
5. Remets la vraie clé, redémarre le serveur, recharge la page.

**Tu dois voir :**
- un avis qui arrive quand même : une clé refusée n'est pas retentée, l'outil passe tout de suite au fournisseur suivant ;
- dans la pile, le modèle qui a vraiment répondu : un modèle Gemini (« gemini-… ») si Gemini est réglé sur un modèle encore servi, sinon un modèle OpenRouter (nom qui finit par « :free »), avec un coût nul ou presque (« < $0.001 ») ;
- si aucun autre fournisseur n'est réglé sur ce poste : un message d'erreur dans le panneau de l'avis, pas un panneau vide ;
- rien, à l'écran, ne dit que Claude a échoué (défaut connu ci-dessous).

**C'est un bug si :**
- le panneau reste vide, sans texte ni message ;
- la pile nomme un modèle Claude alors que la clé est fausse.

**⚠ Défaut connu :** la bascule n'est écrite que dans le journal du serveur ; la pile d'activité montre seulement le modèle qui a répondu. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** le modèle Gemini par défaut, Gemini 2.0 Flash, n'est plus servi par Google : sans réglage, Gemini échoue et la chaîne passe à OpenRouter. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## Hors recette

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
| FR-EXT-GSC-KEYWORD-GAP | Prévue, pas livrée : le calcul existe sur le serveur, mais aucun écran ne compare les mots-clés visés à ceux que Google affiche. |
| FR-EXT-TAVILY | Aucun écran ne lance l'analyse d'écart de contenu, seule utilisatrice de Tavily : rien à cliquer, rien à voir. |
| FR-EXT-TESTS-NO-COST | Elle porte sur les suites de tests lancées en ligne de commande, pas sur un écran de l'outil. Les tests automatiques la gardent eux-mêmes. |
