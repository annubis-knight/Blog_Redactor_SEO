---
title: Parcours — Reprendre un article
id: PU-03
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-03 — « Je reprends un article commencé l'autre jour, là où je l'avais laissé »

**But :** retrouver où en est un article commencé lors d'une session précédente, et continuer son travail sans rien perdre ni repayer ce qui a déjà été acheté.
**Quand :** lundi, le consultant a préparé les mots-clés d'un article et lancé son premier jet ; il a éteint son ordinateur. Jeudi, il rouvre l'outil pour finir cet article.
**Départ :** l'outil vient d'être ouvert sur l'accueil ; l'article a une partie de son travail enregistrée (par exemple Capitaine et Lieutenants verrouillés, structure validée, premier jet écrit mais pas encore enrichi).
**Arrivée :** l'utilisateur sait quelles étapes sont faites et lesquelles restent ; il retrouve ses choix, son brief et son texte tels qu'il les avait enregistrés ; la pile « Coûts API » ne montre aucun nouvel achat de ce qui était déjà acquis ; il reprend l'étape suivante.
**Recette :** module 01 (DASH-1, DASH-6 à DASH-8) ; module 02 (CER-12) ; module 03 (MOT-2 à MOT-4, MOT-15 à MOT-17) ; module 04 (RAD-15) ; module 05 (CAP-14 à CAP-16) ; module 06 (FIN-2) ; module 07 (RED-3, RED-5, RED-11, RED-24, RED-R1) ; module 09 (INFRA-4, INFRA-8, INFRA-10, INFRA-16). La reprise d'un bout à l'autre, depuis l'accueil : aucune (manque).
**Test automatique :** partiel : le robot recharge la page au milieu des onglets Capitaine, Radar et Lexique, rechoisit l'article, rouvre l'onglet et vérifie que l'écran réaffiche les mêmes mesures, le même scan et les mêmes termes. Rien ne suit la reprise depuis l'accueil, l'onglet d'ouverture du Moteur ni la réouverture de la rédaction (manque).

## Les étapes

### 1. Retrouver le cocon sur l'accueil
**Exigences :** FR-DASH-NAV ⚠

L'accueil donne la vue d'ensemble : les compteurs « Silos », « Cocons », « Articles », « Progression », puis chaque silo avec « N cocons · N articles · N% ». La carte du cocon rappelle ses articles par niveau (« N articles | N Pilier N Inter. N Spéc. ») et son avancement (« N% complété »). Les cartes n'ont pas de points de progression ; un clic ouvre la page du cocon. Aujourd'hui, l'avancement ne compte que les articles publiés : un article rédigé mais pas encore exporté n'y compte pas.

### 2. Voir, depuis la page du cocon, quels articles sont rédigés
**Exigences :** FR-DASH-WORKFLOW-CHOICE, FR-CER-PARENT-WRITTEN-GATE

La page du cocon rappelle « N articles · N% complété » et ses trois cartes ; « Rédaction » redit le nombre d'articles et l'avancement. Pour situer chaque article, la carte « Cerveau » rouvre sur la dernière étape atteinte, « Articles » : dans « Construire le cocon », chaque article porte son état, « Rédigé » ou « À rédiger », et un lien « Ouvrir sa rédaction » ou « Le rédiger ».

### 3. Repérer l'article et ses étapes dans les listes du Moteur
**Exigences :** FR-DASH-PROGRESS, FR-MOT-RECAP-PUBLISHED ⚠, FR-MOT-RECAP-LOCK-SYNC ⚠, FR-CER-CONTEXT-FOR-MOTEUR ⚠

Carte « Moteur » : « Contexte stratégique » rappelle la stratégie du cocon. « Articles suggérés (N) » range les articles par niveau, « Articles publiés (N) » ceux entrés en rédaction ou publiés. Chaque ligne porte six points, Discovery et Radar puis Capitaine, Lieutenants, Structure, Lexique (le nom au survol), pleins pour les étapes franchies. Le mot-clé est en trait plein si le Capitaine est verrouillé, en pointillé s'il n'est encore qu'une suggestion.

### 4. Choisir l'article : le Moteur rouvre au bon onglet
**Exigences :** FR-MOT-PHASES, FR-MOT-LOCK-DERIVED

Un clic sur le titre choisit l'article et replie la liste. Le Moteur ouvre de lui-même le premier onglet utile d'après les étapes franchies : Capitaine si rien n'est verrouillé, Lieutenants après le Capitaine, Structure après les Lieutenants, Lexique après la Structure, jamais la Finalisation. Les cadenas affichés sont ceux de cet article dès l'ouverture, jamais ceux de l'article vu avant.

