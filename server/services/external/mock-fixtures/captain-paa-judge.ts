/**
 * Mock fixture: submit_paa_judgments
 *
 * Tool utilisé par captain-paa-judge.service.ts::judgePaaForKeyword pour évaluer
 * la pertinence des PAA d'un keyword vs sujet + point de douleur de l'article.
 *
 * Le mock retourne un verdict déterministe basé sur des heuristiques simples du
 * contenu du userPrompt :
 *   - PAA contenant des mots du painPoint → `pertinent`
 *   - PAA contenant le mot-clé mais pas la douleur → `partiel`
 *   - PAA sans signal lexical → `hors-sujet`
 *
 * Permet aux tests CI et au mode démo de fonctionner sans clé Anthropic.
 */
import { registerToolFixture } from '../mock.service.js'

interface MockPaaJudgment {
  paaIndex: number
  badge: 'pertinent' | 'partiel' | 'hors-sujet'
  paaScore: number
  reasonShort: string
}

registerToolFixture('submit_paa_judgments', ({ userPrompt }) => {
  // Extraction du painPoint depuis le prompt rendu : ligne "**Point de douleur central** : ..."
  const painPointMatch = userPrompt.match(/\*\*Point de douleur central\*\*\s*:\s*([^\n]+)/i)
  const painPoint = painPointMatch?.[1]?.trim() ?? ''

  // Extraction du keyword : ligne après "## Mot-clé en cours d'évaluation"
  const keywordMatch = userPrompt.match(/##\s*Mot-cl\u00e9 en cours d'\u00e9valuation\s*\n+([^\n]+)/i)
  const keyword = keywordMatch?.[1]?.trim().toLowerCase() ?? ''

  // Extraction des PAA : lignes commençant par "[index]" ou "- index |" dans la section PAA scannés.
  // Le service backend formate avec "0 | question | answer" (cf. formatPaaList).
  const paaSection = userPrompt.split(/##\s*PAA scann\u00e9s \u00e0 juger/i)[1] ?? ''
  const paaCutoff = paaSection.split(/##\s*Ta t\u00e2che/i)[0] ?? paaSection
  const paaLines = paaCutoff
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^\d+\s*\|/.test(l))

  const painWords = painPoint
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[.,;:!?'"()]/g, ''))
    .filter(w => w.length >= 4)

  const keywordWords = keyword.split(/\s+/).filter(w => w.length >= 3)

  const judgments: MockPaaJudgment[] = paaLines.map((line, idx) => {
    const lower = line.toLowerCase()
    const hasKeyword = keywordWords.some(w => lower.includes(w))
    const hasPain = painWords.some(w => lower.includes(w))

    if (hasKeyword && hasPain) {
      return {
        paaIndex: idx,
        badge: 'pertinent' as const,
        paaScore: 85,
        reasonShort: 'Mot-clé + douleur alignés.',
      }
    }
    if (hasKeyword || hasPain) {
      return {
        paaIndex: idx,
        badge: 'partiel' as const,
        paaScore: 55,
        reasonShort: hasKeyword ? 'Sujet OK, douleur faible.' : 'Touche la douleur.',
      }
    }
    return {
      paaIndex: idx,
      badge: 'hors-sujet' as const,
      paaScore: 20,
      reasonShort: 'Ne sert pas l\'article.',
    }
  })

  // Si aucune ligne PAA détectée (cas mock sans contexte), retourne un PaaJudgment minimal pour respecter minItems: 1
  if (judgments.length === 0) {
    judgments.push({
      paaIndex: 0,
      badge: 'partiel',
      paaScore: 50,
      reasonShort: 'Mock fallback.',
    })
  }

  const scoresSum = judgments.reduce((acc, j) => acc + j.paaScore, 0)
  const overallPaaScore = Math.round(scoresSum / judgments.length)

  const pertinentCount = judgments.filter(j => j.badge === 'pertinent').length
  const summary = pertinentCount === judgments.length
    ? 'Tous les PAA répondent à la douleur, contenu très exploitable.'
    : pertinentCount === 0
      ? 'Aucun PAA n\'apporte de valeur pour cet article.'
      : `${pertinentCount}/${judgments.length} PAA exploitables pour traiter la douleur.`

  return {
    paaJudgments: judgments,
    overallPaaScore,
    summary,
  }
})
