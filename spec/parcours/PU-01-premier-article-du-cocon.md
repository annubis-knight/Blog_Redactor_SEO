---
title: Parcours — Premier article du cocon
id: PU-01
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-01 — « Je lance un nouveau cocon et je publie son article pilier »

**But :** partir d'un thème encore vide et obtenir l'article pilier du cocon, rédigé, vérifié et exporté en HTML, prêt à être mis en ligne.
**Quand :** le consultant ouvre un nouveau chantier pour le blog, par exemple un cocon « Création de site internet » pour les artisans toulousains, et veut en écrire la tête avant tout le reste.
**Départ :** l'accueil, avec au moins un silo ; le cocon n'existe pas encore.
**Arrivée :** le pilier est au statut « Publié », ses quatre verrous du Moteur sont posés, son premier jet est accepté (il peut donner naissance à des articles enfants), et un fichier HTML de l'article a été téléchargé.
**Recette :** parcours express, étapes 1 à 10 ; module 01 (DASH-2, DASH-4) ; module 02 (CER-1 à CER-11) ; module 05 (CAP-10, CAP-11) ; module 06 (LIE-9, HN-2 à HN-4, LEX-2 à LEX-6, FIN-2, FIN-3) ; module 07 (RED-5 à RED-7, RED-18, RED-22, RED-23).
**Test automatique :** le robot pose la stratégie du cocon en cinq étapes, crée le pilier sur un mot-clé mesuré, termine le brainstorm, verrouille au Moteur Capitaine, Lieutenants, Structure et Lexique jusqu'à « Prêt pour la Rédaction », puis renseigne le micro-contexte, valide le sommaire, fait écrire et accepter le premier jet, retouche le texte dans l'éditeur et l'exporte à travers la porte de publication, jusqu'au statut « publié ». Il part d'un cocon préparé par le test (pas de la carte « Nouveau cocon ») et ne lance aucune passe « Enrichir ».

## Les étapes

### 1. Créer le cocon depuis l'accueil
**Exigences :** FR-DASH-COCOON-CREATE ⚠, FR-DASH-WORKFLOW-CHOICE

Sur l'accueil, chaque silo se termine par une carte en pointillés « Nouveau cocon ». L'utilisateur clique dessus, tape le nom dans « Nom du cocon... » et appuie sur Entrée (Échap annule). La page du cocon s'ouvre aussitôt : « 0 articles · 0% complété », puis « Choisissez une phase de travail : » et trois cartes, « Cerveau » (« 6 étapes »), « Moteur » (« 0 mot-clé ») et « Rédaction » (« 0 article, 0% »).

### 2. Poser la stratégie du cocon en cinq étapes
**Exigences :** FR-CER-STEPS-COCOON ⚠, FR-CER-SAISIE-PRESERVEE ⚠

Carte « Cerveau » : la barre du haut affiche « Cible », « Douleur », « Angle », « Promesse », « CTA », « Articles », et les étapes pas encore atteintes restent fermées. À chaque étape, l'utilisateur répond dans « Votre réponse », peut cliquer « Demander une suggestion à Claude », puis choisit dans « Valider ▾ » : « Mon texte », « La suggestion » ou « Fusionner les deux ». Le bouton « + » (« Approfondir ») ajoute une sous-question dont la réponse enrichit le texte validé. « Suivant » enregistre et passe à l'étape suivante.

### 3. Créer le pilier sur un mot-clé mesuré, puis terminer le brainstorm
**Exigences :** FR-CER-COCOON-PROGRESSIVE ⚠, FR-CER-KEYWORD-REAL-DATA, FR-CER-CREATION-HONNETE, FR-RED-GEN-UNLOCK ⚠

À l'étape « Articles », le bloc « Construire le cocon » dit « Ce cocon n'a pas encore de pilier. Commencez par lui : les autres articles naîtront de ses sections. » et ne propose que « Créer le pilier ». Le panneau « Le pilier du cocon » cherche des candidats puis mesure leurs données réelles (« Volume », « Difficulté », « Intention », « En tête de Google ») ; rien n'est choisi d'office. Au moins deux candidats sont des requêtes courtes et larges, le sujet du cocon tel qu'on le tape. Si aucun ne lui convient, ou si aucun n'a de mesures, l'utilisateur tape son propre mot-clé dans « Votre mot-clé » : il est mesuré aussitôt, l'IA écrit la difficulté de son lecteur, et il rejoint la liste. L'utilisateur coche un candidat, relit le titre prérempli, clique « Créer l'article » : le pilier apparaît dans l'arbre, badge « Pilier », état « À rédiger ». La « Carte indicative du cocon », en dessous, peut guider la suite mais ne crée aucun article. Enfin « Terminer le brainstorm » marque le Cerveau terminé et ramène à la page du cocon.

