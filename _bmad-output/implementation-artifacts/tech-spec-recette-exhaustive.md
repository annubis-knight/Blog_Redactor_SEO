---
name: tech-spec-recette-exhaustive
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md (NFR-TEST-RECETTE-COVERAGE)
  - spec/18-recette-manuelle.md
  - spec/recette/
  - design/07-tests-et-outillage.md
---

# Tech-spec — Une recette manuelle exhaustive, gardée par `verify`

## Contexte

Le 2026-09-28, Arnaud constate que la recette manuelle n'est « pas du tout assez exhaustive ».

- **Ce que dit la recette** (`spec/18-recette-manuelle.md`) : 10 étapes, 45 minutes, tirées des tests
  navigateur du programme qualité SEO. Elle ne cite **aucun** identifiant d'exigence.
- **Ce que disent les exigences** (`spec/requirements.md`) : 217 exigences fonctionnelles (144 actives,
  72 non tenues, 1 prévue) et 63 non fonctionnelles.
- **Écart** : la recette touche une vingtaine d'exigences. Discovery (8), Radar (21), Finalisation (3),
  Dashboard (4), Intégrations (14) et Interface (5) n'y figurent pas. Le Capitaine (23) et le Moteur (26)
  n'y sont que survolés.

## Décisions d'Arnaud (2026-09-28)

1. **Des modules par domaine, plus le parcours express.** Chaque module dure de 20 à 30 minutes et se fait
   à part. Le parcours de 45 minutes reste l'étape obligatoire avant une fusion dans `main`.
2. **Les exigences non tenues sont incluses.** Chacune devient une vérification marquée « ⚠ », avec le
   défaut attendu. Si le défaut n'apparaît pas, il a peut-être disparu, et l'exigence change de statut.
3. **Un garde-fou dans `verify`.** Une exigence fonctionnelle ne peut pas manquer à la recette.

## Solution

### Organisation

- `spec/18-recette-manuelle.md` reste le point d'entrée : avant de commencer, l'alarme, le **parcours
  express** (chaque étape cite ses exigences), la liste des modules, le mode RÉEL et les limites connues.
- `spec/recette/NN-domaine.md` : un module par domaine.

| Module | Exigences |
|---|---|
| 01 — Dashboard et interface | FR-DASH, FR-UI |
| 02 — Cerveau | FR-CER, FR-PIE, FR-PAIN |
| 03 — Moteur : le cadre commun | FR-MOT, FR-API |
| 04 — Discovery et Radar | FR-DIS, FR-RAD |
| 05 — Capitaine | FR-CAP |
| 06 — Lieutenants, Structure, Lexique, Finalisation | FR-LIE, FR-HN, FR-LEX, FR-FIN |
| 07 — Rédaction | FR-RED, FR-EXP |
| 08 — Intégrations | FR-EXT |
| 09 — Règles transverses | FR-INFRA |

### Format d'un module (lu par le test)

- Une vérification est un bloc `### CODE-n — Titre`. Il contient une ligne `**Exigences :** FR-…, FR-… ⚠`,
  puis les rubriques **Gestes**, **Tu dois voir** et **C'est un bug si**.
- `⚠` suit l'identifiant d'une exigence non tenue. Le bloc contient alors `**⚠ Défaut connu :** …`.
- La dernière section, `## Hors recette`, est un tableau `| Exigence | Pourquoi … |`. Une exigence n'y
  figure que si rien ne se voit à l'écran, ou si elle est prévue et pas encore livrée.
- Aucun nom de fichier, de route, de table ni de composant (règle de `spec/`). Les libellés sont relevés
  dans le code.

### Garde-fou

`tests/unit/architecture/recette-coverage.test.ts`, dans `npm run verify` (dossier `architecture`). Il cite
`NFR-TEST-RECETTE-COVERAGE`. Il lit `spec/requirements.md`, `spec/18-recette-manuelle.md` et
`spec/recette/*.md`, sans les blocs de code, et il vérifie cinq règles :

