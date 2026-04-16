#!/usr/bin/env node
/**
 * One-shot script: rewrites relative imports to services after the
 * server/services/ reorganization into subfolders.
 *
 * Handles three patterns (all in string context: static import, dynamic import,
 * vi.mock, require):
 *
 *   1. Cross-service (files now inside server/services/<cat>/):
 *      './name.service.js' -> '../<cat>/name.service.js'
 *
 *   2. Routes/utils (server/routes/*.ts, server/utils/*.ts, server/index.ts):
 *      '../services/name.service.js' -> '../services/<cat>/name.service.js'
 *
 *   3. Tests (tests/unit/services/*.test.ts, tests/functional/*.ts):
 *      '../../../server/services/name.service' -> '../../../server/services/<cat>/name.service'
 *      (works with any ../ depth)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
const SERVICES_DIR = join(ROOT, 'server/services')
const categories = ['article', 'keyword', 'intent', 'strategy', 'external', 'infra']

// Build service-name -> category map (names without `.service.ts`)
const serviceCat = new Map()
for (const cat of categories) {
  const dir = join(SERVICES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.service.ts')) {
      serviceCat.set(file.replace(/\.service\.ts$/, ''), cat)
    }
  }
}
console.log(`Loaded ${serviceCat.size} services across ${categories.length} categories`)

// Walk project for .ts, .mjs, .js files (skip node_modules, dist, .git, _bmad-output, src/, shared/)
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '_bmad-output', 'memory'].includes(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (['.ts', '.mjs', '.js'].includes(extname(full))) out.push(full)
  }
  return out
}

const files = walk(ROOT)
console.log(`Scanning ${files.length} source files...`)

// Pattern 1: cross-service './name.service.js' (only relevant inside server/services/)
const CROSS_PATTERN = /(['"])\.\/([\w-]+)\.service(\.js)?(['"])/g
// Pattern 2: routes/utils '../services/name.service.js'
const ROUTES_PATTERN = /(['"])((?:\.\.\/)+)services\/([\w-]+)\.service(\.js)?(['"])/g
// Pattern 3: tests/externals '../../../server/services/name.service(.js)?'
const TESTS_PATTERN = /(['"])((?:\.\.\/)+)server\/services\/([\w-]+)\.service(\.js)?(['"])/g

let filesChanged = 0
let totalReplacements = 0

for (const file of files) {
  const before = readFileSync(file, 'utf8')
  let count = 0
  const isService = file.startsWith(SERVICES_DIR + '\\') || file.startsWith(SERVICES_DIR + '/')
  let fileCat = null
  if (isService) {
    // Determine this service's category from its parent folder
    const rel = relative(SERVICES_DIR, file)
    fileCat = rel.split(/[\\/]/)[0]
  }

  let after = before

  // Pattern 1: only within service files, './name.service.js' -> '../<targetCat>/name.service.js'
  if (isService) {
    after = after.replace(CROSS_PATTERN, (match, q1, name, ext, q2) => {
      const cat = serviceCat.get(name)
      if (!cat) return match
      count++
      const extStr = ext ?? ''
      // Same category: keep './', otherwise go up one level
      if (cat === fileCat) {
        return `${q1}./${name}.service${extStr}${q2}`
      }
      return `${q1}../${cat}/${name}.service${extStr}${q2}`
    })
  }

  // Pattern 2: routes/utils
  after = after.replace(ROUTES_PATTERN, (match, q1, prefix, name, ext, q2) => {
    const cat = serviceCat.get(name)
    if (!cat) return match
    count++
    return `${q1}${prefix}services/${cat}/${name}.service${ext ?? ''}${q2}`
  })

  // Pattern 3: test paths like '../../../server/services/name.service'
  after = after.replace(TESTS_PATTERN, (match, q1, prefix, name, ext, q2) => {
    const cat = serviceCat.get(name)
    if (!cat) return match
    count++
    return `${q1}${prefix}server/services/${cat}/${name}.service${ext ?? ''}${q2}`
  })

  if (after !== before) {
    writeFileSync(file, after, 'utf8')
    filesChanged++
    totalReplacements += count
    console.log(`  ✓ ${relative(ROOT, file)} (${count} imports)`)
  }
}

console.log(`\nDone: ${totalReplacements} imports fixed across ${filesChanged} files.`)
