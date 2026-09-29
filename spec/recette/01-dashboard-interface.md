---
title: Recette — Dashboard et interface partagée
module: 01
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md
  - spec/03-dashboard.md
  - spec/15-interface.md
---

# Module 01 — Dashboard et interface partagée

**Durée :** ~60 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express de la recette manuelle fait jusqu'au bout : cocon « Recette <date> » avec son pilier rédigé puis publié, et un article enfant « À rédiger » ; bouton **MOCK** actif ; connexion internet (les suggestions Google sont réelles).

Ce module vérifie l'accueil, la page d'un silo, la page d'un cocon, la création d'un cocon et les points de progression des articles. Il vérifie aussi les briques d'écran partagées : la carte de mot-clé, les panneaux d'IA, le bandeau « Résultats déjà calculés » du Moteur et la barre des panneaux de la rédaction. Il crée un cocon vide « Recette vide <date> » et fait passer l'article enfant par Discovery, Radar et Capitaine, sans rien laisser verrouillé.

## Vérifications

### DASH-1 — L'accueil montre le plan éditorial et son avancement
**Exigences :** FR-DASH-NAV ⚠

**Gestes :**
1. Ouvre l'accueil : clique le nom du site, à gauche de la barre du haut.
2. Lis le haut de la page, puis chaque bloc de silo.
3. Dans le silo qui contient « Recette <date> », trouve sa carte. Si elle est cachée, fais défiler le carrousel avec les flèches rondes.
4. Survole la roue dentée en haut à droite de la page, puis celle d'un silo.
5. Clique **« Maillage »**, puis reviens avec le bouton retour du navigateur. Fais de même avec **« GSC »**, puis avec la roue dentée de la page.
6. Clique la carte « Recette <date> ».

