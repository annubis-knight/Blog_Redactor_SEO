---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# Blog Redactor SEO - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Blog Redactor SEO, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1 : L'utilisateur peut voir les onglets du Moteur organisés en 3 phases visuelles (Générer, Valider, Assigner)
- FR2 : L'utilisateur peut naviguer librement entre les 3 phases et tous les onglets sans aucun blocage
- FR3 : L'utilisateur doit sélectionner un article avant d'utiliser le Moteur (toggle article obligatoire)
- FR4 : L'utilisateur peut voir l'onglet Local qui fusionne les anciens onglets Local/National et Maps & GBP en deux sections dans un même onglet
- FR5 : Le Content Gap n'apparaît pas dans le Moteur (retiré car déjà dans le Brief)
- FR6 : L'utilisateur peut lancer une analyse Discovery (IA) pour produire des mots-clés candidats
- FR7 : L'utilisateur peut lancer un scan Douleur Intent (radar) pour détecter les résonances
- FR8 : L'utilisateur peut traduire une douleur client en mots-clés candidats via l'onglet Douleur
- FR9 : Les onglets Discovery et Douleur Intent sont optionnels et se verrouillent si des mots-clés sont déjà validés
- FR10 : L'utilisateur peut vérifier les mots-clés candidats via la Validation multi-sources
- FR11 : L'utilisateur peut analyser l'intention de recherche via l'Exploration (SERP + autocomplete)
- FR12 : L'utilisateur peut consulter les données DataForSEO d'un mot-clé (volume, difficulté, CPC) via l'Audit
- FR13 : L'utilisateur peut comparer les données Local/National et consulter les résultats Maps & GBP dans l'onglet Local fusionné
- FR14 : L'utilisateur peut définir le mot-clé capitaine, les lieutenants et le lexique pour un article
- FR15 : L'onglet Assignation affiche un message explicatif avec lien vers l'Audit si aucun mot-clé capitaine n'est validé
- FR16 : L'utilisateur peut voir des dots de progression (●/○) à côté de chaque article dans la liste du Moteur
- FR17 : Le système coche automatiquement les étapes complétées quand un onglet produit un résultat (Discovery fait, Radar fait, Intention faite, Audit fait, Local fait, Capitaine choisi, Assignation faite)
- FR18 : Un bandeau de suggestion apparaît quand tous les checks d'une phase sont complétés pour l'article en cours
- FR19 : L'utilisateur peut ignorer le bandeau et rester dans la phase actuelle
- FR20 : L'utilisateur peut voir un résumé du contexte stratégique du Cerveau (cible, angle, promesse) dans une section collapsable en haut du Moteur
- FR21 : Le système injecte automatiquement le contexte stratégique du Cerveau dans les prompts IA du Moteur (Discovery, PainTranslator, etc.) sans action utilisateur
- FR22 : L'utilisateur peut voir un indicateur d'alignement stratégique pour chaque mot-clé dans l'Audit (matching textuel cible/localisation)
- FR23 : L'utilisateur peut accéder au Labo depuis la Navbar et le Dashboard
- FR24 : L'utilisateur peut utiliser les mêmes composants que le Moteur (Discovery, Douleur Intent, Exploration, Audit, Local) en mode recherche libre — sans sélectionner d'article ni de cocon
- FR25 : L'utilisateur peut saisir un mot-clé libre dans le Labo et lancer les analyses disponibles
- FR26 : Le système sauvegarde les résultats de chaque service (Discovery, Audit, Validation, Local, Intent) pour chaque article
- FR27 : Le système recharge automatiquement les résultats sauvegardés quand l'utilisateur revient sur un article
- FR28 : Le système ne relance pas un appel API si un résultat valide existe déjà en cache pour la même requête

### NonFunctional Requirements

