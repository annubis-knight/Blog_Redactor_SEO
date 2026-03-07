---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
date: '2026-03-06'
inputDocuments:
  - prd.md
  - architecture.md
---

# Blog Redactor SEO - Epic Breakdown

## Overview

Ce document fournit le découpage complet en epics et stories pour Blog Redactor SEO, décomposant les exigences du PRD et de l'Architecture en stories implémentables.

## Requirements Inventory

### Functional Requirements

**Gestion du Plan Éditorial (FR1-FR5)**

- FR1: L'utilisateur peut visualiser les 6 cocons sémantiques avec leur statut de progression (% articles rédigés, publiés)
- FR2: L'utilisateur peut voir la liste des articles par cocon avec leur statut (à rédiger / brouillon / publié)
- FR3: L'utilisateur peut voir les mots-clés associés à chaque article (pilier, moyenne traîne, longue traîne)
- FR4: L'utilisateur peut voir les statistiques de santé par cocon (couverture mots-clés, maillage, complétion)
- FR5: L'utilisateur peut sélectionner un article pour lancer le workflow de rédaction

**Brief SEO/GEO (FR6-FR9)**

- FR6: Le système génère automatiquement un brief SEO pour l'article sélectionné (mot-clé pilier, secondaires, type d'article, rôle dans le cocon)
- FR7: Le système enrichit le brief avec les données DataForSEO (SERP top 10, PAA, related keywords, volumes, difficulté)
- FR8: Le système recommande une longueur de contenu basée sur l'analyse SERP des concurrents
- FR9: Le système cache les résultats DataForSEO pour éviter les appels redondants

**Génération de Structure (FR10-FR13)**

- FR10: Le système génère un sommaire (H1, H2, H3) aligné au template Propulsite et enrichi par les PAA DataForSEO
- FR11: L'utilisateur peut modifier le sommaire généré (ajouter, supprimer, réordonner, renommer des sections)
- FR12: L'utilisateur peut valider le sommaire pour lancer la génération de contenu
- FR13: Le sommaire intègre automatiquement les blocs pédagogiques Propulsite (content-valeur, content-reminder, sommaire cliquable)

**Génération de Contenu (FR14-FR20)**

- FR14: Le système génère l'article complet basé sur le sommaire validé, en respectant le ton Propulsite
- FR15: Le contenu généré intègre les mots-clés de manière naturelle et indétectable à la lecture
- FR16: Le contenu généré inclut des answer capsules (20-25 mots) après chaque H2
- FR17: Le contenu généré inclut des statistiques sourcées (minimum 3 par article)
- FR18: Le contenu généré formule les H2/H3 en questions quand pertinent
- FR19: Le contenu généré respecte le pattern Propulsite : vouvoiement, exemples grandes marques → PME, données chiffrées, conclusion actionnable
- FR20: Le système génère automatiquement le meta title et la meta description optimisés

**Éditeur Rich Text (FR21-FR24)**

- FR21: L'utilisateur peut éditer le contenu généré dans un éditeur rich text (TipTap)
- FR22: L'éditeur affiche le contenu avec la mise en forme du template Propulsite
- FR23: L'éditeur sauvegarde automatiquement le contenu
- FR24: L'utilisateur peut sélectionner du texte pour accéder aux actions contextuelles

**Actions Contextuelles (FR25-FR33)**

- FR25: L'utilisateur peut reformuler une sélection de texte
- FR26: L'utilisateur peut simplifier une sélection de texte
- FR27: L'utilisateur peut convertir une sélection en liste à puces
- FR28: L'utilisateur peut enrichir une sélection avec un exemple (pattern grandes marques → PME)
- FR29: L'utilisateur peut optimiser une sélection pour un mot-clé ciblé
- FR30: L'utilisateur peut ajouter une statistique sourcée à l'endroit de la sélection
- FR31: L'utilisateur peut créer une answer capsule (20-25 mots) à partir d'une sélection
- FR32: L'utilisateur peut reformuler un titre H2/H3 en question
- FR33: L'utilisateur peut injecter un lien interne sur une sélection en choisissant l'article cible

**Scoring SEO (FR34-FR38)**

- FR34: Le système affiche un score SEO global mis à jour en temps réel pendant l'édition
- FR35: Le système affiche la densité par mot-clé (pilier / moyenne traîne / longue traîne) avec cibles et état actuel
- FR36: Le système affiche une checklist SEO : présence des mots-clés dans titre, H1, intro, meta description, H2s, conclusion
- FR37: Le système valide la hiérarchie des titres Hn
- FR38: Le système affiche les NLP terms (termes sémantiques DataForSEO) à inclure, cochés quand détectés dans le texte

**Scoring GEO (FR39-FR44)**

- FR39: Le système affiche un score GEO composite mis à jour en temps réel
- FR40: Le système vérifie la présence d'answer capsules par H2
- FR41: Le système mesure le % de H2/H3 formulés en questions
- FR42: Le système compte les statistiques sourcées par article
- FR43: Le système alerte si un paragraphe dépasse 3 lignes
- FR44: Le système détecte le jargon corporate et propose des reformulations

**Maillage Interne (FR45-FR52)**

- FR45: Le système détecte les phrases-ancres pertinentes et propose des liens internes vers les articles du blog
- FR46: Le système injecte automatiquement les liens internes validés
- FR47: Les ancres de maillage persistent entre les régénérations d'un même article
- FR48: Le maillage respecte la hiérarchie de cocon (Pilier ↔ Intermédiaire ↔ Spécialisé)
- FR49: Le système affiche une matrice de maillage globale (quel article lie vers quel article)
- FR50: Le système détecte les articles orphelins (aucun lien entrant)
- FR51: Le système vérifie la diversité des textes d'ancre
- FR52: Le système identifie les opportunités de liens cross-cocon

