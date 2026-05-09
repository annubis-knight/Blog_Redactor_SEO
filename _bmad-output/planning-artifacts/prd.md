---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
  - '_bmad-output/implementation-artifacts/tech-spec-score-kpi-pertinence-separation.md'
  - '_bmad-output/implementation-artifacts/tech-spec-radar-long-tail-suggestions.md'
  - '_bmad-output/implementation-artifacts/tech-spec-capitaine-radar-list-sidepanel.md'
  - '_bmad-output/implementation-artifacts/tech-spec-stabilisation-codebase.md'
  - '_bmad-output/implementation-artifacts/sprints-pain-point-relevance-evolution.md'
  - '_bmad-output/implementation-artifacts/tech-spec-kpi-types-nullable.md'
workflowType: 'prd'
completedAt: '2026-03-31'
lastUpdated: '2026-05-09T22:00:00Z'
updateReason: 'Refonte complète post-audit : préfixage des FR/NFR par domaine (FR-DIS, FR-RAD, FR-CAP, FR-LIE, FR-LEX, FR-FIN, FR-MOT, FR-CER, FR-RED, FR-LAB, FR-EXP, FR-DASH, FR-EXT, FR-INFRA, NFR-PERF, NFR-COST, NFR-INT, NFR-MAIN, NFR-SEC, NFR-OBS, NFR-RT, NFR-CFG), versioning par exigence (statut + date + remplaçant), rattrapage des 4 sprints livrés post 2026-04-24 (score-pertinence, longue traîne radar, painPoint, stabilisation codebase) et documentation des capacités jamais formalisées (GSC OAuth, cost-guard DataForSEO, content gap, micro-context, internal linking, batch creation, theme config, PAA cache, multi-provider IA, embeddings HuggingFace, contextual actions). Suppression de la numérotation séquentielle FR1-FR60 historique, remplacée par identifiants stables. Verdict Capitaine devenu informatif (FR-CAP-LOCK supersede FR-CAP-VERDICT-GATING). Ajout 2026-05-04 (delta vague 1 monstres Vue) : FR-LIE-AI-FRONTIER formalise la frontière sémantique containers principaux ↔ panel IA (rôle long terme du PRD pour préserver l''invariant historiquement protégé par le verrou Sprint C-1). Ajout 2026-05-04 (delta vague 3 composables) : FR-MOT-SOFT-GATING formalise le gating souple Phase ②/③ — la consultation reste libre, seules les écritures sont conditionnées par les checks workflow. Cette FR documente l''invariant porté par useMoteurSoftGating (composable extrait de MoteurView). Ajout 2026-05-04 (delta vague 5 — audit FRs post-refactor V1-V5) : 10 FRs formalisant des fonctionnalités utilisateur visibles mais jamais documentées au PRD (cache 30j Discovery, filtre pertinence sémantique, score ring SVG + tooltip 4 messages contextuels Pertinence absent, arbre PAA récursif parent→children, payload cross-tab Discovery→Lexique, détection cannibalisation Capitaine cocon, counts DB explorations TabCachePanel, bouton vider cache external api_cache, architecture panels toolbar+ResizablePanel partagée Workflow/Editor, panel IA Brief markdown stream). Ces FRs ne créent aucune nouvelle fonctionnalité — elles documentent l''existant pour que les futurs refactors préservent l''intent utilisateur sans se baser uniquement sur le code. Ajout 2026-05-04 (delta vague 5 bis — réorganisation FRs par composants macro partagés) : nouvelle §8.15 "Composants UI partagés (FR-UI)" avec 4 FRs (FR-UI-RADAR-CARD, FR-UI-AI-PANELS-PATTERN, FR-UI-ARTICLE-SHARED, FR-UI-MOTEUR-SHARED) qui formalisent les invariants partagés cross-onglets de composants macro consommés à plusieurs endroits (RadarKeywordCard sur 3 contextes, infrastructure AiPanel sur 6 panels, sous-composants article partagés Workflow/Editor, briques Moteur cross-onglets). Ces FRs ne dupliquent pas les FR métier des §8.4-§8.10 mais référencent celles-ci via "voir aussi" — elles capturent uniquement le fait qu''un composant est partagé et que sa cohérence cross-contextes est un invariant en soi (motivation : le chantier vague 1-5 a montré que les FR par onglet ne suffisent pas pour valider la non-régression d''un composant macro touché par un refactor). Ajout 2026-05-05 (chantier KPI nullable) : 4 nouvelles FRs §8.14 (FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-DISPLAY-DASH, FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-SCORING-NULLSAFE) qui formalisent la migration des types KPI marché (KeywordOverview, LocationMetrics, RadarKeywordKpis, ValidatePainResult.dataforseo, KeywordAuditResult) vers number | null de bout en bout. Chaque FR porte des AC testables Vitest (pas seulement narratives). Extension FR-INFRA-NO-SCORE-FALLBACK (ajout Difficulty/Cpc/Competition au scope ESLint), FR-INFRA-SCORE-MODULE (ajout helpers formatVolume/Cpc/Kd/Percent), FR-MOT-RAW-KPIS (placeholder "—" quand KPI absent). Source : tech-spec-kpi-types-nullable. Ajout 2026-05-05 (chantier fetch-to-wrapper-migration) : FR-INFRA-API-WRAPPER affiné (périmètre clarifié, dette résorbée, critère mesurable via audit), FR-INFRA-API-STREAM nouveau (wrapper SSE unifié pour POST → ReadableStream avec mêmes garanties cost-log + KNOWN_ERROR_CODES que apiPost), NFR-INT-API-WRAPPER affiné (critère d''acceptation = 0 violation audit), NFR-OBS-EXTERNAL-API-OPT-OUT nouveau (commentaire `// External API call — bypass wrapper by design` obligatoire sur les 14 fetch externes côté server/services/external/*). Section §12.5 dette technique : ligne `fetch() directs résiduels` marquée résorbée. Source : tech-spec-fetch-to-wrapper-migration. Ajout 2026-05-05 (chantier audit couverture DB) : 9 nouvelles FR-INFRA §8.14 formalisant les tables PostgreSQL jusqu''ici fantômes ou sous-couvertes au PRD (FR-INFRA-PAA-EXPLORATIONS, FR-INFRA-INTENT-EXPLORATIONS-LEGACY, FR-INFRA-KEYWORDS-SEO, FR-INFRA-LOCAL-ENTITIES, FR-INFRA-LIEUTENANT-EXPLORATIONS, FR-INFRA-KEYWORD-DISCOVERIES, FR-INFRA-ARTICLE-STRATEGIES, FR-INFRA-COCOON-STRATEGIES, FR-INFRA-MICRO-CONTEXTS). Chaque FR documente le schéma + producteurs + consommateurs avec lignes de code source. Vérification DB live (psql) confirme 20 tables actives (vs 22 dans les CREATE TABLE — 2 renommées via migration 010, 1 jamais matérialisée : `intent_explorations`). Ajout d''une §8.14.bis Matrice de couverture tables ↔ FR (vue inverse FR↔table) qui répond aux questions opérationnelles : impact d''un changement schéma, impact d''un changement FR, détection de tables sans FR. Règle de maintenance : toute migration créant/modifiant une table doit ajouter/maj une ligne dans la matrice.'
synced_with:
  - '_bmad-output/planning-artifacts/architecture.md'
  - 'docs/ARCHITECTURE_FLOWS.md'
  - 'docs/moteur-data-flow.md'
  - 'docs/scoring-kpi-vs-relevance.md'
  - 'docs/pain-point-editorial-backbone.md'
  - 'docs/captain-ui-improvements.md'
  - 'docs/captain-keyword-crafting.md'
  - 'docs/ai-usage-map.md'
classification:
  projectType: 'web_app'
  domain: 'SEO Content Production Tool'
  complexity: 'medium-high'
  projectContext: 'brownfield'
---

# Product Requirements Document — Blog Redactor SEO

**Auteur :** Utilisateur
**Date initiale :** 2026-03-30
**Dernière refonte :** 2026-05-04

---

## Convention de lecture

### Identifiants stables (non séquentiels)

Chaque exigence a un identifiant **stable** préfixé par domaine. Les FR ne sont **plus numérotés** linéairement (FR1, FR2…) — ils sont nommés par leur capacité (`FR-CAP-LOCK`, `FR-RAD-LONGTAIL-PERSIST`…). Une exigence supprimée ne libère pas son identifiant, et une nouvelle exigence ne renumérote rien.

### Préfixes par domaine

| Préfixe | Domaine |
|---|---|
| `FR-CER` | Cerveau (stratégie article + cocon) |
| `FR-DASH` | Dashboard / Cocoon Landing |
| `FR-MOT` | Moteur — règles transversales (3 phases, modes, checks) |
| `FR-DIS` | Moteur — onglet Discovery (Phase ① Explorer) |
| `FR-RAD` | Moteur — onglet Radar (Phase ① Explorer) |
| `FR-CAP` | Moteur — onglet Capitaine (Phase ② Valider) |
| `FR-LIE` | Moteur — onglet Lieutenants (Phase ② Valider) |
| `FR-LEX` | Moteur — onglet Lexique (Phase ② Valider) |
| `FR-FIN` | Moteur — onglet Finalisation (Phase ③) |
| `FR-RED` | Rédaction (brief, sommaire, article, meta, éditeur) |
| `FR-LAB` | Labo (recherche libre) |
| `FR-EXP` | Explorateur (intent, autocomplete, local, content gap) |
| `FR-EXT` | Intégrations externes (DataForSEO, GSC, providers IA, HuggingFace) |
| `FR-INFRA` | Infrastructure transversale (cache, persistance, validation, multi-provider) |
| `NFR-PERF` | Performance |
| `NFR-COST` | Coût et optimisation API |
| `NFR-INT` | Intégration et contrats internes |
| `NFR-MAIN` | Maintenabilité |
| `NFR-SEC` | Sécurité et robustesse |
| `NFR-OBS` | Observabilité |
| `NFR-RT` | Compatibilité runtime / versions |
| `NFR-CFG` | Configuration et environnement |

### Métadonnées par exigence

Chaque exigence porte un bloc statut compact :

```
**Statut** : active | deprecated | superseded
**Depuis** : YYYY-MM-DD (date de mise en service)
**Remplace** : <id> (si applicable)
**Source** : tech-spec ou commit (si différent du PRD initial)
```

Si non précisé, la valeur par défaut est : `Statut: active`, `Depuis: 2026-03-30` (création du PRD), `Source: PRD initial`.

---

## 1. Executive Summary

**Blog Redactor SEO** est un outil de production de contenu SEO pour un consultant solo expert. L'application couvre le cycle complet :

1. **Cerveau** — stratégie de cocon sémantique (cible, douleur, angle, promesse, CTA, hiérarchisation des articles).
2. **Moteur** — validation de mots-clés sur 6 onglets en 3 phases visuelles (Phase ① Explorer : Discovery / Radar — Phase ② Valider : Capitaine / Lieutenants / Lexique — Phase ③ Finalisation).
3. **Rédaction** — brief enrichi, sommaire et article streamés en SSE, éditeur TipTap avec scoring SEO live et 12 actions contextuelles.

L'objectif est de passer de « j'ai un cocon à remplir » à « article publié avec mots-clés validés » rapidement, sans se noyer dans la complexité.

### Insight fondamental

Le problème n'est pas de générer du contenu — c'est d'avoir **confiance** dans le mot-clé et la structure **avant** de rédiger. Le Moteur est conçu pour donner cette confiance via :

