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
    const images = page.locator('img')
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
