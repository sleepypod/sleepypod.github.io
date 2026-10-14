// Real Core demo UI, pinned source, synthetic data, and loopback-only traffic.
import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const commit = 'f905a776a8eca61cf0e855726b06e7774f241c52'
const origin = new URL(process.env.CORE_CAPTURE_URL || 'http://127.0.0.1:3214')
if (!['127.0.0.1', 'localhost'].includes(origin.hostname)) throw Error('Loopback only')
const directory = '.capture/sleep-stages'
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
  await record('core-sleep-stage-rules', '/en/settings?section=sleep-stages', async (p) => {
    await expect(p.getByText('SIMULATED DEMO: no live processor.', { exact: true })).toBeVisible()
    await pause(p)
    const wake = p.getByRole('slider', { name: 'Wake sensitivity', exact: true })
    await wake.focus()
    for (let i = 0; i < 10; i++) await wake.press('ArrowLeft')
    await expect(wake).toHaveValue('150')
    await pause(p)
    await p.getByRole('tab', { name: '7 nights', exact: true }).click()
    await pause(p)
    await p.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(p.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
    await pause(p)
    await p.getByText('Changes', { exact: true }).scrollIntoViewIfNeeded()
    await pause(p)
  })
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
