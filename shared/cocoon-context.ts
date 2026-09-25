/**
 * Contexte du cocon, rédigé pour un prompt (FR-INFRA-COCOON-CONTEXT).
 *
 * Le Cerveau, le Moteur et la Rédaction reçoivent le même état du cocon : ses
 * articles, leurs niveaux et mots-clés, la section de parent dont chacun est
 * né, rédigé ou non ; et pour l'article visé, ce que son parent dit déjà de lui
 * et les enfants qu'il doit résumer au lieu de les creuser. Le pilier 1013 a été
 * écrit sans rien savoir de ses enfants : il a traité en profondeur ce qu'ils
 * devaient dire.
 *
 * Rendu pur : les données viennent de `cocoon-context.service.ts`.
 */
import type { CocoonTreeNode } from './types/cocoon-tree.types.js'
import type { ArticleLevel } from './types/keyword-validate.types.js'

interface CocoonContextFocus {
  /** L'article visé (Moteur, Rédaction) ; absent pour un article à naître (Cerveau). */
  articleId?: number
  parentId: number | null
  parentSection: string | null
}

interface CocoonContextInput {
  cocoonName: string
  tree: CocoonTreeNode[]
  focus?: CocoonContextFocus
  /** Texte brut de la section du parent qui annonce l'article. */
  parentSectionText?: string | null
}

const LEVEL_LABEL: Record<ArticleLevel, string> = { pilier: 'pilier', intermediaire: 'intermédiaire', specifique: 'spécialisé' }

/** Au-delà, la section du parent est coupée : elle sert de repère, pas de source. */
const PARENT_SECTION_MAX_CHARS = 1200

function describe(n: CocoonTreeNode): string {
  const keyword = n.keyword ? ` (mot-clé « ${n.keyword} »)` : ''
  return `« ${n.title} »${keyword} — ${n.drafted ? 'rédigé' : 'à rédiger'}`
}

function renderNode(n: CocoonTreeNode, byId: Map<number, CocoonTreeNode>, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth)
  if (depth === 0) lines.push(`${indent}- ${LEVEL_LABEL[n.level].replace(/^./, c => c.toUpperCase())} ${describe(n)}`)
  for (const s of n.sections) {
    const child = s.childId !== null ? byId.get(s.childId) : undefined
    if (!child) {
      lines.push(`${indent}  - Section « ${s.title} » → pas encore d’article`)
      continue
    }
    lines.push(`${indent}  - Section « ${s.title} » → ${LEVEL_LABEL[child.level]} ${describe(child)}`)
    renderNode(child, byId, depth + 1, lines)
  }
}

function cut(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max).replace(/\s+\S*$/, '')} […]`
}

export function renderCocoonContext(input: CocoonContextInput): string {
  const { tree, focus } = input
  const byId = new Map(tree.map(n => [n.id, n]))
  const lines: string[] = [`## Cocon « ${input.cocoonName} »`, '']

  if (tree.length === 0) {
    lines.push('Le cocon est vide : cet article en sera le pilier, la page qui présente tout le sujet et annonce chacun des articles à venir.')
    return lines.join('\n')
  }

  for (const pillar of tree.filter(n => n.level === 'pilier')) renderNode(pillar, byId, 0, lines)
  const orphans = tree.filter(n => n.level !== 'pilier' && n.parentId === null)
  if (orphans.length > 0) {
    lines.push('- Articles sans parent dans l’arbre (créés avant lui) :')
    for (const o of orphans) lines.push(`  - ${LEVEL_LABEL[o.level]} ${describe(o)}`)
  }

  if (!focus) return lines.join('\n')

  lines.push('', '## Cet article dans le cocon', '')
  const parent = focus.parentId !== null ? byId.get(focus.parentId) : undefined
  if (parent && focus.parentSection) {
    lines.push(`- Il naît de la section « ${focus.parentSection} » de « ${parent.title} » (${LEVEL_LABEL[parent.level]}).`)
    if (input.parentSectionText?.trim()) {
      lines.push(`  Ce que « ${parent.title} » en dit déjà :`, `  > ${cut(input.parentSectionText, PARENT_SECTION_MAX_CHARS)}`)
    }
    lines.push('  Cet article développe en profondeur ce que cette section résume : il ne la répète pas.')
  }

  const self = focus.articleId !== undefined ? byId.get(focus.articleId) : undefined
  const children = (self?.sections ?? []).filter(s => s.childId !== null)
  if (children.length > 0) {
    lines.push('- Ses sections qui ont déjà leur propre article :')
    for (const s of children) lines.push(`  - « ${s.title} » → « ${s.childTitle} »`)
    lines.push('  Chacune résume son sujet en quelques phrases et renvoie vers cet article ; elle ne le traite pas en profondeur.')
  }
  return lines.join('\n')
}
