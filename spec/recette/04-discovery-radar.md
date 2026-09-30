---
title: Recette — Discovery et Radar
module: 04
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/06-discovery.md
  - spec/07-radar.md
---

# Module 04 — Discovery et Radar

**Durée :** ~65 min (+ ~25 min pour la section RÉEL) · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express fait (cocon « Recette <date> », pilier rédigé puis publié, un article enfant « À rédiger ») ; bouton sur **MOCK** ; connexion internet (les suggestions Google sont réelles, même en MOCK). Tu travailles sur l'article enfant : ses onglets Discovery et Radar n'ont pas de cadenas, et ses deux premiers points de progression sont vides. Sinon, prends un autre article du cocon qui remplit ces deux conditions.

Ce module suit le chemin d'un mot-clé dans la phase « 1 Générer » du Moteur : Discovery rassemble des idées venues de plusieurs sources, écarte le hors-sujet et envoie un tri au Radar. Le Radar mesure chaque mot-clé, lui donne **une seule note** (le Score Marché, affiché « Score KPI ») et trie la liste avec cette même note, avant et après un rechargement. On y vérifie aussi ce qui est enregistré, et ce qui revient ou non quand on rouvre l'article.

## Vérifications

### DIS-1 — L'onglet Discovery avant tout lancement
**Exigences :** FR-DIS-SOURCES, FR-DIS-AI-ANALYSIS, NFR-UX-STABLE-SKELETON ⚠

**Gestes :**
1. Sur la page du cocon, clique la carte **« Moteur »**. Ouvre « Articles suggérés (N) » et clique le titre de l'article enfant. Le Moteur s'ouvre sur un autre onglet : clique **Discovery** dans le groupe « 1 Générer » de la barre du haut.
2. Regarde le haut de l'onglet, puis fais défiler jusqu'en bas.
3. Clique l'en-tête du panneau « Analyse IA Discovery » pour le déplier.
4. Vide le champ « Mot-clé racine » et appuie sur Entrée. Remets ensuite le mot-clé.
5. Si la racine proposée est le nom du cocon (« Recette … »), remplace-la par un vrai mot-clé du sujet de l'article : en MOCK, le filtre simulé écarte tout mot-clé qui contient « recette ».

**Tu dois voir :**
- le champ « Mot-clé racine » déjà rempli avec le mot-clé de l'article (sinon le nom du cocon) ; dessous, « Article : {titre} » et, si l'article en a une, « · Douleur : {douleur} » ;
- les boutons **« Découvrir »** et **« Courte-traîne IA »** ;
- sept sections, chacune avec son icône et « (0) » : 🔤 « Alphabet (A-Z) », ❓ « Questions », 🎯 « Intent Modifiers », 🔗 « Prepositions », 🤖 « IA Claude », 📊 « DataForSEO », 🎯 « Courte-traîne IA (PAA-friendly) ». Chacune dit « Saisissez un mot-clé pour découvrir les suggestions. » ;
- un bouton **« Générer »** dans l'en-tête de la seule section Courte-traîne ;
- le panneau « Analyse IA Discovery », avec « Sélection intelligente des 20-30 mots-clés les plus stratégiques (groupes, métriques, douleur). », replié sur « Cliquez pour lancer l'analyse IA. » ; déplié : « Lance d'abord une découverte de mots-clés ci-dessus, puis l'IA pourra analyser et te proposer une sélection stratégique. » et le bouton « Analyser les résultats pertinents » grisé ;
- champ vide : **« Découvrir »** et **« Courte-traîne IA »** grisés ; Entrée ne lance rien.

**C'est un bug si :**
- une des sept sections manque, ou le panneau « Analyse IA Discovery » n'est pas là avant tout lancement ;
- le bouton d'analyse est cliquable sans découverte ;
- une recherche part avec un champ vide.

**⚠ Défaut connu :** NFR-UX-STABLE-SKELETON — les panneaux d'IA du Lexique et des Lieutenants n'apparaissent qu'après leur analyse ; pendant un scan du Radar, « Mots-clés à scanner » et les résultats disparaissent ; à Discovery, le filtre de pertinence et « Groupes de mots » n'apparaissent qu'après la première découverte. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DIS-2 — « Découvrir » remplit les six premières sources
**Exigences :** FR-DIS-SOURCES, FR-DIS-LONGTAIL-GENERATION ⚠, FR-RAD-GENERATE

**Gestes :**
1. En bas à gauche, repère la pastille des coûts (« … · N appels ») et note N.
2. Clique **« Découvrir »** et regarde les boutons et les en-têtes pendant le travail.
3. Une fois tout chargé, parcours chaque section, en particulier « IA Claude » et « DataForSEO ».

**Tu dois voir :**
- pendant la recherche : **« Découvrir »** devient « Recherche... », les deux boutons sont grisés, et un petit rond tourne à la place du compteur des sections en cours ;
- chaque section se remplit dès que sa source répond, avec son compteur « (n) » ; une source qui ne trouve rien dit « Aucun résultat dans cette source. » ;
- les quatre sections Google (Alphabet, Questions, Intent Modifiers, Prepositions) : de vraies suggestions de Google, même en MOCK ;
- « IA Claude » : 25 mots-clés au plus, chacun suivi d'une courte raison en gris, sans doublon. En MOCK : 15 mots-clés formés du mot-clé de l'article suivi de « urgent », « pas cher », « avis », « comment choisir »… ;
- « DataForSEO » : des étiquettes « Vol: … » (« 1.2k » au-delà de 1 000), « KD: … », « CPC: …€ » et l'intention ; une donnée absente n'a pas d'étiquette. En MOCK, ce sont des données du bac à sable, parfois sans rapport avec ta racine ;
- « Courte-traîne IA (PAA-friendly) » reste à « (0) » avec son bouton **« Générer »** : « Découvrir » ne la lance pas ;
- un mot-clé présent dans plusieurs sections porte un badge « ×2 » (ou plus), s'écrit en bleu et remonte en tête de chacune de ses sections ;
- la pastille compte au moins un appel de plus (la génération de la section IA Claude) ;
- une ligne « Filtre de pertinence » apparaît sous le champ, et une colonne « Groupes de mots » à droite.

**C'est un bug si :**
- une section disparaît ou reste sans compteur ;
- « IA Claude » dépasse 25 mots-clés, montre un doublon ou un mot-clé sans raison ;
- la section Courte-traîne se remplit toute seule ;
- un mot-clé « ×N » reste sous des mots-clés à source unique.

**⚠ Défaut connu :** FR-DIS-LONGTAIL-GENERATION — la courte-traîne générée avant « Découvrir » n'est pas filtrée et la ligne du filtre n'apparaît pas ; « Découvrir » l'efface ensuite. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DIS-3 — Replier, tout cocher, afficher la suite, filtrer par groupe de mots
**Exigences :** FR-DIS-SOURCES

