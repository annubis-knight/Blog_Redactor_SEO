# Scripts archivés

Scripts one-shot exécutés une fois lors de migrations historiques, conservés
pour traçabilité.

## `seed-migration-json-to-pg-2026-04.ts`

**Origine** : ancien `server/db/seed.ts` (avril 2026).

**Rôle d'origine** : peuplait la base PostgreSQL à partir des fichiers JSON
legacy (`data/BDD_Articles_Blog.json`, `data/BDD_Mots_Clefs_SEO.json`,
`data/article-keywords.json`, `data/strategies/*.json`, etc.) lors de la
migration depuis l'ancien backend file-based.

**Pourquoi archivé** : la migration est terminée, les fichiers JSON sources
sont eux-mêmes archivés dans `data/_archive/`. Le script ne sera plus relancé
mais documente la transformation JSON → SQL telle qu'elle a été faite.

**Si tu dois le réutiliser** : c'est probablement parce que tu repars d'un
backup historique. Restaure les JSON dans `data/`, copie ce fichier dans
`server/db/seed.ts`, puis lance :

```bash
npx tsx server/db/seed.ts          # mode insert (pas d'écrasement)
npx tsx server/db/seed.ts --mode=reset  # mode reset (TRUNCATE puis re-seed)
```

## `migrate-keyword-cache-to-explorations-broken.ts`

**Origine** : ancien `scripts/migrate-keyword-cache-to-explorations.ts`
(Sprint 10).

**Rôle d'origine** : devait migrer les entrées `api_cache` legacy
(intent / local-seo / content-gap) vers leurs tables dédiées
(`intent_explorations`, `local_explorations`, `content_gap_explorations`).

**Pourquoi archivé `-broken`** : importe 3 services qui n'ont jamais été
créés (`intent-exploration.service.ts`, `local-exploration.service.ts`,
`content-gap-exploration.service.ts`). Probablement un script préparé en
amont d'un refactor qui n'a finalement pas été fait sous cette forme — les
explorations sont gérées différemment aujourd'hui via `data.service.ts`.
Conservé comme historique mais non exécutable en l'état.