- NFR1 : Les réponses API locales (hors appels externes) sont retournées en < 200ms
- NFR2 : Le streaming SSE (Claude) affiche le premier token en < 2s
- NFR3 : Le chargement d'une vue (changement de route) se fait en < 500ms
- NFR4 : Le cache hit rate DataForSEO atteint > 90% après première utilisation d'un mot-clé
- NFR5 : Aucun appel API externe n'est effectué si un résultat valide existe en cache
- NFR6 : Les résultats de tous les services sont persistés sur disque (fichiers JSON) et survivent au redémarrage de l'app
- NFR7 : La taille maximale d'un fichier JSON en mémoire est de 5MB (limite Express actuelle)
- NFR8 : Les composants du Moteur (Discovery, Douleur Intent, Exploration, Audit, Local) fonctionnent en deux modes : contextualisé (article sélectionné) et libre (Labo, sans article)
- NFR9 : L'enrichissement des prompts IA par le contexte du Cerveau est optionnel — si aucune stratégie n'existe pour le cocon, les prompts fonctionnent sans enrichissement
- NFR10 : Le store article-progress avec completedChecks[] est la source unique de vérité pour la progression par article
- NFR11 : Les composants réutilisés entre Moteur et Labo ne sont pas dupliqués — un seul composant avec un prop de mode (contextualisé / libre)
- NFR12 : Les prompts IA restent dans des fichiers .md séparés — l'enrichissement stratégique est un pré-processing en amont, pas une modification du prompt source

### Additional Requirements

- Brownfield : la restructuration préserve les composants internes existants — seuls les wrappers (MoteurView) et le système de progression changent
- Pattern dual-mode : prop `mode: 'workflow' | 'libre'` sur chaque composant Moteur réutilisé dans le Labo
- 7 checks standardisés : `discovery_done`, `radar_done`, `intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done`
- Emit `check-completed` : chaque composant Moteur émet un événement quand il produit un résultat en mode workflow
- Pattern cache étendu : `getOrFetch<T>()` uniforme pour tous les services API externes (DataForSEO, Discovery, Intent, Validation, Local, Autocomplete)
- Enrichissement prompts : `loadPrompt()` injecte `{{strategy_context}}` — remplacé par string vide si pas de stratégie
- 2 nouvelles routes API : `POST /api/articles/:slug/progress/check` + `GET /api/cocoons/:id/strategy/context`
- 4 nouveaux composants à créer : `MoteurPhaseNavigation.vue`, `PhaseTransitionBanner.vue`, `AssignmentGate.vue`, `LaboView.vue`
- Enforcement guidelines : utiliser apiGet/apiPost (jamais fetch), envelopper réponses dans { data: T }, composition API Pinia, tests dans tests/unit/ miroir, logger (jamais console.log), loadPrompt() (jamais strings inline), readJson/writeJson (jamais fs directement)
- Anti-patterns : pas de JSON sans schema Zod, pas d'appel API sans vérifier cache, pas de duplication composant Moteur/Labo, pas de gating dur (navigation libre), pas de modification de prompt .md (pré-processing)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | 3 phases visuelles (Générer, Valider, Assigner) |
| FR2 | Epic 1 | Navigation libre entre phases |
| FR3 | Epic 1 | Sélection article obligatoire |
| FR4 | Epic 1 | Fusion Local + Maps |
| FR5 | Epic 1 | Retrait Content Gap du Moteur |
| FR6 | Epic 1 | Discovery IA |
| FR7 | Epic 1 | Scan Douleur Intent |
| FR8 | Epic 1 | Traduction douleur → mots-clés |
| FR9 | Epic 1 | Verrouillage conditionnel Discovery/Douleur |
| FR10 | Epic 1 | Validation multi-sources |
| FR11 | Epic 1 | Exploration SERP + autocomplete |
| FR12 | Epic 1 | Audit DataForSEO |
| FR13 | Epic 1 | Local fusionné |
| FR14 | Epic 1 | Assignation capitaine/lieutenants/lexique |
| FR15 | Epic 1 | Message inline Assignation |
| FR16 | Epic 2 | Dots de progression par article |
| FR17 | Epic 2 | Checks automatiques |
| FR18 | Epic 2 | Bandeaux de transition |
| FR19 | Epic 2 | Ignorer le bandeau |
| FR20 | Epic 3 | Contexte stratégique collapsable |
| FR21 | Epic 3 | Enrichissement prompts IA |
| FR22 | Epic 3 | Indicateur alignement stratégique |
| FR23 | Epic 5 | Accès Labo depuis Navbar/Dashboard |
| FR24 | Epic 5 | Composants Moteur en mode libre |
| FR25 | Epic 5 | Saisie mot-clé libre |
| FR26 | Epic 4 | Sauvegarde résultats par article |
| FR27 | Epic 4 | Rechargement automatique résultats |
| FR28 | Epic 4 | Pas de re-call API si cache valide |

