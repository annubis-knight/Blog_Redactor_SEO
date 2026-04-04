# Story 7.4: Panel IA structure Hn + Lock Lieutenants

Status: done

## Story

As a consultant SEO,
I want un panel IA qui recommande une structure Hn avec mes Lieutenants selectionnees, et pouvoir verrouiller mes Lieutenants,
So that j'ai une proposition de plan concrete et je peux passer au Lexique.

## Acceptance Criteria

1. **Given** des Lieutenants sont selectionnes **When** le panel IA depliable est ouvert **Then** il affiche une structure Hn recommandee utilisant les Lieutenants selectionnes (FR27) **And** le panel se charge en streaming SSE

2. **Given** l'utilisateur est satisfait de sa selection de Lieutenants **When** il clique sur "Valider les Lieutenants" **Then** les Lieutenants sont verrouilles (FR28) **And** le sous-onglet Lexique est debloque pour les actions **And** l'evenement `check-completed` est emis avec `lieutenants_locked`

3. **Given** les Lieutenants sont verrouilles **When** l'utilisateur clique sur unlock **Then** les Lieutenants sont deverrouilles **And** le sous-onglet Lexique repasse en gating souple

## Tasks / Subtasks

- [x] Task 1 : Creer le prompt IA pour la structure Hn (AC: #1)
  - [x] 1.1 Creer `server/prompts/lieutenants-hn-structure.md` avec template de prompt : contexte Capitaine, Lieutenants selectionnes, structure Hn concurrents, niveau article
  - [x] 1.2 Le prompt demande une structure H2/H3 optimisee SEO, utilisant les Lieutenants comme sous-themes

- [x] Task 2 : Ajouter la route SSE pour la recommandation Hn (AC: #1)
  - [x] 2.1 Ajouter `POST /api/keywords/:keyword/ai-hn-structure` dans `server/routes/keyword-ai-panel.routes.ts`
  - [x] 2.2 Body : `{ lieutenants: string[], level: ArticleLevel, hnStructure: { level: number, text: string, count: number }[] }`
  - [x] 2.3 Utiliser le pattern `consumeStream` + `loadPrompt` + `streamChatCompletion` deja en place dans le meme fichier
  - [x] 2.4 Events SSE : `event: chunk` → `{ content }`, `event: done` → `{ metadata, usage }`

- [x] Task 3 : Ajouter le panel IA depliable dans LieutenantsSelection.vue (AC: #1)
  - [x] 3.1 Importer `useStreaming` depuis `@/composables/useStreaming`
  - [x] 3.2 Ajouter state : `aiPanelOpen = ref(false)`, `aiChunks`, `aiIsStreaming`, `aiError`, `aiStartStream`, `aiAbort`
  - [x] 3.3 Ajouter fonction `generateHnStructure()` qui appelle `aiStartStream` avec `/api/keywords/${keyword}/ai-hn-structure` et le body (lieutenants, level, hnStructure extraits de hnRecurrence)
  - [x] 3.4 Ajouter le template du panel IA APRES la 4eme CollapsableSection : bouton toggle "Structure Hn recommandee" avec streaming-dot, contenu conditionnel (loading/error/chunks/empty), bouton "Generer" pour declencher la recommandation
  - [x] 3.5 Le panel n'auto-trigger PAS — l'utilisateur clique sur "Generer" pour lancer le streaming (evite les appels API excessifs a chaque changement de checkbox)

- [x] Task 4 : Ajouter le mecanisme lock/unlock Lieutenants (AC: #2, #3)
  - [x] 4.1 Ajouter prop `initialLocked: boolean` (defaut false) pour restaurer l'etat de verrouillage au remount
  - [x] 4.2 Ajouter emits `check-completed` et `check-removed` avec payload `string`
  - [x] 4.3 Ajouter `isLocked = ref(props.initialLocked)`
  - [x] 4.4 `lockLieutenants()` : set isLocked=true, emit('check-completed', 'lieutenants_locked')
  - [x] 4.5 `unlockLieutenants()` : set isLocked=false, emit('check-removed', 'lieutenants_locked')
  - [x] 4.6 Template lock : bouton "Valider les Lieutenants" (disabled si selectedLieutenants.size === 0), etat verrouille avec badge + bouton "Deverrouiller"
  - [x] 4.7 Quand verrouille : desactiver les checkboxes, cacher le bouton "Generer" du panel IA, afficher le panel en lecture seule
  - [x] 4.8 Watcher article change : reset isLocked = false en plus des resets existants

- [x] Task 5 : Integrer dans MoteurView.vue (AC: #2, #3)
  - [x] 5.1 Ajouter `:initial-locked="isLieutenantsLocked"` sur le composant LieutenantsSelection
  - [x] 5.2 Ajouter `@check-completed="emitCheckCompleted"` et `@check-removed="handleCheckRemoved"` sur LieutenantsSelection
  - [x] 5.3 Verifier que `isLieutenantsLocked` computed existe deja (il existe — confirme dans la recherche)

- [x] Task 6 : Ecrire les tests (AC: #1-#3)
  - [x] 6.1 Tests panel IA : toggle open/close, etat initial ferme, bouton "Generer" appelle startStream, affichage streaming-dot pendant chargement, affichage contenu chunks, affichage erreur, etat vide initial
  - [x] 6.2 Tests lock/unlock : bouton "Valider" desactive si 0 selectionnes, active si >= 1, click lock → isLocked true + emit check-completed, etat verrouille affiche badge + unlock, click unlock → isLocked false + emit check-removed
  - [x] 6.3 Tests etat verrouille : checkboxes desactivees, selection impossible, panel IA en lecture seule
  - [x] 6.4 Tests reset : article change reset isLocked = false
  - [x] 6.5 Tests route backend : mock streamChatCompletion, verifier SSE events, verifier loadPrompt appele avec bons params
  - [x] 6.6 Test initialLocked prop : composant monte avec initialLocked=true → etat verrouille immediatement

## Dev Notes

### Architecture — Panel IA structure Hn (pattern existant)

Reutiliser **exactement** le pattern de CaptainValidation.vue (Story 6.5) :

**Frontend (composable useStreaming) :**
```typescript
import { useStreaming } from '@/composables/useStreaming'

const { chunks: aiChunks, isStreaming: aiIsStreaming, error: aiError,
        startStream: aiStartStream, abort: aiAbort } = useStreaming()
const aiPanelOpen = ref(false) // ferme par defaut (contrairement au Capitaine)

function generateHnStructure() {
  if (!props.captainKeyword || selectedLieutenants.value.size === 0) return
  aiAbort()
  aiStartStream(
    `/api/keywords/${encodeURIComponent(props.captainKeyword)}/ai-hn-structure`,
    {
      lieutenants: Array.from(selectedLieutenants.value),
      level: props.articleLevel ?? 'intermediaire',
      hnStructure: hnRecurrence.value
        .filter(h => h.count >= 2)
        .map(h => ({ level: h.level, text: h.text, count: h.count })),
    },
  )
}
```

**IMPORTANT** : Le panel IA n'auto-trigger PAS au changement de selection. L'utilisateur clique explicitement sur un bouton "Generer" pour lancer la recommandation. Raison : chaque checkbox toggle changerait les lieutenants et spammerait l'API Claude.

**Backend (route SSE) — etendre keyword-ai-panel.routes.ts :**
```typescript
router.post('/keywords/:keyword/ai-hn-structure', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { lieutenants, level, hnStructure } = req.body

  const systemPrompt = await loadPrompt('lieutenants-hn-structure', {
    keyword,
    lieutenants: lieutenants.join(', '),
    level,
    hn_structure: hnStructure.map((h: any) => `H${h.level}: ${h.text} (${h.count}x)`).join('\n'),
  })

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const userPrompt = `Recommande une structure Hn pour un article "${keyword}" de niveau ${level} utilisant ces Lieutenants: ${lieutenants.join(', ')}`

  const { fullContent, usage } = await consumeStream(
    streamChatCompletion(systemPrompt, userPrompt),
    (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
  )

  res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
  res.end()
})
```

### Architecture — Lock/Unlock (pattern existant CaptainValidation)

```typescript
// Pattern identique a CaptainValidation.vue lignes 172-183
const isLocked = ref(props.initialLocked)

function lockLieutenants() {
  isLocked.value = true
  emit('check-completed', 'lieutenants_locked')
}

function unlockLieutenants() {
  isLocked.value = false
  emit('check-removed', 'lieutenants_locked')
}
```

**Condition d'activation du bouton lock :**
- `selectedLieutenants.size > 0` — au moins un Lieutenant selectionne
- Pas de verdict comme le Capitaine (pas de scoring ici)

**Etat verrouille :**
- Les checkboxes deviennent disabled
- Les rows ne sont plus cliquables
- Le bouton "Generer" du panel IA est cache (le contenu reste visible)
- Le bouton "Valider" est remplace par le badge "Lieutenants verrouilles" + bouton "Deverrouiller"

### Architecture — Template panel IA

```html
<!-- Panel IA structure Hn (APRES la 4eme CollapsableSection) -->
<div v-if="serpResult" class="ai-panel" data-testid="ai-panel">
  <button class="ai-panel-toggle" data-testid="ai-panel-toggle" @click="aiPanelOpen = !aiPanelOpen">
    <span class="ai-panel-toggle-icon">{{ aiPanelOpen ? '\u25BC' : '\u25B6' }}</span>
    Structure Hn recommandee
    <span v-if="aiIsStreaming" class="ai-panel-streaming-dot" />
  </button>
  <div v-if="aiPanelOpen" class="ai-panel-content" data-testid="ai-panel-content">
    <button v-if="!isLocked && !aiIsStreaming" class="btn-generate"
      :disabled="selectedLieutenants.size === 0"
      @click="generateHnStructure">
      Generer la structure
    </button>
    <div v-if="aiIsStreaming && !aiChunks" class="ai-panel-loading">Analyse en cours...</div>
    <div v-else-if="aiError" class="ai-panel-error">{{ aiError }}</div>
    <div v-else-if="aiChunks" class="ai-panel-text" data-testid="ai-panel-text">{{ aiChunks }}</div>
    <div v-else class="ai-panel-empty">Selectionnez des Lieutenants puis cliquez sur "Generer".</div>
  </div>
</div>
```

### Architecture — Template lock/unlock

```html
<!-- Lock/unlock Lieutenants (tout en bas, APRES le panel IA) -->
<div v-if="serpResult" class="lieutenant-lock" data-testid="lieutenant-lock">
  <button v-if="!isLocked" class="lock-btn" data-testid="lock-btn"
    :disabled="selectedLieutenants.size === 0"
    @click="lockLieutenants">
    Valider les Lieutenants
  </button>
  <div v-else class="locked-state" data-testid="locked-state">
    <span class="locked-badge">Lieutenants verrouilles</span>
    <button class="unlock-btn" data-testid="unlock-btn" @click="unlockLieutenants">Deverrouiller</button>
  </div>
</div>
```

### Architecture — Integration MoteurView

MoteurView a deja les computeds et handlers necessaires :
- `isLieutenantsLocked` computed (lignes 296-306)
- `emitCheckCompleted()` handler (lignes 54-57)
- `handleCheckRemoved()` handler (lignes 59-63)

Il suffit d'ajouter les bindings sur le composant LieutenantsSelection dans le template :
```html
<LieutenantsSelection
  :selected-article="selectedArticle"
  :captain-keyword="captaineKeyword"
  :article-level="articleLevel"
  :is-captaine-locked="isCaptaineLocked"
  :word-groups="discoveryWordGroups"
  :initial-locked="isLieutenantsLocked"       <!-- NOUVEAU -->
  @serp-loaded="onSerpLoaded"
  @lieutenants-updated="onLieutenantsUpdated"
  @check-completed="emitCheckCompleted"        <!-- NOUVEAU -->
  @check-removed="handleCheckRemoved"          <!-- NOUVEAU -->
/>
```

### Architecture — CSS du panel IA

Reutiliser les classes CSS de CaptainValidation.vue pour coherence visuelle :
```css
/* Reutiliser exactement les memes styles que CaptainValidation */
.ai-panel { ... }
.ai-panel-toggle { ... }
.ai-panel-streaming-dot { ... }
.ai-panel-content { ... }
.ai-panel-loading { ... }
.ai-panel-error { ... }
.ai-panel-text { ... }
.ai-panel-empty { ... }

/* Lock/unlock — memes styles que CaptainValidation */
.lieutenant-lock { ... }
.lock-btn { ... }
.locked-state { ... }
.locked-badge { ... }
.unlock-btn { ... }

/* Nouveau : bouton generer */
.btn-generate { ... }
```

### Fichiers impactes

| Fichier | Action | Raison |
|---|---|---|
| `server/prompts/lieutenants-hn-structure.md` | **CREER** | Prompt IA pour recommandation structure Hn |
| `server/routes/keyword-ai-panel.routes.ts` | **MODIFIER** | Ajouter route SSE `/keywords/:keyword/ai-hn-structure` |
| `src/components/moteur/LieutenantsSelection.vue` | **MODIFIER** | Ajouter panel IA depliable + lock/unlock + emit check-completed/check-removed |
| `src/views/MoteurView.vue` | **MODIFIER** | Ajouter props et event handlers sur LieutenantsSelection |
| `tests/unit/components/lieutenants-selection.test.ts` | **MODIFIER** | Tests panel IA, lock/unlock, etat verrouille, route |
| `tests/unit/routes/keyword-ai-panel.routes.test.ts` | **MODIFIER** | Tests route SSE ai-hn-structure |

### Anti-patterns a eviter

- **NE PAS** auto-trigger le panel IA a chaque changement de checkbox — utiliser un bouton "Generer" explicite
- **NE PAS** creer un nouveau fichier de route — etendre `keyword-ai-panel.routes.ts` existant
- **NE PAS** creer un nouveau composable — reutiliser `useStreaming` existant
- **NE PAS** stocker les lieutenants dans le store a ce stade — le store `article-keywords` sera rempli dans Epic 8 lors de la validation finale
- **NE PAS** bloquer la navigation quand les lieutenants ne sont pas verrouilles — gating souple uniquement
- **NE PAS** supprimer les 4 sections existantes de Stories 7.2-7.3 — les conserver telles quelles
- **NE PAS** utiliser EventSource pour le streaming — utiliser `useStreaming` (fetch POST + ReadableStream)
- **NE PAS** oublier d'abort le streaming dans le watcher article change
- **NE PAS** oublier de reset isLocked = false dans le watcher article change

### Testing Standards

- **Framework** : Vitest + Vue Test Utils
- **Fichier existant** : `tests/unit/components/lieutenants-selection.test.ts` — AJOUTER de nouveaux tests (ne pas recreer)
- **Mock useStreaming** : mocker le composable pour controler chunks/isStreaming/error dans les tests
- **Tests panel IA** : verifier toggle, streaming-dot, contenu, erreur, etat vide, bouton generer
- **Tests lock** : verifier bouton desactive si 0 selectionnes, lock/unlock toggle, emits, etat verrouille (checkboxes disabled)
- **Tests route** : mocker `streamChatCompletion`, verifier SSE events, verifier `loadPrompt` appele avec bons params
- **NODE_OPTIONS** : `--max-old-space-size=4096` requis pour la suite complete

### Project Structure Notes

- `src/components/moteur/LieutenantsSelection.vue` — composant principal a etendre (4 sections → 4 sections + panel IA + lock)
- `src/components/moteur/CaptainValidation.vue` — reference pour le pattern AI panel + lock/unlock
- `src/composables/useStreaming.ts` — composable SSE a reutiliser tel quel
- `server/routes/keyword-ai-panel.routes.ts` — route existante a etendre (consumeStream deja dedans)
- `server/utils/prompt-loader.ts` — loadPrompt() pour charger les prompts .md avec substitution
- `server/services/claude.service.ts` — streamChatCompletion() pour le streaming Claude
- `src/views/MoteurView.vue` — parent, modification mineure (props + events)
- `src/stores/article-keywords.store.ts` — PAS modifie dans cette story (Epic 8)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 7.4 Panel IA structure Hn + lock]
- [Source: _bmad-output/planning-artifacts/prd.md — FR27 panel IA Hn, FR28 lock Lieutenants]
- [Source: _bmad-output/planning-artifacts/architecture.md — SSE streaming, useStreaming composable, check-completed pattern]
- [Source: src/components/moteur/CaptainValidation.vue — Pattern AI panel + lock/unlock reference]
- [Source: src/composables/useStreaming.ts — Composable SSE streaming]
- [Source: server/routes/keyword-ai-panel.routes.ts — Route SSE existante, consumeStream helper]
- [Source: _bmad-output/implementation-artifacts/7-3-candidats-lieutenants-avec-badges-selection-checkbox-compteur.md — Story precedente]
- [Source: _bmad-output/implementation-artifacts/6-5-panel-ia-expert-seo-streaming-lock-unlock-capitaine.md — Pattern AI panel + lock/unlock]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Created prompt file `server/prompts/lieutenants-hn-structure.md` with variables: keyword, level, lieutenants, hn_structure, strategy_context
- Extended `server/routes/keyword-ai-panel.routes.ts` with POST `/keywords/:keyword/ai-hn-structure` using existing consumeStream pattern
- Added AI panel (useStreaming composable) and lock/unlock mechanism to LieutenantsSelection.vue
- Added `:initial-locked`, `@check-completed`, `@check-removed` bindings in MoteurView.vue
- 25 new component tests (73→98) + 7 new route tests (10→17)
- Full suite: 106 files, 1532 tests — all green

### File List

- server/prompts/lieutenants-hn-structure.md (CREATED)
- server/routes/keyword-ai-panel.routes.ts (MODIFIED)
- src/components/moteur/LieutenantsSelection.vue (MODIFIED)
- src/views/MoteurView.vue (MODIFIED)
- tests/unit/components/lieutenants-selection.test.ts (MODIFIED)
- tests/unit/routes/keyword-ai-panel.routes.test.ts (MODIFIED)
