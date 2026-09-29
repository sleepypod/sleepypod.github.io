import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root = resolve('out')
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
}
createServer(async (req, res) => {
  try {
    let path = resolve(
      root,
      '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
    )
    if (path !== root && !path.startsWith(root + sep)) throw Error('Forbidden')
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
    const data = await readFile(path)
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end(await readFile(resolve(root, '404.html')).catch(() => Buffer.from('Not found')))
  }
}).listen(4173, '127.0.0.1', () => console.log('Static site on http://127.0.0.1:4173'))
