---
name: tech-spec-onglet-structure-hn
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C6 ; M7, T2, T5)
  - _bmad-output/planning-artifacts/prd.md (FR-HN-TAB, FR-HN-LOCK-GATE ; FR-MOT-CHECKS, FR-MOT-PHASES, FR-LIE-CHECK amendées ; FR-LIE-HN-STRUCTURE superseded)
  - _bmad-output/planning-artifacts/design-registry.md
---

# Tech-spec — Onglet Structure Hn (C6)

## Contexte (cartographie du 2026-09-25)

L'onglet Lieutenants produit à la fois les lieutenants et la structure H1/H2/H3, et une seule
case valide l'étape (`lieutenantsCheckActive = lieutenant verrouillé ET structure non vide`,
`LieutenantsPanel.vue:191`). Conséquences :

| Constat | Où |
|---|---|
| La structure est produite par `propose-lieutenants` **avant** tout choix de lieutenant (M7) | `useLieutenantsIa.ts:304`, `propose-lieutenants.md` §3 |
| Aucune porte serveur ne juge la structure (`hn-lock` répond « passe ») | `gate.service.ts:284-286` |
| Le prompt de structure demande un H1 « qui n'est PAS un copier-coller du mot-clé », la publication exige le capitaine dans le H1 | `lieutenants-hn-structure.md` règle 1, `seo-validators` |
| Le prompt invite à écrire des H2 d'introduction et de conclusion, `hnToOutline` en ajoute d'office : doublons | prompt §Contexte, `outline.store.ts:22,43` |
| « Sommaire : 6 à 8 H2 » ne dit pas si l'introduction et la conclusion comptent | `describeTypeRules` |
| Tout enregistrement Lieutenants/Lexique fait sur un store sans structure l'efface (`hnStructure ?? []` côté store, route et service) | store l.221, `keywords.routes.ts:313`, `data.service.ts:702-712` |
| La récurrence des titres concurrents vit dans l'état local du panneau Lieutenants | `useLieutenantsSerp.ts:96-105` |

## Objectif

Capitaine → Lieutenants → **Structure** → Lexique. La structure naît des lieutenants **retenus**,
du contexte du cocon et de la récurrence des concurrents ; une porte serveur `hn-lock` la juge
avant de valider l'étape `moteur:hn_locked`.

## Décisions

1. **H2 de fond** : les règles du type comptent les H2 de fond, hors introduction et conclusion
   (ajoutées par le sommaire). `describeTypeRules` le dit ; le prompt de structure n'écrit plus
   d'introduction ni de conclusion ; `hnToOutline` n'en ajoute pas si la structure en a déjà.
2. **H1** : il contient le capitaine en entier (ses mots, dans un ordre naturel). Absent : ⛔ ;
   sans le capitaine : 🔴 (même niveau qu'au premier jet, C5a).
3. **Porte `hn-lock`** (`shared/verifiers/structure.ts`) :
   - ⛔ structure vide (aucun H2), H1 absent, titre vide, H3 sans H2 parent ;
   - 🔴 capitaine absent du H1 ; nombre de H2 de fond hors `h2Min..h2Max` ; plus de `localH2Max`
     H2 qui citent la ville de la zone ; pour un pilier, H2 qui recoupe un article existant du
     cocon **et** le développe (H3) — il doit le résumer et y renvoyer ;
   - 🟠 lieutenant retenu absent de tous les titres ; H2 qui recoupe un article existant (sans
     H3) ; H2 d'introduction ou de conclusion (déjà ajoutés par le sommaire) ; plus de
     `h3PerH2Max` H3 sous un H2.
4. **Étape Lieutenants** : un lieutenant verrouillé suffit (M7) ; la réconciliation au montage ne
   retire plus l'étape faute de structure.
5. **Enregistrer la structure** ≠ la valider. Valider (bouton « Valider la structure ») : la
   structure est enregistrée, le sommaire de la Rédaction écrit (`hnToOutline`), la longueur
   conseillée recalculée, puis l'étape passe par la porte.
6. **Pas d'écrasement silencieux** : `hnStructure` absent d'un enregistrement = inchangé en base.
7. **Récurrence des concurrents** : l'onglet Structure relit l'analyse SERP du capitaine (cache 7
   jours, sans coût) ; le calcul de récurrence passe dans `shared/utils/hn-structure.ts`.
8. **Articles existants** : `scripts/reconcile-hn-checks.ts` (simulation par défaut, `--apply`)
   ajoute `moteur:hn_locked` aux articles dont l'étape Lieutenants est validée et dont la structure
   passe la porte ; liste les autres. Le mode automatique produit une vraie structure (route de
   structure) et émet l'étape par la porte.

## Lots

- **L1 — noyau** : `MOTEUR_HN_LOCKED`, `verifyStructure`, `describeTypeRules` (H2 de fond),
  `hnToOutline` sans doublon, tests.
- **L2 — serveur** : porte `hn-lock` (`CHECK_GATES`, rejouée à la publication), route de structure
  (lieutenants retenus lus en base, contexte du cocon, récurrence calculée côté serveur si absente),
  `propose-lieutenants` sans structure, pas d'écrasement de `hn_structure`, tests de contrat.
- **L3 — écran** : onglets, phases, `computeSmartTab`, `StructureHnPanel.vue` (prop `mode`),
  `useStructureHn.ts`, retrait de la structure de l'onglet Lieutenants, Finalisation à 4 verrous,
  6 points de progression.
- **L4 — données** : script de réconciliation, mode automatique.
- **L5 — tests** : ~30 fichiers dépendants, `describe.skip` Lieutenants/Lexique relus, helper
  navigateur `MOTEUR_TABS` + `lockStructure`, parcours.
- **L6 — doc** : PRD, registre, épopée, sprint, `docs/`.