## Epic List

### Epic 1 : Moteur structuré en 3 phases
L'utilisateur navigue dans un Moteur organisé en 3 phases visuelles claires (Générer, Valider, Assigner) avec fusion Local+Maps, retrait Content Gap, et message inline dans l'Assignation.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15

### Epic 2 : Progression automatique et guidage
L'utilisateur voit sa progression par article (dots ●/○) dans la liste et reçoit des suggestions de transition quand une phase est complète.
**FRs covered:** FR16, FR17, FR18, FR19

### Epic 3 : Pont Cerveau→Moteur
Le contexte stratégique du Cerveau (cible, angle, promesse) est visible dans le Moteur et enrichit silencieusement tous les prompts IA.
**FRs covered:** FR20, FR21, FR22

### Epic 4 : Cache systématique et persistance
L'utilisateur retrouve tous ses résultats à la reprise d'un article sans re-appels API. Le pattern cache est étendu à tous les services.
**FRs covered:** FR26, FR27, FR28

### Epic 5 : Labo — Recherche libre
L'utilisateur vérifie un mot-clé hors workflow (sans article ni cocon) depuis une vue dédiée accessible dans la Navbar.
**FRs covered:** FR23, FR24, FR25

---

## Epic 1 : Moteur structuré en 3 phases

L'utilisateur navigue dans un Moteur organisé en 3 phases visuelles claires (Générer, Valider, Assigner) avec fusion Local+Maps, retrait Content Gap, et message inline dans l'Assignation. Les composants internes des onglets existants sont préservés — seul le wrapper MoteurView et la navigation changent.

### Story 1.1 : Layout 3 phases, navigation et sélection article

As a consultant SEO,
I want le Moteur organisé en 3 phases visuelles avec navigation libre et sélection d'article obligatoire,
So that je comprends immédiatement la structure du workflow sans me perdre dans 10 onglets plats.

**Acceptance Criteria:**

**Given** l'utilisateur accède à la vue Moteur
**When** il arrive sur la page
**Then** il voit 3 groupes de phases visuellement distincts : ① Générer, ② Valider, ③ Assigner
**And** chaque phase affiche les noms de ses onglets

**Given** l'utilisateur est sur la Phase ① Générer
**When** il clique sur la Phase ② Valider ou ③ Assigner
**Then** il navigue directement vers la phase choisie sans aucun blocage
**And** il peut revenir à n'importe quelle phase à tout moment

**Given** l'utilisateur arrive sur le Moteur sans article sélectionné
**When** il n'a pas encore choisi d'article via le SelectedArticlePanel
**Then** les onglets du Moteur ne sont pas accessibles
**And** un message invite à sélectionner un article

**Given** l'utilisateur sélectionne un article dans le SelectedArticlePanel
**When** l'article est sélectionné
**Then** tous les onglets des 3 phases deviennent accessibles
**And** la Phase ① Générer est affichée par défaut

### Story 1.2 : Phase ① Générer — Discovery, Douleur Intent, Douleur avec verrouillage

As a consultant SEO,
I want les onglets Discovery, Douleur Intent et Douleur regroupés dans la Phase Générer avec verrouillage intelligent,
So that je sais quels outils utiliser pour trouver des mots-clés candidats et je ne perds pas de temps si j'ai déjà des mots-clés validés.

**Acceptance Criteria:**

**Given** un article est sélectionné et aucun mot-clé n'est encore validé
**When** l'utilisateur ouvre la Phase ① Générer
**Then** les onglets Discovery (FR6), Douleur Intent (FR7) et Douleur (FR8) sont tous accessibles
**And** l'utilisateur peut lancer une analyse Discovery IA
**And** l'utilisateur peut lancer un scan Douleur Intent (radar)
**And** l'utilisateur peut traduire une douleur en mots-clés candidats

**Given** un article est sélectionné et des mots-clés sont déjà validés pour cet article
**When** l'utilisateur ouvre la Phase ① Générer
**Then** les onglets Discovery et Douleur Intent affichent un état verrouillé avec un message explicatif
**And** l'onglet Douleur reste accessible (traduction libre)

