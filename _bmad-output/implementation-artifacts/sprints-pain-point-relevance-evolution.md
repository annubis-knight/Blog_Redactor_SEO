---
title: 'Sprints — Évolution painPoint × Pertinence'
slug: 'pain-point-relevance-evolution'
created: '2026-04-28'
status: 'planning'
parent_spec: 'tech-spec-score-kpi-pertinence-separation'
companion_doc: 'docs/pain-point-editorial-backbone.md'
---

# Sprints — Évolution painPoint × Pertinence

> Ce plan séquence l'implémentation des évolutions discutées en brainstorm 2026-04-28 :
> - couverture painPoint dans les prompts et l'UI manquantes
> - refonte du Score de Pertinence en cumulatif (PAA + racines)
> - gestion fine des racines (doublon, divergence, absence)
> - dépréciation du verdict legacy
>
> Doc de référence produit : [docs/pain-point-editorial-backbone.md](../../docs/pain-point-editorial-backbone.md)
> Doc scoring : [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md)

---

## Vue d'ensemble — 5 sprints, ~3 semaines de dev solo

| Sprint | Thème | Stories | Effort | Risque | Dépend de |
| ------ | ----- | ------- | ------ | ------ | --------- |
| **S1** | Couverture painPoint dans prompts Moteur | 4 | 2-3 j | 🟢 faible | aucune |
| **S2** | Couverture painPoint UI manquante (Lieutenants/Lexique/Hn) | 3 | 3-4 j | 🟡 moyen | S1 |
| **S3** | Refonte scoring Pertinence en cumulatif (PAA) | 4 | 4-5 j | 🟡 moyen | aucune (parallélisable) |
| **S4** | Gestion fine des racines (doublons, divergence, fallback) | 3 | 3-4 j | 🟠 fort | S3 |
| **S5** | Détection intention désirée vs réelle + dépréciation verdict legacy | 3 | 2-3 j | 🟠 fort | S1 + S4 |

**Ordre de livraison recommandé** : S1 → S2 → S3 → S4 → S5
**Parallélisation possible** : S1+S3 en parallèle (zones de code disjointes), puis S2+S4 en parallèle.

---

## Sprint S1 — Couverture painPoint dans les prompts du Moteur

**Objectif** : injecter `{{painPoint}}` dans les prompts du Moteur qui en manquent, pour que les conseils IA soient calibrés douleur. Pas de refonte logique, juste enrichissement contextuel.

**Pourquoi maintenant** : c'est le plus gros gain à effort minimal. Aucun changement de scoring, aucun risque sur le pipeline. Améliore immédiatement la qualité des réponses Claude.

### Stories

#### S1-1 — Enrichir `capitaine-ai-panel.md` avec painPoint
- Ajouter `**Douleur de l'article** : {{painPoint}}` en tête du prompt.
- Faire varier le routeur `/keywords/:kw/ai-panel` ([server/routes/](../../server/routes/)) pour injecter `painPoint` depuis `articleId`.
- Ajouter test contract : `relevanceScore` et `painPoint` présents dans le payload du prompt.
- **AC** : un appel ai-panel avec painPoint définit produit un conseil qui mentionne explicitement la douleur (test manuel + assertion sur le mot-clé du painPoint dans la réponse mock).

#### S1-2 — Enrichir `propose-lieutenants.md` avec painPoint
- Ajouter `{{painPoint}}` + instruction « **écarte les lieutenants qui n'éclaireraient pas cette douleur** ».
- Mettre à jour la signature du service `proposeLieutenants(keyword, painPoint?, ...)`.
- Backward-compat : si `painPoint` absent, le prompt fonctionne comme avant.
- **AC** : test fixture avec painPoint sur une douleur niche → lieutenants proposés contiennent au moins 50 % de termes liés à la douleur.

#### S1-3 — Enrichir `lieutenants-hn-structure.md` avec painPoint
- Ajouter `{{painPoint}}` + instruction « **structure les Hn pour répondre à cette douleur** ».
- Mettre à jour `/keywords/:kw/ai-hn-structure` pour transmettre le painPoint.
- **AC** : H2 générés font écho à la douleur (test snapshot + revue manuelle sur 3 fixtures).

#### S1-4 — Enrichir trio Lexique (`lexique-suggest`, `lexique-analysis-upfront`, `lexique-ai-panel`)
- Injecter `{{painPoint}}` dans les 3 prompts.
- Routeur lexique transmet le painPoint depuis l'article.
- **AC** : suggestions lexicales contiennent au moins 1 terme de la douleur (sur fixture).

