---
title: Parcours — Améliorer et publier un article rédigé
id: PU-05
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-05 — « J'améliore mon article déjà rédigé, puis je le publie, et je le republie après une retouche »

**But :** faire d'un premier jet accepté un article que l'on ose publier (chiffres sourcés, exemples, liens vers ses voisins, méta vérifiée), le publier, puis le republier après une retouche.
**Quand :** le pilier « Créer son site vitrine à Toulouse » a son premier jet accepté, et un article enfant est né de sa section sur les prix. Avant la mise en ligne, le consultant veut sourcer les chiffres, ajouter un tableau et une FAQ, résumer la section devenue un article et poser le lien vers lui. Quelques semaines plus tard, l'enfant publié à son tour, il revient corriger une phrase du pilier et le republie.
**Départ :** l'article a un texte, un titre et une description pour Google, un Capitaine verrouillé, et le bandeau « ✓ Premier jet accepté : l’article peut donner naissance à ses articles enfants dans le cocon. »
**Arrivée :** l'article est au statut « Publié » sur la page Rédaction du cocon, le fichier HTML de sa page est téléchargé, chaque point signalé par la porte de publication a été corrigé ou assumé par écrit, et la matrice « Maillage » montre ses liens vers ses voisins.
**Recette :** parcours express, étapes 8 à 10 ; module 07 (RED-2, RED-3, RED-8 à RED-26) ; module 09 (INFRA-19).
**Test automatique :** le robot, dans un vrai navigateur et en mode simulé, ouvre l'éditeur d'un article rédigé, y enregistre puis retire une retouche, ouvre l'aperçu et publie à travers la porte (fichier HTML téléchargé, statut « publié ») ; ailleurs, il fait proposer puis accepter les passes « Sources », « Tableaux » et « Images » et une réécriture de chapitre, vérifie que rien ne change avant d'accepter, et qu'un défaut ⛔ bloque la publication (« Correction nécessaire », « Publication annulée », rien de téléchargé). Aucun test ne suit les actions sur une sélection, le maillage à l'écran, les scores SEO et GEO, la relecture, l'humanisation, la réduction, ni la reconfirmation des dérogations à la republication.

## Les étapes

### 1. Ouvrir l'article dans l'éditeur
**Exigences :** FR-RED-PANELS-LAYOUT, FR-UI-ARTICLE-SHARED, FR-RED-EDITOR-TIPTAP

