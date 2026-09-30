---
name: completed-checks
description: Progression d'un article — les six étapes du Moteur et l'étape « premier jet accepté » de la Rédaction, dans le tableau articles.completed_checks.
type: "TEXT[] (PostgreSQL articles.completed_checks) + JSONB articles.check_timestamps ; côté écran ArticleProgress { phase, completedChecks, checkTimestamps }"
last_updated: 2026-09-30
related_fr: [FR-MOT-CHECKS, FR-MOT-CHECKS-CONSTANTS, FR-INFRA-WORKFLOW-CHECKS-CONSTANTS, NFR-INT-COMPLETED-CHECKS-SSOT, NFR-INT-CHECKS-NAMESPACE, FR-DASH-PROGRESS, FR-MOT-DISPLAY-FROM-STORE, FR-MOT-CHECK-RECONCILIATION, FR-MOT-SOFT-GATING, FR-MOT-WORKFLOW-GATING-DUAL, FR-FIN-CHECK, FR-HN-TAB, FR-HN-LOCK-GATE, FR-CER-PARENT-WRITTEN-GATE, FR-RED-DRAFT-SINGLE-PASS]
synced_with: [captain-keyword-locked.md]
---

# Data Flow — completed-checks

> **En clair :** une étape (en anglais *check*) est une case cochée dans la progression d'un article. Le Moteur en coche six : Discovery faite, Radar fait, Capitaine verrouillé, Lieutenants verrouillés, Structure validée, Lexique validé. La Rédaction en coche une seule : « premier jet accepté ». C'est elle qui fait d'un article un parent **rédigé**, capable de donner naissance à ses articles enfants dans le cocon.
>
> **Type/format :** `articles.completed_checks TEXT[]` (ex. `['moteur:discovery_done', 'moteur:capitaine_locked']`) et `articles.check_timestamps JSONB` (`{ étape: date ISO }`). Côté écran : `ArticleProgress { phase, completedChecks, checkTimestamps }` ([`shared/types/article-progress.types.ts`](../../shared/types/article-progress.types.ts)).
>
> **Chapitres :** [Moteur — cadre commun](../12-moteur.md) (« Étapes de progression », « Verrouillage doux », « Réconciliation »), [Infrastructure transversale](../20-infrastructure.md) (« Étapes de progression », « Portes de qualité et dérogations »), [Cerveau](../11-cerveau.md) (« Porte premier jet accepté du parent »), [Rédaction](../17-redaction.md) (« Porte accepter le premier jet »).

## Producteurs

