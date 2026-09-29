---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Dashboard et page du cocon

L'accueil, la page d'un silo et la page d'un cocon ne font que lire. Leur seule écriture est la création d'un cocon. Les trois vues lisent le même agrégat serveur : chaque silo, ses cocons, les articles de chaque cocon, et des statistiques calculées à la volée par `computeStats`.

- Flux de lecture : `GET /api/silos` et `GET /api/cocoons` → `loadArticlesDb` (une seule requête `silos ⋈ cocoons ⟕ articles`) → stores Pinia → cartes.
- Les points de progression, eux, se lisent article par article (`GET /api/articles/:id/progress`), dans les listes du Moteur et de la Rédaction.

## Navigation : accueil, silo, page du cocon
*Exigences : FR-DASH-NAV, FR-DASH-WORKFLOW-CHOICE · Design : DESIGN-DASH-NAV, DESIGN-DASH-WORKFLOW-CHOICE*

- **Code — vues et routes :**
  - [`src/router/index.ts`](../src/router/index.ts) — routes `/`, `/config`, `/silo/:siloId`, `/cocoon/:cocoonId`, `/cocoon/:cocoonId/cerveau`, `/moteur`, `/redaction`, `/cocoon/:cocoonId/article/:articleId` ; redirections héritées `/theme/:themeId…` ; garde qui renvoie un paramètre vide vers `not-found`.
  - [`src/views/DashboardView.vue`](../src/views/DashboardView.vue) — `store.fetchSilos()` au montage ; tuiles `silos.length`, `totalCocoons`, `totalArticles`, `globalCompletion` ; liens `/linking`, `/post-publication`, `/config`.
  - [`src/components/dashboard/SiloCard.vue`](../src/components/dashboard/SiloCard.vue) — carrousel de `CocoonCard`, lien `/silo/${silo.id}`.
  - [`src/components/dashboard/CocoonCard.vue`](../src/components/dashboard/CocoonCard.vue) — lien `/cocoon/${cocoon.id}`, `stats.byType`, `stats.completionPercent`.
  - [`src/views/SiloDetailView.vue`](../src/views/SiloDetailView.vue) — silo trouvé par `s.id === Number(route.params.siloId)`.
  - [`src/views/CocoonLandingView.vue`](../src/views/CocoonLandingView.vue) — `loadData` : `fetchCocoons` si le cocon manque, puis `articlesStore.fetchArticlesByCocoon` et `keywordsStore.fetchKeywordsByCocoon(name)`.
  - [`src/components/dashboard/WorkflowChoice.vue`](../src/components/dashboard/WorkflowChoice.vue) — trois `RouterLink`. La prop `strategyProgress` n'est jamais passée : le badge Cerveau vaut toujours « 6 étapes ».
- **Code — stores :**
  - [`src/stores/strategy/silos.store.ts`](../src/stores/strategy/silos.store.ts) — `fetchSilos` (`/theme` et `/silos` en parallèle), `globalCompletion` (moyenne pondérée), `addCocoon`.
  - [`src/stores/strategy/cocoons.store.ts`](../src/stores/strategy/cocoons.store.ts) — `fetchCocoons`.
  - [`src/stores/article/articles.store.ts`](../src/stores/article/articles.store.ts) — `fetchArticlesByCocoon`.
- **Code — serveur :**
  - [`server/services/infra/data.service.ts`](../server/services/infra/data.service.ts) — `loadArticlesDb` (cocons indexés par leur `id` en base ; `publishedArticles` = phase `redaction` ou `published`) ; `getSilos` ; `computeStats` : `completionPercent` = (brouillon + publié) / total ; `getTheme`.
  - [`server/routes/silos.routes.ts`](../server/routes/silos.routes.ts), [`server/routes/cocoons.routes.ts`](../server/routes/cocoons.routes.ts).
- **Données :** tables `silos`, `cocoons` (`silo_id` → `silos ON DELETE CASCADE`) et `articles` (`cocoon_id` → `cocoons ON DELETE SET NULL`). Pas de cache serveur. Les stores gardent la liste jusqu'au prochain `fetch*`.
- **API :**
  - `GET /api/theme` → `{ nom, description }`.
  - `GET /api/silos` → `Silo[]` (`cocons`, `stats`).
  - `GET /api/silos/:name` → un silo, ou 404.
  - `GET /api/cocoons` → `Cocoon[]`.
  - `GET /api/cocoons/:id/articles` → `Article[]`, 400 / 404.
  - `GET /api/keywords/:cocoon` → pool de mots-clés du cocon (repère « N mots-clés » de la carte « Moteur »).
