---
name: article_keywords
description: "Décisions de mots-clés d'un article (Capitaine + Lieutenants + Lexique + HN Structure) — données de 3e phase du Moteur validées et persistées en PostgreSQL, hydratées avec richesses (validations Capitaine, Lieutenant explorations, IA panels, scoring)."
type: "{ capitaine: string, lieutenants: string[], lexique: string[], rootKeywords?: string[], hnStructure?: ProposeLieutenantsHnNode[], richCaptain?: RichCaptain, richLieutenants?: RichLieutenant[], richRootKeywords?: RichRootKeyword[] }"
last_updated: 2026-05-04
related_fr: [FR-CAP-LOCK-RADIO, FR-CAP-PERSIST, FR-LIE-CHECKBOX-COUNT, FR-LEX-SELECT, FR-FIN-RECAP, FR-MOT-PHASES, FR-INFRA-API-WRAPPER]
---

# Data Flow — article_keywords

> **Description métier :** Ensemble des mots-clés validés pour un article — Capitaine (principal), Lieutenants (secondaires 2-5), Lexique (termes LSI 10-15) et structure de titres (H1/H2/H3) — plus métadonnées enrichies (historique validations, IA panels, scores scoring, statuts).
> **Type/format :** `ArticleKeywords` TypeScript interface. Persisté en table `article_keywords` PostgreSQL (colonnes capitaine TEXT, lieutenants TEXT[], lexique TEXT[], hn_structure JSONB, captain_locked_at TIMESTAMPTZ, root_keywords TEXT[]). Hydraté frontend via store Pinia `useArticleKeywordsStore`.

## Producteurs

Qui crée ou met à jour cette donnée :

- **Endpoint** `PUT /articles/:id/keywords` ([server/routes/keywords.routes.ts:235-262](../../server/routes/keywords.routes.ts)) — reçoit `{ capitaine, lieutenants, lexique, rootKeywords?, hnStructure? }` JSON, appelle `saveArticleKeywords(id, data)` pour upsert via trigger ON CONFLICT, mirror sur `articles.captain_keyword_locked` si richCaptain.status === 'locked'.

- **Service** `saveArticleKeywords()` ([server/services/infra/data.service.ts:543-571](../../server/services/infra/data.service.ts)) — orchestre l'insertion dans `article_keywords` (colonnes en INSERT … ON CONFLICT DO UPDATE), appelle `updateArticleCaptainKeyword()` pour sync mirror (best-effort, log warn si fail).

- **Store Pinia** `useArticleKeywordsStore` ([src/stores/article/article-keywords.store.ts:10-525](../../src/stores/article/article-keywords.store.ts)) — mutations locales (setCapitaine, addLieutenant, addLexiqueTerm, lockCaptain, etc.) + save actions (saveDecisions → PUT /articles/:id/keywords, saveKeywords alias, saveCaptainExplorationEntry → POST /articles/:id/captain-explorations).

- **Composants Vue (Moteur)** — déclenchent les mutations du store :
  - `CaptainPanel.vue` — radio lock (emit 'check-completed' → `lockCaptain()` côté store).
  - `LieutenantsPanel.vue` — checkboxes sélection → `setRichLieutenants()`.
  - `LexiquePanel.vue` — checkboxes termes → mutations `addLexiqueTerm()`.
  - Tous appellent `saveDecisions(id)` au blur ou via bouton Valider.

- **Endpoints d'exploration dédiés** — produisent des données `richCaptain`, `richLieutenants` hydratées :
  - `POST /articles/:id/captain-explorations` → `saveCaptainExploration()` (table `captain_explorations`).
  - `POST /articles/:id/lieutenant-explorations` → `saveLieutenantExplorations()` (table `lieutenant_explorations`).

## Persistance

**Autorité** : Table PostgreSQL `article_keywords(article_id PRIMARY KEY, capitaine, lieutenants[], lexique[], hn_structure JSONB, captain_locked_at TIMESTAMPTZ, root_keywords[])` — colonne article_id référence `articles(id)` ON DELETE CASCADE.

