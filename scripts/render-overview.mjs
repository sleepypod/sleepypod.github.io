// Compose original editorial typography around unchanged product recordings.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
const dir = '.capture/interfaces'
const meta = JSON.parse(await readFile(dir + '/capture.json', 'utf8'))
if (meta.errors.length) throw Error('Review browser errors before promotion')
const chapters = [
  {
    scene: 'stage',
    kicker: '01 / TEMPERATURE',
    title: ['See your bed', 'in a new light.'],
    body: [
      'Explore six surface readings.',
      'Preview tonight’s schedule.',
      'Return to live control.',
    ],
  },
  {
    scene: 'base',
    kicker: '02 / BASE · EXPERIMENTAL',
    title: ['Find your', 'wind-down.'],
    body: [
      'Preview a position, then move.',
      'Both sides move together.',
      'Shown with simulated hardware.',
    ],
  },
  {
    scene: 'schedule',
    kicker: '03 / YOUR NIGHT',
    title: ['A curve that', 'fits your night.'],
    body: ['Set your overnight targets.', 'Turn off at the end—or keep', 'the final temperature.'],
  },
  {
    scene: 'sleep',
    kicker: '04 / YOUR MORNING',
    title: ['Know your', 'night.'],
    body: [
      'Explore nights and vitals.',
      'Follow trends over time.',
      'Example data, not a diagnosis.',
    ],
  },
  {
    scene: 'health',
    kicker: '05 / UNDER THE COVERS',
    title: ['Trace every', 'signal.'],
    body: [
      'Follow the sensor data path.',
      'Find a simulated service stall.',
      'Keep control on your network.',
    ],
  },
]
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
function background(c, ending = false) {
  return `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="glow"><stop stop-color="#39285d"/><stop offset="1" stop-color="#101018"/></radialGradient><linearGradient id="line"><stop stop-color="#b6a0ff"/><stop offset="1" stop-color="#68cfe0"/></linearGradient></defs><rect width="1920" height="1080" fill="#101018"/><ellipse cx="100" cy="30" rx="760" ry="650" fill="url(#glow)"/><path d="M60 140H390" stroke="url(#line)" stroke-width="2"/><text x="60" y="93" fill="#f5f1ff" font-size="31" font-family="Helvetica">sleepypod</text><text x="60" y="212" fill="#c1afff" font-size="15" letter-spacing="2" font-family="Helvetica">${esc(c.kicker)}</text>${c.title.map((t, i) => `<text x="60" y="${320 + i * 65}" fill="#faf7ff" font-size="48" font-weight="600" font-family="Helvetica">${esc(t)}</text>`).join('')}${c.body.map((t, i) => `<text x="60" y="${520 + i * 36}" fill="#b8b6c9" font-size="22" font-family="Helvetica">${esc(t)}</text>`).join('')}<text x="60" y="970" fill="#b8b6c9" font-family="Helvetica" font-size="18">${ending ? 'sleepypod.github.io' : 'Core v3.2.1 · real interface'}</text><text x="60" y="1002" fill="#77748d" font-family="Helvetica" font-size="17">Simulated data · silent tour</text><rect x="457" y="37" width="1446" height="1006" rx="3" fill="#393143"/></svg>`
}
const ff = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  })
const enc = [
  '-an',
  '-r',
  '25',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '28',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
]
await mkdir(dir + '/render', { recursive: true })
let segments = [],
  timeline = [],
  at = 0
