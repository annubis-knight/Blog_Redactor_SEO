---
title: Recette manuelle — Blog Redactor SEO
version: 2.0.0
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md (NFR-TEST-RECETTE-COVERAGE)
  - spec/recette/ (les modules par domaine)
  - design/07-tests-et-outillage.md
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md
---

# Recette manuelle

Une **recette**, c'est toi qui essaies l'outil comme un vrai utilisateur, pour vérifier qu'il fait ce que tu attends.

- **Les tests automatiques** vérifient ce qu'on a pensé à écrire, des milliers de fois, sans se lasser.
- **La recette** attrape ce qu'aucun test ne prévoit : un bouton peu clair, un message qui ne veut rien dire, une étape qui bloque sans raison.

Les deux sont utiles, aucun ne remplace l'autre.

La recette a deux niveaux :

| Niveau | Quand | Durée |
|---|---|---|
| **Le parcours express** (ci-dessous) | Avant chaque fusion d'un chantier dans `main` | ~45 min |
| **Les modules** (un par domaine, [liste plus bas](#les-modules)) | Après un chantier qui touche ce domaine, et tous ensemble avant une version importante | 30 à 90 min chacun |

**Exhaustive :** chaque exigence fonctionnelle de [`requirements.md`](requirements.md) est vérifiée par au moins une vérification, ou listée « hors recette » avec sa raison (rien à voir à l'écran, ou pas encore livrée). Un test automatique le garantit (`NFR-TEST-RECETTE-COVERAGE`) : une exigence nouvelle ne peut pas être oubliée.

**D'où viennent ces vérifications :** des exigences et de leurs critères. Les libellés cités sont ceux de l'écran, relevés dans le code le 2026-09-28.

---

## Avant de commencer

1. Lance `npm run dev`, puis ouvre http://localhost:5400.
2. En haut à droite de la barre, un bouton affiche **MOCK** ou **RÉEL**. Il doit afficher **MOCK** ; sinon, clique dessus.
   - **MOCK** : l'IA répond par des textes préparés à l'avance, et DataForSEO renvoie des données factices depuis son bac à sable. C'est **gratuit**.
   - **RÉEL** : l'IA et DataForSEO travaillent pour de vrai. C'est **payant**, dans la limite d'un plafond de dépense DataForSEO par demi-heure : `DATAFORSEO_COST_BUDGET_USD` dans `.env` (2 $ sur ton poste), 0,50 $ si rien n'est réglé.
   - Ce réglage vaut pour tout le serveur, et il reste actif tant que tu ne le changes pas.
3. Garde une connexion internet : les suggestions de Google sont réelles, même en MOCK.
4. Pour chaque vérification, note ✅ ou ❌. En cas de ❌, fais une capture d'écran et note le code de la vérification (« Étape 4 », « RAD-7 »…) : c'est tout ce qu'il faut pour corriger.

### L'alarme, en 30 secondes

Plusieurs étapes passent par une **porte** : avant de valider, l'outil vérifie les données et, s'il y a un souci, ouvre une alarme au titre « Avant de … ». Chaque point a un niveau :

| Niveau | Ce que ça veut dire | Pour passer outre |
|---|---|---|
| 🟠 Attention | À lire | Cocher « J'ai lu » |
| 🔴 Risque | Un vrai risque SEO | Choisir une catégorie **et** écrire une raison d'au moins 20 caractères |
| ⛔ À corriger | Un défaut technique | Impossible : il faut corriger |

« Revenir corriger », ou la touche Échap, ferme l'alarme sans rien valider.

### Comment lire une vérification

- **Exigences :** les identifiants qu'elle vérifie, à retrouver dans [`requirements.md`](requirements.md).
- **⚠** après un identifiant : l'exigence est **non tenue**, c'est un défaut connu. La ligne « **⚠ Défaut connu :** » dit ce que tu devrais voir de travers. Si tout marche comme prévu, le défaut a peut-être disparu : note-le, c'est une bonne nouvelle à confirmer.
- **Gestes**, puis **Tu dois voir**, puis **C'est un bug si** : ce que tu fais, ce qui doit se passer, ce qui serait un défaut.
- **Hors recette**, en fin de module : les exigences de ce domaine qu'on ne peut pas voir à l'écran, avec la raison. Les tests automatiques les couvrent.

---

## Le parcours express

Les étapes s'enchaînent : chacune prépare la suivante. Fais-les dans l'ordre. Elles laissent un cocon « Recette <date> » que tous les modules réutilisent.

### Étape 1 — Créer un cocon et son pilier (Cerveau)
**Exigences :** FR-DASH-COCOON-CREATE ⚠, FR-CER-STEPS-COCOON ⚠, FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-KEYWORD-REAL-DATA

**Ce que ça protège :** un cocon se construit **à partir de son pilier**. Avant, on générait tous les articles d'un coup, sans mots-clés mesurés.

**Gestes :**
1. Sur l'accueil, chaque silo se termine par une carte en pointillés **« Nouveau cocon »**. Si tu ne la vois pas, fais défiler vers la droite.
2. Clique dessus, tape `Recette <date du jour>`, puis appuie sur Entrée.
3. Sur la page du cocon, clique sur la carte **« Cerveau »**.
4. Remplis les 5 étapes : Cible, Douleur, Angle, Promesse, CTA. Pour chacune :
   - écris dans le champ « Décrivez... » ;
   - clique **« Valider ▾ »**, puis **« Mon texte »** ;
   - clique **« Suivant »**. Après la 5ᵉ, tu arrives à la 6ᵉ étape, « Articles ».
5. L'étape « Articles » montre deux blocs l'un sous l'autre :
   - **en haut, « Construire le cocon »** : c'est lui qui crée les vrais articles. Il dit « Ce cocon n'a pas encore de pilier. Commencez par lui… » ;
   - **en dessous, « Carte indicative du cocon »** : un aperçu, qui ne crée rien.

   *(Facultatif, pour voir la carte grandir.)* Dans la carte, ouvre le menu **« Générer avec Claude ▾ »** et choisis **« Le pilier »**. Rouvre-le, puis choisis **« 1 article intermédiaire »**, et enfin **« 1 article spécialisé »**.
6. En haut, clique **« Créer le pilier »**. Dans le panneau « Le pilier du cocon » :
   - attends la fin de « Recherche de mots-clés candidats, puis mesure de leurs données réelles… » ;
   - choisis un mot-clé dans la liste ;
   - vérifie le titre, puis clique **« Créer l'article »**.
7. En bas de la page, le bouton est devenu **« Terminer le brainstorm »** : clique-le. Tu reviens sur la page du cocon. Sans ce clic, l'étape « Article » de la Rédaction reste verrouillée dans la barre du haut.

**Tu dois voir :**
- tant que le pilier n'existe pas, **un seul** bouton de création dans « Construire le cocon » : « Créer le pilier » ;
- si tu as fait le geste facultatif :
  - le menu « Générer avec Claude ▾ » commence par « Sur la carte seulement : aucun article n'est créé. ». Sur une carte vide, il ne propose que « Le pilier » et « La carte complète du cocon » ;
  - après « Le pilier », une ligne dans la colonne Pilier de la carte. Dans le menu, « Le pilier » est **grisé** (« Déjà sur la carte : un seul pilier par cocon. »), et « 1 article intermédiaire » apparaît ;
  - après « 1 article intermédiaire », une ligne dans la colonne Intermédiaire, et « 1 article spécialisé » apparaît dans le menu ;
  - après « 1 article spécialisé », une ligne dans la colonne Spécialisé, rangée sous le titre de son intermédiaire ;
- après « Créer l'article », dans « Construire le cocon » : le pilier avec le badge « Pilier », l'état « À rédiger », et « Pas encore de section : elles apparaissent quand sa structure est validée ou son texte rédigé ». Le pilier créé s'inscrit aussi sur la carte, avec la marque « Créé ».

> La carte et l'arbre sont deux listes. Si le vrai pilier n'a pas le même titre que celui posé sur la carte, la carte montre ensuite deux piliers. C'est connu, pas un bug.

**C'est un bug si :**
- on peut créer un autre article avant le pilier ;
- un choix du menu « Générer avec Claude ▾ » fait apparaître un article dans « Construire le cocon » ;
- le menu propose un intermédiaire alors que la carte n'a pas de pilier, ou un spécialisé alors qu'elle n'a pas d'intermédiaire ;
- un candidat « Non mesuré » peut être choisi.

**⚠ Défaut connu :** relancer « La carte complète du cocon » **après** avoir créé un article retire cet article de la carte, et donc de la liste du Moteur. Il reste dans « Construire le cocon ». Ne le fais pas pendant la recette : le module Cerveau le vérifie sur un cocon jetable.

**⚠ Défaut connu :** FR-DASH-COCOON-CREATE — un nom qui ne diffère d'un cocon existant que par les majuscules ou les accents, ou le même nom dans un autre silo, est accepté ; les deux cocons partagent alors la même stratégie au Cerveau et au Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-CER-STEPS-COCOON — à l'étape CTA, « + » (approfondir) échoue sans rien afficher : aucune sous-question n'apparaît. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### Étape 2 — L'ordre des onglets du Moteur
**Exigences :** FR-MOT-PHASES, FR-MOT-PHASE-TRANSITION, FR-HN-TAB ⚠

**Ce que ça protège :** le nouvel onglet **Structure** (chantier C6), placé entre Lieutenants et Lexique.

**Gestes :**
1. Reviens sur la page du cocon et clique sur la carte **« Moteur »**.
2. Ouvre **« Articles suggérés »**, puis clique sur le titre du pilier.

**Tu dois voir :**
- en haut, trois groupes d'onglets : « 1 Générer » (Discovery, Radar), « 2 Valider » (Capitaine, Lieutenants, **Structure**, Lexique), « 3 Finaliser » (Finalisation) ;
- en bas, un bouton **« Continuer vers <onglet suivant> → »** : depuis Lieutenants, il dit « Continuer vers Structure → ».

**C'est un bug si :**
- Structure manque ou n'est pas entre Lieutenants et Lexique ;
- le bouton du bas nomme le mauvais onglet.

**⚠ Défaut connu :** si l'enregistrement de la structure est refusé, la validation s'arrête sans aucun message à l'écran (seul le refus du sommaire est dit). Ce parcours ne le provoque pas.

### Étape 3 — Le Capitaine et l'alarme 🟠
**Exigences :** FR-CAP-INPUT ⚠, FR-CAP-LOCK-GATE, FR-INFRA-VERIFIER-SHARED

**Ce que ça protège :** on ne verrouille plus un mot-clé risqué sans le savoir.

**Gestes :**
1. Onglet **Capitaine**. Dans « Tester un mot-clé capitaine… », tape un mot-clé absurde, par exemple `zqxw plomberie kvj`, puis appuie sur Entrée.
2. Attends que la carte ait fini sa « Validation… ».
3. Clique sur le **cadenas** de la carte (infobulle « Verrouiller »).

**Tu dois voir :**
- une alarme « Avant de verrouiller le capitaine » avec un point 🟠 : « Google ne suggère pas cette requête quand on commence à la taper » ;
- une case « J'ai lu » et un bouton « J'ai lu, je continue » ;
- après avoir coché la case et cliqué, la carte verrouillée.

**Ensuite,** déverrouille ce mot-clé et verrouille à la place un mot-clé sensé pour ton pilier, par exemple le mot-clé choisi à l'étape 1.

**C'est un bug si :**
- le cadenas verrouille sans alarme, **alors que tu as internet**. Sans connexion, l'appel à Google échoue, et l'outil ne signale rien ;
- le bouton reste grisé alors que la case est cochée.

> **En MOCK, impossible d'obtenir l'alarme 🔴 « 0 recherche par mois » par l'écran.** Le bac à sable renvoie les mêmes volumes pour tous les mots-clés. Le 🔴 et la règle des 20 caractères se testent à l'étape 4.

**⚠ Défaut connu :** FR-CAP-INPUT — ré-étudier un mot-clé déjà présent ne lève pas l'erreur précédente : la carte reste sur « Erreur : … » même si la nouvelle étude réussit ; la carte prend aussi la casse tapée, et un Capitaine verrouillé retapé dans une autre casse perd son cadenas vert et sa place en tête. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### Étape 4 — Lieutenants et Structure : l'alarme 🔴
**Exigences :** FR-LIE-LOCK-GATE, FR-INFRA-GATE-WAIVER, FR-HN-LOCK-GATE, FR-CER-PARENT-WRITTEN-GATE

**Ce que ça protège :** un pilier a besoin d'au moins 3 lieutenants, et une dérogation doit être **justifiée**.

**Gestes :**
1. Onglet **Lieutenants**.
   - Si une invite « Charger… » apparaît, clique le bouton « DB ».
   - Sinon, clique **« Analyser SERP »** et attends les propositions.
2. Coche **une seule** proposition.
3. Un bandeau apparaît : « Étape non validée. 1 lieutenant pour un article Pilier : le minimum conseillé est 3. » Clique **« Voir pourquoi / décider »**. Sous le point 🔴, « À la place : » propose les autres propositions, non cochées.
4. Dans l'alarme 🔴, choisis une catégorie dans « Pourquoi passer outre ? », puis tape dans « Votre raison » une phrase de **19 caractères**, par exemple `Mot-clé très locale`.
5. Ajoute un point final, pour passer à **20 caractères**.
6. Clique **« Je prends la responsabilité et je continue »**. Tu assumes ce choix : la dérogation est enregistrée, et tu la reverras à l'étape 10.
7. Onglet **Structure** : clique **« Générer la structure »**, puis **« Valider la structure »**.
8. *(Facultatif, pour voir un refus.)* Reviens au Cerveau, étape « Articles ». Les sections du pilier sont apparues, mais le bouton « Créer l'article de cette section » est **grisé**, avec en orange : « Validez d'abord le premier jet de « … » : un article ne naît que d'un parent rédigé ».

**Tu dois voir :**
- à 19 caractères, le compteur « 19 / 20 » en rouge et le bouton « Je prends la responsabilité et je continue » **grisé** ;
- à 20 caractères, avec une catégorie choisie, le bouton **actif** ;
- après ton clic, l'étape Lieutenants validée ;
- une structure H1/H2/H3 qui reprend le lieutenant retenu, puis validée. Si une alarme s'ouvre, lis-la et réponds-y.

**C'est un bug si :**
- on peut valider avec moins de 20 caractères ou sans catégorie ;
- avec 3 lieutenants cochés, le bandeau reste affiché (essaie-le sur un autre article, si tu veux).

### Étape 5 — Le Lexique
**Exigences :** FR-LEX-METIER-ONLY, FR-LEX-PRECHECK-PERSISTE

**Ce que ça protège :** le lexique ne garde que des mots du métier, sans mots vides ni morceaux de menu.

**Gestes :**
1. Onglet **Lexique**. Clique **« Extraire le Lexique »**.
2. Si le message « Le scrape SERP n'est pas encore disponible » apparaît, lance l'analyse proposée, puis confirme.
3. Coche au moins un terme.

**Tu dois voir :**
- trois listes (Obligatoire, Differenciateur, Optionnel), sans « être », « votre », « vos », « nos », « cookies », « mentions » ni « newsletter » ;
- aucun terme coché d'avance : c'est toi qui choisis.

**C'est un bug si :** un de ces mots apparaît.

> **En MOCK, les termes sont peu représentatifs, voire absents** : les pages analysées viennent du bac à sable. Cette vérification n'a de vrai sens qu'en RÉEL (voir plus bas).

### Étape 6 — La Rédaction : le premier jet
**Exigences :** FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE, FR-RED-GEN-UNLOCK ⚠

**Ce que ça protège :** l'article s'écrit d'un trait, et il ne sert de parent qu'une fois son premier jet accepté.

**Gestes :**
1. Depuis l'arbre du Cerveau (lien « Le rédiger »), ou depuis la page du cocon puis « Rédaction » et la carte de l'article.
2. Bloc « Micro-contexte article » : remplis au moins « Angle differenciant ».
3. Si **« Valider le sommaire »** est affiché, clique-le : il t'amène directement à l'étape Article. Si le sommaire est déjà validé, clique **« Continuer vers l'Article »**.
4. Clique **« Générer l'article »**.

**Tu dois voir :**
- pendant l'écriture, « Section n/N » avec le titre du chapitre (en MOCK, ça défile très vite) ;
- à la fin, le bouton « Régénérer l'article » ;
- le message « ✓ Premier jet accepté : l'article peut donner naissance à ses articles enfants dans le cocon. »
- Si une alarme « Avant d'accepter le premier jet » s'ouvre, lis-la. Si tu l'annules, le bouton **« Valider le premier jet »** reste disponible.

**C'est un bug si :**
- la génération s'arrête sans message ;
- l'article reste bloqué sans alarme ni bouton pour le valider.

**⚠ Défaut connu :** sans « Terminer le brainstorm » (étape 1), seule la barre du haut est verrouillée : « Valider le sommaire » et « Continuer vers l'Article » ouvrent quand même l'étape Article.

> **En MOCK, le texte ne contient aucun chiffre** : tu ne verras pas de « [à sourcer : …] ». En RÉEL, un chiffre sans source apparaît surligné en orange, sous la forme « [à sourcer : …] ».

### Étape 7 — Retour au Cerveau : un enfant naît d'une section
**Exigences :** FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-PARENT-WRITTEN-GATE

**Ce que ça protège :** chaque article enfant naît d'une section (H2) de son parent déjà rédigé.

**Gestes :**
1. Reviens au Cerveau, étape « Articles ». L'arbre se recharge à l'ouverture de cette étape.
2. Sous une section du pilier, clique **« Créer l'article de cette section »**.
3. Choisis un mot-clé mesuré, puis clique **« Créer l'article »**.

**Tu dois voir :**
- le pilier à l'état « Rédigé », avec ses sections ;
- le bouton de section **actif**, alors qu'il était grisé avant l'étape 6 (point 8 de l'étape 4) ;
- après création, la section qui montre le lien vers l'enfant, à l'état « À rédiger ».

**C'est un bug si :** on peut créer un enfant sous un pilier dont le premier jet n'est pas accepté.

### Étape 8 — Enrichir
**Exigences :** FR-RED-ENRICH-PASSES

**Ce que ça protège :** chaque ajout (sources, exemples, tableaux…) se propose chapitre par chapitre, et c'est toi qui acceptes.

**Gestes :**
1. Dans la Rédaction du pilier, clique **« Enrichir »** dans la barre SEO / GEO / Maillage / Enrichir.
2. Lance la passe **« Exemples »**.
3. Sur une carte de chapitre, ouvre « Comparer avant / après », puis clique **« Accepter »**. Sur une autre, clique **« Refuser »**.
4. Lance la passe **« Résumer »** et accepte sa proposition : elle ramène la section dont est né l'enfant de l'étape 7 à un résumé qui renvoie vers lui.
5. Lance la passe **« Images »** et accepte une proposition : elle servira à l'étape 10.

**Tu dois voir :**
- « Rien ne change dans l'article tant que vous n'acceptez pas » ;
- des statuts par chapitre : « à relire », « acceptée », « refusée » ;
- le texte modifié seulement pour les chapitres acceptés.

En MOCK, « Sources » répond « Aucun passage à sourcer… : rien à chercher ». « Résumer » répond « Rien à résumer : aucun chapitre n’a encore donné naissance à un article, ou chacun est déjà résumé (250 mots au plus). » si tu n'as pas fait l'étape 7, ou si la section est déjà courte. C'est normal. Le résumé proposé finit sur une phrase entière, sans alerte ⛔.

**C'est un bug si :**
- un chapitre refusé est quand même modifié ;
- « Accepter » ne change rien.

### Étape 9 — Le maillage : un lien retiré disparaît partout
**Exigences :** FR-RED-LINKING-MANUAL ⚠

**Ce que ça protège :** la liste des liens suit le texte. Avant, un lien effacé restait dans la matrice (bug trouvé par la recette réelle C8).

**Gestes :**
1. Dans la Rédaction, clique **« Éditer l'article »**. Arrive-y en cliquant, **sans recharger la page** (voir « Limites connues »).
2. Sélectionne quelques mots du texte. Dans la petite barre qui apparaît, clique **« ✦ »**, puis **« 🔗 Lien interne »** (groupe « Structure »).
3. Dans « Choisir l'article cible », clique l'article enfant créé à l'étape 7.
4. Sur l'accueil, bouton **« Maillage »** : la matrice montre une case colorée entre le pilier et l'enfant.
5. Reviens dans l'éditeur. **Efface les mots liés** : le bouton 🔗 de la barre ne retire pas ce type de lien. Puis clique **« Sauvegarder »**, ou Ctrl+S.
6. Recharge la page « Maillage ».

**Tu dois voir :** la case disparue après la sauvegarde. Avant d'effacer (geste 5), un clic sur le lien, dans l'éditeur, place seulement le curseur : aucun onglet ne s'ouvre.

**C'est un bug si :** la case reste alors que le lien n'est plus dans le texte ; un clic sur le lien ouvre un onglet.

**⚠ Défaut connu :** il touche les **suggestions** de liens, pas ce geste. Dans la rédaction guidée, « Appliquer » une suggestion ne fait rien. Dans l'éditeur, l'ancre n'est cherchée que dans la zone active : ailleurs, « Appliquer » ne fait rien, sans message, et la suggestion reste affichée. Le module Rédaction le vérifie.

### Étape 10 — La publication et ses dérogations
**Exigences :** FR-RED-PUBLISH-GATE, FR-RED-EXPORT-HTML, FR-INFRA-GATE-WAIVER

**Ce que ça protège :**
- à la publication, tu revois toutes tes dérogations ;
- un défaut ⛔ bloque la publication.

**Gestes :**
1. Dans l'éditeur, clique **« Visualiser l'article »**. Le bouton n'apparaît que si le texte, le titre SEO et la description SEO existent. Un nouvel onglet s'ouvre.
2. Clique **« Exporter HTML »**.

**Tu dois voir :**
- l'alarme « Avant de publier » ;
- en ⛔ : « 1 image encore à fournir (place réservée par la passe images) » (étape 8), et le bouton **« Correction nécessaire »** grisé ;
- en 🟠, avec une case « J'ai lu » : ta dérogation de l'étape 4, en clair : « Dérogation posée au verrouillage des lieutenants. 1 lieutenant pour un article Pilier : le minimum conseillé est 3. Votre raison : « Mot-clé très locale ». », sans nom interne de règle ni « .. ». Si les données qu'elle couvrait avaient changé depuis, elle reviendrait à son niveau d'origine (🔴), et il faudrait la justifier à nouveau ;
- en 🟠 aussi, les dérogations du premier jet (étape 6) dont le point est encore dans le texte : « Dérogation posée au premier jet. Paragraphe répété : « … ». Votre raison : « … ». ». Elles ne reviennent pas en 🔴 ;
- si tu n'as pas accepté « Résumer » à l'étape 8 : un 🔴 « La section « … » compte N mots alors que l'article « … » traite ce sujet… ». Réponds-y comme à l'étape 4, ou reviens résumer la section ;
- après « Revenir corriger » : « Publication annulée : corrigez les points signalés, puis exportez à nouveau. » Rien n'est téléchargé.

**Pour finir :**
1. Dans l'éditeur, clique l'image, puis 📷 « Remplacer l'image ». Donne une adresse, par exemple `/images/test.jpg`, et un texte alternatif.
2. Reviens à l'onglet d'aperçu et exporte à nouveau, sans le recharger : le fichier est demandé au serveur après la porte, c'est donc le texte qu'elle vient de juger.
3. Coche les « J'ai lu » (un par point 🟠). Le fichier `article-<id>.html` se télécharge, l'article passe « publié », et l'aperçu se recharge.
4. Ouvre le fichier téléchargé dans le navigateur.

**C'est un bug si :**
- l'export se fait malgré un ⛔ ;
- une dérogation passée n'est pas réaffichée, ou une dérogation du premier jet est redemandée en 🔴 ;
- le fichier téléchargé contient encore l'emplacement d'image vide ;
- le H1 du fichier n'est pas celui de l'article dans l'éditeur, ou un lien interne vers un article rédigé y a disparu ;
- le fichier contient une image « outStr_Arrow » (« Image absolute »).

---

## Les modules

Chaque module vérifie un domaine en entier. Ils partent de l'état laissé par le parcours express, et se font dans l'ordre que tu veux. Un module qui abîme des données travaille sur un article ou un cocon à lui, et le dit en tête.

| Module | Ce qu'il vérifie | Durée |
|---|---|---|
| [01 — Dashboard et interface](recette/01-dashboard-interface.md) | Accueil, silos, cocons, page du cocon, points de progression ; les panneaux et composants communs (panneaux IA, fil d'Ariane, messages) | ~60 min |
| [02 — Cerveau](recette/02-cerveau.md) | Les six étapes et la saisie préservée, la stratégie d'article, le micro-contexte, la configuration du thème, la construction progressive, la carte indicative et ses actions, les refus expliqués, le rattachement des articles hors de l'arbre | ~90 min |
| [03 — Moteur : le cadre commun](recette/03-moteur-cadre.md) | Phases et onglets, navigation, verrous doux, étapes de progression, choix d'un article, continuité entre onglets, compteurs, rechargement | ~60 min |
| [04 — Discovery et Radar](recette/04-discovery-radar.md) | Découvrir des mots-clés depuis une racine, filtre de pertinence, longues traînes ; scanner, noter et trier au Radar, note affichée = note de tri | ~65 min (+ ~25 min en RÉEL) |
| [05 — Capitaine](recette/05-capitaine.md) | Tester un mot-clé, Score Marché et Score Pertinence, racines, verdict, avis de l'IA, questions PAA, verrouillage unique et son alarme | ~65 min |
| [06 — Lieutenants, Structure, Lexique, Finalisation](recette/06-lieutenants-structure-lexique.md) | Analyse des concurrents, propositions de l'IA, règle géographique, nombre de lieutenants ; la structure H1/H2/H3 et sa porte ; les termes métier, tris, onglets par mot-clé ; le récapitulatif | ~50 min |
| [07 — Rédaction](recette/07-redaction.md) | Brief, sommaire, micro-contexte, premier jet, enrichissement, actions sur une sélection, méta, scores SEO et GEO, maillage, aperçu, publication, export | ~90 min |
| [08 — Intégrations](recette/08-integrations.md) | Le bouton MOCK / RÉEL, la pile des coûts, le plafond de dépense, les données déjà achetées, les pannes de service, Search Console | ~30 min |
| [09 — Règles transverses](recette/09-regles-transverses.md) | Mémoire et cache, données qui survivent au rechargement, portes et dérogations, règles par type d'article, indicateurs absents (« — »), erreurs lisibles | ~60 min |

---

## À vérifier en mode RÉEL (payant)

Trois choses ne se voient pas en MOCK, parce que les données y sont factices :

1. **Le lexique** (étape 5) : des termes du métier, sans mots vides.
2. **Les chiffres sans source** (étape 6) : ils apparaissent en « [à sourcer : …] ».
3. **La qualité du texte** : français, longueur tenue, sans répétitions.

**Sans rien payer**, tu peux déjà lire le pilier **#1030**, produit en RÉEL par la recette C8 : il a passé la porte de publication sans aucune dérogation.

Pour un essai payant :
- passe le bouton en **RÉEL** et refais les étapes 1 à 6 sur un **nouveau** cocon, avec des mots-clés jamais utilisés en MOCK : une mesure faite en MOCK dans les 7 derniers jours resservirait ses chiffres factices ;
- certaines actions annoncent leur coût avant de partir, par exemple « ~$0.003 » pour l'analyse SERP du Lexique. D'autres non (le scan Radar, « Tester un mot-clé capitaine… », « Découvrir », « Analyser SERP » des Lieutenants) : suis la dépense dans la pile « Coûts API », en bas à gauche ;
- repasse en **MOCK** à la fin.

Chaque module a aussi sa section « En mode RÉEL (payant) », pour ce qu'il vérifie.

## Après la recette

- **Supprimer les cocons de test :** « Recette <date> », et ceux que les modules créent (« La recette <date> », « Le Recette <date> », « Recette vide <date> »). L'écran ne sait pas supprimer un cocon : demande-le à Claude. Il sauvegarde la base, puis supprime les articles avant le cocon.
- **Signaler les ❌** avec le code de la vérification et une capture d'écran. Claude les note dans le journal de recette, avec leur cause probable et la taille du correctif.
- **Une vérification ⚠ qui passe :** signale-la aussi. Le défaut a peut-être été corrigé, et son exigence redeviendra « active ».

## Limites connues de l'écran

Relevées en écrivant cette recette ; aucune ne bloque le parcours.

- **Liste vide dans l'éditeur après un rechargement (à confirmer).** La liste des articles à lier n'est chargée que par la page du cocon ou la page Rédaction. Ouvert directement par son adresse, l'éditeur afficherait « Aucun article disponible dans ce cocon. » (`ArticleEditorView.vue`, `ArticlePicker.vue`).
- **La méta ne se modifie pas à l'écran.** Le titre et la description SEO s'affichent, mais ne s'éditent pas (`ArticleMetaDisplay.vue`).
- **Le 🔴 « volume nul » du Capitaine ne se reproduit pas en MOCK.** Le test navigateur force la base à 0 (`tests/browser-e2e/gates.browser.test.ts`).
- **En MOCK, un mot-clé qui contient « recette » est écarté par le faux filtre de pertinence de Discovery.** Les modules utilisent donc d'autres racines, par exemple `plombier toulouse`.
- **Deux gestes n'ont aucun test navigateur** : le bouton « Continuer vers … » et le retrait d'un lien interne. Ils sont couverts par des tests unitaires et d'intégration.

## Sources

- Exigences : [`requirements.md`](requirements.md) ; chaque vérification cite les siennes.
- Tests navigateur :
  - `tests/browser-e2e/parcours/bout-en-bout.parcours.test.ts`
  - `tests/browser-e2e/parcours/cerveau.parcours.test.ts`
  - `tests/browser-e2e/gates.browser.test.ts`
  - `tests/browser-e2e/enrichment.browser.test.ts`
  - `tests/browser-e2e/helpers/moteur-ui.ts`
  - `tests/browser-e2e/helpers/cocoon-builder-ui.ts`
- Composants :
  - `src/components/shared/GateAlarm.vue`
  - `src/components/production/brain/CocoonTreeBuilder.vue`
  - `src/views/MoteurView.vue`
  - `src/components/panels/EnrichmentPanel.vue`
  - `src/views/ArticlePreviewView.vue`
- Vérificateurs : `shared/verifiers/` (`gate.ts`, `captain.ts`, `lieutenants.ts`, `draft.ts`, `publish.ts`).
- Garde-fou de l'exhaustivité : `tests/unit/architecture/recette-coverage.test.ts`.
