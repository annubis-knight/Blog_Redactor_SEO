---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Rédaction

## Rédaction

La Rédaction est la dernière partie du parcours : elle transforme un article préparé au Moteur en texte publiable. L'article arrive avec son **capitaine** (le mot-clé principal, verrouillé), ses **lieutenants** (mots-clés secondaires), son **lexique** (termes du métier à placer) et sa **structure** (les titres H1, H2, H3 validés).

On y entre de trois façons :
- depuis la page « Rédaction » d'un cocon (un groupe d'articles liés autour d'un même sujet) : fil d'Ariane « Dashboard / Silo / Cocon / Rédaction », rappel de la stratégie du cocon (cible, douleur, angle, promesse, appel à l'action), récapitulatif des articles suggérés et publiés, puis la liste des articles ; une carte ouvre la **rédaction guidée** de l'article ;
- depuis l'arbre du Cerveau (« Le rédiger ») ;
- par l'adresse de l'**éditeur** d'un article (l'éditeur libre, hors parcours).

Deux vues se partagent le travail :

| Vue | Rôle | Particularités |
|---|---|---|
| Rédaction guidée | Brief, sommaire, premier jet, enrichissement | Deux étapes ; affiche le texte sans l'éditer ; panneau « IA Brief » |
| Éditeur | Relecture, retouches à la main, aperçu, export | Éditeur en trois zones ; actions sur sélection ; panneau « Blocs » ; enregistrement automatique |

Le travail suit cet ordre : brief et sommaire → premier jet (jugé par sa porte) → enrichissement par passes → retouches → maillage → publication (jugée par sa porte) → export.

Une **porte** est un contrôle qualité qui juge l'article avant une étape. Chaque alerte a un niveau : ⛔ défaut technique (à corriger, jamais dérogeable), 🔴 risque (on peut passer outre en écrivant pourquoi : une catégorie et au moins 20 caractères), 🟠 attention (une case « J'ai lu » suffit). Quand une porte refuse, une **alarme** s'ouvre (« Avant de publier », « Avant d’accepter le premier jet ») : l'utilisateur choisit « Revenir corriger » ou déroge ; tant qu'un ⛔ reste, le bouton affiche « Correction nécessaire » et reste grisé. Le mécanisme commun des portes est décrit dans [Infrastructure transversale](16-infrastructure.md).

### Les deux étapes de la rédaction guidée
*Exigences : FR-RED-GEN-UNLOCK*

La barre de navigation affiche deux étapes : « Brief & Structure », puis « Article ».
- Tant que le Cerveau du cocon n'est pas terminé (« Terminer le brainstorm », après ses six étapes « Cible », « Douleur », « Angle », « Promesse », « CTA », « Articles »), et à défaut d'une stratégie d'article complète (celle du mode automatique), l'étape « Article » est verrouillée dans la barre, avec l'indication « Complétez le Cerveau pour générer cet article ».
- Le verrou se lève dès que la stratégie complète est chargée, sans rechargement.
- **Écart connu :** « Valider le sommaire » et « Continuer vers l'Article », dans la page, ouvrent l'étape « Article » sans vérifier le Cerveau.
- L'éditeur libre n'a pas ce verrou.

### Étape 1 — Brief & Structure
*Exigences : FR-RED-OUTLINE, FR-RED-WORD-COUNT-TARGET*

L'étape rassemble ce que la rédaction va utiliser, en quatre blocs repliables.

| Bloc | Contenu | Gestes |
|---|---|---|
| « Contexte strategique » | Thème, silo, cocon, articles du cocon, stratégie du cocon, configuration du client ; « Micro-contexte article » | Saisir « Angle differenciant » (requis), « Ton / Style » et « Consignes specifiques » (optionnels), enregistrés en quittant le champ (« Sauvegarde » s'affiche) ; « Suggerer par IA » propose les trois champs, avec aperçu « Appliquer » / « Annuler » si des champs étaient déjà remplis |
| « Mots-cles » | Mots-clés du cocon et décisions de l'article (capitaine, lieutenants, lexique) | Voir [Moteur — Lexique](11-lexique.md) (« Le lexique hors de l'onglet ») |
| « Recommandation de contenu » | Fourchette « min – max mots » (±20 % autour de la cible), « Cible : N », « Base : ~N mots (type …) » | « − » et « + » ajustent la cible de 100 mots (entre 500 et 10 000) ; « Reinitialiser » revient à la recommandation ; la cible choisie est enregistrée pour l'article |
| « Structure / Sommaire » | Le sommaire de l'article | Voir ci-dessous |

