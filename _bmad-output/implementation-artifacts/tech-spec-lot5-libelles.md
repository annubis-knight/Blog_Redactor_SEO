---
name: tech-spec-lot5-libelles
title: Recette du 2026-09-30, lot 5 — textes d'écran (accents, compteurs, raison Discovery) et coût compté deux fois
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md (NFR-UX-SCREEN-TEXT, FR-UI-VOCABULAIRE-VERROUILLER, FR-INFRA-COST-LOG-STORE)
  - spec/recette/ (01 à 09 : libellés cités), spec/parcours/ (PU-01, PU-03, PU-04, PU-07, PU-08)
  - spec/04-cerveau.md, spec/06-discovery.md, spec/07-radar.md, spec/09-lieutenants.md, spec/11-lexique.md, spec/13-redaction.md, spec/15-interface.md, spec/16-infrastructure.md, spec/17-qualites.md, spec/18-recette-manuelle.md
  - design/07-tests-et-outillage.md, design/08-ecrans.md, design/13-discovery.md, design/14-radar-capitaine.md, design/20-infrastructure.md, design/21-qualites.md
  - _bmad-output/implementation-artifacts/recette-2026-09-30/
---

# Tech-spec — Lot 5 : les textes d'écran de la recette du 2026-09-30

La recette complète du 2026-09-30 a relevé des dizaines de textes fixes écrits sans leurs accents (« Resultats SERP », « Suggerer par IA », « Rafraichir », « Lieutenants proposes par l'IA »…), des compteurs qui ne s'accordent pas (« 1 articles »), une raison anglaise et technique sur les cartes venues de Discovery (« Discovered via suggest-alphabet »). Le lot 2 a en outre signalé deux appels IA comptés deux fois dans la pile « Coûts API ».

Principe retenu avec Arnaud : **un valideur léger**, pas un correcteur de grammaire. Il ne juge que le texte de l'interface, écrit par nous ; le texte des articles, écrit par l'IA, est jugé par la porte de publication.

Valideurs : tous dans `npm run verify` (`tests/unit/architecture/`, `tests/unit/shared/`, `tests/unit/composables/`).

## 1. Textes sans accents

- **Constat.** 68 textes fixes sans accents dans 19 composants, dont une vingtaine que le dictionnaire ne peut pas juger (« Lacunes a combler », « calcules a partir », « onglet precedent », « Sommaire valide et sauvegarde. », badge « ajuste »).
- **Décision.** Valideur `tests/unit/architecture/screen-text-accents.test.ts` : il lit le texte affiché (texte des balises, y compris sur plusieurs lignes ; attributs de libellé ; chaînes des interpolations et du code, hors journaux et commentaires) et refuse les formes de `NEVER_WITHOUT_ACCENT`, qui n'existent jamais sans accent en français. Pas de mot anglais courant du code dans la liste : aucune fausse alerte. Une chaîne d'un seul mot en minuscules est une valeur du code (`isCodeValue` : `'intermediaire'`, `'/theme/:themeId'`) ; les types de mot-clé `'Moyenne traine'` / `'Longue traine'`, enregistrés en base, sont écartés (`DATA_VALUES`). Les mots justes ou faux selon le sens (« a » / « à ») ont été relus à la main.
- **Correctifs.** Les 68 libellés, plus « ajusté », « Sauvegardé », « Présent chez », « proposé », « basés », « analysé », « apparaît », « Détecté », « éditorial », « reçus ».
- **Tests.** Le valideur et ses sentinelles (élision « l'IA », texte sur deux lignes, flèche `=>` d'un attribut, valeurs du code, chemins d'API). Tests de composants alignés (`RadarLongTailSuggestions`, `lexique-extraction`…).

## 2. Compteurs au pluriel figé

- **Constat.** « 1 articles », « 0 mots-clés », « 1 termes » : 36 compteurs écrivaient le nom au pluriel quel que soit le nombre.
- **Décision.** `src/utils/plural.ts` `plural(n, singulier, pluriel?)` rend le nom seul (singulier pour 0 et 1, pluriel à partir de 2) ; l'appelant garde le format du nombre. Valideur `tests/unit/architecture/screen-text-counters.test.ts` : un nombre suivi d'un nom compté au pluriel (`{{ n }} articles`, `` `${n} termes` ``) est refusé, sauf branche `n === 1 ? … : …` juste au-dessus.

## 3. Raison « Discovered via … »

- **Décision.** `DISCOVERY_SOURCE_LABELS` (`shared/types/discovery-tab.types.ts`) : un libellé par source, lu par les titres de section de `DiscoveryPanel.vue` et par `toRadarKeywords` (« Trouvé par Discovery : Alphabet (A-Z). »). Test : `tests/unit/shared/discovery-to-radar-reasoning.test.ts`.
- Le troisième point du statut (identifiant « lieutenants-too-few » à la publication) était déjà réglé par le lot 3 : le message de reconfirmation reprend le texte du point (`shared/verifiers/publish.ts` `reconfirmMessage`).

## 4. Coût compté deux fois

- **Constat.** `apiPost` inscrit le champ `usage` de toute réponse ; `useResonanceScore.generate` (Radar), `editor.store.generateMeta` et `ContentGapPanel.vue` ajoutaient une seconde ligne (depuis `_apiUsage` ou `usage`).
- **Décision.** Les trois ajouts manuels sont retirés ; le libellé tiré de l'adresse (`labelFromUrl`) est le même. Test : `tests/unit/composables/cost-log-once-radar-meta-gap.test.ts` (vrai `apiPost`, vrai store, `fetch` simulé), rouge avant le correctif.

## 5. Exigences

- `NFR-UX-SCREEN-TEXT` : critères ajoutés (accents, compteurs, raison Discovery, vérification rapide) ; statut **active**.
- `FR-UI-VOCABULAIRE-VERROUILLER` : critère ajouté (cadenas de la structure) ; statut **active** ; test `lieutenant-h2-structure.test.ts`.
- `FR-INFRA-COST-LOG-STORE` : le critère « un appel n'est jamais compté deux fois » était écrit ; le statut reste non tenu pour ses autres raisons (opérations en base, coût des longues traînes et du jugement PAA).

## 6. Hors périmètre

- Les prompts de `server/prompts/` (texte envoyé à l'IA, pas affiché) et les journaux historiques (`recette-2026-09-30/`, `recette-manuelle-journal.md`) gardent leurs citations d'origine.
- Les titres de section « Intent Modifiers » et « Prepositions » de Discovery restent tels quels : termes cités par la spec et la recette, à trancher à part.
