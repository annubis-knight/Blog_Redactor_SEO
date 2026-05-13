---
purpose: 'Suivi des écarts détectés entre le code et la documentation pendant le chantier docs/prd-split-spec-design'
companion: '_bmad-output/planning-artifacts/prd.md, _bmad-output/planning-artifacts/design-registry.md'
lastUpdated: '2026-05-13T00:00:00Z'
---

> **Mise à jour 2026-05-13 (session `docs/treat-drifts-batch`)** : passe de clôture sur le Groupe D et les drifts 021-023 — corrections résiduelles appliquées (refs `paa_cache` PRD, anciens offenders NFR-MAIN-FILE-SIZE).

# Drift code vs doc — chantier `docs/prd-split-spec-design`

> Au fil de la migration PRD → spec + design-registry, les sub-agents et l'agent principal ont découvert des **divergences entre ce que disait la doc et ce que fait réellement le code**. Au lieu d'alourdir le PRD ou le registry avec ces notes, on les consigne ici pour traitement groupé en fin de chantier.

**Convention** : chaque entrée porte un ID `DRIFT-NNN`, la section qui l'a déclenchée, une description courte de l'écart, et une recommandation d'action.

---

## Tri par catégorie (mis à jour 2026-05-13)

Les 23 drifts ont été triés en 4 groupes pour faciliter le traitement (les 3 drifts numérotés 021-023 ont été ajoutés au Groupe D après vérification de clôture le 2026-05-13).

### Groupe A — Doc obsolète, correction simple sans toucher au code *(7 drifts — tous traités 2026-05-13)*

Le PRD initial citait un fichier, un chiffre ou un comportement qui ne correspond plus à la réalité, mais le code fonctionne. Action : corriger la référence dans le registry (ou le PRD si la formulation utilisateur est affectée). Aucune décision produit nécessaire.

- **DRIFT-001** ✅ — `useMoteurBridge.ts` n'existe pas. Ref retirée des Refs code de `DESIGN-CER-CONTEXT-FOR-MOTEUR`, remplacée par `useCocoonStrategyStore` qui est le vrai porteur de `strategicContext`.
- **DRIFT-003** ✅ — `article_strategies.completed_steps` est INTEGER (compteur), pas TEXT[]. Corrigé dans le bloc Persistance de `DESIGN-CER-STEPS-ARTICLE` (registry §8.1) + déjà documenté dans `DESIGN-INFRA-ARTICLE-STRATEGIES` (§8.14).
- **DRIFT-011** ✅ — `BasketStrip.vue` supprimé 2026-05-11. PRD purgé (0 ref grep). Registry §8.15 documente la suppression. (Refs résiduelles dans `architecture.md`/`epics.md` hors scope du chantier doc.)
- **DRIFT-012** ✅ — `LaboView` / `KeywordRadarTab` inexistants. PRD purgé (0 ref grep). Registry §8.15 cite les 3 vrais consommateurs (`DouleurScannerResults`, `CaptainInteractiveWords`, `CaptainPanel`). (Refs résiduelles dans `architecture.md`/`epics.md` hors scope.)
- **DRIFT-013** ✅ — `ArticleWordCountBar` est seulement dans `ArticleWorkflowView`. PRD purgé (0 ref grep). Registry §8.15 acte la localisation réelle, sans question ouverte.
- **DRIFT-017** ✅ — `shared/schemas/` contient 13 fichiers. PRD purgé (0 ref au comptage "41"). Registry `DESIGN-INFRA-ZOD-SHARED` cite le count exact + liste.
- **DRIFT-020** ✅ — Pas de colonne `locked_at` sur `lieutenant_explorations`. Registry `DESIGN-INFRA-LIEUTENANT-EXPLORATIONS` cite le schéma exact + renvoi DRIFT-020. PRD ne mentionne pas le schéma (0 ref grep).

### Groupe B — Décision produit à arbitrer *(1 drift)*

Demande un choix utilisateur, pas une simple correction. Question ouverte.

- **DRIFT-002** — Constantes `cerveau:strategy_defined` / `cerveau:hierarchy_built` / `cerveau:articles_proposed` définies mais **jamais émises par le code**. La chaîne est prête (constantes + endpoint + migration) mais le dispatch côté composants Cerveau manque. **Question** : faut-il câbler les emits manquants pour tenir la promesse PRD, ou retirer ces 3 checks (et leurs dots de progression Cerveau) si l'intention a changé ?

### Groupe C — Dette technique, sprint dédié à planifier *(5 drifts)*

Pas des bugs critiques, mais des nettoyages à faire indépendamment du chantier doc.