Depuis la page du cocon, l'utilisateur clique « Rédaction », puis la carte de l'article : la rédaction guidée s'ouvre, le texte en lecture seule à l'étape « Article ». « Éditer l'article » ouvre l'éditeur, en trois zones repliables (« Introduction », « Corps de l'article », « Conclusion »), avec « Meta SEO » et « Table des matières » repliés au-dessus. À droite, la barre des panneaux (« SEO », « GEO », « Maillage », « Enrichir », « Blocs ») ouvre un panneau à la fois, dans une zone qu'il élargit à la souris. Il y arrive en cliquant, sans recharger : c'est ainsi que l'éditeur connaît les autres articles du cocon.

### 2. Lire ce que disent les scores
**Exigences :** FR-RED-SEO-LIVE, FR-RED-GEO-LIVE, NFR-PERF-SEO-DEBOUNCE

Le panneau « SEO » donne une jauge sur 100, « N mots » et le temps de lecture, puis le détail : « Indicateurs » (« Meta », « Structure », « Mots-clés », « Alertes »), « Mots-clefs » (où apparaissent le capitaine, les lieutenants et le lexique) et « SERP Data ». Le panneau « GEO » mesure la facilité pour une IA de citer l'article : « Questions H2/H3 », « Answer Capsules », « Stats sourcées », et en « Lisibilité » les paragraphes trop longs. Les deux notes se recalculent une fraction de seconde après chaque pause de frappe, sans gêner la saisie : elles guident les retouches qui suivent.

### 3. Retoucher le texte à la main
**Exigences :** FR-RED-EDITOR-TIPTAP, FR-RED-SEO-SCORE-PERSIST ⚠

La barre d'outils (gras, italique, H2, H3, listes, citation, lien, image, annuler, rétablir) agit sur la zone où se trouve le curseur. Le bouton « 📷 » demande une adresse (« https://… » ou « /… »), puis un texte alternatif, tous deux obligatoires. Dès la première frappe, « ⚠ Modifications non sauvegardées » s'affiche ; Ctrl+S ou « Sauvegarder » enregistre (« ✓ Sauvegardé à l'instant »), et l'éditeur enregistre seul toutes les 30 secondes. Les scores partent en base avec le texte qu'ils notent.

### 4. Enrichir chapitre par chapitre
**Exigences :** FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES

« Enrichir » ouvre « Enrichir l’article » : « Rien ne change dans l’article tant que vous n’acceptez pas. » Il lance une passe (« Sources », « Exemples », « Tableaux », « Images », « FAQ », « Résumer ») ; les chapitres passent l'un après l'autre (« Chapitre n/N — … », avec « Arrêter »), et chacun reçoit une carte « à relire » avec ses alertes, ses « Sources trouvées : » et « Comparer avant / après ». « Accepter » remplace ce seul chapitre et enregistre l'article, « Refuser » ne touche à rien, « Accepter celles sans alerte » accepte d'un coup les propositions sans alerte. « Résumer » ramène la section dont est né un article enfant à un résumé qui renvoie vers lui ; une image acceptée reste une place « à fournir », à remplacer par le bouton « 📷 ».

### 5. Réécrire un chapitre, relire la langue, alléger
**Exigences :** FR-RED-SECTION-REWRITE ⚠, FR-RED-LANG-REVIEW, FR-RED-HUMANIZE-SECTION ⚠, FR-RED-REDUCE-SECTION, FR-RED-WORD-COUNT-TARGET

Dans « Réécrire un chapitre », il choisit le « Chapitre », écrit une « Consigne » d'au moins 5 caractères et clique « Proposer une réécriture » : la proposition arrive en carte, à accepter ou à refuser. « Relecture de la langue » corrige directement tics d'IA, anglicismes et accords, sans toucher aux chiffres, aux liens ni aux titres, puis enregistre. « Humaniser l'article » retravaille le texte section par section (« Humanisation n/N — … ») ; « Annuler humanisation » rend l'article d'avant. Quand le texte dépasse de plus de 15 % la longueur visée, « Réduire (-N mots) » le condense section par section (« Annuler réduction » pour revenir) ; une seule de ces opérations tourne à la fois.

### 6. Retravailler un passage avec l'IA
**Exigences :** FR-RED-CONTEXTUAL-ACTIONS ⚠

Il sélectionne un passage ; la petite barre qui apparaît propose « ✦ », qui ouvre les actions « Réécriture » (« Reformuler », « Simplifier », « Convertir en liste »), « Enrichissement » (« Exemple PME », « Optimiser mot-clé », « Statistique sourcée », « Answer Capsule ») et « Structure » (« Formuler en question », « Lien interne »). Le résultat s'écrit au fil dans une fenêtre : « Accepter », grisé tant que l'écriture n'est pas finie, remplace la sélection et elle seule ; « Rejeter » la garde intacte ; ↩ défait. Le panneau « Blocs » ajoute, par glisser-déposer, des blocs écrits par l'IA : « Sources chiffrées », « Exemples réels », « Ce qu'il faut retenir ».

### 7. Relier l'article à ses voisins
**Exigences :** FR-RED-LINKING-MANUAL ⚠

Le panneau « Maillage » (« Suggestions de maillage ») propose d'abord la famille, ses articles enfants ou son parent, même pas encore publiés (« — pas encore publié : le lien sera cassé tant qu’il n’est pas en ligne »), puis les articles déjà rédigés proches, chacun avec son « Ancre : « … » ». Dans l'éditeur, il clique dans la zone où se trouve l'ancre, puis ✓ (« Appliquer ») ; ✕ (« Ignorer ») écarte une suggestion, « Actualiser » en redemande. Il peut aussi sélectionner des mots, cliquer « ✦ », puis « 🔗 Lien interne », et choisir la cible dans « Choisir l'article cible ». Après enregistrement, la matrice « Maillage » de l'accueil montre le lien ; pour en retirer un, il efface le texte lié, puis enregistre.

### 8. Vérifier le titre et la description pour Google
**Exigences :** FR-RED-META ⚠, FR-RED-META-CAPTAIN

Le bloc « Meta SEO » montre « Meta Title » (n/60) et « Meta Description » (n/160), générés juste après le premier jet ; la carte « Meta » du panneau SEO dit si chacun contient le capitaine (« Capitaine ✓ » ou « Capitaine ✗ »). La méta se lit mais ne se modifie pas à l'écran : seul « Régénérer l'article » la refait, en réécrivant tout le texte.

### 9. Ouvrir l'aperçu
**Exigences :** FR-RED-EXPORT-HTML

« Visualiser l'article », qui n'apparaît que si le texte, le titre et la description existent, enregistre si besoin et ouvre un nouvel onglet : la page telle qu'elle sera publiée, avec son fil d'Ariane, un seul H1, un sommaire et le texte, sous la barre « ← Retour à l'éditeur » et « Exporter HTML ». L'aperçu ne se recharge pas seul pendant les retouches ; le fichier exporté, lui, est toujours le texte que la porte juge, et l'aperçu se recharge après l'export.

### 10. Demander la publication
**Exigences :** FR-RED-PUBLISH-GATE, FR-INFRA-VERIFIER-SHARED

« Exporter HTML » passe d'abord par la porte de publication, qui rejoue les contrôles du texte, de la méta et des étapes du Moteur. Si elle ne signale rien, le fichier se télécharge et l'article passe « Publié ». Sinon, l'alarme « Avant de publier » liste les points : ⛔ un défaut à corriger (image encore à fournir, méta absente ou coupée, texte abîmé), avec le bouton grisé « Correction nécessaire » ; 🔴 un risque (chiffre sans source, passage « à sourcer » restant, phrase qui n'est pas en français, section dont est né un enfant de plus de 250 mots) ; 🟠 une attention (lien vers un article pas encore publié, dérogations passées à reconfirmer). « Revenir corriger » ou Échap affiche « Publication annulée : corrigez les points signalés, puis exportez à nouveau. », et rien n'est téléchargé.

### 11. Corriger ou assumer, puis publier
**Exigences :** FR-RED-PUBLISH-GATE, FR-INFRA-GATE-WAIVER, FR-RED-PROGRESS ⚠

Pour un ⛔, il corrige dans l'éditeur (par exemple 📷 « Remplacer l'image » sur la place « à fournir »), enregistre et exporte de nouveau depuis l'aperçu. Un 🟠 se passe en cochant « J’ai lu » ; un 🔴 demande « Pourquoi passer outre ? » et « Votre raison », d'au moins 20 caractères, puis « Je prends la responsabilité et je continue ». La publication reprend alors d'elle-même : le fichier se télécharge et la carte de l'article affiche « Publié » sur la page Rédaction ; cette phase ne reculera plus.

