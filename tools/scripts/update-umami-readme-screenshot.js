const fs = require("fs");
const path = require("path");

const SHARE_URL = process.env.UMAMI_SHARE_URL;
const README_PATH = process.env.README_PATH || "README.md";
const IMAGE_PATH = process.env.ANALYTICS_IMAGE_PATH || "assets/analytics/umami-dashboard.png";
const IMAGE_MARKDOWN_PATH = process.env.ANALYTICS_IMAGE_MARKDOWN_PATH || "assets/analytics/umami-dashboard.png";
const HISTORY_DIR = process.env.ANALYTICS_HISTORY_DIR || "assets/analytics/history";
const UPDATED_AT = process.env.ANALYTICS_UPDATED_AT || new Date().toISOString();

const START_MARKER = "<!-- UMAMI_ANALYTICS_START -->";
const END_MARKER = "<!-- UMAMI_ANALYTICS_END -->";

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.REPORT_TIMEZONE || "Asia/Taipei"
  }).format(date);
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: process.env.REPORT_TIMEZONE || "Asia/Taipei"
  }).format(date);
}

function buildReadmeBlock({ screenshotAvailable }) {
  const imageSection = screenshotAvailable
    ? `<p align="center">
  <img src="${IMAGE_MARKDOWN_PATH}" alt="Umami analytics dashboard" width="100%" />
</p>`
    : "_Analytics screenshot will appear here after `UMAMI_SHARE_URL` is configured and the workflow runs._";

  return `${START_MARKER}
## Website Analytics

Daily Umami analytics snapshot for Jam Tracks Hub.

Last updated: ${formatUpdatedAt(UPDATED_AT)}

${imageSection}
${END_MARKER}`;
}

function updateReadme({ screenshotAvailable }) {
  if (!fs.existsSync(README_PATH)) {
    throw new Error(`README file not found: ${README_PATH}`);
  }

  const readme = fs.readFileSync(README_PATH, "utf8");
  const block = buildReadmeBlock({ screenshotAvailable });

  if (readme.includes(START_MARKER) && readme.includes(END_MARKER)) {
    const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
    fs.writeFileSync(README_PATH, `${readme.replace(pattern, block).trim()}\n`);
    return;
  }

  const insertAfter = "\n## Tool Preview";
  if (readme.includes(insertAfter)) {
    fs.writeFileSync(README_PATH, readme.replace(insertAfter, `\n${block}\n${insertAfter}`));
    return;
  }

  fs.writeFileSync(README_PATH, `${readme.trim()}\n\n${block}\n`);
}

async function findTrafficChartElement(page) {
  const handle = await page.evaluateHandle(() => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0
      );
    };

    const main = document.querySelector("main") || document.querySelector("[role='main']") || document.body;
    const viewportWidth = window.innerWidth;
    const minChartWidth = Math.min(900, viewportWidth * 0.55);

    const candidates = Array.from(main.querySelectorAll("section, article, div"))
      .filter((element) => {
        if (!isVisible(element)) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        const text = element.textContent || "";
        const hasChart = Boolean(element.querySelector("svg, canvas"));

        return (
          hasChart &&
          rect.width >= minChartWidth &&
          rect.height >= 300 &&
          rect.height <= 700 &&
          rect.top >= 180 &&
          rect.top <= window.innerHeight * 0.8 &&
          /Visitors/i.test(text) &&
          /Views/i.test(text)
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          score: rect.top + Math.abs(rect.height - 520) * 0.15 + Math.abs(rect.width - viewportWidth * 0.75) * 0.02
        };
      })
      .sort((a, b) => a.score - b.score);

    if (candidates.length > 0) {
      return candidates[0].element;
    }

    const chart = Array.from(main.querySelectorAll("svg, canvas")).find((element) => {
      const rect = element.getBoundingClientRect();
      return isVisible(element) && rect.width >= minChartWidth && rect.height >= 250;
    });

    if (!chart) {
      return null;
    }

    let container = chart;
    while (container.parentElement && container.parentElement !== main) {
      const rect = container.parentElement.getBoundingClientRect();
      if (rect.width >= minChartWidth && rect.height >= 300 && rect.height <= 700) {
        container = container.parentElement;
      } else {
        break;
      }
    }

    return container;
  });

  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    return null;
  }

  return element;
}

async function captureScreenshot() {
  if (!SHARE_URL) {
    console.log("UMAMI_SHARE_URL is not configured. README analytics block will show setup guidance.");
    updateReadme({ screenshotAvailable: fs.existsSync(IMAGE_PATH) });
    return;
  }

  const { chromium } = require("playwright");
  ensureDir(IMAGE_PATH);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1
  });

  await page.goto(SHARE_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);

  await page.evaluate(() => {
    const removableSelectors = [
      "button:has-text('Close')",
      "[aria-label*='cookie' i]",
      "[class*='cookie' i]",
      "[class*='banner' i]"
    ];

    for (const selector of removableSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        element.remove();
      }
    }
  }).catch(() => {});

  const chartElement = await findTrafficChartElement(page);
  if (chartElement) {
    await chartElement.screenshot({ path: IMAGE_PATH });
    await chartElement.dispose();
  } else {
    console.warn("Could not find the Umami traffic chart. Falling back to a fixed chart-area crop.");
    await page.screenshot({
      path: IMAGE_PATH,
      clip: { x: 250, y: 280, width: 1300, height: 560 }
    });
  }

  const historyPath = path.join(HISTORY_DIR, `${formatHistoryDate(UPDATED_AT)}.png`);
  ensureDir(historyPath);
  fs.copyFileSync(IMAGE_PATH, historyPath);

  await browser.close();
  updateReadme({ screenshotAvailable: true });
  console.log(`Saved Umami screenshot to ${IMAGE_PATH}`);
  console.log(`Saved Umami history screenshot to ${historyPath}`);
}

captureScreenshot().catch((error) => {
  console.error(error);
  process.exit(1);
});
