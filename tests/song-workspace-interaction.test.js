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
