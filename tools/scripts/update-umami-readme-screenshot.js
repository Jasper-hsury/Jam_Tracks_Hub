const fs = require("fs");
const path = require("path");

const { SnapshotError, IMAGE, decodePng, buildSnapshot, safeFailure } = require("./umami-snapshot-contract");
const { requireShareCredential } = require("./umami-share-security");

const ALL_TIME_FAILURE = "UMAMI_ALL_TIME_RANGE_NOT_CONFIRMED";

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

async function findDashboardIssue(page) {
  return page.evaluate(() => {
    const visibleText = document.body?.innerText || "";
    const errorPatterns = [
      /Something went wrong/i,
      /Cannot destructure property/i,
      /Application error/i,
      /Unhandled Runtime Error/i,
      /TypeError:/i
    ];

    const matchedError = errorPatterns.find((pattern) => pattern.test(visibleText));
    if (matchedError) {
      return "INVALID_DASHBOARD";
    }

    if (!/Visitors/i.test(visibleText) || !/Views/i.test(visibleText)) {
      return "The shared Umami dashboard loaded, but the expected Visitors/Views chart text was not present.";
    }

    return "";
  });
}

function isAllTimeRangeUrl(value) {
  try {
    const date = new URL(value).searchParams.get("date");
    return typeof date === "string" && date.endsWith(":all");
  } catch {
    return false;
  }
}

async function hasVisibleLocator(locator, limit = 20) {
  const count = Math.min(await locator.count(), limit);
  for (let index = 0; index < count; index++) {
    if (await locator.nth(index).isVisible()) return true;
  }
  return false;
}

async function isRangeMenuClosed(page) {
  return !(await hasVisibleLocator(page.locator("[role='listbox'], [data-slot='select-content']")));
}

async function closeRangeMenu(page) {
  if (!(await isRangeMenuClosed(page))) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
  }
  if (!(await isRangeMenuClosed(page))) throw new SnapshotError(ALL_TIME_FAILURE);
}

async function selectAllTimeRange(page, { controlAttempts = 40, optionAttempts = 10, pollMs = 250 } = {}) {
  if (isAllTimeRangeUrl(page.url())) {
    await closeRangeMenu(page);
    return;
  }

  let selected = false;
  for (let attempt = 0; attempt < controlAttempts && !selected; attempt++) {
    const triggerGroups = [page.getByRole("combobox"), page.locator("[data-slot='select-trigger']")];
    for (const triggers of triggerGroups) {
      const count = Math.min(await triggers.count(), 10);
      for (let index = 0; index < count; index++) {
        const trigger = triggers.nth(index);
        if (!(await trigger.isVisible())) continue;
        try { await trigger.click({ timeout: 5000 }); }
        catch { continue; }

        const options = page.getByRole("option", { name: "All time", exact: true });
        for (let optionAttempt = 0; optionAttempt < optionAttempts; optionAttempt++) {
          const optionCount = Math.min(await options.count(), 10);
          for (let optionIndex = 0; optionIndex < optionCount; optionIndex++) {
            const option = options.nth(optionIndex);
            if (!(await option.isVisible())) continue;
            await option.click({ timeout: 5000 });
            selected = true;
            break;
          }
          if (selected) break;
          await page.waitForTimeout(pollMs);
        }
        if (selected) break;
        await closeRangeMenu(page);
      }
      if (selected) break;
    }
    if (!selected) await page.waitForTimeout(pollMs);
  }

  if (!selected) throw new SnapshotError(ALL_TIME_FAILURE);
  for (let attempt = 0; attempt < 20 && !isAllTimeRangeUrl(page.url()); attempt++) {
    await page.waitForTimeout(pollMs);
  }
  if (!isAllTimeRangeUrl(page.url())) throw new SnapshotError(ALL_TIME_FAILURE);
  await closeRangeMenu(page);
}

async function readDashboardStability(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
    };
    const root = document.querySelector("main") || document.querySelector("[role='main']") || document.body;
    const text = root?.textContent || "";
    const loading = Array.from(root?.querySelectorAll("[aria-busy='true'], [data-loading='true'], [data-slot*='skeleton'], [class*='skeleton' i]") || []).some(isVisible);
    const charts = Array.from(root?.querySelectorAll("svg, canvas") || [])
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return isVisible(element) && rect.width >= 300 && rect.height >= 100;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)].join(":");
      })
      .sort();
    return {
      ready: !loading && /Visitors/i.test(text) && /Views/i.test(text) && charts.length > 0,
      signature: charts.join("|")
    };
  });
}

