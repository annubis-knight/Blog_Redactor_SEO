-- Numéro d'article tiré d'une séquence (NFR-INT-ARTICLE-ID-NEVER-REUSED).
-- Jusqu'ici le service calculait « plus grand numéro + 1 » : supprimer le dernier
-- article rendait son numéro au suivant, et une écriture en retard pour l'ancien
-- (un scan du Capitaine encore en cours) s'enregistrait sur le nouveau. Une
-- séquence ne revient jamais en arrière : un numéro supprimé n'est plus redonné.
-- Idempotent : rejouable sans risque, et sans jamais faire reculer la séquence.
-- Appliqué localement puis capturé par `npm run db:snapshot` (schema.sql + bootstrap.sql).
CREATE SEQUENCE IF NOT EXISTS articles_id_seq AS integer OWNED BY articles.id;

-- Reprend au-dessus du plus grand numéro existant, ou de la position déjà atteinte.
SELECT setval('articles_id_seq', GREATEST(
  (SELECT COALESCE(MAX(id), 0) FROM articles),
  (SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END FROM articles_id_seq),
  1
));

ALTER TABLE articles ALTER COLUMN id SET DEFAULT nextval('articles_id_seq');