async function still(name, c, seconds, image, ending = false) {
  const bg = await sharp(Buffer.from(background(c, ending)))
    .png()
    .toBuffer()
  const screen = await sharp(dir + '/' + image)
    .resize(1440, 1000, { fit: 'contain', background: '#0b0b0c' })
    .png()
    .toBuffer()
  const file = dir + '/render/' + name + '.png'
  await sharp(bg)
    .composite([{ input: screen, left: 460, top: 40 }])
    .png()
    .toFile(file)
  ff([
    '-loop',
    '1',
    '-i',
    file,
    '-t',
    String(seconds),
    '-vf',
    `fade=t=in:st=0:d=0.35,fade=t=out:st=${seconds - 0.35}:d=0.35`,
    ...enc,
    dir + '/render/' + name + '.mp4',
  ])
  segments.push(name)
  timeline.push({ chapter: name, start: at, duration: seconds })
  at += seconds
}
await still(
  'intro',
  {
    kicker: 'A TOUR OF WHAT’S NEW',
    title: ['Your bed.', 'Your rules.'],
    body: [
      'A new view of your night.',
      'Temperature. Schedules. Sleep.',
      'All in one local interface.',
    ],
  },
  3,
  'core-thermal-bed.png',
)
for (const c of chapters) {
  const clip = meta.clips.find((x) => x.scene === c.scene)
  if (!clip) throw Error('Missing scene ' + c.scene)
  if (
    c.scene === 'base' &&
    (clip.verifiedState !== 'At target' ||
      clip.verifiedFinalPosition?.head !== 40 ||
      clip.verifiedFinalPosition?.feet !== 0)
  )
    throw Error('Base recording must verify the simulator reached its target')
  const length = clip.duration
  const bg = dir + '/render/' + c.scene + '.png'
  await sharp(Buffer.from(background(c)))
    .png()
    .toFile(bg)
  ff([
    '-loop',
    '1',
    '-i',
    bg,
    '-ss',
    String(clip.start),
    '-i',
    clip.file,
    '-t',
    String(length),
    '-filter_complex',
    `[1:v]scale=1440:1000,fps=25,setpts=PTS-STARTPTS[s];[0:v][s]overlay=460:40:shortest=1,fade=t=in:st=0:d=0.25,fade=t=out:st=${length - 0.25}:d=0.25[v]`,
    '-map',
    '[v]',
    ...enc,
    dir + '/render/' + c.scene + '.mp4',
  ])
  segments.push(c.scene)
  const encodedLength = Number(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'csv=p=0',
        dir + '/render/' + c.scene + '.mp4',
      ],
      { encoding: 'utf8' },
    ),
  )
  timeline.push({ chapter: c.scene, start: at, duration: encodedLength })
  at = Math.round((at + encodedLength) * 1000) / 1000
  if (['stage', 'base'].includes(c.scene))
    ff([
      '-ss',
      String(clip.start),
      '-i',
      clip.file,
      '-t',
      String(clip.duration),
      ...enc,
      dir + '/core-' + c.scene + '-tour.mp4',
    ])
}
await still(
  'outro',
  {
    kicker: 'MAKE YOUR POD FEEL LIKE YOURS',
    title: ['Try it.', 'Make it yours.'],
    body: ['Explore the live demo.', 'Read the new interface guides.', 'sleepypod.github.io'],
  },
  4,
  'core-temperature.png',
  true,
)
await writeFile(
  dir + '/render/concat.txt',
  segments.map((s) => `file '${s}.mp4'`).join('\n') + '\n',
)
ff([
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  dir + '/render/concat.txt',
  '-c',
  'copy',
  '-movflags',
  '+faststart',
  dir + '/sleepypod-overview.mp4',
])
await sharp(dir + '/render/intro.png')
  .png()
  .toFile(dir + '/sleepypod-overview.png')
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const outputs = [
  ...meta.captures,
  ...[
    'core-stage-tour.mp4',
    'core-base-tour.mp4',
    'sleepypod-overview.mp4',
    'sleepypod-overview.png',
  ].map((output) => ({ output, path: 'Core demo tour' })),
]
for (const { output, path } of outputs) {
  const bytes = await readFile(dir + '/' + output)
  let dimensions
  if (output.endsWith('.png')) {
    const m = await sharp(bytes).metadata()
    dimensions = { width: m.width, height: m.height }
  } else {
    const p = JSON.parse(
      execFileSync(
        'ffprobe',
        [
          '-v',
          'quiet',
          '-print_format',
          'json',
          '-show_streams',
          '-show_format',
          dir + '/' + output,
        ],
        { encoding: 'utf8' },
      ),
    )
    const s = p.streams.find((x) => x.codec_type === 'video')
    dimensions = { width: s.width, height: s.height, durationSeconds: Number(p.format.duration) }
  }
  const asset = {
    repository: 'sleepypod-core',
    commit: meta.sourceCommit,
    source: path,
    output,
    method:
      'scripts/capture-interfaces.mjs + scripts/render-overview.mjs; ' +
      meta.method +
      (output.startsWith('sleepypod-overview')
        ? '; original chapter typography around unchanged UI recordings'
        : ''),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    ...dimensions,
  }
  const i = manifest.assets.findIndex((x) => x.output === output)
  if (i < 0) manifest.assets.push(asset)
  else manifest.assets[i] = asset
  await writeFile('public/media/' + output, bytes)
}
await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile(
  'capture/interfaces.json',
  JSON.stringify(
    { ...meta, clips: meta.clips.map(({ file, ...c }) => c), timeline, durationSeconds: at },
    null,
    2,
  ) + '\n',
)
console.log('Rendered and promoted', outputs.length, 'assets; overview', at, 'seconds')
