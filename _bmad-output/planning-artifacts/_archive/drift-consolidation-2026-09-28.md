---
purpose: 'Écarts doc ↔ code relevés et tranchés lors de la consolidation de la documentation'
companion: 'spec/README.md, spec/requirements.md, design/README.md'
lastUpdated: '2026-09-28T00:00:00Z'
---

# Écarts tranchés à la consolidation — 2026-09-28

> **ARCHIVED.** Historique de la consolidation de la documentation en trois documents centraux
> (`spec/requirements.md`, `spec/specification.md`, `design/design.md`, découpés ensuite le même jour en
> chapitres : [`spec/README.md`](../../../spec/README.md), [`design/README.md`](../../../design/README.md) ;
> « `design.md` » et « `specification.md` » ci-dessous désignent ces chapitres). Chaque écart ci-dessous a été
> **tranché dans ces documents**, en faveur du code (groupe A), d'un choix produit aligné sur le code
> (groupe B), ou consigné comme exigence « non tenue » (groupe C : le code est en défaut, dette à traiter).
> Les anciens documents (`prd.md`, `design-registry.md`, `architecture.md`, `docs/`) n'ont pas été
> réécrits : ils gardent ces écarts, et ne font plus foi.

**Bilan :** 315 écarts — A 148 (doc périmée), B 40 (choix produit),
C 102 (le code est en défaut), D 25 (déjà assumé). Un écart peut relever de deux groupes.

**Où est la liste de travail ?** Les écarts du groupe C sont les exigences au statut « non tenue » de
[`spec/requirements.md`](../../../spec/requirements.md) : c'est là qu'on les suit et qu'on les solde.

Les références `fichier:ligne` ci-dessous ont été relevées au commit `60b9818`.

## Dashboard et Cerveau

*28 écarts — A 12, B 5, C 9, D 2*

Lot L1 — Cerveau (FR-CER) et Dashboard / page du cocon (FR-DASH). 28 écarts : 12 en A, 5 en B, 9 en C, 2 en D.

Les corrections U7 du 2026-09-28 ne sont pas reprises ici :
- le menu « Générer avec Claude » ;
- FR-CER-COCOON-PROGRESSIVE et FR-CER-STEPS-COCOON (« carte non en lecture seule ») ;
- DESIGN-CER-COCOON-PROGRESSIVE, la tech-spec U7, l'étape 1 de la recette, la carte indicative de `ui-sections-guide.md`.

Seuls les écarts restants y sont consignés.

#### 1. La stratégie d'article en six étapes n'a plus d'écran
- **Où :**
  - `prd.md` (FR-CER-STEPS-ARTICLE) — « Avant de rédiger un article, l'utilisateur pose sa stratégie en 6 étapes… Aiguillage… » ;
  - `design-registry.md` (DESIGN-CER-STEPS-ARTICLE) — « store Pinia qui orchestre l'avancement des 6 étapes côté front » ;
  - `docs/data-flows/strategy.md` — « `BrainPhase.vue` — Orchestre les 6 étapes » (avec aiguillage) ;
  - libellés de la page du cocon : « … CTA et aiguillage articles » (porte Cerveau), « Stratégie article, brief… » (porte Rédaction).
- **Code :**
  - `BrainPhase.vue` ne connaît que les étapes du cocon (`cible`, `douleur`, `angle`, `promesse`, `cta`, `articles`).
  - `strategy.store.ts` (six étapes article) n'est utilisé que par `ArticleWorkflowView`, pour `isComplete`. Son commentaire le dit : « `article_strategies` — une stratégie par article, que plus aucun écran ne remplit depuis la refonte ».
  - Seul le mode automatique écrit une stratégie d'article (`scripts/auto-article/phases/cerveau.ts`, étape 8, `PUT /strategy/:id`).
  - Les routes `/strategy/:id/*` restent.
- **Groupe :** B (choix produit de la refonte : le Cerveau travaille au niveau du cocon).
- **Tranché :** l'exigence reste dans `requirements.md` avec le statut « non tenue » : on ne peut pas la retirer sans décision. La spécification dit qu'aucun écran ne propose de stratégie d'article. Le design documente l'API restante.
- **Doute pour Arnaud :** retirer FR-CER-STEPS-ARTICLE, ou reconstruire l'écran ? Les textes des portes « Cerveau » et « Rédaction » promettent encore un « aiguillage » et une « stratégie article ».

#### 2. Le niveau d'un article n'est ni suggéré par l'IA ni forcé : il découle de sa place
- **Où :** `prd.md` (FR-CER-AIGUILLAGE) — « L'IA suggère un niveau par défaut sur la base du titre », « L'utilisateur peut accepter ou forcer un autre niveau » ; `docs/data-flows/strategy.md` — `aiguillage.suggestedType`.
- **Code :**
  - `useCocoonBuilder.ts` (`CHILD_LEVEL`, `childLevelOf`) et `child-candidates.service.ts` (`CHILD_LEVEL`) déduisent le niveau du parent : pilier dans un cocon vide, intermédiaire sous le pilier, spécialisé sous un intermédiaire.
  - `patchArticleSchema` ne connaît pas le niveau.
- **Groupe :** B.
- **Tranché :** en faveur du code. FR-CER-AIGUILLAGE est réécrite : le niveau découle de la place de l'article et ne se change pas.

#### 3. Les « 4 étapes annexes » et la « consolidation » du Cerveau n'existent pas comme telles
- **Où :** `prd.md` (FR-CER-STEPS-COCOON) — « prolongées par 4 étapes annexes (structure des articles, questions PAA cibles, articles spécialisés, topics transverses) », « optionnelles mais accessibles à tout moment », « suggestion IA → ajustement → consolidation → validation ».
- **Code :**
  - `strategy-prompts.service.ts` `cocoonTemplateFor` : `articles-structure`, `articles-paa-queries` et `articles-spe` sont les trois phases internes de la carte complète (`article-proposals/generation.ts`) ; `articles-topics` alimente l'encadré « Sujets suggérés ».
  - Le Cerveau appelle `/enrich` (une sous-réponse validée enrichit le texte validé), jamais `/consolidate`, qui n'a pas d'appelant.
- **Groupe :** A.
- **Tranché :** la spécification décrit la carte complète en trois temps, les sujets suggérés, et l'enrichissement par les sous-réponses. Plus d'« annexes » ni de « consolidation » pour le cocon.