### 5. Retrouver ce qui a déjà été calculé
**Exigences :** FR-MOT-EXPLORATION-COUNTS, FR-MOT-CACHE-PANEL-COUNT ⚠, FR-MOT-EXPLORATIONS-HYDRATATION

En bas de l'écran, la barre « Résultats déjà calculés » compte ce qui est enregistré pour cet article : une puce par onglet (Radar, Capitaine, Lieutenants, Lexique) avec « DB n », et le détail au survol (par exemple « n mots-clés testés — verrouillé : … »). Dans l'onglet ouvert, l'invite « Charger Capitaine » (ou Radar, Lieutenants, Lexique) propose son bouton « DB n » : un clic remet à l'écran ce qui manque, sans doublon. Les candidats du Capitaine et les lieutenants déjà proposés reviennent, même sans verrou.

### 6. Revoir les choix déjà faits, sans les refaire
**Exigences :** FR-CAP-PERSIST ⚠, FR-INFRA-LIEUTENANT-EXPLORATIONS ⚠, FR-LEX-SELECT, FR-MOT-CHECK-RECONCILIATION

Au Capitaine, tous les candidats étudiés reviennent, chacun une fois, le Capitaine verrouillé en tête avec son cadenas. Aux Lieutenants, les propositions reviennent du meilleur score au moins bon, les lieutenants retenus toujours cochés. Au Lexique, les termes retenus sont cochés. À la première ouverture de ces trois onglets, l'outil corrige de lui-même une étape qui contredirait les données enregistrées.

### 7. Reprendre l'onglet en cours sans repayer
**Exigences :** FR-INFRA-SCRAPE-CORPUS-NEUTRE, FR-LIE-SERP-ANALYZE ⚠, FR-INFRA-KEYWORD-METRICS ⚠, FR-INFRA-KEYWORD-DISCOVERIES

L'utilisateur reprend l'onglet où il s'était arrêté. Une analyse des concurrents de moins de 7 jours est relue : aux Lieutenants, « Analyser SERP » répond vite, et la ligne qui compte les concurrents porte « (cache) ». Au Capitaine, un mot-clé mesuré il y a moins de 7 jours n'est pas remesuré. En Discovery, retaper le même mot-clé racine affiche le bandeau « Derniere analyse du … » : « Charger » rend la découverte sans nouvel appel. La pile « Coûts API » permet de vérifier que rien n'a été racheté.

### 8. Faire le point à la Finalisation
**Exigences :** FR-FIN-RECAP, FR-FIN-CHECK

Onglet « Finalisation » : le récapitulatif relit, sans rien permettre de modifier, le Capitaine, les lieutenants retenus, la structure et le lexique enregistrés. S'il manque un verrou, « ⏳ Préparation en cours » et la ligne « Étapes restantes : … » disent exactement quoi faire ; sinon « ✅ Prêt pour la Rédaction ».

### 9. Rouvrir la rédaction guidée : le brief est intact
**Exigences :** FR-RED-PROGRESS ⚠, FR-INFRA-MICRO-CONTEXTS, FR-RED-WORD-COUNT-TARGET, FR-RED-OUTLINE ⚠

Page du cocon › « Rédaction » : la carte de l'article porte son statut (« À rédiger » ou « Publié ») ; un clic ouvre sa rédaction guidée, toujours sur l'étape « Brief & Structure ». Le micro-contexte, la cible en mots (avec « ajuste » si elle avait été modifiée) et le sommaire validé (« Sommaire valide et sauvegarde. ») sont tels qu'ils avaient été laissés. Seule l'analyse du panneau « IA Brief » n'est pas gardée : elle repart, et se paie, à la première ouverture du panneau.

### 10. Retrouver le texte à l'étape « Article »
**Exigences :** FR-RED-GEN-SAUVEGARDE-AU-FIL, FR-CER-PARENT-WRITTEN-GATE, FR-RED-WORD-COUNT-TARGET

« Continuer vers l'Article » affiche le texte déjà écrit, sa méta et la barre « X mots / N cible ». Le bandeau dit si le premier jet est accepté (« ✓ Premier jet accepté… ») ou propose « Valider le premier jet ». Si l'écriture avait été interrompue, les chapitres terminés avant l'arrêt sont là. Attention : « Régénérer l'article » relance tout le premier jet, sans confirmation, et remplace le texte.

### 11. Reprendre les retouches dans l'éditeur
**Exigences :** FR-RED-EDITOR-TIPTAP, FR-RED-DRAFT-TO-SOURCE, FR-RED-SEO-LIVE

