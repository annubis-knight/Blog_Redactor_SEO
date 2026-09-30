// @vitest-environment node
/**
 * FR-RED-OUTLINE — réordonner le sommaire par glisser-déposer, sauf le H1.
 *
 * Recette du 2026-09-30 (RED-7) : lâcher « Introduction » sur la ligne du H1
 * donnait « Introduction, ★ H1, … » : le chapitre passait au-dessus du titre.
 */
import { describe, it, expect } from 'vitest'
import { moveOutlineSection } from '../../../shared/structure-outline'
import type { OutlineSection } from '../../../shared/types/outline.types'

const section = (id: string, level: 1 | 2 | 3): OutlineSection => ({ id, level, title: id, annotation: null, status: 'accepted' })
const OUTLINE = [section('H1', 1), section('Intro', 2), section('A', 2), section('A1', 3), section('Conclusion', 2)]
const ids = (list: OutlineSection[]) => list.map(s => s.id)

describe('FR-RED-OUTLINE — moveOutlineSection (recette 2026-09-30, RED-7)', () => {
  it('un chapitre lâché sur la ligne du H1 se place juste après lui', () => {
    expect(ids(moveOutlineSection(OUTLINE, 1, 0))).toEqual(['H1', 'Intro', 'A', 'A1', 'Conclusion'])
    expect(ids(moveOutlineSection(OUTLINE, 4, 0))).toEqual(['H1', 'Conclusion', 'Intro', 'A', 'A1'])
  })

  it('le H1 ne bouge pas', () => {
    expect(ids(moveOutlineSection(OUTLINE, 0, 3))).toEqual(ids(OUTLINE))
  })

  it('glisser un chapitre sous le suivant, puis le remettre', () => {
    const moved = moveOutlineSection(OUTLINE, 1, 2)
    expect(ids(moved)).toEqual(['H1', 'A', 'Intro', 'A1', 'Conclusion'])
    expect(ids(moveOutlineSection(moved, 2, 1))).toEqual(ids(OUTLINE))
  })

  it('la liste reçue n’est pas modifiée', () => {
    const before = ids(OUTLINE)
    moveOutlineSection(OUTLINE, 4, 1)
    expect(ids(OUTLINE)).toEqual(before)
  })

  it('un indice hors liste ne change rien', () => {
    expect(ids(moveOutlineSection(OUTLINE, 9, 1))).toEqual(ids(OUTLINE))
  })
})
