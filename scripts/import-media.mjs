import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const root = resolve(process.env.PRODUCT_ROOT || '../../../../')
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
await mkdir('public/media', { recursive: true })
for (const asset of manifest.assets) {
  if (asset.method.startsWith('Playwright')) continue
  let bytes = execFileSync(
    'git',
    ['-C', resolve(root, asset.repository), 'show', `${asset.commit}:${asset.source}`],
    { maxBuffer: 30 * 1024 * 1024 },
  )
  if (bytes.subarray(0, 100).toString().includes('git-lfs.github.com')) {
    const oid = bytes.toString().match(/oid sha256:([a-f0-9]{64})/)[1]
    bytes = execFileSync('git', ['-C', resolve(root, asset.repository), 'lfs', 'smudge'], {
      input: bytes,
      maxBuffer: 30 * 1024 * 1024,
    })
    if (createHash('sha256').update(bytes).digest('hex') !== oid)
      throw new Error('LFS object checksum mismatch')
  }
  asset.sha256 = createHash('sha256').update(bytes).digest('hex')
  asset.bytes = bytes.length
  if (asset.output.endsWith('.png')) {
    const m = await sharp(bytes).metadata()
    asset.width = m.width
    asset.height = m.height
  }
  await writeFile(`public/media/${asset.output}`, bytes)
  console.log(`Imported ${asset.output}`)
}
await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
