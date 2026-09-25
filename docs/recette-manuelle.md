---
title: Recette manuelle — Blog Redactor SEO
version: 1.1.0
last_updated: 2026-09-25
synced_with:
  - docs/testing-guide.md
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md
---

# Recette manuelle

Une **recette**, c'est toi qui essaies l'outil comme un vrai utilisateur, pour vérifier qu'il fait ce que tu attends.

- **Les tests automatiques** vérifient ce qu'on a pensé à écrire, des milliers de fois, sans se lasser.
- **La recette** attrape ce qu'aucun test ne prévoit : un bouton peu clair, un message qui ne veut rien dire, une étape qui bloque sans raison.

Les deux sont utiles, aucun ne remplace l'autre.

**Quand la faire :** avant de fusionner un chantier dans `main`. Le parcours complet prend environ 45 minutes.

**D'où viennent ces étapes :** des tests navigateur automatiques (`tests/browser-e2e/`), qui cliquent déjà sur ces mêmes boutons. Les libellés cités sont ceux de l'écran, relevés dans le code le 2026-09-25.

---

## Avant de commencer

1. Lance `npm run dev`, puis ouvre http://localhost:5400.
2. En haut à droite de la barre, un bouton affiche **MOCK** ou **RÉEL**. Il doit afficher **MOCK** ; sinon, clique dessus.
   - **MOCK** : l'IA répond par des textes préparés à l'avance, et DataForSEO renvoie des données factices depuis son bac à sable. C'est **gratuit**.
   - **RÉEL** : l'IA et DataForSEO travaillent pour de vrai. C'est **payant**, dans la limite du plafond de 2 $ par demi-heure.
   - Ce réglage vaut pour tout le serveur, et il reste actif tant que tu ne le changes pas.
3. Garde une connexion internet : les suggestions de Google sont réelles, même en MOCK.
4. Pour chaque étape, note ✅ ou ❌. En cas de ❌, fais une capture d'écran et note le numéro de l'étape : c'est tout ce qu'il faut pour corriger.

### L'alarme, en 30 secondes

Plusieurs étapes passent par une **porte** : avant de valider, l'outil vérifie les données et, s'il y a un souci, ouvre une alarme au titre « Avant de … ». Chaque point a un niveau :

| Niveau | Ce que ça veut dire | Pour passer outre |
|---|---|---|
| 🟠 Attention | À lire | Cocher « J'ai lu » |
| 🔴 Risque | Un vrai risque SEO | Choisir une catégorie **et** écrire une raison d'au moins 20 caractères |
| ⛔ À corriger | Un défaut technique | Impossible : il faut corriger |

« Revenir corriger », ou la touche Échap, ferme l'alarme sans rien valider.

---

## Le parcours

Les étapes s'enchaînent : chacune prépare la suivante. Fais-les dans l'ordre.

### Étape 1 — Créer un cocon et son pilier (Cerveau)

**Ce que ça protège :** un cocon se construit **à partir de son pilier**. Avant, on générait tous les articles d'un coup, sans mots-clés mesurés.

**Gestes :**
1. Sur l'accueil, chaque silo se termine par une carte en pointillés **« Nouveau cocon »**. Si tu ne la vois pas, fais défiler vers la droite.
2. Clique dessus, tape `Recette <date du jour>`, puis appuie sur Entrée.
3. Sur la page du cocon, clique sur la carte **« Cerveau »**.
4. Remplis les 5 étapes : Cible, Douleur, Angle, Promesse, CTA. Pour chacune :
   - écris dans le champ « Décrivez... » ;
   - clique **« Valider ▾ »**, puis **« Mon texte »** ;
   - clique **« Suivant »**.
5. À la 5ᵉ étape, le bouton devient **« Terminer le brainstorm »** : clique-le. Sans ce clic, la Rédaction restera verrouillée.
6. L'étape « Articles » montre deux blocs l'un sous l'autre :
   - **en haut, « Construire le cocon »** : c'est lui qui crée les vrais articles. Il dit « Ce cocon n'a pas encore de pilier. Commencez par lui… » ;
   - **en dessous, « Carte indicative du cocon »** : un aperçu, qui ne crée rien.

   Clique **« Créer le pilier »** en haut. Ou bien, dans la carte, ouvre le menu **« Générer avec Claude ▾ »** et choisis **« Le pilier, puis un article à la fois »** : c'est le même chemin.
