# Guide 2 — Architecture : où chercher l'information

> La carte du projet. Quel dossier contient quoi, qui parle à qui, et dans quel
> ordre les choses se passent.
> Objectif : que tu saches **où regarder** quand tu te poses une question.

---

## 1. La maison en quatre étages

```mermaid
flowchart TD
  U["Toi"] --> FRONT["src/<br/>l'application web<br/>(ce que tu vois)"]
  U --> CLI["scripts/auto-article/<br/>le robot"]
  FRONT --> API["server/routes/<br/>le comptoir d'accueil"]
  CLI --> API
  API --> SVC["server/services/<br/>les ateliers<br/>(le vrai travail)"]
  SVC --> DB[("PostgreSQL<br/>la mémoire")]
  SVC --> EXT["APIs externes<br/>IA + DataForSEO"]
  SHARED["shared/<br/>le langage commun"] -.-> FRONT
  SHARED -.-> API
  SHARED -.-> CLI
```

Image : un restaurant.

| Étage | Dossier | Rôle |
|---|---|---|
| **La salle** | `src/` | Ce que tu vois et cliques. Ne cuisine rien. |
| **Le comptoir** | `server/routes/` | Prend la commande, vérifie qu'elle est valide, la transmet. Ne cuisine pas non plus. |
| **La cuisine** | `server/services/` | Fait le travail : calculs, appels IA, requêtes en base. |
| **Le garde-manger** | PostgreSQL | Tout ce dont on se souvient. |
| **Le dictionnaire** | `shared/` | Les mots et les règles que tout le monde partage. |

**Règle d'or du projet** : `src/` ne doit **jamais** appeler `server/` directement.
Tout passe par des requêtes HTTP. C'est pour ça que le robot a pu être ajouté
sans rien dupliquer : il est juste un troisième client du comptoir.

---

## 2. Le chemin d'une action, de bout en bout

Exemple : tu cliques sur « Valider le Capitaine ».

```mermaid
sequenceDiagram
  participant V as Composant Vue<br/>CaptainPanel
  participant S as Store Pinia<br/>article-keywords
  participant W as Wrapper API<br/>api.service.ts
  participant R as Route Express
  participant SV as Service
  participant DB as PostgreSQL

  V->>S: action validerCapitaine()
  S->>W: apiPost /articles/12/keywords
  W->>R: POST /api/articles/12/keywords
  R->>R: vérifie les données (Zod)
  R->>SV: appelle le service
  SV->>DB: écrit dans article_keywords
  DB-->>SV: ok
  SV-->>R: résultat
  R-->>W: réponse enveloppée dans data
  W-->>S: data déplié
  S-->>V: l'écran se met à jour
```

**Les quatre règles que suit ce chemin :**

1. Un composant Vue ne fait **jamais** `fetch` lui-même. Il passe par un store ou
   un composable, qui utilise le wrapper.
2. Le wrapper unique est `src/services/api.service.ts`. Il expose `apiGet`,
   `apiPost`, `apiPut`, `apiPatch`, `apiDelete`, `apiStream`.
3. Les réponses du serveur sont toujours emballées dans `{ data: ... }`, et le
   wrapper déballe automatiquement (`return json.data`).
4. L'adresse est **relative** : `fetch('/api' + chemin)`. C'est le proxy de Vite
   qui redirige `/api` du port 5400 vers le port 3400
   (`vite.config.ts`). Aucune URL de serveur n'est écrite en dur.

---

## 3. Où vit quoi : le tableau à consulter

