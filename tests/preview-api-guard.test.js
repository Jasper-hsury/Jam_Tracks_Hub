const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { File } = require("node:buffer");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const PREVIEW_HOST = "chore-example-jamtrackshub.jasperhsu941029.workers.dev";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

async function configurationFor(hostname) {
  const { resolveKeyFinderConfiguration } = await import(path.join(root, "src/services/keyFinderApi.mjs"));
  return resolveKeyFinderConfiguration({ location: { hostname }, localStorage: memoryStorage() });
}

function recordingApi() {
  const calls = [];
  const record = name => async (...args) => { calls.push([name, args[0]]); throw new Error("network must not be used"); };
  return {
    calls,
    api: {
      health: record("health"),
      createFileJob: record("createFileJob"),
      createYoutubeJob: record("createYoutubeJob"),
      getJob: record("getJob")
    }
  };
}

test("only Cloudflare preview hosts count as previews", async () => {
  const { isPreviewHost } = await import(path.join(root, "src/services/siteHost.mjs"));
  assert.equal(isPreviewHost(PREVIEW_HOST), true);
  assert.equal(isPreviewHost("0a1b2c3d-jamtrackshub.jasperhsu941029.workers.dev"), true);
  ["jamtrackshub.com", "www.jamtrackshub.com", "api.jamtrackshub.com", "localhost", "127.0.0.1", "", undefined, "workers.dev.example.com"]
    .forEach(hostname => assert.equal(isPreviewHost(hostname), false, String(hostname)));
});

test("Key Finder turns the analyzer off on previews and keeps it on elsewhere", async () => {
  const preview = await configurationFor(PREVIEW_HOST);
  assert.equal(preview.apiAvailable, false);
  assert.deepEqual(preview.youtubeSiteApiBaseUrlCandidates, []);
  assert.equal(preview.autoProbeYoutubeHelper, false);
  for (const hostname of ["jamtrackshub.com", "localhost"]) {
    const config = await configurationFor(hostname);
    assert.equal(config.apiAvailable, true, hostname);
    assert.ok(config.youtubeSiteApiBaseUrlCandidates.length > 0, hostname);
  }
});

test("a preview Key Finder never calls the analyzer, on load or on upload", async () => {
  const { useKeyFinder } = await import(path.join(root, "src/composables/useKeyFinder.js"));
  const { calls, api } = recordingApi();
  const finder = useKeyFinder({
    config: await configurationFor(PREVIEW_HOST),
    api,
    storage: memoryStorage(),
    sleep: async () => {},
    setIntervalFn: () => 0,
    clearIntervalFn: () => {}
  });
  finder.initialize();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finder.apiStatus.state, "is-offline");
  assert.equal(finder.apiStatus.code, "apiPreview");
  const ok = await finder.submitFile(new File([new Uint8Array(2048)], "song.mp3", { type: "audio/mpeg" }));
  assert.equal(ok, false);
  assert.equal(finder.phase.value, "failed");
  assert.equal(finder.apiStatus.code, "apiPreview");
  assert.deepEqual(calls, []);
  finder.dispose();
});

test("the Key Finder and service pages explain the preview instead of waking the analyzer", () => {
  const view = read("src/views/KeyFinderView.vue");
  assert.match(view, /const apiOnPreview = computed\(\(\) => finder\.apiStatus\.code === "apiPreview"\);/);
  assert.match(view, /<a v-if="!apiOnPreview" class="service-wake-link"/);
  const waking = read("src/views/ServiceWakingView.vue");
  assert.match(waking, /const onPreview = isPreviewHost\(window\.location\.hostname\);/);
  assert.match(waking, /if \(onPreview\) \{\s*statusKey\.value = "preview";\s*return;\s*\}\s*attempts\.value \+= 1;/);
  assert.match(waking, /:disabled="checking \|\| onPreview"/);
  for (const locale of ["en", "zh-TW"]) {
    const keyFinder = JSON.parse(read(`locales/${locale}/common.json`)).pages.keyFinder;
    ["apiPreview", "previewTitle", "previewCopy"].forEach(key => assert.ok(keyFinder[key]?.trim(), `${locale} ${key}`));
    assert.match(keyFinder.previewCopy, /jamtrackshub\.com/);
  }
});
