import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://ai-saas-template-aceternity.vercel.app/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(2500);
await page.screenshot({
  path: "C:/Users/nicol/AppData/Local/Temp/claude/automerio-shots/ref-hero-2.png",
  fullPage: false,
  clip: { x: 0, y: 500, width: 1440, height: 900 },
});
await page.mouse.wheel(0, 700);
await page.waitForTimeout(1500);
await page.screenshot({
  path: "C:/Users/nicol/AppData/Local/Temp/claude/automerio-shots/ref-hero-3.png",
});
await browser.close();
