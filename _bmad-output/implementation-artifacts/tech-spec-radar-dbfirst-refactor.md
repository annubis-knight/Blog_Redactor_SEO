---
name: tech-spec-radar-dbfirst-refactor
type: tech-spec
status: done
version: 1.1.0
last_updated: 2026-05-11
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-RAD-DB-FIRST, FR-RAD-MANUAL-ADD, FR-RAD-AUTOCOMPLETE-PER-KEYWORD, FR-DIS-LONGTAIL-GENERATION, FR-MOT-BASKET-DEPRECATED, FR-DIS-BASKET deprecated)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (entrée radar-dbfirst-refactor)
  - docs/data-flows/radar-keywords.md (audit + décisions architecturales)
---

## Résultat livré (5 sprints commités)

- **Sprint A — Backend** (commit `b252326`) : +1125 lignes, 7 fichiers. Routes
  POST/DELETE/POST batch sur `radar_explorations/keyword`, correction
  autocomplete par keyword, tests contract-api (14 ACs).
- **Sprint B — Front Radar DB-first** (commit `ece3830`) : +549/-41 lignes,
  4 fichiers. Nouveau `useRadarExplorationStore` (Pinia, header AUTHORITY),
  input texte unitaire pattern `CaptainInput`, refonte `RadarPanel`, tests
  store (11 ACs).
- **Sprint C — Discovery longtail** (commit `a14a0d6`) : +113/-19 lignes,
  9 fichiers. Source `'longtail-ai'` dans `useDiscoveryPanel`, bouton purple
  dans `DiscoveryPanel`, `RadarPanel` masque ses inputs en mode workflow.
- **Sprint D — Dépréciation basket** (commit `0432095`) : +225/-1039 lignes,
  21 fichiers. Suppression complète du store basket + 2 composants visuels,
  refonte `KeywordAssistPanel` (prop `keywords`), adaptation
  `Lieutenants/Lexique/MoteurView/App/useMoteurCrossTabState`.

**Total** : +2012/-1099 lignes nettes (+913), couvrant 5 nouvelles FRs + 1
dépréciation + 1 NFR transverse.

## Validation

- `npm run type-check` : vert.
- `npm run lint` : 0 erreurs (267 warnings préexistants `no-explicit-any`).
- `npm run test:check` : **13 rouges courants vs 33 baseline** (net positif
  de 20 rouges en moins). 22 baseline rouges passent maintenant, 2 nouveaux
  rouges sont préexistants (`_setup-sanity` nécessite dev server).
- `npm run build` : vert (~9-13s).
- `npm run check:cycles` : 11 cycles préexistants
  (mock-fixtures, scoring types), non liés au chantier.

---

# Tech-spec — Refonte DB-first de l'onglet Radar

## Contexte

Cf. audit complet : [`docs/data-flows/radar-keywords.md`](../../docs/data-flows/radar-keywords.md).

Synthèse rapide :
- 4 états mémoire parallèles pour la même donnée (`discoveryRadarKeywords`, `generatedKeywords`, `basket.keywords`, `selected` Discovery).
- Basket en pratique alimenté par 1 producteur uniquement (`handleSendToRadar`), 0 consommateur backend.
- Aberration autocomplete : 1 appel global sur `specificTopic` au lieu d'un appel par keyword.
- Génération courte-traîne IA mal placée sur Radar (devrait être sur Discovery).
- Pas d'input texte unitaire sur Radar.

## Objectifs

1. `radar_explorations` devient source de vérité unique pour les keywords Radar (en attente + scannés).
2. `useMoteurBasketStore` et composants visuels associés (`BasketStrip`, `BasketFloatingPanel`) supprimés.
3. `KeywordAssistPanel` refondé pour recevoir une prop `keywords: string[]` depuis le parent.
4. Input texte unitaire ajouté à Radar (modèle `CaptainInput`).
5. Section "Génération courte-traîne IA" déplacée de Radar vers Discovery (route backend `/keywords/radar/generate` inchangée, caller frontend changé).
6. Autocomplete fetchée par keyword (correction aberration), avec cache cross-article TTL 90j.

