---
status: référence
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Composants d'interface partagés

Chaque brique partagée existe en un seul fichier ; les écrans la montent avec des props. Aucun test ne compare aujourd'hui le rendu d'une même brique entre deux contextes : la cohérence repose sur l'absence de copie.

## Carte de mot-clé radar
*Exigences : FR-UI-RADAR-CARD · Design : DESIGN-UI-RADAR-CARD*

- **Code :** [`src/components/intent/RadarKeywordCard.vue`](../src/components/intent/RadarKeywordCard.vue) — props `card`, `interactiveWords`, `displayMode: 'kpi' | 'relevance'` (défaut `kpi`), `articleLevel`, `modifiers`, `manualTagMode`, `articlePainPoint`, `cardContext: 'radar' | 'capitaine'`, `paaJudgment`, `paaJudgmentLoading` ; calculs `kpiBreakdown` (`computeKpiScore`), `displayedScore`, `relevanceMissingReason`, `scoreLabel`, `breakdownRows`, `paaTree`. Pictogrammes d'intention : tracés `intentConfig[…].svg` (sans `<svg>` englobant) posés dans le `<svg>` du gabarit par `v-safe-svg` ; `sanitizeSvg` ([`src/directives/v-safe-html.ts`](../src/directives/v-safe-html.ts)) les assainit dans un `<svg>` provisoire et n'en rend que l'intérieur — lus hors contexte SVG, DOMPurify les retirait et l'icône sortait vide (recette du 2026-09-30, UI-1). Sous-composants [`radar-card/RadarCardScoreRing.vue`](../src/components/intent/radar-card/RadarCardScoreRing.vue), [`radar-card/RadarCardPaaTree.vue`](../src/components/intent/radar-card/RadarCardPaaTree.vue), `KeywordWords.vue`.
- **Enveloppes :** [`RadarCardCheckable.vue`](../src/components/intent/RadarCardCheckable.vue) (case, `update:checked`) ← [`scanner/DouleurScannerResults.vue`](../src/components/intent/scanner/DouleurScannerResults.vue) (`display-mode="kpi"`) ← [`RadarPanel.vue`](../src/components/intent/RadarPanel.vue), onglet Radar. [`RadarCardLockable.vue`](../src/components/intent/RadarCardLockable.vue) (cadenas, tag manuel, `recompute-relevance` affiché en mode `relevance`, voile « Validation… ») ← [`CaptainInteractiveWords.vue`](../src/components/moteur/CaptainInteractiveWords.vue) (`display-mode="relevance"`) ← [`captain/CaptainRadarList.vue`](../src/components/moteur/captain/CaptainRadarList.vue) ← [`CaptainPanel.vue`](../src/components/moteur/CaptainPanel.vue) (mode `workflow`). Usage direct dans `CaptainPanel.vue`, mode libre : `display-mode="relevance"`, `card-context="capitaine"`.
- **Données :** aucune ; tout vient des props. L'ouverture de l'arbre PAA est un état local (`expanded`, `expandedPaa`, `expandedParents`).
- **Règles et décisions :** pas de score de repli (`combinedScore` banni) : `null` → « — ». `displayMode` choisit le score de l'anneau ; `cardContext` ne change que la valeur PAA. Une enveloppe ajoute un geste, jamais un gabarit. Tests : `radar-card-checkable.test.ts`, `radar-card-lockable*.test.ts`, `captain-interactive-words.test.ts`.

## Panneaux d'IA
*Exigences : FR-UI-AI-PANELS-PATTERN · Design : DESIGN-UI-AI-PANELS-PATTERN*

