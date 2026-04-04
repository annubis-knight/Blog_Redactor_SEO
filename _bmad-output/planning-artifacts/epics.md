---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-31.md'
previousEpicsVersion: 'Epics 1-5 implémentés (commit c21a56e) — basés sur PRD pré-brainstorming 2026-03-31'
updateReason: 'Alignement avec PRD et Architecture mis à jour post-brainstorming 2026-03-31 — Phase ② Valider restructurée en 3 sous-onglets (Capitaine/Lieutenants/Lexique), extraction Intention/Audit/Local vers Dashboard, suppression Phase ③ Assigner'
---

# Blog Redactor SEO - Epic Breakdown (Mise à jour post-brainstorming 2026-03-31)

## Overview

Ce document fournit le découpage complet en epics et stories pour Blog Redactor SEO. Il intègre les changements majeurs issus du brainstorming du 2026-03-31 : restructuration du Moteur en 2 phases (suppression Phase ③ Assigner), workflow GO/NO-GO en 3 sous-onglets séquentiels (Capitaine/Lieutenants/Lexique), extraction Intention/Audit/Local vers Dashboard indépendant.

**Contexte :** Les Epics 1-5 originaux ont été implémentés (commit c21a56e, 1222 tests). Les nouveaux epics couvrent les fonctionnalités manquantes introduites par la mise à jour du PRD.

## Requirements Inventory

### Functional Requirements

- FR1 : L'utilisateur peut voir les onglets du Moteur organisés en 2 phases visuelles (Générer, Valider)
- FR2 : L'utilisateur peut naviguer librement entre les 2 phases et tous les onglets sans aucun blocage
- FR3 : L'utilisateur doit sélectionner un article avant d'utiliser le Moteur (toggle article obligatoire)
- FR4 : L'utilisateur peut voir l'onglet Local qui fusionne les anciens onglets Local/National et Maps & GBP en deux sections dans un même onglet
- FR5 : Le Content Gap n'apparaît pas dans le Moteur (retiré car déjà dans le Brief)
- FR6 : L'utilisateur peut lancer une analyse Discovery (IA) pour produire des mots-clés candidats
- FR7 : L'utilisateur peut lancer un scan Douleur Intent (radar) pour détecter les résonances
- FR8 : L'utilisateur peut traduire une douleur client en mots-clés candidats via l'onglet Douleur
- FR9 : Les onglets Discovery et Douleur Intent sont optionnels et se verrouillent si des mots-clés sont déjà validés
- FR10 : Le mot-clé Capitaine arrive pré-rempli depuis la Phase Cerveau ou la Phase ① Générer. L'utilisateur peut saisir un mot-clé alternatif et naviguer dans l'historique via un slider
- FR11 : Le système affiche un feu tricolore GO/ORANGE/NO-GO avec un score global calculé à partir de 6 KPIs : Volume, KD, CPC, PAA pertinence, Intent match, Autocomplete
- FR12 : Les seuils de chaque KPI sont contextuels selon le niveau d'article (Pilier/Intermédiaire/Spécifique). Par exemple Volume VERT : >1000 (Pilier), >200 (Intermédiaire), >30 (Spécifique)
- FR13 : Le CPC est un KPI asymétrique : CPC > 2€ = bonus vert, CPC 0-2€ = neutre, jamais de rouge
- FR14 : Si tous les signaux sont à zéro (volume=0 ET PAA=0 ET autocomplete=0), le verdict est NO-GO automatique avec raison "Aucun signal détecté"
- FR15 : Pour les mots-clés longue traîne (3+ mots) avec données faibles, le système découpe automatiquement en racine(s) et affiche les KPIs de la racine en section "Analyse racine" — le verdict reste sur le mot-clé original
- FR16 : Chaque KPI est affiché avec une barre de progression et les zones vert/orange/rouge visibles. Les seuils appliqués sont visibles au survol (tooltip)
- FR17 : Un panel IA expert SEO s'auto-génère en streaming dès que les KPIs sont disponibles. Le panel est dépliable et ne touche JAMAIS au feu tricolore (complément d'information uniquement)
- FR18 : L'utilisateur peut forcer GO sur un verdict ORANGE ou ROUGE (libre arbitre total)
- FR19 : Le NO-GO explique POURQUOI et oriente — trois catégories : "Trop longue traîne" / "KPIs faibles" / "Hors sujet"
- FR20 : L'utilisateur verrouille le Capitaine via un bouton "Valider ce Capitaine" — le verrouillage débloque le sous-onglet Lieutenants. Un mécanisme lock/unlock (cadenas) permet de déverrouiller
- FR21 : Le sous-onglet affiche le Capitaine verrouillé et le niveau d'article en en-tête
- FR22 : L'utilisateur lance l'analyse SERP via un bouton "Analyser SERP" — scraping des top 3-10 résultats (curseur configurable, défaut 10)
- FR23 : Le scraping SERP alimente 3 sections dépliables : Structure Hn concurrents (H2 fréquents avec % récurrence), PAA associés (N+2 de pertinence), Groupes de mots-clés (issus de la Phase Cerveau)
- FR24 : Les candidats Lieutenants sont présentés avec des badges de provenance multi-source [SERP] [PAA] [Groupe] et un badge de pertinence (Fort/Moyen/Faible) basé sur la complémentarité avec le Capitaine
- FR25 : L'utilisateur sélectionne les Lieutenants via checkboxes. Un compteur indique le nombre recommandé selon le niveau : Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3
- FR26 : Le curseur SERP est intelligent : sous le défaut = filtre local instantané, au-dessus du défaut = scraping complémentaire
- FR27 : Un panel IA dépliable recommande une structure Hn avec les Lieutenants sélectionnés
- FR28 : L'utilisateur verrouille les Lieutenants via "Valider les Lieutenants" — le verrouillage débloque le sous-onglet Lexique
- FR29 : Le Lexique est extrait par analyse TF-IDF des contenus SERP déjà scrapés à l'étape Lieutenants — aucune nouvelle requête API
- FR30 : Les termes sont classés en 3 niveaux : Obligatoire (70%+ des concurrents), Différenciateur (30-70%), Optionnel (<30%) — avec densité de récurrence par page (ex: ×4.2/page)
- FR31 : L'utilisateur valide les termes via checkboxes. Les termes Obligatoires sont pré-cochés
- FR32 : Un panel IA dépliable fournit une analyse lexicale expert avec recommandations
- FR33 : L'utilisateur valide le Lexique via "Valider le Lexique" — les résultats finaux (capitaine, lieutenants[], lexique[]) sont écrits dans le store ArticleKeywords
- FR34 : Aucune action automatique au changement de sous-onglet — l'utilisateur déclenche tout manuellement
- FR35 : Les KPIs bruts sont TOUJOURS visibles — libre arbitre > algorithme
- FR36 : La persistance des résultats suit le pattern cache TTL existant avec possibilité de refresh
- FR37 : Les onglets Intention (SERP intent), Audit (cocon complet) et Local (local vs national + Maps) sont retirés de la Phase ② Valider du Moteur
- FR38 : Ces fonctionnalités sont accessibles dans une vue Dashboard indépendante, découplée du workflow de validation
- FR39 : Les phase checks du Moteur sont modifiés : `capitaine_locked + lieutenants_locked + lexique_validated` remplacent `intent_done + audit_done + local_done`
- FR40 : L'utilisateur peut voir des dots de progression (●/○) à côté de chaque article dans la liste du Moteur
- FR41 : Le système coche automatiquement les étapes complétées : Discovery fait, Radar fait, Capitaine verrouillé, Lieutenants verrouillés, Lexique validé
- FR42 : Un bandeau de suggestion apparaît quand tous les checks d'une phase sont complétés pour l'article en cours
- FR43 : L'utilisateur peut ignorer le bandeau et rester dans la phase actuelle
- FR44 : L'utilisateur peut voir un résumé du contexte stratégique du Cerveau (cible, angle, promesse) dans une section collapsable en haut du Moteur
- FR45 : Le système injecte automatiquement le contexte stratégique du Cerveau dans les prompts IA du Moteur (Discovery, PainTranslator, Panel IA Capitaine) sans action utilisateur
- FR46 : L'utilisateur peut accéder au Labo depuis la Navbar et le Dashboard
- FR47 : L'utilisateur peut utiliser les mêmes composants que le Moteur (Discovery, Douleur Intent, verdict GO/NO-GO Capitaine) en mode recherche libre — sans sélectionner d'article ni de cocon
- FR48 : L'utilisateur peut saisir un mot-clé libre dans le Labo et lancer les analyses disponibles
- FR49 : Le système sauvegarde les résultats de chaque service (Discovery, Validation Capitaine, SERP Lieutenants, Lexique TF-IDF) pour chaque article
- FR50 : Le système recharge automatiquement les résultats sauvegardés quand l'utilisateur revient sur un article
- FR51 : Le système ne relance pas un appel API si un résultat valide existe déjà en cache pour la même requête

