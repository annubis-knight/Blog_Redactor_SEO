---
title: Parcours — Faire écrire un article par le mode automatique
id: PU-06
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-06 — « Je donne un sujet au robot, il prépare l'article ; je le relis et je le publie moi-même »

**But :** obtenir un article rangé à sa place dans un cocon, mots-clés choisis et premier jet accepté, sans passer écran par écran, puis le relire, le corriger et le publier.
**Quand :** Arnaud veut produire en série les articles d'un cocon déjà lancé. Il a une idée vague (« aider les artisans du bâtiment à être visibles localement ») et veut un brouillon solide à relire plutôt qu'une heure de clics.
**Départ :** l'outil tourne sur sa machine ; au moins un silo et un cocon existent ; si l'article doit être un enfant, son futur parent a son premier jet accepté.
**Arrivée :** un article au statut « Brouillon » dans l'outil, avec sa stratégie, ses mots-clés, sa structure, son texte et sa méta, et un fichier HTML dans le dossier de sortie du robot ; après relecture à l'écran, l'article est « Publié » et son fichier HTML téléchargé.
**Recette :** parcours express, étapes 9 et 10, et module 07 (RED-9, RED-11, RED-12, RED-22, RED-23) pour la relecture et la publication à l'écran ; aucune vérification ne lance le robot lui-même (manque).
**Test automatique :** l'enchaînement du robot (Cerveau, pause 1, création de l'article, Moteur, pause 2, Rédaction), ses relances bornées et ses abandons sont rejoués sur des phases simulées, sans serveur ; d'autres tests vérifient ses deux pauses, son plan de reprise, la question « Cocon cible » (le cocon nommé impose l'emplacement), son arrêt sur un refus de porte, la lecture au terminal d'une porte toute 🟠 et son contrôle du texte avant export. Aucun ne lance le robot contre un serveur, ni ne suit l'article jusqu'à sa relecture et sa publication à l'écran.

## Les étapes

### 1. Lancer le robot, en mode simulé d'abord
**Exigences :** NFR-COST-AI-MOCK, FR-EXT-TESTS-NO-COST, FR-INFRA-RUNTIME-MODE

Tu lances `npm run dev` dans un terminal, puis `npm run auto:article` dans un second. Sans option, le robot travaille en simulé et le dit en toutes lettres : « MODE MOCK (défaut) — brief et données SEO SIMULÉS, sans rapport avec ton sujet. », puis « Pour un vrai résultat : npm run auto:article -- --mode=real ». Avec `npm run auto:article -- --mode=real`, il prévient : « Les appels DataForSEO / Claude sont facturés (~$0.35 par run). ». Le mode choisi s'applique à tout le serveur, donc aussi à l'application ouverte à côté ; si le serveur ne répond pas, le robot s'arrête sur « Serveur injoignable sur … » et « → Lance « npm run dev » dans un autre terminal, puis relance. ».

### 2. Donner le sujet
**Exigences :** FR-CER-AIGUILLAGE, FR-CAP-LOCK-GATE

