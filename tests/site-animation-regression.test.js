const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const indexHtml = read("index.html");
const legalHtml = read("legal.html");
const workspaceHtml = read("song-workspace.html");
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

test("Legal uses the established display and body font roles without artistic tagline styling", () => {
    assert.match(legalHtml, /family=Noto\+Sans\+TC:wght@400;500;600;700&family=Noto\+Serif\+TC:wght@700/);
    assert.match(legalHtml, /class="tracks-page legal-page"/);
    assert.match(legalHtml, /class="legal-page-metadata"/);
    assert.doesNotMatch(legalHtml, /class="hero-tagline"[^>]*data-i18n="legal\.effectiveDate"/);
    assert.match(pagesCss, /\.legal-page-title\s*\{[^}]*font-family:\s*"Noto Serif TC", serif/s);
    assert.match(pagesCss, /\.legal-page-metadata\s*\{[^}]*font-family:\s*"Noto Sans TC", sans-serif[^}]*font-size:\s*14px[^}]*font-weight:\s*500[^}]*line-height:\s*1\.6/s);
    assert.match(pagesCss, /\.legal-policy-panel \.result-section h2\s*\{[^}]*font-family:\s*"Noto Sans TC", sans-serif[^}]*font-size:\s*24px[^}]*font-weight:\s*700[^}]*line-height:\s*1\.25/s);
});

test("Song Workspace reuses the shared page entrance without changing its application modules", () => {
    assert.match(workspaceHtml, /assets\/vendor\/gsap\/gsap\.min\.js/);
    assert.match(workspaceHtml, /scripts\/site-animations\.js\?v=20260830-workspace-entrance/);
    assert.match(animationsJs, /const isSongWorkspacePage = Boolean\(document\.querySelector\("\.song-workspace-page"\)\)/);
    assert.match(animationsJs, /"\.song-workspace-hero > \.result-kicker"[\s\S]*"\.workspace-create-area > \.workspace-section-heading"/s);
    assert.match(animationsJs, /if \(isSongWorkspacePage\) \{[\s\S]*\.workspace-entry-grid > \.workspace-entry-card[\s\S]*stagger:\s*0\.065/s);
    assert.match(animationsJs, /if \(secondaryEntrancePieces\.length\) \{[\s\S]*timeline\.from\(secondaryEntrancePieces/s);
    assert.match(animationsJs, /\.filter\(target => !target\.closest\("\.song-workspace-page"\)\)/);
    assert.match(animationsJs, /document\.querySelector\("\.home-hero, \.song-workspace-hero"\)/);
});