### 4. Ouvrir le pilier au Moteur et verrouiller son Capitaine
**Exigences :** FR-MOT-PHASES, FR-CER-CONTEXT-FOR-MOTEUR ⚠, FR-MOT-NO-AUTO-ACTION, FR-CAP-SCAN ⚠, FR-CAP-LOCK-RADIO, FR-CAP-LOCK-GATE

Carte « Moteur » : la barre « Contexte stratégique » rappelle la stratégie validée, et « Articles suggérés (N) » liste le pilier. Un clic sur son titre active les onglets, rangés en « 1 Générer », « 2 Valider », « 3 Finaliser », et ouvre « Capitaine ». Le champ « Tester un mot-clé capitaine… » porte le mot-clé du pilier, et l'outil l'étudie de lui-même : sa carte montre « vol », « KD », « CPC », « PAA » et un anneau « Score Pertinence ». L'utilisateur clique le cadenas de la carte (infobulle « Verrouiller ») : la porte vérifie le mot-clé, puis le point « Capitaine » de l'article se remplit.

### 5. Retenir les lieutenants
**Exigences :** FR-LIE-SERP-ANALYZE ⚠, FR-LIE-PROPOSE-AI, FR-LIE-CHECKBOX-LOCK-IMMEDIATE ⚠, FR-LIE-CHECK, FR-LIE-LOCK-GATE

Onglet « Lieutenants » : « Analyser SERP » lit les dix premiers résultats Google du Capitaine, puis l'IA propose des lieutenants notés, aucun coché. L'utilisateur en coche au moins trois pour un pilier ; chaque case est enregistrée aussitôt, sans bouton. Tant qu'il en manque, un bandeau « Étape non validée. » donne la raison ; avec assez de lieutenants, le point « Lieutenants » se remplit.

### 6. Valider la structure de l'article
**Exigences :** FR-HN-TAB ⚠, FR-HN-LOCK-GATE, FR-CER-WORD-COUNT-RECOMMEND ⚠

Onglet « Structure » : « Générer la structure » propose un H1 qui contient le Capitaine, des H2 et des H3 tirés des lieutenants retenus. L'utilisateur verrouille (🔒) les titres à garder et peut redemander une proposition. « Valider la structure » passe la porte, puis affiche « ✅ Structure validée : elle sert de sommaire à la rédaction. » ; la pile « Coûts API » annonce « 💡 Longueur conseillée : N mots ».

### 7. Retenir le lexique du métier
**Exigences :** FR-LEX-PRECHECK-SERP ⚠, FR-LEX-TFIDF, FR-LEX-METIER-ONLY, FR-LEX-PRECHECK-PERSISTE, FR-LEX-CHECK

Onglet « Lexique » : si les pages concurrentes sont déjà lues, « Extraire le Lexique » ; sinon l'écran dit « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » et propose « Lancer l'analyse SERP (~$0.003 DataForSEO) », qui demande confirmation. Les termes arrivent en trois listes (Obligatoire, Differenciateur, Optionnel), sans mot vide ni morceau de menu, et aucun n'est coché. L'utilisateur coche ceux qu'il veut employer : dès le premier, l'étape « Lexique validé » est demandée à la porte.

### 8. Relire la Finalisation et passer à la Rédaction
**Exigences :** FR-FIN-RECAP, FR-FIN-CHECK, FR-FIN-LINK-REDACTION ⚠, FR-MOT-SOFT-GATING ⚠

Onglet « Finalisation » : quatre sections en lecture seule, Capitaine, Lieutenants, Structure, Lexique. Avec les quatre verrous, le titre devient « ✅ Prêt pour la Rédaction » et « Aller à la Rédaction → » s'active ; sinon il est grisé et son infobulle liste les « Étapes restantes : … ». Le bouton ouvre la page Rédaction du cocon, où la carte du pilier ouvre sa rédaction guidée.

### 9. Préparer le brief et arrêter le sommaire
**Exigences :** FR-CER-MICRO-CONTEXT ⚠, FR-RED-WORD-COUNT-TARGET, FR-RED-OUTLINE ⚠

La rédaction guidée s'ouvre sur « Brief & Structure ». Dans « Micro-contexte article », l'utilisateur écrit au moins « Angle différenciant » ; chaque champ s'enregistre quand il le quitte (« Sauvegardé »). « Recommandation de contenu » affiche la « Cible : » en mots, ajustable par pas de 100. Le sommaire vient de la structure validée au Moteur, avec « Introduction » et « Conclusion » ajoutées : l'utilisateur le retouche s'il veut, puis « Valider le sommaire » (ou « Continuer vers l'Article » s'il est déjà validé) mène à l'étape « Article ».