**Export (FR53-FR56)**

- FR53: Le système génère le HTML final conforme au `templateArticle.html`
- FR54: Le système injecte le schema markup JSON-LD (Article, FAQPage, BreadcrumbList) dans l'export
- FR55: Le système met à jour le statut de l'article dans `BDD_Articles_Blog.json` après export
- FR56: Le système inclut le meta title et meta description dans l'export HTML

**Données et Persistance (FR57-FR60)**

- FR57: Le système charge et interprète `BDD_Articles_Blog.json` (54 articles, 6 cocons, types, slugs, statuts)
- FR58: Le système charge et interprète `BDD_Mots_Clefs_SEO.json` (~100 mots-clés classés par cocon et type)
- FR59: Le système sauvegarde le contenu de chaque article individuellement
- FR60: Le système persiste les données de maillage (liens, ancres, articles cibles) de manière traçable

### NonFunctional Requirements

**Performance (NFR1-NFR5)**

- NFR1: La génération d'un sommaire complète en moins de 10 secondes
- NFR2: La génération d'un article complet complète en moins de 60 secondes
- NFR3: Le scoring SEO/GEO se met à jour en moins de 2 secondes après une modification dans l'éditeur
- NFR4: Le chargement initial de l'application complète en moins de 3 secondes
- NFR5: La navigation entre pages (dashboard → éditeur) complète en moins de 500ms

**Coût (NFR6-NFR7)**

- NFR6: Le coût total API (Claude + DataForSEO) par article reste inférieur à 0.50€
- NFR7: Les résultats DataForSEO sont cachés pour éviter les appels redondants (1 appel par mot-clé pilier, réutilisé ensuite)

**Fiabilité (NFR8-NFR10)**

- NFR8: L'éditeur sauvegarde automatiquement le contenu toutes les 30 secondes pour éviter la perte de données
- NFR9: En cas d'échec d'appel API (Claude ou DataForSEO), le système affiche un message d'erreur clair et permet de réessayer
- NFR10: Les données JSON (articles, mots-clés, maillage) sont sauvegardées de manière atomique pour éviter la corruption

**Sécurité (NFR11-NFR12)**

- NFR11: Les clés API (Claude, DataForSEO) sont stockées côté serveur dans des variables d'environnement, jamais exposées au frontend
- NFR12: L'application tourne en local uniquement — pas d'authentification nécessaire

**Maintenabilité (NFR13-NFR15)**

- NFR13: Les règles GEO (seuils, critères de scoring) sont configurables via un fichier de configuration, pas hardcodées
- NFR14: Le system prompt Propulsite (ton, exemples, blocs pédagogiques) est externalisé dans un fichier éditable
- NFR15: Les templates HTML d'export sont séparés du code applicatif

**Intégration (NFR16-NFR17)**

- NFR16: L'intégration DataForSEO utilise l'API REST officielle avec gestion du rate limiting
- NFR17: L'intégration Claude API utilise le SDK officiel Anthropic avec gestion du streaming pour les générations longues

### Additional Requirements

**Exigences Architecture — Starter Template & Setup :**

- Le projet utilise `create-vue` comme starter template : `npm create vue@latest blog-redactor-seo -- --typescript --router --pinia --vitest --eslint-with-prettier`
- Dépendances additionnelles : @tiptap/vue-3, @tiptap/starter-kit, @anthropic-ai/sdk, express, zod, @vueuse/core
- L'initialisation du projet doit être la première story d'implémentation

**Exigences Architecture — Structure Monorepo :**

- Architecture monorepo client (src/) + server (server/) + shared (shared/)
- Dossier `data/` pour les fichiers JSON persistants (articles, cache, liens)
- Types partagés entre client et server via `shared/types/`
- Schemas Zod partagés via `shared/schemas/`
- Constantes configurables via `shared/constants/`

**Exigences Architecture — Backend :**

- Node.js / Express comme proxy API (Claude + DataForSEO)
- Stockage JSON files avec sauvegarde atomique (write-to-temp + fs.rename)
- API REST pour CRUD + SSE (Server-Sent Events) pour streaming IA
- 14 endpoints API définis (voir architecture.md)
- Prompts IA externalisés dans `server/prompts/` (fichiers Markdown)
- Gestion d'erreurs via middleware Express global

**Exigences Architecture — Frontend :**

- Vue 3 + Composition API (`<script setup lang="ts">`)
- 9 stores Pinia en mode setup (articles, cocoons, keywords, editor, seo, geo, linking, brief, ui)
- 7 composables (useArticleWorkflow, useSeoScoring, useGeoScoring, useContextualActions, useInternalLinking, useAutoSave, useStreaming)
- Scoring temps réel via composables avec debounce 300ms
- Organisation composants par feature (dashboard, brief, outline, editor, actions, panels, linking, export, shared)
- TipTap avec 4 extensions custom (content-valeur, content-reminder, answer-capsule, internal-link)

**Exigences Architecture — Conventions :**

- Composants Vue en PascalCase, stores en kebab-case.store, composables en camelCase use*, services en kebab-case.service
- Fichiers JSON existants gardent leur format snake_case, conversion dans les services backend
- Format réponse API standardisé : `{ data: T }` succès, `{ error: { code, message } }` erreur
- Tests unitaires dans `tests/` à la racine, structure miroir de `src/`

**Exigences Architecture — Environnement :**

