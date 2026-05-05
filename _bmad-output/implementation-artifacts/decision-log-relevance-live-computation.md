---
title: Décision log — Score Pertinence en calcul à la volée
date: 2026-05-05
type: decision-log
status: figé
related_tech_spec: tech-spec-relevance-live-computation.md
related_doc: docs/data-flows/relevance-score-live-computation.md
related_fr:
  - FR-RAD-MARKET-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-NO-DB-WRITE
  - FR-CAP-RELEVANCE-NO-CACHE
  - FR-CAP-RELEVANCE-ROOTS-FROM-DB
  - FR-CAP-ROOTS-PERSISTED-AT-ENTRY
  - FR-CAP-RELEVANCE-MEMOIZATION
  - FR-CAP-RELEVANCE-UNAVAILABLE-REASON
  - FR-RAD-NO-RELEVANCE-IN-SCAN
  - FR-CAP-RELEVANCE-LINEAR-ROOTS
  - FR-RAD-CARD-CHEVRON-TOGGLE
---

# Décision log — Score Pertinence en calcul à la volée

> **Statut** : décision figée le 2026-05-05 après une session de discussion approfondie.
> **Pourquoi ce fichier** : tracer le **raisonnement** qui a mené aux 11 FRs, pas seulement les FRs elles-mêmes. Si quelqu'un (utilisateur, futur dev, future session Claude) veut comprendre *pourquoi on a tranché ainsi*, c'est ici. Les FRs et la tech-spec disent **quoi** faire — ce log dit **pourquoi**.

---

## 1. Le problème initial

Deux symptômes distincts rapportés :

### Problème A — Score Pertinence absent au reload Capitaine
Au reload de l'onglet Capitaine, certaines cards affichent `—` avec un tooltip *"painPoint OK + signaux SERP nuls, recalcule"*. Le painPoint est pourtant bien défini en DB.

### Problème B — Clic sur la card Capitaine n'ouvre plus le side panel
Tout clic sur une `RadarKeywordCard` (header keyword, KPIs, score-ring) déclenche le toggle PAA, alors que le comportement attendu est : (a) chevron seul ouvre le PAA, (b) reste de la card ouvre le side panel.

---

## 2. Le diagnostic

### A — Cartographie des flux Pertinence

Investigation : la valeur `relevanceScore` était calculée pendant un scan Radar, persistée dans `radar_explorations.scan_result.cards[].relevanceScore`, puis rapatriée au reload Capitaine via lookup dans cette cellule JSONB.

**Cas qui cassaient** :
- Saisie manuelle Capitaine sans scan Radar préalable → pas d'entrée dans le snapshot → `null`.
- Scan Radar fait avant que le painPoint soit défini → score calculé avec painPoint vide → `null`.
- PainPoint modifié après le scan → score persisté incohérent avec l'état actuel.

### B — Cartographie du clic
`@click.stop="expanded = !expanded"` était posé sur **tout le header** (`<div class="radar-card__header">` ligne 324 de `RadarKeywordCard.vue`). Conséquence : (a) toggle PAA déclenché partout, (b) propagation bloquée vers `radar-list-item` qui ouvre le side panel.

---

## 3. Le cheminement de la discussion

La session a tâtonné sur plusieurs hypothèses avant d'aboutir aux 11 FRs. Voici les étapes clés du raisonnement.

### Étape 1 — "Faut-il persister le Score Pertinence en DB ?"

**Tentation initiale** : ajouter une colonne `relevance_score` quelque part pour figer la valeur.

**Rejeté** par l'utilisateur avec un argument décisif :
> *"Le score de Pertinence dépend à la fois d'un mot-clé ET d'un article. Donc pour le même mot-clé, si l'article change, le score change forcément. C'est ridicule de le persister."*

→ **Décision** : ne JAMAIS persister `relevanceScore` (FR-CAP-RELEVANCE-NO-DB-WRITE).

### Étape 2 — "Et le Score Marché alors ?"

L'utilisateur a clarifié : *"pour le score de Marché ça a du sens — même si on change l'article, le mot-clé aura toujours le même score KPI"*.

