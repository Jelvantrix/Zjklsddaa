import { chromium } from '@playwright/test';

const routes = [
  '/',
  '/story',
  '/suggest',
  '/vote',
  '/lookbook',
  '/journal',
  '/sitemap',
  '/gift-cards',
  '/archive',
  '/archive/naiset',
  '/category/women',
  '/category/men',
  '/category/accessories',
  '/product/ze-001',
  '/about/philosophy',
  '/about/materials',
  '/about/sustainability',
  '/about/workshops',
  '/service/contact',
  '/service/shipping-returns',
  '/service/tracking',
  '/service/size-guide',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
  '/cart',
  '/checkout',
  '/wishlist',
  '/account'
];

async function testRoutes() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  });

  const results = [];

  for (const r of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_NAME_NOT_RESOLVED') && !msg.text().includes('websocket')) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    try {
      const resp = await page.goto(`http://localhost:3000${r}`, { waitUntil: 'load', timeout: 10000 });
      await page.waitForTimeout(600);

      const status = resp ? resp.status() : 'no-resp';

      // Check if page has horizontal scrollbar
      const overflowX = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Check if body has content
      const bodyTextLength = await page.evaluate(() => document.body.innerText.trim().length);
      const isBlank = bodyTextLength < 20;

      results.push({
        route: r,
        status,
        textLen: bodyTextLength,
        isBlank,
        hasHorizontalOverflow: overflowX,
        errors
      });
    } catch (e) {
      results.push({
        route: r,
        status: 'FAILED',
        error: e.message,
        errors
      });
    } finally {
      await page.close();
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

testRoutes().catch(console.error);
