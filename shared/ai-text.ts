/**
 * Détection et nettoyage du « monologue » de l'IA dans les contenus générés.
 *
 * Contexte (audit 2026-09-19) : dès que la recherche web est activée, Claude
 * émet des blocs de texte d'annonce avant chaque appel d'outil — « Je vais
 * d'abord faire une recherche… », « Parfait. J'ai mes sources. » — qui se
 * retrouvaient publiés dans l'article. Les 6 piliers de juillet en portent
 * 8 à 19 chacun ; les articles rédigés sans recherche web, zéro.
 *
 * Trois défenses complémentaires :
 *   1. `filterToolPreambles` (claude.service)  → supprime les blocs à la source
 *   2. `stripAiPreamble`     (article.routes)  → nettoie l'amorce d'une section
 *   3. `detectAiMetaLeaks`   (CLI, garde-fou)  → refuse d'exporter un texte sale
 *
 * Fonctions PURES et déterministes : aucune I/O, testables isolément.
 */

export interface AiMetaLeak {
  /** Nom du motif déclencheur — sert à expliquer le blocage à l'utilisateur. */
  pattern: string
  /** Position de la fuite dans le texte d'origine. */
  index: number
  /** Extrait lisible autour de la fuite, pour un message d'erreur actionnable. */
  excerpt: string
}

interface NamedPattern {
  name: string
  re: RegExp
}

/**
 * Fin de mot compatible avec les accents.
 *
 * Piège JavaScript : `\b` ne connaît que `[A-Za-z0-9_]`. Un motif terminé par
 * `augmenté\b` ou `demandé\b` ne matche donc JAMAIS, puisque « é » n'est pas un
 * caractère de mot. On utilise une anticipation négative Unicode à la place
 * (d'où le drapeau `u` sur tous les motifs).
 */
const WORD_END = '(?![\\p{L}\\p{N}_])'

/**
 * Motifs calibrés sur les fuites RÉELLES des articles #454 à #461.
 *
 * Règle de conception : rester **spécifique**. Un faux positif bloque un export
 * légitime, donc on exige la première personne + un verbe d'action sur soi
 * (« je vais rédiger ») et jamais une tournure adressée au lecteur
 * (« je vais vous montrer », « avant de rédiger votre page »).
 */
