---
name: radar-keywords
description: Cartographie des mots-clés Radar (en attente de scan, scannés) et plan de migration vers une architecture DB-first avec signaux SEO objectifs séparés de la pertinence Capitaine.
type: audit + plan de migration
last_updated: 2026-05-11
related_fr:
  - FR-RAD-SCAN-2PASS
  - FR-RAD-SCORING-BIMODAL
  - FR-RAD-NO-RELEVANCE-IN-SCAN
  - FR-CAP-RELEVANCE-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-NO-DB-WRITE
  - FR-DIS-AI-PANEL
  - NFR-UX-STABLE-SKELETON
---

# Data Flow — Radar keywords (audit + plan de migration)

> **Statut :** AUDIT validé, chantier d'implémentation en cours sur `feat/radar-dbfirst-refactor`.
> **Décisions actées** : DB-first via `radar_explorations`, dépréciation du basket mémoire, correction de l'aberration autocomplete, déplacement de la génération courte-traîne vers Discovery, input texte unitaire sur Radar.

## 1. Contexte et problème

L'onglet Radar du Moteur orchestre la qualification SEO d'une liste de mots-clés candidats issus de Discovery ou saisis manuellement. Trois symptômes UX ont déclenché cet audit :

1. **Onglet vide à froid** — quand l'utilisateur arrive sur Radar sans keywords envoyés depuis Discovery et sans cache, la page est silencieuse. Friction #7 (Sprint 5) avait masqué les inputs de génération manuelle en mode workflow ; correction partielle livrée sur `feat/radar-stable-skeleton` 2026-05-11 (squelette stable + inputs visibles avec hint).
2. **Duplication visuelle** — après envoi depuis Discovery, les keywords apparaissent à la fois dans le `BasketStrip` (haut de page) et dans la section « Mots-clés à scanner » (Phase 2 Radar). États mémoire indépendants → modifier l'un n'affecte pas l'autre.
3. **Pas d'input unitaire** — impossible d'ajouter un seul keyword au scan sans passer par la génération IA complète ou par Discovery.

Cause racine commune : **l'état "keywords en attente de scan" vit en mémoire dans 4 endroits parallèles** au lieu d'avoir une source de vérité unique (la DB).

## 2. Sources de données actuelles

### 2.1 Tables DB existantes

```
TABLES CROSS-ARTICLE (cache de signaux SEO objectifs)
├── keyword_metrics
│   PK (keyword, lang, country)
│   volume / KD / CPC / competition / intent / fetched_at
│
├── keyword_autocomplete
│   PK (keyword, lang, country, position)
│   FK keyword_metrics
│   1 ligne par suggestion autocomplete d'un keyword
│
└── keyword_paa_questions
    PK id, UNIQUE (keyword, lang, country, question, depth)
    FK keyword_metrics
    1 ligne par question PAA d'un keyword

TABLES ARTICLE-SCOPED (état utilisateur + signaux contextualisés)
├── radar_explorations
│   PK article_id (1 row/article)
│   seed, broad_keyword, specific_topic, pain_point, depth,
│   generated_keywords JSONB, scan_result JSONB, scanned_at
│
└── paa_explorations
    PK id, UNIQUE (article_id, keyword, question)
    is_match BOOLEAN, match_quality TEXT (exact|stem), explored_at
    Snapshot des matchs lexicaux PAA↔keyword au moment d'une exploration Capitaine
```

### 2.2 États mémoire actuels (à supprimer/migrer)

| État | Composable / store | Rôle | Synchro DB ? |
|------|--------------------|------|--------------|
| `discoveryRadarKeywords` | `useMoteurCrossTabState` | Buffer Discovery → Radar | ❌ Aucune |
| `generatedKeywords` | `useResonanceScore` | Liste à scanner (Phase 2 Radar) | ❌ Écrite seulement au moment du scan |
| `basket.keywords` | `useMoteurBasketStore` | "Journal cross-onglets" | ❌ Reset au switch d'article |
| `selected` (Set) | `useDiscoverySelection` | Sélection Discovery avant envoi | ❌ Mémoire composable |

→ 4 états parallèles pour la même donnée conceptuelle (« keywords en attente de scan »). Asymétries inévitables.

### 2.3 Producteurs réels du basket (audit grep)

| Source typée dans `BasketKeyword['source']` | Caller backend / frontend |
|---|---|
| `discovery` | ✅ `useMoteurCrossTabState.handleSendToRadar` (unique caller) |
| `radar` | ❌ aucun |
| `pain-translator` | ❌ aucun (Pain Translator supprimé) |
| `validation` | ❌ aucun |
| `exploration` | ❌ aucun |
| `manual` | ❌ aucun |

