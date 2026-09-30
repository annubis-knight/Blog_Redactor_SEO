---
status: référence
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Tests et outillage

*Exigences : `NFR-MAIN-TESTS-VITEST`, `NFR-MAIN-TESTS-PLAYWRIGHT`, `NFR-MAIN-REQUIREMENTS-TRACE`,
`NFR-MAIN-TOOLING`, `NFR-MAIN-CHECK-HEALTH`, `NFR-MAIN-NO-CYCLES`, `NFR-TEST-BEHAVIORAL`,
`FR-EXT-TESTS-NO-COST`, `NFR-CFG-APP-PORTS`, `NFR-CFG-PORT-PREFLIGHT`*

Ce chapitre dit où vivent les tests, ce que chaque famille garde, comment les lancer, et qui paie
quand ils tournent. Le détail des mécanismes transverses (configuration Vitest et Playwright, règles
ESLint, dependency-cruiser) est dans [Qualités transverses](21-qualites.md), sections « Outillage et
commandes de vérification » et « Suites de tests et cliquets ». Le coût des suites est aussi décrit,
côté intégrations, dans [Intégrations externes](18-integrations.md) (« Coût des suites de tests »).

## Le principe : le parcours de l'utilisateur d'abord

Un test répond à une question d'utilisateur : « est-ce que je peux faire ce que je veux faire, aujourd'hui,
après un rechargement, après un changement d'article ? ». La couverture de code n'est pas un objectif.

Deux parcours passent avant tout :
- **créer un article de A à Z** : Cerveau (stratégie du cocon, articles), Moteur (Découverte, Radar,
  Capitaine, Lieutenants, Structure, Lexique, Finalisation), Rédaction (brief, premier jet, méta, publication) ;
- **revenir sur un article en cours** et retrouver son état exact, même après un rechargement ou un
  changement d'article.

Ce qui n'est pas prioritaire : les branches défensives inatteignables, les cas qu'un utilisateur ne
rencontre jamais, la performance interne invisible.

## Les familles de tests

Deux outils font tourner les tests. **Vitest** lance tout ce qui n'a pas besoin d'un vrai navigateur.
**Playwright** pilote un vrai navigateur (Chromium) contre un vrai serveur.

| Famille | Dossier | Fichiers | A besoin de | Lancée par |
|---|---|---|---|---|
| Unitaires | [`../tests/unit/`](../tests/unit/) | 427 | rien | `test:unit`, `test:check`, CI `unit` ; une partie dans `verify` |
| Fonctionnels | [`../tests/functional/`](../tests/functional/) | 4 | rien | `test:unit`, `test:check`, CI `unit` |
| Contrats d'API | [`../tests/contract-api/`](../tests/contract-api/) | 12 | serveur + base | `test:unit`, `test:check`, CI `integration` |
| Onglets | [`../tests/integration-tabs/`](../tests/integration-tabs/) | 12 | serveur + base | `test:unit`, `test:check`, CI `integration` |
| Parcours d'API | [`../tests/e2e-workflows/`](../tests/e2e-workflows/) | 6 | serveur + base | `test:unit`, `test:check`, CI `integration` |
| Intégration | [`../tests/integration/`](../tests/integration/) | 7 | base | `test:unit`, `test:check` ; 2 fichiers en CI `integration` |
| Navigateur | [`../tests/browser-e2e/`](../tests/browser-e2e/) | 19 | serveur, interface et base dédiés | `test:browser`, CI `browser` |
| Parcours « 8 temps » et bout en bout | [`../tests/browser-e2e/parcours/`](../tests/browser-e2e/parcours/) | 12 | idem | `test:browser`, CI `browser` |

« Serveur » veut dire le serveur de développement déjà lancé (`npm run dev:server`, port 3400). Sans
lui, les tests HTTP se déclarent **ignorés**, jamais réussis. Les tests de cohérence et d'architecture
sont des tests unitaires, rangés à part (sections suivantes).

### Unitaires — `tests/unit/`

Un test unitaire vérifie une fonction ou un composant isolé, sans réseau. L'environnement par défaut est
`jsdom` (un faux navigateur en mémoire) ; un fichier qui n'en a pas besoin commence par
`// @vitest-environment node`. Les composants Vue se montent avec `@vue/test-utils`, les stores avec
une instance Pinia neuve (`setActivePinia(createPinia())`). La base est simulée (`vi.mock` du client
`server/db/client`) quand un service la lit.

| Sous-dossier | Fichiers | Contenu |
|---|---|---|
| `components/` | 128 | Composants Vue ; deux tests visuels par instantané (`__snapshots__/`) |
| `services/` | 65 | Services du serveur, dont les tests `mock-*.test.ts` de la simulation d'IA |
| `composables/` | 52 | Composables Vue |
| `shared/` | 45 | Code partagé : scores, vérificateurs, validateurs de contenu et de SEO |
| `stores/` | 33 | Stores Pinia |
| `scripts/` | 31 | Robot `auto:article` (`scripts/auto-article/`), base des tests navigateur, portes rejouées par `verify:content` |
| `coherence/` | 23 | Cohérence affichage / calcul, et tests transverses (ci-dessous) |
| `routes/` | 20 | Routes Express appelées sans serveur |
| `utils/` | 14 | Utilitaires |
| `architecture/` | 12 | Règles de code lues dans le source (ci-dessous) |
| `infra/` | 3 | Ports, libération des ports, nettoyage des données de test |
| `schemas/`, `directives/`, `helpers/`, `router/` | 2, 1, 1, 1 | Schémas Zod, directive, motifs de nettoyage, routeur |

Les tests des vérificateurs lisent un vrai article publié, figé dans
[`../tests/fixtures/articles/1013-pilier.html`](../tests/fixtures/articles/1013-pilier.html).

### Fonctionnels — `tests/functional/`

Ils enchaînent les **vraies** fonctions d'une étape du parcours, sans serveur ni base : Générer
(Découverte → Radar), Capitaine, Lieutenants, chaîne complète Capitaine → Lieutenants → Lexique. Le
journal et les lectures de cache (`server/db/cache-helpers`) sont simulés.

### Cohérence — `tests/unit/coherence/`

