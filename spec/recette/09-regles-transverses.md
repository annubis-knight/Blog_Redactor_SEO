---
title: Recette — Règles transverses
module: 09
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md
  - spec/16-infrastructure.md
  - spec/17-qualites.md
  - spec/18-recette-manuelle.md
---

# Module 09 — Règles transverses

**Durée :** ~60 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express fait jusqu'à l'étape 10 : le cocon « Recette <date> », son pilier rédigé puis exporté (« publié »), un article enfant « À rédiger », la dérogation posée aux Lieutenants du pilier. Le bouton de la barre affiche **MOCK** et tu as internet.

Ce module vérifie ce qui se passe « sous » tous les écrans : la bascule MOCK / RÉEL, la pile des coûts, ce que l'outil garde d'une session à l'autre, l'affichage d'une donnée absente, les règles de chaque type d'article, les portes de qualité et leurs dérogations, les messages d'erreur. Il travaille surtout sur l'**article enfant** (il y verrouille puis déverrouille un capitaine) et crée un second cocon : ajoute-le au nettoyage de fin de recette.

## Vérifications

### INFRA-1 — Au démarrage, le serveur teste la base et le dit
**Exigences :** FR-INFRA-DB-CONNECTION-CHECK

**Gestes :**
1. Regarde le terminal où tu as lancé `npm run dev`.
2. *(Facultatif, si tu sais arrêter un service Windows.)* Arrête le service PostgreSQL (application « Services », service dont le nom commence par « postgresql », « Arrêter »). Relance l'outil : Ctrl+C, puis `npm run dev`. Ensuite, redémarre le service et relance l'outil.

**Tu dois voir :**
- au lancement, « Blog Redactor SEO API running on http://localhost:3400 », puis « PostgreSQL connected » ;
- si tu as fait le geste 2 : « PostgreSQL connection failed », avec une piste qui dit que le service ne tourne pas et comment le lancer sous Windows (le journal technique est en anglais) ;
- base arrêtée, la ligne « … API running on … » s'affiche quand même : le serveur démarre malgré tout.

**C'est un bug si :**
- aucune ligne ne dit si la base répond ;
- base arrêtée, le serveur ne démarre pas, ou l'échec n'est suivi d'aucune piste.

### INFRA-2 — Le bouton MOCK / RÉEL pilote vraiment le serveur
**Exigences :** FR-INFRA-RUNTIME-MODE ⚠

**Gestes :**
1. En bas à gauche, clique la pastille des coûts (un montant, puis « n appels ») : elle se déplie en panneau « Coûts API ». Repère la ligne « DataForSEO » et sa mention.
2. Survole le bouton **« MOCK »** de la barre, puis clique-le. Ne lance aucune action : rien n'est payé tant que tu ne cliques pas sur une action.
3. Attends 15 secondes, puis recharge la page (F5).
4. Reclique le bouton pour revenir en **« MOCK »**. Attends 15 secondes, puis recharge la page.
5. Dans le terminal, arrête l'outil (Ctrl+C) et relance `npm run dev`, sans toucher à la page. Attends qu'elle revienne, puis 15 secondes.

**Tu dois voir :**
- l'infobulle « Sources : MOCK (cliquer pour passer en réel) » ;
- en MOCK, la mention « SANDBOX » dans la pile ; après le clic, le bouton « RÉEL » et, en 15 secondes au plus, la mention « PROD » ;
- après chaque rechargement, le même mode qu'avant ;
- après la relance du geste 5, la page se recharge d'elle-même : toujours « MOCK » et « SANDBOX ».

**C'est un bug si :**
- le bouton et la mention de la pile se contredisent plus de 15 secondes (« MOCK » avec « PROD », ou « RÉEL » avec « SANDBOX ») ;
- un rechargement change le mode.

> Si ton fichier d'environnement règle déjà le mode simulé, le serveur redémarre en MOCK de toute façon : le défaut ci-dessous ne peut pas se voir.

**⚠ Défaut connu :** la resynchronisation n'a lieu qu'au chargement de la page : après un redémarrage du serveur en cours de session, le badge garde « MOCK » alors que le serveur est revenu à sa configuration. Au geste 5, si la page ne se recharge pas d'elle-même, la pile affiche alors « PROD » à côté d'un bouton « MOCK » ; un rechargement remet tout en « MOCK » / « SANDBOX ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-3 — La pile « Coûts API » compte l'IA et la base, et s'efface
**Exigences :** FR-INFRA-COST-LOG-STORE ⚠, FR-INFRA-API-WRAPPER, NFR-OBS-COST-LOG, NFR-OBS-DBOPS-TRACK ⚠

**Gestes :**
1. Déplie la pile et clique **« Effacer »**.
2. Ouvre le Cerveau du cocon « Recette <date> ». Dans la barre, clique l'étape « Cible ». Déplie « Modifier ma réponse », puis clique **« Demander une suggestion à Claude »**. Ne valide pas la suggestion.
3. Ouvre le Moteur du cocon, déplie « Articles suggérés » et clique l'article enfant.
4. Dans la pile, clique la croix **« × »** d'une seule ligne.
5. Recharge la page.

