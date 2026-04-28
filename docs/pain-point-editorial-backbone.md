# Le Point de Douleur — Colonne vertébrale éditoriale

> Dernière mise à jour : **2026-04-28**
> Doc complémentaire : [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md)
> Source de vérité technique : code dans `src/`, `server/`, `shared/` — ce document décrit l'intention et l'usage transverse.

---

## TL;DR

Le **point de douleur** (`painPoint`) est la frustration concrète qui pousse un visiteur à taper sa requête sur Google. Dans cette app, il **n'est pas un simple champ texte** : c'est l'**input central** qui irrigue le pipeline éditorial de bout en bout — Cerveau (stratégie), Moteur (validation mots-clés), Rédaction (génération de contenu).

Trois usages typiques :
1. **Comme input de génération** — Claude génère des candidats keywords/lieutenants/lexique alignés avec la douleur.
2. **Comme input de validation/scoring** — chaque keyword est jugé sur sa capacité à parler de cette douleur (Score de Pertinence).
3. **Comme contexte sémantique des prompts IA** — chaque panel d'analyse, chaque suggestion, chaque outline embarque la douleur.

Sans painPoint correctement défini, l'app peut produire du contenu SEO **techniquement correct mais éditorialement creux**.

---

## 1. Définition produit

### Qu'est-ce qu'un point de douleur ?

> *« Les agences SEO me proposent des prestations standardisées sans comprendre mon secteur ni mon marché local »*
> *« Je galère à trouver une plateforme qui gère facturation et planning sans payer 200€/mois »*
> *« Je veux apprendre le piano mais tous les cours sont pour débutants ou pour pros, pas d'intermédiaire »*

C'est :
- **Concret** (pas un thème abstrait)
- **À la première personne** (frustration du visiteur, pas du business)
- **Spécifique à l'article** (pas le cocon entier — chaque article a une nuance)

Ce n'est **pas** :
- Une intention commerciale (« vendre des cours »)
- Un mot-clé (« cours piano intermédiaire »)
- Une caractéristique produit (« cours de 45 min »)

### Quand est-il défini ?
Dans la phase **Cerveau** (stratégie cocon), au moment de la création de chaque article. Stocké sur l'objet `Article.painPoint` (PostgreSQL). Modifiable à tout moment, mais sa modification invalide les calculs de pertinence en cache pour cet article.

---

## 2. Diffusion dans le pipeline