### NonFunctional Requirements

- NFR1 : Les réponses API locales (hors appels externes) sont retournées en < 200ms
- NFR2 : Le streaming SSE (Claude) affiche le premier token en < 2s
- NFR3 : Le chargement d'une vue (changement de route) se fait en < 500ms
- NFR4 : Le cache hit rate DataForSEO atteint > 90% après première utilisation d'un mot-clé
- NFR5 : Aucun appel API externe n'est effectué si un résultat valide existe en cache
- NFR6 : Les résultats de tous les services sont persistés sur disque (fichiers JSON) et survivent au redémarrage de l'app
- NFR7 : La taille maximale d'un fichier JSON en mémoire est de 5MB (limite Express actuelle)
- NFR8 : Les composants du Moteur fonctionnent en deux modes : contextualisé (article sélectionné, seuils adaptatifs selon le niveau) et libre (Labo, seuils par défaut "Intermédiaire")
- NFR9 : L'enrichissement des prompts IA par le contexte du Cerveau est optionnel — si aucune stratégie n'existe pour le cocon, les prompts fonctionnent sans enrichissement
- NFR10 : Le store `article-progress` avec `completedChecks[]` est la source unique de vérité pour la progression par article. Les checks sont : `capitaine_locked`, `lieutenants_locked`, `lexique_validated`
- NFR11 : Le scraping SERP ne se fait qu'UNE fois (sous-onglet Lieutenants) et les données cascadent vers le Lexique — zéro requête dupliquée
- NFR12 : Les seuils de scoring du feu tricolore sont configurables et stockés de façon transparente (visibles au survol)
- NFR13 : Les composants réutilisés entre Moteur et Labo ne sont pas dupliqués — un seul composant avec un prop de mode (contextualisé / libre)
- NFR14 : Les prompts IA restent dans des fichiers `.md` séparés — l'enrichissement stratégique est un pré-processing en amont, pas une modification du prompt source

### Additional Requirements