- App locale uniquement, pas d'auth, pas de déploiement
- Variables d'environnement : ANTHROPIC_API_KEY, DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, CLAUDE_MODEL, PORT
- Fichier `.env.example` comme template
- Node.js 20 LTS minimum
- Vite proxy pour les requêtes `/api/*` vers Express en dev

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Visualiser les 6 cocons sémantiques avec statut de progression |
| FR2 | Epic 1 | Voir la liste des articles par cocon avec statut |
| FR3 | Epic 1 | Voir les mots-clés associés à chaque article |
| FR4 | Epic 1 | Voir les statistiques de santé par cocon |
| FR5 | Epic 1 | Sélectionner un article pour lancer le workflow |
| FR6 | Epic 2 | Générer automatiquement un brief SEO |
| FR7 | Epic 2 | Enrichir le brief avec DataForSEO |
| FR8 | Epic 2 | Recommander une longueur de contenu |
| FR9 | Epic 2 | Cacher les résultats DataForSEO |
| FR10 | Epic 2 | Générer un sommaire H1/H2/H3 |
| FR11 | Epic 2 | Modifier le sommaire généré |
| FR12 | Epic 2 | Valider le sommaire |
| FR13 | Epic 2 | Intégrer les blocs pédagogiques Propulsite |
| FR14 | Epic 3 | Générer l'article complet en ton Propulsite |
| FR15 | Epic 3 | Intégrer les mots-clés de manière naturelle |
| FR16 | Epic 3 | Inclure des answer capsules après chaque H2 |
| FR17 | Epic 3 | Inclure des statistiques sourcées |
| FR18 | Epic 3 | Formuler H2/H3 en questions |
| FR19 | Epic 3 | Respecter le pattern Propulsite |
| FR20 | Epic 3 | Générer meta title et meta description |
| FR21 | Epic 3 | Éditer le contenu dans TipTap |
| FR22 | Epic 3 | Afficher avec mise en forme template Propulsite |
| FR23 | Epic 3 | Sauvegarde automatique du contenu |
| FR24 | Epic 3 | Sélectionner du texte pour actions contextuelles |
| FR25 | Epic 4 | Reformuler une sélection |
| FR26 | Epic 4 | Simplifier une sélection |
| FR27 | Epic 4 | Convertir en liste à puces |
| FR28 | Epic 4 | Enrichir avec exemple grandes marques → PME |
| FR29 | Epic 4 | Optimiser pour un mot-clé ciblé |
| FR30 | Epic 4 | Ajouter statistique sourcée |
| FR31 | Epic 4 | Créer answer capsule |
| FR32 | Epic 4 | Reformuler titre en question |
| FR33 | Epic 4 | Injecter lien interne |
| FR34 | Epic 5 | Score SEO global temps réel |
| FR35 | Epic 5 | Densité par mot-clé avec cibles |
| FR36 | Epic 5 | Checklist SEO |
| FR37 | Epic 5 | Validation hiérarchie Hn |
| FR38 | Epic 5 | NLP terms DataForSEO |
| FR39 | Epic 5 | Score GEO composite temps réel |
| FR40 | Epic 5 | Vérification answer capsules par H2 |
| FR41 | Epic 5 | Mesure % H2/H3 en questions |
| FR42 | Epic 5 | Compteur statistiques sourcées |
| FR43 | Epic 5 | Alerte paragraphes > 3 lignes |
| FR44 | Epic 5 | Détection jargon corporate |
| FR45 | Epic 6 | Détecter phrases-ancres et proposer liens |
| FR46 | Epic 6 | Injecter automatiquement les liens validés |
| FR47 | Epic 6 | Persistance des ancres entre régénérations |
| FR48 | Epic 6 | Respecter hiérarchie de cocon |
| FR49 | Epic 6 | Matrice de maillage globale |
| FR50 | Epic 6 | Détecter les articles orphelins |
| FR51 | Epic 6 | Vérifier diversité textes d'ancre |
| FR52 | Epic 6 | Identifier opportunités liens cross-cocon |
| FR53 | Epic 7 | Générer HTML conforme au template |
| FR54 | Epic 7 | Injecter Schema markup JSON-LD |
| FR55 | Epic 7 | Mettre à jour statut article |
| FR56 | Epic 7 | Inclure meta title/description dans export |
| FR57 | Epic 1 | Charger BDD_Articles_Blog.json |
| FR58 | Epic 1 | Charger BDD_Mots_Clefs_SEO.json |
| FR59 | Epic 3 | Sauvegarder contenu article individuellement |
| FR60 | Epic 6 | Persister données de maillage |

## Epic List

### Epic 1 : Fondation du Projet & Dashboard Éditorial
L'utilisateur peut voir l'intégralité de son plan éditorial : les 6 cocons sémantiques, leurs articles, mots-clés associés, et statistiques de santé.
**FRs couvertes :** FR1, FR2, FR3, FR4, FR5, FR57, FR58

### Epic 2 : Brief SEO & Génération de Sommaire
L'utilisateur peut consulter un brief SEO complet enrichi par DataForSEO pour n'importe quel article, puis générer et valider un sommaire structuré avant toute rédaction.
**FRs couvertes :** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13

### Epic 3 : Génération d'Article & Éditeur Riche
L'utilisateur peut générer un article complet en ton Propulsite à partir du sommaire validé, puis l'éditer dans un éditeur riche avec sauvegarde automatique.
**FRs couvertes :** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR59

### Epic 4 : Actions Contextuelles de Raffinement
L'utilisateur peut sélectionner du texte et utiliser 9 actions IA pour affiner son contenu : reformuler, simplifier, enrichir avec des exemples PME, optimiser pour un mot-clé, etc.
**FRs couvertes :** FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33

### Epic 5 : Optimisation SEO & GEO en Temps Réel
L'utilisateur voit ses scores SEO et GEO se mettre à jour en temps réel pendant l'édition, avec des checklists actionnables, la densité de mots-clés, les NLP terms, et la détection de jargon.
**FRs couvertes :** FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44

### Epic 6 : Maillage Interne & Santé des Cocons
L'utilisateur peut gérer le maillage interne de ses articles : détection d'ancres, injection automatique de liens respectant la hiérarchie de cocon, matrice globale, détection d'orphelins, et liens cross-cocon.
**FRs couvertes :** FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR60

