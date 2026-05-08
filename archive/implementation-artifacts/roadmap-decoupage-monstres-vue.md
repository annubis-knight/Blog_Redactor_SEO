---
title: 'Roadmap — Découpage des monstres Vue (3 vagues)'
slug: 'roadmap-decoupage-monstres-vue'
created: '2026-05-04'
last_updated: '2026-05-04'
status: 'active'
synced_with:
  - '_bmad-output/implementation-artifacts/tech-spec-decoupage-vague-1-templates.md'
  - '_bmad-output/implementation-artifacts/tech-spec-decoupage-vague-2-factorisation.md'
  - '_bmad-output/implementation-artifacts/tech-spec-decoupage-vague-3-composables.md'
  - '_bmad-output/planning-artifacts/prd.md'
---

# Roadmap — Découpage structurel des composants Vue > 800L

> Document de référence court qui chapeaute les 3 tech-specs de découpage.
> Lire ce fichier en premier ; consulter les tech-specs vague 1/2/3 pour les détails.

## Contexte

Audit 2026-05-04 : **11 fichiers Vue dépassent 800 lignes**, tous sur le chemin
critique utilisateur (Cerveau → Moteur → Rédaction). Une première tentative de
les traiter en une seule tech-spec monolithique a été refondue après revue
adversariale (cf. `_archive/tech-spec-decoupage-monstres-vue-monolithique-superseded-2026-05-04.md`).

La présente roadmap structure le chantier en **3 vagues séparées**, chacune avec
sa technique de découpage propre et ses garde-fous adaptés. Chaque vague est
livrée comme une **tech-spec autonome** + son **PR dédié** + son **branch dédiée**.

## Pourquoi 3 vagues distinctes

Les 11 fichiers ne se découpent pas tous de la même manière. Mélanger les
techniques dans une seule spec masque la diversité des risques.

| Technique | Quand l'appliquer | Vague |
|---|---|---|
| **Extraction template** (sous-composants Vue) | Composant lourd en markup avec sections logiques claires | **Vague 1** |
| **Factorisation CSS-heavy** (composants atomiques + mutualisation styles) | Composant avec patterns markup répétés et beaucoup de CSS scoped | **Vague 2** |
| **Extraction script** (composables TypeScript) | Composant lourd en logique avec sections script commentées | **Vague 3** |

## Les 3 vagues

### Vague 1 — Extractions template pures (5 composants)

**Tech-spec** : `tech-spec-decoupage-vague-1-templates.md`

**Périmètre** :
- `KeywordDiscoveryTab.vue` (1419 → cible <800)
- `CaptainValidation.vue` (1536 → cible documentée selon couplage)
- `BrainPhase.vue` (1066 → cible <800)
- `LexiqueExtraction.vue` (1058 → cible <800)
- `DouleurIntentScanner.vue` (1050 → cible <800)

**Caractéristique** : aucune logique script ne bouge. On extrait du markup en
sous-composants Vue stateless (props in / events out). Le composable existant
reste consommé par le parent. C'est le **vrai** "refactor structurel pur".

**Risque global** : **faible à modéré**. Filet de sécurité S2/S3 actif.

### Vague 2 — Factorisations CSS-heavy (2 composants)

**Tech-spec** : `tech-spec-decoupage-vague-2-factorisation.md`

**Périmètre** :
- `ProposedArticleRow.vue` (977 → cible <800) — 549L de CSS, 3 sliders répétés
- `RadarKeywordCard.vue` (900 → cible <800) — 417L de CSS, score ring + PAA tree

**Caractéristique** : ces deux composants sont saturés de CSS et de patterns markup
répétés. La factorisation produit des **composants atomiques réutilisables** qui
mutualisent du CSS. Tests visuels (snapshots HTML rendu) en complément du
DOM-position parce que le risque ici est **CSS/visuel**, pas structurel.

