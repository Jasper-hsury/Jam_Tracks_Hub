const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { File } = require("node:buffer");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const fixture = JSON.parse(read("tests/fixtures/key-finder-contract.json"));
const backendFiles = [
  "Dockerfile", "render.yaml", "worker.js", "wrangler.jsonc", "api-server/app.py",
  "api-server/detect_key.py", "api-server/render.yaml", "api-server/Dockerfile",
  "functions/api/feedback.js", "functions/api/subscribe.js", "functions/api/subscribers.csv.js"
];
const backendHashes = {
  "Dockerfile": "ad00a607be344bb68d8d6ed89b8eeda3a0f9cf93272e50f4a32035c67756fbe7",
  "render.yaml": "e731cee12947a57bafa3d658ce42965f24659d1ed228cbf457ee613564cb760e",
  "worker.js": "38bb981a849874c0c4421c00c73aef2bf0e2fbfa857f3a85dc63f145af7f970c",
  "wrangler.jsonc": "fcd1a460b0bee67ad6f0b33076234c682c22580d48ee3f4ffbe339d2a88145db",
  "api-server/app.py": "e564225624b4737be27f46c2cf172645e3ab1b03215b7d0d282106fc268b2052",
  "api-server/detect_key.py": "ba1d315c5d6ee9bde60144bb069eb2647a5ca200b1768dabed81709783a6a753",
  "api-server/render.yaml": "d2a80a7bb1c6d92c3c380c0c43e0c69cbf2bdff9a189f979b2e1c47ff11bf003",
  "api-server/Dockerfile": "a478c21825dbeafe8a49787af380b88c20f1fc44286652edf8b3b5430d70c1aa",
  "functions/api/feedback.js": "9c44fbb9c14dc33e634a6f797328d7d6c1e3a1a667888ea879af551f96f934cf",
  "functions/api/subscribe.js": "8c4ae0980469bc0e5af2145d1b155f76215251be8089efb40c51d7dce8e0ca58",
  "functions/api/subscribers.csv.js": "aa1de35104c400b351a8d657d2f8e48d362708a782f8a5da1506c112566c7f18"
};

function response(data, status = 200, statusText = "OK") {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, { status, statusText, headers: { "content-type": "application/json" } });
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    value(key) { return values.get(key); }
  };
}

function config() {
  return {
    apiBaseUrl: "https://api.jamtrackshub.com",
    productionApiBaseUrl: "https://api.jamtrackshub.com",
    youtubeHelperBaseUrl: "http://localhost:8765",
    youtubeSiteApiBaseUrlCandidates: ["https://api.jamtrackshub.com"],
    youtubeHelperBaseUrlCandidates: ["http://localhost:8765", "http://127.0.0.1:8765"]
  };
}

async function useFinder(options = {}) {
  const { useKeyFinder } = await import(path.join(root, "src/composables/useKeyFinder.js"));
  return useKeyFinder({ config: config(), storage: storage(), sleep: async () => {}, ...options });
}

test("owns Key Finder through the established Vue MPA shell", () => {
  const html = read("key-finder.html");
  const entry = read("src/entries/key-finder.js");
  const view = read("src/views/KeyFinderView.vue");
  const vite = read("vite.config.mjs");
  assert.match(html, /data-vue-page="key-finder"/);
  assert.match(html, /id="vue-key-finder-root"/);
  assert.match(html, /type="module" src="\/src\/entries\/key-finder\.js"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|key-finder)\.js/);
  assert.doesNotMatch(html, /<nav class="navbar"|<footer class="footer"|class="skip-link"/);
  assert.match(entry, /mountSitePage\(\{[\s\S]*activePage: "key-finder"[\s\S]*mountId: "vue-key-finder-root"/);
  assert.match(view, /<main id="main-content"/);
  assert.match(vite, /"key-finder": resolve\(root, "key-finder\.html"\)/);
  assert.equal(fs.existsSync(path.join(root, "scripts/key-finder.js")), false);
});

test("freezes exact API request paths, methods, headers, bodies, and polling routes", async () => {
  const calls = [];
  const { createKeyFinderApi } = await import(path.join(root, "src/services/keyFinderApi.mjs"));
  const api = createKeyFinderApi({ fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return response(fixture.responses.health);
  } });
  const origin = "https://api.jamtrackshub.com";
  const signal = new AbortController().signal;
  await api.health(origin, signal);
  await api.createYoutubeJob(origin, fixture.requests.youtubeCreate.body.url, signal);
  await api.getJob(origin, "youtube", "job-youtube", signal);
  const file = new File(["tiny"], "fixture.wav", { type: "audio/wav" });
  await api.createFileJob(origin, file, signal);
  await api.getJob(origin, "file", "job-file", signal);
  assert.deepEqual(calls.map(call => ({
    url: call.url,
    method: call.options.method,
    cache: call.options.cache,
    contentType: call.options.headers?.["Content-Type"]
  })), [
    { url: `${origin}/api/health`, method: "GET", cache: "no-store", contentType: undefined },
    { url: `${origin}/api/analyze/jobs`, method: "POST", cache: undefined, contentType: "application/json" },
    { url: `${origin}/api/analyze/jobs/job-youtube`, method: "GET", cache: "no-store", contentType: undefined },
    { url: `${origin}/api/analyze-file/jobs`, method: "POST", cache: undefined, contentType: undefined },
    { url: `${origin}/api/analyze-file/jobs/job-file`, method: "GET", cache: "no-store", contentType: undefined }
  ]);
  assert.deepEqual(JSON.parse(calls[1].options.body), fixture.requests.youtubeCreate.body);
  assert.equal(calls[3].options.body.get("file").name, "fixture.wav");
  const healthApi = createKeyFinderApi({ fetchImpl: async () => new Response("OK", { status: 200 }) });
  assert.equal((await healthApi.health(origin, signal)).status, 200, "health keeps the legacy status-only response contract");
});

