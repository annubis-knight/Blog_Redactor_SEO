---
title: Recette — Cerveau
module: 02
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md
  - spec/04-cerveau.md
---

# Module 02 — Cerveau

**Durée :** ~90 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express terminé (cocon « Recette <date> » : brainstorm terminé, pilier rédigé, enrichi et publié, un enfant intermédiaire « À rédiger ») ; le bouton sur **MOCK** ; Chrome ou Edge (limitation du réseau en CER-5) ; Claude joignable (CER-16).

Ce module vérifie tout le Cerveau : la stratégie du cocon en six étapes, la construction du cocon article par article (niveaux, sections, candidats mesurés, refus expliqués, rattachement, retrait), la carte indicative, le micro-contexte et la longueur visée, la stratégie reprise au Moteur et à la Rédaction, et la configuration du thème. CER-1 à CER-11 se font sur un cocon jetable, « La recette <date> », CER-12 à CER-27 sur « Recette <date> », et CER-28 sur la configuration. En fin de recette, fais supprimer « La recette <date> » en même temps que « Recette <date> » (voir « Après la recette » du parcours express).

## Vérifications

### CER-1 — Un cocon neuf : pas de « Contexte stratégique », et des étapes fermées
**Exigences :** FR-CER-CONTEXT-FOR-MOTEUR, FR-CER-STEPS-COCOON

**Gestes :**
1. Sur l'accueil, dans le silo de « Recette <date> », clique la carte **« Nouveau cocon »**. Tape `La recette <date>` : le nom de « Recette <date> », écrit exactement pareil, précédé de « La » (ce nom sert en CER-7). Appuie sur Entrée.
2. Sur la page du cocon, clique la carte **« Moteur »**. Reviens, puis clique **« Rédaction »**.
3. Reviens, puis clique **« Cerveau »**.
4. Dans la barre du haut, survole « Angle », puis clique dessus.

**Tu dois voir :**
- au Moteur comme à la Rédaction, aucune barre « Contexte stratégique » : ce cocon n'a pas encore de stratégie ;
- au Cerveau, la barre « Cible », « Douleur », « Angle », « Promesse », « CTA », « Articles » ; « Cible » est active ; les cinq autres portent un cadenas et l'infobulle « Verrouillé » ; le clic sur « Angle » ne fait rien ;
- la question « À qui parlez-vous ? » et son explication, le champ « Votre réponse », l'encadré replié « Contexte envoyé à Claude » ;
- en bas, « Suivant » seul : pas de « Précédent » à la première étape.

**C'est un bug si :**
- une barre « Contexte stratégique » apparaît, même un instant (par exemple celle de « Recette <date> ») ;
- une étape pas encore atteinte s'ouvre.

### CER-2 — Répondre, demander une suggestion, valider de trois façons
**Exigences :** FR-CER-STEPS-COCOON

**Gestes :**
1. À l'étape « Cible », sans rien écrire, regarde le bouton **« Valider ▾ »**.
2. Dans « Votre réponse », tape `Artisans du bâtiment en Haute-Garonne`, puis clique à côté du champ. Ouvre **« Valider ▾ »**, lis le menu, puis referme-le d'un second clic sur le bouton.
3. Clique **« Demander une suggestion à Claude »**.
4. Ouvre **« Valider ▾ »** et choisis **« La suggestion »**.
5. Déplie **« Modifier ma réponse »**, puis **« Valider ▾ »** › **« Fusionner les deux »**.

**Tu dois voir :**
- à l'étape 1, « Valider ▾ » grisé ;
- à l'étape 2, un seul choix : « Mon texte » ;
- à l'étape 3, « Chargement... » sur le bouton et « Valider ▾ » grisé pendant l'appel, puis un bloc « Suggestion Claude : » avec un crayon (« Modifier la suggestion ») et des flèches (« Régénérer la suggestion ») ; le bouton de suggestion disparaît ;
- à l'étape 4, trois choix : « Mon texte », « La suggestion », « Fusionner les deux ». Après le clic, le texte validé s'affiche au-dessus de la carte, avec une coche et un crayon ; la carte se replie sous « Modifier ma réponse » ;
- à l'étape 5, le texte validé remplacé par la fusion ;
- en MOCK, suggestion et fusion sont des textes simulés qui commencent par « [Mock provider] Réponse simulée. » : seul le geste compte ici (le contenu se juge en CER-R2).

**C'est un bug si :**
- « Valider ▾ » est actif sans réponse ni suggestion ;
- « Fusionner les deux » est proposé alors que le champ est vide ;
- le texte validé ne change pas après un choix.

### CER-3 — Retoucher le texte validé, approfondir par des sous-questions
**Exigences :** FR-CER-STEPS-COCOON

**Gestes :**
1. Toujours à « Cible », clique le crayon **« Modifier le texte validé »**, remplace le texte par `Artisans du bâtiment en Haute-Garonne, 1 à 10 salariés.`, puis clique la coche (« Sauvegarder »).
2. Clique le bouton rond **« + »** sous la carte (infobulle « Approfondir »).
3. Dans la sous-question apparue, tape `Ils comptent seulement les appels reçus.` dans « Votre réponse... », puis **« Valider ▾ »** › **« Mon texte »**. En MOCK, n'utilise pas « Suggestion Claude » dans une sous-question : la réponse simulée n'y est pas une suggestion (à essayer en CER-R2).
4. Clique encore **« + »**, puis supprime cette seconde sous-question avec sa croix (« Supprimer cette sous-question »).
5. Déplie **« Contexte envoyé à Claude »**.

**Tu dois voir :**
- à l'étape 1, ton texte devient le texte validé ;
- à l'étape 2, le « + » grisé pendant la génération, puis une carte de sous-question sous la carte principale : sa question, son explication, son champ, « Suggestion Claude », « Valider ▾ ». En MOCK, la question est « Quels indicateurs concrets utilisez-vous aujourd'hui pour mesurer la rentabilité de votre présence en ligne ? » ;
- à l'étape 3, le texte validé de « Cible » change : l'IA y intègre la sous-réponse (en MOCK, il devient « Réponse enrichie via mock : pas de contexte fourni. ») ;
- à l'étape 4, la seconde sous-question s'ajoute sous la première (en MOCK, avec la même question), puis disparaît ; la première reste ;
- à l'étape 5, sous « Étapes validées », la ligne « Cible » : le texte validé, suivi de « — Détails: » et de ta sous-réponse.

**C'est un bug si :**
- « + » remplace la sous-question précédente ;
- la sous-réponse validée ne change pas le texte validé ;
- une sous-question ne se supprime pas.

### CER-4 — Avancer, revenir : rien ne passe d'une étape à l'autre
**Exigences :** FR-CER-STEPS-COCOON, FR-CER-SAISIE-PRESERVEE

**Gestes :**
1. Clique **« Suivant »** : étape « Douleur ».
2. Sans rien écrire dans le champ, clique **« + »**. Réponds à la sous-question `Ils ont peur de payer un site qui ne rapporte rien.`, puis **« Valider ▾ »** › **« Mon texte »**.
3. Clique **« Suivant »** (étape « Angle »). Tape `Texte provisoire` dans « Votre réponse », sans valider, puis clique **« Précédent »**.
4. Recharge la page (F5).

