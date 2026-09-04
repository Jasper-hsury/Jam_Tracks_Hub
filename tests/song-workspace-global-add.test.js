const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("song-workspace.html") + read("src/views/SongWorkspaceView.vue");
const css = read("styles/song-workspace.css");
const app = read("src/composables/useSongWorkspace.js");
const en = JSON.parse(read("locales/en/common.json")).pages.songWorkspace;
const zh = JSON.parse(read("locales/zh-TW/common.json")).pages.songWorkspace;

function functionSource(name) {
    const marker = `    function ${name}(`;
    const start = app.indexOf(marker);
    assert.notEqual(start, -1, `Missing ${name}`);
    const end = app.indexOf("\n    function ", start + marker.length);
    return app.slice(start, end < 0 ? app.length : end);
}

function region(start, end) {
    const startIndex = html.indexOf(start);
    const endIndex = html.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing ${start}`);
    assert.notEqual(endIndex, -1, `Missing ${end}`);
    return html.slice(startIndex, endIndex);
}

test("mobile Song Chart exposes exactly one Global Add dialog trigger", () => {
    assert.equal((html.match(/id="globalAddButton"/g) || []).length, 1);
    assert.match(html, /workspace-score-kicker-row[\s\S]*?pages\.songWorkspace\.chart[\s\S]*?id="globalAddButton"/);
    assert.match(css, /\.workspace-global-add-button\s*\{[^}]*display:\s*none/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-global-add-button\s*\{[^}]*display:\s*inline-flex/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-score-identity\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.workspace-chart \.workspace-add-control\s*\{[^}]*display:\s*none !important/s);
    assert.match(css, /\.workspace-editor\.is-read-mode \.workspace-global-add-button/);
    assert.match(css, /\.workspace-editor\.is-performance-open \.workspace-global-add-button/);
    assert.match(app, /openPerformance\(\)[\s\S]*?classList\.add\("is-performance-open"\)/);
    assert.match(app, /performance\.addEventListener\("close"[\s\S]*?classList\.remove\("is-performance-open"\)/);
});

test("Global Add keeps type and position choice inside one accessible modal", () => {
    const modal = region('<dialog class="workspace-dialog workspace-global-add-dialog"', "</dialog>");
    assert.match(modal, /id="globalAddTypeStep"[\s\S]*id="globalAddPositionStep"/);
    assert.equal((modal.match(/data-global-add-type=/g) || []).length, 3);
    assert.match(modal, /data-global-add-type="line"/);
    assert.match(modal, /data-global-add-type="section"/);
    assert.match(modal, /data-global-add-type="instrumental"/);
    assert.match(modal, /id="globalAddBackButton"[^>]*type="button"/);
    assert.equal((modal.match(/data-dialog-close/g) || []).length, 3);
    assert.match(css, /\.workspace-global-add-position\s*\{[\s\S]*?min-height:\s*56px/s);
});

test("Global Add reuses the shared lock and transfers it without an unlock gap", () => {
    const open = functionSource("openGlobalAddDialog");
    const choose = functionSource("chooseGlobalAddType");
    const transfer = functionSource("transferDialogBackground");
    const handoff = functionSource("handoffGlobalAdd");
    const restore = functionSource("restoreDialogBackground");

    assert.ok(open.indexOf("lockDialogBackground(elements.globalAdd") < open.indexOf("elements.globalAdd.showModal()"));
    assert.doesNotMatch(choose, /\.close\(|restoreDialogBackground|body\.style/);
    assert.match(transfer, /state\.dialogLock\.dialog = toDialog/);
    assert.ok(handoff.indexOf("transferDialogBackground") < handoff.indexOf('globalAdd.close("handoff")'));
    assert.doesNotMatch(handoff, /restoreDialogBackground|scrollTo|setTimeout|requestAnimationFrame/);
    assert.equal((restore.match(/window\.scrollTo\(/g) || []).length, 1);
});

test("Line position choices include adjacent boundaries plus empty and one-line fallbacks", () => {
    const positions = functionSource("buildLineInsertionTargets");
    assert.match(positions, /for \(let insertionIndex = 0; insertionIndex <= section\.lines\.length/);
    assert.match(positions, /"between-lines"/);
    assert.match(positions, /"inside-empty"/);
    assert.match(positions, /"empty-song"/);
    assert.match(positions, /"new-lyric-section"/);
    assert.match(positions, /section\.type === "instrumental"/);
});

test("new Line mutates the Song Document only on Save and preserves existing IDs", () => {
    const openNew = functionSource("openNewLineEditor");
    const save = functionSource("saveLineDraft");
    assert.doesNotMatch(openNew, /Core\.insertLine|insertSectionAtBoundary|scheduleSave/);
    assert.match(save, /context\.isNew[\s\S]*?Core\.insertLine/);
    assert.match(save, /context\.createSection[\s\S]*?Core\.insertSectionAtBoundary/);

    const first = Core.createLine("A", [Core.createChord("C", 0)], "lyric", "line-a");
    const second = Core.createLine("B", [Core.createChord("G", 0)], "lyric", "line-b");
    const song = Core.createSong({ sections: [Core.createSection("Verse", "verse", [first, second], "section-a")] });
    const inserted = Core.insertLine(song, 0, 1, Core.createLine("X", [], "lyric", "line-x")).song;
    assert.deepEqual(inserted.sections[0].lines.map(line => line.id), ["line-a", "line-x", "line-b"]);
    assert.deepEqual(song.sections[0].lines.map(line => line.id), ["line-a", "line-b"]);
});

test("Section and Instrumental position choices reuse canonical section boundaries", () => {
    const positions = functionSource("buildSectionInsertionTargets");
    const handoff = functionSource("handoffGlobalAdd");
    assert.match(positions, /"song-start"/);
    assert.match(positions, /"song-end"/);
    assert.match(positions, /"between-sections"/);
    assert.match(positions, /type === "instrumental" \|\| section\.type !== "instrumental"/);
    assert.match(handoff, /openSectionDialog\(target\.sectionIndex, target\.insertionIndex, trigger\)/);
    assert.match(handoff, /openInstrumentalSectionDialog\(target\.sectionIndex, target\.insertionIndex, trigger\)/);
});

test("Global Add has complete English and zh-TW localization", () => {
    const keys = [
        "addToSong", "addStep", "chooseWhatToAdd", "chooseWhereToInsert", "line", "section",
        "instrumentalChords", "back", "songBeginning", "songEnd", "insideEmptySong",
        "insideEmptySection", "beforeLine", "afterLine", "betweenLines", "betweenSections", "newLyricSection"
    ];
    for (const locale of [en, zh]) keys.forEach(key => assert.equal(typeof locale[key], "string", key));
});

test("settings use one scoped control-height and label-row geometry", () => {
    assert.match(css, /--song-settings-control-height:\s*42px/);
    assert.match(css, /--song-settings-label-height:\s*20px/);
    assert.match(css, /\.workspace-settings-nav \.workspace-field\s*\{[^}]*grid-template-rows:\s*var\(--song-settings-label-height\) var\(--song-settings-control-height\)/s);
    assert.match(css, /\.workspace-settings-nav \.workspace-readonly-field strong\s*\{[\s\S]*?height:\s*var\(--song-settings-control-height\)/s);
    assert.match(css, /\.workspace-settings-nav \.workspace-reading-stepper\s*\{[^}]*height:\s*var\(--song-settings-control-height\)/s);
});

test("Global Add remains local-only and introduces no transport primitive", () => {
    const source = [functionSource("openGlobalAddDialog"), functionSource("handoffGlobalAdd"), functionSource("saveLineDraft")].join("\n");
    assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|FormData|URLSearchParams|location\./);
});