**Tables associées (hydratation)**:
- `captain_explorations(article_id FK, keyword, article_level, status, root_keywords[], ai_panel_markdown, explored_at, locked_at)` — historique validations Capitaine, source de vérité pour `richCaptain.exploredKeywords`.
- `lieutenant_explorations(article_id FK, keyword, status, reasoning, sources[], suggested_hn_level, score, kpis, locked_at, explored_at)` — propositions/sélections Lieutenants, source de vérité pour `richLieutenants[]`.
- `paa_explorations(article_id FK, keyword, question, answer, is_match, match_quality)` — questions PAA associées à chaque Capitaine validé.
- `radar_explorations(article_id FK, scan_result JSONB contenant { cards: [{ keyword, marketScore, relevanceScore, ... }] })` — cache scan Radar avec scores Marché + Pertinence hydratés dans `richCaptain.exploredKeywords[].marketScore` / `.relevanceScore`.

**Hiérarchie d'autorité (lecture)** : `article_keywords` (décisions plate) → `captain_explorations` (validations contextualisées) → `radar_explorations` (scores Marché/Pertinence) → store Pinia `richCaptain` / `richLieutenants` (cache front).

**Trigger** : `article_keywords_updated_at` — update colonne `updated_at` TIMESTAMPTZ avant INSERT/UPDATE (auto-gestion par PostgreSQL).

## Consommateurs

### Affichage (UI)

- **CaptainPanel.vue** — carousel validations Capitaine : affiche historique `richCaptain.exploredKeywords[]` avec KPIs, scores Marché/Pertinence, radio lock (FR-CAP-LOCK-RADIO).
- **CaptainSidePanel.vue** — section sticky Capitaine : affiche `richCaptain.keyword` locké, KPIs readonly (search_volume / keyword_difficulty / CPC / Intent / PAA count / AC count), badges verdict (GO/ORANGE/NO-GO/GRAY) — scores extraits de `richCaptain.exploredKeywords[0]` ou card Radar associée.
- **CaptainVerdictPanel.vue** — feu tricolore du verdict (informatif depuis 2026-04-28, FR-CAP-VERDICT-INFORMATIVE).
- **LieutenantsPanel.vue** — liste checkboxes `richLieutenants[]`, filtrée par niveau (Pilier 5-8 / Intermédiaire 3-5 / Spécifique 1-3), compteur recommandé, badges `sources[]`, score AI.
- **LexiquePanel.vue** — checkboxes termes `lexique[]`, 3 niveaux (Obligatoire pré-coché / Différenciateur / Optionnel), tri configurable (A-Z / densité / Jaccard douleur).
- **FinalisationPanel.vue** — récapitulatif 3-phase : affiche Capitaine verrouillé, Lieutenants sélectionnés count, Lexique terms count.
- **ArticleKeywordsPanel.vue** — panneau lecture simple des keywords sélectionnés.
- **SeoPanel.vue** — affichage dense keywords + statut validation dans la barre latérale.
- **RadarKeywordCard.vue** — card individual dans Radar tab, affiche `marketScore.verdict` / `relevanceScore.verdict` en mode bimodal (user switch market ↔ relevance).

### Calcul / tri / filtre / agrégat

- **Tri Capitaine** — `compareScores()` ([shared/score/compare.ts](../../shared/score/compare.ts)) — trie `exploredKeywords[]` par `relevanceScore.value` ou `marketScore.value` selon mode, gère `null` (en bas, jamais 0).
- **Tri Radar cards** — idem `compareScores()`, user-selectable displayMode.
- **Filtre Lieutenants** — post-IA `filterLieutenants()` applique cap par level (Pilier 5 / Intermédiaire 5 / Spécifique 4), géofunnel rule (FR-LIE-GEOFUNNEL-RULE).
- **Agrégats** — `averageScores()`, `maxScore()`, `minScore()` ([shared/score/aggregate.ts](../../shared/score/aggregate.ts)) — excluent les `null` (pas de fallback 0).
- **Injection prompt IA** — prompts Moteur injectent `{{capitaine}}`, `{{lieutenants[]}}`, `{{lexique[]}}`, `{{painPoint}}`, `{{marketScore}}`, `{{relevanceScore}}` via `loadPrompt()` :
  - `capitaine-ai-panel.md` → `POST /keywords/:kw/ai-panel` (richCaptain.aiPanelMarkdown).
  - `propose-lieutenants.md` → `POST /keywords/:kw/propose-lieutenants` (LieutenantProposals).
  - `lexique-suggest.md` → `POST /keywords/lexique-suggest` (lexique extraction).
  - `lexique-ai-panel.md` → `POST /keywords/lexique-ai-panel` (LexiqueAiPanel).

