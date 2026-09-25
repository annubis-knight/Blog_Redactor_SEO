---
name: tech-spec-redaction-premier-jet
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C5, premier temps ; R1, R7 soldées, R8 revérifiée, R6 et R9 reportées aux actions (C5b) ; R14-R16, U1, U2 découverts)
  - _bmad-output/planning-artifacts/prd.md (FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE ; FR-RED-ARTICLE superseded ; amendées : FR-RED-PUBLISH-GATE, FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER ; deprecated : NFR-PERF-INTER-SECTION-DELAY, NFR-CFG-INTER-SECTION-DELAY, NFR-CFG-WEB-SEARCH)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-RED-DRAFT-SINGLE-PASS, DESIGN-RED-DRAFT-TO-SOURCE ; DESIGN-RED-ARTICLE et DESIGN-PERF-INTER-SECTION-DELAY retirés du code ; DESIGN-RED-PUBLISH-GATE, DESIGN-INFRA-VERIFIER-SHARED, DESIGN-INFRA-GATE-WAIVER mis à jour)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (qualite-seo-c5-redaction-deux-temps)
  - docs/prompts-reference.md (généré)
---

# Tech-spec — Rédaction en deux temps : le premier jet (C5a)

## Contexte

Le pilier 1013 : 15 601 mots pour 2 650 visés, une conclusion par section, des phrases en anglais,
des chiffres de 2024 sans source. La rédaction faisait **un appel par H2** (15 appels), chacun sans
mémoire du reste (500 derniers caractères seulement), avec la recherche web imposée par le prompt.

Cartographie du 2026-09-25 (`server/routes/generate/article.routes.ts`) :

| Constat | Où |
|---|---|
| Un appel IA par groupe H2, 15 s d'attente entre deux, budget de section enfin transmis en C4 | `article.routes.ts:133-243`, `_helpers.ts:37` |
| La raison d'arrêt (`max_tokens`) n'est lue nulle part : une coupure ne se voit qu'après coup | `claude.service.ts:179-197`, `ApiUsage` |
| La branche « 429 » de la route n'est jamais atteinte (le fournisseur convertit l'erreur) | `_helpers.ts:7-12`, `ai-provider.service.ts:154-165` |
| La porte `draft` est déclarée, sans vérificateur ; aucun générateur ne pose de marqueur « à sourcer » | `shared/verifiers/gate.ts:23,32`, `publish.ts:84-86` |
| Aucun contrôle de langue (hors « let me… »), de paragraphe répété, de chiffre sans source | `content-validators.ts` |
| La simulation écrit le même texte à chaque section, sous le titre du premier H2 | `mock-fixtures/auto-section-priority.ts` |

## Objectif (décision d'Arnaud du 2026-09-24)

1. **Premier jet en un seul appel**, sans recherche web : tout le sommaire, un budget par H2, la
   stratégie, les mots-clés et les règles du type, envoyés une fois.
2. **Aucun chiffre inventé** : un chiffre à sourcer est posé dans `<mark data-a-sourcer>` ; la passe
   « sources » (C5b) les remplacera.
3. **Progression inchangée à l'écran** : le serveur repère les `<h2>` dans le flux et réémet
   `section-start` / `section-done` ; le client, l'éditeur et la sauvegarde au fil ne changent pas.
4. **Coupure** : la raison d'arrêt est lue ; une coupure au plafond déclenche une continuation à
   partir du dernier H2 incomplet (2 au plus).
5. **Porte « premier jet »** (`draft`) : ⛔ capitaine absent du H1 ; 🔴 longueur hors ±15 % ;
   🔴 section hors de son budget ; 🔴 capitaine absent de l'introduction ; 🔴 phrase non française ;
   🔴 paragraphe répété ; 🔴 chiffre sans source hors marqueur. Évaluée après la génération ;
   l'alarme s'ouvre si elle ne passe pas.

## Lots

- **L1 — détecteurs purs** (`shared/verifiers/draft.ts` + `shared/text-quality.ts`) : langue,
  répétition, chiffres sans source, budgets de section (déplacés de `_helpers.ts` vers `shared/`).
- **L2 — raison d'arrêt** : `ApiUsage.stopReason` (`end` | `max_tokens` | `other`) pour Claude,
  Gemini, OpenRouter et la simulation.