- Brownfield : la restructuration préserve les composants internes existants — seuls les wrappers (MoteurView) et le système de progression changent
- Pattern dual-mode : prop `mode: 'workflow' | 'libre'` sur chaque composant Moteur réutilisé dans le Labo
- 5 checks standardisés : `discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated`
- Emit `check-completed` : chaque composant Moteur émet un événement quand il produit un résultat en mode workflow
- Pattern cache étendu : `getOrFetch<T>()` uniforme pour tous les services API externes
- Enrichissement prompts : `loadPrompt()` injecte `{{strategy_context}}` — remplacé par string vide si pas de stratégie
- 7 nouvelles routes API : `POST /api/keywords/:keyword/validate`, `GET /api/keywords/:keyword/roots`, `POST /api/serp/analyze`, `POST /api/serp/tfidf`, `POST /api/keywords/:keyword/ai-panel`, `POST /api/articles/:slug/progress/check`, `GET /api/cocoons/:id/strategy/context`
- Scoring contextuel : `ThresholdConfig` par niveau article (Pilier/Intermédiaire/Spécifique) avec seuils transparents
- Cascade SERP : un seul scraping (Lieutenants) alimente Lieutenants + Lexique (TF-IDF) — zéro requête dupliquée
- Curseur SERP intelligent : sous défaut (10) = filtre local instantané, au-dessus = scraping complémentaire
- Verrouillage séquentiel souple : Capitaine → Lieutenants → Lexique (navigation libre maintenue, consultation sans action)
- Enforcement guidelines : utiliser apiGet/apiPost (jamais fetch), envelopper réponses dans { data: T }, composition API Pinia, tests dans tests/unit/ miroir, logger (jamais console.log), loadPrompt() (jamais strings inline), readJson/writeJson (jamais fs directement)
- Anti-patterns : pas de JSON sans schema Zod, pas d'appel API sans vérifier cache, pas de duplication composant Moteur/Labo, pas de gating dur (navigation libre), pas de modification de prompt .md (pré-processing)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 6 | 2 phases visuelles (Générer, Valider) |
| FR2 | Epic 6 | Navigation libre entre 2 phases |
| FR3 | ~~Déjà fait~~ | Sélection article obligatoire |
| FR4 | Epic 9 | Local fusionné déplacé vers Dashboard |
| FR5 | ~~Déjà fait~~ | Retrait Content Gap |
| FR6 | ~~Déjà fait~~ | Discovery IA |
| FR7 | ~~Déjà fait~~ | Scan Douleur Intent |
| FR8 | ~~Déjà fait~~ | Traduction douleur → mots-clés |
| FR9 | ~~Déjà fait~~ | Verrouillage conditionnel Discovery/Douleur |
| FR10 | Epic 6 | Capitaine pré-rempli + input alternatif + historique slider |
| FR11 | Epic 6 | Feu tricolore GO/ORANGE/NO-GO + 6 KPIs |
| FR12 | Epic 6 | Seuils contextuels par niveau article |
| FR13 | Epic 6 | CPC asymétrique |
| FR14 | Epic 6 | NO-GO automatique si zéro signal |
| FR15 | Epic 6 | Découpage racine longue traîne |
| FR16 | Epic 6 | Barres progression + tooltip seuils |
| FR17 | Epic 6 | Panel IA expert SEO streaming |
| FR18 | Epic 6 | Forcer GO (libre arbitre) |
| FR19 | Epic 6 | Feedback NO-GO orienté (3 catégories) |
| FR20 | Epic 6 | Lock/unlock Capitaine + débloque Lieutenants |
| FR21 | Epic 7 | En-tête Capitaine verrouillé + niveau article |
| FR22 | Epic 7 | Bouton "Analyser SERP" + curseur 3-10 |
| FR23 | Epic 7 | 3 sections dépliables (Hn, PAA, Groupes) |
| FR24 | Epic 7 | Badges provenance [SERP][PAA][Groupe] + pertinence |
| FR25 | Epic 7 | Sélection checkbox + compteur recommandé |
| FR26 | Epic 7 | Curseur SERP intelligent |
| FR27 | Epic 7 | Panel IA structure Hn |
| FR28 | Epic 7 | Lock Lieutenants → débloque Lexique |
| FR29 | Epic 8 | TF-IDF sur données SERP héritées |
| FR30 | Epic 8 | 3 niveaux (Obligatoire/Différenciateur/Optionnel) + densité/page |
| FR31 | Epic 8 | Checkbox + pré-cochage obligatoires |
| FR32 | Epic 8 | Panel IA lexical |
| FR33 | Epic 8 | Validation finale → ArticleKeywords store |
| FR34 | Epic 6 | Pas d'action auto au changement sous-onglet |
| FR35 | Epic 6 | KPIs bruts toujours visibles |
| FR36 | Epic 6 | Cache TTL + refresh |
| FR37 | Epic 9 | Intention/Audit/Local retirés du Moteur |
| FR38 | Epic 9 | Vue Dashboard indépendante |
| FR39 | Epic 10 | Checks modifiés (capitaine_locked, lieutenants_locked, lexique_validated) |
| FR40 | Epic 10 | Dots progression (●/○) 5 checks |
| FR41 | Epic 10 | Checks automatiques (5 étapes) |
| FR42 | Epic 10 | Bandeaux transition adaptés |
| FR43 | Epic 10 | Ignorer le bandeau |
| FR44 | ~~Déjà fait~~ | Contexte stratégique collapsable |
| FR45 | ~~Déjà fait~~ | Enrichissement prompts IA |
| FR46 | Epic 10 | Labo accessible Navbar/Dashboard |
| FR47 | Epic 10 | Verdict GO/NO-GO en mode libre |
| FR48 | Epic 10 | Saisie mot-clé libre dans le Labo |
| FR49 | ~~Déjà fait~~ | Cache systématique par service |
| FR50 | ~~Déjà fait~~ | Rechargement automatique résultats |
| FR51 | ~~Déjà fait~~ | Pas de re-call API si cache valide |

