---
title: 'Spécification — Blog Redactor SEO'
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
synced_with:
  - spec/requirements.md
  - design/README.md
---

# Spécification — Blog Redactor SEO

**Ce que l'outil doit faire, et comment il se comporte aujourd'hui**, en langage utilisateur. Aucun
nom de fichier, de route, de table ni de composant ici : ils sont dans le [design](../design/README.md).

**Règles de lecture**
- Le code fait foi. Ces chapitres décrivent le comportement réel au commit `60b9818`.
- [`requirements.md`](requirements.md) liste **toutes** les exigences avec leur statut : active, non tenue
  (le code ne la tient pas, et il dit ce qui manque), prévue, retirée. Les chapitres ne décrivent que ce
  qui existe ; une limite connue y est dite comme telle.
- Chaque section d'un chapitre cite ses exigences (*Exigences : FR-…*). Chercher un identifiant retombe
  sur l'exigence, sa description, sa conception, ses tests et ses commits.
- Les libellés entre « guillemets » sont ceux de l'écran.

## Les exigences

[`requirements.md`](requirements.md) — la liste de référence, par domaine, et les exigences retirées.
C'est aussi la liste de travail : les exigences « non tenues » sont les défauts connus à solder.

## Les chapitres

| Chapitre | Contenu |
|---|---|
| [01 — Le produit](01-produit.md) | Pour qui, quel problème, les écrans, le parcours de bout en bout, mode simulé et mode réel, hors périmètre |
| [02 — Glossaire](02-glossaire.md) | Cocon, pilier, capitaine, lieutenant, porte, dérogation, carte indicative… |
| [03 — Dashboard](03-dashboard.md) | Accueil, silos, cocons, page du cocon |
| [04 — Cerveau](04-cerveau.md) | Stratégie du cocon, construction progressive, carte indicative, la douleur éditoriale |
| [05 — Moteur](05-moteur.md) | Cadre commun des sept onglets : phases, étapes, verrous, navigation |
| [06 — Discovery](06-discovery.md) | Trouver des mots-clés à partir d'une racine |
| [07 — Radar](07-radar.md) | Scanner et classer les mots-clés |
| [08 — Capitaine](08-capitaine.md) | Choisir et verrouiller le mot-clé principal ; Score Marché et Score Pertinence |
| [09 — Lieutenants](09-lieutenants.md) | Les mots-clés secondaires |
| [10 — Structure](10-structure.md) | Le plan H1 / H2 / H3 |
| [11 — Lexique](11-lexique.md) | Les termes métier |
| [12 — Finalisation](12-finalisation.md) | Le récapitulatif avant la Rédaction |
| [13 — Rédaction](13-redaction.md) | Brief, premier jet, enrichissement, actions, méta, maillage, scores, publication, export |
| [14 — Intégrations externes](14-integrations.md) | Les services appelés, leur coût, le bouton MOCK / RÉEL |
| [15 — Interface partagée](15-interface.md) | Les panneaux et composants communs |
| [16 — Règles transverses](16-infrastructure.md) | Portes et dérogations, étapes, règles par type d'article, contexte donné à l'IA, erreurs |
| [17 — Qualités transverses](17-qualites.md) | Performance, coût, sécurité, fiabilité, configuration |
| [18 — Recette manuelle](18-recette-manuelle.md) | Le parcours à dérouler à la main avant de fusionner un chantier |
