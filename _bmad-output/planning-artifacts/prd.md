---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
workflowType: 'prd'
completedAt: '2026-03-31'
lastUpdated: '2026-04-24'
updateReason: 'Alignement avec l''état réel du projet : Moteur en 6 onglets (pas 2 phases/3 sous-onglets), PostgreSQL remplace les fichiers JSON, routes/stores/services/composables réorganisés en subfolders, Cerveau et Rédaction opérationnels, Finalisation ajoutée'
classification:
  projectType: 'web_app'
  domain: 'SEO Content Production Tool'
  complexity: 'medium'
  projectContext: 'brownfield'
---

# Product Requirements Document - Blog Redactor SEO

**Author:** Utilisateur
**Date:** 2026-03-30 — mis à jour 2026-04-24

## Executive Summary

Blog Redactor SEO est un outil de production de contenu SEO pour un consultant solo expert. L'application couvre le cycle complet : stratégie de cocon sémantique (**Cerveau**), validation de mots-clés sur 6 onglets (**Moteur**), puis rédaction assistée par IA (**Rédaction**). L'objectif est de passer de « j'ai un cocon à remplir » à « article publié avec des mots-clés validés » rapidement, sans se noyer dans la complexité.

Le pipeline Cerveau → Moteur → Rédaction est aujourd'hui fonctionnel. Le **Moteur** est structuré en 3 phases et 6 onglets : Phase ① Explorer (Discovery, Radar), Phase ② Valider (Capitaine, Lieutenants, Lexique) avec verrouillage séquentiel, et Phase ③ Finalisation (récap read-only débloqué quand les 3 verrouillages de la Phase ② sont faits). La persistance est assurée par **PostgreSQL** (migration réalisée depuis les fichiers JSON historiques). Le frontend et le backend sont organisés en sous-dossiers par domaine (stores et composables en 5 domaines, services backend en 7 domaines).

Le PRD couvre les exigences actuelles : workflow de validation à 6 onglets, ponts Cerveau→Moteur (contexte stratégique injecté dans les prompts IA), extraction Intention/Audit/Local vers Dashboard et Explorateur indépendants, **Labo** pour recherche libre, système de progression à 5 checks `moteur:*` stockés dans `articles.completed_checks` TEXT[].

### Ce qui rend ce produit unique

1. **Verdict GO/NO-GO qui donne confiance** — Trois onglets séquentiels (Capitaine → Lieutenants → Lexique) avec feu tricolore contextuel selon le niveau d'article (Pilier/Intermédiaire/Spécifique). Seuils transparents au survol, l'IA conseille sans toucher au verdict, l'utilisateur garde le libre arbitre (forcer GO, saisir un alternatif).

2. **Sophistication invisible** — Machine complexe en back (PostgreSQL, cache multi-niveau, cache SERP cross-article par `keyword_metrics`), simple en front. Progression cochée en arrière-plan, suggestions sans jamais bloquer la navigation.

3. **Outil taillé sur mesure** — Adapté au workflow du consultant : ordre Cerveau→Moteur→Rédaction, hiérarchie silos/cocons/articles, injection stratégique dans les décisions IA.

L'insight fondamental : le problème n'est pas de générer du contenu — c'est d'avoir *confiance* dans le mot-clé et la structure *avant* de rédiger.

## Project Classification

| Critère | Valeur |
|---------|--------|
| **Type** | Web App — SPA Vue 3 + API Express |
| **Domaine** | Outil de production de contenu SEO |
| **Complexité** | Moyenne — orchestration de workflows, intégrations API multiples |
| **Contexte** | Brownfield — 100+ composants, 22 stores Pinia (5 domaines), 42 services backend (7 domaines), 15 vues |
| **Stack** | Vue 3.5, Pinia 3, TipTap 3, Express 5, PostgreSQL (pg 8), Anthropic SDK, Google GenAI, HuggingFace Transformers, DataForSEO, Zod 4, Vitest 4, Playwright |
| **Usage** | Local, desktop, utilisateur unique |

## Success Criteria

### User Success