- **L3 — suivi des H2 dans le flux** (`shared/html-stream.ts`) : un `<h2` coupé entre deux paquets.
- **L4 — route `POST /generate/article-draft`** + prompt `generate-article-draft.md` ; continuation ;
  l'ancienne boucle (`/generate/article`, `generate-article-section.md`) est retirée.
- **L5 — porte `draft`** côté serveur (`gate.service.ts`) ; publication : chiffres sans source,
  langue et répétition rejoints à ses règles de contenu.
- **L6 — client et mode automatique** : `editor.store` appelle le premier jet, puis la porte ;
  `scripts/auto-article/phases/redaction.ts` migré.
- **L7 — simulation réaliste** : un premier jet complet, un H2 par entrée du sommaire, au budget,
  texte varié, chiffres dans des marqueurs.

## Hors périmètre (C5b)

Réécriture d'une section (`/generate/section-rewrite`), passes d'enrichissement (sources avec URL,
exemples, tableaux, images, FAQ, relecture), extensions TipTap Table et Image.

## Livré (2026-09-25)

Branche `feat/redaction-premier-jet`, PR à ouvrir. Exigences versées au PRD et au registre : `FR-RED-DRAFT-SINGLE-PASS`, `FR-RED-DRAFT-TO-SOURCE` ; `FR-RED-ARTICLE` superseded ; amendées : `FR-RED-PUBLISH-GATE`, `FR-INFRA-VERIFIER-SHARED`, `FR-INFRA-GATE-WAIVER` ; deprecated : `NFR-PERF-INTER-SECTION-DELAY`, `NFR-CFG-INTER-SECTION-DELAY`, `NFR-CFG-WEB-SEARCH`.

### Commits par lot

| Lot | Commit | Contenu |
|---|---|---|
| L1 + L5 | `7900d08` feat(verificateurs): la porte « accepter le premier jet » et les détecteurs de qualité du texte | `shared/verifiers/draft.ts`, `shared/text-quality.ts`, `shared/section-budget.ts`, `draftGate` ; trois règles de qualité du texte à la publication |
| L2 | `c56a0cc` feat(ia): chaque fournisseur dit pourquoi il s'est arrêté | `ApiUsage.stopReason` pour Claude, Gemini, OpenRouter et la simulation |
| L3, L4, L6, L7 | `bef3f3f` feat(redaction): le premier jet s'écrit en un seul appel, sans chiffre inventé | `POST /generate/article-draft`, `generate-article-draft.md`, `shared/html-stream.ts`, reprise après coupure, porte évaluée par l'écran, marque TipTap `toSource`, `auto:article` migré, simulation réaliste ; ancienne boucle retirée ; cette tech-spec |

Suite unitaire complète verte ; 25 tests navigateur verts (bout-en-bout, éditeur, actions, portes). Parcours bout-en-bout simulé : 5 min → 1 min 30 (plus de pause de 15 s entre sections).

### Tests

- `tests/unit/shared/text-quality.test.ts`, `tests/unit/shared/verifiers-draft.test.ts` (L1 ; le vrai 1013 est refusé), `tests/unit/shared/verifiers-publish.test.ts` (chiffres sans source du 1013 à la publication).
- `tests/unit/services/claude.service.test.ts` (L2).
- `tests/unit/shared/html-stream.test.ts` (L3).
- `tests/unit/routes/generate.routes.test.ts`, bloc « POST /generate/article-draft » (L4 : un appel sans recherche web, progression, reprise sans doublon, deux reprises au plus, 400, erreur en flux).
- `tests/contract-api/gates.contract.test.ts`, porte `draft` (L5, serveur requis).
- `tests/unit/composables/article/useArticleGeneration.test.ts`, `tests/unit/stores/editor.store.test.ts` (L6).
- `tests/unit/services/mock-article-draft.test.ts` (L7, sur le vrai prompt).
- Routes migrées : `tests/contract-api/generate.contract.test.ts`, `tests/e2e-workflows/redaction.workflow.test.ts`, `tests/integration-tabs/redaction-editor.tab.test.ts`.

### Écarts avec le plan