Le robot affiche l'arbre des silos, cocons et articles, puis pose trois questions : « Sujet de l'article (une phrase, même vague) › », « Cocon cible (optionnel — nom d'un cocon existant ; [Entrée] laisse le script proposer) › » et « Contexte business (optionnel) › ». Un cocon nommé ici (majuscules et espaces comptent pour rien) impose l'emplacement, comme `--cocoon` : l'IA ne propose plus d'autre cocon. Un nom qui ne désigne aucun cocon est dit (« Aucun cocon ne s'appelle « … ». Cocons existants : … »), et la question revient ; Entrée laisse le robot proposer. Le niveau n'est pas demandé : il découlera de la place trouvée dans le cocon. Pour décider toi-même, tu ajoutes `--cocoon=<nom>` (cocon imposé, la question n'est alors pas posée), `--level=pilier`, `intermediaire` ou `specifique` (avec un cocon imposé seulement), ou `--capitaine=<mot-clé>` (mot-clé principal imposé, que la porte du capitaine juge quand même). `--config=<fichier>` lance le run sans questions, d'après un petit fichier qui donne le sujet (et, s'il le nomme, le cocon imposé) ; les deux pauses sont alors validées d'office.

### 3. Valider l'emplacement et le brief (pause 1)
**Exigences :** FR-CER-CHILD-FROM-PILLAR-H2, FR-INFRA-ARTICLE-STRATEGIES, FR-CER-STEPS-ARTICLE ⚠

« ━━ Phase 1 — Cerveau ━━ » : l'IA transforme le sujet en brief (titre, mot-clé pressenti, douleur, cible, angle, promesse, appel à l'action) et propose un emplacement. Le récap « ── Gate 1 — Emplacement & brief ── » montre l'arbre du silo retenu, « Emplacement proposé » avec sa raison, « Alternatives évaluées » avec leur score, puis l'article ; « ⚠ HORS PÉRIMÈTRE » signale un sujet que l'IA juge étranger à ton activité. « [Entrée] valider · [e] changer l'emplacement · [r] régénérer · [a] abandonner » : `e` choisit un autre cocon et un niveau dans la liste, sans appel à l'IA ; `r` redemande brief et emplacement. Rien n'est créé avant ta validation ; ensuite, « Article #N créé — … » (note ce numéro) et « Stratégie Cerveau persistée. » : un enfant naît dans la section libre de son parent qui parle le plus du sujet, et le brief devient la stratégie propre de l'article.

### 4. Laisser le Moteur choisir les mots-clés
**Exigences :** FR-INFRA-VERIFIER-SHARED, FR-MOT-CHECKS, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-HN-LOCK-GATE, FR-LEX-METIER-ONLY ⚠

« ━━ Phase 2 — Moteur ━━ » : le robot fait proposer des mots-clés, les mesure, écarte ceux qui sont hors de ton offre, puis soumet les meilleurs à la porte du capitaine et retient le premier qui passe sans alerte (« Capitaine : « … » (GO, …) »). Il enchaîne « Lieutenants : N retenus. », « Structure : N chapitres. » et « Lexique : N termes. ». Chaque décision est enregistrée, puis demandée à la même porte qu'à l'écran : les six points de progression de l'article se remplissent comme si tu avais cliqué. Avec `--verbose` (ou `-v`), le robot détaille ce qu'il écarte et pourquoi.

### 5. Valider les mots-clés (pause 2)
**Exigences :** FR-MOT-CANNIBALIZATION ⚠, FR-LIE-LOCK-GATE

Le récap « ── Gate 2 — Mots-clés Moteur ── » donne le capitaine, les lieutenants, le lexique et, s'il y en a, « ⚠ Proximité détectée : » avec les articles dont le mot-clé ressemble au capitaine. « [Entrée] valider · [r] relancer le Moteur · [a] abandonner » : une proximité forte exige de taper « oui » (« ⚠ Cannibalisation forte — taper « oui » pour confirmer › »), sinon le récap revient. `r` refait tout le Moteur, ce qui se repaie en réel, cinq fois au plus. `a` arrête le run (« Run interrompu au gate. ») : l'article reste créé, avec les étapes du Moteur déjà accordées.

### 6. Laisser la Rédaction écrire le premier jet
**Exigences :** FR-RED-DRAFT-SINGLE-PASS ⚠, FR-RED-DRAFT-TO-SOURCE, FR-RED-META-CAPTAIN ⚠, FR-CER-PARENT-WRITTEN-GATE, FR-RED-ENRICH-SOURCES

« ━━ Phase 3 — Rédaction ━━ » : le sommaire est tiré de la structure validée, puis le premier jet s'écrit en un seul appel (« Article — premier jet en un appel… » ; chaque chapitre s'affiche avec `--verbose`). Un chapitre trop long ou trop court est réécrit à sa longueur, la méta est générée, puis l'étape « premier jet accepté » est demandée à sa porte : c'est elle qui permettra à l'article d'avoir des enfants. Chaque chiffre sans source devient un passage « à sourcer », que le robot cherche à sourcer sur le web ; ce qui reste sans source est réécrit sans chiffre. Il pose les liens internes vers les seuls articles déjà publiés (« Maillage : N lien(s) interne(s) posé(s). »), puis met l'article au statut « Brouillon » : il ne publie jamais.

### 7. Lire le récap et ouvrir le fichier produit
**Exigences :** FR-RED-EXPORT-HTML, FR-RED-PUBLISH-GATE, NFR-COST-DATAFORSEO-BUDGET

Avant d'écrire le fichier, le robot contrôle le texte : un texte vide ou pollué par l'IA n'est pas exporté, et les preuves invérifiables sont listées (« N affirmation(s) invérifiable(s) à relire avant publication : »). « Article exporté : … » donne ensuite le chemin du fichier HTML, et « ── Récap du run ── » liste les étapes, « Coût IA », « Coût SEO (estim.) » (en réel seulement : la dépense DataForSEO de la fenêtre pendant le run) et le total, avant « Run terminé. ». `npm run auto:preview` ouvre dans le navigateur un aperçu de tous les articles produits. Le robot ne calcule aucun score SEO : `npm run verify:content -- --id=<numéro>` les montre « — » jusqu'à la première ouverture de l'article à l'écran.

### 8. Retrouver l'article dans l'outil
**Exigences :** FR-DASH-NAV ⚠, FR-RED-PROGRESS ⚠, FR-CER-COCOON-PROGRESSIVE ⚠, FR-MOT-RECAP-PUBLISHED ⚠

Sur l'accueil, le nom du silo ouvre sa page : le compteur « N Brouillon » compte l'article. Sur la page du cocon, la carte « Rédaction » ouvre la liste des articles, où il porte le badge « Brouillon ». Au Cerveau, étape « Articles », « Construire le cocon » le montre « Rédigé », avec ses sections prêtes à donner des enfants. Au Moteur, il figure dans « Articles publiés (N) », mais ni dans « Articles suggérés » ni sur la carte indicative : le robot ne l'y inscrit pas.

### 9. Relire et corriger à l'écran
**Exigences :** FR-RED-GEN-UNLOCK ⚠, FR-RED-SEO-LIVE, FR-RED-SEO-SCORE-PERSIST ⚠, FR-RED-EDITOR-TIPTAP, FR-RED-ENRICH-PASSES

Dans cette liste, la carte de l'article ouvre sa rédaction guidée : l'étape « Article » est accessible, car la stratégie d'article écrite par le robot est complète, et le bandeau dit « ✓ Premier jet accepté : l'article peut donner naissance à ses articles enfants dans le cocon. ». Le score SEO se calcule à cette ouverture, puis rejoint la base. « Éditer l'article » ouvre l'éditeur : tu corriges à la main, tu sélectionnes un passage pour lui appliquer une action de l'IA, et tu enregistres par « Sauvegarder » ou Ctrl+S. « Enrichir » propose, chapitre par chapitre, des exemples, des tableaux, des images ou une FAQ, que tu acceptes ou refuses.

### 10. Publier
**Exigences :** FR-RED-PUBLISH-GATE, FR-RED-EXPORT-HTML, FR-INFRA-GATE-WAIVER

Dans l'éditeur, « Visualiser l'article » ouvre l'aperçu, et « Exporter HTML » passe la porte de publication. Elle rejoue les contrôles du texte, de la méta et des étapes du Moteur : un passage encore « à sourcer » y est 🔴, un lien vers un article non publié 🟠 ; le robot ne dérogeant jamais seul, seules les dérogations que tu as posées toi-même (à l'écran, ou par « J'ai lu » au terminal) reviennent à reconfirmer. Acceptée, elle met l'article « Publié » et télécharge son fichier HTML. Refusée, elle ne change rien : « Publication annulée : corrigez les points signalés, puis exportez à nouveau. ».

### 11. Refaire le maillage quand un voisin est publié
**Exigences :** FR-RED-LINKING-MANUAL ⚠, FR-RED-EXPORT-HTML

Le robot ne relie l'article qu'aux articles publiés au moment du run. Quand un voisin l'est à son tour, `npm run auto:article -- --relink=<numéro>` refait seulement le maillage de l'article, sans appel à l'IA, puis s'arrête sur son récap. Sans `--mode=real`, cette commande repasse aussi tout le serveur en simulé. Le fichier déjà téléchargé ne change pas : il faut réexporter l'article depuis l'aperçu.

## Ce qui peut mal tourner

### Le parent n'est pas rédigé, ou n'a plus de section libre
**Exigences :** FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2

Juste après la pause 1, le robot s'arrête avant de créer l'article : « « … » n’est pas encore rédigé : impossible d’y rattacher cet article. », suivi des points de la porte du premier jet de ce parent et de « Décidez dans la Rédaction (corriger, ou déroger en expliquant pourquoi), puis relancez le run. ». S'il n'existe aucun parent du niveau au-dessus, ou plus aucune section libre, il s'arrête sur « Emplacement impossible dans « … » : … », qui dit ce qui manque. Rien n'est créé : tu fais accepter le premier jet du parent à l'écran, ou tu choisis un autre cocon, puis tu lances un run neuf, qui redemande et, en réel, repaie le brief.

### Une porte refuse une étape
**Exigences :** FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER, FR-CER-STEPS-ARTICLE ⚠

Le robot ne déroge jamais à ta place. Si tous les points sont 🟠 (par exemple « Google traite cette requête comme de navigation… », que le bac à sable du mode simulé lève à chaque capitaine), il les affiche et te demande « J’ai lu, continuer ? [o/N] » : « o » les reconnaît comme la case « J'ai lu » de l'écran, puis l'étape est redemandée et le run continue. Sinon — tu réponds autre chose, un point est 🔴 ou ⛔, ou le run tourne sans toi (`--config`, `--resume`) —, le run s'arrête (« ✗ Échec du run : … ») en listant chaque point avec son icône (⛔, 🔴, 🟠), puis « Décidez dans le Moteur (corriger, ou déroger en expliquant pourquoi), puis relancez le run. » (« la Rédaction » pour le premier jet). Tu ouvres l'article à l'écran, tu corriges ou tu déroges par écrit, puis `npm run auto:article -- --resume=<numéro>` reprend ; le numéro n'est pas rappelé dans le message d'arrêt, il est dans la ligne « Article #N créé ». La reprise refait tout le Moteur tant que la structure et le lexique ne sont pas validés, et rechoisit alors son propre capitaine, sauf si tu l'imposes par `--capitaine=<mot-clé>`. Elle n'est sûre que pour un article né du robot : sur un article créé à l'écran, elle réécrit son titre et sa stratégie d'après un brief sans rapport.

### Le plafond de dépense arrête le run
**Exigences :** FR-EXT-DATAFORSEO-COSTGUARD ⚠, NFR-COST-DATAFORSEO-RESERVE, FR-EXT-DATAFORSEO ⚠, NFR-COST-CACHE-FIRST ⚠

En réel, toute mesure DataForSEO qui ferait dépasser le plafond de la fenêtre glissante (0,50 $ sur 30 minutes si rien n'est réglé) est refusée avant de partir. Quand c'est l'étude d'un candidat capitaine qui est refusée, le run s'arrête sur « ✗ Échec du run : … » avec « Plafond de dépense DataForSEO atteint (…) ». Une mesure groupée refusée, elle, ne dit rien : les mots-clés restent sans mesure, et le robot poursuit sur ces données vides. Tu attends que la fenêtre glisse, puis tu reprends par `--resume` ; une relance du Moteur relit les mesures de moins de 7 jours au lieu de les racheter.

### Le texte sort pollué, ou les sources ne se trouvent pas
**Exigences :** FR-RED-PUBLISH-GATE, FR-RED-ENRICH-SOURCES, FR-EXT-AI-FALLBACK ⚠

Un texte vide ou pollué (l'IA qui parle d'elle-même, un bloc coupé) n'est pas exporté : « Export refusé — le texte contient des défauts de génération : », puis « → L'article est enregistré en base : corrige-le dans l'éditeur, » et « ou lance « npm run content:clean -- --id=<numéro> ». ». La recherche de sources n'a pas de relais si Claude manque de crédits : le robot écrit « Sources de « … » impossibles : … » et continue. Les passages restés « à sourcer » reviendront en 🔴 à la publication.

### Le mode du robot reste celui de tout le serveur
**Exigences :** FR-INFRA-RUNTIME-MODE, NFR-COST-AI-MOCK

En simulé, le brief, les mots-clés et le texte n'ont aucun rapport avec le sujet : ce run ne sert qu'à vérifier la mécanique, et un run réel s'impose avant de publier. Après le run, le serveur garde le mode du robot : l'application ouverte à côté travaille dans ce mode, et son bouton l'adopte de lui-même en quelques secondes (au retour sur l'onglet, ou au plus 15 secondes plus tard), sans rechargement de la page.

## Défauts connus sur ce parcours

- FR-RED-PROGRESS — rouvrir la rédaction guidée d'un article déjà rédigé ramène toujours à « Brief & Structure ».
- FR-CER-STEPS-ARTICLE — aucun écran ne propose la stratégie d'un article : le Cerveau travaille au niveau du cocon ; seul le mode automatique enregistre une stratégie d'article. Et le mode automatique, repris sur un article créé à l'écran, donc sans stratégie, relance le Cerveau sur le sujet « (reprise) », qui abîme le titre et la stratégie de l'article.
- FR-MOT-CANNIBALIZATION — l'alerte n'existe que sur les lignes de la barre des articles, sans nommer l'article concurrent ; les cartes du Radar et du Capitaine n'ont pas de badge.
- FR-DASH-NAV — à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien.
- FR-CER-COCOON-PROGRESSIVE — « La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur ; « Régénérer › Titre » sur une ligne « Créé » ne change le titre que sur la carte, sans l'enregistrer : le Moteur montre alors un autre titre que l'arbre et la Rédaction.
- FR-MOT-RECAP-PUBLISHED — la liste « Articles suggérés » reprend toutes les propositions de la stratégie du cocon, sans regarder leur phase : un article entré en rédaction figure dans les deux listes ; la barre de la Rédaction range aussi les articles selon un statut « publié » calculé à l'écran, pas selon la phase donnée par le serveur.
- FR-RED-GEN-UNLOCK — seule la barre de navigation est verrouillée : « Valider le sommaire » et « Continuer vers l'Article » ouvrent l'étape Article sans vérifier le Cerveau.
- FR-RED-SEO-SCORE-PERSIST — un premier jet interrompu enregistre le texte sans remettre les scores à « inconnu » : l'ancien score reste en base, à l'écran comme en mode automatique.
- FR-RED-LINKING-MANUAL — dans la rédaction guidée, « Appliquer » une suggestion ne fait rien ; dans l'éditeur, l'ancre n'est cherchée que dans la zone active : ailleurs, « Appliquer » ne fait rien, sans message, et la suggestion reste affichée.
- FR-EXT-DATAFORSEO-COSTGUARD — le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 ».
- FR-EXT-DATAFORSEO — les mesures demandées en groupe et la fiche SEO du brief taisent un échec du fournisseur, y compris un refus du plafond de dépense : les valeurs restent vides, sans message ; un « Rafraîchir » qui échoue tout à fait remplace toute la page de rédaction par le bloc d'erreur, au lieu du seul panneau « SERP Data ».
- NFR-COST-CACHE-FIRST — un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine.
- FR-EXT-AI-FALLBACK — la bascule n'est écrite que dans le journal du serveur ; la pile d'activité montre seulement le modèle qui a répondu ; un fournisseur de secours sans clé configurée arrête la chaîne au lieu de passer au suivant, et l'utilisateur lit un message technique en anglais à la place de la vraie cause.
- FR-LEX-METIER-ONLY — l’extraction garde « rsquo » (entité HTML non décodée), des noms de concurrents, « décembre », « suis », « ans ».
- FR-RED-DRAFT-SINGLE-PASS — « Section n/N » n’apparaît pas pendant un premier jet réel (à confirmer) ; des notes de l’IA après « </html> » sont enregistrées telles quelles, seule la porte les bloque.
- FR-RED-META-CAPTAIN — le meta title généré peut ne pas contenir le capitaine en entier, et le panneau SEO affiche pourtant « Capitaine ✓ ».
