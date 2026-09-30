// @vitest-environment node
/**
 * Cohérence des dérogations (design/data-flows/gate-waivers.md).
 *
 * Le point que l'alarme affiche, celui que le serveur couvre et celui que la
 * publication réaffiche doivent être le MÊME point, par la même expression
 * d'empreinte (`pointFingerprint`). Recette du 2026-09-30 : les dérogations du
 * premier jet étaient redemandées à la publication sous un autre nom, et la
 * réaffichée montrait un identifiant interne au lieu du point.
 */
import { describe, it, expect } from 'vitest'
import { evaluateGate, pointFingerprint, waiverDraftsFrom, withFingerprints, type GateWaiver } from '../../../shared/verifiers/gate'
import { verifyDraft } from '../../../shared/verifiers/draft'
import { verifyPublish, type PublishGateInput } from '../../../shared/verifiers/publish'

const REPETE = 'Un site clair rassure le client et lui donne envie de vous appeler sans attendre la semaine prochaine.'
const TEXTE = `<h1>Isolation des combles : le guide</h1><h2>Pourquoi</h2><p>${REPETE}</p><h2>Comment</h2><p>${REPETE}</p>`
const RAISON = 'Répétition voulue : même promesse dans deux chapitres'

describe('FR-INFRA-GATE-WAIVER — le point affiché est le point dérogé', () => {
  it('l’empreinte renvoyée par l’alarme est celle avec laquelle le serveur couvre le point', () => {
    const points = withFingerprints('publish', verifyPublish({
      title: 'Isolation des combles : le guide', slug: 'isolation-combles', level: 'specifique', content: TEXTE,
      metaTitle: 'Isolation des combles', metaDescription: 'Le guide de l’isolation des combles, simplement.',
      capitaine: 'isolation combles', lieutenants: [], existingWaivers: [],
    }), 'porte')
    const point = points.find(i => i.rule.startsWith('repeated-paragraph'))!
    const { drafts } = waiverDraftsFrom([point], { [point.rule]: { category: 'autre', reason: RAISON } })
    const waiver: GateWaiver = { gateId: 'publish', rule: drafts[0]!.rule, level: 'risque', category: 'autre', reason: RAISON, inputHash: drafts[0]!.fingerprint }
    expect(evaluateGate('publish', [point], [waiver], 'autre-empreinte-de-porte').waived.map(w => w.issue.rule)).toEqual([point.rule])
  })

  it('premier jet et publication : même paragraphe répété, même empreinte ; la réaffichée montre le point, pas la règle', () => {
    const auJet = verifyDraft({ content: TEXTE, captain: 'isolation combles', targetWords: 40, outlineH2Count: 2 })
      .find(i => i.rule.startsWith('draft-repeated-paragraph'))!
    const waiver: GateWaiver = { gateId: 'draft', rule: auJet.rule, level: 'risque', category: 'autre', reason: RAISON, inputHash: pointFingerprint('draft', auJet, 'jet') }
    const input: PublishGateInput = {
      title: 'Isolation des combles : le guide', slug: 'isolation-combles', level: 'specifique', content: TEXTE,
      metaTitle: 'Isolation des combles', metaDescription: 'Le guide de l’isolation des combles, simplement.',
      capitaine: 'isolation combles', lieutenants: [], existingWaivers: [], draftWaivers: [waiver],
    }
    const relire = verifyPublish(input).find(i => i.rule.startsWith('waiver-reconfirm:draft:'))!
    expect(relire.message).toContain(auJet.message.replace(/\.$/, ''))
    expect(relire.message).not.toContain(auJet.rule)
  })
})
