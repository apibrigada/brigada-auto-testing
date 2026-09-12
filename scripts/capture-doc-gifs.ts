/**
 * capture-doc-gifs.ts
 *
 * Records video of interactive doc GIF scenarios using Playwright.
 * Output: webCMS/public/docs/gifs/<id>.webm
 *
 * Usage:
 *   npx tsx scripts/capture-doc-gifs.ts                # all GIFs
 *   npx tsx scripts/capture-doc-gifs.ts atajos-kbd-demo # specific GIF
 *   npx tsx scripts/capture-doc-gifs.ts --headed       # visible browser
 */

import { chromium, type Page, type BrowserContext } from "@playwright/test";
import { GIFS, VIEWPORTS, type GifSpec, type ScreenshotAction } from "./docs-screenshot-config";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const BASE_URL = process.env.E2E_CMS_BASE_URL ?? "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? process.env.E2E_LOGIN_EMAIL;
const PASSWORD = process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? process.env.E2E_LOGIN_PASSWORD;
const GIF_DIR = path.resolve(__dirname, "../../webCMS/public/docs/gifs");

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector("input[type='email'], input[name='email']");
  await page.fill("input[type='email'], input[name='email']", EMAIL!);
  await page.fill("input[type='password'], input[name='password']", PASSWORD!);
  await page.click("button[type='submit']");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

async function runActions(page: Page, actions: ScreenshotAction[]) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "click":
          await page.click(action.selector, { timeout: 5000 });
          await page.waitForTimeout(300);
          break;
        case "fill":
          await page.fill(action.selector, action.value ?? "", { timeout: 5000 });
          await page.waitForTimeout(300);
          break;
        case "select":
          await page.selectOption(action.selector, action.value ?? "", { timeout: 5000 });
          await page.waitForTimeout(200);
          break;
        case "wait":
          if (action.selector.match(/^\d+$/)) {
            await page.waitForTimeout(parseInt(action.selector, 10));
          } else {
            await page.waitForSelector(action.selector, { timeout: 5000 });
          }
          break;
        case "hover":
          await page.hover(action.selector, { timeout: 5000 });
          await page.waitForTimeout(300);
          break;
        case "press":
          await page.keyboard.press(action.value ?? "Enter");
          await page.waitForTimeout(300);
          break;
        case "drag":
          await dragAndDrop(page, action.selector, action.targetSelector!);
          await page.waitForTimeout(500);
          break;
      }
    } catch (err) {
      console.warn(`  ⚠ Action failed: ${action.type} ${action.selector} — ${err}`);
    }
  }
}

async function dragAndDrop(page: Page, sourceSelector: string, targetSelector: string) {
  const source = await page.locator(sourceSelector).first();
  const target = await page.locator(targetSelector).first();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    console.warn(`  ⚠ drag: bounding box not found`);
    return;
  }

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Move in steps for visible drag
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = sx + ((tx - sx) * i) / steps;
    const y = sy + ((ty - sy) * i) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  await page.mouse.up();
}

async function captureGif(context: BrowserContext, spec: GifSpec) {
  const viewport = VIEWPORTS[spec.viewport];

  // Create a new page for recording
  const page = await context.newPage();
  await page.setViewportSize(viewport);

  const dir = path.join(GIF_DIR, spec.articleId);
  fs.mkdirSync(dir, { recursive: true });

  const webmPath = path.join(dir, `${spec.id}.webm`);

  await page.goto(`${BASE_URL}${spec.url}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000); // Let page settle

  // Run the interaction
  await runActions(page, spec.actions);

  // Wait remaining duration (minus what actions already took)
  const remainingMs = Math.max(0, spec.durationMs - 3000);
  await page.waitForTimeout(Math.min(remainingMs, spec.durationMs));

  // Get video path before closing
  const videoPath = await page.video()?.path();

  // Stop recording by closing page
  await page.close();

  // Save the video
  if (videoPath && fs.existsSync(videoPath)) {
    fs.copyFileSync(videoPath, webmPath);
    const sizeKB = Math.round(fs.statSync(webmPath).size / 1024);
    console.log(`  ✓ ${spec.id} → ${path.relative(process.cwd(), webmPath)} (${sizeKB}KB)`);
  } else {
    console.warn(`  ⚠ ${spec.id}: no video data at ${videoPath}`);
  }
}

async function main() {
  const specificId = process.argv[2];
  const headed = process.argv.includes("--headed");

  const specs = specificId
    ? GIFS.filter((g) => g.id === specificId)
    : GIFS;

  if (specs.length === 0) {
    console.log("No GIFs to capture.");
    return;
  }

  console.log(`\n🎬 Capturing ${specs.length} GIF recordings...\n`);

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    locale: "es-MX",
    recordVideo: {
      dir: GIF_DIR,
      size: VIEWPORTS.desktop,
    },
  });

  console.log("🔐 Logging in...");
  const loginPage = await context.newPage();
  await login(loginPage);
  await loginPage.close();
  console.log("✓ Authenticated\n");

  let success = 0;
  let failed = 0;

  for (const spec of specs) {
    try {
      await captureGif(context, spec);
      success++;
    } catch (err) {
      console.error(`  ✗ ${spec.id}: ${err}`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\n✅ Done: ${success} recorded, ${failed} failed`);
  console.log(`📁 Output: ${GIF_DIR}`);
  console.log(`\n🔧 Next: convert WebM to GIF with:`);
  console.log(`   npx tsx scripts/webm-to-gif.ts\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
