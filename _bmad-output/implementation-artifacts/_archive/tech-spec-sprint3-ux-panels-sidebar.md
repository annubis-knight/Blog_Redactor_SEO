---
name: Sprint 3 — UX panels & sidebar (chevron sidebar + panels collapse)
description: (#11) clic sur chevron RadarKeywordCard ne doit pas ouvrir la sidebar Capitaine ; (#5+#12) panels IA collapse par défaut.
type: tech-spec
status: ARCHIVED
version: 1.0.0
created: 2026-05-04
last_updated: 2026-05-04
---

> **🗄️ ARCHIVED — 2026-05-04** — Sprint livré et stable.

# Sprint 3 — UX panels & sidebar

## 1. Frictions

**#11** — Cliquer sur `.radar-card__chevron` ouvre la sidebar Capitaine (effet propagation) en plus de toggler les PAA. Règle utilisateur :
> sidebar UNIQUEMENT si le clic sur la radar card ne déclenche pas d'action. Éléments cliquables de la radarcard : mots underlines, chevron, icônes action.

**#5 + #12** — Panels IA (Capitaine sidepanel + Lieutenants/Lexique/Discovery/Radar bas-de-page) doivent être collapse par défaut. Aujourd'hui ils s'étalent inutilement.

## 2. Cause racine #11

`radar-list-item` (parent dans `CaptainValidation:1037-1047`) a `role="button"` + `@click="selectEntry(...)"`. Le clic sur un sous-élément interactif (chevron, mots, icônes actions) **bubble** et déclenche `selectEntry()` → ouverture sidebar.

Solution simple : `@click.stop` sur les éléments interactifs internes de `RadarKeywordCard` (le chevron, le header, la zone PAA, le tooltip). Le clic sur la **zone vide** (background) du `RadarKeywordCard` propage librement et ouvre la sidebar — comportement attendu.

## 3. Acceptance Criteria

### AC1 — Clic sur header `RadarKeywordCard` ne propage pas
- Header `radar-card__header` (qui contient chevron + keyword + intent badges + score ring) doit `@click.stop` pour bloquer le bubble.
- Test : clic sur `radar-card__header` toggle `expanded` (PAA) ET n'émet PAS d'event qui déclencherait `selectEntry` (vérifié via spy sur le parent).

### AC2 — Clic sur la zone "vide" (body collapsed sans PAA) propage
- Quand `expanded === false`, cliquer sur le bord de la card (zone non-cliquable) doit propager au parent → sidebar s'ouvre.
- Cible UX : pas de "trou cliquable" qui empêcherait l'ouverture de la sidebar.

### AC3 — Panels IA collapse par défaut
- `AiPanel` reçoit une nouvelle prop `defaultCollapsed: boolean = true`.
- Quand collapsed : seul le header + un chevron est visible. Body, error, idle, footer sont masqués.
- L'utilisateur clique sur le header (ou un bouton chevron) pour déployer.
- État local persistant (composable existant ou simple ref local).
- Si `state === 'streaming'`, le panel s'ouvre **automatiquement** (UX : on veut voir le streaming en cours).

### AC4 — Pas de régression sur les onglets

- Les 4 onglets (Capitaine sidepanel + Lieutenants + Lexique + Radar/Discovery) qui utilisent AiPanel doivent continuer de fonctionner. Tests existants verts.
- Le panel `LieutenantsAiPanel` (refait au sprint 1) hérite aussi du collapse par défaut s'il utilise `AiPanelHeader` directement.

## 4. Approche technique

### 4.1 Fix #11
Ajouter `@click.stop` sur :
- `<div class="radar-card__header" @click.stop="expanded = !expanded">` (ligne 316)
- Le score-ring (déjà `mouseenter.stop`, ajouter `click.stop`)
- Pour la zone PAA : déjà `@click.stop` sur les enfants chevron/answer.

### 4.2 Collapse panels IA
- Étendre `AiPanel.vue` avec :
  - prop `defaultCollapsed?: boolean = true`
  - ref local `isCollapsed = ref(props.defaultCollapsed)`
  - watcher `state` : si streaming/error → `isCollapsed = false` (auto-uncollapse)
  - chevron cliquable dans le header pour toggle
  - body conditionnel `v-if="!isCollapsed"`

- `LieutenantsAiPanel.vue` (Sprint 1) : ajouter le pattern collapse au header local (utilise `AiPanelHeader`, pas `AiPanel`). Idem.

## 5. Tests

- **5 tests RadarKeywordCard click propagation** : header + chevron + body PAA n'émettent pas vers parent.
- **6 tests AiPanel collapse** : default collapsed, click header expand, streaming auto-expand, error auto-expand, prop override, success state respect le collapse persistant.

## 6. Hors-scope

- Re-design global du panel IA (sprint 4 cache-bar refonte couvre la DA générale).
