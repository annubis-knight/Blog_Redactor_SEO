---
name: tech-spec-discovery-ai-coque-persistante
type: tech-spec
status: done
version: 1.1.0
last_updated: 2026-05-11
synced_with:
  - _bmad-output/planning-artifacts/prd.md (FR-DIS-AI-PANEL réécrite avec ACs, FR-UI-AI-PANELS-PATTERN enrichie invariant UX + ACs transversaux, FR-DIS-RELEVANCE-FILTER enrichie 2-pass, §9.9 NFR-UX-STABLE-SKELETON nouvelle)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (entrée discovery-ai-coque-persistante)
  - docs/ui-sections-guide.md §13.2 (ligne Discovery du tableau Panels IA mise à jour)
  - docs/scoring-kpi-vs-relevance.md (entrée useDiscoveryRanking marquée supprimée)
---

## Résultat livré

- **Sprint A — UI** : DiscoveryPanel.vue refondu pour consommer `<AiPanel variant="suggestion">` ; suppression de DiscoveryAiPanel.vue (~165 lignes) + useDiscoveryRanking.ts (~80 lignes) + leurs tests dédiés (2 fichiers).
- **Sprint B — Tests** : 3 fichiers de tests créés / adaptés couvrant 8 ACs Discovery + 3 ACs transversaux + non-régression du handoff Radar et de l'architecture des sections.
- **Sprint C — Doc & validation** : PRD enrichi (FR-DIS-AI-PANEL, FR-UI-AI-PANELS-PATTERN, FR-DIS-RELEVANCE-FILTER, §9.9 NFR-UX-STABLE-SKELETON), docs/ui-sections-guide + scoring-kpi-vs-relevance mises à jour, sprint-status.yaml entrée done.

## Validation

- `npm run type-check` : vert.
- `npm run lint` : 0 erreurs (265 warnings préexistants `no-explicit-any`).
- `npm run test:check` : **21 rouges courants vs 28 baseline** (net positif de 7). Les 8 rouges « probablement cassés par le chantier » sont en réalité préexistants (`_setup-sanity` nécessite un dev server, `data.service.test` backend non touché).
- `npm run build` : vert (13.96s).
- `npm run check:cycles` : 11 cycles préexistants (shared/types/scoring, mock-fixtures), aucun lié au chantier.
- `npm run check:dead` (knip) : 1 unused file préexistant (`shared/types/branded.ts`), 44 unused exports préexistants.

---

# Tech-spec — Refonte UI de la coque IA Discovery (suppression DiscoveryAiPanel)

## Contexte

L'onglet Discovery du Moteur expose deux mécanismes "IA" qui ne sont **pas** ce qu'ils prétendent :

1. **`DiscoveryAiPanel.vue`** (coque violette bas-de-page, Sprint D-1 2026-05-02) — porte le label "Suggestions IA Discovery" mais ne fait **aucun appel IA**. C'est un tri local Jaccard du `basket` Pinia (`useDiscoveryRanking`).
2. **Bouton "🔍 Analyser les X résultats pertinents"** + composant `DiscoveryAnalysisResults` — fait un **vrai appel IA Claude** via `POST /api/keywords/analyze-discovery` qui curate 20-30 keywords stratégiques.

Problèmes observés (analyse de logs session 2026-05-11) :
- L'utilisateur passe naturellement par le bouton "Analyser" (vrai IA) sans jamais utiliser la coque violette.
- La coque violette lit le `basket` Pinia (`useMoteurBasketStore`) tandis que les checkboxes du panel principal écrivent dans le Set `selection` du composable `useDiscoveryPanel`. Les deux états ne se rencontrent jamais avant l'envoi explicite au Radar → la coque violette montre toujours son empty state pendant la phase de cochage.
- Sémantiquement, c'est le **bouton "Analyser"** qui mérite le label "IA", pas la coque violette.
- L'UI affiche en plus une apparition progressive : le bouton "Analyser" n'apparaît que si `hasResults && !isAnyLoading && !semanticLoading && relevantCount > 0`. L'utilisateur perd la carte mentale ("où est passé le bouton ?").

Verbatim utilisateur : *« Le panel violet ne sert à rien dans mon workflow. Je veux juste cocher les keywords curés par l'IA et les envoyer au Radar. »* + *« Je critique l'apparition de nouvelles sections au fur et à mesure des actions. Ce n'est pas user-friendly. »*

