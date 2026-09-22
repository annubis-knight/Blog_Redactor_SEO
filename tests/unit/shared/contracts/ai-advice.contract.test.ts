// @vitest-environment node
/**
 * Contrats du conseil IA rédigé (NFR-INT-DISPLAY-CONTRACTS, lot 7).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { adviceMarkdown, aiAdviceContract, aiAdviceDoneContract } from '../../../../shared/contracts/ai-advice.contract.js'
import { parseContract, setContractReporter, ContractViolationError } from '../../../../shared/contracts/core.js'

afterEach(() => setContractReporter(() => {}))

describe('adviceMarkdown — mise en forme à l’affichage', () => {
  it('un conseil normal est rendu tel quel, espaces compris (morceaux en flux)', () => {
    const text = '## Verdict\n\nMot-clé **porteur** pour un pilier.\n'
    expect(adviceMarkdown(text)).toBe(text)
  })

  it('l’emballage « ```markdown … ``` » est retiré (sinon affiché en texte brut)', () => {
    expect(adviceMarkdown('```markdown\n## Verdict\nPorteur.\n```')).toBe('## Verdict\nPorteur.')
    expect(adviceMarkdown('\n```md\n## Verdict\n```\n')).toBe('## Verdict')
  })

  it('pendant le flux, l’ouverture est retirée avant même la fermeture', () => {
    expect(adviceMarkdown('```markdown\n## Verd')).toBe('## Verd')
  })

  it('un bloc de code légitime au milieu du conseil est conservé', () => {
    const text = 'Exemple de balise :\n\n```html\n<h1>Titre</h1>\n```'
    expect(adviceMarkdown(text)).toBe(text)
  })
})

describe('aiAdviceContract — texte complet (frontière serveur)', () => {
  it('un conseil vide est refusé : l’écran propose « Régénérer » au lieu d’un panneau blanc', () => {
    expect(() => parseContract(aiAdviceContract, '   \n', 'server')).toThrow(ContractViolationError)
    expect(() => parseContract(aiAdviceContract, '```markdown\n```', 'server')).toThrow(ContractViolationError)
  })

  it('un conseil rédigé passe, déballé', () => {
    expect(parseContract(aiAdviceContract, '```markdown\n## Verdict\n```', 'server')).toBe('## Verdict')
  })
})

describe('aiAdviceDoneContract — événement done (frontière client)', () => {
  it('porte le mot-clé et le niveau ; un champ absent devient vide', () => {
    expect(parseContract(aiAdviceDoneContract, { keyword: 'création site web', level: 'pilier' }, 'client'))
      .toEqual({ keyword: 'création site web', level: 'pilier' })
    expect(parseContract(aiAdviceDoneContract, { keyword: 'x' }, 'client').level).toBe('')
  })
})
