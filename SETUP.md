# BMAD Method v6.0.3 - Manuel Utilisateur

> Installation locale : v6.0.3 | IDE : Claude Code | Langue : French
> Derniere mise a jour : 25 fevrier 2026

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Structure du projet](#2-structure-du-projet)
3. [Les 4 phases du workflow](#3-les-4-phases-du-workflow)
4. [Carte complete des commandes](#4-carte-complete-des-commandes)
5. [Cas d'usage concrets](#5-cas-dusage-concrets)
6. [Quick Flow - Le raccourci](#6-quick-flow---le-raccourci)
7. [Les agents (roles)](#7-les-agents-roles)
8. [Outils utilitaires](#8-outils-utilitaires)
9. [Regles d'or](#9-regles-dor)
10. [Reference rapide](#10-reference-rapide)

---

## 1. Vue d'ensemble

BMAD (Build More, Architect Dreams) est un framework agile pilote par IA.
Il structure le developpement en **4 phases sequentielles** ou chaque document
produit alimente la phase suivante.

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                    BMAD METHOD v6 - VUE GLOBALE                    │
  │                                                                     │
  │   /bmad-help  ← Ton point d'entree. Toujours disponible.          │
  │                  Analyse ton projet et te dit quoi faire ensuite.   │
  │                                                                     │
  │   Phase 1        Phase 2        Phase 3        Phase 4              │
  │  ANALYSER   -->  PLANIFIER -->  CONCEVOIR -->  CONSTRUIRE          │
  │  (optionnel)     (requis)       (recommande)   (iteratif)          │
  │                                                                     │
  │   ┌──────────────────── Quick Flow ────────────────────┐           │
  │   │  Pour les petits changements : spec -> dev -> done │           │
  │   └────────────────────────────────────────────────────┘           │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Structure du projet

```
BMAD/
├── _bmad/                          # Coeur BMAD (NE PAS MODIFIER)
│   ├── core/                       #   Moteur central
│   │   ├── agents/                 #   Definitions des agents
│   │   ├── tasks/                  #   Taches de base
│   │   └── workflows/              #   Workflows de base
│   ├── bmm/                        #   Module "BMad Method"
│   │   ├── agents/                 #   Agents specifiques BMM
│   │   ├── data/                   #   Knowledge base, templates
│   │   ├── teams/                  #   Compositions d'equipes
│   │   └── workflows/              #   25 workflows disponibles
│   ├── _config/                    #   Configuration & manifestes
│   │   ├── manifest.yaml           #   Version & modules installes
│   │   └── ides/claude-code.yaml   #   Config IDE
│   └── _memory/                    #   Memoire entre sessions
│
├── _bmad-output/                   # Artefacts generes par BMAD
│   ├── planning-artifacts/         #   PRD, architecture, epics, UX...
│   └── implementation-artifacts/   #   Stories, sprint status...
│
├── .claude/commands/               # Slash commands pour Claude Code
│   ├── bmad-help.md                #   /bmad-help
│   ├── bmad-agent-bmm-*.md         #   /bmad-agent-bmm-pm, etc.
│   ├── bmad-bmm-*.md               #   /bmad-bmm-create-prd, etc.
│   └── bmad-*.md                   #   Utilitaires
│
├── docs/                           # Documentation projet (knowledge)
└── SETUP.md                        # Ce fichier
```

---

## 3. Les 4 phases du workflow

> Voir le diagramme visuel officiel : [bmad.png](bmad.png)

### Legende des agents (couleurs du diagramme)

```
  ┌─────────────────────────────────────────────┐
  │  LEGENDE AGENTS (ref: bmad.png)             │
  │                                             │
  │  [Analyst]  = Cyan       Recherche, brief   │
  │  [PM]       = Vert       PRD, epics, gate   │
  │  [UX]       = Magenta    Design UX          │
  │  [Architect]= Orange     Architecture, ADRs │
  │  [TEA]      = Rose       Test Design (opt.) │
  │  [SM]       = Bleu       Sprint, stories    │
  │  [DEV]      = Violet     Code, review       │
  │  ◇          = Decision   Oui / Non          │
  └─────────────────────────────────────────────┘
```

### Diagramme complet du workflow (reproduit depuis bmad.png)

```
                              ( Start )
                                 │
            PHASE 1              ▼
           Discovery    ◇ Include Discovery? ◇─── Non ──────────────┐
           (Optionnel)          │ Oui                                │
                                ▼                                    │
                     ┌──────────────────┐                            │
                     │  Brainstorming   │ [Analyst]                  │
                     │  (optionnel)     │                            │
                     └────────┬─────────┘                            │
                              ▼                                      │
                     ┌──────────────────┐                            │
                     │  Research        │ [Analyst]                  │
                     │  (optionnel)     │                            │
                     └────────┬─────────┘                            │
                              ▼                                      │
                     ┌──────────────────┐                            │
                     │  Product Brief   │ [Analyst]                  │
                     │  (optionnel)     │                            │
                     └────────┬─────────┘                            │
                              │                                      │
  ════════════════════════════╪══════════════════════════════════════╪══
            PHASE 2           ▼                                      │
           Planning  ┌──────────────────┐                            │
           (Requis)  │      PRD         │ [PM] ◄─────────────────────┘
                     │                  │
                     └────────┬─────────┘
                              │
                       ◇ Has UI? ◇─── Non ──┐
                              │ Oui          │
                              ▼              │
                     ┌──────────────────┐    │
                     │   Create UX      │    │
                     │                  │    │
                     │  [UX Designer]   │    │
                     └────────┬─────────┘    │
                              │              │
  ════════════════════════════╪══════════════╪═════════════════════════
            PHASE 3           ▼              │
          Solutioning┌──────────────────┐    │
          (Requis)   │  Architecture    │◄───┘
                     │  [Architect]     │
                     └────────┬─────────┘
                              │
                     ┌──────────────────┐
                     │  Validate Arch   │ [PM] (optionnel)
                     │  (optionnel)     │
                     └────────┬─────────┘
                              ▼
                     ┌──────────────────┐
                     │  Epics/Stories   │ [PM]
                     └────────┬─────────┘
                              │
                     ┌──────────────────┐
                     │  Test Design     │ [TEA] (optionnel)
                     │  (optionnel)     │
                     └────────┬─────────┘
                              ▼
                     ┌──────────────────┐
                     │  Implementation  │ [PM]
                     │  Readiness       │
                     └────────┬─────────┘
                              │
  ════════════════════════════╪════════════════════════════════════════
            PHASE 4           ▼
         Implementation ┌──────────────────┐
           (Requis)     │  Sprint Plan     │ [SM]
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                   ┌───>│  Create Story    │ [SM]
                   │    └────────┬─────────┘
                   │             │
                   │    ┌────────▼─────────┐
                   │    │ Validate Story   │ [SM] (optionnel)
                   │    │ (optionnel)      │
                   │    └────────┬─────────┘
                   │             ▼
          STORY    │    ┌──────────────────┐
          LOOP     │    │  Develop Story   │ [DEV]
                   │    └────────┬─────────┘
                   │             ▼
                   │    ┌──────────────────┐
                   │    │  Code Review     │ [DEV]
                   │    │  (use different  │
                   │    │   LLMs)          │
                   │    └────────┬─────────┘
                   │             ▼
                   │      ◇ Code Review ◇
                   │      │ Pass?       │
                   │  Fail│             │Pass
                   │◄─────┘             ▼
                   │            ◇ More Stories ◇
                   │              in Epic?     │
                   │            │ Oui          │ Non
                   └────────────┘              ▼
                                      ┌──────────────────┐
                                      │  Retrospective   │ [SM]
                                      └────────┬─────────┘
                                               ▼
                                       ◇ More Epics? ◇
                                       │ Oui     │ Non
                                       │         ▼
                                       │      ( End )
                                       │
                                       └──> Retour Sprint Plan
```

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║  PHASE 1: ANALYSER (optionnel)                                        ║
║  ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  ║
║  │ Brainstorming │  │ Recherche        │  │ Brief Produit           │  ║
║  │              │──>│ (marche/tech/    │──>│                         │  ║
║  │              │  │  domaine)         │  │ => product-brief.md     │  ║
║  └──────────────┘  └──────────────────┘  └────────────┬────────────┘  ║
║                                                        │               ║
║ ═══════════════════════════════════════════════════════╪═══════════════ ║
║                                                        ▼               ║
║  PHASE 2: PLANIFIER (requis)                                          ║
║  ┌──────────────────────────────────┐  ┌───────────────────────────┐  ║
║  │ Creer le PRD                     │  │ Design UX (si UI)         │  ║
║  │ (exigences fonctionnelles & NFR) │  │                           │  ║
║  │                                  │  │ => ux-spec.md             │  ║
║  │ => PRD.md                        │  └───────────────────────────┘  ║
║  └─────────────────┬────────────────┘                                 ║
║                     │                                                  ║
║ ═══════════════════╪══════════════════════════════════════════════════ ║
║                     ▼                                                  ║
║  PHASE 3: CONCEVOIR (recommande)                                      ║
║  ┌──────────────────┐  ┌────────────────┐  ┌───────────────────────┐ ║
║  │ Architecture      │  │ Epics & Stories │  │ Validation Readiness  │ ║
║  │ (decisions tech,  │──>│ (decoupage du  │──>│ (gate check)         │ ║
║  │  ADRs)            │  │  travail)       │  │                       │ ║
║  │ => architecture.md│  │ => epics.md     │  │ => PASS / FAIL       │ ║
║  └──────────────────┘  └────────────────┘  └───────────┬───────────┘ ║
║                                                         │              ║
║ ════════════════════════════════════════════════════════╪════════════  ║
║                                                         ▼              ║
║  PHASE 4: CONSTRUIRE (iteratif, story par story)                      ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │                                                                  │ ║
║  │  Sprint Planning ──> Create Story ──> Dev Story ──> Code Review  │ ║
║  │       │                                                  │       │ ║
║  │       │              ┌──────────────┐                    │       │ ║
║  │       │              │Correct Course│◄───── si probleme ─┘       │ ║
║  │       │              └──────────────┘                            │ ║
║  │       │                                                          │ ║
║  │       └──── Apres l'epic: Retrospective + QA E2E Tests ────────>│ ║
║  │                                                                  │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```


### Flux de documents entre phases

```
  product-brief.md ──> PRD.md ──> architecture.md ──> epics.md
                         │              │                  │
                         ▼              ▼                  ▼
                     ux-spec.md    ADRs, schemas    story-*.md
                                                        │
                                                        ▼
                                                   Code + Tests
```

> **Principe cle** : Chaque document devient le contexte de la phase suivante.
> Le PRD dit a l'architecte quelles contraintes comptent.
> L'architecture dit au dev comment construire.

---

## 4. Carte complete des commandes

### Navigation et aide

| Commande | Quand l'utiliser |
|----------|-----------------|
| `/bmad-help` | **Toujours commencer ici.** Analyse le projet et dit quoi faire ensuite |

### Phase 1 - Analyse

| Commande | Role | Produit |
|----------|------|---------|
| `/bmad-brainstorming` | Brainstorming guide | brainstorming-report.md |
| `/bmad-bmm-domain-research` | Recherche domaine/industrie | rapport de recherche |
| `/bmad-bmm-market-research` | Recherche marche/concurrence | rapport marche |
| `/bmad-bmm-technical-research` | Recherche technique | rapport technique |
| `/bmad-bmm-create-product-brief` | Creer le brief produit | product-brief.md |

### Phase 2 - Planification

| Commande | Role | Produit |
|----------|------|---------|
| `/bmad-bmm-create-prd` | Creer le PRD (exigences) | PRD.md |
| `/bmad-bmm-edit-prd` | Modifier un PRD existant | PRD.md (maj) |
| `/bmad-bmm-validate-prd` | Valider le PRD | rapport validation |
| `/bmad-bmm-create-ux-design` | Concevoir l'UX | ux-spec.md |

### Phase 3 - Conception

| Commande | Role | Produit |
|----------|------|---------|
| `/bmad-bmm-create-architecture` | Architecture & ADRs | architecture.md |
| `/bmad-bmm-create-epics-and-stories` | Decouper en epics/stories | epics.md |
| `/bmad-bmm-check-implementation-readiness` | Gate check avant dev | PASS/CONCERNS/FAIL |

### Phase 4 - Implementation

| Commande | Role | Produit |
|----------|------|---------|
| `/bmad-bmm-sprint-planning` | Initialiser le sprint | sprint-status.yaml |
| `/bmad-bmm-sprint-status` | Voir l'avancement | rapport status |
| `/bmad-bmm-create-story` | Preparer la prochaine story | story-[slug].md |
| `/bmad-bmm-dev-story` | Implementer une story | Code + Tests |
| `/bmad-bmm-code-review` | Revue de code | Approuve / A corriger |
| `/bmad-bmm-correct-course` | Gerer un changement en cours de sprint | Plan mis a jour |
| `/bmad-bmm-qa-generate-e2e-tests` | Generer tests E2E | Suite de tests |
| `/bmad-bmm-retrospective` | Retro apres un epic | Lecons apprises |

### Quick Flow (raccourci)

| Commande | Role | Produit |
|----------|------|---------|
| `/bmad-bmm-quick-spec` | Spec rapide pour petit changement | tech-spec.md |
| `/bmad-bmm-quick-dev` | Implementer depuis un quick spec | Code + Tests |

---

## 5. Cas d'usage concrets

### Cas A : "J'ai une idee de produit SaaS"

```
  TOI: "J'ai une idee de produit de facturation pour freelances"

  ┌─────────────────────────────────────────────────────────────┐
  │ PARCOURS COMPLET (~3-5 sessions de chat)                    │
  │                                                             │
  │ Session 1: /bmad-help                                       │
  │   "J'ai une idee pour un SaaS de facturation"              │
  │   --> BMAD te guide vers le brainstorming                   │
  │                                                             │
  │ Session 2: /bmad-brainstorming                              │
  │   --> Explorer les idees, valider le concept                │
  │   --> /bmad-bmm-create-product-brief                        │
  │   ==> product-brief.md                                      │
  │                                                             │
  │ Session 3: /bmad-bmm-create-prd                             │
  │   --> Definir les exigences detaillees                      │
  │   ==> PRD.md                                                │
  │                                                             │
  │ Session 4: /bmad-bmm-create-architecture                    │
  │   --> Decisions techniques (stack, DB, API...)              │
  │   ==> architecture.md                                       │
  │   --> /bmad-bmm-create-epics-and-stories                    │
  │   ==> epics.md                                              │
  │   --> /bmad-bmm-check-implementation-readiness              │
  │   ==> PASS!                                                 │
  │                                                             │
  │ Session 5+: Boucle d'implementation                         │
  │   /bmad-bmm-sprint-planning                                 │
  │   /bmad-bmm-create-story  --> /bmad-bmm-dev-story           │
  │   /bmad-bmm-code-review                                     │
  │   (repeter pour chaque story)                               │
  └─────────────────────────────────────────────────────────────┘
```

### Cas B : "Je veux ajouter une feature a mon projet existant"

```
  TOI: "J'ai un projet Vue.js et je veux ajouter le dark mode"

  ┌─────────────────────────────────────────────────────────┐
  │ PARCOURS QUICK FLOW (~1-2 sessions)                     │
  │                                                         │
  │ Session 1: /bmad-bmm-quick-spec                         │
  │   "Ajouter un toggle dark mode dans les settings"      │
  │   --> Spec technique rapide generee                     │
  │   ==> tech-spec.md                                      │
  │                                                         │
  │ Session 2: /bmad-bmm-quick-dev                          │
  │   --> Implementation directe depuis le spec             │
  │   ==> Code + Tests                                      │
  └─────────────────────────────────────────────────────────┘
```

### Cas C : "J'ai un projet existant a documenter pour l'IA"

```
  TOI: "Mon projet n'a pas de docs, l'IA ne comprend rien"

  ┌─────────────────────────────────────────────────────────┐
  │ PARCOURS BROWNFIELD (~2 sessions)                       │
  │                                                         │
  │ Session 1: /bmad-bmm-document-project                   │
  │   --> Analyse automatique du codebase                   │
  │   ==> Documentation generee dans docs/                  │
  │                                                         │
  │ Session 2: /bmad-bmm-generate-project-context           │
  │   --> Genere les regles de dev pour l'IA               │
  │   ==> project-context.md                                │
  │   (L'IA comprend maintenant ton projet!)               │
  └─────────────────────────────────────────────────────────┘
```

### Cas D : "Je veux construire un gros projet avec epics"

```
  TOI: "App e-commerce complete : auth, catalogue, panier, paiement"

  ┌───────────────────────────────────────────────────────────────┐
  │ PARCOURS METHOD COMPLET                                       │
  │                                                               │
  │ ┌─ Planification ──────────────────────────────────────────┐ │
  │ │ /bmad-bmm-create-product-brief  => product-brief.md      │ │
  │ │ /bmad-bmm-create-prd            => PRD.md                │ │
  │ │ /bmad-bmm-create-ux-design      => ux-spec.md           │ │
  │ │ /bmad-bmm-create-architecture   => architecture.md       │ │
  │ │ /bmad-bmm-create-epics-and-stories => epics.md           │ │
  │ │ /bmad-bmm-check-implementation-readiness => PASS         │ │
  │ └──────────────────────────────────────────────────────────┘ │
  │                                                               │
  │ ┌─ Sprint 1: Epic "Auth" ─────────────────────────────────┐ │
  │ │ /bmad-bmm-sprint-planning                                │ │
  │ │ /bmad-bmm-create-story "Story 1.1: Login"               │ │
  │ │ /bmad-bmm-dev-story    => code + tests                   │ │
  │ │ /bmad-bmm-code-review  => approuve                       │ │
  │ │ /bmad-bmm-create-story "Story 1.2: Register"            │ │
  │ │ /bmad-bmm-dev-story    => code + tests                   │ │
  │ │ /bmad-bmm-code-review  => approuve                       │ │
  │ │ ...                                                       │ │
  │ │ /bmad-bmm-qa-generate-e2e-tests => tests E2E auth       │ │
  │ │ /bmad-bmm-retrospective => lecons apprises               │ │
  │ └──────────────────────────────────────────────────────────┘ │
  │                                                               │
  │ ┌─ Sprint 2: Epic "Catalogue" ────────────────────────────┐ │
  │ │ (meme boucle que Sprint 1)                               │ │
  │ └──────────────────────────────────────────────────────────┘ │
  │                                                               │
  │ ┌─ Sprint 3: Epic "Panier" ───────────────────────────────┐ │
  │ │ ...                                                       │ │
  │ └──────────────────────────────────────────────────────────┘ │
  └───────────────────────────────────────────────────────────────┘
```

---

## 6. Quick Flow - Le raccourci

Le Quick Flow est fait pour les taches **petites et bien definies**
(1 a 15 stories max). Il saute les phases 1-3.

```
  Quand utiliser Quick Flow vs Method complet ?

  ┌──────────────────────────────┬───────────────────────────────────┐
  │       QUICK FLOW             │        METHOD COMPLET             │
  │                              │                                   │
  │  "Ajouter un bouton logout"  │  "Creer une app de A a Z"        │
  │  "Fixer le bug #42"          │  "Refondre le systeme de paiement"│
  │  "Ajouter le dark mode"      │  "Migrer vers microservices"     │
  │  "Nouvelle route API"        │  "Plateforme multi-tenant"       │
  │                              │                                   │
  │  1-15 stories               │  10-50+ stories                   │
  │  Pas d'archi complexe        │  Decisions d'architecture        │
  │  Feature isolee              │  Systeme complet                  │
  │                              │                                   │
  │  /bmad-bmm-quick-spec        │  /bmad-bmm-create-prd            │
  │  /bmad-bmm-quick-dev         │  /bmad-bmm-create-architecture   │
  │                              │  /bmad-bmm-create-epics...       │
  │  ~30 min                     │  ~2-5h de planification          │
  └──────────────────────────────┴───────────────────────────────────┘
```

---

## 7. Les agents (roles)

Chaque agent est un role specialise. Tu les charges avec `/bmad-agent-bmm-*`
quand un workflow ne le fait pas automatiquement.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                       EQUIPE BMAD                                │
  │                                                                  │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
  │  │    PM       │  │  Analyst   │  │ UX Designer│                │
  │  │ Exigences,  │  │ Recherche, │  │ Wireframes,│                │
  │  │ PRD, epics  │  │ donnees    │  │ specs UX   │                │
  │  └────────────┘  └────────────┘  └────────────┘                │
  │                                                                  │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
  │  │ Architect   │  │    Dev     │  │    QA      │                │
  │  │ Tech stack, │  │ Code,      │  │ Tests,     │                │
  │  │ ADRs, infra │  │ implement. │  │ validation │                │
  │  └────────────┘  └────────────┘  └────────────┘                │
  │                                                                  │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
  │  │    SM       │  │Tech Writer │  │Quick Flow  │                │
  │  │ Sprint,     │  │ Docs,      │  │ Solo Dev   │                │
  │  │ stories,    │  │ guides     │  │ (spec+dev) │                │
  │  │ retros      │  │            │  │            │                │
  │  └────────────┘  └────────────┘  └────────────┘                │
  │                                                                  │
  │  ┌──────────────────┐                                           │
  │  │  BMad Master      │  Agent polyvalent qui peut jouer         │
  │  │  (le chef)        │  n'importe quel role selon le besoin     │
  │  └──────────────────┘                                           │
  └──────────────────────────────────────────────────────────────────┘
```

| Commande Agent | Specialite |
|----------------|------------|
| `/bmad-agent-bmm-pm` | Product Manager - PRD, exigences, validation |
| `/bmad-agent-bmm-analyst` | Analyse metier, recherche, donnees |
| `/bmad-agent-bmm-ux-designer` | Design UX, wireframes, specs UI |
| `/bmad-agent-bmm-architect` | Architecture technique, ADRs |
| `/bmad-agent-bmm-dev` | Implementation, code, tests unitaires |
| `/bmad-agent-bmm-qa` | Qualite, tests E2E, validation |
| `/bmad-agent-bmm-sm` | Scrum Master - sprints, stories, retros |
| `/bmad-agent-bmm-tech-writer` | Documentation technique |
| `/bmad-agent-bmm-quick-flow-solo-dev` | Dev solo rapide (quick flow) |
| `/bmad-agent-bmad-master` | Polyvalent - joue tous les roles |

---

## 8. Outils utilitaires

Ces commandes sont disponibles a tout moment, independamment de la phase :

| Commande | Usage |
|----------|-------|
| `/bmad-help` | Guide intelligent - dit quoi faire ensuite |
| `/bmad-bmm-generate-project-context` | Genere les regles IA du projet |
| `/bmad-bmm-document-project` | Documente un projet existant |
| `/bmad-brainstorming` | Brainstorming guide avec techniques variees |
| `/bmad-review-adversarial-general` | Revue critique cynique d'un document |
| `/bmad-editorial-review-prose` | Revision editoriale (style, clarte) |
| `/bmad-editorial-review-structure` | Revision structurelle (organisation) |
| `/bmad-shard-doc` | Decouper un gros document en fichiers |
| `/bmad-index-docs` | Generer un index.md pour un dossier |
| `/bmad-party-mode` | Discussion multi-agents (fun!) |

---

## 9. Regles d'or

```
  ┌──────────────────────────────────────────────────────────────┐
  │                   10 REGLES D'OR BMAD                        │
  │                                                              │
  │  1. Toujours commencer par /bmad-help en cas de doute       │
  │                                                              │
  │  2. Un workflow = un chat frais                              │
  │     (ne pas melanger les workflows dans un meme chat)       │
  │                                                              │
  │  3. Suivre l'ordre des phases :                              │
  │     Analyser -> Planifier -> Concevoir -> Construire        │
  │                                                              │
  │  4. Chaque document nourrit le suivant                      │
  │     (brief -> PRD -> archi -> stories -> code)              │
  │                                                              │
  │  5. Quick Flow pour les petits trucs                        │
  │     Method complet pour les gros projets                    │
  │                                                              │
  │  6. Valider avant d'implementer                             │
  │     (/bmad-bmm-check-implementation-readiness)              │
  │                                                              │
  │  7. Une story a la fois dans la boucle dev                  │
  │     (create-story -> dev-story -> code-review)              │
  │                                                              │
  │  8. Faire une retro apres chaque epic                       │
  │     (/bmad-bmm-retrospective)                               │
  │                                                              │
  │  9. Generer le project-context.md apres l'architecture      │
  │     (/bmad-bmm-generate-project-context)                    │
  │                                                              │
  │ 10. Les artefacts vont dans _bmad-output/                   │
  │     planning-artifacts/ et implementation-artifacts/         │
  └──────────────────────────────────────────────────────────────┘
```

---

## 10. Reference rapide

### Cheat sheet : "Je veux..."

```
  "J'ai une idee"
    --> /bmad-help  ou  /bmad-brainstorming

  "Je veux definir mon produit"
    --> /bmad-bmm-create-product-brief

  "Je veux creer les exigences"
    --> /bmad-bmm-create-prd

  "Je veux designer l'UX"
    --> /bmad-bmm-create-ux-design

  "Je veux definir l'architecture"
    --> /bmad-bmm-create-architecture

  "Je veux decouper en stories"
    --> /bmad-bmm-create-epics-and-stories

  "Je suis pret a coder ?"
    --> /bmad-bmm-check-implementation-readiness

  "Je veux planifier un sprint"
    --> /bmad-bmm-sprint-planning

  "Je veux coder une story"
    --> /bmad-bmm-create-story  puis  /bmad-bmm-dev-story

  "Je veux une revue de code"
    --> /bmad-bmm-code-review

  "J'ai un petit truc a faire vite"
    --> /bmad-bmm-quick-spec  puis  /bmad-bmm-quick-dev

  "Je veux documenter mon projet"
    --> /bmad-bmm-document-project

  "Je veux des tests E2E"
    --> /bmad-bmm-qa-generate-e2e-tests

  "C'est quoi la suite ?"
    --> /bmad-help
```

### Arbre de decision rapide

```
                        Quel est ton besoin ?
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Nouveau          Feature/Fix     Documenter
         Produit          rapide          un existant
              │               │               │
              ▼               ▼               ▼
      /bmad-bmm-         /bmad-bmm-     /bmad-bmm-
      create-product-    quick-spec     document-project
      brief              puis           puis
      puis               /bmad-bmm-    /bmad-bmm-generate-
      /bmad-bmm-         quick-dev     project-context
      create-prd
      puis
      /bmad-bmm-
      create-architecture
      puis
      /bmad-bmm-
      create-epics-
      and-stories
      puis
      Sprint loop...
```

---

## Annexe : Verification de l'installation

| Check | Statut |
|-------|--------|
| Version installee | v6.0.3 |
| Module core | installe |
| Module bmm (BMad Method) | installe |
| IDE Claude Code | configure |
| Dossier `_bmad/` | present |
| Dossier `_bmad-output/` | present (planning-artifacts + implementation-artifacts) |
| Slash commands (41 commandes) | presentes dans `.claude/commands/` |
| Ancien `.bmad-core/` v4 | supprime |
| Ancien `.claude/commands/BMad/` v4 | supprime |
| Ancien `SETUP.md` v4 | remplace par ce fichier |
| Langue communication | French |
| Langue documents | French |

### Module TEA (optionnel, non installe)

Le module **TEA** (Test Engineering Architect) est un module supplementaire
pour la strategie de test et l'automatisation. Il n'est pas installe dans
ce projet. Pour l'ajouter :

```bash
npx bmad-method install --modules "bmm,tea"
```

TEA fournit 9 workflows de test (design, automation, review, release gates)
avec une priorisation basee sur le risque (P0-P3).