test("handles JSON, backend, protection, unavailable, empty, and malformed response schemas", async () => {
  const { readKeyFinderApiResponse } = await import(path.join(root, "src/services/keyFinderApi.mjs"));
  assert.deepEqual(await readKeyFinderApiResponse(response(fixture.responses.completed, 200)), fixture.responses.completed);
  await assert.rejects(() => readKeyFinderApiResponse(response(fixture.responses.validationError, 400, "Bad Request")), /Only YouTube links/);
  await assert.rejects(() => readKeyFinderApiResponse(response(fixture.responses.rateLimited, 429, "Too Many Requests")), /Rate limit exceeded/);
  await assert.rejects(() => readKeyFinderApiResponse(response("", 503, "Service Unavailable")), /Render returned 503/);
  await assert.rejects(() => readKeyFinderApiResponse(response("", 200)), /empty response/);
  await assert.rejects(() => readKeyFinderApiResponse(response(fixture.responses.malformed, 200)), /instead of JSON/);
});

test("preserves file and URL validation, progress bounds, result spelling, and deep links", async () => {
  const domain = await import(path.join(root, "src/music/keyFinder.mjs"));
  assert.deepEqual(domain.validateYoutubeInput("   "), { valid: false, code: "empty-youtube", url: "" });
  assert.deepEqual(domain.validateYoutubeInput(" not-a-url "), { valid: true, url: "not-a-url" });
  assert.equal(domain.validateFileSelection(null).code, "empty-file");
  assert.equal(domain.validateFileSelection({ name: "large.mp3", size: 60 * 1024 * 1024 + 1 }).code, "file-too-large");
  assert.equal(domain.validateFileSelection({ name: "large.webm", size: 25 * 1024 * 1024 + 1 }).code, "container-too-large");
  assert.equal(domain.validateFileSelection({ name: "empty.wav", size: 0 }).valid, true, "zero-byte rejection remains backend-owned");
  assert.deepEqual([domain.clampProgress(-1), domain.clampProgress("bad"), domain.clampProgress(58), domain.clampProgress(120)], [0, 0, 58, 100]);
  assert.deepEqual(domain.resultLinks("F# Minor"), {
    scale: "scale.html?key=F%23%20minor",
    dictionary: "chord-dictionary.html?root=F%23&chord=minor",
    progressions: "chord-progressions.html?key=F%23%20minor",
    tracks: "tracks.html?key=F%23%20minor"
  });
  let requests = 0;
  const finder = await useFinder({
    api: {
      health: async () => fixture.responses.health,
      createYoutubeJob: async () => { requests += 1; },
      createFileJob: async () => { requests += 1; }
    }
  });
  assert.equal(await finder.submitYoutube("   "), false);
  assert.equal(finder.phase.value, "validation-error");
  assert.equal(await finder.submitFile(null), false);
  assert.equal(finder.phase.value, "validation-error");
  assert.equal(requests, 0);
});

