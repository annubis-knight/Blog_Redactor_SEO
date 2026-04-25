import 'dotenv/config'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { pool } from './client.js'

const DATA_DIR = join(process.cwd(), 'data')
const MODE = process.argv.includes('--mode=reset') ? 'reset' : 'insert'

function extractSlug(rawSlug: string): string {
  try {
    const url = new URL(rawSlug)
    return url.pathname.split('/').filter(Boolean).pop() ?? rawSlug
  } catch {
    return rawSlug // déjà un slug court
  }
}

function readJson<T>(path: string): T | null {
  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw)
    // Vérifier si l'objet est vide
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0) {
      return null
    }
    return parsed as T
  } catch {
    return null
  }
}

async function batchInsert(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> },
  sql: string,
  rows: unknown[][],
  batchSize = 50
): Promise<number> {
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    for (const row of batch) {
      try {
        const result = await client.query(sql, row)
        if (result.rowCount) inserted += result.rowCount
      } catch (err) {
        console.error(`  [WARN] Batch insert error for row ${JSON.stringify(row).slice(0, 100)}:`, (err as Error).message)
      }
    }
  }
  return inserted
}

async function seedThemeConfig(client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }) {
  console.log('\n📌 theme_config...')
  const data = readJson(join(DATA_DIR, 'theme-config.json'))
  if (!data) { console.log('  [SKIP] theme-config.json not found or empty'); return }

  await client.query(
    `INSERT INTO theme_config (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(data)]
  )
  console.log('  ✓ theme_config: 1 row')
}

async function seedSilosAndCocoons(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rows: { id: number; nom: string }[]; rowCount: number | null }> }
): Promise<{ siloMap: Map<string, number>; cocoonMap: Map<string, number> }> {
  console.log('\n📌 silos + cocoons...')
  const bdd = readJson<{ theme: unknown; silos: Array<{ nom: string; description?: string; cocons: Array<{ nom: string }> }> }>(
    join(DATA_DIR, 'BDD_Articles_Blog.json')
  )
  if (!bdd) throw new Error('BDD_Articles_Blog.json not found')

  const siloMap = new Map<string, number>()
  const cocoonMap = new Map<string, number>()

  for (const silo of bdd.silos) {
    const res = await client.query(
      `INSERT INTO silos (nom, description) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id, nom`,
      [silo.nom, silo.description ?? null]
    )
    let siloId: number
    if (res.rows.length > 0) {
      siloId = res.rows[0].id
    } else {
      // Already exists — fetch id
      const existing = await client.query(`SELECT id FROM silos WHERE nom = $1`, [silo.nom])
      siloId = (existing.rows[0] as { id: number }).id
    }
    siloMap.set(silo.nom, siloId)

    for (const cocon of silo.cocons) {
      const cRes = await client.query(
        `INSERT INTO cocoons (silo_id, nom) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id, nom`,
        [siloId, cocon.nom]
      )
      let cocoonId: number
      if (cRes.rows.length > 0) {
        cocoonId = cRes.rows[0].id
      } else {
        const existing = await client.query(`SELECT id FROM cocoons WHERE silo_id = $1 AND nom = $2`, [siloId, cocon.nom])
        cocoonId = (existing.rows[0] as { id: number }).id
      }
      cocoonMap.set(cocon.nom, cocoonId)
    }
  }

  console.log(`  ✓ silos: ${siloMap.size}, cocoons: ${cocoonMap.size}`)
  return { siloMap, cocoonMap }
}

async function seedArticles(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> },
  cocoonMap: Map<string, number>
): Promise<Map<string, number>> {
  console.log('\n📌 articles...')
  const bdd = readJson<{ silos: Array<{ cocons: Array<{ nom: string; articles: Array<{
    id: number; titre: string; type: string; slug: string; topic?: string
    status?: string; phase?: string; seoScore?: number; geoScore?: number
    metaTitle?: string; metaDescription?: string; completedChecks?: string[]
    checkTimestamps?: Record<string, unknown>; validationHistory?: unknown[]
  }> }> }> }>(
    join(DATA_DIR, 'BDD_Articles_Blog.json')
  )
  if (!bdd) throw new Error('BDD_Articles_Blog.json not found')

  const slugToId = new Map<string, number>()
  let count = 0

  for (const silo of bdd.silos) {
    for (const cocon of silo.cocons) {
      const cocoonId = cocoonMap.get(cocon.nom)
      for (const art of cocon.articles) {
        const slug = extractSlug(art.slug)
        slugToId.set(slug, art.id)
        try {
          await client.query(
            `INSERT INTO articles (
              id, cocoon_id, titre, type, slug, topic, status, phase,
              seo_score, geo_score, meta_title, meta_description,
              completed_checks, check_timestamps
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING`,
            [
              art.id,
              cocoonId ?? null,
              art.titre,
              art.type,
              slug,
              art.topic ?? null,
              art.status ?? 'à rédiger',
              art.phase ?? 'proposed',
              art.seoScore ?? null,
              art.geoScore ?? null,
              art.metaTitle ?? null,
              art.metaDescription ?? null,
              art.completedChecks ?? [],
              JSON.stringify(art.checkTimestamps ?? {}),
            ]
          )
          count++
        } catch (err) {
          console.error(`  [WARN] Article ${art.id} (${slug}):`, (err as Error).message)
        }
      }
    }
  }

  console.log(`  ✓ articles: ${count}`)
  return slugToId
}

async function seedKeywordsSeo(client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }) {
  console.log('\n📌 keywords_seo...')
  const data = readJson<{ seo_data: Array<{ mot_clef: string; cocon_seo?: string; type_mot_clef?: string; statut?: string }> }>(
    join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json')
  )
  if (!data) { console.log('  [SKIP] BDD_Mots_Clefs_SEO.json not found or empty'); return }

  const rows = data.seo_data.map(kw => [kw.cocon_seo ?? null, kw.mot_clef, kw.type_mot_clef ?? null, kw.statut ?? 'suggested'])
  const count = await batchInsert(
    client,
    `INSERT INTO keywords_seo (cocoon_name, mot_clef, type_mot_clef, statut) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    rows
  )
  console.log(`  ✓ keywords_seo: ${count} rows`)
}

async function seedArticleKeywords(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }
) {
  console.log('\n📌 article_keywords...')
  const data = readJson<{ keywords_par_article: Array<{
    articleId: number; capitaine?: string; lieutenants?: string[]; lexique?: string[]
    hnStructure?: unknown[]; richCaptain?: unknown
  }> }>(
    join(DATA_DIR, 'article-keywords.json')
  )
  if (!data) { console.log('  [SKIP] article-keywords.json not found or empty'); return }

  const rows = data.keywords_par_article.map(kw => [
    kw.articleId,
    kw.capitaine ?? '',
    kw.lieutenants ?? [],
    kw.lexique ?? [],
    kw.hnStructure ? JSON.stringify(kw.hnStructure) : null,
  ])

  const count = await batchInsert(
    client,
    `INSERT INTO article_keywords (article_id, capitaine, lieutenants, lexique, hn_structure)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (article_id) DO NOTHING`,
    rows
  )
  console.log(`  ✓ article_keywords: ${count} rows`)
}

