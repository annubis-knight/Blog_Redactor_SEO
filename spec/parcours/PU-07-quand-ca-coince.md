---
title: Parcours — Comprendre et repartir quand ça coince
id: PU-07
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-07 — « Quelque chose coince : je veux savoir pourquoi, ce qui est gardé, et repartir sans repayer »

**But :** comprendre ce qui bloque (un service, le plafond de dépense, l'IA, le réseau, le serveur, le mode), savoir ce que l'outil a gardé, et reprendre le travail sans payer deux fois.
**Quand :** en plein travail au Moteur, en RÉEL, le Capitaine affiche « Erreur : … » sur un mot-clé, ou un scan Radar revient avec des « — » partout ; ou la Wi-Fi tombe pendant que le premier jet s'écrit ; ou le serveur vient de redémarrer.
**Départ :** une action vient d'échouer, ou de rendre un résultat vide, sur un article en cours de travail.
**Arrivée :** la cause est identifiée (message, pile d'activité, mode), l'action est relancée au bon moment, et ce qui avait été mesuré ou écrit avant l'incident est retrouvé sans nouvel appel payant.
**Recette :** module 08 (EXT-1, EXT-5 à EXT-7, EXT-R2 à EXT-R4), module 09 (INFRA-1 à INFRA-3, INFRA-9, INFRA-10, INFRA-20, INFRA-R1, INFRA-R2), module 03 (MOT-16, MOT-17), module 07 (RED-R1).
**Test automatique :** aucun (manque)

## Les étapes

### 1. Lire le message là où l'action a échoué
**Exigences :** NFR-OBS-KNOWN-ERRORS ⚠, FR-INFRA-ERROR-HANDLER ⚠

Le premier indice est sur la carte, le panneau ou le bandeau de l'action qui a échoué. Une cause reconnue s'affiche en français : « Quota DataForSEO atteint. Rechargez vos crédits puis relancez. », « Plafond de dépense DataForSEO atteint (… sur 30min). », « Le modèle IA (…) est surchargé. Nouvelle tentative dans quelques instants. ». Les autres causes arrivent en message court, parfois générique et en anglais (au Capitaine, « Erreur : Keyword validation failed »), jamais avec une trace technique. Certains échecs ne disent rien du tout, par exemple une suggestion ratée au Cerveau ou des valeurs restées à « — » : l'étape suivante aide à les comprendre.

### 2. Déplier la pile « Coûts API »
**Exigences :** NFR-OBS-COST-LOG, FR-INFRA-COST-LOG-STORE

En bas à gauche, la pastille (un montant, puis « N appels ») se déplie en « Coûts API ». Une erreur connue y ajoute une ligne rouge avec la marche à suivre : « Quota DataForSEO atteint », « Quota IA atteint », « Modèle IA surchargé » ; chaque ligne d'IA donne le modèle qui a réellement répondu et son coût. Chaque action qui écrit en base y ajoute ses lignes violettes (type d'écriture, table, nombre de lignes) : un enregistrement qui n'a rien écrit (« 0 row ») se voit là. En tête, la bande « DataForSEO » affiche « dépensé / plafond (30min) », une barre qui passe sur fond jaune au-delà de 80 % du plafond, et « SANDBOX » ou « PROD ». La pile se vide au rechargement de la page : lis-la avant de recharger.

### 3. Vérifier le mode : « MOCK » ou « RÉEL »
**Exigences :** FR-INFRA-RUNTIME-MODE, NFR-CFG-DATAFORSEO-SANDBOX

Le bouton de la barre du haut affiche « MOCK » ou « RÉEL » (info-bulle « Sources : MOCK (cliquer pour passer en réel) »). C'est le mode que le serveur applique à l'IA comme à DataForSEO : « MOCK », rien n'est facturé. La mention « SANDBOX » ou « PROD » de la pile, relue toutes les 15 secondes, dit la même chose. Le bouton relit le serveur au retour sur l'onglet et toutes les 15 secondes : si les deux se contredisent plus de 15 secondes, c'est un défaut. Le mode vaut pour tout le serveur : un run du mode automatique lancé à côté impose le sien, et le bouton l'adopte.

### 4. Plafond de dépense atteint : attendre, ou relever le plafond
**Exigences :** FR-EXT-DATAFORSEO-COSTGUARD ⚠, NFR-COST-DATAFORSEO-RESERVE, NFR-CFG-DATAFORSEO-BUDGET

En RÉEL, une mesure DataForSEO qui ferait dépasser le plafond de la fenêtre glissante (0,50 $ sur 30 minutes si rien n'est réglé) est refusée avant de partir : elle n'est pas payée. Au Capitaine, la carte l'affiche, par exemple « Erreur : Plafond de dépense DataForSEO atteint ($0.0220 / $0.03 sur 30min). ». Tu peux attendre que la fenêtre glisse : les appels repassent d'eux-mêmes. Ou relever le plafond dans la configuration du serveur, puis le redémarrer : le compteur repart de zéro.

### 5. IA saturée ou sans crédits : laisser l'outil basculer, puis recharger ses crédits
**Exigences :** FR-EXT-AI-FALLBACK ⚠, FR-EXT-CLAUDE, FR-EXT-GEMINI ⚠, NFR-CFG-AI-FALLBACK-OPT-OUT

Une IA saturée ou à court de quota est réessayée deux fois, puis la demande passe au fournisseur suivant (Claude, Gemini, OpenRouter) : la réponse arrive quand même, et la pile nomme le modèle qui a répondu (« gemini-… », ou un nom qui finit par « :free »). Rien d'autre ne dit que Claude a échoué : un modèle inattendu dans la pile est l'indice. La recherche de sources sur le web n'a pas de relais : elle échoue avec « Quota Claude atteint ou crédits Anthropic insuffisants. Rechargez vos crédits. » ou « La recherche web exige Claude : aucun autre fournisseur ne sait chercher et citer ses sources. ». Recharge tes crédits, puis relance l'action ; la bascule peut aussi être coupée dans la configuration du serveur, pour n'essayer que le fournisseur choisi.

### 6. Service de données muet ou internet coupé : ce qui continue, ce qui échoue
**Exigences :** FR-EXT-DATAFORSEO ⚠, FR-EXT-AUTOCOMPLETE-GOOGLE, FR-LIE-SERP-ECHEC-EXPLIQUE ⚠, NFR-COST-AI-MOCK

L'outil tourne sur ta machine : il reste ouvert sans internet. En MOCK, l'IA simulée répond sans réseau, et les mesures de moins de 7 jours sont relues en base (« (cache) » aux Lieutenants). Une nouvelle mesure, elle, échoue : « Erreur : Keyword validation failed » au Capitaine, « L'analyse SERP n'a pas abouti pour « … » … Relancez-la, ou choisissez un autre mot-clé. » aux Lieutenants ; les suggestions Google reviennent vides, sans erreur. Rebranche, recharge la page : la dernière bonne mesure est toujours là.

### 7. Après un redémarrage du serveur : vérifier la base et retrouver son travail
**Exigences :** FR-INFRA-DB-CONNECTION-CHECK, NFR-COST-POSTGRESQL, NFR-COST-DATAFORSEO-BUDGET

Dans le terminal de `npm run dev`, « PostgreSQL connected » confirme que la base répond ; sinon, « PostgreSQL connection failed » donne une piste (service arrêté, identifiants refusés, base absente), et le serveur démarre quand même. La page se recharge d'elle-même. Articles, étapes cochées, mots-clés et mesures gardées sont retrouvés à l'identique. Le compteur de dépense DataForSEO, lui, repart de zéro.

### 8. Essayer en RÉEL, puis revenir en MOCK
**Exigences :** FR-EXT-DATAFORSEO-SANDBOX, FR-EXT-AI-MULTI-PROVIDER, NFR-COST-DATAFORSEO-BUDGET

Un clic sur « MOCK » passe le bouton à « RÉEL », en vert, et la pile affiche « PROD » en 15 secondes au plus. Ce clic efface les mesures de mots-clés faites en MOCK (voir plus bas). En RÉEL, l'IA est Claude, quel que soit le réglage du serveur, et chaque mesure DataForSEO se paie, sous le plafond. À la fin, un nouveau clic ramène « MOCK » : « SANDBOX » revient, et la dépense ne bouge plus.

### 9. Reprendre sans repayer
**Exigences :** FR-INFRA-API-CACHE, FR-INFRA-GET-OR-FETCH, FR-INFRA-KEYWORD-DISCOVERIES, FR-MOT-EXPLORATIONS-HYDRATATION, NFR-INT-SERP-ONCE, NFR-COST-CACHE-FIRST ⚠

Rouvre l'article et relance l'action : ce qui a été obtenu avant l'incident est relu, pas racheté. Au Moteur, l'invite « Charger … » et son bouton « DB n » rappellent les candidats étudiés et les lieutenants proposés ; une nouvelle « Analyser SERP » revient avec « (cache) » ; en Discovery, le bandeau « Dernière analyse du … » propose « Charger », sans nouvel appel. Seuls « Rafraîchir » (« Rafraîchir » en Discovery) et une mesure de plus de 7 jours repaient. Exception : le scan Radar rachète ses mesures à chaque fois.

## Ce qui peut mal tourner

### Un rechargement pendant la rédaction du premier jet
**Exigences :** FR-RED-GEN-SAUVEGARDE-AU-FIL, FR-INFRA-API-STREAM ⚠, NFR-PERF-SSE-FIRST-TOKEN ⚠, FR-RED-SEO-SCORE-PERSIST ⚠

Le texte est enregistré à la fin de chaque chapitre : après un rechargement ou un onglet fermé, les chapitres terminés sont là, et la méta est encore l'ancienne. Mais le premier jet n'a pas de bouton d'arrêt, et quitter l'écran n'arrête pas la génération : le serveur la termine et la facture, alors que la suite du texte n'est plus enregistrée. L'ancien score SEO reste en base au lieu de « — ». Pour un texte complet, « Régénérer l'article » repart de zéro, et se repaie en RÉEL.

### Une mesure refusée passe en silence
**Exigences :** FR-EXT-DATAFORSEO ⚠, NFR-OBS-KNOWN-ERRORS ⚠, FR-INFRA-KEYWORD-METRICS ⚠

Au Radar et dans « SERP Data », une mesure refusée par le plafond ou perdue dans une panne ne dit rien : les cases restent à « — », et la pile n'inscrit pas le refus du plafond. Seule la bande DataForSEO, jaune près du plafond, met sur la piste. Un « Rafraîchir » raté date quand même la mesure du jour, et pour un mot-clé sans volume connu il remplace la réponse gardée par une fiche vide. Avant de conclure qu'un mot-clé n'a pas de marché, regarde la bande DataForSEO et relance plus tard.

### Le serveur redémarre pendant que la page reste ouverte
**Exigences :** NFR-COST-AI-MOCK, FR-INFRA-RUNTIME-MODE

Le serveur revient d'abord à sa configuration. La page, restée ouverte, le remarque au plus tard 15 secondes après (ou dès que tu reviens sur l'onglet) et lui renvoie le mode dont elle se souvient, sans rechargement. Si ta configuration est payante, attends ces quelques secondes, ou que la pile réaffiche « SANDBOX », avant de relancer une action. Un serveur qui redémarre en réel efface aussi les mesures faites en MOCK.

### Un article préparé en MOCK, repris en RÉEL
**Exigences :** FR-EXT-DATAFORSEO-SANDBOX, NFR-COST-CACHE-FIRST ⚠

Rien de simulé n'est servi comme vrai. Les longues traînes, les découvertes enregistrées et les réponses gardées quelques jours ne servent qu'au mode qui les a obtenues : en RÉEL, Discovery ne propose plus la récolte simulée, et la même demande repart vers la vraie source. Les mesures de mots-clés faites en MOCK (volume, CPC, difficulté, intention, questions PAA, pages lues pour le Lexique) sont effacées au passage en RÉEL : au Capitaine, les candidats étudiés en MOCK s'affichent sans mesure, et leur première étude en RÉEL se paie. Seul ce que l'article a gardé de son propre travail (cartes du Radar, questions PAA jugées et avis IA du Capitaine, indicateurs des lieutenants, lexique extrait) garde ses chiffres simulés : refais ces étapes en RÉEL avant de t'y fier. Ne bascule pas pendant une étude : la mesure simulée en cours s'enregistrerait comme réelle.

### Une panne pendant la rédaction se dit
**Exigences :** FR-RED-DRAFT-SINGLE-PASS, FR-RED-GEN-SAUVEGARDE-AU-FIL

Avant le premier mot, l'outil réessaie puis passe au fournisseur d'IA suivant. Une coupure en cours d'écriture arrête le premier jet : un message le dit, dans la rédaction guidée comme dans l'éditeur, et le texte en cours quitte l'écran. Recharge la page : les chapitres enregistrés au fil avant la coupure sont là.

## Défauts connus sur ce parcours

- NFR-OBS-KNOWN-ERRORS — le dépassement du budget DataForSEO n'est pas inscrit dans la pile d'activité ; une erreur inconnue affiche son message brut, pas un message générique ; au Cerveau, l'échec d'une suggestion, d'une fusion, d'une sous-question, d'un enrichissement, d'une régénération ou de l'enregistrement par « Suivant » n'affiche rien ; l'échec de « Remplir les champs avec Claude » et un aperçu refusé s'expliquent en anglais.
- FR-INFRA-ERROR-HANDLER — la plupart des routes interceptent leurs erreurs et renvoient un 500 générique ; seules quelques-unes traduisent les erreurs connues en 429 / 503.
- FR-EXT-DATAFORSEO-COSTGUARD — le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 ».
- FR-EXT-AI-FALLBACK — la bascule n'est écrite que dans le journal du serveur ; la pile d'activité montre seulement le modèle qui a répondu ; un fournisseur de secours sans clé configurée arrête la chaîne au lieu de passer au suivant, et l'utilisateur lit un message technique en anglais à la place de la vraie cause.
- FR-EXT-GEMINI — le modèle par défaut, Gemini 2.0 Flash, n'est plus servi par Google : sans réglage, Gemini échoue et la chaîne passe à OpenRouter.
- FR-EXT-DATAFORSEO — les mesures demandées en groupe et la fiche SEO du brief taisent un échec du fournisseur, y compris un refus du plafond de dépense : les valeurs restent vides, sans message ; un « Rafraîchir » qui échoue tout à fait remplace toute la page de rédaction par le bloc d'erreur, au lieu du seul panneau « SERP Data ».
- FR-LIE-SERP-ECHEC-EXPLIQUE — le serveur remplace toute cause (aucun résultat, source muette) par « SERP analysis failed », affiché entre parenthèses ; une coupure réseau n'est pas reconnue ; le plafond de dépense invite à changer de mot-clé, et un quota épuisé à attendre au lieu de recharger les crédits.
- NFR-COST-CACHE-FIRST — un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine.
- FR-INFRA-API-STREAM — quand l'utilisateur annule, l'écran s'arrête mais le serveur continue la génération jusqu'au bout et la facture.
- NFR-PERF-SSE-FIRST-TOKEN — le premier jet n'a pas de bouton d'arrêt ; un arrêt côté écran ne coupe pas la génération côté serveur, qui continue et se facture.
- FR-RED-SEO-SCORE-PERSIST — un premier jet interrompu enregistre le texte sans remettre les scores à « inconnu » : l'ancien score reste en base, à l'écran comme en mode automatique.
- FR-INFRA-KEYWORD-METRICS — tant que DataForSEO ne renvoie ni difficulté ni coût par clic pour un mot-clé, chaque étude le remesure, et le repaie ; un « Rafraîchir » raté date quand même la mesure du jour, et pour un mot-clé sans volume connu la fiche vide remplace la réponse gardée.
