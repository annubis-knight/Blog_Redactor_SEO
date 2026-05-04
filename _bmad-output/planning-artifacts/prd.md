---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
  - '_bmad-output/implementation-artifacts/tech-spec-score-kpi-pertinence-separation.md'
  - '_bmad-output/implementation-artifacts/tech-spec-radar-long-tail-suggestions.md'
  - '_bmad-output/implementation-artifacts/tech-spec-capitaine-radar-list-sidepanel.md'
  - '_bmad-output/implementation-artifacts/tech-spec-stabilisation-codebase.md'
  - '_bmad-output/implementation-artifacts/sprints-pain-point-relevance-evolution.md'
workflowType: 'prd'
completedAt: '2026-03-31'
lastUpdated: '2026-05-04'
updateReason: 'Refonte complète post-audit : préfixage des FR/NFR par domaine (FR-DIS, FR-RAD, FR-CAP, FR-LIE, FR-LEX, FR-FIN, FR-MOT, FR-CER, FR-RED, FR-LAB, FR-EXP, FR-DASH, FR-EXT, FR-INFRA, NFR-PERF, NFR-COST, NFR-INT, NFR-MAIN, NFR-SEC, NFR-OBS, NFR-RT, NFR-CFG), versioning par exigence (statut + date + remplaçant), rattrapage des 4 sprints livrés post 2026-04-24 (score-pertinence, longue traîne radar, painPoint, stabilisation codebase) et documentation des capacités jamais formalisées (GSC OAuth, cost-guard DataForSEO, content gap, micro-context, internal linking, batch creation, theme config, PAA cache, multi-provider IA, embeddings HuggingFace, contextual actions). Suppression de la numérotation séquentielle FR1-FR60 historique, remplacée par identifiants stables. Verdict Capitaine devenu informatif (FR-CAP-LOCK supersede FR-CAP-VERDICT-GATING).'
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

2. **Sophistication invisible** — Cache à 3 niveaux (`api_cache` TTL, `keyword_metrics` cross-article permanent, `paa_cache` hiérarchique). Cost-guard sliding-window sur DataForSEO. Multi-provider IA (Claude / Gemini / OpenRouter / Mock) avec fallback automatique 429/503. Progression cochée silencieusement via `articles.completed_checks` TEXT[].

3. **Outil taillé sur mesure** — Workflow consultant : Cerveau → Moteur → Rédaction. Hiérarchie Silos / Cocons / Articles avec niveaux Pilier / Intermédiaire / Spécifique. Injection automatique du contexte stratégique et du painPoint dans **6+ prompts IA** via `loadPrompt()` avec variables `{{strategy_context}}` et `{{painPoint}}`.

4. **Récupération longue-traîne** — Le Radar génère des keywords courts (~20 candidats) puis dérive jusqu'à 10 suggestions longue-traîne avec score de préférence 1-10, persistées en JSONB pour idempotence à la régénération.

5. **Observabilité intégrée** — Logger central configurable (`logs.config.ts`), activity log front (cost-log store), DbOps tracking, known error codes surfacés en UI, health check, job de purge horaire `api_cache`.

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

- **Zéro appel API redondant** — Cache à 3 niveaux : `api_cache` (TTL par type), `keyword_metrics` (cross-article permanent), `paa_cache` (90 jours, hiérarchique).
- **Persistance PostgreSQL** — Articles, keywords, progress, strategies, cache en base. Purge horaire `api_cache` expirées.
- **Réactivité** — Streaming SSE pour appels longs (Claude). Cost-guard DataForSEO en sliding-window pour bloquer les dépassements budget avant l'appel.
- **Observabilité** — Activity log front + logger central back + health check.

### Indicateurs mesurables

| Indicateur | Cible |
|---|---|
| Appels API redondants | 0 (cache `api_cache` + `keyword_metrics` + `paa_cache`) |
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
2. **Cache à 3 niveaux** → `api_cache` + `keyword_metrics` + `paa_cache`. Aucun re-call API.
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

