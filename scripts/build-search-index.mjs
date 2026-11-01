import { createRequire } from 'node:module'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

// Writes out/search-index.json for the Core command palette. Titles and anchors
// come from the built HTML so they match what Nextra renders; descriptions and
// keywords come from the MDX frontmatter.
const require = createRequire(import.meta.url)
const { parse: parseYaml } = createRequire(require.resolve('nextra'))('yaml')
const base = 'https://sleepypod.github.io'

const loadMeta = async (dir) => {
  const src = await readFile(join(dir, '_meta.ts'), 'utf8').catch(() => null)
  if (!src) return {}
  const url = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64')
  return (await import(url)).default
}
const metaTitle = (entry) => (typeof entry === 'string' ? entry : entry?.title)
const metaHidden = (entry) => typeof entry === 'object' && entry?.display === 'hidden'

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
const text = (html) =>
  decode(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()

const cap = (s, max = 200) => {
  if (s.length <= max) return s
  const cut = s.slice(0, max + 1).replace(/\s+\S*$/, '')
  return cut.replace(/[\s,;:.–—-]+$/, '') + '…'
}

function plain(md) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\/\*.*?\*\/\}/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|\W)[*_](\S(?:.*?\S)?)[*_](?=\W|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstParagraph(body) {
  const lines = body.split('\n')
  let closing = null
  let fence = null
  let para = []
  for (const line of lines) {
    if (fence) {
      if (line.trimStart().startsWith(fence)) fence = null
      continue
    }
    if (closing) {
      if (line.includes(closing)) closing = null
      continue
    }
    if (!line.trim()) {
      if (para.length) break
      continue
    }
    if (para.length) {
      para.push(line)
      continue
    }
    const fenceMatch = line.match(/^\s*(```|~~~)/)
    if (fenceMatch) {
      fence = fenceMatch[1]
      continue
    }
    const tag = line.match(/^<([A-Za-z][\w.]*)/)
    if (tag) {
      const opened = line.slice(line.indexOf('<'))
      if (!/\/>\s*$/.test(opened) && !opened.includes(`</${tag[1]}>`)) closing = `</${tag[1]}>`
      continue
    }
    if (/^(import|export)\s/.test(line) || /^\s|^[#>|!:-]|^\d+\.\s|^\{/.test(line)) continue
    para.push(line)
  }
  return plain(para.join(' '))
}

function headings(html) {
  const out = []
  // Markdown headings carry Nextra's permalink; component headings (Tabs, showcases) do not.
  for (const m of html.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/g)) {
    const id = m[2].match(/\bid="([^"]+)"/)?.[1]
    if (!id || !m[3].includes('subheading-anchor')) continue
    out.push({ title: text(m[3]), anchor: decode(id) })
  }
  return out
}

async function walk(dir, route, section, skipped) {
  const meta = await loadMeta(dir)
  const pages = []
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const key = e.name.replace(/\.mdx$/, '')
    const path = route + (key === 'index' ? '' : key + '/')
    if (metaHidden(meta[key])) {
      skipped.push(path)
      continue
    }
    if (e.isDirectory()) {
      const sub = section === undefined ? (metaTitle(meta[key]) ?? key) : section
      pages.push(...(await walk(join(dir, e.name), path, sub, skipped)))
      continue
    }
    if (!e.name.endsWith('.mdx')) continue
    const src = await readFile(join(dir, e.name), 'utf8')
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    const data = (fm && parseYaml(fm[1])) || {}
    if (data.searchable === false || data.draft === true) {
      skipped.push(path)
      continue
    }
    const html = await readFile(join('out', path, 'index.html'), 'utf8')
    const main = html.match(/<main\b[^>]*data-pagefind-body[\s\S]*?<\/main>/)?.[0]
    if (!main) throw new Error(`No indexed content in out${path}index.html`)
    const h1 = main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
    const keywords = Array.isArray(data.keywords) ? data.keywords.join(' ') : data.keywords
    pages.push({
      path,
      title: data.title || (h1 && text(h1)) || metaTitle(meta[key]) || key,
      section: section ?? null,
      description: cap(
        (data.description || firstParagraph(src.slice(fm ? fm[0].length : 0))).trim(),
      ),
      headings: headings(main),
      keywords: keywords ? String(keywords).trim() : '',
    })
  }
  return pages
}

const skipped = []
const pages = (await walk('content', '/', undefined, skipped)).sort((a, b) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
)
if (!pages.length) throw new Error('Search index has no pages')
const json = JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), base, pages })
await writeFile('out/search-index.json', json)
console.log(
  `Search index: ${pages.length} pages, ${json.length} bytes (${gzipSync(json).length} gzipped)` +
    (skipped.length ? `; skipped ${skipped.join(', ')}` : ''),
)