- **Facilité = Qualité** — La simplicité d'utilisation est au même niveau que la qualité des mots-clés validés et des textes produits.
- **Guidage naturel** — L'utilisateur sait toujours où il en est dans le workflow (dots de progression, bandeaux de transition) sans documentation.
- **Confiance avant rédaction** — Le feu tricolore GO/NO-GO donne un verdict clair sur le Capitaine. Les Lieutenants proviennent de données SERP réelles. Le Lexique est extrait des concurrents. Au moment de rédiger, tout est verrouillé et validé.
- **Recherche libre accessible** — Le Labo permet de vérifier une intuition en quelques clics, sans contexte article/cocon.

### Business Success

- **Workflow bout-en-bout** — Le chemin Cerveau → Moteur (6 onglets) → Rédaction fonctionne pour tout article d'un cocon.
- **Réduction du temps de production** — La Phase ② Valider est celle où l'on passe le MOINS de temps possible grâce au cache SERP cross-article.
- **Autonomie complète** — L'outil couvre 100% du workflow sans outil externe.

### Technical Success

- **Zéro appel API redondant** — Résultats DataForSEO, Claude/Gemini, autocomplete et intent cachés (table `api_cache` + table `keyword_metrics` cross-article).
- **Persistance PostgreSQL** — Articles, keywords, progress, strategies, cache en base. Purge horaire des entrées `api_cache` expirées.
- **Réactivité** — Pas de lag visible. Appels longs en streaming SSE (Claude) avec feedback visuel.

### Indicateurs mesurables

| Indicateur | Cible |
|-----------|-------|
| Appels API redondants | 0 (cache `api_cache` + `keyword_metrics`) |
| Phases du Moteur identifiables | 3 phases visuelles (Explorer, Valider, Finalisation) sur 6 onglets |
| Progression par article | 5 checks `moteur:*` automatiquement écrits dans `articles.completed_checks` |
| Persistance | 100% PostgreSQL (pas de fichier JSON côté chaud) |
| Workflow sans outil externe | Oui |

## User Journeys

### Journey 1 : Production d'article de A à Z (Success Path)

**Contexte :** Lundi matin, l'utilisateur ouvre l'app pour produire un article dans le cocon "CRM pour PME". Pas encore de mots-clés validés.

**Parcours :**
1. **Dashboard** → Silo "Solutions Digitales" → Cocon "CRM pour PME"
2. **Cocoon Landing** → 3 portes : Cerveau (fait), **Moteur** (à faire), Rédaction
3. **Moteur — Phase ① Explorer**
   - **Discovery** : analyse IA des mots-clés candidats (dot `moteur:discovery_done`)
   - **Radar** : scan Douleur Intent pour détecter les résonances (dot `moteur:radar_done`)
4. **Moteur — Phase ② Valider — Capitaine** → Le mot-clé arrive pré-rempli depuis Discovery. Thermomètre + KPIs contextuels (Volume, KD, CPC, PAA, Intent, Autocomplete) → feu tricolore GO/ORANGE/NO-GO. Panel IA expert en streaming SSE. Verdict GO → verrouillage Capitaine (dot `moteur:capitaine_locked`).
5. **Moteur — Phase ② Valider — Lieutenants** → Bouton "Analyser SERP" → scraping top 10 via DataForSEO. Hn concurrents, PAA associés, groupes croisés. Sélection de 4 Lieutenants (dot `moteur:lieutenants_locked`).
6. **Moteur — Phase ② Valider — Lexique** → TF-IDF extrait des données SERP déjà scrapées (zéro requête supplémentaire). 3 niveaux : Obligatoire/Différenciateur/Optionnel (dot `moteur:lexique_validated`).
7. **Moteur — Phase ③ Finalisation** → Récap read-only des 3 verrouillages. Bouton « Passer à la rédaction ».
8. **Rédaction** → Brief enrichi → Sommaire streamé → Article streamé → Éditeur TipTap avec SEO scoring live.
9. **Résultat** → Article rédigé, mots-clés validés, export HTML.

**Émotion :** « Les 6 onglets du Moteur m'ont guidé sans friction. Un seul scraping SERP alimentait Lieutenants et Lexique. »

### Journey 2 : Vérification au Labo (Recherche libre)