#### 4. La progression compte les étapes atteintes, et la stratégie s'enregistre à « Suivant »
- **Où :**
  - `design-registry.md` (DESIGN-CER-STEPS-ARTICLE) — « chaque validation d'étape… déclenche un upsert… et incrémente `completed_steps` » ;
  - DESIGN-CER-STEPS-COCOON — « chaque action utilisateur (validation d'étape…) appelle `saveStrategy`… optimistic save » ;
  - `docs/data-flows/strategy.md` — « Incrémente `completed_steps` à chaque validation », « Gating… ne pas lancer Moteur si `completedSteps < 2` ».
- **Code :**
  - `cocoon-strategy.store.ts` `nextStep` : `completedSteps = currentStep`, validé ou non, puis `saveStrategy`.
  - `BrainPhase.handleNext` : `completedSteps = 6` à « Terminer le brainstorm ».
  - `updateStepData`, `prevStep` et `goToStep` n'enregistrent rien.
  - Aucun verrou du Moteur ne lit `completedSteps`.
- **Groupe :** A.
- **Tranché :** la spécification décrit les étapes atteintes et les moments d'enregistrement. Elle signale en limite qu'un texte validé est perdu si l'on quitte sans « Suivant » ni action de la carte.

#### 5. La carte complète et les régénérations ne s'enregistrent pas aussitôt
- **Où :** `design-registry.md` (DESIGN-CER-STEPS-COCOON) — « chaque action utilisateur (…ajout/modification d'un article proposé…) appelle `saveStrategy` ».
- **Code :**
  - `article-proposals/generation.ts` `generateArticleProposals` réassigne `store.strategy.proposedArticles` sans `saveStrategy`.
  - `regeneration.ts` (`regenerateTitle`, `regenerateKeyword`, `regenerateSlug`, `select*`) non plus.
  - Le `watch` de `useArticleProposals` n'enregistre que s'il complète un `id`, un `suggestedSlug` ou un `dbId`.
- **Groupe :** C.
- **Tranché :** limite connue dans la spécification. Correction à prévoir : un `saveStrategy` en fin de génération et après chaque régénération.

#### 6. La carte complète efface les articles déjà créés inscrits sur la carte
- **Où :** `prd.md` (FR-CER-COCOON-PROGRESSIVE) — « L'article créé rejoint la carte du cocon, d'où le Moteur tire sa liste d'articles », « un article déjà créé y porte la marque « Créé » ».
- **Code :**
  - `generation.ts` : `store.strategy.proposedArticles = pilierAndInterArticles`, puis `[...pilierAndInterArticles, ...speArticles]`. Les lignes `createdInDb` disparaissent.
  - `MoteurView` construit « Articles suggérés » depuis `proposedArticles` (`buildRecapArticles`). « Articles publiés » ne prend que les phases `redaction` et `published`.
  - Un article créé mais pas encore rédigé sort donc du Moteur dès que la carte est enregistrée.
- **Groupe :** C.
- **Tranché :** FR-CER-COCOON-PROGRESSIVE passe « non tenue », avec cette cause. Correction à prévoir : garder les lignes `createdInDb` quand la carte complète remplace la carte.

#### 7. Un niveau illisible rendu par l'IA retombe en silence sur un niveau par défaut
- **Où :** `prd.md` (FR-CER-TYPE-TOLERANT) — « Il ne retombe jamais en silence sur un niveau par défaut », « Un niveau inconnu est refusé explicitement plutôt que remplacé ».
- **Code :**
  - `article-proposals/builders.ts` `buildSingleArticle` : `parseArticleLevel(obj.type) ?? fallbackType`.
  - `parsers.ts` : repli `'specifique'` pour la carte complète, le niveau demandé pour un ajout.
  - Le refus explicite n'existe que côté serveur, pour un niveau demandé inconnu (`addArticlePromptVariables`, exception).
  - Seule l'alerte globale « Aucun article Pilier dans la liste. » signale une carte entièrement retombée.
- **Groupe :** C.
- **Tranché :** FR-CER-TYPE-TOLERANT passe « non tenue » (repli silencieux sur la carte). La spécification le dit en limite.

#### 8. Micro-contexte : transmis seulement avec un angle, angle provisoire, et lieux d'édition
- **Où :**
  - `prd.md` (FR-CER-MICRO-CONTEXT) — « depuis la fiche article ou depuis la Rédaction », « Quand le micro-contexte est renseigné, l'IA Rédaction… respecte les directives » ;
  - `design-registry.md` (DESIGN-CER-MICRO-CONTEXT) — « Le `LieutenantsPanel` du Moteur peut aussi écrire la `directive` ».
- **Code :**
  - `_helpers.ts` `buildMicroContextBlock`, `outline.routes.ts` et `brief-explain.routes.ts` n'injectent rien si `angle` est vide : un ton ou des consignes seuls sont ignorés.
  - `useStructureHn.recommendWordCount` écrit l'angle « Angle à préciser (suggéré à la validation de la structure) », qui part ensuite tel quel aux consignes.
  - Seule `BriefStructureStep` (Rédaction) édite le micro-contexte. `LieutenantsPanel.vue` n'y touche pas.
- **Groupe :** C (injection et angle provisoire), A (lieux d'édition).
- **Tranché :** FR-CER-MICRO-CONTEXT passe « non tenue », avec ces deux causes. L'édition est décrite dans la Rédaction seulement.

#### 9. La recommandation de longueur est automatique, sans bouton ni détail à l'écran
- **Où :** `prd.md` (FR-CER-WORD-COUNT-RECOMMEND) — « L'utilisateur peut demander une recommandation à tout moment », « un détail expliquant les 3 signaux », « Il clique sur « Recommander » ».
- **Code :**
  - Aucun bouton : `brief.store.fetchBrief` et `useStructureHn.recommendWordCount` appellent `POST /articles/:id/recommend-word-count` d'eux-mêmes.
  - `ContentRecommendation.vue` montre une fourchette de ±20 %, « Cible : − N + » et « Base : ~N mots ». La raison n'apparaît que dans la pile d'activité.
  - L'IA n'est appelée que si la moyenne des concurrents **et** le sommaire existent (`recommendTargetWordCount`).
- **Groupe :** B.
- **Tranché :** en faveur du code. L'exigence est réécrite autour de la recommandation automatique.

#### 10. La configuration du thème n'atteint pas toutes les consignes, et ne se supprime pas
- **Où :**
  - `prd.md` (FR-CER-THEME-CONFIG) — « automatiquement injectée dans **tous** les prompts », « la créer, la modifier et la supprimer » ;
  - En situation : « Tous ses articles… adoptent ce ton et glissent ce CTA » ;
  - `design-registry.md` (DESIGN-CER-THEME-CONFIG) — « `strategy.routes.ts` — endpoints `GET / PUT /api/theme-config` ».
- **Code :**
  - La configuration entière ne va qu'aux consignes du Cerveau (copie envoyée par `BrainPhase.buildThemeContext`) et à la suggestion du micro-contexte.
  - Secteur, audience, services et promesse vont au tri de Discovery (`keywords.routes.ts`, `/keywords/relevance-score`, `/keywords/analyze-discovery`).
  - La localisation va partout où `{{zone}}` est cité (`loadZoneContext`). Le ton et le CTA n'atteignent ni le Moteur ni le premier jet (`toneOfVoice` n'est lu que par `strategy-prompts.service.ts`).
  - Les routes sont `GET` / `PUT /api/theme/config`, dans `silos.routes.ts`, et aucune suppression.
- **Groupe :** C (injection), A (suppression, chemin de route).
- **Tranché :** FR-CER-THEME-CONFIG passe « non tenue » pour l'injection. La suppression sort des critères.

#### 11. Le contexte stratégique du Moteur ne porte que le cocon, et renvoie des `null`
- **Où :**
  - `prd.md` (FR-CER-CONTEXT-FOR-MOTEUR) — « cocon + article » ;
  - `design-registry.md` (DESIGN-CER-CONTEXT-FOR-MOTEUR) — « Les valeurs non-validées ou vides sont **omises** », « l'endpoint répond `{ cocoonName, siloName }` seulement » ;
  - `docs/data-flows/strategy-context.md` — « affiche les 6 réponses validées article ».
- **Code :** `cocoons.routes.ts` `GET /cocoons/:id/strategy/context` renvoie les cinq champs du **cocon**, chacun `validated || null`, et `{ data: null }` sans stratégie. `MoteurStrategyContext.vue` masque les valeurs vides.
- **Groupe :** A.
- **Tranché :** en faveur du code.

#### 12. La correction de l'intention éditoriale : un sélecteur, un `PATCH`, pas de toast
- **Où :**
  - `prd.md` (FR-PIE-CERVEAU-OVERRIDE) — « sélecteur radio », « Le toast de confirmation apparaît » ;
  - `design-registry.md` (DESIGN-PIE-CERVEAU-OVERRIDE) — « `PUT /api/articles/:id` », « Notification toast confirme » ;
  - `docs/pain-point-editorial-backbone.md` — « dropdown radio ».
- **Code :** `ProposedArticleRow.vue` (`<select>`, visible une fois la ligne dépliée) ; `useArticleProposals.updatePainIntent` (`saveStrategy`, puis `apiPatch('/articles/:dbId')`, sans notification).
- **Groupe :** A.
- **Tranché :** en faveur du code.

#### 13. Création honnête : origine de la douleur, et « l'adresse » qu'on ne peut pas changer
- **Où :** `design-registry.md` (DESIGN-CER-COCOON-PROGRESSIVE) — « intention et douleur reprises d'une proposition de même titre ».
- **Code :**
  - `useCocoonBuilder.createFromCandidate` : `painPoint = candidate.painPoint || existing?.painPoint`, donc la douleur du candidat l'emporte. L'intention, elle, vient de la carte d'abord.
  - Le message `SLUG_TAKEN` dit « changez le titre ou l'adresse », mais le panneau des candidats n'a pas de champ d'adresse : l'adresse est tirée du titre.
- **Groupe :** A.
- **Tranché :** la spécification décrit l'ordre réel. L'exigence dit « invite à changer le titre » ; le message est cité tel quel.

#### 14. La navigation n'a pas trois niveaux de listes : l'accueil montre déjà les cocons, la page du cocon aucun article
- **Où :**
  - `prd.md` (FR-DASH-NAV) — « À chaque niveau, il voit la liste des éléments du niveau inférieur », « Le clic sur un silo conduit à la liste de ses cocons », « Le clic sur un article conduit… » ;
  - `design-registry.md` (DESIGN-DASH-NAV) — `GET /api/cocoons?siloId=…`, `GET /api/articles?cocoonId=…`, « lazy fetch… lors du drill-down », `ArticleCard` « titre + dots » ;
  - `docs/data-flows/articles.md` — `ArticleCard` « dots de progression via `ProgressDots` », `GET /cocoons` « route non trouvée ».
- **Code :**
  - L'accueil charge tout d'un coup (`GET /api/silos`) et affiche les cocons de chaque silo.
  - `CocoonLandingView` ne liste pas d'articles.
  - `ArticleCard` (titre, statut, score d'opportunité) ne sert qu'à la liste de la Rédaction.
  - `GET /api/cocoons` existe (`cocoons.routes.ts`).
- **Groupe :** B.
- **Tranché :** en faveur du code. FR-DASH-NAV est réécrite : les articles s'ouvrent depuis la Rédaction et l'arbre du Cerveau.

#### 15. « Aucune porte bloquée » contre le verrou de génération de la Rédaction
- **Où :**
  - `prd.md` (FR-DASH-WORKFLOW-CHOICE) — « il a quand même la possibilité d'entrer directement par Rédaction… l'app ne bloque pas », « bannières de transition » ;
  - `prd.md` (FR-RED-GEN-UNLOCK) — l'étape « Article » est verrouillée tant que le Cerveau n'est pas complet ;
  - `design-registry.md` (DESIGN-DASH-WORKFLOW-CHOICE) — routes `/cocoon/:cocoonId/brain` et `/cocoon/:cocoonId/article/:articleId/moteur`, lecture d'un aperçu de stratégie et de la progression.
- **Code :**
  - `WorkflowChoice.vue` : trois liens vers `/cerveau`, `/moteur` et `/redaction`, jamais désactivés. Aucune bannière. Badge Cerveau figé à « 6 étapes » (`strategyProgress` jamais passé).
  - `CocoonLandingView` lit cocons, articles et mots-clés, pas la stratégie.
  - `ArticleWorkflowView` verrouille l'étape « Article » (`cerveauEstComplet`).
- **Groupe :** D (le verrou de la Rédaction est délibéré) ; A pour les routes.
- **Tranché :** les portes restent ouvertes ; la génération attend le Cerveau, dans la Rédaction. Les routes sont décrites d'après `src/router/index.ts`.

#### 16. Les points de progression : lus article par article, sans mise à jour optimiste, aussi dans la Rédaction
- **Où :**
  - `design-registry.md` (DESIGN-DASH-PROGRESS) — « la colonne arrive piggy-back », « optimistic update », « `useArticleProgressStore` (`AUTHORITY:` sur `articles.completed_checks`) » ;
  - `prd.md` (FR-DASH-PROGRESS) — « dans les listes d'articles en haut du Moteur ».
- **Code :**
  - `MoteurContextRecap` appelle `fetchProgress(id)` (`GET /articles/:id/progress`) pour chaque article visible.
  - `addCheck` et `removeCheck` écrivent la réponse du serveur.
  - `article-progress.store.ts` n'a pas d'en-tête `AUTHORITY:`.
  - `RedactionView` monte aussi `MoteurContextRecap` (en lecture seule), avec les points.
- **Groupe :** A.
- **Tranché :** en faveur du code.

#### 17. `ui-sections-guide.md` décrit encore un en-tête, des liens et des routes qui n'existent pas
- **Où :** `docs/ui-sections-guide.md` :
  - §1.1, liens « Labo », « Explorateur » ;
  - §2.1 et §2.2.6, « `@next` → navigation vers Moteur » ;
  - §2.2.1, « `ProgressBar`… bouton "Continuer vers le Moteur" » ;
  - §2.2.2, stepper dans `BrainPhase` ;
  - §2.2.5 (lignes « Bouton génération principale » → `POST /generate/structure…` et « TopicSuggestions » → `POST /strategy/cocoon/:slug/topics`) ;
  - §8.1 (`/strategy/cocoon/:slug/topics`, `/generate/structure|paa-queries|specialises`, `PUT /strategy/cocoon/:slug/save`) ;
  - §11.2 et §11.5 (`Cerveau -->|@next| Moteur`).
- **Code :**
  - `DashboardView` : liens « Maillage », « GSC » et la roue dentée seulement ; aucune route `/labo` ni `/explorateur`.
  - `CerveauView.handleNext` → `/cocoon/:id`.
  - `BrainPhase` n'a ni titre ni barre de progression : les étapes sont dans la barre de l'application (`useWorkflowNavStore`).
  - La génération passe par `POST /strategy/cocoon/:slug/suggest` (étapes `articles-*`) et `POST /paa/batch` ; la sauvegarde par `PUT /strategy/cocoon/:slug`.
- **Groupe :** A.
- **Tranché :** en faveur du code.

#### 18. `docs/data-flows/strategy.md` mélange stratégie d'article et Cerveau du cocon
- **Où :** `docs/data-flows/strategy.md` — producteurs `POST /api/strategy/:id/suggest…` présentés comme ceux du Cerveau ; `StrategyStep` pour « cible, douleur, angle, promesse, cta, aiguillage » ; `MoteurStrategyContext` qui « utilise `buildStrategyContext(strategy)` ».
- **Code :** le Cerveau n'appelle que `/strategy/cocoon/:slug/*`. `MoteurStrategyContext` reçoit les cinq valeurs de `GET /cocoons/:id/strategy/context`.
- **Groupe :** A.
- **Tranché :** le design décrit séparément « Stratégie du cocon » et « Stratégie d'article (sans écran) ».

#### 19. Le titre de l'accueil lit un nom de thème que rien n'enregistre
- **Où :** `docs/ui-sections-guide.md` §1.1 — « Titre du thème ».
- **Code :** `data.service.ts` `getTheme` lit `theme_config.data.nom`, absent de `themeConfigSchema` et donc retiré à chaque `saveThemeConfig`. Le repli donne le nom et la description du premier silo (`SELECT nom, description FROM silos LIMIT 1`, sans ordre).
- **Groupe :** C.
- **Tranché :** la spécification dit que l'accueil reprend, en pratique, le premier silo.

#### 20. L'identifiant d'un silo dans l'URL est son rang
- **Où :** aucune doc ne le dit. `docs/ui-sections-guide.md` parle de `/silo/:siloId`.
- **Code :** `data.service.ts` `getSilos` (`id: idx`), `SiloCard` (`/silo/${silo.id}`), `SiloDetailView` (`s.id === Number(route.params.siloId)`). Les cocons ont été corrigés pour le même défaut (`cocoons-id-stability`), pas les silos.
- **Groupe :** C.
- **Tranché :** signalé dans le design, comme risque.

#### 21. Un refus de création de cocon remplace toute la liste de l'accueil
- **Où :** aucune doc.
- **Code :** `silos.store.ts` `addCocoon` écrit `error`, que `DashboardView` passe à `AsyncContent` : la liste des silos laisse place au message brut du serveur, en anglais (« Cocoon "…" already exists in silo "…" »).
- **Groupe :** C.
- **Tranché :** limite connue dans la spécification (FR-DASH-COCOON-CREATE).

#### 22. Un message de liste vide affiche une séquence d'échappement
- **Où :** —
- **Code :** `src/components/dashboard/ArticleList.vue` (liste de la Rédaction) : `Aucun article dans cette thématique.` dans le gabarit ; l'écran affiche `é` tel quel.
- **Groupe :** C.
- **Tranché :** dette signalée ; le composant sert la page Rédaction (domaine Rédaction).

#### 23. Les sujets suggérés se génèrent sans clic
- **Où :** `prd.md` (FR-CER-KEYWORD-REAL-DATA) — « Demander des candidats est payant : c'est toujours un clic de l'utilisateur » (règle posée pour les candidats seulement).
- **Code :** `article-proposals/topics.ts` : le `watch` sur `store.currentStep` appelle `generateTopics()` (un appel à l'IA) à l'arrivée à l'étape Articles, si la carte n'a aucun sujet et qu'une réponse au moins est validée.
- **Groupe :** B.
- **Tranché :** en faveur du code ; la spécification le dit. À confirmer par Arnaud si la règle « payant = un clic » doit valoir pour tout le Cerveau.

#### 24. Nouvel identifiant : FR-DASH-COCOON-CREATE
- **Où :** `prd.md` §8.2 — la création d'un cocon depuis l'accueil n'y figure pas.
- **Code :** `SiloCard.vue` (carte « Nouveau cocon »), `silos.store.addCocoon`, `POST /api/silos/:name/cocoons` (`addCocoonToSilo`).
- **Groupe :** A.
- **Tranché :** exigence ajoutée, **FR-DASH-COCOON-CREATE**, active.

#### 25. Identifiants cités par les tests mais absents du PRD : FR-CER-SAISIE-PRESERVEE, FR-CER-PROPOSE
- **Où :** `tests/unit/architecture/requirements-trace.test.ts` (`LEGACY_ORPHANS`).
- **Code :**
  - `StrategyStep.vue` (le `watch` sur `stepData.input`) et `tests/unit/components/strategy-step-saisie.test.ts` pour FR-CER-SAISIE-PRESERVEE.
  - `tests/unit/components/brain-phase-architecture.test.ts` pour FR-CER-PROPOSE (les propositions en trois colonnes à l'étape 6).
- **Groupe :** D (dette figée dans `LEGACY_ORPHANS`).
- **Tranché :**
  - FR-CER-SAISIE-PRESERVEE entre dans `requirements.md` (active), sous son identifiant existant.
  - FR-CER-PROPOSE n'est pas reprise : son contenu est couvert par FR-CER-STEPS-COCOON (carte indicative). Le test peut citer FR-CER-STEPS-COCOON.
  - Les deux IDs peuvent sortir de `LEGACY_ORPHANS` une fois les nouveaux documents en place.

#### 26. FR-LEX-PRECHECK-PERSISTE est rangée dans la section Cerveau du PRD
- **Où :** `prd.md` §8.1, entre FR-CER-KEYWORD-REAL-DATA et FR-CER-CREATION-HONNETE.
- **Code :** l'exigence porte sur l'onglet Lexique du Moteur.
- **Groupe :** A.
- **Tranché :** hors du lot L1. À reprendre par le lot du Lexique (à vérifier à l'assemblage qu'elle n'est pas perdue).

#### 27. En-têtes `AUTHORITY:` périmés
- **Où / Code :**
  - `server/services/strategy/child-candidates.service.ts` — « WRITES TO: keyword_metrics, keyword_serp_results ». La mesure n'écrit plus `keyword_serp_results` : relevé en cache `serp-top` (`keyword-measure.service.ts`).
  - `server/services/article/target-word-count.service.ts` — cite `LieutenantsPanel` parmi les consommateurs ; l'appelant est `useStructureHn`.
  - `src/stores/article/article-progress.store.ts` — sans en-tête, alors que DESIGN-DASH-PROGRESS lui en prête un.
- **Groupe :** A.
- **Tranché :** le design dit ce que fait le code. En-têtes à corriger au prochain passage.

#### 28. La douleur d'un article ne se modifie pas au Cerveau
- **Où :**
  - `docs/pain-point-editorial-backbone.md` §1 — « La seule façon de modifier un painPoint est de revenir explicitement dans le Cerveau » ;
  - §3 — les articles « générés du cocon » embarquent leur douleur.
- **Code :**
  - La douleur est posée à la création : celle du candidat, sinon celle de la proposition de la carte (`createFromCandidate`).
  - Sur la carte, « Douleur » est un texte en lecture (`ProposedArticleRow.vue`).
  - `patchArticleSchema` n'accepte pas `painPoint`.
  - Les articles ne naissent plus de la carte, mais du constructeur.
- **Groupe :** A.
- **Tranché :** la spécification dit d'où vient la douleur à la création. Le Cerveau n'offre pas de la modifier ensuite.

## Moteur — cadre commun, Discovery, Finalisation

*37 écarts — A 17, B 5, C 14, D 1*


Relevés sur la branche `feat/cerveau-generer-au-choix` (commit `60b9818`). Groupes : A (doc périmée, le code est juste), B (choix produit), C (le code est en défaut, dette), D (déjà assumé).

---

### Navigation, phases, sélection d'article

#### 1. Libellé de la phase ①
- **Où :** `prd.md` (FR-MOT-PHASES) — titre « Explorer / Valider / Finaliser », critère « Générer », « Valider », « Finaliser » ; `docs/ui-sections-guide.md` §3.1 — « Phase ① renommée Explorer ».
- **Code :** `src/composables/moteur/useMoteurTabs.ts` — `phases` : « Générer », « Valider », « Finaliser » ; `src/components/moteur/ProgressDots.vue` — `PHASE_GROUPS` étiquette les groupes de points « Explorer » et « Valider » (texte d'accessibilité).
- **Groupe :** A
- **Tranché :** la barre d'onglets dit « Générer », « Valider », « Finaliser ». « Explorer » ne subsiste que dans l'étiquette d'accessibilité des points.

#### 2. Discovery et Radar désactivés quand les mots-clés sont validés au cocon
- **Où :** `prd.md` (FR-MOT-FREE-NAV) — « Le seul cas où un onglet est désactivé est aucun article sélectionné » ; `prd.md` (FR-MOT-SOFT-GATING, règle 2) — « verrouillés visuellement » ; `docs/ui-sections-guide.md` §3.1 et §7 — « F1 — toujours cliquables. Aucun lock banner ».
- **Code :** `useMoteurSoftGating.ts` — `isDiscoveryAllowed` faux si le mot-clé de l'article existe au cocon avec un statut autre que `suggested` (donc `validated` **ou** `rejected`) ; `useMoteurTabs.ts` — `navGroups` pose `locked` sur Discovery et Radar ; `src/components/shared/WorkflowNav.vue` — `clickItem` ignore un onglet `locked` (bouton `disabled`). `MoteurView.vue` affiche un bandeau « Les onglets Discovery et Radar sont verrouillés… » avec « Voir le Capitaine → ».
- **Groupe :** B
- **Tranché :** comportement du code. Deux cas désactivent un onglet : aucun article sélectionné ; Discovery et Radar quand le mot-clé de l'article n'est plus « suggéré » au niveau du cocon. FR-MOT-FREE-NAV est réécrite en ce sens. La mention « aucun lock banner » est périmée.

#### 3. Rafraîchissement de la progression au changement d'article
- **Où :** `design-registry.md` (DESIGN-MOT-ARTICLE-SELECTION) — « à la sélection : `articleProgressStore.fetchProgress(id)` » ; `docs/data-flows/completed-checks.md` — « Fetch au mount et au changement d'article ».
- **Code :** `MoteurView.vue` — `handleSelectArticle` n'appelle pas `fetchProgress`. `MoteurContextRecap.vue` — le watcher sur les listes charge la progression d'un article **seulement si elle n'est pas déjà en mémoire** (`if (!progressStore.getProgress(id))`).
- **Groupe :** A
- **Tranché :** la progression d'un article est lue une fois par session (tant qu'elle reste dans les 50 dernières en mémoire), puis tenue à jour par les réponses des écritures d'étapes.

#### 4. « Articles suggérés » et « Articles publiés » peuvent se chevaucher
- **Où :** `prd.md` (FR-MOT-RECAP-PUBLISHED) — « ne doivent jamais se chevaucher » ; « un article en cours de travail Moteur vit dans la liste principale de sélection ».
- **Code :** `MoteurView.vue` — `suggestedArticlesForRecap` = `buildRecapArticles(strategy.proposedArticles, …)` (`src/utils/recap-articles.ts`) : **toutes** les propositions de la stratégie du cocon, sans filtre de phase ; `publishedArticles` = `cocoon.publishedArticles` (phase `redaction` ou `published`, `loadArticlesDb`). Il n'existe pas de troisième liste.
- **Groupe :** C (chevauchement) et A (liste principale inexistante)
- **Tranché :** FR-MOT-RECAP-PUBLISHED est « non tenue » : un article de la stratégie entré en rédaction figure dans les deux listes. La garantie serveur ne porte que sur la liste « Articles publiés ». La « liste principale » est retirée de la spec.

#### 5. Source de la carte des capitaines
- **Où :** `design-registry.md` (DESIGN-MOT-CANNIBALIZATION, DESIGN-MOT-RECAP-LOCK-SYNC) — `SELECT … captain_keyword_locked FROM articles`.
- **Code :** `server/routes/cocoons.routes.ts` — `GET /cocoons/:cocoonName/capitaines` lit `getArticleKeywordsByCocoon` et garde `article_keywords.capitaine` non vide. `saveArticleKeywords` recopie cette valeur dans `articles.captain_keyword_locked`.
- **Groupe :** A
- **Tranché :** la carte lit `article_keywords.capitaine`. Le miroir contient la même valeur.

#### 6. Soupçon : changement d'article pendant que l'onglet Lieutenants est monté
- **Où :** `prd.md` (FR-MOT-ARTICLE-SELECTION) — « Changer d'article … en préservant les données persistées en base ».
- **Code :** `MoteurView.vue` — `handleSelectArticle` vide le store (`articleKeywordsStore.$reset()`) puis relit en asynchrone. `LieutenantsPanel.vue` — le watcher sur `lieutenantsCheckActive` voit passer « vrai → faux » et appelle `withdrawCheck()` puis `articleKeywordsStore.saveDecisions(id)` ; `saveDecisions` sur un store vide appelle `initEmpty(id)` et envoie des décisions vides (`PUT /articles/:id/keywords`).
- **Groupe :** C (suspecté, lecture de code seulement, non reproduit)
- **Tranché :** l'exigence reste « active ». Risque à vérifier par un test du lot Lieutenants : article A avec lieutenants verrouillés, onglet Lieutenants déjà visité, sélection de l'article B. Le test existant (`lieutenants-selection-isolation.test.ts`) remplit le store avant de changer d'article et ne couvre pas l'état vide intermédiaire.

---

### Étapes (checks) et verrous

#### 7. Le serveur n'exige pas l'appartenance au catalogue
- **Où :** `prd.md` (FR-MOT-CHECKS-CONSTANTS) — « Aucun nom hors catalogue n'est accepté côté serveur » ; « une tentative avec un nom inventé est rejetée ».
- **Code :** `shared/schemas/article-progress.schema.ts` — `writeCheckRegex = /^(moteur:[a-z]+(_[a-z]+)*|redaction:draft_accepted)$/`. `moteur:nimporte_quoi` passe. `server/routes/articles.routes.ts` ne compare pas à `ALL_WORKFLOW_CHECKS`.
- **Groupe :** C
- **Tranché :** « non tenue » : le serveur refuse un format non conforme, pas un nom inventé au bon format.

#### 8. Pas de mise à jour optimiste
- **Où :** `design-registry.md` (DESIGN-MOT-CHECKS) — « Optimistic update côté store » ; `docs/data-flows/completed-checks.md` — « mise à jour optimiste du cache Pinia ».
- **Code :** `src/stores/article/article-progress.store.ts` — `addCheck` / `removeCheck` attendent la réponse du serveur, puis remplacent l'entrée par la progression renvoyée.
- **Groupe :** A
- **Tranché :** l'affichage suit la réponse du serveur. Une étape refusée par sa porte (422) n'apparaît jamais cochée.

#### 9. Retrait en cascade de l'étape Structure
- **Où :** `docs/ui-sections-guide.md` §3.1 — « F5 — Pas de cascade à l'unlock » ; `prd.md` (FR-MOT-CHECKS) ne mentionne que le retrait de l'étape elle-même.
- **Code :** `shared/constants/workflow-checks.constants.ts` — `CHECK_DEPENDENTS` et `checksRemovedWith` ; `POST /articles/:id/progress/uncheck` retire aussi `moteur:hn_locked` quand on retire `moteur:capitaine_locked` ou `moteur:lieutenants_locked`.
- **Groupe :** A
- **Tranché :** retirer le Capitaine ou les Lieutenants retire aussi « Structure validée ». Les données (lieutenants, lexique) ne sont pas effacées.

#### 10. Réconciliation : une fois par onglet, pas à chaque ouverture
- **Où :** `prd.md` (FR-MOT-CHECK-RECONCILIATION) — « Quand l'utilisateur ouvre un onglet Phase ② ».
- **Code :** `CaptainPanel.vue` — `onMounted` ; `LieutenantsPanel.vue`, `LexiquePanel.vue` — premier passage (`isFirstRun`) du watcher. Les panneaux restent montés (`v-if` à la première visite, puis `v-show`). Pour les Lieutenants et le Lexique, l'ajout passe par la porte (`verifyLockedLieutenants`, `requestLexiqueGate`).
- **Groupe :** A
- **Tranché :** la réconciliation s'exécute à la première ouverture de chaque onglet pendant la visite du Moteur, pas à chaque retour ni à chaque changement d'article.

#### 11. Vocabulaire « Verrouiller »
- **Où :** `prd.md` (FR-UI-VOCABULAIRE-VERROUILLER) — boutons « Verrouiller les Lieutenants », « Verrouiller le Lexique » ; « Le mot Valider n'apparaît plus dans l'UI du workflow Moteur ».
- **Code :** seul « Verrouiller ce mot-clé » existe (`src/components/moteur/`). Lieutenants et Lexique se retiennent par cases à cocher, sans bouton. L'onglet Structure affiche « Valider la structure » ; la phase ② s'appelle « Valider ».
- **Groupe :** A (boutons disparus) et B (« Valider la structure »)
- **Tranché :** l'exigence est réduite : aucun bouton « Valider ce Capitaine / les Lieutenants / le Lexique ». « Valider la structure » est un choix assumé du lot Structure.

#### 12. Mode `libre` sans écran et sans Lexique
- **Où :** `prd.md` (FR-MOT-MODE-BIMODAL) ; `design-registry.md` (DESIGN-MOT-MODE-BIMODAL) — « LexiquePanel — même contrat » ; `docs/moteur-data-flow.md` §11 et `docs/ui-sections-guide.md` §6.1 — `LaboView`.
- **Code :** `mode` existe sur `DiscoveryPanel`, `RadarPanel`, `CaptainPanel`, `LieutenantsPanel`, `StructureHnPanel`, pas sur `LexiquePanel`. Aucune vue ne monte ces panneaux en `libre` : `MoteurView.vue` est le seul hôte (`src/views/` n'a pas de `LaboView`).
- **Groupe :** C (Lexique) et A (Labo)
- **Tranché :** « non tenue » : le Lexique n'a pas de mode libre, et aucun écran n'utilise le mode libre.

---

### Coûts, caches, contexte IA

#### 13. L'onglet Capitaine lance des appels IA à l'ouverture
- **Où :** `prd.md` (FR-MOT-NO-AUTO-ACTION) — « Ouvrir un onglet n'envoie aucun appel IA » ; `prd.md` (FR-CAP-PAA-JUDGE-HAIKU) — « L'appel IA est déclenché à l'ouverture de l'onglet Capitaine ».
- **Code :** `CaptainPanel.vue` — watcher `[active, selectedArticle.id]` → `articleKeywordsStore.loadCaptainPaaJudgments(id)` → `POST /articles/:id/captain/judge-paa` → `runPaaJudgmentsForArticle` (Claude Haiku, par mot-clé exploré ayant des questions PAA et une douleur d'au moins 10 caractères). Mémoire de session par article.
- **Groupe :** B (contradiction doc ↔ doc)
- **Tranché :** comportement du code. FR-MOT-NO-AUTO-ACTION porte une exception déclarée : le jugement des questions PAA à l'ouverture du Capitaine, une fois par article et par session.

#### 13 bis. L'onglet Lexique lance l'analyse IA à l'ouverture (signalé par le lot L4)
- **Où :** `prd.md` (FR-MOT-NO-AUTO-ACTION) — « Ouvrir un onglet n'envoie aucun appel IA » ; lot L4, conflit sur FR-LEX-AI-PANEL.
- **Code :** `LexiquePanel.vue` — watcher `immediate` sur `[isCaptaineLocked, captainKeyword, articleId, serpExists]` : `hydrateFromDb()` (`useLexiqueExplorations`, relit `GET /articles/:id/explorations`, restaure extraction et recommandations), puis `fetchTfidf(keyword)` si aucune extraction et si les pages concurrentes sont déjà lues. Le watcher `watch(tfidfResult)` appelle `generateLexiqueUpfront()` dès qu'une extraction apparaît sans recommandations → `POST /keywords/:keyword/ai-lexique-upfront` (Claude, aucun cache serveur ; résultat enregistré dans `lexique_explorations`).
- **Groupe :** C
- **Tranché :** FR-MOT-NO-AUTO-ACTION « non tenue ». L'appel ne part pas si des recommandations sont déjà enregistrées pour ce mot-clé. Il part à la première ouverture qui suit une extraction sans recommandations (échec précédent de l'IA, extraction recalculée).

#### 14. Clic sur un mot-clé en Discovery : analyse Capitaine différée
- **Où :** absent du PRD ; décrit dans `docs/ui-sections-guide.md` §3.3 (« Trigger pré-validation Capitaine », route `/validate` périmée) ; `design-registry.md` renvoie à un `DESIGN-CAP-AUTO-TRIGGER` qui n'existe pas.
- **Code :** `DiscoveryPanel.vue` — `handleKeywordClick` → `useCaptainTriggerStore().schedule(…)` (`src/stores/ui/captain-trigger.store.ts`, `SCHEDULED_MS = 5_000`) → `POST /keywords/:kw/scan` puis `POST /articles/:id/captain-explorations`. Toast global `CaptainTriggerToast.vue` : « Validation Capitaine dans Ns », bouton « Annuler ». Décocher annule.
- **Groupe :** B
- **Tranché :** comportement conservé, nouvelle exigence **FR-DIS-CAPTAIN-PRESCAN** (ID créé). Le coût part d'un clic explicite, annulable pendant 5 secondes.

#### 15. « Vider le cache externe » ne purge presque rien
- **Où :** `prd.md` (FR-MOT-EXTERNAL-CACHE-CLEAR) — bouton visible dès qu'un article est sélectionné, libellé « Vider le cache externe », la prochaine recherche « re-paye » ; exemple « volumes / KD / CPC effacés ».
- **Code :** `TabCachePanel.vue` — bouton « Vider le cache », visible seulement si `cacheTotal > 0` ; `src/utils/tab-cache-entries.ts` — `cacheCount` vaut 1 uniquement pour un scan Radar en mémoire absent du cache Radar (0 ailleurs). `server/routes/article-explorations.routes.ts` — `DELETE /articles/:id/external-cache` supprime les types `autocomplete`, `autocomplete-intent`, `paa`, `serp`, `validate` : aucun n'est plus écrit par le serveur (types actifs : `dataforseo`, `keyword-discovery`, `suggest`, `validation`, `serp-top`, `radar`, `long-tail-suggest`, `gsc`). `keyword_metrics` n'est jamais touchée.
- **Groupe :** C
- **Tranché :** « non tenue » : le bouton est presque toujours caché et la purge ne force aucun nouvel appel payant.

#### 16. Cache cross-article « permanent » et appels IA sans cache
- **Où :** `prd.md` (FR-MOT-CACHE-CASCADE) — cache cross-article permanent, puis cache à durée de vie, avant **tout** appel payant (DataForSEO, Anthropic, Gemini, scraping) ; `design-registry.md` — `getOrFetch` dupliqué dans chaque service (DRIFT-009).
- **Code :** `server/db/cache-helpers.ts` — `getOrFetch` centralisé ; `suggest.service.ts` (1 h), `keyword-discovery.service.ts` (24 h), `dataforseo/cache.ts` (7 j) ; `keyword-scan.routes.ts` réutilise `keyword_metrics` si la mesure a moins de 7 jours (`FRESHNESS_DAYS`). `POST /keywords/radar/generate`, `/keywords/relevance-score`, `/keywords/analyze-discovery` appellent l'IA sans cache.
- **Groupe :** A (permanent, helper dupliqué) et C (appels IA)
- **Tranché :** l'exigence est « non tenue » pour les appels IA de Discovery. Seul le bouton « Charger » de la sauvegarde de découverte évite de les refaire. Le cache « cross-article » est une réutilisation de moins de 7 jours, pas un cache permanent.

#### 17. Contexte stratégique absent de plusieurs prompts
- **Où :** `prd.md` (FR-MOT-STRATEGY-INJECTION) — « Toute analyse IA du Moteur reçoit la stratégie du cocon » ; `docs/moteur-data-flow.md` §10 — liste `intent-keywords.md`, `propose-lieutenants.md`.
- **Code :** `server/prompts/` — `{{strategy_context}}` présent dans `capitaine-ai-panel.md`, `lieutenants-hn-structure.md`, `lexique-ai-panel.md`, `lexique-analysis-upfront.md` ; absent de `propose-lieutenants.md`, `lexique-suggest.md`, `intent-keywords.md`. `useDiscoveryPanel.ts` n'envoie pas de `cocoonSlug`. `relevance-score` et `analyze-discovery` injectent le contexte métier du site (thème), pas la stratégie du cocon.
- **Groupe :** C
- **Tranché :** « non tenue » : les propositions de lieutenants, la suggestion de lexique et toute la Découverte travaillent sans la stratégie du cocon.

#### 18. Douleur transmise autrement en Discovery
- **Où :** `prd.md` (FR-MOT-PAINPOINT-INJECTION) — « (non défini) » si absente.
- **Code :** Capitaine, Lieutenants, Structure, Lexique : `getArticlePainPoint` (`server/services/queries/article-pain-point.service.ts`, sentinelle `(non défini)`). Discovery : la génération IA reçoit la douleur **ou, à défaut, le mot-clé racine** (`useDiscoveryPanel.ts`, `painPoint || seed`) ; le filtre et l'analyse ignorent une douleur de moins de 10 caractères.
- **Groupe :** D
- **Tranché :** FR-MOT-PAINPOINT-INJECTION couvre Capitaine, Lieutenants, Structure et Lexique (tenue). Le traitement de Discovery est décrit dans sa section.

---

### Discovery

#### 19. Lancement : trois appels, pas sept sources
- **Où :** `prd.md` (FR-DIS-SOURCES) — bouton « Lancer la découverte », sept sources « en parallèle » ; `docs/moteur-data-flow.md` §3 — « 6 sources parallèles », « KeywordDiscoveryTab », « table discovery_cache TTL 7j via api_cache ».
- **Code :** `DiscoveryPanel.vue` — bouton « Découvrir » ; `useDiscoveryPanel.ts` — `discover` envoie `POST /keywords/suggest-all` (4 angles Google Suggest), `POST /keywords/radar/generate` (seulement si titre ou mot-clé d'article connus) et `POST /keywords/discover` (DataForSEO). La courte-traîne part seulement par « Courte-traîne IA » ou « Générer ». Même paramètres → aucun appel si la découverte est déjà affichée.
- **Groupe :** A
- **Tranché :** six sources au lancement (cinq sans article), la septième à la demande. Le cache de découverte vit dans `keyword_discoveries`, 30 jours annoncés.

#### 20. La courte-traîne n'est ni sauvegardée, ni envoyée au Radar
- **Où :** `prd.md` (FR-DIS-CACHE) — « Charger réhydrate les sept sections » ; (FR-DIS-SEND-TO-RADAR) — compteur « toutes sections + analyse IA confondues ».
- **Code :** `useDiscoveryPanel.ts` — `saveToCacheFromState` et `loadFromCacheAndHydrate` ignorent `longtailKeywords` ; `getRadarKeywords` ne parcourt pas `longtailKeywords` ; `selectedCount` compte pourtant ses cases. `discovery-cache.service.ts` — `countKeywords` ignore aussi la courte-traîne.
- **Groupe :** C
- **Tranché :** FR-DIS-CACHE et FR-DIS-SEND-TO-RADAR « non tenues » sur ce point : un mot-clé coché seulement en courte-traîne est compté mais pas envoyé, et la section n'est pas restaurée par « Charger ».

#### 21. La sauvegarde de découverte n'expire jamais
- **Où :** `prd.md` (FR-DIS-CACHE) — « Une sauvegarde plus vieille que 30 jours n'est plus proposée » ; `design-registry.md` (DESIGN-DIS-CACHE) — `isKeywordDiscoveryFresh(fetchedAt, 30)`.
- **Code :** `server/services/infra/discovery-cache.service.ts` — `checkCache` et `loadCache` ne vérifient pas l'âge ; `isKeywordDiscoveryFresh` (`keyword-discovery-db.service.ts`) n'est appelée nulle part. `expiresAt` est écrit dans le JSON sans être lu.
- **Groupe :** C
- **Tranché :** « non tenue ».

#### 22. Envoi au Radar : navigation avant écriture
- **Où :** `prd.md` (FR-DIS-SEND-TO-RADAR) — « envoie la liste … avant de naviguer » ; `design-registry.md` (DESIGN-DIS-SEND-TO-RADAR) — « Écriture DB AVANT navigation … si l'écriture échoue, l'utilisateur reste sur Discovery », « re-hydratation via GET ».
- **Code :** `useMoteurCrossTabState.ts` — `handleSendToRadar` : `setActiveTab('radar')`, puis `emitCheckCompleted(MOTEUR_DISCOVERY_DONE)`, puis `radarStore.addKeywordsBatch(…)` sans attendre. `RadarPanel.vue` réécrit la même liste via son watcher `injectedKeywords`. `radar-exploration.store.ts` — `addKeywordsBatch` reprend l'entrée renvoyée par le serveur ; en cas d'échec, il journalise et renvoie 0.
- **Groupe :** C
- **Tranché :** « non tenue » : l'utilisateur arrive sur le Radar et l'étape « Discovery » est demandée même si l'écriture échoue. L'idempotence (double écriture sans doublon) est tenue.

#### 23. Compteurs du filtre qui ne s'additionnent pas
- **Où :** `prd.md` (FR-DIS-RELEVANCE-FILTER) — « X pertinents / N total » et « X hors-sujet masqués ».
- **Code :** `useRelevanceScoring.ts` — `relevantCount` compte des mots-clés **uniques** ; `irrelevantCount` compte les **occurrences** (un mot-clé présent dans trois sources compte trois fois).
- **Groupe :** C
- **Tranché :** comportement décrit tel quel dans la spec ; « pertinents + masqués » peut dépasser « total ».

#### 24. Pas de `fallback: true` venant du serveur
- **Où :** `design-registry.md` (DESIGN-DIS-RELEVANCE-FILTER) — le serveur renvoie `fallback: true` quand l'IA échoue.
- **Code :** `server/routes/keywords.routes.ts` — `relevance-score` renvoie toujours `fallback: false` ; une erreur donne un 500. Côté écran, le lot en échec reste « non évalué », donc visible.
- **Groupe :** A
- **Tranché :** l'avertissement vient seulement du contrôle « plus de 90 % pertinents sur au moins 20 mots-clés ».

#### 25. Libellés Discovery
- **Où :** `prd.md` (FR-DIS-SEND-TO-RADAR) — « Envoyer au Radar (25) » ; (FR-DIS-CACHE) — « Dernière analyse du … » ; (FR-DIS-AI-ANALYSIS) — « Analyser les résultats pertinents ».
- **Code :** barre fixe « N mot(s)-clé(s) sélectionné(s) » + bouton « Envoyer au Radar → » ; bandeau « Derniere analyse du … · N mots-cles · analyse IA incluse », boutons « Charger » / « Rafraichir » (sans accents) ; CTA « Analyser les N résultats pertinents » quand il est actif.
- **Groupe :** A
- **Tranché :** la spec cite les libellés du code.

#### 26. Étape « Discovery » en mode automatique
- **Où :** `prd.md` (FR-DIS-CHECK) — étape posée **uniquement** à l'envoi au Radar ; `docs/moteur-data-flow.md` §3 et §9 — « quand discovery produit résultats ».
- **Code :** `scripts/auto-article/phases/moteur-explorer.ts` pose `moteur:discovery_done` après la génération IA, sans envoi au Radar.
- **Groupe :** B
- **Tranché :** à l'écran, seul l'envoi au Radar pose l'étape. Le mode automatique suit son propre enchaînement (autre lot). La mention « quand discovery produit résultats » est périmée.

---

### Barre des résultats, Finalisation

#### 27. Chips et invite de chargement
- **Où :** `prd.md` (FR-MOT-EXPLORATION-COUNTS, FR-MOT-CACHE-PANEL-COUNT) — « Radar 57 · Capitaine 31 », infobulle « 31 testés · 0 verrouillé », bouton « Recharger DB ».
- **Code :** `TabCachePanel.vue` — titre « Résultats déjà calculés », chip = libellé + « DB n » + « C n » ; `tab-cache-entries.ts` — infobulles « n mots-clés testés — verrouillé : X », « n propositions en base · k verrouillés », « n extractions · k termes validés » ; `TabLoadPrompt.vue` — « Charger {onglet} » avec boutons « DB n » / « C n ».
- **Groupe :** A
- **Tranché :** la spec cite les libellés du code ; le filet « Recharger DB » est l'invite « Charger {onglet} ».

#### 28. Récapitulatif Finalisation
- **Où :** `design-registry.md` (DESIGN-FIN-RECAP) — repli sur la liste plate des lieutenants avec niveau H2 par défaut ; `docs/ui-sections-guide.md` §3.8 — date de verrouillage du Capitaine, en-tête toujours « ✅ Prêt pour la Rédaction » ; §3.10 — bouton « ✅ Voir la Finalisation ».
- **Code :** `FinalisationPanel.vue` — lieutenants = `richLieutenants` au statut `locked` seulement, étiquette = niveau suggéré (`suggestedHnLevel`) ; Capitaine = `richCaptain.keyword`, sinon `capitaine`, sinon « — » (même non verrouillé) ; en-tête « ✅ Prêt pour la Rédaction » ou « ⏳ Préparation en cours » + « Étapes restantes : … ». `MoteurView.vue` n'a pas de bouton « Voir la Finalisation ».
- **Groupe :** A
- **Tranché :** comportement du code.

#### 29. Lecture réactive des points
- **Où :** `design-registry.md` (DESIGN-MOT-DISPLAY-FROM-STORE) et `docs/data-flows/completed-checks.md` — index `checksByArticleId` calculé.
- **Code :** `MoteurContextRecap.vue` — fonction `getChecks(id)` qui lit `progressStore.progressMap` à chaque rendu. Aucun `checksByArticleId`.
- **Groupe :** A
- **Tranché :** comportement du code.

---

### Identifiants

#### 30. Identifiants cités par le code et absents du PRD
- **Où :** `tests/unit/architecture/requirements-trace.test.ts` — `LEGACY_ORPHANS` : `FR-DIS-LONGTAIL-GENERATION`, `FR-DIS-AI-PANEL`, `FR-DIS-DECOUVRIR`, `FR-MOT-FINAL-CTA-GATED`.
- **Code :** `DiscoveryPanel.vue`, `useDiscoveryPanel.ts`, `shared/contracts/discovery.contract.ts` (FR-DIS-LONGTAIL-GENERATION) ; `FinalisationPanel.vue` (FR-MOT-FINAL-CTA-GATED).
- **Groupe :** A
- **Tranché :** `FR-DIS-LONGTAIL-GENERATION` devient une exigence (capacité réelle, ID déjà utilisé par le code). `FR-DIS-AI-PANEL` → `FR-DIS-AI-ANALYSIS` ; `FR-DIS-DECOUVRIR` → `FR-DIS-SOURCES` ; `FR-MOT-FINAL-CTA-GATED` → `FR-FIN-LINK-REDACTION` et `FR-FIN-CHECK`.

#### 31. Nouvel identifiant
- **Où :** —
- **Code :** voir conflit 14.
- **Groupe :** B
- **Tranché :** `FR-DIS-CAPTAIN-PRESCAN` créé pour l'analyse Capitaine différée déclenchée depuis Discovery.

#### 32. Documents périmés en bloc
- **Où :** `docs/moteur-data-flow.md` §2 (`SelectedArticlePanel`, `BasketStrip`, `moteur-basket.store`), §3 (`KeywordDiscoveryTab`, « bridge via basket »), §11 (Labo) ; `docs/ui-sections-guide.md` §3.2 (`SelectedArticlePanel`, `MoteurPhaseNavigation`, `BasketStrip`, `BasketFloatingPanel`), §3.3 (`KeywordDiscoveryTab`, routes `/discover`, `/keywords/relevance`, `/keywords/analyze`), §8.2 (routes Moteur anciennes).
- **Code :** ces composants et routes n'existent pas ; `MoteurView.vue` monte `MoteurContextRecap`, `MoteurStrategyContext`, `TabCachePanel`, `TabLoadPrompt` et les sept panneaux.
- **Groupe :** A
- **Tranché :** les nouveaux documents décrivent le code ; ces passages ne sont pas repris.

#### 33. Cannibalisation : alerte sur la barre des articles seulement
- **Où :** `prd.md` (FR-MOT-CANNIBALIZATION) — badge sur « toute carte Radar / Capitaine », qui « mentionne le slug de l'article concurrent (ou son titre) » ; `design-registry.md` (DESIGN-MOT-CANNIBALIZATION) — consommateur visuel `DESIGN-RAD-CARD`.
- **Code :** `MoteurContextRecap.vue` — icône d'alerte sur la ligne d'un article, infobulle fixe « Cannibalisation : un autre article utilise le même capitaine » ; `unifiedCapitainesMap` y mêle le mot-clé affiché de chaque article (verrouillé **ou** suggéré), la carte serveur et le Capitaine du store ; `useCannibalizationDetection.ts` — `hasCannibalization` compare sans tenir compte de la casse. Aucun composant du Radar ni du Capitaine ne lit `capitainesMap`.
- **Groupe :** C
- **Tranché :** « non tenue » : pas de badge sur les cartes candidates, pas de nom d'article concurrent. L'alerte existante s'allume aussi quand deux articles ont le même mot-clé **suggéré**.

#### 34. Fonctions d'affichage des métriques
- **Où :** `design-registry.md` (DESIGN-MOT-RAW-KPIS) — `src/utils/score.ts` ; `prd.md` (FR-MOT-RAW-KPIS) — l'absence s'affiche « — ».
- **Code :** `shared/score/format.ts` — `formatVolume`, `formatCpc`, `formatKd`, `formatPercent` renvoient « — » pour une valeur absente ; `src/utils/score.ts` n'existe pas. En Discovery, `DiscoverySourcesList.vue` masque l'étiquette d'une métrique absente au lieu d'afficher « — ».
- **Groupe :** A
- **Tranché :** l'exigence admet les deux formes (« — » ou étiquette masquée) ; jamais « 0 ».

#### 35. Discovery garde ses résultats et ses cases cochées d'un article à l'autre
- **Où :** `prd.md` (FR-MOT-ARTICLE-SELECTION) — « Changer d'article remet à zéro l'état de travail local de la session (sélections temporaires…) ».
- **Code :** `useDiscoveryPanel.ts` — listes des sources, groupes de mots et analyse IA au niveau du module (partagés) ; `useDiscoverySelection` et `useRelevanceScoring` créés par appel, donc propres à l'instance de `DiscoveryPanel`, qui reste montée (`v-show`). `DiscoveryPanel.vue` — au changement d'article, le watcher ne change que `seedInput` ; il ne remet à zéro qu'au changement de cocon. `MoteurView.vue` — `handleSelectArticle` n'appelle pas `resetDiscovery`.
- **Groupe :** C
- **Tranché :** FR-MOT-ARTICLE-SELECTION « non tenue » : des mots-clés cochés pour l'article A peuvent partir dans le Radar de l'article B.

#### 36. Bandeau de sauvegarde absent à la première ouverture de Discovery
- **Où :** `prd.md` (FR-DIS-CACHE) — bandeau quand une sauvegarde existe pour le mot-clé racine ; `design-registry.md` (DESIGN-DIS-CACHE).
- **Code :** `DiscoveryPanel.vue` — `watch(seedInput, …)` sans `immediate` : pas de vérification au montage avec le champ prérempli. `MoteurView.vue` — `handleSelectArticle` appelle `checkCacheForSeed` sur **sa propre** instance de `useDiscoveryPanel` : `useDiscoveryCache` crée `cacheStatus` par appel, donc ce résultat n'atteint jamais le bandeau. Le bandeau est aussi caché dès qu'une découverte a été lancée dans le panneau (`hasDiscovered`), même après changement d'article.
- **Groupe :** C
- **Tranché :** comportement décrit tel quel : le bandeau apparaît quand le champ change (saisie, ou changement d'article avec Discovery déjà ouvert), pas à la première ouverture.

## Moteur — Radar et Capitaine

*39 écarts — A 15, B 4, C 19, D 1*


Vérifiés sur la branche `feat/cerveau-generer-au-choix` (commit `60b9818`), par lecture du code (aucun test lancé). Les points marqués « à confirmer en recette » découlent d'un raisonnement sur le code réactif et méritent un essai manuel.

### Radar

#### 1. Pas de bascule « Marché / Pertinence »
- **Où :** `prd.md` (FR-RAD-SCORING-BIMODAL, FR-CAP-SCORING-BIMODAL) — « L'utilisateur bascule entre les deux affichages avec un toggle » ; `design-registry.md` (DESIGN-RAD-SCORING-BIMODAL) — « toggle d'affichage ».
- **Code :** `RadarKeywordCard.vue` — prop `displayMode` fixée par l'appelant ; `DouleurScannerResults.vue` passe `display-mode="kpi"`, `CaptainInteractiveWords.vue` passe `display-mode="relevance"`. Tris : « A-Z » / « Score KPI » au Radar, « A-Z » / « Score Pertinence » au Capitaine. `docs/scoring-kpi-vs-relevance.md` : « on n'affiche jamais les deux scores sur la même carte ».
- **Groupe :** B
- **Tranché :** en faveur du code : un score par onglet (Marché au Radar, Pertinence au Capitaine). Les critères de bascule sont retirés.

#### 2. Profondeur de scan non choisie par l'utilisateur
- **Où :** `prd.md` (FR-RAD-SCAN-2PASS) — « L'utilisateur peut choisir entre profondeur 1 et profondeur 2 ».
- **Code :** `RadarPanel.vue` — `const depth = ref(2)`, commentaire « Product decision is N+2 everywhere ».
- **Groupe :** B
- **Tranché :** en faveur du code : deux niveaux de questions, toujours.

#### 3. Durées de cache des suggestions et des PAA
- **Où :** `prd.md` (FR-RAD-AUTOCOMPLETE-PER-KEYWORD, FR-RAD-SCAN-2PASS) — « fenêtre de cache (90 j) » ; `design-registry.md` (DESIGN-RAD-AUTOCOMPLETE-PER-KEYWORD) — table `keyword_autocomplete`, « TTL 90 j ».
- **Code :** `autocomplete.service.ts` — `fetchAutocomplete` : `keyword_metrics.autocomplete_suggestions`, fraîcheur 1 j (0,02 j si vide) ; `paa-cache.service.ts` — `readPaaCache` : `keyword_metrics.paa_questions`, 1 j. La table `keyword_autocomplete` n'est pas utilisée par ce chemin.
- **Groupe :** A
- **Tranché :** 24 h (30 min si vide) pour les suggestions, 1 jour pour les PAA, dans `keyword_metrics`.

#### 4. Le nombre de suggestions noté comme une position
- **Où :** `prd.md` (FR-RAD-AUTOCOMPLETE-PER-KEYWORD) ; `docs/scoring-kpi-vs-relevance.md` — « Autocomplete (quantité) 10 % ».
- **Code :** `keyword-radar.service.ts` — `autocompleteMatchCount = perKeywordAutocomplete.suggestionsCount` ; `kpi-scoring.ts` — `scoreAutocomplete` : 0 → rouge, ≤ seuil vert → vert, ≤ seuil orange → orange, au-delà → rouge (grille de **position**). Au Capitaine, la même grille reçoit bien une position (`captainAutocompletePosition`).
- **Groupe :** C
- **Tranché :** FR-RAD-AUTOCOMPLETE-PER-KEYWORD « non tenue » : un mot-clé riche en suggestions est pénalisé au Radar.

#### 5. Intention inconnue comptée comme rouge dans le Score Marché
- **Où :** `shared/scoring-kpi.ts` (commentaire FR-INFRA-KPI-SCORING-NULLSAFE) — les composantes absentes sont exclues.
- **Code :** `computeKpiScore` — la composante intention a `rawLabel = intentTypes.join(', ') || 'inconnu'`, jamais « — » ; `intentValueToPseudoScore([])` = 0 → rouge → 0 × 15 %.
- **Groupe :** C
- **Tranché :** décrit tel quel dans la spécification (« une intention inconnue compte comme rouge ») ; dette à traiter avec le domaine Infrastructure (règle null-safe).

#### 6. Le thermomètre moyenne un score qui n'est pas affiché
- **Où :** `CLAUDE.md` §2.0 (règle affichage = calcul) ; `docs/data-flows/radar-explorations.md` et `docs/moteur-data-flow.md` (commit `5b98153`) le signalent déjà.
- **Code :** `keyword-radar.service.ts` — `radarGlobalHeat` : moyenne de `combinedScore`, qui compte 0 pour une donnée absente.
- **Groupe :** C
- **Tranché :** nouvelle exigence FR-RAD-THERMOMETER, « non tenue » : la note globale doit agréger les notes affichées.

#### 7. Volume et intention du Radar sans cache
- **Où :** `design-registry.md` (DESIGN-RAD-SCAN-2PASS) — « cascade cache `keyword_metrics` → `external_api_cache` → fetch DataForSEO » ; `.claude/CLAUDE.md` §3 règle 6.
- **Code :** `keyword-radar.service.ts` — `fetchKeywordOverviewBatch` et `fetchSearchIntentBatch` appelés à chaque scan ; `dataforseo/_client.ts` — `fetchDataForSeoBatch` sans cache ; rien n'est écrit dans `keyword_metrics` pour ces mesures.
- **Groupe :** C
- **Tranché :** la spécification dit « appel à chaque scan ». Seuls les PAA et les suggestions sont relus en base. Dette de coût à signaler au domaine NFR (coûts).

#### 8. L'enregistrement après scan écrase la liste d'attente et les longues traînes
- **Où :** `prd.md` (FR-RAD-DB-FIRST, FR-RAD-PERSIST) — la liste d'attente et les longues traînes sont retrouvées à l'identique.
- **Code :** `useResonanceScore.ts` — `_saveToExploration` poste `generatedKeywords` **du composable** (vide en mode workflow tant que « Charger Radar » n'a pas été utilisé) et le `scanResult` du serveur ; `radar-exploration.service.ts` — `saveRadarExploration` remplace `generated_keywords` et tout `scan_result` (donc `longTailSuggestions`).
- **Groupe :** C (à confirmer en recette)
- **Tranché :** FR-RAD-PERSIST « non tenue ».

#### 9. Les cartes reviennent par « Charger Radar »
- **Où :** `prd.md` (FR-RAD-PERSIST) — « un seul appel charge l'état complet » à l'ouverture.
- **Code :** `MoteurView.handleSelectArticle` — `mergeFromRadarSource` seulement si l'onglet Radar est déjà monté ; sinon `useTabLoadPrompt` (« Charger Radar »). Le test navigateur `radar.parcours.test.ts` l'assume (« La restauration attend un clic »).
- **Groupe :** B
- **Tranché :** en faveur du code : restauration d'office si l'onglet est monté, sinon à la demande.

#### 10. Les longues traînes ne sont pas réaffichées
- **Où :** `prd.md` (FR-RAD-LONGTAIL-UI, FR-RAD-LONGTAIL-REGENERATE) — « Au reload, les suggestions et l'état coché sont restaurés ».
- **Code :** `RadarLongTailSuggestions.vue` sait s'hydrater (`initialSuggestions`, `initialSelectedKeywords`), mais `DouleurScannerResults.vue` ne lui passe jamais ces props.
- **Groupe :** C
- **Tranché :** les deux exigences sont « non tenues ».

#### 11. Libellés des longues traînes
- **Où :** `prd.md` (FR-RAD-LONGTAIL-GENERATE) — « Suggérer des longues traînes » / « Régénérer » ; DESIGN-RAD-LONGTAIL-UI — « Persistance immédiate de chaque cochage ».
- **Code :** `RadarLongTailSuggestions.vue` — « ✨ Suggerer des combinaisons », « ⟳ Regenerer », « Reessayer » ; `useLongTailSuggestions` — PATCH différé de 500 ms, pré-sélection enregistrée seulement au premier clic.
- **Groupe :** A
- **Tranché :** libellés et délai du code.

#### 12. Provenance jamais enregistrée
- **Où :** `prd.md` (FR-RAD-SEND-CAPTAIN, FR-CAP-PERSIST) — « L'origine de chaque mot-clé (radar, longtail, manual) est conservée » ; DESIGN-CAP-PERSIST, DESIGN-RAD-SEND-CAPTAIN — colonne `source`.
- **Code :** `server/db/schema.sql` — `captain_explorations` sans colonne `source` ; `saveCaptainExploration` ne l'écrit pas ; `getCaptainExplorations` code `isLongTail: false` en dur.
- **Groupe :** C
- **Tranché :** les deux exigences sont « non tenues ».

#### 13. Bouton d'envoi masqué, pas grisé
- **Où :** `prd.md` (FR-RAD-SEND-CAPTAIN) — « bouton désactivé » sans sélection ; DESIGN-RAD-SEND-CAPTAIN — « POST batch → INSERT idempotent ».
- **Code :** `DouleurScannerResults.vue` — `v-if="totalSelectedCount > 0"` ; le Capitaine étudie chaque mot-clé par `POST /keywords/:kw/scan` (`useExploredKeywords.loadCards`), qui enregistre un à un.
- **Groupe :** A
- **Tranché :** bouton absent sans sélection ; enregistrement mot-clé par mot-clé.

#### 14. Ajout manuel : pas de message de doublon, champ masqué hors workflow
- **Où :** `prd.md` (FR-RAD-MANUAL-ADD) — message « Ce mot-clé est déjà dans la liste » ; champ « désactivé tant qu'aucun article n'est sélectionné ».
- **Code :** `RadarPanel.handleManualAdd` — doublon : `log.info` et champ vidé ; zone rendue seulement si `useDbFirst`.
- **Groupe :** C (message) · A (champ)
- **Tranché :** FR-RAD-MANUAL-ADD « non tenue » pour le message ; le champ n'existe qu'avec un article.

#### 15. Panneau « Suggestions IA Radar » sans effet
- **Où :** absent du PRD ; `design-registry.md` le rattache à un `FR-RAD-AI-LONGTAIL` inexistant ; `docs/contrats-affichage-moteur.md` §1.2 le décrit.
- **Code :** `RadarAiPanel.vue` émet `mark-captain-candidates` ; `RadarPanel` relaie `captain-candidates-marked` ; `MoteurView` n'écoute pas cet événement. La pastille « P » est toujours « — » (le Radar ne produit pas de pertinence).
- **Groupe :** C
- **Tranché :** nouvelle exigence FR-RAD-AI-SUGGESTIONS, « non tenue ».

#### 16. Identifiants nouveaux
- **Où :** PRD.
- **Code :** `FR-RAD-MARKET-LEVEL-AWARE` est cité dans `RadarPanel.vue`, `useResonanceScore.ts`, `keyword-radar.service.ts`, `tests/unit/services/radar-ordre-et-niveau.test.ts`, et figé en « orphelin » dans `tests/unit/architecture/requirements-trace.test.ts`.
- **Groupe :** A
- **Tranché :** trois exigences entrent au référentiel : FR-RAD-MARKET-LEVEL-AWARE (active, ID repris du code), FR-RAD-THERMOMETER et FR-RAD-AI-SUGGESTIONS (nouveaux IDs, non tenues). Le cliquet `LEGACY_ORPHANS` pourra retirer FR-RAD-MARKET-LEVEL-AWARE quand le PRD l'aura.

#### 17. Le point d'accès « intent-scan » n'a plus d'appelant
- **Où :** `prd.md` (FR-RAD-RESONANCE) — « consommés exclusivement par le Radar » ; DESIGN-RAD-RESONANCE — `POST /api/keywords/intent-scan`, `useResonanceScore`.
- **Code :** `intent-scan.routes.ts` — `POST /keywords/intent-scan` → `scanIntent` ; la fonction `useResonanceScore()` n'est appelée nulle part. La mécanique de résonance (`matchResonanceDetailed`) sert au scan Radar, à l'étude Capitaine et au calcul lexical de pertinence.
- **Groupe :** C
- **Tranché :** FR-RAD-RESONANCE décrit la mécanique ; le point d'accès et la fonction sont du code mort.

#### 18. Détails de la résonance
- **Où :** `prd.md` (FR-RAD-RESONANCE) — « total (≥ 50 % des mots stratégiques du sujet) », « ~36 stop-words » ; DESIGN-RAD-RESONANCE — « ~38 suffixes ».
- **Code :** `intent-scan.service.ts` — seuils appliqués à la **moyenne** des taux dans les deux sens ; `STOP_WORDS` : 38 mots ; `stemFrench` : une cinquantaine de suffixes ; mots de 2 lettres ou moins écartés.
- **Groupe :** A
- **Tranché :** moyenne bidirectionnelle ; pas de décompte figé dans les documents.

#### 19. Chemins et noms de fichiers périmés
- **Où :** DESIGN-RAD-DB-FIRST, -MANUAL-ADD, -LONGTAIL-UI, -SEND-CAPTAIN, -CHECK — `src/components/moteur/RadarPanel.vue` ; DESIGN-RAD-GENERATE — route dans `keywords.routes.ts` ; `docs/scoring-kpi-vs-relevance.md` — `useCapitaineValidation.ts`, `POST /keywords/:keyword/validate` ; DESIGN-RAD-DB-FIRST — garde-fou `radarGeneratedKeywordsCount`.
- **Code :** `src/components/intent/RadarPanel.vue` ; `POST /keywords/radar/generate` dans `intent-scan.routes.ts` ; `useCapitaineScan.ts` ; `POST /keywords/:keyword/scan` ; `radarGeneratedKeywordsCount` n'existe pas.
- **Groupe :** A
- **Tranché :** chemins du code dans `design.md`.

#### 20. Une copie du Score Marché reste en base
- **Où :** `prd.md` (FR-RAD-MARKET-COMPUTED-LIVE) — « Le store front ne contient pas de champ persisté `marketScore` (jamais sérialisé en base) ».
- **Code :** `keyword-radar.service.ts` écrit `marketScore` dans chaque carte, enregistrée dans `scan_result` (JSONB) ; `getCaptainExplorations` la relit et l'envoie à l'avis IA ; `useRadarRanking` l'affiche (pastille « M »). L'anneau et le tri, eux, recalculent.
- **Groupe :** A
- **Tranché :** l'exigence porte sur l'affichage et le tri (recalcul) ; la copie JSONB est documentée dans `design.md`.

#### 21. Des signaux de douleur hérités sont encore lus
- **Où :** `prd.md` (FR-RAD-NO-RELEVANCE-IN-SCAN) — « Les anciennes lignes qui contenaient un signal douleur sont ignorées à la lecture » ; FR-RAD-PAA-TREE mentionne encore des badges « + douleur » (contradiction entre FR du PRD).
- **Code :** `RadarKeywordCard.isOffPain` grise une carte dont l'ancien `kpis.painAlignmentScore` < 35 ; `keyword-scan.routes.ts` prend `painAlignmentScore`, `scoreBreakdown.paaMatchScore` et `scoreBreakdown.resonanceBonus` de la carte Radar comme signaux de douleur.
- **Groupe :** C
- **Tranché :** FR-RAD-NO-RELEVANCE-IN-SCAN reste active pour le scan lui-même ; la lecture de ces signaux côté Capitaine est traitée au point 22. Les badges « + douleur » n'existent pas au Radar.

### Capitaine

#### 22. Deux calculs de Score Pertinence : à l'étude et à la réouverture
- **Où :** `prd.md` (FR-CAP-RELEVANCE-LIVE ; FR-CAP-RELEVANCE-INTENT-SIGNAL — « Un mot-clé ne change pas de Score Pertinence parce qu'on a rouvert l'article » ; FR-CAP-PAINPOINT-FALLBACK) ; `docs/scoring-kpi-vs-relevance.md` — « Côté /keywords/radar/scan : toujours calculé si painPoint fourni ».
- **Code :** `keyword-scan.routes.ts` — `computeRelevanceScore` avec `rootsAverageScore: null`, signaux de la carte Radar en priorité (point 21), sinon lexical ; calcul fait dès qu'un signal existe, **même sans point de douleur**. `captain-relevance.service.ts` — calcul complet (racines, lexical, `keyword_metrics`). `hydrateCardFromValidation` affiche le premier jusqu'à la réouverture. Seules les intentions ont été alignées (M2).
- **Groupe :** C
- **Tranché :** FR-CAP-RELEVANCE-LIVE et FR-CAP-PAINPOINT-FALLBACK « non tenues » ; FR-CAP-RELEVANCE-INTENT-SIGNAL active (son signal est bien le même). Le scan Radar ne calcule aucune pertinence (FR-RAD-NO-RELEVANCE-IN-SCAN).

#### 23. Cartes reçues du Radar : Score Pertinence « — » jusqu'à la réouverture
- **Où :** `prd.md` (FR-CAP-SCORING-BIMODAL, FR-CAP-RELEVANCE-LIVE).
- **Code :** `useExploredKeywords.loadCards` garde la carte Radar comme `card` (`relevanceScore: null`) et n'ajoute que `validation` ; l'anneau lit `card.relevanceScore`. Info-bulle par heuristique : « Le point de douleur est défini, mais les signaux SERP n'ont rien produit… ».
- **Groupe :** C (à confirmer en recette : la restauration par l'historique peut reconstruire la liste dans certains ordres d'arrivée)
- **Tranché :** décrit comme limite dans la spécification.

#### 24. Le jugement IA n'atteint pas la liste
- **Où :** `prd.md` (FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-BADGE-SINGLE) ; DESIGN-CAP-PAA-BADGE-SINGLE ; `docs/contrats-affichage-moteur.md` §1.2 (flèche `paaJudgment` vers la carte).
- **Code :** `RadarCardLockable.vue` ne transmet ni `cardContext` ni `paaJudgment` ; seule la carte du mode libre (`CaptainPanel`, `card-context="capitaine"`) les reçoit. `loadCaptainPaaJudgments` remplace `entry.relevanceScore` dans le store, mais les cartes affichées gardent les objets créés par `restoreFromHistory` (le watcher ne restaure que si l'historique est plus long que la liste) ; sur un cache hit, rien n'est réappliqué.
- **Groupe :** C (à confirmer en recette pour la note)
- **Tranché :** FR-CAP-PAA-JUDGE-HAIKU et FR-CAP-PAA-BADGE-SINGLE « non tenues » ; l'appel d'IA est payé sans effet visible dans le workflow.

#### 25. Raisons d'indisponibilité incomplètes
- **Où :** `prd.md` (FR-CAP-RELEVANCE-UNAVAILABLE-REASON) — 5 raisons, « Aucune devinette côté front » ; DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON — type à 5 valeurs dont `haiku-unavailable`.
- **Code :** `scoring.types.ts` — `RelevanceUnavailableReason` à 4 valeurs ; `haiku-unavailable` n'existe que dans `PaaJudgmentUnavailableReason`, jamais produit (échec → `log.warn`) ; `isLongTail: false` en dur ; `RadarKeywordCard.relevanceMissingReason` devine `long-tail` / `no-pain` / `no-signals` quand le serveur ne répond pas.
- **Groupe :** C
- **Tranché :** « non tenue ».

#### 26. Réglage du modèle de jugement
- **Où :** DESIGN-CAP-PAA-JUDGE-HAIKU — « `temperature: 0` ».
- **Code :** `claude.service.ts` — `classifyWithTool` ne transmet aucune température.
- **Groupe :** A
- **Tranché :** température par défaut du fournisseur.

#### 27. Avis de l'IA : lancé pour tous, jamais enregistré, sans stratégie du cocon
- **Où :** `prd.md` (FR-CAP-AI-PANEL — « se déclenche à la sélection », « mentionne la stratégie cocon » ; FR-MOT-EXPLORATIONS-HYDRATATION — « analyse IA déjà prête » au retour) ; DESIGN-CAP-AI-PANEL — `{{strategy_context}}`.
- **Code :** `CaptainPanel` « Watcher 1 » lance `launchAiStream` pour **chaque** entrée validée ; « Watcher 3 » ne met à jour que la mémoire (`updateCaptainValidationAiPanel`) ; `saveCaptainExplorationAiPanel` / `PATCH …/ai-panel` sans appelant ; le corps envoyé n'a pas de `cocoonSlug`, donc `loadPrompt` laisse `{{strategy_context}}` vide ; les scores transmis sont ceux de l'étude, pas ceux de l'anneau.
- **Groupe :** C
- **Tranché :** FR-CAP-AI-PANEL « non tenue ». Coût à signaler au domaine NFR (coûts) : chaque réouverture relance un avis par candidat.

#### 28. Saisie : pas de longueur minimale ni de suggestion contextuelle
- **Où :** `prd.md` (FR-CAP-INPUT) — « au moins 2 caractères », « Une suggestion contextuelle s'affiche au fil de la saisie » ; DESIGN-CAP-INPUT — « validation Zod côté backend ».
- **Code :** `CaptainInput.vue` — champ non vide suffit ; les avertissements de composition (`useCompositionCheck`) sont reçus mais « no longer rendered » ; `keyword-scan.routes.ts` valide `keyword` et `level` à la main, sans Zod.
- **Groupe :** B
- **Tranché :** en faveur du code : saisie non vide, pas de suggestion affichée.

#### 29. Indicateur « Autocomplete » : position au Capitaine
- **Où :** `prd.md` (FR-CAP-SCAN, FR-CAP-KPIS-READONLY) — « nombre de suggestions autocomplete ».
- **Code :** `captain-kpis.ts` — `captainAutocompletePosition` (position du mot-clé exact, 0 = « Non trouvé »).
- **Groupe :** A
- **Tranché :** position dans les suggestions.

#### 30. Panneau « KPIs marché » : intention vide, autocomplétion à double sens
- **Où :** `prd.md` (FR-CAP-KPIS-READONLY) — valeurs « telles que reçues du fournisseur ».
- **Code :** `CaptainSidePanel.marketKpis` lit `entry.card.kpis` ; `hydrateCardFromValidation` pose `intentTypes: []` et met la position dans `autocompleteMatchCount` ; une carte venue du Radar y a le nombre de suggestions. Libellé commun « n matches ».
- **Groupe :** C
- **Tranché :** FR-CAP-KPIS-READONLY « non tenue ».

#### 31. Panneau latéral : tiroir fixe, pas colonne collante
- **Où :** `prd.md` (FR-CAP-LIST-SIDEPANEL) — « panneau latéral sticky » ; DESIGN-CAP-LIST-SIDEPANEL — « Sticky CSS ».
- **Code :** `CaptainSidePanel.vue` — `position: fixed` à droite, pleine hauteur, largeur réglable, fermeture au clic extérieur ; affiché seulement avec une sélection.
- **Groupe :** A
- **Tranché :** tiroir fixe.

#### 32. Racines : mots-outils conservés, clic sans nouvelle étude
- **Où :** `prd.md` (FR-CAP-ROOTS) — « Les mots-outils sont ignorés dans la décomposition », « clic sur une racine relance un scan » ; DESIGN-CAP-ROOTS — « minimum 2 mots significatifs ».
- **Code :** `keyword-roots.ts` — `extractRoots` garde les mots-outils dans le texte et ne les écarte que du décompte (≥ 2 significatifs) ; `useExploredKeywords.validateRoots` étudie les racines d'office si le volume n'est pas vert ; `switchToVariant` ne fait qu'afficher la racine.
- **Groupe :** A
- **Tranché :** comportement du code.

#### 33. Pas de repli mémoire pour les racines absentes
- **Où :** `prd.md` (FR-CAP-RELEVANCE-INPUTS) — « si absentes, fallback sur un calcul mémoire » ; DESIGN-CAP-RELEVANCE-INPUTS — idem.
- **Code :** `getCaptainExplorations` et `runPaaJudgmentsForArticle` passent `root_keywords ?? []` ; aucun appel à `extractRoots` dans `captain-relevance.service.ts`. `POST /articles/:id/captain-explorations` calcule les racines si l'appelant n'en fournit pas.
- **Groupe :** A
- **Tranché :** sans racines en base, le poids « Racines » est redistribué.

#### 34. Règle du NO-GO automatique
- **Où :** `prd.md` (FR-CAP-AUTO-NOGO) — « Si les 6 KPI marché sont tous au rouge (ou vides), le verdict est forcé à NO-GO » ; DESIGN-CAP-AUTO-NOGO — « `greenCount === 0` sur les 6 KPI ».
- **Code :** `kpi-scoring.ts` — `computeVerdict` : NO-GO auto si volume, PAA et autocomplétion **mesurés** valent 0 ; sans donnée → GRAY « Données insuffisantes ».
- **Groupe :** A
- **Tranché :** règle du code (une absence n'est jamais un NO-GO).

#### 35. Documentation du Score Pertinence dépassée
- **Où :** `docs/scoring-kpi-vs-relevance.md` — PAA × Douleur « calcul cumulatif F1 » ; racines « déduplication via Jaccard (S4) » ; « tooltip : 5 causes typées renvoyées par le backend ».
- **Code :** `lexical-pain-alignment.ts` (moyenne 100/60/50/0) ou note du jugement IA ; `computeRootsRelevanceScore` existe mais le calcul live fait une simple moyenne des racines (`captain-relevance.service.ts`) ; 4 raisons typées.
- **Groupe :** A
- **Tranché :** formules du code dans la spécification.

#### 36. Affichage d'une racine : l'anneau et le tri divergent
- **Où :** `CLAUDE.md` §2.0 (même expression pour affichage et tri).
- **Code :** `CaptainPanel` — tri sur `originalCard.relevanceScore`, anneau sur `card.relevanceScore` (racine affichée).
- **Groupe :** D
- **Tranché :** écart voulu par FR-CAP-LOCK-INTEGRITY (une carte ne bouge pas quand on affiche une racine) ; documenté.

#### 37. Tri « A-Z » : le premier clic donne Z → A
- **Où :** libellé « A-Z » (Radar et Capitaine).
- **Code :** `SortToggleBar.cycle` et `useSortableList` — première activation en `desc`, appliquée aussi au tri alphabétique.
- **Groupe :** C (mineur)
- **Tranché :** décrit tel quel ; à corriger (premier clic croissant pour « A-Z »).

#### 38. Conventions « déplacées vers architecture.md » introuvables
- **Où :** `prd.md` (FRs déplacées hors §8.6) — FR-NAM-CONTAINERS-PANEL, FR-CODE-NO-CAROUSEL, FR-CAP-EXPLORED-KEYWORDS-NAMING, FR-CAP-SIDEPANEL-WIDTH « → architecture.md ».
- **Code :** aucune de ces conventions n'apparaît dans `architecture.md`. Le code les respecte, sauf des variables `carousel*` restées dans `CaptainPanel.vue`.
- **Groupe :** A
- **Tranché :** conventions décrites dans `design.md` (section « Conventions de code sorties du PRD ») ; IDs dans la table « Retirées ».

#### 39. Mode libre encore présent dans le code
- **Où :** `prd.md` (FR-CAP-HISTORY-SLIDER, deprecated) ; DESIGN-CAP-KPIS-READONLY — « mode libre (deprecated avec retrait Labo) ».
- **Code :** `CaptainPanel.vue` garde la branche `mode === 'libre'` (historique, « Seuils de référence », `CaptainLockPanel` qui exige un verdict GO) ; `RadarPanel.vue` garde les champs de génération et le cache par graine. Aucun appelant ne passe `mode="libre"`.
- **Groupe :** C
- **Tranché :** absent de la spécification ; code mort signalé dans `design.md`.

## Moteur — Lieutenants, Structure, Lexique

*34 écarts — A 16, B 5, C 10, D 3*


#### 1. Nombre de résultats analysés : « jusqu'à 100 » contre 10 fixes
- **Où :** `prd.md` (FR-LIE-SERP-ANALYZE) — « permet de l'ajuster jusqu'à 100 » ; (FR-LIE-SLIDER-INTELLIGENT) — « au-dessus, il lance un scraping complémentaire » ; `design-registry.md` (DESIGN-LIE-SLIDER-INTELLIGENT) ; `docs/data-flows/lieutenants.md` — « slider 0-100 ».
- **Code :** `server/services/external/dataforseo/serp.ts` — `fetchSerp` garde 10 résultats ; `shared/schemas/serp-analysis.schema.ts` — `topN` 3-10, que la route n'utilise pas ; `LieutenantSerpAnalysis.vue` — curseur `min=3 max=10`.
- **Groupe :** B
- **Tranché :** en faveur du code : 10 résultats par mot-clé, aucun élargissement ni analyse complémentaire. Les nouveaux documents ne mentionnent plus 100 ni l'élargissement.

#### 2. Le curseur n'agit sur presque rien
- **Où :** `prd.md` (FR-LIE-SLIDER-INTELLIGENT) — « filtre localement les résultats déjà scrapés » ; `docs/data-flows/lieutenants.md` — « Curseur intelligent filtre localement ».
- **Code :** `useLieutenantsSerp.ts` — `displayedCompetitors` tranche `serpResult` ; seul le compteur « N concurrents affiches » le lit. La liste des concurrents lit `activeSerpTabResult` ; `proposeLieutenants` lit le résultat du capitaine entier ; `hnRecurrence` ne sert qu'en repli.
- **Groupe :** C
- **Tranché :** FR-LIE-SLIDER-INTELLIGENT « non tenue ». La spec décrit l'effet réel (le compteur seulement). À corriger : appliquer la valeur à la liste et aux données de l'IA, ou retirer le curseur.

#### 3. Récurrence des titres : mise en avant ≥ 50 % et filtre par niveau absents
- **Où :** `prd.md` (FR-LIE-EXTRACT-HEADINGS) — « Les titres très fréquents (≥ 50 %) sont visuellement mis en avant », « filtrer la vue par niveau (H1 / H2 / H3) ».
- **Code :** `LieutenantH2Structure.vue` — section « Structure Hn concurrents » : niveau, texte, `n/total`, pourcentage, barre proportionnelle ; aucun seuil, aucun filtre par niveau.
- **Groupe :** B
- **Tranché :** en faveur du code (la barre proportionnelle tient lieu de mise en avant). Critères retirés de FR-LIE-EXTRACT-HEADINGS.

#### 4. Sections repliables « chargées à la demande »
- **Où :** `prd.md` (FR-LIE-SECTIONS-FOLDABLE) — « Une section dépliée charge son contenu uniquement à ce moment (lazy load) » ; `design-registry.md` (DESIGN-LIE-SECTIONS-FOLDABLE) — « CollapsableSection … avec lazy-load » ; exemple « PAA niveau 2 ».
- **Code :** `src/components/shared/CollapsableSection.vue` — contenu toujours rendu, masqué en CSS (`collapsed`) ; les données sont déjà en mémoire.
- **Groupe :** A
- **Tranché :** critère retiré ; les sections sont repliées par défaut, sans chargement différé.

#### 5. Badges « Fort / Moyen / Faible » et sources « SERP / PAA / Groupe Cerveau »
- **Où :** `prd.md` (FR-LIE-CANDIDATES-BADGES) ; `design-registry.md` (DESIGN-LIE-CANDIDATES-BADGES) — « 3 sources », « 3 niveaux de force ».
- **Code :** `LieutenantCard.vue` — score numérique (`formatScore`, « — » si absent) et une pastille par source parmi `paa`, `serp`, `group`, `root`, `content-gap` (libellés bruts).
- **Groupe :** B
- **Tranché :** en faveur du code : la force est le score sur 100 ; cinq sources.

#### 6. Compteur de lieutenants : fourchette absente, nombres contradictoires, temporisation inexistante
- **Où :** `prd.md` (FR-LIE-CHECKBOX-COUNT) — « Pilier : 5-8, Intermédiaire : 3-5, Spécifique : 1-3 », « court délai après le dernier clic » ; (FR-LIE-LOCK-GATE) — « distinct de la fourchette conseillée par le compteur » ; `design-registry.md` (DESIGN-LIE-CHECKBOX-COUNT) — « debounce 300 ms » ; `docs/data-flows/lieutenants.md` — « const `MAX_SELECTED` ».
- **Code :** `LieutenantProposals.vue` — compteur `${selectedCards.size} / ${totalGenerated} sélectionnés` ; `useLieutenantsIa.toggleLieutenant` enregistre à chaque clic ; `shared/constants/article-type-rules.ts` — `minLieutenants` 3/2/1, `maxLieutenants` 5/5/4 ; aucune constante `MAX_SELECTED`.
- **Groupe :** C
- **Tranché :** FR-LIE-CHECKBOX-COUNT « non tenue ». La fourchette à afficher est celle des règles du type (`minLieutenants`–`maxLieutenants` : 3-5, 2-5, 1-4), pas 5-8 / 3-5 / 1-3, qui contredisaient la source unique. L'enregistrement est immédiat (critère « court délai » retiré).

#### 7. Relancer la proposition défait les lieutenants retenus
- **Où :** `prd.md` (FR-LIE-CHECKBOX-LOCK-IMMEDIATE) — « Le bouton « Régénérer IA » reste cliquable même quand plusieurs Lieutenants sont verrouillés » ; `docs/data-flows/lieutenants.md` — risque « élimination silencieuse » signalé, sans correctif.
- **Code :** `useLieutenantsIa.proposeLieutenants` vide `selectedCards` puis, dans `onDone`, `saveRichLieutenantProposals` remplace `richLieutenants` par des `suggested` / `eliminated` sans toucher la liste plate `lieutenants`. `LieutenantsPanel` voit `lieutenantsCheckActive` passer à faux : `withdrawCheck` et `saveDecisions` réenregistrent l'ancienne liste. `saveLieutenantExplorations` écrase `status` des mots-clés reproposés. La porte (`lieutenantsGate`) et l'onglet Structure en repli lisent la liste plate. Constat de lecture du code, non reproduit ; aucun test ne couvre ce cas.
- **Groupe :** C
- **Tranché :** FR-LIE-CHECKBOX-LOCK-IMMEDIATE « non tenue ». Exigence gardée : une relance ne défait aucun lieutenant retenu.

#### 8. Bouton de relance masqué par les failles de contenu
- **Où :** `prd.md` (FR-LIE-CHECKBOX-LOCK-IMMEDIATE, FR-LIE-PROPOSE-AI) ; `docs/contrats-affichage-moteur.md` — « N propositions générées · Régénérer les suggestions ».
- **Code :** `LieutenantsAiPanel.vue` — `v-else-if="contentGapInsights"` affiche « Content-gap détecté » sans bouton ; la relance n'est offerte qu'au repos ou après une erreur. `refreshSERP` puis le watcher `serpResult` relisent les propositions de moins de 7 jours sans rappeler l'IA.
- **Groupe :** C
- **Tranché :** décrit en limite ; rattaché au statut « non tenue » de FR-LIE-CHECKBOX-LOCK-IMMEDIATE.

#### 9. Déclenchement de la proposition de lieutenants
- **Où :** `prd.md` (FR-LIE-PROPOSE-AI) — « L'utilisateur déclenche la proposition depuis un panel IA dédié », « clique « Proposer des Lieutenants » » ; « le panel streame la réflexion IA ».
- **Code :** `LieutenantsPanel.vue` — watcher `serpResult` → `proposeLieutenants` après « Analyser SERP » ; aucun bouton « Proposer des Lieutenants » ; `LieutenantsAiPanel.vue` montre le texte brut (JSON) de l'IA.
- **Groupe :** A
- **Tranché :** la proposition part après l'analyse lancée d'un clic ; libellés réels de relance cités dans la spec. Pas de conflit avec FR-MOT-NO-AUTO-ACTION : le clic « Analyser SERP » précède.

#### 10. Modèle de l'IA des lieutenants
- **Où :** `design-registry.md` (DESIGN-LIE-PROPOSE-AI) — « Modèle Claude Sonnet » ; `docs/data-flows/lieutenants.md` — « Claude Sonnet (SSE, 8192 tokens) ».
- **Code :** `keyword-ai-panel.routes.ts` — `runAiPanelStream` sans modèle ; `ai-provider.service.ts` — `streamChatCompletion` utilise le fournisseur et le modèle configurés.
- **Groupe :** A
- **Tranché :** le design dit « fournisseur d'IA configuré », sans nommer de modèle.

#### 11. Règle géographique : pénalité systématique et message d'élimination
- **Où :** `prd.md` (FR-LIE-GEOFUNNEL-RULE) — « Toute violation est pénalisée », exemple de raison « Trop local pour un Intermédiaire ».
- **Code :** `server/prompts/propose-lieutenants.md` — consigne seule : plafond par type, malus -15 à -25 pour un lieutenant qui ne fait qu'ajouter la ville ; aucun contrôle après coup.
- **Groupe :** D
- **Tranché :** décrit comme une consigne de l'IA, non vérifiée (déjà dit par DESIGN-LIE-GEOFUNNEL-RULE).

#### 12. Lieutenants des autres articles : « interdits » pour l'IA, 🟠 pour la porte
- **Où :** `prd.md` (FR-LIE-LOCK-GATE) — 🟠 « Un lieutenant est aussi lieutenant d'un autre article du cocon : c'est courant ».
- **Code :** `propose-lieutenants.md` — `{{existing_lieutenants}}` « Ces mots-clés sont INTERDITS » ; `verifyLieutenants` — `lieutenant-shared` en 🟠.
- **Groupe :** B
- **Tranché :** les deux restent : l'IA évite de les proposer, l'utilisateur peut quand même en retenir un, avec un 🟠.

#### 13. Service dédié aux lieutenants : chemin faux et service inutilisé
- **Où :** `design-registry.md` (DESIGN-LIE-SCRAPE-DEDIE) — `server/services/external/lieutenants-analysis.service.ts` ; `prd.md` (FR-LIE-SCRAPE-DEDIE) — « utilise un service backend dédié ».
- **Code :** `server/services/keyword/lieutenants-analysis.service.ts` — `proposeLieutenants` n'a aucun appelant de production (tests seulement) ; `POST /serp/analyze` appelle `scrape-corpus.fetchAndPersist`.
- **Groupe :** C
- **Tranché :** l'exigence (indépendance du Lexique, lecture partagée) est tenue par `scrape-corpus`. Le service est du code mort à brancher ou supprimer.

#### 14. Fichier `serp-analysis.service.ts` et cache `keyword_metrics`
- **Où :** `design-registry.md` (DESIGN-LIE-SERP-ANALYZE, DESIGN-LIE-EXTRACT-HEADINGS) — `server/services/external/serp-analysis.service.ts`, « `keyword_metrics` (cache cross-article freshness 7 j) » ; `docs/data-flows/lieutenants.md` — `serp_raw_json`, `analyzeSerpCompetitors`.
- **Code :** le fichier n'existe pas ; extraction dans `scrape-corpus.service.ts` (`extractHeadings`) ; fraîcheur sur `keyword_serp_results.fetched_at` (`getSerpResultsFresh`).
- **Groupe :** A
- **Tranché :** le design cite `scrape-corpus` et `keyword-serp.service`.

#### 15. Descriptions périmées des Lieutenants dans les guides
- **Où :** `docs/data-flows/lieutenants.md` — « `LieutenantProposals.vue` pré-coche les top 3-5 », « debounce 300 ms », « tri A-Z, score desc, source », « merge compare `lockedAt` » ; `docs/ui-sections-guide.md` §3.6 — test `lieutenants-selection-architecture` cherchant `lieutenant-h2-structure`.
- **Code :** `useLieutenantsIa.onDone` — `selectedCards = new Map()` ; `LieutenantProposals.vue` — tris « A-Z » et « Score IA » ; `mergeRichLieutenants` — statut terminal prioritaire, `lockedAt` retiré.
- **Groupe :** A
- **Tranché :** les nouveaux documents décrivent le code (rien de pré-coché, tri A-Z / score, enregistrement immédiat).

#### 16. Onglet Structure : échec d'enregistrement silencieux
- **Où :** `prd.md` (FR-HN-TAB) — « Si la structure ou le sommaire ne peuvent pas être enregistrés, l'étape n'est pas demandée et l'écran le dit ».
- **Code :** `useStructureHn.prepareValidation` — `save()` faux → `return false` sans message ; `StructureHnPanel.validate` journalise seulement. Seul l'échec du sommaire remplit `generateError`.
- **Groupe :** C
- **Tranché :** FR-HN-TAB « non tenue » sur ce seul point ; le reste de l'exigence est tenu.

#### 17. Longueur conseillée attendue ou non
- **Où :** `design-registry.md` (DESIGN-HN-TAB) — « `void recommendWordCount(id)` » dans une ligne, « `prepareValidation` attend la longueur conseillée » dans une autre ; `docs/ui-sections-guide.md` §3.6 bis — « recommandation de longueur (sans attendre) ».
- **Code :** `useStructureHn.prepareValidation` — `await recommendWordCount(id)` avant de rendre `true`.
- **Groupe :** A
- **Tranché :** la longueur est recalculée avant la demande d'étape.

#### 18. Ouverture de l'onglet Structure « payante »
- **Où :** `docs/ui-sections-guide.md` §3.6 bis — « appel `POST /serp/analyze` sans clic, payant si la SERP a plus de 7 jours ».
- **Code :** `StructureHnPanel.vue` `onMounted` → `loadCompetitors()` avec `cacheOnly: true` ; l'analyse payante ne part que via `handleGenerate`.
- **Groupe :** A
- **Tranché :** ouvrir l'onglet ne paie rien.

#### 19. « Sauvegarder la structure » retire l'étape même sans changement
- **Où :** `prd.md` (FR-HN-TAB) — « Une structure validée puis modifiée … enregistrée, elle perd son étape ».
- **Code :** `StructureHnPanel.handleSave` — `check-removed` dès que l'étape était posée et l'enregistrement réussi, sans comparer à la structure enregistrée.
- **Groupe :** B
- **Tranché :** en faveur du code (enregistrer = revalider) ; la spec le dit.

#### 20. Transfert de capitaine et étape « Structure validée »
- **Où :** `prd.md` (FR-HN-TAB, Limites connues).
- **Code :** `CaptainPanel.lockEntry` — transfert sans `check-removed` ; `CHECK_DEPENDENTS` ne joue qu'au retrait.
- **Groupe :** D
- **Tranché :** reste une limite connue.

#### 21. Récurrence dans l'onglet Structure : « onglet Tous »
- **Où :** `docs/contrats-affichage-moteur.md` §1.4 — « un onglet « Tous » » ; `design-registry.md` (DESIGN-LIE-EXTRACT-HEADINGS).
- **Code :** `LieutenantH2Structure.vue` — onglets affichés seulement si `serpResultsByKeyword.size > 1` ; `useStructureHn` n'en charge qu'une entrée (le capitaine).
- **Groupe :** A
- **Tranché :** aucune barre d'onglets dans l'onglet Structure ; une seule liste.

#### 22. L'avis de l'IA sur le lexique part sans clic
- **Où :** `prd.md` (FR-LEX-AI-PANEL) — « L'utilisateur déclenche l'analyse depuis un panel dédié » ; (FR-MOT-NO-AUTO-ACTION, autre lot) — « Ouvrir un onglet n'envoie aucun appel IA » ; `docs/ui-sections-guide.md` §3.7 — « Auto-trigger si capitaine locked ».
- **Code :** `LexiquePanel.vue` — watcher d'auto-restauration → `fetchTfidf` (sans coût externe) quand le pré-contrôle dit « présent » et que rien n'est chargé ; watcher `tfidfResult` → `generateLexiqueUpfront` dès qu'aucun avis n'est connu (appel payant à l'IA).
- **Groupe :** C
- **Tranché :** FR-LEX-AI-PANEL « non tenue ». À signaler au lot MOT (FR-MOT-NO-AUTO-ACTION). L'extraction automatique sans coût peut rester ; l'appel à l'IA doit attendre un clic.

#### 23. Contenu de l'analyse IA du lexique
- **Où :** `prd.md` (FR-LEX-AI-PANEL) — « streame son texte », « suggère des angles », « mentionne explicitement le point de douleur et la stratégie » ; `design-registry.md` (DESIGN-LEX-AI-PANEL) — prompts `lexique-ai-panel.md` et `lexique-analysis-upfront.md`, « l'analyse n'est pas persistée ».
- **Code :** `useLexiqueIa.generateLexiqueUpfront` → `ai-lexique-upfront` : un avis par terme, au plus 5 manquants, un résumé ; l'écran montre « Analyse IA en cours... » puis le résultat ; `saveLexiqueAi` enregistre dans `lexique_explorations`. La route `/keywords/:keyword/ai-lexique` (`lexique-ai-panel.md`) n'a aucun appelant dans l'écran.
- **Groupe :** A (description) et C (route morte)
- **Tranché :** FR-LEX-AI-PANEL réécrite selon le code (badges, résumé, manquants, enregistrés). La route `ai-lexique` est du code mort à supprimer ou à brancher.

#### 24. Le lexique de la Rédaction « sans filtre »
- **Où :** `docs/data-flows/lexique.md` — « Ce chemin n'applique ni le filtre des mots génériques ni la porte », cas « Modéré ».
- **Code :** `ArticleKeywordsPanel.vue` — `handleAddLexique`, `handleSuggestLexique` (`splitGenericTerms`) ; `keywords.routes.ts` `POST /keywords/lexique-suggest` filtre et renvoie `rejected`.
- **Groupe :** A
- **Tranché :** le filtre s'applique ; seule la porte n'est pas jouée dans la Rédaction (rejouée à la publication).

#### 25. Écran Lexique décrit avec un bouton de validation
- **Où :** `docs/ui-sections-guide.md` §3.7 — composant « `LexiqueExtraction` », « Lock Lexique : Bouton « Valider le Lexique » / Déverrouiller », `POST /articles/:id/lexique/validate`, « Analyse IA upfront … pré-sélectionne », « Champ « Extraire pour un autre mot-clé » … gate : pas locked », « Chips d'explorations passées ».
- **Code :** `LexiquePanel.vue` : aucun bouton de validation ni route `lexique/validate` ; rien de pré-sélectionné ; onglets `TabBar` avec « Tester un mot-clé » ouvert même avec des termes retenus.
- **Groupe :** A
- **Tranché :** les nouveaux documents décrivent le panneau réel.

#### 26. Chemins et types périmés dans le registre (Lexique)
- **Où :** `design-registry.md` — DESIGN-LEX-SELECT et DESIGN-LEX-CHECKBOX-LOCK-IMMEDIATE : « `article_keywords.lexique` (JSONB) » ; DESIGN-LEX-SORT : `src/components/shared/SortToggleBar.vue` ; DESIGN-LEX-MULTI-KEYWORD : « `POST /api/articles/:id/lexique/extract` (à vérifier) » ; DESIGN-LEX-MULTI-KEYWORD-TABS : `src/components/moteur/LexiqueCustomKeywordInput.vue` ; DESIGN-LEX-PRECHECK-SERP : « 400 si keyword vide ou >200 » ; DESIGN-LEX-METIER-ONLY : « `lexique-exploration.service.ts` n'a pas d'en-tête `AUTHORITY:` ».
- **Code :** `server/db/schema.sql` — `lexique TEXT[]` ; `src/components/moteur/SortToggleBar.vue` ; `POST /api/serp/tfidf` ; `src/components/moteur/lexique/LexiqueCustomKeywordInput.vue` ; `keywords.routes.ts` — 400 `INVALID_KEYWORD` hors 2-200 caractères ; `lexique-exploration.service.ts` porte un en-tête `AUTHORITY:`.
- **Groupe :** A
- **Tranché :** le design cite le code.

#### 27. Tri du lexique : « par défaut densité », « session navigateur »
- **Où :** `prd.md` (FR-LEX-SORT) — « Le tri par densité est le tri par défaut », « persistant pendant la session navigateur ».
- **Code :** `LexiquePanel.vue` — `lexiqueSortState` `{ key: null, direction: 'neutral' }` : l'ordre reçu (densité décroissante) s'applique ; état en mémoire du composant, non remis à zéro au changement d'article, perdu au rechargement.
- **Groupe :** A
- **Tranché :** sans tri choisi, ordre de densité ; tri gardé tant que la page du Moteur est ouverte.

#### 28. Coût annoncé du pré-contrôle
- **Où :** `prd.md` (FR-LEX-PRECHECK-SERP) — « consomme environ 0,003 € ».
- **Code :** `LexiquePanel.vue` — « Lancer l'analyse SERP (~$0.003 DataForSEO) », « Coût estimé : $0.003. ».
- **Groupe :** A
- **Tranché :** libellés du code cités.

#### 29. « Tester un mot-clé » paie sans prévenir
- **Où :** `prd.md` (FR-LEX-PRECHECK-SERP) — confirmation avant tout coût d'analyse (capitaine).
- **Code :** `LexiquePanel.extractCustomKeyword` → `fetchTfidf(kw, true)` (`triggerScrapeIfMissing`) sans confirmation ni coût affiché, puis avis de l'IA automatique.
- **Groupe :** C
- **Tranché :** limite connue dans la spec ; à aligner sur la confirmation du capitaine.

#### 30. Termes manquants de l'IA non filtrés à chaud
- **Où :** `prd.md` (FR-LEX-METIER-ONLY) — les mots génériques ne s'affichent plus « ni parmi les termes que l'IA recommande ou juge manquants » (pour une exploration relue).
- **Code :** `lexique-exploration.service.ts` `rowToExploration` filtre à la relecture ; l'événement `done` de `ai-lexique-upfront` (`lexiqueAnalysisContract`) n'applique pas `isGenericTerm` à `missingTerms`.
- **Groupe :** C
- **Tranché :** limite connue (affichage seulement, ces termes ne sont pas cochables).

#### 31. Commentaire périmé sur le lexique vide
- **Où :** `server/services/gates/gate.service.ts` — JSDoc de `lexiqueGate` : « ⛔ vide ».
- **Code :** `shared/verifiers/lexique.ts` — `lexique-empty` en `risque` (🔴).
- **Groupe :** C
- **Tranché :** 🔴 ; commentaire à corriger.

#### 32. Exigence implémentée absente du PRD : FR-LIE-SERP-ECHEC-EXPLIQUE
- **Où :** `tests/unit/architecture/requirements-trace.test.ts` — `LEGACY_ORPHANS` ; `tests/unit/composables/serp-echec-explique.test.ts`.
- **Code :** `useLieutenantsSerp.ts` — `expliquerEchecSerp`.
- **Groupe :** A
- **Tranché :** ajoutée à `requirements.md` sous l'ID déjà cité par les tests (pas d'ID inventé). À verser au PRD, puis à retirer de `LEGACY_ORPHANS`.

#### 33. IDs cités sans exigence rédigée
- **Où :** `prd.md` (tables de persistance) — FR-LIE-PERSIST, FR-LIE-PROPOSE, FR-LIE-SELECT, FR-LEX-PERSIST, FR-LEX-EXPLORATION, FR-LEX-RECOMMEND ; `design-registry.md` — FR-LIE-AI-PROPOSALS, FR-LEX-AI-MULTIKW ; tests — FR-LEX-EXTRAIRE, FR-LIE-CHECKS ; en-tête de `article-keywords.store.ts`.
- **Code :** aucune exigence distincte derrière ces IDs.
- **Groupe :** A
- **Tranché :** rangés dans les tables « Retirées » comme alias de l'exigence rédigée correspondante.

#### 34. Panneaux « bimodaux » jamais montés en mode libre
- **Où :** `.claude/CLAUDE.md` §3 — composants Moteur bimodaux (prop `mode`).
- **Code :** `LieutenantsPanel.vue` et `StructureHnPanel.vue` acceptent `mode`, mais ne sont montés qu'en `workflow` ; `LexiquePanel.vue` n'a pas de prop `mode`.
- **Groupe :** D
- **Tranché :** le design dit « mode `workflow` seulement ». À traiter par le lot MOT (FR-MOT-MODE-BIMODAL) si le mode libre revient.

## Rédaction (avec Labo et Explorateur)

*38 écarts — A 14, B 4, C 16, D 4*


Vérifiés contre le code de la branche `feat/cerveau-generer-au-choix` (commit `60b9818`).
Groupes : A (doc périmée, le code est juste) · B (choix produit) · C (le code est en défaut, dette) · D (déjà assumé).

#### 1. L'analyse du brief se lance d'elle-même
- **Où :** `prd.md` (FR-RED-BRIEF) — « elle ne tourne pas automatiquement », bouton « Lancer l'analyse » ; `design-registry.md` (DESIGN-RED-BRIEF, DESIGN-RED-IA-BRIEF) — « iaBriefStreaming reste à false jusqu'à clic explicite ».
- **Code :** `src/views/ArticleWorkflowView.vue` — `handleToggleIaBrief` lance `triggerBriefExplain` à la première ouverture du panneau (`iaBriefTriggered`). `ArticleWorkflowIaBrief.vue` n'a qu'un bouton, « Relancer l'analyse », toujours visible.
- **Groupe :** B
- **Tranché :** en faveur du code. L'analyse part à la première ouverture du panneau ; « Relancer l'analyse » en demande une nouvelle. Aucun bouton « Lancer l'analyse ».

#### 2. Le panneau IA Brief n'a pas d'état d'erreur
- **Où :** `epic-qualite-seo-garde-fous.md` (U4, ouvert).
- **Code :** `ArticleWorkflowIaBrief.vue` — props `parsedBriefMarkdown`, `iaBriefStreaming` seulement ; une analyse en échec laisse le message d'invitation.
- **Groupe :** D
- **Tranché :** limite décrite dans la spécification ; le test ignoré `ai-panels-persistence.test.ts` la garde.

#### 3. Le sommaire n'est plus généré par l'écran
- **Où :** `prd.md` (FR-RED-OUTLINE) — « l'utilisateur déclenche la génération du sommaire », « Générer le sommaire », « il peut interrompre » ; `design-registry.md` (DESIGN-RED-OUTLINE, flux « utilisateur clique Générer le sommaire »).
- **Code :** `src/stores/article/outline.store.ts` — `generateOutline` n'a aucun appelant ; `BriefStructureStep.vue` affiche le sommaire enregistré ou un avertissement. Seul `scripts/auto-article/phases/redaction.ts` appelle `POST /api/generate/outline`, quand l'article n'a pas de structure.
- **Groupe :** A (et `generateOutline` est du code mort côté écran)
- **Tranché :** le sommaire vient de la structure validée au Moteur (`structureToOutline`) ; la génération IA du sommaire n'existe que dans le mode automatique.

#### 4. Annuler / Rétablir du sommaire ne s'activent jamais
- **Où :** `prd.md` (FR-RED-OUTLINE) — « Les boutons Annuler / Rétablir sont actifs après toute modification » ; `docs/ui-sections-guide.md` §4.2 — « undo/redo 20 niv. ».
- **Code :** `OutlineEditor.vue` émet le sommaire entier (`update:outline`) → `outlineStore.setOutline`, qui n'appelle pas `pushUndo`. Seuls `addSection`, `removeSection`, `reorderSections` du store alimentent l'historique, et personne ne les appelle.
- **Groupe :** C
- **Tranché :** exigence gardée, statut « non tenue ».

#### 5. Adresse d'enregistrement du sommaire
- **Où :** `design-registry.md` (DESIGN-RED-OUTLINE) et `docs/ui-sections-guide.md` §4.2 — `PUT /api/articles/:id/outline`.
- **Code :** `outline.store.ts` — `validateOutline` → `PUT /articles/:id { outline }` ; la route `/articles/:id/outline` n'existe pas (`server/routes/articles.routes.ts`).
- **Groupe :** A
- **Tranché :** `PUT /api/articles/:id` avec `{ outline }`.

#### 6. Message « Aucun sommaire disponible » périmé
- **Où :** `src/components/workflow/BriefStructureStep.vue` — « Retournez au Moteur pour générer et valider les lieutenants avec leur structure Hn. »
- **Code :** le sommaire est écrit à la validation de l'onglet Structure (`useStructureHn.prepareValidation`), plus au verrouillage des lieutenants.
- **Groupe :** C
- **Tranché :** la spécification cite le libellé tel quel ; le texte d'écran est à corriger (onglet Structure).

#### 7. Le verrou « Complétez le Cerveau » se contourne
- **Où :** `prd.md` (FR-RED-GEN-UNLOCK) — « le bouton qui mène à l'éditeur est désactivé » ; `design-registry.md` (DESIGN-RED-GEN-UNLOCK) — signal lu sur `article_strategies.completed_steps` seulement.
- **Code :** `ArticleWorkflowView.vue` — `cerveauEstComplet` = `cocoonStrategyStore.isComplete || strategyStore.isComplete` ; `locked` ne s'applique qu'à la barre de navigation (`WorkflowNav.vue`). `BriefStructureStep` émet `outline-validated` (après « Valider le sommaire » et « Continuer vers l'Article ») → `goToStep('article')` sans test du Cerveau.
- **Groupe :** C (contournement) et A (source du signal)
- **Tranché :** exigence « non tenue » ; le signal documenté est la stratégie du cocon, à défaut celle de l'article.

#### 8. Une panne du premier jet n'affiche aucun message
- **Où :** `prd.md` (FR-RED-DRAFT-SINGLE-PASS) — « Une panne … arrête le premier jet avec un message » ; `docs/ui-sections-guide.md` §4.3 — « Message d'erreur `ErrorMessage` — Affichage + retry » ; `docs/recette-manuelle.md` étape 6 — « C'est un bug si la génération s'arrête sans message ».
- **Code :** `ArticleWorkflowView.vue` utilise `<ErrorMessage>` sans l'importer ; il n'est pas déclaré globalement (`src/main.ts`) : le composant n'est pas résolu et rien ne s'affiche. `ArticleEditorView.vue` n'affiche jamais `editorStore.error` (retour à « Aucun contenu… »). Même résolu, le « retry » relancerait `handleGenerateArticle` (tout l'article).
- **Groupe :** C
- **Tranché :** exigence gardée, statut « non tenue ».

#### 9. FR-RED-GEN-SAUVEGARDE-AU-FIL, ID orphelin
- **Où :** cité par `editor.store.ts`, `useArticleGeneration.ts` et leurs tests ; absent de `prd.md` ; figé dans `LEGACY_ORPHANS` de `tests/unit/architecture/requirements-trace.test.ts`.
- **Code :** `editor.store.ts` — `saveContenuPartiel` à chaque `section-done`.
- **Groupe :** D
- **Tranché :** l'exigence est écrite dans `requirements.md` (ID existant, pas inventé). Quand le cliquet lira les nouveaux documents, retirer l'ID de `LEGACY_ORPHANS` dans le même changement.

#### 10. L'humanisation ne signale pas les sections revenues à l'original
- **Où :** `prd.md` (FR-RED-HUMANIZE-SECTION) — « le signale dans une note discrète ».
- **Code :** `editor.store.ts` — `humanizeFallbackCount` et `lastHumanizeError` sont comptés, mais aucun composant ne les lit.
- **Groupe :** C
- **Tranché :** exigence « non tenue ».

#### 11. Arrêter la réduction rend l'article d'avant
- **Où :** `prd.md` (FR-RED-REDUCE-SECTION) — « les sections déjà compressées restent compressées » ; `design-registry.md` (DESIGN-RED-REDUCE-SECTION, « Watchers ») — idem.
- **Code :** `editor.store.ts` — `reduceArticle` : arrêt → `content.value = originalContent`.
- **Groupe :** B
- **Tranché :** en faveur du code, comme l'humanisation : « Annuler réduction » rend l'article d'avant.

#### 12. La réduction ignore la stratégie du cocon
- **Où :** `design-registry.md` (DESIGN-RED-REDUCE-SECTION) — « strategy context pour préserver ton + promesse ».
- **Code :** `reduce-section.routes.ts` — `buildStrategyContext(getStrategy(articleId))`, sans repli sur la stratégie du cocon (le premier jet et les passes utilisent `pickStrategyContext`). La stratégie par article n'est plus remplie par aucun écran (commentaire de `ArticleWorkflowView.vue`) : la réduction reçoit « Aucun contexte stratégique disponible. ».
- **Groupe :** C
- **Tranché :** la conception le décrit tel quel ; à aligner sur `pickStrategyContext`.

#### 13. La méta ne se modifie pas et ne se relance pas seule
- **Où :** `prd.md` (FR-RED-META) — « relancer uniquement la méta », « éditable manuellement » ; `epic-qualite-seo-garde-fous.md` (U6, ouvert).
- **Code :** `ArticleMetaDisplay.vue` et `MetaCard.vue` affichent sans champ de saisie ; `editorStore.generateMeta` n'est appelé que par `handleGenerateArticle`.
- **Groupe :** C
- **Tranché :** exigence « non tenue ».

#### 14. Où la méta est raccourcie
- **Où :** `design-registry.md` (DESIGN-RED-META, « Décisions ») — « `editorStore.generateMeta` tronque côté client au dernier espace ».
- **Code :** `meta.routes.ts` — `fitMetaText` côté serveur ; le store n'ajuste rien. Le registre se contredit (sa ligne « Refs code » est juste).
- **Groupe :** A
- **Tranché :** l'ajustement est fait par le serveur (`shared/utils/meta-fit.ts`).

#### 15. La barre de mots n'affiche pas d'écart signé
- **Où :** `prd.md` (FR-RED-WORD-COUNT-TARGET) — « nombre de mots actuel, cible, et écart signé ».
- **Code :** `ArticleWordCountBar.vue` — « N mots / N cible » et une jauge (verte à 80 % de la cible). L'écart n'apparaît que sur le bouton « Réduire (-N mots) » quand l'article dépasse (`ArticleActions.vue`).
- **Groupe :** B
- **Tranché :** en faveur du code.

#### 16. Enregistrement automatique : toutes les 30 secondes, dans l'éditeur seulement
- **Où :** `prd.md` (FR-RED-EDITOR-TIPTAP) — « Toute modification déclenche une sauvegarde automatique », « enregistré il y a Xs » ; `design-registry.md` (DESIGN-RED-EDITOR-TIPTAP) — « `useAutoSave` debounce », Ctrl+S « cf. ArticleWorkflowView ».
- **Code :** `useAutoSave.ts` — intervalle de 30 s, monté par `ArticleEditorView` seulement. La rédaction guidée n'a pas d'enregistrement automatique (elle enregistre après chaque opération ; Ctrl+S dans les deux vues). `SaveStatusIndicator.vue` calcule « il y a Xs » sans horloge réactive : le texte reste figé jusqu'au prochain enregistrement.
- **Groupe :** A (le rythme) et C (texte figé, mineur)
- **Tranché :** 30 s dans l'éditeur ; indicateur décrit tel quel.

#### 17. Nombre de mots dans l'éditeur
- **Où :** `prd.md` (FR-RED-EDITOR-TIPTAP) — « L'éditeur expose à tout moment le nombre de mots » ; `design-registry.md` (DRIFT-013) — l'éditeur libre n'expose pas le compteur, par choix.
- **Code :** `ArticleWordCountBar` n'est monté que par `ArticleWorkflowView` ; dans l'éditeur, le nombre de mots se lit dans le panneau SEO.
- **Groupe :** D
- **Tranché :** comme DRIFT-013 ; le critère est retiré de FR-RED-EDITOR-TIPTAP.

#### 18. « Supprimer le contenu » ne supprime pas le texte en base
- **Où :** aucun document ne décrit ce bouton (`docs/ui-sections-guide.md` §5.2.1 : « Supprimer contenu … reset »).
- **Code :** `ArticleEditorView.vue` — `handleDeleteContent` envoie `content: null` ; `article-content.service.ts` — `COALESCE(EXCLUDED.content, article_content.content)` garde l'ancien texte. La méta, elle, est bien effacée. Au rechargement, le texte revient sans sa méta.
- **Groupe :** C
- **Tranché :** comportement décrit dans la spécification, pas d'ID créé.

#### 19. Le score affiché vaut 0 avant le premier calcul
- **Où :** `prd.md` (FR-INFRA-NO-SCORE-FALLBACK) ; `docs/data-flows/seo.md` — « l'affichage dit "—" ».
- **Code :** `SeoPanel.vue` et `GeoPanel.vue` — `ScoreGauge :score="…score?.global ?? 0"`.
- **Groupe :** C
- **Tranché :** à corriger (« — » tant que le score est inconnu).

#### 20. Le lexique n'entre pas dans le score SEO
- **Où :** `prd.md` (FR-RED-SEO-LIVE) — le score note « la présence et la densité … des termes du Lexique ».
- **Code :** `seo-calculator.ts` — `_lexiquePresenceScore` est calculé mais inutilisé ; le score pondère six facteurs (`SEO_SCORE_WEIGHTS`) sans le lexique. Le lexique est affiché dans l'onglet « Mots-clefs ».
- **Groupe :** A
- **Tranché :** six facteurs ; le lexique est détaillé, pas noté. La cible de densité du capitaine est 1,5 à 2,5 % (`KEYWORD_DENSITY_TARGETS.Pilier`), pas 0,8-1,5 % comme dans l'exemple du PRD.

#### 21. `docs/data-flows/seo.md` décrit l'ancien enregistrement du score
- **Où :** `docs/data-flows/seo.md` (mis à jour le 2026-05-04) — score envoyé depuis `seoStore.score.global` à l'autosave.
- **Code :** `editor.store.ts` — `recordScore` / `freshScore` : empreinte du texte noté (FR-RED-SEO-SCORE-PERSIST).
- **Groupe :** A
- **Tranché :** le mécanisme par empreinte.

#### 22. Score GEO sans exigence
- **Où :** aucun FR ne décrit le calcul GEO (seuls FR-RED-PANELS-LAYOUT et FR-RED-SEO-SCORE-PERSIST le citent).
- **Code :** `src/utils/geo-calculator.ts` — `calculateGeoScore`, `useGeoScoring.ts`, `GeoPanel.vue`.
- **Groupe :** B
- **Tranché :** **nouveaux IDs `FR-RED-GEO-LIVE` et `DESIGN-RED-GEO-LIVE`** (miroir), exigence réellement implémentée.

#### 23. Les actions contextuelles ne reçoivent pas le mot-clé
- **Où :** `prd.md` (FR-RED-CONTEXTUAL-ACTIONS) ; `design-registry.md` (DESIGN-RED-CONTEXTUAL-ACTIONS) — « mot-clé Capitaine du contexte client ».
- **Code :** `ArticleEditorView.vue` — `handleSelectAction` appelle `executeAction(…, { articleId }, editor)` sans `keyword` ; `action.routes.ts` laisse alors `keywordInstruction` vide. « Optimiser mot-clé » (`actions/keyword-optimize.md`) n'a donc aucun mot-clé à intégrer. Les blocs dynamiques, eux, reçoivent le capitaine.
- **Groupe :** C
- **Tranché :** exigence « non tenue ».

#### 24. Onze actions, mais pas dans la barre
- **Où :** `prd.md` (FR-RED-CONTEXTUAL-ACTIONS) — 11 actions dans la mini-barre.
- **Code :** `ActionMenu.vue` — huit actions IA + « Lien interne » ; « Sources chiffrées », « Exemples réels », « Ce qu'il faut retenir » sont des blocs dynamiques de `BlocksPanel.vue`.
- **Groupe :** A (le registre le dit déjà)
- **Tranché :** comme le code.

#### 25. « Statistique sourcée » invente un chiffre attribué
- **Où :** `prd.md` (FR-RED-DRAFT-TO-SOURCE, esprit : aucun chiffre inventé) ; l'exemple « En situation » de FR-RED-CONTEXTUAL-ACTIONS montre un chiffre sans source proposé par l'IA.
- **Code :** `server/prompts/actions/add-statistic.md` — « GÉNÈRE une statistique pertinente et sourcée … plausible », format « selon [Source], [Année] », sans recherche web. L'attribution suffit à faire taire `detectUnsourcedFigures` à la publication.
- **Groupe :** C
- **Tranché :** décrit tel quel dans la spécification, avec l'avertissement ; à rebrancher sur la recherche web ou à retirer.

#### 26. Liste « Choisir l'article cible » vide après un rechargement
- **Où :** `epic-qualite-seo-garde-fous.md` (U5, « à confirmer ») ; `prd.md` (FR-RED-CONTEXTUAL-ACTIONS) — « sélecteur d'articles du même cocon ».
- **Code :** `ArticleEditorView.vue` lit `articlesStore.articles`, rempli seulement par `CocoonLandingView` et `RedactionView` (`fetchArticlesByCocoon`) : ouvert directement, l'éditeur affiche « Aucun article disponible dans ce cocon. » ; la liste est celle du dernier cocon visité.
- **Groupe :** C
- **Tranché :** confirmé par la lecture du code ; limite décrite.

#### 27. Appliquer une suggestion de maillage
- **Où :** `prd.md` (FR-RED-LINKING-MANUAL) — « appliquer pose le lien dans l'éditeur » ; `docs/ui-sections-guide.md` §4.4.3 ; libellé « Suggérer des liens » dans le PRD.
- **Code :** `ArticleWorkflowView.vue` n'écoute pas `accept-suggestion` (la vue n'a pas d'éditeur) : « Appliquer » n'y fait rien. `useInternalLinking.applySuggestion` cherche l'ancre dans l'éditeur de la zone active seulement (introduction, corps ou conclusion) et retire la suggestion de la liste même quand le lien n'a pas été posé. Le bouton du panneau s'appelle « Actualiser » ; les suggestions sont demandées à l'ouverture du panneau.
- **Groupe :** C (application) et A (libellé)
- **Tranché :** exigence « non tenue » ; libellés du code.

#### 28. Le registre se contredit sur les liens retirés
- **Où :** `design-registry.md` (DESIGN-RED-PUBLISH-GATE, « Limites connues ») — « Un lien retiré de l'éditeur reste dans `internal_links` ».
- **Code :** `article-content.service.ts` — `saveArticleContent` appelle `pruneStaleLinks` dès qu'un texte est enregistré.
- **Groupe :** A
- **Tranché :** le réseau de liens suit le texte enregistré.

#### 29. Phases de l'article
- **Où :** `prd.md` (FR-RED-PROGRESS) — phases brief / outline / writing / seo, transitions par gestes explicites, retour possible ; `design-registry.md` (DESIGN-RED-PROGRESS) — même enum, flux « Valider le brief » → `REDACTION_BRIEF_VALIDATED`.
- **Code :** `shared/types/article.types.ts` — `ArticlePhase = 'proposed' | 'moteur' | 'redaction' | 'published'` ; `shared/utils/article-phase.ts` — `nextArticlePhase` : texte enregistré → `redaction`, publication → `published`, jamais de recul. Aucun code n'écrit `moteur` ; `articleProgressStore.saveProgress` n'a aucun appelant. La phase est lue par la liste « Articles publiés » (`data.service.ts`, `phase IN ('redaction','published')`).
- **Groupe :** A
- **Tranché :** FR-RED-PROGRESS réécrite selon le code.

#### 30. « La Rédaction n'écrit plus de checks workflow »
- **Où :** `prd.md` et `design-registry.md` (FR-RED-CHECKS, DESIGN-RED-CHECKS retirées) — « `articles.completed_checks` ne porte plus que des valeurs `moteur:*` ».
- **Code :** `shared/constants/workflow-checks.constants.ts` — `REDACTION_DRAFT_ACCEPTED` (`redaction:draft_accepted`), gardée par la porte `draft` (`CHECK_GATES`, `gate.service.ts`).
- **Groupe :** A
- **Tranché :** une seule étape Rédaction existe, « premier jet accepté ».

#### 31. Largeur du panneau mémorisée au-delà de la session
- **Où :** `prd.md` (FR-RED-PANELS-LAYOUT) — « persiste pendant la session » ; FR-RED-IA-BRIEF — « l'un des cinq panneaux ».
- **Code :** `useResizablePanel.ts` — `useLocalStorage('blog-redactor:panel-width', 300)`, minimum 240 px ; six boutons dans `ArticlePanelsToolbar.vue`.
- **Groupe :** A
- **Tranché :** la largeur est gardée par le navigateur, d'une session à l'autre.

#### 32. Le H1 publié n'est pas celui que la porte juge
- **Où :** `prd.md` (FR-RED-PUBLISH-GATE) — 🔴 capitaine absent du H1 ; « Un H1 laissé dans le corps est toléré : l'export le retire ».
- **Code :** `gate.service.ts` — `publishGate` juge `title: h1 || article.title` (le H1 du texte) ; `export.service.ts` — `generateExportHtml` retire le H1 du texte (`stripContentH1`) et affiche `<h1>` = `articles.titre` ; `generateJsonLd` prend aussi le titre de l'article. Un pilier dont le titre n'a pas le capitaine (cas du 1013) passe la porte et publie un H1 sans capitaine.
- **Groupe :** C
- **Tranché :** exigence FR-RED-EXPORT-HTML « non tenue » sur ce point.

#### 33. Le fichier exporté perd les liens internes
- **Où :** `prd.md` (FR-RED-PUBLISH-GATE : « avant de télécharger le fichier ») ; aucune exigence d'export.
- **Code :** `ArticlePreviewView.vue` — `downloadHtml` télécharge le HTML de l'aperçu (`GET /api/preview/:id`). `export.routes.ts` — la route d'aperçu n'envoie pas `linkSlugById` à `generateExportHtml` : `rewriteInternalLinks` déballe chaque `#article-<id>`. Seule `POST /api/export/:id`, qui résout les liens, est utilisée… par le mode automatique.
- **Groupe :** C
- **Tranché :** **nouveaux IDs `FR-RED-EXPORT-HTML` et `DESIGN-RED-EXPORT-HTML`** (aperçu + fichier, réellement implémentés), statut « non tenue ». Si un autre lot couvre déjà l'export, l'assembleur fusionne.

#### 34. La route d'analyse du brief ne valide pas son entrée
- **Où :** `.claude/CLAUDE.md` §3.1 — « Routes Express : parsent input (Zod) ».
- **Code :** `brief-explain.routes.ts` — lecture directe de `req.body` et test manuel de trois champs.
- **Groupe :** C
- **Tranché :** décrit dans la conception ; dette mineure.

#### 35. L'analyse d'écart de contenu n'a plus d'écran
- **Où :** `prd.md` (FR-EXP-CONTENT-GAP, « ACTIVE ») — « Consommée par LieutenantsPanel, LieutenantCard, LieutenantProposals, ContentGapPanel (Moteur) ».
- **Code :** seul `src/components/brief/ContentGapPanel.vue` appelle `POST /api/content-gap/analyze`, et il n'est monté que par `src/components/production/EnginePhase.vue`, qu'aucun composant n'importe. Les « insights de content-gap » du panneau Lieutenants viennent du flux `propose-lieutenants` (`useLieutenantsIa.ts`). L'analyse stockée (`keyword_metrics.content_gap_analysis`) reste lue par `POST /articles/:id/recommend-word-count` et `article-explorations.routes.ts`.
- **Groupe :** A (consommateurs) et C (écran orphelin)
- **Tranché :** FR-EXP-CONTENT-GAP « non tenue ». La reconnaissance d'un thème par son libellé entier (checklist M22) est gardée telle quelle (B, en faveur du code).

#### 36. Restes de l'Explorateur et du Labo
- **Où :** `prd.md` (FR-EXP-AUDIT, FR-LAB-MODE-LIBRE).
- **Code :** `POST /api/keywords/audit` (`keywords.routes.ts`) et `keyword-audit.store.ts` ne servent qu'à `EnginePhase.vue` / `KeywordAuditTable.vue`, orphelins. La prop `mode: 'workflow' | 'libre'` subsiste dans les panneaux du Moteur (`CaptainPanel.vue`…) ; aucun appelant ne passe `libre`.
- **Groupe :** D
- **Tranché :** tables « Retirées » ; dette de nettoyage (dossier `src/components/production/`).

#### 37. Composable des actions contextuelles
- **Où :** `design-registry.md` (DESIGN-RED-CONTEXTUAL-ACTIONS) — monté « typiquement `ArticleEditorView` ou `ArticleWorkflowView` ».
- **Code :** seul `ArticleEditorView.vue` monte `useContextualActions` ; la rédaction guidée n'a pas d'éditeur.
- **Groupe :** A
- **Tranché :** éditeur seulement.

#### 38. Le sommaire et le mot-clé principal
- **Où :** `prd.md` (FR-RED-META-CAPTAIN) — « La génération de la méta, du sommaire et de l'article reçoit le capitaine ».
- **Code :** `outline.store.ts` envoie bien `articleMainKeyword`, mais cette génération n'est plus appelée par l'écran (conflit 3) ; le mode automatique envoie le capitaine.
- **Groupe :** A
- **Tranché :** l'exigence vise la méta et le premier jet.

## Intégrations externes et composants partagés

*36 écarts — A 13, B 8, C 11, D 4*


Groupes : A = doc périmée, le code est juste · B = choix produit (tranché en faveur du code) · C = le code est en défaut, dette · D = déjà assumé.

### Intégrations externes

#### 1. Erreurs DataForSEO avalées (mesures groupées, fiche SEO du brief)
- **Où :** `prd.md` (FR-EXT-DATAFORSEO) — « l'app le signale clairement à l'utilisateur plutôt que d'afficher des valeurs vides silencieusement » ; commentaire de `dataforseo.routes.ts` — « Delegate to the global error handler so CostBudgetError / DataForSeoQuotaError get their proper 429 ».
- **Code :** `dataforseo/brief.ts` — `getBrief` lance ses quatre appels en `Promise.allSettled` et ne fait qu'un `log.warn` ; `dataforseo/keywords.ts` — `fetchKeywordOverviewBatch` et `fetchSearchIntentBatch` attrapent chaque paquet en échec (`catch … log.warn`). Un `CostBudgetError` ou un `DataForSeoQuotaError` n'atteint jamais l'écran par ces chemins ; `getBrief` écrit même l'entrée vide dans le cache.
- **Groupe :** C
- **Tranché :** FR-EXT-DATAFORSEO « non tenue ». La spécification décrit les valeurs vides sans message.

#### 2. Le refus du plafond n'entre pas dans la pile d'activité
- **Où :** `prd.md` (FR-EXT-DATAFORSEO-COSTGUARD) — message « budget DataForSEO dépassé… » et code d'erreur dédié.
- **Code :** `server/utils/error-handler.ts` / `api-error.ts` renvoient bien 429 `DATAFORSEO_COST_BUDGET`, mais `src/services/api.service.ts` — `KNOWN_ERROR_CODES` ne liste que `DATAFORSEO_QUOTA_EXCEEDED`, `AI_PROVIDER_QUOTA_EXCEEDED`, `AI_PROVIDER_OVERLOADED`. Seules cinq routes transmettent ces erreurs (`dataforseo`, `keyword-scan`, `keywords` audit / validate-pain, `paa`, `serp-analysis`) ; les autres renvoient leur propre code générique.
- **Groupe :** C
- **Tranché :** l'exigence reste active (le refus est préventif et son message existe) ; la spécification précise « sur les fonctions qui transmettent l'erreur » et « ne s'inscrit pas dans la pile ».

#### 3. Compteur de dépense « en bas à droite »
- **Où :** `prd.md` (FR-EXT-DATAFORSEO-COSTGUARD, « en bas à droite de l'app ») ; `docs/ai-usage-map.md` (« panneau flottant coin bas-droite »).
- **Code :** `CostLogPanel.vue` — `.cost-log { position: fixed; bottom: 1.5rem; left: 1.5rem }`, replié par défaut ; la ligne DataForSEO n'apparaît qu'une fois déplié.
- **Groupe :** A
- **Tranché :** pile d'activité en bas à gauche, dépense visible une fois dépliée.

#### 4. API du garde-fou mal nommée dans le registre
- **Où :** `design-registry.md` (DESIGN-EXT-DATAFORSEO-COSTGUARD) — `costGuard.snapshot()`, « `commit` incrémente le compteur sur succès ».
- **Code :** `dataforseo-cost-guard.ts` — `getStatus()` ; `reserve()` impute le coût, `commit()` ne fait rien ; `_client.ts` — `budgetApplicable()` saute le garde-fou en bac à sable.
- **Groupe :** A
- **Tranché :** coût imputé à la réservation, rien de compté en bac à sable.

#### 5. Rafraîchissement forcé : pas de `noCache` dans `getOrFetch`
- **Où :** `design-registry.md` (DESIGN-EXT-DATAFORSEO) — « paramètre `noCache?: true` dans la cascade `getOrFetch` » ; « Aucun store ne tape `/api/dataforseo/*` directement ».
- **Code :** `server/db/cache-helpers.ts` — `getOrFetch(cacheType, cacheKey, ttlMs, fetcher)` sans option ; le rafraîchissement passe par `getBrief(keyword, forceRefresh)`, appelé par `src/stores/strategy/brief.store.ts` — `refreshDataForSeo` via `POST /dataforseo/brief`.
- **Groupe :** A
- **Tranché :** bouton « Rafraîchir » du panneau SEO de la rédaction → `forceRefresh: true`.

#### 6. Journal « SANDBOX / PRODUCTION » écrit une seule fois
- **Où :** `prd.md` (FR-EXT-DATAFORSEO-SANDBOX) — « l'app loggue « DataForSEO : SANDBOX » dans la pile d'activité », « badge orange » ; `design-registry.md` — « log warn explicite si on tape la prod ».
- **Code :** `_client.ts` — `getBaseUrl` n'écrit qu'au premier appel du processus (`baseUrlLogged`), dans le journal serveur, pas dans la pile. La pile affiche une mention « SANDBOX » (bleue) ou « PROD » (rouge) ; la barre de navigation affiche « MOCK » / « RÉEL ».
- **Groupe :** A
- **Tranché :** indicateur = libellé « MOCK » de la barre et mention « SANDBOX » de la pile ; journal serveur au premier appel seulement.

#### 7. Le bouton « RÉEL » impose Claude ; la configuration n'est pas basculable à chaud
- **Où :** `prd.md` (FR-EXT-AI-MULTI-PROVIDER) — « choix par une seule variable… basculé à chaud via le toggle navbar », « un seul toggle, trois modes ».
- **Code :** `ai-provider.service.ts` — `getProvider` : override `real` → `'claude'` quel que soit `AI_PROVIDER` ; `runtime-mode.store.ts` — `toggle` n'envoie que `mock` ou `real`, jamais `null`, et le choix est gardé dans le navigateur. `AI_PROVIDER` n'est lu que dans `process.env`, chargé au démarrage.
- **Groupe :** B
- **Tranché :** en faveur du code : deux positions à chaud (simulé / Claude), fournisseur quotidien choisi dans la configuration. Piège consigné dans la spécification : après un premier clic, l'écran ne sait plus rendre la main à la configuration.

#### 8. Resynchronisation du mode seulement au chargement de la page
- **Où :** `prd.md` (FR-INFRA-RUNTIME-MODE, domaine Infrastructure) — « re-synchronisé automatiquement si le serveur a redémarré » ; « pas de divergence entre badge et comportement ».
- **Code :** `AppNavbar.vue` — `hydrate()` seulement si `!runtimeMode.isHydrated`, au premier montage. Un redémarrage du serveur (fréquent avec `--watch`) le ramène à sa configuration, sans que le bouton change. `CostLogPanel.vue` relit `sandbox` toutes les 15 s.
- **Groupe :** C
- **Tranché :** la spécification décrit la fenêtre de divergence et renvoie à la mention « SANDBOX / PROD » de la pile. À traiter avec le domaine Infrastructure.

#### 9. Le mode simulé ne couvre que l'IA et DataForSEO — Tavily reste payant
- **Où :** `prd.md` (FR-INFRA-RUNTIME-MODE) — « basculer toutes les sources externes en mode simulation » ; NFR-COST-AI-MOCK.
- **Code :** seuls `getProvider` et `isSandbox` lisent `getRuntimeMode`. `autocomplete.service.ts`, `scrape-corpus.service.ts`, `gsc.service.ts`, `embedding.service.ts` et `content-gap.service.ts` — `searchWithTavily` appellent le vrai service. Le test `tests/contract-api/intent-local-gap.contract.test.ts` appelle `/content-gap/analyze` sur un mot-clé nouveau à chaque passage : en local, avec `TAVILY_API_KEY`, chaque exécution interroge Tavily.
- **Groupe :** C (Tavily, service à clé) ; B pour les services gratuits.
- **Tranché :** la spécification liste ce que « MOCK » coupe et ne coupe pas ; Tavily non simulé est une dette.

#### 10. La bascule entre fournisseurs n'est pas montrée à l'utilisateur
- **Où :** `prd.md` (FR-EXT-AI-FALLBACK) — « la pile d'activité l'affiche explicitement (« Claude saturé, bascule sur Gemini ») » ; `design-registry.md` — « pour que l'utilisateur trace la cause dans la pile d'activité ».
- **Code :** `ai-provider.service.ts` — `withFallbackChain` : `log.warn(\`${ctx}: fallback to ${provider} (primary exhausted)\`)`, journal serveur uniquement ; la pile ne montre que `usage.model`.
- **Groupe :** C
- **Tranché :** FR-EXT-AI-FALLBACK « non tenue ».

#### 11. Types d'erreurs qui déclenchent la bascule, statut 529
- **Où :** `design-registry.md` (DESIGN-EXT-AI-FALLBACK) — « seules `Quota` et `Overloaded` (status 429/529/503)… une erreur 401 (clé invalide) ne déclenche pas le fallback », contredit par sa propre liste qui cite `AIProviderUnavailableError` ; « retry sur le primary ».
- **Code :** `mapToKnownError` — 401/403/404 → `AIProviderUnavailableError`, qui bascule ; `isRetryable` = 429, 500, 503 (pas 529 ; une 529 n'est reconnue qu'au mot « overload » du message) ; `withRetry` s'applique à chaque fournisseur de la chaîne, pas seulement au principal.
- **Groupe :** A
- **Tranché :** quota, surcharge et fournisseur inutilisable basculent ; relances sur 429/500/503 pour chaque fournisseur.

#### 12. Erreurs d'IA : codes perdus hors de quelques routes
- **Où :** `prd.md` (FR-EXT-AI-FALLBACK) — « erreur claire qui pointe le diagnostic (quel fournisseur a échoué, quelle erreur exacte) ».
- **Code :** `AIProviderUnavailableError` n'a aucun code HTTP dédié (500 `INTERNAL_ERROR`) alors que `tests/helpers/api-client.ts` tolère `AI_PROVIDER_UNAVAILABLE`, jamais émis. `ai-panel-runner.service.ts` — `runAiPanelStream` écrit l'en-tête 200 avant l'appel : l'erreur devient un événement SSE `error`, sans code. Plusieurs routes remplacent le message (ex. `keywords.routes.ts` relevance-score → `SCORING_ERROR` « Failed to classify keyword relevance »).
- **Groupe :** C
- **Tranché :** la spécification dit où les messages arrivent vraiment.

#### 13. Modèle Claude : la configuration ne vaut que pour les textes
- **Où :** `prd.md` (FR-EXT-CLAUDE) — « choisir le modèle Claude exact via une simple variable » ; `docs/ai-usage-map.md` — lignes `classify_relevance`, `curate_keywords`, `classify_intent`, `analyze_content_gap`, `recommend_word_count` : « `CLAUDE_MODEL` env ».
- **Code :** `claude.service.ts` — `streamChatCompletion` lit `CLAUDE_MODEL` (défaut `claude-sonnet-4-6`) ; `classifyWithTool` a pour défaut `claude-haiku-4-5-20251001` et ignore `CLAUDE_MODEL` ; `keywords.routes.ts` relevance-score ne passe aucun modèle.
- **Groupe :** B (PRD), A (`ai-usage-map.md`)
- **Tranché :** en faveur du code : textes = `CLAUDE_MODEL`, réponses structurées = Haiku 4.5 sauf demande de la fonction.

#### 14. Coût en euros, recherche web non comptée
- **Où :** `prd.md` (FR-EXT-CLAUDE) — « badge € sur chaque ligne », « Sonnet : … → $0,022 ».
- **Code :** `CostLogPanel.vue` / `ApiCostBadge.vue` — `formatCost` en `$` ; `claude.service.ts` — `calculateCost` ne compte que les jetons (modèle inconnu → tarif Sonnet), pas les frais de la recherche web (`webSearchTool`, jusqu'à 3 recherches par appel).
- **Groupe :** A (devise) ; C (coût de la recherche web sous-estimé)
- **Tranché :** coût affiché en dollars, jetons seulement.

#### 15. `WEB_SEARCH_TOOL` n'existe plus
- **Où :** `design-registry.md` (DESIGN-EXT-CLAUDE) — « `WEB_SEARCH_TOOL` (134, sans ville) ».
- **Code :** `claude.service.ts` n'exporte que `webSearchTool(zone?, maxUses = 3)` ; aucune occurrence de `WEB_SEARCH_TOOL` dans `server/`.
- **Groupe :** A
- **Tranché :** seule `webSearchTool` est décrite.

#### 16. Modèle Gemini par défaut retiré par Google
- **Où :** `prd.md` (FR-EXT-GEMINI), `design-registry.md` — « `GEMINI_MODEL` défaut `gemini-2.0-flash` (gratuit + rapide) » ; `.env.example`.
- **Code :** `gemini.service.ts` — `DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'` ; le commentaire de `AIProviderUnavailableError` (`ai-provider.service.ts`) constate que Google renvoie 404 « no longer available » pour ce modèle.
- **Groupe :** C
- **Tranché :** FR-EXT-GEMINI « non tenue » ; sans réglage, la chaîne saute Gemini (`AIProviderUnavailableError`).

#### 17. JSON Gemini invalide : pas de bascule
- **Où :** `prd.md` (FR-EXT-GEMINI) — « Si Gemini renvoie un JSON invalide… le fallback se déclenche » ; `design-registry.md` idem.
- **Code :** `classifyJsonGemini` lève `Error('Gemini returned invalid JSON…')`, qui n'est ni quota, ni surcharge, ni indisponibilité → remonte sans bascule, comme le veut FR-EXT-AI-FALLBACK pour les « autres erreurs ».
- **Groupe :** A (contradiction doc ↔ doc ; le code suit FR-EXT-AI-FALLBACK)
- **Tranché :** erreur claire, sans bascule.

#### 18. Liste des fixtures du mode simulé
- **Où :** `design-registry.md` (DESIGN-EXT-AI-MULTI-PROVIDER) — fixtures `brief.ts`, `discovery.ts`, … `content-gap.ts` ; registre dans `mock.service`.
- **Code :** `mock-fixtures/` n'a pas de `brief.ts` ; `index.ts` charge 15 fichiers (dont `article-draft`, `cocoon-child`, `enrichment`, `captain-paa-judge`, `auto-*`) ; le registre vit dans `mock-registry.ts`.
- **Groupe :** A
- **Tranché :** liste du code, dans `design.md`.

#### 19. Le mode simulé valide le chemin, pas le contrat
- **Où :** `prd.md` (NFR-COST-AI-MOCK) — « fixtures réalistes ».
- **Code :** `mock.service.ts` — sans fixture, `generateFromSchema` produit `'mock value'`, 0, premier choix d'énumération ; les fixtures écrites d'après le code ont déjà masqué un écart de format avec un prompt (`"Pilier"` contre `'pilier'`).
- **Groupe :** D
- **Tranché :** règle consignée dans `design.md` : copier le format du bloc d'exemple du prompt.

#### 20. Search Console : accès révoqué non détecté, marge de renouvellement
- **Où :** `prd.md` (FR-EXT-GSC-OAUTH) — « le badge passe au rouge et un message clair lui propose de relancer la connexion » ; `design-registry.md` — marge de 5 min, `GscToken` avec `scope`.
- **Code :** `gsc.service.ts` — `isConnected` = un fichier de jeton existe ; `getValidToken` renouvelle à moins de 60 s ; un refus lève « Google OAuth refresh error : <code> » → 500 `GSC_PERFORMANCE_ERROR`, affiché par `AsyncContent` avec un bouton de nouvel essai. `shared/types/gsc.types.ts` — `GscToken { accessToken, refreshToken, expiresAt }`.
- **Groupe :** C (détection et invitation absentes) ; A (marge, type)
- **Tranché :** FR-EXT-GSC-OAUTH « non tenue ».

#### 21. Search Console : période et ventilation, clé de cache
- **Où :** `prd.md` (FR-EXT-GSC-PERFORMANCE) — « plage de dates au choix », « choisir la ventilation » ; `design-registry.md` — `cache_type='gsc_performance'`, clé avec `dimensions`, lignes `query`, `page`.
- **Code :** `PostPublicationView.vue` — périodes 7 / 30 / 90 jours, ventilation fixe (requête + page) regroupée par page. `gsc.service.ts` — `cache_type 'gsc'`, clé `slugify(siteUrl-startDate-endDate)` sans `dimensions` (deux ventilations d'une même période partageraient la réponse ; aucun écran n'en demande d'autre), resservie le même jour calendaire ; lignes `keys[]`.
- **Groupe :** B (période, ventilation) ; C (clé de cache, latent) ; A (noms)
- **Tranché :** en faveur du code : FR-EXT-GSC-PERFORMANCE active avec périodes 7 / 30 / 90 et regroupement par page.

#### 22. Couleur de la position Search Console
- **Où :** `docs/ui-sections-guide.md` §6.4 — « position colorée (≤10 vert, ≤30 orange, >30 rouge) ».
- **Code :** `PostPublicationView.vue` — `:class="{ good: position <= 10, mid: position <= 30, bad: position > 30 }"` ; une position ≤ 10 reçoit `good` et `mid`, et `.mid` (déclarée après) impose l'orange : le vert n'apparaît jamais.
- **Groupe :** C
- **Tranché :** la spécification décrit « orange jusqu'à 30, rouge au-delà ».

#### 23. Comparaison mots-clés visés / indexés sans écran
- **Où :** `prd.md` (FR-EXT-GSC-KEYWORD-GAP) — « L'utilisateur fournit l'URL de son article… » ; `design-registry.md` — listes `missing`, `discovered`.
- **Code :** `gsc.store.ts` — `fetchKeywordGap` n'a aucun appelant dans `src/` ; `gsc.service.ts` — `analyzeKeywordGap` rend `matched`, `targetedNotIndexed`, `discoveredOpportunities`.
- **Groupe :** C
- **Tranché :** « prévue, non livrée » ; absente de `specification.md`, décrite dans `design.md`.

#### 24. Modèle local : téléchargement et échec définitif
- **Où :** `prd.md` (FR-EXT-EMBEDDINGS) — « sans coût et sans appel réseau » ; `design-registry.md` — « 100 % local ».
- **Code :** `embedding.service.ts` — `pipeline('feature-extraction', MODEL_ID)` télécharge le modèle au premier chargement ; `loadFailed = true` empêche tout nouvel essai jusqu'au redémarrage.
- **Groupe :** A
- **Tranché :** calcul local ; téléchargement unique ; échec valable pour la session.

#### 25. Autocomplétion : adresse, forme de la réponse, stockage, fraîcheur
- **Où :** `design-registry.md` (DESIGN-EXT-AUTOCOMPLETE-GOOGLE) — `suggestqueries.google.com … client=firefox`, retour `{ autocompleteSource, autocompleteSuggestions }`, table `keyword_autocomplete`.
- **Code :** `autocomplete.service.ts` — `https://www.google.com/complete/search?…&client=chrome`, retour `AutocompleteSignal { suggestionsCount, suggestions, hasKeyword, position }`, écriture dans `keyword_metrics.autocomplete_suggestions`. La table `keyword_autocomplete` n'est écrite par aucun code (`keyword-serp.service.ts` — `upsertAutocomplete` sans appelant). La fraîcheur (24 h / 30 min) se lit sur `keyword_metrics.fetched_at`, remise à jour par toute écriture de la ligne (KPI, PAA, écart de contenu).
- **Groupe :** A (adresse, forme, stockage) ; C (fraîcheur partagée, table orpheline — domaine Infrastructure)
- **Tranché :** `design.md` décrit le code ; les durées restent l'intention, avec la réserve consignée.

#### 26. Tavily absent du PRD — nouvel identifiant
- **Où :** `prd.md` §8.13 ne cite pas Tavily ; `.env.example` — « Tavily API (content gap analysis) ».
- **Code :** `content-gap.service.ts` — `searchWithTavily` (`search_depth: 'advanced'`, `max_results: 5`), requis par `analyzeContentGap`.
- **Groupe :** B
- **Tranché :** nouvel identifiant **FR-EXT-TAVILY** (active).

#### 27. Coût des tests — nouvel identifiant
- **Où :** aucune exigence ; comportement décrit dans la mémoire du projet et les commentaires de `tests/helpers/global-runtime-mode.ts`.
- **Code :** `global-runtime-mode.ts` (`globalSetup` de `vitest.config.ts`), `api-client.ts` — `isServerUp`, `browser-e2e/helpers/runtime-mode.ts` — `setMockMode`, `.github/workflows/ci.yml`, drapeaux `TESTS_REELS`, `PARCOURS_REEL`, `auto:article --mode=real`.
- **Groupe :** B
- **Tranché :** nouvel identifiant **FR-EXT-TESTS-NO-COST** (active).

### Composants UI partagés

#### 28. Carte radar : contextes, anneau, rôle de `cardContext`
- **Où :** `prd.md` (FR-UI-RADAR-CARD) — « scans de la phase Discovery », « vue diagnostique d'un mot-clé radar », anneau propre au mode Pertinence ; `design-registry.md` — AC.UIRADAR.2 « `displayMode` est la seule façon de basculer le score affiché », numéros de lignes.
- **Code :** `DouleurScannerResults.vue` (cartes à cocher) est monté par `RadarPanel.vue`, onglet Radar ; Discovery n'a pas de carte radar. `RadarKeywordCard.vue` monte `RadarCardScoreRing` dans les deux modes (libellé « Score KPI » / « Score Pertinence »). `cardContext='capitaine'` (mode libre du Capitaine seulement) change la valeur PAA.
- **Groupe :** A
- **Tranché :** trois usages : Radar, liste du Capitaine, fiche du Capitaine en mode libre.

#### 29. Pas de test de cohérence entre contextes pour la carte
- **Où :** `design-registry.md` (DESIGN-UI-RADAR-CARD) — « Test architectural : à ajouter ».
- **Code :** seuls des tests par enveloppe existent (`radar-card-checkable.test.ts`, `radar-card-lockable*.test.ts`).
- **Groupe :** D
- **Tranché :** consigné dans `design.md`.

#### 30. Panneaux IA du Lexique et des Lieutenants montés sous condition
- **Où :** `prd.md` (FR-UI-AI-PANELS-PATTERN) — « visibles en permanence quand leur onglet est ouvert », exemple « Verrouille d'abord ton Capitaine pour extraire le lexique » ; `design-registry.md` — « Discovery / Lexique / Lieutenants conformes ».
- **Code :** `LexiquePanel.vue` — `<LexiqueAiPanel v-if="tfidfResult">` ; `LieutenantsResultsLayout.vue` — conteneur `v-if="serpResult || lieutenantCards.length > 0"`. Le message cité n'existe pas. `ai-panels-persistence.test.ts` ne lit que le fichier du panneau, pas son parent.
- **Groupe :** C
- **Tranché :** FR-UI-AI-PANELS-PATTERN « non tenue ».

#### 31. Panneau « Analyse IA du Brief » hors modèle
- **Où :** `prd.md` (FR-UI-AI-PANELS-PATTERN, « Limites connues ») ; `ai-panels-persistence.test.ts` — `it.skip`.
- **Code :** `ArticleWorkflowIaBrief.vue` — props `parsedBriefMarkdown`, `iaBriefStreaming`, bouton « Relancer l'analyse », pas d'état erreur.
- **Groupe :** D
- **Tranché :** cause de « non tenue », déjà connue.

#### 32. Avis du Capitaine lié à la carte sélectionnée
- **Où :** `prd.md` (FR-UI-AI-PANELS-PATTERN) — panneau présent dès l'arrivée ; `docs/ui-sections-guide.md` §13.4 — D1 « Capitaine reste en sidepanel, exception assumée ».
- **Code :** `CaptainSidePanel.vue` — `<aside v-if="entry !== null">` : le panneau « Avis expert IA » n'existe qu'avec une carte sélectionnée.
- **Groupe :** B
- **Tranché :** en faveur du code : l'avis suit la carte ; critère ajouté à l'exigence.

#### 33. Panneaux repliés par défaut ; briques inutilisées
- **Où :** `prd.md` — « présent dès l'arrivée sur l'onglet, sans avoir à cliquer », « bouton désactivé avec un texte d'invitation » ; `design-registry.md` — `AiSuggestionList` rend le variant `suggestion`, chaque panel orchestre son fetch via `useAiPanel`, prop `hideUntilTriggered`.
- **Code :** `AiPanel.vue` — `defaultCollapsed: true` (aucun écran ne le change) : le bouton et l'invitation n'apparaissent qu'une fois l'en-tête déplié ; `hideUntilTriggered` déclarée sans effet. `AiSuggestionList.vue` et `useAiPanel()` ne sont utilisés par aucun écran.
- **Groupe :** B (repli) ; A (briques)
- **Tranché :** en faveur du code : en-tête toujours visible, corps replié avec « Cliquez pour lancer l'analyse IA. ».

#### 34. « Suggestions IA Radar » sans IA
- **Où :** `design-registry.md` (DESIGN-UI-AI-PANELS-PATTERN) — Radar, variant `suggestion`, FR-RAD-AI-LONGTAIL.
- **Code :** `RadarAiPanel.vue` — tri local `useRadarRanking({ topN: 5 })`, aucun appel, pas d'état en cours ni erreur ; `RadarPanel.vue` — « Aucun appel IA ici ».
- **Groupe :** D (`ui-sections-guide.md` §13.4, D3)
- **Tranché :** décrit comme un classement local.

#### 35. Briques de rédaction propres à une vue ; route de la vue guidée
- **Où :** `prd.md` (FR-UI-ARTICLE-SHARED) — badges de coût, compteur de mots, messages d'erreur « identiques » dans les deux vues, « pas de toolbar avec deux toggles en moins » ; `design-registry.md` — route `/cocoon/:cocoonId/redaction?articleId=...`.
- **Code :** `ArticleWorkflowView.vue` seule monte `ArticleCostBadges` et `ArticleWordCountBar` ; `ArticleEditorView.vue` seule monte `ArticleEditorActionOverlays` ; `ArticlePanelsToolbar` : « Blocs » (éditeur) ou « IA Brief » (vue guidée). `src/router/index.ts` — `/cocoon/:cocoonId/article/:articleId` → `ArticleWorkflowView` ; `/cocoon/:cocoonId/redaction` → `RedactionView`.
- **Groupe :** B (répartition) ; A (route)
- **Tranché :** en faveur du code : tableau des briques communes et propres dans l'exigence et la spécification.

#### 36. Briques du Moteur : bandeau retiré, points, panneau de cache
- **Où :** `prd.md` (FR-UI-MOTEUR-SHARED) — « bannière de transition Phase ② → ③ », « dots de progression dans l'en-tête du Moteur », « 142 mots-clés en cache pour cet article — Vider » ; `docs/ui-sections-guide.md` §3.2 — lignes `BasketStrip`, `BasketFloatingPanel`, `SelectedArticlePanel`.
- **Code :** aucun `PhaseTransitionBanner` (supprimé) ; `ProgressDots` est monté par article dans `MoteurContextRecap`, lui-même aussi présent dans `RedactionView` ; `TabCachePanel` affiche des pastilles « DB » / « C » et « Vider le cache » ; pas de panier ni de `SelectedArticlePanel`.
- **Groupe :** A
- **Tranché :** critère « bannière » retiré (table « Retirées ») ; description du code.

## Infrastructure transversale

*38 écarts — A 18, B 6, C 9, D 5*


#### 1. Les tests lisent `prd.md` et `design-registry.md` : la consolidation les casse
- **Où :** `tests/unit/coherence/prd-tables-matrix.test.ts` (lit la matrice « ### 8.14.bis » de `prd.md`, jusqu'à « ### 8.15 ») ; `tests/unit/architecture/requirements-trace.test.ts` (dans `npm run verify` : tout ID cité par un test doit exister dans `prd.md` ou `design-registry.md`) ; `db-tables-coverage.test.ts`, `kpi-nullable.test.ts` et d'autres citent les chemins.
- **Code :** `getMatrixTables` cherche `### 8.14.bis` dans `_bmad-output/planning-artifacts/prd.md` ; `isTraced` lit `prd.md` pour FR/NFR et `design-registry.md` pour DESIGN.
- **Groupe :** D
- **Tranché :** la matrice vit désormais dans `design.md` (« Matrice tables ↔ exigences »). Tant que les deux tests ne sont pas redirigés vers `spec/requirements.md` et `design/design.md`, les anciens fichiers doivent rester en place. À signaler à l'assembleur.

#### 2. La matrice §8.14.bis cite une vingtaine d'exigences qui n'existent pas
- **Où :** `prd.md` §8.14.bis — `FR-CAP-CARDS`, `FR-CAP-LOCK`, `FR-CAP-LOCAL-ANCHORING`, `FR-DIS-LOAD`, `FR-EXP-COUNTS`, `FR-EXT-DATAFORSEO-CACHE`, `FR-EXT-PAA-CACHE`, `FR-LEX-EXPLORATION`, `FR-LEX-PERSIST`, `FR-LEX-RECOMMEND`, `FR-LIE-PERSIST`, `FR-LIE-PROPOSE`, `FR-LIE-SELECT`, `FR-MOT-INTENT-ANALYSIS`, `FR-RAD-CARDS`, `FR-RAD-LONGTAIL-PERSIST`, `FR-RED-CONTENT-GAP`, `FR-RED-EDITOR-LOAD`, `FR-RED-EDITOR-PERSIST`, `FR-RED-PROMPT-CONTEXT`, `FR-RED-INTERNAL-LINKS`, `FR-FIN-*`, `FR-RED-*` (jokers). Aussi dans `FR-INFRA-LIEUTENANT-EXPLORATIONS` (« Voir aussi : FR-LIE-PROPOSE, FR-LIE-SELECT, FR-LIE-PERSIST »).
- **Code :** sans objet (aucun titre `#### <ID>` dans `prd.md`).
- **Groupe :** A
- **Tranché :** la nouvelle matrice ne cite que des ID existants : `FR-MOT-EXPLORATION-COUNTS` (compteurs), `FR-EXT-DATAFORSEO`, `FR-LIE-PROPOSE-AI`, `FR-LIE-CHECKBOX-LOCK-IMMEDIATE`, `FR-LEX-TFIDF`, `FR-LEX-AI-PANEL`, `FR-LEX-SELECT`, `FR-RAD-LONGTAIL-GENERATE`, `FR-RED-EDITOR-TIPTAP`, `FR-EXP-CONTENT-GAP`, `FR-DIS-CACHE`, `FR-CAP-LOCK-GATE`, `FR-CAP-RELEVANCE-LIVE`… ; une capacité sans ID est décrite en clair.

#### 3. `keyword_autocomplete` est une table morte
- **Où :** `prd.md` §8.14.bis — producteur `FR-RAD-PERSIST`, consommateurs `FR-RAD-CARDS`, `FR-CAP-CARDS`, « TTL 1j (30 min si vide) » ; `keyword-radar.service.ts` (commentaire « cross-article via keyword_autocomplete »).
- **Code :** `keyword-serp.service.ts` — `upsertAutocomplete` et `getAutocomplete` n'ont aucun appelant ; l'autocomplétion est écrite dans `keyword_metrics.autocomplete_suggestions` (`upsertKeywordAutocomplete`).
- **Groupe :** C
- **Tranché :** `design.md` la décrit comme table morte (comme `keyword_intent_analyses`). Dette : la supprimer ou la brancher, puis retirer ses deux fonctions. Constat recoupé par le lot L6 (Intégrations).

#### 4. Le référentiel local n'alimente ni un « ancrage local » ni l'analyse d'écart
- **Où :** `prd.md` FR-INFRA-LOCAL-ENTITIES (« utilisé par le scoring ancrage local du Capitaine + le brief content gap » ; critère « consomment exactement le même référentiel ») ; matrice (`FR-CAP-LOCAL-ANCHORING`, `FR-RED-CONTENT-GAP`).
- **Code :** `local-entities.service.ts` — `scoreLocalAnchoring` exporté sans appelant ; `getEntities` n'est lu que par `loadZoneContext` (repères des prompts). `content-gap.service.ts` ne lit que la zone (`loadZoneContext().zone`), pas les entités.
- **Groupe :** A (et C pour le code mort)
- **Tranché :** l'exigence décrit le seul usage réel : les repères locaux des consignes, triés par zone. `scoreLocalAnchoring` est du code mort à retirer ou à rebrancher.

#### 5. Le cache générique n'a plus les types que la doc liste
- **Où :** `design-registry.md` DESIGN-INFRA-API-CACHE (« `paa`, `serp`, `radar`, `discovery`, `autocomplete`, `intent`, `longtail` ») et DESIGN-INFRA-EXTERNAL-API-CACHE (« `dataforseo`, `gsc`, `radar`, `long-tail-suggest`, `suggest`, `keyword-discovery`, `intent`, `community-discussions`, `validate`, `autocomplete` »).
- **Code :** types écrits : `dataforseo`, `serp-top`, `radar`, `long-tail-suggest`, `keyword-discovery`, `discussions`, `validation`, `gsc`, `suggest`. `DELETE /articles/:id/external-cache` (`article-explorations.routes.ts`) vide `autocomplete`, `autocomplete-intent`, `paa`, `serp`, `validate` — que plus personne n'écrit ; `GET` lit `autocomplete`, jamais écrit.
- **Groupe :** A pour la liste, C pour la purge par article
- **Tranché :** `design.md` donne la liste réelle avec TTL et producteur. Dette : la purge par article du bouton « Vider le cache externe » ne vide rien d'utile.

#### 6. `getOrFetch` existe désormais
- **Où :** `design-registry.md` DESIGN-INFRA-GET-OR-FETCH (« pas helper centralisé — cf. DRIFT-009 », « pattern dupliqué assumé »).
- **Code :** `cache-helpers.ts` — `getOrFetch(type, key, ttlMs, fetcher)`, utilisé par `suggest.service`, `keyword-discovery.service`, `community-discussions.service`, `keyword-measure.service`. D'autres services gardent `getCached`/`setCached` à la main (brief, radar, longue traîne, GSC, validation).
- **Groupe :** A
- **Tranché :** le helper est décrit ; l'exigence demande la cascade, pas l'usage exclusif du helper.

#### 7. Une seule date de fraîcheur pour toutes les mesures d'un mot-clé
- **Où :** `prd.md` FR-INFRA-KEYWORD-METRICS (« fraîcheur 7 jours »), FR-INFRA-PAA-CACHE (« fenêtre de fraîcheur »).
- **Code :** `keyword_metrics.fetched_at` unique ; `upsertKeywordKpis`, `upsertKeywordAutocomplete`, `upsertKeywordPaa`, `upsertKeywordLocalAnalysis`, `upsertKeywordContentGap`, `upsertKeywordLocalComparison` le remettent tous à `NOW()`.
- **Groupe :** C
- **Tranché :** comportement décrit dans `design.md`. Dette : écrire des PAA ou une analyse locale rend « frais » des KPI de plus de 7 jours (et inversement). Constat recoupé par le lot L6 (Intégrations).

#### 8. Cache PAA : une liste vide n'est pas gardée 30 minutes
- **Où :** `design-registry.md` DESIGN-INFRA-PAA-CACHE (« freshness 1 jour (non-empty) / 30 min (empty) ») ; commentaire de `paa-cache.service.ts`.
- **Code :** `readPaaCache` renvoie `null` dès que `paaQuestions.length === 0` : une liste vide n'est jamais servie.
- **Groupe :** A
- **Tranché :** une liste vide déclenche un nouvel appel à chaque demande.

#### 9. Annuler un flux n'arrête pas le serveur
- **Où :** `prd.md` FR-INFRA-API-STREAM (« sans laisser de requête zombie côté serveur ») ; DESIGN-INFRA-API-STREAM (« Abort propre : `AbortSignal` propagé, le serveur ne reste pas suspendu »).
- **Code :** `apiStream` passe `signal` au `fetch` et rend `{ aborted: true }` ; aucune route SSE n'écoute `req.on('close')` : `consumeStream` va au bout de la génération.
- **Groupe :** C
- **Tranché :** FR-INFRA-API-STREAM « non tenue ».

#### 10. Pas de sentinelle `[DONE]`
- **Où :** DESIGN-INFRA-API-STREAM (« Sentinel `[DONE]` … avant fermeture EventSource »).
- **Code :** fin signalée par l'événement SSE `done` (avec `usage`) ; lecture par `fetch` + `ReadableStream`, pas `EventSource`. Côté serveur, `USAGE_SENTINEL` sépare l'usage dans le flux du fournisseur.
- **Groupe :** A
- **Tranché :** `design.md` décrit les événements `chunk`, `section-start`, `section-done`, `done`, `error`.

#### 11. Des routes lisent leur requête sans schéma
- **Où :** `prd.md` FR-INFRA-ZOD-SHARED (« Toutes les routes … valident leur entrée via un schéma partagé ») ; DESIGN-INFRA-ZOD-SHARED (« 13 fichiers »).
- **Code :** 25 occurrences de `req.body as …` dans 7 fichiers (`keywords.routes.ts`, `keyword-ai-panel.routes.ts`, `keyword-scan.routes.ts`, `serp-analysis.routes.ts`, `silos.routes.ts`, `generate/brief-explain.routes.ts`, `generate/micro-context-suggest.routes.ts`) ; 29 `safeParse(req.body…)` ; `shared/schemas/` compte 15 fichiers.
- **Groupe :** C (A pour le compte)
- **Tranché :** FR-INFRA-ZOD-SHARED « non tenue ».

#### 12. Le gestionnaire d'erreurs n'est pas central
- **Où :** `prd.md` FR-INFRA-ERROR-HANDLER (« Toutes les erreurs serveur passent par un middleware central »).
- **Code :** `errorHandler` n'est atteint que par `next(err)` (`dataforseo.routes.ts`) ou une erreur non interceptée ; `respondWithError` (même traduction) sert 4 fichiers de routes ; 118 `status(500)` écrits à la main ailleurs.
- **Groupe :** C
- **Tranché :** FR-INFRA-ERROR-HANDLER « non tenue » ; `specification.md` dit où la traduction s'applique.

#### 13. Erreurs connues : dans la pile d'activité, pas en toast ; plafond de dépense absent
- **Où :** `prd.md` FR-INFRA-API-WRAPPER (« toast explicite »), FR-INFRA-ERROR-HANDLER (« que le front traduit en toast lisible »).
- **Code :** `reportKnownError` → `useCostLogStore().addMessage('error', …)` ; `KNOWN_ERROR_CODES` n'a pas `DATAFORSEO_COST_BUDGET`.
- **Groupe :** A (toast), C (plafond non signalé dans la pile)
- **Tranché :** le message va dans la pile « Coûts API ». Dette : ajouter `DATAFORSEO_COST_BUDGET`.

#### 14. La pile d'activité ne voit que six routes en base
- **Où :** `prd.md` FR-INFRA-COST-LOG-STORE (« Chaque opération DB significative alimente la pile ») ; DESIGN-INFRA-COST-LOG-STORE (« composant … à confirmer », « header AUTHORITY à ajouter »).
- **Code :** `dbOps` renvoyés seulement par les routes mots-clés d'article et explorations Capitaine / Lieutenants ; `server/middleware/db-telemetry.middleware.ts` n'est pas monté dans `server/index.ts` ; affichage `CostLogPanel.vue` ; `cost-log.store.ts` sans en-tête `AUTHORITY:`.
- **Groupe :** C (A pour le composant)
- **Tranché :** FR-INFRA-COST-LOG-STORE « non tenue ». Piste : monter le middleware.

#### 15. La bascule MOCK/RÉEL ne se resynchronise qu'au chargement
- **Où :** `prd.md` FR-INFRA-RUNTIME-MODE (« Si le serveur a redémarré entre deux interactions, l'app re-pousse silencieusement… » ; « pas de divergence entre badge et comportement »).
- **Code :** `useRuntimeModeStore.hydrate` compare le `localStorage` au serveur, appelé une fois au montage d'`AppNavbar.vue` ; `npm run dev:server` redémarre à chaque modification (`--watch`).
- **Groupe :** C
- **Tranché :** FR-INFRA-RUNTIME-MODE « non tenue ».

#### 16. « RÉEL » force Claude
- **Où :** `prd.md` FR-INFRA-RUNTIME-MODE (« reprendre l'usage réel en un clic »).
- **Code :** `getProvider` : override `real` → `claude`, même si `.env` choisit `gemini` ou `openrouter`.
- **Groupe :** B
- **Tranché :** en faveur du code : « RÉEL » = Claude avec repli ; documenté dans `specification.md`.

#### 17. Les indicateurs des mots-clés associés valent encore 0
- **Où :** `prd.md` FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-DISPLAY-DASH.
- **Code :** `dataforseo/keywords.ts` — `fetchRelatedKeywords` et suggestions : `?? 0` sous `eslint-disable` (« à migrer avec FR-INFRA-KPI-NULLABLE côté Rédaction ») ; `RelatedKeyword` non nullable ; `DataForSeoPanel.vue` affiche `toFixed(2) €`.
- **Groupe :** D
- **Tranché :** FR-INFRA-KPI-NULLABLE « non tenue », écart déclaré.

#### 18. Des écrans formatent les indicateurs à la main
- **Où :** `prd.md` FR-INFRA-KPI-DISPLAY-DASH (« Tout consommateur … passe par les helpers ») ; DESIGN-INFRA-KPI-DISPLAY-DASH (« aucun composant ne formate à la main »).
- **Code :** `DataForSeoPanel.vue`, `CaptainSidePanel.vue` (« — » écrit à la main), `DiscoverySourcesList.vue` (étiquette masquée si absente).
- **Groupe :** C
- **Tranché :** FR-INFRA-KPI-DISPLAY-DASH « non tenue ».

#### 19. Une valeur absente reste en bas, même en tri croissant
- **Où :** `prd.md` FR-INFRA-KPI-CONSISTENCY (« en bas d'une liste descendante (et en haut d'une liste ascendante) ») ; DESIGN-INFRA-SCORE-MODULE (`compareScoresAscNullsLast`).
- **Code :** `compareScores` et `compareScoresAsc` mettent `null` en bas dans les deux sens ; `compareScoresAscNullsLast` n'existe pas.
- **Groupe :** B
- **Tranché :** en faveur du code (« — » toujours en bas, signal cohérent) ; critère réécrit.

#### 20. Agrégats et indices qui retombent sur 0
- **Où :** `prd.md` FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-SCORING-NULLSAFE (« `opportunityIndex` sur volume null → null »).
- **Code :** `getCocoonKeywordMetrics` (`keyword-queries.service.ts`) : `avgKD` divisé par le nombre de volumes connus, `0` sans donnée (route sans consommateur à l'écran) ; `opportunityIndex` n'est plus calculé nulle part, `useOpportunityScore` fait `?? 0`.
- **Groupe :** C
- **Tranché :** exigences maintenues ; dette signalée dans `design.md`.

#### 21. Le verdict serveur de validation s'appelle « incertaine », pas GRAY
- **Où :** DESIGN-INFRA-KPI-SCORING-NULLSAFE (AC.NULLSCORE.3 : `computeServerVerdict(…) → 'GRAY'`) ; « `shared/scoring.ts` ou `shared/kpi-scoring.ts` ».
- **Code :** `computeServerVerdict` (`keywords.routes.ts`) rend la catégorie `incertaine` ; `GRAY` vient de `computeVerdict` (`shared/kpi-scoring.ts`) ; `computeCompositeScore` / `generateAlerts` sont dans `server/services/external/dataforseo/scoring.ts`.
- **Groupe :** A
- **Tranché :** `design.md` cite les bons emplacements.

#### 22. La règle anti-« ?? 0 » couvre les KPI, et ne casse pas le build
- **Où :** DESIGN-INFRA-NO-SCORE-FALLBACK (« cible Score uniquement … cf. DRIFT-019 ») ; `prd.md` FR-INFRA-NO-SCORE-FALLBACK (« casse le build »).
- **Code :** `eslint.config.ts` — 5 sélecteurs, motif `Score|Volume|Difficulty|Cpc|Competition|Density`. ESLint tourne au pre-commit (`lint-staged`), dans `verify:full` et `check:health` ; ni dans `npm run build`, ni dans `npm run verify` (oxlint), ni en CI.
- **Groupe :** A
- **Tranché :** « refusé au commit et par l'audit complet ».

#### 23. `check:health` et `verify`
- **Où :** `prd.md` FR-INFRA-CHECK-HEALTH (« doit passer verte avant tout merge significatif ») ; `.claude/CLAUDE.md` et le modèle de PR (`npm run verify`).
- **Code :** `verify` (oxlint, types, tests purs, audit du contenu, `db:check`) est le filet des livraisons ; `check:health` existe (lint avec `--fix`, donc il modifie des fichiers).
- **Groupe :** B
- **Tranché :** les deux commandes sont décrites ; l'exigence ne porte que sur l'enchaînement et l'échec en cascade. Le filet de livraison relève du domaine « cadre ».

#### 24. Point de santé : qui l'attend
- **Où :** `prd.md` FR-INFRA-HEALTH-CHECK (« scripts `predev`, `pretest` » ; « moins de 100 ms ») ; DESIGN-INFRA-HEALTH-CHECK.
- **Code :** seule la CI attend `/api/health` (`curl` en boucle) ; `predev` lance `db:check` ; Playwright attend le port ; aucune mesure de temps.
- **Groupe :** A
- **Tranché :** critère « répond ok sans accès à la base » ; le seuil de 100 ms est retiré.

#### 25. Stratégie du cocon : pas « tous » les prompts
- **Où :** `prd.md` FR-INFRA-COCOON-STRATEGIES (« Tout prompt IA généré pour un article du cocon est enrichi ») ; DESIGN-INFRA-COCOON-STRATEGIES (« injecté dans `{{cocoon_strategy_context}}` »).
- **Code :** globale `{{strategy_context}}` (appels avec `cocoonSlug`) ou variable `{{strategyContext}}` (`pickStrategyContext`) ; ni les actions contextuelles, ni la méta, ni la relecture de la langue ne la reçoivent ; les panneaux du Moteur seulement si l'écran envoie `cocoonSlug`.
- **Groupe :** B (A pour le nom de variable)
- **Tranché :** en faveur du code : la liste des consignes qui la reçoivent est écrite dans l'exigence.

#### 26. Micro-contexte : trois consignes, pas « toute génération »
- **Où :** `prd.md` FR-INFRA-MICRO-CONTEXTS ; DESIGN-INFRA-MICRO-CONTEXTS (« `GET/POST` », numéros de ligne).
- **Code :** sommaire (`outline.routes.ts`, bloc en ligne), explication du brief (`brief-explain.routes.ts`), premier jet (`buildMicroContextBlock`, seul à porter la longueur) ; rien sans angle ; route `PUT /articles/:id/micro-context` ; `saveArticleMicroContext` valide après l'écriture et ne met pas `updated_at` à jour.
- **Groupe :** B (A pour la route ; C pour la validation tardive)
- **Tranché :** en faveur du code : périmètre écrit dans l'exigence.

#### 27. Pool de mots-clés : routes, statuts, doublon au remplacement
- **Où :** DESIGN-INFRA-KEYWORDS-SEO (`GET /api/keywords/cocoon/:name`, statuts `suggested, validated, discarded`) ; `prd.md` FR-INFRA-KEYWORDS-SEO (« Un même mot-clé ne peut viser qu'un seul cocon »).
- **Code :** `GET /api/keywords/:cocoon` ; `KeywordStatus = 'suggested' | 'validated' | 'rejected'` ; `addKeyword` refuse le doublon (409), `replaceKeyword` (PUT) ne vérifie pas.
- **Groupe :** A (routes, statuts), C (remplacement)
- **Tranché :** FR-INFRA-KEYWORDS-SEO « non tenue ».

#### 28. Statuts des lieutenants
- **Où :** `prd.md` FR-INFRA-LIEUTENANT-EXPLORATIONS (« proposé, sélectionné, écarté ») ; DESIGN (`suggested`, `selected`, `discarded`).
- **Code :** `LieutenantKeywordStatus = 'suggested' | 'locked' | 'eliminated' | 'archived'` ; `archiveLieutenantExplorations`.
- **Groupe :** A
- **Tranché :** proposé, verrouillé, écarté, archivé.

#### 29. Découverte : routes, expiration, analyse IA
- **Où :** `prd.md` FR-INFRA-KEYWORD-DISCOVERIES (« fraîcheur de 30 jours ») ; DESIGN-INFRA-KEYWORD-DISCOVERIES (routes `/api/keywords/discovery/cache/*`, `getDiscoveryCache`, découplage `sources_json` / `ai_analysis_json`).
- **Code :** routes `/api/discovery-cache/check|load|save` + `DELETE /api/discovery-cache` ; `checkCache` / `loadCache` n'appliquent aucune expiration (`expiresAt` écrit, jamais lu ; `isKeywordDiscoveryFresh` sans appelant) ; analyse IA rangée dans `sources_json`, `saveKeywordDiscoveryAiAnalysis` sans appelant ; « Rafraichir » = effacer.
- **Groupe :** B (A pour les noms)
- **Tranché :** en faveur du code : la découverte reste disponible jusqu'au rafraîchissement, la date aide à juger.

#### 30. Stratégie d'article : routes et fonctions
- **Où :** DESIGN-INFRA-ARTICLE-STRATEGIES (`GET/POST /api/articles/:id/strategy`, `getArticleStrategy`, `saveArticleStrategy`).
- **Code :** `GET/PUT /api/strategy/:id`, `getStrategy`, `saveStrategy`.
- **Groupe :** A
- **Tranché :** noms du code dans `design.md`.

#### 31. L'alarme ne se ferme pas au clic extérieur ; le titre élide
- **Où :** DESIGN-INFRA-GATE-WAIVER (« Échap et clic sur le fond = Revenir corriger » ; « sans élision : Avant de accepter le premier jet »).
- **Code :** `GateAlarm.vue` — Échap annule, pas de gestionnaire sur le fond (volontaire : « une raison en cours de saisie ne se perd pas ») ; `gateTitle` produit « Avant d'accepter le premier jet ».
- **Groupe :** A
- **Tranché :** comportement du code dans `specification.md`.

#### 32. Page en erreur au relevé : texte vide, pas `null`
- **Où :** DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE (« `text_content = null` »).
- **Code :** `fetchAndPersist` enregistre `textContent: ''` et `headings: []`.
- **Groupe :** A
- **Tranché :** texte vide.

#### 33. `article_content` ne porte pas la méta
- **Où :** `prd.md` §8.14.bis (`article_content` : « TipTap doc + meta-tags »).
- **Code :** `schema.sql` — `article_content(outline, content)` ; `meta_title`, `meta_description`, `seo_score`, `geo_score` sur `articles` (`article-content.service.ts`).
- **Groupe :** A
- **Tranché :** corrigé dans la matrice.

#### 34. FR-INFRA-INTENT-EXPLORATIONS-LEGACY est soldée
- **Où :** `prd.md` FR-INFRA-INTENT-EXPLORATIONS-LEGACY (« une migration DROP doit être ajoutée », « commentaire à ajuster »).
- **Code :** la table n'est ni dans `schema.sql` ni dans `bootstrap.sql` (seul schéma rejoué, par la CI) ; les migrations sont archivées ; `keyword-queries.service.ts` explique la suppression (migration 016) ; `prd-tables-matrix.test.ts` vérifie l'absence.
- **Groupe :** D
- **Tranché :** rangée dans « Retirées » (soldée).

#### 35. La doc des data-flows ne connaît que le préfixe `moteur:`
- **Où :** `docs/data-flows/README.md` (« Préfixe de check utilisé dans ce projet : `moteur:` »).
- **Code :** `workflow-checks.constants.ts` — `REDACTION_DRAFT_ACCEPTED = 'redaction:draft_accepted'` ; `writeCheckRegex` l'accepte.
- **Groupe :** A
- **Tranché :** sept étapes, dont une de la Rédaction.

#### 36. Tests de cohérence hors de `npm run verify`
- **Où :** `prd.md` FR-INFRA-TYPE-RULES-SSOT, FR-INFRA-PROMPT-LAYERS (« un test échoue »), §8.14.bis (« le test échoue sur toute table non documentée »).
- **Code :** `vitest.verify.config.ts` n'inclut pas `tests/unit/coherence/` (`type-rules-ssot`, `prompts-no-hardcoded`, `prd-tables-matrix`, `db-tables-coverage`) : ils tournent en CI (`vitest run tests/unit`) et dans `test:unit`. `prompt-variables`, `prompts-reference`, `db-bootstrap-sync`, `requirements-trace` sont, eux, dans `verify`.
- **Groupe :** D
- **Tranché :** l'exigence dit « un test échoue » sans préciser la commande ; `design.md` dit où chaque test tourne.

#### 37. ID cités par les tests mais absents du PRD
- **Où :** `tests/unit/architecture/requirements-trace.test.ts` — `LEGACY_ORPHANS` : `FR-INFRA-AI-FALLBACK-CONFIG`, `FR-INFRA-KPI`, `FR-INFRA-SSE-EVENT-PERSISTANT` (parmi 27).
- **Code :** liste figée, qui ne peut que baisser.
- **Groupe :** D
- **Tranché :** non repris comme exigences (aucune définition) ; à rattacher à `FR-EXT-AI-FALLBACK`, `FR-INFRA-KPI-*`, `FR-INFRA-API-STREAM` quand les tests seront retouchés.

#### 38. Numéros de ligne et références périmées dans le registre
- **Où :** `design-registry.md` §8.14 (lignes de `schema.sql`, `data.service.ts`, `api.service.ts`, `_helpers.ts:338`…), route `server/routes/local.routes.ts` « si présente », pile d'activité « à confirmer dans `src/components/shared/` ».
- **Code :** lignes décalées ; pas de `local.routes.ts` ; la pile est `src/components/shared/CostLogPanel.vue` ; les pastilles sont `src/components/moteur/ProgressDots.vue` (filtre `MOTEUR_CHECKS`).
- **Groupe :** A
- **Tranché :** `design.md` cite fichiers et symboles, sans numéros de ligne.

## Qualités transverses (NFR)

*41 écarts — A 28, B 1, C 9, D 3*


#### 1. Version de Node
- **Où :** `prd.md` (NFR-RT-NODE) — « `^20.19.0 || >=22.12.0` » ; même valeur dans `.claude/CLAUDE.md` §8.
- **Code :** `package.json` — `engines.node: ">=24"` ; `.nvmrc` : `24` ; `@tsconfig/node24` ; la CI lit `.nvmrc`.
- **Groupe :** A
- **Tranché :** Node 24 ou plus.

#### 2. Version de Vitest
- **Où :** `prd.md` (NFR-RT-VITEST) — « 4.0.18 ».
- **Code :** `package.json` — `^4.0.18` ; verrou : 4.1.5.
- **Groupe :** A
- **Tranché :** Vitest 4 (4.1.5 installée).

#### 3. §9.7 et §9.8 en double dans le PRD
- **Où :** `prd.md` — §9.7 et §9.8 apparaissent deux fois : d'abord en « notes de sortie » (versions renvoyées à `architecture.md`, variables à `.env.example`), puis en tables `NFR-RT-*` / `NFR-CFG-*`. `design-registry.md` §9 dit ces sections « retirées du périmètre ».
- **Code :** sans objet.
- **Groupe :** A (doc ↔ doc)
- **Tranché :** les identifiants `NFR-RT-*` et `NFR-CFG-*` sont gardés (traçabilité) ; les valeurs exactes vont dans `design.md`.

#### 4. Valeur qui active le bac à sable DataForSEO
- **Où :** `prd.md` (NFR-CFG-DATAFORSEO-SANDBOX) — « `DATAFORSEO_SANDBOX=1` opt-in sandbox ».
- **Code :** `dataforseo/_client.ts` — `isSandbox` : `process.env.DATAFORSEO_SANDBOX === 'true'` ; même test dans `runtime-mode.service.ts` `getEffectiveMode`. Avec `=1`, les appels partent en production facturée.
- **Groupe :** A
- **Tranché :** seule la valeur exacte `true` active le bac à sable.

#### 5. Noms des variables du budget DataForSEO
- **Où :** `prd.md` (NFR-CFG-DATAFORSEO-BUDGET) — « `DATAFORSEO_COST_BUDGET`, `DATAFORSEO_COST_WINDOW_MINUTES` » (écart déjà noté DRIFT-022 dans le registre).
- **Code :** `dataforseo-cost-guard.ts` — `budgetUsd()` lit `DATAFORSEO_COST_BUDGET_USD`, `windowMs()` lit `DATAFORSEO_COST_WINDOW_MIN`.
- **Groupe :** A
- **Tranché :** `DATAFORSEO_COST_BUDGET_USD` et `DATAFORSEO_COST_WINDOW_MIN`.

#### 6. Variable du délai de rafraîchissement DataForSEO
- **Où :** `prd.md` (NFR-CFG-DATAFORSEO-REFRESH) — « `DATAFORSEO_REFRESH_DELAY_MS` ».
- **Code :** `dataforseo/cache.ts` — `getMinRefreshHours` lit `DATAFORSEO_MIN_REFRESH_HOURS` (heures) ; défaut `DEFAULT_MIN_REFRESH_HOURS` = 168, ou 0 si `NODE_ENV=development` ; ne concerne que l'audit des mots-clés d'un cocon.
- **Groupe :** A
- **Tranché :** délai en heures, `DATAFORSEO_MIN_REFRESH_HOURS`, pour l'audit seulement.

#### 7. Jeton Google Search Console : chemin fixe, fichier suivi par Git
- **Où :** `prd.md` (NFR-SEC-GSC-TOKENS) — « fichier local à un chemin configurable (variable d'env) », « filtres en place côté logger » ; (NFR-CFG-GSC-OAUTH) — « `GSC_TOKEN_PATH` » ; `design-registry.md` (DESIGN-SEC-GSC-TOKENS) — « Aucun log du contenu du token (filtre côté logger) ».
- **Code :** `gsc.service.ts` — `TOKEN_PATH = join(process.cwd(), 'data', 'gsc-token.json')`, aucune variable lue ; `server/utils/logger.ts` ne filtre rien (le jeton n'est simplement jamais passé au journal) ; `.gitignore` n'exclut pas `data/gsc-token.json` (`git check-ignore` ne le couvre pas).
- **Groupe :** C
- **Tranché :** NFR-SEC-GSC-TOKENS « non tenue » : chemin non réglable, fichier exposé à un `git add` ; la non-journalisation est tenue par construction, pas par filtre. NFR-CFG-GSC-OAUTH ne garde que les identifiants et l'adresse de retour.

#### 8. Accès limité à la machine locale
- **Où :** `prd.md` (NFR-SEC-CORS) — « Une autre machine sur le réseau, un navigateur ouvert sur une autre origine, un script externe ne peut pas appeler l'API ».
- **Code :** `server/index.ts` — le middleware CORS n'ajoute `Access-Control-Allow-Origin` que pour `http://localhost(:port)` mais traite toute requête ; `app.listen(PORT)` sans hôte écoute sur toutes les interfaces. `127.0.0.1` comme origine est refusé ; `PATCH` manque dans `Allow-Methods` (sans effet via le proxy Vite, même origine).
- **Groupe :** C
- **Tranché :** « non tenue » : seules les pages web d'une autre origine sont bloquées. Correctif possible : `app.listen(PORT, '127.0.0.1')`.

#### 9. Refus d'une requête trop volumineuse
- **Où :** `prd.md` (NFR-COST-BODY-LIMIT) — « refus immédiat avec message clair » ; `design-registry.md` (DESIGN-COST-BODY-LIMIT) — « Refus immédiat HTTP 413 ».
- **Code :** `server/index.ts` — `express.json({ limit: '5mb' })` ; `error-handler.ts` `errorHandler` ignore `err.status` et renvoie 500 `INTERNAL_ERROR` avec le message anglais du parseur (« request entity too large »). Même sort pour un JSON invalide (400 attendu).
- **Groupe :** C
- **Tranché :** « non tenue » : la limite existe, le refus est mal classé. Correctif : respecter `err.status`/`err.type` dans `errorHandler`.

#### 10. Arrêt d'une génération d'IA
- **Où :** `prd.md` (NFR-PERF-SSE-FIRST-TOKEN) — « L'utilisateur peut annuler le stream à tout moment via un bouton visible » ; `design-registry.md` (DESIGN-PERF-SSE-FIRST-TOKEN, AC.PERFSSE.2) — « `abort()` interrompt le stream serveur ET le rendu front sans zombie ».
- **Code :** arrêts exposés pour enrichissement, réduction, humanisation et panneaux du Capitaine ; aucun pour le premier jet (`ArticleActions.vue` : « Génération en cours... », bouton inactif). Aucune route de `server/routes/generate/` n'écoute `req.on('close')` : la génération continue chez le fournisseur.
- **Groupe :** C
- **Tranché :** « non tenue » ; la spécification décrit l'état réel (qui arrête quoi, et que le serveur continue).

#### 11. Durée de fraîcheur des mesures de mots-clés
- **Où :** `design-registry.md` (DESIGN-PERF-CACHE-HIT-RATE, AC.PERFCH.1) — « ligne fraîche (< 30 j) » ; (DESIGN-PERF-PURGE-HOURLY) — « Si `keyword_metrics.fetched_at` est > 30 j, le service refetch ».
- **Code :** `keyword-metrics.service.ts` — `isKeywordMetricsFresh(fetchedAt, ttlDays = 7)` ; `keyword-scan.routes.ts` `FRESHNESS_DAYS = 7` ; `paa-cache.service.ts` : 1 jour.
- **Groupe :** A
- **Tranché :** 7 jours (1 jour pour les PAA).

#### 12. Où vit l'analyse SERP
- **Où :** `design-registry.md` (DESIGN-INT-SERP-ONCE, blocs Refs/Persistance/AC.INTSO.1) — « `keyword_metrics(serp_raw_json JSONB)` réutilisé entre Lieutenants et Lexique » (le registre signale lui-même que son addendum C7 fait foi).
- **Code :** `server/db/schema.sql` — plus de colonne `serp_raw_json` ; `keyword-serp.service.ts` (`keyword_serp_results`, `keyword_serp_scrapes`), `scrape-corpus.service.ts` `fetchAndPersist` (cache mémoire 1 h, puis base 7 j).
- **Groupe :** A
- **Tranché :** tables `keyword_serp_results` + `keyword_serp_scrapes`, producteur unique `fetchAndPersist`.

#### 13. Interrupteur simulé / réel : persistance et badge
- **Où :** `design-registry.md` (DESIGN-COST-AI-MOCK) — « `src/components/shared/RuntimeModeBadge.vue` », « persisté en `runtime_mode` table », « badge (mock | real | sandbox) », « fixtures … DataForSEO » ; `runtime-mode.service.ts` cité comme « persisté en DB ».
- **Code :** pas de composant `RuntimeModeBadge.vue` ni de table `runtime_mode` ; `runtime-mode.service.ts` garde `overrideMode` en RAM ; `runtime-mode.store.ts` le retient en `localStorage` et le repousse au serveur ; bouton `MOCK` / `RÉEL` dans `AppNavbar.vue` ; DataForSEO n'est pas simulé mais envoyé au bac à sable.
- **Groupe :** A
- **Tranché :** état serveur volatile, mémoire côté navigateur, deux états affichés.

#### 14. Contenu du journal d'activité
- **Où :** `prd.md` (NFR-OBS-COST-LOG) — « événements API (provider, endpoint, durée, coût estimé) », « L'utilisateur peut filtrer » ; `design-registry.md` (DESIGN-OBS-COST-LOG) — « Plafond circulaire (N derniers événements) ».
- **Code :** `cost-log.store.ts` — liste sans plafond ; `CostLogPanel.vue` — entrées IA (modèle, jetons, coût, heure), entrées base, messages, jauge DataForSEO sondée toutes les 15 s ; « × » et « Effacer », pas de filtre ; les appels DataForSEO ne sont pas listés un par un.
- **Groupe :** A
- **Tranché :** la spécification décrit le panneau réel ; pas de filtre ni de plafond.

#### 15. Opérations en base rapportées « par toute réponse »
- **Où :** `prd.md` (NFR-OBS-DBOPS-TRACK) — « Toute réponse API expose un compteur d'opérations DB », « seuil de surveillance » ; `design-registry.md` — `server/utils/db-ops-tracker.ts (ou équivalent)`, « réinitialisé à chaque requête ».
- **Code :** `server/utils/db-telemetry.ts` `measureDb` utilisé par six routes de `keywords.routes.ts` ; `server/middleware/db-telemetry.middleware.ts` (`dbTelemetryMiddleware`, `patchPoolForTelemetry`) fait exactement la promesse, est testé, mais n'est pas monté dans `server/index.ts` ; aucun seuil.
- **Groupe :** C
- **Tranché :** « non tenue » ; monter le middleware tiendrait les deux premiers critères.

#### 16. Catalogue des erreurs connues
- **Où :** `prd.md` (NFR-OBS-KNOWN-ERRORS) — « catalogue partagé entre backend et frontend », « Une erreur inconnue retombe sur un message générique « Erreur technique — voir le journal d'activité » » ; `design-registry.md` — `shared/constants/known-errors.ts`, codes `BUDGET_EXCEEDED`, `PROVIDER_QUOTA`, `INVALID_KEYWORD` ; (DESIGN-COST-DATAFORSEO-RESERVE) — « le front affiche la notification dédiée ».
- **Code :** aucun fichier partagé ; `api.service.ts` `KNOWN_ERROR_CODES` ne connaît que `DATAFORSEO_QUOTA_EXCEEDED`, `AI_PROVIDER_QUOTA_EXCEEDED`, `AI_PROVIDER_OVERLOADED` — pas `DATAFORSEO_COST_BUDGET` renvoyé par `errorHandler` ; une erreur inconnue garde le message du serveur ou « Erreur HTTP <statut> ». Les codes cités par le registre n'existent pas.
- **Groupe :** C (budget non reconnu, pas de message générique) et A (noms et emplacement)
- **Tranché :** « non tenue » ; les codes réels sont listés dans `design.md`.

#### 17. Verbosité des journaux par module
- **Où :** `prd.md` (NFR-OBS-CONFIG) — « définir le niveau par module », « INFO partout » par défaut ; `design-registry.md` — `server/utils/logs.config.ts`.
- **Code :** `logs.config.ts` à la racine — un seul `level` (défaut `'DEBUG'`), `showTimestamp`, `showFilePath`, `emoji` ; pas de niveau par module.
- **Groupe :** C
- **Tranché :** « non tenue » ; la spécification décrit le réglage global.

#### 18. Format des lignes de journal
- **Où :** `design-registry.md` (DESIGN-OBS-LOGGER) — « `[timestamp] [level] [module] message` ».
- **Code :** `server/utils/logger.ts` `formatLog` — heure, `[NIVEAU]`, émoji, fichier:ligne (`getCallerInfo`), message.
- **Groupe :** A
- **Tranché :** fichier d'origine au lieu d'un nom de module.

#### 19. Vérification de la base au démarrage
- **Où :** `prd.md` (NFR-OBS-DB-CHECK) — « avant de commencer à servir », « s'arrêter (mode strict) ou continuer … comportement documenté » ; `design-registry.md` — `server/db/pool.ts`, « continuer ou s'arrêter selon flag ».
- **Code :** `server/index.ts` — `SELECT 1` dans le callback de `app.listen`, après l'ouverture ; échec journalisé avec `hint`, le serveur continue ; pas de drapeau ; pool dans `server/db/client.ts`.
- **Groupe :** A
- **Tranché :** test après ouverture, le serveur continue toujours.

#### 20. Validation des requêtes
- **Où :** `prd.md` (NFR-INT-ZOD-VALIDATION, NFR-SEC-ZOD-INPUT) — « Toutes les routes API valident leur input », 400 précis ; `design-registry.md` (DESIGN-INT-ZOD-VALIDATION) — « 13 fichiers », « `{ error: { issues: [...] } }` ».
- **Code :** `shared/schemas/` : 15 fichiers ; sur 87 handlers d'écriture, 32 `safeParse` (400 `VALIDATION_ERROR` + `message`), 28 contrôles manuels (400 `MISSING_PARAM`), `.parse` dans `strategy.routes.ts` et `silos.routes.ts` dont le `catch` renvoie 500 `INTERNAL_ERROR` ; des routes sans validation de corps (`intent-scan`, `keyword-ai-panel`, `radar-exploration`…).
- **Groupe :** C (500 sur entrée invalide, routes sans schéma) et A (format, compte)
- **Tranché :** « non tenue » pour les deux exigences.

#### 21. Portée de la neutralisation des contenus dans les prompts
- **Où :** `prd.md` (NFR-SEC-PROMPT-INJECTION) — « Les variables substituées (`{{strategy_context}}`, `{{painPoint}}`, `{{articleTitle}}`…) passent par un échappement systématique », « caractères de contrôle ».
- **Code :** `prompt-loader.ts` — `escapePromptContent` n'est appliqué qu'aux clés de `escapeKeys` ; `prompt-variables.test.ts` l'impose pour `selectedText`, `sectionHtml`, `articleHtml`, `articleContent`, `articleText`, `chapterHtml`, `instruction`. Il désamorce des séquences précises (tours `Human:`/`Assistant:`, `<system>`, `<user-content>`, `{{ }}`), pas les caractères de contrôle.
- **Groupe :** B
- **Tranché :** en faveur du code : seuls les contenus longs sont neutralisés. Les champs courts (titre, mot-clé, point de douleur) ne le sont pas ; à étendre si le cocon devient partagé.

#### 22. Magasin de progression : en-tête et mise à jour optimiste
- **Où :** `design-registry.md` (DESIGN-INT-COMPLETED-CHECKS-SSOT) — « header `AUTHORITY: PostgreSQL articles.completed_checks` », « Optimistic update … rollback Pinia ».
- **Code :** `article-progress.store.ts` — pas d'en-tête `AUTHORITY:` ; `addCheck`/`removeCheck` attendent la réponse du serveur avant de mettre `progressMap` à jour.
- **Groupe :** A (mécanique) et C (en-tête exigé par `.claude/CLAUDE.md` §3.2, absent)
- **Tranché :** mise à jour après confirmation du serveur ; l'en-tête reste à ajouter.

#### 23. Mode « libre » du Moteur
- **Où :** `prd.md` (NFR-INT-MOTEUR-BIMODAL) — composants Discovery, Radar, Capitaine, Lieutenants, Structure, Lexique paramétrés « workflow / libre (laboratoire de recherche) » ; le Labo est retiré (FR-LAB, REMOVED).
- **Code :** prop `mode` sur 5 panneaux (pas `LexiquePanel.vue`) ; `MoteurView.vue` ne passe que `mode="workflow"` ; les branches `mode === 'libre'` sont inatteignables.
- **Groupe :** A (texte) et C (code mort)
- **Tranché :** l'exigence devient « une étape, un composant » ; la spécification ne mentionne pas de mode libre.

#### 24. Nombre de domaines de rangement
- **Où :** `prd.md` (NFR-MAIN-ORG-COMPOSABLES) — 8 domaines ; (NFR-MAIN-ORG-SERVICES) — 7 ; `design-registry.md` (DESIGN-MAIN-ORG-STORES) — `external/` contiendrait `runtime-mode`, `cost-log`.
- **Code :** `src/composables/` : 9 dossiers (+ `strategy`) ; `server/services/` : 8 (+ `gates`) ; `src/stores/external/` = `gsc`, `local` ; `runtime-mode` et `cost-log` sont dans `ui/`.
- **Groupe :** A
- **Tranché :** 9 domaines de composables, 8 de services.

#### 25. Rejet automatique du code mort, des cycles et des violations d'architecture
- **Où :** `prd.md` (NFR-MAIN-TOOLING) — « Un commit qui introduit du code mort, un cycle d'imports ou une violation d'architecture est rejeté ou signalé » ; (NFR-MAIN-NO-CYCLES) — « Un commit qui introduit un cycle est rejeté » ; `design-registry.md` (AC.MAINTO.2, DESIGN-MAIN-NO-CYCLES) — « rejeté par le pre-commit (via `check:cycles`) » ; `knip.config.ts`.
- **Code :** `.husky/pre-commit` = `npx lint-staged` → `oxlint --fix`, `eslint --fix --cache` seulement ; `ci.yml` ne lance ni linters, ni `check:*` ; configuration knip dans `knip.json`.
- **Groupe :** C
- **Tranché :** NFR-MAIN-TOOLING « non tenue » ; NFR-MAIN-NO-CYCLES garde la détection manuelle (`check:cycles`, `check:arch`, `verify:full`, `check:health`).

#### 26. Couverture de la règle anti-zéro silencieux
- **Où :** `design-registry.md` (DESIGN-MAIN-NO-SCORE-FALLBACK) — « trois sélecteurs », « Couverture limitée à `[Ss]core` … (cf. DRIFT-019) ».
- **Code :** `eslint.config.ts` — 5 sélecteurs `no-restricted-syntax`, motif `[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity`, formes directes et chaînage optionnel.
- **Groupe :** A
- **Tranché :** règle étendue aux indicateurs de marché ; DRIFT-019 est soldé.

#### 27. Taille des fichiers
- **Où :** `prd.md` (NFR-MAIN-FILE-SIZE, §12.5) — `CaptainPanel.vue` 1509 L, `data.service.ts` 1052 L, `keywords.routes.ts` 912 L.
- **Code :** 1 614, 1 188 et 979 lignes ; 53 fichiers au-delà de 400.
- **Groupe :** A (chiffres), C (dette)
- **Tranché :** « non tenue », chiffres actuels dans `design.md`.

#### 28. Plafonds du cliquet des faux verts
- **Où :** `design-registry.md` (DESIGN-TEST-BEHAVIORAL) — « `itSkip` à 42 ».
- **Code :** `test-quality.test.ts` — `SOFT_LIMITS.itSkip: 1` (et `docs/testing-guide.md` §7.5 est juste).
- **Groupe :** A
- **Tranché :** 1.

#### 29. Critères encore ouverts des tests comportementaux
- **Où :** `prd.md` (NFR-TEST-BEHAVIORAL) — statut « livrée en partie » ; `design-registry.md` — « pour C5 à C8 ».
- **Code :** navigateur : 3 fichiers rechargent la page, aucun `page.goBack`, aucune panne simulée (`page.route`) ; aucun parcours ne passe le texte produit dans `shared/content-validators.ts` / `shared/seo-validators.ts`.
- **Groupe :** D
- **Tranché :** « non tenue » (critères 3 et 4 partiels), écart déjà assumé.

#### 30. Orphelins de traçabilité
- **Où :** `prd.md` / `design-registry.md` (NFR-MAIN-REQUIREMENTS-TRACE) — « 29 IDs orphelins ».
- **Code :** `requirements-trace.test.ts` — `LEGACY_ORPHANS` : 27.
- **Groupe :** A
- **Tranché :** 27.

#### 31. Chargement des vues
- **Où :** `design-registry.md` (DESIGN-PERF-VIEW-LOAD) — « les 13 autres vues sont des chunks lazy », « handler `chunkLoadError` qui propose un reload » ; `prd.md` — « un état d'attente discret est visible ».
- **Code :** `src/router/index.ts` — 11 vues paresseuses ; `router.onError` recharge seul au plus 2 fois puis renvoie à `/` ; aucun indicateur : la vue précédente reste affichée.
- **Groupe :** A
- **Tranché :** comportement du code.

#### 32. Appels directs aux services tiers
- **Où :** `design-registry.md` (DESIGN-OBS-EXTERNAL-API-OPT-OUT) — « 14 sites », AC.OBSEAO.1 « ≥ 14 occurrences ».
- **Code :** 11 `fetch` serveur marqués `External API call` ; `scrape-corpus.service.ts` `fetchPageHtml` (lecture des pages concurrentes) n'a pas le marqueur ; ce fichier contient un octet nul qui le fait passer pour binaire à `grep`.
- **Groupe :** A (compte) et C (marqueur manquant)
- **Tranché :** 11 appels marqués ; le douzième est à marquer.

#### 33. Garanties du client d'API
- **Où :** `design-registry.md` (DESIGN-INT-API-WRAPPER) — « retry sur réseau coupé, `KNOWN_ERROR_CODES` traduits en notifications, cost-log automatique sur les routes IA ».
- **Code :** `api.service.ts` — aucun réessai ; erreurs connues envoyées au journal d'activité (`addMessage`), pas en notification ; coût poussé seulement si la réponse porte `usage`.
- **Groupe :** A
- **Tranché :** comportement du code.

#### 34. Persistance : nombre de tables et fichier du pool
- **Où :** `design-registry.md` (DESIGN-COST-POSTGRESQL) — « 20 tables », `server/db/pool.ts` ; `prd.md` (NFR-COST-POSTGRESQL) — « seules les migrations DB versionnées modifient la structure ».
- **Code :** `schema.sql` : 26 tables ; pool dans `server/db/client.ts` ; migrations archivées, structure suivie par `db:snapshot` / `db:check` / `db:apply`.
- **Groupe :** A
- **Tranché :** 26 tables, snapshot de référence.

#### 35. Budget DataForSEO en bac à sable et en test
- **Où :** `design-registry.md` (DESIGN-COST-DATAFORSEO-BUDGET, AC.COSTDB.2) — « `.env.test` ou `DATAFORSEO_COST_BUDGET_USD=999` permet de désactiver l'effet pour les tests » ; `prd.md` — message « Budget DataForSEO atteint — patiente 5 min ou augmente le plafond ».
- **Code :** `_client.ts` `budgetApplicable()` = `!isSandbox()` : aucun budget en bac à sable ; pas de `.env.test` ; message réel « Plafond de dépense DataForSEO atteint ($… / $… sur …min). Attendez ou augmentez DATAFORSEO_COST_BUDGET_USD. ».
- **Groupe :** A
- **Tranché :** budget seulement en production ; message du code.

#### 36. Verdict d'un mot-clé sans données
- **Où :** `prd.md` (NFR-INT-DISPLAY-CONTRACTS) — « verdict « à confirmer » (gris) ».
- **Code :** `shared/kpi-scoring.ts` — niveau `GRAY`, raison « Données insuffisantes », icône ❔ (`useVerdictColors.ts`).
- **Groupe :** A
- **Tranché :** « Données insuffisantes ».

#### 37. Test du squelette stable et panneau du brief
- **Où :** `design-registry.md` (DESIGN-UX-STABLE-SKELETON, AC.UX.SKEL.1) — « un test composant vérifie que le DOM `data-testid="*-ai-panel"` est présent au mount ».
- **Code :** `ai-panels-persistence.test.ts` lit le source (imports, `v-if` racine), ne monte rien ; `ArticleWorkflowIaBrief.vue` non conforme, test ignoré (`SKIP: FR-UI-AI-PANELS-PATTERN`).
- **Groupe :** A (nature du test) et D (panneau du brief, déjà suivi par FR-UI-AI-PANELS-PATTERN)
- **Tranché :** NFR-UX-STABLE-SKELETON active pour le Moteur ; l'écart Rédaction relève du lot Interface partagée.

#### 38. Guide de tests en retard sur la configuration
- **Où :** `docs/testing-guide.md` — §8.4 « vitest default timeout = 5s » ; §2 « Architecture en 5 couches » (6 listées, 7 avec `tests/integration`) ; §6.4 « Avant de commit : `npx tsc --noEmit` ».
- **Code :** `vitest.config.ts` `testTimeout: 20_000` ; 7 dossiers de tests ; la vérification de référence est `npm run verify`.
- **Groupe :** A
- **Tranché :** `design.md` décrit la configuration réelle.

#### 39. Variables d'environnement documentées et lues
- **Où :** `.env.example` — `GEMINI_PROJET_NAME`, `GEMINI_PROJET_ID` ; absentes : `HAIKU_MODEL`, `SITE_URL`, `VITE_LOG_LEVEL`. `prd.md` (NFR-CFG-PORT-PREFLIGHT) ne mentionne pas le `db:check` enchaîné par `predev`.
- **Code :** `GEMINI_PROJET_*` jamais lues ; `HAIKU_MODEL` (`keyword-radar.service.ts`), `SITE_URL` (`export.service.ts`), `VITE_LOG_LEVEL` (`src/utils/logger.ts`) lues ; `predev` = kill-port puis `db:check || echo …`.
- **Groupe :** A
- **Tranché :** table complète des variables dans `design.md`.

#### 40. Deux exigences NFR-MOT hors du §9
- **Où :** `prd.md` §8.6 — NFR-MOT-LEXIQUE-DECOUPLAGE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION.
- **Code :** `lexique-analysis.service.ts` (`triggerScrapeIfMissing`), tables `keyword_serp_*`, `keyword_paa_questions`, `keyword_autocomplete`.
- **Groupe :** D
- **Tranché :** reprises dans ce lot (toutes les NFR) ; l'assembleur les dédoublonne si le lot Moteur les reprend aussi.

#### 41. Cibles non mesurées
- **Où :** `prd.md` (NFR-PERF-API-LOCAL, NFR-PERF-SSE-FIRST-TOKEN, NFR-PERF-VIEW-LOAD, NFR-PERF-CACHE-HIT-RATE) — « prescrit, non monitoré » ; `design-registry.md` (AC.PERFAPI.2) — « aucune route GET locale n'effectue plus de 3 queries SQL séquentielles ».
- **Code :** aucun chronométrage, aucun compteur de cache, aucun contrôle du nombre de requêtes SQL.
- **Groupe :** D
- **Tranché :** cibles gardées, marquées « non mesurées » ; AC.PERFAPI.2 non reprise (invérifiable).

## Cadre commun et architecture

*24 écarts — A 15, B 2, C 5, D 2*


Écarts trouvés entre la documentation et le code (ou entre documents), sur le cadre : stack,
arborescence, conventions, données, routes, prompts, parcours global, outillage.
Groupes : **A** doc périmée, le code est juste · **B** choix produit · **C** le code est en défaut,
dette · **D** déjà assumé.

#### 1. Version de Node
- **Où :** `.claude/CLAUDE.md` §8 (« Node : `^20.19.0 || >=22.12.0` ») ; `prd.md` `NFR-RT-NODE` ; `architecture.md` (« engines : `^20.19.0 || >=22.12.0` ») ; `README.md` §3 (« 20.19+ ou 22.12+ »)
- **Code :** `package.json` — `engines.node` = `>=24` ; `.nvmrc` = `24` ; la CI lit `.nvmrc`
- **Groupe :** A
- **Tranché :** Node 24 ou plus (`design.md` § Stack).

#### 2. Les versions techniques comme exigences (`NFR-RT-*`)
- **Où :** `prd.md` §9.7 existe deux fois : une « note de sortie » (« n'est pas une exigence produit… vit désormais dans `architecture.md` ») puis la table `NFR-RT-NODE` … `NFR-RT-HF` ; idem §9.8 en double
- **Code :** les versions réelles sont dans `package.json` (plages npm), pas figées
- **Groupe :** B
- **Tranché :** suivi de la note de sortie du PRD. Les `NFR-RT-*` passent dans la table « Retirées (cadre) » de `requirements.md`, remplacées par `design.md` § Stack. À harmoniser avec le lot NFR s'il les reprend.

#### 3. Libellés des phases du Moteur
- **Où :** `prd.md` §1 et Journey 1 (« Phase ① Explorer ») ; `architecture.md` (« Explorer / Valider / Finalisation »)
- **Code :** `src/composables/moteur/useMoteurTabs.ts` — `phases` : « Générer », « Valider », « Finaliser »
- **Groupe :** A
- **Tranché :** « Générer » / « Valider » / « Finaliser » (libellés de l'écran). Le lot Moteur fait foi pour le détail.

#### 4. Nombre d'onglets, d'étapes et de verrous
- **Où :** `architecture.md` (6 onglets, « 5 checks Moteur », Finalisation « débloquée quand 3 checks Phase ② ») ; `GUIDE-01` § « Les 5 cases à cocher » et §9 ; `GUIDE-02` §3 et §7 (« les 5 checks ») ; `ARCHITECTURE_FLOWS.md` §1
- **Code :** `shared/constants/workflow-checks.constants.ts` — `MOTEUR_CHECKS` (6) + `REDACTION_CHECKS` (1) ; `useMoteurTabs.ts` (7 onglets) ; `useFinalisationGating.ts` — `isFinalisationUnlocked` (4 verrous)
- **Groupe :** A
- **Tranché :** 7 onglets, 6 étapes Moteur, 1 étape Rédaction (« Premier jet accepté »), 4 verrous.

#### 5. Catalogue des routes de l'API
- **Où :** `architecture.md` (« 24 modules », dont `intent.routes`, `local.routes`, `keyword-validate.routes`) ; `prd.md` §12.2 (« 24 fichiers », dont `intent`, `local`, `keyword-validate`) ; `ARCHITECTURE_FLOWS.md` §1 (« 24 modules »)
- **Code :** `server/index.ts` monte 25 routeurs ; `intent.routes`, `local.routes`, `keyword-validate.routes` n'existent pas ; `keyword-scan`, `long-tail-suggest`, `runtime-mode`, `gates`, `cost-status` manquent aux listes
- **Groupe :** A
- **Tranché :** les 25 routeurs du catalogue de `design.md`.

#### 6. Tables de la base
- **Où :** `architecture.md` § Data Architecture (tables `keywords`, `api_cache`, `discovery_cache`, `radar_cache`, `paa_cache`, `article_explorations`, `strategies`, `links`, `article_micro_context`) ; `prd.md` §12.1 (`silos.name`, `cocoon_strategies.completed_steps`, `captain_explorations.source / validation`, `keyword_metrics` « keyword PK », `kd`, `autocomplete[]`, `serp_raw_json`) ; `GUIDE-02` §6 (« 25 tables »)
- **Code :** `server/db/schema.sql` — 26 tables ; `silos.nom` ; `cocoon_strategies (cocoon_id, data, generated_at)` ; `captain_explorations (keyword, article_level, root_keywords, ai_panel_markdown, status, locked_at)` ; `keyword_metrics` clé `(keyword, lang, country)`, `keyword_difficulty`, `autocomplete_suggestions` JSONB, pas de `serp_raw_json` ; 9 tables absentes de §12.1 (`keyword_autocomplete`, `keyword_discoveries`, `keyword_paa_questions`, `keyword_serp_results`, `keyword_serp_scrapes`, `keywords_seo`, `lieutenant_explorations`, `local_entities`, `paa_explorations`)
- **Groupe :** A
- **Tranché :** le modèle de données de `design.md`, tiré de `schema.sql`.

#### 7. Purge et connexion à la base
- **Où :** `architecture.md` (« Purge horaire : `DELETE FROM api_cache` » ; « Connexion DB via `DATABASE_URL` dans `.env` »)
- **Code :** `server/index.ts` — purge de `external_api_cache` ; `server/db/client.ts` — `pool` lit `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` ; `DATABASE_URL` n'est lue nulle part
- **Groupe :** A
- **Tranché :** ce que fait le code (`design.md` § Démarrage du serveur).

#### 8. Nombre et liste des prompts
- **Où :** `architecture.md` et `ARCHITECTURE_FLOWS.md` (« 45 prompts » ; `intent-scan.md`, `pain-translate.md`, `lexique-exploration-upfront.md`, `actions/localize.md`) ; `GUIDE-02` §5 (`generate-article-section.md`)
- **Code :** `server/prompts/` — 39 `.md` + 11 `actions/` ; aucun des fichiers cités n'existe ; `docs/prompts-reference.md` (généré, testé) est juste
- **Groupe :** A
- **Tranché :** le catalogue de `design.md` (50 prompts), aligné sur la référence générée.

#### 9. Organisation du front et du serveur
- **Où :** `prd.md` §2 (« 22 stores Pinia (5 domaines), 42+ services (7 domaines), 24 routes Express, 15 vues ») ; `architecture.md` (composables en 5 domaines ; store `moteur-basket`, qui n'existe plus ; stores `enrichment`, `radar-exploration`, `keyword-modifiers`, `gate-alarm`, `runtime-mode` absents) ; `.claude/CLAUDE.md` §3 règle 4 (composables `{keyword,intent,editor,seo,ui}`, services en 7 domaines)
- **Code :** 29 stores en 5 domaines ; 56 fichiers de composables en 9 domaines (`article`, `editor`, `intent`, `keyword`, `lexique`, `moteur`, `seo`, `strategy`, `ui`) ; 86 fichiers de services en 8 domaines (`gates/` en plus) ; 13 vues ; 177 composants
- **Groupe :** A
- **Tranché :** les comptes et domaines de `design.md` § Arborescence.

#### 10. Routes de l'écran : Labo et Explorateur
- **Où :** `architecture.md` (routes `/labo`, `/explorateur`, « 14 routes », frontières Labo et Explorateur) ; `ARCHITECTURE_FLOWS.md` §2
- **Code :** `src/router/index.ts` — ni `/labo` ni `/explorateur` ; 12 routes nommées, plus la page introuvable ; `LaboView` et `ExplorateurView` n'existent plus
- **Groupe :** A
- **Tranché :** Labo et Explorateur retirés (`FR-LAB-*`, `FR-EXP-*` sauf `FR-EXP-CONTENT-GAP` dans « Retirées (cadre) »).

#### 11. Composants bimodaux `workflow` / `libre`
- **Où :** `.claude/CLAUDE.md` §3 règle 8 et §4 (« jamais dupliquer entre Moteur et Labo ») ; `architecture.md` § Composants bimodaux
- **Code :** la prop optionnelle `mode?: 'workflow' | 'libre'` subsiste sur `RadarPanel.vue`, `CaptainPanel.vue`, `DiscoveryPanel.vue`, `LieutenantsPanel.vue`, `StructureHnPanel.vue` ; seul `MoteurView.vue` les appelle, avec `workflow`
- **Groupe :** C
- **Tranché :** `design.md` décrit la prop comme résiduelle. La règle « bimodale » n'a plus d'objet tant qu'aucun écran ne passe `libre` ; retirer la prop est une dette (`NFR-INT-MOTEUR-BIMODAL`, lot NFR).

#### 12. Format des flux SSE
- **Où :** `architecture.md` § Format Patterns (`event: chunk` → `{"text": "..."}` ; un événement `usage` séparé)
- **Code :** `server/routes/generate/*.ts`, `server/services/external/ai-panel-runner.service.ts` — `chunk` → `{ content }` ; aucun événement `usage` : l'usage voyage dans `done`
- **Groupe :** A
- **Tranché :** vocabulaire `chunk` / `section-start` / `section-done` / `done` / `error` (`design.md` § Flux SSE).

#### 13. Fichiers JSON de données
- **Où :** `architecture.md` (« `server/utils/json-storage.ts` — Legacy (archives uniquement) » ; « Zéro fichier JSON en chaud »)
- **Code :** `server/services/external/gsc.service.ts` — `TOKEN_PATH` = `data/gsc-token.json`, lu et écrit via `readJson` / `writeJson`
- **Groupe :** D (le PRD §12.5 note déjà « Tokens GSC en plain »)
- **Tranché :** PostgreSQL pour toutes les données, sauf le jeton OAuth de Search Console, exception assumée.

#### 14. Base de données des tests
- **Où :** `GUIDE-02` §9 (« Il n'y a pas encore de base séparée pour les tests ») ; `GUIDE-04` §14 (« Aucune base de test séparée »)
- **Code :** `scripts/e2e-test-db.ts` (lancé par `pretest:browser`) recrée `blog_redactor_seo_test` depuis `bootstrap.sql` ; `playwright.config.ts` y branche le serveur 3410. Les tests Vitest qui visent le serveur de développement écrivent toujours dans sa base.
- **Groupe :** A (en partie)
- **Tranché :** base jetable pour les tests navigateur seulement (`design.md` § Outillage).

#### 15. Guides utilisateur périmés
- **Où :** `GUIDE-01` §2 (« Article, section par section ») et tableau de la Rédaction (« jusqu'à 3 recherches par section (mode réel) ») ; `GUIDE-04` §13 (`INTER_SECTION_DELAY` ; « La recherche web pendant la rédaction : … l'interrupteur de l'éditeur ») ; `GUIDE-02` §11 (« 29 fichiers `.bak` dans `src/` »)
- **Code :** premier jet en un appel, sans recherche web (`generate/article-draft.routes.ts`) ; `INTER_SECTION_DELAY` n'est lue nulle part ; la recherche web n'existe que dans la passe « sources » et deux actions ; aucun fichier `.bak` dans `src/`
- **Groupe :** A
- **Tranché :** `specification.md` § Rédaction décrit le premier jet en un appel. Les guides restent de l'historique.

#### 16. Récapitulatif des coûts du robot
- **Où :** `docs/auto-article-cli.md` § Notes (« Le récap affiché par le CLI ne compte que l'IA et sous-estime donc le coût d'un facteur ~3,5… Correctif planifié »)
- **Code :** `scripts/auto-article/index.ts` — `readSeoSpend` lit `GET /api/cost-status` avant et après le run en mode réel (`trackSeoCost`), et le rapport ajoute la dépense DataForSEO estimée
- **Groupe :** A
- **Tranché :** le récap du robot compte l'IA et l'estimation DataForSEO, en mode réel.

#### 17. Option `--config` du robot
- **Où :** `scripts/auto-article/index.ts`, texte d'aide (« `--config=<file>` (à venir) rejoue un run sans prompts ») ; `docs/auto-article-cli.md` la décrit comme disponible
- **Code :** `index.ts` — `loadConfigInput(config.configPath)`, run non interactif, pauses auto-validées
- **Groupe :** C (texte d'aide périmé dans le code)
- **Tranché :** l'option fonctionne ; l'aide est à corriger.

#### 18. Préfixes d'identifiants absents de la convention du PRD
- **Où :** `prd.md` § Convention de lecture, table des préfixes (liste `FR-CER` … `NFR-CFG`, `NFR-RT`)
- **Code / doc :** le PRD utilise aussi `FR-PIE`, `FR-PAIN`, `FR-API`, `FR-UI`, `NFR-MOT`, `NFR-TEST`, `NFR-UX`
- **Groupe :** A
- **Tranché :** table des préfixes complète dans `requirements.md`.

#### 19. Emplacement des archives
- **Où :** `.claude/CLAUDE.md` §1 et §7 (« `_bmad-output/implementation-artifacts/_archive/` », tech-specs livrés déplacés dans `_archive/`)
- **Code :** ce dossier n'existe pas ; les archives sont à la racine, `archive/implementation-artifacts/` (89 fichiers), `archive/docs/`, `archive/planning-artifacts/` ; `_bmad-output/planning-artifacts/_archive/` existe
- **Groupe :** A
- **Tranché :** `design.md`, annexe, cite les emplacements réels.

#### 20. `.claude/CLAUDE.md` présenté comme versionné
- **Où :** `README.md` §1 et `.claude/CLAUDE.md` (source des règles du projet)
- **Code :** `.gitignore` ignore `.claude/` ; `git ls-files .claude` ne renvoie rien
- **Groupe :** D (`GUIDE-04` §12 le dit déjà)
- **Tranché :** fichier local à la machine ; l'annexe de `design.md` le précise.

#### 21. Tests qui lisent l'ancienne documentation
- **Où :** migration vers `spec/` et `design/` (cette consolidation)
- **Code :** `tests/unit/architecture/requirements-trace.test.ts` lit `prd.md`, `design-registry.md` et l'épopée ; `tests/unit/coherence/prd-tables-matrix.test.ts` lit la section `### 8.14.bis` de `prd.md` ; `tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts` lit `prd.md` (`FR-MOT-DISPLAY-FROM-STORE` … `Statut.*active`) et deux fiches `docs/data-flows/`
- **Groupe :** C (contrainte de migration)
- **Tranché :** garder les anciens fichiers tant que ces tests n'ont pas été repointés sur `spec/requirements.md` et `design/design.md`. Les nouveaux documents doivent contenir tout ID cité par un test, retirées comprises (ex. `FR-EXP-INTENT-ANALYZE`, `FR-EXP-MAPS`, `FR-EXP-LOCAL-COMPARE`), et une matrice des tables si le test de matrice est conservé.

#### 22. Routes sans appelant
- **Où :** `prd.md` §8.12 (`FR-EXP-AUDIT` : « La route subsiste côté backend… n'est plus appelée ») ; aucun document pour les autres
- **Code :** aucun appel dans `src/` ni `scripts/` pour `POST /strategy/batch-status`, `POST /keywords/autocomplete-suggest`, `POST /keywords/validate-pain`, `POST /articles/:id/lieutenants/archive` ; `keyword_autocomplete` a des accesseurs (`upsertAutocomplete`, `getAutocomplete`) sans appelant
- **Groupe :** C
- **Tranché :** listées comme telles dans `design.md` ; à retirer ou à rebrancher dans un chantier de nettoyage.

#### 23. Middleware de télémétrie non monté
- **Où :** `prd.md` §1 (« DbOps tracking »)
- **Code :** `server/middleware/db-telemetry.middleware.ts` — `dbTelemetryMiddleware` testé, jamais importé par `server/index.ts` ; le suivi réel passe par `measureDb` route par route (`dbOps` dans la réponse)
- **Groupe :** C
- **Tranché :** `design.md` décrit `measureDb` et signale le middleware non monté.

#### 24. Stratégie d'article sans écran d'édition
- **Où :** `src/components/dashboard/WorkflowChoice.vue`, carte « Rédaction » (« Stratégie article, brief, sommaire et rédaction pour chaque article du cocon »)
- **Code :** `src/stores/strategy/strategy.store.ts` expose `saveStrategy`, `requestSuggestion`… mais aucun composant ne les appelle ; `ArticleWorkflowView.vue` ne fait que `fetchStrategy` ; seul le robot écrit la stratégie d'article (`PUT /strategy/:id` dans `phases/cerveau.ts`)
- **Groupe :** B
- **Tranché :** `specification.md` dit que l'application lit la stratégie d'article sans l'éditer. Réintroduire un écran ou retirer l'annonce de la carte est un choix produit (lot Cerveau).
