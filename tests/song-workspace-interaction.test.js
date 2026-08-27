const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workspaceHtml = fs.readFileSync(path.join(root, "song-workspace.html"), "utf8");
const workspaceJs = fs.readFileSync(path.join(root, "scripts/song-workspace.js"), "utf8");
const workspaceCore = fs.readFileSync(path.join(root, "scripts/song-workspace-core.js"), "utf8");
const workspaceStorage = fs.readFileSync(path.join(root, "scripts/song-workspace-storage.js"), "utf8");
const workspaceCss = fs.readFileSync(path.join(root, "styles/song-workspace.css"), "utf8");
const englishLocale = fs.readFileSync(path.join(root, "locales/en/common.json"), "utf8");
const chineseLocale = fs.readFileSync(path.join(root, "locales/zh-TW/common.json"), "utf8");

function region(start, end) {
    const startIndex = workspaceHtml.indexOf(start);
    const endIndex = workspaceHtml.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing region start: ${start}`);
    assert.notEqual(endIndex, -1, `Missing region end: ${end}`);
    return workspaceHtml.slice(startIndex, endIndex);
}

test("modal close controls bypass form submission while commit controls retain validation", () => {
    const createForm = region('<form method="dialog" id="createSongForm">', "</form>");
    const closeControls = Array.from(createForm.matchAll(/<button[^>]*data-dialog-close[^>]*>/g), match => match[0]);

    assert.equal(closeControls.length, 2);
    closeControls.forEach(control => assert.match(control, /type="button"/));
    assert.match(createForm, /id="createTitleInput"[^>]*required/);
    assert.match(createForm, /id="createSourceInput"[^>]*required/);
    assert.match(createForm, /id="confirmCreateButton"[^>]*value="default"[^>]*type="submit"/);
    assert.match(workspaceJs, /querySelectorAll\("\[data-dialog-close\]"\)[\s\S]*?closest\("dialog"\)\?\.close\("cancel"\)/);
    assert.match(workspaceJs, /event\.key === "Escape" && dismissibleDialog[\s\S]*?dismissibleDialog\.close\("cancel"\)/);
    assert.match(workspaceJs, /event\.submitter\?\.value !== "default"/);
    assert.doesNotMatch(createForm, /novalidate/);
});

test("all four create and ChordPro entry paths share the hardened dialog", () => {
    ["chords-lyrics", "lyrics", "chords", "chordpro"].forEach(mode => {
        assert.match(workspaceHtml, new RegExp(`data-create-mode="${mode}"`));
    });
    assert.match(workspaceJs, /openCreateDialog\(control\.dataset\.createMode\)/);
    assert.match(workspaceJs, /mode === "chordpro"[\s\S]*?importChordPro/);
});

test("Chord Spelling exposes theory and preserve-input modes with persisted song-level updates", () => {
    assert.match(workspaceHtml, /id="chordSpellingSelect"[\s\S]*?value="theory"[\s\S]*?value="preserve"/);
    assert.match(workspaceJs, /const KEYS = Core\.KEY_OPTIONS\.major\.concat\(Core\.KEY_OPTIONS\.minor\)/);
    assert.match(workspaceJs, /state\.song\.chordSpelling = Core\.normalizeChordSpelling\(elements\.chordSpelling\.value\)/);
    assert.match(workspaceJs, /\[elements\.originalKey, elements\.targetKey, elements\.capo, elements\.chordSpelling\]/);
    assert.match(workspaceJs, /scheduleSave\(\);[\s\S]*?renderEditor\(\)/);
});

test("Edit Line offers a danger Delete Line action and meaningful positions without a Start token", () => {
    const lineDialog = region('<form method="dialog" id="lineEditorForm">', "</form>");
    assert.match(lineDialog, /class="[^"]*workspace-button-danger[^"]*"[^>]*id="deleteLineButton"[^>]*type="button"/);
    assert.match(lineDialog, /id="anchorPositionInput"[^>]*min="1"[^>]*value="1"/);
    assert.match(workspaceJs, /Core\.tokenizeLyric\(elements\.lineText\.value\)\.filter/);
    assert.match(workspaceJs, /Core\.deleteLine\(state\.song, context\.sectionIndex, context\.lineIndex\)/);
    assert.match(workspaceJs, /lineDialog\.close\("deleted"\)[\s\S]*?scheduleSave\(\)[\s\S]*?renderEditor\(\)/);
    assert.doesNotMatch(workspaceJs, /pages\.songWorkspace\.lineStart/);
    assert.doesNotMatch(workspaceJs, /Core\.codePoints\(elements\.lineText\.value\)/);
    assert.doesNotMatch(workspaceJs, /move-anchor|pages\.songWorkspace\.move/);
    assert.doesNotMatch(englishLocale, /"move"\s*:\s*"Move"/);
    assert.doesNotMatch(chineseLocale, /"move"\s*:\s*"移動"/);
    assert.match(workspaceJs, /editing\.anchorPosition = anchorPosition/);
    assert.match(workspaceJs, /state\.editingAnchorId = chord\.id;[\s\S]*?state\.selectedAnchorPosition = chord\.anchorPosition/);
});

test("unsupported pre-release records remain skipped without a user warning or destructive cleanup", () => {
    const loadSongs = workspaceJs.slice(
        workspaceJs.indexOf("async function loadSongs()"),
        workspaceJs.indexOf("function renderLibrary()")
    );
    assert.match(loadSongs, /Core\.validateSong\(song\)[\s\S]*?catch \(error\) \{[\s\S]*?return \[\];/);
    assert.doesNotMatch(loadSongs, /Storage\.remove|replaceAll/);
    assert.doesNotMatch(workspaceJs, /preReleaseDataIncompatible/);
    assert.doesNotMatch(englishLocale, /older pre-release local songs/i);
    assert.doesNotMatch(chineseLocale, /較舊開發版本的本機歌曲/);
});

test("+ Add provides a bounded instrumental-section modal and contextual bar editing", () => {
    const instrumentalForm = region('<form method="dialog" id="instrumentalSectionForm">', "</form>");
    assert.match(instrumentalForm, /id="instrumentalSectionNameInput"[^>]*maxlength="80"/);
    assert.doesNotMatch(instrumentalForm, /instrumentalSectionNameInput[^>]*required/);
    assert.match(instrumentalForm, /id="instrumentalBarCountInput"[^>]*type="number"[^>]*min="1"[^>]*max="64"[^>]*step="1"[^>]*value="4"[^>]*required/);
    assert.match(workspaceHtml, /id="anchorPositionField"[\s\S]*?data-i18n="pages\.songWorkspace\.anchorPosition"[\s\S]*?id="anchorPositionInput"/);
    assert.match(workspaceJs, /pages\.songWorkspace\.addInstrumentalSection[\s\S]*?"add-instrumental-section"/);
    assert.match(workspaceJs, /Core\.insertInstrumentalSectionAtBoundary\(/);
    assert.match(workspaceJs, /sectionType === "instrumental"[\s\S]*?pages\.songWorkspace\.addBar[\s\S]*?"add-bar"/);
    assert.match(workspaceJs, /Core\.createLine\("", \[\], instrumental \? "instrumental" : "lyric"\)/);
    assert.match(workspaceJs, /line\.type === "instrumental"[\s\S]*?pages\.songWorkspace\.editBarNumber/);
    assert.match(workspaceJs, /elements\.lineTextField\.hidden = instrumental/);
    assert.match(workspaceJs, /elements\.anchorPreview\.hidden = instrumental/);
    assert.match(workspaceJs, /elements\.anchorPositionField\.hidden = instrumental/);
    assert.match(workspaceJs, /pages\.songWorkspace\.deleteBar/);
    assert.match(workspaceJs, /pages\.songWorkspace\.saveBar/);
    assert.match(englishLocale, /"addInstrumentalSection"\s*:\s*"Add Instrumental Section"/);
    assert.match(chineseLocale, /"addInstrumentalSection"\s*:\s*"新增純和弦段落"/);
});

test("Performance Mode exposes BPM-based speed as a retained multiplier", () => {
    assert.match(workspaceHtml, /id="scrollSpeedInput"[^>]*min="0\.5"[^>]*max="2"[^>]*step="0\.25"[^>]*value="1"/);
    assert.match(workspaceHtml, /<output id="scrollSpeedValue"[^>]*>1\.0×<\/output>/);
    assert.match(workspaceJs, /scrollSpeedMultiplier/);
    assert.match(workspaceJs, /Core\.scrollDistanceForElapsed\(state\.song\?\.bpm, multiplier, elapsed\)/);
    assert.match(workspaceJs, /state\.scrollPosition \+ distance/);
    assert.match(workspaceJs, /scrollHeight - elements\.performance\.clientHeight/);
    assert.doesNotMatch(workspaceJs, /elapsed \* speed \* 0\.012/);
});

test("button semantics reuse shared site tokens and cover interaction states", () => {
    assert.match(workspaceCss, /\.workspace-button-primary\s*\{[^}]*var\(--primary-button-background\)[^}]*var\(--button-depth-shadow\)/s);
    assert.match(workspaceCss, /\.workspace-button-secondary\s*\{[^}]*var\(--secondary-button-text\)[^}]*var\(--secondary-button-border\)/s);
    assert.match(workspaceCss, /\.workspace-button-danger\s*\{[^}]*var\(--danger-text\)[^}]*var\(--danger-background\)/s);
    assert.match(workspaceCss, /\.workspace-button-primary:active/);
    assert.match(workspaceCss, /\.workspace-button:focus-visible[\s\S]*?outline:\s*3px solid var\(--focus-ring\)/);
    assert.match(workspaceCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.workspace-menu-action[\s\S]*?transition:\s*none/s);
    assert.match(workspaceJs, /workspace-button-danger/);
    assert.match(workspaceJs, /workspace-menu-action/);
});

test("local-first song modules contain no song-content network transport", () => {
    const source = [workspaceJs, workspaceCore, workspaceStorage].join("\n");
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|FormData|\.post\s*\(/);
});
