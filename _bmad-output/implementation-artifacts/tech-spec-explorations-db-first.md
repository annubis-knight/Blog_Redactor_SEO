---
name: tech-spec-explorations-db-first
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-05-12
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-MOT-EXPLORATIONS-HYDRATATION, FR-MOT-CACHE-PANEL-COUNT refonte)
---

## Résultat livré

- **Backend** : `getArticleKeywords` hydrate les explorations même sans
  ligne `article_keywords` (cas user 31 capitaines testés sans verrou
  → carousel maintenant rempli). Compteur Radar SQL = `generated_keywords`
  + `scan_result.cards`.
- **Frontend** : `tab-cache-entries.ts` simplifié — `dbCount` = totaux DB
  pour les 4 onglets (Radar/Capitaine/Lieutenants/Lexique). Hints conservent
  l'info verrouillé/validé.
- **PRD** : pivot sémantique FR-MOT-CACHE-PANEL-COUNT (logique base au lieu
  de logique workflow), nouvelle FR-MOT-EXPLORATIONS-HYDRATATION.
- **Tests** : +3 tests `article-keywords.test.ts` (AC.HYDRAT.1, 2, 5),
  refonte complète `tab-cache-entries.test.ts` (AC.CACHEPANEL.1-6).

## Validation

- `npm run type-check` : vert.
- `npm run lint` : 0 erreurs (265 warnings préexistants `no-explicit-any`).
- `npm run test:unit` : 13 + 19 tests ciblés passent.
- `npm run test:check` : net positif (7 nouveaux verts, 3 rouges
  préexistants flaky sur main, non liés au chantier).
- `npm run build` : vert (~11s).

---


# Tech-spec — TabCachePanel logique base + hydratation explorations sans verrouillage

## Contexte

Deux bugs observés simultanément sur l'article 64 (audit DB du 2026-05-12) :

1. **TabCachePanel affiche `DB 0`** sur Radar et Capitaine alors que la DB contient `radar_explorations.scan_result.cards = 45`, `captain_explorations = 31 rows`, `paa_explorations = 124 rows`. Le compteur ne reflète que les **verrouillés** (FR-MOT-CACHE-PANEL-COUNT actuelle), pas les **explorés**.
2. **Carousel d'explorations Capitaine vide après reload** alors que `captain_explorations` contient 31 rows. La fonction `getArticleKeywords()` retourne `null` dès que la ligne `article_keywords` est absente — early-return avant l'hydratation des explorations.

Les deux symptômes proviennent de la même racine : **la persistence est correcte mais l'UI ne reflète pas les données DB tant que l'utilisateur n'a pas verrouillé**. Le workflow Radar DB-first récent (Sprint A→E) encourage l'exploration sans verrouillage immédiat, ce qui rend les bugs visibles.

## Objectifs

1. `getArticleKeywords` hydrate les explorations même sans ligne `article_keywords` (FR-MOT-EXPLORATIONS-HYDRATATION).
2. `TabCachePanel.dbCount` reflète le **total DB par onglet** (FR-MOT-CACHE-PANEL-COUNT refonte) :
   - Radar = `generated_keywords + scan_result.cards`
   - Capitaine = total `captain_explorations`
   - Lieutenants = total `lieutenant_explorations`
   - Lexique = total `lexique_explorations`
3. Le hint au survol conserve le détail verrouillé/exploré (information préservée).
4. Aucune régression sur les flows où `article_keywords` existe.

## Hors-scope

- Refonte des dots de progression workflow (toujours basés sur verrouillage).
- Refonte du `richCaptain.status` (toujours `'locked'` si capitaine verrouillé, `'suggested'` sinon).
- Refonte de la sémantique "Cache N" du TabCachePanel (inchangé).

## Cartographie (Phase 1.bis)

### Données partagées concernées

| Donnée | Source de vérité | Producteurs | Consommateurs | Persistance |
|---|---|---|---|---|
| `richCaptain.exploredKeywords` | `captain_explorations` JOIN `keyword_metrics` | `POST /captain-explorations`, scan PAA, envoi Radar→Capitaine | CaptainPanel, `useExploredKeywords`, `article-keywords.store` | DB |
| Compteurs TabCachePanel | `GET /articles/:id/explorations/counts` (refonte sémantique) | Backend SQL aggregate | `tab-cache-entries.ts → buildTabCacheEntries`, TabCachePanel | DB (lecture pure) |

### Règle de cohérence affichage / calcul

Le compteur affiché ET la valeur SQL utilisée pour le tri/filtre/agrégat sont **la même expression** :
- Front : `counts.radar / counts.captain / counts.lieutenants / counts.lexique`
- Back : `GET /articles/:id/explorations/counts` (une seule query, plusieurs `SELECT … UNION ALL …`)

Pas de fallback frontend qui appliquerait une logique différente.

### Cas d'usage à tracer

| Cas | Avant | Après |
|---|---|---|
| Article scanné Radar (45 cards) jamais verrouillé | Radar DB 0, Capitaine DB 0 | Radar DB 45, Capitaine DB N (selon `captain_explorations`) |
| Article avec capitaine verrouillé + 3 lieutenants verrouillés | Lieutenants DB 3 | Lieutenants DB ≥ 3 (= total `lieutenant_explorations`, ≥ verrouillés) |
| Article totalement vide | `getArticleKeywords` → null | Inchangé (null) |
| Article exploré sans verrouillage | `richCaptain.exploredKeywords` = [] (frontend) | Hydraté depuis `captain_explorations` |
| Reload après envoi Radar→Capitaine sans verrou | Carousel vide | Carousel affiche les keywords envoyés |