```
┌────────────────────────────────────────────────────────────┐
│  CERVEAU                                                   │
│  ─────────                                                 │
│  Création article → painPoint saisi → DB                   │
│  Prompts utilisés : strategy-deepen, cocoon-articles,      │
│                     cocoon-articles-spe, theme-parse,      │
│                     pain-translate                         │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  MOTEUR (6 onglets / 3 phases)                             │
│  ─────────                                                 │
│  ① Discovery   → painPoint = filtre sémantique             │
│  ② Radar       → painPoint = INPUT scoring (3 alignements) │
│  ③ Capitaine   → painPoint = contexte panel IA + scoring   │
│  ④ Lieutenants → painPoint = devrait être input (gap)      │
│  ⑤ Lexique     → painPoint = devrait être input (gap)      │
│  ⑥ Hn / brief  → painPoint = contexte de génération        │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  RÉDACTION                                                 │
│  ─────────                                                 │
│  Outline + sections + meta : painPoint via strategyContext │
│  Prompts : generate-article-section, generate-outline,     │
│            humanize-section                                │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Lien avec le scoring (KPI vs Pertinence)

Le détail de la pondération vit dans [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md). Ici, on documente le **rôle structurant** du painPoint dans le système de scores.

### Le painPoint est l'oxygène du `relevanceScore`

| Composante du `relevanceScore` | Dépendance painPoint | Sans painPoint |
| ------------------------------ | -------------------- | -------------- |
| Pain × Mot-clé (30%) | embedding(keyword) ↔ embedding(painPoint) | composante neutralisée à 50 |
| PAA × Douleur (25%) | moyenne embedding(PAA) ↔ embedding(painPoint) | composante neutralisée à 50 |
| Autocomplete × Douleur (15%) | moyenne embedding(AC) ↔ embedding(painPoint) | composante neutralisée à 50 |
| Racines (20%) | moyenne `relevanceScore` des racines (récursif) | composante neutralisée à 50 |
| Intent × Douleur (10%) | matrice `painType × intentType` | 50 si `painType` absent |

**Conséquence** : sans painPoint, `relevanceScore.total` ≈ 50 (zone ORANGE neutre, pas exploitable). C'est pour ça que `/keywords/:keyword/validate` retourne `relevanceScore: null` plutôt qu'un score artificiel.

### Le painPoint **n'entre pas** dans le `marketScore`

Volontairement. Le marketScore est une mesure **objective** de la puissance SEO (Volume / KD / CPC / Intent type / PAA count / AC count). Le même mot-clé garde le même `marketScore` quel que soit l'article qui le teste. Cette orthogonalité est **la** raison d'être de la séparation des deux scores.

### Le PAA scoring : système de points cumulatif (déjà en place)

L'app a **déjà** un système de points cumulatif sur les PAA, défini dans [server/services/intent/intent-scan.service.ts:193-221](../server/services/intent/intent-scan.service.ts#L193) :

| Match × Quality | `topicWeight` | `painWeight` (`aligned` / `partial` / `off`) |
| --------------- | ------------- | ------------------------------------------- |
| `none`          | 0             | 2.0 / 0.5 / 0 |
| `partial` + `stem`/`semantic` | 0.25 | idem |
| `partial` + `exact` | 0.5      | idem |
| `total` + `stem`/`semantic` | 1.0   | idem |
| `total` + `exact` | **2.0**    | idem |

**Score final par PAA** = `0.5 × topicWeight + 0.5 × painWeight` quand un painAlignment est disponible.

Donc un PAA **parfaitement aligné** (total+exact + aligned) marque **2.0 points**. Un PAA hors-sujet marque **0**.

### Question ouverte (à brainstormer) — Pertinence en score cumulatif

Aujourd'hui le `paaPainAlignmentAvg` est exposé en moyenne 0-100. Mais le système de points cumulatif au niveau PAA existe déjà.

**Piste** : remplacer la moyenne par un score cumulatif normalisé sur le **maximum atteignable** :

```
paaPainAlignmentScore = (somme des points obtenus) / (nbPAA × 2.0) × 100
```

Exemple : article avec 8 PAA dont 3 marquent 2.0 (aligned+exact), 3 marquent 1.25 (total+exact + partial), 2 marquent 0 (off).
- Somme obtenue : 3×2.0 + 3×1.25 + 2×0 = 9.75
- Maximum théorique : 8 × 2.0 = 16
- `paaPainAlignmentScore` = 9.75 / 16 × 100 = **61%**

Avantage : la richesse sémantique fine des PAA (5 niveaux topicWeight × 3 niveaux painWeight) est conservée jusqu'au score final, au lieu d'être lissée par une moyenne. Et un article avec **beaucoup de PAA** est récompensé s'ils sont alignés (capacité de couverture), un article avec **peu de PAA tous alignés** garde une bonne note.

À discuter : faut-il appliquer la même logique aux racines (score cumulatif sur N racines × max par racine) plutôt qu'une moyenne ?

---

## 4. Inventaire des prompts qui consomment painPoint

### 🟢 Prompts qui injectent painPoint aujourd'hui

| Prompt | Variable | Usage | Onglet/Phase |
| ------ | -------- | ----- | ------------ |
| [pain-translate.md](../server/prompts/pain-translate.md) | `{{painPoint}}` | Traduit la douleur en 5-10 keywords candidats | Discovery (input génération) |
| [intent-keywords.md](../server/prompts/intent-keywords.md) | `{{painPoint}}` | Génère 20 longues-traînes pour le scan PAA | Radar (input génération) |
| [cocoon-articles.md](../server/prompts/cocoon-articles.md) | structure JSON `painPoint` | Chaque article généré du cocon embarque sa propre douleur | Cerveau |
| [cocoon-articles-spe.md](../server/prompts/cocoon-articles-spe.md) | structure JSON `painPoint` | Idem pour les articles Spécialisés (sous-douleurs) | Cerveau |
| [strategy-deepen.md](../server/prompts/strategy-deepen.md) | `{{contextBlock}}` (contient painPoint) | Approfondissement progressif via sous-questions | Cerveau |
| [theme-parse.md](../server/prompts/theme-parse.md) | parsing libre | Extrait douleurs métier d'un brief client | Cerveau |
| [generate-article-section.md](../server/prompts/generate-article-section.md) | `{{strategyContext}}` (agrège douleur) | Calibre ton et angle des sections rédigées | Rédaction |
| [system-propulsite.md](../server/prompts/system-propulsite.md) | system prompt global | Règles Brain-First : la douleur prime sur le keyword | Tous |

### 🟢 Prompts Moteur — couverture livrée (Sprint S1) ✅

| Prompt | Onglet/Phase | État |
| ------ | ------------ | ---- |
| [capitaine-ai-panel.md](../server/prompts/capitaine-ai-panel.md) | Capitaine | ✅ refonte complète : `{{painPoint}}` + `{{marketScore}}` + `{{relevanceScore}}` |
| [propose-lieutenants.md](../server/prompts/propose-lieutenants.md) | Lieutenants | ✅ injection `{{painPoint}}` + instruction de filtrage |
| [lieutenants-hn-structure.md](../server/prompts/lieutenants-hn-structure.md) | Lieutenants/Hn | ✅ injection `{{painPoint}}` + structure adressant la douleur |
| [lexique-suggest.md](../server/prompts/lexique-suggest.md) | Lexique | ✅ injection `{{painPoint}}` |
| [lexique-analysis-upfront.md](../server/prompts/lexique-analysis-upfront.md) | Lexique | ✅ injection `{{painPoint}}` |
| [lexique-ai-panel.md](../server/prompts/lexique-ai-panel.md) | Lexique | ✅ injection `{{painPoint}}` |

### 🟡 Prompts Rédaction — gaps restants (story future)

| Prompt | Onglet/Phase | Bénéfice attendu |
| ------ | ------------ | ---------------- |
| [brief-ia-panel.md](../server/prompts/brief-ia-panel.md) | Rédaction | Analyse brief calibrée douleur (ton, angles, omissions) |
| [generate-outline.md](../server/prompts/generate-outline.md) | Rédaction | Outline qui répond explicitement à la douleur (déjà partiel via strategyContext) |
| [micro-context-suggest.md](../server/prompts/micro-context-suggest.md) | Rédaction | Micro-context qui ramène en permanence la rédaction à la douleur |
| [humanize-section.md](../server/prompts/humanize-section.md) | Rédaction | Humanisation alignée sur le vocabulaire de la douleur |

---

## 5. Inventaire des composants UI qui passent painPoint

### Workflow Moteur — état actuel

| Onglet | Composant | Reçoit painPoint ? | Transmis à API ? | Endpoint |
| ------ | --------- | ------------------ | ---------------- | -------- |
| ① Discovery | [KeywordDiscoveryTab.vue](../src/components/moteur/KeywordDiscoveryTab.vue) | ✅ `articlePainPoint` | ✅ | `/keywords/discover`, `/keywords/relevance-score`, `/keywords/translate-pain` |
| ② Radar | [DouleurIntentScanner.vue](../src/components/intent/DouleurIntentScanner.vue) | ✅ `articlePainPoint` | ✅ | `/keywords/radar/scan`, `/keywords/radar/generate` |
| ③ Capitaine | [CaptainValidation.vue](../src/components/moteur/CaptainValidation.vue) | ✅ | ✅ via `articleId` (S2) | `/keywords/:kw/validate`, `/keywords/:kw/ai-panel` |
| ④ Lieutenants | [LieutenantsSelection.vue](../src/components/moteur/LieutenantsSelection.vue) | ✅ via `articleId` (S2) | ✅ | `/keywords/:kw/propose-lieutenants` |
| ⑤ Lexique | [LexiqueExtraction.vue](../src/components/moteur/LexiqueExtraction.vue) | ✅ via `articleId` (S2) | ✅ | `/keywords/:kw/ai-lexique-upfront`, `/keywords/lexique-suggest` |
| ⑥ Hn / Structure | endpoint `/keywords/:kw/ai-hn-structure` | ✅ via `articleId` (S2) | ✅ | `/keywords/:kw/ai-hn-structure` |

> **Stratégie S2** : plutôt que de propager `painPoint` comme prop dans toute la chaîne UI, le composant transmet uniquement l'`articleId` au backend, qui récupère le painPoint via le helper [getArticlePainPoint](../server/services/queries/article-pain-point.service.ts). Plus simple, moins fragile, fallback `(non défini)` automatique.

### Phase Rédaction

| Composant | Reçoit painPoint ? | Via |
| --------- | ------------------ | --- |
| ArticleEditor | indirect | `strategyContext` agrégé |
| Brief panel | ❌ | gap identifié |
| Outline gen | ✅ partiel | via `strategyContext` |
| Micro-context | ❌ | gap identifié |

---

## 6. Comment le painPoint nourrit les prompts (situations réelles)

### Situation A — Génération de candidats radar

**Article** : *« Comment choisir son agence SEO locale »*
**painPoint** : *« Les agences me proposent des prestations standardisées sans comprendre mon secteur »*

[server/prompts/intent-keywords.md](../server/prompts/intent-keywords.md) reçoit :
```
**Mot-clé pilier** : agence seo
**Sujet précis** : choisir son agence SEO locale
**Douleur client** : Les agences me proposent des prestations standardisées sans comprendre mon secteur

