/**
 * Lecture des exigences écrites (`spec/requirements.md`) pour les tests qui
 * relient d'autres documents aux exigences : la recette manuelle
 * (NFR-TEST-RECETTE-COVERAGE) et les parcours utilisateur
 * (NFR-TEST-PARCOURS-TRACE).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type RequirementStatus = 'active' | 'non-tenue' | 'prevue' | 'retiree'

/** Motif d'un identifiant d'exigence (`FR-…` ou `NFR-…`). */
export const REQUIREMENT_ID = String.raw`(?:N?FR)-[A-Z0-9]+(?:-[A-Z0-9]+)+`

/** Retire les blocs de code : leurs exemples ne sont ni des exigences ni des vérifications. */
export function withoutCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '')
}

function statusOf(line: string): RequirementStatus | null {
  const value = line.replace(/^\*\*Statut :\*\*\s*/, '').trim().toLowerCase()
  if (value.startsWith('active')) return 'active'
  if (value.startsWith('non tenue')) return 'non-tenue'
  if (value.startsWith('prévue')) return 'prevue'
  if (value.startsWith('retirée')) return 'retiree'
  return null
}

/** Les exigences écrites (`### ID — Titre`) et leur statut. */
export function readRequirementStatuses(root: string): Map<string, RequirementStatus> {
  const lines = withoutCodeBlocks(readFileSync(join(root, 'spec/requirements.md'), 'utf8')).split(/\r?\n/)
  const heading = new RegExp(`^### (${REQUIREMENT_ID}) — `)
  const requirements = new Map<string, RequirementStatus>()
  let current: string | null = null
  for (const line of lines) {
    const match = heading.exec(line)
    if (match) { current = match[1]!; continue }
    if (current && line.startsWith('**Statut :**')) {
      const status = statusOf(line)
      if (status) requirements.set(current, status)
      current = null
    }
  }
  return requirements
}

/** Identifiants d'une ligne « **Exigences :** », avec leur marque ⚠. */
export function idsOfRequirementsLine(line: string): Array<{ id: string; warned: boolean }> {
  const token = new RegExp(`(${REQUIREMENT_ID})(\\s*⚠)?`, 'g')
  return [...line.matchAll(token)].map(m => ({ id: m[1]!, warned: Boolean(m[2]) }))
}

/**
 * Écart entre la marque ⚠ et le statut d'une exigence, ou `null` si tout va bien :
 * non tenue ⇒ ⚠ ; active ⇒ sans ⚠ ; prévue ⇒ ne se cite pas comme livrée.
 */
export function warningMismatch(id: string, warned: boolean, status: RequirementStatus | undefined): string | null {
  if (status === 'non-tenue' && !warned) return `${id} est non tenue : écris « ${id} ⚠ »`
  if (status === 'active' && warned) return `${id} est active : retire son « ⚠ »`
  if (status === 'prevue') return `${id} est prévue, pas livrée`
  return null
}
