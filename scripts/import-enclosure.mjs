// Converts the Dial enclosure 3MF (pinned in capture/manifest.json) into one glTF binary.
// Both parts come from the Bambu Studio project; the geometry is copied, never redrawn.
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'

const OUTPUT = 'dial-enclosure.glb'
const root = resolve(process.env.PRODUCT_ROOT || '../../../../')
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const asset = manifest.assets.find((a) => a.output === OUTPUT)
if (!asset) throw new Error(`No manifest entry for ${OUTPUT}`)
let zip = execFileSync(
  'git',
  ['-C', resolve(root, asset.repository), 'show', `${asset.commit}:${asset.source}`],
  { maxBuffer: 30 * 1024 * 1024 },
)
if (zip.subarray(0, 100).toString().includes('git-lfs.github.com')) {
  const oid = zip.toString().match(/oid sha256:([a-f0-9]{64})/)[1]
  zip = execFileSync('git', ['-C', resolve(root, asset.repository), 'lfs', 'smudge'], {
    input: zip,
    maxBuffer: 30 * 1024 * 1024,
  })
  if (createHash('sha256').update(zip).digest('hex') !== oid)
    throw new Error('LFS object checksum mismatch')
}

// Minimal ZIP reader (3MF is an OPC package): central directory → stored/deflated entries.
function unzip(buf) {
  const files = new Map()
  let eocd = buf.length - 22
  while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd <= 0) throw new Error('Not a ZIP file')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad ZIP central directory')
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const data = buf.subarray(dataStart, dataStart + compressedSize)
    files.set(name, method === 8 ? inflateRawSync(data) : data)
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}
const files = unzip(zip)

// Parse every mesh object across the root model and any referenced object files.
const parts = []
const unitScale = { millimeter: 0.001, centimeter: 0.01, meter: 1, inch: 0.0254 }
for (const [name, data] of files) {
  if (!name.endsWith('.model')) continue
  const xml = data.toString('utf8')
  const scale = unitScale[xml.match(/<model[^>]*unit="([^"]+)"/)?.[1] ?? 'millimeter']
  for (const obj of xml.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) {
    if (!obj[2].includes('<mesh>')) continue
    const vertices = [...obj[2].matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].map(
      (m) => [+m[1] * scale, +m[2] * scale, +m[3] * scale],
    )
    const triangles = [...obj[2].matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)].map(
      (m) => [+m[1], +m[2], +m[3]],
    )
    parts.push({ id: obj[1], file: name, vertices, triangles })
  }
}
// Bambu Studio keeps the part names in its own settings file.
const settings = files.get('Metadata/model_settings.config')?.toString('utf8') ?? ''
const names = new Map(
  [...settings.matchAll(/<part id="(\d+)"[^>]*>\s*<metadata key="name" value="([^"]+)"/g)].map(
    (m) => [m[1], m[2].replace(/\s*\(.*\)$/, '')],
  ),
)
if (parts.length === 0) throw new Error('No meshes found in 3MF')

// Flat-shaded, unindexed triangles so printed edges stay crisp. CAD Z-up → glTF Y-up.
function buildMesh(part, offsetX) {
  const n = part.triangles.length * 3
  const pos = new Float32Array(n * 3)
  const nor = new Float32Array(n * 3)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let k = 0
  for (const [a, b, c] of part.triangles) {
    const tri = [part.vertices[a], part.vertices[b], part.vertices[c]].map(([x, y, z]) => [
      x + offsetX,
      z,
      -y,
    ])
    const u = tri[1].map((v, i) => v - tri[0][i])
    const w = tri[2].map((v, i) => v - tri[0][i])
    const nx = u[1] * w[2] - u[2] * w[1]
    const ny = u[2] * w[0] - u[0] * w[2]
    const nz = u[0] * w[1] - u[1] * w[0]
    const len = Math.hypot(nx, ny, nz) || 1
    for (const v of tri) {
      pos.set(v, k)
      nor.set([nx / len, ny / len, nz / len], k)
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], v[i])
        max[i] = Math.max(max[i], v[i])
      }
      k += 3
    }
  }
  return { pos, nor, min, max, count: n }
}
const gap = 0.02
let cursor = 0
const widths = parts.map((p) => {
  const xs = p.vertices.map((v) => v[0])
  return { min: Math.min(...xs), max: Math.max(...xs) }
})
const total = widths.reduce((s, w) => s + (w.max - w.min), 0) + gap * (parts.length - 1)
cursor = -total / 2
const meshes = parts.map((p, i) => {
  const m = buildMesh(p, cursor - widths[i].min)
  cursor += widths[i].max - widths[i].min + gap
  return m
})

// Assemble GLB: JSON chunk + BIN chunk.
const buffers = []
const bufferViews = []
const accessors = []
let byteLength = 0
function addView(arr, target) {
  const bytes = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
  const pad = (4 - (bytes.length % 4)) % 4
  buffers.push(bytes, Buffer.alloc(pad))
  bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target })
  byteLength += bytes.length + pad
  return bufferViews.length - 1
}
const gltfMeshes = meshes.map((m, i) => {
  const p = addView(m.pos, 34962)
  const n = addView(m.nor, 34962)
  accessors.push(
    { bufferView: p, componentType: 5126, count: m.count, type: 'VEC3', min: m.min, max: m.max },
    { bufferView: n, componentType: 5126, count: m.count, type: 'VEC3' },
  )
  return {
    name: names.get(parts[i].id) ?? `Part ${i + 1}`,
    primitives: [
      { attributes: { POSITION: accessors.length - 2, NORMAL: accessors.length - 1 }, material: 0 },
    ],
  }
})
const json = {
  asset: { version: '2.0', generator: 'sleepypod.github.io scripts/import-enclosure.mjs' },
  scene: 0,
  scenes: [{ nodes: gltfMeshes.map((_, i) => i) }],
  nodes: gltfMeshes.map((m, i) => ({ name: m.name, mesh: i })),
  meshes: gltfMeshes,
  materials: [
    {
      name: 'PLA Matte',
      pbrMetallicRoughness: {
        baseColorFactor: [0.6, 0.6, 0.63, 1],
        metallicFactor: 0,
        roughnessFactor: 0.85,
      },
    },
  ],
  buffers: [{ byteLength }],
  bufferViews,
  accessors,
}
let jsonBuf = Buffer.from(JSON.stringify(json))
jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)])
const bin = Buffer.concat(buffers)
const header = Buffer.alloc(12)
header.write('glTF', 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8)
const chunk = (len, type) => {
  const b = Buffer.alloc(8)
  b.writeUInt32LE(len, 0)
  b.writeUInt32LE(type, 4)
  return b
}
const glb = Buffer.concat([
  header,
  chunk(jsonBuf.length, 0x4e4f534a),
  jsonBuf,
  chunk(bin.length, 0x004e4942),
  bin,
])

asset.sha256 = createHash('sha256').update(glb).digest('hex')
asset.bytes = glb.length
await writeFile(`public/media/${OUTPUT}`, glb)
await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(
  `Wrote ${OUTPUT}: ${parts.length} parts, ${meshes.reduce((s, m) => s + m.count / 3, 0)} triangles, ${glb.length} bytes`,
)
