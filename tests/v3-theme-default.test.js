const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const themeInit = fs.readFileSync(path.join(root, "scripts/theme-init.js"), "utf8");
const useTheme = fs.readFileSync(path.join(root, "src/composables/useTheme.js"), "utf8");

function runThemeInit(storedValue, { storageThrows = false } = {}) {
  const store = new Map();
  if (storedValue !== undefined) store.set("jasperMusicTheme", storedValue);
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error("blocked");
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error("blocked");
      store.set(key, String(value));
    }
  };
  const documentElement = { dataset: {} };
  vm.runInNewContext(themeInit, { localStorage, document: { documentElement } });
  return { theme: documentElement.dataset.theme, stored: store.get("jasperMusicTheme") };
}

test("new visitors without a saved theme get the v3 paper theme", () => {
  assert.deepEqual(runThemeInit(undefined), { theme: "light", stored: undefined });
});

test("visitors who saved light keep the paper theme", () => {
  assert.deepEqual(runThemeInit("light"), { theme: "light", stored: "light" });
});

test("visitors who explicitly saved the dark theme keep the ink theme", () => {
  assert.deepEqual(runThemeInit("default"), { theme: "default", stored: "default" });
});

test("invalid saved values fall back to and repair to the paper theme", () => {
  assert.deepEqual(runThemeInit("sepia"), { theme: "light", stored: "light" });
});

test("blocked storage still paints the paper theme", () => {
  assert.equal(runThemeInit(undefined, { storageThrows: true }).theme, "light");
});

test("useTheme keeps the storage key and treats only the stored dark value as ink", () => {
  assert.match(useTheme, /const THEME_KEY = "jasperMusicTheme";/);
  assert.match(useTheme, /const DARK_THEME = DEFAULT_THEME;/);
  assert.match(useTheme, /if \(typeof document === "undefined"\) return LIGHT_THEME;/);
  assert.match(useTheme, /dataset\.theme === DARK_THEME\s*\?\s*DARK_THEME\s*:\s*LIGHT_THEME/);
  assert.match(useTheme, /nextTheme === DARK_THEME \? DARK_THEME : LIGHT_THEME/);
});
