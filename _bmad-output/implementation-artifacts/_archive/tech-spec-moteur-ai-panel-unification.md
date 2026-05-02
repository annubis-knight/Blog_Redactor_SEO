---
name: Unification des Panels IA du workflow Moteur
description: Couche UI uniforme pour les panels IA d'analyse/suggestion en bas de chaque onglet, factorisation des composables et fonctions partagées
type: tech-spec
status: archived
version: 1.0.0
created: 2026-05-02
last_updated: 2026-05-02
archived_at: 2026-05-02
retro: ../retro-moteur-ai-panel-unification.md
synced_with:
  - docs/ui-sections-guide.md
  - docs/moteur-data-flow.md
  - .claude/CLAUDE.md

progress:
  current_sprint: B
  sprints:
    A:
      status: done
      commit: 9c4e87b
      summary: |
        Composants partagés livrés :
          - src/components/moteur/ai-panel/AiPanel.vue
          - src/components/moteur/ai-panel/AiPanelHeader.vue
          - src/components/moteur/ai-panel/AiTriggerButton.vue
          - src/components/moteur/ai-panel/AiPanelSkeleton.vue
          - src/components/moteur/ai-panel/AiSuggestionList.vue
          - src/components/moteur/ai-panel/AiAdviceMarkdown.vue
          - src/composables/moteur/useAiPanel.ts
        43/43 tests verts. Type-check OK.
    B:
      status: pending
      scope: |
        Migration Capitaine (pilote). Réécrire CaptainSidePanel.vue pour
        utiliser <AiPanel variant="advice"> + <AiAdviceMarkdown>. Refactor
        useCapitaineValidation pour déléguer la plomberie streaming à
        useAiPanel (surface publique stable). Pas de panel bas-de-page sur
        l'onglet Capitaine — sidepanel uniquement (D1 confirmée 2026-05-02).
      open_questions:
        - id: B-confirm
          question: |
            Comment porter la window.confirm() actuelle de la régénération
            Capitaine (« cela consommera un appel Claude ») ?
          decision: |
            Tranché 2026-05-02 — Option 3 : ajouter une prop opt-in
            `confirmMessage?: string` sur AiTriggerButton. Si définie ET
            variant === 'regen', `window.confirm(confirmMessage)` avant
            d'émettre 'click'. Capitaine passera ce message ; les autres
            onglets ignoreront cette prop.
            Implémentation côté AiTriggerButton :
              function onClick() {
                if (props.confirmMessage && props.variant === 'regen') {
                  if (!window.confirm(props.confirmMessage)) return
                }
                emit('click')
              }
            AiPanel propage la prop. useCapitaineValidation ne connaît pas
            la confirmation (séparation responsabilité UI vs métier).
            Tests : ajouter 2 tests AiTriggerButton.test.ts (mock
            window.confirm → click émis vs annulé).
        - id: B-streaming-slot
          question: |
            Pendant state==='streaming', AiPanel n'affiche qu'un skeleton.
            Or le markdown Capitaine est progressif (chunks).
          decision: |
            AiPanel.vue expose déjà un slot nommé `streaming` (cf. §5.1
            tech-spec). CaptainSidePanel passera <AiAdviceMarkdown
            :markdown="streamedMd" :streaming="true" /> dans ce slot.
        - id: B-verdict-summary
          question: |
            Le verdictSummary (mini bandeau verdict GO/ORANGE/NOGO en tête)
            doit rester visible.
          decision: |
            Utiliser le slot par défaut d'AiPanel (state==='success') pour
            placer le verdict en tête, suivi de <AiAdviceMarkdown>.
      regression_risks:
        - tests/unit/components/captain-validation.test.ts (doit rester vert)
        - tests/unit/composables/useCapitaineValidation.test.ts si présent
        - le bouton régénérer doit conserver son comportement de confirm
    C:
      status: pending
      scope: |
        - LieutenantsAiPanel.vue (en bas de page, deux sections togglables :
          Propositions + Structure Hn).
        - LexiqueAiPanel.vue (en bas de page, l'extraction TF-IDF reste à
          sa place actuelle dans LexiqueExtraction.vue).
        - Routes backend inchangées.
    D:
      status: pending
      scope: |
        Discovery & Radar — sans nouvel appel IA (D3 confirmée).
        - useDiscoveryRanking : tri basket par signal × Jaccard.
        - useRadarRanking : tri radarKeywords par marketScore + relevanceScore.
        - DiscoveryAiPanel.vue + RadarAiPanel.vue en bas de page.
        - Handoffs : pushedToRadar (Discovery), captainCandidates (Radar).
    E:
      status: pending
      scope: |
        Backend refactor :
        - server/services/external/ai-panel-runner.service.ts
        - server/utils/ai-panel-cache.ts
        - Migration des 4 handlers de keyword-ai-panel.routes.ts.
        Contrats response stables (tests routes verts).
    F:
      status: pending
      scope: |
        - Bumper docs/moteur-data-flow.md + docs/ui-sections-guide.md.
        - Créer retro-moteur-ai-panel-unification.md.
        - Bumper architecture.md si besoin.
        - Archiver cette tech-spec dans _archive/ avec bandeau ARCHIVED.