## Epics précédents (1-5) — Implémentés

### Epic 1 : Moteur structuré en 3 phases ✅
L'utilisateur navigue dans un Moteur organisé en 3 phases visuelles claires (Générer, Valider, Assigner) avec fusion Local+Maps, retrait Content Gap, et message inline dans l'Assignation.
**Statut :** Implémenté (commit c21a56e) — sera refactoré par Epic 6

### Epic 2 : Progression automatique et guidage ✅
L'utilisateur voit sa progression par article (dots ●/○) dans la liste et reçoit des suggestions de transition quand une phase est complète.
**Statut :** Implémenté — sera mis à jour par Epic 10 (7→5 checks)

### Epic 3 : Pont Cerveau→Moteur ✅
Le contexte stratégique du Cerveau (cible, angle, promesse) est visible dans le Moteur et enrichit silencieusement tous les prompts IA.
**Statut :** Implémenté — Story 3.3 (indicateur alignement) retirée du nouveau PRD

### Epic 4 : Cache systématique et persistance ✅
L'utilisateur retrouve tous ses résultats à la reprise d'un article sans re-appels API.
**Statut :** Implémenté — le pattern sera étendu aux nouveaux services (Capitaine, SERP, TF-IDF)

### Epic 5 : Labo — Recherche libre ✅
L'utilisateur vérifie un mot-clé hors workflow (sans article ni cocon) depuis une vue dédiée accessible dans la Navbar.
**Statut :** Implémenté — sera mis à jour par Epic 10 (composants GO/NO-GO)

## Nouveaux Epics (6-10)

### Epic 6 : Moteur 2 phases + Verdict GO/NO-GO du Capitaine
L'utilisateur valide la viabilité de son mot-clé principal via un verdict clair (feu tricolore GO/ORANGE/NO-GO) avec 6 KPIs contextuels adaptés au niveau d'article (Pilier/Intermédiaire/Spécifique). Le Moteur passe de 3 à 2 phases visuelles. Le sous-onglet Capitaine est le cœur du workflow de validation.
**FRs covered:** FR1, FR2, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR34, FR35, FR36

### Epic 7 : Lieutenants — Analyse SERP des concurrents
L'utilisateur identifie ses mots-clés secondaires (H2/H3) en analysant la SERP réelle des concurrents top 3-10, avec des candidats présentés par badges de pertinence et provenance multi-source. Un seul scraping alimente Hn, PAA et Groupes.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28

### Epic 8 : Lexique TF-IDF + Validation finale
L'utilisateur extrait le champ lexical sémantique des concurrents par TF-IDF (zéro requête supplémentaire), valide les termes en 3 niveaux (Obligatoire/Différenciateur/Optionnel), puis verrouille l'ensemble complet (capitaine + lieutenants + lexique) prêt pour la rédaction.
**FRs covered:** FR29, FR30, FR31, FR32, FR33

### Epic 9 : Dashboard Explorateur — Extraction Intention, Audit, Local
L'utilisateur consulte les outils Intention (SERP intent), Audit (cocon complet) et Local (local vs national + Maps) dans un espace indépendant, découplé du workflow de validation du Moteur.
**FRs covered:** FR4, FR37, FR38

### Epic 10 : Progression 5 checks + Guidage + Labo GO/NO-GO
L'utilisateur voit sa progression par article mise à jour (5 dots : discovery, radar, capitaine, lieutenants, lexique), reçoit des bandeaux de transition adaptés, et peut utiliser le verdict GO/NO-GO Capitaine en mode libre dans le Labo.
**FRs covered:** FR39, FR40, FR41, FR42, FR43, FR46, FR47, FR48

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

---

## Epic 6 : Moteur 2 phases + Verdict GO/NO-GO du Capitaine

L'utilisateur valide la viabilité de son mot-clé principal via un verdict clair (feu tricolore GO/ORANGE/NO-GO) avec 6 KPIs contextuels adaptés au niveau d'article (Pilier/Intermédiaire/Spécifique). Le Moteur passe de 3 à 2 phases visuelles. Le sous-onglet Capitaine est le cœur du workflow de validation.

### Story 6.1 : Restructuration Moteur 3→2 phases + navigation sous-onglets

As a consultant SEO,
I want le Moteur restructuré en 2 phases (Générer, Valider) avec 3 sous-onglets séquentiels dans Valider (Capitaine, Lieutenants, Lexique),
So that le workflow est aligné avec la logique GO/NO-GO et la Phase ③ Assigner ne pollue plus la navigation.

**Acceptance Criteria:**

**Given** l'utilisateur accède à la vue Moteur
**When** il arrive sur la page
**Then** il voit 2 groupes de phases visuellement distincts : ① Générer, ② Valider
**And** la Phase ③ Assigner n'existe plus

**Given** l'utilisateur ouvre la Phase ② Valider
**When** il clique dessus
**Then** il voit 3 sous-onglets : Capitaine, Lieutenants, Lexique
**And** le sous-onglet Capitaine est actif par défaut