- **H1 sans capitaine = 🔴, pas ⛔** (§Objectif 5 disait ⛔) : un titre peut intégrer le mot-clé sans le reprendre mot pour mot, comme `seo-capitaine-not-in-title` à la publication. Seul un H1 **absent** est ⛔ (`draft-h1-missing`). La porte contrôle aussi les défauts techniques du texte (⛔) et les preuves sociales invérifiables (🔴), comme la publication.
- **Pas de sauvegarde partielle côté serveur** : la route n'écrit rien en base ; la sauvegarde au fil reste celle de l'écran (`saveContenuPartiel` à chaque `section-done`), comme prévu en §Objectif 3.
- **Porte non rejouée à la publication** : sa règle ±15 % n'a plus de sens après les passes d'enrichissement. La publication rejuge langue, répétitions et chiffres avec ses propres règles ; les dérogations du premier jet n'y sont pas réaffichées.
- **Porte évaluée après la méta**, et non juste après la génération : `reviewDraft` suit le second `saveArticle` ; elle n'est pas évaluée si la méta échoue, ni par `auto:article`.
- **`stopReason` au-delà de Claude** : Gemini (`finishReason`), OpenRouter (`finish_reason`) et la simulation (`end`) le renseignent aussi. La simulation ne coupe jamais : la reprise n'est testée que sur la route.
- **Simulation sans chiffre ni marqueur** (L7 prévoyait « chiffres dans des marqueurs ») : le premier jet simulé n'en écrit aucun, si bien qu'aucun parcours ne montre un marqueur surligné dans l'éditeur ; la marque `toSource` n'a pas de test.
- **Reprise = réécriture du chapitre interrompu**, à partir de son `<h2>`, avec les 1 500 derniers caractères du texte gardé en contexte ; événement SSE `continuation { fromIndex, attempt }`, que l'écran n'écoute pas.
- **Retiré, pas archivé** : l'ancienne boucle et ses aides sont supprimées (l'épopée prévoyait de garder la route par section pour la réécriture ; C5b en fera une neuve).
- **Hors plan** : case « Recherche web » et `editorStore.webSearchEnabled` retirés des deux vues ; `ArticleKeywordsPanel.vue` lisait `--color-warning-text`, jeton jamais défini, remplacé par `--color-warning`.

### Découvert en chemin ou en documentant

- **R14** — `mergeConsecutiveElements` fusionne les `<p>` consécutifs en un seul, joints par `<br>` (rédaction, éditeur au chargement, affichage du flux) : structure HTML appauvrie. Le détecteur de répétitions en tient compte.
- **R15** — la branche 429 de `meta.routes.ts` n'est jamais atteinte : `ai-provider.service.ts` convertit un 429 en `AIProviderQuotaError` sans `status`. L'ancienne boucle de la rédaction avait le même défaut.
- **R16** — le premier jet vise `contentLengthRecommendation` (envoyée par l'écran, affichée par la barre de mots), la porte juge contre le micro-contexte, sinon le type : un premier jet conforme peut être signalé hors cible.
- **U1** — jetons CSS `--color-warning-bg`, `-text`, `-border`, `-soft` utilisés (dix fois, avec des couleurs de repli en dur) mais jamais définis.
- **U2** — le titre de l'alarme donne « Avant de accepter le premier jet ».
- `WEB_SEARCH_ENABLED` n'avait aucun effet même avant C5a (la valeur de la requête, `true` par défaut, passait avant) ; `.env.example` la documente encore.
- `FR-RED-GEN-SAUVEGARDE-AU-FIL`, citée par le code et un test, n'a jamais été écrite au PRD (dette `LEGACY_ORPHANS`) : son critère est porté par `FR-RED-DRAFT-SINGLE-PASS` ; écrire l'ID lui-même demandera de le retirer du cliquet dans le même changement.
- Registre : l'AC `AC.INTSO.1` citait une route `POST /generate/article-section` qui n'a jamais existé (corrigée) ; `DESIGN-PERF-INTER-SECTION-DELAY` attribuait les réessais à `claude.service.ts` (ils vivent dans `ai-provider.service.ts`).
- Documents encore à aligner (hors périmètre de cette clôture) : `docs/ARCHITECTURE_FLOWS.md`, `docs/ai-usage-map.md`, `docs/testing-guide.md`, `docs/ui-sections-guide.md`, `docs/pain-point-editorial-backbone.md`, `_bmad-output/planning-artifacts/architecture.md` citent encore `/generate/article`, `generate-article-section.md`, `INTER_SECTION_DELAY` ou `webSearchEnabled`.