test("runs exactly one queued-processing-completed poll loop and stores the canonical result", async () => {
  const polls = [fixture.responses.processing, fixture.responses.completed];
  const api = {
    health: async () => fixture.responses.health,
    createYoutubeJob: async () => fixture.responses.queued,
    getJob: async () => polls.shift()
  };
  const local = storage();
  const finder = await useFinder({ api, storage: local, now: () => new Date("2026-09-04T00:00:00Z"), createId: () => "history-1" });
  finder.youtubeUrl.value = fixture.requests.youtubeCreate.body.url;
  assert.equal(await finder.submitYoutube(), true);
  assert.equal(finder.phase.value, "succeeded");
  assert.equal(finder.result.value.final_key, "F# Minor");
  assert.equal(finder.activeJobId.value, null);
  assert.equal(finder.progress.value, 100);
  assert.equal(finder.history.value.length, 1);
  assert.match(local.value("jasperMusicKeyFinderHistory"), /history-1/);
});

test("surfaces backend and network failures and preserves the 8-second health retry contract", async () => {
  const file = new File(["tiny"], "failure.wav", { type: "audio/wav" });
  const backendFailure = await useFinder({
    api: {
      health: async () => fixture.responses.health,
      createFileJob: async () => ({ ...fixture.responses.queued, job_id: "job-file" }),
      getJob: async () => ({ ...fixture.responses.failed, job_id: "job-file" })
    }
  });
  assert.equal(await backendFailure.submitFile(file), false);
  assert.equal(backendFailure.phase.value, "failed");
  assert.match(backendFailure.error.value.message, /Synthetic backend failure/);
  assert.equal(backendFailure.activeJobId.value, null);

  const networkFailure = await useFinder({
    api: {
      health: async () => fixture.responses.health,
      createFileJob: async () => { throw new TypeError("synthetic connection reset"); }
    }
  });
  assert.equal(await networkFailure.submitFile(file), false);
  assert.equal(networkFailure.phase.value, "failed");
  assert.match(networkFailure.error.value.message, /synthetic connection reset/);

  const timers = [];
  let healthCalls = 0;
  const healthFinder = await useFinder({
    api: {
      health: async (_baseUrl, signal) => {
        healthCalls += 1;
        if (healthCalls > 1) return fixture.responses.health;
        return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
      }
    },
    setTimeoutFn: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn: () => {},
    setIntervalFn: () => null,
    clearIntervalFn: () => {}
  });
  const timedHealth = healthFinder.checkApiStatus();
  assert.equal(timers[0].milliseconds, 8000);
  timers[0].callback();
  await timedHealth;
  assert.equal(healthFinder.apiStatus.code, "apiStarting");
  assert.equal(timers.find(timer => timer.milliseconds === 2000)?.milliseconds, 2000);
  await healthFinder.checkApiStatus();
  assert.equal(healthFinder.apiStatus.code, "apiConnected");
  healthFinder.dispose();
});

test("blocks duplicate submits and ignores an old response after reset and a new job", async () => {
  let resolveFirst;
  let creates = 0;
  const firstCreate = new Promise(resolve => { resolveFirst = resolve; });
  const api = {
    health: async () => fixture.responses.health,
    createYoutubeJob: async () => (++creates === 1 ? firstCreate : fixture.responses.completed),
    getJob: async () => fixture.responses.completed
  };
  const finder = await useFinder({ api });
  const first = finder.submitYoutube("https://youtu.be/job-a");
  const duplicate = await finder.submitYoutube("https://youtu.be/duplicate");
  assert.equal(duplicate, false);
  assert.equal(creates, 1);
  finder.resetAnalysis();
  assert.equal(finder.progress.value, 0);
  assert.equal(finder.activeJobId.value, null);
  const second = finder.submitYoutube("https://youtu.be/job-b");
  resolveFirst(fixture.responses.completed);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(finder.result.value.final_key, "F# Minor");
  assert.equal(creates, 2);
});

test("cleans up abortable work on cancel and unmount without stale state", async () => {
  let observedSignal;
  const api = {
    health: async () => fixture.responses.health,
    createYoutubeJob: async (_base, _url, signal) => {
      observedSignal = signal;
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
    }
  };
  const finder = await useFinder({ api });
  const pending = finder.submitYoutube("https://youtu.be/cancel");
  finder.cancel();
  assert.equal(observedSignal.aborted, true);
  assert.equal(await pending, false);
  assert.equal(finder.phase.value, "cancelled");
  assert.equal(finder.activeJobId.value, null);
  const finderTwo = await useFinder({ api });
  const pendingTwo = finderTwo.submitYoutube("https://youtu.be/unmount");
  finderTwo.dispose();
  assert.equal(await pendingTwo, false);
  assert.equal(finderTwo.activeJobId.value, null);

  let helperSignal;
  const lifecycleFinder = await useFinder({
    api: {
      health: async (baseUrl, signal) => {
        if (baseUrl === "https://api.jamtrackshub.com") return fixture.responses.health;
        helperSignal = signal;
        return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
      }
    },
    setIntervalFn: () => null,
    clearIntervalFn: () => {}
  });
  lifecycleFinder.initialize();
  await Promise.resolve();
  lifecycleFinder.dispose();
  assert.equal(helperSignal.aborted, true);
});

