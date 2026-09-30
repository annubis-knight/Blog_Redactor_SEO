---
status: référence
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Lieutenants

Les lieutenants sont les mots-clés secondaires de l'article : les recherches voisines de son capitaine (le mot-clé principal verrouillé à l'onglet précédent). L'onglet « Lieutenants » est le deuxième de la phase « Valider » du Moteur (Capitaine → Lieutenants → Structure → Lexique). On y analyse les pages concurrentes, l'IA propose des candidats, l'utilisateur coche ceux qu'il garde. Le plan de l'article ne se construit pas ici : il naît des lieutenants retenus, dans l'onglet Structure.

## Ouvrir l'onglet
*Exigences : FR-LIE-SERP-ANALYZE, FR-LIE-CHECK*

- Tant que le capitaine n'est pas verrouillé et qu'aucune proposition n'existe pour l'article, un message invite : « Verrouillez votre Capitaine dans l'onglet précédent pour analyser la SERP. » Le curseur et « Analyser SERP » sont grisés.
- Dès qu'une proposition existe pour l'article, l'onglet reste utilisable même si le capitaine est déverrouillé ensuite (« Les garder ») : « Analyser SERP » reste actif, sur le mot-clé de l'article.
- Ouvrir l'onglet ne lance rien de payant. Les lieutenants déjà enregistrés reviennent à l'écran dès l'ouverture, même sans lieutenant retenu : les retenus cochés, puis les candidats suggérés, puis les « Autres candidats ». Une ancienne liste sans détail revient avec des cartes sans raison et un score « — ».
- Le panneau « 💡 Suggestions pour vos Lieutenants » liste au plus 10 mots-clés issus du scan Radar de l'article. « Ajouter » crée une carte non cochée, raison « Proposé depuis votre panier », niveau H2, score « — », enregistrée aussitôt comme proposition : elle revient au rechargement, même sans être cochée. Un candidat écarté ajouté ainsi quitte « Autres candidats » pour la liste principale. Le panneau se masque avec « × ».

## Analyser les concurrents
*Exigences : FR-LIE-SERP-ANALYZE, FR-LIE-SERP-ECHEC-EXPLIQUE, FR-LIE-SLIDER-INTELLIGENT, FR-LIE-SCRAPE-DEDIE*