**Given** l'utilisateur lance Discovery IA
**When** l'analyse se termine avec des résultats
**Then** les mots-clés candidats sont affichés
**And** les composants internes existants (KeywordDiscoveryTab, DouleurIntentScanner, PainTranslator) fonctionnent comme avant

### Story 1.3 : Phase ② Valider — Validation, Exploration, Audit, Local fusionné + retrait Content Gap

As a consultant SEO,
I want les onglets de validation regroupés dans la Phase Valider avec Local fusionné et sans Content Gap,
So that je valide mes mots-clés candidats avec toutes les données disponibles dans un espace épuré.

**Acceptance Criteria:**

**Given** un article est sélectionné
**When** l'utilisateur ouvre la Phase ② Valider
**Then** il voit 4 onglets : Validation, Exploration, Audit, Local
**And** le Content Gap n'apparaît PAS dans le Moteur

**Given** l'utilisateur ouvre l'onglet Validation
**When** il lance la vérification
**Then** la Validation multi-sources (FR10) fonctionne comme avant avec les composants existants

**Given** l'utilisateur ouvre l'onglet Exploration
**When** il lance l'analyse
**Then** l'Exploration SERP + autocomplete (FR11) fonctionne comme avant

**Given** l'utilisateur ouvre l'onglet Audit
**When** il consulte les données d'un mot-clé
**Then** les données DataForSEO (volume, difficulté, CPC) s'affichent (FR12)

**Given** l'utilisateur ouvre l'onglet Local
**When** l'onglet s'affiche
**Then** il voit deux sections dans un même onglet : ① Comparaison Local/National (ex-LocalComparisonStep) et ② Maps & GBP (ex-MapsStep)
**And** les deux sections fonctionnent comme avant dans leurs composants internes respectifs

### Story 1.4 : Phase ③ Assigner — Assignation avec gating souple

As a consultant SEO,
I want l'onglet Assignation dans la Phase Assigner avec un message d'aide si je n'ai pas de capitaine validé,
So that je suis guidé vers l'Audit si nécessaire au lieu d'être bloqué.

**Acceptance Criteria:**

**Given** un article est sélectionné et au moins un mot-clé est validé comme capitaine dans l'Audit
**When** l'utilisateur ouvre la Phase ③ Assigner
**Then** l'onglet Assignation affiche l'interface habituelle (KeywordEditor)
**And** l'utilisateur peut définir le capitaine, les lieutenants et le lexique (FR14)

**Given** un article est sélectionné mais aucun mot-clé n'est validé comme capitaine
**When** l'utilisateur ouvre la Phase ③ Assigner
**Then** un message explicatif (AssignmentGate) s'affiche : "Aucun mot-clé capitaine validé"
**And** le message contient un lien cliquable vers l'onglet Audit (Phase ② Valider)
**And** la navigation n'est PAS bloquée — l'utilisateur peut quand même accéder à l'Assignation

**Given** l'utilisateur clique sur le lien vers l'Audit dans le message AssignmentGate
**When** la navigation se fait
**Then** l'utilisateur est redirigé vers l'onglet Audit dans la Phase ② Valider

---

## Epic 2 : Progression automatique et guidage

L'utilisateur voit sa progression par article (dots ●/○) dans la liste du Moteur et reçoit des suggestions de transition quand une phase est complète. Le store `article-progress` avec `completedChecks[]` est la source unique de vérité (NFR10).

### Story 2.1 : Dots de progression par article dans la liste

As a consultant SEO,
I want voir des dots de progression (●/○) à côté de chaque article dans la liste du Moteur,
So that je sais immédiatement quels articles sont avancés et lesquels restent à traiter.

**Acceptance Criteria:**

**Given** l'utilisateur est sur le Moteur avec la liste des articles affichée
**When** un article a des checks complétés dans article-progress (completedChecks[])
**Then** des dots ● (remplis) et ○ (vides) s'affichent à côté du nom de l'article
**And** le nombre total de dots est 7 (un par check standardisé)

**Given** un article n'a aucun check complété
**When** il s'affiche dans la liste
**Then** 7 dots vides (○○○○○○○) apparaissent

