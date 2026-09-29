import type { MetadataRoute } from 'next'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
export const dynamic = 'force-static'
function paths(dir = 'content', prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? paths(join(dir, e.name), prefix + '/' + e.name)
      : e.name.endsWith('.mdx')
        ? [prefix + (e.name === 'index.mdx' ? '' : '/' + e.name.replace('.mdx', '')) + '/']
        : [],
  )
}
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', ...paths()].map((path) => ({ url: 'https://sleepypod.github.io' + path }))
}
