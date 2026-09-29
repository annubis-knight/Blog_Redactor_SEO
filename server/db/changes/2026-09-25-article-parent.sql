-- Cocon né du pilier (épopée qualité SEO, C7 — FR-CER-CHILD-FROM-PILLAR-H2).
-- Un article enfant naît d'une section (H2) de son parent : `parent_id` pointe
-- sur le parent, `parent_section` garde le titre de ce H2. Un parent ne se
-- supprime pas tant qu'il a des enfants (RESTRICT). Le pilier n'a pas de parent.
-- Idempotent : rejouable sans risque.
-- Appliqué par `npm run db:apply -- server/db/changes/2026-09-25-article-parent.sql`,
-- puis capturé par `npm run db:snapshot` (schema.sql + bootstrap.sql).
ALTER TABLE articles ADD COLUMN IF NOT EXISTS parent_id INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS parent_section TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_parent_id_fkey') THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES articles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_parent_not_self') THEN
    ALTER TABLE articles ADD CONSTRAINT articles_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_articles_parent_id ON articles (parent_id);
