---
title: Recette — Capitaine
module: 05
last_updated: 2026-09-28
synced_with:
  - spec/requirements.md
  - spec/08-capitaine.md
---

# Module 05 — Capitaine

**Durée :** ~65 min · **Mode :** MOCK, sauf la section RÉEL · **Prérequis :** le parcours express fait (cocon « Recette <date> » : pilier rédigé, avec son Capitaine verrouillé, un lieutenant retenu par dérogation et sa structure validée ; un article enfant « À rédiger ») ; bouton sur **MOCK** ; connexion internet.

Ce module vérifie tout l'onglet Capitaine du Moteur : l'étude d'un mot-clé (indicateurs, verdict, Score Pertinence, racines, avis de l'IA), le panneau de détail, le tri, le verrouillage (porte, un seul Capitaine, étape) et ce qui reste après une réouverture. L'alarme 🟠 au verrouillage, vue à l'étape 3 du parcours express, est reprise ici avec ses autres cas. Sauf mention, tout se passe sur l'article enfant, et les vérifications s'enchaînent : ne recharge pas la page et ne change pas d'article avant la CAP-14.

## Vérifications

### CAP-1 — À la première visite, le mot-clé de l'article est étudié d'office
**Exigences :** FR-CAP-SCAN ⚠

**Gestes :**
1. Sur la page du cocon « Recette <date> », clique la carte **« Moteur »**. Ouvre **« Articles suggérés »** et clique l'article enfant créé à l'étape 7 du parcours express.
2. Le Moteur ouvre l'onglet **Capitaine** (sinon, clique-le dans la barre du haut). Attends la fin de « Validation en cours... ».
3. Clique l'onglet **Discovery** : sous le champ « Mot-clé racine », la ligne « Article : … · Douleur : … » donne la douleur de l'article. Note-la, puis reviens sur **Capitaine**.

**Tu dois voir :**
- le champ « Tester un mot-clé capitaine… » déjà rempli avec le mot-clé de l'article ;
- une seule carte, ce mot-clé : d'abord « Validation en cours... », puis la ligne d'indicateurs « vol », « KD », « CPC », « PAA » (en « pts ») et, à droite, un anneau avec « Score Pertinence » dessous ;
- une mesure inconnue affichée « — », jamais « 0 ».

**C'est un bug si :**
- la liste reste sur « Aucun mot-clé à valider pour cet article. » ;
- la carte reste bloquée sur « Validation en cours... » ;
- le mot-clé apparaît deux fois.

**⚠ Défaut connu :** dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-2 — Tester un mot-clé à la main
**Exigences :** FR-CAP-INPUT, FR-CAP-LOCK-INTEGRITY

**Gestes :**
1. Efface le champ « Tester un mot-clé capitaine… » et appuie sur Entrée. Tape trois espaces et appuie encore sur Entrée.
2. Tape `création site internet toulouse`, puis clique **« Analyser »**.
3. Tape un mot-clé de 3 mots qui reprend le mot le plus parlant de la douleur notée à la CAP-1, puis appuie sur Entrée. Par exemple `commencer site internet` si la douleur est « Le lecteur ne sait pas par où commencer. ».
4. Tape `zqxw vitrine kvj`, puis double-clique **« Analyser »**.
5. Tape `agence web`, puis appuie sur Entrée.
6. Quand toutes les cartes ont fini leur étude, retape `création site internet toulouse` à l'identique et appuie sur Entrée.

**Tu dois voir :**
- à l'étape 1 : le bouton « Analyser » grisé, la petite touche « Entrée » dans le champ, et rien d'autre ;
- à chaque nouveau mot-clé : une carte ajoutée en bas de la liste, qui passe par « Validation en cours... » puis montre ses indicateurs ; le champ garde ton texte ;
- le double clic ne crée qu'une carte `zqxw vitrine kvj` ;
- à l'étape 6 : aucune nouvelle carte, le mot-clé est ré-étudié à sa place ;
- au total, 5 cartes : le mot-clé de l'article et les 4 tiens.

**C'est un bug si :**
- un champ vide, ou fait d'espaces, lance une étude ;
- Entrée et « Analyser » ne font pas la même chose ;
- un mot-clé déjà présent crée une deuxième carte.

### CAP-3 — La carte montre le Score Pertinence, jamais le Score Marché
**Exigences :** FR-CAP-SCORING-BIMODAL ⚠

**Gestes :**
1. Survole l'anneau de chaque carte pour ouvrir son infobulle.
2. Note sur papier, pour `création site internet toulouse`, `agence web` et `zqxw vitrine kvj` : le chiffre de l'anneau et la valeur de la ligne « Intent × Douleur ». Tu les compareras à la CAP-16.

**Tu dois voir :**
- sous chaque anneau, « Score Pertinence » (jamais « Score KPI »), et une seule note par carte ;
- dans l'anneau, un nombre de 0 à 100, coloré du rouge (bas) au vert (haut), ou « — » en gris quand le score manque ;
- l'infobulle : le titre « Score Pertinence », cinq lignes « Pain × Mot-clé », « PAA × Douleur », « Autocomplete × Douleur », « Racines » et « Intent × Douleur », chacune avec son poids entre parenthèses et une valeur « n/100 », puis « Total », égal au chiffre de l'anneau ;
- juste après une étude : « Racines (0%) », et les autres poids à « (38%) », « (31%) », « (19%) » et « (13%) » : les 20 % des racines sont répartis sur les quatre autres ;
- « Pain × Mot-clé » plus haut pour ton mot-clé de la douleur que pour `agence web`, qui n'en reprend aucun mot.

**C'est un bug si :**
- une carte affiche « Score KPI », ou deux notes ;
- un « 0 » s'affiche là où l'infobulle dit que le score est indisponible ;
- « Total » diffère du chiffre de l'anneau.