| Ma question | Le dossier à ouvrir |
|---|---|
| « À quoi ressemble cet écran ? » | `src/views/` (13 pages) |
| « Où est ce bouton / ce panneau ? » | `src/components/<domaine>/` |
| « Où est stockée cette donnée côté écran ? » | `src/stores/<domaine>/` |
| « Où est cette logique réutilisable ? » | `src/composables/<domaine>/` |
| « Quelle adresse appelle le serveur ? » | `server/routes/*.routes.ts` |
| « Où se fait le vrai calcul ? » | `server/services/<domaine>/` |
| « Comment on parle à l'IA ? » | `server/prompts/*.md` |
| « Quelle est la forme de cette donnée ? » | `shared/types/` et `shared/schemas/` |
| « Comment le robot décide-t-il ? » | `scripts/auto-article/heuristics/` |
| « Quelles tables existent ? » | `server/db/schema.sql` |

---

## 4. L'application web (`src/`)

### Les 13 écrans et leur route

| Route | Écran | Ce que tu y fais |
|---|---|---|
| `/` | `DashboardView` | Vue d'ensemble des silos, création de cocon. |
| `/config` | `ThemeConfigView` | La carte d'identité de PropulSite. |
| `/silo/:siloId` | `SiloDetailView` | Les stats d'un silo et ses cocons. |
| `/cocoon/:cocoonId` | `CocoonLandingView` | Choisir l'atelier : Cerveau, Moteur ou Rédaction. |
| `/cocoon/:id/cerveau` | `CerveauView` | La stratégie du cocon et la génération du plan d'articles. |
| `/cocoon/:id/moteur` | `MoteurView` | Les 6 onglets de recherche de mots-clés. |
| `/cocoon/:id/redaction` | `RedactionView` | La liste des articles du cocon. |
| `/cocoon/:id/article/:articleId` | `ArticleWorkflowView` | Brief, plan, génération de l'article et des metas. |
| `/article/:id/editor` | `ArticleEditorView` | L'éditeur de texte avec sauvegarde auto. |
| `/article/:id/preview` | `ArticlePreviewView` | L'aperçu au gabarit PropulSite + export. |
| `/linking` | `LinkingMatrixView` | La matrice des liens internes et les articles orphelins. |
| `/post-publication` | `PostPublicationView` | Les performances Google Search Console. |

### Les stores : la mémoire de l'écran

Un **store** garde une donnée en mémoire pendant que tu navigues, pour éviter de
tout redemander au serveur. Comme le plateau sur lequel le serveur pose les
assiettes en salle. Ils sont rangés par domaine dans `src/stores/` :

| Store | Ce qu'il retient |
|---|---|
| `article/articles.store.ts` | La liste des articles du cocon. |
| `article/article-progress.store.ts` | Les cases cochées (les 5 checks). |
| `article/article-keywords.store.ts` | Capitaine, Lieutenants, Lexique verrouillés. |
| `article/editor.store.ts` | **L'article en cours d'écriture** : texte, metas, progression. |
| `article/outline.store.ts` | Le sommaire, avec annuler/refaire. |
| `article/seo.store.ts` et `geo.store.ts` | Les scores SEO et GEO. |
| `strategy/strategy.store.ts` | La stratégie d'un article (6 étapes). |
| `strategy/cocoon-strategy.store.ts` | La stratégie d'un cocon (5 étapes). |
| `strategy/theme-config.store.ts` | La configuration du thème. |
| `keyword/linking.store.ts` | Le maillage : matrice, suggestions, orphelins. |
| `ui/cost-log.store.ts` | Le compteur de dépenses IA en direct. |
| `ui/runtime-mode.store.ts` | Le mode simulé ou réel. |

> Il n'existe **pas** de store « article courant ». L'article est identifié par
> l'adresse de la page (`:articleId`), et son contenu vit dans `editor.store.ts`.

### Les composables : les outils réutilisables

Un **composable** est une boîte à outils qu'un écran peut emprunter. Les plus utiles :

