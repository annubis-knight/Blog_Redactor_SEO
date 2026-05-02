---
name: Unification des Panels IA du workflow Moteur
description: Couche UI uniforme pour les panels IA d'analyse/suggestion en bas de chaque onglet, factorisation des composables et fonctions partagées
type: tech-spec
status: draft
version: 0.1.0
created: 2026-05-02
last_updated: 2026-05-02
synced_with:
  - docs/ui-sections-guide.md
  - docs/moteur-data-flow.md
  - .claude/CLAUDE.md
---

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

### 4.1 Discovery (`suggestion`)

- **Panel actuel** : pas de panel "analyse", uniquement le basket.
- **Cible** : nouveau composant `<DiscoveryAiPanel>` en bas de page.
  - Sources : agrège les keywords du basket + contexte article.
  - CTA : "Suggérer les meilleurs candidats" (Sparkles).
  - Sortie : top-N keywords cochables + raison (1 ligne par item).
  - Handoff : bouton "Envoyer dans Radar" → store `moteur-basket` flag `pushedToRadar`.
- **Backend** : nouvelle route `POST /api/discovery/ai-suggest` + prompt
  `discovery-ai-suggest.md`.

### 4.2 Radar (`suggestion`)

- **Panel actuel** : aucun.
- **Cible** : `<RadarAiPanel>` en bas de page.
  - Sources : `radarKeywords` + KPIs + douleur article.
  - CTA : "Recommander les Capitaines candidats".
  - Sortie : 1 à 5 keywords cochables (avec score KPI + score pertinence) +
    raison.
  - Handoff : bouton "Marquer comme candidats Capitaine" → écriture
    `article_keywords.captainCandidates[]`.
- **Backend** : nouvelle route `POST /api/radar/ai-suggest` + prompt
  `radar-ai-suggest.md`. Pas de tokens IA s'il y a un cache valide.

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

```css
:root {
  --ai-accent: #a855f7;     /* violet doux, distinct du bleu primary */
  --ai-accent-soft: #f3e8ff;
  --ai-accent-border: #c084fc;
}

.ai-panel {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--ai-accent);
  background: var(--ai-accent-soft);
  border-radius: 0 0 8px 8px;
}
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

### Sprint D — Nouveaux panels Discovery & Radar (2 jours)

1. Backend : routes `discovery-ai-suggest` + `radar-ai-suggest` + prompts.
2. Frontend : `<DiscoveryAiPanel>` + `<RadarAiPanel>`.
3. Tests contract-api + unit composants.

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

## 9. Décisions ouvertes

- **D1** : place exacte du panel sur **Capitaine** vs `CaptainSidePanel`.
  Garde-t-on **uniquement** le sidepanel, ou ajoute-t-on aussi un panel bas
  de page pour cohérence ? → décision : sidepanel uniquement (l'utilisateur
  a accepté l'exception).
- **D2** : variante de couleur `--ai-accent` à confirmer (violet par défaut,
  modifiable).
- **D3** : Discovery panel doit-il aussi cocher des keywords du basket
  existant, ou en générer de nouveaux via IA ? → à clarifier avant Sprint D.

## 10. Critères d'acceptation

- [ ] Un seul vocabulaire visuel pour tous les panels IA du Moteur.
- [ ] Une icône IA cohérente partout (Sparkles).
- [ ] Skeleton de loading uniforme sur les 5 panels.
- [ ] Aucun appel `fetch` direct dans les composants AI panel.
- [ ] Les 4 routes IA existantes passent par `ai-panel-runner.service`.
- [ ] `docs/moteur-data-flow.md` à jour.
- [ ] Lint/type-check verts (les 250 erreurs lint pré-existantes ne sont pas
      le scope de cette tech-spec).
- [ ] Tests components & composables verts.
