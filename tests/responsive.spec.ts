import { test, expect } from '@playwright/test';
import { isMobileProject } from './helpers';

const WIDTHS = [360, 768, 1024, 1440];
const HEIGHT = 1200; // tall enough to avoid clipping fixed elements before the full-page screenshot

const PAGES = [
  { name: 'home', path: '' },
  { name: 'glossary', path: 'glossary/' },
  { name: 'weapons', path: 'weapons/' },
  { name: 'glossary-breaking-objects', path: 'glossary/breaking-objects/' },
  { name: 'equipment', path: 'equipment/' },
  { name: 'equipment-plate-armor', path: 'equipment/plate-armor/' },
];

const SCHEMES = ['light', 'dark'] as const;

// This is a viewport-width sweep independent of the device descriptor, so
// running it once (on the desktop project, which uses a plain Chromium
// context rather than a fixed mobile emulation) covers every width cleanly.
test.beforeEach(({}, testInfo) => {
  test.skip(isMobileProject(testInfo), 'width sweep run once on desktop project');
});

for (const { name, path } of PAGES) {
  for (const width of WIDTHS) {
    test(`${name} @ ${width}px: no horizontal overflow, screenshots in light+dark`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Take the screenshots first so they exist for visual review even if the
      // overflow assertion below fails.
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.screenshot({
          path: `test-results/screens/${name}-${width}-${scheme}.png`,
          fullPage: true,
        });
      }

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `horizontal overflow at ${width}px on /${path}: scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`).toBeLessThanOrEqual(innerWidth);
    });
  }
}