Génère 20 longues-traînes que des personnes vivant cette douleur taperaient...
```

→ Claude génère « agence seo spécialisée immobilier », « agence seo qui connait mon métier », « agence seo proche de moi », etc. — toutes connectées à la douleur. Pas de spam type « tarif agence seo » qui dérive du sujet.

### Situation B — Validation Capitaine (sans painPoint dans le prompt actuel)

[server/prompts/capitaine-ai-panel.md](../server/prompts/capitaine-ai-panel.md) reçoit aujourd'hui :
```
**Mot-clé Capitaine** : agence seo spécialisée immobilier
**Verdict KPI** : ORANGE (4/6 verts)
**KPIs** : Volume 110, KD 35, CPC 3.20€, Intent commercial...
```

Le prompt voit le verdict + les KPIs mais **pas** la douleur. Conséquence : le conseil porte sur le marché (« faible volume, bon CPC »), pas sur l'angle éditorial (« ce keyword incarne la douleur de la personnalisation manquante »). C'est le **gap principal** dans la couverture painPoint actuelle.

**Future amélioration** (story dédiée) : ajouter `**Douleur de l'article** : {{painPoint}}` dans le prompt Capitaine pour que le panel IA donne 3 angles éditoriaux **adressant explicitement la douleur**.

### Situation C — Lieutenants sans douleur

