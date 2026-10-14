import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { relative } from 'node:path'
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const capture = JSON.parse(await readFile('.capture/sleep-stages/capture.json', 'utf8'))
async function add(output, source, repository, commit, method) {
  const path = `public/media/${output}`
  const bytes = await readFile(path)
  let width, height, duration
  if (output.endsWith('.png')) ({ width, height } = await sharp(bytes).metadata())
  else {
    const probe = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
        { encoding: 'utf8' },
      ),
    )
    const video = probe.streams.find((s) => s.codec_type === 'video')
    width = video.width
    height = video.height
    duration = Number(probe.format.duration)
  }
  const entry = {
    repository,
    commit,
    source,
    output,
    method,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    width,
    height,
    ...(duration ? { duration } : {}),
  }
  manifest.assets = manifest.assets.filter((a) => a.output !== output)
  manifest.assets.push(entry)
}
for (const record of capture.records) {
  const output = `${record.name}.mp4`
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      String(record.start),
      '-i',
      record.raw,
      '-t',
      String(record.duration),
      '-an',
      '-vf',
      'fps=25',
      '-c:v',
      'libx264',
      '-crf',
      '25',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `public/media/${output}`,
    ],
    { stdio: 'ignore' },
  )
  await copyFile(`.capture/sleep-stages/${record.name}.png`, `public/media/${record.name}.png`)
  const method =
    'scripts/capture-sleep-stages.mjs + scripts/promote-sleep-stages.mjs; unmodified loopback production demo, synthetic data, API/external requests blocked'
  await add(output, record.route, 'sleepypod-core', capture.sourceCommit, method)
  await add(`${record.name}.png`, record.route, 'sleepypod-core', capture.sourceCommit, method)
}
await writeFile(
  'capture/sleep-stages.json',
  JSON.stringify(
    {
      ...capture,
      records: capture.records.map((record) => ({
        ...record,
        raw: relative(process.cwd(), record.raw),
      })),
    },
    null,
    2,
  ) + '\n',
)
await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
