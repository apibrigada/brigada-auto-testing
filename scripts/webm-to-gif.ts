/**
 * webm-to-gif.ts
 *
 * Converts recorded WebM files to optimized GIFs.
 * Uses ffmpeg for WebM→palette GIF, then gifsicle for lossy optimization.
 *
 * Prerequisites:
 *   - ffmpeg (https://ffmpeg.org)
 *   - gifsicle (https://www.lcdf.org/gifsicle/)
 *
 * Usage:
 *   npx tsx scripts/webm-to-gif.ts                    # convert all WebM files
 *   npx tsx scripts/webm-to-gif.ts --article atajos    # convert specific article
 *   npx tsx scripts/webm-to-gif.ts --id atajos-kbd-demo # convert specific file
 *   npx tsx scripts/webm-to-gif.ts --dry-run            # preview without converting
 *
 * Target: <500KB per GIF
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GIF_DIR = path.resolve(__dirname, "../../webCMS/public/docs/gifs");
const MAX_SIZE_KB = 500;

interface ConvertOptions {
  dryRun?: boolean;
  articleFilter?: string;
  idFilter?: string;
}

function checkPrerequisites() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    console.error("❌ ffmpeg not found. Install: https://ffmpeg.org/download.html");
    process.exit(1);
  }

  try {
    execSync("gifsicle --version", { stdio: "ignore" });
  } catch {
    console.warn("⚠ gifsicle not found. GIF optimization will be limited.");
    console.warn("  Install: brew install gifsicle / apt install gifsicle");
  }
}

function findWebMFiles(options: ConvertOptions): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".webm")) {
        if (options.articleFilter) {
          const rel = path.relative(GIF_DIR, fullPath);
          if (!rel.startsWith(options.articleFilter)) continue;
        }
        if (options.idFilter) {
          if (!entry.name.replace(".webm", "").includes(options.idFilter)) continue;
        }
        files.push(fullPath);
      }
    }
  }

  walk(GIF_DIR);
  return files.sort();
}

function fileSizeKB(filePath: string): number {
  const stats = fs.statSync(filePath);
  return Math.round(stats.size / 1024);
}

function convertToGif(webmPath: string): string {
  const gifPath = webmPath.replace(/\.webm$/, ".gif");
  const palettePath = webmPath.replace(/\.webm$/, "-palette.png");

  // Step 1: Generate palette for better colors
  try {
    execSync(
      `ffmpeg -y -i "${webmPath}" -vf "fps=8,scale=480:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`,
      { stdio: "ignore" }
    );
  } catch {
    // Fallback: skip palette step
    console.warn(`  ⚠ palette generation failed, using default`);
  }

  // Step 2: Convert to GIF with palette
  const hasPalette = fs.existsSync(palettePath);

  try {
    if (hasPalette) {
      execSync(
        `ffmpeg -y -i "${webmPath}" -i "${palettePath}" -lavfi "fps=8,scale=480:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5" "${gifPath}"`,
        { stdio: "ignore" }
      );
    } else {
      execSync(
        `ffmpeg -y -i "${webmPath}" -vf "fps=8,scale=480:-1:flags=lanczos" "${gifPath}"`,
        { stdio: "ignore" }
      );
    }
  } catch (err) {
    console.error(`  ❌ ffmpeg failed: ${err}`);
    throw err;
  }

  // Cleanup palette
  if (hasPalette) {
    fs.unlinkSync(palettePath);
  }

  // Step 3: Optimize with gifsicle (lossy)
  try {
    execSync(
      `gifsicle -O3 --lossy=30 --colors 128 -o "${gifPath}" "${gifPath}"`,
      { stdio: "ignore" }
    );
  } catch {
    // gifsicle not available, GIF is still usable
  }

  // Step 4: Check size
  const sizeKB = fileSizeKB(gifPath);
  if (sizeKB > MAX_SIZE_KB) {
    console.warn(`  ⚠ ${sizeKB}KB exceeds ${MAX_SIZE_KB}KB target`);
  }

  return gifPath;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const articleIdx = args.indexOf("--article");
  const idIdx = args.indexOf("--id");

  const options: ConvertOptions = {
    dryRun,
    articleFilter: articleIdx >= 0 ? args[articleIdx + 1] : undefined,
    idFilter: idIdx >= 0 ? args[idIdx + 1] : undefined,
  };

  checkPrerequisites();

  const webmFiles = findWebMFiles(options);

  if (webmFiles.length === 0) {
    console.log("\n⚠ No WebM files found in:", GIF_DIR);
    console.log("  Run 'npx tsx scripts/capture-doc-gifs.ts' first.\n");
    return;
  }

  console.log(`\n🔄 Converting ${webmFiles.length} WebM → GIF${dryRun ? " (dry run)" : ""}\n`);

  let success = 0;
  let failed = 0;

  for (const webmPath of webmFiles) {
    const rel = path.relative(process.cwd(), webmPath);
    const sizeKB = fileSizeKB(webmPath);
    const gifPath = webmPath.replace(/\.webm$/, ".gif");

    console.log(`  ${rel} (${sizeKB}KB)`);

    if (dryRun) {
      console.log(`    → ${path.relative(process.cwd(), gifPath)}`);
      continue;
    }

    try {
      convertToGif(webmPath);
      const gifSizeKB = fileSizeKB(gifPath);
      console.log(`    → ${gifSizeKB}KB ✓`);

      // Remove source WebM after successful conversion
      // fs.unlinkSync(webmPath);

      success++;
    } catch (err) {
      console.error(`    → FAILED`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${success} converted, ${failed} failed`);

  if (success > 0) {
    console.log(`\n📁 GIFs at: ${GIF_DIR}`);
    console.log(`\n📋 Next: add gif/gifAlt to article slugs in docs-manual.ts`);
  }
}

main();
