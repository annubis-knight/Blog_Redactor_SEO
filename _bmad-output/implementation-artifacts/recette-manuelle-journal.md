---
title: Journal de recette manuelle
last_updated: 2026-09-30
synced_with:
  - spec/18-recette-manuelle.md
  - spec/recette/
  - spec/parcours/
  - _bmad-output/implementation-artifacts/recette-2026-09-30/
  - _bmad-output/implementation-artifacts/tech-spec-cerveau-generer-au-choix.md
---

# Journal de recette manuelle — 2026-09-25

- **Mode :** MOCK
- **Branche :** `feat/cerveau-generer-au-choix`. La recette a porté sur l'arbre de travail, avant tout commit
  de la révision : les références de code d'un constat décrivent l'état **au moment du constat** (commit
  `0f16e87`), sauf mention contraire. Le correctif de R1 est le commit `60b9818`.
- **Règle :** on note, on ne corrige pas. Les correctifs se font ensemble à la fin.

**Taille du correctif :** XS (< 15 min) · S (< 1 h) · M (demi-journée) · L (plus).

## Constats

<!-- Un bloc par constat, numérotés R1, R2… -->

### R1 — « Le pilier, puis un article à la fois » ouvre le panneau des candidats

- **Étape :** 1.6
- **Vu :** dans « Générer avec Claude ▾ », le choix « Le pilier, puis un article à la fois » déclenche « Créer le pilier » et ouvre le panneau des candidats (`cocoon-candidates-panel`).
- **Attendu par Arnaud :** une génération du même type que « La carte complète du cocon », qui remplit l'arbre avec **le pilier seul**.
- **Verdict :** comportement prévu, donc **demande d'évolution** (pas un bug).
- **Cause :** choix de conception U7, fait aujourd'hui : « un seul chemin de création, deux portes d'entrée ».
  - `CocoonTreeBuilder.vue:89-93` (au commit `0f16e87` ; `startPillar()` a été retiré par le correctif) : `startPillar()` appelle `proposePillar()`, c'est-à-dire le même panneau que le bouton du haut.
  - `tech-spec-cerveau-generer-au-choix.md` § Solution, point 3.
  - Ce qui s'en rapproche le plus : la carte complète (`generation.ts:53-72`) fait d'abord un appel `articles-structure` qui renvoie **Pilier + Intermédiaires ensemble**. Aucun appel ne renvoie le pilier seul.
- **Décision d'Arnaud :**
  - le pilier va dans la **carte indicative** : c'est un aperçu, aucun article réel n'est créé ;
  - le mot-clé suit **les mêmes règles que la carte complète**. Claude invente le titre, le `suggestedKeyword` et le slug à partir de la stratégie et des pistes cochées (`server/prompts/cocoon-articles.md`, § Mission structure). Le mot-clé n'est pas mesuré.
