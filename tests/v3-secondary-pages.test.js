const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("styles/secondary-pages.css");
const STYLESHEET = "styles/secondary-pages.css?v=20261015-v3-secondary";
const PAGES = {
  "feedback.html": "",
  "legal.html": "",
  "privacy-policy.html": "",
  "service-waking.html": "",
  "404.html": "/"
};
const SCOPE = /^html\[data-theme(?:="default")?\](?::lang\(zh\))? main(?:\.(?:feedback|legal|privacy|status)-page|:is\([^)]*\))/;

function splitTopLevel(group) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of group) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  return [...parts, current];
}

test("the five secondary pages load the v3 stylesheet last, and no other page loads it", () => {
  Object.entries(PAGES).forEach(([file, prefix]) => {
    const links = read(file).match(/<link rel="stylesheet" href="\/?styles\/[^"]+">/g);
    assert.equal(links.at(-1), `<link rel="stylesheet" href="${prefix}${STYLESHEET}">`, file);
  });
  assert.ok(read("vite.config.mjs").includes(`"${STYLESHEET}"`));
  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  assert.equal(verifier.split(`"${STYLESHEET}"`).length - 1, Object.keys(PAGES).length);
  fs.readdirSync(root).filter(file => file.endsWith(".html") && !(file in PAGES))
    .forEach(file => assert.doesNotMatch(read(file), /secondary-pages\.css/, file));
});

test("every v3 secondary page rule is screen-only and scoped to the page's main element", () => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  assert.match(body, /^@media screen \{/);
  const selectors = body
    .replace(/^@media screen \{/, "")
    .match(/[^{}]+(?=\{)/g)
    .map(selector => selector.trim())
    .filter(selector => selector && !selector.startsWith("@"));
  assert.ok(selectors.length > 0);
  selectors.forEach(group => splitTopLevel(group).forEach(selector => {
    assert.match(selector.trim(), SCOPE, selector);
  }));
  assert.doesNotMatch(css, /url\(\s*["']?https?:/);
});

test("buttons share the control radius and selections use cocoa", () => {
  assert.match(css, /:is\(\.primary-button, \.secondary-button\) \{[^}]*border-radius: var\(--radius-control\);/);
  assert.match(css, /--secondary-selected: var\(--band\);/);
  assert.match(css, /html\[data-theme="default"\] main:is\([^)]*\) \{\s*--secondary-selected: #5c4b3f;/);
});

test("Feedback splits the intro and the form and keeps its status live region", () => {
  const view = read("src/views/FeedbackView.vue");
  assert.match(view, /id="feedbackStatus"[\s\S]*?aria-live="polite"/);
  assert.match(css, /main\.feedback-page \.feedback-panel \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.75fr\);[^}]*border-top: 3px double var\(--ink\);/);
  assert.match(css, /main\.feedback-page \.feedback-status\[data-tone="success"\]::before \{\s*content: "✓";/);
  assert.doesNotMatch(css, /\.feedback-status:empty \{\s*display: none;/);
});

test("Legal and Privacy number every section and list them in an On this page nav", () => {
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));
  assert.deepEqual(Object.keys(english.policyPage), Object.keys(traditionalChinese.policyPage));
  assert.match(english.policyPage.sectionCount, /\{\{count\}\}/);
  assert.match(traditionalChinese.policyPage.sectionCount, /\{\{count\}\}/);

  const contents = read("src/components/site/PolicyContents.vue");
  assert.match(contents, /:aria-expanded="open \? 'true' : 'false'"/);
  assert.match(contents, /:aria-current="currentId === section\.id \? 'location' : null"/);
  assert.match(contents, /window\.removeEventListener\("scroll", scheduleUpdate\)/);

  [
    ["src/views/LegalView.vue", ["terms", "song-workspace", "copyright", "exports", "privacy", "limitations"]],
    ["src/views/PrivacyView.vue", ["extension", "data-processed", "storage-retention", "data-use", "sharing-security", "your-choices", "song-workspace-local-storage", "user-content", "contact"]]
  ].forEach(([file, ids]) => {
    const view = read(file);
    assert.match(view, /<PolicyContents /, file);
    assert.match(view, /class="policy-back-to-top" href="#main-content"/, file);
    ids.forEach((id, index) => {
      assert.match(view, new RegExp(`id: "${id}"`), `${file} lists ${id}`);
      assert.match(view, new RegExp(`<div id="${id}" class="result-section policy-section">\\s*<span class="policy-section-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>`), `${file} numbers ${id}`);
    });
  });

  assert.match(css, /\.policy-contents \{\s*position: sticky;/);
  assert.match(css, /\.policy-section \{[^}]*scroll-margin-top: 96px;/);
  const phone = css.slice(css.indexOf("@media (max-width: 760px)"));
  assert.match(phone, /\.policy-contents ol \{\s*display: none;/);
  assert.match(phone, /\.policy-contents\.is-open ol \{\s*display: block;/);
});