**Pré-requis** : Vague 1 livrée et stable (RadarKeywordCard est consommé par
CaptainValidation, DouleurIntentScanner, KeywordDiscoveryTab — tous refactorés
en Vague 1 ; on attaque l'enfant après les parents). ProposedArticleRow est
consommé par BrainPhase ; idem.

**Risque global** : **modéré**, à cause du risque visuel CSS.

### Vague 3 — Composables + refactor logique scopé (2 composants)

**Tech-spec** : `tech-spec-decoupage-vague-3-composables.md`

**Périmètre** :
- `MoteurView.vue` (1087 → cible <800) — 679L script, 7 sections commentées
- `LieutenantsSelection.vue` (1025 → cible <800) — 733L script + 1 sous-composant
  template (`LieutenantsResultsLayout`)

**Caractéristique** : c'est un **refactor logique** scopé (déplacement de logique
dans des composables TypeScript). On assume cette nature ; on ne la cache pas
derrière "structurel pur". Cela exige :
- une **grille de tests métier** spécifique (pas seulement DOM-position)
- une investigation préalable plus poussée
- un découpage par responsabilité (un composable = une responsabilité unique
  testable indépendamment)

**Pré-requis** : Vagues 1 et 2 livrées. Les composants enfants sont stabilisés
avant qu'on touche aux orchestrateurs MoteurView (consomme 5 enfants) et
LieutenantsSelection.

**Risque global** : **élevé**. Mitigation par investigation rigoureuse Step 2,
tests composables isolés, et **respect strict** de FR-LIE-AI-FRONTIER (PRD §8.7)
pour LieutenantsSelection.

## Ordre des vagues : pourquoi celui-là

```
Vague 1 (templates)         →  pratique de découpage acquise
        ↓
Vague 2 (factorisation CSS) →  pratique des risques visuels acquise
        ↓
Vague 3 (composables)       →  toutes les briques enfants stabilisées
                                avant d'attaquer les orchestrateurs
```

**Adresse Finding #7 de la revue adversariale** : on refactore les enfants
(RadarKeywordCard, ProposedArticleRow) **avant** leurs parents-orchestrateurs
(MoteurView, LieutenantsSelection). Le sens producteur → consommateur est
respecté.

## Composants du périmètre 800L+ NON inclus dans les 3 vagues

Audit révèle 11 fichiers > 800L. 9 sont traités par les vagues 1+2+3. Les 2
restants :

- **`ArticleWorkflowView.vue`** (970L) — vue router de la rédaction
- **`ArticleEditorView.vue`** (952L) — vue router de l'éditeur TipTap

**Décision** : ces 2 vues sont **reportées en Vague 4** (post-livraison de 1+2+3)
parce que :
1. Elles vivent dans le workflow Rédaction qui est encore en évolution active
   (cf. PRD §FR-RED).
2. Leur découpage demanderait une investigation préalable spécifique
   (toolbar TipTap, workflow steps Rédaction) qui sort du scope des 3 vagues
   actuelles.
3. Les 9 composants des 3 vagues actuelles offrent déjà un gain de
   maintenabilité massif sur le chemin critique Cerveau → Moteur.

**Adresse Finding #20** : "vague 1" n'est plus trompeur ; le découpage en 4
vagues (3 livrables + 1 reportée) est explicite.

## Garde-fous communs aux 3 vagues

Les éléments suivants sont **mutualisés** par les 3 tech-specs :

### Principes de refactor (les 5 principes adoptés en revue)
1. "Important pour l'utilisateur" prime sur "facile à découper".
2. Un test architectural est un GPS, pas un mur.
3. Les FR du PRD sont l'autorité, pas les tests.
4. La rigueur n'est pas la prudence.
5. Le critère de découpage n'est pas une seule technique.

### Discipline d'exécution par vague

Chaque vague suit le même protocole :