**Gestes :**
1. Clique l'en-tête de la section « Alphabet (A-Z) », puis reclique-le.
2. Coche la case « Tout » de la section « Questions », puis décoche-la. (Coche toujours par « Tout » dans ce module, sauf consigne contraire : un cochage à l'unité lance une pré-analyse, voir DIS-9.)
3. Si une section affiche « Afficher tout (N de plus) » (plus de 100 lignes, souvent Alphabet), clique-le, puis « Réduire la liste ».
4. Dans la colonne « Groupes de mots », clique un mot. Clique **« Effacer »**. Reclique un mot, puis reclique ce même mot.

**Tu dois voir :**
- le triangle ▸ de l'en-tête pivote ; la liste se replie, puis revient ;
- « Tout » coche toutes les lignes visibles de la section ; en bas, une barre fixe « N mot(s)-clé(s) sélectionné(s) » avec **« Envoyer au Radar → »** ; aucune notification « Validation Capitaine dans … » ; décocher « Tout » décoche la section et la barre disparaît si plus rien n'est coché ;
- au-delà de 100 lignes, la liste s'arrête à 100 ; « Afficher tout (N de plus) » montre le reste, « Réduire la liste » recoupe ;
- « Groupes de mots » liste des mots avec leur nombre d'apparitions ; un clic affiche « Filtre actif : {mot} » et ne garde, dans chaque section, que les mots-clés qui contiennent ce mot (compteur « (visibles/total) ») ; « Effacer » ou un second clic sur le même mot retire le filtre.

**C'est un bug si :**
- « Tout » coche une ligne masquée par le filtre de groupe ;
- un groupe de mots laisse visible un mot-clé qui ne contient pas ce mot ;
- après « Effacer », des lignes restent masquées.

### DIS-4 — Relancer la même recherche ne rappelle rien
**Exigences :** FR-DIS-SOURCES

**Gestes :**
1. Attends qu'aucune notification ne soit affichée en bas. Note les compteurs de trois sections et le nombre d'appels de la pastille.
2. Sans rien changer au champ, clique de nouveau **« Découvrir »**.

**Tu dois voir :**
- aucun rond de chargement ; « Découvrir » ne passe pas à « Recherche... » ;
- les mêmes lignes et les mêmes compteurs ;
- la pastille des coûts ne bouge pas.

**C'est un bug si :**
- les sections se vident puis se rechargent ;
- le nombre d'appels de la pastille augmente.

### DIS-5 — Le filtre de pertinence masque le hors-sujet sans le supprimer
**Exigences :** FR-DIS-RELEVANCE-FILTER

**Gestes :**
1. Lis la ligne « Filtre de pertinence » (juste après un lancement, une barre de calcul y passe).
2. Décoche « Filtre de pertinence ». Recoche-la.
3. *(Facultatif, pour voir le filtre travailler en MOCK.)* Ajoute « lyon » à la racine (par exemple `plombier lyon`), clique **« Découvrir »** et regarde la ligne du filtre. Remets ensuite la racine d'origine et clique **« Découvrir »**.

**Tu dois voir :**
- pendant le calcul : une petite barre et « Filtrage 1/2 · n/total », parfois suivie de « Filtrage 2/2 · … » (très bref en MOCK) ;
- ensuite : « X pertinents / N total » et, s'il masque quelque chose, « N hors-sujet masqués » ; les sections touchées affichent « (visibles/total) » ;
- filtre décoché : tout réapparaît aussitôt, sans barre de calcul ; les mots-clés hors-sujet sont grisés ;
- filtre recoché : les mêmes mots-clés sont de nouveau masqués, toujours sans calcul ;
- en MOCK, le filtre simulé n'écarte presque rien, et l'avertissement « Attention : le filtrage de pertinence semble ne pas avoir fonctionné… Vérifiez votre clé API Claude… » ne s'affiche **pas** : il est réservé au mode réel, où plus de 90 % d'au moins 20 mots-clés passés signale une vraie panne ;
- avec « lyon » : le filtre simulé écarte les noms de grandes villes ; les suggestions Google, qui contiennent toutes « lyon », sont masquées, et « Filtrage 2/2 » apparaît.

**C'est un bug si :**
- décocher ou recocher le filtre relance un calcul (barre « Filtrage ») ;
- un mot-clé masqué ne revient pas, grisé, quand le filtre est décoché ;
- « X pertinents » dépasse « N total ».

> « X pertinents » compte des mots-clés uniques ; « hors-sujet masqués » compte chaque apparition dans une section. Les deux ne s'additionnent pas pour donner le total : limite connue, pas un bug. La règle de la douleur et le jugement des mots-clés arrivés en retard se voient en RÉEL (DIS-R1).

### DIS-6 — La courte-traîne IA, seulement à la demande
**Exigences :** FR-DIS-LONGTAIL-GENERATION ⚠, FR-RAD-GENERATE

**Gestes :**
1. Dans l'en-tête de la section « Courte-traîne IA (PAA-friendly) », clique **« Générer »**.
2. Clique ensuite **« Courte-traîne IA »**, à côté de « Découvrir ».
3. Déplie la pastille des coûts et lis ses dernières lignes, puis replie-la.
4. *(Facultatif.)* Recharge la page (F5), rechoisis l'article, ouvre **Discovery** et clique **« Courte-traîne IA »** avant tout « Découvrir ». Clique ensuite **« Découvrir »**.

**Tu dois voir :**
- pendant la génération, le bouton du haut dit « Génération… » ; la section se remplit de mots-clés courts, chacun avec sa raison ; le bouton « Générer » quitte l'en-tête dès que la section a des mots-clés ;
- en MOCK, la courte-traîne donne les 15 mêmes mots-clés que la section IA Claude (même texte préparé) : chacun porte « ×2 » dans les deux sections, et comme ils sont déjà jugés, aucune nouvelle barre « Filtrage » ne passe ;
- le second clic remplace la liste (identique en MOCK) ;
- une ligne « Courte-traîne IA » par génération dans la pastille des coûts ;
- geste facultatif : la courte-traîne doit passer par le filtre de pertinence comme les autres. Aujourd'hui, « Découvrir » vide ensuite la section Courte-traîne ; la spec ne dit rien de ce cas : note-le.

**C'est un bug si :**
- la génération modifie les autres sections ;
- geste facultatif : la courte-traîne générée avant « Découvrir » n'a ni ligne « Filtre de pertinence » ni jugement (constat relevé à la lecture du code, à confirmer).

**⚠ Défaut connu :** FR-DIS-LONGTAIL-GENERATION — la courte-traîne générée avant « Découvrir » n'est pas filtrée et la ligne du filtre n'apparaît pas ; « Découvrir » l'efface ensuite. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DIS-7 — L'analyse IA propose une sélection
**Exigences :** FR-DIS-AI-ANALYSIS

**Gestes :**
1. Déplie le panneau « Analyse IA Discovery » si besoin. Lis son message et son bouton.
2. Clique **« Analyser les N résultats pertinents »**.
3. Coche une proposition, puis cherche le même mot-clé dans les sections.
4. Coche « Tout sélectionner », puis décoche-la.
5. Clique **« Relancer l'analyse »** ; à la question, clique Annuler.

**Tu dois voir :**
- avant : « Prêt à analyser N mots-clés pertinents. », avec le même N que « X pertinents » de la ligne du filtre ; si tu l'ouvres pendant un filtrage : bouton grisé et « Filtrage de pertinence en cours… L'analyse IA sera disponible une fois le filtrage terminé. » ;
- pendant : le bouton dit « Analyse en cours… » et des lignes grises clignotent ;
- après : « Recommandation IA », « N mots-clés », « Tout sélectionner », un paragraphe de synthèse, puis une ligne par mot-clé : son rang (1, 2, 3…), une pastille 🔴 (haute), 🟡 (moyenne) ou 🟢 (basse), le mot-clé, « ×N » s'il y a lieu, sa raison et une case. En MOCK : 20 à 25 mots-clés, 8 🔴, puis 8 🟡, puis le reste en 🟢, et une synthèse « Sélection de N mots-clés stratégiques… » ;
- cocher une proposition coche aussi ce mot-clé dans les sections (une seule sélection), sans notification « Validation Capitaine » ;
- « Tout sélectionner » coche toute la liste et la barre du bas augmente d'autant ; la décocher la retire ;
- le bouton est devenu **« Relancer l'analyse »** ; il demande « Relancer l'analyse IA ? Cela consommera un appel Claude. » ; Annuler ne change rien.

**C'est un bug si :**
- le panneau reste vide après l'analyse (ni résultat, ni message d'erreur) — un échec doit afficher « Échec de l'analyse IA. Réessayez. » ;
- la relance part sans demander ;
- une proposition n'a pas de rang, de priorité ou de raison.

