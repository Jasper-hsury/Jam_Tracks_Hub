const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("song-workspace.html");
const css = read("styles/song-workspace.css");
const app = read("scripts/song-workspace.js");
const en = JSON.parse(read("locales/en/common.json"));
const zh = JSON.parse(read("locales/zh-TW/common.json"));

function region(source, start, end) {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing start: ${start}`);
    assert.notEqual(endIndex, -1, `Missing end: ${end}`);
    return source.slice(startIndex, endIndex);
}

test("editor actions keep icons before text across mobile, tablet, and desktop", () => {
    const topbar = region(html, '<div class="workspace-editor-topbar">', '<div class="workspace-download-menu"');
    ["backToSongsButton", "downloadMenuButton", "readModeButton", "performanceButton"].forEach(id => {
        const action = region(topbar, `id="${id}"`, "</button>");
        assert.match(action, /workspace-action-icon[\s\S]*?<span[^>]*data-i18n=/);
        assert.match(action, /aria-hidden="true"/);
    });
    assert.equal((topbar.match(/workspace-action-icon/g) || []).length, 4);
    assert.match(css, /\.workspace-action-icon\s*\{[^}]*display:\s*block/s);
    assert.doesNotMatch(css, /@media \(min-width: 721px\)[\s\S]*?\.workspace-action-icon\s*\{[^}]*display:\s*none/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-editor-topbar\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-editor-topbar\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-editor-actions\s*\{[^}]*display:\s*contents/s);
    const mobileActions = region(css, "@media (max-width: 720px)", ".workspace-global-add-button");
    assert.match(mobileActions, /flex-direction:\s*column/);
    assert.match(mobileActions, /gap:\s*8px/);
    assert.match(mobileActions, /aspect-ratio:\s*1/);
    assert.match(mobileActions, /width:\s*100%/);
    assert.match(mobileActions, /padding:\s*10px 5px/);
    assert.match(mobileActions, /font-size:\s*clamp\(0\.68rem, 3vw, 0\.78rem\)/);
    assert.match(mobileActions, /\.workspace-action-icon\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px/s);
    assert.match(css, /#performanceButton::after\s*\{[^}]*background:\s*var\(--workspace-accent\)/s);
});

test("the library action uses the concise My Songs label in both locales", () => {
    assert.match(html, /data-i18n="pages\.songWorkspace\.backToSongs">My Songs<\/span>/);
    assert.equal(en.pages.songWorkspace.backToSongs, "My Songs");
    assert.equal(zh.pages.songWorkspace.backToSongs, "我的歌曲");
});

test("mobile settings keep a compact two-column hierarchy", () => {
    const summary = region(html, '<details class="workspace-settings-disclosure"', '<section class="workspace-settings-panel"');
    assert.match(summary, /workspace-settings-summary-icon/);
    assert.match(summary, /workspace-settings-summary-copy[\s\S]*songSettings[\s\S]*songSettingsHint/);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-settings-nav\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    assert.match(css, /\.workspace-settings-nav > \.workspace-field:nth-child\(5\)\s*\{[^}]*grid-column:\s*1 \/ -1/s);
    assert.match(css, /\.workspace-reading-controls\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?--song-settings-control-height:\s*54px/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-settings-disclosure\s*\{[^}]*border-radius:\s*14px[^}]*box-shadow:/s);
    assert.match(css, /\.workspace-settings-nav \.workspace-field\s*\{[^}]*color:\s*var\(--workspace-text\)[^}]*text-transform:\s*none/s);
    assert.match(css, /\.workspace-reading-controls\s*\{[^}]*border-top:\s*1px solid var\(--workspace-line\)[^}]*padding-top:\s*18px/s);
    assert.match(css, /\.workspace-settings-nav \.workspace-reading-stepper\s*\{[^}]*height:\s*54px[^}]*border-radius:\s*999px/s);
});

test("mobile modes use the required two-plus-three row order", () => {
    assert.match(css, /\[data-view-mode="original"\]\s*\{[^}]*order:\s*1[^}]*grid-column:\s*span 3/s);
    assert.match(css, /\[data-view-mode="nashville"\]\s*\{[^}]*order:\s*2[^}]*grid-column:\s*span 3/s);
    assert.match(css, /\[data-view-mode="balanced"\]\s*\{[^}]*order:\s*3[^}]*grid-column:\s*span 2/s);
    assert.match(css, /\[data-view-mode="beginner"\]\s*\{[^}]*order:\s*4[^}]*grid-column:\s*span 2/s);
    assert.match(css, /\[data-view-mode="roman"\]\s*\{[^}]*order:\s*5[^}]*grid-column:\s*span 2/s);
});

test("mobile hint and Smart Capo actions share a row and Smart Capo stays text-only", () => {
    const actions = region(html, '<div class="workspace-mode-actions">', '</div>');
    const smartCapo = region(actions, 'id="smartCapoButton"', '</button>');
    assert.match(actions, /id="chordHintsButton"[\s\S]*id="smartCapoButton"/);
    assert.doesNotMatch(smartCapo, /<svg|<img|icon/i);
    assert.match(app, /\$\("smartCapoButton"\)\.addEventListener\("click", renderCapoOptions\)/);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-mode-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
});
