const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const indexHtml = read("index.html");
const i18nJs = read("scripts/i18n.js");
const animationsJs = read("scripts/site-animations.js");
const pagesCss = read("styles/pages.css");

test("homepage keeps the established Tracks Hub SplitText entrance", () => {
    assert.match(indexHtml, /<h1 data-i18n="home\.hero\.title">Tracks Hub<\/h1>/);
    assert.match(indexHtml, /assets\/vendor\/gsap\/SplitText\.min\.js/);
    assert.match(indexHtml, /scripts\/i18n\.js\?v=20260828-home-entrance/);
    assert.match(indexHtml, /scripts\/site-animations\.js\?v=20260828-home-entrance/);
    assert.match(animationsJs, /const homeTitle = document\.querySelector\("\.home-hero h1"\)/);
    assert.match(animationsJs, /charsClass:\s*"home-split-char"/);
    assert.match(animationsJs, /\.fromTo\(titleChars,[\s\S]*stagger:\s*0\.026/s);
});

test("same-value localization does not destroy animation-owned child nodes", () => {
    assert.match(
        i18nJs,
        /if \(typeof value === "string" && element\.textContent !== value\) \{\s*element\.textContent = value;/s
    );
    assert.match(i18nJs, /document\.documentElement\.dataset\.i18nReady = "true"/);
    assert.match(
        animationsJs,
        /pageEntranceNeedsTranslations[\s\S]*document\.documentElement\.dataset\.i18nReady !== "true"[\s\S]*addEventListener\("jasper:language-change", animatePageEntrance, \{ once: true \}\)/s
    );
});

test("homepage animation retains its reduced-motion fallback", () => {
    assert.match(animationsJs, /const MOTION_QUERY = "\(prefers-reduced-motion: reduce\)"/);
    assert.match(animationsJs, /if \(reduceMotion\) \{[\s\S]*classList\.add\("motion-reduced"\)[\s\S]*return;/s);
    assert.match(pagesCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.home-jam-mark-text\s*\{[^}]*opacity:\s*1[^}]*animation:\s*none/s);
});