- `api_cache` (TTL par type, purge horaire) pour les appels d'API.
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
- Backend : Express 5.2, port 3005, CORS localhost only
- Communication : REST API + SSE streaming (Claude tokens, génération article par section, panels IA)
- Validation : Zod 4 schémas partagés front/back (`shared/schemas/`)
- Data : PostgreSQL (pg 8.20) — articles, keywords, cocoons, strategies, api_cache, keyword_metrics, article_explorations, captain_explorations, radar_explorations, theme_config, internal_links…
- APIs externes : Anthropic Claude, Google GenAI, OpenRouter, HuggingFace Transformers (embeddings), DataForSEO, Google Autocomplete, Google Search Console

**Contraintes brownfield :**
- Réutiliser les 100+ composants existants — Labo réutilise les composants Moteur en mode `libre`.
- Store `article-progress` (dans `stores/article/`) exploite `articles.completed_checks` TEXT[].
- Cache `api_cache` + `keyword_metrics` + `paa_cache`.
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

#### FR-MOT-ARTICLE-SELECTION
L'utilisateur doit sélectionner un article avant d'utiliser les actions du Moteur en mode workflow.

#### FR-MOT-MODE-BIMODAL
Composants Moteur acceptent prop `mode: 'workflow' | 'libre'`. Mode workflow = article sélectionné, seuils contextuels par niveau, checks émis. Mode libre = article virtuel id=0, seuils par défaut Intermédiaire (modifiables), pas de checks.
**Source :** PRD initial — confirmé dans `CaptainValidation.vue`, `LieutenantsSelection.vue`, `LexiqueExtraction.vue` (`v-if="mode === 'workflow'"`).

#### FR-MOT-CHECKS
5 checks Moteur écrits automatiquement dans `articles.completed_checks` : `moteur:discovery_done`, `moteur:radar_done`, `moteur:capitaine_locked`, `moteur:lieutenants_locked`, `moteur:lexique_validated`.
**Source :** `shared/constants/workflow-checks.constants.ts:14-27`.

#### FR-MOT-CHECKS-CONSTANTS
Tout `emit('check-completed', …)` doit utiliser une constante de `shared/constants/workflow-checks.constants.ts` (jamais hardcoder la string). **Statut :** prescrit, partiellement violé (plusieurs composants hardcodent encore la string — dette à résorber).

#### FR-MOT-PHASE-TRANSITION
Bandeau `PhaseTransitionBanner` apparaît dès qu'une phase est terminée et propose de passer à la suivante. L'utilisateur peut l'ignorer — pas de redirection automatique.

#### FR-MOT-NO-AUTO-ACTION
Aucune action automatique au changement d'onglet — l'utilisateur déclenche tout manuellement.

#### FR-MOT-RAW-KPIS
Les KPIs bruts sont TOUJOURS visibles — libre arbitre > algorithme.

#### FR-MOT-CACHE-CASCADE
Avant tout appel externe : consultation de `keyword_metrics` (cross-article) puis `api_cache` (TTL). Pattern unifié `getOrFetch<T>(cacheType, key, ttlMs, fetcher)`.
**Source :** `server/db/cache-helpers.ts`, `server/services/keyword/keyword-metrics.service.ts`.

#### FR-MOT-PAINPOINT-INJECTION
Le painPoint de l'article (`articles.pain_point`, fallback `(non défini)`) est injecté via `{{painPoint}}` dans les prompts Moteur : `capitaine-ai-panel.md`, `propose-lieutenants.md`, `lieutenants-hn-structure.md`, `lexique-suggest.md`, `lexique-analysis-upfront.md`, `lexique-ai-panel.md`.
**Statut :** active. **Depuis :** 2026-04-28. **Source :** sprints-pain-point-relevance-evolution (S1-S2).

