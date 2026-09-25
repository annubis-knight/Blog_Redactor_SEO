---
name: tech-spec-redaction-enrichissement
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C5, second temps ; R6, R9, R10 soldées, R16 soldée en entier ; FR-RED-LINKING-MANUAL non livrée, reste réservée)
  - _bmad-output/planning-artifacts/prd.md (FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE, FR-RED-LANG-REVIEW ; amendées : FR-RED-PUBLISH-GATE, FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE, FR-RED-WORD-COUNT-TARGET, FR-RED-EDITOR-TIPTAP, FR-RED-HUMANIZE-SECTION, FR-RED-PANELS-LAYOUT, FR-RED-CONTEXTUAL-ACTIONS, FR-EXT-AI-FALLBACK)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-RED-ENRICH-PASSES, DESIGN-RED-ENRICH-SOURCES, DESIGN-RED-SECTION-REWRITE, DESIGN-RED-LANG-REVIEW ; mises à jour : DESIGN-RED-PUBLISH-GATE, DESIGN-RED-WORD-COUNT-TARGET, DESIGN-RED-DRAFT-SINGLE-PASS, DESIGN-RED-DRAFT-TO-SOURCE, DESIGN-RED-EDITOR-TIPTAP, DESIGN-RED-HUMANIZE-SECTION, DESIGN-RED-PANELS-LAYOUT, DESIGN-RED-CONTEXTUAL-ACTIONS, DESIGN-EXT-AI-FALLBACK, DESIGN-EXT-CLAUDE, DESIGN-INFRA-PROMPT-LOADER, DESIGN-INFRA-PROMPT-LAYERS, DESIGN-INFRA-VERIFIER-SHARED, DESIGN-UI-ARTICLE-SHARED)
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