La SERP est la page de résultats de Google pour une recherche. « Analyser SERP » lit les 10 premiers résultats du capitaine, puis ceux de ses mots-clés racines (les racines retenues au Capitaine, sinon jusqu'à 5 racines tirées du capitaine).

- Les mots-clés sont analysés l'un après l'autre. L'écran montre « Analyse SERP en cours (n/N) » avec, par mot-clé, ✓ et le nombre de concurrents, « scraping... » ou « en attente ». La pile d'activité note « Analyse SERP lancée (N mots-clés) ».
- Trois étapes s'enchaînent à l'écran : « Scraping SERP Google (n / N mots-clés) », « Analyse IA — proposition de lieutenants », « Filtrage et sélection des meilleurs candidats ».
- Le résumé dit « N concurrents affichés », « (cache) » si l'analyse a été relue, et « N questions PAA » ou « 0 PAA — les lieutenants seront basés sur les headings et la stratégie du cocon ». Les PAA (« Autres questions posées ») sont les questions que Google affiche sous les résultats.
- Un onglet par mot-clé analysé liste ses concurrents : « #rang », badge « Blog » ou « Autre », domaine, titre cliquable. Une page qui n'a pas pu être lue porte un « ! » ; une page lue mais vide est traitée de même. Deux filtres « Blogs (n) » et « Autres (m) » restreignent la liste.
- Une analyse de moins de 7 jours est relue en base, quel que soit l'article qui l'a demandée ; une lecture de moins d'une heure est relue en mémoire. Au-delà, l'analyse est refaite et payée.
- « Tout relancer (SERP + IA) » vide l'écran et relance l'analyse. Il est grisé pendant une analyse ou une génération.
- Le curseur « Résultats SERP » va de 3 à 10 (10 par défaut). Il ne change que le compteur « N concurrents affichés » : la liste des concurrents et les données envoyées à l'IA restent entières.

**Échec de l'analyse.** Le message nomme le mot-clé et la suite à donner :

| Cause | Message (début) |
|---|---|
| Aucun résultat exploitable | « Google ne renvoie aucun résultat exploitable pour « … ». Le mot-clé est probablement trop étroit : élargissez-le au Capitaine, puis relancez l'analyse. » |
| Budget d'appels atteint | « L'analyse a été refusée : le budget d'appels externes est atteint pour le moment. Réessayez dans quelques minutes. » |
| Source muette | « L'analyse n'a pas abouti : la source n'a pas répondu à temps pour « … ». Relancez-la. » |
| Autre | « L'analyse SERP n'a pas abouti pour « … » (…). Relancez-la, ou choisissez un autre mot-clé. » |

## La proposition de l'IA
*Exigences : FR-LIE-PROPOSE-AI, FR-LIE-EXTRACT-HEADINGS, FR-LIE-GEOFUNNEL-RULE, FR-LIE-CANDIDATES-BADGES, FR-LIE-SECTIONS-FOLDABLE, FR-LIE-AI-FRONTIER*

- La proposition part d'elle-même après une analyse réussie. Si toutes les propositions enregistrées pour l'article ont moins de 7 jours, elles sont relues au lieu d'être refaites.
- L'IA reçoit, avec un poids fort, les concurrents, les PAA et les titres récurrents du capitaine (vus sur au moins deux pages lues) ; avec un poids réduit, ceux des racines ; plus les groupes de mots de Discovery, la douleur de l'article, la stratégie du cocon, les règles du type d'article, et les lieutenants déjà retenus dans les autres articles du cocon, marqués « INTERDITS ».
- Règle de l'entonnoir géographique (consigne de l'IA, non vérifiée ensuite) : un pilier ne propose pas plus de lieutenants citant la ville que de chapitres autorisés à la citer (2) ; un intermédiaire ou un spécialisé n'en propose aucun ; un lieutenant qui ne fait qu'ajouter la ville à un terme générique perd 15 à 25 points.
- Pendant la génération, le panneau « Suggestions IA Lieutenants » fait défiler le texte brut de l'IA ; la liste affiche « Analyse IA en cours... ».
- À la fin, les candidats sont triés par score. Les meilleurs restent en tête de liste (5 pour un pilier, 5 pour un intermédiaire, 4 pour un spécialisé), les autres sont rangés dans « Autres candidats (M) », repliés. Un même mot-clé proposé deux fois n'apparaît qu'une fois.
- Aucune carte n'arrive cochée : l'IA propose, l'utilisateur décide.
- Chaque carte montre : une case, le mot-clé, le score sur 100 (« — » s'il manque, info-bulle « Score IA non fourni »), le niveau conseillé « H2 » ou « H3 », la raison, et une pastille colorée par source (`paa`, `serp`, `group`, `root`, `content-gap`).
- La barre de tri propose « A-Z » et « Score IA ». Le tri s'applique aussi aux « Autres candidats ». Un score absent reste en bas dans les deux sens.
- « Failles de contenu » (mis en forme) suit la liste ; le panneau de l'IA reprend ce texte sous « Content-gap détecté ».
- Deux sections repliées par défaut suivent la liste : « Sources IA : questions Google (PAA) » et « Sources IA : clusters Discovery ». Vides, elles l'expliquent (« Google n'a renvoye aucune question PAA… », « Aucun cluster disponible. Lance un scan Discovery pour ce cocon, puis reviens ici. »).
- Le panneau de l'IA est toujours sous la liste, séparé d'elle : la liste des lieutenants n'est jamais dans ce panneau, et aucune structure de titres n'est affichée dans l'onglet.
- Relancer : « Relancer la proposition IA » après une erreur ; dans le panneau de l'IA, « Régénérer » après une erreur, « Lancer une suggestion IA » ou « Régénérer les suggestions » au repos, avec « N propositions générées par l'IA. », relu aussi après un rechargement. Sans Capitaine verrouillé ni proposition déjà faite, ce bouton est grisé et le panneau dit pourquoi (« Verrouillez d’abord votre Capitaine : l’IA propose les lieutenants à partir de lui. ») ; après un rechargement, la relance relit d'abord l'analyse SERP (en base si elle a moins de 7 jours), puis rappelle l'IA : jamais un clic sans effet. Quand le panneau affiche « Content-gap détecté », il ne propose pas de bouton.

> **En situation.** Sur l'intermédiaire « audit site web », l'utilisateur clique « Analyser SERP ». Le capitaine et deux racines sont analysés ; l'IA propose 8 candidats ; 5 restent en tête de liste, les 3 autres vont dans « Autres candidats ». Aucun n'est coché. « audit seo toulouse » a un score bas : la consigne interdit la ville à un intermédiaire.

