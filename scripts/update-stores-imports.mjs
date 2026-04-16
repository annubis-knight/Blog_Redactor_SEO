#!/usr/bin/env node
/**
 * One-shot script: rewrites '@/stores/<name>.store' imports to include the
 * new subfolder: '@/stores/<cat>/<name>.store'.
 *
 * Also handles relative paths used in tests:
 *   - '../../../src/stores/<name>.store'
 *   - '../../src/stores/<name>.store'
 * In any string context (static import, dynamic import, vi.mock).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
const STORES_DIR = join(ROOT, 'src/stores')
const categories = ['article', 'strategy', 'keyword', 'ui', 'external']

// Build store-name -> category map (names without `.store.ts`)
const storeCat = new Map()
for (const cat of categories) {
  const dir = join(STORES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.store.ts')) {
      storeCat.set(file.replace(/\.store\.ts$/, ''), cat)
    }
  }
}
console.log(`Loaded ${storeCat.size} stores across ${categories.length} categories`)

// Walk project for .ts, .vue, .mjs files (skip node_modules, dist, .git, _bmad-output)
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === '_bmad-output' || entry === 'memory') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (['.ts', '.vue', '.mjs', '.js'].includes(extname(full))) out.push(full)
  }
  return out
}

const files = walk(ROOT)
console.log(`Scanning ${files.length} source files...`)

// Pattern 1: @/stores/<name>.store
const ALIAS_PATTERN = /(['"])@\/stores\/([a-z][\w-]*)\.store(['"])/g
// Pattern 2: relative paths ending in src/stores/<name>.store
const REL_PATTERN = /(['"])((?:\.\.\/)+)src\/stores\/([a-z][\w-]*)\.store(['"])/g

let filesChanged = 0
let totalReplacements = 0

for (const file of files) {
  const before = readFileSync(file, 'utf8')
  let count = 0

  let after = before.replace(ALIAS_PATTERN, (match, q1, name, q2) => {
    const cat = storeCat.get(name)
    if (!cat) return match
    count++
    return `${q1}@/stores/${cat}/${name}.store${q2}`
  })

  after = after.replace(REL_PATTERN, (match, q1, prefix, name, q2) => {
    const cat = storeCat.get(name)
    if (!cat) return match
    count++
    return `${q1}${prefix}src/stores/${cat}/${name}.store${q2}`
  })

  if (after !== before) {
    writeFileSync(file, after, 'utf8')
    filesChanged++
    totalReplacements += count
    console.log(`  ✓ ${relative(ROOT, file)} (${count} imports)`)
  }
}

console.log(`\nDone: ${totalReplacements} imports fixed across ${filesChanged} files.`)