test("preserves result mode/history storage and locale/theme-independent request state", async () => {
  const local = storage({ jasperMusicKeyFinderResultMode: "detailed" });
  let resolveCreate;
  const api = {
    health: async () => fixture.responses.health,
    createYoutubeJob: async () => new Promise(resolve => { resolveCreate = resolve; }),
    getJob: async () => fixture.responses.completed
  };
  const finder = await useFinder({ api, storage: local });
  assert.equal(finder.currentResultMode.value, "detailed");
  const pending = finder.submitYoutube("https://youtu.be/locale-theme");
  finder.applyResultMode("quick");
  globalThis.dispatchEvent?.(new Event("jasper:language-change"));
  globalThis.dispatchEvent?.(new Event("jasper:theme-change"));
  resolveCreate(fixture.responses.completed);
  assert.equal(await pending, true);
  assert.equal(finder.result.value.final_key, "F# Minor");
  assert.equal(local.value("jasperMusicKeyFinderResultMode"), "quick");
  finder.clearHistory();
  assert.equal(finder.history.value.length, 0);
  assert.equal(finder.phase.value, "idle");
});

test("uses Vue text bindings and adds no analytics, URL, console, router, or direct-Render egress", () => {
  const implementation = [
    read("src/views/KeyFinderView.vue"),
    read("src/components/key-finder/KeyFinderResult.vue"),
    read("src/components/key-finder/KeyFinderError.vue"),
    read("src/composables/useKeyFinder.js"),
    read("src/services/keyFinderApi.mjs")
  ].join("\n");
  assert.doesNotMatch(implementation, /v-html|innerHTML|document\.title|window\.history|pushState|replaceState|vue-router|pinia/);
  assert.doesNotMatch(implementation, /data-umami-event|umami\.track|sendBeacon|console\./);
  assert.doesNotMatch(implementation, /onrender\.com/);
  assert.match(read("key-finder.html"), /https:\/\/cloud\.umami\.is\/script\.js/);
  assert.match(read("_headers"), /connect-src 'self' https:\/\/cloud\.umami\.is https:\/\/gateway\.umami\.is https:\/\/api\.jamtrackshub\.com/);
  assert.doesNotMatch(read("_headers"), /unsafe-eval|connect-src[^\n]*\*/);
});

test("keeps backend, established tools, CSS, and current version byte-identical", () => {
  backendFiles.forEach(file => {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
    assert.equal(hash, backendHashes[file], file);
  });
  const frozen = {
    "styles/components.css": "aa3e2d0875be6e9ba2701064819dbc2c8fcccde4bbba489f33dcdb3ded75ce08",
    "styles/pages.css": "621ccb2d5ad1e086c25c373432172021daaefecfa6faf7c0c147fe17fbf9a867",
    "styles/themes.css": "517cfd99f45e39deb3ba57e6c2de67ccb12b14c4750af8c7a6b75a581e1af4a7"
  };
  Object.entries(frozen).forEach(([file, expected]) => {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
    assert.equal(hash, expected, file);
  });
  assert.equal(JSON.parse(read("package.json")).version, "2.0.5");
});

test("declares the complete 44-case responsive matrix and preserves mobile-safe controls", () => {
  const widths = [375, 390, 430, 768, 820, 834, 1024, 1180, 1194, 1280, 1440];
  const cases = widths.flatMap(width => ["en", "zh-TW"].flatMap(locale => ["default", "light"].map(theme => ({ width, locale, theme }))));
  assert.equal(cases.length, 44);
  const css = [read("styles/base.css"), read("styles/components.css"), read("styles/pages.css"), read("styles/themes.css")].join("\n");
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /\.key-finder-status-row[\s\S]*flex-direction: column/);
  assert.match(css, /\.result-actions[\s\S]*grid-template-columns: 1fr/);
  assert.match(read("src/views/KeyFinderView.vue"), /accept="audio\/\*,\.aac,\.aiff,\.flac,\.m4a,\.mp3,\.mp4,\.ogg,\.wav,\.webm"/);
});