> L'état « Aucun mot-clé pertinent à analyser. Élargis ta recherche ou désactive le filtre de pertinence. » ne se provoque pas en MOCK.

### DIS-8 — Retrouver une découverte sauvegardée
**Exigences :** FR-DIS-CACHE ⚠

**Gestes :**
1. Note le compteur de trois sections et la ligne « X pertinents / N total ».
2. Recharge la page (F5), rechoisis l'article et ouvre **Discovery**.
3. Dans « Mot-clé racine », efface la dernière lettre et retape-la.
4. Note le nombre d'appels de la pastille, puis clique **« Charger »**.
5. Déplie le panneau « Analyse IA Discovery ».
6. Recharge (F5), rechoisis l'article, ouvre Discovery, refais le geste 3, puis clique **« Rafraîchir »**. Refais encore le geste 3.
7. Clique **« Découvrir »** pour reconstruire la découverte (elle sert à la suite).

**Tu dois voir :**
- après F5 : des sections vides, et pas de bandeau tant que le champ n'a pas changé (limite connue) ;
- moins d'une seconde après le geste 3 : un bandeau vert « Dernière analyse du JJ/MM/AAAA · N mots-clés · analyse IA incluse » avec **« Charger »** et **« Rafraîchir »** ;
- après « Charger » : les sections, les jugements du filtre (même « X pertinents / N total »), les groupes de mots et l'analyse IA reviennent aussitôt, sans rond de chargement ; le bandeau disparaît ; aucun appel d'IA en plus dans la pastille ;
- le panneau d'analyse replié dit « Cliquez pour voir les suggestions IA. » et, déplié, montre la « Recommandation IA » d'avant ;
- « Rafraîchir » : le bandeau disparaît, l'écran se vide ; au geste 3 suivant, plus aucun bandeau ;
- geste 7 : une découverte complète, sauvegardée seule quand les sources et le filtre ont fini.

**C'est un bug si :**
- « Charger » relance des recherches (« Recherche... », ronds de chargement) ;
- l'analyse IA ou les jugements du filtre ne reviennent pas ;
- le bandeau réapparaît pour cette racine après « Rafraîchir ».