async function waitForAllTimeDashboardStability(page, { timeoutMs = 30000, pollMs = 500, stableSamples = 3, readState = readDashboardStability } = {}) {
  const attempts = Math.max(stableSamples, Math.ceil(timeoutMs / pollMs));
  let previous = "", consecutive = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (!isAllTimeRangeUrl(page.url())) throw new SnapshotError(ALL_TIME_FAILURE);
    const menuClosed = await isRangeMenuClosed(page);
    const state = await readState(page);
    if (menuClosed && state?.ready && state.signature) {
      consecutive = state.signature === previous ? consecutive + 1 : 1;
      previous = state.signature;
      if (consecutive >= stableSamples) return;
    } else {
      previous = "";
      consecutive = 0;
    }
    if (attempt + 1 < attempts) await page.waitForTimeout(pollMs);
  }
  throw new SnapshotError(ALL_TIME_FAILURE);
}

async function prepareAllTimeDashboard(page, options) {
  await selectAllTimeRange(page, options);
  await waitForAllTimeDashboardStability(page, options);
  if (!isAllTimeRangeUrl(page.url()) || !(await isRangeMenuClosed(page))) throw new SnapshotError(ALL_TIME_FAILURE);
}

async function captureScreenshot(shareUrl, chromium = require("playwright").chromium) {
  try {
    const url = new URL(shareUrl);
    if (url.protocol !== "https:" || url.hostname !== "cloud.umami.is" || url.username || url.password || !url.pathname.startsWith("/share/")) throw new Error();
  } catch { throw new SnapshotError("FETCH_FAILURE"); }
  let browser;
  try { browser = await chromium.launch(); } catch { throw new SnapshotError("SCREENSHOT_FAILURE"); }
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1200 },
      deviceScaleFactor: 1
    });

    try {
      const response = await page.goto(shareUrl, { waitUntil: "networkidle", timeout: 60000 });
      if (!response?.ok() || new URL(page.url()).origin !== "https://cloud.umami.is") throw new Error();
    } catch { throw new SnapshotError("FETCH_FAILURE"); }
    await page.evaluate(() => {
      const removableSelectors = [
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

    await prepareAllTimeDashboard(page);

    const dashboardIssue = await findDashboardIssue(page);
    if (dashboardIssue) {
      throw new SnapshotError("INVALID_DASHBOARD");
    }

    const chartElement = await findTrafficChartElement(page);
    if (!chartElement) {
      throw new SnapshotError("INVALID_DASHBOARD");
    }

    let image;
    try { image = await chartElement.screenshot({ type: "png", animations: "disabled" }); }
    catch { throw new SnapshotError("SCREENSHOT_FAILURE"); }
    finally { await chartElement.dispose(); }
    decodePng(image);
    return image;
  } finally {
    await browser.close();
  }
}

// Capture and validate completely before touching any last-known-good output.
// The remote writer consumes this in-memory result and publishes one Git tree.
async function generateSnapshot({ readme, previousImage, shareUrl, now = new Date().toISOString(), capture = captureScreenshot }) {
  const image = await capture(shareUrl);
  return buildSnapshot({ readme, previousImage, image, now });
}
async function main() {
  const root = process.cwd();
  const shareUrl = requireShareCredential(process.env.UMAMI_SHARE_URL);
  const result = await generateSnapshot({ readme: fs.readFileSync(path.join(root, "README.md"), "utf8"), previousImage: fs.readFileSync(path.join(root, IMAGE)), shareUrl });
  // CLI is for local generation only. Workflow publication is handled separately.
  for (const file of result.files) {
    const target = path.join(root, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.bytes);
  }
  console.log(result.state);
}
if (require.main === module) main().catch(error => { console.error(safeFailure(error)); process.exitCode = 1; });
module.exports = { ALL_TIME_FAILURE, captureScreenshot, generateSnapshot, findDashboardIssue, findTrafficChartElement, isAllTimeRangeUrl, isRangeMenuClosed, selectAllTimeRange, readDashboardStability, waitForAllTimeDashboardStability, prepareAllTimeDashboard };
