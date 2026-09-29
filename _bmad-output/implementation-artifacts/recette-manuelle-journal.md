---
title: Journal de recette manuelle
last_updated: 2026-09-29
synced_with:
  - spec/18-recette-manuelle.md
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