| Composable | Rôle |
|---|---|
| `seo/useInternalLinking.ts` | Pose les liens internes dans le texte. |
| `seo/useSeoScoring.ts` / `useGeoScoring.ts` | Recalculent les scores pendant que tu écris. |
| `seo/useCannibalization.ts` | Alerte si deux articles visent le même mot-clé. |
| `article/useArticleGeneration.ts` | Orchestre la génération de l'article. |
| `editor/useStreaming.ts` | Reçoit le texte de l'IA au fil de l'eau. |
| `editor/useAutoSave.ts` | Sauvegarde automatique. |
| `moteur/useFinalisationGating.ts` | Débloque la Rédaction quand les 3 verrous sont posés. |
| `keyword/useRelevanceScoring.ts` | Note la pertinence des mots-clés trouvés. |

---

## 5. Le serveur (`server/`)

```mermaid
flowchart LR
  REQ["Requête<br/>/api/..."] --> ROUTE["routes/<br/>vérifie (Zod)"]
  ROUTE --> SERVICE["services/<br/>fait le travail"]
  SERVICE --> CACHE{"Déjà connu ?"}
  CACHE -->|oui| DB[("PostgreSQL")]
  CACHE -->|non| EXT["API externe<br/>payante"]
  EXT --> DB
  SERVICE --> PROMPT["prompts/*.md<br/>si l'IA est appelée"]
```

Toutes les routes sont montées sous `/api` (`server/index.ts`).

### Les services, rangés par métier

| Dossier | Ce qu'on y trouve |
|---|---|
| `services/keyword/` | Tout ce qui touche aux mots-clés : découverte, radar, scan Capitaine, Lieutenants, lexique, TF-IDF. |
| `services/external/` | Les portes vers l'extérieur : `ai-provider.service.ts` (Claude/Gemini/OpenRouter/Mock), `dataforseo.service.ts`, `gsc.service.ts`. |
| `services/article/` | Contenu, export HTML, maillage interne, nombre de mots cible. |
| `services/strategy/` | Stratégie d'article, stratégie de cocon, configuration du thème. |
| `services/intent/` | L'intention derrière une recherche (acheter ? apprendre ?). |
| `services/infra/` | Les caches, le mode simulé/réel, les données locales. |
| `services/queries/` | Les requêtes en base regroupées. |

> **Toute** requête vers une IA passe par `ai-provider.service.ts`. C'est le seul
> point de passage : on peut ainsi changer de fournisseur sans toucher au reste.

### Les prompts : le cahier des charges donné à l'IA

Les prompts sont des fichiers Markdown dans `server/prompts/`. Ce sont des
lettres de consignes, avec des trous `{{...}}` remplis automatiquement.

| Fichier | Sert à |
|---|---|
| `system-propulsite.md` | Le socle : identité, ton, règles SEO, formulations interdites. Injecté partout. |
| `generate-outline.md` | Fabriquer le sommaire. |
| `generate-article-section.md` | Écrire une section. |
| `generate-meta.md` | Écrire le titre et la description Google. |
| `cocoon-articles*.md` | Proposer la famille d'articles d'un cocon. |
| `strategy-*.md` | Aider à remplir les étapes de stratégie. |
| `auto-intake.md` | Transformer ton idée floue en brief (utilisé par le robot). |
| `auto-placement.md` | Décider dans quel cocon ranger un article. |

> **Règle absolue** : on ne met jamais de contexte en dur dans un prompt.
> Le contexte arrive par les variables `{{...}}`.

---

## 6. La base de données : la mémoire

25 tables. Voici les relations principales :

```mermaid
erDiagram
  silos ||--o{ cocoons : "contient"
  cocoons ||--o{ articles : "contient"
  cocoons ||--|| cocoon_strategies : "a sa stratégie"
  articles ||--|| article_content : "son texte"
  articles ||--|| article_keywords : "ses mots-clés"
  articles ||--|| article_strategies : "sa stratégie"
  articles ||--o{ internal_links : "ses liens"
```

### Les tables à connaître

