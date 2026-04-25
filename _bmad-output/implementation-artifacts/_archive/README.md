# _archive/ — Stories, tech-specs et rétrospectives historiques

> ⚠️ **NE PAS UTILISER COMME SOURCE DE VÉRITÉ**

Ce dossier contient 51 artefacts de planification produits entre 2026-03 et 2026-04 :

- **29 stories** (`N-N-*.md`) issues de la décomposition des épics 1 à 10
- **5 rétrospectives** d'épics (`epic-N-retro-*.md`)
- **17 tech-specs** (`tech-spec-*.md`)

Tous ces documents ont été **implémentés** et peuvent diverger de l'état actuel du code.

## Pourquoi archivés

- Les stories ont été écrites avant ou pendant l'implémentation → leurs acceptance criteria peuvent ne plus refléter ce qui a été livré
- Les tech-specs décrivent l'approche initiale → des décisions ont pu évoluer pendant l'implémentation
- Les rétrospectives datent de 2026-03-30 → ne couvrent pas les chantiers livrés depuis (Phase ③ Finalisation, migration PostgreSQL, refactor par domaine)

## Sources de vérité actuelles

Pour connaître l'état réel du projet :

| Sujet | Document |
|-------|----------|
| Vue d'ensemble produit | `_bmad-output/planning-artifacts/prd.md` |
| Architecture globale | `_bmad-output/planning-artifacts/architecture.md` |
| Epics livrés (synthèse) | `_bmad-output/planning-artifacts/epics.md` |
| État sprint | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Diagrammes de flux | `ARCHITECTURE_FLOWS.md` |
| Flux détaillé Moteur | `docs/moteur-data-flow.md` |
| Règles pour Claude Code | `CLAUDE.md` (racine) |

**Source ultime** : le code dans `src/`, `server/`, `shared/`.

## Quand consulter ces archives

- Tracer une décision historique (pourquoi tel choix a été fait)
- Retrouver le contexte d'un commit ancien
- Comprendre l'évolution du produit
- **Jamais** pour écrire du nouveau code ou pour documenter l'état actuel

## Chaque fichier porte un bandeau ARCHIVED

En première ligne : `> ⚠️ **ARCHIVED — HISTORICAL SPEC...**` — si tu le vois, considère le contenu comme potentiellement obsolète.
