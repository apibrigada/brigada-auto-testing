import fs from "fs";
import path from "path";

const TARGET = process.argv.includes("--target")
  ? process.argv[process.argv.indexOf("--target") + 1]
  : "app";

const SCREENSHOT_DIR =
  TARGET === "app"
    ? path.resolve(__dirname, "../../brigadaApp/ai-context/slides/screenshots")
    : TARGET === "pwa"
      ? path.resolve(__dirname, "../../brigadaPWA/ai-context/slides/screenshots")
      : path.resolve(__dirname, "../../webCMS/public/docs/screenshots");

const OUTPUT_FILE =
  TARGET === "app"
    ? path.resolve(__dirname, "../../brigadaApp/ai-context/slides/slides.md")
    : TARGET === "pwa"
      ? path.resolve(__dirname, "../../brigadaPWA/ai-context/slides/slides.md")
      : path.resolve(__dirname, "../../webCMS/ai-context/slides/slides.md");

interface ScreenshotIndexItem {
  id: string;
  articleId: string;
  step: number;
  viewport: string;
  caption: string;
  path: string;
}

function loadIndex(): ScreenshotIndexItem[] {
  const indexPath = path.join(SCREENSHOT_DIR, "index.json");
  if (!fs.existsSync(indexPath)) {
    console.warn(`No index.json found at ${indexPath}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
}

function groupByArticle(items: ScreenshotIndexItem[]): Map<string, ScreenshotIndexItem[]> {
  const groups = new Map<string, ScreenshotIndexItem[]>();
  for (const item of items) {
    const arr = groups.get(item.articleId) ?? [];
    arr.push(item);
    groups.set(item.articleId, arr);
  }
  return groups;
}

function generateSlidesMd(items: ScreenshotIndexItem[]): string {
  const groups = groupByArticle(items);
  const lines: string[] = [];

  lines.push("---");
  lines.push("theme: default");
  lines.push(`title: Brigada ${TARGET === "app" ? "App" : TARGET === "pwa" ? "PWA" : "CMS"}`);
  lines.push("---");
  lines.push("");

  for (const [articleId, articleItems] of groups) {
    const title = articleId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    lines.push(`# ${title}`);
    lines.push("");

    for (const item of articleItems) {
      const screenshotPath = path.join(SCREENSHOT_DIR, item.path);
      const relativePath = path.relative(path.dirname(OUTPUT_FILE), screenshotPath);

      lines.push(`![${item.caption}](${relativePath})`);
      lines.push("");
      if (item.caption) {
        lines.push(`*${item.caption}*`);
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const items = loadIndex();
  if (items.length === 0) {
    console.log("No screenshots found. Run docs:screenshots first.");
    process.exit(1);
  }

  const md = generateSlidesMd(items);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, md);
  console.log(`Generated ${OUTPUT_FILE} from ${items.length} screenshots.`);
}

main();