- chaque exigence FR active, non tenue ou prévue est vérifiée ou exclue ;
- aucune n'est les deux à la fois ;
- les identifiants cités existent ;
- `⚠` suit le statut : non tenue ⇒ `⚠`, active ⇒ pas de `⚠`, prévue ⇒ hors recette ;
- une vérification `⚠` décrit son défaut, et une exclusion donne sa raison.

## Critères d'acceptation → tests

| Critère | Test |
|---|---|
| Chaque FR vérifiée ou exclue, jamais les deux | `recette-coverage.test.ts` |
| `⚠` cohérent avec `spec/requirements.md` | `recette-coverage.test.ts` |
| Identifiants existants, exclusions justifiées | `recette-coverage.test.ts` |

## Réalisation

- **Le test d'abord.** Il était rouge tant que `spec/recette/` n'existait pas (ENOENT), puis tant que le module
  Capitaine manquait (23 exigences FR-CAP oubliées).
- **Rédaction des modules.** Un agent par domaine, en parallèle. Chacun a relevé les libellés dans les
  composants et les réponses simulées, puis signalé les écarts entre la spec et le code.
- **Mutation du test.** Deux défauts ont été introduits exprès dans un module : un identifiant mal
  orthographié, et un « ⚠ » posé sur une exigence active, sans « Défaut connu ». Quatre règles sur sept ont
  échoué, comme prévu : exigence oubliée, identifiant inconnu, ⚠ contraire au statut, défaut non décrit.
  Le fichier a ensuite été restauré.

### Ce qui est livré

| Module | Vérifications | Hors recette |
|---|---|---|
| 01 Dashboard et interface | 22 | 0 |
| 02 Cerveau | 33 | 0 |
| 03 Moteur, cadre commun | 20 | 1 |
| 04 Discovery et Radar | 30 | 0 |
| 05 Capitaine | 26 | 3 |
| 06 Lieutenants, Structure, Lexique, Finalisation | 37 | 0 |
| 07 Rédaction | 32 | 1 |
| 08 Intégrations | 13 | 3 |
| 09 Règles transverses | 24 | 11 |
| **Total** | **237**, plus les 10 étapes du parcours express | **19** |

Durée totale : environ 10 h, sections RÉEL comprises, à faire par modules.

### Corrections du parcours express, relevées dans le code

- **Étape 1.** « Terminer le brainstorm » s'affiche à la 6ᵉ étape, « Articles », pas à la 5ᵉ
  (`BrainPhase.vue`, `handleNext`). Il ramène ensuite sur la page du cocon.
- **Étape 6.** « Valider le sommaire » mène directement à l'étape Article. « Continuer vers l'Article » ne
  s'affiche que pour un sommaire déjà validé (`BriefStructureStep.vue`).
- **Étape 8.** Ajout de la passe « Résumer ». Sans elle, la porte de publication lève un 🔴 sur la section dont
  est né l'enfant : plus de 250 mots (`shared/verifiers/publish.ts`, `childSummaryIssues`).
- **Étape 10.** Il faut fermer puis rouvrir l'aperçu avant de réexporter : l'aperçu ne se recharge pas.
- **Mode RÉEL.** La phrase « chaque action payante affiche son coût » était fausse. Elle devient : certaines
  actions l'annoncent, d'autres non, et la pile « Coûts API » fait foi.

### Écarts relevés

Environ 90 écarts entre la spec et le code, relevés par la lecture et jamais vus à l'écran. Ils sont versés
au journal de recette (`recette-manuelle-journal.md`, § « Écarts relevés à la lecture du code »), en cinq
familles :

- A : bugs probables ;
- B : réponses simulées hors format ;
- C : statuts d'exigences à revoir ;
- D : doc à corriger ;
- E : textes à l'écran.

Rien n'est corrigé : le tri revient à Arnaud.