> **Règle de cohérence affichage / calcul** — Toute valeur affichée (ex: score Marché dans CaptainSidePanel) ET utilisée pour tri/filtre (ex: `compareScores` au tri) DOIT dériver de la même expression TypeScript. Ne jamais utiliser un fallback numérique (`?? 0`) au tri si l'affichage montre `—`. Exemple interdite : display `marketScore.value ?? '—'` mais tri sur `relevanceScore.value ?? 0` (deux expressions différentes, deux sources).

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque de divergence |
|---|---|---|---|
| **Premier load** (article jamais ouvert) | `GET /articles/:id/keywords` → hydrate depuis `article_keywords` + `captain_explorations` + `paa_explorations` + `lieutenant_explorations` | aucune (données vides ou migrées) | Faible si fetch atomique. |
| **Reload** (page refresh) | idem, rehydration depuis DB | aucune (sauf si utilisateur re-valide) | **Risque** : si richCaptain.exploredKeywords()[0].relevanceScore est `null` au reload alors qu'il était calculé avant, l'utilisateur voit un verdict différent pour le même Capitaine. Cause : cache lexical perdu (radar_explorations stale). Solution : afficher date calcul + badge TTL. |
| **Switch onglet Phase ① → ② (Capitaine)** | hydration depuis `keyword_metrics` fresh + `captain_explorations` | aucune | Faible si données cohérentes. |
| **Restore depuis history (slider)** | `richCaptain.exploredKeywords[]` → restaure ancien entry avec scores ancienne formule | aucune (history immutable) | **Risque majeur** : formule scoring Marché/Pertinence a changé 2026-04-28 (F1 PAA). Ancien entry a `marketScore.value = ancienneFormule`. User voit verdict "ORANGE" rehistorisé, pas "GO" d'aujourd'hui. Solution : versioner la formule dans `CaptainScanEntry.formulaVersion`, afficher warning si legacy. |
| **Unlock Capitaine** (archivier Lieutenants) | `richLieutenants[] → status locked` → `archiveLockedLieutenants()` passe status 'locked' → 'archived' | `POST /articles/:id/lieutenants/archive` | Faible si idempotent (Postgres idempotency ON CONFLICT). |
| **Save décisions via store** (`saveDecisions`) | `article_keywords` plate (capitaine, lieutenants[], lexique[]) + `captain_keyword_locked` sur articles.captain_locked_at | `PUT /articles/:id/keywords` + mirror vers `articles.captain_keyword_locked` | **Régression historique (2026-04-27)** : `saveArticleKeywords()` écrasait `articles.captain_keyword_locked` à NULL si `data.richCaptain` undefined dans payload. Fix : mirror EXCLUSIVEMENT géré par `PUT /articles/:id/captain-keyword`, pas par saveDecisions. Test contrat : `captain-keyword-locked.contract.test.ts`. |
| **Merge articles de deux cocons** | `richLieutenants` depuis deux articles fusionne par `mergeRichLieutenants()` (clé = keyword lowercase trim, winner = lockedAt plus récent) | Union sans doublon | Faible si clés uniques. |
| **Fetch & merge (TabLoadPrompt)** | `fetchKeywordsMerge()` merge payload DB dans état mémoire SANS écraser (adoption partielle) | aucune | **Risque** : si utilisateur a validé Capitaine en mémoire, then reload, richCaptain en mémoire peut diverger de richCaptain en DB. Règle merge : capitaine adopte DB seulement si mémoire vide, exploredKeywords append-only. |
| **Lexique suggestion** (endpoint SSE) | lecture `keyword_metrics` (pour KPIs contexte) + `articles.pain_point` → POST IA → parse JSON response | mutation `keywords.value.lexique = result.lexique` | **Risque** : réponse IA invalide JSON → parse fail → `error.value` set, state partial. Solution : UI doit afficher spinner + error boundary. |

