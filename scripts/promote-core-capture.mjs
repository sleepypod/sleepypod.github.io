// Run only after reviewing every capture. Preserves all other asset provenance.
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
const meta = JSON.parse(await readFile('.capture/core-capture.json', 'utf8'))
const video = JSON.parse(await readFile('.capture/core-health-video.json', 'utf8'))
if (!/^[a-f0-9]{40}$/.test(meta.sourceCommit)) throw new Error('Pinned Core commit required')
const poster = await sharp(await readFile('.capture/core-health-map.png')).metadata()
const width = Math.ceil(poster.width / 2) * 2
const height = Math.ceil(poster.height / 2) * 2
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    '24',
    '-i',
    '.capture/health-frames/%04d.png',
    '-an',
    '-vf',
    'pad=ceil(iw/2)*2:ceil(ih/2)*2',
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
  const bytes = await readFile('.capture/' + capture.output)
  const image = capture.output.endsWith('.png') ? await sharp(bytes).metadata() : null
  const dimensions = image
    ? { width: image.width, height: image.height }
    : { width: Math.floor(width / 2) * 2, height: Math.floor(height / 2) * 2, durationSeconds: 8 }
  const asset = {
    repository: 'sleepypod-core',
    commit: meta.sourceCommit,
    source: capture.path,
    output: capture.output,
    method:
      'Playwright real core UI; isolated loopback; synthetic fixtures; 2x still captures; native SVG animation sampled at 24 fps for silent H.264 video',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    ...dimensions,
  }
  const index = manifest.assets.findIndex((a) => a.output === capture.output)
  if (index < 0) manifest.assets.push(asset)
  else manifest.assets[index] = asset
  await copyFile('.capture/' + capture.output, 'public/media/' + capture.output)
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
