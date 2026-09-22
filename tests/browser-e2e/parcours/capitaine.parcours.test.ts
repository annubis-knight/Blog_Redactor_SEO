/**
 * Parcours « 8 temps » — sous-phase Capitaine (tech-spec-parcours-8-temps).
 *
 * Un vrai navigateur, un vrai serveur, sources externes simulées (IA locale,
 * DataForSEO en bac à sable). On suit le chemin d'un utilisateur qui valide un
 * mot-clé Capitaine, et chaque temps de la grille est une étape du parcours :
 *
 *   ① déclencheur   saisie du mot-clé + Entrée
 *   ② mémoire       un second scan du même mot-clé répond depuis le cache
 *   ③ service(s)    la requête POST /keywords/:kw/scan part
 *   ④ réponse       la réponse arrive et porte les 6 KPI + le verdict
 *   ⑤ mise en forme un KPI absent vaut `null` (jamais 0) après contrat
 *   ⑥ sauvegarde    l'exploration est relisible en base, et après rechargement
 *   ⑦ affichage     l'écran montre la même chose que la réponse : « — » si absent
 *   ⑧ décision      le verrou émet le check workflow
 *
 * Un parcours = un test, découpé en étapes : l'état (scan, sélection) doit
 * traverser les temps, ce qu'une suite de tests indépendants ne permet pas.
 * Les valeurs du bac à sable sont factices : les assertions ne portent jamais
 * sur un chiffre attendu, mais sur la **cohérence entre la réponse et l'écran**.
 */
import { test, expect, type Page, type Response } from '@playwright/test'
import { selectArticle, useParcours, type ParcoursLevel } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

interface KpiResultLike { name: string; rawValue: number | null; label: string }
interface ScanResponseLike {
  keyword: string
  kpis: KpiResultLike[]
  verdict: { level: string; greenCount: number; totalKpis: number; reason?: string }
  fromCache: boolean
}

const SCAN_URL = /\/api\/keywords\/.+\/scan$/
const API = `http://localhost:${process.env.PORT ?? 3400}/api`

/** Saisit le mot-clé du Capitaine et valide (temps ①), en capturant la réponse (temps ③-④). */
async function scanKeyword(page: Page, keyword: string): Promise<ScanResponseLike> {
  const field = page.locator('[data-testid="keyword-input"] input').first()
  await expect(field, 'le champ Capitaine doit être présent').toBeVisible({ timeout: 10000 })
  await field.fill(keyword)

  const [response] = await Promise.all([
    page.waitForResponse((r: Response) => SCAN_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
    field.press('Enter'),
  ])

  expect(response.status(), 'le scan doit répondre 200').toBe(200)
  return (await response.json()).data as ScanResponseLike
}

/**
 * Après un rechargement, l'écran propose « Charger Capitaine » plutôt que de
 * restaurer tout seul : c'est une étape du parcours utilisateur, pas un détour.
 */
async function loadSavedResults(page: Page): Promise<void> {
  const prompt = page.locator('[data-testid="tab-load-prompt"]')
  if (await prompt.count() === 0) return
  const loadDb = page.locator('[data-testid="tlp-load-db"]')
  if (await loadDb.count() > 0) {
    await loadDb.first().click()
  } else {
    await page.locator('[data-testid="tlp-dismiss"]').first().click()
  }
  await expect(prompt).toHaveCount(0, { timeout: 15000 })
}

/** Ouvre le tiroir de droite sur la première carte de la liste. */
async function openSidePanel(page: Page): Promise<void> {
  await loadSavedResults(page)
  const item = page.locator('[data-testid="radar-list-item-0"]')
  await expect(item, 'la carte scannée doit apparaître dans la liste').toBeVisible({ timeout: 30000 })
  // Sélection au clavier : un clic au centre tomberait sur les mots interactifs
  // du mot-clé (qui arrêtent la propagation).
  await item.focus()
  await item.press('Enter')
  await expect(item, 'la carte doit être sélectionnée').toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })
  await expect(page.locator('[data-testid="side-panel-market-kpis"]')).toBeVisible({ timeout: 15000 })
}

/** Texte affiché pour une ligne de KPI du tiroir (Volume, Difficulté, CPC…). */
async function kpiLine(page: Page, label: string): Promise<string> {
  const line = page.locator('[data-testid="side-panel-market-kpis"] li', { hasText: label }).first()
  return (await line.locator('.kpi-value').innerText()).trim()
}

function kpiByName(scan: ScanResponseLike, name: string): KpiResultLike {
  const kpi = scan.kpis.find(k => k.name === name)
  if (!kpi) throw new Error(`KPI "${name}" absent de la réponse`)
  return kpi
}

