---
status: référence
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Carte des écrans

Ce chapitre répond à une question : **« quel composant affiche ce bloc, et comment le viser dans un test ? »**.
Pour chaque route, il liste les sections visibles, le composant qui les rend, leurs repères de test,
ce qui les fait apparaître, ce qu'elles appellent, et leurs états. Le comportement vu par l'utilisateur
est décrit dans les chapitres de la [spécification](../spec/README.md) ; la logique, dans les chapitres de
domaine de ce dossier. Ce chapitre ne les répète pas : il y renvoie.

**Comment lire les tableaux**
- **Section** : le bloc tel que l'écran le nomme (libellé entre « »), sinon sa fonction.
- **Composant** : le fichier qui le rend, sous [`src/components/`](../src/components/) sauf mention.
- **Repères** : les attributs `data-testid` (un *repère de test* : un nom posé dans le HTML pour qu'un test
  trouve l'élément sans dépendre du texte ni du style). `${…}` marque une partie variable. « — » : aucun repère.
- **Déclenché par** : ce qui le fait apparaître (montage de la vue, clic, condition `v-if`).
- **Appelle** : l'action de store ou de composable, et la route du serveur (préfixe `/api` omis).
- **États** : chargement, vide, erreur, verrouillé, avec le message de l'écran.

Les tests navigateur (Playwright, dossier [`tests/browser-e2e/`](../tests/browser-e2e/)) visent surtout les
repères ; leurs aides partagées sont dans [`tests/browser-e2e/helpers/`](../tests/browser-e2e/helpers/). La
stratégie de test est dans [Tests et outillage](07-tests-et-outillage.md).

## Les routes

Déclarées dans [`src/router/index.ts`](../src/router/index.ts). Toutes les vues sauf l'accueil et la page
introuvable sont chargées à la demande.

| Route | Nom | Vue ([`src/views/`](../src/views/)) | Comportement | Construction |
|---|---|---|---|---|
| `/` | `dashboard` | `DashboardView.vue` | [spec 03](../spec/03-dashboard.md) | [10 — Dashboard](10-dashboard.md) |
| `/config` | `theme-config` | `ThemeConfigView.vue` | [spec 04](../spec/04-cerveau.md) (configuration du thème) | [11 — Cerveau](11-cerveau.md) |
| `/silo/:siloId` | `silo-detail` | `SiloDetailView.vue` | [spec 03](../spec/03-dashboard.md) | [10 — Dashboard](10-dashboard.md) |
| `/cocoon/:cocoonId` | `cocoon-landing` | `CocoonLandingView.vue` | [spec 03](../spec/03-dashboard.md) | [10 — Dashboard](10-dashboard.md) |
| `/cocoon/:cocoonId/cerveau` | `cerveau` | `CerveauView.vue` | [spec 04](../spec/04-cerveau.md) | [11 — Cerveau](11-cerveau.md) |
| `/cocoon/:cocoonId/moteur` | `moteur` | `MoteurView.vue` | [spec 05](../spec/05-moteur.md) à [12](../spec/12-finalisation.md) | [12](12-moteur.md) à [16](16-finalisation.md) |
| `/cocoon/:cocoonId/redaction` | `redaction` | `RedactionView.vue` | [spec 13](../spec/13-redaction.md) | [17 — Rédaction](17-redaction.md) |
| `/cocoon/:cocoonId/article/:articleId` | `article` | `ArticleWorkflowView.vue` | [spec 13](../spec/13-redaction.md) | [17 — Rédaction](17-redaction.md) |
| `/article/:articleId/editor` | `article-editor` | `ArticleEditorView.vue` | [spec 13](../spec/13-redaction.md) | [17 — Rédaction](17-redaction.md) |
| `/article/:articleId/preview` | `article-preview` | `ArticlePreviewView.vue` (sans barre du haut : `meta.hideNavbar`) | [spec 13](../spec/13-redaction.md) | [17 — Rédaction](17-redaction.md) |
| `/linking` | `linking` | `LinkingMatrixView.vue` | [spec 13](../spec/13-redaction.md) (maillage) | [17 — Rédaction](17-redaction.md) |
| `/post-publication` | `post-publication` | `PostPublicationView.vue` | [spec 14](../spec/14-integrations.md) | [18 — Intégrations](18-integrations.md) |
| tout le reste | `not-found` | `NotFoundView.vue` | [spec 01](../spec/01-produit.md) | — |

**Redirections héritées :** `/theme/:themeId` → `/cocoon/:themeId` ; `/theme/:themeId/article/:articleId` →
`/cocoon/:themeId/article/:articleId` ; `/theme/:themeId/keywords` et `/cocoon/:cocoonId/keywords` →
`/cocoon/:id/moteur`.

**Gardes du routeur :**
- `beforeEach` renvoie vers `not-found` un paramètre `cocoonId`, `articleId`, `siloId` ou `themeId` vide ou fait d'espaces.
- `onError` recharge la page (deux fois au plus, compteur `chunk_reload_count` en `sessionStorage`) quand un
  morceau de code chargé à la demande manque après un déploiement, puis renvoie à l'accueil.
- Un identifiant inconnu n'est pas refusé par le routeur : chaque vue le traite à sa façon (colonne « États »).

## La coque de l'application

[`src/App.vue`](../src/App.vue) monte, autour de la vue courante, cinq éléments présents sur tous les écrans.
Changer d'adresse referme l'alarme ouverte (`watch(route.fullPath)` → `gateAlarm.cancel()`), comme
« Revenir corriger ».

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Barre du haut : nom du site (lien vers l'accueil), roue dentée « Configuration du thème » | `shared/AppNavbar.vue` | — | Toujours, sauf `route.meta.hideNavbar` (aperçu) | `silosStore.fetchSilos` au montage si vide (nom : `theme.nom`, sinon « Blog Redactor SEO ») | — |
| Navigation de l'atelier en cours (badge « Cerveau », « Moteur » ou « Rédaction », puis les étapes) | `shared/WorkflowNav.vue`, alimenté par `stores/ui/workflow-nav.store.ts` | `wf-item-${id}` (onglets groupés du Moteur), `wf-step-${id}` (étapes du Cerveau et de la Rédaction) | `workflowNav.state` non nul : la vue montée appelle `setWorkflowNav`, et `clearWorkflowNav` au démontage | `workflowNav.navigate(id)` → rappel `onNavigate` de la vue | Étape verrouillée : bouton `disabled`, cadenas, infobulle « Verrouillé » ; faite : coche |
| Bouton « MOCK » / « RÉEL » | `AppNavbar.vue` | — (`aria-label` « Basculer entre sources mock et réelles ») | Toujours ; `runtimeMode.hydrate` au montage | `GET /runtime-mode`, `POST /runtime-mode { mode }` (`stores/ui/runtime-mode.store.ts`) | Infobulle « Sources : MOCK (cliquer pour passer en réel) » ou l'inverse |
| Notifications | `shared/ToastContainer.vue` (store `stores/ui/notification.store.ts`, alimenté par `composables/ui/useNotify.ts`) | `toast-container`, `toast-${type}` | Toute notification | — | Fermeture « × », disparition après sa durée |
| « Coûts API » (pastille repliée « coût · N appels ») et pile d'activité | `shared/CostLogPanel.vue` (store `stores/ui/cost-log.store.ts`) | `cost-log-panel` | Dès qu'une entrée existe ou que le plafond DataForSEO est connu | `GET /dataforseo/cost-status` au montage puis toutes les 15 s | Jauge « DataForSEO SANDBOX / PROD », dépense / plafond ; « Effacer » vide la pile |
| Validation Capitaine programmée depuis Discovery | `shared/CaptainTriggerToast.vue` | `captain-toast`, `captain-toast-cancel-${keyword}` | File de `stores/ui/captain-trigger.store.ts` non vide | voir « Cadre commun du Moteur » | — |
| Alarme d'une porte de qualité (titre, points ⛔ / 🔴 / 🟠, « Le risque : », « À la place : ») | `shared/GateAlarm.vue` (store `stores/ui/gate-alarm.store.ts`) | `gate-alarm` (attribut `data-gate` = la porte), `gate-issue` (`data-level`, `data-rule`), `gate-ack`, `gate-category`, `gate-reason`, `gate-reason-counter`, `gate-refused`, `gate-waived`, `gate-cancel`, `gate-accept` | `open` / `ensure` / `runThroughGate` du store, sur un refus 422 `GATE_BLOCKED` | `GET /articles/:id/gates/:gateId` ; « Je prends la responsabilité et je continue » → `POST /articles/:id/gates/:gateId/waivers` | ⛔ : « Correction nécessaire », bouton grisé ; 🟠 seul : « J’ai lu, je continue » ; envoi : « Enregistrement… » ; Échap = « Revenir corriger » |

**Briques d'état partagées :**
- [`shared/AsyncContent.vue`](../src/components/shared/AsyncContent.vue) : pendant `isLoading`, le slot
  `skeleton` (ou `LoadingSpinner`) ; sur `error`, [`ErrorMessage.vue`](../src/components/shared/ErrorMessage.vue)
  (message brut + « Réessayer », qui émet `retry`) ; sinon le contenu.
- [`shared/ErrorBoundary.vue`](../src/components/shared/ErrorBoundary.vue) : enveloppe chaque panneau latéral
  de la rédaction. Repères `error-boundary-fallback`, `error-boundary-retry` (« Réessayer », 3 fois au plus,
  puis « Erreur persistante — rechargez la page. »).
- [`shared/ConfirmModal.vue`](../src/components/shared/ConfirmModal.vue) : repères `confirm-modal`,
  `confirm-modal-cancel`, `confirm-modal-confirm`.

L'alarme elle-même (niveaux, dérogations) est décrite dans [Infrastructure](20-infrastructure.md) et
[spec 16](../spec/16-infrastructure.md).

## Accueil — `/`

Vue [`DashboardView.vue`](../src/views/DashboardView.vue). Store `silos.store` (`fetchSilos` au montage :
`GET /theme` et `GET /silos` en parallèle).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Titre (`theme.nom`, sinon « Plan Éditorial ») et description | `DashboardView.vue` | — | Montage | — | — |
| Liens « Maillage », « GSC », roue dentée « Configuration du thème » | `DashboardView.vue` | — | Toujours | Navigation `/linking`, `/post-publication`, `/config` | — |
| Tuiles « Silos », « Cocons », « Articles », « Progression » | `DashboardView.vue` | — | `!isLoading && !error && silos.length > 0` | Calculs du store (`totalCocoons`, `totalArticles`, `globalCompletion`) | Masquées pendant le chargement, sur erreur et sans silo |
| Un bloc par silo : nom (lien vers le silo), « N cocons · N articles · N% », carrousel de cocons | `dashboard/SiloCard.vue` → `dashboard/CocoonCard.vue` | — | `AsyncContent` | Carte de cocon → `/cocoon/:id` | Chargement : trois cartes fantômes ; erreur : message + « Réessayer » |
| « Nouveau cocon » (champ « Nom du cocon... ») | `SiloCard.vue` | — | Clic sur la carte d'ajout | `silos.store.addCocoon` → `POST /silos/:name/cocoons { name }`, puis `/cocoon/:id` | Création : roue ; un refus écrit `silos.store.error` et remplace la liste par le message ([10 — Dashboard](10-dashboard.md)) |

**Tests navigateur :** [`dashboard.browser.test.ts`](../tests/browser-e2e/dashboard.browser.test.ts) (au moins un
silo, lien vers `/config`, route inconnue, aucune erreur de page).

## Configuration du thème — `/config`

Vue [`ThemeConfigView.vue`](../src/views/ThemeConfigView.vue). Store `theme-config.store` (`fetchConfig` au
montage : `GET /theme/config`). Aucun repère de test : le test
[`theme-config.browser.test.ts`](../tests/browser-e2e/theme-config.browser.test.ts) lit le texte de la page.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Configuration du Thème » et « Sauvegarder » | `ThemeConfigView.vue` | — | Toujours | `saveConfig` → `PUT /theme/config` | « Sauvegarde... » |
| « Remplissage automatique par IA » : texte libre, « Remplir les champs avec Claude » | `ThemeConfigView.vue` (`parseWithAI`) | — | Clic | `POST /theme/config/parse { text }`, puis enregistrement | « Analyse en cours... » ; erreur affichée sous le bouton |
| « Votre entreprise » : blocs « Positionnement », « Offres & Services » | `shared/CollapsableSection.vue` | — | `AsyncContent` | Toute saisie → `debouncedSave` (1,5 s) → `PUT /theme/config` | Chargement, erreur + « Réessayer » |
| « Votre client type » : blocs « Profil », « Besoins & Douleurs » | idem | — | idem | idem | idem |
| « Votre communication » : bloc « Ton & Vocabulaire » | idem | — | idem | idem | idem |

Les listes (différenciateurs, services, points de douleur, vocabulaire) s'enrichissent par Entrée ou « + »
(`addToList`) et se vident par « × » (`removeChip`). Champs et destinataires : [spec 04](../spec/04-cerveau.md),
« La configuration du thème ».

## Détail d'un silo — `/silo/:siloId`

Vue [`SiloDetailView.vue`](../src/views/SiloDetailView.vue). Même store que l'accueil ; `fetchSilos` au
montage seulement si la liste est vide. Le silo est trouvé par son rang (`s.id === Number(siloId)`).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Fil d'Ariane « Dashboard / silo » | `shared/Breadcrumb.vue` | — | Toujours | — | — |
| Nom et description du silo | `SiloDetailView.vue` | — | Silo trouvé | — | « Silo introuvable. » + « ← Retour au dashboard » |
| Statistiques : « Cocons », « Articles », « Par type » (Pilier, Inter., Spéc.), « Par statut » (À rédiger, Brouillon, Publié), « Progression » | `SiloDetailView.vue` | — | `silo.stats` | — | — |
| « Cocons sémantiques » : une ligne par cocon, barre de progression | `SiloDetailView.vue`, `shared/ProgressBar.vue` | — | Silo trouvé | Ligne → `/cocoon/:id` | Chargement et erreur par `AsyncContent` |

## Page du cocon — `/cocoon/:cocoonId`

Vue [`CocoonLandingView.vue`](../src/views/CocoonLandingView.vue). `loadData` au montage : `fetchCocoons`
(`GET /cocoons`) si le cocon manque, puis `articlesStore.fetchArticlesByCocoon` (`GET /cocoons/:id/articles`)
et `keywordsStore.fetchKeywordsByCocoon` (`GET /keywords/:cocoonName`). Un cocon absent de la liste (lue
sans erreur) pose `notFound` : la page affiche « Cocon introuvable » et le lien de retour, sans demander ses
articles (FR-DASH-WORKFLOW-CHOICE).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Fil d'Ariane, nom du cocon, « N articles · N% complété » | `Breadcrumb.vue`, `CocoonLandingView.vue` | — | Cocon trouvé | — | Nom « Cocon » tant qu'il n'est pas trouvé |
| « Choisissez une phase de travail : » et les cartes « Cerveau » (« 6 étapes »), « Moteur » (« N mots-clés »), « Rédaction » (« N articles, N% ») | `dashboard/WorkflowChoice.vue` | — | `v-if="cocoon"` dans `AsyncContent` | Liens `/cocoon/:id/cerveau`, `/moteur`, `/redaction` | Chargement : trois cartes fantômes ; erreur de la liste des cocons ou des articles + « Réessayer » ; cocon inconnu (`cocoon-not-found`) : « Cocon introuvable : il n’existe pas, ou il a été supprimé. » + « ← Retour au dashboard » |

La prop `strategyProgress` de `WorkflowChoice` n'est jamais passée : le badge du Cerveau dit toujours
« 6 étapes ».

## Cerveau — `/cocoon/:cocoonId/cerveau`

Vue [`CerveauView.vue`](../src/views/CerveauView.vue) : fil d'Ariane, `fetchCocoons` si la liste est vide,
puis [`production/BrainPhase.vue`](../src/components/production/BrainPhase.vue). « Terminer le brainstorm »
émet `next` → retour à `/cocoon/:id`. Construction : [11 — Cerveau](11-cerveau.md) ; comportement :
[spec 04](../spec/04-cerveau.md).

**Montage de `BrainPhase`**, dans l'ordre : `cocoonStrategyStore.fetchStrategy(slug)` (`GET /strategy/cocoon/:slug`)
et `initEmpty` sans stratégie ; `fetchCocoons` et `fetchSilos` si vides ; `themeConfigStore.fetchConfig`. Le
slug est tiré du nom du cocon (minuscules, sans accents, tirets).

**Navigation du haut :** `cerveauNavSteps` publie six étapes (`cible`, `douleur`, `angle`, `promesse`, `cta`,
`articles` → repères `wf-step-cible` … `wf-step-articles`). Une étape est faite si son rang est inférieur à
`completedSteps`, verrouillée au-delà de `max(currentStep, completedSteps)`. Un clic appelle `store.goToStep`.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Vue | `CerveauView.vue` | — | Montage | — | `LoadingSpinner` pendant `cocoonsStore.isLoading` ; « Cocon introuvable. » + « ← Retour au dashboard » |
| Stratégie | `BrainPhase.vue` | — | — | — | « Chargement de la stratégie... » pendant `store.isLoading` |
| « Contexte envoyé à Claude » (replié) et « Articles du cocon (N) » | `strategy/ContextRecap.vue` (+ `shared/RecapToggle.vue`) | — | `store.strategy` chargée | — (`mergedCocoonArticles`, `getPreviousAnswers`, `buildThemeContext`) | — |
| Étapes 1 à 5 : question, « Votre réponse », suggestion, « Valider ▾ » | `strategy/StrategyStep.vue` (`:key` = nom de l'étape) | `step-input`, `step-suggest`, `step-validate`, `step-validate-own`, `step-validate-suggestion`, `step-validate-merge` | `store.currentStep < 5` | « Demander une suggestion à Claude » → `requestSuggestion` → `POST /strategy/cocoon/:slug/suggest` ; « Fusionner les deux » → même route avec `mergeWith` | « Chargement... » pendant l'appel ; « Valider » grisé sans réponse ni suggestion (`canValidate`) |
| Texte validé (coche, crayon « Modifier le texte validé ») | `StrategyStep.vue` | `step-validated`, `step-validated-text` | `stepData.validated` | Édition locale → `update:stepData` | La carte se replie sous « Modifier ma réponse » (mêmes repères `step-*`, second rendu) |
| « + » « Approfondir » et sous-questions | `StrategyStep.vue`, `strategy/SubQuestionCard.vue` | `step-deepen` | Clic | `requestDeepen` → `POST /strategy/cocoon/:slug/deepen` ; sous-réponse validée → `requestEnrich` → `POST /strategy/cocoon/:slug/enrich` | « + » grisé pendant une suggestion, une fusion ou un approfondissement (`canDeepen`) |
| Étape 6 : constructeur puis carte indicative | voir les deux tableaux suivants | — | `store.currentStep === 5` | — | — |
| « Précédent », « Suivant » / « Terminer le brainstorm » | `BrainPhase.vue` | `brain-prev`, `brain-next` | « Précédent » si `currentStep > 0` | « Suivant » → `nextStep` → `PUT /strategy/cocoon/:slug` ; « Terminer le brainstorm » → `completedSteps = 6`, `saveStrategy`, `emit('next')` | — |

### Étape Articles — « Construire le cocon » (l'arbre réel)

Composant [`production/brain/CocoonTreeBuilder.vue`](../src/components/production/brain/CocoonTreeBuilder.vue),
logique [`useCocoonBuilder`](../src/composables/strategy/useCocoonBuilder.ts). Un lien vers un article mène à
sa rédaction guidée, `/cocoon/:cocoonId/article/:articleId`.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Bloc « Construire le cocon » | `CocoonTreeBuilder.vue` | `cocoon-tree` | Montage, changement de cocon (`loadTree`) | `GET /cocoons/:cocoonId/tree` | « Chargement de l’arbre du cocon… » ; « L'arbre du cocon n'a pas pu être chargé : … » + « Réessayer » (`cocoon-tree-retry`) |
| Cocon sans pilier : « Créer le pilier » | `CocoonTreeBuilder.vue` | `cocoon-create-pillar` | `canStartPillar` | `proposeCandidates` → `POST /cocoons/:cocoonId/child-candidates` (payant) | Panneau de candidats sous le bouton |
| Un article de l'arbre : niveau, titre, état, lien | `CocoonTreeBuilder.vue` | `tree-node-${id}`, `tree-node-state` (« Rédigé » / « À rédiger »), `tree-node-link` (« Ouvrir sa rédaction » / « Le rédiger ») | `blocks` non vide | — | « Pas encore de section : … » sans section |
| Parent non rédigé | `CocoonTreeBuilder.vue` | `tree-node-blocked` | `!drafted` et une section libre | — | « Validez d'abord le premier jet de « … » … » ; boutons de section grisés |
| Une section : l'enfant né d'elle, ou « Créer l'article de cette section » | `CocoonTreeBuilder.vue` | `tree-section-child`, `tree-section-create` | Section avec ou sans `childId` | `POST /cocoons/:cocoonId/child-candidates { parentId, parentSection }` | — |
| Panneau de candidats : « Le pilier du cocon » ou « Créer l'article … né de la section « … » de « … » » | `production/brain/CocoonCandidatesPanel.vue` | `cocoon-candidates-panel`, `candidates-close` (« Annuler »), `candidates-retry` (« Relancer la proposition »), `candidate` (une case par candidat), `candidate-unmeasured`, `candidate-title-input`, `candidate-create`, `candidate-create-error` | `isTarget(parentId, section)` | « Créer l'article » → `createFromCandidate` : `POST /cocoons/:cocoonId/articles` (derrière `runThroughGate` pour un enfant), `POST /keywords`, `PUT /strategy/cocoon/:slug`, `GET /cocoons/:cocoonId/tree`, `GET /cocoons` | « Recherche de mots-clés candidats, puis mesure… » ; erreur + « Relancer la proposition » ; « Non mesuré : … » (case grisée) ; « Créer l'article » grisé sans candidat mesuré ou titre < 3 caractères |
| « Articles hors de l'arbre » | `CocoonTreeBuilder.vue` | `tree-orphans`, `tree-orphan-${id}`, `tree-orphan-attach` (« Rattacher »), `tree-orphan-attach-form`, `tree-orphan-attach-select`, `tree-orphan-attach-confirm` (« Rattacher ici »), `tree-orphan-attach-error` | `orphans` non vide ; « Rattacher » absent pour un pilier | `attachOrphan` → `PUT /cocoons/:cocoonId/articles/:articleId/parent` (derrière la porte du parent), puis arbre et carte rechargés | « Rattacher » grisé sans section libre (« Aucune section libre d'un parent rédigé du bon niveau ») ; « L'article n'a pas été rattaché : … » |

### Étape Articles — « Carte indicative du cocon »

Composant [`production/brain/BrainArticleProposalView.vue`](../src/components/production/brain/BrainArticleProposalView.vue),
logique [`useArticleProposals`](../src/composables/editor/useArticleProposals.ts). Toute action qui modifie la
carte l'enregistre par `PUT /strategy/cocoon/:slug`, sauf les exceptions de [11 — Cerveau](11-cerveau.md)
(« Dette »).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Carte indicative : elle guide les articles à créer, elle n'en crée aucun. … » | `BrainArticleProposalView.vue` | `proposal-indicative-note` | Toujours | — | — |
| « Générer avec Claude ▾ » : « Le pilier », « 1 article intermédiaire », « 1 article spécialisé », « La carte complète du cocon » | `production/brain/GenerateCocoonMenu.vue` | `brain-generate-menu`, `brain-generate-options`, `brain-generate-pillar`, `brain-generate-intermediate`, `brain-generate-specialized`, `brain-generate-articles` | Clic ; intermédiaire si `mapHasPillar`, spécialisé si `mapHasIntermediate` | Trois premiers : `addSmartArticle` → `POST /strategy/cocoon/:slug/suggest` (étape `add-article`) ; carte complète : `generateArticleProposals` → `suggest` (étapes `articles-structure`, `articles-paa-queries`), `POST /paa/batch` (nom du cocon, en parallèle, puis requêtes des intermédiaires), `suggest` (`articles-spe`) | « Génération... », menu désactivé ; « Le pilier » grisé : « Déjà sur la carte : un seul pilier par cocon. » |
| « Sujets suggérés » (replié), « Contexte additionnel (optionnel) » | `production/TopicSuggestions.vue` | — | Arrivée à l'étape sans sujets (génération d'office) ; cases, ajout, retrait, régénération | `POST /strategy/cocoon/:slug/suggest` (étape `articles-topics`) | « Complétez au moins les premières étapes stratégiques avant de générer les sujets. » |
| Barre « Structure (Pilier + Inter) », « Recherche PAA », « Articles Spécialisés » | `production/GenerationStepper.vue` | `generation-stepper` | `generationPhase` | — | Messages sous la barre : erreur de génération, spécialisés non générés, articles tronqués |
| Alertes de structure | `BrainArticleProposalView.vue` | `structural-warnings` | `globalWarnings` non vide | — | « Aucun article Pilier dans la liste. », etc. |
| Colonnes « Pilier », « Intermédiaire », « Spécialisé » (spécialisés groupés par parent, « Non rattachés ») | `production/ArticleColumn.vue` | — | Toujours | — | — |
| Une ligne de la carte | `strategy/ProposedArticleRow.vue` | `proposal-item`, `proposal-created-badge` (« Créé »), `composition-badge-warn` (« ⚠ N ») / `composition-badge-ok` (« ✓ »), `composition-tooltip`, `collapsed-slug`, `slug-badge`, `parent-menu`, `pain-intent-select` (« Intention éditoriale ») | Une entrée de `proposedArticles` ; clic pour déplier | Titre sur un article créé → `PATCH /articles/:id` ; intention → `saveStrategy`, plus `PATCH /articles/:id { painIntentExpected }` sur un article créé | — |
| Actions d'une ligne : « Régénérer ▾ » (« Titre », « Mot-clé », « Slug »), « Lien », « Supprimer » | `strategy/proposed/ProposedArticleActions.vue` | `kebab-btn`, `actions-menu`, `regen-dropdown-btn`, `regen-menu`, `link-parent-btn`, `link-parent-btn-expanded`, `proposal-delete-${position}` | Clic | Régénération → `POST /strategy/cocoon/:slug/suggest` (étape `articles`) ; retrait d'un article créé → `DELETE /articles/:id` | Refus 409 `HAS_CHILDREN` : notification, la carte garde la ligne |
| « + Ajouter un pilier / un intermédiaire / un spécialisé » : « Article vide », « Article complémentaire », « Article guidé... » | `production/AddArticleMenu.vue` | — | Clic sous une colonne | Vide : ligne locale ; complémentaire ou guidé : `addSmartArticle` (étape `add-article`) | Échec : ligne vide, sans message |

**Tests navigateur :** [`parcours/cerveau.parcours.test.ts`](../tests/browser-e2e/parcours/cerveau.parcours.test.ts)
et l'aide [`helpers/cocoon-builder-ui.ts`](../tests/browser-e2e/helpers/cocoon-builder-ui.ts). Ils vérifient aussi
l'**absence** de `brain-validate-all` et `proposal-accept-header` : la carte n'accepte plus aucun article.

## Moteur — `/cocoon/:cocoonId/moteur`

Vue [`MoteurView.vue`](../src/views/MoteurView.vue), qui délègue à cinq composables (`useMoteurTabs`,
`useMoteurSoftGating`, `useMoteurCrossTabState`, `useMoteurArticleSync`, `useTabLoadPrompt`). Construction :
[12 — Moteur](12-moteur.md) à [16 — Finalisation](16-finalisation.md) ; comportement : [spec 05](../spec/05-moteur.md)
à [spec 12](../spec/12-finalisation.md).

**Montage :** remise à zéro (Discovery, stores d'article et du Radar, transferts entre onglets), puis
`loadData` : cocons, mots-clés du cocon (`GET /keywords/:cocoonName`), stratégie (`GET /strategy/cocoon/:slug`),
capitaines (`GET /cocoons/:cocoonName/capitaines`), contexte stratégique (`GET /cocoons/:id/strategy/context`).
Tant que les mots-clés du cocon se chargent, seule la roue `LoadingSpinner` s'affiche.

**Les onglets.** `useMoteurTabs` publie trois groupes dans la barre du haut : « Générer » (Discovery, Radar),
« Valider » (Capitaine, Lieutenants, Structure, Lexique), « Finaliser » (Finalisation). Repères
`wf-item-discovery` … `wf-item-finalisation`.
- Sans article choisi, tous les onglets sont verrouillés (« Sélectionnez un article ci-dessus »).
- Discovery et Radar se verrouillent quand le mot-clé de l'article a déjà un statut autre que `suggested`
  (`isDiscoveryAllowed`) : « Mots-clés déjà validés — onglet verrouillé ».
- Aucun autre verrou dans la barre : Finalisation reste cliquable.
- Un panneau n'est monté qu'à la première visite de son onglet (`v-if="visitedTabs.x"`), puis caché par
  `v-show` : il garde son état. Le Capitaine est visité d'office.
- Choisir un article ouvre le premier onglet utile (`computeSmartTab` : aucune étape → Capitaine ; capitaine
  verrouillé → Lieutenants ; lieutenants → Structure ; structure → Lexique). Jamais Finalisation.

### Cadre commun du Moteur

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Fil d'Ariane | `Breadcrumb.vue` | — | Toujours | — | — |
| « Contexte stratégique » (replié) : Cible, Douleur, Angle, Promesse, CTA | `moteur/MoteurStrategyContext.vue` | — | `strategyStore.strategicContext` non nul | — | Une valeur vide n'est pas affichée |
| « Articles suggérés (N) », « Articles publiés (N) », groupés par niveau ; points de progression ; alerte de cannibalisation | `moteur/MoteurContextRecap.vue`, `moteur/ProgressDots.vue` | — | Toujours | Clic → `handleSelectArticle` ; `fetchProgress` → `GET /articles/:id/progress` pour chaque article visible sans progression connue | Second clic : désélection |
| « Sélectionnez un article ci-dessus pour accéder au Moteur. » | `MoteurView.vue` | — | `!selectedArticle` | — | — |
| « Les onglets Discovery et Radar sont verrouillés… », « Voir le Capitaine → » | `MoteurView.vue` | — | Article choisi, `!isDiscoveryAllowed`, onglet Discovery ou Radar | Bascule sur le Capitaine | — |
| « Résultats déjà calculés » : puces Radar, Capitaine, Lieutenants, Lexique (DB / C), « Vider le cache » | `moteur/TabCachePanel.vue` | `tab-cache-panel`, `tcp-chip-${tabId}`, `tcp-clear-cache` | Article choisi (barre collante) | Compteurs : `GET /articles/:id/explorations/counts` ; « Vider le cache » → `DELETE /articles/:id/external-cache` | « Vider le cache » seulement si un compteur de cache est positif |
| « Charger {onglet} » : boutons DB / C, « × » | `moteur/TabLoadPrompt.vue` | `tab-load-prompt`, `tlp-load-db`, `tlp-load-cache`, `tlp-dismiss` | Données enregistrées pour l'onglet courant | Radar : relecture de l'exploration ; Capitaine, Lieutenants : `GET /articles/:id/keywords` (fusion) ; Lexique : `GET /articles/:id/explorations` | Fermé jusqu'au prochain changement d'onglet ou d'article |
| Pied de page : « ← Retour au cocon », « Continuer vers {onglet} → » ou « Continuer vers la Rédaction → » | `MoteurView.vue` | `cta-next-tab`, `cta-redaction` | Toujours ; `cta-redaction` sur le dernier onglet | `setActiveTab(nextTab)` ; `navigateToRedaction` → `/cocoon/:id/redaction?articleId=` | `cta-redaction` grisé sans les quatre verrous, infobulle « Étapes restantes : … » |
| Validation Capitaine programmée : « Validation Capitaine dans Ns », « «mot-clé» » | `shared/CaptainTriggerToast.vue` | `captain-toast`, `captain-toast-cancel-${keyword}` | Clic sur un mot-clé en Discovery (5 s de grâce) | `POST /keywords/:keyword/scan`, puis `POST /articles/:id/captain-explorations` | Annulable pendant les 5 s |

Une étape (`check-completed` d'un panneau) passe par `useMoteurArticleSync.emitCheckCompleted` →
`runThroughGate` → `POST /articles/:id/progress/check` : un refus 422 ouvre l'alarme
([12 — Moteur](12-moteur.md), « Étapes de progression »).

### Onglet Discovery

Composant [`moteur/DiscoveryPanel.vue`](../src/components/moteur/DiscoveryPanel.vue) (mode `workflow`), logique
[`useDiscoveryPanel`](../src/composables/keyword/useDiscoveryPanel.ts). Routes : [13 — Discovery](13-discovery.md).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Mot-clé racine », « Découvrir », « Courte-traîne IA » ; ligne « Article : … · Douleur : … » | `DiscoveryPanel.vue` | — | Toujours | « Découvrir » : `POST /keywords/suggest-all`, `POST /keywords/discover`, `POST /keywords/radar/generate`, puis `POST /keywords/word-groups` ; « Courte-traîne IA » : `POST /keywords/radar/generate` | Boutons grisés sans racine ou pendant une recherche : « Recherche... », « Génération… » |
| Découverte enregistrée : date, « N mots-cles », « Charger » | `moteur/discovery/KeywordDiscoveryCacheBar.vue` | — | Sauvegarde trouvée pour la racine, avant découverte | `GET /discovery-cache/check`, `GET /discovery-cache/load` | « Chargement... » |
| Filtre de pertinence : « N pertinents / N total », « Filtrage n/2 », « N hors-sujet masqués » | `moteur/discovery/KeywordDiscoveryRelevanceToggle.vue` | — | `hasDiscovered` | `POST /keywords/relevance-score` (par lots) | « Attention : le filtrage de pertinence semble ne pas avoir fonctionné… » |
| Sections par source, cases à cocher | `moteur/discovery/DiscoverySourcesList.vue` | `source-header-action` | Toujours, même vides | — | Section vide : invitation à saisir une racine ; « Aucun mot-clé trouvé. Essayez un autre mot-clé racine. » |
| Groupes de mots (filtre local), « Effacer » | `moteur/discovery/DiscoveryWordGroupsSidebar.vue` | — | `hasDiscovered` | — | — |
| « Analyse IA Discovery » | `ai-panel/AiPanel.vue` + `moteur/discovery/DiscoveryAnalysisResults.vue` | `discovery-ai-panel`, `discovery-ai-idle`, `ai-trigger-primary`, `ai-trigger-regen` | Toujours affiché | `POST /keywords/analyze-discovery` | Message d'attente tant qu'aucune découverte n'a eu lieu |
| « N mot(s)-clé(s) sélectionné(s) », « Envoyer au Radar → » | `DiscoveryPanel.vue` | — | `selectedCount > 0` | `POST /articles/:id/radar-exploration/keywords` ; étape `MOTEUR_DISCOVERY_DONE` ; bascule sur le Radar | — |

**Tests :** [`moteur-discovery.browser.test.ts`](../tests/browser-e2e/moteur-discovery.browser.test.ts),
[`parcours/discovery.parcours.test.ts`](../tests/browser-e2e/parcours/discovery.parcours.test.ts).

### Onglet Radar

Composant [`intent/RadarPanel.vue`](../src/components/intent/RadarPanel.vue) (mode `workflow`), composable
`useKeywordRadar` ([`useResonanceScore.ts`](../src/composables/keyword/useResonanceScore.ts)) et store
`radar-exploration.store`. Les champs de génération de `scanner/DouleurScannerInputs.vue` ne s'affichent
qu'en mode `libre`. Construction : [14 — Radar et Capitaine](14-radar-capitaine.md).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « N mots-clés à scanner », « Lancer le scan », étiquettes « × » | `RadarPanel.vue` | `radar-keywords-preview` / `radar-keywords-empty` | Hors scan | « Lancer le scan » → `POST /keywords/radar/scan`, puis `POST /articles/:id/radar-exploration` ; « × » → `DELETE /articles/:id/radar-exploration/keyword?keyword=` | « Lancer le scan » grisé sans mot-clé ; « Aucun mot-clé en attente. Passe par l'onglet Discovery… » |
| « Ajouter un mot-clé à scanner… », « + Ajouter » | `RadarPanel.vue` | `radar-manual-add` | Mode base de données (article choisi) | `POST /articles/:id/radar-exploration/keyword` | Bouton grisé sans saisie |
| Progression du scan : phase, « n/N mots-cles » | `RadarPanel.vue` | — | `isScanning` | — | — |
| Thermomètre global | `shared/RadarThermometer.vue` | — | Toujours (vide avant scan) | — | « —/100 », « En attente » |
| « Autocomplete (N) » (replié) | `scanner/DouleurScannerResults.vue` | — | Toujours | — | « Aucune suggestion — lance un scan » |
| Barre de tri (A-Z, Score), filtre CPC, « Tout » ; cartes à cocher | `DouleurScannerResults.vue`, `moteur/SortToggleBar.vue`, `shared/CpcFilterToggle.vue`, `intent/RadarCardCheckable.vue` → `RadarKeywordCard.vue` | `sort-toggle-bar`, `stb-chip-${key}`, `radar-card-checkbox`, `kw-words`, `kw-word-${i}` | `scanResult` | — | « Cartes radar (0) », « Les cartes apparaîtront après le scan » |
| « Suggestions longue-traine » | `intent/RadarLongTailSuggestions.vue` (`useLongTailSuggestions`) | `radar-long-tail-section`, `btn-suggest-longtail`, `btn-regenerate-longtail`, `longtail-loading`, `longtail-list`, `longtail-checkbox-${idx}` | `articleId` et `scanResult` | `POST /articles/:id/radar-exploration/long-tail` ; sélection → `PATCH /articles/:id/radar-exploration/long-tail/selection` | Chargement |
| « Envoyer au Capitaine (N) » | `DouleurScannerResults.vue` | — | Une carte ou une longue traîne cochée | `sendToCaptain` → `cards-selected`, bascule sur le Capitaine | — |
| « Suggestions IA Radar » : top candidats, « Marquer comme candidats Capitaine (N) » | `moteur/RadarAiPanel.vue` (`useRadarRanking`, sans appel d'IA) | `ai-panel-suggestion`, `radar-ai-list`, `radar-ai-empty-no-scan`, `radar-ai-empty-no-candidates`, `radar-ai-handoff` | Toujours | — | Sans scan / sans candidat : message dédié |

L'étape `MOTEUR_RADAR_DONE` part à l'événement `scanned` du panneau. **Tests :**
[`moteur-radar.browser.test.ts`](../tests/browser-e2e/moteur-radar.browser.test.ts),
[`moteur-radar-long-tail.browser.test.ts`](../tests/browser-e2e/moteur-radar-long-tail.browser.test.ts),
[`parcours/radar.parcours.test.ts`](../tests/browser-e2e/parcours/radar.parcours.test.ts),
[`parcours/interactions-radar.parcours.test.ts`](../tests/browser-e2e/parcours/interactions-radar.parcours.test.ts).

### Onglet Capitaine

Composant [`moteur/CaptainPanel.vue`](../src/components/moteur/CaptainPanel.vue). En mode `workflow` (le seul
monté), il rend une liste et un panneau latéral (`captain-layout`) ; le mode `libre` (historique, tableau des
seuils, `CaptainLockPanel`) n'est monté par aucun écran. Construction : [14 — Radar et Capitaine](14-radar-capitaine.md).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Tester un mot-clé capitaine… » et alertes de composition | `moteur/CaptainInput.vue` | `keyword-input` | Entrée ou bouton | `useCapitaineScan` → `POST /keywords/:keyword/scan` (et `POST /keywords/radar/scan`, sans attendre) ; enregistrement `POST /articles/:id/captain-explorations` | Champ désactivé pendant une étude |
| Liste des candidats, barre de tri | `moteur/captain/CaptainRadarList.vue`, `SortToggleBar.vue` | `radar-list`, `radar-list-empty`, `radar-list-item-${n}`, `radar-list-item-${n}-loading`, `radar-list-item-${n}-error` | Explorations relues par `GET /articles/:id/keywords` à la sélection d'article | À l'ouverture de l'onglet : `POST /articles/:id/captain/judge-paa` (jugement IA des PAA) | « Aucun mot-clé à valider pour cet article. » ; « Validation en cours... » ; « Erreur : … » |
| Une carte : mots cliquables, cadenas, tag manuel, recalcul de pertinence | `moteur/CaptainInteractiveWords.vue` → `intent/RadarCardLockable.vue` → `RadarKeywordCard.vue` | `carousel-radar-lockable`, `radar-card-lock`, `radar-card-tag-toggle`, `radar-card-recompute-relevance`, `kw-words`, `kw-word-${i}` | `entry.validation` | Cadenas → `gateAlarm.ensure(id, 'captain-lock')` (`GET /articles/:id/gates/captain-lock?keyword=`), puis `PUT /articles/:id/keywords`, puis étape `MOTEUR_CAPITAINE_LOCKED` | Recalcul grisé sans douleur d'au moins 10 caractères |
| Panneau latéral « Capitaine » : mot-clé, verdict, « Aller à la carte verrouillée », indicateurs de marché, racines | `moteur/CaptainSidePanel.vue`, `moteur/CaptainRootsSidebar.vue` | `side-panel`, `side-panel-close`, `side-panel-content`, `side-panel-goto-locked`, `side-panel-market-kpis`, `side-panel-roots`, `ai-panel-verdict`, `captain-roots-sidebar`, `root-sidebar-item`, `roots-sidebar-average`, `root-sidebar-single`, `root-sidebar-loading` | Une carte choisie (`entry !== null`) | Variante de racine → changement de carte | Valeur absente : « — » |
| « Avis expert IA » | `ai-panel/AiPanel.vue` (variante `advice`), `AiAdviceMarkdown.vue` | `ai-panel-advice`, `ai-panel-header`, `ai-panel-toggle`, `ai-panel-collapsed`, `ai-panel-error`, `ai-panel-stale`, `ai-panel-skeleton`, `ai-trigger-primary`, `ai-trigger-regen`, `ai-advice-markdown` | Sans clic, dès qu'une carte a son étude et pas encore d'avis enregistré (`carouselAiCache`) ; « Régénérer » force un nouvel avis | `POST /keywords/:keyword/ai-panel` (flux), puis `PATCH /articles/:id/captain-explorations/ai-panel` | Replié par défaut ; déplié en flux ou en erreur ; « Régénérer » demande confirmation |
| « Déverrouiller le Capitaine ? » : « Les garder », « Tout réinitialiser » | `moteur/UnlockLieutenantsModal.vue` | `unlock-lieutenants-modal`, `unlock-keep-btn`, `unlock-archive-btn` | Déverrouillage alors que des lieutenants sont verrouillés | « Tout réinitialiser » : `archiveLockedLieutenants`, `PUT /articles/:id/keywords` ; retrait de l'étape → `POST /articles/:id/progress/uncheck` | Clic à côté : annule |

Repères déclarés mais sans écran : ceux du mode `libre` (`history-carousel`, `captain-empty`, `captain-loading`,
`captain-error`, `captain-results`, `thresholds-table`, `paa-list`, `radar-card-section`, `captain-radar-card`,
`radar-loading`, `suggested-keywords`), ceux de `CaptainLockPanel.vue` (`${prefix}lock`, `lock-btn`,
`locked-state`, `send-to-lieutenants-btn`, `unlock-btn`), de `VerdictBar.vue` (`verdict-bar`, `verdict-bar-nogo`) et
de `CaptainVerdictPanel.vue` (`kpi-${nom}`, `tooltip-${nom}`). **Tests :**
[`moteur-capitaine.browser.test.ts`](../tests/browser-e2e/moteur-capitaine.browser.test.ts),
[`moteur-capitaine-radar-list.browser.test.ts`](../tests/browser-e2e/moteur-capitaine-radar-list.browser.test.ts),
[`moteur-capitaine-no-duplication.browser.test.ts`](../tests/browser-e2e/moteur-capitaine-no-duplication.browser.test.ts),
[`parcours/capitaine.parcours.test.ts`](../tests/browser-e2e/parcours/capitaine.parcours.test.ts),
[`parcours/interactions-capitaine.parcours.test.ts`](../tests/browser-e2e/parcours/interactions-capitaine.parcours.test.ts).

### Onglet Lieutenants

Composant [`moteur/LieutenantsPanel.vue`](../src/components/moteur/LieutenantsPanel.vue), composables
`useLieutenantsSerp` et `useLieutenantsIa`. Construction : [15 — Lieutenants, Structure, Lexique](15-lieutenants-structure-lexique.md).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP. » | `LieutenantsPanel.vue` | — | Capitaine non verrouillé et aucune analyse passée | — | Verrou doux |
| Mots-clés de l'article à ajouter | `moteur/KeywordAssistPanel.vue` (contexte `lieutenants`) | `keyword-assist-panel` | Des mots-clés hors des cartes existent | Ajout local d'une carte (score absent) | « × » masque le panneau |
| « Resultats SERP : N » (3 à 10), « Analyser SERP », « Tout relancer (SERP + IA) » ; progression par mot-clé ; étapes ; onglets par mot-clé, filtres « Blogs » / « Autres » | `moteur/LieutenantSerpAnalysis.vue` | `serp-skeleton`, `analysis-steps`, `serp-keyword-tabs`, `serp-urls` | Clic (`canAnalyze`) | `POST /serp/analyze` par mot-clé (capitaine puis racines) ; puis `POST /keywords/:keyword/propose-lieutenants` (flux) | « Analyse en cours... » ; « Analyse SERP en cours (n/N) » ; « 0 PAA — les lieutenants seront bases sur les headings… » ; `serp-error` |
| Propositions : barre de tri, cartes, « éliminés » | `moteur/LieutenantProposals.vue`, `moteur/LieutenantCard.vue` | `ia-proposal-section`, `ia-loading`, `ia-error`, `lieutenant-counter`, `lieutenant-cards-list`, `eliminated-section`, `eliminated-cards-list`, `lt-card-checkbox` | `serpResult` ou cartes présentes | Case cochée → `saveDecisions` (`PUT /articles/:id/keywords`), `gateAlarm.ensure(id, 'lieutenants-lock')`, étape `MOTEUR_LIEUTENANTS_LOCKED` | « L'IA proposera des lieutenants apres l'analyse SERP. » ; « Relancer la proposition IA » |
| « Étape non validée. … », « Voir pourquoi / décider » | `LieutenantsPanel.vue` | `lieutenants-gate-banner`, `lieutenants-gate-review` | La porte retient l'étape | Rouvre l'alarme | — |
| « Sources IA : questions Google (PAA) », « Sources IA : clusters Discovery » (repliées) | `moteur/lieutenants/LieutenantsResultsLayout.vue` | — | `serpResult` | — | Messages « aucune question », « aucun cluster » |
| « Suggestions IA Lieutenants » : flux brut, content-gap, régénération | `moteur/LieutenantsAiPanel.vue` | `ai-panel-suggestion`, `ai-retry-btn`, `ai-regen-btn` | Même condition, sous les propositions (jamais autour : test `lieutenants-results-layout-architecture.test.ts`) | Régénération → `POST /keywords/:keyword/propose-lieutenants` | Erreur + réessai |

**Tests :** [`parcours/lieutenants.parcours.test.ts`](../tests/browser-e2e/parcours/lieutenants.parcours.test.ts),
[`parcours/interactions-lieutenants.parcours.test.ts`](../tests/browser-e2e/parcours/interactions-lieutenants.parcours.test.ts),
[`gates.browser.test.ts`](../tests/browser-e2e/gates.browser.test.ts).

### Onglet Structure

Composant [`moteur/StructureHnPanel.vue`](../src/components/moteur/StructureHnPanel.vue) (composable
`useStructureHn`), qui réutilise [`moteur/LieutenantH2Structure.vue`](../src/components/moteur/LieutenantH2Structure.vue).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Structure de l’article » | `StructureHnPanel.vue` | `structure-panel` | Toujours | — | — |
| « Retenez d’abord au moins un lieutenant… » ou pastilles des lieutenants retenus | `StructureHnPanel.vue` | `structure-needs-lieutenants` | Aucun lieutenant verrouillé | — | Génération impossible |
| Statut : « ✅ Structure validée… » ou « La structure a changé depuis sa validation… » | `StructureHnPanel.vue` | `structure-validated`, `structure-changed` | Étape posée, structure inchangée ou modifiée | — | — |
| Structure des concurrents | `StructureHnPanel.vue` | `structure-competitors-missing` | Montage, changement d'article | `POST /serp/analyze` avec `cacheOnly: true` (lecture seule) | « Lecture de la structure des concurrents… » ; « Les concurrents n’ont pas encore été analysés : l’analyse partira avec « Générer la structure ». » |
| H1 / H2 / H3, cadenas par titre, « Générer la structure Hn » / « Régénérer », « Sauvegarder » ; « Structure Hn concurrents » (repliée) | `LieutenantH2Structure.vue` | `hn-structure-section`, `hn-structure-empty`, `hn-generate-btn`, `hn-regenerate-btn`, `hn-concurrents-section` | Clic | `POST /keywords/:keyword/ai-hn-structure` (flux) ; « Sauvegarder » → `PUT /articles/:id/keywords` (retire l'étape si elle était posée) | Boutons grisés sans lieutenant retenu ; « Aucun heading extrait des concurrents. » |
| « Valider la structure » | `StructureHnPanel.vue` | `structure-validate` | Structure non vide | Enregistrement, `PUT /articles/:id { outline }`, recommandation de longueur, étape `MOTEUR_HN_LOCKED` (porte `hn-lock`) | « Validation… » ; grisé sans structure (« Générez d’abord une structure ») |

**Tests :** [`structure.browser.test.ts`](../tests/browser-e2e/structure.browser.test.ts).

### Onglet Lexique

Composant [`moteur/LexiquePanel.vue`](../src/components/moteur/LexiquePanel.vue) (sans prop `mode`), composables
[`src/composables/lexique/`](../src/composables/lexique/). Tant que le capitaine n'est pas verrouillé,
`MoteurView` affiche au-dessus « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. ».

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Rappel des lieutenants et du niveau ; mots-clés à ajouter | `LexiquePanel.vue`, `KeywordAssistPanel.vue` | `keyword-assist-panel` | — | — | — |
| « Le scrape SERP n'est pas encore disponible… », « Lancer l'analyse SERP (~$0.003 DataForSEO) » et sa confirmation | `LexiquePanel.vue`, `shared/ConfirmModal.vue` | `precheck-missing`, `btn-trigger-serp-scrape`, `confirm-modal`, `confirm-modal-confirm`, `confirm-modal-cancel` | Pré-contrôle `GET /keywords/:keyword/serp/exists` négatif | Confirmation → `POST /serp/tfidf` (scrape) | — |
| « Extraire le Lexique » | `LexiquePanel.vue` | `btn-extract` | Sinon | `POST /serp/tfidf { keyword, articleId }` | « Extraction en cours... » ; grisé si `!canExtract` ; `error-message` |
| Onglets des explorations passées, « Tester un mot-clé » | `shared/TabBar.vue`, `moteur/lexique/LexiqueCustomKeywordInput.vue` | `tab-${id}`, `custom-keyword-section` | Article choisi | Explorations : `GET /articles/:id/explorations` ; « Extraire » : `POST /serp/tfidf` puis relecture | — |
| « Étape non validée. … », « Voir pourquoi / décider » | `LexiquePanel.vue` | `lexique-gate-banner`, `lexique-gate-review` | La porte retient l'étape | Rouvre l'alarme | — |
| Résultats : analyse IA, barre de tri (« A-Z », « Densité », « Pertinence douleur »), trois listes de termes | `LexiquePanel.vue`, `moteur/lexique/LexiqueTermsList.vue` | `lexique-results`, `ia-analysis-section`, `ia-loading`, `ia-error`, `ia-summary`, `lexique-sort-bar` | `tfidfResult` | Analyse IA → `POST /keywords/:keyword/ai-lexique-upfront` (flux) ; case cochée → `saveDecisions` (`PUT /articles/:id/keywords`), `gateAlarm.ensure(id, 'lexique-lock')`, étape `MOTEUR_LEXIQUE_VALIDATED` | « Relancer l'analyse IA » |
| « N terme(s) verrouillé(s) » | `LexiquePanel.vue` | `lexique-lock-status` | Un terme verrouillé | — | — |
| « Analyse IA Lexique » | `moteur/LexiqueAiPanel.vue` (`AiPanel`) | `lexique-ai-stats` et repères `ai-panel-*` | `tfidfResult` | — | — |

Ouvrir l'onglet peut lancer l'extraction et l'analyse IA sans clic (watchers de restauration) : écart décrit
dans [12 — Moteur](12-moteur.md), « Coûts et caches ». **Tests :**
[`moteur-lexique.browser.test.ts`](../tests/browser-e2e/moteur-lexique.browser.test.ts),
[`parcours/lexique.parcours.test.ts`](../tests/browser-e2e/parcours/lexique.parcours.test.ts).

### Onglet Finalisation

Composant [`moteur/FinalisationPanel.vue`](../src/components/moteur/FinalisationPanel.vue), en lecture seule. Il
lit les stores (`article-keywords`, `article-progress`) : aucun appel.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « ✅ Prêt pour la Rédaction » ou « ⏳ Préparation en cours », étapes restantes | `FinalisationPanel.vue` | `finalisation-panel`, `finalisation-title`, `finalisation-pending` | Toujours | `useFinalisationGating` | — |
| Capitaine, « Lieutenants (N) », « Structure (N H2) », « Lexique (N termes) » (sections repliables) | `FinalisationPanel.vue` | `finalisation-capitaine`, `finalisation-lieutenants`, `finalisation-structure`, `finalisation-lexique` | Toujours | — | « Aucun lieutenant verrouillé. », « Aucune structure validée. », « Aucun terme validé. » |
| « Aller à la Rédaction → » | `FinalisationPanel.vue` | `finalisation-cta-redaction` | Toujours | `navigate-redaction` → `navigateToRedaction` | Grisé sans les quatre verrous (même règle que `cta-redaction`) |

**Tests :** [`finalisation-gate.browser.test.ts`](../tests/browser-e2e/finalisation-gate.browser.test.ts),
[`moteur-navigation.browser.test.ts`](../tests/browser-e2e/moteur-navigation.browser.test.ts),
[`moteur-tabs.browser.test.ts`](../tests/browser-e2e/moteur-tabs.browser.test.ts). Aide :
[`helpers/moteur-ui.ts`](../tests/browser-e2e/helpers/moteur-ui.ts) ; alarme :
[`helpers/gate-alarm.ts`](../tests/browser-e2e/helpers/gate-alarm.ts).

## Rédaction d'un cocon — `/cocoon/:cocoonId/redaction`

Vue [`RedactionView.vue`](../src/views/RedactionView.vue). `loadData` au montage : `fetchCocoons` si vide, puis en
parallèle `GET /cocoons/:id/articles`, `GET /keywords/:cocoonName`, `GET /strategy/cocoon/:slug` et
`GET /cocoons/:id/strategy/context`. Construction : [17 — Rédaction](17-redaction.md).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| Fil d'Ariane « Dashboard / silo / cocon / Rédaction » | `Breadcrumb.vue` | — | Toujours | — | — |
| « Contexte stratégique » | `moteur/MoteurStrategyContext.vue` | — | Contexte chargé | — | — |
| « Articles suggérés », « Articles publiés », en lecture seule | `moteur/MoteurContextRecap.vue` (`readonly`) | — | Au moins un article du cocon | Progression par article (`GET /articles/:id/progress`) | — |
| Trois colonnes « Pilier », « Intermédiaire », « Spécialisé » ; une carte par article (statut, lien) | `dashboard/ArticleList.vue` → `dashboard/ArticleCard.vue` | `article-card` | `AsyncContent` | Carte → `/cocoon/:id/article/:articleId` (sans cocon : `/article/:id/editor`) | Quatre cartes fantômes ; erreur + « Réessayer » ; colonne vide « Aucun article » |

Ici, les articles « suggérés » viennent des articles du cocon en base (`cocoon.articles`, statut autre que
« publié »), pas de la carte du Cerveau comme au Moteur. Sans aucun article, `ArticleList.vue` affiche
« Aucun article dans cette thématique. ».

## Article, rédaction guidée — `/cocoon/:cocoonId/article/:articleId`

Vue [`ArticleWorkflowView.vue`](../src/views/ArticleWorkflowView.vue). Construction : [17 — Rédaction](17-redaction.md) ;
briques partagées avec l'éditeur : [19 — Interface](19-interface.md).

**Montage :** identifiant non numérique → « Article ID "…" invalide » et « ← Retour au dashboard ». Sinon, dans
l'ordre : `GET /articles/:id/keywords`, `briefStore.fetchBrief` (`GET /articles/:id`, `GET /keywords/:cocoonName`,
`POST /dataforseo/brief` pour le mot-clé de l'article, `GET /articles/:id/micro-context`, recommandation
`POST /articles/:id/recommend-word-count` sans attendre), `GET /strategy/:id` (stratégie d'article), puis
`GET /articles/:id/content` (sommaire, texte, méta). La stratégie du cocon (`GET /strategy/cocoon/:nom`) se
charge dès que le nom du cocon est connu.

**Navigation du haut :** deux étapes, `wf-step-brief-structure` (« Brief & Structure ») et `wf-step-article`
(« Article »). « Article » est verrouillée sans Cerveau terminé (`cerveauEstComplet`), infobulle « Complétez le
Cerveau pour générer cet article ». Les boutons de la page ne vérifient pas ce verrou
([spec 13](../spec/13-redaction.md), FR-RED-GEN-UNLOCK).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « ← Retour à la rédaction » et barre des panneaux (« SEO », « GEO », « Maillage », « Enrichir », « IA Brief ») | `ArticleWorkflowView.vue`, `article/ArticlePanelsToolbar.vue` | `toggle-enrich` | Toujours | Ouvre un panneau (tableau des panneaux) | SEO, GEO, Maillage, Enrichir grisés sans texte (« Generez un article pour activer… », « Rédigez le premier jet pour l’enrichir ») |
| Étape 1, « Contexte strategique » | `workflow/BriefStructureStep.vue` → `strategy/ContextRecap.vue` | — | `currentStep === 'brief-structure'` | — | — |
| « Micro-contexte article » : « Angle differenciant », « Ton / Style », « Consignes specifiques », « Suggerer par IA » | `BriefStructureStep.vue` | `brief-angle`, `brief-tone`, `brief-directives` | Montage de l'étape | Quitter un champ → `PUT /articles/:id/micro-context` ; suggestion → `POST /api/generate/micro-context-suggest` (flux) | « Sauvegarde » ; aperçu « Suggestion IA » avec « Appliquer » / « Annuler » |
| « Mots-cles » (replié) | `brief/KeywordList.vue`, `keywords/ArticleKeywordsPanel.vue` | — | Brief chargé | Décisions → `PUT /articles/:id/keywords` ; suggestion de lexique → `POST /keywords/lexique-suggest` | — |
| « Recommandation de contenu » | `brief/ContentRecommendation.vue` | — | Brief chargé | Longueur choisie → `PUT /articles/:id/micro-context` | — |
| « Structure / Sommaire » : édition (annuler / rétablir), « Valider le sommaire », « Modifier le sommaire » | `outline/OutlineEditor.vue` / `OutlineDisplay.vue` | `outline-validate`, `outline-unvalidate`, `outline-warning`, `outline-empty` | Sommaire chargé | « Valider le sommaire » → `PUT /articles/:id { outline }`, puis étape 2 | « Sauvegarde en cours... » ; sans sommaire : « Aucun sommaire disponible. Retournez au Moteur… » ; « Chargement de la structure... » |
| « Continuer vers l'Article » | `BriefStructureStep.vue` | `brief-continue` | Sommaire validé | Étape 2 | — |
| Étape 2, bloc « Article » : « Générer l'article », « Régénérer l'article », « Réduire (-N mots) », « Humaniser » et leurs arrêts | `article/ArticleActions.vue` (`useArticleGeneration`) | `generate-button`, `regenerate-button`, `reduce-button`, `abort-reduce-button`, `humanize-button`, `abort-humanize-button`, `reduce-progress-indicator`, `humanize-progress-indicator` | `currentStep === 'article'` ; « Générer » sans texte et sommaire validé | Premier jet : `POST /api/generate/article-draft` (flux), `PUT /articles/:id`, `POST /generate/meta`, `PUT /articles/:id`, puis étape `redaction:draft_accepted` par `runThroughGate` ; réduction : `POST /api/generate/reduce-section` par chapitre ; humanisation : `POST /api/generate/humanize-section` par chapitre | « Génération en cours... » ; boutons exclusifs entre eux ; « Réduire » grisé sans dépassement de la cible |
| Progression par chapitre, erreur, méta, sommaire, texte, coûts, compteur de mots | `article/SectionProgressBar.vue`, `shared/ErrorMessage.vue`, `article/ArticleMetaDisplay.vue`, `article/OutlineRecap.vue`, `article/ArticleStreamDisplay.vue`, `article/ArticleCostBadges.vue`, `article/ArticleWordCountBar.vue` | — | Génération en cours, erreur, texte présent | Erreur : « Réessayer » relance la génération | `ErrorBoundary` autour du texte |
| Bandeau « premier jet » : « ✓ Premier jet accepté… » ou « Premier jet pas encore accepté… », « Valider le premier jet » | `article/DraftAcceptance.vue` | `draft-acceptance` (attribut `data-accepted`), `draft-accepted`, `draft-accept` | Texte présent, génération finie | `acceptDraft` → `POST /articles/:id/progress/check` (porte `draft`, alarme sur un refus) | Bouton grisé pendant un enregistrement |
| « Éditer l'article », « Revoir le Brief » | `ArticleWorkflowView.vue` | `goto-editor`, `back-to-brief` | Texte présent et génération finie ; toujours | `/article/:id/editor` ; étape 1 | — |

Raccourcis clavier : Ctrl+S enregistre (`PUT /articles/:id`) si le texte a changé ; Échap referme le panneau
ouvert. Aucune sauvegarde automatique dans cette vue.

## Les panneaux latéraux de la rédaction

Montés dans `ResizablePanel` par [`article/ArticlePanelsResizable.vue`](../src/components/article/ArticlePanelsResizable.vue),
chacun dans un `ErrorBoundary`. Sans texte, un voile grise le panneau ouvert. L'éditeur ouvre « Blocs » par
défaut, la vue guidée « SEO ».

| Panneau | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « SEO » : jauge, onglets « Mots-clefs », « Indicateurs », « SERP Data » | `panels/SeoPanel.vue` (`useSeoScoring`, calcul local) ; `KeywordsTab.vue`, `indicators/*`, `SerpDataTab.vue` | — | Bouton « SEO » | « SERP Data », actualisation → `briefStore.refreshDataForSeo` → `POST /dataforseo/brief` | « Aucun mot-clé article défini. Configurez le Capitaine et les Lieutenants dans le Moteur. » |
| « GEO » : jauge, « Extractibilité », « Lisibilité » | `panels/GeoPanel.vue` (`useGeoScoring`, calcul local), `panels/geo/*` | — | Bouton « GEO » | — | — |
| « Suggestions de maillage » : ancre, raison, ✓ / ✕, « Actualiser » | `linking/LinkSuggestions.vue` (`useInternalLinking`, `linking.store`) | — | Bouton « Maillage » (première ouverture : demande) | `POST /links/suggest` ; ✓ (éditeur seulement) → lien posé, `PUT /links` | « Analyse du contenu en cours... » ; « Aucune suggestion. Cliquez sur "Actualiser"… ». Dans la vue guidée, ✓ n'a pas d'effet (événement `accept-suggestion` non écouté) |
| « Blocs », « Blocs dynamiques » (glisser-déposer) | `panels/BlocksPanel.vue` | — | Éditeur seulement (`show-blocks-button`) | Bloc dynamique déposé → `POST /api/generate/action` (flux) | — |
| « Enrichir l’article » : passes « Sources », « Exemples », « Tableaux », « Images », « FAQ », « Résumer » ; « Relecture de la langue » | `panels/EnrichmentPanel.vue` (`enrichment.store`) | `enrichment-panel`, `enrich-pass-sources`, `enrich-pass-exemples`, `enrich-pass-tableaux`, `enrich-pass-images`, `enrich-pass-faq`, `enrich-pass-resumes`, `enrich-pass-langue`, `enrich-progress`, `enrich-empty`, `enrich-images-to-provide` | Bouton « Enrichir » avec texte | Passe → `POST /api/generate/enrich/:pass` (flux, un chapitre après l'autre) ; « Résumer » lit d'abord `GET /articles/:id/children` ; relecture → `POST /api/generate/humanize-section` par chapitre, puis `PUT /articles/:id` | « Le capitaine de l’article n’est pas verrouillé : les passes en ont besoin. » ; passes grisées sans capitaine, sans texte ou pendant une autre opération ; « Chapitre n/N — … », « Arrêter » ; message « rien à faire » propre à chaque passe |
| Propositions : alertes, « Sources trouvées », « Comparer avant / après », « Accepter » / « Refuser » ; « Accepter celles sans alerte » | `EnrichmentPanel.vue` | `proposal-${index}`, `proposal-after`, `proposal-accept`, `proposal-refuse`, `enrich-accept-clean` | Une proposition reçue ; plus d'une prête | « Accepter » → chapitre remplacé, `PUT /articles/:id` | « Accepter » grisé sur un défaut ⛔ ; statut « chapitre modifié depuis » |
| « Réécrire un chapitre » : « Chapitre », « Consigne » | `EnrichmentPanel.vue` | `rewrite-chapter`, `rewrite-instruction`, `rewrite-submit` | Chapitre choisi et consigne d'au moins 5 caractères | `POST /api/generate/section-rewrite` → une proposition | — |
| « Analyse IA du Brief », « Relancer l'analyse » | `article/ArticleWorkflowIaBrief.vue` | — | Bouton « IA Brief » (vue guidée seulement ; première ouverture : demande) | `POST /api/generate/brief-explain` (flux) | « Analyse en cours... » ; « Cliquez sur "Relancer l'analyse"… » |

**Tests :** [`enrichment.browser.test.ts`](../tests/browser-e2e/enrichment.browser.test.ts) (passes, réécriture ;
vise aussi `.ProseMirror`, la zone d'édition de TipTap, l'éditeur de texte riche).

## Éditeur — `/article/:articleId/editor`

Vue [`ArticleEditorView.vue`](../src/views/ArticleEditorView.vue). **Montage :** sauvegarde automatique
(`useAutoSave` : toutes les 30 s, si le texte a changé, hors enregistrement, génération, réduction et
humanisation), `fetchCocoons` si vide, `GET /articles/:id/keywords`, `briefStore.fetchBrief`, puis
`GET /articles/:id/content`. Il n'y a pas d'étapes dans la barre du haut.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « ← Retour » (vers la rédaction guidée), état d'enregistrement | `ArticleEditorView.vue`, `editor/SaveStatusIndicator.vue` | — | Toujours | — | — |
| Barre des panneaux (avec « Blocs », sans « IA Brief ») | `ArticlePanelsToolbar.vue` | `toggle-enrich` | Toujours | voir les panneaux | Grisés sans texte |
| Supprimer le contenu, « Sauvegarder », « Visualiser l'article » | `ArticleEditorView.vue` | `editor-delete-content`, `editor-save`, `editor-preview` | Suppression : texte présent ; aperçu : texte, titre et description présents | Suppression (après confirmation du navigateur) et « Sauvegarder » → `PUT /articles/:id` ; aperçu : enregistre si besoin puis ouvre `/article/:id/preview` dans un nouvel onglet | « Sauvegarder » grisé sans modification |
| « Meta SEO », « Table des matières » | `ArticleMetaDisplay.vue`, `OutlineRecap.vue` dans `CollapsableSection` | — | Méta ou sommaire présents | — | — |
| Sans texte : « Aucun contenu. Générez l'article ou retournez au workflow. » | `ArticleEditorView.vue`, `ArticleActions.vue` | `generate-button` … | `!content && !isGenerating` | Génération : mêmes appels que la vue guidée | Chargement et erreur par `AsyncContent` |
| Génération en cours | `ArticleActions.vue`, `SectionProgressBar.vue`, `ArticleStreamDisplay.vue` | idem | `isGenerating` | — | — |
| Bandeau « premier jet » | `DraftAcceptance.vue` | `draft-acceptance`, `draft-accepted`, `draft-accept` | Texte présent | `POST /articles/:id/progress/check` | — |
| Barre d'édition : gras, italique, H2, H3, listes, citation, lien, image, annuler, rétablir | `editor/EditorToolbar.vue` | `toolbar-image`, `toolbar-image-notice` | Texte présent | — | — |
| Menu sur la sélection (« Actions IA ») | `editor/EditorBubbleMenu.vue` | — | Sélection dans le texte | Ouvre le menu des actions | — |
| Texte de l'article | `editor/ArticleEditor.vue` (TipTap, extensions de [`editor/tiptap/`](../src/components/editor/tiptap/)) | — (zone `.ProseMirror`) | Texte présent | Toute modification marque le texte modifié | — |
| Menu des actions, résultat (accepter / rejeter), choix de l'article cible d'un lien | `article/ArticleEditorActionOverlays.vue` → `actions/ActionMenu.vue`, `actions/ActionResult.vue`, `actions/ArticlePicker.vue` (`useContextualActions`) | `action-notice` | Action choisie | `POST /api/generate/action` (flux) ; « Lien interne » n'appelle pas l'IA | Message d'erreur ou d'information |

Raccourcis : Ctrl+S, Échap. **Tests :** [`article-editor.browser.test.ts`](../tests/browser-e2e/article-editor.browser.test.ts),
[`editor-actions.browser.test.ts`](../tests/browser-e2e/editor-actions.browser.test.ts),
[`parcours/bout-en-bout.parcours.test.ts`](../tests/browser-e2e/parcours/bout-en-bout.parcours.test.ts).

## Aperçu et publication — `/article/:articleId/preview`

Vue [`ArticlePreviewView.vue`](../src/views/ArticlePreviewView.vue), sans barre du haut. Au montage :
`GET /preview/:id` (HTML au gabarit du site).

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « ← Retour à l'éditeur », titre | `ArticlePreviewView.vue` | `preview-back` | Toujours | Ferme l'onglet s'il a été ouvert par l'éditeur, sinon `/article/:id/editor` | — |
| « Exporter HTML » | `ArticlePreviewView.vue` | `preview-export`, `preview-export-notice` | Aperçu chargé | `runThroughGate` → `PUT /articles/:id/status { status: 'publié' }` (porte `publish`) ; accepté : téléchargement `article-<id>.html` | « Export... » ; alarme refermée : « Publication annulée : corrigez les points signalés, puis exportez à nouveau. » ; autre erreur : « Publication impossible : … » |
| Aperçu | `<iframe sandbox="allow-same-origin">`, titre « Aperçu de l'article » | — | `previewHtml` | — | « Chargement de l'aperçu... » ; erreur + « Réessayer » ; identifiant invalide : « Article ID "…" invalide » |

**Tests :** [`gates.browser.test.ts`](../tests/browser-e2e/gates.browser.test.ts) (porte de publication),
[`article-editor.browser.test.ts`](../tests/browser-e2e/article-editor.browser.test.ts).

## Maillage — `/linking`

Vue [`LinkingMatrixView.vue`](../src/views/LinkingMatrixView.vue). Au montage, en parallèle :
`linkingStore.fetchMatrix` (`GET /links/matrix`) et `cocoonsStore.fetchCocoons` (`GET /cocoons`). Composants
sous [`src/components/linking/`](../src/components/linking/). Aucun repère de test.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « ← Dashboard », « Matrice de Maillage Interne », « N liens », « N orphelins » | `LinkingMatrixView.vue` | — | Compteurs si `matrix` chargée | — | — |
| Tableau « Source \ Cible », légende « Lien existant » / « Même cocon » | `LinkingMatrix.vue` | — | `matrix` chargée | — | « Aucun article trouvé. » |
| « Articles orphelins » (sans lien entrant) | `OrphanDetector.vue` | — | idem | Lien → `/article/:id/editor` | « Aucun article orphelin. Tous les articles ont au moins un lien entrant. » |
| « Diversité des ancres » | `AnchorDiversityPanel.vue` | — | idem | — | « Bonne diversité : aucune ancre utilisée plus de 3 fois. » |
| « Opportunités cross-cocon » | `CrossCocoonPanel.vue` | — | idem | — | « Aucune opportunité cross-cocon détectée. » |

Chargement et erreur : `AsyncContent` (« Réessayer » ne relance que la matrice). **Test :**
[`linking-matrix.browser.test.ts`](../tests/browser-e2e/linking-matrix.browser.test.ts) (la page se charge).

## Post-publication — `/post-publication`

Vue [`PostPublicationView.vue`](../src/views/PostPublicationView.vue), store `stores/external/gsc.store.ts`.
Au montage : `checkConnection` (`GET /gsc/status`), puis les performances si le compte est connecté et
qu'une propriété est mémorisée (`localStorage` `gsc_site_url`). Aucun repère de test.

| Section | Composant | Repères | Déclenché par | Appelle | États |
|---|---|---|---|---|---|
| « Connecter Google Search Console », « Vérifier la connexion » | `PostPublicationView.vue` | — | `!gscStore.isConnected` | Ouvre `/api/gsc/auth` dans un nouvel onglet ; `GET /gsc/status` | — |
| « Propriété GSC », « Période » (7, 30, 90 jours), « Actualiser » | `PostPublicationView.vue` | — | Compte connecté | `fetchPerformance` → `POST /gsc/performance { siteUrl, startDate, endDate }` (sur Entrée, changement de période, clic) | « Actualiser » grisé sans propriété ; « Chargement... » |
| « Performance par page » : Page, Clics, Impressions, CTR, Position moy. | `PostPublicationView.vue` | — | `gscStore.hasData` | Regroupement par page (`pageMetrics`), tri par clics | « Saisissez votre propriété GSC et cliquez sur Actualiser pour voir les données. » ; erreur + « Réessayer » |

**Test :** [`linking-matrix.browser.test.ts`](../tests/browser-e2e/linking-matrix.browser.test.ts), bloc
« Post-Publication » (la page se charge).

## Page introuvable

Vue [`NotFoundView.vue`](../src/views/NotFoundView.vue) : « 404 », « Page introuvable », « L'adresse que vous
avez saisie ne correspond à aucune page. », lien « Retour au tableau de bord ». Aucun appel, aucun repère.
**Test :** [`dashboard.browser.test.ts`](../tests/browser-e2e/dashboard.browser.test.ts) (route inexistante).

## Règles pour les repères de test

- **Un repère nomme une fonction, pas une apparence.** Il survit à un changement de texte ou de style. Un
  test qui vise un texte (« Chargement de l’arbre du cocon ») ou une classe (`.ProseMirror`) le dit dans son code.
- **Un repère peut porter du code.** `CaptainPanel.gotoLocked` retrouve la carte verrouillée par
  `[data-testid="radar-list-item-${n}"]` : renommer ce repère casse « Aller à la carte verrouillée ».
- **Trois panneaux partagent `ai-panel-suggestion`** (Radar, Lieutenants, Lexique ; celui de Discovery le
  remplace par `discovery-ai-panel`) : un test le cherche dans l'onglet actif.
- **Les tests vérifient aussi des absences** : `brain-validate-all` et `proposal-accept-header` (Cerveau) n'existent
  plus dans `src/` ; les parcours s'assurent qu'ils ne reviennent pas.

**Repères déclarés dans un composant qu'aucun écran ne monte** (code à retirer ou à rebrancher) :

| Composant | Repères | Pourquoi |
|---|---|---|
| `moteur/ai-panel/AiSuggestionList.vue` | `ai-suggestion-list`, `ai-suggestion-checkbox-${id}`, `ai-suggestion-handoff` | Monté nulle part |
| `moteur/CaptainVerdictPanel.vue`, `moteur/VerdictBar.vue` | `kpi-${nom}`, `tooltip-${nom}`, `verdict-bar`, `verdict-bar-nogo` | `CaptainVerdictPanel` n'est monté nulle part ; `VerdictBar` seulement par lui |
| `moteur/CaptainLockPanel.vue` et le mode `libre` de `CaptainPanel.vue` | `${prefix}lock`, `lock-btn`, `locked-state`, `send-to-lieutenants-btn`, `unlock-btn`, `history-carousel`, `captain-empty`, `captain-loading`, `captain-error`, `captain-results`, `thresholds-table`, `paa-list`, `radar-card-section`, `captain-radar-card`, `radar-loading`, `suggested-keywords` | `MoteurView` monte le Capitaine en `workflow` |
| `production/EnginePhase.vue` | — | Monté nulle part |