### Epic 7 : Export HTML & Publication
L'utilisateur peut exporter son article en HTML conforme au template Propulsite, avec Schema markup JSON-LD, meta title/description, et mise à jour automatique du statut de l'article.
**FRs couvertes :** FR53, FR54, FR55, FR56

---

## Epic 1 : Fondation du Projet & Dashboard Éditorial

L'utilisateur peut voir l'intégralité de son plan éditorial : les 6 cocons sémantiques, leurs articles, mots-clés associés, et statistiques de santé.

### Story 1.1 : Initialisation du Projet et Structure Monorepo

As a développeur,
I want un projet Vue 3 initialisé avec la structure monorepo complète (client/server/shared/data),
So that toute l'équipe de développement dispose d'une base solide et cohérente pour implémenter les fonctionnalités.

**Acceptance Criteria:**

**Given** qu'aucun projet n'existe encore
**When** le projet est initialisé avec `npm create vue@latest blog-redactor-seo -- --typescript --router --pinia --vitest --eslint-with-prettier`
**Then** la structure complète est créée : `src/`, `server/`, `shared/`, `data/`, `tests/`
**And** toutes les dépendances additionnelles sont installées (@tiptap/vue-3, @tiptap/starter-kit, @anthropic-ai/sdk, express, zod, @vueuse/core)
**And** le serveur Express de base démarre sur le port configuré avec middleware d'erreur global
**And** Vite est configuré pour proxier les requêtes `/api/*` vers Express
**And** un fichier `.env.example` documente les variables d'environnement nécessaires
**And** l'utilitaire de stockage JSON atomique (write-to-temp + fs.rename) est implémenté dans `server/utils/json-storage.ts`
**And** `npm run dev` lance simultanément le frontend Vite et le backend Express

### Story 1.2 : Types Partagés, Schemas et Chargement des Données JSON

As a développeur,
I want charger et valider les fichiers JSON existants (articles et mots-clés) avec des types TypeScript partagés,
So that les données du plan éditorial soient accessibles de manière typée et fiable dans toute l'application.

**Acceptance Criteria:**

**Given** que les fichiers `BDD_Articles_Blog.json` et `BDD_Mots_Clefs_SEO.json` existent dans `data/`
**When** le serveur démarre
**Then** les types partagés sont définis dans `shared/types/` (article.types.ts, cocoon.types.ts, keyword.types.ts)
**And** les schemas Zod de validation sont définis dans `shared/schemas/`
**And** les données JSON sont chargées et validées par les services backend
**And** la conversion snake_case → camelCase se fait dans les services backend
**And** l'API expose `GET /api/cocoons` qui retourne la liste des cocons avec statistiques de base
**And** l'API expose `GET /api/cocoons/:id/articles` qui retourne les articles d'un cocon
**And** l'API expose `GET /api/keywords/:cocoon` qui retourne les mots-clés d'un cocon
**And** les réponses API suivent le format standardisé `{ data: T }` / `{ error: { code, message } }`

### Story 1.3 : Dashboard des Cocons Sémantiques

As a Arnau (utilisateur),
I want voir les 6 cocons sémantiques avec leur progression et statistiques de santé,
So that je puisse évaluer d'un coup d'oeil l'état global de mon plan éditorial.

**Acceptance Criteria:**

**Given** que l'application est chargée sur la route `/`
**When** le DashboardView s'affiche
**Then** les 6 cocons sémantiques sont listés via le composant CocoonList
**And** chaque cocon affiche son nom, le nombre d'articles, et une barre de progression (% articles rédigés/publiés) — FR1
**And** chaque cocon affiche des statistiques de santé : % complétion et couverture mots-clés — FR4
**And** le store `cocoons` charge les données depuis l'API au montage
**And** un composant LoadingSpinner s'affiche pendant le chargement
**And** un composant ErrorMessage s'affiche avec bouton retry en cas d'erreur API
**And** le chargement initial complète en moins de 3 secondes — NFR4

### Story 1.4 : Vue Détaillée d'un Cocon — Articles et Mots-clés

As a Arnau (utilisateur),
I want voir la liste des articles d'un cocon avec leur statut et mots-clés associés, et pouvoir sélectionner un article,
So that je puisse choisir quel article rédiger et voir son contexte SEO.

**Acceptance Criteria:**

**Given** que l'utilisateur clique sur un cocon dans le dashboard
**When** la route `/cocoon/:cocoonId` s'affiche (CocoonView)
**Then** la liste des articles du cocon s'affiche avec le composant ArticleList — FR2
**And** chaque article affiche son titre, son type (Pilier / Intermédiaire / Spécialisé), et son statut (à rédiger / brouillon / publié) via StatusBadge — FR2
**And** chaque article affiche ses mots-clés associés (pilier, moyenne traîne, longue traîne) — FR3
**And** les stores `articles` et `keywords` chargent les données depuis l'API
**And** l'utilisateur peut cliquer sur un article pour naviguer vers le workflow de rédaction (route `/article/:slug`) — FR5
**And** la navigation entre dashboard et vue cocon complète en moins de 500ms — NFR5
**And** un bouton retour permet de revenir au dashboard

---

## Epic 2 : Brief SEO & Génération de Sommaire

L'utilisateur peut consulter un brief SEO complet enrichi par DataForSEO pour n'importe quel article, puis générer et valider un sommaire structuré avant toute rédaction.

### Story 2.1 : Intégration DataForSEO avec Cache

As a développeur,
I want un service backend qui interroge l'API DataForSEO et cache les résultats par mot-clé,
So that les données SEO soient disponibles pour le brief sans appels redondants.

**Acceptance Criteria:**

