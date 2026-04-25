# Moteur Workflow — Diagramme de flux

> Mis à jour : 2026-04-24
> Source de vérité : `src/views/MoteurView.vue` + composants `src/components/moteur/*` + constantes `shared/constants/workflow-checks.constants.ts`

## 1. Vue globale du workflow — 3 phases / 6 onglets

```mermaid
flowchart LR
  classDef explorer fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef validate fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef finalisation fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe
  classDef context fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24

  CTX["fa:fa-file-alt Contexte Initial<br/><i>selectedArticle</i><br/>article.id, title, type, cocoonId<br/><i>strategy du Cerveau (optional)</i>"]:::context

  subgraph P1["Phase ① EXPLORER (toujours accessible)"]
    direction LR
    DISC["<b>Discovery</b><br/>KeywordDiscoveryTab<br/>6 sources + IA<br/>check: moteur:discovery_done"]:::explorer
    RADAR["<b>Radar</b><br/>DouleurIntentScanner<br/>scoring + heat<br/>check: moteur:radar_done"]:::explorer
  end

  subgraph P2["Phase ② VALIDER (verrouillage séquentiel, gating souple)"]
    direction LR
    CAPT["<b>Capitaine</b><br/>CaptainValidation<br/>6 KPIs + feu tricolore<br/>check: moteur:capitaine_locked"]:::validate
    LT["<b>Lieutenants</b><br/>LieutenantsSelection<br/>SERP top 3-10<br/>check: moteur:lieutenants_locked"]:::validate
    LEX["<b>Lexique</b><br/>LexiqueExtraction<br/>TF-IDF (zéro requête)<br/>check: moteur:lexique_validated"]:::validate
  end

  subgraph P3["Phase ③ FINALISATION (read-only)"]
    FINAL["<b>Finalisation</b><br/>FinalisationRecap<br/>débloqué si 3 checks ② ✓<br/>→ /cocoon/:id/redaction"]:::finalisation
  end

  CTX --> DISC
  CTX --> RADAR
  CTX --> CAPT

  DISC -- "RadarKeyword[]<br/><i>basket + discovery→radar bridge</i>" --> RADAR
  DISC -- "candidats Capitaine" --> CAPT
  RADAR -. "radarScanResult<br/><i>{ globalScore, heatLevel }</i>" .-> CAPT

  CAPT -- "capitaine verrouillé<br/><i>unlock Lieutenants</i>" --> LT
  LT -- "SERP rawContents<br/><i>article_explorations</i>" --> LEX
  LT -- "lieutenants[] verrouillés<br/><i>unlock Lexique</i>" --> LEX

  LEX -- "ArticleKeywords écrit<br/><i>capitaine + lieutenants + lexique</i>" --> FINAL
  FINAL -- "Bouton<br/>Passer à la Rédaction" --> REDAC["RedactionView"]
```

## 2. MoteurView — Structure centrale

```mermaid
flowchart TB
  classDef ref fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef store fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef computed fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef panel fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe

  subgraph MOTEUR_VIEW["MoteurView.vue — Orchestrateur"]
    direction TB

    subgraph REFS["Refs & État local"]
      R1["selectedArticle<br/><code>SelectedArticle | null</code>"]:::ref
      R2["capitainesMap<br/><code>Record&lt;articleId, keyword&gt;</code><br/><i>détection cannibalisation</i>"]:::ref
      R3["radarScanResult<br/><code>{ globalScore, heatLevel } | null</code>"]:::ref
      R4["activeTab<br/><code>'discovery'|'radar'|'capitaine'|'lieutenants'|'lexique'|'finalisation'</code>"]:::ref
    end

    subgraph COMP["Computed"]
      C1["cocoonName<br/><code>cocoon.name via cocoonsStore</code>"]:::computed
      C2["phaseChecks<br/><code>status de chaque check moteur:*</code>"]:::computed
      C3["finalisationUnlocked<br/><code>capitaine_locked && lieutenants_locked && lexique_validated</code>"]:::computed
    end

    subgraph PANELS["Panels persistants"]
      P1["SelectedArticlePanel<br/><i>sélection article</i>"]:::panel
      P2["MoteurContextRecap"]:::panel
      P3["MoteurStrategyContext<br/><i>cible, angle, promesse du Cerveau</i>"]:::panel
      P4["BasketStrip + BasketFloatingPanel<br/><i>moteur-basket.store</i>"]:::panel
      P5["TabCachePanel<br/><i>état cache par onglet</i>"]:::panel
      P6["ProgressDots<br/><i>5 dots moteur:*</i>"]:::panel
      P7["PhaseTransitionBanner"]:::panel
    end

    subgraph STORES["Stores Pinia (par domaine)"]
      S1["article/article-keywords.store<br/><i>capitaine + lieutenants[] + lexique[]</i>"]:::store
      S2["article/article-progress.store<br/><i>completedChecks[] (source vérité)</i>"]:::store
      S3["article/moteur-basket.store<br/><i>candidats agrégés</i>"]:::store
      S4["keyword/keyword-discovery.store"]:::store
      S5["keyword/intent.store"]:::store
      S6["strategy/cocoon-strategy.store<br/><i>contexte stratégique</i>"]:::store
      S7["ui/workflow-nav.store<br/><i>navigation onglets</i>"]:::store
    end
  end
```

