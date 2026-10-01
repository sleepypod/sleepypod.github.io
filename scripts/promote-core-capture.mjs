// Run only after reviewing every capture. Preserves all other asset provenance.
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
const meta = JSON.parse(await readFile('.capture/core-capture.json', 'utf8'))
const video = JSON.parse(await readFile('.capture/core-health-video.json', 'utf8'))
if (!/^[a-f0-9]{40}$/.test(meta.sourceCommit)) throw new Error('Pinned Core commit required')
// Breathing room around the map so player controls never cover the bottom
// row of nodes. The margin is a solid fill of the map's own corner colour;
// no UI pixels are redrawn.
const padding = 96
const posterBytes = await readFile('.capture/core-health-map.png')
const { data: corner } = await sharp(posterBytes)
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const fill = { r: corner[0], g: corner[1], b: corner[2] }
const hex = '#' + [fill.r, fill.g, fill.b].map((c) => c.toString(16).padStart(2, '0')).join('')
await sharp(posterBytes)
  .extend({ top: padding, bottom: padding, left: padding, right: padding, background: fill })
  .png()
  .toFile('.capture/core-health-map-padded.png')
const poster = await sharp('.capture/core-health-map-padded.png').metadata()
const width = Math.ceil(poster.width / 2) * 2
const height = Math.ceil(poster.height / 2) * 2
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    '25',
    '-i',
    '.capture/health-frames/%04d.png',
    '-an',
    '-vf',
    `pad=iw+${2 * padding}:ih+${2 * padding}:${padding}:${padding}:${hex},pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:${hex}`,
    '-c:v',
    'libx264',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '.capture/core-health-flow.mp4',
  ],
  { stdio: 'ignore' },
)
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const controls = JSON.parse(await readFile('.capture/core-controls.json', 'utf8'))
const captures = [
  ...meta.captures,
  ...controls.controls,
  { path: '/en/system?tab=health', output: 'core-health-map.png' },
  { path: '/en/system?tab=health', output: 'core-health-flow.mp4' },
]
for (const capture of captures) {
  const source =
    capture.output === 'core-health-map.png' ? 'core-health-map-padded.png' : capture.output
  const bytes = await readFile('.capture/' + source)
  const image = capture.output.endsWith('.png') ? await sharp(bytes).metadata() : null
  const dimensions = image
    ? { width: image.width, height: image.height }
    : { width: Math.floor(width / 2) * 2, height: Math.floor(height / 2) * 2, durationSeconds: 7.2 }
  const asset = {
    repository: 'sleepypod-core',
    commit: meta.sourceCommit,
    source: capture.path,
    output: capture.output,
    method:
      'Playwright real core UI; isolated loopback; synthetic fixtures; 2x still captures; native SVG animation sampled at 25 fps for silent H.264 video' +
      (capture.output.startsWith('core-health-') && capture.output !== 'core-health.png'
        ? `; map and video padded ${padding}px with the card colour`
        : ''),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    ...dimensions,
  }
  const index = manifest.assets.findIndex((a) => a.output === capture.output)
  if (index < 0) manifest.assets.push(asset)
  else manifest.assets[index] = asset
  await writeFile('public/media/' + capture.output, bytes)
}
await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
for (const file of ['core-capture.json', 'core-controls.json', 'core-health-video.json'])
  await copyFile('.capture/' + file, 'capture/' + file)
await writeFile(
  'capture/core-workflows.json',
  JSON.stringify(
    {
      ...meta,
      captures: meta.captures.filter(
        (c) =>
          ![
            'core-temperature.png',
            'core-schedule.png',
            'core-autopilot.png',
            'core-appearance.png',
          ].includes(c.output),
      ),
    },
    null,
    2,
  ) + '\n',
)
