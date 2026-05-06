---
name: Sprint 21 — Cleanup docs data-flows périmées
version: 1.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-18-22-cleanup-and-investigations
---

# Tech-Spec — Sprint 21 : Cleanup docs `data-flows/`

## 1. Contexte

Suite aux Sprints 10.5-20, plusieurs docs `data-flows/` référençaient :
- D'anciens noms de fichiers Vue (Sprint 15 : `*Validation.vue` / `*Selection.vue` / etc.)
- L'ancien composable `useRadarCarousel` (Sprint 12)
- L'ancienne propriété `validationHistory` / type `CaptainValidationEntry` (Sprint 20)
- Les anciens fichiers backend `keyword-validate.routes/service` (Sprint 14)

De plus, le dossier contenait 4 audits datés (`_audit-*.md`) qui polluaient la
liste des docs vivantes.

## 2. Périmètre

### Archivage des audits datés
- `_audit-2026-05-04.md` → `_archive/`
- `_audit-2026-05-05.md` → `_archive/`
- `_audit-2026-05-05-final.md` → `_archive/`
- `_audit-final-kpi-nullable.md` → `_archive/`

Création de `docs/data-flows/_archive/` pour la traçabilité historique.

### Mise à jour naming dans 16 docs
Renommages mécaniques :
- `CaptainValidation.vue` → `CaptainPanel.vue`
- `LieutenantsSelection.vue` → `LieutenantsPanel.vue`
- `LexiqueExtraction.vue` → `LexiquePanel.vue`
- `FinalisationRecap.vue` → `FinalisationPanel.vue`
- `KeywordDiscoveryTab.vue` → `DiscoveryPanel.vue`
- `DouleurIntentScanner.vue` → `RadarPanel.vue`
- `useRadarCarousel` → `useExploredKeywords`
- `validationHistory` → `exploredKeywords`
- `CaptainValidationEntry` → `CaptainScanEntry`
- `keyword-validate.routes` → `keyword-scan.routes`
- `keyword-validate.service` → `keyword-scan.service`

### Conservé pour traçabilité historique
- Les commentaires `// Sprint 15.X — Storage moved from api_cache[X] to ...`
  dans le **code** restent (documentation de migration passée).
- `api_cache` reste mentionné dans les **docs** quand le contexte est historique
  (ex: "ancien cache `api_cache.cache_type='paa'` migré vers `paa_explorations`").

## 3. Hors-scope

Les docs `data-flows/` qui ont `last_updated: 2026-05-04` ou avant ne sont **pas
refondues** — c'est un chantier dédié. Sprint 21 fait juste le nettoyage naming
mécanique.

## 4. Validation

- Recherche grep des anciens noms dans `docs/` (hors `_archive/`) → 0 occurrence.
- Aucun test impacté (les docs ne sont pas exécutées).

**Statut :** done. **Source :** tech-spec-sprint-21-cleanup-docs-data-flows.
