# Crafting d'un super mot-clé Capitaine — guide utilisateur SEO

> **Public** : utilisateur du Moteur (consultant SEO solo).
> **Objectif** : comprendre comment passer de la liste brute des cards Radar à
> un mot-clé Capitaine fort, éventuellement longue-traîne avec mixage de racines
> et termes SEO local.
> **Source de vérité** : code dans `src/components/intent/`, `src/components/moteur/`
> et `src/composables/keyword/`. Mise à jour : **mai 2026**.

---

## 1. Vue d'ensemble du flux Radar → Capitaine

```
Onglet Radar                    Onglet Capitaine
─────────────                   ─────────────────
  Scan keywords          →      Réception cards
  → 25 cards triées      →      → Liste verticale
  → Cocher celles                → 1 carte = 1 entrée à valider
    qui t'intéressent             → Cliquer → side-panel KPIs
  → Bouton "Envoyer"     →      → Ajustements granulaires
                                  → Verrouillage final
```

Code :
- Émission : [DouleurIntentScanner.vue:108](../src/components/intent/DouleurIntentScanner.vue#L108) — `emit('cards-selected', selected)`
- Réception : [MoteurView.vue:418](../src/views/MoteurView.vue#L418) — `handleCardsSelected` qui bascule sur l'onglet Capitaine
- Pré-validation côté Capitaine : [useRadarCarousel.ts:138](../src/composables/keyword/useRadarCarousel.ts#L138) — `loadCards` valide chaque card en parallèle + ses racines

---

## 2. Onglet Radar — produire des candidats

### 2.1 Comment le scan marche

Tu cliques *"Scanner le radar"* avec :
- Le **keyword pilier** de l'article (ou de l'article courant)
- Le **point de douleur** de l'article (transmis automatiquement)

Le serveur :
1. Génère 25 candidats keywords via Claude (prompt [intent-keywords.md](../server/prompts/intent-keywords.md))
2. Pour chaque candidat : fetch DataForSEO (volume, KD, CPC, intent), scrape PAA, calcule des alignements sémantiques avec le painPoint
3. Calcule un `combinedScore` 0-100 par card (volume + douleur + PAA + autocomplete + intent + CPC)
4. Calcule un `globalScore` agrégé sur l'ensemble + un `heatLevel` (`brulante` ≥ 70 / `chaude` ≥ 45 / `tiede` ≥ 20 / `froide` < 20)
5. Génère un **verdict textuel** automatique selon le heatLevel — ex: *« Douleur d'urgence. Le sujet résonne fortement dans l'écosystème Google. »*

→ Tu vois apparaître :
- Un **thermomètre global** ([RadarThermometer.vue](../src/components/shared/RadarThermometer.vue)) avec score 0-100, icône, label, verdict
- Une **liste de cards triées** par `combinedScore` décroissant ([DouleurIntentScanner.vue:393-428](../src/components/intent/DouleurIntentScanner.vue#L393))

### 2.2 Comment le tri t'aide à choisir

Le tri par `combinedScore` met **en haut** les keywords qui sont :
- Volumiques (Volume DataForSEO)
- Atteignables (KD bas)
- Alignés douleur (Pain × Keyword + PAA × douleur)
- Confirmés par la SERP (PAA présents, autocomplete riches)
- Avec une bonne intent commerciale ou informationnelle selon le contexte

Concrètement : **pas besoin de lire les 25 cards à fond**. Les 5-10 premières contiennent déjà 80 % du signal utile.

### 2.3 Comment cocher

Chaque card a une **checkbox** ([RadarCardCheckable.vue](../src/components/intent/RadarCardCheckable.vue)). Tu coches celles qui te paraissent prometteuses (5 à 10 typiquement). Le bouton *"Envoyer au Capitaine ({{ count }})"* devient visible.

→ Stratégie recommandée :
- Coche **2-3 cards très volumiques** comme candidats marché
- Coche **2-3 cards racines** (mots simples genre *"agence référencement"*) qui te serviront de blocs de construction
- Coche **1-2 cards SEO local** si le sujet le permet (*"... toulouse"*, *"... paris"*)

---

## 3. Onglet Capitaine — 4 méthodes pour produire le mot-clé final

### Méthode A — Choix direct sans modification

Tu cliques une carte de la liste verticale → side-panel KPIs s'ouvre → tu cliques *"Valider ce Capitaine"*.

→ Le keyword retenu = celui de la card tel quel.

**Quand utiliser** : la card a déjà tout ce qu'il faut (volume, pertinence, ancrage). Pas besoin d'optimiser.

### Méthode B — Désactiver des mots pour explorer une racine

Sur une card avec **3 mots ou plus**, chaque mot du keyword est cliquable individuellement ([KeywordWords.vue](../src/components/intent/KeywordWords.vue)).

**Sanctuarisation** (mai 2026) : les **2 premiers mots significatifs** (non-stopwords) sont **non cliquables** (visuellement gras léger sans soulignement). Cela garantit que la racine sémantique principale du capitaine ne peut pas être cassée par accident.

Quand tu désactives un mot suivant :
1. Le composant émet `word-toggle` avec les indices restants
2. [`handleWordToggleAt`](../src/components/moteur/CaptainValidation.vue#L814) reconstitue la chaîne avec uniquement les mots actifs
3. Si cette racine est déjà pré-validée (présente dans `entry.rootVariants` du composable carousel) → **bascule instantanée** vers ses KPIs
4. Sinon → **validation à la volée** via `addRootVariantToEntry` ([useRadarCarousel.ts:243](../src/composables/keyword/useRadarCarousel.ts#L243))

→ La card affiche alors les KPIs de la **nouvelle racine**. Tu peux comparer en temps réel.

**Quand utiliser** : tu veux explorer si une version raccourcie de la card a de meilleurs KPIs. Exemple : *"agence référencement naturel paris"* (volume 50) → désactiver *"naturel"* → *"agence référencement paris"* (volume 200).

### Méthode C — Mixer des termes en saisie manuelle (le "super mot-clé")

C'est ici que se fait le vrai **mixage multi-racines + SEO local**.

Le composant **CaptainInput** ([CaptainValidation.vue:901-908](../src/components/moteur/CaptainValidation.vue#L901)) te laisse **taper librement** un keyword qui n'est dans aucune card.

Workflow :
1. Tu observes les radar cards → tu repères que *"agence référencement"* a un bon score (cohérent éditorialement) **et** que *"toulouse"* est un terme local performant pour ton article
2. Tu tapes dans l'input : `agence référencement toulouse`
3. Validation → [`carousel.addEntry()`](../src/composables/keyword/useRadarCarousel.ts#L189) :
   - Crée une nouvelle entry dans la liste verticale
   - Lance un appel `/keywords/:keyword/validate` qui te donne ses KPIs propres
   - Lance aussi [`validateRoots()`](../src/composables/keyword/useRadarCarousel.ts#L101) qui décompose ta chaîne et pré-valide chaque racine en parallèle (max 5 racines)

→ La card résultante porte **les vrais KPIs** de cette combinaison composée par toi. Tu vois immédiatement :
- Volume / KD / CPC du mot-clé entier
- Score Pertinence par rapport à la douleur de l'article
- Les racines internes qu'il contient (sidebar `CaptainRootsSidebar` à droite)

**C'est la mécanique principale pour créer un super mot-clé longue-traîne SEO local.**

### Méthode D — Tagger les modificateurs (Alt+clic)

Sur n'importe quelle card, **Alt+clic** sur un mot ([KeywordWords.vue:65-78](../src/components/intent/KeywordWords.vue#L65)) cycle son tag :
- `null` → `local` (couleur cyan italique) → `persona` (orange italique) → `null`

But : **signaler** que certains mots sont des modificateurs SEO local (*"toulouse"*, *"paris"*) ou des cibles persona (*"freelance"*, *"PME"*) qui **ne devraient pas être pris en compte dans les KPIs du keyword exact**, parce qu'ils diluent les métriques.

Stocké dans [keyword-modifiers.store.ts](../src/stores/article/keyword-modifiers.store.ts). Permet à l'utilisateur de **mémoriser** son intention pour le futur, et au scoring de pondérer correctement.

---

## 4. Exemple concret de "super mot-clé" longue-traîne SEO local

**Article** : *« Comment choisir une agence de référencement à Toulouse »*
**Douleur** : *« j'ai besoin d'un partenaire local qui connaît mon secteur »*

### Radar produit (extrait)

| Card | Volume | Pertinence | Note |
|---|---|---|---|
| *"agence référencement"* | 1500 | 75 | racine forte mais générique |
| *"agence référencement naturel"* | 800 | 70 | plus précis |
| *"référencement toulouse"* | 320 | 60 | ancrage local |
| *"agence seo paris"* | 2400 | 80 | hors-sujet géographique |

### Tu réfléchis

Aucune card seule n'est parfaite :
- La **#1** est trop générique (perd l'ancrage local)
- La **#3** manque le mot *"agence"* qui qualifie le service
- La **#4** est volumique mais sur la mauvaise ville

### Méthode C — tu tapes dans CaptainInput

```
agence référencement naturel toulouse
```

→ Le Capitaine valide → tu obtiens :
- Une **nouvelle entry** dans la liste avec ses KPIs propres (volume probablement faible mais pertinence haute)
- **Pré-validation des racines** : *"agence référencement"*, *"agence référencement naturel"* (chacune avec son score individuel)
- **Sidebar racines** à droite : tu vois la moyenne pondérée — si elle est forte (genre 70+/100), c'est un signal *« même si DataForSEO dit 50 recherches/mois pour la chaîne exacte, Google va te ranker grâce à la combinaison de racines fortes »*

### Méthode D — tu tagues les modificateurs

Alt+clic sur *"toulouse"* → tag `local`. Cela signale que ce mot est un modificateur géographique. Visuellement il devient cyan italique. Le scoring sait qu'il ne doit pas pénaliser le keyword sur l'absence de matches PAA "toulouse" exacts (puisque c'est un modificateur, pas un terme conceptuel).

### Sanctuarisation automatique

*"agence"* + *"référencement"* (les 2 premiers mots significatifs) sont visuellement **ancrés**, non cliquables. C'est ta garantie que tu ne casseras pas la racine sémantique principale en testant des combinaisons.

### Verrouillage final

Tu cliques *"Valider ce Capitaine"* sur cette entry. Elle devient le Capitaine de l'article et déclenche la phase Lieutenants.

---

## 5. Tips qui sortent du code

### 5.1 Pas de limite d'entries manuelles

Tu peux ajouter **autant d'entries manuelles que tu veux** dans la liste verticale. Pratique pour comparer 3-4 super mots-clés candidats côte-à-côte avant de choisir.

### 5.2 Les radar cards apportent les KPIs, regarde leurs racines avant

Les cards Radar incluent les KPIs DataForSEO ET le scoring de pertinence douleur. **Avant de taper ton super mot-clé**, regarde les **racines internes** des cards (visibles dans la sidebar `CaptainRootsSidebar` quand tu cliques une card en mode Capitaine). Tu sauras quels termes ont vraiment du volume.

### 5.3 Le `relevanceScore` inclut une composante racines

Cf. [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md). La pondération (mai 2026) est :
- Pain × Mot-clé : 30 %
- PAA × Douleur : 25 %
- AC × Douleur : 15 %
- **Racines : 20 %**
- Intent × Douleur : 10 %

Si tes racines internes sont fortes, ton super mot-clé hérite d'un bonus même quand les KPIs DataForSEO de la chaîne exacte sont faibles. C'est exactement le pattern *« longue-traîne pertinente »* que tu cherches.

### 5.4 Le `painIntentExpected` influence le malus

Le champ DB `pain_intent_expected` sur l'article influence le malus intent mismatch. Un keyword commercial sur un article avec `painIntentExpected=informational` verra son score baisser de **-10 points** sur la composante intent ([docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md)).

### 5.5 Le `combinedScore` du Radar n'est pas le `relevanceScore` du Capitaine

Attention au double scoring :
- **Côté Radar** : `combinedScore` = mélange marché + douleur (vue d'ensemble)
- **Côté Capitaine** : `marketScore` (KPI marché pur) + `relevanceScore` (pertinence pure) séparés

Le Radar te donne une **première intuition globale**. Le Capitaine te permet de **lire les deux dimensions séparément** et de choisir entre *"piège trafic"* (marché fort + pertinence faible) et *"longue-traîne pertinente"* (marché moyen + pertinence forte).

---

## 6. Résumé en une image mentale

```
                    ┌──────────────────────────────────┐
                    │  RADAR (exploration)             │
                    │  → Scan = 25 candidats notés     │
                    │  → Tu coches 5-10 cards          │
                    │  → Bouton "Envoyer au Capitaine" │
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │  CAPITAINE (raffinage)                                 │
       │                                                        │
       │  ┌──────────────────┐    ┌──────────────────────────┐ │
       │  │ Liste verticale  │    │ Side-panel KPIs détail   │ │
       │  │  ─ entry 1       │    │ + sidebar racines        │ │
       │  │  ─ entry 2       │←─→│ + AI Panel conseil       │ │
       │  │  ─ entry 3       │    │                          │ │
       │  │  + (input libre) │    └──────────────────────────┘ │
       │  └──────────────────┘                                  │
       │                                                        │
       │  Pour chaque entry :                                   │
       │  • clic sur mots cliquables → désactiver/explorer racine │
       │  • Alt+clic → tagger local/persona                     │
       │  • saisie input → CRÉER super mot-clé multi-racines    │
       │                                                        │
       │  Tu valides UNE entry → Capitaine de l'article         │
       └────────────────────────────────────────────────────────┘
```

---

## Voir aussi

- [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md) — Score KPI vs Pertinence (détail des pondérations)
- [docs/pain-point-editorial-backbone.md](./pain-point-editorial-backbone.md) — Le painPoint comme colonne vertébrale éditoriale
- [docs/moteur-data-flow.md](./moteur-data-flow.md) — Flux complet du Moteur (3 phases / 6 onglets)
- [docs/captain-ui-improvements.md](./captain-ui-improvements.md) — Évolutions UI/UX 2026 sur le Capitaine
- [docs/ui-sections-guide.md](./ui-sections-guide.md) — Guide complet des sections UI