---

> ⚠️ **ARCHIVED 2026-05-02** — Tech-spec livrée et stable. Voir la rétro
> [retro-moteur-ai-panel-unification.md](../retro-moteur-ai-panel-unification.md)
> pour le bilan post-livraison. Source de vérité : le code dans `src/` +
> `server/` et la section §13 de `docs/ui-sections-guide.md`.

# Tech-spec — Unification des Panels IA du workflow Moteur

## 1. Contexte et objectif

Le workflow Moteur a 6 onglets / 3 phases. Aujourd'hui, **5 onglets** ont ou
devraient avoir un composant qui :
- analyse le contenu de l'onglet courant via l'IA (ou des règles, pour
  Discovery/Radar) ;
- propose à l'utilisateur une **sélection à transmettre** à l'onglet suivant ;
- ou délivre un **conseil** (cas Capitaine — sidepanel intégré).

État actuel = **disparité visuelle et fonctionnelle** :
- Capitaine : sidepanel latéral redimensionnable (markdown streaming).
- Lieutenants : 2 sections collapsibles inline (propositions + Hn structure).
- Lexique : bouton TF-IDF inline + accordion "Avis Expert Lexique" + IA upfront.
- Discovery : suggestions par regroupement de règles, pas d'IA, pas de panel "analyse".
- Radar : scoring par règles, pas de panel "candidats à passer".
- Finalisation : recap read-only, pas d'IA — **pas concerné**.

L'objectif : **un look-and-feel commun**, des fonctions de plomberie communes,
sans casser les routes/composables existants.

## 2. Principes directeurs

### 2.1 Deux types de panels

