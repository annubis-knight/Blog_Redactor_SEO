---
title: Parcours — Article enfant
id: PU-02
last_updated: 2026-09-29
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-02 — « Je développe une section de mon pilier dans son propre article, et je le publie »

**But :** faire naître un article d'une section (un chapitre H2) du pilier déjà rédigé, le préparer et le rédiger sur son propre mot-clé, le relier à son parent dans les deux sens, puis le publier.
**Quand :** le pilier « Création de site internet à Toulouse » est publié ; sa section « Le budget à prévoir » mérite un article complet, et le consultant veut l'écrire sans que les deux pages se fassent concurrence dans Google.
**Départ :** le cocon a un pilier dont le premier jet est accepté (« Rédigé » dans l'arbre du Cerveau) ; la section visée n'a pas encore d'article.
**Arrivée :** l'article enfant est « Publié », rangé sous la section qui l'annonce ; il renvoie vers son parent ; la section du parent est ramenée à un résumé qui renvoie vers l'enfant, et le parent a été republié.
**Recette :** parcours express, étape 4 (geste 8) et étapes 7 à 9 ; module 02 (CER-12 à CER-15, CER-19 à CER-25) ; module 06 (LIE-1, LIE-11, HN-7) ; module 07 (RED-17) ; module 09 (INFRA-5, INFRA-6). La publication de l'enfant et son lien vers le parent : aucune (manque).
**Test automatique :** le robot fait naître un intermédiaire d'une section du pilier rédigé, puis un spécialisé d'une section de l'intermédiaire rédigé, depuis l'arbre du Cerveau ; il vérifie que chacun connaît son parent et sa section, et que la section du parent mène à lui. Chaque enfant refait ensuite le Moteur (quatre verrous), la rédaction (premier jet accepté) et la publication. Le robot ne pose aucun lien entre parent et enfant et ne lance pas la passe « Résumer ».

## Les étapes

### 1. Vérifier que le parent est rédigé
**Exigences :** FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2

Page du cocon › « Cerveau » : l'étape « Articles » s'ouvre et l'arbre se recharge. Le pilier y est « Rédigé », avec « Ouvrir sa rédaction ». Ses sections sont les chapitres H2 de son texte, sans introduction, conclusion ni questions fréquentes. Une section libre porte le bouton « Créer l'article de cette section » ; une section déjà prise montre un lien vers son article et l'état de celui-ci.

### 2. Demander des mots-clés pour la section choisie
**Exigences :** FR-CER-KEYWORD-REAL-DATA, FR-INFRA-COCOON-CONTEXT, FR-CER-CHILD-FROM-PILLAR-H2

L'utilisateur clique « Créer l'article de cette section » (infobulle « Propose des mots-clés et mesure leurs données réelles (appel payant) »). Le panneau s'intitule « Créer l'article intermédiaire né de la section « … » de « … » » et annonce « Recherche de mots-clés candidats, puis mesure de leurs données réelles (quelques secondes)… ». Les 3 à 5 candidats parlent du sujet de la section, jamais du mot-clé du pilier ni d'un autre article du cocon. Chacun est mesuré (« Volume », « Difficulté », « Intention », « En tête de Google ») ; aucun n'est coché d'office.

### 3. Choisir le mot-clé et créer l'article
**Exigences :** FR-CER-CREATION-HONNETE, FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-AIGUILLAGE ⚠, FR-PIE-AI-GENERATION

Cocher un candidat préremplit « Titre de l'article », que l'utilisateur peut modifier (3 caractères au moins). « Créer l'article » affiche « Création… », puis « « … » est créé. ». Dans l'arbre, la section montre désormais le lien vers l'enfant et « À rédiger » ; l'enfant apparaît sous le pilier, badge « Intermédiaire ». Sur la carte indicative, il s'inscrit avec la marque « Créé ». Son niveau vient de sa place : il ne se choisit pas et ne se change pas.

### 4. Ouvrir l'enfant au Moteur et verrouiller son Capitaine
**Exigences :** FR-MOT-PHASES, FR-MOT-NO-AUTO-ACTION, FR-CAP-LOCK-GATE, FR-MOT-CANNIBALIZATION ⚠

Page du cocon › « Moteur » › « Articles suggérés » : l'enfant est rangé sous son niveau, six points vides, son mot-clé en pointillé. Un clic sur son titre ouvre l'onglet « Capitaine », où l'outil étudie de lui-même le mot-clé choisi au Cerveau. L'utilisateur le verrouille par le cadenas, en passant la porte si elle alerte. Si l'enfant prenait le même Capitaine qu'un autre article du cocon, une icône d'alerte orange le signalerait sur les deux lignes (« Cannibalisation : un autre article utilise le même capitaine »).

### 5. Retenir les lieutenants de l'enfant
**Exigences :** FR-LIE-PROPOSE-AI, FR-LIE-CHECK, FR-LIE-LOCK-GATE

Onglet « Lieutenants » : « Analyser SERP », puis l'IA propose des lieutenants ; ceux déjà retenus par les autres articles du cocon lui sont interdits. Le seuil suit le niveau : 2 lieutenants au moins pour un intermédiaire (1 pour un spécialisé). Avec un seul, le bandeau dit « Étape non validée. 1 lieutenant pour un article Intermédiaire : le minimum conseillé est 2. » ; au deuxième, le point « Lieutenants » se remplit.

### 6. Valider sa structure et son lexique
**Exigences :** FR-HN-TAB ⚠, FR-HN-LOCK-GATE, FR-CER-WORD-COUNT-RECOMMEND ⚠, FR-LEX-CHECK

Onglet « Structure » : « Générer la structure » tient compte des lieutenants retenus et de l'état du cocon ; la porte attend le nombre de chapitres d'un intermédiaire (4 à 6), pas celui d'un pilier. « Valider la structure » en fait le sommaire de la rédaction, et la pile « Coûts API » annonce « 💡 Longueur conseillée : N mots », entre 1 200 et 2 500 pour un intermédiaire. Onglet « Lexique » : l'utilisateur extrait les termes et coche ceux qu'il retient. La Finalisation affiche alors « ✅ Prêt pour la Rédaction ».

### 7. Rédiger l'enfant en développant ce que la section annonce
**Exigences :** FR-INFRA-COCOON-CONTEXT, FR-RED-DRAFT-SINGLE-PASS ⚠, FR-RED-WORD-COUNT-TARGET, FR-CER-PARENT-WRITTEN-GATE

Page Rédaction du cocon : l'enfant est dans la colonne « Intermédiaire », « À rédiger ». Sa rédaction guidée montre « Base : ~1 800 mots (type Intermédiaire) » tant qu'aucune page concurrente n'a été lue, sinon la longueur conseillée au Moteur. Après le micro-contexte et le sommaire, « Générer l'article » écrit le premier jet : il reçoit la section du parent et ce qu'elle en dit, avec la consigne de la développer sans la répéter. Le bandeau « ✓ Premier jet accepté… » dit que l'enfant peut, à son tour, donner naissance à des articles spécialisés.

### 8. Relier l'enfant à son parent
**Exigences :** FR-RED-LINKING-MANUAL ⚠, FR-RED-CONTEXTUAL-ACTIONS ⚠

Dans l'éditeur de l'enfant, le panneau « Maillage » (« Suggestions de maillage ») propose d'abord la famille : le parent, avec « Article parent (section « … ») » et « Ancre : « … » », une expression déjà présente dans le texte. L'utilisateur place le curseur dans la zone du texte où se trouve l'ancre, puis clique « ✓ » : l'ancre devient un lien. Autre geste : sélectionner quelques mots, « ✦ », « 🔗 Lien interne », puis « Choisir l'article cible ». Le lien entre dans la matrice « Maillage » de l'accueil.

### 9. Publier l'enfant
**Exigences :** FR-RED-PUBLISH-GATE, FR-RED-EXPORT-HTML ⚠, FR-RED-PROGRESS ⚠

« Visualiser l'article », puis « Exporter HTML » : la porte de publication rejoue les contrôles de l'enfant, avec les règles de son niveau (par exemple 2 500 mots au plus pour un intermédiaire). Un lien vers un article pas encore publié y serait un point 🟠 ; le parent l'étant déjà, le lien vers lui passe. Une fois la porte passée, un fichier HTML se télécharge et l'enfant devient « Publié ».

### 10. Chez le parent, résumer la section et renvoyer vers l'enfant
**Exigences :** FR-RED-ENRICH-PASSES, FR-CER-CHILD-FROM-PILLAR-H2, FR-RED-LINKING-MANUAL ⚠

Dans l'éditeur du pilier, « Enrichir » › passe « Résumer » (« Les chapitres devenus des articles : un résumé de 150 à 250 mots qui y renvoie ») ne propose que la section dont l'enfant est né. L'utilisateur compare avant / après, clique « Accepter », puis « Sauvegarder ». Le résumé invite à lire l'enfant sans poser de lien : l'utilisateur le pose lui-même depuis « Maillage », où l'enfant est proposé en tête (« Article enfant (section « … ») »), ou par « 🔗 Lien interne ».

### 11. Republier le parent
**Exigences :** FR-RED-PUBLISH-GATE, FR-CER-CHILD-FROM-PILLAR-H2

L'utilisateur rouvre l'aperçu du pilier et clique « Exporter HTML ». La porte ne signale plus la section trop longue, et le lien vers l'enfant, désormais publié, ne demande plus rien. Comme le texte a changé, les dérogations encore valables des étapes du Moteur reviennent pour être reconfirmées (« J'ai lu ») ; puis le nouveau fichier HTML du pilier se télécharge.