## 3. Phase ① Explorer — Discovery + Radar

```mermaid
flowchart LR
  classDef source fill:#1e293b,stroke:#64748b,color:#cbd5e1
  classDef process fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef cache fill:#2a1a1a,stroke:#ef4444,color:#fca5a5
  classDef emit fill:#1a2e1a,stroke:#22c55e,color:#86efac

  subgraph DISCOVERY["Discovery — KeywordDiscoveryTab + useKeywordDiscoveryTab"]
    direction TB

    subgraph INPUTS_D["Props reçues"]
      P1["pilierKeyword"]:::source
      P2["articleTitle"]:::source
      P3["articlePainPoint"]:::source
      P4["cocoonName / Theme"]:::source
      P5["strategyContext<br/><i>(depuis cocoon-strategy.store)</i>"]:::source
    end

    subgraph SOURCES["6 sources parallèles"]
      S1["suggestAlphabet"]:::source
      S2["suggestQuestions"]:::source
      S3["suggestIntents"]:::source
      S4["suggestPrepositions"]:::source
      S5["aiKeywords<br/><i>multi-provider (Claude/Gemini/OpenRouter)</i>"]:::source
      S6["dataforseoKeywords<br/><i>vol, CPC, KD</i>"]:::source
    end

    subgraph SCORING["Traitement"]
      SC["relevanceScores<br/><code>Map&lt;kw, 0|1&gt;</code>"]:::process
      WG["wordGroups<br/><code>WordGroup[]</code>"]:::process
      AN["analysisResult<br/><i>IA analyse top 20-30</i>"]:::process
    end

    subgraph CACHE_D["Cache Discovery (PostgreSQL)"]
      CD["table discovery_cache<br/><i>TTL 7j via api_cache</i><br/>GET /api/discovery-cache/check|load|save"]:::cache
    end

    INPUTS_D --> SOURCES
    SOURCES --> SC
    SC --> WG
    WG --> AN
    SOURCES --> CD
    AN --> CD
  end

  subgraph RADAR["Radar — DouleurIntentScanner"]
    direction TB

    subgraph SCAN["POST /api/keywords/intent-scan/radar/scan"]
      RQ["broadKeyword<br/>specificTopic<br/>keywords[]<br/>depth: 1|2"]:::data
    end

    subgraph RESULTS["Résultats par keyword"]
      RC["RadarCard {<br/>  combinedScore 0-100<br/>  paaItems[] { question, match }<br/>  kpis { vol, kd, cpc, intent }<br/>  scoreBreakdown<br/>}"]:::data
    end

    subgraph GLOBAL["Résultat global"]
      GS["globalScore: 0-100<br/>heatLevel: brûlante|chaude|tiède|froide"]:::data
    end

    SCAN --> RESULTS
    RESULTS --> GLOBAL
  end

  subgraph CHECKS["Checks émis"]
    CK1["emit moteur:discovery_done<br/><i>quand discovery produit résultats</i>"]:::emit
    CK2["emit moteur:radar_done<br/><i>quand radar scan complet</i>"]:::emit
  end

  DISCOVERY --> CK1
  GLOBAL --> CK2

  DISCOVERY -- "RadarKeyword[]<br/><i>bridge via basket ou emit direct</i>" --> RADAR
```

