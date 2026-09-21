/**
 * Réparation structurelle du HTML d'article généré.
 *
 * Deux défauts constatés sur les piliers de juillet 2026 (audit 2026-09-19) :
 *
 * 1. **Texte orphelin** — du texte nu, hors de tout paragraphe, placé entre
 *    deux blocs : `…</p>Je vais rechercher…\n\n<h2>`. C'est la forme exacte du
 *    monologue de l'IA avant ses recherches web, et de son auto-évaluation en
 *    Markdown (`--- **Remarques de cohérence :** ✅ …`).
 *    La détection est STRUCTURELLE, pas lexicale : elle attrape aussi les
 *    formulations inédites (« Voici la rédaction de la section demandée : »
 *    avait échappé aux motifs de `detectAiMetaLeaks` sur #456). Un générateur
 *    sain n'émet jamais de texte hors d'un bloc.
 *
 * 2. **Blocs tronqués** — la génération d'un groupe de sections s'arrêtait au
 *    plafond de tokens, en plein mot (« …coûte deux minutes à rédiger. Vo »).
 *    On coupe à la dernière phrase complète ; un paragraphe sans aucune phrase
 *    complète est retiré.
 *
 * Fonctions PURES : HTML en entrée, HTML réparé + rapport en sortie.
 */

/** Éléments qui ne doivent jamais contenir de texte directement. */
const TEXTLESS_CONTAINERS = new Set(['ul', 'ol', 'table', 'thead', 'tbody', 'tfoot', 'tr'])

/** Éléments sans balise fermante. */
const VOID_ELEMENTS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr', 'source'])

/** Ponctuation qui termine proprement un bloc de texte. */
const ENDS_CLEANLY = /[.!?:;…»)"”%\]]$/

/** Caractères qui peuvent suivre une ponctuation finale (guillemets, parenthèses). */
const SENTENCE_CLOSERS = /[»")\]”’]/

interface OrphanRun {
  start: number
  end: number
  text: string
}

/**
 * Parcourt le HTML en suivant l'imbrication des balises et renvoie les
 * portions de texte situées au niveau racine ou directement dans une liste.
 */
function scanOrphanRuns(html: string): OrphanRun[] {
  const runs: OrphanRun[] = []
  const stack: string[] = []
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g

  const handleText = (start: number, end: number): void => {
    const text = html.slice(start, end)
    if (!text.trim()) return
    const parent = stack[stack.length - 1]
    if (parent === undefined || TEXTLESS_CONTAINERS.has(parent)) {
      runs.push({ start, end, text })
    }
  }

  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(html)) !== null) {
    handleText(cursor, match.index)
    cursor = tagRe.lastIndex

    const tag = match[0]
    const name = match[1]?.toLowerCase()
    if (!name) continue // commentaire HTML

    if (tag.startsWith('</')) {
      const open = stack.lastIndexOf(name)
      if (open >= 0) stack.length = open
    } else if (!VOID_ELEMENTS.has(name) && !tag.endsWith('/>')) {
      stack.push(name)
    }
  }
  handleText(cursor, html.length)

  return runs
}

/** Renvoie le texte orphelin trouvé (espaces de bord retirés). */
export function detectOrphanBlockText(html: string): string[] {
  if (!html) return []
  return scanOrphanRuns(html).map((run) => run.text.trim())
}

/**
 * Retire le texte orphelin. Les retours à la ligne qui l'entouraient sont
 * conservés (deux au plus) pour ne pas coller les blocs voisins.
 */
export function stripOrphanBlockText(html: string): { html: string; removed: string[] } {
  if (!html) return { html, removed: [] }
  const runs = scanOrphanRuns(html)
  if (runs.length === 0) return { html, removed: [] }

  let out = html
  // De la fin vers le début : les positions restent valides.
  for (const run of [...runs].reverse()) {
    const newlines = Math.min(2, (run.text.match(/\n/g) ?? []).length)
    out = out.slice(0, run.start) + '\n'.repeat(newlines) + out.slice(run.end)
  }
  return { html: out, removed: runs.map((r) => r.text.trim()) }
}

