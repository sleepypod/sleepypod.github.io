// Capture the unmodified production Core demo. No physical Pod is contacted.
import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
const origin = new URL(process.env.CORE_CAPTURE_URL || 'http://127.0.0.1:3212')
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw Error('Loopback only')
const commit = process.env.CORE_SOURCE_COMMIT
if (!/^[a-f0-9]{40}$/.test(commit || '')) throw Error('Pin CORE_SOURCE_COMMIT')
await mkdir('.capture/interfaces', { recursive: true })
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const previous =
  process.env.CAPTURE_MODE === 'video'
    ? JSON.parse(await readFile('.capture/interfaces/capture.json', 'utf8'))
    : null
if (previous && previous.sourceCommit !== commit) throw Error('Still capture revision must match')
const captures = previous?.captures ?? [],
  clips = [],
  errors = [],
  warnings = []
async function session(video = false) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: video ? 1 : 2,
    colorScheme: 'dark',
    timezoneId: 'America/Los_Angeles',
    ...(video
      ? { recordVideo: { dir: '.capture/interfaces/raw', size: { width: 1440, height: 1000 } } }
      : {}),
  })
  await context.route('**/*', (r) => {
    const u = new URL(r.request().url())
    return u.origin === origin.origin && !u.pathname.startsWith('/api/') ? r.continue() : r.abort()
  })
  await context.addInitScript(() => {
    localStorage.setItem('sleepypod-pref-control', 'stepper')
    localStorage.setItem('sleepypod-pref-temp-display', 'degrees')
    localStorage.setItem('sleepypod.base.stageZones', 'always')
    localStorage.setItem('sleepypod.base.stageAutoReturn', 'false')
  })
  const started = Date.now()
  const page = await context.newPage()
  // Movies need a progressing clock: the Base simulator integrates elapsed Date.now().
  if (video) await page.clock.install({ time: new Date('2026-10-08T04:30:00Z') })
  else await page.clock.setFixedTime(new Date('2026-10-08T04:30:00Z'))
  page.on('pageerror', (e) => {
    if (e.message.startsWith('Minified React error #418')) warnings.push(e.message)
    else errors.push(e.message)
  })
  return { context, page, started }
}
async function goto(page, path) {
  const response = await page.goto(new URL(path, origin).href, { waitUntil: 'networkidle' })
  if (!response.ok()) throw Error('HTTP ' + response.status())
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2500)
}
async function shot(page, output, path) {
  await page.screenshot({ path: '.capture/interfaces/' + output })
  captures.push({ output, path })
  console.log('Captured', output)
}
try {
  if (!previous) {
    const { context, page } = await session()
    await goto(page, '/en')
    await shot(page, 'core-thermal-bed.png', '/en')
    await page.getByRole('button', { name: 'Thermal view', exact: true }).click()
    await shot(page, 'core-temperature.png', '/en')
    await page.getByRole('button', { name: 'Stage', exact: true }).click()
    await page.waitForTimeout(2000)
    await shot(page, 'core-stage.png', '/en')
    const lane = page.getByRole('slider', { name: "Preview tonight's schedule" })
    const box = await lane.boundingBox()
    await page.mouse.click(box.x + box.width * 0.82, box.y + box.height / 2)
    await page.waitForTimeout(1300)
    await shot(page, 'core-stage-preview.png', '/en')
    await page.getByRole('button', { name: 'Back to cards' }).click()
    await goto(page, '/en/base')
    await page.getByRole('button', { name: /relax/ }).click()
    await shot(page, 'core-base.png', '/en/base')
    for (const [path, output] of [
      ['/en/schedule', 'core-schedule.png'],
      ['/en/settings?section=sides', 'core-settings-sides.png'],
      ['/en/settings?section=device', 'core-settings-device.png'],
      ['/en/settings?section=appearance', 'core-appearance.png'],
      ['/en/sleep', 'core-sleep.png'],
      ['/en/system?tab=sensors', 'core-system-sensors.png'],
    ]) {
      await goto(page, path)
      await shot(page, output, path)
    }
    await goto(page, '/en/schedule')
    await page.getByRole('button', { name: 'Edit Mon, Tue, Wed, Thu, Sun', exact: true }).click()
    await page.getByLabel('After schedule ends').waitFor()
    await page.getByLabel('After schedule ends').selectOption('maintain')
    await page.waitForTimeout(500)
    await shot(page, 'core-schedule-curve-editor.png', '/en/schedule')
    await goto(page, '/en/schedule')
    await page.getByRole('button', { name: 'Edit Weekdays alarm', exact: true }).click()
    await page.waitForTimeout(500)
    await shot(page, 'core-schedule-alarm-editor.png', '/en/schedule')
    await context.close()
  }
  for (const scene of ['stage', 'base', 'schedule', 'sleep', 'health']) {
    const { context, page, started } = await session(true)
    const path = {
      stage: '/en',
      base: '/en/base',
      schedule: '/en/schedule',
      sleep: '/en/sleep',
      health: '/en/system?tab=health',
    }[scene]
    await goto(page, path)
    if (scene === 'stage') {
      await page.getByRole('button', { name: 'Stage', exact: true }).click()
      await page.waitForTimeout(2200)
    }
    if (scene === 'base') await page.getByRole('button', { name: /relax/ }).click()
    const start = (Date.now() - started) / 1000
    await page.waitForTimeout(1200)
    if (scene === 'stage') {
      const box = await page
        .getByRole('slider', { name: "Preview tonight's schedule" })
        .boundingBox()
      await page.mouse.move(box.x + box.width * 0.38, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.83, box.y + box.height / 2, { steps: 50 })
      await page.mouse.up()
      await page.waitForTimeout(2200)
      await page.getByTestId('stage-mode').click()
      await page.waitForTimeout(1500)
    } else if (scene === 'base') {
      await page.getByRole('button', { name: /^read/ }).click()
      await page.getByRole('button', { name: /Move both to/ }).click()
      await page.getByRole('button', { name: 'At target', exact: true }).waitFor({ timeout: 20000 })
      await page.waitForTimeout(1200)
      if (!(await page.locator('body').innerText()).includes('40° / 0°'))
        throw Error('Base did not reach its measured target')
      await page.screenshot({ path: '.capture/interfaces/base-motion-verified.png' })
    } else if (scene === 'schedule') {
      await page.getByRole('button', { name: 'Edit Mon, Tue, Wed, Thu, Sun', exact: true }).click()
      await page.waitForTimeout(1200)
      await page.getByLabel('After schedule ends').selectOption('maintain')
      await page.waitForTimeout(2300)
    } else {
      await page.waitForTimeout(4800)
    }
    if (scene === 'health')
      await writeFile(
        '.capture/interfaces/health-evidence.txt',
        await page.locator('body').innerText(),
      )
    const duration = (Date.now() - started) / 1000 - start
    const file = await page.video().path()
    await context.close()
    clips.push({
      scene,
      path,
      file,
      start,
      duration,
      ...(scene === 'base'
        ? { verifiedFinalPosition: { head: 40, feet: 0 }, verifiedState: 'At target' }
        : {}),
    })
    await writeFile('.capture/interfaces/clips.json', JSON.stringify(clips, null, 2))
    console.log('Recorded', scene, duration)
  }
} finally {
  await browser.close()
  await writeFile(
    '.capture/interfaces/capture.json',
    JSON.stringify(
      {
        sourceCommit: commit,
        capturedTime: '2026-10-08T04:30:00Z',
        method:
          'Unmodified Core production build with NEXT_PUBLIC_DEMO=1; built-in in-browser simulation; loopback only; API network requests blocked',
        captures,
        clips,
        errors,
        warnings,
      },
      null,
      2,
    ) + '\n',
  )
}
if (errors.length) throw Error(errors.join('\n'))
