---
title: Recette — Moteur, cadre commun
module: 03
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/05-moteur.md
---

# Module 03 — Moteur, cadre commun

**Durée :** ~60 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express de la recette manuelle fini (cocon « Recette <date> » : pilier rédigé et exporté, ses quatre verrous posés ; un article enfant « À rédiger », jamais ouvert au Moteur), le bouton sur **MOCK**, une connexion internet.

Ce module vérifie ce qui est commun aux sept onglets du Moteur : la liste des articles, le choix d'un article, les onglets et leurs groupes, les verrous doux, les six points de progression, le passage d'un onglet à l'autre, la barre « Résultats déjà calculés », le rechargement et le retour arrière. Il travaille surtout sur l'article enfant et ne modifie pas le pilier. À la fin, l'enfant a franchi Discovery, Radar, Capitaine, Lieutenants et Structure ; son Lexique reste à faire.

## Vérifications

### MOT-1 — Le Moteur s'ouvre sans article choisi
**Exigences :** FR-MOT-PHASES, FR-MOT-ARTICLE-SELECTION ⚠

**Gestes :**
1. Recharge la page d'accueil (F5), ouvre le cocon « Recette <date> », puis clique la carte **« Moteur »**.
2. Ne choisis aucun article. Survole un onglet de la barre du haut, puis clique dessus.
3. Clique le titre d'un groupe, par exemple « 2 Valider ».

**Tu dois voir :**
- le fil d'Ariane : Dashboard, le silo, « Recette <date> », Moteur ;
- dans la barre du haut, après « Moteur › », trois groupes numérotés dans cet ordre (titres en capitales) : « 1 Générer » (Discovery, Radar), « 2 Valider » (Capitaine, Lieutenants, Structure, Lexique), « 3 Finaliser » (Finalisation) ;
- tous les onglets estompés, avec un petit cadenas et l'infobulle « Sélectionnez un article ci-dessus » ;
- un clic sur un onglet ou sur un titre de groupe ne fait rien ;
- sous les listes, le message « Sélectionnez un article ci-dessus pour accéder au Moteur. » ;
- aucune barre « Résultats déjà calculés » en bas de l'écran ;
- en bas de page, « ← Retour au cocon ». Le bouton « Continuer vers Lieutenants → » y est aussi, alors qu'aucun onglet n'est affiché : un clic déplace la surbrillance en haut sans rien montrer. Note-le à part : c'est un écart signalé.

**C'est un bug si :**
- un groupe manque, change d'ordre, ou Structure n'est pas entre Lieutenants et Lexique ;
- un onglet affiche un contenu alors qu'aucun article n'est choisi.

**⚠ Défaut connu :** les résultats et les cases cochées de Discovery survivent au changement d'article : seul le mot-clé racine change (tu le verras en MOT-9). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-2 — Les trois blocs repliables et la liste des articles
**Exigences :** FR-MOT-CHECKS, FR-MOT-RECAP-LOCK-SYNC ⚠, FR-MOT-RECAP-PUBLISHED ⚠

**Gestes :**
1. Clique **« Contexte stratégique »**.
2. Clique **« Articles suggérés (N) »**.
3. Survole un à un les six petits points de la ligne du pilier.
4. Clique **« Articles publiés (N) »**.

**Tu dois voir :**
- « Contexte stratégique » s'ouvre sur Cible, Douleur, Angle, Promesse, CTA, avec les textes écrits au Cerveau. Un champ vide n'a pas de ligne ;
- ouvrir un bloc referme celui qui était ouvert : un seul bloc ouvert à la fois ;
- dans « Articles suggérés », les articles rangés sous un badge de niveau coloré (« PILIER », puis « INTERMÉDIAIRE », puis « SPÉCIALISÉ ») ;
- chaque ligne : le titre, six points en deux groupes (deux, puis quatre), puis le mot-clé ;
- les infobulles des points, dans l'ordre : « Discovery », « Radar », « Capitaine », « Lieutenants », « Structure », « Lexique » ;
- pour le pilier : les points Capitaine, Lieutenants et Structure pleins, Lexique plein si tu as retenu un terme au parcours express ; Discovery et Radar vides si personne n'y est passé pour lui. Son mot-clé en trait plein (Capitaine verrouillé) ;
- pour l'enfant : six points vides, et son mot-clé en pointillé, estompé (une simple suggestion) ;
- « Articles publiés » : un cadenas à côté du titre ; le pilier, rédigé et exporté, y figure avec un petit cadenas en bout de ligne. L'enfant, pas encore rédigé, n'y est pas ;
- aucun point pour la Finalisation.

**C'est un bug si :**
- un point est plein alors que l'étape n'a pas été franchie, ou vide alors qu'elle l'a été ;
- l'enfant figure dans « Articles publiés » ;
- le mot-clé du pilier est en pointillé alors que son Capitaine est verrouillé.

**⚠ Défaut connu :** la liste « Articles suggérés » reprend toutes les propositions de la stratégie du cocon, sans regarder leur phase : un article entré en rédaction, comme le pilier, figure dans les deux listes. La barre de la Rédaction range aussi les articles selon un statut « publié » calculé à l'écran, pas selon la phase donnée par le serveur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-RECAP-LOCK-SYNC — pour un article de « Articles publiés », l'aspect plein ou pointillé du mot-clé ne suit pas un verrouillage fait pendant la visite : il faut recharger la page. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-3 — Choisir, puis désélectionner un article
**Exigences :** FR-MOT-ARTICLE-SELECTION ⚠, FR-MOT-PHASES

