---
title: 'Sécurité & Stabilité — DOMPurify, Error Boundary, Router Guards, Toasts'
slug: 'securite-stabilite-v1'
created: '2026-04-09'
status: 'review'
stepsCompleted: [1, 2, 3]
tech_stack: ['Vue 3.4', 'TypeScript 5', 'Pinia 2', 'Vue Router 4', 'Vitest', 'TipTap 2', 'marked', 'DOMPurify (à ajouter)']
files_to_modify:
  - 'src/main.ts'
  - 'src/router/index.ts'
  - 'src/App.vue'
  - 'src/components/article/ArticleStreamDisplay.vue'
  - 'src/components/moteur/CaptainValidation.vue'
  - 'src/components/intent/RadarKeywordCard.vue'
  - 'src/views/ArticleWorkflowView.vue'
  - 'src/views/ArticleEditorView.vue'
files_to_create:
  - 'src/directives/v-safe-html.ts'
  - 'src/components/shared/ErrorBoundary.vue'
  - 'src/views/NotFoundView.vue'
  - 'src/stores/notification.store.ts'
  - 'src/components/shared/ToastContainer.vue'
  - 'src/composables/useNotify.ts'
  - 'tests/unit/directives/v-safe-html.test.ts'
  - 'tests/unit/components/error-boundary.test.ts'
  - 'tests/unit/router/router-guards.test.ts'
  - 'tests/unit/stores/notification.store.test.ts'
  - 'tests/unit/composables/useNotify.test.ts'
code_patterns:
  - 'Stores Pinia en composition API (defineStore + setup function)'
  - 'Composables retournant { state, actions } via refs/computed'
  - 'Imports alias @/ pour src/, @shared/ pour shared/'
  - 'Logs centralisés via import { log } from @/utils/logger'
  - 'CSS variables --color-* pour le theming'
  - 'marked.setOptions({ breaks: true, gfm: true }) pour markdown→HTML'
test_patterns:
  - 'Vitest (describe/it/expect/beforeEach)'
  - 'setActivePinia(createPinia()) dans beforeEach pour stores'
  - 'Tests dans tests/unit/ miroir de la structure src/'
  - 'data-testid sur les éléments pour les tests de composants'
---

# Tech-Spec: Sécurité & Stabilité — DOMPurify, Error Boundary, Router Guards, Toasts

**Created:** 2026-04-09

## Overview

### Problem Statement

L'application présente 4 lacunes critiques de sécurité et de stabilité :

