# Score KPI vs Score de Pertinence — Guide produit & technique

> Mis à jour : **2026-04-28**
> **Doc complémentaire** : [docs/pain-point-editorial-backbone.md](./pain-point-editorial-backbone.md) — explique pourquoi le painPoint est l'oxygène du score de pertinence et comment il irrigue le pipeline éditorial complet.
> Source de vérité technique : [shared/scoring.ts](../shared/scoring.ts), [shared/scoring-kpi.ts](../shared/scoring-kpi.ts), [shared/types/scoring.types.ts](../shared/types/scoring.types.ts)
> Spec d'origine : `_bmad-output/implementation-artifacts/tech-spec-score-kpi-pertinence-separation.md`

---

## TL;DR

L'app expose désormais **deux scores complémentaires** sur chaque mot-clé :

| Score | Onglet | Question SEO | Plage |
| ----- | ------ | ------------ | ----- |
| **Score KPI / Marché** (`marketScore`) | **Radar** | « Ce mot-clé pèse-t-il SEO ? » | 0-100 |
| **Score de Pertinence** (`relevanceScore`) | **Capitaine** | « Ce mot-clé parle-t-il vraiment de la douleur de mon article ? » | 0-100 |

**Règle d'affichage stricte** : on n'affiche **jamais** les deux scores sur la même carte. La `RadarKeywordCard` bascule via la prop `displayMode: 'kpi' | 'relevance'`.

---

## Pourquoi deux scores ?

En SEO, deux dimensions doivent rester **orthogonales** :

