---
name: tech-spec-redaction-enrichissement
type: tech-spec
status: done
version: 1.1.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C5, second temps ; R6, R9, R10 soldées, R16 soldée en entier ; R17 à R24 et T12 soldées par le commit 093ee57 ; FR-RED-LINKING-MANUAL non livrée, reste réservée)
  - _bmad-output/planning-artifacts/prd.md (FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE, FR-RED-LANG-REVIEW ; amendées : FR-RED-PUBLISH-GATE, FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE, FR-RED-WORD-COUNT-TARGET, FR-RED-EDITOR-TIPTAP, FR-RED-HUMANIZE-SECTION, FR-RED-PANELS-LAYOUT, FR-RED-CONTEXTUAL-ACTIONS, FR-EXT-AI-FALLBACK ; puis, pour 093ee57 : FR-INFRA-TYPE-RULES-SSOT)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-RED-ENRICH-PASSES, DESIGN-RED-ENRICH-SOURCES, DESIGN-RED-SECTION-REWRITE, DESIGN-RED-LANG-REVIEW ; mises à jour : DESIGN-RED-PUBLISH-GATE, DESIGN-RED-WORD-COUNT-TARGET, DESIGN-RED-DRAFT-SINGLE-PASS, DESIGN-RED-DRAFT-TO-SOURCE, DESIGN-RED-EDITOR-TIPTAP, DESIGN-RED-HUMANIZE-SECTION, DESIGN-RED-PANELS-LAYOUT, DESIGN-RED-CONTEXTUAL-ACTIONS, DESIGN-EXT-AI-FALLBACK, DESIGN-EXT-CLAUDE, DESIGN-INFRA-PROMPT-LOADER, DESIGN-INFRA-PROMPT-LAYERS, DESIGN-INFRA-VERIFIER-SHARED, DESIGN-UI-ARTICLE-SHARED ; puis, pour 093ee57 : DESIGN-INFRA-TYPE-RULES-SSOT)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (qualite-seo-c5-redaction-deux-temps)
  - _bmad-output/implementation-artifacts/tech-spec-redaction-premier-jet.md (premier temps, C5a)
  - docs/prompts-reference.md (généré)
---

# Tech-spec — Rédaction en deux temps : les passes d'enrichissement (C5b)

## Contexte

Le premier jet (C5a) est écrit en un appel, sans recherche web : un chiffre à sourcer y est posé
dans `<mark data-a-sourcer>`. Il reste à l'enrichir, comme une rédaction professionnelle : sources,
exemples, tableaux, images, FAQ, relecture. Constats de la cartographie du 2026-09-25 :

| Constat | Où |
|---|---|
| La recherche web part sans lieu ni date (la Vendée, « 2024 » dans le 1013) | `WEB_SEARCH_TOOL`, `claude.service.ts:111-115` |
| Les URL trouvées sont jetées : seul le texte rédigé sort, le modèle peut citer une URL inventée | `claude-stream.ts:66` |
| En cas de repli vers Gemini ou OpenRouter, la recherche web est perdue sans rien dire | `ai-provider.service.ts:264-270` |
| TipTap n'a ni Table ni Image : un tableau ou une image est perdu dans l'éditeur | `ArticleEditor.vue:46-63` |
| Aucune réécriture d'une seule section qui voie l'article entier | — |

## Objectif

1. **Passes séquentielles, section par section**, chacune proposée et **acceptée ou refusée** par
   l'utilisateur : sources, exemples, tableaux, images, FAQ ; la relecture de langue réutilise
   l'humanisation.
2. **Sources réelles** : recherche web localisée (pays et ville de la zone, fuseau de Paris) et
   datée (`{{today}}`) ; chaque lien cité doit figurer parmi les résultats de la recherche, sinon il
   est retiré et signalé. Claude est obligatoire : sans lui, la passe échoue explicitement.
3. **Réécrire une section** en voyant l'article entier, avec une consigne libre.
4. **Tableaux et images** conservés par l'éditeur (extensions TipTap Table et Image).

## Lots

- **L1 — recherche web localisée, sources gardées** : `webSearchTool(zone)` avec `user_location` ;
  `ApiUsage.webSources` (url, titre, âge de la page) lus dans le message final ; pas de repli quand
  un outil est demandé (erreur explicite).
- **L2 — vérificateur de passe** (`shared/verifiers/enrichment.ts`) : titres H2/H3 inchangés, liens
  externes ∈ sources de la recherche, marqueurs « à sourcer » qui ne se multiplient pas, aucun chiffre
  sans source ajouté, `alt` présent sur chaque image, FAQ en questions.
