---
name: epic-qualite-seo-garde-fous
type: epic
status: in-progress
version: 1.2.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/planning-artifacts/prd.md (exigences réservées ici, versées au PRD dans la PR qui les livre ; NFR-MAIN-REQUIREMENTS-TRACE livrée par C0)
  - _bmad-output/planning-artifacts/design-registry.md (une entrée DESIGN par FR livrée)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (clés qualite-seo-c0 … qualite-seo-c8)
  - tests/unit/architecture/requirements-trace.test.ts (les IDs réservés ici sont reconnus comme traçables)
---

# Épopée — Qualité SEO : vérificateurs, séquençage et traçabilité

## 1. Problème

Le 2026-09-24, le parcours réel a produit le pilier **1013**, « Propulser la croissance digitale des entreprises toulousaines : le guide complet 2026 ». L'outil l'a marqué « publié », alors qu'un expert SEO l'aurait refusé :

| Défaut constaté | Cause dans la chaîne |
|---|---|
| Mot-clé principal sans volume ni intention mesurés | Le Cerveau a recopié l'exemple de son prompt ; le verrou capitaine n'exige rien |
| SERP 100 % agences, traitée comme un guide | L'intention de la SERP n'est jamais comparée au type d'article |
| H1 sans le mot-clé, méta sur le titre | Le plan rabote le H1 du Moteur ; la méta ne reçoit pas le capitaine |
| 15 601 mots pour une cible de 2 650 | Le budget par section n'atteint jamais le prompt ; 15 appels sans mémoire |
| Le pilier traite en détail les sujets de ses enfants, 0 lien | Aucune génération ne connaît l'état du cocon |
| Phrases en anglais, « Vendée », chiffres de 2024 non sourcés | Recherche web sans lieu ni date, et citations jetées |
| Lexique plein de mots vides (« vos », « être ») | Liste de mots vides incomplète, pages aspirées avec leurs menus |
| Publié sans score | Aucun contrôle à la publication, scores jamais enregistrés |

Le constat de fond : **aucune transition ne vérifie ce qui passe**, les étapes se transmettent mal leurs données, et les tests acceptent tout. Ils prennent toujours la première option et ne tentent aucune action interdite.

## 2. Objectif

1. Poser un **vérificateur** sur chaque transition. Le même code sert à trois endroits : l'écran, le serveur et `npm run verify`.
2. **Séquencer** le travail : cocon né du pilier, un article à la fois, premier jet puis passes d'enrichissement.
3. Refondre les prompts **par le haut** : l'architecture d'abord, les retouches ensuite.
4. Rendre les tests **exigeants** : chaque porte a son test négatif, et le parcours réel passe la qualité du texte.
5. **Tracer** chaque exigence : épopée → PRD et registre à la livraison → tech-spec → PR GitHub.

**Fil conducteur** : le pilier 1013, figé en fixture, doit être **rejeté** par les vérificateurs dès C2. À la recette C8, un nouveau pilier réel doit passer **sans aucune dérogation**.

## 3. Décisions (validées avec Arnaud le 2026-09-24)