**Gestes :**
1. Dans « Articles suggérés », clique le titre du pilier. Puis ouvre l'onglet **Discovery** et lis la ligne sous le champ « Mot-clé racine ».
2. Rouvre « Articles suggérés » et clique de nouveau le titre du pilier.
3. Ouvre « Articles publiés » et clique le pilier. Ouvre **Discovery**.
4. Rouvre « Articles publiés » et clique encore le pilier.

**Tu dois voir :**
- au premier clic : la liste se replie, les onglets deviennent cliquables, le message « Sélectionnez un article… » disparaît et la barre « Résultats déjà calculés » apparaît en bas ;
- le Moteur s'ouvre de lui-même sur **Lexique** : la Structure du pilier est validée, c'est son premier onglet utile. Il ne s'ouvre jamais sur Finalisation ;
- en rouvrant la liste, la ligne du pilier est surlignée ;
- Discovery affiche « Article : <titre> · Douleur : <douleur du pilier> » ;
- au second clic sur l'article choisi : il est désélectionné, les onglets redeviennent gris, le message revient, la barre du bas disparaît ;
- choisi depuis « Articles publiés », le pilier se comporte de la même façon : ouverture sur Lexique, et la même ligne « Article : … · Douleur : … » en Discovery.

**C'est un bug si :**
- le Moteur s'ouvre sur Finalisation ;
- un second clic sur l'article choisi ne le désélectionne pas ;
- la douleur disparaît de la ligne de Discovery quand le pilier est choisi depuis « Articles publiés » (écart repéré en écrivant cette recette).

**⚠ Défaut connu :** les résultats et les cases cochées de Discovery survivent au changement d'article : seul le mot-clé racine change. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-4 — Choisir un article ne lance rien de payant
**Exigences :** FR-MOT-NO-AUTO-ACTION, FR-MOT-EXPLORATIONS-HYDRATATION, FR-MOT-EXPLORATION-COUNTS, FR-MOT-PHASES

**Gestes :**
1. Choisis le pilier. Le Moteur s'ouvre sur Lexique : ne clique rien pendant 10 secondes.
2. Choisis l'enfant. Le Moteur s'ouvre sur Capitaine : ne clique rien pendant 10 secondes.
3. Regarde la barre « Résultats déjà calculés ».
4. Ouvre les onglets **Radar**, **Lieutenants**, **Structure** et **Finalisation** de l'enfant, sans cliquer dans les panneaux.

**Tu dois voir :**
- pilier, Lexique : ce qui est enregistré réapparaît, et aucune analyse ne démarre seule (pas de « Analyse IA en cours... ») ;
- enfant : le Moteur s'ouvre sur **Capitaine**, car aucune étape n'est franchie ;
- enfant, Capitaine : aucune étude ne démarre seule ; la liste reste vide, avec « Aucun mot-clé à valider pour cet article. » ;
- la barre du bas : quatre puces, Radar, Capitaine, Lieutenants, Lexique, chacune avec « DB 0 » et « C 0 ». Les zéros restent affichés, estompés ;
- Radar : « Mots-clés à scanner », le message « Aucun mot-clé en attente. Passe par l'onglet Discovery pour envoyer une sélection, … » et « Cartes radar (0) » ;
- Lieutenants : « Verrouillez votre Capitaine dans l'onglet précédent pour analyser la SERP. », et aucune proposition ;
- Structure : « Lecture de la structure des concurrents… », puis « Les concurrents n’ont pas encore été analysés : l’analyse partira avec « Générer la structure ». ». C'est une simple lecture, gratuite ;
- Finalisation : « Aucun lieutenant verrouillé. », « Aucune structure validée. », « Aucun terme validé. » ;
- une seule action payante est admise à l'ouverture du Capitaine : l'IA juge les questions « Autres questions posées » des cartes. Elle ne se voit presque pas.

**C'est un bug si :**
- une puce affiche un nombre non nul pour cet article jamais ouvert ;
- des propositions de Lieutenants, des termes de Lexique ou des mots-clés à scanner apparaissent sans que tu aies rien fait ;
- Radar, Lieutenants, Structure ou Finalisation lancent seuls une analyse (roue qui tourne, « Analyse … en cours ») ;
- le Capitaine étudie seul le mot-clé proposé (une carte « Validation en cours... » apparaît), ou le Lexique lance seul son extraction ou son analyse IA ;
- « Coûts API » gagne une ligne « Analyse IA capitaine » alors que tu n'as rien étudié.

### MOT-5 — Ouvrir n'importe quel onglet, dans n'importe quel ordre
**Exigences :** FR-MOT-FREE-NAV, FR-MOT-PHASES