**Catalogue.** [`shared/constants/workflow-checks.constants.ts`](../../shared/constants/workflow-checks.constants.ts) : `MOTEUR_DISCOVERY_DONE`, `MOTEUR_RADAR_DONE`, `MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_HN_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED` (`MOTEUR_CHECKS`, dans l'ordre des onglets), `REDACTION_DRAFT_ACCEPTED` (`REDACTION_CHECKS`), `ALL_WORKFLOW_CHECKS`. `checksRemovedWith(check)` lit `CHECK_DEPENDENTS` : retirer le Capitaine ou les Lieutenants retire aussi la Structure. `REDACTION_DRAFT_ACCEPTED` n'a pas de dépendant et rien ne la retire : elle est **collante** (un enrichissement éloigne le texte de sa longueur visée sans le rendre « non rédigé »).

**Format.** [`shared/schemas/article-progress.schema.ts`](../../shared/schemas/article-progress.schema.ts) : `writeCheckRegex` n'accepte que `moteur:<snake_case>` et la valeur exacte `redaction:draft_accepted` ; `readCheckRegex` tolère en lecture les anciennes valeurs `cerveau:*` et `redaction:*`.

**Écriture en base** — seul chemin : les routes de [`server/routes/articles.routes.ts`](../../server/routes/articles.routes.ts) et les fonctions de [`server/services/infra/data.service.ts`](../../server/services/infra/data.service.ts).

| Route | Fonction | Effet |
|---|---|---|
| `POST /api/articles/:id/progress/check { check }` | `addArticleCheck` | Format refusé → 400. Étape gardée (`CHECK_GATES[check]`, [`gate.service.ts`](../../server/services/gates/gate.service.ts)) : porte jouée, refus → 422 `GATE_BLOCKED`. Sinon ajout sans doublon et horodatage dans `check_timestamps`. |
| `POST /api/articles/:id/progress/uncheck { check }` | `removeArticleChecks(id, checksRemovedWith(check))` | Retire l'étape, ses dépendantes et leurs horodatages. |
| `PUT /api/articles/:id/progress` | `saveArticleProgress` | Remplace phase, étapes et horodatages. Chaque étape gardée **nouvelle** passe d'abord sa porte. Aucun appelant à l'écran. |

Portes (`CHECK_GATES`) : `moteur:capitaine_locked` → `captain-lock`, `moteur:lieutenants_locked` → `lieutenants-lock`, `moteur:hn_locked` → `hn-lock`, `moteur:lexique_validated` → `lexique-lock`, `redaction:draft_accepted` → `draft`. Discovery et Radar ne sont pas gardés.

**Émetteurs à l'écran.** Un panneau émet `check-completed` / `check-removed` avec une constante ; [`MoteurView.vue`](../../src/views/MoteurView.vue) relaie à [`useMoteurArticleSync`](../../src/composables/moteur/useMoteurArticleSync.ts) : `emitCheckCompleted` passe par `useGateAlarmStore().runThroughGate(id, () => addCheck(id, check))` (refus → alarme, un seul rejeu après dérogation) ; `handleCheckRemoved` appelle `removeCheck`. Un article sans ligne en base (id 0) est ignoré.

| Étape | Émetteur |
|---|---|
| `MOTEUR_DISCOVERY_DONE` | `useMoteurCrossTabState.handleSendToRadar` |
| `MOTEUR_RADAR_DONE` | `useMoteurCrossTabState.handleRadarScanned` |
| `MOTEUR_CAPITAINE_LOCKED` | `CaptainPanel.vue` (verrouillage, déverrouillage, réconciliation) |
| `MOTEUR_LIEUTENANTS_LOCKED` | `LieutenantsPanel.vue` (`requestCheck` / `withdrawCheck`) |
| `MOTEUR_HN_LOCKED` | `StructureHnPanel.vue` ; retrait aussi par `LieutenantsPanel.invalidateValidatedStructure` |
| `MOTEUR_LEXIQUE_VALIDATED` | `LexiquePanel.vue` (`requestLexiqueGate` / `withdrawLexiqueCheck`) |
| `REDACTION_DRAFT_ACCEPTED` | [`useArticleGeneration.acceptDraft`](../../src/composables/article/useArticleGeneration.ts) (d'office après la méta, et par le bouton « Valider le premier jet » de [`DraftAcceptance.vue`](../../src/components/article/DraftAcceptance.vue)) |

**Store.** [`src/stores/article/article-progress.store.ts`](../../src/stores/article/article-progress.store.ts) : `addCheck` et `removeCheck` remplacent l'entrée `progressMap[id]` par la réponse du serveur. Pas de mise à jour optimiste : un refus laisse l'entrée intacte.

**Serveur, sans l'écran.** [`cocoon-article.service.ts`](../../server/services/article/cocoon-article.service.ts) `assertParentReady` : à la création ou au rattachement d'un enfant, un parent pas encore marqué voit sa porte `draft` jouée ; si elle passe, `addArticleCheck(parent, REDACTION_DRAFT_ACCEPTED)`.

**Scripts.** Mode automatique : [`scripts/auto-article/checks.ts`](../../scripts/auto-article/checks.ts) (`emitCheck` → `POST …/progress/check`, `saveThenEmit` ; une porte toute 🟠 reconnue au terminal passe par `POST …/gates/:gateId/waivers` puis redemande l'étape), appelé par `moteur-explorer.ts`, `moteur-valider.ts` et `redaction.ts`. Rattrapages (simulation par défaut, `--apply` pour écrire, `addArticleCheck` direct) : [`scripts/reconcile-hn-checks.ts`](../../scripts/reconcile-hn-checks.ts) (`npm run db:reconcile-hn`, accorde `moteur:hn_locked` aux articles dont la structure passe `hn-lock`) et [`scripts/backfill-cocoon.ts`](../../scripts/backfill-cocoon.ts) (`npm run db:backfill-cocoon`, accorde `redaction:draft_accepted` à un article publié, ou dont le premier jet passe `draft`).

## Persistance

| Niveau | Où | Fraîcheur |
|---|---|---|
| Autorité | `articles.completed_checks TEXT[] DEFAULT '{}'`, `articles.check_timestamps JSONB DEFAULT '{}'` ([`server/db/schema.sql`](../../server/db/schema.sql)) | Partagée entre sessions et onglets |
| Cache écran | `useArticleProgressStore.progressMap` : `Record<id en texte, ArticleProgress>`, 50 entrées au plus | Rempli par `fetchProgress` (`GET /api/articles/:id/progress`), remplacé par chaque réponse de `addCheck` / `removeCheck`. Aucune expiration, rien entre onglets |
| Copie passive | `Article.completedChecks` dans `GET /api/cocoons` (`loadArticlesDb`) | Aucun composant ne la lit : les pastilles et les verrous passent par `progressMap` |

- `check_timestamps` est écrit et renvoyé par `GET …/progress`, mais aucun écran ni calcul ne le lit.
- Les anciennes valeurs `cerveau:*` / `redaction:*` restées sur de vieilles lignes sont servies telles quelles ; les consommateurs cherchent une constante précise et les ignorent.

## Consommateurs

### Affichage (UI)

- [`ProgressDots.vue`](../../src/components/moteur/ProgressDots.vue) — deux groupes (`PHASE_GROUPS` : Explorer = Discovery, Radar ; Valider = Capitaine, Lieutenants, Structure, Lexique), point plein si `completedChecks.includes(check)`. `filledCount` ne compte que `MOTEUR_CHECKS` : `redaction:draft_accepted` n'est pas un point. Monté par [`MoteurContextRecap.vue`](../../src/components/moteur/MoteurContextRecap.vue) avec `getChecks(art.id)`, dans le Moteur et, en lecture seule, dans [`RedactionView.vue`](../../src/views/RedactionView.vue).
- [`DraftAcceptance.vue`](../../src/components/article/DraftAcceptance.vue) — bandeau « Premier jet accepté » ou bouton « Valider le premier jet » ; relit la progression au montage et à chaque changement d'article.
- [`StructureHnPanel.vue`](../../src/components/moteur/StructureHnPanel.vue) — « Structure validée » ou « La structure a changé depuis sa validation ».
- [`FinalisationPanel.vue`](../../src/components/moteur/FinalisationPanel.vue) (« Aller à la Rédaction ») et le pied de page du Moteur (`cta-redaction`) — boutons grisés tant qu'un verrou manque, infobulle des étapes manquantes (`finalisationButtonTitle`).
- [`CocoonTreeBuilder.vue`](../../src/components/production/brain/CocoonTreeBuilder.vue) — état « rédigé » de chaque nœud (`drafted`, lu dans `GET /api/cocoons/:cocoonId/tree`) ; la création sous un parent non rédigé est grisée.

### Calcul / tri / filtre / agrégat

- [`useMoteurSoftGating`](../../src/composables/moteur/useMoteurSoftGating.ts) — `hasCheck` lit `getProgress(id).completedChecks` ; `isCaptaineLocked`, `isLieutenantsLocked`, `isStructureLocked`, `isLexiqueValidated`, `finalisationUnlocked`.
- [`useFinalisationGating`](../../src/composables/moteur/useFinalisationGating.ts) — `isFinalisationUnlocked` : les quatre verrous (Capitaine, Lieutenants, Structure, Lexique). `FinalisationPanel` reconstruit la même entrée : les deux boutons ne peuvent pas diverger.
- [`useMoteurTabs.computeSmartTab`](../../src/composables/moteur/useMoteurTabs.ts) — onglet ouvert à la sélection : aucune étape → Capitaine ; Structure validée → Lexique ; Lieutenants → Structure ; Capitaine → Lieutenants. Jamais la Finalisation.
- Réconciliation au premier montage de `CaptainPanel`, `LieutenantsPanel`, `LexiquePanel` : l'état du verrou et l'étape enregistrée sont comparés, l'écart est corrigé par `check` / `uncheck` (jamais par écriture directe).
- Serveur : `getCocoonTree` (`drafted`), l'état du cocon envoyé aux prompts ([`cocoon-context.service.ts`](../../server/services/strategy/cocoon-context.service.ts), « rédigé »), `proposeChildCandidates` (refus `PARENT_NOT_WRITTEN` avant tout appel payant), `assertParentReady`.
- Scripts : [`scripts/auto-article/resume.ts`](../../scripts/auto-article/resume.ts) (point de reprise), `backfill-cocoon.ts`.
- `isDiscoveryAllowed` ne lit **pas** les étapes : il lit le statut du mot-clé dans le pool du cocon (`useKeywordsStore`).

## Règles de cohérence

- **Une seule expression.** Point plein, verrou, bouton, onglet utile et « rédigé » s'écrivent tous `completedChecks.includes(CONSTANTE)`, côté écran sur la même entrée de `progressMap`, côté serveur sur la même ligne de `articles`. Aucun repli : une progression absente vaut `[]`, donc « rien de fait » partout.
- **Toujours les constantes.** Jamais la chaîne en dur (`'moteur:capitaine_locked'`).
- **L'étape suit la décision enregistrée.** Le panneau enregistre d'abord ses décisions, puis demande l'étape : la porte lit la base, pas l'écran.
- **Lire le store pendant le rendu.** Un composant qui affiche une étape la lit dans `progressMap` (template ou `computed`), jamais dans une copie locale (cf. [captain-keyword-locked.md](./captain-keyword-locked.md), FR-MOT-DISPLAY-FROM-STORE).

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque |
|---|---|---|---|
| **Premier affichage du Moteur** | `MoteurContextRecap` charge la progression de chaque article visible (id > 0) absent de `progressMap` | aucune | Un clic très rapide sur un article dont la progression n'est pas encore arrivée ouvre l'onglet Capitaine (`computeSmartTab` voit `[]`). |
| **Changement d'article** | `progressMap` tel qu'il est | aucune | La progression n'est **pas** relue à la sélection. Une étape posée ailleurs (mode automatique, autre onglet) n'apparaît qu'au rechargement de la page. |
| **Étape demandée puis refusée** | évaluation de la porte | 422 `GATE_BLOCKED`, entrée inchangée | Aucun : l'alarme s'ouvre, le point reste vide. |
| **ProgressDots non réactifs** | `getChecks(id)` lit `progressStore.progressMap[String(id)]` pendant le rendu | `addCheck` / `removeCheck` remplacent l'entrée | Si un composant lisait une copie non réactive, le point ne bougerait qu'au rechargement. Aujourd'hui Vue suit la clé lue, même absente, et le remplacement de l'entrée redessine les points dans le même cycle. Même cause et même règle que FR-MOT-DISPLAY-FROM-STORE : cf. [captain-keyword-locked.md](./captain-keyword-locked.md). |
| **Capitaine ou Lieutenants retirés** | — | `uncheck` retire aussi `moteur:hn_locked` | La Structure est à revalider ; la réponse du serveur met l'écran à jour. |
| **Enfant créé sous un parent non marqué** | porte `draft` du parent | étape posée sur le parent par le serveur | Le bandeau de la Rédaction du parent ne le sait qu'à sa prochaine lecture (montage). |
| **Texte enrichi après acceptation** | — | aucune | Voulu : l'étape reste ; la porte `draft` n'est pas rejouée à la publication. |
| **Deux onglets sur le même article** | chaque onglet a son `progressMap` | l'un écrit | L'autre affiche un état périmé jusqu'au rechargement. |
| **`PUT …/progress`** | — | remplace tout le tableau | Pourrait effacer `redaction:draft_accepted` ; aucun appelant aujourd'hui. |

## Limites connues

- `evictOldest` supprime les premières clés de `Object.keys(progressMap)`. Pour des clés numériques, JavaScript les range par valeur croissante : ce sont les **plus petits identifiants** qui sortent, pas les moins récents. Sans effet visible sous 50 articles par cocon.
- Le serveur valide le **format** d'une étape, pas son appartenance au catalogue : `moteur:nimporte_quoi` serait enregistré.
- `POST …/progress/check` sur un article inconnu, pour une étape non gardée, répond 200 avec une progression vide (pas de 404).

## Tests de cohérence

- [`tests/unit/coherence/completed-checks.test.ts`](../../tests/unit/coherence/completed-checks.test.ts) — le vrai catalogue : préfixe `moteur:`, six étapes dans l'ordre des onglets, `ALL_WORKFLOW_CHECKS` = six + `redaction:draft_accepted`, valeurs exactes, schéma Zod (refuse `capitaine_locked`, `cerveau:strategy_defined`, `redaction:brief_validated`, `hn_locked` ; accepte `redaction:draft_accepted`), aucune chaîne héritée en dur dans `src/`. Les cas de rechargement et d'idempotence sont encore en `it.todo`.
- [`tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts`](../../tests/unit/coherence/captain-keyword-and-progress-reactive.test.ts) — AC3 / AC4 : `ProgressDots` passe à plein après `addCheck` et revient vide après `uncheck`, sans rechargement ; AC8 lit cette fiche.
- [`tests/unit/coherence/articles.test.ts`](../../tests/unit/coherence/articles.test.ts) — `computeSmartTab` selon les étapes (vrai `useMoteurTabs`). Ses blocs « FR-DASH-PROGRESS » recopient l'expression des points sans monter `ProgressDots` : ils ne gardent pas le composant.
- Hors du dossier `coherence/` : [`finalisation-gating.test.ts`](../../tests/unit/composables/finalisation-gating.test.ts), [`finalisation-panel.test.ts`](../../tests/unit/components/finalisation-panel.test.ts), [`useMoteurSoftGating.test.ts`](../../tests/unit/composables/moteur/useMoteurSoftGating.test.ts), [`article-progress.store.test.ts`](../../tests/unit/stores/article-progress.store.test.ts), [`draft-acceptance.test.ts`](../../tests/unit/components/draft-acceptance.test.ts), [`cocoon-article.service.test.ts`](../../tests/unit/services/cocoon-article.service.test.ts) (étape posée sur le parent), [`backfill-cocoon-plan.test.ts`](../../tests/unit/scripts/backfill-cocoon-plan.test.ts).

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
