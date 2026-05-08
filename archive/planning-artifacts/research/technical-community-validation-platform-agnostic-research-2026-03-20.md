---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - technical-pain-validation-multi-sources-research-2026-03-20.md
  - technical-signal-interpretation-pain-validation-research-2026-03-20.md
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Validation communautaire platform-agnostic — remplacement de Reddit par Google SERP Discussions'
research_goals: 'Remplacer le signal Reddit par une approche platform-agnostic via Google Discussions & Forums SERP feature, applicable à tout secteur professionnel sur le marché français'
user_name: 'arnau'
date: '2026-03-20'
web_research_enabled: true
source_verification: true
---

# Validation Communautaire Platform-Agnostic : Document Technique d'Implémentation

**Date :** 2026-03-20
**Auteur :** arnau
**Type :** Recherche Technique + Spécifications d'Implémentation
**Contexte :** Mise à jour du signal "Reddit" vers "Community Discussions" dans l'onglet Validation du Problème (Tab 2, workflow Moteur)

---

## Research Overview

Ce document remplace la recommandation "Reddit API" des rapports précédents par une approche **platform-agnostic** utilisant le SERP feature "Discussions & Forums" de Google via DataForSEO. Il détaille les raisons du changement, l'architecture technique, et les points d'implémentation concrets dans le projet Blog Redactor SEO.

---

## Table des Matières