- **Règles et décisions :**
  - L'identifiant d'un cocon est celui de la table, jamais un rang (cf. le commentaire `cocoons-id-stability` dans `loadArticlesDb`) : une URL mise en favori reste juste.
  - L'identifiant d'un **silo** est encore son rang dans la liste (`id: idx` dans `getSilos`). Supprimer un silo décale les URL `/silo/:siloId`.
  - `getTheme` lit `theme_config.data.nom`, que `themeConfigSchema` ne connaît pas (il est retiré à chaque enregistrement). En pratique, l'accueil affiche le nom et la description du premier silo (`SELECT … FROM silos LIMIT 1`, sans ordre).
  - `getSilos` appelle `loadArticlesDb` deux fois : coût accepté pour un outil local à un seul utilisateur.
  - Les trois cartes ne sont jamais désactivées. Le verrou de génération vit dans la Rédaction (`ArticleWorkflowView`, `cerveauEstComplet` : `cocoonStrategyStore.isComplete || strategyStore.isComplete` ; cf. [Rédaction](17-redaction.md), FR-RED-GEN-UNLOCK).

## Création d'un cocon
*Exigences : FR-DASH-COCOON-CREATE · Design : —*

- **Code :**
  - [`src/components/dashboard/SiloCard.vue`](../src/components/dashboard/SiloCard.vue) — `startAdding`, `confirmAdd`, `handleBlur`, `handleKeydown`. Succès → `router.push('/cocoon/' + cocoon.id)`.
  - `silos.store` `addCocoon` — ajoute le cocon au silo local. En cas d'échec, il écrit `error`.
  - `data.service` `addCocoonToSilo` — silo inconnu → erreur ; nom déjà présent **dans ce silo** → erreur ; `INSERT … RETURNING id`.
- **Données :** `cocoons (silo_id, nom)`. Aucune contrainte d'unicité en base : l'unicité par silo est vérifiée dans le service.
- **API :** `POST /api/silos/:name/cocoons { name }` → 201 `{ data: Cocoon }` ; 400 `VALIDATION_ERROR` ; 404 `NOT_FOUND` ; 409 `CONFLICT`. `POST /api/silos` existe, mais aucun écran ne l'appelle (le mode automatique n'appelle que la création de cocon).
- **Règles et décisions :** l'échec d'`addCocoon` écrit dans `silos.store.error`, que l'accueil utilise aussi pour sa liste (`AsyncContent :error`). Un refus remplace donc toute la liste par le message brut du serveur ; « Réessayer » recharge les silos.

## Points de progression
*Exigences : FR-DASH-PROGRESS · Design : DESIGN-DASH-PROGRESS*

- **Code :**
  - [`src/components/moteur/ProgressDots.vue`](../src/components/moteur/ProgressDots.vue) — `PHASE_GROUPS` (Explorer : `MOTEUR_DISCOVERY_DONE`, `MOTEUR_RADAR_DONE` ; Valider : `MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_HN_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED`), `CHECK_TOOLTIPS`, `aria-label` « Progression : n sur 6 ». Prop `completedChecks`.
  - [`src/components/moteur/MoteurContextRecap.vue`](../src/components/moteur/MoteurContextRecap.vue) — seul consommateur. `getChecks(id)` lit le store. Un `watch` sur les groupes appelle `fetchProgress(id)` pour chaque article visible d'`id > 0` qui n'est pas en cache. Il est monté par `MoteurView` et, en `readonly`, par `RedactionView`.
  - [`src/stores/article/article-progress.store.ts`](../src/stores/article/article-progress.store.ts) — `progressMap` (50 entrées au plus ; au-delà, les plus petits identifiants sont retirés, cf. [Moteur](12-moteur.md)) ; `fetchProgress`, `addCheck`, `removeCheck`, `getProgress`. La mise à jour suit la réponse du serveur : pas de mise à jour optimiste.
  - [`shared/constants/workflow-checks.constants.ts`](../shared/constants/workflow-checks.constants.ts) — `MOTEUR_CHECKS`.
- **Données :** `articles.completed_checks TEXT[]` et `check_timestamps JSONB` (cf. [Moteur — cadre commun](12-moteur.md) pour les émetteurs).
- **API :** `GET /api/articles/:id/progress`, `POST /api/articles/:id/progress/check`, `POST /api/articles/:id/progress/uncheck` → `ArticleProgress`.
- **Règles et décisions :**
  - Seules les constantes `MOTEUR_CHECKS` font un point : un check `cerveau:*` historique, ou `redaction:draft_accepted`, n'en fait pas.
  - Les points se lisent dans le store, pas dans une prop figée, pour se mettre à jour dans la session (cf. DESIGN-MOT-DISPLAY-FROM-STORE).