async function seedArticleContent(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> },
  slugToId: Map<string, number>
) {
  console.log('\n📌 article_content...')
  const articlesDir = join(DATA_DIR, 'articles')
  if (!existsSync(articlesDir)) { console.log('  [SKIP] data/articles/ not found'); return }

  const files = readdirSync(articlesDir).filter(f => f.endsWith('.json'))
  let count = 0

  for (const file of files) {
    const slug = basename(file, '.json')
    const articleId = slugToId.get(slug)
    if (!articleId) {
      console.error(`  [WARN] No article found for slug: ${slug}`)
      continue
    }

    const data = readJson<{ outline?: string | object; content?: string }>(join(articlesDir, file))
    if (!data) continue

    // outline peut être une string JSON — parser en objet
    let outline: object | null = null
    if (data.outline) {
      if (typeof data.outline === 'string') {
        try { outline = JSON.parse(data.outline) } catch { outline = null }
      } else {
        outline = data.outline
      }
    }

    try {
      await client.query(
        `INSERT INTO article_content (article_id, outline, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (article_id) DO NOTHING`,
        [articleId, outline ? JSON.stringify(outline) : null, data.content ?? null]
      )
      count++
    } catch (err) {
      console.error(`  [WARN] article_content ${slug}:`, (err as Error).message)
    }
  }

  console.log(`  ✓ article_content: ${count} rows`)
}

