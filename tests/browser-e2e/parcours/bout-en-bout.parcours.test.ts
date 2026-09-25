/**
 * Parcours de bout en bout — un cocon vide devient trois articles rédigés.
 *
 * C'est le seul test qui traverse les trois phases du produit dans l'ordre où
 * un utilisateur les vit, sans raccourci de préparation :
 *
 *   Cerveau   — cinq étapes de stratégie, puis génération et acceptation des
 *               articles proposés (pilier, intermédiaire, spécifique).
 *   Moteur    — pour chaque article : Capitaine verrouillé, Lieutenants
 *               retenus, plan Hn enregistré, Lexique validé.
 *   Rédaction — brief et micro-contexte, sommaire validé, article généré,
 *               relecture dans l'éditeur, aperçu, publication.
 *
 * Les phases s'enchaînent par de vrais verrous : le plan Hn du Moteur devient
 * le sommaire de la Rédaction, et le passage en Rédaction reste fermé tant que
 * les trois verrous du Moteur ne sont pas posés. Un raccourci de préparation
 * masquerait précisément ce qu'on veut vérifier.
 *
 * Sources simulées par défaut. `PARCOURS_REEL=1` bascule sur les vraies API
 * (IA + DataForSEO), ce qui a un coût — voir la tech-spec.
 */
import { test, expect, type Page } from '@playwright/test'
import { query } from '../../../server/db/client.js'
import { ETAPES_STRATEGIE, REPONSES, useCerveau } from '../helpers/cerveau-fixtures'
import { publishThroughGate } from '../helpers/gate-alarm'
import {
  checksDeLArticle,
  dismissLoadPrompt,
  lockLieutenants,
  openMoteur,
  scanAndLockCaptain,
  selectArticleByTitle,
  tabLocator,
  validerLexique,
} from '../helpers/moteur-ui'

test.describe.configure({ mode: 'serial' })

const REEL = process.env.PARCOURS_REEL === '1'
const cerveau = useCerveau(REEL ? 'real' : 'mock')

/** Les trois articles retenus à l'issue du Cerveau, un par niveau. */
interface ArticleDuParcours {
  id: number
  titre: string
  type: 'Pilier' | 'Intermédiaire' | 'Spécialisé'
  keyword: string
}
const articles: Partial<Record<ArticleDuParcours['type'], ArticleDuParcours>> = {}

const MICRO_CONTEXTE = {
  angle: "Partir de ce que le dirigeant constate lui-même — un site en ligne mais zéro demande — plutôt que d'expliquer le SEO dans l'abstrait.",
  tone: 'Pédagogique et direct, sans jargon, avec des exemples toulousains.',
  directives: "Trois actions applicables sans prestataire. Terminer par une invitation à l'audit gratuit de 20 minutes.",
}

// ---------------------------------------------------------------------------
// Phase 1 — Cerveau
// ---------------------------------------------------------------------------