**Gestes :**
1. Sur l'enfant, clique **Finalisation**, puis **Structure**, puis **Discovery**.
2. Clique le titre du groupe « 3 Finaliser », puis « 1 Générer », puis « 2 Valider ».
3. Dans Capitaine, tape `test onglet` dans « Tester un mot-clé capitaine… », sans appuyer sur Entrée. Va sur **Radar**, puis reviens sur **Capitaine**. Efface ensuite ce texte.
4. *(Facultatif, avec l'aide de Claude.)* Demande à Claude de passer le mot-clé du pilier au statut « validé » dans le pool de mots-clés du cocon. Recharge la page et choisis le pilier. Puis demande-lui de remettre le statut « suggéré ».

**Tu dois voir :**
- chaque onglet s'ouvre, même « en avance » sur la progression ;
- l'onglet ouvert est surligné en bleu, et son groupe est encadré ;
- un titre de groupe ouvre son premier onglet : Finalisation, Discovery, puis Capitaine ;
- le texte tapé au Capitaine est toujours là à ton retour : un onglet garde son état ;
- Discovery et Radar restent cliquables, pour l'enfant comme pour le pilier, même Capitaine verrouillé : explorer ne fige rien.

**C'est un bug si :**
- un onglet refuse de s'ouvrir alors qu'un article est choisi ;
- le Moteur change d'onglet sans que tu aies cliqué ;
- le contenu d'un onglet est perdu quand tu en changes.

### MOT-6 — Les écritures attendent les étapes précédentes
**Exigences :** FR-MOT-SOFT-GATING ⚠

**Gestes :**
1. Sur l'enfant, dont le Capitaine n'est pas verrouillé, ouvre **Lexique**.
2. Ouvre **Structure**, puis **Lieutenants**.
3. Ouvre **Finalisation**. Survole **« Aller à la Rédaction → »**, puis le bouton du bas **« Continuer vers la Rédaction → »**. Clique-les.
4. Choisis le pilier et ouvre **Finalisation**. Si ses quatre points de validation sont pleins (MOT-2), clique **« Continuer vers la Rédaction → »**. Reviens avec le bouton Précédent du navigateur.

**Tu dois voir :**
- Lexique : le bandeau « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. », et « Extraire le Lexique » grisé ;
- Structure : « Retenez d’abord au moins un lieutenant dans l’onglet Lieutenants : la structure se construit à partir d’eux. », et « Générer la structure » et « Valider la structure » grisés ;
- Lieutenants : « Verrouillez votre Capitaine dans l'onglet précédent pour analyser la SERP. », et « Analyser SERP » grisé ;
- Finalisation de l'enfant : le titre « ⏳ Préparation en cours », et la ligne « Étapes restantes : Capitaine à verrouiller, Lieutenants à verrouiller, Structure à valider, Lexique à valider » ;
- les deux boutons vers la Rédaction grisés, avec la même liste en infobulle ; un clic ne fait rien ;
- Finalisation du pilier : « ✅ Prêt pour la Rédaction » et les deux boutons actifs. « Continuer vers la Rédaction → » ouvre la Rédaction sur le pilier ;
- au retour par Précédent, le Moteur revient sans article choisi.

**C'est un bug si :**
- « Prêt pour la Rédaction » s'affiche alors qu'un verrou manque ;
- un bouton vers la Rédaction est actif pour l'enfant ;
- un bouton du Lexique agit alors que le bandeau est affiché. Par exemple, si « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » s'affiche, son bouton « Lancer l'analyse SERP (~$0.003 DataForSEO) » reste actif : écart repéré en écrivant cette recette.

**⚠ Défaut connu :** FR-MOT-SOFT-GATING — à l'onglet Lexique, Capitaine non verrouillé, « Lancer l'analyse SERP » reste actif malgré le bandeau : l'analyse payante part, et ses termes peuvent ensuite être retenus. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-7 — « Continuer vers … » nomme l'onglet suivant, sans jamais naviguer seul
**Exigences :** FR-MOT-PHASE-TRANSITION

**Gestes :**
1. Choisis l'enfant et ouvre **Discovery**, le premier onglet.
2. Clique le bouton du bas, puis, sur chaque onglet, de nouveau le bouton du bas, jusqu'à Finalisation.
3. Sur chaque onglet, repère le lien **« ← Retour au cocon »**. Clique-le à la fin.

**Tu dois voir :**
- dans l'ordre : « Continuer vers Radar → », « Continuer vers Capitaine → », « Continuer vers Lieutenants → », « Continuer vers Structure → », « Continuer vers Lexique → », « Continuer vers Finalisation → » ;
- sur Finalisation, « Continuer vers la Rédaction → » à la place, grisé pour l'enfant (règle des quatre verrous) ;
- chaque clic change d'onglet, rien d'autre ;
- « ← Retour au cocon » présent sur tous les onglets ; il ramène à la page du cocon.

**C'est un bug si :**
- un bouton nomme un autre onglet que le suivant dans la barre du haut ;
- le Moteur passe à l'onglet suivant sans clic.

### MOT-8 — Discovery, Radar, Capitaine : ce qui est coché passe à l'onglet suivant
**Exigences :** FR-MOT-CROSS-TAB-PAYLOAD, FR-MOT-CHECKS, FR-MOT-RAW-KPIS

**Gestes :**
1. Reviens au Moteur (carte **« Moteur »**) et choisis l'enfant. Ouvre **Discovery**.
2. « Mot-clé racine » est prérempli avec le mot-clé de l'enfant. Clique **« Découvrir »** et attends que « Recherche... » redevienne « Découvrir ».
3. Coche deux mots-clés, dans n'importe quelle section. Pour chacun, un encart « Validation Capitaine dans 5s » apparaît en bas : clique **« Annuler »** dans l'encart. Ce test automatique relève du module Discovery.
4. Clique **« Envoyer au Radar → »**.
5. Dans le Radar, clique **« Lancer le scan »** et attends les cartes.
6. Coche une carte, puis clique **« Envoyer au Capitaine (1) »**.
7. Dans le Capitaine, clique la carte reçue quand son étude est finie. Compare le volume du panneau « Capitaine » (« KPIs marché », « Volume ») avec le « vol » de la même carte au Radar.
8. Cherche, dans le Capitaine, un bouton d'envoi vers les Lieutenants.
9. Rouvre « Articles suggérés » et regarde les points de l'enfant.

**Tu dois voir :**
- en bas de Discovery, « 2 mot(s)-clé(s) sélectionné(s) » et « Envoyer au Radar → » ;
- après l'envoi, l'onglet Radar s'ouvre seul, avec « 2 mots-clés à scanner » et les deux mots-clés cochés ;
- aucune alarme à l'envoi ni au scan : Discovery et Radar n'ont pas de porte ;
- après « Envoyer au Capitaine (1) », l'onglet Capitaine s'ouvre seul et étudie la carte envoyée ;
- les points « Discovery » et « Radar » de l'enfant pleins ;
- chaque métrique est un nombre ou « — ». Dans la section « DataForSEO » de Discovery, un indicateur inconnu (« Vol: », « KD: », « CPC: ») n'est pas affiché du tout ;
- le même volume sur la carte Radar et dans le panneau du Capitaine, écrit différemment (par exemple « 6.6k » et « 6 600 rech/m ») ;
- un bouton d'envoi vers les Lieutenants dans le Capitaine. En écrivant cette recette, aucun n'existe en mode guidé : les racines passent par le verrouillage (voir MOT-13). Note-le.

**C'est un bug si :**
- un bouton « Envoyer au… » n'ouvre pas l'onglet suivant, ou l'ouvre vide ;
- le point Discovery ou Radar reste vide après l'envoi ou le scan ;
- un « 0 », « 0 € » ou « 0 % » s'affiche pour une valeur inconnue ;
- deux écrans donnent deux valeurs différentes pour le même mot-clé.

### MOT-9 — Changer d'article : rien ne passe de l'un à l'autre, sauf Discovery
**Exigences :** FR-MOT-ARTICLE-SELECTION ⚠, FR-MOT-CROSS-TAB-PAYLOAD, FR-MOT-DISPLAY-FROM-STORE ⚠, FR-MOT-LOCK-DERIVED

**Gestes :**
1. Sans recharger la page, choisis le pilier.
2. Ouvre **Radar**, puis **Capitaine**, puis **Lexique**.
3. Ouvre **Discovery**. Ne clique pas « Envoyer au Radar → ». Décoche les cases encore cochées.
4. Rechoisis l'enfant. Ouvre **Capitaine**, puis **Lexique**.

**Tu dois voir :**
- pilier, Radar : « Aucun mot-clé en attente… » et « Cartes radar (0) ». Rien de l'enfant ;
- pilier, Capitaine : ses propres candidats. Son Capitaine porte le cadenas fermé (infobulle « Déverrouiller »). Aucune carte de l'enfant ;
- pilier, Lexique : pas de bandeau « Verrouillez d'abord… ». L'en-tête montre le Capitaine du pilier et son lieutenant ;
- à aucun moment le cadenas, le bandeau ou le mot-clé d'un article ne s'affiche pour l'autre, même une fraction de seconde ;
- pilier, Discovery : le mot-clé racine du pilier, et une liste vide ;
- retour sur l'enfant : ses propres cartes, cadenas ouverts, et le bandeau « Verrouillez d'abord… » au Lexique.

**C'est un bug si :**
- une carte, un mot-clé, un lieutenant ou un résultat de l'article précédent reste affiché ;
- un cadenas montre un état qui n'est pas celui de l'article choisi.

**⚠ Défaut connu :** les résultats et les cases cochées de Discovery survivent au changement d'article : seul le mot-clé racine change. Des mots-clés cochés pour l'enfant pourraient donc partir au Radar du pilier. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** après un déverrouillage, l'en-tête du Lexique affiche un vide au lieu de « — » (tu le verras en MOT-14). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-10 — Rechargement : le Radar revient, sans panier ; le bouton « Vider le cache »
**Exigences :** FR-MOT-BASKET-DEPRECATED ⚠, FR-MOT-EXTERNAL-CACHE-CLEAR ⚠

**Gestes :**
1. Choisis le pilier. Regarde l'en-tête de la barre « Résultats déjà calculés ».
2. Recharge la page (F5). Choisis l'enfant et ouvre **Radar**.
3. Dans la barre du bas, survole **« Vider le cache »**, puis clique-le.
4. Choisis le pilier, puis de nouveau l'enfant. Rouvre la liste, puis le Capitaine.

**Tu dois voir :**
- Radar de l'enfant, après rechargement : « 2 mots-clés à scanner », avec les deux mots-clés envoyés depuis Discovery, et les cartes du dernier scan ;
- nulle part un panier, une pastille ou un compteur de « mots-clés en attente » hors de l'onglet Radar ;
- « Vider le cache » visible dès qu'un article est choisi, pilier compris. Infobulle : « Vide le cache externe (autocomplete, PAA, SERP, validate) pour cet article. La base de données n'est pas affectée. » ;
- après le clic, rien ne disparaît : les candidats du Capitaine, les points de progression et les compteurs « DB » restent les mêmes.

**C'est un bug si :**
- les mots-clés envoyés au Radar ont disparu après le rechargement ;
- un clic sur « Vider le cache » efface une exploration, un verrou ou un point.

**⚠ Défaut connu :** le bouton n'apparaît que si un scan Radar non sauvegardé est en mémoire, et la purge vise des types de cache que l'outil n'écrit plus : aucun nouvel appel n'est forcé. En pratique, il apparaît dès qu'un scan Radar est connu pour l'article, même enregistré (la puce Radar affiche alors « C 1 »), et jamais pour le pilier, qui n'a pas de Radar. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-BASKET-DEPRECATED — un lieutenant ajouté depuis « 💡 Suggestions pour vos Lieutenants » porte la raison « Proposé depuis votre panier », un panier qui n'existe plus. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-11 — Cannibalisation : deux articles sur le même Capitaine
**Exigences :** FR-MOT-CANNIBALIZATION ⚠, FR-MOT-RECAP-LOCK-SYNC ⚠

**Gestes :**
1. Note le mot-clé Capitaine du pilier : sur sa ligne dans la liste, ou dans le bloc « Capitaine » de son onglet Finalisation.
2. Choisis l'enfant, onglet **Capitaine**. Tape ce mot-clé dans « Tester un mot-clé capitaine… », appuie sur Entrée et attends la carte.
3. Clique le cadenas de cette carte (infobulle « Verrouiller »). Si l'alarme « Avant de verrouiller le capitaine » s'ouvre :
   - 🟠 : coche « J’ai lu », puis clique « J’ai lu, je continue » ;
   - 🔴 : choisis une catégorie dans « Pourquoi passer outre ? », écris au moins 20 caractères dans « Votre raison », puis clique « Je prends la responsabilité et je continue ».
4. Rouvre « Articles suggérés ». Survole l'icône d'alerte orange.
5. Regarde les cartes du Capitaine, puis celles du Radar.
6. Au Capitaine, clique de nouveau le cadenas (infobulle « Déverrouiller »). Rouvre la liste.

**Tu dois voir :**
- dans la seconde qui suit le verrouillage : le mot-clé de l'enfant passe en trait plein et devient celui du pilier ;
- une icône d'alerte orange sur la ligne de l'enfant et sur celle du pilier, avec l'infobulle « Cannibalisation : un autre article utilise le même capitaine » ;
- attendu : l'alerte nomme l'article concurrent ;
- attendu : un badge sur la carte du Capitaine (et sur celle du Radar), qui nomme l'article concurrent ;
- après le déverrouillage : l'alerte disparaît des deux lignes, et le mot-clé de l'enfant redevient une suggestion en pointillé.

**C'est un bug si :**
- l'alerte n'apparaît pas alors que les deux articles ont le même Capitaine ;
- elle reste après le déverrouillage ;
- l'aspect du mot-clé ne change qu'après un rechargement.

**⚠ Défaut connu :** l'alerte n'existe que sur les lignes de la barre des articles, sans nommer l'article concurrent ; les cartes du Radar et du Capitaine n'ont pas de badge. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-RECAP-LOCK-SYNC — pour un article de « Articles publiés », l'aspect plein ou pointillé du mot-clé ne suit pas un verrouillage fait pendant la visite : il faut recharger la page. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-12 — Verrouiller le Capitaine : tout suit, sans rechargement
**Exigences :** FR-MOT-CHECKS, FR-MOT-RECAP-LOCK-SYNC ⚠, FR-MOT-DISPLAY-FROM-STORE ⚠, FR-MOT-SOFT-GATING ⚠, FR-MOT-EXPLORATION-COUNTS, FR-MOT-CACHE-PANEL-COUNT ⚠

**Gestes :**
1. Au Capitaine de l'enfant, verrouille cette fois son mot-clé suggéré (la carte étudiée à l'ouverture, en MOT-4). Si elle n'est plus dans la liste, retape-le dans « Tester un mot-clé capitaine… ». Réponds à l'alarme comme en MOT-11.
2. Rouvre « Articles suggérés ».
3. Survole la puce Capitaine de la barre du bas.
4. Ouvre **Lexique**, puis **Lieutenants**, puis **Finalisation**.
5. Rouvre la liste : clique l'enfant pour le désélectionner, puis clique-le de nouveau.