async function seedStrategies(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }
) {
  console.log('\n📌 article_strategies...')
  const strategiesDir = join(DATA_DIR, 'strategies')
  if (!existsSync(strategiesDir)) { console.log('  [SKIP] data/strategies/ not found'); return }

  const files = readdirSync(strategiesDir).filter(f => f.endsWith('.json'))
  let count = 0

  for (const file of files) {
    const filenameNoExt = basename(file, '.json')
    // Les fichiers sont nommés par cocoon slug (pas par article id)
    // On les insère avec article_id = NULL car ce sont des stratégies de cocon
    // Note: le schéma exige article_id FK vers articles — on skip pour l'instant
    // Ces stratégies seront migrées manuellement après si nécessaire
    const data = readJson(join(strategiesDir, file))
    if (!data) continue

    // Essayer de parser comme article id numérique
    const numId = parseInt(filenameNoExt, 10)
    if (!isNaN(numId)) {
      try {
        await client.query(
          `INSERT INTO article_strategies (article_id, data, completed_steps)
           VALUES ($1, $2, $3)
           ON CONFLICT (article_id) DO NOTHING`,
          [numId, JSON.stringify(data), (data as { completedSteps?: number }).completedSteps ?? 0]
        )
        count++
      } catch (err) {
        console.error(`  [WARN] strategy ${filenameNoExt}:`, (err as Error).message)
      }
    } else {
      // Cocon slug strategies → insert into api_cache as 'cocoon-strategy'
      const cacheKey = filenameNoExt.replace(/^cocoon-/, '')
      const ttlMs = 365 * 24 * 60 * 60 * 1000
      const expiresAt = new Date(Date.now() + ttlMs)
      try {
        await client.query(
          `INSERT INTO api_cache (cache_key, cache_type, data, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (cache_key, cache_type) DO NOTHING`,
          [cacheKey, 'cocoon-strategy', JSON.stringify(data), expiresAt]
        )
        console.log(`  ✓ Cocoon strategy cached: ${cacheKey}`)
      } catch (err) {
        console.error(`  [WARN] cocoon strategy ${cacheKey}:`, (err as Error).message)
      }
    }
  }

  console.log(`  ✓ article_strategies: ${count} rows`)
}

async function seedMicroContexts(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> },
  slugToId: Map<string, number>
) {
  console.log('\n📌 article_micro_contexts...')
  const data = readJson<{ micro_contexts: Array<{ id?: number; slug?: string; angle?: string; tone?: string; directives?: string }> }>(
    join(DATA_DIR, 'article-micro-context.json')
  )
  if (!data?.micro_contexts) { console.log('  [SKIP] article-micro-context.json not found or empty'); return }

  let count = 0
  for (const ctx of data.micro_contexts) {
    // Résoudre article_id par slug ou id
    let articleId: number | undefined
    if (ctx.slug) {
      articleId = slugToId.get(ctx.slug)
    } else if (ctx.id) {
      articleId = ctx.id
    }
    if (!articleId) {
      console.error(`  [WARN] No article found for micro-context: ${JSON.stringify(ctx).slice(0, 100)}`)
      continue
    }

    try {
      await client.query(
        `INSERT INTO article_micro_contexts (article_id, angle, tone, directives)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (article_id) DO NOTHING`,
        [articleId, ctx.angle ?? null, ctx.tone ?? null, ctx.directives ?? null]
      )
      count++
    } catch (err) {
      console.error(`  [WARN] micro_context ${articleId}:`, (err as Error).message)
    }
  }
  console.log(`  ✓ article_micro_contexts: ${count} rows`)
}