**Contexte :** Intuition sur « erp cloud pme ». Vérification rapide avant intégration.

**Parcours :**
1. **Navbar** → **Labo**
2. **Labo** → Champ libre. Saisit « erp cloud pme », lance le verdict Capitaine en mode `libre` (seuils par défaut = Intermédiaire). Thermomètre + KPIs : volume 1200, KD 42, feu ORANGE.
3. **Exploration rapide** → Autocomplete, PAA, intention.
4. **Décision** → Mot-clé prometteur, retour au travail.

**Émotion :** « J'ai vérifié en 2 minutes sans casser mon workflow. »

### Journey 3 : Reprise d'un article en cours

**Contexte :** Article commencé la semaine dernière. Checks : Discovery + Radar faits.

**Parcours :**
1. **Moteur** → Sélection de l'article. Les dots montrent Discovery et Radar faits.
2. **Cache multi-niveau** → `api_cache` + `keyword_metrics` cross-article. Aucun re-call API.
3. **Phase ② Valider** → Reprise exactement là où il s'était arrêté.
4. **Contexte** → Stratégie du Cerveau toujours accessible (composant `MoteurStrategyContext`), prompts IA enrichis via `{{strategy_context}}`.

### Capabilities révélées

| Journey | Capabilities |
|---------|-------------|
| Success Path | Moteur 3 phases / 6 onglets, validation GO/NO-GO, feu tricolore contextuel, SERP unique, dots progression, Finalisation, pipeline bout-en-bout, enrichissement prompts IA |
| Labo | Verdict GO/NO-GO en mode libre (sans article/cocon) |
| Reprise | Cache `api_cache` + `keyword_metrics` cross-article, persistance PostgreSQL |

## Innovation & Novel Patterns

### Sophistication invisible

- Traque la progression silencieusement via `articles.completed_checks` TEXT[]
- Suggère la suite sans bloquer (bandeaux de transition `PhaseTransitionBanner`)
- Enrichit les prompts IA avec le contexte stratégique sans que l'utilisateur le voie
- Navigation libre à 100% — aucun gating dur

### Pont Cerveau→Moteur

Injection automatique du contexte stratégique (cible, angle, promesse, douleur, CTA) dans les prompts IA via `{{strategy_context}}` dans les templates `.md`.

### Cache multi-niveau cross-article

La table `keyword_metrics` stocke Volume/KD/CPC/PAA par mot-clé de façon partagée entre tous les articles — un même mot-clé réutilisé dans 3 articles ne fait qu'un seul appel DataForSEO.

### Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Guidage trop discret | Dots visibles dans liste articles — signal fort |
| Enrichissement prompts dégrade l'IA | Contexte injecté comme additionnel, fallback = prompt standard (NFR) |
| Navigation libre → étapes sautées | Message inline dans Capitaine si signal manquant |
| Migration JSON → PostgreSQL | Scripts `scripts/migrate-slug-to-id.ts` + backup `_backup_pg_20260418.sql` |

## Web App — Exigences spécifiques

SPA Vue 3 + backend Express 5, usage local/desktop, utilisateur unique. Pas de déploiement cloud, pas de multi-utilisateur, pas de SEO sur l'app elle-même.

**Architecture existante :**
- Frontend : Vue 3.5 + Vue Router 5 + Pinia 3 (22 stores en 5 domaines) + TipTap 3
- Backend : Express 5.2, port 3005, CORS localhost only
- Communication : REST API + SSE streaming
- Validation : Zod 4 schemas partagés front/back (`shared/schemas/`)
- Data : **PostgreSQL** (pg 8.20) — tables articles, keywords, cocoons, strategies, api_cache, keyword_metrics, article_explorations…
- APIs externes : Anthropic Claude, Google GenAI, OpenRouter, HuggingFace Transformers, DataForSEO, Google Autocomplete, GSC

**Contraintes brownfield :**
- Réutiliser les 100+ composants existants — Labo utilise les mêmes composants que Moteur en mode `libre`
- Store `article-progress` (dans `stores/article/`) exploite `articles.completed_checks` TEXT[]
- Cache DataForSEO centralisé (table `api_cache`) + cache cross-article (`keyword_metrics`)
- Prompts IA dans `server/prompts/*.md` — enrichissement via `loadPrompt()` et variables `{{...}}`

