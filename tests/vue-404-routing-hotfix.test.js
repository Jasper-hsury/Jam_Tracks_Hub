const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("uses the native Cloudflare 404 page without an SPA fallback", () => {
  const config = JSON.parse(read("wrangler.jsonc"));

  assert.equal(config.assets.directory, "./dist");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.not_found_handling, "404-page");
  assert.equal(config.assets.html_handling, undefined);
  assert.deepEqual(config.assets.run_worker_first, ["/api", "/api/*"]);
  assert.doesNotMatch(read("wrangler.jsonc"), /single-page-application/);
});

test("keeps every Worker API route ahead of the static 404 fallback", () => {
  const worker = read("worker.js");
  const assetFallback = worker.indexOf("return env.ASSETS.fetch(request)");

  [
    'url.pathname === "/api/subscribe"',
    'url.pathname === "/api/feedback"',
    'url.pathname === "/api/subscribers.csv"',
    'url.pathname === "/api" || url.pathname.startsWith("/api/")'
  ].forEach(route => {
    const routeIndex = worker.indexOf(route);
    assert.notEqual(routeIndex, -1, route);
    assert.ok(routeIndex < assetFallback, route);
  });
});

test("keeps the Vue 404 document safe at nested unknown URLs", () => {
  const html = read("404.html");
  const view = read("src/views/NotFoundView.vue");
  const i18nInit = read("scripts/i18n-init.js");
  const i18n = read("scripts/i18n.js");
  const site = read("scripts/site.js");
  const localReferences = Array.from(html.matchAll(/(?:href|src)="([^"]+)"/g), match => match[1])
    .filter(reference => !/^(?:https?:|data:|#)/.test(reference));

  assert.ok(localReferences.length > 0);
  localReferences.forEach(reference => assert.match(reference, /^\//, reference));
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<div id="vue-404-root"><\/div>/);
  assert.doesNotMatch(html, /<base\b|index\.html[^"']*fallback/i);
  assert.match(view, /href="\/index\.html"/);
  assert.match(view, /href="\/key-finder\.html"/);
  assert.match(i18nInit, /syncLoadJson\("\/locales\/en\/common\.json"\)/);
  assert.match(i18n, /fetch\(`\/locales\/\$\{DEFAULT_LANGUAGE\}\/common\.json`/);
  assert.match(i18n, /fetch\(`\/locales\/\$\{language\}\/common\.json`/);
  assert.match(i18n, /legalLink\.href = "\/legal\.html"/);
  assert.match(site, /workspaceLink\.href = "\/song-workspace\.html"/);
  assert.match(site, /anchor\.href = `\/\$\{link\.href\}`/);
});

test("keeps HTML routing implicit and records the patch version", () => {
  const packageJson = JSON.parse(read("package.json"));
  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  const viteConfig = read("vite.config.mjs");

  assert.equal(packageJson.version, "2.0.3");
  assert.match(verifier, /native 404-page fallback/);
  assert.match(verifier, /Worker-first routing is not limited to API paths/);
  assert.match(verifier, /404 local reference is not root-relative/);
  assert.match(viteConfig, /replaceAll\(`"\/\$\{asset\}"`/);
  assert.match(viteConfig, /replaceAll\(`"\$\{asset\}"`/);
  assert.match(viteConfig, /usesRootRelativeLegacyAssets/);
  assert.match(viteConfig, /restoredPrefix/);
});