**Tu dois voir :**
- dans la seconde : le point « Capitaine » de l'enfant plein, et son mot-clé en trait plein, égal au Capitaine verrouillé ;
- puce Capitaine : « DB n », où n compte tous les mots-clés testés pour l'enfant, verrouillés ou non (au moins 3 ici). Infobulle : « n mots-clés testés — verrouillé : <mot-clé> » ;
- Lexique : le bandeau « Verrouillez d'abord le Capitaine… » a disparu, sans rechargement. L'en-tête affiche le Capitaine. « Extraire le Lexique » est actif ; ou, si les pages du mot-clé n'ont pas encore été lues, « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » s'affiche avec son bouton ;
- Lieutenants : le message « Verrouillez votre Capitaine… » a disparu, et « Analyser SERP » est actif ;
- Finalisation : « Capitaine à verrouiller » a disparu des étapes restantes ; le bloc « Capitaine » montre le mot-clé ;
- après le nouveau choix de l'enfant : le Moteur s'ouvre sur **Lieutenants**, son premier onglet utile.

**C'est un bug si :**
- un de ces affichages ne se met à jour qu'après un rechargement ;
- la puce Capitaine compte 1 ou 0 alors que plusieurs mots-clés ont été testés.

**⚠ Défaut connu :** après un déverrouillage, l'en-tête du Lexique affiche un vide au lieu de « — » (tu le verras en MOT-14). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-RECAP-LOCK-SYNC — pour un article de « Articles publiés », l'aspect plein ou pointillé du mot-clé ne suit pas un verrouillage fait pendant la visite : il faut recharger la page. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-SOFT-GATING — à l'onglet Lexique, Capitaine non verrouillé, « Lancer l'analyse SERP » reste actif malgré le bandeau : l'analyse payante part, et ses termes peuvent ensuite être retenus. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-CACHE-PANEL-COUNT — la puce Radar affiche « C 1 » dès qu'un scan est connu, même enregistré, et le bouton « C 1 » de l'invite ne recharge rien. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-13 — Lieutenants : le seuil dépend du niveau, l'étape suit les cases
**Exigences :** FR-MOT-WORKFLOW-GATING-DUAL, FR-MOT-CHECKS, FR-MOT-CROSS-TAB-PAYLOAD, FR-MOT-MODE-BIMODAL ⚠, FR-CER-AIGUILLAGE