## Hors-scope

- Refonte du calcul de pertinence Capitaine (FR-CAP-RELEVANCE-COMPUTED-LIVE conservée).
- Refonte du scan PAA (déjà DB-first).
- Refonte des onglets Capitaine/Lieutenants/Lexique (juste adaptation `KeywordAssistPanel`).
- Suppression de la prop `mode='libre'` sur RadarPanel (chantier séparé).

## Cartographie (Phase 1.bis)

### Données partagées concernées

| Donnée | Source de vérité cible | Producteurs | Consommateurs | Persistance |
|--------|------------------------|-------------|---------------|-------------|
| Keywords en attente de scan | `radar_explorations.generated_keywords` JSONB | `POST /articles/:id/radar-exploration/keyword(s)` (Discovery + input manuel Radar) | `RadarPanel` Phase 2 + `KeywordAssistPanel` | DB |
| Keywords scannés + métriques | `radar_explorations.scan_result.cards` JSONB | `POST /radar/scan` | `RadarPanel` Phase 3 + `KeywordAssistPanel` + Capitaine (via `getCaptainExplorations`) | DB |
| Autocomplete par keyword | `keyword_autocomplete` (cross-article cache) | `fetchAutocomplete(keyword)` durant scan | `scanRadarKeywords` (matchCount par keyword) | DB |

### Règle de cohérence affichage / calcul

Une seule expression produit l'affichage ET le score :
- `useRadarExplorationStore.generatedKeywords` (liste UI Phase 2) = projection directe de `radar_explorations.generated_keywords` (DB).
- `useRadarExplorationStore.scanCards` (liste UI Phase 3) = projection directe de `radar_explorations.scan_result.cards` (DB).

Pas de fallback mémoire, pas de drift possible.

### Cas d'usage à tracer

| Cas | Avant | Après |
|---|---|---|
| Discovery → "Envoyer au Radar" | `handleSendToRadar` ajoute au basket + propage à `discoveryRadarKeywords` (mémoire) | `POST /articles/:id/radar-exploration/keywords` (batch) puis re-hydratation store. Plus de basket. |
| Arrivée à froid sur Radar | Page vide (corrigé partiellement par chantier précédent) | `GET /articles/:id/radar-exploration` au mount → store rempli si DB a des données → liste affichée |
| Reload page sur Radar avec keywords pending | Liste perdue (mémoire) | Liste conservée (DB) |
| Ajouter un keyword manuellement | Impossible | Input texte unitaire → `POST /articles/:id/radar-exploration/keyword` → re-hydratation |
| Retirer un keyword via × | Retire de `generatedKeywords` mémoire | `DELETE /articles/:id/radar-exploration/keyword?keyword=…` → re-hydratation |
| Scan terminé | `radar_explorations.scan_result` mis à jour | Inchangé (mais re-hydratation cohérente) |
| Switch d'article | `basket.$reset()` + autres states | `useRadarExplorationStore.setArticle(newId)` re-hydrate depuis DB |

## Plan d'exécution

### Sprint A — Backend

**A.1 — Nouvelles routes** dans `server/routes/radar-exploration.routes.ts` :

```ts
POST /api/articles/:id/radar-exploration/keyword
  Body: { keyword: string }
  Effect: UPSERT idempotent dans radar_explorations.generated_keywords
  Response: { data: { entry: RadarExplorationEntry } }
  Validation: keyword non vide, articleId positif

DELETE /api/articles/:id/radar-exploration/keyword
  Query: ?keyword=…
  Effect: retire le keyword de radar_explorations.generated_keywords
  Response: { data: { entry: RadarExplorationEntry } }

POST /api/articles/:id/radar-exploration/keywords
  Body: { keywords: Array<{ keyword: string, reasoning?: string }> }
  Effect: UPSERT batch idempotent
  Response: { data: { entry: RadarExplorationEntry, added: number } }
```

