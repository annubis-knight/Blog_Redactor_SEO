---
title: 'Migration progressive fetch() directs → wrapper apiGet/apiPost + apiStream'
slug: 'fetch-to-wrapper-migration'
created: '2026-05-05'
last_updated: '2026-05-05'
delivered: '2026-05-05'
version: '1.0.0'
status: 'delivered'
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-INFRA-API-WRAPPER, NFR-INT-API-WRAPPER, NFR-OBS-COST-LOG, NFR-OBS-DBOPS-TRACK, NFR-OBS-KNOWN-ERRORS, §12.4)
  - docs/data-flows/_audit-2026-05-05.md (catégorie « fetch() directs hors wrapper »)
  - .claude/CLAUDE.md (§3 règle 5, §3.1, §4)
related_FR:
  - FR-INFRA-API-WRAPPER (affiné)
  - NFR-INT-API-WRAPPER (affiné)
  - FR-INFRA-API-STREAM (nouveau)
  - NFR-OBS-EXTERNAL-API-OPT-OUT (nouveau)
files_to_modify:
  # Commit 1 — exclusion faux positif audit
  - .claude/skills/data-flow-discipline/scripts/audit_data_flow.py (exclusion src/services/api.service.ts)
  # Commit 2 — keyword-audit.store
  - src/stores/keyword/keyword-audit.store.ts
  - tests/unit/stores/keyword-audit.store.test.ts (NEW)
  # Commit 3 — keyword-discovery.store
  - src/stores/keyword/keyword-discovery.store.ts
  - tests/unit/stores/keyword-discovery.store.test.ts (NEW)
  # Commit 4 — DiscoveryPanel
  - src/stores/keyword/keyword-audit.store.ts (ajout addKeywordsBatch)
  - src/components/keywords/DiscoveryPanel.vue
  - tests/unit/components/keywords/DiscoveryPanel.spec.ts (NEW)
  # Commit 5 — apiStream<T>
  - src/services/api.service.ts (ajout apiStream)
  - tests/unit/services/api.service.test.ts (NEW ou MODIF)
  # Commit 6 — migration streams SSE
  - src/composables/editor/useStreaming.ts
  - src/components/editor/tiptap/extensions/dynamic-block-drop.ts
  - src/components/moteur/CaptainValidation.vue
  # Commit 7 — commentaires fetch externes
  - server/services/article/content-gap.service.ts
  - server/services/external/gsc.service.ts
  - server/services/external/openrouter.service.ts
  - server/services/external/serp-analysis.service.ts
  - server/services/external/dataforseo/_client.ts
  - server/services/intent/intent.service.ts
  - server/services/keyword/autocomplete.service.ts
  - server/services/keyword/suggest.service.ts
  - server/services/strategy/local-seo.service.ts
  # Commit 8 — PRD
  - _bmad-output/planning-artifacts/prd.md
---

> ⚠️ **ARCHIVED** (livré 2026-05-05) — Ce document est archivé pour traçabilité historique. La fonctionnalité a été livrée et validée. Pour l'état actuel, consulter le PRD (FR-INFRA-API-WRAPPER, FR-INFRA-API-STREAM, NFR-INT-API-WRAPPER, NFR-OBS-EXTERNAL-API-OPT-OUT) et le code (`src/services/api.service.ts`).

# Tech-spec — Migration `fetch()` directs vers wrapper API

## 1. Contexte

L'audit `data-flow-discipline` (rapport `docs/data-flows/_audit-2026-05-05.md`, catégorie MEDIUM `fetch() directs hors wrapper`) identifie **35 occurrences de `fetch()`** hors du wrapper officiel `src/services/api.service.ts`.

Le wrapper apporte 3 garanties que `fetch` brut n'a pas :
1. **Activity log** automatique (`pushUsageIfPresent` → cost-log store).
2. **DbOps tracking** (`pushDbOpsIfPresent` → cost-log store).
3. **Surface des `KNOWN_ERROR_CODES`** en toasts UI lisibles.