**Gestes :**
1. Onglet **Lieutenants** de l'enfant : clique **« Analyser SERP »** et attends les propositions.
2. Coche **une seule** proposition. Rouvre la liste des articles.
3. Coche une **deuxième** proposition. Rouvre la liste.
4. Ouvre **Structure**, puis **Lexique**.

**Tu dois voir :**
- l'analyse part du Capitaine verrouillé : le premier onglet de résultats porte son mot-clé. En MOCK, les propositions viennent des questions « Autres questions » reçues (factices en MOCK), puis du capitaine (« prix … », « … avis », « comment choisir … ») ;
- le badge de niveau « Intermédiaire », en toutes lettres (affiché en capitales), à côté de « Lieutenants proposés par l'IA » ;
- avec une seule case : le bandeau « Étape non validée. 1 lieutenant pour un article Intermédiaire : le minimum conseillé est 2. », avec « Voir pourquoi / décider ». Le point « Lieutenants » reste vide ;
- avec deux cases : le bandeau disparaît et le point « Lieutenants » se remplit ;
- le seuil suit le niveau : le pilier demandait 3 lieutenants au parcours express (« … pour un article Pilier : le minimum conseillé est 3. ») ;
- Structure : les deux lieutenants retenus en pastilles ; Lexique : les deux lieutenants dans l'en-tête, à côté du Capitaine.

