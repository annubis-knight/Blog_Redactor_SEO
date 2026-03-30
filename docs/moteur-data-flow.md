# Moteur Workflow — Diagramme de flux

## 1. Vue globale du workflow

```mermaid
flowchart LR
  classDef optional fill:#2d2d3d,stroke:#666,stroke-dasharray:5 5,color:#aaa
  classDef required fill:#1a2744,stroke:#3b82f6,color:#e2e8f0
  classDef bridge fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24,stroke-width:2px
  classDef store fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef context fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe

  CTX["fa:fa-file-alt Contexte Initial<br/><i>selectedArticle</i><br/>keyword, title, painPoint, type"]:::context

  subgraph OPT["OPTIONNELS"]
    direction LR
    D["<b>[D] Discovery</b><br/>6 sources + IA<br/>scoring pertinence"]:::optional
    R["<b>[0] Radar</b><br/>PAA scan<br/>score + heat"]:::optional
  end

  subgraph REQ["WORKFLOW PRINCIPAL"]
    direction LR
    T1["<b>[1] Douleur</b><br/>pain → keywords"]:::required
    T2["<b>[2] Validation</b><br/>multi-source verdict<br/>+ radar heat banner"]:::required
    T3["<b>[3] Exploration</b><br/>intent + autocomplete<br/>+ ajouter a l'audit"]:::required
    T4["<b>[4] Audit</b><br/>keyword audit"]:::required
    T5["<b>[5] Local</b><br/>local vs national"]:::required
    T6["<b>[6] Concurrents</b><br/>content gap"]:::required
    T7["<b>[7] Maps</b><br/>GBP data"]:::required
    T8["<b>[8] Assignation</b><br/>migration keywords<br/>+ longueur cible"]:::required
  end

  CTX --> D
  CTX --> R
  CTX --> T1

  D -- "RadarKeyword[]<br/><i>discoveryRadarKeywords</i>" --> R
  R -. "radarScanResult<br/><i>{ globalScore, heatLevel }</i>" .-> T2
  T1 -- "TranslatedKeyword[]<br/><i>translatedKeywords</i>" --> T2
  T1 -. "translatedKeywords[0].keyword<br/><i>default keyword</i>" .-> T3
  T2 -- "exploreKeyword(kw)<br/><i>intentStore</i>" --> T3
  T3 -. "addToAudit(kw)<br/><i>auditStore.addKeyword()</i>" .-> T4
  T3 --> T4
  T4 --> T5
  T5 --> T6
  T6 -- "avgWordCount<br/><i>recommendedContentLength</i>" --> T8
  T6 --> T7
  T7 --> T8
```

## 2. Ponts de donnees entre onglets

```mermaid
flowchart TB
  classDef ref fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef store fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef computed fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef reset fill:#2a1a1a,stroke:#ef4444,color:#fca5a5

  subgraph MOTEUR_VIEW["MoteurView.vue — Etat central"]
    direction TB

    subgraph REFS["Refs (ponts entre onglets)"]
      R1["discoveryRadarKeywords<br/><code>RadarKeyword[]</code><br/>D → 0"]:::ref
      R2["radarScanResult<br/><code>{ globalScore, heatLevel } | null</code><br/>0 → 2"]:::ref
      R3["translatedKeywords<br/><code>TranslatedKeyword[]</code><br/>1 → 2, 1 → 3"]:::ref
      R4["recommendedContentLength<br/><code>number | null</code><br/>6 → 8"]:::ref
    end

    subgraph COMP["Computed (derives)"]
      C1["activeKeyword<br/><code>selectedArticle.keyword || pilierKeyword</code><br/>→ onglets 3 a 8"]:::computed
      C2["pilierKeyword<br/><code>premier keyword Pilier du cocon</code>"]:::computed
      C3["cocoonName<br/><code>cocoon.name</code>"]:::computed
    end

    subgraph STORES["Stores Pinia (etat global)"]
      S1["intentStore<br/><code>intentData, autocompleteData, localComparisons</code><br/>3 ecrit → 5 lit<br/><i>localComparisons cap 50 entrees</i>"]:::store
      S2["keywordAuditStore<br/><code>results[], typeScores[]</code><br/>4 ecrit → 8 lit<br/>3 ecrit via addToAudit"]:::store
      S3["localStore<br/><code>localMetrics, gbpData</code><br/>5 + 7 partagent"]:::store
      S4["keywordsStore<br/><code>keywords[]</code><br/>CRUD global"]:::store
    end

    subgraph RESET["Reset complet onMounted"]
      RST["intentStore.reset()<br/>localStore.reset()<br/>auditStore.$reset()<br/>resetDiscovery()<br/>translatedKeywords = []<br/>discoveryRadarKeywords = []<br/>radarScanResult = null<br/>recommendedContentLength = null"]:::reset
    end
  end
```