## 4. Phase ② Valider — Capitaine

```mermaid
flowchart LR
  classDef tab fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef store fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef action fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe
  classDef ia fill:#2d1a1a,stroke:#ef4444,color:#fca5a5

  subgraph CAPT["Capitaine — CaptainValidation"]
    direction TB

    subgraph INPUT["Entrée"]
      IN1["Mot-clé pré-rempli<br/><i>selectedArticle.keyword<br/>ou Phase ① Discovery</i>"]:::data
      IN2["CaptainInput<br/><i>saisie alternatif</i>"]:::tab
      IN3["CaptainCarousel<br/><i>slider historique</i>"]:::tab
    end

    subgraph VALIDATE["Validation"]
      API1["POST /api/keywords/:keyword/validate<br/><i>keyword-validate.service</i>"]:::action
      PAR["Appels parallèles<br/>DataForSEO + Autocomplete + PAA<br/>+ racine si longue traîne"]:::action
      CACHE["Cache multi-niveau<br/><i>1. keyword_metrics (cross-article)<br/>2. api_cache (TTL)</i>"]:::data
    end

    subgraph OUT["Sortie"]
      KPI["6 KPIs bruts<br/>Volume, KD, CPC,<br/>PAA, Intent, Autocomplete"]:::data
      VERDICT["Verdict GO/ORANGE/NO-GO<br/><i>shared/kpi-scoring.ts</i><br/><i>seuils par niveau article</i>"]:::data
      RACINE["Analyse racine<br/><i>si longue traîne + données faibles</i>"]:::data
    end

    subgraph UI["Affichage (CaptainValidation enfants)"]
      THERMO["RadarThermometer<br/>+ VerdictBar"]:::tab
      VPANEL["CaptainVerdictPanel<br/><i>6 barres KPI + tooltips seuils</i>"]:::tab
      WORDS["CaptainInteractiveWords<br/><i>découpage racine</i>"]:::tab
      AIPANEL["CaptainAiPanel<br/><i>streaming SSE, ne modifie pas verdict</i><br/>POST /api/keywords/:kw/ai-panel<br/>prompt: capitaine-ai-panel.md"]:::ia
      LOCK["CaptainLockPanel<br/><i>Valider ce Capitaine</i><br/>cadenas unlock"]:::action
    end

    subgraph CHECK["Check émis"]
      CK["emit moteur:capitaine_locked<br/><i>→ unlock Lieutenants</i>"]:::store
    end

    IN1 --> API1
    IN2 --> API1
    IN3 --> API1
    API1 --> PAR
    PAR --> CACHE
    CACHE --> KPI
    CACHE --> VERDICT
    PAR --> RACINE

    KPI --> THERMO
    VERDICT --> THERMO
    KPI --> VPANEL
    RACINE --> WORDS
    KPI --> AIPANEL
    LOCK --> CK
  end
```

**Règles clés :**
- Le verdict GO nécessite ≥4/6 verts, AUCUN rouge sur Volume ou KD, PAA non-rouge
- NO-GO auto si `volume=0 && paa=0 && autocomplete=0`
- CPC asymétrique : > 2€ = bonus vert, 0-2€ = neutre, jamais rouge
- Seuils contextuels par niveau : Pilier (Volume >1000, KD <40), Intermédiaire (Volume >200, KD <30), Spécifique (Volume >30, KD <20)
- L'utilisateur peut forcer GO sur un verdict ORANGE/NO-GO (libre arbitre)
- Panel IA = conseil uniquement, ne modifie JAMAIS le verdict

## 5. Phase ② Valider — Lieutenants (cascade SERP)

