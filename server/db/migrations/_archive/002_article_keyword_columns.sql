-- Migration 002: Add proper columns for suggested_keyword, captain_keyword_locked, pain_point
-- These were previously stored as workarounds in check_timestamps JSONB

ALTER TABLE articles ADD COLUMN IF NOT EXISTS suggested_keyword TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS captain_keyword_locked TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS pain_point TEXT;

-- Backfill from the JSONB workaround keys
UPDATE articles SET suggested_keyword = check_timestamps->>'_suggestedKeyword'
  WHERE check_timestamps ? '_suggestedKeyword' AND suggested_keyword IS NULL;
UPDATE articles SET captain_keyword_locked = check_timestamps->>'_captainKeyword'
  WHERE check_timestamps ? '_captainKeyword' AND captain_keyword_locked IS NULL;

-- Clean up the workaround keys from check_timestamps
UPDATE articles SET check_timestamps = check_timestamps - '_suggestedKeyword' - '_captainKeyword'
  WHERE check_timestamps ? '_suggestedKeyword' OR check_timestamps ? '_captainKeyword';