**Tu dois voir :**
- en haut, un titre (en pratique le nom d'un de tes silos) et sa description ; à droite, « Maillage », « GSC » et une roue dentée, infobulle « Configuration du thème » ;
- quatre compteurs : « Silos », « Cocons », « Articles », « Progression » (en %) ;
- pour chaque silo : son nom, une roue dentée (infobulle « Configuration du silo »), sa description, une ligne « N cocons · N articles · N% », une barre d'avancement (verte seulement à 100 %), puis le carrousel de ses cocons, terminé par la carte en pointillés « Nouveau cocon » ;
- la carte « Recette <date> » : « 2 articles | 1 Pilier 1 Inter. 0 Spéc. », une barre, et « 50% complété » (le pilier est publié, l'enfant est à rédiger) ;
- « Cocons » égal à la somme des « N cocons » des silos, « Articles » égal à la somme des « N articles » ;
- « Progression » : la part des articles publiés (ou brouillons) sur tout le plan, à 1 % près à cause des arrondis ;
- les trois liens ouvrent « Matrice de Maillage Interne », « Post-Publication — Google Search Console » et « Configuration du Thème » ;
- le clic sur la carte ouvre la page du cocon « Recette <date> ».

**C'est un bug si :**
- un compteur ne correspond pas à la somme des silos ;
- une carte de cocon affiche des points de progression : elle n'en a aucun ;
- l'avancement compte un article « À rédiger » (ici, plus de 50 %) ;
- la carte ouvre un autre cocon.

> Si le parcours express ne s'est pas terminé par la publication, le pilier est encore « À rédiger » : la carte affiche alors « 0% complété ».

**⚠ Défaut connu :** FR-DASH-NAV — à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-2 — Créer un cocon : Entrée crée, Échap et champ vide annulent
**Exigences :** FR-DASH-COCOON-CREATE ⚠

**Gestes :**
1. Dans le silo de « Recette <date> », fais défiler le carrousel jusqu'à la carte **« Nouveau cocon »**, puis clique-la.
2. Tape seulement trois espaces et appuie sur Entrée. Puis clique ailleurs sur la page.
3. Reclique **« Nouveau cocon »**, tape `Essai annulé`, puis appuie sur Échap.
4. Au clavier : appuie sur Tab jusqu'à ce que la carte « Nouveau cocon » s'encadre, puis sur Entrée.
5. Tape `Recette vide <date du jour>`, puis appuie sur Entrée.
6. Reviens à l'accueil.

**Tu dois voir :**
- au clic, la carte devient un champ « Nom du cocon... », avec le curseur dedans ;
- avec des espaces seulement, Entrée ne fait rien ; le clic ailleurs rend la carte « Nouveau cocon », sans rien créer ;
- Échap : même chose, et « Essai annulé » n'existe nulle part ;
- Entrée au clavier ouvre le champ, comme le clic ;
- après Entrée sur un vrai nom : une petite roue tourne, puis la page du cocon « Recette vide <date> » s'ouvre ;
- à l'accueil : une seule carte « Recette vide <date> » dans le silo, avec « 0 articles | 0 Pilier 0 Inter. 0 Spéc. » et « 0% complété » ; le compteur « Cocons » a pris 1.

**C'est un bug si :**
- un cocon est créé sans nom, ou malgré Échap ;
- le nouveau cocon apparaît deux fois ;
- la création ne t'emmène pas sur la page du cocon.

> Ce cocon vide reste après la recette : fais-le supprimer avec celui du parcours express (voir « Après la recette » dans la recette manuelle).

**⚠ Défaut connu :** FR-DASH-COCOON-CREATE — un nom qui ne diffère d'un cocon existant que par les majuscules ou les accents, ou le même nom dans un autre silo, est accepté ; les deux cocons partagent alors la même stratégie au Cerveau et au Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-3 — Un nom déjà pris dans le silo est refusé
**Exigences :** FR-DASH-COCOON-CREATE ⚠

**Gestes :**
1. Dans le même silo, clique **« Nouveau cocon »**, tape exactement `Recette vide <date du jour>`, le nom créé en DASH-2, puis appuie sur Entrée.
2. Clique **« Réessayer »**.
3. Recommence avec le même nom, mais quitte le champ en cliquant ailleurs, sans appuyer sur Entrée.
4. Clique **« Réessayer »**.

**Tu dois voir :**
- à la place de la liste des silos, un message rouge en anglais, du type « Cocoon "Recette vide <date>" already exists in silo "<nom du silo>" », et un bouton « Réessayer » ; les quatre compteurs disparaissent aussi. C'est une limite connue : un refus remplace toute la liste ;
- tu restes sur l'accueil ;
- après « Réessayer », la liste revient, toujours avec une seule carte « Recette vide <date> » ;
- quitter le champ donne le même refus qu'Entrée.

**C'est un bug si :**
- un second cocon du même nom apparaît ;
- l'outil t'emmène sur une page de cocon ;
- « Réessayer » ne ramène pas la liste.

**⚠ Défaut connu :** FR-DASH-COCOON-CREATE — un nom qui ne diffère d'un cocon existant que par les majuscules ou les accents, ou le même nom dans un autre silo, est accepté ; les deux cocons partagent alors la même stratégie au Cerveau et au Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-4 — Un cocon vide ouvre ses trois ateliers
**Exigences :** FR-DASH-WORKFLOW-CHOICE, NFR-UX-SCREEN-TEXT ⚠

**Gestes :**
1. À l'accueil, clique la carte « Recette vide <date> ».
2. Clique la carte **« Rédaction »**, puis reviens en cliquant le nom du cocon dans le fil d'Ariane.
3. Clique **« Moteur »**, puis reviens avec **« ← Retour au cocon »**, en bas de page.
4. Clique **« Cerveau »**, puis reviens avec le bouton retour du navigateur.

**Tu dois voir :**
- en tête : le fil d'Ariane « Dashboard / <silo> / Recette vide <date> », le nom du cocon, puis « 0 articles · 0% complété » ;
- « Choisissez une phase de travail : », puis trois cartes, toutes cliquables : « Cerveau » (« 6 étapes »), « Moteur » (« 0 mots-clés »), « Rédaction » (« 0 articles, 0% ») ;
- dans la Rédaction : « Aucun article dans cette thématique. », accent compris, et aucune liste « Articles suggérés » ;
- dans le Moteur : « Sélectionnez un article ci-dessus pour accéder au Moteur. », sans liste d'articles ;
- dans le Cerveau : la barre du haut montre Cible, Douleur, Angle, Promesse, CTA, Articles, et tu es sur Cible.

**C'est un bug si :**
- une carte est grisée ou ne s'ouvre pas ;
- un texte montre un code technique (une barre oblique inverse suivie de chiffres) à la place d'une lettre accentuée ;
- une page reste bloquée sur une roue de chargement.

**⚠ Défaut connu :** NFR-UX-SCREEN-TEXT — des textes fixes sont écrits sans accents (« Deverrouiller », « Rafraichir », « Reinitialiser », « Derniere analyse », « mots-cles », « Suggerer », « Regenerer », « Resultats SERP », « Angle differenciant », « Contexte strategique », « Differenciateur »…) et la vérification rapide ne les repère pas ; d'autres restent techniques ou en anglais : « Discovered via suggest-alphabet », niveaux affichés « INTERMEDIAIRE » ou « specifique », « (parentTitle manquant) », identifiant d'alerte « lieutenants-too-few » à la publication ; les compteurs ne s'accordent pas (« 1 articles »). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-5 — La page d'un silo : compteurs par niveau et par statut
**Exigences :** FR-DASH-NAV ⚠

**Gestes :**
1. À l'accueil, clique le nom du silo de « Recette <date> ».
2. Reviens, puis clique la roue dentée « Configuration du silo » du même silo.
3. Sous « Cocons sémantiques », clique la ligne « Recette <date> ». Reviens.
4. Dans la barre d'adresse, remplace le numéro à la fin de l'adresse par `999`, puis appuie sur Entrée.

**Tu dois voir :**
- le fil d'Ariane « Dashboard / <silo> », le nom et la description du silo ;
- les compteurs « Cocons », « Articles », « Par type » (« N Pilier », « N Inter. », « N Spéc. »), « Par statut » (« N À rédiger », « N Brouillon », « N Publié ») et « Progression » ; leurs étiquettes s'affichent en majuscules ;
- la roue dentée mène à la même page que le nom ;
- « Par type » et « Par statut » font chacun le total « Articles » ; « Progression » vaut (Brouillon + Publié) ÷ Articles, arrondi ;
- sous « Cocons sémantiques », une ligne par cocon, dont « Recette <date> » (« 2 articles », 50 %) et « Recette vide <date> » (« 0 articles », 0 %) ;
- un clic sur une ligne ouvre la page du cocon ;
- avec `999` : « Silo introuvable. » et « ← Retour au dashboard », qui ramène à l'accueil.

**C'est un bug si :**
- un total ne tombe pas juste ;
- un silo inconnu donne une page blanche, ou montre un autre silo.

> « N Brouillon » reste à 0 : aucun écran ne met aujourd'hui un article au statut « brouillon ». Un article rédigé reste « À rédiger » jusqu'à sa publication, et ne compte pas dans l'avancement. Écart signalé.

**⚠ Défaut connu :** FR-DASH-NAV — à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-6 — La page du cocon « Recette <date> » et ses repères
**Exigences :** FR-DASH-WORKFLOW-CHOICE, FR-DASH-NAV ⚠

**Gestes :**
1. Ouvre la page du cocon « Recette <date> ».
2. Clique chaque carte l'une après l'autre, en revenant à chaque fois sur la page du cocon.
3. Dans la barre d'adresse, remplace le numéro du cocon par `999999`, puis appuie sur Entrée.

**Tu dois voir :**
- le fil d'Ariane « Dashboard / <silo> / Recette <date> », où seul « Dashboard » est un lien ; puis « 2 articles · 50% complété » ;
- « Cerveau » : « 6 étapes », même si le Cerveau est terminé (ce repère ne change pas) ;
- « Moteur » : « N mots-clés », au moins 2 (le mot-clé du pilier et celui de l'enfant) ;
- « Rédaction » : « 2 articles, 50% », comme l'en-tête ;
- chaque carte ouvre son atelier pour ce cocon, et aucune n'est grisée ;
- pour un cocon inconnu : le titre « Cocon », et rien dessous. C'est le comportement actuel, sans message.

**C'est un bug si :**
- les chiffres de la carte « Rédaction » diffèrent de ceux de l'en-tête ;
- une carte ouvre l'atelier d'un autre cocon.

**⚠ Défaut connu :** FR-DASH-NAV — à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-7 — Ouvrir un article depuis la Rédaction et depuis l'arbre du Cerveau
**Exigences :** FR-DASH-NAV ⚠

**Gestes :**
1. Page du cocon « Recette <date> » : clique **« Rédaction »**.
2. Clique la carte du pilier. Reviens avec **« ← Retour à la rédaction »**.
3. Clique la carte de l'enfant, puis reviens.
4. Page du cocon : clique **« Cerveau »**, puis l'étape « Articles » dans la barre du haut.
5. Dans « Construire le cocon », clique **« Ouvrir sa rédaction »** sous le pilier. Reviens, puis clique **« Le rédiger »** sous l'enfant.

**Tu dois voir :**
- dans la Rédaction : trois colonnes « Pilier », « Intermédiaire », « Spécialisé », chacune avec son nombre ; le pilier (badge « Publié ») sous « Pilier », l'enfant (« À rédiger ») sous « Intermédiaire », et « Aucun article » sous « Spécialisé » ;
- chaque clic ouvre la rédaction guidée de l'article : « ← Retour à la rédaction » en haut, les étapes « Brief & Structure » et « Article » dans la barre du haut ;
- dans l'arbre du Cerveau : le pilier « Rédigé » avec « Ouvrir sa rédaction », l'enfant « À rédiger » avec « Le rédiger » ; les deux liens mènent à la même rédaction guidée que depuis la Rédaction.

**C'est un bug si :**
- un clic ouvre un autre article, ou une page vide ;
- un article manque dans sa colonne.

**⚠ Défaut connu :** FR-DASH-NAV — à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### DASH-8 — Six points de progression par article, au Moteur et à la Rédaction
**Exigences :** FR-DASH-PROGRESS, FR-UI-MOTEUR-SHARED

**Gestes :**
1. Page du cocon « Recette <date> » : clique **« Moteur »**. Ouvre **« Articles suggérés (N) »**.
2. Survole un à un les six petits points à droite du titre du pilier, puis ceux de l'enfant.
3. Ouvre **« Articles publiés (N) »**.
4. Page du cocon : clique **« Rédaction »**. Ouvre les deux listes du haut, puis clique un article de ces listes.
5. Regarde les cartes de l'accueil, puis l'arbre du Cerveau (étape « Articles »).

**Tu dois voir :**
- au Moteur, les articles groupés par niveau ; à droite de chaque titre, six points : deux (le groupe Explorer), un petit espace, puis quatre (le groupe Valider) ;
- au survol, dans l'ordre : « Discovery », « Radar », « Capitaine », « Lieutenants », « Structure », « Lexique » ;
- pour le pilier : les deux points Explorer vides ; Capitaine, Lieutenants et Structure pleins ; Lexique plein si tu as coché un terme à l'étape 5 du parcours express ;
- pour l'enfant, et pour une ligne de la carte qui n'est pas encore un article (s'il y en a) : six points vides ;
- ouvrir une liste referme l'autre ; le pilier publié figure aussi dans « Articles publiés », avec les mêmes points ;
- à la Rédaction, les mêmes listes avec les mêmes points, en lecture seule : un clic sur un article ne sélectionne rien ;
- aucun point sur les cartes de l'accueil, dans les colonnes de la Rédaction, ni dans l'arbre du Cerveau.

**C'est un bug si :**
- un article a plus ou moins de six points ;
- les points d'un même article diffèrent entre le Moteur et la Rédaction ;
- un point est plein pour une étape que tu n'as jamais faite.

### DASH-9 — Un point suit l'étape franchie ou retirée, sans recharger
**Exigences :** FR-DASH-PROGRESS

**Gestes :**
1. Au Moteur de « Recette <date> », ouvre « Articles suggérés » et clique l'enfant. La liste se referme toute seule : rouvre-la à chaque contrôle, sans jamais recharger la page.
2. Dans la barre du haut, clique l'onglet **« Discovery »**. Remplace le « Mot-clé racine » par `plombier toulouse`, puis clique **« Découvrir »** et attends la fin.
3. Coche deux ou trois mots-clés. Un compte à rebours « Validation Capitaine dans 5s » peut s'afficher : laisse-le finir. Clique **« Envoyer au Radar → »**, puis regarde les points de l'enfant.
4. L'onglet Radar s'ouvre : clique **« Lancer le scan »**, attends les cartes, puis regarde les points.
5. Onglet **« Capitaine »** : tape `plombier toulouse` dans « Tester un mot-clé capitaine… », appuie sur Entrée et attends que « Validation en cours... » laisse place à la carte. Clique le cadenas de la carte. Si une alarme « Avant de verrouiller le capitaine » s'ouvre avec un point 🟠, coche « J’ai lu » puis clique **« J’ai lu, je continue »**. Pour un 🔴 ou un ⛔, clique **« Revenir corriger »** et essaie une autre carte. Regarde les points.
6. Reclique le cadenas pour déverrouiller, puis regarde les points.

**Tu dois voir :**
- au départ, six points vides pour l'enfant ;
- après « Envoyer au Radar → », le 1er point (Discovery) plein ;
- après le scan, le 2e point (Radar) plein ;
- après le verrouillage, le 3e point (Capitaine, le premier du groupe Valider) plein ;
- après le déverrouillage, ce point de nouveau vide ;
- chaque changement dans la seconde, sans recharger la page, et sur l'enfant seulement.

**C'est un bug si :**
- il faut recharger la page pour voir un point changer ;
- un point change sur un autre article ;
- le point Capitaine reste plein après le déverrouillage.

> En MOCK, le filtre de pertinence simulé écarte tout mot-clé qui contient « recette » (et quelques noms de villes). Le mot-clé de l'enfant en contient un : d'où `plombier toulouse`.

### UI-1 — Au Radar, la carte de mot-clé et son score de marché
**Exigences :** FR-UI-RADAR-CARD

**Gestes :**
1. Au Moteur, enfant sélectionné, onglet **« Radar »** : les cartes du scan de DASH-9 sont affichées.
2. Survole l'anneau de score d'une carte, puis les pictogrammes à droite du mot-clé.
3. Clique le petit triangle ▶ à gauche d'une carte. Dans les questions qui s'affichent, clique une question ; clique aussi un nombre entre parenthèses, s'il y en a.
4. Coche deux cartes.

**Tu dois voir :**
- une case à cocher à gauche de chaque carte ;
- sur une ligne : ▶, le mot-clé, des pictogrammes d'intention s'il y en a (infobulles « Informationnel », « Commercial », « Transactionnel » ou « Navigationnel »), les mesures vol · KD · CPC · PAA, puis un anneau avec son chiffre et « Score KPI » dessous ;
- au survol de l'anneau, une bulle « Score KPI » : une ligne par composante, avec son poids en % et sa note sur 100, puis « Total » en /100 ;
- ▶ déplie un texte en italique, puis les questions PAA : chacune avec un badge (« Exact », « Match », « Partiel », « Hors sujet »…), les questions filles rangées sous leur mère ; un clic sur une question montre sa réponse. Sans question : « Aucune PAA trouvee » ;
- cocher encadre la carte et fait apparaître **« Envoyer au Capitaine (2) »**.

**C'est un bug si :**
- un anneau affiche « 0 » alors que sa bulle dit que le score manque : un score absent s'affiche « — » ;
- une carte n'a pas la même disposition que les autres ;
- cliquer ▶ coche ou décoche la carte.

> En MOCK, toutes les cartes ont les mêmes volumes : le bac à sable DataForSEO renvoie les mêmes chiffres pour tous les mots-clés. C'est normal.

### UI-2 — Au Capitaine, la même carte, avec un cadenas et le score de pertinence
**Exigences :** FR-UI-RADAR-CARD

**Gestes :**
1. Au Radar, clique **« Envoyer au Capitaine (2) »**.
2. Dans l'onglet Capitaine, attends que « Validation en cours... » laisse place aux deux cartes. Compare-les avec leur aspect au Radar.
3. Survole l'anneau, puis les trois petits boutons ronds à gauche d'une carte.
4. Clique ▶.

**Tu dois voir :**
- les deux cartes, avec le même en-tête qu'au Radar : ▶, mot-clé, pictogrammes, vol · KD · CPC · PAA, anneau ;
- à gauche, au lieu de la case : un cadenas (« Verrouiller »), une étiquette (« Tagger manuellement les mots (local / persona) ») et une flèche (« Recalculer le score Pertinence pour ce mot-clé ») ;
- sous l'anneau, « Score Pertinence » au lieu de « Score KPI » ; au survol, les composantes « Pain × Mot-clé », « PAA × Douleur », « Autocomplete × Douleur », « Racines », « Intent × Douleur », ou une phrase qui dit pourquoi le score manque (par exemple « Score Pertinence indisponible… ») ;
- pour un mot-clé de trois mots ou plus, les mots après les deux premiers sont cliquables ;
- ▶ déplie le même arbre de questions qu'au Radar.

**C'est un bug si :**
- l'en-tête diffère de celui du Radar (ordre, mesure manquante) ;
- un score absent s'affiche « 0 » au lieu de « — » ;
- une carte du Capitaine montre une case à cocher.

### UI-3 — L'avis expert IA suit la carte choisie
**Exigences :** FR-UI-AI-PANELS-PATTERN ⚠

**Gestes :**
1. Au Capitaine de l'enfant, clique le corps d'une carte, pas son cadenas.
2. Dans la fiche qui s'ouvre à droite, trouve le bloc « Avis expert IA » et clique son en-tête.
3. Clique **« Régénérer »**, puis **« Annuler »** dans la fenêtre qui s'ouvre. Recommence, et cette fois clique **« OK »**.
4. Ferme la fiche avec ×. Clique une autre carte.
5. Tape `plombier toulouse dimanche` dans « Tester un mot-clé capitaine… », appuie sur Entrée, et clique aussitôt la nouvelle ligne, pendant « Validation en cours... ».

**Tu dois voir :**
- la fiche « Capitaine » : le mot-clé, son verdict, « KPIs marché », puis « Avis expert IA », sous-titré « Analyse Capitaine basée sur les KPIs marché et la pertinence. » ;
- replié, le bloc dit « Cliquez pour voir les suggestions IA. » (avis déjà écrit) ou « Cliquez pour lancer l'analyse IA. » ;
- déplié : le verdict en tête, puis l'avis ; en MOCK, un avis préparé en trois parties (« 1. Potentiel éditorial », « 2. Opportunités et risques », « 3. Recommandation ») qui cite le mot-clé de la carte ;
- « Régénérer » demande « Régénérer l'avis expert IA ? Cela consommera un appel Claude. » ; « Annuler » ne change rien ; « OK » réécrit l'avis, et le bloc reste ouvert ;
- fiche fermée, l'avis disparaît avec elle ; l'autre carte a son propre avis ;
- pour la nouvelle carte, le bloc se déplie tout seul quand l'avis commence à s'écrire. En MOCK c'est très rapide : si l'avis est déjà fini quand la fiche s'ouvre, le bloc reste replié, c'est normal.

**C'est un bug si :**
- l'avis d'une carte s'affiche dans la fiche d'une autre ;
- « Régénérer » relance sans rien demander ;
- le bloc se replie tout seul après l'analyse.

**⚠ Défaut connu :** le panneau du Lexique n'apparaît qu'après le calcul TF-IDF, celui des Lieutenants qu'après l'analyse des résultats Google, et le panneau « Analyse IA du Brief » de la rédaction n'a ni la structure commune ni d'état « erreur ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### UI-4 — « Verrouiller » et « Déverrouiller », jamais « Valider » pour un mot-clé
**Exigences :** FR-UI-VOCABULAIRE-VERROUILLER ⚠

**Gestes :**
1. Au Capitaine de l'enfant, survole le cadenas de la carte `plombier toulouse`. Clique-le (réponds à l'alarme comme en DASH-9), survole-le de nouveau, puis reclique pour déverrouiller.
2. Parcours les onglets Capitaine, Lieutenants et Lexique de l'enfant, puis ceux du pilier : lis tous les boutons.
3. Au pilier, onglet Lexique : regarde sous les listes de termes. Onglet Structure : survole, sans cliquer, le petit cadenas devant un titre.

**Tu dois voir :**
- l'infobulle « Verrouiller », puis, une fois la carte verrouillée (cadenas vert plein), « Déverrouiller » ;
- au Lexique du pilier, « N terme(s) verrouillé(s) » si des termes sont cochés ;
- à la Structure, « Verrouiller — l'IA conservera ce titre tel quel » ;
- aucun bouton « Valider ce Capitaine », « Valider les Lieutenants » ni « Valider le Lexique ».

**C'est un bug si :**
- un de ces trois libellés apparaît ;
- l'infobulle d'un cadenas parle de « Valider ».

> L'exigence cite un bouton « Verrouiller ce mot-clé » au Capitaine. L'écran ne l'a plus : le cadenas le remplace. Écart signalé, ce n'est pas un défaut de recette.

**⚠ Défaut connu :** FR-UI-VOCABULAIRE-VERROUILLER — les cadenas des titres de la structure disent « Deverrouiller », sans accent. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### UI-5 — Les panneaux d'IA de Discovery et du Radar, du repos au résultat
**Exigences :** FR-UI-AI-PANELS-PATTERN ⚠

**Gestes :**
1. Recharge la page du Moteur (F5). Ouvre « Articles suggérés », clique l'enfant, puis l'onglet **« Discovery »**.
2. Descends jusqu'au panneau « Analyse IA Discovery » et clique son en-tête.
3. Remplace le « Mot-clé racine » par `plombier toulouse`. Si une ligne propose de charger une découverte enregistrée, ignore-la. Clique **« Découvrir »** et regarde le panneau pendant le filtrage.
4. À la fin, clique **« Analyser les N résultats pertinents »**.
5. Clique **« Relancer l'analyse »**, puis **« Annuler »**. Replie le panneau en cliquant son en-tête.
6. Onglet **« Radar »** : descends jusqu'au panneau « Suggestions IA Radar ». Puis, dans l'invite « Charger Radar » en bas de l'écran, clique le bouton **« DB »**.
7. Coche un candidat dans le panneau.

**Tu dois voir :**
- « Analyse IA Discovery » présent dès l'arrivée sur l'onglet, replié sur « Cliquez pour lancer l'analyse IA. » ;
- déplié avant la découverte : « Lance d'abord une découverte de mots-clés ci-dessus, puis l'IA pourra analyser et te proposer une sélection stratégique. », et le bouton « Analyser les résultats pertinents » grisé ;
- pendant le filtrage, « Filtrage de pertinence en cours… » ; ensuite « Prêt à analyser N mots-clés pertinents. » et le bouton actif ;
- pendant l'analyse, des lignes grises animées et « Analyse en cours… » sur le bouton ; puis une sélection de mots-clés, et le bouton devient « Relancer l'analyse » ;
- « Relancer l'analyse » demande « Relancer l'analyse IA ? Cela consommera un appel Claude. » ; « Annuler » ne relance rien ;
- replié après un résultat : « Cliquez pour voir les suggestions IA. » ;
- « Suggestions IA Radar » présent avant tout chargement, avec « Lance un scan ci-dessus pour voir ici les meilleurs candidats… » et « Marquer comme candidats Capitaine (0) » grisé ;
- après « DB » : les cartes du scan reviennent, et le panneau liste au plus cinq candidats, chacun avec une pastille « M » (marché) et une pastille « P » (pertinence) ; cocher active « Marquer comme candidats Capitaine (1) ».

**C'est un bug si :**
- un panneau manque en arrivant sur son onglet ;
- un bouton d'analyse est cliquable alors que son préalable manque ;
- « Relancer l'analyse » part sans confirmation.

> Si le panneau Discovery passe au rouge, c'est l'état « erreur » : note le message. Le panneau du Radar n'appelle aucune IA, c'est un classement local des cartes.

**⚠ Défaut connu :** le panneau du Lexique n'apparaît qu'après le calcul TF-IDF, celui des Lieutenants qu'après l'analyse des résultats Google, et le panneau « Analyse IA du Brief » de la rédaction n'a ni la structure commune ni d'état « erreur ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### UI-6 — Les panneaux d'IA des Lieutenants et du Lexique n'existent qu'après l'analyse
**Exigences :** FR-UI-AI-PANELS-PATTERN ⚠

**Gestes :**
1. Enfant, Capitaine déverrouillé : onglet **« Lieutenants »**, descends jusqu'en bas. Puis onglet **« Lexique »**, pareil.
2. Pilier : onglet **« Lieutenants »**. Si rien n'apparaît sous « Analyser SERP », clique **« DB »** dans l'invite « Charger Lieutenants », en bas de l'écran. Descends jusqu'au panneau « Suggestions IA Lieutenants », sans cliquer son bouton.
3. Pilier : onglet **« Lexique »**. Regarde le panneau « Analyse IA Lexique » dès l'ouverture de l'onglet.

**Tu dois voir :**
- enfant, Lieutenants : « Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP. », et aucun panneau « Suggestions IA Lieutenants » (défaut connu) ;
- enfant, Lexique : « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. », et aucun panneau « Analyse IA Lexique » (défaut connu) ;
- pilier, Lieutenants : « Suggestions IA Lieutenants », avec sa propre présentation (pas d'en-tête repliable), puis « N propositions générées par l'IA. » et « Régénérer les suggestions », ou « Aucune génération IA pour ce Capitaine. » et « Lancer une suggestion IA » ;
- pilier, Lexique : « Analyse IA Lexique » présent, qui peut se déplier tout seul pendant une analyse relancée à l'ouverture (quand aucune analyse n'est encore enregistrée), puis reste ouvert. Juste après une analyse, il revient au repos : « Lance l'analyse IA pour obtenir des recommandations sur les termes TF-IDF. » et « Analyser avec l'IA », alors que les termes portent leurs badges ; après un rechargement, il affiche « N termes analysés — 0 recommandés · 0 écartés. », et les badges ont disparu (le panneau et les badges lisent deux listes différentes : défaut connu de FR-LEX-AI-PANEL). Ou il montre une erreur lisible, si l'extraction n'a trouvé aucun terme.

**C'est un bug si :**
- au pilier, l'un de ces deux panneaux manque ;
- le panneau du Lexique se replie tout seul après l'analyse.

> En MOCK, l'analyse préparée donne un avis par terme reçu (badges, raisons, termes manquants) : ce qui manque au panneau vient de l'écran, pas de la simulation. Le résultat complet « N termes analysés — X recommandés · Y écartés. » attend la correction de FR-LEX-AI-PANEL. Autre écart signalé : « Régénérer les suggestions » des Lieutenants part sans confirmation, contrairement aux autres panneaux.

**⚠ Défaut connu :** le panneau du Lexique n'apparaît qu'après le calcul TF-IDF, celui des Lieutenants qu'après l'analyse des résultats Google, et le panneau « Analyse IA du Brief » de la rédaction n'a ni la structure commune ni d'état « erreur ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### UI-7 — Le bandeau « Résultats déjà calculés » et l'invite « Charger »
**Exigences :** FR-UI-MOTEUR-SHARED

**Gestes :**
1. Au Moteur, choisis le pilier. Regarde le bandeau collé en bas de l'écran, et survole chacune de ses pastilles.
2. Onglet **« Capitaine »**. Dans l'invite « Charger Capitaine », survole puis clique le bouton **« DB »**.
3. Ferme l'invite avec ×. Va sur Lieutenants, puis reviens au Capitaine.
4. Va sur Structure, puis sur Discovery.
5. Choisis l'enfant et relance **« Lancer le scan »** au Radar. Regarde la pastille Radar. Si **« Vider le cache »** apparaît, survole-le, puis clique-le.

**Tu dois voir :**
- en bas, « Résultats déjà calculés » et quatre pastilles, « Radar », « Capitaine », « Lieutenants », « Lexique », chacune avec « DB » et « C » suivis d'un nombre ; une pastille à 0 partout reste visible, en pâle ;
- au survol, un détail, par exemple « N mots-clés testés — verrouillé : … » pour le Capitaine, ou « N propositions en base · 1 verrouillé » pour les Lieutenants ;
- à droite du bandeau, « Charger Capitaine » avec un bouton « DB » suivi d'un nombre, et une infobulle « Charger … depuis la base de données » ; le clic n'ajoute aucun doublon dans la liste ;
- × referme l'invite ; elle revient quand tu reviens sur l'onglet ;
- aucune invite sur Structure ni Discovery (ni sur Finalisation) ;
- après le scan de l'enfant, la pastille Radar peut afficher « C 1 » (un scan gardé en mémoire). Alors seulement, « Vider le cache » apparaît, avec l'infobulle « Vide le cache externe (autocomplete, PAA, SERP, validate) pour cet article. La base de données n'est pas affectée. » ; après le clic, aucun nombre « DB » ne bouge.

**C'est un bug si :**
- le bandeau change d'aspect ou de place selon l'onglet ;
- l'invite ne revient jamais après ×, même en changeant d'onglet ;
- « DB » crée des doublons ;
- « Vider le cache » fait baisser un nombre « DB ».

### UI-8 — Des suggestions de mots-clés aux Lieutenants et au Lexique
**Exigences :** FR-UI-MOTEUR-SHARED

**Gestes :**
1. Enfant, onglet **« Lieutenants »** : regarde le haut de l'onglet.
2. Clique **« Ajouter »** sur une suggestion. Ne coche pas la carte créée.
3. Onglet **« Lexique »** : regarde le haut de l'onglet, sans cliquer « Ajouter » (ici, l'ajout est enregistré).
4. Clique le × du panneau de suggestions du Lexique.
5. Pilier : onglets **« Lieutenants »** et **« Lexique »**.

**Tu dois voir :**
- « 💡 Suggestions pour vos Lieutenants » : au plus dix mots-clés, tirés du scan Radar de l'enfant, chacun avec un bouton « Ajouter » ;
- après « Ajouter » : le mot-clé quitte les suggestions, et une carte apparaît dans les propositions, avec le score « — » (infobulle « Score IA non fourni ») et « H2 ». Le bloc des propositions apparaît alors, et avec lui le panneau « Suggestions IA Lieutenants » ;
- « 💡 Suggestions pour votre Lexique » : les mêmes mots-clés, avec « Ajouter » ;
- × masque le panneau ;
- au pilier, qui n'a pas de scan Radar : aucun panneau de suggestions, ni aux Lieutenants ni au Lexique.

**C'est un bug si :**
- plus de dix suggestions s'affichent ;
- un mot-clé déjà présent dans les propositions reste suggéré ;
- un panneau de suggestions vide s'affiche au pilier.

> La carte ajoutée porte la raison « Proposé depuis votre panier », alors que le panier n'existe plus. Écart de libellé signalé.

### UI-9 — La même barre de panneaux dans la rédaction guidée et dans l'éditeur
**Exigences :** FR-UI-ARTICLE-SHARED

**Gestes :**
1. Page du cocon → **« Rédaction »** → carte de l'enfant (« À rédiger »).
2. Lis la barre en haut. Survole chaque bouton, puis clique **« GEO »**.
3. Regarde le panneau ouvert à droite. Appuie sur Échap, puis clique **« SEO »**.
4. **« ← Retour à la rédaction »**, puis la carte du pilier. Clique **« Enrichir »**. Élargis le panneau en tirant son bord gauche.
5. Clique l'étape **« Article »** dans la barre du haut. Regarde sous le texte. Clique **« Éditer l'article »**.
6. Dans l'éditeur, lis la barre, puis regarde sous le texte.

**Tu dois voir :**
- vue guidée : « SEO », « GEO », « Maillage », « Enrichir », « IA Brief », et pas de « Blocs » ;
- enfant, sans texte : « SEO », « GEO », « Maillage » et « Enrichir » grisés, infobulles « Generez un article pour activer le scoring SEO », « Generez un article pour activer le scoring GEO », « Generez un article pour activer le maillage », « Rédigez le premier jet pour l’enrichir » ; « IA Brief » reste actif ; un clic sur « GEO » ne fait rien ;
- à droite, le panneau SEO ouvert d'office, voilé par « Generez un article pour activer ce panneau » ; Échap le ferme, et « SEO » ne le rouvre pas ;
- pilier : les mêmes boutons, tous actifs ; « Enrichir » ouvre « Enrichir l’article », et le panneau s'élargit ;
- vue guidée du pilier : le compteur « N mots / N cible » sous le texte ;
- éditeur : « SEO », « GEO », « Maillage », « Enrichir », « Blocs », et pas d'« IA Brief » ; « Blocs » ouvert d'office, à la largeur choisie à l'étape 4 ; « ← Retour » en haut à gauche ; aucun compteur de mots.

**C'est un bug si :**
- un bouton de panneau est actif sur un article sans texte (« IA Brief » excepté) ;
- « IA Brief » apparaît dans l'éditeur, ou « Blocs » dans la vue guidée ;
- la largeur du panneau n'est pas la même dans les deux vues.

### UI-10 — Le panneau « Analyse IA du Brief »
**Exigences :** FR-UI-AI-PANELS-PATTERN ⚠

**Gestes :**
1. Rédaction guidée du pilier : clique **« IA Brief »**.
2. Attends la fin, puis clique **« Relancer l'analyse »**.
3. Reclique **« IA Brief »** pour fermer le panneau, puis rouvre-le.

**Tu dois voir :**
- à droite, « Analyse IA du Brief » et le bouton « Relancer l'analyse » ; l'analyse part toute seule à la première ouverture (« Analyse en cours... »), puis un texte s'affiche (simulé en MOCK) ;
- « Relancer l'analyse » repart sans confirmation, et le bouton reste grisé pendant l'analyse ;
- à la réouverture, le texte est toujours là, sans nouvelle analyse.

**C'est un bug si :**
- l'analyse ne démarre pas, ou le panneau reste vide sans message ;
- « IA Brief » est grisé.

**⚠ Défaut connu :** le panneau du Lexique n'apparaît qu'après le calcul TF-IDF, celui des Lieutenants qu'après l'analyse des résultats Google, et le panneau « Analyse IA du Brief » de la rédaction n'a ni la structure commune ni d'état « erreur ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### UI-11 — La même génération dans les deux vues, les coûts dans la vue guidée
**Exigences :** FR-UI-ARTICLE-SHARED

*(Facultatif, à faire en dernier : cette vérification réécrit le texte du pilier. L'image fournie à l'étape 10 du parcours express et le lien interne disparaissent. Gratuit en MOCK.)*

**Gestes :**
1. Rédaction guidée du pilier, étape « Article » : clique **« Régénérer l'article »**.
2. Si une alarme « Avant d’accepter le premier jet » s'ouvre, lis-la et réponds-y.
3. Clique **« Éditer l'article »**. Dans l'éditeur, clique **« Régénérer l'article »**.

**Tu dois voir :**
- dans les deux vues, pendant l'écriture, la même barre « Section n/N » suivie du titre du chapitre (en MOCK, elle défile vite) ;
- vue guidée, à la fin : des badges « Article » et « Meta » (jetons et coût, « < $0.01 » en MOCK), et le compteur « N mots / N cible » ;
- éditeur : ni badge de coût, ni compteur de mots.

**C'est un bug si :**
- la barre « Section n/N » manque dans une des deux vues ;
- un badge de coût apparaît dans l'éditeur.

## En mode RÉEL (payant)

### UI-R1 — La carte de mot-clé avec de vraies mesures
**Exigences :** FR-UI-RADAR-CARD
**Mode :** RÉEL (payant)
**Gestes :**
1. Passe le bouton en **RÉEL**. Prends l'article de ton essai RÉEL (voir « À vérifier en mode RÉEL » dans la recette manuelle), onglet Radar.
2. Ajoute trois mots-clés proches avec « Ajouter un mot-clé à scanner… » et **« + Ajouter »**. Clique **« Lancer le scan »**.
3. Clique **« Score KPI »** dans la barre de tri.
4. Coche les trois cartes et clique **« Envoyer au Capitaine (3) »**.
5. Repasse en **MOCK**.

**Tu dois voir :**
- des volumes, des KD et des CPC différents d'une carte à l'autre, et des pictogrammes d'intention variés ;
- des anneaux de couleurs différentes, du rouge (score bas) au vert (score haut) ; le tri « Score KPI » range les cartes par score ;
- au Capitaine, un « Score Pertinence » propre à chaque carte, distinct de son « Score KPI » ;
- une mesure absente affichée « — », jamais 0.

**C'est un bug si :**
- deux mots-clés différents ont exactement les mêmes mesures ;
- un anneau affiche 0 alors que sa bulle dit « indisponible ».

> Le scan Radar n'annonce pas son prix avant de partir : son coût s'affiche ensuite dans la pastille des coûts, en bas de l'écran. Écart signalé.

### UI-R2 — Le panneau « Analyse IA Lexique » avec un vrai résultat
**Exigences :** FR-UI-AI-PANELS-PATTERN ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. En **RÉEL**, même article, Capitaine verrouillé : onglet Lexique.
2. Si « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » s'affiche, clique **« Lancer l'analyse SERP (~$0.003 DataForSEO) »**, puis **« Confirmer (~$0.003) »**. Sinon, clique **« Extraire le Lexique »**.
3. Regarde le panneau « Analyse IA Lexique » pendant l'analyse, puis déplie-le si besoin.
4. Clique **« Régénérer l'analyse »**, puis **« Annuler »**.
5. Repasse en **MOCK**.

**Tu dois voir :**
- le prix annoncé avant l'extraction ;
- le panneau qui apparaît sous les termes et se déplie seul pendant l'analyse ;
- « N termes analysés — X recommandés · Y écartés. », puis « Les badges IA sont visibles dans le tableau TF-IDF ci-dessus. » ;
- « Régénérer l'analyse » demande « Régénérer l'analyse IA Lexique ? Cela consommera un appel Claude. » ; « Annuler » ne relance rien.

**C'est un bug si :**
- « Régénérer l'analyse » part sans confirmation ;
- X + Y ne fait pas N.

**⚠ Défaut connu :** le panneau du Lexique n'apparaît qu'après le calcul TF-IDF, celui des Lieutenants qu'après l'analyse des résultats Google, et le panneau « Analyse IA du Brief » de la rédaction n'a ni la structure commune ni d'état « erreur ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## Hors recette

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