- **L3 — routes** `POST /generate/enrich/:pass` et `POST /generate/section-rewrite` + prompts.
- **L4 — écran** : panneau « Passes d'enrichissement » (proposition par section, accepter / refuser,
  enregistrer) et « Réécrire une section ».
- **L5 — éditeur** : `@tiptap/extension-table` et `@tiptap/extension-image` (3.22.3), styles.
- **L6 — simulation** réaliste de chaque passe, tests, doc.

## Livré (2026-09-25)

Branche `feat/redaction-enrichissement`, PR à ouvrir (avec C5a, `feat/redaction-premier-jet`). Exigences versées au PRD et au registre : `FR-RED-ENRICH-PASSES`, `FR-RED-ENRICH-SOURCES`, `FR-RED-SECTION-REWRITE`, `FR-RED-LANG-REVIEW`. Amendées : `FR-RED-PUBLISH-GATE` (⛔ image à fournir, marqueurs comptés une fois), `FR-RED-DRAFT-SINGLE-PASS` et `FR-RED-WORD-COUNT-TARGET` (R16 soldée à l'écran), `FR-RED-DRAFT-TO-SOURCE` (la passe Sources existe), `FR-RED-EDITOR-TIPTAP` (tableaux et images), `FR-RED-HUMANIZE-SECTION` (relecture de la langue), `FR-RED-PANELS-LAYOUT` (bouton « Enrichir »), `FR-RED-CONTEXTUAL-ACTIONS` et `FR-EXT-AI-FALLBACK` (recherche web sans repli). **Non livrée** : `FR-RED-LINKING-MANUAL` (maillage manuel), qui reste réservée dans l'épopée. **Correctifs après la documentation** (commit `093ee57`, R17 à R24 et T12) : `FR-INFRA-TYPE-RULES-SSOT` amendée (règle de FAQ par type) ; `FR-RED-ENRICH-PASSES`, `FR-RED-ENRICH-SOURCES`, `FR-RED-SECTION-REWRITE`, `FR-RED-CONTEXTUAL-ACTIONS`, `FR-RED-PUBLISH-GATE`, `FR-RED-EDITOR-TIPTAP`, `FR-RED-DRAFT-SINGLE-PASS`, `FR-RED-WORD-COUNT-TARGET`, `FR-RED-LANG-REVIEW` : limites retirées ou réécrites.

### Commits par lot

| Lot | Commit | Contenu |
|---|---|---|
| L1 | `fc36baa` feat(ia): la recherche web se localise, garde ses sources et ne se replie plus en silence | `webSearchTool(zone, maxUses = 3)` : `user_location` France, `Europe/Paris`, ville = premier segment de `theme_config.avatar.location` ; `webSourcesOf` lit les `web_search_result` du message final → `ApiUsage.webSources` ; `TOOL_CAPABLE_PROVIDERS = ['claude', 'mock']` : avec un outil, la chaîne de repli ne garde que Claude (et la simulation), sinon `AIProviderUnavailableError` « La recherche web exige Claude… » ; `collectStreamWithUsage` transmet les outils ; une fixture simulée peut renvoyer des `webSources` |
| L2, L3, L6 | `6dd3b74` feat(redaction): les passes d'enrichissement proposent un chapitre à la fois, déjà vérifié | `POST /generate/enrich/:pass` (sources, exemples, tableaux, images, faq) et `POST /generate/section-rewrite`, SSE « accumuler puis valider » ; `enrichment.service.ts` (`proposeChapter`, `pinNewImages`, `cleanProposal`, `proposalMaxTokens`) ; prompts `enrich-*.md`, `section-rewrite.md`, « Relecture de la langue » dans `humanize-section.md` ; `verifyEnrichment` ; `shared/chapters.ts` ; place « image à fournir » et ⛔ `image-to-provide` à la publication ; `countToSourceMarkers` ne compte plus deux fois un marqueur ; fixtures simulées (`mock-fixtures/enrichment.ts`) ; la simulation d'humanisation garde la structure |
| L5 | `e0b786f` feat(editeur): tableaux et images tiennent dans l'éditeur ; une passe ne perd ni bloc ni lien | `TableKit` (`resizable: false`) et `Image` (`inline: false`, `allowBase64: false`) 3.22.3, styles `editor.css` ; `colgroup` / `col` admis dans le corps (`content-validators.ts`) ; règle ⛔ `enrich-block-lost` ; consigne « blocs et liens conservés » dans les prompts ; lock régénéré sous Linux |
| L4 | `57fe1e8` feat(redaction): le panneau « Enrichir » propose, l'utilisateur accepte chapitre par chapitre | `EnrichmentPanel.vue` (bouton `toggle-enrich` dans `ArticlePanelsToolbar`, rendu par `ArticlePanelsResizable`, `usePanelToggle` id `enrich`, deux vues) ; `enrichment.store.ts` (`targetsFor`, `runPass`, `rewriteChapter`, `accept` protégé par le statut `stale`, `refuse`, `acceptAllClean`) ; **R16 côté écran** : `briefStore.targetWordCount` lu par `useArticleGeneration.wordCountTarget`, `SeoPanel` et `useSeoScoring` des deux vues, `BriefStructureStep` → `setRetainedWordCount` |
| L4, L6 | `b2a9cf8` test(redaction): parcours navigateur de l'enrichissement ; accepter enregistre aussitôt | `tests/browser-e2e/enrichment.browser.test.ts` ; le panneau enregistre après chaque acceptation et après la relecture (la vue « workflow » n'a pas d'enregistrement automatique) ; en-tête `AUTHORITY:` de `brief.store.ts` |
| Correctifs | `093ee57` fix(redaction): les défauts relevés en documentant C5b (R17 à R24, T12) | R17 : `enrich-headings-changed` compare aussi le H1 (niveaux `123`, `12` pour la réécriture ; `shared/verifiers/enrichment.ts:128-140`). R18 : `ARTICLE_CONTEXT_MAX_CHARS = 30_000` (`enrichment.service.ts:45-49,71`) ; la route lit l'article (404 s'il est inconnu), la stratégie de l'article sinon du cocon (`getStrategy`, `getCocoonStrategy`, `pickStrategyContext` ; `enrich.routes.ts:28-47`), bloc `{{#strategyContext}}` dans les six prompts. R19 : `truncated` = tout `stopReason` connu autre que `end` (`enrichment.service.ts:121-123`). R20 : bouton « Image » (`EditorToolbar.vue:17-29,122-130`) ; message de `image-to-provide` (`publish.ts:157`). R21 : `action.routes.ts:51-80` — `webSearchTool(zone)`, texte accumulé puis `keepKnownLinks(…, knownSources(selectedText, usage.webSources))`, un seul `chunk`, keep-alive 15 s ; `webSearchTool` réexporté par `ai-provider.service.ts:44`. R22 : `faqMin` / `faqMax` (`article-type-rules.ts:40-42`, pilier 4-6, intermédiaire 3-5, spécialisé 3-4), ligne FAQ de `describeTypeRules` (94), `{{type_rules}}` dans `enrich-faq.md`, 🟠 `enrich-faq-count` (`enrichment.ts:189-193`). R23 : `EnrichmentItem.anchor`, FAQ non insérée (`stale`) si la conclusion a changé ou si une FAQ existe (`enrichment.store.ts:37-42,109,167-173`). R24 : `briefStore.setRetainedWordCount(target)` après le premier jet (`useArticleGeneration.ts:114-118`). T12 : `mock-humanize.test.ts`, bouton `enrich-pass-langue` dans `enrichment-panel.test.ts` |