### 12. Republier après une retouche
**Exigences :** FR-RED-PUBLISH-GATE, FR-INFRA-GATE-WAIVER

Plus tard, il retouche l'article publié (par exemple parce que l'enfant est enfin en ligne), enregistre, rouvre l'aperçu et clique « Exporter HTML ». La porte rejoue tout, point par point : chaque réponse vaut pour son point, si bien qu'une retouche ailleurs dans le texte ne redemande rien ; seul un point dont les données ont changé revient, à son niveau d'origine, à justifier de nouveau, et un point nouveau s'ajoute. L'article reste « Publié ».

## Ce qui peut mal tourner

### Il ouvre un article sans texte juste après un autre
**Exigences :** FR-RED-EDITOR-TIPTAP, FR-RED-OUTLINE ⚠, FR-RED-SEO-SCORE-PERSIST ⚠

Passer d'un article à l'autre sans recharger montre le bon article, ou un écran vide s'il n'a pas de texte : ni le texte, ni la méta, ni le sommaire de l'article ouvert juste avant. Aucun enregistrement ne les copie dans le nouvel article, et aucun score n'est écrit dans l'ancien.

### Le chapitre a changé depuis la proposition
**Exigences :** FR-RED-ENRICH-PASSES

Entre la proposition d'une passe et son acceptation, il a retouché ce chapitre dans l'éditeur. La carte passe « chapitre modifié depuis », avec « Le chapitre a changé depuis cette proposition : relancez la passe pour ne rien écraser. » : sa retouche est gardée, rien n'est écrasé. Un chapitre en échec affiche son erreur et la passe continue avec les suivants ; une proposition marquée ⛔ ne peut pas être acceptée.