**A.2 — Service `radar-exploration.service.ts`** : nouvelles fonctions `addKeywordToRadarExploration`, `removeKeywordFromRadarExploration`, `addKeywordsBatchToRadarExploration`. Toutes idempotentes (dédup par forme normalisée lowercase). Création de la ligne `radar_explorations` à la volée si absente (defaults raisonnables : `seed = ''`, `scan_result = {}`, `depth = 1`).

**A.3 — Correction autocomplete par keyword** :
- Modifier `scanRadarKeywords` dans `server/services/keyword/keyword-radar.service.ts` :
  - Remplacer l'unique `fetchAutocompleteMergedGrouped(specificTopic)` par un appel par keyword (concurrence 3).
  - Cache cross-article via `keyword_autocomplete` (UPSERT idempotent par `(keyword, lang, country, position)`).
  - Adapter le calcul de `autocompleteMatchCount` par card pour utiliser le résultat propre à chaque keyword.
- Conserver la rétrocompatibilité : la signature de `scanRadarKeywords` ne change pas, seul le détail interne change.

**A.4 — Schémas Zod** pour les 3 nouvelles routes (validation Body / Query).

**A.5 — Tests** :
- `tests/contract-api/radar-exploration.contract.test.ts` (nouveau ou enrichi) : couvre les 3 routes (200, 400, idempotence).
- `tests/unit/services/keyword-radar.service.test.ts` (enrichi) : couvre l'autocomplete par keyword (cache hit / miss / batch).
- `tests/unit/services/radar-exploration.service.test.ts` : couvre les nouvelles fonctions service.

### Sprint B — Front Radar (DB-first)

**B.1 — Création/refonte du store `useRadarExplorationStore`** (`src/stores/article/radar-exploration.store.ts`) :
- État : `entry: RadarExplorationEntry | null`, `isLoading: boolean`, `articleId: number | null`.
- Actions :
  - `setArticle(id)` : si `id !== articleId.value`, fetch `GET /articles/:id/radar-exploration` et stocke.
  - `addKeyword(keyword)` : POST → on success, re-hydrate `entry`.
  - `removeKeyword(keyword)` : DELETE → on success, re-hydrate `entry`.
  - `addKeywordsBatch(keywords)` : POST batch → on success, re-hydrate.
  - `setScanResult(scanResult)` : appelé après un scan réussi pour synchroniser.
- Getters réactifs :
  - `generatedKeywords: RadarKeyword[]` (dérivé de `entry.generated_keywords`).
  - `scanCards: RadarCard[]` (dérivé de `entry.scan_result.cards`).
  - `hasScanResult: boolean` (dérivé de `entry.scan_result.cards.length > 0`).
- Header `AUTHORITY:` obligatoire (cf. CLAUDE.md §3.2).

**B.2 — Refonte `useResonanceScore` / `useKeywordRadar`** (`src/composables/keyword/useResonanceScore.ts`) :
- Suppression du ref `generatedKeywords` mémoire indépendant.
- La fonction `scan(...)` consomme la liste depuis le store, écrit `setScanResult` après scan.
- `reset()`, `removeKeyword(i)` re-routés vers le store.
- `loadFromRadarCache` reste pour le mode libre (LaboView) mais n'est plus consommé par RadarPanel workflow.

**B.3 — Refonte `RadarPanel.vue`** :
- `onMounted` → `radarStore.setArticle(props.articleId)` (au lieu du `checkRadarCache` actuel — qui reste pour mode libre).
- Suppression du watcher `injectedKeywords` (Discovery écrit en DB directement, plus de prop).
- Suppression de l'appel `handleGenerate` (la génération est maintenant dans Discovery — Sprint C). La section `DouleurScannerInputs` est conservée **mais simplifiée** : pas de génération, juste pain point info (le `painPoint` est lu depuis l'article).
- Ajout d'un input texte unitaire dans Phase 2 (modèle `CaptainInput`) — composant `RadarManualAdd.vue` à créer ou bloc inline.
- Phase 2 chips : `× → radarStore.removeKeyword(keyword)`.
- Phase 3 : lit `scanCards` du store, comportement inchangé pour le reste.
- `RadarAiPanel` : prop `hasScanResult` lue du store.