« Éditer l'article » rouvre le texte tel qu'il a été enregistré : liens internes, tableaux, images et passages « [à sourcer : …] » surlignés compris. L'en-tête dit l'état d'enregistrement (« ✓ Sauvegardé … » ou « ⚠ Modifications non sauvegardées »), et le score SEO se recalcule sur le texte. L'utilisateur reprend ses retouches ; Ctrl+S ou « Sauvegarder » enregistre, et l'éditeur enregistre aussi de lui-même toutes les 30 secondes.

## Ce qui peut mal tourner

### La page est rechargée en plein travail
**Exigences :** FR-CAP-ROOTS ⚠, FR-LIE-CHECKBOX-COUNT ⚠, FR-RAD-LONGTAIL-UI ⚠, FR-LEX-AI-PANEL ⚠, FR-RED-BRIEF ⚠

Un rechargement ne doit rien faire perdre de ce qui est enregistré. Aujourd'hui, plusieurs affichages ne reviennent pas : les racines d'un Capitaine reviennent sans indicateurs ni Score Pertinence ; les suggestions de longue traîne du Radar et leurs cases disparaissent ; le panneau d'analyse IA du Lexique perd son résumé et ses termes manquants. L'analyse « IA Brief », elle, n'est pas gardée par choix : elle repart à l'ouverture du panneau.

### L'onglet a été fermé pendant l'écriture du premier jet
**Exigences :** FR-RED-GEN-SAUVEGARDE-AU-FIL, FR-RED-SEO-SCORE-PERSIST ⚠, FR-RED-DRAFT-SINGLE-PASS

Le texte est enregistré à la fin de chaque chapitre : en rouvrant l'article, l'utilisateur retrouve les chapitres terminés. La méta, elle, n'est produite qu'à la fin d'un premier jet complet : la méta affichée reste celle d'avant. Il relance « Régénérer l'article » pour obtenir un texte entier et sa méta. Aujourd'hui, le score enregistré reste celui de l'ancien texte au lieu de devenir « inconnu » (« — »).

### Passer d'un article à l'autre dans la Rédaction, sans recharger
**Exigences :** FR-RED-EDITOR-TIPTAP, FR-RED-OUTLINE ⚠, FR-RED-SEO-SCORE-PERSIST ⚠

Reprendre, c'est souvent enchaîner plusieurs articles : chacun s'ouvre avec son propre texte, son sommaire et ses scores, sans recharger la page. Un article sans texte ouvert juste après un autre montre « Aucun sommaire disponible… » et un écran vide : rien du précédent ne s'affiche, ne s'enregistre dans le nouvel article ni ne réécrit le score du précédent.

### Rouvrir le Moteur refait payer des avis déjà obtenus
**Exigences :** FR-MOT-NO-AUTO-ACTION, FR-CAP-AI-PANEL ⚠, FR-CAP-PAA-JUDGE-HAIKU ⚠

Rouvrir un article ne doit que relire la base ; une seule exception est admise, le jugement des questions « Autres questions posées » à l'ouverture du Capitaine, une fois par article et par session. L'avis expert de l'IA sur chaque candidat est gardé et réaffiché sans nouvel appel ; celui qui manque attend « Analyser avec l'IA ». L'onglet Lexique relit son extraction et son analyse IA sans rien relancer. Le jugement des questions, lui, est repayé après chaque rechargement alors que son résultat n'est pas affiché.

### Une étape cochée ne correspond plus aux données
**Exigences :** FR-MOT-CHECK-RECONCILIATION, FR-INFRA-LIEUTENANT-EXPLORATIONS ⚠

À la première ouverture des onglets Capitaine, Lieutenants et Lexique, l'outil retire une étape dont les données sont vides, et redemande à la porte une étape dont les données existent : le bandeau « Étape non validée. » revient si la porte refuse. Aujourd'hui, après « Tout réinitialiser » au déverrouillage du Capitaine, les lieutenants ne sont archivés qu'à l'écran : au retour, ils réapparaissent cochés, à l'écran comme dans la Finalisation, alors que la liste enregistrée est vide et que la porte refuse l'étape.

## Défauts connus sur ce parcours

