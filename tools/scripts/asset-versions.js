const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

// Every local stylesheet and classic script the pages load. The HTML links them
// without a ?v= query; the build adds one from the file's own content, so
// editing a file is enough to refresh browser caches, and a file that does not
// change keeps the same key.
const HASHED_ASSETS = [
  ...listAssets("styles", ".css"),
  ...listAssets("scripts", ".js")
];

function listAssets(directory, extension) {
  return fs.readdirSync(path.join(root, directory))
    .filter(name => name.endsWith(extension))
    .sort()
    .map(name => `${directory}/${name}`);
}

function assetVersion(file) {
  const content = fs.readFileSync(path.join(root, file));
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 10);
}

function versionedAsset(file) {
  return `${file}?v=${assetVersion(file)}`;
}

// Adds the content key to every plain href="styles/…", src="scripts/…" (or
// root-relative "/styles/…", "/scripts/…") reference to the assets above.
// References that already carry a query are left alone.
function addAssetVersions(html) {
  return HASHED_ASSETS.reduce(function(result, file) {
    const versioned = versionedAsset(file);
    return result
      .replaceAll(`="/${file}"`, `="/${versioned}"`)
      .replaceAll(`="${file}"`, `="${versioned}"`);
  }, html);
}

module.exports = { HASHED_ASSETS, assetVersion, versionedAsset, addAssetVersions };