const PATTERNS: NamedPattern[] = [
  {
    name: 'annonce-de-recherche',
    re: new RegExp(
      `\\bje vais (?:d'abord |maintenant |ensuite |également )?(?:faire|effectuer|lancer|rechercher|chercher|consulter|vérifier)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'annonce-de-redaction',
    re: new RegExp(
      `\\bje vais (?:d'abord |maintenant |ensuite |donc )?(?:rédiger|écrire|générer|produire|procéder|commencer|structurer|organiser|synthétiser|intégrer|compléter|enrichir|construire|reformuler)${WORD_END}`,
      'giu',
    ),
  },
  {
    // « Parfait. J'ai… » / « Excellent. Je… » : l'IA qui se félicite avant d'écrire.
    name: 'auto-satisfecit',
    re: new RegExp(
      `\\b(?:parfait|excellent|très bien|d'accord|entendu)\\s*[.!,]\\s*(?:j'ai|je |voici|maintenant)`,
      'giu',
    ),
  },
  {
    name: 'je-dois-verifier',
    re: new RegExp(
      `\\bje dois (?:d'abord |maintenant )?(?:vérifier|chercher|rechercher|consulter|m'assurer)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'sources-obtenues',
    re: new RegExp(
      `\\bj'ai (?:maintenant |désormais |à présent |enfin )?(?:mes |les |des |toutes les |suffisamment d'|suffisamment de |assez d'|assez de )(?:sources|données|informations|éléments|chiffres)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'livraison-html',
    re: new RegExp(
      `\\bvoici (?:le |la )?(?:contenu|section|rédaction|texte)(?: html)?(?: (?:demandée?|rédigée?|complète?|finale?))?\\s*:`,
      'giu',
    ),
  },
  {
    name: 'donnees-disponibles',
    re: new RegExp(
      `\\bje dispose (?:à présent |maintenant |désormais )?d(?:e|es) (?:données|sources|informations|éléments)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'livraison-de-section',
    re: new RegExp(
      `\\bvoici (?:la|le|une|un) (?:section|version|rédaction|article|contenu|texte) (?:demandée?|réécrite?|complète?|finale?)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'permission',
    re: new RegExp(
      `\\blaissez-moi (?:d'abord )?(?:vérifier|chercher|rechercher|rédiger|consulter)${WORD_END}`,
      'giu',
    ),
  },
  {
    name: 'monologue-anglais',
    re: new RegExp(
      `\\b(?:let me|i'll|i will) (?:first )?(?:search|check|look up|research|verify|write|draft)${WORD_END}`,
      'giu',
    ),
  },
]

/** Uniformise apostrophes et casse SANS changer la longueur (index préservés). */
function normalize(text: string): string {
  return text.replace(/[’‘‛]/g, "'").toLowerCase()
}

/** Extrait lisible : un peu de contexte avant, la phrase après, balises retirées. */
function buildExcerpt(text: string, index: number): string {
  const raw = text.slice(Math.max(0, index - 40), index + 110)
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Repère les traces de monologue de l'IA dans un contenu.
 *
 * @param text    contenu HTML ou texte brut
 * @param options `max` plafonne le nombre de fuites remontées (défaut 10)
 * @returns les fuites triées par position, dédoublonnées par proximité
 */
export function detectAiMetaLeaks(text: string, options: { max?: number } = {}): AiMetaLeak[] {
  if (!text) return []
  const max = options.max ?? 10
  const haystack = normalize(text)
  const found: AiMetaLeak[] = []

  for (const { name, re } of PATTERNS) {
    // RegExp globale partagée → on repart systématiquement de zéro.
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(haystack)) !== null) {
      found.push({ pattern: name, index: match.index, excerpt: buildExcerpt(text, match.index) })
      if (match.index === re.lastIndex) re.lastIndex++ // garde anti-boucle
    }
  }

  found.sort((a, b) => a.index - b.index)

  // Deux motifs peuvent viser la même phrase : on ne la signale qu'une fois.
  const deduped: AiMetaLeak[] = []
  for (const leak of found) {
    const previous = deduped[deduped.length - 1]
    if (previous && leak.index - previous.index < 10) continue
    deduped.push(leak)
    if (deduped.length >= max) break
  }

  return deduped
}

/**
 * Retire la phrase d'annonce éventuelle placée AVANT la première balise HTML.
 *
 * Le prompt impose une réponse en HTML : tout texte nu en tête est déjà une
 * entorse. On ne le supprime toutefois que s'il ressemble à un monologue —
 * un chiffre d'accroche mal balisé reste préservé.
 */
export function stripAiPreamble(html: string): string {
  if (!html) return html

  const firstTag = html.search(/<[a-zA-Z!/]/)
  if (firstTag <= 0) return html

  const lead = html.slice(0, firstTag)
  if (!lead.trim()) return html

  const looksLikeChatter =
    detectAiMetaLeaks(lead, { max: 1 }).length > 0 || META_OPENER.test(normalize(lead))
  if (!looksLikeChatter) return html

  return html.slice(firstTag)
}

/**
 * Premiers mots typiques du bavardage de l'IA en tête de réponse. Un contenu
 * éditorial commence par une balise ; du texte nu qui s'ouvre ainsi est
 * toujours une adresse de l'IA à son commanditaire (run réel #1012).
 */
const META_OPENER =
  /^\s*(?:parfait|excellent|très bien|d'accord|entendu|bien sûr|voici|maintenant|je |j'ai |avant de |laissez-moi)/

/**
 * Retire les `<h1>` du corps d'un article.
 *
 * Le gabarit d'export pose déjà le titre en `<h1>` dans le bandeau : garder
 * celui du contenu produisait deux H1 sur la page (constaté sur #455).
 */
export function stripContentH1(html: string): string {
  if (!html) return html
  return html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')
}