**Tu dois voir :**
- à l'étape 1, « Cible » coché dans la barre ; « Précédent » apparaît ;
- à l'étape 2, faute de texte validé, la sous-réponse devient telle quelle le texte validé de « Douleur » ;
- à l'étape 3, de retour à « Douleur », son propre contenu : « Texte provisoire » n'y est pas ;
- après le rechargement, « Chargement de la stratégie... », puis le Cerveau rouvre sur « Angle », la dernière étape atteinte par « Suivant » ; le texte validé de « Douleur » est toujours là ;
- le champ d'« Angle » est vide : « Précédent » et la barre d'étapes n'enregistrent pas (règle connue : seuls « Suivant », « Terminer le brainstorm » et les actions de la carte enregistrent).

**C'est un bug si :**
- le texte d'une étape apparaît dans une autre ;
- le Cerveau rouvre sur « Cible » ;
- le texte validé de « Douleur » a disparu.

### CER-5 — Une saisie n'est pas effacée par un enregistrement qui arrive après elle
**Exigences :** FR-CER-SAISIE-PRESERVEE

**Gestes :**
1. À l'étape « Angle », tape `Montrer des chantiers réels`, puis **« Valider ▾ »** › **« Mon texte »**.
2. Ouvre les outils du navigateur (F12), onglet « Réseau » (Network), et choisis la limitation « 3G lente » (Slow 3G). Si c'est trop rapide pour toi, ajoute un profil personnalisé à 10 000 ms de latence.
3. Clique **« Suivant »**. Tout de suite, à l'étape « Promesse », clique dans « Votre réponse », tape `Rentable en six mois`, puis clique à côté du champ.
4. Attends une dizaine de secondes que l'enregistrement lancé par « Suivant » se termine. Remets la limitation sur « Pas de limitation » (No throttling).
5. Sans retoucher le champ, clique **« Suivant »**. Recharge la page, puis clique « Promesse » dans la barre.
6. Pour finir : si le champ est vide, retape `Rentable en six mois`. Puis **« Valider ▾ »** › **« Mon texte »**, et **« Suivant »**.

**Tu dois voir :**
- à l'étape 4, `Rentable en six mois` toujours dans le champ, une fois l'enregistrement terminé ;
- à l'étape 5, `Rentable en six mois` dans le champ de « Promesse » après le rechargement : une valeur enregistrée s'affiche au chargement.

**C'est un bug si :**
- le champ se vide quand l'enregistrement se termine ;
- à l'étape 5, le champ est vide : la saisie, restée affichée, a été perdue en silence.

### CER-6 — L'étape Articles d'un cocon vide : la carte grandit, rien n'est créé
**Exigences :** FR-CER-STEPS-COCOON, FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-AIGUILLAGE

**Gestes :**
1. À l'étape « CTA », clique **« + »** (« Approfondir »), puis **« Suivant »** : étape « Articles ».
2. Regarde les deux blocs, puis déplie « Sujets suggérés ».
3. Ouvre **« Générer avec Claude ▾ »**, appuie sur Échap. Rouvre-le, puis clique à côté.
4. Rouvre-le et choisis **« Le pilier »**. Rouvre-le : **« 1 article intermédiaire »**. Rouvre-le : **« 1 article spécialisé »**.

**Tu dois voir :**
- à « CTA », une sous-question qui apparaît, comme aux autres étapes ;
- en haut, « Construire le cocon » : « Ce cocon n'a pas encore de pilier. Commencez par lui : les autres articles naîtront de ses sections. » et le seul bouton « Créer le pilier » ;
- en dessous, « Carte indicative du cocon », la note « Carte indicative : elle guide les articles à créer, elle n'en crée aucun. … », l'alerte « Aucun article Pilier dans la liste. », et trois colonnes vides : « Pilier », « Intermédiaire », « Spécialisé » ;
- « Sujets suggérés » se génère de lui-même (« Génération des sujets… ») ; en MOCK, il finit sur « Aucun sujet retourné. Réessayez. » : la réponse simulée ne contient pas de sujets ;
- le menu commence par « Sur la carte seulement : aucun article n'est créé. » et ne propose que « Le pilier » et « La carte complète du cocon » ; Échap et le clic à côté le referment ;
- pendant chaque ajout, le bouton affiche « Génération... » et reste grisé ;
- après « Le pilier », une ligne dans « Pilier » (en MOCK, « Création de site internet à Toulouse : le guide pour les TPE ») ; l'alerte « Aucun article Pilier dans la liste. » disparaît ; dans le menu, « Le pilier » est grisé (« Déjà sur la carte : un seul pilier par cocon. ») et « 1 article intermédiaire » apparaît ;
- après l'intermédiaire, une ligne dans « Intermédiaire », et « 1 article spécialisé » apparaît dans le menu ;
- après le spécialisé, une ligne dans « Spécialisé », rangée sous le titre de l'intermédiaire ;
- « Construire le cocon » n'a pas bougé.

**C'est un bug si :**
- « + » ne fait rien à l'étape « CTA » ;
- un article apparaît dans « Construire le cocon » ;
- le menu propose un intermédiaire sans pilier sur la carte, ou un spécialisé sans intermédiaire ;
- une ligne atterrit dans une autre colonne que son niveau.

**⚠ Défaut connu :** « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur (tu le constates en CER-9). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-7 — Le pilier du cocon neuf : adresse déjà prise, puis mot-clé déjà visé
**Exigences :** FR-CER-CREATION-HONNETE, FR-CER-KEYWORD-REAL-DATA, FR-CER-AIGUILLAGE

**Gestes :**
1. Ouvre « Recette <date> » dans un nouvel onglet. Au Cerveau, note le titre de son pilier (dans l'arbre) et son mot-clé (déplie sa ligne « Créé » sur la carte : « Mot-clé suggéré »). Ferme cet onglet.
2. Sur « La recette <date> », duplique l'onglet (clic droit sur l'onglet › Dupliquer) et laisse le second de côté, sans le recharger : il sert en CER-8.
3. Dans le premier onglet, clique **« Créer le pilier »** et attends la liste.
4. Coche le candidat qui porte le mot-clé noté. En MOCK, les deux cocons reçoivent les mêmes candidats.
5. Dans « Titre de l'article », colle le titre noté, puis clique **« Créer l'article »**.
6. Ajoute ` bis` à la fin du titre, puis clique **« Créer l'article »**.
7. Reviens sur la page du cocon.

