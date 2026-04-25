---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
previousEpicsVersion: 'Epics 1-10 livrés — alignés sur PRD post-brainstorming 2026-03-31 (2 phases, suppression Phase ③ Assigner)'
lastUpdated: '2026-04-24'
updateReason: 'Alignement avec l''état réel livré : Moteur est en 6 onglets / 3 phases (Explorer, Valider, Finalisation) — pas 2 phases. Phase ③ Finalisation AJOUTÉE post-brainstorming comme récap read-only. Migration PostgreSQL faite. Réorganisation par domaine. Checks workflow préfixés moteur:* / cerveau:* / redaction:*.'
---

# Blog Redactor SEO — Epic Breakdown (État livré — mise à jour 2026-04-24)

## Overview

Ce document reflète l'**état livré** du projet Blog Redactor SEO au 2026-04-24. Les Epics 1 à 10 initialement planifiés autour du brainstorming du 2026-03-31 sont tous **livrés**, mais la structure finale du Moteur diffère légèrement du plan initial :

- **Le Moteur est en 3 phases / 6 onglets** (pas 2 phases). Phase ③ Finalisation a été ajoutée comme récap read-only débloqué quand les 3 verrouillages de Phase ② sont faits.
- **La persistance est PostgreSQL** (pg 8.20), pas des fichiers JSON. La migration a été faite (`scripts/migrate-slug-to-id.ts`, backup `_backup_pg_20260418.sql`).
- **Les articles sont identifiés par id** (pas slug). Les routes sont `/cocoon/:cocoonId/article/:articleId`.
- **Les checks sont préfixés par workflow** : `moteur:*`, `cerveau:*`, `redaction:*`, centralisés dans `shared/constants/workflow-checks.constants.ts`.
- **Multi-provider IA** : `ai-provider.service` orchestre Claude / Gemini / OpenRouter / Mock.
- **Cache multi-niveau** : `keyword_metrics` (cross-article permanent) + `api_cache` (TTL).

Des epics complémentaires ont été livrés en Phase 2 de consolidation (organisation par domaine, tooling qualité, husky). Les épics décrits ci-dessous documentent le **périmètre tel qu'il existe** dans le code.

## Requirements Inventory

### Functional Requirements (60 FRs — alignés sur prd.md à jour)

**Moteur — Structure 3 phases / 6 onglets :**
- FR1 : 3 phases visuelles : Phase ① Explorer, Phase ② Valider, Phase ③ Finalisation
- FR2 : Navigation libre entre tous les onglets sans blocage dur
- FR3 : Sélection d'un article obligatoire avant les actions du Moteur
- FR4 : Content Gap, Intention, Audit, Local ne font PAS partie du Moteur (extraits)

**Moteur — Phase ① Explorer (toujours accessible) :**
- FR5 : Onglet Discovery (IA) → émet `moteur:discovery_done`
- FR6 : Onglet Radar (Douleur Intent) → émet `moteur:radar_done`
- FR7 : Phase ① accessible en permanence, pas de verrouillage

**Moteur — Phase ② Valider — Capitaine :**
- FR8 : Capitaine pré-rempli depuis Cerveau ou Phase ① ; input alternatif + historique slider
- FR9 : Feu tricolore GO/ORANGE/NO-GO + 6 KPIs (Volume, KD, CPC, PAA, Intent, Autocomplete)
- FR10 : Seuils contextuels par niveau article (Pilier/Intermédiaire/Spécifique)
- FR11 : CPC asymétrique (> 2€ bonus vert, jamais rouge)
- FR12 : NO-GO auto si volume=0 ET PAA=0 ET autocomplete=0
- FR13 : Découpage automatique en racine(s) pour longue traîne
- FR14 : KPIs avec barres + zones vert/orange/rouge + seuils visibles au survol
- FR15 : Panel IA expert SEO en streaming SSE — ne touche pas au verdict
- FR16 : Utilisateur peut forcer GO (libre arbitre)
- FR17 : NO-GO orienté en 3 catégories (trop longue traîne / KPIs faibles / hors sujet)
- FR18 : Verrouillage → `moteur:capitaine_locked` ; lock/unlock (cadenas)

**Moteur — Phase ② Valider — Lieutenants :**
- FR19 : En-tête : Capitaine verrouillé + niveau article
- FR20 : Bouton "Analyser SERP" avec curseur 3-10 (défaut 10)
- FR21 : 3 sections dépliables (Hn concurrents, PAA N+2, Groupes croisés du Cerveau)
- FR22 : Candidats avec badges multi-source [SERP] [PAA] [Groupe] + pertinence Fort/Moyen/Faible
- FR23 : Sélection checkbox + compteur recommandé selon niveau
- FR24 : Curseur SERP intelligent (sous défaut = filtre local, au-dessus = scraping complémentaire)
- FR25 : Panel IA dépliable (structure Hn recommandée)
- FR26 : Verrouillage → `moteur:lieutenants_locked`

**Moteur — Phase ② Valider — Lexique :**
- FR27 : TF-IDF extrait des contenus SERP déjà scrapés — ZÉRO nouvelle requête
- FR28 : 3 niveaux (Obligatoire ≥70%, Différenciateur 30-70%, Optionnel <30%) + densité récurrence/page
- FR29 : Checkboxes — Obligatoires pré-cochés
- FR30 : Panel IA dépliable (analyse lexicale expert)
- FR31 : Verrouillage → `moteur:lexique_validated` → écriture finale dans ArticleKeywords