- FR-RED-BRIEF — l'analyse n'est pas enregistrée : un rechargement la perd, et la revoir la fait repayer.
- FR-RED-PROGRESS — rouvrir la rédaction guidée d'un article déjà rédigé ramène toujours à « Brief & Structure ».
- FR-DASH-NAV — à l'écran, rien ne met un article au statut « brouillon » : l'avancement ne compte que les articles publiés, seul le mode automatique pose « brouillon » ; sans silo ni thème nommé, le titre de l'accueil est vide au lieu de « Plan Éditorial » ; dans le fil d'Ariane, le silo n'est pas un lien.
- FR-MOT-RECAP-PUBLISHED — la liste « Articles suggérés » reprend toutes les propositions de la stratégie du cocon, sans regarder leur phase : un article entré en rédaction figure dans les deux listes ; la barre de la Rédaction range aussi les articles selon un statut « publié » calculé à l'écran, pas selon la phase donnée par le serveur.
- FR-MOT-RECAP-LOCK-SYNC — pour un article de « Articles publiés », l'aspect plein ou pointillé du mot-clé ne suit pas un verrouillage fait pendant la visite : il faut recharger la page.
- FR-CER-CONTEXT-FOR-MOTEUR — une stratégie sans aucune valeur validée affiche une barre « Contexte stratégique » vide ; en passant d'un cocon à l'autre, la barre du cocon précédent reste affichée le temps du chargement.
- FR-MOT-CACHE-PANEL-COUNT — la puce Radar affiche « C 1 » dès qu'un scan est connu, même enregistré, et le bouton « C 1 » de l'invite ne recharge rien.
- FR-CAP-PERSIST — la provenance radar / longue traîne / saisie n'est pas enregistrée ; un écran dont les mots-clés ne sont pas encore chargés peut envoyer un Capitaine vide et des listes vides, qui effacent les décisions enregistrées (défaut latent) ; déverrouiller en archivant les lieutenants envoie deux enregistrements concurrents.
- FR-INFRA-LIEUTENANT-EXPLORATIONS — « Tout réinitialiser » n'archive les lieutenants qu'à l'écran : l'archivage enregistré n'est jamais demandé. Après un rechargement, ils reviennent cochés, à l'écran comme dans la Finalisation, alors que la liste enregistrée est vide, et la porte refuse l'étape. Un lieutenant ajouté depuis le panneau d'aide n'est enregistré qu'une fois coché ; le message annonce toujours « 0 lieutenant(s) archivé(s) ».
- FR-LIE-SERP-ANALYZE — la pile d'activité annonce « Scraping ~N URLs via DataForSEO » même quand l'analyse est relue en base ; « Tout relancer (SERP + IA) » ne relance rien pendant 7 jours : il relit l'analyse et les propositions gardées, et doit s'appeler « Recharger l'analyse ».
- FR-INFRA-KEYWORD-METRICS — tant que DataForSEO ne renvoie ni difficulté ni coût par clic pour un mot-clé, chaque étude le remesure, et le repaie ; un « Rafraîchir » raté date quand même la mesure du jour, et pour un mot-clé sans volume connu la fiche vide remplace la réponse gardée.
- FR-RED-OUTLINE — les boutons Annuler / Rétablir du sommaire ne s'activent jamais : les retouches ne sont pas enregistrées dans l'historique.
- FR-CAP-ROOTS — à la réouverture, les racines de la colonne de détail reviennent sans indicateurs ni Score Pertinence (« — », plus de « Moyenne », verdict GRAY) tant qu'aucun clic ne les a étudiées ; juste après l'étude, elles s'affichent dans l'ordre où leurs études aboutissent, pas de la plus longue à la plus courte.
- FR-LIE-CHECKBOX-COUNT — le compteur affiche les cases cochées sur le nombre de propositions générées ; aucune fourchette conseillée par type d'article n'est affichée ni signalée.
- FR-RAD-LONGTAIL-UI — au rechargement, suggestions et cases cochées ne reviennent pas à l'écran.
- FR-LEX-AI-PANEL — l'analyse part d'elle-même après chaque extraction, y compris l'extraction lancée seule à l'ouverture de l'onglet ; le panneau lit deux listes de recommandations différentes : après une première analyse il reste « à lancer », après un rechargement il affiche « N analysés, 0 recommandés », sans pastilles ; le résumé et les termes manquants enregistrés ne s'affichent plus après un rechargement, et un changement d'onglet montre ceux de la dernière analyse, faite sur un autre mot-clé.
- FR-RED-SEO-SCORE-PERSIST — un premier jet interrompu enregistre le texte sans remettre les scores à « inconnu » : l'ancien score reste en base, à l'écran comme en mode automatique.
- FR-CAP-AI-PANEL — la stratégie du cocon n'est pas transmise ; la confirmation annonce « un appel Claude » même en mode simulé ou avec un autre fournisseur.
- FR-CAP-PAA-JUDGE-HAIKU — le jugement est calculé mais ni ses pastilles ni la note qu'il corrige n'atteignent la liste du Capitaine ; ce jugement est pourtant payé à chaque ouverture du Capitaine après un rechargement : il est à suspendre tant que son affichage n'est pas branché.