- un scoring **bimodal** (Score Marché objectif + Score Pertinence subjectif lié à la douleur de l'article),
- un verdict **informatif** (l'utilisateur garde le libre arbitre, peut verrouiller même un NO-GO),
- des **panels IA contextuels** en streaming SSE qui enrichissent sans imposer,
- du **cache cross-article** qui élimine les appels redondants.

### Ce qui rend ce produit unique

1. **Verdict bimodal qui donne confiance** — Score Marché (Volume / KD / CPC / PAA / Intent / Autocomplete) ET Score Pertinence (Pain alignment / PAA×douleur / Autocomplete×douleur / Racines / Intent×douleur) calculés et affichés séparément. Verdicts informatifs, l'utilisateur lock librement.

2. **Sophistication invisible** — Cache à 3 niveaux (`external_api_cache` TTL, `keyword_metrics` cross-article permanent, `paa_cache` hiérarchique). Cost-guard sliding-window sur DataForSEO. Multi-provider IA (Claude / Gemini / OpenRouter / Mock) avec fallback automatique 429/503. Progression cochée silencieusement via `articles.completed_checks` TEXT[].

3. **Outil taillé sur mesure** — Workflow consultant : Cerveau → Moteur → Rédaction. Hiérarchie Silos / Cocons / Articles avec niveaux Pilier / Intermédiaire / Spécifique. Injection automatique du contexte stratégique et du painPoint dans **6+ prompts IA** via `loadPrompt()` avec variables `{{strategy_context}}` et `{{painPoint}}`.

4. **Récupération longue-traîne** — Le Radar génère des keywords courts (~20 candidats) puis dérive jusqu'à 10 suggestions longue-traîne avec score de préférence 1-10, persistées en JSONB pour idempotence à la régénération.

5. **Observabilité intégrée** — Logger central configurable (`logs.config.ts`), activity log front (cost-log store), DbOps tracking, known error codes surfacés en UI, health check, job de purge horaire `external_api_cache`.

---

## 2. Project Classification

| Critère | Valeur |
|---|---|
| **Type** | Web App — SPA Vue 3 + API Express |
| **Domaine** | Outil de production de contenu SEO |
| **Complexité** | Moyenne-haute — orchestration multi-providers IA, cache 3 niveaux, scoring bimodal, streaming SSE |
| **Contexte** | Brownfield — 100+ composants Vue, 22 stores Pinia (5 domaines), 42+ services backend (7 domaines), 24 routes Express, 15 vues, ~270 fichiers de tests (~4400 cas) |
| **Stack** | Vue 3.5.29, Pinia 3.0.4, Vue Router 5, TipTap 3.20+, Express 5.2.1, PostgreSQL (pg 8.20.0), Anthropic SDK 0.78.0, Google GenAI 1.50.1, HuggingFace Transformers 3.8.1, DataForSEO, Zod 4.3.6, Vitest 4.0.18, Playwright 1.59.1, TypeScript 5.9.3, Vite 7.3.1 |
| **Usage** | Local, desktop, utilisateur unique |
| **Node engines** | `^20.19.0 \|\| >=22.12.0` |

---

## 3. Success Criteria

### User Success

- **Facilité = Qualité** — La simplicité d'utilisation est au même niveau que la qualité des mots-clés validés et des textes produits.
- **Guidage naturel** — L'utilisateur sait toujours où il en est dans le workflow (dots de progression, bandeaux de transition) sans documentation.
- **Confiance avant rédaction** — Score Marché + Score Pertinence donnent un verdict bimodal clair sur le Capitaine. Lieutenants tirés de SERP réelle, Lexique extrait des concurrents, painPoint propagé dans tous les prompts IA. Au moment de rédiger, tout est verrouillé et validé.
- **Recherche libre accessible** — Le Labo permet de vérifier une intuition en quelques clics, sans contexte article/cocon.

### Business Success

- **Workflow bout-en-bout** — Le chemin Cerveau → Moteur (6 onglets) → Rédaction fonctionne pour tout article d'un cocon.
- **Réduction du temps de production** — La Phase ② Valider est celle où l'on passe le MOINS de temps possible grâce au cache cross-article.
- **Autonomie complète** — L'outil couvre 100% du workflow sans outil externe.

### Technical Success

- **Zéro appel API redondant** — Cache à 3 niveaux : `external_api_cache` (TTL par type), `keyword_metrics` (cross-article permanent), `paa_cache` (90 jours, hiérarchique).
- **Persistance PostgreSQL** — Articles, keywords, progress, strategies, cache en base. Purge horaire `external_api_cache` expirées.
- **Réactivité** — Streaming SSE pour appels longs (Claude). Cost-guard DataForSEO en sliding-window pour bloquer les dépassements budget avant l'appel.
- **Observabilité** — Activity log front + logger central back + health check.

### Indicateurs mesurables

| Indicateur | Cible |
|---|---|
| Appels API redondants | 0 (cache `external_api_cache` + `keyword_metrics` + `paa_cache`) |
| Phases du Moteur identifiables | 3 phases visuelles sur 6 onglets |
| Progression par article | 5 checks `moteur:*` + 3 checks `cerveau:*` + 5 checks `redaction:*` automatiquement écrits |
| Persistance | 100% PostgreSQL (pas de fichier JSON côté chaud) |
| Workflow sans outil externe | Oui |
| Cache hit rate DataForSEO après première utilisation | > 90% |

---

## 4. User Journeys

### Journey 1 — Production d'article de A à Z (Success Path)

**Contexte :** Lundi matin, l'utilisateur ouvre l'app pour produire un article dans le cocon « CRM pour PME ». Pas encore de mots-clés validés.

1. **Dashboard** → Silo « Solutions Digitales » → Cocon « CRM pour PME »
2. **Cocoon Landing** → 3 portes : Cerveau (fait), **Moteur** (à faire), Rédaction
3. **Moteur — Phase ① Explorer**
   - **Discovery** : analyse IA des mots-clés candidats (check `moteur:discovery_done`)
   - **Radar** : scan Douleur Intent en 2 passes (broad → specific) ; scoring bimodal par card ; section optionnelle « Suggestions longue traîne » qui combine racines + IA en 10 candidats max ; sélection envoyée au Capitaine (check `moteur:radar_done`)
4. **Moteur — Phase ② Valider — Capitaine** → Liste verticale des entrées validées (mode workflow) avec side-panel sticky : KPIs marché en lecture seule, panel IA streaming SSE expert, racines extraites, panel d'actions (lock / unlock / envoi Lieutenants). Le verdict est informatif, le bouton « Valider Capitaine » est toujours actif (check `moteur:capitaine_locked`).
5. **Moteur — Phase ② Valider — Lieutenants** → Bouton « Analyser SERP » → scraping top 10 via DataForSEO. Hn concurrents, PAA associés, groupes croisés. Filtre auto post-IA (cap par level : Pilier 5 / Intermédiaire 5 / Spécifique 4). Sélection (check `moteur:lieutenants_locked`).
6. **Moteur — Phase ② Valider — Lexique** → TF-IDF extrait des données SERP déjà scrapées (zéro requête supplémentaire). 3 niveaux : Obligatoire / Différenciateur / Optionnel. Tri configurable (A-Z / densité / alignement douleur Jaccard). Panel IA upfront. (check `moteur:lexique_validated`).
7. **Moteur — Phase ③ Finalisation** → Récap read-only des 3 verrouillages. Bouton « Passer à la rédaction ».
8. **Rédaction** → Brief enrichi (analyse markdown) → Sommaire streamé via SSE (`generate-outline.md`) → Article streamé section par section avec rate-limit 429 backoff (`generate-article-section.md`) → Meta titre + description (`generate-meta.md`) → Éditeur TipTap avec scoring SEO live (300ms debounce + `requestIdleCallback`) et 12 actions contextuelles sur sélection.
9. **Résultat** → Article rédigé, mots-clés validés, export HTML.

### Journey 2 — Vérification au Labo (Recherche libre)

L'utilisateur a une intuition sur « erp cloud pme ». Vérification rapide avant intégration.

1. **Navbar** → **Labo**
2. **Labo** → Champ libre. Saisit « erp cloud pme ». Composants Moteur en mode `libre` (article virtuel id=0, niveau par défaut Intermédiaire, seuils par défaut Intermédiaire). Score Marché + Score Pertinence calculés et affichés sans gating.
3. **Décision** → Mot-clé prometteur, retour au workflow.

### Journey 3 — Reprise d'un article en cours

Article commencé la semaine dernière. Checks Discovery + Radar faits.

1. **Moteur** → Sélection article. Dots montrent Discovery et Radar faits.
2. **Cache à 3 niveaux** → `external_api_cache` + `keyword_metrics` + `paa_cache`. Aucun re-call API.
3. **Phase ② Valider** → Reprise exactement là où il s'était arrêté.
4. **Contexte stratégique** → Toujours accessible via `MoteurStrategyContext`. PainPoint propagé dans tous les prompts via `getArticlePainPoint()`.

### Journey 4 — Audit GSC post-publication

Article publié il y a 30 jours. L'utilisateur veut voir si le mot-clé ranke.

1. **Connexion GSC** → OAuth flow (status / auth / callback).
2. **Performance query** → Dates + dimensions (query, page, device, country).
3. **Keyword gap** → Comparer mots-clés ciblés vs réellement indexés.
4. **Décision** → Optimiser ou produire un article complémentaire.

---

## 5. Innovation & Novel Patterns

### 5.1 Sophistication invisible

- Tracking progression silencieux via `articles.completed_checks` TEXT[] — source unique de vérité.
- Suggestions sans bloquer (bandeaux `PhaseTransitionBanner`).
- Enrichissement automatique des prompts IA avec `{{strategy_context}}` et `{{painPoint}}` sans que l'utilisateur le voie.
- Navigation libre 100 % — aucun gating dur.

### 5.2 Pont Cerveau → Moteur

Injection automatique du contexte stratégique (cible, douleur, angle, promesse, CTA) dans 6+ prompts IA via `{{strategy_context}}` et du painPoint via `{{painPoint}}`. Fallback à chaîne vide si stratégie absente.

### 5.3 Cache à 3 niveaux

- `external_api_cache` (TTL par type, purge horaire) pour les appels d'API.
- `keyword_metrics` (cross-article, permanent) pour Volume / KD / CPC / PAA / Intent / Autocomplete / SERP raw.
- `paa_cache` (TTL 90 jours, hiérarchique par keyword + depth).

### 5.4 Scoring bimodal et verdict informatif

Score Marché (objectif, 6 KPIs, poids Vol 30 / KD 20 / Intent 15 / PAA 10 / AC 10 / CPC 10) et Score Pertinence (subjectif, lié à la douleur de l'article, poids Pain 30 / PAA×douleur 25 / AC×douleur 15 / Racines 20 / Intent×douleur 10) coexistent. Le verdict reste informatif, le lock est indépendant.

### 5.5 Multi-provider IA avec fallback

`ai-provider.service.ts` route vers Claude, Gemini, OpenRouter ou Mock selon `AI_PROVIDER`. Fallback automatique sur 429 (`AIProviderQuotaError`) et 503 (`AIProviderOverloadedError`), désactivable via `AI_PROVIDER_NO_FALLBACK=1`. USAGE_SENTINEL en fin de stream pour parsing uniforme.

### 5.6 Cost-guard sliding-window DataForSEO

Avant chaque appel : estimation du coût via `endpointPricing` + `perItemSurcharge`. Réservation dans la fenêtre glissante (par défaut $0.50 / 30 min). Throw `CostBudgetError` si la réservation dépasserait le budget — l'appel n'a jamais lieu.

### Risques et mitigations

| Risque | Mitigation |
|---|---|
| Guidage trop discret | Dots visibles dans liste articles — signal fort |
| Enrichissement prompts dégrade l'IA | Contexte injecté comme additionnel, fallback prompt standard |
| Navigation libre → étapes sautées | Message inline si signal manquant + bandeaux de transition |
| Migration JSON → PostgreSQL | Scripts `migrate-slug-to-id.ts` + backup `_backup_pg_20260418.sql` |
| Quota IA dépassé | Multi-provider fallback (Claude → Gemini → OpenRouter) |
| Budget DataForSEO dépassé | Cost-guard prévient avant l'appel |
| Composants > 1000 lignes (CaptainValidation, KeywordDiscoveryTab, BrainPhase) | Cible stabilisation `< 400L` (NFR-MAIN-FILE-SIZE), à découper |

---

## 6. Web App — Exigences spécifiques

SPA Vue 3 + backend Express 5, usage local/desktop, utilisateur unique. Pas de déploiement cloud, pas de multi-utilisateur, pas de SEO sur l'app elle-même.

**Architecture existante :**
- Frontend : Vue 3.5 + Vue Router 5 + Pinia 3 (22 stores en 5 domaines) + TipTap 3
- Backend : Express 5.2, port 3400 (configurable via `PORT`), CORS localhost only
- Frontend dev : Vite, port 5400 (configurable via `VITE_PORT`)
- Communication : REST API + SSE streaming (Claude tokens, génération article par section, panels IA)
- Validation : Zod 4 schémas partagés front/back (`shared/schemas/`)
- Data : PostgreSQL (pg 8.20) — articles, keywords, cocoons, strategies, external_api_cache, keyword_metrics, article_explorations, captain_explorations, radar_explorations, theme_config, internal_links…
- APIs externes : Anthropic Claude, Google GenAI, OpenRouter, HuggingFace Transformers (embeddings), DataForSEO, Google Autocomplete, Google Search Console

**Contraintes brownfield :**
- Réutiliser les 100+ composants existants — Labo réutilise les composants Moteur en mode `libre`.
- Store `article-progress` (dans `stores/article/`) exploite `articles.completed_checks` TEXT[].
- Cache `external_api_cache` + `keyword_metrics` + `paa_cache`.
- Prompts IA dans `server/prompts/*.md` — enrichissement via `loadPrompt()` et variables `{{...}}`.

---

## 7. Project Scoping & Phased Development

### 7.1 Phases livrées (au 2026-05-04)

| Chantier | Livraison | Source |
|---|---|---|
| Moteur 6 onglets / 3 phases | ✅ | PRD initial |
| Verdict GO/NO-GO Capitaine seuils contextuels | ✅ | PRD initial |
| Scraping SERP unique cascade Lieutenants → Lexique TF-IDF | ✅ | PRD initial |
| 5 checks `moteur:*` automatiques | ✅ | PRD initial |
| 3 checks `cerveau:*` (strategy_defined, hierarchy_built, articles_proposed) | ✅ | shared/constants/workflow-checks.constants.ts |
| 5 checks `redaction:*` (brief_validated, outline_validated, content_written, seo_validated, published) | ✅ | shared/constants/workflow-checks.constants.ts |
| Enrichissement prompts Cerveau → Moteur (`{{strategy_context}}`) | ✅ | PRD initial |
| Labo & Explorateur découplés | ✅ | PRD initial |
| Migration PostgreSQL | ✅ | tech-spec-migration-json-to-postgresql (archivé) |
| Refactor stores / composables / services par domaine | ✅ | tech-spec-refacto-architecture-v1 (archivé) |
| **Score bimodal KPI + Pertinence (séparation)** | ✅ 2026-04-28 | tech-spec-score-kpi-pertinence-separation |
| **PainPoint propagé dans 6 prompts Moteur** | ✅ 2026-04-28 | sprints-pain-point-relevance-evolution |
| **Score Pertinence cumulatif PAA (formule F1)** | ✅ 2026-04-28 | sprints-pain-point-relevance-evolution |
| **Verdict informatif (suppression `canLock`)** | ✅ 2026-04-28 | tech-spec-score-kpi-pertinence-separation |
| **Capitaine liste verticale + side-panel sticky** | ✅ 2026-04-25 | tech-spec-capitaine-radar-list-sidepanel |
| **Suggestions longue traîne Radar (10 max, score 1-10, persistance JSONB)** | ✅ 2026-05-03 | tech-spec-radar-long-tail-suggestions |
| **Module `shared/score/` unifié + règle ESLint `no-score-fallback`** | ✅ 2026-05-03 | tech-spec-stabilisation-codebase |
| **Script `npm run check:health`** | ✅ 2026-05-03 | tech-spec-stabilisation-codebase |
| **74 tests sur 8 macro composants user-facing** | 🟡 in-progress | test-coverage-gaps |

### 7.2 Phase à venir — Vision

- Génération de cocons entiers en un clic (articles + mots-clés + rédaction chaînée)
- Suggestions proactives de nouveaux cocons basées sur les gaps GSC
- Boucle GSC post-publication exploitée plus largement (store `gscStore` présent)
- Batch processing multi-articles
- Score de complémentarité Capitaine ↔ Lieutenants
- Découpage des 3 fichiers > 1000 lignes (CaptainValidation, KeywordDiscoveryTab, BrainPhase)
- Migration des ~20 `fetch()` directs résiduels vers `apiGet/apiPost/...`

---

## 8. Functional Requirements

### 8.1 — Cerveau (FR-CER)

#### FR-CER-STEPS-ARTICLE
L'article suit 6 étapes stratégiques séquentielles dans le Cerveau : **Cible, Douleur, Aiguillage, Angle, Promesse, CTA**. Chaque étape suit un cycle : suggestion IA → input utilisateur → approfondissement (sous-questions) → consolidation (fusion) → validation.
**Source :** `server/routes/strategy.routes.ts` (suggest / deepen / consolidate / enrich / save) — `src/stores/strategy/strategy.store.ts` — prompts `strategy-suggest.md`, `strategy-deepen.md`, `strategy-consolidate.md`.

#### FR-CER-STEPS-COCOON
Le cocon suit également 6 étapes (Cible, Douleur, Angle, Promesse, CTA, Articles) plus 4 étapes annexes (Articles-structure, Articles-PAA-queries, Articles-spécialisés, Topics).
**Source :** `server/routes/strategy.routes.ts` (cocoon endpoints) — prompts `cocoon-brainstorm.md`, `cocoon-articles.md`, `cocoon-articles-topics.md`, `cocoon-paa-queries.md`, `cocoon-articles-spe.md`.

#### FR-CER-AIGUILLAGE
L'étape Aiguillage évalue le type d'article (Pilier / Intermédiaire / Spécifique) et sa position dans la hiérarchie. Pilier : `parent=null`. Intermédiaire : `parent=Pilier.slug`. Spécifique : `parent=Intermédiaire.slug`.
**Source :** `shared/types/strategy.types.ts` — règles dans `cocoon-articles.md`.

#### FR-CER-BATCH-CREATE
Création d'articles en lot dans un cocon via `POST /api/articles/batch-create` avec payload `{ cocoonName, articles: [{ suggestedKeyword, suggestedSlug, title, type, painPoint?, level? }] }`.
**Source :** `server/routes/articles.routes.ts:171`.

#### FR-CER-MICRO-CONTEXT
Chaque article porte un micro-contexte éditorial `{ angle, tone, directives, targetWordCount }` accessible via `GET / PUT /api/articles/:id/micro-context`. Injecté dans les prompts de génération via `buildMicroContextBlock()`.
**Source :** `server/routes/articles.routes.ts:189-240` — table `article_micro_contexts`.

#### FR-CER-WORD-COUNT-RECOMMEND
Recommandation de longueur cible via `POST /api/articles/:id/recommend-word-count`. Combine moyenne SERP concurrents + base par type (Pilier 1800-3500, Intermédiaire 1200-2500, Spécifique 800-1500) + suggestion IA. Retourne `{ recommended, breakdown: { typeBase, competitorsAvg, aiSuggestion, finalRecommendation, reasoning } }`.
**Source :** `server/routes/articles.routes.ts:245` — `server/services/article/target-word-count.service.ts:62-83`.

#### FR-CER-THEME-CONFIG
Configuration thématique au niveau projet (1 seule ligne) : avatar (secteur, taille, localisation, budget, maturité digitale), positioning (audience, promesse, différenciateurs, douleurs), offerings (services, CTA principal, cible CTA), tone of voice (style, vocabulaire). Injectée dans les prompts via `buildThemeContextBlock()` → bloc `{{themeContext}}`.
**Source :** table `theme_config(id, data JSONB)` — `src/stores/strategy/theme-config.store.ts` — `server/routes/strategy.routes.ts:26-77`.

#### FR-CER-CHECKS
Trois checks Cerveau écrits automatiquement dans `articles.completed_checks` : `cerveau:strategy_defined`, `cerveau:hierarchy_built`, `cerveau:articles_proposed`.
**Source :** `shared/constants/workflow-checks.constants.ts:30-38`.

#### FR-CER-CONTEXT-FOR-MOTEUR
Endpoint `GET /api/cocoons/:id/strategy/context` retourne `{ cocoonName, siloName, cible, douleur, angle, promesse, cta }` (uniquement les valeurs `validated`). Consommé par `MoteurStrategyContext.vue` (composable `useMoteurBridge`).
**Source :** `server/routes/cocoons.routes.ts:41` — `src/composables/moteur/useMoteurBridge.ts`.

---

### 8.2 — Dashboard / Cocoon Landing (FR-DASH)

#### FR-DASH-NAV
Navigation hiérarchique Silo → Cocon → Article. Affichage des stats agrégées par silo, listes de cocons, cartes d'articles avec progression.
**Source :** `src/views/DashboardView.vue` — composants `SiloCard`, `CocoonCard`, `ArticleCard`.

#### FR-DASH-PROGRESS
Pour chaque article, affichage des dots de progression (●/○) côte à côte du nom — un dot par check Moteur attendu.
**Source :** PRD initial — `src/components/dashboard/ArticleCard.vue`.

#### FR-DASH-WORKFLOW-CHOICE
Cocoon Landing offre 3 portes : Cerveau (stratégie), Moteur (validation keywords), Rédaction. Composant `WorkflowChoice.vue`.
**Source :** `src/views/CocoonLandingView.vue`.

---

### 8.3 — Moteur — règles transversales (FR-MOT)

#### FR-MOT-PHASES
Les onglets sont organisés en 3 phases visuelles : Phase ① Explorer (Discovery, Radar), Phase ② Valider (Capitaine, Lieutenants, Lexique), Phase ③ Finalisation.

#### FR-MOT-FREE-NAV
Navigation libre entre tous les onglets — aucun blocage dur. Le verrouillage Phase ② est un gating souple : la consultation reste libre, seules les écritures sont conditionnées.

#### FR-MOT-SOFT-GATING
**Gating souple Phase ②/③** *(ajout 2026-05-04, formalisation Vague 3 composables)*. Le Moteur applique 3 verrous d'écriture dérivés des checks `articles.completed_checks` :
- `isCaptaineLocked` ← check `capitaine_locked` posé.
- `isLieutenantsLocked` ← check `lieutenants_locked` posé.
- `isLexiqueValidated` ← check `lexique_validated` posé.

Conséquences :
1. **Lexique** : extraction interdite tant que `isCaptaineLocked === false` (soft-gate UI affichée — l'utilisateur peut toujours regarder l'onglet, mais pas extraire).
2. **Discovery / Radar** : accessibles uniquement si `isDiscoveryAllowed === true` (= keyword article a status `'suggested'` dans `keywordsStore`, sinon validé au niveau cocon → onglets verrouillés visuellement).
3. **Finalisation / Rédaction** : déverrouillage final = les 3 checks Phase ② posés (`isFinalisationUnlocked`). Bouton "Continuer vers la Rédaction" disabled sinon, tooltip énumère les checks manquants.

**Source :** `src/composables/moteur/useMoteurSoftGating.ts`. **Tests :** `tests/unit/composables/moteur/useMoteurSoftGating.test.ts`. **Verrou logique pure** : `src/composables/moteur/useFinalisationGating.ts` (déjà testé unitairement avant la Vague 3).

#### FR-MOT-ARTICLE-SELECTION
L'utilisateur doit sélectionner un article avant d'utiliser les actions du Moteur en mode workflow.

#### FR-MOT-MODE-BIMODAL
Composants Moteur acceptent prop `mode: 'workflow' | 'libre'`. Mode workflow = article sélectionné, seuils contextuels par niveau, checks émis. Mode libre = article virtuel id=0, seuils par défaut Intermédiaire (modifiables), pas de checks.
**Source :** PRD initial — confirmé dans `CaptainValidation.vue`, `LieutenantsSelection.vue`, `LexiqueExtraction.vue` (`v-if="mode === 'workflow'"`).

#### FR-MOT-CHECKS
5 checks Moteur écrits automatiquement dans `articles.completed_checks` : `moteur:discovery_done`, `moteur:radar_done`, `moteur:capitaine_locked`, `moteur:lieutenants_locked`, `moteur:lexique_validated`.
**Source :** `shared/constants/workflow-checks.constants.ts:14-27`.

#### FR-MOT-CHECKS-CONSTANTS
Tout `emit('check-completed', …)`, `articleProgressStore.addCheck(...)`, `progressStore.completedChecks.includes(...)`, ou tout site qui produit/consomme un check workflow DOIT utiliser une constante de `shared/constants/workflow-checks.constants.ts`. Aucune string en dur tolérée.

**Format strict des checks** : `<prefix>:<snake_case_action>`. Préfixes autorisés : `moteur`, `cerveau`, `redaction`. Le schéma Zod `addCheckSchema` (`shared/schemas/article-progress.schema.ts`) valide ce format au niveau backend et **rejette** tout check non conforme avec un 400.

**Migration historique 2026-05-08** :
- Plusieurs sites du code émettaient des checks au format legacy sans préfixe (`'capitaine_locked'`, `'lieutenants_locked'`, `'discovery_done'`, `'radar_done'`, `'lexique_validated'`, `'brief-validated'`). Conséquence : les ProgressDots et le gating workflow lisaient le format préfixé, ne trouvaient rien → dots non-remplis. La DB se remplissait avec les 2 formats en doublon.
- **Migration `020_normalize_completed_checks.sql`** : convertit tous les checks legacy en format préfixé, élimine les doublons, sur tous les articles existants.
- **Sites corrigés** : `CaptainPanel.vue` (4 emits), `BriefStructureStep.vue` (1 emit), `useMoteurSoftGating.ts` (3 lectures), `useMoteurTabs.ts` (2 lectures), `useMoteurCrossTabState.ts` (2 emits).
- **Test de garde anti-régression** : `tests/unit/coherence/completed-checks.test.ts` parcourt tous les `.ts` et `.vue` de `src/` et échoue si un littéral check legacy y apparaît (hors signatures `defineEmits` qui sont des noms d'events Vue, pas des checks).

**Critères d'acceptation testables** :
- AC.CHK.1 : `addCheckSchema.safeParse({ check: 'capitaine_locked' })` retourne `success: false`.
- AC.CHK.2 : `addCheckSchema.safeParse({ check: 'moteur:capitaine_locked' })` retourne `success: true`.
- AC.CHK.3 : Le test `aucun fichier .ts ou .vue de src/ ne contient un litteral check legacy` passe.
- AC.CHK.4 : Migration 020 appliquée → aucun article n'a de check sans préfixe en DB.

**Statut :** active (strict). **Depuis :** prescrit dès origine, **renforcé 2026-05-08** (regex Zod + test garde anti-régression + migration cleanup).

#### FR-MOT-PHASE-TRANSITION
Bandeau `PhaseTransitionBanner` apparaît dès qu'une phase est terminée et propose de passer à la suivante. L'utilisateur peut l'ignorer — pas de redirection automatique.

#### FR-MOT-NO-AUTO-ACTION
Aucune action automatique au changement d'onglet — l'utilisateur déclenche tout manuellement.

#### FR-MOT-RAW-KPIS
Les KPIs bruts sont TOUJOURS visibles — libre arbitre > algorithme. Quand un KPI marché (`searchVolume`, `keywordDifficulty`, `cpc`, `competition`) est absent (DataForSEO sans signal, miss DB), l'UI affiche le placeholder `—` (jamais `0`, `0 €` ou `0 %`) — voir aussi `FR-INFRA-KPI-NULLABLE`, `FR-INFRA-KPI-DISPLAY-DASH`.

#### FR-MOT-CACHE-CASCADE
Avant tout appel externe : consultation de `keyword_metrics` (cross-article) puis `external_api_cache` (TTL). Pattern unifié `getOrFetch<T>(cacheType, key, ttlMs, fetcher)`.
**Source :** `server/db/cache-helpers.ts`, `server/services/keyword/keyword-metrics.service.ts`.

#### FR-MOT-PAINPOINT-INJECTION
Le painPoint de l'article (`articles.pain_point`, fallback `(non défini)`) est injecté via `{{painPoint}}` dans les prompts Moteur : `capitaine-ai-panel.md`, `propose-lieutenants.md`, `lieutenants-hn-structure.md`, `lexique-suggest.md`, `lexique-analysis-upfront.md`, `lexique-ai-panel.md`.
**Statut :** active. **Depuis :** 2026-04-28. **Source :** sprints-pain-point-relevance-evolution (S1-S2).

#### FR-MOT-STRATEGY-INJECTION
Le contexte stratégique du cocon est injecté via `{{strategy_context}}` dans les prompts Moteur listés dans FR-MOT-PAINPOINT-INJECTION. Si stratégie absente, injection à chaîne vide.
**Source :** PRD initial — `server/utils/prompt-loader.ts` (buildCocoonStrategyBlock).

#### FR-MOT-CROSS-TAB-PAYLOAD
**Payload partagé entre onglets Discovery → Radar → Capitaine → Lieutenants → Lexique** *(ajout 2026-05-04, formalisation Vague 5 — extraction useMoteurCrossTabState)*. MoteurView orchestre 5 transitions explicites, déclenchées par boutons utilisateur :
- Discovery → Radar : `handleSendToRadar(keywords[])` ajoute au basket + switch onglet + émet `moteur:discovery_done`
- Radar → Capitaine : `handleCardsSelected(cards[])` dédup card racine prime sur longue-traîne + switch onglet
- Capitaine → Lieutenants : `handleSendToLieutenants({ keyword, rootKeywords[] })` propage rootKeywords sans perte + switch onglet
- Lieutenants → Lexique : selectedLieutenants priorisé sur store (computed `selectedLieutenantsForLexique`)
- Radar scan terminé : `handleRadarScanned({ globalScore, heatLevel })` émet `moteur:radar_done`

Aucune action automatique au changement d'onglet (cf. FR-MOT-NO-AUTO-ACTION). Le state cross-tab est reset au switch d'article (`resetCrossTabState`).
**Source :** `src/composables/moteur/useMoteurCrossTabState.ts`. **Tests :** `tests/unit/composables/moteur/useMoteurCrossTabState.test.ts` (8 ACs).

#### FR-MOT-CANNIBALIZATION
**Détection de cannibalisation Capitaine cross-articles d'un cocon** *(ajout 2026-05-04, formalisation Vague 5)*. Au mount du Moteur et après chaque check `capitaine_locked` (add ou remove), MoteurView fetche la map `keyword → article slug` via `GET /api/cocoons/:cocoonName/capitaines`. Cette map permet d'afficher visuellement (badge cannibalization) sur les cards Radar/Capitaine quand un keyword candidat est déjà le Capitaine verrouillé d'un autre article du même cocon, pour éviter le contenu dupliqué qui se cannibalise dans Google.
**Source :** `src/composables/moteur/useMoteurArticleSync.ts` (`capitainesMap`, `refreshCapitainesMap`), `server/routes/cocoons.routes.ts` (endpoint capitaines).

#### FR-MOT-EXPLORATION-COUNTS
**Counts DB persistés affichés dans TabCachePanel** *(ajout 2026-05-04, formalisation Vague 5 — partiellement supersedée 2026-05-08 par FR-MOT-CACHE-PANEL-COUNT pour les onglets Capitaine/Lieutenants/Lexique)*. Le panel sticky `TabCachePanel` affiche pour chaque onglet (Radar, Captain, Lieutenants, Lexique) le **count d'explorations persistées en DB** (table `radar_explorations` / `captain_explorations` / `lieutenant_explorations` / `lexique_explorations`). Endpoint `GET /api/articles/:id/explorations/counts`. Refetché au mount, au switch d'article (watcher défensif) et après chaque check (`addCheck` / `removeCheck` → mutation DB → counts à recharger). Distinct du `cacheCount` (external_api_cache TTL court). C'est ce qui permet au TabLoadPrompt de proposer "Charger N résultats déjà persistés".
**Source :** `src/composables/moteur/useMoteurArticleSync.ts` (`explorationCounts`, `refreshExplorationCounts`), `server/routes/article-explorations.routes.ts`.

#### FR-MOT-CACHE-PANEL-COUNT
**Compteur "DB N" du TabCachePanel : nombre de mots-clés verrouillés** *(ajout 2026-05-08, transversal Capitaine/Lieutenants/Lexique)*. Pour les onglets Moteur dont la livraison utilisateur est un ensemble de mots-clés verrouillés (Capitaine, Lieutenants, Lexique), le compteur "DB N" affiché par `TabCachePanel.vue` reflète le **nombre de mots-clés effectivement verrouillés par l'utilisateur** pour l'article courant, **pas** le nombre d'explorations SERP/IA persistées.

**Source unique** : la ligne `article_keywords` de l'article :
- Capitaine : `1` si `article_keywords.capitaine` est non-null/non-vide, sinon `0`.
- Lieutenants : `article_keywords.lieutenants.length` (TEXT[]).
- Lexique : `article_keywords.lexique.length` (TEXT[]).

**Distinct des explorations** : les tables `*_explorations` (caches de propositions/SERP/TF-IDF) restent consultables via `GET /articles/:id/explorations/counts` (FR-MOT-EXPLORATION-COUNTS) pour les onglets Radar/Discovery et pour les sections "Explorations passées" internes aux panels — mais elles ne pilotent plus le compteur "DB N" du TabCachePanel pour les 3 onglets ci-dessus.

**Bouton de chargement manuel ("Recharger DB")** : filet de sécurité pour les cas où l'hydratation au mount aurait échoué silencieusement (race condition, erreur réseau transitoire, etc.). Le clic appelle `articleKeywordsStore.fetchKeywords(articleId)` (idempotent), recharge la ligne `article_keywords` depuis la DB, et le compteur se rafraîchit naturellement par réactivité.

**Justification** : le compteur "DB N" doit refléter ce qui appartient à l'utilisateur (son état de décision verrouillé), pas l'état d'un cache technique. Une exploration SERP qui a produit 150 termes proposés mais 0 verrouillé doit afficher `0` au TabCachePanel — pas `1` ou `2`.

**Critères d'acceptation testables** :
- AC.CACHEPANEL.1 : Article avec `article_keywords.lexique = []` mais `lexique_explorations` à 2 rows → onglet Lexique du TabCachePanel affiche **0**, pas 2.
- AC.CACHEPANEL.2 : Article avec `article_keywords.lieutenants = ['kw1']` mais `lieutenant_explorations` à 5 rows → onglet Lieutenants affiche **1**.
- AC.CACHEPANEL.3 : Article avec `article_keywords.capitaine = null` mais `captain_explorations` à 3 rows → onglet Capitaine affiche **0**.
- AC.CACHEPANEL.4 : Cocher un terme Lexique met à jour le compteur de **0 → 1** dans le même tick (réactivité Pinia, pas besoin de refetch).
- AC.CACHEPANEL.5 : Cliquer sur le bouton de chargement manuel re-trigger `fetchKeywords` même si le store est déjà hydraté (idempotent, no-op silencieux si rien ne change). Aucun appel à `/explorations/counts` n'est nécessaire pour les 3 onglets concernés.
- AC.CACHEPANEL.6 : Au switch d'article, le compteur reflète l'`article_keywords` du nouvel article dans le même tick (pas de flash de l'ancienne valeur).

**Statut :** active. **Depuis :** 2026-05-08. **Source :** chantier 2026-05-08 (cohérence Lexique TabCachePanel).
**Voir aussi :** FR-CAP-PERSIST, FR-LIE-PERSIST, FR-LEX-SELECT, FR-MOT-EXPLORATION-COUNTS.

#### FR-MOT-CHECK-RECONCILIATION
**Réconciliation défensive des checks workflow au mount** *(ajout 2026-05-08, transversal — supersede AC.GATING.4 de FR-MOT-WORKFLOW-GATING-DUAL en l'étendant)*. Au mount d'un panel ayant un check workflow lié à un état persisté (`MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED`), une **réconciliation défensive** s'exécute après l'hydratation du store : si la DB indique que la condition d'émission n'est plus vraie (ex : `article_keywords.lexique = []`) mais que `articles.completed_checks` contient encore le check, ce dernier est retiré (`removeCheck`). La règle s'applique en sens inverse : condition vraie + check absent → `addCheck`.

**Pourquoi** : éviter les "dots verts mensongers" dus à un historique de persistance non nettoyé (changement de capitaine, switch d'article au mauvais moment, évolution de la règle de gating, déverrouillage hors-watcher, etc.). La DB `article_keywords` reste source de vérité de l'état utilisateur ; `articles.completed_checks` est dérivable de cet état et doit lui rester cohérent à chaque mount.

**Implémentation** : un onMounted ou watcher first-run dans chaque panel concerné, qui passe par les routes existantes (`POST /progress/check`, `DELETE /progress/check`). Pas de mutation DB directe. Le watcher principal qui réagit aux transitions utilisateur (`isLocked` true↔false) reste inchangé.

**Critères d'acceptation testables** :
- AC.RECONCILE.1 : Article avec `article_keywords.lexique = []` mais `articles.completed_checks` contient `'moteur:lexique_validated'` → après mount LexiquePanel, le check ne figure plus dans `completed_checks`.
- AC.RECONCILE.2 : Article avec `article_keywords.lieutenants = []` (ou `hn_structure = ''`) mais check `'moteur:lieutenants_locked'` présent → retiré au mount LieutenantsPanel (généralisation de AC.GATING.4).
- AC.RECONCILE.3 : Article avec `article_keywords.capitaine = null` mais check `'moteur:capitaine_locked'` présent → retiré au mount CaptainPanel.
- AC.RECONCILE.4 : Réciproque Lexique : `article_keywords.lexique = ['terme1']` mais check absent → ajouté au mount.
- AC.RECONCILE.5 : La réconciliation passe exclusivement par les routes `POST /progress/check` et `DELETE /progress/check` ; aucune mutation SQL directe n'est ajoutée côté front.
- AC.RECONCILE.6 : Si DB et store sont déjà cohérents, la réconciliation est un no-op silencieux (aucun appel réseau).

**Statut :** active. **Depuis :** 2026-05-08. **Source :** chantier 2026-05-08 (cohérence Lexique TabCachePanel + dot mensonger article 64).
**Voir aussi :** FR-MOT-CHECKS, FR-MOT-CHECKS-CONSTANTS, FR-MOT-WORKFLOW-GATING-DUAL.

#### FR-MOT-EXTERNAL-CACHE-CLEAR
**Bouton "Vider le cache" du TabCachePanel** *(ajout 2026-05-04, formalisation Vague 5)*. Action utilisateur qui purge **uniquement** les entrées `external_api_cache` (autocomplete, PAA, SERP, validate) liées au capitaine de l'article courant via `DELETE /api/articles/:id/external-cache`. Ne touche **pas** aux `*_explorations` (DB persistée — règle FR-MOT-CACHE-CASCADE). Permet à l'utilisateur de forcer un re-fetch DataForSEO sans perdre ses données métier.
**Source :** `src/composables/moteur/useMoteurArticleSync.ts` (`clearExternalCacheForArticle`), `server/routes/articles.routes.ts` (endpoint external-cache DELETE).

#### NFR-MOT-LEXIQUE-DECOUPLAGE
**Indépendance Lieutenants ↔ Lexique** *(ajout 2026-05-09, roadmap optimisation Lexique)*. Les onglets Lexique et Lieutenants doivent fonctionner comme **deux unités indépendantes** partageant un socle de données neutre (URLs SERP + scrapes HTML) côté DB. Aucun couplage de service côté backend, aucune dépendance d'ordre d'exécution côté UX.

**Justification** : aujourd'hui, le service `analyzeSerpCompetitors` ([server/services/external/serp-analysis.service.ts:160](server/services/external/serp-analysis.service.ts#L160)) fait à la fois le scrape SERP, l'extraction `headings[]` (pour Lieutenants) et l'extraction `textContent` (pour Lexique). Le Lexique ne peut pas fonctionner sans qu'un appel côté Lieutenants ait préalablement peuplé `keyword_metrics.serp_raw_json`, ce qui crée un couplage d'ordre invisible (cause du 404 perçu sur l'article 64, 2026-05-08).

**Critères d'acceptation testables** :
- AC.DECOUPLAGE.1 : Un test d'intégration démarre l'analyse Lexique sur un keyword vierge (jamais touché par Lieutenants) → réussit sans erreur, sans appel au service Lieutenants.
- AC.DECOUPLAGE.2 : Un test d'intégration démarre l'analyse Lieutenants sur un keyword vierge → réussit sans appel au service Lexique.
- AC.DECOUPLAGE.3 : Un test grep vérifie qu'aucun import croisé n'existe entre `lexique-analysis.service.ts` et `lieutenants-analysis.service.ts`.
- AC.DECOUPLAGE.4 : Si le scrape HTML d'une URL est déjà fait pour Lieutenants pendant la session, un appel Lexique sur le même keyword **réutilise** le scrape (cache mémoire 1h **process-scoped**) au lieu de re-scraper — vérifié par mock count des appels HTTP.

**Hors scope multi-process** : le cache mémoire 1h est module-scoped (Map d'un seul process Node.js). Un déploiement multi-worker / cluster nécessiterait une couche partagée (Redis, IPC) — story dédiée hors de ce chantier.

**Statut :** **active** *(implémenté 2026-05-09 sur branche `feat/decouplage-lieutenants-lexique`)*. **Depuis :** 2026-05-09. **Source :** tech-spec-decouplage-lieutenants-lexique (archivé). **Garde-fous :** tests architecturaux permanents `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts` (no cross-import) + tests d'intégration permanents `tests/integration/decouplage-lieutenants-lexique.test.ts` (cache mémoire partagé).
**Voir aussi :** FR-LEX-SCRAPE-DEDIE, FR-LIE-SCRAPE-DEDIE, FR-INFRA-SCRAPE-CORPUS-NEUTRE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION.

#### NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION
**Décomposition de `keyword_metrics`** *(ajout 2026-05-09, roadmap optimisation Lexique)*. La table `keyword_metrics` actuelle (god-table à 17 colonnes dont 6 JSONB héritées des sprints 15.5 et 15.5-bis qui visaient à minimiser le nombre de tables) doit être **décomposée en tables à responsabilité unique**, préfixées `keyword_*` pour signaler le scope cross-article :

| Table cible | Rôle | Source des données |
|---|---|---|
| `keyword_metrics` (slim) | Métriques numériques + intent | DataForSEO (volume, difficulty, CPC, intent) |
| `keyword_serp_results` | URLs Google (10 par keyword), position, title, domain | DataForSEO `/serp/google/organic` |
| `keyword_serp_scrapes` | HTML scrapé (`headings[]` + `text_content` + `is_blog`) | Scraping HTTP du serveur |
| `keyword_paa_questions` | Questions People Also Ask | DataForSEO `/serp/google/organic/advanced` |
| `keyword_autocomplete` | Suggestions autocomplete | DataForSEO autocomplete |

**Justification** : la colonne `serp_raw_json` (JSONB) charge ~500 ko de texte concurrent à chaque lecture, alors que **seul** TF-IDF a besoin de `textContent`. Lieutenants n'a besoin que de `headings[]`. La séparation permet (a) de ne lire que ce dont on a besoin, (b) de requêter finement (ex. "trouve les keywords dont le concurrent #1 est wikipedia.org"), (c) de poser des contraintes d'intégrité par table.

**Conflits de nommage écartés** : `keyword_paa_questions` ne collisionne pas avec `paa_explorations` (article-scoped, autre rôle). `keyword_autocomplete` ne collisionne pas avec `keyword_intent_analyses` (existe déjà, autre rôle).

**Critères d'acceptation testables** :
- AC.SCHEMA.1 : Migration SQL crée les 4 nouvelles tables avec PK + FK + index appropriés.
- AC.SCHEMA.2 : Script de migration data éclate les `serp_raw_json` existants vers `keyword_serp_results` + `keyword_serp_scrapes` sans perte (test de comptage avant/après).
- AC.SCHEMA.3 : Tous les services qui lisent `serp_raw_json` aujourd'hui (5 fichiers identifiés via grep) sont basculés sur les nouvelles tables.
- AC.SCHEMA.4 : Lecture des URLs SERP d'un keyword n'impose plus de désérialiser `textContent` (gain perf vérifiable).
- AC.SCHEMA.5 : Phase finale : `serp_raw_json` est dropée de `keyword_metrics` (migration SQL séparée, après bascule de tous les consommateurs).

**Statut :** **active** *(implémenté 2026-05-09 sur branche `feat/keyword-metrics-decomposition`)*. **Depuis :** 2026-05-09. **Source :** tech-spec-keyword-metrics-decomposition (archivé). **Bench D1 :** réduction payload brief Capitaine **97.5 %** sur top-5 keywords (cf. `docs/perf-bench-keyword-metrics-decomposition.md`). **Reste :** AC.SCHEMA.5 (drop colonne `serp_raw_json`) différé Epic E1 ≥ 14 jours après stabilisation.
**Voir aussi :** NFR-MOT-LEXIQUE-DECOUPLAGE, FR-INFRA-SCRAPE-CORPUS-NEUTRE.

---

### 8.4 — Moteur — Discovery (FR-DIS)

#### FR-DIS-INTENT-SCAN
Endpoint `POST /api/keywords/intent-scan` : analyse SERP avancée + extraction PAA / Autocomplete + matching stemmatique + résonance scoring. Entrée `{ broadKeyword, specificTopic, depth?: number }`. Sortie `IntentScanResult` avec items résonance, PAA, autocomplete groupés.
**Source :** `server/routes/intent-scan.routes.ts:9-31` — `server/services/intent/intent-scan.service.ts`.

#### FR-DIS-AI-PANEL
Panel IA contextuel `DiscoveryAiPanel.vue` charge le pain point puis stream une analyse intent + traduction douleur en mots-clés candidats via SSE.
**Source :** `server/routes/keyword-ai-panel.routes.ts` — prompts `discovery-*.md`.

#### FR-DIS-BASKET
Store `useMoteurBasketStore` accumule les keywords sélectionnés en mémoire (pas de DB) avec `{ keyword, source, score, validated, pushedToRadar }`. Actions `addKeywords`, `markValidated`, `markPushedToRadar`, `removeKeyword`.
**Source :** `src/stores/article/moteur-basket.store.ts`.

#### FR-DIS-CHECK
Émet `moteur:discovery_done` après une analyse réussie.

#### FR-DIS-CACHE
**Cache DB-first des découvertes Discovery** *(ajout 2026-05-04, formalisation Vague 5 — Sprint 15.6)*. Chaque scan Discovery est persisté dans la table `keyword_discoveries` avec TTL applicatif de 30 jours, indexé par `seedKeyword + cocoonName + articleType`. Au premier `checkCacheForSeed(seed)`, l'UI propose un badge **« Dernière analyse du DD/MM/YYYY · N mots-clés · analyse IA incluse »** + boutons **Charger** (réhydrate sources + analysisResult sans appel API) / **Rafraîchir** (purge cache + reset). Permet de reprendre une exploration sans recoûter d'appels DataForSEO/Claude.
**Source :** `src/components/moteur/discovery/KeywordDiscoveryCacheBar.vue`, `src/composables/keyword/useDiscoveryCache.ts`, `server/services/keyword/discovery-cache.service.ts`.

#### FR-DIS-RELEVANCE-FILTER
**Filtre de pertinence sémantique** *(ajout 2026-05-04, formalisation Vague 5)*. Toggle utilisateur dans Discovery qui active un scoring sémantique 2-passes (Claude embeddings + scoring) sur les mots-clés découverts. UI affiche : compteur **« X pertinents / N total »**, barre de progression **« Filtrage P/2 · scored/total »** pendant le scoring, badge **« X hors-sujet masqués »** quand actif. Les keywords non pertinents sont grisés (opacity 0.5) mais restent cliquables (libre arbitre, FR-MOT-RAW-KPIS). Une bannière warning apparaît si le filtrage n'a rien produit (probable failure API Claude).
**Source :** `src/components/moteur/discovery/KeywordDiscoveryRelevanceToggle.vue`, `src/composables/keyword/useSemanticScoring.ts`.

---

### 8.5 — Moteur — Radar (FR-RAD)

#### FR-RAD-GENERATE
Génération courte-traîne (~20 keywords, 1 passe IA) via `POST /api/keywords/radar/generate`. Modèle Haiku 4.5 (1024 tokens max). Entrée `{ title, keyword, painPoint, cocoonSlug }`. Sortie `RadarKeyword[]` (max 25, dédupliquées par forme normalisée). Tool use + Zod validation.
**Source :** `server/routes/intent-scan.routes.ts:34-63` — `server/services/keyword/keyword-radar.service.ts:41-127`.

#### FR-RAD-SCAN-2PASS
Scan en 2 passes (broad → specific) via `POST /api/keywords/radar/scan`. Entrée `{ broadKeyword, specificTopic, keywords[], depth (1|2), painPoint }`. Concurrence PAA = 3 requêtes parallèles. Cache PAA TTL 90 jours par `keyword + depth`.
**Source :** `server/routes/intent-scan.routes.ts:66-96` — `server/services/keyword/keyword-radar.service.ts:129+` — `server/services/infra/paa-cache.service.ts`.

#### FR-RAD-SCORING-BIMODAL
Pour chaque card Radar, calcul de **deux scores indépendants** :
- **Score Marché** (`shared/scoring-kpi.ts → computeMarketScore`) : Volume 30 % / KD 20 % / Intent 15 % / PAA 10 % / Autocomplete 10 % / CPC 10 % = 0-100.
- **Score Pertinence** (`shared/scoring.ts → computeRelevanceScore`) : Pain alignment 30 % / PAA × douleur 25 % / Autocomplete × douleur 15 % / Racines 20 % / Intent × douleur 10 % = 0-100.

Stockés dans `RadarCard.kpis` + `RadarCard.scoreBreakdown`.
**Statut :** active. **Depuis :** 2026-04-28. **Remplace :** ancien score unique (FR9 historique). **Source :** tech-spec-score-kpi-pertinence-separation.

#### FR-RAD-RESONANCE
Stemmer français (38 suffixes), matching bidirectionnel topic ↔ text. Niveaux `total` (≥50 % overlap), `partial` (≥20 %), `none`. Qualité `exact` ou `stem`.
**Source :** `server/services/intent/intent-scan.service.ts:44-150`.

#### FR-RAD-SCORE-RING-TOOLTIP
**Score ring SVG circulaire + tooltip contextuel** *(ajout 2026-05-04, formalisation Vague 5 — extraction RadarCardScoreRing)*. Chaque card Radar affiche le score (KPI ou Pertinence selon `displayMode`) dans un ring SVG (rayon 30, dasharray animé) + tooltip au hover qui détaille le breakdown pondéré (5-6 lignes label/desc/poids/value). Si `displayedScore === null`, affiche **« — »** + tooltip différencié selon la cause (cf. computed `relevanceMissingReason`) :
- `no-pain` : « Définis un point de douleur sur l'article et relance la validation. »
- `no-signals` : « Le point de douleur est défini, mais les signaux SERP n'ont rien produit (PAA vides, autocomplete absent ou embedding indisponible). »
- `long-tail` : « Score Pertinence non applicable aux longues traînes — utilise plutôt le score Pertinence de leur racine. »
- fallback : « Score Pertinence indisponible. »

Le ring intercepte les clics (`@click.stop`) pour ne pas propager au parent (sinon la sidebar Capitaine s'ouvre à tort, cf. AC.L.3 architecture test).
**Source :** `src/components/intent/radar-card/RadarCardScoreRing.vue`.

#### FR-RAD-PAA-TREE
**Arbre PAA récursif parent → children** *(ajout 2026-05-04, formalisation Vague 5 — extraction RadarCardPaaTree)*. Le body de chaque RadarKeywordCard (visible si `expanded === true`) affiche les questions PAA scrapées comme arbre 2 niveaux : parent (depth 1) + children (depth 2, parentQuestion). Chaque node a :
- chevron toggle children (si présents) / chevron toggle answer (si présent)
- badge match (`Exact` / `Partiel exact` / `Sem. partiel` / `Hors sujet` / `+ douleur` ou `+ hors-douleur`)
- semanticScore en % si calculé
- counts children entre parenthèses

Indicateur "PAA en cache" si `cachedPaa === true` (Sprint 15.6 PAA cache TTL 90j).
**Source :** `src/components/intent/radar-card/RadarCardPaaTree.vue`.

#### FR-RAD-LONGTAIL-GENERATE
Section optionnelle « Suggestions longue traîne » visible si ≥ 2 cards radar. Bouton « Suggérer » → étapes :
1. Combinator déterministe (`long-tail-combinator.service.ts`) → candidats locaux.
2. Cache check (clé = SHA256 inputs sorted, TTL 7 jours).
3. Appel IA Haiku (si miss) + Zod validation.
4. Persistance `radar_explorations.scan_result.longTailSuggestions[]`.
5. Déduplication.

Sortie : 10 suggestions max, score préférence 1-10 + rationale.
**Statut :** active. **Depuis :** 2026-05-03. **Source :** tech-spec-radar-long-tail-suggestions.

#### FR-RAD-LONGTAIL-UI
Chaque suggestion affichée avec checkbox, badge score 1-10, mention « dérivée de [roots] ». Top 5 pré-cochées au premier rendu. État coché persisté dans `radar_explorations.scan_result.longTailSelectedKeywords[]`.
**Statut :** active. **Depuis :** 2026-05-03. **Source :** tech-spec-radar-long-tail-suggestions.

#### FR-RAD-LONGTAIL-REGENERATE
Au reload, longues traînes + état coché restaurés. Le bouton « Suggérer » devient « Régénérer » et utilise le cache idempotent (`external_api_cache` TTL 7 jours).
**Statut :** active. **Depuis :** 2026-05-03.

#### FR-RAD-SEND-CAPTAIN
Bouton « Envoyer au Capitaine » agrège dédupliqué cards racines cochées ∪ longues traînes cochées. Colonne `source TEXT NULL` ajoutée à `captain_explorations` pour tracer l'origine (`radar` / `longtail` / `manual`).
**Statut :** active. **Depuis :** 2026-05-03. **Source :** tech-spec-radar-long-tail-suggestions.

#### FR-RAD-PERSIST
Persistance article-scoped via table `radar_explorations(article_id PK, JSONB scan_result)`. Routes CRUD : GET full / GET status (lightweight) / POST upsert / DELETE clear.
**Source :** `server/routes/radar-exploration.routes.ts`.

#### FR-RAD-CHECK
Émet `moteur:radar_done` après un scan réussi.

#### FR-RAD-MARKET-COMPUTED-LIVE
Le Score Marché (`marketScore`) est calculé à la volée côté front à chaque rendu d'une `RadarKeywordCard`, à partir des `kpis` reçus du backend. Il n'est jamais persisté en DB ni en cache.
**Critères d'acceptation testables** :
- Le store Pinia front ne contient pas de champ `marketScore` persisté.
- Aucune colonne SQL ne contient `market_score` ou équivalent.
- Le score affiché dans la card est `computeKpiScore(kpis, articleLevel).total` à l'instant du rendu.
- Si `kpis === null` (longue-traîne) : affichage `—`.
**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-RAD-NO-RELEVANCE-IN-SCAN
Le scan Radar (`scanRadarKeywords`) ne calcule plus le Score Pertinence et ne l'inclut plus dans son snapshot `radar_explorations.scan_result.cards[]`. Il ne produit que `marketScore` et les `kpis` bruts. Les anciennes lignes en DB qui contiennent encore `relevanceScore` sont ignorées par le code de lecture (pas de migration destructive).
**Critères d'acceptation testables** :
- Après refonte, `keyword-radar.service.ts` n'appelle plus `computeRelevanceScore`.
- La structure `KeywordRadarScanResult.cards[]` ne contient plus le champ `relevanceScore` (ou il vaut toujours `undefined`).
- Le code de lecture de `getCaptainExplorations` n'utilise plus le champ `relevanceScore` du snapshot Radar (il calcule à la volée — voir FR-CAP-RELEVANCE-COMPUTED-LIVE).
**Statut :** active. **Depuis :** 2026-05-05. **Remplace :** comportement historique où le scan Radar persistait `relevanceScore` dans le snapshot. **Source :** tech-spec-relevance-live-computation.

#### FR-RAD-CARD-CHEVRON-TOGGLE
Sur une `RadarKeywordCard`, le toggle expand/collapse de la section PAA est déclenché **uniquement par un clic sur le chevron** (icône triangle à gauche du header). Tout autre clic dans la card propage normalement vers le parent (notamment vers `radar-list-item` dans `CaptainValidation` qui ouvre le side panel).
**Zones avec @click.stop conservés** : chevron PAA, sous-chevrons PAA dans le body, score-ring (pour le tooltip), cadenas (`RadarCardLockable`), tag manuel, recompute Pertinence, mots interactifs (`KeywordWords`).
**Zones qui propagent au parent** : keyword text (mode non-interactif), KPIs, badges intent, espaces vides du header.
**Critères d'acceptation testables** :
- Clic sur le chevron : PAA toggle, side panel ne s'ouvre PAS.
- Clic sur le keyword text non-interactif : side panel s'ouvre, PAA inchangé.
- Clic sur KPIs : side panel s'ouvre.
- Clic sur cadenas : action verrou, side panel ne s'ouvre PAS.
**Statut :** active. **Depuis :** 2026-05-05. **Remplace :** comportement historique où tout clic sur le header togglait le PAA et bloquait le side panel. **Source :** tech-spec-relevance-live-computation.

---

### 8.6 — Moteur — Capitaine (FR-CAP)

#### FR-CAP-INPUT
Composant `CaptainInput.vue` : TextField avec debounce + autocomplete intégré. Validation syntaxe : longueur min 2 chars, pas d'accents doublés.

#### FR-CAP-VALIDATE
Endpoint `POST /api/keywords/:keyword/validate`. Entrée `{ keyword, level (pilier|intermediaire|specifique), articleTitle, painPoint? }`. Cache DB `keyword_metrics` (FRESHNESS_DAYS = 7). Si miss : fetch parallèle Overview + Autocomplete + SERP + Intent + PAA. Sortie `ValidateResponse { kpis[], verdict, marketScore, relevanceScore }`.
**Source :** `server/routes/keyword-validate.routes.ts:39-301`.

#### FR-CAP-LIST-SIDEPANEL
**Mode workflow** : liste verticale des entrées validées + `CaptainSidePanel.vue` sticky-top z-index 5. Sélection au clic (pas hover). Réinitialisation `selectedIndex` à 3 points : changement d'article, vidage des entrées, sélection manuelle effacée.
**Mode libre** : ancien manual-mode conservé (table seuils, history chips, input flow).
**Statut :** active. **Depuis :** 2026-04-25. **Remplace :** ancien carrousel prev/next. **Source :** tech-spec-capitaine-radar-list-sidepanel.

#### FR-CAP-SIDEPANEL-WIDTH
Largeur du side-panel dynamique = `viewport - 320px` (au lieu de 480px fixe). Layout grid 2 colonnes `minmax(0, 1fr) 360px`. Sticky CSS (pas JS scroll listener).
**Statut :** active. **Depuis :** 2026-04-28. **Source :** tech-spec-score-kpi-pertinence-separation.

#### FR-CAP-KPIS-READONLY
Section « KPIs marché » dans le side-panel en lecture seule (mode workflow). Affichage : Volume / KD / CPC / Intent / PAA count / AC count. Pas de seuils interactifs en mode workflow.
**Statut :** active. **Depuis :** 2026-04-28. **Source :** tech-spec-score-kpi-pertinence-separation.

#### FR-CAP-SCORING-BIMODAL
Score Marché et Score Pertinence affichés séparément (mêmes formules que FR-RAD-SCORING-BIMODAL).
**Statut :** active. **Depuis :** 2026-04-28. **Source :** tech-spec-score-kpi-pertinence-separation.

#### FR-CAP-AI-PANEL
Panel IA `AiPanel.vue` + `AiAdviceMarkdown.vue`, route SSE `POST /keywords/:keyword/ai-panel`, prompt `capitaine-ai-panel.md` (3 sections : potentiel éditorial, risques, recommandation). Variables injectées : `{{keyword}}`, `{{level}}`, `{{painPoint}}`, `{{marketScore}}`, `{{relevanceScore}}`, `{{strategy_context}}`. Modèle Claude Sonnet streaming.
**Source :** `server/routes/keyword-ai-panel.routes.ts:48-79` — `server/services/external/ai-panel-runner.service.ts`.

#### FR-CAP-ROOTS
Composable `useCapitaineValidation.ts` : `extractRoots()` décompose un mot-clé en chaînes progressives. Ex : « création site web entreprise toulouse » → `["création", "création site", "création site web", …]`. Utilisé dans le scoring (poids 0.20 dans Score Pertinence si racines présentes en cache).
**Source :** `src/composables/keyword/useCapitaineValidation.ts:23-32`.

#### FR-CAP-HISTORY-SLIDER
Mode libre uniquement : navigation `navigateHistory(idx)` met à jour `currentResult`, déclenche `aiStartStream` automatiquement. Variantes racines via `loadRootVariants(keyword)` avec chevrons N/N.

#### FR-CAP-LOCK-RADIO
1 seul Capitaine verrouillé par article à la fois (slot unique `richCaptain`). `lockCaptain(keyword, aiMarkdown?, articleId?)` overwrite l'ancien. Séquence pour relay map :
1. `emit('check-removed', 'capitaine_locked')`
2. `nextTick()`
3. `emit('check-completed', 'capitaine_locked')`
4. mutation store

**Source :** `src/stores/article/article-keywords.store.ts → lockCaptain()`.

#### FR-CAP-VERDICT-INFORMATIVE
Le verdict (GO / ORANGE / NO-GO / GRAY) est **purement informatif**. Le bouton « Valider Capitaine » est toujours actif — l'utilisateur peut verrouiller même un NO-GO.
**Statut :** active. **Depuis :** 2026-04-28. **Remplace :** FR-CAP-VERDICT-GATING (ancien `canLock` qui désactivait le bouton sur NO-GO/ORANGE). **Source :** tech-spec-score-kpi-pertinence-separation.

#### FR-CAP-VERDICT-GATING
*Statut :* **deprecated** — verdict ne conditionne plus le lock.
*Remplacé par :* FR-CAP-VERDICT-INFORMATIVE (2026-04-28).
*Énoncé historique :* l'utilisateur pouvait forcer GO sur ORANGE/ROUGE via libre arbitre, mais le bouton était disabled tant que verdict non GO.

#### FR-CAP-AUTO-NOGO
Auto-NO-GO si `greenCount === 0` sur les 6 KPIs marché. Raison textuelle « (non) signaux détectés ».
**Source :** `shared/kpi-scoring.ts → computeVerdict()`.

#### FR-CAP-PAINPOINT-FALLBACK
Si `articles.pain_point` est null ou vide : fallback `"(non défini)"`. Calculs lexicaux skip, `relevanceScore` = `null`.
**Source :** `server/services/queries/article-pain-point.service.ts → getArticlePainPoint()`.

#### FR-CAP-PERSIST
Persistance article-scoped dans `captain_explorations(article_id, keyword)` → `CaptainValidationEntry`. Colonne `source` trace l'origine (radar/longtail/manual).

#### FR-CAP-CHECK
Émet `moteur:capitaine_locked` au verrouillage.

#### FR-CAP-RELEVANCE-COMPUTED-LIVE
Le Score Pertinence (`relevanceScore`) est calculé à la volée côté backend à chaque hydratation de l'onglet Capitaine, jamais persisté. À chaque appel `GET /articles/:id/relevance` (ou endpoint équivalent), le serveur exécute le calcul complet à partir du `painPoint` (figé après Cerveau, voir FR-PAIN-IMMUTABLE-AFTER-CEREVEAU) + `keyword_metrics` + `captain_explorations.root_keywords`. Le score reflète le `painPoint` de l'article au moment du chargement de l'onglet — il n'y a pas de re-calcul live en cours de session sur changement painPoint (cf. FR-CAP-NO-PAINPOINT-WATCHER).
**Critères d'acceptation testables** :
- Recharger l'onglet Capitaine déclenche un calcul backend frais (sans cache de score Pertinence).
- Saisie manuelle d'un keyword jamais scanné Radar → score calculé et affiché (pas `—`).
- Aucun `INSERT/UPDATE` SQL ne contient `relevanceScore` dans son payload pendant un calcul Pertinence (vérifiable par spy).
**Statut :** active. **Depuis :** 2026-05-05. **Mis à jour :** 2026-05-06 (Sprint 10.5 — précision sur l'immutabilité du painPoint en session). **Source :** tech-spec-relevance-live-computation, tech-spec-sprint-10.5-cleanup-painpoint-legacy.

#### FR-CAP-RELEVANCE-NO-DB-WRITE
Aucune écriture DB (`INSERT`/`UPDATE`) ne contient le champ `relevanceScore`. Le calcul Pertinence ne fait que des lectures DB.
**Critères d'acceptation testables** :
- Aucune colonne SQL ne s'appelle `relevance_score` ou équivalent.
- La cellule JSONB `radar_explorations.scan_result` ne contient plus de champ `relevanceScore` après refonte (anciennes lignes ignorées à la lecture).
- Test unitaire avec spy `pg.query` capture aucun payload contenant `relevanceScore`.
**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-RELEVANCE-NO-CACHE
Le Score Pertinence n'est jamais mis en cache TTL serveur (`external_api_cache`). Aucun store front (Pinia, localStorage, sessionStorage) ne le persiste au-delà de la session navigateur courante.
**Critères d'acceptation testables** :
- F5 du navigateur vide complètement le store Pertinence côté front.
- Aucun appel `external_api_cache.get('relevance:*')` ou clé similaire.
- Le store Pinia se recharge via API à chaque mount du composant Capitaine.
**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-RELEVANCE-ROOTS-FROM-DB
Pour le calcul du signal 4 (Racines), le serveur lit le tableau `captain_explorations.root_keywords` persisté. En fallback (entrée DB absente), il appelle `extractRoots(keyword)` à la volée mais sans persister le résultat.
**Critères d'acceptation testables** :
- Si `root_keywords` existe en DB → utilisé tel quel pour le calcul (vérifiable par mock DB).
- Si `root_keywords` absent ou vide → fallback `extractRoots()` mémoire seule, aucune écriture DB.
**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-ROOTS-PERSISTED-AT-ENTRY
Le tableau `root_keywords` est calculé et persisté en DB **au moment où un keyword entre dans `captain_explorations`** (envoi depuis Radar, input manuel Capitaine, acceptation longue-traîne IA). Pas avant, pas après.
**Critères d'acceptation testables** :
- Toutes les portes d'entrée `captain_explorations` appellent `extractRoots(keyword)` et incluent le résultat dans l'`INSERT` initial.
- Le verrouillage Capitaine d'un keyword existant ne déclenche aucun `UPDATE` sur `root_keywords` (immutable après entrée).
- Le calcul Pertinence ne déclenche aucun `INSERT/UPDATE` sur `root_keywords`.
**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-RELEVANCE-MEMOIZATION
Pendant un calcul Pertinence pour N cards, chaque racine partagée est calculée **une seule fois** via une Map locale serveur (durée = 1 requête HTTP), puis lue plusieurs fois sans recalcul.
**Critères d'acceptation testables** :
- 5 cards qui partagent la racine `cours piano` → `computeRelevanceScore` appelé une seule fois pour `cours piano` (vérifiable par spy).
- La Map est créée à l'entrée de la fonction et libérée à la sortie (pas persistée hors scope).
- Aucun `localStorage`, `sessionStorage`, ou cache TTL côté serveur ne stocke ces scores intermédiaires.
**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-RELEVANCE-UNAVAILABLE-REASON
Quand `relevanceScore.total === null`, le backend retourne un champ `unavailableReason` typé qui décrit la cause précise. Le frontend affiche un message correspondant honnête.
Type : `'no-pain' | 'long-tail' | 'missing-paa' | 'missing-autocomplete' | null`.
**Mapping** :
- `painPoint` absent ou < 10 chars → `'no-pain'` → *"Définis un point de douleur sur l'article"*.
- `kpis === null` (longue-traîne) → `'long-tail'` → *"Score non applicable (longue-traîne)"*.
- `paa_questions` vide en DB → `'missing-paa'` → *"Pas de PAA disponible — relance un scan Radar pour ce keyword"*.
- `autocomplete_suggestions` vide en DB → `'missing-autocomplete'` → *"Pas d'autocomplete — relance un scan Radar"*.
- Score présent → champ absent ou `null`.

**Critères d'acceptation testables** :
- Tests unitaires couvrant les 5 cas (4 causes + 1 cas score présent).
- Backend logge la cause à chaque retour `null` : `log.info('[Capitaine] relevanceScore null', { articleId, keyword, reason })`.
- Frontend affiche le message correspondant dans le tooltip du score-ring (pas de devinette).
**Statut :** active. **Depuis :** 2026-05-05. **Remplace :** ancien tooltip 3 causes deviné par le frontend. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-RELEVANCE-LINEAR-ROOTS
L'algorithme d'extraction des racines `extractRoots()` reste **linéaire** (troncature progressive depuis la fin, max 5 racines, minimum 2 mots significatifs hors stopwords). Toute évolution vers une extraction sémantique (LLM ou parsing) requiert une nouvelle tech-spec dédiée.
**Critères d'acceptation testables** :
- `extractRoots('cours piano intermédiaire paris')` retourne `['cours piano intermédiaire', 'cours piano']`.
- `extractRoots('cours piano')` retourne `[]` (< 3 mots).
- Stopwords filtrés via `FRENCH_STOPWORDS`.
- Aucun appel LLM dans le chemin de calcul.
**Statut :** active (verrouille statu quo). **Depuis :** 2026-05-05. **Source :** tech-spec-relevance-live-computation.

#### FR-CAP-RELEVANCE-INTENT-SIGNAL
Le 5e signal du Score Pertinence (« Intent SERP × Intent éditorial attendu ») est calculé en croisant `keyword_metrics.intent_raw` (intention SERP du keyword côté DataForSEO) avec `articles.pain_intent_expected` (intention éditoriale attendue côté article). Lorsque les deux divergent, un malus est appliqué à la composante `intentPain.normalized` du Score Pertinence (cf. `shared/scoring.ts` — `INTENT_MISMATCH_MALUS`).
**Type stocké** : TEXT single-value, valeurs `'commercial' | 'transactional' | 'informational' | 'navigational' | NULL`. Migration DB : `014_articles_pain_intent_expected.sql`.
**Comportement** :
- `pain_intent_expected = NULL` → signal neutralisé à 50/100 (dégradation gracieuse, pas de malus).
- Match (intent SERP === intent attendu) → score boosté.
- Mismatch → malus appliqué directement sur la composante (pas de variable séparée).
**Critères d'acceptation testables** :
- Tests unitaires sur `computeIntentPainAlignment` (matrice 4×4 complète).
- Test d'intégration `getCaptainExplorations` : vérifie que `painIntentExpected` est lu depuis DB et passé à `computeRelevanceForCaptainTab`.
- Article créé sans `pain_intent_expected` → score Pertinence calculé sur 4 signaux (5e neutre à 50).
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-pain-intent-expected-signal.

#### FR-PAIN-IMMUTABLE-AFTER-CEREVEAU
Le `painPoint` d'un article (`articles.pain_point`) ne peut être modifié qu'à partir de l'interface Cerveau (étapes de stratégie cocon, création/édition d'article par lot). Aucun composant Moteur ou Rédaction n'expose de chemin de mutation du `painPoint`.
**Justification produit** : le `painPoint` est l'**input central** du pipeline éditorial (cf. `docs/pain-point-editorial-backbone.md`). Modifier le painPoint après avoir validé un Capitaine + des Lieutenants reviendrait à invalider tout le travail aval — ce flux n'a pas de sens métier. L'utilisateur qui veut changer le painPoint recommence l'article depuis le Cerveau.
**Critères d'acceptation testables** :
- Aucun handler `change`/`input`/`PUT` côté Moteur ou Rédaction ne mute `articles.pain_point`.
- Recherche grep `pain_point\s*=` dans `src/components/moteur/`, `src/components/redaction/`, `src/components/workflow/` ne retourne aucune mutation.
- L'unique chemin de mutation côté front est dans le Cerveau (`src/components/strategy/`, `src/components/production/`).
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-10.5-cleanup-painpoint-legacy.

#### FR-CAP-NO-PAINPOINT-WATCHER
Le composant `CaptainValidation.vue` ne surveille pas les changements live de `props.selectedArticle.painPoint`. Si la prop change (cas marginal : un parent pousse un nouveau painPoint pendant que l'utilisateur est sur l'onglet Capitaine), aucune action automatique n'est déclenchée. Le calcul du Score Pertinence est figé pour la durée d'une session sur l'onglet — un nouveau calcul a lieu uniquement au prochain mount (changement d'article ou F5).
**Justification** : le watcher Sprint 8 (commit `5b849df`) qui détectait ce changement et déclenchait un recompute Pertinence vivait pour gérer un scénario qui n'existe plus (le painPoint ne change plus en cours de workflow, cf. FR-PAIN-IMMUTABLE-AFTER-CEREVEAU).
**Critères d'acceptation testables** :
- `tests/unit/components/captain-validation-painpoint-frozen.test.ts` : modifier `selectedArticle.painPoint` après mount ne déclenche aucun appel à `mergeCaptainHistory` ni fetch `/captain-explorations`.
- Lecture de `src/components/moteur/CaptainValidation.vue` ne contient aucun `watch(() => props.selectedArticle?.painPoint, ...)`.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-10.5-cleanup-painpoint-legacy.

#### FR-CAP-EXPLORED-KEYWORDS-NAMING
La propriété TypeScript du type `RichCaptain` qui contient l'historique des mots-clés explorés s'appelle **`exploredKeywords`** (anciennement `validationHistory`). Le type d'élément correspondant est `CaptainScanEntry` (anciennement `CaptainValidationEntry`).
**Justification** : aligne le naming avec FR-CODE-NO-CAROUSEL (Sprint 12 : `useExploredKeywords`) et FR-API-VOCABULAIRE-SCAN (Sprint 14 : "scan" pour la recherche, "validate" réservé à `/keywords/validate-pain` côté Cerveau). Le mot "validation" prêtait à confusion — l'utilisateur ne valide rien dans cette liste, c'est un historique de mots-clés explorés.
**Renommages associés** :
- `mergeCaptainHistory` → `mergeCaptainExploredKeywords` (méthode du store article-keywords)
- Variables locales `captainValidationHistory` → `captainExploredKeywords`
**Critères d'acceptation testables** :
- Recherche grep `validationHistory` ou `CaptainValidationEntry` ou `mergeCaptainHistory` dans `src/`, `tests/`, `shared/`, `server/` retourne 0 occurrence.
- Le type `CaptainScanEntry` est exporté depuis `shared/types/keyword.types.ts`.
- La propriété `richCaptain.exploredKeywords: CaptainScanEntry[]` remplace l'ancienne `richCaptain.validationHistory`.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-18-lock-on-original-card (Sprint 20 regroupé).

#### FR-CAP-LOCK-ORIGINAL-ONLY
Le mot-clé verrouillé du Capitaine est **toujours** l'`originalCard.keyword` de la RadarCard sélectionnée, jamais une racine active (`card.keyword` quand l'utilisateur a activé une variante). Si l'utilisateur veut verrouiller une racine, il doit la chercher explicitement (input text Capitaine ou recherche d'une RadarCard ayant ce mot-clé comme original).
**Justification** : cohérence DB (1 RadarCard = 1 entrée stable dans `captain_explorations`), cohérence UI (`pinnedPredicate` simplifié, un seul critère de match), cohérence sémantique (le verrouillage agit sur la card identifiée par son mot-clé d'origine, peu importe la racine active), élimination de bugs frontière où locker une racine puis désactiver la racine laisserait une card "verrouillée" avec un keyword d'affichage différent.
**Critères d'acceptation testables** :
- `lockEntry(idx)` capture toujours `entry.originalCard.keyword`, jamais `entry.card.keyword`.
- Le `pinnedPredicate` match UNIQUEMENT sur `originalCard.keyword`.
- Le `lockedIndex` cherche par `originalCard.keyword`.
- Le `selectedIsLocked` ne match plus `card.keyword`.
**Statut :** active. **Depuis :** 2026-05-06. **Supersede partiellement :** Sprint 17 (qui avait introduit un compromis défensif `originalCard.keyword OR card.keyword`). **Source :** tech-spec-sprint-18-lock-on-original-card.

#### FR-CAP-LOCK-NO-DUPLICATE
Quand l'utilisateur lock/unlock/relock une RadarCard du Capitaine, **aucune entry n'est dupliquée** dans `entries.value` du composable `useExploredKeywords`. La déduplication est appliquée à 3 endroits :
- `addEntry(keyword, ...)` : si une entry existe déjà pour `originalCard.keyword` (case-insensitive, trim), réutilise cette entry au lieu d'en créer une 2e.
- `loadCards(cards, ...)` : dédup des inputs par `keyword` avant `entries.value = cards.map(...)`.
- `restoreFromHistory(history, ...)` : dédup l'historique avant restauration.
**Justification** : avant Sprint 17, le watcher `keywords.capitaine` du `CaptainPanel.vue` appelait `addEntry(persisted)` à chaque mutation du `capitaine` du store, sans vérifier l'existence. Combiné avec un `pinnedPredicate` qui matchait toutes les entries `card.keyword === lockedKeyword`, l'utilisateur voyait jusqu'à 3+ duplications de la même card verrouillée à chaque toggle lock.
**Critères d'acceptation testables** :
- AC.17.B.1 : `addEntry("X")` 3 fois ne produit qu'une seule entry.
- AC.17.B.2 : `loadCards([X, X, Y])` produit 2 entries.
- AC.17.B.3 : `restoreFromHistory([X, X])` produit 1 entry.
- Le watcher `keywords.capitaine` du `CaptainPanel.vue` ne fait plus d'appel à `carousel.addEntry` (juste un log warning si l'entry est manquante).
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

#### FR-CAP-SORT-STABLE-ON-ROOT-VARIANT
Activer/désactiver une racine d'une RadarCard du Capitaine (clic sur un mot souligné `kw-word--active`) **ne change pas la position** de la card dans la liste triée. Le tri A-Z et le tri Score Pertinence du Capitaine utilisent `entry.originalCard.keyword` / `entry.originalCard.relevanceScore` au lieu de `entry.card.*`. Le `pinnedPredicate` matche désormais sur `originalCard.keyword OR card.keyword` pour gérer le cas où la racine elle-même a été lockée.
**Justification** : `entry.card` est remplacée dynamiquement par `entry.rootVariants[X].card` lors du clic sur un mot souligné — utiliser `card.keyword` dans le tri causait une réorganisation visible de la liste à chaque interaction.
**Critères d'acceptation testables** :
- AC.17.A.1 : Activer/désactiver un mot dans une RadarCard ne change pas l'index de la card dans `sortedEntries` (tri A-Z et tri score).
- AC.17.A.2 : Le `pinnedPredicate` matche par `originalCard.keyword` ou `card.keyword`.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

#### FR-LIE-CHECKBOX-LOCK-IMMEDIATE
Cocher la checkbox d'un lieutenant dans `LieutenantsPanel` verrouille IMMÉDIATEMENT ce lieutenant en DB (`status = 'locked'`) via `articleKeywordsStore.lockLieutenant(payload)`. Le décochage le déverrouille (`status = 'suggested'`) via `unlockLieutenant(keyword)`. **Aucun bouton "Verrouiller la sélection" en bloc** — le bouton batch est supprimé du template.

**Mise à jour 2026-05-08 — Suppression du concept "panel locked"** :
- L'ancienne computed `isLocked` au niveau du `LieutenantsPanel` (vraie dès qu'un seul lieutenant était `status='locked'`) est SUPPRIMÉE. Elle créait un cul-de-sac UX : dès qu'une case était cochée, **toutes les autres devenaient désactivées** (cursor `not-allowed`), bloquant l'utilisateur sans bouton de déverrouillage batch.
- Toutes les checkboxes restent cliquables à tout moment, peu importe combien de lieutenants sont déjà verrouillés.
- Toutes les actions (`Refresh SERP`, `Régénérer IA`, `Sauvegarder Hn`, `Régénérer Hn`, lock individuel des headings) sont disponibles à tout moment.
- Le badge "Lieutenants verrouillés" en bas du panel et le badge "Validée avec les lieutenants" sur la structure Hn sont SUPPRIMÉS.
- Suppression du timestamp `lockedAt` côté backend (colonne DB `lieutenant_explorations.locked_at` droppée par migration 019) et côté types (`RichLieutenant.lockedAt` retiré). Source unique de vérité = colonne `status`.

**Règle de gating workflow `MOTEUR_LIEUTENANTS_LOCKED` (refonte 2026-05-08)** :
Le check est émis ssi **(au moins 1 lieutenant a `status='locked'`)** ET **(`hn_structure` est non-vide)**. Reflète la règle métier : l'étape Lieutenants n'est "faite" que quand l'utilisateur a ET sélectionné au moins un lieutenant ET généré la structure Hn. Implémenté via la computed `lieutenantsCheckActive` dans `LieutenantsPanel.vue`, observée par un watcher qui émet/retire le check sur transition.

**Critères d'acceptation testables** :
- AC.LIE.LOCK.1 : Cocher 1 lieutenant ne désactive PAS les autres checkboxes (cursor reste `pointer`).
- AC.LIE.LOCK.2 : Le bouton "Refresh SERP" reste cliquable même quand des lieutenants sont verrouillés.
- AC.LIE.LOCK.3 : Le bouton "Régénérer IA" reste cliquable même quand des lieutenants sont verrouillés.
- AC.LIE.LOCK.4 : Le badge "Lieutenants verrouillés" n'existe pas dans le DOM (`data-testid="lieutenant-lock-status"` absent).
- AC.LIE.GATING.1 : `MOTEUR_LIEUTENANTS_LOCKED` n'est PAS émis tant que `hn_structure` est vide, même avec ≥1 lieutenant `status='locked'`.
- AC.LIE.GATING.2 : `MOTEUR_LIEUTENANTS_LOCKED` est émis dès que **les deux conditions** sont remplies.
- AC.LIE.GATING.3 : Le check est retiré si l'utilisateur unlock le dernier lieutenant OU vide la `hn_structure`.

**Statut :** active. **Depuis :** 2026-05-06. **Étendu :** 2026-05-08 (suppression `isLocked` panel + nouvelle règle gating). **Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine + chantier 2026-05-08 (refonte gating Lieutenants).

#### FR-LEX-CHECKBOX-LOCK-IMMEDIATE
Cocher la checkbox d'un terme TF-IDF du `LexiquePanel` l'ajoute IMMÉDIATEMENT à `keywords.lexique` via `articleKeywordsStore.addLexiqueTerm(value)`. Le décochage le retire via `removeLexiqueTerm(value)`. **Aucun bouton "Verrouiller le Lexique" en bloc** — le bouton batch est supprimé du template.
Le check workflow `MOTEUR_LEXIQUE_VALIDATED` est dérivé : émis automatiquement quand `keywords.lexique.length` passe de 0 à ≥1 via watcher dérivé. Retiré quand le dernier terme est décoché.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

#### FR-API-VOCABULAIRE-SCAN
Le vocabulaire **"scan"** désigne la recherche/exploration d'un mot-clé (appel DataForSEO + calcul scoring) côté backend. Le vocabulaire **"validate"** est réservé au cas spécifique de validation de painPoint utilisateur (Cerveau, route `/keywords/validate-pain`). Les composants Capitaine consomment l'endpoint `POST /api/keywords/:keyword/scan` qui retourne un `ScanResponse` typé.
**Justification** : avant Sprint 14, le mot "validate" était utilisé pour deux choses différentes — la recherche et le verrouillage. Sprint 11 a aligné l'UI ("Verrouiller" au lieu de "Valider"). Sprint 14 finit le travail côté vocabulaire backend pour que `scan` désigne sans ambiguïté la recherche.
**Renommages** :
- Composable : `useCapitaineValidation` → `useCapitaineScan`. Fonction : `validateKeyword()` → `scanKeyword()`.
- Types : `ValidateResponse` → `ScanResponse`, `ValidateVerdict` → `ScanVerdict`, `PaaQuestionValidate` → `PaaQuestionScan`.
- Backend : `keyword-validate.service.ts` → `keyword-scan.service.ts`, `keyword-validate.routes.ts` → `keyword-scan.routes.ts`.
- URL HTTP : `POST /api/keywords/:keyword/validate` → `POST /api/keywords/:keyword/scan`.

**Critères d'acceptation testables** :
- Recherche grep `useCapitaineValidation` dans `src/`, `tests/` retourne 0 occurrence.
- Recherche grep `ValidateResponse|ValidateVerdict|PaaQuestionValidate` dans `src/`, `tests/`, `shared/`, `server/` retourne 0 occurrence.
- L'URL HTTP `/keywords/:keyword/validate` n'est plus exposée par le backend. Seul `/keywords/:keyword/scan` est actif.
- L'endpoint `/keywords/validate-pain` (validation painPoint) reste fonctionnel et inchangé.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-14-vocabulaire-backend-scan.

#### FR-INFRA-EXTERNAL-API-CACHE
La table `external_api_cache` (anciennement `api_cache`, renommée Sprint 16) est le **cache générique réutilisable** pour tous les appels API externes. Décision produit Sprint 19 (option A) : la table est conservée long terme, **il n'y a pas de plan de mort**. Tout nouveau cache d'appel externe doit utiliser cette table via `cache-helpers.ts` (`getCached` / `setCached` / `deleteCached`) — pas de table dédiée à créer pour ça.
**Schéma** : `(id SERIAL PK, cache_key TEXT, cache_type TEXT, data JSONB, cached_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, UNIQUE(cache_key, cache_type))`. La partition par `(cache_type, cache_key)` permet d'accueillir N types sans collision et sans schéma dédié.
**Cache_types actifs (2026-05-06)** : `dataforseo`, `gsc`, `radar`, `long-tail-suggest`, `suggest` (4 sub-keys), `keyword-discovery`, `intent`, `community-discussions`, `validate`, `autocomplete`. Liste extensible par convention (string `cache_type`).
**Justification produit (Sprint 19 option A)** : créer 6+ tables dédiées avec presque le même schéma serait de la dette de maintenance pour un gain cosmétique. Le pattern `cache-helpers.ts` est mature (utilisé par 8+ services depuis longtemps, sans bug récurrent). Le nom `external_api_cache` (Sprint 16) signale clairement le rôle. Aucun impact utilisateur — ce serait du tech debt pur.
**Critères d'acceptation testables** :
- `SELECT * FROM external_api_cache` fonctionne ; `api_cache` n'existe plus.
- Le job de purge horaire (`server/index.ts`) cible `external_api_cache`.
- Aucune référence SQL à `FROM api_cache` / `INTO api_cache` / `TABLE api_cache` ne subsiste dans `server/`, `src/`, `tests/`.
- Tout nouveau cache d'appel externe (futurs services) doit utiliser `cache-helpers.ts` plutôt que créer une table dédiée.
**Statut :** active. **Depuis :** 2026-05-06. **Décision produit Sprint 19 :** option A — table conservée comme cache générique long terme, plan de mort officiellement abandonné. **Source :** tech-spec-sprint-19-cache-generic-decision (supersede tech-spec-sprint-16-rename-external-api-cache pour la partie "plan de mort").

#### FR-NAM-CONTAINERS-PANEL
Les 6 containers d'onglets du Moteur sont nommés `*Panel.vue` (Pattern A : `XxxPanel`).
**Renommages** :
- `CaptainValidation.vue` → `CaptainPanel.vue`
- `LieutenantsSelection.vue` → `LieutenantsPanel.vue`
- `LexiqueExtraction.vue` → `LexiquePanel.vue`
- `KeywordDiscoveryTab.vue` → `DiscoveryPanel.vue`
- `DouleurIntentScanner.vue` → `RadarPanel.vue`
- `FinalisationRecap.vue` → `FinalisationPanel.vue`
- Composable associé : `useKeywordDiscoveryTab` → `useDiscoveryPanel`

**Justification** : avant Sprint 15, le naming était hétérogène (`Validation`, `Selection`, `Extraction`, `Tab`, `Scanner`, `Recap`) — aucun pattern. Le suffixe `Panel` est court, neutre, et signale qu'il s'agit du panneau (container) de l'onglet, pas d'une opération.
**Critères d'acceptation testables** :
- Les 6 fichiers sont nommés `*Panel.vue` dans `src/components/moteur/` ou `src/components/intent/`.
- Aucun import ne référence les anciens noms.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-15-rename-containers-panel.

#### FR-MOT-WORKFLOW-GATING-DUAL
Les checks workflow `MOTEUR_CAPITAINE_LOCKED` et `MOTEUR_LIEUTENANTS_LOCKED` suivent une **règle de gating à double condition** : un check est actif uniquement si le verrouillage de la décision utilisateur ET la livraison de l'artefact dérivé sont présents.

**Règle Capitaine** : `MOTEUR_CAPITAINE_LOCKED` actif ssi
- `article_keywords.capitaine` non-vide (mot-clé verrouillé) ET
- _(à étendre selon évolution du modèle métier)_

**Règle Lieutenants** : `MOTEUR_LIEUTENANTS_LOCKED` actif ssi
- `≥1 lieutenant` a `status='locked'` dans `lieutenant_explorations` ET
- `article_keywords.hn_structure` non-vide (structure Hn générée).

**Justification** : un Lieutenant verrouillé sans structure Hn ne fournit pas l'information dont la Rédaction a besoin. Le check workflow ne doit pas être considéré comme "validé" tant que l'artefact dérivé (la structure Hn pour Lieutenants) n'est pas produit.

**Implémentation** : computed `lieutenantsCheckActive` dans `LieutenantsPanel.vue` + watcher avec garde "first run" qui réconcilie l'état réel avec le check stocké en DB au mount (cas critique : si la règle gating change, les checks legacy persistant en DB sont retirés au prochain chargement de l'article).

**Critères d'acceptation testables** :
- AC.GATING.1 : Cocher 1 lieutenant sans `hn_structure` ne fait PAS apparaître `moteur:lieutenants_locked` dans `articles.completed_checks`.
- AC.GATING.2 : Cocher 1 lieutenant + générer `hn_structure` → `moteur:lieutenants_locked` ajouté.
- AC.GATING.3 : Décocher tous les lieutenants OU vider `hn_structure` → `moteur:lieutenants_locked` retiré.
- AC.GATING.4 : Au mount d'un article avec `moteur:lieutenants_locked` en DB mais `hn_structure` vide → le check est retiré automatiquement (cleanup état hérité). *(Cas spécifique généralisé par FR-MOT-CHECK-RECONCILIATION pour les 3 checks Capitaine/Lieutenants/Lexique.)*

**Statut :** active. **Depuis :** 2026-05-08. **Source :** chantier 2026-05-08 (refonte gating Lieutenants).
**Voir aussi :** FR-MOT-CHECK-RECONCILIATION (généralise la réconciliation au mount à tous les checks Moteur dérivés d'un état persisté).

#### FR-MOT-LOCK-DERIVED
L'état "verrouillé" d'un container Moteur (Capitaine, Lieutenants) est **dérivé** de la donnée persistée (statut DB), pas stocké dans une Ref locale. La double source de vérité (Ref + store) qui demandait des watchers de synchronisation manuelle est supprimée. Le store est la source unique de vérité.
**Implémentation** :
- Capitaine : `isLocked = computed(() => articleKeywordsStore.keywords?.richCaptain?.status === 'locked')`.
- Lieutenants : `isLocked = computed(() => articleKeywordsStore.keywords?.richLieutenants?.some(l => l.status === 'locked'))`.
- Lexique : **conserve sa Ref locale** (sémantique de lock côté DB pas encore clarifiée — sprint dédié futur).
- Le store expose désormais `unlockCaptain()` et `unlockLieutenants()` (méthodes manquantes — l'unlock UI ne propageait pas au store ni à la DB avant Sprint 13).
**Critères d'acceptation testables** :
- `isLocked` dans CaptainValidation.vue est un `computed`, pas une `ref`.
- `isLocked` dans LieutenantsSelection.vue est un `computed`, pas une `ref`.
- Aucune écriture impérative `isLocked.value = true/false` ne subsiste dans ces 2 fichiers.
- Le watcher Sprint 16 hotfix de CaptainValidation.vue est supprimé.
- Tests existants passent avec mocks store qui mutent comme le vrai store (au lieu d'être des `vi.fn()` inertes).
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-13-isLocked-computed.

#### FR-MOT-DISPLAY-FROM-STORE
Les composants UI du Moteur qui affichent des données live (Capitaine verrouillé, checks workflow) lisent ces données depuis le store Pinia (`articleKeywordsStore`, `articleProgressStore`) plutôt que depuis des props passées par le parent. Les props restent acceptables pour les données figées (titre article, type, `suggestedKeyword` initial).
**Justification** : les props sont nourries par des computeds figés sur des sources statiques (`strategyStore.proposedArticles`, `cocoonsStore.cocoons`) qui ne sont pas invalidées sur mutation utilisateur. Le store Pinia est muté en optimistic update lors de chaque action (`lockCaptain`, `unlockCaptain`, `addCheck`, `removeCheck`) et reste donc la source réactive fraîche. `MoteurView.vue:127` hardcode même `captainKeywordLocked: null` pour les articles suggérés — la projection ne pourra jamais refléter un lock pour ces articles.
**Implémentation** :
- `MoteurContextRecap.vue` : helper `getDisplayedKeyword(art)` qui lit `articleKeywordsStore.keywords?.capitaine` pour l'article sélectionné, `props.capitainesMap[art.id]` sinon. Index réactif `checksByArticleId = computed()` sur `progressStore.progressMap` pour garantir la traque Vue de la mutation des checks.
- `LexiquePanel.vue` : computed `displayedCaptainKeyword` qui lit `articleKeywordsStore.keywords?.capitaine` quand `articleId` matche, fallback `props.captainKeyword` sinon.
**Limitation connue** : la cohérence cross-article (article B affiché dans le tree pendant qu'on travaille sur A) n'est garantie que pour l'article actuellement sélectionné. Les autres articles affichent ce que `props.capitainesMap` contient, rafraîchi par `useMoteurArticleSync` au check `capitaine_locked` mais pas live si le lock est fait sur un autre onglet/session. Sprint dédié futur pour propagation cross-tab si nécessaire.
**Critères d'acceptation testables** :
- Lock Capitaine "X" → "Y" sur article sélectionné : `<MoteurContextRecap>` affiche "Y" sans reload.
- Lock Capitaine "X" → "Y" sur article sélectionné : `<LexiquePanel>` lexique-header affiche "Y" sans reload.
- Validation d'un check Moteur (Discovery / Radar / Capitaine / Lieutenants / Lexique) : le dot correspondant dans `<ProgressDots>` du tree passe à `--filled` sans reload.
- Uncheck d'un check Moteur : le dot redevient vide sans reload.
- Switch article A → B → A : aucun bleed-through (le Capitaine de B n'apparaît pas sur A).
- `tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts` couvre les 3 scénarios.
**Statut :** active. **Depuis :** 2026-05-07. **Source :** tech-spec-reactive-captain-and-progress-v2.

#### FR-CODE-NO-CAROUSEL
Le terme « carousel » est éliminé du nommage des symboles publics côté frontend (composables, interfaces, fichiers de tests). Le composable historiquement nommé `useRadarCarousel` est renommé `useExploredKeywords` ; l'interface `CarouselEntry` devient `ExploredKeywordEntry`.
**Justification** : en mode workflow (par défaut), le Capitaine présente une **liste verticale** de mots-clés explorés (cf. `CaptainRadarList.vue`) — pas un carousel UI. Le terme legacy datait du mode libre (Labo) où il y avait une vraie navigation carousel ; aujourd'hui il prête à confusion. Le terme « exploredKeywords » est préféré à « scanHistory » car il englobe les recherches manuelles ET automatiques.
**Critères d'acceptation testables** :
- Recherche grep `useRadarCarousel|CarouselEntry` dans `src/`, `tests/`, `shared/` retourne 0 occurrence.
- Le composable est accessible via `useExploredKeywords` exporté depuis `src/composables/keyword/useExploredKeywords.ts`.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-12-rename-explored-keywords.

#### FR-UI-VOCABULAIRE-VERROUILLER
Les boutons d'action de figeage d'une décision utilisateur dans le Moteur (Capitaine, Lieutenants, Lexique) utilisent le vocabulaire **« Verrouiller »** dans leur libellé. L'ancien vocabulaire « Valider » est réservé à la documentation produit interne et au backend (en attente de renommage Sprint 14) et n'apparaît plus dans l'interface utilisateur du workflow Moteur.
**Justification produit** : « Valider » est ambigu — il désigne à la fois la recherche/exploration (scan DataForSEO + calcul scoring) et le verrouillage (décision utilisateur de figer un mot-clé). Côté UX, l'utilisateur **verrouille** un mot-clé / une sélection — c'est un acte de figeage, pas une étape technique.
**Mapping libellés** :
- Capitaine : "Verrouiller ce mot-clé" (était "Valider ce Capitaine")
- Lieutenants : "Verrouiller les Lieutenants" (était "Valider les Lieutenants")
- Lexique : "Verrouiller le Lexique" (était "Valider le Lexique")
- Boutons "Déverrouiller" : inchangés (déjà cohérents)
**Critères d'acceptation testables** :
- Recherche grep `"Valider ce Capitaine"` / `"Valider les Lieutenants"` / `"Valider le Lexique"` dans `src/components/` retourne 0 occurrence.
- Tests UI matchent les nouveaux libellés.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-11-vocabulaire-verrouiller.

#### FR-CAP-RELEVANCE-STORE-REMOVED
Le store frontend `captain-relevance.store.ts` (Pinia) — qui gérait la détection de changement painPoint et le déclenchement de recompute — est supprimé. Sa responsabilité est entièrement assumée par le calcul live au backend (`captain-relevance.service.ts`) déclenché à chaque hydratation initiale de l'onglet via `article-keywords.store.fetchKeywords()`.
**Critères d'acceptation testables** :
- Le fichier `src/stores/article/captain-relevance.store.ts` n'existe pas dans le repo.
- Recherche grep `useCaptainRelevanceStore` dans `src/` retourne 0 occurrence.
- `tests/unit/components/captain-validation-painpoint-frozen.test.ts` : test canari qui vérifie l'absence du fichier et l'absence d'import.
**Statut :** active. **Depuis :** 2026-05-06. **Remplace :** ancien store `captain-relevance` créé en commit `e13a330` (Sprint 6 du Chantier A — Pertinence à la volée). **Source :** tech-spec-sprint-10.5-cleanup-painpoint-legacy.

#### FR-PIE-AI-GENERATION
Les prompts IA de création d'articles (`cocoon-articles.md`, `cocoon-articles-spe.md`, `cocoon-add-article.md`) génèrent le champ `painIntentExpected` en plus de `painPoint`. Le champ est inclus dans la même réponse JSON que les autres métadonnées article — **aucun appel IA supplémentaire**.
**Valeurs autorisées** : `'commercial' | 'transactional' | 'informational' | 'navigational'`.
**Règles d'inférence** (documentées dans les prompts) :
- `informational` : article qui explique, guide, éduque (« Comment faire X », « Guide débutant Y »).
- `commercial` : comparatif, sélection (« Meilleur X 2026 », « Comparatif X vs Y »).
- `transactional` : pousse à l'achat ou conversion (« Acheter X », « Réserver X »).
- `navigational` : page marque/produit précis (rare en SEO éditorial).
**Critères d'acceptation testables** :
- Schéma Zod valide les 4 valeurs en sortie de prompt (`painIntentExpectedSchema`).
- `addArticlesToCocoon` persiste le champ dans `articles.pain_intent_expected`.
- Si l'IA omet le champ (rétro-compat), persistance avec `NULL` — pas d'erreur 500.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-pain-intent-expected-signal.

#### FR-PIE-CERVEAU-OVERRIDE
L'utilisateur peut corriger l'intent généré par l'IA via un dropdown radio single-select dans `ProposedArticleRow.vue`, à côté de l'affichage du painPoint. Le changement déclenche un PUT vers `/articles/:id` qui met à jour `pain_intent_expected` en DB.
**Comportement** :
- Dropdown affiche les 4 valeurs + option « Non défini » (NULL).
- Persistance immédiate au changement (pas de bouton « Enregistrer »).
- Notification toast confirmant la mise à jour.
**Critères d'acceptation testables** :
- Test composant `ProposedArticleRow.vue` : changement de valeur déclenche émission événement avec nouvelle valeur.
- Test contract-api `PUT /articles/:id` : payload `{ painIntentExpected: 'informational' }` → row DB mise à jour.
- Réouverture de la card → la valeur correcte est affichée.
**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-pain-intent-expected-signal.

---

### 8.7 — Moteur — Lieutenants (FR-LIE)

#### FR-LIE-SERP-ANALYZE
Endpoint `POST /api/serp/analyze`. Curseur intelligent (`sliderValue`, défaut 10, max 100, display « 2/4 »). Pendants `serpPendingKeywords[]`, tabs par keyword. Cache cross-article via `keyword_metrics.serp_raw_json`.
**Source :** `server/routes/serp-analysis.routes.ts:20-50` — `server/services/external/serp-analysis.service.ts:102+`.

#### FR-LIE-EXTRACT-HEADINGS
Extraction Hn (H1/H2/H3) via regex `/<h[1-3]>...</h[1-3]>/gi` + `extractTextContent()` (strip HTML). Calcul récurrence `computeHnRecurrenceFrom(competitors[])` → `HnRecurrenceItem[] { level, text, count, percentage }`.
**Source :** `server/services/external/serp-analysis.service.ts`.

#### FR-LIE-PROPOSE-AI
Endpoint `POST /keywords/:keyword/propose-lieutenants`. Prompt `propose-lieutenants.md` (30 KB+ contexte SERP + PAA + racines). Modèle Claude Sonnet streaming. Filtre auto post-IA `filterLieutenants()` : tri desc score + cap par level (Pilier 5 / Intermédiaire 5 / Spécifique 4). Sortie : `selectedLieutenants[]` + `eliminatedLieutenants[]` + `hnStructure` + `contentGapInsights`.
**Source :** `server/routes/keyword-ai-panel.routes.ts:150+`.

#### FR-LIE-GEOFUNNEL-RULE
Règle géo-funnel (anti-cannibalisation) : Pilier max 1-2 villes, Intermédiaire ZÉRO, Spécifique ZÉRO. Breach = pénalité -15 à -25 points.
**Source :** `server/prompts/propose-lieutenants.md:69-84`.

#### FR-LIE-HN-STRUCTURE
Endpoint `POST /keywords/:keyword/ai-hn-structure`. Prompt `lieutenants-hn-structure.md`. Entrée `{ lieutenants[], level, hnStructure?, articleId, cocoonSlug }`. Sortie : recommandation libre-texte (pas de JSON strict).
**Source :** `server/routes/keyword-ai-panel.routes.ts:86-123`.

#### FR-LIE-SECTIONS-FOLDABLE
3 sections dépliables : Hn concurrents (% récurrence), PAA N+2, Groupes croisés (Cerveau). Composant parent `LieutenantsSelection.vue`, enfants `LieutenantSerpAnalysis`, `LieutenantH2Structure`, `LieutenantsAiPanel`, `LieutenantProposals`. Chaque section utilise `CollapsableSection` avec lazy-load.

#### FR-LIE-CANDIDATES-BADGES
Candidats avec badges multi-source `[SERP] [PAA] [Groupe]` + pertinence `Fort` / `Moyen` / `Faible`.

#### FR-LIE-CHECKBOX-COUNT
Sélection checkbox + compteur recommandé (Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3). Persistance débounce 300ms via emit `lieutenants-updated` → `articleKeywordsStore.saveLieutenants()`.

#### FR-LIE-SLIDER-INTELLIGENT
Curseur SERP intelligent : sous le défaut = filtre local (sur résultats déjà cachés), au-dessus = scraping complémentaire.

#### FR-LIE-CHECK
Émet `moteur:lieutenants_locked` au verrouillage.

#### FR-LIE-AI-FRONTIER
**Frontière sémantique données utilisateur ↔ suggestions IA** *(ajout 2026-05-04)*. Les containers principaux Lieutenants — `LieutenantProposals` (cards Lieutenants verrouillés et éliminés) et `LieutenantH2Structure` (structure Hn validée) — affichent les **données de l'utilisateur** ; ils représentent ce que l'utilisateur a sélectionné, verrouillé, validé. Ils **ne doivent jamais** être visuellement ou hiérarchiquement absorbés par la coque "Suggestions IA" (`LieutenantsAiPanel`), qui est dédiée aux **propositions générées par l'IA** non encore validées.

La séparation visuelle est un contrat UX : l'utilisateur sait, à tout moment, si une donnée est la sienne ou une suggestion à valider. Toute fusion future doit être traitée comme une régression bloquante, peu importe son origine (refactor structurel, ajout de feature, restyling, parallélisation).

**Historique** : la régression Sprint C-1 (commit `890b285`, 2026-05-02) avait absorbé `LieutenantProposals` + `LieutenantH2Structure` dans `LieutenantsAiPanel`. La frontière a été restaurée en sprint 1 (2026-05-04). Cette FR formalise l'invariant pour qu'il survive aux refactors.

**Test verrou de référence** : `tests/unit/components/lieutenants-selection-architecture.test.ts` — tout test architectural ajouté dans cette zone DOIT pointer cette FR dans son commentaire de tête.
**Source :** `src/components/moteur/LieutenantsSelection.vue:735-890`.

#### FR-LIE-SCRAPE-DEDIE
**Service métier dédié au Lexique côté Lieutenants** *(ajout 2026-05-09, roadmap optimisation Lexique — proposed)*. Les Lieutenants consomment un service `lieutenants-analysis.service.ts` qui :
1. Lit les URLs SERP depuis `keyword_serp_results` (FR-INFRA-SCRAPE-CORPUS-NEUTRE).
2. Déclenche le scrape via `scrape-corpus.service` si nécessaire (cache court mémoire 1h partagé avec Lexique).
3. Extrait `headings[]` + classifie `isBlog` pour chaque concurrent.
4. Retourne un `ProposeLieutenantsServiceResult` (compétiteurs + headings + PAA) consommable par `/serp/analyze`.

**Important — séparation `data prep` ↔ `IA SSE`** : ce service prépare uniquement les **données scrape** (compétiteurs + headings + PAA). L'appel IA qui propose effectivement les Lieutenants reste porté par la **route SSE existante** `POST /keywords/:keyword/propose-lieutenants` ([server/routes/keyword-ai-panel.routes.ts](server/routes/keyword-ai-panel.routes.ts)) — refonte de cette route hors-scope du chantier 2 (le SSE streaming est une mécanique distincte, complexe à transformer en sync, et pas nécessaire pour atteindre le découplage Lieutenants/Lexique cible). La persistance dans `lieutenant_explorations` reste également portée par la route SSE via `saveLieutenantExplorations`.

**Aucun appel à `analyzeSerpCompetitors`** (supprimé en C3). **Aucun import de service Lexique**.

**Critères d'acceptation testables** :
- AC.LIE-SCRAPE.1 : `lieutenants-analysis.service.ts` n'importe ni `tfidf.service.ts` ni `lexique-analysis.service.ts` (test grep architectural).
- AC.LIE-SCRAPE.2 : Mock `scrape-corpus.service` → un test unitaire vérifie que `lieutenants-analysis` ne lit jamais `textContent` des scrapes (utilise uniquement `headings`).
- AC.LIE-SCRAPE.3 : Si `keyword_serp_results` est vide pour le keyword, le service déclenche le fetch SERP DataForSEO + scrape, persiste, puis propose. Pas de 404 silencieux.
- AC.LIE-SCRAPE.4 : Le service est invocable depuis l'onglet Lieutenants ou depuis un test sans dépendance contextuelle.

**Statut :** **active** *(implémenté 2026-05-09 — Story B1+B3+C1 chantier 2)*. **Depuis :** 2026-05-09. **Source :** tech-spec-decouplage-lieutenants-lexique.
**Voir aussi :** NFR-MOT-LEXIQUE-DECOUPLAGE, FR-LEX-SCRAPE-DEDIE, FR-INFRA-SCRAPE-CORPUS-NEUTRE.

---

### 8.8 — Moteur — Lexique (FR-LEX)

#### FR-LEX-TFIDF
Endpoint `POST /api/serp/tfidf`. Tokenize (min 3 chars, strip stopwords FR), DF par terme, niveaux : DF ≥ 70 % = Obligatoire / 30-70 % = Différenciateur / < 30 % = Optionnel. Sort densité desc, limite 50 par niveau. Consulte `keyword_metrics.serp_raw_json` (zéro nouvelle requête).
**Source :** `server/routes/serp-analysis.routes.ts:53-89` — `server/services/keyword/tfidf.service.ts:22-81`.

#### FR-LEX-SORT
Composant `SortToggleBar.vue` : tri `A-Z` / `Densité` / `Pertinence douleur` (conditionnel painPoint exists). Pertinence douleur = Jaccard `jaccardWithPainPoint(term, painPoint)` = intersection / union.
**Statut :** active. **Depuis :** 2026-04-28. **Source :** sprints-pain-point-relevance-evolution.

#### FR-LEX-SELECT
Checkboxes par terme, Obligatoires pré-cochés. Persistance `articleKeywordsStore.saveLexiqueTerms(articleId, selectedTerms[])` dans `article_keywords.lexique` JSONB.

#### FR-LEX-AI-PANEL
Panel IA `LexiqueAiPanel.vue` (SSE), prompts `lexique-ai-panel.md` + `lexique-analysis-upfront.md`. Contexte : termes 3 niveaux + painPoint + strategy_context.
**Source :** `server/routes/keyword-ai-panel.routes.ts`.

#### FR-LEX-MULTI-KEYWORD
Service `lexique-exploration.service.ts` : input libre « tester ce mot-clé » → fetch SERP + TF-IDF + IA → persiste `LexiqueExplorationEntry { tfidfTerms, aiRecommendations, aiMissingTerms, aiSummary }`.

#### FR-LEX-CHECK
Émet `moteur:lexique_validated` à la validation finale (écriture finale dans `article_keywords` : capitaine + lieutenants + lexique).

#### FR-LEX-SCRAPE-DEDIE
**Service métier dédié au Lexique** *(ajout 2026-05-09, roadmap optimisation Lexique — proposed)*. Le Lexique consomme un service `lexique-analysis.service.ts` qui :
1. Lit les URLs SERP du keyword cible depuis `keyword_serp_results` (FR-INFRA-SCRAPE-CORPUS-NEUTRE).
2. Déclenche le scrape via `scrape-corpus.service` si nécessaire (cache court mémoire 1h partagé avec Lieutenants), uniquement si l'option `triggerScrapeIfMissing` est passée. Sinon, throw `LexiqueScrapeMissingError` (préserve le 404 actuel verbatim).
3. Extrait `text_content` des scrapes et calcule TF-IDF.
4. Persiste le résultat dans `lexique_explorations` **si et seulement si** `articleId` est fourni dans les options. Le service reste invocable sans `articleId` (exploration libre, tests).

**Aucun appel à `analyzeSerpCompetitors`** (supprimé en C3). **Aucun import de service Lieutenants**.

**Critères d'acceptation testables** :
- AC.LEX-SCRAPE.1 : `lexique-analysis.service.ts` n'importe ni le composant Lieutenants ni `lieutenants-analysis.service.ts` (test grep architectural).
- AC.LEX-SCRAPE.2 : Mock `scrape-corpus.service` → un test unitaire vérifie que `lexique-analysis` ne lit jamais `headings[]` (utilise uniquement `text_content`).
- AC.LEX-SCRAPE.3 : Si `keyword_serp_results` est vide et `triggerScrapeIfMissing: true`, le service déclenche le fetch SERP DataForSEO + scrape (UX coût via FR-LEX-PRECHECK-SERP). Si `triggerScrapeIfMissing` non fourni / `false`, le service throw `LexiqueScrapeMissingError` avec message verbatim *« Lancez d'abord l'analyse SERP dans l'onglet Lieutenants »* (préservé pour compat chantier 1).
- AC.LEX-SCRAPE.4 : Le service est invocable depuis l'onglet Lexique ou depuis un test sans dépendance HTTP/Express (signature pure : `(keyword, opts?) => Promise<LexiqueAnalysisServiceResult>`).
- AC.LEX-SCRAPE.5 : L'endpoint actuel `POST /api/serp/tfidf` est conservé temporairement (compatibilité), mais sa logique interne pointe vers `lexique-analysis.service`. Code 404 + message verbatim préservés. Suppression différée à un PR ultérieur (post-chantier 3).

**Statut :** **active** *(implémenté 2026-05-09 — Story B2+B3+C2 chantier 2)*. **Depuis :** 2026-05-09. **Source :** tech-spec-decouplage-lieutenants-lexique.

**Voir aussi :** NFR-MOT-LEXIQUE-DECOUPLAGE, FR-LIE-SCRAPE-DEDIE, FR-INFRA-SCRAPE-CORPUS-NEUTRE.

#### FR-LEX-PRECHECK-SERP
**UX pré-check SERP au mount du Lexique** *(actif 2026-05-09 — Stories E1-S1+S2+S3 chantier 3)*. Au mount du `LexiquePanel`, un endpoint léger `GET /api/keywords/:keyword/serp/exists` répond `{ exists: boolean, scrapedAt: timestamp | null }` sans charger le JSONB entier ni les scrapes.

**Comportement UI** :
- `exists: true` → bouton « Extraire le Lexique » actif immédiatement.
- `exists: false` → message explicite *« Le scrape SERP n'est pas encore disponible pour ce mot-clé »* + CTA *« Lancer l'analyse SERP (consomme ~$0.003 DataForSEO) »* avec confirmation modale.
- Plus de **404 dans la console** : c'est un état attendu, pas une erreur technique.

**Contrats techniques** *(implémentés)* :
- Service `hasSerpScrape(keyword, lang, country)` dans `server/services/keyword/keyword-serp.service.ts`. SQL `MAX(scraped_at) FROM keyword_serp_scrapes` (sub-ms).
- Composable `useSerpExistsCheck(keyword: Ref<string|null>)` dans `src/composables/lexique/useSerpExistsCheck.ts`. Watch immediate + refetch().
- Modale `<ConfirmModal>` réutilisable dans `src/components/shared/ConfirmModal.vue`.
- POST `/serp/tfidf` accepte un body `triggerScrapeIfMissing: boolean` (default false → compat 404 verbatim AC.C1.1/C2.2). Honoré par `analyzeLexique` (chantier 2 livré).

**Critères d'acceptation testables** :
- AC.LEX-PRECHECK.1 : Endpoint `GET /api/keywords/:keyword/serp/exists` répond `{ exists: false, scrapedAt: null }` pour un keyword jamais scrapé. 200 OK, pas 404. Validation 400 si keyword vide ou >200 chars. *(test : `tests/integration/keywords-serp-exists.test.ts`)*
- AC.LEX-PRECHECK.2 : Endpoint répond `{ exists: true, scrapedAt: '2026-05-...' }` pour un keyword déjà scrapé. *(test : idem)*
- AC.LEX-PRECHECK.3 : Au mount du LexiquePanel, ce GET est appelé une fois ; selon la réponse, le bouton « Extraire » est visible ou remplacé par le CTA « Lancer l'analyse SERP ». *(test : `tests/unit/components/moteur/LexiquePanel.precheck.test.ts`)*
- AC.LEX-PRECHECK.4 : Le clic sur « Lancer l'analyse SERP » ouvre `<ConfirmModal>`. Confirmation → POST `/serp/tfidf` appelé avec `triggerScrapeIfMissing: true` (1 seul appel) → refetch `useSerpExistsCheck` pour repasser à l'état nominal. *(test : idem)*
- AC.LEX-PRECHECK.5 : Aucun appel direct à `POST /api/serp/tfidf` qui aboutirait à un 404 (la logique pré-check empêche ce cas — watcher auto-restore gated par `serpExists !== false`). *(test : idem, mock count = 0)*

**Statut :** **active** *(implémenté 2026-05-09 — Story E1 chantier 3)*. **Depuis :** 2026-05-09. **Source :** plan-chantier-3-ux-lexique.
**Voir aussi :** FR-LEX-SCRAPE-DEDIE, FR-LEX-MULTI-KEYWORD-TABS.

#### FR-LEX-MULTI-KEYWORD-TABS
**Système d'onglets par `source_keyword` dans le container Lexique** *(actif 2026-05-09 — Stories E2-S1+S2+S3 chantier 3)*. Le container Lexique affiche un système d'onglets, **un onglet par `source_keyword` exploré pour l'article courant** (lus depuis `lexique_explorations`).

**Comportement** :
- Le label de chaque onglet = `source_keyword` brut (ex. `creation site web entreprises`, `creation site Toulouse`). **Pas de transformation côté UI** (cohérence affichage/calcul §2.0 CLAUDE.md : `tab.id === tab.label === entry.sourceKeyword`).
- L'onglet actif affiche le `tfidfResult` correspondant + ses recommandations IA, sans refetch DB.
- Un onglet « + Tester un mot-clé » (ou « Tester un mot-clé » s'il n'y a aucune exploration) ouvre le champ libre existant (`extractCustomKeyword`).
- Le composant utilise `<TabBar>` partagé (`src/components/shared/TabBar.vue`, ARIA-compliant role="tablist"/role="tab"/aria-selected).

**Contrats techniques** *(implémentés)* :
- Composant pur `<TabBar>` réutilisable : props `{ tabs: TabItem[], activeId: string, ariaLabel? }`, emit `update:activeId`, support `disabled`.
- Composant `LexiqueCustomKeywordInput.vue` (renommage de `LexiqueMultiKeywordPanel.vue`) — saisie libre uniquement (la liste d'explorations est portée par `<TabBar>` côté parent).
- LexiquePanel : computed `lexiqueTabs`, `displayedTabId` (matching strict, pas de lowercase), handler `onSelectTab`. `extractCustomKeyword` appelle `mergeFromDb` après succès → nouvel onglet apparaît automatiquement.

**Critères d'acceptation testables** :
- AC.LEX-TABS.1 : Article avec 3 `lexique_explorations` → 3 onglets + 1 onglet « + Tester un mot-clé » (4 boutons `role="tab"`). *(test : `tests/unit/components/moteur/LexiquePanel.tabs.test.ts`)*
- AC.LEX-TABS.2 : Cliquer sur un onglet change le `tfidfResult` affiché sans refetch DB (`apiGet('/articles/:id/explorations')` count stable). *(test : idem + `lexique-extraction.gaps`)*
- AC.LEX-TABS.3 : Extraction d'un keyword vierge → nouvel onglet via `mergeFromDb` post-fetch + sélection automatique (matching strict `activeSourceKeyword === entry.sourceKeyword`). *(test : `lexique-extraction.gaps`)*
- AC.LEX-TABS.4 : Article sans aucune exploration → 1 seul onglet « Tester un mot-clé ». *(test : `LexiquePanel.tabs.test.ts` + `lexique-extraction.gaps`)*
- AC.LEX-TABS.5 : Test architectural — `LexiquePanel.vue` importe `TabBar` depuis `@/components/shared/`, `<TabBar>` reste pur (aucun import métier Lexique). *(test : `tests/unit/architecture/lexique-tabbar.test.ts`)*

**Statut :** **active** *(implémenté 2026-05-09 — Story E2 chantier 3)*. **Depuis :** 2026-05-09. **Source :** plan-chantier-3-ux-lexique.
**Voir aussi :** FR-LEX-MULTI-KEYWORD (existant, étendu), FR-LEX-LECTURE-VS-VERROUILLAGE.

#### FR-LEX-LECTURE-VS-VERROUILLAGE
**Séparation stricte des responsabilités lecture vs verrouillage** *(ajout 2026-05-09, roadmap optimisation Lexique — proposed)*. Deux familles de fonctions strictement séparées dans le LexiquePanel et son store associé :

**Famille LECTURE** (consultation d'historique, sélection d'onglet, hydratation au mount) :
- `getLexiqueExplorations(articleId)` — lit `lexique_explorations`.
- `selectExploration(sourceKeyword)` — change l'onglet actif (mute uniquement le state UI local).
- `hydrateFromDb()` — restore `tfidfResult` + `iaRecommendations` au mount.
- **Aucune mutation** de `article_keywords.lexique`.

**Famille VERROUILLAGE** (action utilisateur sur les checkboxes) :
- `addLexiqueTerm(term)` / `removeLexiqueTerm(term)` — mute store.
- `saveDecisions(articleId)` — PUT `/articles/:id/keywords`.
- **Aucune lecture** de `lexique_explorations`.

**Critères d'acceptation testables** :
- AC.LEX-SEP.1 : Test unitaire — appeler les fonctions LECTURE déclenche **0 PUT** vers `/articles/:id/keywords` (mock count).
- AC.LEX-SEP.2 : Test unitaire — appeler les fonctions VERROUILLAGE déclenche **0 GET** vers `/articles/:id/explorations` (mock count).
- AC.LEX-SEP.3 : Test architectural (grep) — aucune fonction de la famille LECTURE n'appelle de fonction de la famille VERROUILLAGE et vice-versa.
- AC.LEX-SEP.4 : Le watcher `isLocked` (computed dérivé de `lexique.length > 0`, FR-LEX-CHECKBOX-LOCK-IMMEDIATE) reste actif et **observe** le store, mais n'appartient à aucune des deux familles (c'est de la propagation de check, pas de lecture/écriture du Lexique lui-même).

**Statut :** proposed. **Depuis :** 2026-05-09. **Source :** chantier 2026-05-09 (roadmap optimisation Lexique).
**Voir aussi :** FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-MULTI-KEYWORD-TABS.

---

### 8.9 — Moteur — Finalisation (FR-FIN)

#### FR-FIN-RECAP
Composant `FinalisationRecap.vue` : récapitulatif des 3 verrouillages (Capitaine locked, Lieutenants selected, Lexique selected, Hn structure). Read-only — modifications via retour aux onglets précédents. Onglet débloqué quand les 3 checks Phase ② sont ✓.

#### FR-FIN-LINK-REDACTION
Bouton « Passer à la Rédaction » → navigation vers la vue Rédaction de l'article.

#### FR-FIN-CHECK
Émet `moteur:finalisation_completed` (à confirmer dans le code — le PRD initial ne mentionnait que les 5 checks Phase ① + ②).

---

### 8.10 — Rédaction (FR-RED)

#### FR-RED-BRIEF
Endpoint `POST /api/generate/brief-explain`. SSE streaming. Inputs : `{ articleId, articleTitle, keyword, cocoonName, articleType, keywords[], lexique[], hnStructure[], paaQuestions[], topCompetitors[], cocoonArticles[] }`. Prompt `brief-ia-panel.md`. Contenu : intention de recherche, analyse Hn, stratégie contenu par H2, points d'attention (featured snippets, cannibalisation, CTA, densité).
**Source :** `server/routes/generate/brief-explain.routes.ts:10`.

#### FR-RED-OUTLINE
Endpoint `POST /api/generate/outline`. SSE streaming. Prompt `generate-outline.md`. Variables : `{{articleTitle}}`, `{{articleType}}`, `{{keyword}}`, `{{secondaryKeywords}}` (lieutenants), `{{strategyContext}}`, `{{keywordContext}}`, `{{microContext}}`, `{{paaQuestions}}`. Output JSON `{ sections: [{ id, level, title, annotation }] }`. Stockage dans `article_content.outline` JSONB.
**Source :** `server/routes/generate/outline.routes.ts`.

#### FR-RED-ARTICLE
Endpoint `POST /api/generate/article`. SSE par section. Workflow : split outline en groupes H2 → pour chaque groupe : compute budget (`computeSectionBudget` → role/budget/hint/maxTokens) → load prompt `generate-article-section.md` → stream via Claude (web-search optionnel) → handle 429 backoff exponentiel → merge HTML preserving structure. Variables : `{{sectionOutline}}`, `{{sectionPosition}}` (intro/middle/conclusion), `{{previousContext}}` (last 500 chars), `{{positionDirectives}}`, `{{wordCountBudget}}`, `{{sectionRole}}`, `{{sectionBudgetHint}}`. Inter-section delay configurable (`INTER_SECTION_DELAY_MS`, défaut 15s). Stockage dans `article_content.content` TEXT.
**Source :** `server/routes/generate/article.routes.ts`.

#### FR-RED-META
Endpoint `POST /api/generate/meta`. JSON response (pas SSE). Prompt `generate-meta.md`. Output `{ metaTitle, metaDescription }` avec truncation au mot près (title 60ch, desc 160ch). Retry loop sur 429.
**Source :** `server/routes/generate/meta.routes.ts`.

#### FR-RED-EDITOR-TIPTAP
Composant `ArticleEditor.vue` avec store `useEditorStore`. Content SSOT = `editorStore.content` (HTML). `editorStore.wordCount` computed.

#### FR-RED-SEO-LIVE
Composable `useSeoScoring.ts` : watch content (debounce 300ms) + `requestIdleCallback` pour recalcul non-bloquant. `seoStore.recalculate()` produit `SeoScore { global, wordCount, densities, headingValidation, metaAnalysis, checklistItems }`. Niveaux `good` / `fair` / `poor`.
**Source :** `src/composables/seo/useSeoScoring.ts:33-77`.

#### FR-RED-CONTEXTUAL-ACTIONS
12 actions sur sélection via bubble menu, endpoint `POST /api/generate/action`. Prompts dans `server/prompts/actions/` :
- `reformulate.md`
- `simplify.md`
- `convert-list.md`
- `pme-example.md`
- `keyword-optimize.md`
- `add-statistic.md`
- `answer-capsule.md` (featured snippet)
- `question-heading.md`
- `localize.md`
- `sources-chiffrees.md` (web-search enabled)
- `exemples-reels.md` (web-search enabled)
- `ce-quil-faut-retenir.md`

Stream SSE, applique au TipTap selection. Action `internal-link` ouvre un picker au lieu de stream.
**Source :** `src/composables/editor/useContextualActions.ts`.

#### FR-RED-INTERNAL-LINKING
Composable `useInternalLinking.ts` : suggestions `{ targetId, suggestedAnchor, href }`. `applySuggestion()` ajoute mark TipTap `internalLink` avec `targetId`. Stockage dans table `internal_links`.
**Source :** `src/composables/seo/useInternalLinking.ts:25-79`.

#### FR-RED-REDUCE-SECTION
Endpoint `POST /api/generate/reduce-section`. Compression du contenu si word count > target. Inputs `{ articleId, sectionHtml, sectionIndex, sectionTitle, targetWordCount, currentWordCount, keyword, keywords[] }`.

#### FR-RED-HUMANIZE-SECTION
Endpoint `POST /api/generate/humanize-section`. Reformule pour rendre naturel. Pipeline `humanizeAllSections()` parallélisé avec `AbortController`. Fallback à l'original si humanize échoue (`humanizeFallbackCount` tracké).

#### FR-RED-WORD-COUNT-TARGET
`targetWordCount` lu depuis le micro-context article OU calculé via `recommend-word-count` (cf. FR-CER-WORD-COUNT-RECOMMEND). Drive `computeSectionBudget` pour allocation par section.

#### FR-RED-PROGRESS
`ArticleProgress { id, phase, outline, outline_validated, content, content_validated, meta, meta_validated, seo, completed_checks[] }`. Phases : proposed → brief → outline → writing → seo → published.

#### FR-RED-CHECKS
5 checks Rédaction : `redaction:brief_validated`, `redaction:outline_validated`, `redaction:content_written`, `redaction:seo_validated`, `redaction:published`.
**Source :** `shared/constants/workflow-checks.constants.ts:40-53`.

#### FR-RED-PANELS-LAYOUT
**Architecture toolbar + ResizablePanel des panels d'analyse** *(ajout 2026-05-04, formalisation Vague 5 — extraction ArticlePanelsToolbar + ArticlePanelsResizable)*. Les 2 vues Rédaction (`ArticleWorkflowView`, `ArticleEditorView`) partagent une toolbar segmentée avec boutons toggle :
- **SEO** (FR-RED-SEO-LIVE)
- **GEO** (panel scoring AEO/GEO)
- **Maillage** (FR-RED-INTERNAL-LINKING)
- **Blocs** (BlocksPanel — éditeur uniquement)
- **IA Brief** (FR-RED-IA-BRIEF — workflow uniquement)

Le panel actif est rendu dans un `ResizablePanel` sticky (sidebar redimensionnable col-resize) à droite. Mutual exclusion : un seul panel actif à la fois (`usePanelToggle`). Les boutons SEO/GEO/Maillage/Blocs sont **gated par `hasBody = !!editorStore.content`** — désactivés visuellement si pas encore d'article généré (libre arbitre absolu : visible mais inactif, pas masqué). IA Brief n'est pas gated par hasBody (analyse du brief, pas du contenu).

Toggle Escape ferme le panel ouvert (`useKeyboardShortcuts`).
**Source :** `src/components/article/ArticlePanelsToolbar.vue`, `src/components/article/ArticlePanelsResizable.vue`, `src/composables/ui/usePanelToggle.ts`.

#### FR-RED-IA-BRIEF
**Panel IA d'analyse du brief** *(ajout 2026-05-04, formalisation Vague 5 — extraction ArticleWorkflowIaBrief)*. Disponible uniquement dans `ArticleWorkflowView` (Step 2 ou via toolbar). Au premier toggle, déclenche un streaming SSE vers `POST /api/generate/brief-explain` avec payload riche (article keywords + lexique + hnStructure + paaQuestions + topCompetitors + cocoonArticles). Le résultat markdown est parsé via `marked` et affiché en temps réel. Bouton **« Relancer l'analyse »** pour re-déclencher après modifications du brief.

Distinct de FR-RED-CONTEXTUAL-ACTIONS (qui agit sur sélection texte dans l'éditeur) — IA Brief est un **récap stratégique global** d'aide à l'auteur avant écriture.
**Source :** `src/components/article/ArticleWorkflowIaBrief.vue`, `server/routes/generate.routes.ts` (endpoint brief-explain).

---

### 8.11 — Labo (FR-LAB)

#### FR-LAB-ACCESS
Accessible depuis Navbar via `/labo`.

#### FR-LAB-MODE-LIBRE
Réutilise les composants Moteur en mode `libre` (article virtuel id=0, type sélectionnable Pilier/Intermédiaire/Spécifique, défaut Intermédiaire). Pas de sélection article/cocon. Pas de checks émis.

#### FR-LAB-VERDICT-DEFAULT
Verdict Capitaine seuils par défaut Intermédiaire (modifiables). Score Marché + Score Pertinence calculés selon les mêmes formules qu'en mode workflow.

#### FR-LAB-TABS
Onglets disponibles au Labo : Discovery (KeywordDiscoveryTab.vue), Douleur (PainTranslator.vue), Capitaine (CaptainValidation.vue mode libre).

---

### 8.12 — Explorateur (FR-EXP)

#### FR-EXP-INTENT-ANALYZE
Endpoint `POST /api/intent/analyze`. SERP avancée DataForSEO → classification intent dominante (Navigational / Transactionnel / Informationnel / Local) + détection 9 modules SERP (Local Pack, Featured Snippet, PAA, Vidéo, Images, Shopping, Knowledge Graph, Top Stories). Scoring + recommandations. Stockage `keyword_intent_analyses` (cross-article).
**Source :** `server/routes/intent-analyze.routes.ts` (à confirmer) — composant `IntentStep.vue`.

#### FR-EXP-AUTOCOMPLETE
Endpoint `POST /api/keywords/autocomplete`. DataForSEO autocomplete. Calcul certitude d'intention par préfixes (CertaintyIndex). Détecte longue traîne.
**Source :** composants `AutocompleteValidation.vue`, `AutocompleteChips.vue`.

#### FR-EXP-LOCAL-COMPARE
Endpoint `POST /api/keywords/compare-local`. Volume local vs national, opportunité locale (`OpportunityAlert`). Stockage `keyword_metrics.local_comparison`.
**Source :** composant `LocalComparisonStep.vue`.

#### FR-EXP-MAPS
Endpoint `POST /api/local/maps`. Détection Local Pack Google, listings concurrents (nombre, reviews, ratings), gap reviews vs concurrents.
**Source :** composant `MapsStep.vue`.

#### FR-EXP-CONTENT-GAP
Endpoint `POST /api/content-gap/analyze`. Scrape top 10 → identifie topics manquants → suggestions de gaps. Stockage `keyword_metrics.content_gap_analysis`.
**Source :** `server/routes/content-gap.routes.ts` — `server/services/article/content-gap.service.ts`.

#### FR-EXP-AUDIT
Audit batch keywords d'un cocon via `POST /api/keywords/audit`. Composants `KeywordAuditTable.vue`, `KeywordComparison.vue`.
**Source :** `server/routes/keywords.routes.ts:31-73`.

---

### 8.13 — Intégrations externes (FR-EXT)

#### FR-EXT-DATAFORSEO
Endpoints utilisés :
- `/serp/google/organic/live/regular` ($0.0006)
- `/serp/google/organic/live/advanced` ($0.002)
- `/dataforseo_labs/google/keyword_overview/live` ($0.01 + $0.0001/keyword)
- `/dataforseo_labs/google/related_keywords/live` ($0.01)
- `/dataforseo_labs/google/search_intent/live` ($0.01)
- `/dataforseo_labs/google/keyword_suggestions/live` ($0.01)
- `/keywords_data/google_ads/search_volume/live` ($0.05)

Cache `external_api_cache` (TTL variable par endpoint).
**Source :** `server/services/external/dataforseo*.ts`.

#### FR-EXT-DATAFORSEO-COSTGUARD
Cost-guard sliding-window avant chaque appel. Budget par défaut $0.50 / 30 min (configurable via `.env`). Réservation pré-call (commit après = noop). Throw `CostBudgetError` si dépassement. Pricing déclaré par endpoint + per-item surcharge pour batch keywords.
**Source :** `server/services/external/dataforseo-cost-guard.ts`.

#### FR-EXT-DATAFORSEO-SANDBOX
Sandbox opt-in via `DATAFORSEO_SANDBOX=1` (env).
**Source :** `.env.example:37-39`.

#### FR-EXT-GSC-OAUTH
OAuth2 flow Google Search Console : `GET /api/gsc/status`, `GET /api/gsc/auth`, `GET /api/gsc/callback`. Client ID/Secret = env vars. Token path = `data/gsc-token.json` (refresh auto). Scope = `webmasters.readonly`.
**Source :** `server/routes/gsc.routes.ts:13-117` — `server/services/external/gsc.service.ts`.

#### FR-EXT-GSC-PERFORMANCE
Endpoint `POST /api/gsc/performance`. Dates + dimensions (query, page, device, country) → rows `{ clicks, impressions, ctr, position }`. Cache 24h dans `external_api_cache`.

#### FR-EXT-GSC-KEYWORD-GAP
Endpoint `POST /api/gsc/keyword-gap`. Compare keywords ciblés vs réellement indexés / ranking dans GSC.

#### FR-EXT-AI-MULTI-PROVIDER
Service `ai-provider.service.ts` : dispatcher unique vers Claude / Gemini / OpenRouter / Mock selon `AI_PROVIDER`. Lecture de l'env à chaque call (switch chaud en dev). USAGE_SENTINEL `__USAGE__` en fin de stream pour parsing uniforme.
**Source :** `server/services/external/ai-provider.service.ts`.

#### FR-EXT-AI-FALLBACK
Fallback chain Claude → Gemini → OpenRouter sur `AIProviderQuotaError` (429) ou `AIProviderOverloadedError` (503). Désactivable via `AI_PROVIDER_NO_FALLBACK=1`. Retry exponentiel.

#### FR-EXT-CLAUDE
Modèle par défaut `claude-3-5-sonnet-20241022` (override via `CLAUDE_MODEL` env). Streaming JSON tool-use (`classifyWithTool`). SDK `@anthropic-ai/sdk`.

#### FR-EXT-GEMINI
Modèles : free tier `gemini-2.0-flash` (~15 req/min, $0), paid tier `gemini-2.5-flash`/`pro` (override via `GEMINI_MODEL` env). Response Mime Type JSON pour structured output.

#### FR-EXT-EMBEDDINGS
Service `embedding.service.ts`. Modèle HuggingFace `Xenova/multilingual-e5-small` (lazy-load, ~60s premier call). Batch max 32 textes. Préfixes `query: ` / `passage: `. Fallback null si modèle unavailable. Utilisé pour `computeSemanticScores`.
**Source :** `server/services/external/embedding.service.ts`.

#### FR-EXT-AUTOCOMPLETE-GOOGLE
Endpoint Google Autocomplete via DataForSEO ou direct (à confirmer). Fallback si indisponible.

---

### 8.14 — Infrastructure transversale (FR-INFRA)

#### FR-INFRA-API-CACHE
Table `external_api_cache(cache_key TEXT, cache_type TEXT, data JSONB, expires_at TIMESTAMPTZ, cached_at)`. Types : `paa`, `serp`, `radar`, `discovery`, `autocomplete`, `intent`, `longtail`, etc. TTL par type. Opérations `getCached(type, key)` (filtre `expires_at > NOW()`), `setCached(type, key, data, ttlMs)` (UPSERT ON CONFLICT).
**Source :** `server/db/cache-helpers.ts:13-39`.

#### FR-INFRA-API-CACHE-PURGE
Job de purge horaire (`setInterval` 60 × 60 × 1000ms) dans `server/index.ts:115-125` : `DELETE FROM external_api_cache WHERE expires_at < NOW()`.
**Source :** `server/index.ts:115-125`.

#### FR-INFRA-KEYWORD-METRICS
Table `keyword_metrics(keyword PK, search_volume, keyword_difficulty, cpc, competition, intent_raw, autocomplete_suggestions[], paa_questions[], serp_raw_json JSONB, local_comparison JSONB, content_gap_analysis JSONB, fetched_at TIMESTAMPTZ)`. Cross-article, permanent. Freshness check `FRESHNESS_DAYS = 7`.
**Source :** `server/services/keyword/keyword-metrics.service.ts`.

#### FR-INFRA-PAA-CACHE
Service `paa-cache.service.ts`. Cache hiérarchique PAA (level 0/1/2) cross-article. TTL 90 jours par `keyword + depth`.
**Source :** `server/services/infra/paa-cache.service.ts`.

#### FR-INFRA-GET-OR-FETCH
Pattern unifié `_getOrFetch<T>(cacheType, key, ttlMs, fetcher)` dans `intent.service.ts` et services équivalents : cache hit → return, cache miss → fetch → setCached → return.

#### FR-INFRA-API-WRAPPER
Wrapper frontend `src/services/api.service.ts` : `apiGet<T>(path, options?)`, `apiPost<T>(path, body, options?)`, `apiPut<T>(path, body, options?)`, `apiPatch<T>(path, body, options?)`, `apiDelete<T>(path, options?)`. Logging debug + error handling centralisé. Injection `pushUsageIfPresent` (cost-log) et `pushDbOpsIfPresent` (DB ops tracking). Surface des `KNOWN_ERROR_CODES` en toasts UI.
**Périmètre :** tout appel HTTP vers `/api/*` côté `src/`. **Hors périmètre :** appels vers APIs tierces (DataForSEO, Google OAuth, GSC, OpenRouter, Tavily, Google Suggest) côté `server/services/external/*` — voir `NFR-OBS-EXTERNAL-API-OPT-OUT`. **Streaming SSE :** utiliser `apiStream` (`FR-INFRA-API-STREAM`).
**Statut :** active. **Critère d'acceptation :** audit `data-flow-discipline` retourne 0 violation dans la catégorie « fetch() directs hors wrapper » côté `src/`.
**Depuis :** 2026-05-05 (chantier `tech-spec-fetch-to-wrapper-migration`, dette résorbée).
**Source :** `src/services/api.service.ts`.

#### FR-INFRA-API-STREAM
Wrapper SSE `apiStream<T>(path, body, callbacks?, options?)` dans `src/services/api.service.ts`. Mutualise les appels POST → SSE (`/api/generate/action`, `/api/generate/article`, `/api/keywords/:kw/ai-panel`, `/api/generate/outline`, etc.). Mêmes garanties que `apiPost` : pousse l'`usage` final dans cost-log + traduit `KNOWN_ERROR_CODES` en toasts.
Callbacks supportés : `onChunk` (cumulatif), `onChunkRaw` (par chunk), `onDone`, `onUsage`, `onSectionStart`, `onSectionDone`, `onError`. Renvoie `{ result, usage, errorMessage, aborted }`.
Le composable `useStreaming` et l'helper `startStreamOnce` (`src/composables/editor/useStreaming.ts`) sont des thin wrappers réactifs sur `apiStream`.
**Statut :** active. **Depuis :** 2026-05-05.
**Source :** `src/services/api.service.ts` (`apiStream`) + `tests/unit/services/api.service.test.ts` (8 cas FR-INFRA-API-STREAM).

#### FR-INFRA-ZOD-SHARED
Schémas Zod partagés front/back dans `shared/schemas/` (~41 fichiers `.schema.ts`). Validation `safeParse` côté routes Express.

#### FR-INFRA-PROMPT-LOADER
`loadPrompt(filename, variables?, options?)` lit depuis `server/prompts/`, substitue `{{variable}}` et blocs conditionnels `{{#conditional}}…{{/conditional}}`. Helpers : `buildStrategyContext`, `buildKeywordContext`, `buildMicroContextBlock`, `buildCocoonStrategyBlock`, `buildThemeContextBlock`. **Hardening :** `escapePromptContent()` contre prompt injection.
**Source :** `server/utils/prompt-loader.ts:32-60`.

#### FR-INFRA-WORKFLOW-CHECKS-CONSTANTS
Toutes les strings de checks dans `shared/constants/workflow-checks.constants.ts` (`MOTEUR_*`, `CERVEAU_*`, `REDACTION_*`). Stockage dans `articles.completed_checks` TEXT[] unique.
**Source :** `shared/constants/workflow-checks.constants.ts:1-62`.

#### FR-INFRA-SCORE-MODULE
Module `shared/score/` unifié : types, format, compare, aggregate. Export via `shared/score/index.ts` uniquement (règle dependency-cruiser `score-internal-only-via-index`). Type `Score = number | null` explicite. Helpers d'affichage : `formatScore`, `formatVolume`, `formatCpc`, `formatKd`, `formatPercent` — tous retournent `'—'` pour `null` / `undefined`. Helpers de tri / agrégat : `compareScores`, `compareScoresAsc`, `averageScores`, `maxScore`, `minScore`, `countValidScores`.
**Statut :** active. **Depuis :** 2026-05-03 (initial), **étendu :** 2026-05-05 (helpers KPI marché). **Source :** tech-spec-stabilisation-codebase (Sprint 3) + tech-spec-kpi-types-nullable.

#### FR-INFRA-NO-SCORE-FALLBACK
Règle ESLint `no-restricted-syntax` interdit `?? 0`, `?? 50` etc. sur variables / propriétés contenant `Score`, `Density`, `Volume`, `Difficulty`, `Cpc`, `Competition` (insensible à la casse). Force la gestion explicite de `null` côté consommateurs.
**Statut :** active. **Depuis :** 2026-05-03 (initial), **étendu :** 2026-05-05 (KPIs marché Difficulty/Cpc/Competition). **Source :** `eslint.config.ts:49-79` — tech-spec-stabilisation-codebase + tech-spec-kpi-types-nullable.

#### FR-INFRA-KPI-NULLABLE
**Champs KPI marché nullables de bout en bout.** Les types `KeywordOverview`, `LocationMetrics`, `RadarKeywordKpis`, `ValidatePainResult.dataforseo`, `KeywordAuditResult` exposent les 4 KPIs marché (`searchVolume`, `keywordDifficulty` / `difficulty`, `cpc`, `competition`) en `number | null`. `null` = donnée non disponible (DataForSEO sans signal, miss DB). Aucun adapter (DataForSEO → type interne, DB → type interne) ne substitue une valeur de remplacement (`?? 0`, `?? -1`, `?? "N/A"`). La nullité est propagée **tel quel** jusqu'à l'UI.

**Critères d'acceptation testables :**
- AC1 : `fetchKeywordOverview` mocké avec DataForSEO renvoyant `keyword_info: null` → `result.searchVolume === null` (pas `0`).
- AC2 : `fetchKeywordOverviewBatch` propage `null` sur chaque entry du Map.
- AC3 : `fetchKeywordOverviewForLocation` (intent.service) → `LocationMetrics.keywordDifficulty === null` quand absent.
- AC4 : adapter DB→KPI dans `data.service.ts` : ligne `keyword_metrics` avec `cpc IS NULL` → `kpis[2].rawValue === null` (et non `0`).
- AC5 : type-check : `expectTypeOf<KeywordOverview['searchVolume']>().toEqualTypeOf<number | null>()`.

**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-kpi-types-nullable.

#### FR-INFRA-KPI-DISPLAY-DASH
**Affichage `—` pour KPI absent.** Tout consommateur (composant Vue, template, message log destiné à l'utilisateur) affichant un KPI marché passe par les helpers `formatVolume / formatCpc / formatKd / formatPercent` exportés par `shared/score/format.ts`. Quand le KPI est `null` ou `undefined`, l'UI affiche le placeholder `—` (jamais `0`, `0.00 €`, ou `0 %`). Voir aussi `FR-INFRA-SCORE-MODULE`, `FR-MOT-RAW-KPIS`.

**Critères d'acceptation testables :**
- AC1 : `formatVolume(null) === '—'` ; `formatVolume(1234) === '1.2k'` ; `formatVolume(124) === '124'`.
- AC2 : `formatCpc(null) === '—'` ; `formatCpc(1.234) === '1.23 €'`.
- AC3 : `formatKd(null) === '—'` ; `formatKd(42.7) === '43'`.
- AC4 : `formatPercent(null) === '—'` ; `formatPercent(0.42, { fromRatio: true }) === '42 %'`.
- AC5 : test composant `RadarKeywordCard` rendu avec `card.kpis.cpc = null` → cellule contient `'—'`, pas `'0.00 €'`.
- AC6 : test composant `LocalComparisonStep` rendu avec `local.searchVolume = null` → cellule contient `'—'`, pas `'0'`.

**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-kpi-types-nullable.

#### FR-INFRA-KPI-CONSISTENCY
**Cohérence affichage / tri / agrégat sur KPIs marché** *(application de CLAUDE.md §2.0 — règle de cohérence)*. La même expression / le même helper produit la cellule UI ET la valeur utilisée pour le tri ou un agrégat. Un keyword avec `searchVolume = null` :
1. s'affiche `—` (FR-INFRA-KPI-DISPLAY-DASH),
2. est trié **en bas** d'une liste triée par volume (descending), via `compareScores`,
3. est **exclu** des moyennes / sommes (dénominateur ajusté), via `averageScores`.

Aucun consommateur n'a le droit d'avoir un fallback `?? 0` différent entre l'affichage et le calcul.

**Critères d'acceptation testables :**
- AC1 : tri descending de 3 cards `[vol=100, vol=null, vol=50]` via `compareScores` → ordre final `[100, 50, null]`.
- AC2 : `averageScores([10, null, 30])` retourne `20` (moyenne sur 2 valeurs effectives, pas `13.33`).
- AC3 : pour un dataset `[A: vol=100, B: vol=null, C: vol=50]`, l'ordre rendu par un composant de liste KPI correspond à l'ordre du tri sur `searchVolume` (test cohérence dans `tests/unit/coherence/kpi-nullable.test.ts`).
- AC4 : `countValidScores([10, null, null, 30]) === 2`.

**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-kpi-types-nullable + CLAUDE.md §2.0.

#### FR-INFRA-KPI-SCORING-NULLSAFE
**Scoring null-safe.** Les fonctions de scoring qui consomment des KPIs marché (`computeCompositeScore`, `computeMarketScore`, `computeServerVerdict`, `opportunityIndex`, `generateAlerts`) traitent `null` comme « composante manquante » :
- chaque composante `null` est exclue de la pondération ; les poids restants sont **renormalisés** sur les composantes effectives ;
- si **toutes** les composantes sont `null`, le score `total` retourné est `null` (pas `0`) ;
- le verdict final est `'GRAY'` (neutre) quand aucune composante n'est calculable, jamais `'NO_GO'` ;
- `generateAlerts` émet `missing_metrics` (level `info`) au lieu de `zero_volume` (level `danger`) quand `searchVolume === null`.

**Critères d'acceptation testables :**
- AC1 : `computeCompositeScore({ searchVolume: null, difficulty: 50, cpc: 1, competition: 0.5, monthlySearches: [] })` → `total` calculé sur 3 composantes ; `volume === null` dans le breakdown.
- AC2 : `computeCompositeScore` avec tous KPIs `null` → `total === null`.
- AC3 : `computeServerVerdict({ searchVolume: null, difficulty: null, cpc: null, competition: null, relatedCount: 0 }, ...)` → `'GRAY'` (jamais `'NO_GO'`).
- AC4 : `opportunityIndex` calculé sur `local.searchVolume = null` → retourne `null` (pas `NaN` ou `0`).
- AC5 : `generateAlerts({ searchVolume: null, difficulty: 30, cpc: 1, competition: 0.4, monthlySearches: [] })` → contient `{ type: 'missing_metrics', level: 'info' }` ; ne contient PAS `{ type: 'zero_volume', level: 'danger' }`.

**Statut :** active. **Depuis :** 2026-05-05. **Source :** tech-spec-kpi-types-nullable.

#### FR-INFRA-CHECK-HEALTH
Script `npm run check:health` agrège lint + type-check + cycles + dead-code + arch.
**Statut :** active. **Depuis :** 2026-05-03. **Source :** `package.json:24` — tech-spec-stabilisation-codebase.

#### FR-INFRA-DEPENDENCY-CRUISER
Règles d'architecture dans `.dependency-cruiser.cjs` :
- `no-server-in-src` : pas d'import `server/` depuis `src/` (sauf via `shared/`).
- `score-internal-only-via-index` : imports `shared/score/*` uniquement via `index.ts`.

#### FR-INFRA-RUNTIME-MODE
**Toggle global mock / réel.** Un bouton dans `AppNavbar.vue` (à gauche de l'engrenage) permet à l'utilisateur de basculer toutes les sources externes (AI provider Claude/Gemini/OpenRouter ↔ mock fixtures, DataForSEO production ↔ sandbox) en un clic, sans redémarrer le serveur.

**Architecture** :
- **Front** : store Pinia `useRuntimeModeStore` (`src/stores/ui/runtime-mode.store.ts`) avec persistance `localStorage` (clé `runtime-mode`). Hydratation au boot via `GET /api/runtime-mode`. Toggle via `setMode(mode)` qui POST l'override puis met à jour `localStorage` ; rollback optimiste en cas d'échec réseau.
- **Back** : module `server/services/infra/runtime-mode.service.ts` mémorise un override en RAM (variable `overrideMode: 'mock' | 'real' | null`). Routes `GET/POST /api/runtime-mode`.
- **Consommateurs back** : `getProvider()` (`ai-provider.service.ts:46`) et `isSandbox()` (`dataforseo/_client.ts:39`) consultent l'override **avant** les variables `.env` (`AI_PROVIDER`, `DATAFORSEO_SANDBOX`). Quand l'override est `null`, fallback sur `.env`.

**Cohérence affichage / décision** *(application CLAUDE.md §2.0)* : la même source (`runtimeMode.effective`) pilote le badge UI ET la décision serveur via l'override mémorisé. Aucun fallback divergent. Quand le serveur restart, son override RAM est perdu mais le front détecte le mismatch lors de `hydrate()` et repousse son dernier état localStorage → resynchronisation automatique sans intervention utilisateur.

**Sémantique du switch** :
- `'mock'` → AI provider forcé sur `mock` ; DataForSEO forcé sur sandbox.
- `'real'` → AI provider forcé sur `claude` ; DataForSEO forcé sur production.
- `null` (jamais bascullé) → lecture `.env` standard.

**Persistance** : RAM côté serveur (perdue au restart) + `localStorage` côté front (survit aux reloads). Aucune table DB — décision explicite, le toggle est un état dev/utilisateur-solo, pas une donnée métier.

**Critères d'acceptation testables** :
- AC1 : `setRuntimeMode('mock')` puis `getProvider()` → `'mock'`, `isSandbox()` → `true`, indépendamment de `process.env.AI_PROVIDER` / `process.env.DATAFORSEO_SANDBOX`.
- AC2 : `setRuntimeMode('real')` puis `getProvider()` → `'claude'`, `isSandbox()` → `false`, indépendamment de `.env`.
- AC3 : `setRuntimeMode(null)` puis `getProvider()` lit `.env` (`AI_PROVIDER=gemini` → `'gemini'`).
- AC4 : `getEffectiveMode()` sans override + `AI_PROVIDER=mock` → `'mock'` ; sans override + `DATAFORSEO_SANDBOX=true` → `'mock'` ; sans override + ni l'un ni l'autre → `'real'`.
- AC5 : `POST /api/runtime-mode` avec body `{ mode: 'invalid' }` → 400 (validation Zod `enum(['mock','real']).nullable()`).
- AC6 : store front `setMode('mock')` qui échoue côté serveur → l'état revient à la valeur précédente (rollback optimiste) et `localStorage` est restauré.
- AC7 : store front `hydrate()` quand `localStorage='real'` et serveur retourne `override=null` (cas restart serveur) → le store re-POST `'real'` pour resynchroniser.
- AC8 : navbar — clic sur le bouton toggle inverse `effective` (`'mock'` ↔ `'real'`) et déclenche un POST.

**Statut :** active. **Depuis :** 2026-05-08. **Source :** `server/services/infra/runtime-mode.service.ts`, `server/routes/runtime-mode.routes.ts`, `src/stores/ui/runtime-mode.store.ts`, `src/components/shared/AppNavbar.vue`.

#### FR-INFRA-SCRAPE-CORPUS-NEUTRE
**Service de scraping HTTP neutre** *(ajout 2026-05-09, roadmap optimisation Lexique — proposed)*. Un service `scrape-corpus.service.ts` (à créer dans `server/services/external/`) fait le scraping HTTP des 10 URLs Google d'un keyword + extrait `headings[]` + `text_content` + `is_blog`. Il **ne sait rien** de Lieutenants ni de Lexique : c'est un service pur, sans logique métier d'onglet.

**Responsabilités** :
1. Lire les URLs cibles depuis `keyword_serp_results` (alimenté en amont par DataForSEO `fetchSerp`).
2. Pour chaque URL : `fetchPageHtml` (timeout 10s, User-Agent custom).
3. Pour chaque HTML : `extractHeadings`, `extractTextContent`, `classifyIsBlog`.
4. Persister dans `keyword_serp_scrapes` (`url, headings JSONB, text_content TEXT, is_blog BOOLEAN, scraped_at`).
5. Cache court mémoire (1h) pour éviter le double scrape pendant une session.

**Décomposition de l'existant** : remplace progressivement `analyzeSerpCompetitors` ([server/services/external/serp-analysis.service.ts:160](server/services/external/serp-analysis.service.ts#L160)) qui faisait à la fois SERP + scraping + extraction (couplage à casser).

**Cache mémoire — invariants** :
- TTL : `MEMORY_CACHE_TTL_MS = 60 * 60 * 1000` ms (1h), exposé en constante du module.
- Capacité bornée : `MEMORY_CACHE_MAX_ENTRIES = 100` entrées max ; au-delà, **eviction LRU** (entrée la moins récemment accédée). Évite la fuite mémoire en prod.
- Clé de cache : `${keyword.toLowerCase()}:${lang}:${country}`.
- Helper de test exporté : `__resetMemoryCacheForTests()` pour isoler les runs (sprint-plan §G5/G7).

**Critères d'acceptation testables** :
- AC.SCRAPE.1 : `scrape-corpus.service` n'importe ni `tfidf.service` ni un fichier Lieutenants ni un fichier Lexique (test grep architectural).
- AC.SCRAPE.2 : Appel sur un keyword dont les URLs sont déjà en cache mémoire (< 1h) → 0 nouveau fetch HTTP (mock count).
- AC.SCRAPE.3 : Appel sur un keyword vierge → 10 fetchs HTTP en parallèle, persistance dans `keyword_serp_scrapes`.
- AC.SCRAPE.4 : Si une URL répond 404/timeout → la ligne `keyword_serp_scrapes` est créée avec `headings = []` et `text_content = null` (la table n'a pas de colonne `fetch_error` ; l'erreur est loggée côté serveur). Les 9 autres scrapes réussissent et la transaction commit normalement.
- AC.SCRAPE.5 : Le service expose deux fonctions distinctes : `getHeadings(keyword)` (lecture optimisée pour Lieutenants — SELECT scopé sur `headings`/`is_blog`/`domain`) et `getTextContent(keyword)` (lecture optimisée pour Lexique — SELECT scopé sur `text_content`). Pas de blob monolithique retourné.
- AC.SCRAPE.6 : Le retour de `fetchAndPersist` expose `fromCache: 'memory' | 'db' | null` — `'memory'` si hit cache mémoire, `'db'` si hit DB freshness 7j (cache mémoire vide), `null` si fetch externe effectué. Cette tri-state est testée explicitement.
- AC.SCRAPE.7 : Eviction LRU vérifiée : insérer `MEMORY_CACHE_MAX_ENTRIES + 1` keywords distincts → la 1ère entrée est éjectée (re-fetch externe au prochain accès).

**Statut :** **active** *(implémenté 2026-05-09 — Story A1+A2+C1+C3 chantier 2)*. **Depuis :** 2026-05-09. **Source :** tech-spec-decouplage-lieutenants-lexique. **Précisions ACs ajoutées 2026-05-09 (audit en Story A1).**
**Voir aussi :** NFR-MOT-LEXIQUE-DECOUPLAGE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, FR-LEX-SCRAPE-DEDIE, FR-LIE-SCRAPE-DEDIE.

#### FR-INFRA-LOGGER
Logger central `server/utils/logger.ts` avec niveaux DEBUG / INFO / WARN / ERROR. Configurable via `logs.config.ts`.

#### FR-INFRA-ERROR-HANDLER
Middleware central `server/utils/error-handler.ts:6-56`.

#### FR-INFRA-HEALTH-CHECK
Endpoint `GET /api/health` → `{ status: 'ok' }`.
**Source :** `server/index.ts:53-56`.

#### FR-INFRA-DB-CONNECTION-CHECK
Vérification connexion PostgreSQL au startup (`server/index.ts:94-113`).

#### FR-INFRA-COST-LOG-STORE
Store front `useCostLogStore` accumule activity log entries (API usage + DB ops + messages) injectées par `apiGet/apiPost/...`.

#### FR-INFRA-PAA-EXPLORATIONS
**Table `paa_explorations`** — persistance article-scoped des questions PAA (People Also Ask) testées contre un contexte d'article. Schéma : `(id SERIAL PK, article_id INTEGER FK articles, keyword TEXT, question TEXT, answer TEXT, is_match BOOLEAN, match_quality TEXT, explored_at TIMESTAMPTZ, UNIQUE(article_id, keyword, question))`. Distinct du cache `external_api_cache.cache_type='paa'` (TTL court, cross-article) : ici, persistance permanente article-scoped des résultats annotés (match / no-match).

**Producteurs :** `saveCaptainExploration()` dans `server/services/infra/data.service.ts:708` (UPSERT lors d'une exploration Capitaine).
**Consommateurs :** `getCaptainExplorations()` dans `data.service.ts:599` (lecture full au mount onglet Capitaine), endpoint counts `GET /api/articles/:id/explorations/counts` dans `article-explorations.routes.ts:128` (consommé par `TabCachePanel.vue` — voir `FR-EXP-COUNTS`).
**Statut :** active. **Source :** `server/db/migrations/004_exploration_tables.sql:43`.

#### FR-INFRA-INTENT-EXPLORATIONS-LEGACY
**Table `intent_explorations`** — table définie en migration 007 mais **jamais consommée en runtime** depuis l'unification autour de `keyword_metrics` + `keyword_intent_analyses` (migration 010). **Vérification DB live (2026-05-05) : la relation n'existe pas dans la base** (`SELECT * FROM intent_explorations` → `ERROR: relation does not exist`). Soit la migration 007 a échoué partiellement, soit la table a été drop manuellement sans migration tracée.

**Producteurs :** aucun.
**Consommateurs :** aucun.
**Statut :** **dette de migration**. La table n'existe pas en DB mais le `CREATE TABLE` reste dans la migration 007 (replay sur une DB vierge la recréerait orpheline). **Action recommandée :**
1. Créer `server/db/migrations/016_drop_intent_explorations.sql` avec `DROP TABLE IF EXISTS intent_explorations CASCADE;` (idempotent — sera no-op sur les DB où elle est déjà absente, drop sur celles où elle existe encore).
2. Retirer le commentaire trompeur de `server/services/queries/keyword-queries.service.ts:5` qui dit « supprimée » alors qu'aucun `DROP` n'avait été émis.
**Source :** `server/db/migrations/007_keyword_explorations.sql:9`.

#### FR-INFRA-KEYWORDS-SEO
**Table `keywords_seo`** — référentiel des mots-clés SEO d'un cocon (cocoon-scoped, pas article-scoped). Schéma : `(id SERIAL PK, cocoon_name TEXT, mot_clef TEXT NOT NULL, type_mot_clef TEXT, statut TEXT DEFAULT 'suggested', created_at TIMESTAMPTZ)`. Distinct de `article_keywords` (capitaine + lieutenants + lexique sélectionnés pour **un** article) : `keywords_seo` est le pool **du cocon** dans lequel le Capitaine pioche.

**Producteurs :** `addKeyword()`, `replaceKeyword()`, `updateKeywordStatus()`, `deleteKeyword()` dans `server/services/infra/data.service.ts:450-483`.
**Consommateurs :** `getKeywordsByCocoon()`, `loadKeywordsDb()` dans `data.service.ts:420-438`, exposés par `server/routes/keywords.routes.ts:22-82` (endpoints `GET /api/keywords/cocoon/:name`, `GET /api/keywords`). Consommés en front par les stores Cerveau / Capitaine pour proposer les keywords du cocon.
**Statut :** active. **Source :** `server/db/migrations/001_initial_schema.sql:84-90`.

#### FR-INFRA-LOCAL-ENTITIES
**Table `local_entities`** — référentiel **statique** d'entités locales (régions, villes, alias géographiques) seedé par migration. Schéma : `(id SERIAL PK, name TEXT NOT NULL, type TEXT, aliases TEXT[], region TEXT)`. Référentiel cross-cocon utilisé par le scoring "ancrage local" du Capitaine.

**Producteurs :** seed migration uniquement (`_archive/scripts/seed-migration-json-to-pg-2026-04.ts`). Pas de write runtime.
**Consommateurs :** `getEntities()` + `scoreLocalAnchoring()` dans `server/services/infra/local-entities.service.ts:13`, exposés par `server/routes/local.routes.ts`. Consommés par le pipeline de validation Capitaine (scoring d'ancrage local) et `ContentGapPanel.vue` (affichage des entités du cocon dans le brief).
**À ne pas confondre avec :** `localEntitiesFromCompetitors` (champ JSONB stocké dans `keyword_metrics.local_comparison`) — celles-ci sont **scrapées dynamiquement** des SERPs concurrentes, pas le même référentiel.
**Statut :** active. **Source :** `server/db/migrations/001_initial_schema.sql:165-171`.

#### FR-INFRA-LIEUTENANT-EXPLORATIONS
**Table `lieutenant_explorations`** (renommée depuis `lieutenant_proposals` en migration 010 §3) — persistance article-scoped des propositions Lieutenants (générées IA + manuelles). Schéma : `(article_id, keyword, status, captain_keyword, reasoning, sources, suggested_hn_level, score, kpis, locked_at, explored_at, UNIQUE(article_id, keyword))`.

**Producteurs :** `saveLieutenantExplorations()` dans `server/services/infra/data.service.ts:774` (UPSERT batch), update sélection dans `data.service.ts:803`.
**Consommateurs :** `getLieutenantExplorations()` dans `data.service.ts:749` (lecture triée par score desc), endpoint counts `article-explorations.routes.ts:127`, scoring contextuel dans `keyword-queries.service.ts:125`.
**Voir aussi :** `FR-LIE-PROPOSE`, `FR-LIE-SELECT`, `FR-LIE-PERSIST`.
**Statut :** active. **Source :** `server/db/migrations/003_keyword_tables.sql` + rename migration 010.

#### FR-INFRA-KEYWORD-DISCOVERIES
**Table `keyword_discoveries`** — cache DB-first des scans Discovery (Phase ① Explorer du Moteur), TTL applicatif **30 jours**. Schéma : `(seed TEXT, lang TEXT, sources_json JSONB, ai_analysis_json JSONB, fetched_at TIMESTAMPTZ, PK(seed, lang))`. Distinct de `external_api_cache` (TTL DataForSEO court 24-48h) : ce cache **métier** persiste l'arbre de découverte complet (sources + analyse IA) pour permettre la reprise sans re-coût.

**Producteurs :** `cacheDiscoverySources()` (sources only), `cacheDiscoveryAiAnalysis()` (enrichissement IA), `clearDiscoveryCache()` dans `server/services/keyword/keyword-discovery-db.service.ts:57-90`.
**Consommateurs :** `getDiscoveryCache(seed, lang)` dans `keyword-discovery-db.service.ts:44`. Front : `useKeywordDiscoveryStore` lit via `GET /api/keywords/discovery/cache/:seed`, déclenche le badge **« Dernière analyse du DD/MM/YYYY · N mots-clés »** dans `KeywordDiscoveryTab.vue` + boutons **Charger** / **Rafraîchir**.
**Voir aussi :** `FR-DIS-CACHE` (capacité utilisateur), `FR-INFRA-API-CACHE` (cache court externe).
**Statut :** active. **Depuis :** Sprint 15.6. **Source :** `server/db/migrations/010_cross_article_tables.sql` + `server/services/keyword/keyword-discovery-db.service.ts`.

#### FR-INFRA-ARTICLE-STRATEGIES
**Table `article_strategies`** — persiste la stratégie Cerveau d'un article (5-step wizard : aiguillage, pain point, intent, etc.) + l'avancement des steps complétés. Schéma : `(article_id PK, data JSONB, completed_steps TEXT[], updated_at TIMESTAMPTZ)`. Distinct de `articles.completed_checks` (workflow Moteur) : ici, c'est l'avancement **interne** du wizard Cerveau.

**Producteurs / Consommateurs :** `getArticleStrategy()`, `saveArticleStrategy()` dans `server/services/strategy/strategy.service.ts:23-45`. Exposés via `server/routes/strategy.routes.ts`. Consommé en front par `useArticleStrategyStore` (hydratation au mount du Cerveau).
**Voir aussi :** `FR-CER-STEPS-ARTICLE`, `FR-CER-CONTEXT-FOR-MOTEUR`.
**Statut :** active. **Source :** `server/db/migrations/001_initial_schema.sql`.

#### FR-INFRA-COCOON-STRATEGIES
**Table `cocoon_strategies`** — persiste la stratégie cocon-level (positionnement, audience, ton de voix, painPoints racines) générée par l'IA Cerveau pour un cocon entier. Schéma : `(cocoon_id PK FK cocoons, data JSONB, generated_at TIMESTAMPTZ)`. Cross-articles du même cocon, sert de **contexte parent** pour `article_strategies`.

**Producteurs / Consommateurs :** `getCocoonStrategy()`, `saveCocoonStrategy()` dans `server/services/strategy/cocoon-strategy.service.ts:52-81`. Lecture additionnelle dans `keyword-queries.service.ts:321` (injecté dans les prompts IA via `buildCocoonStrategyBlock`).
**Voir aussi :** `FR-CER-STEPS-COCOON`, `NFR-INT-PROMPT-AGNOSTIC`.
**Statut :** active. **Source :** `server/db/migrations/010_cross_article_tables.sql`.

#### FR-INFRA-MICRO-CONTEXTS
**Table `article_micro_contexts`** — persistance des micro-contextes article (angle, tone, directives, target word count) injectés dans les prompts IA Rédaction. Schéma : `(article_id PK FK articles, angle TEXT, tone TEXT, directives TEXT, target_word_count INTEGER)`.

**Producteurs / Consommateurs :** lecture dans `server/services/infra/data.service.ts:845`, écriture (UPSERT) dans `data.service.ts:864`. Exposés via `server/routes/articles.routes.ts:189-240`.
**Voir aussi :** `FR-CER-MICRO-CONTEXT`, `FR-CER-WORD-COUNT-RECOMMEND`, `NFR-INT-PROMPT-AGNOSTIC` (le micro-contexte est injecté via `buildMicroContextBlock` dans `loadPrompt`).
**Statut :** active. **Source :** `server/db/migrations/001_initial_schema.sql`.

---

### 8.14.bis — Matrice de couverture tables ↔ FR

> **Pourquoi cette matrice ?**
> Les FR métier (§8.1 → §8.13) décrivent **ce que fait** chaque workflow ; les FR-INFRA (§8.14) décrivent **comment** la persistance est structurée. Il manquait une **vue inverse** : pour une table donnée, quelles FR la produisent / consomment ? Cette matrice répond à 3 questions opérationnelles : (1) si je modifie le schéma d'une table, quelles FR dois-je relire ? (2) si une FR change, quelles tables sont touchées ? (3) y a-t-il des tables sans FR (zone aveugle) ?
>
> **Règle de maintenance :** toute migration créant ou modifiant une table doit ajouter / mettre à jour une ligne dans cette matrice. Un script d'audit `scripts/audit-prd-tables-coverage.ts` (à créer) peut comparer la liste des `CREATE TABLE` actives vs cette matrice et signaler les tables non documentées.
>
> **Convention :** la colonne **AUTHORITY** indique la FR-INFRA qui définit la table (schéma + producteurs + consommateurs). Les colonnes **Producteurs FR** / **Consommateurs FR** listent les FR métier qui écrivent / lisent.

| Table                       | AUTHORITY (FR-INFRA)                  | Producteurs FR (métier)                                | Consommateurs FR (métier)                                              | Notes                                                                 |
| --------------------------- | ------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `articles`                  | (schéma initial — pas de FR-INFRA)    | FR-CER-BATCH-CREATE, FR-CER-STEPS-ARTICLE              | FR-DASH-NAV, FR-MOT-PHASES, FR-FIN-*, FR-RED-*                         | Cœur du domaine. 35 mentions PRD.                                     |
| `article_content`           | (schéma initial)                      | FR-RED-EDITOR-PERSIST                                  | FR-RED-EDITOR-LOAD, FR-RED-EXPORT-*                                    | TipTap doc + meta-tags.                                               |
| `article_keywords`          | (schéma initial)                      | FR-CAP-PERSIST, FR-LIE-PERSIST, FR-LEX-PERSIST         | FR-MOT-PHASES, FR-RED-PROMPT-CONTEXT, FR-FIN-RECAP                     | JSONB `lexique`, `hn_structure`, `validation_history`.                |
| `article_micro_contexts`    | **FR-INFRA-MICRO-CONTEXTS**           | FR-CER-MICRO-CONTEXT, FR-CER-WORD-COUNT-RECOMMEND      | NFR-INT-PROMPT-AGNOSTIC (via `buildMicroContextBlock`)                 | 1:1 avec articles.                                                    |
| `article_strategies`        | **FR-INFRA-ARTICLE-STRATEGIES**       | FR-CER-STEPS-ARTICLE                                   | FR-CER-CONTEXT-FOR-MOTEUR, prompts IA Rédaction                        | Wizard Cerveau article-scoped.                                        |
| `articles.completed_checks` | **FR-INFRA-WORKFLOW-CHECKS-CONSTANTS**| FR-MOT-PHASES (toutes émissions `MOTEUR_*`)            | FR-MOT-SOFT-GATING, FR-FIN-RECAP, `useFinalisationGating`              | TEXT[] sur `articles`. SSOT (`NFR-INT-COMPLETED-CHECKS-SSOT`).        |
| `external_api_cache`                 | **FR-INFRA-API-CACHE**                | FR-EXT-DATAFORSEO-CACHE, FR-EXT-PAA-CACHE              | Toutes FR-EXT (lecture before fetch)                                   | TTL court multi-types. Purge horaire (`FR-INFRA-API-CACHE-PURGE`).    |
| `captain_explorations`      | (FR-CAP-PERSIST décrit la table)      | FR-CAP-PERSIST, FR-RAD-LONGTAIL-PERSIST (via source)   | FR-CAP-LOCK, FR-CAP-CARDS, FR-EXP-COUNTS                               | Renommée depuis `keyword_tests` en migration 010.                     |
| `cocoons`                   | (schéma initial)                      | FR-CER-STEPS-COCOON, FR-DASH-WORKFLOW-CHOICE           | FR-DASH-NAV, FR-CER-AIGUILLAGE                                         |                                                                       |
| `cocoon_strategies`         | **FR-INFRA-COCOON-STRATEGIES**        | FR-CER-STEPS-COCOON                                    | FR-CER-CONTEXT-FOR-MOTEUR, prompts IA (via `buildCocoonStrategyBlock`) | Cross-articles du même cocon.                                         |
| `intent_explorations`       | **FR-INFRA-INTENT-EXPLORATIONS-LEGACY** | aucun (legacy)                                       | aucun (legacy)                                                         | **N'existe pas en DB live** mais `CREATE TABLE` reste dans migration 007 — créer migration `DROP IF EXISTS` idempotente. |
| `internal_links`            | (FR-RED-INTERNAL-LINKS décrit)        | FR-RED-INTERNAL-LINKS                                  | FR-RED-INTERNAL-LINKS, prompts maillage                                |                                                                       |
| `keyword_discoveries`       | **FR-INFRA-KEYWORD-DISCOVERIES**      | FR-DIS-CACHE                                           | FR-DIS-CACHE, FR-DIS-LOAD                                              | TTL applicatif 30j (différent `external_api_cache`).                           |
| `keyword_intent_analyses`   | (FR-MOT-INTENT-ANALYSIS décrit)       | FR-MOT-INTENT-ANALYSIS                                 | FR-CAP-CARDS, FR-RAD-CARDS                                             | Cross-article permanent.                                              |
| `keyword_metrics`           | **FR-INFRA-KEYWORD-METRICS**          | FR-EXT-DATAFORSEO-CACHE, FR-MOT-RAW-KPIS               | Toutes FR Capitaine / Radar / Lieutenants (kpis)                       | Cross-article permanent. Freshness 7j.                                |
| `keywords_seo`              | **FR-INFRA-KEYWORDS-SEO**             | FR-CER-AIGUILLAGE, FR-CER-BATCH-CREATE                 | FR-CAP-CARDS, FR-MOT-PHASES                                            | Cocoon-scoped. Pool dans lequel le Capitaine pioche.                  |
| `lexique_explorations`      | (FR-LEX-EXPLORATION décrit)           | FR-LEX-EXPLORATION                                     | FR-LEX-RECOMMEND, FR-EXP-COUNTS                                        |                                                                       |
| `lieutenant_explorations`   | **FR-INFRA-LIEUTENANT-EXPLORATIONS**  | FR-LIE-PROPOSE, FR-LIE-PERSIST                         | FR-LIE-SELECT, FR-EXP-COUNTS                                           | Renommée depuis `lieutenant_proposals` en migration 010.              |
| `local_entities`            | **FR-INFRA-LOCAL-ENTITIES**           | seed migration uniquement                              | FR-CAP-LOCAL-ANCHORING, FR-RED-CONTENT-GAP                             | Référentiel statique cross-cocon.                                     |
| `paa_explorations`          | **FR-INFRA-PAA-EXPLORATIONS**         | FR-CAP-PERSIST (PAA testées)                           | FR-CAP-CARDS, FR-EXP-COUNTS                                            | Distinct de `external_api_cache.cache_type='paa'`.                             |
| `radar_explorations`        | (FR-RAD-PERSIST décrit)               | FR-RAD-PERSIST, FR-RAD-LONGTAIL-PERSIST                | FR-RAD-CARDS, FR-CAP-PERSIST (via source), FR-EXP-COUNTS               | Article-scoped, JSONB `scan_result`.                                  |
| `silos`                     | (schéma initial)                      | FR-DASH-NAV (CRUD admin)                               | FR-DASH-NAV                                                            | Conteneur de cocoons.                                                 |
| `theme_config`              | (FR-CER-THEME-CONFIG décrit)          | FR-CER-THEME-CONFIG                                    | NFR-INT-PROMPT-AGNOSTIC (via `buildThemeContextBlock`)                 | Singleton (`id=1`).                                                   |

> **Lecture de la matrice :**
> - Une cellule **Producteurs / Consommateurs FR** vide signifie que la table est lue/écrite uniquement via une FR-INFRA (pas de FR métier identifiée). C'est attendu pour les tables d'infra (cache, telemetry).
> - Une ligne avec `AUTHORITY = (schéma initial)` est une table fondatrice livrée en migration 001 sans FR-INFRA dédiée — son schéma est documenté implicitement par les FR métier qui la consomment. **Candidate à recevoir une FR-INFRA si elle évolue significativement** (ex: `articles` aurait pu mériter `FR-INFRA-ARTICLES` mais sa centralité est telle que toutes les FR §8.* la touchent).
> - Si une nouvelle table est créée sans ligne dans cette matrice → **violation de discipline data-flow** (CLAUDE.md §3.2).

---

### 8.15 — Composants UI partagés (FR-UI)

> **Pourquoi cette section ?**
> Les §8.4 → §8.10 documentent les FR **par onglet / par workflow** (Discovery, Radar, Capitaine, Lieutenants, Rédaction…). Or certains composants UI sont **partagés cross-onglets** (ex : `RadarKeywordCard` consommé par Radar **et** Capitaine, panels IA répliquant un même pattern visuel/comportemental sur 6 onglets, sous-composants article partagés Workflow/Editor). Quand un refactor touche un de ces composants partagés, les FR métier dispersées ne suffisent pas pour valider la non-régression : il faut une vue **"composant macro" → invariants partagés**.
>
> **Règle :** ces FR-UI **ne dupliquent pas** les FR métier — elles **référencent** les FR-DIS / FR-RAD / FR-CAP / FR-LIE / FR-LEX / FR-RED / FR-CER / FR-MOT existantes via "voir aussi". Elles formalisent uniquement l'invariant **partagé** (forme + comportement transverse) que les FR métier individuelles ne capturent pas.

#### FR-UI-RADAR-CARD
**Composant :** `src/components/intent/RadarKeywordCard.vue` (master) + `RadarCardScoreRing.vue` + `RadarCardPaaTree.vue` (sous-composants V2) + wrappers `RadarCardCheckable.vue` / `RadarCardLockable.vue`.

**Contextes consommateurs (3) :**
1. **Onglet Radar (mode KPI)** — `RadarCardCheckable` dans `KeywordRadarTab` → tri par volume/CPC/intention, sélection multi-card.
2. **Onglet Capitaine (mode Pertinence)** — `RadarCardLockable` dans `CaptainRadarList` → score sémantique + side-panel détails.
3. **Onglet Labo (mode libre)** — `RadarKeywordCard` direct dans `LaboView` → affichage diagnostique sans workflow.

**Invariants partagés (cross-contextes) :**
- **Bimodalité `displayMode: 'kpi' | 'relevance'`** — la prop pilote l'affichage du score (chiffre KPI vs ring SVG Pertinence) sans dupliquer le composant. Voir aussi `FR-RAD-SCORING-BIMODAL`.
- **Score ring SVG + tooltip contextuel 4 messages** (mode Pertinence) : voir aussi `FR-RAD-SCORE-RING-TOOLTIP`.
- **Arbre PAA récursif parent → children** (mode Pertinence) : voir aussi `FR-RAD-PAA-TREE`.
- **Wrappers Checkable / Lockable** : ajoutent uniquement le mécanisme d'état (sélection workflow vs verrouillage) sans toucher le rendu de la carte.

**Invariant architectural :** toute modification visuelle ou comportementale de la carte radar doit préserver les 3 contextes consommateurs. Une régression sur un seul contexte = échec, même si les 2 autres passent.

#### FR-UI-AI-PANELS-PATTERN
**Infrastructure factorisée :** `src/components/moteur/ai-panel/` (`AiPanel.vue`, `AiPanelHeader.vue`, `AiPanelSkeleton.vue`, `AiSuggestionList.vue`, `AiAdviceMarkdown.vue`, `AiTriggerButton.vue`).

**Panels consommateurs (6) :**
| Panel | Onglet | Variant | FR métier |
|---|---|---|---|
| `DiscoveryAiPanel` | Discovery | `suggestion` | FR-DIS-AI-WORDS |
| `RadarAiPanel` | Radar | `suggestion` | FR-RAD-AI-LONGTAIL |
| `CaptainAiPanel` (intégré `CaptainSidePanel`) | Capitaine | `advice` | FR-CAP-AI-VALIDATION |
| `LexiqueAiPanel` | Lexique | `suggestion` | FR-LEX-AI-MULTIKW |
| `LieutenantsAiPanel` | Lieutenants | `advice` | FR-LIE-AI-PROPOSALS, FR-LIE-AI-FRONTIER |
| `ArticleWorkflowIaBrief` (Rédaction Workflow) | Rédaction | `advice` | FR-RED-IA-BRIEF |

**Pattern partagé (props `AiPanel`) :**
- `variant: 'suggestion' | 'advice'` — pilote rendu (liste ajoutables vs markdown narratif).
- `state: AiPanelState` — état SSE streaming (`idle | loading | streaming | done | error`).
- `error`, `isStale`, `ctaLabel`, `regenLabel`, `hideUntilTriggered`, `regenConfirmMessage` — props optionnelles partagées.
- **SSE streaming + parse `marked.js` incrémental** pour le markdown advice.
- **Bouton régénération** avec confirmation optionnelle.
- **État empty** factorisé (`AiPanelSkeleton`).

**Invariant architectural :** toute évolution du pattern AI (nouveau state, nouvelle prop, nouveau comportement de stream) se fait dans `src/components/moteur/ai-panel/` — **jamais en dupliquant** dans un panel consommateur. Les 6 panels consommateurs sont des **enveloppes minces** (fetch + state local) au-dessus d'`AiPanel`.

#### FR-UI-ARTICLE-SHARED
**Sous-composants partagés Workflow/Editor (V4 + V5 du chantier décou­page monstres Vue) :**

| Composant | Rôle | Consommateurs | FR métier |
|---|---|---|---|
| `ArticlePanelsToolbar.vue` | Toggles SEO/GEO/Maillage/Blocs (`role="toolbar"`, `aria-pressed`) | `ArticleEditorView`, `ArticleWorkflowView` | FR-RED-PANELS-TOOLBAR |
| `ArticlePanelsResizable.vue` | Container resizable wrapper SeoPanel/GeoPanel/LinkSuggestions | `ArticleEditorView`, `ArticleWorkflowView` | FR-RED-PANELS-RESIZABLE |
| `SectionProgressBar.vue` (atomique) | Barre progression % par section/global | `ArticleWorkflowView`, `ArticleEditorView` | FR-RED-PROGRESS-BAR |
| `ArticleCostBadges.vue` | Badges coût IA (tokens + €) | `ArticleEditorView`, `ArticleWorkflowView` | FR-RED-COST-BADGES |
| `ArticleWordCountBar.vue` | Compteur mots + cible | `ArticleEditorView` | FR-RED-WORDCOUNT |
| `ArticleEditorActionOverlays.vue` | Overlays erreurs actions (tokens `--color-error*`) | `ArticleEditorView` | FR-RED-ACTION-OVERLAYS |

**Composable partagé :** `useArticleGeneration` (V3) — orchestre génération article (SSE stream + persistance + cost log) appelé par `ArticleEditorView` ET `ArticleWorkflowView` (mode workflow).

**Invariant architectural :** la frontière `ArticleEditorView` ↔ `ArticleWorkflowView` ne doit pas dériver — toute fonctionnalité éditeur partagée passe par un sous-composant ou un composable de cette liste, jamais par duplication. Les tokens couleur (`--color-error*`, `--color-bg-elevated`, etc.) sont vérifiés par les tests `tests/unit/components/ux-audit-sprint2.test.ts`.

#### FR-UI-MOTEUR-SHARED
**Briques partagées Moteur (cross-onglets ②/③/④) :**

| Composant | Rôle | Onglets consommateurs | FR métier |
|---|---|---|---|
| `CollapsableSection` (atomique global) | Section pliable header/body | Discovery, Radar, Capitaine, Lieutenants, Lexique | (transversal) |
| `TabCachePanel.vue` | Panel cache (counts DB explorations + bouton vider) | Discovery, Radar | FR-DIS-CACHE-PANEL, FR-MOT-CACHE-CLEAR |
| `TabLoadPrompt.vue` | Prompt "charger données existantes" | Discovery, Radar, Capitaine | FR-MOT-LOAD-PROMPT |
| `BasketStrip.vue` | Strip mots-clés sélectionnés (cross-onglet) | Discovery, Radar | FR-DIS-BASKET, FR-RAD-BASKET |
| `KeywordAssistPanel.vue` | Panel assistance contextuelle (actions globales) | Discovery, Radar, Capitaine | FR-MOT-ASSIST-PANEL |
| `MoteurContextRecap.vue` | Recap contexte stratégie (cocoon + capitaine) | tous onglets Moteur | FR-MOT-CONTEXT-RECAP |
| `PhaseTransitionBanner.vue` | Bannière transition Phase ② → ③ | Capitaine, Lieutenants | FR-MOT-PHASE-TRANSITION |
| `ProgressDots.vue` | Indicateur progression onglets | MoteurView (header) | FR-MOT-PROGRESS-DOTS |

**Invariant architectural :** ces briques sont **partagées** entre les onglets Moteur — toute modification doit être validée sur tous les onglets consommateurs. Les FR métier (FR-DIS-*, FR-RAD-*, FR-CAP-*, FR-MOT-*) capturent les comportements individuels ; cette FR-UI-MOTEUR-SHARED capture le **fait que la brique est partagée** et que sa cohérence cross-onglets est un invariant en soi.

---

## 9. Non-Functional Requirements

### 9.1 — Performance (NFR-PERF)

#### NFR-PERF-API-LOCAL
Réponses API locales (hors appels externes) en < 200ms.
**Statut :** prescrit, non monitoré (pas de middleware timing).

#### NFR-PERF-SSE-FIRST-TOKEN
Streaming SSE Claude : premier token en < 2s.
**Statut :** prescrit, non monitoré.

#### NFR-PERF-VIEW-LOAD
Chargement d'une vue (changement de route lazy) en < 500ms.
**Statut :** prescrit, non monitoré.

#### NFR-PERF-CACHE-HIT-RATE
Cache hit rate DataForSEO > 90 % après première utilisation d'un mot-clé (grâce à `keyword_metrics`).
**Statut :** prescrit, non monitoré (instrumentation à ajouter dans `cache-helpers.ts`).

#### NFR-PERF-PURGE-HOURLY
Job purge `external_api_cache` actif toutes les heures.
**Statut :** active, implémenté (`server/index.ts:115-125`).

#### NFR-PERF-SEO-DEBOUNCE
Scoring SEO live debounce 300ms + `requestIdleCallback` (non-bloquant).
**Statut :** active, implémenté (`useSeoScoring.ts:9, 51-76`).

#### NFR-PERF-INTER-SECTION-DELAY
Inter-section delay configurable lors de la génération article (défaut 15s) pour respecter le rate-limit Claude.
**Statut :** active.

---

### 9.2 — Coût et optimisation (NFR-COST)

#### NFR-COST-CACHE-FIRST
Aucun appel API externe si résultat valide en `keyword_metrics` puis `external_api_cache` puis `paa_cache`.
**Statut :** active.

#### NFR-COST-POSTGRESQL
Persistance PostgreSQL — survit au redémarrage. Pas de fichier JSON pour données chaudes.
**Statut :** active.

#### NFR-COST-BODY-LIMIT
Taille max body JSON : 5MB (`express.json({ limit: '5mb' })`).
**Statut :** active (`server/index.ts:36`).

#### NFR-COST-DATAFORSEO-BUDGET
Budget par défaut $0.50 / 30 min sur DataForSEO (sliding window).
**Statut :** active, configurable via `.env` (`DATAFORSEO_COST_BUDGET`, `DATAFORSEO_COST_WINDOW_MINUTES`).

#### NFR-COST-DATAFORSEO-RESERVE
Réservation pré-call dans la fenêtre glissante. Throw `CostBudgetError` si la réservation dépasserait le budget.
**Statut :** active.

#### NFR-COST-AI-MOCK
Mode `AI_PROVIDER=mock` pour développement sans consommer de crédits.
**Statut :** active.

---

### 9.3 — Intégration et contrats (NFR-INT)

#### NFR-INT-MOTEUR-BIMODAL
Composants Moteur passent par prop `mode: 'workflow' | 'libre'` — pas de duplication entre Moteur et Labo.

#### NFR-INT-COMPLETED-CHECKS-SSOT
`articles.completed_checks` TEXT[] = source unique de vérité pour la progression.

#### NFR-INT-CHECKS-NAMESPACE
Tous les checks préfixés par workflow : `moteur:*`, `cerveau:*`, `redaction:*`. Stockés dans une seule colonne flat.

#### NFR-INT-SERP-ONCE
Scraping SERP UNE fois (Lieutenants) → cascade vers Lexique (TF-IDF sur contenus hérités) — zéro doublon.

#### NFR-INT-SCORING-CONFIGURABLE
Seuils de scoring configurables dans `shared/kpi-scoring.ts` / `shared/scoring.ts` / `shared/score/`. Visibles au survol (tooltip).

#### NFR-INT-PROMPT-AGNOSTIC
Prompts IA dans `server/prompts/*.md` agnostiques du contexte — enrichissement uniquement par `loadPrompt()` avec variables `{{...}}`.

#### NFR-INT-STRATEGY-OPTIONAL
Enrichissement prompts optionnel : sans stratégie, `{{strategy_context}}` = chaîne vide. Sans painPoint, `{{painPoint}}` = `(non défini)`.

#### NFR-INT-ZOD-VALIDATION
Validation Zod sur toutes les routes via `safeParse`. ~41 schemas partagés dans `shared/schemas/`.

#### NFR-INT-API-WRAPPER
Composants Vue, stores et composables côté `src/` passent par `apiGet/apiPost/apiPut/apiPatch/apiDelete/apiStream` — jamais de `fetch` direct.
**Critère d'acceptation mesurable :** `python .claude/skills/data-flow-discipline/scripts/audit_data_flow.py` retourne 0 violation dans la catégorie « fetch() directs hors wrapper » côté `src/`.
**Statut :** active — dette résorbée. **Depuis :** 2026-05-05 (chantier `tech-spec-fetch-to-wrapper-migration`).

#### NFR-OBS-EXTERNAL-API-OPT-OUT
Les `fetch()` vers APIs tierces (`server/services/external/*`, Tavily, Google Suggest, OAuth) sont volontairement hors wrapper — ce sont des appels externes, pas du trafic interne `/api/*`. Chaque occurrence porte un commentaire `// External API call — bypass wrapper by design (<provider>)` au-dessus du `fetch(`.
**Critère d'acceptation :** `grep -r "External API call" server/` retourne ≥ 14 occurrences ; le script `audit_data_flow.py` reconnaît ce marqueur et n'émet pas de violation pour ces fetch.
**Statut :** active. **Depuis :** 2026-05-05.

---

### 9.4 — Maintenabilité (NFR-MAIN)

#### NFR-MAIN-ORG-STORES
Stores organisés en 5 domaines : `article`, `keyword`, `strategy`, `external`, `ui`.

#### NFR-MAIN-ORG-COMPOSABLES
Composables organisés en 5 domaines : `keyword`, `intent`, `editor`, `seo`, `ui`.

#### NFR-MAIN-ORG-SERVICES
Services backend organisés en 7 domaines : `keyword`, `external`, `intent`, `article`, `strategy`, `infra`, `queries`.

#### NFR-MAIN-TESTS-VITEST
Tests Vitest miroir dans `tests/unit/` (~270 fichiers, ~4400 cas).

#### NFR-MAIN-TESTS-PLAYWRIGHT
Tests Playwright dans `tests/browser-e2e/` (`*.browser.test.ts`).

#### NFR-MAIN-TOOLING
Tooling : oxlint + eslint + prettier + knip (dead code) + madge (cycles) + dependency-cruiser (arch) + husky pre-commit + lint-staged.

#### NFR-MAIN-CHECK-HEALTH
Script `npm run check:health` baseline CI agrégeant tous les checks.

#### NFR-MAIN-NO-SCORE-FALLBACK
Règle ESLint `no-score-fallback` empêche les fallbacks silencieux sur scores.

#### NFR-MAIN-FILE-SIZE
Cible < 400 lignes par fichier.
**Statut :** prescrit, partiellement violé. Fichiers > 1000 lignes au 2026-05-04 :
- `CaptainValidation.vue` (~1507 L)
- `KeywordDiscoveryTab.vue` (~1419 L)
- `BrainPhase.vue` (~1066 L)
**Source :** tech-spec-stabilisation-codebase (Sprints S4-S5).

#### NFR-MAIN-NO-CYCLES
Pas de cycles d'imports (vérifié par `madge` + `npm run check:cycles`).
**Statut :** active, vérifié vert.

---

### 9.5 — Sécurité et robustesse (NFR-SEC)

#### NFR-SEC-CORS
CORS localhost uniquement (`server/index.ts:38-51`).

#### NFR-SEC-ZOD-INPUT
Input validation Zod sur toutes les routes.

#### NFR-SEC-NO-CROSS-IMPORT
`src/` ne doit jamais importer depuis `server/` (sauf via `shared/`). Règle dependency-cruiser `no-server-in-src`.

#### NFR-SEC-PROMPT-INJECTION
Prompt injection hardening via `escapePromptContent()` (`server/utils/prompt-loader.ts:32-51`).

#### NFR-SEC-ENV-VARS
Variables d'env via `.env` (dotenv). `.env` gitignored.

#### NFR-SEC-GSC-TOKENS
Tokens GSC stockés en plain dans `data/gsc-token.json` (env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
**Statut :** active — *amélioration possible :* chiffrement / vaulting (non critique en local single-user).

#### NFR-SEC-NODE-ENGINES
Node `^20.19.0 || >=22.12.0` (`package.json:91`).

---

### 9.6 — Observabilité (NFR-OBS)

#### NFR-OBS-LOGGER
Logger central avec niveaux DEBUG / INFO / WARN / ERROR (`server/utils/logger.ts:4-44`).

#### NFR-OBS-CONFIG
Logger configurable via `logs.config.ts`.

#### NFR-OBS-HEALTH
Endpoint `/api/health`.

#### NFR-OBS-DB-CHECK
Vérification connexion PostgreSQL au startup.

#### NFR-OBS-ERROR-HANDLER
Middleware central de gestion d'erreurs.

#### NFR-OBS-COST-LOG
Activity log UI (cost-log store) qui agrège API usage + DB ops + messages.

#### NFR-OBS-DBOPS-TRACK
Tracking DbOps via `pushDbOpsIfPresent` dans le wrapper API.

#### NFR-OBS-KNOWN-ERRORS
`KNOWN_ERROR_CODES` surfacés en UI via le wrapper API.

---

### 9.7 — Compatibilité runtime (NFR-RT)

| ID | Composant | Version |
|---|---|---|
| **NFR-RT-NODE** | Node | `^20.19.0 \|\| >=22.12.0` |
| **NFR-RT-VUE** | Vue | 3.5.29 |
| **NFR-RT-PINIA** | Pinia | 3.0.4 |
| **NFR-RT-TIPTAP** | TipTap | 3.20+ |
| **NFR-RT-EXPRESS** | Express | 5.2.1 |
| **NFR-RT-PG** | pg (PostgreSQL client) | 8.20.0 |
| **NFR-RT-ZOD** | Zod | 4.3.6 |
| **NFR-RT-VITEST** | Vitest | 4.0.18 |
| **NFR-RT-PLAYWRIGHT** | Playwright | 1.59.1 |
| **NFR-RT-TS** | TypeScript | 5.9.3 |
| **NFR-RT-VITE** | Vite | 7.3.1 |
| **NFR-RT-ANTHROPIC** | Anthropic SDK | 0.78.0 |
| **NFR-RT-GENAI** | Google GenAI | 1.50.1 |
| **NFR-RT-HF** | HuggingFace Transformers | 3.8.1 |

---

### 9.8 — Configuration et environnement (NFR-CFG)

#### NFR-CFG-AI-PROVIDER
Variable `AI_PROVIDER` switch entre `claude` / `gemini` / `openrouter` / `mock`.

#### NFR-CFG-AI-FALLBACK-OPT-OUT
`AI_PROVIDER_NO_FALLBACK=1` désactive le fallback automatique.

#### NFR-CFG-CLAUDE-MODEL
`CLAUDE_MODEL` override.

#### NFR-CFG-GEMINI-MODEL
`GEMINI_MODEL` override.

#### NFR-CFG-DATAFORSEO-SANDBOX
`DATAFORSEO_SANDBOX=1` opt-in sandbox.

#### NFR-CFG-DATAFORSEO-BUDGET
`DATAFORSEO_COST_BUDGET`, `DATAFORSEO_COST_WINDOW_MINUTES` configurables.

#### NFR-CFG-DATAFORSEO-REFRESH
Refresh delay configurable (`DATAFORSEO_REFRESH_DELAY_MS`).

#### NFR-CFG-WEB-SEARCH
`WEB_SEARCH_ENABLED=1` active web search dans actions et génération article.

#### NFR-CFG-PG-CONN
Variables d'env PostgreSQL (`PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`).

#### NFR-CFG-GSC-OAUTH
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GSC_TOKEN_PATH`.

#### NFR-CFG-INTER-SECTION-DELAY
`INTER_SECTION_DELAY_MS` configurable (défaut 15s).

#### NFR-CFG-APP-PORTS
**Ports applicatifs figés.** Le projet utilise deux ports applicatifs uniques sur la machine de dev :
- **Backend Express** : `3400` (configurable via `PORT`).
- **Frontend Vite** : `5400` (configurable via `VITE_PORT`).

Ces valeurs sont les **défauts en dur** (`server/index.ts`, `vite.config.ts`) et les **valeurs publiées dans `.env.example`**. Le port PostgreSQL `PG_PORT` (5432) est indépendant et n'est pas concerné.

**Critères d'acceptation testables :**
- AC1 : `.env.example` contient `PORT=3400` et `VITE_PORT=5400`.
- AC2 : `server/index.ts` fait `const PORT = process.env.PORT || 3400` (le fallback est `3400`, jamais `3005` ou autre).
- AC3 : `vite.config.ts` exporte `server.port = Number(process.env.VITE_PORT) || 5400` et `server.proxy['/api'].target` pointe sur `http://localhost:${PORT_BACK}` avec `PORT_BACK = process.env.PORT || 3400`.
- AC4 : `playwright.config.ts` `baseURL` défaut = `http://localhost:5400` ; `webServer[0].port = 3400` ; `webServer[1].port = 5400`.
- AC5 : grep dans le repo (hors `node_modules`, `dist`, `_archive`) sur les littéraux `:3005` ou `:5173` retourne **0 résultat actif** (peuvent subsister dans des doc archivées avec bandeau ARCHIVED).

**Statut :** active. **Depuis :** 2026-05-05.

#### NFR-CFG-PORT-PREFLIGHT
**Libération idempotente des ports avant `dev` / `build` / `test:browser`.** Un script Node `scripts/kill-port.mjs` libère les ports `3400` et `5400` (cross-platform Windows + POSIX) avant tout démarrage de serveur de dev, build ou suite Playwright. Le script est :
- **idempotent** : exit 0 même si rien n'écoute sur les ports ;
- **cross-platform** : détecte la plateforme (`process.platform === 'win32'` → `netstat -ano` + `taskkill /F /PID`, sinon → `lsof -ti:PORT` + `kill -9`) ;
- **silencieux par défaut** : log uniquement les ports effectivement libérés (pas de bruit si tout est déjà libre) ;
- **paramétrable** : `node scripts/kill-port.mjs 3400 5400` (positional args) ou défaut interne `[3400, 5400]` ;
- **robuste** : un échec sur un port (process protégé / permission denied) loggue un warning mais ne casse pas le hook (autres ports continuent).

Câblage `package.json` :
- `predev` → kill-port `3400 5400`,
- `prebuild` → kill-port `3400 5400` (le build Vite peut lancer un serveur de prévisualisation),
- `pretest:browser` → kill-port `3400 5400` (Playwright `webServer` ne réutilise pas si un autre process tient le port).

**Critères d'acceptation testables :**
- AC1 : `scripts/kill-port.mjs` existe et est exécutable via `node scripts/kill-port.mjs`.
- AC2 : appelé sans port occupé → exit code `0`, aucune erreur stderr fatale.
- AC3 : `package.json` contient les hooks `predev`, `prebuild`, `pretest:browser` invoquant `node scripts/kill-port.mjs 3400 5400`.
- AC4 : test unit qui parse `package.json` et vérifie la présence des 3 hooks + l'invocation du script.
- AC5 : test unit qui appelle la fonction `freePort(port)` exportée par le script (mock de `child_process.exec`) → vérifie la commande émise selon `os.platform()`.

**Statut :** active. **Depuis :** 2026-05-05.

---

## 10. Conventions de nommage

| Type | Convention | Exemple |
|---|---|---|
| Vue components | PascalCase.vue | `CaptainValidation.vue` |
| Stores | kebab-case.store.ts | `article-progress.store.ts` |
| Services backend | kebab-case.service.ts | `keyword-validate.service.ts` |
| Routes backend | kebab-case.routes.ts | `serp-analysis.routes.ts` |
| Composables | useCamelCase.ts | `useKeywordScoring.ts` |
| Types partagés | kebab-case.types.ts | `article-progress.types.ts` |
| Schemas Zod | kebab-case.schema.ts | `article-progress.schema.ts` |
| Prompts | kebab-case.md | `capitaine-ai-panel.md` |
| Tests | miroir + .test.ts | `tests/unit/stores/article-progress.store.test.ts` |
| Checks workflow | `workflow:snake_case` | `moteur:capitaine_locked` |
| Identifiants exigences | `FR-DOMAINE-CAPACITY` | `FR-CAP-LOCK-RADIO`, `NFR-PERF-CACHE-HIT-RATE` |

---

## 11. Glossaire

| Terme | Définition |
|---|---|
| **Cocon** | Cluster sémantique d'articles autour d'un thème principal |
| **Silo** | Conteneur thématique de plusieurs cocons |
| **Capitaine** | Mot-clé principal d'un article (1 par article, lock atomique) |
| **Lieutenants** | Sous-keywords structurant les H2/H3 |
| **Lexique** | Termes TF-IDF (Obligatoire / Différenciateur / Optionnel) |
| **Pilier / Intermédiaire / Spécifique** | Niveau d'article — détermine seuils de scoring et word-count |
| **Score Marché** | Score objectif basé sur 6 KPIs DataForSEO (Volume, KD, CPC, PAA, Intent, AC) |
| **Score Pertinence** | Score subjectif basé sur l'alignement avec la douleur de l'article |
| **Verdict** | Étiquette informative GO / ORANGE / NO-GO / GRAY (ne conditionne plus le lock depuis 2026-04-28) |
| **PainPoint** | Douleur cible de l'article — propagée dans les prompts via `{{painPoint}}` |
| **Strategy Context** | Bloc cible/douleur/angle/promesse/CTA du cocon — propagé via `{{strategy_context}}` |
| **Check** | Booléen de progression stocké dans `articles.completed_checks` TEXT[] |
| **Mode workflow / mode libre** | Modes des composants Moteur (article réel vs article virtuel id=0) |
| **Cost-guard** | Système de réservation budget DataForSEO en sliding window |
| **USAGE_SENTINEL** | Marker `__USAGE__` injecté en fin de stream IA pour parser uniformément |

---

## 12. Annexes

### 12.1 — Tables PostgreSQL principales

| Table | Champs clés | Usage |
|---|---|---|
| `silos` | id, name | Conteneurs thématiques |
| `cocoons` | id, silo_id, nom | Clusters sémantiques |
| `articles` | id, cocoon_id, titre, type, slug, status, phase, meta_title, meta_description, seo_score, geo_score, completed_checks[] | Master article |
| `article_content` | article_id, outline JSONB, content TEXT | Sommaire + contenu généré |
| `article_strategies` | article_id, data JSONB, completed_steps | 6 étapes Cerveau |
| `article_micro_contexts` | article_id, angle, tone, directives, target_word_count | Micro-context éditorial |
| `article_keywords` | article_id, capitaine, lieutenants[], lexique[], hn_structure JSONB | SEO keywords |
| `cocoon_strategies` | cocoon_id, data JSONB, completed_steps | Cerveau cocon |
| `theme_config` | id, data JSONB | 1 ligne unique |
| `internal_links` | source_id, target_id, anchor_text, position | Linking matrix |
| `external_api_cache` | cache_key, cache_type, data JSONB, expires_at, cached_at | Cache TTL global |
| `keyword_metrics` | keyword PK, search_volume, kd, cpc, paa[], intent, autocomplete[], serp_raw_json, local_comparison, content_gap_analysis, fetched_at | Cache cross-article permanent |
| `paa_cache` | keyword, depth, data, fetched_at | Cache hiérarchique PAA |
| `radar_explorations` | article_id PK, scan_result JSONB | Persistance Radar (cards + longTailSuggestions) |
| `captain_explorations` | article_id, keyword, source, validation JSONB | Persistance Capitaine |
| `lexique_explorations` | article_id, source_keyword, tfidfTerms, aiRecommendations, aiMissingTerms, aiSummary | Persistance Lexique multi-keyword |
| `keyword_intent_analyses` | keyword, analysis JSONB | Cache intent Explorateur |

### 12.2 — Routes Express enregistrées (24 fichiers)

cocoons, keywords, articles, dataforseo, generate (sub-routes), links, export, intent, local, content-gap, gsc, silos, strategy, intent-scan, discovery-cache, radar-cache, radar-exploration, long-tail-suggest, article-explorations, keyword-queries, keyword-validate, keyword-ai-panel, serp-analysis, paa.

### 12.3 — Prompts `.md` (`server/prompts/`)

Stratégie article : `strategy-suggest.md`, `strategy-deepen.md`, `strategy-consolidate.md`.

Stratégie cocon : `cocoon-brainstorm.md`, `cocoon-articles.md`, `cocoon-articles-topics.md`, `cocoon-paa-queries.md`, `cocoon-articles-spe.md`.

Moteur : `discovery-*.md`, `radar-*.md`, `painpoint-translate.md`, `capitaine-ai-panel.md`, `propose-lieutenants.md`, `lieutenants-hn-structure.md`, `lexique-suggest.md`, `lexique-analysis-upfront.md`, `lexique-ai-panel.md`.

Rédaction : `brief-ia-panel.md`, `generate-outline.md`, `generate-article.md`, `generate-article-section.md`, `generate-meta.md`.

Actions contextuelles (12) : `actions/reformulate.md`, `actions/simplify.md`, `actions/convert-list.md`, `actions/pme-example.md`, `actions/keyword-optimize.md`, `actions/add-statistic.md`, `actions/answer-capsule.md`, `actions/question-heading.md`, `actions/localize.md`, `actions/sources-chiffrees.md`, `actions/exemples-reels.md`, `actions/ce-quil-faut-retenir.md`.

### 12.4 — Liste des FR/NFR introduits ou modifiés depuis le 2026-04-24

| ID | Statut | Source | Date |
|---|---|---|---|
| FR-CAP-VERDICT-INFORMATIVE | nouveau | tech-spec-score-kpi-pertinence-separation | 2026-04-28 |
| FR-CAP-VERDICT-GATING | deprecated | (ancien FR16) | 2026-04-28 |
| FR-CAP-LIST-SIDEPANEL | nouveau (remplace carrousel) | tech-spec-capitaine-radar-list-sidepanel | 2026-04-25 |
| FR-CAP-SIDEPANEL-WIDTH | nouveau | tech-spec-score-kpi-pertinence-separation | 2026-04-28 |
| FR-CAP-KPIS-READONLY | nouveau | tech-spec-score-kpi-pertinence-separation | 2026-04-28 |
| FR-RAD-SCORING-BIMODAL | nouveau (remplace score unique) | tech-spec-score-kpi-pertinence-separation | 2026-04-28 |
| FR-CAP-SCORING-BIMODAL | nouveau (remplace score unique) | tech-spec-score-kpi-pertinence-separation | 2026-04-28 |
| FR-MOT-PAINPOINT-INJECTION | nouveau | sprints-pain-point-relevance-evolution | 2026-04-28 |
| FR-LEX-SORT (alignement douleur) | nouveau | sprints-pain-point-relevance-evolution | 2026-04-28 |
| FR-RAD-LONGTAIL-GENERATE | nouveau | tech-spec-radar-long-tail-suggestions | 2026-05-03 |
| FR-RAD-LONGTAIL-UI | nouveau | tech-spec-radar-long-tail-suggestions | 2026-05-03 |
| FR-RAD-LONGTAIL-REGENERATE | nouveau | tech-spec-radar-long-tail-suggestions | 2026-05-03 |
| FR-RAD-SEND-CAPTAIN | nouveau | tech-spec-radar-long-tail-suggestions | 2026-05-03 |
| FR-CER-MICRO-CONTEXT | jamais documenté avant | code (articles.routes.ts) | < 2026-05-04 |
| FR-CER-WORD-COUNT-RECOMMEND | jamais documenté avant | code (target-word-count.service.ts) | < 2026-05-04 |
| FR-CER-THEME-CONFIG | jamais documenté avant | code (theme-config.store.ts) | < 2026-05-04 |
| FR-CER-BATCH-CREATE | jamais documenté avant | code (articles.routes.ts:171) | < 2026-05-04 |
| FR-RED-CONTEXTUAL-ACTIONS | jamais documenté avant (12 actions) | code (server/prompts/actions/) | < 2026-05-04 |
| FR-RED-INTERNAL-LINKING | jamais documenté avant | code (useInternalLinking.ts) | < 2026-05-04 |
| FR-RED-REDUCE-SECTION | jamais documenté avant | code (reduce-section.routes.ts) | < 2026-05-04 |
| FR-RED-HUMANIZE-SECTION | jamais documenté avant | code (humanize-section.routes.ts) | < 2026-05-04 |
| FR-EXP-INTENT-ANALYZE | jamais documenté avant | code (intent.service.ts) | < 2026-05-04 |
| FR-EXP-MAPS | jamais documenté avant | code (local.routes.ts) | < 2026-05-04 |
| FR-EXP-CONTENT-GAP | jamais documenté avant | code (content-gap.routes.ts) | < 2026-05-04 |
| FR-EXP-AUDIT | jamais documenté avant | code (keywords.routes.ts:31-73) | < 2026-05-04 |
| FR-EXT-DATAFORSEO-COSTGUARD | jamais documenté avant | code (dataforseo-cost-guard.ts) | < 2026-05-04 |
| FR-EXT-GSC-OAUTH | jamais documenté avant | code (gsc.routes.ts) | < 2026-05-04 |
| FR-EXT-GSC-PERFORMANCE | jamais documenté avant | code (gsc.service.ts) | < 2026-05-04 |
| FR-EXT-GSC-KEYWORD-GAP | jamais documenté avant | code (gsc.service.ts) | < 2026-05-04 |
| FR-EXT-AI-MULTI-PROVIDER | jamais documenté avant | code (ai-provider.service.ts) | < 2026-05-04 |
| FR-EXT-AI-FALLBACK | jamais documenté avant | code (ai-provider.service.ts) | < 2026-05-04 |
| FR-EXT-EMBEDDINGS | jamais documenté avant | code (embedding.service.ts) | < 2026-05-04 |
| FR-INFRA-PAA-CACHE | jamais documenté avant | code (paa-cache.service.ts) | < 2026-05-04 |
| FR-INFRA-SCORE-MODULE | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| FR-INFRA-SCORE-MODULE | étendu (helpers KPI marché) | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-INFRA-NO-SCORE-FALLBACK | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| FR-INFRA-NO-SCORE-FALLBACK | étendu (KPI marché Difficulty/Cpc/Competition) | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-INFRA-KPI-NULLABLE | nouveau | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-INFRA-KPI-DISPLAY-DASH | nouveau | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-INFRA-KPI-CONSISTENCY | nouveau | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-INFRA-KPI-SCORING-NULLSAFE | nouveau | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-MOT-RAW-KPIS | étendu (placeholder `—` pour KPI absent) | tech-spec-kpi-types-nullable | 2026-05-05 |
| FR-INFRA-CHECK-HEALTH | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| FR-INFRA-DEPENDENCY-CRUISER | jamais documenté avant | `.dependency-cruiser.cjs` | < 2026-05-04 |
| FR-INFRA-LOGGER | jamais documenté avant | code (server/utils/logger.ts) | < 2026-05-04 |
| FR-INFRA-COST-LOG-STORE | jamais documenté avant | code (cost-log store) | < 2026-05-04 |
| NFR-MAIN-FILE-SIZE | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| NFR-SEC-PROMPT-INJECTION | jamais documenté avant | code (prompt-loader.ts) | < 2026-05-04 |
| NFR-CFG-* (tous) | jamais documentés avant | `.env.example` | < 2026-05-04 |
| FR-INFRA-API-WRAPPER | affiné (périmètre + critère mesurable, dette résorbée) | tech-spec-fetch-to-wrapper-migration | 2026-05-05 |
| FR-INFRA-API-STREAM | nouveau (wrapper SSE unifié) | tech-spec-fetch-to-wrapper-migration | 2026-05-05 |
| NFR-INT-API-WRAPPER | affiné (critère d'acceptation via audit, dette résorbée) | tech-spec-fetch-to-wrapper-migration | 2026-05-05 |
| NFR-OBS-EXTERNAL-API-OPT-OUT | nouveau (opt-out documenté pour fetch externes) | tech-spec-fetch-to-wrapper-migration | 2026-05-05 |
| NFR-CFG-APP-PORTS | nouveau (ports figés 3400 back / 5400 front) | chantier-ports-3400-5400 | 2026-05-05 |
| NFR-CFG-PORT-PREFLIGHT | nouveau (kill-port preflight idempotent) | chantier-ports-3400-5400 | 2026-05-05 |

### 12.5 — Dette technique identifiée

1. **Strings de checks hardcodées** : plusieurs composants hardcodent `'capitaine_locked'` au lieu d'importer la constante `MOTEUR_CHECKS.CAPITAINE_LOCKED` (FR-MOT-CHECKS-CONSTANTS partiellement violé).
2. ~~**`fetch()` directs résiduels**~~ : **résorbé 2026-05-05** via `tech-spec-fetch-to-wrapper-migration`. Tous les appels HTTP côté `src/` passent par `apiGet/apiPost/apiPut/apiPatch/apiDelete/apiStream`. Les fetch externes côté `server/services/external/*` sont documentés via `NFR-OBS-EXTERNAL-API-OPT-OUT`.
3. **Fichiers > 1000 lignes** : `CaptainValidation.vue`, `KeywordDiscoveryTab.vue`, `BrainPhase.vue` (NFR-MAIN-FILE-SIZE violé).
4. **NFR-PERF-* non monitorées** : aucun middleware timing, pas d'instrumentation cache hit rate.
5. **Tokens GSC en plain** : pas de chiffrement (acceptable en local single-user mais à noter).

---

**Fin du PRD.**
