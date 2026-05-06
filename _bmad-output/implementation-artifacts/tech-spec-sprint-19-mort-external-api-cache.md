---
name: Sprint 19 — Mort de external_api_cache — REPORTÉ
version: 1.0.0
last_updated: 2026-05-06
status: deferred
branch: futur (sprint dédié)
---

# Tech-Spec — Sprint 19 : Mort de `external_api_cache` — REPORTÉ

## Statut : REPORTÉ

Décision prise lors du démarrage du sprint : le rayon réel de la table est plus
important que l'estimation initiale (Sprint 16 estimait 2 cache_types actifs ;
la cartographie révèle **6+ cache_types**).

## Cartographie réelle (2026-05-06)

Cache_types **réellement écrits** par le code actuel :

| cache_type | Service | TTL | Volume |
|-----------|---------|-----|--------|
| `dataforseo` | `external/dataforseo/cache.ts` | 7 jours | KPIs DataForSEO bruts |
| `gsc` | `external/gsc.service.ts` | 24h | Search Console performance |
| `radar` | `infra/radar-cache.service.ts` | 30 jours | Radar scans |
| `long-tail-suggest` | `keyword/long-tail-suggest.service.ts` | 7 jours | Suggestions IA longue-traîne |
| `suggest` | `keyword/suggest.service.ts` | 7 jours | 4 sub-keys (alphabet/questions/intents/prepositions) |
| `keyword-discovery` | `keyword/keyword-discovery.service.ts` | DISCOVERY_TTL | Découvertes par seed/domain |
| `intent` (variable) | `intent/intent.service.ts` | YEAR_MS | Intent SERP par keyword |
| `community-discussions` | `intent/community-discussions.service.ts` | variable | Signaux Reddit/forums |
| `validate` | `keyword/keyword-metrics.service.ts` | 7 jours (? à vérifier) | Validations Capitaine |
| `autocomplete` | `routes/article-explorations.routes.ts` | variable | Google autocomplete |

**Total estimé** : 10+ types actifs (vs 2 estimés initialement).

## Pourquoi reporter

1. **Rayon élevé** : 8+ services à découper, 8+ tables à créer (ou patterns
   alternatifs à décider), 8+ migrations DB.
2. **Décision produit nécessaire** : faut-il vraiment dropper la table, ou
   la garder comme **cache générique réutilisable** ? Si on la garde, le
   nettoyage est juste cosmétique.
3. **Sprint 16** a déjà fait l'essentiel : renommé `api_cache` →
   `external_api_cache` pour clarifier le rôle. Le nom actuel signale
   bien "cache d'appels externes transitoire".
4. **Pas de bénéfice utilisateur** : aucun impact UI, juste tech debt.
5. **Le coût/bénéfice ne justifie pas l'effort** vu les 6 sprints lourds
   déjà livrés (10.5 → 18) sur cette branche.

## Plan futur recommandé

Quand sprint dédié sera lancé :

### Phase 0 — Décision produit (à confirmer avec utilisateur)
- Veut-on **vraiment** dropper la table, ou la garder comme cache générique ?
- Argument pour drop : 1 table par cas d'usage = schéma plus typé,
  contraintes uniques par type, query plans optimisés.
- Argument contre : génère 10+ tables presque-vides, complexité maintenance.

### Phase A — Si on garde la table : nettoyage cosmétique seulement
- Documentation à jour de FR-INFRA-EXTERNAL-API-CACHE listant les types réels
- Validation tests : aucun cache_type orphelin (DELETE ne devrait jamais avoir
  de match parmi paa/serp/discovery/intent/local-seo/content-gap/lexique
  hérités)

### Phase B — Si on drop la table : migration progressive
- Sub-vague 1 : `dataforseo` → `keyword_metrics` (déjà partiellement le cas)
- Sub-vague 2 : `radar` → `radar_explorations` (déjà migré pour scan_result, le cache
  brut peut suivre)
- Sub-vague 3 : `gsc` → table `gsc_performance_cache` dédiée
- Sub-vague 4 : `suggest` + `keyword-discovery` + `long-tail-suggest` →
  table `keyword_search_cache` mutualisée (mêmes clés, TTL similaires)
- Sub-vague 5 : `intent` + `community-discussions` → table `intent_cache`
- Sub-vague 6 : `validate` + `autocomplete` → migration finale, puis
  `DROP TABLE external_api_cache`

Effort estimé : 2-3 sprints dédiés.

## Pourquoi pas maintenant

L'utilisateur a explicitement validé la priorisation : **finir les chantiers
courants avant d'attaquer les vrais bugs comportementaux**. La mort de la
table est un chantier tech debt, pas un bug. Bénéfice modeste vs risque élevé.

**Statut :** deferred. **Date décision :** 2026-05-06. **Source :** discussion Sprint 18.
