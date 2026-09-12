/**
 * Capture video of guided tours using Playwright.
 *
 * Usage:
 *   npx tsx scripts/capture-tour-videos.ts                    # Capture all tours
 *   npx tsx scripts/capture-tour-videos.ts --tour overview    # Capture specific tour
 *   npx tsx scripts/capture-tour-videos.ts --headed           # Run in headed mode
 *
 * Output: videos/tours/<tour-id>.webm
 */

import { chromium, type Browser, type Page } from "playwright";
import fs from "fs";
import path from "path";

const CMS_URL = process.env.CMS_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "../videos/tours");

interface TourConfig {
  id: string;
  route: string;
  steps: number;
  waitFor?: string;
}

const TOURS: TourConfig[] = [
  { id: "overview", route: "/dashboard", steps: 10 },
  { id: "teams", route: "/dashboard/teams", steps: 4 },
  { id: "campaigns", route: "/dashboard/campaigns", steps: 5 },
  { id: "surveys", route: "/dashboard/surveys", steps: 5 },
  { id: "gestiones", route: "/dashboard/gestiones", steps: 3 },
  { id: "survey-builder", route: "/dashboard/surveys/builder", steps: 5, waitFor: "[data-tour='builder-toolbox']" },
  { id: "analytics", route: "/dashboard/analytics", steps: 8 },
  { id: "roles", route: "/dashboard/roles", steps: 4 },
  { id: "areas", route: "/dashboard/areas-v2", steps: 5, waitFor: "[data-tour='areas-map']" },
  { id: "campaign-wizard", route: "/dashboard/campaigns/new", steps: 5 },
  { id: "users", route: "/dashboard/users", steps: 4 },
  { id: "whitelist", route: "/dashboard/whitelist", steps: 3 },
  { id: "assignment-groups", route: "/dashboard/assignment-groups", steps: 3 },
  { id: "notifications", route: "/dashboard/notifications", steps: 4 },
];

async function captureTourVideo(
  browser: Browser,
  tour: TourConfig,
  headed: boolean
): Promise<void> {
  console.log(`\n🎬 Capturing tour: ${tour.id}`);
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();
  
  try {
    // Navigate to login page first
    await page.goto(`${CMS_URL}/login`, { waitUntil: "networkidle" });
    
    // Login (you may need to adjust credentials)
    await page.fill('input[name="email"]', process.env.CMS_EMAIL || "admin@brigada.org");
    await page.fill('input[name="password"]', process.env.CMS_PASSWORD || "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    
    // Navigate to tour route
    await page.goto(`${CMS_URL}${tour.route}`, { waitUntil: "networkidle" });
    
    // Wait for specific element if needed
    if (tour.waitFor) {
      await page.waitForSelector(tour.waitFor, { timeout: 10000 });
    }
    
    // Start tour via localStorage
    await page.evaluate((tourId) => {
      localStorage.setItem("pendingTourId", tourId);
    }, tour.id);
    
    // Reload to trigger tour
    await page.reload({ waitUntil: "networkidle" });
    
    // Wait for tour to start
    await page.waitForSelector("[data-tour]", { timeout: 10000 });
    
    // Click through tour steps
    for (let i = 0; i < tour.steps; i++) {
      // Wait for next button or continue button
      const nextButton = await page.$("button[aria-label='Next'], button:has-text('Siguiente'), button:has-text('Continuar')");
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Stop tour
    await page.evaluate(() => {
      localStorage.removeItem("pendingTourId");
    });
    
    console.log(`✅ Tour ${tour.id} captured`);
  } catch (error) {
    console.error(`❌ Error capturing tour ${tour.id}:`, error);
  } finally {
    await context.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const headed = args.includes("--headed");
  const tourArg = args.find((a) => !a.startsWith("--"));
  
  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  console.log("🎬 Tour Video Capture");
  console.log("====================");
  console.log(`CMS URL: ${CMS_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Mode: ${headed ? "headed" : "headless"}`);
  
  const browser = await chromium.launch({ headless: !headed });
  
  try {
    if (tourArg) {
      const tour = TOURS.find((t) => t.id === tourArg);
      if (!tour) {
        console.error(`Tour not found: ${tourArg}`);
        console.log("Available tours:", TOURS.map((t) => t.id).join(", "));
        process.exit(1);
      }
      await captureTourVideo(browser, tour, headed);
    } else {
      for (const tour of TOURS) {
        await captureTourVideo(browser, tour, headed);
      }
    }
  } finally {
    await browser.close();
  }
  
  console.log("\n✅ Done! Videos saved to:", OUTPUT_DIR);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
