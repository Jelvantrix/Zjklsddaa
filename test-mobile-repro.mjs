import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('Page loaded. Checking for menu button...');
  const menuBtn = await page.$('button[aria-label="Menu"]');
  console.log('Menu button found:', !!menuBtn);

  if (menuBtn) {
    console.log('Clicking menu button...');
    await menuBtn.click();
    await page.waitForTimeout(1000);

    const mobileMenuDialog = await page.$('[role="dialog"][aria-label="Navigation Menu"]');
    console.log('Mobile menu dialog found in DOM:', !!mobileMenuDialog);

    if (mobileMenuDialog) {
      const isVisible = await mobileMenuDialog.isVisible();
      const boundingBox = await mobileMenuDialog.boundingBox();
      console.log('Mobile menu isVisible:', isVisible);
      console.log('Mobile menu boundingBox:', boundingBox);

      // Check what text is visible inside the menu
      const links = await mobileMenuDialog.$$('button');
      console.log('Button count inside menu:', links.length);
      for (const link of links) {
        const text = await link.innerText();
        const box = await link.boundingBox();
        if (text.trim()) {
          console.log(`Link: "${text.trim().replace(/\n/g, ' ')}" - box:`, box);
        }
      }
    }
  }

  // Check scroll position and body position
  const bodyStyle = await page.evaluate(() => {
    return {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      scrollY: window.scrollY,
      htmlOverflow: document.documentElement.style.overflow,
    };
  });
  console.log('Body style after menu click:', bodyStyle);

  console.log('Console errors:', consoleErrors);

  await browser.close();
}

run().catch(console.error);
