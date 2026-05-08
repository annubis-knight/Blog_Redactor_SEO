-- Migration 019 — 2026-05-07
-- Drop des colonnes timestamp `locked_at` qui ne servent nulle part dans l'UI
-- et qui creaient une source de verite redondante a `status`.
--
-- Capitaine : `article_keywords.captain_locked_at` etait l'autorite du status
--   'locked' / 'suggested'. Maintenant `article_keywords.capitaine` non-vide
--   = verrouille (cf. data.service.ts getArticleKeywords).
--
-- Lieutenants : `lieutenant_explorations.locked_at` etait redondant avec
--   `lieutenant_explorations.status`. Le status seul suffit.
--
-- Aucun impact fonctionnel : aucun composant Vue ne lisait ni n'affichait
-- ces timestamps. Ils etaient juste persistes pour rien.

ALTER TABLE article_keywords DROP COLUMN IF EXISTS captain_locked_at;
ALTER TABLE lieutenant_explorations DROP COLUMN IF EXISTS locked_at;