## Ce qui peut mal tourner

### Le parent n'est pas encore rédigé
**Exigences :** FR-CER-PARENT-WRITTEN-GATE

Tant que le premier jet du parent n'est pas accepté, ses boutons de section sont grisés, avec en orange « Validez d'abord le premier jet de « … » : un article ne naît que d'un parent rédigé. » ; le clic n'ouvre rien et rien n'est payé. Si une création arrive malgré tout (un autre onglet resté ouvert), la porte du premier jet du parent est jouée : l'alarme s'ouvre sur le parent, et la création reprend si l'utilisateur corrige ou assume.

### La section vient d'être prise dans un autre onglet
**Exigences :** FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-CREATION-HONNETE

Un second onglet resté ouvert propose encore « Créer l'article de cette section ». Le clic ne montre aucun candidat et ne paie rien : « Aucun candidat : La section « … » a déjà donné l'article « … ». », avec « Relancer la proposition ». Après rechargement, la section montre le lien vers l'article déjà né.

### Le mot-clé choisi est déjà pris, ou n'a pas pu être mesuré
**Exigences :** FR-CER-KEYWORD-REAL-DATA, FR-CER-CREATION-HONNETE, FR-INFRA-KEYWORDS-SEO ⚠

Un candidat que l'outil n'a pas pu mesurer est marqué « Non mesuré » et ne peut pas être coché. Un mot-clé déjà visé par un autre cocon n'empêche pas la création : un avertissement nomme le cocon concurrent et invite à en choisir un autre au Moteur. Une adresse de page déjà prise refuse la création et invite à changer le titre. Aujourd'hui, aucun écran affiché ne permet ensuite de changer ou de retirer ce mot-clé du pool du cocon.

