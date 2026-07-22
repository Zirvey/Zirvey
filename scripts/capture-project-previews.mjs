import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public/projects/previews");
const postersDir = join(root, "public/projects");
const tmpDir = join(root, ".preview-capture");

/** Matches project card aspect ~16/11 */
const VIEWPORT = { width: 1280, height: 880 };
const FPS = 30;
const HERO_HOLD_S = 1.5;
/** Slow enough that each section reads on screen before moving on */
const SCROLL_S = 20;
const JPEG_QUALITY = 82;
const FRAME_MS = 1000 / FPS;

const projects = [
  {
    id: "w-steak",
    url: "https://zirvey.github.io/w-steak-restaurant-landing-page/",
  },
  {
    id: "w-steak-v2",
    url: "https://zirvey.github.io/w-steak-restaurant-landing-page-v2/",
    /* Realtime pacing so Framer/CSS entrance + scroll animations actually play */
    realtime: true,
    heroHoldS: 3.5,
    savePoster: "w-steak-editorial.jpg",
  },
  {
    id: "smokehouse",
    url: "https://zirvey.github.io/smokehouse-desing/",
  },
  {
    id: "smoky-place",
    url: "https://zirvey.github.io/smoky-place-landing-page/",
  },
  {
    id: "booking",
    url: "https://zirvey.github.io/Booking-Telegram-App-Prewiev/",
  },
  {
    id: "helix-trade",
    url: "https://zirvey.github.io/Scalping-Bot-SaaS/helix/",
    waitFor: "h1",
  },
  {
    id: "devops-learn",
    url: "https://zirvey.github.io/DevOps-Learn/",
    beforeCapture: switchDevOpsToEnglish,
    savePoster: "devops-learn.jpg",
  },
  {
    id: "plantup",
    url: "https://zirvey.github.io/PlantUp-SaaS/app/",
    waitFor: "h1",
    realtime: true,
    heroHoldS: 2.5,
    savePoster: "plantup.jpg",
    beforeCapture: preparePlantUp,
  },
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

async function waitForPaint(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

async function switchDevOpsToEnglish(page) {
  const en = page.getByRole("button", { name: /^EN$/i });
  await en.waitFor({ timeout: 10000 });
  await en.click();
  await page.waitForTimeout(800);
  await page.waitForFunction(
    () => !/Платформа|обучения|Начать/i.test(document.body?.innerText || ""),
    { timeout: 10000 },
  ).catch(() => {});
}

async function preparePlantUp(page) {
  /* Close overlay menu if open; keep English */
  const closeMenu = page.getByRole("button", { name: /close menu/i });
  if (await closeMenu.isVisible().catch(() => false)) {
    await closeMenu.click().catch(() => {});
  }
  const en = page.getByRole("radio", { name: /EN/i });
  if (await en.isVisible().catch(() => false)) {
    await en.check({ force: true }).catch(() => en.click().catch(() => {}));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function preparePage(page) {
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      * { scroll-behavior: auto !important; }
    `,
  });

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    try {
      window.lenis?.stop?.();
      window.lenis?.destroy?.();
    } catch {
      /* ignore */
    }
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
  });
}

async function getMaxScroll(page) {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  );
}

async function captureFrames(page, framesDir, project) {
  await mkdir(framesDir, { recursive: true });
  await preparePage(page);
  await waitForPaint(page);

  const heroHoldS = project.heroHoldS ?? HERO_HOLD_S;
  const holdFrames = Math.round(heroHoldS * FPS);
  const scrollFrames = Math.round(SCROLL_S * FPS);
  const maxScroll = await getMaxScroll(page);
  const realtime = Boolean(project.realtime);

  let frameIndex = 0;

  const saveShot = async () => {
    const file = join(framesDir, `frame-${String(frameIndex).padStart(5, "0")}.jpg`);
    await page.screenshot({
      path: file,
      type: "jpeg",
      quality: JPEG_QUALITY,
      /* Keep CSS/Framer animations running — disabled was freezing them mid-state */
      animations: "allow",
    });
    frameIndex += 1;
    if (realtime) await page.waitForTimeout(FRAME_MS);
  };

  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForPaint(page);

  if (project.savePoster) {
    await page.screenshot({
      path: join(postersDir, project.savePoster),
      type: "jpeg",
      quality: 88,
      animations: "allow",
    });
    console.log(`  poster → public/projects/${project.savePoster}`);
  }

  for (let i = 0; i < holdFrames; i += 1) {
    await saveShot();
  }

  if (maxScroll > 0) {
    for (let i = 1; i <= scrollFrames; i += 1) {
      const t = easeInOutSine(i / scrollFrames);
      const y = maxScroll * t;
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await waitForPaint(page);
      await saveShot();
    }
  } else {
    for (let i = 0; i < scrollFrames; i += 1) {
      await saveShot();
    }
  }

  return frameIndex;
}

async function encodeMp4(framesDir, mp4Path) {
  await run("ffmpeg", [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    join(framesDir, "frame-%05d.jpg"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "20",
    "-preset",
    "medium",
    "-movflags",
    "+faststart",
    "-an",
    mp4Path,
  ]);
}

async function captureOne(browser, project) {
  const framesDir = join(tmpDir, project.id);
  await mkdir(framesDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  console.log(`→ ${project.id}: ${project.url}`);

  try {
    await page.goto(project.url, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } catch {
    await page.goto(project.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
  }

  if (project.waitFor) {
    await page.waitForSelector(project.waitFor, { timeout: 20000 });
  }

  if (typeof project.beforeCapture === "function") {
    await project.beforeCapture(page);
  }

  await page.waitForTimeout(1000);

  const count = await captureFrames(page, framesDir, project);
  await page.close();
  await context.close();

  const mp4Path = join(outDir, `${project.id}.mp4`);
  await encodeMp4(framesDir, mp4Path);
  console.log(`✓ ${project.id}.mp4 (${count} frames @ ${FPS}fps)`);
}

async function main() {
  const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith("-")));
  const selected = only.size
    ? projects.filter((p) => only.has(p.id))
    : projects;

  if (!selected.length) {
    console.error(
      `No matching projects. Available: ${projects.map((p) => p.id).join(", ")}`,
    );
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });
  await mkdir(postersDir, { recursive: true });
  if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });

  try {
    for (const project of selected) {
      await captureOne(browser, project);
    }
  } finally {
    await browser.close();
    await rm(tmpDir, { recursive: true, force: true });
  }

  console.log("\nDone. Smooth previews in public/projects/previews/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