**Given** l'utilisateur est sur le sous-onglet Capitaine
**When** il clique sur Lieutenants ou Lexique
**Then** il navigue librement vers le sous-onglet choisi sans blocage (FR2, FR34)
**And** aucune action automatique ne se déclenche au changement de sous-onglet (FR34)

**Given** le sous-onglet Lieutenants nécessite un Capitaine verrouillé pour agir
**When** le Capitaine n'est PAS verrouillé et l'utilisateur ouvre Lieutenants
**Then** le sous-onglet s'affiche en lecture seule avec un message explicatif (gating souple)
**And** l'utilisateur peut consulter mais pas lancer d'actions

### Story 6.2 : Scoring contextuel + Verdict feu tricolore + route API validate

As a consultant SEO,
I want un feu tricolore GO/ORANGE/NO-GO calculé à partir de 6 KPIs (Volume, KD, CPC, PAA, Intent, Autocomplete) avec des seuils adaptés au niveau de mon article,
So that je sais immédiatement si mon mot-clé est viable sans avoir à interpréter les données brutes moi-même.

**Acceptance Criteria:**

**Given** un mot-clé Capitaine est soumis avec un niveau d'article (Pilier/Intermédiaire/Spécifique)
**When** la route `POST /api/keywords/:keyword/validate` est appelée
**Then** elle lance en parallèle : DataForSEO (volume, KD, CPC), Autocomplete, PAA
**And** elle retourne les 6 KPIs bruts + le verdict (GO/ORANGE/NO-GO) + les seuils appliqués

**Given** le niveau d'article est "Pilier"
**When** le scoring est calculé
**Then** les seuils sont : Volume VERT >1000, KD VERT <40, CPC bonus >2€ (FR12)
**And** le verdict GO nécessite ≥4/6 verts, AUCUN rouge sur Volume ou KD, PAA non-rouge

**Given** le niveau d'article est "Spécifique"
**When** le scoring est calculé
**Then** les seuils sont : Volume VERT >30, KD VERT <20 (FR12)

**Given** volume=0 ET PAA=0 ET autocomplete=0
**When** le scoring est calculé
**Then** le verdict est NO-GO automatique avec raison "Aucun signal détecté" (FR14)

**Given** CPC = 0.5€
**When** le scoring CPC est calculé
**Then** le KPI CPC est "neutre" (ni vert, ni rouge — FR13)

**Given** CPC = 3.2€
**When** le scoring CPC est calculé
**Then** le KPI CPC est "bonus vert" (FR13)

**Given** un résultat valide existe en cache pour ce mot-clé + niveau
**When** la même requête est envoyée
**Then** le résultat est retourné depuis le cache sans appel API externe (NFR5)

### Story 6.3 : Interface Capitaine — Thermomètre, KPIs, barres et tooltip seuils

As a consultant SEO,
I want voir le thermomètre avec le feu tricolore, chaque KPI avec une barre de progression colorée (vert/orange/rouge), et les seuils appliqués au survol,
So that je comprends visuellement pourquoi le verdict est tel qu'il est et je peux vérifier les seuils.

**Acceptance Criteria:**

**Given** un mot-clé a été validé et les KPIs sont disponibles
**When** le sous-onglet Capitaine s'affiche
**Then** le thermomètre (RadarThermometer) affiche le score global et le feu tricolore GO/ORANGE/NO-GO
**And** chaque KPI (Volume, KD, CPC, PAA, Intent, Autocomplete) est affiché avec une barre de progression (FR16)
**And** les zones vert/orange/rouge sont visibles sur chaque barre

**Given** l'utilisateur survole un KPI
**When** le tooltip s'affiche
**Then** il montre les seuils appliqués pour le niveau d'article courant (ex: "Volume — Pilier : VERT >1000, ORANGE 200-999, ROUGE <200") (FR16, NFR12)

**Given** les KPIs bruts sont disponibles
**When** l'interface s'affiche
**Then** les valeurs numériques brutes sont TOUJOURS visibles à côté des barres (FR35)
**And** le verdict ne masque jamais les données sources

**Given** le verdict est NO-GO
**When** l'interface affiche le feedback
**Then** une des trois catégories est affichée : "Trop longue traîne" / "KPIs faibles" / "Hors sujet" avec explication (FR19)

### Story 6.4 : Input alternatif, historique slider, découpage racine, forcer GO

As a consultant SEO,
I want pouvoir tester un mot-clé alternatif, naviguer dans l'historique de mes tests, voir l'analyse racine pour les mots-clés longue traîne, et forcer GO si je le souhaite,
So that j'ai le contrôle total sur le choix de mon Capitaine sans être prisonnier de l'algorithme.

**Acceptance Criteria:**

**Given** l'utilisateur est sur le sous-onglet Capitaine
**When** il saisit un mot-clé alternatif dans le champ input et lance la recherche
**Then** le mot-clé alternatif est analysé (route validate) et les résultats s'affichent (FR10)
**And** le mot-clé précédent est ajouté à l'historique

**Given** l'utilisateur a testé 3 mots-clés
**When** il utilise le slider d'historique
**Then** il peut naviguer entre les 3 résultats sans re-appel API (FR10)
**And** les KPIs et le verdict se mettent à jour instantanément

**Given** un mot-clé est longue traîne (3+ mots) avec données faibles (volume < seuil orange)
**When** les résultats s'affichent
**Then** une section "Analyse racine" apparaît avec les KPIs de la racine découpée (FR15)
**And** la route `GET /api/keywords/:keyword/roots` retourne la/les racine(s)
**And** le verdict reste sur le mot-clé ORIGINAL, pas la racine

