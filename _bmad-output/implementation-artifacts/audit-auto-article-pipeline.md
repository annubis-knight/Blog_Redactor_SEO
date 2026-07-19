---
name: audit-auto-article-pipeline
type: audit
status: active
version: 1.0.0
last_updated: 2026-07-19
synced_with:
  - _bmad-output/implementation-artifacts/epic-auto-article-pipeline.md (epic audité)
  - docs/auto-article-cli.md (guide d'usage — chiffres de coût corrigés depuis cet audit)
  - scripts/auto-article/** (code audité)
---

# Audit étape par étape — pipeline `auto:article`

> Audit du CLI de génération automatique d'article SEO, réalisé après
> l'implémentation des 6 stories de l'epic et **3 runs réels** de contrôle.
> Sert de **backlog d'amélioration** — cocher les items au fur et à mesure.

## Méthode & base de preuve

- **3 runs réels** (`--mode=real`, Claude Haiku 4.5 + DataForSEO production) :
  articles #450, #451, #452 dans le cocon « Croissance digitale Toulouse ».
- **Runs mock** reproductibles via `--config` + run de reprise `--resume`.
- **98 tests unitaires** sur les heuristiques pures et les parseurs.
- **Preuve de non-régression** (protocole `git stash` / suite complète / `git stash pop` /
  suite complète, 2026-07-19) : **17 tests en échec avant, 17 après, liste nominative
  strictement identique** → 0 régression introduite sur le flux manuel / web.
  Les 17 échecs sont préexistants (8 nécessitent le serveur dev lancé, 4 de cohérence
  DB/migrations, 4 `community-discussions.service` cassés en amont, 1 composant Vue).

**Légende** — ✅ solide · 🟡 fonctionne, perfectible · 🟠 fragile · ❌ défaut avéré

---

## Phase 0 — Amorçage

| # | Étape | Code | Verdict | Constat |
|---|---|---|---|---|
| 1 | Préflight serveur | `scripts/auto-article/index.ts` | ✅ | Message clair si serveur absent, sortie propre. |
| 2 | Bascule mock/real | `scripts/auto-article/index.ts` | 🟡 | Binaire : `--mode=real` **force Claude**. Impossible de cibler Gemini/OpenRouter — bloquant le jour où le solde Claude était épuisé. |
| 3 | Saisie initiale | `prompts.ts` · `config-file.ts` | 🟡 | `--config` robuste et testé. L'interactif souffre d'une course `readline` sur stdin non-TTY (sans effet en usage humain réel). |

## Phase 1 — Cerveau

| # | Étape | Code | Verdict | Constat |
|---|---|---|---|---|
| 4 | Intake IA | `server/routes/generate/auto-intake.routes.ts` | ✅ | Titres/angles pertinents en réel, validation Zod stricte. ⚠️ **Aucun retry** si l'IA renvoie du JSON malformé → run mort (502). |
| 5 | Résolution cocon | `cocoon.ts` · `tree.ts` · `pick-placement.ts` | ✅ | **Refondu (2026-07-19)** — le cocon n'est plus saisi mais **proposé** : arbre SEO lu (`GET /silos`), 2-3 cocons présélectionnés par affinité, l'IA tranche et justifie, l'utilisateur valide au Gate 1. Création de cocon à la volée supportée. |
| 6 | Création article | `phases/cerveau.ts` | ✅ | Idempotent (réutilisation par slug sur conflit `ON CONFLICT DO NOTHING`). Risque mineur : deux sujets au titre identique partagent l'article. |
| 7 | Persistance stratégie | `phases/cerveau-map.ts` | 🟡 | Forme conforme à `articleStrategySchema`. Mais `completedSteps: 6` déclaré alors que deepen/sous-questions ne sont pas faits → statut flatteur. |
| 0bis | Affichage de l'arbre au lancement | `tree.ts` · `tree-theme.ts` | ✅ | **Nouveau** — l'arbre s'affiche **avant toute saisie** (on choisit un sujet en voyant où il atterrira). Rendu arborescent coloré : silos ◆, cocons ● peuplé / ○ vide, composition `P · I · S` alignée, titres tronqués au mot, légende. Style **injecté** (`TreeTheme`) → `tree.ts` reste pur et testé en texte brut. |
| 7bis | Proposition d'emplacement | `tree.ts` · `pick-placement.ts` · `placement-suggest.routes.ts` | ✅ | **Nouveau (2026-07-19)** — présélection heuristique + arbitrage IA justifié. Le **niveau** (Pilier/Inter/Spé) est proposé, plus saisi. **L'importance de l'article est jugée par l'IA** à partir de la formulation de l'utilisateur (pas de détection de mots-clés, trop fragile). |
| 8 | **Gate 1** | `gate.ts` · `gate-interactive.ts` | ✅ | **Enrichi** : affiche l'arbre + l'emplacement proposé + le brief. `[e]` corrige l'emplacement **localement, sans réappel IA**. Surtout : **aucune écriture avant validation** (`commitCerveau`). En `--config`/`--resume` auto-validé (chemin assumé sans humain). |

## Phase 2 — Moteur (Explorer)

| # | Étape | Code | Verdict | Constat |
|---|---|---|---|---|
| 9 | Discovery | `phases/moteur-explorer.ts` | ✅ | ~20 mots-clés cohérents. Cannibalisation désormais couverte en aval du choix du Capitaine (P2-1, cf. n°13bis). |
| 10 | Radar scan | `phases/moteur-explorer.ts` | ✅ | 21 cards, KPI marché exploitables. |
| 11 | Sélection candidats | `heuristics/pick-radar-candidates.ts` | ✅ | Tri `marketScore`, exclusion `kpis: null`, K par type. Pur + testé. |

## Phase 2 — Moteur (Valider)

| # | Étape | Code | Verdict | Constat |
|---|---|---|---|---|
| 12 | Scan Capitaine (×8) | `phases/moteur-valider.ts` | 🟠 | **8 scans séquentiels** = principal poste de coût *et* de latence. Ni parallélisation, ni court-circuit. |
| 13 | Choix Capitaine | `heuristics/pick-capitaine.ts` | ✅ | v3 validée en réel (affinité 100 %, pertinence 60 vs 6 en v1). Réserve : affinité **lexicale** → un synonyme ne matche pas. |
| 13bis | Cannibalisation | `heuristics/detect-cannibalization.ts` | ✅ | **Ajouté (P2-1, 2026-07-19)** — Jaccard sur les Capitaines de tout le thème (1 seul appel `/cocoons`). Jamais bloquant : signalé ≥ 50 %, confirmation explicite ≥ 85 % en interactif, avertissement appuyé en non-interactif. |
| 14 | Lieutenants | `heuristics/pick-lieutenants.ts` | 🟠 | Résultats corrects mais dérivés du Radar. **Le SERP est appelé puis son contenu riche (Hn concurrents, PAA) est jeté** — signal payé, gaspillé. |
| 15 | Lexique | `heuristics/pick-lexique.ts` | ✅ | Propre après correctif (stopwords FR + exclusion Capitaine/Lieutenants). Quelques termes limites subsistent (`temps`, `accueil`). |
| 16 | Persistance décisions | `phases/moteur-valider.ts` | 🟠 | `PUT /articles/:id/keywords` OK, mais **`hnStructure: []` toujours vide** alors que le SERP fournit la structure des concurrents. |
| 17 | **Gate 2** | `gate.ts` | 🟡 | Idem Gate 1. |

## Phase 3 — Rédaction

| # | Étape | Code | Verdict | Constat |
|---|---|---|---|---|
| 18 | Sommaire | `phases/redaction.ts` | 🟡 | 13-18 sections, non ancré sur la structure des concurrents → c'est lui qui gonfle la longueur. |
| 19 | Article (SSE) | `phases/redaction.ts` | 🟡 | Structure éditoriale excellente. Mais `webSearchEnabled: false` **codé en dur** → perte d'ancrage factuel. Séquentiel + délais inter-sections → lent. |
| 20 | Meta | `phases/redaction.ts` | ✅ | Respecte 60/160 caractères. Troncature parfois en plein mot. |
| 21 | Save + statut | `phases/redaction.ts` | ✅ | Contenu + meta + statut `brouillon`. |
| 22 | Export HTML | `phases/redaction.ts` | ✅ | Fichier propre dans `_auto-output/`. |

## Transverse

| # | Étape | Code | Verdict | Constat |
|---|---|---|---|---|
| 23 | Rapport de coût | `report.ts` · `cost-status.routes.ts` | ✅ | **Corrigé (P1-1, 2026-07-19)** — le récap affiche IA + SEO + total. Validé en réel : annoncé $0.3412 vs $0.379 réellement dépensés (écart ~13 %, tarifs de référence du cost-guard → label « estim. »). Coût SEO non compté en mock (sandbox gratuit). |
| 24 | Reprise `--resume` | `resume.ts` · `resume-plan.ts` | ✅ | Idempotent, testé. Granularité grossière (phases entières, pas de reprise en milieu de Moteur). |
| 25 | Gestion d'erreurs | `http-client.ts` · `index.ts` | 🟠 | Messages clairs, exit code correct. Mais **aucun retry côté CLI** : la première erreur tue le run — après avoir dépensé. |
| 26 | Couverture de tests | `tests/unit/scripts/` | 🟡 | 98 tests sur heuristiques + parseurs (solide). **Les phases elles-mêmes ne sont pas testées** — validées seulement par runs E2E manuels. |

**Bilan : 11 ✅ · 9 🟡 · 5 🟠 · 1 ❌**

---

## 💰 Coût réel d'un run (mesuré, 2026-07-19)

| Poste | Montant / run | Source |
|---|---|---|
| Claude (Haiku 4.5) | ~$0.09 – 0.11 | rapporté par le CLI |
| DataForSEO | ~$0.24 – 0.28 | rapporté par le CLI **depuis P1-1** |
| **Total** | **~$0.34 – 0.38** | affiché dans le récap |

**Précision du rapport après P1-1** (run réel #453) : annoncé **$0.3412** contre
**$0.379** réellement débités (solde 44,4755 → 44,1954 = $0.280 DataForSEO + $0.0988
Claude). Écart ~13 %, dû aux tarifs de référence du cost-guard — d'où le label
« estim. ». Avant P1-1, le récap annonçait **$0.00** de SEO.

> Le coût SEO n'est **pas** compté en mode mock : les appels partent vers le sandbox
> DataForSEO (gratuit) alors que le cost-guard les comptabilise quand même.

---

## Backlog d'amélioration

### P1 — Fort impact, faible effort (~2 h)

- [x] **P1-1 · Corriger le rapport de coût** — ✅ fait le 2026-07-19.
      `GET /api/cost-status` expose `costGuard.getStatus()` ; `report.ts` agrège
      IA + SEO + total. Validé en réel ($0.3412 annoncé vs $0.379 dépensés).
- [x] **P1-2 · Ne plus payer un appel IA pour un cocon erroné** — ✅ absorbé par le
      gate d'emplacement : le cocon n'est plus saisi, il est **proposé** puis validé.
      Plus rien n'est créé avant validation (`commitCerveau`).
- [ ] **P1-3 · Exploiter le SERP déjà payé** (défauts 🟠 n°14 et n°16). Alimenter
      `hnStructure` depuis les Hn des concurrents (`SerpAnalysisResult.competitors[].headings`)
      et le transmettre au sommaire. Triple gain : meilleur ancrage SEO, longueur
      maîtrisée, fin du gaspillage d'un signal facturé.

### P2 — Qualité SEO (~4 h)

- [x] **P2-1 · Détection de cannibalisation** — ✅ fait le 2026-07-19.
      Jaccard sur les Capitaines de **tout le thème** (un seul appel `/cocoons`, dont le
      payload porte déjà `captainKeywordLocked` / `suggestedKeyword`). Jamais bloquant :
      signalé ≥ 50 %, confirmation explicite ≥ 85 % en interactif.
- [ ] **P2-2 · Lieutenants issus de `propose-lieutenants`** (SERP + IA) plutôt que
      dérivés du Radar.
- [ ] **P2-3 · Affinité sémantique** (embeddings) au lieu de lexicale pour le Capitaine
      — un synonyme n'est aujourd'hui pas reconnu.

### P3 — Robustesse & exploitation (~4 h)

- [ ] **P3-1 · Réduire/paralléliser les scans Capitaine** (défaut 🟠 n°12) : top 4 au
      lieu de 8, ou en parallèle → ~-50 % coût et latence.
- [ ] **P3-2 · Retry + reprise fine** sur erreur transitoire (défauts 🟠 n°4 et n°25).
- [ ] **P3-3 · `--ai=<provider>`** pour ne plus dépendre de Claude seul (défaut 🟡 n°2).
- [ ] **P3-4 · Tests d'intégration des phases** avec client HTTP mocké (défaut 🟡 n°26)
      — comble le vrai trou de couverture.

---

## Deux bugs de placement corrigés (session arbre, 2026-07-19)

Révélés par un run interactif sur l'arbre réel de l'utilisateur — aucun test ne
les aurait attrapés, seule l'observation des scores les a exposés.

1. **Biais *rich-get-richer*.** L'affinité se mesurait sur `nom + silo + TOUS les
   titres`. Un cocon à 16 articles raflait tout ; un cocon vide n'avait aucune
   chance. **Conséquence : l'arbre n'aurait jamais grandi dans les cocons que
   l'utilisateur avait délibérément créés et laissés vides** — l'exact contraire
   de l'objectif. Corrigé : nom pondéré 0,7 / contenu 0,3, bonus aux cocons vides
   *pertinents*, suppression du départage par densité.

2. **Sens de mesure inversé.** On calculait « quelle part de l'IDÉE est couverte
   par le nom du cocon ». Une idée de ~20 mots face à un nom de 3 donnait ~0,15
   pour **tous** les cocons : aucun pouvoir discriminant. Corrigé en mesurant
   « quelle part du NOM est couverte par l'idée » → scores 0,67 / 0,50 / 0,20 au
   lieu de 0,15 partout, et les cocons vides pertinents remontent enfin.

> Le contenu garde volontairement l'autre sens (part de l'idée couverte par le
> corpus de titres) : le corpus étant vaste, la couverture y est significative.

3. **Le brief pilotait l'emplacement à la place de l'utilisateur.** Le texte
   d'affinité mêlait le sujet saisi **et** la sortie de l'intake (titre, mot-clé,
   douleur). En mock, ce brief figé parle de « visibilité locale » : un article
   sur la **croissance** atterrissait donc dans « Visibilité web locale ». Même
   en réel, la reformulation de l'IA pesait plus lourd que l'intention initiale.
   De plus, le **contexte business n'était pas utilisé du tout** — le signal le
   plus riche de la saisie était jeté.
   Corrigé : l'affinité se calcule sur **les mots de l'utilisateur seuls**
   (sujet + contexte business) ; le brief est retiré du calcul et le contexte
   business est transmis au prompt de placement.
   Effet mesuré sur un cas réel : « Stratégie de croissance » passe de la 3ᵉ
   place (50 %) à la 1ʳᵉ (**85 %**, niveau Pilier), au lieu de « Visibilité web
   locale » (68 %).

> Principe retenu : la **présélection heuristique vise le rappel** (ne pas
> manquer le bon cocon), l'**IA tranche avec précision**.

## Banc d'essai du placement — mode réel (2026-07-19)

**Méthode** : 7 sujets rejouant uniquement le chemin *proposition* de la phase
Cerveau (intake → arbre → présélection → arbitrage IA), arrêt **avant toute
écriture**. Deux appels Haiku par sujet, zéro appel DataForSEO → **~$0.03 la
campagne** au lieu de ~$2,45 en runs complets. Contexte business maintenu
constant pour éprouver le biais permanent.

**Score : 3/7 → 7/7** en trois itérations. Quatre défauts trouvés, tous corrigés :

| # | Défaut | Symptôme | Correctif |
|---|---|---|---|
| 1 | **Biais du contexte business** | Le contexte business, constant, contient « stratégie de croissance » → ce cocon sortait à **85 % sur les 7 sujets**, cassoulet compris. Cas C, E, F, G faussés. | L'affinité se calcule sur **le sujet seul** ; le contexte business ne sert plus qu'au jugement de l'IA. |
| 2 | **Morphologie française** | « visibilité » ≠ « visible », « locale » ≠ « localement », « Toulouse » ≠ « toulousaine » → le cocon « Visibilité web locale » était **absent** de la présélection sur un sujet de visibilité locale. | `tokensMatch` : préfixe commun ≥ 5 caractères (`text.ts`). Cas C passe de absent à **68 %**. |
| 3 | **L'IA ne voyait pas les scores** | Elle ignorait qu'un candidat était nettement plus proche et sur-privilégiait les cocons vides : cas F rangé dans un cocon vide malgré un cocon dense à 48 % vs 32 %. | La proximité mesurée est transmise dans le prompt, avec la règle « écart ≥ 15 pts en faveur d'un cocon peuplé l'emporte ». |
| 4 | **Aucun moyen de refuser** | Sur un sujet hors-champ, l'IA identifiait parfaitement le problème dans sa justification mais le schéma l'obligeait à placer. | Champ `outOfScope` : l'IA propose le moins mauvais emplacement **et** lève une alerte au Gate 1 (non bloquant). |

**Résultats finaux** : A→Stratégie de croissance (pilier) · B→Copywriting (pilier)
· C→Visibilité web locale (pilier) · D→Design web & UX (pilier) ·
E→Croissance digitale (intermédiaire) · F→Croissance digitale (intermédiaire) ·
G→placé + ⚠ hors périmètre.

> **Limite connue** : le rapprochement reste **lexical**. Un sujet sans aucun
> vocabulaire commun avec les noms de cocons tombe à ~0 % de proximité (cas E :
> 8 %) et repose alors entièrement sur le jugement de l'IA. C'est l'objet de
> P2-3 (affinité sémantique par embeddings).

**Aussi corrigé** : bandeau `⚠ MODE MOCK` au Gate 1 (le brief simulé était pris
pour une incompréhension du script), libellé `[e] changer l'emplacement`,
troncature des titres à la frontière de mot.

## Réserves hors périmètre CLI

- **Score de Pertinence produit non-discriminant** : en run réel, les 8 candidats
  scoraient **tous exactement `relevance = 6`**. Le CLI contourne via son affinité
  topique, mais le scoring produit lui-même mérite une investigation dédiée — il
  affecte probablement aussi l'usage **manuel** du Moteur.
- **Longueur d'article** : 4 000-6 000 mots contre 1 800 visés
  (`DEFAULT_TARGET_WORDS_BY_TYPE`). **Décision produit prise : on garde l'article
  entier**, pas de passe de réduction.
