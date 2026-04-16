/**
 * Cleanup script: removes contaminated cross-article validation entries.
 * Each article should only have entries where articleLevel matches the article type.
 *
 * Article type → expected articleLevel:
 *   Pilier → "pilier"
 *   Intermédiaire → "intermediaire"
 *   Spécialisé → "specifique"
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

// Load BDD to get article types
const bdd = JSON.parse(readFileSync(join(DATA_DIR, 'BDD_Articles_Blog.json'), 'utf-8'))
const articleTypeMap = new Map()
for (const silo of bdd.silos) {
  for (const cocoon of silo.cocons) {
    for (const article of cocoon.articles) {
      const level = article.type === 'Pilier' ? 'pilier'
        : article.type === 'Intermédiaire' ? 'intermediaire'
        : 'specifique'
      articleTypeMap.set(article.id, level)
    }
  }
}

// Load keywords
const kwFile = join(DATA_DIR, 'article-keywords.json')
const kwData = JSON.parse(readFileSync(kwFile, 'utf-8'))

let removedValidations = 0
let removedRoots = 0

for (const entry of kwData.keywords_par_article) {
  const expectedLevel = articleTypeMap.get(entry.articleId)
  if (!expectedLevel) {
    console.log(`  Article ${entry.articleId}: no type found in BDD, skipping`)
    continue
  }

  // Clean validationHistory
  if (entry.richCaptain?.validationHistory) {
    const before = entry.richCaptain.validationHistory.length
    entry.richCaptain.validationHistory = entry.richCaptain.validationHistory.filter(
      h => h.articleLevel === expectedLevel
    )
    const diff = before - entry.richCaptain.validationHistory.length
    if (diff > 0) {
      removedValidations += diff
      console.log(`  Article ${entry.articleId} (${expectedLevel}): removed ${diff} contaminated validationHistory entries`)
    }
  }

  // Clean richRootKeywords
  if (entry.richRootKeywords) {
    const before = entry.richRootKeywords.length
    entry.richRootKeywords = entry.richRootKeywords.filter(
      r => r.articleLevel === expectedLevel
    )
    const diff = before - entry.richRootKeywords.length
    if (diff > 0) {
      removedRoots += diff
      console.log(`  Article ${entry.articleId} (${expectedLevel}): removed ${diff} contaminated richRootKeywords entries`)
    }
  }
}

console.log(`\nTotal removed: ${removedValidations} validationHistory + ${removedRoots} richRootKeywords`)

// Write back
writeFileSync(kwFile, JSON.stringify(kwData, null, 2) + '\n', 'utf-8')
console.log('Cleaned data written to', kwFile)
