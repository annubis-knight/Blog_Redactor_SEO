---
title: 'Exigences — Blog Redactor SEO'
status: référence
version: 1.0.0
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
synced_with:
  - spec/ (chapitres de la spécification, sommaire spec/README.md)
  - design/ (chapitres du design, sommaire design/README.md)
---

# Exigences — Blog Redactor SEO

> **Ce que le produit doit faire.** Une liste d'exigences numérotées, chacune vérifiable.
> Compagnons : [la spécification](README.md), chapitre par chapitre (comment le produit se comporte
> aujourd'hui), et [le design](../design/README.md) (comment il est construit).

## Sommaire

- [1. Comment lire ce document](#1-comment-lire-ce-document)
- [2. Exigences globales (cadre)](#2-exigences-globales-cadre)
- [3. Retirées (cadre)](#3-retirees-cadre)
- [4. Dashboard et page du cocon (FR-DASH)](#4-dashboard-et-page-du-cocon-fr-dash)
- [5. Cerveau (FR-CER)](#5-cerveau-fr-cer)
- [6. Moteur — règles transversales (MOT)](#6-moteur-regles-transversales-mot)
- [7. Moteur — Discovery (DIS)](#7-moteur-discovery-dis)
- [8. Moteur — Radar (FR-RAD)](#8-moteur-radar-fr-rad)
- [9. Moteur — Capitaine (FR-CAP)](#9-moteur-capitaine-fr-cap)
- [10. Moteur — Lieutenants (FR-LIE)](#10-moteur-lieutenants-fr-lie)
- [11. Moteur — Structure (FR-HN)](#11-moteur-structure-fr-hn)
- [12. Moteur — Lexique (FR-LEX)](#12-moteur-lexique-fr-lex)
- [13. Moteur — Finalisation (FIN)](#13-moteur-finalisation-fin)
- [14. Rédaction (FR-RED)](#14-redaction-fr-red)
- [15. Labo (FR-LAB)](#15-labo-fr-lab)
- [16. Explorateur (FR-EXP)](#16-explorateur-fr-exp)
- [17. Intégrations externes (EXT)](#17-integrations-externes-ext)
- [18. Composants d'interface partagés (UI)](#18-composants-dinterface-partages-ui)
- [19. Infrastructure transversale (FR-INFRA)](#19-infrastructure-transversale-fr-infra)
- [20. Performance (NFR-PERF)](#20-performance-nfr-perf)
- [21. Coût et optimisation (NFR-COST)](#21-cout-et-optimisation-nfr-cost)
- [22. Intégration et contrats (NFR-INT)](#22-integration-et-contrats-nfr-int)
- [23. Maintenabilité et tests (NFR-MAIN, NFR-TEST)](#23-maintenabilite-et-tests-nfr-main-nfr-test)
- [24. Sécurité (NFR-SEC)](#24-securite-nfr-sec)
- [25. Observabilité (NFR-OBS)](#25-observabilite-nfr-obs)
- [26. Configuration et environnement (NFR-CFG)](#26-configuration-et-environnement-nfr-cfg)
- [27. Expérience utilisateur (NFR-UX)](#27-experience-utilisateur-nfr-ux)

---

## 1. Comment lire ce document

### Les trois documents

| Document | Question | Ce qu'on y trouve | Ce qu'on n'y trouve pas |
|---|---|---|---|
| `spec/requirements.md` (ce fichier) | Que doit faire le produit ? | Les exigences, leur statut, leurs critères vérifiables | Aucun nom de fichier, de route, de table, de composant ni de prompt |
| `spec/01-…` à `spec/18-…` (sommaire : `spec/README.md`) | Comment se comporte-t-il aujourd'hui ? | Les parcours, les écrans, les règles, les messages, la recette manuelle | Les exigences prévues et non livrées ; les détails d'implémentation |
| `design/01-…` à `design/21-…` et `design/data-flows/` (sommaire : `design/README.md`) | Comment est-il construit ? | Architecture, données, API, IA, tests, modules par domaine, flux de chaque donnée partagée, décisions | Le « pourquoi » produit (il renvoie aux exigences) |

Une phrase appartient à `requirements.md` ou à un chapitre de `spec/` si elle survivrait à une réécriture
complète du logiciel dans une autre technologie. Elle décrit un besoin ou un comportement vu par
l'utilisateur. Une phrase qui cite un fichier, une route, une table, un store ou un prompt appartient
à un chapitre de `design/`.

### Le code fait foi

- La source de vérité est le code du dépôt. Ces documents décrivent ce que le code fait.
- Quand un document et le code divergent, c'est le code qui a raison, sauf bug avéré.
- Un bug avéré face à une exigence délibérée garde l'exigence, avec le statut « non tenue ».
- Les anciens documents (PRD, registre de design, `architecture.md`, guides) restent comme historique.
  Ils ne font plus foi (cf. [le sommaire du design](../design/README.md), « Où trouver le détail historique »).

### Identifiants

- Chaque exigence a un **identifiant stable**, nommé d'après sa capacité : `FR-CAP-LOCK-GATE`,
  `NFR-PERF-CACHE-HIT-RATE`. Il n'y a pas de numérotation séquentielle.
- `FR-…` : exigence fonctionnelle (ce que l'utilisateur peut faire).
  `NFR-…` : exigence non fonctionnelle (performance, coût, robustesse, maintenabilité…).
- Un identifiant n'est jamais réattribué. Une exigence retirée garde le sien, dans la table
  « Retirées » de son domaine.
- La conception d'une exigence porte le même suffixe avec le préfixe `DESIGN-` :
  `FR-CER-COCOON-PROGRESSIVE` ↔ `DESIGN-CER-COCOON-PROGRESSIVE`.
- Traçabilité : chercher un identifiant (`grep FR-CER-COCOON-PROGRESSIVE`) retombe sur les trois
  documents, les tests qui le vérifient et les commits qui l'ont livré.
- Un test automatique vérifie que tout identifiant cité par un test existe par écrit
  (`NFR-MAIN-REQUIREMENTS-TRACE`).

### Statuts

| Statut | Sens | Où l'exigence apparaît |
|---|---|---|
| **active** | Le code la tient. | `requirements.md`, un chapitre de `spec/`, un chapitre de `design/` |
| **non tenue** (+ ce qui manque) | Exigence délibérée que le code ne tient pas, ou pas entièrement (bug, dette). | `requirements.md` ; le chapitre de `spec/` décrit le comportement réel ; le chapitre de `design/` nomme la dette |
| **prévue, non livrée** | Décidée, jamais implémentée. | `requirements.md` seulement |
| **retirée** | Remplacée par une autre exigence, ou abandonnée avec sa fonctionnalité. | Table « Retirées » de son domaine seulement |

Un bloc d'exigence a toujours la même forme :

```markdown
### FR-XXX-YYY — Titre court
**Statut :** active
L'outil doit… (1 à 3 phrases, en langage utilisateur)
- critère vérifiable 1
- critère vérifiable 2
```

### Préfixes par domaine

Les domaines suivent le parcours de l'utilisateur : Cerveau (la stratégie), Moteur (les mots-clés),
Rédaction (le texte), puis ce qui traverse tout l'outil.

| Préfixe | Domaine | Section |
|---|---|---|
| `FR-CER` | Cerveau : stratégie du cocon et de l'article, construction de l'arbre du cocon | Cerveau |
| `FR-PIE` | Cerveau : intention éditoriale attendue d'un article | Cerveau |
| `FR-DASH` | Tableau de bord et page d'accueil d'un cocon | Dashboard |
| `FR-MOT`, `NFR-MOT` | Moteur : règles communes aux sept onglets (phases, étapes, navigation) | Moteur |
| `FR-PAIN` | Douleur de l'article : fixée au Cerveau, lue par le Moteur | Moteur |
| `FR-DIS` | Moteur : onglet Discovery | Moteur |
| `FR-RAD` | Moteur : onglet Radar | Moteur |
| `FR-CAP` | Moteur : onglet Capitaine | Moteur |
| `FR-LIE` | Moteur : onglet Lieutenants | Moteur |
| `FR-HN` | Moteur : onglet Structure (titre H1, chapitres H2, sous-parties H3) | Moteur |
| `FR-LEX` | Moteur : onglet Lexique | Moteur |
| `FR-FIN` | Moteur : onglet Finalisation | Moteur |
| `FR-API` | Vocabulaire des échanges entre l'écran et le serveur | Moteur |
| `FR-RED` | Rédaction : brief, sommaire, premier jet, enrichissement, éditeur, publication | Rédaction |
| `FR-EXT` | Intégrations externes : données Google, fournisseurs d'IA, Search Console, calculs locaux | Intégrations |
| `FR-UI` | Composants d'interface partagés entre plusieurs écrans | UI partagés |
| `FR-INFRA` | Infrastructure transversale : cache, persistance, portes de qualité, prompts | Infrastructure |
| `NFR-PERF` | Performance | NFR |
| `NFR-COST` | Coût et appels payants | NFR |
| `NFR-INT` | Intégration et contrats internes | NFR |
| `NFR-MAIN`, `NFR-TEST` | Maintenabilité, tests | NFR |
| `NFR-SEC` | Sécurité et robustesse | NFR |
| `NFR-OBS` | Observabilité | NFR |
| `NFR-CFG` | Configuration et environnement | NFR |
| `NFR-UX` | Stabilité visuelle de l'interface | NFR |

Préfixes retirés (fonctionnalités supprimées du produit) : `FR-LAB` (Labo, recherche libre) et
`FR-EXP` (Explorateur), sauf `FR-EXP-CONTENT-GAP`, dont le code vit encore (§ 16. Explorateur (FR-EXP)).
`NFR-RT` (versions techniques) n'est plus une exigence : les versions vivent dans `design/01-architecture.md`.

---

## 2. Exigences globales (cadre)

Aucune exigence produit n'existe hors des domaines. Les critères de succès du produit sont portés
par des exigences de domaine :

| Critère de succès | Porté par |
|---|---|
| Le parcours Cerveau → Moteur → Rédaction fonctionne pour tout article d'un cocon, sans outil externe. | `FR-CER-COCOON-PROGRESSIVE`, `FR-MOT-PHASES`, `FR-MOT-CHECKS`, `FR-RED-PUBLISH-GATE` |
| L'utilisateur sait où il en est sans documentation. | `FR-DASH-PROGRESS`, `FR-MOT-CHECKS`, `FR-MOT-SOFT-GATING` |
| Aucune donnée payante n'est achetée deux fois. | `NFR-COST-CACHE-FIRST`, `NFR-PERF-CACHE-HIT-RATE`, `NFR-INT-SERP-ONCE` |
| Les dépenses restent sous contrôle. | `NFR-COST-DATAFORSEO-BUDGET`, `NFR-COST-AI-MOCK`, `FR-EXT-DATAFORSEO-SANDBOX` |
| Un fournisseur d'IA en panne ne bloque pas le travail. | `FR-EXT-AI-MULTI-PROVIDER`, `FR-EXT-AI-FALLBACK` |
| Rien de risqué ne passe en silence ; l'utilisateur garde le dernier mot, par écrit. | `FR-INFRA-VERIFIER-SHARED`, `FR-INFRA-GATE-WAIVER` |
| Toute donnée est conservée d'une session à l'autre. | `NFR-COST-POSTGRESQL` |

---

## 3. Retirées (cadre)

Exigences de versions techniques. Les exigences du Labo et de l'Explorateur, domaines supprimés,
sont listées avec leur domaine. Celles-ci restent ici pour garder leur identifiant traçable.

| ID | Statut | Remplacée par |
|---|---|---|
| `NFR-RT-NODE`, `NFR-RT-VUE`, `NFR-RT-PINIA`, `NFR-RT-TIPTAP`, `NFR-RT-EXPRESS`, `NFR-RT-PG`, `NFR-RT-ZOD`, `NFR-RT-VITEST`, `NFR-RT-PLAYWRIGHT`, `NFR-RT-TS`, `NFR-RT-VITE`, `NFR-RT-ANTHROPIC`, `NFR-RT-GENAI`, `NFR-RT-HF` | retirées (une version n'est pas une exigence produit) | `design/01-architecture.md` § « Stack et versions » |

---

## 4. Dashboard et page du cocon (FR-DASH)

L'accueil montre le plan éditorial : les silos (les grands thèmes du site), leurs cocons (un cocon est un groupe d'articles liés autour d'un même sujet) et leur avancement. La page d'un cocon ouvre ses trois ateliers : Cerveau, Moteur, Rédaction.

### FR-DASH-NAV — Naviguer du silo au cocon, puis à l'article
**Statut :** non tenue (à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien)
L'outil doit montrer le plan éditorial par niveaux (silo, cocon, article), avec le nombre d'articles et l'avancement de chaque silo et de chaque cocon, pour choisir où reprendre sans ouvrir chaque élément.
- L'accueil affiche quatre compteurs (silos, cocons, articles, progression), puis chaque silo avec son nombre de cocons, son nombre d'articles, son avancement et les cartes de ses cocons.
- Chaque carte de cocon donne son nombre d'articles, leur répartition par niveau et son avancement ; un clic ouvre la page du cocon.
- Le nom d'un silo ouvre sa page : ses compteurs par niveau et par statut, puis la liste de ses cocons.
- L'avancement d'un cocon ou d'un silo est la part de ses articles au statut « brouillon » ou « publié ».
- Un article s'ouvre depuis les listes d'articles d'un cocon (Rédaction, arbre du Cerveau) et mène à son écran de production.

### FR-DASH-COCOON-CREATE — Créer un cocon depuis l'accueil
**Statut :** non tenue (un nom qui ne diffère d'un cocon existant que par les majuscules ou les accents, ou le même nom dans un autre silo, est accepté ; les deux cocons partagent alors la même stratégie au Cerveau et au Moteur)
L'outil doit permettre de créer un cocon dans un silo depuis l'accueil, puis d'y entrer aussitôt.
- Chaque silo se termine par une carte « Nouveau cocon » : on tape le nom, Entrée (ou quitter le champ) crée le cocon, Échap annule.
- Le cocon créé s'ouvre sur sa page.
- Un nom déjà utilisé dans le même silo est refusé, et rien n'est créé.

### FR-DASH-PROGRESS — Points de progression par article
**Statut :** active
L'outil doit montrer, à côté de chaque article d'un cocon, où il en est dans les étapes du Moteur, sans qu'il faille l'ouvrir.
- Chaque article des listes du haut du Moteur, et de la liste en lecture de la Rédaction, affiche six points en deux groupes : Explorer (Discovery, Radar), puis Valider (Capitaine, Lieutenants, Structure, Lexique). Le nom de l'étape s'affiche au survol.
- Un point plein signale une étape franchie, un point vide une étape restante.
- Franchir ou retirer une étape pendant la session met le point à jour sans recharger la page.
- Les cartes de l'accueil n'affichent aucun point ; le Cerveau et la Rédaction n'ajoutent aucun point.

### FR-DASH-WORKFLOW-CHOICE — Trois cartes sur la page du cocon
**Statut :** active
La page d'un cocon doit ouvrir ses trois ateliers — Cerveau (stratégie), Moteur (mots-clés), Rédaction (écriture) — sans imposer d'ordre.
- La page affiche le nom du cocon, son nombre d'articles, son avancement, puis trois cartes : « Cerveau », « Moteur », « Rédaction ».
- Chaque carte ouvre son atelier pour ce cocon ; aucune carte n'est désactivée.
- Chaque carte porte un repère : « 6 étapes » (Cerveau), le nombre de mots-clés du cocon (Moteur), le nombre d'articles et l'avancement (Rédaction).
- Dans la Rédaction, la génération du texte d'un article attend que le Cerveau du cocon soit terminé (cf. FR-RED-GEN-UNLOCK) ; la carte, elle, reste ouverte.
- L'adresse d'un cocon qui n'existe pas affiche « Cocon introuvable » et un lien de retour à l'accueil, sans message technique ni « Réessayer ».

### Retirées (FR-DASH)

| ID | Statut | Remplacée par |
|---|---|---|
| — | Aucune | — |

---

## 5. Cerveau (FR-CER)

Le Cerveau pose la stratégie d'un cocon (cible, douleur, angle, promesse, appel à l'action), puis construit le cocon article par article, à partir de son pilier (l'article principal, qui présente tout le sujet). Ce domaine couvre aussi la configuration du thème, et deux réglages d'article repris par la Rédaction : le micro-contexte et la longueur visée.

### FR-CER-STEPS-COCOON — Stratégie de cocon en six étapes
**Statut :** non tenue (à l'étape CTA, « + » (approfondir) échoue sans rien afficher : aucune sous-question n'apparaît)
L'outil doit permettre de poser une fois, pour tout le cocon, une stratégie commune (Cible, Douleur, Angle, Promesse, CTA), puis de préparer ses articles à l'étape « Articles ».
- Six étapes dans l'ordre : Cible, Douleur, Angle, Promesse, CTA, Articles. On revient librement à une étape déjà atteinte ; les suivantes restent fermées.
- Aux cinq premières étapes : une réponse libre, une suggestion de l'IA sur demande, et une validation au choix (« Mon texte », « La suggestion », « Fusionner les deux »). Le texte validé reste modifiable.
- Une étape s'approfondit par des sous-questions de l'IA ; chaque sous-réponse validée enrichit le texte validé de l'étape.
- « Terminer le brainstorm », à l'étape Articles, marque le Cerveau du cocon comme terminé.
- Le Cerveau d'un cocon rouvre sur la dernière étape atteinte.
- À l'étape Articles, l'IA propose une carte indicative du cocon (un pilier, des intermédiaires, des spécialisés), d'un coup ou un article à la fois ; la carte se retouche et ne crée aucun article (cf. FR-CER-COCOON-PROGRESSIVE).

### FR-CER-SAISIE-PRESERVEE — La saisie en cours survit au chargement
**Statut :** non tenue (une réponse tapée pendant un enregistrement reste affichée mais n'est plus dans la stratégie : le « Suivant » d'après enregistre un champ vide)
L'outil ne doit jamais effacer une réponse que l'utilisateur est en train d'écrire quand la stratégie enregistrée arrive après lui.
- Une réponse tapée avant la fin du chargement reste dans le champ si la valeur enregistrée est vide.
- Une valeur enregistrée non vide s'affiche dans le champ.
- Changer d'étape ne fait pas passer la saisie d'une étape à l'autre.

### FR-CER-STEPS-ARTICLE — Stratégie d'article en six étapes
**Statut :** non tenue (aucun écran ne propose la stratégie d'un article : le Cerveau travaille au niveau du cocon ; seul le mode automatique enregistre une stratégie d'article. Et le mode automatique, repris sur un article créé à l'écran, donc sans stratégie, relance le Cerveau sur le sujet « (reprise) », qui abîme le titre et la stratégie de l'article)
L'outil doit permettre de poser, pour un article, sa stratégie en six étapes — Cible, Douleur, Aiguillage, Angle, Promesse, CTA —, chacune suggérée par l'IA, ajustée, approfondie puis validée.
- Les six étapes apparaissent dans l'ordre.
- Chaque étape propose une suggestion modifiable, des sous-questions, et une consolidation en un texte unique validé.
- Quand elle existe, la stratégie de l'article l'emporte sur celle du cocon pour le premier jet.

### FR-CER-AIGUILLAGE — Le niveau d'un article découle de sa place dans le cocon
**Statut :** active
L'outil doit donner à chaque article un niveau parmi trois — Pilier (la tête du cocon), Intermédiaire (un sous-thème du pilier), Spécialisé (un sujet précis sous un intermédiaire) — et en tirer les règles de la suite.
- Le niveau découle de l'endroit où l'article naît : pilier d'un cocon vide, intermédiaire depuis une section du pilier, spécialisé depuis une section d'un intermédiaire.
- Un pilier n'a pas de parent ; un intermédiaire a pour parent le pilier ; un spécialisé, un intermédiaire du même cocon.
- Le niveau ne se change pas après la création.
- Le niveau s'affiche avec l'article (arbre du Cerveau, listes du Moteur et de la Rédaction, « Articles du cocon », longueur conseillée) ; il règle les seuils de mots-clés du Moteur et la longueur visée de la Rédaction.
- Il s'affiche en toutes lettres — « Pilier », « Intermédiaire », « Spécialisé » —, jamais sous son code ; dans une liste groupée par niveau, chaque article est rangé sous le sien, et chaque badge de niveau a sa couleur.
- Sur la carte indicative, une carte sans pilier est signalée : « Aucun article Pilier dans la liste. »

### FR-CER-COCOON-PROGRESSIVE — Le cocon se construit article par article
**Statut :** non tenue (« La carte complète du cocon » remplace aussi les articles déjà créés inscrits sur la carte : une fois la carte enregistrée, ils sortent de la liste d'articles du Moteur ; « Régénérer › Titre » sur une ligne « Créé » ne change le titre que sur la carte, sans l'enregistrer : le Moteur montre alors un autre titre que l'arbre et la Rédaction ; un article créé par le mode automatique n'est inscrit ni sur la carte du cocon ni dans le pool de mots-clés : il manque dans « Articles suggérés » du Moteur)
L'outil doit faire naître un cocon à partir de son pilier, un article à la fois, chaque enfant depuis une section de son parent. La proposition de plan de l'IA reste une carte qui guide, sans rien créer.
- Dans un cocon vide, seul le pilier se crée ; un cocon n'a qu'un pilier ; un enfant naît d'une section libre d'un parent du niveau juste au-dessus, dans le même cocon. Ces règles ne se dérogent pas (⛔), et chaque refus dit ce qui manque.
- Créer un article passe par le choix d'un mot-clé mesuré et d'un titre de 3 caractères au moins. L'article créé rejoint la carte du cocon, d'où le Moteur tire sa liste d'articles, avec la marque « Créé ».
- Un article qui a encore des enfants dans le cocon ne peut pas en être retiré ; un enfant retiré libère sa section.
- Un article « hors de l'arbre » (sans parent) se rattache à une section libre d'un parent rédigé du bon niveau, aux règles d'une création.
- « Générer avec Claude » fait grandir la carte indicative sans créer d'article : le pilier seul, puis un intermédiaire sous un pilier déjà sur la carte, un spécialisé sous un intermédiaire déjà sur la carte, ou la carte complète à la place de la carte actuelle.

### FR-CER-PARENT-WRITTEN-GATE — Pas d'enfant tant que le parent n'est pas rédigé
**Statut :** active
L'outil doit refuser de créer un article enfant tant que son parent n'est pas rédigé, c'est-à-dire tant que son premier jet n'a pas été accepté.
- « Rédigé » est une étape de l'article, « premier jet accepté », posée quand la porte du premier jet passe, ou quand l'utilisateur assume par écrit ses alertes 🔴 ; un défaut ⛔ ne se déroge pas.
- L'étape est demandée d'elle-même après le premier jet (texte et méta enregistrés). Dans les deux vues de rédaction, un bandeau dit si elle est acquise ; sinon, « Valider le premier jet » la redemande. Elle reste acquise si l'article s'enrichit ensuite.
- Dans le Cerveau, le bouton qui crée l'article d'une section reste grisé tant que le parent n'est pas rédigé, avec un message qui invite à valider d'abord son premier jet.
- Si une création arrive malgré tout pour un parent non rédigé, sa porte du premier jet est jouée : l'alarme s'ouvre sur le parent, et la création reprend si l'utilisateur corrige ou assume.
- Aucun candidat (appel payant) n'est demandé pour un parent non rédigé : l'outil le dit avant.

### FR-CER-CHILD-FROM-PILLAR-H2 — Chaque enfant naît d'une section de son parent
**Statut :** active
L'outil doit faire naître chaque enfant d'une section (un chapitre titré H2) de son parent, que le parent résume et qui renvoie vers l'enfant.
- Une section est un chapitre du texte du parent, hors introduction, conclusion et FAQ ; tant que le parent n'a pas de texte, un chapitre de sa structure validée.
- Une section ne donne qu'un enfant ; une section déjà prise, ou que le parent n'a pas, est refusée (⛔). Deux titres se comparent sans tenir compte de la casse, des espaces ni de la ponctuation finale.
- L'enfant connaît la section qui l'annonce et ce qu'elle en dit : ses mots-clés candidats, sa structure et son premier jet la reçoivent.
- À la publication du parent, une section dont est né un enfant et qui dépasse 250 mots est un risque 🔴 ; une telle section disparue est une attention 🟠. La passe « Résumer » propose un résumé de 150 à 250 mots, et seulement pour une section qui en dépasse 250 : une section déjà résumée n'est pas reproposée.

### FR-CER-KEYWORD-REAL-DATA — Le mot-clé d'un nouvel article se choisit sur des données réelles
**Statut :** active
L'outil doit proposer plusieurs mots-clés candidats pour un nouvel article, les mesurer, et laisser l'utilisateur choisir sur ces mesures.
- Pour le pilier d'un cocon vide, ou pour une section libre d'un parent rédigé, l'utilisateur demande des candidats par un clic (appel payant). L'IA en propose 3 à 5, chacun avec un titre qui le contient, une raison, la difficulté du lecteur et l'intention éditoriale attendue.
- Aucun candidat ne reprend le mot-clé d'un article du cocon ni celui d'un autre candidat.
- Chaque candidat est mesuré avant d'être montré : volume, difficulté, intention de recherche, trois premiers résultats de Google. L'outil relit ses mesures de moins de 7 jours et ne paie que ce qui manque, les volumes en une seule demande groupée.
- Une mesure qui échoue reste absente (« — ») ; un candidat non mesuré est marqué « Non mesuré » et ne peut pas être choisi ; rien n'est choisi d'office.
- La création refuse un mot-clé jamais mesuré. Le relevé des premiers résultats ne tient pas lieu d'analyse des concurrents au Moteur.

### FR-CER-CREATION-HONNETE — Un article annoncé créé existe vraiment, et un refus s'explique
**Statut :** active
L'outil ne doit annoncer un article créé que s'il existe, et doit dire chaque refus dans les mots de l'utilisateur, avec la marche à suivre.
- Un article est annoncé créé dès qu'il existe en base, et seulement alors.
- Une adresse de page déjà prise est refusée ; le message nomme l'adresse et invite à changer le titre.
- Un mot-clé refusé par le pool du cocon (déjà visé par un autre cocon) n'annule pas l'article ; un avertissement nomme le cocon concurrent.
- Une carte du cocon qui n'a pas pu être enregistrée après une création est dite par un avertissement ; l'article reste créé.
- Un retrait refusé (l'article a des enfants dans le cocon) est dit, et la carte garde l'article.
- Le mode automatique crée l'article dans le cocon que l'utilisateur nomme à la question « Cocon cible » (sans compter la casse ni les espaces), comme avec `--cocoon` ; un nom qui ne désigne aucun cocon est dit, et la question revient ; sans réponse, l'emplacement est proposé puis soumis à la pause 1.

### FR-CER-TYPE-TOLERANT — Le niveau d'un article est compris quel que soit son format
**Statut :** non tenue (sur la carte, un niveau illisible rendu par l'IA devient « Spécialisé » — ou le niveau demandé pour un ajout — sans message propre à la ligne)
L'outil doit comprendre le niveau d'un article dans tous ses formats d'écriture, transmettre à l'IA les règles du bon niveau, et ne jamais retomber en silence sur un niveau par défaut.
- Un niveau écrit « Pilier », « pilier » ou « PILIER », avec ou sans accent, est compris.
- Ajouter un article à la carte transmet à l'IA les règles du niveau demandé, quel que soit son format.
- La consigne libre de l'utilisateur est transmise telle quelle, même avec des caractères spéciaux (`$1`, `$&`).
- Un niveau inconnu est refusé explicitement plutôt que remplacé.

### FR-CER-MICRO-CONTEXT — Micro-contexte éditorial par article
**Statut :** non tenue (le micro-contexte n'est transmis que si l'angle est rempli : un ton ou des consignes seuls sont ignorés ; et l'angle provisoire écrit d'office à la validation de la structure part tel quel à l'IA ; un échec d'enregistrement n'est jamais signalé)
L'outil doit permettre d'attacher à un article un micro-contexte — angle, ton, consignes, longueur visée — repris par les générations de la Rédaction.
- Le micro-contexte se renseigne et se modifie dans la Rédaction, à l'étape « Brief & Structure » ; chaque champ s'enregistre quand on le quitte.
- Il est optionnel : sans lui, l'article se génère avec les valeurs par défaut.
- Quand il est renseigné, le sommaire, le premier jet et l'explication du brief le reçoivent.
- L'IA peut le suggérer ; une suggestion ne remplace des valeurs déjà saisies qu'après « Appliquer ».
- La suggestion marche aussi pour un article sans capitaine : son titre sert alors de sujet. Une suggestion qui échoue le dit à l'écran.
- Le modifier ne relance aucune génération.

### FR-CER-WORD-COUNT-RECOMMEND — Recommandation de longueur cible
**Statut :** non tenue (sans avis de l'IA, la raison de la longueur conseillée s'affiche en jargon technique (« Heuristique : 60% SERP avg … »))
L'outil doit recommander une longueur d'article réaliste, tirée du niveau, de la moyenne des concurrents et d'un avis de l'IA, et la laisser modifier.
- La base est la longueur visée du niveau (Pilier 2 500 mots, Intermédiaire 1 800, Spécialisé 1 200), bornée par sa fourchette (1 800–3 500, 1 200–2 500, 800–1 500).
- Avec une moyenne des concurrents, la recommandation mêle 60 % de cette moyenne et 40 % de la base ; avec en plus une structure, l'IA donne l'avis. Le résultat reste dans les bornes du niveau.
- Valider la structure au Moteur demande une recommandation : elle devient la longueur de l'article si aucune n'est choisie ; une valeur déjà choisie est gardée. La pile d'activité affiche « 💡 Longueur conseillée : N mots » et sa raison.
- Dans la Rédaction, la longueur visée s'ajuste par pas de 100 mots (de 500 à 10 000) et revient à la recommandation par « Reinitialiser ». La valeur retenue alimente le micro-contexte et le premier jet.

### FR-CER-THEME-CONFIG — Configuration du thème, saisie une fois
**Statut :** non tenue (hors Discovery, qui reçoit le secteur, l'audience, les services et la promesse, les consignes du Moteur et de la Rédaction ne reçoivent ni le positionnement, ni les offres, ni le ton : seule la localisation y parvient, comme zone du client ; au Cerveau, la configuration n'est envoyée que si l'audience, la promesse, le secteur ou le style est rempli ; le mode automatique ne la lit pas pour le brief et l'emplacement : il redemande un « Contexte business » à chaque run ; dans la rédaction guidée, « Contexte envoyé à Claude » affiche toute la configuration alors que le sommaire et le premier jet ne la reçoivent pas)
L'outil doit garder une configuration unique du thème — client type, positionnement, offres, ton —, saisie une fois et reprise par les consignes de l'IA.
- Une seule configuration existe pour tout l'outil ; elle se crée et se modifie depuis « Configuration du Thème », enregistrée d'elle-même après chaque saisie ou par « Sauvegarder ».
- « Remplir les champs avec Claude » remplit les champs à partir d'une description libre, puis enregistre.
- Une configuration vide ne casse aucune consigne de l'IA.
- Toutes les consignes de l'IA (Cerveau, Moteur, Rédaction) reçoivent la configuration.

### FR-CER-CONTEXT-FOR-MOTEUR — La stratégie du cocon suit l'utilisateur au Moteur et à la Rédaction
**Statut :** non tenue (une stratégie sans aucune valeur validée affiche une barre « Contexte stratégique » vide ; en passant d'un cocon à l'autre, la barre du cocon précédent reste affichée le temps du chargement)
L'outil doit montrer, sans rien ressaisir, la stratégie validée du cocon dans le Moteur et la Rédaction, et la transmettre à leurs consignes de l'IA.
- À l'ouverture du Moteur et de la Rédaction d'un cocon, une barre « Contexte stratégique » montre en lecture les valeurs validées du cocon : Cible, Douleur, Angle, Promesse, CTA.
- Une valeur vide n'est pas affichée ; sans stratégie enregistrée, la barre n'apparaît pas.
- Les consignes de l'IA qui portent la stratégie la relisent à chaque appel ; sans stratégie, elles fonctionnent quand même.
- Une modification faite au Cerveau apparaît dans la barre à la prochaine ouverture de l'écran.

### FR-PIE-AI-GENERATION — L'IA propose l'intention éditoriale de chaque article
**Statut :** active
L'outil doit faire proposer par l'IA l'intention éditoriale attendue de chaque article — le type de réponse qu'il apporte —, dans le même appel que ses autres données.
- Chaque article proposé sur la carte, et chaque mot-clé candidat, porte une intention parmi quatre : informationnelle (expliquer), commerciale (comparer avant un achat), transactionnelle (pousser à l'action), navigationnelle (viser une marque) ; une valeur hors de ces quatre est laissée vide.
- Aucun appel supplémentaire n'est fait pour elle.
- L'article créé la reçoit : celle d'une proposition de même titre sur la carte, sinon celle du candidat choisi.

### FR-PIE-CERVEAU-OVERRIDE — L'utilisateur corrige l'intention éditoriale
**Statut :** non tenue (un clic sur le sélecteur « Intention éditoriale » d'une ligne de la carte replie la ligne et ferme le sélecteur avant le choix ; seul le clavier permet de choisir (à confirmer à l'écran))
L'outil doit laisser l'utilisateur corriger à la main l'intention éditoriale d'un article de la carte.
- Chaque article de la carte, déplié, porte un sélecteur « Intention éditoriale » : « Non défini » et les quatre intentions.
- Le changement s'enregistre aussitôt, sans bouton ; pour un article déjà créé, il est aussi écrit sur l'article.
- La valeur corrigée remplace celle de l'IA.

### Retirées (FR-CER)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-CER-BATCH-CREATE | superseded | FR-CER-COCOON-PROGRESSIVE (avec FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-KEYWORD-REAL-DATA) |
| FR-CER-CHECKS | retirée | Aucune : le Cerveau n'écrit aucune étape de progression ; les points de progression sont ceux du Moteur (FR-DASH-PROGRESS) |

---

## 6. Moteur — règles transversales (MOT)

Le Moteur est l'atelier où l'on choisit les mots-clés d'un article, onglet par onglet, avant la Rédaction. Ce domaine couvre ce qui vaut pour tous ses onglets : l'ordre, la navigation, les étapes de progression (les « checks », des marqueurs qui disent qu'une étape est franchie), les verrous, les coûts et la continuité entre onglets. Le détail de chaque onglet appartient à son domaine (§ 7 à § 13).

### FR-MOT-PHASES — Trois phases, sept onglets
**Statut :** active
L'outil doit présenter les sept onglets du Moteur en trois groupes numérotés qui racontent le parcours, et ouvrir un article sur le premier onglet utile.
- La barre affiche « 1 Générer » (Discovery, Radar), « 2 Valider » (Capitaine, Lieutenants, Structure, Lexique), « 3 Finaliser » (Finalisation), dans cet ordre.
- L'onglet actif et son groupe restent visibles dans la barre.
- À l'ouverture d'un article, l'outil choisit l'onglet d'après les étapes franchies : Capitaine par défaut, Lieutenants si le Capitaine est verrouillé, Structure si les Lieutenants le sont, Lexique si la Structure est validée.
- L'outil n'ouvre jamais d'office la Finalisation.

### FR-MOT-FREE-NAV — Navigation libre, une exception
**Statut :** active
L'outil doit laisser ouvrir n'importe quel onglet, dans n'importe quel ordre, dès qu'un article est choisi. Ce sont les écritures, pas la consultation, qui dépendent des étapes précédentes.
- Un onglet « en avance » sur la progression s'ouvre normalement.
- Un onglet n'est désactivé que dans un cas : aucun article choisi.
- Discovery et Radar restent ouverts à tout moment : l'exploration ne fige rien. (Décision du 2026-09-29 : l'ancien verrou « mot-clé plus au stade suggéré » ne pouvait se déclencher depuis aucun écran.)

### FR-MOT-SOFT-GATING — Verrouillage doux des écritures
**Statut :** non tenue (à l'onglet Lexique, Capitaine non verrouillé, « Lancer l'analyse SERP » reste actif malgré le bandeau : l'analyse payante part, et ses termes peuvent ensuite être retenus)
L'outil doit conditionner les gestes qui figent un choix, jamais l'ouverture d'un onglet, et dire pourquoi un geste est indisponible.
- Tant que le Capitaine n'est pas verrouillé, l'onglet Lexique affiche un message qui demande de le verrouiller d'abord.
- Tant qu'un des quatre verrous de la phase Valider (Capitaine, Lieutenants, Structure, Lexique) manque, les deux boutons du Moteur qui mènent à la Rédaction sont désactivés et nomment les étapes restantes ; la page du cocon garde son accès à la Rédaction, qui fonctionne sans ces verrous.
- Un verrou posé débloque les boutons concernés sans rechargement de la page.
- L'écran n'annonce jamais « Prêt pour la Rédaction » tant qu'un verrou manque.

### FR-MOT-ARTICLE-SELECTION — Un article choisi avant d'agir
**Statut :** non tenue (les résultats et les cases cochées de Discovery survivent au changement d'article : seul le mot-clé racine change ; sans article choisi, le bouton du bas « Continuer vers Lieutenants → » reste affiché et cliquable)
L'outil doit faire travailler le Moteur sur un article précis, choisi dans la barre du haut.
- Sans article choisi, les onglets sont désactivés avec l'infobulle « Sélectionnez un article ci-dessus » et un message invite à choisir.
- Choisir un article active les onglets et replie la liste.
- Changer d'article vide l'état de travail temporaire (sélections, cartes transmises) sans toucher aux données enregistrées.
- Cliquer à nouveau sur l'article choisi le désélectionne.

### FR-MOT-RECAP-PUBLISHED — « Articles suggérés » et « Articles publiés » séparés
**Statut :** non tenue (la liste « Articles suggérés » reprend toutes les propositions de la stratégie du cocon, sans regarder leur phase : un article entré en rédaction figure dans les deux listes ; la barre de la Rédaction range aussi les articles selon un statut « publié » calculé à l'écran, pas selon la phase donnée par le serveur)
L'outil doit ranger chaque article du cocon dans une seule des deux listes du haut : les idées pas encore rédigées, ou les articles en rédaction et publiés.
- « Articles publiés » ne contient que les articles en rédaction ou publiés, et ce tri est fait par le serveur.
- Un article n'apparaît jamais dans les deux listes.
- La phase d'un article avance avec son travail réel : il entre en rédaction dès qu'un contenu non vide est enregistré, passe à « publié » à la publication, et ne recule jamais.

### FR-MOT-RECAP-LOCK-SYNC — Le mot-clé affiché en haut dit la vérité
**Statut :** non tenue (pour un article de « Articles publiés », l'aspect plein ou pointillé du mot-clé ne suit pas un verrouillage fait pendant la visite : il faut recharger la page)
L'outil doit montrer, pour chaque article de la barre du haut, si son mot-clé principal est une simple suggestion ou un choix verrouillé, sans attendre un rechargement.
- Verrouiller ou déverrouiller un Capitaine change l'aspect du mot-clé (pointillé estompé ↔ plein) dans la même seconde.
- L'aspect suit ce qui est enregistré, relu après l'enregistrement.
- Un mot-clé enregistré vide compte comme une absence.

### FR-MOT-MODE-BIMODAL — Mêmes panneaux en mode guidé ou libre
**Statut :** non tenue (le panneau Lexique n'a pas de mode libre, et aucun écran n'utilise le mode libre)
L'outil doit utiliser les mêmes panneaux de travail dans le parcours guidé d'un article (mode « workflow ») et dans un usage d'exploration sans article (mode « libre »), sans les dupliquer.
- En mode libre, aucun geste n'écrit d'étape de progression.
- En mode workflow, les panneaux écrivent leurs étapes et utilisent les seuils propres au niveau de l'article (pilier, intermédiaire, spécialisé).
- Chaque panneau du Moteur accepte les deux modes.

### FR-MOT-CHECKS — Six étapes tracées dans la progression
**Statut :** active
L'outil doit enregistrer six étapes de progression au fil des gestes : Discovery faite, Radar fait, Capitaine verrouillé, Lieutenants verrouillés, Structure validée, Lexique validé.
- Chaque geste qui termine une étape demande l'enregistrement de l'étape au serveur.
- Capitaine, Lieutenants, Structure et Lexique ne sont accordés que si la porte de l'étape passe (sinon l'écran montre l'alarme de la porte) ; Discovery et Radar n'ont pas de porte.
- Défaire un choix retire l'étape ; retirer le Capitaine ou les Lieutenants retire aussi « Structure validée ».
- La liste des articles affiche six points de progression, en deux groupes (2 + 4) ; la Finalisation n'a pas d'étape.

### FR-MOT-CHECKS-CONSTANTS — Catalogue strict des étapes
**Statut :** non tenue (le serveur refuse un format non conforme, mais accepte un nom inventé au bon format, par exemple `moteur:nimporte_quoi`)
L'outil doit nommer les étapes à partir d'un catalogue unique, pour que l'écriture et la lecture d'une étape utilisent toujours le même nom.
- Les noms suivent le format `moteur:<action>` ; la seule autre étape admise est `redaction:draft_accepted`.
- Toute écriture d'un nom absent du catalogue est refusée par le serveur.
- Un test automatique refuse tout nom d'étape écrit à la main dans le code de l'application.
- Les anciennes valeurs `cerveau:*` et `redaction:*` restent lisibles mais ne sont plus écrites.

### FR-MOT-PHASE-TRANSITION — Invitation à passer à l'onglet suivant
**Statut :** active
L'outil doit proposer, en bas de chaque onglet, de passer à l'onglet suivant, sans jamais naviguer tout seul.
- Le bouton nomme l'onglet suivant dans l'ordre des onglets (« Continuer vers Structure → » depuis Lieutenants).
- Sur le dernier onglet, il devient « Continuer vers la Rédaction → » et suit la règle des quatre verrous.
- Un lien « ← Retour au cocon » est toujours présent.

### FR-MOT-NO-AUTO-ACTION — Pas d'action coûteuse au changement d'onglet
**Statut :** non tenue (ouvrir l'onglet Lexique, Capitaine verrouillé, peut lancer seul l'analyse IA du lexique quand aucune recommandation n'est enregistrée ; ouvrir le Capitaine d'un article sans candidat étudie seul le premier mot-clé suggéré, avec de possibles appels DataForSEO et Google ; ouvrir le Capitaine, ou choisir un article dont l'onglet Capitaine a déjà été ouvert, redemande et fait payer l'avis expert IA de chaque candidat, même onglet caché)
L'outil ne doit déclencher aucune action payante (appel d'IA, requête DataForSEO, lecture de pages web) au seul fait d'ouvrir un onglet ou de choisir un article, à une exception près, déclarée.
- Ouvrir un onglet ne fait que relire ce qui est déjà enregistré.
- Chaque action payante est derrière un bouton ou un geste explicite.
- Exception : ouvrir l'onglet Capitaine lance le jugement par l'IA des questions « Autres questions posées » (PAA, les questions que Google affiche sous les résultats), une fois par article et par session.

### FR-MOT-RAW-KPIS — Métriques marché brutes, jamais « 0 » par défaut
**Statut :** active
L'outil doit afficher les métriques de marché (volume, difficulté, coût par clic, concurrence) telles quelles, et distinguer une valeur absente d'une valeur nulle.
- Une valeur absente s'affiche « — » ou n'est pas affichée, jamais « 0 », « 0 € » ou « 0 % ».
- Une valeur présente s'affiche sans transformation cachée.

### FR-MOT-CACHE-CASCADE — Réutiliser avant de payer
**Statut :** non tenue (les appels d'IA de Discovery — génération, filtre de pertinence, analyse — ne consultent aucun cache ; seul le rechargement d'une découverte sauvegardée évite de les refaire ; un mot-clé sans volume, difficulté ou coût par clic est remesuré, et repayé, à chaque étude ; le scan Radar rachète volume, difficulté, coût par clic et intention de chaque mot-clé à chaque scan)
L'outil doit consulter ses propres données avant tout appel externe payant, et ne payer qu'en cas d'absence.
- Une mesure de marché récente d'un mot-clé, faite pour un article, sert aussi aux autres articles.
- Les réponses brutes des services externes sont gardées pour une durée limitée et resservies pendant cette durée.
- Aucun appel payant ne part sans ces consultations préalables.

### FR-MOT-PAINPOINT-INJECTION — La douleur de l'article nourrit l'IA du Moteur
**Statut :** non tenue (un article choisi dans « Articles publiés » arrive sans sa douleur : Discovery ne l'affiche ni ne l'utilise, et le Score Pertinence du Capitaine est calculé sans elle)
L'outil doit transmettre la douleur de l'article (le problème vécu par le lecteur, posé dans le Cerveau) à chaque analyse IA du Capitaine, des Lieutenants, de la Structure et du Lexique.
- La douleur est relue en base à chaque demande, sans geste de l'utilisateur.
- Sans douleur, l'IA reçoit explicitement « (non défini) », jamais une chaîne vide.

### FR-MOT-STRATEGY-INJECTION — La stratégie du cocon nourrit l'IA du Moteur
**Statut :** non tenue (l'avis IA sur un candidat Capitaine et tout l'onglet Discovery travaillent sans la stratégie du cocon)
L'outil doit transmettre la stratégie du cocon (cible, douleur, angle, promesse, appel à l'action) à chaque analyse IA du Moteur.
- La stratégie est relue en base à chaque demande.
- Sans stratégie, l'IA travaille en mode générique, sans erreur.
- Toute analyse IA du Moteur la reçoit.

### FR-MOT-CROSS-TAB-PAYLOAD — Continuité des données entre onglets
**Statut :** active
L'outil doit faire passer ce qui est retenu dans un onglet à l'onglet suivant, par un bouton explicite, sans ressaisie.
- Discovery → Radar et Radar → Capitaine passent par un bouton « Envoyer au… » qui ouvre l'onglet cible avec les données transmises ; les Lieutenants partent du Capitaine verrouillé et de ses racines, relus en base, sans bouton d'envoi.
- Les Lieutenants retenus nourrissent la Structure et le Lexique.
- Changer d'article vide les données en transit.

### FR-MOT-CANNIBALIZATION — Alerte de cannibalisation dans le cocon
**Statut :** non tenue (l'alerte n'existe que sur les lignes de la barre des articles, sans nommer l'article concurrent ; les cartes du Radar et du Capitaine n'ont pas de badge)
L'outil doit signaler qu'un mot-clé est déjà le Capitaine d'un autre article du même cocon (la cannibalisation : deux pages qui se disputent la même recherche), avant que l'utilisateur le verrouille.
- Toute carte candidate du Radar et du Capitaine porte un badge si son mot-clé est déjà le Capitaine d'un autre article du cocon.
- Le badge nomme l'article concurrent.
- La détection se met à jour à chaque verrouillage ou déverrouillage de Capitaine.

### FR-MOT-EXPLORATION-COUNTS — Compteurs de ce qui est déjà enregistré
**Statut :** active
L'outil doit afficher en permanence, pour l'article choisi, combien de résultats sont déjà enregistrés par onglet (Radar, Capitaine, Lieutenants, Lexique).
- Une barre fixe montre une puce par onglet avec son compteur.
- Les compteurs suivent l'article choisi et se mettent à jour après chaque étape enregistrée ou retirée.

### FR-MOT-CACHE-PANEL-COUNT — Le compteur dit « enregistré », pas « verrouillé »
**Statut :** non tenue (la puce Radar affiche « C 1 » dès qu'un scan est connu, même enregistré, et le bouton « C 1 » de l'invite ne recharge rien)
L'outil doit compter tout ce qui est enregistré pour un onglet, verrouillé ou non, et proposer de le recharger.
- 31 mots-clés testés au Capitaine sans verrou donnent 31, pas 0.
- Le survol d'une puce détaille l'état (testés, verrouillé, en base, validés).
- Dans les onglets Radar, Capitaine, Lieutenants et Lexique, une invite propose de charger les données enregistrées, sans doublon.

### FR-MOT-EXPLORATIONS-HYDRATATION — Les explorations reviennent même sans verrou
**Statut :** active
L'outil doit réafficher les explorations Capitaine et Lieutenants d'un article rouvert, même si rien n'a été verrouillé.
- Les candidats Capitaine déjà testés reviennent avec le statut « suggéré ».
- Les Lieutenants déjà proposés reviennent dès l'ouverture de l'onglet, avec leur nombre (« N / M sélectionnés », « M propositions générées par l'IA »).
- Un article jamais exploré reste vierge : ses mots-clés sont chargés vides, à son nom, et ne passent pas pour « pas encore chargés ».

### FR-MOT-CHECK-RECONCILIATION — Réconciliation des étapes à l'ouverture
**Statut :** active
L'outil doit, à la première ouverture des onglets Capitaine, Lieutenants et Lexique, corriger une étape qui contredit les données enregistrées.
- Étape présente mais donnée vide : l'étape est retirée.
- Donnée présente mais étape absente : l'étape est demandée (et passe par sa porte pour Lieutenants et Lexique).
- Données et étape cohérentes : aucun échange avec le serveur.
- L'onglet Structure ne réconcilie pas : son étape ne bouge qu'à la validation ou à l'enregistrement d'une structure modifiée.
- Choisir ou rechoisir un article ne fait que relire : les onglets n'apparaissent qu'une fois ses mots-clés et ses étapes relus (« Lecture des données de l'article… », ou un message et « Réessayer » si la lecture échoue), et seules ces données sont jugées. Leur arrivée n'est pas un geste : aucune étape cohérente n'est retirée ni redemandée, aucune décision n'est réenregistrée, et « Structure validée » reste acquise. (Recette du 2026-09-30, F4 : rechoisir un article retirait sa Structure.)

### FR-MOT-EXTERNAL-CACHE-CLEAR — Vider le cache externe d'un article
**Statut :** non tenue (le bouton n'apparaît que si l'article a déjà un scan Radar, et la purge vise des types de cache que l'outil n'écrit plus : aucun nouvel appel n'est forcé ; « Vider le cache » ne dit rien à l'écran, ni ce qui a été purgé, ni un échec)
L'outil doit permettre de purger les réponses externes gardées pour le mot-clé Capitaine de l'article, sans toucher au travail de l'utilisateur.
- Le bouton est visible dès qu'un article est choisi.
- La purge laisse intactes les explorations, les verrous et les décisions.
- Après purge, la recherche suivante interroge de nouveau le service externe.

### FR-MOT-BASKET-DEPRECATED — Pas de panier mémoire entre onglets
**Statut :** non tenue (un lieutenant ajouté depuis « 💡 Suggestions pour vos Lieutenants » porte la raison « Proposé depuis votre panier », un panier qui n'existe plus)
L'outil ne doit pas transporter de mots-clés entre onglets par un panier en mémoire : tout passage s'appuie sur ce qui est enregistré en base.
- Aucun panier ni pastille « mots-clés en attente » n'est affiché.
- Les mots-clés envoyés au Radar sont enregistrés sur l'article et retrouvés au rechargement.

### NFR-MOT-LEXIQUE-DECOUPLAGE — Lexique et Lieutenants indépendants
**Statut :** active
L'outil doit permettre de lancer le Lexique ou les Lieutenants dans n'importe quel ordre, sur un mot-clé jamais analysé.
- Chacun fonctionne seul, sans erreur.
- Une page déjà lue pour l'un est réutilisée par l'autre au lieu d'être relue.

### NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION — Données de mot-clé rangées par usage
**Statut :** active
L'outil doit ranger les données d'un mot-clé par nature (métriques, résultats Google, pages lues, questions PAA, suggestions de saisie) pour ne charger que ce dont un écran a besoin.
- Afficher les métriques d'un Capitaine ne charge pas le texte des pages concurrentes.
- Chaque rangement a une clé et les index utiles.

### FR-PAIN-IMMUTABLE-AFTER-CEREVEAU — La douleur ne se modifie qu'au Cerveau
**Statut :** non tenue (la douleur d'un article ne se modifie nulle part après sa création, pas même au Cerveau : aucun écran ne le propose et le serveur ne l'accepte pas. La première règle est tenue ; la seconde n'a aucun geste qui l'exerce)
L'outil doit réserver la modification de la douleur d'un article au Cerveau.
- Aucun écran du Moteur ni de la Rédaction ne propose de la modifier.
- Une douleur modifiée au Cerveau est reprise par les analyses suivantes.

### FR-API-VOCABULAIRE-SCAN — « Scanner » un mot-clé, « valider » une douleur
**Statut :** non tenue (l'étude d'un mot-clé s'appelle encore « validation » à l'écran : « Aucun mot-clé à valider pour cet article. », « Validation en cours... », « Validation Capitaine dans Ns », « KPIs insuffisants pour valider ce mot-clé. »)
L'outil doit employer deux mots distincts pour deux gestes distincts : on « scanne » un mot-clé (on l'explore et on le mesure), on « valide » une douleur.
- L'exploration d'un mot-clé candidat au Capitaine s'appelle un scan, partout (écran, échanges avec le serveur, journal).
- Le mot « valider » n'est plus employé pour l'exploration d'un mot-clé ; il reste réservé à la validation d'une douleur.

### FR-MOT-WORKFLOW-GATING-DUAL — Double condition pour Capitaine et Lieutenants
**Statut :** active
L'outil doit accorder les étapes Capitaine et Lieutenants seulement si la décision est enregistrée ET si la porte de l'étape passe.
- L'étape Lieutenants est demandée dès qu'un Lieutenant est retenu ; la structure n'en fait plus partie.
- Ne plus retenir aucun Lieutenant retire l'étape.
- À la première ouverture de l'onglet, une étape Lieutenants sans Lieutenant retenu est retirée.

### FR-MOT-LOCK-DERIVED — L'état « verrouillé » se lit à la source
**Statut :** active
L'outil doit déduire l'état « verrouillé » du Capitaine et des Lieutenants des données enregistrées, sans copie locale à synchroniser.
- Un changement d'onglet ou d'article n'affiche jamais un état de verrou périmé.
- Tant que les données du nouvel article ne sont pas arrivées, l'état affiché est celui de l'étape enregistrée.

### FR-MOT-DISPLAY-FROM-STORE — Les affichages vivants suivent les données
**Statut :** non tenue (après un déverrouillage, l'en-tête du Lexique affiche un vide au lieu de « — »)
L'outil doit mettre à jour, dans la même seconde, tout affichage d'une donnée vivante (Capitaine verrouillé, points de progression) après un geste, sans rechargement.
- Verrouiller un Capitaine met à jour la barre des articles et l'en-tête du Lexique.
- Une étape franchie remplit son point dans la barre des articles.
- Après un changement d'article, aucun élément de l'article précédent ne reste affiché.

### FR-UI-VOCABULAIRE-VERROUILLER — « Verrouiller » pour figer un choix de mot-clé
**Statut :** non tenue (les cadenas des titres de la structure disent « Deverrouiller », sans accent)
L'outil doit employer « Verrouiller » pour le geste qui fige un mot-clé, et « Déverrouiller » pour l'inverse.
- Au Capitaine, le cadenas d'une carte porte l'infobulle « Verrouiller », puis « Déverrouiller » une fois le mot-clé figé.
- Aucun bouton ne dit « Valider ce Capitaine », « Valider les Lieutenants » ni « Valider le Lexique ».

### Retirées (MOT)

| ID | Statut | Remplacée par |
|---|---|---|
| (aucune dans ce domaine) | — | — |

---

---

## 7. Moteur — Discovery (DIS)

Discovery est le premier onglet : à partir d'un mot-clé racine, il rassemble des idées de mots-clés venues de plusieurs sources, écarte le hors-sujet, propose une sélection par l'IA et envoie le tri au Radar.

### FR-DIS-SOURCES — Plusieurs sources à partir d'un mot-clé racine
**Statut :** active
L'outil doit produire, à partir d'un mot-clé racine, des listes de candidats venues de sources indépendantes, chacune dans sa section.
- Le champ « Mot-clé racine » est prérempli avec le mot-clé de l'article (sinon celui du cocon) ; « Découvrir » lance la recherche.
- Sept sections sont toujours affichées, même vides, avec leur compteur : Alphabet (A-Z), Questions, Intent Modifiers, Prepositions, IA Claude, DataForSEO, Courte-traîne IA (PAA-friendly).
- Un mot-clé présent dans plusieurs sources porte un badge « ×N » et remonte en tête de sa section.
- Chaque section se replie et propose « Tout » pour cocher sa liste.
- Relancer la même recherche sur le même article ne refait aucun appel.

### FR-DIS-LONGTAIL-GENERATION — Courte-traîne IA à la demande
**Statut :** non tenue (la courte-traîne générée avant « Découvrir » n'est pas filtrée et la ligne du filtre n'apparaît pas ; « Découvrir » l'efface ensuite)
L'outil doit générer, à la demande, une vingtaine de mots-clés courts adaptés aux questions PAA et à l'autocomplétion.
- La génération part du bouton « Courte-traîne IA » ou du bouton « Générer » de la section vide.
- Les mots-clés générés passent par le filtre de pertinence comme les autres.
- La génération n'est pas lancée par « Découvrir ».

### FR-DIS-RELEVANCE-FILTER — Filtre de pertinence
**Statut :** active
L'outil doit faire juger par l'IA si chaque candidat a sa place dans un article sur le sujet (et, si elle est connue, sur la douleur de l'article), et masquer le hors-sujet par défaut sans le supprimer.
- Une case « Filtre de pertinence », cochée par défaut, masque ou réaffiche le hors-sujet sans nouveau calcul.
- Pendant le calcul, une barre indique « Filtrage p/2 · n/total » ; ensuite, « X pertinents / N total » et « X hors-sujet masqués ».
- Les candidats arrivés plus tard sont jugés à leur tour, sans rejuger les autres.
- Une douleur d'au moins 10 caractères devient un critère éliminatoire.
- Si plus de 90 % d'au moins 20 candidats passent, un avertissement signale un filtrage probablement en échec.

### FR-DIS-AI-ANALYSIS — Sélection stratégique proposée par l'IA
**Statut :** active
L'outil doit proposer, sur demande, une sélection de 20 à 30 candidats pertinents avec, pour chacun, une raison courte et une priorité.
- Le panneau « Analyse IA Discovery » est toujours affiché ; son bouton est désactivé tant qu'il n'y a pas de résultats, pendant le filtrage, ou s'il ne reste aucun pertinent, avec un message qui dit pourquoi.
- Chaque proposition affiche son rang, sa priorité (haute, moyenne, basse), sa raison et une case ; « Tout selectionner » coche l'ensemble.
- Un échec affiche un état d'erreur, jamais une zone vide.
- Relancer demande une confirmation, car l'appel est payant.
- L'analyse réussie est sauvegardée avec la découverte.

### FR-DIS-CACHE — Reprendre une découverte déjà faite
**Statut :** non tenue (une sauvegarde n'expire jamais, et la section Courte-traîne n'est ni sauvegardée ni restaurée ; pendant le chargement d'une sauvegarde, « Charger » n'affiche pas « Chargement... » et reste cliquable ; après un rechargement, la racine préremplie ne fait pas apparaître le bandeau de reprise tant qu'on ne la retape pas)
L'outil doit sauvegarder automatiquement chaque découverte par mot-clé racine et proposer de la recharger sans nouvel appel.
- Moins d'une seconde après la saisie d'un mot-clé racine déjà exploré, un bandeau affiche la date, le nombre de mots-clés et la présence d'une analyse IA.
- « Charger » restaure les sections, les jugements de pertinence, les groupes de mots et l'analyse IA sans appel externe.
- « Rafraîchir » supprime la sauvegarde et remet l'écran à zéro.
- La sauvegarde se fait seule quand toutes les sources et le filtre ont fini, et de nouveau après une analyse IA.
- Une sauvegarde de plus de 30 jours n'est plus proposée.

### FR-DIS-SEND-TO-RADAR — Envoyer la sélection au Radar
**Statut :** non tenue (l'outil ouvre le Radar et demande l'étape avant d'avoir enregistré la liste, sans vérifier que l'enregistrement réussit ; les mots-clés cochés seulement en courte-traîne ne sont pas envoyés)
L'outil doit envoyer les candidats cochés (sections et analyse IA confondues, sans doublon) dans le Radar de l'article, puis ouvrir le Radar.
- Une barre fixe apparaît dès qu'un candidat est coché ; elle indique le nombre de cochés et porte le bouton « Envoyer au Radar → ».
- La liste est enregistrée sur l'article avant l'ouverture du Radar ; en cas d'échec, l'utilisateur reste sur Discovery avec un message.
- Tous les candidats comptés sont envoyés.
- Envoyer deux fois la même liste ne crée pas de doublon.

### FR-DIS-CHECK — Étape « Discovery faite » posée par l'envoi
**Statut :** active
L'outil doit poser l'étape « Discovery faite » au moment où l'utilisateur envoie une sélection au Radar, et seulement là.
- Lancer une découverte, cocher, décocher, charger ou rafraîchir une sauvegarde ne pose pas l'étape.
- Un nouvel envoi garde l'étape posée, sans doublon.
- L'étape remplit le premier point de progression de l'article.

### FR-DIS-CAPTAIN-PRESCAN — Pré-analyse Capitaine d'un mot-clé coché
**Statut :** active
L'outil doit, quand l'utilisateur coche un candidat dans Discovery pour un article, lancer après cinq secondes l'analyse Capitaine de ce mot-clé et l'enregistrer parmi les explorations Capitaine de l'article, avec un moyen d'annuler.
- Une notification « Validation Capitaine dans Ns » affiche le compte à rebours et un bouton « Annuler ».
- Décocher le mot-clé avant la fin annule l'analyse.
- Le résultat enregistré apparaît au Capitaine comme un candidat testé, non verrouillé.
- Un échec reste silencieux pour l'utilisateur.

### Retirées (DIS)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-DIS-BASKET | deprecated | FR-MOT-BASKET-DEPRECATED, FR-RAD-DB-FIRST |
| FR-DIS-INTENT-SCAN | relocated | FR-RAD-RESONANCE |

---

---

## 8. Moteur — Radar (FR-RAD)

Le Radar est le deuxième onglet de la phase « Générer » du Moteur (l'atelier où l'on choisit les mots-clés d'un article). Il reçoit une liste de mots-clés candidats, les **scanne** (mesure leur potentiel sur Google) et les note sur l'axe marché. L'utilisateur y coche une sélection qu'il envoie au Capitaine.

### FR-RAD-GENERATE — Générer une courte liste de mots-clés par l'IA
**Statut :** active
L'outil doit pouvoir produire, en un appel d'IA, une liste courte de mots-clés à partir du titre de l'article, de son mot-clé et de son point de douleur (le problème concret du lecteur que l'article résout).
- La liste compte au plus 25 mots-clés, sans doublon après normalisation (minuscules, accents et ponctuation retirés).
- Chaque mot-clé porte une courte raison.
- Un échec de l'IA donne une liste vide, sans erreur bloquante pour l'écran appelant.
- Le titre, le mot-clé et le point de douleur sont obligatoires ; sans eux, la demande est refusée.

### FR-RAD-DB-FIRST — La liste d'attente du Radar vit en base
**Statut :** active
La liste des mots-clés « à scanner » d'un article doit être enregistrée en base, et l'écran doit l'afficher telle que la base la renvoie.
- Ouvrir le Radar d'un article affiche la liste d'attente lue en base.
- Un ajout ou un retrait est enregistré avant que la puce apparaisse ou disparaisse.
- Changer d'article recharge la liste du nouvel article, quel que soit le chemin de sélection.
- Un mot-clé déjà présent (casse et espaces ignorés) n'est pas ajouté une seconde fois.

### FR-RAD-MANUAL-ADD — Ajouter un mot-clé à la main dans la liste d'attente
**Statut :** non tenue (un mot-clé déjà présent vide le champ sans aucun message)
L'utilisateur doit pouvoir ajouter un mot-clé à scanner sans repasser par Discovery.
- Un champ « Ajouter un mot-clé à scanner… » et un bouton « + Ajouter » sont visibles quand un article est sélectionné.
- Entrée et le bouton ont le même effet ; une saisie vide est refusée.
- Un doublon ne crée pas de seconde puce et affiche « Ce mot-clé est déjà dans la liste ».

### FR-RAD-AUTOCOMPLETE-PER-KEYWORD — Suggestions Google mesurées pour chaque mot-clé
**Statut :** non tenue (le nombre de suggestions est noté comme une position : un mot-clé riche en suggestions reçoit du rouge, un mot-clé qui en a peu du vert)
Le scan doit interroger Google Suggest (les propositions que Google affiche pendant la frappe) pour chaque mot-clé scanné, et non pour le seul sujet de l'article.
- Chaque mot-clé scanné a sa propre mesure de suggestions.
- Une mesure récente est relue en base au lieu de rappeler Google (24 h si des suggestions existent, 30 min sinon).
- Les appels se font par lots de 3 mots-clés, au rythme d'une requête Google par seconde.
- Le Score Marché note ce signal comme une quantité de suggestions (plus il y en a, mieux c'est).

### FR-RAD-SCAN-2PASS — Scanner les mots-clés en deux temps
**Statut :** active
Le scan doit d'abord capter les signaux bruts de chaque mot-clé, puis mesurer leur écho avec le sujet précis de l'article.
- Le scan renvoie pour chaque mot-clé : volume, difficulté, CPC (coût par clic publicitaire), intention de recherche, questions PAA (« Autres questions posées » par Google) et suggestions Google.
- Les questions PAA sont collectées sur deux niveaux : celles du mot-clé, puis celles de chaque question.
- Chaque question est marquée selon son accord avec le sujet de l'article : exact, partiel ou hors sujet.
- Les questions PAA mesurées depuis moins d'un jour sont relues en base.
- Les mots-clés sont traités par lots de 3.

### FR-RAD-MARKET-LEVEL-AWARE — Noter le marché selon le niveau de l'article
**Statut :** active
Le Score Marché doit utiliser les seuils du niveau de l'article (pilier, intermédiaire, spécialisé), côté serveur comme à l'écran.
- Le scan reçoit le niveau de l'article et note chaque carte avec ses seuils.
- Pour un même mot-clé, la carte et le panneau « Suggestions IA Radar » affichent le même Score Marché.
- Sans niveau reçu, le serveur note en « intermédiaire ».

### FR-RAD-SCORING-BIMODAL — Un score par onglet : Marché au Radar, Pertinence au Capitaine
**Statut :** non tenue (une intention inconnue compte comme une composante rouge du Score Marché au lieu d'être écartée)
Un mot-clé doit porter deux scores indépendants sur 100 : le Score Marché (« pèse-t-il en SEO ? ») et le Score Pertinence (« sert-il la douleur de l'article ? »). Une carte n'affiche jamais les deux à la fois.
- Au Radar, chaque carte affiche son Score Marché, libellé « Score KPI ».
- Au Capitaine, chaque carte affiche son Score Pertinence, libellé « Score Pertinence ».
- Le Score Marché pondère volume 30 %, difficulté 20 %, intention 15 %, PAA 10 %, suggestions 10 %, CPC 10 %, sur les seules données présentes.

### FR-RAD-RESONANCE — Mesurer l'écho d'un texte avec le sujet
**Statut :** active
L'outil doit dire si un texte (question PAA, suggestion, mot-clé) parle du même sujet qu'une liste de mots, malgré les variantes du français.
- Les mots-outils du français et les mots de moins de 3 lettres ne comptent pas.
- Un pluriel ou une variante de suffixe rejoint sa racine (« stratégies » ≈ « stratégie », « croissant » ≈ « croissance »).
- Trois niveaux : total, partiel, aucun, selon la moyenne des taux d'accord dans les deux sens (au moins 50 % → total, au moins 20 % → partiel).
- L'accord distingue « exact » (mêmes mots) et « racine » (mêmes racines).

### FR-RAD-SCORE-RING-TOOLTIP — Anneau de score et explication au survol
**Statut :** non tenue (dans l'info-bulle, une composante sans donnée s'affiche « 50/100 » avec son poids, alors qu'elle n'entre pas dans le total)
Chaque carte doit montrer son score dans un anneau coloré et expliquer ce score au survol.
- L'anneau se remplit selon le score (0 à 100), du rouge au vert ; sans score, il affiche « — ».
- Au survol, l'info-bulle détaille chaque composante : libellé, poids, valeur sur 100, puis le total.
- Sans score, l'info-bulle donne la raison (point de douleur absent, pas de PAA, pas de suggestions, longue traîne, signaux vides).
- Un clic sur l'anneau n'ouvre rien d'autre.

### FR-RAD-PAA-TREE — Questions PAA en arbre dépliable
**Statut :** active
Une carte dépliée doit montrer ses questions PAA en arbre à deux niveaux.
- Chaque question affiche un badge d'accord avec le sujet, son score sémantique en pourcentage s'il existe, et le nombre de sous-questions.
- La réponse de Google et les sous-questions se déplient au clic.
- La mention « PAA en cache » apparaît quand les questions viennent de la base.
- Une carte sans question affiche « Aucune PAA trouvee ».

### FR-RAD-LONGTAIL-GENERATE — Proposer des longues traînes à partir des mots-clés scannés
**Statut :** non tenue (une réponse vide est enregistrée et resservie pendant 7 jours, sans bouton pour réessayer)
Dès que le scan a produit au moins 2 cartes, l'utilisateur doit pouvoir demander à l'IA des longues traînes (requêtes plus longues et plus précises) dérivées de ces mots-clés.
- La section « Suggestions longue-traine » apparaît à partir de 2 cartes scannées.
- L'IA propose au plus 10 suggestions, chacune avec une note de préférence de 1 à 10, une justification et ses mots-clés sources.
- Une nouvelle demande avec les mêmes entrées réutilise le résultat mis en cache 7 jours, sans nouvel appel d'IA.
- Une réponse d'IA mal formée n'est ni enregistrée ni mise en cache ; l'utilisateur peut réessayer.

### FR-RAD-LONGTAIL-UI — Cocher les longues traînes
**Statut :** non tenue (au rechargement, suggestions et cases cochées ne reviennent pas à l'écran)
Chaque suggestion doit être cochable, et les choix de l'utilisateur doivent survivre à un rechargement.
- Chaque ligne affiche une case, la note « N/10 », le mot-clé, la justification et ses sources.
- Les 5 suggestions les mieux notées sont pré-cochées à la génération.
- Chaque changement de case est enregistré.
- Rouvrir l'article réaffiche les suggestions et les cases cochées.

### FR-RAD-LONGTAIL-REGENERATE — Régénérer sans payer deux fois
**Statut :** non tenue (les suggestions enregistrées ne sont pas réaffichées ; un nouveau scan les efface de la base)
L'utilisateur doit pouvoir régénérer les longues traînes ; le cache évite un appel d'IA inutile.
- Après une génération réussie, le bouton devient « ⟳ Regenerer ».
- Sans changement des mots-clés sources, régénérer relit le cache.
- Après changement des mots-clés sources, régénérer rappelle l'IA ; les cases encore présentes restent cochées.
- Au rechargement, les suggestions déjà générées sont restaurées.

### FR-RAD-SEND-CAPTAIN — Envoyer la sélection au Capitaine
**Statut :** non tenue (la provenance radar / longue traîne / saisie n'est pas enregistrée)
L'utilisateur doit pouvoir envoyer au Capitaine toutes les cartes cochées et les longues traînes cochées, sans doublon.
- Le bouton « Envoyer au Capitaine (N) » apparaît dès qu'une case est cochée ; N compte les mots-clés sans doublon.
- N ne compte que ce qui est coché à l'écran : un nouveau scan, qui efface la liste des longues traînes, efface aussi leur sélection.
- En cas de doublon, la carte scannée l'emporte sur la longue traîne.
- Le clic ouvre l'onglet Capitaine, qui étudie chaque mot-clé reçu.
- La provenance de chaque mot-clé (radar, longue traîne, saisie) est enregistrée.

### FR-RAD-PERSIST — Retrouver l'exploration Radar d'un article
**Statut :** non tenue (les longues traînes ne sont pas réaffichées ; un nouveau scan efface en base les longues traînes du précédent ; sur un article jamais scanné, « Charger Radar » remplace l'invitation à scanner par un résultat vide)
L'exploration Radar d'un article (liste d'attente, cartes scannées, longues traînes, cases cochées) doit être enregistrée et réaffichée à l'identique, sans nouvel appel externe.
- Chaque ajout, retrait, scan et cochage est enregistré au moment où il est fait, sans effacer les autres parties de l'exploration : l'enregistrement d'un scan garde la liste d'attente qui vient d'être scannée.
- Rouvrir le Radar réaffiche la liste d'attente d'office.
- Les cartes du dernier scan reviennent d'office à l'ouverture de l'onglet, sans appel externe ni étape redemandée ; « Charger Radar » reste disponible. Un article jamais scanné garde son invitation à scanner.
- Les longues traînes et leurs cases cochées reviennent avec les cartes.
- La réouverture ne rappelle ni DataForSEO, ni Google, ni l'IA.

### FR-RAD-CHECK — Étape « Radar fait » posée par un scan réussi
**Statut :** active
Un scan réussi doit valider l'étape Moteur « Radar fait » de l'article, sans geste supplémentaire.
- Un scan qui renvoie un résultat pose l'étape.
- Un scan en échec ne la pose pas.
- Reposer une étape déjà acquise ne crée pas de doublon.

### FR-RAD-MARKET-COMPUTED-LIVE — La note marché affichée est recalculée à chaque affichage
**Statut :** active
La note marché d'une carte doit être recalculée à l'écran à partir des indicateurs bruts, avec la formule du moment.
- L'anneau et le tri « Score KPI » utilisent le même calcul, fait à l'écran avec le niveau de l'article.
- Une carte sans indicateurs (longue traîne) affiche « — » et descend en bas du tri.
- Une note incalculable descend en bas du tri, sans repli sur une autre valeur.

### FR-RAD-NO-RELEVANCE-IN-SCAN — Le scan Radar ne mesure pas la pertinence
**Statut :** active
Le scan Radar ne doit produire que des signaux de marché ; la pertinence face à la douleur appartient au Capitaine.
- Aucune carte scannée ne porte de Score Pertinence.
- Le scan ne compare pas le point de douleur aux mots-clés, suggestions ou questions.
- Les badges PAA du Radar sont purement lexicaux, sans mention de la douleur.
- Un ancien Score Pertinence enregistré dans un scan est ignoré à la relecture.

### FR-RAD-CARD-CHEVRON-TOGGLE — Seul le chevron déplie l'arbre PAA
**Statut :** active
Sur une carte, seul le triangle de gauche doit ouvrir ou fermer l'arbre PAA ; les autres zones gardent leur propre rôle.
- Clic sur le chevron : déplie ou replie l'arbre, rien d'autre.
- Clic sur le texte ou les indicateurs : le clic remonte à la liste (au Capitaine, il sélectionne la carte).
- Clic sur l'anneau, le cadenas, le bouton d'étiquettes ou le bouton de recalcul : action propre, sans sélection.

### FR-RAD-THERMOMETER — La chaleur globale du scan
**Statut :** non tenue (la chaleur est la moyenne d'un ancien score qui compte 0 là où les cartes affichent « — » ; elle ne reflète pas les notes affichées)
Au-dessus des cartes, l'outil doit résumer la chaleur du sujet par une note sur 100 et un niveau (Brulante, Chaude, Tiede, Froide).
- Avant tout scan, ou sans carte, le thermomètre affiche « En attente » et « —/100 ».
- Le thermomètre rappelle le nombre de mots-clés, de suggestions et de questions PAA.
- La note globale agrège les notes que les cartes affichent.

### FR-RAD-AI-SUGGESTIONS — Panneau « Suggestions IA Radar »
**Statut :** non tenue (le bouton « Marquer comme candidats Capitaine » n'a aucun effet ; la pastille « P » est toujours vide au Radar)
Sous les cartes, l'outil doit proposer les 5 meilleurs candidats Capitaine, et permettre de les marquer.
- Le panneau classe localement les cartes par la moyenne de leurs scores disponibles, sans appel d'IA.
- Une carte dont les scores disponibles sont tous au verdict NOGO est écartée.
- Les scores absents s'affichent « — ».
- L'infobulle d'une pastille « P » vide en donne la vraie raison : la pertinence se calcule au Capitaine ; elle n'accuse pas une douleur absente.
- « Marquer comme candidats Capitaine (N) » transmet la sélection au Capitaine.

---

## 9. Moteur — Capitaine (FR-CAP)

Le Capitaine ouvre la phase « Valider » du Moteur. L'utilisateur y étudie des mots-clés candidats et en verrouille un seul : le Capitaine (le mot-clé principal de l'article), qui oriente Lieutenants, Structure, Lexique et Rédaction.

### FR-CAP-INPUT — Étudier un mot-clé saisi à la main
**Statut :** non tenue (ré-étudier un mot-clé déjà présent ne lève pas l'erreur précédente : la carte reste sur « Erreur : … » même si la nouvelle étude réussit ; la carte prend aussi la casse tapée, et un Capitaine verrouillé retapé dans une autre casse perd son cadenas vert et sa place en tête)
L'utilisateur doit pouvoir taper un mot-clé pour l'étudier au Capitaine.
- Le champ « Tester un mot-clé capitaine… » et le bouton « Analyser » sont en tête de l'onglet ; Entrée a le même effet.
- Une saisie vide est refusée.
- Un mot-clé nouveau rejoint la liste et son étude (scan) démarre aussitôt.
- Un mot-clé déjà présent (casse ignorée) est ré-étudié à sa place, sans doublon.

### FR-CAP-SCAN — Étudier les indicateurs marché d'un mot-clé
**Statut :** non tenue (dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention ; un mot-clé dont le volume, la difficulté ou le CPC est absent est remesuré, et repayé, à chaque étude ; un échec d'étude s'affiche en anglais technique, sans cause (« Erreur : Keyword validation failed »))
Pour chaque mot-clé étudié, l'outil doit obtenir six indicateurs marché et un verdict, en réutilisant les mesures récentes.
- Six indicateurs : volume, difficulté, CPC, intention, PAA (points pondérés selon l'accord avec le sujet), position du mot-clé dans les suggestions Google.
- Des mesures de moins de 7 jours en base sont réutilisées sans appel payant.
- Sinon, les mesures sont demandées en parallèle, puis enregistrées pour tous les articles.
- Une donnée absente reste absente (« — »), jamais 0 ; un échec s'affiche sur la carte (« Erreur : … »).

### FR-CAP-LIST-SIDEPANEL — Liste de candidats et panneau de détail
**Statut :** non tenue (après un envoi depuis le Radar, le Capitaine verrouillé n'est plus marqué ni en tête, et les candidats déjà étudiés quittent la liste ; sur un article qui avait déjà des candidats, les autres cartes envoyées n'apparaissent qu'à la réouverture)
L'onglet doit présenter une liste verticale de candidats et, pour le candidat choisi, un panneau de détail.
- Un clic sur une carte la sélectionne et ouvre le panneau « Capitaine » à droite de l'écran ; la largeur du panneau se règle.
- Le panneau se ferme par « × » ou par un clic hors de lui.
- La liste se trie par « A-Z » ou « Score Pertinence » ; le Capitaine verrouillé reste toujours en tête.
- Changer d'article vide la sélection.

### FR-CAP-KPIS-READONLY — Indicateurs marché en lecture seule
**Statut :** non tenue (l'intention s'affiche « — » pour tout mot-clé étudié hors Radar ; la ligne « Autocomplete » montre tantôt un nombre de suggestions, tantôt une position ; l'autocomplétion est toujours suivie de « matches » ; le CPC s'affiche avec un point (« 2.10 € ») ; pour une carte venue du Radar, l'intention s'affiche en code anglais)
Le panneau de détail doit afficher les indicateurs marché du candidat, sans possibilité de les modifier.
- La section « KPIs marché » montre Volume, Difficulté, CPC, Intent, PAA et Autocomplete.
- Aucune valeur n'est éditable ; une valeur absente s'affiche « — ».
- Chaque indicateur a le même sens quelle que soit l'origine du candidat.

### FR-CAP-SCORING-BIMODAL — Score Pertinence affiché, Score Marché conservé
**Statut :** non tenue (à la réouverture, un mot-clé étudié hors du Radar n'a plus de Score Marché, y compris dans l'avis de l'IA)
Au Capitaine, chaque carte doit afficher son Score Pertinence ; le Score Marché reste calculé pour l'avis de l'IA.
- La carte affiche le Score Pertinence, ou « — » quand il n'est pas calculable, jamais 0.
- Le tri « Score Pertinence » lit la même valeur que l'anneau de la carte d'origine.
- L'intention de la SERP (la page de résultats Google) entre dans le Score Marché dès l'étude, mesurée ou relue en base.

### FR-CAP-AI-PANEL — Avis de l'IA sur un candidat
**Statut :** non tenue (l'avis n'est jamais enregistré et il est redemandé pour chaque candidat à chaque réouverture ; la stratégie du cocon n'est pas transmise ; la confirmation annonce « un appel Claude » même en mode simulé ou avec un autre fournisseur)
Pour chaque candidat étudié, l'outil doit afficher un avis d'expert rédigé par l'IA.
- L'avis compte trois parties : potentiel éditorial, opportunités et risques, recommandation.
- Le texte s'affiche au fil de la génération.
- L'avis tient compte du mot-clé, du niveau, du point de douleur, des deux scores et de la stratégie du cocon.
- Le bouton de régénération demande confirmation (« Cela consommera un appel Claude »).
- Un avis déjà obtenu est réaffiché à la réouverture de l'article, sans nouvel appel.

### FR-CAP-ROOTS — Racines d'un mot-clé long
**Statut :** non tenue (à la réouverture, les racines reviennent sans indicateurs ni Score Pertinence (« — » partout, plus de « Moyenne », verdict GRAY) ; juste après l'étude, elles s'affichent dans l'ordre où leurs études aboutissent, pas de la plus longue à la plus courte)
L'outil doit décomposer un mot-clé d'au moins 3 mots en racines, par troncature depuis la fin, et permettre de les comparer.
- Jusqu'à 5 racines, de la plus longue à la plus courte ; une racine garde au moins 2 mots significatifs (hors mots-outils).
- Quand le volume du mot-clé n'est pas au vert, ses racines sont étudiées d'office.
- Le panneau de détail liste les racines, avec leur Score Pertinence et leur moyenne ; un clic sur une racine l'affiche à la place du mot-clé.
- Cliquer sur les mots d'une carte (au-delà des 2 premiers mots significatifs) étudie la combinaison choisie.

### FR-CAP-LOCK-RADIO — Un seul Capitaine par article
**Statut :** active
Un article doit avoir zéro ou un Capitaine verrouillé ; verrouiller un autre candidat remplace l'ancien.
- Verrouiller un nouveau candidat remplace l'ancien dans le même geste.
- Déverrouiller vide le Capitaine de l'article.
- Si des Lieutenants sont déjà verrouillés, déverrouiller demande « Les garder » ou « Tout réinitialiser » (qui les archive) ; un clic à côté annule.

### FR-CAP-LOCK-GATE — Verrouiller un Capitaine risqué déclenche l'alarme
**Statut :** active
Le verrouillage doit passer par une porte : un mot-clé risqué ouvre l'alarme graduée, qui explique le risque et propose d'autres candidats. L'utilisateur corrige ou passe outre par écrit (cf. FR-INFRA-GATE-WAIVER).
- 🔴 volume inconnu ou nul ; 🔴 verdict NO-GO ; 🔴 SERP commerciale ou transactionnelle pour un article informationnel ; 🟠 tout autre écart d'intention ; 🟠 Google ne suggère pas la requête.
- « Google ne suggère pas la requête » se juge sur la valeur « Autocomplete » que montre le panneau du Capitaine : des suggestions seulement approchées (d'autres requêtes) ne comptent pas.
- L'intention attendue est celle du Cerveau ; à défaut, un pilier vaut « informationnel » ; une intention inconnue ne lève aucune alerte.
- L'alarme propose au plus 5 autres candidats de l'article dont le volume est mesuré et non nul, du plus recherché au moins recherché.
- La porte est vérifiée avant tout changement : en cas de retour, rien n'est verrouillé ni enregistré ; si la vérification échoue, un message le dit et rien n'est verrouillé.
- Le serveur refuse l'étape « Capitaine verrouillé » tant que la porte ne passe pas ; explorer un autre candidat ne fait pas tomber une dérogation, changer de Capitaine si.

### FR-CAP-AUTO-NOGO — NO-GO quand aucun signal n'existe
**Statut :** non tenue (dans la bannière de l'avis, le libellé du NO-GO s'affiche deux fois de suite)
Un mot-clé mesuré sans aucun signal de demande doit recevoir d'office le verdict NO-GO, distinct d'un verdict « données insuffisantes ».
- Volume, PAA et position dans les suggestions mesurés tous à 0 donnent NO-GO, raison « Aucun signal détecté ».
- Le libellé affiché est « Aucun signal détecté — ce mot-clé n'existe pas dans les données. ».
- Sans volume, ni PAA, ni suggestions mesurés, le verdict est GRAY (« Données insuffisantes »), jamais NO-GO.
- Un NO-GO déclenche l'alarme 🔴 au verrouillage (cf. FR-CAP-LOCK-GATE).

### FR-CAP-PAINPOINT-FALLBACK — Sans point de douleur, pas de Score Pertinence
**Statut :** non tenue (juste après son étude, un mot-clé déjà scanné au Radar reçoit une note de pertinence même sans point de douleur ; et l'infobulle invite à définir une douleur que l'utilisateur ne peut saisir nulle part)
Sans point de douleur d'au moins 10 caractères, l'outil doit continuer de fonctionner sans inventer de pertinence.
- Toutes les cartes affichent « — » en Score Pertinence, jamais 0.
- L'info-bulle invite à définir le point de douleur de l'article.
- Le Score Marché et le verdict restent calculés.

### FR-CAP-PERSIST — Les candidats étudiés sont enregistrés par article
**Statut :** non tenue (la provenance radar / longue traîne / saisie n'est pas enregistrée ; un écran dont les mots-clés ne sont pas encore chargés peut envoyer un Capitaine vide et des listes vides, qui effacent les décisions enregistrées (défaut latent) ; déverrouiller en archivant les lieutenants envoie deux enregistrements concurrents)
Chaque candidat étudié pour un article doit être enregistré, avec ses questions PAA, et réaffiché à la réouverture.
- Un candidat est enregistré dès son étude.
- La réouverture réaffiche tous les candidats, leurs indicateurs et le Capitaine verrouillé.
- Les données d'un article ne se mélangent jamais à celles d'un autre : une réponse arrivée pour un article qu'on vient de quitter est ignorée.
- La provenance de chaque candidat est conservée.
- Supprimer l'article supprime ses candidats.

### FR-CAP-CHECK — Étape « Capitaine verrouillé »
**Statut :** non tenue (déverrouiller le Capitaine retire l'étape même quand l'enregistrement du déverrouillage a échoué)
Verrouiller le Capitaine doit valider l'étape Moteur « Capitaine verrouillé », et le déverrouiller doit la retirer.
- L'étape est demandée après l'enregistrement du Capitaine ; si l'enregistrement échoue, elle ne l'est pas.
- Déverrouiller retire l'étape.
- À l'ouverture de l'onglet, l'étape est réconciliée avec l'état réel du verrou.
- L'étape n'est accordée que si la porte passe (cf. FR-CAP-LOCK-GATE).
- Un refus de la porte qui arrive après que l'utilisateur a déverrouillé ce Capitaine n'ouvre pas d'alarme : l'étape n'est plus demandée, rien n'est à décider.

### FR-CAP-RELEVANCE-LIVE — Score Pertinence recalculé, jamais enregistré
**Statut :** non tenue (juste après une étude, la note affichée vient d'un autre calcul que celle de la réouverture : sans racines, avec les anciens signaux du Radar)
Le Score Pertinence doit être recalculé à chaque ouverture de l'onglet et n'être enregistré nulle part.
- Aucun enregistrement en base ni stockage navigateur ne contient ce score.
- Rouvrir l'article recalcule le score avec la formule et le point de douleur du moment.
- Un mot-clé saisi à la main reçoit un score calculable, si le point de douleur existe.
- Un mot-clé garde le même score juste après son étude et après réouverture.

### FR-CAP-RELEVANCE-INPUTS — Racines enregistrées à l'entrée, relues au calcul
**Statut :** active
Les racines d'un candidat doivent être calculées quand il entre dans la liste, enregistrées avec lui, puis relues pour le Score Pertinence.
- Toute étude d'un candidat enregistre ses racines.
- Verrouiller un candidat ne recalcule pas ses racines.
- Le calcul du Score Pertinence lit les racines en base.
- L'extraction reste une troncature simple, sans IA.

### FR-CAP-RELEVANCE-MEMOIZATION — Une racine partagée n'est calculée qu'une fois
**Statut :** active
Pendant un calcul de pertinence pour plusieurs candidats, une racine commune ne doit être évaluée qu'une fois.
- Chaque racine distincte est évaluée une seule fois par calcul.
- Ce partage ne dure que le temps d'une requête ; rien n'est mis en cache au-delà.

### FR-CAP-RELEVANCE-UNAVAILABLE-REASON — Dire pourquoi le Score Pertinence manque
**Statut :** non tenue (l'échec de l'IA de jugement n'est jamais signalé ; une longue traîne est présentée comme « aucune question PAA » ; l'écran devine encore une raison quand le serveur n'en donne pas)
Quand le Score Pertinence manque, l'outil doit afficher « — » et la raison précise donnée par le serveur.
- Raisons possibles : point de douleur absent, longue traîne, aucune question PAA, aucune suggestion, jugement IA indisponible.
- La raison vient du serveur ; l'écran ne la devine pas.
- Un score absent reste « — », jamais 0.
- Un jugement IA en panne laisse le score calculé (repli lexical) mais le signale.

### FR-CAP-RELEVANCE-INTENT-SIGNAL — Intention de la SERP croisée avec l'intention de l'article
**Statut :** active
Le Score Pertinence doit croiser l'intention de la SERP d'un mot-clé avec l'intention éditoriale attendue de l'article.
- Le signal pèse 10 % ; il vaut 50 (neutre) si l'une des deux intentions manque.
- Un écart d'intention retire 10 points à ce signal.
- L'intention de la SERP est retrouvée quelle que soit la casse du mot-clé.
- L'étude et la réouverture lisent les mêmes intentions (SERP mesurée ou en base ; intention de l'article, qu'elle vienne de l'IA du Cerveau, de l'utilisateur ou du candidat d'origine).

### FR-CAP-PAA-JUDGE-HAIKU — L'IA juge les questions PAA face à la douleur
**Statut :** non tenue (le jugement est calculé mais ni ses pastilles ni la note qu'il corrige n'atteignent la liste du Capitaine ; ce jugement est pourtant payé à chaque ouverture du Capitaine après un rechargement : il est à suspendre tant que son affichage n'est pas branché)
À l'ouverture du Capitaine, une IA rapide doit juger chaque question PAA des candidats face au sujet et à la douleur de l'article, et ce jugement doit nourrir le Score Pertinence.
- Un appel par candidat, à l'entrée dans l'onglet, une fois par article et par session.
- Chaque question reçoit un verdict (pertinent, partiel, hors-sujet) et une justification courte.
- Si l'IA échoue, le score retombe sur le calcul lexical, sans interrompre l'utilisateur.
- Le signal « PAA × douleur » garde son poids de 25 %.
- La liste du Capitaine affiche les scores corrigés par ce jugement.

### FR-CAP-PAA-BADGE-SINGLE — Une pastille par question, issue du jugement IA
**Statut :** non tenue (la liste du Capitaine affiche les badges lexicaux du Radar ; la pastille IA n'existe que dans l'ancien mode libre)
Au Capitaine, chaque question PAA doit porter une seule pastille, issue du jugement de l'IA.
- Pastille verte « pertinent », orange « partiel », grise « hors-sujet » ; la justification en info-bulle.
- L'indicateur PAA de la carte affiche la note globale du jugement sur 100, ou « ... » pendant le calcul.
- Sans jugement, la carte retombe sur les badges lexicaux, sans erreur.

### FR-CAP-PAA-JUDGE-CACHE-SESSION — Jugements gardés en mémoire pendant la session
**Statut :** active
Les jugements de l'IA doivent être gardés en mémoire du navigateur pour la session, par article.
- Revenir sur un article déjà jugé ne relance pas l'IA.
- Recharger la page (F5) efface les jugements.
- Aucun jugement n'est écrit en base ni dans le stockage du navigateur.
- Deux demandes simultanées pour le même article ne produisent qu'un appel.

### FR-CAP-NO-PAINPOINT-WATCHER — Pas de recalcul si la douleur change en cours de visite
**Statut :** active
Un changement du point de douleur pendant la visite de l'onglet ne doit pas relancer le calcul de pertinence.
- Aucun recalcul automatique de pertinence n'est déclenché par un changement du point de douleur.
- Le prochain chargement de l'onglet ou de l'article reflète le nouveau point de douleur.

### FR-CAP-LOCK-INTEGRITY — Verrou sans doublon, tri stable
**Statut :** non tenue (afficher une racine l'enregistre comme candidat et lance pour elle un avis IA payant ; la liste se reconstruit alors, et les notes des candidats étudiés pendant la session passent à « — » ; deux casses d'un même mot-clé comptent pour deux candidats)
Le verrouillage doit viser le mot-clé d'origine d'une carte, sans créer de doublon ni déplacer la carte.
- Ajouter, recharger ou verrouiller plusieurs fois un même mot-clé ne crée qu'une carte.
- Le verrou porte sur le mot-clé d'origine, même quand une racine est affichée.
- Afficher une racine ne déplace pas la carte : le tri lit le mot-clé et le score d'origine.

### Retirées (FR-CAP)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-CAP-VERDICT-INFORMATIVE | superseded | FR-CAP-LOCK-GATE |
| FR-CAP-VERDICT-GATING | deprecated | FR-CAP-VERDICT-INFORMATIVE, elle-même remplacée par FR-CAP-LOCK-GATE |
| FR-CAP-HISTORY-SLIDER | deprecated | — (mode libre / Labo retiré) |
| FR-CAP-RELEVANCE-STORE-REMOVED | retirée (décision de code) | FR-CAP-RELEVANCE-LIVE |
| FR-CAP-EXPLORED-KEYWORDS-NAMING | retirée (convention de code) | convention décrite dans `design/14-radar-capitaine.md` |
| FR-CAP-SIDEPANEL-WIDTH | retirée (détail de mise en page) | convention décrite dans `design/14-radar-capitaine.md` |
| FR-NAM-CONTAINERS-PANEL | retirée (convention de code) | convention décrite dans `design/14-radar-capitaine.md` |
| FR-CODE-NO-CAROUSEL | retirée (convention de code) | convention décrite dans `design/14-radar-capitaine.md` |

---

## 10. Moteur — Lieutenants (FR-LIE)

Les lieutenants sont les mots-clés secondaires d'un article : les recherches voisines de son mot-clé principal (le capitaine), qui nourriront ses chapitres. Ce domaine couvre l'analyse des pages concurrentes, la proposition de l'IA, le choix de l'utilisateur et la porte (un contrôle serveur qui accorde ou retient une étape) de l'étape « Lieutenants verrouillés ».

### FR-LIE-SERP-ANALYZE — Analyser les pages concurrentes du capitaine
**Statut :** non tenue (la pile d'activité annonce « Scraping ~N URLs via DataForSEO » même quand l'analyse est relue en base ; « Tout relancer (SERP + IA) » ne relance rien pendant 7 jours : il relit l'analyse et les propositions gardées, et doit s'appeler « Recharger l'analyse »)
L'outil doit analyser les 10 premiers résultats Google (la SERP) du capitaine et de ses mots-clés racines, lire leurs pages et en restituer les titres, les questions « Autres questions posées » (PAA) et la liste des concurrents. Une analyse récente est relue au lieu d'être refaite.
- L'analyse part d'un clic sur « Analyser SERP », seulement quand le capitaine est verrouillé ou que des propositions existent déjà pour l'article ; dans ce second cas, un Capitaine déverrouillé (« Les garder ») laisse le bouton actif, sur le mot-clé de l'article.
- Chaque mot-clé analysé montre ses concurrents : rang, nature (« Blog » ou « Autre »), domaine, titre cliquable, et un « ! » pour une page qui n'a pas pu être lue.
- Une analyse de moins de 7 jours est relue en base, sans nouvel appel payant, quel que soit l'article qui l'a demandée.
- Le nombre de résultats analysés est fixe : 10 par mot-clé.

### FR-LIE-SERP-ECHEC-EXPLIQUE — Un échec d'analyse se lit et se répare
**Statut :** non tenue (le serveur remplace toute cause (aucun résultat, source muette) par « SERP analysis failed », affiché entre parenthèses ; une coupure réseau n'est pas reconnue ; le plafond de dépense invite à changer de mot-clé, et un quota épuisé à attendre au lieu de recharger les crédits)
Quand l'analyse des concurrents échoue, l'outil doit dire en français la cause probable et la marche à suivre, en nommant le mot-clé en cause.
- Aucun résultat exploitable : le message dit que le mot-clé est sans doute trop étroit et invite à l'élargir au capitaine.
- Budget d'appels atteint : le message invite à réessayer dans quelques minutes, sans accuser le mot-clé.
- Source qui ne répond pas : le message le dit et invite à relancer.
- Aucun message technique en anglais n'est montré tel quel.

### FR-LIE-EXTRACT-HEADINGS — Récurrence des titres concurrents
**Statut :** active
L'outil doit compter, pour chaque titre H1/H2/H3 (les niveaux de titre d'une page) trouvé chez les concurrents, sur combien de pages lues il apparaît.
- Chaque titre affiche son niveau, son texte, « n/total » et son pourcentage ; la liste va du plus fréquent au moins fréquent.
- Une page non lue n'entre pas dans le total ; un titre répété sur une même page ne compte qu'une fois.
- Seuls les titres vus sur au moins deux pages sont transmis à l'IA.
- La récurrence s'affiche dans l'onglet Structure, dans une section repliable ; l'onglet Lieutenants la calcule pour l'IA sans l'afficher.

### FR-LIE-PROPOSE-AI — L'IA propose des lieutenants
**Statut :** active
À partir des concurrents, des questions PAA, des titres récurrents, des racines, des groupes de mots de Discovery et de la douleur de l'article, l'IA doit proposer des lieutenants notés, en séparant les meilleurs candidats des autres.
- La proposition part d'elle-même après une analyse des concurrents réussie, sauf si des propositions de moins de 7 jours existent déjà : elles sont alors relues.
- Pendant la génération, le texte brut de l'IA défile ; à la fin, chaque candidat porte un score sur 100, un niveau conseillé (H2 ou H3), une raison et ses sources.
- Le nombre de candidats placés en tête de liste est plafonné par type d'article : 5 pour un pilier, 5 pour un intermédiaire, 4 pour un spécialisé ; les autres vont dans « Autres candidats ».
- L'IA ne propose aucune structure de titres, et aucune proposition n'arrive cochée.
- Les lieutenants déjà retenus dans les autres articles du cocon sont signalés à l'IA comme interdits.

### FR-LIE-GEOFUNNEL-RULE — Règle de l'entonnoir géographique
**Statut :** active
Quand le capitaine contient une ville, l'IA doit limiter les lieutenants qui la répètent selon le type d'article, pour qu'un article généraliste ne capte pas les requêtes locales réservées à des articles dédiés.
- Pilier : pas plus de lieutenants avec la ville que de chapitres autorisés à la citer (2).
- Intermédiaire et spécialisé : aucun lieutenant ne cite la ville.
- Un lieutenant qui ne fait qu'ajouter la ville à un terme générique reçoit un malus de 15 à 25 points.
- La règle est une consigne donnée à l'IA : aucun contrôle ne la vérifie après coup.

### FR-LIE-SECTIONS-FOLDABLE — Sources de l'IA repliables
**Statut :** active
L'onglet doit montrer, repliées par défaut, les sources que l'IA a consultées, pour ne pas surcharger l'écran.
- Deux sections après l'analyse : « Sources IA : questions Google (PAA) » et « Sources IA : clusters Discovery ».
- Chacune est repliée à l'ouverture et se déplie d'un clic.
- Une section vide explique pourquoi (pas de PAA sur une requête de niche, pas de scan Discovery).

### FR-LIE-CANDIDATES-BADGES — Provenance et force de chaque candidat
**Statut :** active
Chaque candidat doit montrer d'où il vient et sa force estimée, pour qu'on comprenne d'un regard pourquoi l'IA le propose.
- Une pastille colorée par source : questions PAA, concurrents, groupes de Discovery, mots-clés racines, faille de contenu.
- Un score sur 100 ; un score absent s'affiche « — » avec l'info-bulle « Score IA non fourni », jamais 0.
- Les candidats se trient par ordre alphabétique ou par score ; un score absent reste en bas.

### FR-LIE-CHECKBOX-COUNT — Compteur de lieutenants retenus
**Statut :** non tenue (le compteur affiche les cases cochées sur le nombre de propositions générées ; aucune fourchette conseillée par type d'article n'est affichée ni signalée)
L'utilisateur coche ses lieutenants ; un compteur doit lui dire combien il en a retenus et s'il est dans la fourchette conseillée pour le type d'article (le minimum et le maximum de lieutenants retenus des règles du type).
- Chaque candidat a une case à cocher.
- Chaque case est enregistrée aussitôt, sans bouton « Enregistrer ».
- Le compteur affiche le nombre retenu et la fourchette du type, et signale un nombre hors fourchette.
- Après un rechargement, le nombre de propositions est relu avec elles (retenues, proposées et écartées pour le Capitaine courant) : jamais « 1 / 0 sélectionnés ».

### FR-LIE-SLIDER-INTELLIGENT — Curseur du nombre de concurrents
**Statut :** non tenue (le curseur, de 3 à 10, ne change que le compteur « N concurrents affichés » ; il ne filtre ni la liste des concurrents ni les données de l'IA, et ne déclenche jamais d'analyse complémentaire)
Un curseur doit régler le nombre de concurrents pris en compte, sans appel payant quand on le baisse.
- Le curseur affiche sa valeur.
- Le baisser ne déclenche aucun appel externe.
- La valeur choisie s'applique aux concurrents affichés et à ce que reçoit l'IA.

### FR-LIE-CHECK — Étape « Lieutenants verrouillés »
**Statut :** active
Dès qu'un lieutenant est coché, l'outil doit demander l'étape « Lieutenants verrouillés » (une case de la progression de l'article), que la porte des lieutenants accorde ou retient.
- Un seul lieutenant coché suffit à demander l'étape ; aucune structure n'est exigée.
- Tout décocher retire l'étape.
- À l'ouverture de l'onglet : étape présente sans lieutenant retenu, elle est retirée ; lieutenant retenu sans étape, la porte est consultée.
- Cocher un lieutenant n'écrit ni sommaire ni longueur conseillée.

### FR-LIE-LOCK-GATE — Des lieutenants en nombre suffisant et sans cannibalisation
**Statut :** active
La porte des lieutenants doit refuser trop peu de lieutenants et un lieutenant qui est déjà le mot-clé principal d'un autre article du cocon (un groupe d'articles liés autour d'un même sujet) : deux pages sur le même mot-clé se font concurrence dans Google (cannibalisation). La vérification est silencieuse.
- 🔴 Moins de lieutenants que le minimum du type : 3 pour un pilier, 2 pour un intermédiaire, 1 pour un spécialisé ; l'alarme propose « À la place : » jusqu'à cinq propositions non cochées, les mieux notées d'abord.
- 🔴 Un lieutenant est le capitaine d'un autre article du cocon ; 🟠 il est lieutenant d'un autre article ; 🟠 il est identique au capitaine de l'article. Chaque lieutenant en conflit se déroge séparément.
- Les lieutenants sont enregistrés avant la vérification ; la porte juge ce qui est enregistré.
- Tant que la porte refuse, un bandeau « Étape non validée. » donne la première raison et un bouton « Voir pourquoi / décider » ouvre l'alarme graduée.
- Tout ajout ou retrait de lieutenant relance la vérification, y compris un changement fait pendant une vérification ; l'étape n'est jamais demandée deux fois.

### FR-LIE-AI-FRONTIER — Frontière entre choix de l'utilisateur et suggestions de l'IA
**Statut :** active
L'écran doit séparer visuellement les lieutenants (que l'utilisateur coche) du panneau de suivi de l'IA, pour qu'on sache toujours si l'on regarde une décision ou une suggestion.
- La liste des lieutenants proposés est rendue hors du panneau « Suggestions IA Lieutenants ».
- Aucune structure de titres n'est affichée dans l'onglet Lieutenants.
- Un test d'architecture échoue si ces règles sont cassées.

### FR-LIE-SCRAPE-DEDIE — Lieutenants indépendants du Lexique
**Statut :** active
L'analyse des lieutenants doit fonctionner sans que le Lexique ait jamais été lancé, et réutiliser une lecture des pages déjà faite.
- L'onglet Lieutenants démarre sans dépendre du Lexique.
- Une page concurrente déjà lue (par le Lexique ou un autre article) est réutilisée : 1 heure en mémoire, 7 jours en base.
- Un test d'architecture interdit tout import croisé entre les traitements Lieutenants et Lexique.

### FR-LIE-CHECKBOX-LOCK-IMMEDIATE — Cocher un lieutenant le verrouille aussitôt
**Statut :** non tenue (relancer la proposition de l'IA décoche à l'écran les lieutenants déjà retenus et retire l'étape, alors que la liste enregistrée les garde ; et le bouton de relance du panneau de l'IA disparaît tant que ce panneau affiche les failles de contenu de la dernière génération)
Cocher la case d'un lieutenant doit le verrouiller en base ; la décocher le déverrouille. Aucune action de l'onglet ne doit défaire ces choix.
- Cocher un lieutenant ne désactive jamais les autres cases ; il n'y a pas de bouton de verrouillage groupé.
- « Tout relancer (SERP + IA) » et la relance de la proposition restent disponibles, quel que soit le nombre de lieutenants retenus. Tant que la relance ne peut pas partir (Capitaine ni verrouillé ni déjà analysé), son bouton est grisé et dit pourquoi ; après un rechargement, le panneau de l'IA annonce les propositions relues (« N propositions générées par l'IA. »), et sa relance relit d'abord l'analyse SERP (en base si elle a moins de 7 jours) avant de rappeler l'IA : jamais un clic sans effet.
- Après une relance de la proposition, les lieutenants retenus restent cochés et leur étape reste valable.

### Retirées (LIE)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-LIE-HN-STRUCTURE | superseded | FR-HN-TAB, FR-HN-LOCK-GATE |
| FR-LIE-CHECKS | alias (jamais rédigée) | FR-LIE-CHECK |
| FR-LIE-PERSIST, FR-LIE-SELECT | alias (jamais rédigées) | FR-LIE-CHECKBOX-LOCK-IMMEDIATE |
| FR-LIE-PROPOSE, FR-LIE-AI-PROPOSALS | alias (jamais rédigées) | FR-LIE-PROPOSE-AI |

---

## 11. Moteur — Structure (FR-HN)

La structure est le plan de l'article : son titre H1, ses chapitres H2 et leurs sous-parties H3. Elle se bâtit après le choix des lieutenants, dans son propre onglet, et devient le sommaire de la Rédaction une fois validée par sa porte.

### FR-HN-TAB — La structure a son propre onglet
**Statut :** non tenue (un refus d'enregistrement de la structure arrête la validation sans aucun message à l'écran ; seul le refus du sommaire est dit)
L'outil doit proposer, entre Lieutenants et Lexique, un onglet Structure qui bâtit le plan à partir des seuls lieutenants retenus, le laisse ajuster, puis le valide comme sommaire de la Rédaction.
- Ordre des onglets de la phase « Valider » : Capitaine → Lieutenants → Structure → Lexique. Sans lieutenant retenu, l'onglet le dit et aucune structure ne peut être demandée.
- La structure est proposée par l'IA sur demande, à partir des lieutenants retenus, des titres vus sur au moins deux pages concurrentes et de l'état du cocon ; le H1 contient le capitaine en entier ; ni introduction ni conclusion.
- L'utilisateur verrouille (🔒) les titres à garder et redemande une proposition : ils reviennent tels quels. La structure peut être enregistrée sans être validée.
- « Valider la structure » enregistre la structure, en fait le sommaire de la Rédaction (sauf sommaire retouché que l'utilisateur choisit de garder), recalcule la longueur conseillée sans écraser une longueur choisie, puis demande l'étape « Structure validée ». Si la structure ou le sommaire ne peuvent pas être enregistrés, l'étape n'est pas demandée et l'écran le dit.
- Ouvrir l'onglet ne paie rien : l'analyse des concurrents n'est que relue ; si elle manque, elle part avec « Générer la structure ». Retirer l'étape Capitaine ou Lieutenants, ou changer les lieutenants retenus, retire l'étape « Structure validée » ; enregistrer les lieutenants ou le lexique ne touche pas la structure.

### FR-HN-LOCK-GATE — Une structure conforme au type d'article
**Statut :** active
La porte de la structure doit juger la structure enregistrée avant d'accorder l'étape, au clic sur « Valider la structure » et de nouveau à la publication. Les règles viennent de la source unique des règles par type.
- ⛔ (non dérogeable) : titres sans aucun chapitre H2, pas de H1, titre vide, H3 sans H2 au-dessus.
- 🔴 : aucune structure enregistrée ; H1 sans le capitaine en entier ; nombre de H2 de fond hors du type (pilier 6-8, intermédiaire 4-6, spécialisé 3-5, introduction et conclusion non comptées) ; trop de H2 citant la ville du client (pilier 2, sinon 0) ; pour un pilier, un H2 qui contient le capitaine d'un autre article du cocon et le développe en H3.
- 🟠 : lieutenant retenu absent des titres (moins des trois quarts de ses mots) ; H2 « Introduction » ou « Conclusion » ; plus de 3 H3 sous un H2 ; pour un pilier, H2 qui recoupe un article du cocon sans le développer.
- Chaque lieutenant absent et chaque article recoupé se déroge séparément ; une dérogation tombe si la structure, le type, le capitaine, les lieutenants, la ville ou les articles recoupés changent.
- Le mode automatique demande l'étape à la même porte et s'arrête sur un refus, sans jamais déroger seul (sauf une porte toute 🟠 que l'utilisateur dit avoir lue, cf. FR-INFRA-VERIFIER-SHARED).

---

## 12. Moteur — Lexique (FR-LEX)

Le lexique est la liste des mots du métier que l'article doit employer. L'outil mesure les mots des pages concurrentes, l'IA en recommande, et l'utilisateur choisit. Ce domaine couvre l'extraction, le choix, l'exploration d'autres mots-clés et la porte de l'étape « Lexique validé ».

### FR-LEX-TFIDF — Mesurer les mots des pages concurrentes
**Statut :** active
L'outil doit mesurer, dans le texte principal des pages concurrentes, sur combien de pages chaque mot apparaît, et ranger les mots en trois niveaux.
- Obligatoire : présent sur au moins 70 % des pages ; Différenciateur : 30 à 70 % ; Optionnel : moins de 30 %.
- Chaque terme affiche sa densité (occurrences par page) et son pourcentage de pages ; chaque liste est triée par densité et plafonnée à 50 termes.
- Les termes sont des mots isolés : « laine soufflée » sort en « laine » et « soufflée ».
- L'extraction ne paie aucun nouvel appel quand les pages ont déjà été lues.

### FR-LEX-METIER-ONLY — Le lexique ne contient que des mots du métier
**Statut :** active
Le lexique proposé ne doit garder que le vocabulaire du métier, et sa validation passe par une porte qui refuse un lexique vide ou générique.
- Aucun mot vide (articles, pronoms, possessifs, prépositions, adverbes, verbes génériques), avec ou sans accent, aucun nombre, aucun mot de moins de 3 lettres, aucun mot de décor de page (cookies, mentions, newsletter, réseaux sociaux…). « site », « blog », « article », « recherche » restent proposés.
- Seul le contenu principal des pages compte : menus, en-têtes, pieds de page, encarts, formulaires et bandeaux sont écartés ; dans un article, le titre est gardé.
- 🔴 Lexique vide ; 🔴 terme générique retenu (un terme de plusieurs mots n'est générique que si tous ses mots le sont), une alerte par terme. La porte est revérifiée à chaque changement ; tant qu'elle refuse, un bandeau « Étape non validée. » et un bouton « Voir pourquoi / décider » l'annoncent ; si la vérification est impossible, l'étape est demandée et le serveur tranche.
- Une exploration enregistrée avant la règle se relit sous la règle : ses mots génériques ne s'affichent plus, ni extraits, ni recommandés, ni cités comme manquants.
- Le lexique modifié depuis la Rédaction passe le même filtre : un mot générique ajouté à la main est refusé avec sa raison, ceux d'une suggestion de l'IA sont écartés et nommés. La porte est rejouée à la publication, et le mode automatique ne retient jamais un terme qu'elle refuserait.

### FR-LEX-PRECHECK-PERSISTE — Ce que l'écran coche est réellement retenu
**Statut :** active
Une case cochée doit valoir décision enregistrée, et aucune case ne doit arriver cochée sans geste de l'utilisateur.
- Aucun terme n'arrive coché, ni après l'extraction ni après l'analyse de l'IA.
- Chaque case cochée ou décochée, et chaque terme ajouté depuis le panneau de suggestions, est enregistré aussitôt.
- Le compteur « N terme(s) sélectionné(s) » correspond exactement à ce qui est enregistré.
- L'écran suit le lexique enregistré quel que soit le chemin (extraction, rechargement, onglet d'exploration) : cliquer un terme coché le décoche et le retire.

### FR-LEX-SORT — Trois tris des termes
**Statut :** non tenue (le premier clic sur « A-Z » range de Z à A)
L'utilisateur doit pouvoir trier les termes par ordre alphabétique, par densité ou par proximité avec la douleur de l'article.
- Une barre de tri en haut des listes : « A-Z », « Densité », et « Pertinence douleur » seulement si l'article a une douleur.
- Sans tri choisi, les termes restent dans l'ordre de densité décroissante.
- Un premier clic sur « A-Z » range de A à Z.
- Le tri choisi s'applique aux trois listes et reste tant que la page du Moteur est ouverte ; il est perdu au rechargement.

### FR-LEX-SELECT — Une case par terme, enregistrée aussitôt
**Statut :** active
L'utilisateur doit retenir les termes qu'il veut dans son article en cochant une case par terme, sans bouton « Enregistrer ».
- Chaque terme a sa case ; aucune n'est cochée au premier affichage, même parmi les obligatoires.
- Chaque clic est enregistré aussitôt.
- Recharger la page retrouve exactement les choix.

### FR-LEX-AI-PANEL — Analyse du lexique par l'IA
**Statut :** non tenue (l'analyse part d'elle-même après chaque extraction, y compris l'extraction lancée seule à l'ouverture de l'onglet : un appel à l'IA part sans clic. Et le panneau lit deux listes de recommandations différentes : après une première analyse il reste « à lancer » ; après un rechargement il affiche « N analysés, 0 recommandés », sans pastilles ; le résumé et les termes manquants enregistrés ne s'affichent plus après un rechargement, et un changement d'onglet montre ceux de la dernière analyse, faite sur un autre mot-clé)
L'IA doit analyser les termes extraits au regard de la douleur de l'article et de la stratégie du cocon, et dire lesquels recommander, lesquels écarter et quels termes manquent. Elle ne part que sur un clic.
- Chaque terme analysé porte un badge « IA recommandé » ou « IA optionnel », avec la raison en info-bulle ; un terme sans décision lisible n'a pas de badge.
- Un résumé et au plus 5 « Termes manquants » s'affichent au-dessus des listes ; le panneau « Analyse IA Lexique » compte les termes analysés, recommandés et écartés.
- L'utilisateur peut relancer l'analyse (« Analyser avec l'IA », « Régénérer l'analyse », « Relancer l'analyse IA » après une erreur).
- L'analyse ne coche aucun terme.

### FR-LEX-MULTI-KEYWORD — Tester le lexique d'un autre mot-clé
**Statut :** active
L'utilisateur doit pouvoir extraire le lexique de n'importe quel autre mot-clé pour comparer les vocabulaires et y piocher des termes.
- L'onglet « Tester un mot-clé » (« + Tester un mot-clé » s'il existe déjà des explorations) ouvre un champ et un bouton « Extraire ».
- L'extraction ouvre un nouvel onglet à ce mot-clé ; plusieurs explorations coexistent par article.
- Avoir déjà retenu des termes ne ferme pas ce champ ; seule une extraction en cours le grise.

### FR-LEX-CHECK — Étape « Lexique validé »
**Statut :** active
Dès qu'au moins un terme est retenu, l'outil doit demander l'étape « Lexique validé », que la porte du lexique accorde ou retient.
- Pas de seuil : un terme suffit à demander l'étape.
- Retirer le dernier terme retire l'étape.
- À l'ouverture : étape présente sans terme, elle est retirée ; termes sans étape, la porte est consultée.
- Un terme générique ajouté retire l'étape ; elle revient quand la porte passe de nouveau.

### FR-LEX-SCRAPE-DEDIE — Lexique indépendant des Lieutenants
**Statut :** active
Le lexique doit pouvoir être extrait sans que l'onglet Lieutenants ait été lancé, en réutilisant une lecture des pages déjà faite.
- Extraire le lexique d'un capitaine jamais analysé fonctionne, après confirmation de l'analyse payante.
- Des pages déjà lues (par les Lieutenants ou une exploration) sont réutilisées, sans double appel.
- Sans page lue et sans demande d'analyse, l'extraction répond que les pages manquent.
- Un test d'architecture interdit tout import croisé entre les traitements Lexique et Lieutenants.

### FR-LEX-PRECHECK-SERP — Pages concurrentes absentes : le dire avant de payer
**Statut :** non tenue (pendant l'analyse lancée, « Lancer l'analyse SERP » reste cliquable : un second clic confirmé relance une analyse payante)
À l'ouverture de l'onglet, l'outil doit vérifier si les pages concurrentes du capitaine ont déjà été lues, et proposer une analyse payante explicite si ce n'est pas le cas.
- La vérification se fait sans appel payant.
- Pages présentes (ou vérification sans réponse) : le bouton « Extraire le Lexique » est proposé.
- Pages absentes : le message « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » et le bouton « Lancer l'analyse SERP (~$0.003 DataForSEO) » remplacent « Extraire ».
- Le bouton ouvre une confirmation qui rappelle le coût ; seule la confirmation lance l'analyse.

### FR-LEX-MULTI-KEYWORD-TABS — Un onglet par mot-clé exploré
**Statut :** non tenue (l'extraction du capitaine n'ajoute son onglet qu'au rechargement ; entre-temps, « Tester un mot-clé » paraît sélectionné au-dessus des listes du capitaine)
Chaque mot-clé exploré dans le Lexique doit avoir son onglet, et passer d'un onglet à l'autre ne doit rien recharger.
- Un onglet par exploration de l'article, libellé exactement comme le mot-clé saisi, plus l'onglet « Tester un mot-clé ».
- Changer d'onglet affiche les termes et l'avis de l'IA enregistrés, sans nouvel appel.
- Au rechargement, tous les onglets et les cases cochées reviennent.

### FR-LEX-LECTURE-VS-VERROUILLAGE — Explorer ne décide rien, décider ne recharge rien
**Statut :** active
Explorer des lexiques et retenir des termes doivent rester deux gestes séparés.
- Changer d'onglet d'exploration n'enregistre aucun terme.
- Cocher ou décocher un terme ne recharge aucune liste.
- L'étape « Lexique validé » ne suit que les termes retenus.
- Des tests d'architecture vérifient cette séparation.

### FR-LEX-CHECKBOX-LOCK-IMMEDIATE — Cocher un terme l'ajoute aussitôt au lexique
**Statut :** active
Cocher un terme doit l'ajouter immédiatement au lexique de l'article, le décocher l'en retirer, sans bouton de verrouillage global.
- Cocher ajoute le terme au lexique enregistré ; décocher le retire.
- Il n'existe aucun bouton « Valider le Lexique » ou « Verrouiller le Lexique ».
- L'étape « Lexique validé » suit la sélection et le verdict de la porte.

### Retirées (LEX)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-LEX-EXTRAIRE, FR-LEX-TF-IDF | alias (jamais rédigées) | FR-LEX-TFIDF |
| FR-LEX-PERSIST | alias (jamais rédigée) | FR-LEX-SELECT, FR-LEX-PRECHECK-PERSISTE |
| FR-LEX-EXPLORATION | alias (jamais rédigée) | FR-LEX-MULTI-KEYWORD |
| FR-LEX-RECOMMEND, FR-LEX-AI-MULTIKW | alias (jamais rédigées) | FR-LEX-AI-PANEL |

---

## 13. Moteur — Finalisation (FIN)

La Finalisation est le dernier onglet : un récapitulatif en lecture seule des quatre choix de la phase Valider, et le passage vers la Rédaction.

### FR-FIN-RECAP — Récapitulatif en lecture seule
**Statut :** active
L'outil doit montrer, dans un seul onglet et sans permettre de les modifier, le Capitaine, les Lieutenants retenus, la structure enregistrée et le lexique retenu de l'article.
- Quatre sections repliables, ouvertes par défaut : Capitaine, Lieutenants (N), Structure (N H2), Lexique (N termes).
- Les Lieutenants retenus s'affichent avec leur niveau de titre (H2, H3) et, s'il existe, le raisonnement de l'IA ; la structure s'affiche H1, H2 et H3 dans l'ordre de lecture, les H3 en retrait.
- Une section vide affiche un message neutre au lieu de disparaître.
- Aucun contrôle ne modifie une valeur : seuls le repli des sections et le bouton vers la Rédaction sont actionnables.

### FR-FIN-LINK-REDACTION — Passer à la Rédaction
**Statut :** non tenue (« Aller à la Rédaction → » transmet l'article choisi, mais la page Rédaction l'ignore : on arrive sur la liste du cocon, pas sur l'article)
L'outil doit offrir le passage à la Rédaction de l'article, depuis l'onglet Finalisation et depuis le bas du Moteur, sous la même condition.
- « Aller à la Rédaction → » (Finalisation) et « Continuer vers la Rédaction → » (bas du dernier onglet) sont désactivés tant qu'un des quatre verrous manque.
- Désactivés, ils listent les étapes manquantes (« Étapes restantes : Structure à valider, Lexique à valider »).
- Actifs, ils ouvrent la Rédaction du même cocon, sur l'article choisi.
- De retour au Moteur, les verrous sont toujours là.

### FR-FIN-CHECK — Pas d'étape propre à la Finalisation
**Statut :** active
L'outil ne doit pas créer d'étape « Finalisation » : l'état « prêt pour la Rédaction » se déduit des quatre verrous.
- Aucune action de l'onglet n'ajoute ni ne retire d'étape.
- « Prêt » équivaut exactement à Capitaine verrouillé ET Lieutenants verrouillés ET Structure validée ET Lexique validé.
- L'onglet reste consultable à tout moment et dit ce qui manque.
- Les deux boutons vers la Rédaction appliquent la même règle et ne peuvent pas se contredire.

### Retirées (FIN)

| ID | Statut | Remplacée par |
|---|---|---|
| (aucune dans ce domaine) | — | — |

---

## 14. Rédaction (FR-RED)

La Rédaction transforme un article préparé au Moteur (capitaine, lieutenants, lexique, structure H1/H2/H3 validés) en texte publiable. Elle couvre le brief, le sommaire, le premier jet et sa porte, l'enrichissement par passes, les retouches (actions sur sélection, réduction, humanisation, réécriture d'un chapitre), la méta, le maillage interne, les scores SEO et GEO, la porte de publication et l'export.

Une **porte** est un contrôle qualité qui juge l'article avant une étape. Chaque alerte a un niveau : ⛔ défaut technique (à corriger, jamais dérogeable), 🔴 risque (dérogeable avec une raison écrite), 🟠 attention (un accusé de lecture suffit). Le mécanisme des portes et des dérogations relève du § 19. Infrastructure transversale (`FR-INFRA-GATE-WAIVER`, `FR-INFRA-VERIFIER-SHARED`).

### FR-RED-BRIEF — Analyse IA du brief avant écriture
**Statut :** non tenue (l'analyse n'est pas enregistrée : un rechargement la perd, et la revoir la fait repayer)
L'outil doit produire, dans la rédaction guidée, une analyse stratégique du brief qui s'affiche au fil de l'écriture : intention de recherche, structure, contenu par section, points d'attention.
- L'analyse se lance d'elle-même à la première ouverture du panneau « IA Brief » de la page ; « Relancer l'analyse » en redemande une nouvelle.
- Le texte apparaît progressivement, mis en forme (titres, listes, gras).
- L'analyse reçoit le titre, le mot-clé principal, les lieutenants, le lexique, la structure H1/H2/H3, l'angle éditorial de l'article, les questions « Autres questions posées » et les cinq premiers résultats de Google, et les titres des autres articles du cocon.
- Les données de Google portent sur le mot-clé de l'article (capitaine verrouillé, à défaut mot-clé suggéré), jamais sur le mot-clé pilier du cocon ; sans mot-clé, l'article n'en reçoit aucune. Un capitaine enregistré vide ne compte pas : l'analyse part alors sur le mot-clé suggéré, à défaut sur le titre.
- Une analyse refusée ou interrompue le dit dans le panneau (« L'analyse n'a pas abouti : … »), jamais en silence.
- L'analyse est enregistrée avec l'article : elle réapparaît à la réouverture, sans nouvel appel. « Relancer l'analyse » en demande une nouvelle. (Décision d'Arnaud du 2026-09-29 : ne pas repayer une analyse déjà obtenue.)

### FR-RED-IA-BRIEF — Panneau « IA Brief »
**Statut :** active
L'outil doit héberger l'analyse du brief dans un panneau dédié de la rédaction guidée, utilisable avant que l'article existe.
- Le bouton « IA Brief » n'existe que dans la rédaction guidée, pas dans l'éditeur.
- Il reste actif même quand l'article n'a pas encore de texte.
- Pendant l'analyse, le bouton « Relancer l'analyse » du panneau affiche « Analyse en cours... » et reste grisé ; le bouton « IA Brief » ne change pas.
- Sans analyse affichée, le panneau invite à cliquer sur « Relancer l'analyse ».

### FR-RED-OUTLINE — Le sommaire de l'article
**Statut :** non tenue (les boutons Annuler / Rétablir du sommaire ne s'activent jamais : les retouches ne sont pas enregistrées dans l'historique)
L'outil doit fournir à la rédaction un sommaire H1 / H2 / H3 tiré de la structure validée au Moteur, que l'utilisateur peut retoucher puis valider.
- Le sommaire reprend le H1 de la structure (à défaut le titre de l'article), ajoute une « Introduction » et une « Conclusion » sauf si la structure en porte déjà une, et garde les chapitres et sous-parties dans l'ordre ; aucun niveau au-delà de H3.
- Sans sommaire enregistré, l'écran le dit et renvoie au Moteur, même juste après un autre article (jamais le sommaire de celui-ci) ; l'écran ne génère pas de sommaire par IA (seul le mode automatique le fait, quand l'article n'a pas de structure).
- Avant validation, l'utilisateur peut renommer un titre, supprimer une section, ajouter un H2 ou un H3, réordonner les sections par glisser-déposer (sauf le H1).
- Le H1 reste en tête : une section lâchée sur lui se place juste après. Pendant qu'on renomme un titre, Échap rend le titre d'avant ; Entrée, ou un clic ailleurs, garde le nouveau.
- Annuler et Rétablir restaurent l'état précédent du sommaire après toute modification.
- « Valider le sommaire » enregistre le sommaire ; il survit à un rechargement et peut être rouvert (« Modifier le sommaire »).

### FR-RED-GEN-UNLOCK — L'étape « Article » attend un Cerveau complet
**Statut :** non tenue (seule la barre de navigation est verrouillée : « Valider le sommaire » et « Continuer vers l'Article » ouvrent l'étape Article sans vérifier le Cerveau)
L'outil doit empêcher de passer à l'étape « Article » de la rédaction guidée tant que le Cerveau du cocon n'est pas terminé (« Terminer le brainstorm »), à défaut une stratégie d'article complète.
- Tant que le Cerveau est incomplet, l'étape « Article » est verrouillée avec l'indication « Complétez le Cerveau pour générer cet article ».
- Le verrou se lève sans rechargement dès que la stratégie complète est chargée.
- Aucun geste de la page ne contourne le verrou.
- L'éditeur libre n'est pas concerné.

### FR-RED-DRAFT-SINGLE-PASS — Le premier jet s'écrit d'un seul tenant
**Statut :** active
L'outil doit rédiger l'article en un seul appel à l'IA qui voit tout le sommaire, puis juger ce premier jet par sa porte avant de l'accepter comme étape.
- Un seul appel, sans recherche web, qui reçoit le sommaire (chapitres, sous-parties, intentions), la longueur visée et la part de chaque chapitre, la stratégie de l'article (à défaut celle du cocon), les mots-clés, les règles du type d'article et l'état du cocon.
- La part de chaque chapitre : 15 % pour le premier, 10 % pour le dernier, le reste à parts égales ; deux chapitres se partagent 40 / 60 ; le chapeau compte dans le premier chapitre.
- La progression s'affiche chapitre par chapitre (« Section n/N » et son titre) et le texte apparaît au fil de l'écriture ; une réponse coupée au plafond reprend au début du chapitre interrompu, deux reprises au plus.
- Une fois le texte et la méta enregistrés, l'étape « premier jet accepté » est demandée à la porte ; un bandeau permet de la redemander (« Valider le premier jet »).
- Une panne arrête la rédaction avec un message, dans la rédaction guidée comme dans l'éditeur ; ce qui a déjà été enregistré au fil reste en base. L'échec de la méta, d'une réduction ou d'une humanisation s'affiche de même. Le message ne propose pas de relancer la rédaction : chaque geste se relance par son propre bouton.

### FR-RED-GEN-SAUVEGARDE-AU-FIL — Le texte en cours de rédaction est enregistré au fil
**Statut :** active
L'outil doit enregistrer le texte déjà écrit pendant la rédaction du premier jet, pour qu'un onglet fermé ou une connexion perdue ne fasse pas tout perdre.
- À la fin de chaque chapitre, le texte reçu jusque-là est enregistré, sans la méta.
- Une panne de cet enregistrement n'interrompt pas la rédaction.
- Le texte final, nettoyé, remplace ensuite ces enregistrements.

### FR-RED-DRAFT-TO-SOURCE — Le premier jet n'invente aucun chiffre
**Statut :** active
L'outil doit empêcher qu'un chiffre non garanti du premier jet soit présenté comme un fait.
- La consigne demande de poser un marqueur « [à sourcer : ce qu'il faudrait trouver] » à la place d'un chiffre non garanti.
- Toute phrase du premier jet qui porte un chiffre sans source (pourcentage, montant en euros, « n fois », millions, milliards) devient un passage « à sourcer » surligné ; titres, chiffres attribués (« selon », « d'après », « source : ») et nombres ordinaires ne changent pas.
- Le marqueur reste surligné dans l'éditeur, après sauvegarde et rechargement.
- Un chiffre sans source hors marqueur est 🔴, une alerte par phrase, à la porte du premier jet comme à la publication.

### FR-RED-ENRICH-PASSES — Enrichir l'article par passes successives
**Statut :** active
L'outil doit proposer, une fois le premier jet écrit, des passes qui enrichissent l'article chapitre par chapitre, chaque proposition vérifiée et soumise à l'accord de l'utilisateur.
- Six passes (Sources, Exemples, Tableaux, Images, FAQ, Résumer), lancées une à une, chacune visant seulement les chapitres où elle a un sens ; quand il n'y a rien à faire, le panneau le dit sans appeler l'IA. Exemples, Tableaux et Images visent le corps de l'article : ni le chapeau, ni un chapitre « Introduction », ni la FAQ, ni la conclusion.
- Chaque passe voit l'article entier (jusqu'à 30 000 caractères de texte) et la stratégie de l'article, à défaut celle du cocon.
- Chaque proposition est vérifiée : ⛔ la rend impossible à accepter (vide, coupée, titres modifiés, bloc ou lien perdu, tableau sans en-tête, image sans texte alternatif, FAQ mal formée). « Coupée » suit la règle de la publication : une proposition qui y serait refusée (bloc coupé en plein mot, texte hors paragraphe…) l'est dès l'acceptation.
- Rien ne change sans « Accepter » ; accepter remplace un seul chapitre (la FAQ s'insère avant la conclusion) et enregistre l'article ; un chapitre modifié depuis la proposition n'est jamais écrasé. Un chapitre seulement réaffiché par l'éditeur, sans changement de l'utilisateur, n'est pas « modifié depuis ».
- Une image proposée est une place « à fournir », que la publication refuse tant qu'elle n'est pas remplacée.

### FR-RED-ENRICH-SOURCES — Des sources françaises, datées, avec leur lien
**Statut :** active
L'outil doit remplacer les passages « à sourcer » par des données citées avec leur lien, trouvées par une recherche web localisée.
- La passe Sources ne vise que les chapitres qui portent un marqueur ou un chiffre sans source.
- La recherche part de France, à l'heure de Paris, depuis la ville de la zone du client quand elle est configurée ; la consigne donne la date du jour.
- Chaque lien absent des résultats réels de la recherche est retiré (texte gardé) et signalé 🔴 ; un marqueur qui reste est 🟠.
- Seul Claude fait la recherche : sans lui, la passe échoue avec le message du fournisseur ou « La recherche web exige Claude… », jamais un texte sans source d'un autre fournisseur.
- Les sources trouvées sont listées sous la proposition et s'ouvrent dans un nouvel onglet.

### FR-RED-REAL-CLAIMS-PROVEN — Tout chiffre ou exemple réel est prouvé
**Statut :** non tenue (« Statistique sourcée » fait écrire un chiffre attribué à une source sans aucune recherche, et le contrôle de publication le croit sourcé ; « Exemple PME » cite la stratégie d'une grande marque nommée sans rien vérifier)
Tout ce qui ajoute à un article un chiffre, une donnée ou un exemple présenté comme réel (entreprise, marque, étude, événement) doit venir d'une vraie recherche, avec le lien de sa source. Sinon, le passage est marqué « [à sourcer : …] » et la publication le signale. (Décision d'Arnaud du 2026-09-29 : « tout ce qui a pour but d'enrichir avec des exemples ou des chiffres réels doit être vérifié et sourcé, tout doit être prouvé ».)
- Une action ou une passe qui ajoute un chiffre ou un exemple réel cherche sur le web et garde le lien de chaque source ; un lien absent des résultats réels est retiré.
- Une source nommée sans lien ne suffit pas : pour le contrôle de publication, le chiffre reste « à sourcer ».
- Un exemple inventé pour illustrer est présenté comme tel (« imaginons… »), sans chiffre.

### FR-RED-SECTION-REWRITE — Réécrire un chapitre en voyant tout l'article
**Statut :** non tenue (le champ « Consigne » accepte plus de 600 caractères ; au-delà, la carte affiche un message technique en anglais au lieu de dire la limite)
L'outil doit réécrire un chapitre choisi selon une consigne libre, en voyant tout l'article, sous forme de proposition.
- L'utilisateur choisit un chapitre (le chapeau compris) et écrit une consigne de 5 à 600 caractères.
- La réécriture garde le titre du chapitre et, pour le chapeau, le H1 ; les sous-titres peuvent changer.
- La proposition est vérifiée comme celles des passes ; rien ne change avant « Accepter ».
- La consigne est traitée comme du texte : elle ne peut pas changer le rôle de l'IA.

### FR-RED-LANG-REVIEW — Relecture de la langue
**Statut :** active
L'outil doit corriger la langue de l'article section par section : phrases anglaises, anglicismes, accords, typographie française.
- La relecture se lance depuis le panneau « Enrichir » (« Relecture de la langue ») ou par « Humaniser l'article » : c'est la même opération.
- Elle ne touche ni aux chiffres, ni aux liens, ni aux marqueurs « à sourcer », ni à la structure.
- Le résultat s'applique directement et l'article est enregistré ; « Arrêter » rend l'article d'avant.

### FR-RED-HUMANIZE-SECTION — Atténuer les marqueurs d'écriture IA
**Statut :** non tenue (aucune note ne signale les sections revenues à leur texte d'origine ; le message « La structure de l'article a été altérée par l'humanisation. Retour à la version précédente. » ne s'affiche nulle part)
L'outil doit reformuler l'article section par section pour retirer les tics d'écriture d'IA sans casser sa structure.
- L'humanisation traite le chapeau puis chaque H2 l'un après l'autre, progression affichée.
- Une section dont la structure n'est pas préservée après deux essais reste telle qu'elle était, et l'écran le signale.
- « Annuler humanisation » rend l'article d'avant ; un article dont la structure globale aurait changé revient aussi à la version précédente, avec un message.
- Le résultat est enregistré aussitôt.

### FR-RED-REDUCE-SECTION — Réduire un article trop long
**Statut :** active
L'outil doit condenser un article qui dépasse sa longueur visée, section par section.
- « Réduire » n'est actif que si l'article dépasse la longueur visée de plus de 15 %.
- Chaque section (chapeau compris) reçoit une cible proportionnelle à son poids dans l'article ; la progression s'affiche.
- Une section en échec reste telle qu'elle était, sans être tronquée.
- « Annuler réduction » rend l'article d'avant, sections déjà réduites comprises.
- Le résultat est enregistré aussitôt.

### FR-RED-META — Titre et description pour Google
**Statut :** non tenue (la méta ne se modifie pas à la main et ne se relance pas seule : réessayer relance tout l'article)
L'outil doit générer, juste après le premier jet, le meta title et la meta description, bornés aux longueurs affichées par Google.
- La méta est générée sans second clic, après l'enregistrement du texte.
- Le meta title tient en 60 caractères, la description en 160 ; l'outil s'arrête à la dernière phrase complète ou au dernier mot, retire un mot orphelin final (« en », « de »), jamais de points de suspension.
- Si la méta échoue, le texte reste enregistré et l'utilisateur peut relancer la seule méta.
- La méta se modifie à la main.

### FR-RED-META-CAPTAIN — Méta, sommaire et premier jet portent le capitaine
**Statut :** active
L'outil doit construire la méta et le premier jet sur le capitaine verrouillé de l'article.
- La génération de la méta et du premier jet reçoit le capitaine de l'article ; le titre ne sert de repli qu'avant tout verrouillage.
- Un article intermédiaire ou spécialisé n'hérite jamais du mot-clé pilier de son cocon.
- La meta description n'est jamais coupée au milieu d'une phrase par des points de suspension.

### FR-RED-WORD-COUNT-TARGET — Une seule longueur visée
**Statut :** active
L'outil doit utiliser une même longueur visée pour l'affichage, la rédaction, la porte du premier jet, la réduction et le score SEO.
- La longueur visée est celle choisie pour l'article, sinon la recommandation (à défaut, la longueur type de l'article).
- Changer la longueur au brief est suivi aussitôt ; après le premier jet, l'écran garde la longueur réellement visée par la rédaction.
- La rédaction guidée affiche « N mots / cible » avec une jauge ; l'écart, quand l'article est trop long, apparaît sur le bouton « Réduire (-N mots) ».

### FR-RED-EDITOR-TIPTAP — L'éditeur de finalisation
**Statut :** active
L'outil doit offrir un éditeur de texte enrichi, en trois zones (introduction, corps, conclusion), qui garde le travail de l'utilisateur.
- Ouvrir un article, dans l'éditeur comme dans la rédaction guidée, n'affiche que son propre texte, sa méta et son sommaire, même sans rechargement de la page : rien de l'article ouvert avant ne reste à l'écran ni ne peut être enregistré dans celui-ci.
- « Supprimer le contenu » (après confirmation) efface en base le texte, la méta et les scores notés ; le brief et le sommaire restent. Le texte ne revient pas au rechargement ; un échec de la suppression le laisse à l'écran et le dit.
- Mise en forme : gras, italique, H2, H3, listes, citation, lien, annuler / rétablir ; les blocs spéciaux, liens internes, marqueurs « à sourcer », tableaux et images survivent à l'enregistrement et au rechargement.
- Un lien interne s'enregistre sans « nofollow » ni ouverture dans un nouvel onglet ; un clic sur un lien, dans l'éditeur, n'ouvre aucun onglet.
- Le bouton « Image » remplace l'image sélectionnée ou en insère une, par une adresse « https://… » ou « /… » et un texte alternatif obligatoires ; toute autre saisie est refusée avec un message.
- L'éditeur enregistre de lui-même toutes les 30 secondes s'il y a des modifications ; Ctrl+S et « Sauvegarder » enregistrent aussitôt.
- L'état d'enregistrement est visible : « Sauvegarde en cours... », « ✓ Sauvegardé … », « ⚠ Modifications non sauvegardées » (y compris après un échec).

### FR-RED-SEO-LIVE — Score SEO en direct
**Statut :** active
L'outil doit calculer en continu un score SEO sur 100 du texte, de la méta et des mots-clés de l'article, sans gêner la frappe.
- Le calcul suit chaque modification du texte, de la méta ou des mots-clés, après une pause de 300 ms, sans bloquer la saisie.
- Le score pondère six facteurs : densité du capitaine, densité des lieutenants, structure des titres, meta title, meta description, longueur au regard de la longueur visée.
- Le panneau affiche le score, le nombre de mots, et le détail : méta (longueurs et capitaine), structure, densités par mot-clé (capitaine, lieutenants, lexique), alertes, données de Google.
- Le contrôle « capitaine dans l'adresse de la page » lit le vrai slug de l'article.
- Tant que l'article n'a pas de texte, le bouton « SEO » est grisé avec une explication.

### FR-RED-GEO-LIVE — Score GEO en direct
**Statut :** active
L'outil doit calculer en continu un score GEO sur 100, qui mesure la facilité pour un moteur génératif (une IA qui répond aux questions) d'extraire et de citer l'article.
- Le score pondère quatre facteurs : extractibilité (paragraphes courts), titres formulés en questions, capsules de réponse, statistiques sourcées.
- Il suit chaque modification du texte, après une pause de 300 ms.
- Le panneau « GEO » détaille l'extractibilité et la lisibilité (paragraphes trop longs, jargon, questions, capsules, statistiques).
- Tant que l'article n'a pas de texte, le bouton « GEO » est grisé.

### FR-RED-SEO-SCORE-PERSIST — Le score enregistré est celui affiché pour ce texte
**Statut :** non tenue (un premier jet interrompu enregistre le texte sans remettre les scores à « inconnu » : l'ancien score reste en base, à l'écran comme en mode automatique)
L'outil doit enregistrer les scores SEO et GEO avec le texte qu'ils notent, et jamais un score d'une autre version.
- Le score SEO note texte, meta title et meta description ; le score GEO, le texte seul.
- Un score calculé sur une autre version du texte n'est jamais enregistré : la base porte « inconnu », affiché « — ».
- Un score n'est jamais enregistré dans un autre article que celui dont il a noté le texte avec les mots-clés : passer d'un article à l'autre sans recharger n'écrit rien dans le précédent.
- Un score calculé juste après une sauvegarde, sur le texte enregistré, part aussitôt, seul ; le même score n'est pas renvoyé deux fois.
- À l'ouverture d'un article dans la rédaction guidée, le score recalculé sur le texte intact rejoint la base.
- L'audit du projet affiche les scores enregistrés, « — » quand ils sont inconnus.

### FR-RED-CONTEXTUAL-ACTIONS — Actions IA sur une sélection
**Statut :** non tenue (l'éditeur n'envoie pas le mot-clé de l'article : « Optimiser mot-clé » et les autres actions travaillent sans lui ; les blocs « Sources chiffrées » et « Exemples réels » retirent les liens absents de la recherche sans dire combien ; l'échec d'une action s'affiche sous l'éditeur, caché par le voile ; « Convertir en liste » montre ses balises dans la fenêtre de résultat)
L'outil doit proposer, sur une sélection de texte dans l'éditeur, des actions IA dont le résultat remplace la sélection seulement si l'utilisateur l'accepte.
- La mini-barre de sélection ouvre un menu de huit actions IA (« Reformuler », « Simplifier », « Convertir en liste », « Exemple PME », « Optimiser mot-clé », « Statistique sourcée », « Answer Capsule », « Formuler en question ») et « Lien interne ».
- Trois autres actions (« Sources chiffrées », « Exemples réels », « Ce qu'il faut retenir ») se posent comme blocs glissés depuis le panneau « Blocs ».
- Dans le panneau « Blocs », chaque bloc a une icône qui lui correspond : « Titre H2 » montre « H2 », « Titre H3 » montre « H3 ».
- Chaque action reçoit le mot-clé principal de l'article.
- « Sources chiffrées » et « Exemples réels » cherchent sur le web (France, heure de Paris, ville du client), avec Claude seulement ; leurs liens absents des résultats sont retirés avant l'affichage, et le nombre de liens retirés est dit.
- Une réponse coupée avant la fin n'est pas proposée ; « Accepter » reste grisé sans résultat ; « Rejeter » garde la sélection intacte.

### FR-RED-LINKING-MANUAL — Le maillage interne se pose à la main
**Statut :** non tenue (dans la rédaction guidée, « Appliquer » une suggestion ne fait rien ; dans l'éditeur, l'ancre n'est cherchée que dans la zone active : ailleurs, « Appliquer » ne fait rien, sans message, et la suggestion reste affichée)
L'outil doit proposer des liens internes qui suivent l'arbre du cocon, que l'utilisateur applique ou rejette, et tenir le réseau de liens à jour avec le texte.
- Le panneau « Maillage » propose d'abord la famille (enfants pour un parent, parent pour un enfant), même non publiée, en le disant ; puis les autres articles déjà rédigés dont le titre recoupe le texte, dans le respect de la hiérarchie ; dix suggestions au plus, sans reproposer un article déjà relié.
- L'ancre proposée existe telle quelle dans le texte (deux mots au moins du titre de la cible, sans mot vide aux bords), à défaut le mot-clé de la cible.
- « Appliquer » pose le lien dans le texte et l'enregistre dans le réseau de liens du cocon ; le lien posé par l'action « Lien interne » est le même.
- Chaque enregistrement du texte retire du réseau les liens qui n'y figurent plus.
- À la publication, chaque lien vers un article pas encore publié est 🟠.

### FR-RED-PANELS-LAYOUT — Barre de panneaux et zone latérale redimensionnable
**Statut :** active
L'outil doit donner accès, à côté du texte, à des panneaux d'analyse exclusifs dans une zone redimensionnable.
- Les deux vues ont « SEO », « GEO », « Maillage » et « Enrichir » ; l'éditeur ajoute « Blocs », la rédaction guidée ajoute « IA Brief ».
- Un seul panneau à la fois ; recliquer le bouton actif ferme le panneau ; Échap aussi.
- Sans texte, tous les boutons sauf « IA Brief » sont grisés avec une explication.
- La largeur de la zone se règle à la souris (240 px au moins) et reste mémorisée par le navigateur.

### FR-RED-PROGRESS — La phase de l'article suit les événements réels
**Statut :** non tenue (rouvrir la rédaction guidée d'un article déjà rédigé ramène toujours à « Brief & Structure »)
L'outil doit tenir la phase de chaque article dans un ensemble fermé qui n'avance qu'avec des événements réels et ne recule jamais.
- Les phases sont : proposé, Moteur, rédaction, publié.
- Un texte non vide enregistré fait passer l'article en rédaction ; la publication le fait passer en publié.
- La phase ne recule jamais.
- La phase est enregistrée et survit aux rechargements.
- Rouvrir la rédaction d'un article dont le texte existe mène à l'étape Article, pas à « Brief & Structure ».

### FR-RED-PUBLISH-GATE — On ne publie pas un article qu'un expert refuserait
**Statut :** active
L'outil doit faire passer toute publication par une porte qui rejoue les contrôles du texte, de la méta, du SEO et des étapes amont, avant de marquer l'article publié et de produire le fichier.
- ⛔ : défauts du texte (vide, bloc coupé, IA qui parle d'elle-même, texte hors paragraphe, restes de mise en forme, balise interdite, titre vide, saut de niveau, plusieurs H1), méta absente, trop longue ou coupée, image encore « à fournir ». Le libellé d'une cellule de tableau sans point final n'est pas un bloc coupé.
- 🔴 : capitaine absent en entier du H1 ou du meta title, autres écarts SEO, texte au-delà du plafond de son type (3 500 / 2 500 / 1 500 mots), passages « à sourcer » restants, chaque chiffre sans source, phrase non française (courte comprise) ou paragraphe répété, section dont est né un enfant de plus de 250 mots.
- 🟠 : autres avertissements, section dont est né un enfant disparue, lien vers un article non publié, chaque dérogation encore valable des portes capitaine, lieutenants, structure et lexique, à reconfirmer ; un point du texte dérogé au premier jet (même extrait) n'est pas redemandé en 🔴 : sa dérogation revient en 🟠, à relire. Chaque dérogation réaffichée dit le point en clair et la raison donnée (ou qu'elle a été lue, pour un 🟠), jamais le nom interne d'une règle.
- Les portes capitaine, lieutenants, structure et lexique sont rejouées sur les données du jour ; la porte du premier jet ne l'est pas.
- Refusée, la publication ne marque rien et ne télécharge rien, et l'écran le dit ; après dérogation, elle reprend d'elle-même. Les autres changements de statut ne sont pas contrôlés.

### FR-RED-EXPORT-HTML — Aperçu et fichier HTML de l'article
**Statut :** active
L'outil doit produire un aperçu fidèle de la page publiée et, une fois la porte passée, le fichier HTML à publier.
- L'aperçu s'ouvre depuis l'éditeur (« Visualiser l'article ») dès que le texte, le meta title et la meta description existent.
- Le fichier contient la méta, les données structurées de l'article, un sommaire, et un seul H1.
- Les liens internes vers un article rédigé pointent vers son adresse de blog, sans « nofollow » ni nouvel onglet ; les autres sont retirés, leur texte gardé. L'aperçu montre les mêmes liens.
- Le H1 publié est celui que la porte de publication a jugé.
- Le fichier téléchargé est le texte que la porte vient de juger, même si l'aperçu n'a pas été rechargé depuis une correction ; l'aperçu se recharge ensuite.

### Retirées (FR-RED)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-RED-ARTICLE | superseded (génération section par section) | FR-RED-DRAFT-SINGLE-PASS |
| FR-RED-INTERNAL-LINKING | superseded (suggestions de liens « par IA ») | FR-RED-LINKING-MANUAL |
| FR-RED-CHECKS | retirée (cinq étapes `redaction:*` cochées à la main) | FR-RED-PROGRESS ; seule l'étape « premier jet accepté » subsiste (FR-RED-DRAFT-SINGLE-PASS, FR-CER-PARENT-WRITTEN-GATE) |

---

## 15. Labo (FR-LAB)

Le Labo était une page de recherche libre de mots-clés, hors du parcours d'un article. Il a été retiré du produit.

### Retirées (FR-LAB)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-LAB-ACCESS | deprecated (page Labo retirée) | — |
| FR-LAB-MODE-LIBRE | deprecated (composants du Moteur en mode libre) | — |
| FR-LAB-VERDICT-DEFAULT | deprecated (seuils par défaut en mode libre) | — |
| FR-LAB-TABS | deprecated (onglets du Labo) | — |

---

## 16. Explorateur (FR-EXP)

L'Explorateur était une page d'analyse de mots-clés hors parcours. Il a été retiré ; seule l'analyse d'écart de contenu vit encore dans le code.

### FR-EXP-CONTENT-GAP — Analyse des thèmes que traitent les concurrents
**Statut :** non tenue (aucun écran actif ne lance l'analyse : son seul panneau n'est monté que par un composant qui n'est plus affiché)
L'outil doit analyser les pages concurrentes d'un mot-clé et dire quels thèmes fréquents l'article ne traite pas encore.
- L'analyse d'un mot-clé lit les cinq premières pages concurrentes et en tire leurs thèmes, leur fréquence et leur longueur moyenne.
- Un thème traité par au moins trois concurrents et absent de l'article est un écart.
- L'analyse d'un mot-clé est partagée entre articles et réutilisée tant qu'elle est fraîche ; sa longueur moyenne nourrit la recommandation de longueur.
- Un écran du parcours permet de lancer l'analyse et d'en lire les écarts.

### Retirées (FR-EXP)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-EXP-INTENT-ANALYZE | deprecated (analyse d'intention à la demande) | scan d'intention du Radar (§ 8. Moteur — Radar (FR-RAD)) |
| FR-EXP-AUTOCOMPLETE | deprecated (autocomplétion à la demande) | — |
| FR-EXP-LOCAL-COMPARE | deprecated (comparaison locale / nationale) | — |
| FR-EXP-MAPS | deprecated (résultats Google Maps) | — |
| FR-EXP-AUDIT | deprecated (audit de tous les mots-clés d'un cocon) | — |

---

## 17. Intégrations externes (EXT)

Ce domaine couvre les services tiers dont l'outil dépend : les données de marché Google (DataForSEO), l'autocomplétion Google, la recherche de pages concurrentes (Tavily), Google Search Console, les fournisseurs d'IA (Claude, Gemini, OpenRouter, simulation) et le modèle local de similarité de sens. Il fixe ce que l'utilisateur attend d'eux : un coût maîtrisé, un mode simulé gratuit, des pannes lisibles.

### FR-EXT-DATAFORSEO — Données de marché Google via DataForSEO
**Statut :** non tenue (les mesures demandées en groupe et la fiche SEO du brief taisent un échec du fournisseur, y compris un refus du plafond de dépense : les valeurs restent vides, sans message ; un « Rafraîchir » qui échoue tout à fait remplace toute la page de rédaction par le bloc d'erreur, au lieu du seul panneau « SERP Data »)
L'outil doit fournir, pour un mot-clé, les données de marché de Google (volume mensuel, coût par clic, difficulté, concurrence, intention, dix premiers résultats, questions « Autres questions posées », dites PAA), en réutilisant une réponse déjà obtenue plutôt qu'en la repayant.
- Un mot-clé mesuré depuis moins de 7 jours est resservi depuis la base, sans nouvel appel.
- Le panneau SEO de la rédaction propose « Rafraîchir » (ou « Lancer l'analyse SERP » s'il est vide), qui ignore la base et relance la mesure.
- Un quota DataForSEO épuisé (limite de débit répétée) produit le message « Quota DataForSEO atteint. Rechargez vos crédits puis relancez. ».
- Une limite de débit est retentée jusqu'à 3 fois avec une attente croissante ; une erreur interne du fournisseur n'est retentée qu'une fois.
- Une mesure absente d'un mot-clé reste absente (« — »), jamais 0.

### FR-EXT-DATAFORSEO-COSTGUARD — Plafond de dépense DataForSEO
**Statut :** non tenue (le plafond affiché est arrondi au centime, dans le refus comme dans la pile d'activité : un plafond de 0,025 $ s'écrit « $0.03 »)
L'outil doit refuser, avant de l'émettre, tout appel DataForSEO payant qui ferait dépasser un plafond de dépense sur une fenêtre glissante, et dire pourquoi.
- Par défaut : 0,50 $ sur 30 minutes ; plafond et fenêtre se règlent dans la configuration, sans toucher au code.
- Le refus porte un code d'erreur dédié et le message « Plafond de dépense DataForSEO atteint (dépensé / plafond sur N min) ».
- La dépense estimée de la fenêtre et le plafond sont visibles dans la pile d'activité, avec une barre qui passe en alerte au-delà de 80 %.
- Le coût est compté dès la réservation, même si l'appel échoue ensuite ; en bac à sable, rien n'est compté.
- La fenêtre écoulée, les appels repassent sans intervention.

### FR-EXT-DATAFORSEO-SANDBOX — Bac à sable DataForSEO
**Statut :** non tenue (les réponses du bac à sable sont gardées comme de vraies réponses : en réel, un mot-clé mesuré en simulé depuis moins de 7 jours affiche des chiffres factices, et les questions PAA, longues traînes et mots-clés de Discovery obtenus en simulé sont resservis)
L'outil doit pouvoir interroger le bac à sable gratuit de DataForSEO (données factices de même forme) au lieu de la production payante.
- Le bac à sable n'est jamais déduit de l'environnement : il s'active explicitement, par la configuration ou par le mode simulé.
- La pile d'activité indique « SANDBOX » ou « PROD » à côté de la dépense DataForSEO.
- Les mesures demandées en groupe sont rattachées, dans l'ordre, aux mots-clés demandés, pour que chacun reçoive une mesure.
- Le bac à sable exige lui aussi de vrais identifiants DataForSEO.

### FR-EXT-GSC-OAUTH — Connexion à Google Search Console
**Statut :** non tenue (un accès révoqué n'est pas détecté : le statut reste « connecté », et l'erreur affichée ne propose pas de refaire la connexion ; sans identifiants Google dans la configuration, « Connecter Google Search Console » ouvre un onglet qui affiche une erreur technique brute en anglais)
L'outil doit permettre de connecter un compte Google Search Console en lecture seule, garder l'accès entre les sessions et le renouveler seul.
- « Connecter Google Search Console » ouvre la page d'autorisation Google dans un nouvel onglet ; l'accès demandé est en lecture seule.
- L'accès est conservé entre deux démarrages et renouvelé automatiquement moins d'une minute avant son expiration.
- « Vérifier la connexion » relit l'état ; l'écran de données n'apparaît qu'une fois connecté.
- Un renouvellement refusé doit être signalé avec une invitation à se reconnecter.

### FR-EXT-GSC-PERFORMANCE — Performances réelles d'un site
**Statut :** active
L'outil doit afficher les performances réelles d'une propriété Search Console (clics, impressions, taux de clic, position moyenne) sur une période choisie.
- Périodes proposées : 7, 30 ou 90 derniers jours.
- La propriété saisie est mémorisée dans le navigateur, et les données se chargent seules à l'ouverture si elle est connue.
- Les résultats sont regroupés par page et triés par clics décroissants.
- Une même demande refaite le même jour est servie depuis le cache, sans appel à Google.

### FR-EXT-GSC-KEYWORD-GAP — Mots-clés visés contre mots-clés réellement indexés
**Statut :** prévue, non livrée (le calcul existe côté serveur, aucun écran ne le propose)
L'outil doit comparer, pour un article publié, les mots-clés visés et ceux sur lesquels Google l'affiche réellement.
- Trois listes : visés et présents (position, clics, impressions), visés mais absents, présents mais non visés.
- Fenêtre des 90 derniers jours.
- Un mot-clé compte comme présent dès que Google le rapporte pour la page.

### FR-EXT-AI-MULTI-PROVIDER — Choix du fournisseur d'IA
**Statut :** active
L'outil doit faire passer toute demande d'IA par un point unique qui choisit le fournisseur : Claude, Gemini, OpenRouter (modèles gratuits seulement) ou une simulation locale.
- Le fournisseur par défaut se règle dans la configuration (Claude si rien n'est dit).
- Le bouton « MOCK / RÉEL » de la barre de navigation bascule à chaud : « MOCK » impose la simulation, « RÉEL » impose Claude, quel que soit le réglage.
- En simulation, aucune demande d'IA ne quitte la machine ; les réponses viennent de jeux d'exemples et coûtent 0.
- Chaque réponse porte le modèle qui a réellement répondu et son coût estimé, repris dans la pile d'activité.

### FR-EXT-AI-FALLBACK — Bascule entre fournisseurs d'IA
**Statut :** non tenue (la bascule n'est écrite que dans le journal du serveur ; la pile d'activité montre seulement le modèle qui a répondu ; un fournisseur de secours sans clé configurée arrête la chaîne au lieu de passer au suivant, et l'utilisateur lit un message technique en anglais à la place de la vraie cause)
L'outil doit, quand un fournisseur est saturé ou inutilisable, retenter puis passer au suivant, sans masquer les autres erreurs, et le faire savoir.
- Une erreur de quota, de surcharge ou de serveur est retentée jusqu'à 2 fois (après 1 s puis 2 s).
- Quota épuisé, surcharge ou fournisseur inutilisable (modèle retiré, clé refusée) font passer au suivant : le principal, puis Claude, Gemini, OpenRouter.
- Toute autre erreur remonte telle quelle ; un réglage désactive la chaîne ; la simulation n'a jamais de repli.
- Une demande avec recherche web n'essaie que Claude (la simulation en mode simulé) ; à défaut, elle échoue avec « La recherche web exige Claude… ».
- Un texte déjà commencé n'est jamais repris par un autre fournisseur.

### FR-EXT-CLAUDE — Claude, fournisseur principal
**Statut :** active
L'outil doit utiliser Claude comme fournisseur principal, avec un modèle réglable et un coût calculé à chaque appel.
- Le modèle des textes écrits au fil de l'eau se règle dans la configuration (Sonnet 4.6 par défaut).
- Les réponses structurées (classements, analyses) obligent Claude à remplir un schéma ; elles utilisent Haiku 4.5, sauf si la fonction demande un autre modèle.
- Le coût suit le tarif du modèle (lecture du cache de prompt −90 %, écriture +25 %) et s'affiche en dollars ; un modèle inconnu est compté au tarif de Sonnet.
- Crédits épuisés : la demande passe au fournisseur suivant ; une recherche web, réservée à Claude, échoue avec « Quota Claude atteint ou crédits Anthropic insuffisants ».

### FR-EXT-GEMINI — Gemini, fournisseur gratuit
**Statut :** non tenue (le modèle par défaut, Gemini 2.0 Flash, n'est plus servi par Google : sans réglage, Gemini échoue et la chaîne passe à OpenRouter)
L'outil doit pouvoir utiliser Gemini, gratuit sur ses modèles Flash, avec un modèle réglable.
- Modèles connus : 2.0 Flash et 2.0 Flash Lite (coût 0), 2.5 Flash et 2.5 Pro (payants).
- Les réponses structurées sont demandées en JSON natif ; un JSON invalide produit une erreur claire, sans bascule.
- Une limite de débit atteinte fait basculer vers le fournisseur suivant, sans bloquer l'utilisateur.

### FR-EXT-EMBEDDINGS — Similarité de sens calculée en local
**Statut :** active
L'outil doit mesurer la proximité de sens entre un sujet et des textes avec un modèle multilingue exécuté sur le serveur, sans fournisseur payant.
- Le modèle se charge au premier usage (attente de 60 s au plus), puis reste en mémoire jusqu'au redémarrage.
- Le calcul est local et gratuit ; seul le premier chargement télécharge le modèle.
- Si le modèle ne charge pas, la mesure vaut « indisponible » pour toute la session, sans faire échouer l'écran.
- Le français est pris en charge.

### FR-EXT-AUTOCOMPLETE-GOOGLE — Suggestions de l'autocomplétion Google
**Statut :** active
L'outil doit lire les suggestions que Google propose pendant la saisie d'un mot-clé, gratuitement et sans se faire bloquer.
- L'outil renvoie la liste et indique si le mot-clé figure dans ses propres suggestions, et à quel rang.
- Refus ou délai (3 s) : liste vide, sans erreur ; un seul nouvel essai après 1,5 s si Google limite le débit.
- Au plus une demande par seconde pour tout le serveur.
- Une liste est réutilisée 24 h, une liste vide 30 min.

### FR-EXT-TAVILY — Pages concurrentes via Tavily
**Statut :** active
L'outil doit récupérer les pages concurrentes d'un mot-clé auprès du moteur de recherche Tavily pour l'analyse d'écart de contenu (qu'aucun écran ne lance aujourd'hui, cf. FR-EXP-CONTENT-GAP).
- Recherche approfondie, 5 pages au plus.
- Une analyse de moins de 7 jours est resservie depuis la base, sans nouvel appel.
- Sans clé Tavily configurée, l'analyse échoue avec un message qui le dit.
- Tavily n'est pas couvert par le mode simulé : il est interrogé même en « MOCK ».

### FR-EXT-TESTS-NO-COST — Des tests qui ne paient pas sans le demander
**Statut :** active
Les suites de tests doivent tourner sur des sources gratuites (IA simulée, DataForSEO en bac à sable), sauf demande explicite d'un passage réel.
- En intégration continue, la configuration impose l'IA simulée et le bac à sable ; sans identifiants DataForSEO, les tests qui mesurent un mot-clé se déclarent ignorés.
- En local, la suite bascule le serveur en simulé au démarrage et rétablit son réglage d'origine à la fin.
- Un serveur forcé en réel par quelqu'un d'autre n'est jamais basculé : les tests le traitent comme indisponible.
- On ne paie que sur demande : drapeau « tests réels », drapeau « parcours réel » (parcours navigateur de bout en bout) ou mode automatique lancé en réel.

### Retirées (EXT)

| ID | Statut | Remplacée par |
|---|---|---|
| — | — | Aucune exigence FR-EXT retirée. |

---

## 18. Composants d'interface partagés (UI)

Ce domaine garantit qu'une brique d'écran utilisée à plusieurs endroits garde partout la même apparence et le même comportement. Les exigences métier de chaque onglet vivent dans leurs domaines ; celles-ci ne portent que sur le partage.

### FR-UI-RADAR-CARD — Une seule carte de mot-clé pour le Radar et le Capitaine
**Statut :** active
L'outil doit afficher les mots-clés du Radar et du Capitaine avec une seule et même carte, dont seuls le score affiché et le geste de sélection changent selon l'endroit.
- Trois usages : résultats de scan de l'onglet Radar (case à cocher, « Score KPI »), liste du Capitaine (cadenas, « Score Pertinence »), fiche du Capitaine en mode libre (« Score Pertinence » ; aucun écran ne l'affiche aujourd'hui).
- Même en-tête partout : mot-clé, pictogrammes d'intention, ligne « vol · KD · CPC · PAA », anneau de score avec son détail, chevron qui déplie les questions PAA en arbre.
- Chaque pictogramme d'intention est dessiné, jamais une place vide, et nomme son intention au survol.
- Un score absent s'affiche « — » avec sa raison, jamais 0.
- Une modification de la carte vaut pour tous les usages : la carte n'est copiée nulle part.

### FR-UI-AI-PANELS-PATTERN — Des panneaux d'IA qui se ressemblent et restent en place
**Statut :** non tenue (le panneau du Lexique n'apparaît qu'après le calcul TF-IDF, celui des Lieutenants qu'après l'analyse des résultats Google, et le panneau « Analyse IA du Brief » de la rédaction n'a ni la structure commune ni d'état « erreur » ; le panneau « Suggestions IA Lieutenants » a sa propre structure, et « Régénérer les suggestions » relance l'appel payant sans confirmation)
L'outil doit présenter chaque assistance IA dans un panneau de même structure (titre, sous-titre, état, bouton de lancement puis de régénération, zone de résultat), présent dès l'arrivée sur l'onglet.
- Quatre états : au repos, en cours, résultat, erreur lisible.
- Préalable manquant : bouton désactivé et phrase d'invitation, jamais de panneau qui disparaît.
- Régénérer un résultat payant demande une confirmation (« … Cela consommera un appel Claude. »).
- Un panneau replié s'ouvre de lui-même pendant l'analyse ou en cas d'erreur.
- L'avis du Capitaine suit la carte choisie : son panneau apparaît avec la fiche de la carte sélectionnée.

### FR-UI-ARTICLE-SHARED — Mêmes briques pour la rédaction guidée et l'éditeur libre
**Statut :** active
L'outil doit construire la vue de rédaction guidée et l'éditeur libre avec les mêmes briques et la même génération d'article, sans copie.
- Communs aux deux vues : les boutons « SEO », « GEO », « Maillage », « Enrichir », la zone de panneaux redimensionnable, la barre de progression des sections, la génération du premier jet.
- Propres à une vue : « Blocs » et les messages d'action pour l'éditeur ; « IA Brief », les badges de coût et le compteur de mots pour la vue guidée.
- Les boutons de panneaux restent grisés tant que l'article n'a pas de texte (« IA Brief » excepté).
- Une brique partagée modifiée change dans les deux vues.

### FR-UI-MOTEUR-SHARED — Briques communes du Moteur
**Statut :** active
L'outil doit afficher dans le Moteur des briques communes, montées une seule fois au-dessus des onglets, identiques quel que soit l'onglet.
- Récapitulatif du cocon (articles suggérés et publiés) avec, pour chaque article, 6 points de progression en deux groupes : « Explorer » (Discovery, Radar) et « Valider » (Capitaine, Lieutenants, Structure, Lexique).
- Panneau « Résultats déjà calculés » collé en bas : une pastille par onglet (Radar, Capitaine, Lieutenants, Lexique) avec ses compteurs « DB » et « C », et « Vider le cache » quand un scan Radar non sauvegardé est en mémoire (cf. FR-MOT-EXTERNAL-CACHE-CLEAR).
- Invitation « Charger <onglet> » à chaque visite d'un de ces onglets qui a des données, avec un bouton par source ; la fermer ne vaut que pour la visite.
- Le panneau « Résultats déjà calculés » garde la même place et la même hauteur sur tous les onglets : l'invitation se pose à sa droite (au-dessus sur un écran étroit) sans le déplacer ni le faire passer sur deux lignes.
- Panneau de suggestions de mots-clés partagé par les Lieutenants et le Lexique, masqué quand il n'a rien à proposer.

### Retirées (UI)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-UI-MOTEUR-SHARED (critère « bannière de transition Phase ② → ③ ») | retiré | Bouton « Continuer vers … » en bas d'onglet (§ 6, FR-MOT-PHASE-TRANSITION) |

---

## 19. Infrastructure transversale (FR-INFRA)

Ce domaine regroupe les garanties que l'utilisateur ne voit pas directement mais qui rendent l'outil fiable : ne pas payer deux fois la même question à un service externe, retrouver son travail d'une session à l'autre, ne jamais afficher un `0` quand la donnée manque, donner à l'IA des consignes justes et complètes, et juger la qualité aux étapes clés du parcours (les portes) avec la possibilité de passer outre par écrit. Les portes telles que la Rédaction les vit (premier jet, publication) sont décrites au § 14. Rédaction (FR-RED).

### FR-INFRA-API-CACHE — Cache court des appels externes
**Statut :** active
Quand l'utilisateur déclenche une action qui interroge un service externe payant ou lent, l'outil doit garder la réponse pour une durée propre à chaque type d'appel et la resservir sans nouvel appel tant qu'elle est valide. Ce cache est partagé entre tous les articles.
- Un même appel, sur le même mot-clé, dans la durée de validité, ne déclenche aucun nouvel appel externe.
- Une réponse expirée n'est jamais resservie, même si elle est encore stockée.
- Un geste « Rafraîchir » explicite (brief DataForSEO, découverte) ignore le cache et refait l'appel.
- Une réponse obtenue pour l'article A sert à l'article B quand l'appel est le même.

### FR-INFRA-API-CACHE-PURGE — Nettoyage automatique du cache court
**Statut :** active
Le cache court ne doit pas grossir sans limite : les réponses expirées sont supprimées en tâche de fond, toutes les heures.
- Une réponse expirée depuis plus d'une heure (serveur allumé) a disparu du stockage.
- La purge ne bloque aucune action de l'utilisateur ; son échec est journalisé sans effet visible.

### FR-INFRA-KEYWORD-METRICS — Mémoire permanente des mesures d'un mot-clé
**Statut :** non tenue (tant que DataForSEO ne renvoie ni difficulté ni coût par clic pour un mot-clé, chaque étude le remesure, et le repaie ; le scan Radar ne relit ni n'enregistre les mesures gardées, et chaque test au Capitaine relance ce scan pour sa carte ; un « Rafraîchir » raté date quand même la mesure du jour, et pour un mot-clé sans volume connu la fiche vide remplace la réponse gardée)
Les mesures de marché d'un mot-clé (volume, difficulté, CPC, concurrence, intention, suggestions Google, questions PAA) doivent être gardées de façon permanente et partagées entre tous les articles et cocons. Au-delà de 7 jours, elles sont considérées comme anciennes et remesurées au prochain besoin.
- Un mot-clé mesuré il y a moins de 7 jours n'est pas remesuré.
- Une nouvelle mesure partielle n'efface jamais une valeur connue par « absent ».
- Un mot-clé mesuré depuis le cocon A est immédiatement disponible dans le cocon B.

### FR-INFRA-PAA-CACHE — Mémoire des questions « People Also Ask »
**Statut :** active
Les questions PAA d'un mot-clé ne dépendent que de la recherche Google : l'outil doit les garder par mot-clé, sans lien avec un article, et les resservir sans appel externe pendant un jour.
- Des PAA récupérées il y a moins d'un jour, à la profondeur demandée, sont resservies sans appel.
- Une demande plus profonde que ce qui est gardé déclenche un nouvel appel.
- Une liste vide n'est pas gardée : la demande suivante interroge de nouveau Google.

### FR-INFRA-GET-OR-FETCH — Consulter le cache avant tout appel externe
**Statut :** active
Tout service qui interroge une source externe payante doit d'abord regarder ce qui est déjà stocké, et n'appeler la source qu'en cas d'absence ou d'expiration, puis stocker la réponse.
- Les appels externes mis en cache passent par une seule mécanique « lire, sinon appeler puis écrire ».
- Deux clics identiques successifs ne produisent qu'un seul appel facturé.

### FR-INFRA-API-WRAPPER — Un seul point d'entrée pour les appels de l'écran vers le serveur
**Statut :** active
Tous les appels de l'interface vers le serveur de l'outil doivent passer par un point d'entrée unique, qui traite les erreurs de la même façon partout et alimente la pile d'activité (coûts IA, opérations en base).
- Aucun écran ne contacte le serveur par un autre chemin.
- Une erreur connue (quota DataForSEO, quota IA, IA surchargée) ajoute à la pile d'activité un message lisible avec la marche à suivre, jamais une trace technique.
- Le coût d'un appel IA non diffusé en continu entre dans la pile dès la réponse.
- Un refus de porte arrive à l'écran avec le détail complet de l'évaluation.

### FR-INFRA-API-STREAM — Texte de l'IA affiché au fil de l'eau
**Statut :** non tenue (quand l'utilisateur annule, l'écran s'arrête mais le serveur continue la génération jusqu'au bout et la facture ; un rechargement de la page pendant le premier jet fait aussi payer un texte dont la suite n'est plus enregistrée)
Les générations longues (premier jet, sommaire, panneaux d'avis IA, actions contextuelles) doivent s'afficher au fil de l'eau, avec les mêmes garanties que les autres appels : erreurs lisibles, coût dans la pile, annulation propre.
- Toutes les générations au fil de l'eau passent par le même point d'entrée de l'interface.
- Le coût final d'une génération entre dans la pile d'activité à la fin du flux.
- Une annulation par l'utilisateur arrête l'affichage sans message d'erreur.
- Une annulation arrête aussi la génération côté serveur.

### FR-INFRA-ZOD-SHARED — Contrats d'échange validés des deux côtés
**Statut :** non tenue (25 lectures de corps de requête sans schéma, dans 7 groupes de routes : mots-clés, panneaux IA du Moteur, scan, analyse SERP, silos, explication du brief, micro-contexte suggéré)
Toute donnée envoyée par l'écran au serveur doit être validée par une définition partagée entre les deux côtés ; une requête mal formée est refusée explicitement.
- Chaque requête qui porte un corps est validée par un schéma partagé avant tout traitement.
- Une requête mal formée reçoit un refus 400 avec un message lisible, jamais une erreur 500.

### FR-INFRA-PROMPT-LOADER — Consignes d'IA sans logique et injection sûre
**Statut :** active
Les consignes envoyées à l'IA doivent rester des textes sans logique, complétés au moment de l'appel ; le texte fourni par l'utilisateur doit y entrer tel quel, sans pouvoir détourner la consigne.
- La seule logique permise dans une consigne est d'afficher ou non un bloc selon qu'une valeur est vide ; un bloc vide disparaît avec son titre.
- Une information attendue par une consigne et absente, ou fournie et inutilisée, est une erreur qui arrête l'appel hors production ; en production, l'écart est journalisé et l'appel continue.
- Un texte inséré n'est jamais relu : une suite `{{…}}`, `$1` ou `$&` qu'il contient reste du texte.
- Le texte d'un article, d'une section, d'un chapitre, d'une sélection ou d'une consigne libre de l'utilisateur est neutralisé (séquences d'instruction, balises système, accolades) et encadré avant d'entrer dans la consigne.

### FR-INFRA-PROMPT-LAYERS — Consignes organisées en couches, sans rien d'écrit en dur
**Statut :** non tenue (plusieurs consignes d'IA sont encore écrites dans le code et échappent aux couches, au contrôle des variables et à la référence des consignes : tri de pertinence et analyse stratégique de Discovery, classement du Radar, analyse d'écart de contenu, recommandation de longueur, consigne du juge des questions PAA ; la régénération du titre et du mot-clé d'une ligne de la carte écrit ses règles par niveau dans le code, et ne les envoie jamais)
Chaque consigne d'IA doit suivre les mêmes cinq couches (identité, contexte, règles du type d'article, tâche, contrat de sortie) et tirer du contexte tout ce qui dépend du client ou du moment.
- Aucune année ni aucun lieu n'est écrit dans les consignes : la date du jour, l'année, la zone du client et ses repères locaux viennent du contexte.
- Les repères locaux ne sont proposés que s'ils décrivent la zone du client ; sinon aucun repère. Les entreprises du référentiel ne sont jamais proposées.
- Les exemples des consignes sont fictifs, pris dans un autre métier, avec « [ville] » à la place du lieu, et la consigne interdit de les recopier.
- La stratégie validée du cocon arrive une seule fois dans une consigne.
- L'inventaire des consignes (informations attendues, blocs facultatifs, appelants) est produit à partir des consignes elles-mêmes ; l'audit du projet échoue s'il n'est pas à jour ou si un appel ne fournit pas exactement les informations attendues.

### FR-INFRA-COCOON-CONTEXT — Chaque génération qui construit un article connaît l'état du cocon
**Statut :** active
Les consignes qui construisent un article (mots-clés candidats d'un nouvel article, structure H2/H3, premier jet) doivent recevoir l'état du cocon lu au moment de l'appel, pour qu'un article résume ce que ses enfants traitent et développe ce que son parent annonce.
- L'état décrit le pilier, puis chaque section et l'article né d'elle (ou « pas encore d'article »), avec niveau, mot-clé et « rédigé » / « à rédiger » ; les articles sans parent sont listés à part ; un cocon vide annonce que l'article en sera le pilier.
- Pour l'article visé : la section du parent dont il naît et un extrait de ce qu'elle dit (1 200 caractères au plus), avec la consigne de la développer sans la répéter ; ses sections qui ont déjà leur article, à résumer.
- Un état illisible n'empêche ni la structure ni le premier jet ; il fait échouer la proposition de mots-clés candidats, avec un message.

### FR-INFRA-TYPE-RULES-SSOT — Une seule définition de ce qu'est un pilier, un intermédiaire, un spécialisé
**Statut :** non tenue (la fourchette « min – max mots » de la recommandation de contenu est calculée à ±20 % de la cible au lieu de reprendre celle du type : un pilier affiche « 2 000 – 3 000 » alors que la rédaction vise 1 800 à 3 500)
Les règles de chaque type d'article (longueurs, nombre de chapitres, de sous-parties, de lieutenants, de questions de FAQ, de chapitres citant la ville) doivent être définies une seule fois, et lues par tous : consignes d'IA, calculs, écrans, vérificateurs et mode automatique.
- Changer une valeur de la définition change l'écran, la rédaction et les consignes, sans autre retouche.
- Le nombre de H2 visé compte les H2 de fond : l'introduction et la conclusion s'y ajoutent, et les consignes le disent.
- Sans données concurrentes, la longueur recommandée est la longueur visée du type ; un type inconnu vise 2 000 mots.
- Un seuil d'alerte (« contenu trop mince », « trop peu de chapitres ») est une valeur distincte de la borne basse de la cible.
- Un test échoue si une consigne recopie une règle par type ou si une autre table de nombres par type apparaît.

### FR-INFRA-WORKFLOW-CHECKS-CONSTANTS — Une seule liste des étapes de progression
**Statut :** non tenue (le serveur accepte un nom inventé au bon format, par exemple `moteur:nimporte_quoi` ; cf. FR-MOT-CHECKS-CONSTANTS)
Les étapes de progression d'un article doivent venir d'une liste unique : six étapes du Moteur (Discovery faite, Radar fait, capitaine verrouillé, lieutenants verrouillés, structure validée, lexique validé) et une étape de la Rédaction (premier jet accepté).
- Toute écriture d'étape emploie un nom de la liste ; un autre nom est refusé.
- Les pastilles de progression, les bannières, le récapitulatif et l'arbre du cocon lisent la même étape enregistrée.
- Retirer « capitaine verrouillé » ou « lieutenants verrouillés » retire aussi « structure validée ».
- Les pastilles ne comptent que les six étapes du Moteur.

### FR-INFRA-SCORE-MODULE — Un module unique pour afficher, trier et agréger les scores
**Statut :** active
Tout score ou indicateur doit être affiché, trié et agrégé par un module unique, pour que l'utilisateur ne voie jamais un `0` à la place d'une absence ni un tri qui ignore la valeur affichée.
- Une valeur absente s'affiche « — », se trie en bas, et est exclue des moyennes.
- Le module n'est utilisable que par son point d'entrée public.

### FR-INFRA-NO-SCORE-FALLBACK — Remplacer une absence par 0 est interdit
**Statut :** active
Le code ne doit pas pouvoir remplacer silencieusement par `0` un score ou un indicateur de marché absent (volume, difficulté, CPC, concurrence, densité) : le développeur doit décider ce que devient l'absence.
- Une telle écriture est refusée au commit et par l'audit complet.
- Seule l'implémentation du module de scores y échappe ; toute autre exception est déclarée et justifiée dans le code.

### FR-INFRA-KPI-NULLABLE — Indicateurs de marché « absents » de bout en bout
**Statut :** non tenue (les mots-clés associés du brief de rédaction et de l'audit du cocon reçoivent encore 0 quand DataForSEO ne dit rien ; exception déclarée dans le code)
Volume, difficulté, CPC et concurrence doivent circuler de la source jusqu'à l'écran avec la possibilité d'être « absents » ; aucune étape ne les remplace par `0` ou « N/A ».
- Sans signal DataForSEO, la valeur reste absente jusqu'à l'écran.
- L'utilisateur distingue un volume mesuré à 0 d'un volume inconnu (« — »).

### FR-INFRA-KPI-DISPLAY-DASH — « — » pour un indicateur absent
**Statut :** non tenue (trois écrans formatent encore à la main : le tableau des mots-clés associés du brief, le panneau latéral du Capitaine, la liste des sources de la découverte ; le premier affiche 0)
Un indicateur de marché absent doit s'afficher « — » (tiret cadratin), jamais `0`, `0.00 €` ou `0 %`, de la même façon sur tous les écrans.
- Tout écran qui affiche un indicateur de marché passe par les formats communs.
- Une valeur absente produit « — ».

### FR-INFRA-KPI-CONSISTENCY — Même valeur affichée, triée et agrégée
**Statut :** active
Pour un indicateur donné, la valeur affichée et la valeur utilisée pour trier ou calculer une moyenne doivent être la même.
- Une valeur absente est placée en bas de la liste, quel que soit le sens du tri.
- La moyenne de `[10, absent, 30]` vaut 20.
- L'ordre affiché par une liste est celui que produit la fonction de tri commune.

### FR-INFRA-KPI-SCORING-NULLSAFE — Un score composite traite l'absence comme absence
**Statut :** non tenue (au Radar, une carte sans aucune donnée reçoit un Score Marché de 0, verdict « NOGO », au lieu d'un score absent : une intention inconnue compte comme une composante rouge au lieu d'être écartée. Le verdict du Capitaine, lui, passe bien à « GRAY »)
Les calculs qui combinent plusieurs indicateurs (score composite, verdicts, alertes) doivent traiter une composante absente comme manquante : son poids est reporté sur les composantes connues ; sans aucune donnée, le score est absent et le verdict neutre.
- Un score composite avec un indicateur absent sur quatre est calculé sur les trois autres.
- Sans aucune donnée, le score composite est absent et le verdict du Capitaine est « GRAY » (gris), pas « NO-GO ».
- Sans aucune source exploitable, la validation d'une douleur classe le mot-clé « incertaine », pas « froide ».

### FR-INFRA-CHECK-HEALTH — Audit complet du dépôt en une commande
**Statut :** active
Une commande unique doit enchaîner les contrôles d'hygiène du code (lint, types, cycles d'import, code mort, règles d'architecture) et échouer dès qu'un contrôle échoue.
- Un contrôle rouge rend la commande entière rouge.
- La commande couvre lint, types, cycles, code mort et architecture.

### FR-INFRA-DEPENDENCY-CRUISER — Frontières d'architecture vérifiées
**Statut :** active
Des règles d'architecture doivent interdire les imports qui dégraderaient la structure du code.
- Le code de l'interface ne peut pas importer le code du serveur.
- Le module de scores ne s'importe que par son point d'entrée.
- Un cycle d'import est une erreur.

### FR-INFRA-RUNTIME-MODE — Bascule globale « simulé / réel »
**Statut :** non tenue (la resynchronisation n'a lieu qu'au chargement de la page : après un redémarrage du serveur en cours de session, le badge garde « MOCK » alors que le serveur est revenu à sa configuration ; le mode automatique, et son option « --relink » qui repasse le serveur en simulé, désynchronisent aussi le bouton de l'application)
Un bouton de la barre de navigation doit basculer toutes les sources coûteuses en simulation (IA : réponses simulées ; DataForSEO : bac à sable gratuit), et revenir au réel en un clic. Le choix survit au rechargement de la page.
- En « MOCK », aucun appel IA ni DataForSEO n'est facturé.
- Le badge affiché et le mode appliqué par le serveur sont toujours les mêmes.
- Après un rechargement de la page, le mode choisi est conservé.
- Après un redémarrage du serveur, l'outil lui renvoie le dernier choix de l'utilisateur sans intervention.

### FR-INFRA-SCRAPE-CORPUS-NEUTRE — Un seul relevé des pages concurrentes
**Statut :** active
La lecture des dix premières pages Google d'un mot-clé (titres, texte, blog ou non) doit être faite par un service unique, ignorant qui s'en sert, pour que les Lieutenants et le Lexique travaillent sur le même corpus.
- Un même mot-clé n'est pas relu dans l'heure, ni pendant 7 jours une fois le relevé enregistré.
- Les Lieutenants et le Lexique lisent exactement le même corpus.
- Une page en erreur (404, délai dépassé) n'empêche pas les autres d'être lues.

### FR-INFRA-LOGGER — Journal du serveur lisible
**Statut :** active
Le serveur doit écrire un journal à niveaux (DEBUG, INFO, WARN, ERROR), réglable sans toucher au code.
- Le niveau minimal affiché se règle dans un fichier de configuration.
- Chaque ligne peut porter l'heure et le fichier d'origine.

### FR-INFRA-ERROR-HANDLER — Erreurs du serveur traduites en codes lisibles
**Statut :** non tenue (la plupart des routes interceptent leurs erreurs et renvoient un 500 générique ; seules quelques-unes traduisent les erreurs connues en 429 / 503)
Toute erreur du serveur doit être traduite en un code HTTP cohérent et un message lisible ; un quota ou une surcharge doit être reconnu comme tel, quelle que soit l'action qui l'a déclenché.
- Un quota DataForSEO répond 429 avec le code `DATAFORSEO_QUOTA_EXCEEDED` ; un plafond de dépense 429 avec `DATAFORSEO_COST_BUDGET`.
- Un quota IA répond 429 `AI_PROVIDER_QUOTA_EXCEEDED` ; une IA surchargée 503 `AI_PROVIDER_OVERLOADED`.
- Toute autre erreur répond 500 avec un message, jamais une trace technique.

### FR-INFRA-HEALTH-CHECK — Point de santé du serveur
**Statut :** active
Le serveur doit répondre à une question « es-tu prêt ? » sans rien d'autre à calculer, pour que les scripts de démarrage et de test puissent l'attendre.
- La réponse est `{ status: 'ok' }` dès que le serveur écoute, sans accès à la base.

### FR-INFRA-DB-CONNECTION-CHECK — Vérification de la base au démarrage
**Statut :** active
Au démarrage, le serveur doit tester la connexion à la base et dire clairement la cause probable d'un échec, sans empêcher le serveur de démarrer.
- Succès : le journal affiche « PostgreSQL connected ».
- Service arrêté, mot de passe refusé ou base absente : le journal donne une piste de correction adaptée.

### FR-INFRA-COST-LOG-STORE — Pile d'activité de la session
**Statut :** non tenue (seules les lectures et écritures des mots-clés d'article et des explorations Capitaine / Lieutenants remontent dans la pile ; les autres opérations en base n'y apparaissent pas. Et le coût de la génération des longues traînes et du jugement des questions PAA ne remonte pas à l'écran ; l'analyse IA de Discovery s'inscrit deux fois dans la pile, ce qui double son coût affiché)
Une pile d'activité, visible dans l'interface, doit accumuler les appels IA (modèle, jetons, coût estimé), les opérations en base (type, table, lignes, durée) et les messages d'erreur connus ; l'utilisateur voit le coût total de sa session et peut vider la pile.
- Chaque appel IA, diffusé ou non, ajoute sa ligne de coût.
- Chaque écriture significative en base ajoute sa ligne.
- Le coût cumulé est affiché ; la pile se vide d'un clic et se vide au rechargement de la page.

### FR-INFRA-PAA-EXPLORATIONS — Les questions PAA testées sont gardées par article
**Statut :** active
Les questions PAA jugées pour le capitaine d'un article (réponse, correspondance avec la douleur, qualité) doivent être gardées pour cet article, séparément de la mémoire PAA commune.
- Une question jugée est enregistrée avec son résultat ; la rejuger remplace l'ancien résultat sans doublon.
- À la réouverture du Capitaine, les questions déjà jugées s'affichent annotées, sans nouvel appel.

### FR-INFRA-KEYWORDS-SEO — Pool de mots-clés du cocon
**Statut :** non tenue (aucun écran affiché ne permet de remplacer, de changer le statut ni de supprimer un mot-clé du pool : l'écran qui le faisait n'est plus monté ; le pool ne s'alimente qu'à la création d'un article. Et le remplacement d'un mot-clé ne vérifie pas qu'un autre cocon l'utilise déjà ; seul l'ajout le refuse ; un mot-clé déjà présent dans le pool de son propre cocon est refusé comme s'il appartenait à un autre cocon)
Chaque cocon doit disposer d'un pool de mots-clés que l'utilisateur alimente et trie depuis le Cerveau, identique d'un écran et d'une session à l'autre.
- L'utilisateur peut ajouter, remplacer, changer le statut (suggéré, validé, écarté) et supprimer un mot-clé du pool.
- Chaque mot-clé porte un type connu de tous les écrans (Pilier, Intermédiaire, Spécialisé, Moyenne traîne, Longue traîne) ; un type inconnu est refusé à l'écriture, un ancien format est compris à la lecture.
- Un mot-clé ne peut viser qu'un seul cocon : le refus nomme le cocon qui l'utilise déjà.

### FR-INFRA-LOCAL-ENTITIES — Référentiel des lieux locaux
**Statut :** active
L'outil doit disposer d'un référentiel de lieux (régions et autres noms de la zone, quartiers et communes, lieux connus, entreprises), commun à tous les cocons et livré avec l'outil, qui fournit les repères locaux des consignes d'IA.
- Le référentiel n'est pas modifiable depuis l'interface.
- Un lieu rattaché à une région n'est proposé que si la zone du client nomme cette région ; les lieux sans région forment le référentiel par défaut, proposé seulement si la zone nomme l'une de ses régions.

### FR-INFRA-LIEUTENANT-EXPLORATIONS — Les propositions de lieutenants sont gardées par article
**Statut :** non tenue (« Tout réinitialiser » n'archive les lieutenants qu'à l'écran : l'archivage enregistré n'est jamais demandé. Après un rechargement, ils reviennent cochés, à l'écran comme dans la Finalisation, alors que la liste enregistrée est vide, et la porte refuse l'étape. Et un lieutenant ajouté depuis le panneau d'aide n'est enregistré qu'une fois coché ; le message annonce toujours « 0 lieutenant(s) archivé(s) »)
Toutes les propositions de lieutenants d'un article (de l'IA ou ajoutées à la main) doivent être gardées avec leur contexte, leur niveau de titre suggéré, leur score, leurs indicateurs du moment et leur statut.
- Une proposition est enregistrée dès qu'elle est générée ou ajoutée.
- À la réouverture, la liste est triée par score décroissant, les scores absents en bas.
- Le statut (proposé, verrouillé, écarté, archivé) survit au rechargement.

### FR-INFRA-KEYWORD-DISCOVERIES — Mémoire des découvertes de mots-clés
**Statut :** active
Une découverte de mots-clés sur un mot de départ doit être gardée avec ses sources et son analyse IA ; au retour, l'utilisateur voit sa date et peut la recharger sans coût ou repartir de zéro.
- La découverte est gardée par mot de départ et langue, jusqu'à ce que l'utilisateur la rafraîchisse.
- Au retour, un bandeau indique la date, le nombre de mots-clés et la présence de l'analyse IA, avec « Charger » et « Rafraichir ».
- « Rafraichir » efface la découverte gardée ; la suivante sera facturée.

### FR-INFRA-ARTICLE-STRATEGIES — La stratégie d'un article est gardée
**Statut :** active
La stratégie d'un article (aujourd'hui écrite par le seul mode automatique : aucun écran ne l'édite, cf. FR-CER-STEPS-ARTICLE) doit être enregistrée avec le nombre d'étapes faites, pour reprendre exactement là où l'on s'était arrêté.
- Chaque étape validée est enregistrée aussitôt.
- L'avancement survit au rechargement et au changement d'article.

### FR-INFRA-COCOON-STRATEGIES — La stratégie d'un cocon est gardée et transmise
**Statut :** non tenue (l'avis IA sur un candidat Capitaine ne la reçoit pas : l'écran n'envoie pas le cocon ; cf. FR-MOT-STRATEGY-INJECTION)
La stratégie d'un cocon (cible, douleur, angle, promesse, appel à l'action) doit être enregistrée une fois pour le cocon et transmise aux consignes d'IA qui construisent ou analysent ses articles.
- La stratégie est la même pour tous les articles du cocon, d'une session à l'autre.
- Les consignes des panneaux IA du Moteur, des mots-clés candidats, du sommaire, du premier jet, des passes d'enrichissement et de la réécriture reçoivent la stratégie du cocon (celle de l'article l'emporte quand elle existe).
- Une stratégie absente ou illisible fait disparaître le bloc, sans erreur.

### FR-INFRA-MICRO-CONTEXTS — Le micro-contexte d'un article est gardé et transmis
**Statut :** active
Le micro-contexte d'un article (angle, ton, consignes, longueur visée) doit être enregistré par article et transmis aux consignes qui structurent et écrivent l'article.
- Le micro-contexte survit aux sessions.
- Le sommaire, l'explication du brief et le premier jet reçoivent l'angle, le ton et les consignes ; le premier jet reçoit aussi la longueur visée.
- Sans angle renseigné, le bloc de micro-contexte n'est pas transmis.
- Quand l'utilisateur n'a choisi aucune longueur, celle retenue par le premier jet est enregistrée sans écraser un choix existant.

### FR-INFRA-EXTERNAL-API-CACHE — Un cache générique pour toutes les sources externes
**Statut :** active
Les réponses de toutes les sources externes mises en cache court doivent partager un seul stockage générique, rangé par type d'appel et clé, plutôt qu'un stockage par fournisseur.
- Ajouter une source externe mise en cache ne demande aucun nouveau stockage.
- Deux sources ne peuvent pas se marcher dessus : la clé comprend le type d'appel.
- La purge horaire couvre toutes les sources.

### FR-INFRA-VERIFIER-SHARED — Un même contrôle à l'écran, au serveur et dans l'audit
**Statut :** active
Une règle de qualité doit être écrite une seule fois et évaluée par le serveur seul, à une transition du parcours (une porte) : verrouiller le capitaine, valider les lieutenants, valider la structure, valider le lexique, accepter le premier jet, publier. L'écran affiche le verdict ; le serveur refuse l'étape ou la publication qui ne passe pas, même sans passer par l'écran ; l'audit du projet rejoue la publication après coup.
- Les trois (écran, serveur, audit) donnent le même verdict pour les mêmes données.
- Un refus renvoie la liste complète des points : message, risque en clair, extrait, pistes quand l'outil en a ; chaque point porte un niveau (🟠 attention, 🔴 risque, ⛔ technique) et un nom stable.
- Une étape refusée n'est pas enregistrée ; une publication refusée ne change pas le statut.
- Le mode automatique subit les mêmes portes et ne déroge jamais seul : sur un refus, il liste chaque point et s'arrête. Seule exception, une porte dont tous les points sont 🟠, quand l'utilisateur est au terminal : le robot demande « J'ai lu, continuer ? [o/N] » ; sur « o », il envoie la même reconnaissance que la case « J'ai lu » de l'écran, puis redemande l'étape. Un 🔴 ou un ⛔ se décide toujours à l'écran.
- L'audit du projet signale tout article rédigé que la porte de publication refuserait, avec le nombre de points par niveau.

### FR-INFRA-GATE-WAIVER — Passer outre en prenant sa responsabilité, par écrit
**Statut :** active
Quand une porte signale un point, l'utilisateur doit pouvoir passer outre (déroger) point par point, par écrit, pour les seules données examinées : c'est l'alarme graduée, commune à toutes les portes.
- 🟠 : cocher « J'ai lu » suffit. 🔴 : une catégorie (longue traîne assumée, donnée manquante dans l'outil, mot-clé de marque, autre) et une raison d'au moins 20 caractères. ⛔ : aucune dérogation possible.
- Le serveur revérifie chaque dérogation et refuse, avec son motif, une raison trop courte, une alerte qui n'existe plus, ou une réponse à un point qui a changé depuis que l'utilisateur l'a lu.
- Une dérogation couvre un point et les données de ce point : elle tombe seulement si ce point change (retoucher un mot ailleurs dans l'article ne la fait pas tomber) ; un point qui vise plusieurs éléments se déroge élément par élément. Pour les portes du Moteur, les données d'un point sont le choix jugé (capitaine et ses mesures, lieutenants, structure, lexique).
- L'alarme dit ce qu'il faut pour continuer : une case « J'ai lu » pour chaque 🟠, une raison pour chaque 🔴.
- Chaque dérogation est enregistrée (moment, porte, point, niveau, catégorie, raison) ; l'auteur ne l'est pas (outil mono-utilisateur).
- À la publication, les dérogations encore valables des portes Capitaine, Lieutenants, Structure et Lexique sont réaffichées pour reconfirmation, comme celles du premier jet dont le point est encore dans le texte ; l'audit du projet les liste toutes.
- Une dérogation posée avant le 2026-09-30 (sur toute la porte) reste valable tant que les données de la porte n'ont pas changé.

### Retirées (FR-INFRA)

| ID | Statut | Remplacée par |
|---|---|---|
| FR-INFRA-INTENT-EXPLORATIONS-LEGACY | soldée : la table orpheline n'existe plus, aucun code ne la lit ni ne l'écrit, et le schéma rejouable ne la recrée pas | — (invariant gardé par un test de cohérence) |

---

## 20. Performance (NFR-PERF)

Ce domaine couvre la réactivité perçue : temps de réponse des actions locales, affichage progressif de l'IA, navigation entre écrans, économie d'appels grâce au cache, fluidité de la frappe.

### NFR-PERF-API-LOCAL — Réactivité des actions locales
**Statut :** active — non mesurée (aucun chronométrage des requêtes n'est instrumenté)
L'outil doit répondre sans attente perceptible à toute action qui ne sollicite que la base locale (ouvrir, cocher, enregistrer, relire).
- Une action qui ne touche que la base locale répond en moins de 200 ms côté serveur.
- La mise à jour visuelle suit la réponse sans indicateur de chargement dédié.

### NFR-PERF-SSE-FIRST-TOKEN — Premier mot d'IA visible rapidement
**Statut :** non tenue (le premier jet n'a pas de bouton d'arrêt ; un arrêt côté écran ne coupe pas la génération côté serveur, qui continue et se facture)
Pour toute génération d'IA diffusée au fil de l'eau (le « streaming » : le texte arrive morceau par morceau), l'outil doit afficher les premiers mots en moins de 2 secondes et permettre d'arrêter la génération.
- Chaque morceau reçu du fournisseur d'IA est affiché dès son arrivée.
- Une erreur pendant la diffusion s'affiche comme un message, pas comme un silence.
- L'utilisateur peut arrêter toute génération longue par un bouton visible.
- Un arrêt demandé par l'utilisateur interrompt aussi l'appel au fournisseur d'IA.

### NFR-PERF-VIEW-LOAD — Bascule rapide entre vues
**Statut :** active — non mesurée
Changer d'écran doit prendre moins d'une demi-seconde, sans écran blanc, et le code de chaque écran ne se charge qu'à la première visite.
- Seuls le tableau de bord et la page « introuvable » sont chargés au démarrage ; les autres écrans le sont à la demande.
- Pendant le chargement d'un écran, l'écran précédent et la barre de navigation restent visibles.
- Un échec de chargement d'un écran (version déployée changée) recharge la page au plus deux fois, puis renvoie au tableau de bord.

### NFR-PERF-CACHE-HIT-RATE — Éviter les appels payants déjà connus
**Statut :** active — non mesurée (aucun compteur de réussite du cache)
Un mot-clé déjà mesuré doit être relu depuis la base locale, sans nouvel appel payant, tant que sa mesure est fraîche.
- Une seconde demande sur un mot-clé mesuré depuis moins de 7 jours ne déclenche aucun appel DataForSEO (le fournisseur payant des données de recherche Google).
- Les mesures survivent au redémarrage de l'outil.
- Deux articles qui visent le même mot-clé partagent la même mesure.

### NFR-PERF-PURGE-HOURLY — Nettoyage automatique du cache court
**Statut :** active
Les réponses mises en cache avec une date d'expiration doivent être supprimées automatiquement une fois périmées, sans action de l'utilisateur.
- Toutes les heures, les entrées de cache court expirées sont supprimées.
- Les mesures permanentes des mots-clés ne sont jamais purgées automatiquement.

### NFR-PERF-SEO-DEBOUNCE — Score SEO en direct sans gêner la frappe
**Statut :** active
Le score SEO de l'article en cours de rédaction doit se recalculer tout seul, sans ralentir la saisie.
- Le recalcul attend 300 ms après la dernière modification (texte, titre SEO, description SEO, mots-clés).
- Le calcul s'exécute pendant les temps morts du navigateur, pas pendant la frappe.

### Retirées (NFR-PERF)

| ID | Statut | Remplacée par |
|---|---|---|
| NFR-PERF-INTER-SECTION-DELAY | deprecated | FR-RED-DRAFT-SINGLE-PASS (premier jet en un seul appel) ; saturation absorbée par FR-EXT-AI-FALLBACK |

---

## 21. Coût et optimisation (NFR-COST)

Ce domaine couvre les garde-fous de dépense : cache avant tout appel payant, persistance durable, plafond de dépense DataForSEO, mode simulé gratuit.

### NFR-COST-CACHE-FIRST — Aucun appel payant si la réponse est déjà en cache
**Statut :** non tenue (le scan Radar rachète les mesures de ses mots-clés à chaque fois, sans relire la base ; un mot-clé à qui il manque le volume, la difficulté ou le coût par clic est remesuré à chaque étude au Capitaine)
Avant tout appel à un service payant, l'outil doit consulter ses données locales et ne pas appeler si une donnée fraîche existe.
- Les mesures de mots-clés, les résultats Google et les questions « People Also Ask » (PAA : les questions associées affichées par Google) sont relus en base avant tout appel.
- Il n'existe pas de « forcer l'appel » implicite : rafraîchir passe par un geste explicite (« Rafraîchir ») ou par l'expiration.

### NFR-COST-POSTGRESQL — Persistance qui survit aux redémarrages
**Statut :** active
Toutes les données de travail (articles, stratégies, mesures, explorations, caches) doivent être conservées dans la base PostgreSQL locale.
- Après redémarrage de l'ordinateur ou de l'outil, articles, étapes cochées, mots-clés et caches sont retrouvés à l'identique.
- Aucune donnée de travail n'est écrite dans un fichier, sauf le jeton de connexion Google Search Console.
- L'outil signale une structure de base qui ne correspond plus à sa référence enregistrée.
- L'outil signale une sauvegarde de la base vieille de plus de 14 jours.

### NFR-COST-BODY-LIMIT — Plafond sur la taille des requêtes
**Statut :** non tenue (le refus au-delà de 5 Mo sort en « erreur interne » avec un message technique en anglais, au lieu d'un refus lisible)
L'outil doit accepter des requêtes jusqu'à 5 Mo et refuser proprement au-delà.
- Une requête de moins de 5 Mo est acceptée.
- Une requête plus grosse est refusée immédiatement, sans arrêter le serveur.
- Le refus dit en clair que la requête est trop volumineuse.

### NFR-COST-DATAFORSEO-BUDGET — Budget glissant qui plafonne la dépense
**Statut :** active
En mode réel, l'outil doit plafonner la dépense DataForSEO sur une fenêtre de temps glissante (par défaut 0,50 $ sur 30 minutes).
- Le plafond et la durée de la fenêtre se règlent par configuration.
- Le compteur s'applique sans intervention ; il repart de zéro au redémarrage du serveur.
- En bac à sable (données factices gratuites), aucun budget n'est compté.
- La dépense de la fenêtre en cours est visible dans la pile d'activité.

### NFR-COST-DATAFORSEO-RESERVE — Blocage avant l'appel quand le budget serait dépassé
**Statut :** active
Avant chaque appel DataForSEO, l'outil doit estimer son coût et refuser l'appel si le plafond serait dépassé.
- Un appel qui ferait dépasser le plafond n'est jamais envoyé.
- Le refus indique la dépense de la fenêtre, le plafond et la durée de la fenêtre.
- Le coût estimé reste compté même si l'appel échoue ensuite.
- Les appels redeviennent possibles dès que la fenêtre glisse, sans intervention.

### NFR-COST-AI-MOCK — Mode simulé gratuit
**Statut :** non tenue (après un redémarrage du serveur en cours de session, le serveur revient à sa configuration, qui peut être payante, alors que le bouton affiche encore « MOCK »)
L'outil doit offrir un mode simulé où ni l'IA ni DataForSEO ne coûtent rien, activable par configuration ou par un bouton toujours visible.
- En mode simulé, les réponses d'IA viennent de réponses préparées, identiques d'un appel à l'autre, sans réseau.
- Chaque réponse préparée reconnaît l'appel qu'elle sert d'après sa consigne réelle, même quand le texte saisi parle d'autre chose : le conseil IA du Capitaine reçoit un avis rédigé sur son mot-clé, jamais la réponse par défaut.
- Chaque réponse préparée a la forme que l'écran attend, et part de la demande (mot-clé, niveau, termes, texte saisi) : aucun panneau ne reste vide ni n'affiche un texte hors sujet à cause de la simulation.
- En mode simulé, DataForSEO est interrogé en bac à sable.
- Le bouton de la barre de navigation affiche le mode actif et bascule d'un clic.
- Le choix fait par le bouton survit à un redémarrage du serveur.

---

## 22. Intégration et contrats (NFR-INT)

Ce domaine couvre la cohérence des données qui traversent plusieurs écrans et couches : progression unique, identifiants d'étape, analyse Google partagée, contrats d'affichage, validation des entrées, passage unique par le client d'API.

### NFR-INT-MOTEUR-BIMODAL — Un onglet du Moteur, un seul composant
**Statut :** active
Chaque onglet du Moteur (le module d'analyse des mots-clés, en sept onglets) doit exister en un seul exemplaire, paramétrable, jamais dupliqué pour un autre usage.
- Aucun onglet du Moteur n'a deux versions concurrentes.
- Un changement visuel ou de comportement d'un onglet s'applique partout où il est affiché.

### NFR-INT-COMPLETED-CHECKS-SSOT — Une seule source pour la progression d'un article
**Statut :** active
L'avancement d'un article (six étapes du Moteur, plus « Premier jet accepté » en Rédaction) doit être enregistré en un seul endroit, que tous les affichages de progression lisent.
- La progression d'un article n'a pas de copie ailleurs en base.
- Tous les indicateurs de progression affichent la même valeur pour un même article.
- Une étape cochée ou décochée est reflétée partout dès la confirmation du serveur.

### NFR-INT-CHECKS-NAMESPACE — Des étapes nommées par leur module
**Statut :** non tenue (le serveur accepte un nom inventé au format `moteur:<action>` ; cf. FR-MOT-CHECKS-CONSTANTS)
Chaque étape de progression doit porter le nom de son module (Moteur ou Rédaction) et provenir d'une liste unique.
- Seules les six étapes du Moteur et « Premier jet accepté » peuvent être enregistrées.
- Une valeur ancienne d'un autre module est tolérée en lecture et ignorée par les indicateurs.

### NFR-INT-SERP-ONCE — Les pages concurrentes ne sont lues qu'une fois
**Statut :** active
L'analyse des dix premiers résultats Google d'un mot-clé (le SERP : la page de résultats) et la lecture de leurs pages doivent servir à toutes les étapes qui en ont besoin, sans être refaites.
- Pendant 7 jours, une analyse déjà faite est relue en base, quel que soit l'article.
- Lieutenants, Structure et Lexique lisent les mêmes pages concurrentes.
- Une liste de résultats sans aucune page lue ne compte pas comme une analyse faite.

### NFR-INT-SCORING-CONFIGURABLE — Seuils de score centralisés
**Statut :** active
Les seuils qui colorent et classent les indicateurs doivent être définis en un seul endroit et partagés par l'affichage, le tri et les filtres.
- Changer un seuil ne demande qu'une modification.
- Les comparaisons et moyennes de scores passent par un module commun.

### NFR-INT-PROMPT-AGNOSTIC — Consignes d'IA génériques, contexte injecté
**Statut :** active
Les consignes envoyées à l'IA doivent être génériques ; le contexte d'un article ou d'un cocon (un groupe d'articles liés autour d'un même sujet) y est injecté au moment de l'appel.
- Aucune consigne ne contient un article, un cocon ou une stratégie écrits en dur.
- Une variable attendue mais absente, ou fournie mais inutilisée, est une erreur signalée.

### NFR-INT-STRATEGY-OPTIONAL — L'IA fonctionne sans stratégie
**Statut :** non tenue (quand la douleur manque, Discovery envoie le mot-clé racine à sa place, et la suggestion de longues traînes envoie « (non defini) » sans accent)
Une action d'IA doit fonctionner même si la stratégie du cocon ou le point de douleur de l'article n'est pas renseigné.
- Une stratégie absente ou illisible donne un contexte vide, pas une erreur.
- Un point de douleur absent est transmis comme « (non défini) ».

### NFR-INT-ZOD-VALIDATION — Toutes les requêtes sont validées
**Statut :** non tenue (une partie des requêtes n'est vérifiée qu'à la main, champ par champ ; certaines, invalides, sortent en « erreur interne » 500 au lieu d'un refus 400)
Chaque requête reçue par le serveur doit être vérifiée contre une forme attendue, partagée entre l'écran et le serveur.
- Une requête mal formée est refusée avec le statut 400 et un message qui nomme le problème.
- Aucune requête mal formée n'atteint un appel payant.

### NFR-INT-DISPLAY-CONTRACTS — Ce qui s'affiche est vérifié avant d'arriver à l'écran
**Statut :** non tenue (le rechargement de l'exploration Radar, par « Charger Radar » ou au choix d'un article, n'est pas contrôlé à son arrivée à l'écran)
Chaque résultat affiché par le Moteur doit être mis dans la forme attendue par l'écran, à la sortie du serveur, à la relecture en base et à l'arrivée à l'écran.
- Un indicateur sans donnée s'affiche « — » partout (carte, verdict, moyenne, tri), au premier chargement comme au rechargement.
- Un élément illisible d'une liste est écarté ; les autres restent affichés.
- Une réponse inutilisable suit le chemin d'erreur de l'écran avec « Réponse reçue dans un format inattendu (…) — relancez l'action. »
- Chaque correction ou refus est journalisé, sans message supplémentaire pour l'utilisateur.

### NFR-INT-API-WRAPPER — Un seul client pour parler au serveur
**Statut :** active
Tout échange entre l'écran et le serveur doit passer par un client unique, qui traite erreurs, coûts et contrats de la même façon.
- Aucun écran n'appelle le serveur autrement que par ce client.
- Les coûts d'IA renvoyés par le serveur arrivent dans la pile d'activité, quel que soit l'écran.

### NFR-INT-ARTICLE-ID-NEVER-REUSED — Le numéro d'un article effacé n'est jamais redonné
**Statut :** active
Chaque article doit recevoir un numéro qu'aucun autre n'a jamais porté, même après l'effacement d'articles de la base (nettoyage, script), pour que rien de ce qui concernait un article effacé ne puisse réapparaître sur un autre.
- Un article créé après l'effacement du dernier article reçoit un numéro neuf, pas celui de l'article effacé.
- Une analyse terminée après l'effacement de son article ne s'enregistre sur aucun autre article.
- Deux articles créés au même instant reçoivent deux numéros différents.

### NFR-OBS-EXTERNAL-API-OPT-OUT — Appels aux services tiers identifiés
**Statut :** active
Les appels directs aux services tiers (DataForSEO, Google, fournisseurs d'IA, recherche Tavily) doivent être marqués comme volontaires, pour qu'un audit les distingue d'un contournement.
- Chaque appel direct à un service tiers porte un marqueur explicite.
- L'audit des flux de données signale tout appel direct non marqué.

---

## 23. Maintenabilité et tests (NFR-MAIN, NFR-TEST)

Ce domaine couvre ce qui garde le code lisible et vérifiable par un développeur seul : rangement par domaine, suites de tests, outillage statique, traçabilité des exigences.

### NFR-MAIN-ORG-STORES — États partagés rangés par domaine
**Statut :** active
Les états partagés de l'interface doivent être rangés en cinq domaines : article, mots-clés, stratégie, services externes, interface.
- Chaque état partagé appartient à un seul domaine.
- Son nom de fichier dit sa fonction.

### NFR-MAIN-ORG-COMPOSABLES — Logique d'interface réutilisable rangée par domaine
**Statut :** active
La logique d'interface réutilisable doit être rangée par domaine métier (neuf aujourd'hui : article, éditeur, intention, mots-clés, lexique, Moteur, SEO, stratégie, interface), jamais dans un fourre-tout.
- Chaque élément appartient à un domaine identifié.

### NFR-MAIN-ORG-SERVICES — Logique serveur rangée par domaine
**Statut :** active
La logique métier du serveur doit être rangée par domaine (huit aujourd'hui : article, services externes, portes de qualité, infrastructure, intention, mots-clés, requêtes, stratégie) ; les points d'entrée HTTP ne font que valider, déléguer et répondre.
- Chaque service appartient à un domaine.
- La logique métier est testable sans passer par HTTP.

### NFR-MAIN-TESTS-VITEST — Suite de tests unitaires et d'intégration
**Statut :** active
Le code doit être couvert par une suite de tests rangée en couches (unités, logique, contrats d'API, onglets, parcours), avec un moyen de savoir si un chantier a cassé un test.
- La suite complète se lance en une commande.
- Une comparaison avec l'état de référence enregistré liste les tests devenus rouges.
- Un filet rapide (tests sans serveur ni base) tourne en une dizaine de secondes.
- Les tests qui écrivent en base étiquettent leurs données et les retirent.

### NFR-MAIN-TESTS-PLAYWRIGHT — Parcours testés dans un vrai navigateur
**Statut :** active
Les parcours majeurs (Cerveau, Moteur, Rédaction, portes de qualité) doivent être testés dans un vrai navigateur, sans jamais toucher à la session ni à la base de l'utilisateur.
- Les tests navigateur démarrent leur propre serveur, sur des ports distincts, en mode simulé.
- Ils écrivent dans leur propre base, recréée vide avant chaque passage.
- Une base n'est recréée que si son nom finit par « _test » et n'est pas celle de l'application.
- Un passage réel, ou des tests visant un serveur déjà ouvert, gardent la base de ce serveur.

### NFR-MAIN-TOOLING — Outillage qualité automatisé
**Statut :** non tenue (le contrôle au commit ne lance que les deux linters ; ni lui ni l'intégration continue ne lancent code mort, cycles d'imports ou règles d'architecture)
Le dépôt doit être outillé de vérifications statiques (linters, formatage, code mort, cycles d'imports, règles d'architecture), chacune lançable à la main, et les régressions doivent être arrêtées avant d'arriver sur la branche principale.
- Chaque vérification a sa commande, et une commande les regroupe.
- Un commit qui introduit du code mort, un cycle ou une violation d'architecture est refusé.

### NFR-MAIN-CHECK-HEALTH — Une commande « tout va bien »
**Statut :** active
Une commande unique doit enchaîner linters, typage, cycles, code mort et architecture, et échouer au premier contrôle rouge.
- Code de sortie 0 si tout est vert, différent de 0 sinon.
- La sortie nomme le contrôle en échec.

### NFR-MAIN-NO-SCORE-FALLBACK — Pas de zéro silencieux sur un score ou un indicateur
**Statut :** non tenue (les jauges SEO et GEO affichent 0 avant le premier calcul : le contrôle ne lit pas les écrans)
Le code ne doit jamais remplacer un score ou un indicateur de marché absent par 0 ; l'absence reste une absence.
- Le linter refuse `x ?? 0` quand x est un score, un volume, une difficulté, un CPC, une concurrence ou une densité, y compris par chaînage optionnel.
- Seul le module de calcul des scores est exempté.
- Le contrôle au commit applique cette règle.

### NFR-MAIN-FILE-SIZE — Fichiers de taille raisonnable
**Statut :** non tenue (deux fichiers dépassent 1 000 lignes — l'onglet Capitaine et le service de données du serveur — et 53 dépassent 400)
Un fichier source doit viser moins de 400 lignes ; au-delà de 1 000, il est une dette inscrite avec un plan de découpage.
- Un nouveau fichier vise moins de 400 lignes.
- Tout fichier de plus de 1 000 lignes figure dans la dette technique.

### NFR-MAIN-NO-CYCLES — Pas de cycles d'imports
**Statut :** active
Le graphe des imports du code doit rester sans cycle.
- La détection des cycles du serveur et du code partagé sort verte.
- La règle d'architecture signale aussi les cycles de l'interface.

### NFR-MAIN-REQUIREMENTS-TRACE — Toute exigence citée par un test existe par écrit
**Statut :** active
Un identifiant d'exigence cité par un test doit exister dans les exigences ou la conception (les documents de référence, ou leurs anciennes versions gardées pour l'historique), ou dans l'épopée en cours.
- Un identifiant inconnu fait échouer la vérification rapide du projet, en nommant l'identifiant et le fichier.
- La liste des orphelins historiques (20) ne peut que baisser.

### NFR-TEST-BEHAVIORAL — Des tests qui se comportent comme un utilisateur
**Statut :** non tenue (les parcours ne simulent ni retour arrière ni panne d'un service ; le texte produit en mode réel n'est pas passé automatiquement dans les vérificateurs)
Les tests doivent reproduire aussi les erreurs d'un utilisateur, et un test qui n'a rien vérifié doit le dire.
- Chaque porte de qualité a son test négatif, à l'écran et au serveur.
- Un test privé de son environnement apparaît « ignoré », jamais « réussi » ; les formes d'assertion toujours vraies sont comptées et ne peuvent que baisser.
- Les parcours varient leurs choix : pas toujours la première option, décocher, recharger, revenir en arrière, panne d'un service.
- En mode réel, le texte produit passe dans les mêmes vérificateurs que la vérification du projet.

### NFR-TEST-RECETTE-COVERAGE — La recette manuelle couvre chaque exigence fonctionnelle
**Statut :** active
La recette manuelle doit vérifier à l'écran chaque exigence fonctionnelle, ou dire pourquoi elle ne se vérifie pas à l'écran. Une exigence nouvelle ne peut pas y être oubliée.
- Chaque exigence fonctionnelle active, non tenue ou prévue est citée par au moins une vérification de la recette, ou listée « hors recette » avec sa raison. Jamais les deux.
- Une vérification qui porte sur une exigence non tenue la marque « ⚠ » et décrit le défaut attendu. Une exigence redevenue active perd sa marque.
- Une exigence prévue (pas encore livrée) ne se vérifie pas : elle est listée hors recette.
- Tout identifiant cité par la recette existe dans les exigences.
- Un oubli fait échouer la vérification rapide du projet, en nommant l'exigence et ce qu'il faut faire.

### NFR-TEST-PARCOURS-TRACE — Les parcours utilisateur restent reliés aux exigences, à la recette et aux tests
**Statut :** active
Les parcours utilisateur doivent décrire, chacun, un but réel de l'utilisateur et le chemin qu'il suit pour l'atteindre, y compris ce qui peut mal tourner. Chaque étape s'appuie sur des exigences écrites, et chaque parcours dit ce qui le vérifie.
- Chaque étape et chaque situation d'un parcours cite au moins une exigence, et toute exigence citée existe.
- « ⚠ » suit le statut : une exigence non tenue le porte, une active non ; une exigence prévue n'est pas une étape. Chaque exigence non tenue citée figure dans la liste des défauts connus du parcours.
- Chaque parcours dit quelle partie de la recette le couvre, et s'il a un test automatique. Un parcours suivi par un test automatique est cité par ce test ; un parcours sans test le dit (« aucun »).
- Un écart fait échouer la vérification rapide du projet, en nommant le parcours et ce qu'il faut faire.

---

## 24. Sécurité (NFR-SEC)

Ce domaine couvre la protection des clés payantes, du jeton Google et des consignes d'IA, pour un outil utilisé en local par une seule personne.

### NFR-SEC-CORS — Accès limité à la machine locale
**Statut :** non tenue (le serveur écoute sur toutes les interfaces réseau et traite toute requête sans origine de navigateur : seule une page web d'une autre origine est bloquée)
Seule la machine de l'utilisateur doit pouvoir appeler le serveur et déclencher des opérations payantes.
- Une page web servie par une autre origine que « localhost » ne peut pas lire les réponses du serveur.
- Une autre machine du réseau ne peut pas appeler le serveur.
- Aucune configuration n'est nécessaire.

### NFR-SEC-ZOD-INPUT — Entrées validées avant la logique métier
**Statut :** non tenue (même écart que NFR-INT-ZOD-VALIDATION)
Toute requête doit être validée avant d'atteindre la logique métier et avant tout appel payant.
- Une requête non conforme reçoit un 400 qui nomme le champ en cause, sans détail technique interne.

### NFR-SEC-PROMPT-INJECTION — Contenus de l'utilisateur neutralisés dans les consignes d'IA
**Statut :** active
Les contenus longs fournis par l'utilisateur (texte de l'article, section, sélection, consigne libre) doivent être neutralisés avant d'entrer dans une consigne d'IA.
- Les marqueurs de tour de parole, les balises système et les accolades de variables y sont désamorcés, sans avertir l'utilisateur.
- Le contenu est encadré comme « contenu utilisateur » dans la consigne.
- Un contrôle automatique refuse tout nouvel appel qui transmettrait ces contenus sans neutralisation.

### NFR-SEC-ENV-VARS — Secrets hors du dépôt
**Statut :** active
Les clés d'API et secrets doivent vivre dans un fichier d'environnement local exclu du suivi Git, décrit par un modèle sans valeur réelle.
- Le fichier d'environnement est exclu du suivi Git.
- Le modèle liste les variables attendues avec des valeurs factices.
- Aucune clé n'est écrite dans le code.
- La vérification du projet avertit quand une clé indispensable manque.

### NFR-SEC-GSC-TOKENS — Jeton Google Search Console conservé localement
**Statut :** non tenue (le chemin du fichier est fixe et le fichier n'est pas exclu du suivi Git)
Le jeton de connexion à Google Search Console doit rester sur la machine, dans un fichier dont le chemin se règle, hors du suivi Git, jamais journalisé.
- Le jeton est rafraîchi automatiquement avant expiration.
- Le jeton n'apparaît dans aucun journal.
- Le fichier du jeton est exclu du suivi Git.
- Son chemin se règle par configuration.

---

## 25. Observabilité (NFR-OBS)

Ce domaine couvre ce qui permet de comprendre un dysfonctionnement : journaux, santé du serveur, erreurs lisibles, pile d'activité à l'écran.

### NFR-OBS-LOGGER — Journaux à quatre niveaux
**Statut :** active
Le serveur et l'interface doivent écrire leurs journaux par un journaliseur central à quatre niveaux (débogage, information, avertissement, erreur).
- Chaque ligne porte heure, niveau et fichier d'origine.
- Un niveau minimum global filtre les lignes affichées.
- Aucun appel brut à la console n'est fait hors du journaliseur (une exception connue : l'erreur inattendue du pool de connexions).

### NFR-OBS-CONFIG — Verbosité réglable par module
**Statut :** non tenue (un seul niveau global, sans réglage par module ; le niveau par défaut est « débogage »)
L'utilisateur doit pouvoir régler la verbosité des journaux par module, dans un fichier dédié, sans toucher au code.
- Un fichier de configuration fixe le niveau, l'heure, l'origine et les émojis.
- Le niveau se règle par module.

### NFR-OBS-HEALTH — État de santé du serveur
**Statut :** active
Un point d'accès doit dire en un appel que le serveur tourne, sans effet de bord ni appel externe.
- Réponse immédiate avec l'état « ok », sans authentification.

### NFR-OBS-DB-CHECK — Vérification de la base au démarrage
**Statut :** active
Au démarrage, le serveur doit tester sa connexion à la base et, en cas d'échec, dire pourquoi.
- Un échec est journalisé avec une piste de correction (service arrêté, identifiants refusés, base absente).
- Le serveur continue de démarrer malgré l'échec.

### NFR-OBS-ERROR-HANDLER — Erreurs du serveur traitées au même endroit
**Statut :** active
Toute erreur non traitée par une route doit aboutir à une réponse au format commun (code d'erreur, message), sans trace technique.
- Les erreurs connues (quota, budget, fournisseur saturé) reçoivent un statut et un code dédiés.
- Aucune pile d'appels n'est renvoyée à l'écran.
- Le détail est journalisé côté serveur.

### NFR-OBS-COST-LOG — Pile d'activité à l'écran
**Statut :** active
Une pile d'activité toujours accessible doit montrer ce que l'outil fait en arrière-plan et ce qu'il coûte pendant la session.
- Elle liste les appels d'IA (modèle, jetons, coût estimé), les opérations en base rapportées et les erreurs connues.
- Elle affiche la dépense DataForSEO de la fenêtre glissante, le plafond, et si l'on est en bac à sable ou en production.
- L'utilisateur peut retirer une entrée ou tout effacer.
- Elle ne contient pas le contenu des requêtes.

### NFR-OBS-DBOPS-TRACK — Opérations en base visibles par requête
**Statut :** non tenue (seules quelques routes des explorations Capitaine et Lieutenants rapportent leurs opérations ; aucun seuil d'alerte)
Chaque réponse du serveur doit rapporter les opérations faites en base pour la traiter, afin de repérer une route qui en ferait trop.
- Toute réponse rapporte ses opérations en base (type, table, lignes, durée).
- La pile d'activité les affiche.
- Un seuil signale une route trop gourmande.

### NFR-OBS-KNOWN-ERRORS — Erreurs connues lisibles à l'écran
**Statut :** non tenue (le dépassement du budget DataForSEO n'est pas inscrit dans la pile d'activité ; une erreur inconnue affiche son message brut, pas un message générique ; au Cerveau, l'échec d'une suggestion, d'une fusion, d'une sous-question, d'un enrichissement, d'une régénération ou de l'enregistrement par « Suivant » n'affiche rien ; l'échec de « Remplir les champs avec Claude » et un aperçu refusé s'expliquent en anglais)
Une erreur de cause connue doit s'afficher avec un message clair qui dit quoi faire ; une erreur inconnue doit renvoyer vers le journal.
- Quota DataForSEO, quota d'IA et IA saturée apparaissent dans la pile d'activité avec leur conseil.
- Le dépassement du budget DataForSEO y apparaît aussi.
- Une erreur inconnue affiche un message générique.

---

## 26. Configuration et environnement (NFR-CFG)

Ce domaine couvre ce que l'utilisateur règle sans toucher au code : fournisseurs, budget, ports, base, connexion Google.

### NFR-CFG-AI-PROVIDER — Choix du fournisseur d'IA
**Statut :** active
Le fournisseur d'IA par défaut (Claude, Gemini, OpenRouter ou simulé) doit se choisir par configuration ; Claude s'applique si rien n'est réglé.
- Le bouton de mode de la barre de navigation l'emporte : « simulé » force la simulation, « réel » force Claude.

### NFR-CFG-AI-FALLBACK-OPT-OUT — Désactiver la bascule entre fournisseurs
**Statut :** active
L'utilisateur doit pouvoir désactiver la bascule automatique vers un autre fournisseur d'IA en cas de quota ou de saturation.
- Désactivée, seul le fournisseur choisi est essayé.
- Le mode simulé ne bascule jamais.

### NFR-CFG-CLAUDE-MODEL — Modèle Claude réglable
**Statut :** active
Le modèle Claude des générations en flux doit se régler par configuration (par défaut un modèle Sonnet).
- Les tâches courtes de classement utilisent un modèle Haiku, réglable pour le Radar.

### NFR-CFG-GEMINI-MODEL — Modèle Gemini réglable
**Statut :** active
Le modèle Gemini doit se régler par configuration, avec un modèle Flash par défaut.

### NFR-CFG-DATAFORSEO-SANDBOX — Bac à sable DataForSEO sur demande explicite
**Statut :** active
DataForSEO ne doit passer en bac à sable que sur demande explicite ; sans réglage, les appels vont en production.
- Le bouton de mode l'emporte sur la configuration : « simulé » force le bac à sable, « réel » force la production.
- Au premier appel, le serveur journalise s'il est en bac à sable ou en production facturée.

### NFR-CFG-DATAFORSEO-BUDGET — Plafond et fenêtre réglables
**Statut :** active
Le plafond de dépense et la durée de la fenêtre glissante doivent se régler par configuration (défaut 0,50 $ et 30 minutes).
- Une valeur absente, nulle ou invalide ramène au défaut.

### NFR-CFG-DATAFORSEO-REFRESH — Délai minimal entre deux rafraîchissements
**Statut :** active
Le délai minimal avant de redemander les données d'audit d'un mot-clé doit se régler par configuration, en heures.
- Par défaut 168 heures (7 jours) ; 0 quand le serveur tourne en mode développement.

### NFR-CFG-PG-CONN — Connexion à la base réglable
**Statut :** active
Hôte, port, utilisateur, mot de passe et nom de la base doivent se régler par configuration.
- Sans réglage : machine locale, port 5432, utilisateur « postgres », base « blog_redactor_seo ».

### NFR-CFG-GSC-OAUTH — Connexion Google Search Console configurable
**Statut :** active
Les identifiants de l'application Google et l'adresse de retour de la connexion doivent se régler par configuration.
- Sans adresse réglée, l'adresse de retour est calculée sur le port du serveur.

### NFR-CFG-APP-PORTS — Ports applicatifs fixes
**Statut :** active
Le serveur et l'interface doivent écouter sur des ports fixes et propres au projet (3400 et 5400), réglables par configuration.
- Le port de l'interface est strict : s'il est occupé, l'interface ne démarre pas ailleurs.
- Les tests navigateur utilisent leurs propres ports (3410 et 5410), jamais ceux de l'application.
- Aucun ancien port (3005, 5173) ne subsiste dans le code actif.

### NFR-CFG-PORT-PREFLIGHT — Ports libérés avant démarrage
**Statut :** active
Avant le démarrage, la construction ou les tests navigateur, l'outil doit libérer les ports qu'il va utiliser, sous Windows comme ailleurs.
- La libération ne fait rien si les ports sont libres et n'échoue jamais.
- Lancer les tests navigateur ne coupe jamais le serveur de développement.

### Retirées (NFR-CFG)

| ID | Statut | Remplacée par |
|---|---|---|
| NFR-CFG-INTER-SECTION-DELAY | deprecated | FR-RED-DRAFT-SINGLE-PASS |
| NFR-CFG-WEB-SEARCH | deprecated | FR-RED-ENRICH-SOURCES (recherche web toujours par Claude, sans réglage) |

---

## 27. Expérience utilisateur (NFR-UX)

### NFR-UX-STABLE-SKELETON — Écran stable, états visuels plutôt qu'apparitions
**Statut :** non tenue (les panneaux d'IA du Lexique et des Lieutenants n'apparaissent qu'après leur analyse ; pendant un scan du Radar, « Mots-clés à scanner » et les résultats disparaissent ; à Discovery, le filtre de pertinence et « Groupes de mots » n'apparaissent qu'après la première découverte)
Les zones d'action d'un écran du Moteur (panneaux d'IA, boutons principaux, sections de résultats) doivent être présentes dès l'ouverture ; leur état (inactif, en cours, erreur) se voit sur place.
- Les panneaux d'IA de Discovery, Radar, Capitaine, Lieutenants et Lexique sont affichés dès l'ouverture, sans action préalable.
- Aucun panneau n'apparaît ou ne disparaît selon un état passager de l'utilisateur.
- Une zone inactive dit ce qu'il faut faire pour l'activer.
- Une zone lourde repliée peut n'être construite qu'au dépli, avec une silhouette de même taille.

### NFR-UX-SCREEN-TEXT — Un texte d'écran s'affiche tel qu'il est écrit
**Statut :** non tenue (des textes fixes sont écrits sans accents (« Deverrouiller », « Rafraichir », « Reinitialiser », « Derniere analyse », « mots-cles », « Suggerer », « Regenerer », « Resultats SERP », « Angle differenciant », « Contexte strategique », « Differenciateur »…) et la vérification rapide ne les repère pas ; d'autres restent techniques ou en anglais : « Discovered via suggest-alphabet », identifiant d'alerte « lieutenants-too-few » à la publication ; les compteurs ne s'accordent pas (« 1 articles »))
Tout texte fixe de l'interface doit s'afficher en français lisible, accents compris : jamais un code technique à la place d'une lettre (« th\\u00e9matique » au lieu de « thématique »).
- Aucun texte fixe d'un écran ne contient de séquence d'échappement : les accents sont écrits directement.
- La vérification rapide du projet échoue sur un texte fautif, en nommant le fichier et la ligne.

### NFR-UX-ACTIONS-VISIBLE — Un bouton utilisable est visible
**Statut :** active
Un bouton que l'utilisateur peut déclencher doit être visible au moment où il peut l'utiliser. Un bouton discret, révélé seulement au survol de son bloc, doit aussi apparaître quand on l'atteint au clavier.
- Sur la carte indicative du cocon, les boutons « Plus d'actions » et « Supprimer » d'une carte repliée apparaissent au survol de la carte et quand le focus clavier est dans la carte.
- Aucun style ne cache un bouton en attendant un état (survol, sélection) qu'il ne peut pas détecter.
- La vérification rapide du projet échoue sur un style qui ne peut jamais s'appliquer, en nommant le fichier et la ligne.