/** Texte visible d'un fragment HTML. */
function visibleText(fragment: string): string {
  return fragment
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Position juste après la dernière fin de phrase (hors balises), ou -1.
 * Une fin de phrase = `. ! ? …` suivie d'un espace, d'une balise ou de la fin —
 * ce qui exclut les décimales (« 3.5 »).
 */
function lastSentenceEnd(inner: string): number {
  let inTag = false
  let last = -1
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!
    if (ch === '<') {
      inTag = true
      continue
    }
    if (ch === '>') {
      inTag = false
      continue
    }
    if (inTag || !'.!?…'.includes(ch)) continue

    let j = i + 1
    while (j < inner.length && SENTENCE_CLOSERS.test(inner[j]!)) j++
    const next = inner[j]
    if (next === undefined || next === '<' || /\s/.test(next)) last = j
  }
  return last
}

/** Referme les balises restées ouvertes dans un fragment coupé. */
function closeOpenTags(fragment: string): string {
  const stack: string[] = []
  for (const m of fragment.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)) {
    const name = m[1]!.toLowerCase()
    if (m[0].startsWith('</')) {
      const open = stack.lastIndexOf(name)
      if (open >= 0) stack.length = open
    } else if (!VOID_ELEMENTS.has(name) && !m[0].endsWith('/>')) {
      stack.push(name)
    }
  }
  return fragment + stack.reverse().map((name) => `</${name}>`).join('')
}

/**
 * Signature d'un bilan que l'IA s'adresse à elle-même : du gras Markdown
 * (`**…**`, jamais valide en HTML) accompagné d'une coche ou d'un intitulé de
 * relecture. Les coches seules restent permises : une liste « ✅ Vous êtes
 * éligible si… » s'adresse au lecteur (#455).
 */
const SELF_REVIEW_MARKERS = /✅|❌|remarques de cohérence|notes de rédaction|notes importantes/i

/**
 * Retire les blocs d'auto-évaluation de l'IA restés DANS un paragraphe
 * (cas réel #460 : « `✅ **Accroche douleur** : … ✅ **Paragraphes courts** »),
 * que `stripOrphanBlockText` ne peut pas atteindre.
 */
export function removeSelfReviewBlocks(html: string): { html: string; removed: string[] } {
  if (!html) return { html, removed: [] }
  const removed: string[] = []

  const out = html.replace(
    /<(p|li|div|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (full: string, _tag: string, inner: string) => {
      const text = visibleText(inner)
      if (!text.includes('**') || !SELF_REVIEW_MARKERS.test(text)) return full
      removed.push(text)
      return ''
    },
  )

  return { html: out, removed }
}

/**
 * Répare les paragraphes et éléments de liste tronqués.
 *
 * - `<p>` sans ponctuation finale → coupé à la dernière phrase complète,
 *   supprimé s'il n'en contient aucune.
 * - `<li>` : un libellé sans point final est un usage NORMAL. On ne coupe que
 *   si l'élément contient déjà une phrase complète suivie d'un fragment.
 *   Les éléments contenant une sous-liste sont laissés intacts.
 */
export function trimTruncatedBlocks(html: string): { html: string; trimmed: string[] } {
  if (!html) return { html, trimmed: [] }
  const trimmed: string[] = []

  const out = html.replace(
    /<(p|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full: string, tag: string, attrs: string, inner: string) => {
      const kind = tag.toLowerCase()
      if (kind === 'li' && /<(ul|ol|li)\b/i.test(inner)) return full

      const text = visibleText(inner)
      if (!text || ENDS_CLEANLY.test(text)) return full

      const cut = lastSentenceEnd(inner)
      if (cut < 0) {
        if (kind === 'li') return full
        trimmed.push(text)
        return ''
      }

      const kept = closeOpenTags(inner.slice(0, cut)).trimEnd()
      trimmed.push(visibleText(inner.slice(cut)))
      return `<${tag}${attrs}>${kept}</${tag}>`
    },
  )

  return { html: out, trimmed }
}