```mermaid
flowchart LR
  classDef tab fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef action fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe
  classDef cache fill:#2a1a1a,stroke:#ef4444,color:#fca5a5
  classDef emit fill:#1a2e1a,stroke:#22c55e,color:#86efac

  subgraph LT["Lieutenants — LieutenantsSelection"]
    direction TB

    HEAD["En-tête<br/><i>Capitaine verrouillé + niveau article</i>"]:::data
    CURSOR["Curseur SERP 3-10<br/><i>défaut 10</i>"]:::tab
    BTN["Bouton Analyser SERP"]:::action

    subgraph API["POST /api/serp/analyze"]
      SRV["serp-analysis.service<br/>(external/)"]:::action
      CK["Check api_cache (hash)"]:::cache
      DFSEO["DataForSEO top N"]:::action
      STORE_DB["Stockage article_explorations<br/>(rawContents bruts)"]:::cache
    end

    subgraph SECTIONS["3 sections dépliables"]
      H2["LieutenantH2Structure<br/>Hn concurrents % récurrence"]:::tab
      PAA["PAA N+2 pertinence"]:::tab
      GROUPS["Groupes croisés<br/><i>issus du Cerveau</i>"]:::tab
    end

    subgraph CANDIDATS["Candidats Lieutenants"]
      LPROP["LieutenantProposals<br/>+ LieutenantCard"]:::tab
      BADGES["Badges multi-source<br/>[SERP] [PAA] [Groupe]<br/>+ pertinence Fort/Moyen/Faible"]:::data
      COUNT["Compteur recommandé<br/>Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3"]:::data
    end

    AI_LT["Panel IA structure Hn<br/><i>streaming SSE</i><br/>POST /api/keywords/:kw/ai-hn-structure<br/>prompts: propose-lieutenants.md<br/>+ lieutenants-hn-structure.md"]:::action
    VALIDATE["Valider les Lieutenants<br/><i>UnlockLieutenantsModal (confirm)</i>"]:::action
    CHECK["emit moteur:lieutenants_locked<br/><i>→ unlock Lexique</i>"]:::emit

    HEAD --> CURSOR
    CURSOR --> BTN
    BTN --> SRV
    SRV --> CK
    CK -->|miss| DFSEO
    CK -->|hit| SECTIONS
    DFSEO --> STORE_DB
    STORE_DB --> SECTIONS
    SECTIONS --> CANDIDATS
    CANDIDATS --> BADGES
    CANDIDATS --> COUNT
    CANDIDATS --> AI_LT
    BADGES --> VALIDATE
    VALIDATE --> CHECK
  end
```

**Curseur SERP intelligent :**
- Sous le défaut (< 10) → **filtre local instantané** sur les résultats déjà scrapés (pas de re-call)
- Au-dessus du défaut → **scraping complémentaire** pour les résultats manquants

## 6. Phase ② Valider — Lexique (TF-IDF zéro requête)

```mermaid
flowchart LR
  classDef tab fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef action fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe
  classDef cache fill:#2a1a1a,stroke:#ef4444,color:#fca5a5
  classDef emit fill:#1a2e1a,stroke:#22c55e,color:#86efac

  subgraph LEX["Lexique — LexiqueExtraction"]
    direction TB

    HEAD["En-tête<br/><i>Capitaine + Lieutenants + niveau article</i>"]:::data

    subgraph API_TFIDF["POST /api/serp/tfidf"]
      TFIDF["tfidf.service<br/>(keyword/)"]:::action
      READ_DB["Lecture article_explorations<br/><i>rawContents depuis Lieutenants</i><br/><b>ZÉRO nouvelle requête API</b>"]:::cache
      COMPUTE["Calcul TF-IDF"]:::action
    end

    subgraph OUT["3 niveaux"]
      OBLIG["<b>Obligatoire</b><br/>≥ 70% concurrents<br/><i>pré-cochés</i>"]:::data
      DIFF["<b>Différenciateur</b><br/>30-70%<br/><i>décochés par défaut</i>"]:::data
      OPT["<b>Optionnel</b><br/>&lt; 30%<br/><i>décochés par défaut</i>"]:::data
      DENS["Chaque terme<br/>+ densité récurrence/page<br/>(ex: ×4.2/page)"]:::data
    end

    AI_LEX["Panel IA lexical<br/><i>streaming SSE</i><br/>prompts: lexique-ai-panel.md<br/>+ lexique-analysis-upfront.md"]:::action
    VALIDATE["Valider le Lexique"]:::action

    subgraph WRITE["Écriture finale"]
      AK["article-keywords.store<br/>+ PUT /api/article-keywords/:articleId<br/><i>{ capitaine, lieutenants[], lexique[] }</i>"]:::cache
    end

    CHECK["emit moteur:lexique_validated<br/><i>→ Phase ③ Finalisation débloquée</i>"]:::emit

    HEAD --> TFIDF
    TFIDF --> READ_DB
    READ_DB --> COMPUTE
    COMPUTE --> OBLIG
    COMPUTE --> DIFF
    COMPUTE --> OPT
    COMPUTE --> DENS
    OBLIG --> AI_LEX
    DIFF --> AI_LEX
    OPT --> AI_LEX
    OBLIG --> VALIDATE
    DIFF --> VALIDATE
    OPT --> VALIDATE
    VALIDATE --> AK
    AK --> CHECK
  end
```

