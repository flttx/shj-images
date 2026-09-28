import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:5174/?beast=yinglong');
  await page.getByText('三维实景').waitFor({ timeout: 90_000 });
  await page.screenshot({ path: 'qa/yinglong-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: 'qa/yinglong-mobile.png', fullPage: true });
  process.stdout.write(JSON.stringify(await page.evaluate(() => ({
    viewport: innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    offenders: [...document.querySelectorAll('body *')].map((element) => ({ tag: element.tagName, cls: typeof element.className === 'string' ? element.className : '', right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })).filter((element) => element.right > innerWidth + 1 && !element.cls.startsWith('rail-')).slice(0, 15),
  })), null, 2));
} finally { await browser.close(); }
