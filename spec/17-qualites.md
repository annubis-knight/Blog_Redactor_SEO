---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Qualités transverses de l'outil

Cette partie décrit ce que l'utilisateur perçoit partout, quel que soit l'écran : la vitesse, la maîtrise des dépenses, la fiabilité de ce qui s'affiche, la sécurité, les réglages et les garde-fous du projet lui-même. Elle ne décrit pas un écran en particulier, mais les règles que tous les écrans respectent.

L'outil tourne sur la machine de l'utilisateur : un serveur local, une interface dans le navigateur, une base PostgreSQL locale (le logiciel de base de données qui garde tout le travail). Il appelle trois familles de services payants : DataForSEO (le fournisseur des données de recherche Google : volumes, difficulté, résultats), les fournisseurs d'IA (Claude, Gemini, OpenRouter) et Tavily (un moteur de recherche pour IA), pour une analyse qu'aucun écran ne lance aujourd'hui.

## Vitesse perçue
*Exigences : NFR-PERF-API-LOCAL, NFR-PERF-VIEW-LOAD, NFR-PERF-SEO-DEBOUNCE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION*

**Actions locales.** Ouvrir un article, cocher une étape, enregistrer un texte, relire une exploration : ces actions ne sollicitent que la base locale. Elles visent une réponse du serveur en moins de 200 ms. Aucune mesure n'est affichée ni enregistrée : c'est une cible, pas un indicateur suivi.

**Navigation entre écrans.**
- Le tableau de bord et la page « introuvable » sont prêts dès l'ouverture de l'outil.
- Chaque autre écran (configuration du thème, silo, cocon, Cerveau, Moteur, Rédaction, article, éditeur, aperçu, maillage, post-publication) se charge à sa première visite, puis reste en mémoire.
- Pendant ce chargement, l'écran précédent et la barre de navigation restent affichés : l'utilisateur ne voit jamais d'écran blanc.
- Si l'écran demandé ne peut pas se charger (par exemple après une mise à jour de l'outil), la page se recharge d'elle-même, au plus deux fois. Au troisième échec, l'utilisateur est renvoyé au tableau de bord.
- Une adresse dont un identifiant est vide mène à la page « introuvable ».

**Score SEO pendant la frappe.** Dans l'éditeur, le score SEO se recalcule seul. Il attend 300 ms après la dernière modification du texte, du titre SEO, de la description SEO ou des mots-clés, puis calcule pendant un temps mort du navigateur. Le curseur ne saccade pas ; le score ne clignote pas à chaque touche. L'article entier est recalculé à chaque fois.

**Écrans légers.** Les données d'un mot-clé sont rangées par usage. Le panneau du Capitaine charge ses indicateurs (volume, difficulté, CPC, intention) sans le texte des pages concurrentes, qui n'est lu que par le Lexique. Mesure faite sur les cinq mots-clés les plus lourds : la charge utile du panneau a baissé de 97,5 %.

> **En situation.** L'utilisateur tape un paragraphe d'introduction. Pendant la frappe, l'anneau du score reste figé. Il marque une pause entre deux phrases : un tiers de seconde plus tard, le score se met à jour.

## Générations d'IA au fil de l'eau
*Exigences : NFR-PERF-SSE-FIRST-TOKEN*