**Given** un article a 4 checks complétés sur 7
**When** il s'affiche dans la liste
**Then** 4 dots remplis et 3 vides (●●●●○○○) apparaissent
**And** les dots sont groupés visuellement par phase (2 Générer + 3 Valider + 2 Assigner)

### Story 2.2 : Checks automatiques via emit check-completed

As a consultant SEO,
I want que le système coche automatiquement les étapes quand un onglet produit un résultat,
So that ma progression se met à jour sans action manuelle de ma part.

**Acceptance Criteria:**

**Given** un article est sélectionné et l'utilisateur est dans le Moteur
**When** Discovery IA termine son analyse avec des résultats
**Then** le composant émet `check-completed` avec la valeur `discovery_done`
**And** MoteurView intercepte l'événement et appelle `progressStore.addCheck(slug, 'discovery_done')`
**And** le backend persiste le check via `POST /api/articles/:slug/progress/check`

**Given** un check est déjà complété pour un article (ex: `discovery_done`)
**When** l'utilisateur relance Discovery pour le même article
**Then** le check n'est PAS ajouté en doublon dans completedChecks[]

**Given** les 7 checks standardisés sont : `discovery_done`, `radar_done`, `intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done`
**When** chaque onglet correspondant produit un résultat
**Then** le check correspondant est émis et persisté
**And** les dots de progression (Story 2.1) se mettent à jour en temps réel

**Given** la route backend `POST /api/articles/:slug/progress/check` reçoit un check
**When** le check est valide (fait partie des 7 standardisés)
**Then** le check est ajouté à `completedChecks[]` dans `data/article-progress.json`
**And** la réponse est `{ data: { slug, completedChecks } }`

### Story 2.3 : Bandeaux de transition entre phases

As a consultant SEO,
I want un bandeau de suggestion quand tous les checks d'une phase sont complétés,
So that je sais quand passer à la phase suivante sans être bloqué si je veux rester.

**Acceptance Criteria:**

**Given** l'article en cours a tous les checks de la Phase ① Générer complétés (`discovery_done` + `radar_done`)
**When** l'utilisateur est dans la Phase ① Générer
**Then** un bandeau PhaseTransitionBanner s'affiche : "Phase Générer complète — passer à Valider ?"
**And** le bandeau contient un bouton pour naviguer vers la Phase ② Valider

**Given** l'article en cours a tous les checks de la Phase ② Valider complétés (`intent_done` + `audit_done` + `local_done`)
**When** l'utilisateur est dans la Phase ② Valider
**Then** un bandeau s'affiche : "Phase Valider complète — passer à Assigner ?"

**Given** un bandeau de transition est affiché
**When** l'utilisateur clique sur le bouton de navigation
**Then** il est redirigé vers la phase suivante

**Given** un bandeau de transition est affiché
**When** l'utilisateur l'ignore et continue à travailler dans la phase actuelle
**Then** le bandeau reste visible mais ne bloque rien
**And** l'utilisateur peut fermer/réduire le bandeau

---

## Epic 3 : Pont Cerveau→Moteur

Le contexte stratégique du Cerveau (cible, angle, promesse) est visible dans le Moteur et enrichit silencieusement tous les prompts IA. L'enrichissement est optionnel (NFR9) — si pas de stratégie, les prompts fonctionnent normalement.

### Story 3.1 : Contexte stratégique collapsable dans le Moteur

As a consultant SEO,
I want voir un résumé du contexte stratégique du Cerveau (cible, angle, promesse) en haut du Moteur,
So that je garde ma stratégie en tête pendant la recherche de mots-clés.

**Acceptance Criteria:**

**Given** un article est sélectionné dans un cocon qui a une stratégie définie dans le Cerveau
**When** l'utilisateur est sur le Moteur
**Then** une section collapsable MoteurContextRecap s'affiche en haut, montrant : cible, angle, promesse du cocon
**And** la section est fermée par défaut (collapsée)

**Given** un article est sélectionné dans un cocon qui n'a PAS de stratégie définie
**When** l'utilisateur est sur le Moteur
**Then** la section MoteurContextRecap ne s'affiche PAS (pas de section vide)

**Given** la route backend `GET /api/cocoons/:id/strategy/context` est appelée
**When** une stratégie existe pour le cocon
**Then** la réponse contient `{ data: { cible, angle, promesse, ... } }`

