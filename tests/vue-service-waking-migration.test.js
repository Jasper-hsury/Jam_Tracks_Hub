const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("makes Service Waking the fourth production Vue-owned MPA entry", () => {
  const config = read("vite.config.mjs");
  const html = read("service-waking.html");
  const entry = read("src/entries/service-waking.js");

  assert.match(config, /"service-waking":\s*resolve\(root,\s*"service-waking\.html"\)/);
  assert.match(html, /<div id="vue-service-waking-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/service-waking\.js"><\/script>/);
  assert.doesNotMatch(html, /scripts\/service-waking\.js/);
  assert.match(entry, /createApp\(ServiceWakingView\)\.mount\(mountTarget\)/);
  assert.equal(fs.existsSync(path.join(root, "scripts/service-waking.js")), false);
});

test("preserves Service Waking metadata, analytics, shell, and shared runtime", () => {
  const html = read("service-waking.html");

  assert.match(html, /<title>Waking the Analyzer \| Jam Tracks Hub<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/service-waking\.html">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/jamtrackshub\.com\/service-waking\.html">/);
  assert.match(html, /<body data-i18n-title="service\.wakingAnalyzer">/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.match(html, /scripts\/site-config\.js\?v=20260729-youtube-key-api/);
  assert.match(html, /<nav class="navbar">/);
  assert.match(html, /<footer class="footer">/);
});

test("preserves Service Waking API resolution and request contract with controlled fetch", async () => {
  const serviceUrl = pathToFileURL(path.join(root, "src/services/serviceHealthApi.mjs"));
  const { checkServiceHealth, resolveServiceApiBase } = await import(serviceUrl.href);

  assert.equal(resolveServiceApiBase({
    JASPER_MUSIC_CONFIG: { apiBaseUrl: "https://api.jamtrackshub.com/" },
    KEY_FINDER_API_BASE: "https://fallback.invalid",
    location: { origin: "https://jamtrackshub.com" }
  }), "https://api.jamtrackshub.com");
  assert.equal(resolveServiceApiBase({
    KEY_FINDER_API_BASE: "http://127.0.0.1:8000/",
    location: { origin: "https://jamtrackshub.com" }
  }), "http://127.0.0.1:8000");
  assert.equal(resolveServiceApiBase({
    location: { origin: "https://jamtrackshub.com" }
  }), "https://jamtrackshub.com");

  const signal = new AbortController().signal;
  let request;
  await checkServiceHealth({
    apiBase: "https://api.jamtrackshub.com",
    signal,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true };
    }
  });
  assert.deepEqual(request, {
    url: "https://api.jamtrackshub.com/api/health",
    options: { cache: "no-store", signal }
  });
  await assert.rejects(checkServiceHealth({
    apiBase: "https://api.jamtrackshub.com",
    signal,
    fetchImpl: async () => ({ ok: false })
  }), /Service is still starting/);
});

test("preserves Service Waking UI states, polling, navigation, and locale ownership", () => {
  const view = read("src/views/ServiceWakingView.vue");

  assert.match(view, /const HEALTH_TIMEOUT_MS = 8000/);
  assert.match(view, /const RETRY_DELAY_MS = 4000/);
  assert.match(view, /const REDIRECT_DELAY_MS = 700/);
  assert.match(view, /const MAX_AUTOMATIC_ATTEMPTS = 6/);
  assert.match(view, /statusKey\.value = "checking"/);
  assert.match(view, /statusKey\.value = "ready"/);
  assert.match(view, /attempts\.value < MAX_AUTOMATIC_ATTEMPTS[\s\S]*?"starting"[\s\S]*?: "unavailable"/);
  assert.match(view, /window\.location\.href = "key-finder\.html"/);
  assert.match(view, /<p id="wakeMessage" role="status" aria-live="polite">/);
  assert.match(view, /:disabled="checking"/);
  assert.match(view, /useLegacyLocale\(\)/);
  assert.doesNotMatch(view, /data-i18n|umami|analytics|data-umami-event/i);
});

test("keeps Service Waking bounded and preserves remaining legacy output", () => {
  const packageJson = JSON.parse(read("package.json"));
  const verifier = read("tools/scripts/verify-cloudflare-build.js");

  assert.equal(packageJson.version, "2.0.3");
  assert.equal(packageJson.dependencies.vue, "3.5.42");
  assert.match(verifier, /const viteOwnedRootHtml = new Set\(\["404\.html", "legal\.html", "privacy-policy\.html", "service-waking\.html", "feedback\.html"\]\)/);
  assert.match(verifier, /Service Waking canonical metadata differs/);
  assert.match(verifier, /compiled Vue Service Waking mount marker is missing/);
  assert.match(verifier, /root HTML is not byte-identical/);
});