Les longues générations (premier jet de l'article, passes d'enrichissement, réduction, humanisation, panneaux d'IA du Moteur) arrivent morceau par morceau : chaque morceau reçu du fournisseur s'affiche aussitôt. L'utilisateur lit le début pendant que la suite s'écrit.

| Génération | Arrêt par l'utilisateur |
|---|---|
| Passes d'enrichissement | bouton « Arrêter » |
| Humanisation d'une section | « Annuler humanisation » ou « Arrêter » |
| Réduction d'une section | « Annuler réduction » |
| Panneaux d'IA du Capitaine | arrêtés d'office quand le mot-clé change |
| Premier jet de l'article | aucun bouton : le bouton affiche « Génération en cours... » et reste inactif |

Un arrêt coupe l'affichage et la connexion côté écran. Le serveur, lui, ne s'en aperçoit pas : la génération se poursuit jusqu'au bout chez le fournisseur d'IA, et elle est facturée. Aucune durée « premier mot en moins de 2 secondes » n'est mesurée ; elle dépend du fournisseur.

Une erreur pendant la diffusion s'affiche comme un message dans l'écran concerné. Une erreur dans le traitement d'un morceau par l'écran ne coupe pas la diffusion ; elle est journalisée.

## Ne jamais payer deux fois la même donnée
*Exigences : NFR-COST-CACHE-FIRST, NFR-PERF-CACHE-HIT-RATE, NFR-PERF-PURGE-HOURLY, NFR-INT-SERP-ONCE, NFR-MOT-LEXIQUE-DECOUPLAGE, NFR-COST-POSTGRESQL*

Avant tout appel payant, l'outil relit ce qu'il sait déjà. Tout est conservé en base : redémarrer l'ordinateur ne perd ni les articles, ni les étapes cochées, ni les mesures.

| Donnée | Relue sans appel payant pendant |
|---|---|
| Mesures d'un mot-clé (volume, CPC, difficulté, intention) | 7 jours, pour tous les articles |
| Questions PAA (« People Also Ask », les questions associées de Google) | 1 jour |
| Analyse des 10 premiers résultats Google et lecture de leurs pages | 7 jours en base, plus 1 heure en mémoire du serveur |
| Réponses brutes de DataForSEO mises en cache court | 7 jours, puis purge |
| Données d'audit des mots-clés d'un cocon | 7 jours par défaut (réglable) |

**Règles.**
- Deux articles qui visent le même mot-clé partagent la même mesure.
- Aucun appel payant n'est forcé en silence : pour rafraîchir, l'utilisateur passe par un geste explicite (« Rafraîchir » du panneau SEO de la Rédaction, « Rafraichir » d'une découverte) ou attend l'expiration. « Vider le cache » du Moteur ne force aucun nouvel appel (voir § 10).
- Toutes les heures, le serveur supprime seul les entrées de cache court expirées. Les mesures permanentes ne sont jamais purgées : une mesure trop vieille est simplement redemandée quand on en a besoin.
- L'analyse des résultats Google d'un mot-clé sert à la fois aux Lieutenants, à la Structure et au Lexique. Le Lexique peut la déclencher lui-même s'il passe en premier ; les Lieutenants la relisent ensuite.
- Une liste de résultats Google sans aucune page lue ne compte pas comme une analyse : l'étape suivante relancera la lecture des pages.
- Le nombre d'appels évités n'est pas compté.

> **En situation.** L'utilisateur mesure « rupture conventionnelle » pour un premier article, puis le choisit pour un second article trois jours plus tard : les chiffres s'affichent aussitôt, le compteur DataForSEO ne bouge pas.

## Plafond de dépense DataForSEO
*Exigences : NFR-COST-DATAFORSEO-BUDGET, NFR-COST-DATAFORSEO-RESERVE, NFR-CFG-DATAFORSEO-BUDGET*

En mode réel seulement, un plafond (par défaut 0,50 $ sur 30 minutes glissantes, réglable) bloque, avant l'envoi, tout appel DataForSEO qui le dépasserait. Détail : [Intégrations externes](14-integrations.md) (« Plafond de dépense DataForSEO »).

## Mode simulé et mode réel
*Exigences : NFR-COST-AI-MOCK, NFR-CFG-AI-PROVIDER, NFR-CFG-DATAFORSEO-SANDBOX*

Le bouton « MOCK » / « RÉEL » et ce qu'il bascule sont décrits dans [Intégrations externes](14-integrations.md) (« Le bouton « MOCK / RÉEL » ») ; la vue d'ensemble est dans [Le produit](01-produit.md) (« Mode simulé et mode réel »). En mode simulé, aucune bascule vers un autre fournisseur d'IA n'a lieu.

## La pile d'activité
*Exigences : NFR-OBS-COST-LOG, NFR-OBS-DBOPS-TRACK, NFR-OBS-KNOWN-ERRORS*

La pile d'activité « Coûts API » (coûts d'IA, opérations en base rapportées, erreurs connues, dépense DataForSEO) est décrite dans [Infrastructure transversale](16-infrastructure.md) (« La pile d'activité « Coûts API » »).

## Erreurs affichées
*Exigences : NFR-OBS-ERROR-HANDLER, NFR-OBS-KNOWN-ERRORS, NFR-INT-DISPLAY-CONTRACTS, NFR-COST-BODY-LIMIT*

- Une erreur du serveur arrive toujours sous la même forme : un code et un message, jamais une trace technique.
- Erreurs connues : quota DataForSEO (« Quota DataForSEO atteint. Rechargez vos crédits puis relancez. »), plafond de dépense, quota d'IA, IA saturée (« Le modèle IA (…) est surchargé. Nouvelle tentative dans quelques instants. »).
- Une erreur inconnue affiche le message du serveur tel quel, parfois technique et en anglais, ou « Erreur HTTP » suivi du statut.
- Une réponse dans une forme inattendue affiche « Réponse reçue dans un format inattendu (contrat « … ») — relancez l'action. », sur le chemin d'erreur habituel de l'écran (message et « Relancer »).
- Une requête de plus de 5 Mo est refusée aussitôt, mais sous forme d'erreur interne au message technique.
- Un panneau qui plante affiche « Une erreur est survenue dans ce panneau. » et « Réessayer » ; après trois essais, « Erreur persistante — rechargez la page. ».

## Ce qui s'affiche est fiable
*Exigences : NFR-INT-DISPLAY-CONTRACTS, NFR-INT-COMPLETED-CHECKS-SSOT, NFR-INT-CHECKS-NAMESPACE, NFR-INT-SCORING-CONFIGURABLE, NFR-MAIN-NO-SCORE-FALLBACK*

**Donnée absente = « — ».** Tout résultat du Moteur (réponse d'IA, de DataForSEO, de Google, calcul local ou relecture en base) est remis en forme avant d'arriver à l'écran.
- Un indicateur inconnu s'affiche « — », jamais 0. Il est ignoré dans les moyennes et classé en bas des tris.
- Un mot-clé sans volume, sans question PAA et sans suggestion reçoit un verdict gris « Données insuffisantes » (icône ❔), jamais un refus. Un verdict illisible devient lui aussi gris.
- Un élément illisible d'une liste (question vide, carte sans mot-clé, titre vide) est écarté ; les autres restent.
- Le premier chargement et le rechargement montrent exactement la même chose.
- Chaque correction est notée dans le journal technique, sans message à l'utilisateur.

**Progression d'un article.** Un article a une seule liste d'étapes franchies : les six étapes du Moteur (Discovery faite, Radar fait, Capitaine verrouillé, Lieutenants verrouillés, Structure validée, Lexique validé) et « Premier jet accepté » en Rédaction. Tous les indicateurs (points de progression, bandeaux, panneau de finalisation, arbre du cocon) lisent cette liste. Une étape cochée ou retirée se voit partout dès que le serveur l'a enregistrée. Retirer le Capitaine ou les Lieutenants retire aussi la Structure, bâtie sur eux.

**Seuils.** Les seuils de couleur et de classement des indicateurs sont les mêmes pour l'affichage, le tri et les filtres.

> **En situation.** DataForSEO ne connaît pas la difficulté de « création site web Toulouse ». La carte affiche « KD — », pas un « KD 0 » vert trompeur. Le lendemain, la carte relue en base affiche la même chose.

## L'IA fonctionne même sans stratégie
*Exigences : NFR-INT-STRATEGY-OPTIONAL, NFR-INT-PROMPT-AGNOSTIC*

- Une action d'IA reste possible quand la stratégie du cocon n'est pas écrite : l'IA reçoit simplement un contexte vide.
- Une stratégie illisible est ignorée et journalisée.
- Un point de douleur absent est transmis à l'IA comme « (non défini) » ; les consignes concernées disent alors à l'IA d'ignorer ce critère.
- Les consignes d'IA sont les mêmes pour tous les articles : seules les données injectées changent.

## Sécurité
*Exigences : NFR-SEC-CORS, NFR-SEC-ENV-VARS, NFR-SEC-GSC-TOKENS, NFR-SEC-PROMPT-INJECTION, NFR-SEC-ZOD-INPUT, NFR-INT-ZOD-VALIDATION*

**Accès.** Une page web ouverte sur une autre adresse que « localhost » ne peut pas lire les réponses du serveur. En revanche, le serveur écoute sur toutes les interfaces réseau : un programme d'une autre machine du réseau (hors navigateur) peut l'appeler si le pare-feu le laisse passer.

**Secrets.** Les clés d'API vivent dans un fichier d'environnement local, jamais suivi par Git, décrit par un modèle aux valeurs factices. La vérification du projet avertit quand une clé indispensable manque (IA Claude, DataForSEO, nom de la base).

**Jeton Google Search Console.** Après connexion, le jeton est enregistré dans un fichier local, à un emplacement fixe. Il est rafraîchi seul quand il expire dans moins d'une minute. Il n'est jamais écrit dans les journaux. Ce fichier n'est pas exclu du suivi Git.

**Consignes d'IA.** Le texte de l'article, d'une section, la sélection d'une action contextuelle et une consigne libre sont neutralisés avant d'entrer dans une consigne d'IA : les marqueurs de tour de parole, les balises système et les accolades de variables sont désamorcés, et le texte est encadré comme « contenu utilisateur ». L'utilisateur n'en voit rien. Les champs courts (titre, mot-clé, point de douleur) ne sont pas neutralisés.

**Entrées.** La plupart des requêtes sont vérifiées avant traitement ; une requête mal formée reçoit alors un refus « VALIDATION_ERROR » ou « MISSING_PARAM ». Certaines requêtes (stratégie, silos) mal formées sortent en erreur interne.

## Réglages disponibles
*Exigences : NFR-CFG-AI-PROVIDER, NFR-CFG-AI-FALLBACK-OPT-OUT, NFR-CFG-CLAUDE-MODEL, NFR-CFG-GEMINI-MODEL, NFR-CFG-DATAFORSEO-SANDBOX, NFR-CFG-DATAFORSEO-BUDGET, NFR-CFG-DATAFORSEO-REFRESH, NFR-CFG-PG-CONN, NFR-CFG-GSC-OAUTH, NFR-CFG-APP-PORTS, NFR-CFG-PORT-PREFLIGHT*

L'utilisateur règle l'outil dans son fichier d'environnement, sans toucher au code.

| Réglage | Sans réglage |
|---|---|
| Fournisseur d'IA (Claude, Gemini, OpenRouter, simulé) | Claude |
| Bascule automatique vers un autre fournisseur en cas de quota ou de saturation | active (ordre : fournisseur choisi, puis Claude, Gemini, OpenRouter) |
| Modèle Claude des générations en flux | un modèle Sonnet |
| Modèle Haiku du Radar | un modèle Haiku |
| Modèle Gemini | un modèle Flash |
| Modèle OpenRouter (modèles gratuits seulement) | un modèle Llama gratuit |
| Latence de la simulation | 200 ms |
| Bac à sable DataForSEO | désactivé : **production facturée** |
| Plafond et fenêtre de dépense DataForSEO | 0,50 $ sur 30 minutes |
| Délai avant de refaire l'audit d'un mot-clé | 168 heures (0 en mode développement) |
| Connexion à la base (hôte, port, utilisateur, mot de passe, nom) | localhost, 5432, postgres, base « blog_redactor_seo » |
| Identifiants Google et adresse de retour de la connexion | adresse calculée sur le port du serveur |
| Port du serveur / de l'interface | 3400 / 5400 |

**Ports.** Le serveur écoute sur 3400, l'interface sur 5400. Si 5400 est pris, l'interface refuse de démarrer ailleurs. Avant chaque démarrage et chaque construction, l'outil libère 3400 et 5400 (sous Windows comme ailleurs), sans jamais échouer si rien n'écoute. Les tests navigateur utilisent 3410 et 5410 : les lancer ne coupe jamais le serveur de l'utilisateur.

**Au démarrage du serveur.**
- Il teste la base. En cas d'échec, il écrit « PostgreSQL connection failed » avec une piste (service arrêté, identifiants refusés, base absente) et continue de démarrer.
- Au premier appel DataForSEO, il écrit s'il utilise le bac à sable ou la production facturée.
- Avant le démarrage, l'outil compare la structure de la base à sa référence enregistrée et prévient si elles diffèrent, sans bloquer.
- Un point de santé répond « ok » sans rien déclencher.

## Écran stable
*Exigences : NFR-UX-STABLE-SKELETON*

Dans le Moteur, l'écran ne se construit pas au fil des clics : il est complet dès l'ouverture.
- Les panneaux d'IA de Discovery, Radar, Capitaine, Lieutenants et Lexique sont affichés d'emblée, même sans action.
- Un bouton indisponible reste à sa place, grisé, avec un message qui dit quoi faire d'abord.
- Les états « en cours », « erreur » (avec relance) et « résultat » s'affichent dans la même zone.
- Seules les zones lourdes repliées (par exemple l'arbre des questions d'une carte) ne sont construites qu'au dépli, avec une silhouette de même taille.

Le panneau d'IA du brief, en Rédaction, ne suit pas encore ce modèle (pas d'état « erreur ») ; voir [Composants d'interface partagés](15-interface.md).

## Textes lisibles
*Exigences : NFR-UX-SCREEN-TEXT*

Tout texte fixe de l'écran s'affiche en français lisible, accents compris. Un code technique à la place d'une lettre accentuée est un défaut : la vérification rapide du projet le refuse, en nommant le fichier et la ligne.

## Journaux techniques
*Exigences : NFR-OBS-LOGGER, NFR-OBS-CONFIG, NFR-OBS-HEALTH, NFR-OBS-DB-CHECK*

Le serveur et l'interface écrivent leurs journaux (dans le terminal et dans la console du navigateur) sur quatre niveaux : débogage, information, avertissement, erreur. Chaque ligne du serveur porte l'heure, le niveau, un émoji et le fichier d'origine. Un seul niveau minimum s'applique à tout le serveur ; par défaut, tout est affiché, débogage compris. Il n'y a pas de réglage par module.

## Garde-fous du projet
*Exigences : NFR-MAIN-ORG-STORES, NFR-MAIN-ORG-COMPOSABLES, NFR-MAIN-ORG-SERVICES, NFR-MAIN-TESTS-VITEST, NFR-MAIN-TESTS-PLAYWRIGHT, NFR-MAIN-TOOLING, NFR-MAIN-CHECK-HEALTH, NFR-MAIN-FILE-SIZE, NFR-MAIN-NO-CYCLES, NFR-MAIN-REQUIREMENTS-TRACE, NFR-TEST-BEHAVIORAL, NFR-INT-API-WRAPPER, NFR-INT-MOTEUR-BIMODAL, NFR-OBS-EXTERNAL-API-OPT-OUT*

Cette partie s'adresse à celui qui fait évoluer l'outil.

**Trois niveaux de vérification.**

| Vérification | Ce qu'elle contrôle | Besoin |
|---|---|---|
| Rapide | linter rapide, typage, ~540 tests purs (règles métier, architecture, traçabilité), qualité des articles en base et hygiène du dépôt, structure de la base | la base locale |
| Santé | linters, typage, cycles d'imports, code mort, règles d'architecture | rien |
| Complète | la rapide, le second linter, les cycles, et la suite complète comparée à la référence | la base et le serveur de développement |

**Au moment du commit.** Seuls les deux linters tournent, en corrigeant ce qu'ils peuvent, sur les fichiers modifiés. Un zéro silencieux sur un score ou un indicateur est refusé à ce moment-là. Le code mort, les cycles et les règles d'architecture ne sont pas vérifiés au commit.

**Intégration continue (à chaque envoi).** Typage, tests unitaires sans base, tests de contrats, d'onglets, de parcours et d'intégration contre une base neuve, puis tests navigateur. Sans identifiants DataForSEO dans le dépôt, les tests qui mesurent un mot-clé et les tests navigateur sont déclarés ignorés, avec un avertissement. L'intégration continue ne lance ni les linters, ni le code mort, ni les cycles.

**Suites de tests.**
- Les tests qui écrivent en base étiquettent leurs données (« [test:…] ») et les retirent à la fin, même après un plantage (purge des restes de plus d'une heure).
- Les tests navigateur démarrent leur propre serveur (ports 3410 et 5410), en mode simulé, dans leur propre base « blog_redactor_seo_test », recréée vide à chaque passage. La base de développement n'est jamais touchée, sauf pour un passage réel ou des tests visant un serveur déjà ouvert.
- La base n'est recréée que si son nom finit par « _test » et n'est pas celle de l'application.
- Une référence enregistrée des tests permet de répondre à « mon chantier a-t-il cassé un test ? ». La vérification rapide prévient quand cette référence a plus de 30 jours.
- Chaque porte de qualité a son test négatif, à l'écran et au serveur : alarme, raison trop courte refusée, vraie raison acceptée, dérogation qui tombe quand les données changent, défaut technique jamais dérogeable.
- Un test sans son environnement apparaît « ignoré ». Les tests toujours vrais sont comptés, avec des plafonds qui ne peuvent que baisser (aucun test tautologique, un seul test ignoré, six « ≥ 0 », un « est un booléen »).
- Tout identifiant d'exigence cité par un test existe par écrit ; 27 orphelins historiques restent tolérés.
- Les parcours navigateur décochent, rechargent et ne prennent pas toujours la première option ; ils ne simulent ni retour arrière ni panne. Le texte produit en mode réel n'est pas repassé automatiquement dans les vérificateurs.

**Rangement.** La logique est rangée par domaine métier (article, mots-clés, stratégie, Moteur, lexique, SEO…). Chaque onglet du Moteur existe en un seul exemplaire. Tout échange entre l'écran et le serveur passe par un client unique. Les appels directs aux services tiers sont marqués comme volontaires. Deux fichiers dépassent 1 000 lignes (l'onglet Capitaine, le service de données du serveur) et 53 dépassent la cible de 400.
