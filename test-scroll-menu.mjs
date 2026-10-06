import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Scroll down 400px
  console.log('Scrolling down 400px...');
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);

  // Scroll position before click
  const scrollBefore = await page.evaluate(() => window.scrollY);
  console.log('ScrollY before menu click:', scrollBefore);

  // Click menu button
  const menuBtn = await page.$('button[aria-label="Menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await page.waitForTimeout(800);

    const dialog = await page.$('[role="dialog"][aria-label="Navigation Menu"]');
    const box = dialog ? await dialog.boundingBox() : null;
    console.log('Dialog bounding box when clicked after 400px scroll:', box);

    // Body position and top
    const bodyInfo = await page.evaluate(() => ({
      position: document.body.style.position,
      top: document.body.style.top,
      scrollY: window.scrollY
    }));
    console.log('Body info after menu click:', bodyInfo);

    // Try clicking WOMEN button inside menu
    const womenBtn = await page.$('button:has-text("WOMEN")');
    if (womenBtn) {
      console.log('Clicking WOMEN button inside menu...');
      await womenBtn.click();
      await page.waitForTimeout(800);

      // Did it stay in menu or navigate away?
      const dialogStillOpen = await page.$('[role="dialog"][aria-label="Navigation Menu"]');
      console.log('Dialog still open after clicking WOMEN:', !!dialogStillOpen);
      console.log('Current URL/route:', page.url());
    }
  }

  await browser.close();
}

run().catch(console.error);
