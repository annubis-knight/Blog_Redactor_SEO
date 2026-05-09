---
version: 1.0.0
last_updated: 2026-05-09
status: ready-for-sprint
type: implementation-plan
chantier: 3
title: 'Chantier 3 — UX onglet Lexique : multi-keyword tabs + pré-check SERP + séparation lecture/verrouillage'
synced_with:
  - _bmad-output/planning-artifacts/prd.md  # FR-LEX-PRECHECK-SERP, FR-LEX-MULTI-KEYWORD-TABS, FR-LEX-LECTURE-VS-VERROUILLAGE
  - _bmad-output/planning-artifacts/_archive/tech-spec-keyword-metrics-decomposition.md  # chantier 1 — tables filles SERP
  - _bmad-output/planning-artifacts/_archive/tech-spec-decouplage-lieutenants-lexique.md  # chantier 2 — services métier découplés
prerequisites:
  - chantier-1: done (sprint-keyword-metrics-decomposition — 2026-05-09)
  - chantier-2: done (sprint-decouplage-lieutenants-lexique — 2026-05-09)
target_frs:
  - FR-LEX-PRECHECK-SERP (proposed → active à la livraison)
  - FR-LEX-MULTI-KEYWORD-TABS (proposed → active à la livraison)
  - FR-LEX-LECTURE-VS-VERROUILLAGE (proposed → active à la livraison)
target_acs:
  - AC.LEX-PRECHECK.1..5 (5 ACs)
  - AC.LEX-TABS.1..5 (5 ACs)
  - AC.LEX-SEP.1..4 (4 ACs)
  total: 14
estimated_effort: 3 epics, 9 stories, ~3 jours dev solo
---

# Chantier 3 — UX onglet Lexique

> **Périmètre** : refondre l'UX du LexiquePanel pour (a) éliminer les 404 console au mount via un endpoint pré-check léger, (b) afficher un onglet par `source_keyword` exploré au lieu des chips collapsibles, (c) séparer strictement les responsabilités lecture vs verrouillage. **Aucun changement** sur le schéma DB (chantier 1) ni sur les services métier (chantier 2).

---

## 1. Contexte et motivation

### 1.1 Problèmes observés (état post-chantier 2)

