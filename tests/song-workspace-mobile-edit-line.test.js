const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("song-workspace.html") + read("src/views/SongWorkspaceView.vue");
const css = read("styles/song-workspace.css");
const app = read("src/composables/useSongWorkspace.js");
const en = read("locales/en/common.json");
const zh = read("locales/zh-TW/common.json");

function region(source, start, end) {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing start: ${start}`);
    assert.notEqual(endIndex, -1, `Missing end: ${end}`);
    return source.slice(startIndex, endIndex);
}

const lineDialog = region(html, '<dialog class="workspace-dialog workspace-line-dialog"', "</dialog>");
const mobile = region(css, "@media (max-width: 720px)", "@media (max-width: 420px)");

test("mobile Edit Line uses the dedicated sheet structure without replacing its editor", () => {
    assert.match(lineDialog, /workspace-line-sheet-handle/);
    assert.match(lineDialog, /id="lineDialogTitle"[\s\S]*?id="lineDialogSubtitle"/);
    assert.match(lineDialog, /workspace-line-card workspace-line-text-card[\s\S]*?id="lineTextInput"[\s\S]*?id="lineTextCharacterCount"[\s\S]*?id="anchorPreview"/);
    assert.match(lineDialog, /workspace-line-card workspace-chord-symbol-card[\s\S]*?id="anchorChordInput"/);
    assert.match(lineDialog, /workspace-line-card workspace-anchor-position-card[\s\S]*?id="anchorPositionInput"[\s\S]*?id="addAnchorButton"[\s\S]*?id="anchorList"/);
    assert.match(app, /lineDialog\.classList\.toggle\("is-edit-line-mode", !instrumental && !context\.isNew\)/);
    assert.match(mobile, /\.workspace-line-dialog\.is-edit-line-mode\s*\{[^}]*position:\s*fixed[^}]*inset:[^;]*safe-area-inset-top[^}]*border-radius:\s*26px 26px 0 0/s);
    assert.match(mobile, /\.workspace-line-dialog\.is-edit-line-mode::backdrop\s*\{[^}]*rgba\(15, 13, 11, 0\.76\)/s);
});

test("mobile Edit Line exposes readable lyric, chord, anchor, and chord-list cards", () => {
    assert.match(mobile, /#lineTextInput\s*\{[^}]*min-height:\s*168px[^}]*resize:\s*none/s);
    assert.match(mobile, /\.workspace-line-character-count\s*\{[^}]*position:\s*absolute[^}]*display:\s*block/s);
    assert.match(mobile, /\.workspace-anchor-preview button\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
    assert.match(mobile, /\.workspace-anchor-position-row\s*\{[^}]*grid-template-columns:\s*72px minmax\(0, 1fr\) auto/s);
    assert.match(mobile, /#addAnchorButton\s*\{[^}]*min-height:\s*56px[^}]*border-radius:\s*999px/s);
    assert.match(mobile, /\.workspace-anchor-item\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 44px 44px[^}]*border-radius:\s*11px/s);
    assert.match(app, /lineTextCount\.textContent = `\$\{elements\.lineText\.value\.length\} \/ \$\{elements\.lineText\.maxLength\}`/);
    assert.match(app, /anchorCount\.textContent = t\([\s\S]*?pages\.songWorkspace\.chordCount/);
    assert.match(app, /setAttribute\("aria-label", editLabel\)[\s\S]*?setAttribute\("aria-label", deleteLabel\)/);
});

test("mobile chord delete actions use an accessible trash-can icon", () => {
    assert.match(app, /function deleteActionIcon\(\)[\s\S]*?createElementNS\(namespace, "svg"\)[\s\S]*?M19 6l-1 14H6L5 6/);
    assert.match(app, /const removeIcon = deleteActionIcon\(\)/);
    assert.match(app, /edit\.append\(editIcon, editText\)[\s\S]*?remove\.append\(removeIcon, removeText\)/);
    assert.doesNotMatch(app, /workspace-anchor-action-icon", "⌫"/);
    assert.match(mobile, /svg\.workspace-anchor-action-icon\s*\{[^}]*width:\s*21px[^}]*height:\s*21px[^}]*stroke:\s*currentColor/s);
});

test("chord actions show icon-before-text on desktop and mirrored icon-only controls on mobile", () => {
    const desktop = css.slice(0, css.indexOf("@media (max-width: 720px)"));
    assert.match(desktop, /\.workspace-anchor-action-icon\s*\{[^}]*display:\s*inline-flex[^}]*width:\s*1\.1em/s);
    assert.match(desktop, /\[data-action="edit-anchor"\] \.workspace-anchor-action-icon\s*\{[^}]*transform:\s*scaleX\(-1\)/s);
    assert.match(desktop, /\.workspace-anchor-item button\s*\{[^}]*gap:\s*6px/s);
    assert.match(mobile, /\.workspace-anchor-action-text\s*\{[^}]*position:\s*absolute[^}]*clip-path:\s*inset\(50%\)/s);
});

test("mobile action hierarchy is Save, then Cancel and Delete", () => {
    const actions = region(lineDialog, '<div class="workspace-dialog-actions workspace-line-dialog-actions">', "</div>\n            </div>");
    const saveIndex = actions.indexOf('id="saveLineButton"');
    const cancelIndex = actions.indexOf('id="cancelLineButton"');
    const deleteIndex = actions.indexOf('id="deleteLineButton"');
    assert.ok(saveIndex >= 0 && saveIndex < cancelIndex && cancelIndex < deleteIndex);
    assert.match(mobile, /#saveLineButton\s*\{[^}]*order:\s*1[^}]*grid-column:\s*1 \/ -1[^}]*width:\s*100%/s);
    assert.match(mobile, /#cancelLineButton\s*\{[^}]*order:\s*2[^}]*grid-column:\s*1[^}]*width:\s*100%/s);
    assert.match(mobile, /#deleteLineButton\s*\{[^}]*order:\s*3[^}]*grid-column:\s*2[^}]*width:\s*100%/s);
    assert.match(lineDialog, /id="cancelLineButton"[^>]*type="button"[^>]*data-dialog-close/);
    assert.match(lineDialog, /id="deleteLineButton"[^>]*type="button"/);
    assert.match(lineDialog, /id="saveLineButton"[^>]*value="default"[^>]*type="submit"/);
});

test("sheet copy is localized and the presentation remains mobile-only", () => {
    [en, zh].forEach(locale => {
        assert.match(locale, /"editLineSubtitle"/);
        assert.match(locale, /"anchorPositionHelp"/);
        assert.match(locale, /"chordsInThisLine"/);
        assert.match(locale, /"chordCount"/);
    });
    const beforeMobile = css.slice(0, css.indexOf("@media (max-width: 720px)"));
    const desktopOnly = region(css, "@media (min-width: 721px)", "@media (max-width: 900px)");
    assert.doesNotMatch(beforeMobile, /\.workspace-line-dialog\.is-edit-line-mode\s*\{[^}]*position:\s*fixed/s);
    assert.doesNotMatch(desktopOnly, /\.workspace-line-dialog\.is-edit-line-mode/);
});
