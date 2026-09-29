import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const { assets } = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const actual = (await readdir('public/media')).sort()
const expected = assets.map((a) => a.output).sort()
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error('Manifest and media directory differ')
for (const a of assets) {
  const b = await readFile(`public/media/${a.output}`)
  if (b.length > 5 * 1024 * 1024) throw new Error(`Asset over 5 MiB: ${a.output}`)
  if (createHash('sha256').update(b).digest('hex') !== a.sha256)
    throw new Error(`Checksum mismatch: ${a.output}`)
  if (b.length !== a.bytes) throw new Error(`Byte size mismatch: ${a.output}`)
  if (a.output.endsWith('.png')) {
    const m = await sharp(b).metadata()
    if (m.format !== 'png' || m.width !== a.width || m.height !== a.height)
      throw new Error(`Invalid PNG: ${a.output}`)
  }
  if (a.output.endsWith('.mp4') && b.subarray(4, 8).toString() !== 'ftyp')
    throw new Error(`Invalid MP4: ${a.output}`)
}
console.log(`Verified ${assets.length} product assets, dimensions, and SHA-256 checksums`)