`test:check` : aucun nouveau rouge.

### Tests

- L1 : `tests/unit/services/claude.service.test.ts` (bloc « recherche web » : localisation, URL gardées sans doublon, `webSources` dans le bilan du flux), `tests/unit/services/ai-provider-tools.test.ts` (Claude épuisé → aucun repli ; Gemini principal → Claude ; aucun fournisseur capable → « recherche web exige Claude » ; sans outil, repli habituel).
- L2 : `tests/unit/shared/verifiers-enrichment.test.ts` (chaque règle, `keepKnownLinks`), `tests/unit/shared/chapters.test.ts`, `tests/unit/shared/verifiers-publish.test.ts` (⛔ image à fournir, marqueurs comptés une fois).
- L3 : `tests/unit/routes/enrich.routes.test.ts` (400, un seul événement `done`, erreur en événement `error`, consigne transmise), `tests/unit/services/enrichment.service.test.ts` (chaque passe simulée, recherche web seulement pour Sources, lien inventé retiré, proposition coupée bloquée, mise en forme, plafond de jetons), `tests/unit/architecture/prompt-variables.test.ts` (`articleText`, `chapterHtml`, `instruction` toujours échappés).
- L4 : `tests/unit/stores/enrichment.store.test.ts`, `tests/unit/components/enrichment-panel.test.ts` (accepter enregistre), `tests/unit/stores/brief.store.test.ts` et `tests/unit/composables/useArticleGeneration.test.ts` (R16).
- L5 : `tests/unit/components/editor-table-image.test.ts` (tableau et image survivent à l'éditeur, sortie admise, aucun faux défaut après un passage par l'éditeur).
- Parcours : `tests/browser-e2e/enrichment.browser.test.ts` (sources acceptées, tableau, image, enregistrement, publication refusée ⛔ `image-to-provide` ; réécriture sur consigne), en mode simulé.
- Correctifs `093ee57` : `tests/unit/shared/verifiers-enrichment.test.ts` (⛔ H1 du chapeau modifié, passe comme réécriture), `tests/unit/services/enrichment.service.test.ts` (FAQ au nombre du type, 🟠 hors fourchette, stratégie et fin d'un long article dans le prompt, arrêt autre que `end` ⛔), `tests/unit/routes/enrich.routes.test.ts` (404 sur un article inconnu, type et stratégie transmis), `tests/unit/routes/generate.routes.test.ts` (action « sources chiffrées » localisée, lien inventé jamais envoyé), `tests/unit/components/EditorToolbar.test.ts` (bouton « Image »), `tests/unit/stores/enrichment.store.test.ts` (FAQ non insérée si la conclusion a changé), `tests/unit/composables/useArticleGeneration.test.ts` (longueur gardée après le premier jet), `tests/unit/services/mock-humanize.test.ts` et `tests/unit/components/enrichment-panel.test.ts` (relecture de la langue), `tests/unit/coherence/type-rules-ssot.test.ts` (ligne FAQ des règles du type), `tests/unit/architecture/prompt-variables.test.ts` (une lecture de propriété n'est plus prise pour une clé fournie).