test('Cerveau — la stratégie du cocon et les articles', async ({ page }) => {
  test.setTimeout(REEL ? 900_000 : 300_000)

  await page.goto(cerveau.cerveauUrl())
  await page.waitForLoadState('networkidle', { timeout: 20000 })

  for (const etape of ETAPES_STRATEGIE) {
    await test.step(`étape ${etape}`, async () => {
      const saisie = page.locator('[data-testid="step-input"]')
      await expect(saisie).toBeVisible({ timeout: 20000 })
      await saisie.fill(REPONSES[etape])
      await saisie.blur()
      const valider = page.locator('[data-testid="step-validate"]')
      await expect(valider).toBeEnabled({ timeout: 15000 })
      await valider.click()
      await page.locator('[data-testid="step-validate-own"]').click()
      await expect(page.locator('[data-testid="step-validated"]')).toBeVisible({ timeout: 15000 })
      await page.locator('[data-testid="brain-next"]').click()
    })
  }

  await test.step('génération et acceptation des articles', async () => {
    const generer = page.locator('[data-testid="brain-generate-articles"]')
    await expect(generer).toBeVisible({ timeout: 30000 })
    await expect(generer).toBeEnabled({ timeout: 60000 })
    await generer.click()

    await expect(page.locator('[data-testid="proposal-item"]').first(), 'des articles sont proposés')
      .toBeVisible({ timeout: REEL ? 600_000 : 300_000 })

    // La génération se fait en trois temps : le Pilier et les Intermédiaires
    // arrivent d'abord, les Spécialisés à la fin. Valider entre les deux ne
    // créerait que la première moitié.
    await expect(generer, 'la génération doit être terminée').toBeEnabled({ timeout: REEL ? 600_000 : 300_000 })

    const toutValider = page.locator('[data-testid="brain-validate-all"]')
    await expect(toutValider, 'le bouton « Tout valider » doit être accessible').toBeVisible({ timeout: 30000 })
    await expect(toutValider, 'et actif une fois la génération finie').toBeEnabled({ timeout: 60000 })
    await toutValider.scrollIntoViewIfNeeded()
    const creations: number[] = []
    page.on('response', r => {
      if (r.url().endsWith('/articles/batch-create')) creations.push(r.status())
    })
    await toutValider.click()
    await expect
      .poll(() => creations.length, { timeout: 60000, message: 'le clic doit déclencher des créations' })
      .toBeGreaterThan(0)
    expect(creations.every(s => s === 200 || s === 201), `créations en échec : ${creations.join(', ')}`).toBe(true)

    // Un cocon a besoin des trois niveaux : le pilier, ses intermédiaires et
    // leurs spécialisés. Le compte par type dit tout de suite lequel manque.
    await expect.poll(async () => {
      const r = await query<{ type: string; n: string }>(
        `SELECT a.type, count(*) n FROM articles a JOIN cocoons c ON c.id = a.cocoon_id
         WHERE c.nom = $1 GROUP BY a.type`,
        [cerveau.cocoonName],
      )
      return r.rows.map(x => `${x.type}×${x.n}`).sort().join(' ')
    }, {
      timeout: 180000,
      message: 'le Cerveau doit créer au moins un article de chaque niveau',
    }).toMatch(/Intermédiaire×[1-9].*Pilier×[1-9].*Spécialisé×[1-9]/)
  })

  await test.step('terminer le brainstorm marque le Cerveau complet', async () => {
    // C'est ce dernier geste qui porte `completedSteps` à 6 — et c'est lui que
    // la Rédaction attend pour ouvrir son étape « Article ».
    await page.locator('[data-testid="brain-next"]').click()

    await expect.poll(async () => {
      const r = await query<{ steps: number }>(
        `SELECT (cs.data->>'completedSteps')::int AS steps
         FROM cocoon_strategies cs JOIN cocoons c ON c.id = cs.cocoon_id
         WHERE c.nom = $1`,
        [cerveau.cocoonName],
      )
      return r.rows[0]?.steps ?? 0
    }, { timeout: 60000, message: 'le Cerveau doit être marqué complet' }).toBeGreaterThanOrEqual(6)
  })
})

test('Cerveau — un article de chaque niveau est retenu pour la suite', async () => {
  const res = await query<{ id: number; titre: string; type: ArticleDuParcours['type']; suggested_keyword: string | null }>(
    `SELECT a.id, a.titre, a.type, a.suggested_keyword
     FROM articles a JOIN cocoons c ON c.id = a.cocoon_id
     WHERE c.nom = $1 ORDER BY a.id`,
    [cerveau.cocoonName],
  )

  for (const type of ['Pilier', 'Intermédiaire', 'Spécialisé'] as const) {
    const trouve = res.rows.find(a => a.type === type)
    expect(trouve, `le Cerveau a produit un article de type ${type}`).toBeTruthy()
    articles[type] = {
      id: trouve!.id,
      titre: trouve!.titre,
      type,
      keyword: trouve!.suggested_keyword ?? trouve!.titre,
    }
  }
})

// ---------------------------------------------------------------------------
// Phase 2 — Moteur, puis phase 3 — Rédaction, article par article
// ---------------------------------------------------------------------------