## 7. Phase ③ Finalisation

```mermaid
flowchart LR
  classDef gate fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef link fill:#1a2e1a,stroke:#22c55e,color:#86efac

  subgraph P2_DONE["Phase ② Complète"]
    CH1["moteur:capitaine_locked ✓"]:::data
    CH2["moteur:lieutenants_locked ✓"]:::data
    CH3["moteur:lexique_validated ✓"]:::data
  end

  GATE["Gating<br/><i>finalisationUnlocked = all 3 checks</i>"]:::gate

  subgraph FINAL["FinalisationRecap.vue (read-only)"]
    direction TB
    R1["Capitaine validé<br/><i>avec KPIs</i>"]:::data
    R2["Lieutenants[] sélectionnés<br/><i>avec badges</i>"]:::data
    R3["Lexique[] validé<br/><i>3 niveaux</i>"]:::data
    R4["Structure Hn recommandée"]:::data
  end

  LINK["Passer à la Rédaction<br/><i>router.push /cocoon/:cocoonId/redaction</i>"]:::link

  CH1 --> GATE
  CH2 --> GATE
  CH3 --> GATE
  GATE --> FINAL
  FINAL --> LINK
```

## 8. Cache multi-niveau

```mermaid
flowchart TB
  classDef l1 fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef l2 fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef l3 fill:#2a1a1a,stroke:#ef4444,color:#fca5a5

  CALL["Service externe<br/><i>ex: keyword-validate</i>"]

  subgraph L1["Niveau 1 — keyword_metrics (permanent, cross-article)"]
    KM["SELECT * FROM keyword_metrics<br/>WHERE keyword = ?"]:::l1
  end

  subgraph L2["Niveau 2 — api_cache (TTL)"]
    AC["SELECT value FROM api_cache<br/>WHERE key = ? AND expires_at > NOW()"]:::l2
  end

  subgraph L3["Niveau 3 — API externe"]
    GUARD["dataforseo-cost-guard<br/><i>vérifie quota mensuel</i>"]:::l3
    DFSEO["DataForSEO / Autocomplete / Claude / ..."]:::l3
  end

  PURGE["Job horaire<br/>DELETE FROM api_cache<br/>WHERE expires_at < NOW()"]:::l2

  CALL --> KM
  KM -->|HIT| RETURN["Retour direct"]
  KM -->|MISS| AC
  AC -->|HIT| RETURN
  AC -->|MISS| GUARD
  GUARD --> DFSEO
  DFSEO --> WRITE_KM["INSERT/UPDATE keyword_metrics"]
  DFSEO --> WRITE_AC["INSERT api_cache (TTL)"]
  WRITE_AC -.-> PURGE
```

**Effet clé :** un mot-clé utilisé dans N articles = **1 seul appel DataForSEO** grâce à `keyword_metrics`.

## 9. Progression — 5 checks moteur

