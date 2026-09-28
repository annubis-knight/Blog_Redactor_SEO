---
title: Recette — Lieutenants, Structure, Lexique, Finalisation
module: 06
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md
  - spec/09-lieutenants.md
  - spec/10-structure.md
  - spec/11-lexique.md
  - spec/12-finalisation.md
---

# Module 06 — Lieutenants, Structure, Lexique, Finalisation

**Durée :** ~50 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express fini (cocon « Recette <date> » : pilier rédigé et publié avec sa dérogation, un article enfant) ; le bouton sur **MOCK** ; une connexion internet (tu la couperas une minute en LIE-2).

Ce module vérifie les onglets Lieutenants, Structure, Lexique et Finalisation du Moteur. Il travaille sur un **nouvel enfant**, créé en LIE-1 pour partir d'un article vierge, même si d'autres modules ont déjà fait avancer l'enfant du parcours express. Il commence par le Lexique, pour prouver qu'il marche sans les Lieutenants ; il ne fait que relire le pilier, sans le modifier.

## Vérifications

### LIE-1 — Sans capitaine verrouillé, l'onglet Lieutenants attend
**Exigences :** FR-LIE-SERP-ANALYZE

**Gestes :**
1. Crée le nouvel enfant. Page du cocon → carte **« Cerveau »** → étape « Articles ». Dans « Construire le cocon », sous une section du pilier qui n'a pas encore d'article, clique **« Créer l'article de cette section »**. Choisis le **premier** mot-clé mesuré de la liste (la formulation la plus large), puis clique **« Créer l'article »**.
2. Page du cocon → carte **« Moteur »** → ouvre « Articles suggérés » et clique le titre du nouvel enfant.
3. Dans le groupe « 2 Valider », clique **Lieutenants**.

**Tu dois voir :**
- « Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP. » ;
- le curseur « Resultats SERP : 10 » et **« Analyser SERP »** grisés ;
- aucune carte, aucun bandeau, aucune analyse qui démarre.

**C'est un bug si :**
- « Analyser SERP » est cliquable ;
- une analyse part toute seule.

### HN-1 — Sans lieutenant retenu, pas de structure
**Exigences :** FR-HN-TAB ⚠

**Gestes :**
1. Clique **Structure**.
2. Survole **« Générer la structure »**, puis **« Valider la structure »**.

**Tu dois voir :**
- « Structure de l’article » et son aide, qui finit par « L’introduction et la conclusion s’ajoutent d’elles-mêmes. » ;
- « Retenez d’abord au moins un lieutenant dans l’onglet Lieutenants : la structure se construit à partir d’eux. » ;
- dans la section « Structure Hn recommandée (IA) » : « Aucune structure pour cet article. Retenez d’abord au moins un lieutenant dans l’onglet Lieutenants. » ;
- « Générer la structure » grisé, infobulle « Retenez au moins un lieutenant dans l’onglet Lieutenants pour générer » ;
- « Valider la structure » grisé, infobulle « Générez d’abord une structure » ;
- « Les concurrents n’ont pas encore été analysés : l’analyse partira avec « Générer la structure ». » : le mot-clé du nouvel enfant n'a jamais été analysé, et ouvrir l'onglet ne lance rien.

**C'est un bug si :**
- un des deux boutons est actif ;
- une analyse part à l'ouverture de l'onglet.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit (tu le verras en HN-8). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LEX-1 — Sans capitaine verrouillé, le Lexique attend
**Exigences :** FR-LEX-PRECHECK-SERP

**Gestes :**
1. Clique **Lexique**. Ne clique rien d'autre.

**Tu dois voir :**
- en tête, le mot-clé de l'article et son type ;
- « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. » ;
- à la place du bouton d'extraction : « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » et « Lancer l'analyse SERP (~$0.003 DataForSEO) ». N'y touche pas encore. (Si ce mot-clé avait déjà été analysé ailleurs, tu vois plutôt « Extraire le Lexique », grisé.) ;
- aucune liste de termes, aucun « Analyse IA en cours... ».

**C'est un bug si :**
- une extraction ou une analyse de l'IA démarre sans clic ;
- une analyse payante part à l'ouverture de l'onglet.

### FIN-1 — Le récapitulatif vide dit ce qui manque
**Exigences :** FR-FIN-RECAP, FR-FIN-CHECK, FR-FIN-LINK-REDACTION

**Gestes :**
1. Dans le groupe « 3 Finaliser », clique **Finalisation**.
2. Replie puis déplie chaque section en cliquant son titre.
3. Survole **« Aller à la Rédaction → »**, puis, en bas de page, **« Continuer vers la Rédaction → »**. Clique-les.

**Tu dois voir :**
- « ⏳ Préparation en cours », puis « Récapitulatif des décisions validées pour <titre du nouvel enfant>. » ;
- « Étapes restantes : Capitaine à verrouiller, Lieutenants à verrouiller, Structure à valider, Lexique à valider » ;
- quatre sections ouvertes : « Capitaine » (le mot-clé enregistré, ou « — »), « Lieutenants (0) » avec « Aucun lieutenant verrouillé. », « Structure (0 H2) » avec « Aucune structure validée. », « Lexique (0 termes) » avec « Aucun terme validé. » ;
- les deux boutons grisés, avec la même infobulle que la ligne « Étapes restantes » ; un clic ne fait rien ;
- rien d'autre de cliquable que les titres des sections et ces deux boutons.

**C'est un bug si :**
- l'en-tête dit « ✅ Prêt pour la Rédaction » ;
- un des deux boutons est actif, ou leurs infobulles diffèrent ;
- une section vide disparaît au lieu d'afficher son message.

> **Repères pour la suite.**
> - *Étapes accordées* : la ligne « Étapes restantes » de cet onglet, ou les petits points de l'article dans « Articles suggérés » (infobulles « Capitaine », « Lieutenants », « Structure », « Lexique » ; plein = accordé).
> - *Recharger* : F5, puis, si besoin, rouvre le nouvel enfant dans « Articles suggérés » et l'onglet indiqué. Si une invite de chargement apparaît en bas avec un bouton « DB », clique-le.
> - *Coûts API* : la pastille en bas à gauche de l'écran (un montant · « N appels ») s'ouvre sur le panneau « Coûts API », qui liste aussi les messages de l'outil.

### LEX-2 — Le Lexique marche sans les Lieutenants et annonce l'analyse payante
**Exigences :** FR-LEX-PRECHECK-SERP, FR-LEX-SCRAPE-DEDIE

