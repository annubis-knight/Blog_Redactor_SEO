---
title: Parcours — Choisir le mot-clé d'un article
id: PU-04
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-04 — « Je cherche le bon mot-clé pour cet article, je compare, et je le verrouille »

**But :** choisir en connaissance de cause le mot-clé principal (le Capitaine) d'un article : assez cherché dans Google, fidèle à la douleur du lecteur, et sans payer deux fois la même mesure.
**Quand :** l'article intermédiaire « Combien coûte un site vitrine ? » vient de naître d'une section du pilier, avec le mot-clé suggéré « prix site vitrine ». Avant de le rédiger, le consultant veut voir ce que les gens tapent vraiment autour de ce sujet, comparer quelques candidats et n'en garder qu'un.
**Départ :** l'article existe dans le cocon ; son mot-clé n'est qu'une suggestion (en pointillés dans « Articles suggérés ») et aucun de ses six points de progression n'est plein.
**Arrivée :** un seul Capitaine verrouillé (cadenas vert, en tête de la liste du Capitaine), le point « Capitaine » plein et le mot-clé en trait plein dans « Articles suggérés » ; les points « Discovery » et « Radar » pleins s'il est passé par l'exploration ; ses candidats et son Radar enregistrés, qui reviennent quand il rouvre l'article.
**Recette :** parcours express, étapes 2 et 3 ; module 03 (MOT-3, MOT-4, MOT-8, MOT-9, MOT-17) ; module 04 (DIS-1 à DIS-10, RAD-1 à RAD-15, DIS-R1, RAD-R1 à RAD-R4) ; module 05 (CAP-1 à CAP-22, CAP-R1 à CAP-R4) ; module 08 (EXT-R3) ; module 09 (INFRA-R1).
**Test automatique :** le robot suit chaque onglet séparément, dans un vrai navigateur et en mode simulé : Discovery depuis la racine jusqu'à l'envoi au Radar ; l'ajout d'un mot-clé au Radar, son scan, le retour du scan après rechargement et l'envoi d'une carte au Capitaine ; l'étude d'un mot-clé au Capitaine, sa seconde étude servie par la mémoire, puis son verrouillage à travers la porte (alarme, raison trop courte refusée, dérogation qui tombe quand les données changent). Il déplie cartes et questions, trie, génère des longues traînes, clique les mots d'un mot-clé pour en étudier les racines. Aucun test n'enchaîne les trois onglets d'un seul trait, ni ne remplace un Capitaine verrouillé par un autre candidat.

## Les étapes

### 1. Ouvrir le Moteur sur l'article
**Exigences :** FR-MOT-ARTICLE-SELECTION ⚠, FR-MOT-FREE-NAV, FR-MOT-NO-AUTO-ACTION

Depuis la page du cocon, l'utilisateur clique la carte « Moteur », ouvre « Articles suggérés (N) » et clique le titre de l'article. Les onglets s'activent et le Moteur s'ouvre sur « Capitaine », le premier onglet utile d'un article qui n'a franchi aucune étape ; la barre « Résultats déjà calculés » apparaît en bas. Pour explorer avant de décider, il clique « Discovery » dans le groupe « 1 Générer » : Discovery et Radar restent ouverts à tout moment, explorer ne fige rien. Aujourd'hui, cette ouverture du Capitaine étudie déjà seule le mot-clé suggéré, avec de possibles appels payants.

### 2. Faire le tour des idées depuis une racine
**Exigences :** FR-DIS-SOURCES, FR-DIS-LONGTAIL-GENERATION ⚠

Le champ « Mot-clé racine » est déjà rempli avec le mot-clé de l'article ; « Découvrir » interroge les suggestions de Google (« Alphabet (A-Z) », « Questions », « Intent Modifiers », « Prepositions »), l'IA (« IA Claude ») et les données de marché (« DataForSEO »). Chaque section se remplit dès que sa source répond, avec son compteur ; un mot-clé trouvé par plusieurs sources porte « ×2 » et remonte en tête. S'il veut des requêtes courtes, pensées pour les questions de Google, il clique « Courte-traîne IA ». Relancer « Découvrir » sur la même racine ne rappelle aucune source.