```mermaid
flowchart LR
  classDef check fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef phase fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef persist fill:#1a2e1a,stroke:#22c55e,color:#86efac

  C1["<b>moteur:discovery_done</b><br/><i>Discovery résultats</i>"]:::check
  C2["<b>moteur:radar_done</b><br/><i>Radar scan complet</i>"]:::check
  C3["<b>moteur:capitaine_locked</b><br/><i>Capitaine verrouillé</i>"]:::check
  C4["<b>moteur:lieutenants_locked</b><br/><i>Lieutenants verrouillés</i>"]:::check
  C5["<b>moteur:lexique_validated</b><br/><i>Lexique validé + ArticleKeywords</i>"]:::check

  PHASE1["Phase ① Explorer"]:::phase
  PHASE2["Phase ② Valider"]:::phase

  PHASE1 --> C1
  PHASE1 --> C2
  PHASE2 --> C3
  C3 --> C4
  C4 --> C5

  subgraph PERSIST["Persistance"]
    STORE["article-progress.store.addCheck()<br/>POST /api/articles/:articleId/progress/check"]:::persist
    DB["UPDATE articles<br/>SET completed_checks = array_append(...)<br/><i>TEXT[] column</i>"]:::persist
    DOTS["ProgressDots (5 dots ●/○)<br/>PhaseTransitionBanner"]:::persist
  end

  C1 --> STORE
  C2 --> STORE
  C3 --> STORE
  C4 --> STORE
  C5 --> STORE
  STORE --> DB
  DB --> DOTS
```

**Constantes (source :** `shared/constants/workflow-checks.constants.ts`) :

```typescript
export const MOTEUR_DISCOVERY_DONE = 'moteur:discovery_done'
export const MOTEUR_RADAR_DONE = 'moteur:radar_done'
export const MOTEUR_CAPITAINE_LOCKED = 'moteur:capitaine_locked'
export const MOTEUR_LIEUTENANTS_LOCKED = 'moteur:lieutenants_locked'
export const MOTEUR_LEXIQUE_VALIDATED = 'moteur:lexique_validated'

export const MOTEUR_CHECKS = [
  MOTEUR_DISCOVERY_DONE, MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_LEXIQUE_VALIDATED,
] as const
```

## 10. Pont Cerveau→Moteur — Enrichissement prompts

```mermaid
flowchart LR
  classDef db fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef prompt fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef ia fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe

  subgraph STRAT["Stratégie Cerveau (DB)"]
    DB["table strategies<br/><i>par cocoon_id</i><br/>cible, douleur, aiguillage,<br/>angle, promesse, CTA"]:::db
  end

  subgraph LOADER["prompt-loader.ts"]
    LOAD["loadPrompt(name, vars)<br/><i>injection {{strategy_context}}</i>"]:::prompt
    FALLBACK["Si pas de cocoonId ou pas de stratégie<br/>→ {{strategy_context}} = ''"]:::prompt
  end

  subgraph PROMPTS["Prompts concernés (.md)"]
    PR1["intent-keywords.md"]:::prompt
    PR2["pain-translate.md"]:::prompt
    PR3["capitaine-ai-panel.md"]:::prompt
    PR4["propose-lieutenants.md"]:::prompt
    PR5["lieutenants-hn-structure.md"]:::prompt
    PR6["lexique-ai-panel.md"]:::prompt
    PR7["lexique-analysis-upfront.md"]:::prompt
  end

  subgraph AI["ai-provider.service"]
    PROV["Multi-provider<br/>Claude / Gemini / OpenRouter / Mock"]:::ia
  end

  DB --> LOAD
  LOAD -.-> FALLBACK
  LOAD --> PROMPTS
  PROMPTS --> PROV
```

## 11. Mode `libre` (Labo) vs mode `workflow` (Moteur)

```mermaid
flowchart TB
  classDef workflow fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef libre fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe
  classDef shared fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24

  COMP["Composants bimodaux<br/><i>prop mode: 'workflow' | 'libre'</i>"]:::shared

  subgraph WF["mode='workflow' (Moteur)"]
    WF1["articleId + cocoonId requis"]:::workflow
    WF2["émet check-completed"]:::workflow
    WF3["persistance cache par article"]:::workflow
    WF4["seuils contextuels<br/>(niveau article)"]:::workflow
    WF5["enrichissement prompts<br/>(strategy_context)"]:::workflow
  end

  subgraph LB["mode='libre' (Labo)"]
    LB1["keywordQuery comme entrée"]:::libre
    LB2["pas d'émission check"]:::libre
    LB3["pas de persistance article"]:::libre
    LB4["seuils par défaut<br/>= Intermédiaire"]:::libre
    LB5["strategy_context = ''"]:::libre
  end

  COMP --> WF
  COMP --> LB
```