## Project Scoping & Phased Development

### Stratégie

**Le MVP est livré.** Le Moteur en 6 onglets est fonctionnel, Cerveau et Rédaction opérationnels, PostgreSQL en production, cache multi-niveau en place, Labo et Explorateur disponibles.

### Phase actuelle — Consolidation & qualité

| Chantier | Statut |
|----------|--------|
| Moteur 6 onglets (3 phases) | ✅ Livré |
| Verdict GO/NO-GO Capitaine avec seuils contextuels | ✅ Livré |
| Scraping SERP unique cascade Lieutenants→Lexique TF-IDF | ✅ Livré |
| 5 checks `moteur:*` automatiques | ✅ Livré |
| Enrichissement prompts Cerveau→Moteur | ✅ Livré |
| Labo & Explorateur découplés | ✅ Livré |
| Migration PostgreSQL | ✅ Livré |
| Refactor stores / composables / services par domaine | ✅ Livré |
| Purge dead exports, husky + lint-staged | ✅ Livré |

### Phase à venir — Vision

- Génération de cocons entiers en un clic (articles + mots-clés + rédaction chaînée)
- Suggestions proactives de nouveaux cocons basées sur les gaps de contenu
- Boucle GSC post-publication (le mot-clé ranke-t-il ?) — store `gscStore` présent, exploitation à étendre
- Batch processing multi-articles
- Score de complémentarité Capitaine ↔ Lieutenants

### Risques du projet

| Type | Risque | Mitigation |
|------|--------|-----------|
| Technique | Dette de l'ancien système JSON | Archive dans `data/_archive/` + backup SQL |
| Technique | Scraping SERP long | Curseur 3-10 + cache persistent (api_cache + keyword_metrics) |
| UX | Flux séquentiel ajoute de la friction | Navigation libre maintenue — verrouillage = gating souple |
| Data | Seuils de scoring trop stricts | Seuils tooltip transparents, ajustables |

## Functional Requirements

### Moteur — Structure 3 phases / 6 onglets

- FR1 : Les onglets du Moteur sont organisés en 3 phases visuelles : Phase ① Explorer, Phase ② Valider, Phase ③ Finalisation
- FR2 : L'utilisateur peut naviguer librement entre tous les onglets sans blocage dur
- FR3 : L'utilisateur doit sélectionner un article avant d'utiliser les actions du Moteur
- FR4 : Les onglets Intention, Audit, Local et Content Gap ne font PAS partie du Moteur (extraits vers Dashboard/Explorateur/Brief)

### Moteur — Phase ① Explorer

- FR5 : Onglet **Discovery** — analyse IA produisant des mots-clés candidats (émet `moteur:discovery_done`)
- FR6 : Onglet **Radar** — scan Douleur Intent détectant les résonances (émet `moteur:radar_done`)
- FR7 : Phase ① accessible en permanence (pas de verrouillage), permet la recherche continue

### Moteur — Phase ② Valider

Architecture : 3 onglets séquentiels. Chaque onglet verrouille ses résultats avant de débloquer le suivant (gating souple — la consultation reste libre). Le mot-clé arrive pré-rempli depuis Phase ① ou Cerveau.

#### Onglet Capitaine (mot-clé principal)

- FR8 : Le Capitaine arrive pré-rempli ; l'utilisateur peut saisir un alternatif et naviguer dans l'historique via un slider
- FR9 : Feu tricolore GO/ORANGE/NO-GO calculé à partir de 6 KPIs : Volume, KD, CPC, PAA pertinence, Intent match, Autocomplete
- FR10 : Seuils contextuels par niveau article (Pilier/Intermédiaire/Spécifique)
- FR11 : CPC asymétrique : > 2€ = bonus vert, 0-2€ = neutre, jamais rouge
- FR12 : NO-GO automatique si volume=0 ET PAA=0 ET autocomplete=0
- FR13 : Pour longue traîne (3+ mots) avec données faibles, découpage en racine(s) en section "Analyse racine" — le verdict reste sur le mot-clé original
- FR14 : Chaque KPI affiché avec barre de progression et zones vert/orange/rouge ; seuils visibles au survol (tooltip)
- FR15 : Panel IA expert SEO (`CaptainAiPanel`) en streaming SSE — ne touche JAMAIS au feu tricolore
- FR16 : L'utilisateur peut forcer GO sur ORANGE ou ROUGE (libre arbitre)
- FR17 : NO-GO orienté en 3 catégories : "Trop longue traîne" / "KPIs faibles" / "Hors sujet"
- FR18 : Verrouillage via "Valider ce Capitaine" → émet `moteur:capitaine_locked`, débloque Lieutenants. Lock/unlock (cadenas).