### 10. Faire écrire et accepter le premier jet
**Exigences :** FR-RED-DRAFT-SINGLE-PASS, FR-RED-GEN-SAUVEGARDE-AU-FIL, FR-RED-DRAFT-TO-SOURCE, FR-RED-META ⚠, FR-RED-META-CAPTAIN, FR-CER-PARENT-WRITTEN-GATE

« Générer l'article » écrit tout le texte d'un seul tenant : la barre affiche « Section n/N » et le titre du chapitre, et le texte apparaît au fil. Un chiffre que l'IA ne peut pas garantir devient un passage « [à sourcer : …] » surligné. Le titre et la description pour Google suivent sans second clic. Puis l'étape « premier jet accepté » est demandée à sa porte : le bandeau « ✓ Premier jet accepté : l'article peut donner naissance à ses articles enfants dans le cocon. » s'affiche, ou l'alarme « Avant d'accepter le premier jet » s'ouvre.

### 11. Enrichir et relire le texte dans l'éditeur
**Exigences :** FR-RED-ENRICH-PASSES, FR-RED-EDITOR-TIPTAP, FR-RED-SEO-LIVE, FR-RED-GEO-LIVE

« Éditer l'article » ouvre l'éditeur, avec les scores « SEO » et « GEO » qui suivent chaque modification. Le panneau « Enrichir » propose des passes (« Sources », « Exemples », « Tableaux », « Images », « FAQ »), chapitre par chapitre : « Rien ne change dans l'article tant que vous n'acceptez pas ». L'utilisateur ouvre « Comparer avant / après », puis « Accepter » ou « Refuser » chaque proposition. Il retouche le texte à la main ; « Sauvegarder » ou Ctrl+S enregistre (« ✓ Sauvegardé … »), et l'éditeur enregistre aussi de lui-même.

### 12. Visualiser l'article et le publier
**Exigences :** FR-RED-PUBLISH-GATE, FR-RED-EXPORT-HTML, FR-RED-PROGRESS ⚠

« Visualiser l'article », proposé dès que le texte, le titre et la description existent, ouvre l'aperçu au gabarit du site dans un nouvel onglet. « Exporter HTML » passe la porte de publication, qui rejoue les contrôles du texte, de la méta et des quatre verrous du Moteur. Si elle ne signale rien, ou une fois ses points lus et assumés, un fichier HTML se télécharge et l'article passe au statut « Publié ».

## Ce qui peut mal tourner

### Une porte alerte en chemin
**Exigences :** FR-INFRA-VERIFIER-SHARED, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-INFRA-GATE-WAIVER

Un Capitaine sans volume ou que Google ne suggère pas, trop peu de lieutenants, une structure hors des règles du pilier : l'alarme « Avant de … » s'ouvre et rien n'est validé. Un point 🟠 se passe en cochant « J'ai lu » ; un 🔴 demande une catégorie et une raison d'au moins 20 caractères, puis « Je prends la responsabilité et je continue » ; un ⛔ ne se déroge pas. « Revenir corriger » ou Échap ferme l'alarme sans rien enregistrer. Chaque dérogation revient à la publication, pour être reconfirmée. Si les données d'un point changent pendant que l'alarme est ouverte, la réponse à ce point est refusée : « Ce point a changé depuis que vous l’avez lu : relisez-le, puis répondez de nouveau. »

### La carte complète du cocon est relancée après la création du pilier
**Exigences :** FR-CER-COCOON-PROGRESSIVE ⚠

« Générer avec Claude ▾ » › « La carte complète du cocon » refait toute la carte indicative d'un coup. Elle ne devrait pas toucher aux articles déjà créés. Aujourd'hui, elle remplace aussi la ligne « Créé » du pilier : une fois la carte enregistrée, le pilier sort de la liste d'articles du Moteur, alors qu'il reste dans « Construire le cocon ».

### « Terminer le brainstorm » a été oublié
**Exigences :** FR-RED-GEN-UNLOCK ⚠

Sans ce clic, la rédaction guidée garde l'étape « Article » grisée, avec l'indication « Complétez le Cerveau pour générer cet article ». Il suffit de revenir au Cerveau, étape « Articles », et de cliquer « Terminer le brainstorm ». Aujourd'hui, seul le bouton de la barre du haut est verrouillé : « Valider le sommaire » et « Continuer vers l'Article » ouvrent quand même l'étape « Article ».

### Une panne pendant l'écriture du premier jet
**Exigences :** FR-RED-DRAFT-SINGLE-PASS, FR-RED-GEN-SAUVEGARDE-AU-FIL

