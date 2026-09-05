const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("tablet Tracks layout keeps filters and cards in the horizontal hierarchy", () => {
    const css = read("styles/pages.css");
    const tablet = css.slice(
        css.indexOf("@media (min-width: 700px) and (max-width: 900px)"),
        css.indexOf("@media (max-width: 430px)")
    );

    assert.match(tablet, /\.tracks-library-page \.track-controls\s*\{[^}]*flex-direction:\s*row[^}]*align-items:\s*center/s);
    assert.match(tablet, /\.tracks-library-page \.track-toolbar-sort\s*\{[^}]*margin-inline-start:\s*auto/s);
    assert.match(tablet, /\.tracks-library-page \.track-card\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto[^}]*padding:[^;]*clamp\(/s);
    assert.match(tablet, /\.tracks-library-page \.track-cover-media\s*\{[^}]*inset:\s*0 auto 0 0[^}]*border-right:/s);
    assert.match(tablet, /\.tracks-library-page \.track-actions\s*\{[^}]*justify-self:\s*end[^}]*width:\s*auto/s);
    assert.doesNotMatch(tablet, /position:\s*fixed|position:\s*sticky/);
});

test("mobile footer renders copyright, legal, and social content as three balanced rows", () => {
    const css = read("styles/components.css");
    const footer = read("src/components/site/SiteFooter.vue");

    assert.match(footer, /class="footer-rights"/);
    assert.match(footer, /class="footer-legal-link" href="\/legal\.html"/);
    assert.match(footer, /youtube\.com\/@weekly_backing_track[\s\S]*instagram\.com\/reyu_jasper/);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.footer > p\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*center/s);
    assert.match(css, /\.footer-rights,\s*\.footer-legal-link,\s*\.footer \.social-links a\s*\{[^}]*font-size:\s*inherit[^}]*line-height:/s);
    assert.match(css, /\.footer-rights,\s*\.footer-legal-link\s*\{[^}]*white-space:\s*nowrap/s);
    assert.match(css, /\.footer-legal-separator\s*\{[^}]*display:\s*none/s);
    assert.match(css, /\.footer \.social-links a\s*\{[^}]*min-height:\s*44px/s);
});

test("homepage YouTube embed preserves client identity without widening CSP", () => {
    const home = read("src/views/HomeView.vue");
    const headers = read("_headers");
    const workspace = read("song-workspace.html");
    const iframe = home.slice(
        home.indexOf('<div class="audio-player-card home-audio-player home-video-player">'),
        home.indexOf("</iframe>", home.indexOf('<div class="audio-player-card home-audio-player home-video-player">'))
    );

    assert.match(iframe, /src="https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}"/);
    assert.match(iframe, /referrerpolicy="strict-origin-when-cross-origin"/);
    assert.match(iframe, /allowfullscreen/);
    assert.match(home, /youtube:\s*"https:\/\/youtu\.be\/nNlJNDU-Xgw"/);
    assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(headers, /frame-src https:\/\/www\.youtube\.com https:\/\/api\.jamtrackshub\.com;/);
    assert.doesNotMatch(headers, /frame-src[^;]*\*/);
    assert.doesNotMatch(headers, /script-src[^;]*(?:unsafe-inline|unsafe-eval)/);
    assert.match(workspace, /<meta name="referrer" content="no-referrer">/);
});

test("featured YouTube player remains a responsive 16:9 iframe", () => {
    const css = read("styles/pages.css");
    assert.match(css, /\.home-video-player iframe\s*\{[^}]*width:\s*100%[^}]*aspect-ratio:\s*16 \/ 9[^}]*border:\s*0/s);
    assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.home-video-player iframe\s*\{[^}]*min-height:\s*0/s);
});