1. [Pourquoi Reddit ne Convient Pas](#1-pourquoi-reddit-ne-convient-pas)
2. [Google "Discussions & Forums" SERP Feature](#2-google-discussions--forums-serp-feature)
3. [Alternatives Analysées et Rejetées](#3-alternatives-analysées-et-rejetées)
4. [Architecture Technique Détaillée](#4-architecture-technique-détaillée)
5. [Points d'Implémentation dans le Projet](#5-points-dimplémentation-dans-le-projet)
6. [Interprétation du Signal Communautaire](#6-interprétation-du-signal-communautaire)
7. [Mise à Jour de l'Architecture Multi-Sources](#7-mise-à-jour-de-larchitecture-multi-sources)
8. [Sources](#8-sources)

---

## 1. Pourquoi Reddit ne Convient Pas

### 1.1 Biais fondamentaux

| Problème | Impact sur l'outil |
|----------|-------------------|
| **Biais anglophone** | Les subreddits français sont limités (r/france ~800k, quelques niches). La majorité du contenu est en anglais |
| **Couverture sectorielle inégale** | Tech/gaming/crypto surreprésentés. BTP, juridique, santé FR, artisanat, agriculture quasi-absents |
| **Déclin mesurable** | Reddit perd en qualité de contenu après l'IPO et les changements d'API (exode vers Lemmy, Discord) |
| **Coût commercial** | L'API commerciale Reddit = 1 500-10 000€/mois. Le free tier interdit l'usage commercial |

### 1.2 Inadéquation pour un outil généraliste

L'outil Blog Redactor SEO doit fonctionner pour **n'importe quel secteur professionnel** :
- Un plombier qui veut valider "fuite chauffe-eau" ne trouvera rien sur Reddit
- Un avocat qui vérifie "divorce garde alternée" n'a pas de subreddit dédié
- Un e-commerçant textile qui cherche "robe grande taille avis" sera mieux servi par des forums mode FR

**Conclusion :** Reddit comme source unique = point aveugle sur la majorité des secteurs du marché français.

### 1.3 Ce qui change

```
AVANT :  Signal "Reddit" → reddit.com API → posts + upvotes + sentiment
APRÈS :  Signal "Community Discussions" → DataForSEO SERP → toutes plateformes
```

---

## 2. Google "Discussions & Forums" SERP Feature

### 2.1 Qu'est-ce que c'est ?

Google affiche un bloc **"Discussions et forums"** dans les résultats de recherche qui agrège automatiquement les discussions les plus pertinentes provenant de **toutes les plateformes** :

- Reddit (domine à ~66% des slots)
- Quora
- Stack Overflow / Stack Exchange
- Forums français spécialisés (Hardware.fr, Doctissimo, CommentCaMarche, forums métiers)
- LinkedIn discussions
- Groupes et communautés de niche

### 2.2 Pourquoi c'est la solution optimale

| Avantage | Détail |
|----------|--------|
| **Platform-agnostic** | Google découvre et agrège TOUS les forums pertinents automatiquement |
| **Sector-agnostic** | Fonctionne pour n'importe quel secteur — Google sait quel forum couvrir |
| **Marché français optimisé** | Les requêtes en français retournent les forums FR automatiquement |
| **Qualité filtrée** | Google classe les discussions par pertinence — les plus utiles en premier |
| **Zéro maintenance** | Pas besoin de tracker chaque plateforme individuellement |
| **Légal** | API officielle DataForSEO, pas de scraping |
| **Coût quasi-nul** | Tu utilises déjà DataForSEO — c'est un endpoint SERP standard |

### 2.3 Données retournées par l'API

Le SERP feature "discussions_and_forums" de DataForSEO retourne :

```typescript
interface DiscussionResult {
  type: 'discussions_and_forums';
  items: Array<{
    title: string;           // Titre de la discussion
    url: string;             // URL complète du post/thread
    domain: string;          // Ex: "reddit.com", "doctissimo.fr", "hardware.fr"
    description: string;     // Extrait du contenu
    timestamp: string;       // Date du post
    rating?: {
      value: number;         // Note si disponible
      votes_count: number;   // Nombre de votes/réponses
    };
  }>;
  position: number;          // Position dans les SERP (indique l'importance pour Google)
}
```

### 2.4 Coût via DataForSEO

| Usage | Coût unitaire | Budget mensuel estimé |
|-------|--------------|----------------------|
| SERP API standard | ~0.0006-0.002€/requête | ~0.60-2€ par mot-clé validé |
| 100 mots-clés/mois | — | ~60-200€/mois |
| 50 mots-clés/mois | — | ~30-100€/mois |

**Note :** Ce coût est **en plus** de l'appel keyword_overview déjà fait. Pour un mot-clé, on fera désormais 2 appels DataForSEO au lieu de 1 (overview + SERP discussions).

_Source : [DataForSEO - Discussions & Forums Feature](https://dataforseo.com/serp-feature/discussions_and_forums), [DataForSEO SERP API Pricing](https://dataforseo.com/apis/serp-api/pricing)_

---

## 3. Alternatives Analysées et Rejetées

### 3.1 Plateformes individuelles

| Plateforme | API ? | Marché FR | Verdict | Raison du rejet |
|------------|-------|-----------|---------|----------------|
| **Reddit** | Oui (payant commercial) | Faible | Rejeté | Biais sectoriel, coût, couverture FR faible |
| **Quora** | Non (juste Poe AI) | Faible | Rejeté | Pas d'API de contenu, communauté FR limitée |
| **Hardware.fr** | Non | Fort (tech) | Rejeté | Pas d'API, scraping = risque légal |
| **Doctissimo** | Non | Fort (santé) | Rejeté | Pas d'API, scraping = risque légal |
| **CommentCaMarche** | Non | Fort (tech) | Rejeté | Pas d'API |
| **Stack Overflow** | Oui (gratuit) | Faible FR | Complémentaire | Uniquement pour les niches dev/tech |
| **Facebook Groups** | **API supprimée** (avril 2024) | Fort | Impossible | Meta a supprimé l'accès programmatique |
| **LinkedIn** | Oui (limité) | Fort B2B | Complémentaire | Pas de recherche dans les discussions de groupe |
| **Twitter/X** | Oui (5 000€/mois Pro) | Moyen | Rejeté | Prohibitivement cher |

### 3.2 Plateformes de social listening

| Outil | Prix | Couverture | Verdict |
|-------|------|-----------|---------|
| **Brand24** | 99€+/mois | 25M+ sources | Overkill pour ce besoin |
| **Mention** | 249€+/mois | Social + forums | Trop cher, pas adapté |
| **Syften** | 20€/mois | Reddit + forums | Bon complément si Reddit nécessaire |
| **Talkwalker** | Enterprise | Exhaustif | Hors budget |

**Conclusion :** Les plateformes de social listening sont soit trop chères, soit trop générales. Le SERP "Discussions & Forums" couvre le besoin pour une fraction du coût.

### 3.3 Approche retenue : SERP Discussions comme source primaire

Le SERP feature Google "Discussions & Forums" capture déjà le contenu de Reddit, Quora, et des forums FR spécialisés. C'est la **couche d'agrégation** que Google maintient pour nous — autant l'utiliser plutôt que de réinventer la roue.

---

## 4. Architecture Technique Détaillée

### 4.1 Vue d'ensemble du flux

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONGLET VALIDATION DU PROBLÈME                 │
│                    (Tab 2 — Workflow Moteur)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mots-clés traduits (depuis Tab 1 — PainTranslator)              │
│          │                                                       │
│          ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           ORCHESTRATEUR MULTI-SOURCES                 │       │
│  │           (useMultiSourceVerdict.ts)                   │       │
│  │                                                        │       │
│  │  Appels parallèles :                                   │       │
│  │                                                        │       │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │       │
│  │  │ DataForSEO   │  │ DataForSEO   │  │ Google       │ │       │
│  │  │ Keyword      │  │ SERP         │  │ Autocomplete │ │       │
│  │  │ Overview     │  │ Discussions  │  │              │ │       │
│  │  │ (existant)   │  │ (NOUVEAU)    │  │ (NOUVEAU)    │ │       │
│  │  ├─────────────┤  ├──────────────┤  ├──────────────┤ │       │
│  │  │ volume      │  │ discussions[]│  │ suggestions[]│ │       │
│  │  │ cpc         │  │ domains[]   │  │ count        │ │       │
│  │  │ kd          │  │ timestamps  │  │              │ │       │
│  │  │ competition │  │ votes_count │  │              │ │       │
│  │  │ relatedCount│  │ position    │  │              │ │       │
│  │  └─────────────┘  └──────────────┘  └──────────────┘ │       │
│  │                                                        │       │
│  │  ┌─────────────┐  ┌──────────────┐                    │       │
│  │  │ Google      │  │ Transformers │                    │       │
│  │  │ Trends      │  │ .js (NLP)    │                    │       │
│  │  │ (OPTIONNEL) │  │ (NOUVEAU)    │                    │       │
│  │  ├─────────────┤  ├──────────────┤                    │       │
│  │  │ trend_dir   │  │ intentClass │                    │       │
│  │  │ interest    │  │ sentiment   │                    │       │
│  │  │ seasonality │  │ similarity  │                    │       │
│  │  └─────────────┘  └──────────────┘                    │       │
│  │                                                        │       │
│  │         ▼           ▼           ▼          ▼          │       │
│  │  ┌────────────────────────────────────────────────┐   │       │
│  │  │         NORMALISATION + FUSION                  │   │       │
│  │  │  z-score par source → pondération → consensus   │   │       │
│  │  └────────────────────────────────────────────────┘   │       │
│  │                        │                               │       │
│  │                        ▼                               │       │
│  │  ┌────────────────────────────────────────────────┐   │       │
│  │  │         VERDICT MULTI-SOURCES                   │   │       │
│  │  │  🔥 Brûlante | ✅ Confirmée | 🌱 Émergente    │   │       │
│  │  │  💡 Latente  | ❄️ Froide   | ❓ Incertaine    │   │       │
│  │  │  + score de confiance (0-100%)                  │   │       │
│  │  │  + breakdown par source                         │   │       │
│  │  └────────────────────────────────────────────────┘   │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  Affichage enrichi :                                             │
│  • Tableau des mots-clés avec verdict + confiance               │
│  • Breakdown par source (✅ DataForSEO ✅ Discussions ⚠️ NLP)  │
│  • Barre de confiance visuelle                                   │
│  • Auto-sélection du meilleur mot-clé                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Stack technique finale (5 signaux)

| # | Source | Type | Coût additionnel | Signal |
|---|--------|------|-----------------|--------|
| 1 | DataForSEO Keyword Overview | API (existante) | 0€ (déjà utilisé) | Volume, CPC, KD, concurrence, related |
| 2 | **DataForSEO SERP Discussions** | API (NOUVEAU) | ~0.60-2€/mot-clé | Discussions multi-plateformes |
| 3 | **Google Autocomplete** | Endpoint non-officiel (NOUVEAU) | 0€ | Confirmation de demande |
| 4 | **Google Trends** (optionnel) | Via SerpApi (OPTIONNEL) | 75€/mois | Tendance temporelle |
| 5 | **Transformers.js** | Embarqué navigateur (NOUVEAU) | 0€ | Intent, sentiment, similarité |

**Budget total additionnel : ~30-100€/mois** (hors Google Trends optionnel)

---

## 5. Points d'Implémentation dans le Projet

### 5.1 BACKEND — Nouveau service : Community Discussions

#### Fichier à créer : `server/services/community-discussions.service.ts`

**Responsabilité :** Interroger le SERP DataForSEO pour le feature "Discussions & Forums" et extraire les métriques communautaires.

**Fonction principale :**

```typescript
interface CommunitySignal {
  discussionsCount: number;        // Nombre total de discussions trouvées
  uniqueDomains: string[];         // Domaines sources uniques (reddit.com, doctissimo.fr...)
  domainDiversity: number;         // Nombre de plateformes différentes
  avgVotesCount: number;           // Moyenne des votes/réponses
  freshness: 'recent' | 'moderate' | 'old'; // < 3 mois | 3-12 mois | > 12 mois
  serpPosition: number | null;     // Position du bloc dans les SERP (plus bas = moins important)
  topDiscussions: Array<{
    title: string;
    domain: string;
    url: string;
    timestamp: string;
    votesCount: number;
  }>;
}

async function fetchCommunityDiscussions(
  keyword: string,
  locationCode: number = 2250,  // France
  languageCode: string = 'fr'
): Promise<CommunitySignal>
```

**Stratégie de requêtes SERP :** Pour maximiser la couverture, envoyer 2-3 variantes :

```typescript
const queries = [
  `${keyword} forum`,           // Recherche directe de forums
  `${keyword} avis problème`,   // Variante orientée pain point
  `${keyword} retour expérience` // Variante REX/témoignage
];
```

Agréger les résultats des 3 requêtes, dédupliquer par URL, et retourner le signal consolidé.

**Cache :** 48h (les discussions changent peu en 48h). Utiliser le système de cache existant (`readCache`/`writeCache` dans `dataforseo.service.ts`).

#### Fichier à créer : `server/services/autocomplete.service.ts`

**Responsabilité :** Interroger Google Autocomplete pour un mot-clé et retourner les suggestions.

```typescript
interface AutocompleteSignal {
  suggestionsCount: number;        // Nombre de suggestions retournées
  suggestions: string[];           // Les suggestions textuelles
  hasKeyword: boolean;             // Le mot-clé exact est-il suggéré ?
  position: number | null;        // Position dans les suggestions (1-10)
}

async function fetchAutocomplete(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr'
): Promise<AutocompleteSignal>
```

**Endpoint non-officiel :**
```
GET https://www.google.com/complete/search?q={keyword}&client=chrome&hl=fr&gl=fr
```

**Précautions :**
- Rate limit : max 1 requête/seconde (délai 1000ms entre appels)
- Timeout : 3 secondes
- Retry : 1 seul retry si 429/503
- Cache : 24h (les suggestions changent peu)
- Fallback gracieux : si bloqué, retourner `{ suggestionsCount: 0, suggestions: [], hasKeyword: false, position: null }`

### 5.2 BACKEND — Mise à jour de la route validate-pain

#### Fichier à modifier : `server/routes/keywords.routes.ts`

**Route actuelle :** `POST /api/keywords/validate-pain`

**Ce qui change :**

La route actuelle fait :
1. `fetchKeywordOverviewBatch(keywords)` → métriques SEO
2. `fetchRelatedKeywords(kw)` par mot-clé → related count

La route mise à jour fera **en parallèle** :
1. `fetchKeywordOverviewBatch(keywords)` → métriques SEO (existant)
2. `fetchCommunityDiscussions(kw)` par mot-clé → signal communautaire (NOUVEAU)
3. `fetchAutocomplete(kw)` par mot-clé → signal autocomplete (NOUVEAU)

**Nouveau format de réponse :**

```typescript
interface ValidatePainResponse {
  results: Array<{
    keyword: string;

    // Signal 1 : DataForSEO Keyword Overview (existant)
    searchVolume: number;
    difficulty: number;
    cpc: number;
    competition: number;
    relatedCount: number;

    // Signal 2 : Community Discussions (NOUVEAU)
    community: {
      discussionsCount: number;
      domainDiversity: number;
      uniqueDomains: string[];
      avgVotesCount: number;
      freshness: 'recent' | 'moderate' | 'old';
      serpPosition: number | null;
      topDiscussions: Array<{
        title: string;
        domain: string;
        url: string;
        timestamp: string;
        votesCount: number;
      }>;
    };

    // Signal 3 : Autocomplete (NOUVEAU)
    autocomplete: {
      suggestionsCount: number;
      suggestions: string[];
      hasKeyword: boolean;
      position: number | null;
    };

    // Verdict enrichi (NOUVEAU)
    verdict: {
      category: 'brulante' | 'confirmee' | 'emergente' | 'latente' | 'froide' | 'incertaine';
      confidence: number;           // 0-1
      consensusAgreement: number;   // % de sources en accord
      sourcesAvailable: number;
      sourcesTotal: number;
      perSourceBreakdown: {
        dataforseo: { score: number; signal: string };
        community: { score: number; signal: string };
        autocomplete: { score: number; signal: string };
        nlp?: { score: number; signal: string };   // Calculé côté frontend
        trends?: { score: number; signal: string }; // Si Google Trends activé
      };
    };
  }>;
}
```

**Optimisation des appels parallèles :**

```typescript
// Pour chaque mot-clé, lancer les 3 sources en parallèle
const results = await Promise.all(keywords.map(async (kw) => {
  const [overview, community, autocomplete] = await Promise.allSettled([
    getOverviewFromBatch(kw, batchResults),  // Déjà dans le batch
    fetchCommunityDiscussions(kw),            // NOUVEAU
    fetchAutocomplete(kw),                    // NOUVEAU
  ]);

  // Assembler avec fallback gracieux pour chaque source
  return buildMultiSourceResult(kw, overview, community, autocomplete);
}));
```

### 5.3 BACKEND — Nouveau type partagé

#### Fichier à modifier : `shared/types/keyword.types.ts`

Ajouter les types pour les nouveaux signaux :

```typescript
export interface CommunitySignal {
  discussionsCount: number;
  domainDiversity: number;
  uniqueDomains: string[];
  avgVotesCount: number;
  freshness: 'recent' | 'moderate' | 'old';
  serpPosition: number | null;
  topDiscussions: Array<{
    title: string;
    domain: string;
    url: string;
    timestamp: string;
    votesCount: number;
  }>;
}

export interface AutocompleteSignal {
  suggestionsCount: number;
  suggestions: string[];
  hasKeyword: boolean;
  position: number | null;
}

export type PainVerdictCategory =
  | 'brulante'
  | 'confirmee'
  | 'emergente'
  | 'latente'
  | 'froide'
  | 'incertaine';

export interface MultiSourceVerdict {
  category: PainVerdictCategory;
  confidence: number;
  consensusAgreement: number;
  sourcesAvailable: number;
  sourcesTotal: number;
  perSourceBreakdown: Record<string, {
    score: number;
    signal: string;
  }>;
}
```

### 5.4 FRONTEND — Nouveau composable : useMultiSourceVerdict

#### Fichier à créer : `src/composables/useMultiSourceVerdict.ts`

Remplace la logique simple de `usePainVerdict.ts` par un moteur de scoring multi-sources.

**Responsabilités :**
1. Normaliser chaque signal (min-max + winsorisation)
2. Calculer le score pondéré composite
3. Vérifier le consensus entre sources
4. Détecter les cas spéciaux (Latente, Émergente)
5. Calculer la confiance
6. Retourner le verdict enrichi

**Logique de verdict (priorité de détection) :**

```typescript
function computeVerdict(signals: NormalizedSignals): MultiSourceVerdict {
  // 1. Détection "Latente" — chemin spécial AVANT le scoring
  //    Discussions actives MAIS volume Google = 0
  if (
    signals.dataforseo.volume === 0 &&
    signals.community.discussionsCount >= 10 &&
    signals.community.avgVotesCount >= 5
  ) {
    return { category: 'latente', confidence: computeConfidence(signals) };
  }

  // 2. Détection "Émergente" — override sur tendance
  //    Trends en hausse ET (community actif OU PAA riche) malgré volume faible
  if (
    signals.dataforseo.volume < 200 &&
    signals.trends?.direction === 'rising' &&
    (signals.community.discussionsCount >= 5 || signals.dataforseo.relatedCount > 5)
  ) {
    return { category: 'emergente', confidence: computeConfidence(signals) };
  }

  // 3. Scoring composite standard
  const compositeScore = computeCompositeScore(signals);
  const consensus = computeConsensus(signals);

  // 4. Classification par seuils + consensus
  if (compositeScore >= 0.70 && consensus >= 0.80) return { category: 'brulante', ... };
  if (compositeScore >= 0.55 && consensus >= 0.60) return { category: 'confirmee', ... };
  if (compositeScore < 0.20 && consensus >= 0.80)  return { category: 'froide', ... };

  // 5. Fallback "Incertaine" si pas assez de données ou conflit
  if (consensus < 0.50 || signals.sourcesAvailable < 3) {
    return { category: 'incertaine', ... };
  }

  // 6. Zone grise → le plus probable entre confirmée et émergente
  return bestGuess(compositeScore, signals);
}
```

**Poids initiaux (égaux, à calibrer) :**

```typescript
const INITIAL_WEIGHTS = {
  dataforseo: 0.30,      // Volume + CPC + KD + related
  community: 0.25,       // Discussions & Forums
  autocomplete: 0.15,    // Confirmation de demande
  nlp: 0.15,             // Intent + sentiment (Transformers.js)
  trends: 0.15,          // Google Trends (si activé, sinon redistribuer)
};
```

### 5.5 FRONTEND — Mise à jour du composant PainValidation.vue

#### Fichier à modifier : `src/components/intent/PainValidation.vue`

**Changements majeurs :**

1. **Remplacer les 4 verdicts** (brûlante/émergente/froide/neutre) par les **6 verdicts** enrichis

2. **Ajouter l'affichage du breakdown par source** :
   - Pour chaque mot-clé validé, montrer une ligne de détail avec :
   - DataForSEO : ✅ Volume 450, CPC 2.50€
   - Community : ✅ 12 discussions sur 3 plateformes
   - Autocomplete : ✅ 6 suggestions
   - NLP : ⚠️ Confiance 0.68
   - → Score global : 72% → **Confirmée**

3. **Ajouter une barre de confiance visuelle** :
   - Barre colorée 0-100% sous chaque verdict
   - Vert (>70%), Orange (40-70%), Rouge (<40%)

4. **Afficher les top discussions** (expansible) :
   - Clic sur "12 discussions" → liste dépliable avec titre, domaine, date
   - Permet à l'utilisateur de vérifier visuellement les sources

5. **Afficher les suggestions autocomplete** :
   - Tags/chips des suggestions Google trouvées
   - L'utilisateur peut voir quelles variations Google propose

6. **Nouveau banner de verdict** :
   - Remplacer le banner actuel par un résumé enrichi :
   - "3 douleurs brûlantes détectées (confiance 85%) — le marché existe !"
   - "1 douleur latente détectée — opportunité first-mover sur [mot-clé]"

### 5.6 FRONTEND — Intégration Transformers.js (NLP embarqué)

#### Fichier à créer : `src/composables/useNlpAnalysis.ts`

**Responsabilité :** Charger et exécuter les modèles NLP dans le navigateur pour enrichir le verdict.

**Fonctions :**

```typescript
// 1. Préchargement du modèle (une seule fois, au mount du composant)
async function initNlpModels(): Promise<void>

// 2. Classification zero-shot du type de douleur
async function classifyPainType(painText: string): Promise<{
  label: string;       // Ex: "problème technique", "prix élevé", "UX difficile"
  confidence: number;  // 0-1
}>

// 3. Analyse de sentiment sur les discussions extraites
async function analyzeSentiment(texts: string[]): Promise<{
  avgScore: number;    // -1 (négatif) à +1 (positif)
  distribution: { positive: number; negative: number; neutral: number };
}>

// 4. Similarité sémantique entre le pain point original et les mots-clés
async function computeSimilarity(
  painText: string,
  keywords: string[]
): Promise<Map<string, number>>  // keyword → score 0-1
```

**Modèles recommandés :**
- Zero-shot : `typeform/distilbert-base-uncased-mnli` (~68MB, quantifié q4 → ~20MB)
- Embeddings : `Xenova/all-MiniLM-L6-v2` (~23MB, q8 → ~15MB)
- Sentiment : `nlptown/bert-base-multilingual-uncased-sentiment` (multilingue, supporte le français)

**Stratégie de chargement :**
- Précharger les modèles en arrière-plan au mount de `MoteurView.vue`
- Utiliser un Service Worker pour cacher les modèles après premier téléchargement
- Afficher un indicateur de progression si les modèles ne sont pas encore prêts
- **Fallback** : si les modèles ne chargent pas (navigateur ancien, connexion lente), le signal NLP est simplement absent → confiance ajustée à la baisse

### 5.7 BACKEND — Ajout Google Trends (optionnel, Phase 2)

#### Impact si activé :

- Nécessite un abonnement SerpApi (75€/mois) pour l'endpoint Google Trends
- OU utilisation d'une librairie non-officielle (`@alkalisummer/google-trends-js`)
- Ajoute le signal de tendance temporelle (croissance/déclin/saisonnalité)
- Augmente significativement la précision du verdict "Émergente"

**Recommandation :** Implémenter le système sans Google Trends d'abord (4 signaux), puis ajouter en Phase 2 si le budget le permet.

---

## 6. Interprétation du Signal Communautaire

### 6.1 Scoring du signal "Community Discussions"

| Métrique | Score 0 | Score 0.25 | Score 0.50 | Score 0.75 | Score 1.0 |
|----------|---------|-----------|-----------|-----------|----------|
| **discussionsCount** | 0 | 1-2 | 3-5 | 6-10 | 10+ |
| **domainDiversity** | 0 | 1 | 2 | 3 | 4+ |
| **avgVotesCount** | 0 | 1-5 | 5-20 | 20-50 | 50+ |
| **freshness** | — | old (>12m) | moderate (3-12m) | — | recent (<3m) |
| **serpPosition** | absent | >50 | 20-50 | 10-20 | <10 |

**Score communautaire composite :**
```
community_score = (
  discussions_score × 0.30 +
  diversity_score × 0.25 +
  votes_score × 0.20 +
  freshness_score × 0.15 +
  serp_position_score × 0.10
)
```

### 6.2 Cas limites et interprétation

| Situation | Interprétation | Impact sur le verdict |
|-----------|---------------|---------------------|
| 0 discussions trouvées | Pas de signal communautaire | Réduit la confiance, ne disqualifie PAS |
| 10+ discussions mais toutes > 12 mois | Problème ancien, peut-être résolu | Pondérer à la baisse (freshness = old) |
| 3 discussions mais sur 3 domaines différents | Signal fort malgré le petit nombre | domainDiversity boost le score |
| 50+ discussions sur Reddit seul | Signal monoplateforme | domainDiversity faible, pondérer à la baisse |
| Discussions mais SERP position > 50 | Google ne considère pas ça important | serpPosition pénalise le score |
| Bloc "Discussions" en position 1-5 | Google juge les discussions très pertinentes | Fort boost du score communautaire |

### 6.3 Avantage clé : la diversité des domaines

Le signal **domainDiversity** est le plus précieux de cette approche. Si un pain point génère des discussions sur **Reddit ET Doctissimo ET un forum métier**, c'est une confirmation beaucoup plus forte que 50 posts sur Reddit seul.

```
domainDiversity = 1 plateforme → signal faible (monoplateforme)
domainDiversity = 2 plateformes → signal modéré
domainDiversity = 3+ plateformes → signal fort (le problème est transversal)
```

---

## 7. Mise à Jour de l'Architecture Multi-Sources

### 7.1 Résumé des changements par rapport au rapport précédent

| Élément | Rapport précédent | Ce document |
|---------|-------------------|-------------|
| Signal communautaire | Reddit API (0€ free tier) | **DataForSEO SERP Discussions** (~60-200€/mois) |
| Couverture sectorielle | Limitée à Reddit | **Tous secteurs, toutes plateformes** |
| Couverture marché FR | Faible | **Excellente** (forums FR auto-découverts) |
| Risque légal | Free tier non-commercial | **Aucun** (API officielle) |
| Maintenance | Dépend de l'API Reddit | **Zéro** (Google maintient l'index) |
| Coût total estimé | ~55€/mois | **~90-250€/mois** (selon volume) |

### 7.2 Architecture finale mise à jour

```
┌─────────────────────────────────────────────────────────┐
│                    SOURCES DE DONNÉES                     │
├──────────┬───────────────┬──────────┬───────────────────┤
│DataForSEO│ DataForSEO    │ Google   │ Transformers.js   │
│ Keyword  │ SERP          │Autocomplete│  (embarqué)     │
│ Overview │ Discussions   │          │                   │
│ Volume   │ Toutes        │ Suggestions│ Intent class    │
│ CPC, KD  │ plateformes   │ Count    │ Sentiment        │
│ Related  │ multi-domaines│          │ Similarité       │
├──────────┴───────────────┴──────────┴───────────────────┤
│              NORMALISATION (min-max + winsorisation 5%)   │
├──────────────────────────────────────────────────────────┤
│              DÉTECTION CAS SPÉCIAUX                       │
│  • Latente : community actif + volume = 0                │
│  • Émergente : trends hausse + volume faible              │
├──────────────────────────────────────────────────────────┤
│              FUSION PONDÉRÉE + CONSENSUS                  │
│   DataForSEO: 0.30 | Community: 0.25 | Autocomplete: 0.15│
│   NLP: 0.15 | Trends: 0.15 (optionnel, redistribué sinon)│
├──────────────────────────────────────────────────────────┤
│              VERDICT + CONFIANCE                          │
│   🔥 Brûlante | ✅ Confirmée | 🌱 Émergente             │
│   💡 Latente  | ❄️ Froide   | ❓ Incertaine             │
│   Confiance : 0-100% avec breakdown par source           │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Poids mis à jour (sans Google Trends)

Si Google Trends n'est pas activé, redistribuer son poids :

| Source | Avec Trends | Sans Trends |
|--------|------------|-------------|
| DataForSEO Overview | 0.30 | 0.35 |
| Community Discussions | 0.25 | 0.30 |
| Autocomplete | 0.15 | 0.15 |
| NLP (Transformers.js) | 0.15 | 0.20 |
| Google Trends | 0.15 | — |

### 7.4 Fichiers impactés — Récapitulatif

#### Fichiers à CRÉER :

| Fichier | Responsabilité |
|---------|---------------|
| `server/services/community-discussions.service.ts` | Requêtes SERP "Discussions & Forums" via DataForSEO |
| `server/services/autocomplete.service.ts` | Requêtes Google Autocomplete |
| `src/composables/useMultiSourceVerdict.ts` | Moteur de scoring multi-sources (remplace `usePainVerdict`) |
| `src/composables/useNlpAnalysis.ts` | Modèles Transformers.js embarqués |
| `shared/types/community.types.ts` | Types pour les nouveaux signaux |

#### Fichiers à MODIFIER :

| Fichier | Changement |
|---------|-----------|
| `server/routes/keywords.routes.ts` | Route `validate-pain` enrichie (appels parallèles 3 sources) |
| `src/components/intent/PainValidation.vue` | Affichage des 6 verdicts + breakdown + confiance |
| `shared/types/keyword.types.ts` | Nouveaux types `CommunitySignal`, `AutocompleteSignal`, `MultiSourceVerdict` |
| `src/views/MoteurView.vue` | Préchargement des modèles NLP au mount |
| `package.json` | Ajout dépendance `@huggingface/transformers` |

#### Fichiers à NE PAS MODIFIER :

| Fichier | Raison |
|---------|--------|
| `src/composables/usePainVerdict.ts` | Garder pour rétrocompatibilité avec les audits de cocon (utilise `KeywordAuditResult`) |
| `server/services/dataforseo.service.ts` | Les fonctions existantes restent intactes, on ajoute des appels SERP à côté |

---

## 8. Sources

### Google Discussions & Forums SERP Feature
- [DataForSEO - Discussions & Forums Feature](https://dataforseo.com/serp-feature/discussions_and_forums)
- [DataForSEO - Update on Discussions & Forums](https://dataforseo.com/update/discussions-forums-google-serp-feature)
- [DataForSEO - SERP API Pricing](https://dataforseo.com/apis/serp-api/pricing)
- [DataForSEO - Perspectives Feature](https://dataforseo.com/update/perspectives-feature-google-serp-api)

### Reddit Dominance et Biais
- [Search Engine Land - Reddit dominates Google Discussions](https://searchengineland.com/reddit-dominates-google-search-discussions-forums-437501)
- [Atak Interactive - Reddit, Quora as New Search Signals](https://www.atakinteractive.com/blog/reddit-quora-and-community-platforms-the-new-search-ranking-signals)

### SERP APIs Comparatif
- [2026 SERP API Pricing Index](https://www.searchcans.com/blog/serp-api-pricing-index-2026/)
- [Scrapfly - Google SERP API Alternatives](https://scrapfly.io/blog/posts/google-serp-api-and-alternatives)

### Plateformes Rejetées
- [Meta Deprecates Facebook Groups API](https://www.sprinklr.com/help/articles/getting-started/meta-deprecates-facebook-groups-api/)
- [Twitter/X API Pricing 2026](https://www.xpoz.ai/blog/guides/understanding-twitter-api-pricing-tiers-and-alternatives/)
- [Reddit API Commercial Pricing](https://painonsocial.com/blog/how-much-does-reddit-api-cost)

### Social Listening Alternatives
- [Syften - Community Monitoring](https://syften.com/)
- [Brand24 vs Mention vs Syften](https://syften.com/blog/brand24-vs-mention/)
- [Social Listening APIs 2026](https://data365.co/blog/top-social-listening-api)

### Forums Français
- [Medium - Scraping French Forums](https://xiaoouwang.medium.com/on-your-way-to-scraping-french-forums-97bf99821f18)
- [French Tech Communities](https://techcommunities.fr/)
- [French Slack Groups - Slofile](https://slofile.com/lang/French)

### NLP Embarqué
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/index)
- [Transformers.js v4 Blog](https://huggingface.co/blog/transformersjs-v4)
- [all-MiniLM-L6-v2 Model Card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

---

**Document technique complété :** 2026-03-20
**Statut :** Prêt pour implémentation
**Prérequis :** Rapports de recherche `technical-pain-validation-multi-sources-research-2026-03-20.md` et `technical-signal-interpretation-pain-validation-research-2026-03-20.md`