**⚠ Défaut connu :** à la réouverture, un mot-clé étudié hors du Radar n'a plus de Score Marché, y compris dans l'avis de l'IA. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-4 — Les questions PAA d'une carte
**Exigences :** FR-CAP-PAA-JUDGE-HAIKU ⚠, FR-CAP-PAA-BADGE-SINGLE ⚠

**Gestes :**
1. Sur la carte `création site internet toulouse`, clique le petit triangle ▶ à gauche du mot-clé.
2. Survole la pastille d'une question, puis clique une question.
3. Reclique le triangle.

**Tu dois voir :**
- le triangle déplie la liste des questions, puis la replie, sans sélectionner la carte (pas de bordure bleue, pas de panneau) ;
- une seule pastille par question, issue du jugement de l'IA : verte « pertinent », orange « partiel » ou grise « hors-sujet », avec une courte justification en info-bulle ;
- l'indicateur « PAA » de la carte en note sur 100 (« n/100 ») ;
- un clic sur une question qui a une réponse déplie cette réponse ; une carte sans question affiche « Aucune PAA trouvee » ;
- en MOCK, les questions viennent du bac à sable : elles sont factices.

**C'est un bug si :**
- une question porte deux pastilles ;
- le triangle ouvre le panneau de détail ;
- un message d'erreur apparaît.

**⚠ Défaut connu :** le jugement de l'IA est calculé mais ni ses pastilles ni la note qu'il corrige n'atteignent la liste du Capitaine : tu vois les badges lexicaux du Radar (« Exact », « Match », « Partiel exact », « Partiel », « Hors sujet ») et « PAA » en « pts » ; la pastille de l'IA n'existe que dans l'ancien mode libre. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-5 — Le panneau de détail s'ouvre, se règle et se ferme
**Exigences :** FR-CAP-LIST-SIDEPANEL

**Gestes :**
1. Clique sur la ligne d'indicateurs (« vol », « KD »…) d'une carte. Sur un mot-clé de 3 mots ou plus, un clic sur les mots ne sélectionne pas : ils ont leur propre rôle (CAP-9).
2. Tire le bord gauche du panneau vers la gauche, puis vers la droite. Ferme avec « × », puis rouvre la même carte.
3. Panneau ouvert, clique une autre carte.
4. Clique dans une zone vide de la page, à gauche de la liste.
5. Avec la touche Tab, va sur une carte et appuie sur Entrée ; sur une autre, appuie sur Espace.
6. Survole puis clique l'anneau d'une carte non sélectionnée.

**Tu dois voir :**
- la carte cliquée entourée de bleu, et le panneau « Capitaine » ouvert à droite, sur toute la hauteur : le mot-clé et son badge de verdict, puis « KPIs marché », « Racines » et « Avis expert IA » ;
- le panneau qui s'élargit et se rétrécit, et qui rouvre à la largeur choisie ;
- un clic sur une autre carte met le panneau à jour, sans le fermer ;
- un clic dans le vide ferme le panneau ;
- Entrée et Espace sélectionnent la carte comme un clic ;
- l'anneau montre son infobulle sans sélectionner la carte.

**C'est un bug si :**
- le panneau ne s'ouvre pas, ou se ferme quand tu cliques une autre carte ;
- sa largeur ne se règle pas ;
- un clic sur l'anneau ou le triangle sélectionne la carte.

### CAP-6 — Les indicateurs marché du panneau, en lecture seule
**Exigences :** FR-CAP-KPIS-READONLY ⚠

**Gestes :**
1. Ouvre le panneau de `création site internet toulouse`. Lis la section « KPIs marché » et compare-la avec la ligne d'indicateurs de la carte.
2. Clique sur une valeur, puis essaie de la modifier au clavier.
3. Ouvre le panneau de `zqxw vitrine kvj`.

