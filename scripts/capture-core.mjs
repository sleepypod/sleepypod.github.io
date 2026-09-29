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
    viewport: { width: 1440, height: 820 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  })
  // No remote destinations: keep captures on this isolated instance.
  // Hardware status is a transport fixture; every other read uses the disposable DB.
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
  const page = await context.newPage()
  const response = await page.goto(new URL('/en', url).href, { waitUntil: 'domcontentloaded' })
  if (!response?.ok()) throw new Error('Core failed to load')
  await page.getByRole('main').waitFor()
  await page
    .getByText('No sleep recorded yet', { exact: false })
    .first()
    .waitFor({ timeout: 60000 })
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: '.capture/core-temperature.png' })
  await writeFile(
    '.capture/core-capture.json',
    JSON.stringify(
      {
        url: url.origin,
        path: '/en',
        viewport: { width: 1440, height: 820 },
        capturedAt: new Date().toISOString(),
        method:
          'Playwright screenshot of isolated Core with disposable databases and synthetic device-status transport fixture',
      },
      null,
      2,
    ) + '\n',
  )
  console.log('Review .capture/core-temperature.png before promotion.')
} finally {
  await browser.close()
}
