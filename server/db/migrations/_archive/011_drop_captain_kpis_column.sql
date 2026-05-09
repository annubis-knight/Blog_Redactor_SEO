-- =====================================================
-- Migration 011: DROP captain_explorations.kpis
-- Sprint 15.3-bis (A4). KPIs are now sourced from keyword_metrics
-- via LEFT JOIN in getCaptainExplorations(). captain_explorations
-- becomes a pure decision-history table.
-- =====================================================

ALTER TABLE captain_explorations DROP COLUMN IF EXISTS kpis;
