import { log } from '../utils/logger.js'

interface ExportOptions {
  title: string
  metaTitle: string
  metaDescription: string
  cocoonName: string
  content: string
  /** Optional JSON-LD script block to inject in <head> */
  jsonLd?: string
}

/** Parse TipTap HTML to extract structured sections */
function parseSections(html: string): { intro: string; chapters: { title: string; id: string; body: string }[]; conclusion: string } {
  const sections: { title: string; id: string; body: string }[] = []
  let intro = ''
  let conclusion = ''

  // Split by H2 tags
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gi
  const matches: { index: number; title: string }[] = []
  let match: RegExpExecArray | null

  while ((match = h2Pattern.exec(html)) !== null) {
    matches.push({ index: match.index, title: match[1]! })
  }

  if (matches.length === 0) {
    // No H2s — treat entire content as intro
    intro = html
    return { intro, chapters: sections, conclusion }
  }

  // Content before first H2 is intro
  intro = html.slice(0, matches[0]!.index).trim()

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!
    const nextIndex = i + 1 < matches.length ? matches[i + 1]!.index : html.length
    const fullSection = html.slice(current.index, nextIndex)
    // Remove the H2 tag itself to get body
    const body = fullSection.replace(/<h2[^>]*>.*?<\/h2>/i, '').trim()
    const titleText = current.title.replace(/<[^>]+>/g, '').trim()
    const id = slugify(titleText)

    const isConclusion = titleText.toLowerCase().includes('conclusion')
    if (isConclusion) {
      conclusion = body
    } else {
      sections.push({ title: titleText, id, body })
    }
  }

  return { intro, chapters: sections, conclusion }
}

/** Create a URL-friendly slug from text */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Build the sommaire (table of contents) HTML */
function buildSommaire(chapters: { title: string; id: string }[], hasConclusion: boolean): string {
  const items = chapters.map((ch) => `                                    <li><a href="#${ch.id}">${ch.title}</a></li>`)

  if (hasConclusion) {
    items.push('                                    <li><a href="#conclusion">Conclusion</a></li>')
  }

  return items.join('\n')
}

/** Build chapter HTML sections */
function buildChapters(chapters: { title: string; id: string; body: string }[]): string {
  return chapters.map((ch) => `
                        <!-- CHAPTER: ${ch.title} -->
                        <div id="${ch.id}" class="col-span-8 pad-y-small">
                            <h2>${ch.title}</h2>
                            ${ch.body}
                        </div>`).join('\n')
}

/** Generate full Propulsite-compliant HTML from article data */
export async function generateExportHtml(options: ExportOptions): Promise<string> {
  const { title, metaTitle, metaDescription, cocoonName, content, jsonLd } = options
  log.info(`generateExportHtml: ${title}`, { contentLength: content.length, hasJsonLd: !!jsonLd })

  const { intro, chapters, conclusion } = parseSections(content)
  log.debug(`generateExportHtml: parsed ${chapters.length} chapters, intro=${intro.length > 0}, conclusion=${conclusion.length > 0}`)
  const sommaire = buildSommaire(chapters, conclusion.length > 0)

  const breadcrumb = `Propulsite / Blog / ${cocoonName} / ${title}`

  const jsonLdBlock = jsonLd
    ? `    <script type="application/ld+json">\n${jsonLd}\n    </script>`
    : ''

  const conclusionHtml = conclusion
    ? `
                        <!-- CONCLUSION -->
                        <div id="conclusion" class="col-span-8 pad-y-small">
                            <h2>Conclusion</h2>
                            ${conclusion}
                        </div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDescription)}">
    <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Text&family=Red+Hat+Text:wght@400;500;600;700&display=swap"
        rel="stylesheet">
    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Petrona:ital,wght@0,100..900;1,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link href="/css/tailwindOut.css" rel="stylesheet">
    <link href="/css/globals.css" rel="stylesheet">
    <link href="/css/styles.css" rel="stylesheet">
${jsonLdBlock}
</head>

<body>
    <div w3-include-html="/components/navbar.html"></div>
    <main class="mx-auto">
        <!-- Section Hero -->
        <section id="sectionHeroRealisation" class="pad-y-large">
            <div class="absoluteIcon2">
                <img src="/assets/svg/NomIcone=outStr_Arrow.svg" alt="Image absolute" class="w-full">
            </div>
            <div class="containerMax mx-auto x-5">
                <div class="grid-tailwind py-20">
                    <div class="col-span-full flex flex-col">
                        <h1>${escapeHtml(title)}</h1>
                        <p class="text-large">${escapeHtml(metaDescription)}</p>
                    </div>
                </div>
            </div>
        </section>

        <article>
            <section class="pad-y-small">
                <div class="containerMax">
                    <div class="grid-tailwind">

                        <!-- SOMMAIRE -->
                        <div id="section-sommaire" class="col-span-8 pad-y-small">
                                <p class="text-small">${escapeHtml(breadcrumb)}</p>
                                <h2>Sommaire</h2>
                                <ul>
${sommaire}
                                </ul>
                        </div>

                        <!-- INTRODUCTION -->
                        <div class="col-span-8 pad-y-small">
                            <h2>Introduction</h2>
                            ${intro}
                        </div>
${buildChapters(chapters)}
${conclusionHtml}

                    </div>
                </div>
            </section>
        </article>
    </main>
    <div w3-include-html="/components/footer.html"></div>

    <script>
        function includeHTML() {
            let elements = document.querySelectorAll("[w3-include-html]");
            elements.forEach(el => {
                let file = el.getAttribute("w3-include-html");
                fetch(file)
                    .then(response => response.text())
                    .then(data => el.innerHTML = data);
            });
        }
        includeHTML();
    </script>
</body>

</html>`

  return html
}