**B.4 — Suppression `discoveryRadarKeywords` dans `useMoteurCrossTabState`** :
- Le state cross-tab perd `discoveryRadarKeywords` et `handleKeywordsCleared`.
- `handleSendToRadar` devient juste : `setActiveTab('radar')` + `emitCheckCompleted(MOTEUR_DISCOVERY_DONE)`.
- L'ajout DB se fait côté Discovery (Sprint C).

**B.5 — Tests Sprint B** :
- `tests/unit/stores/radar-exploration.store.test.ts` (nouveau) : couvre les actions du store (setArticle, addKeyword, removeKeyword, addKeywordsBatch, setScanResult).
- `tests/unit/components/douleur-intent-scanner.test.ts` (adapté) : couvre l'input manuel + le watcher store.
- `tests/unit/components/moteur/RadarManualAdd.test.ts` (nouveau si composant dédié) : couvre le pattern input.
- E2E `tests/e2e-workflows/moteur.workflow.test.ts` (adapté) : le scan ne dépend plus de prop `injectedKeywords`.

### Sprint C — Front Discovery (déplacement génération courte-traîne)

**C.1 — Intégration génération dans `useDiscoveryPanel`** :
- Nouvelle fonction `generateLongTail()` qui POST `/api/keywords/radar/generate` et stocke le résultat dans une nouvelle ref `longTailKeywords: DiscoveredKeyword[]` (avec source `'longtail-ai'`).
- Section ajoutée à `sections` computed dans `DiscoveryPanel.vue` :
  ```ts
  { key: 'longtail-ai', icon: '🎯', label: 'Courte-traîne IA (PAA-friendly)', list: longTailKeywords.value, ... }
  ```
- Bouton "Générer courte-traîne" placé dans `DiscoveryPanel` à côté des autres sources ou comme action dans la sidebar.
- Le filtre relevance 2-pass s'applique à ces keywords (déjà géré par `useRelevanceScoring` via `allKeywordsFlat`).

**C.2 — Refonte handleSendToRadar côté Discovery** :
- Le clic "Envoyer au Radar" appelle désormais `radarStore.addKeywordsBatch(keywords)` (via injection du store ou via un nouvel emit traité dans `MoteurView`).
- Plus de propagation via `discoveryRadarKeywords`.
- Toujours `emitCheckCompleted(MOTEUR_DISCOVERY_DONE)` et `setActiveTab('radar')`.

**C.3 — Adaptation du type `DiscoverySource`** :
- Ajout d'une nouvelle valeur `'longtail-ai'` dans le type union.
- Couleur dans `SOURCE_COLORS` (palette purple/orange, à harmoniser).

**C.4 — Tests Sprint C** :
- `tests/unit/components/keyword-discovery-tab.test.ts` (enrichi) : test de la nouvelle section longtail-ai.
- `tests/unit/composables/useDiscoveryPanel.test.ts` (à créer ou enrichi) : test de `generateLongTail`.

### Sprint D — Dépréciation basket

**D.1 — Suppressions** :
- `src/stores/article/moteur-basket.store.ts`
- `src/components/moteur/BasketStrip.vue`
- `src/components/shared/BasketFloatingPanel.vue`
- Tests associés (`tests/unit/stores/moteur-basket.store.test.ts` si existe).

**D.2 — Refonte `KeywordAssistPanel`** :
- Nouvelle prop `keywords: string[]` (passée par le parent — la liste à proposer).
- Suppression du `useMoteurBasketStore` interne et du computed `suggestions`.
- La prop `keywords` est utilisée directement, filtrée par `excludeKeywords`.