**Tu dois voir :**
- après le geste 1, une pile vide ; en haut, « DataForSEO SANDBOX », la dépense de la fenêtre, le plafond (« $2.00 » sur ton poste, « $0.50 » si rien n'est réglé) et « (30min) » ;
- après le geste 2, un bloc « Suggestion Claude : » avec un texte préparé (en MOCK, il cite le cocon : « Pour « Recette <date> », visez les dirigeants de TPE et de PME… », précédé de ta réponse si l'étape en a une), et dans la pile une ligne « Suggestion stratégie » : coût « < $0.001 » (l'IA simulée ne coûte rien), modèle « mock-provider-v1 », jetons « entrés→sortis », heure ;
- après le geste 3, plusieurs lignes violettes marquées « keywords » : un symbole, le nom d'une table, « select (n row) » et une durée en ms ;
- les lignes les plus récentes en haut ; repliée, la pastille affiche le total et le nombre d'appels ;
- la croix retire cette seule ligne ; après le rechargement, la pile est vide ;
- aucune ligne ne montre le texte de ta demande, ni une trace technique.

**C'est un bug si :**
- une action d'IA n'ajoute aucune ligne ;
- la pile survit au rechargement ;
- « Effacer » ou « × » retire autre chose que prévu.

> Les erreurs connues (quota DataForSEO, quota de l'IA, IA surchargée) ajouteraient une ligne rouge avec la marche à suivre. Elles ne se provoquent pas en recette.

**⚠ Défaut connu :** seules les lectures et écritures des mots-clés d'article et des explorations Capitaine / Lieutenants remontent dans la pile ; les autres opérations en base n'y apparaissent pas (valider un sommaire n'ajoute aucune ligne). Et le coût de la génération des longues traînes et du jugement des questions PAA ne remonte pas à l'écran (voir INFRA-10). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** seules quelques actions des explorations Capitaine et Lieutenants rapportent leurs opérations en base ; aucun seuil ne signale une action trop gourmande. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-4 — La stratégie du cocon est gardée, la même pour tous ses articles
**Exigences :** FR-INFRA-COCOON-STRATEGIES ⚠

**Gestes :**
1. Dans le Cerveau, recharge la page, puis passe par les étapes « Cible » à « CTA » avec la barre.
2. Ouvre le Moteur et déplie « Contexte stratégique ».
3. Reviens au Cerveau, étape « Articles ». Sous l'article enfant, clique « Le rédiger ». Dans « Contexte strategique », déplie « Contexte envoyé à Claude ».
4. Fais de même pour le pilier (lien « Ouvrir sa rédaction »).

**Tu dois voir :**
- après le rechargement, tes cinq réponses validées à l'étape 1 du parcours express, chacune au-dessus de sa carte ;
- dans le Moteur, les mêmes réponses sous Cible, Douleur, Angle, Promesse, CTA ;
- dans la Rédaction, sous « Stratégie cocon validée », les mêmes réponses pour l'enfant et pour le pilier.

**C'est un bug si :**
- une réponse a disparu ou changé après le rechargement ;
- l'enfant affiche une autre stratégie que le pilier, ou aucune.

**⚠ Défaut connu :** l'avis de l'IA sur un candidat Capitaine ne reçoit pas la stratégie du cocon : l'écran n'envoie pas le cocon. Invisible en MOCK ; en RÉEL, cet avis ne tient pas compte de ta cible. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-5 — Un nouvel article reçoit le contexte de la section dont il naît
**Exigences :** FR-INFRA-COCOON-CONTEXT

**Gestes :**
1. Cerveau, étape « Articles ». Dans « Construire le cocon », sous le pilier, repère une section qui n'a pas encore d'article, par exemple « Le budget à prévoir ».
2. Clique **« Créer l'article de cette section »**. Attends la fin de « Recherche de mots-clés candidats, puis mesure de leurs données réelles (quelques secondes)… ».
3. Lis les candidats, puis clique **« Annuler »**.

**Tu dois voir :**
- le titre du panneau : « Créer l’article intermédiaire né de la section « … » de « <titre du pilier> » » ;
- en MOCK, quatre candidats tirés du titre de **cette section**, sans « le », « la », « les » : par exemple « budget à prévoir », puis « budget à prévoir etapes », « … prix », « … erreurs ». Ceux du pilier, à l'étape 1 du parcours express, venaient du nom du cocon ;
- après « Annuler », rien n'est créé : la section garde son bouton.

**C'est un bug si :**
- les candidats ne reprennent pas le sujet de la section (par exemple le nom du cocon, ou « site internet ») ;
- un article apparaît sans que tu aies cliqué « Créer l'article ».

> Pourquoi c'est une preuve : en MOCK, la réponse préparée lit le titre de la section dans le contexte envoyé à l'IA. Sans ce contexte, elle parlerait du cocon.

### INFRA-6 — Un mot-clé déjà visé par un autre cocon n'entre pas dans son pool
**Exigences :** FR-INFRA-KEYWORDS-SEO ⚠

**Gestes :**
1. Sur l'accueil, clique « Nouveau cocon » dans le même silo. Tape `Le Recette <date>` : le nom exact de ton cocon de recette, précédé de « Le ». Appuie sur Entrée.
2. Carte « Cerveau » : clique **« Suivant »** cinq fois, sans rien remplir, jusqu'à l'étape « Articles ».
3. Clique **« Créer le pilier »** et attends les candidats.
4. Choisis le **même mot-clé** que le pilier de ton cocon de recette. Dans « Titre de l’article », ajoute « bis » à la fin. Clique **« Créer l'article »**.

**Tu dois voir :**
- les mêmes quatre candidats qu'à l'étape 1 du parcours express : en MOCK, « Le » est ignoré ;
- le pilier créé, avec le badge « Pilier » et l'état « À rédiger » ;
- un avertissement (il disparaît après quelques secondes) : « « … bis » est créé, mais son mot-clé n’a pas rejoint le pool du cocon : Le mot-clé « … » est déjà utilisé dans le cocon « Recette <date> » : deux cocons qui visent le même mot-clé se font concurrence. Choisissez-en un autre au Moteur. » ;
- si tu gardes le titre sans « bis », un refus : « L’adresse /… est déjà prise par un autre article : changez le titre ou l’adresse. ».

**C'est un bug si :**
- aucun avertissement n'apparaît ;
- l'avertissement ne nomme pas le cocon qui utilise déjà le mot-clé ;
- le refus du pool empêche la création de l'article.

**⚠ Défaut connu :** aucun écran affiché ne permet de remplacer, de changer le statut ni de supprimer un mot-clé du pool : l'écran qui le faisait n'est plus monté ; le pool ne s'alimente qu'à la création d'un article. Et le remplacement d'un mot-clé ne vérifie pas qu'un autre cocon l'utilise déjà ; seul l'ajout le refuse. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-7 — Les règles du type d'article sont les mêmes partout
**Exigences :** FR-INFRA-TYPE-RULES-SSOT ⚠

**Gestes :**
1. Cerveau du cocon de recette, étape « Articles » : sous l'enfant, clique « Le rédiger ». Regarde « Recommandation de contenu ».
2. Ouvre la rédaction du pilier (« Ouvrir sa rédaction ») et note sa « Cible : ».
3. Passe à l'étape « Article ». Ouvre le panneau « SEO », onglet « Indicateurs », et déplie la carte « Structure ». Survole la ligne « Mots ».

**Tu dois voir :**
- pour l'enfant, dont aucune page concurrente n'a encore été lue : « Base : ~1 800 mots (type Intermédiaire) » et « Cible : 1 800 » ;
- pour le pilier, la ligne « Mots » finit par la même valeur que sa « Cible » (« n / cible »), et son infobulle dit « Objectif : … mots (basé sur le type d'article) » ;
- rappel : la porte des Lieutenants demande 3 lieutenants au pilier (parcours express, étape 4) et 2 à l'enfant (INFRA-14).

**C'est un bug si :**
- l'enfant affiche une autre base que 1 800 mots ;
- la « Cible » et l'objectif du panneau SEO diffèrent.

**⚠ Défaut connu :** FR-INFRA-TYPE-RULES-SSOT — la fourchette « min – max mots » de la recommandation de contenu est calculée à ±20 % de la cible au lieu de reprendre celle du type : un pilier affiche « 2 000 – 3 000 » alors que la rédaction vise 1 800 à 3 500. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-8 — Le micro-contexte d'un article est gardé
**Exigences :** FR-INFRA-MICRO-CONTEXTS

**Gestes :**
1. Rédaction de l'enfant, étape « Brief & Structure » : déplie « Micro-contexte article ».
2. Dans « Angle differenciant », écris `Angle de recette enfant`, puis clique ailleurs. Dans « Ton / Style », écris `Direct`, puis clique ailleurs.
3. Dans « Recommandation de contenu », clique **« + »** une fois.
4. Recharge la page, et rouvre « Micro-contexte article ».
5. Ouvre la rédaction du pilier et son « Micro-contexte article ».

**Tu dois voir :**
- « Sauvegarde », avec une coche verte, après chaque sortie de champ et après le « + » ;
- « Cible : 1 900 », la mention « ajuste » et le bouton « Reinitialiser » ;
- après le rechargement : l'angle, le ton et la cible de 1 900 mots sont toujours là ;
- le pilier garde son propre angle, celui de l'étape 6 du parcours express.

**C'est un bug si :**
- une valeur est perdue au rechargement ;
- l'angle de l'enfant apparaît dans le pilier.

### INFRA-9 — Le texte de l'IA arrive au fil de l'eau et s'arrête proprement
**Exigences :** FR-INFRA-API-STREAM ⚠, NFR-PERF-SSE-FIRST-TOKEN ⚠

**Gestes :**
1. Déplie la pile. Dans le « Micro-contexte article » de l'enfant, clique **« Suggerer par IA »**.
2. Quand le cadre « Suggestion IA » apparaît, clique **« Annuler »**.
3. Ouvre la rédaction du pilier, étape « Article », puis **« Enrichir »**. Lance la passe **« Exemples »**. Dès que « Chapitre 2/… » s'affiche, clique **« Arrêter »**. En MOCK, ça va vite : si la passe finit avant ton clic, relance-la.

**Tu dois voir :**
- pendant la suggestion, « Suggestion en cours... » ; la ligne « Suggestion micro-contexte » n'arrive dans la pile qu'à la fin ;
- la proposition (en MOCK, « Approche pratique avec mini-cas concrets… ») à côté de ton angle barré ; après « Annuler », ton angle est intact ;
- pendant la passe, « Chapitre n/N — <titre du chapitre> » et « Arrêter » ;
- après « Arrêter » : aucun message d'erreur ; les chapitres traités sont « à relire », les autres « en attente » ; dans la pile, une ligne « Passe d’enrichissement » par chapitre terminé, aucune pour le chapitre interrompu ;
- le texte du pilier ne change pas : tu n'as rien accepté.

**C'est un bug si :**
- « Arrêter » affiche une erreur ;
- la ligne de coût arrive avant la fin du texte ;
- « Annuler » remplace ton angle.

**⚠ Défaut connu :** quand l'utilisateur annule, l'écran s'arrête mais le serveur continue la génération jusqu'au bout et la facture. Invisible en MOCK. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** le premier jet n'a pas de bouton d'arrêt (son bouton affiche « Génération en cours... » et reste inactif) ; un arrêt côté écran ne coupe pas la génération côté serveur, qui continue et se facture. Ne relance pas le premier jet du pilier pour le voir : il remplacerait son texte. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-10 — Une découverte de mots-clés se reprend sans être refaite
**Exigences :** FR-INFRA-KEYWORD-DISCOVERIES, FR-INFRA-COST-LOG-STORE ⚠

**Gestes :**
1. Moteur, article enfant, onglet « Discovery ». Dans « Mot-clé racine », tape le mot-clé de l'enfant, puis **« Découvrir »**. Attends que les sections se remplissent.
2. Clique **« Analyser les N résultats pertinents »** et attends l'analyse.
3. Dans la pile, **« Effacer »**. Recharge la page, reviens sur l'enfant, onglet « Discovery ». Retape exactement le même mot-clé racine, puis attends une seconde. Essaie aussi un autre mot, puis reviens au premier.
4. Clique **« Charger »**.
5. Clique **« Courte-traîne IA »**.
6. Clique **« Rafraichir »**, efface le mot-clé racine et retape-le.

**Tu dois voir :**
- au geste 3, un bandeau vert « Derniere analyse du <date du jour> · N mots-cles · analyse IA incluse », avec « Charger » et « Rafraichir » ; pas de bandeau pour l'autre mot ;
- au geste 4, les résultats reviennent tout de suite, sans nouvelle ligne d'IA dans la pile ;
- au geste 5, la section « Courte-traîne IA (PAA-friendly) » se remplit ;
- au geste 6, le bandeau disparaît et ne revient pas : la prochaine découverte sera refaite, et facturée en RÉEL.

**C'est un bug si :**
- le bandeau manque après le rechargement ;
- « Charger » relance une recherche (sections en attente, nouvelles lignes d'IA) ;
- le bandeau revient après « Rafraichir ».

**⚠ Défaut connu :** le coût de la génération des longues traînes et du jugement des questions PAA ne remonte pas à l'écran : au geste 5, aucune ligne n'apparaît dans la pile. Et seules les opérations en base des mots-clés d'article et des explorations Capitaine / Lieutenants y apparaissent. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-11 — Le capitaine de l'enfant garde ses questions PAA
**Exigences :** FR-INFRA-PAA-EXPLORATIONS

**Gestes :**
1. Onglet « Capitaine » de l'enfant. Si son mot-clé n'est pas dans la liste, tape-le dans « Tester un mot-clé capitaine… » et appuie sur Entrée. Attends la fin de « Validation en cours... ».
2. Clique le triangle ▶ au début de la carte : ses questions PAA s'ouvrent. Note-les, avec leurs étiquettes.
3. Clique le cadenas de la carte (infobulle « Verrouiller »). Si l'alarme 🟠 s'ouvre, coche « J'ai lu » puis clique **« J'ai lu, je continue »**.
4. Recharge la page, reviens sur l'onglet « Capitaine » de l'enfant. Si l'invite « Charger Capitaine » apparaît, clique « DB ». Rouvre le triangle ▶.

**Tu dois voir :**
- après le rechargement, les mêmes questions, dans le même ordre, avec les mêmes étiquettes ; aucune en double ;
- la carte toujours verrouillée.

**C'est un bug si :**
- une question disparaît, change ou apparaît en double après le rechargement.

> Si la carte affiche « Aucune PAA trouvee », le bac à sable n'a pas fourni de questions pour ce mot-clé : refais cette vérification en RÉEL.

### INFRA-12 — Un indicateur absent s'affiche « — », se trie en bas, partout pareil
**Exigences :** FR-INFRA-SCORE-MODULE, FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-DISPLAY-DASH ⚠, FR-INFRA-KPI-NULLABLE ⚠

**Gestes :**
1. Dans le Capitaine de l'enfant, teste aussi `zqxw plomberie kvj` et attends la fin.
2. Regarde l'en-tête de chaque carte (« vol », « KD », « CPC », « PAA ») et son anneau « Score Pertinence ». Survole un anneau qui affiche « — ».
3. Dans la barre de tri, clique **« Score Pertinence »** (flèche ↓), puis une deuxième fois (↑), puis une troisième.
4. Clique une carte : un panneau latéral s'ouvre avec ses indicateurs.
5. Rédaction du pilier, étape « Article », panneau « SEO », onglet « SERP Data ». Déplie « Mots-clés associés ».

**Tu dois voir :**
- chaque indicateur affiche une valeur (« 1.2k », « 42 », « 1.50 € »…) ou « — », jamais 0 à la place d'une donnée absente ; au survol d'un anneau « — », « Score Pertinence indisponible… » et sa raison ;
- ↓ : du plus grand au plus petit score, les « — » en bas ; ↑ : du plus petit au plus grand, les « — » **toujours en bas** ; au 3ᵉ clic, l'ordre d'origine ; la carte verrouillée reste en tête dans tous les cas ;
- l'ordre suit les nombres affichés sur les anneaux ;
- dans le panneau latéral et dans les quatre cartes de « SERP Data » (Volume, Difficulté, CPC, Concurrence), une valeur absente s'affiche aussi « — ».

**C'est un bug si :**
- une carte « — » remonte en tête dans un sens de tri ;
- l'ordre ne suit pas le nombre affiché ;
- « 0 », « 0.00 € » ou « 0 % » apparaît là où un autre écran montre « — » pour le même mot-clé.

**⚠ Défaut connu :** trois écrans formatent encore à la main : le tableau des mots-clés associés du brief, le panneau latéral du Capitaine, la liste des sources de la découverte ; le premier affiche 0. Dans « Mots-clés associés », les volumes s'écrivent en entier (« 1 234 » là où les cartes écrivent « 1.2k »). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** les mots-clés associés du brief de rédaction et de l'audit du cocon reçoivent encore 0 quand DataForSEO ne dit rien. En MOCK, le bac à sable renvoie des valeurs partout : le défaut se voit en RÉEL (INFRA-R3). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-13 — Le Lexique et les Lieutenants lisent le même relevé des pages concurrentes
**Exigences :** FR-INFRA-SCRAPE-CORPUS-NEUTRE

**Gestes :**
1. Enfant, onglet « Lexique ». Le message « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » s'affiche.
2. Clique **« Lancer l'analyse SERP (~$0.003 DataForSEO) »**, puis **« Confirmer (~$0.003) »** (gratuit en MOCK). Attends la fin.
3. Onglet « Lieutenants » : clique **« Analyser SERP »** et attends les propositions.
4. Reviens sur « Lexique ».

**Tu dois voir :**
- au geste 3, la mention « (cache) » juste après le nombre de concurrents : les Lieutenants relisent le relevé fait pour le Lexique, sans relire les pages ;
- en MOCK, six propositions pour l'enfant intermédiaire, notées de 88 à 53 : d'abord les questions « Autres questions » reçues (factices en MOCK), puis des variantes du capitaine (« prix <capitaine> », « <capitaine> avis », « comment choisir <capitaine> »…) ; cinq sous « Lieutenants proposes par l'IA », la sixième dans « Autres candidats (1) » ;
- au geste 4, le message du geste 1 ne revient pas, et « Extraire le Lexique » est proposé.

**C'est un bug si :**
- juste après le relevé du Lexique, les Lieutenants n'affichent pas « (cache) » ;
- le Lexique redemande un relevé déjà fait.

> Si le message du geste 1 n'apparaît pas, le relevé existe déjà pour ce mot-clé (un essai précédent) : la mention « (cache) » du geste 3 suffit.

### INFRA-14 — Une porte refuse l'étape, montre tout, et n'enregistre rien
**Exigences :** FR-INFRA-VERIFIER-SHARED, FR-INFRA-API-WRAPPER

**Gestes :**
1. Onglet « Lieutenants » de l'enfant : coche **une seule** proposition, la mieux notée (88 en MOCK). Appelons-la A.
2. Un bandeau apparaît. Clique **« Voir pourquoi / décider »**.
3. Appuie sur Échap. Rouvre l'alarme, puis clique sur le fond sombre, à côté de la fenêtre. Appuie plusieurs fois sur Tab.
4. Clique **« Revenir corriger »**.
5. Survole les pastilles de l'enfant dans « Articles suggérés ». Recharge la page et reviens sur ses Lieutenants.

**Tu dois voir :**
- le bandeau « Étape non validée. 1 lieutenant pour un article Intermédiaire : le minimum conseillé est 2. » ;
- l'alarme « Avant de valider les lieutenants », au-dessus de tout : « 1 point à regarder. Vous pouvez passer outre, mais en expliquant pourquoi : votre raison est enregistrée. » ; le point 🔴 « Risque » avec son message ; « Le risque : L’article couvrira trop peu de recherches voisines… » ; « À la place : » suivi des autres propositions ;
- Échap ferme l'alarme ; le clic sur le fond ne la ferme pas ; Tab reste dans la fenêtre ;
- après « Revenir corriger », puis après le rechargement : la pastille « Lieutenants » de l'enfant reste vide, et le bandeau est toujours là.

**C'est un bug si :**
- l'étape est validée après « Revenir corriger » ;
- un clic à côté ferme l'alarme ;
- après le rechargement, la pastille « Lieutenants » est pleine.

### INFRA-15 — Déroger par écrit, pour les seules données examinées
**Exigences :** FR-INFRA-GATE-WAIVER ⚠

**Gestes :**
1. Rouvre l'alarme (« Voir pourquoi / décider »). Dans « Votre raison », tape une vingtaine d'espaces.
2. Efface-les. Dans « Pourquoi passer outre ? », choisis « Longue traîne assumée ». Tape `Niche locale assumé` (19 caractères).
3. Ajoute un `e` à la fin (20 caractères), puis clique **« Je prends la responsabilité et je continue »**.
4. Décoche A et coche à la place la deuxième mieux notée (81 en MOCK). Appelons-la B.
5. Décoche B et recoche A.
6. Coche aussi B : A et B sont cochées.

**Tu dois voir :**
- geste 1 : le compteur reste « 0 / 20 » : les espaces ne comptent pas ; le bouton reste grisé ;
- geste 2 : « 19 / 20 » en rouge, bouton grisé ;
- geste 3 : « 20 / 20 » en vert, bouton actif, puis « Enregistrement… » ; l'alarme se ferme, le bandeau disparaît, la pastille « Lieutenants » se remplit ;
- geste 4 : le bandeau revient : la dérogation ne couvrait que A ;
- geste 5 : pas de bandeau : la dérogation posée pour A vaut toujours pour A ;
- geste 6 : pas de bandeau, deux lieutenants suffisent.

**C'est un bug si :**
- les espaces comptent dans la raison ;
- le bouton s'active sous 20 caractères, ou sans catégorie ;
- la dérogation posée pour A couvre B ;
- A redemande une dérogation au geste 5.

**⚠ Défaut connu :** FR-INFRA-GATE-WAIVER — le serveur accepte une dérogation sur le seul nom du point et l'enregistre pour les données du moment : une alarme restée ouverte peut déroger à des données que l'utilisateur n'a jamais vues, si elles ont changé depuis. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-16 — Les propositions de lieutenants survivent au rechargement
**Exigences :** FR-INFRA-LIEUTENANT-EXPLORATIONS ⚠, FR-INFRA-KPI-CONSISTENCY

**Gestes :**
1. Dans la barre de tri des Lieutenants, clique **« Score IA »** (↓), puis une deuxième fois (↑), puis une troisième.
2. Déplie « Autres candidats ».
3. Recharge la page et reviens sur les Lieutenants de l'enfant. Si l'invite « Charger Lieutenants » apparaît, clique « DB ».

**Tu dois voir :**
- ↓ : du plus fort au plus faible (en MOCK, 88, 81, 74, 67, 60) ; ↑ : l'inverse ; au 3ᵉ clic, l'ordre d'origine ; le compteur « 2 / … sélectionnés » ne bouge pas ;
- dans « Autres candidats », un candidat sans score IA affiche « — » (au survol : « Score IA non fourni »), jamais 0 ;
- après le rechargement, les propositions du meilleur score au moins bon, A et B toujours cochées.

**C'est un bug si :**
- une proposition disparaît ou apparaît en double après le rechargement ;
- A ou B n'est plus cochée ;
- un score absent s'affiche 0.

**⚠ Défaut connu :** « Tout réinitialiser » n'archive les lieutenants qu'à l'écran (vérifié en INFRA-18). Et un lieutenant ajouté depuis le panneau d'aide n'est enregistré qu'une fois coché. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-17 — Une seule liste d'étapes, lue partout ; retirer le capitaine retire la structure
**Exigences :** FR-INFRA-WORKFLOW-CHECKS-CONSTANTS ⚠, NFR-INT-COMPLETED-CHECKS-SSOT

**Gestes :**
1. Onglet « Structure » de l'enfant : **« Générer la structure »**, puis **« Valider la structure »**. Si une alarme s'ouvre, lis-la et réponds-y.
2. Survole les pastilles de l'enfant dans « Articles suggérés ». Ouvre l'onglet « Finalisation ».
3. Onglet « Capitaine » : clique le cadenas de la carte verrouillée (infobulle « Déverrouiller »). Dans « Déverrouiller le Capitaine ? », clique **« Les garder »**.
4. Regarde de nouveau les pastilles, l'onglet « Structure » et l'onglet « Finalisation ». Recharge la page et regarde encore.
5. Survole les pastilles du pilier.

**Tu dois voir :**
- après le geste 1 : « ✅ Structure validée : elle sert de sommaire à la rédaction. » ; les pastilles « Capitaine », « Lieutenants » et « Structure » pleines ; dans « Finalisation », « Étapes restantes : Lexique à valider » ;
- après le geste 3 : les pastilles « Capitaine » **et** « Structure » vides, « Lieutenants » toujours pleine ; plus de « ✅ Structure validée » ; dans « Finalisation », « Étapes restantes : Capitaine à verrouiller, Structure à valider, Lexique à valider » ;
- le même état après le rechargement ;
- le pilier n'a que six pastilles (deux pour « Explorer », quatre pour « Valider »), bien qu'il soit « Rédigé » dans l'arbre du Cerveau.

**C'est un bug si :**
- la structure reste validée après le déverrouillage du capitaine ;
- les pastilles, l'onglet « Structure » et « Finalisation » se contredisent ;
- le rechargement change l'état.

**⚠ Défaut connu :** le serveur accepte un nom d'étape inventé au bon format, par exemple « moteur:nimporte_quoi ». Invisible depuis l'écran, qui n'écrit que des étapes connues. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-18 — « Tout réinitialiser » archive les lieutenants
**Exigences :** FR-INFRA-LIEUTENANT-EXPLORATIONS ⚠

**Gestes :**
1. Capitaine de l'enfant : reverrouille la carte (cadenas « Verrouiller »).
2. Clique le cadenas « Déverrouiller », puis **« Tout réinitialiser »**.
3. Regarde les onglets « Lieutenants » et « Finalisation ». Recharge la page et regarde encore.

**Tu dois voir :**
- un message qui annonce 2 lieutenants archivés ;
- plus aucun lieutenant coché ; dans « Finalisation », « Lieutenants (0) » et « Aucun lieutenant verrouillé. », avant **et** après le rechargement.

**C'est un bug si :**
- le message annonce « 0 lieutenant(s) archivé(s) » alors que deux étaient cochés.

**⚠ Défaut connu :** « Tout réinitialiser » n'archive les lieutenants qu'à l'écran : l'archivage enregistré n'est jamais demandé. Après un rechargement, ils reviennent cochés, à l'écran comme dans la Finalisation, alors que la liste enregistrée est vide, et la porte refuse l'étape. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-19 — À la publication, la reconfirmation suit les données
**Exigences :** FR-INFRA-GATE-WAIVER ⚠, FR-INFRA-VERIFIER-SHARED

**Gestes :**
1. Rédaction du pilier : **« Éditer l'article »**, puis **« Visualiser l'article »**. Dans l'onglet d'aperçu, clique **« Exporter HTML »**.
2. Dans l'éditeur, change un mot du texte, puis **« Sauvegarder »** (ou Ctrl+S). Dans l'aperçu, recharge la page, puis **« Exporter HTML »**.
3. Clique **« Revenir corriger »**.
4. Exporte à nouveau, coche chaque « J'ai lu », puis **« J'ai lu, je continue »**.

**Tu dois voir :**
- geste 1 : pas d'alarme, le fichier se télécharge : tes « J'ai lu » de l'étape 10 valent pour ces données, qui n'ont pas changé ;
- geste 2 : l'alarme « Avant de publier » revient, avec en 🟠 « Dérogation posée au valider les lieutenants (« … ») : Mot-clé très locale. » : le texte a changé, il faut reconfirmer ;
- geste 3 : « Publication annulée : corrigez les points signalés, puis exportez à nouveau. », et aucun téléchargement ;
- geste 4 : le téléchargement.

**C'est un bug si :**
- une alarme s'ouvre au geste 1 alors que tu n'as rien changé au pilier depuis l'étape 10 ;
- aucune alarme au geste 2 ;
- un fichier se télécharge au geste 3.

**⚠ Défaut connu :** FR-INFRA-GATE-WAIVER — le serveur accepte une dérogation sur le seul nom du point et l'enregistre pour les données du moment : une alarme restée ouverte peut déroger à des données que l'utilisateur n'a jamais vues, si elles ont changé depuis. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-20 — Une erreur du serveur s'affiche en clair, sans trace technique
**Exigences :** FR-INFRA-ERROR-HANDLER ⚠, NFR-OBS-KNOWN-ERRORS ⚠

**Gestes :**
1. Dans l'onglet d'aperçu, remplace le numéro de l'article, dans la barre d'adresse, par `999999`. Appuie sur Entrée.
2. Clique **« Réessayer »**.

**Tu dois voir :**
- un message court (aujourd'hui en anglais : « Article 999999 not found ») et le bouton « Réessayer » ;
- le même message après le clic ;
- aucune trace technique : pas de lignes « at … », pas de chemin de fichier.

**C'est un bug si :**
- la page reste blanche ;
- une trace technique s'affiche.

**⚠ Défaut connu :** la plupart des actions du serveur interceptent leurs erreurs et renvoient une erreur générique ; seules quelques-unes traduisent les erreurs connues (quota, plafond de dépense, IA surchargée). Voir INFRA-R2. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** le dépassement du budget DataForSEO n'est pas inscrit dans la pile d'activité ; une erreur inconnue affiche son message brut, pas un message générique (c'est le cas ici). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## En mode RÉEL (payant)

Ces vérifications coûtent de quelques centimes à quelques dizaines de centimes. Passe le bouton en **RÉEL** seulement pour elles, et repasse en **MOCK** à la fin.

> **Attention :** l'outil garde aussi les mesures faites en MOCK, pendant 7 jours, sans les distinguer des vraies. En RÉEL, teste des mots-clés que tu n'as **jamais** testés, même en MOCK : sinon, tu verras les chiffres factices du bac à sable, sans nouvel appel.

### INFRA-R1 — Une même mesure n'est payée qu'une fois
**Mode :** RÉEL (payant)
**Exigences :** FR-INFRA-API-CACHE, FR-INFRA-GET-OR-FETCH, FR-INFRA-PAA-CACHE, FR-INFRA-KEYWORD-METRICS ⚠, NFR-COST-CACHE-FIRST ⚠

**Gestes :**
1. Passe en RÉEL. Déplie la pile et note le montant « DataForSEO PROD $x / $y (30min) ». Les lignes d'IA peuvent s'ajouter : seul ce montant compte ici.
2. Capitaine de l'enfant : teste un mot-clé jamais testé, par exemple `refonte site vitrine artisan`. Attends 15 secondes et note le nouveau montant, ainsi que le volume, le KD et le CPC de la carte.
3. Moteur du cocon « Le Recette <date> » (INFRA-6), son pilier, onglet « Capitaine » : teste le même mot-clé. Attends 15 secondes.
4. Rédaction du pilier de recette, étape « Article », panneau « SEO », onglet « SERP Data » : clique **« Rafraîchir »**. Attends 15 secondes. Change d'onglet, puis reviens sur « SERP Data ».

**Tu dois voir :**
- geste 2 : le montant monte de quelques centimes ;
- geste 3 : le montant ne bouge pas, et les chiffres sont les mêmes : la mesure faite pour un article sert à l'autre, même dans un autre cocon ; les questions PAA reviennent aussi sans appel ;
- geste 4 : « Rafraîchir » fait monter le montant (il ignore exprès ce qui est gardé) et met à jour la date ; revenir sur l'onglet ne coûte rien.

**C'est un bug si :**
- le montant monte au geste 3 ;
- « Rafraîchir » ne fait rien monter ;
- ouvrir un onglet fait monter le montant.

> Avant « Rafraîchir », l'onglet « SERP Data » du pilier montre les chiffres mesurés en MOCK : c'est l'effet de l'avertissement ci-dessus.

**⚠ Défaut connu :** tant que DataForSEO ne renvoie ni difficulté ni coût par clic pour un mot-clé, chaque étude le remesure, et le repaie : si le geste 2 affiche « KD — » et « CPC — », le geste 3 fait monter le montant. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** NFR-COST-CACHE-FIRST — le scan Radar rachète les mesures de ses mots-clés à chaque fois, sans relire la base ; un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-R2 — Le plafond de dépense bloque l'appel avant de l'envoyer
**Mode :** RÉEL (payant)
**Exigences :** FR-INFRA-ERROR-HANDLER ⚠, NFR-COST-DATAFORSEO-RESERVE, NFR-OBS-KNOWN-ERRORS ⚠

**Gestes :**
1. Dans ton fichier d'environnement, règle le plafond de dépense DataForSEO (le réglage cité dans « Avant de commencer » du parcours express) sur `0.0001`. Relance l'outil, puis passe en RÉEL.
2. Capitaine de l'enfant : teste un autre mot-clé jamais testé, par exemple `site vitrine plombier prix`.
3. Regarde la pile.
4. Remets le plafond d'origine, relance l'outil et repasse en MOCK.

**Tu dois voir :**
- sur la carte, « Erreur : Plafond de dépense DataForSEO atteint (…) », avec la dépense de la fenêtre, le plafond et la durée, par exemple « ($0.0000 / $0.00 sur 30min) » ;
- dans la pile, le montant DataForSEO ne bouge pas : l'appel n'est jamais parti.

**C'est un bug si :**
- le montant monte ;
- le message est technique, ou ne dit pas qu'il s'agit du plafond.

**⚠ Défaut connu :** la plupart des actions du serveur interceptent leurs erreurs et renvoient une erreur générique ; seules quelques-unes traduisent les erreurs connues. Une autre action bloquée par le plafond peut donc afficher un message vague. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** le dépassement du budget DataForSEO n'est pas inscrit dans la pile d'activité (au geste 3, aucune ligne rouge) ; une erreur inconnue affiche son message brut, pas un message générique. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-R3 — Sans donnée DataForSEO : « — », jamais un refus inventé
**Mode :** RÉEL (payant)
**Exigences :** FR-INFRA-KPI-SCORING-NULLSAFE ⚠, FR-INFRA-KPI-NULLABLE ⚠, FR-INFRA-KPI-DISPLAY-DASH ⚠

**Gestes :**
1. En RÉEL, Capitaine de l'enfant : teste un mot-clé absurde jamais testé, par exemple `kvjz toiture qwpx`.
2. Regarde l'en-tête de la carte, puis clique-la pour ouvrir le panneau latéral et son verdict.
3. Rédaction du pilier, panneau « SEO », onglet « SERP Data » : déplie « Mots-clés associés ».

**Tu dois voir :**
- sur la carte, « vol — », « KD — », « CPC — » ; dans le panneau latéral aussi, « — » et jamais « 0 » ;
- tant que le volume est « — », le verdict n'est pas « NO-GO » (« Aucun signal détecté ») ; sans volume, ni question PAA, ni suggestion Google, il est gris : « GRAY », ❔, « Données insuffisantes ».

**C'est un bug si :**
- un indicateur affiche 0 alors que DataForSEO n'a rien renvoyé ;
- le verdict est « NO-GO » avec un volume « — ».

**⚠ Défaut connu :** au Radar, une carte sans aucune donnée reçoit un Score Marché de 0, verdict « NOGO », au lieu d'un score absent : une intention inconnue compte comme une composante rouge au lieu d'être écartée. Le verdict du Capitaine, lui, passe bien à « GRAY ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** les mots-clés associés du brief de rédaction et de l'audit du cocon reçoivent encore 0 quand DataForSEO ne dit rien : au geste 3, un mot-clé associé sans volume connu affiche 0. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** trois écrans formatent encore à la main : le tableau des mots-clés associés du brief, le panneau latéral du Capitaine, la liste des sources de la découverte ; le premier affiche 0. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### INFRA-R4 — L'IA écrit avec le contexte du cocon, de l'article et de la zone
**Mode :** RÉEL (payant)
**Exigences :** FR-INFRA-COCOON-CONTEXT, FR-INFRA-COCOON-STRATEGIES ⚠, FR-INFRA-MICRO-CONTEXTS, FR-INFRA-LOCAL-ENTITIES

**Gestes :** pendant l'essai payant proposé par le parcours express (étapes 1 à 7 en RÉEL, sur un nouveau cocon) :
1. Avant l'étape 6, ouvre « Configuration du thème » (la roue dentée de la barre) et note la « Localisation ». Note aussi l'angle et le ton que tu donnes au micro-contexte.
2. À l'étape 6, lis le premier jet du pilier.
3. À l'étape 7, lis les candidats proposés pour la section.
4. *(Facultatif, ~15 min et quelques dizaines de centimes.)* Mène l'enfant jusqu'à son premier jet, et lis-le à côté de la section du pilier dont il naît.

**Tu dois voir :**
- un texte qui suit l'angle et le ton du micro-contexte, s'adresse à la cible de la stratégie du cocon, et vise la longueur de la « Cible » ;
- des lieux qui appartiennent à la zone de la « Localisation » ; aucun repère local si elle est vide ;
- des candidats qui parlent du sujet de la section ;
- si tu as fait le geste 4 : un enfant qui approfondit la section du parent, sans la recopier.

**C'est un bug si :**
- le texte ignore l'angle ou la cible ;
- il cite les quartiers ou les lieux d'une autre ville que celle de la configuration ;
- les candidats sont hors du sujet de la section ;
- l'enfant recopie la section du parent.

**⚠ Défaut connu :** l'avis de l'IA sur un candidat Capitaine ne reçoit pas la stratégie du cocon : l'écran n'envoie pas le cocon. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## Hors recette

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
| FR-INFRA-API-CACHE-PURGE | Le nettoyage tourne seul en arrière-plan, une fois par heure, sans rien montrer. Une réponse expirée n'est de toute façon jamais resservie. |
| FR-INFRA-EXTERNAL-API-CACHE | C'est la façon de ranger les réponses gardées (un seul rangement pour toutes les sources) : aucun écran ne la montre. L'effet visible, ne pas repayer, est vérifié en INFRA-R1. |
| FR-INFRA-ZOD-SHARED | L'écran n'envoie que des demandes bien formées : une demande mal formée ne se fabrique qu'avec un outil technique, hors de l'interface. Les tests de contrat la couvrent. |
| FR-INFRA-PROMPT-LOADER | Les consignes envoyées à l'IA ne s'affichent jamais, et en MOCK l'IA ne les lit pas : leur remplissage et la neutralisation du texte de l'utilisateur restent invisibles. |
| FR-INFRA-PROMPT-LAYERS | L'organisation des consignes en couches, sans année ni lieu écrits en dur, est interne : le texte produit ne permet pas de dire comment la consigne était bâtie. |
| FR-INFRA-NO-SCORE-FALLBACK | C'est une règle d'écriture du code, vérifiée au commit et par l'audit complet. Son effet à l'écran, « — » au lieu de 0, est vérifié en INFRA-12. |
| FR-INFRA-CHECK-HEALTH | C'est une commande du développeur qui enchaîne les contrôles du code ; elle ne fait pas partie de l'interface. |
| FR-INFRA-DEPENDENCY-CRUISER | Ce sont des règles sur la façon dont le code s'appelle lui-même ; rien ne s'en voit dans l'outil. |
| FR-INFRA-LOGGER | Le journal du serveur et son niveau se règlent dans un fichier de configuration, pour le développeur ; la recette ne lit le terminal qu'au démarrage (INFRA-1). |
| FR-INFRA-HEALTH-CHECK | Ce point de santé sert aux scripts de démarrage et de test, qui l'attendent avant de lancer ; aucun écran ne l'appelle. |
| FR-INFRA-ARTICLE-STRATEGIES | Seul le mode automatique, lancé en ligne de commande, écrit la stratégie d'un article ; aucun écran ne l'affiche ni ne la modifie. |