Si l'IA tombe en panne en pleine écriture, la rédaction s'arrête ; les chapitres terminés restent enregistrés, et l'utilisateur relance par « Générer l'article ». L'outil le dit par un message, dans les deux vues de rédaction.

### La publication est refusée
**Exigences :** FR-RED-PUBLISH-GATE, FR-RED-ENRICH-PASSES, FR-RED-EXPORT-HTML

Une image encore « à fournir » (posée par la passe « Images »), une méta coupée ou un autre défaut ⛔ bloquent : le bouton affiche « Correction nécessaire ». Après « Revenir corriger », l'écran dit « Publication annulée : corrigez les points signalés, puis exportez à nouveau. », rien n'est marqué publié ni téléchargé. L'utilisateur corrige dans l'éditeur, enregistre, puis exporte à nouveau depuis l'aperçu : le fichier téléchargé est le texte que la porte vient de juger.

## Défauts connus sur ce parcours

- FR-FIN-LINK-REDACTION — « Aller à la Rédaction → » transmet l'article choisi, mais la page Rédaction l'ignore : on arrive sur la liste du cocon, pas sur l'article.
- FR-RED-PROGRESS — rouvrir la rédaction guidée d'un article déjà rédigé ramène toujours à « Brief & Structure ».
- FR-DASH-COCOON-CREATE — un nom qui ne diffère d'un cocon existant que par les majuscules ou les accents, ou le même nom dans un autre silo, est accepté ; les deux cocons partagent alors la même stratégie au Cerveau et au Moteur.
- FR-CER-STEPS-COCOON — à l'étape CTA, « + » (approfondir) échoue sans rien afficher : aucune sous-question n'apparaît.
- FR-CER-SAISIE-PRESERVEE — une réponse tapée pendant un enregistrement reste affichée mais n'est plus dans la stratégie : le « Suivant » d'après enregistre un champ vide.
- FR-CER-COCOON-PROGRESSIVE — « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur ; « Régénérer › Titre » sur une ligne « Créé » ne change le titre que sur la carte, sans l'enregistrer : le Moteur montre alors un autre titre que l'arbre et la Rédaction.
- FR-RED-GEN-UNLOCK — seule la barre de navigation est verrouillée : « Valider le sommaire » et « Continuer vers l'Article » ouvrent l'étape Article sans vérifier le Cerveau.
- FR-CER-CONTEXT-FOR-MOTEUR — une stratégie sans aucune valeur validée affiche une barre « Contexte stratégique » vide ; en passant d'un cocon à l'autre, la barre du cocon précédent reste affichée le temps du chargement.
- FR-CAP-SCAN — dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention ; un mot-clé dont le volume, la difficulté ou le CPC est absent est remesuré, et repayé, à chaque étude ; un échec d'étude s'affiche en anglais technique, sans cause (« Erreur : Keyword validation failed »).
- FR-LIE-SERP-ANALYZE — la pile d'activité annonce « Scraping ~N URLs via DataForSEO » même quand l'analyse est relue en base ; « Tout relancer (SERP + IA) » ne relance rien pendant 7 jours : il relit l'analyse et les propositions gardées, et doit s'appeler « Recharger l'analyse ».
- FR-LIE-CHECKBOX-LOCK-IMMEDIATE — relancer la proposition de l'IA décoche à l'écran les lieutenants déjà retenus et retire l'étape, alors que la liste enregistrée les garde ; et le bouton de relance du panneau de l'IA disparaît tant que ce panneau affiche les failles de contenu de la dernière génération.
- FR-HN-TAB — un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit.
- FR-CER-WORD-COUNT-RECOMMEND — sans avis de l'IA, la raison de la longueur conseillée s'affiche en jargon technique (« Heuristique : 60% SERP avg … »).
- FR-LEX-PRECHECK-SERP — pendant l'analyse lancée, « Lancer l'analyse SERP » reste cliquable : un second clic confirmé relance une analyse payante.
- FR-MOT-SOFT-GATING — à l'onglet Lexique, Capitaine non verrouillé, « Lancer l'analyse SERP » reste actif malgré le bandeau : l'analyse payante part, et ses termes peuvent ensuite être retenus.
- FR-CER-MICRO-CONTEXT — le micro-contexte n'est transmis que si l'angle est rempli : un ton ou des consignes seuls sont ignorés ; l'angle provisoire écrit d'office à la validation de la structure part tel quel à l'IA ; un échec d'enregistrement n'est jamais signalé.
- FR-RED-OUTLINE — les boutons Annuler / Rétablir du sommaire ne s'activent jamais : les retouches ne sont pas enregistrées dans l'historique.
- FR-RED-META — la méta ne se modifie pas à la main et ne se relance pas seule : réessayer relance tout l'article.