## 3. Flux detaille — Phase Discovery + Radar

```mermaid
flowchart LR
  classDef source fill:#1e293b,stroke:#64748b,color:#cbd5e1
  classDef process fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef cache fill:#2a1a1a,stroke:#ef4444,color:#fca5a5
  classDef emit fill:#1a2e1a,stroke:#22c55e,color:#86efac

  subgraph DISCOVERY["[D] Discovery — useKeywordDiscoveryTab"]
    direction TB

    subgraph INPUTS_D["Props recues"]
      P1["pilierKeyword"]:::source
      P2["articleTitle"]:::source
      P3["articlePainPoint"]:::source
      P4["cocoonName / Theme"]:::source
    end

    subgraph SOURCES["6 sources paralleles"]
      S1["suggestAlphabet<br/><i>A-Z completions</i>"]:::source
      S2["suggestQuestions<br/><i>comment, pourquoi...</i>"]:::source
      S3["suggestIntents<br/><i>modifieurs intent</i>"]:::source
      S4["suggestPrepositions<br/><i>pour, avec, sans...</i>"]:::source
      S5["aiKeywords<br/><i>Claude suggestions</i>"]:::source
      S6["dataforseoKeywords<br/><i>volume, CPC, KD</i>"]:::source
    end

    subgraph SCORING["Traitement"]
      SC["relevanceScores<br/><code>Map&lt;kw, 0|1&gt;</code>"]:::process
      WG["wordGroups<br/><code>WordGroup[]</code>"]:::process
      AN["analysisResult<br/><i>Claude analyse top 20-30</i><br/><code>{ keywords[], summary }</code>"]:::process
    end

    subgraph CACHE_D["Cache Discovery"]
      CD["DiscoveryCacheEntry<br/><i>TTL 7 jours</i><br/>data/cache/discovery/"]:::cache
    end

    INPUTS_D --> SOURCES
    SOURCES --> SC
    SC --> WG
    WG --> AN
    SOURCES --> CD
    SC --> CD
    AN --> CD
  end

  subgraph TRANSFORM["Transformation"]
    TR["toRadarKeywords()<br/>+ analysisResult.keywords<br/><i>dedup lowercase</i>"]:::process
  end

  subgraph RADAR["[0] Radar — useKeywordRadar"]
    direction TB

    subgraph SCAN["POST /keywords/radar/scan"]
      RQ["broadKeyword<br/>specificTopic<br/>keywords[]<br/>depth: 1|2"]:::data
    end

    subgraph RESULTS["Resultats par keyword"]
      RC["RadarCard {<br/>  combinedScore 0-100<br/>  paaItems[] { question, match }<br/>  kpis { vol, kd, cpc, intent }<br/>  scoreBreakdown<br/>}"]:::data
    end

    subgraph GLOBAL["Resultat global"]
      GS["globalScore: 0-100<br/>heatLevel: brulante|chaude|tiede|froide<br/>autocomplete: suggestions[]"]:::data
    end

    SCAN --> RESULTS
    RESULTS --> GLOBAL
  end

  subgraph BRIDGE["Pont vers Validation"]
    BR["radarScanResult ref<br/><code>{ globalScore, heatLevel }</code><br/><i>emit scanned → handleRadarScanned</i>"]:::emit
  end

  DISCOVERY -- "emit send-to-radar<br/><b>RadarKeyword[]</b>" --> TRANSFORM
  TRANSFORM -- "injectedKeywords prop<br/>via discoveryRadarKeywords ref" --> RADAR
  GLOBAL -- "emit scanned<br/>{ globalScore, heatLevel }" --> BRIDGE
```