**Moteur — Phase ③ Finalisation :**
- FR32 : Onglet Finalisation read-only, débloqué quand les 3 checks Phase ② sont ✓
- FR33 : `FinalisationRecap.vue` affiche Capitaine + Lieutenants + Lexique validés
- FR34 : Lien « Passer à la Rédaction » vers `/cocoon/:id/redaction`

**Règles transversales Phase ② :**
- FR35 : Aucune action automatique au changement d'onglet
- FR36 : KPIs bruts toujours visibles (libre arbitre > algorithme)
- FR37 : Persistance via `api_cache` (TTL) + `keyword_metrics` (cross-article permanent)

**Dashboard & Explorateur (hors Moteur) :**
- FR38 : ExplorateurView (`/explorateur`) : analyse d'intention SERP, comparaison local/national, autocomplete
- FR39 : Signaux Local/Maps/GBP accessibles via Explorateur et composants `local/`

**Progression et guidage invisible :**
- FR40 : Dots de progression (●/○) à côté de chaque article dans la liste du Moteur
- FR41 : 5 checks `moteur:*` ajoutés automatiquement : `discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated`
- FR42 : Bandeau de suggestion (`PhaseTransitionBanner`) entre phases
- FR43 : L'utilisateur peut ignorer le bandeau

**Pont Cerveau→Moteur :**
- FR44 : `MoteurStrategyContext` collapsable (cible, angle, promesse, douleur, CTA)
- FR45 : Injection `{{strategy_context}}` dans les prompts `.md`

**Labo — Recherche libre :**
- FR46 : Labo accessible depuis Navbar (`/labo`)
- FR47 : Réutilise les composants Moteur en mode `libre` — pas de sélection article/cocon
- FR48 : Champ libre + verdict Capitaine avec seuils par défaut Intermédiaire

**Cache et persistance :**
- FR49 : Consultation `api_cache` avant tout appel externe (clé = hash requête + TTL)
- FR50 : Métriques mot-clé partagées via `keyword_metrics` (cross-article)
- FR51 : Rechargement automatique à la reprise — pas de re-call API
- FR52 : Purge horaire : `DELETE FROM api_cache WHERE expires_at < NOW()`

**Stratégie (Cerveau) :**
- FR53 : Cerveau en 6 étapes (Cible, Douleur, Aiguillage, Angle, Promesse, CTA)
- FR54 : Chaque étape : input → suggestion IA → approfondissement → consolidation → validation

**Rédaction :**
- FR55 : Brief généré à partir de l'article + keywords + SERP
- FR56 : Sommaire streamé via SSE
- FR57 : Article streamé section par section
- FR58 : Meta title + meta description générés
- FR59 : Éditeur TipTap avec SEO scoring live
- FR60 : Actions contextuelles sur sélection

### Non-Functional Requirements

- NFR1 : Réponses API locales (hors appels externes) < 200ms
- NFR2 : SSE premier token < 2s
- NFR3 : Chargement d'une vue (lazy) < 500ms
- NFR4 : Cache hit DataForSEO > 90% (grâce à `keyword_metrics`)
- NFR5 : Pas d'appel externe si `api_cache` ou `keyword_metrics` valide
- NFR6 : Persistance PostgreSQL — survit au redémarrage
- NFR7 : Body JSON max 5MB
- NFR8 : Composants Moteur bimodaux (workflow/libre)
- NFR9 : Enrichissement prompts optionnel — string vide si pas de stratégie
- NFR10 : `articles.completed_checks` TEXT[] source unique ; checks Moteur `moteur:*`
- NFR11 : Scraping SERP unique (Lieutenants) — cascade vers Lexique (TF-IDF)
- NFR12 : Seuils scoring dans `shared/kpi-scoring.ts` + tooltip transparents
- NFR13 : Pas de duplication composants — prop `mode: 'workflow' | 'libre'`
- NFR14 : Prompts `.md` séparés — enrichissement via `loadPrompt()`
- NFR15 : Organisation par domaine (stores/composables/services)
- NFR16 : Tests Vitest miroir + Playwright browser
- NFR17 : Tooling qualité (oxlint, eslint, prettier, knip, madge, husky)

### FR Coverage Map

| FR | Epic | Description | Statut |
|----|------|-------------|--------|
| FR1-FR4 | Epic 6 | Moteur 3 phases / 6 onglets | ✅ Livré |
| FR5-FR7 | Epic 1 | Phase ① Explorer (Discovery + Radar) | ✅ Livré |
| FR8-FR18 | Epic 6 | Capitaine verdict GO/NO-GO | ✅ Livré |
| FR19-FR26 | Epic 7 | Lieutenants SERP | ✅ Livré |
| FR27-FR31 | Epic 8 | Lexique TF-IDF | ✅ Livré |
| FR32-FR34 | Epic 11 | Phase ③ Finalisation | ✅ Livré (post-plan initial) |
| FR35-FR37 | Epic 6 | Règles transversales | ✅ Livré |
| FR38-FR39 | Epic 9 | Explorateur + Dashboard | ✅ Livré |
| FR40-FR43 | Epic 10 | Dots + checks + bandeaux | ✅ Livré |
| FR44-FR45 | Epic 3 | Pont Cerveau→Moteur | ✅ Livré |
| FR46-FR48 | Epic 5 | Labo mode libre | ✅ Livré |
| FR49-FR52 | Epic 4 + Epic 12 | Cache + PostgreSQL | ✅ Livré |
| FR53-FR54 | Epic 13 | Cerveau 6 étapes | ✅ Livré |
| FR55-FR60 | Epic 14 | Rédaction pipeline | ✅ Livré |