- **DRIFT-004** — Cohabitation `ArticleType` (PascalCase français : `Pilier`/`Intermédiaire`/`Spécialisé`) vs `ArticleLevel` (kebab-case ASCII : `pilier`/`intermediaire`/`specifique`). Clarifier le type canonique, l'autre devient alias deprecated.
- **DRIFT-006** — Fallback legacy dans `FinalisationPanel.vue` : si `richLieutenants` est vide, bascule sur une liste flat avec `hnLevel: 2`. Trace d'un ancien modèle. Action : retirer le fallback + ajouter un test garde que `richLieutenants` est toujours hydraté en mode workflow.
- **DRIFT-009** — `getOrFetch` est un **pattern dupliqué** dans plusieurs services (`community-discussions.service.ts`, `keyword-discovery.service.ts`…), pas un helper centralisé dans `cache-helpers.ts`. Action : factoriser dans `cache-helpers.ts` OU accepter la duplication et ajuster la doc.
- **DRIFT-016** — `autocomplete.service.ts` est dans `server/services/keyword/`, pas `server/services/external/` (où sont les autres intégrations tierces). Action : déplacer dans un cleanup de rangement.
- **DRIFT-019** — Règle ESLint `no-score-fallback` ne couvre que `Score` (regex `/[Ss]core/`), pas `Density/Volume/Difficulty/Cpc/Competition` annoncés dans le PRD. Action : étendre la regex.

### Groupe D — Déjà tranchés ou assumés *(10 drifts)*

Pas d'action à prendre. À marquer ✅ pour clore.

- **DRIFT-005** ✅ — `moteur:finalisation_completed` n'existe pas. Corrigé à chaud dans le PRD §8.9.
- **DRIFT-007** ✅ — Deux entry points UI vers la Rédaction. Choix UX assumé, documenté dans le registry.
- **DRIFT-008** ✅ — `POST /progress/uncheck` (pas `DELETE /progress/check`). Corrigé à chaud dans le registry §8.3.
- **DRIFT-010** ✅ — Migration `020_normalize_completed_checks.sql` archivée — cohérent avec `migrations/_archive/`.
- **DRIFT-014** ✅ — `FR-DIS-INTENT-SCAN` réattribuée à `FR-RAD-RESONANCE` (consommée par Radar, pas Discovery).
- **DRIFT-015** ✅ — `internal_links.position` est un offset caractère (`char-<index>`), pas une position ProseMirror stable. Limite acceptée — pas bloquant pour la matrice cocon actuelle.
- **DRIFT-018** ✅ — Table `paa_cache` n'existe pas, c'est la colonne `paa_questions` de `keyword_metrics`. Description corrigée dans le registry §8.14 + **8 refs résiduelles nettoyées dans le PRD 2026-05-13** (sections §1, §2, §3, §5.3, §6, §8.4 table DB).
- **DRIFT-021** ✅ — Anciens offenders > 1000 L disparus. Corrigé dans NFR-MAIN-FILE-SIZE §9.4 + `DESIGN-MAIN-FILE-SIZE` + **§5 « Risques et mitigations » + §12.5 « Dette technique » du PRD nettoyés 2026-05-13** (refs `CaptainValidation`/`KeywordDiscoveryTab`/`BrainPhase` remplacées par `CaptainPanel.vue` 1509 L + `data.service.ts` 1052 L).
- **DRIFT-022** ✅ — Noms env vars retirés du PRD post-migration, formulation utilisateur générique.
- **DRIFT-023** ✅ — Composables en 8 domaines (pas 5). Corrigé dans NFR-MAIN-ORG-COMPOSABLES + `DESIGN-MAIN-ORG-COMPOSABLES`.

---

## Détail des drifts (par ordre numérique)

## DRIFT-001 — `useMoteurBridge.ts` n'existe pas

**Source** : retrofit §8.1 Cerveau (agent du 2026-05-12).

**Constat** : le PRD initial citait `useMoteurBridge.ts` comme composable du pont Cerveau → Moteur. Ce composable **n'existe pas** dans le code. Le rôle est en réalité tenu par `useCocoonStrategyStore`, appelé directement depuis `MoteurView.vue` et `RedactionView.vue`.

**Impact** : la ref code dans `DESIGN-CER-CONTEXT-FOR-MOTEUR` est fausse.

**Action recommandée** : ✅ corrigé 2026-05-13 — ref retirée des « Refs code » de `DESIGN-CER-CONTEXT-FOR-MOTEUR` ; ligne reformulée pour pointer sur `useCocoonStrategyStore` (`src/stores/strategy/cocoon-strategy.store.ts`) avec mention explicite de `fetchContext(cocoonId)` appelé depuis `MoteurView.vue`/`RedactionView.vue`. Note historique sur l'absence de composable bridge dédiée conservée dans le bloc « Stores Pinia ».