Branche `feat/redaction-enrichissement`, PR à ouvrir (avec C5a, `feat/redaction-premier-jet`). Exigences versées au PRD et au registre : `FR-RED-ENRICH-PASSES`, `FR-RED-ENRICH-SOURCES`, `FR-RED-SECTION-REWRITE`, `FR-RED-LANG-REVIEW`. Amendées : `FR-RED-PUBLISH-GATE` (⛔ image à fournir, marqueurs comptés une fois), `FR-RED-DRAFT-SINGLE-PASS` et `FR-RED-WORD-COUNT-TARGET` (R16 soldée à l'écran), `FR-RED-DRAFT-TO-SOURCE` (la passe Sources existe), `FR-RED-EDITOR-TIPTAP` (tableaux et images), `FR-RED-HUMANIZE-SECTION` (relecture de la langue), `FR-RED-PANELS-LAYOUT` (bouton « Enrichir »), `FR-RED-CONTEXTUAL-ACTIONS` et `FR-EXT-AI-FALLBACK` (recherche web sans repli). **Non livrée** : `FR-RED-LINKING-MANUAL` (maillage manuel), qui reste réservée dans l'épopée.

### Commits par lot

| Lot | Commit | Contenu |
|---|---|---|
| L1 | `fc36baa` feat(ia): la recherche web se localise, garde ses sources et ne se replie plus en silence | `webSearchTool(zone, maxUses = 3)` : `user_location` France, `Europe/Paris`, ville = premier segment de `theme_config.avatar.location` ; `webSourcesOf` lit les `web_search_result` du message final → `ApiUsage.webSources` ; `TOOL_CAPABLE_PROVIDERS = ['claude', 'mock']` : avec un outil, la chaîne de repli ne garde que Claude (et la simulation), sinon `AIProviderUnavailableError` « La recherche web exige Claude… » ; `collectStreamWithUsage` transmet les outils ; une fixture simulée peut renvoyer des `webSources` |
| L2, L3, L6 | `6dd3b74` feat(redaction): les passes d'enrichissement proposent un chapitre à la fois, déjà vérifié | `POST /generate/enrich/:pass` (sources, exemples, tableaux, images, faq) et `POST /generate/section-rewrite`, SSE « accumuler puis valider » ; `enrichment.service.ts` (`proposeChapter`, `pinNewImages`, `cleanProposal`, `proposalMaxTokens`) ; prompts `enrich-*.md`, `section-rewrite.md`, « Relecture de la langue » dans `humanize-section.md` ; `verifyEnrichment` ; `shared/chapters.ts` ; place « image à fournir » et ⛔ `image-to-provide` à la publication ; `countToSourceMarkers` ne compte plus deux fois un marqueur ; fixtures simulées (`mock-fixtures/enrichment.ts`) ; la simulation d'humanisation garde la structure |
| L5 | `e0b786f` feat(editeur): tableaux et images tiennent dans l'éditeur ; une passe ne perd ni bloc ni lien | `TableKit` (`resizable: false`) et `Image` (`inline: false`, `allowBase64: false`) 3.22.3, styles `editor.css` ; `colgroup` / `col` admis dans le corps (`content-validators.ts`) ; règle ⛔ `enrich-block-lost` ; consigne « blocs et liens conservés » dans les prompts ; lock régénéré sous Linux |
| L4 | `57fe1e8` feat(redaction): le panneau « Enrichir » propose, l'utilisateur accepte chapitre par chapitre | `EnrichmentPanel.vue` (bouton `toggle-enrich` dans `ArticlePanelsToolbar`, rendu par `ArticlePanelsResizable`, `usePanelToggle` id `enrich`, deux vues) ; `enrichment.store.ts` (`targetsFor`, `runPass`, `rewriteChapter`, `accept` protégé par le statut `stale`, `refuse`, `acceptAllClean`) ; **R16 côté écran** : `briefStore.targetWordCount` lu par `useArticleGeneration.wordCountTarget`, `SeoPanel` et `useSeoScoring` des deux vues, `BriefStructureStep` → `setRetainedWordCount` |
| L4, L6 | `b2a9cf8` test(redaction): parcours navigateur de l'enrichissement ; accepter enregistre aussitôt | `tests/browser-e2e/enrichment.browser.test.ts` ; le panneau enregistre après chaque acceptation et après la relecture (la vue « workflow » n'a pas d'enregistrement automatique) ; en-tête `AUTHORITY:` de `brief.store.ts` |

`test:check` : aucun nouveau rouge.

### Tests

- L1 : `tests/unit/services/claude.service.test.ts` (bloc « recherche web » : localisation, URL gardées sans doublon, `webSources` dans le bilan du flux), `tests/unit/services/ai-provider-tools.test.ts` (Claude épuisé → aucun repli ; Gemini principal → Claude ; aucun fournisseur capable → « recherche web exige Claude » ; sans outil, repli habituel).
- L2 : `tests/unit/shared/verifiers-enrichment.test.ts` (chaque règle, `keepKnownLinks`), `tests/unit/shared/chapters.test.ts`, `tests/unit/shared/verifiers-publish.test.ts` (⛔ image à fournir, marqueurs comptés une fois).
- L3 : `tests/unit/routes/enrich.routes.test.ts` (400, un seul événement `done`, erreur en événement `error`, consigne transmise), `tests/unit/services/enrichment.service.test.ts` (chaque passe simulée, recherche web seulement pour Sources, lien inventé retiré, proposition coupée bloquée, mise en forme, plafond de jetons), `tests/unit/architecture/prompt-variables.test.ts` (`articleText`, `chapterHtml`, `instruction` toujours échappés).
- L4 : `tests/unit/stores/enrichment.store.test.ts`, `tests/unit/components/enrichment-panel.test.ts` (accepter enregistre), `tests/unit/stores/brief.store.test.ts` et `tests/unit/composables/useArticleGeneration.test.ts` (R16).
- L5 : `tests/unit/components/editor-table-image.test.ts` (tableau et image survivent à l'éditeur, sortie admise, aucun faux défaut après un passage par l'éditeur).
- Parcours : `tests/browser-e2e/enrichment.browser.test.ts` (sources acceptées, tableau, image, enregistrement, publication refusée ⛔ `image-to-provide` ; réécriture sur consigne), en mode simulé.

### Écarts avec le plan

- **Une passe = un appel par chapitre visé**, pas un appel pour tout l'article : chaque chapitre est proposé, vérifié et accepté séparément, l'article entier servant de contexte (texte brut, coupé à 12 000 caractères). Les chapitres visés dépendent de la passe (`targetsFor`) : Sources, ceux qui portent un marqueur ou un chiffre sans source ; Exemples, Tableaux, Images, le corps sans chapeau, FAQ ni dernier chapitre (la conclusion) ; FAQ, un seul appel.
- **La FAQ est un chapitre neuf**, inséré avant la conclusion (le dernier H2 dès qu'il y en a deux), sinon à la fin ; aucune FAQ proposée si l'article en a déjà une.
- **« Relecture de la langue » = humanisation enrichie** : pas de passe séparée ni de proposition à accepter. `humanize-section.md` gagne une section « Relecture de la langue » (anglicismes, phrases anglaises, accords, typographie) ; le bouton du panneau appelle `editorStore.humanizeArticle`, qui s'applique directement, section par section, puis enregistre.
- **« Marqueurs qui ne se multiplient pas » non implémenté** : les prompts Exemples, Tableaux et FAQ autorisent un nouveau `<mark data-a-sourcer>` plutôt qu'un chiffre inventé ; seule la passe Sources signale un marqueur restant (🟠 `enrich-marker-remaining`).
- **Règles ajoutées au vérificateur** : ⛔ `enrich-empty`, `enrich-truncated`, `enrich-table-without-header`, `enrich-faq-malformed` et **`enrich-block-lost`** (`e0b786f` : un bloc à classe ou `data-*`, ou un lien, présent avant et absent après) ; 🔴 `enrich-non-french`, `enrich-faq-not-question` ; 🟠 `enrich-unchanged`. Une réécriture peut revoir ses H3, pas son H2 ; la FAQ n'est pas soumise au contrôle des titres.
- **Liens admis** : ceux de la recherche **et** ceux que le chapitre citait déjà (`knownSources`) — sinon une passe Exemples retirerait la source posée par la passe Sources.
- **Images** : le `src` proposé est toujours remplacé par la place `/images/image-a-fournir.svg` (`pinNewImages`) ; la publication refuse une place non remplacée (⛔ `image-to-provide`).
- **Écran** : panneau « Enrichir » (et non « Passes d'enrichissement »), réécriture dans le même panneau, bouton « Accepter celles sans alerte » (propositions sans aucune alerte, 🟠 compris), protection « chapitre modifié depuis » ; accepter enregistre aussitôt (`b2a9cf8`).
- **Hors plan** : R16 soldée à l'écran ; la simulation d'humanisation garde désormais la structure (elle ne rendait que le premier bloc, que la route rejetait) ; `countToSourceMarkers` comptait deux fois un marqueur balisé (balise + texte).
- **Non livré** : le maillage manuel (`FR-RED-LINKING-MANUAL`), cité dans l'épopée pour C5, n'a pas été traité.

### Découvert en chemin ou en documentant (non corrigé)

- **H1 non protégé** : `verifyEnrichment` ne compare que les H2 / H3 (H2 seul pour une réécriture, `shared/verifiers/enrichment.ts:126-127`) ; le chapeau (chapitre -1) porte le H1, et la passe Sources comme la réécriture peuvent le viser : un H1 modifié passe sans alerte.
- **Contexte coupé** : `articlePlainText(html, maxChars = 12000)` (`shared/chapters.ts:51`) ; au-delà d'environ 2 000 mots, la fin de l'article (conclusion comprise) n'est pas vue par les passes ni par la réécriture.
- **Sans stratégie** : `buildUserPrompt` appelle `loadPrompt` sans `cocoonSlug` (`enrichment.service.ts:64`) et `system-propulsite` est chargé de même (ligne 90) : ni la stratégie du cocon ni la douleur de l'article n'arrivent aux passes.
- **Arrêt `pause_turn` non vu** : `toStopReason` (`claude.service.ts:163-167`) range `pause_turn` (tour interrompu d'un outil serveur comme la recherche web) dans `other` ; `enrich-truncated` ne se déclenche que sur `max_tokens`. À vérifier en réel.
- **Actions contextuelles** : `sources-chiffrees` et `exemples-reels` utilisent `WEB_SEARCH_TOOL` sans ville (`action.routes.ts:51`) ; leurs `webSources` partent dans l'événement `done` mais personne ne les lit ni ne vérifie les liens (reste de R6 pour les actions).
- **Image à fournir sans moyen de la fournir** : aucune commande de l'éditeur ne permet d'insérer ou de remplacer une image (`setImage` absent de `src/`) ; pour publier, il faut supprimer la place dans l'éditeur (le message de la porte dit « remplacez l'image ou retirez-la »).
- **FAQ acceptée sans contrôle de fraîcheur** : `accept` insère la FAQ à l'index calculé lors de la proposition, sans vérifier que l'article n'a pas changé (`enrichment.store.ts:159-161`).
- **R16, cas limite** : sans longueur choisie, la cible retenue par le premier jet n'est relue par l'écran qu'au chargement suivant (`brief.store.ts:121-133`) ; si la recommandation de l'IA arrive après le lancement du premier jet, la barre affiche la nouvelle recommandation et la porte juge la valeur retenue.
- **Relecture de la langue sans test dédié** : ni la consigne ajoutée à `humanize-section.md`, ni le bouton `enrich-pass-langue` ne sont couverts.
- Documentation : `DESIGN-RED-HUMANIZE-SECTION` décrivait une humanisation parallèle, le code est séquentiel (`editor.store.ts`, boucle `for` avec `await`) ; le PRD disait qu'un arrêt garde les sections déjà humanisées, le code rend l'article d'avant ; `DESIGN-EXT-AI-FALLBACK` ne citait pas `AIProviderUnavailableError` parmi les erreurs qui font passer au fournisseur suivant (corrigés). `GUIDE-04-OUTILS.md:742` décrit encore un interrupteur de recherche web dans l'éditeur (hors périmètre de cette clôture).
- Documents alignés sur le premier jet et les passes : `docs/ARCHITECTURE_FLOWS.md`, `docs/ai-usage-map.md`, `docs/testing-guide.md`, `docs/ui-sections-guide.md`, `docs/pain-point-editorial-backbone.md`, `_bmad-output/planning-artifacts/architecture.md` ; `.env.example` n'annonce plus `WEB_SEARCH_ENABLED` comme active.