→ Le basket en pratique = « ce qui est passé de Discovery à Radar ». Les 5 autres sources sont du code mort de conception.

### 2.4 Consommateurs du basket

| Consommateur | Usage | Remplaçable par DB ? |
|---|---|---|
| `BasketStrip` | Affichage strip horizontal en haut du Moteur | ✅ oui (lecture `radar_explorations.generated_keywords` + `scan_result.cards`) |
| `BasketFloatingPanel` | Pillule flottante bas-droite | ⚠️ déjà non-utile selon retour utilisateur (n'est plus affichée en pratique) |
| `KeywordAssistPanel` | Suggestions Capitaine/Lieutenants/Lexique | ✅ oui (même lecture DB, filtre par contexte de l'onglet) |

**Backend** : aucun prompt IA, aucune route, aucun service ne consomme le basket. C'est purement frontend visuel.

## 3. Aberration autocomplete identifiée

### 3.1 Problème

Lors d'un scan Radar de N keywords (`scanRadarKeywords` dans `keyword-radar.service.ts:207`) :

```ts
const [autocompleteResult, overviewMap, intentMap] = await Promise.all([
  fetchAutocompleteMergedGrouped(specificTopic),   // ← 1 SEUL appel, sur le sujet article
  fetchKeywordOverviewBatch(keywordStrings),       // ← batch sur TOUS les keywords
  fetchSearchIntentBatch(keywordStrings),          // ← batch sur TOUS les keywords
])
// puis PAA fetché par keyword avec concurrence 3
```

L'autocomplete est fetché **une seule fois** sur `specificTopic` (sujet article), pas par keyword. Ensuite, le champ `autocompleteMatchCount` par card est calculé en comptant combien de suggestions du pool global mentionnent les mots du keyword.

### 3.2 Conséquence

Le `autocompleteMatchCount` d'un keyword reflète « ce keyword apparaît-il dans les autocomplete du sujet article » — pas « ce keyword génère-t-il ses propres autocomplete sur Google ». Distinction subtile mais importante pour un score marché objectif.

### 3.3 Capacité schéma vs code

| Capacité | Schéma DB (`keyword_autocomplete`) | Code Radar actuel |
|---|---|---|
| Stockage par (keyword, lang, country, position) | ✅ supporté | ❌ pas utilisé en mode multi-keyword |
| Cache cross-article | ✅ supporté | ✅ utilisé (1 entry par specificTopic) |
| Fetch par keyword | ✅ possible | ❌ optimisation actuelle = 1 fetch global |

### 3.4 Correction prévue (acté avec l'utilisateur)

Faire un fetch autocomplete **par keyword scanné** au moment du scan, avec cache cross-article TTL 90 jours (pattern identique au PAA). Coût multiplié par ~N, mais signal objectif par keyword au lieu d'approximation.

→ Tracé via nouvelle FR `FR-RAD-AUTOCOMPLETE-PER-KEYWORD` (cf. §6).

## 4. Cohérence is_match / match_quality avec FR-CAP-RELEVANCE-COMPUTED-LIVE

Question soulevée durant l'audit : la table `paa_explorations` stocke `is_match` (BOOLEAN) et `match_quality` (TEXT : exact|stem). Cela ne contredit-il pas `FR-CAP-RELEVANCE-COMPUTED-LIVE` qui dit que la pertinence est calculée à la volée ?

**Investigation** :
- `is_match` / `match_quality` sont **écrits** par `saveCaptainExploration` à partir de `paa.match !== 'none'` et `paa.matchQuality`. Source : matching lexical entre les mots du keyword et les mots de la question PAA (`matchResonance` / `matchResonanceDetailed`). C'est un signal **statique cross-article** (le matching lexical ne dépend pas du pain point).
- Le **score Pertinence** lui-même n'est **pas** stocké — il est recalculé à la volée par `computeRelevanceScore` (cf. ligne 703 `data.service.ts:703` : *« Live computation (FR-CAP-RELEVANCE-COMPUTED-LIVE) : marketScore depuis radar_explorations. relevanceScore ne vient plus du Radar snapshot »*).

**Conclusion** : pas d'incohérence. `is_match` / `match_quality` sont un **cache de signaux lexicaux bruts** (PAA contient-elle les mots du keyword ?), pas un score pré-calculé. La formule de pertinence (avec pondération pain point, etc.) reste calculée à la volée. Le distinguo est subtil mais cohérent : on cache les **entrées** de la formule, pas son **résultat**.

## 5. Architecture cible (DB-first)

### 5.1 Diagramme

```mermaid
flowchart TD
  subgraph BACKEND
    DB[(radar_explorations<br/>article_id PK<br/>generated_keywords JSONB<br/>scan_result JSONB)]
    POSTKW[POST /articles/:id/radar-exploration/keyword<br/>add/remove unitaire]
    POSTSCAN[POST /radar/scan<br/>compute marketScore par keyword]
    POSTBATCH[POST /articles/:id/radar-exploration<br/>upsert full snapshot]
    DBPAA[(paa_explorations<br/>+ keyword_paa_questions cache)]
    DBAC[(keyword_autocomplete<br/>cache par keyword)]
    GENROUTE[POST /keywords/radar/generate<br/>IA Haiku courte-traîne]
  end

  subgraph FRONT
    USR[Utilisateur]
    DISCOVERY[DiscoveryPanel<br/>+ section &laquo; G&eacute;n&eacute;ration courte-tra&icirc;ne &raquo;<br/>d&eacute;plac&eacute;e ici]
    RADAR[RadarPanel<br/>input texte unitaire<br/>Phase 2 li&eacute;e &agrave; la DB]
    STORE[radar-explorations.store<br/>cache local hydrat&eacute; depuis la DB]
  end

  USR -->|coche / envoie au Radar| DISCOVERY
  USR -->|"+ keyword unitaire"| RADAR
  USR -->|G&eacute;n&eacute;rer courte-tra&icirc;ne| DISCOVERY
  DISCOVERY -->|POST keyword(s)| POSTKW
  RADAR -->|POST keyword unitaire| POSTKW
  DISCOVERY -->|Haiku IA| GENROUTE
  GENROUTE -->|Haiku output| DISCOVERY
  POSTKW -->|UPDATE generated_keywords| DB
  DB -->|GET /articles/:id/radar-exploration| STORE
  STORE -->|reactivity| RADAR
  USR -->|Lancer le scan| RADAR
  RADAR -->|POST /radar/scan| POSTSCAN
  POSTSCAN -->|fetch par keyword| DBAC
  POSTSCAN -->|fetch par keyword + cache 90j| DBPAA
  POSTSCAN -->|UPDATE scan_result| DB
```

### 5.2 Principes

1. **Source de vérité unique** : `radar_explorations` par article. `generated_keywords` JSONB pour les keywords en attente de scan, `scan_result.cards` JSONB pour les keywords scannés (avec leurs métriques).
2. **Le store Pinia devient un cache local hydraté de la DB**. Au mount de Radar : `GET /articles/:id/radar-exploration` → store rempli → UI réactive lit le store. Toute mutation passe par un endpoint qui écrit la DB puis re-hydrate le store.
3. **Tous les états mémoire intermédiaires** (`discoveryRadarKeywords`, `generatedKeywords` indépendant, `basket.keywords`) **disparaissent** ou deviennent de purs miroirs de la DB.
4. **Le basket store est déprécié** :
   - `BasketStrip` et `BasketFloatingPanel` supprimés.
   - `KeywordAssistPanel` rebranché sur une lecture DB des keywords scannés/en attente du Radar de l'article courant.
5. **Distinction volume / pertinence préservée** :
   - Volume (signaux SEO objectifs) → tables cross-article + recalcul à la volée à partir du cache.
   - Pertinence (matching pain point) → calcul live dans Capitaine à partir de signaux bruts cachés + pain point courant (FR-CAP-RELEVANCE-COMPUTED-LIVE conservée).

## 6. User flow chronologique cible

```
0. Sélection article (Moteur, depuis le Cocoon Landing)

1. ÉTAPE EXPLORATION (Discovery)
   ├── Génération multi-sources (alphabet, questions, intent, prepositions, IA Sonnet, DataForSEO)
   ├── Filtre pertinence 2-pass + analyse IA (curation 20-30 keywords stratégiques)
   ├── [NOUVEAU] Section &laquo; Génération courte-traîne PAA-friendly &raquo; (Haiku, ~20 keywords)
   │   Anciennement section &laquo; Keyword Radar &raquo; sur l'onglet Radar
   └── Bouton &laquo; Envoyer au Radar &raquo; → POST keywords sélectionnés dans
       radar_explorations.generated_keywords

2. ÉTAPE QUALIFICATION (Radar)
   ├── Hydratation au mount : GET /articles/:id/radar-exploration
   │   → store hydraté → UI lit le store
   ├── Affichage de la liste &laquo; Mots-clés à scanner &raquo; depuis le store DB
   ├── [NOUVEAU] Input texte unitaire (modèle CaptainInput)
   │   → POST keyword unitaire → DB → store rehydraté
   ├── Suppression d'un keyword via × → DELETE keyword unitaire → DB → store rehydraté
   └── Bouton &laquo; Lancer le scan &raquo;
       → POST /radar/scan (avec autocomplete par keyword, PAA par keyword, cache 90j)
       → UPDATE radar_explorations.scan_result.cards
       → store rehydraté → UI affiche thermomètre + cards + RadarAiPanel

3. ÉTAPE SÉLECTION (Radar → Capitaine)
   ├── Cocher cards / longue-traîne
   └── Bouton &laquo; Envoyer au Capitaine &raquo; → onglet Capitaine
       (basket déprécié — le payload passe directement par le state cross-tab
        ou par persistance article_keywords.captainCandidates)

4. ÉTAPE VALIDATION (Capitaine)
   ├── Lecture de captain_explorations + paa_explorations pour l'article
   ├── Calcul Pertinence à la volée (FR-CAP-RELEVANCE-COMPUTED-LIVE inchangée)
   └── Verrouillage Capitaine → article_keywords.capitaine

5. ÉTAPES SUIVANTES (Lieutenants → Lexique → Finalisation → Rédaction)
   Inchangées par ce chantier.
```

## 7. Cartographie des chantiers (sprints)

### Sprint A — Backend
- **A.1** Nouvelles routes :
  - `POST /articles/:id/radar-exploration/keyword` — ajoute un keyword dans `generated_keywords` (idempotent, dédup).
  - `DELETE /articles/:id/radar-exploration/keyword?keyword=…` — retire un keyword de `generated_keywords`.
  - `POST /articles/:id/radar-exploration/keywords` — batch (utilisé par "Envoyer au Radar" depuis Discovery).
- **A.2** Correction aberration autocomplete : `scanRadarKeywords` fetche autocomplete **par keyword** au lieu d'1 fois sur `specificTopic`. Cache cross-article TTL 90 jours via `keyword_autocomplete`.
- **A.3** Tests contract-api Vitest pour les 3 routes + tests services pour autocomplete par keyword.

### Sprint B — Front Radar (DB-first)
- **B.1** Refonte `useResonanceScore` : suppression de `generatedKeywords` ref mémoire ; consommation directe du store `radar-explorations.store` (à créer ou enrichir).
- **B.2** Création / enrichissement d'un store Pinia `useRadarExplorationStore` qui hydrate depuis `GET /articles/:id/radar-exploration` et expose `addKeyword`, `removeKeyword`, `scanAll`.
- **B.3** Refonte `RadarPanel.vue` :
  - Suppression de la dépendance `injectedKeywords` (Discovery écrit en DB directement).
  - Ajout d'un input texte unitaire **modèle `CaptainInput`** (icône loupe, Entrée pour soumettre, bouton "+ Ajouter").
  - Phase 2 "Mots-clés à scanner" lit le store DB, le × supprime via DELETE backend.
- **B.4** Suppression de `handleKeywordsCleared` cross-tab state (devient inutile).
- **B.5** Tests unit + intégration RadarPanel.

### Sprint C — Front Discovery (déplacement génération courte-traîne)
- **C.1** Migration de la logique de génération Haiku (`POST /keywords/radar/generate`) depuis `useResonanceScore` vers `useDiscoveryPanel` (ou nouveau composable dédié).
- **C.2** Ajout dans `DiscoveryPanel.vue` d'une nouvelle section / source "Génération courte-traîne (PAA-friendly)" rendue à côté des autres sources (alphabet, questions, etc.).
- **C.3** Adaptation du bouton "Envoyer au Radar" : `POST /articles/:id/radar-exploration/keywords` au lieu d'utiliser `useMoteurCrossTabState` (le state cross-tab `discoveryRadarKeywords` devient inutile et est supprimé).
- **C.4** Tests Discovery.

### Sprint D — Dépréciation basket
- **D.1** Suppression de `BasketStrip.vue` et son montage dans `MoteurView.vue`.
- **D.2** Suppression de `BasketFloatingPanel.vue` et son montage global.
- **D.3** Refonte `KeywordAssistPanel.vue` : prop `keywords: string[]` (passées par le parent depuis la lecture DB) au lieu de lire le basket. Le parent (CaptainPanel, LieutenantsPanel, LexiquePanel) injecte la liste pertinente.
- **D.4** Suppression de `useMoteurBasketStore` (store entier supprimé).
- **D.5** Adaptation des callers résiduels (`MoteurView.handleSendToRadar` perd l'appel `basketStore.addKeywords`, etc.).
- **D.6** Tests unit pour KeywordAssistPanel + non-régression Capitaine/Lieutenants/Lexique.

### Sprint E — Validation finale et clôture
- **E.1** `npm run check:health` (lint + type-check + cycles + dead + arch).
- **E.2** `npm run test:check` doit être net positif ou neutre vs baseline.
- **E.3** `npm run build`.
- **E.4** Mise à jour PRD :
  - FR-RAD-* refondues (skeleton, scan flow, autocomplete-per-keyword)
  - FR-DIS-* enrichie (génération courte-traîne)
  - FR-MOT-BASKET-DEPRECATED (nouvelle, ferme le sujet)
- **E.5** Mise à jour `docs/ui-sections-guide.md §3.4` (Radar) et §13.2 (panels IA).
- **E.6** Mise à jour `docs/data-flows/radar-explorations.md` si nécessaire.
- **E.7** Sprint-status.yaml entrée `radar-dbfirst-refactor: done`.
- **E.8** Tech-spec bumped à `status: done`.
- **E.9** Commit + merge + push.

## 8. Hors-scope

- **Refonte du calcul de pertinence Capitaine** : inchangée (FR-CAP-RELEVANCE-COMPUTED-LIVE reste active).
- **Refonte du scan PAA** : pas touché (déjà DB-first via `paa_explorations` + cache `keyword_paa_questions`).
- **Refonte des autres onglets** (Capitaine, Lieutenants, Lexique, Finalisation) : aucun changement de comportement attendu, juste les adaptations nécessaires à la dépréciation du basket (Sprint D.3, D.6).
- **Suppression de la prop `mode='libre'`** sur RadarPanel : reste hors-scope (chantier séparé si confirmé mort).
- **Suppression du composant `BasketFloatingPanel`** : déjà identifié comme non-utile. Sera supprimé dans Sprint D.

## 9. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Régression sur le cycle scan complet (Discovery → Radar → Capitaine) | Tests e2e workflow Moteur préservés + ajout d'un test e2e DB-first explicite |
| Doublement du coût DataForSEO autocomplete (× nombre de keywords) | Cache cross-article TTL 90 jours via `keyword_autocomplete` : la 2e itération sur même keyword est gratuite. Coût initial accepté par l'utilisateur. |
| Données legacy dans `radar_explorations.scan_result` (anciennes lignes avec `relevanceScore`) | Code de lecture ignore déjà ce champ (FR-CAP-RELEVANCE-COMPUTED-LIVE) — pas de migration destructive nécessaire. |
| `BasketFloatingPanel` ou `BasketStrip` consommé ailleurs que prévu | Audit grep exhaustif effectué — uniquement les 3 composants identifiés. |

## 10. Décisions actées (résumé)

| Décision | Justification |
|---|---|
| `radar_explorations` = source de vérité unique pour les keywords en attente de scan et scannés | Schéma déjà en place, aligne Radar sur Capitaine/Lieutenants/Lexique déjà DB-first. |
| Autocomplete fetché par keyword (correction aberration) | Cohérence sémantique du score marché objectif par keyword. Coût accepté car cache TTL 90j. |
| Génération courte-traîne IA déplacée vers Discovery | Discovery = lieu unique de production de candidats. Radar = lieu de qualification. |
| Input texte unitaire dans Radar (modèle Capitaine) | Comble le trou fonctionnel "ajouter un keyword sans regen complet". |
| Basket store déprécié intégralement | 1 producteur réel (Discovery→Radar) + 0 consommateur backend → état mémoire inutile dans un projet DB-first. |
| `is_match` / `match_quality` conservés en DB | Cohérent avec FR-CAP-RELEVANCE-COMPUTED-LIVE : ce sont des signaux d'entrée cachés, pas un score pré-calculé. |
| `BasketStrip`, `BasketFloatingPanel` supprimés | Redondants avec la lecture DB. `BasketFloatingPanel` déjà constaté non-utile. |
| `KeywordAssistPanel` refondé sur lecture DB (props depuis parent) | Aligne sur le pattern existant (parent connaît le contexte de l'onglet, filtre la liste). |

---

**Validation utilisateur** : à confirmer avant lancement du Sprint A.
