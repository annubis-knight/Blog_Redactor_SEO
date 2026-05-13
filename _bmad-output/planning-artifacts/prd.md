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
lastUpdated: '2026-05-12T00:00:00Z'
updateReason: 'Refonte complète post-audit : préfixage des FR/NFR par domaine (FR-DIS, FR-RAD, FR-CAP, FR-LIE, FR-LEX, FR-FIN, FR-MOT, FR-CER, FR-RED, FR-LAB, FR-EXP, FR-DASH, FR-EXT, FR-INFRA, NFR-PERF, NFR-COST, NFR-INT, NFR-MAIN, NFR-SEC, NFR-OBS, NFR-RT, NFR-CFG), versioning par exigence (statut + date + remplaçant), rattrapage des 4 sprints livrés post 2026-04-24 (score-pertinence, longue traîne radar, painPoint, stabilisation codebase) et documentation des capacités jamais formalisées (GSC OAuth, cost-guard DataForSEO, content gap, micro-context, internal linking, batch creation, theme config, PAA cache, multi-provider IA, embeddings HuggingFace, contextual actions). Suppression de la numérotation séquentielle FR1-FR60 historique, remplacée par identifiants stables. Verdict Capitaine devenu informatif (FR-CAP-LOCK supersede FR-CAP-VERDICT-GATING). Ajout 2026-05-04 (delta vague 1 monstres Vue) : FR-LIE-AI-FRONTIER formalise la frontière sémantique containers principaux ↔ panel IA (rôle long terme du PRD pour préserver l''invariant historiquement protégé par le verrou Sprint C-1). Ajout 2026-05-04 (delta vague 3 composables) : FR-MOT-SOFT-GATING formalise le gating souple Phase ②/③ — la consultation reste libre, seules les écritures sont conditionnées par les checks workflow. Cette FR documente l''invariant porté par useMoteurSoftGating (composable extrait de MoteurView). Ajout 2026-05-04 (delta vague 5 — audit FRs post-refactor V1-V5) : 10 FRs formalisant des fonctionnalités utilisateur visibles mais jamais documentées au PRD (cache 30j Discovery, filtre pertinence sémantique, score ring SVG + tooltip 4 messages contextuels Pertinence absent, arbre PAA récursif parent→children, payload cross-tab Discovery→Lexique, détection cannibalisation Capitaine cocon, counts DB explorations TabCachePanel, bouton vider cache external api_cache, architecture panels toolbar+ResizablePanel partagée Workflow/Editor, panel IA Brief markdown stream). Ces FRs ne créent aucune nouvelle fonctionnalité — elles documentent l''existant pour que les futurs refactors préservent l''intent utilisateur sans se baser uniquement sur le code. Ajout 2026-05-04 (delta vague 5 bis — réorganisation FRs par composants macro partagés) : nouvelle §8.15 "Composants UI partagés (FR-UI)" avec 4 FRs (FR-UI-RADAR-CARD, FR-UI-AI-PANELS-PATTERN, FR-UI-ARTICLE-SHARED, FR-UI-MOTEUR-SHARED) qui formalisent les invariants partagés cross-onglets de composants macro consommés à plusieurs endroits (RadarKeywordCard sur 3 contextes, infrastructure AiPanel sur 6 panels, sous-composants article partagés Workflow/Editor, briques Moteur cross-onglets). Ces FRs ne dupliquent pas les FR métier des §8.4-§8.10 mais référencent celles-ci via "voir aussi" — elles capturent uniquement le fait qu''un composant est partagé et que sa cohérence cross-contextes est un invariant en soi (motivation : le chantier vague 1-5 a montré que les FR par onglet ne suffisent pas pour valider la non-régression d''un composant macro touché par un refactor). Ajout 2026-05-05 (chantier KPI nullable) : 4 nouvelles FRs §8.14 (FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-DISPLAY-DASH, FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-SCORING-NULLSAFE) qui formalisent la migration des types KPI marché (KeywordOverview, LocationMetrics, RadarKeywordKpis, ValidatePainResult.dataforseo, KeywordAuditResult) vers number | null de bout en bout. Chaque FR porte des AC testables Vitest (pas seulement narratives). Extension FR-INFRA-NO-SCORE-FALLBACK (ajout Difficulty/Cpc/Competition au scope ESLint), FR-INFRA-SCORE-MODULE (ajout helpers formatVolume/Cpc/Kd/Percent), FR-MOT-RAW-KPIS (placeholder "—" quand KPI absent). Source : tech-spec-kpi-types-nullable. Ajout 2026-05-05 (chantier fetch-to-wrapper-migration) : FR-INFRA-API-WRAPPER affiné (périmètre clarifié, dette résorbée, critère mesurable via audit), FR-INFRA-API-STREAM nouveau (wrapper SSE unifié pour POST → ReadableStream avec mêmes garanties cost-log + KNOWN_ERROR_CODES que apiPost), NFR-INT-API-WRAPPER affiné (critère d''acceptation = 0 violation audit), NFR-OBS-EXTERNAL-API-OPT-OUT nouveau (commentaire `// External API call — bypass wrapper by design` obligatoire sur les 14 fetch externes côté server/services/external/*). Section §12.5 dette technique : ligne `fetch() directs résiduels` marquée résorbée. Source : tech-spec-fetch-to-wrapper-migration. Ajout 2026-05-05 (chantier audit couverture DB) : 9 nouvelles FR-INFRA §8.14 formalisant les tables PostgreSQL jusqu''ici fantômes ou sous-couvertes au PRD (FR-INFRA-PAA-EXPLORATIONS, FR-INFRA-INTENT-EXPLORATIONS-LEGACY, FR-INFRA-KEYWORDS-SEO, FR-INFRA-LOCAL-ENTITIES, FR-INFRA-LIEUTENANT-EXPLORATIONS, FR-INFRA-KEYWORD-DISCOVERIES, FR-INFRA-ARTICLE-STRATEGIES, FR-INFRA-COCOON-STRATEGIES, FR-INFRA-MICRO-CONTEXTS). Chaque FR documente le schéma + producteurs + consommateurs avec lignes de code source. Vérification DB live (psql) confirme 20 tables actives (vs 22 dans les CREATE TABLE — 2 renommées via migration 010, 1 jamais matérialisée : `intent_explorations`). Ajout d''une §8.14.bis Matrice de couverture tables ↔ FR (vue inverse FR↔table) qui répond aux questions opérationnelles : impact d''un changement schéma, impact d''un changement FR, détection de tables sans FR. Règle de maintenance : toute migration créant/modifiant une table doit ajouter/maj une ligne dans la matrice. Migration 2026-05-12 (chantier docs/prd-split-spec-design) : §8.10 Rédaction (13 FRs FR-RED-*) réécrites en langage utilisateur avec critères d''acceptation observables et bloc "En situation" narratif. Détails techniques (refs code, endpoints, flux DB, stores Pinia, watchers, décisions d''architecture) déplacés vers le design-registry §8.10 (13 entrées DESIGN-RED-*). Stores vérifiés : useEditorStore, useOutlineStore, useSeoStore, useGeoStore, useBriefStore, useLinkingStore, useArticleProgressStore. DRIFT-015 consigné (`internal_links.position` est une string offset caractère, pas une position ProseMirror stable — non bloquant tant que la matrice cocon n''a pas besoin de jumper précisément vers le mark). Migration 2026-05-12 (chantier docs/prd-split-spec-design suite) : §9.1 Performance (7 NFRs NFR-PERF-*), §9.2 Coût (6 NFRs NFR-COST-*), §9.3 Intégration (10 NFRs NFR-INT-* + NFR-OBS-EXTERNAL-API-OPT-OUT), §9.4 Maintenabilité (10 NFRs NFR-MAIN-*) réécrites au format utilisateur avec critères observables et exemples "En situation" succincts. Conception déportée vers design-registry §9.1-§9.4 (entrées DESIGN-PERF-*, DESIGN-COST-*, DESIGN-INT-*, DESIGN-MAIN-*, DESIGN-OBS-EXTERNAL-API-OPT-OUT). Drifts consignés : DRIFT-021 (NFR-MAIN-FILE-SIZE listait CaptainValidation.vue 1507L et KeywordDiscoveryTab.vue 1419L qui n''existent plus — refactorisés depuis ; BrainPhase.vue ramené de 1066L à 575L ; nouveaux offenders identifiés : CaptainPanel.vue 1509L, data.service.ts 1052L), DRIFT-022 (NFR-COST-DATAFORSEO-BUDGET citait env vars `DATAFORSEO_COST_BUDGET` / `DATAFORSEO_COST_WINDOW_MINUTES` ; les vraies sont `DATAFORSEO_COST_BUDGET_USD` / `DATAFORSEO_COST_WINDOW_MIN`), DRIFT-023 (NFR-MAIN-ORG-COMPOSABLES citait 5 domaines mais le code en a 8 : article, editor, intent, keyword, lexique, moteur, seo, ui).'
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
| ~~`FR-LAB`~~ | ~~Labo (recherche libre)~~ — **REMOVED 2026-05-10** (cf. §8.11) |
| ~~`FR-EXP`~~ | ~~Explorateur (intent, autocomplete, local, content gap)~~ — **REMOVED 2026-05-10** (cf. §8.12) |
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

2. **Sophistication invisible** — Cache à 3 niveaux (`external_api_cache` TTL, `keyword_metrics` cross-article permanent, cache PAA hiérarchique adossé à `keyword_metrics.paa_questions`). Cost-guard sliding-window sur DataForSEO. Multi-provider IA (Claude / Gemini / OpenRouter / Mock) avec fallback automatique 429/503. Progression cochée silencieusement via `articles.completed_checks` TEXT[].

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

### Business Success

- **Workflow bout-en-bout** — Le chemin Cerveau → Moteur (6 onglets) → Rédaction fonctionne pour tout article d'un cocon.
- **Réduction du temps de production** — La Phase ② Valider est celle où l'on passe le MOINS de temps possible grâce au cache cross-article.
- **Autonomie complète** — L'outil couvre 100% du workflow sans outil externe.

### Technical Success

- **Zéro appel API redondant** — Cache à 3 niveaux : `external_api_cache` (TTL par type), `keyword_metrics` (cross-article permanent), cache PAA hiérarchique (logique adossée à `keyword_metrics.paa_questions`, freshness 1 jour si non-vide).
- **Persistance PostgreSQL** — Articles, keywords, progress, strategies, cache en base. Purge horaire `external_api_cache` expirées.
- **Réactivité** — Streaming SSE pour appels longs (Claude). Cost-guard DataForSEO en sliding-window pour bloquer les dépassements budget avant l'appel.
- **Observabilité** — Activity log front + logger central back + health check.

### Indicateurs mesurables

| Indicateur | Cible |
|---|---|
| Appels API redondants | 0 (cache `external_api_cache` + `keyword_metrics` + cache PAA hiérarchique sur `keyword_metrics.paa_questions`) |
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

### ~~Journey 2 — Vérification au Labo~~ — **REMOVED 2026-05-10**

> Le Labo a été retiré du dashboard avec l'Explorateur (cf. §8.11/§8.12). L'utilisation de mots-clés en mode libre n'est plus exposée — le workflow Moteur reste le seul point d'entrée pour analyser un keyword.

### Journey 3 — Reprise d'un article en cours

Article commencé la semaine dernière. Checks Discovery + Radar faits.

1. **Moteur** → Sélection article. Dots montrent Discovery et Radar faits.
2. **Cache à 3 niveaux** → `external_api_cache` + `keyword_metrics` + cache PAA hiérarchique (`keyword_metrics.paa_questions`). Aucun re-call API.
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
- Cache PAA hiérarchique (par `keyword` + `depth`) adossé à la colonne JSONB `keyword_metrics.paa_questions` — pas de table dédiée. Freshness 1 jour si non-vide / 30 minutes si vide.

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
| Fichiers > 1000 lignes (au 2026-05-12 : `CaptainPanel.vue` 1509 L, `data.service.ts` 1052 L — anciens offenders `CaptainValidation`/`KeywordDiscoveryTab`/`BrainPhase` disparus, cf. DRIFT-021) | Cible stabilisation `< 400 L` (NFR-MAIN-FILE-SIZE), à découper |

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
- Cache `external_api_cache` + `keyword_metrics` (+ cache PAA hiérarchique sur `keyword_metrics.paa_questions`).
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

#### FR-CER-STEPS-ARTICLE — Stratégie d'article en 6 étapes guidées

Avant de rédiger un article, l'utilisateur pose sa stratégie en 6 étapes séquentielles : **Cible** (à qui s'adresse l'article), **Douleur** (quel problème il résout), **Aiguillage** (place dans la hiérarchie du cocon), **Angle** (l'angle éditorial unique), **Promesse** (ce que le lecteur retire), **CTA** (action attendue à la fin). Chaque étape suit le même cycle : l'IA propose une première version, l'utilisateur ajuste, l'IA peut creuser via des sous-questions si la réponse mérite d'être affinée, puis l'utilisateur consolide et valide. Au bout des 6 étapes, l'article porte une fiche stratégique complète qui nourrira la suite (Moteur et Rédaction).

**Critères d'acceptation**
- Les 6 étapes apparaissent dans l'ordre attendu et l'utilisateur ne peut valider l'article qu'après avoir au moins effleuré chacune.
- Pour chaque étape, l'utilisateur voit une suggestion IA modifiable avant de valider.
- L'utilisateur peut demander à l'IA d'approfondir une étape via des sous-questions générées dynamiquement.
- La consolidation finale d'une étape fusionne les réponses utilisateur + sous-questions en un texte unique validé.

> **En situation.** L'utilisateur prépare un article « Calcul indemnité rupture conventionnelle ». Il entre dans le Cerveau, l'IA lui suggère une cible (« DRH de PME 50-200 salariés voulant licencier sans contentieux »). Il ajuste, valide. Sur l'étape Douleur, l'IA propose 3 angles (peur du coût, peur du contentieux, manque de méthodologie) ; il demande à creuser le deuxième, répond aux sous-questions et consolide en un point de douleur précis. À la fin des 6 étapes, sa fiche stratégique est verrouillée et servira de socle pour le Moteur et la Rédaction.

→ Conception : [DESIGN-CER-STEPS-ARTICLE](./design-registry.md#design-cer-steps-article)

---

#### FR-CER-STEPS-COCOON — Stratégie de cocon en 6 étapes + 4 annexes

Avant de produire des articles individuels, l'utilisateur peut poser une **stratégie commune au cocon entier** en 6 étapes (Cible, Douleur, Angle, Promesse, CTA, Articles), prolongées par 4 étapes annexes (structure des articles, questions PAA cibles, articles spécialisés, topics transverses). Cette stratégie cocon devient le **contexte parent** de tous les articles du cocon — elle garantit la cohérence éditoriale entre 10-20 articles qui partagent une cible et une douleur communes.

**Critères d'acceptation**
- Les 6 étapes principales sont franchies dans le même esprit que les étapes article (suggestion IA → ajustement → consolidation → validation).
- À l'issue des 6 étapes principales, l'utilisateur peut faire générer une proposition de structure du cocon (un Pilier + N Intermédiaires + M Spécifiques).
- Les 4 étapes annexes sont optionnelles mais accessibles à tout moment.
- La stratégie cocon est consultable en lecture depuis n'importe quel article du cocon (cf. `FR-CER-CONTEXT-FOR-MOTEUR`).

> **En situation.** L'utilisateur ouvre un nouveau cocon « Création d'entreprise ». Plutôt que de plonger directement dans un article, il pose d'abord la stratégie cocon : cible commune (« entrepreneur solo qui veut créer une structure adaptée »), douleur racine (« peur de choisir le mauvais statut »), angle (« comparatif chiffré + cas concrets »), promesse, CTA. Puis il fait travailler l'IA sur la structure : 1 Pilier (« Guide complet création entreprise »), 4 Intermédiaires (statuts, étapes, fiscalité, social), 10 Spécifiques. Quand il attaquera la stratégie de chaque article, ces choix-là sont déjà figés — il ne refait pas le travail 15 fois.

→ Conception : [DESIGN-CER-STEPS-COCOON](./design-registry.md#design-cer-steps-cocoon)

---

#### FR-CER-AIGUILLAGE — Aiguillage Pilier / Intermédiaire / Spécifique

L'étape Aiguillage place l'article dans la hiérarchie du cocon en lui attribuant un **niveau** parmi 3 : **Pilier** (article racine, large, qui ouvre le cocon), **Intermédiaire** (sous-thème majeur du Pilier), **Spécifique** (sujet précis rattaché à un Intermédiaire). Ce niveau détermine ensuite plusieurs comportements en aval : les seuils de scoring Moteur, la longueur cible recommandée, et la manière dont l'article est lié aux autres par maillage interne.

**Critères d'acceptation**
- L'IA suggère un niveau par défaut sur la base du titre et du sujet de l'article.
- L'utilisateur peut accepter ou forcer un autre niveau.
- Un article Pilier n'a pas de parent ; un Intermédiaire est rattaché à un Pilier du cocon ; un Spécifique est rattaché à un Intermédiaire.
- Le niveau choisi est visible sur la fiche article et propagé au Moteur (seuils contextuels) et à la Rédaction (longueur cible).

> **En situation.** Pour l'article « Statut juridique entreprise individuelle », l'IA évalue : sujet large mais pas premier au cocon → suggère **Intermédiaire** rattaché au Pilier « Statut juridique entreprise ». L'utilisateur valide. Quand il attaquera le Moteur sur cet article, les seuils de scoring du Capitaine seront ceux d'un Intermédiaire (KD moyen toléré, volume moyen attendu). En Rédaction, la longueur cible suggérée tombera dans la fourchette Intermédiaire (1200-2500 mots).

→ Conception : [DESIGN-CER-AIGUILLAGE](./design-registry.md#design-cer-aiguillage)

---

#### FR-CER-BATCH-CREATE — Création d'articles en lot

Quand la structure du cocon est validée (cf. `FR-CER-STEPS-COCOON`), l'utilisateur peut **créer en un seul geste** tous les articles proposés par l'IA — typiquement 10 à 20 articles d'un coup, chacun avec son titre, son niveau, son mot-clé suggéré, son point de douleur et son slug. Au lieu de cliquer 15 fois sur « Nouvel article » et de remplir un formulaire à chaque fois, l'utilisateur valide la structure une fois et les articles apparaissent immédiatement dans le cocon.

**Critères d'acceptation**
- L'utilisateur peut déclencher la création d'un lot d'articles depuis la fin de la stratégie cocon.
- Chaque article du lot reçoit d'office son titre, son niveau, son mot-clé suggéré et son point de douleur tels que proposés par l'IA, modifiables avant validation.
- Après création, les articles apparaissent dans le dashboard (cf. `FR-DASH-NAV`) et dans la liste de sélection du Moteur, prêts à être travaillés.
- En cas d'échec partiel (un article ne se crée pas), l'utilisateur voit lesquels et peut relancer uniquement les manquants.

> **En situation.** L'utilisateur a validé une structure de 15 articles pour son cocon « Création d'entreprise ». Il clique sur « Créer ces articles ». L'app les crée en bloc. Au lieu d'avoir passé 30 minutes à les saisir un par un (et risquer des incohérences de slug ou de niveau), il a 15 articles cohérents en 5 secondes, tous reliés au cocon, tous avec leur painPoint propre.

→ Conception : [DESIGN-CER-BATCH-CREATE](./design-registry.md#design-cer-batch-create)

---

#### FR-CER-MICRO-CONTEXT — Micro-contexte éditorial par article

En plus de la stratégie (Cible/Douleur/Angle/…), l'utilisateur peut attacher à un article un **micro-contexte éditorial** qui affinera la production : l'**angle** précis de cet article-ci, le **ton** souhaité, des **directives** ponctuelles, et un **nombre de mots cible**. Ce micro-contexte sera automatiquement injecté dans les prompts IA Rédaction — pas besoin de retaper ces consignes à chaque génération.

**Critères d'acceptation**
- L'utilisateur peut renseigner et modifier un micro-contexte à tout moment depuis la fiche article ou depuis la Rédaction.
- Le micro-contexte est optionnel : un article sans micro-contexte se génère normalement avec les valeurs par défaut.
- Quand le micro-contexte est renseigné, l'IA Rédaction (brief, sommaire, sections) respecte les directives indiquées.
- Modifier le micro-contexte n'invalide pas les générations déjà faites — c'est l'utilisateur qui décide de regénérer.

> **En situation.** Pour l'article « Frais réels ou forfait fiscal », l'utilisateur ajoute un micro-contexte : angle = « comparatif chiffré », ton = « didactique, peu technique », directives = « donner un exemple à 30k€ et un à 60k€ », cible = 1800 mots. Quand il lancera la génération, l'IA produira un article qui colle exactement à cette demande — sans qu'il ait à répéter ces consignes dans un prompt à chaque section.

→ Conception : [DESIGN-CER-MICRO-CONTEXT](./design-registry.md#design-cer-micro-context)

---

#### FR-CER-WORD-COUNT-RECOMMEND — Recommandation de longueur cible

Pour aider l'utilisateur à fixer une longueur d'article réaliste et compétitive, l'app propose une **recommandation chiffrée** basée sur 3 signaux croisés : la fourchette de référence selon le niveau de l'article (Pilier/Intermédiaire/Spécifique), la longueur moyenne des concurrents top 10 sur le mot-clé cible, et une suggestion contextuelle de l'IA en fonction de la complexité du sujet. L'utilisateur voit le détail du raisonnement pour décider en connaissance de cause.

**Critères d'acceptation**
- L'utilisateur peut demander une recommandation à tout moment, à partir du moment où un mot-clé est verrouillé.
- La réponse contient une longueur finale recommandée et un détail expliquant les 3 signaux (fourchette par type, moyenne concurrents, suggestion IA).
- L'utilisateur peut accepter la recommandation ou saisir une autre valeur.
- La longueur retenue alimente le micro-contexte (cf. `FR-CER-MICRO-CONTEXT`) et drive l'allocation de tokens par section côté Rédaction.

> **En situation.** L'utilisateur hésite sur la longueur de « Indemnité rupture conventionnelle 2026 ». Il clique sur « Recommander ». L'app lui retourne : fourchette Intermédiaire 1200-2500, moyenne des top 10 = 2100 mots, suggestion IA = 2200 mots vu la complexité (formules de calcul + jurisprudence). Recommandation finale : **2100 mots**, avec le détail visible. Il accepte ; ces 2100 mots seront ensuite distribués entre les sections lors de la génération.

→ Conception : [DESIGN-CER-WORD-COUNT-RECOMMEND](./design-registry.md#design-cer-word-count-recommend)

---

#### FR-CER-THEME-CONFIG — Configuration thématique projet (one-shot)

Au démarrage de son projet, l'utilisateur renseigne **une fois** une configuration thématique globale qui décrit : l'**avatar client** (secteur, taille, localisation, budget, maturité), son **positionnement** (audience, promesse, différenciateurs, douleurs racines), ses **offres** (services, CTA principal et cible du CTA), et son **ton de voix** (style, vocabulaire à privilégier ou éviter). Cette config est ensuite automatiquement injectée dans **tous** les prompts IA — l'utilisateur n'a jamais à la redire.

**Critères d'acceptation**
- Une seule configuration thème existe à l'échelle du projet (singleton).
- L'utilisateur peut la créer, la modifier et la supprimer depuis un écran dédié.
- Quand un prompt IA est exécuté (Cerveau, Moteur, Rédaction), la config thème est automatiquement injectée en contexte parent.
- Une config thème vide ne casse aucun prompt — l'app fonctionne avec la valeur par défaut neutre.

> **En situation.** L'utilisateur remplit une fois la config thème : avatar = « PME 50-200 salariés, BtoB, dirigeant », positionnement = « conseil RH et droit social pragmatique », CTA principal = « Réservez un audit gratuit 30 min », ton = « clair, sans jargon, exemples concrets ». Tous ses articles générés depuis ce projet adoptent ce ton et glissent ce CTA dans leur conclusion — sans qu'il ait à le redire dans chaque prompt.

→ Conception : [DESIGN-CER-THEME-CONFIG](./design-registry.md#design-cer-theme-config)

---

#### FR-CER-CHECKS — Trois checks Cerveau écrits automatiquement

Au fur et à mesure que l'utilisateur progresse dans le Cerveau, l'app coche **automatiquement** trois jalons de progression sans qu'il ait à le déclencher : un check quand la stratégie article est posée (les 6 étapes validées), un check quand la hiérarchie cocon est construite, un check quand les articles ont été proposés et créés. Ces checks remontent dans les dots du dashboard et dans le récap Moteur — l'utilisateur visualise immédiatement son avancement Cerveau.

**Critères d'acceptation**
- Le check « stratégie définie » s'inscrit dès que les 6 étapes stratégie (article ou cocon) sont validées.
- Le check « hiérarchie construite » s'inscrit dès qu'un cocon a au moins un Pilier + un Intermédiaire validés.
- Le check « articles proposés » s'inscrit dès que le batch d'articles est créé (cf. `FR-CER-BATCH-CREATE`).
- L'utilisateur ne déclenche jamais ces checks à la main — c'est l'app qui les écrit.

> **En situation.** L'utilisateur valide la 6ᵉ étape stratégie de son cocon « Création d'entreprise ». Sans qu'il fasse rien d'autre, le dot Cerveau de tous les articles du cocon passe à `●` au dashboard. Quand il cliquera plus tard sur un article et entrera dans le Moteur, la barre de contexte stratégique affichera bien sa cible et sa douleur — preuve que tout est branché.

→ Conception : [DESIGN-CER-CHECKS](./design-registry.md#design-cer-checks)

---

#### FR-CER-CONTEXT-FOR-MOTEUR — Pont stratégie Cerveau → Moteur

Quand l'utilisateur passe du Cerveau au Moteur sur un article, **il n'a rien à ressaisir**. La stratégie qu'il a posée (cible, douleur, angle, promesse, CTA — au niveau cocon et au niveau article) est automatiquement exposée au Moteur : visible en lecture seule dans la barre de contexte stratégique, et injectée en arrière-plan dans les prompts IA du Moteur (panels Capitaine, propose-lieutenants, lexique) pour qu'ils raisonnent en cohérence.

**Critères d'acceptation**
- Au mount du Moteur, la barre de contexte stratégique affiche les valeurs validées du Cerveau (cocon + article) en lecture seule.
- Les valeurs non encore validées (ou vides) ne s'affichent pas — la barre reste lisible même quand la stratégie est partielle.
- Les prompts IA du Moteur reçoivent ces valeurs en variables de contexte ; un prompt qui ne reçoit rien fonctionne quand même (fallback silencieux).
- Modifier une valeur côté Cerveau se reflète au Moteur au prochain mount (pas de cache obsolète).

> **En situation.** L'utilisateur a validé sa stratégie cocon « Création d'entreprise » la semaine dernière. Aujourd'hui il entre dans le Moteur de l'article « SARL ou SAS ». Le bandeau en haut affiche : cible = « entrepreneur solo », douleur = « peur de choisir mauvais statut », angle = « comparatif chiffré + cas concrets ». Quand il déclenche le panel IA du Capitaine, l'IA raisonne en tenant compte de cette stratégie — pas besoin de lui répéter dans un prompt qui est l'audience ni quelle est la promesse.

→ Conception : [DESIGN-CER-CONTEXT-FOR-MOTEUR](./design-registry.md#design-cer-context-for-moteur)

---

#### FR-PIE-AI-GENERATION — Génération automatique de l'intention éditoriale par l'IA Cerveau *(déplacée depuis §8.6 le 2026-05-12)*

Quand l'IA Cerveau propose une liste d'articles pour structurer un cocon, elle **infère pour chaque article son intention éditoriale attendue** : *informational* (article qui explique, guide, éduque), *commercial* (comparatif, sélection), *transactional* (pousse à l'achat ou conversion), *navigational* (page marque/produit précis). Ce champ accompagne le mot-clé suggéré, le slug, le painPoint et le type d'article — pas d'appel IA supplémentaire, c'est inclus dans la même réponse. L'intention éditoriale est ensuite consommée par le Moteur (Capitaine) pour son scoring de pertinence.

**Critères d'acceptation**
- Pour chaque article généré par l'IA dans un cocon, l'app reçoit une des 4 valeurs d'intention éditoriale (ou rien si l'IA ne l'a pas inférée — rétro-compatibilité).
- La valeur est persistée à la création de l'article.
- L'inférence se fait dans le même appel IA que les autres métadonnées article — pas de surcoût.

> **En situation.** L'utilisateur génère un cocon « Création d'entreprise » avec 15 articles. Pour « Comparatif SARL vs SAS », l'IA infère *commercial* ; pour « Guide création SARL pas à pas », elle infère *informational*. Cette information est utilisée plus tard côté Moteur pour signaler une éventuelle incohérence entre l'intention attendue et l'intention réelle de la SERP du mot-clé.

→ Conception : [DESIGN-PIE-AI-GENERATION](./design-registry.md#design-pie-ai-generation)

---

#### FR-PIE-CERVEAU-OVERRIDE — Correction manuelle de l'intention éditoriale par l'utilisateur *(déplacée depuis §8.6 le 2026-05-12)*

Si l'utilisateur n'est pas d'accord avec l'intention éditoriale inférée par l'IA pour un article, il peut la **corriger à la main** depuis la fiche de l'article proposé (sélecteur radio avec les 4 valeurs + une option « Non défini »). Le changement est persisté immédiatement.

**Critères d'acceptation**
- Chaque article proposé porte un sélecteur visible de l'intention éditoriale.
- Les 4 valeurs sont proposées plus une option « Non défini » (NULL).
- Le changement déclenche une sauvegarde immédiate, sans bouton « Enregistrer ».
- La valeur corrigée prévaut sur l'inférence initiale.

> **En situation.** Pour l'article « Le statut juridique de l'auto-entrepreneur », l'IA a inféré *informational*. L'utilisateur, lui, sait qu'il va y faire un comparatif chiffré avec d'autres statuts — il bascule sur *commercial* d'un clic. Le toast de confirmation apparaît, la sauvegarde est faite, le Moteur en tiendra compte.

→ Conception : [DESIGN-PIE-CERVEAU-OVERRIDE](./design-registry.md#design-pie-cerveau-override)

---

### 8.2 — Dashboard / Cocoon Landing (FR-DASH)

#### FR-DASH-NAV — Navigation hiérarchique Silo → Cocon → Article

L'utilisateur parcourt son contenu via une hiérarchie à 3 niveaux : **silos** thématiques (top-level), **cocons** sémantiques (intermédiaire), **articles** individuels (feuille). À chaque niveau, il voit la liste des éléments du niveau inférieur ainsi que des statistiques agrégées (nombre d'articles, état d'avancement) pour orienter son choix sans avoir à entrer dans chaque élément.

**Critères d'acceptation**
- Le dashboard affiche la liste des silos existants, chacun avec un compteur d'articles.
- Le clic sur un silo conduit à la liste de ses cocons.
- Le clic sur un cocon conduit à sa landing page (cf. `FR-DASH-WORKFLOW-CHOICE`).
- Le clic sur un article conduit à l'écran de production de cet article.

> **En situation.** Lundi matin, l'utilisateur reprend son travail sur un client « Cabinet d'avocats de Toulouse ». Sur le dashboard il voit son silo « Droit du travail » qui affiche « 12 articles », clique dessus, arrive sur 3 cocons (Licenciement, Rupture conventionnelle, Prud'hommes), clique sur « Rupture conventionnelle » et atterrit sur la landing de ce cocon. Trois clics pour retrouver le bon contexte — pas besoin d'ouvrir chaque article pour savoir où il en est, les compteurs et l'arborescence suffisent.

→ Conception : [DESIGN-DASH-NAV](./design-registry.md#design-dash-nav)

---

#### FR-DASH-PROGRESS — Dots de progression par article

Pour chaque article listé dans le dashboard, l'utilisateur voit un indicateur visuel d'avancement sous forme de points (●/○) à côté du nom de l'article. Chaque point représente une étape attendue du workflow Moteur. Au premier coup d'œil, l'utilisateur sait combien d'étapes restent à franchir sans avoir à ouvrir l'article.

**Critères d'acceptation**
- Chaque carte article affiche une suite de dots, un par étape Moteur attendue.
- Un dot rempli (●) signale une étape franchie, un dot vide (○) une étape restante.
- Le franchissement d'une étape (côté Moteur, dans une session active) met à jour le dot correspondant sans recharger la page.
- Le décochage d'une étape met à jour le dot dans le même sens.

> **En situation.** Dans le cocon « Rupture conventionnelle », l'utilisateur voit 5 articles listés. À côté de chaque titre, une rangée de dots :
> - « Indemnité rupture conventionnelle 2026 » → `● ● ● ● ●` (prêt à rédiger)
> - « Calcul indemnité rupture conventionnelle » → `● ● ● ○ ○` (Lieutenants et Lexique restent à faire)
> - « Refus rupture conventionnelle par l'employeur » → `● ○ ○ ○ ○` (juste Discovery)
>
> D'un coup d'œil, l'utilisateur sait où reprendre sans ouvrir un seul article. Quand il verrouille un Capitaine pendant sa session, le 3ᵉ dot de l'article concerné passe de `○` à `●` immédiatement dans la liste affichée à l'arrière-plan — pas besoin de revenir au dashboard et recharger.

→ Conception : [DESIGN-DASH-PROGRESS](./design-registry.md#design-dash-progress)

---

#### FR-DASH-WORKFLOW-CHOICE — Trois portes Cerveau / Moteur / Rédaction sur la landing cocon

La landing page d'un cocon expose les **3 grandes phases de production** : **Cerveau** (stratégie), **Moteur** (validation des mots-clés), **Rédaction** (écriture). L'utilisateur choisit librement par laquelle entrer — il n'y a ni ordre imposé ni blocage si une phase précédente n'est pas terminée. Le guidage se fait par les dots de progression et des bannières de transition, pas par des portes désactivées.

**Critères d'acceptation**
- La page d'un cocon affiche 3 portes nommées explicitement « Cerveau », « Moteur », « Rédaction ».
- Cliquer sur une porte ouvre le module correspondant.
- Aucune porte n'est désactivée parce qu'une étape précédente est incomplète.

> **En situation.** L'utilisateur arrive sur la landing du cocon « Rupture conventionnelle » pour la première fois. Il voit les 3 portes et entre par **Cerveau** pour poser sa stratégie (cible, douleur, angle…). Une semaine plus tard, sur un autre cocon « Création d'entreprise » où il a déjà fait Cerveau et Moteur la semaine passée, il entre directement par **Rédaction** sans repasser par les 2 premières portes. Et sur un 3ᵉ cocon récupéré d'un ancien projet où aucune stratégie n'a jamais été posée, il a quand même la possibilité d'entrer directement par **Rédaction** s'il le souhaite — l'app ne bloque pas. Les bannières et les dots lui rappelleront que le Cerveau est vide, mais c'est tout : il garde le libre arbitre.

→ Conception : [DESIGN-DASH-WORKFLOW-CHOICE](./design-registry.md#design-dash-workflow-choice)

---

### 8.3 — Moteur — règles transversales (FR-MOT)

#### FR-MOT-PHASES — Trois phases visuelles Explorer / Valider / Finaliser

Quand l'utilisateur entre dans le Moteur d'un article, il voit ses 6 onglets de travail regroupés en **3 phases visuelles** qui racontent la progression : **① Explorer** (chercher des mots-clés candidats), **② Valider** (décider lesquels garder), **③ Finaliser** (vérifier que tout est prêt avant la Rédaction). Chaque phase est une étape mentale claire, pas une porte qui se ferme.

**Critères d'acceptation**
- La barre de navigation du Moteur affiche 3 groupes étiquetés « Générer », « Valider », « Finaliser ».
- Le groupe « Générer » contient Discovery + Radar ; « Valider » contient Capitaine + Lieutenants + Lexique ; « Finaliser » contient Finalisation.
- L'utilisateur peut toujours voir dans quelle phase il se trouve actuellement, même quand un onglet est ouvert.

> **En situation.** Mardi après-midi, l'utilisateur ouvre l'article « Indemnité rupture conventionnelle 2026 » dans le Moteur. En haut, il voit la rangée d'onglets organisée en 3 groupes numérotés. Le ① « Générer » regroupe Discovery et Radar : c'est là qu'il va aller chercher des idées de mots-clés. Le ② « Valider » regroupe Capitaine / Lieutenants / Lexique : c'est là qu'il choisira. Le ③ « Finaliser » contient une seule étape de vérification avant de passer à la Rédaction. Sans lire la doc, il comprend la séquence en 5 secondes — il sait qu'il va commencer à gauche et finir à droite.

→ Conception : [DESIGN-MOT-PHASES](./design-registry.md#design-mot-phases)

---

#### FR-MOT-FREE-NAV — Navigation libre entre tous les onglets

L'utilisateur peut cliquer **librement** sur n'importe quel onglet du Moteur, dans n'importe quel ordre, à n'importe quel moment. Aucun onglet n'est désactivé tant qu'un article est sélectionné. Les onglets peuvent être *consultés* librement — c'est l'**écriture** (verrouiller, valider, soumettre) qui peut être conditionnée à des étapes précédentes (cf. FR-MOT-SOFT-GATING). L'app guide par les bannières et les dots, jamais par des portes désactivées.

**Critères d'acceptation**
- Cliquer sur un onglet déjà cliqué reste possible, à tout moment.
- Cliquer sur un onglet « en avance » par rapport à la progression workflow l'ouvre quand même — l'utilisateur peut visiter ce qui n'est pas encore rempli.
- Le seul cas où un onglet est désactivé est *« aucun article sélectionné »* — pas *« étape précédente non terminée »*.

> **En situation.** L'utilisateur travaille sur l'article « Calcul indemnité rupture conventionnelle ». Il n'a encore rien fait. Plutôt que de commencer par Discovery, il clique directement sur Lexique pour comprendre à quoi ressemble cette étape. Il regarde, lit l'explication, ferme. Puis il va Capitaine pour poser son mot-clé principal. L'app ne s'est jamais opposée. Quand viendra le moment de *valider* le Lexique, c'est là que l'app dira « tu dois d'abord verrouiller un Capitaine » — pas avant.

→ Conception : [DESIGN-MOT-FREE-NAV](./design-registry.md#design-mot-free-nav)

#### FR-MOT-SOFT-GATING — Verrouillage doux des écritures Phase ②/③

Si la navigation entre onglets est libre, l'app applique un **verrouillage doux** sur les écritures (actions qui figent un choix). Concrètement, **3 verrous** dérivent de l'état d'avancement de l'article :

1. **Tant que le Capitaine n'est pas verrouillé**, l'utilisateur ne peut pas extraire un Lexique. L'onglet reste visible, le bouton d'extraction est désactivé avec un message explicite.
2. **Tant que l'article a déjà des mots-clés validés au niveau cocon** (étape Cerveau aboutie), les onglets Discovery / Radar deviennent verrouillés visuellement — la décision est faite, pas la peine d'y retourner.
3. **Tant que les 3 verrous Phase ② (Capitaine + Lieutenants + Lexique) ne sont pas tous posés**, le bouton « Continuer vers la Rédaction » reste désactivé, avec un tooltip qui liste précisément les étapes manquantes.

**Critères d'acceptation**
- L'utilisateur peut toujours *ouvrir* un onglet, même si une condition d'écriture n'est pas remplie.
- Quand un bouton d'écriture est désactivé pour cause de verrou, il porte un libellé ou un tooltip qui explique *pourquoi* (ex. « Capitaine à verrouiller d'abord »).
- Quand l'utilisateur pose la dernière étape manquante, les boutons précédemment désactivés s'activent dans le même tick — pas besoin de rafraîchir la page.

> **En situation.** L'utilisateur arrive sur l'article « Refus rupture conventionnelle par l'employeur ». Il clique sur Lexique pour voir ce qu'il y a — le panneau s'ouvre normalement mais le gros bouton « Extraire le lexique » est grisé, avec « Verrouille d'abord un Capitaine » écrit dessous. Il file sur l'onglet Capitaine, sélectionne et verrouille « refus rupture conventionnelle employeur ». Il revient sur Lexique : le bouton est devenu actif. À aucun moment l'app ne l'a empêché de *regarder*, mais elle l'a empêché de *commettre une bêtise* — il aurait extrait un lexique sur un Capitaine vide.

→ Conception : [DESIGN-MOT-SOFT-GATING](./design-registry.md#design-mot-soft-gating)

---

#### FR-MOT-ARTICLE-SELECTION — Sélection préalable d'un article pour agir

Le Moteur travaille **toujours sur un article précis**. Tant que l'utilisateur n'a pas choisi un article dans la liste des « Articles suggérés » ou « Articles publiés », les onglets restent désactivés visuellement et les actions ne peuvent pas être déclenchées. Une fois un article sélectionné, les onglets s'activent et la session de travail démarre.

**Critères d'acceptation**
- Tant qu'aucun article n'est sélectionné, les onglets affichent un état désactivé avec une infobulle « Sélectionnez un article ci-dessus ».
- Sélectionner un article active immédiatement les onglets disponibles (selon les autres règles de gating).
- Changer d'article remet à zéro l'état de travail local de la session (sélections temporaires, cards préparées) tout en préservant les données persistées en base.

> **En situation.** L'utilisateur arrive sur le cocon « Rupture conventionnelle ». Il voit la liste des articles, mais aucun n'est sélectionné par défaut. Les onglets en dessous sont visibles mais grisés, et survolés affichent « Sélectionnez un article ci-dessus ». Dès qu'il clique sur « Calcul indemnité rupture conventionnelle », la liste se replie pour laisser la place et les onglets deviennent cliquables. Pas de surprise — la mécanique est lisible.

→ Conception : [DESIGN-MOT-ARTICLE-SELECTION](./design-registry.md#design-mot-article-selection)

---

#### FR-MOT-RECAP-PUBLISHED — Séparation stricte « Articles suggérés » vs « Articles publiés »
En haut du Moteur, deux listes repliables segmentent les articles du cocon courant : **« Articles suggérés »** (articles encore au stade brainstorm Cerveau, jamais entrés dans le pipeline éditorial) et **« Articles publiés »** (articles qui ont franchi le cap, en rédaction ou déjà mis en ligne). Ces deux listes ne doivent **jamais** se chevaucher — un article ne peut figurer que dans une seule des deux à un instant donné.

**Critères d'acceptation**
- La liste « Articles suggérés » ne contient que des articles encore au stade idée (jamais promus dans le pipeline).
- La liste « Articles publiés » ne contient que les articles qui sont entrés en rédaction ou ont été publiés.
- Un article *en cours de travail Moteur* (déjà promu mais pas encore rédigé) n'apparaît dans aucune des deux listes — il vit dans la liste principale de sélection.
- Le contrat est garanti côté serveur, pas via un filtre côté affichage — impossible pour un autre écran de l'app de l'enfreindre par méprise.

**Statut** : active (strict). **Depuis** : 2026-05-11.

> **En situation.** Bug rencontré le 11 mai : l'utilisateur a généré 13 articles via le Cerveau. Sans cette règle, les 13 apparaissaient à la fois dans « Articles suggérés » (parce que la stratégie les compte comme propositions) **et** dans « Articles publiés » (parce qu'ils ont été insérés en base avec un statut par défaut). Confusion totale. Après application de cette règle, les 13 apparaissent uniquement dans « Articles suggérés » — la section « Articles publiés » reste vide tant qu'aucun article n'a été *réellement* promu en rédaction. La liste reflète la réalité du pipeline.

→ Conception : [DESIGN-MOT-RECAP-PUBLISHED](./design-registry.md#design-mot-recap-published)

---

#### FR-MOT-MODE-BIMODAL — Composants Moteur réutilisables en mode workflow ou libre

Chaque composant du Moteur (Capitaine, Lieutenants, Lexique, etc.) fonctionne en **deux modes** :

- **Mode workflow** — un article est sélectionné, l'app applique les seuils contextuels (selon le niveau de l'article : Pilier / Intermédiaire / Spécialisé), émet les checks de progression, persiste les choix utilisateur.
- **Mode libre** — pas d'article sélectionné, seuils par défaut, l'utilisateur peut explorer / tester / comprendre sans rien figer.

L'objectif est de **ne pas dupliquer** un même composant entre l'écran Moteur et un éventuel écran d'exploration libre — la même brique sert dans les deux contextes.

**Critères d'acceptation**
- Le même composant Capitaine fonctionne en mode workflow (article réel) et en mode libre (sans article).
- En mode libre, les boutons d'écriture/verrouillage soit ne sont pas affichés, soit n'ont aucun effet persistant.
- En mode workflow, le composant émet ses checks de progression vers le store.

> **En situation.** Hier, l'utilisateur testait le Capitaine sur un mot-clé hypothétique « avocat divorce Lyon » juste pour voir la qualité des suggestions IA. Aucun article sélectionné — il était en mode libre. Aujourd'hui il l'utilise pour de vrai sur son article « Avocat divorce — choisir le bon » : le même panneau, mais cette fois le bouton « Verrouiller le Capitaine » est actif et son choix sera persisté. Pas deux écrans à apprendre, pas deux logiques.

→ Conception : [DESIGN-MOT-MODE-BIMODAL](./design-registry.md#design-mot-mode-bimodal)

---

#### FR-MOT-CHECKS — Cinq étapes Moteur tracées dans la progression de l'article

Le Moteur écrit automatiquement **5 marqueurs de progression** dans l'avancement de l'article au fil du travail utilisateur : **Discovery effectué**, **Radar effectué**, **Capitaine verrouillé**, **Lieutenants verrouillés**, **Lexique validé**. Ces marqueurs alimentent les dots de progression du dashboard, le gating des étapes suivantes et le bandeau de transition vers la Rédaction.

**Critères d'acceptation**
- Chaque action utilisateur qui termine une étape Moteur (verrouiller, valider, scanner) déclenche l'écriture du marqueur correspondant côté serveur.
- Le retrait d'une étape (déverrouiller un Capitaine, par exemple) retire le marqueur — l'utilisateur peut revenir en arrière.
- Le Moteur ne pose **pas** de marqueur « Finalisation » — l'onglet Finalisation est en lecture seule, il ne produit aucun checkpoint.

> **En situation.** Pendant sa session Moteur sur l'article « Indemnité rupture conventionnelle 2026 », l'utilisateur verrouille son Capitaine vers 14h32. À 14h33 il revient sur le dashboard pour aller chercher un autre cocon — le 3ᵉ dot de progression de l'article est rempli, sans qu'il ait eu à faire quoi que ce soit. À 14h50 il revient, déverrouille le Capitaine pour en tester un autre : le dot redevient vide. La progression suit le geste exact, ni plus ni moins.

→ Conception : [DESIGN-MOT-CHECKS](./design-registry.md#design-mot-checks)

---

#### FR-MOT-CHECKS-CONSTANTS — Catalogue strict des étapes de progression
Les noms des étapes de progression sont définis dans **un catalogue unique** côté code. Chaque nom suit un format strict : un préfixe de workflow (`moteur`, `cerveau`, `redaction`) suivi de l'action en minuscules. Aucun nom hors catalogue n'est accepté côté serveur — une tentative d'écriture avec un nom non conforme est rejetée.

L'objectif utilisateur : **garantir que les dots de progression et les verrous Moteur lisent et écrivent toujours le même nom**, sans risque qu'une string en doublon se balade et fasse mentir l'affichage (« dot vert mais condition non remplie »).

**Critères d'acceptation**
- Toute écriture de progression utilise un nom du catalogue. Une tentative avec un nom inventé est rejetée par le serveur.
- Aucune string littérale n'est dispersée dans le code — tout passe par les constantes définies une seule fois.
- Un test automatique vérifie qu'aucun fichier source de l'app ne contient de nom legacy ou écrit à la main.

**Statut** : active (strict). **Depuis** : prescrit dès origine, renforcé 2026-05-08.

> **En situation.** En mai 2026 un bug visuel surgit : des dots Moteur restaient vides alors que l'utilisateur avait verrouillé son Capitaine, et inversement des dots apparaissaient verts sans action récente. Cause : deux noms cohabitaient en base — l'historique sans préfixe (`capitaine_locked`) et le nouveau préfixé (`moteur:capitaine_locked`). Le code écrivait dans l'un, lisait dans l'autre. La règle a été durcie : un seul format autorisé, un test garde-fou qui scanne tout le code, une migration cleanup sur les articles existants. Plus jamais ce bug.

→ Conception : [DESIGN-MOT-CHECKS-CONSTANTS](./design-registry.md#design-mot-checks-constants)

---

#### FR-MOT-PHASE-TRANSITION — Bandeau d'invitation au passage de phase

Quand une phase du Moteur est terminée (toutes les étapes nécessaires posées), un **bandeau d'invitation** apparaît en haut de l'onglet courant pour proposer à l'utilisateur de passer à la phase suivante. Le bandeau est une suggestion — l'utilisateur peut l'ignorer et continuer à travailler dans la phase actuelle, ou cliquer pour basculer.

**Critères d'acceptation**
- Le bandeau apparaît dès qu'une phase devient « complète » par rapport à ses étapes obligatoires.
- Le bandeau peut être ignoré : l'utilisateur reste sur l'onglet courant tant qu'il n'a pas cliqué dessus.
- Il n'y a **jamais** de redirection automatique — c'est toujours l'utilisateur qui décide.

> **En situation.** L'utilisateur finit de verrouiller ses 4 Lieutenants dans l'onglet Lieutenants. Un bandeau pastel apparaît en haut : « Lieutenants verrouillés. Passer au Lexique ? ». Il a fini sa pause café, il clique. Une autre fois il fait la même action mais veut d'abord re-vérifier sa liste avant de continuer — il ignore le bandeau, reste sur l'onglet, le bandeau ne disparaît pas et ne le harcèle pas non plus. Quand il est prêt il clique, ou il navigue à la main vers Lexique.

→ Conception : [DESIGN-MOT-PHASE-TRANSITION](./design-registry.md#design-mot-phase-transition)

---

#### FR-MOT-NO-AUTO-ACTION — Aucune action automatique au changement d'onglet

L'app ne déclenche **jamais** d'action automatique (appel IA, recherche externe, requête coûteuse) au seul changement d'onglet. Toutes les actions qui consomment du temps ou de l'argent sont **déclenchées explicitement** par un clic utilisateur sur un bouton dédié.

**Critères d'acceptation**
- Ouvrir un onglet n'envoie aucun appel IA ou API externe par effet de bord.
- Chaque action coûteuse est derrière un bouton libellé clairement (« Lancer le scan », « Demander à l'IA », « Extraire le Lexique »…).
- L'app peut afficher des informations *déjà en base* automatiquement, mais ne va pas re-chercher des données nouvelles sans demande explicite.

> **En situation.** L'utilisateur clique successivement sur Discovery, Radar, Capitaine, Lieutenants, Lexique, Finalisation pour faire le tour de l'article. Aucun appel DataForSEO ou Anthropic ne part — son compte n'est pas débité, son écran ne fige pas sur des loaders. Quand il revient sur Capitaine et clique sur « Analyser ce mot-clé », là l'IA est appelée — mais c'est lui qui l'a décidé. Confort total : il sait que naviguer dans l'app ne lui coûte rien.

→ Conception : [DESIGN-MOT-NO-AUTO-ACTION](./design-registry.md#design-mot-no-auto-action)

---

#### FR-MOT-RAW-KPIS — Métriques marché toujours visibles, jamais « 0 » par défaut

Quand une métrique marché (volume de recherche, difficulté, coût par clic, niveau de concurrence) est disponible pour un mot-clé, elle est **toujours affichée brute** — l'utilisateur garde le libre arbitre, l'app ne masque pas une valeur pour orienter son jugement. Quand la valeur est **absente** (l'API externe n'a rien retourné, la donnée n'a jamais été cherchée), l'UI affiche un tiret cadratin (`—`), **jamais** `0` ou `0 €` ou `0 %` qui feraient croire à une valeur réelle nulle.

**Critères d'acceptation**
- Toute carte / panneau affichant une métrique marché expose la valeur brute, sans transformation cachée.
- L'absence de valeur est représentée par `—` (tiret cadratin), avec éventuellement une infobulle qui explique « donnée non disponible ».
- Aucun affichage ne montre `0` quand la valeur réelle est « inconnue ».

> **En situation.** L'utilisateur consulte le mot-clé « zhuangzi rupture conventionnelle » dans le Radar — un mot-clé fantaisiste qu'il a tapé par erreur. DataForSEO n'a aucune donnée. L'app affiche `Vol. —`, `KD —`, `CPC —`, pas `Vol. 0`, `KD 0`, `CPC 0 €`. L'utilisateur comprend immédiatement que la donnée est *inconnue*, pas *nulle*. Il décide en connaissance de cause : soit forcer un re-fetch, soit ignorer ce mot-clé.

→ Conception : [DESIGN-MOT-RAW-KPIS](./design-registry.md#design-mot-raw-kpis)

---

#### FR-MOT-CACHE-CASCADE — Cache consulté avant tout appel externe payant

Avant tout appel à un service externe payant (DataForSEO, Anthropic, Gemini, scraping), l'app consulte **d'abord son propre cache local** :

1. **Cache cross-article permanent** : si la donnée a déjà été cherchée pour un autre article du même mot-clé, elle est réutilisée — pas de double facturation.
2. **Cache à durée de vie** : si la donnée n'est pas dans le cache permanent mais a été demandée récemment, elle est servie depuis un cache à TTL (typiquement 24h à 30 jours selon la nature).
3. **Appel externe** : seulement si les deux niveaux de cache sont vides, l'app paye un appel externe et stocke le résultat dans les deux niveaux pour la prochaine fois.

**Critères d'acceptation**
- Aucun appel externe payant ne part sans que les caches aient été consultés avant.
- Une donnée cherchée pour l'article A sur le mot-clé K est servie depuis le cache si l'article B redemande la même donnée pour K.
- L'utilisateur peut forcer un re-fetch (cf. FR-MOT-EXTERNAL-CACHE-CLEAR) sans toucher aux données métier de ses articles.

> **En situation.** Le 12 mai, l'utilisateur lance un Radar sur « licenciement économique procédure » pour l'article A. DataForSEO est appelé, 0,12 € débité, résultats stockés. Le 15 mai, il fait un nouvel article B sur le même mot-clé : le Radar se peuple instantanément depuis le cache, 0 € débité. Sa facture mensuelle DataForSEO reflète son *exploration*, pas une multiplication artificielle par le nombre d'articles qui partagent un terme.

→ Conception : [DESIGN-MOT-CACHE-CASCADE](./design-registry.md#design-mot-cache-cascade)

---

#### FR-MOT-PAINPOINT-INJECTION — Douleur de l'article injectée dans tous les prompts IA Moteur

Quand l'utilisateur a posé une **douleur** au niveau de l'article dans le Cerveau, cette douleur est automatiquement transmise comme contexte à **toutes les analyses IA du Moteur** (Capitaine, Lieutenants, Lexique). Si aucune douleur n'a été posée, l'IA reçoit « (non défini) » et adapte ses suggestions à un cadre générique.

**Critères d'acceptation**
- Toute analyse IA du Moteur reçoit la douleur de l'article si elle existe.
- Si la douleur est vide, le contexte transmis est explicitement « (non défini) » — pas une chaîne vide silencieuse.
- L'utilisateur n'a rien à faire — le passage de la douleur se fait en arrière-plan, à chaque déclenchement.

**Statut** : active. **Depuis** : 2026-04-28.

> **En situation.** L'utilisateur a renseigné la douleur « calculer mon indemnité sans me faire avoir » sur l'article « Indemnité rupture conventionnelle 2026 » dans le Cerveau. Quand il déclenche l'analyse Capitaine du mot-clé « indemnité rupture conventionnelle 2026 », l'IA reçoit cette douleur en contexte et propose un angle « rassurer + outiller » au lieu d'un angle juridique froid. Sans cette douleur, l'IA aurait suggéré un angle plus générique. Le travail amont du Cerveau profite à toutes les étapes aval — sans effort répétitif.

→ Conception : [DESIGN-MOT-PAINPOINT-INJECTION](./design-registry.md#design-mot-painpoint-injection)

---

#### FR-MOT-STRATEGY-INJECTION — Contexte stratégique du cocon injecté dans tous les prompts IA Moteur

De la même manière que la douleur de l'article (FR-MOT-PAINPOINT-INJECTION), la **stratégie du cocon** (cible, angle, promesse, ton, CTA), posée une seule fois dans le Cerveau au niveau du cocon, est automatiquement injectée dans toutes les analyses IA du Moteur. L'IA ne parle jamais « dans le vide » — elle parle toujours du point de vue d'un cocon précis.

**Critères d'acceptation**
- Toute analyse IA du Moteur reçoit la stratégie du cocon si elle existe.
- Si la stratégie est absente, le contexte stratégique transmis est vide — l'IA travaille en mode générique sans erreur.
- L'utilisateur n'a rien à faire — la stratégie est tirée de la base à chaque déclenchement.

> **En situation.** L'utilisateur a posé une stratégie « ton chaleureux, public salariés inquiets, promesse : tu sais quoi faire en 5 minutes » sur le cocon « Rupture conventionnelle ». Sur chaque article de ce cocon, l'IA Capitaine, Lieutenants, Lexique reçoit ce contexte sans qu'il faille le repérer ou le recopier. Tous les suggestions IA portent la même empreinte éditoriale.

→ Conception : [DESIGN-MOT-STRATEGY-INJECTION](./design-registry.md#design-mot-strategy-injection)

---

#### FR-MOT-CROSS-TAB-PAYLOAD — Continuité des données entre onglets
Les 6 onglets du Moteur sont conçus pour **passer le relais** : ce que l'utilisateur a sélectionné dans un onglet alimente le suivant automatiquement, sans qu'il ait à recopier ou re-saisir.

- Les mots-clés sélectionnés dans **Discovery** sont envoyés au **Radar** quand l'utilisateur clique sur « Envoyer au Radar ».
- Les cartes retenues dans **Radar** sont envoyées au **Capitaine** quand il clique sur « Envoyer au Capitaine ».
- Les root keywords définis dans **Capitaine** sont propagés aux **Lieutenants** quand il clique sur « Envoyer aux Lieutenants ».
- La sélection Lieutenants nourrit la phase **Lexique**.

À chaque passage, l'utilisateur clique un bouton explicite — aucune transition n'est automatique au seul fait d'ouvrir un onglet (cf. FR-MOT-NO-AUTO-ACTION).

**Critères d'acceptation**
- Chaque transition d'onglet à l'autre est déclenchée par un bouton libellé clairement (« Envoyer au … »).
- L'onglet cible affiche directement les données transmises, sans étape de copier-coller.
- Changer d'article remet à zéro la chaîne de transitions en cours — pas de fuite d'un article à l'autre.

> **En situation.** L'utilisateur termine Discovery avec 12 mots-clés cochés. Il clique « Envoyer au Radar » : il bascule sur Radar, les 12 mots-clés sont déjà là, prêts à être scannés. Il scanne, retient 4 cartes, clique « Envoyer au Capitaine » : il bascule sur Capitaine, les 4 cartes sont là. Il verrouille « indemnité rupture conventionnelle 2026 », clique « Envoyer aux Lieutenants » avec 2 root keywords associés : il bascule sur Lieutenants, les root keywords sont déjà saisis. Tout coule, aucune ressaisie.

→ Conception : [DESIGN-MOT-CROSS-TAB-PAYLOAD](./design-registry.md#design-mot-cross-tab-payload)

---

#### FR-MOT-CANNIBALIZATION — Alerte cannibalisation Capitaine au sein d'un même cocon

Quand l'utilisateur explore des mots-clés Capitaine pour un article, l'app **détecte automatiquement** si l'un des candidats est déjà le Capitaine verrouillé d'un autre article du même cocon. Dans ce cas, un badge visuel apparaît sur la carte du mot-clé concerné pour avertir : *« ce mot-clé est déjà pris par un autre article du cocon — risque de cannibalisation SEO »*. L'utilisateur garde le choix final, mais voit le conflit potentiel avant de verrouiller.

**Critères d'acceptation**
- Toute carte Radar / Capitaine affiche un badge « cannibalisation » si son mot-clé est déjà verrouillé sur un autre article du cocon courant.
- Le badge mentionne le slug de l'article concurrent (ou son titre) pour que l'utilisateur puisse retrouver le conflit.
- Quand l'utilisateur verrouille ou déverrouille un Capitaine, la détection est rafraîchie pour tous les articles affichés dans le cocon.

> **En situation.** L'utilisateur travaille sur « Refus rupture conventionnelle par l'employeur ». Le Radar lui propose entre autres « rupture conventionnelle refus employeur ». Une petite pastille orange « ⚠ Déjà sur : Rupture conventionnelle refusée » apparaît sur la carte. L'utilisateur réalise qu'il existe déjà un autre article du cocon sur ce thème. Il évite de verrouiller ce candidat et choisit un mot-clé plus spécifique pour le nouvel article. Pas de cannibalisation involontaire, sa stratégie de cocon reste propre dans Google.

→ Conception : [DESIGN-MOT-CANNIBALIZATION](./design-registry.md#design-mot-cannibalization)

---

#### FR-MOT-EXPLORATION-COUNTS — Compteurs DB par onglet pour mémoire de session

Le Moteur affiche en permanence, dans une barre persistante au-dessus de l'onglet actif, **un compteur par onglet** qui indique combien de données sont déjà persistées en base pour l'article courant (mots-clés explorés au Radar, candidats Capitaine testés, Lieutenants proposés, termes de Lexique extraits). Ces compteurs renseignent l'utilisateur sur ce qu'il peut « recharger » sans tout refaire.

**Critères d'acceptation**
- La barre affiche un chip par onglet avec le compteur DB (« Radar 57 », « Capitaine 31 », etc.).
- Au switch d'article, les compteurs reflètent l'article nouvellement sélectionné sans flash transitoire de l'ancien.
- Après chaque action qui modifie la base (verrouiller, ajouter, retirer), les compteurs se mettent à jour automatiquement.

> **En situation.** L'utilisateur ré-ouvre l'article « Indemnité rupture conventionnelle 2026 » 3 jours après sa dernière session. La barre lui dit : « Radar 57 · Capitaine 31 · Lieutenants 18 · Lexique 12 ». Il sait immédiatement qu'il y a 57 mots-clés Radar déjà persistés, et que cliquer dessus chargera ce qu'il avait travaillé sans déclencher de nouveau scan. Mémoire externalisée — il ne perd jamais son travail entre sessions.

→ Conception : [DESIGN-MOT-EXPLORATION-COUNTS](./design-registry.md#design-mot-exploration-counts)

---

#### FR-MOT-CACHE-PANEL-COUNT — Le compteur DB représente le *total exploré*, pas le *total verrouillé*
Le compteur affiché dans la barre par onglet (cf. FR-MOT-EXPLORATION-COUNTS) répond à la question : *« combien de mots-clés sont sauvegardés sur cet onglet ? »*, pas *« combien sont verrouillés ? »*. Un mot-clé exploré mais non verrouillé compte ; un mot-clé verrouillé compte aussi ; un mot-clé jamais touché ne compte pas. Au survol d'un chip, une infobulle peut détailler le distinguo (« 31 testés · 3 verrouillés »).

**Critères d'acceptation**
- Le chip principal affiche le **total des entrées persistées** pour l'onglet, peu importe leur statut.
- Si l'utilisateur a testé 31 candidats Capitaine sans en verrouiller un seul, le chip Capitaine affiche **31**, pas 0.
- L'infobulle de survol détaille le statut quand il est pertinent.
- L'état « combien verrouillé » reste lisible dans les dots de progression et dans le contenu de l'onglet — pas dans le chip principal.
- L'utilisateur dispose d'un bouton « Recharger DB » comme filet de sécurité quand l'hydratation au mount aurait échoué silencieusement.

**Statut** : active. **Depuis** : 2026-05-12 (sémantique « total DB »). **Historique** : créée 2026-05-08 avec sémantique « verrouillés », pivotée 2026-05-12.

> **En situation.** Bug rencontré le 12 mai : l'utilisateur avait passé sa matinée à explorer 31 candidats Capitaine sans en verrouiller un seul (il hésitait sur l'angle éditorial). Son chip affichait pourtant « Capitaine 0 », ce qui lui a fait croire qu'il avait perdu son travail. Catastrophe. Après correction, le chip affiche maintenant « 31 », avec au survol « 31 testés · 0 verrouillé ». Il voit que son travail est là, et que la décision de verrouillage est juste reportée — pas perdue.

→ Conception : [DESIGN-MOT-CACHE-PANEL-COUNT](./design-registry.md#design-mot-cache-panel-count)

---

#### FR-MOT-EXPLORATIONS-HYDRATATION — Les explorations sont visibles dès qu'elles sont en base, même sans verrou

Quand un utilisateur a exploré des mots-clés Capitaine ou Lieutenants pour un article **sans avoir verrouillé** quoi que ce soit, ces explorations doivent être visibles à la ré-ouverture de l'article — le travail d'exploration ne se perd pas avec l'absence de verrouillage. La règle s'applique à toutes les vues qui dépendent de ces données (panneau Capitaine, panneau Lieutenants, compteurs DB).

**Critères d'acceptation**
- À la ré-ouverture d'un article, les candidats Capitaine déjà testés s'affichent même si aucun Capitaine n'est verrouillé.
- À la ré-ouverture d'un article, les Lieutenants déjà proposés s'affichent même si aucun n'est verrouillé.
- Un article complètement vierge (aucune exploration jamais persistée) reste vierge à la ré-ouverture.
- Le statut d'un candidat Capitaine non-verrouillé est « suggéré », pas « verrouillé ».

**Statut** : active. **Depuis** : 2026-05-12.

> **En situation.** Bug rencontré le 12 mai : l'utilisateur ferme le navigateur après avoir exploré 8 candidats Capitaine sans en verrouiller un. Le lendemain matin il rouvre l'article — Capitaine vide, comme s'il n'avait rien fait. Catastrophe. Après correction, le lendemain matin l'utilisateur retrouve ses 8 candidats listés avec leur analyse IA déjà prête, sans avoir à les retaper ou à re-déclencher l'IA. La discipline « DB-first » porte ses fruits : ce qui est en base est visible, point.

→ Conception : [DESIGN-MOT-EXPLORATIONS-HYDRATATION](./design-registry.md#design-mot-explorations-hydratation)

---

#### FR-MOT-CHECK-RECONCILIATION — Réconciliation défensive des étapes au chargement d'un onglet
Quand l'utilisateur ouvre un onglet Phase ② (Capitaine, Lieutenants, Lexique), l'app **vérifie défensivement** que le marqueur de progression correspondant reflète bien l'état réel des données : si la base dit que l'étape est faite (`completed_checks` contient le marqueur) mais que la donnée associée est en réalité vide (Capitaine sans valeur, Lexique sans termes…), le marqueur est retiré silencieusement. Inversement, si la donnée est présente mais le marqueur absent, il est posé.

L'objectif : éviter les **« dots verts mensongers »** dans le dashboard, qui surviennent quand une modification a contourné le watcher principal (changement de Capitaine, switch d'article au mauvais moment, déverrouillage hors-watcher).

**Critères d'acceptation**
- À l'ouverture d'un onglet Phase ②, l'app compare l'état des données et l'état du marqueur, et corrige toute divergence.
- Si les données et le marqueur sont déjà cohérents, la réconciliation est silencieuse (aucun aller-retour réseau).
- La réconciliation passe par les endpoints existants — pas de mutation directe en base depuis le navigateur.

**Statut** : active. **Depuis** : 2026-05-08.

> **En situation.** Bug rencontré début mai : l'utilisateur avait verrouillé un Capitaine `K1`, puis l'avait changé pour `K2` mais via un chemin qui n'avait pas correctement nettoyé l'ancien marqueur, ni reposé le nouveau. Le dashboard affichait le 3ᵉ dot vert (Capitaine OK) mais les onglets aval refusaient de fonctionner (« Capitaine non verrouillé »). Incohérence visible. Après application de cette règle, à la ré-ouverture de l'onglet Capitaine, l'app vérifie : Capitaine effectif = `K2`, marqueur retiré pour `K1` puis reposé pour l'état courant. Dot vert *vrai*.

→ Conception : [DESIGN-MOT-CHECK-RECONCILIATION](./design-registry.md#design-mot-check-reconciliation)

---

#### FR-MOT-EXTERNAL-CACHE-CLEAR — Bouton « Vider le cache externe » au niveau de l'article

Un bouton accessible dans la barre du Moteur permet à l'utilisateur de **purger** les résultats d'API externes (DataForSEO, scraping, autocomplete, People Also Ask) liés à son article courant. Cette action **ne touche pas** aux données métier de l'utilisateur (explorations Capitaine, Lieutenants, Lexique persistées) — seulement aux réponses cache d'APIs externes. Permet de forcer un re-fetch frais quand l'utilisateur soupçonne une donnée obsolète, sans perdre son travail.

**Critères d'acceptation**
- Le bouton est visible quand un article est sélectionné, et explicite (« Vider le cache externe », pas « Reset »).
- Cliquer purge uniquement le cache externe pour le mot-clé Capitaine courant — les explorations utilisateur restent intactes.
- Après purge, la prochaine recherche externe re-paye un appel API.

> **En situation.** L'utilisateur a verrouillé son Capitaine en mars 2026. En mai, il revient sur l'article et soupçonne que le volume de recherche affiché est obsolète (Google a peut-être changé). Il clique « Vider le cache externe » : les volumes / KD / CPC mémorisés sont effacés, mais son Capitaine, ses Lieutenants verrouillés, son Lexique validé restent intacts. Il re-déclenche le scan Radar : DataForSEO est appelé frais, nouveaux KPIs. Son travail métier n'a pas bougé d'un pixel.

→ Conception : [DESIGN-MOT-EXTERNAL-CACHE-CLEAR](./design-registry.md#design-mot-external-cache-clear)

---

#### FR-MOT-BASKET-DEPRECATED — Le « panier » mémoire est supprimé au profit du DB-first

L'ancien « panier » de mots-clés qui servait à transporter des mots-clés entre onglets sans persistance est **supprimé**. Toutes les transitions cross-onglets passent désormais par la base de données (qui mémorise ce qui a été exploré), conformément au principe DB-first qui sous-tend le Moteur entier.

**Critères d'acceptation**
- Le store et les composants visuels du panier n'existent plus dans le code.
- Les transitions cross-onglets restent fonctionnelles via les structures persistées en base (cf. FR-MOT-CROSS-TAB-PAYLOAD, FR-RAD-DB-FIRST).
- Aucune fonctionnalité utilisateur n'a perdu de capacité — tout ce qui passait par le panier passe maintenant par la base.

**Statut** : active. **Depuis** : 2026-05-11.

> **En situation.** Avant ce nettoyage, l'utilisateur voyait une pastille flottante en bas à droite de l'écran avec « 12 mots-clés en attente » qui survivait dans la session mais disparaissait au reload — frustrant. Maintenant, les mots-clés sont toujours visibles dans l'onglet d'origine (Radar persiste ce qu'il a généré, Capitaine ses explorations) et accessibles à n'importe quelle phase de la session. La pastille flottante n'a plus de raison d'être : tout est en base, tout est visible là où on s'attend à le trouver.

→ Conception : [DESIGN-MOT-BASKET-DEPRECATED](./design-registry.md#design-mot-basket-deprecated)

---

#### NFR-MOT-LEXIQUE-DECOUPLAGE — Lexique et Lieutenants fonctionnent indépendamment

Les deux analyses **Lieutenants** (proposition de sous-mots-clés) et **Lexique** (extraction de vocabulaire) sont conçues pour fonctionner comme deux unités **indépendantes**. L'utilisateur peut déclencher Lexique sans avoir d'abord travaillé Lieutenants, et inversement. Sous le capot, les deux puisent dans un même socle de données neutre (URLs SERP + scrapes HTML) sans dépendance d'ordre entre eux.

**Critères d'acceptation**
- Démarrer le Lexique sur un mot-clé jamais touché par Lieutenants fonctionne sans erreur.
- Démarrer Lieutenants sur un mot-clé jamais touché par Lexique fonctionne sans erreur.
- Si un scrape HTML a déjà été fait pour un usage, l'autre usage le réutilise plutôt que de re-télécharger.

**Statut** : active (implémentée). **Depuis** : 2026-05-09.

> **En situation.** Bug rencontré le 8 mai : l'utilisateur ouvre directement le Lexique sur l'article 64 sans être passé par Lieutenants. L'app jette un 404 — le Lexique cherche des données SERP qui ne sont remplies que par Lieutenants. Symptôme déroutant. Après découplage, le Lexique déclenche son propre fetch SERP si besoin (réutilisé par Lieutenants si appelé après), et fonctionne en autonomie. L'utilisateur peut alterner librement entre les deux onglets sans dépendance cachée.

→ Conception : [DESIGN-MOT-LEXIQUE-DECOUPLAGE](./design-registry.md#design-mot-lexique-decouplage)

---

#### NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION — Schéma de cache mot-clé décomposé en tables spécialisées

L'ancienne table fourre-tout `keyword_metrics` (17 colonnes dont plusieurs JSONB lourds) a été **décomposée** en plusieurs tables à responsabilité unique : métriques numériques pures, URLs SERP, pages HTML scrapées, questions People Also Ask, suggestions autocomplete. Bénéfice utilisateur direct : performance — un panneau Capitaine ne charge plus 500 ko de HTML scrapé pour afficher 4 chiffres.

**Critères d'acceptation**
- Chaque table spécialisée existe avec ses contraintes (clé primaire, clé étrangère, index pertinents).
- Aucune lecture d'un panneau ne tire plus de données que nécessaire (lecture finement scopée).
- La perf de chargement du panneau brief Capitaine est mesurablement améliorée.

**Statut** : active (implémentée). **Depuis** : 2026-05-09. **Bench** : réduction de la charge utile du brief Capitaine de **97,5 %** sur le top 5 des mots-clés du cocon.

> **En situation.** Avant la décomposition, ouvrir le panneau Capitaine d'un mot-clé téléchargeait 500 ko de texte scrapé pour afficher 4 KPIs numériques. Lent, surtout sur connexion mobile. Après décomposition, le panneau charge ~12 ko : volume, KD, CPC, intent. Le scraping HTML n'est lu que quand le Lexique en a besoin pour faire son TF-IDF. Chaque outil n'utilise que ce dont il a besoin.

→ Conception : [DESIGN-MOT-SCHEMA-KEYWORD-DECOMPOSITION](./design-registry.md#design-mot-schema-keyword-decomposition)

---

#### FR-PAIN-IMMUTABLE-AFTER-CEREVEAU — Le point de douleur d'un article ne se modifie qu'au Cerveau *(déplacée depuis §8.6 le 2026-05-12)*

Une fois qu'un article a quitté la phase Cerveau, **son point de douleur ne peut plus être modifié depuis le Moteur ou la Rédaction**. Si l'utilisateur veut changer le painPoint, il doit retourner au Cerveau et le refaire évoluer. Le painPoint est l'input central qui irrigue tout l'aval du pipeline (scoring Pertinence Capitaine, briefs IA, prompts Rédaction) — le modifier en cours de workflow invaliderait silencieusement le travail aval déjà validé.

**Critères d'acceptation**
- Aucun écran Moteur ne propose d'éditer le painPoint de l'article.
- Aucun écran Rédaction ne propose d'éditer le painPoint de l'article.
- L'unique chemin de modification est dans le Cerveau (Stratégie article, édition d'article par lot).

> **En situation.** En plein milieu de sa rédaction, l'utilisateur réalise que la douleur initiale qu'il avait posée ne colle pas. Il revient au Cerveau, ajuste, puis revient à la Rédaction — son Score Pertinence Capitaine sera recalculé live au prochain mount avec la nouvelle douleur. L'opération est explicite, pas un toggle furtif depuis le Moteur.

→ Conception : [DESIGN-MOT-PAIN-IMMUTABLE-AFTER-CEREVEAU](./design-registry.md#design-mot-pain-immutable-after-cereveau)

---

#### FR-API-VOCABULAIRE-SCAN — Le vocabulaire backend distingue « scan » et « validate » *(déplacée depuis §8.6 le 2026-05-12)*

Côté API, le mot **« scan »** désigne l'exploration d'un mot-clé (récupération KPI marché + calcul scoring). Le mot **« validate »** est réservé à un cas spécifique : la validation d'un point de douleur côté Cerveau (route `/keywords/validate-pain`). Cette distinction de vocabulaire empêche les confusions entre « chercher des informations sur un mot-clé » et « valider/verrouiller une décision utilisateur ».

**Critères d'acceptation**
- Les composables et endpoints utilisés pour explorer un mot-clé au Capitaine portent « scan » dans leur nom (`useCapitaineScan`, `POST /api/keywords/:keyword/scan`).
- L'endpoint historique `/keywords/:keyword/validate` n'est plus exposé — seul `/scan` est actif.
- L'endpoint `/keywords/validate-pain` (validation du painPoint) reste fonctionnel et inchangé.

> **En situation.** Un développeur arrivant sur le projet voit dans le code une route `/keywords/:keyword/scan` et comprend immédiatement qu'elle fait une exploration. Plus tard, il voit `/keywords/validate-pain` et sait que c'est un cas particulier de validation, pas une exploration. Le vocabulaire raconte juste.

→ Conception : [DESIGN-MOT-API-VOCABULAIRE-SCAN](./design-registry.md#design-mot-api-vocabulaire-scan)

---

#### FR-MOT-WORKFLOW-GATING-DUAL — Règle de gating à double condition pour Capitaine et Lieutenants *(déplacée depuis §8.6 le 2026-05-12)*

Les étapes Moteur « Capitaine verrouillé » et « Lieutenants verrouillés » ne se valident qu'à **double condition** : le verrouillage de la décision utilisateur ET la livraison de l'artefact dérivé attendu par la Rédaction. Pour Lieutenants notamment, cocher un Lieutenant ne suffit pas — il faut aussi que la structure Hn de l'article soit non-vide. Sans cette double condition, l'étape ne se valide pas et la transition vers la Rédaction reste bloquée.

**Critères d'acceptation**
- L'étape « Lieutenants verrouillés » est posée seulement si au moins un Lieutenant a un statut verrouillé **et** que la structure Hn de l'article est renseignée.
- Décocher tous les Lieutenants ou effacer la structure Hn retire l'étape automatiquement.
- À l'ouverture de l'onglet, si la base contient l'étape mais qu'une des deux conditions n'est plus vraie, l'app la retire (réconciliation défensive — cf. `FR-MOT-CHECK-RECONCILIATION`).

> **En situation.** L'utilisateur coche son premier Lieutenant — l'étape ne passe pas encore au vert dans le récap, parce que la structure Hn est encore vide. Il déclenche la recommandation IA structure Hn, la valide. Au moment où la structure devient non-vide, le 4ᵉ dot Moteur passe à `●`. Le check ne ment jamais sur ce qui est réellement disponible pour la Rédaction.

→ Conception : [DESIGN-MOT-WORKFLOW-GATING-DUAL](./design-registry.md#design-mot-workflow-gating-dual)

---

#### FR-MOT-LOCK-DERIVED — L'état « verrouillé » d'un onglet est dérivé de la base, pas dupliqué en mémoire *(déplacée depuis §8.6 le 2026-05-12)*

Côté composants Capitaine et Lieutenants, l'état « est-ce que c'est verrouillé ? » est **dérivé en lecture du store** (qui reflète la base), pas dupliqué dans une variable locale. Évite la double source de vérité qui demandait avant des watchers de synchronisation manuelle et générait des incohérences quand l'utilisateur basculait rapidement entre onglets.

**Critères d'acceptation**
- Aucun composant n'a une variable locale qui « copie » l'état de verrouillage stocké en base.
- L'état est exposé comme une dérivation réactive du store, sans écriture impérative.

> **En situation.** L'utilisateur déverrouille un Lieutenant, change d'onglet, revient — le composant ne fait pas une rapide « valeur incohérente » avant de se synchroniser. Il affiche immédiatement l'état correct parce qu'il le lit directement à la source.

→ Conception : [DESIGN-MOT-LOCK-DERIVED](./design-registry.md#design-mot-lock-derived)

---

#### FR-MOT-DISPLAY-FROM-STORE — Les composants UI live lisent depuis le store, pas depuis des props figées *(déplacée depuis §8.6 le 2026-05-12)*

Les composants UI du Moteur qui affichent des données vivantes (mot-clé Capitaine verrouillé, étapes Moteur cochées) **lisent ces données depuis le store**, pas depuis des props passées par le parent. Les props restent acceptables pour les données figées (titre article, type d'article, mot-clé suggéré initial). Bénéfice : quand l'utilisateur déclenche une action qui mute le store (verrouiller, cocher), l'affichage se met à jour partout dans la même session sans recharger ni rebuilder le parent.

**Critères d'acceptation**
- Un changement de mot-clé Capitaine se reflète immédiatement dans le récap Moteur et l'en-tête du Lexique, sans reload de page.
- Un changement d'étape Moteur (Discovery / Radar / Capitaine / Lieutenants / Lexique) se reflète immédiatement sur les dots de progression du dashboard et du tree, sans reload.
- Un switch d'article propre, sans bleed-through (l'article B n'affiche jamais le Capitaine de l'article A).

> **En situation.** L'utilisateur verrouille « keyword X » au Capitaine. Dans la même seconde, le bandeau de récap en haut affiche « X », le titre du panneau Lexique affiche « X », le dot Moteur 3 passe à `●`. Aucune action manuelle, aucun reload — la réactivité du store fait le travail.

→ Conception : [DESIGN-MOT-DISPLAY-FROM-STORE](./design-registry.md#design-mot-display-from-store)

---

#### FR-UI-VOCABULAIRE-VERROUILLER — Les boutons d'action de figeage utilisent « Verrouiller » *(déplacée depuis §8.6 le 2026-05-12)*

Dans l'interface du Moteur, les boutons qui actent une décision utilisateur de figer un mot-clé / une sélection portent le libellé **« Verrouiller »**. Le mot « Valider » n'apparaît plus dans l'UI du workflow Moteur — il restait ambigu (« valider une recherche » vs « verrouiller une décision »). Côté UX, l'utilisateur **verrouille** ses choix au Moteur.

**Critères d'acceptation**
- Le bouton du Capitaine est libellé « Verrouiller ce mot-clé ».
- Le bouton des Lieutenants est libellé « Verrouiller les Lieutenants ».
- Le bouton du Lexique est libellé « Verrouiller le Lexique ».
- Les boutons « Déverrouiller » restent libellés ainsi (cohérents avec le verbe inverse).

> **En situation.** L'utilisateur arrive sur le Capitaine après une journée à scanner des candidats. Il décide de figer son choix. Le bouton dit « Verrouiller ce mot-clé » — le mot raconte exactement le geste qu'il fait. Pas d'ambiguïté avec une étape technique de validation.

→ Conception : [DESIGN-UI-VOCABULAIRE-VERROUILLER](./design-registry.md#design-ui-vocabulaire-verrouiller)

---

### 8.4 — Moteur — Discovery (FR-DIS)

#### FR-DIS-SOURCES — Sept sources de mots-clés à partir d'un mot-clé racine

L'utilisateur saisit un mot-clé racine (par défaut, le mot-clé de l'article courant) puis lance une **découverte** qui interroge en parallèle sept sources complémentaires de suggestions : quatre angles Google Suggest (alphabet A-Z, questions, intentions, prépositions), une génération IA par Claude, une remontée DataForSEO et une génération courte-traîne IA pensée pour les questions PAA. Chaque source produit une liste indépendante affichée dans une section dédiée avec son compteur. L'objectif est de **produire des candidats** — pas encore de les qualifier SEO.

**Critères d'acceptation**
- L'écran Discovery affiche un champ « mot-clé racine » pré-rempli avec le mot-clé de l'article courant et un bouton « Lancer la découverte ».
- Après lancement, sept sections distinctes apparaissent : Alphabet (A-Z), Questions, Intent Modifiers, Prepositions, IA Claude, DataForSEO, Courte-traîne IA (PAA-friendly).
- Chaque section affiche un compteur entre parenthèses, **toujours visible** — y compris quand la section est vide (« (0) »).
- Une section vide peut afficher un bouton d'action inline (par exemple « Générer » sur la courte-traîne) qui relance uniquement cette source.
- Un mot-clé qui apparaît dans plusieurs sources est marqué multi-source (badge `×N`) et remonte en tête de liste filtrée.
- Les sections sont individuellement repliables/dépliables.

> **En situation.** Mardi matin, l'utilisateur travaille sur l'article « Indemnité rupture conventionnelle 2026 » dans le cocon « Rupture conventionnelle ». Il ouvre Discovery, le champ racine est déjà rempli avec « indemnité rupture conventionnelle ». Il clique « Lancer la découverte » et voit les 7 sections se remplir progressivement : Alphabet pose 78 suggestions, Questions 32, IA Claude 18, DataForSEO 64… La section « Courte-traîne IA » reste à `(0)` mais affiche un bouton « Générer » sur le côté droit du header — il clique, et 22 questions précises arrivent (« quelle indemnité si je refuse une rupture conventionnelle », « comment calculer plafond indemnité rupture conventionnelle 50 ans »…). Le mot-clé « calcul indemnité rupture conventionnelle 2026 » apparaît avec un badge `×3` parce qu'il sort à la fois de l'Alphabet, de Claude et de DataForSEO — signal fort, l'utilisateur le repère immédiatement.

→ Conception : [DESIGN-DIS-SOURCES](./design-registry.md#design-dis-sources)

---

#### FR-DIS-RELEVANCE-FILTER — Filtre de pertinence sémantique pour écarter le hors-sujet

Les sept sources produisent souvent du bruit : des mots-clés qui partagent un mot avec la racine mais traitent d'un sujet adjacent (homonymie, contexte différent, douleur opposée). L'utilisateur dispose d'un **filtre de pertinence** activé par défaut, qui interroge un modèle IA pour décider, mot-clé par mot-clé, s'il a sa place dans un article sur le sujet et — quand un point de douleur est défini — s'il correspond à la situation décrite. Les mots-clés jugés hors-sujet sont masqués par défaut (compteurs séparés) tout en restant accessibles si l'utilisateur désactive le filtre (libre arbitre absolu). Une bannière prévient si le filtre semble avoir échoué (presque tout passe).

**Critères d'acceptation**
- Un toggle « Filtre de pertinence » est visible en tête de Discovery, activé par défaut.
- Pendant le scoring, une barre de progression indique l'avancement (« Filtrage 1/2 · 240/520 »).
- Une fois le filtre terminé, un compteur consolidé affiche « X pertinents / N total » et un badge « X hors-sujet masqués » quand certains mots-clés sont rejetés.
- Le bouton toggle réaffiche/masque les mots-clés hors-sujet sans relancer le scoring.
- Quand de nouveaux mots-clés arrivent (par exemple une source plus lente), ils sont scorés **à leur tour** sans re-scorer ceux déjà classés.
- Si un point de douleur est défini sur l'article, le filtre l'utilise comme critère éliminatoire supplémentaire (un mot-clé peut être sur-sujet mais hors-douleur, et sera alors masqué).
- Si plus de 90 % des mots-clés sont marqués pertinents sur un corpus d'au moins 20 mots, une bannière d'avertissement signale un filtrage probablement défaillant.

> **En situation.** Sur l'article « Indemnité rupture conventionnelle 2026 », la racine « indemnité rupture conventionnelle » produit aussi des suggestions comme « indemnité licenciement économique » (sujet adjacent), « indemnité chômage rupture conventionnelle » (sujet voisin mais qui pourrait éloigner du sujet de l'article), ou « indemnité kilométrique » (homonymie totale via le mot « indemnité »). L'utilisateur voit en haut de Discovery « 312 pertinents / 487 total · 175 hors-sujet masqués » — le filtre a fait son travail, il évite de s'épuiser à lire 487 lignes. S'il veut vérifier ce qui a été écarté, un clic sur le toggle réaffiche tout. Sur un autre article où le point de douleur est « je ne sais pas si on peut me refuser une rupture conventionnelle », le filtre rejette aussi « comment négocier le montant de la rupture conventionnelle » (sujet voisin mais douleur différente) — l'utilisateur garde la main pour l'inclure quand même s'il le souhaite en désactivant le filtre.

→ Conception : [DESIGN-DIS-RELEVANCE-FILTER](./design-registry.md#design-dis-relevance-filter)

---

#### FR-DIS-AI-ANALYSIS — Analyse IA pour proposer une sélection stratégique

Une fois la découverte lancée et filtrée, l'utilisateur peut demander à l'IA de **lire toute la liste pertinente et de lui proposer une sélection stratégique** de 20 à 30 mots-clés à pousser vers le Radar. L'IA reçoit le contexte business (secteur, audience, services), le mot-clé racine, le point de douleur de l'article et la totalité des mots-clés pertinents pré-filtrés ; elle rend une liste curatée avec, pour chaque mot-clé retenu, une explication courte (« pourquoi ce mot-clé ») et une priorité (haute / moyenne / basse). Le panneau IA est **visible en permanence** (état d'invitation, en cours, succès, erreur) — il ne disparaît jamais, son contenu change.

**Critères d'acceptation**
- Un panneau « Analyse IA » est rendu à l'écran dès l'ouverture de Discovery, même tant qu'aucune analyse n'a été déclenchée (état d'invitation).
- Le bouton « Analyser les résultats pertinents » est désactivé tant qu'aucune découverte n'a été lancée ; le panneau affiche un message qui invite à lancer la découverte.
- Le bouton est désactivé pendant que le filtre de pertinence travaille ; le panneau dit « Filtrage en cours… ».
- Le bouton est désactivé si la liste pertinente est vide ; le panneau invite à élargir la recherche ou désactiver le filtre.
- Pendant l'analyse, le panneau bascule en mode « streaming » avec spinner.
- Une fois l'analyse rendue, chaque mot-clé proposé est affiché avec son raisonnement court, sa priorité, et une case à cocher individuelle. Un bouton « tout cocher / tout décocher » est proposé.
- En cas d'échec, un état d'erreur est affiché à la place — pas de zone vide silencieuse.
- L'analyse réussie est sauvegardée avec la découverte (cf. `FR-DIS-CACHE`) — elle ressort intacte au retour sur le même mot-clé racine sans nouvel appel IA.

> **En situation.** Toujours sur l'article rupture conventionnelle, l'utilisateur a maintenant 312 mots-clés pertinents — trop pour les passer un par un. Il clique « Analyser les résultats pertinents ». Le panneau bascule en mode chargement (« L'IA lit le pool… »), puis 4-5 secondes plus tard, 26 mots-clés s'affichent avec leur explication. Trois priorités sont remontées en haut (haute) : « calcul indemnité rupture conventionnelle 2026 », « plafond indemnité rupture conventionnelle 2026 », « simulation indemnité rupture conventionnelle ». Sous chacun, l'IA explique en une phrase : « capture directement la douleur du calcul + référence l'année courante, intent commercial fort ». L'utilisateur survole, lit, décoche celui qu'il a déjà couvert dans un autre article du cocon, en ajoute deux autres venant des sections sources, et clique « Envoyer au Radar » avec 25 mots-clés sélectionnés. Le panneau IA reste affiché, son contenu intact — il peut y revenir plus tard.

→ Conception : [DESIGN-DIS-AI-ANALYSIS](./design-registry.md#design-dis-ai-analysis)

---

#### FR-DIS-CACHE — Reprise d'une exploration déjà faite sans recoûter d'appels

Toute découverte aboutie (sources + filtre + éventuelle analyse IA) est **sauvegardée automatiquement** pour 30 jours, indexée par le mot-clé racine. Quand l'utilisateur revient sur le même mot-clé racine — même session, autre session, autre article du même cocon — Discovery détecte la sauvegarde et affiche un bandeau : « Dernière analyse du DD/MM/YYYY · N mots-clés · analyse IA incluse » avec deux boutons : **Charger** (reprend la découverte intacte sans rappeler les APIs externes) ou **Rafraîchir** (efface la sauvegarde et relance tout). Permet de reprendre un travail interrompu, de comparer deux articles d'un même cocon, ou simplement d'économiser le crédit API DataForSEO et Claude.

**Critères d'acceptation**
- Quand l'utilisateur tape un mot-clé racine dans le champ, un bandeau apparaît dans la seconde qui suit si une sauvegarde existe pour ce mot-clé.
- Le bandeau affiche la date de dernière analyse, le nombre de mots-clés sauvegardés, et indique si une analyse IA est incluse.
- Le bouton « Charger » réhydrate les sept sections, le filtre de pertinence, et l'analyse IA sans aucun appel à DataForSEO ni à Claude.
- Le bouton « Rafraîchir » supprime la sauvegarde et remet l'écran à zéro (l'utilisateur peut relancer une découverte fraîche).
- La sauvegarde est automatique : à la fin du dernier appel (toutes sources + filtre terminés), la découverte est persistée sans action utilisateur.
- Une sauvegarde plus vieille que 30 jours n'est plus proposée à la reprise (elle est considérée périmée).

> **En situation.** Jeudi, l'utilisateur reprend le travail sur le cocon « Rupture conventionnelle » mais cette fois sur l'article « Calcul indemnité rupture conventionnelle ». Il ouvre Discovery, tape « indemnité rupture conventionnelle » dans le champ racine, et instantanément un bandeau apparaît : « Dernière analyse du 12/05/2026 · 487 mots-clés · analyse IA incluse ». C'est sa découverte de mardi qu'il avait faite pour l'article voisin du même cocon — exactement la matière dont il a besoin. Il clique « Charger », les 7 sections se remplissent en un instant, l'analyse IA des 26 mots-clés est là, intacte. Zéro appel API, zéro attente. Il commence à sélectionner ses mots-clés pour ce nouvel article — toujours dans le même cocon, donc même contexte sémantique. Trois semaines plus tard sur un autre article, le bandeau ne s'affiche plus : la sauvegarde a expiré, il relance une découverte fraîche.

→ Conception : [DESIGN-DIS-CACHE](./design-registry.md#design-dis-cache)

---

#### FR-DIS-SEND-TO-RADAR — Envoi de la sélection vers l'onglet Radar

Une fois l'utilisateur satisfait de sa sélection (cases cochées dans les sections sources et/ou dans l'analyse IA), un **bouton sticky « Envoyer au Radar »** affiche en permanence le nombre de mots-clés sélectionnés et lance le transfert. Le transfert écrit les mots-clés dans l'exploration Radar de l'article courant, navigue automatiquement vers l'onglet Radar pour que l'utilisateur continue le travail de qualification SEO, et marque la première étape Moteur (« Discovery faite ») comme franchie sur l'article.

**Critères d'acceptation**
- Un bouton « Envoyer au Radar » est affiché en bas d'écran (sticky) dès qu'au moins un mot-clé est sélectionné, et masqué sinon.
- Le bouton affiche le compteur de mots-clés sélectionnés (toutes sections + analyse IA confondues, dédupliqués).
- Le clic envoie la liste à l'exploration Radar de l'article courant **avant** de naviguer (l'utilisateur n'arrive sur Radar qu'une fois l'écriture aboutie).
- L'utilisateur atterrit sur l'onglet Radar avec la liste pré-remplie, prête à scanner.
- L'étape « Discovery faite » devient cochée sur l'article (visible immédiatement dans les dots de progression — cf. `FR-DASH-PROGRESS`).
- Le transfert est idempotent : envoyer deux fois la même sélection ne crée pas de doublons côté Radar.

> **En situation.** Toujours sur « Indemnité rupture conventionnelle 2026 ». L'utilisateur a coché 25 mots-clés répartis entre l'Alphabet, DataForSEO et l'analyse IA. Un bouton orange flotte en bas de l'écran : « Envoyer au Radar (25) ». Il clique. La liste est écrite côté article (il pourrait la retrouver intacte au reload sur l'onglet Radar), puis Discovery bascule automatiquement sur l'onglet Radar — les 25 mots-clés y sont déjà listés, prêts à scanner. De retour sur le dashboard, il voit que le premier dot du Moteur est passé de `○` à `●` pour cet article. Il n'a pas eu à cocher « Discovery faite » manuellement — l'action de transfert l'a fait pour lui.

→ Conception : [DESIGN-DIS-SEND-TO-RADAR](./design-registry.md#design-dis-send-to-radar)

---

#### FR-DIS-CHECK — Étape Moteur « Discovery faite » posée à l'envoi au Radar

Le franchissement de l'étape Discovery dans le workflow Moteur est **dérivé d'une action utilisateur explicite** : envoyer au moins une sélection vers le Radar. Tant qu'aucun envoi n'a été fait, l'étape reste à `○`, même si une découverte a été lancée et que des mots-clés ont été cochés. Le geste « j'envoie ce que j'ai retenu » est ce qui fait avancer le workflow — pas le geste « j'ai exploré ». Cette discrétisation évite que l'étape se marque accidentellement quand l'utilisateur tâtonne en Discovery sans rien valider.

**Critères d'acceptation**
- L'étape `moteur:discovery_done` est posée **uniquement** au moment où l'utilisateur clique « Envoyer au Radar » avec au moins un mot-clé sélectionné.
- Lancer une découverte ne pose pas l'étape (libre exploration sans engagement).
- Cocher/décocher des mots-clés sans envoyer ne pose pas l'étape.
- Rafraîchir le cache ou recharger la page ne pose pas l'étape.
- Une fois posée, l'étape reste posée même si l'utilisateur revient en Discovery, modifie sa sélection et renvoie : le second envoi est idempotent.

> **En situation.** L'utilisateur lance une découverte sur un nouvel article pour explorer, voit les résultats mais finit par changer d'avis sur l'angle et décide de ne pas continuer avec ce mot-clé racine. Il ferme le Moteur, revient au dashboard : l'article a toujours `○ ○ ○ ○ ○` — l'app n'a pas marqué son tâtonnement comme une étape franchie. Plus tard, sur un autre article, il fait une vraie découverte, sélectionne 18 mots-clés et clique « Envoyer au Radar ». Cette fois, retour au dashboard : `● ○ ○ ○ ○`. Le geste qui fait avancer le workflow est l'envoi — pas l'exploration.

→ Conception : [DESIGN-DIS-CHECK](./design-registry.md#design-dis-check)

---

#### ~~FR-DIS-BASKET~~ — DEPRECATED 2026-05-11

~~Description historique : un « panier » mémoire (`useMoteurBasketStore`) accumulait les mots-clés cochés en Discovery pour les transmettre au Radar.~~

**Statut :** **deprecated** (superseded par `FR-MOT-BASKET-DEPRECATED` et `FR-RAD-DB-FIRST`). Le transfert Discovery → Radar passe désormais directement par l'exploration Radar persistée en base (`radar_explorations`), sans étape intermédiaire mémoire. Audit 2026-05-11 : sur les 6 sources typées historiquement supportées par le basket, une seule était effectivement alimentée (`discovery`) — redondance pure. Voir `FR-MOT-BASKET-DEPRECATED`, `FR-RAD-DB-FIRST`, `docs/data-flows/radar-keywords.md` §2.4.

---

#### ~~FR-DIS-INTENT-SCAN~~ — RELOCATED 2026-05-12

~~Ancien emplacement d'une FR qui décrivait l'endpoint `POST /api/keywords/intent-scan` (analyse SERP avancée + résonance) consommé par le Radar pour le scoring de résonance topic/PAA.~~

**Statut :** **relocated**. Le scan d'intention n'est pas une fonctionnalité de Discovery — il est consommé par le Radar (composable `useResonanceScore`, panneau `RadarPanel`). La capacité est désormais portée par `FR-RAD-RESONANCE` (§8.5). Cette FR ne crée plus de contenu propre à Discovery — voir `FR-RAD-RESONANCE`. Drift consigné : `DRIFT-014` dans `drift-code-vs-doc.md`.

---

### 8.5 — Moteur — Radar (FR-RAD)

> **Rôle de l'onglet.** Le Radar est le deuxième temps de la Phase ① Explorer. L'utilisateur arrive ici avec une liste de mots-clés candidats (envoyée depuis Discovery ou ajoutée à la main) et passe à la qualification SEO : il lance un **scan** qui mesure le potentiel marché de chaque mot-clé (volume, difficulté, intent, autocomplete, questions PAA), évalue sa pertinence par rapport au point de douleur de l'article, et pousse finalement une sélection vers le Capitaine pour la validation finale.

#### FR-RAD-GENERATE — Génération IA d'un petit jeu de mots-clés courte-traîne

L'IA peut produire en un appel rapide une vingtaine de mots-clés courte-traîne pertinents pour un article donné, à partir de son titre, de son mot-clé principal et du point de douleur. Cette capacité est aujourd'hui consommée par Discovery (section « courte-traîne IA »), plus directement par Radar — mais la route backend reste partagée et fait partie du périmètre Radar pour des raisons historiques.

**Critères d'acceptation**
- L'appel renvoie une liste de 1 à 25 mots-clés, dédupliqués sur leur forme normalisée (minuscules, accents retirés).
- Chaque mot-clé est accompagné d'une raison courte (« pourquoi ce mot-clé »).
- Une réponse vide ou en erreur ne casse pas l'écran appelant — elle se traduit par une section vide affichable avec un bouton « Régénérer ».
- Le coût IA de l'appel est journalisé dans la pile d'activité.

> **En situation.** Le consultant SEO travaille sur « Indemnité rupture conventionnelle 2026 ». La section « courte-traîne IA » de Discovery affiche `(0)` et un bouton « Générer ». Il clique : l'IA renvoie 22 questions précises (« quelle indemnité si je refuse une rupture conventionnelle », « comment calculer plafond indemnité rupture conventionnelle 50 ans »…). Si l'IA échoue, la section reste à `(0)` et le bouton redevient « Générer » — l'utilisateur peut réessayer.

→ Conception : [DESIGN-RAD-GENERATE](./design-registry.md#design-rad-generate)

---

#### FR-RAD-DB-FIRST — La liste des mots-clés Radar vit en base, pas en mémoire

L'exploration Radar d'un article (mots-clés en attente de scan + mots-clés déjà scannés avec leurs métriques) est **persistée en base** et constitue la **seule source de vérité**. Quand l'utilisateur ouvre l'onglet Radar, la liste affichée vient de la base — pas d'un état mémoire qui pourrait diverger. Chaque ajout, retrait ou scan écrit en base avant de toucher l'affichage, garantissant que le rechargement de la page ou le retour sur l'article retrouve exactement l'état laissé.

**Critères d'acceptation**
- À l'ouverture de l'onglet Radar, la liste « Mots-clés à scanner » et la liste « Mots-clés scannés » viennent d'un fetch base.
- Ajouter un mot-clé écrit en base **avant** que la chip apparaisse à l'écran.
- Retirer un mot-clé écrit en base **avant** que la chip disparaisse.
- Recharger la page sur l'onglet Radar d'un article qui contenait des mots-clés en attente les retrouve sans intervention.
- Naviguer entre articles dans la même session affiche la liste correcte du nouvel article (l'app détecte le changement d'article au plus tôt, pas seulement au clic sur l'onglet Radar).
- Pendant le chargement initial, l'application n'affiche pas brièvement « 0 mots-clés » avant le bon chiffre — un fallback prudent évite ce flash.

> **En situation.** Le consultant SEO travaille sur « Indemnité rupture conventionnelle 2026 », envoie 25 mots-clés depuis Discovery vers le Radar. Mardi soir il ferme l'onglet sans avoir lancé le scan. Jeudi, il rouvre l'app : direct sur le cocon Rupture conventionnelle, clic sur l'article, clic sur l'onglet Radar — les 25 mots-clés sont là, exactement comme il les avait laissés. Pas de re-import depuis Discovery, pas de cache mémoire à reconstruire. Il enchaîne sur le scan.

→ Conception : [DESIGN-RAD-DB-FIRST](./design-registry.md#design-rad-db-first)

---

#### FR-RAD-MANUAL-ADD — Ajout d'un mot-clé à la main dans la liste à scanner

L'utilisateur peut ajouter un mot-clé à la main dans la liste « Mots-clés à scanner » sans repasser par Discovery ni regénérer toute la sélection IA. Un champ texte unitaire (loupe + champ + bouton « + Ajouter ») est rendu en haut de la section. L'envoi est idempotent — un mot-clé déjà présent ne crée pas de doublon et déclenche un message inline.

**Critères d'acceptation**
- Un champ texte avec placeholder « Ajouter un mot-clé à scanner… » est visible en haut de la liste « Mots-clés à scanner ».
- Saisir un mot-clé + Entrée (ou clic « + Ajouter ») le pousse en base puis fait apparaître la chip dans la liste.
- Saisir un mot-clé déjà présent affiche un message inline « Ce mot-clé est déjà dans la liste » sans créer de doublon.
- Le champ est désactivé tant qu'aucun article n'est sélectionné (cas mode libre).
- Touche Entrée et clic sur le bouton « + Ajouter » ont exactement le même effet.
- La saisie est normalisée pour la déduplication (trim + minuscules), refuse une chaîne vide.

> **En situation.** Pendant qu'il prépare le scan de son article rupture conventionnelle, l'utilisateur se souvient d'une variante intéressante qu'il n'avait pas vue dans Discovery : « rupture conventionnelle indemnité supra légale 2026 ». Il tape le mot-clé dans le champ en haut de la liste, appuie sur Entrée, la chip apparaît immédiatement avec les autres. Pas besoin de retourner dans Discovery et de relancer une exploration.

→ Conception : [DESIGN-RAD-MANUAL-ADD](./design-registry.md#design-rad-manual-add)

---

#### FR-RAD-AUTOCOMPLETE-PER-KEYWORD — Suggestions Google captées par mot-clé scanné

Quand l'utilisateur lance un scan, l'application interroge Google Suggest **pour chaque mot-clé** scanné individuellement (et pas seulement pour le sujet général de l'article). Le compteur « suggestions autocomplete » affiché dans la carte d'un mot-clé reflète donc bien la richesse propre de ce mot-clé sur Google, pas celle du sujet de l'article. Les résultats sont mis en cache long terme par mot-clé — un mot-clé déjà scanné dans un autre article du même cocon ne refait pas l'appel.

**Critères d'acceptation**
- Chaque mot-clé scanné déclenche une requête autocomplete dédiée à Google Suggest.
- La carte d'un mot-clé affiche un compteur autocomplete cohérent avec ce mot-clé (pas le compteur du sujet de l'article).
- Un mot-clé déjà capté en autocomplete dans la fenêtre de cache (90 j) ne refait pas l'appel — économie d'API.
- Le scan reste rapide sur un cocon typique (10-25 mots-clés) grâce au cache et à la concurrence (3 requêtes parallèles).

> **En situation.** Sur l'article rupture conventionnelle, l'utilisateur scanne 22 mots-clés. La carte de « calcul indemnité rupture conventionnelle 2026 » affiche `Autocomplete (8)` parce que ce mot-clé précis génère 8 suggestions dans Google Suggest. Avant la refonte, la carte aurait montré les suggestions du sujet général « indemnité rupture conventionnelle » — un signal trompeur. Une semaine plus tard sur un article voisin du même cocon, l'autocomplete de « calcul indemnité rupture conventionnelle 2026 » est encore en cache (90 j) : l'appel Google n'est pas refait.

→ Conception : [DESIGN-RAD-AUTOCOMPLETE-PER-KEYWORD](./design-registry.md#design-rad-autocomplete-per-keyword)

---

#### FR-RAD-SCAN-2PASS — Scan d'un mot-clé : sujet large d'abord, puis sujet précis

Quand l'utilisateur lance un scan, chaque mot-clé est passé au crible en deux temps. **Pass 1** capture les signaux SEO bruts : volume, difficulté, intent, suggestions Google et questions PAA scrapées de la SERP. **Pass 2** mesure l'écho thématique de ces signaux par rapport au sujet précis de l'article (le mot-clé partage-t-il les bons mots avec le sujet ?), avec un option « profondeur 1 ou 2 » pour creuser ou non le second niveau de questions PAA.

**Critères d'acceptation**
- L'utilisateur peut choisir entre profondeur 1 (PAA niveau 1 uniquement, ~1 appel SERP par mot-clé) et profondeur 2 (PAA niveau 1+2, ~5 appels SERP par mot-clé).
- Le scan d'un mot-clé renvoie : volume, difficulté, CPC, intent, liste des questions PAA, suggestions autocomplete propres.
- Les questions PAA scrapées sont marquées par leur correspondance avec le sujet de l'article (« exact », « partiel », « hors sujet »).
- Le scan de N mots-clés est exécuté en parallèle limité (3 mots-clés en simultané pour respecter les limites de l'API SERP).
- Les questions PAA déjà scrapées dans les 90 derniers jours pour un mot-clé sont rejouées du cache sans nouvel appel.

> **En situation.** L'utilisateur lance le scan de ses 22 mots-clés avec profondeur 2 (il veut explorer en profondeur les questions associées). 5 minutes plus tard, chaque carte affiche : volume DataForSEO, KD, CPC, intent, plus un arbre de 5-15 questions PAA reliées au mot-clé. Pour « calcul indemnité rupture conventionnelle 2026 » par exemple, il voit « Comment se calcule l'indemnité d'une rupture conventionnelle ? » (PAA niveau 1) qui s'étend en « Comment calculer son indemnité de rupture conventionnelle 2026 ? » (PAA niveau 2, scrapé en sub-SERP) — chacune marquée « exact » parce qu'elles partagent les bons mots avec le sujet.

→ Conception : [DESIGN-RAD-SCAN-2PASS](./design-registry.md#design-rad-scan-2pass)

---

#### FR-RAD-SCORING-BIMODAL — Chaque carte affiche deux scores : Marché et Pertinence

Chaque carte de mot-clé scannée porte **deux scores indépendants** qui répondent à deux questions distinctes :
- **Score Marché (0-100)** : « ce mot-clé est-il intéressant côté SEO ? » — pondère volume de recherche, difficulté, intent commercial, richesse PAA, suggestions autocomplete et CPC.
- **Score Pertinence (0-100)** : « ce mot-clé colle-t-il à la douleur de l'article ? » — pondère l'alignement sémantique avec le point de douleur, les questions PAA qui matchent la douleur, les suggestions autocomplete qui matchent la douleur, les racines morphologiques du mot-clé, et l'intent croisé avec la douleur.

L'utilisateur bascule entre les deux affichages avec un toggle ; la carte affiche dans son ring le score correspondant.

**Critères d'acceptation**
- Le toggle « Marché / Pertinence » bascule l'affichage des cartes entre les deux scores sans relancer le scan.
- Une carte affiche un Score Marché numérique 0-100 dès que le scan est revenu.
- Une carte affiche un Score Pertinence 0-100 si un point de douleur est défini sur l'article ; sinon, elle affiche « — » avec un tooltip explicatif (cf. FR-RAD-SCORE-RING-TOOLTIP).
- Les deux scores peuvent être très différents sur un même mot-clé (ex. un mot très commercial mais hors-douleur a un Score Marché élevé et un Score Pertinence bas).

> **En situation.** Sur l'article rupture conventionnelle, la carte « simulateur indemnité rupture conventionnelle » affiche Score Marché 82/100 (volume élevé, intent commercial, CPC fort) et Score Pertinence 91/100 (matche directement la douleur « je ne sais pas combien je vais toucher »). Inversement, « rupture conventionnelle wikipedia » a Score Marché 65/100 (volume correct) mais Score Pertinence 28/100 (sémantique éloignée de la douleur). L'utilisateur voit en un coup d'œil que le premier mérite la priorité.

→ Conception : [DESIGN-RAD-SCORING-BIMODAL](./design-registry.md#design-rad-scoring-bimodal)

---

#### FR-RAD-RESONANCE — Mesure d'écho thématique entre un mot-clé et le sujet de l'article

Toute la mécanique de scoring repose sur une question : ces mots-clés (ou questions PAA, ou suggestions autocomplete) **résonnent-ils** avec le sujet précis de l'article ? L'outil normalise les chaînes (accents, casse, ponctuation), élague les mots-outils du français (« les », « pour », « comment », ~36 stop-words), puis utilise un stemmer maison qui dépouille les variantes morphologiques (« croissance/croissant », « développement/développer », « stratégie/stratégies » deviennent comparables). Une comparaison bidirectionnelle donne trois niveaux : **total** (≥ 50 % des mots stratégiques du sujet matchent), **partial** (≥ 20 %), **none**. Cette mécanique alimente le scoring Pertinence sur chaque signal SERP capté (PAA, autocomplete) et conditionne l'affichage des badges « Exact / Partiel exact / Sem. partiel / Hors sujet ».

**Critères d'acceptation**
- Un mot-clé pluriel matche son équivalent singulier (« stratégies » ≈ « stratégie »).
- Un mot-clé en -ant/-ement matche sa racine (« croissant » ≈ « croissance »).
- Les mots-outils (les, des, pour, dans, sur, par, comment, pourquoi, quand…) ne comptent pas dans le scoring.
- Trois niveaux possibles pour chaque comparaison : `total`, `partial`, `none`, calculés à partir d'un ratio bidirectionnel.
- La qualité de match est différenciée : `exact` (même mot) ou `stem` (même racine) — utile pour les badges fins.

> **En situation.** Le sujet précis de l'article est « calcul indemnité rupture conventionnelle 2026 ». Une question PAA scrapée est « comment calculer les indemnités d'une rupture conventionnelle ? » — le stemmer ramène « calculer/calcul », « indemnités/indemnité » au même radical, le match est `total`, badge « Exact ». Une autre question, « quels sont les droits du salarié lors d'un licenciement ? », ne partage qu'un mot indirect — match `none`, badge « Hors sujet ». Cette mécanique évite que le scoring soit aveugle aux variations grammaticales de la langue française.

**Note historique** : la FR `FR-DIS-INTENT-SCAN` listée historiquement dans la section Discovery (§8.4) décrivait l'endpoint `POST /api/keywords/intent-scan` qui implémente cette mécanique. Vérification cross-codebase : cet endpoint et le composable `useResonanceScore` sont consommés exclusivement par le Radar (jamais par Discovery). La capacité est désormais portée par cette FR. Voir `DRIFT-014` pour la traçabilité.

→ Conception : [DESIGN-RAD-RESONANCE](./design-registry.md#design-rad-resonance)

---

#### FR-RAD-SCORE-RING-TOOLTIP — Anneau de score circulaire avec explication au survol

Chaque carte de mot-clé affiche son score (Marché ou Pertinence selon le toggle) dans un **anneau circulaire** dont le remplissage reflète la valeur (0-100). Au survol, un tooltip explique le score : décomposition pondérée (5-6 lignes — chaque ligne donne un libellé du signal, son poids et sa contribution). Quand le score est indisponible (`—`), le tooltip explique précisément pourquoi (point de douleur manquant, signaux SERP vides, mot-clé longue traîne pour lequel le calcul ne s'applique pas, etc.).

**Critères d'acceptation**
- Chaque carte affiche un anneau SVG circulaire dont la portion colorée reflète le score 0-100.
- Au survol de l'anneau, un tooltip apparaît avec la décomposition (libellé + poids + valeur du signal).
- Si le score affiché est « — », le tooltip donne une explication contextuelle (douleur manquante / signaux SERP nuls / longue traîne / cause inconnue).
- Un clic sur l'anneau ne déclenche pas l'ouverture d'autres panneaux (l'anneau intercepte le clic pour rester sur l'affichage du tooltip).

> **En situation.** L'utilisateur survole l'anneau d'une carte qui affiche 73/100 en mode Pertinence : le tooltip se déploie avec « Pain alignment 30 % → 84 », « PAA × douleur 25 % → 70 », « Autocomplete × douleur 15 % → 60 », « Racines 20 % → 75 », « Intent × douleur 10 % → 65 ». Il comprend en un regard que la carte tient surtout grâce à son alignement sémantique pain (84). Sur une carte qui affiche « — », il survole et lit : « Définis un point de douleur sur l'article et relance la validation. »

→ Conception : [DESIGN-RAD-SCORE-RING-TOOLTIP](./design-registry.md#design-rad-score-ring-tooltip)

---

#### FR-RAD-PAA-TREE — Questions PAA affichées comme un arbre dépliable

À l'intérieur de chaque carte de mot-clé, les questions PAA scrapées sont rendues comme un **arbre à deux niveaux** : niveau 1 = questions directement scrapées de la SERP du mot-clé ; niveau 2 = questions des sous-SERPs scrapées récursivement pour chaque question de niveau 1. Chaque nœud affiche : la question, un badge de correspondance avec le sujet / la douleur (« Exact », « Partiel », « Sem. partiel », « Hors sujet », « + douleur », « + hors-douleur »), un score sémantique, et le compte de questions enfants. L'utilisateur déplie chaque nœud pour voir la réponse Google ou la liste des sous-questions.

**Critères d'acceptation**
- Quand une carte est dépliée, l'arbre PAA s'affiche sous les KPIs.
- Chaque question affiche son badge de match (correspondance sujet / douleur).
- Quand un score sémantique est calculé, il est affiché en pourcentage sur la question.
- Un indicateur « PAA en cache » apparaît si les questions viennent du cache long terme (pas d'appel SERP réel).
- Niveau 2 visible si la profondeur 2 a été choisie au scan.

> **En situation.** L'utilisateur clique sur la flèche de la carte « calcul indemnité rupture conventionnelle 2026 ». Le body de la carte se déploie : 4 questions PAA niveau 1 apparaissent (« Comment se calcule l'indemnité ? », « Quel est le minimum légal ? »…). Trois sont marquées « Exact + douleur », une est marquée « Partiel ». Chaque question est suivie d'un compteur `(3)`, `(5)`… indiquant qu'elle a des sous-questions niveau 2. Un clic sur le compteur déplie les enfants. Un badge « PAA en cache » discret en haut indique que cette portion vient du cache (pas de coût API).

→ Conception : [DESIGN-RAD-PAA-TREE](./design-registry.md#design-rad-paa-tree)

---

#### FR-RAD-LONGTAIL-GENERATE — Suggestion de longues traînes dérivées des mots-clés scannés

Une fois au moins 2 mots-clés scannés, l'utilisateur peut demander à l'IA de générer une **petite liste de longues traînes** (~10) dérivées des mots-clés validés. La génération combine un calcul déterministe (combinaisons locales des racines) puis un appel IA (Haiku) pour scorer et reformuler ; chaque suggestion vient avec un score de préférence 1-10 et un raisonnement court (« dérivée des racines [a, b] »). Le résultat est mis en cache 7 jours par signature des entrées — relancer la suggestion avec les mêmes mots-clés source ne refait pas l'appel IA.

**Critères d'acceptation**
- Le bouton « Suggérer des longues traînes » est visible si au moins 2 cartes mots-clés sont présentes.
- Le clic produit 10 suggestions maximum, chacune avec un score 1-10 et une explication.
- Une re-génération avec exactement les mêmes mots-clés source utilise le cache (pas de nouvel appel IA).
- Les suggestions sont persistées avec l'exploration Radar — au retour sur l'article, elles sont toujours là.
- Le bouton change de libellé : « Suggérer » au premier rendu → « Régénérer » une fois des suggestions présentes.

> **En situation.** L'utilisateur a scanné 12 mots-clés, satisfait du résultat. Il clique « Suggérer des longues traînes ». 6 secondes plus tard, 10 suggestions s'affichent en bas du Radar : « comment calculer indemnité rupture conventionnelle senior », « simulation indemnité rupture conventionnelle 25 ans ancienneté », etc. Chaque suggestion a un badge score 1-10 et un texte « dérivée de [calcul, indemnité, ancienneté] ». Il en garde 5, décoche les autres.

→ Conception : [DESIGN-RAD-LONGTAIL-GENERATE](./design-registry.md#design-rad-longtail-generate)

---

#### FR-RAD-LONGTAIL-UI — Affichage et sélection des longues traînes

Chaque suggestion de longue traîne est affichée avec une case à cocher, un badge de score 1-10, le mot-clé reformulé et son raisonnement (« dérivée de [roots] »). Les 5 mieux notées sont **pré-cochées** à la première affichage pour faciliter le geste utilisateur. L'état coché/décoché est sauvegardé en base avec l'exploration Radar — au retour, les choix sont préservés.

**Critères d'acceptation**
- Chaque suggestion affiche : checkbox, badge score 1-10, mot-clé, mention « dérivée de [racines] ».
- Les 5 suggestions au score le plus élevé sont pré-cochées au premier rendu.
- L'utilisateur peut cocher/décocher individuellement, l'état est persisté.
- Recharger la page ou revenir plus tard retrouve les choix exactement.

> **En situation.** Suite de la situation précédente : les 5 premières suggestions sont déjà pré-cochées. L'utilisateur décoche la 3ᵉ (qui dérive vers un sujet adjacent), coche la 7ᵉ (qui colle mieux à son angle), ferme l'onglet pour aller boire un café. Au retour, l'exploration Radar est ré-affichée avec ses 4 choix : 4 cochées, pas perdues.

→ Conception : [DESIGN-RAD-LONGTAIL-UI](./design-registry.md#design-rad-longtail-ui)

---

#### FR-RAD-LONGTAIL-REGENERATE — Re-génération des longues traînes avec cache idempotent

Au reload de l'exploration Radar, les longues traînes générées sont **restaurées intactes** avec leur état coché. Le bouton précédemment intitulé « Suggérer » devient « Régénérer » : un clic relance la génération avec les mêmes mots-clés source, mais grâce au cache d'idempotence (7 jours), aucun nouvel appel IA n'est fait si les entrées n'ont pas changé. Si l'utilisateur ajoute/retire un mot-clé source puis régénère, le cache est miss et la génération est refaite.

**Critères d'acceptation**
- Au reload, les suggestions de longues traînes et l'état coché sont restaurés.
- Le bouton affiche « Régénérer » dès lors que des suggestions sont déjà présentes.
- Une régénération sans changement des mots-clés source n'engendre pas d'appel IA (cache hit).
- Une régénération après modification des mots-clés source produit de nouveaux résultats.

> **En situation.** L'utilisateur revient sur son article rupture conventionnelle deux jours plus tard. L'onglet Radar montre ses 12 mots-clés scannés, ses 10 longues traînes avec les 4 toujours cochées. Il clique « Régénérer » par curiosité — la liste réapparaît identique en quelques centaines de millisecondes (cache hit). Il ajoute un nouveau mot-clé à scanner, le scanne, puis recommence « Régénérer » : cette fois, l'IA est rappelée parce que les entrées ont changé, et 10 nouvelles suggestions arrivent.

→ Conception : [DESIGN-RAD-LONGTAIL-REGENERATE](./design-registry.md#design-rad-longtail-regenerate)

---

#### FR-RAD-SEND-CAPTAIN — Envoi de la sélection finale vers l'onglet Capitaine

Une fois la qualification Radar terminée, un bouton « Envoyer au Capitaine » regroupe **toutes les cases cochées** (cartes mots-clés racines cochées **plus** longues traînes cochées), dédoublonne, et les transfère vers la liste de validation du Capitaine. La provenance de chaque mot-clé (Radar, longue traîne, saisie manuelle) est tracée pour analyse ultérieure.

**Critères d'acceptation**
- Le bouton « Envoyer au Capitaine » est visible dès qu'au moins une case est cochée (carte ou longue traîne).
- Le bouton affiche le compteur de mots-clés sélectionnés (dédoublonnés).
- Le clic transfère la liste vers le Capitaine et navigue automatiquement vers cet onglet.
- L'origine de chaque mot-clé (`radar`, `longtail`, `manual`) est conservée pour l'historique.
- Envoyer une sélection vide n'a aucun effet (bouton désactivé).

> **En situation.** L'utilisateur a coché 8 mots-clés racines et 4 longues traînes — 12 au total, 0 doublon. Il clique « Envoyer au Capitaine (12) ». L'app navigue vers l'onglet Capitaine, les 12 mots-clés y sont listés prêts à être validés un par un. Plus tard, il consulte une vue analytique : « 8 viennent du Radar, 4 des longues traînes » — il peut décider d'investir plus de temps dans la phase longue traîne s'il voit que le ratio penche fortement dans ce sens.

→ Conception : [DESIGN-RAD-SEND-CAPTAIN](./design-registry.md#design-rad-send-captain)

---

#### FR-RAD-PERSIST — Persistance de l'exploration Radar par article

L'exploration Radar d'un article (mots-clés à scanner, mots-clés scannés, résultats du scan, longues traînes générées, états cochés) est **persistée intégralement** en base, indexée par article. Au retour sur l'article — même session, autre session, jours plus tard — l'exploration est ré-affichée à l'identique sans aucun re-fetch des APIs externes (DataForSEO, Google Suggest, IA).

**Critères d'acceptation**
- À l'ouverture du Radar pour un article, un seul appel charge l'état complet de l'exploration.
- Tous les ajouts/retraits/scans/cochages sont écrits en base au moment où ils sont faits.
- Recharger la page sur le Radar retrouve l'état exact (mots-clés, scores, longues traînes, cases cochées).
- Supprimer l'exploration d'un article remet le Radar à l'état initial (vide).

**Note historique** : l'ancien indicateur cache « Dernière exploration cross-article » qui apparaissait dans la section saisie du Radar (« scope par seed ») a été supprimé en 2026-05-11. Il a été remplacé par un panneau cache global au Moteur (4 onglets, scope par article) — voir `FR-MOT-CACHE-PANEL-COUNT`. Les anciennes routes legacy restent côté backend pour rétrocompatibilité mais ne sont plus appelées par l'UI.

> **En situation.** Trois semaines après avoir scanné l'article rupture conventionnelle, l'utilisateur y retourne pour finaliser le choix Capitaine. Il ouvre le Radar : ses 22 cartes scannées sont là, ses 10 longues traînes aussi, ses 12 cases cochées intactes. Zéro appel API. Il termine son geste là où il l'avait laissé.

→ Conception : [DESIGN-RAD-PERSIST](./design-registry.md#design-rad-persist)

---

#### FR-RAD-CHECK — Étape Moteur « Radar fait » posée après un scan réussi

Le franchissement de la deuxième étape Moteur (« Radar fait ») est posé automatiquement dès qu'un scan abouti renvoie au moins une carte qualifiée. L'utilisateur n'a rien à cocher manuellement — le scan terminé l'enregistre.

**Critères d'acceptation**
- Quand un scan Radar revient avec succès (au moins une carte produite), l'étape `moteur:radar_done` est marquée comme franchie pour l'article.
- Un scan qui échoue (erreur API, timeout) ne marque pas l'étape.
- L'étape est idempotente : relancer un scan ne re-pose pas le check s'il était déjà là.

> **En situation.** L'utilisateur termine son scan des 22 mots-clés sur l'article rupture conventionnelle. Le bandeau « Scan terminé · 22 cartes » apparaît. Retour au dashboard : le second dot du Moteur est passé de `○` à `●`. Il n'a rien eu à cocher.

→ Conception : [DESIGN-RAD-CHECK](./design-registry.md#design-rad-check)

---

#### FR-RAD-MARKET-COMPUTED-LIVE — Le Score Marché est recalculé à chaque affichage de carte

Le Score Marché d'une carte n'est **jamais persisté** : il est recalculé à la volée côté front à chaque rendu, à partir des KPIs bruts (volume, KD, intent, PAA, autocomplete, CPC) reçus du backend. Garantit que le score reflète toujours la dernière définition de la formule de pondération, sans données obsolètes en cache. Si les KPIs sont absents (cas longue traîne sans appel DataForSEO), la carte affiche « — ».

**Critères d'acceptation**
- Le store front ne contient pas de champ persisté `marketScore` (jamais sérialisé en base).
- Aucune colonne SQL ne stocke un score marché.
- Le score affiché vient toujours d'un calcul live à partir des KPIs.
- Si les KPIs sont nuls/absents, la carte affiche « — » au lieu d'un score.

> **En situation.** L'équipe produit modifie la pondération du Score Marché (passe l'intent de 15 % à 20 %). Au prochain reload, tous les articles déjà scannés affichent leurs nouveaux scores recalculés à la volée — aucune migration de données, aucun re-scan nécessaire. Les KPIs bruts en base restent les mêmes ; seule la formule change.

→ Conception : [DESIGN-RAD-MARKET-COMPUTED-LIVE](./design-registry.md#design-rad-market-computed-live)

---

#### FR-RAD-NO-RELEVANCE-IN-SCAN — Le scan ne calcule jamais le Score Pertinence ni aucun signal d'alignement douleur

Le scan Radar produit **uniquement** les KPIs bruts et le Score Marché — il ne calcule **jamais** le Score Pertinence ni aucun signal intermédiaire d'alignement entre le mot-clé scanné et le point de douleur de l'article. La pertinence article (le « est-ce que ce mot-clé sert vraiment ma douleur ? ») vit **exclusivement** dans l'onglet Capitaine via le jugement Haiku (cf. `FR-CAP-PAA-JUDGE-HAIKU`).

Côté badges Radar des questions PAA : étiquette purement lexicale (`Exact` / `Match` / `Partiel` / `Hors sujet`), aucune mention d'alignement douleur (`· douleur` / `· hors-douleur` retirés). Le suffixe douleur ne fait sens que dans l'onglet Capitaine où la douleur est en jeu.

Garantit qu'une modification de la formule Pertinence ou du point de douleur de l'article ne nécessite jamais de re-scanner, et que l'onglet Radar reste rapide (pas d'embedding lourd sur le painPoint au scan).

**Critères d'acceptation**
- Le scan ne sérialise pas de Score Pertinence dans son résultat.
- Le scan ne calcule aucun embedding `painPoint × keyword`, `painPoint × autocomplete`, ni `painPoint × PAA`.
- Les badges Radar n'affichent jamais de suffixe `· douleur` / `· hors-douleur`.
- Les anciennes lignes en base qui contenaient encore un Score Pertinence ou un signal douleur sont ignorées à la lecture (pas de migration destructive).
- Le Score Pertinence affiché côté Radar (mode Pertinence) vient de la même mécanique live que côté Capitaine — pas d'un cache du scan.

> **En situation.** L'utilisateur modifie le point de douleur de son article rupture conventionnelle (il l'a affiné pendant la rédaction). Sans toucher au Radar, il bascule le toggle sur « Pertinence » — les scores affichés ont changé immédiatement, reflètent la nouvelle douleur. Aucun re-scan, aucune écriture en base. À l'inverse, sur l'onglet Radar lui-même, les badges des questions PAA continuent d'afficher leur match lexical pur (« Exact », « Partiel »…) — pas de mélange visuel avec la douleur de l'article.

→ Conception : [DESIGN-RAD-NO-RELEVANCE-IN-SCAN](./design-registry.md#design-rad-no-relevance-in-scan)

---

#### FR-RAD-CARD-CHEVRON-TOGGLE — Le déploiement PAA passe par le chevron, pas par toute la carte

Sur une carte Radar, le toggle qui ouvre/ferme l'arbre PAA est déclenché **uniquement par un clic sur le chevron** (triangle à gauche du header). Tout autre clic dans la carte (texte du mot-clé, KPIs, badges, espaces vides) propage normalement vers le parent, ce qui dans le contexte Capitaine ouvre le side panel de validation. Cette discrétisation évite que l'utilisateur déclenche le déploiement PAA en voulant simplement ouvrir le panel.

**Critères d'acceptation**
- Clic sur le chevron : déploie/replie l'arbre PAA, n'ouvre rien d'autre.
- Clic sur le texte du mot-clé : ouvre le side panel parent, n'affecte pas le déploiement PAA.
- Clic sur les KPIs : ouvre le side panel.
- Clic sur le cadenas de verrouillage : verrouille/déverrouille, n'ouvre pas le side panel.
- Clic sur l'anneau de score : affiche le tooltip, n'ouvre pas le side panel.
- Clic sur un mot interactif du keyword (mode tag) : cycle le tag, n'ouvre pas le side panel.

> **En situation.** L'utilisateur travaille dans l'onglet Capitaine où les cartes Radar sont rendues en mode liste. Il clique sur « calcul indemnité rupture conventionnelle 2026 » pour ouvrir son panel d'analyse côté droit — le side panel s'ouvre, l'arbre PAA reste fermé (pas de bruit visuel). Plus tard, dans une carte ouverte, il clique sur le petit triangle à gauche : l'arbre PAA se déplie, le panel reste sur le même mot-clé.

→ Conception : [DESIGN-RAD-CARD-CHEVRON-TOGGLE](./design-registry.md#design-rad-card-chevron-toggle)

---

### 8.6 — Moteur — Capitaine (FR-CAP)

> **Rôle de l'onglet.** Le Capitaine est le **cœur de la Phase ② Valider** : l'utilisateur arrive ici avec une sélection de mots-clés candidats venus du Radar (ou saisis à la main), et choisit **un seul** mot-clé Capitaine pour son article. C'est ce mot-clé qui va orienter le reste : la sélection des Lieutenants, l'extraction du Lexique, le sommaire et le brief de l'IA Rédaction. L'onglet affiche une liste verticale de mots-clés à étudier et un panneau latéral sticky qui montre, pour celui sélectionné, ses KPI marché, son score double (Marché + Pertinence à la douleur de l'article) et une analyse IA en streaming.

> **Note de réorganisation 2026-05-12.** Cette section a été éclatée en quatre lots : les FRs purement Capitaine restent ici ; les règles transversales Moteur (`FR-MOT-*`, `FR-CODE-*`, `FR-NAM-*`, `FR-API-*`, `FR-UI-VOCABULAIRE-*`) sont déplacées vers §8.3 ; les règles propres à un autre onglet (`FR-LIE-CHECKBOX-LOCK-IMMEDIATE` → §8.7, `FR-LEX-CHECKBOX-LOCK-IMMEDIATE` → §8.8) ont rejoint leur section naturelle ; les règles Cerveau (`FR-PIE-AI-GENERATION`, `FR-PIE-CERVEAU-OVERRIDE`, `FR-PAIN-IMMUTABLE-AFTER-CEREVEAU`) sont déplacées vers §8.1. Voir la table en fin de section pour le détail.

#### FR-CAP-INPUT — Champ de saisie pour ajouter un mot-clé à étudier

L'utilisateur peut taper un mot-clé directement dans un champ texte au-dessus de la liste pour l'ajouter à la sélection à étudier. La saisie est sécurisée à minima (longueur raisonnable, pas de caractères absurdes), un mécanisme de suggestion l'accompagne pour proposer des variantes pertinentes, et l'ajout déclenche l'analyse immédiate du mot-clé.

**Critères d'acceptation**
- Le champ accepte un mot-clé d'au moins 2 caractères et le pousse dans la liste à l'envoi.
- Une suggestion contextuelle s'affiche au fil de la saisie pour aider à formuler.
- L'ajout d'un mot-clé déclenche immédiatement le scan complet (KPI + scoring + PAA — cf. `FR-CAP-SCAN`).

> **En situation.** L'utilisateur a déjà 8 mots-clés envoyés depuis le Radar, mais une variante lui vient en tête : « rupture conventionnelle pour cause médicale ». Il la tape dans le champ en haut, valide, le scan part. La carte apparaît dans la liste à côté des autres avec ses KPI complets.

→ Conception : [DESIGN-CAP-INPUT](./design-registry.md#design-cap-input)

---

#### FR-CAP-SCAN — Récupération des KPI marché d'un mot-clé Capitaine

Pour chaque mot-clé étudié au Capitaine, l'app récupère ses **indicateurs marché complets** (volume de recherche, difficulté SEO, CPC, intent commercial, suggestions autocomplete Google, top 10 SERP, questions PAA). Avant tout appel payant, elle consulte sa base interne — si la donnée est suffisamment fraîche (moins de 7 jours), elle est réutilisée. Sinon, plusieurs fournisseurs sont interrogés en parallèle pour aller vite.

**Critères d'acceptation**
- Chaque mot-clé Capitaine affiche ses 6 KPI marché : volume, difficulté, CPC, intent, nombre de PAA, nombre de suggestions autocomplete.
- Un mot-clé déjà étudié depuis moins de 7 jours réutilise les données sans nouvel appel payant.
- Si le scan échoue (quota dépassé, fournisseur indisponible), un message clair s'affiche sur la carte concernée — pas de silence.

> **En situation.** L'utilisateur ajoute « calcul indemnité rupture conventionnelle senior » au Capitaine. 3 secondes plus tard, la carte affiche : volume 1 200/mois, difficulté 32, CPC 1,40 €, intent commercial, 8 PAA scannés, 12 suggestions autocomplete. Il a tout pour décider en quelques secondes.

→ Conception : [DESIGN-CAP-SCAN](./design-registry.md#design-cap-scan)

---

#### FR-CAP-LIST-SIDEPANEL — Liste verticale + panneau latéral sticky d'analyse

L'écran Capitaine se divise en deux zones : à gauche, **une liste verticale de cartes de mots-clés étudiés** dans laquelle l'utilisateur clique pour en sélectionner un ; à droite, **un panneau latéral sticky** qui affiche les détails de la carte sélectionnée (KPI, scores, panel IA, racines). Le panneau reste visible quand l'utilisateur scrolle la liste, pour qu'il puisse comparer rapidement plusieurs candidats.

**Critères d'acceptation**
- La liste affiche une carte par mot-clé étudié, triée selon le critère choisi par l'utilisateur.
- La sélection se fait par clic (pas par survol — l'utilisateur ne change pas de panneau par accident).
- Le panneau latéral reste visible (sticky) pendant que l'utilisateur scrolle la liste.
- Le changement d'article réinitialise la sélection ; vider la liste idem.

> **En situation.** L'utilisateur compare 4 candidats Capitaine pour son article rupture conventionnelle. Il clique sur le premier, voit son détail dans le panneau de droite, le compare mentalement, clique sur le suivant. Le panneau bouge instantanément, la liste reste à la même position de scroll.

→ Conception : [DESIGN-CAP-LIST-SIDEPANEL](./design-registry.md#design-cap-list-sidepanel)

---

#### FR-CAP-KPIS-READONLY — KPI marché en lecture seule dans le panneau

Dans le panneau latéral d'un mot-clé Capitaine, les KPI marché (Volume / Difficulté / CPC / Intent / PAA / Autocomplete) sont **affichés en lecture seule**. L'utilisateur ne peut pas modifier les seuils ni la pondération depuis cet onglet — c'est le rôle d'écrans de configuration globaux (s'ils existent).

**Critères d'acceptation**
- Les valeurs des 6 KPI s'affichent telles que reçues du fournisseur (pas de champ éditable).
- Aucun bouton « Modifier le seuil » n'apparaît sur la fiche Capitaine.

> **En situation.** L'utilisateur regarde la carte sélectionnée, voit « Volume 2 400 — Difficulté 28 — CPC 1,80 € — Intent commercial — 12 PAA — 8 Autocomplete ». Il n'a pas besoin de modifier — il observe pour décider.

→ Conception : [DESIGN-CAP-KPIS-READONLY](./design-registry.md#design-cap-kpis-readonly)

---

#### FR-CAP-SCORING-BIMODAL — Deux scores : Marché et Pertinence à la douleur

Chaque mot-clé Capitaine porte **deux scores indépendants sur 100**, calculés selon les mêmes formules qu'au Radar (cf. `FR-RAD-SCORING-BIMODAL`) :
- **Score Marché** — combine volume, difficulté, CPC, intent, PAA, autocomplete.
- **Score Pertinence** — combine alignement avec le point de douleur, recouvrement sémantique PAA × douleur, autocomplete × douleur, présence des racines, intent croisé avec l'attendu éditorial.

L'utilisateur peut basculer l'affichage entre les deux scores pour analyser la même liste sous deux angles.

**Critères d'acceptation**
- Chaque carte affiche les deux scores séparés (pas un score moyen).
- Le toggle Marché / Pertinence change l'angle de tri et d'affichage sans relancer le scan.
- Quand un score Pertinence n'est pas calculable (cf. `FR-CAP-RELEVANCE-UNAVAILABLE-REASON`), il s'affiche `—` au lieu d'un zéro.

> **En situation.** L'utilisateur a 6 candidats Capitaine. Vu par le Score Marché, « rupture conventionnelle wikipedia » sort 4ᵉ (volume correct). Vu par le Score Pertinence sur sa douleur précise, ce mot-clé tombe à la 6ᵉ place (sémantique distante de la douleur). Le bon Capitaine n'est plus le même selon l'angle — bascule rapide, choix éclairé.

→ Conception : [DESIGN-CAP-SCORING-BIMODAL](./design-registry.md#design-cap-scoring-bimodal)

---

#### FR-CAP-AI-PANEL — Panel IA d'avis stratégique sur le mot-clé sélectionné

Pour le mot-clé sélectionné dans la liste, le panneau latéral affiche un **avis IA structuré en trois sections** : potentiel éditorial (peut-on en faire un bon article ?), risques (cannibalisation, faible volume, intent ambigu…), recommandation finale. L'analyse est streamée pour ne pas faire attendre l'utilisateur. Elle prend en compte le mot-clé, son niveau d'article (Pilier / Intermédiaire / Spécifique), le point de douleur, les deux scores, et le contexte stratégique du cocon.

**Critères d'acceptation**
- L'analyse IA se déclenche à la sélection d'un mot-clé (ou via un bouton « Relancer l'analyse »).
- Trois sections lisibles apparaissent : potentiel, risques, recommandation.
- Le texte streame au fil de l'eau pour ne pas figer l'écran.
- L'analyse mentionne explicitement le point de douleur et la stratégie cocon — pas un avis générique.

> **En situation.** L'utilisateur sélectionne « simulateur indemnité rupture conventionnelle » dans la liste. En 3 secondes l'IA déroule : *« Potentiel élevé — l'intent commercial s'aligne avec votre cible 'DRH PME'. Risque modéré — cannibalisation possible avec votre article 'Calculer son ancienneté' du cocon. Recommandation : verrouiller — cocher l'angle simulateur en H2 pour différencier. »* Il valide sa décision sereinement.

→ Conception : [DESIGN-CAP-AI-PANEL](./design-registry.md#design-cap-ai-panel)

---

#### FR-CAP-ROOTS — Décomposition d'un mot-clé en racines progressives

L'app **décompose chaque mot-clé Capitaine en racines progressives** par troncature linéaire depuis la fin. Exemple : « cours piano intermédiaire paris » donne `["cours piano intermédiaire", "cours piano"]`. Ces racines sont stockées avec le mot-clé et alimentent ensuite le calcul du Score Pertinence (signal Racines).

**Critères d'acceptation**
- Pour un mot-clé d'au moins 3 mots significatifs, l'app produit jusqu'à 5 racines progressives.
- Les mots-outils (les, des, pour…) sont ignorés dans la décomposition.
- Les racines sont visibles dans le panneau latéral et utilisables pour la recherche (clic sur une racine relance un scan sur cette racine seule).

> **En situation.** Le mot-clé « cours piano intermédiaire paris » expose ses racines `cours piano intermédiaire` et `cours piano` dans le panneau. L'utilisateur clique sur la racine `cours piano` pour voir si le mot-clé moins spécifique aurait un meilleur potentiel — il découvre que c'est trois fois plus de volume mais avec une difficulté plus élevée. Il garde le mot-clé long pour cet article-ci.

→ Conception : [DESIGN-CAP-ROOTS](./design-registry.md#design-cap-roots)

---

#### FR-CAP-LOCK-RADIO — Un seul Capitaine verrouillé par article à la fois

Un article a **exactement zéro ou un** mot-clé Capitaine verrouillé. Verrouiller un nouveau mot-clé alors qu'un autre l'était déjà **remplace** automatiquement l'ancien — pas de besoin de déverrouiller manuellement avant. C'est le geste qui marque que l'utilisateur a tranché.

**Critères d'acceptation**
- L'article expose un slot unique pour son Capitaine verrouillé.
- Verrouiller un nouveau Capitaine remplace l'ancien dans le même geste.
- L'étape Moteur « Capitaine verrouillé » est posée/maintenue quand un Capitaine est présent, retirée quand l'article n'a plus de Capitaine.

> **En situation.** L'utilisateur a verrouillé « calcul indemnité rupture conventionnelle » la veille. Aujourd'hui, après réflexion, il pense qu'un Capitaine plus précis serait meilleur. Il clique sur « Verrouiller » sur « simulateur indemnité rupture conventionnelle 2026 » — le nouveau remplace l'ancien sans qu'il ait à déverrouiller. Le dot de progression reste vert ; seul le mot-clé affiché dans le récap change.

→ Conception : [DESIGN-CAP-LOCK-RADIO](./design-registry.md#design-cap-lock-radio)

---

#### FR-CAP-VERDICT-INFORMATIVE — Verdict GO / NO-GO purement informatif

Chaque mot-clé Capitaine affiche un **verdict synthétique** (GO vert / ORANGE / NO-GO rouge / GRAY si données insuffisantes) calculé à partir des KPI marché et de la douleur. Ce verdict est **purement informatif** : l'utilisateur peut toujours verrouiller un mot-clé, même si le verdict est NO-GO. Le verdict aide à décider, il ne décide pas à la place de l'utilisateur.

**Critères d'acceptation**
- Chaque carte porte un badge verdict visible (GO / ORANGE / NO-GO / GRAY) avec un code couleur clair.
- Le bouton « Verrouiller ce mot-clé » reste actif quel que soit le verdict — l'utilisateur garde la main.
- Le tooltip du verdict détaille la raison (« 4 KPI dans le vert / 2 dans l'orange / 0 dans le rouge → GO ») sans jargon.

> **En situation.** L'utilisateur regarde une carte avec un badge NO-GO rouge — volume faible, CPC nul, intent flou. L'IA recommande de ne pas la garder. Mais il sait par expérience que ce mot-clé long-tail correspond exactement à un besoin de son client. Il clique « Verrouiller » sans frustration — le NO-GO n'a jamais été un blocage.

→ Conception : [DESIGN-CAP-VERDICT-INFORMATIVE](./design-registry.md#design-cap-verdict-informative)

---

#### FR-CAP-VERDICT-GATING — *(deprecated 2026-04-28)*

**Statut : deprecated.** Historiquement, le bouton « Valider Capitaine » était désactivé tant que le verdict n'était pas GO. Cette logique a été retirée le 2026-04-28 — remplacée par `FR-CAP-VERDICT-INFORMATIVE` qui rend le verdict purement informatif. L'utilisateur a désormais toujours la main, peu importe le verdict.

→ Conception : [DESIGN-CAP-VERDICT-GATING](./design-registry.md#design-cap-verdict-gating)

---

#### FR-CAP-AUTO-NOGO — Auto-NO-GO quand aucun signal n'est détecté

Quand un mot-clé n'a **aucun signal marché vert** (volume nul, autocomplete vide, PAA vide, etc.), l'app affiche automatiquement un verdict NO-GO avec la raison « aucun signal détecté ». Évite que l'utilisateur croit à tort que le mot-clé est neutre — l'absence de signal est un signal en soi.

**Critères d'acceptation**
- Si les 6 KPI marché sont tous au rouge (ou vides), le verdict est forcé à NO-GO.
- Le tooltip explique « aucun signal détecté — ce mot-clé n'apparaît pas dans la donnée marché ».
- L'utilisateur reste libre de verrouiller (cf. `FR-CAP-VERDICT-INFORMATIVE`).

> **En situation.** L'utilisateur teste un mot-clé très niche jamais cherché sur Google : « comment refuser indemnité supra légale rupture conventionnelle senior 2026 ». La carte affiche NO-GO automatique avec « aucun signal détecté ». Il comprend tout de suite que ce mot-clé n'a pas de marché — il l'écarte sans hésiter.

→ Conception : [DESIGN-CAP-AUTO-NOGO](./design-registry.md#design-cap-auto-nogo)

---

#### FR-CAP-PAINPOINT-FALLBACK — Comportement quand le point de douleur manque

Si l'utilisateur arrive sur le Capitaine sans avoir défini de point de douleur côté Cerveau, l'app **continue de fonctionner** mais en mode dégradé : le Score Pertinence est marqué indisponible (`—`), les calculs lexicaux sont sautés, et un message d'invitation explicite invite l'utilisateur à poser sa douleur côté Cerveau. Aucun crash, aucun zéro trompeur.

**Critères d'acceptation**
- Un article sans point de douleur affiche tous ses scores Pertinence à `—`, jamais à `0`.
- Un message lisible signale la cause et invite à poser le painPoint (cf. `FR-CAP-RELEVANCE-UNAVAILABLE-REASON`).
- Le Score Marché reste calculable et affiché normalement.

> **En situation.** L'utilisateur a sauté l'étape Cerveau (il commence par tester des mots-clés). Il arrive au Capitaine, voit ses cartes avec des Scores Marché et des Scores Pertinence à `—`. Le tooltip du `—` dit « Pose d'abord le point de douleur de l'article (étape Cerveau) pour activer le Score Pertinence ». Pas de zéro qui fausserait son tri.

→ Conception : [DESIGN-CAP-PAINPOINT-FALLBACK](./design-registry.md#design-cap-painpoint-fallback)

---

#### FR-CAP-PERSIST — Persistance article-scoped des explorations Capitaine

Tous les mots-clés étudiés au Capitaine pour un article (verrouillés ou pas) sont **persistés en base, attachés à cet article**. La provenance (Radar / longue traîne / saisie manuelle) est conservée pour analytique. À toute reprise — quelques minutes plus tard, le lendemain, dans une autre session — l'utilisateur retrouve sa liste intacte avec ses scores calculés.

**Critères d'acceptation**
- Chaque mot-clé étudié est sauvegardé en base dès son entrée dans la liste.
- La provenance (radar / longtail / manual) est conservée.
- Au retour sur l'article, la liste est restaurée intégralement (mots-clés + scores marché + état de verrouillage).
- Supprimer un article supprime ses explorations Capitaine en cascade.

> **En situation.** Mardi soir, l'utilisateur ferme l'app après avoir étudié 8 Capitaines candidats pour son article rupture conventionnelle. Jeudi matin, il rouvre directement sur l'onglet Capitaine : les 8 cartes sont là, avec leurs scores, leur état (1 verrouillée, 7 candidates), l'historique complet. Pas de re-scan.

→ Conception : [DESIGN-CAP-PERSIST](./design-registry.md#design-cap-persist)

---

#### FR-CAP-CHECK — Étape Moteur « Capitaine verrouillé » posée automatiquement

Au moment où l'utilisateur verrouille un mot-clé Capitaine pour un article, l'étape Moteur « Capitaine verrouillé » est posée automatiquement. Pas besoin de cocher quoi que ce soit en plus — le verrouillage est le geste qui valide l'étape. Décrocher le Capitaine retire l'étape.

**Critères d'acceptation**
- L'étape `moteur:capitaine_locked` est posée dès qu'un Capitaine est verrouillé sur l'article.
- L'étape est retirée si l'utilisateur déverrouille (le Capitaine repasse à vide).
- À l'ouverture de l'onglet, l'étape est réconciliée avec l'état réel (cf. `FR-MOT-CHECK-RECONCILIATION`).

> **En situation.** L'utilisateur clique « Verrouiller » sur « calcul indemnité rupture conventionnelle 2026 ». Le 3ᵉ dot de progression de l'article passe de `○` à `●` au dashboard. Aucune autre action.

→ Conception : [DESIGN-CAP-CHECK](./design-registry.md#design-cap-check)

---

#### FR-CAP-RELEVANCE-LIVE — Score Pertinence recalculé à la volée, jamais persisté

Le Score Pertinence d'un mot-clé Capitaine **n'est jamais persisté** : il est recalculé à la volée à chaque fois que l'utilisateur arrive sur l'onglet Capitaine. Cette discipline garantit que toute évolution de la formule ou du point de douleur de l'article se reflète immédiatement, sans donnée obsolète qui traîne en cache.

**Critères d'acceptation**
- Aucune écriture en base ne contient un Score Pertinence dans son payload.
- Aucun cache (TTL serveur, store front, localStorage) ne mémorise le score au-delà de la session navigateur en cours.
- Recharger la page recalcule le score (peut prendre quelques centaines de millisecondes).
- Un mot-clé saisi à la main sans avoir été scanné par le Radar reçoit aussi un Score Pertinence calculable (à condition qu'un point de douleur soit défini).

> **En situation.** L'équipe produit modifie la pondération du Score Pertinence pour donner plus de poids à l'alignement avec la douleur. Au prochain reload, **tous** les Capitaines de **tous** les articles affichent leurs nouveaux scores recalculés à la volée. Aucune migration de données, aucun script de purge — juste un changement de formule côté code.

→ Conception : [DESIGN-CAP-RELEVANCE-LIVE](./design-registry.md#design-cap-relevance-live)

---

#### FR-CAP-RELEVANCE-INPUTS — Racines persistées à l'entrée, lues au calcul

Les **racines progressives** d'un mot-clé Capitaine (cf. `FR-CAP-ROOTS`) sont calculées **une fois, au moment où le mot-clé entre dans la liste** (envoi depuis Radar, saisie manuelle, longue traîne IA acceptée), puis stockées avec lui. Quand le Score Pertinence est calculé live, le serveur lit les racines depuis cette source persistée plutôt que de les recalculer. L'extraction des racines reste un algorithme simple et déterministe (troncature progressive, pas d'IA, pas de parsing sémantique).

**Critères d'acceptation**
- Toute porte d'entrée d'un mot-clé Capitaine déclenche le calcul des racines et leur persistance.
- Verrouiller un mot-clé déjà présent ne recalcule pas les racines (immutables après entrée).
- Le calcul du Score Pertinence lit les racines depuis la base — si absentes, fallback sur un calcul mémoire (sans persister).
- L'algorithme d'extraction reste linéaire (troncature) — toute évolution vers du sémantique demande une décision produit explicite.

> **En situation.** L'utilisateur envoie 12 mots-clés du Radar au Capitaine. Pour chacun, les racines sont calculées en moins d'une milliseconde et stockées. Plus tard, quand il navigue dans son onglet Capitaine et que le serveur recalcule les Scores Pertinence des 12 cartes, aucune racine n'est recalculée — juste lue. Performance stable.

→ Conception : [DESIGN-CAP-RELEVANCE-INPUTS](./design-registry.md#design-cap-relevance-inputs)

---

#### FR-CAP-RELEVANCE-MEMOIZATION — Calcul partagé entre cartes qui ont la même racine

Pendant un calcul Pertinence pour N cartes Capitaine, l'app reconnaît les **racines partagées** entre plusieurs cartes et **ne calcule chaque racine qu'une seule fois**, en mémoire pendant la durée du calcul. Cette mémoïsation est purement éphémère (durée de vie d'une requête HTTP) et n'introduit aucun cache persistant.

**Critères d'acceptation**
- 5 cartes qui partagent la racine `cours piano` ne déclenchent qu'un seul calcul pour cette racine.
- La mémoïsation est créée à l'entrée de la fonction de calcul et libérée à la sortie.
- Aucun stockage hors scope (localStorage, sessionStorage, cache TTL serveur) ne persiste ces calculs partagés.

> **En situation.** L'utilisateur a 8 candidats Capitaine qui partagent tous la racine `rupture conventionnelle`. Au chargement de l'onglet, le serveur calcule le Score Pertinence des 8 cartes. La racine partagée est traitée une fois, ses résultats sont réutilisés 7 fois — temps de réponse global divisé d'autant.

→ Conception : [DESIGN-CAP-RELEVANCE-MEMOIZATION](./design-registry.md#design-cap-relevance-memoization)

---

#### FR-CAP-RELEVANCE-UNAVAILABLE-REASON — Raison précise quand le Score Pertinence est indisponible

Quand le Score Pertinence ne peut pas être calculé pour un mot-clé, l'app affiche `—` à la place du score et expose une **raison précise** dans le tooltip. Cinq raisons sont possibles : pas de point de douleur défini, mot-clé longue traîne sans KPI, pas de questions PAA scrapées, pas de suggestions autocomplete capturées, ou jugement IA Haiku indisponible. L'utilisateur sait toujours **pourquoi** un score manque et **quoi faire** pour le débloquer.

**Critères d'acceptation**
- Quand `score === null`, le tooltip affiche un des 5 messages : *« Définis un point de douleur »*, *« Score non applicable (longue traîne) »*, *« Pas de PAA — relance un scan Radar »*, *« Pas d'autocomplete — relance un scan Radar »*, *« Jugement IA Haiku indisponible — réessaye »*.
- Aucune devinette côté front : le message vient du backend, le front l'affiche tel quel.
- Le score est toujours `—` et jamais `0` quand la raison est l'absence de donnée.
- Cas particulier *« Jugement IA Haiku indisponible »* : le score peut quand même être calculé avec une dégradation gracieuse (fallback sur l'ancien calcul lexical), le tooltip signale que l'IA est en panne sans bloquer l'utilisateur.

> **En situation.** L'utilisateur voit un Score Pertinence à `—` sur une de ses cartes. Il survole : *« Pas de PAA disponible — relance un scan Radar pour ce keyword »*. Action immédiate, plus de mystère. Sur une autre carte, le score s'affiche en `73/100` mais le tooltip mentionne discrètement *« Jugement IA Haiku indisponible — fallback en cours »* : il sait que le score est légèrement dégradé sans bloquer son flux.

→ Conception : [DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON](./design-registry.md#design-cap-relevance-unavailable-reason)

---

#### FR-CAP-RELEVANCE-INTENT-SIGNAL — Signal d'alignement intent SERP × intent éditorial

Le Score Pertinence intègre un **signal d'alignement entre l'intent dominant de la SERP** (ce que Google considère comme intention de recherche : informational / commercial / transactional / navigational) et **l'intent éditorial attendu** que l'utilisateur a renseigné côté Cerveau pour son article. Quand les deux s'alignent, le score est légèrement boosté ; quand ils divergent, un malus est appliqué. Quand l'intent attendu n'est pas renseigné, le signal est neutre (pas de pénalité, pas de bonus).

**Critères d'acceptation**
- Le calcul Pertinence intègre un 5ᵉ signal qui croise intent SERP × intent attendu de l'article.
- Match → bonus appliqué à la composante intent du score.
- Mismatch → malus appliqué.
- Intent attendu absent → signal neutralisé (50/100), pas de pénalité.

> **En situation.** L'utilisateur a renseigné « intent commercial » côté Cerveau pour son article rupture conventionnelle. Sur sa liste Capitaine, le mot-clé « comprendre la rupture conventionnelle » (intent SERP informational) reçoit un léger malus Pertinence : signal de désalignement. À l'inverse, « simulateur indemnité rupture conventionnelle » (intent commercial) reçoit un bonus.

→ Conception : [DESIGN-CAP-RELEVANCE-INTENT-SIGNAL](./design-registry.md#design-cap-relevance-intent-signal)

---

#### FR-CAP-PAA-JUDGE-HAIKU — L'IA juge directement la pertinence des questions PAA par rapport à la douleur

Pour mesurer si les questions « People Also Ask » scrapées sur la SERP **collent vraiment** au point de douleur de l'article, l'app fait appel à **Claude Haiku** plutôt qu'à un calcul de mots partagés. Un seul appel IA examine en bloc toutes les questions PAA d'un mot-clé donné, en croisant le sujet de l'article et son point de douleur. Pour chaque question, l'IA retourne un verdict (pertinent / partiel / hors-sujet) et une justification courte. Bénéfice utilisateur : la mesure de pertinence du signal PAA devient sémantique — fini les faux positifs sur des questions qui partagent les bons mots mais qui parlent à côté.

**Critères d'acceptation**
- L'appel IA est déclenché à l'ouverture de l'onglet Capitaine, une seule fois par mot-clé étudié.
- Pour chaque question PAA scrapée, l'utilisateur reçoit un verdict typé (pertinent / partiel / hors-sujet) et une justification courte (≤ 10 mots).
- Si l'IA échoue (rate limit, timeout, réponse invalide), l'app retombe automatiquement sur l'ancien calcul lexical sans interrompre l'utilisateur — le Score Pertinence reste calculé, juste avec un signal 2 dégradé.
- Le poids du signal 2 (PAA × douleur) dans le Score Pertinence reste à 25 %.

> **En situation.** Sur la carte « calcul indemnité rupture conventionnelle 2026 », l'utilisateur voit 4 questions PAA scrapées. À l'ouverture de l'onglet Capitaine, l'app fait un appel Haiku qui juge les 4 d'un coup. Résultat : « Comment calculer son indemnité ? » → *pertinent* ; « Quel est le minimum légal ? » → *pertinent* ; « Quel est le délai de rétractation ? » → *partiel* ; « Quels sont les droits du salarié en CDI ? » → *hors-sujet*. Le Score Pertinence reflète cette qualité réelle — les bonnes questions remontent, les hors-sujet sont pénalisés.

→ Conception : [DESIGN-CAP-PAA-JUDGE-HAIKU](./design-registry.md#design-cap-paa-judge-haiku)

---

#### FR-CAP-PAA-BADGE-SINGLE — Un seul chip par question PAA sur le Capitaine, valeur issue de l'IA

Sur l'onglet Capitaine, chaque question PAA d'une carte affiche **un seul chip de verdict** dont la valeur vient directement du jugement IA : *pertinent* (vert), *partiel* (orange), *hors-sujet* (gris). Le tooltip du chip donne la justification courte fournie par l'IA. Côté onglet Radar (qui mesure le potentiel marché, pas la pertinence à la douleur), le badge reste basé sur l'ancien calcul lexical historique — pas de jugement IA, pas le même angle.

**Critères d'acceptation**
- Sur l'onglet Capitaine, chaque PAA d'une carte ne porte qu'**un seul** chip de verdict, coloré selon la valeur (vert / orange / gris).
- Le tooltip du chip affiche la justification courte fournie par l'IA.
- Le compteur « PAA pts » du header de la carte affiche un score sur 100 (mode Capitaine) ou le total brut historique (mode Radar) — deux angles distincts, deux affichages.
- Si le jugement IA n'est pas encore disponible (mot-clé tout juste arrivé, ou IA en cours), le chip retombe proprement sur l'ancien rendu lexical — pas d'erreur, pas de saut visuel.

> **En situation.** L'utilisateur ouvre l'arbre PAA d'une carte sur le Capitaine. Les 4 questions sont là, chacune avec son chip coloré. Il survole la première : *« sujet et douleur directement matchés »*. Limpide. Au-dessus de la carte, le compteur PAA affiche `73/100`. Plus tard, sur l'onglet Radar (angle marché) qui montre la même carte, les chips PAA sont toujours là mais basés sur l'ancien calcul lexical — c'est volontaire, le Radar mesure autre chose que la pertinence à la douleur.

→ Conception : [DESIGN-CAP-PAA-BADGE-SINGLE](./design-registry.md#design-cap-paa-badge-single)

---

#### FR-CAP-PAA-JUDGE-CACHE-SESSION — Les jugements IA restent en mémoire pendant la session navigateur

Pour ne pas refaire des appels IA payants à chaque switch d'article ou d'onglet, l'app **garde les jugements en mémoire JavaScript** pendant toute la session navigateur courante. L'utilisateur peut basculer entre plusieurs articles, revenir au premier — les chips PAA sont déjà là, pas de nouvel appel. Un F5 vide tout, c'est volontaire (rafraîchissement contrôlé). Aucune persistance en base ni en localStorage.

**Critères d'acceptation**
- Un switch d'article puis retour à un article déjà ouvert ne déclenche aucun nouvel appel IA pour ses cartes Capitaine.
- F5 du navigateur efface tous les jugements en mémoire ; le prochain mount déclenche les appels IA frais.
- Aucune table de base de données ne contient les jugements (pas de persistance hors-session).
- Aucun stockage navigateur (localStorage, sessionStorage) ne contient les jugements.

> **En situation.** Le matin, l'utilisateur ouvre 3 articles d'un cocon pour comparer leurs Capitaines. Chaque article déclenche son appel IA (environ 3 secondes pour 6-8 questions PAA). Quand il revient sur le premier article 10 minutes plus tard, les chips PAA sont instantanés — pas d'appel facturé. Le lendemain matin il rouvre le navigateur : tout est recalculé frais (mémoire vidée à la fermeture). Pas de mauvaise surprise sur la facture IA.

→ Conception : [DESIGN-CAP-PAA-JUDGE-CACHE-SESSION](./design-registry.md#design-cap-paa-judge-cache-session)

---

#### FR-CAP-NO-PAINPOINT-WATCHER — Pas de recalcul live si le point de douleur change en cours de session

Si le point de douleur de l'article change pendant que l'utilisateur est sur l'onglet Capitaine (cas marginal — la règle `FR-PAIN-IMMUTABLE-AFTER-CEREVEAU` rend ce changement quasi-impossible), aucun recalcul automatique du Score Pertinence n'est déclenché. Le calcul est figé pour la durée de la visite ; au prochain mount de l'onglet (switch d'article, F5), il sera frais.

**Critères d'acceptation**
- Aucun composable côté front ne surveille le `painPoint` en watcher pour relancer un recompute Pertinence.
- Un changement de `painPoint` pendant la session reste invisible côté affichage Capitaine jusqu'au prochain mount.

> **En situation.** Cas hypothétique : un autre onglet de l'app modifie le painPoint pendant que l'utilisateur a l'onglet Capitaine ouvert. Les scores affichés ne bougent pas — c'est volontaire. Au prochain rechargement, ils refléteront le nouveau painPoint.

→ Conception : [DESIGN-CAP-NO-PAINPOINT-WATCHER](./design-registry.md#design-cap-no-painpoint-watcher)

---

#### FR-CAP-LOCK-INTEGRITY — Intégrité du verrouillage (pas de duplication, tri stable)

Le verrouillage d'un Capitaine respecte trois invariants d'intégrité :
1. **Pas de duplication** — verrouiller, déverrouiller, reverrouiller un mot-clé ne crée jamais deux fois la même entrée dans la liste.
2. **Verrouillage sur le mot-clé d'origine** — quand l'utilisateur active une racine d'un mot-clé pour explorer (souligner un mot pour cycler les variantes), le verrou agit sur le **mot-clé d'origine** de la carte, pas sur la racine active.
3. **Tri stable malgré les variantes** — activer/désactiver une racine sur une carte ne change jamais sa position dans la liste triée, parce que le tri utilise l'identité d'origine.

**Critères d'acceptation**
- Verrouiller 3 fois le même mot-clé ne crée qu'une seule entrée dans la liste.
- Cliquer sur un mot souligné d'une carte (variante racine) ne déplace pas la carte dans la liste.
- Le verrouillage capture toujours le mot-clé d'origine, même si une racine est active à l'écran.

> **En situation.** L'utilisateur clique sur le mot « piano » dans la carte « cours piano intermédiaire paris » pour activer la racine `cours piano`. Le keyword affiché change visuellement mais la carte reste à sa position dans la liste triée. Il clique « Verrouiller » : c'est bien `cours piano intermédiaire paris` qui est enregistré, pas la racine. Plus tard, il refait le geste pour explorer une autre racine — pas de duplication dans la liste.

→ Conception : [DESIGN-CAP-LOCK-INTEGRITY](./design-registry.md#design-cap-lock-integrity)

---

### FRs déplacées hors §8.6 (refonte 2026-05-12)

Voici les FRs qui appartenaient historiquement à §8.6 mais qui ont rejoint leur section naturelle :

| FR | Destination | Raison du déplacement |
|---|---|---|
| `FR-LIE-CHECKBOX-LOCK-IMMEDIATE` | §8.7 Lieutenants | Règle d'interaction des checkboxes Lieutenants, pas Capitaine. |
| `FR-LEX-CHECKBOX-LOCK-IMMEDIATE` | §8.8 Lexique | Règle d'interaction des checkboxes Lexique, pas Capitaine. |
| `FR-PAIN-IMMUTABLE-AFTER-CEREVEAU` | §8.3 Moteur transversal | Règle qui concerne **tous** les onglets Moteur (et la Rédaction), pas seulement Capitaine. |
| `FR-API-VOCABULAIRE-SCAN` | §8.3 Moteur transversal | Convention de vocabulaire backend partagée par tout le Moteur. |
| `FR-NAM-CONTAINERS-PANEL` | architecture.md | Convention de nommage de composants (`*Panel.vue`) — règle interne au code, pas une exigence produit. |
| `FR-INFRA-EXTERNAL-API-CACHE` | §8.14 Infrastructure | Cache transverse à tout le Moteur, ne dépend pas de Capitaine. |
| `FR-MOT-WORKFLOW-GATING-DUAL` | §8.3 Moteur transversal | Règle de gating partagée Capitaine + Lieutenants. |
| `FR-MOT-LOCK-DERIVED` | §8.3 Moteur transversal | Pattern de réactivité partagé. |
| `FR-MOT-DISPLAY-FROM-STORE` | §8.3 Moteur transversal | Pattern d'affichage partagé. |
| `FR-CODE-NO-CAROUSEL` | architecture.md | Convention de nommage interne. |
| `FR-UI-VOCABULAIRE-VERROUILLER` | §8.3 Moteur transversal | Convention de vocabulaire UI partagée par tout le Moteur. |
| `FR-CAP-EXPLORED-KEYWORDS-NAMING` | architecture.md | Convention de nommage TypeScript interne. |
| `FR-CAP-SIDEPANEL-WIDTH` | architecture.md | Détail de mise en page CSS — pas une exigence produit. |
| `FR-CAP-HISTORY-SLIDER` | (deprecated 2026-05-10) | Mode libre / Labo retiré du produit. FR supprimée. |
| `FR-CAP-RELEVANCE-STORE-REMOVED` | drift-code-vs-doc.md (DRIFT) | Décision de refactor interne, plus une exigence active. |
| `FR-PIE-AI-GENERATION` | §8.1 Cerveau | Concerne la génération de cocon côté Cerveau, pas le Capitaine. |
| `FR-PIE-CERVEAU-OVERRIDE` | §8.1 Cerveau | Idem — édition côté Cerveau. |

> Les FRs marquées « architecture.md » sont des **conventions de code interne** (nommage de symboles, conventions CSS) qui n'étaient pas perçues par l'utilisateur final. Elles sortent du PRD pour rejoindre la documentation d'architecture, où elles guident les développeurs sans alourdir la spec produit.


### 8.7 — Moteur — Lieutenants (FR-LIE)

> **Rôle de l'onglet.** Une fois le Capitaine verrouillé, l'utilisateur entre dans Lieutenants pour identifier les **mots-clés secondaires qui structureront ses H2/H3**. L'onglet aspire les pages top 10 Google de son Capitaine, en extrait les titres des concurrents, les questions People Also Ask et les regroupements thématiques, puis demande à l'IA de proposer une sélection cohérente que l'utilisateur valide en cochant.

#### FR-LIE-SERP-ANALYZE — Aspiration des pages top 10 sur le mot-clé Capitaine

L'utilisateur déclenche une analyse SERP du Capitaine : l'app récupère les 10 premières pages Google de ce mot-clé, scrape leur contenu HTML, et restitue les titres et structures Hn extraites. Un curseur permet d'élargir l'échantillon (jusqu'à 100 résultats) si la SERP top 10 manque de signaux. Le résultat est mis en cache cross-article — un Capitaine déjà analysé pour un autre article du même cocon ne re-scrape pas.

**Critères d'acceptation**
- L'utilisateur déclenche l'analyse depuis un bouton « Analyser SERP » dans l'onglet.
- L'app affiche le nombre de pages analysées (10 par défaut) et permet de l'ajuster jusqu'à 100.
- Un Capitaine déjà analysé dans la même fenêtre de fraîcheur (cache) est restitué sans nouveau scrape.
- L'analyse expose la liste des concurrents, leurs titres, leurs URLs et le contenu textuel utile.

> **En situation.** Sur l'article rupture conventionnelle, le consultant clique « Analyser SERP » pour le Capitaine « calcul indemnité rupture conventionnelle 2026 ». 20 secondes plus tard, il voit les 10 pages Google de ce mot-clé : service-public.fr, salaire-brut-en-net.fr, juritravail.com… avec leur titre H1 et la structure de leur article. Il sait quels concurrents sont positionnés et peut s'inspirer de leur plan.

→ Conception : [DESIGN-LIE-SERP-ANALYZE](./design-registry.md#design-lie-serp-analyze)

---

#### FR-LIE-EXTRACT-HEADINGS — Récurrence des titres concurrents

Une fois la SERP analysée, l'app extrait les titres H1/H2/H3 de chaque page concurrente et calcule leur fréquence d'apparition. L'utilisateur voit en un coup d'œil quels titres reviennent chez la plupart des concurrents (= sujet incontournable à traiter) versus ceux qui sont propres à une seule page (= angle différenciant possible).

**Critères d'acceptation**
- Pour chaque titre extrait, l'app affiche son niveau (H1, H2, H3), son texte et le pourcentage de concurrents qui le portent.
- Les titres très fréquents (≥ 50 % des concurrents) sont visuellement mis en avant.
- L'utilisateur peut filtrer la vue par niveau (H1 / H2 / H3).

> **En situation.** Sur la SERP top 10 du Capitaine rupture conventionnelle, le consultant voit que « Comment calculer l'indemnité ? » apparaît dans 8 articles sur 10, alors que « Le rôle du conseiller du salarié » n'est porté que par 2 articles. Il décide de traiter la première en H2 incontournable et d'utiliser la seconde comme angle différenciant.

→ Conception : [DESIGN-LIE-EXTRACT-HEADINGS](./design-registry.md#design-lie-extract-headings)

---

#### FR-LIE-PROPOSE-AI — L'IA propose une sélection cohérente de Lieutenants

À partir du contexte SERP (concurrents, PAA, racines du Capitaine), l'utilisateur déclenche une analyse IA qui propose une **sélection de mots-clés secondaires** avec leur niveau Hn recommandé et un score. La proposition est livrée en streaming pour voir le raisonnement apparaître. L'IA filtre automatiquement selon le niveau de l'article : un Pilier reçoit ~5 propositions, un Intermédiaire ~5, un Spécifique ~4.

**Critères d'acceptation**
- L'utilisateur déclenche la proposition depuis un panel IA dédié.
- Le panel streame la réflexion IA en direct.
- La sortie contient des Lieutenants retenus, des Lieutenants éliminés (avec raison), une structure Hn cohérente et des insights de content gap.
- Le nombre de propositions retenues est plafonné selon le niveau de l'article.

> **En situation.** Le consultant clique « Proposer des Lieutenants » dans le panel IA. Sur l'article Intermédiaire rupture conventionnelle, l'IA propose 5 Lieutenants en streaming : « calcul plafond indemnité », « ancienneté rupture conventionnelle », « simulation indemnité », « rupture conventionnelle CDD », « indemnité supra-légale ». Pour chacun : un score, un niveau Hn suggéré (H2 ou H3), une raison.

→ Conception : [DESIGN-LIE-PROPOSE-AI](./design-registry.md#design-lie-propose-ai)

---

#### FR-LIE-GEOFUNNEL-RULE — Règle géo-funnel anti-cannibalisation

Pour éviter qu'un article généraliste se positionne sur des requêtes locales et cannibalise les articles spécifiques du cocon, l'IA respecte une règle stricte selon le niveau : un Pilier peut citer 1 à 2 villes maximum, un Intermédiaire **aucune**, un Spécifique **aucune** (le local doit être réservé à des articles vraiment dédiés). Toute violation est pénalisée dans le score de la proposition.

**Critères d'acceptation**
- Une proposition de Lieutenant Pilier avec ≤ 2 villes n'est pas pénalisée.
- Une proposition de Lieutenant Pilier avec ≥ 3 villes voit son score baisser.
- Une proposition de Lieutenant Intermédiaire ou Spécifique avec ≥ 1 ville voit son score baisser fortement.

> **En situation.** Sur l'article Intermédiaire rupture conventionnelle, l'IA aurait pu suggérer « rupture conventionnelle Toulouse » comme Lieutenant. La règle géo-funnel l'élimine et la signale dans les éliminés avec « Trop local pour un Intermédiaire — réserver à un Spécifique dédié ». Le consultant comprend pourquoi sans avoir à deviner.

→ Conception : [DESIGN-LIE-GEOFUNNEL-RULE](./design-registry.md#design-lie-geofunnel-rule)

---

#### FR-LIE-HN-STRUCTURE — L'IA recommande une structure Hn pour l'article

À partir de la sélection de Lieutenants retenue, l'utilisateur peut demander à l'IA une **structure de plan Hn** : H1 (l'article lui-même), puis H2 et H3 organisés selon une logique cohérente (introduction → développement → cas particuliers → conclusion). La recommandation est texte libre — pas une liste rigide — pour laisser à l'utilisateur le soin d'arbitrer.

**Critères d'acceptation**
- L'utilisateur déclenche la recommandation depuis un bouton dédié dans le panel IA.
- La sortie est une recommandation textuelle (markdown) avec H1, H2 et H3 organisés.
- L'utilisateur peut régénérer s'il n'est pas satisfait.

> **En situation.** Le consultant a verrouillé 5 Lieutenants pour son article rupture conventionnelle. Il clique « Recommander une structure Hn » : l'IA propose un plan en 6 H2 (« Comprendre la rupture conventionnelle », « Comment calculer son indemnité », « Les cas particuliers : ancienneté, CDD, senior », « Simulateur pratique », « Erreurs à éviter », « FAQ »). Il garde la structure, ajuste un titre, et peut maintenant rédiger.

→ Conception : [DESIGN-LIE-HN-STRUCTURE](./design-registry.md#design-lie-hn-structure)

---

#### FR-LIE-SECTIONS-FOLDABLE — Sections dépliables pour ne pas surcharger l'écran

L'onglet Lieutenants regroupe trois sections d'aide en lecture (Hn concurrents, PAA niveau 2, regroupements Cerveau), chacune dépliable. Par défaut elles sont repliées pour ne pas surcharger l'écran. L'utilisateur déplie celle dont il a besoin au moment où il en a besoin.

**Critères d'acceptation**
- Trois sections sont visibles dans le panneau d'analyse SERP : titres concurrents, PAA niveau 2, groupes croisés (provenant du Cerveau).
- Chaque section est repliée par défaut, dépliable par clic sur son chevron.
- Une section dépliée charge son contenu uniquement à ce moment (lazy load).

> **En situation.** Le consultant cherche à savoir si les concurrents répondent à « Comment refuser une rupture conventionnelle ? ». Il déplie la section « PAA niveau 2 », trouve sa réponse, replie la section et passe à la suivante. L'écran ne devient jamais surchargé.

→ Conception : [DESIGN-LIE-SECTIONS-FOLDABLE](./design-registry.md#design-lie-sections-foldable)

---

#### FR-LIE-CANDIDATES-BADGES — Badges qui indiquent la provenance et la force des candidats

Chaque candidat Lieutenant proposé par l'IA porte des **badges visuels** qui résument sa provenance (SERP / PAA / Groupe Cerveau) et sa pertinence estimée (Fort / Moyen / Faible). Permet à l'utilisateur de comprendre en un regard *pourquoi* l'IA recommande ce candidat sans avoir à lire la justification complète.

**Critères d'acceptation**
- Chaque candidat affiche un ou plusieurs badges de provenance.
- Chaque candidat affiche un badge de force (Fort / Moyen / Faible).
- Les badges sont colorés différemment pour être lisibles d'un coup d'œil.

> **En situation.** Le candidat « simulateur indemnité rupture conventionnelle » porte les badges `[SERP][PAA]` (présent à la fois chez les concurrents et dans les questions PAA) plus `Fort`. Le consultant voit qu'il est doublement validé et le coche en priorité.

→ Conception : [DESIGN-LIE-CANDIDATES-BADGES](./design-registry.md#design-lie-candidates-badges)

---

#### FR-LIE-CHECKBOX-COUNT — Cases à cocher avec compteur recommandé selon le niveau

L'utilisateur sélectionne ses Lieutenants en cochant des cases. Un compteur indique combien de Lieutenants sont recommandés selon le niveau de l'article (Pilier : 5-8, Intermédiaire : 3-5, Spécifique : 1-3). Quand l'utilisateur dépasse ou est sous la fourchette, le compteur le signale visuellement. La sélection est sauvegardée automatiquement (court délai après le dernier clic).

**Critères d'acceptation**
- Chaque candidat a une case à cocher.
- Un compteur affiche le nombre de cochés et la fourchette recommandée pour le niveau de l'article.
- La sauvegarde est automatique avec un court délai (pas de bouton « Enregistrer »).

> **En situation.** Sur son article Intermédiaire, le consultant a coché 4 Lieutenants. Le compteur affiche « 4 / 3-5 — bon nombre ». Il en coche un 6ᵉ, le compteur passe à « 6 / 3-5 — trop nombreux, l'article risque de se disperser ». Il décoche celui qu'il trouve le moins pertinent.

→ Conception : [DESIGN-LIE-CHECKBOX-COUNT](./design-registry.md#design-lie-checkbox-count)

---

#### FR-LIE-SLIDER-INTELLIGENT — Curseur d'élargissement intelligent

Le curseur qui contrôle le nombre de pages SERP analysées est **intelligent** : sous la valeur par défaut, il filtre localement les résultats déjà scrapés (économie API) ; au-dessus, il lance un scraping complémentaire pour récupérer les pages supplémentaires.

**Critères d'acceptation**
- Le curseur affiche la position et le nombre de résultats correspondants.
- Sous la valeur par défaut, ajuster le curseur ne déclenche aucun nouvel appel API.
- Au-dessus de la valeur par défaut, ajuster le curseur déclenche un scraping complémentaire des pages manquantes.

> **En situation.** Après l'analyse top 10, le consultant veut voir comment se positionnent les pages 11-20. Il pousse le curseur à 20 : l'app scrape les 10 pages supplémentaires. Le mois suivant, sur un autre article, il pousse le curseur sur le même Capitaine : les 10 supplémentaires sont en cache, aucun appel.

→ Conception : [DESIGN-LIE-SLIDER-INTELLIGENT](./design-registry.md#design-lie-slider-intelligent)

---

#### FR-LIE-CHECK — Étape Moteur « Lieutenants verrouillés » posée automatiquement

Quand l'utilisateur a coché au moins un Lieutenant **et** que la structure Hn de l'article est non-vide, l'étape Moteur « Lieutenants verrouillés » est posée automatiquement. La double condition garantit que l'étape ne se valide pas tant que la Rédaction n'a pas l'info dont elle a besoin (= la structure Hn).

**Critères d'acceptation**
- L'étape `moteur:lieutenants_locked` est posée dès que **les deux conditions** sont remplies (≥ 1 Lieutenant verrouillé + structure Hn non vide).
- Si l'utilisateur décoche tous les Lieutenants ou efface la structure Hn, l'étape est retirée automatiquement.
- À l'ouverture de l'onglet, si la base contient une étape franchie mais qu'une des deux conditions n'est plus vraie, l'app retire l'étape (réconciliation défensive).

> **En situation.** Le consultant verrouille son 1ᵉʳ Lieutenant : l'étape ne s'inscrit pas tout de suite — la structure Hn est encore vide. Il déclenche la recommandation IA structure Hn, l'IA propose un plan, il valide. Au moment où la structure Hn devient non-vide, le 4ᵉ dot de l'article passe de `○` à `●` au dashboard.

→ Conception : [DESIGN-LIE-CHECK](./design-registry.md#design-lie-check)

---

#### FR-LIE-AI-FRONTIER — Frontière visuelle stricte entre données utilisateur et suggestions IA

Sur l'onglet Lieutenants, deux zones cohabitent : les **données validées par l'utilisateur** (cards Lieutenants verrouillés, cards éliminés, structure Hn) et la **coque Suggestions IA** (propositions non encore actées). Ces deux zones doivent rester **visuellement distinctes** — la frontière est un invariant UX. L'utilisateur doit savoir à tout moment si ce qu'il regarde est une décision sienne ou une proposition à valider.

**Critères d'acceptation**
- Les containers « Lieutenants verrouillés » et « Structure Hn validée » sont rendus en dehors de la coque IA.
- Aucun refactor visuel ne doit absorber ces containers dans la coque IA (test architectural permanent).
- La couleur, l'indentation ou l'encadrement signalent clairement la distinction.

> **En situation.** Une refonte plus tard, un nouveau développeur veut « simplifier » l'écran en mettant tout dans un seul panneau IA. Le test architectural échoue immédiatement et pointe vers cette FR — la régression est bloquée avant d'arriver en prod. Le consultant continue de distinguer ses choix des propositions IA.

→ Conception : [DESIGN-LIE-AI-FRONTIER](./design-registry.md#design-lie-ai-frontier)

---

#### FR-LIE-SCRAPE-DEDIE — Service métier dédié pour l'analyse Lieutenants

L'analyse Lieutenants utilise un service backend dédié qui se concentre uniquement sur les **titres** des concurrents (Hn). Ce service ne sait rien du Lexique et ne dépend d'aucun appel SERP partagé — l'utilisateur peut lancer Lieutenants seul, sans avoir préalablement déclenché Lexique ou inversement. Découplage qui évite les bugs d'ordre invisibles vu auparavant.

**Critères d'acceptation**
- L'onglet Lieutenants démarre sans aucune dépendance vers le service Lexique.
- Un test architectural vérifie l'absence d'import croisé entre les deux services.
- Si le scrape HTML d'un concurrent existe déjà côté Lexique, le service Lieutenants le réutilise (cache mémoire 1 h partagé).

> **En situation.** Le consultant veut juste regarder la structure des concurrents pour son article rupture conventionnelle, sans toucher au Lexique. Il déclenche Lieutenants : ça fonctionne sans pré-condition. Un mois plus tard, sur un nouvel article, il déclenche Lexique en premier (sur un Capitaine déjà analysé Lieutenants ailleurs) : ça fonctionne aussi, le scrape est partagé en mémoire.

→ Conception : [DESIGN-LIE-SCRAPE-DEDIE](./design-registry.md#design-lie-scrape-dedie)

---

#### FR-LIE-CHECKBOX-LOCK-IMMEDIATE — Cocher un Lieutenant le verrouille immédiatement *(déplacée depuis §8.6 le 2026-05-12)*

Cocher la case d'un Lieutenant **verrouille immédiatement ce Lieutenant en base** — pas de bouton « Verrouiller la sélection » à cliquer ensuite. Décocher la case déverrouille instantanément. Cocher plusieurs Lieutenants successivement laisse toutes les checkboxes cliquables — il n'y a pas de mode « panneau verrouillé » qui bloquerait l'utilisateur. Toutes les autres actions (Refresh SERP, Régénérer IA, Sauvegarder structure Hn) restent disponibles en permanence, quel que soit le nombre de Lieutenants verrouillés.

**Critères d'acceptation**
- Cocher 1 Lieutenant ne désactive jamais les autres checkboxes.
- Le bouton « Refresh SERP » reste cliquable même quand plusieurs Lieutenants sont verrouillés.
- Le bouton « Régénérer IA » reste cliquable même quand plusieurs Lieutenants sont verrouillés.
- Aucun badge « Panneau verrouillé » n'apparaît dans le DOM.
- La règle de gating de l'étape « Lieutenants verrouillés » suit `FR-MOT-WORKFLOW-GATING-DUAL` (cocher seul ne suffit pas — il faut aussi la structure Hn renseignée).

> **En situation.** L'utilisateur coche son 1ᵉʳ Lieutenant à 10h00. À 10h02, il en coche un 2ᵉ. Pendant ces deux gestes, les autres cases restent cliquables, le bouton Refresh SERP reste actif. À 10h05, il décide de régénérer la proposition IA — le bouton est actif aussi. Il n'a jamais besoin de « tout déverrouiller » avant d'agir.

→ Conception : [DESIGN-LIE-CHECKBOX-LOCK-IMMEDIATE](./design-registry.md#design-lie-checkbox-lock-immediate)

---

### 8.8 — Moteur — Lexique (FR-LEX)

> **Rôle de l'onglet.** Le Lexique est la dernière étape Phase ② du Moteur. L'utilisateur arrive ici avec un Capitaine et des Lieutenants verrouillés. L'app extrait des contenus concurrents top 10 les **termes les plus utilisés** statistiquement, les répartit en trois niveaux (Obligatoires / Différenciateurs / Optionnels), et l'utilisateur valide ceux qu'il veut absolument retrouver dans son article. Cette liste est ensuite injectée dans les prompts de Rédaction pour guider l'écriture.

#### FR-LEX-TFIDF — Extraction statistique des termes utilisés par les concurrents

L'app analyse le contenu textuel des pages top 10 Google du Capitaine et **mesure la fréquence d'apparition de chaque terme** : un terme présent chez ≥ 70 % des concurrents est marqué **Obligatoire**, entre 30 et 70 % **Différenciateur**, sous 30 % **Optionnel**. Les mots-outils du français (les, des, pour, sur, par…) sont ignorés. L'utilisateur voit une liste triée par densité, plafonnée à 50 termes par niveau pour rester lisible. Le calcul réutilise les contenus déjà scrapés pour Lieutenants — aucun nouvel appel API.

**Critères d'acceptation**
- L'app produit trois listes (Obligatoires, Différenciateurs, Optionnels) avec des termes triés par densité descendante.
- Les termes inférieurs à 3 caractères et les mots-outils sont absents des résultats.
- Chaque liste est plafonnée à 50 termes pour ne pas surcharger l'écran.
- L'extraction ne déclenche aucun nouvel appel à DataForSEO si le SERP a déjà été scrappé (réutilisation Lieutenants → Lexique).

> **En situation.** Sur l'article rupture conventionnelle, l'utilisateur clique « Extraire le Lexique ». 2 secondes plus tard : section **Obligatoires** (24 termes — « indemnité », « salaire », « calcul », « brut », « net »…), section **Différenciateurs** (18 termes — « plafond », « ancienneté », « senior », « cdd »…), section **Optionnels** (35 termes). Il voit en un coup d'œil le vocabulaire que les top 10 Google considèrent incontournable.

→ Conception : [DESIGN-LEX-TFIDF](./design-registry.md#design-lex-tfidf)

---

#### FR-LEX-SORT — Trois modes de tri (A-Z, densité, pertinence douleur)

L'utilisateur peut trier chaque liste de trois manières : **A-Z** (recherche d'un terme précis), **densité** (les plus fréquents en haut), **pertinence par rapport à la douleur** (les termes qui partagent le vocabulaire du point de douleur en haut). Le tri par douleur n'est proposé que si l'article a un point de douleur défini ; sinon le bouton est masqué.

**Critères d'acceptation**
- L'utilisateur bascule le tri via une barre de boutons en haut de la liste.
- Le tri par densité est le tri par défaut.
- Le tri par pertinence douleur n'apparaît que si un point de douleur est renseigné sur l'article.
- Le tri choisi reste persistant pendant la session navigateur (pas après reload).

> **En situation.** Le consultant fouille la liste Différenciateurs pour décider quels termes garder. Avec le tri par densité, il voit ce qui revient le plus chez les concurrents. Il bascule sur « Pertinence douleur » : le terme « plafond » remonte en première position parce qu'il chevauche le point de douleur « je ne sais pas combien je vais toucher ». Il le coche en priorité.

→ Conception : [DESIGN-LEX-SORT](./design-registry.md#design-lex-sort)

---

#### FR-LEX-SELECT — Cases à cocher individuelles, persistance immédiate

L'utilisateur sélectionne les termes qu'il veut **absolument retrouver dans son article** en cochant une case par terme. Les termes du niveau **Obligatoire** sont pré-cochés au premier affichage (heuristique : si la majorité des concurrents l'utilise, l'utilisateur le veut probablement aussi). Chaque cochage/décochage est sauvegardé immédiatement — pas de bouton « Enregistrer ».

**Critères d'acceptation**
- Chaque terme affiche une case à cocher individuelle.
- Les termes du niveau Obligatoire sont pré-cochés à la première affichage.
- Le clic sur une case enregistre le changement aussitôt en base.
- Recharger la page retrouve les choix exactement.

> **En situation.** Le consultant ouvre l'onglet Lexique : les 24 Obligatoires sont déjà cochés. Il décoche 3 termes qu'il juge déplacés (« licenciement » par exemple, car son article ne parle pas du licenciement), puis coche 7 Différenciateurs et 4 Optionnels qu'il veut introduire. Il ferme l'onglet, va boire un café, revient — ses 32 cases cochées sont intactes.

→ Conception : [DESIGN-LEX-SELECT](./design-registry.md#design-lex-select)

---

#### FR-LEX-AI-PANEL — Panel IA d'analyse et de recommandations sur le Lexique

Un panel IA dédié analyse en streaming les trois listes (Obligatoires, Différenciateurs, Optionnels) en croisant avec le point de douleur de l'article et le contexte stratégique du cocon. Il pointe les **termes manquants** que les concurrents n'utilisent pas mais qui colleraient à la douleur, et suggère des **angles** pour utiliser les Différenciateurs comme leviers de différenciation.

**Critères d'acceptation**
- L'utilisateur déclenche l'analyse depuis un panel dédié.
- L'analyse streame son texte au fil de la génération.
- L'analyse mentionne explicitement le point de douleur et la stratégie du cocon.
- L'utilisateur peut relancer l'analyse après modification du Lexique sélectionné.

> **En situation.** Le consultant clique « Lancer l'analyse IA Lexique ». L'IA streame : « Vos Obligatoires couvrent bien la dimension calcul mais aucun concurrent n'utilise “simulateur gratuit” ni “estimation en ligne” — pourtant ce sont les requêtes les plus chercheuses sur cette douleur. Suggérez d'ajouter ces termes comme angle différenciant ». Le consultant ajoute « simulateur » et « estimation » dans son brief.

→ Conception : [DESIGN-LEX-AI-PANEL](./design-registry.md#design-lex-ai-panel)

---

#### FR-LEX-MULTI-KEYWORD — Tester le Lexique d'un autre mot-clé du cocon

En complément du Lexique du Capitaine, l'utilisateur peut **tester librement un autre mot-clé** (par exemple un Lieutenant, ou un mot-clé du cocon qu'il pressent intéressant). L'app refait l'extraction TF-IDF complète pour ce mot-clé et l'affiche dans un onglet séparé. L'utilisateur peut comparer les vocabulaires de plusieurs mots-clés et en tirer des termes communs ou complémentaires.

**Critères d'acceptation**
- Un champ « Tester un mot-clé » permet de saisir n'importe quel mot-clé.
- L'app extrait le Lexique de ce mot-clé et l'affiche dans un nouvel onglet.
- L'utilisateur peut basculer entre les onglets sans perdre l'état des cases cochées.
- Plusieurs explorations peuvent coexister par article.

> **En situation.** Le consultant a validé le Lexique du Capitaine « calcul indemnité rupture conventionnelle 2026 ». Curieux, il teste aussi « rupture conventionnelle CDD » (son Lieutenant). Surprise : 8 termes apparaissent en Obligatoires qui n'étaient même pas dans le Lexique du Capitaine (« précarité », « 10% », « bareme »…). Il en intègre 4 dans son brief.

→ Conception : [DESIGN-LEX-MULTI-KEYWORD](./design-registry.md#design-lex-multi-keyword)

---

#### FR-LEX-CHECK — Étape Moteur « Lexique validé » posée quand au moins un terme est coché

L'étape Moteur « Lexique validé » est posée automatiquement dès que l'utilisateur a au moins un terme coché dans le Lexique. Décocher le dernier terme retire l'étape. La règle est simple : pas de seuil minimal de termes, juste la preuve d'une intention de validation. Au mount de l'onglet, une réconciliation défensive corrige les éventuelles incohérences (étape posée en base mais aucun terme coché, ou inversement).

**Critères d'acceptation**
- L'étape `moteur:lexique_validated` est posée dès qu'un terme est coché.
- Décocher tous les termes retire l'étape automatiquement.
- À l'ouverture, si la base contient l'étape mais aucun terme coché, l'app la retire ; et inversement.

> **En situation.** Le consultant coche son 1ᵉʳ terme du Lexique : le 5ᵉ dot du dashboard passe de `○` à `●`. Plus tard il décoche tous ses termes pour repartir de zéro : le dot revient à `○`. Il recoche : `●`. La cohérence est garantie sans qu'il ait à se soucier de quoi que ce soit.

→ Conception : [DESIGN-LEX-CHECK](./design-registry.md#design-lex-check)

#### FR-LEX-SCRAPE-DEDIE — Service backend dédié indépendant de Lieutenants

Le Lexique repose sur un service backend dédié, qui n'a aucune dépendance sur le service Lieutenants. Il lit directement les contenus textuels des concurrents top 10 du mot-clé visé, calcule l'analyse statistique des termes, et la rend disponible. L'utilisateur peut ainsi déclencher le Lexique sans avoir préalablement déclenché Lieutenants — les deux onglets sont devenus indépendants.

**Critères d'acceptation**
- Lancer le Lexique sur un Capitaine vierge fonctionne, même si Lieutenants n'a jamais été déclenché sur ce mot-clé.
- Si le contenu des concurrents est déjà scrappé (Lieutenants ou exploration précédente), le service le réutilise — pas de double appel.
- Si rien n'est encore scrappé, le service peut soit le déclencher (cf. `FR-LEX-PRECHECK-SERP`), soit signaler que ce n'est pas encore disponible.
- Aucun test architectural ne tolère un import du service Lexique vers le service Lieutenants ou inversement.

> **En situation.** L'utilisateur ouvre l'onglet Lexique sur son article rupture conventionnelle alors qu'il n'a pas encore fait Lieutenants. Au lieu d'un message d'erreur cryptique, l'app lui propose explicitement de lancer une analyse SERP dédiée (cf. `FR-LEX-PRECHECK-SERP`). Il accepte. L'analyse tourne, le Lexique est extrait. Plus tard sur un autre article, il commence par Lieutenants : le Lexique réutilise le scrape sans rappel.

→ Conception : [DESIGN-LEX-SCRAPE-DEDIE](./design-registry.md#design-lex-scrape-dedie)

---

#### FR-LEX-PRECHECK-SERP — Vérification préalable et CTA explicite si rien n'a été scrappé

Quand l'utilisateur ouvre l'onglet Lexique, l'app vérifie d'abord si le contenu SERP du mot-clé visé existe déjà. Si oui, le bouton « Extraire le Lexique » est immédiatement actif. Si non, l'app affiche un message clair *« Le scrape SERP n'est pas encore disponible pour ce mot-clé »* avec un bouton d'action *« Lancer l'analyse SERP »*, accompagné de son coût estimé et d'une demande de confirmation. **Plus jamais d'erreur 404 mystérieuse** dans la console — l'absence de scrape est devenue un état attendu, géré explicitement.

**Critères d'acceptation**
- Au mount de l'onglet, l'app interroge silencieusement la présence du scrape avant d'afficher l'interface.
- Si présent, le bouton « Extraire le Lexique » est actif immédiatement.
- Si absent, un CTA « Lancer l'analyse SERP » apparaît à la place, avec mention explicite du coût.
- Le clic sur ce CTA ouvre une modale de confirmation avant d'engager le coût.
- Aucun appel direct à « Extraire » n'aboutit à un 404 — la pré-vérification empêche ce cas.

> **En situation.** L'utilisateur arrive sur l'onglet Lexique d'un article vierge. Au lieu d'un bouton « Extraire » qui partirait en 404, il voit : *« Le scrape SERP n'est pas encore disponible pour “calcul indemnité rupture conventionnelle 2026”. Lancer l'analyse SERP (consomme environ 0,003 €)* ». Il clique, une modale lui demande de confirmer, il valide. L'analyse tourne, le Lexique apparaît. Aucune erreur dans la console, aucune frustration.

→ Conception : [DESIGN-LEX-PRECHECK-SERP](./design-registry.md#design-lex-precheck-serp)

---

#### FR-LEX-MULTI-KEYWORD-TABS — Système d'onglets pour explorer plusieurs mots-clés

Chaque mot-clé que l'utilisateur teste dans le Lexique (cf. `FR-LEX-MULTI-KEYWORD`) apparaît dans un **onglet horizontal** en haut du panneau. Le label de l'onglet est le mot-clé tel qu'il a été saisi (pas de transformation). L'utilisateur peut basculer entre les onglets sans refetch ni perte de cases cochées. Un onglet « + Tester un mot-clé » permet d'ouvrir une nouvelle exploration.

**Critères d'acceptation**
- Chaque exploration Lexique d'un article apparaît dans un onglet horizontal.
- Le label de chaque onglet est strictement le mot-clé saisi par l'utilisateur (pas de minuscules forcées ni de transformation).
- Cliquer sur un onglet bascule l'affichage sans nouveau fetch.
- Un onglet « + Tester un mot-clé » ouvre le champ de saisie pour démarrer une nouvelle exploration.
- Au reload de la page, tous les onglets et leur état coché sont restaurés.

> **En situation.** Le consultant a déjà exploré 3 mots-clés sur son article rupture conventionnelle : le Capitaine principal plus 2 Lieutenants pour comparaison. L'onglet Lexique affiche en haut 4 boutons : 3 explorations + 1 « + Tester un mot-clé ». Il bascule de l'une à l'autre instantanément. Toutes ses cases cochées sont préservées dans chaque onglet.

→ Conception : [DESIGN-LEX-MULTI-KEYWORD-TABS](./design-registry.md#design-lex-multi-keyword-tabs)

---

#### FR-LEX-LECTURE-VS-VERROUILLAGE — Séparation stricte entre exploration et validation

Deux gestes distincts cohabitent dans le Lexique : **explorer** des Lexiques de mots-clés (FR-LEX-TFIDF, FR-LEX-MULTI-KEYWORD) et **valider** des termes que l'utilisateur veut absolument dans son article (FR-LEX-SELECT). Ces deux gestes sont **séparés strictement côté code** : l'exploration ne touche jamais à la sélection finale, et la sélection ne déclenche jamais de fetch d'exploration. La conséquence pour l'utilisateur : la lecture de la liste TF-IDF est instantanée même si on cocher/décocher rapidement, et inversement la validation est sauvegardée sans recharger les listes.

**Critères d'acceptation**
- Naviguer entre les onglets d'exploration ne déclenche aucune sauvegarde de termes.
- Cocher/décocher un terme ne déclenche aucun refetch de la liste TF-IDF.
- Un test architectural permanent vérifie cette séparation et empêche toute régression.
- L'inscription/retrait de l'étape Moteur « Lexique validé » suit uniquement la sélection (pas l'exploration).

> **En situation.** Le consultant explore rapidement 4 mots-clés différents pour comparer leur Lexique. Chaque bascule est instantanée. Une fois sa stratégie de vocabulaire claire, il revient sur l'onglet du Capitaine, coche 32 termes. Chacun de ses cochages est sauvegardé sans qu'il voie aucun « chargement » ni que ses listes TF-IDF ne soient rechargées. Les deux gestes sont indépendants.

→ Conception : [DESIGN-LEX-LECTURE-VS-VERROUILLAGE](./design-registry.md#design-lex-lecture-vs-verrouillage)

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
**Séparation stricte des responsabilités lecture vs verrouillage** *(actif 2026-05-09 — Stories E3-S1+S2+S3 chantier 3)*. Deux familles de fonctions strictement séparées via deux composables Vue dédiés :

**Famille LECTURE** — `src/composables/lexique/useLexiqueExplorations.ts` :
- `pastExplorations`, `activeSourceKeyword`, `tfidfResult`, `iaRecommendations` (refs propres au composable).
- `hydrateFromDb()` / `mergeFromDb()` — GET `/articles/:id/explorations` (lecture seule).
- `selectExploration(sourceKeyword)` — switch onglet pur (lit le cache, 0 fetch).
- `addExploration(entry)` — push local post-extractCustomKeyword.
- `reset()` — purge cache sur switch d'article.
- **Aucune mutation** de `article_keywords.lexique`. Aucun import de `article-keywords.store`. Le seul import depuis `api.service` est `apiGet`.

**Famille VERROUILLAGE** — `src/composables/lexique/useLexiqueLocking.ts` :
- `lockedTerms` (proxy lecture `store.keywords.lexique`), `isLocked` (computed length>0).
- `toggleTerm(term)` — délègue à `articleKeywordsStore.add/removeLexiqueTerm` puis `saveDecisions(id)` → 1 PUT `/articles/:id/keywords` par toggle.
- **Aucune lecture** de `lexique_explorations`. Aucun appel `apiGet('/explorations')`.

**Watcher gating workflow isolé** — `LexiquePanel.vue` conserve le watcher `isLocked` qui émet `check-completed`/`check-removed` `MOTEUR_LEXIQUE_VALIDATED`. C'est de la propagation de check workflow (orchestration MoteurView ↔ LexiquePanel), distincte des deux familles LECTURE/VERROUILLAGE (AC.LEX-SEP.4).

**Critères d'acceptation testables** :
- AC.LEX-SEP.1 : Test unitaire — appels aux fonctions LECTURE déclenchent **0 PUT** vers `/articles/:id/keywords`. *(test : `tests/unit/composables/lexique/useLexiqueExplorations.test.ts`, 5 verts)*
- AC.LEX-SEP.2 : Test unitaire — appels aux fonctions VERROUILLAGE déclenchent **0 GET** vers `/articles/:id/explorations`. *(test : `tests/unit/composables/lexique/useLexiqueLocking.test.ts`, 4 verts)*
- AC.LEX-SEP.3 : Test architectural (grep code, commentaires ignorés) — useLexiqueExplorations.ts n'importe que `apiGet` et n'appelle aucune fonction VERROUILLAGE ; useLexiqueLocking.ts n'utilise jamais `hydrateFromDb`/`mergeFromDb`/`pastExplorations`/`/explorations`. *(test : `tests/unit/architecture/lexique-separation.test.ts`, 4 verts)*
- AC.LEX-SEP.4 : Test architectural — le watcher `isLocked` + emit `MOTEUR_LEXIQUE_VALIDATED` est présent dans LexiquePanel.vue mais absent des deux composables. *(test : `tests/unit/architecture/lexique-watcher-isolated.test.ts`, 3 verts)*

**Métriques refacto** :
- LexiquePanel.vue `<script>` : 497 → 299 lignes (-40 %).
- 9 stories livrées sur 1 branche unique `feat/chantier-3-ux-lexique`.

**Statut :** **active** *(implémenté 2026-05-09 — Story E3 chantier 3)*. **Depuis :** 2026-05-09. **Source :** plan-chantier-3-ux-lexique.
**Voir aussi :** FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-MULTI-KEYWORD-TABS.

---

#### FR-LEX-CHECKBOX-LOCK-IMMEDIATE — Cocher un terme du Lexique l'ajoute immédiatement à la sélection *(déplacée depuis §8.6 le 2026-05-12)*

Cocher la case d'un terme TF-IDF **l'ajoute immédiatement** à la sélection du Lexique de l'article — pas de bouton « Verrouiller le Lexique » à cliquer après. Décocher la case retire le terme aussitôt. L'étape Moteur « Lexique validé » suit automatiquement : elle est posée dès que la sélection contient au moins un terme, retirée dès qu'elle redevient vide.

**Critères d'acceptation**
- Cocher une case ajoute le terme à `keywords.lexique` immédiatement.
- Décocher la case retire le terme immédiatement.
- L'étape `moteur:lexique_validated` apparaît dès le premier terme coché et disparaît si l'utilisateur décoche tous les termes.
- Aucun bouton « Verrouiller le Lexique » global n'existe dans le panneau.

> **En situation.** L'utilisateur parcourt la liste TF-IDF de son Lexique. Il coche les 12 termes Obligatoires que les concurrents partagent tous, le 4ᵉ dot du dashboard passe à `●`. Puis il coche un Différenciateur, décoche un Obligatoire qu'il juge déplacé — la sélection s'ajuste à chaque clic, sans validation explicite.

→ Conception : [DESIGN-LEX-CHECKBOX-LOCK-IMMEDIATE](./design-registry.md#design-lex-checkbox-lock-immediate)

---

### 8.9 — Moteur — Finalisation (FR-FIN)

#### FR-FIN-RECAP — Récapitulatif lecture seule des trois verrouillages Phase ②

Au moment de quitter le Moteur pour passer à la rédaction, l'utilisateur a besoin d'un dernier coup d'œil sur les décisions qu'il vient de prendre : quel mot-clé Capitaine il a verrouillé, quels Lieutenants il a retenus (et à quel niveau Hn), quels termes de lexique il a validés. L'onglet **Finalisation** affiche ce récapitulatif en lecture seule, organisé en trois sections repliables (Capitaine, Lieutenants, Lexique). Aucune modification possible depuis cet onglet — pour corriger, l'utilisateur revient à l'onglet concerné (Capitaine / Lieutenants / Lexique). L'onglet Finalisation est toujours navigable, mais son contenu n'a de sens que lorsque les trois verrous Phase ② sont posés.

**Critères d'acceptation**
- L'onglet Finalisation affiche le mot-clé Capitaine verrouillé sur l'article courant.
- L'onglet Finalisation liste les Lieutenants verrouillés avec leur niveau Hn et, si disponible, le raisonnement IA associé.
- L'onglet Finalisation liste l'ensemble des termes du lexique validés.
- Les trois sections sont repliables/dépliables individuellement, ouvertes par défaut.
- Aucun bouton, champ ou contrôle ne permet d'éditer une valeur depuis cet onglet — seuls le repli/déploiement des sections et le bouton de navigation vers la rédaction sont actionnables.
- Si une catégorie est vide (par exemple aucun Lieutenant verrouillé), un message neutre l'indique au lieu de masquer la section.

> **En situation.** Vendredi en fin de journée, l'utilisateur a passé l'après-midi sur l'article « Calcul indemnité rupture conventionnelle ». Il a verrouillé son Capitaine (« calcul indemnité rupture conventionnelle 2026 »), retenu 4 Lieutenants (« indemnité légale », « ancienneté », « plafond », « simulation »), et validé une vingtaine de termes de lexique. Avant de lancer la rédaction lundi matin, il bascule sur l'onglet Finalisation et déroule les trois sections : tout est là, propre, à plat — pas besoin de re-cliquer dans Capitaine puis Lieutenants puis Lexique pour vérifier. Il voit aussi que son Lieutenant « plafond » est annoté H3 alors qu'il pensait H2 — il revient sur l'onglet Lieutenants en un clic pour ajuster, puis retourne à Finalisation. Confiance restaurée, il peut partir pour le week-end.

→ Conception : [DESIGN-FIN-RECAP](./design-registry.md#design-fin-recap)

---

#### FR-FIN-LINK-REDACTION — Bouton de transition vers la Rédaction

Une fois les trois verrouillages Phase ② posés, l'utilisateur dispose d'un bouton explicite **« Aller à la Rédaction »** qui le bascule sur la vue de production éditoriale de l'article. Tant que l'un des trois verrous manque, le bouton de transition global (en pied de page du Moteur) reste désactivé et son tooltip énumère les étapes restantes, pour que l'utilisateur sache immédiatement quoi faire et où aller.

**Critères d'acceptation**
- Un bouton « Aller à la Rédaction » est présent sur l'onglet Finalisation.
- En pied de page du Moteur, le bouton « Continuer vers la Rédaction » est désactivé tant que l'un des trois verrous (Capitaine, Lieutenants, Lexique) n'est pas posé.
- Quand le bouton est désactivé, son tooltip natif liste les étapes manquantes (par exemple : « Étapes restantes : Capitaine à verrouiller, Lexique à valider »).
- Le clic sur le bouton actif emmène l'utilisateur sur l'écran de Rédaction de l'article courant, dans le même cocon — sans perte de contexte.
- Si l'utilisateur revient au Moteur depuis la Rédaction, l'onglet Finalisation est de nouveau immédiatement utilisable, les verrouillages persistent.

> **En situation.** Lundi matin, l'utilisateur reprend l'article « Calcul indemnité rupture conventionnelle ». Il rouvre l'onglet Finalisation, le récap est intact (les trois verrous ont survécu au week-end), et le bouton « Aller à la Rédaction » est cliquable. Un clic, il atterrit sur l'éditeur de l'article. Le pied de page du Moteur affichait déjà ce même bouton, mais il avait préféré passer par l'onglet Finalisation pour vérifier le récap avant. Sur un autre article du même cocon où il n'a verrouillé que le Capitaine, le bouton de pied de page reste grisé avec le tooltip « Étapes restantes : Lieutenants à verrouiller, Lexique à valider » — pas de mystère sur ce qu'il lui reste à faire.

→ Conception : [DESIGN-FIN-LINK-REDACTION](./design-registry.md#design-fin-link-redaction)

---

#### FR-FIN-CHECK — Pas de check workflow dédié à la Finalisation

Le Moteur compte **exactement cinq étapes traçables** : Discovery, Radar (Phase ① Explorer), Capitaine, Lieutenants, Lexique (Phase ② Valider). L'onglet Finalisation est un onglet de **synthèse**, pas une étape de production : il ne consomme et ne produit aucune décision nouvelle, il n'a donc pas de check workflow dédié. L'« avancement » de la Finalisation est entièrement déduit des trois checks Phase ② : si les trois sont posés, l'utilisateur est prêt à passer à la rédaction ; sinon, le récap est incomplet et le bouton de transition reste désactivé.

**Critères d'acceptation**
- Aucune action sur l'onglet Finalisation n'inscrit ou ne retire de check dans la progression de l'article.
- L'état « prêt pour la rédaction » est strictement équivalent à : *Capitaine verrouillé* ET *Lieutenants verrouillés* ET *Lexique validé*.
- L'onglet Finalisation peut être consulté à tout moment, indépendamment de l'état des verrous Phase ② — il informera juste de l'incomplet plutôt que de bloquer l'accès.
- Le bouton « Aller à la Rédaction » dans l'onglet et le bouton « Continuer vers la Rédaction » en pied de page utilisent **la même règle de déverrouillage** — ils ne peuvent pas être dans un état contradictoire.

> **En situation.** L'utilisateur revoit son tableau de progression depuis le dashboard : sur la carte d'un article, il voit 5 dots possibles, pas 6. C'est cohérent avec le Moteur : il n'y a pas d'étape « Finalisation » à valider en tant que telle, juste une transition entre la phase de validation des mots-clés et la phase d'écriture. Quand il finit son Lexique, le 5ᵉ dot se remplit et, dans le même instant, le bouton « Continuer vers la Rédaction » bascule de grisé à actif — sans qu'il ait à passer par l'onglet Finalisation pour cocher quoi que ce soit.

→ Conception : [DESIGN-FIN-CHECK](./design-registry.md#design-fin-check)

---

### 8.10 — Rédaction (FR-RED)

#### FR-RED-BRIEF — Analyse IA du brief avant écriture

Avant de demander à l'IA d'écrire son article, l'utilisateur peut lancer une **analyse stratégique du brief**. Cette analyse lit tout ce qui a été préparé en amont (titre de l'article, mot-clé Capitaine, Lieutenants, Lexique validé, sommaire Hn, questions People-Also-Ask récupérées, top concurrents de la SERP, autres articles du cocon) et produit en quelques secondes un texte qui résume : l'intention de recherche probable derrière la requête, ce que disent les concurrents, où placer un featured snippet, quels risques de cannibalisation existent avec les autres articles du cocon, et comment angler l'introduction. L'analyse s'affiche au fil de l'eau (le texte apparaît phrase par phrase, l'utilisateur n'attend pas la fin pour commencer à lire).

**Critères d'acceptation**
- L'analyse IA est lancée à la demande de l'utilisateur (bouton « Lancer l'analyse » ou « Relancer l'analyse ») — elle ne tourne pas automatiquement.
- Pendant la génération, le texte de l'analyse apparaît progressivement à l'écran (l'utilisateur n'a pas à attendre la fin pour lire le début).
- L'analyse intègre le mot-clé Capitaine, les Lieutenants, le Lexique, le sommaire Hn validés au Moteur, plus les questions People-Also-Ask remontées par la SERP et les autres articles du cocon.
- Le bouton « Relancer l'analyse » est disponible une fois la première génération terminée — il permet de redemander une analyse fraîche si l'utilisateur a modifié quelque chose en amont.
- Si l'analyse n'a jamais été lancée, le panneau affiche un message d'invitation explicite et non un bloc vide.

> **En situation.** Mardi matin, l'utilisateur ouvre l'article « Calcul indemnité rupture conventionnelle 2026 » pour le rédiger. Il vient juste de finir le Moteur la veille (Capitaine + Lieutenants + Lexique verrouillés) et n'a pas encore une vision claire du plan. Il clique sur « Lancer l'analyse » dans le panneau IA Brief. En quinze secondes, l'IA déroule à l'écran : *« L'intention dominante est transactionnelle (l'utilisateur cherche à calculer son indemnité) — placez un simulateur ou un tableau de seuils en H2 #2... Risque de cannibalisation avec votre article "Indemnité légale de licenciement" : différenciez sur le contexte rupture conventionnelle... »*. Il lit, prend deux notes, et se sent prêt à attaquer le sommaire.

→ Conception : [DESIGN-RED-BRIEF](./design-registry.md#design-red-brief)

---

#### FR-RED-OUTLINE — Génération du sommaire de l'article

Une fois le brief consolidé, l'utilisateur déclenche la **génération du sommaire** : l'IA propose une liste structurée de titres (H1 unique pour l'article, suite de H2 et H3 organisés en sections logiques). Chaque section porte une intention pédagogique courte (annotation indicative : *« reformuler la promesse »*, *« répondre à une PAA »*, *« content valeur »*). L'utilisateur voit le sommaire apparaître progressivement à l'écran ; à la fin, il peut le valider tel quel ou le retravailler manuellement (réordonner, éditer un titre, supprimer une section) — toute modification est rétractable via Annuler / Rétablir.

**Critères d'acceptation**
- Le sommaire propose un H1 (titre de l'article), suivi obligatoirement d'une section Introduction et d'une section Conclusion, et un ensemble de H2 / H3 entre les deux.
- Les titres H4 et au-delà ne sont pas générés (l'outil restreint le sommaire aux niveaux 1-3).
- Pendant la génération, l'utilisateur voit le sommaire se construire progressivement ; il peut interrompre s'il n'en veut plus.
- Une fois le sommaire généré, l'utilisateur peut éditer un titre, réordonner les sections par glisser-déposer, supprimer une section ou en ajouter une vide.
- Les boutons Annuler / Rétablir sont actifs après toute modification et restaurent l'état précédent du sommaire.
- Le sommaire validé est persisté et survit à un rechargement de page.

> **En situation.** L'utilisateur clique sur « Générer le sommaire ». L'IA propose : H1 *« Calcul indemnité rupture conventionnelle 2026 »*, H2 *Introduction*, H2 *« Quelle indemnité minimale ? »*, H3 *« Formule légale »*, H3 *« Cas des longues anciennetés »*, H2 *« Simuler son indemnité »*, H2 *« Cas pratiques »*, H2 *Conclusion*. Il trouve que la section *« Cas des longues anciennetés »* est trop spécialisée pour la position H3 — il la promeut en H2 d'un clic. Puis il valide le sommaire ; la liste se fige et le bouton « Générer l'article » devient actionnable.

→ Conception : [DESIGN-RED-OUTLINE](./design-registry.md#design-red-outline)

---

#### FR-RED-ARTICLE — Génération de l'article section par section

À partir du sommaire validé, l'utilisateur lance la **génération de l'article entier**. L'IA n'écrit pas l'article d'un seul bloc : elle traite chaque grande section H2 indépendamment, ce qui permet à l'utilisateur de voir l'article se construire progressivement (introduction d'abord, puis chaque chapitre, enfin la conclusion). Une barre de progression indique à tout moment quelle section est en cours et combien il en reste. La répartition de la longueur cible entre les sections est calculée automatiquement (l'introduction et la conclusion plus courtes, les sections corps plus denses). Si l'IA est temporairement saturée par trop de requêtes, l'outil attend automatiquement quelques secondes et réessaye sans que l'utilisateur ait à intervenir.

**Critères d'acceptation**
- Le bouton « Générer l'article » n'est disponible que si un sommaire valide est présent (au moins une section H2 entre Introduction et Conclusion).
- La génération produit l'article section H2 par section H2 — l'utilisateur voit clairement quelle section est en cours d'écriture (titre + numéro courant / total).
- Le texte généré apparaît au fur et à mesure dans l'éditeur (pas d'attente complète avant affichage).
- La longueur totale cible (mots) est répartie entre les sections de manière proportionnée — l'introduction et la conclusion plus brèves, les sections corps plus longues.
- Si une section échoue parce que l'IA est saturée, l'outil réessaye automatiquement plusieurs fois avant d'abandonner et de signaler l'erreur — l'utilisateur n'a pas à relancer manuellement.
- Une option « activer / désactiver la recherche web » permet à l'IA d'aller chercher des sources actualisées si l'utilisateur le souhaite (option session, pas par défaut sur tous les articles).
- L'article généré est immédiatement sauvegardé après production, pour ne rien perdre en cas de panne du module Méta qui suit.

> **En situation.** L'utilisateur clique sur « Générer l'article » à 10h12 sur son article de 2 200 mots. La barre de progression affiche *« 1/6 — Introduction »*, le texte commence à apparaître à l'écran. À 10h13 elle bascule sur *« 2/6 — Quelle indemnité minimale ? »*. À 10h14, une section met plus de temps — il voit dans la console *« attente avant réessai (saturation IA) »* puis la génération reprend automatiquement. À 10h17, l'article est complet, l'éditeur affiche les 6 sections enchaînées et propres, le contenu est déjà sauvegardé.

→ Conception : [DESIGN-RED-ARTICLE](./design-registry.md#design-red-article)

---

#### FR-RED-META — Génération du titre et de la description pour le référencement

Après que l'article a été produit, l'IA génère automatiquement le **titre méta** (le titre qui apparaîtra dans les résultats Google) et la **description méta** (l'extrait de deux phrases sous le titre). Ces deux éléments sont contraints en longueur (le titre tient en ~60 caractères, la description en ~160) — l'outil tronque proprement au mot près si l'IA dépasse, jamais en plein milieu d'un mot. Si la génération échoue, l'utilisateur garde son article (le contenu a été sauvegardé juste avant) et peut relancer juste la méta.

**Critères d'acceptation**
- La méta est générée automatiquement à la suite de la génération de l'article — pas de second clic à faire.
- Le titre méta produit ne dépasse pas la longueur cible affichée par Google (~60 caractères, troncature au mot près si nécessaire).
- La description méta ne dépasse pas la longueur cible affichée par Google (~160 caractères, troncature au mot près).
- Le mot-clé Capitaine apparaît dans le titre méta et dans la description quand c'est cohérent.
- Si la méta échoue (saturation IA, erreur réseau), l'article reste sauvegardé et l'utilisateur peut relancer uniquement la méta sans avoir à régénérer tout l'article.
- Une fois générée, la méta est éditable manuellement (champs texte modifiables dans l'éditeur).

> **En situation.** L'utilisateur voit la barre de progression terminer à 10h17. Immédiatement après, sans qu'il ait à cliquer, l'outil affiche en bas de l'éditeur : *Titre : « Calcul indemnité rupture conventionnelle : guide complet 2026 » (59/60)*, *Description : « Calculez en 2 minutes votre indemnité de rupture conventionnelle. Formule légale, simulateur, cas des longues anciennetés. À jour 2026. » (152/160)*. Il trouve que « guide complet 2026 » est faible, double-clique sur le titre et le remplace par « formule, simulateur et seuils 2026 » — le compteur passe à 64/60 et signale le dépassement.

→ Conception : [DESIGN-RED-META](./design-registry.md#design-red-meta)

---

#### FR-RED-EDITOR-TIPTAP — Éditeur de texte enrichi pour relecture et finalisation

Une fois l'article généré, l'utilisateur travaille dans un **éditeur de texte enrichi** (gras, italique, listes, liens, titres H2/H3, blocs « content valeur », blocs « capsule de réponse pour featured snippet », liens internes vers d'autres articles, etc.). L'éditeur affiche en permanence le **nombre de mots actuel** de l'article et le compare à l'objectif. Les modifications sont sauvegardées automatiquement, l'utilisateur ne perd jamais son travail. L'éditeur est organisé en trois zones distinctes (introduction, corps, conclusion) qui restent visuellement séparées pour faciliter la relecture par bloc.

**Critères d'acceptation**
- L'éditeur supporte la mise en forme courante : gras, italique, listes ordonnées et non-ordonnées, titres H2 / H3, liens externes et internes.
- L'éditeur expose à tout moment le nombre de mots écrit (mise à jour en temps réel pendant la frappe).
- Trois zones d'édition distinctes sont visibles (introduction, corps, conclusion) ; modifier l'une ne casse pas la structure des deux autres.
- Toute modification déclenche une sauvegarde automatique en arrière-plan ; l'utilisateur voit un indicateur « enregistré il y a Xs ».
- Une combinaison clavier (Ctrl+S) déclenche une sauvegarde manuelle immédiate.
- Si la sauvegarde échoue, l'éditeur prévient l'utilisateur et garde le contenu marqué comme « non sauvegardé » jusqu'à succès.

> **En situation.** L'utilisateur relit la section H2 *« Quelle indemnité minimale ? »* et trouve une formulation trop scolaire. Il sélectionne la phrase, la réécrit dans le ton de la marque. Pendant qu'il tape, le compteur de mots descend de 2 240 à 2 215. Dès qu'il arrête de taper, un petit indicateur en bas de l'éditeur passe de « modifié » à « enregistré il y a 2s ». Il continue sereinement sa relecture.

→ Conception : [DESIGN-RED-EDITOR-TIPTAP](./design-registry.md#design-red-editor-tiptap)

---

#### FR-RED-SEO-LIVE — Scoring SEO en direct pendant la rédaction

Pendant que l'utilisateur écrit ou édite son article, un **score SEO** est calculé en continu et affiché dans un panneau latéral. Le score note plusieurs dimensions : la présence et la densité du mot-clé Capitaine, des Lieutenants et des termes du Lexique dans le texte, la validité de la structure des titres (un seul H1, pas de saut H2 → H4), la longueur du titre méta et de la description méta, et une checklist d'invariants SEO (mot-clé dans le titre, dans le premier paragraphe, dans une description, etc.). Le score global est exprimé sur 100, avec un niveau visuel (bon / moyen / faible). Le calcul ne fige pas l'écran pendant la frappe — il attend une courte pause de l'utilisateur et tourne en arrière-plan.

**Critères d'acceptation**
- Le panneau SEO affiche en permanence un score global sur 100 et un niveau (bon / moyen / faible) avec un code couleur cohérent.
- Le score se recalcule automatiquement après chaque modification du contenu, du titre méta ou de la description méta, sans bloquer la saisie de l'utilisateur.
- Le panneau détaille la densité actuelle de chaque mot-clé Capitaine / Lieutenant / Lexique et indique si la fourchette cible est respectée.
- Le panneau détaille la validité de la structure des titres (un seul H1, ordre des niveaux, etc.) avec un message explicite en cas d'anomalie.
- Le panneau détaille la longueur du titre méta et de la description méta (caractères utilisés / cible).
- Tant que l'article n'a pas de contenu, le bouton « SEO » de la toolbar est désactivé avec un libellé explicite (par exemple « Générez un article pour activer le scoring SEO »).

> **En situation.** L'utilisateur termine la première relecture de son article. Il ouvre le panneau SEO : score global 78/100, niveau *moyen*. En détail : densité du Capitaine *« calcul indemnité rupture conventionnelle »* à 0,4 % (cible 0,8-1,5 %) — l'IA n'a pas assez répété l'expression. Il retourne dans l'introduction, glisse le mot-clé une fois de plus, rééquilibre. Le score remonte à 84/100. Il continue avec les autres signaux.

→ Conception : [DESIGN-RED-SEO-LIVE](./design-registry.md#design-red-seo-live)

---

#### FR-RED-CONTEXTUAL-ACTIONS — 12 actions IA contextuelles sur sélection de texte

Quand l'utilisateur sélectionne un fragment de texte dans l'éditeur, une **mini-barre d'actions IA** s'affiche au-dessus de la sélection. Elle propose 12 actions courtes pour retravailler le passage sélectionné : reformuler, simplifier, convertir en liste, ajouter un exemple PME, optimiser le mot-clé, ajouter une statistique, transformer en capsule de réponse (featured snippet), transformer un titre en question, localiser, sourcer avec des chiffres frais (avec recherche web), insérer des exemples réels (avec recherche web), résumer en « ce qu'il faut retenir », ou ajouter un lien interne vers un autre article du cocon. La réécriture proposée par l'IA s'affiche au fil de l'eau ; l'utilisateur l'accepte (remplace la sélection) ou la rejette (garde l'original). L'action « lien interne » ouvre à la place une recherche d'article — pas de réécriture.

**Critères d'acceptation**
- Une barre d'actions apparaît au-dessus de toute sélection de texte non vide dans l'éditeur.
- Les 12 actions disponibles sont, dans le code source : reformuler, simplifier, convertir en liste, exemple PME, optimiser mot-clé, ajouter statistique, capsule de réponse, transformer en question, localiser, sources chiffrées, exemples réels, ce qu'il faut retenir. (L'action « lien interne » s'ajoute en treizième mais bypasse le pipeline IA — elle ouvre un sélecteur d'article.)
- Le résultat de chaque action apparaît progressivement à l'écran pendant la génération (pas de fenêtre figée).
- Deux boutons permettent à l'utilisateur d'accepter (remplace la sélection par le résultat) ou de rejeter (annule, sélection conservée intacte).
- L'action « lien interne » n'envoie pas de requête à l'IA — elle ouvre un sélecteur d'articles du même cocon ; le clic sur un article ajoute un lien sur la sélection.
- Les actions « sources chiffrées » et « exemples réels » autorisent l'IA à consulter le web pour ramener des données fraîches (les autres actions travaillent uniquement sur le texte fourni).

> **En situation.** L'utilisateur sélectionne le paragraphe : *« L'indemnité légale dépend de l'ancienneté du salarié. »* Il clique sur l'action « ajouter une statistique ». L'IA recompose en quelques secondes : *« L'indemnité légale dépend de l'ancienneté du salarié : pour 5 ans d'ancienneté à 2 500 € brut/mois, elle s'élève à ≈ 3 100 €. »* Il accepte. La phrase remplace l'originale, le scoring SEO se met à jour automatiquement.

→ Conception : [DESIGN-RED-CONTEXTUAL-ACTIONS](./design-registry.md#design-red-contextual-actions)

---

#### FR-RED-INTERNAL-LINKING — Suggestions de liens internes vers d'autres articles du cocon

L'utilisateur peut demander à l'outil de **suggérer des liens internes** vers d'autres articles du cocon. L'IA analyse le contenu et propose une liste de suggestions : *pour ce texte d'ancre dans votre paragraphe, vous pourriez pointer vers cet autre article du cocon*. Pour chaque suggestion, l'utilisateur voit l'ancre proposée, l'article cible et peut soit appliquer le lien d'un clic (l'ancre devient cliquable dans l'éditeur), soit rejeter la suggestion. Les liens validés sont mémorisés et utilisés par la vue Maillage globale de l'outil.

**Critères d'acceptation**
- Le panneau « Maillage » expose une liste de suggestions de liens internes pour l'article courant.
- Chaque suggestion identifie clairement l'ancre proposée (texte exact de l'article courant) et l'article cible (titre + cocon).
- Le clic sur « appliquer » insère effectivement un lien interne sur l'ancre dans l'éditeur et l'enregistre dans le réseau de liens du cocon.
- Le clic sur « rejeter » retire la suggestion de la liste sans modifier l'éditeur.
- L'utilisateur peut demander de nouvelles suggestions à tout moment (bouton « Suggérer des liens ») — l'IA tient compte du contenu actuel de l'article.
- Tant qu'aucun article n'est généré, le bouton « Maillage » de la toolbar est désactivé avec un message explicite.

> **En situation.** L'utilisateur clique sur « Suggérer des liens ». Trois suggestions apparaissent : *(1) ancre « ancienneté du salarié » → article « Calculer son ancienneté », (2) ancre « rupture conventionnelle » → article « Procédure rupture conventionnelle », (3) ancre « formule légale » → article « Indemnité légale de licenciement »*. Il valide les deux premières, rejette la troisième qui doublerait avec un lien déjà présent. Dans l'éditeur, les deux ancres deviennent immédiatement cliquables et soulignées.

→ Conception : [DESIGN-RED-INTERNAL-LINKING](./design-registry.md#design-red-internal-linking)

---

#### FR-RED-REDUCE-SECTION — Compression d'un article trop long

Quand l'utilisateur voit que son article dépasse trop la longueur cible (par exemple 2 800 mots écrits pour un objectif de 2 200), il peut déclencher une **compression intelligente** : l'IA reprend chaque grande section H2 et la réécrit plus dense, en gardant l'idée et le ton mais en supprimant les redondances. L'opération tourne section par section avec une barre de progression visible ; l'utilisateur peut interrompre à tout moment. Le bouton « réduire » n'apparaît que si l'écart au target dépasse un seuil significatif (15 %) — pas de compression cosmétique pour un dépassement de 50 mots.

**Critères d'acceptation**
- Le bouton « Réduire l'article » n'est actif que si le contenu actuel dépasse la longueur cible de plus de 15 %.
- La compression travaille section par section H2 ; une barre de progression indique laquelle est en cours.
- L'utilisateur peut interrompre la compression à tout moment via un bouton « Annuler » ; les sections déjà compressées restent compressées, les suivantes restent inchangées.
- À la fin, le nombre de mots est plus proche de la cible que l'avant ; si une section explose le contrat (échec IA), elle est laissée telle quelle, pas tronquée brutalement.
- Le contenu compressé est immédiatement sauvegardé après l'opération.

> **En situation.** L'utilisateur termine sa relecture : compteur 2 845 mots, cible 2 200 (dépassement 29 %). Le bouton « Réduire l'article » est actif. Il clique : la barre passe *« 1/4 — Quelle indemnité minimale ? »*, *« 2/4 — Simuler son indemnité »*, etc. En 90 secondes, l'article est passé à 2 280 mots. Il relit rapidement les sections compressées : pas de perte de sens, juste moins de tournures redondantes. Le SEO global passe de 78 à 82 grâce à la densification.

→ Conception : [DESIGN-RED-REDUCE-SECTION](./design-registry.md#design-red-reduce-section)

---

#### FR-RED-HUMANIZE-SECTION — Atténuation des marqueurs IA sur le texte

Pour rendre l'article moins « écrit par une IA », l'utilisateur peut déclencher une **passe d'humanisation** : l'IA reprend chaque section H2 et la reformule pour casser les tournures-types qu'on reconnaît dans les textes générés (formules creuses, parallélismes excessifs, transitions mécaniques). L'opération préserve la structure HTML (les titres, les listes, les liens internes restent en place). Si l'IA n'arrive pas à respecter la structure sur une section donnée, l'outil retombe sur la version originale pour cette section plutôt que de produire un HTML cassé.

**Critères d'acceptation**
- Le bouton « Humaniser l'article » est disponible une fois l'article généré.
- L'humanisation tourne section H2 par section H2 avec une barre de progression visible.
- La structure HTML (titres, listes, blocs spéciaux, liens internes) est préservée intacte après humanisation.
- Si une section est cassée par l'IA (structure invalide), l'outil retombe automatiquement sur la version originale et le signale dans une note discrète ; aucune section ne devient du texte non structuré.
- L'utilisateur peut interrompre l'humanisation à tout moment ; les sections déjà humanisées restent humanisées.
- Le contenu humanisé est immédiatement sauvegardé après l'opération.

> **En situation.** L'utilisateur trouve son brouillon trop scolaire (*« Dans cet article, nous allons voir... », « Il est important de noter que... »*). Il clique sur « Humaniser » à 11h02. À 11h04, c'est terminé. Il relit l'introduction : les transitions sont plus directes, le ton plus engagé. La 3ᵉ section porte une petite note *« humanisation revenue au texte original (structure non préservée) »* — il vérifie, c'est OK. Il garde le résultat.

→ Conception : [DESIGN-RED-HUMANIZE-SECTION](./design-registry.md#design-red-humanize-section)

---

#### FR-RED-WORD-COUNT-TARGET — Longueur cible de l'article et écart au target

Chaque article porte une **longueur cible en mots**, calculée en amont à partir du type d'article (Pilier / Intermédiaire / Spécialisé) et de la SERP des concurrents (cf. FR-CER-WORD-COUNT-RECOMMEND). Pendant la rédaction, une barre visible affiche en permanence trois chiffres : nombre de mots actuel, cible, et écart signé (« +120 » si trop long, « -340 » si trop court). Cette cible est aussi utilisée par la génération initiale pour répartir la longueur entre sections, et par la compression (FR-RED-REDUCE-SECTION) pour savoir jusqu'où réduire.

**Critères d'acceptation**
- Une barre de comptage de mots est visible en permanence dans l'écran de rédaction.
- La barre affiche : nombre de mots actuel, cible, et écart signé.
- L'écart affiché est signé : positif quand l'article dépasse la cible, négatif quand il est trop court.
- La cible est lue depuis les informations préparées au Cerveau (micro-contexte article + recommandation type d'article) — pas de saisie manuelle au moment de la rédaction.
- La cible utilisée pour générer l'article est cohérente avec celle affichée — le réducteur tape sur la même valeur.

> **En situation.** L'utilisateur passe de l'éditeur à la barre de progression. Affichage : *2 845 mots / cible 2 200 (+645)*. L'écart est clair, le signe immédiat. Il choisit la compression. À la fin : *2 280 / 2 200 (+80)*. L'écart résiduel est sous le seuil de 15 % — il garde tel quel, sans toucher manuellement.

→ Conception : [DESIGN-RED-WORD-COUNT-TARGET](./design-registry.md#design-red-word-count-target)

---

#### FR-RED-PROGRESS — Suivi de l'avancement éditorial d'un article

L'outil suit pour chaque article une **phase éditoriale** qui reflète où il en est dans son cycle de vie (à l'état brouillon proposé par le Cerveau, en cours de brief, sommaire validé, en cours d'écriture, en cours de validation SEO, publié). Cette phase est lue par le dashboard pour afficher le bon état visuel de l'article, par la liste des articles d'un cocon pour trier les articles non terminés, et par le panneau de progression de l'article pour situer l'utilisateur dans son flux. Les transitions entre phases sont déclenchées par les actions de validation explicites de l'utilisateur (cf. FR-RED-CHECKS) — pas par des heuristiques.

**Critères d'acceptation**
- Chaque article porte une phase parmi un ensemble fermé connu de tous les écrans qui l'affichent (le dashboard, le suivi d'article et la liste cocon n'ont jamais d'état hors enum).
- La phase évolue uniquement quand l'utilisateur valide explicitement une étape (brief, sommaire, contenu, SEO, publication) — jamais par un calcul implicite « il y a du texte donc on bascule ».
- Le retour à une phase antérieure (par exemple repasser de « en SEO » à « en écriture ») est possible et reflété partout sans incohérence cross-vues.
- La phase courante est persistée et survit aux rechargements de page.

> **En situation.** L'utilisateur a validé le brief la veille (phase = brief), puis le sommaire ce matin (phase = outline), puis a généré l'article (phase = writing). Sur le dashboard, le dot d'avancement « Rédaction » de cet article est passé en bleu progressif au fil des étapes. Quand il valide le SEO en fin d'après-midi (phase = seo), le 4ᵉ dot rédaction se remplit, et la carte article gagne le badge *« Prêt à publier »*.

→ Conception : [DESIGN-RED-PROGRESS](./design-registry.md#design-red-progress)

---

#### FR-RED-CHECKS — 5 étapes validables manuellement dans la Rédaction

L'utilisateur valide explicitement 5 étapes qui jalonnent la rédaction d'un article : **brief validé**, **sommaire validé**, **contenu écrit**, **SEO validé**, **article publié**. Chacune de ces validations est posée par un clic identifiable (case à cocher ou bouton de finalisation), pas par une heuristique. Une validation déjà posée peut être retirée (l'utilisateur revient en arrière sur une étape). L'ensemble des étapes validées d'un article est visible dans la progression et affecté au dashboard pour les dots de progression de l'article.

**Critères d'acceptation**
- 5 étapes validables existent dans le flux Rédaction : brief, sommaire, contenu, SEO, publication.
- Chaque étape se valide par un geste utilisateur explicite (clic case ou bouton) — jamais automatiquement parce que l'IA a produit du contenu.
- Chaque étape se dé-valide d'un clic (le check peut être retiré, l'utilisateur n'est pas piégé).
- Le code de chaque check est posé via la même constante partagée que les autres modules (Moteur, Cerveau) — pas de chaîne libre dans le composant Rédaction.
- L'ordre des checks affiché à l'utilisateur correspond à l'ordre logique du flux (brief avant sommaire, sommaire avant contenu, etc.) — pas de réorganisation cosmétique.

> **En situation.** Vendredi 14h, l'utilisateur termine la passe SEO de son article. Il coche la case *« SEO validé »* dans le panneau de progression. Le 4ᵉ dot Rédaction se remplit sur la carte du dashboard. Il garde la dernière case *« Article publié »* décochée car il attend lundi pour la mise en ligne définitive. Lundi matin, après publication réelle, il coche la dernière case — l'article passe en phase finale et apparaît dans le filtre *« publiés »* du dashboard.

→ Conception : [DESIGN-RED-CHECKS](./design-registry.md#design-red-checks)

---

#### FR-RED-PANELS-LAYOUT — Toolbar et panneaux d'analyse redimensionnables

L'écran de rédaction expose en permanence une **toolbar de panneaux d'analyse** à droite de l'éditeur. Cinq boutons toggle permettent de basculer entre cinq panneaux : SEO, GEO (scoring spécifique pour l'optimisation pour les moteurs génératifs / IA / réponses), Maillage (liens internes), Blocs (bibliothèque de blocs dynamiques — éditeur libre uniquement), IA Brief (analyse stratégique — workflow uniquement). Un seul panneau est visible à la fois ; le panneau actif est rendu dans une zone latérale **redimensionnable** (l'utilisateur peut élargir ou rétrécir la zone à la souris). Tant qu'aucun article n'est généré, les panneaux SEO / GEO / Maillage / Blocs sont visibles mais désactivés (boutons grisés avec libellé explicite) — l'IA Brief reste accessible parce qu'il analyse le brief, pas le contenu. La touche Échap ferme le panneau ouvert.

**Critères d'acceptation**
- La toolbar de droite expose les boutons SEO, GEO et Maillage dans les deux vues de rédaction (workflow guidé et éditeur libre).
- La toolbar expose en plus le bouton « Blocs » dans la vue éditeur libre (composition manuelle de l'article).
- La toolbar expose en plus le bouton « IA Brief » dans la vue workflow guidée (préparation à l'écriture).
- Un seul panneau est visible à la fois : cliquer sur un autre bouton bascule la zone latérale, cliquer sur le bouton actif referme le panneau.
- Tant que l'article n'a pas de contenu, les boutons SEO / GEO / Maillage / Blocs sont désactivés (apparents mais non-cliquables) avec un libellé d'explication ; le bouton IA Brief reste actif.
- Le panneau actif vit dans une zone redimensionnable à la souris (élargissement / rétrécissement) ; la dimension choisie persiste pendant la session.
- La touche Échap ferme le panneau actif et redonne toute la largeur à l'éditeur.

> **En situation.** L'utilisateur travaille en plein écran sur la relecture. Il ouvre SEO d'un clic, redimensionne le panneau pour qu'il occupe un tiers de l'écran (au lieu d'un quart par défaut). Il bascule sur Maillage pour vérifier les suggestions de liens internes — la largeur du panneau est conservée. Il appuie sur Échap, l'éditeur reprend toute la largeur. Quand il rouvrira SEO plus tard dans la session, la largeur sera celle qu'il avait choisie.

→ Conception : [DESIGN-RED-PANELS-LAYOUT](./design-registry.md#design-red-panels-layout)

---

#### FR-RED-IA-BRIEF — Panneau IA d'analyse stratégique du brief

Dans la vue workflow guidée (la version assistée de la rédaction), un panneau dédié **« IA Brief »** affiche l'analyse stratégique produite par FR-RED-BRIEF. C'est l'un des cinq panneaux de la toolbar d'analyse (cf. FR-RED-PANELS-LAYOUT). Il diffère des autres panneaux par deux aspects : il est disponible **avant même** la génération de l'article (l'utilisateur peut le lancer dès qu'il a son brief), et il contient un texte narratif (markdown formaté) plutôt que des métriques (scores, listes). Un bouton « Relancer l'analyse » permet de redemander une analyse après modification du brief.

**Critères d'acceptation**
- Le panneau IA Brief n'apparaît que dans la vue workflow guidée — la vue éditeur libre n'en dispose pas (analyse stratégique non pertinente sans brief structuré).
- Le panneau IA Brief reste accessible même quand l'éditeur est vide (pas de gating sur le contenu).
- Le panneau affiche le résultat de l'analyse (cf. FR-RED-BRIEF) en formatage riche (titres, listes, gras) — pas comme un bloc de texte brut.
- Le bouton « Relancer l'analyse » est présent et actif une fois la première analyse terminée.
- L'analyse en cours est signalée visuellement (texte d'attente, bouton désactivé) tant que le streaming n'est pas terminé.

> **En situation.** Le panneau SEO est utile pendant la relecture ; le panneau IA Brief est utile avant l'écriture. L'utilisateur le découvre la première fois en démarrant un nouvel article : il a son brief sous les yeux, l'éditeur est vide, mais il peut déjà lire dans IA Brief : *« Intention dominante : transactionnelle... Risque cannibalisation avec... Angle d'attaque suggéré : ... »*. Cette première analyse oriente toute sa rédaction. Plus tard, après avoir ajouté un Lieutenant au Lexique, il clique « Relancer l'analyse » pour obtenir une vue à jour.

→ Conception : [DESIGN-RED-IA-BRIEF](./design-registry.md#design-red-ia-brief)

---

### 8.11 — Labo (FR-LAB) — **REMOVED 2026-05-10**

> **Statut** : retiré du produit le 2026-05-10. La page `/labo` n'existe plus, les composants `PainTranslator`, `IntentStep` et la prop `mode='libre'` sur les composants Moteur partagés ne sont plus utilisés (la prop reste pour compatibilité interne mais aucun caller ne la passe). Les FRs ci-dessous sont marquées **DEPRECATED** ; l'historique d'intention reste accessible pour comprendre le contexte de conception initial.

#### ~~FR-LAB-ACCESS~~ — DEPRECATED 2026-05-10
~~Accessible depuis Navbar via `/labo`.~~

#### ~~FR-LAB-MODE-LIBRE~~ — DEPRECATED 2026-05-10
~~Réutilisait les composants Moteur en mode `libre`. Pas de checks émis.~~

#### ~~FR-LAB-VERDICT-DEFAULT~~ — DEPRECATED 2026-05-10
~~Verdict Capitaine seuils par défaut Intermédiaire en libre.~~

#### ~~FR-LAB-TABS~~ — DEPRECATED 2026-05-10
~~Onglets Discovery / Douleur / Capitaine au Labo.~~

---

### 8.12 — Explorateur (FR-EXP) — **REMOVED 2026-05-10**

> **Statut** : retiré du produit le 2026-05-10. La page `/explorateur` n'existe plus. Les routes API associées (`/api/intent/analyze`, `/api/keywords/compare-local`, `/api/keywords/autocomplete`, `/api/local/maps`, `/api/keywords/translate-pain`) ont été supprimées avec leurs services backend (`server/services/intent/intent.service.ts`, `server/services/strategy/local-seo.service.ts`). Les FRs ci-dessous sont marquées **DEPRECATED**.
>
> **Exception** : `FR-EXP-CONTENT-GAP` (endpoint `/api/content-gap/analyze`) reste **ACTIVE** — utilisée par le Moteur (`LieutenantsPanel.vue`, `ContentGapPanel.vue`).

#### ~~FR-EXP-INTENT-ANALYZE~~ — DEPRECATED 2026-05-10
~~Endpoint `POST /api/intent/analyze`. Classification intent + 9 modules SERP. Stockage `keyword_intent_analyses`.~~ Route supprimée. Le scan d'intent reste fait via `intent-scan.service.ts` (Radar workflow).

#### ~~FR-EXP-AUTOCOMPLETE~~ — DEPRECATED 2026-05-10
~~Endpoint `POST /api/keywords/autocomplete`.~~ Route supprimée. L'autocomplete pour le validate-pain reste via `autocomplete.service.ts`.

#### ~~FR-EXP-LOCAL-COMPARE~~ — DEPRECATED 2026-05-10
~~Endpoint `POST /api/keywords/compare-local`.~~ Route supprimée.

#### ~~FR-EXP-MAPS~~ — DEPRECATED 2026-05-10
~~Endpoint `POST /api/local/maps`.~~ Route supprimée. Le service `local-seo.service.ts` a été retiré entièrement.

#### FR-EXP-CONTENT-GAP — **ACTIVE** (re-classée hors §8.12 après retrait Explorateur)
Endpoint `POST /api/content-gap/analyze`. Scrape top 10 → identifie topics manquants → suggestions de gaps. Stockage `keyword_metrics.content_gap_analysis`.
**Consommée par** : `LieutenantsPanel.vue`, `LieutenantCard.vue`, `LieutenantProposals.vue`, `ContentGapPanel.vue` (Moteur).
**Source :** `server/routes/content-gap.routes.ts` — `server/services/article/content-gap.service.ts`.

#### ~~FR-EXP-AUDIT~~ — DEPRECATED 2026-05-10
~~Audit batch keywords d'un cocon via `POST /api/keywords/audit`. Composants `KeywordAuditTable.vue`, `KeywordComparison.vue`.~~ La route subsiste côté backend (utilisée par `EnginePhase.vue` orphelin) mais n'est plus appelée par aucun composant Vue actif. Dette à nettoyer dans un chantier ultérieur de retrait des composants `production/`.

---

### 8.13 — Intégrations externes (FR-EXT)

> **Pourquoi cette section ?**
> Le Moteur et la Rédaction reposent sur des **services tiers** (DataForSEO pour les KPI marché, Google Search Console pour les vraies données de trafic, Claude / Gemini / OpenRouter pour l'IA, HuggingFace pour les embeddings sémantiques, Google Suggest pour l'autocomplétion). L'utilisateur ne voit pas ces fournisseurs directement, mais leur fiabilité, leur coût et leur disponibilité dictent la qualité de son outil au quotidien : un appel API qui rate fait planter un scan, un quota qui explose vide son portefeuille en 30 minutes, un modèle IA saturé bloque sa rédaction. Cette section §8.13 documente les **garanties que l'utilisateur attend** sur ces intégrations : « mes coûts API restent sous contrôle », « si un fournisseur IA tombe, un autre prend le relais sans que je le sache », « je peux développer en mode simulation sans cramer mes crédits ».
>
> Les détails techniques (endpoints exacts, modèles, schémas de réponse, mécanismes de retry, variables d'env) sont dans le registre de conception correspondant.

#### FR-EXT-DATAFORSEO — Récupération des données marché Google via DataForSEO

L'utilisateur a besoin de connaître la **réalité du marché** pour chacun de ses mots-clés candidats : volume de recherche mensuel, coût par clic, niveau de concurrence, intention de recherche dominante, résultats SERP, questions « People Also Ask ». L'app va chercher ces informations auprès du fournisseur **DataForSEO** (qui agrège Google), au moment où elle en a besoin, en **mettant en cache les réponses** pour ne pas payer deux fois la même requête. L'utilisateur n'interagit jamais directement avec ce fournisseur ; il voit simplement apparaître les KPI sur ses cartes de mots-clés et dans les briefs SEO.

**Critères d'acceptation**
- Pour un mot-clé donné, l'utilisateur peut consulter au moins : volume de recherche, CPC, concurrence, intention dominante, top 10 SERP, questions PAA.
- Avant tout appel DataForSEO, l'app vérifie d'abord sa base interne et son cache court — si la donnée est suffisamment fraîche, aucun appel n'est émis (cf. NFR-COST-CACHE-FIRST).
- Quand DataForSEO renvoie une erreur de quota ou un échec persistant, l'app le signale clairement à l'utilisateur plutôt que d'afficher des valeurs vides silencieusement.
- L'utilisateur peut **forcer un rafraîchissement** (bouton « ignorer le cache ») pour récupérer la donnée la plus récente quand il en a besoin.

> **En situation.** L'utilisateur travaille un cocon « Calcul indemnité rupture conventionnelle » et lance un scan Discovery. Pour chaque mot-clé candidat, il voit immédiatement le volume de recherche (« 2 400/mois »), le CPC (« 1,80 € »), la concurrence (« Moyen ») et l'intention (« commerciale »). Il fait confiance à ces chiffres parce qu'ils viennent de DataForSEO, le fournisseur de référence sur Google. Le lendemain, sur un autre cocon qui partage 3 mots-clés avec celui de la veille, il relance un scan — pas d'appel facturé pour ces 3 mots, l'app les a en mémoire (cache), seuls les nouveaux mots-clés génèrent une requête. À la fin de la semaine, il a couvert 200 mots-clés pour quelques centimes au lieu de quelques dizaines.

→ Conception : [DESIGN-EXT-DATAFORSEO](./design-registry.md#design-ext-dataforseo)

---

#### FR-EXT-DATAFORSEO-COSTGUARD — Garde-fou de budget sur DataForSEO

DataForSEO se facture à l'appel — un script mal calibré peut consommer **des dizaines de dollars en quelques minutes**. L'utilisateur a besoin d'un **garde-fou automatique** qui surveille les dépenses sur une fenêtre glissante et **bloque tout appel qui ferait sauter son plafond** avant même qu'il soit émis. Le plafond et la fenêtre sont configurables ; les valeurs par défaut (0,50 $ sur 30 minutes) sont calibrées pour un consultant solo qui travaille à temps plein sur l'outil sans risquer de surprise sur sa carte bancaire.

**Critères d'acceptation**
- L'utilisateur peut consulter à tout moment combien il a dépensé sur DataForSEO dans la fenêtre glissante en cours.
- Quand l'appel à venir ferait dépasser le plafond, l'app refuse l'appel et affiche un message explicite (« budget DataForSEO dépassé : déjà X dépensés sur Y autorisés dans les Z dernières minutes »).
- Le plafond et la durée de la fenêtre sont **configurables sans toucher au code** (variables d'environnement).
- Quand un appel est bloqué par le garde-fou, l'utilisateur reçoit un code d'erreur dédié — il sait que c'est son plafond, pas un bug du fournisseur.

> **En situation.** Mardi soir, l'utilisateur lance par mégarde un scan en boucle sur 500 mots-clés. Au bout de quelques secondes, ses cartes de mots-clés se remplissent normalement — puis brutalement le message « Budget DataForSEO dépassé — déjà 0,49 $ dépensés sur 0,50 $ autorisés dans les 30 dernières minutes ». L'app a arrêté toute seule. Pas de panique, pas de facture imprévue — il vérifie en bas à droite de l'app le compteur (« $0,49 / $0,50 sur 30 min ») et comprend qu'il doit attendre que la fenêtre glisse ou ajuster son scan. Une fois passé la frayeur, il décide d'ajuster son plafond à 1 $ pour ses scans plus ambitieux, en changeant simplement une variable d'env — pas besoin de toucher au code.

→ Conception : [DESIGN-EXT-DATAFORSEO-COSTGUARD](./design-registry.md#design-ext-dataforseo-costguard)

---

#### FR-EXT-DATAFORSEO-SANDBOX — Mode bac à sable DataForSEO pour développer sans crédit

Quand l'utilisateur veut **tester l'outil sans consommer ses crédits** (notamment en phase de développement, ou pour valider un workflow sur un cocon « jouet »), il peut basculer DataForSEO sur un **mode bac à sable** : le fournisseur renvoie alors des données factices gratuites au lieu des données réelles facturées. Le reste de l'app fonctionne strictement à l'identique — l'utilisateur peut tester son pipeline complet (scan → validation → rédaction) sans dépenser un centime.

**Critères d'acceptation**
- Le bac à sable est **opt-in** (jamais activé par défaut sans intervention de l'utilisateur) — par sécurité, l'app loggue explicitement qu'elle utilise le bac à sable.
- En mode bac à sable, aucun appel à l'API payante n'est émis ; les données reçues sont fictives mais structurellement identiques.
- L'utilisateur peut basculer entre bac à sable et production sans redémarrer l'app : un toggle global dans la barre de navigation change le mode pour DataForSEO et l'IA en même temps.
- Quand le mode bac à sable est actif, l'utilisateur voit un indicateur visuel clair (badge, libellé navbar) pour ne pas se tromper de mode.

> **En situation.** L'utilisateur veut tester une nouvelle fonctionnalité du Moteur sur un cocon factice pour vérifier qu'elle marche, sans payer un centime à DataForSEO. Il clique sur le toggle « Mock / Réel » de la navbar, le bascule sur « Mock » — un badge orange apparaît, l'app loggue « DataForSEO : SANDBOX » dans la pile d'activité. Il fait son test, voit que tout fonctionne avec des données factices (mais structurellement identiques au réel), revient sur « Réel » au moment de tester son vrai cocon de production. Aucun crédit consommé pendant la phase de test.

→ Conception : [DESIGN-EXT-DATAFORSEO-SANDBOX](./design-registry.md#design-ext-dataforseo-sandbox)

---

#### FR-EXT-GSC-OAUTH — Connexion Google Search Console par OAuth

Pour aller plus loin que les estimations DataForSEO et accéder à ses **vraies données de trafic** sur ses propres sites, l'utilisateur peut **connecter son compte Google Search Console** via le mécanisme OAuth standard de Google. Une fois la connexion établie, l'app conserve son jeton d'accès localement, le renouvelle automatiquement avant expiration, et peut interroger les données GSC en lecture seule. Si la connexion n'est pas faite, les fonctionnalités GSC sont indisponibles mais le reste de l'app marche normalement.

**Critères d'acceptation**
- L'utilisateur peut lancer la connexion GSC depuis un point d'entrée unique (route OAuth).
- Après autorisation, l'app reçoit et conserve un jeton qu'elle peut renouveler tant qu'elle a un refresh token valide — l'utilisateur n'a pas à se reconnecter à chaque session.
- L'utilisateur peut consulter à tout moment si GSC est connecté ou non (statut visible).
- Le scope d'accès demandé est **lecture seule** (l'app ne modifie jamais le compte GSC de l'utilisateur).
- Si le jeton expire et que son renouvellement échoue (ex : refresh token révoqué), l'app le signale clairement et propose de relancer le flow OAuth.

> **En situation.** L'utilisateur veut comparer ses mots-clés ciblés avec ce que Google indexe réellement sur son site `cabinet-avocats-toulouse.fr`. Il clique sur « Connecter Google Search Console » — l'app le redirige vers la page Google standard où il choisit son compte et autorise l'accès en lecture seule. Retour sur l'app, badge « GSC connecté » en vert. Trois semaines plus tard, son jeton expire — l'app le détecte, utilise silencieusement le refresh token pour en obtenir un nouveau, et il continue à voir ses données sans avoir à se reconnecter. Le jour où il révoque l'accès depuis son compte Google, le badge passe au rouge et un message clair lui propose de relancer la connexion.

→ Conception : [DESIGN-EXT-GSC-OAUTH](./design-registry.md#design-ext-gsc-oauth)

---

#### FR-EXT-GSC-PERFORMANCE — Récupération des données de performance GSC

Une fois connecté à Google Search Console, l'utilisateur peut **interroger ses vraies données de trafic** sur une période et un site donnés : clics, impressions, CTR, position moyenne — ventilés par mot-clé, par page, par appareil ou par pays selon ce qu'il demande. L'app met en cache la réponse pendant 24 h pour éviter de retaper l'API à chaque consultation.

**Critères d'acceptation**
- L'utilisateur peut récupérer les performances d'un site GSC pour une plage de dates au choix.
- Les données renvoyées incluent au minimum : clics, impressions, CTR, position moyenne.
- L'utilisateur peut choisir la ventilation (mot-clé, page, etc.).
- Une requête identique exécutée deux fois dans la même journée ne déclenche pas un second appel à Google — l'app sert la réponse du cache (rafraîchissement quotidien).

> **En situation.** L'utilisateur connecté à GSC veut voir comment se comporte son article « Calcul indemnité rupture conventionnelle » sur les 90 derniers jours. Il sélectionne le site, la période, demande la ventilation par mot-clé. L'app renvoie les rangs et les volumes : 1 200 impressions, 80 clics, position moyenne 11,4 sur le mot principal — il voit immédiatement qu'il est en bas de la première page et qu'un coup de pouce sur ce mot peut faire bouger les choses. Le lendemain, il relance la même requête : pas d'appel à Google, l'app sert le cache de la veille en moins d'une seconde.

→ Conception : [DESIGN-EXT-GSC-PERFORMANCE](./design-registry.md#design-ext-gsc-performance)

---

#### FR-EXT-GSC-KEYWORD-GAP — Comparaison entre mots-clés ciblés et indexés

L'utilisateur veut savoir, pour un article donné, **quels mots-clés il a ciblés** dans sa stratégie (Capitaine + Lieutenants) **vs ceux pour lesquels Google le fait remonter en pratique**. L'app croise sa liste de mots-clés cibles avec les données GSC du site et produit trois listes : (1) ce qu'il vise et qui marche déjà, (2) ce qu'il vise mais qui n'apparaît nulle part chez Google, (3) les mots-clés sur lesquels il ressort sans les avoir ciblés (opportunités à exploiter).

**Critères d'acceptation**
- L'utilisateur fournit l'URL de son article et sa liste de mots-clés cibles.
- L'app retourne trois listes nettement distinctes : ciblés et indexés (avec position / clics / impressions), ciblés mais non indexés, indexés mais non ciblés.
- L'analyse repose sur les 90 derniers jours par défaut.
- Un mot-clé apparaissant dans GSC est compté quand il rapporte au moins une impression — pas besoin d'avoir des clics.

> **En situation.** L'utilisateur a publié son article sur « Calcul indemnité rupture conventionnelle » il y a deux mois. Il a verrouillé 5 mots-clés cibles dans son Capitaine + Lieutenants. Il lance l'analyse keyword gap : sur ses 5 cibles, 3 sont indexées (positions 8 à 15), 2 n'apparaissent pas du tout. Bonus : il voit que Google le fait remonter sur « indemnité chômage rupture conventionnelle » (qu'il n'avait pas ciblé) — opportunité évidente pour son prochain article du cocon. Il prend une décision éclairée : renforcer les 2 cibles absentes avec un nouveau paragraphe, et créer un article complémentaire pour exploiter la découverte.

→ Conception : [DESIGN-EXT-GSC-KEYWORD-GAP](./design-registry.md#design-ext-gsc-keyword-gap)

---

#### FR-EXT-AI-MULTI-PROVIDER — Choix du fournisseur IA (Claude, Gemini, OpenRouter, simulation)

L'IA est partout dans l'app (rédaction, analyse Capitaine, extraction de lexique, brief…). L'utilisateur peut choisir **quel fournisseur IA répond à ses requêtes** — soit le plus fiable et payant (Claude), soit le gratuit mais limité (Gemini), soit le catalogue de modèles gratuits OpenRouter, soit un mode de **simulation locale** (réponses factices déterministes, zéro coût, zéro réseau) pour développer ou tester sans consommer. Le choix se fait par une seule variable de configuration et peut être basculé **à chaud** (sans redémarrer l'app) via le toggle navbar.

**Critères d'acceptation**
- Le fournisseur courant est lu à chaque appel — l'utilisateur peut changer de fournisseur sans redémarrer.
- Les quatre options (Claude, Gemini, OpenRouter, simulation) sont accessibles via la même API interne — du point de vue de l'utilisateur, la qualité de réponse change mais l'expérience reste identique.
- En mode simulation, aucune requête réseau n'est émise ; les réponses viennent de jeux d'exemples préenregistrés.
- Quand le mode simulation est actif, l'utilisateur le voit clairement (badge navbar, mention dans la pile d'activité).
- Le coût estimé de chaque appel est calculé selon le fournisseur réellement utilisé et journalisé dans la pile d'activité.

> **En situation.** En semaine, l'utilisateur travaille sur ses articles clients en mode Claude (le plus solide, payant). Le vendredi soir il décide d'expérimenter une nouvelle fonctionnalité du Moteur sur un cocon de test — il bascule la navbar sur « Mock » et passe ses 2 h de bricolage en simulation, sans dépenser un centime. Dimanche, son crédit Anthropic est presque épuisé en attendant le rechargement du lundi — il bascule sur Gemini (gratuit, ~15 req/min) pour ses dernières tâches, en sachant qu'il sera limité par le rate-limit du free tier. Du point de vue UX : un seul toggle, trois modes, zéro changement de code.

→ Conception : [DESIGN-EXT-AI-MULTI-PROVIDER](./design-registry.md#design-ext-ai-multi-provider)

---

#### FR-EXT-AI-FALLBACK — Bascule automatique entre fournisseurs IA en cas de saturation

Quand le fournisseur IA principal de l'utilisateur (par défaut Claude) **rencontre une saturation** — quota dépassé, surcharge serveur, crédit épuisé — l'app **bascule automatiquement** sur un fournisseur de secours (Gemini, puis OpenRouter) pour terminer la requête, sans que l'utilisateur ait à intervenir. Côté pile d'activité, il voit dans les logs qu'il y a eu un fallback, mais le résultat lui arrive normalement. Si vraiment aucun fournisseur ne répond, l'app affiche une erreur claire qui pointe le diagnostic (quel fournisseur a échoué, quelle erreur exacte).

**Critères d'acceptation**
- En cas d'erreur de quota ou de surcharge sur le fournisseur primaire, l'app retente automatiquement avec le suivant dans une chaîne de secours préconfigurée.
- L'utilisateur peut **désactiver le fallback** via une variable d'env pour tester un fournisseur spécifique sans masquer ses erreurs.
- Les autres types d'erreur (réseau, bug applicatif) ne déclenchent **pas** le fallback — ils remontent telles quelles, parce qu'elles signalent un vrai problème qu'il faut diagnostiquer.
- Avant le fallback, l'app **retente la requête** avec un délai exponentiel sur le même fournisseur, pour absorber une surcharge passagère.
- Quand un fallback se déclenche, la pile d'activité l'affiche explicitement (« Claude saturé, bascule sur Gemini ») pour que l'utilisateur comprenne pourquoi sa requête est plus lente ou différente d'habitude.

> **En situation.** L'utilisateur lance la génération du brief pour son article du jour. Sa requête part normalement vers Claude. Mais Anthropic est en surcharge à ce moment précis et renvoie une erreur 503. Avant que l'utilisateur s'en rende compte, l'app a déjà retenté deux fois (avec délais exponentiels), puis a basculé sur Gemini qui lui renvoie le brief en quelques secondes de plus. Côté UX, il a juste vu son brief arriver — peut-être un poil plus lent que d'habitude. En consultant la pile d'activité en bas à droite, il voit l'historique : « Claude overloaded → fallback Gemini, brief généré ». La prochaine fois qu'il rédigera, Claude sera revenu, le fallback ne se déclenchera pas. Si un jour l'utilisateur veut tester spécifiquement Gemini sans cette mécanique (pour comparer la qualité brute), il met `AI_PROVIDER_NO_FALLBACK=1` dans son `.env` et il voit alors les vraies erreurs des autres providers.

→ Conception : [DESIGN-EXT-AI-FALLBACK](./design-registry.md#design-ext-ai-fallback)

---

#### FR-EXT-CLAUDE — Intégration du fournisseur IA Claude (Anthropic)

Claude est le **fournisseur IA principal** de l'app : c'est lui qui sert par défaut pour la rédaction d'article, l'analyse Capitaine et toutes les requêtes structurées. L'utilisateur peut choisir le modèle Claude exact qu'il veut utiliser (modèles « rapide / pas cher » comme Haiku, « équilibré » comme Sonnet, « maximum qualité » comme Opus) via une simple variable de configuration. Le coût de chaque appel est calculé en temps réel et journalisé dans la pile d'activité.

**Critères d'acceptation**
- L'utilisateur peut sélectionner son modèle Claude via une variable d'env, sans toucher au code.
- Pour la sortie structurée (analyses, classifications), l'app force Claude à respecter un schéma précis pour garantir la qualité de parsing.
- Le coût de chaque appel Claude est calculé selon les tarifs publics du modèle utilisé et apparaît dans la pile d'activité (badge € sur chaque ligne).
- Si le crédit Anthropic est insuffisant, l'erreur déclenche le fallback automatique vers un autre fournisseur (cf. FR-EXT-AI-FALLBACK) avec un message « crédits insuffisants » explicite.

> **En situation.** L'utilisateur travaille un article exigeant et veut la meilleure qualité possible — il passe `CLAUDE_MODEL=claude-sonnet-4-6` dans son `.env`. Pour ses brouillons ou analyses rapides, il bascule sur `claude-haiku-4-5-…` (4× moins cher) sans changer une ligne de code. À chaque génération, la pile d'activité affiche « Sonnet : 1 250 tokens in / 850 out → $0,022 » — il voit en temps réel ce qu'il consomme et peut décider de switcher au modèle moins cher si son article ne le justifie pas. Le jour où Anthropic affiche « insufficient credit », l'app bascule sur Gemini et le signale dans la pile d'activité, l'utilisateur recharge tranquillement ses crédits sans avoir été bloqué.

→ Conception : [DESIGN-EXT-CLAUDE](./design-registry.md#design-ext-claude)

---

#### FR-EXT-GEMINI — Intégration du fournisseur IA Gemini (Google)

Gemini est le **fournisseur gratuit** de l'app : sur son free tier (modèles « Flash »), il offre un volume de requêtes suffisant pour développer et expérimenter sans payer un centime, au prix d'une qualité légèrement inférieure à Claude et d'un rate-limit (≈ 15 requêtes par minute). L'utilisateur peut aussi choisir des modèles Gemini payants (« Pro ») pour des tâches qui demandent plus de raisonnement. Comme avec Claude, le coût (réel ou symbolique) est journalisé dans la pile d'activité.

**Critères d'acceptation**
- L'utilisateur peut sélectionner son modèle Gemini via une variable d'env (Flash gratuit, Flash Lite, Flash 2.5 / Pro 2.5 payants).
- Pour la sortie structurée (JSON), l'app force Gemini à produire du JSON valide via le mode dédié du SDK.
- Si Gemini renvoie un JSON invalide, l'app remonte une erreur claire et le fallback se déclenche.
- Les modèles Flash gratuits ont des rate-limits explicites — quand ils sont touchés, l'erreur se traduit par un fallback automatique vers un autre fournisseur, pas par un blocage de l'utilisateur.

> **En situation.** L'utilisateur explore une nouvelle idée de cocon, il enchaîne 20 mini-tâches IA en 5 minutes pour défricher le terrain. Avec Claude, ça lui coûterait quelques euros. Il bascule `AI_PROVIDER=gemini` dans son `.env`, recharge l'app — toutes ses requêtes partent maintenant gratuitement vers Gemini Flash. À la 15ᵉ requête, le rate-limit free tier se déclenche : l'app le voit, retente en backoff puis bascule sur OpenRouter, l'utilisateur continue sans s'apercevoir de rien. Pour une analyse Capitaine plus exigeante, il switche temporairement sur `GEMINI_MODEL=gemini-2.5-pro` (payant) pour cette tâche précise.

→ Conception : [DESIGN-EXT-GEMINI](./design-registry.md#design-ext-gemini)

---

#### FR-EXT-EMBEDDINGS — Calcul de similarité sémantique avec un modèle local HuggingFace

Pour certaines fonctionnalités du Moteur (notamment la mesure de pertinence sémantique entre un sujet et une liste de mots-clés), l'app a besoin de comparer **le sens** de deux textes, pas leur orthographe. Plutôt que d'envoyer ces textes à une IA payante à chaque fois, l'app utilise un **modèle d'embeddings local** (téléchargé une seule fois et exécuté côté serveur) qui produit un score de similarité (0 à 1) en quelques millisecondes, **sans coût et sans appel réseau**. Si le modèle ne peut pas être chargé (pas d'internet la première fois, ressources insuffisantes), l'app continue à fonctionner avec une dégradation gracieuse — la pertinence sémantique est simplement indisponible.

**Critères d'acceptation**
- Le modèle d'embeddings est chargé **paresseusement** au premier usage (premier chargement plus lent, ≈ 60 secondes).
- Une fois chargé, le modèle reste en mémoire pour la durée de la session serveur — les calculs ultérieurs sont instantanés (quelques ms par lot).
- L'utilisateur n'a aucun appel API externe à payer pour cette fonctionnalité — le calcul est 100 % local.
- Si le modèle ne charge pas (timeout, environnement contraint), les fonctionnalités qui en dépendent retournent une valeur « non disponible » plutôt que de planter l'app.
- L'app supporte le **multilingue** (le modèle utilisé gère plusieurs langues, dont le français qui est la cible principale).

> **En situation.** L'utilisateur lance son premier scan Discovery de la journée. La première carte de mot-clé attend une demi-minute pour afficher son score de pertinence sémantique — l'app charge silencieusement le modèle HuggingFace en mémoire. À partir de la deuxième carte, tout va très vite : les scores apparaissent en moins d'une seconde, sans qu'aucun appel ne soit envoyé à un fournisseur payant. La pile d'activité affiche zéro coût IA pour cette tâche. Le lendemain matin, l'app a redémarré dans la nuit — première carte de la session de nouveau lente, puis cadence normale. Si jamais le serveur a un souci pour charger le modèle (ex : restriction réseau dans un environnement bloqué), l'app le détecte et masque proprement la barre de pertinence sémantique sur les cartes — le reste du Moteur reste pleinement opérationnel.

→ Conception : [DESIGN-EXT-EMBEDDINGS](./design-registry.md#design-ext-embeddings)

---

#### FR-EXT-AUTOCOMPLETE-GOOGLE — Suggestions d'autocomplétion Google

Pour découvrir des **variantes long-tail** d'un mot-clé (ce que les gens tapent réellement dans Google quand ils commencent à écrire ce mot), l'app consulte directement les suggestions Google Autocomplete. Pour un mot-clé donné, elle remonte la liste des autocomplétions proposées par Google et indique si le mot-clé original y figure (et à quelle position). La requête est rate-limitée (1 par seconde) et tombe en mode silencieux si Google rejette la requête — l'utilisateur ne voit alors juste pas de suggestions, l'app continue à fonctionner.

**Critères d'acceptation**
- Pour un mot-clé donné, l'utilisateur peut consulter la liste des autocomplétions Google.
- L'app indique si le mot-clé original est présent dans les autocomplétions de sa racine (et à quelle position dans la liste).
- Quand Google rejette ou met en quarantaine la requête, l'app retourne une liste vide silencieusement — pas d'erreur bloquante pour l'utilisateur.
- L'app ne dépasse pas 1 requête par seconde sur ce point d'entrée (respect du rate-limit informel de Google).
- Les résultats sont mis en cache pour éviter de retaper la même requête en boucle.

> **En situation.** L'utilisateur prépare un cocon « Création d'entreprise » et veut découvrir comment les gens cherchent réellement le sujet. Sur la racine « créer entreprise », l'app remonte les autocomplétions Google : « créer entreprise individuelle », « créer entreprise auto-entrepreneur », « créer entreprise en ligne », « créer entreprise sans argent »… Il a 10 nouvelles variantes long-tail à explorer, gratuitement, en quelques secondes. Sur une racine peu populaire ou un sujet pointu (« indemnité conventionnelle rupture employeur 2026 »), l'app lui retourne une liste vide — soit Google n'a pas d'autocomplétion sur ce mot trop spécifique, soit la requête a été rejetée. Aucun message d'erreur agressif — il comprend juste qu'il n'y a pas de pépite à découvrir là-dessus et passe à la racine suivante.

→ Conception : [DESIGN-EXT-AUTOCOMPLETE-GOOGLE](./design-registry.md#design-ext-autocomplete-google)

---

### 8.14 — Infrastructure transversale (FR-INFRA)

> **Pourquoi cette section ?**
> Les §8.1 → §8.13 décrivent **ce que l'utilisateur fait** dans l'outil (rédiger, valider, scanner). Cette §8.14 décrit les **invariants techniques transversaux** qui rendent ces fonctionnalités fiables : caches qui évitent de re-payer un appel API à chaque clic, wrapper réseau qui standardise la gestion d'erreur, persistance qui ramène l'utilisateur exactement où il s'est arrêté entre deux sessions, garde-fous qui empêchent d'afficher un score `0` quand la donnée est absente. Ces invariants ne sont pas visibles directement à l'écran — mais leur absence le serait immédiatement (coûts API qui explosent, score trompeur, donnée perdue après un reload). Les détails d'implémentation (chemins, endpoints, watchers) sont dans le registre de conception correspondant.

---

#### FR-INFRA-API-CACHE — Cache court des appels externes
Quand l'utilisateur déclenche un scan ou une analyse qui appelle un service externe (DataForSEO, autocomplete, PAA Google), le résultat est **mis en cache automatiquement** pour quelques heures à quelques jours selon le type. Si l'utilisateur relance la même action sur le même mot-clé peu après, **aucun nouvel appel externe** n'est facturé : le système ressert la réponse précédente. Le cache est partagé entre tous les articles — un scan effectué pour l'article A profite à l'article B s'il porte sur le même mot-clé.

**Critères d'acceptation**
- Un appel externe identique sur le même mot-clé dans le délai de validité du cache ne déclenche pas de re-facturation.
- Si l'utilisateur clique « Rafraîchir » volontairement, le cache est ignoré et le serveur va chercher la fraîche valeur.
- Le cache n'expose jamais une donnée périmée : un résultat expiré n'est plus servi, même si la ligne reste un instant en base.

→ Conception : [DESIGN-INFRA-API-CACHE](./design-registry.md#design-infra-api-cache)

---

#### FR-INFRA-API-CACHE-PURGE — Nettoyage automatique du cache court
Le cache externe ne grossit pas indéfiniment : un **job de purge horaire** supprime les lignes périmées. L'utilisateur ne voit jamais cet artefact, mais cela garantit que la base de données reste légère même après des mois d'usage intensif.

**Critères d'acceptation**
- Après quelques heures d'usage normal, la base ne contient pas de lignes de cache dont la date d'expiration est dépassée.
- La purge tourne en tâche de fond sans bloquer aucune requête utilisateur.

→ Conception : [DESIGN-INFRA-API-CACHE-PURGE](./design-registry.md#design-infra-api-cache-purge)

---

#### FR-INFRA-KEYWORD-METRICS — Cache permanent des KPI mot-clé
Tous les KPIs de marché d'un mot-clé (volume de recherche, difficulté, CPC, concurrence, intention de recherche, autocomplete Google, PAA, etc.) sont stockés de manière **permanente et cross-article** : une fois récupérés pour un mot-clé donné, ils sont réutilisables d'un article à l'autre, d'un cocon à l'autre, sans réinterroger l'API DataForSEO. Une notion de **fraîcheur** (7 jours par défaut) déclenche une mise à jour spontanée si l'utilisateur revient sur un mot-clé ancien — sinon le système ressert tel quel.

**Critères d'acceptation**
- Un mot-clé déjà vu une fois ne re-déclenche pas d'appel DataForSEO tant que sa fraîcheur n'est pas dépassée.
- Quand la fraîcheur est dépassée, le rafraîchissement est silencieux et préserve les valeurs précédentes si la nouvelle réponse est partielle (pas d'écrasement par `null`).
- Les KPIs sont accessibles cross-article : un mot-clé scanné dans le cocon A est immédiatement disponible dans le cocon B.

> **En situation.** Un consultant SEO ouvre le Capitaine d'un nouvel article et y voit s'afficher les KPIs (volume, CPC, KD) du mot-clé suggéré **instantanément**, sans temps de chargement et sans facturation DataForSEO — parce qu'il avait déjà scanné ce mot-clé deux semaines plus tôt sur un autre article. Si la donnée a plus de 7 jours, un appel silencieux la rafraîchit en arrière-plan, sans bloquer l'affichage initial.

→ Conception : [DESIGN-INFRA-KEYWORD-METRICS](./design-registry.md#design-infra-keyword-metrics)

---

#### FR-INFRA-PAA-CACHE — Cache des questions People Also Ask
Les questions PAA Google d'un mot-clé sont mises en cache et **réutilisables sans contexte article** : la même requête Google → mêmes PAA, donc on les stocke une fois pour toutes par mot-clé. Cette cache alimente les arbres PAA dépliables sur les cartes radar (FR-UI-RADAR-CARD) et les explorations Capitaine.

**Critères d'acceptation**
- Une PAA déjà récupérée pour un mot-clé est ressertie instantanément sans appel externe (dans la fenêtre de fraîcheur).
- Si l'utilisateur demande un niveau de profondeur plus fin que ce qui est en cache, le système re-fetch pour combler le manque.

→ Conception : [DESIGN-INFRA-PAA-CACHE](./design-registry.md#design-infra-paa-cache)

---

#### FR-INFRA-GET-OR-FETCH — Discipline « cache d'abord, fetch ensuite »
Tous les services backend qui consultent une donnée externe **vérifient d'abord le cache** avant d'envoyer un appel API. C'est une discipline de code (CLAUDE.md anti-pattern : « appel API externe sans consulter le cache d'abord ») qui garantit à l'utilisateur que rien n'est facturé deux fois pour la même question.

**Critères d'acceptation**
- Aucun nouveau service ne peut introduire un appel externe sans passer par la cascade cache → fetch → cache write.
- Un audit grep du code retourne 0 appel externe non précédé d'une lecture cache pour les services concernés.

> **En situation.** Sans cette discipline, l'utilisateur cliquerait sur « Scanner ce mot-clé » et serait facturé à chaque clic, même si le résultat est identique à 10 minutes près. Avec, le premier scan paie, les suivants sont gratuits jusqu'à expiration.

→ Conception : [DESIGN-INFRA-GET-OR-FETCH](./design-registry.md#design-infra-get-or-fetch)

---

#### FR-INFRA-API-WRAPPER — Point d'entrée unique pour tous les appels backend
Tous les appels réseau du front vers le backend de l'app passent par **un seul module wrapper** (jamais `fetch` direct dans un composant ou un store). Pour l'utilisateur, cela se traduit par : (1) un **message d'erreur cohérent** quoi qu'il arrive (quota DataForSEO atteint, IA surchargée, etc.), (2) un **tracking automatique** des coûts API dans la pile d'activité (cf. FR-INFRA-COST-LOG-STORE), (3) un **tracking des opérations DB** pour l'observabilité.

**Critères d'acceptation**
- Tout endpoint backend appelé depuis le front est invoqué via le wrapper — pas de `fetch` direct dans `src/`.
- Quand l'API retourne une erreur connue (quota, surcharge), l'utilisateur voit un toast explicite avec une recommandation d'action, pas une stack trace.
- Le coût en tokens d'un appel IA non-streamé est automatiquement ajouté à la pile d'activité dès que la réponse arrive.
- L'audit `data-flow-discipline` retourne 0 violation pour la catégorie « fetch() directs hors wrapper » côté `src/`.

> **En situation.** Sans cette discipline, chaque composant ferait son propre `fetch` avec son propre `try/catch` partiel — un quota atteint pourrait passer silencieusement, ou l'utilisateur verrait un message technique différent selon la page. Avec, l'expérience est uniforme : tout passe par le même tuyau, donc tout erreur est traitée pareil.

→ Conception : [DESIGN-INFRA-API-WRAPPER](./design-registry.md#design-infra-api-wrapper)

---

#### FR-INFRA-API-STREAM — Streaming SSE unifié pour l'IA progressive
Les actions IA qui produisent un texte long (génération d'article, brief de rédaction, panel d'aide Capitaine) sont **streamées en temps réel** : l'utilisateur voit le texte s'écrire mot après mot, sans attendre la réponse complète. Ce streaming est implémenté via un wrapper unique côté front (les mêmes garanties que les appels classiques : cost-log, gestion d'erreur, abort).

**Critères d'acceptation**
- Tous les endpoints SSE de l'app (article generation, panels IA, briefs) passent par le même wrapper de streaming côté front.
- L'utilisateur peut interrompre un stream en cours (bouton Annuler) sans laisser de requête zombie côté serveur.
- Le coût final d'un stream (tokens consommés) est ajouté à la pile d'activité à la fin du stream, comme pour un appel classique.

→ Conception : [DESIGN-INFRA-API-STREAM](./design-registry.md#design-infra-api-stream)

---

#### FR-INFRA-ZOD-SHARED — Validation des contrats front/back
Tous les payloads échangés entre le front et le backend sont **validés via des schémas partagés** : un même schéma définit la forme d'une requête côté front (TypeScript) et côté back (validation runtime). L'utilisateur ne voit jamais une donnée mal formée traverser silencieusement la frontière — toute requête malformée est rejetée explicitement avec un code 400.

**Critères d'acceptation**
- Toutes les routes backend qui acceptent un body JSON valident leur entrée via un schéma partagé.
- Un payload malformé retourne un code HTTP 400 avec un message d'erreur lisible, pas un crash 500.

→ Conception : [DESIGN-INFRA-ZOD-SHARED](./design-registry.md#design-infra-zod-shared)

---

#### FR-INFRA-PROMPT-LOADER — Prompts IA agnostiques + injection sécurisée
Les prompts envoyés à Claude / Gemini sont stockés en fichiers `.md` **sans logique de contexte** : la stratégie, le keyword, le micro-contexte article sont injectés à la volée via des variables `{{...}}`. Cela garantit deux choses pour l'utilisateur :
1. Les prompts restent réutilisables d'un cocon à l'autre, d'un article à l'autre.
2. Le contenu utilisateur injecté (par exemple le titre d'un article ou un texte sélectionné dans l'éditeur) est **échappé** avant injection — un utilisateur ne peut pas, par mégarde, casser le comportement de l'IA en collant un texte qui ressemble à une instruction.

**Critères d'acceptation**
- Aucun prompt `.md` ne contient de logique conditionnelle ou de référence à un état utilisateur — tout passe par variables `{{...}}`.
- Le contenu utilisateur qui ressemble à une instruction (`\n\nHuman:`, `<system>`, etc.) est neutralisé avant injection dans le prompt.

→ Conception : [DESIGN-INFRA-PROMPT-LOADER](./design-registry.md#design-infra-prompt-loader)

---

#### FR-INFRA-WORKFLOW-CHECKS-CONSTANTS — Source unique des checks workflow
Les **checks de progression** (Discovery fait, Radar fait, Capitaine verrouillé, etc.) ne sont jamais écrits comme des strings libres dans le code — ils passent par une liste centralisée de constantes préfixées (`moteur:*`, `cerveau:*`, `redaction:*`). Pour l'utilisateur, cela garantit que **les dots de progression et les bannières de transition affichent toujours le même état** quel que soit l'endroit qui a déclenché l'avancement.

**Critères d'acceptation**
- Toute progression utilisateur (verrouillage Capitaine, validation Lexique, publication article) émet exactement la constante correspondante — pas de variante orthographique.
- Tout consommateur (dots du header, bannière de transition, finalisation gating) lit la même constante — pas de duplication.

→ Conception : [DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS](./design-registry.md#design-infra-workflow-checks-constants)

---

#### FR-INFRA-SCORE-MODULE — Module score unifié
Tous les scores et KPIs (Pertinence Capitaine, score composite, volume, CPC, difficulté…) passent par **un seul module helper** qui gère l'affichage (placeholder `—` pour valeur absente), le tri (valeurs absentes en bas) et l'agrégation (moyennes excluant les `null`). C'est l'invariant qui garantit que l'utilisateur ne verra **jamais** un score `0` sur une carte sans donnée, ni un tri qui ignore la valeur affichée.

**Critères d'acceptation**
- Tous les composants qui affichent un score ou un KPI marché passent par les helpers du module.
- Les fonctions de tri et d'agrégat consomment les mêmes valeurs que celles affichées (cohérence affichage/calcul).

→ Conception : [DESIGN-INFRA-SCORE-MODULE](./design-registry.md#design-infra-score-module)

---

#### FR-INFRA-NO-SCORE-FALLBACK — Interdiction du fallback silencieux sur score
Il est **techniquement impossible** d'écrire `score ?? 0` dans le code de l'app : une règle ESLint refuse de compiler ce pattern. Pour l'utilisateur, cela garantit qu'aucun score `0` trompeur ne peut apparaître sur une carte sans donnée — la valeur reste `null`, l'affichage est `—`, et le tri/agrégat la traite comme absente.

**Critères d'acceptation**
- Toute tentative d'écrire un fallback `?? 0` sur une variable contenant le mot « score » casse le build (ESLint en erreur).

> **En situation.** Sans cette règle, un développeur pressé écrit `card.relevanceScore ?? 0` pour éviter un crash, et l'utilisateur se retrouve avec 30 cartes affichant un score `0` côte à côte. Il trie par score décroissant, rien ne bouge, il se demande si l'outil est cassé. Avec la règle, le développeur est forcé d'expliciter ce qu'il fait du cas `null` (afficher `—`, exclure du tri, ou autre) — l'utilisateur n'est jamais trompé.

→ Conception : [DESIGN-INFRA-NO-SCORE-FALLBACK](./design-registry.md#design-infra-no-score-fallback)

---

#### FR-INFRA-KPI-NULLABLE — KPI marché nullables de bout en bout
Les 4 KPIs marché (volume de recherche, difficulté, CPC, concurrence) circulent partout dans l'app **avec la possibilité d'être `null`** — c'est-à-dire « donnée non disponible » plutôt que `0`. Quand DataForSEO ne renvoie pas de signal pour un mot-clé obscur ou que le mot-clé n'a jamais été scanné, la valeur reste `null` jusqu'à l'affichage. Aucun adapter de la chaîne (API → service → store → composant) ne substitue silencieusement `0` ou `"N/A"`.

**Critères d'acceptation**
- Quand DataForSEO ne retourne pas de signal sur un KPI, la valeur reste `null` côté front (pas substituée par `0`).
- L'utilisateur peut distinguer visuellement « mot-clé à volume 0 » (rare mais réel) de « mot-clé dont on n'a pas la donnée » (placeholder `—`).

→ Conception : [DESIGN-INFRA-KPI-NULLABLE](./design-registry.md#design-infra-kpi-nullable)

---

#### FR-INFRA-KPI-DISPLAY-DASH — Affichage `—` pour KPI absent
Quand un KPI marché est `null`, l'utilisateur voit le placeholder **`—`** (tiret cadratin) à l'écran, **jamais** `0`, `0.00 €`, ou `0 %`. Ce placeholder est uniforme sur tous les composants (cartes radar, panel Capitaine, comparaison locale, etc.) — il signe que la donnée n'a pas été récupérée, pas qu'elle vaut zéro.

**Critères d'acceptation**
- Tout consommateur affichant un KPI marché passe par les helpers de formatage centralisés.
- `null` ou `undefined` produit `—` à l'écran, jamais une valeur numérique.

→ Conception : [DESIGN-INFRA-KPI-DISPLAY-DASH](./design-registry.md#design-infra-kpi-display-dash)

---

#### FR-INFRA-KPI-CONSISTENCY — Cohérence affichage / tri / agrégat sur KPI
**Application directe de CLAUDE.md §2.0.** Pour un même KPI, la valeur affichée à l'utilisateur (`—` ou un nombre) ET la valeur utilisée pour trier une liste ou calculer une moyenne sont **strictement la même expression** :
- une carte avec `volume = null` s'affiche `—` ET tombe en bas d'un tri descendant par volume,
- elle est **exclue** des moyennes ou sommes (le dénominateur s'ajuste, pas de division par 0).

L'utilisateur n'observe jamais une divergence du type « cette carte affiche `—` mais elle reste en tête du tri ».

**Critères d'acceptation**
- Une carte avec un KPI `null` est triée en bas d'une liste descendante (et en haut d'une liste ascendante).
- Une moyenne sur 3 valeurs `[10, null, 30]` retourne `20` (moyenne sur 2 valeurs effectives), pas `13.33`.
- L'ordre rendu par un composant de liste KPI correspond exactement à l'ordre produit par la fonction de tri sur la même donnée.

→ Conception : [DESIGN-INFRA-KPI-CONSISTENCY](./design-registry.md#design-infra-kpi-consistency)

---

#### FR-INFRA-KPI-SCORING-NULLSAFE — Scoring null-safe
Les fonctions de scoring qui combinent plusieurs KPIs (score composite, verdict Go/No-Go, opportunité, alertes) traitent une composante `null` comme **« manquante »** plutôt que comme `0`. Si une composante manque, son poids est redistribué sur les composantes effectivement disponibles. Si toutes les composantes manquent, le score total est `null` (et le verdict est neutre `GRAY`, pas `NO_GO`).

**Critères d'acceptation**
- Un score composite calculé sur 3 KPIs disponibles + 1 `null` est cohérent (renormalisation des poids), pas pénalisé.
- Un verdict Go/No-Go sur un mot-clé sans aucune donnée est neutre (`GRAY`), pas négatif.
- Une alerte « donnée manquante » est émise (niveau `info`) au lieu d'une alerte « volume zéro » (niveau `danger`).

> **En situation.** L'utilisateur scanne un mot-clé obscur où DataForSEO n'a pas de signal volume. Sans cette discipline, il verrait un verdict `NO_GO` rouge (« volume zéro = mauvais »), et passerait à côté d'un potentiel mot-clé long-tail intéressant. Avec, il voit un verdict gris « données manquantes » + une alerte info qui l'invite à compléter manuellement ou à choisir un autre angle.

→ Conception : [DESIGN-INFRA-KPI-SCORING-NULLSAFE](./design-registry.md#design-infra-kpi-scoring-nullsafe)

---

#### FR-INFRA-CHECK-HEALTH — Audit complet du repo en une commande
La commande `npm run check:health` agrège tous les contrôles d'hygiène du code (lint + type-check + cycles d'import + dead-code + règles d'architecture). Pour le développeur solo, c'est le **garde-fou unique** : un code qui passe `check:health` est sain. Pour l'utilisateur, c'est invisible — mais c'est ce qui garantit qu'une régression silencieuse ne passe pas en production.

**Critères d'acceptation**
- La commande `npm run check:health` doit passer verte avant tout merge significatif.
- Une régression sur une des sous-commandes (lint, type-check, etc.) fait échouer la commande globale.

→ Conception : [DESIGN-INFRA-CHECK-HEALTH](./design-registry.md#design-infra-check-health)

---

#### FR-INFRA-DEPENDENCY-CRUISER — Garde-fous architecturaux
Des règles d'architecture **interdisent** certains imports croisés au niveau du build : le front (`src/`) ne peut pas importer directement le backend (`server/`), les modules internes du score ne peuvent pas être importés autrement que par leur point d'entrée index. L'utilisateur ne voit jamais ces règles — mais elles empêchent que le code se dégrade silencieusement vers une architecture impossible à maintenir.

**Critères d'acceptation**
- Toute tentative d'importer `server/` depuis `src/` casse le build d'architecture.
- Toute tentative d'importer un fichier interne de `shared/score/` autrement que via l'index casse le build.

→ Conception : [DESIGN-INFRA-DEPENDENCY-CRUISER](./design-registry.md#design-infra-dependency-cruiser)

---

#### FR-INFRA-RUNTIME-MODE — Toggle global mock / réel
Un bouton dans la barre de navigation permet à l'utilisateur de **basculer toutes les sources externes en mode simulation** : l'IA répond avec des fixtures locales (pas de tokens consommés) et DataForSEO bascule en sandbox (pas de coûts). C'est l'outil indispensable pour développer, tester, démontrer l'app **sans cramer son budget**, et pour reprendre l'usage réel en un clic.

**Persistance** : la préférence de l'utilisateur survit aux rechargements de page (localStorage) ; côté serveur, l'override est gardé en mémoire et **re-synchronisé automatiquement** si le serveur a redémarré (le front repousse son dernier état). Le toggle n'est pas une donnée métier — c'est un état de session dev/utilisateur-solo, donc pas de table DB.

**Critères d'acceptation**
- En mode « mock », tous les appels IA renvoient des fixtures locales et tous les appels DataForSEO sont gratuits.
- En mode « réel », l'app consomme du budget normalement.
- Le toggle reflète la même valeur côté UI et côté décision serveur — pas de divergence entre badge et comportement.
- Si l'utilisateur a basculé en mock puis recharge la page, l'app reste en mock.
- Si le serveur a redémarré entre deux interactions, l'app re-pousse silencieusement le dernier état de l'utilisateur pour resynchroniser sans intervention manuelle.

> **En situation.** Un consultant solo développe une nouvelle fonctionnalité du Moteur le matin : il bascule sur « mock » et teste 50 fois sans dépenser un centime. À midi, il passe sur un vrai cas client : il clique « réel », l'app rebascule, il fait son scan facturé. Le soir, il fait une démo à un prospect : retour en « mock » pour ne pas que la démo coûte, mais avec des fixtures réalistes qui ressemblent à un scan vrai.

→ Conception : [DESIGN-INFRA-RUNTIME-MODE](./design-registry.md#design-infra-runtime-mode)

---

#### FR-INFRA-SCRAPE-CORPUS-NEUTRE — Scraping HTTP neutre cross-onglets
Le scraping des 10 URLs Google d'un mot-clé (titres, contenu textuel, classification blog/non-blog) est fait par un **service unique et neutre** qui ne sait rien des onglets qui le consomment (Lieutenants pour les structures Hn, Lexique pour le TF-IDF). Pour l'utilisateur, cela garantit que **les deux onglets travaillent sur le même corpus** — pas de double scrape, pas de divergence d'analyse entre les deux usages.

**Critères d'acceptation**
- Le scraping d'un même mot-clé n'est jamais fait deux fois en une session (cache mémoire 1h) ni en quelques jours (persistance DB).
- Les deux onglets consommateurs lisent exactement le même corpus.
- Une URL qui échoue (404, timeout) n'empêche pas les autres URLs du même scrape de réussir.

**Voir aussi :** NFR-MOT-LEXIQUE-DECOUPLAGE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, FR-LEX-SCRAPE-DEDIE, FR-LIE-SCRAPE-DEDIE.

→ Conception : [DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE](./design-registry.md#design-infra-scrape-corpus-neutre)

---

#### FR-INFRA-LOGGER — Logging serveur structuré
Le serveur écrit ses logs avec des **niveaux explicites** (DEBUG / INFO / WARN / ERROR) et un format coloré lisible. L'utilisateur ne voit pas ces logs (ils tournent dans le terminal du serveur), mais en cas de problème, ils permettent au consultant solo de diagnostiquer rapidement « pourquoi DataForSEO refuse mon appel » ou « pourquoi mon Capitaine n'a pas verrouillé ».

**Critères d'acceptation**
- Les logs sont activables par niveau via un fichier de configuration.
- Chaque ligne de log porte un timestamp et identifie le fichier appelant.

→ Conception : [DESIGN-INFRA-LOGGER](./design-registry.md#design-infra-logger)

---

#### FR-INFRA-ERROR-HANDLER — Middleware central d'erreur backend
Toutes les erreurs serveur passent par un **middleware central** qui les traduit en codes HTTP cohérents et en messages utilisateur lisibles. Quand l'utilisateur atteint son quota DataForSEO, son quota IA, ou que le modèle IA est surchargé, il voit un **message d'erreur explicite avec une recommandation d'action**, jamais une stack trace.

**Critères d'acceptation**
- Une erreur de quota DataForSEO retourne 429 + le code `DATAFORSEO_QUOTA_EXCEEDED` (que le front traduit en toast lisible).
- Une erreur de surcharge IA retourne 503 + le code `AI_PROVIDER_OVERLOADED`.
- Toute autre erreur non-gérée retourne 500 + un message utilisateur, pas un crash silencieux.

→ Conception : [DESIGN-INFRA-ERROR-HANDLER](./design-registry.md#design-infra-error-handler)

---

#### FR-INFRA-HEALTH-CHECK — Endpoint de santé
Un endpoint dédié permet de vérifier en un appel que le serveur tourne. Indispensable pour les scripts de démarrage (`predev`, `pretest`) qui attendent que le serveur soit prêt avant de lancer le front ou les tests E2E.

**Critères d'acceptation**
- `GET /api/health` retourne `{ status: 'ok' }` en moins de 100 ms.

→ Conception : [DESIGN-INFRA-HEALTH-CHECK](./design-registry.md#design-infra-health-check)

---

#### FR-INFRA-DB-CONNECTION-CHECK — Vérification PostgreSQL au démarrage
Au démarrage du serveur, l'app **vérifie immédiatement** la connexion à PostgreSQL et logue un message clair selon le cas (succès, service éteint, mauvais mot de passe, base inexistante). Pour le consultant solo qui démarre son app un lundi matin, ça transforme « rien ne marche, je ne sais pas pourquoi » en « ah, PostgreSQL n'est pas démarré, voilà la commande ».

**Critères d'acceptation**
- Si PostgreSQL est inaccessible, le log d'erreur indique la cause probable (service down, auth, base manquante) avec une suggestion de commande à exécuter.
- Si la connexion est OK, un log `PostgreSQL connected` est émis.

→ Conception : [DESIGN-INFRA-DB-CONNECTION-CHECK](./design-registry.md#design-infra-db-connection-check)

---

#### FR-INFRA-COST-LOG-STORE — Pile d'activité (API, DB, messages)
Une **pile d'activité** accessible depuis l'UI accumule toutes les opérations significatives effectuées par l'utilisateur : appels API IA (avec tokens consommés et coût estimé), opérations DB (insert / update / select avec durée), messages d'information / d'avertissement / d'erreur. L'utilisateur peut voir le coût total de sa session, identifier quelle action a coûté quoi, et purger la pile.

**Critères d'acceptation**
- Chaque appel IA non-streamé alimente la pile dès sa réponse arrivée.
- Chaque opération DB significative alimente la pile.
- L'utilisateur peut consulter le coût cumulé de sa session et le supprimer.

→ Conception : [DESIGN-INFRA-COST-LOG-STORE](./design-registry.md#design-infra-cost-log-store)

---

#### FR-INFRA-PAA-EXPLORATIONS — Persistance des PAA testées par article
Quand l'utilisateur teste les questions « People Also Ask » contre le pain point d'un article (sur l'onglet Capitaine), **chaque test est mémorisé** : la question, la réponse, si elle a matché, la qualité du match. À la prochaine ouverture de l'article, il retrouve toutes ses annotations — il ne perd pas son travail entre deux sessions et ne re-teste pas inutilement deux fois la même question.

**Critères d'acceptation**
- Une question PAA testée pour un article est persistée avec son résultat de match.
- Au mount de l'onglet Capitaine, toutes les PAA déjà testées s'affichent annotées (match / no-match) sans nouvelle exploration.
- Cette persistance est distincte du cache PAA générique (FR-INFRA-PAA-CACHE) — elle est article-scoped et permanente.

→ Conception : [DESIGN-INFRA-PAA-EXPLORATIONS](./design-registry.md#design-infra-paa-explorations)

---

#### FR-INFRA-INTENT-EXPLORATIONS-LEGACY — Table legacy à supprimer
Une table `intent_explorations` a existé dans une migration historique mais **n'a jamais été câblée en runtime** — aucun service ne l'écrit ni ne la lit. Vérification DB live : elle n'existe pas dans la base. C'est une dette de migration : la commande `CREATE TABLE` reste dans une migration archivée et **recréerait la table orpheline si la DB était replayée à neuf**. Pour l'utilisateur, ce drift est invisible (rien n'est cassé), mais il doit être nettoyé pour éviter qu'un futur replay ne réintroduise du bruit.

**Critères d'acceptation**
- Une migration idempotente `DROP TABLE IF EXISTS intent_explorations CASCADE` doit être ajoutée pour neutraliser le risque.
- Le commentaire « table supprimée » dans le code doit être ajusté pour refléter la réalité (migration historique, pas DROP émis).

→ Conception : [DESIGN-INFRA-INTENT-EXPLORATIONS-LEGACY](./design-registry.md#design-infra-intent-explorations-legacy)

---

#### FR-INFRA-KEYWORDS-SEO — Pool de mots-clés du cocon
Chaque cocon dispose d'un **pool de mots-clés SEO** (suggérés par l'utilisateur ou générés par l'IA Cerveau) dans lequel les articles du cocon viennent piocher leur mot-clé Capitaine. Pour l'utilisateur, c'est la liste affichée à l'onglet Aiguillage du Cerveau et exploitée par le Capitaine quand il propose des mots-clés à verrouiller.

**Critères d'acceptation**
- L'utilisateur peut ajouter, remplacer, statut-er (suggéré / validé / écarté) ou supprimer un mot-clé du pool depuis le Cerveau.
- La liste s'affiche identique d'un onglet à l'autre, d'une session à l'autre.

→ Conception : [DESIGN-INFRA-KEYWORDS-SEO](./design-registry.md#design-infra-keywords-seo)

---

#### FR-INFRA-LOCAL-ENTITIES — Référentiel statique d'entités locales
Un **référentiel statique** de régions, villes et alias géographiques est fourni par seed migration et utilisé par le scoring « ancrage local » du Capitaine + le brief « content gap » de la Rédaction. L'utilisateur ne le modifie pas (cross-cocon, livré avec l'app) — c'est une base de connaissance que l'app exploite quand son client travaille en SEO local.

**Critères d'acceptation**
- Le référentiel est chargé une fois pour toutes via seed migration, partagé cross-cocon.
- Le scoring d'ancrage local et le brief content gap consomment exactement le même référentiel.

→ Conception : [DESIGN-INFRA-LOCAL-ENTITIES](./design-registry.md#design-infra-local-entities)

---

#### FR-INFRA-LIEUTENANT-EXPLORATIONS — Persistance des propositions Lieutenants par article
Toutes les propositions de mots-clés Lieutenants pour un article (générées par l'IA ou ajoutées manuellement) sont **persistées** : à la prochaine ouverture du Moteur, l'utilisateur retrouve sa liste exacte (mot-clé, contexte, niveau Hn suggéré, score, KPIs cachés), avec son statut (proposé, sélectionné, écarté). Aucun travail n'est perdu entre sessions.

**Critères d'acceptation**
- Une proposition Lieutenant générée ou ajoutée est immédiatement persistée.
- Au mount de l'onglet Lieutenants, la liste s'affiche triée par score décroissant.
- Le statut sélectionné/écarté survit aux reloads.

**Voir aussi :** `FR-LIE-PROPOSE`, `FR-LIE-SELECT`, `FR-LIE-PERSIST`.

→ Conception : [DESIGN-INFRA-LIEUTENANT-EXPLORATIONS](./design-registry.md#design-infra-lieutenant-explorations)

---

#### FR-INFRA-KEYWORD-DISCOVERIES — Cache long terme des scans Discovery
Quand l'utilisateur fait un scan Discovery (Phase ① du Moteur) sur un seed, **l'arbre de découverte complet** (sources brutes + analyse IA) est persisté avec une fraîcheur de **30 jours**. À la réouverture, il voit un badge « Dernière analyse du DD/MM/YYYY · N mots-clés » et peut **charger** sa session ou **rafraîchir** pour repartir d'une analyse neuve.

**Critères d'acceptation**
- Un scan Discovery est persisté avec son arbre complet + son analyse IA pour le seed × langue.
- Au retour sur l'onglet, le badge de dernière analyse s'affiche et permet le chargement instantané sans recoût.
- Le bouton « Rafraîchir » bypass le cache et déclenche un nouveau scan facturé.

**Voir aussi :** `FR-DIS-CACHE` (capacité utilisateur), `FR-INFRA-API-CACHE` (cache court externe).

→ Conception : [DESIGN-INFRA-KEYWORD-DISCOVERIES](./design-registry.md#design-infra-keyword-discoveries)

---

#### FR-INFRA-ARTICLE-STRATEGIES — Persistance de la stratégie d'un article
Tout l'avancement de l'utilisateur sur le **wizard stratégie Cerveau d'un article** (aiguillage, pain point, intent, micro-contexte) est persisté. L'utilisateur peut quitter en plein wizard et reprendre exactement au step suivant — pas de progression perdue.

**Critères d'acceptation**
- Chaque saisie validée d'un step Cerveau est immédiatement persistée.
- L'avancement (nombre de steps complétés) survit aux reloads et aux changements d'article.

**Voir aussi :** `FR-CER-STEPS-ARTICLE`, `FR-CER-CONTEXT-FOR-MOTEUR`.

→ Conception : [DESIGN-INFRA-ARTICLE-STRATEGIES](./design-registry.md#design-infra-article-strategies)

---

#### FR-INFRA-COCOON-STRATEGIES — Persistance de la stratégie d'un cocon
La **stratégie cocon-level** (cible, douleur, angle, promesse, CTA) — saisie / validée au Cerveau d'un cocon — est persistée et **injectée automatiquement** dans tous les prompts IA des articles du cocon (Moteur + Rédaction). Pour l'utilisateur, c'est ce qui garantit la cohérence éditoriale d'un cocon entier sans avoir à re-saisir le contexte à chaque article.

**Critères d'acceptation**
- La stratégie d'un cocon est persistée et visible cross-articles du même cocon.
- Tout prompt IA généré pour un article du cocon est enrichi automatiquement avec cette stratégie.

**Voir aussi :** `FR-CER-STEPS-COCOON`, `NFR-INT-PROMPT-AGNOSTIC`.

→ Conception : [DESIGN-INFRA-COCOON-STRATEGIES](./design-registry.md#design-infra-cocoon-strategies)

---

#### FR-INFRA-MICRO-CONTEXTS — Micro-contextes d'article injectés dans la Rédaction
Le **micro-contexte d'un article** (angle, ton, directives, longueur visée) est persisté par article et injecté automatiquement dans les prompts IA de la phase Rédaction (brief, outline, génération de section). L'utilisateur n'a pas à le redonner à chaque appel IA — il l'a saisi une fois au Cerveau, il sert partout en Rédaction.

**Critères d'acceptation**
- Le micro-contexte d'un article est persisté et survit aux sessions.
- Toute génération IA Rédaction d'un article enrichit son prompt avec ce micro-contexte.

**Voir aussi :** `FR-CER-MICRO-CONTEXT`, `FR-CER-WORD-COUNT-RECOMMEND`, `NFR-INT-PROMPT-AGNOSTIC`.

→ Conception : [DESIGN-INFRA-MICRO-CONTEXTS](./design-registry.md#design-infra-micro-contexts)

---

#### FR-INFRA-EXTERNAL-API-CACHE — Cache générique partagé pour tous les appels API externes *(déplacée depuis §8.6 le 2026-05-12)*

Au lieu d'avoir une table de cache dédiée par fournisseur ou par type d'appel, l'app utilise **un seul cache générique** (`external_api_cache`) partagé par tous les appels API externes (DataForSEO, Google Suggest, Claude longue-traîne, Discovery, etc.). Chaque entrée est rangée par un couple `(type d'appel, clé)` qui empêche les collisions entre fournisseurs. Choix produit : la table est conservée long terme — pas de plan de mort, c'est l'infrastructure cache officielle.

**Critères d'acceptation**
- Tout nouveau service qui consomme une API externe avec mise en cache utilise cette table via les helpers partagés (`getCached`, `setCached`, `deleteCached`).
- Aucune table de cache dédiée n'est créée pour ce qui pourrait tenir dans la table générique.
- Le job de purge horaire (cf. `NFR-PERF-PURGE-HOURLY`) nettoie les entrées expirées de cette table.

> **En situation.** Un développeur ajoute une nouvelle intégration externe (par exemple un nouveau provider d'autocomplete). Il branche son service sur les helpers du cache générique avec un `cache_type` distinct (par exemple `'autocomplete-bing'`) — pas besoin de créer une nouvelle table SQL, pas de migration. Le cache fonctionne immédiatement, la purge horaire couvre.

→ Conception : [DESIGN-INFRA-EXTERNAL-API-CACHE](./design-registry.md#design-infra-external-api-cache)

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
> Les §8.4 → §8.10 documentent les FR **par onglet / par workflow** (Discovery, Radar, Capitaine, Lieutenants, Rédaction…). Or certains composants UI sont **partagés cross-onglets** : une même carte affichée à la fois sur l'onglet Capitaine et sur les scans Discovery, un même panel IA répété sur 5 ou 6 onglets, des barres et toggles d'éditeur d'article réutilisés à l'identique entre la vue Workflow et la vue Editor. Ces composants n'inventent pas de fonctionnalité utilisateur nouvelle (elles sont décrites dans les FR métier de chaque onglet) — mais leur **cohérence cross-contextes est un invariant en soi**. Un refactor du composant partagé qui marche sur un contexte et casse les autres est une régression silencieuse, sauf à ce qu'un garde-fou formalise le partage.
>
> Cette section §8.15 fournit ce garde-fou : pour chaque composant UI partagé, elle dit **où il est utilisé, qui dépend de son apparence et de son comportement**, et **quelle propriété de cohérence l'utilisateur doit pouvoir observer entre les contextes**. Les détails de structure de fichiers, sous-composants techniques et tests architecturaux sont dans le registre de conception correspondant.

#### FR-UI-RADAR-CARD — Carte mot-clé radar partagée Radar / Capitaine / scans Discovery

L'utilisateur rencontre la **même carte de mot-clé** (titre, scores, indicateurs visuels, arbre PAA déroulant) dans plusieurs endroits du Moteur : pendant les scans d'exploration de la phase Discovery, dans la liste des mots-clés à valider par le Capitaine, et dans l'affichage diagnostique des résultats radar pour un article. Quand l'utilisateur passe d'un contexte à l'autre, **l'aspect et le comportement de la carte ne changent pas** : seuls le mode d'affichage du score (KPI marché ou Pertinence Capitaine) et le mécanisme de sélection (cocher pour ajouter, verrouiller pour choisir le mot-clé maître) sont contextuels. Le rendu sous-jacent — score, ring SVG, tooltip, arbre PAA récursif — est strictement identique.

**Critères d'acceptation**
- La carte mot-clé radar s'affiche dans au moins trois contextes utilisateur : scans de la phase Discovery, validation des mots-clés Capitaine, vue diagnostique d'un mot-clé radar.
- Selon le contexte, la carte expose soit un **score KPI marché** (volume, CPC, intention), soit un **score Pertinence Capitaine** (ring SVG + tooltip). Aucun autre changement d'apparence n'est introduit entre contextes.
- Un changement visuel ou comportemental fait sur la carte dans **un** contexte doit rester cohérent dans les **autres** contextes — sinon la carte est cassée pour l'utilisateur, même si le contexte modifié fonctionne.
- L'utilisateur peut sélectionner / verrouiller / déplier l'arbre PAA d'une carte dans n'importe quel contexte selon le mécanisme propre à ce contexte, sans que cela perturbe le rendu de la même carte ailleurs.

> **En situation.** L'utilisateur travaille un article et passe la matinée à valider des mots-clés Capitaine : il voit dans la liste des cartes radar le score Pertinence sous forme de ring (un cercle gradué), avec un tooltip explicatif, et un arbre PAA dépliable « Questions associées ». L'après-midi il lance un scan douleur depuis Discovery sur le même cocon — les résultats s'affichent sous forme de **la même carte** mais avec, cette fois, le score KPI marché (volume + CPC) au lieu du ring Pertinence. Tout le reste — typographie, espacement, bouton de dépliement PAA, palette — est identique. Cohérence visuelle : il ne se demande jamais « est-ce que je suis sur le même type d'objet ? ». Trois mois plus tard, un développeur retouche la couleur du chevron PAA dans la vue Capitaine — la modification doit refléter automatiquement sur les scans Discovery, sinon l'utilisateur aurait l'impression de regarder deux composants différents pour la même donnée.

→ Conception : [DESIGN-UI-RADAR-CARD](./design-registry.md#design-ui-radar-card)

---

#### FR-UI-AI-PANELS-PATTERN — Pattern unifié des panels IA du Moteur

Chacun des onglets Moteur (Discovery, Radar, Capitaine, Lexique, Lieutenants) et la vue Rédaction Workflow propose un **panel d'assistance IA** : c'est l'endroit où l'utilisateur déclenche un appel à Claude pour obtenir une suggestion (mots-clés long-tail, termes de lexique manquants…) ou un conseil (analyse Capitaine, brief de rédaction…). Ces panels remplissent un rôle différent selon l'onglet, mais **tous présentent la même structure visuelle et le même comportement** : un titre, un état (au repos / en cours / résultat / erreur), un bouton de déclenchement, un bouton de régénération une fois le résultat obtenu, et une zone de rendu (liste d'éléments cliquables ou texte explicatif). Cela donne à l'utilisateur un langage commun sur l'IA dans tout le Moteur : il sait comment chaque panel se comporte avant même de l'utiliser.

Deuxième invariant essentiel pour l'utilisateur : **les panels IA sont visibles en permanence quand leur onglet est ouvert**, même s'ils ne sont pas encore prêts à être déclenchés (préconditions métier non remplies). L'utilisateur ne « découvre » pas un panel qui apparaît après un clic ailleurs : il le voit dès l'arrivée sur l'onglet, et si l'action est encore inaccessible, c'est exprimé par un bouton désactivé avec un message d'explication — pas par un panneau qui apparaît/disparaît selon l'état.

**Critères d'acceptation**
- Sur chaque onglet Moteur qui propose une assistance IA, l'utilisateur voit un panel IA présent dès l'arrivée sur l'onglet, sans avoir à cliquer ou scroller.
- Le panel IA expose toujours les mêmes états visuels : au repos avec un bouton de déclenchement, en cours de streaming, résultat affiché, erreur lisible.
- Quand la précondition métier d'un panel n'est pas remplie (par exemple : pas encore de scan Discovery effectué, pas de TF-IDF chargé pour le Lexique), le bouton de déclenchement est désactivé avec un texte d'invitation explicite — pas de disparition du panel.
- Une fois le résultat affiché, l'utilisateur peut relancer l'IA via un bouton de régénération qui réutilise le même mécanisme de confirmation/streaming.
- L'aspect et le comportement de ces panels restent cohérents entre onglets : refactor d'un comportement de panel dans un onglet ne doit pas casser la cohérence du même comportement dans les autres.

> **En situation.** L'utilisateur ouvre l'onglet Lexique d'un article fraîchement promu en phase Moteur, sans avoir encore extrait son lexique. Le panel IA est là, visible, mais son bouton « Extraire les termes » est grisé avec le message « Verrouille d'abord ton Capitaine pour extraire le lexique ». L'utilisateur comprend instantanément la dépendance — il revient sur le Capitaine, verrouille, et le bouton du panel Lexique devient cliquable sans qu'il ait à recharger ou à passer par une animation d'apparition. Plus tard, sur le même article, il bascule sur le panel IA Lieutenants : même structure (titre, bouton de déclenchement, état, zone de rendu), même rythme d'interaction. Pas besoin de réapprendre, l'IA Moteur parle un langage cohérent partout. Si un développeur ajoute demain un 7ᵉ panel IA dans le Moteur, l'utilisateur doit pouvoir le manipuler sans manuel d'utilisation, simplement parce qu'il a déjà manipulé les 6 autres.

→ Conception : [DESIGN-UI-AI-PANELS-PATTERN](./design-registry.md#design-ui-ai-panels-pattern)

---

#### FR-UI-ARTICLE-SHARED — Composants partagés entre la vue Editor et la vue Workflow

L'utilisateur peut produire un article par **deux entrées différentes** : la vue Workflow (intégrée au pipeline Moteur → Rédaction, avec brief IA, outline généré, sections enchaînées) ou la vue Editor (édition libre TipTap d'un article existant). Ces deux vues partagent un cœur d'**éléments d'éditeur réutilisés à l'identique** : la barre d'outils des panneaux annexes (SEO, GEO, Maillage, Blocs), la zone de panneaux redimensionnable, la barre de progression de section, les badges de coût IA, le compteur de mots, les overlays d'erreurs d'actions. Quand l'utilisateur passe d'une vue à l'autre, ces blocs lui apparaissent identiques — c'est le même outil d'édition d'article, vu sous deux modes d'entrée.

Le cœur de génération d'article (orchestration du streaming IA section par section, persistance, log de coût) est **factorisé en composable partagé** : les deux vues délèguent à la même implémentation, garantissant qu'une régression côté générateur affecte de la même façon les deux entrées plutôt que d'en privilégier une.

**Critères d'acceptation**
- Les éléments d'édition partagés (toolbar panneaux, container redimensionnable, barre de progression, badges coût, compteur mots, overlays d'erreur) ont la même apparence et le même comportement quel que soit le mode d'entrée (Workflow ou Editor).
- La génération d'article elle-même (stream, persistance, log de coût) suit le même flux dans les deux modes — l'utilisateur ne voit pas de différence de comportement.
- Un changement visuel ou fonctionnel sur un de ces éléments partagés doit rester cohérent entre les deux vues consommatrices ; aucune duplication du composant en mode Workflow vs Editor n'est tolérée.

> **En situation.** L'utilisateur démarre un nouvel article via le pipeline Moteur : il finit son Capitaine + Lieutenants + Lexique, clique « Aller à la Rédaction », et la vue Workflow s'ouvre — il voit la toolbar SEO/GEO/Maillage/Blocs en haut, la barre de progression de la section courante, les badges coût qui se mettent à jour quand l'IA tourne. Le lendemain, il rouvre le même article via une route directe d'éditeur (par exemple depuis le dashboard) — la vue Editor s'ouvre, et il retrouve **exactement les mêmes éléments d'interface au même endroit**. Pas de panneau de coût qui aurait migré, pas de barre de progression remplacée par un compteur, pas de toolbar avec deux toggles en moins. Si un développeur retouche demain l'icône d'un toggle dans la toolbar via la vue Editor, l'utilisateur retrouve la même icône en vue Workflow — sinon il aurait l'impression que deux versions de l'éditeur coexistent.

→ Conception : [DESIGN-UI-ARTICLE-SHARED](./design-registry.md#design-ui-article-shared)

---

#### FR-UI-MOTEUR-SHARED — Briques d'interface partagées entre les onglets du Moteur

Les onglets du Moteur (Discovery, Radar, Capitaine, Lieutenants, Lexique, Finalisation) partagent un **ensemble de briques d'interface transverses** que l'utilisateur retrouve à l'identique d'un onglet à l'autre : le panneau de cache « combien de données existantes pour cet article » avec son bouton de purge, l'invitation « charger les données existantes » au premier mount d'un onglet déjà alimenté, le récap de contexte (cocon, Capitaine verrouillé, articles publiés / suggérés), la bannière de transition Phase ② → ③, les dots de progression dans l'en-tête du Moteur, et le panneau d'assistance contextuelle (actions globales sur le mot-clé en cours). Ces briques garantissent à l'utilisateur un **langage visuel commun** dans tout le Moteur — il n'a pas à se réorienter en changeant d'onglet.

**Critères d'acceptation**
- Le panneau de cache (compteur de données externes + bouton purge) a la même apparence et le même comportement sur tous les onglets qui en disposent.
- L'invitation « charger les données existantes » s'affiche selon une même règle (présence de données en base) et expose un même bouton, quel que soit l'onglet.
- Le récap de contexte stratégie (cocon, articles publiés / suggérés, Capitaine verrouillé) est consultable depuis chaque onglet Moteur et reste identique en apparence.
- Les dots de progression dans l'en-tête du Moteur reflètent l'état des 5 checks Moteur (Discovery, Radar, Capitaine, Lieutenants, Lexique) — leur rendu ne change pas selon l'onglet actif.
- La bannière de transition Phase ② → ③ apparaît selon une même règle et avec le même libellé quand le Capitaine vient d'être verrouillé.
- Un refactor visuel sur l'une de ces briques doit rester cohérent sur tous les onglets consommateurs ; aucune duplication par onglet n'est tolérée.

> **En situation.** L'utilisateur travaille sur un article et oscille entre Discovery (pour relancer un scan), Capitaine (pour ajuster son verrouillage) et Lexique (pour valider quelques termes). À chaque bascule d'onglet, il retrouve **les mêmes briques aux mêmes endroits** : récap de contexte stratégie en haut, dots de progression dans le header avec l'état exact de ses 5 checks, panneau de cache sticky en bas qui lui dit « 142 mots-clés en cache pour cet article — Vider ». Il n'a jamais l'impression de changer d'application en changeant d'onglet. Quand un développeur modifie demain le libellé du bouton de purge cache pour le rendre plus explicite, l'utilisateur voit le nouveau libellé **partout** où le cache est exposé — sinon il y aurait deux versions du même bouton selon l'onglet, source de confusion.

→ Conception : [DESIGN-UI-MOTEUR-SHARED](./design-registry.md#design-ui-moteur-shared)

---

## 9. Non-Functional Requirements

### 9.1 — Performance (NFR-PERF)

> **Pourquoi cette section ?**
> L'utilisateur travaille toute la journée dans l'outil : il enchaîne les recherches de mots-clés, valide des cartes, déclenche des analyses IA, génère des articles section par section. La perception de fluidité de l'app n'est pas un luxe — c'est ce qui fait la différence entre un outil dans lequel on rentre avec entrain et un outil qu'on subit. Cette section formalise les attentes de **réactivité** que l'utilisateur doit pouvoir percevoir, et la façon dont l'app évite les ralentissements inutiles (debounce, cache, purge, streaming).

#### NFR-PERF-API-LOCAL — Réactivité des actions locales

Quand l'utilisateur déclenche une action qui **ne dépend pas d'une API externe payante** (ouvrir une vue, valider un check workflow, sauvegarder un brouillon, lire son cache local), il obtient un retour visible en moins d'un demi-seconde — typiquement, l'écran a déjà bougé au moment où il relâche la souris. L'objectif interne est < 200 ms côté serveur ; en condition réelle l'utilisateur ne doit jamais avoir l'impression « rien ne se passe ».

**Critères d'acceptation**
- Une action qui touche uniquement PostgreSQL local renvoie en moins de 200 ms côté API.
- Aucun spinner n'est nécessaire pour ces actions — la mise à jour visuelle est instantanée.
- Si une action prend plus de 500 ms (rare, dégradation), un état de chargement est affiché plutôt qu'un blocage silencieux.

**Statut :** prescrit, non monitoré (pas de middleware timing instrumentée dans l'app).

> **En situation.** L'utilisateur clique pour verrouiller un Capitaine. Le dot de progression devient plein, la bannière Phase ② → ③ apparaît, l'onglet Lexique s'active. Tout cela arrive avant qu'il ne soit revenu à son écran — pas de « cocher puis attendre puis voir ». C'est immédiat parce que l'action ne sollicite que la base locale.

→ Conception : [DESIGN-PERF-API-LOCAL](./design-registry.md#design-perf-api-local)

---

#### NFR-PERF-SSE-FIRST-TOKEN — Premier mot d'IA visible rapidement

Pour les actions IA qui *streament* leur réponse (rédaction d'article section par section, suggestions de mots-clés long-tail, brief IA, analyses contextuelles), l'utilisateur voit le **premier mot apparaître à l'écran en moins de 2 secondes** après le clic. Il sait que l'IA travaille, il peut commencer à lire en même temps qu'elle écrit, plutôt que de fixer un spinner pendant 30 secondes.

**Critères d'acceptation**
- Toute action IA en mode streaming affiche un premier caractère perceptible en moins de 2 secondes.
- En cas de dépassement (rate-limit, lenteur réseau), un indicateur d'attente reste lisible et un message explicite remplace le silence.
- L'utilisateur peut **annuler** le stream à tout moment via un bouton visible sans avoir à attendre la fin.

**Statut :** prescrit, non monitoré.

> **En situation.** L'utilisateur demande à l'IA de rédiger l'introduction de son article « Indemnité rupture conventionnelle 2026 ». Dans la seconde qui suit son clic, les premiers mots commencent à s'écrire dans l'éditeur. Il peut déjà lire « La rupture conventionnelle est aujourd'hui... » pendant que la suite arrive — il ajuste mentalement le ton avant même la fin de la première phrase.

→ Conception : [DESIGN-PERF-SSE-FIRST-TOKEN](./design-registry.md#design-perf-sse-first-token)

---

#### NFR-PERF-VIEW-LOAD — Bascule rapide entre vues

Quand l'utilisateur change d'écran (dashboard → cocon, cocon → Moteur, Moteur → Rédaction, etc.), la **nouvelle vue apparaît en moins d'une demi-seconde**. Le code de chaque vue est chargé à la demande pour ne pas ralentir le premier démarrage, mais une fois en mémoire, la navigation est fluide.

**Critères d'acceptation**
- Le changement de route affiche la vue cible en moins de 500 ms en condition normale (pas de fetch externe bloquant).
- Pendant le chargement initial d'une vue lazy, un état d'attente discret est visible plutôt qu'un écran blanc.
- L'utilisateur ne perd jamais le repère du contexte (titre courant, breadcrumb stable) pendant la transition.

**Statut :** prescrit, non monitoré.

> **En situation.** L'utilisateur navigue depuis le dashboard vers le cocon « Rupture conventionnelle », puis clique sur la porte Moteur d'un article. Chaque transition prend moins d'une demi-seconde — il ne voit jamais un écran blanc qui le laisse douter de son clic.

→ Conception : [DESIGN-PERF-VIEW-LOAD](./design-registry.md#design-perf-view-load)

---

#### NFR-PERF-CACHE-HIT-RATE — Évite les appels payants déjà connus

Une fois qu'un mot-clé a été interrogé sur DataForSEO (volume, CPC, intention, suggestions, SERP), ses métriques sont **stockées localement et réutilisées** pour toutes les requêtes ultérieures du même mot-clé. Le but : qu'au moins **9 requêtes sur 10** sur un mot-clé déjà vu n'engendrent **aucun appel payant**.

**Critères d'acceptation**
- Une seconde requête sur un mot-clé déjà vu (dans la même langue/pays) renvoie depuis le cache local, sans rappel DataForSEO.
- Le cache survit aux redémarrages de l'application (persistance PostgreSQL).
- Un mécanisme de purge périodique évite l'inflation des données obsolètes (cf. `NFR-PERF-PURGE-HOURLY`).

**Statut :** prescrit, non monitoré (pas d'instrumentation de hit-rate aujourd'hui — à ajouter pour mesurer).

> **En situation.** L'utilisateur travaille sur 5 articles d'un même cocon. Il finit par tourner autour des mêmes 30 mots-clés racines. Le premier passage de Discovery sur « rupture conventionnelle » fait quelques appels DataForSEO ; les 4 suivants, sur les mêmes mots-clés, sont gratuits — il voit les volumes et CPC s'afficher instantanément sans qu'un compteur de coût bouge.

→ Conception : [DESIGN-PERF-CACHE-HIT-RATE](./design-registry.md#design-perf-cache-hit-rate)

---

#### NFR-PERF-PURGE-HOURLY — Nettoyage automatique du cache obsolète

Les entrées de cache à durée de vie courte (TTL) sont **purgées automatiquement chaque heure** par un job de fond. L'utilisateur n'a rien à faire — il ne voit jamais une base qui gonfle indéfiniment ni des résultats périmés qui traînent.

**Critères d'acceptation**
- Toutes les heures, le job purge les entrées de cache dont la date d'expiration est dépassée.
- Aucune action utilisateur n'est nécessaire pour déclencher cette purge.
- L'utilisateur garde la main pour purger manuellement le cache externe via le panneau de cache de chaque onglet Moteur (cf. `FR-UI-MOTEUR-SHARED`).

**Statut :** active, implémenté.

> **En situation.** Au démarrage du serveur, un compteur interne se met en route. À 10h00, à 11h00, à 12h00..., le job balaie le cache externe et supprime ce qui est périmé. L'utilisateur ne voit jamais ce mécanisme — sa base reste compacte et ses lectures rapides.

→ Conception : [DESIGN-PERF-PURGE-HOURLY](./design-registry.md#design-perf-purge-hourly)

---

#### NFR-PERF-SEO-DEBOUNCE — Scoring SEO live sans saccader la frappe

Quand l'utilisateur écrit un article, le **score SEO et les indicateurs de pertinence se mettent à jour automatiquement** au fil de la frappe — sans bloquer la saisie, sans saccader le curseur, sans rendre l'éditeur poussif. Concrètement, le recalcul attend une courte pause de la frappe (300 ms) avant de se lancer, et s'exécute pendant les temps morts du navigateur pour ne pas concurrencer la saisie active.

**Critères d'acceptation**
- L'utilisateur peut écrire en continu sans aucun « blocage » perceptible du curseur ou du clavier.
- Le score SEO se met à jour visiblement après une courte pause (≈ 300 ms après le dernier caractère tapé).
- Sur les articles longs, le scoring ne provoque pas de saccades sensibles à l'œil.

**Statut :** active, implémenté.

> **En situation.** L'utilisateur tape un paragraphe d'introduction de 80 mots. Pendant qu'il écrit, le ring de score SEO en haut reste figé — pas de scintillement, pas de recalcul à chaque touche. Dès qu'il marque une pause de 300 ms (typiquement entre deux phrases), le score recalcule discrètement et l'indicateur ajusté apparaît. Aucune frustration de saisie.

→ Conception : [DESIGN-PERF-SEO-DEBOUNCE](./design-registry.md#design-perf-seo-debounce)

---

#### NFR-PERF-INTER-SECTION-DELAY — Pause entre sections pour fiabiliser la génération

Lors de la génération d'un article section par section, l'app **temporise volontairement entre chaque section** (15 secondes par défaut) pour respecter les limites de débit de Claude. L'utilisateur préfère attendre quelques secondes par section plutôt que de voir la génération s'interrompre à mi-parcours avec une erreur « rate-limit ».

**Critères d'acceptation**
- Entre deux sections successives, une pause configurable s'applique (défaut 15 s).
- Le délai est ajustable via configuration (`INTER_SECTION_DELAY` env var) — 0 pour les tests, plus si l'utilisateur veut être plus prudent.
- L'utilisateur voit un compte à rebours ou un état d'attente clair entre deux sections, pas un silence anxiogène.

**Statut :** active.

> **En situation.** L'utilisateur lance la génération complète d'un article de 6 sections. La section 1 s'écrit en stream. À la fin, une indication « Section 2 dans 15 s... » apparaît. Pendant ce temps, il peut relire et corriger la section 1. La pause se termine, la section 2 s'écrit. Le flow naturel — lire/corriger/laisser-couler — épouse la cadence de l'IA plutôt que de la combattre.

→ Conception : [DESIGN-PERF-INTER-SECTION-DELAY](./design-registry.md#design-perf-inter-section-delay)

---

### 9.2 — Coût et optimisation (NFR-COST)

> **Pourquoi cette section ?**
> L'outil consomme des crédits DataForSEO et des crédits IA (Claude / Gemini) à chaque scan, à chaque rédaction. Pour un consultant solo, **chaque euro compte** : il faut que l'app évite systématiquement les appels redondants, plafonne automatiquement la dépense quand un mauvais paramètre l'entraînerait à boucler, et propose un mode développement gratuit pour itérer sans brûler ses crédits. Cette section formalise ces garde-fous.

#### NFR-COST-CACHE-FIRST — Aucun appel payant si la réponse est déjà en cache

Avant tout appel à une API tierce qui paie (DataForSEO, Claude, Gemini), l'app **consulte d'abord le cache local**. Trois niveaux sont vérifiés dans cet ordre : les métriques de mots-clés permanentes (volume, CPC, intention, SERP, PAA…) qui survivent au redémarrage, puis le cache externe à TTL, puis les caches spécialisés (PAA, Discovery). Si la donnée existe et qu'elle est fraîche, l'API externe n'est pas appelée.

**Critères d'acceptation**
- Aucune requête vers une API payante n'est émise si la même donnée est disponible et fraîche en cache local.
- L'utilisateur ne voit jamais un compteur de coût bouger pour une requête déjà connue.
- Le cache est vérifié systématiquement avant chaque appel — pas d'option « forcer l'appel » par défaut (sauf bouton purge manuel).

**Statut :** active.

> **En situation.** L'utilisateur a déjà fait un scan Discovery la semaine dernière sur « rupture conventionnelle ». Il le relance aujourd'hui sur le même mot-clé : les résultats reviennent en moins de 2 secondes et son compteur de coût DataForSEO reste à zéro. La donnée vient du cache local.

→ Conception : [DESIGN-COST-CACHE-FIRST](./design-registry.md#design-cost-cache-first)

---

#### NFR-COST-POSTGRESQL — Persistance qui survit aux redémarrages

Toutes les données chaudes de l'app (mots-clés, métriques, scans, scores, articles, stratégies, caches) sont stockées en **base PostgreSQL locale**, jamais dans des fichiers JSON volatiles. L'utilisateur peut redémarrer son ordinateur, fermer son éditeur, mettre l'app à jour — il **retrouve ses caches et son travail intact**, sans appel API redondant pour reconstituer ce qui existait déjà.

**Critères d'acceptation**
- Au redémarrage de l'app, l'utilisateur retrouve toutes ses données (articles, scans, métriques, caches) sans rechargement nécessaire.
- Aucun fichier JSON dans `data/` n'est utilisé pour des données chaudes.
- Une mise à jour applicative ne perd jamais l'état utilisateur — seules les migrations DB versionnées modifient la structure des données.

**Statut :** active.

> **En situation.** L'utilisateur ferme son ordinateur le vendredi soir alors qu'il a 3 articles en cours dans 2 cocons, avec des scans Discovery faits dans la semaine. Lundi matin, il rouvre l'app : tout est là — la liste d'articles, les checks cochés, les mots-clés validés, les scans en cache. Aucun appel DataForSEO pour reconstituer.

→ Conception : [DESIGN-COST-POSTGRESQL](./design-registry.md#design-cost-postgresql)

---

#### NFR-COST-BODY-LIMIT — Plafond raisonnable sur la taille des payloads

L'API accepte des requêtes jusqu'à **5 Mo de payload JSON** — assez large pour les longues structures (articles complets, scans massifs), mais bornée pour éviter qu'une requête mal formée ou un bug ne saturne le serveur avec des dizaines de mégas.

**Critères d'acceptation**
- Une requête de moins de 5 Mo est acceptée sans friction.
- Une requête au-delà reçoit un refus immédiat avec message clair plutôt qu'un timeout ou un crash silencieux.

**Statut :** active.

→ Conception : [DESIGN-COST-BODY-LIMIT](./design-registry.md#design-cost-body-limit)

---

#### NFR-COST-DATAFORSEO-BUDGET — Budget glissant qui plafonne la dépense

Pour DataForSEO, l'app maintient un **budget glissant sur une fenêtre de temps** (par défaut : 0,50 $ sur 30 minutes). À tout moment, l'utilisateur sait qu'aucun bug ne peut le faire dépenser plus que ce plafond dans la fenêtre. Le budget et la durée de fenêtre sont configurables si l'utilisateur souhaite être plus permissif ou plus strict.

**Critères d'acceptation**
- L'utilisateur peut ajuster le plafond et la durée de fenêtre via la configuration.
- Le compteur glissant suit la dépense effective sur la fenêtre courante.
- Le mécanisme est actif sans intervention utilisateur — pas de bouton « activer le budget ».

**Statut :** active, configurable via variables d'environnement.

> **En situation.** L'utilisateur lance par mégarde un scan massif qui boucle sur une liste de 200 mots-clés. À la 70ᵉ requête, le budget glissant de 0,50 $ est atteint. L'app bloque proprement les requêtes suivantes avec un message clair — la facture s'arrête à 0,50 $ au lieu de monter à 5 $ par accident.

→ Conception : [DESIGN-COST-DATAFORSEO-BUDGET](./design-registry.md#design-cost-dataforseo-budget)

---

#### NFR-COST-DATAFORSEO-RESERVE — Blocage pré-appel quand le budget serait dépassé

Avant chaque appel DataForSEO, l'app **estime le coût** de la requête (selon l'endpoint et le nombre d'items) et vérifie qu'il rentre dans le budget restant de la fenêtre. Si ce serait dépassé, **l'appel est bloqué avant émission** avec un message d'erreur explicite — pas de débit après-coup, pas de surprise.

**Critères d'acceptation**
- Une requête qui dépasserait le budget glissant est refusée **avant** l'appel HTTP.
- L'utilisateur reçoit un message d'erreur clair qui précise le coût attendu, le budget consommé, le plafond et la fenêtre.
- Une fois la fenêtre écoulée, les requêtes redeviennent autorisées sans intervention manuelle.

**Statut :** active.

> **En situation.** L'utilisateur a déjà consommé 0,48 $ dans les 25 dernières minutes. Il lance un scan qui coûterait 0,05 $. Avant d'émettre la requête, l'app calcule (0,48 + 0,05 > 0,50) et refuse avec un message : « Budget DataForSEO atteint — patiente 5 min ou augmente le plafond ». Pas de surprise sur la facture.

→ Conception : [DESIGN-COST-DATAFORSEO-RESERVE](./design-registry.md#design-cost-dataforseo-reserve)

---

#### NFR-COST-AI-MOCK — Mode développement gratuit

L'utilisateur peut basculer l'app en **mode mock** où tous les appels IA (Claude, Gemini, OpenRouter) sont remplacés par des réponses fixtures locales. Ce mode est essentiel pour développer, tester, faire des démos ou itérer sur l'UI sans consommer un seul crédit. Le basculement se fait via configuration et un toggle navbar — l'utilisateur sait à tout moment dans quel mode il travaille.

**Critères d'acceptation**
- Le mode mock peut être activé via configuration ou via un toggle visible dans l'interface.
- En mode mock, aucun appel à un fournisseur IA payant n'est émis — les réponses viennent de fixtures locales déterministes.
- L'utilisateur perçoit immédiatement le mode actif via un indicateur visuel (badge, icône, libellé) pour éviter toute confusion.

**Statut :** active.

> **En situation.** Le matin, l'utilisateur veut tester un changement d'UI sur le panel IA Lieutenants. Il bascule l'app en mode mock via le toggle de la navbar. Pendant 2 heures, il déclenche 30 fois l'IA pour valider visuellement son refactor — 0 crédit consommé. À midi, il rebascule en mode réel pour un vrai test sur un article client.

→ Conception : [DESIGN-COST-AI-MOCK](./design-registry.md#design-cost-ai-mock)

---

### 9.3 — Intégration et contrats (NFR-INT)

> **Pourquoi cette section ?**
> Le pipeline Cerveau → Moteur → Rédaction passe par des **contrats partagés** : la même donnée traverse plusieurs couches (cocon, article, mot-clé), plusieurs onglets (Discovery → Radar → Capitaine → Lieutenants → Lexique), plusieurs vues (Workflow vs Editor). Pour que l'utilisateur ne perde jamais le fil — son verrou Capitaine reste visible partout, son scan SERP nourrit aussi son Lexique sans qu'il refasse le travail, sa stratégie Cerveau alimente les prompts IA sans qu'il copie-colle — les conventions d'intégration doivent être formalisées et tenues partout dans le code.

#### NFR-INT-MOTEUR-BIMODAL — Mêmes composants en workflow et en libre

Les composants principaux du Moteur (Discovery, Radar, Capitaine, Lieutenants, Lexique) **ne sont pas dupliqués** entre le mode workflow (intégré au pipeline d'un article) et le mode libre (laboratoire de recherche). Un seul composant prend une propriété de mode et s'adapte — l'utilisateur retrouve la même interface, les mêmes interactions, les mêmes scores, simplement avec ou sans persistance/checks selon le contexte.

**Critères d'acceptation**
- Un composant Moteur n'existe qu'**en un seul exemplaire** dans le code, paramétré par le mode d'usage.
- Quand l'utilisateur passe d'un usage workflow à un usage libre, il voit le même rendu avec un comportement adapté (présence/absence des checks, persistance dans l'article ou non).
- Un changement visuel ou comportemental sur un composant Moteur se reflète automatiquement dans les deux modes.

**Statut :** active.

→ Conception : [DESIGN-INT-MOTEUR-BIMODAL](./design-registry.md#design-int-moteur-bimodal)

---

#### NFR-INT-COMPLETED-CHECKS-SSOT — Une seule source pour la progression d'un article

L'avancement d'un article dans son pipeline (étapes Moteur cochées, étapes Cerveau acquises, étapes Rédaction validées) est stocké dans **un seul endroit** : la colonne `completed_checks` de l'article. Tous les composants qui affichent une progression (dots du dashboard, bannières de transition, panneau de finalisation) **lisent ce même endroit** — aucune copie locale dérivée, pas de cache divergent.

**Critères d'acceptation**
- L'état de progression d'un article est unique en base et n'a pas de doublon dans une autre table.
- Tout composant qui affiche une progression reflète exactement ce que dit cette source — pas de fallback différent.
- Quand un check est ajouté ou retiré, **tous** les endroits d'affichage se mettent à jour dans le même tick (cf. `FR-DASH-PROGRESS`).

**Statut :** active.

> **En situation.** L'utilisateur verrouille un Capitaine dans l'onglet Moteur d'un article. Immédiatement, le dot du dashboard pour cet article passe de `○` à `●`, le panneau de finalisation à droite décoche son verrou « Capitaine », la bannière de transition Phase ② → ③ apparaît dans l'en-tête Moteur. Aucun désalignement, parce qu'il n'y a qu'une seule source.

→ Conception : [DESIGN-INT-COMPLETED-CHECKS-SSOT](./design-registry.md#design-int-completed-checks-ssot)

---

#### NFR-INT-CHECKS-NAMESPACE — Préfixes de workflow pour ranger les checks

Chaque check de progression est **préfixé par le workflow auquel il appartient** : Cerveau (`cerveau:*`), Moteur (`moteur:*`), Rédaction (`redaction:*`). Tous coexistent dans la même colonne flat de l'article, mais leur préfixe permet de filtrer/grouper sans ambiguïté. L'utilisateur ne voit jamais ces préfixes — mais ils garantissent que les compteurs de chaque module ne se mélangent pas.

**Critères d'acceptation**
- Tous les checks émis par l'app portent un préfixe `cerveau:`, `moteur:` ou `redaction:`.
- Les constantes correspondantes sont définies dans un fichier partagé et **jamais** hardcodées sous forme de string dans les composants.
- Un composant qui veut compter « les checks Moteur » filtre par préfixe — pas par énumération exhaustive.

**Statut :** active.

→ Conception : [DESIGN-INT-CHECKS-NAMESPACE](./design-registry.md#design-int-checks-namespace)

---

#### NFR-INT-SERP-ONCE — Le SERP est scrapé une seule fois et cascade

Quand l'utilisateur déclenche un scan SERP sur le Capitaine de son article (étape Lieutenants), les **résultats sont stockés une seule fois**. L'onglet Lexique qui doit ensuite analyser le contenu sémantique des concurrents (TF-IDF) **ne refait pas un scrape** — il **réutilise** ce que les Lieutenants ont déjà chargé. Zéro doublon, zéro double facturation.

**Critères d'acceptation**
- Le contenu SERP est scrapé au plus une fois pour un mot-clé donné dans la fenêtre de fraîcheur.
- Le Lexique consomme les données SERP héritées des Lieutenants — il ne déclenche pas un second scraping.
- L'utilisateur voit dans le Lexique des données concordantes avec ce qu'il a validé dans les Lieutenants.

**Statut :** active.

> **En situation.** L'utilisateur valide ses Lieutenants : 10 résultats Google scrapés, scores affichés, contenu archivé. Il passe au Lexique : le panneau s'ouvre avec déjà les termes TF-IDF extraits des **mêmes 10 pages** — il n'attend pas un deuxième scrape, pas d'appel facturé en double.

→ Conception : [DESIGN-INT-SERP-ONCE](./design-registry.md#design-int-serp-once)

---

#### NFR-INT-SCORING-CONFIGURABLE — Seuils de scoring centralisés et explicables

Les seuils de scoring (volume, CPC, difficulté, intention, pertinence) sont **définis dans un module partagé**. Quand l'utilisateur survole un score, un tooltip lui explique ce que veut dire la couleur ou la note — il ne devine pas. Quand le seuil change pour une raison produit, la modification se fait **à un seul endroit** et se propage partout (affichage, tri, filtres).

**Critères d'acceptation**
- Les seuils de scoring ne sont pas dispersés dans plusieurs composants — ils vivent dans un module partagé.
- Tout score affiché à l'utilisateur expose une explication accessible (tooltip ou panneau d'aide).
- Une modification de seuil n'a besoin d'être faite qu'à un seul endroit pour propager dans toute l'app.

**Statut :** active.

→ Conception : [DESIGN-INT-SCORING-CONFIGURABLE](./design-registry.md#design-int-scoring-configurable)

---

#### NFR-INT-PROMPT-AGNOSTIC — Prompts IA réutilisables, contexte injecté à l'extérieur

Les prompts IA (rédaction, brief, suggestion long-tail, analyse pertinence…) sont écrits dans des fichiers `.md` **sans aucune référence directe à la stratégie d'un cocon ou à un article particulier**. Quand l'app appelle l'IA, elle **injecte le contexte au moment de l'appel** via des variables placeholders (`{{strategy_context}}`, `{{painPoint}}`, etc.). Bénéfice : on peut faire évoluer un prompt sans toucher au code qui l'utilise, et la même formule fonctionne sur n'importe quel article.

**Critères d'acceptation**
- Aucun prompt `.md` ne contient une stratégie cocon ou un nom d'article codé en dur.
- Les variables sont systématiquement substituées via le mécanisme central — pas de concaténation de strings manuelle dans le code métier.
- L'utilisateur peut comparer deux articles utilisant le même prompt et voir que la différence vient bien des données (pas du prompt).

**Statut :** active.

→ Conception : [DESIGN-INT-PROMPT-AGNOSTIC](./design-registry.md#design-int-prompt-agnostic)

---

#### NFR-INT-STRATEGY-OPTIONAL — L'IA fonctionne même sans stratégie Cerveau

Quand un article n'a pas encore de stratégie Cerveau renseignée (ou que la painPoint n'a pas été définie), l'IA **reste opérationnelle** — elle reçoit un contexte vide ou un placeholder `(non défini)` pour les champs manquants, mais elle ne crashe pas et ne refuse pas la requête. L'utilisateur peut entrer par n'importe quelle phase du pipeline sans être bloqué par l'absence d'une amont.

**Critères d'acceptation**
- L'utilisateur peut déclencher n'importe quelle action IA sans avoir terminé sa stratégie Cerveau au préalable.
- Quand un champ de contexte est absent, il est remplacé par une valeur neutre lisible (`(non défini)`) plutôt que par `undefined` brut.
- L'utilisateur perçoit éventuellement une dégradation qualitative (IA moins ciblée) mais jamais un blocage technique.

**Statut :** active.

→ Conception : [DESIGN-INT-STRATEGY-OPTIONAL](./design-registry.md#design-int-strategy-optional)

---

#### NFR-INT-ZOD-VALIDATION — Toutes les requêtes API sont validées

Chaque endpoint de l'API valide son payload (entrée et sortie) par un **schéma de validation partagé**. Quand l'utilisateur envoie une donnée mal formée (par exemple un volume non numérique, un identifiant absent), il reçoit immédiatement une erreur **claire et localisée** plutôt qu'un 500 silencieux ou un comportement imprévisible plus tard.

**Critères d'acceptation**
- Toutes les routes API valident leur input.
- Les erreurs de validation renvoient un statut HTTP 400 et un message d'erreur précis (quel champ, quelle valeur attendue).
- Les schémas sont définis dans un répertoire central partagé entre front et back pour garantir la cohérence des contrats.

**Statut :** active.

→ Conception : [DESIGN-INT-ZOD-VALIDATION](./design-registry.md#design-int-zod-validation)

---

#### NFR-INT-API-WRAPPER — Tous les appels au backend passent par un wrapper unique

Côté front, **tous** les appels au backend passent par un wrapper applicatif unifié (`apiGet` / `apiPost` / `apiPut` / `apiPatch` / `apiDelete` / `apiStream`) — jamais d'appel HTTP direct depuis un composant Vue ou un store. Bénéfice utilisateur : les erreurs API sont rendues de manière cohérente (notifications, retries), les coûts sont loggés au même endroit, et le code reste auditable.

**Critères d'acceptation**
- Aucun composant Vue, store ou composable n'utilise un appel HTTP brut pour parler à l'API interne.
- Un script d'audit automatique vérifie ce point et renvoie zéro violation.
- L'utilisateur voit le même style de message d'erreur quel que soit l'endpoint qui a échoué.

**Statut :** active — dette résorbée. **Depuis :** 2026-05-05 (chantier `tech-spec-fetch-to-wrapper-migration`).

→ Conception : [DESIGN-INT-API-WRAPPER](./design-registry.md#design-int-api-wrapper)

---

#### NFR-OBS-EXTERNAL-API-OPT-OUT — Les appels aux APIs tierces sont volontairement hors wrapper

Les appels vers des **APIs tierces** (DataForSEO, Google Search Console, Claude/Anthropic, Gemini, Google Suggest, OAuth…) sont volontairement effectués **hors du wrapper interne**. Pourquoi : ce ne sont pas du trafic interne `/api/*` et n'ont pas les mêmes attentes en termes de retry, logging, codes d'erreur. Chaque occurrence est marquée par un commentaire explicite dans le code (`// External API call — bypass wrapper by design (<provider>)`) pour que l'audit ne les confonde pas avec du code non conforme.

**Critères d'acceptation**
- Chaque appel HTTP vers une API tierce porte le marqueur `External API call` à proximité.
- Le script d'audit reconnaît ce marqueur et n'émet pas de violation pour ces appels.
- Un nouveau provider intégré sans ce marqueur fait remonter un avertissement par l'audit (signal de revue).

**Statut :** active. **Depuis :** 2026-05-05.

→ Conception : [DESIGN-OBS-EXTERNAL-API-OPT-OUT](./design-registry.md#design-obs-external-api-opt-out)

---

### 9.4 — Maintenabilité (NFR-MAIN)

> **Pourquoi cette section ?**
> L'app est maintenue par un développeur solo qui revient sur son code après des semaines ou des mois. Pour que **chaque retour soit rapide** plutôt qu'une fouille archéologique, l'organisation par domaines, la couverture de tests, l'outillage statique et les garde-fous d'architecture sont essentiels. Cette section formalise les attentes structurelles qui font qu'un refactor reste possible six mois plus tard.

#### NFR-MAIN-ORG-STORES — Stores organisés par domaine

Les stores Pinia (état partagé Vue) sont rangés en **5 domaines clairs** : `article`, `keyword`, `strategy`, `external`, `ui`. Un store qui touche à un article vit dans `article/`, un store qui touche à des mots-clés vit dans `keyword/`, etc. Bénéfice de maintenance : un nouvel arrivant (ou l'utilisateur lui-même 6 mois plus tard) trouve un store en regardant son nom de domaine.

**Critères d'acceptation**
- Tout store appartient à un et un seul des 5 domaines.
- Un store qui contient deux responsabilités distinctes est candidat à scission, pas à un domaine fourre-tout.
- Le nom du fichier reflète sa fonction (kebab-case suffixé `.store.ts`).

**Statut :** active.

→ Conception : [DESIGN-MAIN-ORG-STORES](./design-registry.md#design-main-org-stores)

---

#### NFR-MAIN-ORG-COMPOSABLES — Composables organisés par domaine

Les composables Vue (logique réutilisable hors composants) sont rangés en **8 domaines** : `article`, `editor`, `intent`, `keyword`, `lexique`, `moteur`, `seo`, `ui`. Même principe que pour les stores : un composable trouve sa place par son domaine, pas par un dossier `utils/` indéterminé.

**Critères d'acceptation**
- Tout composable appartient à un domaine identifié.
- Un composable qui mélange deux domaines est candidat à scission.
- Le nom du fichier est `useXxx.ts` (camelCase préfixé).

**Statut :** active.

→ Conception : [DESIGN-MAIN-ORG-COMPOSABLES](./design-registry.md#design-main-org-composables)

---

#### NFR-MAIN-ORG-SERVICES — Services backend organisés par domaine

Les services backend (logique métier côté serveur) sont rangés en **7 domaines** : `keyword`, `external`, `intent`, `article`, `strategy`, `infra`, `queries`. Les routes Express délèguent à un service plutôt que de porter la logique métier — qui devient ainsi testable indépendamment de l'API.

**Critères d'acceptation**
- Tout service backend appartient à un domaine.
- Les routes Express n'embarquent que la validation d'input et le formatage de réponse — la logique métier est dans un service.
- Un service nouvellement créé sans domaine clair est rejeté à la revue (signe d'une responsabilité mal cernée).

**Statut :** active.

→ Conception : [DESIGN-MAIN-ORG-SERVICES](./design-registry.md#design-main-org-services)

---

#### NFR-MAIN-TESTS-VITEST — Couverture unitaire Vitest

L'app est couverte par une **suite de tests Vitest** organisée en miroir du code (stores, composables, services, routes, schemas…). Chaque correction de bug ou ajout de feature s'accompagne d'un test qui prouve le comportement attendu. Quand l'utilisateur revient sur le code des mois plus tard, ces tests lui disent ce que le code est censé faire (et ce qu'il ne doit surtout pas casser).

**Critères d'acceptation**
- Tests miroir dans `tests/unit/` (mêmes sous-dossiers que `src/` et `server/`).
- `npm run test:unit` exécute la suite complète et doit rester vert avant chaque merge.
- Un script de diff (`npm run test:check`) compare le run actuel à une baseline pour détecter les régressions introduites par un chantier.

**Statut :** active.

→ Conception : [DESIGN-MAIN-TESTS-VITEST](./design-registry.md#design-main-tests-vitest)

---

#### NFR-MAIN-TESTS-PLAYWRIGHT — Couverture bout-en-bout Playwright

Les parcours sensibles de l'utilisateur (navigation cocon → article, verrou Capitaine, génération article, validation Lexique) sont couverts par des **tests Playwright** qui pilotent un vrai navigateur. Bénéfice : un bug d'intégration entre store / route / DOM qui passe à travers les tests unitaires est attrapé par les tests E2E avant publication.

**Critères d'acceptation**
- Tests organisés dans `tests/browser-e2e/`.
- `npm run test:browser` exécute la suite Playwright en parallèle des unit tests.
- Les parcours majeurs Cerveau / Moteur / Rédaction sont chacun couverts par au moins un scénario E2E.

**Statut :** active.

→ Conception : [DESIGN-MAIN-TESTS-PLAYWRIGHT](./design-registry.md#design-main-tests-playwright)

---

#### NFR-MAIN-TOOLING — Outillage qualité automatisé

L'app est outillée par une **suite de vérifications statiques** qui tournent automatiquement (pre-commit + manuelle) : linter de syntaxe (oxlint + eslint), formatteur (prettier), détecteur de code mort (knip), détecteur de cycles d'imports (madge), validateur d'architecture (dependency-cruiser), et hooks Git (husky + lint-staged). Bénéfice : la majorité des régressions de qualité sont attrapées avant même un push.

**Critères d'acceptation**
- Chaque outil est invoqué via un script `npm run` dédié et a une commande agrégée (`npm run check:health`).
- Un commit qui introduit du code mort, un cycle d'imports ou une violation d'architecture est rejeté ou signalé.
- L'utilisateur peut lancer manuellement chaque check pour audit.

**Statut :** active.

→ Conception : [DESIGN-MAIN-TOOLING](./design-registry.md#design-main-tooling)

---

#### NFR-MAIN-CHECK-HEALTH — Commande unique « tout va bien »

Une seule commande, `npm run check:health`, **agrège** lint + type-check + cycles + dead code + architecture. C'est le test de santé global que l'utilisateur lance avant de merger un chantier. Si tout est vert, il sait que la fondation reste saine.

**Critères d'acceptation**
- La commande retourne un code de sortie 0 si tout est vert, ≠ 0 sinon.
- L'enchaînement des checks est explicite (pas de check caché).
- Un échec est rendu lisible avec un message qui pointe le check fautif.

**Statut :** active.

→ Conception : [DESIGN-MAIN-CHECK-HEALTH](./design-registry.md#design-main-check-health)

---

#### NFR-MAIN-NO-SCORE-FALLBACK — Interdire les fallbacks silencieux sur scores

Une règle de lint **interdit le pattern `?? 0` sur une variable contenant « Score »** (ex : `volumeScore ?? 0`, `card.relevanceScore ?? 0`). Pourquoi : un fallback silencieux casse la cohérence affichage/tri (cf. règle d'or §2.0 CLAUDE.md) — la card affiche `—` mais le tri traite la valeur comme `0`, ce qui produit un ordre incorrect. Le développeur doit utiliser une comparaison neutre (`compareScores` du module partagé) ou laisser la valeur `null` explicitement.

**Critères d'acceptation**
- Un commit qui introduit un fallback `?? 0` sur un identifiant contenant `Score` (ou propriété `*Score`) est rejeté par le linter.
- L'erreur du linter pointe vers les helpers de comparaison à utiliser à la place.
- Les vrais zéros (calculs internes du module de scoring) sont autorisés via un override de scope.

**Statut :** active.

> **En situation.** Un développeur écrit `const score = card.relevanceScore ?? 0; cards.sort((a, b) => b.score - a.score)`. Le linter remonte l'erreur immédiatement : « Fallback silencieux interdit sur un score. Utiliser compareScores/averageScores ou laisser null ». Il corrige avant même de commit. La régression « tri qui affiche pareil que la liste mais classe différemment » est évitée.

→ Conception : [DESIGN-MAIN-NO-SCORE-FALLBACK](./design-registry.md#design-main-no-score-fallback)

---

#### NFR-MAIN-FILE-SIZE — Cible de taille de fichier raisonnable

Un fichier source vise **moins de 400 lignes**. Au-delà, il devient candidat au découpage par responsabilité. C'est une cible, pas un mur : certains composants Vue lourds dépassent cette borne et sont explicitement listés comme dette technique à traiter. Bénéfice : un fichier court reste navigable et reviewable, ce qui réduit le coût d'un refactor.

**Critères d'acceptation**
- Tout nouveau fichier vise sous 400 lignes.
- Tout fichier > 1000 lignes est listé en dette technique avec un plan de découpage à venir.
- La dette historique connue (composants Moteur de pilotage cross-onglet, BrainPhase) est consignée et fait l'objet de chantiers ciblés.

**Statut :** prescrit, partiellement violé. Au 2026-05-12, plusieurs fichiers dépassent largement la cible — notamment `CaptainPanel.vue` (1509 L) qui consolide l'orchestration onglet Capitaine ; `data.service.ts` (1052 L) côté serveur ; `keywords.routes.ts` (912 L) ; `dynamic-block-drop.ts` (901 L). Les fichiers historiquement cités (`CaptainValidation.vue`, `KeywordDiscoveryTab.vue`) ont depuis été refactorisés/supprimés (cf. DRIFT-017).
**Source :** tech-spec-stabilisation-codebase (Sprints S4-S5).

→ Conception : [DESIGN-MAIN-FILE-SIZE](./design-registry.md#design-main-file-size)

---

#### NFR-MAIN-NO-CYCLES — Pas de cycles d'imports

L'arbre des imports de l'app est **acyclique** : un module A qui importe B ne peut pas être importé en retour par B (même indirectement). Bénéfice : la lecture du code reste linéaire — quand l'utilisateur explore une responsabilité, il navigue depuis le point d'entrée vers les feuilles, sans tourner en rond ni se perdre dans des dépendances circulaires.

**Critères d'acceptation**
- `npm run check:cycles` retourne vert (zéro cycle détecté).
- Un commit qui introduit un cycle est rejeté.

**Statut :** active, vérifié vert.

→ Conception : [DESIGN-MAIN-NO-CYCLES](./design-registry.md#design-main-no-cycles)

---

### 9.5 — Sécurité et robustesse (NFR-SEC)

> **Pourquoi cette section ?**
> L'app est utilisée en local par un consultant solo, mais elle touche à des **clés d'API qui paient** (DataForSEO, Anthropic, Google) et à un **token OAuth** Google Search Console. La sécurité n'est pas un sujet d'enterprise ici, mais l'utilisateur attend des garanties simples : pas de fuite de clés par accident, pas de requête malveillante qui passerait, pas de tentative d'injection de prompt qui détournerait l'IA.

#### NFR-SEC-CORS — Accès limité à la machine locale

Le serveur backend **n'accepte les requêtes que depuis `localhost`** (la machine de l'utilisateur). Une autre machine sur le réseau, un navigateur ouvert sur une autre origine, un script externe ne peut pas appeler l'API et déclencher des opérations payantes au nom de l'utilisateur.

**Critères d'acceptation**
- Une requête provenant d'une origine autre que `localhost` reçoit un refus CORS standard.
- L'utilisateur n'a pas à configurer manuellement cette protection — elle est active dès le démarrage.

**Statut :** active.

→ Conception : [DESIGN-SEC-CORS](./design-registry.md#design-sec-cors)

---

#### NFR-SEC-ZOD-INPUT — Toute requête API est validée à l'entrée

Avant qu'une requête API atteigne la logique métier, son contenu est **validé contre un schéma** (champs obligatoires présents, types corrects, valeurs dans les bornes). Une donnée mal formée est rejetée avec un message explicite à l'entrée, plutôt que de propager un bug plus profond dans le code (et potentiellement déclencher un appel payant sur des données erronées).

**Critères d'acceptation**
- Toute route API valide son payload d'entrée contre un schéma partagé front+back.
- Un payload non conforme reçoit un statut HTTP 400 avec un message qui précise le champ et le problème.
- Aucune requête ne se transforme en appel à une API externe payante avant validation.

**Statut :** active.

→ Conception : [DESIGN-SEC-ZOD-INPUT](./design-registry.md#design-sec-zod-input)

---

#### NFR-SEC-PROMPT-INJECTION — Protection contre l'injection de prompt IA

Le contenu utilisateur injecté dans un prompt IA (titre d'article, point de douleur, mot-clé saisi librement) est **filtré pour neutraliser les tentatives de détournement** : caractères de contrôle qui pourraient marquer une fin de prompt, instructions cachées qui demanderaient à l'IA d'ignorer ses consignes système, etc. L'utilisateur garde toute liberté éditoriale, mais l'app empêche qu'un copier-coller malheureux (ou malicieux dans un cocon partagé) ne casse un prompt système.

**Critères d'acceptation**
- Les variables substituées dans les prompts (`{{strategy_context}}`, `{{painPoint}}`, `{{articleTitle}}`...) passent par un échappement systématique.
- Un texte utilisateur qui contient des séquences de contrôle est rendu inoffensif sans avertir l'utilisateur (transparent).

**Statut :** active.

→ Conception : [DESIGN-SEC-PROMPT-INJECTION](./design-registry.md#design-sec-prompt-injection)

---

#### NFR-SEC-ENV-VARS — Secrets dans `.env`, jamais commités

Les **clés d'API payantes et les secrets** (Anthropic, DataForSEO, Google OAuth Client Secret…) vivent dans un fichier `.env` local, **exclu du suivi Git**. L'utilisateur ne peut pas accidentellement les pousser sur un dépôt public en commitant son code.

**Critères d'acceptation**
- Le fichier `.env` est listé dans `.gitignore` à la racine du projet.
- Un fichier `.env.example` documente les variables attendues sans contenir de valeur réelle.
- Les services backend lisent leurs clés exclusivement depuis l'environnement, jamais depuis une constante codée en dur.

**Statut :** active.

→ Conception : [DESIGN-SEC-ENV-VARS](./design-registry.md#design-sec-env-vars)

---

#### NFR-SEC-GSC-TOKENS — Token OAuth Google Search Console stocké localement

Quand l'utilisateur connecte son compte Google Search Console (pour récupérer ses vraies données de trafic), le **token OAuth est stocké localement** dans un fichier dédié (chemin configurable). Il n'est jamais envoyé à un tiers, jamais exposé dans une URL, jamais loggué. L'utilisateur peut le révoquer à tout moment depuis Google.

**Critères d'acceptation**
- Le token GSC est stocké dans un fichier local à un chemin configurable (variable d'env).
- L'utilisateur peut révoquer la connexion depuis son compte Google sans toucher au fichier.
- Le token n'apparaît dans aucun log applicatif (filtres en place côté logger).

**Statut :** active — *amélioration possible :* chiffrer le fichier (non critique en local single-user, mais bon à savoir).

→ Conception : [DESIGN-SEC-GSC-TOKENS](./design-registry.md#design-sec-gsc-tokens)

---

> **Note de sortie.** Deux anciennes NFRs de cette section décrivent des **règles d'architecture interne** (interdiction d'import `src/` → `server/`, version Node minimale) plutôt que des garanties perçues par l'utilisateur. Elles sont **déplacées dans `_bmad-output/planning-artifacts/architecture.md`** (section conventions de code et compatibilité runtime).

---

### 9.6 — Observabilité (NFR-OBS)

> **Pourquoi cette section ?**
> Quand quelque chose tourne mal — un appel IA qui rate, un endpoint qui rame, un coût qui dépasse les bornes — l'utilisateur a besoin de **comprendre rapidement où le problème se situe**. Cette section formalise les signaux que l'app expose en continu (logs, métriques de santé, journal d'activité, codes d'erreur lisibles) pour qu'aucun dysfonctionnement ne reste silencieux.

#### NFR-OBS-LOGGER — Logs structurés avec 4 niveaux de gravité

Le serveur écrit ses logs via un **logger central** avec quatre niveaux clairs : DEBUG (détails de mise au point), INFO (événements normaux), WARN (anomalie tolérée), ERROR (échec à investiguer). Chaque log porte un horodatage et un module d'origine. L'utilisateur peut filtrer par niveau pour voir uniquement ce qui l'intéresse.

**Critères d'acceptation**
- Tout log applicatif passe par le logger central (pas de `console.log` brut en production).
- Le niveau de log est configurable globalement (debug en dev, info en prod).
- Le format est cohérent (timestamp + niveau + module + message) pour faciliter le grep.

**Statut :** active.

→ Conception : [DESIGN-OBS-LOGGER](./design-registry.md#design-obs-logger)

---

#### NFR-OBS-CONFIG — Verbosité des logs ajustable par module

L'utilisateur peut **régler la verbosité des logs par domaine** (par exemple, mettre `keyword/` en DEBUG pendant qu'il étudie un bug de scoring, mais laisser le reste en INFO pour ne pas se noyer). La configuration est centralisée dans un fichier dédié — pas besoin de modifier le code pour activer le debug.

**Critères d'acceptation**
- Un fichier de configuration des logs permet de définir le niveau par module.
- Une modification de la config est prise en compte sans redémarrer le serveur (ou avec un redémarrage léger documenté).
- La config par défaut est raisonnable pour un développement quotidien (INFO partout, sauf modules très bavards ramenés à WARN).

**Statut :** active.

→ Conception : [DESIGN-OBS-CONFIG](./design-registry.md#design-obs-config)

---

#### NFR-OBS-HEALTH — Endpoint de santé du backend

Un endpoint dédié `GET /api/health` répond instantanément avec un état de santé du serveur. L'utilisateur (ou un outil de monitoring local) peut vérifier en un appel si le backend tourne et répond, sans déclencher d'effet de bord ni d'appel à une API externe.

**Critères d'acceptation**
- L'endpoint est accessible sans authentification et sans payload.
- Une réponse 200 OK confirme que le serveur reçoit et traite les requêtes.
- Aucun appel externe payant n'est déclenché par ce check.

**Statut :** active.

→ Conception : [DESIGN-OBS-HEALTH](./design-registry.md#design-obs-health)

---

#### NFR-OBS-DB-CHECK — Vérification de la base au démarrage

Au démarrage du serveur, l'app **teste sa connexion PostgreSQL** avant de commencer à servir des requêtes. Si la base est inaccessible (config erronée, service down), l'app le signale immédiatement avec un message clair plutôt que de laisser l'utilisateur découvrir le problème au premier clic.

**Critères d'acceptation**
- Le démarrage du serveur déclenche un ping PostgreSQL.
- Un échec de ping est loggué avec un message qui pointe explicitement vers la config DB.
- Le serveur peut soit s'arrêter (mode strict), soit continuer en signalant que la DB est down — comportement documenté.

**Statut :** active.

→ Conception : [DESIGN-OBS-DB-CHECK](./design-registry.md#design-obs-db-check)

---

#### NFR-OBS-ERROR-HANDLER — Gestion centralisée des erreurs API

Toutes les erreurs qui remontent depuis une route API passent par un **middleware central** qui formate la réponse (statut HTTP, code d'erreur lisible, message utilisateur), loggue le détail technique côté serveur, et empêche les fuites de stack trace côté client. L'utilisateur voit un message cohérent quel que soit l'endpoint qui a échoué.

**Critères d'acceptation**
- Toute erreur non rattrapée dans une route est interceptée par le middleware central.
- La réponse client contient un statut HTTP cohérent, un code d'erreur applicatif et un message lisible.
- Aucune stack trace ne fuit dans la réponse client.

**Statut :** active.

→ Conception : [DESIGN-OBS-ERROR-HANDLER](./design-registry.md#design-obs-error-handler)

---

#### NFR-OBS-COST-LOG — Journal d'activité visible dans l'UI

L'app expose un **journal d'activité dans l'interface** qui agrège : les appels API payants (DataForSEO, Claude…) avec leur coût estimé, les opérations DB significatives, les messages d'avertissement. L'utilisateur garde ainsi un œil sur ce que l'app fait en arrière-plan, en temps réel.

**Critères d'acceptation**
- Le journal d'activité affiche en continu les événements API (provider, endpoint, durée, coût estimé) et opérations DB notables.
- L'utilisateur peut filtrer ou nettoyer le journal pendant sa session.
- Le journal ne contient pas de données sensibles (pas de payloads avec contenus confidentiels en clair).

**Statut :** active.

→ Conception : [DESIGN-OBS-COST-LOG](./design-registry.md#design-obs-cost-log)

---

#### NFR-OBS-DBOPS-TRACK — Compteur d'opérations DB par requête

Chaque réponse API embarque un **compteur des opérations PostgreSQL** effectuées pour la traiter (nombre de SELECT, INSERT, UPDATE, DELETE). L'utilisateur (ou un outil d'audit) peut détecter une route qui ferait soudainement 50 queries au lieu de 2 — signal d'une dégradation à investiguer.

**Critères d'acceptation**
- Toute réponse API expose un compteur d'opérations DB.
- Le journal d'activité agrège ce compteur dans son affichage.
- Un seuil de surveillance peut être configuré pour signaler les routes qui dépassent un nombre raisonnable d'opérations.

**Statut :** active.

→ Conception : [DESIGN-OBS-DBOPS-TRACK](./design-registry.md#design-obs-dbops-track)

---

#### NFR-OBS-KNOWN-ERRORS — Codes d'erreur applicatifs lisibles dans l'UI

Quand une erreur a une cause connue (budget DataForSEO dépassé, provider IA saturé, mot-clé vide, etc.), l'app la rend visible dans l'UI avec un **code d'erreur dédié et un message clair**. L'utilisateur n'a pas à deviner ce qui s'est passé en lisant un message technique cryptique — il voit immédiatement la cause et ce qu'il peut faire.

**Critères d'acceptation**
- Un catalogue de codes d'erreur connus est partagé entre backend et frontend.
- Le wrapper API frontend reconnaît ces codes et les affiche avec leur message utilisateur.
- Une erreur inconnue retombe sur un message générique « Erreur technique — voir le journal d'activité ».

**Statut :** active.

→ Conception : [DESIGN-OBS-KNOWN-ERRORS](./design-registry.md#design-obs-known-errors)

---

### 9.7 — Compatibilité runtime

> **Note de sortie.** La liste des versions exactes de chaque dépendance technique (Node, Vue, Pinia, TipTap, Express, PostgreSQL, Anthropic SDK, etc.) **n'est pas une exigence produit** au sens où l'utilisateur la perçoit. Elle vit désormais dans [`_bmad-output/planning-artifacts/architecture.md`](./architecture.md) (section « Stack et compatibilité runtime »).
>
> Si une version cible change (ex. monter Node de 20 à 22, basculer Vue 3.5 → 3.6), c'est l'architecture.md qui est la source de vérité ; le PRD ne porte plus ce détail.

---

### 9.8 — Configuration et environnement

> **Note de sortie.** Le détail des **variables d'environnement** (`AI_PROVIDER`, `CLAUDE_MODEL`, `DATAFORSEO_*`, `GOOGLE_CLIENT_ID`, `PORT`, `VITE_PORT`, etc.) est documenté dans [`_env.example`](../../.env.example) à la racine du projet.
>
> Les **comportements** que ces variables pilotent (basculement mock/réel, plafond budget DataForSEO, configuration du délai inter-section, ports applicatifs figés) sont déjà couverts par les NFRs et FRs métier ailleurs dans ce PRD :
> - Mode bac à sable DataForSEO → `FR-EXT-DATAFORSEO-SANDBOX`
> - Budget DataForSEO configurable → `NFR-COST-DATAFORSEO-BUDGET`
> - Délai inter-section → `NFR-PERF-INTER-SECTION-DELAY`
> - Mode développement gratuit (IA mock) → `NFR-COST-AI-MOCK`
> - Bascule provider IA / OAuth GSC → `FR-EXT-AI-MULTI-PROVIDER`, `FR-EXT-GSC-OAUTH`
> - Ports applicatifs figés (`3400` back / `5400` front) → règle d'infrastructure documentée dans [`architecture.md`](./architecture.md).
>
> Ce PRD ne duplique plus la liste des variables d'env — l'utilisateur les configure via `.env` en suivant `.env.example`.

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

### 9.9 — Expérience utilisateur (NFR-UX)

> **Pourquoi cette section ?**
> Au-delà des temps de réponse (§9.1) et des coûts maîtrisés (§9.2), l'utilisateur attend une **stabilité de l'interface** qui rend l'app prévisible. Les zones d'action ne doivent pas apparaître et disparaître au fil des clics, les boutons doivent rester à leur place, les coûts visuels (changements de mise en page) sont à éviter. Cette section formalise l'invariant UX qui sous-tend toute l'app.

#### NFR-UX-STABLE-SKELETON — Squelette d'interface stable, états visuels plutôt qu'apparitions

Les zones d'action significatives d'un écran — panneaux d'action, boutons d'action principaux, sections de résultats, coques IA — sont **rendues dans le DOM dès l'ouverture de l'écran**, pas progressivement au fil des actions utilisateur. La désactivation, l'invitation à agir, l'état de chargement et les erreurs sont **exprimés visuellement** sur ce même squelette (grisé, bouton désactivé, spinner, bandeau d'erreur, message d'invitation explicite) — sans insérer ou supprimer du DOM.

Bénéfice pour l'utilisateur : sa carte mentale de l'écran reste stable, il ne se demande jamais « où est passé le bouton ? », il n'y a pas de saut de mise en page quand une donnée arrive, et les actions disponibles sont visibles dès le premier rendu (« cette zone existe, elle est juste pas encore activable »).

**Critères d'acceptation**
- Les coques IA des onglets Moteur (Discovery, Radar, Capitaine, Lieutenants, Lexique) sont rendues dès le mount, même quand aucune action n'a été déclenchée.
- Les boutons d'action majeurs (« Envoyer au Radar », « Verrouiller le Capitaine », « Lancer la rédaction ») sont présents dès le mount avec un état visuel adapté (actif / désactivé / chargement).
- Aucun bouton ni section significative n'utilise une apparition conditionnée à un état transitoire de l'utilisateur — la zone existe, elle est juste désactivée si la précondition n'est pas remplie.
- Quand une zone est désactivée, un message d'invitation explicite est visible (« Lance d'abord X pour activer Y »).
- Les zones lourdes en performance (par exemple un arbre PAA d'une carte non dépliée) peuvent rester en `v-if` justifié — mais avec un placeholder de même silhouette pour préserver la mise en page.

> **En situation.** L'utilisateur ouvre l'onglet Discovery sur un nouvel article. Au lieu d'un écran vide qui attendrait son premier clic, il voit immédiatement la structure complète : section sources (vide avec compteur `(0)`), coque IA d'analyse (grisée avec message « Lance d'abord une découverte de mots-clés »), bouton « Envoyer au Radar » (désactivé avec libellé explicite). Il sait d'un coup d'œil ce que l'écran fait sans avoir à explorer. À mesure qu'il agit, les zones s'activent visuellement sans que rien ne bouge.

→ Conception : [DESIGN-UX-STABLE-SKELETON](./design-registry.md#design-ux-stable-skeleton)

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
| `keyword_metrics` | keyword PK, search_volume, kd, cpc, paa_questions JSONB, intent, autocomplete[], serp_raw_json, local_comparison, content_gap_analysis, fetched_at | Cache cross-article permanent (porte aussi le cache PAA hiérarchique via `paa_questions`) |
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
3. **Fichiers > 1000 lignes au 2026-05-12** : `src/components/moteur/CaptainPanel.vue` (1509 L) et `server/services/infra/data.service.ts` (1052 L) (NFR-MAIN-FILE-SIZE violé). Les anciens offenders historiquement cités (`CaptainValidation.vue`, `KeywordDiscoveryTab.vue`, `BrainPhase.vue`) ont depuis été refactorisés ou supprimés — cf. DRIFT-021.
4. **NFR-PERF-* non monitorées** : aucun middleware timing, pas d'instrumentation cache hit rate.
5. **Tokens GSC en plain** : pas de chiffrement (acceptable en local single-user mais à noter).

---

**Fin du PRD.**
