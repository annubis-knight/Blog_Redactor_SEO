---
name: Sprint 15 — Renommage containers en *Panel
version: 1.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 15 : Renommage containers `*Panel`

## 1. Contexte

Décision produit (2026-05-06, suite Sprint 10.5 brainstorm) :
> *« Le naming des containers Moteur n'est pas cohérent. Validation, Selection,
> Extraction, Tab, Scanner, Recap — aucun pattern. »*

Pattern A choisi : suffixer chaque container Moteur par `Panel`. Court, clair,
n'invente pas de hiérarchie artificielle.

## 2. Renommages

| Avant | Après |
|-------|-------|
| `CaptainValidation.vue` | `CaptainPanel.vue` |
| `LieutenantsSelection.vue` | `LieutenantsPanel.vue` |
| `LexiqueExtraction.vue` | `LexiquePanel.vue` |
| `KeywordDiscoveryTab.vue` | `DiscoveryPanel.vue` |
| `DouleurIntentScanner.vue` | `RadarPanel.vue` |
| `FinalisationRecap.vue` | `FinalisationPanel.vue` |
| `useKeywordDiscoveryTab` (composable) | `useDiscoveryPanel` |
| `tests/.../finalisation-recap.test.ts` | `finalisation-panel.test.ts` |

## 3. FRs

### FR-NAM-CONTAINERS-PANEL (nouvelle)
Les 6 containers d'onglets du Moteur sont nommés `*Panel.vue` (Pattern A : `XxxPanel`).
**Justification** : avant Sprint 15, le naming était hétérogène (`Validation`, `Selection`,
`Extraction`, `Tab`, `Scanner`, `Recap`) — aucun pattern. Le suffixe `Panel` est court,
neutre, et signale qu'il s'agit du panneau (container) de l'onglet, pas d'une opération.

**Critères d'acceptation testables** :
- Les 6 fichiers sont nommés `*Panel.vue` dans `src/components/moteur/` ou `src/components/intent/`.
- Aucun import ne référence les anciens noms.
- Tests existants passent (sauf adaptation des imports).

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-15-rename-containers-panel.

## 4. Validation

- `npm run type-check` ✅
- `npm run test:unit` : 3983 tests verts (2 sanity E2E pré-existants)
- `npm run build` : 10.81s ✅