### Livrables
- 5 prompts `.md` modifiés
- 3-4 routes/services touchés
- Tests contract étendus
- Doc [pain-point-editorial-backbone.md](../../docs/pain-point-editorial-backbone.md) marqué « Phase A ✅ »

### Risques
- 🟢 Faible : changements purement additifs, fallback si painPoint vide.

---

## Sprint S2 — Couverture painPoint UI manquante

**Objectif** : faire transiter `painPoint` jusqu'aux 3 onglets Moteur qui ne l'ont pas (Lieutenants, Lexique, Hn). C'est l'autre face de S1 — sans transmission UI, les prompts S1 ne reçoivent pas la donnée.

**Pourquoi après S1** : valider d'abord que les prompts savent quoi en faire avant de plomber l'UI.

### Stories

#### S2-1 — Onglet Lieutenants : transmission painPoint
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) reçoit `articlePainPoint` en prop.
- Composable `useLieutenantsProposal` ajoute painPoint au body de l'appel `/keywords/:kw/propose-lieutenants`.
- Update du type `ProposeLieutenantsRequest` côté shared types.
- **AC** : l'onglet Lieutenants envoie `painPoint` au backend (test contract) ; les lieutenants proposés visibles à l'écran sont alignés douleur.

#### S2-2 — Onglet Lexique : painPoint dans le scoring TF-IDF
- [src/components/moteur/LexiqueExtraction.vue](../../src/components/moteur/LexiqueExtraction.vue) reçoit `articlePainPoint`.
- Service `/serp/tfidf` enrichi : pondère les termes par alignement sémantique avec painPoint (réutilise embeddings).
- Si painPoint absent, fallback comportement actuel (TF-IDF pur).
- **AC** : sur fixture avec painPoint « personnalisation manquante », les termes « standardisé », « personnalisé », « sur-mesure » remontent dans le top 10 ; sans painPoint, ranking inchangé.

#### S2-3 — Onglet Hn / Structure : painPoint dans la génération
- Composant Hn structure transmet painPoint.
- Service `/keywords/:kw/ai-hn-structure` injecte dans le prompt (synchro avec S1-3).
- **AC** : Hn générés visuellement adressent la douleur dans au moins 2 sections sur 5 (revue manuelle).

### Livrables
- 3 composants Vue modifiés
- 3 services backend mis à jour
- Tests contract API + tests browser pour la transmission de prop
- Doc UI [docs/ui-sections-guide.md](../../docs/ui-sections-guide.md) ajout d'une **colonne « painPoint utilisé ? »** sur la table sections/onglets

### Risques
- 🟡 Moyen : touche 3 onglets, risque de régression sur des comportements actuels (TF-IDF pur, propose-lieutenants sans contexte). Mitigation : fallback if `painPoint == null`.

---

## Sprint S3 — Refonte du scoring Pertinence en cumulatif

