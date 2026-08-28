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

test("settings and view modes use two independent navigation rows", () => {
    const settings = workspaceHtml.slice(
        workspaceHtml.indexOf('<details class="workspace-settings-disclosure"'),
        workspaceHtml.indexOf('<div class="workspace-modebar">')
    );
    const modebar = workspaceHtml.slice(
        workspaceHtml.indexOf('<div class="workspace-modebar">'),
        workspaceHtml.indexOf('<div class="workspace-capo-results"')
    );
    assert.equal((modebar.match(/data-view-mode=/g) || []).length, 5);
    assert.match(settings, /class="workspace-settings-nav"[\s\S]*id="originalKeySelect"[\s\S]*id="targetKeySelect"[\s\S]*id="shapeKeyValue"[\s\S]*id="chordSpellingSelect"[\s\S]*id="chartZoomInput"[\s\S]*id="lineSpacingInput"/);
    assert.match(settings, /id="chartZoomInput"[^>]*type="number"[^>]*min="50"[^>]*max="150"[^>]*step="1"[^>]*value="100"[^>]*inputmode="numeric"/);
    assert.match(settings, /id="chartZoomDecreaseButton"[^>]*type="button"[^>]*data-i18n-aria-label="pages\.songWorkspace\.decreaseZoom"/);
    assert.match(settings, /id="chartZoomIncreaseButton"[^>]*type="button"[^>]*data-i18n-aria-label="pages\.songWorkspace\.increaseZoom"/);
    assert.match(settings, /id="lineSpacingInput"[^>]*type="number"[^>]*min="0"[^>]*max="20"[^>]*step="1"[^>]*value="10"[^>]*inputmode="numeric"/);
    assert.match(settings, /id="lineSpacingDecreaseButton"[^>]*type="button"[^>]*data-i18n-aria-label="pages\.songWorkspace\.decreaseLineSpacing"/);
    assert.match(settings, /id="lineSpacingIncreaseButton"[^>]*type="button"[^>]*data-i18n-aria-label="pages\.songWorkspace\.increaseLineSpacing"/);
    assert.doesNotMatch(modebar, /chartZoomInput|lineSpacingInput|originalKeySelect|targetKeySelect/);
    for (const locale of [en, zh]) {
        ["songSettings", "songSettingsHint", "zoom", "chartZoom", "decreaseZoom", "increaseZoom", "lineSpacing", "decreaseLineSpacing", "increaseLineSpacing"]
            .forEach(key => assert.equal(typeof locale[key], "string", key));
    }
});

test("main and Performance charts share local reading preferences", () => {
    assert.match(workspaceJs, /\[elements\.chart, elements\.performanceChart\][\s\S]*setProperty\("--song-chart-zoom", `\$\{zoom\}%`\)/);
    assert.match(workspaceJs, /\[elements\.chart, elements\.performanceChart\][\s\S]*setProperty\("--song-line-spacing", `\$\{spacing\}px`\)/);
    assert.match(workspaceJs, /Storage\.stepChartZoom\(state\.preferences\.chartZoom, delta\)/);
    assert.match(workspaceJs, /Storage\.stepLineSpacing\(state\.preferences\.lineSpacing, delta\)/);
    assert.match(workspaceJs, /delete state\.preferences\.fontScale/);
    assert.doesNotMatch(workspaceJs, /style\.fontSize|preferences\.fontScale\s*=/);
    assert.match(storageJs, /jamTracksHubSongWorkspacePreferences/);
    assert.doesNotMatch(workspaceJs, /fetch\(|sendBeacon|XMLHttpRequest|WebSocket|EventSource/);
});

test("mode selector stays on one row until mobile and both steppers have centered symmetric values", () => {
    assert.match(workspaceCss, /\.workspace-modebar\s*\{[^}]*flex-wrap:\s*nowrap/s);
    assert.match(workspaceCss, /\.workspace-segmented\s*\{[^}]*flex-wrap:\s*nowrap[^}]*flex:\s*0 0 auto/s);
    assert.match(workspaceCss, /@media \(max-width: 720px\)[\s\S]*?\.workspace-segmented\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    assert.match(workspaceCss, /\.workspace-reading-stepper\s*\{[^}]*grid-template-columns:\s*36px 64px 36px/s);
    assert.match(workspaceCss, /\.workspace-reading-value\s*\{[^}]*justify-content:\s*center[^}]*width:\s*64px/s);
    assert.match(workspaceCss, /\.workspace-reading-value input\s*\{[^}]*width:\s*36px[^}]*text-align:\s*center/s);
    assert.doesNotMatch(workspaceCss, /\.workspace-reading-value input\s*\{[^}]*text-align:\s*right/s);
});

