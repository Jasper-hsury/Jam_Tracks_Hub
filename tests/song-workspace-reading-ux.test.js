const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const workspaceHtml = read("song-workspace.html");
const workspaceJs = read("scripts/song-workspace.js");
const workspaceCss = read("styles/song-workspace.css");
const storageJs = read("scripts/song-workspace-storage.js");
const coreJs = read("scripts/song-workspace-core.js");
const importJs = read("scripts/song-workspace-import.js");
const progressionWriterJs = read("scripts/progression-writer.js");
const en = JSON.parse(read("locales/en/common.json")).pages.songWorkspace;
const zh = JSON.parse(read("locales/zh-TW/common.json")).pages.songWorkspace;

test("chart zoom exposes bounded native controls beside the five view modes", () => {
    const modebar = workspaceHtml.slice(
        workspaceHtml.indexOf('<div class="workspace-modebar">'),
        workspaceHtml.indexOf('<div class="workspace-capo-results"')
    );
    assert.equal((modebar.match(/data-view-mode=/g) || []).length, 5);
    assert.match(modebar, /class="workspace-view-controls"[\s\S]*class="workspace-segmented"[\s\S]*class="workspace-chart-zoom"/);
    assert.match(modebar, /id="chartZoomInput"[^>]*type="number"[^>]*min="50"[^>]*max="150"[^>]*step="1"[^>]*value="100"[^>]*inputmode="numeric"/);
    assert.match(modebar, /id="chartZoomDecreaseButton"[^>]*type="button"[^>]*data-i18n-aria-label="pages\.songWorkspace\.decreaseZoom"/);
    assert.match(modebar, /id="chartZoomIncreaseButton"[^>]*type="button"[^>]*data-i18n-aria-label="pages\.songWorkspace\.increaseZoom"/);
    for (const locale of [en, zh]) {
        ["zoom", "chartZoom", "decreaseZoom", "increaseZoom"].forEach(key => assert.equal(typeof locale[key], "string", key));
    }
});

test("main and Performance charts share one local chart zoom preference", () => {
    assert.match(workspaceJs, /\[elements\.chart, elements\.performanceChart\][\s\S]*setProperty\("--song-chart-zoom", `\$\{zoom\}%`\)/);
    assert.match(workspaceJs, /Storage\.stepChartZoom\(state\.preferences\.chartZoom, delta\)/);
    assert.match(workspaceJs, /delete state\.preferences\.fontScale/);
    assert.doesNotMatch(workspaceJs, /style\.fontSize|preferences\.fontScale\s*=/);
    assert.match(storageJs, /jamTracksHubSongWorkspacePreferences/);
    assert.doesNotMatch(workspaceJs, /fetch\(|sendBeacon|XMLHttpRequest|WebSocket|EventSource/);
});

test("chart zoom uses reflowing typography and leaves print at its compact baseline", () => {
    assert.match(workspaceCss, /\.workspace-chart,\s*\.performance-chart\s*\{[^}]*font-size:\s*var\(--song-chart-zoom\)/s);
    assert.match(workspaceCss, /--song-chart-lyric-size:\s*1\.1875em/);
    assert.match(workspaceCss, /\.workspace-line\s*\{[^}]*font:\s*inherit/s);
    assert.match(workspaceCss, /\.workspace-lyric-token\s*\{[^}]*font-size:\s*clamp\(13px, var\(--song-chart-lyric-size\), 28\.5px\)[^}]*line-height:\s*1\.75/s);
    assert.match(workspaceCss, /\.workspace-chord-annotation\s*\{[^}]*font-size:\s*clamp\(11\.5px, var\(--song-chart-chord-size\), 24\.75px\)/s);
    assert.doesNotMatch(workspaceCss, /\.workspace-chart\s*\{[^}]*transform:\s*scale/s);
    assert.match(workspaceCss, /@media print[\s\S]*?\.workspace-chart\s*\{[^}]*--song-chart-zoom:\s*100% !important/s);
});

test("instrumental bars use the Progression Writer chip hierarchy without changing grid counts", () => {
    assert.match(progressionWriterJs, /svgProgressionChip[\s\S]*padStart\(2, "0"\)[\s\S]*weight:\s*900/);
    assert.match(workspaceCss, /\.workspace-line\.is-instrumental\s*\{[^}]*border-radius:\s*var\(--workspace-progression-card-radius\)[^}]*background:/s);
    assert.match(workspaceCss, /\.workspace-instrumental-line \.workspace-bar-label\s*\{[^}]*color:\s*var\(--workspace-muted\)[^}]*font-weight:\s*850/s);
    assert.match(workspaceCss, /\.workspace-instrumental-chord\s*\{[^}]*font-size:\s*clamp\(12px, var\(--song-chart-instrumental-size\), 25\.5px\)[^}]*overflow-wrap:\s*anywhere/s);
    assert.match(workspaceCss, /\.workspace-lines\.is-instrumental-grid\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/s);
    assert.match(workspaceCss, /@container \(min-width: 760px\)[\s\S]*?repeat\(8, minmax\(0, 1fr\)\)/);
});

test("long and multiple instrumental chords remain bounded across all five derived views", () => {
    const symbols = ["Cmaj9", "F#m7b5", "Bbmaj7/D", "A7sus4", "G13", "C#m", "Ebmaj7"];
    const bars = Array.from({ length: 16 }, (_, index) => Core.createLine(
        "",
        [Core.createChord(symbols[index % symbols.length], 0), Core.createChord(symbols[(index + 1) % symbols.length], 1)],
        "instrumental"
    ));
    const song = Core.createSong({ originalKey: "C", targetKey: "C", sections: [Core.createSection("Synthetic", "instrumental", bars)] });
    const original = JSON.stringify(song);
    const transforms = [
        song,
        Core.transformSongChords(song, symbol => Core.simplifyChord(symbol, "balanced")),
        Core.transformSongChords(song, symbol => Core.simplifyChord(symbol, "beginner")),
        Core.transformSongChords(song, symbol => Core.chordNumber(symbol, "C", "roman")),
        Core.transformSongChords(song, symbol => Core.chordNumber(symbol, "C", "nashville"))
    ];
    transforms.forEach(view => {
        assert.equal(view.sections[0].lines.length, 16);
        assert.ok(view.sections[0].lines.every(line => line.chords.length === 2));
        assert.ok(view.sections[0].lines.flatMap(line => line.chords).every(chord => typeof chord.symbol === "string" && chord.symbol.length));
    });
    assert.equal(JSON.stringify(song), original);
});

test("larger typography preserves meaningful anchors, one row, and export boundaries", () => {
    const examples = [
        ["故事的小黃花 從出生那年就飄著", 5],
        ["This is the deep and dying breath of", 4],
        ["你好 slow dancing", 3]
    ];
    examples.forEach(([text, position]) => {
        const line = Core.createLine(text, [Core.createChord("Cmaj9", position)]);
        const layout = Core.layoutLyricLine(line);
        assert.equal(layout.tokens.filter(token => token.chords.length).length, 1);
        assert.equal(layout.tokens.filter(token => token.chords.length)[0].chords[0].anchorPosition, position);
    });
    assert.match(workspaceJs, /Core\.fitSingleRowChordAnnotations\(measured, 8, 0\.6\)/);
    assert.doesNotMatch(workspaceJs, /rowCount|item\.row|packChordAnnotations/);
    assert.doesNotMatch(coreJs + importJs, /chartZoom|song-chart-zoom/);
    assert.doesNotMatch(workspaceJs, /URLSearchParams[\s\S]{0,160}chartZoom|umami[\s\S]{0,160}chartZoom/);
});
