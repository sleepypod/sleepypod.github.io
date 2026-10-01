import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import path from 'node:path'
function routes(dir = 'content', prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? routes(path.join(dir, e.name), prefix + '/' + e.name)
      : e.name.endsWith('.mdx')
        ? [prefix + (e.name === 'index.mdx' ? '' : '/' + e.name.replace('.mdx', '')) + '/']
        : [],
  )
}
const pages = ['/', ...routes()]
for (const route of pages)
  test(`renders ${route}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    const images = page.locator('img').filter({ visible: true })
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded()
      await expect(image).toHaveJSProperty('complete', true)
      expect(await image.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0)
    }
    expect(errors).toEqual([])
  })
test('all internal links and fragments resolve', async ({ page, request }) => {
  test.setTimeout(120000)
  const links = new Set<string>()
  for (const route of pages) {
    await page.goto(route)
    for (const h of await page
      .locator('a[href]')
      .evaluateAll((es) => es.map((e) => (e as HTMLAnchorElement).getAttribute('href')!))) {
      if (h.startsWith('/') && !h.startsWith('//')) links.add(h)
      else if (h.startsWith('#')) links.add(route + h)
    }
  }
  for (const href of links) {
    const [p, fragment] = href.split('#')
    const response = await request.get(p)
    expect(response.status(), href).toBe(200)
    if (fragment) {
      await page.goto(href)
      expect(
        await page.evaluate((id) => !!document.getElementById(decodeURIComponent(id)), fragment),
        href,
      ).toBe(true)
    }
  }
})
test('homepage navigation and keyboard access', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByText('Skip to content')).toBeFocused()
  await page.getByRole('link', { name: 'Get started', exact: false }).click()
  await expect(page.locator('h1')).toHaveText('Find your setup')
})
test('search finds an indexed product guide', async ({ page }) => {
  await page.goto('/getting-started/')
  if (await page.getByRole('button', { name: 'Menu', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const input = page.getByRole('combobox').filter({ visible: true })
  await input.fill('HomeKit')
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15000 })
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/core\/integrations/)
})
test('videos decode and play to the end', async ({ page }) => {
  for (const route of ['/dial/', '/dial/controls/']) {
    await page.goto(route)
    for (const video of await page.locator('video').all()) {
      await video.scrollIntoViewIfNeeded()
      await video.evaluate(async (element: HTMLVideoElement) => {
        element.muted = true
        element.playbackRate = 8
        await element.play()
      })
      await expect
        .poll(() => video.evaluate((element: HTMLVideoElement) => element.ended), {
          timeout: 15000,
        })
        .toBe(true)
      expect(await video.evaluate((element: HTMLVideoElement) => element.videoWidth)).toBe(480)
      expect(await video.evaluate((element: HTMLVideoElement) => element.error)).toBeNull()
    }
  }
})
test('docs sidebar navigation works', async ({ page }) => {
  await page.goto('/getting-started/')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('link', { name: 'Install and update', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL(/core\/installation/)
  await expect(page.locator('h1')).toHaveText('Install and update Core')
})
test('custom 404 export exists', async ({ request }) => {
  const response = await request.get('/this-page-does-not-exist/')
  expect(response.status()).toBe(404)
})
test('Core screenshot enlarges and closes', async ({ page }) => {
  await page.goto('/core/')
  const image = page.getByRole('img', {
    name: 'Core temperature controls with separate left and right sides',
  })
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveJSProperty('complete', true)
  // Nextra adds this control only after the image and zoom handler are ready.
  await expect(
    page.getByRole('button', {
      name: 'Expand image: Core temperature controls with separate left and right sides',
      exact: true,
    }),
  ).toBeAttached()
  await image.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('img')).toHaveJSProperty('naturalWidth', 2880)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('docs theme preference persists', async ({ page }) => {
  await page.goto('/getting-started/')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page.getByTitle('Change theme').filter({ visible: true }).first().click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/light/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/light/)
})

for (const route of ['/', '/core/temperature/']) {
  test(`control styles switch by pointer and keyboard on ${route}`, async ({ page }) => {
    await page.goto(route)
    const showcase = page.getByRole('region', { name: 'Not one size fits all.' })
    const dial = showcase.getByRole('tab', { name: 'Dial', exact: true })
    const slider = showcase.getByRole('tab', { name: 'Slider', exact: true })
    const stepper = showcase.getByRole('tab', { name: 'Now · Night · Dawn', exact: true })
    await expect(dial).toHaveAttribute('aria-selected', 'true')
    for (const [tab, style] of [
      [slider, 'slider'],
      [stepper, 'stepper'],
      [dial, 'dial'],
    ] as const) {
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      const panel = showcase.getByRole('tabpanel')
      await expect(panel).toHaveCount(1)
      const image = panel.getByRole('img')
      await expect(image).toHaveAttribute('src', `/media/core-control-${style}.png`)
      await expect(image).toHaveJSProperty('naturalWidth', 820)
      await expect(image).toHaveAttribute('alt', /78°F/)
    }
    await dial.focus()
    await page.keyboard.press('ArrowRight')
    await expect(slider).toBeFocused()
    await expect(slider).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(stepper).toBeFocused()
    await expect(stepper).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(dial).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(stepper).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
  })
}

for (const [route, count] of [
  ['/core/data-flow/', 1],
  ['/core/autopilot/', 4],
  ['/developers/architecture/', 2],
  ['/developers/temperature-control/', 1],
] as const) {
  test(`Mermaid diagrams render accessibly on ${route}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(route)
    const diagrams = page.locator('.docs-diagram')
    await expect(diagrams).toHaveCount(count, { timeout: 30000 })
    for (const diagram of await diagrams.all()) {
      await diagram.scrollIntoViewIfNeeded()
      await expect(diagram.locator('svg')).toBeVisible({ timeout: 30000 })
      await expect(diagram.locator('title')).not.toBeEmpty()
      await expect(diagram.locator('desc')).not.toBeEmpty()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    expect(errors).toEqual([])
  })
}

for (const route of ['/', '/core/data-flow/']) {
  test(`Health map video plays on ${route}`, async ({ page }) => {
    await page.goto(route)
    const video = page
      .locator('video')
      .filter({ has: page.locator('source[src="/media/core-health-flow.mp4"]') })
    await video.scrollIntoViewIfNeeded()
    await expect(video).toHaveAttribute('controls', '')
    expect(await video.evaluate((el: HTMLVideoElement) => el.autoplay)).toBe(true)
    expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true)
    expect(await video.evaluate((el: HTMLVideoElement) => el.loop)).toBe(true)
    await expect
      .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
      .toBeGreaterThan(0.5)
    expect(await video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThanOrEqual(
      2000,
    )
    expect(await video.evaluate((el: HTMLVideoElement) => el.error)).toBeNull()
    await video.evaluate((el: HTMLVideoElement) => el.pause())
  })
}

test('Autopilot rule preview cycles through example rules', async ({ page }) => {
  await page.goto('/')
  const ticker = page.locator('.rule-ticker')
  await ticker.scrollIntoViewIfNeeded()
  await expect(ticker).toHaveAttribute('data-rule', '0')
  await expect(ticker).toContainText('Water level changes')
  await expect(ticker).toHaveAttribute('data-rule', '1', { timeout: 10000 })
  await expect(ticker).toContainText('11 PM')
})

test('Autopilot rule preview stays still with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const ticker = page.locator('.rule-ticker')
  await ticker.scrollIntoViewIfNeeded()
  await page.waitForTimeout(4500)
  await expect(ticker).toHaveAttribute('data-rule', '0')
})