test("mobile settings use a deterministic disclosure and keep zoom with line spacing", () => {
    assert.match(workspaceHtml, /<details class="workspace-settings-disclosure" id="workspaceSettingsDisclosure" open>\s*<summary>/);
    assert.match(workspaceCss, /@media \(max-width: 720px\)[\s\S]*?\.workspace-settings-disclosure > summary\s*\{[^}]*display:\s*flex/s);
    assert.match(workspaceCss, /\.workspace-settings-disclosure:not\(\[open\]\) > \.workspace-settings-panel\s*\{[^}]*display:\s*none/s);
    assert.match(workspaceCss, /@media \(max-width: 720px\)[\s\S]*?\.workspace-reading-controls\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
    assert.match(workspaceCss, /@media \(min-width: 721px\)[\s\S]*?\.workspace-settings-disclosure > \.workspace-settings-panel\s*\{[^}]*display:\s*grid !important/s);
    assert.match(workspaceJs, /function syncSettingsDisclosureViewport\(\)[\s\S]*matchMedia\("\(max-width: 720px\)"\)[\s\S]*viewportMode === "wide"/);
    assert.match(workspaceJs, /window\.addEventListener\("resize", function\(\) \{\s*syncSettingsDisclosureViewport\(\)/);
    assert.match(workspaceCss, /@media \(max-width: 900px\) and \(min-width: 721px\)[\s\S]*?\.workspace-settings-nav\s*\{[^}]*repeat\(5, minmax\(0, 1fr\)\)[\s\S]*?\.workspace-reading-controls\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
});

test("key semantics and Performance auto-scroll behavior are explained accurately", () => {
    for (const locale of [en, zh]) {
        [
            "keyHelpTitle", "originalKeyHelp", "targetKeyHelp", "shapeKeyHelp", "keyHelpExample",
            "performanceSpeedHelpTitle", "performanceSpeedHelp"
        ].forEach(key => assert.equal(typeof locale[key], "string", key));
    }
    assert.match(en.keyHelpExample, /Target A \+ Capo 2.*G shapes.*hear A/i);
    assert.match(zh.keyHelpExample, /目標調性 A.*Capo 2.*G 調和弦按法.*A/);
    assert.match(en.performanceSpeedHelp, /BPM.*starting pace/i);
    assert.match(en.performanceSpeedHelp, /Zoom and line spacing.*chart height/i);
    assert.ok(workspaceHtml.indexOf('class="performance-speed-help"') < workspaceHtml.indexOf('id="performanceChart"'));
    assert.match(workspaceJs, /Core\.scrollDistanceForElapsed\(state\.song\?\.bpm, multiplier, elapsed\)/);
    assert.match(workspaceJs, /elements\.performance\.scrollHeight - elements\.performance\.clientHeight/);
    assert.match(workspaceCss, /\.performance-speed-help\s*\{[^}]*margin:\s*18px auto 0[^}]*padding-bottom:\s*12px/s);
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

test("line spacing changes only non-instrumental reading rows and print remains compact", () => {
    assert.match(workspaceCss, /\.workspace-chart,\s*\.performance-chart\s*\{[^}]*--song-line-spacing:\s*10px/s);
    assert.match(workspaceCss, /\.workspace-line:not\(\.is-instrumental\)\s*\{[^}]*min-height:\s*0[^}]*padding-block:\s*calc\(var\(--song-line-spacing\) \/ 2\)/s);
    assert.match(workspaceCss, /\.workspace-line\.is-instrumental\s*\{[^}]*min-height:\s*94px/s);
    assert.match(workspaceCss, /@media print[\s\S]*?\.workspace-chart\s*\{[^}]*--song-line-spacing:\s*5px !important/s);
    assert.doesNotMatch(coreJs + importJs, /lineSpacing|song-line-spacing/);
    assert.doesNotMatch(workspaceJs, /URLSearchParams[\s\S]{0,160}lineSpacing|umami[\s\S]{0,160}lineSpacing/);
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