**Given** la route backend `GET /api/cocoons/:id/strategy/context` est appelée
**When** aucune stratégie n'existe pour le cocon
**Then** la réponse contient `{ data: null }`

### Story 3.2 : Enrichissement automatique des prompts IA

As a consultant SEO,
I want que le contexte stratégique du Cerveau soit injecté automatiquement dans les prompts IA du Moteur,
So that les suggestions IA (Discovery, PainTranslator, etc.) sont alignées avec ma stratégie sans action de ma part.

**Acceptance Criteria:**

**Given** un prompt IA est chargé via `loadPrompt()` avec un `cocoonId` fourni
**When** une stratégie existe pour ce cocon dans `data/strategies/`
**Then** la variable `{{strategy_context}}` dans le prompt est remplacée par le résumé stratégique (cible, angle, promesse)
**And** le prompt enrichi est envoyé à Claude API

**Given** un prompt IA est chargé via `loadPrompt()` avec un `cocoonId` fourni
**When** aucune stratégie n'existe pour ce cocon
**Then** la variable `{{strategy_context}}` est remplacée par une string vide
**And** le prompt fonctionne normalement sans enrichissement (NFR9)

**Given** un prompt IA est chargé via `loadPrompt()` sans `cocoonId` (ex: depuis le Labo)
**When** le prompt est traité
**Then** `{{strategy_context}}` est remplacé par une string vide
**And** aucun appel au service de stratégie n'est effectué

**Given** les prompts `.md` dans `server/prompts/`
**When** l'enrichissement est implémenté
**Then** les fichiers `.md` sources ne sont PAS modifiés — l'enrichissement est un pré-processing en amont (NFR12)

### Story 3.3 : Indicateur d'alignement stratégique dans l'Audit

As a consultant SEO,
I want voir un indicateur d'alignement stratégique pour chaque mot-clé dans l'Audit,
So that je sais immédiatement quels mots-clés correspondent à ma stratégie de cocon.

**Acceptance Criteria:**

**Given** l'utilisateur est dans l'onglet Audit avec des données DataForSEO affichées
**When** une stratégie existe pour le cocon de l'article en cours
**Then** une colonne "Alignement" s'affiche dans le KeywordAuditTable
**And** chaque mot-clé affiche un score/indicateur basé sur le matching textuel avec la cible et la localisation de la stratégie

**Given** l'utilisateur est dans l'Audit et aucune stratégie n'existe pour le cocon
**When** le tableau s'affiche
**Then** la colonne "Alignement" ne s'affiche PAS (pas de colonne vide)

