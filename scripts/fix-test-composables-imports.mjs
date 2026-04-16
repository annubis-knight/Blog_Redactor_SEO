#!/usr/bin/env node
/**
 * One-shot script: fix broken composable imports in test files after the
 * src/composables/ reorganization into subfolders (ui/, editor/, seo/, keyword/, intent/).
 *
 * Handles:
 *   - import { X } from '../../src/composables/useY'
 *   - import { X } from '../../../src/composables/useY'
 *   - vi.mock('../../../src/composables/useY', ...)
 *   - await import('../../../src/composables/useY')
 *   - Any comment or string containing '../../../src/composables/useY'
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const COMPOSABLES_DIR = join(ROOT, 'src/composables')
const TESTS_DIR = join(ROOT, 'tests')
const categories = ['ui', 'editor', 'seo', 'keyword', 'intent']

// Build name -> category map
const composableCat = new Map()
for (const cat of categories) {
  const dir = join(COMPOSABLES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.ts')) {
      composableCat.set(file.replace(/\.ts$/, ''), cat)
    }
  }
}
console.log(`Loaded ${composableCat.size} composables across ${categories.length} categories`)

// Walk tests/ recursively
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.ts')) out.push(full)
  }
  return out
}

const testFiles = walk(TESTS_DIR)
console.log(`Scanning ${testFiles.length} test files...`)

// Regex: matches any quoted string like "(../)+src/composables/useX"
// Captures: quote char, prefix (../s), composable name, quote char
const PATTERN = /(['"])((?:\.\.\/)+)src\/composables\/(use[A-Z]\w+)\1/g

let filesChanged = 0
let totalReplacements = 0

for (const file of testFiles) {
  const before = readFileSync(file, 'utf8')
  let replacementsInFile = 0

  const after = before.replace(PATTERN, (match, quote, prefix, name) => {
    const cat = composableCat.get(name)
    if (!cat) return match
    replacementsInFile++
    return `${quote}${prefix}src/composables/${cat}/${name}${quote}`
  })

  if (after !== before) {
    writeFileSync(file, after, 'utf8')
    filesChanged++
    totalReplacements += replacementsInFile
    console.log(`  ✓ ${relative(ROOT, file)} (${replacementsInFile} imports)`)
  }
}

console.log(`\nDone: ${totalReplacements} imports fixed across ${filesChanged} files.`)
