---
name: local
description: La dimension locale — zone du client (theme_config.data.avatar.location) et repères de cette zone (local_entities), injectés dans les consignes, la recherche web et la porte de structure ; plus les restes, lus mais plus écrits, de l'ancienne analyse Google Maps et de la comparaison locale / nationale.
type: "zone : string (« Toulouse, Occitanie ») ; ville = premier segment avant la virgule ; repères : texte groupé (region, quartier, lieu) tiré de local_entities ; restes : keyword_metrics.local_analysis / local_comparison JSONB"
last_updated: 2026-09-28
related_fr: [FR-CER-THEME-CONFIG, FR-INFRA-PROMPT-LAYERS, FR-INFRA-LOCAL-ENTITIES, FR-HN-LOCK-GATE, FR-RED-ENRICH-SOURCES, FR-RED-CONTEXTUAL-ACTIONS, FR-EXP-CONTENT-GAP, FR-EXP-MAPS, FR-EXP-LOCAL-COMPARE]
---

# Data Flow — local

> **En clair :** le client travaille dans une zone (exemple : « Toulouse, Occitanie »). Cette zone sert à écrire local sans rien mettre en dur dans les consignes : l'IA sait où est le client, cite des quartiers réels de la zone, cherche des sources près de chez lui, et la porte de la structure vérifie qu'on ne répète pas la ville dans tous les titres. Une zone vide ne casse rien : chaque consommateur fait alors comme s'il n'y avait pas de dimension locale.
>
> **Type/format :** `zone` = `theme_config.data.avatar.location`, sans espaces autour. La **ville** est le premier segment avant la virgule (`zone.split(',')[0]`). Les **repères** sont un texte de trois lignes au plus : « Autres noms de la zone : … », « Quartiers et communes : … », « Lieux connus : … ».
>
> **Chapitres :** [Cerveau](../11-cerveau.md) (« Configuration du thème »), [Infrastructure transversale](../20-infrastructure.md) (« Chargeur de prompts et couches de contexte », « Persistance du travail », ligne « Lieux locaux »), [Rédaction](../17-redaction.md) (passes Sources et actions qui cherchent sur le web ; « Analyse d'écart de contenu »), [Lieutenants, Structure, Lexique](../15-lieutenants-structure-lexique.md) (porte `hn-lock`).

## Producteurs

- **La zone.** [`ThemeConfigView.vue`](../../src/views/ThemeConfigView.vue) : champ lié à `store.config.avatar.location`, enregistré par `debouncedSave` (1 500 ms) → `PUT /api/theme/config` → `saveThemeConfig` ([`server/services/strategy/theme-config.service.ts`](../../server/services/strategy/theme-config.service.ts), ligne unique `id = 1`). `POST /api/theme/config/parse` peut la remplir depuis un texte libre (IA).
- **Les repères.** Table `local_entities(id, name, type, aliases TEXT[], region)`, `type` parmi `quartier`, `entreprise`, `lieu`, `region` ([`shared/types/local.types.ts`](../../shared/types/local.types.ts)). **Aucun écrivain dans l'application** : elle se charge hors de l'outil (sauvegarde, jeu de données).
- **Le calcul.** `loadZoneContext()` ([`server/services/strategy/prompt-context.service.ts`](../../server/services/strategy/prompt-context.service.ts)) relit à chaque appel `getThemeConfig` et `getEntities` ([`local-entities.service.ts`](../../server/services/infra/local-entities.service.ts)) :
  - `entitiesOfZone` garde une entité rattachée à une région (`region`) seulement si la zone nomme cette région ; les entités sans `region` forment le référentiel par défaut, gardé seulement si la zone nomme l'une de ses entités `region` (comparaison `normPlace` : minuscules, sans accents ni ponctuation). Sinon, aucun repère : mieux vaut aucun exemple local qu'un quartier d'une autre ville ;
  - `LANDMARK_GROUPS` : `region`, `quartier`, `lieu` ; les entreprises ne sont jamais proposées ;
  - base illisible → zone et repères vides, `log.warn`.

## Persistance

| Donnée | Où | Remarque |
|---|---|---|
| Zone | `theme_config.data` (JSONB, `avatar.location`) | Singleton, sans versionnage : le dernier enregistrement l'emporte |
| Repères | `local_entities` | Lecture seule pour l'application |
| Copie écran | `useThemeConfigStore` ([`theme-config.store.ts`](../../src/stores/strategy/theme-config.store.ts)) | Le Cerveau et le micro-contexte envoient **cette copie**, pas la base |
| Zone calculée | aucune | `loadZoneContext` n'a pas de cache |

## Consommateurs

### Affichage (UI)

- Seulement l'écran de configuration du thème. Aucune autre vue n'affiche la zone ni les repères.

### Calcul / tri / filtre / agrégat

| Consommateur | Reçoit | Effet |
|---|---|---|
| `loadPrompt` (globales `{{zone}}`, `{{zone_landmarks}}`, calculées seulement si le `.md` les cite) | zone, repères | [`system-propulsite.md`](../../server/prompts/system-propulsite.md) (identité et consigne « SEO local », prompt système du premier jet, des passes, des actions, de la méta, de la réduction, de l'humanisation et des candidats), [`enrich-sources.md`](../../server/prompts/enrich-sources.md), [`enrich-exemples.md`](../../server/prompts/enrich-exemples.md) ; sections `{{#zone}}…{{/zone}}` retirées si la zone est vide |
| `webSearchTool(zone)` ([`claude.service.ts`](../../server/services/external/claude.service.ts)) | ville | `user_location` de la recherche web (FR, Europe/Paris, ville) : passe Sources ([`enrichment.service.ts`](../../server/services/article/enrichment.service.ts)), actions `sources-chiffrees` et `exemples-reels` ([`action.routes.ts`](../../server/routes/generate/action.routes.ts)) |
| Porte `hn-lock` (`hnGate`, [`gate.service.ts`](../../server/services/gates/gate.service.ts) → `verifyStructure`, [`shared/verifiers/structure.ts`](../../shared/verifiers/structure.ts)) | ville | 🔴 `hn-local-overuse` si plus de `localH2Max` H2 citent la ville (pilier 2, intermédiaire et spécialisé 0, [`article-type-rules.ts`](../../shared/constants/article-type-rules.ts)) ; la ville entre dans l'empreinte de la porte |
| `{{type_rules}}` (`describeTypeRules`) | — | Rappelle la même limite `localH2Max` à l'IA (« SEO local : … ») : la consigne et la porte lisent la même constante |
| Analyse d'écart de contenu ([`content-gap.service.ts`](../../server/services/article/content-gap.service.ts)) | zone | Portée « de la zone … » dans la demande à l'IA ; entités locales relevées chez les concurrents |
| Prompts du Cerveau (`BrainPhase.buildThemeContext` → `buildThemeContextBlock`, « Lieu : … ») et micro-contexte suggéré | copie du store | La zone telle qu'affichée à l'écran au moment du geste |

## Règles de cohérence

- **Une seule source de zone.** Toute consigne, la recherche web et la porte lisent `loadZoneContext()` ; aucun lieu n'est écrit dans un `.md` (FR-INFRA-PROMPT-LAYERS). Seuls le Cerveau et le micro-contexte passent par la copie du store.
- **Une seule ville.** La porte `hn-lock` et la recherche web tirent la ville de la même façon (premier segment avant la virgule).
- **Une seule limite par niveau.** `localH2Max` nourrit à la fois la consigne (`{{type_rules}}`) et la porte : l'IA ne peut pas recevoir une règle que la porte contredit.
- **Zone vide = pas de local**, jamais une région par défaut.

## Cas d'usage à risque

| Cas | Risque |
|---|---|
| **Zone vide** | Aucune ville dans la recherche web, aucun contrôle `hn-local-overuse`, sections `{{#zone}}` retirées. Voulu. |
| **Zone sans région connue du référentiel** | Aucun repère : l'IA n'a que le nom de la zone. |
| **Zone changée après des validations de structure** | L'empreinte de `hn-lock` change : une dérogation `hn-local-overuse` tombe et l'alerte revient à la publication (qui rejoue la porte). |
| **Zone saisie « Occitanie, Toulouse »** | La ville retenue est « Occitanie » : l'ordre de saisie compte. |
| **Cerveau ouvert pendant un changement de zone ailleurs** | Les prompts du Cerveau reçoivent l'ancienne zone (copie du store) ; les autres consignes, la nouvelle. |

## Restes de l'ancienne analyse locale (Maps, local / national)

Exigences **FR-EXP-MAPS** et **FR-EXP-LOCAL-COMPARE** : retirées (statut « deprecated »). Les routes d'écriture (`/api/local/maps`, `/api/keywords/compare-local`) et leurs écrans n'existent plus. Ce qui reste :

- **En base** : `keyword_metrics.local_analysis` et `local_comparison` (JSONB). `upsertKeywordLocalAnalysis` et `upsertKeywordLocalComparison` ([`keyword-metrics.service.ts`](../../server/services/keyword/keyword-metrics.service.ts)) **n'ont aucun appelant** : les lignes existantes ne changent plus.
- **Lus encore** : le groupe `local` de `GET /api/articles/:id/explorations` et son compteur dans `/explorations/counts` ([`article-explorations.routes.ts`](../../server/routes/article-explorations.routes.ts)) — compteur que `buildTabCacheEntries` n'affiche pas ; `GET /api/keywords/:keyword/local-for-article/:articleId` ([`keyword-queries.routes.ts`](../../server/routes/keyword-queries.routes.ts)), sans appelant à l'écran.
- **À l'écran** : [`useArticleResults`](../../src/composables/editor/useArticleResults.ts) recopie le groupe `local` dans [`useLocalStore.mapsData`](../../src/stores/external/local.store.ts) et cherche un champ `comparison` pour `useIntentStore.comparisonData` ; aucun composant actif ne lit l'un ou l'autre. `useIntentStore.localComparisons` n'est jamais rempli ; seul `KeywordAuditTable.vue`, que rien ne monte, le lit. [`useOpportunityScore`](../../src/composables/keyword/useOpportunityScore.ts) n'est appelé que par ses tests, et y remplace un `opportunityIndex` absent par 0.

Tant que ces restes existent, ils ne doivent pas être pris pour une donnée vivante : ne rien y brancher sans rétablir un producteur et une exigence.

## Tests de cohérence

- [`tests/unit/coherence/prompts-no-hardcoded.test.ts`](../../tests/unit/coherence/prompts-no-hardcoded.test.ts) — aucune année ni aucun lieu dans les prompts ; un client à Bordeaux : l'identité parle de Bordeaux, jamais de Toulouse ; l'ancien exemple toulousain a disparu du prompt de structure ; le prompt en ligne de l'analyse d'écart ne cite pas de région.
- [`tests/unit/coherence/local.test.ts`](../../tests/unit/coherence/local.test.ts) — **ne garde rien** : il recopie dans le test les anciennes formules (`opportunityIndex`, écart d'avis) sans importer le code, qui n'existe plus.
- Hors du dossier `coherence/` : [`prompt-context.service.test.ts`](../../tests/unit/services/prompt-context.service.test.ts) (repères du référentiel sans les entreprises, zone reconnue par un alias, aucun repère pour une autre ville ou sans zone, entité rattachée à une région), [`verifiers-structure.test.ts`](../../tests/unit/shared/verifiers-structure.test.ts) (`hn-local-overuse`).
- À écrire : `local.test.ts` réécrit sur `loadZoneContext` et `webSearchTool` (même ville pour la porte et la recherche web).

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
