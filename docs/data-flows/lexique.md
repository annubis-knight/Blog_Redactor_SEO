---
name: lexique
description: Termes sémantiques lexique d'un article — array de strings stocké en JSONB dans `article_keywords.lexique` (sélection utilisateur après TF-IDF + IA). Source autorité = endpoint `/api/serp/tfidf` (cross-article, sans re-SERP) + `lexique_explorations` table (multi-keyword, par article).
type: "{ obligatoire: TfidfTerm[], differenciateur: TfidfTerm[], optionnel: TfidfTerm[], keyword: string, totalCompetitors: number } + sélection utilisateur string[] -> article_keywords.lexique"
last_updated: 2026-05-04
related_fr: [FR-LEX-TFIDF, FR-LEX-SORT, FR-LEX-SELECT, FR-LEX-AI-PANEL, FR-LEX-MULTI-KEYWORD, FR-LEX-CHECK, FR-MOT-PAINPOINT-INJECTION]
---

# Data Flow — lexique

> **Description métier :** Exploitation du champ lexical SERP pour enrichir la couverture sémantique de l'article. Trois niveaux de termes (Obligatoire 70%+ concurrents / Différenciateur 30-70% / Optionnel <30%) issus d'une extraction TF-IDF multi-documents. L'utilisateur sélectionne un sous-ensemble final (validé), persisté en `article_keywords.lexique` JSONB array.
> **Type/format :** Source TF-IDF = `TfidfResult` (3 niveaux triés par densité). Sélection utilisateur = `string[]` (termes choisis, sauvegardés atomiquement avec Capitaine + Lieutenants + racines dans `article_keywords`).

## Producteurs

Qui crée ou met à jour cette donnée :