## 4. Flux detaille — Phase Douleur → Exploration

```mermaid
flowchart LR
  classDef tab fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef store fill:#1a2e1a,stroke:#22c55e,color:#86efac
  classDef action fill:#2a1a2e,stroke:#a855f7,color:#d8b4fe
  classDef bridge fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24,stroke-width:2px

  subgraph T1["[1] Douleur — PainTranslator"]
    IN1["initialPainText<br/><i>selectedArticle.painPoint</i>"]:::data
    IN2["suggestedKeyword<br/><i>selectedArticle.keyword</i>"]:::data
    API1["POST /pain/translate"]:::action
    OUT1["TranslatedKeyword[]<br/><code>{ keyword, reasoning }</code>"]:::data

    IN1 --> API1
    IN2 --> API1
    API1 --> OUT1
  end

  subgraph T2["[2] Validation — PainValidation"]
    IN3["translatedKeywords prop"]:::data
    RH["radarHeat prop<br/><i>{ globalScore, heatLevel } | null</i><br/>banner informatif"]:::bridge
    API2["POST /validate-pain/enriched<br/><i>useMultiSourceVerdict</i><br/><i>usePainVerdict</i>"]:::action
    OUT2["emit select → keyword"]:::data

    RH -.-> API2
    IN3 --> API2
    API2 --> OUT2
  end

  subgraph T3["[3] Exploration"]
    direction TB
    EI["ExplorationInput<br/><i>translatedKeywords[0]?.keyword<br/>?? activeKeyword</i>"]:::tab
    AV["AutocompleteValidation<br/><code>GET /keywords/autocomplete</code>"]:::tab
    IS["IntentStep<br/><code>POST /intent/analyze</code>"]:::tab
    EV["ExplorationVerdict<br/><i>+ bouton Ajouter a l'audit</i>"]:::tab

    EI --> AV --> IS --> EV

    subgraph INTENT_OUT["intentStore (Pinia)"]
      IO1["intentData: IntentAnalysis {<br/>  dominantIntent<br/>  paaQuestions[]<br/>  recommendations[]<br/>  topOrganicResults[]<br/>}"]:::store
      IO2["autocompleteData {<br/>  suggestions[]<br/>  certaintyIndex<br/>}"]:::store
    end

    IS --> IO1
    AV --> IO2
  end

  subgraph AUDIT_BRIDGE["Pont Exploration → Audit"]
    AB["emit addToAudit(kw)<br/><i>auditStore.addKeyword(kw, cocoon, 'Longue traine')</i><br/><i>auditStore.fetchAudit(cocoon)</i>"]:::action
  end

  OUT1 -- "translatedKeywords<br/>(ref MoteurView)" --> IN3
  OUT1 -. "translatedKeywords[0].keyword<br/>default keyword" .-> EI
  OUT2 -- "handleValidationSelect()<br/>activeTab = exploration<br/>intentStore.exploreKeyword(kw)" --> EI
  EV -- "emit addToAudit" --> AUDIT_BRIDGE
```

## 5. Flux detaille — Phase Audit → Assignation