---

## Epics livrés (vue synthétique)

### Epic 1 : Moteur structuré en phases ✅
Navigation du Moteur en phases visuelles claires. L'implémentation finale est en **3 phases** (Explorer, Valider, Finalisation), pas 2 comme initialement prévu — Phase ③ Finalisation ajoutée comme récap read-only.
**Statut :** Livré.

### Epic 2 : Progression automatique et guidage ✅
Dots ●/○ par article, suggestions de transition quand une phase est complète. Implémenté avec les 5 checks `moteur:*` (préfixés par workflow).
**Statut :** Livré.

### Epic 3 : Pont Cerveau→Moteur ✅
Contexte stratégique visible (`MoteurStrategyContext`) et injecté dans tous les prompts IA via `{{strategy_context}}`.
**Statut :** Livré. Story 3.3 (indicateur alignement stratégique) non implémentée — reste en backlog.

### Epic 4 : Cache systématique et persistance ✅
Pattern cache étendu à tous les services externes. Cache à deux niveaux : `api_cache` (TTL) + `keyword_metrics` (cross-article permanent).
**Statut :** Livré.

### Epic 5 : Labo — Recherche libre ✅
Vue `/labo` utilisant les mêmes composants que le Moteur en mode `libre`.
**Statut :** Livré.

### Epic 6 : Moteur 3 phases + Verdict GO/NO-GO du Capitaine ✅
6 KPIs contextuels, feu tricolore GO/ORANGE/NO-GO, seuils par niveau article, panel IA streaming, lock/unlock.
**Statut :** Livré.

### Epic 7 : Lieutenants — Analyse SERP ✅
Scraping SERP top 3-10, Hn + PAA + Groupes, badges multi-source, sélection avec compteur recommandé.
**Statut :** Livré.

### Epic 8 : Lexique TF-IDF + Validation finale ✅
TF-IDF sur contenus SERP hérités (zéro requête), 3 niveaux, validation finale dans ArticleKeywords.
**Statut :** Livré.

### Epic 9 : Explorateur (Intention / Audit / Local) ✅
`ExplorateurView` (`/explorateur`) découplé du Moteur pour les analyses hors workflow de validation.
**Statut :** Livré.

### Epic 10 : Progression 5 checks + Guidage + Labo GO/NO-GO ✅
5 dots, bandeaux de transition, verdict Capitaine disponible en mode libre dans le Labo.
**Statut :** Livré.

### Epic 11 : Phase ③ Finalisation (ajout post-plan initial) ✅
Onglet read-only affichant le récap des 3 verrouillages de Phase ②, lien vers la Rédaction.
**Statut :** Livré.

### Epic 12 : Migration PostgreSQL ✅
Migration des fichiers JSON locaux vers PostgreSQL (pg 8.20). `scripts/migrate-slug-to-id.ts`, backup `_backup_pg_20260418.sql`, archivage de l'ancien JSON dans `data/_archive/`.
**Statut :** Livré.

### Epic 13 : Cerveau — Stratégie en 6 étapes ✅
Cible, Douleur, Aiguillage, Angle, Promesse, CTA. Chaque étape avec suggestion IA, approfondissement, consolidation, validation.
**Statut :** Livré.

### Epic 14 : Rédaction — Pipeline complet ✅
Brief → Sommaire streamé → Article streamé section par section → Meta → Éditeur TipTap avec SEO scoring live + actions contextuelles.
**Statut :** Livré.

### Epic 15 : Consolidation — Organisation par domaine + Qualité ✅
Refactor stores (5 domaines), composables (5 domaines), services (7 domaines). Purge des exports morts, husky + lint-staged, knip, madge.
**Statut :** Livré (commits récents).

---

## Epic 1 : Moteur structuré en 3 phases

L'utilisateur navigue dans un Moteur organisé en 3 phases visuelles claires : Phase ① Explorer, Phase ② Valider, Phase ③ Finalisation. Les composants internes sont préservés — seul le wrapper `MoteurView` et la navigation structurent les phases.

### Story 1.1 : Layout 3 phases + navigation + sélection article ✅

As a consultant SEO,
I want le Moteur organisé en 3 phases visuelles avec navigation libre et sélection d'article obligatoire,
So that je comprends immédiatement la structure du workflow.

**Acceptance Criteria (livrés) :**

- L'utilisateur voit 3 groupes de phases : ① Explorer, ② Valider, ③ Finalisation
- Navigation libre entre toutes les phases sans blocage
- Sans article sélectionné, les actions ne sont pas accessibles (message invite à sélectionner)
- Avec un article sélectionné, Phase ① Explorer est affichée par défaut

