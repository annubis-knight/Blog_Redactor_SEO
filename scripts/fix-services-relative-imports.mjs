#!/usr/bin/env node
/**
 * One-shot script: after moving services into server/services/<cat>/,
 * every relative import like `'../utils/X'` or `'../../shared/X'` is broken
 * because the files moved one directory deeper.
 *
 * We add one more `../` to every non-sibling relative import in those files.
 *
 * NOTE: sibling-service imports (`./name.service.js` or `../other-cat/name.service.js`)
 * are already handled by update-services-imports.mjs. We preserve them by skipping
 * any import that resolves to another service.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
const SERVICES_DIR = join(ROOT, 'server/services')
const categories = ['article', 'keyword', 'intent', 'strategy', 'external', 'infra']

// Walk service subfolders
const serviceFiles = []
for (const cat of categories) {
  const dir = join(SERVICES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.ts')) serviceFiles.push(join(dir, file))
  }
}
console.log(`Fixing ${serviceFiles.length} service files...`)

// Match any relative import like "'../X/Y'" (from or export-from, static or dynamic).
// We capture the full path after the quote to check if it's a sibling-service (skip).
const REL_PATTERN = /((?:from|export\s*\*\s*from|export\s+\{[^}]*\}\s+from|import)\s*\()?(from\s+|import\s+|import\s*\(\s*|export\s*\*\s*from\s+|export\s+\{[^}]*\}\s+from\s+)?(['"])(\.\.(?:\/[^'"]*))(['"])/g

// Simpler regex approach: look for ONLY the specific prefixes that moved files reference upward: ../utils, ../types, ../config, ../middleware, ../repositories, ../../shared, ../prompts, ../schemas
// That's safer than touching cross-service imports (which we already fixed).

const fixes = [
  // '../utils/X' -> '../../utils/X' — only when depth is exactly 1 `../`
  { re: /(['"])\.\.\/(utils|types|config|middleware|repositories|prompts|schemas)\//g, sub: `$1../../$2/` },
  // '../../shared/X' -> '../../../shared/X'
  { re: /(['"])\.\.\/\.\.\/shared\//g, sub: `$1../../../shared/` },
]

let totalReplacements = 0
let filesChanged = 0

for (const file of serviceFiles) {
  const before = readFileSync(file, 'utf8')
  let after = before
  let count = 0
  for (const fix of fixes) {
    const newAfter = after.replace(fix.re, (match) => {
      count++
      return match.replace(fix.re, fix.sub)
    })
    after = newAfter
  }
  if (after !== before) {
    writeFileSync(file, after, 'utf8')
    totalReplacements += count
    filesChanged++
    console.log(`  ✓ ${relative(ROOT, file)} (${count} imports)`)
  }
}

console.log(`\nDone: ${totalReplacements} imports fixed across ${filesChanged} files.`)