#### FR-MOT-STRATEGY-INJECTION
Le contexte stratégique du cocon est injecté via `{{strategy_context}}` dans les prompts Moteur listés dans FR-MOT-PAINPOINT-INJECTION. Si stratégie absente, injection à chaîne vide.
**Source :** PRD initial — `server/utils/prompt-loader.ts` (buildCocoonStrategyBlock).

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
Au reload, longues traînes + état coché restaurés. Le bouton « Suggérer » devient « Régénérer » et utilise le cache idempotent (`api_cache` TTL 7 jours).
**Statut :** active. **Depuis :** 2026-05-03.

#### FR-RAD-SEND-CAPTAIN
Bouton « Envoyer au Capitaine » agrège dédupliqué cards racines cochées ∪ longues traînes cochées. Colonne `source TEXT NULL` ajoutée à `captain_explorations` pour tracer l'origine (`radar` / `longtail` / `manual`).
**Statut :** active. **Depuis :** 2026-05-03. **Source :** tech-spec-radar-long-tail-suggestions.

#### FR-RAD-PERSIST
Persistance article-scoped via table `radar_explorations(article_id PK, JSONB scan_result)`. Routes CRUD : GET full / GET status (lightweight) / POST upsert / DELETE clear.
**Source :** `server/routes/radar-exploration.routes.ts`.

#### FR-RAD-CHECK
Émet `moteur:radar_done` après un scan réussi.

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

Cache `api_cache` (TTL variable par endpoint).
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
Endpoint `POST /api/gsc/performance`. Dates + dimensions (query, page, device, country) → rows `{ clicks, impressions, ctr, position }`. Cache 24h dans `api_cache`.

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
Table `api_cache(cache_key TEXT, cache_type TEXT, data JSONB, expires_at TIMESTAMPTZ, cached_at)`. Types : `paa`, `serp`, `radar`, `discovery`, `autocomplete`, `intent`, `longtail`, etc. TTL par type. Opérations `getCached(type, key)` (filtre `expires_at > NOW()`), `setCached(type, key, data, ttlMs)` (UPSERT ON CONFLICT).
**Source :** `server/db/cache-helpers.ts:13-39`.

#### FR-INFRA-API-CACHE-PURGE
Job de purge horaire (`setInterval` 60 × 60 × 1000ms) dans `server/index.ts:115-125` : `DELETE FROM api_cache WHERE expires_at < NOW()`.
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
Wrapper frontend `src/services/api.service.ts` : `apiGet<T>(path, options?)`, `apiPost<T>(path, body, options?)`, `apiPut<T>(path, body)`, `apiDelete<T>(path)`. Logging debug + error handling centralisé. Injection `pushUsageIfPresent` (cost-log) et `pushDbOpsIfPresent`. Surface des `KNOWN_ERROR_CODES`.
**Statut :** active — **dette identifiée :** ~20 `fetch()` directs résiduels à migrer.
**Source :** `src/services/api.service.ts:94-135`.

#### FR-INFRA-ZOD-SHARED
Schémas Zod partagés front/back dans `shared/schemas/` (~41 fichiers `.schema.ts`). Validation `safeParse` côté routes Express.

#### FR-INFRA-PROMPT-LOADER
`loadPrompt(filename, variables?, options?)` lit depuis `server/prompts/`, substitue `{{variable}}` et blocs conditionnels `{{#conditional}}…{{/conditional}}`. Helpers : `buildStrategyContext`, `buildKeywordContext`, `buildMicroContextBlock`, `buildCocoonStrategyBlock`, `buildThemeContextBlock`. **Hardening :** `escapePromptContent()` contre prompt injection.
**Source :** `server/utils/prompt-loader.ts:32-60`.