**C'est un bug si :**
- le point « Lieutenants » se remplit avec une seule case cochée ;
- le bandeau reste affiché avec deux cases ;
- les lieutenants retenus manquent dans la Structure ou le Lexique ;
- le badge de niveau montre le code (« intermediaire »).

**⚠ Défaut connu :** le panneau Lexique n'a pas de mode libre, et aucun écran n'utilise le mode libre : seul le mode guidé d'un article se vérifie ici. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-14 — Déverrouiller le Capitaine retire aussi « Structure validée »
**Exigences :** FR-MOT-CHECKS, FR-MOT-RECAP-LOCK-SYNC ⚠, FR-MOT-DISPLAY-FROM-STORE ⚠, FR-MOT-LOCK-DERIVED

**Gestes :**
1. Onglet **Structure** : clique **« Générer la structure »**, puis **« Valider la structure »**. Si l'alarme « Avant de valider la structure » s'ouvre, réponds-y comme en MOT-11.
2. Rouvre la liste des articles.
3. Onglet **Capitaine** : clique le cadenas de la carte verrouillée (infobulle « Déverrouiller »).
4. Dans la fenêtre qui s'ouvre, clique à côté : elle se ferme. Recommence, puis clique **« Les garder »**.
5. Rouvre la liste. Ouvre **Lexique**, **Structure**, puis **Finalisation**.
6. Reverrouille le même mot-clé au Capitaine. Rouvre la liste.

**Tu dois voir :**
- après la validation : « ✅ Structure validée : elle sert de sommaire à la rédaction. », et le point « Structure » plein ;
- la fenêtre « Déverrouiller le Capitaine ? » : « Vous avez 2 lieutenants verrouillés pour « … ». », et deux boutons, « Les garder » et « Tout réinitialiser ». Un clic à côté (ou Échap) annule sans rien changer ;
- après « Les garder », dans la seconde : les points « Capitaine » et « Structure » vides, le point « Lieutenants » toujours plein, et le mot-clé de l'enfant redevenu une suggestion en pointillé ;
- Lexique : le bandeau « Verrouillez d'abord le Capitaine… » revient, et l'en-tête affiche « — » à la place du Capitaine ;
- Structure : plus de « ✅ Structure validée… » ; Finalisation : « Capitaine à verrouiller » et « Structure à valider » de nouveau dans les étapes restantes ;
- après le reverrouillage : le point « Capitaine » plein, mais « Structure » vide jusqu'à une nouvelle validation (faite en MOT-15).

**C'est un bug si :**
- « Structure » reste plein après le déverrouillage ;
- le point « Lieutenants » se vide alors que tu as choisi « Les garder » ;
- un écran montre encore le Capitaine comme verrouillé après le déverrouillage.

**⚠ Défaut connu :** après un déverrouillage, l'en-tête du Lexique affiche un vide au lieu de « — ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-RECAP-LOCK-SYNC — pour un article de « Articles publiés », l'aspect plein ou pointillé du mot-clé ne suit pas un verrouillage fait pendant la visite : il faut recharger la page. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-15 — Plus aucun lieutenant, puis rechargement : l'étape se corrige seule
**Exigences :** FR-MOT-WORKFLOW-GATING-DUAL, FR-MOT-CHECK-RECONCILIATION, FR-MOT-CHECKS, FR-MOT-EXPLORATIONS-HYDRATATION, FR-MOT-PHASES