**D.3 — Adaptation des callers** :
- `CaptainPanel.vue`, `LieutenantsPanel.vue`, `LexiquePanel.vue` : lire les keywords du Radar de l'article courant (via `useRadarExplorationStore.scanCards.map(c => c.keyword)` + éventuellement `generatedKeywords`) et passer en prop au `KeywordAssistPanel`.
- `MoteurView.vue` : suppression de `basketStore` et de `<BasketStrip>`. Suppression de `basketStore.$reset()`, `setArticle()`, etc.
- `useMoteurCrossTabState.ts` : suppression du paramètre `basketStore` dans les deps.

**D.4 — Tests Sprint D** :
- `tests/unit/components/KeywordAssistPanel.test.ts` (adapté) : couvre la nouvelle prop.
- Tests Capitaine/Lieutenants/Lexique : vérifier que le mount fonctionne sans basket store.

### Sprint E — Validation finale et clôture

**E.1 — Validation technique** :
- `npm run check:health` (lint + type-check + cycles + dead + arch) vert.
- `npm run test:check` net positif ou neutre vs baseline.
- `npm run build` vert.

**E.2 — Doc** :
- Mettre à jour `docs/ui-sections-guide.md §3.4` (Radar) avec le nouveau flow.
- Mettre à jour `docs/data-flows/radar-explorations.md` si nécessaire.
- Mettre à jour `docs/data-flows/radar-keywords.md` : passer le statut audit de "à confirmer" à "implémenté".
- `_bmad-output/implementation-artifacts/sprint-status.yaml` : entrée `radar-dbfirst-refactor: done`.
- Tech-spec bumped à `status: done`.

**E.3 — Commit + merge** :
- Commits par sprint (A, B, C, D, E.1-2) sur `feat/radar-dbfirst-refactor`.
- Merge `--no-ff` vers `main`.
- Push origin.
- Suppression de la branche feature locale.

## Critères d'acceptation consolidés

| AC | Sprint | Vérifié par |
|---|---|---|
| AC.RAD-DBFIRST.1-6 | B | Tests unit RadarPanel + store + e2e |
| AC.RAD-MANUAL.1-5 | B | Tests RadarManualAdd + RadarPanel |
| AC.RAD-AC.1-5 | A | Tests service keyword-radar + contract-api |
| AC.DIS-LONGTAIL.1-4 | C | Tests DiscoveryPanel + useDiscoveryPanel |
| AC.BASKET-DEP.1-5 | D | Tests garde grep + KeywordAssistPanel + Cap/Lie/Lex |
| Lint + type-check + tests + build | E | `npm run check:health` + `npm run test:check` |

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Régression sur le cycle complet Discovery → Radar → Capitaine | Tests e2e workflow Moteur préservés + adaptation des tests existants |
| Doublement coût DataForSEO autocomplete | Cache TTL 90j amortit dès la 2ᵉ scan sur même keyword. Coût accepté par l'utilisateur. |
| Données legacy `radar_explorations.scan_result` avec `relevanceScore` | Code de lecture ignore déjà ce champ (FR-CAP-RELEVANCE-COMPUTED-LIVE) |
| `BasketFloatingPanel` consommé ailleurs que prévu | Audit grep effectué — `MoteurView.vue` est l'unique caller. |
| Working tree partagé avec autre conversation | Stage par nom de fichier explicite à chaque commit (pas `git add .`) |
| Travail long, risque d'interruption | Sprints commitables indépendamment, possible de merger Sprint A seul si besoin |

## Métriques de succès

- Suppression nette d'environ 400-500 lignes (basket store + BasketStrip + BasketFloatingPanel + tests + states mémoire redondants).
- Ajout d'environ 200-300 lignes (store DB-first + input manuel + autocomplete par keyword).
- Zero régression fonctionnelle (validé par test:check).
- Onglet Radar peut être visité, modifié, reloadé sans perte de données entre les sessions.
- Coût DataForSEO autocomplete monitoré sur les premières utilisations (acceptable si < 2× le coût avant).