- **Le marché** (volume, KD, CPC, intent, PAA, autocomplete) — ce que Google voit côté demande.
- **La pertinence éditoriale** (alignement avec le point de douleur de l'article, qualité des PAA, cohérence des racines) — ce qui fait que Google récompense la page parce qu'elle répond *vraiment* à l'intention derrière la requête.

Avant cette séparation, un seul `combinedScore` mélangeait les deux. Conséquences :
- Un mot-clé pouvait afficher 60 sans qu'on sache si c'était « marché 80 + pertinence 40 » (piège trafic) ou « marché 40 + pertinence 80 » (longue-traîne pertinente).
- Le point de douleur — pourtant central dans la stratégie — était dilué dans la pondération.

La séparation permet de lire chaque dimension indépendamment et de prendre de meilleures décisions éditoriales.

---

## Score KPI / Marché

### Composition

Source : [shared/scoring-kpi.ts](../shared/scoring-kpi.ts) → `computeMarketScore(kpis, level)`.

| Composante | Poids | Justification SEO |
| ---------- | ----- | ----------------- |
| **Volume** | 30 % | Cœur du marché. Sans volume, pas de trafic. |
| **KD** (Keyword Difficulty) | 20 % | Filtre critique : viser les wins atteignables. |
| **Intent** (type) | 15 % | Le **type** d'intent (commercial / transactionnel / informationnel / navigationnel) doit matcher le format article. **Pas l'alignement douleur**. |
| **PAA** (quantité) | 10 % | Présence et volume de PAA = sujet riche aux yeux de Google. **On compte**, on ne juge pas la qualité. |
| **Autocomplete** (quantité) | 10 % | Idem. Signal de demande conversationnelle. |
| **CPC** | 10 % | Proxy de la valeur commerciale du mot-clé. |
| **Total** | **95 %** | Le 5 % manquant n'est pas attribué — score plafonné à 100. |

### Verdict

`marketScore.verdict` ∈ `'GO' | 'ORANGE' | 'NOGO'` :
- ≥ 70 → **GO**
- 40-69 → **ORANGE**
- < 40 → **NOGO**

> ⚠️ **Le verdict est purement informatif.** Il ne bloque PAS la progression du moteur. Le bouton « Valider ce Capitaine » est toujours actif (cf. tech-spec, TD-9).

### Où il est utilisé

- **Affichage principal** : `RadarKeywordCard` en mode `displayMode='kpi'` (onglet Radar).
- **Calculé toujours** : présent dans `ValidateResponse.marketScore` et `RadarCard.marketScore`.

---

## Score de Pertinence

### Composition

Source : [shared/scoring.ts](../shared/scoring.ts) → `computeRelevanceScore(input)`.

| Composante | Poids cible | Justification SEO |
| ---------- | ----------- | ----------------- |
| **Pain × Mot-clé** | 30 % | Le mot-clé lui-même évoque-t-il la douleur ? Signal #1. |
| **PAA × Douleur** (qualité) | 25 % | Sur N PAA, combien parlent **réellement** de la douleur ? On juge la qualité, pas le nombre. **S3** — calcul cumulatif F1 : `(somme points / (nbPAA × 2.0)) × 100`. Exemple : 8 PAA, 9.75 points obtenus, max 16 → 61. |
| **Autocomplete × Douleur** (qualité) | 15 % | Idem. La SERP « réelle » valide-t-elle la douleur ? |
| **Racines** (cohérence sémantique) | 20 % | Pour les longue-traîne : si le capitaine a peu de signaux directs mais ses racines sont fortes et cohérentes, c'est un fort indicateur. **S4** — déduplication via Jaccard (seuil 0.75) : les racines quasi-identiques sont fusionnées et on garde le meilleur scorant du cluster. Voir `computeRootsRelevanceScore`. |
| **Intent × Douleur** | 10 % | L'intent matche-t-il le type de douleur attendu (`painIntentExpected`) ? (douleur « comment X » → intent informationnel attendu). **S5** — malus de **-10 points** intégré directement dans `intentPain.normalized` quand mismatch. Constante `INTENT_MISMATCH_MALUS`. |
| **Total** | **100 %** | |

### Fallback racines

Si le keyword a moins de 3 mots **ou** que `rootsAverageScore` est absent (racines pas pré-validées), les **20 % racines sont redistribués proportionnellement** sur les 4 autres composantes :

- Pain × Mot-clé : 30 → 37.5 %
- PAA × Douleur : 25 → 31.25 %
- Autocomplete × Douleur : 15 → 18.75 %
- Intent × Douleur : 10 → 12.5 %

Le `RelevanceScoreResult.rootsContext.fallbackApplied` indique si la redistribution a été appliquée.

### Composantes manquantes

Si une composante est absente (ex: pas de PAA disponible), elle est **neutralisée à 50** — ni booster ni pénaliser le score. Cela évite qu'une absence de donnée transforme un keyword pertinent en NOGO artificiel.

### Verdict

`relevanceScore.verdict` ∈ `'GO' | 'ORANGE' | 'NOGO'` (mêmes seuils que marketScore).

### Où il est utilisé

- **Affichage principal** : `RadarKeywordCard` en mode `displayMode='relevance'` (onglet Capitaine).
- **Calculé opportunistement** :
  - Côté `/keywords/radar/scan` : toujours calculé si `painPoint` fourni.
  - Côté `/keywords/:keyword/validate` : lit le cache radar persisté (`radar_explorations`) si `articleId` fourni. Si pas de signaux d'alignement disponibles → `relevanceScore: null`.

---

## Mapping Intent × Douleur

Le score de la composante « Intent × Douleur » dérive d'une matrice qualitative :

| Pain type ↓ \\ Intent type → | commercial | transactional | informational | navigational |
| ---------------------------- | ---------- | ------------- | ------------- | ------------ |
| **commercial** | 100 | 80 | 30 | 20 |
| **transactional** | 80 | 100 | 30 | 20 |
| **informational** | 50 | 40 | 100 | 30 |
| **navigational** | 60 | 50 | 40 | 100 |

Si `painType` ou `intentTypes` est absent → 50 neutre.

---

## Où chaque score est affiché

```
┌─────────────────────────────────────────────────────────┐
│                       Onglet Radar                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  RadarKeywordCard (displayMode='kpi')           │    │
│  │  Jauge centrale : marketScore.total             │    │
│  │  Breakdown : Volume / KD / CPC / Intent /       │    │
│  │              PAA count / AC count               │    │
│  │  ⛔ Aucun signal douleur affiché ici            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Onglet Capitaine                    │
│  ┌─────────────────────────────┐  ┌──────────────────┐  │
│  │  RadarKeywordCard           │  │  CaptainSidePanel│  │
│  │  (displayMode='relevance')  │  │                  │  │
│  │  Jauge : relevanceScore     │  │  KPIs marché     │  │
│  │  Breakdown :                │  │  (lecture seule) │  │
│  │   - Pain × Mot-clé          │  │   Volume / KD /  │  │
│  │   - PAA × Douleur           │  │   CPC / Intent / │  │
│  │   - AC × Douleur            │  │   PAA / AC       │  │
│  │   - Racines                 │  │                  │  │
│  │   - Intent × Douleur        │  │  Largeur         │  │
│  │                             │  │  redimensionable │  │
│  │  ⛔ KPIs marché PAS ici     │  │  jusqu'à         │  │
│  │     (cf. side-panel →)      │  │  viewport - 320  │  │
│  └─────────────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Exemple concret : « agence référencement naturel paris »

**Profil** : Mot-clé longue-traîne 4 mots, faible volume DataForSEO mais racines fortes.

```jsonc
// ValidateResponse retournée par POST /keywords/agence référencement naturel paris/validate
{
  "keyword": "agence référencement naturel paris",
  "verdict": { "level": "ORANGE", "reason": "Volume faible mais intent commercial fort" },

  "marketScore": {
    "total": 58,
    "verdict": "ORANGE",
    "components": [
      { "name": "volume",       "normalized": 35, "weight": 0.30 },  // 90 rech/m → red en pilier
      { "name": "kd",           "normalized": 40, "weight": 0.20 },  // KD 62 → orange
      { "name": "intent",       "normalized": 100, "weight": 0.15 }, // commercial
      { "name": "paa",          "normalized": 70, "weight": 0.10 },  // 8 PAA
      { "name": "autocomplete", "normalized": 60, "weight": 0.10 },  // 6 matches
      { "name": "cpc",          "normalized": 100, "weight": 0.10 }  // CPC 4.20€ → bonus
    ]
  },

  "relevanceScore": {
    "total": 78,
    "verdict": "GO",
    "breakdown": {
      "painKeyword": { "weight": 0.30, "normalized": 90, "contribution": 27.0 },
      "paaPain":     { "weight": 0.25, "normalized": 75, "contribution": 18.75 },
      "acPain":      { "weight": 0.15, "normalized": 60, "contribution": 9.0 },
      "roots":       { "weight": 0.20, "normalized": 80, "contribution": 16.0 },
      "intentPain":  { "weight": 0.10, "normalized": 100, "contribution": 10.0 }
    },
    "rootsContext": { "rootsAverageScore": 80, "fallbackApplied": false }
  }
}
```

**Lecture éditoriale** :

- **Onglet Radar** dit : *« Marché 58, ORANGE — attention au volume faible »*. Si l'utilisateur s'arrête là, il pourrait passer à côté.
- **Onglet Capitaine** dit : *« Pertinence 78, GO — le keyword parle de la douleur, ses racines sont fortes »*. C'est le **vrai signal éditorial**.

Sans la séparation, l'utilisateur aurait vu un score combiné moyen et n'aurait pas reconnu le profil « longue-traîne pertinente » qui mérite d'être ciblé.

---

## API : structures retournées

### `POST /keywords/:keyword/validate`

```ts
interface ValidateResponse {
  keyword: string
  articleLevel: 'pilier' | 'intermediaire' | 'specifique'
  kpis: KpiResult[]                  // KPIs bruts (existant)
  verdict: ValidateVerdict           // Verdict legacy (existant)
  fromCache: boolean
  cachedAt: string | null
  paaQuestions?: PaaQuestionValidate[]

  // 2026-04-28 — Nouveaux champs (rétro-compat : optionnels)
  marketScore?: MarketScoreResult
  relevanceScore?: RelevanceScoreResult | null
}
```

### `POST /keywords/radar/scan`

Chaque `RadarCard` du résultat contient :

```ts
interface RadarCard {
  keyword: string
  reasoning: string
  kpis: RadarKeywordKpis
  paaItems: RadarPaaItem[]
  combinedScore: number              // Legacy, conservé en transition
  scoreBreakdown: RadarCombinedScoreBreakdown   // Legacy
  cachedPaa: boolean

  // 2026-04-28 — Nouveaux champs
  marketScore?: MarketScoreResult
  relevanceScore?: RelevanceScoreResult | null
}
```

---

## FAQ

**Q. Pourquoi `marketScore` ne contient pas l'alignement douleur ?**
Parce qu'on veut une mesure **objective** de la puissance SEO, **indépendante de l'article**. Le même keyword peut être réutilisé pour des articles différents — son marketScore ne change pas, mais son relevanceScore sera recalculé à chaque fois.

**Q. Pourquoi `relevanceScore` ne contient pas Volume / KD ?**
Parce qu'on veut savoir si le keyword **mérite** d'être traité éditorialement, indépendamment du marché. Une longue-traîne sans volume mais 100% pertinente vaut mieux qu'un keyword volumique hors-sujet.

**Q. Le `combinedScore` legacy a-t-il toujours du sens ?**
Oui en transition (rétro-compat). À terme il sera supprimé une fois les consommateurs migrés (carousel de tri, sidebar racines). Voir story future.

**Q. Comment sont définies les racines ?**
Décomposition linéaire (troncature progressive depuis la fin du keyword), max 5 racines. Pas de combinatoire. Voir [src/composables/keyword/useCapitaineValidation.ts](../src/composables/keyword/useCapitaineValidation.ts) → `extractRoots()`.

**Q. Le verdict bloque-t-il quelque chose ?**
**Non.** Depuis 2026-04-28, le verdict est purement informatif. Le bouton « Valider ce Capitaine » est toujours cliquable. L'utilisateur peut verrouiller même un verdict NOGO s'il a une raison stratégique.

---

---

## 🎯 Pattern « malus intégré » — extensible aux autres composantes

Le **malus intent mismatch** introduit en S5 suit un principe qu'il faut connaître pour l'étendre proprement à d'autres signaux SEO :

> **Le malus n'est jamais une variable séparée du score final. Il est soustrait directement du `normalized` de la composante concernée.**

### Pourquoi ?

- **Lisibilité du breakdown** : un utilisateur qui regarde `intentPain.normalized = 20` voit directement la pénalité. Pas besoin de chercher un malus global ailleurs.
- **Granularité** : chaque composante devient indépendamment ajustable.
- **Composabilité** : on peut empiler plusieurs facteurs négatifs sur la même composante sans complexifier le calcul global.

### Comment l'appliquer ailleurs

Pour ajouter un malus sur une autre composante (exemples futurs) :

```ts
// Cannibalisation détectée → malus sur painKeyword
let painKeywordNorm = clampScore(input.painAlignmentScore, 50)
if (input.cannibalizationDetected) {
  painKeywordNorm = Math.max(0, painKeywordNorm - CANNIBALIZATION_MALUS)
}

// Longueur excessive du keyword → malus sur acPain
let acPainNorm = clampScore(input.autocompletePainAlignmentAvg, 50)
if (input.keywordWordCount > 8) {
  acPainNorm = Math.max(0, acPainNorm - LENGTH_MALUS)
}
```

Chaque malus est :
1. **Une constante exportée** (`INTENT_MISMATCH_MALUS`, `CANNIBALIZATION_MALUS`, …) pour ajustement sans toucher à la logique
2. **Appliqué après le calcul de base** de la composante
3. **Clampé à 0** pour ne jamais produire de valeurs négatives

C'est un pattern qu'on peut systématiser pour transformer le scoring de pertinence en outil de plus en plus fin sans complexifier la fonction principale.

---

## Voir aussi

- [docs/pain-point-editorial-backbone.md](./pain-point-editorial-backbone.md) — Le painPoint comme colonne vertébrale éditoriale (rôle dans les prompts, l'UI et le scoring de pertinence)
- [docs/moteur-data-flow.md](./moteur-data-flow.md) — Flux complet du Moteur (3 phases / 6 onglets)
- [docs/article-id-reference.md](./article-id-reference.md) — Système d'identification des articles
- [shared/scoring.ts](../shared/scoring.ts) — `computeRelevanceScore` + `computeCombinedScore` (legacy)
- [shared/scoring-kpi.ts](../shared/scoring-kpi.ts) — `computeMarketScore` + `computeKpiScore` (breakdown)
- [shared/types/scoring.types.ts](../shared/types/scoring.types.ts) — Types `MarketScoreResult`, `RelevanceScoreResult`, `ScoreVerdict`
