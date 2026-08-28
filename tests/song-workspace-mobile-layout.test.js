const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("song-workspace.html");
const css = read("styles/song-workspace.css");
const app = read("scripts/song-workspace.js");

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
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-editor-actions\s*\{[^}]*display:\s*contents/s);
    const mobileActions = region(css, "@media (max-width: 720px)", ".workspace-global-add-button");
    assert.match(mobileActions, /flex-direction:\s*row/);
    assert.match(mobileActions, /gap:\s*1px/);
    assert.match(mobileActions, /padding:\s*9px 1px/);
    assert.match(mobileActions, /font-size:\s*clamp\(0\.625rem, 2\.7vw, 0\.64rem\)/);
    assert.match(mobileActions, /\.workspace-action-icon\s*\{[^}]*width:\s*15px;[^}]*height:\s*15px/s);
    assert.match(css, /#performanceButton::after\s*\{[^}]*background:\s*var\(--workspace-accent\)/s);
});

test("mobile settings keep a compact two-column hierarchy", () => {
    const summary = region(html, '<details class="workspace-settings-disclosure"', '<section class="workspace-settings-panel"');
    assert.match(summary, /workspace-settings-summary-icon/);
    assert.match(summary, /workspace-settings-summary-copy[\s\S]*songSettings[\s\S]*songSettingsHint/);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-settings-nav\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    assert.match(css, /\.workspace-settings-nav > \.workspace-field:nth-child\(5\)\s*\{[^}]*grid-column:\s*1 \/ -1/s);
    assert.match(css, /\.workspace-reading-controls\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
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