**Given** qu'un mot-clé pilier est fourni
**When** l'API `POST /api/dataforseo/brief` est appelée
**Then** le service interroge les 4 endpoints DataForSEO : SERP Regular, People Also Ask, Related Keywords, Keyword Data — FR7
**And** les résultats sont cachés dans `data/cache/{keyword-slug}.json` avec un timestamp — FR9
**And** un appel ultérieur avec le même mot-clé retourne les données du cache sans appel API — FR9
**And** le rate limiting DataForSEO est géré avec retry et backoff exponentiel — NFR16
**And** en cas d'erreur DataForSEO, une réponse `{ error: { code: 'DATAFORSEO_ERROR', message } }` est retournée — NFR9
**And** les clés DataForSEO sont lues depuis les variables d'environnement côté serveur — NFR11

### Story 2.2 : Affichage du Brief SEO Enrichi

As a Arnau (utilisateur),
I want voir un brief SEO complet pour l'article sélectionné, enrichi avec les données DataForSEO,
So that je dispose de toutes les informations nécessaires avant de structurer mon article.

**Acceptance Criteria:**

**Given** que l'utilisateur navigue vers `/article/:slug`
**When** la vue ArticleWorkflowView s'affiche
**Then** le brief SEO s'affiche avec : mot-clé pilier, mots-clés secondaires, type d'article, rôle dans le cocon — FR6
**And** les données DataForSEO sont affichées : SERP top 10, PAA, related keywords, volumes de recherche, difficulté — FR7
**And** une longueur de contenu recommandée est affichée basée sur l'analyse SERP des concurrents — FR8
**And** le store `brief` charge les données depuis l'API et gère les états loading/error
**And** les composants SeoBrief, KeywordList, DataForSeoPanel et ContentRecommendation sont implémentés
**And** un bouton "Rafraîchir les données SEO" permet d'invalider le cache et relancer l'appel DataForSEO

### Story 2.3 : Génération Automatique du Sommaire

As a Arnau (utilisateur),
I want générer automatiquement un sommaire structuré (H1/H2/H3) basé sur le brief SEO,
So that j'obtienne une structure d'article optimisée SEO/GEO en quelques secondes.

**Acceptance Criteria:**

**Given** que le brief SEO est affiché et les données DataForSEO sont disponibles
**When** l'utilisateur clique sur "Générer le sommaire"
**Then** le système génère un sommaire H1/H2/H3 via Claude API (SSE streaming) — FR10
**And** le sommaire intègre des suggestions H2/H3 basées sur les PAA DataForSEO — FR10
**And** le sommaire inclut les emplacements des blocs pédagogiques Propulsite (content-valeur, content-reminder, sommaire cliquable) — FR13
**And** le prompt de génération est lu depuis `server/prompts/generate-outline.md` — NFR14
**And** la génération complète en moins de 10 secondes — NFR1
**And** un indicateur de streaming affiche la progression pendant la génération
**And** en cas d'erreur Claude API, un message d'erreur s'affiche avec bouton retry — NFR9

### Story 2.4 : Édition et Validation du Sommaire

As a Arnau (utilisateur),
I want modifier et valider le sommaire généré avant toute génération de contenu,
So that la structure de mon article corresponde exactement à ma vision avant d'investir dans la rédaction.

**Acceptance Criteria:**

**Given** qu'un sommaire a été généré
**When** le composant OutlineEditor s'affiche
**Then** l'utilisateur peut ajouter de nouvelles sections H2/H3 — FR11
**And** l'utilisateur peut supprimer des sections — FR11
**And** l'utilisateur peut réordonner les sections par drag-and-drop — FR11
**And** l'utilisateur peut renommer les titres des sections — FR11
**And** un bouton "Valider le sommaire" confirme la structure et permet de passer à la génération de contenu — FR12
**And** un bouton "Régénérer" permet de relancer la génération complète du sommaire
**And** le sommaire validé est sauvegardé dans `data/articles/{slug}.json`

---

## Epic 3 : Génération d'Article & Éditeur Riche

L'utilisateur peut générer un article complet en ton Propulsite à partir du sommaire validé, puis l'éditer dans un éditeur riche avec sauvegarde automatique.

### Story 3.1 : Service Claude API avec Streaming SSE

As a développeur,
I want un service backend Claude API robuste avec streaming SSE vers le frontend,
So that les générations de contenu IA soient streamées en temps réel à l'utilisateur.

**Acceptance Criteria:**

**Given** que le SDK Anthropic est configuré avec la clé API depuis les variables d'environnement
**When** une requête de génération est envoyée à `POST /api/generate/article`
**Then** le service Claude utilise le SDK officiel Anthropic avec streaming — NFR17
**And** le contenu est streamé au frontend via Server-Sent Events (SSE) avec les events : `chunk`, `done`, `error`
**And** le composable `useStreaming` côté frontend consomme le flux SSE et met à jour le store `editor` progressivement
**And** le system prompt Propulsite est chargé depuis `server/prompts/system-propulsite.md` — NFR14
**And** le prompt de génération d'article est chargé depuis `server/prompts/generate-article.md` — NFR14
**And** le modèle Claude utilisé est configurable via la variable d'environnement `CLAUDE_MODEL`
**And** en cas d'erreur, un event SSE `error` est envoyé avec code et message

### Story 3.2 : Génération Automatique de l'Article Complet

As a Arnau (utilisateur),
I want générer un article complet en ton Propulsite basé sur le sommaire validé,
So that j'obtienne un article prêt à publier avec SEO/GEO intégrés en moins d'une minute.

**Acceptance Criteria:**