- **Code :** [`src/components/moteur/ai-panel/AiPanel.vue`](../src/components/moteur/ai-panel/AiPanel.vue) — props `variant: 'suggestion' | 'advice'`, `title`, `subtitle`, `state`, `error`, `isStale`, `ctaLabel` (« Analyser avec l'IA »), `regenLabel` (« Régénérer »), `regenConfirmMessage`, `triggerDisabled`, `defaultCollapsed` (vrai) ; `hideUntilTriggered` est déclarée sans effet ; `watch(state)` déplie sur `streaming` / `error` ; slots `default`, `streaming`, `idle`. [`AiPanelHeader.vue`](../src/components/moteur/ai-panel/AiPanelHeader.vue). [`AiTriggerButton.vue`](../src/components/moteur/ai-panel/AiTriggerButton.vue) — `window.confirm(confirmMessage)` en variante `regen`. [`AiPanelSkeleton.vue`](../src/components/moteur/ai-panel/AiPanelSkeleton.vue). [`AiAdviceMarkdown.vue`](../src/components/moteur/ai-panel/AiAdviceMarkdown.vue) — `marked` + `DOMPurify`. [`AiSuggestionList.vue`](../src/components/moteur/ai-panel/AiSuggestionList.vue) — monté par aucun écran. [`src/composables/moteur/useAiPanel.ts`](../src/composables/moteur/useAiPanel.ts) — type `AiPanelState` (utilisé) et `useAiPanel` (appelé par aucun panneau).

| Panneau | Fichier | Structure | Condition de montage |
|---|---|---|---|
| Discovery | [`DiscoveryPanel.vue`](../src/components/moteur/DiscoveryPanel.vue) — `aiCtaDisabled`, `aiIdleMessage`, `aiCtaLabel` | `<AiPanel variant="suggestion">` | Aucune |
| Radar | [`RadarAiPanel.vue`](../src/components/moteur/RadarAiPanel.vue) — `useRadarRanking({ topN: 5 })` | `<section>` + `AiPanelHeader`, sans appel d'IA | Aucune |
| Capitaine | [`CaptainSidePanel.vue`](../src/components/moteur/CaptainSidePanel.vue) ; `CaptainPanel.vue` (mode libre) | `<AiPanel variant="advice">` | `<aside v-if="entry !== null">` ; mode libre : résultat présent |
| Lieutenants | [`LieutenantsAiPanel.vue`](../src/components/moteur/LieutenantsAiPanel.vue) dans [`lieutenants/LieutenantsResultsLayout.vue`](../src/components/moteur/lieutenants/LieutenantsResultsLayout.vue) | `<section>` + `AiPanelHeader` | `v-if="serpResult \|\| lieutenantCards.length > 0"` |
| Lexique | [`LexiqueAiPanel.vue`](../src/components/moteur/LexiqueAiPanel.vue) dans [`LexiquePanel.vue`](../src/components/moteur/LexiquePanel.vue) | `<AiPanel variant="suggestion">` | `v-if="tfidfResult"` |
| Rédaction | [`ArticleWorkflowIaBrief.vue`](../src/components/article/ArticleWorkflowIaBrief.vue) | Fait main (props `parsedBriefMarkdown`, `iaBriefStreaming`) | Bouton « IA Brief » |

- **Serveur :** les panneaux du Moteur qui appellent l'IA passent par `runAiPanelStream` (voir § 29, « Répartiteur d'IA et chaîne de secours »).
- **Tests :** [`tests/unit/components/moteur/ai-panels-persistence.test.ts`](../tests/unit/components/moteur/ai-panels-persistence.test.ts) — `AUDITED_PANELS` (Discovery, Radar, Capitaine, Lexique, Lieutenants) : import de `AiPanel` / `AiPanelHeader` et pas de `v-if` transitoire sur la balise `<AiPanel>` du fichier lui-même ; un `it.skip` pour la Rédaction. Le test ne voit pas les `v-if` posés par les parents.
- **Règles et décisions :** toute évolution de structure se fait dans `ai-panel/`, jamais dans un panneau. Capitaine en panneau latéral par carte : exception assumée. Radar : tri local sans IA, assumé.

## Briques partagées de la rédaction
*Exigences : FR-UI-ARTICLE-SHARED · Design : DESIGN-UI-ARTICLE-SHARED*