**Given** le verdict est ORANGE ou NO-GO
**When** l'utilisateur clique sur "Forcer GO"
**Then** le verdict passe à GO (FR18)
**And** l'action est visuelle (badge "Forcé" ou indicateur)

### Story 6.5 : Panel IA expert SEO streaming + Lock/unlock Capitaine

As a consultant SEO,
I want un panel IA expert qui s'auto-génère en streaming avec des conseils contextuels, et pouvoir verrouiller/déverrouiller mon Capitaine,
So that j'ai un avis complémentaire avant de décider, et je peux changer d'avis après verrouillage.

**Acceptance Criteria:**

**Given** les KPIs du mot-clé sont disponibles
**When** le sous-onglet Capitaine s'affiche
**Then** le panel IA se charge automatiquement en streaming SSE via `POST /api/keywords/:keyword/ai-panel` (FR17)
**And** le premier token apparaît en < 2s (NFR2)

**Given** le panel IA est affiché
**When** l'utilisateur regarde le contenu
**Then** le panel est dépliable et ne modifie JAMAIS le feu tricolore (FR17)
**And** le contenu est un avis d'expert SEO contextuel (pas un résumé des KPIs)

**Given** l'utilisateur est satisfait du mot-clé Capitaine
**When** il clique sur "Valider ce Capitaine"
**Then** le Capitaine est verrouillé (cadenas visible) (FR20)
**And** le sous-onglet Lieutenants est débloqué pour les actions
**And** l'événement `check-completed` est émis avec `capitaine_locked`

**Given** le Capitaine est verrouillé
**When** l'utilisateur clique sur le cadenas (unlock)
**Then** le Capitaine est déverrouillé (FR20)
**And** le sous-onglet Lieutenants repasse en gating souple (consultation uniquement)

---

## Epic 7 : Lieutenants — Analyse SERP des concurrents

L'utilisateur identifie ses mots-clés secondaires (H2/H3) en analysant la SERP réelle des concurrents top 3-10, avec des candidats présentés par badges de pertinence et provenance multi-source. Un seul scraping alimente Hn, PAA et Groupes. Les données SERP brutes sont conservées pour le Lexique (Epic 8).

### Story 7.1 : Route API SERP analyze + curseur intelligent + en-tête Capitaine

As a consultant SEO,
I want voir mon Capitaine verrouillé en en-tête du sous-onglet Lieutenants, lancer l'analyse SERP via un bouton, et configurer le nombre de résultats à scraper,
So that j'analyse la concurrence réelle de mon mot-clé principal avec le niveau de profondeur que je choisis.

**Acceptance Criteria:**

**Given** l'utilisateur ouvre le sous-onglet Lieutenants avec un Capitaine verrouillé
**When** le sous-onglet s'affiche
**Then** l'en-tête montre le Capitaine verrouillé et le niveau d'article (FR21)
**And** un curseur SERP est disponible (3-10, défaut 10) (FR22)
**And** un bouton "Analyser SERP" est visible

**Given** l'utilisateur clique sur "Analyser SERP" avec le curseur à 10
**When** la route `POST /api/serp/analyze` est appelée
**Then** le scraping des top 10 résultats est lancé
**And** les résultats sont persistés en cache (NFR5, NFR11)
**And** les données brutes (HTML contenus) sont conservées pour le TF-IDF du Lexique

**Given** les résultats SERP sont affichés pour 10 résultats
**When** l'utilisateur réduit le curseur à 5
**Then** les résultats sont filtrés localement instantanément sans re-scraping (FR26)

**Given** les résultats SERP sont affichés pour 10 résultats
**When** l'utilisateur augmente le curseur à 10 (ou au-dessus du précédent max)
**Then** un scraping complémentaire est lancé pour les résultats manquants (FR26)

### Story 7.2 : Sections dépliables Hn concurrents, PAA et Groupes

As a consultant SEO,
I want voir la structure Hn des concurrents, les PAA associés et les groupes de mots-clés dans des sections dépliables,
So that je comprends comment la SERP est structurée et quels sujets couvrir pour mes H2/H3.

**Acceptance Criteria:**

**Given** l'analyse SERP est terminée
**When** les résultats s'affichent
**Then** 3 sections dépliables apparaissent : Structure Hn concurrents, PAA associés, Groupes de mots-clés (FR23)

**Given** la section "Structure Hn concurrents" est ouverte
**When** les données s'affichent
**Then** les H2 les plus fréquents sont listés avec leur % de récurrence (ex: "Causes de la douleur" 9/10) (FR23)
**And** les H2 sont triés par fréquence décroissante

**Given** la section "PAA associés" est ouverte
**When** les données s'affichent
**Then** les PAA sont listés avec leur score de pertinence N+2 (FR23)

**Given** la section "Groupes de mots-clés" est ouverte
**When** les données s'affichent
**Then** les groupes issus de la Phase Cerveau sont affichés avec le nombre de termes par cluster (FR23)

### Story 7.3 : Candidats Lieutenants avec badges + sélection checkbox + compteur

As a consultant SEO,
I want voir les candidats Lieutenants avec leurs badges de provenance et pertinence, les sélectionner via checkboxes avec un compteur recommandé,
So that je choisis mes mots-clés secondaires en connaissance de cause et avec un guidage clair.

**Acceptance Criteria:**