**Composants dual-mode utilisés dans le Labo :**
- `KeywordDiscoveryTab`
- `DouleurIntentScanner`
- `CaptainValidation` (verdict GO/NO-GO libre)

## 12. Reset et nettoyage mémoire

```mermaid
flowchart TB
  classDef reset fill:#2a1a1a,stroke:#ef4444,color:#fca5a5
  classDef cap fill:#1a2744,stroke:#3b82f6,color:#93c5fd

  subgraph ON_ARTICLE_CHANGE["Changement d'article sélectionné"]
    A1["reset stores Moteur<br/><i>(article/article-keywords, moteur-basket, etc.)</i>"]:::reset
    A2["reload depuis DB<br/><i>(completed_checks, article_explorations)</i>"]:::reset
    A3["radarScanResult = null"]:::reset
  end

  subgraph MEMORY_CAP["Protection mémoire"]
    M1["intent.store caps<br/><i>Map cap 50 entrées (FIFO)</i>"]:::cap
    M2["useNlpAnalysis.resetResults()<br/><i>vide Map sans désactiver modèle</i>"]:::cap
  end

  subgraph PURGE["Purge DB"]
    P1["Job horaire setInterval()<br/>DELETE FROM api_cache<br/>WHERE expires_at < NOW()"]:::cap
  end
```

## 13. Résumé des types principaux

| Type | Champs clés | Source |
|------|-------------|--------|
| `SelectedArticle` | id, title, type, cocoonId, keyword | `shared/types/article.types.ts` |
| `RadarKeyword` | keyword, reasoning | `shared/types/intent.types.ts` |
| `RadarCard` | combinedScore, paaItems[], kpis, scoreBreakdown | `shared/types/intent.types.ts` |
| `CaptainVerdict` | overall (GO/ORANGE/NO_GO), kpis, reasons[] | `shared/types/keyword-validate.types.ts` |
| `SerpAnalysisResult` | hnData[], paaData[], groupCrossData[], rawContents[] | `shared/types/serp-analysis.types.ts` |
| `TfidfResult` | obligatoire[], differenciateur[], optionnel[], density | `shared/types/serp-analysis.types.ts` |
| `ArticleKeywords` | articleId, capitaine, lieutenants[], lexique[], hnStructure | `shared/schemas/article-keywords.schema.ts` |
| `ArticleProgress` | articleId, completedChecks[] (TEXT[]) | `shared/types/article-progress.types.ts` |
| `WorkflowCheck` | `moteur:*` \| `cerveau:*` \| `redaction:*` | `shared/constants/workflow-checks.constants.ts` |

## 14. Endpoints clés du Moteur

| Méthode | Endpoint | Service | Usage |
|---------|----------|---------|-------|
| POST | `/api/keywords/discover` | keyword-discovery | Discovery seed |
| POST | `/api/keywords/discover-domain` | keyword-discovery | Discovery domaine |
| POST | `/api/keywords/intent-scan/radar/scan` | intent-scan | Radar Douleur Intent |
| POST | `/api/keywords/:keyword/validate` | keyword-validate | Verdict GO/NO-GO Capitaine |
| POST | `/api/keywords/:keyword/ai-panel` | — | Panel IA Capitaine (SSE) |
| POST | `/api/keywords/:keyword/ai-hn-structure` | — | Structure Hn recommandée |
| POST | `/api/keywords/:keyword/propose-lieutenants` | — | Propositions Lieutenants |
| GET | `/api/keywords/:keyword/metrics` | keyword-queries | Lecture `keyword_metrics` |
| POST | `/api/serp/analyze` | serp-analysis | Scraping SERP top N |
| POST | `/api/serp/tfidf` | tfidf | TF-IDF contenus SERP hérités |
| POST | `/api/paa/batch` | — | PAA batch |
| POST | `/api/articles/:articleId/progress/check` | article-progress | Ajoute un check |
| GET | `/api/articles/:articleId/explorations` | article-explorations | Explorations de l'article |
| GET | `/api/cocoons/:id/capitaines` | — | Map capitaines (cannibalisation) |
| GET | `/api/strategy/:cocoonId` | strategy | Contexte stratégique Cerveau |
