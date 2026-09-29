// @vitest-environment node
/**
 * FR-RED-META — ramener un meta title / une meta description à la longueur
 * affichée par Google sans les couper en plein vol (épopée qualité SEO, R4).
 *
 * La route coupait la description à 157 caractères et ajoutait « ... » : le
 * pilier 1013 s'est retrouvé avec « …pour générer des clients en... », que le
 * valideur `validateArticleMeta` classe lui-même en erreur. Le correctif est
 * vérifié CONTRE ce valideur : ce qu'on produit, il doit l'accepter.
 */
import { describe, it, expect } from 'vitest'
import { fitMetaText } from '../../../shared/utils/meta-fit.js'
import { validateArticleMeta } from '../../../shared/content-validators.js'

const DESC_1013 =
  "Propulsez la croissance digitale de votre entreprise toulousaine. Stratégie, SEO local, conversion : tout ce qu'il faut savoir pour générer des clients en ligne dès cette année."

function issuesFor(metaTitle: string, metaDescription: string): string[] {
  return validateArticleMeta({ metaTitle, metaDescription }).map(i => i.rule)
}

describe('fitMetaText — jamais coupé en plein vol', () => {
  it('laisse intact un texte déjà assez court', () => {
    expect(fitMetaText('Stratégie digitale PME : le guide 2026', 60)).toBe('Stratégie digitale PME : le guide 2026')
  })

  it('ne termine jamais par des points de suspension', () => {
    const out = fitMetaText(DESC_1013, 160)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out).not.toMatch(/(\.\.\.|…)$/)
  })

  it('produit une description que le valideur accepte (cas du pilier 1013)', () => {
    const out = fitMetaText(DESC_1013, 160)
    expect(issuesFor('Stratégie digitale PME à Toulouse', out)).toEqual([])
  })

  it('ne finit pas sur un mot qui ne termine jamais une phrase (« en », « de »)', () => {
    const out = fitMetaText('Un guide complet pour les dirigeants de PME qui veulent enfin des résultats concrets avec leur site web et leur visibilité locale en', 120)
    expect(out.split(/\s+/).pop()).not.toMatch(/^(en|de|des|pour|et)$/i)
  })

  it('préfère s’arrêter à la fin d’une phrase quand elle garde l’essentiel', () => {
    const texte = 'Votre site ne génère aucun client malgré vos efforts et votre budget marketing mensuel ? Découvrez les trois causes les plus fréquentes et les actions à mener cette semaine, sans prestataire.'
    const out = fitMetaText(texte, 160)
    expect(out).toBe('Votre site ne génère aucun client malgré vos efforts et votre budget marketing mensuel ?')
  })

  it('ne coupe pas à une phrase trop courte : elle perdrait l’essentiel', () => {
    const texte = 'Site muet ? Découvrez les trois causes les plus fréquentes et les actions à mener cette semaine, sans prestataire, pour y remédier durablement et mesurer vos résultats.'
    const out = fitMetaText(texte, 160)
    expect(out.startsWith('Site muet ? Découvrez')).toBe(true)
    expect(issuesFor('Titre correct', out)).toEqual([])
  })

  it('retire des points de suspension ajoutés par l’IA elle-même', () => {
    expect(fitMetaText('Un titre qui se termine mal...', 60)).toBe('Un titre qui se termine mal')
  })

  it('tient pour des titres longs aussi', () => {
    const out = fitMetaText('Stratégie digitale pour les entreprises toulousaines : le guide complet et pratique', 60)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(issuesFor(out, 'Une description correcte et complète qui se termine proprement.')).toEqual([])
  })
})