**Given** l'analyse SERP est terminée
**When** la section de sélection des Lieutenants s'affiche
**Then** les candidats sont présentés avec des badges multi-source : [SERP], [PAA], [Groupe] (FR24)
**And** chaque candidat a un badge de pertinence : Fort, Moyen, Faible (FR24)
**And** la pertinence est basée sur la complémentarité avec le Capitaine

**Given** le niveau d'article est "Intermédiaire"
**When** la section s'affiche
**Then** un compteur indique "3-5 recommandés" (FR25)

**Given** le niveau d'article est "Pilier"
**When** la section s'affiche
**Then** un compteur indique "5-8 recommandés" (FR25)

**Given** l'utilisateur sélectionne des Lieutenants via checkboxes
**When** il coche/décoche des candidats
**Then** le compteur se met à jour en temps réel (ex: "4/5 recommandés") (FR25)

### Story 7.4 : Panel IA structure Hn + Lock Lieutenants

As a consultant SEO,
I want un panel IA qui recommande une structure Hn avec mes Lieutenants sélectionnés, et pouvoir verrouiller mes Lieutenants,
So that j'ai une proposition de plan concrète et je peux passer au Lexique.

**Acceptance Criteria:**

**Given** des Lieutenants sont sélectionnés
**When** le panel IA dépliable est ouvert
**Then** il affiche une structure Hn recommandée utilisant les Lieutenants sélectionnés (FR27)
**And** le panel se charge en streaming SSE

**Given** l'utilisateur est satisfait de sa sélection de Lieutenants
**When** il clique sur "Valider les Lieutenants"
**Then** les Lieutenants sont verrouillés (FR28)
**And** le sous-onglet Lexique est débloqué pour les actions
**And** l'événement `check-completed` est émis avec `lieutenants_locked`

**Given** les Lieutenants sont verrouillés
**When** l'utilisateur clique sur unlock
**Then** les Lieutenants sont déverrouillés
**And** le sous-onglet Lexique repasse en gating souple

---

## Epic 8 : Lexique TF-IDF + Validation finale

L'utilisateur extrait le champ lexical sémantique des concurrents par TF-IDF (zéro requête supplémentaire), valide les termes en 3 niveaux (Obligatoire/Différenciateur/Optionnel), puis verrouille l'ensemble complet (capitaine + lieutenants + lexique) prêt pour la rédaction.

### Story 8.1 : Extraction TF-IDF depuis données SERP + 3 niveaux + densité

As a consultant SEO,
I want que le champ lexical soit extrait automatiquement des données SERP déjà scrapées avec 3 niveaux de termes et la densité par page,
So that j'ai un lexique basé sur la réalité compétitive sans requête API supplémentaire.

**Acceptance Criteria:**

**Given** les Lieutenants sont verrouillés et les données SERP sont disponibles
**When** l'utilisateur ouvre le sous-onglet Lexique
**Then** l'en-tête affiche le Capitaine, les Lieutenants sélectionnés et le niveau d'article

**Given** l'utilisateur lance l'extraction TF-IDF
**When** la route `POST /api/serp/tfidf` est appelée
**Then** elle utilise les contenus SERP déjà scrapés (Epic 7) — AUCUNE nouvelle requête API (FR29, NFR11)
**And** les termes sont classés en 3 niveaux (FR30) :
- Obligatoire : présent chez 70%+ des concurrents
- Différenciateur : présent chez 30-70%
- Optionnel : présent chez <30%
**And** chaque terme affiche sa densité de récurrence par page (ex: ×4.2/page)

**Given** les termes sont extraits
**When** ils s'affichent dans l'interface
**Then** les termes Obligatoires sont pré-cochés (FR31)
**And** les termes Différenciateurs et Optionnels sont décochés par défaut
**And** l'utilisateur peut cocher/décocher tous les termes via checkboxes (FR31)

### Story 8.2 : Panel IA lexical + Validation finale → ArticleKeywords

As a consultant SEO,
I want un panel IA lexical expert et pouvoir valider l'ensemble (capitaine + lieutenants + lexique) pour que tout soit prêt pour la rédaction,
So that je boucle le workflow Moteur avec un résultat complet et verrouillé.

**Acceptance Criteria:**

**Given** les termes du Lexique sont affichés
**When** le panel IA dépliable est ouvert
**Then** il fournit une analyse lexicale expert avec recommandations (FR32)
**And** le panel se charge en streaming SSE

**Given** l'utilisateur a sélectionné ses termes (checkboxes)
**When** il clique sur "Valider le Lexique"
**Then** les résultats finaux sont écrits dans le store ArticleKeywords (FR33) :
- `capitaine`: le mot-clé principal verrouillé
- `lieutenants[]`: les mots-clés secondaires verrouillés
- `lexique[]`: les termes sémantiques sélectionnés
**And** l'événement `check-completed` est émis avec `lexique_validated`
**And** les données sont persistées via l'API backend

**Given** le Lexique est validé
**When** l'utilisateur consulte le sous-onglet Lexique
**Then** les résultats verrouillés sont affichés en lecture seule
**And** un mécanisme unlock permet de déverrouiller si nécessaire

---

## Epic 9 : Dashboard Explorateur — Extraction Intention, Audit, Local

L'utilisateur consulte les outils Intention (SERP intent), Audit (cocon complet) et Local (local vs national + Maps) dans un espace indépendant, découplé du workflow de validation du Moteur.

### Story 9.1 : Vue ExplorateurView, route /explorateur, retrait du Moteur