### 3. Écarter le hors-sujet et se faire aider
**Exigences :** FR-DIS-RELEVANCE-FILTER, FR-DIS-AI-ANALYSIS

Juste après la recherche, le « Filtre de pertinence » juge chaque mot-clé face à l'article et à sa douleur, puis masque le hors-sujet sans le supprimer (« X pertinents / N total ») : décocher le filtre fait revenir les mots-clés masqués, grisés. La colonne « Groupes de mots » restreint les listes aux mots-clés qui contiennent un mot. Dans le panneau « Analyse IA Discovery », « Analyser les N résultats pertinents » propose une sélection classée, chaque mot-clé avec sa priorité et sa raison.

### 4. Cocher une sélection et l'envoyer au Radar
**Exigences :** FR-DIS-SEND-TO-RADAR ⚠, FR-DIS-CHECK, FR-DIS-CAPTAIN-PRESCAN

Il coche six à huit mots-clés, par la case « Tout » d'une section ou par les propositions de l'IA. Cocher une case seule lance, cinq secondes plus tard, une étude Capitaine de ce mot-clé (« Validation Capitaine dans 5s », avec « Annuler ») : payante en mode réel, elle range le mot-clé parmi les candidats, sans le verrouiller. La barre du bas affiche « N mot(s)-clé(s) sélectionné(s) » ; « Envoyer au Radar → » ouvre le Radar sur « N mots-clés à scanner » et remplit le point « Discovery ».

### 5. Compléter la liste d'attente et lancer le scan
**Exigences :** FR-RAD-DB-FIRST, FR-RAD-MANUAL-ADD ⚠, FR-RAD-SCAN-2PASS, FR-RAD-CHECK