7. Dans le panneau « Le pilier du cocon » :
   - attends la fin de « Recherche de mots-clés candidats, puis mesure de leurs données réelles… » ;
   - choisis un mot-clé dans la liste ;
   - vérifie le titre, puis clique **« Créer l'article »**.

**Tu dois voir :**
- tant que le pilier n'existe pas, **un seul** bouton de création dans « Construire le cocon » : « Créer le pilier » ;
- dans le menu « Générer avec Claude ▾ », deux choix. « La carte complète du cocon » dessine l'aperçu de tout le cocon, mais **ne crée aucun article** ;
- une fois le pilier créé, le choix « Le pilier, puis un article à la fois » est **grisé** et dit « Le pilier existe déjà : chaque article suivant naît d'une section, dans « Construire le cocon ». » ;
- ensuite, le pilier avec le badge « Pilier », l'état « À rédiger », et « Pas encore de section : elles apparaissent quand sa structure est validée ou son texte rédigé ».

**C'est un bug si :**
- on peut créer un autre article avant le pilier ;
- « La carte complète du cocon » fait apparaître des articles dans « Construire le cocon » ;
- un candidat « Non mesuré » peut être choisi.

### Étape 2 — L'ordre des onglets du Moteur

**Ce que ça protège :** le nouvel onglet **Structure** (chantier C6), placé entre Lieutenants et Lexique.

**Gestes :**
1. Reviens sur la page du cocon et clique sur la carte **« Moteur »**.
2. Ouvre **« Articles suggérés »**, puis clique sur le titre du pilier.

**Tu dois voir :**
- en haut, trois groupes d'onglets : « 1 Générer » (Discovery, Radar), « 2 Valider » (Capitaine, Lieutenants, **Structure**, Lexique), « 3 Finaliser » (Finalisation) ;
- en bas, un bouton **« Continuer vers <onglet suivant> → »** : depuis Lieutenants, il dit « Continuer vers Structure → ».

**C'est un bug si :**
- Structure manque ou n'est pas entre Lieutenants et Lexique ;
- le bouton du bas nomme le mauvais onglet.

### Étape 3 — Le Capitaine et l'alarme 🟠

**Ce que ça protège :** on ne verrouille plus un mot-clé risqué sans le savoir.

**Gestes :**
1. Onglet **Capitaine**. Dans « Tester un mot-clé capitaine… », tape un mot-clé absurde, par exemple `zqxw plomberie kvj`, puis appuie sur Entrée.
2. Attends que la carte ait fini sa « Validation… ».
3. Clique sur le **cadenas** de la carte (infobulle « Verrouiller »).

**Tu dois voir :**
- une alarme « Avant de verrouiller le capitaine » avec un point 🟠 : « Google ne suggère pas cette requête quand on commence à la taper » ;
- une case « J'ai lu » et un bouton « J'ai lu, je continue » ;
- après avoir coché la case et cliqué, la carte verrouillée.

**Ensuite,** déverrouille ce mot-clé et verrouille à la place un mot-clé sensé pour ton pilier, par exemple le capitaine choisi à l'étape 1.

**C'est un bug si :**
- le cadenas verrouille sans alarme, **alors que tu as internet**. Sans connexion, l'appel à Google échoue, et l'outil ne signale rien ;
- le bouton reste grisé alors que la case est cochée.

> **En MOCK, impossible d'obtenir l'alarme 🔴 « 0 recherche par mois » par l'écran.** Le bac à sable renvoie les mêmes volumes pour tous les mots-clés. Le 🔴 et la règle des 20 caractères se testent à l'étape 4.

### Étape 4 — Lieutenants et Structure : l'alarme 🔴