### Story 1.2 : Phase ① Explorer — Discovery + Radar ✅

As a consultant SEO,
I want les onglets Discovery et Radar (Douleur Intent) regroupés dans la Phase Explorer toujours accessible,
So that je peux lancer des recherches continues quelle que soit l'avancée du workflow.

**Acceptance Criteria (livrés) :**

- Phase ① Explorer contient 2 onglets : Discovery (IA) et Radar (Douleur Intent)
- Discovery lance une analyse produisant des `ClassifiedKeyword[]` → émet `moteur:discovery_done`
- Radar lance un scan intent → émet `moteur:radar_done`
- Les deux onglets restent accessibles en permanence, même après verrouillage du Capitaine
- Les composants existants (`KeywordDiscoveryTab`, `DouleurIntentScanner`) fonctionnent

### Story 1.3 : Phase ② Valider — 3 onglets séquentiels ✅

As a consultant SEO,
I want la Phase Valider organisée en 3 onglets séquentiels (Capitaine → Lieutenants → Lexique) avec gating souple,
So that je valide mes mots-clés étape par étape sans être bloqué dans la navigation.

**Acceptance Criteria (livrés) :**

- Phase ② Valider contient 3 onglets : Capitaine, Lieutenants, Lexique
- Capitaine est actif par défaut
- Navigation libre vers les 3 onglets (pas de blocage dur)
- Lieutenants et Lexique affichent un message si leur prérequis n'est pas verrouillé (gating souple, consultation autorisée)

### Story 1.4 : Phase ③ Finalisation — Récap read-only ✅

As a consultant SEO,
I want un onglet Finalisation read-only qui résume mes validations et me dirige vers la Rédaction,
So that j'ai une vue finale claire avant de passer à la rédaction.

**Acceptance Criteria (livrés) :**

- L'onglet Finalisation est accessible en navigation
- Quand les 3 checks Phase ② (`capitaine_locked`, `lieutenants_locked`, `lexique_validated`) sont tous présents, l'onglet passe de "en attente" à "disponible"
- `FinalisationRecap.vue` affiche : Capitaine, Lieutenants, Lexique validés
- Un bouton/lien redirige vers `/cocoon/:cocoonId/redaction`

---

## Epic 2 : Progression automatique et guidage

L'utilisateur voit sa progression par article (dots ●/○) dans la liste du Moteur. Source unique de vérité : `articles.completed_checks` TEXT[] (NFR10).

### Story 2.1 : Dots de progression par article dans la liste ✅

**Acceptance Criteria (livrés) :**

- Dots ● (remplis) / ○ (vides) à côté du nom de chaque article
- Total : 5 dots (un par check `moteur:*`)
- Article sans check → 5 dots vides (`○○○○○`)
- Article avec 3 checks → 3 dots pleins + 2 vides (`●●●○○`)
- Dots groupés visuellement par phase (2 Explorer + 3 Valider)

### Story 2.2 : Checks automatiques via emit `check-completed` ✅

**Acceptance Criteria (livrés) :**

- Chaque composant Moteur en mode `workflow` émet `check-completed` avec la constante appropriée
- `MoteurView` intercepte et appelle `progressStore.addCheck(articleId, check)`
- Backend persiste via `POST /api/articles/:articleId/progress/check`
- Pas de doublon : `completed_checks` utilise `array_append DISTINCT` côté DB
- Constantes : `MOTEUR_DISCOVERY_DONE`, `MOTEUR_RADAR_DONE`, `MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED` (dans `shared/constants/workflow-checks.constants.ts`)

### Story 2.3 : Bandeaux de transition entre phases ✅

**Acceptance Criteria (livrés) :**

- Tous les checks Explorer présents (`discovery_done` + `radar_done`) → bandeau "Phase Explorer complète — passer à Valider ?"
- Tous les checks Valider présents (capitaine + lieutenants + lexique) → bandeau "Validation complète — Phase Finalisation débloquée"
- Bandeau avec bouton de navigation vers la phase suivante
- L'utilisateur peut ignorer / fermer le bandeau — pas de blocage

---

## Epic 3 : Pont Cerveau→Moteur

Le contexte stratégique du Cerveau est visible dans le Moteur et enrichit silencieusement tous les prompts IA. Enrichissement optionnel (NFR9).

### Story 3.1 : Contexte stratégique collapsable dans le Moteur ✅

**Acceptance Criteria (livrés) :**

- `MoteurStrategyContext` collapsable en haut du Moteur
- Affiche cible, angle, promesse, douleur, CTA du cocon
- Collapsé par défaut
- Si pas de stratégie définie pour le cocon, la section ne s'affiche pas
- Route : `GET /api/strategy/:cocoonId` (table `strategies` en DB)

### Story 3.2 : Enrichissement automatique des prompts IA ✅

**Acceptance Criteria (livrés) :**

- `loadPrompt()` injecte `{{strategy_context}}` si `cocoonId` fourni et stratégie existe
- Si pas de stratégie ou pas de `cocoonId`, `{{strategy_context}}` → string vide
- Les fichiers `.md` ne sont pas modifiés — enrichissement en pré-processing
- Prompts concernés : `intent-keywords.md`, `pain-translate.md`, `capitaine-ai-panel.md`, `propose-lieutenants.md`, `lieutenants-hn-structure.md`, `lexique-ai-panel.md`