## Diagramme

```mermaid
flowchart TD
    subgraph Producteurs
        E1["PUT /articles/:id/keywords<br/>keywords.routes.ts:235-262"]
        S1["saveArticleKeywords<br/>data.service.ts:543-571"]
        UI1["CaptainPanel.vue<br/>CaptainLockPanel.vue"]
        UI2["LieutenantsPanel.vue"]
        UI3["LexiquePanel.vue"]
        STORE["useArticleKeywordsStore<br/>mutations + actions"]
    end

    subgraph Tables_DB
        AK[("article_keywords<br/>capitaine, lieutenants[],<br/>lexique[], hn_structure JSONB<br/>captain_locked_at TIMESTAMPTZ")]
        CE[("captain_explorations<br/>article_id, keyword,<br/>article_level, status,<br/>ai_panel_markdown,<br/>explored_at, locked_at")]
        LE[("lieutenant_explorations<br/>article_id, keyword,<br/>status, reasoning,<br/>sources[], score")]
        PAA[("paa_explorations<br/>article_id, keyword,<br/>question, answer,<br/>is_match")]
        RE[("radar_explorations<br/>article_id,<br/>scan_result JSONB<br/>{cards: [{keyword,<br/>marketScore,<br/>relevanceScore}]}")]
        A[("articles<br/>captain_keyword_locked<br/>pain_point")]
    end

    subgraph Hydratation
        GH["getArticleKeywords()<br/>data.service.ts:491-541"]
        GCE["getCaptainExplorations()"]
        GLE["getLieutenantExplorations()"]
    end

    subgraph Consommateurs_Display
        CVH["CaptainPanel.vue<br/>affiche exploredKeywords"]
        CSP["CaptainSidePanel.vue<br/>affiche KPIs locked"]
        CVP["CaptainVerdictPanel.vue<br/>verdict badges"]
        LH2["LieutenantsPanel.vue<br/>liste checkboxes"]
        LEX["LexiquePanel.vue<br/>termes 3 niveaux"]
        FIN["FinalisationPanel.vue<br/>recap 3-phase"]
    end

    subgraph Consommateurs_Calc
        SORT["compareScores()<br/>shared/score/compare.ts"]:::calc
        FILTER["filterLieutenants()"]:::calc
        AGG["averageScores()<br/>shared/score/aggregate.ts"]:::calc
        PROMPT["capitaine-ai-panel.md<br/>propose-lieutenants.md<br/>lexique-suggest.md"]:::calc
    end

    UI1 --> STORE
    UI2 --> STORE
    UI3 --> STORE
    STORE --> E1
    E1 --> S1

    S1 --> AK
    S1 --> A

    STORE -->|fetch| GH
    GH --> AK
    GH --> GCE
    GH --> GLE

    GCE --> CE
    GCE --> PAA
    GCE --> RE
    GLE --> LE

    AK -->|capitaine, lieutenants[], lexique[]| CVH
    AK -->|capitaine, hn_structure| CSP
    RE -->|marketScore, relevanceScore| CVH
    CE -->|exploredKeywords| CVH
    CE -->|aiPanelMarkdown| CVH
    LE -->|richLieutenants[]| LH2
    AK -->|lexique[]| LEX
    AK -->|capitaine, lieutenants[], lexique[]| FIN
    A -->|pain_point| PROMPT

    CVH --> SORT
    CVH --> AGG
    CVH --> PROMPT
    LH2 --> FILTER
    LH2 --> SORT
    LEX --> AGG
    FIN --> SORT

    classDef calc fill:#fee,stroke:#c66,color:#000
```