| Table | Ce qu'elle garde | Lignes (19/09/2026) |
|---|---|---|
| `silos` | Les rayons du blog. | 4 |
| `cocoons` | Les étagères, rattachées à un silo. | 8 |
| `articles` | La fiche d'identité de chaque article : titre, niveau, statut, adresse, cases cochées, Capitaine verrouillé, douleur. | 67 |
| `article_content` | Le texte et le sommaire. | 12 |
| `article_keywords` | Capitaine, Lieutenants, Lexique, structure des titres. | 14 |
| `article_strategies` | Les 6 étapes du Cerveau, en JSON. | 13 |
| `cocoon_strategies` | La stratégie du cocon **et le plan d'articles** proposé. | 6 |
| `internal_links` | Le maillage : qui pointe vers qui, avec quelle ancre. | 36 |
| `theme_config` | La carte d'identité de PropulSite. | 1 |

### Les tables « mémoire d'achat » (ce qui t'évite de repayer)

| Table | Ce qu'elle garde | Lignes |
|---|---|---|
| `keyword_metrics` | **Le cache permanent** : volume, difficulté, CPC de chaque mot-clé déjà payé. | 3 184 |
| `keyword_autocomplete` | Les suggestions de complétion Google. | 8 570 |
| `keyword_paa_questions` | Les questions « Autres questions posées ». | 304 |
| `keyword_serp_results` / `keyword_serp_scrapes` | Les pages concurrentes et leur contenu. | 181 / 181 |
| `external_api_cache` | Le cache à durée limitée pour tout le reste. | 9 |

### Les tables « journal de bord »

`captain_explorations` (178), `paa_explorations` (681), `lexique_explorations` (13),
`radar_explorations` (1), `lieutenant_explorations` (0) : elles gardent l'historique
des essais, pour pouvoir revenir en arrière et comprendre une décision.

> ⚠️ `server/db/schema.sql` est une **photo de lecture** régénérée par
> `npm run db:snapshot`. Ce n'est pas un script d'installation : on ne peut pas le
> rejouer tel quel sur une base vide (les séquences n'y sont qu'en commentaire).

---

## 7. Le langage commun (`shared/`)

C'est le dictionnaire que le front, le serveur et le robot partagent. Si un mot
change ici, il change partout — d'où l'importance de ne pas y toucher à la légère.

| Dossier | Contenu |
|---|---|
| `shared/types/` | Les formes de données (30 fichiers) : à quoi ressemble un article, un mot-clé, un lien. |
| `shared/schemas/` | Les schémas Zod (14) : les videurs à l'entrée qui vérifient que la donnée est valide. |
| `shared/constants/` | Les valeurs figées : les 5 checks du Moteur, les cibles SEO et GEO. |
| `shared/score*.ts` | Les formules de score, partagées front et back. |

**Le fichier le plus important à connaître** : `shared/constants/workflow-checks.constants.ts`.
Il contient les 5 noms de cases à cocher. On ne doit **jamais** écrire
`'moteur:capitaine_locked'` à la main : on importe la constante.

**Deuxième fichier à connaître** : `shared/constants/site.constants.ts`. C'est la
seule source de vérité pour le domaine (`www.propulsitetoulouse.website`) et la forme
des adresses (`/blog/<slug>`). Changer de domaine = changer une ligne ici (ou poser
`SITE_URL` dans `.env` côté serveur).

