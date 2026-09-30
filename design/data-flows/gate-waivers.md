---
name: gate-waivers
description: Dérogations aux portes de qualité — la décision écrite de passer outre un point 🟠 ou 🔴, enregistrée dans `gate_waivers` sur l'empreinte du point qu'elle couvre, relue par chaque évaluation de porte et réaffichée à la publication.
type: "gate_waivers(article_id, gate_id, rule, level attention|risque, category, reason, input_hash, created_at) ; GateWaiver / GateIssue.fingerprint (shared/verifiers/gate.ts) côté code"
last_updated: 2026-09-30
related_fr: [FR-INFRA-GATE-WAIVER, FR-INFRA-VERIFIER-SHARED, FR-RED-PUBLISH-GATE, FR-RED-DRAFT-SINGLE-PASS, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-HN-LOCK-GATE, FR-LEX-METIER-ONLY]
synced_with: [design/20-infrastructure.md, design/17-redaction.md]
---

# Data Flow — gate-waivers

> **En clair :** quand une porte (un contrôle fait par le serveur avant une étape, par exemple « publier ») relève un point, l'utilisateur peut passer outre : il coche « J'ai lu » pour un 🟠, ou donne une catégorie et une raison pour un 🔴. Cette décision est une **dérogation**. Elle vaut pour **ce point et ses données** : un paragraphe répété dérogé reste dérogé tant que ce paragraphe est là, même si l'on retouche un mot ailleurs ; il revient dès que le point change. Exemple : au premier jet, Arnaud assume « Paragraphe répété : « Un site clair rassure… » » ; à la publication, ce même paragraphe n'est pas redemandé en 🔴, il revient en 🟠 « Dérogation posée au premier jet… », à relire.
>
> **Type/format :** une ligne par dérogation. `input_hash` porte l'**empreinte du point** (`GateIssue.fingerprint`, 8 caractères hexadécimaux, FNV-1a) ; les lignes écrites avant le 2026-09-30 portent l'empreinte de toute la porte (`GateEvaluation.inputHash`). `category` et `reason` sont `null` pour un accusé de lecture 🟠.
>
> **Chapitres :** [Infrastructure transversale](../20-infrastructure.md) (« Portes de qualité et dérogations »), [Rédaction](../17-redaction.md) (« Porte de publication »).

## Producteurs

| Chemin | Fonction | Effet |
|---|---|---|
| Alarme de l'écran ([`GateAlarm.vue`](../../src/components/shared/GateAlarm.vue)) | `waiverDraftsFrom` ([`shared/verifiers/gate.ts`](../../shared/verifiers/gate.ts)) → `useGateAlarmStore().submit` ([`gate-alarm.store.ts`](../../src/stores/ui/gate-alarm.store.ts)) | une réponse par point : `{ rule, fingerprint, category?, reason? }`, l'empreinte étant celle du point **lu** |
| `POST /api/articles/:id/gates/:gateId/waivers` ([`gates.routes.ts`](../../server/routes/gates.routes.ts), `waiversBodySchema`) | `saveGateWaivers` ([`gate.service.ts`](../../server/services/gates/gate.service.ts)) | réévalue la porte ; refuse une alerte disparue, un point dont l'empreinte a changé (« Ce point a changé depuis que vous l’avez lu… »), une réponse irrecevable (`waiverProblem`) ; sinon `INSERT … ON CONFLICT (article_id, gate_id, rule, input_hash) DO UPDATE`, `input_hash` = empreinte du point |
| Tests d'API ([`tests/helpers/gates.ts`](../../tests/helpers/gates.ts) `assumeGate`) | même route | jouent l'utilisateur qui assume |

Le mode automatique ne déroge jamais. Aucune autre écriture.

**L'empreinte d'un point** (`pointFingerprint`, posée par `withFingerprints` dans `evaluateArticleGate`) :
- portes du texte (`draft`, `publish`) : `{ point: textPointKind(rule), message, excerpt }`. `textPointKind` retire le suffixe qui distingue deux occurrences (`repeated-paragraph:<extrait>`) et ramène les règles du premier jet à leur nom de publication (`DRAFT_TO_PUBLISH_RULES` : `draft-repeated-paragraph` → `repeated-paragraph`, `draft-non-french` → `non-french-sentence`, `draft-unsourced-figure` → `unsourced-figure`) : un même paragraphe a la même empreinte aux deux portes ;
- portes du Moteur (`captain-lock`, `lieutenants-lock`, `hn-lock`, `lexique-lock`) : `{ gate: inputHash, rule }` — les données d'un point sont le choix jugé ;
- à la publication, un point repris d'une porte amont (`<porte>:<règle>`) garde son empreinte d'origine ; une reconfirmation (`waiver-reconfirm:*`, `reconfirmIssue` de [`publish.ts`](../../shared/verifiers/publish.ts)) a pour empreinte le point et la réponse d'origine (catégorie, raison).

## Persistance

