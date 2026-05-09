# Migrations archivées

Ces fichiers `.sql` numérotés (`001` → `020`) constituent **l'historique** de
l'évolution du schéma DB. Ils ont été appliqués manuellement dans l'ordre
chronologique pour construire la DB Postgres locale.

## Statut

**Archivés — ne plus utiliser comme source de vérité.**

La source de vérité actuelle pour le schéma DB est :

> `server/db/schema.sql` — snapshot horodaté généré par `npm run db:snapshot`.

## Pourquoi archivé ?

- Les migrations sont append-only : pour comprendre l'état courant, il fallait
  rejouer mentalement 20 fichiers (création → drop → recréation parfois).
- En projet solo local sans CI ni équipe, leur valeur de reproductibilité est
  faible : la DB locale **est** la source de vérité.
- Elles polluaient le contexte IA (lecture de fichiers obsolètes utilisés
  comme spec).

## Quand y revenir ?

- Comprendre **pourquoi** une colonne existe ou a été modifiée :
  `git log` sur le fichier concerné.
- Comprendre une **décision historique** (ex: pourquoi `intent_explorations`
  a été dropée → migration 016).
- Recréer la DB from scratch sur une autre machine : préférer `psql < schema.sql`
  qui est plus simple et représente l'état actuel.
