const fs = require("fs");

const DEFAULT_CLOUD_API_ENDPOINT = "https://api.umami.is/v1";
const DEFAULT_DAYS = 7;
const OUTPUT_FILE = process.env.REPORT_OUTPUT || "analytics-report.md";
const TITLE_FILE = process.env.REPORT_TITLE_OUTPUT || "analytics-report-title.txt";
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;
const REPORT_DAYS = Number.parseInt(process.env.REPORT_DAYS || `${DEFAULT_DAYS}`, 10);
const REPORT_TIMEZONE = process.env.REPORT_TIMEZONE || "Asia/Taipei";

const TOOL_PAGES = [
  { name: "Home", patterns: [/^\/$/, /^\/index\.html$/] },
  { name: "Tracks", patterns: [/^\/tracks(?:\.html)?$/] },
  { name: "Chord Dictionary", patterns: [/^\/chord-dictionary(?:\.html)?$/] },
  { name: "Scale Explorer", patterns: [/^\/scale(?:\.html)?$/] },
  { name: "Key Finder", patterns: [/^\/key-finder(?:\.html)?$/] },
  { name: "Chord Progressions", patterns: [/^\/chord-progressions(?:\.html)?$/] },
  { name: "Progression Writer", patterns: [/^\/progression-writer(?:\.html)?$/] },
  { name: "Fretboard Trainer", patterns: [/^\/fretboard-trainer(?:\.html)?$/] }
];

function isoDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function percent(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(1)}%`;
}

function metricValue(stats, key) {
  const item = stats?.[key];
  if (item && typeof item === "object" && "value" in item) {
    return item.value || 0;
  }
  return item || 0;
}

function metricChange(stats, key) {
  const item = stats?.[key];
  if (item && typeof item === "object" && "change" in item) {
    const change = Number(item.change || 0);
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  }
  return "n/a";
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

function selfHostedApiEndpoint(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`Umami request failed: ${response.status} ${response.statusText} ${url}\n${detail || ""}`);
  }

  return payload;
}

async function getAuthContext() {
  const apiKey = process.env.UMAMI_API_KEY;
  if (apiKey) {
    return {
      apiEndpoint: normalizeBaseUrl(process.env.UMAMI_API_ENDPOINT || DEFAULT_CLOUD_API_ENDPOINT),
      headers: {
        "x-umami-api-key": apiKey
      },
      authMode: "API key"
    };
  }

  const baseUrl = process.env.UMAMI_BASE_URL;
  const username = process.env.UMAMI_USERNAME;
  const password = process.env.UMAMI_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error(
      "Missing Umami credentials. Set UMAMI_WEBSITE_ID plus either UMAMI_API_KEY, or UMAMI_BASE_URL + UMAMI_USERNAME + UMAMI_PASSWORD."
    );
  }

  const apiEndpoint = selfHostedApiEndpoint(baseUrl);
  const login = await requestJson(`${apiEndpoint}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  if (!login?.token) {
    throw new Error("Umami login succeeded but did not return a token.");
  }

  return {
    apiEndpoint,
    headers: {
      Authorization: `Bearer ${login.token}`
    },
    authMode: "self-hosted login"
  };
}