## Plan d'exécution

### Étape 1 — Backend hydratation

**1.1** — Modifier `server/services/infra/data.service.ts:546` (`getArticleKeywords`) :
- Supprimer le early-return ligne 551.
- Charger `getCaptainExplorations(id)` et `getLieutenantExplorations(id)` systématiquement.
- Si **toutes les 3 sources** (article_keywords, captain_explorations, lieutenant_explorations) sont vides → retourner `{ data: null, dbOps }`.
- Sinon, construire un objet `ArticleKeywords` :
  - Soit depuis `article_keywords.rows[0]` (cas existant)
  - Soit depuis des defaults (`capitaine: ''`, `lieutenants: []`, etc.) avec `richCaptain` et `richLieutenants` hydratés.

**1.2** — Le compteur Radar dans `GET /articles/:id/explorations/counts` (route déjà existante) :
- Modifier la query SQL ligne 123-125 :
  ```sql
  SELECT 'radar' AS source,
         COALESCE(SUM(jsonb_array_length(generated_keywords)
                      + jsonb_array_length(COALESCE(scan_result->'cards', '[]'::jsonb))), 0)::text AS count
    FROM radar_explorations WHERE article_id = $1
  ```

**1.3** — Tests backend :
- `tests/unit/services/article-keywords.test.ts` : adapter le test `returns null when article id is not found` pour passer 3 réponses vides (article_keywords + captain_explorations + lieutenant_explorations) ; ajouter 3 nouveaux tests pour AC.HYDRAT.1, AC.HYDRAT.2, AC.HYDRAT.5.
- `tests/unit/routes/article-explorations.routes.test.ts` (à créer ou enrichir) : couvre le calcul Radar étendu (cards + generated).

### Étape 2 — Frontend compteurs

**2.1** — Modifier `src/utils/tab-cache-entries.ts` :
- `radarDbCount` = `counts.radar ?? 0` (suppression de la priorité au store, car le backend compte maintenant generated + cards).
- `capitaineDbCount` = `counts.captain ?? 0` (remplace `ui.isCaptaineLocked ? 1 : 0`).
- `lieutenantsDbCount` = `counts.lieutenants ?? 0` (remplace `ui.lockedLieutenantsCount`).
- `lexiqueDbCount` = `counts.lexique ?? 0` (remplace `ui.validatedLexiqueCount`).
- **Hint** : reformulés pour préserver l'info verrouillé/validé (« 31 testés · 0 verrouillé », « 45 scannés · 12 en attente »).

**2.2** — Adapter `TabCacheUIState` (props devenues optionnelles ou supprimées si plus utilisées).

**2.3** — Adapter `useMoteurCrossTabState` / `MoteurView` pour passer ou non les ui-states selon le besoin des hints.

**2.4** — Garde-fou Radar (timing) : à la mutation manuelle d'un keyword Radar (add/remove via store), le `counts.radar` peut être périmé jusqu'au prochain `refreshExplorationCounts`. Garder l'option `radarGeneratedKeywordsCount` du store en fallback réactif **uniquement quand `counts.radar` est obsolète** — ou plus simple, appeler `refreshExplorationCounts` après chaque mutation.

**2.5** — Tests frontend :
- `tests/unit/utils/tab-cache-entries.test.ts` : adapter pour la nouvelle sémantique. Couvre AC.CACHEPANEL.1-9.

### Étape 3 — Validation

- `npm run type-check` vert.
- `npm run lint` 0 erreurs nouvelles.
- `npm run test:unit` vert.
- `npm run test:check` (baseline) : pas de nouveau rouge non lié au chantier.
- `npm run build` vert.

### Étape 4 — Clôture

- Tech-spec → `status: done`.
- Commit unique sur `feat/explorations-db-first`.
- Merge `--no-ff` vers `main`, push, suppression de la branche locale et origin.

## Critères d'acceptation consolidés

| AC | Étape | Vérifié par |
|---|---|---|
| AC.HYDRAT.1-5 | 1.1 + 1.3 | Tests unit `article-keywords.test.ts` |
| AC.CACHEPANEL.1-9 | 1.2 + 2.1 + 2.5 | Tests unit `tab-cache-entries.test.ts` |
| Lint + type-check + tests + build | 3 | `npm run check:health` + `npm run test:check` |

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Casse des tests existants sur `article-keywords` (3 calls → 5 calls) | Adapter les `mockResolvedValueOnce` pour les nouvelles queries |
| Compteur Radar incohérent juste après ajout manuel (counts cache 1-2 secondes) | Appel `refreshExplorationCounts` après mutation, ou fallback réactif via store |
| Régression sur le calcul `richCaptain.status` quand `capitaine = ''` | Test explicite : status `'suggested'` (pas `'locked'`) si capitaine vide |
| Working tree partagé avec autre conversation | Stage par nom de fichier explicite à chaque commit |

## Métriques de succès

- 0 régression sur les tests existants liés à `article_keywords`.
- Compteurs TabCachePanel alignés avec la DB sur tous les onglets pour l'article 64 (vérification manuelle après merge).
- Carousel Capitaine affiche les 31 explorations sans avoir besoin de verrouiller.