---

## DRIFT-002 — Constantes `CERVEAU_*` jamais émises côté front

**Source** : retrofit §8.1 Cerveau.

**Constat** : `CERVEAU_STRATEGY_DEFINED`, `CERVEAU_HIERARCHY_BUILT`, `CERVEAU_ARTICLES_PROPOSED` existent dans `shared/constants/workflow-checks.constants.ts` mais **aucun composant front ne les émet**. La chaîne est prête (constantes + endpoint `POST /progress/check` + migration historique) mais le dispatch manque.

**Impact** : `FR-CER-CHECKS` du PRD promet 3 checks automatiques au franchissement d'étapes Cerveau — promesse non tenue dans le code actuel.

**Action recommandée** : décision produit à prendre — soit câbler les emits manquants côté composants Cerveau, soit retirer ces 3 checks du PRD si l'intention a changé.

---

## DRIFT-003 — `article_strategies.completed_steps` est INTEGER, pas TEXT[]

**Source** : retrofit §8.1 Cerveau.

**Constat** : le bloc Persistance hérité de `DESIGN-CER-STEPS-ARTICLE` indique `completed_steps TEXT[]`. La colonne réelle dans `server/db/schema.sql` est `completed_steps INTEGER` (compteur d'avancement, pas tableau).

**Impact** : description fausse dans le registry. Pas d'impact côté code.

**Action recommandée** : ✅ corrigé 2026-05-13 — bloc Persistance de `DESIGN-CER-STEPS-ARTICLE` corrigé en `completed_steps INTEGER DEFAULT 0` avec note explicative renvoyant à DRIFT-003. Cohérent avec la description déjà à jour dans `DESIGN-INFRA-ARTICLE-STRATEGIES` (§8.14).

---

## DRIFT-004 — Cohabitation `ArticleType` vs `ArticleLevel`

**Source** : retrofit §8.1 Cerveau.

**Constat** : deux types coexistent pour la même notion d'aiguillage Pilier/Intermédiaire/Spécifique :
- `ArticleType` dans le code emploie les valeurs PascalCase françaises (`Pilier`, `Intermédiaire`, `Spécialisé`).
- `ArticleLevel` dans `shared/types/strategy.types.ts` utilise kebab-case ASCII (`pilier`, `intermediaire`, `specifique`).

**Impact** : risque de bug à la frontière (string vs enum). Hors scope migration doc — dette technique pure.

**Action recommandée** : clarifier dans un sprint dédié — un seul type canonique, l'autre devient alias deprecated.

---

## DRIFT-005 — `moteur:finalisation_completed` n'existe pas

**Source** : migration §8.9 Finalisation.

**Constat** : le PRD initial mentionnait ce check « à confirmer dans le code ». Vérifications faites (constantes, FinalisationPanel.vue, grep cross-codebase) — le check n'existe nulle part. Le Moteur reste à **5 checks** par design produit.

**Impact** : aucun (corrigé à chaud dans le PRD §8.9 par l'agent — FR-FIN-CHECK explicite désormais l'absence de check workflow dédié).

**Action recommandée** : ✅ traité.

---

## DRIFT-006 — Fallback historique lieutenants dans `FinalisationPanel.vue`

**Source** : migration §8.9 Finalisation.

**Constat** : le composant porte un fallback legacy — si `richLieutenants` est vide, il bascule sur une liste flat avec `hnLevel: 2` par défaut. Trace d'une époque où le modèle de données était différent.

**Impact** : code mort potentiel — risque de masquer un vrai bug de hydratation. Dette signalée dans le registry §8.9.

**Action recommandée** : retirer le fallback dans un sprint de nettoyage Moteur — ajouter un test qui prouve que `richLieutenants` est toujours hydraté en mode workflow.

---

## DRIFT-007 — Deux entry points UI vers la Rédaction

**Source** : migration §8.9 Finalisation.

**Constat** : le passage Moteur → Rédaction se déclenche depuis deux endroits du DOM :
1. Bouton « Passer à la Rédaction » dans `FinalisationPanel.vue`.
2. Bouton équivalent en pied de page de `MoteurView.vue`.

Les deux sont unifiés par la même computed `isFinalisationUnlocked` (logique pure dans `useFinalisationGating.ts`), donc le comportement est cohérent.

**Impact** : pas un bug — choix UX assumé. Documenté dans le registry §8.9.

**Action recommandée** : ✅ documenté.

---

## DRIFT-008 — `DELETE /progress/check` n'existe pas — c'est `POST /progress/uncheck`

**Source** : migration §8.3 Moteur règles transversales.

**Constat** : plusieurs FR (FR-MOT-CHECK-RECONCILIATION notamment, AC.RECONCILE.5) parlent de « routes `POST /progress/check` et `DELETE /progress/check` ». Vérification du code (`server/routes/articles.routes.ts:341,362` + `src/stores/article/article-progress.store.ts:43-55`) :

- Ajout d'un check : `POST /articles/:id/progress/check` ✅ (existe).
- Retrait d'un check : `POST /articles/:id/progress/uncheck` (PAS un `DELETE`).

**Impact** : description fausse dans le PRD initial (les routes existent et fonctionnent, c'est juste le verbe HTTP qui diverge).

**Action recommandée** : ✅ corrigé à chaud — le registry §8.3 décrit le couple réel (`POST /progress/check` + `POST /progress/uncheck`). PRD §8.3 réécrit en langage utilisateur ne mentionne plus les verbes HTTP.

---

## DRIFT-009 — `getOrFetch` n'est pas un helper centralisé

**Source** : migration §8.3 Moteur (FR-MOT-CACHE-CASCADE).

**Constat** : le PRD initial décrit `getOrFetch<T>(cacheType, key, ttlMs, fetcher)` comme un « pattern unifié » exposé par `server/db/cache-helpers.ts`. La réalité : `cache-helpers.ts` n'exporte que `getCached` / `setCached` / `deleteCached` (3 helpers atomiques). La fonction `getOrFetch` est **réimplémentée localement** dans au moins 2 services (`community-discussions.service.ts:5`, `keyword-discovery.service.ts:11`) — c'est un pattern reproduit, pas un helper partagé.

**Impact** : description trompeuse — la discipline cache cascade existe bien mais elle est répartie par convention, pas centralisée.

**Action recommandée** : décision produit à prendre — soit centraliser `getOrFetch` dans `cache-helpers.ts` (factorisation), soit accepter le pattern dupliqué et ajuster la doc. Hors scope migration doc.

---

## DRIFT-010 — Migration `020_normalize_completed_checks.sql` archivée

**Source** : migration §8.3 Moteur (FR-MOT-CHECKS-CONSTANTS, mention historique 2026-05-08).

**Constat** : la FR cite la migration `020_normalize_completed_checks.sql` qui aurait converti les checks legacy. Vérification : `server/db/migrations/_archive/` contient le fichier, donc la migration a été appliquée et archivée (cohérent avec CLAUDE.md §1 qui dit que `migrations/_archive/` est historique). Le snapshot `schema.sql` actuel reflète l'état post-migration. Ce point n'est pas un drift à proprement parler mais mérite d'être clarifié dans le registry comme « historique archivé, pas source de vérité ».

**Impact** : aucun, juste un point de vigilance documentaire.

**Action recommandée** : ✅ documenté — le registry §8.3 mentionne la migration comme historique, sans inviter à la lire pour comprendre l'état courant.

---

## DRIFT-011 — `BasketStrip.vue` supprimé 2026-05-11, encore listé dans le PRD §8.15

**Source** : migration §8.15 Composants UI partagés (agent du 2026-05-12).

**Constat** : la table `FR-UI-MOTEUR-SHARED` du PRD pré-migration listait `BasketStrip.vue` comme brique partagée Discovery/Radar. Le composant a été supprimé le 2026-05-11 dans le chantier `radar-dbfirst-refactor` (`FR-MOT-BASKET-DEPRECATED`) — confirmé par un commentaire explicite dans `MoteurView.vue:510` (« BasketStrip supprimé 2026-05-11 […] les keywords accumulés vivent désormais en DB via `radar_explorations` ») et par `grep` cross-codebase (aucun import survivant). La FR-MOT-BASKET-DEPRECATED du PRD documente déjà le retrait, mais la liste §8.15 ne reflétait pas le nouvel état.

**Impact** : ligne fausse dans le PRD pré-migration §8.15. Aucun impact code.

**Action recommandée** : ✅ traité — l'entrée `BasketStrip.vue` est absente de la nouvelle table `DESIGN-UI-MOTEUR-SHARED` et le constat de suppression est documenté en bloc « Décisions d'architecture ».

---

## DRIFT-012 — `LaboView` et `KeywordRadarTab` mentionnés dans le PRD §8.15 n'existent pas dans le code

**Source** : migration §8.15 Composants UI partagés.

**Constat** : la FR-UI-RADAR-CARD du PRD pré-migration citait 3 contextes consommateurs avec les composants `KeywordRadarTab` (mode KPI) et `LaboView` (mode libre). Aucun de ces deux composants n'existe dans `src/`. Vérifications :
- `find src -iname "*labo*"` → 0 résultat.
- `find src -name "KeywordRadarTab*"` → 0 résultat.

Les consommateurs réels identifiés par `grep RadarKeywordCard|RadarCardCheckable|RadarCardLockable src/` :
1. `src/components/intent/scanner/DouleurScannerResults.vue` (Discovery — mode `kpi` via `RadarCardCheckable`).
2. `src/components/moteur/CaptainInteractiveWords.vue` (Capitaine — mode `relevance` via `RadarCardLockable`), monté par `CaptainRadarList.vue`.
3. `src/components/moteur/CaptainPanel.vue` ligne 1150 (Capitaine — usage direct de `RadarKeywordCard` pour l'affichage diagnostique du mot-clé sélectionné).

**Impact** : description PRD trompeuse — pas de mode « Labo », et le mode KPI vit dans le scanner Discovery, pas dans un onglet Radar dédié. Pas d'impact code.

**Action recommandée** : ✅ traité — la nouvelle table `DESIGN-UI-RADAR-CARD` cite les 3 consommateurs réels avec leur fichier exact.

---

## DRIFT-013 — `ArticleWordCountBar` localisé dans `ArticleWorkflowView`, pas `ArticleEditorView`

**Source** : migration §8.15 Composants UI partagés.

**Constat** : la table `FR-UI-ARTICLE-SHARED` du PRD pré-migration indiquait `ArticleWordCountBar.vue` comme consommé par `ArticleEditorView` uniquement. `grep ArticleWordCountBar src/` retourne **uniquement** `src/views/ArticleWorkflowView.vue` au 2026-05-12 — l'inverse de ce que disait le PRD.

**Impact** : description PRD inversée, sans impact code. Toutefois, soulève une question : est-il intentionnel que l'éditeur libre n'expose pas le compteur de mots, ou est-ce une régression silencieuse du chantier découpage monstres Vue ?

**Action recommandée** : ✅ tranché 2026-05-13 — la version code (`ArticleWordCountBar` dans `ArticleWorkflowView` uniquement) est la bonne ; l'éditeur libre n'expose pas le compteur de mots par design. PRD pré-migration purgé (0 ref grep) ; `DESIGN-UI-ARTICLE-SHARED` (§8.15) acte la localisation réelle. Décision produit fermée.

---

## DRIFT-014 — `FR-DIS-INTENT-SCAN` listée dans §8.4 Discovery mais consommée par §8.5 Radar

**Source** : migration §8.4 Moteur — Discovery.

**Constat** : le PRD pré-migration listait `FR-DIS-INTENT-SCAN` (endpoint `POST /api/keywords/intent-scan` — SERP advanced + résonance topic/PAA + matching stemmatique) dans la section §8.4 Discovery. Vérifications cross-codebase :

- `grep "intent-scan|intentScan" src/` retourne **uniquement** `src/components/intent/RadarPanel.vue` et `src/composables/keyword/useResonanceScore.ts` — pas un seul consommateur dans `src/components/moteur/discovery/` ni `src/composables/keyword/useDiscoveryPanel.ts`.
- Le service `server/services/intent/intent-scan.service.ts` (résonance + stemmer FR) est appelé exclusivement par le scan Radar (`scanIntent` invoqué dans le flux 2-passes Radar).
- L'onglet Discovery utilise sept routes complètement disjointes : `/keywords/suggest-all`, `/keywords/discover`, `/keywords/radar/generate` (pour la source IA + courte-traîne), `/keywords/relevance-score`, `/keywords/analyze-discovery`, `/keywords/word-groups`, `/discovery-cache/*`.

**Impact** : FR mal classée dans le PRD initial. Probablement un héritage d'une époque où Discovery et Radar étaient pensés ensemble. Pas de bug code — juste une cartographie de doc incorrecte.

**Action recommandée** : la FR est **relocalisée** côté `FR-RAD-RESONANCE` (§8.5) lors d'une future passe de migration §8.5. PRD §8.4 garde une stub deprecated « relocated » qui pointe explicitement vers `FR-RAD-RESONANCE`. Pas de design entry créée côté Discovery — l'entrée Design correspondante doit naître dans `DESIGN-RAD-RESONANCE` (§8.5).

---

## DRIFT-015 — `internal_links.position` est une string flottante, pas une position ProseMirror

**Source** : migration §8.10 Rédaction — `DESIGN-RED-INTERNAL-LINKING`.

**Constat** : la table `internal_links` (cf. `server/db/schema.sql:132-142`) porte une colonne `position TEXT` avec contrainte d'unicité `(source_id, target_id, position)`. Dans `useInternalLinking.applySuggestion`, le code stocke `position: \`char-${anchorIndex}\`` où `anchorIndex` est l'index du premier caractère matché dans `editor.state.doc.textContent`. Cette valeur est calculée au moment de l'application, pas mise à jour si l'article est remanié ensuite.

**Impact** : pour la **matrice cocon** (qui-pointe-vers-qui, statistiques d'orphelins, alertes diversité d'ancres), aucun impact — seuls `source_id`, `target_id` et `anchor_text` comptent. Pour un usage futur de **navigation depuis la matrice vers le lien dans l'article** (par exemple « clic sur la ligne de matrice → ouvrir l'article au lien »), la position deviendrait obsolète après remaniement.

**Action recommandée** : laisser tel quel tant que la matrice cocon n'a pas besoin de jumper précisément. Si un jour la feature est demandée, soit (a) régénérer `position` au save de l'article via un parser HTML qui retrouve le mark `internalLink`, soit (b) basculer `position` sur un identifiant stable (ID de paragraphe) plutôt qu'un offset caractère.

---

## DRIFT-016 — `autocomplete.service.ts` localisé dans `services/keyword/`, pas `services/external/`

**Source** : migration §8.13 Intégrations externes.

**Constat** : la cartographie initiale de §8.13 attendait `server/services/external/autocomplete.service.ts` (cohérence avec les autres intégrations Google : `gsc.service.ts`, `embedding.service.ts`, `dataforseo.service.ts`, etc.). La réalité du code : le fichier est à `server/services/keyword/autocomplete.service.ts` et appelle directement `https://suggestqueries.google.com/complete/search`. Il s'agit bien d'un appel à un service tiers (Google) — sa place naturelle d'après l'organisation par domaine (§3 CLAUDE.md) serait `server/services/external/`.

**Impact** : ne casse rien fonctionnellement. Crée juste une friction de découverte (quelqu'un qui cherche « les intégrations externes » par convention de répertoire passe à côté de Google Autocomplete). Cohérent avec l'historique : le service a probablement été créé quand il servait exclusivement le pipeline keyword Discovery/Radar, et n'a jamais été remonté quand son rôle d'« intégration tierce » est devenu plus visible.

**Action recommandée** : à déplacer dans `server/services/external/autocomplete.service.ts` lors d'un futur chantier de cleanup. Pas de blocage fonctionnel — la doc référence simplement le chemin réel `services/keyword/autocomplete.service.ts` en attendant.

---

## DRIFT-017 — `shared/schemas/` contient 13 fichiers, pas ~41 comme annoncé

**Source** : migration §8.14 Infrastructure transversale — `FR-INFRA-ZOD-SHARED`.

**Constat** : le PRD pré-migration annonçait « ~41 fichiers `.schema.ts` partagés ». Vérification réelle : `find shared -name "*.schema.ts"` retourne **13 fichiers** au 2026-05-12. La divergence est probablement le vestige d'une époque où chaque type avait son propre schéma — depuis, plusieurs schémas ont été fusionnés ou n'ont jamais été créés.

**Liste réelle (13 fichiers)** : `article.schema.ts`, `article-progress.schema.ts`, `article-micro-context.schema.ts`, `dataforseo.schema.ts`, `discovery-cache.schema.ts`, `generate.schema.ts`, `keyword.schema.ts`, `linking.schema.ts`, `long-tail-suggestions.schema.ts`, `serp-analysis.schema.ts`, `shared-enums.schema.ts`, `strategy.schema.ts`, `theme-config.schema.ts`.

**Impact** : description PRD trompeuse — le périmètre de la validation Zod est plus étroit qu'annoncé. Pas de bug code. Soulève une question : certaines routes Express n'ont peut-être pas de schéma de validation associé (à vérifier dans un audit séparé).

**Action recommandée** : ✅ corrigé à chaud dans `DESIGN-INFRA-ZOD-SHARED` (count 13 affiché avec la liste). Audit séparé recommandé pour identifier les routes sans validation Zod.

---

## DRIFT-018 — `paa-cache.service.ts` ne crée pas de table `paa_cache` dédiée — utilise `keyword_metrics.paa_questions`

**Source** : migration §8.14 Infrastructure transversale — `FR-INFRA-PAA-CACHE`.

**Constat** : le PRD pré-migration décrivait `paa-cache.service.ts` comme un « cache hiérarchique PAA (level 0/1/2) cross-article. TTL 90 jours par `keyword + depth` ». Vérification du code (`server/services/infra/paa-cache.service.ts:13-47`) : le service `readPaaCache` lit `keyword_metrics.paa_questions` (colonne JSONB) via `getKeywordMetrics`, avec **freshness 1 jour pour les PAA non-vides** (pas 90 jours). `writePaaCache` écrit dans la même colonne via `upsertKeywordPaa`. **Aucune table `paa_cache` dédiée n'existe** dans `server/db/schema.sql`.

**Impact** : description PRD inexacte sur 2 points :
1. La table de stockage (`paa_cache` annoncée vs `keyword_metrics.paa_questions` réelle).
2. Le TTL (90 jours annoncé vs 1 jour effectif côté service).

Pas de bug code — le service fonctionne, c'est la doc qui était fausse.

**Action recommandée** : ✅ corrigé à chaud dans `DESIGN-INFRA-PAA-CACHE` (backing store réel + freshness 1j explicitement documentés). Décision produit à prendre séparément si le TTL 1j est intentionnel ou si on devait viser 90j comme prévu.

---

## DRIFT-019 — Règle ESLint `no-score-fallback` ne couvre que `Score`, pas Density/Volume/Difficulty/Cpc/Competition

**Source** : migration §8.14 Infrastructure transversale — `FR-INFRA-NO-SCORE-FALLBACK`.

**Constat** : le PRD pré-migration affirmait que la règle ESLint « interdit `?? 0`, `?? 50` etc. sur variables / propriétés contenant `Score`, `Density`, `Volume`, `Difficulty`, `Cpc`, `Competition` (insensible à la casse) ». Vérification de `eslint.config.ts` lignes 49-79 : les 3 sélecteurs AST utilisent uniquement la regex `/[Ss]core/` (case-insensitive sur la première lettre). Les KPI marché `Density`, `Volume`, `Difficulty`, `Cpc`, `Competition` ne sont **pas couverts** par la règle actuelle.

**Impact** : la promesse « extension 2026-05-05 aux KPIs marché » du PRD n'a pas été appliquée dans la regex finale. Un développeur peut écrire `card.kpis.searchVolume ?? 0` ou `card.kpis.difficulty ?? 0` sans casser ESLint — le KPI sera affiché 0 sur le front, même si la donnée est `null` côté API. C'est exactement le pattern que la règle est censée empêcher.

**Action recommandée** : étendre la regex pour couvrir tous les KPIs marché (`/[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity/`), ou créer des règles séparées par KPI. Hors scope migration doc — c'est un fix code à programmer dans un sprint dédié.

---

## DRIFT-020 — `lieutenant_explorations.locked_at` mentionnée PRD pré-migration mais absente du schéma courant

**Source** : migration §8.14 Infrastructure transversale — `FR-INFRA-LIEUTENANT-EXPLORATIONS`.

**Constat** : le PRD pré-migration décrivait le schéma `lieutenant_explorations` avec la colonne `locked_at` dans la liste `(article_id, keyword, status, captain_keyword, reasoning, sources, suggested_hn_level, score, kpis, locked_at, explored_at, UNIQUE(article_id, keyword))`. Vérification de `server/db/schema.sql` lignes 266-281 : **aucune colonne `locked_at`** dans la table. Les colonnes réelles sont `(id, article_id, keyword, status, captain_keyword, reasoning, sources, suggested_hn_level, score, kpis, explored_at)`.

**Impact** : description PRD inexacte. Pas de bug code — `locked_at` n'est consommée nulle part dans le service `getLieutenantExplorations` ni `saveLieutenantExplorations`.

**Action recommandée** : ✅ corrigé à chaud dans `DESIGN-INFRA-LIEUTENANT-EXPLORATIONS` (schéma exact + note de divergence). Décision produit à prendre séparément si la colonne devait exister (pour tracer le moment de « lock » d'un lieutenant sélectionné, par exemple).

---

## DRIFT-021 — Fichiers > 1000 L cités dans NFR-MAIN-FILE-SIZE n'existent plus / ne dépassent plus la cible

**Source** : migration §9.4 Maintenabilité — `NFR-MAIN-FILE-SIZE`.

**Constat** : le PRD pré-migration listait 3 fichiers offenders > 1000 L au 2026-05-04 : `CaptainValidation.vue` (~1507 L), `KeywordDiscoveryTab.vue` (~1419 L), `BrainPhase.vue` (~1066 L). Vérification au 2026-05-12 :
- `CaptainValidation.vue` : **n'existe plus** dans le code (`Glob **/CaptainValidation*` retourne 0 résultat).
- `KeywordDiscoveryTab.vue` : **n'existe plus** dans le code (`Glob **/KeywordDiscoveryTab*` retourne 0 résultat).
- `BrainPhase.vue` : encore présent à `src/components/production/BrainPhase.vue` mais désormais à **575 L** (sous la cible 400, plus juste, mais plus dans la dette > 1000 L).

Les vrais offenders > 1000 L au 2026-05-12, identifiés par `find ... | xargs wc -l | sort -rn | head` :
- `src/components/moteur/CaptainPanel.vue` : **1509 L**
- `server/services/infra/data.service.ts` : **1052 L**

Autres fichiers > 700 L (zone de vigilance) : `keywords.routes.ts` (912), `dynamic-block-drop.ts` (901), `MoteurView.vue` (856), `ArticleEditorView.vue` (790), `StrategyStep.vue` (779), `RadarPanel.vue` (777), `LexiquePanel.vue` (761), `LieutenantsPanel.vue` (753), `ArticleWorkflowView.vue` (732), `BriefStructureStep.vue` (723), `KeywordAuditTable.vue` (723).

**Impact** : la liste pré-migration était devenue trompeuse — un développeur cherchant à attaquer la dette serait parti sur des fichiers fantômes. La sémantique NFR (« cible 400 L, dette historique tolérée ») reste valable, mais la liste concrète a changé.

**Action recommandée** : ✅ corrigé à chaud dans `NFR-MAIN-FILE-SIZE` (PRD) et à documenter dans `DESIGN-MAIN-FILE-SIZE`. Un sprint dédié peut s'attaquer à `CaptainPanel.vue` 1509 L (orchestrateur Capitaine) et `data.service.ts` 1052 L (service serveur fourre-tout cache/articles).

---

## DRIFT-022 — Noms de variables d'environnement DataForSEO cost-guard différents du PRD pré-migration

**Source** : migration §9.2 Coût — `NFR-COST-DATAFORSEO-BUDGET`.

**Constat** : le PRD pré-migration annonçait que le budget cost-guard était configurable via `.env` avec les variables `DATAFORSEO_COST_BUDGET` et `DATAFORSEO_COST_WINDOW_MINUTES`. Vérification de `server/services/external/dataforseo-cost-guard.ts:87,93` : les vrais noms sont `DATAFORSEO_COST_BUDGET_USD` (suffixe `_USD` explicite) et `DATAFORSEO_COST_WINDOW_MIN` (abrégé `MIN`, pas `MINUTES`).

**Impact** : un utilisateur ayant suivi la doc pré-migration et créé `DATAFORSEO_COST_BUDGET=1.00` dans son `.env` n'a pas changé le plafond — le code ne lit pas cette variable. Effet silencieux : la config croit appliquée alors qu'elle est ignorée.

**Action recommandée** : ✅ libellés des env vars retirés du PRD post-migration (formulation utilisateur générique « configurables via variables d'environnement »). Les noms exacts seront dans `DESIGN-COST-DATAFORSEO-BUDGET` (registry) qui pointe sur le code.

---

## DRIFT-023 — Composables organisés en 8 domaines, pas 5 comme annoncé

**Source** : migration §9.4 Maintenabilité — `NFR-MAIN-ORG-COMPOSABLES`.

**Constat** : le PRD pré-migration annonçait « Composables organisés en 5 domaines : keyword, intent, editor, seo, ui ». Vérification de `ls src/composables/` : **8 dossiers** au 2026-05-12 — `article`, `editor`, `intent`, `keyword`, `lexique`, `moteur`, `seo`, `ui`. La croissance est cohérente avec l'évolution du projet (extraction d'un sous-domaine Moteur depuis les vues, sous-domaine Lexique, sous-domaine Article pour les composables transverses redaction).

**Impact** : description PRD obsolète depuis au moins 2 sprints. Aucun bug code.

**Action recommandée** : ✅ corrigé à chaud dans `NFR-MAIN-ORG-COMPOSABLES` (PRD), à documenter dans `DESIGN-MAIN-ORG-COMPOSABLES` (registry).

---

## Convention pour les futurs sub-agents

Quand un agent de migration rencontre un écart entre le PRD initial et le code réel, il doit :

1. **Si l'écart est mineur et corrigeable à chaud** (ex : nom de fichier qui a changé) : corriger directement dans le registry et le signaler en résumé.
2. **Si l'écart est structurel ou demande une décision produit** : appender une entrée `DRIFT-NNN` à ce fichier (numéro suivant), sans modifier le code ni reformuler la FR.
3. Mentionner toutes les entrées DRIFT créées dans le résumé final de l'agent.