#### Onglet Lieutenants (H2/H3)

- FR19 : Affiche Capitaine verrouillé + niveau article en en-tête
- FR20 : Bouton "Analyser SERP" — scraping top 3-10 via DataForSEO (curseur configurable, défaut 10)
- FR21 : 3 sections dépliables : Hn concurrents (% récurrence), PAA N+2, Groupes croisés (Cerveau)
- FR22 : Candidats avec badges multi-source [SERP] [PAA] [Groupe] + pertinence Fort/Moyen/Faible
- FR23 : Sélection checkbox + compteur recommandé (Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3)
- FR24 : Curseur SERP intelligent : sous le défaut = filtre local, au-dessus = scraping complémentaire
- FR25 : Panel IA dépliable recommande structure Hn (`propose-lieutenants.md`, `lieutenants-hn-structure.md`)
- FR26 : "Valider les Lieutenants" → émet `moteur:lieutenants_locked`, débloque Lexique

#### Onglet Lexique (LSI)

- FR27 : Lexique extrait par TF-IDF des contenus SERP déjà scrapés — ZÉRO nouvelle requête
- FR28 : 3 niveaux : Obligatoire (70%+), Différenciateur (30-70%), Optionnel (<30%) — densité récurrence/page
- FR29 : Checkboxes par terme, Obligatoires pré-cochés
- FR30 : Panel IA dépliable (`lexique-ai-panel.md`, `lexique-analysis-upfront.md`)
- FR31 : "Valider le Lexique" → émet `moteur:lexique_validated`, écriture finale dans ArticleKeywords (capitaine + lieutenants + lexique)

### Moteur — Phase ③ Finalisation

- FR32 : Onglet **Finalisation** read-only, débloqué quand les 3 checks Phase ② sont ✓
- FR33 : Affiche récap (`FinalisationRecap`) : Capitaine + Lieutenants + Lexique validés
- FR34 : Lien « Passer à la Rédaction » vers `/cocoon/:id/redaction`

### Règles transversales Phase ②

- FR35 : Aucune action automatique au changement d'onglet — l'utilisateur déclenche tout manuellement
- FR36 : Les KPIs bruts sont TOUJOURS visibles — libre arbitre > algorithme
- FR37 : Persistance via `api_cache` (TTL) + `keyword_metrics` (cross-article permanent)

### Dashboard & Explorateur (hors Moteur)

- FR38 : L'**Explorateur** (`/explorateur`, `ExplorateurView`) accueille l'analyse d'intention SERP, comparaison local/national, autocomplete
- FR39 : Les signaux Local/Maps/GBP sont accessibles via l'Explorateur et les composants `local/` (pas dans le Moteur)

### Progression et guidage invisible

- FR40 : Dots de progression (●/○) à côté de chaque article dans la liste du Moteur
- FR41 : Les 5 checks sont ajoutés automatiquement : `moteur:discovery_done`, `moteur:radar_done`, `moteur:capitaine_locked`, `moteur:lieutenants_locked`, `moteur:lexique_validated`
- FR42 : Bandeau de suggestion (`PhaseTransitionBanner`) entre phases
- FR43 : L'utilisateur peut ignorer le bandeau

### Pont Cerveau→Moteur

- FR44 : Résumé du contexte stratégique Cerveau dans `MoteurStrategyContext` (collapsable) — cible, angle, promesse, douleur, CTA
- FR45 : Injection automatique via `{{strategy_context}}` dans les prompts `.md` concernés (Discovery, Pain Translate, Capitaine AI Panel, Propose Lieutenants, Lexique AI Panel)