**Mais** au moment d'envisager une persistance pour le Marché, l'utilisateur a tranché : *"si on persiste seulement le score Marché et pas le Pertinence, c'est ridicule de modifier la DB juste pour ça. Le Marché est calculable trivialement à partir des colonnes existantes."*

→ **Décision** : aucun des deux scores n'est persisté. Marché calculé front à chaque rendu, Pertinence calculé back à chaque hydratation. **Aucune modification de schéma DB.**

### Étape 3 — "Faut-il un système deux passes ?"

**Tentation Claude** : proposer un système async (passe 1 = score approximatif immédiat, passe 2 = affinement en arrière-plan) pour éviter une latence visible au reload.

**Rejeté** par l'utilisateur :
> *"Je n'ai pas peur d'avoir des loaders pendant le calcul des scores."*

Et plus subtilement :
> *"C'est ridicule. Au final, que penses-tu de ce que tu m'as proposé en exemple à ne pas suivre ?"*

→ **Décision** : un seul calcul synchrone. Loader pendant ~100ms est acceptable. Pas de système deux passes (over-engineering).

### Étape 4 — "Quand calcule-t-on les `root_keywords` ?"

L'utilisateur a corrigé une fausse compréhension de Claude :
> *"Tu m'as dit qu'on crée les racines au verrouillage Capitaine. C'est complètement ridicule : à ce moment-là, le score Pertinence est déjà nécessaire pour décider de verrouiller. Il faut créer les racines au moment où le keyword entre dans `captain_explorations` (envoi depuis Radar, ajout manuel, longue-traîne IA)."*

→ **Décision** : `root_keywords` persistées **dès l'entrée** (FR-CAP-ROOTS-PERSISTED-AT-ENTRY). Confirmé par investigation code : aucune complexité cachée, une seule porte d'écriture aujourd'hui (qu'il faut juste déplacer en amont).

### Étape 5 — "Mémoïsation : où ?"

L'utilisateur a soulevé l'optimisation racines partagées :
> *"Plusieurs mots-clés auront le même mot-clé racine. Il va falloir le calculer qu'une seule fois."*

Discussion sur **où** ranger la valeur réutilisée. Claude a proposé une "Map locale serveur" qui vit le temps d'une requête HTTP (~100ms).

L'utilisateur a craint la confusion avec le store front et le localStorage :
> *"J'ai impression que c'est redondant par rapport au store. En plus de ça, la variable serait pretty complexe."*