```mermaid
flowchart LR
  classDef tab fill:#1a2744,stroke:#3b82f6,color:#93c5fd
  classDef data fill:#1c1c1c,stroke:#f59e0b,color:#fbbf24
  classDef store fill:#1a2e1a,stroke:#22c55e,color:#86efac

  AK["activeKeyword<br/>(computed)"]:::data

  subgraph T4["[4] Audit"]
    AU["KeywordAuditTable<br/><code>GET /keywords/audit/{cocoon}</code>"]:::tab
    AS["keywordAuditStore {<br/>  results[]<br/>  typeScores[]<br/>  redundancies[]<br/>}"]:::store
    AU --> AS
  end

  subgraph T5["[5] Local / National"]
    LC["LocalComparisonStep<br/><code>intentStore.compareLocalNational()</code>"]:::tab
    LR["LocalNationalComparison {<br/>  local: { vol, kd, cpc }<br/>  national: { vol, kd, cpc }<br/>  opportunityIndex<br/>}<br/><i>localComparisons Map (cap 50)</i>"]:::data
    LC --> LR
  end

  subgraph T6["[6] Concurrents"]
    CG["ContentGapPanel<br/><code>POST /content-gap/analyze</code>"]:::tab
    CL["avgWordCount"]:::data
    CG --> CL
  end

  subgraph T7["[7] Maps & GBP"]
    MS["MapsStep<br/><code>localStore.fetchGbpData()</code>"]:::tab
  end

  subgraph T8["[8] Assignation"]
    LB["recommendedContentLength banner<br/><i>longueur cible (analyse concurrents)</i>"]:::data
    KA["KeywordAssignment<br/>grouped by type:<br/>  Pilier<br/>  Moyenne traine<br/>  Longue traine"]:::tab
    MG["POST /keywords/migrate/<br/>{cocoon}/preview"]:::tab
    LB --> KA
    KA --> MG
  end

  AK --> T4
  AK --> T5
  AK --> T6
  AK --> T7

  AS -- "typeScores[]<br/>results[]" --> T8
  CL -- "recommendedContentLength<br/>(ref MoteurView)" --> T8
  T5 --> T6
  T7 --> T8
```

## 6. Resume des types de donnees echanges

```mermaid
flowchart TB
  classDef type fill:#1e293b,stroke:#64748b,color:#cbd5e1

  subgraph TYPES["Types principaux qui transitent"]
    direction LR

    RK["<b>RadarKeyword</b><br/>{ keyword, reasoning }"]:::type
    TK["<b>TranslatedKeyword</b><br/>{ keyword, reasoning }"]:::type
    RS["<b>RadarScanResult</b><br/>{ globalScore, heatLevel }"]:::type
    RC["<b>RadarCard</b><br/>{ keyword, kpis, paaItems,<br/>combinedScore, scoreBreakdown }"]:::type
    IA["<b>IntentAnalysis</b><br/>{ dominantIntent, paaQuestions,<br/>recommendations, topOrganic }"]:::type
    AR["<b>KeywordAuditResult</b><br/>{ keyword, vol, cpc, kd,<br/>competition, related[] }"]:::type
    LN["<b>LocalNationalComparison</b><br/>{ local, national,<br/>opportunityIndex }"]:::type
  end

  D["[D]"] -- "RadarKeyword[]" --> R["[0]"]
  R -. "RadarScanResult" .-> T2["[2]"]
  T1["[1]"] -- "TranslatedKeyword[]" --> T2
  T1 -. "keyword string" .-> T3["[3]"]
  T2 -- "keyword string" --> T3
  T3 -. "keyword string<br/>addToAudit" .-> T4["[4]"]
  T3 -- "IntentAnalysis" --> T5["[5]"]
  T4 -- "AuditResult[]" --> T8["[8]"]
  T6["[6]"] -- "number<br/>recommendedContentLength" --> T8
```

## 7. Reset et nettoyage memoire

```mermaid
flowchart TB
  classDef reset fill:#2a1a1a,stroke:#ef4444,color:#fca5a5
  classDef cap fill:#1a2744,stroke:#3b82f6,color:#93c5fd

  subgraph ON_MOUNTED["onMounted (changement de cocon)"]
    R1["intentStore.reset()"]:::reset
    R2["localStore.reset()"]:::reset
    R3["auditStore.$reset()"]:::reset
    R4["resetDiscovery()"]:::reset
    R5["translatedKeywords = []"]:::reset
    R6["discoveryRadarKeywords = []"]:::reset
    R7["radarScanResult = null"]:::reset
    R8["recommendedContentLength = null"]:::reset
  end

  subgraph CLEAR_RADAR["handleKeywordsCleared"]
    C1["discoveryRadarKeywords = []"]:::reset
    C2["radarScanResult = null"]:::reset
  end

  subgraph MEMORY_CAP["Protection memoire"]
    M1["intentStore.localComparisons<br/><i>Map cap 50 entrees (FIFO)</i>"]:::cap
    M2["useNlpAnalysis.resetResults()<br/><i>vide Map sans desactiver modele</i>"]:::cap
  end
```