### Parent et enfant se disputent la même recherche
**Exigences :** FR-LIE-LOCK-GATE, FR-HN-LOCK-GATE, FR-MOT-CANNIBALIZATION ⚠

Si un lieutenant de l'enfant est le Capitaine du pilier, la porte des lieutenants lève un 🔴 qui nomme le pilier. Si le pilier garde un H2 qui contient le Capitaine de l'enfant et le développe en H3, sa porte de structure lève aussi un 🔴 et propose de garder ce H2 en simple résumé avec un lien. L'utilisateur corrige ou assume par écrit. Aujourd'hui, l'alerte de cannibalisation du Moteur n'existe que sur les lignes de la liste des articles, sans nommer l'autre article, et les cartes du Radar et du Capitaine n'en portent pas.

### La section du parent n'a pas été résumée, ou a changé depuis
**Exigences :** FR-RED-PUBLISH-GATE, FR-CER-CHILD-FROM-PILLAR-H2

À la publication du parent, une section dont un enfant est né et qui dépasse 250 mots est un 🔴 : « La section « … » compte N mots alors que l'article « … » traite ce sujet : résumez-la en 150 à 250 mots (passe « Résumer ») et renvoyez vers lui. ». Si cette section a été renommée ou supprimée, c'est un 🟠 ; l'enfant reste affiché sous son parent dans l'arbre.

