import { chromium, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const origin = new URL(process.env.CORE_CAPTURE_URL || 'http://localhost:3218')
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))
  throw new Error('Capture requires an isolated loopback Core demo')
const commit = process.env.CORE_SOURCE_COMMIT
if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('Set the full Core source commit')
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  })
  // This capture uses Core's built-in NEXT_PUBLIC_DEMO handlers, never a pod API.
  await page.route('**/api/**', (route) => route.abort())
  await page.goto(new URL('/en/system?tab=storage', origin).href, { timeout: 120000 })
  await expect(page.getByRole('combobox', { name: 'App logging mode' })).toHaveValue('quiet', {
    timeout: 30000,
  })
  await expect(page.getByRole('switch', { name: 'Record raw waveform archive' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.evaluate(() => document.fonts.ready)
  for (const [testId, output] of [
    ['flash-card', 'core-storage-endurance.png'],
    ['data-recording-card', 'core-storage-recording.png'],
  ]) {
    await page.getByTestId(testId).screenshot({ path: `public/media/${output}` })
    const data = await readFile(`public/media/${output}`)
    const { width, height } = await sharp(data).metadata()
    const asset = {
      repository: 'sleepypod-core',
      commit,
      source: '/en/system?tab=storage',
      output,
      method:
        'scripts/capture-storage-recording.mjs; unmodified Core UI with NEXT_PUBLIC_DEMO=1; isolated loopback, in-memory databases, API network requests blocked; dark mode; 2x element capture',
      sha256: createHash('sha256').update(data).digest('hex'),
      bytes: data.length,
      width,
      height,
    }
    const existing = manifest.assets.findIndex((a) => a.output === output)
    if (existing < 0) manifest.assets.push(asset)
    else manifest.assets[existing] = asset
  }
  await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
} finally {
  await browser.close()
}