Sans wrapper, un 429 DataForSEO devient « Erreur 500 » ; avec wrapper, il devient « Trop de requêtes, réessaie dans 30s ».

## 2. Catégorisation des 35 occurrences

| Catégorie | Nb | Action |
|-----------|-----|--------|
| **A** — fetch métier interne (`/api/...`) | 9 | Migrer vers `apiGet/apiPost/apiPut/apiPatch/apiDelete` |
| **A-stream** — fetch SSE POST + ReadableStream | 4 | Migrer vers nouveau `apiStream<T>` helper |
| **B** — fetch externe légitime (DataForSEO, OAuth, OpenRouter, Tavily, Google Suggest…) | 14 | NE PAS migrer. Ajouter commentaire `// External API call — bypass wrapper by design` |
| **B-self-ref** — implémentation du wrapper lui-même | 5 | Faux positif. Exclure `src/services/api.service.ts` du script d'audit |
| **C** — HTML template statique (`fetch(file)` côté browser pour include HTML) | 3 (docs/) + 1 (export.service.ts) | Faux positif (HTML statique non exécuté côté Node). Ignorer |
| **TOTAL** | **35** | |

### 2.1 Tableau détaillé — catégories A et A-stream

| # | Fichier:ligne | URL appelée | Cible | Format `{data}` route ? |
|---|---|---|---|---|
| A1 | `src/components/keywords/DiscoveryPanel.vue:62` | POST `/api/keywords` | `apiPost` (via store) | ✅ |
| A2 | `src/stores/keyword/keyword-audit.store.ts:42` | POST `/api/keywords/audit` | `apiPost<{results, redundancies}>` | ✅ |
| A3 | `src/stores/keyword/keyword-audit.store.ts:66` | GET `/api/keywords/audit/:cocoon/status` | `apiGet<AuditCacheStatus>` | ✅ |
| A4 | `src/stores/keyword/keyword-audit.store.ts:77` | POST `/api/keywords` | `apiPost<{success}>` | ✅ |
| A5 | `src/stores/keyword/keyword-audit.store.ts:89` | PUT `/api/keywords` | `apiPut<{success}>` | ✅ |
| A6 | `src/stores/keyword/keyword-audit.store.ts:101` | PATCH `/api/keywords/:kw/status` | `apiPatch<{success}>` | ✅ |
| A7 | `src/stores/keyword/keyword-audit.store.ts:116` | DELETE `/api/keywords/:kw` | `apiDelete<{success}>` | ✅ |
| A8 | `src/stores/keyword/keyword-discovery.store.ts:74` | POST `/api/keywords/discover` | `apiPost<KeywordDiscoveryResult>` | ✅ |
| A9 | `src/stores/keyword/keyword-discovery.store.ts:112` | POST `/api/keywords/discover-from-site` | `apiPost<DomainDiscoveryResult>` | ✅ |
| AS1 | `src/composables/editor/useStreaming.ts:127` | POST URL paramétrable (SSE) | `apiStream<T>` | n/a (stream) |
| AS2 | `src/composables/editor/useStreaming.ts:202` | POST URL paramétrable (SSE) | `apiStream<T>` | n/a (stream) |
| AS3 | `src/components/editor/tiptap/extensions/dynamic-block-drop.ts:590` | POST `/api/generate/action` (SSE) | via `useStreaming` migré | n/a (stream) |
| AS4 | `src/components/moteur/CaptainValidation.vue:541` | POST `/api/keywords/:kw/ai-panel` (SSE) | via `useStreaming` migré | n/a (stream) |

**✅ aucune route serveur ne doit changer de format de réponse** — toutes renvoient déjà `{ data: T }`.

### 2.2 Liste fetch externes (catégorie B — 14)

À documenter avec commentaire `// External API call — bypass wrapper by design` :

