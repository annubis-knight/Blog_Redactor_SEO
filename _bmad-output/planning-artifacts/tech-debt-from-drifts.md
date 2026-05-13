---
purpose: 'Dette technique extraite de la passe drifts 2026-05-13 — chantiers à piocher selon les envies'
companion: '_bmad-output/planning-artifacts/drift-code-vs-doc.md'
lastUpdated: '2026-05-13T00:00:00Z'
---

# Tech-debt — issu du tri des drifts (2026-05-13)

> Cinq chantiers sortis du Groupe C de `drift-code-vs-doc.md`. Pas de blocage métier — c'est du nettoyage à programmer indépendamment. Ils sont rangés du plus prioritaire au moins prioritaire selon ma lecture du code, mais c'est toi qui piochera selon tes envies du moment.

| ID | Sujet | Priorité |
|---|---|---|
| TD-DRIFT-019 | Étendre la règle ESLint anti-fallback à tous les KPI marché | **HIGH** |
| ~~TD-DRIFT-006~~ | ~~Retirer le fallback legacy `richLieutenants` dans `FinalisationPanel.vue`~~ | ✅ traité 2026-05-13 |
| TD-DRIFT-004 | Unifier `ArticleType` (PascalCase français) vs `ArticleLevel` (kebab-case ASCII) | **MEDIUM** |
| TD-DRIFT-009 | Factoriser `getOrFetch` dans `cache-helpers.ts` | **LOW** |
| TD-DRIFT-016 | Déplacer `autocomplete.service.ts` dans `services/external/` | **LOW** |

---

## TD-DRIFT-019 — Étendre la règle ESLint anti-fallback à tous les KPI marché

**Priorité : HIGH**

### Problème (langage utilisateur)
Quand une carte mot-clé arrive de l'API avec un volume de recherche absent (par exemple parce que DataForSEO n'a pas répondu), un développeur peut écrire sans s'en rendre compte `card.kpis.searchVolume ?? 0`. Sur l'écran, l'utilisateur voit alors `0` au lieu d'un placeholder `—`, et pire : le tri par volume traite cette carte comme légitimement nulle au lieu de la pousser en bas de liste. Résultat : la carte qui n'a pas de donnée se retrouve mélangée aux vraies cartes à volume 0, et l'utilisateur ne peut plus faire la différence entre « pas mesuré » et « mesuré à 0 ».

La règle ESLint `no-score-fallback` est censée empêcher ce pattern. Aujourd'hui, elle ne le fait que pour les variables/propriétés qui contiennent le mot `Score` (par exemple `relevanceScore`, `compositeScore`). Les autres KPI marché — volume, CPC, difficulté, densité, compétition — passent à travers les mailles. Le PRD §9.4 (`NFR-MAIN-NO-SCORE-FALLBACK`) avait pourtant annoncé cette extension le 2026-05-05.

### Scope concret
- **Fichier à toucher** : `eslint.config.ts` lignes 49-79 (3 sélecteurs AST utilisant `/[Ss]core/`).
- **Cible** : étendre la regex à `/[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity/`, ou créer des règles séparées par KPI pour des messages d'erreur ciblés.
- **Tests** : ajouter dans `tests/unit/coherence/` une suite qui prouve que la règle rejette `card.kpis.searchVolume ?? 0`, `kw.cpc ?? 0`, etc.
- **Audit** : grep cross-codebase post-règle pour identifier les fallbacks existants à corriger (probable poignée dans Capitaine/Lieutenants/Radar).
- **Ordre de grandeur** : ½ journée pour la règle + 1 journée pour les corrections en cascade selon le nombre d'offenders trouvés.

### Pourquoi HIGH
C'est exactement le pattern que le projet a déjà payé cher (régression « tri qui n'utilise pas la valeur affichée », mentionnée dans CLAUDE.md §2.0). Laisser la règle incomplète, c'est inviter la même classe de bug à revenir sur n'importe quel KPI marché. Et la fix est petite.

---

## TD-DRIFT-006 — Retirer le fallback legacy `richLieutenants` dans `FinalisationPanel.vue`

**Priorité : MEDIUM**