**Ce que ça protège :** un pilier a besoin d'au moins 3 lieutenants, et une dérogation doit être **justifiée**.

**Gestes :**
1. Onglet **Lieutenants**.
   - Si une invite « Charger… » apparaît, clique le bouton « DB ».
   - Sinon, clique **« Analyser SERP »** et attends les propositions.
2. Coche **une seule** proposition.
3. Un bandeau apparaît : « Étape non validée. 1 lieutenant pour un article Pilier : le minimum conseillé est 3. » Clique **« Voir pourquoi / décider »**.
4. Dans l'alarme 🔴, choisis une catégorie dans « Pourquoi passer outre ? », puis tape dans « Votre raison » une phrase de **19 caractères**, par exemple `Mot-clé très locale`.
5. Ajoute un point final, pour passer à **20 caractères**.
6. Clique **« Je prends la responsabilité et je continue »**. Tu assumes ce choix : la dérogation est enregistrée, et tu la reverras à l'étape 10.
7. Onglet **Structure** : clique **« Générer la structure »**, puis **« Valider la structure »**.
8. *(Facultatif, pour voir un refus.)* Reviens au Cerveau, étape « Articles ». Les sections du pilier sont apparues, mais le bouton « Créer l'article de cette section » est **grisé**, avec en orange : « Validez d'abord le premier jet de « … » : un article ne naît que d'un parent rédigé ».

**Tu dois voir :**
- à 19 caractères, le compteur « 19 / 20 » en rouge et le bouton « Je prends la responsabilité et je continue » **grisé** ;
- à 20 caractères, avec une catégorie choisie, le bouton **actif** ;
- après ton clic, l'étape Lieutenants validée ;
- une structure H1/H2/H3 qui reprend le lieutenant retenu, puis validée. Si une alarme s'ouvre, lis-la et réponds-y.

**C'est un bug si :**
- on peut valider avec moins de 20 caractères ou sans catégorie ;
- avec 3 lieutenants cochés, le bandeau reste affiché (essaie-le sur un autre article, si tu veux).

### Étape 5 — Le Lexique

**Ce que ça protège :** le lexique ne garde que des mots du métier, sans mots vides ni morceaux de menu.

**Gestes :**
1. Onglet **Lexique**. Clique **« Extraire le Lexique »**.
2. Si le message « Le scrape SERP n'est pas encore disponible » apparaît, lance l'analyse proposée, puis confirme.
3. Coche au moins un terme.

**Tu dois voir :**
- trois listes (Obligatoire, Differenciateur, Optionnel), sans « être », « votre », « vos », « nos », « cookies », « mentions » ni « newsletter » ;
- aucun terme coché d'avance : c'est toi qui choisis.

**C'est un bug si :** un de ces mots apparaît.

> **En MOCK, les termes sont peu représentatifs, voire absents** : les pages analysées viennent du bac à sable. Cette vérification n'a de vrai sens qu'en RÉEL (voir plus bas).

### Étape 6 — La Rédaction : le premier jet

**Ce que ça protège :** l'article s'écrit d'un trait, et il ne sert de parent qu'une fois son premier jet accepté.

**Gestes :**
1. Depuis l'arbre du Cerveau (lien « Le rédiger »), ou depuis la page du cocon puis « Rédaction » et la carte de l'article.
2. Bloc « Micro-contexte article » : remplis au moins « Angle differenciant ».
3. Clique **« Valider le sommaire »**, puis **« Continuer vers l'Article »**.
4. Clique **« Générer l'article »**.

**Tu dois voir :**
- pendant l'écriture, « Section n/N » avec le titre du chapitre (en MOCK, ça défile très vite) ;
- à la fin, le bouton « Régénérer l'article » ;
- le message « ✓ Premier jet accepté : l'article peut donner naissance à ses articles enfants dans le cocon. »
- Si une alarme « Avant d'accepter le premier jet » s'ouvre, lis-la. Si tu l'annules, le bouton **« Valider le premier jet »** reste disponible.

**C'est un bug si :**
- la génération s'arrête sans message ;
- l'article reste bloqué sans alarme ni bouton pour le valider.