### Story 3.3 : Indicateur d'alignement stratégique dans l'Audit ⏸️

**Statut :** NON IMPLÉMENTÉE — reste en backlog.
L'Audit a été extrait vers l'Explorateur, cette story peut être reconsidérée dans ce contexte.

---

## Epic 4 : Cache systématique + persistance PostgreSQL

L'utilisateur retrouve tous ses résultats à la reprise d'un article. Pattern cache multi-niveau : `keyword_metrics` (cross-article permanent) + `api_cache` (TTL).

### Story 4.1 : Cache multi-niveau uniforme ✅

**Acceptance Criteria (livrés) :**

- `keyword_metrics` (table DB) : métriques partagées entre articles (Volume, KD, CPC, PAA) — consultées AVANT tout autre cache
- `api_cache` (table DB) : cache TTL par requête hashée (consulté après `keyword_metrics`)
- Services concernés : `dataforseo.service`, `serp-analysis.service`, `autocomplete.service`, `paa-cache.service`, `discovery-cache.service`, `radar-cache.service`
- `dataforseo-cost-guard` contrôle le quota mensuel avant tout appel DataForSEO
- Purge horaire automatique : `DELETE FROM api_cache WHERE expires_at < NOW()` (job dans `server/index.ts`)

### Story 4.2 : Rechargement automatique par article ✅

**Acceptance Criteria (livrés) :**

- Sélection d'un article → `article-progress.store` charge les checks depuis DB
- Les composants Moteur réhydratent leurs états à partir des caches DB
- Aucun re-call API si cache valide
- Changement d'article → reset des stores et rechargement du nouvel article

### Story 4.3 : Migration JSON → PostgreSQL ✅ (epic étendu)

**Acceptance Criteria (livrés) :**

- Toutes les données chaudes en DB (articles, cocoons, silos, keywords, strategies, api_cache, keyword_metrics, article_explorations…)
- Script de migration `scripts/migrate-slug-to-id.ts` (slug → id)
- Backup SQL initial : `_backup_pg_20260418.sql`
- Archives JSON déplacées vers `data/_archive/`
- Plus aucun fichier JSON de données chaudes en racine `data/`

---

## Epic 5 : Labo — Recherche libre

`/labo` utilise les mêmes composants que le Moteur en mode `libre`. Pattern dual-mode via prop (NFR13).

### Story 5.1 : Vue LaboView + route `/labo` ✅

**Acceptance Criteria (livrés) :**

- Route `/labo` enregistrée dans `src/router/index.ts` (lazy-loaded)
- Accessible depuis la Navbar
- Champ de saisie de mot-clé libre
- Pas de sélection article/cocon requise

### Story 5.2 : Composants Moteur en mode libre ✅

**Acceptance Criteria (livrés) :**

- Chaque composant Moteur réutilisable accepte `mode: 'workflow' | 'libre'`
- En mode `libre` : utilise `keywordQuery` comme entrée
- En mode `libre` : pas d'émission `check-completed`, pas de persistance cache-article
- Seuils par défaut = niveau "Intermédiaire" (NFR8)

---

## Epic 6 : Moteur 3 phases + Verdict GO/NO-GO du Capitaine

Verdict feu tricolore (GO/ORANGE/NO-GO) + 6 KPIs contextuels par niveau article. Sous-onglet Capitaine = cœur du workflow de validation.

### Story 6.1 : Restructuration Moteur + navigation sous-onglets ✅

**Acceptance Criteria (livrés) :**

- Moteur en 3 phases visuelles : Explorer, Valider, Finalisation
- Phase ② Valider contient 3 onglets (Capitaine, Lieutenants, Lexique)
- Navigation libre (gating souple)
- Aucune action automatique au changement d'onglet (FR35)

### Story 6.2 : Scoring contextuel + verdict feu tricolore + route API validate ✅

**Acceptance Criteria (livrés) :**

- Route `POST /api/keywords/:keyword/validate` lance en parallèle : DataForSEO + Autocomplete + PAA + racine si longue traîne
- Retourne 6 KPIs bruts + verdict GO/ORANGE/NO-GO + seuils appliqués
- Seuils par niveau dans `shared/kpi-scoring.ts` (Pilier : Volume >1000, KD <40 ; Spécifique : Volume >30, KD <20)
- GO : ≥4/6 verts, AUCUN rouge sur Volume/KD, PAA non-rouge
- NO-GO auto si volume=0 ET PAA=0 ET autocomplete=0 (FR12)
- CPC asymétrique : >2€ bonus, 0-2€ neutre, jamais rouge (FR11)
- Cache via `keyword_metrics` cross-article (NFR5)

### Story 6.3 : Interface Capitaine — Thermomètre + KPIs + tooltip seuils ✅

**Acceptance Criteria (livrés) :**

- `CaptainValidation.vue` orchestre l'affichage
- `RadarThermometer` + `VerdictBar` pour le feu tricolore
- 6 barres KPI avec zones vert/orange/rouge (`CaptainVerdictPanel`)
- Tooltip au survol : seuils appliqués pour le niveau courant (FR14)
- Valeurs numériques brutes toujours visibles à côté des barres (FR36)
- Feedback NO-GO en 3 catégories (FR17)