**Tu dois voir :**
- à l'étape 5, sous le titre, en rouge : « « <titre> » n'a pas été créé : L'adresse /<adresse> est déjà prise par un autre article : changez le titre ou l'adresse. » ; rien de nouveau dans l'arbre ;
- à l'étape 6, « Création… » sur le bouton, puis la notification « « <titre> bis » est créé. », et un avertissement : « « <titre> bis » est créé, mais son mot-clé n'a pas rejoint le pool du cocon : Le mot-clé « <mot-clé> » est déjà utilisé dans le cocon « Recette <date> » : deux cocons qui visent le même mot-clé se font concurrence. Choisissez-en un autre au Moteur. » ;
- dans l'arbre, le pilier : badge « Pilier », « À rédiger », « Pas encore de section : elles apparaissent quand sa structure est validée ou son texte rédigé. » ; « Créer le pilier » a disparu ;
- sur la carte, une nouvelle ligne marquée « Créé » dans « Pilier », à côté de celle posée par Claude : deux piliers, c'est connu (la carte et l'arbre sont deux listes) ;
- sur la page du cocon, la carte « Moteur » affiche toujours « 0 mots-clés » : le mot-clé refusé n'a pas rejoint ce cocon.

**C'est un bug si :**
- l'article refusé apparaît dans l'arbre, ou l'article annoncé créé n'y est pas ;
- l'avertissement ne nomme pas le cocon « Recette <date> » ;
- un message technique ou en anglais remplace ces phrases.

### CER-8 — Deux onglets : un second pilier est refusé, et le refus dit pourquoi
**Exigences :** FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-CREATION-HONNETE

**Gestes :**
1. Va dans le second onglet de CER-7, sans le recharger : il propose encore « Créer le pilier ». Clique-le.
2. Clique **« Relancer la proposition »**.
3. Recharge l'onglet, puis ferme-le.