**Tu dois voir :**
- six lignes : « Volume » (« n rech/m »), « Difficulté » (un nombre), « CPC » (un prix, par exemple « 2.10 € »), « Intent » (le type d'intention que Google donne à la requête), « PAA » (« n questions ») et « Autocomplete » (« n matches ») ;
- « — » pour un volume, une difficulté ou un CPC absents, jamais « 0 » ;
- sous la liste : « Ces indicateurs alimentent le Score KPI affiché dans l'onglet Radar. » ;
- les mêmes valeurs que sur la carte, qui abrège les volumes (« 1.2k » pour 1 250) ;
- aucune valeur modifiable.

**C'est un bug si :**
- une valeur se modifie ;
- tu lis « NaN », « undefined » ou « null » ;
- le panneau et la carte donnent deux volumes, deux difficultés ou deux CPC différents.

**⚠ Défaut connu :** l'intention s'affiche « — » pour tout mot-clé étudié hors Radar ; la ligne « Autocomplete » montre tantôt un nombre de suggestions, tantôt une position (ici, la place du mot-clé dans les suggestions de Google, 0 s'il n'y est pas : `zqxw vitrine kvj` affiche « 0 matches »). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-7 — L'avis de l'IA sur un candidat
**Exigences :** FR-CAP-AI-PANEL ⚠

**Gestes :**
1. Ouvre le panneau d'`agence web`. En bas, lis l'en-tête « Avis expert IA » et la phrase dessous, puis clique l'en-tête pour le déplier.
2. S'il propose **« Analyser avec l'IA »**, note-le, puis clique ce bouton.
3. Clique **« Régénérer »**, puis **Annuler** dans la fenêtre du navigateur.
4. Clique encore **« Régénérer »**, puis **OK**.
5. En bas à gauche, clique la pastille qui compte les appels : le panneau « Coûts API » s'ouvre.

**Tu dois voir :**
- sous « Avis expert IA » : « Analyse Capitaine basée sur les KPIs marché et la pertinence. » ;
- l'avis déjà prêt, demandé d'office dès la fin de l'étude : replié, l'en-tête dit « Cliquez pour voir les suggestions IA. » ;
- déplié : le bandeau du verdict, puis le texte de l'avis ;
- la fenêtre « Régénérer l'avis expert IA ? Cela consommera un appel Claude. » ; « Annuler » ne change rien ; « OK » relance l'avis (le bouton affiche « Analyse en cours… », puis de nouveau « Régénérer ») ;
- dans « Coûts API », une ligne « Analyse IA capitaine » par avis demandé ;
- en MOCK, l'avis est un court texte simulé (« [Mock provider] Réponse simulée. … Fin de la réponse simulée. ») : ses trois parties se vérifient en RÉEL (CAP-R3).

**C'est un bug si :**
- l'avis n'a pas été demandé d'office : l'en-tête replié dit « Cliquez pour lancer l'analyse IA. » alors que l'étude est finie ;
- « Régénérer » relance sans rien demander, ou « Annuler » relance quand même ;
- l'avis reste vide, sans texte ni message d'erreur.

**⚠ Défaut connu :** l'avis n'est jamais enregistré et il est redemandé pour chaque candidat à chaque réouverture ; la stratégie du cocon n'est pas transmise. La réouverture se vérifie à la CAP-14. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-8 — Le verdict d'un candidat
**Exigences :** FR-CAP-SCAN ⚠

**Gestes :**
1. Pour trois candidats, ouvre le panneau : lis le badge à droite du mot-clé, puis le bandeau en tête de « Avis expert IA » (déplie-le ; s'il propose « Analyser avec l'IA », clique ce bouton).

**Tu dois voir :**
- un badge « GO », « ORANGE », « NO-GO » ou « GRAY », au même niveau que le bandeau ;
- le bandeau : une icône, le niveau, puis :
  - GO : « Signaux positifs — mot-clé viable. » ;
  - ORANGE : « Signaux mixtes — à étudier. · Signaux mixtes » ;
  - NO-GO : « KPIs insuffisants pour valider ce mot-clé. », puis la raison (« KPIs faibles — volume et difficulté défavorables. » ou « Hors sujet — pas de PAA ni de volume suffisant. ») ;
  - GRAY : « KPIs insuffisants pour valider ce mot-clé. · Données insuffisantes » ;
- le cadenas cliquable quel que soit le verdict : le verdict aide à décider, il ne bloque pas ;
- en MOCK, les volumes factices sont les mêmes pour tous : tu verras surtout GO ou ORANGE. Le NO-GO « Aucun signal détecté » se vérifie en RÉEL (CAP-R1).

**C'est un bug si :**
- le badge et le bandeau n'ont pas le même niveau ;
- une carte est « NO-GO » alors que son « vol » affiche « — » (sans volume mesuré, pas de NO-GO) ;
- le cadenas est grisé.

**⚠ Défaut connu :** dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-9 — Mots cliquables et racines d'un mot-clé long
**Exigences :** FR-CAP-ROOTS

**Gestes :**
1. Sur la carte `création site internet toulouse`, survole « création », « site », puis « toulouse ».
2. Clique « toulouse ». Attends la fin du voile « Validation… ».
3. Clique « internet ». Attends de nouveau.
4. Ouvre le panneau de la carte : lis la section « Racines ». Clique une racine.
5. Sur la carte, reclique « internet », puis « toulouse ».
6. Ouvre le panneau d'`agence web` : section « Racines ».
7. Les étiquettes : clique le bouton étiquette de la carte `création site internet toulouse` (sous le cadenas, info-bulle « Tagger manuellement les mots (local / persona) »), puis clique trois fois « internet ». Reclique le bouton pour sortir de ce mode.

**Tu dois voir :**
- « création » et « site » ne sont pas cliquables (info-bulle « Mot ancré dans la racine du capitaine — non modifiable ») ; « toulouse » est coloré comme terme local (info-bulle « Terme local — peu pris en compte dans les KPI. Alt+clic pour changer le tag. ») ;
- chaque clic grise le mot retiré, et la carte montre la combinaison restante, étudiée : « création site internet », puis « création site », chacune avec son propre Score Pertinence dans l'anneau ;
- dans « Racines » : les racines étudiées, chacune avec un petit anneau (info-bulle « Score Pertinence : n/100 · verdict … »), et « Moyenne n/100 » (vert à partir de 65, orange à partir de 40, rouge en dessous) ; un clic sur une racine l'affiche sur la carte ;
- à l'étape 5, la carte revient au mot-clé complet ;
- `agence web` (2 mots) : aucun mot cliquable, et « Aucune racine » ;
- les étiquettes : « internet » passe en local, puis en persona, puis sans étiquette ; les notes ne bougent pas, les étiquettes sont un simple repère ;
- racines d'office : si le volume d'un mot-clé de 3 mots ou plus n'est pas « vert » (moins de 1 000 recherches par mois pour un pilier, 200 pour un intermédiaire, 30 pour un spécialisé), ses racines sont étudiées dès son étude, sans clic. En MOCK, le volume factice est souvent vert : tu le verras en RÉEL (CAP-R4).

**C'est un bug si :**
- on peut retirer « création » ou « site », ou garder moins de 2 mots significatifs ;
- une combinaison ne montre pas ses propres indicateurs, ou reste sur « Validation… » ;
- la « Moyenne » ne correspond pas aux anneaux des racines notées (une racine « — » ne compte pas) ;
- afficher une combinaison ajoute une carte à la liste, ou remet des notes à « — ».

### CAP-10 — Verrouiller passe d'abord par la porte
**Exigences :** FR-CAP-LOCK-GATE

**Gestes :**
1. Ouvre **« Articles suggérés »** sans cliquer l'article enfant (un clic sur l'article sélectionné le désélectionne). Sur sa ligne, le 1er point du 2ᵉ groupe (info-bulle « Capitaine ») est vide, et son mot-clé est en pointillés. Referme.
2. Clique le cadenas (info-bulle « Verrouiller ») de la carte du mot-clé de l'article. Si une alarme s'ouvre, réponds-y (🟠 : coche « J’ai lu » ; 🔴 : une catégorie et une raison d'au moins 20 caractères), puis valide.
3. Clique le cadenas de `zqxw vitrine kvj`. Lis l'alarme, puis clique **« Revenir corriger »**.
4. Reclique ce cadenas, puis appuie sur Échap.

**Tu dois voir :**
- après l'étape 2 : la carte verrouillée (cadenas vert plein, info-bulle « Déverrouiller »), bordure verte, en tête de liste ; dans « Articles suggérés », le point « Capitaine » plein et le mot-clé en trait plein ;
- à l'étape 3 : l'alarme « Avant de verrouiller le capitaine », avec au moins le point 🟠 « Google ne suggère pas cette requête quand on commence à la taper. » et sa ligne « Le risque : … » ;
- si l'alarme montre aussi un point 🔴 ou un écart d'intention (selon les données factices), sous ce point « À la place : » propose au plus 5 autres candidats de l'article, écrits « mot-clé (n recherches/mois) », sans `zqxw vitrine kvj` ;
- après « Revenir corriger », puis après Échap : rien n'a changé. Le mot-clé de l'article reste verrouillé, `zqxw vitrine kvj` ne l'est pas, le point « Capitaine » reste plein.

**C'est un bug si :**
- `zqxw vitrine kvj` se verrouille sans alarme, alors que tu as internet ;
- après « Revenir corriger » ou Échap, un verrou a bougé ;
- « À la place : » propose le mot-clé testé lui-même, ou plus de 5 mots-clés.

### CAP-11 — Un seul Capitaine, et l'étape suit le verrou
**Exigences :** FR-CAP-LOCK-RADIO, FR-CAP-LOCK-GATE, FR-CAP-CHECK ⚠

**Gestes :**
1. Reclique le cadenas de `zqxw vitrine kvj`. Coche « J’ai lu » (et réponds aux éventuels 🔴), puis clique **« J’ai lu, je continue »** (ou **« Je prends la responsabilité et je continue »**).
2. Clique le cadenas vert de `zqxw vitrine kvj` pour le déverrouiller.
3. Clique l'onglet **Lexique**, puis reviens sur **Capitaine**. Regarde la ligne de l'article dans « Articles suggérés », sans la cliquer.
4. Tape `qzkw site vjx` et appuie sur Entrée. Clique son cadenas, puis **« Revenir corriger »**.
5. Reclique le cadenas de `zqxw vitrine kvj`.
6. Reverrouille le mot-clé de l'article.

**Tu dois voir :**
- étape 1 : `zqxw vitrine kvj` verrouillé et en tête ; le mot-clé de l'article déverrouillé dans le même geste : une seule carte verte ; le point « Capitaine » reste plein ;
- étape 2 : plus aucune carte verte, et aucune fenêtre (l'article enfant n'a pas de lieutenant verrouillé) ;
- étape 3 : l'onglet Lexique affiche « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. » ; le point « Capitaine » est vide ;
- étape 4 : l'alarme, puis, après « Revenir corriger », toujours aucune carte verte et le point vide ;
- étape 5 : pas d'alarme cette fois : ta réponse de l'étape 1 tient toujours, même si tu as exploré un autre candidat entre-temps ;
- étape 6 : le mot-clé de l'article verrouillé, sans alarme (tes réponses de la CAP-10 tiennent aussi), `zqxw vitrine kvj` déverrouillé, le point plein.

**C'est un bug si :**
- deux cartes vertes à la fois ;
- le point « Capitaine » plein alors qu'aucune carte n'est verrouillée, ou vide alors qu'une l'est ;
- l'alarme revient à l'étape 5.

**⚠ Défaut connu :** déverrouiller le Capitaine retire l'étape même quand l'enregistrement du déverrouillage a échoué. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-12 — Trier la liste ; le Capitaine reste en tête
**Exigences :** FR-CAP-LIST-SIDEPANEL, FR-CAP-SCORING-BIMODAL ⚠

**Gestes :**
1. Au-dessus de la liste, clique **« Score Pertinence »** trois fois, en regardant l'ordre après chaque clic.
2. Fais de même avec **« A-Z »**.
3. Sélectionne une carte non verrouillée ; dans le panneau, clique **« Aller à la carte verrouillée »**.

**Tu dois voir :**
- « Score Pertinence » : 1er clic, flèche ↓, de la note la plus haute à la plus basse ; 2ᵉ clic, ↑, de la plus basse à la plus haute ; 3ᵉ clic, ⇅, l'ordre d'arrivée ;
- l'ordre suit exactement les chiffres des anneaux ; les cartes « — » restent en bas, dans les deux sens ;
- « A-Z » : ↓ de Z à A, ↑ de A à Z, puis ⇅ l'ordre d'arrivée ;
- dans tous les cas, la carte verrouillée reste en tête, bordure verte ;
- « Aller à la carte verrouillée » sélectionne la carte verrouillée et fait défiler la liste jusqu'à elle ; ce bouton n'apparaît que si la carte sélectionnée n'est pas la verrouillée.

**C'est un bug si :**
- une carte « — » passe au-dessus d'une carte notée ;
- deux cartes sont dans le désordre par rapport à leurs anneaux ;
- la carte verrouillée quitte la tête de liste.

**⚠ Défaut connu :** à la réouverture, un mot-clé étudié hors du Radar n'a plus de Score Marché, y compris dans l'avis de l'IA. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-13 — Le verrou vise le mot-clé d'origine, même quand une racine est affichée
**Exigences :** FR-CAP-LOCK-INTEGRITY

**Gestes :**
1. Trie par **« Score Pertinence »** ↓ et repère la place de `création site internet toulouse`.
2. Sur cette carte, clique « toulouse » : l'anneau montre la note de « création site internet ». Si la carte est revenue au mot-clé complet, reclique « toulouse ».
3. Clique le cadenas de cette carte (réponds à l'alarme s'il y en a une).
4. Ouvre « Articles suggérés », sans cliquer l'article, et lis le mot-clé affiché pour l'article enfant. Referme.
5. Clique trois fois le cadenas de cette carte, en attendant chaque fois la fin (réponds aux alarmes s'il y en a).
6. Reclique « toulouse » pour revenir au mot-clé complet, puis reverrouille le mot-clé de l'article.

**Tu dois voir :**
- étape 2 : la carte garde sa place dans le tri, même si la note de la racine la classerait ailleurs ;
- étape 3 : c'est `création site internet toulouse` qui est verrouillé, pas la racine ; la carte passe en tête ;
- étape 4 : « création site internet toulouse », en trait plein ;
- étape 5 : toujours une seule carte `création site internet toulouse`.

**C'est un bug si :**
- la carte change de place quand la racine s'affiche ;
- une nouvelle carte « création site internet » apparaît dans la liste, ou toutes les notes passent à « — » ;
- la racine est verrouillée à la place du mot-clé ;
- une deuxième carte `création site internet toulouse` apparaît.

### CAP-14 — Rouvrir l'article : tout est retrouvé, sans doublon
**Exigences :** FR-CAP-PERSIST ⚠, FR-CAP-AI-PANEL ⚠, FR-CAP-LIST-SIDEPANEL, FR-CAP-LOCK-INTEGRITY

**Gestes :**
1. Note le nombre de cartes, la carte verrouillée, et « vol », « KD », « CPC » de deux cartes. Sélectionne une carte (panneau ouvert).
2. Dans « Articles suggérés », clique le pilier, puis de nouveau l'article enfant ; ouvre l'onglet **Capitaine**.
3. Ouvre « Coûts API » et clique **« Effacer »**. Recharge la page (F5). Rouvre l'article enfant, puis l'onglet **Capitaine** (le Moteur ouvre d'abord Lieutenants).
4. En bas de l'écran, l'invite « Charger Capitaine » propose un bouton « DB » suivi d'un nombre : clique-le.
5. Rouvre « Coûts API ».

**Tu dois voir :**
- étape 2 : aucune carte sélectionnée, panneau fermé ;
- étape 3 : tous tes candidats, chacun une seule fois ; le Capitaine verrouillé en tête, cadenas vert ; les mêmes « vol », « KD » et « CPC » qu'avant ;
- étape 4 : la liste ne change pas, aucun doublon ;
- étape 5 : chaque avis réaffiché sans nouvel appel, donc aucune nouvelle ligne « Analyse IA capitaine » ;
- à noter pour décision : les racines étudiées à la CAP-9 (« création site internet », « création site ») reviennent aussi comme cartes séparées. C'est le comportement actuel.

**C'est un bug si :**
- un candidat manque ou apparaît deux fois ;
- aucune carte verte alors que le point « Capitaine » de l'article est plein ;
- une mesure a changé (par exemple un « — » devenu « 0 »).

**⚠ Défaut connu :** la provenance radar / longue traîne / saisie n'est pas enregistrée ; un écran dont les mots-clés ne sont pas encore chargés peut envoyer un Capitaine vide et des listes vides, qui effacent les décisions enregistrées (défaut latent) ; déverrouiller en archivant les lieutenants envoie deux enregistrements concurrents. Et l'avis de l'IA n'est jamais enregistré : il est redemandé pour chaque candidat à chaque réouverture (une ligne « Analyse IA capitaine » par carte), sans la stratégie du cocon. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-15 — Les racines après réouverture
**Exigences :** FR-CAP-ROOTS

**Gestes :**
1. Ouvre le panneau de `création site internet toulouse` : section « Racines ».
2. Clique « création site internet » dans cette section.
3. Sur la carte, clique « toulouse », puis reclique-le.

**Tu dois voir :**
- les racines mesurées à la CAP-9, chacune avec son Score Pertinence, et « Moyenne n/100 » ;
- un clic sur une racine l'affiche sur la carte, avec ses indicateurs (« vol », « KD », « CPC ») et son verdict dans le panneau ;
- même chose en cliquant les mots de la carte ; le second clic sur « toulouse » ramène le mot-clé complet.

**C'est un bug si :**
- les racines n'ont plus de note (« — » partout) et « Moyenne » a disparu ;
- une racine mesurée à la CAP-9 s'affiche avec « — » partout et un verdict « GRAY ».

### CAP-16 — Le Score Pertinence ne change pas entre l'étude et la réouverture
**Exigences :** FR-CAP-RELEVANCE-LIVE ⚠, FR-CAP-RELEVANCE-INPUTS, FR-CAP-RELEVANCE-INTENT-SIGNAL

**Gestes :**
1. Reprends tes notes de la CAP-3. Pour `création site internet toulouse` et `agence web`, compare le chiffre de l'anneau et la ligne « Intent × Douleur » de l'infobulle. Regarde aussi `zqxw vitrine kvj`.
2. Survole l'anneau de `création site internet toulouse`, puis celui d'`agence web` : lis la ligne « Racines » et les poids.
3. Clique le bouton de recalcul de `création site internet toulouse` (flèche ronde, en bas de la colonne de boutons à gauche de la carte, info-bulle « Recalculer le score Pertinence pour ce mot-clé »), puis resurvole son anneau.

**Tu dois voir :**
- le même chiffre qu'à la CAP-3 pour chaque carte, et encore le même après le recalcul (c'est ce que l'exigence demande) ;
- « Intent × Douleur » identique avant et après la réouverture : 100 si Google donne à la requête l'intention attendue pour l'article, 50 si l'une des deux est inconnue, une valeur plus basse sinon ;
- `création site internet toulouse` : dès qu'une de ses racines a pu être notée, « Racines (20%) » avec une note, et les autres poids à « (30%) », « (25%) », « (15%) », « (10%) » : ses racines mesurées comptent ;
- `agence web` : toujours « Racines (0%) », et les poids « (38%) », « (31%) », « (19%) », « (13%) ».

**C'est un bug si :**
- « Intent × Douleur » change entre l'étude et la réouverture ;
- une note devient « 0 » au lieu de « — ».

**⚠ Défaut connu :** juste après une étude, la note affichée vient d'un autre calcul que celle de la réouverture : sans racines, avec les anciens signaux du Radar. Tu verras donc sans doute d'autres chiffres qu'à la CAP-3 (`zqxw vitrine kvj` avait une note, il affiche maintenant « — »), et le recalcul remettre « Racines (0%) ». Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-17 — Quand le Score Pertinence manque, l'infobulle dit pourquoi
**Exigences :** FR-CAP-RELEVANCE-UNAVAILABLE-REASON ⚠

**Gestes :**
1. Survole l'anneau de `zqxw vitrine kvj`, puis celui de `qzkw site vjx`.
2. Déplie leurs questions avec le triangle ▶.

**Tu dois voir :**
- un anneau gris « — », jamais « 0 » ;
- une raison qui colle à la carte :
  - si elle a des questions PAA : « Score Pertinence indisponible — aucune suggestion autocomplete trouvée. Relance la validation pour récupérer les suggestions depuis la SERP. » ;
  - si elle affiche « Aucune PAA trouvee » : « Score Pertinence indisponible — aucune question PAA trouvée pour ce mot-clé. Relance la validation pour récupérer les PAA depuis la SERP. ».

**C'est un bug si :**
- un « 0 » à la place de « — » ;
- la raison contredit la carte (« aucune question PAA » alors que des questions s'affichent) ;
- l'infobulle se contente de « Score Pertinence indisponible. ».

**⚠ Défaut connu :** l'échec de l'IA de jugement n'est jamais signalé ; une longue traîne est présentée comme « aucune question PAA » ; l'écran devine encore une raison quand le serveur n'en donne pas (tu le verras sur les cartes reçues du Radar, CAP-19). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-18 — Un mot-clé retapé dans une autre casse
**Exigences :** FR-CAP-INPUT, FR-CAP-LOCK-INTEGRITY

**Gestes :**
1. Note la note de la carte `agence web`.
2. Tape `AGENCE WEB` et appuie sur Entrée. Attends quelques secondes.
3. Recharge la page (F5), rouvre l'article enfant et l'onglet **Capitaine**.

**Tu dois voir :**
- aucune nouvelle carte : `agence web` est ré-étudié à sa place (son écriture peut passer en majuscules) ;
- sa note et celles des autres cartes toujours là ;
- après le rechargement, toujours une seule carte pour ce mot-clé.

**C'est un bug si :**
- une deuxième carte apparaît, maintenant ou après le rechargement ;
- la carte, ou d'autres, perdent leur note (« — ») ;
- le Capitaine verrouillé perd son cadenas vert.

### CAP-19 — Des candidats envoyés par le Radar
**Exigences :** FR-CAP-LIST-SIDEPANEL

**Gestes :**
1. Sur l'article enfant, ouvre l'onglet **Radar**. Dans « Ajouter un mot-clé à scanner… », ajoute `site vitrine artisan`, puis `prix site vitrine` (bouton **« + Ajouter »**).
2. Clique **« Lancer le scan »** et attends les cartes.
3. Coche ces deux cartes, puis clique **« Envoyer au Capitaine (2) »**.
4. Dans le Capitaine, attends la fin des études. Survole l'anneau d'une carte reçue.
5. Recharge la page (F5), rouvre l'article enfant et l'onglet **Capitaine**.

**Tu dois voir :**
- l'onglet Capitaine s'ouvre ; les deux mots-clés reçus passent par « Validation en cours... », puis montrent leurs indicateurs ;
- le Capitaine verrouillé de l'article reste en tête, cadenas vert ;
- une carte reçue affiche « — » jusqu'à la réouverture (limite connue), avec l'infobulle « Le point de douleur est défini, mais les signaux SERP n'ont rien produit. Relance la validation pour réessayer. » ;
- après le rechargement : les anciens candidats et les deux nouveaux, chacun une seule fois.

**C'est un bug si :**
- le Capitaine verrouillé disparaît de la liste, ou perd son cadenas vert, alors que le point « Capitaine » de l'article est toujours plein ;
- un mot-clé reçu disparaît de la liste avant le rechargement ;
- une carte apparaît deux fois.

### CAP-20 — Hors connexion : une étude qui échoue, des mesures récentes réutilisées
**Exigences :** FR-CAP-SCAN ⚠, FR-CAP-ROOTS

**Gestes :**
1. Coupe ta connexion internet (Wi-Fi ou câble). L'outil tourne sur ton poste : l'écran reste utilisable.
2. Tape `recette hors ligne` suivi de l'heure (par exemple `recette hors ligne 1542`), puis Entrée.
3. Tape `zqxw plomberie kvj` (le mot-clé absurde de l'étape 3 du parcours express, étudié sur le pilier), puis Entrée.
4. Sur la carte `création site internet toulouse`, clique « internet » seulement.
5. Rétablis ta connexion. Retape exactement le mot-clé de l'étape 2, puis Entrée.

**Tu dois voir :**
- étape 2 : la carte affiche « Erreur : » suivi d'un message (aujourd'hui en anglais : « Keyword validation failed ») ;
- étape 3 : la carte s'étudie normalement : ses mesures ont moins de 7 jours, l'outil les réutilise sans rien redemander à DataForSEO ni à Google (si le parcours express date de plus de 7 jours, passe) ;
- étape 4 : le message « Impossible de valider "création site toulouse" », et « internet » redevient actif. Si cette combinaison a déjà été mesurée récemment, elle s'étudie sans erreur : c'est normal ;
- étape 5 : la carte est étudiée et montre ses indicateurs.

**C'est un bug si :**
- une étude en échec affiche des « 0 » au lieu d'un message d'erreur ;
- l'étape 3 échoue ;
- après l'étape 5, la carte reste sur « Erreur : … ».

**⚠ Défaut connu :** dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-21 — Un article sans point de douleur
**Exigences :** FR-CAP-PAINPOINT-FALLBACK ⚠

**Gestes :**
1. Les articles de la recette ont tous une douleur. Dans le Moteur d'un autre cocon, cherche un article déjà travaillé au Capitaine dont le bouton de recalcul (flèche ronde sous le cadenas) est grisé. N'y étudie aucun nouveau mot-clé.
2. Survole un anneau, puis le bouton de recalcul.
3. Ouvre le panneau d'une carte.

**Tu dois voir :**
- toutes les cartes à « — », jamais « 0 » ;
- l'infobulle « Score Pertinence indisponible. Définis un point de douleur sur l'article et recharge l'onglet Capitaine pour obtenir le score. » ;
- le bouton de recalcul grisé, avec « Définis un point de douleur sur l'article pour pouvoir recalculer la Pertinence » ;
- dans le panneau, le verdict et les indicateurs marché toujours calculés ;
- si aucun article n'est sans douleur, note « non vérifiable » et passe.

**C'est un bug si :**
- une carte affiche une note ;
- le verdict ou les indicateurs marché disparaissent.

**⚠ Défaut connu :** juste après son étude, un mot-clé déjà scanné au Radar reçoit une note de pertinence même sans point de douleur ; et l'infobulle invite à définir une douleur que l'utilisateur ne peut saisir nulle part. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-22 — Déverrouiller un Capitaine qui a des Lieutenants
**Exigences :** FR-CAP-LOCK-RADIO

**Gestes :**
1. Dans « Articles suggérés », clique le pilier, puis l'onglet **Capitaine**.
2. Clique le cadenas vert du Capitaine. Lis la fenêtre, puis appuie sur Échap.
3. Reclique le cadenas, puis clique sur la zone sombre, hors de la fenêtre.
4. *(Facultatif, à faire en dernier : il faudra revalider la structure du pilier.)* Reclique le cadenas, puis **« Les garder »**. Ouvre l'onglet **Lieutenants**. Reviens sur **Capitaine** et reverrouille le même mot-clé. Dans l'onglet **Structure**, clique **« Valider la structure »**.

**Tu dois voir :**
- la fenêtre « Déverrouiller le Capitaine ? » : « Vous avez 1 lieutenant verrouillé pour « … ». », puis « Ils resteront valides pour le nouveau Capitaine sauf si vous choisissez de tout réinitialiser. Cliquez en dehors ou pressez Échap pour annuler. », et deux boutons, « Les garder » et « Tout réinitialiser » ;
- après Échap, puis après le clic à côté : la fenêtre fermée, le Capitaine toujours verrouillé ;
- étape 4 : le Capitaine déverrouillé et le lieutenant toujours retenu dans Lieutenants ; les points « Capitaine » et « Structure » se vident (la structure est bâtie sur le Capitaine), puis se remplissent après le reverrouillage et la validation ;
- « Tout réinitialiser » archiverait les lieutenants, avec le message « n lieutenant(s) archivé(s) » : ne le teste pas sur le pilier, il perdrait son lieutenant et sa dérogation.

**C'est un bug si :**
- le cadenas déverrouille sans fenêtre ;
- Échap ou le clic à côté déverrouille quand même ;
- « Les garder » fait disparaître le lieutenant.

## En mode RÉEL (payant)

Passe le bouton en **RÉEL**, travaille sur l'article enfant (sauf mention), et repasse en **MOCK** à la fin. Attention : au Capitaine, contrairement au reste de l'outil, aucun bouton n'annonce son coût avant l'appel ; la dépense se lit après, dans « Coûts API ». Chaque étude interroge DataForSEO (chaque racine étudiée d'office compte comme une étude), et chaque candidat déclenche un avis payant de l'IA, redemandé à chaque sélection de l'article, même si tu restes sur un autre onglet : garde peu de candidats.

### CAP-R1 — Un mot-clé sans demande : verdict NO-GO et alarme 🔴
**Exigences :** FR-CAP-AUTO-NOGO, FR-CAP-LOCK-GATE
**Mode :** RÉEL (payant)
**Gestes :**
1. Étudie deux ou trois mots-clés très rares mais réels, par exemple `plombier chauffagiste bourg madame nuit`.
2. Pour chacun, lis « vol » et « PAA » sur la carte, puis « Volume » et « Autocomplete » dans le panneau, et le badge de verdict.
3. Clique le cadenas de l'un d'eux, lis l'alarme, puis **« Revenir corriger »**.
4. Sur le pilier (intention attendue : informationnelle), étudie `agence web toulouse`, clique son cadenas, lis l'alarme, puis **« Revenir corriger »**.

**Tu dois voir :**
- un mot-clé mesuré à « 0 rech/m », « PAA 0.0 pts » et « 0 matches » : badge « NO-GO », et dans le bandeau « Aucun signal détecté — ce mot-clé n'existe pas dans les données. » ;
- un mot-clé dont le volume est « — » (jamais mesuré) : jamais ce NO-GO « Aucun signal » ;
- dans l'alarme, selon le cas : 🔴 « « … » : 0 recherche par mois selon DataForSEO. », 🔴 « Aucun volume de recherche mesuré pour « … ». », 🔴 « Le verdict du mot-clé est NO-GO : aucun signal de demande (volume, questions, suggestions). », 🟠 « Google ne suggère pas cette requête quand on commence à la taper. » ;
- sous chaque 🔴, « À la place : » : au plus 5 autres candidats de l'article, du plus recherché au moins recherché, sans ceux à 0 recherche ;
- le bouton « Je prends la responsabilité et je continue » grisé tant qu'un 🔴 n'a pas sa catégorie et sa raison de 20 caractères ;
- étape 4 : 🔴 « Google traite cette requête comme commerciale (on compare des prestataires), alors que l’article vise une intention informationnelle (on cherche à comprendre). » (ou « transactionnelle »), et après « Revenir corriger », le Capitaine du pilier inchangé.

**C'est un bug si :**
- un NO-GO « Aucun signal détecté » alors que le volume affiche « — » ;
- « À la place : » dans le désordre, ou avec un mot-clé à 0 recherche ;
- un mot-clé à 0 recherche se verrouille sans alarme.

### CAP-R2 — Des mesures récentes ne sont pas repayées
**Exigences :** FR-CAP-SCAN ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Ouvre « Coûts API » et note la dépense de la ligne « DataForSEO PROD ».
2. Étudie un mot-clé neuf. Attends 15 secondes et note la nouvelle dépense.
3. Retape ce même mot-clé et appuie sur Entrée. Attends 15 secondes.
4. Recommence les étapes 2 et 3 avec un mot-clé rare dont « Volume », « Difficulté » ou « CPC » affiche « — ».

**Tu dois voir :**
- étape 2 : la dépense augmente ;
- étape 3 : elle ne bouge pas : les mesures de moins de 7 jours sont réutilisées ;
- étape 4 : au second passage, elle ne bouge pas non plus.

**C'est un bug si :**
- la dépense augmente au second passage, à l'étape 3 ou à l'étape 4.

**⚠ Défaut connu :** dans le verdict, l'indicateur d'intention note la certitude de DataForSEO, pas le type d'intention. Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-R3 — L'avis de l'IA, en trois parties
**Exigences :** FR-CAP-AI-PANEL ⚠
**Mode :** RÉEL (payant)
**Gestes :**
1. Étudie un mot-clé neuf. Ouvre aussitôt son panneau et déplie « Avis expert IA ».
2. Lis l'avis terminé.
3. Ouvre « Coûts API ». Recharge la page, rouvre l'article enfant et l'onglet **Capitaine**, puis regarde de nouveau « Coûts API ».

**Tu dois voir :**
- le texte qui s'écrit petit à petit ;
- trois parties : « Potentiel éditorial », « Opportunités et risques », « Recommandation » ;
- un avis en français, qui parle du mot-clé, du type d'article et de sa douleur, sans citer les notes chiffrées ;
- dans « Coûts API », une ligne « Analyse IA capitaine » avec son modèle et son coût ;
- après le rechargement, l'avis réaffiché sans nouvelle ligne payante.

**C'est un bug si :**
- l'avis est vide, en anglais, ou sans ses trois parties ;
- il cite les notes brutes (« 72/100 »).

**⚠ Défaut connu :** l'avis n'est jamais enregistré et il est redemandé pour chaque candidat à chaque réouverture (une ligne payante par carte) ; la stratégie du cocon n'est pas transmise (l'avis n'en parle jamais). Si tu vois le comportement attendu, le défaut a peut-être disparu : note-le.

### CAP-R4 — Les racines d'un mot-clé peu cherché sont étudiées d'office
**Exigences :** FR-CAP-ROOTS
**Mode :** RÉEL (payant)
**Gestes :**
1. Étudie `création site vitrine artisan plombier toulouse`.
2. Sans cliquer ses mots, ouvre son panneau : section « Racines ».

**Tu dois voir :**
- si son volume est sous le seuil vert de l'article (200 recherches par mois pour un intermédiaire, 30 pour un spécialisé) : les racines s'étudient seules, au plus 5, chacune un début du mot-clé d'au moins 2 mots significatifs (de « création site vitrine artisan plombier » à « création site ») ;
- chacune avec son anneau, et « Moyenne n/100 » ; une racine en échec marquée « (échec) ».

**C'est un bug si :**
- aucune racine alors que le volume est sous le seuil ;
- une racine n'est pas un début du mot-clé, ou plus de 5 racines.

## Hors recette

| Exigence | Pourquoi elle ne se vérifie pas à l'écran |
|---|---|
| FR-CAP-RELEVANCE-MEMOIZATION | Règle interne de calcul : pendant un même calcul, une racine partagée par plusieurs candidats n'est évaluée qu'une fois, et rien n'est gardé ensuite. Les notes affichées sont les mêmes avec ou sans ce partage ; seule la vitesse change. |
| FR-CAP-PAA-JUDGE-CACHE-SESSION | Les jugements de l'IA sur les questions PAA n'arrivent pas encore à l'écran (défaut vu à la CAP-4), et leur appel ne laisse aucune ligne dans « Coûts API ». Rien, à l'écran, ne montre s'il est relancé ou gardé en mémoire ; seul l'onglet Réseau des outils du navigateur le montre. |
| FR-CAP-NO-PAINPOINT-WATCHER | Le point de douleur d'un article ne se modifie nulle part à l'écran : on ne peut pas provoquer « la douleur change pendant la visite de l'onglet ». |