**⚠ Défaut connu :** la section Courte-traîne n'est ni sauvegardée ni restaurée : après « Charger », elle est vide. Si tu la vois revenir, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** une sauvegarde n'expire jamais ; elle est proposée même après 30 jours (invisible dans une recette d'un jour). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DIS-9 — La pré-analyse Capitaine d'un mot-clé coché
**Exigences :** FR-DIS-CAPTAIN-PRESCAN

**Gestes :**
1. Dans une section, coche **une seule** case, celle d'un mot-clé A. Attends la fin du compte à rebours.
2. Coche un mot-clé B, puis clique **« Annuler »** dans la notification.
3. Coche un mot-clé C, puis décoche-le avant la fin du compte à rebours.
4. Ouvre l'onglet **Capitaine**. Si A n'y est pas, recharge la page (F5), rechoisis l'article, ouvre Capitaine, puis relance **« Découvrir »** dans Discovery pour la suite.

**Tu dois voir :**
- en bas de l'écran, une notification avec un cercle qui se remplit, « Validation Capitaine dans 5s » (puis 4s, 3s…), le mot-clé entre « » et un bouton **« Annuler »** ;
- à zéro, la notification disparaît sans message ;
- B : la notification disparaît et B reste coché ;
- C : la notification disparaît dès le décochage ;
- au Capitaine : A parmi les cartes, cadenas ouvert (infobulle « Verrouiller ») : il est testé, pas verrouillé. B et C n'y sont pas.

**C'est un bug si :**
- A arrive verrouillé au Capitaine ;
- B ou C apparaissent au Capitaine ;
- un message d'erreur s'affiche à la fin du compte à rebours (un échec doit rester silencieux).

> « Tout » et les cases de l'analyse IA ne lancent pas de pré-analyse (vu en DIS-3 et DIS-7). En RÉEL, chaque pré-analyse est payante.

### DIS-10 — Envoyer la sélection au Radar, et l'étape « Discovery »
**Exigences :** FR-DIS-SEND-TO-RADAR ⚠, FR-DIS-CHECK

**Gestes :**
1. Ouvre « Articles suggérés (N) » et survole les petits points à côté du titre de l'article, sans cliquer la ligne (ça désélectionnerait l'article). Referme le bloc.
2. Dans Discovery, garde **6 à 8** mots-clés cochés (décoche le reste), dont au moins un de la section IA Claude. Lis le nombre de la barre du bas. (Si une notification « Validation Capitaine » cache le bouton, attends qu'elle disparaisse.)
3. Clique **« Envoyer au Radar → »**.
4. Survole la puce du mot-clé venu de la section IA Claude.
5. Rouvre « Articles suggérés (N) » et survole de nouveau les points.
6. Reviens sur **Discovery** : tes cases sont toujours cochées. Clique encore **« Envoyer au Radar → »**.

**Tu dois voir :**
- geste 1 : six points en deux groupes ; le premier (infobulle « Discovery ») est vide, malgré les lancements, cochages, chargements et « Rafraîchir » des vérifications précédentes ;
- la barre « N mot(s)-clé(s) sélectionné(s) » ;
- après l'envoi : l'onglet Radar s'ouvre sur « N mots-clés à scanner », avec N puces, le même N que la barre ;
- la puce IA Claude montre sa raison en infobulle ;
- geste 5 : le premier point est plein ;
- second envoi : toujours N puces, sans doublon ; le point reste plein.

**C'est un bug si :**
- le premier point était plein avant l'envoi alors que l'article n'avait jamais rien envoyé ;
- le Radar reçoit plus ou moins de mots-clés que le nombre de la barre ;
- le second envoi crée des doublons.

**⚠ Défaut connu :** l'outil ouvre le Radar et pose l'étape avant d'avoir enregistré la liste, sans vérifier que l'enregistrement réussit : si l'enregistrement échouait, tu resterais sur le Radar, sans message. Et un mot-clé coché seulement dans la section Courte-traîne n'est pas envoyé (invisible en MOCK, où la courte-traîne répète la section IA Claude : voir DIS-R1). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-1 — La liste d'attente du Radar vient de la base
**Exigences :** FR-RAD-DB-FIRST

**Gestes :**
1. Sur le Radar de l'article, compte les puces sous « N mots-clés à scanner ».
2. Recharge la page (F5), rechoisis l'article, puis clique l'onglet **Radar**. Si l'invite « Charger Radar » apparaît en bas, **ne clique pas** sur « DB » pour l'instant (elle sert à RAD-15).
3. Dans « Articles suggérés (N) », choisis le pilier (ou tout article dont le Radar n'a jamais servi) et ouvre son onglet **Radar**.
4. Rechoisis l'article enfant et ouvre **Radar**.

**Tu dois voir :**
- après F5 : les mêmes puces, dans le même ordre ;
- sur le pilier : « Mots-clés à scanner », « Aucun mot-clé en attente. Passe par l'onglet Discovery pour envoyer une sélection, ajoute un mot-clé manuellement ci-dessus, ou utilise les champs en haut pour en générer plusieurs. » et **« Lancer le scan »** grisé. (Les « champs en haut » n'existent pas dans le Moteur : limite connue.) ;
- de retour sur l'article enfant : ses puces reviennent.

**C'est un bug si :**
- une puce manque, ou apparaît en double, après F5 ;
- le pilier montre les puces de l'article enfant, ou l'inverse ;
- « Lancer le scan » est cliquable avec une liste vide.

### RAD-2 — Ajouter et retirer un mot-clé à la main
**Exigences :** FR-RAD-MANUAL-ADD ⚠, FR-RAD-DB-FIRST

**Gestes :**
1. Regarde le champ « Ajouter un mot-clé à scanner… » et le bouton **« + Ajouter »**, champ vide. Tape trois espaces et appuie sur Entrée.
2. Tape un mot-clé nouveau, en rapport avec l'article, puis appuie sur Entrée.
3. Tape un autre mot-clé nouveau, puis clique **« + Ajouter »**.
4. Retape un mot-clé déjà présent en changeant la casse et en ajoutant des espaces autour (par exemple `  PLOMBIER Urgent `), puis Entrée.
5. Retire une puce avec son « × ». Retire-en d'autres jusqu'à n'en garder que **5 à 8** : le scan interroge Google une fois par seconde et par mot-clé.
6. Recharge la page (F5), rechoisis l'article et ouvre **Radar**, toujours sans cliquer « DB ».

**Tu dois voir :**
- champ vide ou fait d'espaces : **« + Ajouter »** grisé, et Entrée n'ajoute rien ;
- Entrée et « + Ajouter » ont le même effet : la puce apparaît, le champ se vide, le titre passe à « N+1 mots-clés à scanner » ;
- doublon : aucune seconde puce ;
- « × » : la puce disparaît et le compte baisse ;
- après F5 : les ajouts et les retraits sont conservés.

**C'est un bug si :**
- un doublon (casse ou espaces différents) crée une seconde puce ;
- après F5, une puce retirée revient ou une puce ajoutée disparaît.

**⚠ Défaut connu :** un mot-clé déjà présent vide le champ sans aucun message ; l'exigence attend « Ce mot-clé est déjà dans la liste ». Si tu vois ce message, le défaut a peut-être disparu : note-le.

### RAD-3 — Le Radar avant et pendant le scan, puis l'étape « Radar »
**Exigences :** FR-RAD-SCAN-2PASS, FR-RAD-CHECK, NFR-UX-STABLE-SKELETON ⚠

**Gestes :**
1. Avant de scanner, regarde toute la zone sous la liste d'attente.
2. Clique **« Lancer le scan »** et observe jusqu'à la fin (en MOCK, compte une à deux secondes par mot-clé).
3. Ouvre « Articles suggérés (N) » et survole le deuxième point de l'article.

**Tu dois voir :**
- avant le scan, la zone de résultats est déjà là, estompée et en pointillés : le thermomètre « ○ », « —/100 », « En attente » (affiché en capitales) ; « Autocomplete (0) » avec « Aucune suggestion — lance un scan » ; « Cartes radar (0) » avec « Les cartes apparaîtront après le scan » ; plus bas, « Suggestions IA Radar » avec « Lance un scan ci-dessus pour voir ici les meilleurs candidats à pousser vers le Capitaine, triés par mix marché × pertinence. » et **« Marquer comme candidats Capitaine (0) »** grisé ;
- pendant le scan : un rond qui tourne et la phase, « Autocomplete + KPIs... », puis « Analyse PAA... » avec une barre et « s/t mots-clés », puis « Calcul du score... ». Cette progression est estimée d'après le temps, pas mesurée. La liste d'attente et la zone de résultats sont masquées le temps du scan ;
- après : une carte par mot-clé de la liste ; la liste d'attente reste affichée au-dessus, pour ajouter, retirer, relancer ;
- chaque carte porte le volume, la difficulté (KD), le CPC, l'intention (icônes) et les questions PAA ;
- le deuxième point (infobulle « Radar ») est plein.

**C'est un bug si :**
- un mot-clé de la liste n'a pas de carte, ou en a deux ;
- le point « Radar » reste vide après un scan réussi ;
- un échec n'affiche rien : il doit montrer le message d'erreur et un bouton **« Fermer »**, sans carte ni point rempli.

**⚠ Défaut connu :** NFR-UX-STABLE-SKELETON — les panneaux d'IA du Lexique et des Lieutenants n'apparaissent qu'après leur analyse ; pendant un scan du Radar, « Mots-clés à scanner » et les résultats disparaissent ; à Discovery, le filtre de pertinence et « Groupes de mots » n'apparaissent qu'après la première découverte. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-4 — Une carte du Radar n'affiche que le Score Marché
**Exigences :** FR-RAD-SCORING-BIMODAL ⚠, FR-RAD-NO-RELEVANCE-IN-SCAN

**Gestes :**
1. Lis l'en-tête de chaque carte, de gauche à droite.
2. Survole les icônes d'intention d'une carte.
3. Cherche, sur toutes les cartes et dans « Suggestions IA Radar », une mention de pertinence ou de douleur.

**Tu dois voir :**
- sur une ligne : la case, le triangle ▶, le mot-clé (les noms de ville et le mot qui suit « pour » en italique coloré), les icônes d'intention, les indicateurs « VOL », « KD », « CPC », « PAA », puis l'anneau ;
- chaque icône d'intention dessinée ; à son survol : « Informationnel », « Commercial », « Transactionnel » ou « Navigationnel » ;
- les valeurs : volume en « 1.2k » au-delà de 1 000, KD en entier, CPC en « 1.20 € », PAA en points (« 2.5 pts ») ; « — » quand une donnée manque ;
- sous l'anneau, « Score KPI » (en capitales) sur **toutes** les cartes ;
- nulle part « Score Pertinence », jamais deux notes sur une carte ; dans « Suggestions IA Radar », la pastille « P » vaut toujours « — », et son infobulle dit qu'elle se calcule au Capitaine ;
- aucune carte grisée.

**C'est un bug si :**
- une carte du Radar affiche « Score Pertinence », ou deux notes ;
- un volume, un KD ou un CPC absent s'affiche « 0 » au lieu de « — » ;
- une carte ou un badge parle de la douleur ;
- une icône d'intention est vide : seule son infobulle apparaît au survol de la place.

**⚠ Défaut connu :** une intention inconnue compte comme une composante rouge du Score Marché au lieu d'être écartée : une carte sans icône d'intention a « Intent (15%) … 0/100 » dans son info-bulle (voir RAD-5), ce qui baisse sa note. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-5 — L'anneau et son info-bulle expliquent la note
**Exigences :** FR-RAD-SCORE-RING-TOOLTIP ⚠, FR-RAD-SCORING-BIMODAL ⚠, FR-RAD-AUTOCOMPLETE-PER-KEYWORD ⚠

**Gestes :**
1. Compare les anneaux de deux cartes de notes différentes.
2. Survole l'anneau d'une carte.
3. Refais le calcul : pour chaque ligne, valeur × poids ; additionne, puis divise par la somme des poids (95 % quand les six lignes comptent).
4. Clique l'anneau.
5. Survole l'anneau d'une carte sans icône d'intention, s'il y en a une.
6. Dans un autre onglet, tape dans Google le mot-clé d'une carte et compte à peu près les suggestions proposées pendant la frappe. Compare avec la ligne « Autocomplete » de son info-bulle.

**Tu dois voir :**
- l'anneau se remplit selon la note (0 à 100), sa couleur va du rouge (bas) au vert (haut), la note est au centre ;
- l'info-bulle : l'en-tête « Score KPI », puis six lignes « Volume (30%) », « KD (20%) », « CPC (10%) », « Intent (15%) », « PAA (10%) », « Autocomplete (10%) », chacune avec sa description et une valeur « 0/100 », « 50/100 » ou « 100/100 », puis « Total » égal à la note de l'anneau ;
- ton calcul retombe sur le Total, à l'arrondi près. Exemple : 100, 50, 50, 0, 100 et 0 donnent (30 + 10 + 5 + 0 + 10 + 0) / 0,95 ≈ 58 ;
- le clic sur l'anneau ne coche pas la carte et ne la déplie pas.

**C'est un bug si :**
- le Total diffère de la note de l'anneau ;
- ton calcul ne retombe pas sur le Total, par exemple parce qu'une ligne dont l'indicateur vaut « — » dans l'en-tête affiche « 50/100 » alors qu'elle est retirée du calcul (constat relevé à la lecture du code, à confirmer) ;
- l'info-bulle est vide.

**⚠ Défaut connu :** une intention inconnue n'est pas écartée : une carte sans icône d'intention a « Intent (15%) … 0/100 ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** le nombre de suggestions Google est noté comme une position. Pour un article intermédiaire (badge « INTERMÉDIAIRE »), un mot-clé que Google complète 8 fois ou plus reçoit « Autocomplete … 0/100 », un mot-clé qui en a 1 à 4 reçoit « 100/100 », et 0 suggestion vaut 0/100. Plus il y a de suggestions, meilleure devrait être la note. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-RAD-SCORE-RING-TOOLTIP — dans l'info-bulle, une composante sans donnée s'affiche « 50/100 » avec son poids, alors qu'elle n'entre pas dans le total. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-6 — Seul le triangle déplie une carte
**Exigences :** FR-RAD-CARD-CHEVRON-TOGGLE

**Gestes :**
1. Clique le triangle ▶ d'une carte, puis reclique-le.
2. Clique le mot-clé, puis un indicateur (« VOL », « KD »…).
3. Clique la case de la carte, puis décoche-la.

**Tu dois voir :**
- ▶ déplie le corps de la carte (le triangle pivote) ; un second clic le replie ;
- un clic sur le mot-clé ou sur un indicateur ne fait rien au Radar : ni dépli, ni case cochée ;
- la case coche la carte (bordure bleue) sans la déplier.

**C'est un bug si :**
- un clic ailleurs que sur ▶ déplie ou replie la carte ;
- ▶ coche ou décoche la carte.

> Au Capitaine, un clic sur le texte sélectionne la carte, et le cadenas, les étiquettes et le recalcul ont leur action propre : c'est vérifié dans le module Capitaine.

### RAD-7 — L'arbre des questions PAA
**Exigences :** FR-RAD-PAA-TREE, FR-RAD-NO-RELEVANCE-IN-SCAN

**Gestes :**
1. Déplie une carte qui a des questions.
2. Clique le ▶ d'une question suivie d'un « (n) ».
3. Clique le texte d'une question.
4. Déplie une carte sans question, s'il y en a une.

**Tu dois voir :**
- en tête du corps, la raison du mot-clé en italique. Pour un mot-clé venu d'une section Google ou DataForSEO, elle nomme sa section : « Trouvé par Discovery : Alphabet (A-Z). », par exemple ;
- chaque question de premier niveau porte un badge parmi « Exact », « Match », « Partiel exact », « Partiel », « Sémantique », « Sem. partiel », « Hors sujet » ; un pourcentage de similarité s'il existe ; « (n) » quand elle a des sous-questions ;
- ▶ déplie les sous-questions, chacune avec son badge ;
- un clic sur une question qui a une réponse déplie la réponse de Google ;
- aucun badge ne parle de la douleur ;
- une carte sans question : « Aucune PAA trouvée ».

**C'est un bug si :**
- une carte sans question reste vide, sans « Aucune PAA trouvée » ;
- une sous-question s'affiche au premier niveau ;
- un badge mentionne la douleur.

> En MOCK, le bac à sable peut ne renvoyer aucune question : toutes les cartes disent alors « Aucune PAA trouvée ». L'arbre complet se vérifie en RÉEL (RAD-R1).

### RAD-8 — Trier : la liste suit la note affichée
**Exigences :** FR-RAD-MARKET-COMPUTED-LIVE

**Gestes :**
1. Sans toucher au tri, lis les notes des anneaux de haut en bas et note-les avec leur mot-clé.
2. Clique **« Score KPI »** une fois, une deuxième fois, puis une troisième.
3. Clique **« A-Z »** trois fois de suite.

**Tu dois voir :**
- au-dessus des cartes : « N mots-clés », les boutons « A-Z » et « Score KPI » (flèche ⇅ au repos), « Avec CPC », « Sans CPC » et « Tout » ;
- à l'arrivée, les notes vont déjà de la plus haute à la plus basse ;
- « Score KPI » : 1er clic, bouton foncé, flèche ↓, notes décroissantes ; 2e clic, ↑, notes croissantes ; 3e clic, ⇅, retour à l'ordre d'arrivée ;
- « A-Z » : 1er clic, Z → A (↓) ; 2e, A → Z (↑) ; 3e, ordre d'arrivée ;
- chaque carte garde sa note en changeant de place ;
- à note égale (fréquent en MOCK, où le bac à sable donne les mêmes volumes à tous les mots-clés), l'ordre entre ces cartes est libre.

**C'est un bug si :**
- en « Score KPI ↓ », une carte est placée sous une carte de note plus basse (ou au-dessus d'une note plus haute en ↑) ;
- une note change quand on trie ;
- une carte « — » n'est pas en bas, dans les deux sens.

### RAD-9 — Filtrer par CPC et tout cocher
**Exigences :** FR-RAD-MARKET-COMPUTED-LIVE

**Gestes :**
1. Mets le tri sur « Score KPI ↓ ». Clique **« Avec CPC »**.
2. Coche « Tout ».
3. Reclique **« Avec CPC »**. Clique **« Sans CPC »**, puis reclique-le.
4. Décoche « Tout » s'il est coché, puis toutes les cartes restantes.

**Tu dois voir :**
- « Avec CPC » s'allume en bleu et ne garde que les cartes dont le CPC dépasse 0 ; le compteur dit « x / y mots-clés » ; l'ordre suit toujours la note ;
- « Tout » ne coche que les cartes visibles ; le bouton **« Envoyer au Capitaine (x) »** apparaît avec ce nombre ;
- le filtre retiré, les cartes réapparues ne sont pas cochées ;
- « Sans CPC » montre les autres (CPC absent ou nul) ; un seul des deux boutons peut être allumé ;
- sans aucune case cochée, **« Envoyer au Capitaine »** disparaît.

**C'est un bug si :**
- « Tout » coche une carte masquée ;
- un filtre change une note ou casse l'ordre du tri ;
- les deux filtres sont allumés en même temps.

> En MOCK, toutes les cartes ont souvent le même CPC : un filtre peut tout garder et l'autre tout masquer.

### RAD-10 — Le thermomètre et les suggestions Google du sujet
**Exigences :** FR-RAD-THERMOMETER ⚠

**Gestes :**
1. Rappelle-toi le thermomètre d'avant le scan (RAD-3).
2. Lis le thermomètre après le scan.
3. Fais la moyenne des notes des anneaux et compare-la à la note du thermomètre.
4. Clique « Autocomplete (N) ».

**Tu dois voir :**
- avant le scan : « ○ », « —/100 », « En attente » ;
- après : une icône (🔥, 🟠, 🔵 ou ❄️), « N/100 », un niveau en capitales (« Brulante » à partir de 70, « Chaude » à partir de 45, « Tiede » à partir de 20, sinon « Froide »), une phrase de verdict en italique, et trois compteurs : « Keywords » (le nombre de cartes), « Autocomplete », « PAA Total » (le total des questions des cartes) ;
- « Autocomplete (N) » : le même N que le compteur « Autocomplete » ; déplié, les suggestions de Google pour le titre de l'article, groupées par requête (« → "requête" (n) »), chacune avec son rang « #1 », « #2 »…

**C'est un bug si :**
- le niveau ne correspond pas à la note (par exemple « Chaude » à 30/100) ;
- « Keywords » diffère du nombre de cartes ;
- le thermomètre reste « En attente » après un scan qui a produit des cartes.

**⚠ Défaut connu :** la note du thermomètre est la moyenne d'un ancien score, qui compte 0 là où les cartes affichent « — » ; elle ne reflète pas les notes des anneaux : ta moyenne du geste 3 et la note du thermomètre diffèrent. Si elles concordent, scan après scan, le défaut a peut-être disparu : note-le.

### RAD-11 — « Suggestions IA Radar » reprend les notes des cartes
**Exigences :** FR-RAD-AI-SUGGESTIONS, FR-RAD-MARKET-LEVEL-AWARE, FR-RAD-NO-RELEVANCE-IN-SCAN

**Gestes :**
1. Descends au panneau « Suggestions IA Radar ».
2. Pour chaque ligne, compare « M n » à la note de l'anneau de la carte du même mot-clé.
3. Coche deux lignes, puis clique **« Marquer comme candidats Capitaine (2) »**.
4. Regarde l'onglet Capitaine qui s'ouvre, puis reviens au Radar.

**Tu dois voir :**
- le sous-titre « Top candidats Capitaine — tri local par mix marché + pertinence (verdicts NOGO exclus). » ; le classement s'affiche sans attente ni appel d'IA ;
- au plus 5 lignes, chacune avec le mot-clé, « M n » et « P — » (toujours « — » : le Radar ne mesure pas la pertinence, c'est voulu) ; au survol de « P — » : « Score Pertinence indisponible au Radar : il se calcule au Capitaine, quand le mot-clé y est étudié » ;
- « M n » égal à la note de l'anneau de la même carte : le serveur et l'écran notent avec le niveau de l'article ;
- les lignes rangées par « M » décroissant ; aucune carte de note inférieure à 40 ; ce sont les 5 meilleures cartes à 40 ou plus ;
- si toutes les cartes sont sous 40 : « Aucun candidat à proposer pour l'instant. Élargis ta sélection ou relance un scan — les cartes verdict NOGO/NOGO sont filtrées. » ;
- le bouton passe à « (2) » et devient actif ; au clic, les deux cases se décochent et l'onglet Capitaine s'ouvre avec les deux mots-clés, en cours d'étude, comme après « Envoyer au Capitaine » ;
- de retour au Radar : les cartes et le panneau n'ont pas bougé.

**C'est un bug si :**
- « M » diffère de l'anneau pour un même mot-clé ;
- une carte sous 40 est proposée, ou une carte à 40 ou plus manque alors qu'il y a moins de 5 lignes ;
- « P » affiche un nombre ;
- le clic ne fait que décocher : rien n'arrive au Capitaine.

### RAD-12 — Les longues traînes en MOCK : la section et ses suggestions
**Exigences :** FR-RAD-LONGTAIL-GENERATE ⚠

**Gestes :**
1. Sous les cartes, repère la section « Suggestions longue traîne ».
2. Clique **« ✨ Suggérer des combinaisons »**.
3. *(Facultatif.)* Sur le pilier, ajoute un seul mot-clé à la main et lance le scan.

**Tu dois voir :**
- dès 2 cartes : le titre « Suggestions longue traîne », le sous-titre « Combinaisons IA générées à partir des mots-clés Radar. Coche celles à envoyer au Capitaine. » et **« ✨ Suggérer des combinaisons »** ;
- pendant la génération : « L'IA génère les suggestions… » ;
- en MOCK : une liste de combinaisons des mots-clés du Radar (7 au plus), chacune avec « N/10 », sa justification et ses mots-clés d'origine, les 5 mieux notées pré-cochées. Si une recette précédente a gardé une réponse vide pour ces mêmes cartes (gardée 7 jours), « L'IA n'a proposé aucune combinaison pertinente cette fois. » revient sans nouvel appel, et aucun bouton ne reste pour réessayer (défaut connu) : ajoute ou retire une carte pour obtenir la liste. La qualité des combinaisons se juge en RÉEL (RAD-R2) ;
- geste facultatif : avec une seule carte, pas de section « Suggestions longue traîne ».

**C'est un bug si :**
- la section apparaît avec moins de 2 cartes ;
- le bouton ne donne ni liste, ni message, ni « Erreur : … » avec **« Réessayer »**.

**⚠ Défaut connu :** FR-RAD-LONGTAIL-GENERATE — une réponse vide est enregistrée et resservie pendant 7 jours, sans bouton pour réessayer. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-13 — Relancer le scan : questions relues, étape sans doublon
**Exigences :** FR-RAD-SCAN-2PASS, FR-RAD-PAA-TREE, FR-RAD-CHECK

**Gestes :**
1. Note le nombre de cartes et leurs notes.
2. Clique de nouveau **« Lancer le scan »**, avec la même liste.
3. Déplie une carte qui a des questions.
4. Rouvre « Articles suggérés (N) » et survole les points de l'article.

**Tu dois voir :**
- un scan plus rapide : les suggestions Google et les questions PAA de moins d'un jour sont relues en base ;
- les mêmes cartes et les mêmes notes (en MOCK, le bac à sable renvoie les mêmes données) ;
- « PAA en cache » au-dessus des questions d'une carte ;
- toujours six points, le point « Radar » plein.

**C'est un bug si :**
- une note change alors que rien n'a changé ;
- « PAA en cache » manque au second scan d'une carte qui a des questions (en MOCK, sans question, rien à voir ici).

### RAD-14 — Envoyer la sélection au Capitaine
**Exigences :** FR-RAD-SEND-CAPTAIN ⚠

**Gestes :**
1. Vérifie qu'aucune carte n'est cochée, puis coche 2 cartes.
2. Clique **« Envoyer au Capitaine (2) »**.
3. Regarde les cartes du Capitaine, puis reviens au Radar.

**Tu dois voir :**
- sans case cochée, pas de bouton « Envoyer au Capitaine » ; « Envoyer au Capitaine (1) » dès la première case, puis « (2) » : les longues traînes cochées en RAD-12 ont disparu avec leur liste à la relance du scan (RAD-13), elles ne comptent plus ;
- l'onglet Capitaine s'ouvre ; les 2 mots-clés y sont étudiés (voile « Validation… »), puis affichés en cartes ;
- sous leur anneau, « Score Pertinence » (plus « Score KPI ») ; une carte arrivée du Radar affiche « — » jusqu'à la réouverture de l'article.

**C'est un bug si :**
- « Envoyer au Capitaine (N) » apparaît sans case cochée à l'écran, ou compte plus que les cases cochées ; plus de 2 mots-clés partent à l'étude ;
- un mot-clé coché manque au Capitaine, ou y arrive en double ;
- une carte du Capitaine affiche « Score KPI », ou deux notes.

**⚠ Défaut connu :** la provenance de chaque mot-clé (Radar, longue traîne, saisie) n'est pas enregistrée ; elle n'est affichée nulle part, donc ce défaut ne se voit pas à l'écran. Si une provenance apparaît quelque part, le défaut a peut-être disparu : note-le.

### RAD-15 — Retrouver l'exploration après un changement d'article et un rechargement
**Exigences :** FR-RAD-PERSIST ⚠, FR-RAD-DB-FIRST, FR-RAD-MARKET-COMPUTED-LIVE

**Gestes :**
1. Remets le tri au repos (⇅). Note les notes des cartes dans l'ordre, la note du thermomètre et le nombre d'appels de la pastille.
2. Choisis le pilier, puis rechoisis l'article enfant (l'onglet Radar est déjà ouvert). Clique l'onglet **Radar**.
3. Recharge la page (F5), rechoisis l'article, ouvre **Radar**. Puis, dans l'invite « Charger Radar » en bas, clique **« DB »**.
4. Compare « M » de « Suggestions IA Radar » aux anneaux, puis trie par « Score KPI ».

**Tu dois voir :**
- geste 2 : les cartes et la liste « N mots-clés à scanner » reviennent seules, sans clic et sans barre de scan ;
- geste 3 : dès l'ouverture, sans clic et sans barre de scan : la liste d'attente entière, les mêmes cartes, les mêmes notes, dans le même ordre, le même thermomètre ; « DB » n'ajoute ni carte ni doublon ; la pastille ne compte aucun appel en plus ;
- « M » égal à l'anneau, et le tri « Score KPI » suit les notes comme en RAD-8.

**C'est un bug si :**
- après F5, « Cartes radar (0) » ou « Aucun mot-clé en attente… » alors que l'article a été scanné ;
- une note diffère de celle d'avant, ou l'ordre change ;
- « M » et l'anneau ne concordent plus après le rechargement ;
- un scan repart (barre de progression).

**⚠ Défaut connu :** FR-RAD-PERSIST — les longues traînes ne sont pas réaffichées (rien à perdre en MOCK : voir RAD-R2), et un nouveau scan efface en base celles du précédent. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## En mode RÉEL (payant)

Passe le bouton en **RÉEL**. Trois précautions avant de commencer :
- **Le MOCK a laissé des traces relues en RÉEL** : la découverte sauvegardée (bandeau « Dernière analyse… »), les suggestions DataForSEO de la racine (gardées 24 h), les questions PAA des mots-clés scannés (gardées 1 jour) et les longues traînes simulées (gardées 7 jours pour les mêmes mots-clés). Prends donc une **autre racine** et des **mots-clés jamais scannés aujourd'hui**.
- **Chaque case cochée à l'unité dans Discovery lance, 5 s plus tard, une étude Capitaine payante.** Clique « Annuler » dans la notification si tu n'en veux pas, ou coche par « Tout ».
- **Aucun geste de ce module n'annonce son coût avant de partir.** Suis la dépense dans la pastille des coûts, en bas à gauche : dépliée, elle montre « Coûts API », la ligne « DataForSEO » marquée « PROD » (dépense / plafond sur 30 min) et une ligne par appel d'IA. Garde 3 ou 4 mots-clés au Radar : chacun coûte une page de résultats Google, plus une par question PAA.

Repasse en **MOCK** à la fin.

### DIS-R1 — Le vrai filtre de pertinence et la vraie courte-traîne
**Exigences :** FR-DIS-RELEVANCE-FILTER, FR-DIS-LONGTAIL-GENERATION ⚠, FR-DIS-SEND-TO-RADAR ⚠, FR-RAD-GENERATE
**Mode :** RÉEL — le coût ne s'affiche pas avant l'appel : suis-le dans la pastille des coûts.

**Gestes :**
1. Choisis un article dont la ligne de contexte montre une douleur d'au moins 10 caractères. Tape une racine jamais explorée et clique **« Découvrir »**. Attends la fin du filtre.
2. Décoche « Filtre de pertinence » et lis les mots-clés grisés. Recoche-le.
3. Clique **« Courte-traîne IA »** et regarde la ligne du filtre.
4. Dans la section Courte-traîne, repère un mot-clé **sans** badge « ×N » (s'il y en a un). Décoche tout le reste pour vider la barre du bas, puis coche ce seul mot-clé et clique « Annuler » dans la notification de pré-analyse.
5. Note le nombre de puces du Radar, puis clique **« Envoyer au Radar → »**.

**Tu dois voir :**
- « IA Claude » : une vingtaine de mots-clés courts (25 au plus), chacun avec sa raison, sans doublon ;
- mots-clés grisés : hors sujet, ou qu'une personne vivant la douleur de l'article ne taperait pas ;
- après « Courte-traîne IA » : une vingtaine de mots-clés courts, pensés pour les questions PAA et les suggestions de Google, puis une barre « Filtrage 1/2 · n/total » où « total » ne compte que les nouveaux mots-clés : les autres ne sont pas rejugés ;
- geste 5 : le Radar s'ouvre.

**C'est un bug si :**
- le filtre ne masque rien alors que des mots-clés sont clairement hors sujet ;
- la courte-traîne fait rejuger toute la liste (« total » égal au nombre total de mots-clés).

**⚠ Défaut connu :** un mot-clé coché seulement dans la section Courte-traîne n'est pas envoyé : la barre disait « 1 mot(s)-clé(s) sélectionné(s) », mais aucune puce n'arrive au Radar, et l'étape « Discovery » est quand même posée. L'outil ouvre aussi le Radar avant d'avoir enregistré la liste, sans vérifier l'enregistrement. Si la puce arrive, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-DIS-LONGTAIL-GENERATION — la courte-traîne générée avant « Découvrir » n'est pas filtrée et la ligne du filtre n'apparaît pas ; « Découvrir » l'efface ensuite. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-R1 — Les vraies questions PAA et leur écho avec le sujet
**Exigences :** FR-RAD-RESONANCE, FR-RAD-PAA-TREE, FR-RAD-SCAN-2PASS
**Mode :** RÉEL — le coût ne s'affiche pas avant l'appel : suis-le dans la pastille des coûts.

**Gestes :**
1. Au Radar, garde 3 ou 4 mots-clés jamais scannés aujourd'hui et clique **« Lancer le scan »**.
2. Déplie chaque carte ; compare le texte de ses questions au titre de l'article.
3. Relance le scan.

**Tu dois voir :**
- de vraies questions de Google, sur deux niveaux (« (n) », puis les sous-questions), souvent avec la réponse de Google ;
- « Exact » quand la question reprend les mots du titre tels quels ; « Match » quand elle en reprend les racines (un pluriel, « stratégies » pour « stratégie », « croissant » pour « croissance ») ; « Partiel exact » ou « Partiel » quand elle en reprend une partie ; « Hors sujet » sinon ;
- les petits mots (« le », « de », « pour »…) et les mots de moins de 3 lettres ne comptent pas ;
- « Sémantique » ou « Sem. partiel », avec un pourcentage, quand la proximité de sens a relevé le badge ;
- une bordure verte autour des questions « Exact » ;
- après le second scan : « PAA en cache » en tête des questions.

**C'est un bug si :**
- une question qui ne partage avec le titre que des petits mots (« de », « la », « pour ») est marquée « Exact », « Match » ou « Partiel » ;
- un simple pluriel du titre donne « Hors sujet ».

### RAD-R2 — Les vraies longues traînes, du choix à l'envoi au Capitaine
**Exigences :** FR-RAD-LONGTAIL-GENERATE ⚠, FR-RAD-LONGTAIL-UI ⚠, FR-RAD-LONGTAIL-REGENERATE ⚠, FR-RAD-SEND-CAPTAIN ⚠
**Mode :** RÉEL — le coût ne s'affiche pas avant l'appel : suis-le dans la pastille des coûts.

**Gestes :**
1. Après le scan de RAD-R1 (au moins 2 cartes, liste différente de celle du MOCK), clique **« ✨ Suggérer des combinaisons »**.
2. Décoche une suggestion pré-cochée, coche une autre, puis attends une seconde.
3. Clique **« ⟳ Régénérer »**.
4. Si une longue traîne cochée porte exactement le même mot-clé qu'une carte, coche cette carte ; sinon, coche 2 cartes. Lis **« Envoyer au Capitaine (N) »**, puis clique-le.
5. Reviens au Radar. Recharge (F5), rechoisis l'article, ouvre Radar et clique « DB » dans « Charger Radar ».

**Tu dois voir :**
- 10 suggestions au plus ; chaque ligne : une case, « N/10 » (vert à partir de 8, orange à 6 et 7, gris sinon), le mot-clé, sa justification, « Sources : » et les mots-clés d'origine ;
- les 5 mieux notées pré-cochées ; « Envoyer au Capitaine (N) » les compte déjà ;
- après la génération, le bouton devient **« ⟳ Régénérer »** ; avec les mêmes cartes, la même liste revient aussitôt (résultat gardé 7 jours, sans nouvel appel d'IA), et tes cases encore présentes restent cochées ;
- N compte chaque mot-clé une seule fois ; en cas de doublon, la carte l'emporte sur la longue traîne ;
- le Capitaine s'ouvre et étudie chaque mot-clé reçu (voile « Validation… »).

**C'est un bug si :**
- plus de 10 suggestions, ou une ligne sans note, justification ou source ;
- la régénération décoche une case encore présente dans la nouvelle liste ;
- N compte deux fois le même mot-clé.

**⚠ Défaut connu :** au rechargement, suggestions et cases cochées ne reviennent pas à l'écran : après le geste 5, la section repart sur « ✨ Suggérer des combinaisons ». Si elles reviennent, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** les suggestions enregistrées ne sont pas réaffichées, et un nouveau scan les efface de la base. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** la provenance (Radar, longue traîne, saisie) n'est pas enregistrée ; elle n'est affichée nulle part. Si elle apparaît quelque part, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-RAD-LONGTAIL-GENERATE — une réponse vide est enregistrée et resservie pendant 7 jours, sans bouton pour réessayer. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-R3 — Le niveau de l'article change la note, pas les données
**Exigences :** FR-RAD-MARKET-LEVEL-AWARE, FR-RAD-AUTOCOMPLETE-PER-KEYWORD ⚠
**Mode :** RÉEL — le coût ne s'affiche pas avant l'appel : suis-le dans la pastille des coûts.

**Gestes :**
1. Choisis un mot-clé scanné en RAD-R1 sur l'article intermédiaire. Note les indicateurs de sa carte et les lignes de l'info-bulle de son anneau.
2. Ajoute ce même mot-clé à la main au Radar du pilier (badge « PILIER ») et lance le scan.
3. Compare les deux cartes, puis la ligne « M » de « Suggestions IA Radar » sur chaque article.

**Tu dois voir :**
- les mêmes données brutes sur les deux cartes (vol, KD, CPC, PAA) ;
- des notes différentes quand une donnée tombe entre deux seuils : par exemple 500 recherches par mois valent « Volume … 100/100 » pour l'intermédiaire (seuil vert 200) et « 50/100 » pour le pilier (vert à partir de 1 000) ;
- sur chaque article, « M » égal à l'anneau.

**C'est un bug si :**
- les deux articles donnent exactement les mêmes lignes alors qu'une donnée est entre deux seuils ;
- « M » diffère de l'anneau sur l'un des deux articles.

**⚠ Défaut connu :** le nombre de suggestions Google est noté comme une position : sur le pilier, 7 suggestions ou plus donnent « Autocomplete … 0/100 », 1 à 3 donnent « 100/100 ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### RAD-R4 — Rouvrir ne coûte rien
**Exigences :** FR-RAD-PERSIST ⚠, FR-DIS-CACHE ⚠
**Mode :** RÉEL — le coût ne s'affiche pas avant l'appel : suis-le dans la pastille des coûts.

**Gestes :**
1. Déplie la pastille des coûts et note la dépense DataForSEO.
2. Recharge (F5), rechoisis l'article, ouvre Radar et clique « DB » dans « Charger Radar ».
3. Ouvre Discovery, efface puis retape la dernière lettre de la racine de DIS-R1, et clique **« Charger »** dans le bandeau.
4. Attends 15 secondes (la dépense se met à jour toutes les 15 s) et relis la pastille.

**Tu dois voir :**
- cartes, notes, thermomètre, découverte et analyse revenus ;
- la même dépense DataForSEO, et aucune ligne d'IA dans la pastille.

**C'est un bug si :**
- la dépense augmente ;
- une barre de scan ou un « Recherche... » apparaît.

**⚠ Défaut connu :** au Radar, les longues traînes ne sont pas réaffichées, et la liste d'attente peut revenir vide après un scan. Si tout revient, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** en Discovery, la section Courte-traîne ne revient pas avec « Charger », et une sauvegarde n'expire jamais. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## Hors recette

Toutes les exigences du périmètre se voient à l'écran, au moins en RÉEL : aucune n'est hors recette.

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
