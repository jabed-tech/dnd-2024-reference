// Regression tests for the issues fixed from audit/SUMMARY.md (items 1–8).
import { test, expect } from '@playwright/test';
import { isMobileProject, openSearch } from './helpers';

test('#1 malformed saved data does not break the page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dnd-ref:favourites', '{"a":1}');
    localStorage.setItem('dnd-ref:recent', 'null');
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('glossary/grappled-condition/');
  const star = page.locator('[data-fav="glossary/grappled-condition"]').first();
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('#1 favourites and theme still work when storage throws', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const boom = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', { get: boom, configurable: true });
  });
  await page.goto('glossary/grappled-condition/');
  const star = page.locator('[data-fav="glossary/grappled-condition"]').first();
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');

  test.skip(isMobileProject(testInfo), 'theme toggle checked once');
  const html = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');
  const first = await html.getAttribute('data-resolved-theme');
  await toggle.click();
  await toggle.click();
  await expect(html).toHaveAttribute('data-resolved-theme', first!);
});

test('#2 tapping a term after the index has loaded previews instead of navigating', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), 'touch-only interaction');
  await page.goto('glossary/grappled-condition/');
  // Load the app's search index first (opening search does), which is the
  // state in which taps used to skip the preview.
  await openSearch(page, testInfo);
  await expect(page.locator('#palette-status')).not.toBeEmpty();
  await page.locator('[data-close-search]').tap();
  const term = page.locator('a.term[data-term="glossary/disadvantage"]');
  await term.tap();
  await expect(page.locator('#term-tip')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/glossary\/grappled-condition\/$/);
  // Tapping the same term again follows it.
  await term.tap();
  await expect(page).toHaveURL(/\/glossary\/disadvantage\/$/);
});

test('#3 the palette announces through one live region outside the listbox', async ({ page }, testInfo) => {
  await page.goto('');
  await openSearch(page, testInfo);
  const status = page.locator('#palette-status');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(page.locator('#palette-results p')).toHaveCount(0);
  await page.locator('#palette-input').fill('grapple');
  await expect(status).toHaveText(/\d+ results?/);
  await page.locator('#palette-input').fill('zzzzqqq');
  await expect(status).toHaveText(/No results for/);
  await expect(status).toBeVisible();
});

test('#4 equipment and condition text link to the right entries', async ({ page }) => {
  await page.goto('equipment/spikes-iron/');
  await expect(page.locator('a.term', { hasText: 'Light Hammer' })).toHaveAttribute('data-term', 'weapons/light-hammer');
  await page.goto('equipment/leatherworkers-tools/');
  await expect(page.locator('a.term', { hasText: 'Hide Armor' })).toHaveAttribute('data-term', 'equipment/hide-armor');
  await page.goto('glossary/blinded-condition/');
  await expect(page.locator('a.term[data-term="glossary/attack-action"]')).toHaveCount(0);
});

test('#6 jumping to a letter leaves its heading visible below the header', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), 'desktop layout');
  await page.goto('glossary/');
  await page.locator('[data-letter="G"]').click();
  const top = await page.locator('#h-G').evaluate((el) => el.getBoundingClientRect().top);
  const headerBottom = await page.locator('.app-header').evaluate((el) => el.getBoundingClientRect().bottom);
  expect(top).toBeGreaterThanOrEqual(headerBottom - 1);
});

test('#7 the equipment Cost header cycles high-low, low-high, then SRD order', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), 'column headers are desktop-only');
  await page.goto('equipment/');
  const th = page.locator('th:has(button[data-sort="cost"])');
  const btn = th.locator('button');
  await btn.click();
  await expect(th).toHaveAttribute('aria-sort', 'descending');
  await btn.click();
  await expect(th).toHaveAttribute('aria-sort', 'ascending');
  const costs = await page.locator('tr[data-item]').evaluateAll((rows) => rows.slice(0, 5).map((r) => (r as HTMLElement).dataset.cost));
  const nums = costs.map(Number);
  expect([...nums].sort((a, b) => a - b)).toEqual(nums);
  await btn.click();
  await expect(th).not.toHaveAttribute('aria-sort', /./);
});

test('#8 every glossary category chip is reachable on desktop', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), 'desktop layout');
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('glossary/');
    const offscreen = await page.locator('button[data-category]').evaluateAll((chips) =>
      chips.filter((c) => {
        const r = c.getBoundingClientRect();
        return r.right > innerWidth || r.left < 0;
      }).length,
    );
    expect(offscreen).toBe(0);
  }
});

test('sidebar collapses to an icon rail, widens the content and remembers the choice', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), 'desktop sidebar');
  await page.goto('weapons/');
  const main = page.locator('.main');
  const before = await main.evaluate((el) => el.getBoundingClientRect().width);
  const toggle = page.locator('[data-sidebar-toggle]');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const after = await main.evaluate((el) => el.getBoundingClientRect().width);
  expect(after).toBeGreaterThan(before + 150);
  // Links keep their accessible names in the rail.
  await expect(page.getByRole('link', { name: /Weapon Masteries/ }).first()).toBeVisible();
  await page.goto('glossary/');
  await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'collapsed');
  await page.keyboard.press('[');
  await expect(page.locator('html')).not.toHaveAttribute('data-sidebar', 'collapsed');
});

test('navigation swaps content in place and every page feature still works after a swap', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), 'desktop sidebar');
  await page.goto('');
  // A marker on window only survives if the document is never reloaded.
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
  const survived = () => page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload === true);

  await page.locator('.sidebar a[href$="/weapons/"]').click();
  await expect(page.locator('h1')).toHaveText('Weapons');
  expect(await survived()).toBe(true);
  // The swapped-in table is live.
  await page.locator('button[data-set="kind"][data-value="ranged"]').click();
  await expect(page.locator('[data-result-count]')).not.toHaveText('38 weapons');

  await page.locator('.sidebar a[href$="/glossary/"]').click();
  await expect(page.locator('h1')).toHaveText('Rules Glossary');
  // Sidebar categories filter in place on the glossary index.
  await page.locator('.sidebar [data-nav-category="conditions"]').click();
  await expect(page).toHaveURL(/category=conditions/);
  await expect(page.locator('[data-entry]:not([hidden])')).toHaveCount(16);
  await page.locator('.sidebar [data-nav-category="combat"]').click();
  await expect(page.locator('[data-entry]:not([hidden])')).toHaveCount(34);
  expect(await survived()).toBe(true);

  // Detail page after a swap: star state, preview and Back all work.
  await page.locator('[data-entry]:not([hidden]) .row-link').first().click();
  await expect(page.locator('.entry-head h1')).toBeVisible();
  const star = page.locator('.entry-head [data-fav]');
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-back-label]')).toHaveText('Back');
  expect(await survived()).toBe(true);

  // Search navigates through the router too.
  await page.keyboard.press('Control+k');
  await page.locator('#palette-input').fill('longsword');
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toHaveText('Longsword');
  expect(await survived()).toBe(true);
});