/** Escape HTML special characters for attribute values */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Generate JSON-LD for Article, FAQPage, BreadcrumbList */
export function generateJsonLd(options: {
  title: string
  metaDescription: string
  cocoonName: string
  slug: string
  content: string
  datePublished?: string
}): string {
  const { title, metaDescription, cocoonName, slug, content, datePublished } = options
  log.info(`generateJsonLd: ${slug}`)
  const now = datePublished || new Date().toISOString()

  // Extract H2 questions for FAQPage
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gi
  const questions: { question: string; answer: string }[] = []
  let match: RegExpExecArray | null
  const h2Matches: { index: number; title: string; fullMatch: string }[] = []

  while ((match = h2Pattern.exec(content)) !== null) {
    h2Matches.push({ index: match.index, title: match[1]!, fullMatch: match[0] })
  }

  for (let i = 0; i < h2Matches.length; i++) {
    const current = h2Matches[i]!
    const titleText = current.title.replace(/<[^>]+>/g, '').trim()
    // Check if heading is a question
    if (titleText.includes('?') || /^(comment|pourquoi|quand|où|quel|quelle|quels|quelles)\b/i.test(titleText)) {
      const nextIndex = i + 1 < h2Matches.length ? h2Matches[i + 1]!.index : content.length
      const sectionContent = content.slice(current.index + current.fullMatch.length, nextIndex)
      // Extract first paragraph as answer
      const pMatch = /<p[^>]*>(.*?)<\/p>/is.exec(sectionContent)
      const answer = pMatch ? pMatch[1]!.replace(/<[^>]+>/g, '').trim() : ''
      if (answer) {
        questions.push({ question: titleText, answer })
      }
    }
  }

  const schemas: object[] = []

  // Article schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: metaDescription,
    author: {
      '@type': 'Organization',
      name: 'PropulSite',
    },
    datePublished: now,
    dateModified: now,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://propulsite.fr/pages/${slug}`,
    },
  })

  // FAQPage schema (if questions found)
  if (questions.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    })
  }

  // BreadcrumbList schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'PropulSite',
        item: 'https://propulsite.fr',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://propulsite.fr/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: cocoonName,
        item: `https://propulsite.fr/blog/${slugify(cocoonName)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: title,
        item: `https://propulsite.fr/pages/${slug}`,
      },
    ],
  })

  log.debug(`generateJsonLd: ${schemas.length} schemas, ${questions.length} FAQ questions`)
  return JSON.stringify(schemas, null, 2)
}