> **En MOCK, le texte ne contient aucun chiffre** : tu ne verras pas de « [à sourcer : …] ». En RÉEL, un chiffre sans source apparaît surligné en orange, sous la forme « [à sourcer : …] ».

### Étape 7 — Retour au Cerveau : un enfant naît d'une section

**Ce que ça protège :** chaque article enfant naît d'une section (H2) de son parent déjà rédigé.

**Gestes :**
1. Reviens au Cerveau, étape « Articles ». L'arbre se recharge à l'ouverture de cette étape.
2. Sous une section du pilier, clique **« Créer l'article de cette section »**.
3. Choisis un mot-clé mesuré, puis clique **« Créer l'article »**.

**Tu dois voir :**
- le pilier à l'état « Rédigé », avec ses sections ;
- le bouton de section **actif**, alors qu'il était grisé avant l'étape 6 (point 8 de l'étape 4) ;
- après création, la section qui montre le lien vers l'enfant, à l'état « À rédiger ».

**C'est un bug si :** on peut créer un enfant sous un pilier dont le premier jet n'est pas accepté.

### Étape 8 — Enrichir

**Ce que ça protège :** chaque ajout (sources, exemples, tableaux…) se propose chapitre par chapitre, et c'est toi qui acceptes.

**Gestes :**
1. Dans la Rédaction, clique **« Enrichir »** dans la barre SEO / GEO / Maillage / Enrichir.
2. Lance la passe **« Exemples »**.
3. Sur une carte de chapitre, ouvre « Comparer avant / après », puis clique **« Accepter »**. Sur une autre, clique **« Refuser »**.
4. Lance la passe **« Images »** et accepte une proposition : elle servira à l'étape 10.

**Tu dois voir :**
- « Rien ne change dans l'article tant que vous n'acceptez pas » ;
- des statuts par chapitre : « à relire », « acceptée », « refusée » ;
- le texte modifié seulement pour les chapitres acceptés.

En MOCK, « Sources » répond « Aucun passage à sourcer… : rien à chercher », et « Résumer » répond « Aucun chapitre n'a encore donné naissance à un article » tant que tu n'as pas fait l'étape 7. C'est normal.

**C'est un bug si :**
- un chapitre refusé est quand même modifié ;
- « Accepter » ne change rien.

### Étape 9 — Le maillage : un lien retiré disparaît partout

**Ce que ça protège :** la liste des liens suit le texte. Avant, un lien effacé restait dans la matrice (bug trouvé par la recette réelle C8).

**Gestes :**
1. Dans la Rédaction, clique **« Éditer l'article »**. Arrive-y en cliquant, **sans recharger la page** (voir « Limites connues »).
2. Sélectionne quelques mots du texte. Dans la petite barre qui apparaît, clique **« ✦ »**, puis **« 🔗 Lien interne »** (groupe « Structure »).
3. Dans « Choisir l'article cible », clique l'article enfant créé à l'étape 7.
4. Sur l'accueil, bouton **« Maillage »** : la matrice montre une case colorée entre le pilier et l'enfant.
5. Reviens dans l'éditeur. **Efface les mots liés** : le bouton 🔗 de la barre ne retire pas ce type de lien. Puis clique **« Sauvegarder »**, ou Ctrl+S.
6. Recharge la page « Maillage ».

**Tu dois voir :** la case disparue après la sauvegarde.

**C'est un bug si :** la case reste alors que le lien n'est plus dans le texte.

### Étape 10 — La publication et ses dérogations

**Ce que ça protège :**
- à la publication, tu revois toutes tes dérogations ;
- un défaut ⛔ bloque la publication.

**Gestes :**
1. Dans l'éditeur, clique **« Visualiser l'article »**. Le bouton n'apparaît que si le texte, le titre SEO et la description SEO existent. Un nouvel onglet s'ouvre.
2. Clique **« Exporter HTML »**.

**Tu dois voir :**
- l'alarme « Avant de publier » ;
- en ⛔ : « 1 image encore à fournir (place réservée par la passe images) » (étape 8), et le bouton **« Correction nécessaire »** grisé ;
- en 🟠, avec une case « J'ai lu » : ta dérogation de l'étape 4, sous la forme « Dérogation posée … : Mot-clé très locale. ». Si les données qu'elle couvrait avaient changé depuis, elle reviendrait à son niveau d'origine (🔴), et il faudrait la justifier à nouveau ;
- après « Revenir corriger » : « Publication annulée : corrigez les points signalés, puis exportez à nouveau. » Rien n'est téléchargé.

**Pour finir :**
1. Dans l'éditeur, clique l'image, puis 📷 « Remplacer l'image ». Donne une adresse, par exemple `/images/test.jpg`, et un texte alternatif.
2. Exporte à nouveau.
3. Coche les « J'ai lu ». Le fichier `article-<id>.html` se télécharge, et l'article passe « publié ».

**C'est un bug si :**
- l'export se fait malgré un ⛔ ;
- une dérogation passée n'est pas réaffichée.

---

## À vérifier en mode RÉEL (payant)

Trois choses ne se voient pas en MOCK, parce que les données y sont factices :

1. **Le lexique** (étape 5) : des termes du métier, sans mots vides.
2. **Les chiffres sans source** (étape 6) : ils apparaissent en « [à sourcer : …] ».
3. **La qualité du texte** : français, longueur tenue, sans répétitions.

**Sans rien payer**, tu peux déjà lire le pilier **#1030**, produit en RÉEL par la recette C8 : il a passé la porte de publication sans aucune dérogation.

Pour un essai payant :
- passe le bouton en **RÉEL** et refais les étapes 1 à 6 sur un nouveau cocon ;
- chaque action payante affiche son coût avant de partir, par exemple « ~$0.003 » pour l'analyse SERP ;
- repasse en **MOCK** à la fin.

## Après la recette

- **Supprimer le cocon de test :** l'écran ne sait pas supprimer un cocon. Demande-le à Claude : il sauvegarde la base, puis supprime les articles avant le cocon.
- **Signaler les ❌** avec le numéro de l'étape et une capture d'écran.

## Limites connues de l'écran

Relevées en écrivant cette recette ; aucune ne bloque le parcours.

- **Liste vide dans l'éditeur après un rechargement (à confirmer).** La liste des articles à lier n'est chargée que par la page du cocon ou la page Rédaction. Ouvert directement par son adresse, l'éditeur afficherait « Aucun article disponible dans ce cocon. » (`ArticleEditorView.vue`, `ArticlePicker.vue`).
- **La méta ne se modifie pas à l'écran.** Le titre et la description SEO s'affichent, mais ne s'éditent pas (`ArticleMetaDisplay.vue`).
- **Le 🔴 « volume nul » du Capitaine ne se reproduit pas en MOCK.** Le test navigateur force la base à 0 (`tests/browser-e2e/gates.browser.test.ts`).
- **Deux gestes n'ont aucun test navigateur** : le bouton « Continuer vers … » et le retrait d'un lien interne. Ils sont couverts par des tests unitaires et d'intégration.

## Sources

- Tests navigateur :
  - `tests/browser-e2e/parcours/bout-en-bout.parcours.test.ts`
  - `tests/browser-e2e/parcours/cerveau.parcours.test.ts`
  - `tests/browser-e2e/gates.browser.test.ts`
  - `tests/browser-e2e/enrichment.browser.test.ts`
  - `tests/browser-e2e/helpers/moteur-ui.ts`
  - `tests/browser-e2e/helpers/cocoon-builder-ui.ts`
- Composants :
  - `src/components/shared/GateAlarm.vue`
  - `src/components/production/brain/CocoonTreeBuilder.vue`
  - `src/views/MoteurView.vue`
  - `src/components/panels/EnrichmentPanel.vue`
  - `src/views/ArticlePreviewView.vue`
- Vérificateurs : `shared/verifiers/` (`gate.ts`, `captain.ts`, `lieutenants.ts`, `draft.ts`, `publish.ts`).
