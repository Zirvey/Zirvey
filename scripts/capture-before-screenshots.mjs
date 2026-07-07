import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/case-studies");

const sites = [
  { id: "w-steak", url: "https://wrestaurant.cz/" },
  { id: "smokehouse", url: "https://www.smokehouse.cz/" },
  { id: "smoky-place", url: "https://smokyplace.cz/" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

for (const site of sites) {
  const file = path.join(outDir, `before-${site.id}.jpg`);
  console.log(`Capturing ${site.url} → ${file}`);
  try {
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: file, type: "jpeg", quality: 85, fullPage: false });
    console.log("  OK");
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
  }
}

await browser.close();
console.log("Done.");