**Given** un mot-clé contient des termes qui matchent la cible de la stratégie
**When** l'indicateur d'alignement est calculé
**Then** le score est plus élevé (ex: badge vert ou score numérique)
**And** le calcul est un matching textuel simple (pas d'appel IA)

---

## Epic 4 : Cache systématique et persistance

L'utilisateur retrouve tous ses résultats à la reprise d'un article sans re-appels API. Le pattern cache `getOrFetch<T>()` est étendu uniformément à tous les services API externes (NFR5, NFR6).

### Story 4.1 : Pattern cache getOrFetch uniforme pour tous les services

As a consultant SEO,
I want que tous les résultats d'API externes soient cachés automatiquement,
So that je ne paie jamais deux fois pour la même requête et que l'app reste rapide.

**Acceptance Criteria:**

**Given** le pattern cache DataForSEO existant dans `dataforseo.service.ts`
**When** le pattern `getOrFetch<T>()` est extrait et uniformisé
**Then** une fonction utilitaire est disponible pour tous les services backend

**Given** un service (Discovery, Intent, Validation, Local, Autocomplete) reçoit une requête
**When** un résultat valide existe déjà en cache (fichier JSON sur disque) pour la même clé
**Then** le résultat est retourné depuis le cache sans appel API externe (NFR5)
**And** la réponse est retournée en < 200ms (NFR1)

**Given** un service reçoit une requête sans résultat en cache
**When** l'appel API externe est effectué et retourne un résultat
**Then** le résultat est sauvegardé sur disque (fichier JSON) via `writeJson()` (NFR6)
**And** les prochaines requêtes identiques utiliseront le cache

**Given** l'application est redémarrée
**When** un service reçoit une requête pour une clé déjà cachée
**Then** le résultat est rechargé depuis le fichier JSON sur disque
**And** aucun appel API externe n'est effectué

### Story 4.2 : Rechargement automatique des résultats par article

As a consultant SEO,
I want que tous les résultats se rechargent automatiquement quand je reviens sur un article,
So that je reprends exactement là où je m'étais arrêté sans manipulation.

**Acceptance Criteria:**

**Given** un article a des résultats sauvegardés (Discovery, Audit, Validation, Local, Intent)
**When** l'utilisateur sélectionne cet article dans le Moteur
**Then** tous les stores frontend se peuplent automatiquement avec les données cachées
**And** les composants affichent les résultats sans re-appels API

**Given** un article n'a aucun résultat sauvegardé
**When** l'utilisateur le sélectionne
**Then** les stores sont dans leur état initial (vides)
**And** l'utilisateur peut lancer les analyses normalement

**Given** l'utilisateur change d'article dans le Moteur
**When** un nouvel article est sélectionné
**Then** les résultats de l'ancien article sont remplacés par ceux du nouvel article (ou vidés si aucun cache)
**And** les dots de progression reflètent l'état du nouvel article

---

## Epic 5 : Labo — Recherche libre

L'utilisateur vérifie un mot-clé hors workflow (sans article ni cocon) depuis une vue dédiée. Les composants sont les mêmes que le Moteur avec `mode='libre'` (NFR8, NFR11).

### Story 5.1 : Vue LaboView, route /labo et accès Navbar/Dashboard

As a consultant SEO,
I want accéder au Labo depuis la Navbar et le Dashboard pour faire de la recherche libre,
So that je vérifie une intuition sur un mot-clé en quelques clics sans casser mon workflow.

**Acceptance Criteria:**

**Given** l'utilisateur est n'importe où dans l'application
**When** il clique sur "Labo" dans la Navbar
**Then** il est redirigé vers la route `/labo`
**And** la vue LaboView s'affiche avec un champ de saisie de mot-clé libre

**Given** l'utilisateur est sur le Dashboard
**When** il clique sur le lien/bouton d'accès au Labo
**Then** il est redirigé vers `/labo`

**Given** l'utilisateur est sur le Labo
**When** il saisit un mot-clé dans le champ libre (ex: "erp cloud pme")
**Then** le mot-clé est prêt à être utilisé comme entrée pour les composants d'analyse
**And** aucune sélection d'article ou de cocon n'est requise

**Given** la route `/labo` est configurée dans Vue Router
**When** l'utilisateur accède directement à `/labo`
**Then** LaboView se charge en lazy loading (< 500ms — NFR3)

### Story 5.2 : Composants Moteur en mode libre dans le Labo

As a consultant SEO,
I want utiliser les mêmes outils que le Moteur (Discovery, Douleur Intent, Exploration, Audit, Local) en mode libre dans le Labo,
So that j'ai les mêmes capacités d'analyse sans le contexte d'un article.

**Acceptance Criteria:**

**Given** l'utilisateur est dans le Labo avec un mot-clé saisi
**When** il lance Discovery, Douleur Intent, Exploration, Audit ou Local
**Then** chaque composant fonctionne avec `mode='libre'` et `keywordQuery` comme entrée
**And** aucun `articleSlug` ni `cocoonId` n'est passé aux composants

**Given** un composant est en `mode='libre'`
**When** il produit un résultat
**Then** il n'émet PAS `check-completed` (pas de progression en mode libre)
**And** les résultats ne sont PAS persistés en cache lié à un article

**Given** un composant est en `mode='libre'`
**When** il a besoin d'appeler une API
**Then** il utilise le même service backend que le mode workflow
**And** il n'y a PAS de composant dupliqué entre Moteur et Labo (NFR11)

**Given** les composants du Moteur existants
**When** ils sont adaptés pour le dual-mode
**Then** ils acceptent une prop `mode: 'workflow' | 'libre'` (NFR8)
**And** en mode `workflow`, ils utilisent `articleSlug` et émettent `check-completed`
**And** en mode `libre`, ils utilisent `keywordQuery` et n'émettent pas de check