**Le sommaire.** Il est tiré de la structure validée au Moteur, sans appel à l'IA :
- un H1 (celui de la structure, qui porte le capitaine ; à défaut le titre de l'article) ;
- une « Introduction », puis les chapitres (H2) et sous-parties (H3) dans l'ordre, puis une « Conclusion » ; introduction et conclusion ne sont pas ajoutées si la structure en porte déjà une ;
- jamais de niveau au-delà de H3 : un second H1 devient H2.

Chaque ligne montre son niveau, son titre, son annotation (« Sommaire », « Contenu valeur », « Rappel », « Answer Capsule ») et son statut (« Suggestion IA », « Contenu généré »). Avant validation, l'utilisateur peut :
- renommer un titre (double-clic ou ✎ ; Entrée valide, Échap annule) ;
- supprimer une section, ajouter un H2 ou un H3 après une section (« + Ajouter H2 », « + Ajouter H3 » en fin de liste) ;
- réordonner par glisser-déposer (le H1 ne bouge pas).

Les boutons Annuler / Rétablir sont affichés mais **ne s'activent jamais** (écart connu).

« Valider le sommaire » enregistre le sommaire (« Sommaire valide et sauvegarde. ») et passe à l'étape « Article » ; « Modifier le sommaire » le rouvre ; « Continuer vers l'Article » passe à l'étape suivante. Un sommaire validé survit au rechargement.

Sans sommaire enregistré, le bloc affiche : « Aucun sommaire disponible. Retournez au Moteur pour générer et valider les lieutenants avec leur structure Hn. » (le sommaire naît en fait à la validation de l'onglet Structure du Moteur). L'écran ne génère pas de sommaire par IA ; seul le mode automatique le fait, pour un article sans structure.

### Le panneau « IA Brief »
*Exigences : FR-RED-BRIEF, FR-RED-IA-BRIEF*

Dans la rédaction guidée seulement, le bouton « IA Brief » ouvre une analyse stratégique du brief, utilisable avant que l'article existe.
- À la première ouverture du panneau dans la page, l'analyse part d'elle-même. « Relancer l'analyse » en redemande une nouvelle ; pendant l'analyse, le bouton affiche « Analyse en cours... » et reste grisé.
- Le texte s'affiche au fil de l'écriture, mis en forme, sous le titre « Analyse IA du Brief ». Il suit quatre parties : intention de recherche et positionnement, analyse de la structure, stratégie de contenu par section, points d'attention (extrait optimisé pour Google, cannibalisation, densité, appel à l'action).
- L'analyse reçoit le titre, le mot-clé principal (le capitaine, à défaut le mot-clé suggéré, à défaut le titre ; un capitaine enregistré vide ne compte pas), le type, le cocon, les lieutenants, le lexique, la structure, l'angle éditorial, les questions « Autres questions posées » de Google, les cinq premiers résultats de Google et les titres des autres articles du cocon.
- Les données de Google portent sur le mot-clé de l'article (capitaine verrouillé, à défaut mot-clé suggéré). Sans mot-clé, il n'y en a aucune.
- Sans analyse affichée, le panneau dit : « Cliquez sur "Relancer l'analyse" pour générer une analyse IA. »
- L'analyse n'est pas enregistrée : un rechargement la perd. Une analyse refusée ou interrompue le dit dans le panneau : « L’analyse n’a pas abouti : … ».

### Étape 2 — Le premier jet
*Exigences : FR-RED-DRAFT-SINGLE-PASS, FR-RED-GEN-SAUVEGARDE-AU-FIL, FR-RED-DRAFT-TO-SOURCE, FR-RED-META-CAPTAIN*

**Lancer.** « Générer l'article » apparaît quand un sommaire validé existe et que l'article n'a pas de texte (dans l'éditeur : dès qu'un sommaire existe). Une fois le texte écrit, « Régénérer l'article » relance un premier jet complet, sans confirmation : l'ancien texte est remplacé.

**Ce que l'IA reçoit, en un seul appel.** Le sommaire (chapitres, sous-parties, annotations), la longueur visée et la part de chaque chapitre, la stratégie de l'article (à défaut celle du cocon), le capitaine et les lieutenants, l'angle éditorial, les règles du type d'article et l'état du cocon (un chapitre dont le sujet a son propre article le résume et y renvoie ; un article né d'une section de son parent développe ce qu'elle annonce sans la répéter). Pas de recherche web.

**La part de chaque chapitre** :

| Nombre de chapitres (H2) | Répartition |
|---|---|
| 1 | toute la longueur |
| 2 | 40 % puis 60 % |
| 3 et plus | 15 % pour le premier, 10 % pour le dernier, le reste à parts égales |

Le chapeau (le texte sous le H1, avant le premier H2) compte dans le premier chapitre.

**Consignes du premier jet :** un H1 qui reprend le titre et intègre le capitaine ; un chapeau de deux ou trois phrases qui cite le capitaine ; chaque chapitre dans l'ordre à 15 % près de sa part ; une seule conclusion ; 100 % français ; pas de répétition ; aucun chiffre inventé.

**Pendant l'écriture.** La barre affiche « Section n/N » et le titre du chapitre en cours ; le texte apparaît au fil, avec un curseur. À la fin de chaque chapitre, le texte déjà reçu est enregistré (sans la méta) : un onglet fermé ne fait pas tout perdre. Si la réponse de l'IA est coupée à sa longueur maximale, la rédaction reprend au début du chapitre interrompu, deux fois au plus ; pendant une reprise, le texte affiché garde le début du chapitre coupé jusqu'à la fin. Il n'y a pas de bouton pour arrêter la rédaction.

**Chiffres « à sourcer ».** Le premier jet ne doit écrire aucun chiffre qu'il ne peut garantir ; il pose à la place un marqueur surligné « [à sourcer : ce qu'il faudrait trouver] ». Si l'IA écrit malgré tout une phrase chiffrée sans source, l'outil la transforme en passage « à sourcer » (la phrase entière entre crochets, surlignée). Compte comme chiffre : un pourcentage, un montant en euros, « n fois », des millions ou milliards. Une phrase qui attribue le chiffre (« selon », « d'après », « source : ») et un nombre ordinaire (« 3 étapes », « en 2026 ») ne comptent pas. Une statistique en toutes lettres ou une attribution vague échappent au contrôle.

**À la fin.** Le texte final, nettoyé (blocs coupés réparés, texte hors paragraphe retiré, paragraphes gardés), remplace les enregistrements au fil. Puis, dans l'ordre : texte enregistré → méta générée → texte et méta enregistrés → étape « premier jet accepté » demandée à la porte. La longueur réellement visée devient la longueur retenue de l'article. Le coût de chaque appel et les modèles utilisés (reprises comprises, dans l'ordre) apparaissent dans la pile d'activité (« Premier jet ») et dans les badges de coût.

**Pannes.** Avant le premier morceau de texte, l'outil réessaie puis passe au fournisseur d'IA suivant. Une panne en cours d'écriture arrête le premier jet ; ce qui a été enregistré au fil reste, et le message de la panne s'affiche, dans la rédaction guidée comme dans l'éditeur (de même pour l'échec de la méta, d'une réduction ou d'une humanisation). Le message n'a pas de bouton « Réessayer » : relancer la rédaction referait tout l'article, et le ferait payer, pour une simple réduction ratée ; chaque geste se relance par son propre bouton.

**Le texte dans la rédaction guidée** s'affiche en lecture seule, avec le rappel du sommaire (ses titres seulement), la méta, les coûts et la barre de mots. « Éditer l'article » ouvre l'éditeur ; « Revoir le Brief » revient à l'étape 1.

### La porte « accepter le premier jet »
*Exigences : FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE*

Après le premier jet et sa méta, l'étape « premier jet accepté » est demandée à la porte. Si la porte passe, l'étape est accordée ; sinon l'alarme « Avant d’accepter le premier jet » s'ouvre. Un article dont le premier jet est accepté compte comme rédigé : il peut donner naissance à ses articles enfants dans le cocon (voir [Cerveau](04-cerveau.md)).

La porte juge le texte **enregistré** :

| Niveau | Alerte |
|---|---|
| ⛔ | Texte vide, bloc coupé en pleine phrase, IA qui parle d'elle-même, texte hors paragraphe, reste de mise en forme, balise interdite, titre vide, saut de niveau de titre, plusieurs H1 |
| ⛔ | Pas de H1 |
| 🔴 | H1 qui ne contient pas le capitaine en entier |
| 🔴 | Introduction (le chapeau, à défaut les 100 premiers mots) qui reprend moins des trois quarts des mots du capitaine |
| 🔴 | Longueur totale à plus de 15 % de la longueur visée, dans un sens ou dans l'autre |
| 🔴 | Chapitre sous la moitié ou au-delà d'une fois et demie de sa part, nommé dans l'alerte |
| 🔴 | Chaque phrase où l'anglais domine, chaque paragraphe qui en répète un autre, chaque chiffre sans source hors marqueur, chaque chiffre invérifiable : une alerte par occurrence |

Un bandeau, dans les deux vues, dit où en est l'étape :
- « ✓ Premier jet accepté : l’article peut donner naissance à ses articles enfants dans le cocon. » ;
- sinon « Premier jet pas encore accepté : les articles enfants de celui-ci ne peuvent pas être créés. » et le bouton « Valider le premier jet », qui redemande l'étape (après une correction, ou pour déroger).

Quand la méta échoue, l'étape n'est pas demandée d'office : le bandeau permet de la demander. La porte du premier jet n'est pas rejouée à la publication, et ses dérogations n'y sont pas réaffichées.

### La méta
*Exigences : FR-RED-META, FR-RED-META-CAPTAIN*

Juste après le premier jet, sans second clic, l'outil génère le **meta title** (le titre affiché par Google) et la **meta description** (l'extrait sous le titre), à partir du texte et du capitaine de l'article (à défaut, du titre).
- Le meta title tient en 60 caractères, la description en 160. Si l'IA dépasse, l'outil garde la dernière phrase complète quand elle occupe au moins la moitié de la place, sinon s'arrête au dernier mot et retire un mot orphelin final (« en », « de »…). Jamais de points de suspension.
- La méta s'affiche (« Meta SEO », « Meta Title » n/60, « Meta Description » n/160, compteur en alerte au-delà), en lecture seule dans les deux vues.
- Si la méta échoue, le texte reste enregistré.
- **Écarts connus :** la méta ne se modifie pas à l'écran, et rien ne relance la seule méta (régénérer relance tout l'article).