- **Endpoint** `POST /api/serp/tfidf` ([server/routes/serp-analysis.routes.ts:52-89](../../server/routes/serp-analysis.routes.ts)) — reçoit `{ keyword, articleId? }`, lit `keyword_metrics.serp_raw_json` (OBLIGATOIRE : invariant **NFR-INT-SERP-ONCE** — aucune re-requête SERP). Appelle `extractTfidf(competitors, keyword)`, retourne `TfidfResult` avec 3 niveaux. Persiste optionnellement en `lexique_explorations` via `saveLexiqueTfidf()` si `articleId` fourni (multi-keyword tracking).
- **Service TF-IDF** `extractTfidf()` ([server/services/keyword/tfidf.service.ts:22-81](../../server/services/keyword/tfidf.service.ts)) — tokenization du texte brut des concurrents (filtre stopwords français, ≥3 chars), calcul fréquence document (DF), classification seuil : `DF ≥ 0.7` → obligatoire, `0.3 ≤ DF < 0.7` → différenciateur, `DF < 0.3` → optionnel. Densité = `(total occurrences / total competitors)` arrondie à 0.1. Tri par densité DESC, limité à 50 termes par niveau (ligne 70).
- **Composant Vue** `LexiqueExtraction.vue` ([src/components/moteur/LexiqueExtraction.vue:149-324](../../src/components/moteur/LexiqueExtraction.vue)) — déclenche `/api/serp/tfidf` au clic « Extraire Lexique ». Pré-coche tous les `obligatoire` (ligne 311-315), merge IA recommendations (ligne 240-253). Sauvegarde sélection utilisateur via `articleKeywordsStore.saveDecisions(id)` qui écrit `article_keywords.lexique` array (ligne 282).
- **IA Upfront Lexique** streaming endpoint `/api/keywords/:keyword/ai-lexique-upfront` (appelé post-TF-IDF, ligne 218-256) — injecte le contexte stratégique (painPoint, niveau d'article) et recommande : `{ term: string, aiRecommended: boolean, rationale: string }[]`. Pré-coche les recommandés (ligne 248-250). Persiste via `saveLexiqueAi()` dans `lexique_explorations(ai_recommendations JSONB)`.
- **Multi-keyword Exploration** (Sprint 11 D4) — champ saisie libre `customKeywordInput` (ligne 101, 156-163) permet TF-IDF sur tout mot-clé, pas seulement le Capitaine. Chaque exploration persistée indépendamment en `lexique_explorations(article_id, source_keyword)` avec PK composite (migration 008, ligne 17).
- **DB Hydration** `hydrateFromDb()` (ligne 332-354) — restaure les explorations Lexique d'une session antérieure via `GET /articles/:id/explorations` si frais (`shouldRegenerate()`). Évite les re-calculs TF-IDF + IA intra-session.

## Persistance

**Autorité double** : 

1. **TF-IDF brut cross-article** — `keyword_metrics.serp_raw_json JSONB` (partagée par tous les articles, 7j TTL). Champ source unique pour `/api/serp/tfidf` (NFR-INT-SERP-ONCE : aucun appel SERP supplémentaire).

2. **Explorations multi-keyword article-scoped** — table `lexique_explorations(article_id, source_keyword, tfidf_terms JSONB, ai_recommendations JSONB, ai_missing_terms JSONB, ai_summary TEXT, explored_at TIMESTAMPTZ)` ([server/db/migrations/008_lexique_explorations.sql:8-18](../../server/db/migrations/008_lexique_explorations.sql)) — upsert via `ON CONFLICT (article_id, source_keyword) DO UPDATE`. Permet le replay d'une exploration passée (ligne 485 LexiqueExtraction.vue).

3. **Sélection utilisateur finale** — `article_keywords.lexique TEXT[] JSONB` (même colonne que Capitaine + Lieutenants + racines). Autorité de validation = cette table (ce qu'on sauvegarde avec `saveDecisions()` est la vérité). 

- **Store Pinia** `articleKeywordsStore.keywords.lexique` (slot mémoire) — hydrate au fetch initial via `GET /articles/:id/keywords`. Modifiable côté front (checkboxes), sauvegardé atomiquement en `saveDecisions()` (ligne 282).

Hiérarchie d'autorité :
```
keyword_metrics.serp_raw_json (SERP brut, cross-article)
    ↓
lexique_explorations (TF-IDF calculé, IA recommendations, article-scoped)
    ↓
article_keywords.lexique (sélection utilisateur validée)
```

## Consommateurs

### Affichage (UI)

- **Composant LexiqueExtraction.vue** — affiche 3 sections : obligatoire (tous cochés par défaut), différenciateur (filtrés par IA), optionnel (non cochés par défaut). Chaque terme affiche : `density`, `documentFrequency`, `competitorCount`, badge `aiRecommended` (ligne 495+).
- **Barre de tri SortToggleBar.vue** ([src/components/moteur/SortToggleBar.vue:1-160](../../src/components/moteur/SortToggleBar.vue)) — options `{ key: 'az', label: 'A-Z' }`, `{ key: 'density', label: 'Densité' }`, `{ key: 'alignment', label: 'Pertinence douleur' }` (ligne 62-71 LexiqueExtraction). Sortes par terme lexico, densité TF-IDF ou Jaccard douleur.
- **Recap Finalisation** — affiche nombre de termes lexique sélectionnés (dans le recap de validation).
- **Panel IA LexiqueAiPanel.vue** — recommandations en texte libre (summary), compteurs `aiRecommendedCount` vs `notRecommendedCount` (ligne 189-198 LexiqueExtraction).

### Calcul / tri / filtre / agrégat

- **Tri par alignement douleur** — `getLexiqueValue(term, 'alignment')` appelle `jaccardWithPainPoint(term, painPoint)` ([src/utils/pain-point-jaccard.ts:24-32](../../src/utils/pain-point-jaccard.ts)) — score Jaccard ∈ [0, 1] entre l'ensemble des mots ≥4 chars du terme et du painPoint. Tri DESC par défaut (ligne 88 LexiqueExtraction).
- **Pré-cochage automatique** — obligatoire DF ≥ 70% → pre-checked (ligne 311-315). Différenciateur avec `aiRecommended: true` → pre-checked (ligne 248-250). Algorithme : greedy, ALL(obligatoire) + FILTER(différenciateur where aiRecommended).
- **Injection prompt IA** — `buildKeywordContext()` (non montré ici, cf. docs/ai-usage-map.md) construit `{{secondaryKeywords}}` (Lieutenants array) + `{{lexique}}` (array de strings sélectionnés). Utilisé par tous les prompts de génération article (rédaction, meta, structure).
- **Calcul score pertinence Capitaine** — le lexique PEUT influencer indirectement via l'IA qui le recommande, mais ne crée pas de score direct (c'est un enrichissement sémantique, pas un KPI).

> **Règle de cohérence affichage / calcul** — Le même terme utilisé pour l'affichage (checkbox dans LexiqueExtraction), le tri (SortToggleBar) et l'injection prompt (buildKeywordContext) doit être la même string normalisée (lowercase trim). Pas de fallback différent : si un terme est `null` au TF-IDF (malformé), il n'est jamais coché ni injecté.

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque de divergence |
|---|---|---|---|
| Premier load (SERP frais) | Capitaine lock → `/api/serp/tfidf` hit → `LexiqueExtraction` monté, TF-IDF affiché | `saveDecisions()` → `article_keywords.lexique` | Modéré : si TF-IDF n'a pas eu assez de compétiteurs (`total < 3`), la liste est vide. Affichage "Aucun terme" est correct. |
| Reload (SERP stale, > 7j) | Utilisateur ouvre Moteur, hydrate explorations DB → restaure ancien TF-IDF | Utilisateur revalidate → appel `/api/serp/analyze` refresh + `/api/serp/tfidf` recalc + re-IA → `saveDecisions()` | **Risque MODÉRÉ** : ancien TF-IDF vs nouveau peuvent différer (changements SERP). Popup "Données stale, recalculer ?" lors du restore aurait aidé (TODO). |
| Switch onglet Phase ②→③ (Lexique → Finalisation) | hydrate depuis `article_keywords.lexique` (mémoire/Pinia) | aucune | Faible : état mémorisé. |
| Tri par alignement douleur, puis painPoint change | affiche `alignment` score en direct via `jaccardWithPainPoint()` | aucun (c'est du calcul pur, pas de persistance) | **Risque CRITIQUE** : si painPoint changé APRÈS sélection lexique, le tri change mais la sélection mémorisée ne change pas. La checkbox pour "personnalisée" était alignée à l'ancien painPoint, plus à celui-ci. Solution : invalider Lexique quand painPoint change (à implémenter). |
| Multi-keyword exploration (Sprint 11 D4) | `/api/serp/tfidf` pour mot-clé N via `customKeywordInput` → `/api/serp/analyze` si SERP miss → calcul TF-IDF local | chaque extraction persistée séparément en `lexique_explorations(article_id, keyword)` | Modéré : chaque mot-clé a son propre TF-IDF. Pas de collision si les keywords sont distincts. |
| Restore past exploration (clic bouton du chip ligne 485) | `lexique_explorations` table hit, restaure `tfidfTerms` + `iaRecommendations` | aucune (c'est une restauration, pas une mutation) | **Risque FAIBLE** : timestamp `exploredAt` affiché au hover (ligne 484), donc l'utilisateur voit l'âge. |
| IA Upfront abort (utilisateur cancel avant fin du stream) | `iaAbort()` appelé (ligne 215, 267, 387) | aucune (cancel in-flight, ne sauvegarde pas) | Faible : les recommendations inachevées ne sont pas committées. |
| Validation atomique (saveDecisions) | `articleKeywordsStore.saveDecisions()` fusion {capitaine, lieutenants, lexique, rootKeywords} | `PUT /articles/:id/keywords` écrit 4 colonnes en une requête | **Risque FAIBLE SI atomicité API** : l'endpoint doit écrire Capitaine + Lieutenants + Lexique + racines dans la même transaction DB, sinon divergence UI → DB. À vérifier : `server/routes/keyword-validate.routes.ts` ou `server/routes/article-keywords.routes.ts`. |
| Merge cache + DB (TabLoadPrompt 2026-05-01) | `fetchKeywordsMerge()` récupère lexique distant et fusionne par valeur (union, ligne 97-105) | aucune (fetch seul) | Faible : union par string = pas de collision, pire cas = doublons (dedup fait au affichage). |
| Check workflow émis (MOTEUR_LEXIQUE_VALIDATED) | `articleKeywordsStore.keywords.completedChecks` (mémoire, emit line 285) | `emit('check-completed', MOTEUR_LEXIQUE_VALIDATED)` via composant parent (MoteurView) qui appelle le backend | Modéré : emit est fire-and-forget, pas garanti d'arrive au backend. À confirmer : le parent gère le POST check ou LexiqueExtraction l'appelle directement ? Aujourd'hui c'est le parent (MoteurView) qui le fait, donc `LexiqueExtraction` doit émettre l'événement (✅ ligne 285 fait ça). |
| Invariant NFR-INT-SERP-ONCE violation | `/api/serp/tfidf` lecture `keyword_metrics.serp_raw_json` | aucun (read-only) | **Risque CRITIQUE** : si utilisateur clique TF-IDF avant `/api/serp/analyze`, `serp_raw_json` est `null` → endpoint retourne 404 "Lancez d'abord l'analyse SERP" (ligne 69). Route `/serp/analyze` fait le check (ligne 34-37). Composant UI doit désactiver le bouton Extraire Lexique tant que SERP n'est pas lancé (à vérifier dans LexiqueExtraction.vue). |

## Diagramme

```mermaid
flowchart TD
    subgraph Producteurs["Producteurs (SERP-driven)"]
        DF["DataForSEO SERP<br/>(articles, snippets)"]
        SERP["POST /api/serp/analyze<br/>(serp-analysis.routes.ts:19-50)<br/>→ upsertKeywordSerp"]
        KMDB[("keyword_metrics.serp_raw_json<br/>(cross-article, 7j TTL)")]
    end
    
    subgraph TfidfCalc["Calcul TF-IDF (local, zero-API)"]
        EXT["extractTfidf()<br/>(tfidf.service.ts:22-81)<br/>tokenize + DF + classify"]
        RES["TfidfResult<br/>(3 niveaux par density)"]
    end
    
    subgraph UI["Composant Vue + Sélection"]
        LV["LexiqueExtraction.vue<br/>(ligne 149-324)<br/>fetch + affichage"]
        STB["SortToggleBar.vue<br/>(tri A-Z/density/alignment)"]
        CB["Checkboxes utilisateur<br/>(obligatoire pré-checked)"]
        SEL["selectedTerms: Set&lt;string&gt;"]
    end
    
    subgraph IA["IA Upfront Recommendations"]
        IAEP["/api/keywords/:kw/ai-lexique-upfront<br/>(streaming)"]
        IAREC["{ term, aiRecommended, rationale }[]"]
    end
    
    subgraph Persistence["Persistance multi-niveaux"]
        LEX_EXP["lexique_explorations<br/>(article_id, source_keyword)<br/>tfidf_terms JSONB<br/>ai_recommendations JSONB"]
        AK["article_keywords.lexique<br/>TEXT[] JSONB<br/>(sélection finale)"]
    end
    
    subgraph Consumers["Consommateurs"]
        AKS["articleKeywordsStore<br/>(hydrate + saveDecisions)"]
        GEN["buildKeywordContext()<br/>→ {{lexique}} pour<br/>generate-article-section"]
        FIN["FinalisationRecap<br/>affichage sélection"]
    end
    
    DF --> SERP
    SERP --> KMDB
    KMDB -->|read NO re-SERP| EXT
    EXT --> RES
    RES --> LV
    LV --> STB
    STB --> CB
    CB --> SEL
    RES --> IAEP
    IAEP --> IAREC
    IAREC --> CB
    IAREC --> LEX_EXP
    RES --> LEX_EXP
    LEX_EXP --> LV
    SEL --> AKS
    AKS -->|saveDecisions()| AK
    AK --> GEN
    AK --> FIN
    
    classDef calcul fill:#fee,stroke:#c66,color:#000
    classDef persist fill:#efe,stroke:#6c6,color:#000
    classDef external fill:#eef,stroke:#66c,color:#000
    class EXT,STB,IAREC,GEN calcul
    class LEX_EXP,AK,KMDB persist
    class DF external
```

## Régressions historiques

- **Sprint 11 (2026-04-XX)** — Introduction `lexique_explorations` table pour multi-keyword exploration (D4 requirement). Avant : TF-IDF était calculé ad-hoc, jamais persisté. Après : chaque extraction est sauvegardée avec timestamp, allow replay via past-explorations chips (ligne 476-487). Premier risque : table vide pour les anciennes explorations → migration retroactive skippée, utilisateurs voient liste vide au reload. Accepté comme « data migration à faire au prochain batch ».
- **Sprint S2 (2026-05-02)** — Ajout tri par alignement douleur (`sortByPainAlignmentJaccard`) via Jaccard. Avant : tri par A-Z / Densité seulement. Après : option « Pertinence douleur » + calcul scoring painPoint × term. Risque : si painPoint vide, le tri revient à état default (ligne 67-70 LexiqueExtraction). TODO : invalider Lexique quand painPoint change.
- **2026-04-28 (Score Pertinence)** — Séparation Score Marché / Score Pertinence. Lexique n'a pas d'impact direct sur les scores, mais l'IA qui le recommande a intégré le painPoint dans son contexte. Vérifier : le prompt `lexique-ai-panel.md` (ligne 1-38 dans le fichier source) injecte bien `{{painPoint}}` et `{{strategy_context}}`.
- **Sprint 15.5-bis (2026-05-03)** — SERP scraping déplacé dans `keyword_metrics.serp_raw_json` au lieu de `serp_explorations` article-scoped. Invariant **NFR-INT-SERP-ONCE** : TF-IDF utilise JSON hérité, zéro re-requête (ligne 68 serp-analysis.routes.ts check `if (!serpData?.competitors)`).

## Tests de cohérence à écrire

À placer dans `tests/unit/coherence/lexique.test.ts` :

1. **`describe('FR-LEX-TFIDF — classification DF seuil')`** — vérifier que les seuils DF ≥ 0.7 / 0.3-0.7 / < 0.3 placent les termes dans les bons niveaux. Cas : 10 concurrents, terme dans 7 → obligatoire (70%), 5 → différenciateur (50%), 2 → optionnel (20%). Inclure test pour densité arrondie à 0.1 (ligne 57 tfidf.service.ts).

2. **`describe('FR-LEX-SELECT — pré-cochage automatique')`** — vérifier que `LexiqueExtraction` pré-coche 100% des obligatoire + différenciateur où `aiRecommended = true` (ligne 311-315 composant). Tester la mutation `selectedTerms: Set` après fetch TF-IDF + IA.

3. **`describe('FR-LEX-SORT — cohérence tri (A-Z vs Densité vs Alignment)')`** — appeler `sortTermsByAlignment()` avec 3 critères différents, vérifier que l'ordre change. Cas : termes `['seo', 'référencement', 'naturel']`, densité `[2.5, 1.0, 0.5]`, alignment painPoint `[0.8, 0.2, 0.6]`. Au tri Densité DESC : `seo > référencement > naturel`. Au tri Alignment DESC : `seo > naturel > référencement`.

4. **`describe('FR-MOT-PAINPOINT-INJECTION — invalidation Lexique si painPoint changé')`** — PLACEHOLDER (non encore implémenté) : quand `articles.pain_point` est modifié, le composant Lexique doit reset `selectedTerms` et `tfidfResult` (sinon les alignements de tri deviennent obsolètes). Test : modifier painPoint en store, vérifier que `LexiqueExtraction.watch(painPoint)` déclenche un cleanup.

5. **`describe('NFR-INT-SERP-ONCE — TF-IDF refuse sans SERP data')`** — appel `/api/serp/tfidf` avant `/api/serp/analyze` → 404 "Lancez d'abord l'analyse SERP" (ligne 69). Mock `getKeywordMetrics()` pour retourner `serpRawJson: null`, puis appel route, vérifier le code d'erreur. Implémenter aussi un test UI : bouton « Extraire Lexique » doit rester disabled tant que `isSerpAnalyzed = false` (à vérifier dans canExtract computed, ligne 119).

6. **`it.todo('FR-LEX-MULTI-KEYWORD — chaque source_keyword persiste indépendamment')`** — effectuer deux TF-IDF sur deux mots-clés différents, vérifier que les deux enregistrements coexistent dans `lexique_explorations` sans collision PK. Puis restaurer par mot-clé et vérifier que chaque TF-IDF est distinct.

7. **`it.todo('FR-LEX-CHECK — check MOTEUR_LEXIQUE_VALIDATED émis atomiquement avec saveDecisions()')`** — `validateLexique()` (ligne 273-287) appelle `saveDecisions()` et émet le check. Vérifier que les deux opérations sont synchrones (ou que la Promise est attendue avant émission).

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
