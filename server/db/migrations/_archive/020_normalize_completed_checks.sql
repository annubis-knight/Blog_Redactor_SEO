-- Migration 020 — 2026-05-08
-- Normalise `articles.completed_checks` au format prefixe.
--
-- Contexte : pendant longtemps, plusieurs sites du code emettaient des checks
-- au format legacy sans prefixe (ex: 'capitaine_locked', 'brief-validated')
-- alors que les ProgressDots et le gating workflow lisent le format prefixe
-- ('moteur:capitaine_locked', 'redaction:brief_validated'). Resultat : des
-- doublons en DB ('capitaine_locked' + 'moteur:capitaine_locked') et des
-- dots non-remplis car le check etait sous le mauvais nom.
--
-- Cette migration convertit chaque check legacy vers son equivalent prefixe,
-- elimine les doublons (DISTINCT), et conserve les checks deja prefixes.
--
-- Mapping :
--   'discovery_done'    → 'moteur:discovery_done'
--   'radar_done'        → 'moteur:radar_done'
--   'capitaine_locked'  → 'moteur:capitaine_locked'
--   'lieutenants_locked'→ 'moteur:lieutenants_locked'
--   'lexique_validated' → 'moteur:lexique_validated'
--   'strategy_defined'  → 'cerveau:strategy_defined'
--   'hierarchy_built'   → 'cerveau:hierarchy_built'
--   'articles_proposed' → 'cerveau:articles_proposed'
--   'brief-validated'   → 'redaction:brief_validated'  -- bonus : tiret → underscore
--   'brief_validated'   → 'redaction:brief_validated'
--   'outline_validated' → 'redaction:outline_validated'
--   'content_written'   → 'redaction:content_written'
--   'seo_validated'     → 'redaction:seo_validated'
--   'published'         → 'redaction:published'
--   <deja prefixe>      → garde tel quel
--   <inconnu>           → ignore (filtre)

UPDATE articles
SET completed_checks = ARRAY(
  SELECT DISTINCT normalized
  FROM (
    SELECT
      CASE
        -- Moteur
        WHEN c = 'discovery_done'      THEN 'moteur:discovery_done'
        WHEN c = 'radar_done'          THEN 'moteur:radar_done'
        WHEN c = 'capitaine_locked'    THEN 'moteur:capitaine_locked'
        WHEN c = 'lieutenants_locked'  THEN 'moteur:lieutenants_locked'
        WHEN c = 'lexique_validated'   THEN 'moteur:lexique_validated'
        -- Cerveau
        WHEN c = 'strategy_defined'    THEN 'cerveau:strategy_defined'
        WHEN c = 'hierarchy_built'     THEN 'cerveau:hierarchy_built'
        WHEN c = 'articles_proposed'   THEN 'cerveau:articles_proposed'
        -- Redaction (variantes)
        WHEN c IN ('brief-validated', 'brief_validated') THEN 'redaction:brief_validated'
        WHEN c = 'outline_validated'   THEN 'redaction:outline_validated'
        WHEN c = 'content_written'     THEN 'redaction:content_written'
        WHEN c = 'seo_validated'       THEN 'redaction:seo_validated'
        WHEN c = 'published'           THEN 'redaction:published'
        -- Déjà préfixé : on garde
        WHEN c LIKE 'moteur:%'   THEN c
        WHEN c LIKE 'cerveau:%'  THEN c
        WHEN c LIKE 'redaction:%' THEN c
        -- Inconnu : NULL (filtré ci-dessous)
        ELSE NULL
      END AS normalized
    FROM unnest(completed_checks) AS c
  ) sub
  WHERE normalized IS NOT NULL
)
WHERE completed_checks IS NOT NULL AND array_length(completed_checks, 1) > 0;