### Story 6.4 : Input alternatif + historique + découpage racine + forcer GO ✅

**Acceptance Criteria (livrés) :**

- `CaptainInput` accepte un mot-clé alternatif
- `CaptainCarousel` permet de naviguer dans l'historique des tests
- Pas de re-call API pour la navigation historique (résultats en cache)
- `CaptainInteractiveWords` affiche "Analyse racine" pour longue traîne (3+ mots, données faibles)
- Le verdict reste sur le mot-clé ORIGINAL (racine = information complémentaire)
- Bouton "Forcer GO" pour outrepasser le verdict ORANGE/NO-GO (FR16)

### Story 6.5 : Panel IA expert SEO streaming + lock/unlock Capitaine ✅

**Acceptance Criteria (livrés) :**

- `CaptainAiPanel` se charge automatiquement en streaming SSE via `POST /api/keywords/:keyword/ai-panel`
- Premier token < 2s (NFR2)
- Panel dépliable, ne modifie jamais le feu tricolore (FR15)
- `CaptainLockPanel` : bouton "Valider ce Capitaine" → émet `moteur:capitaine_locked`
- Cadenas unlock pour déverrouiller (Lieutenants repasse en gating souple)
- Prompt : `capitaine-ai-panel.md`

---

## Epic 7 : Lieutenants — Analyse SERP des concurrents

Un seul scraping SERP (top 3-10) alimente Hn, PAA, Groupes. Données brutes conservées pour le Lexique (cascade zero-duplication).

### Story 7.1 : Route SERP analyze + curseur intelligent + en-tête Capitaine ✅

**Acceptance Criteria (livrés) :**

- `LieutenantsSelection.vue` affiche Capitaine verrouillé + niveau article en en-tête
- Curseur SERP 3-10 (défaut 10)
- Bouton "Analyser SERP" → `POST /api/serp/analyze`
- Scraping via `serp-analysis.service` (DataForSEO)
- Résultats persistés dans `api_cache` + `article_explorations` (contenus bruts)
- Curseur sous le défaut → filtre local instantané
- Curseur au-dessus du précédent max → scraping complémentaire

### Story 7.2 : Sections dépliables Hn / PAA / Groupes ✅

**Acceptance Criteria (livrés) :**

- `LieutenantSerpAnalysis` + `LieutenantH2Structure` affichent 3 sections dépliables
- Hn concurrents : H2 fréquents avec % récurrence, triés décroissant
- PAA associés : N+2 de pertinence
- Groupes : issus de la Phase Cerveau (cluster de termes)

### Story 7.3 : Candidats Lieutenants avec badges + sélection checkbox + compteur ✅

**Acceptance Criteria (livrés) :**

- `LieutenantProposals` + `LieutenantCard` : badges multi-source [SERP] [PAA] [Groupe]
- Badge de pertinence : Fort / Moyen / Faible (basé sur complémentarité avec Capitaine)
- Sélection checkbox
- Compteur recommandé par niveau : Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3
- Compteur mis à jour en temps réel (ex: "4/5 recommandés")

### Story 7.4 : Panel IA structure Hn + lock Lieutenants ✅

**Acceptance Criteria (livrés) :**

- Panel IA dépliable propose une structure Hn utilisant les Lieutenants sélectionnés
- Chargement streaming SSE
- Prompts : `propose-lieutenants.md` + `lieutenants-hn-structure.md`
- Bouton "Valider les Lieutenants" → émet `moteur:lieutenants_locked`
- `UnlockLieutenantsModal` pour confirmation lors du déverrouillage

---

## Epic 8 : Lexique TF-IDF + Validation finale

TF-IDF sur données SERP déjà scrapées. Aucune nouvelle requête API (cascade NFR11).

### Story 8.1 : Extraction TF-IDF + 3 niveaux + densité ✅

**Acceptance Criteria (livrés) :**

- `LexiqueExtraction.vue` affiche Capitaine + Lieutenants + niveau article en en-tête
- `POST /api/serp/tfidf` utilise les contenus SERP de `article_explorations` — ZÉRO nouvelle requête (FR27)
- `tfidf.service` classe les termes en 3 niveaux : Obligatoire ≥70%, Différenciateur 30-70%, Optionnel <30%
- Densité récurrence/page affichée (ex: ×4.2/page)
- Obligatoires pré-cochés ; Différenciateurs/Optionnels décochés par défaut

### Story 8.2 : Panel IA lexical + validation finale → ArticleKeywords ✅

**Acceptance Criteria (livrés) :**

- Panel IA dépliable (streaming SSE)
- Prompts : `lexique-ai-panel.md`, `lexique-analysis-upfront.md`
- Bouton "Valider le Lexique" → écriture finale `ArticleKeywords` (capitaine + lieutenants[] + lexique[])
- Émet `moteur:lexique_validated`
- Persistance via `PUT /api/article-keywords/:articleId`
- Mécanisme unlock disponible

---

## Epic 9 : Explorateur (Intention, Audit, Local)

L'utilisateur consulte Intention, Audit et Local dans un espace indépendant découplé du workflow de validation.