function buildUrl(apiEndpoint, path, query = {}) {
  const url = new URL(`${apiEndpoint}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function fetchMetrics(context, type, startAt, endAt, limit = 10) {
  return requestJson(
    buildUrl(context.apiEndpoint, `/websites/${WEBSITE_ID}/metrics`, {
      startAt,
      endAt,
      type,
      limit
    }),
    { headers: context.headers }
  );
}

async function loadAnalytics() {
  if (process.env.UMAMI_MOCK === "1") {
    return sampleAnalytics();
  }

  if (!WEBSITE_ID) {
    throw new Error("Missing UMAMI_WEBSITE_ID.");
  }

  const endAt = Date.now();
  const startAt = endAt - REPORT_DAYS * 24 * 60 * 60 * 1000;
  const context = await getAuthContext();

  const [stats, pages, referrers, countries] = await Promise.all([
    requestJson(
      buildUrl(context.apiEndpoint, `/websites/${WEBSITE_ID}/stats`, { startAt, endAt }),
      { headers: context.headers }
    ),
    fetchMetrics(context, "url", startAt, endAt, 25),
    fetchMetrics(context, "referrer", startAt, endAt, 10),
    fetchMetrics(context, "country", startAt, endAt, 10)
  ]);

  return {
    authMode: context.authMode,
    startAt,
    endAt,
    stats,
    pages,
    referrers,
    countries
  };
}

function sampleAnalytics() {
  const endAt = Date.now();
  const startAt = endAt - REPORT_DAYS * 24 * 60 * 60 * 1000;
  return {
    authMode: "mock data",
    startAt,
    endAt,
    stats: {
      pageviews: { value: 1280, change: 18.2 },
      visitors: { value: 420, change: 11.4 },
      visits: { value: 610, change: 14.8 },
      bounces: { value: 210, change: -5.1 }
    },
    pages: [
      { x: "/tracks.html", y: 430 },
      { x: "/progression-writer", y: 260 },
      { x: "/chord-dictionary.html", y: 190 },
      { x: "/key-finder.html", y: 72 },
      { x: "/scale.html", y: 64 }
    ],
    referrers: [
      { x: "youtube.com", y: 210 },
      { x: "google.com", y: 120 },
      { x: "(direct)", y: 98 }
    ],
    countries: [
      { x: "TW", y: 180 },
      { x: "US", y: 90 },
      { x: "JP", y: 42 }
    ]
  };
}

function normalizePath(value) {
  if (!value || value === "(direct)") {
    return "/";
  }
  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).pathname || "/";
    }
  } catch {
    return value;
  }
  const path = value.split("?")[0].split("#")[0];
  return path.startsWith("/") ? path : `/${path}`;
}

function classifyToolPages(pages) {
  const rows = TOOL_PAGES.map(tool => ({ name: tool.name, views: 0 }));

  for (const page of pages || []) {
    const path = normalizePath(page.x);
    const value = Number(page.y || 0);
    const tool = TOOL_PAGES.find(item => item.patterns.some(pattern => pattern.test(path)));
    if (tool) {
      rows.find(row => row.name === tool.name).views += value;
    }
  }

  return rows.sort((a, b) => b.views - a.views);
}

function markdownTable(headers, rows) {
  const safeRows = rows.length ? rows : [["No data", "-"]];
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...safeRows.map(row => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function metricRows(items, label = "Item") {
  return (items || []).slice(0, 10).map((item, index) => [
    `${index + 1}`,
    item.x || "(unknown)",
    number(item.y)
  ]);
}

function recommendation(toolRows) {
  const active = toolRows.filter(row => row.views > 0);
  if (!active.length) {
    return "No tool-page traffic was found in this report window yet.";
  }

  const top = active[0];
  const low = [...active].sort((a, b) => a.views - b.views)[0];
  return [
    `Highest tool interest: **${top.name}** with **${number(top.views)}** views.`,
    `Lowest tracked tool traffic: **${low.name}** with **${number(low.views)}** views.`,
    "Use this to prioritize the next UX polish, tutorial copy, or feature work."
  ].join("\n\n");
}

function buildReport(analytics) {
  const startDate = isoDate(new Date(analytics.startAt));
  const endDate = isoDate(new Date(analytics.endAt));
  const pageviews = metricValue(analytics.stats, "pageviews");
  const visitors = metricValue(analytics.stats, "visitors");
  const visits = metricValue(analytics.stats, "visits");
  const bounces = metricValue(analytics.stats, "bounces");
  const bounceRate = visits ? (bounces / visits) * 100 : 0;
  const toolRows = classifyToolPages(analytics.pages);

  const title = `Jam Tracks Hub analytics: ${startDate} to ${endDate}`;
  const body = [
    `# ${title}`,
    "",
    `Generated by GitHub Actions from Umami data using ${analytics.authMode}.`,
    "",
    "## Overview",
    "",
    markdownTable(
      ["Metric", "Value", "Change"],
      [
        ["Pageviews", number(pageviews), metricChange(analytics.stats, "pageviews")],
        ["Visitors", number(visitors), metricChange(analytics.stats, "visitors")],
        ["Visits", number(visits), metricChange(analytics.stats, "visits")],
        ["Bounce rate", percent(bounceRate), metricChange(analytics.stats, "bounces")]
      ]
    ),
    "",
    "## Top Pages",
    "",
    markdownTable(["Rank", "Page", "Views"], metricRows(analytics.pages, "Page")),
    "",
    "## Top Referrers",
    "",
    markdownTable(["Rank", "Referrer", "Visits"], metricRows(analytics.referrers, "Referrer")),
    "",
    "## Top Countries / Regions",
    "",
    markdownTable(["Rank", "Country", "Visits"], metricRows(analytics.countries, "Country")),
    "",
    "## Tool Usage Priority",
    "",
    markdownTable(
      ["Tool", "Tracked views"],
      toolRows.map(row => [row.name, number(row.views)])
    ),
    "",
    "## Priority Signal",
    "",
    recommendation(toolRows),
    "",
    "---",
    "",
    "This report is intentionally high-level. Use the Umami dashboard for deeper filtering."
  ].join("\n");

  return { title, body };
}

async function main() {
  const analytics = await loadAnalytics();
  const report = buildReport(analytics);
  fs.writeFileSync(OUTPUT_FILE, `${report.body}\n`);
  fs.writeFileSync(TITLE_FILE, `${report.title}\n`);
  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`Wrote ${TITLE_FILE}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