**Objectif** : remplacer la moyenne 0-100 du `paaPainAlignmentAvg` par un score cumulatif normalisé sur le maximum atteignable, qui exploite la richesse du système de points existant ([intent-scan.service.ts:193-221](../../server/services/intent/intent-scan.service.ts#L193)).

**Pourquoi en parallèle de S1** : zone de code disjointe (logique pure dans `shared/`), pas de blocage.

### Stories

#### S3-1 — Spec produit : choisir la formule cumulative
- Document décisionnel court (1 page) à écrire dans [_bmad-output/implementation-artifacts/](../../_bmad-output/implementation-artifacts/).
- Trancher entre 3 formules candidates :
  - **F1 (proposée)** : `score = (somme points / (nbPAA × maxPointsParPAA)) × 100`
  - **F2** : score absolu plafonné (sigmoid/log) qui récompense les volumes élevés de PAA alignés
  - **F3** : score à deux dimensions (couverture × qualité) exposé séparément
- Choix validé par l'utilisateur avant Implementation.
- **AC** : formule choisie + 3 exemples chiffrés validés.

#### S3-2 — Implémenter `computePaaPainAlignmentCumulative()`
- Nouvelle fonction dans [server/services/intent/intent-scan.service.ts](../../server/services/intent/intent-scan.service.ts) ou shared.
- Remplace l'usage actuel de `paaPainAlignmentAvg` (moyenne) dans `keyword-radar.service.ts`.
- Conserve l'ancienne fonction temporairement (deprecated) pour rétro-compat si autres consommateurs.
- **AC** : tests unitaires sur 6 cas (tous matchs parfaits, mix, tous off, peu de PAA, beaucoup de PAA, 0 PAA).

#### S3-3 — Adapter `computeRelevanceScore` pour consommer le cumulatif
- Le champ `paaPainAlignmentAvg` devient `paaPainAlignmentCumulative` (ou alias) dans [shared/types/scoring.types.ts](../../shared/types/scoring.types.ts).
- Le breakdown `relevanceScore.breakdown.paaPain` reflète la nouvelle valeur.
- Tests existants adaptés.
- **AC** : `computeRelevanceScore` produit toujours 0-100, verdicts inchangés sur fixtures stables.

#### S3-4 — Mettre à jour la doc scoring
- [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md) — remplace section « PAA × Douleur (qualité) » par formule cumulative + exemple.
- [docs/pain-point-editorial-backbone.md](../../docs/pain-point-editorial-backbone.md) — section 3 « Question ouverte » devient « Implémenté ».
- **AC** : exemple « 8 PAA, max 16 pts, obtenus 9.75 → 61 % » documenté.

### Livrables
- 1 spec décisionnelle
- 2-3 fichiers shared/ et server/services/ touchés
- 8-10 tests unitaires nouveaux
- Doc mise à jour

### Risques
- 🟡 Moyen : changement de formule peut décaler les seuils GO/ORANGE/NOGO sur l'historique. Mitigation : monitoring sur 5 fixtures réelles avant/après.

---

## Sprint S4 — Gestion fine des racines

**Objectif** : remplacer la moyenne naïve `rootsAverageScore` par une logique qui distingue les 3 cas évoqués :
- 🟢 racines diverses et fortes → bonus complet
- 🟡 racines presque doublons → pénalité de redondance
- ⚫ aucune racine pertinente → fallback (déjà géré, à conserver)

**Pourquoi après S3** : la formule de pertinence cumulative s'applique aussi aux racines individuellement, donc S3 doit être stable d'abord.

### Stories

#### S4-1 — Spec produit : modèle de gestion des racines
- Document décisionnel : comment quantifier la **diversité sémantique** entre racines et la **redondance** ?
- Pistes à brainstormer :
  - Distance cosine entre embeddings de racines comme proxy de diversité
  - Seuil au-dessus duquel deux racines sont considérées « doublons »
  - Score racines = `moyenne(scores) × facteur_diversité`
  - Ou : score cumulatif (somme scores / max théorique × N racines uniques)
- Validation utilisateur avant implémentation.
- **AC** : formule retenue + 3 exemples chiffrés (cas 1, 2, 3).

#### S4-2 — Implémenter `computeRootsRelevanceScore()`
- Nouvelle fonction qui :
  - Reçoit la liste des racines avec leur `relevanceScore` individuel
  - Calcule la diversité sémantique (cosine matrix)
  - Détecte les doublons et pénalise
  - Retourne un score 0-100 + breakdown détaillé (`{ rootsCount, uniqueRootsCount, diversityFactor, total }`)
- Remplace l'usage de `rootsAverageScore` dans [shared/scoring.ts](../../shared/scoring.ts) → `computeRelevanceScore`.
- **AC** : tests unitaires sur les 3 cas + edge cases (1 racine, 0 racine, 5 racines toutes identiques).

#### S4-3 — Exposer le breakdown racines au front
- Le `RelevanceScoreBreakdown.roots` exposé dans `RadarKeywordCard` Capitaine montre maintenant :
  - Nombre de racines uniques
  - Indicateur de doublon (badge orange si redondance détectée)
  - Score racines détaillé
- Le composant [CaptainRootsSidebar.vue](../../src/components/moteur/CaptainRootsSidebar.vue) signale les doublons.
- **AC** : sur fixture « 4 racines dont 2 doublons », l'UI affiche un badge `2 racines uniques sur 4`.

### Livrables
- 1 spec décisionnelle
- 1 fonction pure `computeRootsRelevanceScore`
- 1 composant UI enrichi
- Tests unitaires + tests composant

### Risques
- 🟠 Fort : la détection de doublons via embeddings cosine introduit un seuil arbitraire. Mitigation : seuil configurable, exposer en dev tools, monitorer sur historique.

---

## Sprint S5 — Intent désirée vs réelle + dépréciation verdict legacy

**Objectif** : clore la séparation KPI/Pertinence en :
1. Détectant le mismatch entre intent attendue (dérivée du painType) et intent réelle (DataForSEO + IA)
2. Supprimant le `verdict` legacy du prompt Capitaine au profit des deux nouveaux scores

**Pourquoi en dernier** : nécessite la stabilité de S3 (cumulative) et S4 (racines) pour ne pas casser le scoring.

### Stories

#### S5-1 — Détection intent désirée vs réelle
- Nouveau champ `intentMismatch` dans `RelevanceScoreResult.breakdown.intentPain` :
  - `desired`: type d'intent attendu (dérivé du `painType`)
  - `actual`: type d'intent réellement détecté sur le keyword
  - `match`: bool
- Dans le UI Capitaine, badge orange si mismatch (mais ne bloque pas — informatif).
- Aide à la décision : quand l'utilisateur voit `relevanceScore` faible, il sait si c'est dû au mismatch d'intent ou à un autre facteur.
- **AC** : sur fixture (douleur informationnelle + keyword commercial), `intentMismatch.match=false` et UI affiche le badge.

#### S5-2 — Refonte `capitaine-ai-panel.md` : retrait du verdict legacy
- Suppression de `{{verdict}}` et `{{verdictReason}}` dans le prompt.
- Remplacement par :
  - `**Score KPI marché** : {{marketScore.total}}/100 ({{marketScore.verdict}})`
  - `**Score Pertinence** : {{relevanceScore.total}}/100 ({{relevanceScore.verdict}})`
  - `**Douleur de l'article** : {{painPoint}}` (déjà ajouté en S1-1)
  - `**Intent mismatch** : {{intentMismatch.actual}} vs {{intentMismatch.desired}}` (si applicable)
- Le prompt n'a plus besoin de la consigne défensive « ne change pas le verdict » — il conseille librement à partir des deux scores.
- **AC** : test contract montre la nouvelle structure de payload ; revue manuelle valide la qualité du conseil sur 3 fixtures.

#### S5-3 — Dépréciation `computeVerdict` legacy
- Marquer `computeVerdict()` ([shared/kpi-scoring.ts:77](../../shared/kpi-scoring.ts#L77)) comme `@deprecated`.
- Identifier tous les consommateurs (grep `computeVerdict`) et migrer vers `marketScore.verdict`.
- Suppression effective dans une story future une fois 0 consommateur.
- **AC** : grep retourne 0 usage en lecture, sauf historique persisté + le code de la fonction elle-même.

### Livrables
- 1 nouveau champ type `intentMismatch`
- 1 prompt refondu
- 1 fonction marquée deprecated avec migration des consommateurs
- Tests contract et unitaires

### Risques
- 🟠 Fort : le prompt Capitaine refondu peut produire des conseils qualitativement différents. Mitigation : A/B comparison sur 5 fixtures avant rollout.

---

## Découpage par parallélisation

```
Semaine 1
├── S1 (prompts) ──────────────►
└── S3 (scoring cumulatif) ────►

Semaine 2
├── S2 (UI) ───────────────────►   (dépend de S1)
└── S4 (racines) ──────────────►   (dépend de S3)

Semaine 3
└── S5 (intent + verdict) ─────►   (dépend de S1 + S4)
```

---

## Critères de succès globaux

À la fin des 5 sprints :

1. **100 % des onglets Moteur** transmettent `painPoint` à leurs endpoints respectifs (table de couverture verte dans [pain-point-editorial-backbone.md](../../docs/pain-point-editorial-backbone.md) section 5).
2. **18 prompts** identifiés en gap injectent désormais `{{painPoint}}` (table verte section 4 du même doc).
3. Le **Score de Pertinence** consomme un `paaPainAlignmentCumulative` qui exploite la richesse des points de matching.
4. Les **racines** sont gérées avec une logique de diversité sémantique (3 cas distingués).
5. Le **verdict legacy** est supprimé des prompts et marqué deprecated en code.
6. Le **mismatch intent** est détecté et affiché à l'utilisateur sans bloquer la progression.
7. Tous les tests unitaires et contract verts ; build Vite vert ; type-check stable.

---

## Notes d'organisation

- Chaque sprint peut générer **1 ou plusieurs PRs** selon la granularité.
- À chaque sprint terminé : créer une mini-rétro `_bmad-output/implementation-artifacts/retro-S{N}-...md`.
- Les specs décisionnelles (S3-1, S4-1) bloquent leur sprint tant que non validées par l'utilisateur — éviter d'implémenter avant alignement.
- Les hors-scope identifiés dans la séparation V1 (renommage `useRadarCarousel`, suppression `combinedScore`, renommage `/radar/scan`, persistance painPoint en DB, quadrant 2D) restent **hors de ces 5 sprints**. Ils feront l'objet de sprints d'hygiène séparés.

---

## Liens

- Tech-spec parent : [tech-spec-score-kpi-pertinence-separation.md](./tech-spec-score-kpi-pertinence-separation.md)
- Doc backbone painPoint : [docs/pain-point-editorial-backbone.md](../../docs/pain-point-editorial-backbone.md)
- Doc scoring : [docs/scoring-kpi-vs-relevance.md](../../docs/scoring-kpi-vs-relevance.md)
- Rétro V1 : [retro-score-kpi-pertinence-separation.md](./retro-score-kpi-pertinence-separation.md)