### La longueur visée
*Exigences : FR-RED-WORD-COUNT-TARGET*

Une seule longueur visée sert partout : barre de mots, bouton « Réduire », score SEO, premier jet et sa porte.
- C'est la longueur choisie pour l'article au brief ; sinon la recommandation (calculée à l'ouverture d'après les concurrents, la structure et le type ; à défaut, la longueur type : 2 500 mots pour un pilier, 1 800 pour un intermédiaire, 1 200 pour un spécialisé).
- Changer la cible au brief est suivi aussitôt. Après un premier jet, l'écran garde la longueur que la rédaction a réellement visée, même si une nouvelle recommandation arrive.
- Sans longueur choisie, la rédaction enregistre la longueur qu'elle a visée pour l'article (sans jamais écraser un choix).
- La rédaction guidée affiche « N mots / N cible » avec une jauge (verte à partir de 80 % de la cible, orange en dessous). Quand l'article est trop long, l'écart apparaît sur le bouton « Réduire (-N mots) ».

### Réduire, humaniser, relire la langue
*Exigences : FR-RED-REDUCE-SECTION, FR-RED-HUMANIZE-SECTION, FR-RED-LANG-REVIEW*

Trois opérations reprennent l'article section par section (le chapeau, intitulé « Introduction », puis chaque H2). Une seule opération à la fois : pendant l'une, les autres sont grisées.

