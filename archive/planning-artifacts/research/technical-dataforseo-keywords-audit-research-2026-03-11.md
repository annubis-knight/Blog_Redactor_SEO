---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments: []
workflowType: 'research'
lastStep: 7
research_type: 'technical'
research_topic: 'DataForSEO API — Recherche de mots-clés (pilier, moyenne/longue traîne), suggestions de remplacement, et audit de site'
research_goals: 'Produire un document exhaustif et applicable pour implémenter dans Blog Redactor SEO : 1) recherche de mots-clés pilier/moyenne/longue traîne, 2) suggestions de mots-clés de remplacement pour ceux à mauvais score, 3) audit SEO de site/blog — avec endpoints précis, paramètres, coûts, et patterns d implémentation'
user_name: 'Arnau'
date: '2026-03-11'
web_research_enabled: true
source_verification: true
---

# Recherche Technique : DataForSEO API — Mots-clés, Suggestions & Audit de Site

**Date :** 2026-03-11
**Auteur :** Arnau
**Type :** Recherche technique approfondie
**Projet cible :** Blog Redactor SEO

---

## Résumé exécutif

Cette recherche technique couvre de manière exhaustive l'utilisation de l'API DataForSEO pour trois cas d'usage stratégiques du projet Blog Redactor SEO : (1) la découverte et classification automatique de mots-clés par type de traîne, (2) la suggestion de remplacements pour les mots-clés sous-performants, et (3) l'audit SEO complet de sites/blogs.

**Découvertes clés :**

- **Classification de mots-clés** : DataForSEO ne fournit pas de clustering natif, mais les champs `words_count`, `search_volume`, `keyword_difficulty` et `search_intent` permettent une classification programmatique fiable. Un workflow en 6 étapes (seed → expansion parallèle → enrichissement batch → classification → déduplication → scoring) couvre la découverte complète pour ~$0.21 par pilier exploré.
- **Suggestions de remplacement** : En diagnostiquant automatiquement le type de problème (volume zéro, difficulté excessive, redondance, score faible), on peut appliquer des stratégies de remplacement ciblées via les filtres API côté serveur pour ~$0.03 par suggestion.
- **Audit de site** : L'On-Page API offre 60+ checks SEO par page à $0.000125/page (base), avec un mode `instant_pages` idéal pour l'audit temps réel pendant l'édition (~$0.001/page) et un mode crawl async pour l'audit complet (~$0.79 pour 500 pages + backlinks).
- **Optimisations identifiées** : Le batching de `keyword_overview` (700 KW/appel au lieu de 1) réduirait les coûts d'audit de cocon de 15x. L'ajout de `search_intent` ($0.001/task pour 1000 KW) apporterait une dimension cruciale à la classification.

**Projection de coût mensuel pour toutes les nouvelles fonctionnalités : ~$7.50/mois** en usage typique.

---

## Table des matières

