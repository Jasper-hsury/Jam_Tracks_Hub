const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

// Stylesheets that still change between releases. The HTML links them without a
// ?v= query; the build adds one from the file's own content, so editing the file
// is enough to refresh browser caches. Frozen stylesheets keep hand-written keys.
const HASHED_STYLESHEETS = ["styles/v4.css", "styles/chord-lab.css"];

function stylesheetVersion(file) {
  const content = fs.readFileSync(path.join(root, file));
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 10);
}

function versionedStylesheet(file) {
  return `${file}?v=${stylesheetVersion(file)}`;
}

// Adds the content key to every plain href="styles/…" or href="/styles/…" link
// for the stylesheets above. Links that already carry a query are left alone.
function addStylesheetVersions(html) {
  return HASHED_STYLESHEETS.reduce(function(result, file) {
    const versioned = versionedStylesheet(file);
    return result
      .replaceAll(`href="/${file}"`, `href="/${versioned}"`)
      .replaceAll(`href="${file}"`, `href="${versioned}"`);
  }, html);
}

module.exports = { HASHED_STYLESHEETS, stylesheetVersion, versionedStylesheet, addStylesheetVersions };
