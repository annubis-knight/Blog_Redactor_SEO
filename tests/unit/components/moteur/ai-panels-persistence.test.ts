/**
 * Tests architecturaux transversaux — FR-UI-AI-PANELS-PATTERN (ACs UIAIP.1-4)
 * + NFR-UX-STABLE-SKELETON.
 *
 * Vérifie que chaque panel IA Moteur audité respecte les invariants suivants :
 *   - Le template du panel utilise le composant générique `<AiPanel>` (présence
 *     dans le DOM dès le mount, pas de `v-if` parent conditionné à un état
 *     utilisateur transitoire).
 *   - Aucun `v-if` racine sur `<AiPanel>` ou sur la coque équivalente dans le
 *     template, qui ferait disparaître le panel selon une action utilisateur.
 *
 * Panels auditables au 2026-05-11 :
 *   - Discovery (usage direct de `<AiPanel>` dans DiscoveryPanel.vue, refonte 2026-05-11)
 *   - Lexique (LexiqueAiPanel.vue)
 *   - Lieutenants (LieutenantsAiPanel.vue — refonte Sprint 1 2026-05-04)
 *
 * Panels NON auditables (TODO chantiers ultérieurs) :
 *   - Radar (RadarAiPanel.vue — selection locale potentiellement redondante,
 *     cf. analyse 2026-05-11)
 *   - Capitaine (CaptainSidePanel.vue — variant 'advice', sidepanel droit)
 *   - Rédaction (ArticleWorkflowIaBrief.vue — variant 'advice')
 */
import { describe, it, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'

interface AuditEntry {
  name: string
  file: string
  /** Regex qui doit matcher dans le template (présence du composant AiPanel). */
  aiPanelImportPattern: RegExp
}

const PROJECT_ROOT = resolve(__dirname, '../../../..')

const AUDITED_PANELS: AuditEntry[] = [
  {
    name: 'Discovery',
    file: 'src/components/moteur/DiscoveryPanel.vue',
    aiPanelImportPattern: /import\s+AiPanel\s+from\s+['"]@\/components\/moteur\/ai-panel\/AiPanel\.vue['"]/,
  },
  {
    name: 'Lexique',
    file: 'src/components/moteur/LexiqueAiPanel.vue',
    aiPanelImportPattern: /import\s+AiPanel\s+from\s+['"][^'"]*ai-panel\/AiPanel\.vue['"]/,
  },
  {
    name: 'Lieutenants',
    file: 'src/components/moteur/LieutenantsAiPanel.vue',
    // LieutenantsAiPanel n'utilise pas <AiPanel> directement (refonte spécifique),
    // mais respecte la NFR : section rendue inconditionnellement avec header
    // AiPanelHeader. On vérifie au moins l'import de AiPanelHeader.
    aiPanelImportPattern: /import\s+AiPanelHeader\s+from\s+['"][^'"]*AiPanelHeader\.vue['"]/,
  },
]

async function readFile(relativePath: string): Promise<string> {
  return fs.readFile(resolve(PROJECT_ROOT, relativePath), 'utf-8')
}

describe('FR-UI-AI-PANELS-PATTERN — invariants transversaux', () => {
  for (const entry of AUDITED_PANELS) {
    describe(`Panel ${entry.name}`, () => {
      it('AC.UIAIP.1 — importe le composant AiPanel (ou AiPanelHeader pour les refontes spécifiques)', async () => {
        const src = await readFile(entry.file)
        expect(src).toMatch(entry.aiPanelImportPattern)
      })

      it('AC.UIAIP.3 — pas de v-if racine conditionné à un état utilisateur transitoire (hasClicked*, analysisLoading + analysisResult, etc.) sur la coque AiPanel', async () => {
        const src = await readFile(entry.file)
        // Anti-pattern recherché : <AiPanel ... v-if="hasClicked..." ou
        // <AiPanel ... v-if="analysisResult" (qui ferait disparaître quand pas
        // de résultat). v-if sur le SLOT interne (DiscoveryAnalysisResults
        // v-if="analysisResult") est autorisé — c'est un état visuel local.
        const aiPanelOpeningTag = /<AiPanel\b[^>]*>/g
        const violations: string[] = []
        for (const match of src.matchAll(aiPanelOpeningTag)) {
          const tag = match[0]
          if (/\sv-if\s*=\s*"[^"]*hasClicked/.test(tag)) {
            violations.push(`v-if conditionné à hasClicked — ${tag}`)
          }
          if (/\sv-if\s*=\s*"[^"]*analysisResult[^"]*"\s*$/.test(tag)) {
            violations.push(`v-if="analysisResult" — la coque doit rester montée — ${tag}`)
          }
        }
        expect(violations).toEqual([])
      })
    })
  }
})

describe('FR-UI-AI-PANELS-PATTERN — panels en dette (à auditer ultérieurement)', () => {
  it.skip('Radar : RadarAiPanel.vue à auditer (selection locale potentiellement redondante)', () => {})
  it.skip('Capitaine : CaptainSidePanel.vue à auditer (variant advice sidepanel)', () => {})
  it.skip('Rédaction : ArticleWorkflowIaBrief.vue à auditer (variant advice)', () => {})
})