**Gestes :**
1. Onglet **Capitaine** : tape le mot-clé du nouvel enfant dans « Tester un mot-clé capitaine… », appuie sur Entrée, attends la fin de « Validation… », puis clique le cadenas de la carte (infobulle « Verrouiller »). Si l'alarme s'ouvre, coche « J’ai lu » et continue.
2. Onglet **Lexique**. N'ouvre pas l'onglet Lieutenants avant LIE-2.
3. Clique **« Lancer l'analyse SERP (~$0.003 DataForSEO) »**, puis **« Annuler »**.
4. Reclique-le, puis **« Confirmer (~$0.003) »**. Attends.

**Tu dois voir :**
- après le verrou, le message « Verrouillez d'abord le Capitaine… » disparaît, et rien ne part tout seul tant que les pages manquent ;
- la fenêtre « Lancer l'analyse SERP DataForSEO ? », avec « Le scrape récupère les pages Top 10 Google et leur contenu pour calculer le TF-IDF. Coût estimé : $0.003. » ;
- « Annuler » : la fenêtre se ferme, rien ne part ;
- après « Confirmer » : le champ « Tester un mot-clé » grisé le temps de l'analyse, puis les trois listes de termes, un onglet au nom du capitaine, et « Extraire le Lexique » à la place du message.