**Les valideurs** vivent aussi dans `shared/` : `content-validators.ts` (le texte
est-il propre ?) et `seo-validators.ts` (l'article remplit-il son rôle SEO ?). Le
robot, l'export et `npm run verify` utilisent exactement les mêmes règles.

---

## 8. Le robot (`scripts/auto-article/`)

```mermaid
flowchart TD
  I["index.ts<br/>point d'entrée"] --> O["orchestrator.ts<br/>l'enchaînement"]
  O --> P1["phases/cerveau.ts"]
  O --> P2["phases/moteur.ts"]
  O --> P3["phases/redaction.ts"]
  O --> G["gate.ts<br/>les pauses"]
  P1 --> H["heuristics/<br/>les décisions"]
  P2 --> H
  I --> HTTP["http-client.ts<br/>parle au serveur"]
```

| Fichier | Rôle |
|---|---|
| `index.ts` | Lit les options, vérifie que le serveur répond, pose les questions. |
| `orchestrator.ts` | Enchaîne les 3 phases et les 2 pauses. Ne connaît ni le réseau ni le clavier. |
| `phases/` | Ce que fait chaque atelier, en appelant le serveur. |
| `heuristics/` | **Les décisions automatiques**, sans réseau : choix du Capitaine, des Lieutenants, du Lexique, de l'emplacement, détection de cannibalisation. |
| `tree.ts` | Dessine l'arbre SEO affiché au lancement. |
| `http-client.ts` | Les appels au serveur, y compris le texte reçu au fil de l'eau. |
| `report.ts` | Le récapitulatif de fin avec le coût. |

**Pourquoi c'est bien séparé** : les fichiers de `heuristics/` sont des fonctions
pures (même entrée, même sortie, aucun appel extérieur). C'est pour ça qu'ils sont
très testés — et c'est là qu'il faut aller pour changer une règle de décision.

Détail complet dans [docs/auto-article-cli.md](docs/auto-article-cli.md).

---

## 9. Les tests

| Dossier | Ce qu'il teste | Serveur nécessaire ? |
|---|---|---|
| `tests/unit/` (320 fichiers) | Des morceaux isolés : composants, services, calculs. | Non |
| `tests/functional/` (4) | Des enchaînements métier sans réseau. | Non |
| `tests/contract-api/` (11) | Que chaque adresse du serveur répond avec la bonne forme. | **Oui** |
| `tests/integration-tabs/` (12) | Un onglet de bout en bout. | **Oui** |
| `tests/e2e-workflows/` (6) | Des parcours complets. | **Oui** |
| `tests/integration/` (5) | Des services branchés sur la vraie base. | Base oui, serveur non |
| `tests/browser-e2e/` (15) | Un vrai navigateur (Playwright). | Oui (lancé automatiquement) |

> ⚠️ Les tests écrivent dans la **base de développement**. Il n'y a pas encore de
> base séparée pour les tests.

---

## 10. Où est la documentation

| Dossier | Contenu | Pour qui |
|---|---|---|
| `README.md` + `GUIDE-0*.md` | Le mode d'emploi, dont [GUIDE-04-OUTILS.md](GUIDE-04-OUTILS.md) pour les librairies et services. | Toi |
| `docs/` | Documentation technique : flux de données, cartographie IA, guide des tests, référence des prompts. | Développement |
| `_bmad-output/planning-artifacts/` | Le PRD (ce que fait le produit), le design registry (comment c'est conçu), l'architecture. | Décisions produit |
| `_bmad-output/implementation-artifacts/` | Les spécifications de chantier, les audits, le suivi de sprint. | Historique |
| `.claude/CLAUDE.md` | Les règles de travail données à l'IA développeuse. | L'assistant |
| `archive/` et les dossiers `_archive/` | Ancien contenu, gardé pour mémoire. | **Ne jamais lire comme vérité** |

**En cas de contradiction** : le code a toujours raison. La documentation décrit
l'intention, le code décrit la réalité.

---

## 11. Notes d'hygiène

- 29 fichiers `.bak` traînent dans `src/`. Ce sont d'anciennes versions laissées
  sur disque ; ils ne sont pas utilisés par le programme.
- `_auto-output/` et `data/_backup_*.sql` sont ignorés par git : ils n'existent que
  sur ton disque. Pense à les sauvegarder ailleurs.
- La photo de référence des tests (`tests/.baseline.json`) date de mai 2026 :
  à regénérer avec `npm run test:snapshot` après une session de réparation.