/** Ouvre le Moteur sur l'article demandé. */
async function ouvrirArticle(page: Page, article: ArticleDuParcours): Promise<void> {
  await openMoteur(page, cerveau.cocoonIndex)
  await selectArticleByTitle(page, article.titre)
}

for (const type of ['Pilier', 'Intermédiaire', 'Spécialisé'] as const) {
  test(`Moteur — ${type} : Capitaine, Lieutenants et Lexique verrouillés`, async ({ page }) => {
    test.setTimeout(REEL ? 900_000 : 600_000)
    const article = articles[type]
    expect(article, 'l’article du Cerveau doit être connu').toBeTruthy()

    await ouvrirArticle(page, article!)

    await test.step('Capitaine', async () => {
      await tabLocator(page, 'capitaine').click()
      await dismissLoadPrompt(page)
      if (!(await checksDeLArticle(page, article!.id)).includes('moteur:capitaine_locked')) {
        await scanAndLockCaptain(page, article!.keyword)
      }
      await expect.poll(() => checksDeLArticle(page, article!.id), { timeout: 60000 })
        .toContain('moteur:capitaine_locked')
    })

    await test.step('Lieutenants et plan Hn', async () => {
      await lockLieutenants(page, article!.id)
    })

    await test.step('Lexique', async () => {
      await validerLexique(page, article!.id)
    })

    await test.step('le passage en Rédaction s’ouvre', async () => {
      await tabLocator(page, 'finalisation').click()
      const cta = page.locator('[data-testid="finalisation-cta-redaction"]')
      await expect(cta, 'le récapitulatif propose la sortie').toBeVisible({ timeout: 30000 })
      await expect(cta, 'les trois verrous posés, la porte s’ouvre').toBeEnabled({ timeout: 30000 })
      await expect(page.locator('[data-testid="finalisation-title"]')).toContainText('Prêt pour la Rédaction')
    })
  })

  test(`Rédaction — ${type} : brief, sommaire, article rédigé`, async ({ page }) => {
    test.setTimeout(REEL ? 2_700_000 : 600_000)
    const article = articles[type]!

    await page.goto(`/cocoon/${cerveau.cocoonIndex}/article/${article.id}`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    await test.step('le micro-contexte se renseigne et se sauvegarde', async () => {
      const angle = page.locator('[data-testid="brief-angle"]')
      await expect(angle, 'le champ Angle doit être là').toBeVisible({ timeout: 30000 })
      await angle.fill(MICRO_CONTEXTE.angle)
      await angle.blur()
      await page.locator('[data-testid="brief-tone"]').fill(MICRO_CONTEXTE.tone)
      await page.locator('[data-testid="brief-tone"]').blur()
      await page.locator('[data-testid="brief-directives"]').fill(MICRO_CONTEXTE.directives)
      await page.locator('[data-testid="brief-directives"]').blur()

      await expect.poll(async () => {
        const port = process.env.PORT ?? 3400
        const r = await page.request.get(`http://localhost:${port}/api/articles/${article.id}/micro-context`)
        if (!r.ok()) return null
        return ((await r.json())?.data?.angle ?? null) as string | null
      }, { timeout: 30000, message: 'le micro-contexte doit être enregistré' }).toContain(MICRO_CONTEXTE.angle.slice(0, 30))
    })

    await test.step('le sommaire vient du Moteur et ouvre la suite', async () => {
      // Le plan Hn enregistré à l'étape Lieutenants arrive ici comme sommaire,
      // et il compte pour validé : l'utilisateur l'a déjà arrêté au Moteur.
      await expect(page.locator('[data-testid="outline-empty"]'), 'le sommaire ne doit pas être vide')
        .toHaveCount(0, { timeout: 30000 })

      const valider = page.locator('[data-testid="outline-validate"]')
      if (await valider.count() > 0) {
        await valider.click()
      } else {
        await expect(page.locator('[data-testid="outline-unvalidate"]'), 'un sommaire déjà validé se laisse rouvrir')
          .toBeVisible({ timeout: 15000 })
      }

      const continuer = page.locator('[data-testid="brief-continue"]')
      await expect(continuer, 'la suite s’ouvre une fois le sommaire arrêté').toBeVisible({ timeout: 60000 })
      await continuer.click()
    })

    await test.step('l’article se génère, section par section', async () => {
      const generer = page.locator('[data-testid="generate-button"]')
      await expect(generer, 'le bouton de génération apparaît une fois le sommaire validé')
        .toBeVisible({ timeout: 60000 })
      await generer.click()

      // Le texte est enregistré au fil des sections : voir arriver les premiers
      // caractères prouve que la rédaction a démarré, pas qu'elle est finie.
      await expect.poll(async () => {
        const r = await query<{ content: string | null }>(
          `SELECT content FROM article_content WHERE article_id = $1`, [article.id])
        return r.rows[0]?.content?.length ?? 0
      }, { timeout: REEL ? 600_000 : 300_000, message: 'la rédaction doit démarrer' })
        .toBeGreaterThan(200)

      // La fin, c'est le retour du bouton de régénération : un pilier réel
      // compte une vingtaine de sections, soit ~20 min.
      // Le bouton n'apparaît qu'une fois le texte complet posé, et reste
      // désactivé tant que la génération tourne : son activation est le signal.
      await expect(page.locator('[data-testid="regenerate-button"]'), 'la rédaction doit aller à son terme')
        .toBeEnabled({ timeout: REEL ? 2_400_000 : 300_000 })
    })

    await test.step('la méta suit automatiquement', async () => {
      await expect.poll(async () => {
        const r = await query<{ meta_title: string | null; meta_description: string | null }>(
          `SELECT meta_title, meta_description FROM articles WHERE id = $1`, [article.id])
        const row = r.rows[0]
        return Boolean(row?.meta_title && row?.meta_description)
      }, { timeout: REEL ? 600_000 : 120_000, message: 'titre et description doivent être générés' }).toBe(true)
    })
  })

  test(`Rédaction — ${type} : relecture dans l'éditeur et aperçu`, async ({ page }) => {
    test.setTimeout(REEL ? 600_000 : 300_000)
    const article = articles[type]!

    await page.goto(`/article/${article.id}/editor`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    await test.step('le contenu rédigé s’ouvre dans l’éditeur', async () => {
      const editeur = page.locator('.ProseMirror').first()
      await expect(editeur, 'l’éditeur doit afficher l’article').toBeVisible({ timeout: 60000 })
      await expect.poll(async () => (await editeur.innerText()).trim().length, { timeout: 60000 })
        .toBeGreaterThan(200)
    })

    // La retouche est ensuite annulée : en mode réel, l'article reste en base
    // pour être relu, et un « Relu. » ajouté par le test s'était retrouvé dans
    // l'introduction du pilier 1013 (épopée qualité SEO, T1).
    await test.step('une retouche se sauvegarde, puis s’annule sans laisser de trace', async () => {
      const MARQUEUR = ' RETOUCHEPARCOURS'
      const contenuEnBase = async () => {
        const r = await query<{ content: string | null }>(
          `SELECT content FROM article_content WHERE article_id = $1`, [article.id])
        return r.rows[0]?.content ?? ''
      }
      const editeur = page.locator('.ProseMirror').first()
      const sauver = page.locator('[data-testid="editor-save"]')

      await editeur.click()
      await page.keyboard.press('Control+End')
      await page.keyboard.type(MARQUEUR)
      await expect(sauver, 'la sauvegarde s’active dès qu’on touche au texte').toBeEnabled({ timeout: 30000 })
      await sauver.click()
      await expect(sauver, 'et se désactive une fois enregistré').toBeDisabled({ timeout: 60000 })
      await expect.poll(async () => (await contenuEnBase()).includes(MARQUEUR.trim()),
        { timeout: 60000, message: 'la retouche doit atteindre la base' }).toBe(true)

      // Comme un utilisateur : double-cliquer sur le mot ajouté, puis l'effacer
      // avec l'espace qui le précède. Compter des retours arrière depuis la fin
      // ne suffisait pas (la sauvegarde peut réorganiser la fin du texte), et une
      // sélection posée par script n'est vue par l'éditeur qu'au tick suivant.
      const boite = await editeur.evaluate((el, marqueur) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const debut = (n.textContent ?? '').indexOf(marqueur)
          if (debut < 0) continue
          n.parentElement?.scrollIntoView({ block: 'center' })
          const plage = document.createRange()
          plage.setStart(n, debut)
          plage.setEnd(n, debut + marqueur.length)
          const r = plage.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }
        return null
      }, MARQUEUR.trim())
      expect(boite, 'la retouche doit être visible dans l’éditeur').not.toBeNull()
      await page.mouse.dblclick(boite!.x, boite!.y)
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Backspace')
      await expect.poll(async () => (await editeur.innerText()).includes(MARQUEUR.trim()),
        { timeout: 15000, message: 'la retouche doit avoir disparu du texte à l’écran' }).toBe(false)
      await expect(sauver, 'retirer la retouche réactive la sauvegarde').toBeEnabled({ timeout: 30000 })
      await sauver.click()
      await expect(sauver).toBeDisabled({ timeout: 60000 })
      await expect.poll(async () => (await contenuEnBase()).includes(MARQUEUR.trim()),
        { timeout: 60000, message: 'l’article ne doit garder aucune trace du test' }).toBe(false)
    })

    await test.step('l’aperçu s’ouvre et l’article peut être exporté', async () => {
      const apercu = page.locator('[data-testid="editor-preview"]')
      await expect(apercu, 'l’aperçu n’est proposé qu’avec un titre et une description')
        .toBeVisible({ timeout: 30000 })

      const [onglet] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 60000 }),
        apercu.click(),
      ])
      await onglet.waitForLoadState('networkidle', { timeout: 60000 })

      const exporter = onglet.locator('[data-testid="preview-export"]')
      await expect(exporter, 'l’export est proposé').toBeVisible({ timeout: 60000 })
      await expect(exporter).toBeEnabled({ timeout: 60000 })

      // Publier passe la porte (FR-RED-PUBLISH-GATE) : si elle alerte sur ce
      // texte simulé, l'utilisateur assume ; un défaut ⛔ ferait échouer le test.
      const telechargement = onglet.waitForEvent('download', { timeout: 120000 })
      const alertes = await publishThroughGate(onglet, () => exporter.click())
      if (alertes.length > 0) test.info().annotations.push({ type: 'porte de publication', description: alertes.join(', ') })
      const fichier = await telechargement
      expect(fichier.suggestedFilename(), 'un fichier HTML est proposé').toMatch(/\.html$/)

      await expect.poll(async () => {
        const r = await query<{ status: string }>(`SELECT status FROM articles WHERE id = $1`, [article.id])
        return r.rows[0]?.status
      }, { timeout: 60000, message: 'l’export passe l’article en publié' }).toBe('publié')

      await onglet.close()
    })
  })
}

// ---------------------------------------------------------------------------
// Bilan
// ---------------------------------------------------------------------------

test('Bilan — les trois articles sont rédigés et publiés', async () => {
  const res = await query<{ titre: string; type: string; status: string; mots: string; meta_title: string | null }>(
    `SELECT a.titre, a.type, a.status, a.meta_title,
            coalesce(array_length(regexp_split_to_array(trim(coalesce(ac.content, '')), '\\s+'), 1), 0) AS mots
     FROM articles a
     JOIN cocoons c ON c.id = a.cocoon_id
     LEFT JOIN article_content ac ON ac.article_id = a.id
     WHERE c.nom = $1 AND a.status = 'publié'
     ORDER BY a.id`,
    [cerveau.cocoonName],
  )

  expect(res.rows.length, 'les trois articles sont publiés').toBeGreaterThanOrEqual(3)
  for (const a of res.rows) {
    expect(Number(a.mots), `« ${a.titre} » a du contenu`).toBeGreaterThan(50)
    expect(a.meta_title, `« ${a.titre} » a un titre de page`).toBeTruthy()
  }
  const types = new Set(res.rows.map(a => a.type))
  expect(types.has('Pilier'), 'un pilier publié').toBe(true)
})