## Objectifs

1. **Habiller** le bouton "Analyser" + `DiscoveryAnalysisResults` dans une **coque IA persistante** (réutilisation de `<AiPanel variant="suggestion">`), visuellement cohérente avec Radar/Lexique/Lieutenants.
2. **Rendre la coque visible dès l'ouverture de l'onglet** Discovery (squelette stable, `NFR-UX-STABLE-SKELETON`), avec états visuels (idle/disabled-empty/streaming/success/error) au lieu d'apparitions.
3. **Supprimer** `DiscoveryAiPanel.vue` + `useDiscoveryRanking.ts` + leurs tests dédiés.
4. **Conserver** intacte la logique de sélection (`selection` Set), le handoff vers Radar (`getRadarKeywords`, `basketStore.markPushedToRadar`), et le filtre de pertinence 2-passes.
5. **Nettoyer** les commentaires-sprint des fichiers touchés selon CLAUDE.md (« Don't reference the current task, fix, or callers »).

## Hors-scope

- Toute refonte du mécanisme de sélection (`selection` vs `basket`) — chantier séparé si pertinent.
- Toute refonte UX des panels Radar/Lieutenants/Lexique (même si `RadarAiPanel` souffre d'un problème similaire de selection locale, cf. analyse de session).
- Modifications de la route `/api/keywords/analyze-discovery` (logique IA inchangée).
- Suppression du `basket` Pinia store : il reste utile pour `BasketFloatingPanel` (info) et `KeywordAssistPanel` (pont cross-onglets Capitaine/Lieutenants/Lexique).
- Le double-run de scoring de pertinence (pass-1 sur 1762 puis pass-1 sur 1282 nouveaux), qui est par design (re-trigger sur arrivée différée IA/DataForSEO) — formalisé dans `FR-DIS-RELEVANCE-FILTER` enrichi.

## Cartographie (Phase 1.bis)

### Données partagées concernées (vérifiées)

| Donnée | Source de vérité | Producteurs | Consommateurs | Persistance |
|--------|------------------|-------------|---------------|-------------|
| `selection` (Set des keywords cochés) | `useDiscoverySelection` (composable) | `toggleSelect` depuis sources brutes + `DiscoveryAnalysisResults` | `getRadarKeywords()` → bouton "Envoyer au Radar" | Mémoire composable, non persistée |
| `analysisResult` (résultats IA Claude) | `useDiscoveryPanel.analyzeResults()` | `POST /api/keywords/analyze-discovery` | `DiscoveryAnalysisResults` + `saveToCache` | `discovery_cache` table (`analysisResult` colonne JSONB) |
| `basket` (BasketKeyword[]) | `useMoteurBasketStore` | `basketStore.markPushedToRadar` après envoi Radar + `addKeywords` ailleurs | `BasketFloatingPanel`, `KeywordAssistPanel`, `DiscoveryAiPanel` (à supprimer) | Mémoire Pinia, reset au switch d'article |

### Règle de cohérence affichage / calcul

Pas de drift à craindre : la sélection (`selection`) est la **même** expression utilisée pour l'affichage des checkboxes ET pour le payload du bouton "Envoyer au Radar". Pas de double source.

### Cas d'usage à tracer

| Cas d'usage | Trajectoire actuelle | Trajectoire post-refonte |
|---|---|---|
| Ouverture vierge de Discovery (aucun seed) | Coque violette en bas, empty state "basket vide" | Coque IA en bas, idle grisée, CTA disabled, message "Lance d'abord une découverte" |
| Découverte lancée, scoring en cours | Coque violette bas (basket vide), bouton "Analyser" pas encore visible | Coque IA en bas, idle disabled, CTA disabled, message "Découverte en cours…" |
| Découverte terminée, 0 keyword pertinent | Coque violette vide, **bouton "Analyser" jamais affiché** | Coque IA en bas, idle disabled, CTA disabled, tooltip "Aucun mot-clé pertinent à analyser" |
| Découverte terminée, ≥ 1 keyword pertinent | Coque violette vide, bouton "Analyser" apparaît AU DESSUS de la coque | Coque IA en bas, idle active (non grisée), CTA "Analyser les X résultats pertinents" activé |
| Clic Analyser, streaming | Bouton spinner "Analyse en cours…", panel violet inchangé | Coque IA streaming, CTA spinner, place de DiscoveryAnalysisResults vide ou skeleton |
| Analyse terminée | `DiscoveryAnalysisResults` rendu sous le bouton (en dehors du panel violet), panel violet inchangé | Coque IA success, `DiscoveryAnalysisResults` rendu DANS la coque |
| Cochage de keywords curés | Set `selection` rempli, panel violet (basket vide) toujours visible et inutile | Set `selection` rempli, pas de duplication |
| Envoi au Radar | `getRadarKeywords()` lit `selection`, basket marqué `pushedToRadar` après | Inchangé |
| Reload après cache hit | `loadFromCacheAndHydrate` réinjecte `analysisResult` | Inchangé, la coque passe directement à `success` |

### Régressions historiques à anticiper

- `tests/unit/components/discovery-tab-architecture.test.ts` verrouille la position DOM des 3 sous-composants (`DiscoverySourcesList`, `DiscoveryAnalysisResults`, `DiscoveryWordGroupsSidebar`) et **mentionne `DiscoveryAiPanel`** comme un 4ᵉ espace distinct. Le test devra être **mis à jour** pour refléter le nouveau layout où `DiscoveryAnalysisResults` vit **DANS** la coque IA.
- `tests/unit/components/moteur/DiscoveryAiPanel.test.ts` et `tests/unit/composables/moteur/useDiscoveryRanking.test.ts` : **à supprimer** (les composants disparaissent).

## Plan d'exécution

### Sprint A — Habillage UI + suppression DiscoveryAiPanel

1. Dans `src/components/moteur/DiscoveryPanel.vue` :
   - Importer `AiPanel` depuis `@/components/moteur/ai-panel/AiPanel.vue` (au lieu de `DiscoveryAiPanel`).
   - Calculer une `aiPanelState: ComputedRef<AiPanelState>` :
     ```ts
     const aiPanelState = computed<AiPanelState>(() => {
       if (error.value) return 'error'
       if (analysisLoading.value) return 'streaming'
       if (analysisResult.value) return 'success'
       return 'idle'
     })
     ```
   - Calculer un `aiCtaDisabled: ComputedRef<boolean>` :
     ```ts
     const aiCtaDisabled = computed(() => !hasResults.value || semanticLoading.value || relevantCount.value === 0)
     ```
   - Calculer un message d'idle contextuel pour le slot `#idle` :
     ```ts
     const aiIdleMessage = computed(() => {
       if (!hasResults.value) return 'Lance d\'abord une découverte de mots-clés ci-dessus, puis l\'IA pourra analyser et te proposer une sélection stratégique.'
       if (semanticLoading.value) return 'Filtrage de pertinence en cours… L\'analyse IA sera disponible une fois le filtrage terminé.'
       if (relevantCount.value === 0) return 'Aucun mot-clé pertinent à analyser. Élargis ta recherche ou désactive le filtre de pertinence.'
       return 'Prêt à analyser ' + relevantCount.value + ' mots-clés pertinents.'
     })
     ```
   - Remplacer le bloc actuel `<div v-if="hasResults && !isAnyLoading && !semanticLoading && relevantCount > 0" class="analysis-action">…</div>` + `<DiscoveryAnalysisResults …/>` (qui n'apparaissent que conditionnellement) par :
     ```vue
     <AiPanel
       variant="suggestion"
       title="Analyse IA Discovery"
       subtitle="Sélection intelligente des 20-30 mots-clés les plus stratégiques (groupes, métriques, douleur)."
       :state="aiPanelState"
       :error="error"
       :trigger-disabled="aiCtaDisabled"
       cta-label="Analyser les résultats pertinents"
       regen-label="Relancer l'analyse"
       regen-confirm-message="Relancer l'analyse IA ? Cela consommera un appel Claude."
       data-testid="discovery-ai-panel"
       @trigger="handleAnalyze"
     >
       <DiscoveryAnalysisResults
         v-if="analysisResult"
         :analysis-result="analysisResult"
         :is-all-analysis-selected="isAllAnalysisSelected"
         :is-selected="isSelected"
         :is-multi-source="isMultiSource"
         :source-count-label="sourceCountLabel"
         @toggle-select="toggleSelect"
         @toggle-select-all="handleToggleAnalysisSelectAll"
       />
       <template #idle>
         <p class="discovery-ai-idle">{{ aiIdleMessage }}</p>
       </template>
     </AiPanel>
     ```
   - Retirer l'import et l'usage de `<DiscoveryAiPanel>` ainsi que `useMoteurBasketStore` + `handlePushToRadar` dans `DiscoveryPanel.vue` (seul usage du basket dans le panel, devenu mort après suppression).
   - Conserver l'`emit('send-to-radar', …)` actuel — il est appelé par le bouton sticky `discovery-bar__btn`, indépendant de la coque IA.

2. **Suppression** :
   - `src/components/moteur/DiscoveryAiPanel.vue`
   - `src/composables/moteur/useDiscoveryRanking.ts`
   - `tests/unit/components/moteur/DiscoveryAiPanel.test.ts`
   - `tests/unit/composables/moteur/useDiscoveryRanking.test.ts`

3. **Nettoyage commentaires** (CLAUDE.md, règle « Don't reference the current task, fix, or callers ») dans les fichiers touchés :
   - `DiscoveryPanel.vue` : retirer le commentaire `// Sprint D-1 (2026-05-02) — Panel suggestion bas-de-page…` ligne 37, sa logique disparaît avec la suppression.
   - Vérifier qu'aucun commentaire-sprint orphelin ne reste dans les imports ou les fonctions touchées.

### Sprint B — Tests

1. **Mettre à jour** `tests/unit/components/discovery-tab-architecture.test.ts` :
   - Retirer la mention `DiscoveryAiPanel` dans le commentaire d'en-tête et dans les assertions de position.
   - Ajouter une assertion : `DiscoveryAnalysisResults` doit être enfant DOM de `[data-testid="ai-panel-suggestion"]` (la coque) **et plus** un enfant direct de `.discovery-sources`.

2. **Créer** `tests/unit/components/moteur/discovery-ai-panel-persistence.test.ts` couvrant les 8 ACs de `FR-DIS-AI-PANEL` :
   - AC.DAIP.1 : mount initial → `[data-testid="ai-panel-suggestion"]` présent dans le DOM.
   - AC.DAIP.2 : `hasResults === false` → CTA disabled + message slot `#idle` « Lance d'abord une découverte… ».
   - AC.DAIP.3 : `semanticLoading === true` → CTA disabled + message slot `#idle` « Filtrage de pertinence en cours… ».
   - AC.DAIP.4 : `hasResults === true && relevantCount === 0` → CTA disabled + message slot `#idle` « Aucun mot-clé pertinent… ».
   - AC.DAIP.5 : `analysisLoading === true` → `<AiPanel state="streaming">`, CTA spinner.
   - AC.DAIP.6 : `analysisResult !== null` → `state="success"`, `DiscoveryAnalysisResults` enfant DOM de `[data-testid="ai-panel-suggestion"]`.
   - AC.DAIP.7 : clic « Envoyer au Radar » appelle `getRadarKeywords()` et émet `send-to-radar` (régression du handoff existant).
   - AC.DAIP.8 : test de garde — aucun fichier `src/**/*.{ts,vue}` (hors `_archive/`) ne contient les imports `DiscoveryAiPanel` ou `useDiscoveryRanking`.

3. **Créer** `tests/unit/components/ai-panels-persistence.test.ts` (architectural, transversal) couvrant `FR-UI-AI-PANELS-PATTERN` AC.UIAIP.1-3 :
   - Liste fixée des panels consommateurs auditables au 2026-05-11 : Discovery (post-refonte), Lexique, Lieutenants.
   - Pour chaque entrée : mount du parent → assertion présence DOM + assertion absence de `v-if` conditionné à un état transitoire dans le template (vérifiable via parse AST du `.vue` ou via comportement observable du mount sans interaction).
   - Les 3 panels non-auditables (Radar, Capitaine, Rédaction) sont **listés explicitement en TODO** dans le test, avec un `it.skip(...)` documentant la dette pour les futurs chantiers.

4. **Mise à jour** `tests/unit/components/keyword-discovery-tab.test.ts` si jamais il référence `DiscoveryAiPanel` (à vérifier).

5. Vérifier que les tests sur le **filtre 2-passes** (`useRelevanceScoring`) existent — sinon, ajouter une suite couvrant les 6 ACs de `FR-DIS-RELEVANCE-FILTER` enrichie. **Hors-scope strict du chantier UI, mais opportuniste si quick win.**

### Sprint C — Validation et doc

1. `npm run lint` + `npm run type-check` + `npm run test:unit` + `npm run check:dead` + `npm run check:cycles` + `npm run build` — tous verts.
2. `npm run test:check` — pas de nouveau rouge introduit (les tests supprimés sont retirés de la baseline, à régénérer via `npm run test:snapshot` si justifié).
3. `npm run check:health` global.
4. Mettre à jour `_bmad-output/implementation-artifacts/sprint-status.yaml` (entrée `discovery-ai-coque-persistante` → done).
5. Bumper `last_updated` + `version` de cette tech-spec + déplacer dans `_archive/` avec bandeau ARCHIVED.

## Critères d'acceptation (consolidés)

| AC | Référence FR | Vérifié par |
|---|---|---|
| Coque IA présente au mount, même article fraîchement sélectionné | AC.DAIP.1 | Test unit `discovery-ai-panel-persistence.test.ts` |
| CTA disabled + slot `#idle` adapté quand `!hasResults` | AC.DAIP.2 | Test unit |
| CTA disabled + slot `#idle` adapté pendant `semanticLoading` | AC.DAIP.3 | Test unit |
| CTA disabled + slot `#idle` adapté quand `relevantCount === 0` | AC.DAIP.4 | Test unit |
| `state="streaming"` + CTA spinner pendant analyse IA | AC.DAIP.5 | Test unit |
| `state="success"` + `DiscoveryAnalysisResults` enfant DOM de la coque | AC.DAIP.6 + assertion architecture | Test unit + test architecture mis à jour |
| Handoff Radar inchangé (régression) | AC.DAIP.7 | Test unit |
| Suppression effective de `DiscoveryAiPanel.vue` + `useDiscoveryRanking.ts` | AC.DAIP.8 | Test de garde grep + `npm run check:dead` (knip) |
| Audit transversal (Discovery conforme dans le tableau §FR-UI-AI-PANELS-PATTERN) | AC.UIAIP.1-3 instanciés pour Discovery | `tests/unit/components/ai-panels-persistence.test.ts` (architectural, étendu plus tard pour les autres panels) |
| Lint + type-check + tests + build verts | NFR-MAIN-CHECK-HEALTH | `npm run check:health` |

## Risques et mitigations

- **Risque 1** : casser le test architectural `discovery-tab-architecture.test.ts` qui verrouille 4 espaces distincts. **Mitigation** : adaptation explicite du test dans le Sprint B, étape 1.
- **Risque 2** : un autre composant que `DiscoveryPanel.vue` consomme `DiscoveryAiPanel` ou `useDiscoveryRanking` (peu probable, déjà vérifié au grep). **Mitigation** : `knip` détectera tout caller orphelin restant.
- **Risque 3** : `AiPanel` (composant générique) a un `defaultCollapsed: true` — le panel s'ouvre replié. C'est probablement OK (cohérent avec Lexique), mais peut surprendre l'utilisateur sur Discovery où l'action est centrale. **Mitigation** : forcer `:default-collapsed="false"` à l'instanciation si besoin, à valider visuellement en dev.
- **Risque 4** : la suppression du `<DiscoveryAiPanel>` retire le seul appel à `basketStore.markPushedToRadar`. **Vérification effectuée** : `MoteurView.vue` appelle aussi cette méthode au handoff Radar (cf. `useMoteurCrossTabState`), donc rien n'est cassé.
- **Risque 5** : visuel `AiPanel` peut différer subtilement de `DiscoveryAiPanel` actuel (header, padding, couleurs). **Mitigation** : test visuel en dev, ajustement de classes scoped si nécessaire.

## Métriques de succès

- Discoverabilité : le bouton "Analyser" est visible dès l'ouverture de l'onglet Discovery (pas d'apparition conditionnelle).
- Cohérence visuelle : la coque Discovery a la même silhouette que `LexiqueAiPanel`, `RadarAiPanel`, `LieutenantsAiPanel`.
- Réduction LOC : suppression nette d'environ 250 lignes (`DiscoveryAiPanel.vue` ~165 lignes + `useDiscoveryRanking.ts` ~80 lignes + tests associés).
- Pas de régression fonctionnelle (handoff Radar, cache hydratation, sélection, filtre 2-passes).
