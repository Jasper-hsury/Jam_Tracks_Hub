const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  HASHED_STYLESHEETS,
  stylesheetVersion,
  versionedStylesheet,
  addStylesheetVersions
} = require("../tools/scripts/stylesheet-versions.js");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const escape = text => text.replace(/[.?]/g, "\\$&");

test("the cache key is the first ten hex digits of the stylesheet's SHA-256", () => {
  assert.deepEqual(HASHED_STYLESHEETS, ["styles/v4.css", "styles/chord-lab.css"]);
  HASHED_STYLESHEETS.forEach(file => {
    const expected = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex").slice(0, 10);
    assert.equal(stylesheetVersion(file), expected, file);
    assert.equal(versionedStylesheet(file), `${file}?v=${expected}`);
  });
});

test("adds the key to relative and root-relative links and leaves everything else alone", () => {
  const v4 = versionedStylesheet("styles/v4.css");
  const lab = versionedStylesheet("styles/chord-lab.css");
  const html = [
    '<link rel="stylesheet" href="styles/v4.css">',
    '<link rel="stylesheet" href="/styles/v4.css">',
    '<link rel="stylesheet" href="styles/chord-lab.css">',
    '<link rel="stylesheet" href="styles/pages.css?v=20261019-v4-polish">',
    '<link rel="stylesheet" href="styles/v4.css?v=already">'
  ].join("\n");
  assert.equal(addStylesheetVersions(html), [
    `<link rel="stylesheet" href="${v4}">`,
    `<link rel="stylesheet" href="/${v4}">`,
    `<link rel="stylesheet" href="${lab}">`,
    '<link rel="stylesheet" href="styles/pages.css?v=20261019-v4-polish">',
    '<link rel="stylesheet" href="styles/v4.css?v=already">'
  ].join("\n"));
  assert.equal(addStylesheetVersions(addStylesheetVersions(html)), addStylesheetVersions(html));
});

test("source HTML links hashed stylesheets without a hand-written key", () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith(".html"));
  HASHED_STYLESHEETS.forEach(file => {
    const linking = pages.filter(page => new RegExp(`href="/?${escape(file)}`).test(read(page)));
    assert.ok(linking.length > 0, file);
    linking.forEach(page => {
      assert.doesNotMatch(read(page), new RegExp(`href="/?${escape(file)}\\?`), `${page} hard-codes a key for ${file}`);
    });
  });
});

test("the version check script covers the helper", () => {
  assert.match(JSON.parse(read("package.json")).scripts.check, /node --check tools\/scripts\/stylesheet-versions\.js/);
});