La liste d'attente est enregistrée sur l'article. Il y ajoute ses propres idées (« Ajouter un mot-clé à scanner… », puis Entrée ou « + Ajouter » ; un doublon n'ajoute rien) et retire les moins bonnes avec « × », pour garder une poignée de mots-clés : chacun coûte une page de résultats Google en mode réel. « Lancer le scan » mesure le volume, la difficulté, le CPC, l'intention, les suggestions et les questions « Autres questions posées » (PAA) de chaque mot-clé (« Autocomplete + KPIs... », « Analyse PAA... », « Calcul du score... »). Une carte par mot-clé apparaît, et le point « Radar » se remplit.

### 6. Classer les cartes par note de marché
**Exigences :** FR-RAD-SCORING-BIMODAL ⚠, FR-RAD-MARKET-LEVEL-AWARE, FR-RAD-MARKET-COMPUTED-LIVE, FR-RAD-SCORE-RING-TOOLTIP ⚠, FR-RAD-PAA-TREE, FR-RAD-THERMOMETER ⚠

Chaque carte montre « VOL », « KD », « CPC », « PAA », les icônes d'intention et un anneau noté « Score KPI » : le Score Marché, qui répond à « ce mot-clé pèse-t-il en SEO ? », avec des seuils qui dépendent du niveau de l'article. Survoler l'anneau détaille ses six composantes et le « Total » ; le triangle ▶ déplie l'arbre des questions PAA. Il trie par « Score KPI » (↓, ↑, puis l'ordre d'arrivée), une carte sans note restant en bas, et filtre « Avec CPC » ou « Sans CPC » ; le thermomètre, au-dessus, donne la chaleur du sujet. La pertinence face à la douleur ne se juge pas ici, mais au Capitaine.

### 7. Chercher des longues traînes (facultatif)
**Exigences :** FR-RAD-AI-SUGGESTIONS ⚠, FR-RAD-LONGTAIL-GENERATE ⚠, FR-RAD-LONGTAIL-UI ⚠, FR-RAD-LONGTAIL-REGENERATE ⚠

Le panneau « Suggestions IA Radar » reprend, sans appel d'IA, les cinq meilleures cartes notées 40 ou plus. Dès deux cartes, la section « Suggestions longue-traine » propose, par « ✨ Suggerer des combinaisons », dix combinaisons au plus des mots-clés scannés, chacune notée « N/10 » avec sa justification et ses mots-clés d'origine ; les cinq meilleures arrivent cochées. « ⟳ Regenerer » avec les mêmes cartes resservit la même liste, sans nouvel appel.

### 8. Envoyer les meilleurs candidats au Capitaine
**Exigences :** FR-RAD-SEND-CAPTAIN ⚠, FR-MOT-CROSS-TAB-PAYLOAD, FR-CAP-LIST-SIDEPANEL ⚠

Il coche les cartes, et les longues traînes, qu'il veut comparer ; « Envoyer au Capitaine (N) » les compte une seule fois chacune. Le clic ouvre l'onglet Capitaine, qui étudie chaque mot-clé reçu (« Validation en cours... ») et l'ajoute aux candidats de l'article. Aujourd'hui, juste après cet envoi, un Capitaine déjà verrouillé perd sa marque et sa place en tête jusqu'à la réouverture de l'article.

### 9. Comparer les candidats
**Exigences :** FR-CAP-SCORING-BIMODAL ⚠, FR-CAP-RELEVANCE-LIVE ⚠, FR-CAP-INPUT ⚠, FR-CAP-SCAN ⚠, FR-CAP-LIST-SIDEPANEL ⚠, FR-CAP-AI-PANEL ⚠

Au Capitaine, chaque carte porte une autre note, le « Score Pertinence » : ce mot-clé sert-il la douleur de cet article ? Il trie par « Score Pertinence » et teste ses propres idées dans « Tester un mot-clé capitaine… » (Entrée ou « Analyser ») ; un mot-clé déjà présent est ré-étudié à sa place. Un clic sur la ligne d'indicateurs d'une carte ouvre le panneau « Capitaine » : le verdict (« GO », « ORANGE », « NO-GO » ou « GRAY »), les « KPIs marché » en lecture seule et l'« Avis expert IA » en trois parties. Le verdict aide à décider, il ne bloque pas le cadenas. Aujourd'hui, la note affichée juste après une étude peut changer à la réouverture de l'article.

### 10. Essayer des mots-clés plus courts
**Exigences :** FR-CAP-ROOTS ⚠, FR-CAP-LOCK-INTEGRITY ⚠

Sur un mot-clé d'au moins trois mots, les mots au-delà des deux premiers mots significatifs sont cliquables : en retirer un étudie la combinaison restante, une « racine », et l'affiche sur la carte avec sa propre note. Quand le volume du mot-clé est faible pour le niveau de l'article, ses racines sont étudiées d'office. La section « Racines » du panneau les liste, chacune avec sa note, et en donne la « Moyenne n/100 », qui compte dans le Score Pertinence. La carte garde sa place dans le tri, et son cadenas vise toujours le mot-clé d'origine : pour faire d'une racine le Capitaine, il l'étudie comme un candidat à part.

### 11. Verrouiller le Capitaine
**Exigences :** FR-CAP-LOCK-GATE, FR-CAP-LOCK-RADIO, FR-CAP-CHECK ⚠, FR-INFRA-GATE-WAIVER ⚠

Il clique le cadenas de la carte choisie (infobulle « Verrouiller »). La porte vérifie d'abord le candidat ; s'il est risqué, l'alarme « Avant de verrouiller le capitaine » s'ouvre : 🔴 pour un volume nul ou jamais mesuré, un verdict NO-GO, une intention de Google contraire à celle de l'article ; 🟠 pour « Google ne suggère pas cette requête quand on commence à la taper. » ; sous les points graves, « À la place : » propose jusqu'à cinq autres candidats mesurés. « Revenir corriger » ou Échap ne change rien ; passer outre demande « J’ai lu » pour un 🟠, et pour un 🔴 une catégorie et une raison d'au moins 20 caractères, puis « Je prends la responsabilité et je continue ». Verrouillée, la carte passe en tête avec un cadenas vert, le point « Capitaine » se remplit, et « Continuer vers Lieutenants → » invite à la suite.

### 12. Changer d'avis
**Exigences :** FR-CAP-LOCK-RADIO, FR-CAP-CHECK ⚠, FR-MOT-CHECKS

Verrouiller un autre candidat remplace l'ancien dans le même geste, après sa propre porte : il n'y a jamais deux cartes vertes. Cliquer le cadenas vert (« Déverrouiller ») vide le Capitaine et retire l'étape ; le point « Structure » se vide aussi, puisque la structure est bâtie sur le Capitaine. Si des lieutenants sont déjà retenus, « Déverrouiller le Capitaine ? » propose « Les garder » ou « Tout réinitialiser » ; Échap ou un clic à côté annule. Une réponse déjà donnée à l'alarme vaut tant que le mot-clé et ses mesures n'ont pas changé : reverrouiller un candidat déjà assumé ne redemande rien.

## Ce qui peut mal tourner

### Il rouvre l'article le lendemain
**Exigences :** FR-DIS-CACHE ⚠, FR-RAD-PERSIST ⚠, FR-CAP-PERSIST ⚠, FR-CAP-ROOTS ⚠, FR-CAP-AI-PANEL ⚠

Rien de ce qui a été payé ne doit l'être à nouveau. À Discovery, l'écran repart vide ; retaper la racine fait apparaître le bandeau « Derniere analyse du JJ/MM/AAAA · N mots-cles · analyse IA incluse », et « Charger » rend les sections, les jugements du filtre et l'analyse IA sans appel (« Rafraichir » oublie la sauvegarde). Au Radar, l'invite « Charger Radar » et son bouton « DB » rendent les mêmes cartes et les mêmes notes, sans scan ; au Capitaine, les candidats reviennent, le Capitaine verrouillé en tête. Aujourd'hui : la courte-traîne n'est pas sauvegardée et une sauvegarde n'expire jamais ; les longues traînes ne reviennent pas et la liste d'attente peut revenir vide ; les racines reviennent sans note ; l'avis de l'IA est redemandé, et repayé, pour chaque candidat.

### Il refait une mesure déjà payée
**Exigences :** FR-CAP-SCAN ⚠, FR-INFRA-KEYWORD-METRICS ⚠, NFR-COST-CACHE-FIRST ⚠, FR-MOT-CACHE-CASCADE ⚠

Un mot-clé mesuré depuis moins de sept jours, pour n'importe quel article, même d'un autre cocon, doit être resservi sans appel ; au Radar, les suggestions et les questions PAA de moins d'un jour sont relues (« PAA en cache »). Le Radar et le Capitaine partagent leurs mesures : un mot-clé scanné au Radar n'est pas remesuré à son étude au Capitaine, ni au scan suivant. Aujourd'hui, un mot-clé sans difficulté ni CPC connus est remesuré, et repayé, à chaque étude au Capitaine ; les appels d'IA de Discovery ne sont jamais réutilisés, sauf par « Charger ». La dépense ne s'annonce pas avant l'action : elle se lit après coup dans la pile « Coûts API », en bas à gauche.

### L'étude d'un mot-clé échoue
**Exigences :** FR-CAP-SCAN ⚠, FR-CAP-INPUT ⚠, FR-EXT-DATAFORSEO ⚠

Sans connexion, ou quand un service tombe, la carte passe de « Validation en cours... » à « Erreur : … », sans aucune mesure inventée ; une racine en échec affiche « Impossible de valider "…" » et la carte revient à l'état d'avant. Les mesures récentes restent utilisables hors ligne. Aujourd'hui, le message est en anglais technique et ne dit pas la cause (« Erreur : Keyword validation failed ») ; ré-étudier le mot-clé une fois la connexion revenue ne lève pas l'erreur affichée ; au Radar, un échec de mesure laisse des « — » sans aucun message.

### Le plafond de dépense est atteint (mode réel)
**Exigences :** NFR-COST-DATAFORSEO-RESERVE, FR-EXT-DATAFORSEO-COSTGUARD ⚠, FR-EXT-DATAFORSEO ⚠

En mode réel, une mesure qui ferait dépasser le plafond de dépense sur sa fenêtre de 30 minutes est refusée avant de partir : au Capitaine, la carte affiche « Erreur : Plafond de dépense DataForSEO atteint (… sur 30min). », et rien n'est payé. Aujourd'hui, au Radar, le même refus laisse des cartes à « — » sans un mot sur le plafond, et le plafond affiché est arrondi au centime.

### Il change d'article en cours de route
**Exigences :** FR-MOT-ARTICLE-SELECTION ⚠, FR-MOT-CROSS-TAB-PAYLOAD

Choisir un autre article doit repartir de ses propres données : le Radar, les candidats et les verrous du précédent ne s'affichent jamais pour le nouveau. Aujourd'hui, Discovery garde ses résultats et ses cases cochées d'un article à l'autre, seul le mot-clé racine change : une sélection faite pour le premier article peut partir, par « Envoyer au Radar → », dans le Radar du second. Il faut décocher avant de changer d'article.

## Défauts connus sur ce parcours

- FR-MOT-ARTICLE-SELECTION — les résultats et les cases cochées de Discovery survivent au changement d'article : seul le mot-clé racine change ; sans article choisi, le bouton du bas « Continuer vers Lieutenants → » reste affiché et cliquable.
- FR-DIS-LONGTAIL-GENERATION — la courte-traîne générée avant « Découvrir » n'est pas filtrée et la ligne du filtre n'apparaît pas ; « Découvrir » l'efface ensuite.
- FR-DIS-SEND-TO-RADAR — l'outil ouvre le Radar et demande l'étape avant d'avoir enregistré la liste, sans vérifier que l'enregistrement réussit ; les mots-clés cochés seulement en courte-traîne ne sont pas envoyés.
- FR-RAD-MANUAL-ADD — un mot-clé déjà présent vide le champ sans aucun message.
- FR-RAD-SCORING-BIMODAL — une intention inconnue compte comme une composante rouge du Score Marché au lieu d'être écartée.
- FR-RAD-SCORE-RING-TOOLTIP — dans l'info-bulle, une composante sans donnée s'affiche « 50/100 » avec son poids, alors qu'elle n'entre pas dans le total.
- FR-RAD-THERMOMETER — la chaleur est la moyenne d'un ancien score qui compte 0 là où les cartes affichent « — » ; elle ne reflète pas les notes affichées.
- FR-RAD-AI-SUGGESTIONS — le bouton « Marquer comme candidats Capitaine » n'a aucun effet ; la pastille « P » est toujours vide au Radar.
- FR-RAD-LONGTAIL-GENERATE — une réponse vide est enregistrée et resservie pendant 7 jours, sans bouton pour réessayer.
- FR-RAD-LONGTAIL-UI — au rechargement, suggestions et cases cochées ne reviennent pas à l'écran.
- FR-RAD-LONGTAIL-REGENERATE — les suggestions enregistrées ne sont pas réaffichées ; un nouveau scan les efface de la base.
- FR-RAD-SEND-CAPTAIN — la provenance radar / longue traîne / saisie n'est pas enregistrée.
- FR-CAP-LIST-SIDEPANEL — après un envoi depuis le Radar, le Capitaine verrouillé n'est plus marqué ni en tête, et les candidats déjà étudiés quittent la liste ; sur un article qui avait déjà des candidats, les autres cartes envoyées n'apparaissent qu'à la réouverture.
- FR-CAP-SCORING-BIMODAL — à la réouverture, un mot-clé étudié hors du Radar n'a plus de Score Marché, y compris dans l'avis de l'IA.
- FR-CAP-RELEVANCE-LIVE — juste après une étude, la note affichée vient d'un autre calcul que celle de la réouverture : sans racines, avec les anciens signaux du Radar.
- FR-CAP-INPUT — ré-étudier un mot-clé déjà présent ne lève pas l'erreur précédente : la carte reste sur « Erreur : … » même si la nouvelle étude réussit ; la carte prend aussi la casse tapée, et un Capitaine verrouillé retapé dans une autre casse perd son cadenas vert et sa place en tête.
- FR-CAP-SCAN — dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention ; un mot-clé dont le volume, la difficulté ou le CPC est absent est remesuré, et repayé, à chaque étude ; un échec d'étude s'affiche en anglais technique, sans cause (« Erreur : Keyword validation failed »).
- FR-CAP-AI-PANEL — la stratégie du cocon n'est pas transmise ; la confirmation annonce « un appel Claude » même en mode simulé ou avec un autre fournisseur.
- FR-CAP-ROOTS — à la réouverture, les racines de la colonne de détail reviennent sans indicateurs ni Score Pertinence (« — », plus de « Moyenne », verdict GRAY) tant qu'aucun clic ne les a étudiées ; juste après l'étude, elles s'affichent dans l'ordre où leurs études aboutissent, pas de la plus longue à la plus courte.
- FR-CAP-LOCK-INTEGRITY — afficher une racine l'enregistre comme candidat et lance pour elle un avis IA payant ; la liste se reconstruit alors, et les notes des candidats étudiés pendant la session passent à « — » ; deux casses d'un même mot-clé comptent pour deux candidats.
- FR-CAP-CHECK — déverrouiller le Capitaine retire l'étape même quand l'enregistrement du déverrouillage a échoué.
- FR-INFRA-GATE-WAIVER — le serveur accepte une dérogation sur le seul nom du point et l'enregistre pour les données du moment : une alarme restée ouverte peut déroger à des données que l'utilisateur n'a jamais vues, si elles ont changé depuis.
- FR-DIS-CACHE — une sauvegarde n'expire jamais, et la section Courte-traîne n'est ni sauvegardée ni restaurée ; pendant le chargement d'une sauvegarde, « Charger » n'affiche pas « Chargement... » et reste cliquable.
- FR-RAD-PERSIST — les longues traînes ne sont pas réaffichées ; l'enregistrement qui suit un scan peut vider la liste d'attente et effacer les longues traînes en base ; sur un article jamais scanné, « Charger Radar » remplace l'invitation à scanner par un résultat vide.
- FR-CAP-PERSIST — la provenance radar / longue traîne / saisie n'est pas enregistrée ; un écran dont les mots-clés ne sont pas encore chargés peut envoyer un Capitaine vide et des listes vides, qui effacent les décisions enregistrées (défaut latent) ; déverrouiller en archivant les lieutenants envoie deux enregistrements concurrents.
- FR-INFRA-KEYWORD-METRICS — tant que DataForSEO ne renvoie ni difficulté ni coût par clic pour un mot-clé, chaque étude le remesure, et le repaie ; un « Rafraîchir » raté date quand même la mesure du jour, et pour un mot-clé sans volume connu la fiche vide remplace la réponse gardée.
- NFR-COST-CACHE-FIRST — un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine.
- FR-MOT-CACHE-CASCADE — les appels d'IA de Discovery — génération, filtre de pertinence, analyse — ne consultent aucun cache ; seul le rechargement d'une découverte sauvegardée évite de les refaire ; un mot-clé sans volume, difficulté ou coût par clic est remesuré, et repayé, à chaque étude.
- FR-EXT-DATAFORSEO — les mesures demandées en groupe et la fiche SEO du brief taisent un échec du fournisseur, y compris un refus du plafond de dépense : les valeurs restent vides, sans message ; un « Rafraîchir » qui échoue tout à fait remplace toute la page de rédaction par le bloc d'erreur, au lieu du seul panneau « SERP Data ».
- FR-EXT-DATAFORSEO-COSTGUARD — le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 ».
