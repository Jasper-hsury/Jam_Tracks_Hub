const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Shapes = require("../scripts/chord-shapes.js");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("song-workspace.html");
const js = read("scripts/song-workspace.js");
const css = read("styles/song-workspace.css");
const en = JSON.parse(read("locales/en/common.json")).pages.songWorkspace;
const zh = JSON.parse(read("locales/zh-TW/common.json")).pages.songWorkspace;

test("Song Workspace picker reuses the Progression Writer picker structure and card renderer", () => {
    assert.match(html, /workspace-shape-dialog-shell progression-writer-shape-picker-dialog/);
    assert.match(html, /progression-writer-shape-picker-header/);
    assert.match(html, /progression-writer-shape-picker-summary/);
    assert.match(html, /dictionary-position-filter progression-writer-shape-filter/);
    assert.match(html, /progression-writer-shape-picker-grid workspace-shape-picker-grid/);
    assert.match(html, /id="closeShapePickerButton"[^>]*data-i18n="common\.close">Close<\/button>/);
    assert.match(js, /Shapes\.renderProgressionDiagram\(parsed, item\.voicing/);
    assert.doesNotMatch(js, /Shapes\.generateVoicings\(parsed\)\.slice\(0, 24\)/);
});

test("picker filters use real voicing position and root-string data", () => {
    const parsed = Shapes.parseChord("G");
    const voicings = Shapes.generateVoicings(parsed);
    const nearZero = voicings.filter(voicing => Shapes.nearestPositionTarget(voicing.frets) === 0);
    const sixthStringRoot = voicings.filter(voicing => Shapes.voicingHasRootOnString(voicing.frets, "6", parsed));

    assert.ok(voicings.length > 24);
    assert.ok(nearZero.length > 0 && nearZero.length < voicings.length);
    assert.ok(sixthStringRoot.length > 0 && sixthStringRoot.length < voicings.length);
    assert.match(js, /Shapes\.nearestPositionTarget\(item\.voicing\.frets\)/);
    assert.match(js, /Shapes\.voicingHasRootOnString\(/);
});

test("shared picker cards support localized Shape, Use Shape, and position labels", () => {
    const parsed = Shapes.parseChord("G");
    const voicing = Shapes.generateVoicings(parsed)[0];
    const markup = Shapes.renderProgressionDiagram(parsed, voicing, 0, 1, {
        action: "select",
        variant: "picker",
        shapeIndex: 0,
        labels: {
            shape: zh.shape,
            useShape: zh.useShape,
            openPosition: zh.openLowPosition,
            startsAtFret: zh.startsAtFret
        }
    });

    assert.match(markup, /指型 1/);
    assert.match(markup, /使用此指型/);
    assert.ok(en.shapeCount.includes("{{count}}"));
    assert.ok(zh.shapeCountFiltered.includes("{{total}}"));
});

test("Create and ChordPro share a scrollable dialog with hidden cross-browser scrollbars", () => {
    assert.match(html, /class="workspace-dialog workspace-create-dialog" id="createSongDialog"/);
    assert.match(css, /\.workspace-dialog\s*\{[^}]*overflow:\s*auto/s);
    assert.match(css, /\.workspace-dialog\.workspace-create-dialog\s*\{[^}]*scrollbar-width:\s*none[^}]*-ms-overflow-style:\s*none/s);
    assert.match(css, /\.workspace-dialog\.workspace-create-dialog::\-webkit-scrollbar\s*\{[^}]*width:\s*0[^}]*height:\s*0/s);
    assert.doesNotMatch(css, /\.workspace-dialog\.workspace-create-dialog\s*\{[^}]*overflow:\s*hidden/s);
    ["chords-lyrics", "lyrics", "chords", "chordpro"].forEach(mode => {
        assert.match(html, new RegExp(`data-create-mode="${mode}"`));
    });
});