**Gestes :**
1. Onglet **Lieutenants** : décoche les deux lieutenants. Rouvre la liste des articles.
2. Recoche **une seule** proposition. Le bandeau « Étape non validée… » revient.
3. Recharge la page (F5), puis choisis l'enfant.
4. Regarde les Lieutenants, puis le Capitaine.
5. Aux Lieutenants, coche une deuxième proposition. Onglet **Structure** : clique **« Valider la structure »**. Si la structure ne reprend plus tes deux lieutenants, clique d'abord **« Régénérer la structure »**.
6. Sans recharger, clique l'enfant dans la liste pour le désélectionner, puis rechoisis-le. Recommence en passant par un autre article.

**Tu dois voir :**
- tout décoché : les points « Lieutenants » et « Structure » vides ;
- après le rechargement : le Moteur s'ouvre sur **Lieutenants** (Capitaine verrouillé, Lieutenants non accordés) ;
- toutes les propositions reviennent, cochées ou non, avec « Autres candidats (1) » ; la case cochée l'est toujours ;
- le bandeau « Étape non validée. 1 lieutenant pour un article Intermédiaire : le minimum conseillé est 2. » revient de lui-même : l'outil a redemandé l'étape à sa porte en rouvrant l'onglet ;
- au Capitaine, tous les mots-clés testés reviennent, cadenas ouverts, sauf celui du Capitaine verrouillé ;
- avec la deuxième case : le point « Lieutenants » plein ; après la validation, le point « Structure » plein ;
- au rechoix (geste 6) : « Lecture des données de l’article… » un instant, puis ouverture sur **Lexique** ; les points « Lieutenants » et « Structure » restent pleins, sans clignoter, et le compteur dit « 2 / N sélectionnés » (N = propositions), jamais « 2 / 0 ».

**C'est un bug si :**
- le point « Lieutenants » reste plein alors qu'aucun lieutenant n'est retenu ;
- après le rechargement, des propositions ou des candidats du Capitaine ont disparu ;
- le bandeau ne revient pas alors qu'un seul lieutenant est retenu ;
- rechoisir l'enfant vide le point « Structure » (l'étape est retirée en base) ou fait clignoter un point : choisir un article ne fait que relire (recette du 2026-09-30, F4).

### MOT-16 — La barre « Résultats déjà calculés » et l'invite « Charger »
**Exigences :** FR-MOT-EXPLORATION-COUNTS, FR-MOT-CACHE-PANEL-COUNT ⚠, FR-MOT-EXPLORATIONS-HYDRATATION

**Gestes :**
1. Sur l'enfant, survole les quatre puces de la barre du bas.
2. Ouvre **Capitaine**. À droite de la barre, l'invite « Charger Capitaine » s'affiche : clique son bouton « DB n ».
3. Clique la croix « × » de l'invite. Ouvre un autre onglet, puis reviens au Capitaine.
4. Choisis le pilier. Survole de nouveau les puces.

**Tu dois voir :**
- Radar : « DB » compte les mots-clés en attente plus les cartes scannées ; infobulle « Score N/100 » ;
- Capitaine : « DB » compte tous les mots-clés testés, verrouillé compris ; infobulle « n mots-clés testés — verrouillé : … » ;
- Lieutenants : « DB » compte toutes les propositions enregistrées ; infobulle « n propositions en base · 2 verrouillés » ;
- Lexique : le nombre d'extractions ;
- après « DB n » : aucun doublon dans la liste du Capitaine ;
- la croix ferme l'invite ; elle revient au changement d'onglet ;
- pilier : les puces passent aussitôt à ses propres chiffres ; Lieutenants « … · 1 verrouillé » ; Lexique « n extractions · k termes validés » si un terme est retenu ;
- les compteurs se relisent au changement d'article et après chaque étape, pas après chaque test d'un mot-clé.

**C'est un bug si :**
- un compteur affiche 0 alors que l'onglet montre des données enregistrées ;
- la puce Capitaine ne compte que le mot-clé verrouillé ;
- « Charger » crée des doublons ;
- les chiffres restent ceux de l'article précédent.

**⚠ Défaut connu :** FR-MOT-CACHE-PANEL-COUNT — la puce Radar affiche « C 1 » dès qu'un scan est connu, même enregistré, et le bouton « C 1 » de l'invite ne recharge rien. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-17 — Rouvrir un article déjà travaillé : ce qui repart seul, ce qui est resservi
**Exigences :** FR-MOT-PHASES, FR-MOT-NO-AUTO-ACTION, FR-MOT-CACHE-CASCADE ⚠

**Gestes :**
1. Recharge la page (F5). Choisis l'enfant, puis ne clique rien pendant 10 secondes.
2. Onglet **Lieutenants** : clique **« Analyser SERP »**.
3. Onglet **Radar** : clique **« Lancer le scan »**. Déplie ensuite une carte avec sa petite flèche ▶.

**Tu dois voir :**
- le Moteur s'ouvre sur **Lexique** (Structure validée) ;
- Lexique : rien ne se lance seul, ni « Extraction en cours... », ni « Analyse IA en cours... » ;
- Lieutenants : l'analyse finit vite, et la ligne qui compte les concurrents porte « (cache) » : les pages lues en MOT-13 sont resservies, pas relues. Les lieutenants retenus restent cochés ;
- Radar : si la carte dépliée a des questions, elles portent « PAA en cache ».

**C'est un bug si :**
- « (cache) » manque pour un mot-clé analysé quelques minutes plus tôt ;
- la nouvelle analyse décoche les lieutenants retenus.

