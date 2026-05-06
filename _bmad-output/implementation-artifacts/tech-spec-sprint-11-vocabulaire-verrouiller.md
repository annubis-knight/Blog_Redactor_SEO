---
name: Sprint 11 — Vocabulaire UI "Valider" → "Verrouiller"
version: 1.0.0
last_updated: 2026-05-06
status: in-progress
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 11 : Vocabulaire UI "Verrouiller"

## 1. Contexte

Décision produit (2026-05-06) : harmoniser le vocabulaire UI sur **« Verrouiller »** plutôt que **« Valider »**.

**Justification** :
- Le verbe "Valider" est ambigu et utilisé pour deux choses différentes dans le code :
  1. **Recherche/exploration** (`validateKeyword`, scan DataForSEO, calcul scoring) — ce n'est pas une décision utilisateur
  2. **Verrouillage** (l'utilisateur fige son choix : ce mot-clé sera mon Capitaine)
- Côté UX, l'utilisateur "verrouille" un mot-clé / une sélection — pas un container ni une opération floue.

**Périmètre Sprint 11** : changement UI uniquement (libellés boutons). Le renommage backend (`validateKeyword` → `scanKeyword`) est reporté à Sprint 14 pour limiter le rayon de propagation.

## 2. Périmètre

### Boutons à renommer (3 occurrences identifiées)

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/moteur/CaptainLockPanel.vue` | 28 | "Valider ce Capitaine" | "Verrouiller ce mot-clé" |
| `src/components/moteur/lieutenants/LieutenantsResultsLayout.vue` | 137 | "Valider les Lieutenants" | "Verrouiller les Lieutenants" |
| `src/components/moteur/LexiqueExtraction.vue` | 522 | "Valider le Lexique" | "Verrouiller le Lexique" |

### Tests à ajuster

Tests qui matchent les anciens libellés exacts (à grep et corriger).

## 3. Hors-scope

- ❌ Renommage des fonctions internes (`validateLexique`, `validateLieutenants`) — Sprint 14
- ❌ Renommage `useCapitaineValidation`, `validateKeyword` — Sprint 14
- ❌ Renommage `useRadarCarousel` → `useExploredKeywords` — Sprint 12
- ❌ Refonte verrou Capitaine en computed — Sprint 13
- ❌ Renommage containers `*Validation.vue` → `*Panel.vue` — Sprint 15

## 4. FRs

### FR-UI-VOCABULAIRE-VERROUILLER (nouvelle)
Les boutons d'action de figeage d'une décision utilisateur dans le Moteur (Capitaine, Lieutenants, Lexique) utilisent le vocabulaire **« Verrouiller »** dans leur libellé. L'ancien vocabulaire « Valider » est réservé à la documentation produit et n'apparaît plus dans l'interface utilisateur du workflow Moteur.

**Critères d'acceptation testables** :
- Recherche grep "Valider ce Capitaine" / "Valider les Lieutenants" / "Valider le Lexique" dans `src/components/` retourne 0 occurrence.
- Tests UI matchent les nouveaux libellés (snapshot DOM ou `.text()` checks).
- Le bouton "Déverrouiller" (déjà cohérent) reste inchangé.

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-11-vocabulaire-verrouiller.

## 5. Plan d'implémentation

1. Renommer les 3 boutons dans les composants Vue.
2. Lancer `npm run test:unit` pour identifier les tests qui matchent les anciens libellés.
3. Corriger les tests un par un (pas de logique métier modifiée).
4. Validation complète (`npm run check:health`).
5. Mise à jour PRD (ajout FR-UI-VOCABULAIRE-VERROUILLER).
6. Commit.

## 6. Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Tests E2E qui matchent les anciens libellés | Moyenne | Recherche grep dans `tests/`, corriger systématiquement |
| Tests `.text()` qui matchent par contains "Valider" | Faible | Idem |
| User-facing breaking change | Aucun (pure cosmétique UI) | — |