Aujourd'hui, [server/prompts/propose-lieutenants.md](../server/prompts/propose-lieutenants.md) propose des lieutenants à partir de PAA + SERP heading scrapé. Sans painPoint en input, le prompt peut suggérer des lieutenants comme « tarif agence seo » ou « définition seo » — corrects en SEO, mais déconnectés de la douleur de la personnalisation. Avec le painPoint, le prompt peut filtrer pour proposer « agence seo qui parle ma langue », « agence seo spécialisée par secteur » qui prolongent la douleur dans la structure de l'article.

---

## 7. Verdict legacy : à déprécier

[server/prompts/capitaine-ai-panel.md](../server/prompts/capitaine-ai-panel.md) référence aujourd'hui `{{verdict}}` (GO / ORANGE / NO-GO) issu de [shared/kpi-scoring.ts](../shared/kpi-scoring.ts). Avec la séparation KPI/Pertinence (cf. [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md)), ce verdict est **redondant** :

- Il dérive uniquement des KPI marché → c'est devenu `marketScore.verdict`
- Il ne tient pas compte de la pertinence éditoriale (le vrai signal)
- Il rend le prompt mécanique : « ne change pas le verdict » = consigne défensive

**Refonte proposée pour Capitaine AI Panel** (story future) :
```
**Score KPI marché** : {{marketScore.total}}/100 ({{marketScore.verdict}})
**Score Pertinence** : {{relevanceScore.total}}/100 ({{relevanceScore.verdict}})
**Douleur de l'article** : {{painPoint}}
**PAA pertinents** : {{paaItemsRelevant}}

Conseille 3 angles qui adressent la douleur en exploitant les PAA.
Si Marché et Pertinence divergent (ex: Marché 60 / Pertinence 80), explique
le profil "longue-traîne pertinente" et invite à valider malgré le verdict marché.
```