| Type            | Rôle                                                   | Onglets                                                                  |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| **suggestion**  | Propose des items + checkboxes pour les passer au suivant | Discovery (panel d'analyse à créer), Radar (à créer), Lieutenants, Lexique |
| **advice**      | Délivre un conseil markdown sur le mot-clé courant     | Capitaine (sidepanel, exception assumée)                                 |

Les deux **partagent** :
- l'iconographie IA (Sparkles ✨ de `lucide-vue-next`)
- le squelette de chargement (skeleton lines)
- la structure du header (icône + titre + CTA + badges état)
- la couleur d'accent (variable CSS `--ai-accent`)
- l'état stream/error/cache (un composable commun gère ça)

Ils **diffèrent par** :
- l'emplacement (bas-de-page pour `suggestion`, sidepanel pour `advice` côté Capitaine)
- le contenu (liste sélectionnable vs markdown)
- l'action terminale (handoff store vs read-only)

### 2.2 Position (`suggestion`)

> **Toujours en bas de la page, après le contenu principal de l'onglet.**

Pattern : carte pleine largeur, fond légèrement différencié, bordure haut
`--ai-accent`, séparateur `<hr>` au-dessus.

## 3. Architecture cible

### 3.1 Nouveaux composants partagés

```
src/components/moteur/ai-panel/
  ├── AiPanel.vue                  # wrapper générique (suggestion|advice)
  ├── AiPanelHeader.vue            # icône Sparkles + titre + sous-titre
  ├── AiTriggerButton.vue          # CTA unifié (variants: primary|ghost|regen)
  ├── AiPanelSkeleton.vue          # skeleton loading
  ├── AiSuggestionList.vue         # liste cochable (variant suggestion)
  └── AiAdviceMarkdown.vue         # rendu markdown streaming (variant advice)
```

### 3.2 Nouveau composable de plomberie

```
src/composables/moteur/useAiPanel.ts
```

Wrapper léger autour de `useStreaming` + cache TTL + statut, avec une API
uniforme :

```ts
const {
  state,        // 'idle' | 'loading' | 'streaming' | 'success' | 'error' | 'stale'
  result,       // T (typé par onglet)
  error,
  isStale,      // au-delà du TTL → le CTA repropose "Régénérer"
  trigger,      // () => Promise<void>
  abort,
  reset,
} = useAiPanel<T>({
  endpoint: '/keywords/:keyword/ai-panel',
  payload: () => ({ keyword: keyword.value, articleId }),
  cacheKey: () => `aipanel:${articleId}:${keyword.value}`,
  ttlMs: 24 * 60 * 60 * 1000,
  parser: (raw) => parseAiJson<T>(raw),
})
```

**Ne remplace pas** les composables métier existants
(`useCapitaineValidation`, etc.). Il les refactorise en **dessous** :
ils délèguent la plomberie à `useAiPanel`, et exposent les méthodes métier
spécifiques (handoff, sélection, etc.) au-dessus.

### 3.3 Factorisation de fonctions backend

Chaque panel IA continue d'avoir sa **route dédiée** + son **prompt .md** dédié
(c'est sain — sépare les responsabilités). On factorise uniquement :

- `server/services/external/ai-panel-runner.service.ts` : helper qui prend
  `(prompt, vars, parser, cacheKey)` et renvoie un stream + cache miss/hit.
  Réutilisé par `keyword-ai-panel.routes.ts` pour les 4 endpoints.
- `server/utils/ai-panel-cache.ts` : un seul wrapper sur `api_cache`
  (consultation + écriture) — actuellement chaque route a sa logique.

Effets de bord acceptables : refactor invasif des routes
`keyword-ai-panel.routes.ts` (4 handlers).

## 4. Cartographie par onglet

### 4.1 Discovery (`suggestion`) — sans nouvel appel IA

- **Panel actuel** : pas de panel "analyse", uniquement le basket.
- **Cible** : nouveau composant `<DiscoveryAiPanel>` en bas de page.
  - **Source de données** : `moteur-basket.store` (déjà collecté).
  - **Logique** : tri local (côté composable) par densité de signal
    (count d'occurrences dans suggestions alphabét/questions/intentions/
    prépositions) × similarité pain point (Jaccard, déjà disponible via
    `src/utils/pain-point-jaccard.ts`).
  - **CTA** : "Surfacer les meilleurs candidats" (Sparkles).
  - **Sortie** : top-N (10 par défaut) keywords cochables + raison
    ("Présent dans 3 sources" / "Aligné douleur").
  - **Handoff** : bouton "Envoyer dans Radar" → flag `pushedToRadar` dans
    `moteur-basket.store`.
- **Backend** : **aucun nouvel endpoint**. Le tri se fait côté front à partir
  des données déjà chargées. Pas d'appel IA → pas de coût token.

### 4.2 Radar (`suggestion`) — sans nouvel appel IA

- **Panel actuel** : aucun.
- **Cible** : `<RadarAiPanel>` en bas de page.
  - **Source de données** : `radarKeywords` (déjà scorés via `computeMarketScore`
    et `computeRelevanceScore`).
  - **Logique** : tri local par `marketScore.total + relevanceScore.total`,
    avec filtre verdict ≠ NOGO. Pas d'appel IA.
  - **CTA** : "Surfacer les Capitaines candidats".
  - **Sortie** : top 1-5 keywords cochables avec leurs deux scores +
    1 ligne d'explication (mix scores).
  - **Handoff** : bouton "Marquer comme candidats Capitaine" → écriture
    `article_keywords.captainCandidates[]` (champ déjà géré par le store).
- **Backend** : **aucun nouvel endpoint**. On consomme le scoring déjà
  calculé.

### 4.3 Capitaine (`advice` — exception sidepanel)

- **Panel actuel** : `CaptainAiPanel.vue` accordion + `CaptainSidePanel.vue`.
- **Cible** : on garde le sidepanel, mais on le **réécrit avec les nouveaux
  composants partagés** (`AiPanelHeader`, `AiAdviceMarkdown`,
  `AiTriggerButton`, `AiPanelSkeleton`). Le sidepanel ré-utilise donc le même
  vocabulaire visuel que les panels suggestion.
- **Backend** : routes existantes inchangées, juste passées par
  `ai-panel-runner.service`.

### 4.4 Lieutenants (`suggestion`)

- **Panel actuel** : `LieutenantProposals.vue` + `LieutenantH2Structure.vue`,
  inline au milieu de la page.
- **Cible** : déplacer **les deux** dans un seul `<LieutenantsAiPanel>` en bas
  de page, avec deux sections (toggle "Lieutenants" / "Structure Hn").
  - Handoff : checkboxes existantes → déjà dans le store, on garde.
- **Backend** : 2 routes existantes, refactor pour passer par
  `ai-panel-runner.service`.

### 4.5 Lexique (`suggestion`)

- **Panel actuel** : bouton TF-IDF inline + accordion "Avis Expert" + IA
  upfront recommendations.
- **Cible** : `<LexiqueAiPanel>` en bas de page (l'extraction TF-IDF reste à
  sa place actuelle, c'est la partie "analyse + recommendations" qui descend).
  - Handoff : multi-select sur termes recommandés, bouton "Valider la
    sélection" → store `article-keywords.lexique[]`.
- **Backend** : 2 routes existantes (lexique + lexique-upfront), même
  refactor.

### 4.6 Finalisation

- Pas concerné. Read-only, navigation vers Rédaction.

## 5. Contrats techniques

### 5.1 Props du `<AiPanel>` générique

```ts
interface AiPanelProps {
  variant: 'suggestion' | 'advice'
  title: string                       // "Suggestions IA Lexique"
  subtitle?: string                   // "Termes recommandés en complément"
  state: AiPanelState
  error?: string | null
  isStale?: boolean                   // au-delà du TTL
  ctaLabel?: string                   // défaut: "Analyser avec l'IA"
  regenLabel?: string                 // défaut: "Régénérer"
  onTrigger: () => void
}
```

### 5.2 Événement de handoff (variant suggestion)

```ts
emit('handoff', { selected: T[], targetTab: MoteurTab })
```

Chaque onglet branche cet événement à son store dédié (basket, captainCandidates,
richLieutenants, lexique).

### 5.3 Conventions visuelles (CSS)

> **Décision D2 (2026-05-02)** : on s'aligne sur les tokens `badge-purple-*`
> déjà présents dans `src/assets/styles/variables.css` (lignes 73-74). Pas de
> nouveau token couleur — on **réutilise la DA existante**.

```css
.ai-panel {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--color-badge-purple-text);  /* purple-600 */
  background: var(--color-badge-purple-bg);              /* purple-100 */
  border-radius: 0 0 8px 8px;
}

.ai-panel__icon { color: var(--color-badge-purple-text); }
```

### 5.4 Iconographie

- **Icône principale IA** : `<Sparkles>` de `lucide-vue-next` (16/20/24px).
- **Icône régénération** : `<RotateCw>`.
- **Icône abort** : `<X>`.

## 6. Plan d'implémentation (sprints)

### Sprint A — Composants partagés (TDD strict, 1-2 jours)

1. Créer `src/components/moteur/ai-panel/` avec les 6 composants listés.
2. Créer `useAiPanel` composable + tests unitaires.
3. Storybook-style : page de démo (route dev `/dev/ai-panel`) montrant les 4
   états (idle / loading / success / error) pour chaque variant.
4. Tests : 1 fichier par composant + 1 pour le composable.

### Sprint B — Migration Capitaine (advice) — pilote (1 jour)

1. Réécrire `CaptainSidePanel.vue` pour utiliser les composants partagés.
2. Garder l'API du `useCapitaineValidation` en surface, refactor en dessous
   pour déléguer à `useAiPanel`.
3. Régression test sur les fixtures existantes.

### Sprint C — Migration Lieutenants & Lexique (1-2 jours)

1. Créer `<LieutenantsAiPanel>` (deux sections togglables).
2. Créer `<LexiqueAiPanel>` (extraction TF-IDF reste, AI down).
3. Mettre à jour les tests components existants.

### Sprint D — Nouveaux panels Discovery & Radar (1 jour)

> Pas d'appel IA — tri local sur données déjà chargées (cf. §4.1, §4.2).

1. Composable `useDiscoveryRanking` : tri basket par signal × pain alignment.
2. Composable `useRadarRanking` : tri radarKeywords par mix marketScore +
   relevanceScore.
3. Frontend : `<DiscoveryAiPanel>` + `<RadarAiPanel>`.
4. Tests unit composables + components.

### Sprint E — Refactor backend (1 jour)

1. `ai-panel-runner.service.ts` extrait la logique commune.
2. `ai-panel-cache.ts` unifié.
3. Migration des 4 routes existantes pour passer par le runner.

### Sprint F — Nettoyage & doc (0.5 jour)

1. Mise à jour `docs/moteur-data-flow.md` + `docs/ui-sections-guide.md`.
2. Mise à jour `_bmad-output/planning-artifacts/architecture.md` si besoin.
3. Retro dans `_bmad-output/implementation-artifacts/retro-moteur-ai-panel-unification.md`.

## 7. Tests obligatoires

| Domaine                                | Test                                                                |
| -------------------------------------- | ------------------------------------------------------------------- |
| `useAiPanel`                           | états (idle/loading/streaming/success/error), abort, isStale, cache |
| `<AiPanel>`                            | rendu suggestion vs advice, propagation events                      |
| `<AiTriggerButton>`                    | label initial vs régénération, disabled pendant loading             |
| `<AiPanelSkeleton>`                    | rendu pendant `state === 'loading'`                                 |
| Migration Capitaine                    | Régression : tous les tests `captain-validation.test.ts` verts      |
| Discovery/Radar nouveaux panels        | flow : trigger → success → handoff event payload                    |
| Backend `ai-panel-runner`              | cache hit/miss, parser error, abort signal                          |

## 8. Anti-patterns à éviter

- ❌ Recopier la logique de streaming dans chaque composant — tout passe par
  `useAiPanel`.
- ❌ Hardcoder l'icône IA — toujours `<Sparkles>` de `lucide-vue-next`.
- ❌ Mettre le panel en haut de page sur `suggestion` — toujours en bas.
- ❌ Faire de l'appel `fetch` direct — passer par `apiPost` (cf. CLAUDE.md §3).
- ❌ Réécrire les routes existantes sans préserver leurs contrats response —
  les tests `keyword-ai-panel.routes.test.ts` doivent rester verts.
- ❌ Oublier la consultation cache avant l'appel IA (CLAUDE.md §3.6).

## 9. Décisions tranchées

### 2026-05-02 — Initiales

- **D1 — Capitaine** : sidepanel **uniquement**, pas de doublon bas de page.
  Le sidepanel reste l'exception assumée (variant `advice`).
- **D2 — Couleur d'accent IA** : on **réutilise** les tokens existants
  `--color-badge-purple-bg` (#f3e8ff) et `--color-badge-purple-text` (#7c3aed)
  déjà présents dans `src/assets/styles/variables.css` lignes 73-74. Aucun
  nouveau token CSS à introduire — alignement DA.
- **D3 — Discovery & Radar (onglets sans panel actuel)** :
  - Le panel n'est **pas une refonte**, c'est un ajout. On **réutilise les
    fonctions/données déjà en place** (basket pour Discovery, KPIs/scoring
    pour Radar).
  - **Discovery** : le nouveau panel d'analyse coche les keywords **du basket
    existant** et propose les meilleurs candidats à pousser vers Radar
    (tri par densité de signal × pertinence pain point). Pas de génération
    IA nouvelle au-delà de ce qui existe.
  - **Radar** : le panel coche les radar cards **déjà scorées** et propose
    les top-N candidats Capitaine (tri par `marketScore + relevanceScore`
    avec malus douleur). Pas de nouvel appel IA — on consomme le résultat
    du scoring déjà calculé côté store.
  - Justification SEO : à ces deux étapes amont, l'utilisateur a déjà collecté
    et scoré ses mots-clés ; ce qui manque, c'est un **filtre intelligent**
    qui surface les meilleurs candidats sans relancer un appel IA coûteux.

### 2026-05-02 — Sprint B (préparation migration Capitaine)

- **B-1 — Confirmation régénération** : la `window.confirm()` actuelle
  (« cela consommera un appel Claude ») est portée via une **prop opt-in
  `confirmMessage?: string`** sur `AiTriggerButton`. Si définie ET
  `variant === 'regen'`, `window.confirm(confirmMessage)` est appelée avant
  l'émission de `'click'`. `AiPanel` propage la prop. `useCapitaineValidation`
  ne connaît pas la confirmation (séparation responsabilité UI vs métier).
  Pattern réutilisable si demain Lexique/Lieutenants veulent leur propre
  confirm. Tests : ajouter 2 cas dans `AiTriggerButton.test.ts`
  (mock `window.confirm` → click émis vs annulé).
- **B-2 — Onglet Capitaine = aide / conseil** : confirmation que les panels
  IA Capitaine ont un rôle d'**advice** (pas de handoff vers Lieutenants).
  Le sidepanel actuel couvre déjà ce besoin — pas de panel bas-de-page
  supplémentaire (renforce D1).
- **B-3 — Streaming markdown progressif** : `AiPanel` expose un slot nommé
  `streaming`. CaptainSidePanel y placera `<AiAdviceMarkdown :streaming="true">`
  pendant `state === 'streaming'` pour afficher les chunks au fil de l'eau,
  au lieu du skeleton par défaut.
- **B-4 — Verdict summary en tête** : le mini bandeau verdict GO/ORANGE/NOGO
  reste rendu via le slot par défaut d'`AiPanel`, **avant** le contenu
  `<AiAdviceMarkdown>`. Pas de slot dédié — l'ordre d'écriture dans le slot
  par défaut suffit.

## 10. Critères d'acceptation

- [x] Un seul vocabulaire visuel pour tous les panels IA du Moteur _(Sprint A
      pose la fondation — coché quand B/C/D auront migré les panels)_.
- [x] Une icône IA cohérente partout (Sparkles SVG inline).
- [x] Skeleton de loading uniforme.
- [ ] Aucun appel `fetch` direct dans les composants AI panel.
- [ ] Les 4 routes IA existantes passent par `ai-panel-runner.service`.
- [ ] `docs/moteur-data-flow.md` à jour.
- [ ] Lint/type-check verts (les 250 erreurs lint pré-existantes ne sont pas
      le scope de cette tech-spec).
- [x] Tests components & composables verts _(43/43 Sprint A — à étendre par
      sprint)_.