Un test de cohérence vérifie qu'une donnée partagée garde la même valeur partout : la valeur **affichée**
et la valeur qui **trie, filtre ou agrège** viennent de la même expression, et une absence reste une
absence. Ils suivent les fiches de flux de [`data-flows/`](data-flows/README.md) : `articles`,
`completed-checks`, `captain-keyword-and-progress-reactive`, `intent`, `keyword-metrics`, `keywords`,
`kpi-nullable`, `lexique`, `lieutenants`, `local`, `radar-explorations`, `relevance-live-computation`,
`score-capitaine`, `seo`, `strategy`, `strategy-context`. Trois fiches n'ont pas de test à leur nom
(`captain-relevance`, `radar-keywords`, `moteur`). Un modèle est à copier :
[`_template.test.ts`](../tests/unit/coherence/_template.test.ts).

Le même dossier porte des tests transverses : `css-tokens`, `db-tables-coverage` (chaque producteur
et consommateur interroge la bonne table), `design-tables-matrix`, `prompts-no-hardcoded` (ni année ni
lieu écrits en dur dans les prompts), `test-quality`, `type-rules-ssot` (une seule définition des
règles par type d'article). Ce dossier ne tourne **pas** dans `verify`.

### Architecture — `tests/unit/architecture/`

Ils lisent le code source et refusent une forme interdite. Tous tournent dans `verify`.

| Test | Garde |
|---|---|
| `requirements-trace` | Tout identifiant d'exigence cité par un test existe par écrit (cliquet, ci-dessous) |
| `recette-coverage` | La recette manuelle vérifie ou exclut, avec sa raison, chaque exigence fonctionnelle (`NFR-TEST-RECETTE-COVERAGE`, ci-dessous) |
| `parcours-trace` | Chaque parcours utilisateur (`spec/parcours/PU-0N-*.md`) cite des exigences existantes, marque ⚠ les non tenues et les liste, et dit vrai sur son test automatique (`NFR-TEST-PARCOURS-TRACE`, ci-dessous) |
| `display-contracts-coverage` | Toute réponse affichée par le Moteur passe un contrat d'affichage, client et serveur |
| `db-bootstrap-sync` | `bootstrap.sql` porte l'empreinte de `schema.sql`, mêmes tables, aucune commande `\restrict` |
| `prompts-reference` | [`05-prompts-reference.md`](05-prompts-reference.md) est la sortie exacte du générateur |
| `prompt-variables` | Le texte de l'utilisateur est échappé avant d'entrer dans un prompt ; chaque appel fournit exactement les repères du prompt |
| `regex-accents` | Jamais de `\b` collé à une lettre accentuée dans une expression régulière |
| `article-level-names` | Le niveau d'article se lit avec `parseArticleLevel`, jamais « Cluster » ni « Support » |
| `moteur-tabs-helper` | La liste `MOTEUR_TABS` des tests navigateur suit les onglets réels du Moteur |
| `decouplage-lieutenants-lexique`, `lexique-separation`, `lexique-tabbar`, `lexique-watcher-isolated` | Pas d'import croisé entre services Lieutenants, Lexique et lecture des pages ; séparation lecture / verrouillage du Lexique |

### Contrats d'API — `tests/contract-api/`

Un test de contrat vise **une** route HTTP : un corps valide rend la forme attendue, un corps invalide rend
le bon code d'erreur (`VALIDATION_ERROR`, `MISSING_PARAM`, `NOT_FOUND`…). À écrire pour toute nouvelle
route ou tout nouveau champ de réponse. Les portes de qualité ont leur test négatif
([`gates.contract.test.ts`](../tests/contract-api/gates.contract.test.ts)).

### Onglets — `tests/integration-tabs/`

Un fichier par onglet, de bout en bout côté API : ses routes, ses portes, ses écritures en base.
Cerveau (`cerveau-theme`, `cerveau-strategy`, `cerveau-proposals`), Moteur (`moteur-discovery`,
`moteur-radar`, `moteur-capitaine`, `moteur-lieutenants`, `moteur-lexique`, `moteur-finalisation`),
Rédaction (`redaction-brief`, `redaction-editor`, `redaction-seo`).

### Parcours d'API — `tests/e2e-workflows/`

Ils enchaînent plusieurs onglets par l'API, comme un utilisateur. `_setup-sanity.test.ts` vérifie d'abord
le banc (serveur joignable, fixtures créées puis supprimées) : s'il échoue, aucun autre test HTTP n'est fiable.

Les scénarios à garder verts en priorité :

| Scénario | Test |
|---|---|
| Créer cocon et article, valider le Capitaine, écrire le brief, cocher la progression | `cross-workflow.e2e.test.ts` › « Happy path complet » |
| Deux articles, même mot-clé : une seule mesure partagée dans `keyword_metrics` | `cross-workflow.e2e.test.ts` › « Cache cross-article » |
| Changer d'article en vol : A ne pollue pas B | `cross-workflow.e2e.test.ts` › « Switch d'article en vol » |
| Enchaîner Découverte → Radar → Capitaine → Lieutenants → Lexique | `moteur.workflow.test.ts` › « Workflow complet Discovery → Radar → Capitaine → Lieutenants → Lexique » |
| Valider un Capitaine et le retrouver en base | `moteur.workflow.test.ts` › « POST /keywords/:kw/validate?articleId → persiste captain_explorations » |
| Enregistrer une exploration Radar et la relire | `moteur.workflow.test.ts` › « POST /articles/:id/radar-exploration persiste… » |
| Recommander une longueur, l'accepter, la relire | `target-word-count.workflow.test.ts` › « Recommandation → user accepte… » |
| Cocher puis décocher une étape du Moteur | `redaction.workflow.test.ts` › « Cycle complet check / uncheck… » |

Les tests qui mesurent un mot-clé sont ignorés sans identifiants DataForSEO (cf. « Qui paie »).

### Intégration — `tests/integration/`

Des services du serveur appelés directement, sans HTTP, contre une vraie base PostgreSQL. Ils posent
leurs propres données et les retirent : ils passent sur une base vide. Les sources externes sont simulées.

| Fichier | Garde | En CI |
|---|---|---|
| `data.service.test.ts` | Lecture de l'arbre silos → cocons → articles et des mots-clés | oui |
| `internal-links-prune.test.ts` | La matrice du maillage suit le texte enregistré (`pruneStaleLinks`) | oui |
| `keyword-serp-schema.test.ts` | Structure des tables de la SERP décomposée (colonnes, clés, cascade) | non |
| `keywords-serp-exists.test.ts` | Le pré-contrôle « pages déjà lues ? » ne lève jamais d'erreur | non |
| `scrape-corpus.test.ts` | Lecture des pages concurrentes : cache mémoire d'une heure, page en erreur | non |
| `serp-analyze-cache-c2.test.ts` | Reconstruction d'une analyse SERP depuis la base | non |
| `decouplage-lieutenants-lexique.test.ts` | Lieutenants et Lexique marchent l'un sans l'autre et partagent la lecture des pages | non |

En local : `npx vitest run tests/integration/data.service.test.ts` (PostgreSQL requis, serveur non).

### Navigateur — `tests/browser-e2e/`

Réservés à ce qui n'existe que dans un navigateur : clic qui orchestre plusieurs appels, bouton
désactivé pendant un flux, fenêtre qui s'ouvre selon l'état, glisser-déposer, raccourci clavier. Un
fichier par domaine : `dashboard`, `theme-config`, `moteur-navigation`, `moteur-tabs`, `moteur-discovery`,
`moteur-radar`, `moteur-radar-long-tail`, `moteur-capitaine`, `moteur-capitaine-no-duplication`,
`moteur-capitaine-radar-list`, `moteur-lexique`, `structure`, `finalisation-gate`, `article-editor`,
`editor-actions`, `enrichment`, `linking-matrix`, `gates` (test négatif de chaque porte à l'écran),
`_sanity`.

### Parcours « 8 temps » — `tests/browser-e2e/parcours/`

Un parcours suit un utilisateur dans une sous-phase du Moteur, en un seul test découpé en étapes : l'état
doit traverser les temps. Chaque étape est un « temps » de la grille :

| Temps | Ce qui est vérifié |
|---|---|
| ① déclencheur | Le geste de l'utilisateur (saisie + Entrée, bouton) |
| ② mémoire | Un second passage répond depuis le cache ou la base |
| ③ service(s) | La bonne requête part vers le serveur |
| ④ réponse | La réponse arrive et porte les champs attendus |
| ⑤ mise en forme | Une valeur absente vaut `null` après contrat, jamais 0 |
| ⑥ sauvegarde | Le résultat se relit en base, et après rechargement |
| ⑦ affichage | L'écran montre la même chose que la réponse (« — » si absent) |
| ⑧ décision | Le verrou émet l'étape de progression |

Les valeurs du bac à sable DataForSEO sont factices : les assertions portent sur la **cohérence entre la
réponse et l'écran**, jamais sur un chiffre.

| Fichier | Contenu |
|---|---|
| `_socle.parcours.test.ts` | Le serveur est en mode simulé ; le cocon de test et ses trois articles sont sélectionnables |
| `capitaine`, `radar`, `lieutenants`, `lexique`, `discovery` | Les 8 temps d'une sous-phase, pour chaque niveau d'article |
| `interactions-capitaine`, `-radar`, `-lieutenants`, `-panneaux-ia` | Les gestes à l'intérieur des cartes et des panneaux IA |
| `cerveau.parcours.test.ts` | Les cinq étapes de la stratégie, la carte indicative, le pilier créé, la persistance |
| `bout-en-bout.parcours.test.ts` | Un cocon vide devient trois articles rédigés et publiés, chacun né d'une section de son parent ; seul test qui traverse Cerveau, Moteur et Rédaction sans raccourci |

## Les aides de test

| Fichier | Rôle |
|---|---|
| [`../tests/helpers/test-context.ts`](../tests/helpers/test-context.ts) | `setupTestContext()` : `runId` unique, purge des restes de plus d'une heure, `serverOk`, `modeReel`, `getSilo` / `createCocoon` / `createArticle`, nettoyage en `afterAll` |
| [`../tests/helpers/db-fixtures.ts`](../tests/helpers/db-fixtures.ts) | Création étiquetée (`createTestCocoon`, `createTestArticle`, `createTestCocoonArticle`), `cleanupTestFixtures`, `cleanupOrphanedFixtures`, `testKeywordPatterns` |
| [`../tests/helpers/api-client.ts`](../tests/helpers/api-client.ts) | `apiGet/apiPost/apiPut/apiPatch/apiDelete`, `consumeStream`, `isServerUp`, `expectSuccessOrKnownError`, `TOLERATED_ENV_ERROR_CODES` |
| [`../tests/helpers/base-url.ts`](../tests/helpers/base-url.ts) | `TEST_API_BASE_URL` : `TEST_BASE_URL`, sinon `http://localhost:<PORT ou 3400>/api` |
| [`../tests/helpers/global-runtime-mode.ts`](../tests/helpers/global-runtime-mode.ts) | `globalSetup` de Vitest : bascule le serveur en simulé une fois pour toute la suite, puis restaure |
| [`../tests/helpers/external-sources.ts`](../tests/helpers/external-sources.ts) | `dataForSeoConfigured()` : faux si l'identifiant est vide ou vaut `test` |
| [`../tests/helpers/gates.ts`](../tests/helpers/gates.ts) | `grantCheck`, `assumeGate` : passe une porte comme un utilisateur qui assume (raison ≥ 20 caractères) ; échoue sur un défaut ⛔ |
| [`../tests/browser-e2e/helpers/`](../tests/browser-e2e/helpers/) | `test-fixtures.ts` (fixture `ctx` de Playwright), `parcours-fixtures.ts` (`useParcours`), `cerveau-fixtures.ts` (`useCerveau`), `moteur-ui.ts`, `cocoon-builder-ui.ts`, `gate-alarm.ts`, `runtime-mode.ts` (`setMockMode`, `effectiveMode`) |

## Les données de test et leur nettoyage

Les tests Vitest qui touchent une base (HTTP et intégration) écrivent dans la base de développement. Aucun
ne doit y laisser de trace, même s'il plante.

- **Étiquette.** Tout ce que crée `ctx.create*` porte le `runId` (horodatage + six caractères) :
  cocon `[test:<runId>] …`, article `[test:<runId>] …`, slug `test-<runId>-…`.
- **Nettoyage du run.** `cleanupTestFixtures(runId)`, en `afterAll`, supprime les articles par titre
  **et** par slug (un test peut renommer l'article, jamais changer son slug), puis les articles créés par
  le produit dans un cocon de test, les cocons, les silos de test. Les enfants sont détachés avant leur parent.
- **Tables partagées entre articles.** `keyword_metrics`, `keyword_intent_analyses`, `keyword_discoveries`,
  `external_api_cache` n'ont pas d'étiquette : on les purge par motif de mot-clé (`testKeywordPatterns`).
  Le produit dérive des variantes racines en retirant des mots ; le seul fragment qui survit est le
  suffixe aléatoire du `runId`. Un mot-clé de test commence donc toujours par `test-${ctx.runId}-`.
- **Restes.** `cleanupOrphanedFixtures` supprime, au début de chaque fichier, les données étiquetées de plus
  d'une heure (titre ou slug).
- **Filet.** `verify:content` échoue s'il reste un article au slug `test-<horodatage>-…`
  (`test-ghost-articles`). `npm run db:clean-tests` les liste ; `-- --confirm` les supprime (slug de test,
  hors cocon, sans contenu rédigé).

Les tests navigateur étiquettent leurs cocons `[browser:<runId>]` (fixture `ctx`) ou `[test:<runId>]`
(parcours), et les suppriment en fin de test.

## Bases et ports de test

| Qui | Serveur | Interface | Base |
|---|---|---|---|
| Développement | 3400 (`PORT`) | 5400 (`VITE_PORT`) | `PG_DATABASE` du `.env` (défaut `blog_redactor_seo`) |
| Vitest, tests HTTP | vise 3400 (`TEST_BASE_URL` pour un autre) | — | celle du serveur visé ; les aides lisent le `.env` |
| Vitest, `tests/integration/` | — | — | celle du `.env` |
| Playwright | 3410 (`E2E_SERVER_PORT`) | 5410 (`E2E_CLIENT_PORT`) | `blog_redactor_seo_test` (`E2E_PG_DATABASE`), recréée à chaque passage |
| CI `integration` | 3400 | — | `blog_redactor_seo_test` (service `postgres:18`) |
| CI `browser` | 3410 | 5410 | `blog_redactor_seo_test` |

**La base des tests navigateur.** `npm run test:browser` passe d'abord par `pretest:browser` : il libère 3410
et 5410 ([`../scripts/kill-port.mjs`](../scripts/kill-port.mjs)), puis
[`../scripts/e2e-test-db.ts`](../scripts/e2e-test-db.ts) coupe les connexions restantes, supprime et recrée
la base, y joue [`../server/db/bootstrap.sql`](../server/db/bootstrap.sql) et ajoute le silo « Stratégie &
Visibilité ». [`../playwright.config.ts`](../playwright.config.ts) pose `PG_DATABASE` sur cette base pour le
serveur de test et pour les aides qui lisent la base. Rien ne se garde d'un passage à l'autre.

La règle vit dans [`../tests/browser-e2e/e2e-database.ts`](../tests/browser-e2e/e2e-database.ts) :
- `refuseToRecreate` refuse une base dont le nom ne finit pas par `_test`, ou qui est celle du `.env` ;
- `e2eUsesOwnDatabase` est faux avec `PARCOURS_REEL=1` (les données sont gardées pour être relues) ou
  `PLAYWRIGHT_NO_SERVER` (les tests visent un serveur déjà lancé, donc sa base).

**Le schéma rejouable.** `bootstrap.sql` est régénéré avec `schema.sql` par `npm run db:snapshot` ; les deux se
commitent ensemble (`db-bootstrap-sync` compare leurs empreintes). La CI crée ses bases avec ce fichier.

Lancer les tests navigateur ne coupe jamais le serveur de développement : `pretest:browser` ne libère que
3410 et 5410. Neuf fichiers de tests HTTP visent `http://localhost:3400` en dur, sans passer par
`TEST_BASE_URL` : c'est pourquoi le job `integration` de la CI lance son serveur sur 3400.

## Le mode simulé des tests

En mode simulé, l'IA répond depuis des **fixtures** (réponses préparées, déterministes, sans réseau) et
DataForSEO répond depuis son **bac à sable** (`sandbox.dataforseo.com` : gratuit, données factices).
L'interrupteur est un état global du serveur (`GET|POST /api/runtime-mode`, détail :
[IA et prompts](04-ia-et-prompts.md), « Mode simulé / réel »).

- Les fixtures vivent dans `server/services/external/mock-fixtures/` (une par domaine : `discovery`,
  `radar`, `intent`, `content-gap`, `captain-paa-judge`, `long-tail-suggest`, `article-draft`,
  `enrichment`, `reduce-section`, `generate`, `contexte`, `cerveau`, `strategy`, `streams`, `cocoon-child`,
  `auto-*`).
  `registerToolFixture` répond aux appels à outil (JSON) par nom d'outil ; `registerStreamFixture` répond
  aux flux de texte. `prompt-fields.ts` (qui n'est pas une fixture) lit dans une consigne rendue ses lignes
  « - **Libellé** : valeur » et ses sections « ## Titre ».
- Une fixture de flux reconnaît son appel à des **phrases du prompt**, de préférence à la consigne
  (`systemPrompt`) : le message utilisateur est souvent un texte saisi, qui peut citer « radar » ou
  « lexique ». Retoucher ces phrases dans un `.md` impose de mettre la fixture à jour. Un reconnaisseur doit
  être restrictif : trop large, il capture les appels d'autres routes. L'ordre d'import de
  `mock-fixtures/index.ts` compte (la première qui répond est servie) : d'abord les fixtures dont la demande
  embarque un texte saisi ou un article (premier jet, enrichissement, réduction, configuration du thème et
  micro-contexte dans `contexte`, étapes du Cerveau dans `cerveau`, carte dans `strategy`), ensuite
  `streams` et `generate`, dont certains reconnaisseurs lisent un mot du message.
- Une fixture copie le format du bloc d'exemple du prompt et la forme que le code applique à la réponse
  (contrat `shared/contracts/*`, schéma Zod, parseur de l'écran), pas le type TypeScript ; elle part de la
  demande (mot-clé, niveau, termes, texte saisi). Une réponse simulée doit ressembler à une bonne réponse,
  sinon les parcours simulés ne vérifient rien. Les tests `tests/unit/services/mock-*.test.ts` rendent la
  fixture sur le **vrai** prompt ou la vraie phrase de la route, vérifient que c'est **elle** qui répond
  (première fixture qui reconnaît l'appel), puis passent sa réponse au vrai contrat ou parseur : le premier
  jet et la structure Hn passent leur porte sans alerte ; les lieutenants dérivent du capitaine demandé ; la
  relecture garde la structure de la section ; l'ajout d'article rend le niveau demandé ; les candidats d'un
  article enfant viennent de la section du parent. Cinq fichiers tournent dans `npm run verify` :
  `mock-captain-ai-panel` (avis du Capitaine en trois parties), `mock-moteur-panneaux` (avis du Lexique
  sous le contrat `lexique-ai`, Lieutenants sous `propose-lieutenants-ai`, longues traînes sous le schéma du
  service), `mock-propose-lieutenants`, `mock-redaction` (micro-contexte accepté par
  `updateMicroContextSchema`, réduction qui garde titres, listes et liens) et `mock-cerveau` (configuration
  du thème sous `themeConfigSchema`, suggestions, fusions, sous-questions, enrichissement, consolidation,
  sujets suggérés lus par `parseTopicsFromSuggestion`, régénération d'une ligne de la carte, candidats d'un
  article né d'une section dont les mots accentués restent entiers — « démarrer » garde son « d »).
- Le mode simulé valide l'orchestration (routes, lecture des réponses, persistance), pas la qualité du texte
  de l'IA. Pour cela : la recette réelle (`npm run auto:article -- --mode=real`, puis
  `npm run verify:content`) et la [recette manuelle](../spec/18-recette-manuelle.md).
- Ne sont pas simulés : Tavily, l'autocomplétion Google et la lecture des pages concurrentes. Un test qui les
  touche appelle le vrai service.

## Qui paie quand les tests tournent

| Passage | IA | DataForSEO | Coût |
|---|---|---|---|
| CI (tous les jobs) | simulée (`AI_PROVIDER=mock`) | bac à sable (`DATAFORSEO_SANDBOX=true`) | nul |
| Vitest en local (`test:unit`, `test:check`) | simulée : `global-runtime-mode.ts` bascule le serveur, puis restaure son réglage | bac à sable | nul |
| Vitest avec `TESTS_REELS=1` | réelle | production | **payant** |
| Playwright en local (`test:browser`) | simulée : serveur démarré avec `AI_PROVIDER: 'mock'`, puis `setMockMode('mock')` | bac à sable | nul |
| Playwright avec `PARCOURS_REEL=1` | réelle pour `bout-en-bout.parcours.test.ts` | production | **payant** ; base de développement ; cocon « Parcours réel <date> » conservé |
| Robot `auto:article -- --mode=real` | réelle | production | **payant** |

Règles tenues par le code :
- Un serveur forcé en réel par quelqu'un d'autre n'est jamais basculé. Vitest le traite comme indisponible
  (`isServerUp` rend faux, les tests HTTP sont ignorés) ; Playwright refuse de le basculer (`setMockMode`
  lève une erreur).
- Le socle des parcours vérifie que le mode effectif est `mock` avant tout geste.
- Le bac à sable DataForSEO exige de vrais identifiants. Sans eux (CI sans secrets `DATAFORSEO_LOGIN` /
  `DATAFORSEO_PASSWORD`), les tests qui mesurent un mot-clé appellent `skip()`, et la CI saute l'étape
  Playwright avec un avertissement.
- `PARCOURS_REEL=1` vaut pour tout le passage : les autres tests navigateur écrivent alors aussi dans la
  base de développement. Limiter le passage au seul fichier :
  `PARCOURS_REEL=1 npx playwright test tests/browser-e2e/parcours/bout-en-bout.parcours.test.ts`.

Des erreurs HTTP 429 en série viennent le plus souvent du plafond de dépense DataForSEO ou d'un serveur
resté en réel : vérifier `GET /api/cost-status` et `GET /api/runtime-mode` avant d'accuser le code.

## Les commandes

Toutes sont des scripts de [`../package.json`](../package.json).

| Commande | Ce qu'elle fait | A besoin de |
|---|---|---|
| `npm run verify` | Le filet rapide (détail ci-dessous) | PostgreSQL |
| `npm run verify:full` | `verify`, puis ESLint, `check:cycles`, `test:check` | PostgreSQL ; serveur pour les tests HTTP |
| `npm run check:health` | `lint` (corrige : `oxlint --fix`, `eslint --fix`), `type-check`, `check:cycles`, `check:dead`, `check:arch`, en série | rien |
| `npm run test:unit` | `vitest` : toute la suite hors navigateur (en mode surveillance dans un terminal interactif) | serveur pour les tests HTTP |
| `npm run test:snapshot` | Enregistre l'état de la suite dans `tests/.baseline.json` | idem |
| `npm run test:check` | Compare la suite à cette référence | idem |
| `npm run test:browser` | `pretest:browser` puis `playwright test` | PostgreSQL |
| `npm run test:browser:ui` | Playwright en mode interactif | idem |
| `npm run test:mutation` | Stryker sur `shared/score/` | rien |
| `npm run build` | `prebuild` libère 3400 et 5400 (coupe le serveur de développement), puis `type-check` et `vite build` | rien |
| `npm run db:clean-tests` | Liste (`-- --confirm` : supprime) les articles de test restés en base | PostgreSQL |

Variantes utiles :
- un fichier : `npx vitest run tests/e2e-workflows/moteur.workflow.test.ts` ; un test : `-t "<nom>"` ;
  sans parallélisme (course entre tests) : `--no-file-parallelism` ;
- Playwright contre un serveur déjà lancé : `PLAYWRIGHT_NO_SERVER=1 npx playwright test <fichier>` (la base
  n'est alors pas recréée) ; voir le navigateur : `--headed`.

Pour les tests HTTP, lancer le serveur **sans** surveillance, sinon il redémarre à chaque modification
pendant la suite : `node --env-file=.env --import=tsx/esm server/index.ts` (comme la CI), avec
`AI_PROVIDER=mock` conseillé.

## `verify`, `verify:full`, `check:health`, `test:check`

### `verify` — le filet rapide

Ses cinq étapes tournent en parallèle (`run-p`) ; il sort en échec si l'une échoue. Il ne demande ni
serveur ni navigateur, mais PostgreSQL.

| Étape | Contenu |
|---|---|
| `verify:lint` | `oxlint .` |
| `verify:types` | `vue-tsc --build` et `tsc -p tsconfig.auto-scripts.json` (le robot) |
| `verify:unit` | Vitest avec [`../vitest.verify.config.ts`](../vitest.verify.config.ts) : environnement `node`, `tests/unit/shared`, `tests/unit/scripts`, `tests/unit/architecture`, douze tests de services purs ou aux I/O simulées (dont cinq sur les réponses simulées, `mock-*.test.ts`, voir « Le mode simulé des tests » ; `gate.service.test.ts` pour les portes et `export-article-page.test.ts` pour la page publiée), `test-fixtures-cleanup` et `composables/article-proposals-warnings` (alertes de la carte sans nom du code) ; une vingtaine de secondes |
| `verify:content` | [`../scripts/verify-content.ts`](../scripts/verify-content.ts) : chaque article rédigé (propreté, méta, liens, SEO, porte de publication rejouée), les articles entre eux (cannibalisation, ordre du cocon), les pages exportées, l'hygiène du dépôt (articles de test restés, sauvegarde de plus de 14 jours, référence des tests de plus de 30 jours, fichiers `.bak`, clés du `.env`). Les avertissements n'échouent pas |
| `db:check` | L'empreinte de la base vivante est celle de `schema.sql` ; échec aussi si la base est injoignable |

`verify` ne lance ni ESLint, ni les tests de `coherence/`, ni les tests de composants, ni les tests HTTP.

### `verify:full` et `check:health`

`verify:full` = `run-s verify verify:eslint check:cycles test:check`. C'est la vérification complète avant
une PR. `check:health` regroupe les contrôles statiques : il **modifie** les fichiers (`--fix`), puis
`madge` (cycles de `shared/` et `server/`), `knip` (code mort), `depcruise` (règles d'architecture, dont
`no-server-in-src` et `no-circular` sur `src/`). Détail des règles : [Qualités transverses](21-qualites.md).

### `test:check` et sa référence `tests/.baseline.json`

`test:check` répond à la question « mon chantier a-t-il cassé un test, ou ce rouge était-il déjà là ? ».

- [`../scripts/test-snapshot.ts`](../scripts/test-snapshot.ts) lance `vitest run --reporter=json` et écrit
  `tests/.baseline.json` : `generated_at`, `git` (commit, branche, sujet, arbre propre ou non), `totals`
  (réussis, rouges, ignorés), `fingerprint` (SHA-256 de la liste des rouges) et `failures` (fichier + nom).
  Il sort en succès même s'il y a des rouges.
- [`../scripts/test-check.ts`](../scripts/test-check.ts) relance la suite et compare les rouges, clé
  `fichier :: nom`. Un nouveau rouge sort en échec et le nomme. Un rouge de la référence devenu vert est
  signalé (régénérer la référence si voulu). Sans référence, il échoue.
- La référence actuelle ne contient aucun rouge. `verify:content` avertit quand elle a plus de 30 jours.
- `test:check` ne voit que les rouges. Un test devenu **ignoré** passe inaperçu : sans serveur, tous les
  tests HTTP sont ignorés et la comparaison ne dit rien d'eux. Lancer le serveur avant.
- Playwright n'entre pas dans cette comparaison.

## Les cliquets

Un **cliquet** est un compte figé dans un test qui ne peut que baisser : une régression le fait monter et le
test échoue en nommant les fichiers en cause. Quand un compte baisse, on abaisse la valeur dans le même
changement, sinon le gain peut se reperdre en silence.

| Cliquet | Fichier | Ce qui est figé | Tourne dans |
|---|---|---|---|
| Traçabilité des exigences | [`requirements-trace.test.ts`](../tests/unit/architecture/requirements-trace.test.ts) | `LEGACY_ORPHANS` : 20 identifiants cités par des tests sans exigence écrite. Un nouvel orphelin échoue ; un orphelin devenu traçable (ou plus cité) doit sortir de la liste | `verify`, `test:unit`, CI |
| Faux verts | [`test-quality.test.ts`](../tests/unit/coherence/test-quality.test.ts) | `STRICT_LIMITS` : `tautologies` 0, `conditionalSilent` 0. `SOFT_LIMITS` : `itTodo` 132, `itSkip` 1, `alwaysTrueGte0` 6, `typeofBoolean` 1, `silentServerSkip` 0. Sentinelle : 250 fichiers scannés au moins | `test:unit`, CI |
| Jetons CSS | [`css-tokens.test.ts`](../tests/unit/coherence/css-tokens.test.ts) | `UNDEFINED_BASELINE` : 30 jetons `var(--…)` utilisés sans définition. Un nouveau échoue ; un jeton défini ou disparu doit sortir de la liste. La famille `--color-warning*` doit être définie | `test:unit`, CI |
| Contrats d'affichage | [`display-contracts-coverage.test.ts`](../tests/unit/architecture/display-contracts-coverage.test.ts) | 18 familles terminées (`DONE_FAMILIES`) gardent leur contrat ; `BASELINE_CLIENT_UNCOVERED` = `BASELINE_SERVER_UNCOVERED` = 0 | `verify`, `test:unit`, CI |
| Matrice des tables | [`design-tables-matrix.test.ts`](../tests/unit/coherence/design-tables-matrix.test.ts) | Toute table de `schema.sql` a sa ligne dans la matrice ; aucune table fantôme | `test:unit`, CI |
| Zéro silencieux | [`../eslint.config.ts`](../eslint.config.ts) | `?? 0` interdit sur un score, un volume, une difficulté, un CPC, une concurrence, une densité | pré-commit, `verify:full`, `check:health` |
| Mutation | [`../stryker.config.json`](../stryker.config.json) | Seuil d'arrêt 60 % de mutants tués sur `shared/score/` | `test:mutation` (manuel) |

Les formes comptées par `test-quality` :

| Forme | Pourquoi c'est un faux vert |
|---|---|
| `expect(true).toBe(true)` | Toujours vrai |
| `if (res.status === 200) { expect… }` sans `else` | Si la condition est fausse, rien n'est vérifié |
| `if (requireServer().skip) return` | Sans serveur, le test sort vert au lieu d'« ignoré » |
| `it.skip`, `test.skip`, `describe.skip` | Un test ignoré ne protège rien |
| `toBeGreaterThanOrEqual(0)` | Un compte ou une longueur est toujours ≥ 0 |
| `expect(typeof x).toBe('boolean')` | Le type, jamais la valeur |
| `it.todo` | Un rappel, pas un test |

Un test mis de côté porte juste au-dessus `// SKIP: <exigence> <ce qui est cassé>` : il documente un vrai
défaut du produit. Le seul aujourd'hui est dans
[`ai-panels-persistence.test.ts`](../tests/unit/components/moteur/ai-panels-persistence.test.ts)
(`SKIP: FR-UI-AI-PANELS-PATTERN` : le panneau IA du brief n'utilise pas le modèle commun).

## Les tests qui lisent la documentation

Six tests lisent des documents. Renommer un titre, déplacer un fichier ou retirer un identifiant peut
donc faire échouer la suite. `recette-coverage` et `parcours-trace` lisent les exigences par la même aide,
[`tests/helpers/spec-requirements.ts`](../tests/helpers/spec-requirements.ts) (`readRequirementStatuses`,
`idsOfRequirementsLine`, `warningMismatch`).

| Test | Lit | Vérifie |
|---|---|---|
| `parcours-trace.test.ts` (dans `verify`) | Les fichiers `spec/parcours/PU-0N-*.md` : le `id` du front-matter, le titre `# PU-0N — …`, les lignes d'en-tête (But, Quand, Départ, Arrivée, Recette, Test automatique), la ligne `**Exigences :**` de chaque `### …` des sections « Les étapes » et « Ce qui peut mal tourner », les puces de « Défauts connus sur ce parcours » ; et tous les fichiers `.ts` / `.js` de `tests/`, pour y trouver les identifiants `PU-0N` cités. Les blocs de code sont ignorés | Identifiants concordants ; en-tête complet ; une seule ligne Exigences par section, avec des identifiants existants ; `⚠` suit le statut ; chaque non tenue citée est dans les défauts connus ; « Test automatique : aucun… » si et seulement si aucun test ne cite le parcours ; sentinelles : 5 parcours au moins, 5 sections chacun |
| `recette-coverage.test.ts` (dans `verify`) | `spec/requirements.md` : les titres `### FR-… — …` et leur ligne `**Statut :**` ; [`18-recette-manuelle.md`](../spec/18-recette-manuelle.md) et tous les modules `spec/recette/*.md` : les lignes `**Exigences :**` de chaque bloc `### …`, les lignes `**⚠ Défaut connu :**` et les lignes de tableau des sections `## Hors recette`. Les blocs de code sont ignorés | Chaque `FR-` active, non tenue ou prévue est vérifiée ou exclue, jamais les deux ; les identifiants cités existent ; `⚠` suit le statut (non tenue ⇒ `⚠`, active ⇒ sans, prévue ⇒ hors recette) ; une vérification `⚠` décrit son défaut ; une exclusion a une raison de 15 caractères au moins ; sentinelles : plus de 150 exigences et 50 vérifications lues |
| `requirements-trace.test.ts` (dans `verify`) | `spec/requirements.md` pour les `FR-` / `NFR-` ; **tous** les `.md` de `design/`, sous-dossiers compris, pour les `DESIGN-` ; puis, pour l'historique, `prd.md`, `design-registry.md` et l'épopée `epic-qualite-seo-garde-fous.md` (qui réserve les identifiants pas encore livrés) | Tout identifiant cité dans `tests/` (fichiers `.ts`, `.js`, `.vue`) existe comme mot entier ; plus de 100 identifiants trouvés (sentinelle) |
| `design-tables-matrix.test.ts` | [`02-donnees.md`](02-donnees.md), du titre `## Matrice tables ↔ exigences` au titre suivant ; les lignes du tableau dont la première cellule est un nom de table entre accents graves | Chaque table de `schema.sql` y figure ; aucune table absente du schéma (sauf `intent_explorations`, admise comme ancienne) ; au moins 20 tables |
| `prompts-reference.test.ts` (dans `verify`) | [`05-prompts-reference.md`](05-prompts-reference.md) | Le fichier est la sortie de `buildPromptsReference` ; plus de 40 prompts, chacun avec un appelant. En cas d'échec : `npm run docs:prompts` |
| `captain-keyword-and-progress-reactive.test.ts` | `prd.md` ; [`data-flows/captain-keyword-locked.md`](data-flows/captain-keyword-locked.md) ; [`data-flows/completed-checks.md`](data-flows/completed-checks.md) | `FR-MOT-DISPLAY-FROM-STORE` présent et actif dans le PRD ; la fiche commence par `name: captain-keyword-locked` et a ses sections Producteurs / Consommateurs / Persistance ; l'autre porte `synced_with: [captain-keyword-locked.md]`, l'identifiant et la mention « ProgressDots non réactifs » |

## L'intégration continue

[`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) tourne à chaque push, sur toute branche, et sur
chaque PR vers `main`. Node vient de [`../.nvmrc`](../.nvmrc) (24).

| Job | Contenu |
|---|---|
| `unit` | `npm run verify:types`, puis `npx vitest run tests/unit tests/functional` (IA simulée) |
| `integration` | PostgreSQL 18, base `blog_redactor_seo_test` créée depuis `bootstrap.sql` (`ON_ERROR_STOP`), silo « Stratégie & Visibilité », `.env` écrit par le job, serveur lancé sur 3400 et attendu sur `GET /api/health` ; puis `tests/contract-api`, `tests/integration-tabs`, `tests/e2e-workflows`, `tests/integration/data.service.test.ts`, `tests/integration/internal-links-prune.test.ts`. Journal du serveur publié en cas d'échec |
| `browser` | Après `integration`. Même base, Chromium, `npx playwright test` (le serveur de test démarre sur 3410 / 5410). Sauté avec un avertissement sans secrets DataForSEO. En CI : une relance par test, `test.only` interdit, rapport publié en cas d'échec |

La CI ne lance ni `oxlint` / ESLint complet, ni `check:cycles`, `check:dead`, `check:arch`, ni
`verify:content`, ni `db:check` : ces contrôles restent locaux (`verify`, `verify:full`, `check:health`).
Le pré-commit ([`../.husky/pre-commit`](../.husky/pre-commit)) ne lance que `lint-staged` : `oxlint --fix`
puis `eslint --fix` sur les fichiers indexés.

## Les tests instables connus

Aucun test navigateur ne compare de durées. Un test de cache prouve le cache par ce qu'il évite
(`fromCache` faux puis vrai, date de mesure inchangée en base), jamais par un chronomètre.

Restent trois comparaisons de durée, qui peuvent rougir quand la machine est saturée :
- `tests/integration-tabs/moteur-lieutenants.tab.test.ts` › « Re-validation < 7j : 2ème call
  propose-lieutenants plus rapide » (`e2 ≤ e1 × 2`) ;
- deux bornes à 50 ms sur une fonction pure : `relevance-live-computation.test.ts` › « aucun appel LLM… » et
  `lexical-pain-alignment.test.ts` › « mock-friendly… ».

Le délai par test est de 20 s ([`../vitest.config.ts`](../vitest.config.ts)) : la suite complète (environ
4 900 tests) sature la machine, et les 5 s par défaut faisaient rougir au hasard les tests qui scannent le dépôt.

Devant un seul nouveau rouge dans ces fichiers, relancer le test seul trois fois
(`npx vitest run <fichier> -t "<nom>"`) avant d'accuser le chantier.

## Les conventions

**Test rouge d'abord.** On écrit le test qui prouve le besoin, on le voit échouer, puis on écrit le code
minimal (TDD : *test-driven development*, développement piloté par les tests).
- TDD strict : services du serveur, routes (validation, codes HTTP, forme `{ data }`), stores Pinia
  critiques, composables de score et de pertinence, client d'API, constantes d'étapes.
- Tests conséquents : composants du Moteur à deux modes, Cerveau, parcours entre onglets.
- Pragmatique : composants d'affichage purs (test de fumée), pages d'assemblage.

**Choisir la couche.** Une nouvelle route : un contrat d'API (corps valide, corps invalide). Si elle sert un
onglet : un test d'onglet. Si le parcours traverse plusieurs onglets : un parcours d'API. Un navigateur
seulement si le comportement n'existe qu'à l'écran. Une fonctionnalité qui touche un onglet et une route :
deux à quatre tests, pas quinze.

**Un défaut corrigé laisse un garde.** Validateur pur dans `shared/` (contenu, SEO), contrôle en base dans
`verify-content.ts`, règle de code dans `tests/unit/architecture/` : chacun tourne dans `verify`.

**Nommage.** Le `describe` porte le domaine (`moteur:radar …`) ou l'identifiant de l'exigence
(`FR-CAP-SCORING-BIMODAL …`) : c'est la traçabilité tests ↔ exigences. Tout identifiant cité doit exister
par écrit (cliquet de traçabilité). La convention n'est appliquée qu'à une partie des fichiers : seul le
préfixe `moteur:` est employé, et beaucoup de `describe` n'ont ni domaine ni identifiant.

**Écrire un test HTTP.**
- `const ctx = setupTestContext()` au niveau du module ; les données passent par `ctx.createCocoon` /
  `ctx.createArticle` ; les mots-clés commencent par `test-${ctx.runId}-`.
- Un test privé de son environnement s'**ignore** : `async ({ skip }) => { if (requireServer().skip) skip() … }`,
  `if (!dataForSeoConfigured()) skip()`, `if (!expectSuccessOrKnownError(res)) skip()`.
  `expectSuccessOrKnownError` rend faux pour une erreur d'environnement connue et échoue sur toute autre.
- Une étape gardée par une porte s'accorde avec `grantCheck(articleId, check)`.
- Vérifier la forme **réelle** de la réponse : lire le schéma de `shared/schemas/` et la route. Si un test
  échoue, ne pas retoucher l'assertion pour le faire passer : si elle suit le type partagé, le code a un défaut.
- `{ timeout: 60000 }` pour une route qui appelle DataForSEO ou un flux d'IA.

**Tester le produit, pas une copie.** Une fonction du produit se teste elle-même ; une copie locale dans le
test finit par diverger.

**Navigateur.** Un repère `data-testid` stable, nommé domaine-action (`step-validate`, `captain-layout`),
invisible pour l'utilisateur. Attendre l'élément (`toBeVisible({ timeout })`) plutôt qu'un délai fixe.

## Pièges fréquents

| Symptôme | Cause probable | Réponse |
|---|---|---|
| Passe seul, échoue dans la suite | Course entre fichiers parallèles (identifiant ou slug) | Les aides réessaient sur clé dupliquée ; déboguer avec `--no-file-parallelism` |
| La fixture simulée ne répond pas | Le reconnaisseur ne voit pas la phrase, ou un autre, trop large, répond avant | Afficher le début du prompt reçu, resserrer l'expression |
| Tous les tests HTTP ignorés | Serveur éteint, ou forcé en mode réel | `GET /api/health`, `GET /api/runtime-mode` |
| Rouges en 429 | Plafond de dépense DataForSEO atteint, ou serveur en réel | `GET /api/cost-status` ; repasser en simulé |
| `[test:…]` visibles dans l'application | Un test a planté avant son nettoyage | Relancer un test (purge des restes d'une heure) ou `npm run db:clean-tests` |
| Playwright ne trouve pas l'élément | Repère absent, élément monté après un geste, ou téléporté | Ajouter le `data-testid`, attendre la visibilité |
| Le serveur redémarre en pleine suite | `dev:server` surveille les fichiers | Lancer le serveur sans `--watch` |

## Limites connues

- `NFR-TEST-BEHAVIORAL` n'est pas tenue. Aucun test navigateur ne revient en arrière (`page.goBack`) ni ne
  simule une panne (`page.route`) ; trois parcours rechargent la page. Le texte produit en mode réel ne
  passe pas automatiquement dans les vérificateurs : il faut lancer `verify:content` après le robot.
- `NFR-MAIN-TOOLING` n'est pas tenue : ni le pré-commit ni la CI ne lancent code mort, cycles ou règles
  d'architecture.
- Le cliquet des faux verts, celui des jetons CSS et la matrice des tables ne tournent pas dans `verify`,
  seulement dans `test:unit` et la CI.
- Les tests Vitest HTTP écrivent dans la base de développement (données étiquetées et nettoyées) ; seuls
  les tests navigateur ont une base jetable.
- Cinq fichiers de `tests/integration/` ne tournent pas en CI.
- `tests/setup.ts` est vide et n'est chargé par aucune configuration Vitest (seul `knip` le déclare).