**Given** que le sommaire est validé et le brief SEO disponible
**When** l'utilisateur clique sur "Générer l'article"
**Then** l'article complet est généré en respectant le ton Propulsite : vouvoiement, exemples grandes marques → PME, données chiffrées, conclusion actionnable — FR14, FR19
**And** les mots-clés (pilier, moyenne traîne, longue traîne) sont intégrés naturellement et de manière indétectable — FR15
**And** une answer capsule (20-25 mots) est générée après chaque H2 — FR16
**And** minimum 3 statistiques sourcées sont incluses dans l'article — FR17
**And** les H2/H3 sont formulés en questions quand pertinent — FR18
**And** le meta title et la meta description sont générés automatiquement — FR20
**And** la génération complète en moins de 60 secondes — NFR2
**And** l'article généré s'affiche progressivement dans l'éditeur via streaming

### Story 3.3 : Éditeur TipTap avec Template Propulsite et Extensions Custom

As a Arnau (utilisateur),
I want éditer le contenu généré dans un éditeur riche qui respecte la mise en forme Propulsite,
So that je puisse modifier le contenu avec une expérience d'édition fluide et fidèle au rendu final.

**Acceptance Criteria:**

**Given** qu'un article a été généré ou un brouillon existe
**When** la route `/article/:slug/editor` s'affiche (ArticleEditorView)
**Then** l'éditeur TipTap s'affiche avec le contenu et la mise en forme du template Propulsite — FR21, FR22
**And** les 4 extensions custom TipTap sont fonctionnelles : content-valeur, content-reminder, answer-capsule, internal-link
**And** la toolbar de formatage de base (EditorToolbar) est disponible : gras, italique, titres, listes
**And** la sélection de texte est possible et déclenche l'affichage du Bubble Menu — FR24
**And** les styles de l'éditeur sont définis dans `src/assets/styles/editor.css`
**And** le store `editor` gère l'état du contenu, le dirty flag, et les métadonnées

### Story 3.4 : Sauvegarde Automatique et Gestion des Brouillons

As a Arnau (utilisateur),
I want que mon contenu soit sauvegardé automatiquement pendant l'édition,
So that je ne perde jamais mon travail même en cas de fermeture accidentelle.

**Acceptance Criteria:**

**Given** que l'utilisateur édite un article dans l'éditeur TipTap
**When** le contenu est modifié
**Then** le composable `useAutoSave` détecte le changement via le dirty flag du store `editor`
**And** une sauvegarde automatique se déclenche toutes les 30 secondes si le contenu a changé — NFR8
**And** la sauvegarde envoie un `PUT /api/articles/:slug` avec le contenu sérialisé — FR59
**And** le backend sauvegarde dans `data/articles/{slug}.json` de manière atomique (write-to-temp + rename) — NFR10
**And** un indicateur visuel affiche l'état : "Sauvegardé", "Sauvegarde en cours...", "Modifications non sauvegardées"
**And** l'utilisateur peut aussi sauvegarder manuellement à tout moment
**And** la route `GET /api/articles/:slug` retourne le contenu sauvegardé pour reprendre l'édition

---

## Epic 4 : Actions Contextuelles de Raffinement

L'utilisateur peut sélectionner du texte et utiliser 9 actions IA pour affiner son contenu : reformuler, simplifier, enrichir avec des exemples PME, optimiser pour un mot-clé, etc.

### Story 4.1 : Infrastructure du Bubble Menu et Endpoint d'Actions

As a développeur,
I want une infrastructure de Bubble Menu TipTap connectée à un endpoint d'actions IA backend,
So that les 9 actions contextuelles puissent être déclenchées sur sélection de texte.

**Acceptance Criteria:**

**Given** que l'éditeur TipTap est actif
**When** l'utilisateur sélectionne du texte
**Then** le Bubble Menu (BubbleMenu.vue) s'affiche avec la liste des actions contextuelles disponibles (ActionMenu.vue)
**And** l'endpoint `POST /api/generate/action` accepte : le type d'action, le texte sélectionné, le contexte (article, mots-clés)
**And** la réponse est streamée via SSE pour les actions de reformulation
**And** le composable `useContextualActions` orchestre l'appel et la gestion du résultat
**And** le composant ActionResult.vue affiche le résultat avec boutons "Accepter" (remplace la sélection) et "Rejeter" (annule)
**And** chaque prompt d'action est externalisé dans `server/prompts/actions/` — NFR14

### Story 4.2 : Actions de Réécriture — Reformuler, Simplifier, Convertir en Liste

As a Arnau (utilisateur),
I want reformuler, simplifier ou convertir en liste une sélection de texte,
So that je puisse améliorer la clarté et la lisibilité de mon contenu rapidement.

**Acceptance Criteria:**

**Given** que l'utilisateur a sélectionné du texte dans l'éditeur
**When** il choisit "Reformuler" dans le Bubble Menu
**Then** la sélection est réécrite dans un style différent en conservant le sens — FR25
**And** le ton Propulsite est maintenu

**Given** que l'utilisateur a sélectionné du texte
**When** il choisit "Simplifier"
**Then** la sélection est réécrite de manière plus simple et accessible — FR26

**Given** que l'utilisateur a sélectionné un paragraphe
**When** il choisit "Convertir en liste"
**Then** le contenu est restructuré en liste à puces — FR27

### Story 4.3 : Actions d'Enrichissement SEO/GEO — Exemple PME, Mot-clé, Statistique, Answer Capsule

As a Arnau (utilisateur),
I want enrichir mon contenu avec des exemples PME, optimiser pour un mot-clé, ajouter des statistiques et créer des answer capsules,
So that mon contenu soit plus riche, plus concret et mieux optimisé SEO/GEO.

**Acceptance Criteria:**

**Given** que l'utilisateur a sélectionné du texte
**When** il choisit "Enrichir avec exemple"
**Then** un exemple grandes marques ramené au contexte PME est inséré — FR28

**Given** que l'utilisateur a sélectionné du texte
**When** il choisit "Optimiser pour mot-clé" et sélectionne un mot-clé dans la liste
**Then** le paragraphe est réécrit avec le mot-clé intégré naturellement — FR29

