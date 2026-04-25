import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

export const pool = new Pool({
  host: process.env.PG_HOST ?? 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Évite le crash process Node.js sur erreur pool idle
pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err)
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params)
}