### Il réexporte sans recharger l'aperçu
**Exigences :** FR-RED-EXPORT-HTML

Après une correction dans l'éditeur, il clique « Exporter HTML » dans l'onglet d'aperçu resté ouvert. La porte juge la nouvelle version, et le fichier est demandé au serveur juste après elle : c'est cette version qui se télécharge, puis l'aperçu se recharge. Dans le fichier, le H1 est celui que la porte a jugé, et chaque lien interne vers un article rédigé pointe vers son adresse de blog ; un lien vers un article pas encore rédigé est retiré, son texte gardé.

### Une opération d'IA échoue ou est annulée
**Exigences :** FR-RED-DRAFT-SINGLE-PASS, FR-RED-HUMANIZE-SECTION ⚠, FR-RED-CONTEXTUAL-ACTIONS ⚠, FR-INFRA-API-STREAM ⚠

« Annuler humanisation », « Annuler réduction » ou « Arrêter » doivent rendre l'article d'avant, en entier, et une panne doit se dire. Aujourd'hui, l'échec d'une réduction, d'une humanisation ou de la méta n'affiche aucun message ; une section que l'IA n'a pas su traiter reste telle quelle sans que l'écran le dise ; l'échec d'une action sur une sélection s'affiche sous l'éditeur, caché par le voile. Et une annulation arrête l'écran, pas le serveur : en mode réel, la génération continue et se facture.

### Il supprime le contenu
**Exigences :** FR-RED-EDITOR-TIPTAP, FR-RED-META ⚠, FR-RED-PROGRESS ⚠

« Supprimer le contenu » demande « Supprimer le contenu de l'article ? Le brief et le sommaire seront conservés. » ; une fois confirmé, l'éditeur se vide et la méta est effacée, mais la phase de l'article ne recule pas. Aujourd'hui, le texte reste en base et revient au rechargement, alors que la méta, elle, est perdue : l'aperçu refuse alors de s'ouvrir (« Article needs meta title and description before preview »), et seul « Régénérer l'article » refait la méta, en remplaçant tout le texte.

## Défauts connus sur ce parcours

- FR-RED-PROGRESS — rouvrir la rédaction guidée d'un article déjà rédigé ramène toujours à « Brief & Structure ».
- FR-RED-SEO-SCORE-PERSIST — un premier jet interrompu enregistre le texte sans remettre les scores à « inconnu » : l'ancien score reste en base, à l'écran comme en mode automatique.
- FR-RED-SECTION-REWRITE — le champ « Consigne » accepte plus de 600 caractères ; au-delà, la carte affiche un message technique en anglais au lieu de dire la limite.
- FR-RED-HUMANIZE-SECTION — aucune note ne signale les sections revenues à leur texte d'origine ; le message « La structure de l'article a été altérée par l'humanisation. Retour à la version précédente. » ne s'affiche nulle part.
- FR-RED-CONTEXTUAL-ACTIONS — l'éditeur n'envoie pas le mot-clé de l'article : « Optimiser mot-clé » et les autres actions travaillent sans lui ; les blocs « Sources chiffrées » et « Exemples réels » retirent les liens absents de la recherche sans dire combien ; l'échec d'une action s'affiche sous l'éditeur, caché par le voile ; « Convertir en liste » montre ses balises dans la fenêtre de résultat.
- FR-RED-LINKING-MANUAL — dans la rédaction guidée, « Appliquer » une suggestion ne fait rien ; dans l'éditeur, l'ancre n'est cherchée que dans la zone active : ailleurs, « Appliquer » ne fait rien, sans message, et la suggestion reste affichée.
- FR-RED-META — la méta ne se modifie pas à la main et ne se relance pas seule : réessayer relance tout l'article.
- FR-RED-OUTLINE — les boutons Annuler / Rétablir du sommaire ne s'activent jamais : les retouches ne sont pas enregistrées dans l'historique.
- FR-INFRA-API-STREAM — quand l'utilisateur annule, l'écran s'arrête mais le serveur continue la génération jusqu'au bout et la facture.
