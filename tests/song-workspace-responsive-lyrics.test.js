const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles/song-workspace.css"), "utf8");

function mediaRegion(start, end) {
    const startIndex = css.indexOf(start);
    const endIndex = css.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, start);
    assert.notEqual(endIndex, -1, end);
    return css.slice(startIndex, endIndex);
}

test("mobile lyrics wrap naturally without a horizontal lyric scroller", () => {
    const mobile = mediaRegion("@media (max-width: 720px)", "@media (max-width: 420px)");

    assert.match(mobile, /\.workspace-line-content\s*\{[^}]*overflow-x:\s*hidden/s);
    assert.match(mobile, /\.workspace-token-track\s*\{[^}]*width:\s*100% !important[^}]*white-space:\s*normal/s);
    assert.match(mobile, /\.workspace-lyric-flow\s*\{[^}]*width:\s*100%[^}]*overflow-wrap:\s*anywhere[^}]*word-break:\s*normal/s);
    assert.match(mobile, /\.workspace-lyric-token\s*\{[^}]*white-space:\s*pre-wrap[^}]*overflow-wrap:\s*anywhere/s);
});

test("mobile Add controls align with the lyric content edge and preserve their touch target", () => {
    const mobile = mediaRegion("@media (max-width: 720px)", "@media (max-width: 420px)");

    assert.match(mobile, /\.workspace-line\s*\{[^}]*padding-inline:\s*6px/s);
    assert.match(mobile, /\.workspace-add-control\s*\{[^}]*justify-items:\s*start[^}]*padding-inline-start:\s*6px/s);
    assert.match(mobile, /\.workspace-add-trigger\s*\{[^}]*justify-content:\s*flex-start[^}]*min-width:\s*44px[^}]*min-height:\s*44px[^}]*padding-inline:\s*0 9px/s);
});

test("tablet mode navigation keeps its intrinsic width instead of stretching Nashville", () => {
    const tablet = mediaRegion("@media (max-width: 900px) and (min-width: 721px)", "@media (max-width: 720px)");

    assert.match(tablet, /\.workspace-modebar\s*\{[^}]*align-items:\s*flex-start[^}]*flex-direction:\s*column/s);
    assert.doesNotMatch(tablet, /\.workspace-modebar\s*\{[^}]*align-items:\s*stretch/s);
});

test("visual wrapping does not alter long lyric text or meaningful anchors", () => {
    const examples = [
        ["這是一段完全合成的中文長句用來確認手機版歌詞自然換行", 8],
        ["Synthetic English line with exceptionallylongsyntheticwordcanaryabcdefghi", 4],
        ["混合 Mixed 合成內容 continues with local-only words", 6]
    ];

    examples.forEach(([text, anchorPosition]) => {
        const line = Core.createLine(text, [Core.createChord("Cmaj9", anchorPosition)]);
        const song = Core.createSong({
            title: "Responsive local canary",
            sections: [Core.createSection("Wrap", "verse", [line])]
        });
        const serialized = Core.serializeSong(song);
        const restored = Core.deserializeSong(serialized);
        const restoredLine = restored.sections[0].lines[0];
        const anchoredToken = Core.layoutLyricLine(restoredLine).tokens.find(token => token.chords.length);

        assert.equal(restoredLine.text, text);
        assert.equal(restoredLine.chords[0].anchorPosition, anchorPosition);
        assert.equal(anchoredToken.chords[0].anchorPosition, anchorPosition);
    });
});

test("long wrapped lyrics retain four meaningful anchors through save, reload, and export", () => {
    const text = "這是 synthetic mixed lyric with four local-only anchors 以及更多合成內容用來跨越多個手機視覺行";
    const anchorPositions = [0, 4, 8, 12];
    const line = Core.createLine(
        text,
        anchorPositions.map((position, index) => Core.createChord(["C", "G/B", "Am7", "Fmaj9"][index], position))
    );
    const song = Core.createSong({
        title: "Four-anchor responsive canary",
        sections: [Core.createSection("Wrap", "verse", [line])]
    });

    const restored = Core.deserializeSong(Core.serializeSong(song));
    const restoredLine = restored.sections[0].lines[0];
    const exported = Core.parseChordPro(Core.toChordPro(restored));
    const exportedLine = exported.sections.flatMap(section => section.lines).find(item => item.text === text);

    assert.equal(restoredLine.text, text);
    assert.deepEqual(restoredLine.chords.map(chord => chord.anchorPosition), anchorPositions);
    assert.deepEqual(
        Core.layoutLyricLine(restoredLine).tokens
            .filter(token => token.chords.length)
            .flatMap(token => token.chords.map(chord => chord.anchorPosition)),
        anchorPositions
    );
    assert.equal(exportedLine.text, text);
    assert.deepEqual(exportedLine.chords.map(chord => chord.anchorPosition), anchorPositions);
});