As a consultant SEO,
I want que les onglets Intention, Audit et Local soient accessibles dans une vue Dashboard indépendante et retirés du Moteur,
So that le Moteur ne contient que le workflow GO/NO-GO et je consulte les analyses complémentaires dans un espace dédié.

**Acceptance Criteria:**

**Given** l'utilisateur accède à `/explorateur` via la Navbar ou le Dashboard
**When** la vue ExplorateurView s'affiche
**Then** il voit 3 onglets : Intention (SERP intent), Audit (cocon complet), Local (local vs national + Maps) (FR38)
**And** la vue se charge en lazy loading (< 500ms — NFR3)

**Given** l'utilisateur est sur la vue Moteur
**When** il regarde les onglets disponibles
**Then** les onglets Intention, Audit et Local ne sont PAS présents dans le Moteur (FR37)
**And** seuls les onglets Phase ① Générer et Phase ② Valider (Capitaine/Lieutenants/Lexique) sont disponibles

**Given** l'utilisateur ouvre l'onglet Local dans l'Explorateur
**When** l'onglet s'affiche
**Then** il voit deux sections : Comparaison Local/National et Maps & GBP (FR4)
**And** les composants existants (LocalComparisonStep, MapsStep) fonctionnent comme avant

**Given** l'utilisateur ouvre l'onglet Intention
**When** l'onglet s'affiche
**Then** les composants existants d'analyse d'intention fonctionnent comme avant

**Given** l'utilisateur ouvre l'onglet Audit
**When** l'onglet s'affiche
**Then** les composants existants d'audit DataForSEO fonctionnent comme avant

---

## Epic 10 : Progression 5 checks + Guidage + Labo GO/NO-GO

L'utilisateur voit sa progression par article mise à jour (5 dots : discovery, radar, capitaine, lieutenants, lexique), reçoit des bandeaux de transition adaptés au nouveau workflow, et peut utiliser le verdict GO/NO-GO Capitaine en mode libre dans le Labo.

### Story 10.1 : Migration 7→5 checks + dots de progression mis à jour

As a consultant SEO,
I want que les dots de progression reflètent les 5 étapes du nouveau workflow (discovery, radar, capitaine, lieutenants, lexique) au lieu des 7 anciens,
So that ma progression correspond au parcours réel du Moteur restructuré.

**Acceptance Criteria:**

**Given** le store `article-progress` contient `completedChecks[]`
**When** les checks sont mis à jour
**Then** les 5 checks standardisés sont : `discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated` (FR39)
**And** les anciens checks (`intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done`) sont supprimés ou migrés

**Given** un article est affiché dans la liste du Moteur
**When** il a des checks complétés
**Then** des dots ● (remplis) et ○ (vides) s'affichent (FR40)
**And** le nombre total de dots est 5 (un par check)
**And** les dots sont groupés par phase : 2 Générer (discovery, radar) + 3 Valider (capitaine, lieutenants, lexique)

**Given** l'événement `check-completed` est émis par un composant (ex: `capitaine_locked`)
**When** le check est traité
**Then** il est ajouté à `completedChecks[]` via `POST /api/articles/:slug/progress/check` (FR41)
**And** les dots se mettent à jour en temps réel

### Story 10.2 : Bandeaux de transition adaptés au nouveau workflow

As a consultant SEO,
I want des bandeaux de suggestion quand tous les checks d'une phase sont complétés,
So that je sais quand passer à la phase suivante sans être bloqué.

**Acceptance Criteria:**

**Given** l'article en cours a les checks `discovery_done` + `radar_done` complétés
**When** l'utilisateur est dans la Phase ① Générer
**Then** un bandeau PhaseTransitionBanner s'affiche : "Phase Générer complète — passer à Valider ?" (FR42)

**Given** l'article en cours a les checks `capitaine_locked` + `lieutenants_locked` + `lexique_validated` complétés
**When** l'utilisateur est dans la Phase ② Valider
**Then** un bandeau s'affiche : "Validation complète — tous les mots-clés sont prêts pour la rédaction !" (FR42)

**Given** un bandeau de transition est affiché
**When** l'utilisateur l'ignore
**Then** le bandeau reste visible mais ne bloque rien (FR43)
**And** l'utilisateur peut fermer/réduire le bandeau

### Story 10.3 : Labo mis à jour — verdict GO/NO-GO en mode libre

As a consultant SEO,
I want utiliser le verdict GO/NO-GO Capitaine en mode libre dans le Labo,
So that je vérifie la viabilité d'un mot-clé en quelques clics sans contexte article.

**Acceptance Criteria:**

**Given** l'utilisateur est sur le Labo
**When** il saisit un mot-clé libre et lance l'analyse
**Then** le composant Capitaine s'affiche en `mode='libre'` avec les mêmes KPIs et feu tricolore (FR47)
**And** les seuils utilisés sont ceux du niveau "Intermédiaire" par défaut (NFR8)
**And** aucun `articleSlug` ni `cocoonId` n'est requis

**Given** le composant Capitaine est en `mode='libre'`
**When** il produit un verdict
**Then** il n'émet PAS `check-completed` (pas de progression en mode libre)
**And** les résultats ne sont PAS persistés en cache lié à un article

**Given** l'utilisateur utilise le Labo
**When** il accède aussi à Discovery et Douleur Intent en mode libre
**Then** ces composants existants fonctionnent comme avant en `mode='libre'` (FR47)
**And** le verdict GO/NO-GO est le nouveau composant principal du Labo (remplace les anciens onglets Exploration/Audit/Local)