- **Règle voulue** (précisée par Arnaud) : le menu fait grandir la carte **un article à la fois**, et un article ne s'ajoute que si son parent existe dans la carte. Les libellés ci-dessous sont ceux de la discussion ; les libellés livrés sont « Le pilier », « 1 article intermédiaire », « 1 article spécialisé » (cf. correctif).
  1. Carte sans pilier : le choix du pilier est actif.
  2. Pilier présent : ce choix est **grisé**, et le choix « 1 article intermédiaire » apparaît.
  3. *(Supposé pendant la recette, puis retenu et livré ; à revérifier à l'écran)* Au moins un intermédiaire présent : le choix « 1 article spécialisé » apparaît. Chaque clic ajoute un article.
- **Correctif retenu :** réutiliser `addSmartArticle(type)` (`useArticleProposals.ts:109-154`). Il existe déjà derrière « + Ajouter … › Article complémentaire » :
  - Claude ajoute **un** article du niveau demandé, en connaissant ceux qui sont déjà dans la carte (étape `add-article`, `cocoon-add-article.md`) ;
  - le parent se rattache tout seul : l'intermédiaire au pilier (`cocoon-add-article.md:67` après correctif), le spécialisé à l'intermédiaire qui a le moins de spécialisés, ou dont un angle reste non couvert (`:76-77` après correctif) ;
  - il a une réponse simulée pour le mode MOCK (`mock-fixtures/strategy.ts:172` au moment du constat).
  Aucun nouveau prompt n'est à écrire. Deux compléments se sont révélés nécessaires en corrigeant (cf. « Corrigé le 2026-09-25 ») : la règle Pilier du prompt, et la réponse simulée, qui renvoyait toujours un spécialisé.
- **À modifier :**
  - `GenerateCocoonMenu.vue` : choix progressifs, calculés d'après le contenu de la carte (`proposedArticles`) et non plus d'après l'arbre réel. L'explication « Crée de vrais articles… » disparaît ;
  - `BrainArticleProposalView.vue` et `BrainPhase.vue` : relier les choix à `addSmartArticle`, et retirer le lien avec `CocoonTreeBuilder.startPillar()`. Ce `defineExpose` devient inutile ;
  - les tests : menu, BrainPhase, CocoonTreeBuilder, parcours `cerveau` ;
  - la recette (étape 1, geste 6 et « Tu dois voir »), la tech-spec U7, puis la PRD et le design registry (`FR/DESIGN-CER-COCOON-PROGRESSIVE`).
- **Taille :** M (le code est S, le reste vient des tests et de la doc).
- **Corrigé le 2026-09-25**, à la demande d'Arnaud, sur `feat/cerveau-generer-au-choix` (tech-spec U7, révision 1.1, commit `60b9818`) :
  - libellés retenus : « Le pilier », « 1 article intermédiaire », « 1 article spécialisé ». Le verbe « Créer » est évité, pour ne pas confondre ces choix avec « Créer le pilier » du constructeur ;
  - la réponse simulée d'un ajout d'article suit désormais le niveau demandé. Avant, c'était toujours un spécialisé : en MOCK, « Le pilier » n'aurait rien donné ;
  - le prompt `cocoon-add-article.md` demande le pilier **fondateur** quand la carte n'en a pas, et non plus un pilier « complémentaire ».
- **À savoir en recette :**
  - la carte et l'arbre sont deux listes. Si le vrai pilier (« Créer le pilier ») a un autre titre que celui de la carte, la carte en montre deux (`registerInStrategy`, `useCocoonBuilder.ts:205` et suiv.). C'était déjà le cas avec la carte complète ;
  - si Claude échoue pendant un ajout, une ligne vide apparaît sur la carte, sans message. C'est l'ancien repli de `addSmartArticle` (`useArticleProposals.ts:146-150`), déjà là avant.

## Récapitulatif

| # | Étape | Verdict | Taille | Statut |
|---|---|---|---|---|
| R1 | 1.6 | Évolution (prévu par U7) | M | Corrigé (`60b9818`), à revérifier à l'écran |

---

## Tri des écarts — 2026-09-29

Les ~90 écarts relevés en écrivant la recette exhaustive (2026-09-28) ont été revérifiés dans le code : cinq agents, un par domaine, environ 120 lignes une fois découpés. Arnaud a délégué les décisions faciles (« je pense que tu connais assez bien le projet pour pouvoir juger »).

| Résultat | Nombre | Où c'est écrit |
|---|---|---|
| Le code a tort : exigence passée « non tenue » | 41 | `spec/requirements.md` (statut, avec ce qui manque) |
| Le code a tort : complément à une exigence déjà « non tenue » | 33 | idem |
| La doc avait tort : phrase corrigée | 25 | `spec/`, `design/` |
| Faux écarts, ou déjà écrits | 6 | écartés |
| Décisions produit prises par Claude | 13 | ci-dessous |
| Choix laissés à Arnaud | 3 | ci-dessous |

La recette suit : 109 vérifications portent désormais « ⚠ » et leur « Défaut connu » (garde-fou `NFR-TEST-RECETTE-COVERAGE`). **La liste de travail des défauts, ce sont les exigences « non tenue » de `spec/requirements.md`.** Rien n'est corrigé dans le code.

### Décisions prises (réversibles)

1. **Discovery et Radar ne se ferment plus.** L'ancien verrou (« mot-clé plus au stade suggéré ») ne pouvait se déclencher depuis aucun écran. `FR-MOT-FREE-NAV` est réécrite ; le code du verrou est à retirer.
2. **Pas d'annonce de coût généralisée.** Seule l'analyse SERP du Lexique annonce « ~$0.003 » ; pour le reste, la pile « Coûts API » fait foi (`spec/05-moteur.md`).
3. **L'avis IA du Capitaine se demande au clic**, pas d'office : c'est ce que veut déjà `FR-MOT-NO-AUTO-ACTION`.
4. **Le jugement IA des questions PAA est à suspendre** tant que son résultat n'atteint pas l'écran : il est payé sans rien montrer (`FR-CAP-PAA-JUDGE-HAIKU`).
5. **« Tout relancer (SERP + IA) » devient « Recharger l'analyse ».** Il ne relance rien sous 7 jours, et le reste gratuit (`FR-LIE-SERP-ANALYZE`).
6. **Au Lexique, « Lancer l'analyse SERP » se grise tant que le Capitaine n'est pas verrouillé**, comme l'extraction (`FR-MOT-SOFT-GATING`).
7. **Le tri « A-Z » range de A à Z au premier clic** (`FR-LEX-SORT` ; la barre de tri est commune au Radar, au Capitaine, aux Lieutenants et au Lexique).
8. **Un article passe « brouillon » quand son premier jet est accepté.** Sans cela, l'avancement du Dashboard ne compte que les publiés (`FR-DASH-NAV`).
9. **Dans le fil d'Ariane, le silo devient un lien**, comme sur l'accueil (`FR-DASH-NAV`).
10. **Un texte sans accent est un défaut** (`NFR-UX-SCREEN-TEXT`).
11. **L'alerte « Données KPI indisponibles » et l'audit du cocon sont retirés** : aucun écran ne les montre (code mort). Critère retiré de `FR-INFRA-KPI-SCORING-NULLSAFE` et de `FR-INFRA-API-CACHE`.
12. **Cocher un mot-clé dans Discovery garde sa pré-analyse Capitaine**, payante en réel : c'est documenté et annulable (`FR-DIS-CAPTAIN-PRESCAN`).
13. **La confirmation « Cela consommera un appel Claude » doit suivre le mode et le fournisseur** (`FR-CAP-AI-PANEL`).

### Les 3 choix qui reviennent à Arnaud

- **Capitaine : une racine étudiée devient-elle un candidat de l'article ?**
  - Aujourd'hui, elle le devient seulement à la réouverture, et cela casse la liste (`FR-CAP-LOCK-INTEGRITY`, `FR-CAP-LIST-SIDEPANEL`).
  - A (recommandé) : non, elle reste sous sa carte, et la liste reste stable (M).
  - B : oui, dès l'étude, soit jusqu'à 5 cartes de plus par mot-clé long (S).
- **Discovery : « Courte-traîne IA » fait exactement le même appel que « IA Claude ».**
  - A : lui donner sa propre demande (M).
  - B (recommandé, sauf si tu t'en sers) : retirer la section (S).
- **« Articles publiés », au Moteur et à la Rédaction : la phase ou le statut ?**
  - A (recommandé) : la phase partout, libellé « Articles rédigés ou publiés ».
  - B : le statut « publié » partout ; le Moteur ne montre plus comme verrouillés les articles rédigés et pas encore publiés.
  - Voir `FR-MOT-RECAP-PUBLISHED`.

### Ordre de correction recommandé

Taille : XS < 15 min, S < 1 h, M ≈ demi-journée, L = plus.

1. **Données fausses ou perdues sans que l'utilisateur le voie :**
   - l'état de l'article ouvert juste avant est recopié dans le nouvel article : texte, méta, sommaire, score (`FR-RED-EDITOR-TIPTAP`, `FR-RED-OUTLINE`, `FR-RED-SEO-SCORE-PERSIST`) — S, un seul correctif ;
   - la saisie du Cerveau est effacée au « Suivant » (`FR-CER-SAISIE-PRESERVEE`) — S ;
   - deux cocons de noms proches partagent une stratégie (`FR-DASH-COCOON-CREATE`) — S ;
   - après un redémarrage du serveur, le bouton affiche « MOCK » alors que le serveur est revenu à sa configuration, qui peut être payante (`NFR-COST-AI-MOCK`) — S ;
   - une dérogation peut couvrir des données jamais vues (`FR-INFRA-GATE-WAIVER`) — S ;
   - le fichier exporté peut être périmé (`FR-RED-EXPORT-HTML`) — XS ;
   - en réel, des chiffres factices du bac à sable sont servis comme vrais (`FR-EXT-DATAFORSEO-SANDBOX`) — L.
2. **Dépenses payées en double :**
   - le Radar et le Capitaine rachètent des mesures déjà en base (`FR-INFRA-KEYWORD-METRICS`, `NFR-COST-CACHE-FIRST`, `FR-MOT-CACHE-CASCADE`, `FR-CAP-SCAN`) — M ;
   - l'avis IA du Capitaine est redemandé à chaque ouverture (`FR-MOT-NO-AUTO-ACTION`) — S ;
   - le jugement des questions PAA est à suspendre (décision 4) — XS ;
   - au Lexique, une analyse payante part sans Capitaine verrouillé, ou deux fois sur un double clic (`FR-MOT-SOFT-GATING`, `FR-LEX-PRECHECK-SERP`) — S.
3. **Une recette MOCK fiable :** les réponses simulées sont hors format (`NFR-COST-AI-MOCK`, `FR-RAD-LONGTAIL-GENERATE`, `FR-RED-REDUCE-SECTION`, `FR-CER-MICRO-CONTEXT`), et le test navigateur `interactions-radar` cherche `.longtail-error`, qui n'existe pas — M en tout. — corrigé sur `fix/reponses-simulees` :
   - avis IA du Capitaine : trois parties (potentiel éditorial, opportunités et risques, recommandation) tirées du mot-clé, du niveau, de la douleur et des scores, sans chiffre figé ;
   - avis IA du Lexique : une décision `aiRecommended` et une raison par terme reçu, `missingTerms`, résumé ;
   - proposition de Lieutenants : `sources`, `suggestedHnLevel`, `contentGapInsights`, candidats tirés des PAA et groupes de la consigne, en nombre fixé par le type (plus de liste `eliminated`) ;
   - longues traînes du Radar : les mots-clés sont lus dans la consigne, la liste n'est plus vide ;
   - micro-contexte : consignes en texte, l'enregistrement les accepte ;
   - réduction d'article : la consigne est reconnue, la section garde ses titres, listes et liens ;
   - Cerveau : « Remplir les champs avec Claude » (configuration conforme au schéma, tirée de la description), « Sujets suggérés » (tableau de textes), suggestions, sous-questions, fusions, enrichissement, consolidation et « Régénérer › Titre / Mot-clé / Slug » ont chacun leur réponse, reconnue à sa consigne même quand le texte saisi cite « radar » ou « lexique » ;
   - test navigateur `interactions-radar` : sélecteurs `.lt-error` / `.lt-empty`, cite `FR-RAD-LONGTAIL-GENERATE`.
   Gardé par `tests/unit/services/mock-*.test.ts` dans `npm run verify`. Reste de `NFR-COST-AI-MOCK` : le bouton « MOCK » après un redémarrage du serveur (point 1).
4. **Erreurs muettes ou en anglais :**
   - le Cerveau est muet, et le bouton « + » de l'étape CTA échoue (`NFR-OBS-KNOWN-ERRORS`, `FR-CER-STEPS-COCOON`) ;
   - `ErrorMessage` n'est pas importé en Rédaction (`FR-RED-DRAFT-SINGLE-PASS`, `FR-RED-HUMANIZE-SECTION`) ;
   - « SERP analysis failed » (`FR-LIE-SERP-ECHEC-EXPLIQUE`) ;
   - la chaîne de secours de l'IA (`FR-EXT-AI-FALLBACK`) ;
   - Search Console (`FR-EXT-GSC-OAUTH`) ;
   - la consigne de réécriture trop longue (`FR-RED-SECTION-REWRITE`).

   M en tout.
5. **La liste du Capitaine qui se défait** (`FR-CAP-INPUT`, `FR-CAP-ROOTS`, `FR-CAP-LIST-SIDEPANEL`, `FR-CAP-LOCK-INTEGRITY`) — M, après le premier choix d'Arnaud.
6. **Textes et finitions :**
   - les accents, l'anglais et les codes techniques affichés (`NFR-UX-SCREEN-TEXT`, `FR-API-VOCABULAIRE-SCAN`, `FR-UI-VOCABULAIRE-VERROUILLER`) ;
   - les décisions 5 à 9 et 13 ;
   - des défauts XS isolés : jauges à 0, info-bulle 50/100, badge sans couleur, compteurs…

   M en tout.
7. **Code mort à retirer :** le verrou Discovery/Radar, l'audit du cocon et son alerte, le bouton « Envoyer aux Lieutenants » jamais affiché — S.

**Hors exigence :** le vert du top 10 de Search Console ne s'affiche jamais, parce que la classe orange passe par-dessus. Correctif XS, aucune exigence en jeu.

## Décisions d'Arnaud — 2026-09-29 (suite)

Les 3 choix laissés à Arnaud, qu'il m'a ensuite délégués (« simple, efficace, facile à appliquer »), et ses réponses aux questions nées des parcours utilisateur (`spec/parcours/`) :

| Sujet | Décision | Où c'est écrit |
|---|---|---|
| Mots-clés plus courts au Capitaine | Ils restent rangés sous la carte du mot-clé long, avec leurs chiffres, aussi à la réouverture ; ils ne deviennent jamais candidats d'office ; un bouton « Prendre celui-ci » en fait un candidat en un clic | à écrire avec le correctif (`FR-CAP-ROOTS`, `FR-CAP-LOCK-INTEGRITY`) |
| « Courte-traîne IA » (Discovery) | Même demande que « IA Claude » : la section en double est à retirer | à écrire avec le correctif (`FR-DIS-LONGTAIL-GENERATION`) |
| États d'un article | Un seul cycle, vu pareil partout : Suggéré → Validé → Rédigé → Publié. La base en a deux aujourd'hui (statut et phase) ; elle reste la seule source (pas de fichier par article) | à écrire avec le correctif (`FR-MOT-RECAP-PUBLISHED`, `FR-RED-PROGRESS`, `FR-DASH-NAV`) |
| Étude du mot-clé à l'ouverture du Capitaine | Au clic, jamais d'office | `FR-MOT-NO-AUTO-ACTION` (non tenue), recette CAP-1 réécrite |
| Analyse « IA Brief » | Gardée avec l'article, réaffichée sans repayer | `FR-RED-BRIEF` (critère changé, non tenue) |
| Chiffres et exemples réels | « Tout doit être prouvé » : lien vers la source trouvée par une vraie recherche, sinon « [à sourcer : …] » | nouvelle `FR-RED-REAL-CLAIMS-PROVEN` (non tenue : « Statistique sourcée », « Exemple PME »), recette RED-R6 |
| Identité PropulSite | L'outil sert seulement le blog de PropulSite : l'identité écrite dans les consignes de l'IA est voulue | `spec/01-produit.md` corrigé |
| Rappel « parent à réexporter » | Non. Arnaud veut plutôt que la vérification du cocon comprenne le maillage entre articles et montre les manques ; il envisage d'écrire aussi les articles en markdown avec un en-tête (frontmatter) pour faciliter les liens | **à brainstormer** (voir ci-dessous) |
| Règles du mode automatique | Plus tard | à faire : aucune exigence ne décrit le robot (pauses, options, arrêts) |

### À brainstormer : le maillage vérifié à l'échelle du cocon

Idée d'Arnaud : une vérification du cocon qui lit les liens entre ses articles (qui renvoie vers qui, quelle section n'a pas son lien, quel enfant n'est pas cité par son parent), et des articles aussi écrits en markdown avec un en-tête, en plus ou à côté du HTML. Points à trancher ensemble :
- ce que la vérification actuelle du contenu fait déjà (liens internes du contenu enregistré, pages exportées, fantômes) et ce qui manque ;
- markdown en plus du HTML, ou à sa place ; qui fait foi entre le fichier et la base (règle du projet : la base de données seule) ;
- ce que l'en-tête contiendrait (parent, section, enfants, mot-clé, état) et comment il resterait synchronisé.

---

## Recette complète du 2026-09-30 — jouée par Claude dans un navigateur (Playwright), en MOCK

À la demande d'Arnaud (« fais passer l'ensemble des recettes manuelles et user journeys à ma place »), toute la recette a été jouée à l'écran, geste par geste : le parcours express, les 9 modules de `spec/recette/`, et les tronçons des parcours `spec/parcours/` qu'aucune recette ne couvre. **Règle inchangée : on note, on ne corrige pas.**

- **Comment :**
  - le parcours express a été fait par Claude ;
  - les modules 01 à 07 et 09 ont été faits en parallèle par 8 agents. Chacun avait son navigateur et ses propres articles, pour ne pas fausser les autres ;
  - Claude a ensuite joué seul les gestes qui touchent tout le serveur : bascule MOCK/RÉEL, coupure d'internet, gestes destructifs sur le pilier, robot.
  - La coupure d'internet a été simulée **pour le serveur seul** : un proxy injoignable bloque ses appels sortants, sans couper la machine.
- **Détail de chaque vérification** (constat, preuve, cause probable, taille) : [`recette-2026-09-30/`](recette-2026-09-30/), un fichier par module. On y trouve aussi `00-express.md`, `99-phase-finale.md` (module 08, gestes réservés, parcours sans recette) et `donnees-et-nettoyage.md`.
- **Argent :** aucune dépense. Le serveur a été relancé avec `DATAFORSEO_SANDBOX=true` en variable d'environnement, parce que le badge « MOCK » ne suffisait pas (constat F1 ci-dessous). Les vérifications « RÉEL (payant) » n'ont pas été faites.

**Taille du correctif :** XS (< 15 min) · S (< 1 h) · M (demi-journée) · L (plus).

### Bilan chiffré

| Partie | ✅ | ❌ | ⚠ seul | ⏭ payant | ⏭ impossible |
|---|---|---|---|---|---|
| Parcours express (10 étapes) | 8 | 2 partiels | | | |
| 01 Dashboard et interface | 17 | 2 | | 2 | 1 (UI-11 : réécrit le pilier) |
| 02 Cerveau | 25 | 2 | 1 | 5 | |
| 03 Moteur, cadre commun | 12 | 4 | 1 | 2 | 1 (MOT-9) |
| 04 Discovery et Radar | 21 | 4 | | 5 | |
| 05 Capitaine | 16 | 4 | 1 | 4 | 1 (CAP-21 : aucun article sans douleur) |
| 06 Lieutenants, Structure, Lexique, Finalisation | 27 | 3 | 1 | 6 | |
| 07 Rédaction | 21 | 6 | | 6 | |
| 08 Intégrations | 7 | | | 4 | 2 (Search Console non réglée sur ce poste) |
| 09 Règles transverses | 15 | 5 | | 4 | |
| **Modules (238 vérifications)** | **161** | **30** | **4** | **38** | **5** |

Beaucoup de ✅ confirment aussi un défaut connu (⚠) : le détail est dans chaque fichier.

### Les constats les plus graves (à traiter en premier)

1. **F1 — Le badge dit « MOCK » alors que DataForSEO part en production payante, sans aucun redémarrage.** Il suffit d'un navigateur neuf avec la configuration actuelle du poste (`AI_PROVIDER=mock`, `DATAFORSEO_SANDBOX` commenté).
   - État constaté au démarrage de la recette : `override: null`, `effective: "mock"`, mais `isSandbox()` = faux.
   - Cause : `getEffectiveMode()` (`runtime-mode.service.ts`) dit « mock » dès que l'IA est simulée, alors que `isSandbox()` (`dataforseo/_client.ts`) décide seul.
   - INFRA-2 le confirme : après un `npm run dev`, le serveur tourne ~15 s en production avant que la page ne le remette en MOCK.
   - Exigences : FR-INFRA-RUNTIME-MODE, NFR-COST-AI-MOCK. Le défaut écrit ne couvre que le redémarrage. **S.**
2. **F4 — Choisir, ou rechoisir, un article au Moteur efface son étape « Structure validée »** (`moteur:hn_locked`), sans message. C'est arrivé au pilier publié. Reproduit sur trois articles (03, 06, orchestrateur).
   - Cause probable : `MoteurView.vue` `handleSelectArticle` vide les mots-clés avant de les recharger. Pendant ce trou, la réconciliation de `LieutenantsPanel.vue` retire l'étape Lieutenants, et le serveur (`checksRemovedWith`) retire la Structure avec elle. Les Lieutenants sont ensuite rendus, la Structure jamais.
   - Ça dépend du moment : ça ne se produit pas juste après un chargement complet de la page. **S–M.**
3. **L'avis de l'IA du Capitaine n'est jamais enregistré, et il est redemandé à chaque sélection d'article**, pour chaque candidat, racines comprises (jusqu'à 19 appels). En RÉEL, ces appels sont payés à chaque clic.
   - `captain_explorations.ai_panel_markdown` est vide sur toute la base, et `saveCaptainExplorationAiPanel` n'est jamais appelé.
   - Vérifications concernées : MOT-4, 01-T2, 05, 06-T2. **S.**
4. **Le score SEO d'un article est écrit sur l'article précédent.** Rédaction du pilier, puis celle d'un enfant sans F5 → `PUT /articles/1335 {"seoScore":68}`, envoyé depuis la page de l'enfant.
   - Trouvé par 01, reproduit par 07. Cause : `editor.store.ts` (`lastSaved` / `recordScore`).
   - Même famille que RED-3 : sans F5, l'enfant affiche le sommaire, la méta et le texte du pilier. **S.**
5. **Robot `auto:article` (PU-06)** :
   - **le « Cocon cible » répondu est ignoré** : l'article #1353 a été créé comme pilier dans le **vrai** cocon « Visibilité web locale à Toulouse ». Sa stratégie de cocon n'a pas été touchée (vérifié contre la sauvegarde) ;
   - en MOCK, le robot ne passe **jamais** la porte du capitaine : le bac à sable renvoie toujours l'intention « navigation » (🟠), et le robot s'arrête.
   - Cause du premier point : `phases/cerveau.ts` n'envoie la réponse qu'au brief ; seul `--cocoon` impose l'emplacement. **XS.**
6. **La porte de publication fait tout recommencer** :
   - les 3 dérogations du premier jet sont redemandées sous une autre règle (`draft-repeated-paragraph` / `repeated-paragraph`), et ne sont pas réaffichées comme « Dérogation posée » (express 10 (b)) ;
   - un seul mot changé redemande **toutes** les raisons 🔴, car une seule empreinte couvre tout le texte (INFRA-19). **S–M.**
7. **Des propositions acceptées rendent l'article impubliable** : une fois acceptés, ils déclenchent un ⛔ « Bloc coupé avant la fin d'une phrase », sans dérogation possible.
   - les résumés simulés, qui finissent en plein mot (express 10 (a), CER-25) ;
   - **tout tableau accepté** (RED-22, `trimTruncatedBlocks`).
   - La vérification des propositions (`shared/verifiers/enrichment.ts`) et celle de la publication ne jugent pas « coupé » de la même façon. **S.**

### Tous les ❌, avec leur cause et leur taille

| Vérif. | Constat | Cause probable | Taille |
|---|---|---|---|
| Express 3 · CAP-10 | Le 🟠 « Google ne suggère pas cette requête » ne sort jamais : Google renvoie des suggestions approchées (« kv plomberie… ») et la porte compte leur nombre brut. Le panneau, lui, affiche « 0 matches ». | `gate.service.ts` `buildCaptainInput` (`autocompleteSuggestions.length`) | S |
| Express 10 | (a) ⛔ du résumé simulé coupé ; (b) dérogations du premier jet redemandées ; (c) identifiants internes affichés (« captain-intent-mismatch », « lieutenants-too-few »), « locale.. » | voir « graves » 6 et 7 | S / S–M / XS |
| UI-1 · RAD-4 | Icônes d'intention vides (Radar et Capitaine) ; infobulle « PainPoint absent » alors que l'article a une douleur | `v-safe-html.ts` `sanitizeSvg` vide un fragment SVG sans `<svg>` | XS |
| UI-7 | Le bandeau « Résultats déjà calculés » change de place et de hauteur selon l'onglet | `.cache-bar` (`MoteurView.vue`) | XS |
| CER-10 | Alerte « Pas de lien vers un Intermédiaire (parentTitle manquant). » | `article-proposals/computeds.ts` | XS |
| CER-24 | Groupes « INTERMEDIAIRE » / « SPECIFIQUE » bruts ; badge « spécialisé » sans couleur | `MoteurContextRecap.vue`, `ContextRecap.vue` ; classe `tree-type--specifique` sans style | XS–S |
| MOT-4 | Choisir un article relance seul l'avis IA de chaque candidat (voir « graves » 3) | `CaptainPanel.vue` → `launchAiStream` | S |
| MOT-8 | Le Radar n'écrit pas `keyword_metrics` : le Capitaine remesure le même mot-clé (chiffres différents en MOCK) | `radar_explorations.scan_result` seul | S |
| MOT-10 | Après rechargement, le Radar n'affiche ni mots-clés ni cartes sans cliquer « DB » ; un nouveau scan remplace l'exploration | `RadarPanel.vue` / `useResonanceScore._saveToExploration` | S |
| MOT-17 | Carte Radar non marquée « PAA en cache » 18 min après son scan | non établie | S |
| DIS-5 · DIS-6 | Le filtre de pertinence oublie les jugements au-delà de 500 mots-clés : du hors-sujet est affiché comme pertinent, et les jugements sont refaits (donc repayés en RÉEL) | `useRelevanceScoring.ts` `MAX_RELEVANCE_SCORES` / `mergeScores` | S |
| RAD-14 | Sélection fantôme : après un nouveau scan, les longues traînes restent cochées, et le Capitaine en reçoit 7 au lieu de 2 | `RadarPanel.vue` `longTailSelectedSuggestions` | S |
| CAP-7 | À la première visite d'un article jamais étudié, l'avis IA n'est pas demandé (store vide). **À confronter à la décision « au clic » du 29/09** avant de corriger | `article-keywords.store.ts` `fetchKeywordsMerge` | S |
| CAP-18 | Un mot-clé retapé dans une autre casse laisse deux candidats en base | non isolée | S |
| CAP-20 (geste 4) | Hors ligne, l'échec d'étude d'une racine est muet : une carte « — » s'ajoute, sans « Impossible de valider » | FR-CAP-ROOTS | S |
| LIE-8 · INFRA-16 | « N / 0 sélectionnés » après rechargement | `totalGenerated` non relu depuis la base | XS |
| FIN-2 | = F4 | | S–M |
| FIN-4 | Après « Déverrouiller » puis « Les garder », « Analyser SERP » et « Extraire le Lexique » sont grisés | `LieutenantsPanel.vue` `canAnalyze` | XS–S |
| RED-1 · INFRA-9 | « IA Brief » et « Suggerer par IA » sans capitaine : le serveur refuse avec 400, et l'écran ne dit rien | `capitaine ?? titre` ne remplace pas `''` | XS |
| RED-3 | Sans F5, l'enfant affiche le sommaire, la méta et le texte du pilier | `ArticleWorkflowView.vue` `onMounted` sans remise à zéro | S |
| RED-7 | Échap garde le titre tapé ; un chapitre lâché sur le H1 passe au-dessus de lui | `OutlineNode.vue`, `OutlineEditor.vue` `onDrop` | XS |
| RED-18 | Le chapitre « Introduction » reçoit une carte Tableaux | `enrichment.store.ts` `targetsFor` | XS |
| RED-22 | Une phrase anglaise courte n'est pas signalée ; les cellules de tableau déclenchent le ⛔ « Bloc coupé » | `text-quality.ts` `detectNonFrenchSentences` ; `trimTruncatedBlocks` | S / XS |
| RED-23 | Un aperçu non rechargé télécharge l'ancienne version, alors que la porte a jugé la nouvelle | `ArticlePreviewView.vue` `downloadHtml` | XS |
| INFRA-14 | L'alarme des lieutenants ne propose jamais « À la place : » | `gate.service.ts` `lieutenantsGate` (`unselectedCandidates: []`) | XS–S |
| INFRA-18 | « 0 lieutenant(s) archivé(s) » alors que 2 étaient cochés | `CaptainPanel.vue` `handleUnlockArchive` | XS |
| INFRA-19 | Une retouche redemande toutes les raisons 🔴 (voir « graves » 6) | `publishGate` / `gate_waivers.input_hash` | S–M |
| PU-06 | Robot : cocon cible ignoré ; jamais jouable en MOCK | `phases/cerveau.ts` ; bac à sable | XS / à trancher |

### Défauts connus qui ne se reproduisent plus (à confirmer, puis exigence à repasser « active »)

- **CER-17** : un article retiré de la carte quitte tout de suite l'arbre, et sa section se libère.
- **LEX-7** (FR-LEX-MULTI-KEYWORD-TABS) : l'onglet du capitaine apparaît dès l'extraction, sans rechargement.
- **INFRA-10**, pour sa partie « pile » : la « Courte-traîne IA » inscrit bien ses lignes dans la pile.
- **CAP-4** (partiel) : le jugement IA des PAA arrive sur les notes des cartes.
- **RED-17** (partiel) : dans l'éditeur, la suggestion reste affichée tant que le lien n'est pas posé.

### Autres constats, hors vérifications

- **Appels en double ou partis tout seuls** :
  - l'analyse IA du Lexique part deux fois après chaque extraction, et le serveur mène les deux au bout (06-T4) ;
  - la même analyse part à la seule ouverture de l'onglet Lexique (connu, confirmé) ;
  - chaque génération IA de Discovery est comptée deux fois dans la pile ;
  - des requêtes identiques sont envoyées en double (« Envoyer au Radar », « Découvrir », `PUT …/keywords`) ;
  - un double clic sur « Analyser » envoie 2 études ;
  - « Valider le sommaire » relance `dataforseo/brief` à chaque clic ;
  - chaque « Accepter » envoie 3 enregistrements.
- **Données** :
  - les entités HTML des pages concurrentes ne sont pas décodées : « rsquo », « ndash » entrent au Lexique, et des titres affichent « London&amp;rsquo;s » (`scrape-corpus.service.ts`, S) ;
  - une question PAA vide est enregistrée ;
  - `captain_explorations.status` / `locked_at` ne sont jamais écrits ;
  - ouvrir la rédaction modifie `articles.updated_at` ;
  - la cible de longueur ajustée est ignorée par la suggestion (« 1 800 » au lieu de 1 900).
- **Éditeur** :
  - les liens internes sont enregistrés en `rel="nofollow"` + `target="_blank"` : l'extension Link est déclarée deux fois (d'où l'avertissement tiptap « Duplicate extension names found: ['link'] »), XS ;
  - cliquer un lien interne ouvre un onglet parasite (`…/editor#article-1336`) ;
  - l'éditeur s'ouvre défilé en bas ;
  - dans « Blocs », « Titre H2 » a l'icône « H1 » ;
  - quitter l'éditeur avec des modifications non sauvegardées ne demande rien ;
  - le Retour arrière après un tableau vide ses cellules.
- **Export** : le gabarit contient `<img src="/svg/NomIcone=outStr_Arrow.svg" alt="Image absolute">`.
- **Écrans** :
  - la pile des coûts dépliée recouvre des boutons ;
  - le panneau de détail du Capitaine masque les anneaux ;
  - les mots des mots-clés ne sont pas atteignables au clavier ;
  - des flèches et des croix n'ont pas de nom accessible ;
  - `/cocoon/999999` affiche « Cocoon 999999 not found ».
- **Chiffres** :
  - le thermomètre du Radar compte les suggestions Google de fragments du titre (« guide complet elden ring », « zelda ») ;
  - le jugement « sémantique » des PAA juge « partiel » (72–75 %) des questions sans rapport (à confirmer en RÉEL) ;
  - les volumes s'écrivent « 673.0k » ou « 673k » selon l'écran ;
  - deux sources de PAA se contredisent pour le même mot-clé (Capitaine 4, Lieutenants 0).
- **Libellés** :
  - l'alarme dit « une case cochée suffit » alors qu'il en faut deux ;
  - « 1 point à regarder. Lisez-les » ;
  - en MOCK, Discovery affiche un bandeau « le filtrage… semble ne pas avoir fonctionné… vérifiez votre clé API Claude » ;
  - les coûts affichent « API LIVE » en MOCK ;
  - **libellés sans accents**, très nombreux : « Resultats SERP », « concurrents affiches », « Lieutenants proposes par l'IA », « Contexte strategique », « Angle differenciant », « Consignes specifiques », « Suggerer par IA », « Mots-cles », « Lexique semantique », « Differenciateur », « Reinitialiser », « AJUSTE », « Deverrouiller », « Sommaire valide et sauvegarde. », « Suggestions longue-traine », « Rafraichir », « Derniere analyse », « Generez un article… » ;
  - l'aperçu (« Article needs meta title… ») et le Capitaine (« Keyword validation failed ») affichent des messages en anglais.
- **Réponses simulées (MOCK)** :
  - `mock-fixtures/cocoon-child.ts` `baseTopic` mange le « d » de « démarrer » (« Étapes bien émarrer »), XS ;
  - le résumé simulé finit en plein mot ;
  - la méta simulée est sous les longueurs conseillées (37/60, 112/160) ;
  - `fetchAutocomplete` (client `chrome`) stocke des suggestions approchées sans rapport.

### Écarts entre le texte de la recette et l'écran (recette à reprendre, pas l'outil)

- **Express, étape 1** : « Terminer le brainstorm » est affiché dès l'étape Articles, avant la création du pilier.
- **Express, étape 3** : le 🟠 attendu ne peut pas sortir tant que Express 3 · CAP-10 n'est pas corrigé.
- **RAD-15** : après un changement d'article, l'écran ouvre le Capitaine (`computeSmartTab`), pas le Radar.
- **EXT-7** : un mot-clé en échec ne crée pas de carte. Une ligne « Erreur : … » s'affiche sous la liste, puis disparaît à la réouverture.
- **CER-25** : dans un cocon à plusieurs enfants, « Résumer » propose toutes leurs sections. Il repropose même une section déjà résumée et redouble la phrase de renvoi (🔴 « Paragraphe répété »).
- **CAP-21** : aucun article sans douleur n'existe en base ; la vérification ne peut pas se faire telle qu'écrite.
- **EXT-8** : « GOOGLE_CLIENT_ID » n'est pas réglé sur ce poste. L'onglet ouvert par « Connecter » affiche un JSON brut, et la recette Search Console ne peut pas se faire.

### Par parcours utilisateur

| Parcours | Verdict | Ce qui coince |
|---|---|---|
| PU-01 Premier article du cocon | ✅ de bout en bout (pilier publié), avec défauts | Le 🟠 d'autocomplétion ne sort pas ; les dérogations sont redemandées à la publication ; le résumé simulé rend le pilier impubliable ; le fichier exporté perd les liens et son H1 (connu) ; F4 |
| PU-02 Article enfant | ✅ dans l'outil, ❌ dans le fichier livré | Enfant né d'une section, écrit, relié à son parent, publié (tronçon joué). Mais le HTML exporté ne contient **pas** le lien vers le parent (FR-RED-EXPORT-HTML). Aussi : CER-24, CER-25 |
| PU-03 Reprendre un article | ⚠ | Reprise depuis l'accueil OK (tronçon joué : progression 5/6, Lexique ouvert directement, rien repayé). Mais rechoisir un article peut effacer sa Structure (F4) et repayer les avis IA (MOT-4). Sans F5 : texte et score de l'article précédent (RED-3, grave 4). Radar vide après rechargement (MOT-10). La Rédaction rouvre sur « Brief & Structure » (connu) |
| PU-04 Choisir le mot-clé | ❌ | DIS-5/6, RAD-14, MOT-8, MOT-4, CAP-10, CAP-18, CAP-20, RAD-4 |
| PU-05 Améliorer un article rédigé | ⚠ | Un tableau accepté rend l'article impubliable ; l'Introduction reçoit une carte Tableaux ; une phrase anglaise n'est pas signalée ; un aperçu non rechargé exporte l'ancienne version ; une retouche redemande toutes les raisons ; les liens sont en `nofollow` |
| PU-06 Mode automatique | ❌ | Cocon cible ignoré (article créé dans un vrai cocon) ; jamais jouable en MOCK (porte du capitaine) ; relecture et publication non atteintes |
| PU-07 Quand ça coince | ⚠ | Mesures en cache sans réseau ✅ (EXT-6/7) ; message de LIE-2 avec « (SERP analysis failed) » (connu) ; SERP Data muette (connu) ; échec muet d'une racine (CAP-20) ; badge MOCK qui ment (F1) ; 15 s en production après un redémarrage |
| PU-08 Décrire son activité | ✅ en MOCK | Configuration du thème (restaurée à l'identique), stratégie reprise au Moteur et à la Rédaction (CER-26, CER-28, INFRA-4, 5, 8). La prise en compte dans les textes générés ne se juge qu'en RÉEL |

### Non fait

- **RÉEL (payant)** : les 38 vérifications `*-R*`. Les principales à faire un jour : la qualité du lexique et des textes, les « [à sourcer] », la vraie analyse IA (EXT-R1), le plafond de dépense (EXT-R3, INFRA-R2), la remesure à ne pas repayer (INFRA-R1).
- **Search Console** (EXT-8, EXT-9) : pas d'identifiant Google réglé sur le poste.

### Données laissées en base, à nettoyer **avec l'accord d'Arnaud**

Sauvegardes prises : `data/_backup_pg_20260930-0234.sql` (avant la recette), `data/_backup_pg_20260930-0427.sql` (avant CER-16).

- Cocons de test : 28025 « Recette 2026-09-30 », 28026 « Recette B 2026-09-30 », 28027 « La recette 2026-09-30 », 28028 « Recette vide 2026-09-30 », 28029 « recette vide 2026-09-30 », 28030 « Recette verrou 2026-09-30 », 28031 « Le Recette B 2026-09-30 ». Leurs articles vont de 1335 à 1352.
- **À part** : l'article **1353**, créé par le robot dans le **vrai** cocon 2 « Visibilité web locale à Toulouse » (voir « graves » 5).
- **Configuration du thème** : restaurée à l'identique par l'agent 02 (seul `updated_at` a changé).

### Prochaine étape proposée

Trier ces écarts comme le 2026-09-29 : défauts nouveaux → exigences « non tenue (ce qui manque) » ; défauts disparus → retour à « active » après confirmation ; phrases de recette à corriger. Puis corriger dans l'ordre : l'argent (F1, avis IA repayés, appels en double), les pertes de données (F4, score écrit ailleurs, RED-3), la publication (graves 6 et 7), puis le reste.