Clarification finale via une analogie restaurant et un tableau (DB / api_cache / Map serveur / Store Pinia / ref Vue / localStorage). Conclusion :
- Map serveur = palette du peintre (interne au calcul, ~100ms).
- Store Pinia = tableau accroché au mur (visible utilisateur, jusqu'au F5).
- Pas de redondance : deux rôles distincts à deux moments distincts.

→ **Décision** : Map locale serveur uniquement, pas de cache TTL, pas de localStorage (FR-CAP-RELEVANCE-MEMOIZATION).

### Étape 6 — "Algorithme d'extraction des racines"

L'utilisateur a noté un risque :
> *"Les mots-clés longue-traîne peuvent condenser deux racines totalement différentes. La troncature ne suffit pas, il faudrait une intelligence sémantique."*

Discussion : extraction sémantique (LLM) coûte cher (~500ms × 30 cards = 15s). L'utilisateur a ensuite remarqué que les racines sont déjà persistées dans le tableau `captain_explorations.root_keywords`, donc on les **lit** au lieu de les recalculer.

→ **Décision** : algo linéaire conservé en fallback (FR-CAP-RELEVANCE-LINEAR-ROOTS), lecture prioritaire du tableau persisté (FR-CAP-RELEVANCE-ROOTS-FROM-DB). Évolution sémantique reportée à une tech-spec future si nécessaire.

### Étape 7 — "Tooltip honnête"

L'utilisateur a explicitement demandé :
> *"Tu peux ajouter des logs ou des informations sur le tout le type qui vont permettre à l'utilisateur de savoir ce qui manque dans le calcul du score de pertinence."*

→ **Décision** : 5 causes typées renvoyées par le backend (FR-CAP-RELEVANCE-UNAVAILABLE-REASON), ne plus deviner côté front.

### Étape 8 — Clic chevron

Décision triviale après cartographie. L'utilisateur a précisé :
> *"Déplace le trigger uniquement sur le chevron ou sur le container du chevron. Le PAA sera trigger uniquement sur cette petite partie."*

→ **Décision** : FR-RAD-CARD-CHEVRON-TOGGLE.

---

## 4. Les principes qui ont guidé les décisions

Synthèse des principes directeurs émergés de la discussion :

### Principe 1 — Une donnée dérivée ne se persiste pas
Si une valeur est dérivable de N inputs persistés, elle est **calculée à la demande**, pas stockée. Sinon on crée une dette d'invalidation qu'on finit toujours par oublier. Le Score Pertinence en est l'exemple typique : dériver de painPoint + métriques + racines → recalculer.

### Principe 2 — Séparation des responsabilités par onglet
Chaque score appartient à l'onglet qui en a la responsabilité d'affichage :
- Marché → Radar (et son scan).
- Pertinence → Capitaine (et son hydratation).

Mélanger les responsabilités (Pertinence calculée pendant le scan Radar) crée des dépendances fragiles.

### Principe 3 — Persistance au plus tôt, pas au plus tard
Les `root_keywords` doivent être persistées **dès qu'elles deviennent observables** (entrée dans `captain_explorations`), pas à un moment arbitraire ultérieur (verrouillage). Sinon on crée un état "transitoire" où les racines existent en mémoire mais pas en DB, source de bugs au reload.

### Principe 4 — Lieux de stockage clairs
Chaque donnée a UN lieu canonique :
- DB = vérité long terme.
- Map locale serveur = optimisation transitoire intra-requête.
- Store Pinia = état session navigateur.
- Pas de cache TTL pour les scores.
- Pas de localStorage pour les scores.

Toute redondance ouvre la porte à la divergence.

### Principe 5 — Pas d'over-engineering préventif
Refus du système deux passes : on commence simple (calcul synchrone avec loader), on optimise si la latence devient un problème observable. ~100ms pour 30 cards est acceptable.

### Principe 6 — Honnêteté envers l'utilisateur
Si un score n'est pas calculable, dire **pourquoi** précisément (5 causes typées), pas un message générique trompeur (`"signaux SERP nuls, recalcule"` quand la vraie cause est *"jamais scanné avec ce painPoint"*).

---

## 5. Ce qui aurait pu mal tourner sans cette discussion

Sans le tâtonnement structuré, voici les pièges qu'on aurait pu accepter et qui auraient créé de la dette :

| Piège évité | Pourquoi c'était tentant | Pourquoi ça aurait été mauvais |
|---|---|---|
| Persister `relevanceScore` avec hash painPoint pour invalidation | "Plus rapide au reload, économise du calcul" | Complexité d'invalidation, dette d'oubli si on ajoute une nouvelle source d'invalidation. Le calcul est trop rapide pour justifier ça. |
| Ajouter `market_score` JSONB en DB | "Symétrique au Pertinence, cohérent" | Modification de schéma DB pour rien. Calculable depuis colonnes existantes. |
| Système deux passes async | "Évite le loader visible" | Sur-architecture, état transitoire confus pour l'utilisateur, tests d'intégration lourds. |
| Extraction sémantique LLM des racines dès maintenant | "Plus précis pour les longues-traînes" | 15 secondes au reload, coût $, risque de timeout. À faire dans une vraie tech-spec future si besoin observé. |
| Cache TTL serveur sur les scores | "Économie de calcul si l'utilisateur revient sur la page" | Les 100ms de calcul ne justifient pas un nouveau cache à invalider. La DB est déjà rapide. |
| `localStorage` pour les scores | "Affichage instantané sans appel serveur" | Persistance ad-hoc qui peut diverger de la DB. Pas de mécanisme d'invalidation propre. |
| Garder le `@click.stop` sur tout le header | "Le PAA s'ouvre vite, c'est pratique" | Casse l'UX du side panel attendue. Les utilisateurs cliquent sur la card pour explorer, pas pour ouvrir un PAA. |

---

## 6. Ce qui reste ouvert pour le futur

Décisions explicitement reportées :

- **Extraction sémantique des racines** : si l'algo linéaire se révèle insuffisant en pratique (longues-traînes IA mal couvertes), créer une tech-spec dédiée. Verrouillé par FR-CAP-RELEVANCE-LINEAR-ROOTS.
- **Migration de nettoyage** des anciennes lignes `radar_explorations.scan_result` qui contiennent encore `relevanceScore` : non urgent, le code de lecture les ignore.
- **Suppression de `combinedScore`** legacy : déjà documenté comme `@deprecated` ; supprimable une fois confirmé qu'aucun ancien article ne l'exige.
- **Optimisations performance** si 50+ cards causent une latence visible : parallélisation des calculs, précalcul anticipé au mount d'un autre onglet, etc.

---

## 7. Artefacts produits par cette session

### Documentation
- ✅ [docs/data-flows/relevance-score-live-computation.md](../../docs/data-flows/relevance-score-live-computation.md) — doc figée de référence (NOUVELLE)
- ✅ [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md) — section 2026-05-05 ajoutée
- ✅ [docs/data-flows/score-capitaine.md](../../docs/data-flows/score-capitaine.md) — persistance corrigée
- ✅ [docs/radar-card-component.md](../../docs/radar-card-component.md) — pièges 6 et 7 ajoutés, références croisées
- ✅ [docs/data-flows/README.md](../../docs/data-flows/README.md) — index mis à jour
- ✅ [.claude/CLAUDE.md](../../.claude/CLAUDE.md) — tableau §1 mis à jour

### Exigences fonctionnelles
- ✅ 11 FRs ajoutées au [PRD](../planning-artifacts/prd.md) :
  - FR-RAD-MARKET-COMPUTED-LIVE
  - FR-RAD-NO-RELEVANCE-IN-SCAN
  - FR-RAD-CARD-CHEVRON-TOGGLE
  - FR-CAP-RELEVANCE-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-NO-DB-WRITE
  - FR-CAP-RELEVANCE-NO-CACHE
  - FR-CAP-RELEVANCE-ROOTS-FROM-DB
  - FR-CAP-ROOTS-PERSISTED-AT-ENTRY
  - FR-CAP-RELEVANCE-MEMOIZATION
  - FR-CAP-RELEVANCE-UNAVAILABLE-REASON
  - FR-CAP-RELEVANCE-LINEAR-ROOTS

### Plan d'implémentation
- ✅ [tech-spec-relevance-live-computation.md](tech-spec-relevance-live-computation.md) — 11 étapes, ~29h estimées, 5 scenarios manuels d'acceptation, 9 tests unitaires/intégration listés.

### Code
- ⏳ Pas encore implémenté. La phase de DEV (TDD) commence à la prochaine session.

---

## 8. Pour les futures sessions

**Si tu reviens sur ce sujet, lis dans cet ordre** :

1. Ce fichier (raisonnement et principes).
2. [docs/data-flows/relevance-score-live-computation.md](../../docs/data-flows/relevance-score-live-computation.md) (architecture figée).
3. [tech-spec-relevance-live-computation.md](tech-spec-relevance-live-computation.md) (plan d'exécution).
4. [PRD §8.5 et §8.6](../planning-artifacts/prd.md) (FRs avec critères d'acceptation).

**Si on te demande de faire évoluer une de ces décisions**, vérifie d'abord dans la section §6 ci-dessus si c'est explicitement listé comme "ouvert pour le futur". Sinon, c'est figé — toute remise en question demande de réinstruire le débat avec le même niveau de rigueur.

**Si une régression survient**, le tableau §5 est ton point d'entrée pour comprendre quel piège on a évité et pourquoi.