1. **404 console au mount** : `LexiquePanel` charge `hydrateFromDb` puis `fetchTfidf` automatiquement quand le Capitaine est locké. Si le keyword n'a jamais été scrapé, `POST /serp/tfidf` répond 404 → trace rouge dans la console malgré une UX nominale (`LexiqueScrapeMissingError` levée par `lexique-analysis.service`). C'est un état **attendu** présenté comme une **erreur**.
2. **Chips collapsibles peu lisibles** : `LexiqueMultiKeywordPanel.vue` actuel affiche les explorations passées comme une rangée de chips (`past-chip`). Pour 2-3 explorations, le pattern fonctionne ; mais pour la cohérence avec le reste du Moteur (SeoPanel, GeoPanel = onglets `role="tablist"`) et la lisibilité des transitions multi-keyword, on bascule sur un **système d'onglets**.
3. **Couplage LECTURE/VERROUILLAGE** : `LexiquePanel.vue` (496 lignes) mélange deux responsabilités dans le même composant et le même store :
   - LECTURE de `lexique_explorations` via `hydrateFromDb` / `mergeFromDb` (GET).
   - VERROUILLAGE de `article_keywords.lexique` via `toggleTerm` → `addLexiqueTerm/saveDecisions` (PUT).
   - Risque : un appel `selectExploration` (changer d'onglet) qui fait par mégarde un PUT, ou un `addLexiqueTerm` qui fait un GET inutile.

### 1.2 Architecture cible (post-chantier 3)

```
LexiquePanel.vue (orchestration + watcher isLocked)
    ├── useLexiqueExplorations(articleId, captainKeyword)   ← LECTURE — 0 PUT
    │     • pastExplorations, activeSourceKeyword
    │     • hydrateFromDb, mergeFromDb, selectExploration
    │     • triggerSerpScrape (déclenche analyse SERP via lexique-analysis)
    ├── useLexiqueLocking(articleId)                        ← VERROUILLAGE — 0 GET /explorations
    │     • toggleTerm, lockedTerms, isLocked
    │     • saveDecisions
    ├── useSerpExistsCheck(keyword)                         ← LECTURE pré-check
    │     • exists, scrapedAt, isLoading
    │     • refetch() — appelle GET /api/keywords/:keyword/serp/exists
    └── shared/TabBar.vue                                   ← composant partagé extrait
          • props: tabs, activeId
          • emit: update:activeId
```

---

## 2. Cartographie des données partagées (§2.0 CLAUDE.md)

### 2.1 Donnée 1 — `pastExplorations[]` (cache UI des explorations Lexique)

| Axe | Détail |
|-----|--------|
| **Producteurs** | `useLexiqueExplorations.hydrateFromDb()` (mount) → GET `/articles/:id/explorations` → assigne `pastExplorations.value`. `useLexiqueExplorations.mergeFromDb()` (TabLoadPrompt) → fusion sans doublon. Ajout après `extractCustomKeyword` réussi → push local + invalidation. |
| **Consommateurs** | `LexiquePanel.vue` template (boucle `v-for` onglets). `selectExploration(sourceKeyword)` → recherche par clé dans le cache → set `tfidfResult` + `iaRecommendations`. **Aucune autre lecture en dehors du composant.** |
| **Persistance** | DB `lexique_explorations` (article_id + source_keyword UNIQUE). Hors session : ref locale du composable, perdu au unmount. Pas de Pinia. |
| **Cas d'usage** | (a) Premier load avec article sans exploration → `pastExplorations=[]` → 1 onglet « + Tester ». (b) Premier load avec N explorations → N onglets + 1 « + Tester », onglet matching capitaine actif par défaut. (c) Reload (refresh page) → `hydrateFromDb` re-appelé via watcher `selectedArticle.id`. (d) Switch onglet → mute uniquement state UI, **pas de fetch**. (e) Nouvelle extraction sur un keyword vierge → `extractCustomKeyword` push une nouvelle entrée dans `pastExplorations` + sélectionne. (f) Switch d'article → reset `pastExplorations=[]` puis re-hydrate. |
| **Régressions historiques** | `git log --oneline src/components/moteur/LexiquePanel.vue` montre Sprint 11 (multi-keyword introduit), Sprint 17 (lock-immediate), 2026-05-01 (mergeFromDb), 2026-05-02 (sort bar). Pas de bug spécifique aux explorations, mais le couplage LECTURE/VERROUILLAGE n'a jamais été audité. |

### 2.2 Donnée 2 — `activeSourceKeyword` (string, onglet actif)

| Axe | Détail |
|-----|--------|
| **Producteurs** | Set par défaut au mount (= `props.captainKeyword`). Set par `selectExploration(sourceKeyword)` (clic onglet). Set par `extractCustomKeyword(kw)` (saisie libre dans onglet « + Tester »). |
| **Consommateurs** | `displayedTabId` (ID actif passé à `<TabBar>`). `tfidfResult` / `iaRecommendations` réhydratés en fonction. **AUTHORITY brute** : c'est exactement la chaîne stockée en DB dans `lexique_explorations.source_keyword`. **Pas de transformation** (pas de `.toLowerCase()`, pas de `.trim()` côté UI — le matching DB côté `hydrateFromDb` continue d'utiliser `.toLowerCase()` mais en local pour la **comparaison**, pas pour la **clé d'affichage**). |
| **Persistance** | Aucune (state UI éphémère). Le cache des explorations est en DB, pas l'onglet actif. |
| **Cohérence affichage/calcul §2.0** | **Règle critique** : `tab.label = entry.sourceKeyword` (brut). `tab.id = entry.sourceKeyword` (brut). La même string sert de clé Vue, de label affiché, et de key de matching. |

### 2.3 Donnée 3 — `keywords.lexique` (Pinia store, termes verrouillés)

| Axe | Détail |
|-----|--------|
| **Producteurs** | `articleKeywordsStore.addLexiqueTerm(term)` / `removeLexiqueTerm(term)` muent le store + déclenchent `saveDecisions(id)` (PUT `/articles/:id/keywords`). Actions exposées par `useLexiqueLocking` uniquement. |
| **Consommateurs** | (1) Computed `isLocked = lexique.length > 0`. (2) Watcher gating workflow `MOTEUR_LEXIQUE_VALIDATED` (reconciliation au mount + transitions). (3) `TabCachePanel` (compteur DB). (4) Brief Capitaine côté backend. |
| **Persistance** | DB `article_keywords.lexique TEXT[]`. Pinia store `useArticleKeywordsStore`. |
| **Cas d'usage** | Cocher un terme → store mute → `saveDecisions` PUT immédiat → `isLocked` recompute → watcher emit `check-completed`. Décocher dernier terme → `lexique=[]` → `isLocked=false` → emit `check-removed`. |

---

## 3. Contrats techniques

### 3.1 Endpoint pré-check SERP

**Route** : `GET /api/keywords/:keyword/serp/exists`

**Localisation** : nouvelle handler dans `server/routes/keywords.routes.ts` (après les routes audit existantes).

**Service délégué** : nouvelle fonction `hasSerpScrape(keyword: string): Promise<{ exists: boolean; scrapedAt: string | null }>` exportée depuis `server/services/keyword/keyword-serp.service.ts` (proche des `getSerpScrapes` existants — pas de nouveau fichier).

**Implémentation cible (SQL)** :
```sql
SELECT MAX(scraped_at) AS scraped_at
FROM keyword_serp_scrapes
WHERE keyword = $1
```
Si `scraped_at` IS NULL → `{ exists: false, scrapedAt: null }`. Sinon → `{ exists: true, scrapedAt: <ISO string> }`. Pas de `LIMIT 1` (MAX agrège déjà).

**Réponse HTTP** : 200 OK toujours, format `{ data: { exists, scrapedAt } }` (cohérent avec le wrapper API).

**Validation** : keyword décodé via `decodeURIComponent`, trim, `keyword.length >= 2 && length <= 200`. 400 si invalide. Pas de Zod — keep simple.

**Garanties** :
- Aucun chargement de `text_content` ni `headings` (lecture indexée sur `keyword`).
- Aucun appel externe DataForSEO.
- Pas de cache TTL (la requête est déjà sous 1 ms).

**Test** : `tests/integration/keywords-serp-exists.test.ts` couvre : keyword scrapé → exists:true ; keyword inconnu → exists:false ; bad request 400. (AC.LEX-PRECHECK.1, .2)

### 3.2 Composable `useSerpExistsCheck`

**Localisation** : `src/composables/lexique/useSerpExistsCheck.ts`.

```ts
export function useSerpExistsCheck(keyword: Ref<string | null>) {
  const exists = ref<boolean | null>(null)  // null = pas encore checké
  const scrapedAt = ref<string | null>(null)
  const isChecking = ref(false)
  const error = ref<string | null>(null)

  async function refetch() {
    const kw = keyword.value?.trim()
    if (!kw) return
    isChecking.value = true
    try {
      const { exists: e, scrapedAt: s } = await apiGet<{ exists: boolean; scrapedAt: string | null }>(
        `/keywords/${encodeURIComponent(kw)}/serp/exists`,
      )
      exists.value = e
      scrapedAt.value = s
    } catch (err) { error.value = (err as Error).message }
    finally { isChecking.value = false }
  }

  watch(keyword, refetch, { immediate: true })
  return { exists, scrapedAt, isChecking, error, refetch }
}
```

**Header AUTHORITY** :
```ts
/**
 * AUTHORITY: PostgreSQL `keyword_serp_scrapes` (lecture seule).
 * READS FROM: GET /api/keywords/:keyword/serp/exists.
 * WRITES TO: rien.
 * CONSUMERS: LexiquePanel.vue (mount → décide CTA "Lancer SERP" vs "Extraire").
 * RELATED FR: FR-LEX-PRECHECK-SERP.
 */
```

### 3.3 Composable `useLexiqueExplorations` (LECTURE)

**Localisation** : `src/composables/lexique/useLexiqueExplorations.ts`.

**Surface API** :
```ts
function useLexiqueExplorations(input: {
  articleId: Ref<number | undefined>
  captainKeyword: Ref<string | null>
}): {
  pastExplorations: Ref<LexiqueExplorationEntry[]>
  activeSourceKeyword: Ref<string>
  tfidfResult: Ref<TfidfResult | null>
  iaRecommendations: Ref<Map<string, LexiqueTermRecommendation>>
  hydrateFromDb: () => Promise<void>
  mergeFromDb: () => Promise<void>
  selectExploration: (sourceKeyword: string) => void
  addExploration: (entry: LexiqueExplorationEntry) => void  // appelé après extractCustomKeyword OK
  reset: () => void  // appelé sur switch d'article
}
```

**Garanties (testées)** :
- Aucun appel `apiPut` / `apiPost` vers `/articles/:id/keywords`. → AC.LEX-SEP.1
- Aucun import de `articleKeywordsStore` (sauf typing).
- `selectExploration(sourceKeyword)` lit `pastExplorations.value`, ne fetch pas.

### 3.4 Composable `useLexiqueLocking` (VERROUILLAGE)

**Localisation** : `src/composables/lexique/useLexiqueLocking.ts`.

**Surface API** :
```ts
function useLexiqueLocking(input: {
  articleId: Ref<number | undefined>
}): {
  selectedTerms: Ref<Set<string>>          // proxy lecture du store.lexique
  lockedTerms: ComputedRef<string[]>       // alias store.lexique
  isLocked: ComputedRef<boolean>           // lockedTerms.length > 0
  toggleTerm: (term: string) => void       // mute store + saveDecisions
  syncFromTfidf: (initialSelection: Set<string>) => void  // pré-cocher obligatoires au mount d'une exploration
}
```

**Garanties (testées)** :
- Aucun appel `apiGet` vers `/articles/:id/explorations`. → AC.LEX-SEP.2
- Aucune lecture de `lexique_explorations` (DB ou cache).

### 3.5 Composant partagé `<TabBar>`

**Localisation** : `src/components/shared/TabBar.vue`.

**API** :
```ts
defineProps<{
  tabs: { id: string; label: string; disabled?: boolean }[]
  activeId: string
  ariaLabel?: string
}>()
defineEmits<{ (e: 'update:activeId', id: string): void }>()
```

**Pattern interne** :
- `role="tablist"`, chaque button `role="tab"`, `aria-selected`, `aria-controls="<panelId>"`.
- Bouton actif : classe `tab--active`. Hover/focus styles cohérents avec le design Moteur (var CSS `--color-primary`).
- Pas de logique métier (pure UI).

**Test** : `tests/unit/components/TabBar.test.ts` (smoke + clic émet `update:activeId`).

**Réutilisable** : conçu pour être consommable par SeoPanel/GeoPanel plus tard (migration hors scope chantier 3).

### 3.6 Refacto `LexiquePanel.vue`

**Surface inchangée** (props, emits, parent MoteurView) : aucune cassure de contrat externe.

**Interne** :
- Remplace les imports/refs/fonctions LECTURE par `useLexiqueExplorations(...)`.
- Remplace `toggleTerm` + `selectedTerms` par `useLexiqueLocking(...)`.
- Remplace `LexiqueMultiKeywordPanel` par `<TabBar>` + onglet « + Tester » (champ libre intégré au panel actif).
- Conserve : header AUTHORITY (à enrichir des FR cibles), watcher `isLocked` reconciliation, watcher reset article, watcher autoextract.

### 3.7 Refacto `LexiqueMultiKeywordPanel.vue`

**Décision** : composant **conservé** pour le contenu de l'onglet « + Tester un mot-clé » (input + bouton). On retire **uniquement** la liste de chips `past-explorations` (déplacée vers `<TabBar>`). Renommage proposé : `LexiqueCustomKeywordInput.vue` (clarifie le rôle).

---

## 4. Mapping FR ↔ ACs ↔ tests

| FR | AC | Type test | Localisation test |
|----|----|-----------|-------------------|
| FR-LEX-PRECHECK-SERP | AC.LEX-PRECHECK.1 — endpoint répond `{exists:false}` 200 OK | Integration (Vitest + supertest) | `tests/integration/keywords-serp-exists.test.ts` |
| FR-LEX-PRECHECK-SERP | AC.LEX-PRECHECK.2 — endpoint répond `{exists:true,scrapedAt}` | Integration | idem |
| FR-LEX-PRECHECK-SERP | AC.LEX-PRECHECK.3 — au mount LexiquePanel, GET appelé une fois ; CTA conditionnel | Unit composant (Vue Test Utils + msw) | `tests/unit/components/moteur/LexiquePanel.precheck.test.ts` |
| FR-LEX-PRECHECK-SERP | AC.LEX-PRECHECK.4 — clic CTA déclenche scrape via `lexique-analysis` après modale | Unit composant | idem |
| FR-LEX-PRECHECK-SERP | AC.LEX-PRECHECK.5 — pas d'appel direct POST `/serp/tfidf` aboutissant à 404 | Unit composant (mock count) | idem |
| FR-LEX-MULTI-KEYWORD-TABS | AC.LEX-TABS.1 — 3 explorations → 3 onglets + 1 « + Tester » | Unit composant | `tests/unit/components/moteur/LexiquePanel.tabs.test.ts` |
| FR-LEX-MULTI-KEYWORD-TABS | AC.LEX-TABS.2 — clic onglet ne refetch pas DB | Unit composant (apiGet mock count) | idem |
| FR-LEX-MULTI-KEYWORD-TABS | AC.LEX-TABS.3 — extraction ajoute nouvel onglet + sélection | Unit composant | idem |
| FR-LEX-MULTI-KEYWORD-TABS | AC.LEX-TABS.4 — 0 exploration → seul onglet « + Tester » | Unit composant | idem |
| FR-LEX-MULTI-KEYWORD-TABS | AC.LEX-TABS.5 — grep architectural import composant Tab partagé | Architecture (grep) | `tests/unit/architecture/lexique-tabbar.test.ts` |
| FR-LEX-LECTURE-VS-VERROUILLAGE | AC.LEX-SEP.1 — fonctions LECTURE → 0 PUT `/articles/:id/keywords` | Unit composable + mock count | `tests/unit/composables/lexique/useLexiqueExplorations.test.ts` |
| FR-LEX-LECTURE-VS-VERROUILLAGE | AC.LEX-SEP.2 — fonctions VERROUILLAGE → 0 GET `/articles/:id/explorations` | Unit composable + mock count | `tests/unit/composables/lexique/useLexiqueLocking.test.ts` |
| FR-LEX-LECTURE-VS-VERROUILLAGE | AC.LEX-SEP.3 — grep architectural croisé | Architecture (grep) | `tests/unit/architecture/lexique-separation.test.ts` |
| FR-LEX-LECTURE-VS-VERROUILLAGE | AC.LEX-SEP.4 — watcher `isLocked` reste hors des deux familles | Unit composant (lecture du fichier) | `tests/unit/architecture/lexique-watcher-isolated.test.ts` |

**Total** : 14 ACs traçables, 4 fichiers de test architectural, 5 fichiers de test fonctionnel.

---

## 5. Epics

### Epic E1 — Endpoint pré-check SERP (1 jour, 3 stories)
**Objectif** : éliminer les 404 console au mount Lexique en exposant un endpoint léger qui répond `{exists, scrapedAt}` 200 OK toujours.
**Sortie** : route `GET /api/keywords/:keyword/serp/exists` + composable `useSerpExistsCheck` + UI conditionnelle dans LexiquePanel (CTA « Lancer SERP » avec modale).

### Epic E2 — Système d'onglets multi-keyword (1.5 jour, 3 stories)
**Objectif** : remplacer les chips collapsibles actuelles par un système d'onglets standardisé (1 onglet par `source_keyword` + 1 onglet « + Tester »).
**Sortie** : composant partagé `<TabBar>` + intégration LexiquePanel + renommage `LexiqueMultiKeywordPanel → LexiqueCustomKeywordInput`.

### Epic E3 — Séparation lecture/verrouillage (1 jour, 3 stories)
**Objectif** : extraire 2 composables strictement séparés (`useLexiqueExplorations` LECTURE, `useLexiqueLocking` VERROUILLAGE) et imposer la discipline via tests architecturaux.
**Sortie** : 2 composables livrés + LexiquePanel refactoré + 4 tests architecturaux verts.

---

## 6. Stories détaillées

### Epic E1 — Endpoint pré-check SERP

#### Story E1-S1 — Service `hasSerpScrape` + endpoint `GET /serp/exists`
**Branche** : `feat/lex-precheck-endpoint`

**Tâches** :
1. Étendre `server/services/keyword/keyword-serp.service.ts` :
   - Ajouter `export async function hasSerpScrape(keyword: string): Promise<{ exists: boolean; scrapedAt: string | null }>` (SQL §3.1).
   - Mettre à jour le header AUTHORITY (READS FROM `keyword_serp_scrapes` confirmé, ajouter cette nouvelle fonction).
2. Étendre `server/routes/keywords.routes.ts` :
   - Ajouter handler `router.get('/keywords/:keyword/serp/exists', ...)` après les routes audit.
   - Validation : `decodeURIComponent`, trim, `2 <= length <= 200` sinon 400.
   - Délégation à `hasSerpScrape`.
   - Format `{ data: { exists, scrapedAt } }`.
3. Tests intégration `tests/integration/keywords-serp-exists.test.ts` :
   - **Red 1** — keyword scrapé en seed → `exists:true` + `scrapedAt` ISO string non-null.
   - **Red 2** — keyword inexistant → `exists:false`, `scrapedAt:null`, status 200 (jamais 404).
   - **Red 3** — keyword vide / trop long → 400.

**ACs couverts** : AC.LEX-PRECHECK.1, AC.LEX-PRECHECK.2.

**DoD** :
- [ ] 3 tests verts.
- [ ] `npm run lint` + `npm run type-check` verts.
- [ ] Header AUTHORITY mis à jour.

---

#### Story E1-S2 — Composable `useSerpExistsCheck`
**Branche** : continue `feat/lex-precheck-endpoint`

**Tâches** :
1. Créer `src/composables/lexique/useSerpExistsCheck.ts` (§3.2).
2. Header AUTHORITY (FR-LEX-PRECHECK-SERP).
3. Tests `tests/unit/composables/lexique/useSerpExistsCheck.test.ts` :
   - **Red 1** — keyword null → exists reste null, pas d'appel.
   - **Red 2** — keyword set → 1 GET émis vers `/keywords/<encoded>/serp/exists`, exists hydraté.
   - **Red 3** — keyword change → refetch déclenché.

**ACs couverts** : préparation AC.LEX-PRECHECK.3.

**DoD** :
- [ ] 3 tests verts.
- [ ] Aucun appel DB / fetch direct (uniquement `apiGet`).

---

#### Story E1-S3 — Intégration UI : CTA conditionnel + modale confirmation
**Branche** : continue `feat/lex-precheck-endpoint`

**Tâches** :
1. Dans `LexiquePanel.vue` :
   - Au mount, déclencher `useSerpExistsCheck(captainKeyword)`.
   - Si `exists.value === false` → afficher message *« Le scrape SERP n'est pas encore disponible pour ce mot-clé »* + bouton CTA `« Lancer l'analyse SERP (~$0.003 DataForSEO) »`.
   - Bouton CTA → ouvre modale (composant `<ConfirmModal>` existant ou nouveau lightweight) — message *« Lancer l'analyse SERP DataForSEO ? Coût ≈ $0.003 »* + boutons Annuler / Confirmer.
   - Confirmation → appelle `apiPost('/serp/tfidf', { keyword, articleId, triggerScrapeIfMissing: true })` (le service `lexique-analysis.service` honore déjà `triggerScrapeIfMissing` per AC.LEX-SCRAPE.3 chantier 2).
   - Une fois le scrape OK → `useSerpExistsCheck.refetch()` → `exists=true` → bouton « Extraire » devient visible.
2. Supprimer le bouton « Extraire » s'il s'affiche quand `exists=false` (gating UX).
3. Tests `tests/unit/components/moteur/LexiquePanel.precheck.test.ts` :
   - **Red 1** — mount avec exists=false → message + CTA visible, bouton « Extraire » absent.
   - **Red 2** — mount avec exists=true → bouton « Extraire » visible immédiatement.
   - **Red 3** — clic CTA → modale visible → confirm → POST `/serp/tfidf` appelé avec `triggerScrapeIfMissing:true` → 1 seul appel.
   - **Red 4** — comptabiliser appels `apiPost('/serp/tfidf')` quand `exists=false` SANS clic CTA → 0 appel (anti-404).

**ACs couverts** : AC.LEX-PRECHECK.3, AC.LEX-PRECHECK.4, AC.LEX-PRECHECK.5.

**DoD** :
- [ ] 4 tests verts.
- [ ] Smoke test browser (`npm run test:browser`) sur l'onglet Lexique avec keyword non-scrapé → aucune trace 404 dans la console réseau.
- [ ] Mise à jour header AUTHORITY de `LexiquePanel.vue` (ajout FR-LEX-PRECHECK-SERP).
- [ ] PRD : passer `FR-LEX-PRECHECK-SERP` de `proposed` à `active`.

---

### Epic E2 — Système d'onglets multi-keyword

#### Story E2-S1 — Composant partagé `<TabBar>`
**Branche** : `feat/lex-tabbar`

**Tâches** :
1. Créer `src/components/shared/TabBar.vue` (§3.5).
2. Style cohérent avec SeoPanel/GeoPanel (pas de duplication CSS — variables `--color-primary`, `--color-border`).
3. Tests `tests/unit/components/shared/TabBar.test.ts` :
   - **Red 1** — rendu N tabs → N boutons `role="tab"`.
   - **Red 2** — `activeId` correspond → bouton avec `aria-selected="true"`.
   - **Red 3** — clic sur tab → `update:activeId` émis avec l'id cliqué.
   - **Red 4** — `disabled:true` → bouton non cliquable, click n'émet pas.

**ACs couverts** : préparation AC.LEX-TABS.5.

**DoD** :
- [ ] 4 tests verts.
- [ ] Aucune logique métier (composant pur).
- [ ] Visuel ARIA conforme (audit manuel via DevTools).

---

#### Story E2-S2 — Intégration `<TabBar>` dans LexiquePanel
**Branche** : continue `feat/lex-tabbar`

**Tâches** :
1. Dans `LexiquePanel.vue` :
   - Remplacer le bloc `<LexiqueMultiKeywordPanel>` actuel par :
     - `<TabBar :tabs="lexiqueTabs" :active-id="activeSourceKeyword" @update:active-id="onSelectTab" />`.
   - `lexiqueTabs` computed = `pastExplorations.map(e => ({ id: e.sourceKeyword, label: e.sourceKeyword })) + [{ id: '__custom__', label: '+ Tester un mot-clé' }]`.
   - `onSelectTab(id)` : si `id === '__custom__'` → afficher `LexiqueCustomKeywordInput` ; sinon → `selectExploration(id)`.
   - Quand 0 exploration : `lexiqueTabs` ne contient que l'onglet `__custom__` (label adapté `« Tester un mot-clé »` sans `+`).
2. Renommer `LexiqueMultiKeywordPanel.vue` → `LexiqueCustomKeywordInput.vue` (et adapter import + simplifier — supprimer la liste de chips devenue inutile).
3. Tests `tests/unit/components/moteur/LexiquePanel.tabs.test.ts` :
   - **Red 1** — 3 explorations → 3 onglets + 1 « + Tester » (4 boutons `role="tab"`).
   - **Red 2** — clic onglet → `selectExploration` appelé, `apiGet('/articles/:id/explorations')` count=0 (pas de refetch).
   - **Red 3** — `extractCustomKeyword` réussi → 1 nouvel onglet (4 → 4 if 3 existants + 1 custom devient 4 explor + 1 custom = 5).
   - **Red 4** — 0 exploration → 1 seul onglet (« Tester un mot-clé »).

**ACs couverts** : AC.LEX-TABS.1, AC.LEX-TABS.2, AC.LEX-TABS.3, AC.LEX-TABS.4.

**DoD** :
- [ ] 4 tests verts.
- [ ] Header AUTHORITY de `LexiquePanel.vue` enrichi (FR-LEX-MULTI-KEYWORD-TABS).
- [ ] Aucune transformation du `source_keyword` côté label (cohérence affichage/calcul §2.0).

---

#### Story E2-S3 — Test architectural import TabBar
**Branche** : continue `feat/lex-tabbar`

**Tâches** :
1. Créer `tests/unit/architecture/lexique-tabbar.test.ts` :
   - **Red** — fichier `src/components/moteur/LexiquePanel.vue` contient `import TabBar from '@/components/shared/TabBar.vue'` (regex grep).

**ACs couverts** : AC.LEX-TABS.5.

**DoD** :
- [ ] Test vert.
- [ ] PRD : passer `FR-LEX-MULTI-KEYWORD-TABS` de `proposed` à `active`.

---

### Epic E3 — Séparation lecture/verrouillage

#### Story E3-S1 — Composable `useLexiqueExplorations` (LECTURE)
**Branche** : `feat/lex-separation`

**Tâches** :
1. Créer `src/composables/lexique/useLexiqueExplorations.ts` (§3.3).
2. Header AUTHORITY (FR-LEX-LECTURE-VS-VERROUILLAGE famille LECTURE).
3. Migrer depuis `LexiquePanel.vue` : `pastExplorations`, `activeSourceKeyword`, `tfidfResult`, `iaRecommendations`, `hydrateFromDb`, `mergeFromDb`, `handleSelectPast` (renommé `selectExploration`).
4. Tests `tests/unit/composables/lexique/useLexiqueExplorations.test.ts` :
   - **Red 1** — `hydrateFromDb` → 1 GET `/articles/:id/explorations`, 0 PUT.
   - **Red 2** — `selectExploration(kw)` → 0 GET, 0 PUT, `tfidfResult` muté depuis cache.
   - **Red 3** — `addExploration(entry)` → 0 GET, 0 PUT, push dans pastExplorations.
   - **Red 4** — `mergeFromDb` → 1 GET, fusion sans doublon.
   - **Total mock count PUT `/articles/:id/keywords` = 0**.

**ACs couverts** : AC.LEX-SEP.1.

**DoD** :
- [ ] 4 tests verts.
- [ ] Aucun import de `useArticleKeywordsStore` (sauf typing).

---

#### Story E3-S2 — Composable `useLexiqueLocking` (VERROUILLAGE)
**Branche** : continue `feat/lex-separation`

**Tâches** :
1. Créer `src/composables/lexique/useLexiqueLocking.ts` (§3.4).
2. Header AUTHORITY (famille VERROUILLAGE).
3. Migrer depuis `LexiquePanel.vue` : `selectedTerms`, `toggleTerm`, computed `isLocked`, `selectedCount`, `selectedByLevel`. Le watcher reconciliation reste dans le composant parent.
4. Tests `tests/unit/composables/lexique/useLexiqueLocking.test.ts` :
   - **Red 1** — `toggleTerm('foo')` → 1 PUT `/articles/:id/keywords` (via `saveDecisions`), 0 GET `/explorations`.
   - **Red 2** — `toggleTerm` 3 fois → 3 PUT, 0 GET.
   - **Red 3** — `isLocked` reflète `lexique.length > 0`.

**ACs couverts** : AC.LEX-SEP.2.

**DoD** :
- [ ] 3 tests verts.
- [ ] Aucun import de fonction `hydrateFromDb` ou route `/articles/:id/explorations`.

---

#### Story E3-S3 — Refacto LexiquePanel + tests architecturaux croisés
**Branche** : continue `feat/lex-separation`

**Tâches** :
1. Dans `LexiquePanel.vue` :
   - Importer et utiliser `useLexiqueExplorations(...)` et `useLexiqueLocking(...)`.
   - Supprimer toutes les variables et fonctions migrées (laisser uniquement orchestration : watchers `isCaptaineLocked`, `selectedArticle.slug` reset, watcher gating `isLocked` pour le check workflow).
   - Header AUTHORITY enrichi : ajouter FR-LEX-LECTURE-VS-VERROUILLAGE.
   - Vérifier que le composant fait < 300 lignes après refacto (cf. CLAUDE.md §3.1).
2. Tests architecturaux :
   - `tests/unit/architecture/lexique-separation.test.ts` :
     - **Red 1** — `useLexiqueExplorations.ts` ne contient PAS `addLexiqueTerm|removeLexiqueTerm|saveDecisions|toggleTerm` (regex grep).
     - **Red 2** — `useLexiqueLocking.ts` ne contient PAS `hydrateFromDb|mergeFromDb|/explorations|pastExplorations` (regex grep).
     - **Red 3** — `useLexiqueExplorations.ts` ne contient pas `apiPut`.
     - **Red 4** — `useLexiqueLocking.ts` ne contient pas `apiGet.*explorations`.
   - `tests/unit/architecture/lexique-watcher-isolated.test.ts` :
     - **Red** — `LexiquePanel.vue` contient bien le watcher `isLocked` mais celui-ci n'est ni dans `useLexiqueExplorations` ni dans `useLexiqueLocking` (assertion sur `LexiquePanel.vue` source).
3. Smoke test browser : vérifier que le tab Lexique fonctionne end-to-end (mount, exists check, extraction, switch onglet, lock/unlock terme, persistance post-reload).

**ACs couverts** : AC.LEX-SEP.3, AC.LEX-SEP.4.

**DoD** :
- [ ] Tous les tests verts (`npm run test:check` — pas de nouveaux rouges).
- [ ] `npm run check:health` vert (lint + type-check + cycles + dead + arch).
- [ ] LexiquePanel.vue < 300 lignes.
- [ ] PRD : passer `FR-LEX-LECTURE-VS-VERROUILLAGE` de `proposed` à `active`.

---

## 7. Sprint plan

**Nom** : `sprint-chantier-3-ux-lexique`
**Durée estimée** : 3 jours dev solo
**Pré-requis** : chantiers 1 et 2 done (✅ confirmé 2026-05-09).

### Ordonnancement (dépendances)

```
Day 1 — Epic E1 (pré-check)
  E1-S1 (endpoint backend)        → 0.5 j  [aucune dépendance]
  E1-S2 (composable)              → 0.25 j [dépend E1-S1 contrat seulement]
  E1-S3 (UI + modale)             → 0.5 j  [dépend E1-S2]
  ↓
Day 2 — Epic E2 (onglets)
  E2-S1 (TabBar partagé)          → 0.5 j  [aucune dépendance]
  E2-S2 (intégration LexiquePanel) → 0.5 j [dépend E2-S1]
  E2-S3 (test archi import)       → 0.1 j  [dépend E2-S2]
  ↓
Day 3 — Epic E3 (séparation)
  E3-S1 (useLexiqueExplorations)  → 0.4 j  [aucune dépendance code, mais conceptuel après E2]
  E3-S2 (useLexiqueLocking)       → 0.3 j  [aucune dépendance]
  E3-S3 (refacto + tests archi)   → 0.5 j  [dépend E3-S1 + E3-S2]
```

**Justification ordre Epic** :
1. **E1 first** : pré-check est la valeur utilisateur la plus haute (élimine 404 console immédiate). Indépendant du reste.
2. **E2 second** : la refacto onglets impacte le template ; ça facilite E3 si la nouvelle structure est posée.
3. **E3 last** : la séparation est un nettoyage de fond ; elle s'appuie sur le template stabilisé en E2 (sinon merge conflict probable).

### Stratégie branch / merge

- **3 branches feat séparées** (une par Epic), mergées vers main séquentiellement.
- Pré-merge de chaque branche : `npm run check:health` + `npm run test:check` verts.
- Hygiène CLAUDE.md §11.2 respectée : `git branch --merged main` ne doit lister que `main` après le sprint.

### Risques et mitigations

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Tests existants `LexiquePanel.test.ts` cassent à cause de la refacto | Moyenne | E3-S3 inclut leur mise à jour ; baseline `npm run test:check` détecte tout nouveau rouge |
| Onglets cassent UX si > 5 explorations (overflow) | Faible (DB live max 2) | Flex-wrap basique suffit ; revoir si besoin futur |
| Le `<ConfirmModal>` n'existe pas → coût additionnel | À vérifier | Si absent, créer un mini composant local dans E1-S3 (50 lignes) |
| Chantier 2 `triggerScrapeIfMissing` non honoré côté backend | Faible (testé en chantier 2) | E1-S3 inclut un test browser qui valide le flow complet |

### Definition of Sprint Done

- [ ] 9 stories en status `done` dans sprint-status.yaml.
- [ ] 3 FRs (`FR-LEX-PRECHECK-SERP`, `FR-LEX-MULTI-KEYWORD-TABS`, `FR-LEX-LECTURE-VS-VERROUILLAGE`) passés `proposed` → `active` dans le PRD.
- [ ] 14/14 ACs avec test associé vert.
- [ ] `LexiquePanel.vue` < 300 lignes.
- [ ] Aucune trace 404 dans la console au mount Lexique avec keyword non-scrapé.
- [ ] Tech-spec final archivé dans `_bmad-output/planning-artifacts/_archive/`.
- [ ] Branches feat supprimées (locales + origin).

---

## 8. Items hors scope (à NE PAS faire dans ce chantier)

- ❌ Refonte schéma DB (chantier 1 livré).
- ❌ Découplage services backend (chantier 2 livré).
- ❌ Enrichissement Lexique avec PAA (FR-LEX-PAA-ENRICHMENT — non actée).
- ❌ Migration `SeoPanel` / `GeoPanel` vers `<TabBar>` (bonus future, hors scope).
- ❌ Suppression de `POST /api/serp/tfidf` (compat conservée par AC.LEX-SCRAPE.5 chantier 2).
- ❌ Modification de `useLexiqueIa` (composable IA upfront, indépendant).

---

## 9. Documents impactés en clôture

| Document | Action |
|----------|--------|
| `_bmad-output/planning-artifacts/prd.md` | Passer 3 FRs `proposed` → `active` (sections 8.8.bis ou équivalent), bumper `last_updated` |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Ajouter `sprint-chantier-3-ux-lexique: done` avec résumé 11 lignes |
| `docs/data-flows/article-keywords.md` (si existe) | Mettre à jour si la donnée `lexique` a une carto dédiée |
| `docs/ARCHITECTURE_FLOWS.md` | Aucun nouveau flux Mermaid (le flux Lexique existe ; ajouter une note pré-check) |
| `_bmad-output/planning-artifacts/plan-chantier-3-ux-lexique.md` (ce fichier) | Déplacer dans `_archive/` avec bandeau ARCHIVED + bumper version 1.0.0 → 1.1.0 si retours |

---

**Fin du plan — prêt pour exécution séquentielle des 9 stories.**
