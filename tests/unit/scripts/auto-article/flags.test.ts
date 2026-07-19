import { describe, it, expect } from 'vitest'
import { parseArgs } from '../../../../scripts/auto-article/flags.js'

describe('auto:flags — parseArgs', () => {
  it('retourne un objet vide sans argument', () => {
    expect(parseArgs([])).toEqual({})
  })

  it('parse --mode=real et --mode real', () => {
    expect(parseArgs(['--mode=real']).mode).toBe('real')
    expect(parseArgs(['--mode', 'mock']).mode).toBe('mock')
  })

  it('rejette un mode invalide', () => {
    expect(() => parseArgs(['--mode=prod'])).toThrow(/mock.*real/)
  })

  it('parse --verbose / -v', () => {
    expect(parseArgs(['--verbose']).verbose).toBe(true)
    expect(parseArgs(['-v']).verbose).toBe(true)
  })

  it('parse --resume et --port en entiers positifs', () => {
    expect(parseArgs(['--resume=42']).resumeArticleId).toBe(42)
    expect(parseArgs(['--port', '3400']).port).toBe(3400)
  })

  it('rejette un entier non positif', () => {
    expect(() => parseArgs(['--resume=0'])).toThrow(/entier positif/)
    expect(() => parseArgs(['--port=-1'])).toThrow(/entier positif/)
  })

  it('parse --config=chemin', () => {
    expect(parseArgs(['--config=run.json']).configPath).toBe('run.json')
  })

  it('parse --help / -h', () => {
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-h']).help).toBe(true)
  })

  it('rejette un argument inconnu', () => {
    expect(() => parseArgs(['--wat'])).toThrow(/inconnu/)
  })

  it('parse --cocoon et --level (emplacement imposé)', () => {
    const f = parseArgs(['--cocoon=Stratégie de croissance', '--level=pilier'])
    expect(f.cocoon).toBe('Stratégie de croissance')
    expect(f.level).toBe('pilier')
  })

  it('accepte les trois niveaux canoniques', () => {
    for (const level of ['pilier', 'intermediaire', 'specifique']) {
      expect(parseArgs([`--level=${level}`]).level).toBe(level)
    }
  })

  it('rejette un niveau invalide', () => {
    expect(() => parseArgs(['--level=Pilier'])).toThrow(/pilier/)
    expect(() => parseArgs(['--level=wat'])).toThrow(/pilier/)
  })

  it('rejette --cocoon sans valeur', () => {
    expect(() => parseArgs(['--cocoon='])).toThrow(/valeur/)
  })

  it('combine plusieurs flags', () => {
    const f = parseArgs(['--mode=real', '--verbose', '--port=5000'])
    expect(f).toEqual({ mode: 'real', verbose: true, port: 5000 })
  })
})