1. [Périmètre et méthodologie](#1-périmètre-et-méthodologie)
2. [Vue d'ensemble de l'écosystème DataForSEO](#2-vue-densemble-de-lécosystème-dataforseo)
3. [État actuel de l'intégration dans le projet](#3-état-actuel-de-lintégration-dans-le-projet)
4. [AXE 1 — Recherche de mots-clés pilier, moyenne traîne et longue traîne](#4-axe-1--recherche-de-mots-clés-pilier-moyenne-traîne-et-longue-traîne)
5. [AXE 2 — Suggestions de remplacement pour mots-clés à mauvais score](#5-axe-2--suggestions-de-remplacement-pour-mots-clés-à-mauvais-score)
6. [AXE 3 — Audit SEO de site/blog](#6-axe-3--audit-seo-de-siteblog)
7. [Pricing détaillé et optimisation des coûts](#7-pricing-détaillé-et-optimisation-des-coûts)
8. [Patterns d'intégration et recommandations d'implémentation](#8-patterns-dintégration-et-recommandations-dimplémentation)
9. [Sources](#9-sources)

---

## 1. Périmètre et méthodologie

### Objectifs de recherche

1. **Recherche de mots-clés par type** — endpoints pour identifier des mots-clés pilier (short-tail), moyenne traîne et longue traîne, avec métriques complètes
2. **Suggestions de remplacement** — stratégies et endpoints pour trouver des alternatives à des mots-clés ayant un mauvais composite score
3. **Audit SEO de site/blog** — analyse on-page, technique, backlinks, contenu

### Méthodologie

- 4 agents de recherche parallèles : Keywords API, Site Audit API, Pricing/SDK, Code existant
- Sources primaires : documentation officielle DataForSEO (docs.dataforseo.com)
- Validation croisée des coûts entre documentation et réponses API observées
- Analyse du code existant du projet pour identifier les gaps et opportunités

---

## 2. Vue d'ensemble de l'écosystème DataForSEO

### 2.1 Architecture de l'API

**Base URL :** `https://api.dataforseo.com/v3`
**Sandbox :** `https://sandbox.dataforseo.com/v3` (gratuit, données fictives, structure identique)
**Auth :** HTTP Basic Auth (`base64(login:password)`)

### 2.2 Produits API pertinents pour ce projet

| Produit API | Usage principal | Mode | Coût indicatif |
|-------------|----------------|------|----------------|
| **DataForSEO Labs** | Métriques mots-clés, suggestions, related, difficulty, intent | Live uniquement | $0.01/task + $0.0001/item |
| **Keywords Data (Google Ads)** | Volume de recherche officiel Google, suggestions | Standard + Live | $0.05-0.075/task (1000 KW) |
| **SERP API** | Résultats de recherche Google, PAA, featured snippets | Standard + Live | $0.0006-0.002/SERP |
| **On-Page API** | Crawl de site, audit technique, SEO on-page | Task-based + Instant | $0.000125/page (base) |
| **Backlinks API** | Profil de backlinks, domaines référents, ancres | Live | $0.02/req + $0.00003/row |
| **Content Analysis API** | Monitoring de citations/mentions sur le web | Live | $0.02/req + $0.00003/row |

### 2.3 Deux modes d'appel

**Live (synchrone) :**
- POST unique, résultats immédiats dans la réponse
- 1 task par requête
- Plus cher mais instantané (~2s Labs, ~11s SERP)
- Idéal pour les interactions utilisateur en temps réel

**Standard (asynchrone, task-based) :**
1. POST tasks vers `task_post` (jusqu'à 100 tasks)
2. Poll `tasks_ready` ou attente pingback/postback
3. GET résultats via `task_get`
- Moins cher (3.3x pour SERP)
- Délai : 5-10 min (normal), 1-3 min (priority)

### 2.4 Rate Limits globaux

| Scope | Limite |
|-------|--------|
| Général | 2 000 requêtes/minute |
| Requêtes simultanées (Labs, Backlinks, OnPage) | 30 max |
| Google Ads endpoints | 12 requêtes/minute/compte |
| Tasks par POST (Standard) | 100 tasks max |
| Keywords par task (Google Ads) | 1 000 max |
| Keywords par task (Labs keyword_overview) | 700 max |

### 2.5 Codes de statut importants

| Code | Signification |
|------|---------------|
| `20000` | Succès |
| `20100` | Task créée (mode Standard) |
| `40100` | Erreur d'authentification |
| `40200` | Solde insuffisant |
| `40202` | Rate limit dépassé |
| `40209` | Trop de requêtes simultanées (>30) |
| `50000` | Erreur serveur interne |
| `50401` | Timeout (>120s) |

---

## 3. État actuel de l'intégration dans le projet

### 3.1 Service existant

**Fichier :** `server/services/dataforseo.service.ts` (566 lignes)

**Endpoints actuellement utilisés :**

| Fonction | Endpoint | Usage |
|----------|----------|-------|
| `fetchSerp()` | `/serp/google/organic/live/regular` | Top 10 résultats organiques |
| `fetchPaa()` | `/serp/google/organic/live/advanced` | Questions "People Also Ask" |
| `fetchRelatedKeywords()` | `/dataforseo_labs/google/related_keywords/live` | Mots-clés sémantiquement liés |
| `fetchKeywordSuggestions()` | `/dataforseo_labs/google/keyword_suggestions/live` | Fallback suggestions |
| `fetchKeywordOverview()` | `/dataforseo_labs/google/keyword_overview/live` | Métriques détaillées |

**Configuration par défaut :** `location_code: 2250` (France), `language_code: 'fr'`

### 3.2 Architecture existante

- **Auth :** Basic Auth via `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` (.env)
- **Retry :** 3 tentatives avec backoff exponentiel (1s, 2s, 4s) sur 429/503
- **Cache :** Fichier JSON par mot-clé dans `data/cache/`, TTL configurable (7j prod, 0 dev)
- **Parallélisme :** `Promise.allSettled()` pour dégradation gracieuse
- **Rate limiting :** 200ms entre requêtes séquentielles (audit)

### 3.3 Scoring existant

**Composite Score (0-100) :**
- Volume de recherche : 35% (échelle log, cap 10 000 = 100)
- Difficulté inversée : 25% (100 - difficulty)
- CPC : 15% (échelle log, cap 5€ = 100)
- Compétition inversée : 25% (100 - competition*100)

**Alertes existantes :**
| Métrique | Seuil | Alerte |
|----------|-------|--------|
| Volume | 0 | DANGER — Aucune donnée |
| Volume | < 50 | WARNING — Trop faible |
| Difficulté | > 70 | WARNING — Trop compétitif |
| Chevauchement related KW | ≥ 60% | WARNING — Redondance |

### 3.4 Ce qui manque (gaps identifiés)

- **Pas de classification automatique** pilier / moyenne traîne / longue traîne basée sur les données API
- **Pas de suggestions de remplacement** quand un mot-clé a un mauvais score
- **Pas d'audit de site** (On-Page API non utilisée)
- **Pas de backlinks** analysis
- **Pas d'intent de recherche** (endpoint dédié non utilisé)
- **Keyword Overview** appelé 1 par 1 au lieu de batch (supporte 700 KW/requête)
- **Pas de Keywords for Site** pour découvrir des mots-clés d'un domaine concurrent

---

## 4. AXE 1 — Recherche de mots-clés pilier, moyenne traîne et longue traîne

### 4.1 Stratégie de classification

DataForSEO ne fournit **pas** d'endpoint dédié au clustering par type de traîne. Cependant, les champs retournés permettent une classification programmatique précise :

| Critère | Champ API | Disponible dans |
|---------|-----------|-----------------|
| Nombre de mots | `keyword_properties.words_count` | Tous les endpoints Labs |
| Volume de recherche | `keyword_info.search_volume` | Tous les endpoints |
| Difficulté | `keyword_properties.keyword_difficulty` | Tous les endpoints Labs (0-100) |
| Compétition | `keyword_info.competition` (0-1) + `competition_level` | Tous les endpoints |
| Intent de recherche | `search_intent_info.main_intent` | Labs + endpoint dédié |
| Mot-clé racine | `keyword_properties.core_keyword` | Tous les endpoints Labs |
| Catégorie | `keyword_info.categories` | Tous les endpoints Labs |

### 4.2 Règles de classification recommandées

```
MOT-CLÉ PILIER (short-tail) :
  - words_count: 1-2
  - search_volume: > 5 000/mois
  - keyword_difficulty: typiquement > 50
  - competition_level: HIGH ou MEDIUM
  - intent: commercial ou informationnel (large)
  - Exemple: "plombier paris"

MOYENNE TRAÎNE :
  - words_count: 2-3
  - search_volume: 500 - 5 000/mois
  - keyword_difficulty: 30-60
  - competition_level: MEDIUM
  - intent: mixte
  - Exemple: "plombier urgence paris"

LONGUE TRAÎNE :
  - words_count: 4+
  - search_volume: < 500/mois
  - keyword_difficulty: typiquement < 40
  - competition_level: LOW ou MEDIUM
  - intent: souvent transactionnel ou informationnel spécifique
  - Exemple: "plombier pas cher paris 15eme arrondissement"
```

### 4.3 Endpoints pour la découverte de mots-clés

#### 4.3.1 Keyword Suggestions — Trouver des variations longue traîne

**Endpoint :** `POST /v3/dataforseo_labs/google/keyword_suggestions/live`

**Ce qu'il fait :** Recherche full-text de termes contenant le seed keyword avec des mots avant, après ou dedans. **Meilleur endpoint pour trouver des longues traînes.**

**Paramètres clés :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `keyword` | string | Mot-clé seed (1 seul) |
| `location_code` | integer | 2250 pour France |
| `language_code` | string | "fr" |
| `include_seed_keyword` | boolean | Retourner aussi les données du seed |
| `include_serp_info` | boolean | Inclure données SERP |
| `exact_match` | boolean | Phrase exacte + mots avant/après uniquement |
| `ignore_synonyms` | boolean | Exclure les synonymes |
| `filters` | array | Jusqu'à 8 filtres combinés |
| `order_by` | array | Max 3 règles de tri |
| `limit` | integer | Max 1 000 résultats |
| `offset_token` | string | Pagination au-delà de 10 000 |

**Coût :** ~$0.0101/task + $0.0001/item

**Exemple — Trouver des longues traînes :**
```json
[{
  "keyword": "plombier paris",
  "location_code": 2250,
  "language_code": "fr",
  "include_seed_keyword": true,
  "include_serp_info": true,
  "filters": [
    ["keyword_properties.words_count", ">=", 4],
    "and",
    ["keyword_info.search_volume", ">", 0],
    "and",
    ["keyword_info.search_volume", "<", 500]
  ],
  "order_by": ["keyword_info.search_volume,desc"],
  "limit": 200
}]
```

#### 4.3.2 Related Keywords — Expansion sémantique récursive

**Endpoint :** `POST /v3/dataforseo_labs/google/related_keywords/live`

**Ce qu'il fait :** Mots-clés issus des "recherches associées" de Google. Supporte une **profondeur récursive** (depth 0-4) pour une découverte exponentielle.

**Profondeur et volume estimé :**

| Depth | Mots-clés estimés |
|-------|-------------------|
| 0 | 1 (seed uniquement) |
| 1 | ~8 |
| 2 | ~72 |
| 3 | ~584 |
| 4 | ~4 680 |

**Paramètres clés :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `keyword` | string | Seed keyword |
| `depth` | integer | 0-4, défaut 1 |
| `include_seed_keyword` | boolean | Inclure le seed |
| `replace_with_core_keyword` | boolean | Retourner le core keyword à la place |
| `filters` | array | Filtrage avancé |
| `limit` | integer | Max 1 000 |

**Coût :** ~$0.0103/task

**Exemple — Expansion sémantique avec filtre volume :**
```json
[{
  "keyword": "plombier paris",
  "language_code": "fr",
  "location_code": 2250,
  "depth": 2,
  "include_seed_keyword": true,
  "filters": [["keyword_data.keyword_info.search_volume", ">", 10]],
  "order_by": ["keyword_data.keyword_info.search_volume,desc"],
  "limit": 100
}]
```

#### 4.3.3 Keyword Ideas — Découverte par catégorie thématique

**Endpoint :** `POST /v3/dataforseo_labs/google/keyword_ideas/live`

**Ce qu'il fait :** Mots-clés qui appartiennent aux mêmes catégories produit/service que les seeds. Accepte **jusqu'à 200 seeds**. Retourne des mots-clés par pertinence catégorielle.

**Paramètres clés :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `keywords` | array | Jusqu'à 200 seeds |
| `closely_variants` | boolean | `true` = phrase-match, `false` = broad-match |
| `ignore_synonyms` | boolean | Exclure synonymes |
| `limit` | integer | Max 1 000 (défaut 700) |
| `offset_token` | string | Pagination 10k+ |

**Coût :** ~$0.0103/task

**Exemple — Découverte thématique large :**
```json
[{
  "keywords": ["plombier", "chauffagiste", "fuite eau"],
  "location_code": 2250,
  "language_code": "fr",
  "include_serp_info": true,
  "filters": [["keyword_info.search_volume", ">", 30]],
  "order_by": ["keyword_info.search_volume,desc"],
  "limit": 200
}]
```

#### 4.3.4 Keywords For Site — Découverte à partir d'un domaine concurrent

**Endpoint Labs :** `POST /v3/dataforseo_labs/google/keywords_for_site/live`
**Endpoint Google Ads :** `POST /v3/keywords_data/google_ads/keywords_for_site/live`

**Ce qu'il fait :** Découvre les mots-clés pertinents pour un domaine donné. La version Labs est plus riche (métriques complètes, difficulty, intent). La version Google Ads retourne les données officielles Google.

**Paramètres clés :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `target` | string | Nom de domaine (sans https://) |
| `target_type` | string | `site` (domaine entier) ou `page` (URL spécifique) — Google Ads uniquement |
| `include_subdomains` | boolean | Défaut true — Labs uniquement |
| `limit` | integer | Max 1 000 |

**Coût :** Labs ~$0.0103/task | Google Ads $0.075/task (retourne jusqu'à 2 000 KW)

#### 4.3.5 Keyword Overview — Métriques complètes en batch

**Endpoint :** `POST /v3/dataforseo_labs/google/keyword_overview/live`

**Ce qu'il fait :** Métriques exhaustives pour **jusqu'à 700 mots-clés en un seul appel**. C'est l'endpoint le plus complet pour les données d'un mot-clé individuel.

**Champs de réponse clés :**

| Champ | Type | Description |
|-------|------|-------------|
| `keyword_info.search_volume` | integer | Volume mensuel moyen |
| `keyword_info.competition` | float | 0-1 |
| `keyword_info.competition_level` | string | LOW / MEDIUM / HIGH |
| `keyword_info.cpc` | float | Coût par clic (USD) |
| `keyword_info.monthly_searches` | array | Historique 12 mois [{year, month, search_volume}] |
| `keyword_info.search_volume_trend` | object | `{monthly, quarterly, yearly}` % changement |
| `keyword_properties.keyword_difficulty` | integer | **0-100 (log)** |
| `keyword_properties.core_keyword` | string | Mot-clé racine du groupe synonyme |
| `keyword_properties.words_count` | integer | **Nombre de mots** |
| `serp_info.serp_item_types` | array | Features SERP présentes |
| `avg_backlinks_info.backlinks` | float | Backlinks moyens dans le top 10 |
| `avg_backlinks_info.referring_domains` | float | Domaines référents moyens dans le top 10 |
| `search_intent_info.main_intent` | string | `informational`, `navigational`, `commercial`, `transactional` |

**Coût :** ~$0.0101/task (base) | ~$0.0201 avec clickstream

**Exemple — Batch de 5 mots-clés :**
```json
[{
  "keywords": ["plombier paris", "plombier urgence", "fuite eau paris", "débouchage canalisation", "plombier pas cher paris 15"],
  "language_code": "fr",
  "location_code": 2250,
  "include_serp_info": true
}]
```

#### 4.3.6 Bulk Keyword Difficulty — Difficulté en masse

**Endpoint :** `POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live`

**Ce qu'il fait :** Score de difficulté pour **jusqu'à 1 000 mots-clés** en un appel. Léger et rapide.

**Coût :** ~$0.0103/task

**Exemple :**
```json
[{
  "location_code": 2250,
  "language_code": "fr",
  "keywords": ["plombier paris", "fuite eau paris", "débouchage canalisation"]
}]
```

#### 4.3.7 Search Intent — Classification d'intention

**Endpoint :** `POST /v3/dataforseo_labs/google/search_intent/live`

**Ce qu'il fait :** Classifie l'intention de recherche pour **jusqu'à 1 000 mots-clés**. Retourne probabilités pour chaque type d'intent.

**Pas besoin de `location_code`** — l'intent dépend uniquement de la langue.

**Types d'intent :** `informational`, `navigational`, `commercial`, `transactional`

**Coût spécial :** $0.001/task + $0.0001/KW (beaucoup moins cher que les autres Labs endpoints)

**Exemple :**
```json
[{
  "language_code": "fr",
  "keywords": ["plombier paris", "comment déboucher un évier", "tarif plombier", "avis plombier dupont"]
}]
```

**Réponse :**
```json
{
  "items": [
    {"keyword": "plombier paris", "keyword_intent": {"label": "commercial", "probability": 0.85}},
    {"keyword": "comment déboucher un évier", "keyword_intent": {"label": "informational", "probability": 0.97}},
    {"keyword": "tarif plombier", "keyword_intent": {"label": "commercial", "probability": 0.92}}
  ]
}
```

#### 4.3.8 Google Ads — Keywords For Keywords

**Endpoint :** `POST /v3/keywords_data/google_ads/keywords_for_keywords/live`

**Ce qu'il fait :** Suggestions basées sur des seeds (max 20), retourne **jusqu'à 20 000 suggestions** avec données Google Ads officielles.

**Coût :** $0.075/task (Live), $0.05/task (Standard)

#### 4.3.9 Google Ads — Search Volume

**Endpoint :** `POST /v3/keywords_data/google_ads/search_volume/live`

**Ce qu'il fait :** Volume, CPC, compétition pour **jusqu'à 1 000 mots-clés** — données officielles Google Ads.

**Coût :** $0.075/task (Live), $0.05/task (Standard)

### 4.4 Workflow recommandé pour la découverte de mots-clés

```
ÉTAPE 1 — SEED : L'utilisateur saisit un mot-clé pilier
                    ↓
ÉTAPE 2 — EXPANSION (3 appels parallèles) :
  ├─ keyword_suggestions(seed) → variations longue traîne
  ├─ related_keywords(seed, depth=2) → expansion sémantique
  └─ keyword_ideas([seed]) → découverte thématique
                    ↓
ÉTAPE 3 — ENRICHISSEMENT :
  ├─ keyword_overview(tous les KW trouvés, batch 700) → métriques complètes
  └─ search_intent(tous les KW, batch 1000) → classification d'intent
                    ↓
ÉTAPE 4 — CLASSIFICATION automatique :
  ├─ Pilier : words_count ≤ 2 AND search_volume > 5000
  ├─ Moyenne traîne : words_count 2-3 AND search_volume 500-5000
  └─ Longue traîne : words_count ≥ 4 OR search_volume < 500
                    ↓
ÉTAPE 5 — DÉDUPLICATION :
  └─ Grouper par core_keyword pour éliminer les synonymes
                    ↓
ÉTAPE 6 — SCORING et tri par composite score
```

**Coût estimé de ce workflow :**
- 3 appels expansion : ~$0.031
- 1 appel keyword_overview (batch 700 KW) : ~$0.08
- 1 appel search_intent (batch 1000 KW) : ~$0.10
- **Total : ~$0.21 par mot-clé pilier exploré**

### 4.5 Filtrage API côté serveur

Les endpoints Labs supportent des **filtres puissants** combinables avec `and`/`or` :

**Opérateurs disponibles :** `regex`, `not_regex`, `<`, `<=`, `>`, `>=`, `=`, `<>`, `in`, `not_in`, `match`, `not_match`, `ilike`, `not_ilike`, `like`, `not_like`

**Exemple — Moyenne traîne uniquement :**
```json
{
  "filters": [
    ["keyword_properties.words_count", ">=", 2],
    "and",
    ["keyword_properties.words_count", "<=", 3],
    "and",
    ["keyword_info.search_volume", ">=", 500],
    "and",
    ["keyword_info.search_volume", "<=", 5000]
  ]
}
```

### 4.6 Groupement par synonymes (Clustering)

Le champ `keyword_properties.core_keyword` regroupe les synonymes. Les mots-clés partageant le même `core_keyword` sont sémantiquement équivalents.

Le champ `synonym_clustering_algorithm` indique la méthode :
- `keyword_metrics` — regroupement basé sur les métriques de recherche similaires
- `text_processing` — regroupement basé sur la similarité textuelle

**Usage :** Déduplication et regroupement en clusters thématiques sans API de clustering séparée.

---

## 5. AXE 2 — Suggestions de remplacement pour mots-clés à mauvais score

### 5.1 Définition d'un "mauvais score"

Basé sur le système de scoring existant du projet :

| Condition | Sévérité | Action |
|-----------|----------|--------|
| `search_volume = 0` | DANGER | Remplacement obligatoire |
| `search_volume < 50` | WARNING | Remplacement recommandé |
| `keyword_difficulty > 70` | WARNING | Chercher alternative moins compétitive |
| `composite_score < 30` | WARNING | Remplacement recommandé |
| Redondance ≥ 60% avec un autre KW du cocon | WARNING | Garder le meilleur, remplacer l'autre |

### 5.2 Stratégies de remplacement par type de problème

#### Problème : Volume zéro ou trop faible

**Stratégie :** Trouver des variantes du même concept avec du volume.

**Endpoints à utiliser :**
1. `keyword_suggestions` avec le mot-clé problématique comme seed
2. `related_keywords` avec depth 1-2
3. Filtrer sur `search_volume > 50`

```json
[{
  "keyword": "mot-clé-sans-volume",
  "location_code": 2250,
  "language_code": "fr",
  "include_seed_keyword": false,
  "filters": [
    ["keyword_info.search_volume", ">", 50]
  ],
  "order_by": ["keyword_info.search_volume,desc"],
  "limit": 20
}]
```

#### Problème : Difficulté trop élevée

**Stratégie :** Trouver des variantes longue traîne du même concept avec une difficulté plus faible.

**Endpoints à utiliser :**
1. `keyword_suggestions` avec filtre difficulté
2. `keyword_ideas` avec les mots-clés du même cocon comme seeds

```json
[{
  "keyword": "mot-clé-trop-difficile",
  "location_code": 2250,
  "language_code": "fr",
  "filters": [
    ["keyword_properties.keyword_difficulty", "<", 50],
    "and",
    ["keyword_info.search_volume", ">", 50]
  ],
  "order_by": ["keyword_properties.keyword_difficulty,asc"],
  "limit": 20
}]
```

#### Problème : Redondance entre mots-clés du cocon

**Stratégie :** Comparer les `core_keyword` et les `related_keywords` overlap. Garder celui avec le meilleur composite score, remplacer l'autre par un mot-clé du même cluster thématique mais avec un angle différent.

**Endpoints à utiliser :**
1. `keyword_overview` batch pour les 2 mots-clés redondants → comparer scores
2. `keyword_suggestions` sur le mot-clé gardé → trouver un angle différent pour l'autre

#### Problème : Mauvais composite score global

**Stratégie :** Chercher dans la même catégorie thématique un mot-clé mieux scoré.

**Endpoints à utiliser :**
1. `categories_for_keywords` pour identifier la catégorie du KW problématique
2. `keywords_for_categories` pour trouver des alternatives dans la même catégorie
3. Filtrer par composite score calculé côté serveur

### 5.3 Workflow de remplacement recommandé

```
ENTRÉE : mot-clé avec mauvais score + raison du mauvais score
                    ↓
DIAGNOSTIC automatique :
  ├─ volume = 0 → stratégie "variante avec volume"
  ├─ volume < 50 → stratégie "variante avec volume"
  ├─ difficulty > 70 → stratégie "longue traîne moins compétitive"
  ├─ redondance → stratégie "angle différent"
  └─ composite < 30 → stratégie "meilleur candidat même catégorie"
                    ↓
RECHERCHE (1-2 appels API selon stratégie) :
  ├─ keyword_suggestions OU related_keywords
  └─ Filtres adaptés au problème
                    ↓
SCORING des candidats :
  └─ Appliquer le même composite score aux suggestions
                    ↓
CLASSEMENT :
  └─ Trier par composite score décroissant
                    ↓
PRÉSENTATION :
  └─ Top 5-10 suggestions avec métriques comparatives
```

**Coût estimé :** ~$0.02-0.04 par remplacement (1-2 appels Labs)

### 5.4 Endpoint dédié pour les suggestions Google Ads

**Endpoint :** `POST /v3/keywords_data/google_ads/keywords_for_keywords/live`

Utile quand les Labs endpoints ne retournent pas assez de résultats (niches étroites). Accepte 20 seeds et retourne jusqu'à 20 000 suggestions avec données Google Ads officielles.

**Coût :** $0.075/task — plus cher mais couverture plus large.

---

## 6. AXE 3 — Audit SEO de site/blog

### 6.1 On-Page API — Le moteur d'audit principal

**Base URL :** `https://api.dataforseo.com/v3/on_page/`

#### 6.1.1 Lancer un crawl (Task POST)

**Endpoint :** `POST /v3/on_page/task_post`
**Mode :** Asynchrone
**Coût :** $0.000125/page (base)

**Paramètres requis :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `target` | string | Domaine sans https:// ni www. |
| `max_crawl_pages` | integer | Nombre de pages à crawler |

**Paramètres optionnels importants :**

| Paramètre | Type | Défaut | Description | Surcoût |
|-----------|------|--------|-------------|---------|
| `start_url` | string | — | URL de départ du crawl | Non |
| `force_sitewide_checks` | boolean | false | Checks globaux même pour 1 page | Non |
| `load_resources` | boolean | false | Charger CSS/JS/images | 2x |
| `enable_javascript` | boolean | false | Exécuter le JS | 9x |
| `enable_browser_rendering` | boolean | false | Rendu navigateur complet | 33x |
| `calculate_keyword_density` | boolean | false | Densité de mots-clés (1-5 mots) | 1x |
| `check_spell` | boolean | false | Vérification orthographique | Non |
| `custom_user_agent` | string | — | User-agent personnalisé | Non |
| `respect_sitemap` | boolean | false | Suivre le sitemap.xml | Non |
| `enable_content_parsing` | boolean | false | Parser le contenu en markdown | Non |
| `pingback_url` | string | — | URL de callback quand le crawl est terminé | Non |

**Exemple — Audit complet d'un blog :**
```json
[{
  "target": "monblog.fr",
  "max_crawl_pages": 100,
  "load_resources": true,
  "enable_javascript": true,
  "calculate_keyword_density": true,
  "check_spell": true,
  "respect_sitemap": true,
  "enable_content_parsing": true,
  "force_sitewide_checks": true,
  "pingback_url": "https://mon-backend.com/api/webhook/onpage?id=$id&tag=$tag"
}]
```

**Coût de cet exemple :** 100 pages × ($0.000125 base + $0.000125 resources + load resources implies $0.000250 but JS is 9x = $0.001125 + keyword density 1x = $0.000125) ≈ **$0.14 pour 100 pages**

#### 6.1.2 Récupérer le résumé global

**Endpoint :** `GET /v3/on_page/summary/{task_id}`
**Coût :** Gratuit (inclus dans le crawl)

**Données retournées :**
- Pages crawlées (total, par code HTTP)
- Checks SSL, robots.txt, sitemap
- Support HTTP/2
- Détection CMS
- Statistiques de vitesse de chargement
- Comptage des erreurs par type

#### 6.1.3 Récupérer les pages avec détails

**Endpoint :** `POST /v3/on_page/pages`
**Coût :** Gratuit

**60+ checks SEO par page :**

| Catégorie | Checks |
|-----------|--------|
| **Title** | Présence, longueur, duplications, mots-clés |
| **Meta description** | Présence, longueur, duplications |
| **Headings** | H1 présence/unicité, structure H1-H6 |
| **Contenu** | Nombre de mots, ratio texte/code, lisibilité (5 indices) |
| **Images** | Alt text manquant, taille, optimisation |
| **Liens** | Internes, externes, cassés, chaînes de redirections |
| **Canonical** | Présence, validité, cohérence |
| **Structured Data** | Présence, type (JSON-LD, microdata) |
| **Social** | Open Graph, Twitter Cards |
| **Performance** | Taille page, temps chargement, nombre de ressources |

#### 6.1.4 Analyse de contenu détaillée

**Endpoint :** `POST /v3/on_page/pages`  avec `enable_content_parsing: true`

Retourne le contenu parsé en markdown avec :
- Texte brut extrait
- Nombre de mots
- Mots automatiques / stop words
- Densité de mots-clés (1 à 5 mots)

#### 6.1.5 Instant Pages — Audit de page unique en temps réel

**Endpoint :** `POST /v3/on_page/instant_pages`
**Mode :** Live (synchrone)
**Coût :** $0.000125/page (base)
**Limite :** 20 tasks par POST, max 5 domaines identiques

**Ce qu'il fait :** Même analyse complète que le crawl task-based, mais en instantané pour une seule page. Idéal pour un check rapide pendant l'édition d'un article.

**Exemple :**
```json
[{
  "url": "https://monblog.fr/article-plombier-paris",
  "load_resources": true,
  "enable_javascript": true,
  "calculate_keyword_density": true,
  "enable_content_parsing": true
}]
```

#### 6.1.6 Détection de contenu dupliqué

**Endpoint :** `POST /v3/on_page/duplicate_content`
**Coût :** Gratuit (post-crawl)

Utilise l'algorithme **SimHash** pour détecter les pages avec contenu similaire. Retourne les paires de pages avec leur pourcentage de similarité.

#### 6.1.7 Liens — Internes, externes, cassés

**Endpoints :**
- `POST /v3/on_page/links` — Tous les liens trouvés pendant le crawl
- `POST /v3/on_page/non_indexable` — Pages non indexables (noindex, canonical, etc.)
- `POST /v3/on_page/redirect_chains` — Chaînes et boucles de redirections

**Coût :** Gratuit (post-crawl)

#### 6.1.8 Lighthouse Integration

**Endpoint :** `POST /v3/on_page/lighthouse/live`
**Coût :** Inclus si `enable_browser_rendering: true` dans le crawl, ou ~$0.004/page en standalone

Retourne les scores Google Lighthouse complets :
- Performance (LCP, FID, CLS, TTI, TTFB)
- Accessibilité
- Best Practices
- SEO
- PWA

#### 6.1.9 Résumé des endpoints On-Page

| Endpoint | Mode | Coût | Usage |
|----------|------|------|-------|
| `task_post` | Async | $0.000125+/page | Lancer un crawl |
| `summary` | GET | Gratuit | Résumé global |
| `pages` | POST | Gratuit | Pages détaillées |
| `pages_by_resource` | POST | Gratuit | Ressources (CSS, JS, images) |
| `duplicate_content` | POST | Gratuit | Contenu dupliqué |
| `links` | POST | Gratuit | Tous les liens |
| `non_indexable` | POST | Gratuit | Pages non indexables |
| `redirect_chains` | POST | Gratuit | Redirections |
| `instant_pages` | POST Live | $0.000125+/page | Audit page unique instantané |
| `lighthouse/live` | POST Live | ~$0.004/page | Lighthouse complet |
| `content_parsing/live` | POST Live | $0.000125/page | Extraction contenu |
| `page_screenshot/live` | POST Live | $0.004/page | Capture d'écran |

### 6.2 Backlinks API — Profil de liens entrants

**Base URL :** `https://api.dataforseo.com/v3/backlinks/`
**Mode :** Live uniquement
**Coût :** $0.02/requête + $0.00003/row (max 1000 rows/requête)

#### 6.2.1 Summary — Vue d'ensemble du profil

**Endpoint :** `POST /v3/backlinks/summary/live`

**Données retournées :**

| Champ | Description |
|-------|-------------|
| `backlinks` | Total de backlinks |
| `referring_domains` | Domaines référents uniques |
| `referring_domains_nofollow` | Domaines nofollow |
| `broken_backlinks` | Liens cassés pointant vers le site |
| `referring_pages` | Pages référentes uniques |
| `rank` | Score de popularité DataForSEO |
| `spam_score` | Score de spam (0-100) |

**Exemple :**
```json
[{
  "target": "monblog.fr",
  "internal_list_limit": 10,
  "backlinks_status_type": "all"
}]
```

#### 6.2.2 Backlinks détaillés

**Endpoint :** `POST /v3/backlinks/backlinks/live`

Retourne chaque backlink avec :
- URL source et cible
- Texte d'ancre
- Type (dofollow/nofollow/ugc/sponsored)
- Score de spam
- Position sémantique dans la page (header, footer, main content)
- Statut (actif/cassé)
- Première/dernière détection

#### 6.2.3 Distribution des ancres

**Endpoint :** `POST /v3/backlinks/anchors/live`

Retourne la distribution des textes d'ancre avec le nombre de domaines référents par ancre. Essentiel pour détecter une sur-optimisation ou un profil d'ancres non naturel.

#### 6.2.4 Domaines référents

**Endpoint :** `POST /v3/backlinks/referring_domains/live`

Détails par domaine : rank, TLD, type de plateforme, pays, nombre de backlinks depuis ce domaine.

### 6.3 Content Analysis API — Monitoring de mentions

**Base URL :** `https://api.dataforseo.com/v3/content_analysis/`

**Important :** Ce n'est PAS un outil d'analyse de contenu on-page. C'est un outil de **monitoring de citations/mentions** sur le web avec analyse de sentiment.

**Usage pertinent pour le projet :** Surveiller les mentions d'un blog ou d'une marque, pas pour l'audit de contenu des articles.

### 6.4 Workflow d'audit recommandé

```
AUDIT RAPIDE (article unique — pendant l'édition) :
  └─ instant_pages(url) → checks SEO immédiats
     Coût : ~$0.001/page

AUDIT COMPLET (blog entier) :
  ÉTAPE 1 — Crawl async :
    └─ task_post(domain, max_pages=500, load_resources, JS, keyword_density, spelling, content_parsing)
       Coût : ~$0.70 pour 500 pages
                    ↓
  ÉTAPE 2 — Attente pingback
                    ↓
  ÉTAPE 3 — Récupération (tous gratuits) :
    ├─ summary → vue globale
    ├─ pages → détails par page
    ├─ duplicate_content → doublons
    ├─ links → maillage + liens cassés
    ├─ redirect_chains → redirections
    └─ non_indexable → pages exclues
                    ↓
  ÉTAPE 4 — Backlinks (optionnel) :
    ├─ backlinks/summary → profil global
    ├─ backlinks/anchors → distribution ancres
    └─ backlinks/referring_domains → sources
       Coût : ~$0.09 (3 requêtes)
                    ↓
  ÉTAPE 5 — Score et rapport
```

**Coût total audit complet (500 pages + backlinks) : ~$0.79**

---

## 7. Pricing détaillé et optimisation des coûts

### 7.1 Modèle économique

- **Pay-as-you-go** — pas d'abonnement, pas de frais cachés
- **Dépôt minimum :** $50 (crédité sur le solde)
- **Essai gratuit :** $1 crédité à l'inscription (sans CB)
- **Sandbox :** Gratuit et illimité (`sandbox.dataforseo.com`)
- **Limites de dépenses quotidiennes :** Configurables dans le dashboard

### 7.2 Tableau des coûts par endpoint

#### DataForSEO Labs API

| Endpoint | Coût/task | Coût/item | Avec clickstream |
|----------|-----------|-----------|-----------------|
| keyword_overview | $0.01 | $0.0001 | 2x |
| keyword_suggestions | $0.01 | $0.0001 | 2x |
| related_keywords | $0.01 | $0.0001 | 2x |
| keyword_ideas | $0.01 | $0.0001 | 2x |
| bulk_keyword_difficulty | $0.01 | $0.0001 | N/A |
| keywords_for_site | $0.01 | $0.0001 | 2x |
| keywords_for_categories | $0.01 | $0.0001 | 2x |
| top_searches | $0.01 | $0.0001 | 2x |
| serp_competitors | $0.01 | $0.0001 | N/A |
| categories_for_keywords | $0.01 | $0.0001 | N/A |
| **search_intent** | **$0.001** | **$0.0001** | N/A |

#### Keywords Data API (Google Ads)

| Endpoint | Standard/task | Live/task | KW/task |
|----------|--------------|-----------|---------|
| search_volume | $0.05 | $0.075 | 1 000 |
| keywords_for_site | $0.05 | $0.075 | 2 000 retournés |
| keywords_for_keywords | $0.05 | $0.075 | 20 000 retournés |

#### SERP API

| Méthode | Coût/SERP (10 résultats) |
|---------|-------------------------|
| Standard Normal | $0.0006 |
| Standard Priority | $0.0012 |
| Live | $0.002 |

#### On-Page API

| Configuration | Coût/page |
|--------------|-----------|
| Base | $0.000125 |
| + load_resources | $0.000250 |
| + enable_javascript | $0.001125 |
| + calculate_keyword_density | $0.000250 |
| + enable_browser_rendering | $0.004125 |

#### Backlinks API

| Composant | Coût |
|-----------|------|
| Par requête | $0.02 |
| Par row (max 1000/req) | $0.00003 |
| 1 req + 1000 rows | $0.05 |

### 7.3 Coûts actuels du projet par opération

| Opération | Endpoints appelés | Coût estimé |
|-----------|------------------|-------------|
| **getBrief()** (1 mot-clé) | SERP Regular + SERP Advanced + Related KW + KW Overview | ~$0.034 |
| **auditCocoonKeywords()** (1 KW) | KW Overview + Related KW (+ suggestions fallback) | ~$0.030-0.040 |
| **Cocon 10 KW** (brief complet) | 10 × getBrief | ~$0.34 |
| **Audit 50 KW** | 50 × audit | ~$1.50-2.00 |

### 7.4 Stratégies d'optimisation des coûts

1. **Batch keyword_overview** : Envoyer jusqu'à 700 KW par requête au lieu de 1 par 1 → économie massive sur les $0.01/task
2. **Batch search_intent** : 1 000 KW par requête à seulement $0.001/task
3. **Batch bulk_keyword_difficulty** : 1 000 KW par requête
4. **Mode Standard** pour les audits batch (non temps réel) : SERP passe de $0.002 à $0.0006 (3.3x moins cher)
5. **Ne pas activer `include_clickstream_data`** sauf besoin spécifique (double le coût)
6. **Cache agressif** : Les résultats restent valides 30 jours côté DataForSEO ; le cache fichier actuel est pertinent
7. **`max_crawl_pages`** : Toujours le définir pour contrôler les coûts On-Page
8. **Limites de dépenses quotidiennes** dans le dashboard DataForSEO
9. **Paralléliser par batch** plutôt que séquentiellement (la limite est 30 simultanées)
10. **Utiliser le sandbox** (`sandbox.dataforseo.com`) pour le développement

### 7.5 Projections de coûts pour les nouvelles fonctionnalités

| Fonctionnalité | Coût unitaire estimé | Usage mensuel typique | Coût mensuel |
|----------------|---------------------|----------------------|--------------|
| Découverte KW (1 pilier → classification) | ~$0.21 | 20 explorations | ~$4.20 |
| Remplacement KW (1 suggestion) | ~$0.03 | 50 remplacements | ~$1.50 |
| Audit rapide (1 page) | ~$0.001 | 200 audits | ~$0.20 |
| Audit complet blog (500 pages) | ~$0.79 | 2 audits | ~$1.58 |
| **TOTAL MENSUEL ESTIMÉ** | | | **~$7.50** |

---

## 8. Patterns d'intégration et recommandations d'implémentation

### 8.1 Optimisations du service existant

#### 8.1.1 Batch keyword_overview (priorité haute)

**Actuellement :** 1 appel par mot-clé dans `auditCocoonKeywords()`
**Recommandé :** Grouper jusqu'à 700 mots-clés par appel

```typescript
// Avant : N appels × $0.02 chacun
for (const kw of keywords) {
  await fetchKeywordOverview(kw)
}

// Après : 1 appel × $0.02 pour N mots-clés (N ≤ 700)
const allOverviews = await fetchKeywordOverviewBatch(keywords)
```

**Économie :** Pour un cocon de 15 KW : $0.30 → $0.02 (15x moins cher)

#### 8.1.2 Parallélisation de l'audit

**Actuellement :** Séquentiel avec 200ms entre chaque requête
**Recommandé :** Batch par lots de 10-15 requêtes parallèles (limite : 30 simultanées)

#### 8.1.3 Ajout de search_intent

Le endpoint `search_intent` est très bon marché ($0.001/task + $0.0001/KW) et apporte une information cruciale pour la classification. À ajouter systématiquement.

### 8.2 Architecture recommandée pour les nouvelles fonctionnalités

#### 8.2.1 Service de découverte de mots-clés

```typescript
// Nouveau service : server/services/keyword-discovery.service.ts

interface KeywordDiscoveryResult {
  pillar: ClassifiedKeyword[]
  mediumTail: ClassifiedKeyword[]
  longTail: ClassifiedKeyword[]
  totalFound: number
  apiCost: number
}

interface ClassifiedKeyword {
  keyword: string
  type: 'pilier' | 'moyenne_traine' | 'longue_traine'
  searchVolume: number
  difficulty: number
  cpc: number
  competition: number
  competitionLevel: string
  wordsCount: number
  intent: string
  intentProbability: number
  coreKeyword: string
  compositeScore: number
  serpFeatures: string[]
  monthlyTrend: { monthly: number; quarterly: number; yearly: number }
}

async function discoverKeywords(
  seedKeyword: string,
  options?: { maxResults?: number; includeIntent?: boolean }
): Promise<KeywordDiscoveryResult>
```

#### 8.2.2 Service de suggestions de remplacement

```typescript
// Nouveau service : server/services/keyword-replacement.service.ts

interface ReplacementSuggestion {
  keyword: string
  compositeScore: number
  improvement: number  // delta vs mot-clé original
  reason: string       // pourquoi ce candidat est meilleur
  metrics: {
    searchVolume: number
    difficulty: number
    cpc: number
    competition: number
  }
}

interface ReplacementResult {
  originalKeyword: string
  originalScore: number
  problem: 'zero_volume' | 'low_volume' | 'high_difficulty' | 'low_composite' | 'redundant'
  suggestions: ReplacementSuggestion[]
  apiCost: number
}

async function findReplacements(
  keyword: string,
  problem: string,
  cocoonKeywords?: string[]
): Promise<ReplacementResult>
```

#### 8.2.3 Service d'audit de site

```typescript
// Nouveau service : server/services/site-audit.service.ts

interface SiteAuditResult {
  taskId: string
  status: 'crawling' | 'completed' | 'error'
  summary: {
    totalPages: number
    healthyPages: number
    pagesWithErrors: number
    sslValid: boolean
    robotsTxtValid: boolean
    sitemapFound: boolean
    http2Supported: boolean
  }
  issues: SeoIssue[]
  duplicateContent: DuplicatePair[]
  brokenLinks: BrokenLink[]
  redirectChains: RedirectChain[]
}

// Audit rapide d'une page (pendant l'édition)
async function auditSinglePage(url: string): Promise<PageAuditResult>

// Audit complet du blog (async)
async function startFullAudit(domain: string, maxPages: number): Promise<{ taskId: string }>
async function getAuditStatus(taskId: string): Promise<SiteAuditResult>
```

### 8.3 Routes API recommandées

```
# Découverte de mots-clés
POST /api/keywords/discover          → discoverKeywords(seed)
  Body: { keyword: string, options?: { maxResults: number } }

# Suggestions de remplacement
POST /api/keywords/suggest-replacement → findReplacements(keyword, problem)
  Body: { keyword: string, problem: string, cocoonKeywords?: string[] }

# Audit de page unique (sync)
POST /api/audit/page                 → auditSinglePage(url)
  Body: { url: string }

# Audit de site complet (async)
POST /api/audit/site                 → startFullAudit(domain, maxPages)
  Body: { domain: string, maxPages: number }

GET  /api/audit/site/:taskId         → getAuditStatus(taskId)

# Webhook callback pour audit async
POST /api/webhook/onpage             → handleOnPageCallback(taskId)
```

### 8.4 Gestion des coûts côté UI

Recommandation : afficher le coût estimé avant chaque opération significative.

```typescript
// Estimation avant appel
const COST_ESTIMATES = {
  discoverKeywords: 0.21,       // par pilier exploré
  suggestReplacement: 0.03,     // par mot-clé
  auditSinglePage: 0.001,      // par page
  auditFullSite: (pages: number) => pages * 0.0014 + 0.09,  // crawl + backlinks
  getBrief: 0.034,              // par mot-clé
  auditCocoonBatch: (n: number) => 0.02 + Math.ceil(n / 700) * 0.01,  // batch optimisé
}
```

### 8.5 Stratégie de cache enrichie

```typescript
// Extension du cache existant
interface EnrichedCacheEntry extends DataForSeoCacheEntry {
  // Existant
  keyword: string
  serp: SerpResult[]
  paa: PaaQuestion[]
  relatedKeywords: RelatedKeyword[]
  keywordData: KeywordOverview
  cachedAt: string

  // Nouveaux champs
  intent?: { label: string; probability: number }
  classification?: 'pilier' | 'moyenne_traine' | 'longue_traine'
  discoveredKeywords?: ClassifiedKeyword[]  // suggestions trouvées
  replacementSuggestions?: ReplacementSuggestion[]  // remplacements proposés
  pageAudit?: PageAuditResult  // dernier audit de la page de l'article
}
```

### 8.6 Utilisation du Sandbox pour le développement

```typescript
const DATAFORSEO_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'https://sandbox.dataforseo.com/v3'
  : 'https://api.dataforseo.com/v3'
```

Le sandbox retourne des données fictives avec la même structure de réponse. Aucun changement de code nécessaire au-delà du hostname. Pas de coût. Mêmes rate limits.

---

## 9. Sources

### Documentation officielle DataForSEO
- [API v3 Documentation](https://docs.dataforseo.com/v3/)
- [Keywords Data API Overview](https://docs.dataforseo.com/v3/keywords-data-overview/)
- [DataForSEO Labs API Overview](https://docs.dataforseo.com/v3/dataforseo_labs/overview/)
- [On-Page API Overview](https://docs.dataforseo.com/v3/on_page/)
- [Backlinks API Overview](https://docs.dataforseo.com/v3/backlinks/)
- [Content Analysis API Overview](https://docs.dataforseo.com/v3/content_analysis/)

### Endpoints Keywords
- [Google Ads Search Volume Live](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)
- [Google Ads Keywords For Site Live](https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_site/live/)
- [Google Ads Keywords For Keywords Live](https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live/)
- [Labs Keyword Overview Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/)
- [Labs Keyword Suggestions Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live/)
- [Labs Related Keywords Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live/)
- [Labs Keyword Ideas Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/)
- [Labs Bulk Keyword Difficulty Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_keyword_difficulty/live/)
- [Labs Search Intent Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/search_intent/live/)
- [Labs Keywords For Site Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/keywords_for_site/live/)
- [Labs Keywords For Categories Live](https://docs.dataforseo.com/v3/dataforseo_labs/google/keywords_for_categories/live/)

### Endpoints Audit
- [On-Page Task POST](https://docs.dataforseo.com/v3/on_page/task_post/)
- [On-Page Summary](https://docs.dataforseo.com/v3/on_page/summary/)
- [On-Page Pages](https://docs.dataforseo.com/v3/on_page/pages/)
- [On-Page Instant Pages](https://docs.dataforseo.com/v3/on_page/instant_pages/)
- [On-Page Duplicate Content](https://docs.dataforseo.com/v3/on_page/duplicate_content/)
- [On-Page Lighthouse Live](https://docs.dataforseo.com/v3/on_page/lighthouse/live/)
- [Backlinks Summary Live](https://docs.dataforseo.com/v3/backlinks/summary/live/)
- [Backlinks Backlinks Live](https://docs.dataforseo.com/v3/backlinks/backlinks/live/)
- [Backlinks Anchors Live](https://docs.dataforseo.com/v3/backlinks/anchors/live/)

### Pricing et Limites
- [DataForSEO Pricing](https://dataforseo.com/pricing)
- [Labs Google Pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)
- [SERP API Pricing](https://dataforseo.com/apis/serp-api/pricing)
- [On-Page Pricing](https://dataforseo.com/pricing/on-page/onpage-api)
- [Backlinks Pricing](https://dataforseo.com/pricing/backlinks/backlinks)
- [Rate Limits](https://dataforseo.com/help-center/rate-limits-and-request-limits)
- [Sandbox Documentation](https://docs.dataforseo.com/v3/appendix/sandbox/)
- [Authentication](https://docs.dataforseo.com/v3/auth/)
- [Error Codes](https://docs.dataforseo.com/v3/appendix/errors/)
- [Best Practices Live Endpoints](https://dataforseo.com/help-center/best-practices-live-endpoints-in-dataforseo-api)
- [Best Practices Keywords Data](https://dataforseo.com/help-center/best-practices-for-handling-keywords-data-api-requests)

### SDK
- [NPM: dataforseo-client](https://www.npmjs.com/package/dataforseo-client)
- [GitHub: TypeScriptClient](https://github.com/dataforseo/TypeScriptClient)
