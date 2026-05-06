---
name: Sprint 14 — Vocabulaire backend "validate" → "scan" — REPORTÉ
version: 1.0.0
last_updated: 2026-05-06
status: deferred
branch: futur (sprint dédié)
---

# Tech-Spec — Sprint 14 : Vocabulaire backend "scan" — REPORTÉ

## Statut : REPORTÉ

Décision prise lors de l'exécution du Sprint 13 : le rayon de propagation
du renommage "validate" → "scan" est trop important pour un sprint isolé.

## Cartographie réelle (2026-05-06)

- **67 fichiers** contiennent `validateKeyword`, `/validate`, `keyword-validate`,
  `ValidateResponse` ou `ValidateVerdict`.
- Le renommage touche : front (composables, composants), back (route HTTP,
  service, types Zod), tests (3500+ lignes), shared/types.
- Renommer la route HTTP `POST /keywords/:keyword/validate` → `/scan` casse
  toute consommation externe (pas d'API publique mais peut casser des plugins
  ou intégrations futures).

## Pourquoi reporter

1. **Risque élevé** sur du renommage de masse multi-couches.
2. **Gain UI** modeste : le terme est dans le code, pas exposé à l'utilisateur.
3. **Sprint 13** a déjà nettoyé la sémantique côté UI (FR-UI-VOCABULAIRE-VERROUILLER,
   FR-CODE-NO-CAROUSEL, FR-MOT-LOCK-DERIVED) — l'utilisateur voit "Verrouiller",
   pas "Valider", pas "Scan".
4. **Décision produit** (Sprint 10.5 brainstorm) : la cohérence "scan = recherche /
   verrouillage = décision" est un objectif de moyen terme, pas urgent.

## Périmètre futur recommandé

Quand sprint dédié sera lancé :

1. **Vague 1 — Front uniquement** : `useCapitaineValidation` → `useCapitaineScan`,
   `validateKeyword` (composable) → `scanKeyword`. Touche ~7 fichiers. Garde
   la route HTTP intacte pour ne pas casser le contrat back/front.
2. **Vague 2 — Backend route HTTP** : ajouter `POST /keywords/:keyword/scan` en
   parallèle de `/validate` (alias), puis migrer les appels front, puis
   déprécier `/validate`. Sur 2-3 mois.
3. **Vague 3 — Types Zod et services** : `ValidateResponse` → `ScanResponse`,
   `keyword-validate.service.ts` → `keyword-scan.service.ts`. Touche shared/types.

## Pourquoi pas maintenant

L'utilisateur a explicitement validé la priorisation : **finir les sprints
courants, puis attaquer les bugs comportementaux** (duplication validationHistory,
réorganisation au clic root variant). Le renommage backend est cosmétique vs
ces bugs.

**Statut :** deferred. **Date décision :** 2026-05-06. **Source :** discussion Sprint 13.