### Story 9.1 : Vue ExplorateurView + route `/explorateur` ✅

**Acceptance Criteria (livrés) :**

- Route `/explorateur` enregistrée (lazy-loaded)
- Accessible depuis la Navbar
- Contient : analyse d'intention SERP, comparaison local/national, autocomplete
- Signaux Local/Maps/GBP via composants `local/`
- Content Gap reste dans le Brief (Rédaction), pas dans l'Explorateur

### Story 9.2 : Retrait du Moteur ✅

**Acceptance Criteria (livrés) :**

- Aucun onglet Intention / Audit / Local / Content Gap dans le Moteur
- Seuls les onglets Phase ① Explorer, Phase ② Valider (3 sous-onglets), Phase ③ Finalisation sont dans le Moteur

---

## Epic 10 : Progression 5 checks + Guidage + Labo GO/NO-GO

5 dots par article, bandeaux de transition, verdict GO/NO-GO en mode libre dans le Labo.

### Story 10.1 : Checks `moteur:*` + dots de progression ✅

**Acceptance Criteria (livrés) :**

- 5 checks `moteur:*` (préfixés par workflow)
- Stockés dans `articles.completed_checks` TEXT[]
- `ProgressDots.vue` affiche 5 dots groupés (2 Explorer + 3 Valider)
- Mise à jour en temps réel à chaque `check-completed`

### Story 10.2 : Bandeaux de transition ✅

**Acceptance Criteria (livrés) :**

- `PhaseTransitionBanner` entre phases
- Phase ① complète → "Phase Explorer complète — passer à Valider ?"
- Phase ② complète → "Validation complète — Phase Finalisation débloquée"
- Ignorable / fermable (FR43)

### Story 10.3 : Labo — verdict GO/NO-GO en mode libre ✅

**Acceptance Criteria (livrés) :**

- `CaptainValidation` en mode `libre` dans le Labo
- Seuils par défaut = Intermédiaire (NFR8)
- Pas d'émission check-completed en mode libre
- Pas de persistance cache-article
- Discovery + Radar disponibles aussi en mode libre

---

## Epic 11 : Phase ③ Finalisation (ajout post-plan initial)

Onglet read-only affichant le récap des 3 verrouillages Phase ② et redirigeant vers la Rédaction. Cet épic n'était pas dans le plan initial du 2026-03-31 (qui prévoyait 2 phases avec suppression de Phase ③ Assigner) mais a été ajouté pendant l'implémentation.

### Story 11.1 : FinalisationRecap — read-only + redirection Rédaction ✅

**Acceptance Criteria (livrés) :**

- Onglet Finalisation présent dans la barre de navigation du Moteur (Phase ③)
- Read-only : aucune action, juste consultation
- Affiche en récap : Capitaine + Lieutenants[] + Lexique[]
- Débloqué visuellement quand les 3 checks Phase ② sont ✓
- Bouton / lien « Passer à la Rédaction » vers `/cocoon/:cocoonId/redaction`
- Composant : `FinalisationRecap.vue`

---

## Epic 12 : Migration PostgreSQL

Migration des fichiers JSON locaux vers PostgreSQL pour permettre le cache cross-article (`keyword_metrics`), la purge automatique, et la scalabilité.

### Story 12.1 : Schéma DB + pool pg ✅

**Acceptance Criteria (livrés) :**

- Pool `pg` exporté depuis `server/db/client.ts`
- Tables : articles, cocoons, silos, keywords, article_keywords, keyword_metrics, api_cache, discovery_cache, radar_cache, paa_cache, article_explorations, strategies, theme_config, local_entities, links, article_micro_context
- `articles.completed_checks` TEXT[] (checks préfixés `workflow:snake_case`)
- Health check au démarrage : `pool.query('SELECT 1')`

### Story 12.2 : Migration slug → id ✅

**Acceptance Criteria (livrés) :**

- Script `scripts/migrate-slug-to-id.ts`
- Routes refactorées : `/cocoon/:cocoonId/article/:articleId` (ex-`:slug`)
- Backup SQL : `_backup_pg_20260418.sql`
- Ancien JSON déplacé vers `data/_archive/`

### Story 12.3 : Purge horaire `api_cache` ✅

**Acceptance Criteria (livrés) :**

- `setInterval(..., 60 * 60 * 1000)` dans `server/index.ts`
- `DELETE FROM api_cache WHERE expires_at < NOW()`
- Log du nombre d'entrées purgées

---

## Epic 13 : Cerveau — Stratégie en 6 étapes

Workflow de définition de la stratégie du cocon en 6 étapes avec IA à chaque étape.

### Story 13.1 : 6 étapes strategy ✅

**Acceptance Criteria (livrés) :**

- `CerveauView` accessible via `/cocoon/:cocoonId/cerveau`
- 6 étapes : Cible, Douleur, Aiguillage, Angle, Promesse, CTA
- Store : `cocoon-strategy.store` + `strategy.store`
- Persistance en DB (table `strategies`)

### Story 13.2 : IA suggest / deepen / consolidate ✅

**Acceptance Criteria (livrés) :**