**Given** que l'utilisateur a sélectionné un emplacement
**When** il choisit "Ajouter statistique sourcée"
**Then** une statistique pertinente avec sa source est insérée — FR30

**Given** que l'utilisateur a sélectionné du texte
**When** il choisit "Créer answer capsule"
**Then** une capsule de 20-25 mots résumant le point clé est créée — FR31

### Story 4.4 : Actions Structurelles — Question et Lien Interne

As a Arnau (utilisateur),
I want reformuler un titre en question et injecter manuellement un lien interne,
So that je puisse optimiser la structure GEO et le maillage de manière ciblée.

**Acceptance Criteria:**

**Given** que l'utilisateur a sélectionné un titre H2 ou H3
**When** il choisit "Formuler en question"
**Then** le titre est reformulé en question pertinente — FR32

**Given** que l'utilisateur a sélectionné du texte
**When** il choisit "Injecter lien interne"
**Then** une liste des articles du blog s'affiche pour choisir la cible
**And** un lien interne est créé sur la sélection vers l'article choisi — FR33
**And** le lien utilise l'extension TipTap `internal-link` pour être traçable

---

## Epic 5 : Optimisation SEO & GEO en Temps Réel

L'utilisateur voit ses scores SEO et GEO se mettre à jour en temps réel pendant l'édition, avec des checklists actionnables, la densité de mots-clés, les NLP terms, et la détection de jargon.

### Story 5.1 : Moteur de Scoring SEO et Panel Principal

As a Arnau (utilisateur),
I want voir un score SEO global et la densité de mes mots-clés en temps réel pendant l'édition,
So that je puisse optimiser mon contenu pour le référencement tout en écrivant.

**Acceptance Criteria:**

**Given** que l'utilisateur édite un article dans l'éditeur
**When** le contenu est modifié
**Then** le composable `useSeoScoring` recalcule le score SEO après un debounce de 300ms — NFR3
**And** le score SEO global (0-100) est affiché via ScoreGauge dans le SeoPanel — FR34
**And** la densité par mot-clé (pilier / moyenne traîne / longue traîne) est affichée avec jauges et cibles — FR35
**And** la hiérarchie des titres Hn est validée (H1 unique, H2 avant H3, pas de saut) — FR37
**And** le store `seo` est mis à jour via la réactivité Pinia
**And** les seuils de densité et règles de scoring sont lus depuis `shared/constants/seo.constants.ts`
**And** le calcul de scoring est implémenté dans `src/utils/seo-calculator.ts`

### Story 5.2 : Checklist SEO et NLP Terms DataForSEO

As a Arnau (utilisateur),
I want voir une checklist SEO et les termes NLP à inclure dans mon article,
So that je m'assure que tous les critères SEO critiques sont respectés.

**Acceptance Criteria:**

**Given** que l'utilisateur édite un article avec des mots-clés définis
**When** le contenu change
**Then** la checklist SEO affiche l'état de présence des mots-clés dans : titre, H1, intro, meta description, H2s, conclusion — FR36
**And** chaque item de la checklist est coché/décoché en temps réel
**And** les NLP terms (termes sémantiques issus de DataForSEO Related Keywords) sont listés — FR38
**And** chaque NLP term est coché automatiquement quand détecté dans le texte — FR38
**And** les composants SeoChecklist.vue et NlpTerms.vue sont implémentés dans le SeoPanel

### Story 5.3 : Moteur de Scoring GEO et Panel Principal

As a Arnau (utilisateur),
I want voir un score GEO composite et le suivi des critères d'optimisation pour les moteurs génératifs,
So that mon contenu soit bien positionné dans les réponses IA (Google AI Overviews, Perplexity).

**Acceptance Criteria:**

**Given** que l'utilisateur édite un article
**When** le contenu est modifié
**Then** le composable `useGeoScoring` recalcule le score GEO après un debounce de 300ms — NFR3
**And** le score GEO composite (extractibilité, fraîcheur, faits, structure) est affiché via ScoreGauge dans le GeoPanel — FR39
**And** la présence d'answer capsules est vérifiée pour chaque H2 — FR40
**And** le % de H2/H3 formulés en questions est mesuré (cible 70%+) — FR41
**And** le compteur de statistiques sourcées est affiché (cible : 3-5 minimum) — FR42
**And** les règles GEO sont configurables via `shared/constants/geo.constants.ts` — NFR13
**And** le calcul est implémenté dans `src/utils/geo-calculator.ts`

### Story 5.4 : Alertes GEO — Paragraphes Longs et Détection de Jargon

As a Arnau (utilisateur),
I want être alerté quand un paragraphe est trop long ou contient du jargon corporate,
So that mon contenu reste facilement extractible par les moteurs génératifs.

**Acceptance Criteria:**

**Given** que l'utilisateur édite un article
**When** un paragraphe dépasse 3 lignes
**Then** le composant ParagraphLength.vue affiche une alerte visuelle sur le paragraphe concerné — FR43
**And** l'alerte indique le nombre de lignes et suggère de raccourcir

**Given** que l'utilisateur édite un article
**When** du jargon corporate est détecté dans le texte
**Then** le système identifie les termes jargonneux et propose des reformulations en langage clair — FR44
**And** la liste des termes jargon est configurable dans les constantes GEO
**And** l'utilisateur peut cliquer sur une suggestion pour appliquer la reformulation

---

## Epic 6 : Maillage Interne & Santé des Cocons

L'utilisateur peut gérer le maillage interne de ses articles : détection d'ancres, injection automatique de liens respectant la hiérarchie de cocon, matrice globale, détection d'orphelins, et liens cross-cocon.

### Story 6.1 : Service Backend de Maillage et Persistance

As a développeur,
I want un service backend qui gère le graphe de maillage interne avec persistance JSON,
So that les liens entre articles soient traçables, persistants et respectent les règles de hiérarchie.

