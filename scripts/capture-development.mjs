// Real Core demo UI, pinned source, synthetic data, and loopback-only traffic.
import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const commit = 'f905a776a8eca61cf0e855726b06e7774f241c52'
const origin = new URL(process.env.CORE_CAPTURE_URL || 'http://127.0.0.1:3214')
if (!['127.0.0.1', 'localhost'].includes(origin.hostname)) throw Error('Loopback only')
const directory = '.capture/development'
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const records = []
async function record(name, route, run) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    timezoneId: 'America/Los_Angeles',
    recordVideo: { dir: directory, size: { width: 1440, height: 1000 } },
  })
  await context.route('**/*', (r) => {
    const u = new URL(r.request().url())
    return u.origin === origin.origin && !u.pathname.startsWith('/api/') ? r.continue() : r.abort()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => {
    if (!e.message.startsWith('Minified React error #418')) errors.push(e.message)
  })
  await page.clock.install({ time: new Date('2026-10-14T16:30:00Z') })
  const before = Date.now()
  const response = await page.goto(new URL(route, origin).href)
  expect(response.status()).toBe(200)
  await page.waitForTimeout(3500)
  const start = (Date.now() - before) / 1000
  await page.screenshot({ path: `${directory}/${name}.png` })
  await run(page)
  await page.waitForTimeout(2500)
  const duration = (Date.now() - before) / 1000 - start
  const video = page.video()
  await context.close()
  expect(errors).toEqual([])
  records.push({ name, route, raw: await video.path(), start, duration })
  console.log('Captured', name)
}
const pause = (p) => p.waitForTimeout(1800)
try {
  await record('core-vitals-preview', '/en/sleep?view=biometrics', async (p) => {
    await expect(
      p.getByRole('button', { name: 'Upload Apple Watch data', exact: true }),
    ).toBeVisible()
    await pause(p)
    await p.getByRole('tab', { name: 'Night', exact: true }).click()
    await pause(p)
    await p.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await pause(p)
    await p.getByRole('button', { name: 'Reset zoom', exact: true }).click()
    await p.getByRole('button', { name: 'Upload Apple Watch data', exact: true }).click()
    await expect(p.getByRole('dialog')).toContainText('Import for')
    await p.getByRole('combobox', { name: 'Import period', exact: true }).selectOption('7')
    await pause(p)
  })
  await record(
    'core-calibration-preview',
    '/en/settings?section=biometric-calibration',
    async (p) => {
      const view = async (name) => {
        await p
          .getByRole('navigation', { name: 'Calibration views' })
          .getByRole('button', { name, exact: true })
          .click()
        await pause(p)
      }
      await expect(p.getByText('SIMULATED DEMO: no live processor.', { exact: true })).toBeVisible()
      await pause(p)
      await view('References')
      await p.getByLabel('Sleeper identifier', { exact: true }).fill('example-sleeper')
      await p.getByLabel('Reference source', { exact: true }).fill('synthetic-reference')
      await p
        .getByLabel('Reference records', { exact: true })
        .fill(
          'recordKey,metric,value,unit,timestamp,start,end\nhr-1,heart_rate,62,bpm,2026-10-13T23:00:00Z,,\nstage-1,sleep_stages,light,stage,,2026-10-13T23:00:00Z,2026-10-13T23:10:00Z',
        )
      await p.getByRole('button', { name: 'Preview import', exact: true }).click()
      await expect(p.getByRole('region', { name: 'Import preview' })).toContainText(
        'Accepted: 2; rejected: 0',
      )
      await pause(p)
      await p.getByRole('button', { name: 'Save previewed import', exact: true }).click()
      await expect(
        p.getByRole('status').filter({ hasText: 'Reference import saved:' }),
      ).toBeVisible()
      await view('Profiles')
      await p.getByLabel('heart_rate.trackingToleranceBpm', { exact: true }).fill('17')
      await pause(p)
      await p.getByRole('button', { name: 'Review candidate', exact: true }).click()
      await pause(p)
      await p.getByRole('button', { name: 'Save candidate without applying', exact: true }).click()
      await expect(p.getByRole('status').filter({ hasText: 'Candidate saved:' })).toBeVisible()
      await pause(p)
      await view('Overview')
      await expect(p.getByText('System defaults', { exact: true })).toBeVisible()
    },
  )
} finally {
  await browser.close()
  await writeFile(
    `${directory}/capture.json`,
    JSON.stringify(
      {
        sourceCommit: commit,
        method:
          'Unmodified Core production demo; local in-browser simulation; API and external network requests blocked',
        records,
      },
      null,
      2,
    ) + '\n',
  )
}
