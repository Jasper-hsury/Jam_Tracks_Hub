const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");
const SongImport = require("../scripts/song-workspace-import.js");

const root = path.resolve(__dirname, "..");
const workspaceHtml = fs.readFileSync(path.join(root, "song-workspace.html"), "utf8")
    + fs.readFileSync(path.join(root, "src/views/SongWorkspaceView.vue"), "utf8");
const workspaceJs = fs.readFileSync(path.join(root, "src/composables/useSongWorkspace.js"), "utf8");
const workspaceCss = fs.readFileSync(path.join(root, "styles/song-workspace.css"), "utf8");
const en = JSON.parse(fs.readFileSync(path.join(root, "locales/en/common.json"), "utf8")).pages.songWorkspace;
const zh = JSON.parse(fs.readFileSync(path.join(root, "locales/zh-TW/common.json"), "utf8")).pages.songWorkspace;

function region(start, end) {
    const startIndex = workspaceHtml.indexOf(start);
    const endIndex = workspaceHtml.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing region start: ${start}`);
    assert.notEqual(endIndex, -1, `Missing region end: ${end}`);
    return workspaceHtml.slice(startIndex, endIndex);
}

test("exposes exactly three primary song creation methods", () => {
    const primary = region('<div class="workspace-entry-grid" data-primary-create-options>', '<section class="workspace-import-area"');
    const modes = Array.from(primary.matchAll(/data-create-mode="([^"]+)"/g), match => match[1]);

    assert.deepEqual(modes, ["chords-lyrics", "lyrics", "chords"]);
    assert.doesNotMatch(primary, /ChordPro|importSongButton|jth-json/);
});

test("groups ChordPro and Jam Tracks Hub JSON as secondary imports", () => {
    const imports = region('<section class="workspace-import-area"', '<section class="workspace-library"');
    const kinds = Array.from(imports.matchAll(/data-import-option="([^"]+)"/g), match => match[1]);

    assert.deepEqual(kinds, ["chordpro", "jth-json"]);
    assert.match(imports, /data-create-mode="chordpro"/);
    assert.match(imports, /id="importSongButton"[^>]*data-import-kind="jth-json"/);
    assert.match(imports, /data-i18n="pages\.songWorkspace\.chordProExample"/);
    assert.match(imports, /<details class="workspace-import-help">/);
    assert.doesNotMatch(imports, /backupSongsButton|restoreSongsButton/);
});

test("keeps existing ChordPro and JSON handlers wired to the new controls", () => {
    assert.match(workspaceJs, /querySelectorAll\("\[data-create-mode\]"\)[\s\S]*?openCreateDialog\(control\.dataset\.createMode\)/);
    assert.match(workspaceJs, /if \(mode === "chordpro"\) song = Core\.parseChordPro/);
    assert.match(workspaceJs, /importSongButton"\)\.addEventListener\("click", \(\) => elements\.importInput\.click\(\)\)/);
    assert.match(workspaceJs, /SongImport\.importSingleSong\(source, \{/);
    assert.match(workspaceJs, /state\.songs = result\.songs/);
    assert.match(workspaceJs, /showEditor\(result\.song\)/);
});

test("keeps the secondary import area responsive and keyboard visible", () => {
    assert.match(workspaceCss, /\.workspace-entry-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
    assert.match(workspaceCss, /\.workspace-import-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
    assert.match(workspaceCss, /@media \(max-width: 720px\)[\s\S]*?\.workspace-entry-grid,[\s\S]*?\.workspace-import-grid,[\s\S]*?grid-template-columns:\s*1fr/);
    assert.match(workspaceCss, /\.workspace-import-help summary\s*\{[^}]*min-height:\s*44px/s);
    assert.match(workspaceCss, /\.workspace-import-help summary:focus-visible/);
    assert.match(workspaceCss, /\.workspace-chordpro-example\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test("provides complete English and zh-TW creation/import labels", () => {
    assert.deepEqual(
        [en.createSong, en.otherImportOptions, en.chordsLyrics, en.lyricsOnly, en.chordsOnly, en.importChordPro, en.jthJson, en.importJthJson, en.whatIsChordPro],
        ["Create Song", "Other Import Options", "Chords + Lyrics", "Lyrics Only", "Chords Only", "Import ChordPro", "Jam Tracks Hub JSON", "Import Jam Tracks Hub JSON", "What is ChordPro?"]
    );
    assert.deepEqual(
        [zh.createSong, zh.otherImportOptions, zh.chordsLyrics, zh.lyricsOnly, zh.chordsOnly, zh.importChordPro, zh.jthJson, zh.importJthJson, zh.whatIsChordPro],
        ["建立歌曲", "其他匯入方式", "和弦與歌詞", "僅歌詞", "僅和弦", "匯入 ChordPro", "Jam Tracks Hub JSON", "匯入 Jam Tracks Hub JSON", "什麼是 ChordPro？"]
    );
    assert.equal(en.chordProExample, "[G]lyrics [D]lyrics");
    assert.equal(zh.chordProExample, "[G]歌詞 [D]歌詞");
});

test("imports synthetic ChordPro without changing parser semantics", () => {
    const source = "{title: Test Song}\n{key: G}\n\n[G]測試歌詞 [D]第二段";
    const song = Core.parseChordPro(source);
    const lyricLine = song.sections.flatMap(section => section.lines).find(line => line.text);

    assert.equal(song.title, "Test Song");
    assert.equal(song.originalKey, "G");
    assert.equal(lyricLine.text, "測試歌詞 第二段");
    assert.deepEqual(lyricLine.chords.map(chord => chord.symbol), ["G", "D"]);
});

test("accepts a valid JTH project and rejects invalid JSON or schema", () => {
    const project = Core.createSong({
        title: "Synthetic JSON Project",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("測試內容", [Core.createChord("G", 0)], "lyric")
        ])]
    });
    const restored = Core.deserializeSong(Core.serializeSong(project));

    assert.equal(restored.schema, "jamtrackshub-song");
    assert.equal(restored.version, 2);
    assert.equal(restored.title, "Synthetic JSON Project");
    assert.equal(restored.sections[0].lines[0].text, "測試內容");
    assert.throws(() => Core.deserializeSong("not-json"), /valid JSON/);
    assert.throws(() => Core.validateSong({ schema: "not-jamtrackshub-song", version: 1, sections: [] }), /supported Song Document/);
});

test("imports one exported song, regenerates its id, updates the collection, and persists it", async () => {
    const exported = Core.createSong({
        id: "song-user-provided-id",
        title: "Synthetic Single Song Import",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("Synthetic lyric", [Core.createChord("G", 0)], "lyric")
        ])]
    });
    const persisted = new Map();
    const existing = [Core.createSong({ title: "Existing Song" })];
    const storage = {
        async put(song) { persisted.set(song.id, structuredClone(song)); }
    };

    const result = await SongImport.importSingleSong(Core.serializeSong(exported), {
        core: Core,
        storage,
        existingSongs: existing,
        now: "2026-08-27T12:00:00.000Z"
    });

    assert.equal(result.song.title, "Synthetic Single Song Import");
    assert.notEqual(result.song.id, exported.id);
    assert.equal(Core.isOpaqueSongId(result.song.id), true);
    assert.equal(result.songs.length, 2);
    assert.equal(result.songs[0].id, result.song.id);
    assert.equal(persisted.has(result.song.id), true);
    assert.equal(Array.from(persisted.values())[0].sections[0].lines[0].text, "Synthetic lyric");
    assert.doesNotMatch(Core.songWorkspaceUrl(result.song.id), /song-user-provided-id/);
});

test("single-song import rejects invalid input with a bounded content-free error", async () => {
    const canary = "RAW_JSON_CANARY_NEVER_ECHO";
    const storage = { async put() { throw new Error("should not write"); } };

    for (const source of ["", `{ broken: ${canary}`, JSON.stringify({ schema: "backup", version: 1, songs: [] })]) {
        await assert.rejects(
            SongImport.importSingleSong(source, { core: Core, storage, existingSongs: [] }),
            error => error.name === "SingleSongImportError"
                && error.message === "JTH_SINGLE_SONG_IMPORT_FAILED"
                && !error.message.includes(canary)
        );
    }
});