### Écarts avec le plan

- **Une passe = un appel par chapitre visé**, pas un appel pour tout l'article : chaque chapitre est proposé, vérifié et accepté séparément, l'article entier servant de contexte (texte brut, coupé à 12 000 caractères à la livraison, 30 000 depuis `093ee57`). Les chapitres visés dépendent de la passe (`targetsFor`) : Sources, ceux qui portent un marqueur ou un chiffre sans source ; Exemples, Tableaux, Images, le corps sans chapeau, FAQ ni dernier chapitre (la conclusion) ; FAQ, un seul appel.
- **La FAQ est un chapitre neuf**, inséré avant la conclusion (le dernier H2 dès qu'il y en a deux), sinon à la fin ; aucune FAQ proposée si l'article en a déjà une.
- **« Relecture de la langue » = humanisation enrichie** : pas de passe séparée ni de proposition à accepter. `humanize-section.md` gagne une section « Relecture de la langue » (anglicismes, phrases anglaises, accords, typographie) ; le bouton du panneau appelle `editorStore.humanizeArticle`, qui s'applique directement, section par section, puis enregistre.
- **« Marqueurs qui ne se multiplient pas » non implémenté** : les prompts Exemples, Tableaux et FAQ autorisent un nouveau `<mark data-a-sourcer>` plutôt qu'un chiffre inventé ; seule la passe Sources signale un marqueur restant (🟠 `enrich-marker-remaining`).
- **Règles ajoutées au vérificateur** : ⛔ `enrich-empty`, `enrich-truncated`, `enrich-table-without-header`, `enrich-faq-malformed` et **`enrich-block-lost`** (`e0b786f` : un bloc à classe ou `data-*`, ou un lien, présent avant et absent après) ; 🔴 `enrich-non-french`, `enrich-faq-not-question` ; 🟠 `enrich-unchanged`. Une réécriture peut revoir ses H3, pas son H2 ; la FAQ n'est pas soumise au contrôle des titres.
- **Liens admis** : ceux de la recherche **et** ceux que le chapitre citait déjà (`knownSources`) — sinon une passe Exemples retirerait la source posée par la passe Sources.
- **Images** : le `src` proposé est toujours remplacé par la place `/images/image-a-fournir.svg` (`pinNewImages`) ; la publication refuse une place non remplacée (⛔ `image-to-provide`).
- **Écran** : panneau « Enrichir » (et non « Passes d'enrichissement »), réécriture dans le même panneau, bouton « Accepter celles sans alerte » (propositions sans aucune alerte, 🟠 compris), protection « chapitre modifié depuis » ; accepter enregistre aussitôt (`b2a9cf8`).
- **Hors plan** : R16 soldée à l'écran ; la simulation d'humanisation garde désormais la structure (elle ne rendait que le premier bloc, que la route rejetait) ; `countToSourceMarkers` comptait deux fois un marqueur balisé (balise + texte).
- **Non livré** : le maillage manuel (`FR-RED-LINKING-MANUAL`), cité dans l'épopée pour C5, n'a pas été traité.

### Découvert en chemin ou en documentant — soldé par le commit `093ee57`

Relevés à la clôture de la documentation (checklist de l'épopée R17 à R24, T12), tous corrigés dans `093ee57` ; lignes « avant » au commit `7f54d86`, « après » au commit `093ee57`.

- ~~**H1 non protégé**~~ (R17, soldé) : `verifyEnrichment` ne comparait que les H2 / H3 (H2 seul pour une réécriture) alors que le chapeau (chapitre -1) porte le H1. Désormais niveaux `123` pour une passe, `12` pour une réécriture (`shared/verifiers/enrichment.ts:128-140`) : un H1 modifié est ⛔.
- ~~**Contexte coupé**~~ (R18, soldé) : `articlePlainText(html, maxChars = 12000)` coupait vers 2 000 mots. Le service passe `ARTICLE_CONTEXT_MAX_CHARS = 30_000` (`enrichment.service.ts:45-49,71`).
- ~~**Sans stratégie**~~ (R18, soldé) : `loadPrompt` était appelé sans `cocoonSlug`. La route lit désormais la stratégie de l'article, sinon celle du cocon (`enrich.routes.ts:39-47`, `pickStrategyContext`), transmise par `{{strategyContext}}` aux six prompts ; `system-propulsite` reste chargé sans stratégie, comme ailleurs.
- ~~**Arrêt `pause_turn` non vu**~~ (R19, soldé) : `enrich-truncated` ne se déclenchait que sur `max_tokens`. Tout `stopReason` connu autre que `end` coupe désormais la proposition (`enrichment.service.ts:121-123`), quel que soit le comportement réel de `pause_turn`.
- ~~**Actions contextuelles**~~ (R21, soldé) : `sources-chiffrees` et `exemples-reels` cherchaient sans ville et personne ne vérifiait leurs liens. Désormais `webSearchTool(zone)`, texte accumulé, liens filtrés par `keepKnownLinks`, un seul `chunk`, keep-alive 15 s (`action.routes.ts:51-80`). Reste : un lien retiré n'est que journalisé.
- ~~**Image à fournir sans moyen de la fournir**~~ (R20, soldé) : bouton « Image » de la barre d'outils (`EditorToolbar.vue:17-29,122-130`) ; le message de la porte le cite (`publish.ts:157`). Reste : pas d'insertion de tableau à la main ; bouton absent de la vue workflow, qui n'a pas d'éditeur.
- ~~**FAQ acceptée sans contrôle de fraîcheur**~~ (R23, soldé) : `EnrichmentItem.anchor` garde le chapitre d'insertion ; s'il a changé ou si une FAQ existe déjà, la proposition passe `stale` (`enrichment.store.ts:37-42,109,167-173`).
- ~~**Nombre de questions de FAQ hors des règles par type**~~ (R22, soldé) : « 3 à 6 » était écrit dans `enrich-faq.md`. Désormais `faqMin` / `faqMax` (`article-type-rules.ts:40-42`), `{{type_rules}}` dans le prompt, 🟠 `enrich-faq-count`.
- ~~**R16, cas limite**~~ (R24, soldé) : la cible retenue n'était relue par l'écran qu'au chargement suivant. `useArticleGeneration` pose la cible envoyée après un premier jet sans erreur (`useArticleGeneration.ts:114-118`).
- ~~**Relecture de la langue sans test dédié**~~ (T12, soldé) : `tests/unit/services/mock-humanize.test.ts` (consigne et simulation), bouton `enrich-pass-langue` dans `tests/unit/components/enrichment-panel.test.ts`.
- Documentation : `DESIGN-RED-HUMANIZE-SECTION` décrivait une humanisation parallèle, le code est séquentiel (`editor.store.ts`, boucle `for` avec `await`) ; le PRD disait qu'un arrêt garde les sections déjà humanisées, le code rend l'article d'avant ; `DESIGN-EXT-AI-FALLBACK` ne citait pas `AIProviderUnavailableError` parmi les erreurs qui font passer au fournisseur suivant (corrigés). `GUIDE-04-OUTILS.md:742` décrit encore un interrupteur de recherche web dans l'éditeur (hors périmètre de cette clôture).
- Documents alignés sur le premier jet et les passes : `docs/ARCHITECTURE_FLOWS.md`, `docs/ai-usage-map.md`, `docs/testing-guide.md`, `docs/ui-sections-guide.md`, `docs/pain-point-editorial-backbone.md`, `_bmad-output/planning-artifacts/architecture.md` ; `.env.example` n'annonce plus `WEB_SEARCH_ENABLED` comme active.
