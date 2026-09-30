// @vitest-environment node
/**
 * Le Moteur ne juge pas un article avant d'avoir relu ses données (recette du
 * 2026-09-30, F4) et garde son bandeau en place (UI-7). Garde-fous de source :
 * les tests de comportement (useMoteurArticleSync, LieutenantsPanel) vivent
 * ailleurs ; celui-ci garde le câblage de la vue, que les tests unitaires ne
 * montent pas.
 *
 * - FR-MOT-CHECK-RECONCILIATION, FR-MOT-NO-AUTO-ACTION : les onglets ne sont
 *   montés qu'une fois les mots-clés et les étapes de l'article relus, dans un
 *   conteneur propre à l'article. Monté plus tôt, un panneau voyait un store
 *   vide et retirait des étapes (« Structure validée » perdue au rechoix).
 * - FR-UI-MOTEUR-SHARED : le bandeau « Résultats déjà calculés » ne change ni de
 *   place ni de hauteur selon l'onglet ; l'invite « Charger » est hors de son gabarit.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const MOTEUR = readFileSync(join(ROOT, 'src/views/MoteurView.vue'), 'utf8')
const template = MOTEUR.slice(MOTEUR.indexOf('<template>'), MOTEUR.lastIndexOf('</template>'))
const style = MOTEUR.slice(MOTEUR.indexOf('<style'))

const PANELS = ['DiscoveryPanel', 'RadarPanel', 'CaptainPanel', 'LieutenantsPanel', 'StructureHnPanel', 'LexiquePanel', 'FinalisationPanel']

describe('MoteurView — les onglets attendent les données de l’article (FR-MOT-CHECK-RECONCILIATION)', () => {
  const container = template.search(/<div\s+v-else-if="selectedArticle"\s+:key="selectedArticle\.id"\s+class="tab-panels"/)
  const loading = template.search(/v-else-if="selectedArticle && !articleReady"/)

  it('le conteneur des onglets vient après l’état « lecture en cours », et porte l’identifiant de l’article', () => {
    expect(loading, 'état « Lecture des données de l’article… »').toBeGreaterThan(-1)
    expect(container, 'conteneur des onglets, propre à l’article').toBeGreaterThan(loading)
  })

  it.each(PANELS)('%s n’est monté que dans ce conteneur', (panel) => {
    expect(container, 'conteneur des onglets, propre à l’article').toBeGreaterThan(-1)
    const at = template.indexOf(`<${panel}`)
    expect(at, `<${panel}> présent`).toBeGreaterThan(-1)
    expect(at, `<${panel}> monté avant la lecture des données de l’article`).toBeGreaterThan(container)
  })

  it('la lecture passe par useMoteurArticleSync, qui connaît le store des mots-clés', () => {
    expect(MOTEUR).toMatch(/useMoteurArticleSync\(\{[\s\S]*?articleKeywordsStore,[\s\S]*?\}\)/)
    expect(MOTEUR).toMatch(/articleReady/)
  })

  it('LieutenantsPanel ne réconcilie son étape qu’une fois les données de l’article là', () => {
    const lieutenants = readFileSync(join(ROOT, 'src/components/moteur/LieutenantsPanel.vue'), 'utf8')
    expect(lieutenants).toMatch(/const articleDataReady = computed/)
    expect(lieutenants).toMatch(/watch\(\s*\[\(\) => props\.selectedArticle\?\.id \?\? null, articleDataReady, lieutenantsCheckActive\]/)
  })
})

describe('MoteurView — le bandeau « Résultats déjà calculés » reste en place (FR-UI-MOTEUR-SHARED, UI-7)', () => {
  const bar = /\.cache-bar\s*\{([^}]*)\}/.exec(style)?.[1] ?? ''

  it('centré sur toute la largeur de l’écran, sans être limité à sa moitié', () => {
    expect(bar).not.toMatch(/translateX\(-50%\)/)
    expect(bar).not.toMatch(/left:\s*50%/)
    expect(bar).toMatch(/width:\s*max-content/)
  })

  it('l’invite « Charger » est posée hors du gabarit du bandeau', () => {
    expect(template).toMatch(/<div v-if="tabLoadPromptCurrent" class="cache-bar__prompt"[^>]*>\s*<TabLoadPrompt/)
    const prompt = /\.cache-bar__prompt\s*\{([^}]*)\}/.exec(style)?.[1] ?? ''
    expect(prompt).toMatch(/position:\s*absolute/)
  })
})