**⚠ Défaut connu :** les appels d'IA de Discovery (génération, filtre de pertinence, analyse) ne consultent aucun cache ; seul le rechargement d'une découverte sauvegardée évite de les refaire ; un mot-clé sans difficulté ni coût par clic est remesuré, et repayé, à chaque étude. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### MOT-18 — Les mots : on « scanne » un mot-clé, on « valide » une douleur
**Exigences :** FR-API-VOCABULAIRE-SCAN ⚠

**Gestes :**
1. Au Capitaine de l'enfant, tape un nouveau mot-clé dans « Tester un mot-clé capitaine… », puis clique **« Analyser »**. Lis la carte pendant son étude.
2. Repense aux libellés vus en MOT-4 (liste vide du Capitaine) et en MOT-8 (encart de Discovery).

**Tu dois voir :**
- l'étude d'un mot-clé candidat appelée « scan » (ou « scanner ») partout ;
- le mot « valider » réservé à la douleur, au Cerveau.

**C'est un bug si :**
- un libellé parle de « valider » ou de « validation » pour l'étude d'un mot-clé. En écrivant cette recette, trois le font : « Validation en cours... » (carte du Capitaine pendant l'étude), « Aucun mot-clé à valider pour cet article. » (liste vide) et « Validation Capitaine dans 5s » (encart de Discovery).

**⚠ Défaut connu :** FR-API-VOCABULAIRE-SCAN — l'étude d'un mot-clé s'appelle encore « validation » à l'écran : « Aucun mot-clé à valider pour cet article. », « Validation en cours... », « Validation Capitaine dans Ns », « KPIs insuffisants pour valider ce mot-clé. ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## En mode RÉEL (payant)

Passe le bouton en **RÉEL** au début de chaque vérification, et repasse-le en **MOCK** à la fin.

### MOT-R1 — Une métrique inconnue s'affiche « — », pas « 0 »
**Exigences :** FR-MOT-RAW-KPIS

**Mode :** RÉEL (payant)
**Gestes :**
1. Choisis l'enfant. Au Capitaine, tape `zqxw plomberie kvj`, puis appuie sur Entrée. Cette étude coûte quelques millièmes de dollar (DataForSEO, puis l'avis de Claude).
2. Quand l'étude est finie, lis la ligne « vol · KD · CPC · PAA » de la carte. Clique la carte et lis « KPIs marché ».
3. Clique le cadenas de la carte. Lis l'alarme « Avant de verrouiller le capitaine », puis clique **« Revenir corriger »**.

**Tu dois voir :**
- si DataForSEO n'a aucune donnée : « — » pour le volume, la difficulté et le coût par clic, et, dans l'alarme, 🔴 « Aucun volume de recherche mesuré pour « zqxw plomberie kvj ». » ;
- s'il mesure vraiment zéro : « 0 », et 🔴 « « zqxw plomberie kvj » : 0 recherche par mois selon DataForSEO. » ;
- le Capitaine verrouillé de l'enfant ne change pas. Le mot-clé testé reste dans la liste des candidats : c'est sans conséquence.

**C'est un bug si :**
- l'écran et l'alarme se contredisent : « 0 » affiché avec « Aucun volume de recherche mesuré », ou « — » avec « 0 recherche par mois » ;
- « 0 € » ou « 0 % » apparaît pour une valeur inconnue.

### MOT-R2 — La douleur de l'article et la stratégie du cocon nourrissent l'IA
**Exigences :** FR-MOT-PAINPOINT-INJECTION ⚠, FR-MOT-STRATEGY-INJECTION ⚠

**Mode :** RÉEL (payant)
**Gestes :**
1. En MOCK encore, choisis l'enfant. Ouvre **Discovery** et note la douleur de la ligne « Article : … · Douleur : … ». Ouvre « Contexte stratégique » et note la cible et l'angle du cocon.
2. Passe en RÉEL. Au Capitaine, clique la carte verrouillée, ouvre « Avis expert IA », clique **« Régénérer »** et confirme (« Régénérer l'avis expert IA ? Cela consommera un appel Claude. »).
3. Aux Lieutenants, clique **« Analyser SERP »**. Puis, dans « Suggestions IA Lieutenants », clique **« Régénérer les suggestions »**.
4. Repasse en MOCK.

**Tu dois voir :**
- l'avis du Capitaine parle du problème décrit dans la douleur de l'article ;
- les raisons des nouvelles propositions de Lieutenants parlent de cette douleur, et reprennent la cible ou l'angle du « Contexte stratégique » ;
- aucune erreur, et les deux lieutenants retenus restent cochés.

**C'est un bug si :**
- l'avis ou les propositions ignorent tout de la douleur de l'article ;
- les propositions de Lieutenants ignorent tout de la cible et de l'angle du cocon.

**⚠ Défaut connu :** l'avis IA sur un candidat Capitaine et tout l'onglet Discovery travaillent sans la stratégie du cocon : l'avis du Capitaine peut donc ignorer la cible et l'angle. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-MOT-PAINPOINT-INJECTION — un article choisi dans « Articles publiés » arrive sans sa douleur : Discovery ne l'affiche ni ne l'utilise, et le Score Pertinence du Capitaine est calculé sans elle. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## Hors recette

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
| FR-MOT-CHECKS-CONSTANTS | Le nom interne des étapes et le refus d'un nom inventé ne se voient pas : aucun geste de l'écran n'envoie un nom d'étape choisi par l'utilisateur. Le test qui refuse un nom écrit à la main vit dans le code, et les anciennes valeurs relues n'ont pas d'affichage propre. |