## Défauts connus sur ce parcours

- FR-RED-PROGRESS — rouvrir la rédaction guidée d'un article déjà rédigé ramène toujours à « Brief & Structure ».
- FR-CER-COCOON-PROGRESSIVE — « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur ; « Régénérer › Titre » sur une ligne « Créé » ne change le titre que sur la carte, sans l'enregistrer : le Moteur montre alors un autre titre que l'arbre et la Rédaction.
- FR-CER-AIGUILLAGE — « Articles du cocon (N) » range tous les articles sous « Autre » au lieu de leur niveau ; dans les listes du Moteur et de la Rédaction, le badge des spécialisés n'a pas de couleur.
- FR-MOT-CANNIBALIZATION — l'alerte n'existe que sur les lignes de la barre des articles, sans nommer l'article concurrent ; les cartes du Radar et du Capitaine n'ont pas de badge.
- FR-HN-TAB — un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit.
- FR-CER-WORD-COUNT-RECOMMEND — sans avis de l'IA, la raison de la longueur conseillée s'affiche en jargon technique (« Heuristique : 60% SERP avg … »).
- FR-RED-DRAFT-SINGLE-PASS — une panne de rédaction n'affiche aucun message, ni dans la rédaction guidée ni dans l'éditeur ; l'échec de la méta, d'une réduction ou d'une humanisation n'en affiche pas non plus.
- FR-RED-LINKING-MANUAL — dans la rédaction guidée, « Appliquer » une suggestion ne fait rien ; dans l'éditeur, l'ancre n'est cherchée que dans la zone active : ailleurs, « Appliquer » ne fait rien, sans message, et la suggestion reste affichée.
- FR-RED-CONTEXTUAL-ACTIONS — l'éditeur n'envoie pas le mot-clé de l'article : « Optimiser mot-clé » et les autres actions travaillent sans lui ; les blocs « Sources chiffrées » et « Exemples réels » retirent les liens absents de la recherche sans dire combien ; l'échec d'une action s'affiche sous l'éditeur, caché par le voile ; « Convertir en liste » montre ses balises dans la fenêtre de résultat.
- FR-RED-EXPORT-HTML — le fichier téléchargé perd tous les liens internes posés dans l'éditeur (celui de l'enfant vers son parent comme celui du parent vers l'enfant), et son H1 est le titre de l'article, pas le H1 jugé par la porte ; réexporter après une correction, sans recharger l'aperçu, télécharge la version chargée à l'ouverture de l'onglet, pas celle que la porte vient d'accepter.
- FR-INFRA-KEYWORDS-SEO — aucun écran affiché ne permet de remplacer, de changer le statut ni de supprimer un mot-clé du pool ; le pool ne s'alimente qu'à la création d'un article ; le remplacement d'un mot-clé ne vérifie pas qu'un autre cocon l'utilise déjà, seul l'ajout le refuse ; un mot-clé déjà présent dans le pool de son propre cocon est refusé comme s'il appartenait à un autre cocon.