#### FR-INFRA-WORKFLOW-CHECKS-CONSTANTS
Toutes les strings de checks dans `shared/constants/workflow-checks.constants.ts` (`MOTEUR_*`, `CERVEAU_*`, `REDACTION_*`). Stockage dans `articles.completed_checks` TEXT[] unique.
**Source :** `shared/constants/workflow-checks.constants.ts:1-62`.

#### FR-INFRA-SCORE-MODULE
Module `shared/score/` unifié : types, format, compare, aggregate. Export via `shared/score/index.ts` uniquement (règle dependency-cruiser `score-internal-only-via-index`). Type `Score = number | null` explicite.
**Statut :** active. **Depuis :** 2026-05-03. **Source :** tech-spec-stabilisation-codebase (Sprint 3).

#### FR-INFRA-NO-SCORE-FALLBACK
Règle ESLint `no-restricted-syntax` interdit `?? 0`, `?? 50` etc. sur variables `*Score*`, `*Density*`, `*Volume*`. Force la gestion explicite de `null`.
**Statut :** active. **Depuis :** 2026-05-03. **Source :** `eslint.config.ts:49-79` — tech-spec-stabilisation-codebase.

#### FR-INFRA-CHECK-HEALTH
Script `npm run check:health` agrège lint + type-check + cycles + dead-code + arch.
**Statut :** active. **Depuis :** 2026-05-03. **Source :** `package.json:24` — tech-spec-stabilisation-codebase.

#### FR-INFRA-DEPENDENCY-CRUISER
Règles d'architecture dans `.dependency-cruiser.cjs` :
- `no-server-in-src` : pas d'import `server/` depuis `src/` (sauf via `shared/`).
- `score-internal-only-via-index` : imports `shared/score/*` uniquement via `index.ts`.

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
Job purge `api_cache` actif toutes les heures.
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
Aucun appel API externe si résultat valide en `keyword_metrics` puis `api_cache` puis `paa_cache`.
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
Composants Vue passent par `apiGet/apiPost/apiPut/apiDelete` — pas de `fetch` direct.
**Statut :** active — dette résiduelle ~20 `fetch()` directs à migrer.

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
| `api_cache` | cache_key, cache_type, data JSONB, expires_at, cached_at | Cache TTL global |
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
| FR-INFRA-NO-SCORE-FALLBACK | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| FR-INFRA-CHECK-HEALTH | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| FR-INFRA-DEPENDENCY-CRUISER | jamais documenté avant | `.dependency-cruiser.cjs` | < 2026-05-04 |
| FR-INFRA-LOGGER | jamais documenté avant | code (server/utils/logger.ts) | < 2026-05-04 |
| FR-INFRA-COST-LOG-STORE | jamais documenté avant | code (cost-log store) | < 2026-05-04 |
| NFR-MAIN-FILE-SIZE | nouveau | tech-spec-stabilisation-codebase | 2026-05-03 |
| NFR-SEC-PROMPT-INJECTION | jamais documenté avant | code (prompt-loader.ts) | < 2026-05-04 |
| NFR-CFG-* (tous) | jamais documentés avant | `.env.example` | < 2026-05-04 |

### 12.5 — Dette technique identifiée

1. **Strings de checks hardcodées** : plusieurs composants hardcodent `'capitaine_locked'` au lieu d'importer la constante `MOTEUR_CHECKS.CAPITAINE_LOCKED` (FR-MOT-CHECKS-CONSTANTS partiellement violé).
2. **`fetch()` directs résiduels** : ~20 occurrences hors `apiGet/apiPost/...` (FR-INFRA-API-WRAPPER partiellement violé).
3. **Fichiers > 1000 lignes** : `CaptainValidation.vue`, `KeywordDiscoveryTab.vue`, `BrainPhase.vue` (NFR-MAIN-FILE-SIZE violé).
4. **NFR-PERF-* non monitorées** : aucun middleware timing, pas d'instrumentation cache hit rate.
5. **Tokens GSC en plain** : pas de chiffrement (acceptable en local single-user mais à noter).

---

**Fin du PRD.**
