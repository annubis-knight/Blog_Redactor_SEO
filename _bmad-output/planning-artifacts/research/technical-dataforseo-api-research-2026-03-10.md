---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'API DataForSEO — Guide complet et intégration Blog Redactor SEO'
research_goals: 'Tout savoir sur DataForSEO, deep-dive technique sur tous les modules, mise en valeur des fonctions utilisées dans le projet'
user_name: 'Arnau'
date: '2026-03-10'
web_research_enabled: true
source_verification: true
---

# API DataForSEO — Guide Technique Complet 2026

**Date:** 2026-03-10
**Auteur:** Arnau
**Confiance:** Haute (sources multiples, documentation officielle vérifiée)

---

## Table des matières

1. [Vue d'ensemble de l'API](#1-vue-densemble-de-lapi)
2. [Authentification et configuration](#2-authentification-et-configuration)
3. [SERP API — Deep-dive (UTILISÉ DANS LE PROJET)](#3-serp-api--deep-dive)
4. [DataForSEO Labs API — Deep-dive (UTILISÉ DANS LE PROJET)](#4-dataforseo-labs-api--deep-dive)
5. [Intégration actuelle dans Blog Redactor SEO](#5-intégration-actuelle-dans-blog-redactor-seo)
6. [Autres modules API](#6-autres-modules-api)
7. [Nouveautés et changements 2025-2026](#7-nouveautés-et-changements-2025-2026)
8. [Bonnes pratiques d'intégration](#8-bonnes-pratiques-dintégration)
9. [Endpoints potentiels pour enrichir le projet](#9-endpoints-potentiels-pour-enrichir-le-projet)
10. [Synthèse et recommandations](#10-synthèse-et-recommandations)
11. [Sources](#11-sources)

---

## 1. Vue d'ensemble de l'API

### Statistiques clés

| Métrique | Valeur |
|----------|--------|
| Base de mots-clés | 7.8+ milliards |
| SERPs Google crawlés | 570+ millions |
| Backlinks en direct | 2.1+ trillions |
| Domaines analysés | 36+ millions |
| Technologies détectées | 2 460+ |
| Disponibilité garantie | 99.95% |

### Architecture générale

- **URL de base**: `https://api.dataforseo.com/v3/`
- **Version actuelle**: v3 (v2 en fin de support — arrêt le 5 mai 2026)
- **Format**: JSON (XML et HTML disponibles en ajoutant `.xml` ou `.html` à l'URL)
- **Encodage**: UTF-8 obligatoire
- **Méthode**: POST pour soumettre, GET pour récupérer (ou Live = POST+réponse immédiate)

### Catalogue des 12 modules API

| # | Module | Description | Pertinence projet |
|---|--------|-------------|-------------------|
| 1 | **SERP API** | Résultats moteurs de recherche temps réel | **UTILISÉ** |
| 2 | **DataForSEO Labs** | Analyse mots-clés et concurrence (3.5B+ KW) | **UTILISÉ** |
| 3 | **OnPage API** | Audit SEO technique, 120+ métriques | Haute |
| 4 | **Backlinks API** | Analyse profil de liens, 2.1T+ liens | Haute |
| 5 | **Content Analysis API** | Analyse de sentiment, citations, NLP | Moyenne |
| 6 | **Content Generation API** | Génération texte IA, paraphrase, méta-tags | Haute |
| 7 | **Keywords Data API** | Volume Google Ads/Bing/Clickstream | Moyenne |
| 8 | **Domain Analytics API** | Intelligence domaine, détection techno | Basse |
| 9 | **Business Data API** | Google My Business, avis, hôtels | Basse |
| 10 | **App Data API** | Données App Store/Play Store | Nulle |
| 11 | **Merchant API** | Google Shopping, prix Amazon | Nulle |
| 12 | **AI Optimization API** | Mentions marques dans IA (LLM Mentions) | Émergente |

### Modèle tarifaire

- **Pay-as-you-go** : crédit prépayé, pas d'abonnement
- **Dépôt minimum initial** : $50 USD
- **Crédit gratuit** : $1 offert à l'inscription
- **Sandbox gratuit** : `sandbox.dataforseo.com` (même structure, données génériques)
- **Crédits non utilisés** : n'expirent jamais
- **Stockage résultats** : 30 jours (Standard), non stocké (Live), 7 jours (HTML)

---

## 2. Authentification et configuration

### Type : HTTP Basic Authentication

```
Authorization: Basic {base64(login:password)}
Content-Type: application/json
```

- **Login** : adresse email du compte
- **Password** : généré automatiquement (différent du mot de passe de compte)
- Accessible depuis : https://app.dataforseo.com/api-access
- Toujours dans le header, jamais en paramètre URL

### Rate limits globaux

| Limite | Valeur |
|--------|--------|
| Requêtes par minute (standard) | 2 000 |
| Tâches par requête POST | 100 max |
| Requêtes simultanées (DB-based APIs) | 30 max |
| Débit théorique max | ~1 800 req/min |

### Limites spécifiques par endpoint

| Endpoint | Limite |
|----------|--------|
| Live Google Ads | 12 req/min |
| Live Google Trends | 250 tâches/min |
| User Data | 6 req/min |
| API Status & Errors | 10 req/min |
| Tasks Ready | 20 req/min |
| OnPage Instant Pages | 20 tâches/req |

### Headers de suivi

```
X-RateLimit-Limit: plafond par minute
X-RateLimit-Remaining: requêtes restantes
```

### SDKs officiels

| Langage | Package |
|---------|---------|
| TypeScript/Node.js | `dataforseo-client` (npm) |
| Python | `dataforseo-client` (PyPI) |
| Java | Maven |
| C# | NuGet |
| PHP | Community SDK |

---

## 3. SERP API — Deep-dive

> **UTILISÉ DANS LE PROJET** — 2 endpoints actuellement exploités

### 3.1 Moteurs de recherche supportés

| Moteur | Support | Notes |
|--------|---------|-------|
| **Google** | Complet | Tous types (organic, images, videos, news, jobs, shopping, maps, financial) |
| Bing | Complet | Organic + local pack |
| YouTube | Complet | Vidéos, commentaires, sous-titres |
| Yahoo | Basique | Organic temps réel |
| Baidu | Basique | Top 100 résultats |
| Naver | Basique | Moteur coréen, 15 résultats par page |
| Seznam | Basique | Moteur tchèque |

### 3.2 Types de tâches

| Type | Données | Use case |
|------|---------|----------|
| **Regular** | Résultats organiques + annonces payantes | Besoin basique, classement simple |
| **Advanced** | Vue SERP complète (snippets, knowledge graph, PAA, etc.) | Analyse détaillée |
| **HTML** | Page HTML brute du SERP | Analyse personnalisée |

### 3.3 Modes de livraison

| Mode | Coût/requête | Délai | Processus |
|------|-------------|-------|-----------|
| **Live** | $0.002 | Instantané | POST = réponse directe |
| Standard Normal | $0.0006 | ~5 min | POST puis GET |
| Standard High | $0.0012 | ~1 min | POST puis GET |

**Calcul pages supplémentaires** : 0.75 x prix de base par page additionnelle (réduction 25%)

### 3.4 Paramètres principaux

| Paramètre | Type | Description |
|-----------|------|-------------|
| `keyword` | string | Terme recherche (UTF-8, max 700 chars) |
| `location_code` | int | Code géo (ex: 2250 = France) |
| `language_code` | string | Code langue (ex: "fr") |
| `device` | enum | "desktop" ou "mobile" |
| `os` | enum | iOS, Android, Windows, macOS |
| `search_type` | enum | organic, news, images, jobs, videos, maps, shopping |
| `depth` | int | Nombre de pages (défaut: 10 résultats) |
| `stop_crawl_on_match` | array | **NOUVEAU 2025** — Arrêt automatique sur correspondance |

### 3.5 Types d'éléments SERP retournés (Advanced)

**Éléments de base :**
- `organic` — Résultats organiques standards
- `paid` — Annonces Google Ads
- `featured_snippet` — Position zéro

**Connaissance & IA :**
- `knowledge_graph` — Avec sous-types : images, description, carousel, shopping, hotels, **ai_overview**
- `answer_box` — Réponses directes
- `people_also_ask` — Questions associées (avec `people_also_ask_ai_overview_expanded_element` **NOUVEAU 2025**)
- `ai_overview` — Vue d'ensemble IA Google (**NOUVEAU 2025**)

**Local & Géographique :**
- `local_pack` — Google Maps 3-pack
- `map` — Résultats carte
- `local_services` — Services locaux

**Shopping & E-commerce :**
- `shopping`, `popular_products`, `product_consideration`, `compare_sites`

**Média & Contenu :**
- `images`, `video`, `top_stories`, `recipes`, `podcasts`, `scholarly_articles`

**Social :**
- `twitter`, `discussions`, `forums`, `google_posts`, `google_reviews`

**Spécialisé :**
- `jobs`, `events`, `stocks_box`, `currency_box`, `math_solver`, `perspectives`

### 3.6 Structure de réponse

```json
{
  "status_code": 20000,
  "status_message": "Ok.",
  "tasks": [{
    "status_code": 20000,
    "result": [{
      "keyword": "refonte site web pme",
      "check_url": "https://www.google.fr/search?q=...",
      "spell": null,
      "se_results_count": 1250000,
      "items_count": 10,
      "items": [
        {
          "type": "organic",
          "rank_group": 1,
          "rank_absolute": 1,
          "domain": "example.com",
          "url": "https://example.com/page",
          "title": "...",
          "description": "...",
          "breadcrumb": "...",
          "etv": 450.5,
          "estimated_paid_traffic_cost": 12.3
        }
      ]
    }]
  }]
}
```

### 3.7 Endpoint AI Mode (NOUVEAU 2025)

```
POST /v3/serp/google/ai_mode/live/advanced
```

- Résultats générés par l'IA Google
- Réponse avec `markdown` (texte formaté) et `references` (sources citées)
- **Coût : $0.004** (double du prix standard)

---

## 4. DataForSEO Labs API — Deep-dive

> **UTILISÉ DANS LE PROJET** — 2 endpoints actuellement exploités

### 4.1 Caractéristiques générales

- Base de données propriétaire : **3.5+ milliards de mots-clés**
- **Mode Live uniquement** (résultats immédiats)
- Tarification : à partir de $1.10 par 10 000 mots-clés
- Requêtes simultanées max : 30

### 4.2 Endpoints de recherche de mots-clés

#### `keyword_overview` — **UTILISÉ DANS LE PROJET**

```
POST /v3/dataforseo_labs/google/keyword_overview/live
```

| Paramètre | Type | Détails |
|-----------|------|---------|
| `keywords` | array | Max 700 mots-clés, 80 chars / 10 mots chacun |
| `location_code` | int | Code géolocalisation |
| `language_code` | string | Code langue |
| `include_serp_info` | bool | Données SERP optionnelles |
| `include_clickstream_data` | bool | **Double le coût** — données démographiques |

**Réponse :**
- `search_volume` — Recherches mensuelles
- `competition` / `competition_level` — Compétition payante (0-1 / LOW/MEDIUM/HIGH)
- `cpc` — Coût moyen par clic
- `low_top_of_page_bid` / `high_top_of_page_bid` — Gammes enchères
- `monthly_searches` — Historique 12 mois
- `keyword_properties` — Mot-clé core, difficulté, langue détectée
- `serp_info` — Décomptes résultats, features SERP
- `avg_backlinks_info` — Domaines référents, rang moyen top-10
- `search_intent_info` — Intent (informational / navigational / commercial / transactional)
- `clickstream_keyword_info` (optionnel) — Démographie genre/âge, volume clickstream

**Note Mars 2025** : Cet endpoint remplace le legacy `historical_search_volume`. Mise à jour continue vs endpoint legacy gelé.

---

#### `related_keywords` — **UTILISÉ DANS LE PROJET**

```
POST /v3/dataforseo_labs/google/related_keywords/live
```

| Paramètre | Type | Détails |
|-----------|------|---------|
| `keyword` | string | Terme semence (UTF-8, minuscules) |
| `location_code` | int | Code géolocalisation |
| `language_code` | string | Code langue |
| `depth` | int (0-4) | Profondeur recherche — jusqu'à ~4 680 suggestions |
| `limit` | int (max 1000) | Résultats par page (défaut: 100) |
| `include_serp_info` | bool | Données SERP optionnelles |
| `include_clickstream_data` | bool | **Double le coût** |
| `ignore_synonyms` | bool | Filtrer les synonymes |
| `filters` | array (max 8) | Conditions de filtrage |
| `order_by` | array (max 3) | Règles de tri |

**Réponse (par mot-clé) :**
- `keyword` — Terme associé
- `search_volume` — Recherches mensuelles
- `competition` / `competition_level`
- `cpc` — Coût par clic (USD)
- `monthly_searches` — Historique 12 mois
- `search_volume_trend` — Changements mensuels/trimestriels/annuels
- `keyword_properties` — Score difficulté, mots-clés core
- `avg_backlinks_info` — Métriques backlinks pages top-10
- `search_intent_info` — Classification intent

---

#### `keyword_suggestions`

```
POST /v3/dataforseo_labs/google/keyword_suggestions/live
```

- Suggestions contenant le mot-clé semence avec mots avant/après
- Paramètres : `exact_match`, `ignore_synonyms`, `include_seed_keyword`
- Max 1000 résultats, support pagination via `offset_token`

#### `keyword_ideas`

```
POST /v3/dataforseo_labs/google/keyword_ideas/live
```

- Génère des idées de mots-clés par catégorie produit/service
- Accepte max 200 mots-clés semence
- `closely_variants` pour correspondance phrase

#### `bulk_keyword_difficulty`

```
POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live
```

- Jusqu'à **1 000 mots-clés** par requête
- Score 0-100 (logarithmique) basé sur profil liens top-10
- Coût : ~$0.0103 crédits par requête

#### `search_intent`

```
POST /v3/dataforseo_labs/google/search_intent/live
```

- Jusqu'à **1 000 mots-clés** par requête
- Classification : informational, navigational, commercial, transactional
- Probabilités (0-1) + intents secondaires
- Machine learning custom (propriétés linguistiques + données SERP)
- Support : **30+ langues**

### 4.3 Endpoints de domaine & concurrence

| Endpoint | Description | Paramètre principal |
|----------|-------------|---------------------|
| `keywords_for_site` | Mots-clés pertinents pour un domaine | `target` (domaine) |
| `ranked_keywords` | Mots-clés où un domaine se classe | `target` (domaine/URL) |
| `competitors_domain` | Domaines concurrents | `target` (domaine) |
| `domain_intersection` | Mots-clés communs entre 2 domaines | `target1`, `target2` |
| `serp_competitors` | Concurrents pour des mots-clés spécifiques | `keywords` (array) |
| `categories_for_domain` | Catégories Google Ads d'un domaine | `target` (domaine) |
| `top_searches` | Recherches populaires (7B+ mots-clés) | Filtres personnalisés |

### 4.4 Historical Keyword Data

```
POST /v3/dataforseo_labs/google/historical_keyword_data/live
```

- Historique mensuel depuis **2019**
- Volumes, CPC, compétition sur 5+ ans
- **NOUVEAU Mars 2025** — Endpoint dédié remplaçant le legacy

### 4.5 Algorithmes de clustering (7 disponibles)

1. **Intent-based** — Organisation par intention de recherche
2. **Category-based** — Via catégories Google Ads
3. **Domain-based** — Pertinence par domaine cible
4. + 4 autres algorithmes spécialisés

Données : `core_keyword`, `synonym_clustering_algorithm`, `keyword_difficulty`

---

## 5. Intégration actuelle dans Blog Redactor SEO

### 5.1 Architecture de l'intégration

```
┌─────────────────────────────────────────────────────┐
│ Frontend (Vue 3 + Pinia)                            │
│                                                     │
│  DataForSeoPanel.vue ──► brief.store.ts             │
│  KeywordHealthAlerts.vue  useSeoScoring.ts          │
│  SeoPanel.vue                                       │
│                                                     │
│  POST /api/dataforseo/brief {keyword, forceRefresh} │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Backend (Express + TypeScript)                       │
│                                                     │
│  dataforseo.routes.ts ──► dataforseo.service.ts     │
│  Validation Zod ──► briefRequestSchema              │
│                                                     │
│  getBrief(keyword, forceRefresh?)                   │
│    ├─ Cache check (data/cache/{slug}.json)          │
│    └─ Promise.allSettled([                           │
│         fetchSerp()            → SERP Regular        │
│         fetchPaa()             → SERP Advanced       │
│         fetchRelatedKeywords() → Labs Related KW     │
│         fetchKeywordOverview() → Labs KW Overview    │
│       ])                                            │
└─────────────────────────────────────────────────────┘
```

### 5.2 Les 4 endpoints utilisés

| # | Endpoint | Path API | Données extraites |
|---|----------|----------|-------------------|
| 1 | SERP Regular | `/serp/google/organic/live/regular` | Top 10 résultats organiques |
| 2 | SERP Advanced | `/serp/google/organic/live/advanced` | People Also Ask |
| 3 | Related Keywords | `/dataforseo_labs/google/related_keywords/live` | Mots-clés sémantiques (depth=2, limit=50) |
| 4 | Keyword Overview | `/dataforseo_labs/google/keyword_overview/live` | Volume, difficulté, CPC, compétition |

### 5.3 Données collectées et leur utilisation

**SERP Results (Top 10)**
```typescript
interface SerpResult {
  position: number    // rank_group
  title: string
  url: string
  description: string
  domain: string
}
```
- Affichage dans DataForSeoPanel (table collapsible)
- Évaluation santé du mot-clé (détection SERP vide)

**People Also Ask**
```typescript
interface PaaQuestion {
  question: string
  answer: string | null
}
```
- Filtrage `type === 'people_also_ask'` depuis SERP Advanced
- Alerte si aucune PAA trouvée (pas d'opportunité position zéro)
- Intégration dans l'outline de l'article

**Related Keywords**
```typescript
interface RelatedKeyword {
  keyword: string
  searchVolume: number
  competition: number
  cpc: number
}
```
- Table triable dans le DataForSeoPanel
- Détection termes NLP dans le store SEO
- Calculs de scoring SEO

**Keyword Overview**
```typescript
interface KeywordOverview {
  searchVolume: number
  difficulty: number      // 0-100
  cpc: number
  competition: number     // 0-1
  monthlySearches: number[]
}
```
- 4 cartes d'overview (Volume, Difficulté, CPC, Compétition)
- Évaluation santé mot-clé
- Recommandations longueur contenu

### 5.4 Configuration technique actuelle

```bash
# .env
DATAFORSEO_LOGIN=email@example.com
DATAFORSEO_PASSWORD=auto-generated-password
```

- **Localisation** : `2250` (France)
- **Langue** : `'fr'`
- **Retry** : Max 3 tentatives, exponential backoff (1s → 2s → 4s)
- **Retry sur** : HTTP 429 (rate limit) et 503 (service unavailable)
- **Cache** : `data/cache/{keyword-slug}.json`, TTL illimité, invalidation manuelle via `forceRefresh`
- **Dégradation gracieuse** : `Promise.allSettled` — les échecs individuels retournent des tableaux vides

### 5.5 Alertes santé mot-clé (frontend)

| Niveau | Condition | Message |
|--------|-----------|---------|
| Danger | Volume = 0 | "Aucun volume de recherche — ce mot-clé n'existe pas" |
| Danger | SERP vide | "Aucun résultat SERP — mot-clé trop spécifique ou mal orthographié" |
| Warning | Volume < seuil | "Volume très faible (X/mois) — trafic limité" |
| Warning | Difficulté > seuil | "Difficulté élevée (X/100) — concurrence forte" |
| Warning | Pas de PAA | "Aucune PAA — pas d'opportunité de position zéro" |
| OK | Viable | "Mot-clé viable — volume et concurrence corrects" |

---

## 6. Autres modules API

### 6.1 OnPage API — Audit SEO technique

**Endpoints clés :**
- `on_page/pages` — Analyse détaillée par page (120+ métriques)
- `on_page/instant_pages` — Analyse rapide Live
- `on_page/links` — Liens internes/externes + validation hreflang
- `on_page/content_parsing` — Analyse contenu + support **Markdown** (NOUVEAU 2025)
- `on_page/keyword_density` — Densité de mots-clés
- `on_page/duplicate_content` — Détection doublons
- `on_page/lighthouse/audits` — Intégration Google Lighthouse
- `on_page/waterfall` — Insights vitesse de page

**Capacités techniques :**
- Crawling JavaScript-friendly avec rendu navigateur
- Exécution JavaScript personnalisé (`custom_js`)
- Stockage HTML brut
- **NOUVEAU 2025** : `page_as_markdown` avec `markdown_view: true`
- **NOUVEAU 2025** : `table_content` pour extraction de tables structurées

### 6.2 Backlinks API — Analyse des liens

**Endpoints clés :**
- `backlinks/backlinks/live` — Backlinks bruts
- `backlinks/summary` — Vue d'ensemble profil
- `backlinks/history` — Historique depuis 2019
- `backlinks/anchors` — Analyse textes d'ancre
- `backlinks/referring_domains` — Domaines référents
- `backlinks/competitors` — Analyse comparative
- Endpoints **bulk** : jusqu'à 1 000 domaines par requête

**NOUVEAUTÉS 2025 :**
- `rank_scale` : choix échelle 0-100 ou 0-1000
- Support liens indirects (redirections/canoniques)
- `ranked_keywords_info` — infos classement
- Distribution géographique par pays
- `include_subdomains` étendu à plus d'endpoints

### 6.3 Content Analysis API — NLP et sentiment

- `content_analysis/search` — Citations d'un mot-clé/marque
- `content_analysis/summary` — Vue d'ensemble citations
- `content_analysis/sentiment_analysis` — Analyse granulaire
- Détection connotations : colère, bonheur, amour, tristesse, partage, amusement

### 6.4 Content Generation API — Génération IA

- `content_generation/generate` — Génération texte basée sur un contexte
- `content_generation/generate_text` — Génération par sujet
- `content_generation/generate_meta_tags` — Création title + description
- `content_generation/generate_subtopics` — 10 sous-thèmes suggérés
- `content_generation/paraphrase` — Réécriture de contenu
- `content_generation/check_grammar` — Vérification grammaire/orthographe
- Mode Live uniquement

### 6.5 Keywords Data API

- `keywords_data/google/search_volume/live` — Volume Google
- `keywords_data/google_ads/search_volume/live` — Données Google Ads brutes
- `keywords_data/clickstream_data/dataforseo_search_volume/live` — Volume Bing + clickstream
- Jusqu'à 1 000 mots-clés par requête
- Algorithme de raffinement DataForSEO (Google + Bing/Clickstream)

### 6.6 AI Optimization API (NOUVEAU 2025)

**LLM Mentions API :**
- Suivi mentions marques dans les modèles IA
- Sources : Google AI Overview (tous pays), ChatGPT (US, GPT-5)
- 5 endpoints : Search Mentions, Aggregated Metrics, Cross Aggregated, Top Domains, Top Pages
- **Fan-out queries** (nov 2025) : termes connexes générés par ChatGPT, Gemini, Claude, Perplexity
- **Brand Entity Detection** : identification automatique d'entités

**LLM Scraper :**
- Extraction structurée réponses Google Gemini et ChatGPT
- Live (30 requêtes simultanées) et Standard (2000 appels/min)

**Tarification :**
- Live : $0.01 par tâche
- Standard : $0.0002/tâche + $0.01 prépaiement
- LLM Mentions : $0.1/requête API, $0.001/ligne de données

### 6.7 DataForSEO Trends API

- Alternative fiable à Google Trends (accès illimité)
- Support : Google Search, News, Shopping
- Comparaison jusqu'à 5 termes
- Historique depuis 2004 (Web) ou 2008 (autres)

### 6.8 Domain Analytics, Business Data, App Data, Merchant

Voir section 1 pour le résumé. Pertinence très basse pour le projet Blog Redactor SEO.

---

## 7. Nouveautés et changements 2025-2026

### 7.1 Changements critiques (BREAKING)

#### Arrêt de l'API v2 — 5 mai 2026

- **Impact** : Fin complète du support v2
- **Migration** : Réductions en v3 (SERP -25/40%, Keywords Data -50%)
- **Action** : Le projet utilise déjà v3 — pas d'impact

#### Suppression du paramètre n=100 par Google (14 sept 2025)

- Google ne permet plus de récupérer 100 résultats en une requête
- **Impact** : 10 requêtes nécessaires pour obtenir 100 résultats (au lieu d'une)
- Couverture de base : 10 résultats (défaut)
- Réduction 25% sur pages supplémentaires
- **Impact projet** : Aucun — le projet ne récupère que 10 résultats

#### Dépréciation des endpoints SERP Lite (28 oct 2025)

- Endpoints Google Lite limités à 10 résultats
- Suppression prévue
- **Impact projet** : Aucun — le projet utilise Regular et Advanced

### 7.2 Nouveautés majeures

#### AI Overviews dans SERP API (2025)

- Nouveau type : `ai_overview` dans les résultats SERP
- Support PAA avec réponses IA : `people_also_ask_ai_overview_expanded_element`
- Champs `markdown` et `links` pour contenu IA structuré
- Éléments : `ai_overview_expanded_element`, `ai_overview_video_element`, `ai_overview_table_element`
- **Impact projet** : Opportunité — extraire les réponses IA pour enrichir les briefs

#### Google AI Mode (Mars 2025)

- Endpoint dédié : `/v3/serp/google/ai_mode/live/advanced`
- Résultats 100% générés par IA
- Markdown + références sources
- Coût double ($0.004)

#### Bing Copilot Search (Avril 2025)

- Support complet résumés Copilot dans Bing SERP
- Éléments IA dédiés (vidéo, images, organic intégrés)

#### Keyword Overview refonte (Mars 2025)

- Remplace le legacy Historical Search Volume
- Jusqu'à 700 mots-clés/requête
- Données intent de recherche et backlinks incluses
- Données clickstream optionnelles
- **Impact projet** : L'endpoint est déjà utilisé — vérifier si les nouveaux champs sont exploités

#### Historical Keyword Data (Mars 2025)

- Nouveau endpoint dédié aux données historiques
- Historique depuis 2019
- **Impact projet** : Potentiellement utile pour les tendances de mots-clés

#### stop_crawl_on_match (2025)

- Arrêt automatique du crawl SERP dès qu'un domaine cible est trouvé
- Jusqu'à 10 cibles, remboursement automatique des coûts non consommés
- Match types : `domain`, `with_subdomains`, `wildcard`
- **Impact projet** : Optimisation coûts potentielle pour le rank tracking

#### Support Markdown OnPage (2025)

- `page_as_markdown` via `markdown_view: true` dans Content Parsing
- Extraction de tables structurées (`table_content`)

#### DataForSEO MCP Server (10 mai 2025)

- Protocole Model Context Protocol pour agents IA (Claude, Cursor)
- Accès sans code à toutes les APIs
- **Impact projet** : Potentiellement utile pour intégration IA

#### Réponses API optimisées IA (2025)

- Formats JSON simplifiés pour LLMs
- Intégration facilitée dans applications IA

### 7.3 Dates clés

| Date | Événement |
|------|-----------|
| Mars 2025 | Keyword Overview et Historical Keyword Data refonte |
| Avril 2025 | Bing Copilot Search dans SERP API |
| Mai 2025 | DataForSEO MCP Server |
| Juillet 2025 | Champs Markdown + AI Overview enrichis |
| Septembre 2025 | Changement tarification SERP (Google supprime n=100) |
| Octobre 2025 | Dépréciation endpoints Lite |
| Novembre 2025 | Gemini Standard, Fan-out queries, Brand entities |
| **5 mai 2026** | **FIN du support API v2** |

---

## 8. Bonnes pratiques d'intégration

### 8.1 Rate limiting optimal

```
✅ Envoyer un flux constant de requêtes sur une durée longue
❌ Éviter les rafales de 1500-2000 req/min (surcharge système)
✅ Maximum 100 tâches par appel POST
✅ Utiliser callbacks/webhooks pour > 1000 tâches/minute
```

**Débit théorique :**
```
30 requêtes simultanées × ~70 req/min/thread = ~2100 req/min max
```

### 8.2 Stratégie de cache recommandée

| Donnée | TTL recommandé | Justification |
|--------|----------------|---------------|
| Keywords Data (volume, CPC) | 30 jours | Volume stable mois par mois |
| SERP Results | 7-14 jours | Changent graduellement |
| Backlinks | 7-15 jours | Évolution progressive |
| OnPage Audit | 3-7 jours | Selon activité du site |
| Content Generation | Pas de cache | Contenu frais requis |
| Content Analysis (NLP) | 30 jours | Données stables |

**Hiérarchie recommandée :**
1. Cache local (Redis/fichier) : 24-48h pour requêtes fréquentes
2. Cache distribué : 7-15 jours pour données stables
3. Cache long terme (DB) : 30 jours pour audit historique

**Clé de cache idéale** : `{api}:{endpoint}:{paramètres_hash}:{date}`

> **Note projet** : L'implémentation actuelle (cache fichier illimité + forceRefresh) est fonctionnelle mais pourrait bénéficier d'un TTL automatique de 30 jours.

### 8.3 Gestion d'erreurs et retry

**Codes DataForSEO retourne TOUJOURS HTTP 200** — les vraies erreurs sont dans `status_code` interne.

| Code interne | Description | Retry ? |
|-------------|-------------|---------|
| 20000 | OK | Non |
| 20100 | Task Created | Non |
| 40100 | Not Authorized | Non — vérifier credentials |
| 40102 | No Search Results | Non — mot-clé invalide |
| 40200 | Payment Required | Non — recharger compte |
| 40202 | Rate Limit Exceeded | **Oui** — attendre 1 min |
| 40203 | Cost Limit Exceeded | Non — augmenter limite dashboard |
| 40210 | Insufficient Funds | Non — recharger |
| 50401 | Timeout (>120s) | **Oui** — exponential backoff |
| 50402 | Page too slow (>50s) | **Oui** — exponential backoff |

**Pattern retry recommandé :**
```typescript
async function apiCallWithRetry(request, maxRetries = 3, baseDelay = 200) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await makeAPICall(request);

    // Codes permanents — ne pas retry
    if ([40100, 40102, 40200, 40210].includes(response.status_code)) {
      throw new PermanentError(response);
    }

    // Codes temporaires — retry avec backoff
    if ([40202, 50401, 50402].includes(response.status_code)) {
      if (attempt === maxRetries) throw new TemporaryError(response);
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      await sleep(delay + jitter);
      continue;
    }

    return response; // Succès
  }
}
```

> **Note projet** : L'implémentation actuelle retry sur HTTP 429/503, mais devrait aussi gérer les codes internes 40202/50401/50402.

### 8.4 Optimisation des coûts

1. **Choisir le bon mode** : Standard ($0.0006) vs Live ($0.002) — 3.3x moins cher
2. **Limiter la profondeur** : Ne récupérer que les pages nécessaires
3. **Utiliser les endpoints bulk** : 1 000 cibles en 1 requête
4. **Éviter clickstream** sauf besoin démographique (double le coût)
5. **Monitorer le budget** : `max_crawl_pages`, alertes dépassement
6. **Exploiter le cache** : Éviter les requêtes redondantes
7. **stop_crawl_on_match** : Pour le rank tracking, arrêter dès la cible trouvée

### 8.5 Sandbox pour le développement

```
Base URL: https://sandbox.dataforseo.com/v3/
```

- **Gratuit** pour tous les utilisateurs enregistrés
- Même structure de réponse que production
- Même rate limits (2000 req/min)
- Données génériques mais structurellement identiques
- Idéal pour développement et tests d'intégration

### 8.6 Webhooks / Callbacks (méthode Standard)

**Pingbacks** — DataForSEO envoie les IDs de tâches terminées :
```json
{ "pingback_url": "https://yourdomain.com/api/pingback" }
```

**Postbacks** — DataForSEO envoie les résultats complets :
```json
{ "postback_url": "https://yourdomain.com/api/postback" }
```

- Timeout réponse : 10 secondes
- Si échec → tâche passe en "Tasks Ready" (récupérable via GET)

---

## 9. Endpoints potentiels pour enrichir le projet

### 9.1 Tier 1 — Impact élevé, intégration naturelle

| Endpoint | Utilité pour Blog Redactor SEO | Coût estimé |
|----------|--------------------------------|-------------|
| `search_intent` (Labs) | Classifier intent des mots-clés (informational/commercial/transactional) pour adapter le ton et la structure de l'article | Faible |
| `keyword_suggestions` (Labs) | Enrichir les suggestions de mots-clés au-delà des related keywords | Faible |
| `bulk_keyword_difficulty` (Labs) | Scorer en masse la difficulté des mots-clés du cocon | ~$0.01/batch |
| `content_generation/generate_meta_tags` | Générer automatiquement title + description optimisés | Par requête |
| `content_generation/generate_subtopics` | Suggérer 10 sous-thèmes pour enrichir l'outline | Par requête |
| AI Overviews (SERP Advanced) | Extraire les réponses IA de Google pour enrichir le brief | Déjà inclus |

### 9.2 Tier 2 — Impact moyen, développement modéré

| Endpoint | Utilité | Coût estimé |
|----------|---------|-------------|
| `on_page/content_parsing` | Analyser le contenu des pages concurrentes (top 10 SERP) | Modéré |
| `on_page/keyword_density` | Valider la densité de mots-clés post-rédaction | Modéré |
| `backlinks/summary` | Profil liens des concurrents pour contexte | Modéré |
| `serp_competitors` (Labs) | Identifier les vrais concurrents pour un cluster de mots-clés | Modéré |
| `domain_intersection` (Labs) | Trouver les mots-clés où les concurrents se classent mais pas nous | Modéré |
| `ranked_keywords` (Labs) | Analyser le positionnement existant du site client | Modéré |
| DataForSEO Trends | Détecter les tendances montantes pour recommandations | Faible |

### 9.3 Tier 3 — Fonctionnalités avancées à moyen terme

| Endpoint | Utilité | Coût estimé |
|----------|---------|-------------|
| `content_analysis/sentiment_analysis` | Vérifier le ton des articles concurrents | Modéré |
| `content_generation/check_grammar` | Vérification grammaire post-rédaction | Par requête |
| `content_generation/paraphrase` | Réécriture de passages | Par requête |
| LLM Mentions API | Surveiller la visibilité dans les réponses IA | $100/mois min |
| `on_page/lighthouse` | Core Web Vitals après publication | Modéré |

---

## 10. Synthèse et recommandations

### 10.1 État actuel de l'intégration

L'intégration actuelle exploite **4 endpoints sur 50+** disponibles. Elle est bien construite (typage TypeScript, dégradation gracieuse, cache fichier, retry exponential backoff) mais n'utilise qu'une fraction du potentiel DataForSEO.

### 10.2 Améliorations immédiates (sans nouveaux endpoints)

1. **Exploiter les nouveaux champs de `keyword_overview`** :
   - `search_intent_info` — Déjà disponible dans la réponse, pas encore affiché
   - `avg_backlinks_info` — Métriques backlinks des pages top-10
   - `keyword_properties.keyword_difficulty` — Score de difficulté natif

2. **Exploiter les AI Overviews dans SERP Advanced** :
   - Filtrer `type === 'ai_overview'` (déjà dans la réponse Advanced)
   - Extraire le `markdown` et les `references`
   - Afficher dans le brief pour contexte IA

3. **Ajouter un TTL au cache** :
   - 30 jours pour les données keywords
   - Invalidation automatique plutôt que manuelle uniquement

4. **Améliorer la gestion d'erreurs** :
   - Gérer les codes internes DataForSEO (40202, 50401, 50402) en plus des HTTP 429/503
   - Ajouter du jitter au retry

### 10.3 Enrichissements prioritaires (nouveaux endpoints)

**Phase 1** — Quick wins :
- `search_intent` — Classifier automatiquement l'intent des mots-clés du cocon
- `keyword_suggestions` — Compléter les related keywords
- AI Overviews parsing — Données déjà retournées par SERP Advanced

**Phase 2** — Fonctionnalités enrichies :
- `content_generation/generate_meta_tags` — Méta-tags optimisés automatiques
- `content_generation/generate_subtopics` — Suggestions de sous-thèmes pour l'outline
- `bulk_keyword_difficulty` — Scoring en masse pour le cocon

**Phase 3** — Analyse concurrentielle :
- `on_page/content_parsing` + `keyword_density` — Analyse des pages concurrentes
- `serp_competitors` + `ranked_keywords` — Intelligence concurrentielle

### 10.4 Budget estimé

| Scénario | Coût mensuel estimé |
|----------|---------------------|
| Usage actuel (4 endpoints, cache) | ~$50-100 |
| + Phase 1 (intent, suggestions, AIO) | ~$100-200 |
| + Phase 2 (content gen, bulk difficulty) | ~$200-400 |
| + Phase 3 (concurrence, OnPage) | ~$400-700 |
| Full stack (tous les tiers) | ~$600-900 |

### 10.5 Points de vigilance 2026

1. **Arrêt v2 le 5 mai 2026** — Le projet est sur v3, pas d'impact
2. **Changement tarification SERP** (sept 2025) — Base = 10 résultats, pages sup à -25%
3. **Dépréciation Lite** — Le projet n'utilise pas Lite, pas d'impact
4. **AI Overviews en expansion** — Données IA de plus en plus présentes dans les SERP
5. **LLM Mentions** — Tendance émergente du SEO IA à surveiller

---

## 11. Sources

### Documentation officielle
- [DataForSEO API v3 Documentation](https://docs.dataforseo.com/v3/)
- [SERP API Overview](https://docs.dataforseo.com/v3/serp-overview/)
- [SERP API Endpoints](https://docs.dataforseo.com/v3/serp-endpoints/)
- [DataForSEO Labs Overview](https://docs.dataforseo.com/v3/dataforseo_labs/overview/)
- [Keyword Overview Endpoint](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_overview-live/)
- [Related Keywords Endpoint](https://docs.dataforseo.com/v3/dataforseo_labs-google-related_keywords-live/)
- [OnPage API Overview](https://docs.dataforseo.com/v3/on_page-overview/)
- [Backlinks API Overview](https://docs.dataforseo.com/v3/backlinks-overview/)
- [Content Generation API](https://docs.dataforseo.com/v3/content_generation-overview/)
- [Content Analysis API](https://docs.dataforseo.com/v3/content_analysis-overview/)
- [AI Optimization API](https://docs.dataforseo.com/v3/ai_optimization-overview/)
- [Authentication](https://docs.dataforseo.com/v3/auth/)
- [Error Codes](https://docs.dataforseo.com/v3/appendix/errors/)
- [Sandbox](https://docs.dataforseo.com/v3/appendix-sandbox/)
- [Migration Guide v3](https://docs.dataforseo.com/v3/migration_guide_v3/)

### Pricing et limites
- [Pricing Page](https://dataforseo.com/pricing)
- [Pricing List](https://dataforseo.com/pricing-list)
- [Rate Limits](https://dataforseo.com/help-center/rate-limits-and-request-limits)
- [SERP API Cost Explained](https://dataforseo.com/help-center/serp-api-cost-explained)
- [SERP Pricing & Depth FAQ](https://dataforseo.com/help-center/serp-api-pricing-depth-update-faq)

### Changelog et mises à jour 2025-2026
- [Updates Page](https://dataforseo.com/updates)
- [2025 Year in Review](https://dataforseo.com/update/dataforseo-year-in-review)
- [API v2 Sunset Notice](https://dataforseo.com/update/dataforseo-api-v2-sunset-notice)
- [SERP Lite/Organic Changes](https://dataforseo.com/update/important-changes-to-google-serp-api-lite-and-organic)
- [AI Overviews in PAA](https://dataforseo.com/update/ai-overviews-in-paa)
- [AI-Powered Features in SERP](https://dataforseo.com/update/more-ai-powered-feature-formats-in-serp-api)
- [Copilot Search in Bing SERP](https://dataforseo.com/update/copilot-search-comes-to-bing-serp-api)
- [LLM Mentions API](https://dataforseo.com/update/introducing-llm-mentions-api)
- [Fan-Out Queries and Brand Entities](https://dataforseo.com/update/fan-out-queries-and-brand-entities)
- [Keyword Overview & Historical Data](https://dataforseo.com/update/keyword-overview-historical-keyword-data)
- [Markdown in OnPage](https://dataforseo.com/update/markdown-in-on-page-content-parsing-api)
- [New Rank Scale Backlinks](https://dataforseo.com/update/new-rank-scale-in-backlinks-api)
- [Crawl Stop on Match](https://dataforseo.com/update/serp-api-crawl-stop-on-match)
- [Enhanced Target Matching](https://dataforseo.com/update/enhanced-target-matching-for-google-organic-serp-api-new-crawl-control-parameters)
- [MCP Server Launch](https://dataforseo.com/update/dataforseo-mcp-server-launch)
- [AI-Optimized Responses](https://dataforseo.com/update/ai-optimized-api-responses-now-available)
- [Documentation Redesign](https://dataforseo.com/update/elevating-your-documentation-experience)

### SDKs
- [TypeScript Client](https://github.com/dataforseo/TypeScriptClient)
- [Python Client](https://github.com/dataforseo/PythonClient)
- [Java Client](https://github.com/dataforseo/JavaClient)
- [C# Client](https://github.com/dataforseo/CSharpClient)

### Guides
- [Kickstart Guide](https://dataforseo.com/blog/a-kickstart-guide-to-using-dataforseo-apis)
- [Best Practices Live Endpoints](https://dataforseo.com/help-center/best-practices-live-endpoints-in-dataforseo-api)
- [120 OnPage Metrics Explained](https://dataforseo.com/blog/120-onpage-api-metrics-explained)
- [Bulk Backlinks API](https://dataforseo.com/blog/bulk-backlinks-api)
- [Ranked Keywords from AI Overviews](https://dataforseo.com/help-center/how-to-pull-ranked-keywords-from-ai-overviews)
- [Custom GPT DataForSEO](https://dataforseo.com/custom-gpt)