| Brique | Fichier | Vue guidée | Éditeur |
|---|---|---|---|
| Barre de panneaux | [`ArticlePanelsToolbar.vue`](../src/components/article/ArticlePanelsToolbar.vue) — props `hasBody`, `showBlocksButton`, `showIaBriefButton`, `showEnrichPanel` | Oui (`show-ia-brief-button`) | Oui (`show-blocks-button`) |
| Zone redimensionnable | [`ArticlePanelsResizable.vue`](../src/components/article/ArticlePanelsResizable.vue) (monte [`EnrichmentPanel.vue`](../src/components/panels/EnrichmentPanel.vue)) | Oui | Oui |
| Progression des sections | [`SectionProgressBar.vue`](../src/components/article/SectionProgressBar.vue) | Oui | Oui |
| Badges de coût | [`ArticleCostBadges.vue`](../src/components/article/ArticleCostBadges.vue) → [`ApiCostBadge.vue`](../src/components/shared/ApiCostBadge.vue) | Oui | Non |
| Compteur de mots | [`ArticleWordCountBar.vue`](../src/components/article/ArticleWordCountBar.vue) | Oui | Non |
| Messages d'action | [`ArticleEditorActionOverlays.vue`](../src/components/article/ArticleEditorActionOverlays.vue) | Non | Oui |
| Génération | [`useArticleGeneration.ts`](../src/composables/article/useArticleGeneration.ts) — `useArticleGeneration(deps)` | Oui | Oui |

- **Vues :** [`ArticleWorkflowView.vue`](../src/views/ArticleWorkflowView.vue) sur `/cocoon/:cocoonId/article/:articleId` ; [`ArticleEditorView.vue`](../src/views/ArticleEditorView.vue) sur `/article/:articleId/editor` ([`src/router/index.ts`](../src/router/index.ts)).
- **Règles et décisions :** une fonction d'édition partagée passe par une brique ou un composable de ce tableau ; pas de copie dans une vue. La génération elle-même relève de [Rédaction](17-redaction.md).

## Briques partagées du Moteur
*Exigences : FR-UI-MOTEUR-SHARED · Design : DESIGN-UI-MOTEUR-SHARED*

- **Code :** [`src/views/MoteurView.vue`](../src/views/MoteurView.vue) monte une fois [`MoteurContextRecap.vue`](../src/components/moteur/MoteurContextRecap.vue) (aussi monté par [`RedactionView.vue`](../src/views/RedactionView.vue)), puis, dans `div.cache-bar` (`v-if="selectedArticle"`), [`TabCachePanel.vue`](../src/components/moteur/TabCachePanel.vue) (`entries`, `activeTab`, `showClearCache` ; émet `clear-cache`) et [`TabLoadPrompt.vue`](../src/components/moteur/TabLoadPrompt.vue) (émet `load-db`, `load-cache`, `dismiss`). [`ProgressDots.vue`](../src/components/moteur/ProgressDots.vue) — `PHASE_GROUPS` (« Explorer », « Valider »), `MOTEUR_CHECKS` (6), monté par ligne d'article dans `MoteurContextRecap`. [`KeywordAssistPanel.vue`](../src/components/moteur/KeywordAssistPanel.vue) — `context`, `keywords`, `excludeKeywords`, `maxItems = 10`, monté par [`LieutenantsPanel.vue`](../src/components/moteur/LieutenantsPanel.vue) et [`LexiquePanel.vue`](../src/components/moteur/LexiquePanel.vue). Primitive [`CollapsableSection.vue`](../src/components/shared/CollapsableSection.vue), partagée par tout l'outil.
- **Logique :** [`src/utils/tab-cache-entries.ts`](../src/utils/tab-cache-entries.ts) — `buildTabCacheEntries(counts, ui)` (4 entrées ; `dbCount` depuis `GET /articles/:id/explorations/counts`, `cacheCount` > 0 seulement pour un scan Radar non persisté). [`src/composables/moteur/useTabLoadPrompt.ts`](../src/composables/moteur/useTabLoadPrompt.ts) — `current`, `loadFromDb`, `loadFromCache`, `dismiss` (réinitialisé à chaque changement d'onglet ou d'article). Purge : [`useMoteurArticleSync.ts`](../src/composables/moteur/useMoteurArticleSync.ts) → `DELETE /articles/:id/external-cache`.
- **Données :** `useArticleProgressStore` (points de progression), `useArticleKeywordsStore` et `useRadarExplorationStore` (compteurs, suggestions), `useCocoonStrategyStore` (récapitulatif) — détaillés dans [Moteur — cadre commun](12-moteur.md).
- **Règles et décisions :** une brique = un seul site de montage dans `MoteurView`, sauf `KeywordAssistPanel`, contextuel. Le bandeau de transition de phase a été supprimé ; le panier (`BasketStrip`) aussi.