1. **Bloc 0 — Safety net Git** : branche dédiée, commit pré-refactor, push.
2. **Bloc 1...N — Composants un par un** : chaque bloc ferme avec 3 niveaux de
   tests verts (architectural / fonctionnel / Manual UX) puis commit
   intermédiaire.
3. **Bloc final — Validation globale** : `check:health`, `test:browser`, AC review.
4. **PR dédié** par vague. Pas de PR umbrella mélangeant les vagues.

### Synchronisation PRD

Toute exigence d'invariant UX qui survit au-delà du chantier (ex:
FR-LIE-AI-FRONTIER) est **ajoutée au PRD** dans le commit de la vague concernée.
Pas dans les tech-specs (qui seront archivées). Adresse Finding #8.

### Arrêt anticipé entre vagues

Si la Vague 1 livre mais qu'une régression UX importante apparaît en navigateur
post-merge, on **n'attaque pas la Vague 2** tant que le post-mortem n'est pas
écrit. Les vagues sont **séquentielles strictes**, pas parallèles.

## Estimation T-shirt size *(adresse Finding #13)*

| Vague | Composants | Fichiers à créer | Fichiers à modifier | Effort estimé |
|---|---|---|---|---|
| Vague 1 | 5 | ~10 sous-composants Vue + 5 tests architecturaux | 5 parents + tests S2 lus (sans modif) | **L (3-5 jours)** |
| Vague 2 | 2 | ~5 sous-composants Vue + 2 tests architecturaux + tests visuels | 2 parents + investigations CSS | **M (1-2 jours)** |
| Vague 3 | 2 | 6 composables TS + 1 sous-composant Vue + 3 tests | 2 parents + tests composables isolés | **L (3-4 jours)** |
| **Total** | **9** | **~22 nouveaux fichiers** | — | **~2 semaines plein temps** |

**Note** : l'estimation suppose un consultant solo (cf. CLAUDE.md), branche
dédiée par vague, pas d'interruption majeure (autres priorités, hotfixes).

## Lien avec le PRD

Les invariants UX préservés par ce chantier sont formalisés dans le PRD :
- `FR-LIE-AI-FRONTIER` (§8.7, ajouté 2026-05-04) — frontière containers
  principaux Lieutenants ↔ panel IA.
- Les autres FR existantes (`FR-CAP-*`, `FR-DIS-*`, etc.) couvrent déjà la
  plupart des comportements à préserver. Les tech-specs des 3 vagues les
  **citent** au lieu de les dupliquer (adresse Finding #8).

## Indicateurs de succès du chantier complet

- [ ] 9 fichiers Vue passent sous 800L (ou cible documentée pour CaptainValidation).
- [ ] 0 nouvelle FR-* n'a été ajoutée au PRD au-delà de `FR-LIE-AI-FRONTIER`
      (signe que le chantier est bien "no-regression UX" et pas un changement
      fonctionnel déguisé).
- [ ] `npm run check:health` reste vert sur main après la Vague 3.
- [ ] Aucun test S2 n'a été modifié (ou exception documentée par PR).
- [ ] La Manual UX Checklist a été cochée intégralement à chaque vague.
- [ ] La taille moyenne des composants Vue de l'app diminue mesurablement
      (avant/après dans le PR de la Vague 3).

## Pourquoi reporter les blocs F et G en Vague 4

**Adresse Finding #6 (abandon de complaisance)** : au lieu de laisser AC10
ouvrir une porte d'abandon en cours de chantier, on assume **dès maintenant**
que ces 2 vues sont reportées. Critère explicite pour Vague 4 :

- L'investigation Vague 4 doit identifier au moins **un bloc markup
  extractible >150L** qui respecte la règle props in / events out sans toucher
  au store.
- Si l'investigation ne trouve rien, le report devient permanent et les vues
  restent au-dessus de 800L avec justification écrite.
- L'investigation peut être faite **séparément** des 3 vagues actuelles, après
  retour d'expérience de leur livraison.
