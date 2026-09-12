import { chromium, type Page } from "@playwright/test";
import { SCREENSHOTS, VIEWPORTS, type ScreenshotAction, type ScreenshotSpec } from "./docs-screenshot-config";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const BASE_URL = process.env.E2E_CMS_BASE_URL ?? "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? process.env.E2E_LOGIN_EMAIL;
const PASSWORD = process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? process.env.E2E_LOGIN_PASSWORD;
const SCREENSHOT_DIR = path.resolve(__dirname, "../../webCMS/public/docs/screenshots");

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
    switch (action.type) {
      case "click":
        await page.click(action.selector, { timeout: 5000 });
        await page.waitForTimeout(300);
        break;
      case "fill":
        await page.fill(action.selector, action.value ?? "");
        await page.waitForTimeout(200);
        break;
      case "select":
        await page.selectOption(action.selector, action.value ?? "");
        await page.waitForTimeout(200);
        break;
      case "wait":
        await page.waitForSelector(action.selector, { timeout: 5000 });
        break;
      case "hover":
        await page.hover(action.selector, { timeout: 5000 });
        await page.waitForTimeout(200);
        break;
    }
  }
}

async function captureScreenshot(page: Page, spec: ScreenshotSpec) {
  const viewport = VIEWPORTS[spec.viewport];
  await page.setViewportSize(viewport);

  await page.goto(`${BASE_URL}${spec.url}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);

  if (spec.waitFor) {
    await page.waitForSelector(spec.waitFor, { timeout: 8000 }).catch(() => {
      console.warn(`  ⚠ Selector not found: ${spec.waitFor}`);
    });
  }

  if (spec.actions) {
    await runActions(page, spec.actions);
    await page.waitForTimeout(500);
  }

  const dir = path.join(SCREENSHOT_DIR, spec.articleId);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${spec.id}.png`);
  await page.screenshot({
    path: filePath,
    fullPage: spec.fullPage ?? false,
    type: "png",
  });

  console.log(`  ✓ ${spec.id} → ${path.relative(process.cwd(), filePath)}`);
}

async function main() {
  const specificArticle = process.argv[2];
  const specificId = process.argv[3];

  const specs = specificArticle
    ? SCREENSHOTS.filter((s) => {
        if (specificId) return s.id === specificId;
        return s.articleId === specificArticle;
      })
    : SCREENSHOTS;

  if (specs.length === 0) {
    console.log("No screenshots to capture.");
    return;
  }

  console.log(`\n📸 Capturing ${specs.length} screenshots...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    locale: "es-MX",
  });
  const page = await context.newPage();

  console.log("🔐 Logging in...");
  await login(page);
  console.log("✓ Authenticated\n");

  let success = 0;
  let failed = 0;

  for (const spec of specs) {
    try {
      const alive = page.url() !== "about:blank";
      if (!alive) {
        console.error(`  ✗ ${spec.id}: page closed, recovering...`);
        const newPage = await context.newPage();
        await login(newPage);
        Object.assign(page, newPage);
      }
      await captureScreenshot(page, spec);
      success++;
    } catch (err) {
      console.error(`  ✗ ${spec.id}: ${err}`);
      failed++;
      try {
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 10000 });
        await page.waitForTimeout(1000);
      } catch {
        try {
          const recovered = await context.newPage();
          await login(recovered);
          (page as unknown as Page).close;
          Object.assign(page, recovered);
        } catch { /* best effort */ }
      }
    }
  }

  await browser.close();

  console.log(`\n✅ Done: ${success} captured, ${failed} failed`);
  console.log(`📁 Output: ${SCREENSHOT_DIR}\n`);

  // Generate index.json for reference
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const index = specs.map((s) => ({
    id: s.id,
    articleId: s.articleId,
    step: s.step,
    viewport: s.viewport,
    caption: s.caption,
    path: `${s.articleId}/${s.id}.png`,
  }));
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "index.json"),
    JSON.stringify(index, null, 2),
  );
  console.log("📝 Generated index.json");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