- `POST /api/strategy/suggest` — suggestion initiale
- `POST /api/strategy/deepen` — sous-questions d'approfondissement
- `POST /api/strategy/consolidate` — consolidation des sous-réponses
- Prompts : `strategy-suggest.md`, `strategy-deepen.md`, `strategy-consolidate.md`, `strategy-merge.md`, `strategy-enrich.md`
- Checks Cerveau : `cerveau:strategy_defined`, `cerveau:hierarchy_built`, `cerveau:articles_proposed`

---

## Epic 14 : Rédaction — Pipeline complet

Brief → Sommaire → Article → Meta → Éditeur avec SEO scoring live + actions contextuelles.

### Story 14.1 : Brief + Sommaire streamé ✅

**Acceptance Criteria (livrés) :**

- `briefStore.fetchBrief(articleId)` fetch parallèle (article + keywords + DataForSEO)
- `POST /api/generate/outline` (SSE) — sommaire streamé
- Prompt : `generate-outline.md`
- Éditable via `OutlineEditor`
- Check : `redaction:brief_validated`, `redaction:outline_validated`

### Story 14.2 : Article streamé + Meta ✅

**Acceptance Criteria (livrés) :**

- `POST /api/generate/article` (SSE) — article streamé section par section
- `POST /api/generate/meta` — meta title + description
- `POST /api/generate/reduce-section` — réduction de section
- Section tracking via events SSE (`section_start`, `section_done`)
- Check : `redaction:content_written`

### Story 14.3 : Éditeur TipTap + SEO scoring live ✅

**Acceptance Criteria (livrés) :**

- `ArticleEditor.vue` basé sur TipTap 3 (core + starter-kit + link + placeholder + vue-3)
- `useSeoScoring` watcher : 300ms debounce + `requestIdleCallback`
- `SeoPanel` avec 3 onglets (Keywords, Indicators, SerpData)
- `GeoPanel` pour scoring géographique
- `LinkSuggestions` pour suggestions de liens internes
- `useAutoSave` : sauvegarde périodique
- Check : `redaction:seo_validated`, `redaction:published`

### Story 14.4 : Actions contextuelles ✅

**Acceptance Criteria (livrés) :**

- `useContextualActions` : actions sur sélection dans TipTap
- `EditorBubbleMenu` affiche les actions disponibles
- Prompts : `server/prompts/actions/*.md` (reformulate, simplify, convert-list, pme-example, keyword-optimize, add-statistic, answer-capsule, question-heading, localize, sources-chiffrees, exemples-reels, ce-quil-faut-retenir)

---

## Epic 15 : Consolidation — Organisation par domaine + Qualité

Refactor d'organisation du code et outillage qualité.

### Story 15.1 : Organisation par domaine ✅

**Acceptance Criteria (livrés) :**

- `src/stores/` organisé en 5 domaines : article, keyword, strategy, external, ui
- `src/composables/` organisé en 5 domaines : keyword, intent, editor, seo, ui
- `server/services/` organisé en 7 domaines : keyword, external, intent, article, strategy, infra, queries
- Barrels d'index pour les types (`shared/types/index.ts`) et schemas (`shared/schemas/index.ts`)

### Story 15.2 : Outillage qualité ✅

**Acceptance Criteria (livrés) :**

- oxlint + eslint (avec `--cache`, `--fix`)
- Prettier
- knip (détection de code mort — `npm run check:dead`)
- madge (détection de cycles — `npm run check:cycles`)
- husky + lint-staged (pre-commit hook)
- Vitest 4 (unit) + Playwright (browser)
- Purge commits : dead exports (`shared/types/index.ts` nettoyé, 59 re-exports purgés), raw* schemas privatisés

---

## Backlog (non livré)

### Story 3.3 : Indicateur d'alignement stratégique dans l'Audit ⏸️
Indicateur visuel de matching entre mot-clé et stratégie du cocon. Audit ayant été migré vers l'Explorateur, à reconsidérer dans ce contexte.

### Vision Phase 3 (post-MVP)
- Génération de cocons entiers en un clic (articles + mots-clés + rédaction chaînée)
- Suggestions proactives de nouveaux cocons basées sur les gaps
- Boucle GSC post-publication (exploitation du `gsc.store`)
- Batch processing multi-articles en parallèle
- Score de complémentarité Capitaine ↔ Lieutenants
- Extension des tests Playwright

---

## Notes d'alignement

- **Écarts plan initial vs implémenté** :
  - Plan mars 2026 : « 2 phases (suppression Phase ③ Assigner) » → Réalité avril 2026 : **3 phases** (Phase ③ Finalisation ajoutée comme récap read-only, pas Assigner)
  - Plan mars 2026 : persistance JSON → Réalité : **PostgreSQL** (migration faite)
  - Plan mars 2026 : slugs dans les URL → Réalité : **id** (migration faite)
  - Plan mars 2026 : checks sans préfixe → Réalité : **préfixés par workflow** (`moteur:*`, `cerveau:*`, `redaction:*`)
  - Plan mars 2026 : 7 routes API nouvelles → Réalité : ~10 routes nouvelles (ai-panel, radar-exploration, article-explorations, keyword-queries ajoutées)

- Les Epics 11-15 ont été identifiés rétroactivement — ils ne figuraient pas dans le plan initial mais correspondent à des chantiers livrés pendant et après la période couverte par les Epics 1-10.