### Problème (langage utilisateur)
Le panneau Finalisation du Moteur affiche un résumé des lieutenants validés pour l'article. Si la liste des lieutenants enrichie (`richLieutenants`) est vide ou non hydratée, le composant ne dit pas « pas de données » : il bascule silencieusement sur une vieille structure flat avec un niveau de titre H2 par défaut. C'est un héritage d'avant la refonte du modèle de données — aujourd'hui, l'enrichissement passe par un autre chemin, ce fallback ne devrait jamais se déclencher.

Le risque : si un jour le chemin d'hydratation principal se casse (par exemple un store qui ne se hydrate plus correctement au changement d'article), le bug est masqué par le fallback. L'utilisateur voit quelque chose qui ressemble à des lieutenants — sauf qu'ils sont en H2 par défaut, sans niveau hiérarchique réel, sans scoring, sans le contexte du Capitaine. Diagnostic impossible parce qu'aucun signal n'est levé.

### Scope concret
- **Fichier à toucher** : `src/components/moteur/FinalisationPanel.vue` — repérer le bloc qui teste `richLieutenants.length === 0` et bascule sur la liste flat avec `hnLevel: 2`.
- **Action** : remplacer le fallback par soit un placeholder explicite (« pas de lieutenants verrouillés sur cet article »), soit une throw avec un message clair (en mode workflow, c'est un état impossible).
- **Test à ajouter** : prouver que `richLieutenants` est toujours hydraté en mode workflow (assertion sur le store ou test E2E de cohérence sur le composant).
- **Vigilance** : vérifier qu'il n'y a pas de cas légitime où le fallback servait (utilisateur libre, mode laboratoire) — si oui, garder un chemin dédié mode `libre`.
- **Ordre de grandeur** : ½ journée.

### Pourquoi MEDIUM
Pas de bug actif aujourd'hui, mais c'est le genre de filet de sécurité silencieux qui empêche de détecter un vrai bug le jour où il arrive. À faire avant qu'un chantier futur ne déstabilise l'hydratation des lieutenants.

---

## TD-DRIFT-004 — Unifier `ArticleType` (PascalCase français) vs `ArticleLevel` (kebab-case ASCII)

**Priorité : MEDIUM**

### Problème (langage utilisateur)
Le projet utilise deux types différents pour parler de la même notion d'aiguillage Pilier / Intermédiaire / Spécifique. L'un emploie le PascalCase français avec accent (`Pilier`, `Intermédiaire`, `Spécialisé`), l'autre kebab-case ASCII (`pilier`, `intermediaire`, `specifique`). Ils coexistent dans le code et dans les payloads API.

À la frontière entre une couche qui produit l'un et une couche qui consomme l'autre, il y a un risque de bug subtil : une comparaison qui rate à cause d'un accent, un filtre qui exclut un type qu'il aurait dû inclure, un tri qui passe par un cas par défaut sans alerter. C'est le genre de bug qui ne se voit pas tant que personne ne renomme jamais — mais le jour où on touche au type, tout casse en cascade.

### Scope concret
- **Fichiers concernés** : `shared/types/strategy.types.ts` (porte `ArticleLevel`), divers fichiers qui importent l'un ou l'autre (à recenser via `grep "ArticleType\|ArticleLevel"`).
- **Décision à prendre en amont** : quel est le type canonique ? Recommandation : `ArticleLevel` (kebab-case ASCII) — plus stable pour API/URL/DB, moins de bugs d'encodage.
- **Action** : 
  1. Choisir le canonique.
  2. Ajouter une fonction de conversion bidirectionnelle (`toArticleLevel(ArticleType): ArticleLevel`) avec exhaustivité TS.
  3. Migrer les consommateurs vers le canonique (commit par couche).
  4. Déprécier l'alias (note JSDoc `@deprecated`) puis le retirer dans un sprint suivant.
- **Tests** : assertions de round-trip + tests aux frontières (route Express, prompts IA, DB).
- **Ordre de grandeur** : 1 à 1,5 journée selon le nombre de consommateurs.

### Pourquoi MEDIUM
Pas de bug actif visible, mais c'est une dette qui grossit silencieusement à chaque nouvelle feature qui touche aux types d'article. La rendre claire évitera une journée perdue à chercher un bug d'encodage dans 6 mois.

---

## TD-DRIFT-009 — Factoriser `getOrFetch` dans `cache-helpers.ts`

**Priorité : LOW**

### Problème (langage utilisateur)
Le projet a un pattern récurrent : « regarde dans le cache, si frais utilise, sinon appelle l'API externe et écris en cache ». Ce pattern est codé en dur dans au moins deux services (`community-discussions.service.ts`, `keyword-discovery.service.ts`), chacun avec sa propre implémentation. Le pattern marche, mais chaque copie peut diverger légèrement (gestion d'erreur, durée TTL, format de clé), et un développeur qui veut comprendre la discipline de cache doit lire 2-3 endroits différents.