- `server/services/article/content-gap.service.ts:27` — Tavily API
- `server/services/external/gsc.service.ts:43,113,166` — Google OAuth + Search Console API
- `server/services/external/openrouter.service.ts:62,129` — OpenRouter API
- `server/services/external/serp-analysis.service.ts:72` — DataForSEO SERP
- `server/services/external/dataforseo/_client.ts:98,170` — DataForSEO
- `server/services/intent/intent.service.ts:84,313,424` — DataForSEO SERP advanced
- `server/services/keyword/autocomplete.service.ts:93,112` — Google Suggest
- `server/services/keyword/suggest.service.ts:73` — externe
- `server/services/strategy/local-seo.service.ts:20` — externe

## 3. Phase 1.bis — Cartographie des données partagées impactées

| Donnée | Producteur | Consommateur | Impact migration |
|--------|------------|--------------|------------------|
| `KeywordAuditResult[]` | `keyword-audit.store.fetchAudit` | `KeywordAuditTable.vue`, `KeywordComparison.vue` | Aucun (la donnée traverse identique, seul le transport change) |
| `ClassifiedKeyword[]` (discovery) | `keyword-discovery.store.discoverFromSeed/Domain` | `DiscoveryPanel.vue` | Aucun |
| `AuditCacheStatus` | `keyword-audit.store.fetchCacheStatus` | UI cache freshness | Aucun |
| Stream SSE chunks (article generation, ai-panel) | `useStreaming.startStream` / `dynamic-block-drop` / `CaptainValidation` | TipTap editor, side-panel Capitaine | `apiStream` doit conserver `onChunk`, `onUsage`, `onSectionStart`, `onSectionDone`, `onError` |

**Règle de cohérence affichage/calcul** : non concernée — la migration ne change aucune valeur, juste le transport HTTP.

## 4. Phase 2 — FR / NFR PRD

### 4.1 À affiner

| ID | Modification |
|----|--------------|
| `FR-INFRA-API-WRAPPER` (prd.md:920) | Retirer mention « dette ~20 fetch ». Ajouter périmètre clair : **« tout appel HTTP vers `/api/*` côté `src/`. Hors périmètre : appels vers APIs tierces côté `server/services/external/`. Pour le streaming SSE : utiliser `apiStream`. »** |
| `NFR-INT-API-WRAPPER` (prd.md:1196) | Retirer mention « dette résiduelle ». Critère d'acceptation : audit `data_flow_discipline` retourne 0 dans la catégorie « fetch() directs hors wrapper » côté `src/`. |
| `§12.4 dette` (prd.md:1491) | Supprimer ligne 2 « fetch() directs résiduels ». |

### 4.2 À créer

#### `FR-INFRA-API-STREAM` (nouveau)

> Wrapper SSE `apiStream<T>(path, body, callbacks, options?)` dans `src/services/api.service.ts`. Mutualise les appels POST → SSE (`/api/generate/action`, `/api/keywords/:kw/ai-panel`, etc.). Surface `usage` final dans cost-log + traduit `KNOWN_ERROR_CODES` en toasts. Signature callbacks : `{ onChunk?, onChunkRaw?, onDone?, onError?, onUsage?, onSectionStart?, onSectionDone? }`. Renvoie `{ result, usage, errorMessage, aborted }`.

- **Why** : 4 fetch SSE dispersés répliquaient la même logique sans surface des codes connus.
- **Critères d'acceptation** :
  - Test unit : un mock 429 sur le stream déclenche `addMessage('error', ...)` dans `cost-log.store`.
  - Test unit : `apiStream` appelle `onChunk` pour chaque chunk reçu.
  - Test unit : à `done`, `pushCostEntry(url, usage)` est appelé.
  - `useStreaming.ts`, `dynamic-block-drop.ts`, `CaptainValidation.vue` passent par `apiStream`.

#### `NFR-OBS-EXTERNAL-API-OPT-OUT` (nouveau)