1. **XSS via v-html** — 6 emplacements affichent du HTML brut (contenu streamé depuis l'IA, markdown parsé, SVG) sans aucune sanitization. Un contenu malveillant pourrait exécuter du JavaScript dans le navigateur.
2. **Aucun Error Boundary** — Si un composant Vue plante (erreur de rendu), toute la page crash avec un écran blanc. Pas de `app.config.errorHandler` ni de `onErrorCaptured`.
3. **Aucun Router Guard** — Navigation vers des URLs avec des params inexistants (ex: `/cocoon/999/article/fake-slug`) = crash ou écran vide. Pas de page 404. Pas de gestion d'erreur de lazy-loading.
4. **Aucun système de notification** — Les erreurs restent piégées dans les `error.value` des stores. L'utilisateur n'a aucun feedback visuel (succès, erreur, info).

### Solution

- Intégrer **DOMPurify** via une directive custom `v-safe-html` pour remplacer tous les `v-html`
- Créer un composant **ErrorBoundary.vue** avec `onErrorCaptured` + `app.config.errorHandler` global
- Ajouter **router.beforeEach()** pour valider les params de route + route catch-all 404 + `router.onError()`
- Créer un **système de toast maison** : `notificationStore` + `ToastContainer.vue` + composable `useNotify()`

### Scope

**In Scope:**

- Directive `v-safe-html` avec DOMPurify (remplacement des 6 `v-html`)
- Composant `ErrorBoundary.vue` enveloppant les panneaux critiques
- `app.config.errorHandler` dans `main.ts`
- `router.beforeEach()` avec validation des params cocoonId/slug
- `router.onError()` pour les erreurs de lazy-loading
- Composant `NotFoundView.vue` (page 404)
- Route catch-all `/:pathMatch(.*)*`
- Store `notificationStore` (Pinia)
- Composant `ToastContainer.vue` (auto-dismiss, types success/error/warning/info)
- Composable `useNotify()` pour simplifier l'usage
- Tests unitaires pour chaque nouvel élément

**Out of Scope:**

- Authentification / gestion de sessions
- Rate limiting côté client
- Refacto des god components (spec 2-3)
- Race conditions / fuites mémoire (spec 2)
- Undo/Redo, skeleton screens (spec 4)
- Internationalisation (i18n)

## Context for Development

### Codebase Patterns

- **Stores** : 21 stores Pinia en composition API (`defineStore('name', () => { ... })`)
- **Composables** : retournent `{ refs, computeds, fonctions }`, convention `use*`
- **Imports** : alias `@/` → `src/`, `@shared/` → `shared/`
- **Logging** : centralisé via `import { log } from '@/utils/logger'`
- **CSS** : variables `--color-*` pour tout le theming, `scoped` styles dans les SFC
- **Markdown** : `marked` avec `{ breaks: true, gfm: true }` dans 2 fichiers (CaptainValidation, ArticleWorkflowView)
- **data-testid** : utilisé systématiquement pour les tests de composants

### Files to Reference

| File | Purpose | Action |
| ---- | ------- | ------ |
| `src/main.ts` | Point d'entrée app (15 lignes, createApp + Pinia + Router) | Ajouter `app.config.errorHandler` + enregistrer directive `v-safe-html` |
| `src/App.vue` | Root component (Navbar + RouterView, 26 lignes) | Ajouter `<ToastContainer />` |
| `src/router/index.ts` | 13 routes, 0 guard, 1 afterEach logging | Ajouter `beforeEach`, `onError`, route 404 |
| `src/components/article/ArticleStreamDisplay.vue` | Affiche contenu streamé (114 lignes) | `v-html` → `v-safe-html` (lignes 24, 27) |
| `src/components/moteur/CaptainValidation.vue` | Validation capitaine (1636 lignes) | `v-html` → `v-safe-html` (lignes 757, 934) |
| `src/components/intent/RadarKeywordCard.vue` | Carte radar keyword | `v-html` → `v-safe-html` (ligne 171, SVG dans `<svg>`) |
| `src/views/ArticleWorkflowView.vue` | Workflow article complet | `v-html` → `v-safe-html` (ligne 442), wrap panneaux avec ErrorBoundary |
| `src/services/api.service.ts` | 5 fonctions fetch (84 lignes, pattern identique) | Référence pour comprendre le pattern d'erreur |
| `src/stores/seo.store.ts` | Store SEO scoring | Exemple de store Pinia composition API |
| `tests/unit/stores/seo.store.test.ts` | Test store avec setActivePinia | Référence pattern de test |

### Technical Decisions

1. **Directive `v-safe-html` plutôt que composable** : une directive permet un remplacement 1:1 de `v-html` dans les templates sans modifier le `<script>`. Moins intrusif, plus rapide à adopter.
2. **DOMPurify plutôt que sanitize-html** : DOMPurify est plus léger (~7kb gzip), plus performant, et le standard de facto pour la sanitization côté client. Config avec `ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon']` pour le SVG de RadarKeywordCard.
3. **ErrorBoundary comme composant wrapper** : Vue 3 n'a pas d'error boundary natif (contrairement à React). On utilise `onErrorCaptured` dans un composant parent qui catch les erreurs des enfants et affiche un fallback.
4. **Toast maison plutôt que lib externe** : zéro dépendance, cohérent avec le design system existant (CSS variables `--color-*`), contrôle total.
5. **Router guard fail-open** : si l'API est down, le guard laisse passer plutôt que de bloquer l'utilisateur. La validation est "best-effort" : on vérifie les params quand c'est possible.

## Implementation Plan

### Tasks

#### Bloc A — Sanitization HTML (Priorité 1)

- [ ] **Task 1 : Installer DOMPurify**
  - Action : `npm install dompurify` + `npm install -D @types/dompurify`
  - Notes : ~7kb gzip, aucune autre dépendance

- [ ] **Task 2 : Créer la directive `v-safe-html`**
  - File : `src/directives/v-safe-html.ts`
  - Action : Créer une directive Vue 3 custom qui :
    1. Importe `DOMPurify`
    2. Configure `DOMPurify.sanitize()` avec options permettant le SVG (`ADD_TAGS`, `ADD_ATTR`)
    3. Hook `mounted` : sanitize la valeur et l'injecte via `el.innerHTML`
    4. Hook `updated` : même chose quand la valeur change
  - Notes : Exporter aussi une fonction `sanitizeHtml(html: string): string` pour usage programmatique (dans les composables qui utilisent `marked`)

- [ ] **Task 3 : Enregistrer la directive globalement**
  - File : `src/main.ts`
  - Action : Ajouter `app.directive('safe-html', safeHtmlDirective)` après `app.use(router)` et avant `app.mount('#app')`
  - Notes : Import depuis `@/directives/v-safe-html`

- [ ] **Task 4 : Remplacer `v-html` par `v-safe-html` dans ArticleStreamDisplay.vue**
  - File : `src/components/article/ArticleStreamDisplay.vue`
  - Action :
    - Ligne 24 : `v-html="streamedWithCursor"` → `v-safe-html="streamedWithCursor"`
    - Ligne 27 : `v-html="processedContent"` → `v-safe-html="processedContent"`
  - Notes : Pas de changement dans le `<script>`, la directive gère tout

- [ ] **Task 5 : Remplacer `v-html` par `v-safe-html` dans CaptainValidation.vue**
  - File : `src/components/moteur/CaptainValidation.vue`
  - Action :
    - Ligne 757 : `v-html="carouselParsedMarkdown"` → `v-safe-html="carouselParsedMarkdown"`
    - Ligne 934 : `v-html="parsedMarkdown"` → `v-safe-html="parsedMarkdown"`
  - Notes : Le markdown est parsé via `marked()`. La sanitization s'applique APRÈS le parsing marked.

- [ ] **Task 6 : Remplacer `v-html` par `v-safe-html` dans RadarKeywordCard.vue**
  - File : `src/components/intent/RadarKeywordCard.vue`
  - Action :
    - Ligne 171 : `v-html="badge.svg"` → `v-safe-html="badge.svg"`
  - Notes : Le SVG vient de données internes (pas d'input utilisateur), mais on sanitize par cohérence. La config DOMPurify doit autoriser les tags SVG.

- [ ] **Task 7 : Remplacer `v-html` par `v-safe-html` dans ArticleWorkflowView.vue**
  - File : `src/views/ArticleWorkflowView.vue`
  - Action :
    - Ligne 442 : `v-html="parsedBriefMarkdown"` → `v-safe-html="parsedBriefMarkdown"`

- [ ] **Task 8 : Tests directive v-safe-html**
  - File : `tests/unit/directives/v-safe-html.test.ts`
  - Action : Créer les tests suivants :
    - `it('sanitize les balises script')` — input `<p>OK</p><script>alert('xss')</script>` → output ne contient pas `<script>`
    - `it('conserve le HTML standard')` — input `<h2>Title</h2><p>Text</p>` → output identique
    - `it('conserve les tags SVG autorisés')` — input `<svg><path d="M0 0"/></svg>` → output contient `<svg>` et `<path>`
    - `it('supprime les event handlers')` — input `<img onerror="alert('xss')" src="x">` → output sans `onerror`
    - `it('met à jour quand la valeur change')` — monter un composant, changer la valeur, vérifier le nouveau contenu sanitizé
    - `it('gère les valeurs null/undefined sans crash')` — input `null` → `innerHTML` vide

#### Bloc B — Error Boundary (Priorité 2)

- [ ] **Task 9 : Créer le composant ErrorBoundary.vue**
  - File : `src/components/shared/ErrorBoundary.vue`
  - Action : Créer un composant avec :
    - Props : `fallbackMessage?: string` (default: "Une erreur est survenue dans ce panneau.")
    - State : `hasError: ref(false)`, `errorInfo: ref<string | null>(null)`
    - Hook : `onErrorCaptured((err, instance, info) => { hasError = true; errorInfo = err.message; log.error(...); return false })` — `return false` empêche la propagation
    - Template : `<slot v-if="!hasError" />` + fallback div avec message d'erreur + bouton "Réessayer" qui reset `hasError` à `false`
    - Slot nommé `#error` optionnel pour custom fallback
    - Style : bordure rouge douce, fond rose pâle, cohérent avec `--color-*`
  - Notes : `return false` dans `onErrorCaptured` est crucial pour empêcher l'erreur de remonter et crasher l'app

- [ ] **Task 10 : Ajouter `app.config.errorHandler` dans main.ts**
  - File : `src/main.ts`
  - Action : Avant `app.mount('#app')`, ajouter :
    ```typescript
    app.config.errorHandler = (err, instance, info) => {
      log.error('[Vue Error]', { error: err, component: instance?.$options?.name, info })
    }
    ```
  - Notes : C'est le filet de sécurité ultime. Les erreurs non capturées par un ErrorBoundary arrivent ici.

- [ ] **Task 11 : Wrapper les panneaux critiques avec ErrorBoundary**
  - Files : `src/views/ArticleWorkflowView.vue`, `src/views/ArticleEditorView.vue`
  - Action : Importer `ErrorBoundary` et wrapper les composants suivants :
    - `<ErrorBoundary fallback-message="Erreur dans le panneau SEO."><SeoPanel ... /></ErrorBoundary>`
    - `<ErrorBoundary fallback-message="Erreur dans le panneau géo."><GeoPanel ... /></ErrorBoundary>`
    - `<ErrorBoundary fallback-message="Erreur dans le plan."><OutlineEditor ... /></ErrorBoundary>`
    - `<ErrorBoundary fallback-message="Erreur dans les suggestions de liens."><LinkSuggestions ... /></ErrorBoundary>`
    - `<ErrorBoundary fallback-message="Erreur dans le contenu de l'article."><ArticleStreamDisplay ... /></ErrorBoundary>`
  - Notes : Ne PAS wrapper le composant root ou le router-view (ça empêcherait la navigation). Wrapper uniquement les panneaux latéraux/secondaires.

- [ ] **Task 12 : Tests ErrorBoundary**
  - File : `tests/unit/components/error-boundary.test.ts`
  - Action : Créer les tests suivants :
    - `it('affiche le slot enfant quand pas d\'erreur')` — render un `<ErrorBoundary><p>OK</p></ErrorBoundary>`, vérifier que "OK" est visible
    - `it('affiche le fallback quand un enfant throw')` — render un composant enfant qui throw dans `setup()`, vérifier que le fallback apparaît
    - `it('affiche le message custom')` — prop `fallback-message="Custom"`, vérifier le texte
    - `it('permet de réessayer')` — après erreur, cliquer "Réessayer", vérifier que le composant enfant est remonté
    - `it('ne propage pas l\'erreur au parent')` — l'erreur ne remonte pas (pas de throw dans le parent)

#### Bloc C — Router Guards & 404 (Priorité 3)

- [ ] **Task 13 : Créer la page NotFoundView.vue**
  - File : `src/views/NotFoundView.vue`
  - Action : Créer une page 404 simple :
    - Titre "Page introuvable"
    - Texte "L'adresse que vous avez saisie ne correspond à aucune page."
    - Bouton "Retour au tableau de bord" → `router.push('/')`
    - Style cohérent avec l'app (CSS variables `--color-*`)

- [ ] **Task 14 : Ajouter la route catch-all 404**
  - File : `src/router/index.ts`
  - Action : Ajouter en dernière position dans le tableau `routes` :
    ```typescript
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    }
    ```
  - Notes : DOIT être la dernière route. Les legacy redirects doivent rester avant.

- [ ] **Task 15 : Ajouter `router.beforeEach()` pour valider les params**
  - File : `src/router/index.ts`
  - Action : Ajouter un guard `beforeEach` qui :
    1. Pour les routes avec `:cocoonId` — vérifie que le param n'est pas vide et a un format valide (string non vide)
    2. Pour les routes avec `:slug` — vérifie que le slug n'est pas vide et ne contient pas de caractères dangereux
    3. Si invalide → `return { name: 'not-found' }`
    4. Sinon → `return true` (laisser passer)
  - Notes : Validation **syntaxique uniquement** (pas d'appel API). On vérifie le format, pas l'existence en BDD. Raison : pas de latence ajoutée, pas de dépendance à l'API.

- [ ] **Task 16 : Ajouter `router.onError()` pour les erreurs de lazy-loading**
  - File : `src/router/index.ts`
  - Action : Ajouter après le `beforeEach` :
    ```typescript
    router.onError((error, to, from) => {
      log.error('[Router Error]', { error: error.message, to: to.path, from: from.path })
      // Si c'est une erreur de chargement de chunk (déploiement pendant navigation)
      if (error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading chunk')) {
        window.location.href = to.fullPath  // Force un rechargement complet
      }
    })
    ```
  - Notes : Les erreurs de lazy-loading arrivent quand un déploiement change les noms de fichiers pendant qu'un utilisateur navigue. Le rechargement complet résout le problème.

- [ ] **Task 17 : Tests Router Guards**
  - File : `tests/unit/router/router-guards.test.ts`
  - Action : Créer les tests suivants :
    - `it('laisse passer les routes valides')` — `/cocoon/mon-cocoon/article/mon-slug` → OK
    - `it('redirige vers 404 si cocoonId est vide')` — `/cocoon//article/slug` → 404
    - `it('redirige vers 404 pour les URLs inconnues')` — `/page-inexistante` → 404
    - `it('laisse passer les routes sans params')` — `/labo`, `/explorateur` → OK
    - `it('laisse passer les legacy redirects')` — `/theme/123` → redirigé correctement
    - `it('affiche la page NotFound pour la route catch-all')` — vérifier le composant monté

#### Bloc D — Système de Notifications Toast (Priorité 4)

- [ ] **Task 18 : Créer le store `notificationStore`**
  - File : `src/stores/notification.store.ts`
  - Action : Créer un store Pinia avec :
    - Types : `NotificationType = 'success' | 'error' | 'warning' | 'info'`
    - Type : `Notification = { id: string, type: NotificationType, message: string, duration?: number }`
    - State : `notifications: ref<Notification[]>([])`
    - Actions :
      - `add(type, message, duration = 5000)` — ajoute une notification avec un `id` unique (crypto.randomUUID ou counter), lance un `setTimeout` pour l'auto-dismiss
      - `remove(id)` — supprime une notification par id
      - `success(message, duration?)` — raccourci pour `add('success', ...)`
      - `error(message, duration?)` — raccourci (durée par défaut plus longue : 8000ms)
      - `warning(message, duration?)` — raccourci
      - `info(message, duration?)` — raccourci
    - Computed : `hasNotifications` — boolean
  - Notes : Les erreurs ont un auto-dismiss plus long (8s au lieu de 5s) car l'utilisateur a besoin de plus de temps pour les lire

- [ ] **Task 19 : Créer le composable `useNotify()`**
  - File : `src/composables/useNotify.ts`
  - Action : Créer un composable qui :
    - Importe `useNotificationStore`
    - Retourne `{ success, error, warning, info }` (les raccourcis du store)
  - Notes : Ce composable est un simple wrapper pour un import plus propre dans les composants. Usage : `const { success, error } = useNotify()`

- [ ] **Task 20 : Créer le composant `ToastContainer.vue`**
  - File : `src/components/shared/ToastContainer.vue`
  - Action : Créer un composant qui :
    - Importe `useNotificationStore`
    - Affiche les notifications en position fixe en bas à droite
    - Chaque toast a :
      - Une icône par type (check pour success, X pour error, ! pour warning, i pour info)
      - Le message
      - Un bouton fermer (×)
      - Une barre de progression qui se vide pendant la durée
    - Transition d'entrée/sortie avec `<TransitionGroup>`
    - Couleurs via CSS variables : `--color-success`, `--color-danger`, `--color-warning`, `--color-primary`
  - Notes : Max 5 toasts visibles en même temps. Si plus, les anciens sont retirés.

- [ ] **Task 21 : Monter le ToastContainer dans App.vue**
  - File : `src/App.vue`
  - Action : Ajouter `<ToastContainer />` après `</main>` et avant `</div>`, import du composant
  - Notes : Le ToastContainer est rendu en dehors du flow principal, en position fixe

- [ ] **Task 22 : Tests notification store**
  - File : `tests/unit/stores/notification.store.test.ts`
  - Action :
    - `it('démarre avec zéro notification')` — `notifications.length === 0`
    - `it('ajoute une notification success')` — `store.success('OK')` → 1 notification de type 'success'
    - `it('ajoute une notification error avec durée plus longue')` — `store.error('Fail')` → durée 8000
    - `it('supprime une notification par id')` — ajouter, puis `store.remove(id)`, vérifier supprimée
    - `it('auto-dismiss après la durée')` — ajouter avec `duration: 100`, attendre 150ms via `vi.advanceTimersByTime`, vérifier supprimée
    - `it('limite à 5 notifications')` — ajouter 7, vérifier que seules les 5 dernières sont présentes
    - `it('hasNotifications est réactif')` — vérifier computed

- [ ] **Task 23 : Tests composable useNotify**
  - File : `tests/unit/composables/useNotify.test.ts`
  - Action :
    - `it('expose les méthodes success/error/warning/info')` — vérifier que les 4 sont des fonctions
    - `it('appelle le store quand on utilise success()')` — vérifier que store.add est appelé avec type 'success'

## Additional Context

### Dependencies

| Dépendance | Version | Raison | Taille |
|-----------|---------|--------|--------|
| `dompurify` | ^3.x | Sanitization HTML côté client | ~7kb gzip |
| `@types/dompurify` | ^3.x | Types TypeScript (devDependency) | — |

Aucune autre nouvelle dépendance. Tout le reste (ErrorBoundary, Router Guards, Toasts) est fait maison avec Vue 3 natif.

### Testing Strategy

**Tests unitaires (Vitest) :**
- 5 fichiers de test à créer (listés dans les tasks 8, 12, 17, 22, 23)
- ~30 cas de test au total
- Utiliser `vi.useFakeTimers()` pour les tests de toast auto-dismiss
- Utiliser `mount()` de `@vue/test-utils` pour les tests de composants (ErrorBoundary, directive)
- Pour les tests router : créer un router de test avec `createRouter({ history: createMemoryHistory(), routes })`

**Tests manuels :**
1. Ouvrir un article dans l'éditeur → vérifier que le contenu s'affiche correctement (pas de régression v-safe-html)
2. Ouvrir CaptainValidation et déclencher une analyse → vérifier que le markdown s'affiche
3. Naviguer vers une URL invalide → vérifier la page 404
4. Inspecter la console navigateur → vérifier qu'il n'y a pas d'erreur DOMPurify qui supprime du contenu légitime

### Notes

**Risques identifiés :**
1. **DOMPurify trop restrictif** — Si la config par défaut supprime du HTML légitime (ex: attributs `class`, `style` inline dans le contenu streamé). Mitigation : config `ADD_ATTR: ['class', 'style', 'data-testid']` dès le départ.
2. **SVG dans RadarKeywordCard** — Le `badge.svg` contient du SVG brut (`<path>`, `<circle>`, etc.). DOMPurify doit être configuré avec `ADD_TAGS` pour SVG. Mitigation : config SVG explicite + test dédié.
3. **ErrorBoundary et re-render** — Le bouton "Réessayer" force un re-render du composant enfant via un `key` incrémenté. Si l'erreur est persistante (pas un glitch temporaire), l'utilisateur verra un cycle erreur/retry. Mitigation : après 3 retries, afficher "Erreur persistante, rechargez la page".
4. **Router guard et performance** — Le guard est synchrone (validation syntaxique uniquement), donc aucun impact sur les temps de navigation.

**Futures améliorations (hors scope) :**
- Connecter `useNotify()` aux stores existants pour afficher automatiquement les `error.value` en toast
- Ajouter un mode "offline" au toast pour les erreurs réseau
- Error Boundary avec rapport d'erreur (envoi au serveur pour monitoring)
