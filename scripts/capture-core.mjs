import { demoData, capturedTime } from '../capture/core-demo.mjs'
import superjson from 'superjson'
import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
const url = new URL(process.env.CORE_CAPTURE_URL || 'http://127.0.0.1:3210')
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  throw new Error('Capture requires an isolated loopback Core instance')
await mkdir('.capture', { recursive: true })
const browser = await chromium.launch()
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: 'reduce',
  })
  // No remote destinations: keep captures on this isolated instance.
  // Hardware, schedules, and sleep use synthetic fixtures; other reads use the disposable DB.
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url())
    return u.origin === url.origin ? route.continue() : route.abort()
  })
  const status = JSON.parse(await readFile('capture/core-status.json', 'utf8'))
  await context.routeWebSocket(
    (u) => u.port === '3001',
    (ws) => ws.close(),
  )
  await context.route('**/api/trpc/**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const names = requestUrl.pathname.split('/api/trpc/')[1].split(',')
    if (route.request().method() !== 'GET') return route.abort()
    const input = JSON.parse(requestUrl.searchParams.get('input') || '{}')
    const batch = requestUrl.searchParams.has('batch')
    const results = await Promise.all(
      names.map(async (name, i) => {
        const demo = demoData(
          name,
          superjson.deserialize((batch ? input[i] : input) || { json: null }),
        )
        if (demo !== undefined) return { result: { data: superjson.serialize(demo) } }
        if (name === 'device.getStatus') return { result: { data: { json: status } } }
        const single = new URL('/api/trpc/' + name, url)
        single.searchParams.set('input', JSON.stringify(batch ? input[i] : input))
        const headers = { ...route.request().headers() }
        delete headers['trpc-accept']
        const response = await route.fetch({ url: single.href, timeout: 15000, headers })
        return response.json()
      }),
    )
    const resolved = Object.fromEntries(
      results.map((r, i) => {
        if (r.error) throw new Error(JSON.stringify(r.error))
        return [i, [[{ result: { data: superjson.deserialize(r.result.data) } }]]]
      }),
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(superjson.serialize(resolved)) + '\n',
    })
  })
  await context.addInitScript(() => {
    localStorage.setItem('sleepypod-pref-control', 'stepper')
    localStorage.setItem('sleepypod-pref-temp-display', 'degrees')
  })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(capturedTime))
  const response = await page.goto(new URL('/en', url).href, { waitUntil: 'domcontentloaded' })
  if (!response?.ok()) throw new Error('Core failed to load')
  await page.getByRole('main').waitFor()
  await page.getByText('HR bpm', { exact: true }).first().waitFor({ timeout: 60000 })
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('tab', { name: /Now$/ }).first().waitFor()
  await page.screenshot({ path: '.capture/core-temperature.png' })
  const captures = [{ path: '/en', output: 'core-temperature.png' }]
  for (const [path, output, heading] of [
    ['/en/schedule', 'core-schedule.png', 'Schedule'],
    ['/en/settings?section=appearance', 'core-appearance.png', 'Appearance'],
    ['/en/autopilot', 'core-autopilot.png', 'Automations'],
  ]) {
    await page.goto(new URL(path, url).href, { waitUntil: 'networkidle' })
    await page
      .getByRole('heading', { name: new RegExp(heading) })
      .filter({ visible: true })
      .first()
      .waitFor()
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: '.capture/' + output })
    captures.push({ path, output })
  }
  await writeFile(
    '.capture/core-capture.json',
    JSON.stringify(
      {
        url: url.origin,
        captures,
        preferences: { control: 'stepper', temperatureDisplay: 'degrees' },
        viewport: { width: 1440, height: 1000 },
        capturedAt: new Date().toISOString(),
        method:
          'Playwright screenshot of isolated Core with disposable databases and synthetic device-status, schedule, and sleep transport fixtures',
      },
      null,
      2,
    ) + '\n',
  )
  console.log('Review .capture/core-temperature.png before promotion.')
} finally {
  await browser.close()
}