async function apiJson<T>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(`${API}${path}`)
  expect(res.ok(), `${path} doit répondre`).toBeTruthy()
  return (await res.json()).data as T
}

/**
 * Compare une ligne de KPI affichée avec la valeur de la réponse.
 *
 * Tolérant au délai : après le scan principal, les mots-clés racines sont
 * scannés à leur tour et peuvent remplacer la carte affichée. On laisse
 * l'écran se stabiliser avant de conclure.
 */
async function expectKpiDisplay(page: Page, scan: ScanResponseLike, name: string, label: string, formatOk: RegExp): Promise<void> {
  const kpi = kpiByName(scan, name)
  if (kpi.rawValue === null) {
    await expect.poll(() => kpiLine(page, label), { timeout: 15000 })
      .toBe('—')
  } else {
    await expect.poll(() => kpiLine(page, label), { timeout: 15000 })
      .toMatch(formatOk)
  }
}

const LEVELS: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']

for (const level of LEVELS) {
  test(`Capitaine — parcours complet (${level})`, async ({ page }) => {
    test.setTimeout(180_000)
    const article = parcours.articles[level]
    let scan: ScanResponseLike

    await test.step('① déclencheur · ③ service · ④ réponse', async () => {
      await selectArticle(page, parcours, level)
      scan = await scanKeyword(page, article.keyword)

      expect(scan.keyword).toBe(article.keyword)
      expect(scan.kpis.map(k => k.name).sort()).toEqual(['autocomplete', 'cpc', 'intent', 'kd', 'paa', 'volume'])
      expect(scan.verdict.totalKpis).toBe(6)
    })

    await test.step('⑤ mise en forme — un KPI absent vaut null, jamais 0', async () => {
      for (const kpi of scan.kpis) {
        expect(kpi.rawValue === null || Number.isFinite(kpi.rawValue), `KPI ${kpi.name}`).toBe(true)
        if (kpi.rawValue === null) {
          expect(kpi.label, `KPI ${kpi.name} absent doit s'afficher « — »`).toBe('—')
        }
      }
    })

    await test.step('⑤ — le verdict n’est jamais un refus inventé', async () => {
      const mesurés = scan.kpis.filter(k => k.rawValue !== null)
      if (mesurés.length === 0) {
        expect(scan.verdict.level, 'sans aucun signal mesuré, le verdict reste « à confirmer »').toBe('GRAY')
      }
      if (scan.verdict.reason?.includes('Aucun signal')) {
        const signaux = ['volume', 'paa', 'autocomplete']
          .map(n => kpiByName(scan, n))
          .filter(k => k.rawValue !== null)
        expect(signaux, 'un NO-GO « Aucun signal » suppose des signaux réellement mesurés à 0').not.toHaveLength(0)
      }
    })

    await test.step('⑦ affichage — l’écran montre ce que la réponse contient', async () => {
      await openSidePanel(page)
      await expectKpiDisplay(page, scan, 'volume', 'Volume', /rech\/m$/)
      await expectKpiDisplay(page, scan, 'kd', 'Difficult', /^\d+(\.\d+)?$/)
      await expectKpiDisplay(page, scan, 'cpc', 'CPC', /€$/)
    })

    await test.step('② mémoire — un second scan répond depuis le cache', async () => {
      const second = await scanKeyword(page, article.keyword)
      expect(second.fromCache, 'le second scan ne doit pas rappeler la source externe').toBe(true)
    })

    await test.step('⑥ sauvegarde — l’exploration est relisible en base', async () => {
      const explorations = await apiJson<Array<{ keyword: string }>>(page, `/articles/${article.id}/captain-explorations`)
      expect(explorations.map(e => e.keyword)).toContain(article.keyword)
    })

    await test.step('⑥ + ⑦ — après rechargement, l’écran affiche la même chose', async () => {
      await page.reload()
      await page.waitForLoadState('networkidle', { timeout: 20000 })
      await selectArticle(page, parcours, level)
      await openSidePanel(page)
      await expectKpiDisplay(page, scan, 'kd', 'Difficult', /^\d+(\.\d+)?$/)
      await expectKpiDisplay(page, scan, 'volume', 'Volume', /rech\/m$/)
    })

    await test.step('⑧ décision — verrouiller enregistre le check du workflow', async () => {
      const lock = page.locator('[data-testid="radar-card-lock"]').first()
      await expect(lock, 'le cadenas de la carte doit être présent').toBeVisible({ timeout: 15000 })
      await lock.click()
      await expect(lock).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })

      await expect
        .poll(async () => (await apiJson<{ completedChecks: string[] }>(page, `/articles/${article.id}/progress`)).completedChecks,
          { timeout: 15000 })
        .toContain('moteur:capitaine_locked')
    })
  })
}
