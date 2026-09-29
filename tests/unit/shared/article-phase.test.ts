// @vitest-environment node
/**
 * FR-MOT-RECAP-PUBLISHED — la phase d'un article suit son avancement réel
 * (épopée qualité SEO, P2).
 *
 * La liste « Articles publiés » du Moteur lit `articles.phase`. Aucune route ne
 * la mettait à jour : le pilier 1013, rédigé puis publié, est resté en
 * `proposed`, et la liste était toujours vide.
 */
import { describe, it, expect } from 'vitest'
import { nextArticlePhase } from '../../../shared/utils/article-phase.js'

describe('nextArticlePhase', () => {
  it('un article dont on enregistre du contenu passe en rédaction', () => {
    expect(nextArticlePhase('proposed', 'content-saved')).toBe('redaction')
    expect(nextArticlePhase('moteur', 'content-saved')).toBe('redaction')
  })

  it('un article publié passe en « published », d’où qu’il vienne', () => {
    expect(nextArticlePhase('proposed', 'published')).toBe('published')
    expect(nextArticlePhase('redaction', 'published')).toBe('published')
  })

  it('ne fait jamais reculer la phase', () => {
    expect(nextArticlePhase('published', 'content-saved')).toBe('published')
    expect(nextArticlePhase('redaction', 'content-saved')).toBe('redaction')
  })

  it('traite une phase inconnue ou absente comme « proposed »', () => {
    expect(nextArticlePhase(null, 'content-saved')).toBe('redaction')
    expect(nextArticlePhase('n-importe-quoi', 'published')).toBe('published')
  })
})