async function seedInternalLinks(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }
) {
  console.log('\n📌 internal_links...')
  const linkingFile = join(DATA_DIR, 'links', 'linking-matrix.json')
  if (!existsSync(linkingFile)) { console.log('  [SKIP] linking-matrix.json not found'); return }

  const data = readJson<{ links: Array<{ source_id: number; target_id: number; position?: string; anchor_text?: string; reason?: string; validated_at?: string }> }>(linkingFile)
  if (!data?.links) { console.log('  [SKIP] No links in linking-matrix.json'); return }

  const rows = data.links.map(l => [l.source_id, l.target_id, l.position ?? null, l.anchor_text ?? null, l.reason ?? null, l.validated_at ?? null])
  const count = await batchInsert(
    client,
    `INSERT INTO internal_links (source_id, target_id, position, anchor_text, reason, validated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (source_id, target_id, position) DO NOTHING`,
    rows
  )
  console.log(`  ✓ internal_links: ${count} rows`)
}

async function seedLocalEntities(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null }> }
) {
  console.log('\n📌 local_entities...')
  const data = readJson<Record<string, Array<{ name: string; type?: string; aliases?: string[]; region?: string }>>>(
    join(DATA_DIR, 'local-entities.json')
  )
  if (!data) { console.log('  [SKIP] local-entities.json not found or empty'); return }

  const rows: unknown[][] = []
  for (const [category, entities] of Object.entries(data)) {
    for (const entity of entities) {
      rows.push([entity.name, entity.type ?? category, entity.aliases ?? [], entity.region ?? null])
    }
  }

  const count = await batchInsert(
    client,
    `INSERT INTO local_entities (name, type, aliases, region) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    rows
  )
  console.log(`  ✓ local_entities: ${count} rows`)
}

async function printCounts(client: { query: (text: string) => Promise<{ rows: { count: string }[] }> }) {
  const tables = [
    'theme_config', 'silos', 'cocoons', 'articles', 'keywords_seo',
    'article_keywords', 'article_content', 'article_strategies',
    'article_micro_contexts', 'internal_links',
    'local_entities', 'api_cache'
  ]
  console.log('\n📊 Final counts:')
  for (const table of tables) {
    const res = await client.query(`SELECT COUNT(*) as count FROM ${table}`)
    console.log(`  ${table}: ${res.rows[0].count}`)
  }
}

async function main() {
  console.log(`\n🚀 Seed script — mode: ${MODE}`)
  const client = await pool.connect()

  try {
    if (MODE === 'reset') {
      console.log('\n⚠️  RESET mode — truncating all tables...')
      await client.query('BEGIN')
      await client.query(`
        TRUNCATE TABLE api_cache, local_entities, internal_links,
        article_micro_contexts, article_strategies, article_keywords, article_content,
        keywords_seo, article_keywords, articles, cocoons, silos, theme_config
        RESTART IDENTITY CASCADE
      `)
      await client.query('COMMIT')
      console.log('  ✓ All tables truncated')
    }

    await seedThemeConfig(client as never)
    const { cocoonMap } = await seedSilosAndCocoons(client as never)
    const slugToId = await seedArticles(client as never, cocoonMap)
    await seedKeywordsSeo(client as never)
    await seedArticleKeywords(client as never)
    await seedArticleContent(client as never, slugToId)
    await seedStrategies(client as never)
    await seedMicroContexts(client as never, slugToId)
    await seedInternalLinks(client as never)
    await seedLocalEntities(client as never)

    await printCounts(client as never)
    console.log('\n✅ Seed complete!')
  } catch (err) {
    console.error('\n❌ Seed failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