Le PRD initial décrivait `getOrFetch<T>(cacheType, key, ttlMs, fetcher)` comme un helper unique exporté par `server/db/cache-helpers.ts`. La réalité : `cache-helpers.ts` n'expose que les 3 primitives atomiques (`getCached`, `setCached`, `deleteCached`). Le motif composite est reproduit par convention, pas centralisé.

### Scope concret
- **Fichiers concernés** :
  - `server/db/cache-helpers.ts` — ajouter `getOrFetch<T>(...)`.
  - `server/services/keyword/community-discussions.service.ts:5` — remplacer l'impl locale par l'import.
  - `server/services/keyword/keyword-discovery.service.ts:11` — idem.
  - Audit additionnel : grep dans `server/services/` pour repérer d'autres copies.
- **Tests** : Vitest sur le helper centralisé (3-4 scénarios : cache hit, cache miss, fetcher qui throw, TTL expiré).
- **Bonus** : ajouter un log de hit/miss pour mesurer le cache hit rate (cible NFR > 90 %).
- **Ordre de grandeur** : ½ journée.

### Pourquoi LOW
Pas de bug, pas de risque de régression utilisateur. C'est de la propreté de code. Bon candidat pour un sprint « nettoyage backend » groupé avec d'autres factorisations. Alternative : accepter le pattern dupliqué et corriger la doc — selon ta préférence.

---

## TD-DRIFT-016 — Déplacer `autocomplete.service.ts` dans `services/external/`

**Priorité : LOW**

### Problème (langage utilisateur)
Tous les services qui appellent une API tierce (DataForSEO, Google Search Console, Anthropic Claude, embedding, Google scrape) vivent dans `server/services/external/`. Sauf un : `autocomplete.service.ts`, qui appelle `https://suggestqueries.google.com/complete/search` (Google Autocomplete), vit dans `server/services/keyword/` parce qu'il a été créé à une époque où il servait uniquement le pipeline Discovery/Radar.

Fonctionnellement, rien ne casse — le code marche. Le coût est cosmétique mais réel : un développeur qui cherche « comment fait-on appel aux intégrations externes ? » passe directement à `services/external/` et rate Google Autocomplete. Et c'est exactement le genre d'intégration qui pourrait demander un cost-guard ou un retry-on-429 dans le futur — le ranger correctement maintenant évite un loupé plus tard.

### Scope concret
- **Action** : déplacer le fichier `server/services/keyword/autocomplete.service.ts` vers `server/services/external/autocomplete.service.ts`.
- **Consommateurs à mettre à jour** : `grep "from .*keyword/autocomplete.service"` dans `server/`. Ajuster les imports.
- **Test** : la suite existante doit rester verte sans modification — c'est juste un déplacement.
- **Bonus** : si on fait le déplacement, profiter pour s'aligner sur les conventions des autres services external (cost-guard léger ? retry ? logging ?). Mais à ne faire que si c'est trivial — sinon découper en deux tickets.
- **Ordre de grandeur** : 1-2 heures (déplacement pur) ou ½ journée (avec mise au niveau des conventions external).

### Pourquoi LOW
Pas un bug, pas un risque. C'est de la cohérence d'organisation. Bon premier ticket pour un nouvel arrivant sur le projet ou un mini-créneau de fin de sprint.

---

## Pour la suite

Quand tu décides d'attaquer un de ces tickets :
1. Crée une branche dédiée `chore/<sujet-court>` depuis `origin/main`.
2. Suivre la méthode CLAUDE.md §2 (TDD pour les zones critiques, smoke test sinon).
3. Une fois mergé, retirer l'entrée correspondante de ce fichier (ou la marquer ✅ avec date).
4. Si l'audit révèle de nouveaux drifts, les consigner dans `drift-code-vs-doc.md` sous un nouvel ID `DRIFT-NNN`.
