const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("song-workspace.html") + read("src/views/SongWorkspaceView.vue");
const app = read("src/composables/useSongWorkspace.js");
const css = read("styles/song-workspace.css");
const core = read("scripts/song-workspace-core.js");
const storage = read("scripts/song-workspace-storage.js");
const songImport = read("scripts/song-workspace-import.js");
const en = JSON.parse(read("locales/en/common.json")).pages.songWorkspace;
const zh = JSON.parse(read("locales/zh-TW/common.json")).pages.songWorkspace;

function region(source, start, end) {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing start: ${start}`);
    assert.notEqual(endIndex, -1, `Missing end: ${end}`);
    return source.slice(startIndex, endIndex);
}

test("compact navigation keeps settings and modes in two explicit rows", () => {
    const settings = region(html, '<details class="workspace-settings-disclosure"', '<div class="workspace-modebar">');
    const modes = region(html, '<div class="workspace-modebar">', '<div class="workspace-capo-results"');
    ["originalKeySelect", "targetKeySelect", "capoSelect", "shapeKeyValue", "chordSpellingSelect", "chartZoomInput", "lineSpacingInput"]
        .forEach(id => assert.match(settings, new RegExp(`id="${id}"`)));
    assert.equal((modes.match(/data-view-mode=/g) || []).length, 5);
    assert.doesNotMatch(settings, /workspace-key-help|How the three keys work/);
    assert.match(css, /\.workspace-settings-panel\s*\{[^}]*padding:\s*8px/s);
    assert.match(css, /\.workspace-modebar\s*\{[^}]*margin:\s*10px 0 16px/s);
});

test("key and capo help is contextual, keyboard accessible, and localized", () => {
    ["originalKeyHelp", "targetKeyHelp", "capoHelp", "shapeKeyHelp"].forEach(id => {
        assert.match(html, new RegExp(`id="${id}"[^>]*role="tooltip"`));
    });
    assert.equal((html.match(/data-setting-help-item/g) || []).length, 4);
    assert.equal((html.match(/data-setting-help aria-expanded="false"/g) || []).length, 4);
    ["pointerenter", "pointerleave", "focusin", "focusout"].forEach(eventName => {
        assert.match(app, new RegExp(`addEventListener\\("${eventName}"`));
    });
    assert.match(app, /event\.key === "Escape" && state\.activeSettingHelp/);
    assert.match(css, /\.workspace-setting-item\.is-help-open \.workspace-setting-popover\s*\{[^}]*display:\s*grid/s);
    assert.equal(zh.shapeKey, "演奏指型調性");
    assert.match(en.keyHelpExample, /Target A.*Capo 2.*G shapes.*hear A/i);
    assert.match(zh.keyHelpExample, /目標調性 A.*Capo 2.*G.*A/);
});

test("song metadata lives in the score header and commits only on Save", () => {
    assert.doesNotMatch(html, /workspace-song-identity/);
    const header = region(html, '<header class="workspace-score-header">', "</header>");
    assert.match(header, /id="songTitleDisplay"/);
    assert.match(header, /id="songMetadataSummary"/);
    assert.match(header, /id="songTitleEditForm"[^>]*hidden/);
    assert.match(header, /id="songMetadataEditForm"[^>]*hidden/);
    assert.match(header, /id="songTitleInput"[^>]*required/);
    assert.match(header, /id="bpmInput"[^>]*min="20"[^>]*max="320"/);
    assert.match(header, /id="timeSignatureInput"[^>]*pattern=/);

    const settingsUpdate = region(app, "function updateSongFromFields()", "function scheduleSave()");
    assert.doesNotMatch(settingsUpdate, /state\.song\.(title|artist|bpm|timeSignature)/);
    assert.match(app, /function saveTitleEdit\(\)[\s\S]*state\.song\.title[\s\S]*scheduleSave\(\)/);
    assert.match(app, /function saveMetadataEdit\(\)[\s\S]*state\.song\.artist[\s\S]*state\.song\.bpm[\s\S]*state\.song\.timeSignature[\s\S]*scheduleSave\(\)/);
    assert.doesNotMatch(region(app, "function cancelTitleEdit()", "function saveTitleEdit()"), /scheduleSave|state\.song\s*=/);
    assert.doesNotMatch(region(app, "function cancelMetadataEdit()", "function saveMetadataEdit()"), /scheduleSave|state\.song\s*=/);
});

test("section actions stay hidden until a title interaction", () => {
    assert.match(app, /button\("", "toggle-section-actions", "workspace-section-title-trigger"\)/);
    assert.match(app, /actions\.hidden = state\.activeSectionActions !== sectionIndex/);
    assert.match(app, /toggle-section-actions[\s\S]*state\.activeSectionActions/);
    assert.match(app, /event\.key === "Escape" && state\.activeSectionActions !== null/);
    assert.match(css, /\.workspace-section-edit-hint\s*\{[^}]*opacity:\s*0/s);
    assert.match(css, /\.workspace-section-heading-row:hover \.workspace-section-edit-hint/);
    assert.match(app, /rename-section[\s\S]*section\.title = title\.slice\(0, 80\)[\s\S]*scheduleSave/);
    assert.match(app, /delete-section" && window\.confirm[\s\S]*sections\.splice\(sectionIndex, 1\)/);
});

test("Read Mode reuses the chart while removing editor chrome", () => {
    assert.match(html, /id="readModeButton"/);
    assert.match(html, /id="readModeToolbar"[^>]*hidden/);
    assert.match(app, /renderChart\(elements\.chart, current\.song, !state\.readMode\)/);
    assert.match(app, /elements\.editor\.classList\.toggle\("is-read-mode", state\.readMode\)/);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-editor-topbar,[\s\S]*\.workspace-settings-disclosure,[\s\S]*\.workspace-modebar/);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-chart\s*\{[^}]*--song-chart-lyric-size:\s*0\.96875em[^}]*--song-chart-chord-size:\s*0\.875em/s);
    assert.match(css, /\.workspace-editor\.is-read-mode\s*\{[^}]*--workspace-read-content-width:\s*1180px/s);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-chart-panel\s*\{[^}]*width:\s*min\(var\(--workspace-read-content-width\), 100%\)[^}]*margin:\s*0 auto/s);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-read-toolbar\s*\{[^}]*box-sizing:\s*border-box[^}]*width:\s*min\(var\(--workspace-read-content-width\), 100%\)[^}]*min-height:\s*58px[^}]*margin:\s*0 auto 10px[^}]*padding:\s*8px 10px/s);
    assert.match(css, /@media \(min-width: 721px\)[\s\S]*?\.workspace-editor\.is-read-mode \.workspace-read-toolbar\s*\{[^}]*min-height:\s*70px[^}]*gap:\s*10px[^}]*padding:\s*12px 14px/s);
    assert.match(css, /\.workspace-chart \.workspace-line\.is-instrumental,\s*\.performance-chart \.workspace-line\.is-instrumental\s*\{[^}]*min-height:\s*44px/s);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-line:not\(\.is-instrumental\)\s*\{[^}]*var\(--song-line-spacing\) \/ 4/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?#exitReadModeButton\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*2/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?#readShapesButton\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*2/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-read-toolbar \.workspace-read-stepper:first-of-type\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*3/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-read-toolbar \.workspace-read-stepper:last-of-type\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*3/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-read-toolbar \.workspace-read-stepper\s*\{[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\) 44px/s);
    assert.match(css, /\.workspace-read-toolbar \.workspace-read-stepper button:first-child\s*\{[^}]*justify-self:\s*start/s);
    assert.match(css, /\.workspace-read-toolbar \.workspace-read-stepper output\s*\{[^}]*width:\s*100%[^}]*justify-self:\s*center[^}]*text-align:\s*center/s);
    assert.match(css, /\.workspace-read-toolbar \.workspace-read-stepper button:last-child\s*\{[^}]*justify-self:\s*end/s);
});

test("Read Mode shapes use a closed-by-default drawer with bounded controls", () => {
    assert.match(html, /id="readShapesButton"[^>]*aria-expanded="false"[^>]*aria-controls="chordShapesPanel"/);
    assert.match(html, /id="readShapesBackdrop"[^>]*hidden/);
    assert.match(app, /state\.readShapesOpen = Boolean\(open\) && state\.readMode/);
    assert.match(app, /focusWithoutScroll\(\$\("closeReadShapesButton"\)\)/);
    assert.match(app, /readShapesBackdrop\.addEventListener\("click"[\s\S]*setReadShapes\(false\)/);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-shapes-panel\s*\{[^}]*position:\s*fixed[^}]*display:\s*none/s);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-shapes-panel\.is-read-open\s*\{[^}]*display:\s*block/s);
});

test("Read Mode shares reading preferences and is mutually exclusive with Performance", () => {
    assert.match(app, /elements\.readZoomValue\.value = `\$\{zoom\}%`/);
    assert.match(app, /elements\.readSpacingValue\.value = `\$\{spacing\}px`/);
    assert.match(app, /readZoomDecrease[\s\S]*adjustChartZoom/);
    assert.match(app, /readSpacingDecrease[\s\S]*adjustLineSpacing/);
    assert.match(app, /function openPerformance\(\)[\s\S]*resumeReadAfterPerformance = state\.readMode[\s\S]*setReadMode\(false/);
    assert.match(app, /performance\.addEventListener\("close"[\s\S]*resumeReadAfterPerformance[\s\S]*setReadMode\(true/);
});

test("Read Mode remains presentation-only and content-free", () => {
    assert.doesNotMatch(core + storage + songImport, /readMode|readShapesOpen|read-mode/);
    assert.doesNotMatch(app, /preferences\.readMode|preferences\.readShapes|URLSearchParams[\s\S]{0,160}readMode|umami[\s\S]{0,160}readMode/);
    assert.doesNotMatch(app, /fetch\(|sendBeacon|XMLHttpRequest|WebSocket|EventSource/);
    assert.match(app, /readMode:\s*false/);
    assert.match(app, /readShapesOpen:\s*false/);
});
