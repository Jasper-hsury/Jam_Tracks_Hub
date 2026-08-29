const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

function runSiteConfig(hostname, savedApiBaseUrl) {
    const values = new Map();
    if (savedApiBaseUrl) {
        values.set("jasperMusicApiBaseUrl", savedApiBaseUrl);
    }
    const removed = [];
    const localStorage = {
        getItem(key) {
            return values.get(key) ?? null;
        },
        removeItem(key) {
            removed.push(key);
            values.delete(key);
        }
    };
    const window = { location: { hostname } };
    vm.runInNewContext(read("scripts/site-config.js"), { localStorage, window });
    return { config: window.JASPER_MUSIC_CONFIG, removed };
}

test("production Key Finder uses only the Cloudflare-proxied API hostname", () => {
    const { config, removed } = runSiteConfig(
        "jamtrackshub.com",
        "https://jasper-music.onrender.com"
    );
    assert.equal(config.apiBaseUrl, "https://api.jamtrackshub.com");
    assert.equal(config.productionApiBaseUrl, "https://api.jamtrackshub.com");
    assert.deepEqual(removed, ["jasperMusicApiBaseUrl"]);

    const productionSources = [
        read("scripts/site-config.js"),
        read("scripts/key-finder.js")
    ].join("\n");
    assert.doesNotMatch(productionSources, /jasper-music\.onrender\.com|jasper-key-finder-api\.onrender\.com/);
});

test("local development keeps an explicit local API override", () => {
    const { config, removed } = runSiteConfig(
        "127.0.0.1",
        "http://localhost:8001"
    );
    assert.equal(config.apiBaseUrl, "http://localhost:8001");
    assert.equal(config.productionApiBaseUrl, "https://api.jamtrackshub.com");
    assert.deepEqual(removed, []);
});

test("CSP and large-slide embeds use the proxied service hostname", () => {
    const headers = read("_headers");
    const build = read("tools/scripts/build-cloudflare.js");
    assert.match(headers, /connect-src[^;]*https:\/\/api\.jamtrackshub\.com/);
    assert.match(headers, /frame-src[^;]*https:\/\/api\.jamtrackshub\.com/);
    assert.match(build, /renderAssetBaseUrl = "https:\/\/api\.jamtrackshub\.com"/);
    assert.doesNotMatch(headers + build, /jasper-music\.onrender\.com/);
});

test("Render CORS is allowlisted and API responses are explicitly no-store", () => {
    const backend = read("api-server/app.py");
    assert.match(backend, /CANONICAL_SITE_ORIGIN = "https:\/\/jamtrackshub\.com"/);
    assert.match(backend, /LOCAL_DEVELOPMENT_ORIGIN_PATTERN/);
    assert.match(backend, /allow_origins=\[CANONICAL_SITE_ORIGIN\]/);
    assert.match(backend, /allow_methods=list\(CORS_ALLOWED_METHODS\)/);
    assert.match(backend, /allow_headers=list\(CORS_ALLOWED_HEADERS\)/);
    assert.match(backend, /request\.url\.path\.startswith\("\/api\/"\)[\s\S]*?"Cache-Control"\] = "no-store"/);
    assert.doesNotMatch(backend, /allow_origins=\["\*"\]|allow_methods=\["\*"\]|allow_headers=\["\*"\]/);
});