| | « Réduire l'article » | « Humaniser l'article » / « Relecture de la langue » |
|---|---|---|
| Disponible | Texte présent et longueur au-delà de 115 % de la cible | Texte présent |
| Ce que fait l'IA | Condense chaque section vers une cible proportionnelle à son poids, en gardant le sens, le ton, le capitaine | Retire les tics d'écriture d'IA ; traduit les phrases anglaises, remplace les anglicismes (« lead » → « prospect »), corrige accords et typographie française ; ne touche ni chiffres, ni liens, ni marqueurs « à sourcer » |
| Progression | « Réduction n/N — titre » | « Humanisation n/N — titre » dans la barre d'actions ; « Relecture n/N — titre » dans le panneau Enrichir |
| Arrêt | « Annuler réduction » rend l'article d'avant | « Annuler humanisation » ou « Arrêter » rend l'article d'avant |
| Section en échec | Reste telle quelle | Reste telle quelle (après un second essai à consignes renforcées si la structure n'était pas préservée) |
| Fin | Texte remplacé et enregistré | Texte remplacé et enregistré ; si la structure globale a changé, retour à la version précédente avec le message « La structure de l'article a été altérée par l'humanisation. Retour à la version précédente. » |

La relecture ne reçoit pas la stratégie de l'article ; la réduction reçoit la seule stratégie de l'article, souvent vide. **Écart connu :** les sections revenues à leur texte d'origine ne sont signalées nulle part. La relecture corrige sans lister ses corrections ; à la publication, seules les phrases d'au moins six mots où l'anglais domine sont repérées.

### Le panneau « Enrichir »
*Exigences : FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE, FR-RED-LANG-REVIEW*

Dans les deux vues, « Enrichir » ouvre le panneau « Enrichir l’article » : « Chaque passe propose une nouvelle version, chapitre par chapitre. Rien ne change dans l’article tant que vous n’acceptez pas. » Le bouton est grisé sans texte (« Rédigez le premier jet pour l’enrichir ») ; les passes sont grisées sans capitaine verrouillé (« Le capitaine de l’article n’est pas verrouillé : les passes en ont besoin. ») ou pendant une autre opération.

**Les passes**

| Passe | Chapitres visés | Ce qui est proposé | Rien à faire |
|---|---|---|---|
| « Sources » | Ceux (chapeau compris) qui portent un marqueur « à sourcer » ou un chiffre sans source | Chaque marqueur devient une phrase qui cite la source, son année et un lien vers la page trouvée ; sans source fiable, le marqueur reste | « Aucun passage à sourcer ni chiffre sans source : rien à chercher. » |
| « Exemples » | Le corps : ni chapeau, ni FAQ, ni dernier chapitre | Un exemple en situation, fictif et présenté comme tel, de 40 à 90 mots, sans chiffre | « Aucun chapitre à enrichir. » |
| « Tableaux » | Le corps | Un tableau (ligne d'en-tête, 2 à 4 colonnes, aucun chiffre nouveau) seulement quand le chapitre compare ou énumère | « Aucun chapitre à enrichir. » |
| « Images » | Le corps | L'emplacement d'une image et son texte alternatif ; l'image est une place neutre « à fournir » | « Aucun chapitre à enrichir. » |
| « FAQ » | Un seul chapitre « Questions fréquentes », inséré avant le dernier chapitre (à la fin si l'article a moins de deux chapitres) | Autant de questions que le type le prévoit (4 à 6 pour un pilier, 3 à 5 pour un intermédiaire, 3 à 4 pour un spécialisé ; 3 à 6 pour un type inconnu), au moins une avec le capitaine, réponses de 40 à 80 mots sans chiffre | « L’article a déjà sa foire aux questions. » |
| « Résumer » | Les chapitres dont est né un article enfant | Un résumé de 150 à 250 mots ; le titre reste, les sous-parties partent ; une dernière phrase invite à lire l'article enfant, sans poser le lien | « Aucun chapitre n’a encore donné naissance à un article : rien à résumer. » |

Chaque passe voit l'article entier (jusqu'à 30 000 caractères de texte, environ 4 500 mots) et la stratégie de l'article, à défaut celle du cocon. Elle traite ses chapitres l'un après l'autre : « Chapitre n/N — titre », avec « Arrêter ». Lancer une passe (ou une réécriture, ou la relecture) remplace la liste des propositions précédentes.

**La recherche web de la passe Sources** part de France, à l'heure de Paris, depuis la ville de la zone du client quand elle est configurée ; la consigne donne la date du jour et fait préférer une source locale, puis française, récente (organismes publics, études reconnues, presse économique). Trois recherches au plus par chapitre. Seul Claude sait chercher : sans lui, la passe échoue sur le chapitre avec le message du fournisseur, ou « La recherche web exige Claude : aucun autre fournisseur ne sait chercher et citer ses sources. ». Les sources trouvées sont listées (« Sources trouvées : »), et s'ouvrent dans un nouvel onglet.

**La vérification de chaque proposition**

| Niveau | Alerte | Effet |
|---|---|---|
| ⛔ | Proposition vide ; coupée (l'IA s'est arrêtée avant une fin normale) ; titres du chapitre modifiés (H1 du chapeau compris) ; bloc ou lien posé à la main perdu ; tableau sans en-tête ; image sans texte alternatif ; FAQ sans H2 ou sans questions en H3 | « Accepter » grisé (« Un défaut ⛔ empêche d’accepter cette proposition. ») |
| 🔴 | Lien absent des résultats de la recherche (retiré, texte gardé) ; chiffre sans source ajouté ; phrase non française ajoutée ; question de FAQ sans « ? » ; résumé hors de 150 à 250 mots | Signalé |
| 🟠 | Passage « à sourcer » qui reste après Sources ; proposition identique au texte ; nombre de questions de FAQ hors de la fourchette du type | Signalé |

Pour la passe Résumer, les sous-parties peuvent partir et un bloc perdu n'est qu'une attention 🟠 (« Vérifiez que ce contenu a sa place dans l’article enfant avant d’accepter le résumé. »).

**Relire et décider.** Chaque carte montre le chapitre, son statut (« en attente », « proposition en cours… », « à relire », « échec », « acceptée », « refusée », « chapitre modifié depuis »), les alertes avec leur risque, les sources, et « Comparer avant / après ».
- « Accepter » remplace ce seul chapitre (la FAQ s'insère) et enregistre l'article aussitôt ; « Refuser » ne touche à rien.
- « Accepter celles sans alerte » (dès que plus d'une proposition est prête) accepte d'un coup les propositions sans aucune alerte.
- Un chapitre modifié depuis la proposition n'est pas écrasé : « Le chapitre a changé depuis cette proposition : relancez la passe pour ne rien écraser. » Pour la FAQ : « Une foire aux questions existe déjà dans l’article : celle-ci n’est pas ajoutée. » ou « Le chapitre avant lequel la FAQ s’insère a changé : relancez la passe pour ne rien écraser. »
- Un chapitre en échec affiche son erreur ; la passe continue avec les suivants.
- Dès qu'une image est acceptée : « Chaque image acceptée est une place « image à fournir » : dans l’éditeur, cliquez dessus puis sur le bouton Image 📷 pour donner son adresse et son texte alternatif. La publication la refuse tant qu’elle n’est pas remplacée. »

**« Réécrire un chapitre ».** L'utilisateur choisit un chapitre (le chapeau s'appelle « Introduction »), écrit une consigne d'au moins 5 caractères (600 au plus ; exemple affiché : « plus concret, avec l’exemple d’un plombier ; deux fois plus court ») et clique « Proposer une réécriture ». La réécriture voit l'article entier et la stratégie ; elle garde le titre du chapitre (et le H1 pour le chapeau), peut revoir les sous-titres si la consigne le demande, vise la longueur actuelle à 20 % près sauf consigne contraire, garde blocs, liens et marqueurs, n'invente aucun chiffre. La consigne est traitée comme du texte : elle ne peut pas changer le rôle de l'IA. La proposition est vérifiée et acceptée comme celles des passes.

**« Relecture de la langue ».** Le même traitement que « Humaniser l'article » (voir plus haut), appliqué directement puis enregistré.

> **En situation.** L'utilisateur lance « Tableaux » sur son pilier. Quatre chapitres du corps passent à tour de rôle ; « Agence ou indépendant ? » reçoit un tableau à deux colonnes, les trois autres reviennent inchangés (🟠). Il compare, accepte le tableau : seul ce chapitre change, et l'article est enregistré.

### L'éditeur
*Exigences : FR-RED-EDITOR-TIPTAP*

L'éditeur s'ouvre par « Éditer l'article » (rédaction guidée) ou par son adresse. Son en-tête porte « ← Retour » (vers la rédaction guidée), l'état d'enregistrement, la barre des panneaux, « Supprimer le contenu », « Sauvegarder » et « Visualiser l'article ».

**Un article à la fois.** Ouvrir un article, dans l'éditeur comme dans la rédaction guidée, n'affiche que son texte, sa méta et son sommaire, même juste après un autre sans recharger la page : rien du précédent ne reste à l'écran, ne s'enregistre dans celui-ci, ni ne réécrit le score du précédent.

**Trois états.** Sans texte : « Aucun contenu. Générez l'article ou retournez au workflow. », avec « Générer l'article » (si un sommaire existe) et « Retour au workflow ». Pendant la rédaction : le texte au fil, en lecture seule, avec « Section n/N ». Avec du texte : l'éditeur, précédé de la barre d'actions (régénérer, réduire, humaniser), du bandeau « premier jet » et de la barre d'outils. La méta et la table des matières sont repliées au-dessus.

**Trois zones** repliables : « Introduction » (le chapeau et un chapitre d'introduction), « Corps de l'article », « Conclusion » (le dernier chapitre de conclusion). Une zone vide à l'ouverture n'est pas affichée. Modifier une zone ne touche pas les autres ; l'article enregistré est la réunion des trois.

**Barre d'outils :** gras, italique, H2, H3, liste à puces, liste numérotée, citation, lien (demande l'adresse), image, annuler, rétablir. La mini-barre de sélection propose gras, italique, lien et « ✦ » (actions IA).

**Le bouton « Image »** (« Remplacer l’image » sur une image sélectionnée, sinon « Insérer une image ») demande l'adresse (« https://… » ou « /… » ; celle de l'image sélectionnée est proposée, sauf une place « à fournir »), puis le texte alternatif (celui de l'image est proposé). Une autre adresse est refusée : « Adresse refusée : elle doit commencer par https:// ou par / (un fichier du site). » Un texte alternatif vide aussi : « Sans texte alternatif, l’image n’est pas posée : décrivez ce qu’elle montre. » L'image s'indique par son adresse : l'éditeur n'envoie pas de fichier. Aucun tableau ne s'insère à la main.

**Ce qui est préservé** à l'enregistrement et au rechargement : blocs « contenu valeur », « rappel », « capsule de réponse », liens internes, marqueurs « à sourcer » (surlignés), tableaux (en-tête compris), images et leur texte alternatif, blocs dynamiques.

**Enregistrer.** Toutes les 30 secondes, l'éditeur enregistre s'il y a des modifications (jamais pendant une rédaction, une réduction ou une humanisation). Ctrl+S et « Sauvegarder » enregistrent aussitôt. L'indicateur affiche « Sauvegarde en cours... », « ✓ Sauvegardé à l’instant / il y a Ns / il y a Nmin » (le délai n'avance qu'au prochain enregistrement), ou « ⚠ Modifications non sauvegardées », qui reste affiché après un échec. La rédaction guidée n'a pas d'enregistrement automatique : chaque opération enregistre son résultat, et Ctrl+S y fonctionne aussi.

**« Supprimer le contenu »** demande confirmation (« Supprimer le contenu de l'article ? Le brief et le sommaire seront conservés. »), puis efface en base le texte, la méta et les scores notés, et vide l'éditeur ; le texte ne revient pas au rechargement. Si la suppression échoue, le texte reste à l'écran et un message le dit.

**« Visualiser l'article »** apparaît quand le texte, le meta title et la meta description existent ; il enregistre si besoin, puis ouvre l'aperçu dans un nouvel onglet.

### Actions sur une sélection et blocs dynamiques
*Exigences : FR-RED-CONTEXTUAL-ACTIONS*

Dans l'éditeur, sélectionner du texte fait apparaître la mini-barre ; « ✦ » ouvre le menu des actions :

| Groupe | Actions |
|---|---|
| « Réécriture » | « Reformuler », « Simplifier », « Convertir en liste » |
| « Enrichissement » | « Exemple PME », « Optimiser mot-clé », « Statistique sourcée », « Answer Capsule » |
| « Structure » | « Formuler en question », « Lien interne » |

- Le résultat s'affiche au fil dans une fenêtre, avec « Rejeter » et « Accepter » (grisé pendant l'écriture et sans résultat). Accepter remplace la sélection ; rejeter la garde intacte.
- Une réponse coupée avant la fin n'est pas proposée : « La réponse a été coupée avant la fin : rien n’est proposé. Sélectionnez un passage plus court, ou relancez. »
- **Écart connu :** l'éditeur n'envoie pas le mot-clé de l'article aux actions ; « Optimiser mot-clé » n'a donc aucun mot-clé à intégrer.
- **Attention :** « Statistique sourcée » demande à l'IA, sans recherche web, une statistique « plausible » attribuée à une source (« selon [Source], [Année] ») : le chiffre n'est pas vérifié, et son attribution suffit à passer le contrôle des chiffres sans source à la publication.

**« Lien interne »** n'appelle pas l'IA : il ouvre « Choisir l'article cible », qui liste les articles chargés par la dernière page de cocon visitée (« Aucun article disponible dans ce cocon. » si l'éditeur a été ouvert directement). Choisir un article pose sur la sélection le même lien que le panneau « Maillage » et l'enregistre dans le réseau de liens.

**Blocs dynamiques** (panneau « Blocs » de l'éditeur, par glisser-déposer) : « Sources chiffrées » et « Exemples réels » (recherche web) travaillent sur le paragraphe et le titre voisins ; « Ce qu'il faut retenir » résume la section. Une place s'affiche pendant l'écriture, puis le résultat la remplace ; en cas d'erreur, la place affiche le message. Les deux blocs à recherche web cherchent comme la passe Sources (France, heure de Paris, ville du client ; Claude seulement) ; leurs liens absents des résultats sont retirés avant l'affichage. Le panneau « Blocs » propose aussi des blocs simples : paragraphe, titre H2, titre H3, listes, citation.

### Le maillage interne
*Exigences : FR-RED-LINKING-MANUAL*

Le **maillage** est l'ensemble des liens entre articles du site. Il se pose à la main, une fois le texte écrit.

Le panneau « Maillage » (« Suggestions de maillage ») demande des suggestions à sa première ouverture ; « Actualiser » en redemande. Chaque suggestion montre la cible, son type, « Ancre : « … » » et la raison, avec ✓ (« Appliquer ») et ✕ (« Ignorer »).

L'ordre des suggestions, dix au plus :
1. **La famille** : pour un parent, un lien vers chacun de ses enfants (« Article enfant (section « … ») ») ; pour un enfant, vers son parent. Proposée même si la cible n'est pas publiée, avec « — pas encore publié : le lien sera cassé tant qu’il n’est pas en ligne ».
2. **Les autres articles déjà rédigés** dont au moins deux mots du titre (de plus de trois lettres) figurent dans le texte, à un niveau voisin dans la hiérarchie (pilier ↔ intermédiaire ↔ spécialisé) : d'abord le même cocon (« Même cocon … »), puis les autres (« Cross-cocon … »).

Un article déjà relié n'est pas reproposé. L'ancre est un passage qui existe tel quel dans le texte : le plus long groupe de deux à six mots du titre de la cible, sans mot vide au début ni à la fin ; à défaut, le mot-clé de la cible ; sinon, pas de suggestion.

Appliquer pose le lien sur l'ancre et l'enregistre dans le réseau de liens. **Écarts connus :** dans la rédaction guidée, « Appliquer » ne fait rien (pas d'éditeur) ; dans l'éditeur, l'ancre n'est cherchée que dans la zone où se trouve le curseur : ailleurs, « Appliquer » ne fait rien, sans message, et la suggestion reste affichée.

Le réseau de liens suit le texte : à chaque enregistrement du texte, un lien qui n'y figure plus en sort. Enregistrer seulement le sommaire n'y touche pas. Un lien écrit sous une autre forme qu'un lien d'article de l'outil n'est pas reconnu. Le bouton 🔗 de la barre ne retire pas un lien interne : il faut effacer le texte lié.

### Les panneaux latéraux
*Exigences : FR-RED-PANELS-LAYOUT*

| Bouton | Rédaction guidée | Éditeur | Sans texte |
|---|---|---|---|
| « SEO » | oui (ouvert par défaut) | oui | grisé, « Generez un article pour activer le scoring SEO » |
| « GEO » | oui | oui | grisé |
| « Maillage » | oui | oui | grisé |
| « Enrichir » | oui | oui | grisé, « Rédigez le premier jet pour l’enrichir » |
| « Blocs » | non | oui (ouvert par défaut) | grisé |
| « IA Brief » | oui | non | actif |

Un seul panneau à la fois ; recliquer le bouton actif le ferme ; Échap aussi. Un panneau ouvert sans texte affiche « Generez un article pour activer ce panneau ». La zone se redimensionne à la souris par son bord gauche (240 px au moins, 300 par défaut) ; la largeur reste mémorisée par le navigateur, d'une session à l'autre.

### Les scores SEO et GEO
*Exigences : FR-RED-SEO-LIVE, FR-RED-GEO-LIVE, FR-RED-SEO-SCORE-PERSIST*

**Score SEO.** Recalculé après chaque modification du texte, de la méta ou des mots-clés de l'article, après 300 ms de pause, sans bloquer la saisie. Six facteurs pondérés :

| Facteur | Poids |
|---|---|
| Densité du capitaine (cible 1,5 à 2,5 %) | 25 % |
| Densité des lieutenants (cible 0,8 à 1,5 %) | 15 % |
| Structure des titres | 20 % |
| Meta title (50 à 60 caractères, capitaine présent) | 15 % |
| Meta description (150 à 160 caractères, capitaine présent) | 10 % |
| Longueur au regard de la longueur visée | 15 % |

Niveaux : bon à partir de 70, moyen à partir de 40, faible en dessous. Sans capitaine, les densités ne sont pas calculées et le panneau prévient : « Aucun mot-clé article défini. Configurez le Capitaine et les Lieutenants dans le Moteur. » Le lexique est détaillé mais n'entre pas dans le score.

Le panneau « SEO » affiche la jauge, le nombre de mots et le temps de lecture (200 mots par minute), puis trois onglets :
- « Mots-clefs » : capitaine, lieutenants, lexique, termes associés, avec leurs emplacements (« Meta title », « Titre H1 », « Introduction », « Meta description », « Sous-titres H2 », « Conclusion », « URL / Slug », « Alt images ») ;
- « Indicateurs » : « Meta » (ouverte d'abord), « Structure », « Mots-clés », « Alertes » (cannibalisation, densités, méta vide, images sans texte alternatif…), une carte ouverte à la fois ; « Alertes » s'ouvre d'elle-même quand une alerte apparaît alors qu'aucune carte n'est ouverte ;
- « SERP Data » : les données de Google du mot-clé de l'article, avec rafraîchissement manuel.

Le contrôle « capitaine dans l'adresse de la page » lit le slug réel de l'article. Avant le premier calcul, la jauge affiche 0 (écart connu).

**Score GEO.** Il mesure la facilité pour un moteur génératif d'extraire et de citer l'article. Recalculé après 300 ms de pause sur chaque modification du texte. Quatre facteurs : extractibilité (paragraphes courts) 30 %, titres H2/H3 formulés en questions (objectif 70 %) 25 %, capsules de réponse 25 %, statistiques sourcées (objectif 3 à 5) 20 %. Niveaux 70 / 40. Le panneau « GEO » a deux onglets : « Extractibilité » (« Questions H2/H3 », « Answer Capsules », « Stats sourcées ») et « Lisibilité » (« Paragraphes » de plus de 80 mots, « Jargon » avec un équivalent proposé).

**Scores enregistrés.** Chaque score part en base avec le texte qu'il note : le SEO note texte, meta title et meta description ; le GEO, le texte seul.
- Un score calculé sur une autre version du texte n'est jamais enregistré : la base porte « inconnu », affiché « — ».
- Retoucher la méta rend le SEO inconnu jusqu'au prochain calcul, sans toucher au GEO.
- Un score calculé juste après une sauvegarde, sur le texte enregistré, part aussitôt, seul ; le même score n'est pas renvoyé deux fois.
- À l'ouverture d'un article dans la rédaction guidée, le score recalculé sur le texte intact rejoint la base. Dans l'éditeur, il n'y part qu'à la sauvegarde suivante.
- Aucun écran ne lit encore le score enregistré ; l'audit du projet l'affiche (« Scores enregistrés : SEO 72 · GEO — »). Le mode automatique ne calcule aucun score.

### La phase de l'article
*Exigences : FR-RED-PROGRESS*

Chaque article a une phase : proposé, Moteur, rédaction ou publié.
- Un texte non vide enregistré fait passer l'article en rédaction ; la publication le fait passer en publié.
- La phase ne recule jamais.
- La liste « Articles publiés » du Moteur montre les articles en rédaction ou publiés.

### Publier : la porte de publication
*Exigences : FR-RED-PUBLISH-GATE*

Publier, c'est cliquer « Exporter HTML » dans l'aperçu. La publication passe d'abord par sa porte ; le fichier n'est produit que si l'article est marqué publié.

| Niveau | Alerte |
|---|---|
| ⛔ | Défauts du texte : vide, bloc coupé, IA qui parle d'elle-même, texte hors paragraphe, reste de mise en forme, balise interdite, titre vide, saut de niveau, plusieurs H1 |
| ⛔ | Méta : meta title ou meta description absents, trop longs ou coupés |
| ⛔ | Image encore « à fournir » (« remplacez l’image (bouton Image de la barre d’outils) ou retirez-la ») |
| 🔴 | Capitaine absent en entier du H1 (celui du texte, à défaut le titre de l'article) ou du meta title |
| 🔴 | Capitaine absent, capitaine qui vise une offre non vendue, texte trop court, adresse de page mal formée, chiffre invérifiable |
| 🔴 | Texte au-delà du plafond du type : 3 500 mots (pilier), 2 500 (intermédiaire), 1 500 (spécialisé) |
| 🔴 | « n passage(s) « à sourcer » » restant(s), chaque marqueur compté une fois |
| 🔴 | Chaque chiffre sans source hors marqueur, chaque phrase non française, chaque paragraphe répété |
| 🔴 | Section dont est né un enfant et qui dépasse 250 mots (hors titre) : l'alerte invite à la passe « Résumer » ; une par enfant |
| 🟠 | Autres avertissements (capitaine absent de l'introduction, lieutenants peu couverts…) |
| 🟠 | Section dont est né un enfant disparue de l'article |
| 🟠 | Lien vers un article pas encore publié, dans le texte ou dans le réseau de liens ; une alerte par article visé |
| 🟠 | Chaque dérogation encore valable des portes capitaine, lieutenants, structure et lexique, à reconfirmer |
| niveau d'origine | Toute alerte de ces quatre portes, rejouées sur les données du jour, qu'aucune dérogation valable ne couvre (par exemple : lexique vide ou terme générique 🔴, structure absente 🔴, structure sans chapitre ⛔) |

- Un H1 laissé dans le corps est toléré. La porte du premier jet n'est pas rejouée.
- Refusée : l'alarme « Avant de publier » s'ouvre ; rien n'est marqué publié ni téléchargé, et l'aperçu affiche « Publication annulée : corrigez les points signalés, puis exportez à nouveau. » Une autre erreur affiche « Publication impossible : … ».
- Après dérogation, la publication reprend d'elle-même.
- Changer le statut d'un article vers autre chose que « publié » n'est pas contrôlé.
- L'audit du projet signale tout article déjà rédigé que la porte refuserait.

> **En situation.** L'utilisateur clique « Exporter HTML » sur son pilier. L'alarme s'ouvre : une image est encore à fournir (⛔), le bouton affiche « Correction nécessaire » et reste grisé. Il clique « Revenir corriger », remplace l'image par le bouton « Image » de l'éditeur, exporte à nouveau, coche « J’ai lu » sur sa dérogation passée : le fichier se télécharge et l'article passe publié.

### Aperçu et export
*Exigences : FR-RED-EXPORT-HTML*

L'aperçu s'ouvre dans un nouvel onglet, sans barre de navigation : « ← Retour à l'éditeur », le titre de l'article, « Exporter HTML ». Il montre la page telle qu'elle serait publiée : fil d'Ariane, un H1, un sommaire, le texte, la méta et les données structurées de l'article. Sans texte ou sans méta, l'aperçu refuse de s'afficher.

« Exporter HTML » passe la porte de publication, puis télécharge la page de l'aperçu en HTML, nommée d'après le numéro de l'article.

**Écarts connus :**
- le H1 de la page est le titre de l'article, pas le H1 du texte, que la porte a jugé : un titre sans capitaine est publié tel quel ;
- les liens internes posés dans l'outil sont retirés du fichier (leur texte reste).

## Explorateur — analyse d'écart de contenu

L'Explorateur (une page d'analyse de mots-clés hors parcours) et le Labo (une page de recherche libre) ont été retirés du produit. De l'Explorateur, seule l'**analyse d'écart de contenu** subsiste.

### L'analyse d'écart de contenu
*Exigences : FR-EXP-CONTENT-GAP*

Pour un mot-clé, l'outil lit les cinq premières pages concurrentes, en tire les thèmes qu'elles traitent, leur fréquence, leur longueur moyenne et les lieux cités. Un thème traité par au moins trois concurrents et absent du texte de l'article (son libellé entier, sans tenir compte des majuscules) est un **écart**. L'analyse d'un mot-clé est partagée entre articles et réutilisée tant qu'elle est fraîche ; la présence dans l'article est recalculée à chaque demande.

Aujourd'hui, aucun écran du parcours ne lance cette analyse. Une analyse déjà enregistrée sert encore : sa longueur moyenne des concurrents nourrit la recommandation de longueur de l'article.