> Les fetch vers APIs tierces (`server/services/external/*`, Tavily, Google Suggest, OAuth) sont volontairement hors wrapper. Chaque occurrence porte un commentaire `// External API call — bypass wrapper by design` au-dessus du `fetch(`.

- **Why** : éviter qu'un futur audit ou refacto bête tente de les forcer dans `apiGet`. Ces APIs sont externes, donc hors périmètre du wrapper interne `/api/*`.
- **Critères d'acceptation** :
  - `grep -r "External API call — bypass wrapper by design" server/` retourne ≥ 14 occurrences.
  - Audit data-flow : les fetch légitimes sont toujours flaggés MEDIUM mais documentés (futur enrichissement du script : skip si commentaire opt-out présent ligne précédente).

### 4.3 Mise à jour §12.4 PRD

Ajouter dans la section §12.4 « FR/NFR introduits/modifiés » :

```
- 2026-05-05 : FR-INFRA-API-STREAM (nouveau) — wrapper SSE unifié.
- 2026-05-05 : NFR-OBS-EXTERNAL-API-OPT-OUT (nouveau) — opt-out documenté pour fetch externes.
- 2026-05-05 : FR-INFRA-API-WRAPPER (affiné) — périmètre clarifié, dette résorbée.
- 2026-05-05 : NFR-INT-API-WRAPPER (affiné) — critère d'acceptation mesurable via audit.
```

## 5. Phase 3 — Découpage en commits

```
commit 1 : chore(audit): exclure api.service.ts du check fetch-direct (faux positif wrapper)
commit 2 : refactor(keyword-audit): migrer 5 fetch vers wrapper + tests
commit 3 : refactor(keyword-discovery): migrer 2 fetch vers apiPost + tests
commit 4 : refactor(discovery-panel): déplacer fetch vers store.addKeywordsBatch + apiPost
commit 5 : feat(api): apiStream<T> helper SSE + tests
commit 6 : refactor(streaming): migrer useStreaming + dynamic-block-drop + CaptainValidation
commit 7 : docs(external): commentaires "External API call" sur 14 fetch légitimes
commit 8 : docs(prd): FR-INFRA-API-WRAPPER affiné + FR-INFRA-API-STREAM + NFR-OBS-EXTERNAL-API-OPT-OUT + §12.4
```

Chaque commit :
- ✅ Red → test prouve l'exigence (apiX appelé, pas fetch).
- ✅ Green → migration.
- ✅ Refactor → nettoyage imports.

## 6. Phase 5 — Validation

```bash
npm run lint
npm run type-check
npm run test:unit
npm run test:browser    # critique : composants Vue migrés
npm run check:dead
npm run check:cycles
npm run check:arch
python ".claude/skills/data-flow-discipline/scripts/audit_data_flow.py" --root . --output "docs/data-flows/_audit-2026-05-05.md"
```

**Cible audit** : 0 occurrence dans la catégorie « fetch() directs hors wrapper » côté `src/`. Côté `server/services/external/*`, les 14 fetch externes restent flaggés MEDIUM mais sont documentés (NFR-OBS-EXTERNAL-API-OPT-OUT).

## 7. Critères d'acceptation finaux

- [ ] `check:health` vert.
- [ ] Audit data-flow `src/` : 0 fetch hors wrapper (hors `api.service.ts`).
- [ ] Pour chaque migration A : 1 test prouvant `apiX` appelé.
- [ ] Test e2e : un 429 sur `/api/keywords/discover` (mocké) déclenche un toast.
- [ ] PRD mis à jour : `FR-INFRA-API-STREAM` créé, `NFR-OBS-EXTERNAL-API-OPT-OUT` créé, `FR-INFRA-API-WRAPPER` + `NFR-INT-API-WRAPPER` affinés, `§12.4` actualisée.
- [ ] Aucune cartographie data-flow impactée (cf §3 — la migration ne change pas la donnée).