**Tu dois voir :**
- aussitôt, sans liste de candidats (rien n'est payé) : « Aucun candidat : Ce cocon a déjà son pilier : « <titre> bis ». », avec « Relancer la proposition » ;
- le même refus après la relance ;
- après le rechargement, le pilier « <titre> bis » dans l'arbre, et plus de « Créer le pilier ».

**C'est un bug si :**
- des candidats s'affichent, ou un second pilier se crée ;
- le refus ne dit pas ce qui bloque.

**⚠ Défaut connu :** « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-9 — La carte complète : niveaux compris, mais les articles créés remplacés
**Exigences :** FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-TYPE-TOLERANT ⚠, FR-PIE-AI-GENERATION, FR-CER-CONTEXT-FOR-MOTEUR

**Gestes :**
1. Premier onglet, étape « Articles » : **« Générer avec Claude ▾ »** › **« La carte complète du cocon »** (« Tous les articles d'un coup, à la place de la carte actuelle. »).
2. Suis la barre de progression jusqu'au bout.
3. Clique une ligne pour la déplier, et change son « Intention éditoriale » : ce geste enregistre la carte.
4. Page du cocon › **« Moteur »** : déplie « Contexte stratégique », puis « Articles suggérés ».

**Tu dois voir :**
- la barre « Structure (Pilier + Inter) », « Recherche PAA », « Articles Spécialisés » qui avance ; « Génération... » sur le menu tout du long ;
- en MOCK, cinq lignes : un pilier, deux intermédiaires, deux spécialisés, chacune dans la colonne de son niveau ; chaque spécialisé rangé sous le titre de son intermédiaire ;
- dépliées, les lignes ont une « Douleur » et une intention choisie par l'IA (pas « Non défini ») ;
- « Construire le cocon » n'a pas bougé : le pilier « <titre> bis » y est toujours ;
- au Moteur, « Contexte stratégique » ne montre que les étapes validées : « Cible », « Douleur », « Angle », « Promesse », sans « CTA », resté vide ;
- le défaut connu : la ligne « Créé » du pilier « <titre> bis » a disparu de la carte, et ce pilier manque dans « Articles suggérés ».

**C'est un bug si :**
- toutes les lignes tombent dans « Spécialisé » ;
- une étape non validée apparaît dans « Contexte stratégique » ;
- le pilier « <titre> bis » disparaît de « Construire le cocon ».

**⚠ Défaut connu :** FR-CER-COCOON-PROGRESSIVE — « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-CER-TYPE-TOLERANT — sur la carte, un niveau illisible rendu par l'IA devient « Spécialisé » (ou le niveau demandé, pour un ajout), sans message propre à la ligne. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-10 — Ranger la carte : « Lien », alertes, ajouts à la main
**Exigences :** FR-CER-STEPS-COCOON, FR-CER-TYPE-TOLERANT ⚠, FR-CER-AIGUILLAGE

**Gestes :**
1. Survole la pastille « ⚠ » d'un intermédiaire.
2. Déplie un spécialisé, clique **« Lien »** et choisis l'autre intermédiaire.
3. **« + Ajouter un spécialisé »** › **« Article vide »**. Survole la pastille de la ligne ajoutée.
4. **« + Ajouter un intermédiaire »** › **« Article complémentaire »**.
5. **« + Ajouter un pilier »** › **« Article guidé... »** : dans « Sujet ou contexte... », tape `Tarifs à 1 $ : garder $1 et $& tels quels`, puis **« Générer »**.

**Tu dois voir :**
- au survol, le détail : sous « Structure », « Seulement 1 Spécialisé(s) rattaché(s) (minimum 2). », puis la composition du mot-clé ;
- après « Lien », le spécialisé rangé sous l'autre intermédiaire ; les pastilles suivent : celui qui l'a reçu perd l'alerte de nombre, l'autre affiche « Seulement 0 Spécialisé(s) rattaché(s) (minimum 2). » ;
- « Article vide » : une ligne « Sans titre » dans « Non rattachés », avec une alerte qui dit qu'elle n'a pas d'intermédiaire ;
- « Article complémentaire » et « Article guidé... » : le bouton d'ajout affiche « Génération... », puis une ligne arrive dans la colonne demandée, sans erreur. En MOCK, la consigne ne change pas le titre : un titre déjà vu, suivi d'un numéro ;
- rien de nouveau dans « Construire le cocon ».

**C'est un bug si :**
- une ligne ajoutée atterrit dans une autre colonne que celle demandée ;
- la consigne avec `$1` ou `$&` provoque une erreur ;
- une alerte affiche un nom technique au lieu d'une phrase (par exemple « parentTitle »).

**⚠ Défaut connu :** sur la carte, un niveau illisible rendu par l'IA devient « Spécialisé » (ou le niveau demandé, pour un ajout), sans message propre à la ligne. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-11 — « Terminer le brainstorm » ouvre la génération des articles
**Exigences :** FR-CER-STEPS-COCOON

**Gestes :**
1. Dans « Construire le cocon », clique « Le rédiger » sous le pilier « <titre> bis ». Survole l'étape « Article » dans la barre du haut.
2. Reviens au Cerveau (page du cocon › « Cerveau ») : il rouvre sur « Articles ». Clique **« Terminer le brainstorm »**.
3. Sur la page du cocon, **« Rédaction »** › le pilier « <titre> bis ».
4. Rouvre le Cerveau.

**Tu dois voir :**
- à l'étape 1, la barre « Brief & Structure », « Article » ; « Article » grisé, avec un cadenas et l'infobulle « Complétez le Cerveau pour générer cet article » ;
- à l'étape 2, le retour sur la page du cocon ;
- à l'étape 3, « Article » ouvert, sans cadenas ;
- à l'étape 4, le Cerveau reprend sur « Articles », et les six étapes sont cochées.

**C'est un bug si :** « Article » reste fermé après « Terminer le brainstorm », ou s'ouvre avant.

### CER-12 — L'arbre du cocon : niveaux, états, sections
**Exigences :** FR-CER-AIGUILLAGE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-PARENT-WRITTEN-GATE

**Gestes :**
1. Page du cocon « Recette <date> » › **« Cerveau »**.
2. Lis « Construire le cocon ».
3. Clique « Ouvrir sa rédaction » sous le pilier, et compare les titres de ses chapitres aux sections de l'arbre. Reviens.
4. Déplie « Contexte envoyé à Claude », puis « Articles du cocon (2) ».

**Tu dois voir :**
- le Cerveau rouvre sur « Articles », sans « Créer le pilier » ;
- le pilier : « Pilier », son titre, « Rédigé », « Ouvrir sa rédaction ». Il reste « Rédigé » malgré l'enrichissement de l'étape 8 du parcours express : le premier jet accepté ne se perd pas ;
- ses sections : les titres de chapitre (H2) de son texte, sans introduction, conclusion ni « Questions fréquentes » ;
- la section d'où est né l'enfant de l'étape 7 (appelons-le A) : un lien vers A et « À rédiger » ; les autres sections : « Créer l'article de cette section », actif ;
- sous le pilier, en retrait : A, badge « Intermédiaire », « À rédiger », « Le rédiger », et « Pas encore de section : elles apparaissent quand sa structure est validée ou son texte rédigé. » ;
- « Articles du cocon (2) » : le pilier et A, rangés sous leur niveau.

**C'est un bug si :**
- le pilier est « À rédiger » ;
- une section « Introduction », « Conclusion » ou « Questions fréquentes » est proposée ;
- A n'est pas rangé sous le pilier ;
- « Articles du cocon » range les articles sous « Autre ».

### CER-13 — Les candidats d'une section : mesurés, variés, rien de choisi d'office
**Exigences :** FR-CER-KEYWORD-REAL-DATA, FR-CER-CHILD-FROM-PILLAR-H2

**Gestes :**
1. Duplique l'onglet et laisse le second de côté, sans le recharger : il sert en CER-15.
2. Premier onglet : choisis une section libre du pilier, appelons-la S. Survole puis clique son **« Créer l'article de cette section »**.
3. Pendant l'attente, regarde les autres boutons de section. Puis lis la liste et l'aide « Comment lire ces chiffres ? ».
4. Coche un candidat, puis efface le titre jusqu'à ne garder que 2 caractères.
5. Clique **« Annuler »**.

**Tu dois voir :**
- l'infobulle « Propose des mots-clés et mesure leurs données réelles (appel payant) » ;
- un panneau « Créer l'article intermédiaire né de la section « S » de « <pilier> » », et « Recherche de mots-clés candidats, puis mesure de leurs données réelles (quelques secondes)… » ; pendant ce temps, les autres « Créer l'article de cette section » sont grisés ;
- entre 3 et 5 candidats (4 en MOCK), dont les mots-clés reprennent les mots de S : la section est bien transmise ;
- aucun doublon dans la liste, et aucun candidat qui reprenne le mot-clé du pilier ou de A ;
- pour chacun : « Volume » (« N recherches par mois »), « Difficulté » (« N/100 »), « Intention » (par exemple « Informationnelle (on cherche à comprendre) »), « En tête de Google » (trois lignes « position. site — titre »), puis une raison ;
- aucun candidat coché, « Créer l'article » grisé ;
- un candidat coché préremplit « Titre de l'article » avec son titre ; à 2 caractères, « Créer l'article » redevient grisé ;
- « Annuler » referme le panneau sans rien créer ;
- en MOCK, tous les candidats ont le même volume et la même difficulté (bac à sable) ; « — » et « Non mesuré » ne se voient qu'en RÉEL (CER-R3).

**C'est un bug si :**
- un candidat est coché d'office ;
- « Créer l'article » est actif sans candidat coché, ou avec moins de 3 caractères ;
- une mesure absente s'affiche « 0 » ;
- un candidat « Non mesuré » peut être coché.

### CER-14 — Créer l'enfant sur la proposition de même titre : l'intention de la carte l'emporte
**Exigences :** FR-CER-CREATION-HONNETE, FR-PIE-AI-GENERATION, FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-AIGUILLAGE

**Gestes :**
1. Sur la carte, **« + Ajouter un intermédiaire »** › **« Article complémentaire »**. Déplie la ligne ajoutée. Avec le crayon « Modifier le titre », remplace son titre par `Prix du site recette <date>`, puis Entrée. Dans « Intention éditoriale », choisis « Commerciale (comparatif, sélection) ».
2. Dans l'arbre, sous S, **« Créer l'article de cette section »**. Coche le **premier** candidat : en MOCK, son intention attendue est informationnelle (le panneau ne l'affiche pas).
3. Dans « Titre de l'article », mets exactement `Prix du site recette <date>` (copie-colle), puis **« Créer l'article »**.
4. Déplie la ligne `Prix du site recette <date>` de la carte. Puis ouvre la page du cocon.

**Tu dois voir :**
- « Création… », puis la notification « « Prix du site recette <date> » est créé. » ; appelons cet article B ;
- dans l'arbre, S montre un lien vers B et « À rédiger » ; B apparaît sous le pilier, badge « Intermédiaire » ;
- sur la carte, la ligne `Prix du site recette <date>` porte maintenant « Créé » : pas de seconde ligne de même titre ;
- dépliée : « Intention éditoriale » toujours « Commerciale (comparatif, sélection) », celle de la carte l'emporte ; « Douleur » : celle du candidat (en MOCK, « Le lecteur ne sait pas par où commencer. ») ; « Mot-clé suggéré » : le mot-clé choisi ;
- sur la page du cocon, la carte « Moteur » compte un mot-clé de plus. Si ce mot-clé est déjà visé par un autre cocon, l'avertissement de CER-7 s'affiche à la place : c'est normal.

**C'est un bug si :**
- deux lignes portent ce titre sur la carte ;
- l'intention est passée à « Informationnelle » ;
- B est annoncé créé mais absent de l'arbre.

**⚠ Défaut connu :** « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-15 — Deux onglets : une section déjà prise est refusée
**Exigences :** FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-CREATION-HONNETE

**Gestes :**
1. Va dans le second onglet de CER-13, sans le recharger : S y propose encore « Créer l'article de cette section ». Clique-le.
2. Recharge l'onglet, puis ferme-le.

**Tu dois voir :**
- sans liste de candidats (rien n'est payé) : « Aucun candidat : La section « S » a déjà donné l'article « Prix du site recette <date> ». », avec « Relancer la proposition » ;
- après le rechargement, S montre le lien vers B.

**C'est un bug si :** des candidats s'affichent, ou un second article naît de S.

### CER-16 — Rattacher un article hors de l'arbre
**Exigences :** FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-CREATION-HONNETE

**Gestes :**
1. Demande à Claude de rendre B « hors de l'arbre » : il sauvegarde la base, puis retire le parent de B, sans rien toucher d'autre. Sinon, un ancien cocon qui affiche déjà « Articles hors de l'arbre » convient : ouvre le formulaire, lis la liste, puis « Annuler » si tu ne veux pas le modifier.
2. Recharge le Cerveau, étape « Articles ».
3. Dans « Articles hors de l'arbre », clique **« Rattacher »** à côté de B. Ouvre la liste « Choisir une section… », puis clique **« Annuler »**.
4. **« Rattacher »** de nouveau, choisis « « S » — <pilier> », puis **« Rattacher ici »**.

**Tu dois voir :**
- à l'étape 2, sous l'arbre, le bloc « Articles hors de l'arbre » et son explication ; B avec « Intermédiaire », son titre en lien et son état ; S de nouveau libre (« Créer l'article de cette section ») ;
- le formulaire « Section qui annonce son sujet » ; la liste ne propose que les sections libres du pilier, sous la forme « « section » — titre du pilier » (pas la section de A) ; « Rattacher ici » grisé tant que rien n'est choisi ; « Annuler » referme sans rien changer ;
- après « Rattacher ici » (« Rattachement… ») : « L'article est rattaché à la section « S ». » ; le bloc « Articles hors de l'arbre » disparaît ; S montre de nouveau le lien vers B ;
- aucun bouton « Rattacher » à côté d'un pilier.

**C'est un bug si :**
- la liste propose une section déjà prise ;
- B reste hors de l'arbre après le message de succès ;
- un refus s'affiche sans dire pourquoi : il doit commencer par « L'article n'a pas été rattaché : ».

**⚠ Défaut connu :** « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-17 — Retirer un article : refusé s'il a des enfants, sinon sa section se libère
**Exigences :** FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-CREATION-HONNETE

**Gestes :**
1. Sur la carte, sur la ligne « Créé » du pilier, clique la croix (« Supprimer cet article »).
2. Même geste sur la ligne « Créé » de B.
3. Clique « CTA » dans la barre, puis « Articles » : l'arbre se recharge.
4. Page du cocon › **« Moteur »** › « Articles suggérés ».

**Tu dois voir :**
- à l'étape 1, une notification rouge : « « <pilier> » n'a pas été retiré : Des articles sont nés de ses sections : retirez-les d'abord du cocon, sinon ils perdraient leur parent. » ; la ligne reste sur la carte, le pilier dans l'arbre ;
- à l'étape 2, la ligne de B quitte la carte. L'arbre montre encore B jusqu'à son rechargement : la carte et l'arbre ne se synchronisent pas (limite connue) ;
- à l'étape 3, B n'est plus dans l'arbre, et S propose de nouveau « Créer l'article de cette section » ;
- à l'étape 4, B n'est plus dans la liste.

**C'est un bug si :**
- le pilier quitte la carte ou l'arbre ;
- après l'étape 3, B est encore sous S.

**⚠ Défaut connu :** « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-18 — Retoucher une ligne de la carte : intention, titre, régénération
**Exigences :** FR-PIE-CERVEAU-OVERRIDE, FR-CER-STEPS-COCOON

**Gestes :**
1. Clique la ligne « Créé » de A pour la déplier. Note son titre et son intention.
2. Dans « Intention éditoriale », choisis « Transactionnelle (achat, conversion) ». Recharge la page, reviens à « Articles », redéplie la ligne.
3. Avec le crayon « Modifier le titre », ajoute ` (retouché)` au titre, puis Entrée. Clique « CTA », puis « Articles ».
4. Sur une ligne non créée (posée par Claude ; s'il n'y en a pas, ajoute-en une par « + Ajouter un spécialisé » › « Article complémentaire »), **« Régénérer ▾ »** › **« Titre »**. Puis clique la flèche gauche à côté du titre.
5. Sur cette même ligne, **« Supprimer »**.
6. Remets à A son titre et son intention d'origine.

**Tu dois voir :**
- ligne dépliée : « Titre », « Mot-clé suggéré », « Slug », chacun avec un crayon ; « Douleur » en simple texte ; « Intention éditoriale » avec « Non défini » et les quatre intentions ; la raison ; en bas, « Régénérer ▾ » et « Supprimer » (« Lien » seulement sur un spécialisé) ;
- le sélecteur s'ouvre sans replier la ligne ; le choix s'enregistre sans bouton : après rechargement, « Transactionnelle (achat, conversion) ». Pour un article créé, il part aussi sur l'article (cela se voit à la porte du Capitaine, dans son module) ;
- après le renommage, l'arbre montre A sous son nouveau titre ;
- « Régénérer › Titre » : un nouveau titre, et un compteur « 2/2 » entre deux flèches ; la flèche gauche revient au titre d'origine (« 1/2 »). En MOCK, le nouveau titre est un texte simulé : seul le geste compte ;
- « Supprimer » retire la ligne de la carte, sans toucher à l'arbre.

**C'est un bug si :**
- un clic sur le sélecteur replie la ligne et empêche de choisir ;
- l'intention revient à l'ancienne valeur après rechargement ;
- le nouveau titre d'un article créé ne se voit pas dans l'arbre.

### CER-19 — Préparer A au Moteur : la longueur conseillée
**Exigences :** FR-CER-WORD-COUNT-RECOMMEND, FR-CER-AIGUILLAGE

**Gestes :**
1. Page du cocon › **« Moteur »** › « Articles suggérés » › A.
2. Refais pour A les étapes 3 et 4 du parcours express (≈ 5 min), sans le mot-clé absurde : au Capitaine, verrouille un mot-clé sensé (celui suggéré pour A) ; aux Lieutenants, coche les **3** propositions ; à l'onglet Structure, **« Générer la structure »** puis **« Valider la structure »**. Réponds aux alarmes éventuelles.
3. Déplie la pile « Coûts API », en bas de l'écran.

**Tu dois voir :**
- A rangé dans « Articles suggérés » sous le groupe de son niveau ;
- dans la pile, « 💡 Longueur conseillée : N mots », avec sa raison, puis « Modifiable dans la Rédaction. » : aucune longueur n'était choisie pour A ;
- N entre 1 200 et 2 500, la fourchette d'un intermédiaire (1 800 s'il n'y a pas de moyenne des concurrents).

**C'est un bug si :**
- aucune ligne 💡 n'apparaît ;
- N sort de 1 200 – 2 500 ;
- la pile dit « Valeur choisie conservée » alors qu'aucune longueur n'a été choisie.

### CER-20 — Un parent pas encore rédigé ne donne pas d'enfant
**Exigences :** FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2

**Gestes :**
1. Cerveau › « Articles ». Regarde A.
2. Survole un bouton de section de A, puis clique-le.

**Tu dois voir :**
- A a maintenant des sections : les H2 de la structure validée au Moteur, sans introduction ni conclusion ;
- A est « À rédiger » ; en orange : « Validez d'abord le premier jet de « A » : un article ne naît que d'un parent rédigé. » ;
- ses boutons « Créer l'article de cette section » sont grisés, avec l'infobulle « Validez d'abord le premier jet de « A » » ; le clic n'ouvre rien : aucun appel payant.

**C'est un bug si :** un panneau de candidats s'ouvre sous A.

### CER-21 — Le micro-contexte de l'article
**Exigences :** FR-CER-MICRO-CONTEXT ⚠

**Gestes :**
1. Sous A, « Le rédiger » : étape « Brief & Structure ». Déplie « Micro-contexte article ».
2. Dans « Ton / Style », tape `Direct, sans jargon`, puis clique à côté. Recharge la page.
3. Clique **« Suggerer par IA »**, puis **« Annuler »**.
4. Clique de nouveau **« Suggerer par IA »**, puis **« Appliquer »**. Attends deux secondes, puis recharge.
5. Remplace l'angle par `Des chantiers toulousains chiffrés`, puis clique à côté.

**Tu dois voir :**
- « Angle differenciant » (marqué obligatoire), « Ton / Style (optionnel) », « Consignes specifiques (optionnel) » ; l'angle déjà rempli : « Angle à préciser (suggéré à la validation de la structure) », écrit par la validation de la structure (voir le défaut) ;
- en quittant un champ, « Sauvegarde » un instant ; après rechargement, `Direct, sans jargon` est toujours là ;
- « Suggestion en cours... », puis un aperçu « Suggestion IA » : pour chaque champ déjà rempli, l'ancienne valeur → la nouvelle, avec « Appliquer » et « Annuler » ;
- « Annuler » : rien ne change ;
- « Appliquer » : les trois champs prennent la suggestion (en MOCK, l'angle « Approche pratique avec mini-cas concrets et checklist actionnable en fin d'article. »), « Sauvegarde » s'affiche, et les valeurs restent après rechargement ;
- aucune génération ne part : l'étape « Article » ne change pas, et la pile « Coûts API » n'ajoute que la suggestion.

**C'est un bug si :**
- la suggestion remplace les champs sans « Appliquer » ;
- « Sauvegarde » n'apparaît pas, ou les valeurs sont perdues au rechargement ;
- « Consignes specifiques » affiche une liste collée par des virgules.

**⚠ Défaut connu :** le micro-contexte n'est transmis que si l'angle est rempli : un ton ou des consignes seuls sont ignorés ; et l'angle provisoire écrit d'office à la validation de la structure part tel quel à l'IA. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-22 — La longueur visée, dans la Rédaction
**Exigences :** FR-CER-WORD-COUNT-RECOMMEND, FR-CER-AIGUILLAGE

**Gestes :**
1. Même page, bloc « Recommandation de contenu ».
2. Clique « + » deux fois, puis recharge.
3. Clique **« Reinitialiser »**.
4. Clique « − » jusqu'à ce que la valeur ne bouge plus. Puis **« Reinitialiser »**.

**Tu dois voir :**
- une fourchette « min – max mots » (± 20 % autour de la cible), « Cible : » entre « − » et « + », et « Base : ~N mots (type …) » : N est la longueur 💡 de CER-19, et le type celui de A ;
- chaque « + » ajoute 100 mots, la fourchette suit ; « ajuste » et « Reinitialiser » apparaissent ; la valeur ajustée reste après rechargement ;
- « Reinitialiser » revient à N, « ajuste » disparaît ;
- « − » s'arrête à 500.

**C'est un bug si :**
- la valeur ajustée est perdue au rechargement ;
- « − » descend sous 500 ;
- « Base » ne correspond pas à la longueur conseillée au Moteur.

### CER-23 — Le premier jet accepté fait de A un parent
**Exigences :** FR-CER-PARENT-WRITTEN-GATE

**Gestes :**
1. **« Valider le sommaire »**, **« Continuer vers l'Article »**, puis **« Générer l'article »**.
2. Si l'alarme « Avant d'accepter le premier jet » s'ouvre : clique « Revenir corriger » et lis le bandeau sous l'article. Puis clique **« Valider le premier jet »** et assume les 🔴 (une catégorie et une raison de 20 caractères).
3. Clique **« Éditer l'article »**.
4. Cerveau › « Articles ».

**Tu dois voir :**
- à la fin de la génération, l'étape est demandée d'elle-même : soit le bandeau « ✓ Premier jet accepté : l'article peut donner naissance à ses articles enfants dans le cocon. », soit l'alarme ;
- après « Revenir corriger » : « Premier jet pas encore accepté : les articles enfants de celui-ci ne peuvent pas être créés. » et le bouton « Valider le premier jet » ; une fois l'alarme assumée, « ✓ Premier jet accepté… » ;
- dans l'éditeur, le même bandeau « ✓ Premier jet accepté… » ;
- au Cerveau : A « Rédigé », « Ouvrir sa rédaction » ; ses sections sont celles de son texte ; le message orange a disparu et les boutons de section sont actifs.

**C'est un bug si :**
- A devient « Rédigé » alors que l'alarme a été refermée sans l'assumer ;
- les boutons restent grisés une fois le premier jet accepté ;
- le bandeau manque dans l'éditeur.

### CER-24 — Un spécialisé naît d'une section de l'intermédiaire
**Exigences :** FR-CER-AIGUILLAGE, FR-CER-CHILD-FROM-PILLAR-H2, FR-PIE-AI-GENERATION

**Gestes :**
1. Sous une section de A, **« Créer l'article de cette section »**. Coche le candidat qui finit par « prix » (en MOCK, son intention attendue est commerciale), puis **« Créer l'article »**. Appelons ce nouvel article C.
2. Sur la carte, déplie la ligne « Créé » de C.
3. Page du cocon › **« Moteur »** › « Articles suggérés ». Puis **« Rédaction »**.
4. Ouvre C : bloc « Recommandation de contenu ».

**Tu dois voir :**
- le panneau s'intitule « Créer l'article spécialisé né de la section « … » de « A » » ;
- après création, C est un lien sous la section de A, avec « À rédiger » ; C n'a pas de bloc à lui dans l'arbre : un spécialisé n'a pas de section à offrir ;
- sur la carte, C dans « Spécialisé », rangé sous le titre de A, marqué « Créé » ; son « Intention éditoriale » : « Commerciale (comparatif, sélection) », celle du candidat, puisqu'aucune proposition ne porte son titre ;
- au Moteur, C dans le groupe des spécialisés ; à la Rédaction, C dans la colonne « Spécialisé », A dans « Intermédiaire », le pilier dans « Pilier » ;
- chez C, « Base : ~1 200 mots » : la longueur visée d'un spécialisé ;
- nulle part un geste pour changer le niveau d'un article.

**C'est un bug si :**
- C propose des sections, ou un bouton « Créer l'article de cette section » ;
- C atterrit dans une autre colonne ;
- au Moteur, un groupe s'intitule par un code (« SPECIFIQUE », « INTERMEDIAIRE ») au lieu du niveau (« Spécialisé », « Intermédiaire »).

### CER-25 — Le parent résume la section de son enfant
**Exigences :** FR-CER-CHILD-FROM-PILLAR-H2

**Gestes :**
1. Sous le pilier, « Ouvrir sa rédaction », puis **« Éditer l'article »**. Clique **« Visualiser l'article »**, puis, dans le nouvel onglet, **« Exporter HTML »**. Lis l'alarme, puis « Revenir corriger ».
2. Dans l'éditeur, **« Enrichir »** › passe **« Résumer »**.
3. Ouvre « Comparer avant / après », puis **« Accepter »**. Clique **« Sauvegarder »**.
4. Visualise et exporte de nouveau ; lis l'alarme, puis « Revenir corriger ».

**Tu dois voir :**
- à l'étape 1, si la section de A dépasse 250 mots, un point 🔴 : « La section « … » compte N mots alors que l'article « A » traite ce sujet : résumez-la en 150 à 250 mots (passe « Résumer ») et renvoyez vers lui. » ;
- la passe « Résumer » (« Les chapitres devenus des articles : un résumé de 150 à 250 mots qui y renvoie ») ne propose que la section de A ;
- la proposition : un résumé d'environ 150 à 250 mots qui renvoie vers A (en MOCK, il finit par « Pour aller au bout du sujet, lisez notre article « A » : il détaille chaque étape. ») ;
- à la nouvelle exportation, plus de 🔴 sur cette section.

**C'est un bug si :**
- « Résumer » vise une section dont aucun article n'est né ;
- le 🔴 reste après le résumé accepté et enregistré.

### CER-26 — La stratégie du cocon suit l'utilisateur au Moteur et à la Rédaction
**Exigences :** FR-CER-CONTEXT-FOR-MOTEUR

**Gestes :**
1. Page du cocon › **« Moteur »** : déplie « Contexte stratégique ». Même chose à la **« Rédaction »**.
2. Cerveau : clique « Promesse » dans la barre. Crayon « Modifier le texte validé » : ajoute ` (v2)` à la fin, clique la coche, puis **« Suivant »** (c'est lui qui enregistre).
3. Rouvre le Moteur, puis la Rédaction.
4. Retire « (v2) » de la même façon : crayon, coche, **« Suivant »**.

**Tu dois voir :**
- une barre repliable « Contexte stratégique » ; dépliée : « Cible », « Douleur », « Angle », « Promesse », « CTA », chacun avec son texte validé, en lecture seule ;
- à l'étape 3, « Promesse » finit par « (v2) », au Moteur comme à la Rédaction.

**C'est un bug si :**
- la barre montre une réponse non validée ;
- « (v2) » n'apparaît pas à la réouverture.

### CER-27 — Ce que l'écran ne propose pas : stratégie d'article, douleur modifiable
**Exigences :** FR-CER-STEPS-ARTICLE ⚠, FR-PAIN-IMMUTABLE-AFTER-CEREVEAU ⚠

**Gestes :**
1. Sur la page du cocon, lis la carte « Rédaction ».
2. Ouvre la rédaction de A, étape « Brief & Structure » : sous « Contexte strategique », déplie « Contexte envoyé à Claude ».
3. Au Cerveau, déplie la ligne « Créé » de A et lis « Douleur ».
4. Au Moteur, ouvre A et parcours ses onglets ; à la Rédaction, son brief.

**Tu dois voir :**
- la carte « Rédaction » annonce « Stratégie article, brief, sommaire et rédaction pour chaque article du cocon », mais aucun écran ne demande la stratégie propre à l'article (Cible, Douleur, Aiguillage, Angle, Promesse, CTA) : c'est le défaut connu ;
- la rédaction de A montre la stratégie du cocon : « Stratégie cocon validée » et ses étapes ;
- la « Douleur » de A sur la carte : un simple texte, sans crayon ;
- aucun onglet du Moteur (pas de champ « Douleur client » au Radar) ni écran de la Rédaction ne propose de modifier la douleur de A.

**C'est un bug si :**
- un écran du Moteur ou de la Rédaction permet de modifier la douleur de l'article ;
- la rédaction de A montre une stratégie vide alors que celle du cocon est remplie.

**⚠ Défaut connu :** FR-CER-STEPS-ARTICLE — aucun écran ne propose la stratégie d'un article : le Cerveau travaille au niveau du cocon, seul le mode automatique enregistre une stratégie d'article ; et le mode automatique, repris sur un article créé à l'écran, relance le Cerveau sur le sujet « (reprise) », qui abîme le titre et la stratégie de l'article. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-PAIN-IMMUTABLE-AFTER-CEREVEAU — la douleur d'un article ne se modifie nulle part après sa création, pas même au Cerveau : aucun écran ne le propose et le serveur ne l'accepte pas ; la seconde règle (« une douleur modifiée au Cerveau est reprise ») n'a aucun geste qui l'exerce. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-28 — La configuration du thème : une seule, enregistrée d'elle-même
**Exigences :** FR-CER-THEME-CONFIG ⚠

**Gestes :**
1. Clique la roue dentée (infobulle « Configuration du thème »). Elle vaut pour tout l'outil : ne vide aucun champ, et note ce que tu changes pour le remettre.
2. Dans « Votre communication » › « Ton & Vocabulaire » › « Vocabulaire métier », tape `recette-test`, puis Entrée. Attends 2 secondes, puis recharge.
3. Retire `recette-test` avec sa croix « × ». Attends 2 secondes, puis recharge.
4. Dans « Style de communication », ajoute ` (recette)` à la fin, puis clique **« Sauvegarder »**.
5. Ouvre le Cerveau de « Recette <date> » et déplie « Contexte envoyé à Claude ».
6. Reviens à la configuration et retire « (recette) ».

**Tu dois voir :**
- « Configuration du Thème », le bouton « Sauvegarder », l'encadré « Remplissage automatique par IA » ; « Remplir les champs avec Claude » grisé tant que le texte libre est vide ;
- trois perspectives : « Votre entreprise » (« Positionnement », « Offres & Services »), « Votre client type » (« Profil », « Besoins & Douleurs »), « Votre communication » (« Ton & Vocabulaire ») ;
- `recette-test` en pastille, toujours là après rechargement, puis absent après la croix et le rechargement ;
- « Sauvegarde... » un instant sur le bouton ;
- au Cerveau, dans « Contexte envoyé à Claude », le bloc « Communication » : « Ton » finit par « (recette) » ;
- en MOCK, n'utilise pas « Remplir les champs avec Claude » : la réponse simulée ne remplit pas les champs (voir CER-R1).

**C'est un bug si :**
- une saisie est perdue au rechargement ;
- le Cerveau ne montre pas la nouvelle valeur.

**⚠ Défaut connu :** hors Discovery, qui reçoit le secteur, l'audience, les services et la promesse, les consignes du Moteur et de la Rédaction ne reçoivent ni le positionnement, ni les offres, ni le ton : seule la localisation y parvient, comme zone du client. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## En mode RÉEL (payant)

Passe le bouton en **RÉEL** pour ces vérifications seulement, puis repasse en **MOCK**. Le Cerveau ne chiffre pas le coût avant l'appel : les boutons de création disent « appel payant » dans leur infobulle, et chaque dépense s'inscrit ensuite dans « Coûts API ».

### CER-R1 — Remplir la configuration avec Claude
**Exigences :** FR-CER-THEME-CONFIG ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Ce bouton remplace toute la configuration : demande d'abord à Claude de sauvegarder la base.
2. Dans « Remplissage automatique par IA », décris l'entreprise en quelques phrases : métier, services, clientèle, ville, ton. Clique **« Remplir les champs avec Claude »**.
3. Recharge la page.
4. Remets ta configuration d'origine, ou fais restaurer la sauvegarde par Claude.

**Tu dois voir :**
- « Analyse en cours... », puis les champs remplis d'après ton texte, listes comprises ; le texte libre se vide ;
- après rechargement, les valeurs sont toujours là.

**C'est un bug si :**
- un message d'erreur s'affiche ;
- des champs restent vides alors que ton texte les décrit.

**⚠ Défaut connu :** hors Discovery, qui reçoit le secteur, l'audience, les services et la promesse, les consignes du Moteur et de la Rédaction ne reçoivent ni le positionnement, ni les offres, ni le ton : seule la localisation y parvient, comme zone du client. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-R2 — Suggestions, fusion, sous-questions et enrichissement réels
**Exigences :** FR-CER-STEPS-COCOON
**Mode :** RÉEL (payant)
**Gestes :**
1. Cocon « La recette <date> », étape « CTA » : tape une réponse courte, puis **« Demander une suggestion à Claude »**.
2. **« Valider ▾ »** › **« Fusionner les deux »**.
3. Étape « Angle » : **« + »** ; dans la sous-question, **« Suggestion Claude »**, puis **« Valider ▾ »** › **« La suggestion »**.
4. Clique **« Suivant »** pour enregistrer.

**Tu dois voir :**
- une suggestion en français, propre à l'étape (un appel à l'action), qui tient compte des étapes déjà validées et de la configuration du thème ;
- une fusion qui garde l'idée de ta réponse et celle de la suggestion ;
- une sous-question qui complète la question d'« Angle » sans la répéter, et une suggestion qui y répond ;
- le texte validé d'« Angle » enrichi de la sous-réponse, sans perdre son sens d'origine.

**C'est un bug si :**
- la suggestion ignore l'étape ou les réponses validées ;
- l'enrichissement remplace le texte validé au lieu de le compléter.

### CER-R3 — Candidats réels : vraies mesures, valeurs absentes, mesures relues
**Exigences :** FR-CER-KEYWORD-REAL-DATA, FR-PIE-AI-GENERATION, FR-CER-CHILD-FROM-PILLAR-H2
**Mode :** RÉEL (payant)
**Gestes :**
1. Cocon « Recette <date> » : sous une section libre du pilier, **« Créer l'article de cette section »**.
2. Déplie « Coûts API » et note la dépense DataForSEO. Clique **« Annuler »**, puis relance sur la même section.
3. **« Annuler »** : ne crée rien.

**Tu dois voir :**
- 3 à 5 candidats en rapport avec le titre de la section, chacun dans un titre qui le contient en entier, avec une raison ;
- des mesures qui diffèrent d'un candidat à l'autre ; une mesure absente écrite « — », jamais « 0 » ; un candidat sans mesure marqué « Non mesuré : ses données n'ont pas pu être récupérées, il ne peut pas être choisi. », case grisée ;
- à la seconde demande, un appel d'IA de plus dans la pile ; pour les mots-clés déjà mesurés, la dépense DataForSEO ne bouge pas : l'outil relit ses mesures de moins de 7 jours.

**C'est un bug si :**
- un volume ou une difficulté inconnus s'affichent « 0 » ;
- un candidat « Non mesuré » peut être coché ;
- la dépense DataForSEO repart pour des mots-clés déjà mesurés.

### CER-R4 — Carte complète et ajouts réels : niveaux compris, consigne suivie
**Exigences :** FR-CER-TYPE-TOLERANT ⚠, FR-PIE-AI-GENERATION, FR-CER-COCOON-PROGRESSIVE ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Cocon « La recette <date> », étape « Articles » : dans « Sujets suggérés », clique **« Réessayer »** (ou l'icône « Régénérer les sujets »).
2. **« Générer avec Claude ▾ »** › **« La carte complète du cocon »**.
3. **« + Ajouter un spécialisé »** › **« Article guidé... »** : `Un article sur les devis à 1 $ ; garde « $1 » et « $& » tels quels`, puis **« Générer »**.

**Tu dois voir :**
- des sujets cochés, qu'on peut décocher, retirer ou compléter (« Ajouter un sujet… ») ;
- les trois colonnes remplies, les spécialisés groupés sous leur intermédiaire ;
- chaque ligne avec une douleur et une intention parmi les quatre ;
- l'article guidé traite des devis ; si son titre ou sa raison cite la consigne, « $1 » et « $& » y restent tels quels.

**C'est un bug si :**
- toutes les lignes tombent dans « Spécialisé » ;
- l'ajout guidé échoue à cause des caractères « $ ».

**⚠ Défaut connu :** FR-CER-TYPE-TOLERANT — sur la carte, un niveau illisible rendu par l'IA devient « Spécialisé » (ou le niveau demandé, pour un ajout), sans message propre à la ligne. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-CER-COCOON-PROGRESSIVE — « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CER-R5 — Micro-contexte, longueur et stratégie dans les textes générés
**Exigences :** FR-CER-MICRO-CONTEXT ⚠, FR-CER-WORD-COUNT-RECOMMEND, FR-CER-CONTEXT-FOR-MOTEUR, FR-CER-THEME-CONFIG ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Cocon « Recette <date> » : au Moteur, prépare C comme A en CER-19 (Capitaine, Lieutenants, Structure). Regarde la pile « Coûts API ».
2. Rédaction de C, « Micro-contexte article » : efface l'angle et mets `Tutoiement, phrases très courtes` dans « Ton / Style ». Puis **« Valider le sommaire »**, **« Continuer vers l'Article »**, **« Générer l'article »**.
3. Remplis l'angle avec `Comparer trois devis réels`, puis **« Régénérer l'article »**.

**Tu dois voir :**
- la ligne « 💡 Longueur conseillée » avec une raison rédigée par l'IA, et non un calcul « Heuristique : … », quand la moyenne des concurrents et la structure existent ;
- un texte proche de la cible de « Recommandation de contenu » ;
- à l'étape 3, un texte qui suit l'angle et le ton, et qui accroche par la douleur du cocon ;
- le défaut connu : à l'étape 2, sans angle, le tutoiement est ignoré ; le « Style de communication » de la configuration n'est pas repris non plus.

**C'est un bug si :**
- à l'étape 3, l'angle ou le ton sont ignorés ;
- le texte s'écarte nettement de la longueur visée.

**⚠ Défaut connu :** FR-CER-MICRO-CONTEXT — le micro-contexte n'est transmis que si l'angle est rempli : un ton ou des consignes seuls sont ignorés ; et l'angle provisoire écrit d'office à la validation de la structure part tel quel à l'IA. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

**⚠ Défaut connu :** FR-CER-THEME-CONFIG — hors Discovery, qui reçoit le secteur, l'audience, les services et la promesse, les consignes du Moteur et de la Rédaction ne reçoivent ni le positionnement, ni les offres, ni le ton : seule la localisation y parvient, comme zone du client. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

## Hors recette

Aucune exigence de ce module n'échappe à l'écran : chacune a sa vérification ci-dessus.

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