| Sujet | Décision |
|---|---|
| Garde-fous | **Alarme graduée + responsabilité** (§4) |
| Cocon | **Carte née du pilier** : chaque H2 du pilier est un enfant candidat, créé un par un ; le parent doit être rédigé avant |
| Rédaction | **Premier jet en un seul appel**, sans recherche web, puis passes d'enrichissement séquentielles. La route par section ne sert plus qu'à réécrire une section |
| Maillage interne | **Manuel**, après la rédaction |
| Onglets Moteur | Lieutenants et Structure Hn **séparés** |
| Exigences | **Épopée d'abord, PRD à la livraison** : une FR n'entre dans `prd.md` que dans la PR qui la livre (pas d'écart doc ↔ code) |
| Git | Une branche + une PR GitHub par chantier ou correctif (`annubis-knight/Blog_Redactor_SEO`). Arnaud fusionne |

## 4. L'alarme graduée

Chaque règle d'un vérificateur porte un niveau :

| Niveau | Quand | Ce que doit faire l'utilisateur pour passer |
|---|---|---|
| 🟢 OK | La règle est respectée | Rien |
| 🟠 Attention | Signal faible (ex. autocomplétion vide) | Cocher « J'ai lu » ; l'accusé de lecture est enregistré |
| 🔴 Risque | Choix discutable (ex. volume inconnu, SERP commerciale pour un pilier) | Choisir une catégorie (longue traîne assumée, donnée manquante dans l'outil, mot-clé de marque, autre) et écrire une raison de **20 caractères minimum**. Un badge 🛡 s'affiche sur la carte et dans le récap |
| ⛔ Technique | Défaut objectif (H1 dans le corps, bloc tronqué, monologue d'IA, texte vide) | Impossible de passer : il faut corriger |

- L'alarme dit **quel est le risque**, en clair, et propose **des alternatives** quand l'outil en a (par exemple d'autres candidats capitaine avec un volume mesuré).
- Une dérogation **tombe** si les données vérifiées changent.
- **À la publication**, toutes les dérogations de l'article sont réaffichées et doivent être reconfirmées.

## 5. Chantiers

Règles communes à tous les chantiers :
- une branche `type/sujet` depuis `origin/main`, une tech-spec, une ou plusieurs PR ;
- la boucle de `.claude/CLAUDE.md` §2 ;
- un valideur par correction ;
- les FR livrées entrent au PRD et au registre **dans la PR du chantier**.

| # | Chantier | Branche | Taille | Exigences | Statut |
|---|---|---|---|---|---|
| C0 | Traçabilité : épopée, modèle de PR, cliquet des IDs, dédoublonnage LEX | `chore/tracabilite-programme` | S | NFR-MAIN-REQUIREMENTS-TRACE | en revue |
| C1 | Correctifs rapides (checklist §8) + cliquet des faux tests | `fix/cerveau-mots-cles`, `fix/moteur-intention-hn`, `fix/redaction-meta-contexte`, `test/hygiene-parcours` | S × 4 | FR-RED-META-CAPTAIN | en revue (4/4 PR) |
| C2 | Vérificateurs + alarme graduée + publication contrôlée | `feat/verificateurs-alarme` | L | FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-RED-PUBLISH-GATE, FR-RED-SEO-SCORE-PERSIST, NFR-TEST-BEHAVIORAL | en cours (PR à ouvrir) |
| C3 | Lexique métier | `fix/lexique-metier` | M | FR-LEX-METIER-ONLY | en cours (PR à ouvrir) |
| C4 | Architecture des prompts | `refactor/prompts-architecture` | M | FR-INFRA-PROMPT-LAYERS, FR-INFRA-TYPE-RULES-SSOT | à faire |
| C5 | Rédaction en deux temps | `feat/redaction-premier-jet`, `feat/redaction-enrichissement` | L | FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE, FR-RED-SECTION-REWRITE, FR-RED-ENRICH-SOURCES, FR-RED-ENRICH-PASSES, FR-RED-LANG-REVIEW, FR-RED-LINKING-MANUAL | à faire |
| C6 | Onglet Structure Hn | `feat/onglet-structure-hn` | M-L | FR-HN-TAB, FR-HN-LOCK-GATE | à faire |
| C7 | Cocon né du pilier | `feat/cocon-progressif` | L | FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-KEYWORD-REAL-DATA, FR-INFRA-COCOON-CONTEXT | à faire |
| C8 | Recette réelle | — | S | — | à faire |

**Pourquoi cet ordre.** Les vérificateurs (C2) passent **avant** les prompts (C4) : sans eux, on retouche les prompts sans rien pour mesurer le résultat. L'onglet Structure (C6) précède le cocon (C7), parce que la carte du cocon naît de la structure du pilier.

## 6. Exigences réservées

Elles sont écrites au format du PRD. Chacune entre dans `prd.md`, avec son entrée `DESIGN-…` dans `design-registry.md`, dans la PR du chantier qui la livre ; son statut passe alors de « réservée » à « active ». **Nouveau domaine** : `HN` (Structure Hn), à ajouter aux conventions du PRD avec C6.

### Transversal

#### NFR-MAIN-REQUIREMENTS-TRACE — Toute exigence citée par un test existe par écrit
Un test qui cite une exigence doit pointer vers un texte réel. Sinon, on ne sait plus quel besoin il protège.
**Critères d'acceptation**
- Un ID `FR-`, `NFR-` ou `DESIGN-` cité dans les tests existe dans le PRD, le registre ou l'épopée en cours.
- La dette existante est figée et ne peut que baisser.
- Chaque PR cite les exigences qu'elle livre ou touche.
> **En situation.** Un développeur cite par erreur `FR-LEX-TF-IDF` (au lieu de `FR-LEX-TFIDF`) dans un test. `npm run verify` échoue et lui montre l'ID et le fichier.

**Statut** : livrée par C0 (versée au PRD dans la même PR).

#### NFR-TEST-BEHAVIORAL — Les tests se comportent comme un utilisateur, y compris quand il se trompe
**Critères d'acceptation**
- Chaque porte (§4) a un test négatif : l'action interdite déclenche l'alarme ; une raison trop courte est refusée ; une dérogation tombe quand les données changent.
- Les parcours varient leurs choix : option non première, décocher, recharger, revenir en arrière, panne d'un service.
- Aucune assertion ne peut passer quoi qu'il arrive (`≥ 0`, `return` anticipé silencieux).
- En mode réel, le parcours passe le texte produit dans les mêmes vérificateurs que `npm run verify`.
> **En situation.** Le parcours tente de verrouiller un capitaine sans volume. Le test attend l'alarme 🔴, essaie une raison de 5 caractères (refusée), puis une vraie raison (acceptée, badge 🛡).

**Statut** : active — versée au PRD par C2, **livrée en partie** : tests négatifs des portes (navigateur, contrat, composants) et fin des faux verts faute de serveur. Les parcours qui varient leurs choix et le mode réel repassé dans les vérificateurs suivent avec C5 à C8.

### Vérificateurs et alarme (C2)

#### FR-INFRA-VERIFIER-SHARED — Un même contrôle à l'écran, au serveur et dans l'audit
Une règle de qualité est écrite une seule fois. L'écran s'en sert pour griser un bouton et expliquer pourquoi, le serveur pour refuser, `npm run verify` pour auditer après coup.
**Critères d'acceptation**
- Une règle donne le même verdict aux trois endroits.
- Un refus du serveur renvoie la liste des raisons, dans les mots affichés à l'écran.
- Chaque règle porte un niveau (attention, risque, technique) et l'exigence qu'elle protège.
> **En situation.** Arnaud contourne l'écran par un appel direct à l'API pour verrouiller un capitaine en NO-GO : le serveur refuse avec les mêmes raisons que l'alarme.

**Statut** : active — versée au PRD par C2 (2026-09-25). Texte amendé à la livraison, le PRD fait foi : le serveur est le seul évaluateur (l'écran affiche son verdict au moment du geste, il ne grise pas le bouton à l'avance) ; un `GateIssue` porte un niveau et un nom de règle stable, le rattachement à l'exigence se fait par vérificateur.

#### FR-INFRA-GATE-WAIVER — Passer outre en prenant sa responsabilité, par écrit
**Critères d'acceptation**
- 🟠 : un accusé de lecture suffit. 🔴 : une catégorie et une raison de 20 caractères minimum. ⛔ : aucun passage possible.
- La dérogation est enregistrée (qui, quand, quelle règle, quelle raison) et affichée par un badge 🛡.
- Elle tombe si les données vérifiées changent.
- Toutes les dérogations d'un article sont réaffichées à la publication et listées par `npm run verify`.
> **En situation.** Arnaud verrouille « rénovation grange pierre Gers » sans volume mesuré : « Longue traîne assumée : demandes réelles reçues par téléphone ». Trois semaines plus tard, à la publication, l'outil lui remontre cette dérogation, et il confirme.

**Statut** : active — versée au PRD par C2 (2026-09-25). Texte amendé à la livraison, le PRD fait foi : pas d'auteur enregistré (outil mono-utilisateur) ; badge 🛡 dans l'alarme et dans `npm run verify`, pas encore sur la carte ni dans le récap.

#### FR-CAP-LOCK-GATE — Verrouiller un capitaine déclenche l'alarme quand il est risqué
Elle remplace FR-CAP-VERDICT-INFORMATIVE.
**Critères d'acceptation**
- 🔴 : volume nul ou inconnu, verdict NO-GO, intention de la SERP incompatible avec le type d'article (par exemple une SERP d'agences pour un pilier « guide »).
- 🟠 : autocomplétion vide.
- L'alarme propose d'autres candidats avec un volume mesuré quand il y en a.
> **En situation.** Le pilier « stratégie digitale entreprises Toulouse » : volume inconnu, 9 pages d'agences sur 9. L'alarme explique que Google attend une page de service et propose deux requêtes informationnelles mesurées.

**Statut** : active — versée au PRD par C2 (2026-09-25) ; FR-CAP-VERDICT-INFORMATIVE passée superseded. Texte amendé à la livraison, le PRD fait foi : 🔴 seulement pour un article informationnel face à une SERP commerciale ou transactionnelle, 🟠 pour les autres écarts d'intention ; les alternatives sont les autres candidats explorés pour l'article qui ont un volume mesuré (pas forcément informationnels).

#### FR-LIE-LOCK-GATE — Des lieutenants en nombre suffisant et sans cannibalisation
**Critères d'acceptation**
- 🔴 : moins de lieutenants que le minimum du type d'article (règles de FR-INFRA-TYPE-RULES-SSOT).
- 🔴 : un lieutenant déjà capitaine ou lieutenant d'un autre article du cocon.
> **En situation.** Arnaud coche un seul lieutenant pour un pilier. L'alarme indique que le minimum est de 3 et montre les autres candidats de la SERP.

**Statut** : active — versée au PRD par C2 (2026-09-25). Texte amendé à la livraison, le PRD fait foi : un lieutenant déjà *lieutenant* d'un autre article est 🟠 (seul le capitaine d'un autre article est 🔴) ; vérification silencieuse avec bandeau ; les candidats non retenus ne sont pas encore transmis à l'alarme.

#### FR-RED-PUBLISH-GATE — On ne publie pas un article qu'un expert refuserait
**Critères d'acceptation**
- La publication rejoue les vérificateurs de contenu, de méta et de SEO.
- Capitaine absent du meta title : 🔴 (aujourd'hui simple avertissement).
- Méta tronquée, H1 absent ou multiple : ⛔.
- Marqueurs « à sourcer » restants : 🔴.
- Le récap des dérogations de l'article doit être reconfirmé.
> **En situation.** Le pilier 1013 est rejeté : capitaine absent du H1 (⛔), méta tronquée (⛔), longueur six fois supérieure à la cible (🔴).

**Statut** : active — versée au PRD par C2 (2026-09-25). Texte amendé à la livraison, le PRD fait foi : capitaine absent du H1 = 🔴 (erreur SEO), pas ⛔ ; un H1 absent n'est pas contrôlé (le titre sert de H1), plusieurs H1 dans le corps = ⛔.

#### FR-RED-SEO-SCORE-PERSIST — Le score SEO affiché est enregistré
**Critères d'acceptation**
- Le score SEO et le score GEO sont recalculés par le serveur à chaque sauvegarde et enregistrés.
- La liste des articles et la porte de publication lisent la même valeur que celle affichée.
> **En situation.** Arnaud voit « SEO 72 » dans l'éditeur ; la liste du cocon affiche 72, pas « — ».

**Statut** : active — versée au PRD par C2 (2026-09-25). **Amendée à la livraison**, le PRD fait foi : les scores ne sont pas recalculés par le serveur (les calculateurs vivent à l'écran et dépendent de données chargées dans l'éditeur) ; le score affiché est enregistré avec le texte exact qu'il note, « — » sinon. Aucun écran ne lit encore le score enregistré : `npm run verify` l'affiche.

### Lexique (C3)

#### FR-LEX-METIER-ONLY — Le lexique ne contient que des mots du métier
**Critères d'acceptation**
- Aucun mot vide (articles, pronoms, verbes génériques comme « être » ou « voir »), avec ou sans accent.
- Les menus, en-têtes, pieds de page et bandeaux cookies des pages concurrentes ne comptent pas.
- Aucun terme n'est validé d'office : l'utilisateur choisit.
- Un terme générique déclenche 🔴 à la validation.
> **En situation.** Sur « isolation combles perdus », le lexique propose « laine », « soufflée », « pare-vapeur », « combles »… (des mots isolés : pas encore d'expressions comme « laine soufflée »), et jamais « vos », « nos », « être » ni « cookies ». Aucune case n'est cochée : l'utilisateur choisit.

**Statut** : active — versée au PRD par C3 (2026-09-25), avec FR-LEX-PRECHECK-PERSISTE amendée. Texte amendé à la livraison, le PRD fait foi : 🔴 pour un lexique vide (non prévu ici ; assumable par écrit), et la porte du lexique est rejouée à la publication — un article sans lexique n'y passe donc qu'avec une raison ; la porte est revérifiée à chaque changement du lexique, silencieusement (bandeau « Étape non validée », alarme à la demande) : un terme générique ajouté retire l'étape ; un terme de plusieurs mots n'est générique que si tous ses mots le sont ; les mots ambigus (« site », « blog », « article », « recherche ») restent proposés ; le TF-IDF ne propose que des mots isolés (pas de n-grammes).

### Prompts (C4)

#### FR-INFRA-PROMPT-LAYERS — Des consignes d'IA organisées en couches, sans rien d'écrit en dur
**Critères d'acceptation**
- Chaque consigne se compose de cinq couches : identité, contexte (stratégie, état du cocon, article, mots-clés), règles par type, tâche, contrat de sortie.
- Une variable attendue mais absente, ou fournie mais inutilisée, est une erreur visible en développement et en test.
- Aucune année ni aucun lieu écrit en dur : la date du jour et la zone viennent du contexte.
- Les exemples sont fictifs et ne peuvent pas être recopiés tels quels.
> **En situation.** Arnaud crée un cocon pour un client à Bordeaux. Aucun texte généré ne cite un quartier de Toulouse, et aucun n'annonce « en 2024 ».

**Statut** : réservée — C4.

#### FR-INFRA-TYPE-RULES-SSOT — Une seule définition de ce qu'est un pilier, un intermédiaire, un spécialisé
**Critères d'acceptation**
- Longueur cible, nombre de H2 et H3, FAQ, nombre minimum de lieutenants : une seule source, lue par les consignes d'IA, les calculs et les vérificateurs.
- Un test échoue si deux endroits divergent.
> **En situation.** Arnaud décide qu'un pilier fait 3 000 mots. Il change une valeur ; la recommandation de longueur, la consigne de rédaction et le vérificateur suivent.

**Statut** : réservée — C4.

### Rédaction (C1, C5)

#### FR-RED-META-CAPTAIN — La méta est construite sur le capitaine verrouillé
**Critères d'acceptation**
- La génération de la méta reçoit le capitaine verrouillé de l'article, pas son titre.
- Le meta title contient le capitaine.
- La meta description n'est jamais coupée au milieu d'une phrase par des points de suspension.
> **En situation.** Capitaine « stratégie digitale PME » : le meta title commence par « Stratégie digitale PME : … ».

**Statut** : **livrée** par C1 (`fix/redaction-meta-contexte`), versée au PRD le 2026-09-24.

#### FR-RED-DRAFT-SINGLE-PASS — Le premier jet s'écrit d'un seul tenant
Il remplace FR-RED-ARTICLE.
**Critères d'acceptation**
- L'article est rédigé en un seul appel, qui voit tout le plan et le contexte du cocon.
- La progression reste visible section par section.
- Une coupure reprend là où le texte s'est arrêté, sans tout perdre.
- Le vérificateur du premier jet contrôle :
  - la longueur totale et par section ;
  - le capitaine dans le H1 et l'introduction ;
  - la langue ;
  - les répétitions.
> **En situation.** Pilier de 2 650 mots : le premier jet en fait 2 700, sans répétition, avec une seule conclusion et un seul appel à l'action.

**Statut** : réservée — C5.

#### FR-RED-DRAFT-TO-SOURCE — Le premier jet n'invente aucun chiffre
**Critères d'acceptation**
- Là où un chiffre serait utile, le premier jet pose un marqueur visible « à sourcer ».
- Un chiffre sans source hors marqueur déclenche 🔴.
> **En situation.** « [à sourcer : part des recherches locales sur mobile] » apparaît surligné dans l'éditeur, en attendant la passe Sources.

**Statut** : réservée — C5.

#### FR-RED-ENRICH-SOURCES — Des sources françaises, datées, avec leur lien
**Critères d'acceptation**
- La passe Sources remplace chaque marqueur par un chiffre sourcé : recherche localisée en France, date du jour connue, lien conservé.
- Chaque proposition est acceptée ou refusée par l'utilisateur.
- Si le fournisseur capable de chercher sur le web est indisponible, la passe échoue en le disant, au lieu de produire du texte sans source.
> **En situation.** Le marqueur devient une phrase du type « X % des recherches locales se font sur mobile (nom de l'organisme, 2026) », avec le lien vers l'étude. Aucune phrase en anglais n'a été recopiée.

**Statut** : réservée — C5.

#### FR-RED-ENRICH-PASSES — Enrichir l'article par passes successives
**Critères d'acceptation**
- Après le premier jet, des passes séquentielles : sources, exemples, tableaux, images (emplacement et texte alternatif), FAQ.
- Chaque passe a son vérificateur et ses propositions, acceptées ou refusées section par section.
- L'éditeur accepte les tableaux et les images.
> **En situation.** La passe Tableaux transforme la comparaison agence/indépendant en tableau ; Arnaud l'accepte, puis refuse la FAQ proposée.

**Statut** : réservée — C5.

#### FR-RED-SECTION-REWRITE — Réécrire une section en voyant tout l'article
**Critères d'acceptation**
- Une section peut être réécrite seule, avec l'article entier en contexte, pour corriger sa longueur ou son contenu.
- La génération complète section par section est archivée.
> **En situation.** La section « Coûts » est trop longue : Arnaud la réécrit seule, et elle ne répète pas ce que dit déjà la section « Audit ».

**Statut** : réservée — C5.

#### FR-RED-LANG-REVIEW — Une relecture de la langue avant publication
**Critères d'acceptation**
- La passe de relecture signale et corrige les phrases non françaises, le franglais et les fautes d'accord.
- Une phrase non française restante déclenche 🔴 à la publication.
> **En situation.** « Donc you must focus » est signalée et réécrite en « Concentrez-vous donc sur un canal ».

**Statut** : réservée — C5.

#### FR-RED-LINKING-MANUAL — Le maillage interne se pose à la main, après la rédaction
Il remplace FR-RED-INTERNAL-LINKING.
**Critères d'acceptation**
- Les liens se posent après la rédaction, avec des suggestions de l'outil.
- Un pilier propose une ancre par enfant existant.
- Les liens vers des articles non publiés sont signalés.
> **En situation.** L'intermédiaire « audit de site » vient d'être publié. Arnaud ouvre le pilier, et l'outil propose de relier son résumé « Audit » à ce nouvel article.

**Statut** : réservée — C5.

### Structure Hn (C6)

#### FR-HN-TAB — La structure de l'article a son propre onglet
Il remplace FR-LIE-HN-STRUCTURE.
**Critères d'acceptation**
- L'ordre des onglets devient : Capitaine → Lieutenants → Structure → Lexique.
- La structure est proposée **à partir des lieutenants retenus** et du contexte du cocon.
- Le H1 proposé est conservé jusqu'à la rédaction.
> **En situation.** Arnaud verrouille 4 lieutenants, puis ouvre Structure : les H2 proposés reprennent ces 4 lieutenants, et le H1 contient le capitaine.

**Statut** : réservée — C6.

#### FR-HN-LOCK-GATE — Une structure conforme au type d'article
**Critères d'acceptation**
- Capitaine absent du H1 : ⛔.
- Nombre de H2 hors des règles du type : 🔴.
- Pour un pilier : un H2 qui traite en profondeur le sujet d'un enfant existant, au lieu de le résumer, déclenche 🔴.
> **En situation.** La structure d'un pilier propose 12 H2 ; l'alarme rappelle que le pilier en compte 6 à 8 et que « Audit de site » est déjà un article enfant.

**Statut** : réservée — C6.

### Cocon (C7)

#### FR-CER-COCOON-PROGRESSIVE — Le cocon se construit article par article
Il remplace FR-CER-BATCH-CREATE.
**Critères d'acceptation**
- Dans un cocon vide, seul un pilier peut être créé.
- Les autres articles sont créés un par un.
- L'ancienne proposition de plan complet n'est plus qu'une carte indicative.
> **En situation.** Arnaud démarre un cocon « Rénovation énergétique ». Il ne peut créer que le pilier ; les enfants viendront de sa structure.

**Statut** : réservée — C7.

#### FR-CER-PARENT-WRITTEN-GATE — Pas d'enfant tant que le parent n'est pas rédigé
**Critères d'acceptation**
- Un intermédiaire ne peut être créé que sous un pilier rédigé, et un spécialisé que sous un intermédiaire rédigé (premier jet vérifié).
- Sinon, l'alarme explique ce qui manque.
> **En situation.** Arnaud veut créer un spécialisé alors que son intermédiaire n'a que son plan. L'outil lui propose de rédiger d'abord l'intermédiaire.

**Statut** : réservée — C7.

#### FR-CER-CHILD-FROM-PILLAR-H2 — Chaque enfant naît d'une section de son parent
**Critères d'acceptation**
- On crée un enfant à partir d'un H2 de son parent.
- Dans le parent, ce H2 est un résumé de 150 à 250 mots qui renverra vers l'enfant.
- L'enfant connaît le résumé qui l'annonce.
> **En situation.** Le H2 « Audit de site » du pilier devient l'intermédiaire « Auditer son site web ». Le pilier garde 200 mots de résumé et gagnera un lien.

**Statut** : réservée — C7.

#### FR-CER-KEYWORD-REAL-DATA — Le mot-clé d'un nouvel article se choisit sur des données réelles
**Critères d'acceptation**
- L'IA propose 3 à 5 mots-clés.
- L'outil récupère leur volume et leur SERP (cache d'abord), et l'utilisateur choisit sur ces données.
- Aucun mot-clé n'est enregistré sans avoir été mesuré.
> **En situation.** Pour l'enfant « Audit de site », trois candidats s'affichent avec volume, difficulté et nature de la SERP ; Arnaud choisit le seul qui présente des guides.

**Statut** : réservée — C7.

#### FR-INFRA-COCOON-CONTEXT — Chaque génération connaît l'état du cocon
**Critères d'acceptation**
- Le Cerveau, le Moteur et la Rédaction reçoivent le même contexte : articles du cocon, capitaines, lieutenants, structures, résumés, statut de rédaction.
- La stratégie validée du cocon est toujours transmise à la rédaction.
> **En situation.** En rédigeant le pilier, l'IA sait que « Audit de site » est un enfant existant et le résume au lieu de le traiter en profondeur.

**Statut** : réservée — C7 (branchement de la stratégie dès C1).

## 7. Exigences remplacées ou amendées

| Exigence | Devient | Par | Chantier |
|---|---|---|---|
| FR-CAP-VERDICT-INFORMATIVE | superseded ✅ (PRD et registre, 2026-09-25) | FR-CAP-LOCK-GATE | C2 |
| FR-CAP-CHECK, FR-LIE-CHECK, FR-CAP-AUTO-NOGO | amendées ✅ (l'étape passe par la porte ; un NO-GO se verrouille par dérogation) | — | C2 |
| FR-LEX-PRECHECK-PERSISTE | amendée ✅ (PRD et registre, 2026-09-25 : plus aucun terme coché d'office, chaque geste enregistré, l'étape passe par la porte du lexique) | FR-LEX-METIER-ONLY | C3 |
| FR-LEX-SELECT, FR-LEX-CHECK, FR-LEX-CHECKBOX-LOCK-IMMEDIATE | amendées ✅ (fin du pré-cochage des Obligatoires ; l'étape passe par la porte du lexique) | — | C3 |
| FR-RED-PUBLISH-GATE, FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER | amendées ✅ (la porte du lexique rejoint les portes, rejouée à la publication) | — | C3 |
| FR-RED-ARTICLE | superseded | FR-RED-DRAFT-SINGLE-PASS | C5 |
| FR-RED-INTERNAL-LINKING | superseded | FR-RED-LINKING-MANUAL | C5 |
| FR-LIE-HN-STRUCTURE | superseded | FR-HN-TAB | C6 |
| FR-CER-BATCH-CREATE | superseded | FR-CER-COCOON-PROGRESSIVE | C7 |
| FR-MOT-CHECKS, FR-MOT-PHASES, FR-LIE-CHECK | amendées (étape Structure) | — | C6 |
| FR-INFRA-PROMPT-LOADER | amendée (mode strict) | — | C4 |

## 8. Checklist des petites erreurs

**C1** = correctif rapide ; sinon, le chantier qui l'absorbe.

**Cerveau**
- [x] C1 · K1 — *(PR `fix/cerveau-mots-cles`)* `keywords_seo` est unique pour toute la base (`data.service.ts:568-575`) et l'erreur 409 est avalée (`useArticleProposals.ts:200`) : le mot-clé du pilier est perdu.
- [x] C1 · K2 — *(PR `fix/cerveau-mots-cles`)* Types écrits en minuscules (`intermediaire`), alors que les consommateurs attendent `'Pilier'` (`brief.store.ts:47,77`, `editor.store.ts:117`, `outline.store.ts:88`, `keyword-assignment.service.ts:30-32`).
- [x] C1 · K3 — *(PR `fix/cerveau-mots-cles`)* Ajout d'article : type envoyé en minuscules (`useArticleProposals.ts:113`) mais comparé à `'Pilier'` (`strategy.routes.ts:400-402`).
- [x] C1 · K4 — *(PR `fix/cerveau-mots-cles`)* `strategy.routes.ts:412` : `'$1'.replace(...)` laisse `{{userInput}}` brut.
- [ ] C4 · K5 — Prompts chargés par `.replace`, qui ne remplace que la première occurrence (`strategy.routes.ts`, `silos.routes.ts`).
- [ ] C7 · K6 — Doublons détectés seulement sur un slug identique (`data.service.ts:496`) ; pas de colonne parent ; `editTitle` ne met pas à jour les enfants.
- [ ] C4 · K7 — Exemple recopiable répété trois fois (`cocoon-articles.md:64,83,108`).

**Moteur**
- [x] C1 · M1 — *(PR `fix/moteur-intention-hn`)* Bug de casse `intentMap.get(keyword)` (`keyword-scan.routes.ts:116`).
- [ ] C2 · M2 — `intentTypes: []` et `painIntentExpected` jamais envoyé (`keyword-scan.routes.ts:185,260-266`). *(Toujours ouvert pour le scan. La porte capitaine, elle, compare déjà l'intention de la SERP à l'intention attendue de l'article — règle `captain-intent-mismatch`, lue dans `articles.pain_intent_expected`.)*
- [ ] C2 · M3 — `keyword_intent_analyses` n'a plus de producteur : à réactiver ou à supprimer.
- [x] C3 · M4 — *(branche `fix/lexique-metier`, FR-LEX-METIER-ONLY)* Mots vides incomplets, `'etre'` sans accent (`tfidf.service.ts:5-13`). La liste locale est remplacée par une source unique, `shared/utils/generic-terms.ts` (mots grammaticaux et décor de page, comparés sans accents) ; `tokenize` filtre avec `isGenericWord` et garde l'accent en sortie. Tests : `generic-terms.test.ts`, `tfidf.test.ts` (« être », présent chez tous les concurrents, n'est plus obligatoire).
- [x] C3 · M5 — *(branche `fix/lexique-metier`, FR-LEX-METIER-ONLY)* Menus et pieds de page aspirés (`scrape-corpus.service.ts:173-188`). `extractTextContent` ne garde que le contenu principal (`<main>`, sinon les `<article>`, sinon la page), sans nav, header, footer, aside, form ni bandeaux cookies / consentement / newsletter reconnus à leur id ou class ; dans un `<article>`, l'en-tête (le titre) est gardé. Les textes déjà enregistrés gardent leur décor jusqu'au prochain scrape (SERP de plus de 7 jours) ; le TF-IDF écarte de toute façon ces mots. Tests : `scrape-corpus.service.test.ts`.
- [x] C1 · M6 — *(PR `fix/moteur-intention-hn`)* Filtre de récurrence ≥ 10 % inopérant (`useLieutenantsIa.ts:258,286`).
- [ ] C6 · M7 — Structure proposée avant le choix des lieutenants ; une seule case suffit à valider (`LieutenantsPanel.vue:189-191`).
- [x] C1 · M8 — *(PR `fix/moteur-intention-hn`)* `hnToOutline` rabote le H1 (`outline.store.ts:15,23`).
- [x] C1 · M9 — *(PR `fix/moteur-intention-hn`)* `recommend-word-count` attend `{level:'H1', title}`, alors que la base stocke `{level:number, text}` (`articles.routes.ts:266-270`).
- [ ] C4 · M10 — Cibles de mots et nombres de H2 contradictoires entre le code et les prompts.
- [x] C3 · M11 — *(branche `fix/lexique-metier`, FR-LEX-METIER-ONLY, FR-LEX-PRECHECK-PERSISTE amendée)* Le lexique se valide seul (`useLexiqueLocking.ts:59-80`). Plus aucun pré-cochage : ni après le TF-IDF (`LexiquePanel.vue` affiche ce qui est enregistré), ni à la fin de l'analyse IA (`useLexiqueIa.ts` recommande en badges, sans `selectedTerms` ni `onPreChecked`) ; `lockMany` supprimé. Un terme ajouté depuis le panneau d'aide est désormais enregistré. L'étape passe par la porte `lexique-lock` (`shared/verifiers/lexique.ts` : 🔴 vide, 🔴 terme générique ; 422 `GATE_BLOCKED`), revérifiée à chaque changement du lexique (`LexiquePanel.vue` : vérification silencieuse après enregistrement, bandeau `lexique-gate-banner`, alarme à la demande) et rejouée à la publication ; l'écran suit toujours le lexique enregistré (watcher sur `lockedTerms` : au rechargement, les termes enregistrés ne s'affichent plus décochés) ; `pick-lexique.ts` n'emporte plus de terme générique. Tests : `lexique-extraction.test.ts`, `lexique-precheck-persiste.test.ts`, `lexique-gate.test.ts`, `verifiers-lexique.test.ts`, `gates.contract.test.ts`, `lexique.parcours.test.ts` (étape ⑧) et le helper `validerLexique`, `pick-lexique.test.ts`.
- [x] C2 · M12 — *(branche `feat/verificateurs-alarme`)* `MoteurView.vue` `articleLevelForLieutenants` indexait une table `{ Pilier, Cluster, Support }` qui ne reconnaissait aucun niveau réel : tous les piliers recevaient des lieutenants « intermédiaire ». Corrigé par `parseArticleLevel` ; garde `tests/unit/architecture/article-level-names.test.ts`.
- [x] C2 · M13 — *(branche `feat/verificateurs-alarme`)* `CaptainPanel.vue` : `lockedKeyword` et `carousel` étaient déclarés après des watchers `immediate` qui les lisent. Ouvert sur un capitaine déjà verrouillé, le panneau levait « Cannot access 'lockedKeyword' before initialization », masqué en production par le gestionnaire d'erreurs de Vue. Déclarations remontées ; couvert par `tests/unit/components/captain-lock-gate.test.ts`.
- [ ] C4 · M15 — Le lexique modifié depuis la Rédaction (`ArticleKeywordsPanel.vue` : ajout manuel, suggestion qui remplace le lexique) n'a ni filtre des mots génériques ni porte ; seule la publication rattrape ces termes.
- [ ] C3 · M16 — Les explorations de lexique enregistrées avant C3 ne sont pas refiltrées (elles peuvent encore afficher « être »).
- [ ] C4 · M17 — Aligner les autres listes de mots vides du code sur `shared/utils/generic-terms.ts` (keyword-roots, french-nlp, keyword-matcher, word-groups, long-tail-combinator, intent-scan, linking, seo-validators, `scripts/auto-article/text.ts`, pain-point-jaccard).

**Rédaction**
- [ ] C5 · R1 — `sectionBudgetHint` et `sectionPosition` jamais utilisés ; `wordCountBudget` contient le total de l'article (`article.routes.ts:153-158`).
- [x] C1 · R2 — *(PR `fix/redaction-meta-contexte`)* `microContext` passé au sommaire mais inutilisé (`outline.routes.ts:62`).
- [x] C1 · R3 — *(PR `fix/redaction-meta-contexte`)* Méta construite sur le titre au lieu du capitaine (`useArticleGeneration.ts:108-109`, `editor.store.ts:117-123`).
- [x] C1 · R4 — *(PR `fix/redaction-meta-contexte`)* Méta coupée avec « ... » (`meta.routes.ts:86-88`), alors que le valideur classe ce cas en erreur.
- [x] C1 · R5 — *(PR `fix/redaction-meta-contexte`)* `strategy_context` vide en rédaction : `cocoon_strategies` n'est jamais lu (`article.routes.ts:76,107`).
- [ ] C5 · R6 — Recherche web sans lieu ni date, citations jetées (`claude.service.ts:111-115`, `claude-stream.ts:66`).
- [ ] C5 · R7 — `generate-article-section.md:44` impose la recherche web, même quand elle est désactivée.
- [x] C1 · R8 — *(PR `fix/redaction-meta-contexte`)* Seul le modèle de la dernière section est enregistré (`article.routes.ts:221`).
- [ ] C5 · R9 — Recherche web perdue lors d'un repli vers un autre fournisseur (`ai-provider.service.ts:264-270`).
- [ ] C5 · R10 — Format autorisé sans `<a>`, `<table>` ni `<img>` ; TipTap sans extension Table ni Image.
- [ ] C4 · R11 — Dates et quartiers écrits en dur (`system-propulsite.md:5,22,31,32,41,49`).
- [x] C1 · R12 — *(PR `fix/redaction-meta-contexte`)* `selectedText` non échappé (`action.routes.ts:41`).
- [ ] C5 · R13 — La brief récupère les questions PAA du mot-clé **pilier du cocon** (`brief.store.ts:77`), pas du capitaine de l'article : un intermédiaire est rédigé avec les questions du pilier.

**Publication et score**
- [x] C2 · P1 — *(branche `feat/verificateurs-alarme`, FR-RED-SEO-SCORE-PERSIST)* Scores SEO et GEO jamais enregistrés (`editor.store.ts:252-256`). Désormais enregistrés avec le texte exact qu'ils notent, « — » sinon.
- [x] C1 · P2 — *(PR `fix/redaction-meta-contexte`)* `phase` jamais mise à jour, car `saveProgress` n'est jamais appelé (`article-progress.store.ts:36`).
- [x] C2 · P3 — *(branche `feat/verificateurs-alarme`, FR-RED-PUBLISH-GATE)* Publication sans contrôle (`articles.routes.ts:90-113`). Le passage au statut « publié » est refusé en 422 `GATE_BLOCKED` tant que la porte ne passe pas ; l'aperçu publie avant de télécharger.
- [x] C1 · P4 — *(PR `fix/redaction-meta-contexte`)* `seo.store.ts:52` passe `String(articleId)` à la place du slug.
- [x] C2 · P5 — *(branche `feat/verificateurs-alarme`)* Capitaine absent du meta title : simple avertissement (`seo-validators.ts:124-126`). Il devient 🔴 à la publication, et le capitaine doit figurer en entier (couverture 1 au lieu de 0,75) dans le H1 et le meta title.

**Prompts et docs**
- [ ] C4 · D1 — Prompts morts : `generate-article.md`, `pain-translate.md`.
- [ ] C4 · D2 — `loadPrompt` ne signale ni variable manquante ni variable inutilisée (`prompt-loader.ts:119-122`).
- [ ] C4 · D3 — `docs/prompts-reference.md` et `docs/testing-guide.md` périmés.
- [x] C0 · D4 — FR LEX en double dans le PRD : critères techniques déplacés au registre, doublons retirés.

**Configuration** (hors Git, correction manuelle)
- [ ] E1 — `.env` : `GEMINI_MODEL=GEMINI_MODEL=gemini-3.6-flash`.

**Intégration continue**
- [ ] CI1 — *(branche `ci/reparer-pipeline` — réparée ; **premier passage vert attendu à l'ouverture des PR**)* **La CI était rouge à chaque passage depuis au moins le 2026-05-13** : (1) `npm ci` échouait sous Node 20 / npm 10 sur un lock écrit par npm 11 (« Missing: @emnapi/runtime… ») → Node 24 ; (2) la création des tables bouclait sur `server/db/migrations/*.sql`, archivées depuis mai → schéma rejouable `server/db/bootstrap.sql` (`npm run db:bootstrap`, régénéré par `db:snapshot`, synchronisation gardée par un test d'architecture), PostgreSQL 18 ; (3) le job navigateur attendait le serveur sur 3400 alors que son `.env` le lançait sur 3005 → ports dédiés ; (4) « type-check » lançait `tsc --noEmit` à la racine, qui ne vérifie rien → `npm run verify:types` ; (5) le job intégration lançait le serveur sur 3005 alors qu'une douzaine de tests visent 3400 en dur → 3400.
- [x] CI2 — *(branche `ci/reparer-pipeline`)* Chaque `npx vitest` basculait le mode du serveur de développement de l'utilisateur (globalSetup), puis l'effaçait : il ne touche plus à un serveur forcé en réel, restaure le réglage d'origine, et un serveur forcé en réel compte comme indisponible pour les tests HTTP (aucun appel payant par accident).
- [ ] T10 — Le serveur de test Playwright utilise la même base PostgreSQL que le serveur de développement (données de test préfixées `[test:…]` et nettoyées, mais présentes pendant l'exécution). À isoler dans une base dédiée créée par `bootstrap.sql`.
- [ ] T9 — `tests/unit/services/data.service.test.ts` lit les **données** de la base de développement (« le premier cocon est Croissance digitale Toulouse ») : ni portable en CI unitaire (pas de base) ni en intégration (base vide). Exclu du job unitaire ; à réécrire avec des fixtures.

**Tests**
- [x] C1 · T1 — *(PR `test/hygiene-parcours`, finalisé dans `ci/reparer-pipeline` : la retouche est effacée par double-clic sur le mot ajouté ; parcours bout-en-bout 12/12 sur les ports dédiés le 2026-09-25)* Le parcours tape « Relu. » dans l'introduction réelle (`bout-en-bout.parcours.test.ts:298-301`).
- [ ] C2 · T2 — 46 `it.skip` (`captain-validation.test.ts`), plus des `describe.skip` sur le verrouillage des lieutenants et du lexique. *2026-09-25 : les 46 `it.skip` du capitaine sont retirés (ils visaient une mise en page disparue) ; le verrou et le déverrouillage sont couverts par `captain-lock-gate.test.ts` ; cliquet `itSkip` 91 → 42. Restent les `describe.skip` Lieutenants/Lexique, à réécrire avec C6 (onglet Structure).*
- [ ] C2 · T3 — Assertions toujours vraies et 15 `return` anticipés. *Plafonnées par le cliquet depuis `test/hygiene-parcours` : 31 `toBeGreaterThanOrEqual(0)`, 10 `typeof … 'boolean'`.* *2026-09-25 : les 21 occurrences de `tests/unit` réécrites en valeurs exactes calculées depuis le code (cliquet 31 → 12 et 10 → 8). Restent celles des tests contre serveur ou navigateur, et les assertions conditionnelles (`if (score >= 70) expect…`, cliquet `conditionalSilent`).*
- [ ] C3 · M14 — `server/services/keyword/captain-relevance.service.ts:86-92` (`painPointToWords`) garde la ponctuation : « toulouse. » ne correspond jamais à « toulouse ». Le signal PAA × douleur en est sous-évalué (50 au lieu de 60 dans `captain-relevance-haiku-override.service.test.ts`, figé tel quel). Trouvé par T3.
- [ ] C4 · T11 — `tests/unit/coherence/intent.test.ts:84-98` vérifie une **copie locale** de `intentValueToPseudoScore` qui diverge du vrai code (`shared/scoring-kpi.ts` : autre échelle, autres valeurs, autres types) : le fichier ne prouve rien sur la production. À brancher sur la fonction réelle (l'exporter). Trouvé par T3.
- [x] C2 · T7 — **362 tests** de contrat et de parcours API commencent par `if (requireServer().skip) return` : sans serveur, ils sortent **verts** sans rien vérifier au lieu d'apparaître ignorés. *Fait le 2026-09-25 : les 362 deviennent `skip()` (contexte du test Vitest — `it.skipIf` était impossible, le serveur n'étant connu qu'au `beforeAll`) ; cliquet à 0.*
- [x] C2 · T8 — *(branche `ci/reparer-pipeline` : ports dédiés 3410 / 5410, `pretest:browser` ne coupe plus le serveur de dev, `setMockMode` refuse de basculer un serveur forcé en réel)* Les tests navigateur **réutilisaient le serveur de développement** (`reuseExistingServer`) et changent son **mode global** (simulé ou réel). Vu le 2026-09-24 : un mode réel posé pendant un parcours simulé l'a fait appeler la vraie IA (~0,02 $). L'inverse est aussi possible : un utilisateur qui travaille en parallèle voit apparaître des données simulées. À corriger : ports dédiés aux tests, ou refus de démarrer si le mode du serveur est forcé.
- [x] C2 · T4 — La simulation `propose-lieutenants` renvoie toujours « plombier ». *Fait le 2026-09-25 : les lieutenants simulés dérivent du capitaine demandé (garde `tests/unit/services/mock-propose-lieutenants.test.ts`). Les parcours retiennent désormais le minimum de lieutenants du type, pas seulement le premier.*
- [x] C1 · T5 — *(PR `test/hygiene-parcours`, test d'architecture `moteur-tabs-helper`)* Le helper `MOTEUR_TABS` liste 5 onglets sur 6 (`moteur-ui.ts:81`).
- [ ] Dette figée par C0 : 29 IDs cités par des tests mais absents du PRD (`requirements-trace.test.ts`, `LEGACY_ORPHANS`). **27** après `fix/cerveau-mots-cles` (FR-CER-CREATION-HONNETE et FR-CER-TYPE-TOLERANT écrites).
- [x] C2 · T6 — `tests/e2e-workflows/moteur.workflow.test.ts` « U5 TTL » compare deux durées (`e2 < e1 × 1,5`) : rouge au hasard (vu le 2026-09-24, vert 3 fois sur 3 en relance). Un test de cache doit vérifier qu'aucun appel externe n'est refait, pas un chronomètre. Même défaut dans `tests/e2e-workflows/cross-workflow.e2e.test.ts` « Cache cross-article » (`t2 < t1 × 2`), rouge une fois le 2026-09-24, vert 3 fois sur 3 en relance. *Fait le 2026-09-25 : les deux tests prouvent le cache par la réponse (`fromCache` faux puis vrai) et, pour U5, par une date de mesure inchangée en base ; plus aucun chronomètre.*

## 9. Journal

| Date | Chantier | Événement |
|---|---|---|
| 2026-09-24 | — | Analyse du pilier 1013, puis validation du programme avec Arnaud |
| 2026-09-24 | C0 | Épopée, modèle de PR, cliquet `requirements-trace`, dédoublonnage des FR LEX |
| 2026-09-24 | C1 | `fix/cerveau-mots-cles` : K1-K4 corrigés ; FR-CER-CREATION-HONNETE et FR-CER-TYPE-TOLERANT versées au PRD (cliquet 29 → 27) ; FR-INFRA-KEYWORDS-SEO durcie |
| 2026-09-24 | C1 | `fix/moteur-intention-hn` : M1, M6, M8, M9 corrigés ; FR-RED-OUTLINE, FR-CER-WORD-COUNT-RECOMMEND, FR-LIE-HN-STRUCTURE, FR-CAP-RELEVANCE-INTENT-SIGNAL durcies |
| 2026-09-24 | C1 | `fix/redaction-meta-contexte` : R2-R5, R8, R12, P2, P4 corrigés ; **FR-RED-META-CAPTAIN livrée** (première exigence réservée versée au PRD) ; FR-RED-META, FR-CER-MICRO-CONTEXT, FR-RED-ARTICLE, FR-MOT-RECAP-PUBLISHED, FR-RED-SEO-LIVE, NFR-SEC-PROMPT-INJECTION durcies |
| 2026-09-24 | C1 | `test/hygiene-parcours` : T1 (la retouche du parcours est annulée et vérifiée absente en base ; validation finale en CI), T5 (test d'architecture onglets), cliquet étendu à trois faux verts ; T7 et T8 découverts |
| 2026-09-25 | CI | `ci/reparer-pipeline` : la CI, rouge depuis mai, est réparée (Node 24, bootstrap.sql, PostgreSQL 18, ports) ; tests navigateur isolés du serveur de développement (T8) ; T9 découvert |
| 2026-09-24 | — | Pendant une exécution passée en mode réel, l'IA du Cerveau a **de nouveau** recopié l'exemple de `cocoon-articles.md` (« Stratégie digitale pour entreprises toulousaines », slug `strategie-digitale-entreprises-toulouse`, déjà pris par le 1013) : le pilier n'a pas pu être créé. Nouvelle preuve pour K7 (C4) |
| 2026-09-25 | C2 | `feat/verificateurs-alarme` (PR à ouvrir) : portes de qualité et alarme graduée. Vérificateurs purs partagés (`shared/verifiers/` : capitaine, lieutenants, publication ; règles par type dans `shared/constants/article-type-rules.ts`) ; serveur seul évaluateur (`gate.service.ts`), refus 422 `GATE_BLOCKED` sur les étapes capitaine / lieutenants et la publication ; dérogations motivées en table `gate_waivers`, liées à une empreinte des données ; alarme globale unique (`GateAlarm.vue`). Scores SEO/GEO enregistrés avec le texte qu'ils notent. `verify:content` rejoue la porte de publication (le vrai 1013 est refusé) et liste dérogations et scores ; `auto:article` s'arrête sur un refus sans jamais déroger. P1, P3, P5 soldés ; M12 et M13 corrigés au passage. **Versées au PRD et au registre** : FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-RED-PUBLISH-GATE, FR-RED-SEO-SCORE-PERSIST (amendée : pas de recalcul serveur) ; FR-CAP-VERDICT-INFORMATIVE superseded ; FR-CAP-CHECK, FR-LIE-CHECK, FR-CAP-AUTO-NOGO amendées. NFR-TEST-BEHAVIORAL versée ensuite (livrée en partie) |
| 2026-09-25 | C2 | Tests : un test négatif navigateur par porte (`gates.browser.test.ts` : alarme, raison trop courte refusée, dérogation qui tombe, ⛔ non dérogeable) ; parcours qui répondent à l'alarme comme un utilisateur qui assume (`helpers/gate-alarm.ts`) ; T2 (capitaine), T4, T7 soldés ; **NFR-TEST-BEHAVIORAL versée au PRD** (livrée en partie). Revue de la doc : une dérogation tombée n'est plus réaffichée à la publication (`standingWaivers`) |
| 2026-09-25 | C2 | Revue du diff par un agent, corrections : la publication rejoue les portes capitaine et lieutenants (une dérogation tombée fait revenir l'alerte au lieu de la faire disparaître) ; empreinte des lieutenants limitée aux mots-clés qui recoupent ; un identifiant par occurrence d'alerte (deux chiffres invérifiables = deux dérogations) ; `PUT /progress` ne contourne plus les portes ; 404 au lieu de 500 ; alarme fermée au changement de page et `lockEntry` protégé contre un changement d'article, retour à l'état d'avant si l'enregistrement échoue ; alarme accessible (fond inerte, focus gardé et rendu, champs nommés) ; une seule vérification quand le lieutenant qui active l'étape est coché ; score calculé pendant une sauvegarde envoyé à la fin ; `auto:article` enregistre chaque décision avant de demander l'étape (sinon la porte jugeait un capitaine absent) |
| 2026-09-25 | C3 | `fix/lexique-metier` (PR à ouvrir) : lexique métier. Source unique des mots génériques (`shared/utils/generic-terms.ts`), branchée sur le TF-IDF (M4), la porte et le mode automatique ; texte principal des pages concurrentes seulement (M5) ; plus aucune validation d'office, l'IA recommande sans cocher (M11) ; porte `lexique-lock` (⛔ lexique vide, 🔴 un terme générique par alerte), qui garde l'étape « Lexique validé » et est rejouée à la publication. **Versée au PRD et au registre** : FR-LEX-METIER-ONLY ; FR-LEX-PRECHECK-PERSISTE amendée (critère « termes pré-cochés enregistrés » remplacé) ; FR-LEX-SELECT, FR-LEX-CHECK, FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-RED-PUBLISH-GATE, FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER amendées ; `docs/data-flows/lexique.md` réécrit. Restes : pas de n-grammes ; les autres listes de mots vides du code (keyword-roots, keyword-matcher, word-groups, long-tail, intent-scan, linking, seo-validators) ne sont pas encore alignées sur la source unique ; l'étape n'est redemandée à la porte qu'au passage d'un lexique vide à non vide ; le lexique édité depuis la Rédaction (section « Mots-clés », suggestion IA comprise) échappe au filtre et à la porte jusqu'à la publication (limites consignées dans `DESIGN-LEX-METIER-ONLY`). Découvert en documentant, antérieur à C3 : au rechargement, les termes enregistrés s'affichent décochés quand le TF-IDF est restauré depuis la base, et cliquer l'un d'eux le retire de la base (`DESIGN-LEX-PRECHECK-PERSISTE`, limite connue) |
| 2026-09-25 | C3 | Corrections après revue de la documentation : `lexique-empty` passe de ⛔ à 🔴 (un lexique vide s'assume avec une raison, à l'étape comme à la publication) ; la porte du lexique est revérifiée à **chaque** changement du lexique, sur le modèle des lieutenants (`LexiquePanel.vue` : enregistrement puis vérification silencieuse, bandeau « Étape non validée » et bouton « Voir pourquoi / décider », un terme générique ajouté après coup retire l'étape, vérifications sérialisées) — test `lexique-gate.test.ts` ; l'écran suit toujours le lexique enregistré (watcher sur `lockedTerms`) : au rechargement, les termes enregistrés ne s'affichent plus décochés et un clic ne les retire plus par erreur (défaut antérieur à C3) ; le helper navigateur `validerLexique` et l'étape ⑧ du parcours Lexique répondent au bandeau puis à l'alarme. PRD, registre et `docs/data-flows/lexique.md` alignés ; restes consignés en checklist : M15, M16, M17 |
