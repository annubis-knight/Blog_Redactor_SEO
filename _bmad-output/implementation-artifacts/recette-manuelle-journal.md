---
title: Journal de recette manuelle
last_updated: 2026-09-28
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

## Écarts relevés à la lecture du code — 2026-09-28, à confirmer à l'écran

Ces écarts ont été relevés en écrivant la recette exhaustive (modules `spec/recette/`) : neuf agents ont lu, chacun pour son domaine, la spec, les exigences et le code. **Aucun n'a encore été vu à l'écran.** Pendant la recette, un écart confirmé devient un constat R2, R3…, et son exigence passe « non tenue ». Le code de la vérification qui le montre est indiqué entre crochets, quand il existe.

**Rien n'est corrigé.** Le tri se fait avec Arnaud.

### A. Bugs probables

1. **Un article sans texte affiche le texte de l'article ouvert juste avant.** La sauvegarde automatique risquerait alors de le recopier dans le nouvel article. Code : `ArticleWorkflowView.vue:278-291`, `ArticleEditorView.vue:173-186`. Les remises à zéro n'ont aucun appelant (`editor.store.ts:678`, `outline.store.ts:199`). [RED-3]
2. **L'export télécharge l'aperçu chargé à l'ouverture de l'onglet**, pas le texte corrigé depuis (`ArticlePreviewView.vue:44-55`, `95-103`). [RED-23 ; le parcours express, étape 10, fait fermer puis rouvrir l'aperçu]
3. **La Rédaction n'affiche aucun message d'erreur.** `ErrorMessage` est utilisé sans import (`ArticleWorkflowView.vue:428-432`) ; ni l'éditeur ni l'enrichissement n'affichent l'erreur.
4. **Des mesures déjà payées sont rachetées.**
   - Le Radar rachète les volumes à chaque scan (`keyword-radar.service.ts:240-250`).
   - Un mot-clé à qui il manque une mesure est remesuré à chaque étude (`keyword-scan.routes.ts:92-99`). [CAP-R2]
5. **Les mesures du bac à sable sont gardées comme de vraies mesures.** Le cache est rangé par mot-clé seul (`dataforseo/cache.ts:13,17`). En RÉEL, un mot-clé mesuré en MOCK depuis moins de 7 jours affiche donc des chiffres factices.
6. **Capitaine :**
   - les racines sont vidées à la réouverture (`data.service.ts:704-708`) [CAP-15] ;
   - un mot-clé retapé reste en erreur (`useExploredKeywords.ts:247-270`) [CAP-20] ;
   - la liste se reconstruit et les notes passent à « — » (`CaptainPanel.vue:768`) [CAP-13, CAP-18] ;
   - un envoi depuis le Radar casse l'affichage du verrou (`CaptainPanel.vue:726-738`) [CAP-19] ;
   - un article neuf ne reçoit pas d'avis d'office (`CaptainPanel.vue:801-802`) [CAP-7].
7. **Cerveau :**
   - la saisie affichée peut être perdue au « Suivant » (`cocoon-strategy.store.ts:57`, `150-153`) [CER-5] ;
   - le bouton « + » (approfondir) de l'étape CTA provoque une erreur 500 sans message (`strategy.schema.ts:172,183`) ;
   - aucune erreur d'IA ne s'affiche au Cerveau.
8. **La chaîne de secours de l'IA s'arrête sur un fournisseur sans clé**, au lieu de passer au suivant : le message « sans clé » n'est pas reconnu (`gemini.service.ts:37`, `openrouter.service.ts:33`, `ai-provider.service.ts:174-176`).
9. **Une dérogation est acceptée sur le seul nom de sa règle.** Elle est enregistrée pour les données du moment, qui peuvent ne jamais avoir été montrées (`gate.service.ts:395-405`).
10. **Lieutenants :**
    - un échec d'analyse s'affiche en anglais et sans explication, « SERP analysis failed » (`serp-analysis.routes.ts:67-70`, `useLieutenantsSerp.ts:76-92`) ;
    - après un rechargement, le compte des propositions n'est pas restauré et le bouton de relance ne fait rien (`useLieutenantsIa.ts:157-223`).
11. **Lexique :**
    - le bouton payant reste actif sans Capitaine verrouillé, et pendant l'analyse (`LexiquePanel.vue:245-250`, `461-477`) ;
    - le tri « A-Z » commence de Z à A (`useSortableList.ts:88-101`) ;
    - l'avis de l'IA disparaît au rechargement (`LexiquePanel.vue:549-554`).
12. **Moteur :**
    - « Continuer vers … → » reste actif sans article choisi (`MoteurView.vue:655-673`) ;
    - un article choisi dans « Articles publiés » perd sa douleur (`MoteurContextRecap.vue:69-79`) ;
    - à l'ouverture du Capitaine, l'avis de l'IA, qui est payant, part tout seul (`CaptainPanel.vue:797-811`).
13. **Discovery :**
    - la courte-traîne générée avant « Découvrir » n'est pas filtrée (`useDiscoveryPanel.ts:435-467`) ;
    - une réponse vide des longues traînes est gardée 7 jours, sans bouton pour réessayer (`long-tail-suggest.service.ts:83-96`).
14. **Le statut « brouillon » n'est jamais posé** (`ArticlePreviewView.vue:70`). L'avancement du Dashboard ne compte donc que les articles publiés.
15. **Un « Rafraîchir » raté marque la mesure comme fraîche** et écrase le cache par une fiche vide (`keyword-metrics.service.ts:171`, `brief.ts:107`). Une erreur dans « SERP Data » remplace toute la page Rédaction (`brief.store.ts:169-170`).
16. **« Tout réinitialiser » annoncerait « 0 lieutenant(s) archivé(s) »** : le compte est relu après l'archivage (`CaptainPanel.vue:485-487`). [INFRA-18]

### B. En MOCK, des réponses simulées qui ne suivent pas le format attendu

Elles faussent la recette en MOCK : l'écran montre un état vide ou un texte générique, là où le RÉEL montrerait un résultat. À corriger avant de conclure sur les vérifications concernées.

- **Avis Capitaine** : la réponse préparée ne se déclenche jamais (`streams.ts:57-62`), l'écran affiche « [Mock provider] Réponse simulée… ».
- **Avis du Lexique** : mauvais champs (`streams.ts:185-206` contre `lexique.contract.ts:32-48`). Toutes les recommandations sont écartées, et l'analyse repart à chaque ouverture.
- **Avis des Lieutenants** : pas de `sources`, `suggestedHnLevel` ni `contentGapInsights` (`streams.ts:136-180`).
- **Longues traînes du Radar** : la réponse cherche les mots-clés au mauvais endroit de la demande (`long-tail-suggest.ts:18-31`), la liste revient vide. Le test navigateur `interactions-radar.parcours.test.ts:170` attend une classe `.longtail-error` qui n'existe pas (`lt-error`).
- **Micro-contexte** : les consignes arrivent en liste au lieu d'un texte (`generate.ts:74-78`), et l'enregistrement est refusé sans message.
- **Cerveau** :
  - les sujets suggérés affichent « Aucun sujet retourné. » ;
  - « Remplir les champs avec Claude » renvoie une erreur 500 en anglais ;
  - la suggestion, la fusion et la régénération de la carte affichent le texte générique (`strategy.ts:25`, `60-76`, `streams.ts:16-46`).
- **Réduction** : elle recevrait la réponse générique (`generate.ts:145`), à confirmer.
- **Filtre de pertinence de Discovery** : il écarte tout mot-clé qui contient « recette » (`discovery.ts:26`), alors que le cocon de test s'appelle « Recette <date> ».

### C. Exigences marquées « active » que le code semble contredire

À passer « non tenue » une fois l'écart confirmé à l'écran, puis à marquer ⚠ dans la recette : le garde-fou le demandera.

- **Contredites par le code :**
  - FR-API-VOCABULAIRE-SCAN : « Aucun mot-clé à valider… », « Validation en cours... », « Validation Capitaine dans Ns » [MOT-18] ;
  - FR-MOT-CROSS-TAB-PAYLOAD : aucun bouton Capitaine → Lieutenants en mode guidé ;
  - FR-CAP-ROOTS ;
  - FR-LIE-SERP-ECHEC-EXPLIQUE ;
  - FR-RED-EDITOR-TIPTAP : « Supprimer le contenu » laisse le texte en base ;
  - FR-RED-SEO-LIVE : la jauge affiche 0 avant le premier calcul ;
  - FR-INFRA-TYPE-RULES-SSOT : la fourchette de longueur est calculée à ±20 %, avec des nombres écrits en dur ;
  - FR-INFRA-PAA-EXPLORATIONS : le jugement des questions est refait à chaque chargement ;
  - NFR-UX-STABLE-SKELETON ;
  - NFR-COST-CACHE-FIRST.
- **Invérifiables à l'écran :**
  - FR-UI-VOCABULAIRE-VERROUILLER : « Verrouiller ce mot-clé » n'est affiché nulle part ;
  - FR-MOT-FREE-NAV : son bandeau est inatteignable ;
  - FR-INFRA-KPI-SCORING-NULLSAFE : l'alerte « Données KPI indisponibles » n'est montée par aucun écran.
- **Statuts « non tenue » incomplets** : FR-UI-AI-PANELS-PATTERN (panneau des Lieutenants), FR-MOT-NO-AUTO-ACTION (avis automatique au Capitaine), FR-RED-HUMANIZE-SECTION (message jamais affiché), FR-RED-CONTEXTUAL-ACTIONS (liens retirés non annoncés par le panneau Blocs).
- **Deux exigences se contredisent** : NFR-COST-AI-MOCK (« active » : le choix MOCK / RÉEL survit au redémarrage) et FR-INFRA-RUNTIME-MODE (« non tenue » sur ce même point).

### D. Documentation à corriger

- **spec/14** : « $0.00 » alors que l'écran écrit « < $0.001 ».
- **spec/05** : « Vider le cache » et le chiffre « C » apparaissent dès qu'un scan est connu.
- **spec/13** : pas de « Contenu généré » dans le rappel du sommaire.
- **spec/04** :
  - la configuration du thème n'est envoyée que si l'audience, la promesse, le secteur ou le style est rempli ;
  - « Articles du cocon » n'inclut pas la carte, et ses groupes tombent tous dans « Autre ».
- **spec/08** :
  - l'avis n'est pas demandé d'office ;
  - le CPC s'écrit avec un point ;
  - « À la place : » s'affiche aussi sous un 🟠.
- **spec/07** : « jamais racheté » est faux.
- **spec/11** : l'avis enregistré n'est pas réaffiché.
- **spec/15** : le message « Ces résultats commencent à dater… » n'est jamais affiché.
- **design/08** : la limite connue « séquence d'échappement » est périmée, réglée par `92facc7`.
- **design/09** : le rechargement du Radar se fait sans contrat côté écran.

### E. Textes à l'écran

- **Sans accents :**
  - « Deverrouiller », « Rafraichir » ;
  - `KeywordDiscoveryCacheBar.vue`, `BriefStructureStep.vue`, `LieutenantProposals.vue`, `LieutenantSerpAnalysis.vue`, `RadarKeywordCard.vue:472`, `ContentRecommendation.vue`.
- **En anglais :**
  - « SERP analysis failed », « Keyword validation failed » ;
  - les messages de l'aperçu refusé ;
  - « Discovered via suggest-alphabet » ;
  - l'intention d'une carte venue du Radar ;
  - l'erreur brute de Search Console sans identifiants.
- **Codes internes affichés :**
  - « (parentTitle manquant) » ;
  - « (« lieutenants-too-few ») » ;
  - les niveaux « PILIER / INTERMEDIAIRE / SPECIFIQUE » ;
  - « (type intermediaire) ».
- **Divers :**
  - « 1 articles » ;
  - le badge « specifique » sans couleur ;
  - le fil d'Ariane avec « / », où le silo n'est pas un lien ;
  - le titre d'accueil vide sans silo ;
  - « Proposé depuis votre panier » ;
  - un nom de cocon en double refusé selon la casse ;
  - le texte du NO-GO affiché deux fois ;
  - « Vider le cache » sans retour à l'écran ;
  - le plafond arrondi au centime ;
  - « Scraping ~N URLs via DataForSEO » même servi par la base ;
  - « Autocomplete N matches » qui affiche un rang ;
  - « Cela consommera un appel Claude. » en MOCK ;
  - le vert du top 10 de Search Console jamais affiché ;
  - l'infobulle de l'anneau qui affiche « 50/100 » pour une donnée absente ;
  - « Dérogation posée au valider les lieutenants ».