**Acceptance Criteria:**

**Given** que le fichier `data/links/linking-matrix.json` existe (ou est créé vide)
**When** les API de maillage sont appelées
**Then** le service `linking.service.ts` gère le graphe orienté des liens entre articles
**And** les liens respectent la hiérarchie de cocon : Pilier ↔ Intermédiaire ↔ Spécialisé — FR48
**And** les données de maillage sont sauvegardées de manière atomique — FR60, NFR10
**And** l'API expose `GET /api/links/matrix` pour la matrice complète
**And** l'API expose `POST /api/links/suggest` pour les suggestions de liens pour un article
**And** l'API expose `PUT /api/links` pour sauvegarder les liens
**And** chaque lien stocke : sourceSlug, targetSlug, anchorText, position

### Story 6.2 : Détection d'Ancres et Suggestion de Liens Internes

As a Arnau (utilisateur),
I want que le système détecte les phrases-ancres pertinentes et me suggère des liens internes,
So that mon maillage soit pertinent et automatiquement maintenu entre les articles.

**Acceptance Criteria:**

**Given** que l'utilisateur édite un article
**When** il clique sur "Maillage auto" ou ouvre le composant LinkSuggestions
**Then** le système analyse le contenu et détecte les phrases-ancres pertinentes — FR45
**And** des suggestions de liens vers les autres articles du blog sont proposées — FR45
**And** l'utilisateur peut valider ou rejeter chaque suggestion
**And** les liens validés sont injectés automatiquement dans le contenu via l'extension TipTap `internal-link` — FR46
**And** les ancres de maillage persistent entre les régénérations de l'article — FR47
**And** le composable `useInternalLinking` orchestre la logique côté client

### Story 6.3 : Matrice de Maillage Globale et Détection d'Orphelins

As a Arnau (utilisateur),
I want voir une matrice globale de maillage et détecter les articles orphelins,
So that je puisse surveiller la santé du maillage de mes cocons et corriger les manques.

**Acceptance Criteria:**

**Given** que l'utilisateur navigue vers `/linking`
**When** la LinkingMatrixView s'affiche
**Then** une matrice visuelle montre quel article lie vers quel article — FR49
**And** la matrice est organisée par cocon pour faciliter la lecture
**And** les articles orphelins (aucun lien entrant) sont signalés visuellement — FR50
**And** l'utilisateur peut cliquer sur un article orphelin pour ouvrir son éditeur et ajouter du maillage
**And** le store `linking` charge les données depuis `GET /api/links/matrix`
**And** les composants LinkingMatrix.vue et OrphanDetector.vue sont implémentés

### Story 6.4 : Diversité d'Ancres et Liens Cross-Cocon

As a Arnau (utilisateur),
I want que le système vérifie la diversité des textes d'ancre et identifie les opportunités de liens entre cocons,
So that mon maillage soit naturel et maximise les connexions sémantiques entre mes thématiques.

**Acceptance Criteria:**

**Given** que des liens internes existent dans la matrice de maillage
**When** le système analyse le maillage
**Then** il vérifie que les textes d'ancre sont diversifiés (pas le même texte partout) — FR51
**And** une alerte s'affiche si un même texte d'ancre est utilisé plus de 3 fois
**And** le système identifie les opportunités de liens entre cocons différents — FR52
**And** les suggestions cross-cocon sont présentées séparément des liens intra-cocon
**And** ces vérifications sont accessibles depuis la matrice de maillage et depuis le panel de l'éditeur

---

## Epic 7 : Export HTML & Publication

L'utilisateur peut exporter son article en HTML conforme au template Propulsite, avec Schema markup JSON-LD, meta title/description, et mise à jour automatique du statut de l'article.

### Story 7.1 : Export HTML Conforme au Template Propulsite

As a Arnau (utilisateur),
I want exporter mon article en HTML conforme au template Propulsite avec meta title et description,
So that j'obtienne un fichier prêt à publier directement sur mon blog sans retouche.

**Acceptance Criteria:**

**Given** que l'article est complet dans l'éditeur avec meta title et meta description
**When** l'utilisateur clique sur "Exporter en HTML" (ExportButton.vue)
**Then** l'API `POST /api/export/:slug` génère le HTML à partir du contenu TipTap
**And** le HTML est conforme au `templateArticle.html` (Tailwind CSS, polices DM Serif Text + Red Hat Text, structure hero → sommaire → article → conclusion) — FR53
**And** le meta title et la meta description sont inclus dans les balises `<head>` — FR56
**And** le service `export.service.ts` utilise le template HTML depuis `src/assets/templates/templateArticle.html` — NFR15
**And** un aperçu du HTML généré est disponible via ExportPreview.vue avant téléchargement
**And** le fichier HTML est téléchargeable par l'utilisateur

### Story 7.2 : Schema Markup JSON-LD et Mise à Jour du Statut

As a Arnau (utilisateur),
I want que l'export inclue le Schema markup et que le statut de l'article soit automatiquement mis à jour,
So that mon article soit optimisé pour les rich snippets Google et que mon dashboard reflète l'avancement.

**Acceptance Criteria:**

**Given** que l'utilisateur exporte un article
**When** l'export HTML est généré
**Then** le Schema markup JSON-LD est injecté : Article (titre, auteur, date), FAQPage (questions des H2), BreadcrumbList (cocon → article) — FR54
**And** le JSON-LD est validé syntaxiquement avant injection
**And** après export réussi, le statut de l'article passe à "publié" dans `BDD_Articles_Blog.json` — FR55
**And** la mise à jour du statut utilise la sauvegarde atomique — NFR10
**And** le dashboard reflète immédiatement le nouveau statut de l'article
**And** l'API `PUT /api/articles/:slug/status` est utilisée pour la mise à jour