- Table `gate_waivers` (voir [Données](../02-donnees.md)) : `UNIQUE (article_id, gate_id, rule, input_hash)`, `ON DELETE CASCADE` avec l'article, index `idx_gate_waivers_article`. Une dérogation tombée reste en base (historique) : elle ne couvre plus rien.
- Pas de migration : le schéma n'a pas changé le 2026-09-30, seul le sens d'`input_hash` pour les nouvelles lignes. Les anciennes (empreinte de porte) sont lues par la clause de compatibilité de `evaluateGate` (`covers`).
- Mémoire : `useGateAlarmStore().current.evaluation` (la dernière évaluation reçue, points et empreintes) ; les réponses en cours vivent dans `GateAlarm.vue` et sont remises à zéro quand l'empreinte de la porte change.

## Consommateurs

### Affichage (UI)

- [`GateAlarm.vue`](../../src/components/shared/GateAlarm.vue) : les points qui bloquent encore (`blocking`), et « 🛡 n dérogation(s) déjà posée(s) » (`waived` : message du point, raison).
- À la publication, chaque dérogation encore valable d'une autre porte devient un point 🟠 à relire (`reconfirmIssue`) : « Dérogation posée au … », le **message du point** tel qu'il a été dérogé, puis « Votre raison : « … ». » ou « Vous l’aviez lu (point 🟠 : pas de raison à écrire). » ; jamais le nom interne d'une règle.
- Audit : `describeWaivers` ([`scripts/verify-content-gates.ts`](../../scripts/verify-content-gates.ts)), une ligne par dérogation enregistrée.

### Calcul / tri / filtre / agrégat

- `evaluateGate` : un point est couvert par une dérogation de la même porte, recevable pour son niveau (`waiverProblem`), dont `input_hash` = empreinte du point — ou, dérogation d'avant le 2026-09-30, même `rule` et même empreinte de porte. Un ⛔ n'est jamais couvert.
- `publishGate` : `existingWaivers` = points amont couverts (`waived` des quatre portes rejouées) ; `draftWaivers` = dérogations `draft`, que `withDraftWaivers` applique aux points du texte de même empreinte.
- Serveur : une étape (`CHECK_GATES`) ou la publication (`PUT /articles/:id/status`) n'est accordée que si la porte passe (422 `GATE_BLOCKED` sinon).

## Règles de cohérence

> Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de repli différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout (en bas du tri, hors de la moyenne).

- **Le point affiché est le point dérogé.** L'empreinte que l'alarme renvoie est celle du point qu'elle montre ; le serveur la compare à celle qu'il recalcule ; `evaluateGate` couvre avec cette même empreinte. Une réponse à des données non vues est refusée.
- **Une seule expression d'empreinte** (`pointFingerprint`) pour la porte du premier jet, la publication et la reprise d'un point du premier jet à la publication.
- **Le message réaffiché est celui du point** couvert (`WaivedIssue.issue.message`), pas une reconstruction à partir du nom de la règle.

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque |
|---|---|---|---|
| Un mot changé ailleurs dans l'article | empreintes des points recalculées | — | couvert : les points inchangés gardent leur empreinte, seuls les points changés ou nouveaux reviennent (INFRA-19) |
| Point d'un nombre (« 3 600 mots pour un pilier ») | le message porte le nombre | — | voulu : le nombre change à chaque mot ajouté, la dérogation tombe et se redemande |
| Alarme restée ouverte, données changées dans un autre onglet | l'écran garde l'ancienne empreinte | refus « Ce point a changé… » | couvert (`saveGateWaivers`) |
| Dérogation du premier jet, puis publication | `draftWaivers` | — | couvert : même point = 🟠 à relire ; point disparu = rien ; point changé = 🔴 |
| Dérogation posée avant le 2026-09-30 | empreinte de porte | — | valable tant que la porte n'a pas changé ; pour la publication, la première retouche du texte la redemande une fois |
| Nouveau calcul d'un point amont (capitaine re-mesuré) | empreinte de la porte changée | — | la dérogation tombe, le point revient à son niveau d'origine |

## Limites connues

- Les portes du Moteur jugent un choix d'ensemble : ajouter un terme au lexique fait tomber les dérogations des autres termes de cette porte (empreinte de porte + règle).
- Une même dérogation peut être enregistrée plusieurs fois pour une règle (une ligne par empreinte) ; l'audit les liste toutes.

## Tests de cohérence

- [`tests/unit/coherence/gate-waivers.test.ts`](../../tests/unit/coherence/gate-waivers.test.ts) — `FR-INFRA-GATE-WAIVER` : l'empreinte renvoyée par l'alarme (`waiverDraftsFrom`) est celle que `evaluateGate` utilise pour couvrir ; un paragraphe répété a la même empreinte à la porte du premier jet (`verifyDraft`) et à la publication (`verifyPublish`) ; le message réaffiché est celui du point couvert. Importe le code, ne recopie aucune logique.
- Autres : [`verifiers-gate.test.ts`](../../tests/unit/shared/verifiers-gate.test.ts), [`verifiers-publish.test.ts`](../../tests/unit/shared/verifiers-publish.test.ts), [`gate.service.test.ts`](../../tests/unit/services/gate.service.test.ts) (service, I/O simulées), [`GateAlarm.test.ts`](../../tests/unit/components/GateAlarm.test.ts), [`gates.contract.test.ts`](../../tests/contract-api/gates.contract.test.ts) (serveur réel, en CI).

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