## Retenir des lieutenants
*Exigences : FR-LIE-CHECKBOX-LOCK-IMMEDIATE, FR-LIE-CHECKBOX-COUNT*

- Cocher une carte (retenue ou « Autres candidats ») verrouille ce lieutenant et l'enregistre aussitôt ; décocher le déverrouille aussitôt. Il n'y a pas de bouton de validation groupée, et les autres cases restent cliquables.
- Le compteur de la barre de tri affiche « X / N sélectionnés », où N est le nombre de candidats générés par l'IA ; après un rechargement, N est relu avec les propositions (retenues, proposées et écartées pour le Capitaine courant). Il n'indique pas de fourchette conseillée par type d'article.
- Relancer la proposition remplace les cartes et décoche tout : les lieutenants retenus apparaissent décochés et l'étape est retirée, alors qu'ils restent dans la liste enregistrée (voir « Limites connues »).
- Déverrouiller le Capitaine avec « Tout réinitialiser » archive les lieutenants retenus, à l'écran et dans l'enregistrement : après un rechargement, aucun ne revient coché, ni ici ni dans la Finalisation. Les autres propositions gardent leur statut.

## L'étape « Lieutenants verrouillés » et sa porte
*Exigences : FR-LIE-CHECK, FR-LIE-LOCK-GATE*

Une porte est un contrôle fait par le serveur avant d'accorder une étape de progression. Chaque point relevé a un niveau : 🟠 attention (il suffit de l'avoir lu), 🔴 risque (on peut passer outre en écrivant pourquoi : c'est une dérogation), ⛔ défaut technique (impossible de passer outre). L'alarme graduée montre ces points (voir [Infrastructure transversale](16-infrastructure.md)).

- Le premier lieutenant coché demande l'étape. Les lieutenants sont d'abord enregistrés, puis la porte les juge, sans ouvrir d'alarme.
- La porte passe : l'étape est accordée, sans bandeau. Elle refuse : l'étape n'est pas accordée (ou est retirée), et un bandeau s'affiche : « Étape non validée. » suivi de la première raison et de « (+n autres) », avec un bouton « Voir pourquoi / décider » qui ouvre l'alarme « Avant de valider les lieutenants ».
- Tout ajout ou retrait de lieutenant relance la vérification. Un changement fait pendant une vérification est repris ensuite ; l'étape n'est jamais demandée deux fois.
- Tout décocher retire l'étape, efface le bandeau et retire aussi l'étape « Structure validée ». Changer les lieutenants retenus alors que la structure est validée retire l'étape « Structure validée ».
- À l'ouverture de l'onglet : étape présente sans lieutenant retenu → retirée ; lieutenant retenu sans étape → la porte décide.

| Point | Niveau | Message |
|---|---|---|
| Moins de lieutenants que le minimum du type (pilier 3, intermédiaire 2, spécialisé 1) | 🔴 | « 1 lieutenant pour un article Pilier : le minimum conseillé est 3. » |
| Lieutenant = capitaine d'un autre article du cocon | 🔴 | « « … » est le mot-clé principal de l'article « … » du même cocon. » |
| Lieutenant = lieutenant d'un autre article du cocon | 🟠 | « « … » est aussi un lieutenant de « … ». » |
| Lieutenant = capitaine de l'article | 🟠 | « « … » est déjà le capitaine de cet article. » |

- Sous « trop peu de lieutenants », « À la place : » propose jusqu'à cinq propositions de l'IA non cochées, les mieux notées d'abord.
- Les comparaisons ignorent casse, accents et espaces superflus. Chaque lieutenant en conflit se déroge séparément.
- Une dérogation tombe si le type, le capitaine, les lieutenants ou les mots-clés du cocon qui recoupent ceux de l'article changent ; un article du cocon sans rapport, créé plus tard, ne la fait pas tomber.

## Limites connues (Lieutenants)

- Relancer la proposition de l'IA décoche les lieutenants retenus à l'écran et retire l'étape, alors que la liste enregistrée les garde ; au rechargement, ceux que l'IA n'a pas reproposés reviennent cochés.
- Le panneau de l'IA n'offre pas de bouton de relance tant qu'il affiche les failles de contenu ; « Tout relancer (SERP + IA) » relit alors les propositions de moins de 7 jours sans rappeler l'IA.
- La règle géographique n'est qu'une consigne de l'IA : aucun contrôle ne l'applique aux lieutenants (la porte de la structure contrôle, elle, la ville dans les chapitres).