**C'est un bug si :**
- l'analyse part sans confirmation, ou malgré « Annuler » ;
- l'extraction exige l'onglet Lieutenants (message « Lancez d'abord l'analyse SERP dans l'onglet Lieutenants »).

> Si « Extraire le Lexique » s'affiche dès le geste 2, les pages de ce mot-clé avaient déjà été lues : l'extraction part seule, sans rien payer. Note-le ; la fenêtre de coût se reverra en RÉEL, sur un nouveau cocon.

### LEX-3 — Trois listes de mots du métier
**Exigences :** FR-LEX-TFIDF, FR-LEX-METIER-ONLY

**Gestes :**
1. Lis le titre des trois listes.
2. Déplie « Optionnel (<30%) — N termes ».
3. Parcours les termes des trois listes.

**Tu dois voir :**
- « Obligatoire (70%+) — N termes » et « Differenciateur (30-70%) — N termes » ouvertes, « Optionnel (<30%) — N termes » repliée ;
- sur chaque ligne : une case, le terme, sa densité (« ×2.5/page », par exemple), son pourcentage de pages ;
- des pourcentages rangés au bon endroit : 70 % ou plus en Obligatoire, 30 à 69 % en Differenciateur, moins de 30 % en Optionnel ;
- dans chaque liste, les densités de la plus forte à la plus faible, et 50 termes au plus ;
- des mots isolés : aucun terme de deux mots ;
- aucun mot vide ni décor de page (« être », « votre », « vos », « nos », « voir », « permet », « cookies », « mentions », « newsletter », « panier », « cliquez »), aucun nombre, aucun mot de moins de 3 lettres ;
- une liste vide qui le dit : « Aucun terme obligatoire identifie. » (ou « differenciateur », « optionnel »).

**C'est un bug si :**
- un terme contient une espace ;
- un mot de la liste ci-dessus apparaît ;
- un pourcentage n'est pas dans sa liste, ou une liste dépasse 50 termes.

> En MOCK, les pages viennent du bac à sable : les termes sont peu représentatifs, voire absents. Si les trois listes sont vides, note-le et suis la parade de LEX-6. Le vocabulaire se juge vraiment en RÉEL (LEX-R1).

### LEX-4 — L'avis de l'IA ne coche rien
**Exigences :** FR-LEX-AI-PANEL ⚠, FR-LEX-PRECHECK-PERSISTE

**Gestes :**
1. Juste après l'extraction, regarde au-dessus des listes.
2. En bas, ouvre le panneau « Analyse IA Lexique » en cliquant son titre.
3. Clique **« Analyser avec l'IA »**.
4. Recharge, puis ouvre l'onglet Lexique et ne clique rien.

**Tu dois voir :**
- « Analyse IA en cours... », puis un court résumé ;
- aucune case cochée, ni avant ni après l'analyse ;
- le panneau « Analyse IA Lexique » replié (« Cliquez pour … ») ; déplié, le décompte « N termes analysés — n recommandés · m écartés. » et « Régénérer l'analyse » une fois l'analyse faite ;
- au clic sur « Analyser avec l'IA » : « Analyse IA en cours... », puis le résumé ;
- après rechargement, aucun appel à l'IA sans clic.

**C'est un bug si :**
- une case se coche toute seule ;
- le résumé n'apparaît jamais.

**⚠ Défaut connu :** l'analyse part d'elle-même après chaque extraction, y compris l'extraction lancée seule à l'ouverture de l'onglet : un appel à l'IA part sans clic. Et le panneau lit deux listes de recommandations différentes : après une première analyse il reste « à lancer » ; après un rechargement il affiche « N analysés, 0 recommandés », sans pastilles. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

> En MOCK, l'IA simulée ne donne aucun avis par terme : ni badge « IA recommandé », ni « Termes manquants », et le panneau reste « à lancer ». Le résumé affiché est « Le lexique actuel est complet sur l'intention mais manque les termes de réassurance (garanties, certifications). » Les badges se vérifient en RÉEL (LEX-R1).

### LEX-5 — Trois tris, appliqués aux trois listes
**Exigences :** FR-LEX-SORT

**Gestes :**
1. Regarde la barre de tri au-dessus des listes.
2. Clique **« Densité »** trois fois, puis **« A-Z »** trois fois, en regardant la liste Obligatoire après chaque clic.
3. Clique **« Pertinence douleur »**, puis déplie « Optionnel ».
4. Choisis un autre article (le pilier), puis rechoisis le nouvel enfant et son onglet Lexique.
5. Recharge, puis rouvre l'onglet Lexique.

**Tu dois voir :**
- « A-Z », « Densité » et « Pertinence douleur » (le nouvel enfant a une douleur) ;
- sans tri choisi, l'ordre des densités décroissantes ;
- chaque bouton : un premier sens (flèche ↓), le sens inverse (↑), puis retour à l'ordre des densités ;
- « Pertinence douleur » : en tête, les termes qui partagent un mot avec la douleur de l'article, s'il y en a ;
- le tri appliqué aux trois listes, et toujours actif après le changement d'article ;
- après rechargement, plus de tri : l'ordre des densités.

**C'est un bug si :**
- une seule liste suit le tri ;
- le tri survit au rechargement, ou se perd en changeant d'article.

> Si les listes sont vides en MOCK, passe cette vérification.

### LEX-6 — Cocher un terme l'enregistre aussitôt
**Exigences :** FR-LEX-SELECT, FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-PRECHECK-PERSISTE, FR-LEX-CHECK

**Gestes :**
1. Coche trois termes, dont un de la liste Differenciateur si elle en a.
2. Recharge, puis rouvre l'onglet Lexique.
3. Clique la case d'un terme coché.
4. Décoche les deux autres.
5. Recoche un seul terme de la liste Obligatoire.

**Tu dois voir :**
- aucun bouton « Valider le Lexique » ni « Verrouiller le Lexique » ;
- dans la barre de tri, « 3 termes sélectionnés (…O / …D / …Op) », et sous les listes « 3 terme(s) verrouillé(s) » ;
- l'étape Lexique accordée dès le premier terme, sans bandeau ;
- après rechargement, exactement les trois mêmes cases cochées ;
- un clic sur une case cochée la décoche, et le compteur baisse ;
- tout décoché : l'étape Lexique retirée, la ligne « terme(s) verrouillé(s) » disparaît ;
- un terme recoché : l'étape revient.

**C'est un bug si :**
- une case cochée revient décochée après rechargement, ou un clic la « recoche » ;
- un bandeau « Étape non validée. » apparaît pour des mots du métier ;
- une liste se recharge ou change d'ordre quand tu coches.

> **Parade si les listes sont vides (MOCK).** Page du cocon → **« Rédaction »** → carte du nouvel enfant → section « Mots-cles » → « Lexique semantique » : tape un terme du métier dans « Ajouter un terme... », clique **« + »**, puis **« Sauvegarder »**. De retour dans l'onglet Lexique, l'étape est demandée d'elle-même. Dans ce cas, saute les gestes 2 et 3 de FIN-3.

### LEX-7 — Tester un autre mot-clé : un onglet par exploration
**Exigences :** FR-LEX-MULTI-KEYWORD, FR-LEX-MULTI-KEYWORD-TABS, FR-LEX-LECTURE-VS-VERROUILLAGE, FR-LEX-PRECHECK-PERSISTE

**Gestes :**
1. Clique l'onglet **« + Tester un mot-clé »**.
2. Champ vide, regarde **« Extraire »**. Puis tape `Isolation Combles Perdus`, avec ses majuscules, et clique **« Extraire »**.
3. Dans ce nouvel onglet, coche un terme qui n'est pas encore retenu.
4. Clique l'onglet du capitaine, puis reviens sur « Isolation Combles Perdus », en regardant le compteur.
5. Recharge, rouvre l'onglet Lexique, et passe d'un onglet à l'autre.
6. Décoche le terme coché au geste 3.

**Tu dois voir :**
- le champ (« Ex: coach sportif Paris ») et « Extraire », disponibles alors qu'un terme est déjà retenu ; « Extraire » grisé tant que le champ est vide ;
- pendant l'extraction, le champ grisé ; ensuite un onglet libellé exactement « Isolation Combles Perdus », sélectionné, à côté de l'onglet du capitaine et de « + Tester un mot-clé » ;
- le terme coché compte dans le même total : « 2 termes sélectionnés » ; le détail « (…O / …D / …Op) » ne compte que l'onglet affiché ;
- un changement d'onglet affiche aussitôt la liste de l'onglet, sans « Extraction en cours... », sans changer le total ; un terme retenu est coché dans tous les onglets où il figure ;
- après rechargement, tous les onglets et les mêmes cases cochées.

**C'est un bug si :**
- l'onglet n'a pas exactement le libellé tapé (majuscules comprises) ;
- le champ reste grisé sans extraction en cours ;
- changer d'onglet coche ou décoche un terme, ou change le total ;
- après rechargement, un onglet ou une case cochée manque.

> En MOCK, « Analyse IA en cours... » peut repartir à chaque changement d'onglet : l'IA simulée enregistre un avis vide, que l'écran redemande (écart signalé). L'absence d'appel se vérifie en RÉEL (LEX-R2). « Tester un mot-clé » n'affiche pas de fenêtre de coût : c'est une limite connue.

### LIE-2 — Un échec d'analyse se lit et se répare
**Exigences :** FR-LIE-SERP-ECHEC-EXPLIQUE

**Gestes :**
1. Onglet **Lieutenants** du nouvel enfant. Coupe internet (Wi-Fi ou câble).
2. Clique **« Analyser SERP »** et attends la fin.
3. Rebranche internet et attends quelques secondes.

**Tu dois voir :**
- « Analyse SERP en cours (n/N) » : le capitaine passe à ✓ (ses pages sont en base depuis LEX-2), puis un mot-clé racine échoue ;
- un message rouge en français, qui nomme ce mot-clé et dit quoi faire. Pour une source qui ne répond pas : « L'analyse n'a pas abouti : la source n'a pas répondu à temps pour « … ». Relancez-la. » ;
- aucune proposition de l'IA, et « Analyser SERP » de nouveau cliquable.

**C'est un bug si :**
- le message contient un texte technique en anglais, par exemple « SERP analysis failed », même entre parenthèses ;
- le message ne nomme pas le mot-clé en cause ;
- l'écran reste bloqué sur « Analyse en cours... ».

> Si l'analyse aboutit malgré la coupure, tous les mots-clés étaient déjà en base : note-le et passe. Les messages « mot-clé trop étroit » et « budget atteint » ne se provoquent pas à la main.

### LIE-3 — Analyser les concurrents en réutilisant les pages déjà lues
**Exigences :** FR-LIE-SERP-ANALYZE, FR-LIE-SCRAPE-DEDIE

**Gestes :**
1. Internet rebranché, clique **« Analyser SERP »**.
2. Ouvre le panneau « Coûts API ».
3. Clique chaque onglet de mot-clé, sous le résumé. Clique **« Blogs (n) »**, puis **« Autres (m) »**, puis reclique pour enlever le filtre.
4. Survole une ligne barrée marquée « ! », s'il y en a.
5. Note le petit nombre à côté du nom du capitaine, dans son onglet : c'est le nombre de pages lues (il resservira en HN-2).

**Tu dois voir :**
- « Analyse SERP en cours (n/N) », chaque mot-clé avec ✓ et « N concurrents », « scraping... » ou « en attente » ;
- les étapes « Scraping SERP Google (n / N mots-cles) », « Analyse IA — proposition de lieutenants », « Filtrage et selection des meilleurs candidats » ;
- dans « Coûts API », « Analyse SERP lancée (N mots-clés) » ;
- le résumé « N concurrents affiches » suivi de « (cache) » : le capitaine est relu en base, ses pages ayant été lues par le Lexique. Puis « N questions PAA » ou « 0 PAA — les lieutenants seront bases sur les headings et la strategie du cocon » ;
- un onglet par mot-clé analysé (le capitaine, puis ses racines), chacun avec « N concurrents, M PAA » et au plus 10 lignes : « #rang », « Blog » ou « Autre » (en capitales), le domaine, le titre cliquable ;
- « ! » sur une page non lue, ligne barrée, infobulle « Scraping impossible : … » ;
- les filtres Blogs / Autres qui restreignent la liste.

**C'est un bug si :**
- un mot-clé a plus de 10 lignes ;
- le capitaine n'est pas marqué « (cache) » alors que le Lexique l'a analysé ;
- l'analyse réclame l'onglet Lexique.

### LIE-4 — L'IA propose sans cocher, à part des décisions
**Exigences :** FR-LIE-PROPOSE-AI, FR-LIE-AI-FRONTIER

**Gestes :**
1. Pendant et après l'analyse, regarde la liste, puis le panneau violet plus bas.
2. Fais défiler tout l'onglet.

**Tu dois voir :**
- sans clic, « Analyse IA en cours... » dans la liste, et le texte brut de l'IA qui défile dans le panneau « Suggestions IA Lieutenants » (très vite en MOCK) ;
- puis « Lieutenants proposes par l'IA », le badge du type, le compteur « 0 / 3 sélectionnés » et, en MOCK, trois cartes : « prix <capitaine> » (85), « <capitaine> avis » (78), « comment choisir <capitaine> » (72), chacune avec « H2 » et une raison ;
- aucune carte cochée ;
- le panneau « Suggestions IA Lieutenants » sous la liste et sous les deux sections « Sources IA », sans aucune case à cocher, avec « 3 propositions générées par l'IA. » et « Régénérer les suggestions » ;
- aucune structure H1/H2/H3 dans l'onglet : elle est dans l'onglet Structure.

**C'est un bug si :**
- une carte arrive cochée ;
- une carte ou une case apparaît dans le panneau violet ;
- une liste de titres H1/H2/H3 s'affiche dans l'onglet.

> En MOCK, l'IA simulée ne donne ni sources, ni niveau H3, ni failles de contenu, et seulement trois candidats : pas de pastilles, pas d'« Autres candidats », pas de « Failles de contenu ». Tout cela se vérifie en RÉEL (LIE-R1).

### LIE-5 — Les sources de l'IA, repliées
**Exigences :** FR-LIE-SECTIONS-FOLDABLE

**Gestes :**
1. Repère « Sources IA : questions Google (PAA) » et « Sources IA : clusters Discovery ».
2. Déplie chacune d'un clic, puis replie-la.

**Tu dois voir :**
- les deux sections repliées à l'arrivée ;
- PAA dépliée : une phrase d'explication, puis les questions (et leurs réponses), ou « Google n'a renvoye aucune question PAA pour ces mots-cles — c'est normal sur des requetes techniques ou de niche. » ;
- clusters dépliée : les groupes de mots avec « N termes », ou « Aucun cluster disponible. Lance un scan Discovery pour ce cocon, puis reviens ici. »

**C'est un bug si :**
- une section arrive dépliée ;
- une section vide reste blanche, sans message.

### LIE-6 — Des scores lisibles et deux tris
**Exigences :** FR-LIE-CANDIDATES-BADGES

**Gestes :**
1. Survole le score d'une carte.
2. Si le panneau « 💡 Suggestions pour vos Lieutenants » est affiché au-dessus du curseur, clique **« Ajouter »** sur un mot-clé. Sinon, saute ce geste : le panneau n'apparaît que si le Radar de l'article a été scanné.
3. Clique **« Score IA »** trois fois, puis **« A-Z »** deux fois.

**Tu dois voir :**
- sur chaque carte, un score sur 100, infobulle « Score IA: 85/100 » (par exemple) ;
- la carte ajoutée : raison « Proposé depuis votre panier », « H2 », non cochée, score « — » avec l'infobulle « Score IA non fourni » ;
- « Score IA » : du plus fort au plus faible (↓), puis l'inverse (↑), puis l'ordre d'origine ;
- la carte « — » toujours en bas, dans les deux sens ;
- « A-Z » : les cartes par ordre alphabétique, dans un sens puis dans l'autre.

**C'est un bug si :**
- un score absent s'affiche « 0 » ;
- la carte « — » remonte en tête.

> Les pastilles de provenance se vérifient en RÉEL (LIE-R1).

### LIE-7 — Le curseur ne coûte rien
**Exigences :** FR-LIE-SLIDER-INTELLIGENT ⚠

**Gestes :**
1. Compte les lignes de l'onglet du capitaine.
2. Glisse le curseur « Resultats SERP » de 10 à 3.
3. Remets-le à 10.

**Tu dois voir :**
- « Resultats SERP : 3 » ;
- aucune analyse, aucune nouvelle ligne dans « Coûts API » ;
- « 3 concurrents affiches », et une liste de concurrents réduite à 3 (c'est aussi ce que l'IA recevrait).

**C'est un bug si :**
- baisser le curseur lance « Analyse SERP en cours ».

**⚠ Défaut connu :** le curseur, de 3 à 10, ne change que le compteur « N concurrents affichés » ; il ne filtre ni la liste des concurrents ni les données de l'IA, et ne déclenche jamais d'analyse complémentaire. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LIE-8 — Cocher un lieutenant le verrouille aussitôt
**Exigences :** FR-LIE-CHECKBOX-LOCK-IMMEDIATE ⚠, FR-LIE-CHECKBOX-COUNT ⚠

**Gestes :**
1. Coche la carte « prix … ». (Un bandeau apparaît : il se traite en LIE-9.)
2. Regarde les autres cases, et cherche un bouton qui validerait toute la liste.
3. Recharge, puis rouvre l'onglet Lieutenants.

**Tu dois voir :**
- la carte encadrée et le compteur « 1 / 3 sélectionnés » ;
- les autres cases toujours cliquables ; aucun bouton « Valider » ou « Verrouiller » pour la liste ;
- un compteur qui rappelle la fourchette de l'intermédiaire (2 à 5 lieutenants) et signale qu'un seul est hors fourchette ;
- après rechargement, la carte toujours cochée, sans rien avoir enregistré à la main.

**C'est un bug si :**
- cocher une case désactive les autres ;
- la case est décochée après rechargement ;
- après rechargement, le compteur affiche un total nul (« 1 / 0 sélectionnés »).

**⚠ Défaut connu :** le compteur affiche les cases cochées sur le nombre de propositions générées ; aucune fourchette conseillée par type d'article n'est affichée ni signalée. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** relancer la proposition de l'IA décoche à l'écran les lieutenants déjà retenus et retire l'étape, alors que la liste enregistrée les garde ; et le bouton de relance du panneau de l'IA disparaît tant que ce panneau affiche les failles de contenu de la dernière génération (tu le verras en LIE-10 et LIE-R1). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LIE-9 — La porte : trop peu de lieutenants, puis assez
**Exigences :** FR-LIE-LOCK-GATE, FR-LIE-CHECK

**Gestes :**
1. Lis le bandeau au-dessus des cartes.
2. Clique **« Voir pourquoi / décider »**, lis l'alarme, puis clique **« Revenir corriger »**.
3. Coche « … avis ».
4. Décoche les deux cartes.
5. Recoche ces deux cartes le plus vite possible, l'une après l'autre.
6. Ouvre « Coûts API ».

**Tu dois voir :**
- (1) « Étape non validée. 1 lieutenant pour un article Intermédiaire : le minimum conseillé est 2. », revenu tout seul à la réouverture de l'onglet ;
- (2) l'alarme « Avant de valider les lieutenants », un point 🔴 avec « Pourquoi passer outre ? » et « Votre raison » ; « Revenir corriger » la ferme sans rien valider ;
- (3) le bandeau disparaît, l'étape Lieutenants est accordée ;
- (4) plus de bandeau, l'étape Lieutenants est retirée ;
- (5) à la fin, pas de bandeau, l'étape accordée ;
- (6) aucune ligne « 💡 Longueur conseillée » : cocher des lieutenants n'écrit ni sommaire ni longueur ;
- à aucun moment l'alarme ne s'ouvre d'elle-même quand tu coches.

**C'est un bug si :**
- le bandeau reste avec deux cartes cochées ;
- l'étape reste accordée sans aucune carte cochée ;
- l'alarme s'ouvre à chaque case.

### LIE-10 — Relancer sans perdre ses choix
**Exigences :** FR-LIE-PROPOSE-AI, FR-LIE-SERP-ANALYZE, FR-LIE-CHECKBOX-LOCK-IMMEDIATE ⚠

**Gestes :**
1. Clique **« Analyser SERP »**.
2. Clique **« Tout relancer (SERP + IA) »**.
3. Dans le panneau violet, clique le bouton de relance (« Lancer une suggestion IA » ou « Régénérer les suggestions »).
4. Recharge, rouvre l'onglet Lieutenants et note les cases cochées.
5. Laisse exactement deux cartes cochées : « prix … » et « … avis ».

**Tu dois voir :**
- (1) les cartes restent, sans « Analyse IA en cours... » : l'IA n'est pas rappelée ;
- (2) l'écran se vide, l'analyse repasse avec « (cache) », puis les mêmes cartes reviennent sans « Analyse IA en cours... » (les propositions de moins de 7 jours sont relues), les deux retenues toujours cochées, l'étape toujours accordée ;
- (3) « Analyse IA en cours... », puis les cartes, avec les deux lieutenants retenus toujours cochés et l'étape toujours accordée ;
- les boutons de relance disponibles alors que deux lieutenants sont retenus.

**C'est un bug si :**
- « Tout relancer » rappelle l'IA ;
- un bouton de relance est grisé ou absent parce que des lieutenants sont retenus.

**⚠ Défaut connu :** relancer la proposition de l'IA décoche à l'écran les lieutenants déjà retenus et retire l'étape, alors que la liste enregistrée les garde ; et le bouton de relance du panneau de l'IA disparaît tant que ce panneau affiche les failles de contenu de la dernière génération. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LIE-11 — Un lieutenant déjà pris dans le cocon
**Exigences :** FR-LIE-LOCK-GATE

**Gestes :**
1. Ouvre le pilier au Moteur, onglet **Finalisation** : note son capitaine (P) et son lieutenant retenu (L).
2. Page du cocon → **« Rédaction »** → carte du nouvel enfant. Déplie la section « Mots-cles ».
3. Sous « Lieutenants (2) », dans « Ajouter un lieutenant... », ajoute un à un, avec **« + »** : P écrit en MAJUSCULES, avec deux espaces entre deux mots ; le capitaine du nouvel enfant ; L. Clique **« Sauvegarder »**.
4. Retourne au Moteur, rouvre le nouvel enfant, onglet Lieutenants. Décoche puis recoche « … avis ».
5. Clique **« Voir pourquoi / décider »**. Remplis la catégorie et la raison du seul point 🔴, puis regarde le bouton. Clique **« Revenir corriger »**.
6. Nettoie : Rédaction du nouvel enfant, « Mots-cles », retire les trois mots ajoutés (**×** sur chacun), **« Sauvegarder »**. Retourne au Moteur, rouvre le nouvel enfant, onglet Lieutenants.

**Tu dois voir :**
- (4) « Étape non validée. », la première raison et « (+2 autres) » ; l'étape Lieutenants retirée ;
- (5) l'alarme « Avant de valider les lieutenants », avec un point par lieutenant en conflit :
  - 🔴 « « P » est le mot-clé principal de l’article « <titre du pilier> » du même cocon. », malgré les majuscules et les espaces ;
  - 🟠 « « <capitaine du nouvel enfant> » est déjà le capitaine de cet article. » ;
  - 🟠 « « L » est aussi un lieutenant de « <titre du pilier> ». » ;
- « Je prends la responsabilité et je continue » grisé tant que les deux « J’ai lu » ne sont pas cochés, même avec le 🔴 rempli ;
- (6) plus de bandeau, et l'étape Lieutenants de nouveau accordée, sans rien cocher : la porte est consultée à l'ouverture.

**C'est un bug si :**
- un des trois conflits manque ;
- les majuscules ou les espaces font disparaître le 🔴 ;
- une seule réponse vaut pour les trois points ;
- après le nettoyage, le bandeau reste.

### HN-2 — Générer, verrouiller, régénérer
**Exigences :** FR-HN-TAB ⚠, FR-LIE-EXTRACT-HEADINGS

**Gestes :**
1. Onglet **Structure** du nouvel enfant.
2. Déplie « Structure Hn concurrents ».
3. Clique **« Générer la structure »**.
4. Survole le cadenas du deuxième H2, puis clique-le.
5. Clique **« Régénérer la structure »**.
6. Recharge, rouvre l'onglet Structure, puis clique de nouveau **« Générer la structure »**.

**Tu dois voir :**
- les deux lieutenants retenus en pastilles, et plus de message « Retenez d’abord… » ;
- « Lecture de la structure des concurrents… » un instant, puis plus rien : les concurrents sont en base, rien n'est payé ;
- (2) des lignes « H2 texte n/total (x%) » avec une barre, de la plus fréquente à la moins fréquente, « n » jamais plus grand que « total », et « total » égal au nombre noté en LIE-3 ; ou « Aucun heading extrait des concurrents. » ;
- (3) « Génération… », puis un H1 qui contient le capitaine en entier (en MOCK, « <Capitaine> : le guide pratique »), 4 H2 dont les deux lieutenants, un H3 en retrait sous le premier H2, ni « Introduction » ni « Conclusion » ; « Régénérer la structure » et « Sauvegarder la structure » apparaissent ;
- (4) l'infobulle « Verrouiller — l'IA conservera ce titre tel quel » ; le cadenas se ferme et se colore ;
- (5) le titre verrouillé revient tel quel, toujours verrouillé ;
- (6) après rechargement, la structure non sauvegardée et le verrou ont disparu : « Aucune structure pour cet article. Générez-la : l’IA part des lieutenants retenus. »

**C'est un bug si :**
- le H1 ne contient pas le capitaine ;
- un lieutenant retenu manque des titres ;
- un titre verrouillé change ou perd son cadenas à la régénération ;
- « n » dépasse « total ».

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### HN-3 — Sauvegarder n'est pas valider
**Exigences :** FR-HN-TAB ⚠, FR-FIN-RECAP

**Gestes :**
1. Clique **« Sauvegarder la structure »**.
2. Recharge, puis rouvre l'onglet Structure.
3. Ouvre l'onglet Finalisation.

**Tu dois voir :**
- « Sauvegardée » pendant deux secondes, et pas de « ✅ Structure validée » ;
- après rechargement, la même structure ;
- en Finalisation : « Structure (4 H2) » avec ses titres, et « Étapes restantes : Structure à valider, Lexique à valider » si ton lexique est vide, sinon « Étapes restantes : Structure à valider ».

**C'est un bug si :**
- la sauvegarde accorde l'étape Structure ;
- la structure a disparu au rechargement.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### HN-4 — Valider : la porte, le sommaire, la longueur conseillée
**Exigences :** FR-HN-TAB ⚠, FR-HN-LOCK-GATE

**Gestes :**
1. Onglet Structure : clique **« Valider la structure »**.
2. Ouvre « Coûts API ».
3. Clique **« Sauvegarder la structure »** sans rien changer, puis de nouveau **« Valider la structure »**.
4. Page du cocon → **« Rédaction »** → carte du nouvel enfant : regarde le bloc « Structure / Sommaire ». Reste sur cette page.

**Tu dois voir :**
- « Validation… », puis « ✅ Structure validée : elle sert de sommaire à la rédaction. » et l'étape Structure accordée, sans alarme : la structure simulée respecte les règles de l'intermédiaire ;
- si ton capitaine contient la ville de ta zone client (Toulouse, par exemple), l'alarme « Avant de valider la structure » peut s'ouvrir avec 🔴 « N H2 citent Toulouse : aucun pour un intermédiaire. » : c'est attendu, réponds-y ;
- dans « Coûts API », « 💡 Longueur conseillée : N mots », avec en détail « … · Modifiable dans la Rédaction. », ou « … · Valeur choisie conservée (N mots). » si une longueur était déjà choisie ;
- (3) le ✅ disparaît à la sauvegarde, même sans changement, puis revient à la validation ;
- (4) le sommaire : le H1 de la structure en tête, « Introduction », les H2 et H3 de la structure, « Conclusion ».

**C'est un bug si :**
- l'étape est accordée alors que tu as fermé une alarme avec « Revenir corriger » ;
- le sommaire n'a pas d'« Introduction » ou de « Conclusion », ou en a deux ;
- une longueur choisie à la main est écrasée.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LEX-8 — Dans la Rédaction, un mot générique n'entre pas au lexique
**Exigences :** FR-LEX-METIER-ONLY, FR-LEX-PRECHECK-PERSISTE

**Gestes :**
1. Sur la même page, déplie « Mots-cles ». Regarde « Lexique semantique (N) ».
2. Dans « Ajouter un terme... », tape `votre`, puis clique **« + »**.
3. Tape `vos cookies`, puis **« + »**.
4. Tape `pompe chaleur`, puis **« + »**. Retire-le aussitôt avec **×**, sans sauvegarder.

**Tu dois voir :**
- N égal au nombre de termes retenus au Moteur (compteur de l'onglet Lexique) ;
- (2) « « votre » est un mot générique : il n'aide pas le référencement, il n'est pas ajouté. », et la liste inchangée ;
- (3) le même refus pour « vos cookies », dont tous les mots sont génériques ;
- (4) « pompe chaleur » accepté.

**C'est un bug si :**
- un mot générique rejoint la liste ;
- un terme du métier est refusé ;
- N diffère du compteur du Moteur.

### HN-5 — Un sommaire retouché n'est pas écrasé sans demander
**Exigences :** FR-HN-TAB ⚠

**Gestes :**
1. Sur la même page, bloc « Structure / Sommaire » : si le sommaire est validé, clique **« Modifier le sommaire »**. Clique **« + Ajouter H2 »** (une « Nouvelle section » apparaît en bas), puis **« Valider le sommaire »**.
2. Retourne au Moteur, rouvre le nouvel enfant, onglet Structure. Clique **« Valider la structure »**.
3. Dans la fenêtre du navigateur, clique **« Annuler »**. Ouvre « Coûts API ».
4. Clique encore **« Valider la structure »**, et cette fois **« OK »**.
5. Rouvre la Rédaction du nouvel enfant et regarde le sommaire.

**Tu dois voir :**
- (2) la fenêtre « Le sommaire de la Rédaction a été retouché depuis la dernière structure validée. Le remplacer par cette structure ? » ;
- (3) « Sommaire de la Rédaction conservé » dans « Coûts API », et la validation qui va au bout : ✅ ;
- (4) cette fois, pas de « Sommaire de la Rédaction conservé » ;
- (5) le sommaire de la structure, sans « Nouvelle section ».

**C'est un bug si :**
- le sommaire retouché est remplacé sans fenêtre ;
- « Annuler » bloque la validation ;
- après « OK », « Nouvelle section » est toujours là.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### HN-6 — Changer les lieutenants rouvre la structure
**Exigences :** FR-HN-TAB ⚠, FR-HN-LOCK-GATE, FR-LIE-CHECK

**Gestes :**
1. Onglet Lieutenants : coche « comment choisir … ».
2. Onglet Structure : clique **« Valider la structure »**.
3. Dans l'alarme, regarde le bouton, puis clique **« Revenir corriger »**.
4. Clique **« Régénérer la structure »**, puis **« Valider la structure »**.
5. Onglet Lexique : coche un deuxième terme. Reviens sur Structure.

**Tu dois voir :**
- (1) l'étape Lieutenants toujours accordée, mais l'étape Structure retirée ;
- (2) trois pastilles de lieutenants, plus de ✅ ; l'alarme « Avant de valider la structure » avec 🟠 « Le lieutenant « comment choisir … » n’apparaît dans aucun titre. » et sa case « J’ai lu » ;
- (3) « J’ai lu, je continue » grisé tant que la case n'est pas cochée ;
- (4) une structure qui contient les trois lieutenants, validée sans alarme : ✅ ;
- (5) ✅ toujours là : retenir un terme ne touche pas la structure.

**C'est un bug si :**
- l'étape Structure survit au changement de lieutenants ;
- l'alarme ne nomme pas le lieutenant absent ;
- cocher un terme du lexique fait tomber la structure.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### HN-7 — Le pilier ne développe pas le sujet d'un enfant
**Exigences :** FR-HN-LOCK-GATE

**Gestes :**
1. Au Moteur, choisis le pilier, onglet Structure. Vérifie « ✅ Structure validée : elle sert de sommaire à la rédaction. »
2. Clique **« Valider la structure »**. Si le navigateur propose de remplacer le sommaire, clique **« Annuler »**.
3. Si une alarme s'ouvre, lis-la, puis clique **« Revenir corriger »**.

**Tu dois voir :**
- pour chaque article du cocon dont le capitaine figure en entier dans un H2 du pilier (le nouvel enfant, si tu as pris le premier mot-clé en LIE-1), un point dans l'alarme « Avant de valider la structure » :
  - 🔴 « « <H2> » développe un sujet que traite déjà l’article « <titre> ». », avec « À la place : » « Garder ce H2 sans H3 : un résumé de 150 à 250 mots et un lien vers « <titre> » », si ce H2 a des H3 ;
  - 🟠 « « <H2> » recoupe l’article « <titre> » : résumez-le et liez-le. », s'il n'en a pas ;
- sans aucun recoupement, pas d'alarme ;
- dans tous les cas, le pilier garde « ✅ Structure validée ».

**C'est un bug si :**
- l'alarme cite un article dont le capitaine n'est pas en entier dans le H2 ;
- le pilier perd son étape Structure après « Revenir corriger ».

> Ce contrôle ne vaut que pour un pilier. Un module qui republie le pilier reverra ce point : c'est attendu.

### FIN-2 — Le récapitulatif relit les quatre choix, sans rien modifier
**Exigences :** FR-FIN-RECAP, FR-FIN-CHECK, FR-LEX-PRECHECK-PERSISTE

**Gestes :**
1. Rechoisis le nouvel enfant, onglet Finalisation.
2. Replie et déplie chaque section.
3. Cherche un champ, une case ou un bouton qui modifierait une valeur.

**Tu dois voir :**
- « ✅ Prêt pour la Rédaction », et plus de ligne « Étapes restantes » ;
- « Capitaine » : le mot-clé verrouillé ;
- « Lieutenants (3) » : chaque lieutenant avec « H2 » et sa raison (en MOCK, par exemple « Question de budget posée avant tout achat : forte intention. ») ;
- « Structure (4 H2) » : le H1, puis les H2 et H3 dans l'ordre de lecture, les H3 en retrait ;
- « Lexique (2 termes) » : tes deux termes en pastilles, autant que le compteur de l'onglet Lexique ;
- rien d'autre de cliquable que les titres des sections et les deux boutons vers la Rédaction ; les points de l'article inchangés après tes clics.

**C'est un bug si :**
- une valeur se modifie ici ;
- un nombre diffère de celui de l'onglet d'origine ;
- ouvrir ou replier une section change une étape.

### FIN-3 — Les deux boutons vers la Rédaction suivent la même règle
**Exigences :** FR-FIN-LINK-REDACTION, FR-FIN-CHECK

**Gestes :**
1. Survole **« Aller à la Rédaction → »**, puis, en bas, **« Continuer vers la Rédaction → »**.
2. Onglet Lexique : décoche tes deux termes. Reviens sur Finalisation et survole les deux boutons.
3. Onglet Lexique : recoche un terme. Reviens sur Finalisation.
4. Clique **« Aller à la Rédaction → »**.
5. Reviens au Moteur, rechoisis le nouvel enfant, onglet Finalisation, et clique **« Continuer vers la Rédaction → »**.

**Tu dois voir :**
- (1) les deux boutons actifs, même infobulle « Continuer vers la Rédaction » ;
- (2) « ⏳ Préparation en cours », « Étapes restantes : Lexique à valider », et les deux boutons grisés avec cette même infobulle ;
- (3) de nouveau ✅ et les deux boutons actifs, sans rechargement ;
- (4) la Rédaction du cocon « Recette <date> », ouverte sur le nouvel enfant ;
- (5) au retour, toujours ✅ : aucun verrou perdu ; le second bouton ouvre la même page.

**C'est un bug si :**
- les deux boutons ne sont pas dans le même état ;
- un bouton grisé ouvre la Rédaction ;
- la Rédaction s'ouvre sur un autre article ;
- un verrou manque au retour.

### FIN-4 — Un verrou retiré ailleurs se voit aussitôt
**Exigences :** FR-FIN-RECAP, FR-FIN-CHECK, FR-HN-TAB ⚠, FR-LIE-SERP-ANALYZE

**Gestes :**
1. Onglet Capitaine : clique **« Déverrouiller »**. Dans « Déverrouiller le Capitaine ? », clique **« Les garder »**.
2. Onglet Finalisation.
3. Onglet Lieutenants, puis onglet Lexique.
4. Onglet Capitaine : reverrouille le même mot-clé. Onglet Structure : **« Valider la structure »**. Onglet Finalisation.

**Tu dois voir :**
- (2) sans rechargement : « ⏳ Préparation en cours » et « Étapes restantes : Capitaine à verrouiller, Structure à valider » ; lieutenants, structure et lexique toujours affichés ;
- (3) Lieutenants : pas de message « Verrouillez votre Capitaine… », et « Analyser SERP » actif, car des propositions existent. Lexique : « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. », mais « Extraire le Lexique » actif, car des termes sont retenus ;
- (4) « ✅ Prêt pour la Rédaction ».

**C'est un bug si :**
- « Structure à valider » n'apparaît pas après le déverrouillage ;
- « Lieutenants à verrouiller » ou « Lexique à valider » apparaissent ;
- il faut recharger pour voir le changement.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### HN-8 — (Facultatif) Un enregistrement refusé devrait se dire
**Exigences :** FR-HN-TAB ⚠

**Gestes :**
1. Onglet Structure du nouvel enfant : clique **« Sauvegarder la structure »** (le ✅ disparaît).
2. Arrête le serveur : Ctrl+C dans le terminal de `npm run dev`. Ne recharge pas la page.
3. Clique **« Valider la structure »**.
4. Relance `npm run dev`, recharge, vérifie que le bouton affiche toujours **MOCK**, rouvre le nouvel enfant, onglet Structure, puis clique **« Valider la structure »**.

**Tu dois voir :**
- (3) un message qui dit que la structure n'a pas pu être enregistrée, et aucune étape Structure ;
- (4) « ✅ Structure validée : elle sert de sommaire à la rédaction. »

**C'est un bug si :**
- l'étape Structure est accordée alors que rien n'a été enregistré ;
- la validation échoue une fois le serveur relancé.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## En mode RÉEL (payant)

Sur le cocon du parcours express refait en RÉEL (étapes 1 à 6), bouton sur **RÉEL**. Suis la dépense dans « Coûts API ». Repasse en **MOCK** à la fin.

### LIE-R1 — Provenance, tête de liste et failles de contenu
**Exigences :** FR-LIE-CANDIDATES-BADGES, FR-LIE-PROPOSE-AI, FR-LIE-CHECKBOX-LOCK-IMMEDIATE ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Pilier du cocon RÉEL, onglet Lieutenants : regarde les propositions de l'IA (relance **« Analyser SERP »** si la liste est vide).
2. Déplie « Autres candidats (M) ».
3. Clique **« Score IA »**.
4. Regarde sous la liste, puis dans le panneau violet.

**Tu dois voir :**
- sur chaque carte, une ou plusieurs pastilles de provenance (« PAA », « SERP », « GROUP », « ROOT », « CONTENT-GAP »), un score sur 100, et « H2 » ou « H3 » ;
- au plus 5 cartes en tête de liste pour un pilier (5 pour un intermédiaire, 4 pour un spécialisé) ; les autres dans « Autres candidats (M) », repliée, et « N retenus · M éliminés » ;
- le tri « Score IA » appliqué aussi aux « Autres candidats » ;
- « Failles de contenu » sous la liste, et le même texte sous « Content-gap détecté » dans le panneau violet, avec un bouton de relance toujours présent ;
- aucune carte cochée d'avance, aucun candidat en double.

**C'est un bug si :**
- une carte n'a ni pastille ni raison ;
- plus de 5 cartes en tête de liste pour un pilier ;
- un score absent s'affiche « 0 ».

**⚠ Défaut connu :** relancer la proposition de l'IA décoche à l'écran les lieutenants déjà retenus et retire l'étape, alors que la liste enregistrée les garde ; et le bouton de relance du panneau de l'IA disparaît tant que ce panneau affiche les failles de contenu de la dernière génération. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LIE-R2 — L'entonnoir géographique
**Exigences :** FR-LIE-GEOFUNNEL-RULE
**Mode :** RÉEL (payant)
**Gestes :**
1. Sur un article dont le capitaine contient une ville (par exemple `plombier toulouse`), regarde les cartes en tête de liste après la proposition de l'IA.
2. S'il existe dans ce cocon un intermédiaire ou un spécialisé dont le capitaine contient une ville, fais de même.

**Tu dois voir :**
- pilier : au plus 2 cartes en tête de liste qui citent la ville ;
- intermédiaire ou spécialisé : aucune carte en tête de liste qui cite la ville ;
- un candidat qui ne fait qu'ajouter la ville à un terme générique (« devis toulouse », par exemple) a un score nettement plus bas que ses voisins.

**C'est un bug si :**
- la règle est ignorée à chaque essai. Une entorse isolée reste possible : c'est une consigne donnée à l'IA, qu'aucun contrôle ne vérifie ensuite. Note-la.

### HN-R1 — Une structure régénérée se revalide
**Exigences :** FR-HN-TAB ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Onglet Structure d'un article RÉEL dont la structure est validée : verrouille deux H2.
2. Clique **« Régénérer la structure »**.
3. Clique **« Valider la structure »**.

**Tu dois voir :**
- une structure différente, où les deux H2 verrouillés reviennent mot pour mot ;
- un H1 qui contient le capitaine en entier, ni « Introduction » ni « Conclusion », chaque lieutenant retenu dans un titre ;
- après la régénération : « La structure a changé depuis sa validation : enregistrez-la puis validez-la de nouveau. » ;
- après la validation : ✅, ou une alarme qui dit ce qui ne va pas.

**C'est un bug si :**
- un titre verrouillé a changé ;
- le ✅ reste affiché sur une structure modifiée.

**⚠ Défaut connu :** un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LEX-R1 — L'avis de l'IA, terme par terme
**Exigences :** FR-LEX-AI-PANEL ⚠, FR-LEX-METIER-ONLY, FR-LEX-TFIDF
**Mode :** RÉEL (payant)
**Gestes :**
1. Onglet Lexique du pilier RÉEL (extrait à l'étape 5 du parcours). Survole un badge.
2. Ouvre le panneau « Analyse IA Lexique ». Clique **« Régénérer l'analyse »**, puis **« Annuler »** dans la fenêtre.
3. Recharge, puis rouvre l'onglet Lexique.

**Tu dois voir :**
- des termes du métier, sans aucun mot de la liste de LEX-3 ;
- des badges « IA recommandé » ou « IA optionnel », la raison en infobulle ; un terme sans avis n'a pas de badge ;
- au-dessus des listes, un résumé et « Termes manquants : … », 5 termes au plus ;
- dans le panneau : « N termes analysés — n recommandés · m écartés. » ;
- « Régénérer l'analyse » demande « Régénérer l'analyse IA Lexique ? Cela consommera un appel Claude. » ; « Annuler » ne lance rien ;
- aucune case cochée par l'IA ;
- après rechargement, les mêmes badges et le même décompte, sans nouvel appel.

**C'est un bug si :**
- une case se coche toute seule ;
- plus de 5 termes manquants ;
- « Annuler » lance quand même l'analyse.

**⚠ Défaut connu :** l'analyse part d'elle-même après chaque extraction, y compris l'extraction lancée seule à l'ouverture de l'onglet : un appel à l'IA part sans clic. Et le panneau lit deux listes de recommandations différentes : après une première analyse il reste « à lancer » ; après un rechargement il affiche « N analysés, 0 recommandés », sans pastilles. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### LEX-R2 — Changer d'onglet ne rappelle pas l'IA
**Exigences :** FR-LEX-MULTI-KEYWORD-TABS, FR-LEX-LECTURE-VS-VERROUILLAGE
**Mode :** RÉEL (payant)
**Gestes :**
1. **« + Tester un mot-clé »** : extrais un autre mot-clé. Cette analyse peut être payée sans annonce (limite connue).
2. Attends la fin de l'avis de l'IA.
3. Passe plusieurs fois d'un onglet à l'autre.

**Tu dois voir :**
- à chaque changement, les termes et les badges de l'onglet, sans « Analyse IA en cours... » ;
- aucune nouvelle ligne dans « Coûts API » ;
- le total de termes sélectionnés inchangé.

**C'est un bug si :**
- un changement d'onglet relance l'IA ou ajoute une dépense.

### LEX-R3 — La suggestion de Claude passe le même filtre
**Exigences :** FR-LEX-METIER-ONLY
**Mode :** RÉEL (payant)
**Gestes :**
1. Fais-le en dernier : la suggestion remplace le lexique de l'article. Rédaction de l'article RÉEL, section « Mots-cles » : clique **« Suggerer le Lexique via Claude »**.

**Tu dois voir :**
- « Generation... », puis un nouveau lexique sans mot générique ;
- si Claude en avait proposé, « Termes génériques écartés de la suggestion : … », qui les nomme.

**C'est un bug si :**
- un mot vide ou de décor de page entre dans le lexique.

## Hors recette

Aucune : chaque exigence du périmètre se voit à l'écran, au moins en partie ou en RÉEL.

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
