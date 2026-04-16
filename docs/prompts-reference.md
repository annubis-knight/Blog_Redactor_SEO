# Référence des Prompts — Blog Redactor SEO

Ce document liste tous les fichiers de prompts utilisés par l'application, organisés par domaine fonctionnel.

---

## Prompt système (global)

| Prompt | Rôle | Utilisé par |
|---|---|---|
| `system-propulsite.md` | Définit le "personnage" de Claude : ton de voix, règles d'écriture, standards SEO/GEO. Utilisé comme prompt système dans **toutes** les générations | Toutes les routes `/generate/*` |

---

## Mots-clés & Stratégie (22 prompts)

Phase de **préparation** : recherche des bons mots-clés, construction de la stratégie, organisation du cocon sémantique.

### Découverte & Analyse de mots-clés

| Prompt | Rôle | Route / Déclencheur |
|---|---|---|
| `pain-translate.md` | Transforme un problème client en mots-clés Google (short/medium/long-tail) | `/keywords/translate-pain` |
| `intent-keywords.md` | Génère 20 mots-clés courts à partir du titre pour chercher les "People Also Ask" | Service `keyword-radar` |
| `capitaine-ai-panel.md` | Expert SEO : analyse les candidats au mot-clé principal avec recommandations | `/keywords/:keyword/ai-panel` |
| `propose-lieutenants.md` | Propose des mots-clés secondaires (lieutenants) basés sur SERP et PAA | `/keywords/:keyword/propose-lieutenants` |
| `lexique-suggest.md` | Génère le champ sémantique du mot-clé (termes LSI attendus par Google) | `/keywords/lexique-suggest` |
| `lexique-ai-panel.md` | Analyse les termes TF-IDF : obligatoires, différenciants, optionnels | `/keywords/:keyword/ai-lexique` |
| `lexique-analysis-upfront.md` | Analyse préliminaire du lexique avant la rédaction | `/keywords/:keyword/ai-lexique-upfront` |
| `lieutenants-hn-structure.md` | Recommande une structure H2/H3 optimisée pour les lieutenants choisis | `/keywords/:keyword/ai-hn-structure` |

### Stratégie

| Prompt | Rôle | Route / Déclencheur |
|---|---|---|
| `strategy-suggest.md` | Conseils stratégiques selon le type d'article (Pilier, Intermédiaire, Spécialisé) | `/generate/micro-context-suggest` |
| `strategy-deepen.md` | Approfondit une question stratégique en ajoutant des sous-questions | Workflow stratégie interne |
| `strategy-consolidate.md` | Fusionne réponse principale + sous-réponses en texte stratégique complet | Workflow stratégie interne |
| `strategy-merge.md` | Fusionne deux réponses stratégiques (ex: combiner 2 cocons) | Workflow cocon interne |
| `strategy-enrich.md` | Enrichit un texte stratégique avec des sous-réponses validées | Workflow stratégie interne |

### Cocon sémantique

| Prompt | Rôle | Route / Déclencheur |
|---|---|---|
| `cocoon-brainstorm.md` | Brainstorme des idées d'articles pour un cocon sémantique | Planification du cocon |
| `cocoon-paa-queries.md` | Propose des requêtes Google réalistes pour récupérer les PAA | Découverte PAA |
| `cocoon-articles.md` | Propose la liste complète des articles du cocon (pilier + intermédiaire + spécialisé) | Architecture du cocon |
| `cocoon-articles-topics.md` | Propose les articles thématiques intermédiaires | Planification cocon |
| `cocoon-articles-spe.md` | Propose les articles spécialisés/niche | Planification cocon |
| `cocoon-add-article.md` | Recommande si un article doit être ajouté au cocon et à quelle position | Gestion du cocon |

### Configuration & Contexte

| Prompt | Rôle | Route / Déclencheur |
|---|---|---|
| `theme-parse.md` | Transforme une description libre ("je suis plombier à Toulouse") en config JSON structurée | Configuration initiale |
| `micro-context-suggest.md` | Suggère l'angle, le ton, les directives et le word count pour un article | Préparation de l'article |
| `brief-ia-panel.md` | Analyse le brief complet et donne des recommandations stratégiques au rédacteur | Panneau IA du brief |

---

## Génération d'article (6 prompts)

Phase d'**écriture** : génération du contenu, réduction, humanisation.

| Prompt | Rôle | Route / Déclencheur |
|---|---|---|
| `generate-outline.md` | Génère le plan de l'article (titres H2/H3) en JSON structuré | `POST /generate/outline` — Bouton "Générer le plan" |
| `generate-article-section.md` | Écrit le contenu HTML d'une section (intro, corps ou conclusion) avec budget de mots indicatif | `POST /generate/article` — Appelé N fois, une fois par section |
| `generate-meta.md` | Génère le meta title (≤60 cars) et la meta description (≤160 cars) | `POST /generate/meta` — Automatique après génération |
| `generate-reduce.md` | Réduit l'article pour atteindre le word count cible en gardant structure et SEO | `POST /generate/reduce` — Bouton "Réduire l'article" |
| `humanize-section.md` | Enlève les marqueurs IA (phrases trop lisses, transitions robotiques) section par section | `POST /generate/humanize-section` — Bouton "Humaniser l'article" |
| `generate-article.md` | Orchestration de la génération complète (utilisé conjointement avec `generate-article-section.md`) | `POST /generate/article` |

---

## Actions contextuelles (12 prompts)

Mini-éditions disponibles dans l'éditeur, déclenchées via le menu contextuel sur du texte sélectionné. Toutes passent par la route `POST /generate/action` avec un paramètre `actionType`.

| Prompt | Rôle | Action dans l'éditeur |
|---|---|---|
| `actions/reformulate.md` | Reformule le texte sélectionné en gardant le même sens et la même longueur | "Reformuler" |
| `actions/simplify.md` | Simplifie le vocabulaire pour être plus accessible | "Simplifier" |
| `actions/convert-list.md` | Transforme un paragraphe en liste à puces HTML | "Convertir en liste" |
| `actions/pme-example.md` | Génère un exemple concret PME avec le pattern "Grande marque → PME" | "Exemple PME" |
| `actions/keyword-optimize.md` | Réécrit le texte en intégrant le mot-clé naturellement | "Optimiser mot-clé" |
| `actions/add-statistic.md` | Ajoute une statistique sourcée ("selon Source, Année") | "Ajouter statistique" |
| `actions/answer-capsule.md` | Synthétise en 20-25 mots pour l'extraction IA (GEO) | "Capsule réponse" |
| `actions/question-heading.md` | Transforme un titre en question naturelle optimisée GEO | "Titre → Question" |
| `actions/localize.md` | Ajoute des références locales Toulouse/Occitanie | "Localiser" |
| `actions/sources-chiffrees.md` | Génère un bloc "Sources chiffrées" avec stats vérifiées et URLs (recherche web) | "Sources chiffrées" |
| `actions/exemples-reels.md` | Génère un bloc "Exemples réels" avec cas concrets et URLs (recherche web) | "Exemples réels" |
| `actions/ce-quil-faut-retenir.md` | Génère un bloc "Ce qu'il faut retenir" avec 3-5 points clés techniques | "À retenir" |

---

## Résumé

| Domaine | Nombre de prompts |
|---|---|
| Système (global) | 1 |
| Mots-clés & Stratégie | 22 |
| Génération d'article | 6 |
| Actions contextuelles | 12 |
| **Total** | **41** |
