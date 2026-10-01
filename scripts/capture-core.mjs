import { demoData, capturedTime } from '../capture/core-demo.mjs'
import superjson from 'superjson'
import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
const url = new URL(process.env.CORE_CAPTURE_URL || 'http://127.0.0.1:3210')
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  throw new Error('Capture requires an isolated loopback Core instance')
await mkdir('.capture', { recursive: true })
const browser = await chromium.launch()
let clockStarted = Date.now()
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: 'no-preference',
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
    (ws) => {
      // Synthetic live frames never connect to a real socket or device.
      const send = () => {
        const ts = (+new Date(capturedTime) + Date.now() - clockStarted) / 1000
        for (const frame of [
          {
            type: 'piezo-dual',
            ts,
            freq: 500,
            left1: [0, 12, 28, 10, -8, 0],
            right1: [0, 10, 23, 8, -6, 0],
          },
          { type: 'capSense2', ts, left: [1.1, 1.2, 1.1], right: [1.2, 1.1, 1.2] },
          {
            type: 'bedTemp2',
            ts,
            ambientTemp: 23.9,
            mcuTemp: 30,
            humidity: 45,
            leftOuterTemp: 23.3,
            leftCenterTemp: 23.3,
            leftInnerTemp: 23.3,
            rightOuterTemp: 22.2,
            rightCenterTemp: 22.2,
            rightInnerTemp: 22.2,
          },
        ])
          ws.send(JSON.stringify(frame))
      }
      const timer = setInterval(send, 1000)
      ws.onClose(() => clearInterval(timer))
      ws.onMessage((message) => {
        const request = JSON.parse(String(message))
        if (request.type === 'subscribe')
          ws.send(JSON.stringify({ type: 'subscribed', sensors: request.sensors || [] }))
      })
    },
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
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
    if (!error.message.startsWith('Hydration failed')) console.error(error.message)
  })
  await page.clock.install({ time: new Date(capturedTime) })
  clockStarted = Date.now()
  const response = await page.goto(new URL('/en', url).href, { waitUntil: 'domcontentloaded' })
  if (!response?.ok()) throw new Error('Core failed to load')
  await page.getByRole('main').waitFor()
  await page.getByText('HR bpm', { exact: true }).first().waitFor({ timeout: 60000 })
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('tab', { name: /Now$/ }).first().waitFor()
  await page.screenshot({ path: '.capture/core-temperature.png' })
  const controls = []
  for (const control of ['dial', 'slider', 'stepper']) {
    await page.evaluate((value) => {
      localStorage.setItem('sleepypod-pref-control', value)
      window.dispatchEvent(new Event('sleepypod-prefs-change'))
    }, control)
    const card = page.getByRole('group', { name: 'Left (left)', exact: true })
    if (control === 'stepper') await card.getByRole('tab', { name: /Now$/ }).waitFor()
    else await card.getByRole('slider').waitFor()
    await card.screenshot({ path: `.capture/core-control-${control}.png`, animations: 'disabled' })
    controls.push({
      control,
      path: '/en',
      output: `core-control-${control}.png`,
      element: 'Left (left)',
    })
  }
  await writeFile(
    '.capture/core-controls.json',
    JSON.stringify(
      {
        sourceCommit: process.env.CORE_SOURCE_COMMIT || null,
        capturedAt: new Date().toISOString(),
        controls,
        method:
          'Unmodified real core UI; element screenshots of the left side card; browser appearance preference switched between dial, slider, and stepper; synthetic fixtures',
      },
      null,
      2,
    ) + '\n',
  )
  const captures = [{ path: '/en', output: 'core-temperature.png' }]
  for (const [path, output, heading] of [
    ['/en/schedule', 'core-schedule.png', 'Schedule'],
    ['/en/settings?section=appearance', 'core-appearance.png', 'Appearance'],
    ['/en/autopilot', 'core-autopilot.png', 'Automations'],
    ['/en/system', 'core-system.png', 'Dashboard'],
    ['/en/system?tab=health', 'core-health.png', 'Health'],
    ['/en/system?tab=scheduler', 'core-scheduler.png', 'Scheduler'],
    ['/en/sleep', 'core-sleep.png', 'Nights'],
    ['/en/sleep?view=biometrics', 'core-biometrics.png', 'Biometrics'],
    ['/en/settings?section=gestures', 'core-gestures.png', 'Gestures'],
    ['/en/settings?section=backup', 'core-backup.png', 'Backup'],
  ]) {
    await page.goto(new URL(path, url).href, { waitUntil: 'networkidle' })
    await page
      .getByRole('heading', { name: new RegExp(heading) })
      .filter({ visible: true })
      .first()
      .waitFor()
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
    await page.evaluate(() => document.fonts.ready)
    if (output === 'core-sleep.png')
      await page.getByText('No heart-rate data for this night').waitFor({ state: 'hidden' })
    if (output === 'core-health.png') await page.getByText('Data path', { exact: true }).waitFor()
    if (path.startsWith('/en/system')) await page.waitForTimeout(6500)
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
        deviceScaleFactor: 2,
        sourceCommit: process.env.CORE_SOURCE_COMMIT,
        capturedAt: new Date().toISOString(),
        method:
          'Playwright screenshot of isolated Core with disposable databases and synthetic device-status, schedule, and sleep transport fixtures',
      },
      null,
      2,
    ) + '\n',
  )
  // Next dev can recover a streamed metadata hydration mismatch; keep it in
  // capture provenance and fail on every other browser exception.
  await writeFile('.capture/browser-warnings.json', JSON.stringify(errors, null, 2) + '\n')
  const failures = errors.filter(
    (error) => !error.startsWith('Hydration failed because the server rendered HTML'),
  )
  if (failures.length) throw new Error(failures.join('\n'))
  const videoPage = await context.newPage()
  await videoPage.clock.install({ time: new Date(capturedTime) })
  clockStarted = Date.now()
  await videoPage.goto(new URL('/en/system?tab=health', url).href, { waitUntil: 'networkidle' })
  await videoPage.getByText('Data path', { exact: true }).waitFor()
  await videoPage.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  const diagram = videoPage.getByTestId('data-path-map')
  await diagram.waitFor()
  await videoPage.locator('animateMotion').first().waitFor({ state: 'attached' })
  await diagram.screenshot({ path: '.capture/core-health-map.png' })
  const bounds = await diagram.boundingBox()
  if (!bounds) throw new Error('No animated Health map')
  await mkdir('.capture/health-frames', { recursive: true })
  // Sample the unmodified SVG's native animation clock; each frame is an
  // actual 2x element screenshot, with no redraw or interpolation. The dots
  // move on a 2.4 s cycle, so 180 frames at 25 fps is exactly three cycles
  // and the clip loops without a visible cut.
  await diagram.evaluate((svg) => svg.pauseAnimations())
  for (let frame = 0; frame < 180; frame++) {
    await diagram.evaluate((svg, time) => svg.setCurrentTime(time), frame / 25)
    await diagram.screenshot({
      path: `.capture/health-frames/${String(frame).padStart(4, '0')}.png`,
    })
  }
  await videoPage.close()
  await writeFile(
    '.capture/core-health-video.json',
    JSON.stringify(
      {
        sourceCommit: process.env.CORE_SOURCE_COMMIT,
        bounds,
        deviceScaleFactor: 2,
        framesPerSecond: 25,
        frameCount: 180,
        duration: 7.2,
        capturedTime,
        method:
          'Playwright 2x screenshots of the unmodified native SVG animation sampled at 25 fps for 7.2 seconds (three 2.4 s dot cycles, seamless loop); synthetic health fixtures; silent H.264 encoding',
      },
      null,
      2,
    ) + '\n',
  )
  await context.close()
  console.log('Review all .capture/core-*.png and the Health video before promotion.')
} finally {
  await browser.close()
}