→ Le verdict legacy n'est plus l'orchestrateur ; il devient un signal parmi d'autres.

---

## 8. Roadmap painPoint (post séparation KPI/Pertinence)

> **État au 2026-04-28** : Phases A, B, C, D livrées. Phase E reste hors scope.

### Phase A — Couverture prompts (livrée Sprint S1) ✅
1. ✅ Injecté `{{painPoint}}` dans `capitaine-ai-panel.md` + remplacé `{{verdict}}` par `marketScore` + `relevanceScore`.
2. ✅ Injecté `{{painPoint}}` dans `propose-lieutenants.md` et `lieutenants-hn-structure.md`.
3. ✅ Injecté `{{painPoint}}` dans la triplette lexique (`lexique-suggest`, `lexique-analysis-upfront`, `lexique-ai-panel`).

### Phase B — Couverture UI/API (livrée Sprint S2) ✅
4. ✅ Lieutenants : `articleId` transmis au body de `/keywords/:kw/propose-lieutenants` (le backend récupère le painPoint via le helper `getArticlePainPoint`).
5. ✅ Lexique : toggle « Trier par alignement douleur » côté UI ([LexiqueExtraction.vue](../src/components/moteur/LexiqueExtraction.vue)) + utilitaire pur Jaccard ([src/utils/pain-point-jaccard.ts](../src/utils/pain-point-jaccard.ts)). Tri TF-IDF préservé par défaut.
6. ✅ Hn / Structure : `articleId` accepté dans `/keywords/:kw/ai-hn-structure`.

### Phase C — Refonte scoring PAA en cumulatif (livrée Sprint S3) ✅
7. ✅ Nouvelle fonction `computePaaPainAlignmentCumulative` (formule F1 validée) : `(somme points obtenus / (nbPAA × 2.0)) × 100`.
8. ✅ Racines gérées avec déduplication (Sprint S4) — voir Phase D.

### Phase D — Détection intention désirée vs réelle + gestion racines (livrée S4 + S5) ✅
**Racines (S4)** :
- ✅ Nouvelle fonction `computeRootsRelevanceScore` ([shared/scoring.ts](../shared/scoring.ts)) gérant les 3 cas : diverses fortes, doublons (Jaccard ≥ 0.75 → on garde le meilleur), absence (fallback).
- ✅ Constante `ROOTS_DUPLICATE_THRESHOLD = 0.75` ajustable.

**Intent désirée vs réelle (S5)** :
- ✅ Nouveau champ DB `articles.pain_intent_expected` (migration `014_articles_pain_intent_expected.sql`).
- ✅ Nouveau champ `RelevanceScoreInput.painIntentExpected` (le legacy `painType` reste accepté pour transition, marqué `@deprecated`).
- ✅ **Pattern malus intégré** : quand l'intent réel ≠ intent attendu, un malus de **-10 points** est soustrait directement de `intentPain.normalized` (pas une variable séparée). Voir constante `INTENT_MISMATCH_MALUS` dans [shared/types/scoring.types.ts](../shared/types/scoring.types.ts). Ce pattern peut être réutilisé pour d'autres composantes (cannibalisation, longueur excessive, etc.).
- ✅ `computeVerdict` legacy marqué `@deprecated` avec doc complète (suppression effective dans story future quand 0 consommateur).

### Phase E — Persistance painPoint dans `keyword_metrics` (priorité basse, hors scope)
10. Étudier l'ajout d'une colonne `pain_alignment_score_by_article_id JSONB` pour mémoriser les calculs et éviter de redépendre de `radar_explorations`.

---

## 9. Voir aussi

- [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md) — Pondération détaillée des deux scores
- [docs/moteur-data-flow.md](./moteur-data-flow.md) — Flux complet du Moteur (3 phases / 6 onglets)
- [docs/prompts-reference.md](./prompts-reference.md) — Référence des prompts `.md`
- [docs/ui-sections-guide.md](./ui-sections-guide.md) — Cartographie sections UI ↔ endpoints ↔ prompts
- [server/services/intent/intent-scan.service.ts](../server/services/intent/intent-scan.service.ts) — `matchResonance`, `computePaaWeightedScore`, `topicWeight`, `painWeight`
- [shared/scoring.ts](../shared/scoring.ts) — `computeRelevanceScore`