## Régressions historiques

- **2026-04-27 (sprint captain-lock)** — Bug mirror : `saveArticleKeywords()` appelait `updateArticleCaptainKeyword()` avec `data.richCaptain?.keyword`, mais le payload PUT ne contient pas `richCaptain` (seulement capitaine plat). Résultat : `richCaptain` undefined → mirror écrivait NULL sur `articles.captain_keyword_locked`, effaçant le verrouillage après chaque save. Fix (2026-04-28) : mirror EXCLUSIVEMENT géré par endpoint dédié `PUT /articles/:id/captain-keyword`, saveDecisions ne le touche plus. Contrat : `captain-keyword-locked.contract.test.ts:25-61`.

- **2026-04-28 (score-pertinence sprint)** — Formule scoring Marché/Pertinence changée (F1 PAA pour relevanceScore). Ancien `CaptainScanEntry` a `marketScore`/`relevanceScore` null ou calculés par ancienne formule. Au restore from history, user voit ancien verdict. Solution préparée (pas implémentée) : ajouter champ `formulaVersion` à `CaptainScanEntry`, afficher warning "calcul 2026-04-27" si legacy.

- **2026-05-02 (hydratation scores)** — Migration : `marketScore` et `relevanceScore` ne sont PAS persistés dans `captain_explorations` (par design : scores = résultats calculs, pas données saisies). Avant fix, hydratation manquait scores. Solution : hydrater depuis `radar_explorations.scan_result.cards[k]` (la single source of truth du Radar) au moment de servir `getCaptainExplorations()`. Ainsi `restoreFromHistory` côté front dispose de scores pour affichage + tri.

## Tests de cohérence à écrire

À placer dans `tests/unit/coherence/keywords.test.ts` :

1. **`describe('FR-CAP-LOCK-RADIO — cohérence lock atomique')`** — Vérifie que `lockCaptain(keyword, aiPanel, articleId)` atomiquement mutate `richCaptain.status = 'locked'` + `capitaine = keyword` + `lockedAt = new Date()`, puis `saveDecisions()` persiste tout sans doublon. Inclure cas "re-lock même keyword" (idempotent).

2. **`describe('FR-LIE-CHECKBOX-COUNT — sélection vs persistance')`** — Simule user sélection 5 Lieutenants via checkboxes → `setRichLieutenants(selected, eliminated)` mutate store + sync flat `lieutenants[]` avec locked seulement. Vérifie que reload retrouve exactement les 5 sélectionnés via `mergeRichLieutenants()` (pas doublon par clé keyword lowercase).

3. **`describe('FR-LEX-SELECT — cohérence lexique affichage / persistance')`** — `addLexiqueTerm()` / `removeLexiqueTerm()` mutate flat `lexique[]`, puis `saveDecisions()` persiste. Reload via `getArticleKeywords()` restaure exact array. Inclure cas "ajout dupliqué" (silently deduplicated).

4. **`describe('FR-CAP-PERSIST + FR-INFRA-API-WRAPPER — mirror non-régression')`** — Scenario : lock Capitaine via `PUT /articles/:id/captain-keyword`, vérifier `articles.captain_keyword_locked = 'mot-clé'`. Then `PUT /articles/:id/keywords` sans `richCaptain` dans payload. Vérifier que `articles.captain_keyword_locked` tient toujours (ne revient pas à NULL). Contrat alias : utiliser ou adapter `captain-keyword-locked.contract.test.ts` existant.

5. **`describe('FR-MOT-PHASES + TabLoadPrompt — fetch-merge idempotence')`** — User valide Capitaine en mémoire. Puis `fetchKeywordsMerge()` récupère payload DB (où Capitaine = ''). Vérifier que mémoire garde sa valeur validée (merge adopte DB seulement si mémoire vide). Then simuler un 2e fetch → vérifier que merge reste idempotent (pas append doublon history).

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