### Labo — Recherche libre

- FR46 : Labo accessible depuis Navbar (`/labo`)
- FR47 : Réutilise les composants Moteur en mode `libre` — pas de sélection article/cocon
- FR48 : Champ de recherche libre + verdict Capitaine avec seuils par défaut Intermédiaire

### Cache et persistance

- FR49 : Chaque service externe consulte d'abord `api_cache` (clé = request hash + TTL)
- FR50 : Les métriques mot-clé (Volume, KD, CPC, PAA) sont stockées dans `keyword_metrics` (partagé entre articles)
- FR51 : Rechargement automatique des résultats à la reprise — pas de re-call API
- FR52 : Purge horaire : `DELETE FROM api_cache WHERE expires_at < NOW()` (job dans `server/index.ts`)

### Stratégie (Cerveau) — fonctionnel

- FR53 : Cerveau en 6 étapes : Cible, Douleur, Aiguillage, Angle, Promesse, CTA
- FR54 : Chaque étape : input utilisateur → suggestion IA (`strategy-suggest.md`) → approfondissement (`strategy-deepen.md`) → consolidation (`strategy-consolidate.md`) → validation

### Rédaction — fonctionnel

- FR55 : Brief généré à partir de l'article + keywords + SERP
- FR56 : Sommaire streamé via SSE (`generate-outline.md`)
- FR57 : Article streamé section par section (`generate-article.md`, `generate-article-section.md`)
- FR58 : Meta title + meta description générés (`generate-meta.md`)
- FR59 : Éditeur TipTap avec SEO scoring live (300ms debounce, `requestIdleCallback`)
- FR60 : Actions contextuelles sur sélection (`server/prompts/actions/*.md`) : reformulate, simplify, convert-list, etc.

## Non-Functional Requirements

### Performance

- NFR1 : Réponses API locales (hors appels externes) en < 200ms
- NFR2 : Streaming SSE (Claude) premier token en < 2s
- NFR3 : Chargement d'une vue (changement de route lazy) en < 500ms
- NFR4 : Cache hit rate DataForSEO > 90% après première utilisation d'un mot-clé (grâce à `keyword_metrics`)

### Optimisation des coûts

- NFR5 : Aucun appel API externe si résultat valide en `api_cache` ou `keyword_metrics`
- NFR6 : Persistance PostgreSQL — survit au redémarrage
- NFR7 : Taille max body JSON : 5MB (`express.json({ limit: '5mb' })`)

### Intégration

- NFR8 : Composants Moteur bimodaux : contextualisé (article sélectionné, seuils adaptatifs) et libre (Labo, seuils Intermédiaire par défaut)
- NFR9 : Enrichissement prompts optionnel — sans stratégie, `{{strategy_context}}` = string vide
- NFR10 : `articles.completed_checks` TEXT[] = source unique de vérité pour la progression. Checks Moteur : `moteur:discovery_done`, `moteur:radar_done`, `moteur:capitaine_locked`, `moteur:lieutenants_locked`, `moteur:lexique_validated`
- NFR11 : Scraping SERP UNE fois (Lieutenants) → cascade vers Lexique (TF-IDF sur contenus hérités) — zéro doublon
- NFR12 : Seuils de scoring configurables dans `shared/kpi-scoring.ts` / `shared/scoring.ts` et visibles au survol

### Maintenabilité

- NFR13 : Pas de duplication composants entre Moteur et Labo — prop `mode: 'workflow' | 'libre'`
- NFR14 : Prompts IA dans `server/prompts/*.md` — enrichissement par `loadPrompt()` avec variables `{{...}}`
- NFR15 : Organisation par domaine : `stores/{article,keyword,strategy,external,ui}/`, `composables/{keyword,intent,editor,seo,ui}/`, `services/{keyword,external,intent,article,strategy,infra,queries}/`
- NFR16 : Tests Vitest en miroir dans `tests/unit/`, tests navigateur Playwright (`test:browser`)
- NFR17 : Tooling qualité : oxlint + eslint + prettier + knip (dead code) + madge (cycles) + husky pre-commit + lint-staged
