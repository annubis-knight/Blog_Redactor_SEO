/**
 * FR-RED-DRAFT-SINGLE-PASS — le premier jet arrive en UN flux ; l'écran garde sa
 * progression chapitre par chapitre. Le serveur repère les `<h2>` au fil du
 * flux, même coupés entre deux paquets, et réémet `section-start` / `section-done`.
 */
import { describe, it, expect } from 'vitest'
import { createH2Tracker } from '../../../shared/html-stream'

const TITLES = ['Pourquoi', 'Comment', 'Combien']

function run(chunks: string[]) {
  const tracker = createH2Tracker(TITLES)
  const events = [...tracker.start(), ...chunks.flatMap(c => tracker.push(c)), ...tracker.finish()]
  return events.map(e => `${e.type}:${e.index}`)
}

describe('createH2Tracker', () => {
  it('un chapitre par H2, le chapeau compté dans le premier', () => {
    expect(run(['<h1>T</h1><p>Chapeau</p><h2>Pourquoi</h2><p>a</p><h2>Comment</h2><p>b</p><h2>Combien</h2><p>c</p>']))
      .toEqual(['section-start:0', 'section-done:0', 'section-start:1', 'section-done:1', 'section-start:2', 'section-done:2'])
  })

  it('un <h2 coupé entre deux paquets n’est compté qu’une fois, au bon moment', () => {
    expect(run(['<h2>Pourquoi</h2><p>a</p><', 'h', '2>Comm', 'ent</h2><p>b</p><h2>Combien</h2>']))
      .toEqual(['section-start:0', 'section-done:0', 'section-start:1', 'section-done:1', 'section-start:2', 'section-done:2'])
  })

  it('les titres viennent du sommaire, l’index de l’ordre des H2', () => {
    const tracker = createH2Tracker(TITLES)
    const start = tracker.start()
    expect(start).toEqual([{ type: 'section-start', index: 0, total: 3, title: 'Pourquoi' }])
    expect(tracker.push('<h2>Pourquoi</h2><h2 class="x">Autre titre écrit par l’IA</h2>'))
      .toEqual([{ type: 'section-done', index: 0 }, { type: 'section-start', index: 1, total: 3, title: 'Comment' }])
  })

  it('plus de H2 que prévu : l’index continue, le total reste celui du sommaire', () => {
    const events = run(['<h2>Pourquoi</h2><h2>Comment</h2><h2>Combien</h2><h2>Bonus</h2>'])
    expect(events.at(-1)).toBe('section-done:3')
  })

  it('ne clôt jamais deux fois le dernier chapitre', () => {
    const tracker = createH2Tracker(TITLES)
    tracker.start()
    tracker.push('<h2>Pourquoi</h2>')
    expect(tracker.finish()).toEqual([{ type: 'section-done', index: 0 }])
    expect(tracker.finish()).toEqual([])
  })

  it('compte les H2 écrits (pour la continuation après une coupure)', () => {
    const tracker = createH2Tracker(TITLES)
    tracker.start()
    tracker.push('<p>x</p><h2>Pourquoi</h2><p>a</p><h')
    expect(tracker.h2Seen()).toBe(1)
  })

  it('une continuation reprend au chapitre coupé, avec les bons index', () => {
    const tracker = createH2Tracker(TITLES, 1)
    expect(tracker.start()).toEqual([{ type: 'section-start', index: 1, total: 3, title: 'Comment' }])
    expect(tracker.push('<h2>Comment</h2><p>b</p><h2>Combien</h2>').map(e => `${e.type}:${e.index}`))
      .toEqual(['section-done:1', 'section-start:2'])
  })
})
