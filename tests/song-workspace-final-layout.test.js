const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");
const Shapes = require("../scripts/chord-shapes.js");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const workspaceHtml = read("song-workspace.html");
const workspaceJs = read("scripts/song-workspace.js");
const workspaceCss = read("styles/song-workspace.css");
const i18nJs = read("scripts/i18n.js");
const i18nInit = read("scripts/i18n-init.js");
const componentsCss = read("styles/components.css");
const legalHtml = read("legal.html");
const legalView = read("src/views/LegalView.vue");
const buildScript = read("tools/scripts/build-cloudflare.js");
const en = JSON.parse(read("locales/en/common.json"));
const zh = JSON.parse(read("locales/zh-TW/common.json"));

test("instrumental bars render as a compact four/eight-column measure strip", () => {
    assert.match(workspaceJs, /workspace-lines\$\{instrumental \? " is-instrumental-grid" : ""\}/);
    assert.match(workspaceCss, /\.workspace-lines\.is-instrumental-grid\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/s);
    assert.match(workspaceCss, /@container \(min-width: 760px\)[\s\S]*?repeat\(8, minmax\(0, 1fr\)\)/);
    assert.match(workspaceCss, /@media print[\s\S]*?\.workspace-lines\.is-instrumental-grid\s*\{[^}]*repeat\(8, minmax\(0, 1fr\)\)/s);
    assert.match(workspaceCss, /\.workspace-lines\.is-instrumental-grid > \.workspace-add-control\s*\{[^}]*grid-column:\s*1 \/ -1/s);

    const instrumentalBranch = workspaceJs.slice(
        workspaceJs.indexOf('if (line.type === "instrumental")'),
        workspaceJs.indexOf("if (!line.text)")
    );
    assert.match(instrumentalBranch, /if \(editable\) \{[\s\S]*?chords\.setAttribute\("aria-hidden", "true"\)[\s\S]*?\} else \{[\s\S]*?workspace-bar-label[\s\S]*?barNumber/);
    assert.ok(instrumentalBranch.indexOf("workspace-bar-label") < instrumentalBranch.lastIndexOf("chords"));
    assert.match(workspaceJs, /editBarNumber[\s\S]{0,220}barChordSummary/);
    assert.match(instrumentalBranch, /setAttribute\("role", "group"\)/);
    assert.match(instrumentalBranch, /workspace-empty-bar", "—"/);
    assert.doesNotMatch(instrumentalBranch, /emptyLine/);

    assert.match(workspaceCss, /@media screen[\s\S]*?\.workspace-lines\.is-instrumental-grid\s*\{[^}]*width:\s*min\(100%, 288px\)[^}]*row-gap:\s*3px[^}]*justify-self:\s*start/s);
    assert.match(workspaceCss, /@media screen[\s\S]*?\.workspace-chart \.workspace-line\.is-instrumental,\s*\.performance-chart \.workspace-line\.is-instrumental\s*\{[^}]*min-height:\s*44px[^}]*border-width:\s*0 0 0 1px[^}]*border-radius:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none/s);
    assert.match(workspaceCss, /\.workspace-chart \.workspace-line\.is-instrumental:nth-child\(4n\)[\s\S]*?border-right-width:\s*1px/);
    assert.match(workspaceCss, /@container \(min-width: 760px\)[\s\S]*?\.workspace-line\.is-instrumental:nth-child\(8n\)[\s\S]*?border-right-width:\s*1px/);
    assert.doesNotMatch(workspaceCss, /\.workspace-chart \.workspace-line\.is-instrumental\s*\{[^}]*border-width:\s*1px 1px 1px 0/s);
    assert.match(workspaceCss, /\.workspace-chart \.workspace-instrumental-line,\s*\.performance-chart \.workspace-instrumental-line\s*\{[^}]*grid-template-rows:\s*minmax\(42px, 1fr\)[^}]*min-height:\s*42px/s);
    assert.match(workspaceCss, /@container \(min-width: 760px\)[\s\S]*?\.workspace-lines\.is-instrumental-grid\s*\{[^}]*width:\s*min\(100%, 768px\)/s);
    assert.match(workspaceCss, /\.workspace-chart \.workspace-instrumental-line \.workspace-bar-label,\s*\.performance-chart \.workspace-instrumental-line \.workspace-bar-label\s*\{[^}]*display:\s*none/s);

    const rowSizes = (barCount, columnCount) => Array.from(
        { length: Math.ceil(barCount / columnCount) },
        (_, row) => Math.min(columnCount, barCount - row * columnCount)
    );
    assert.deepEqual(rowSizes(4, 4), [4]);
    assert.deepEqual(rowSizes(8, 4), [4, 4]);
    assert.deepEqual(rowSizes(12, 4), [4, 4, 4]);
    assert.deepEqual(rowSizes(8, 8), [8]);
    assert.deepEqual(rowSizes(12, 8), [8, 4]);
});

test("instrumental ordering and stable IDs survive middle-bar deletion", () => {
    const lines = Array.from({ length: 12 }, (_, index) => Core.createLine(
        "",
        [Core.createChord(index % 2 ? "G/B" : "Cmaj9", 0), Core.createChord("Em7", 1)],
        "instrumental",
        `stable-bar-${index + 1}`
    ));
    const song = Core.createSong({
        title: "Synthetic bars",
        sections: [Core.createSection("Solo", "instrumental", lines, "stable-section")]
    });
    const deleted = Core.deleteLine(song, 0, 4);
    assert.equal(deleted.line.id, "stable-bar-5");
    assert.deepEqual(
        deleted.song.sections[0].lines.map(line => line.id),
        lines.filter((_, index) => index !== 4).map(line => line.id)
    );
    assert.deepEqual(deleted.song.sections[0].lines[4].chords.map(chord => chord.symbol), ["G/B", "Em7"]);
    assert.match(workspaceJs, /const barNumber = lineIndex \+ 1/);
    assert.match(workspaceJs, /host\.dataset\.barNumber = String\(barNumber\)/);
    assert.match(workspaceJs, /bar: barNumber/);
});

test("Cmaj9 is a localized input example and remains valid across chord systems", () => {
    assert.match(workspaceHtml, /id="anchorChordInput"[^>]*Cmaj9[^>]*data-i18n-placeholder="pages\.songWorkspace\.chordInputPlaceholder"/);
    assert.match(en.pages.songWorkspace.chordInputPlaceholder, /Cmaj9/);
    assert.match(zh.pages.songWorkspace.chordInputPlaceholder, /Cmaj9/);
    assert.ok(Core.parseChordSymbol("Cmaj9"));
    assert.equal(Core.transposeChord("Cmaj9", 2, "D"), "Dmaj9");
    assert.equal(Core.chordNumber("Cmaj9", "C", "roman"), "Imaj9");
    assert.equal(Core.chordNumber("Cmaj9", "C", "nashville"), "1maj9");
    assert.ok(Shapes.generateVoicings("Cmaj9").length > 0);
});

test("one localized hero badge owns neutral, saving, saved, and unavailable states", () => {
    const saveStateElements = workspaceHtml.match(/id="autosaveState"/g) || [];
    assert.equal(saveStateElements.length, 1);
    const heroEnd = workspaceHtml.indexOf("</header>");
    assert.ok(workspaceHtml.indexOf('id="autosaveState"') < heroEnd);
    const editorTopbar = workspaceHtml.slice(
        workspaceHtml.indexOf('<div class="workspace-editor-topbar">'),
        workspaceHtml.indexOf('<section class="workspace-song-meta"')
    );
    assert.doesNotMatch(editorTopbar, /autosaveState|workspace-save-state/);
    assert.match(workspaceHtml, /id="autosaveState"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*data-state="neutral"/);
    ["neutral", "saving", "saved", "unavailable"].forEach(stateName => {
        assert.match(workspaceJs, new RegExp(`${stateName}:`));
    });
    assert.match(workspaceJs, /function setSaveState\(nextState\)/);
    assert.match(workspaceJs, /setSaveState\("saving"\)/);
    assert.match(workspaceJs, /setSaveState\("saved"\)/);
    assert.match(workspaceJs, /setSaveState\(state\.saveState\)/);
});

test("shared localized footer access points to a bookmarkable legal page", () => {
    assert.match(i18nJs, /className = "footer-legal-link"/);
    assert.match(i18nJs, /legalLink\.href = "legal\.html"/);
    assert.match(i18nJs, /legalLink\.dataset\.i18n = "footer\.legal"/);
    assert.match(componentsCss, /\.footer-legal-link/);
    assert.match(i18nInit, /"legal\.html": "titles\.legal"/);
    assert.equal(en.footer.legal, "Legal & Usage Policy");
    assert.equal(zh.footer.legal, "法律與使用規範");
    assert.match(buildScript, /"legal\.html"/);
    assert.match(i18nJs, /const hasPreloadedResources = Boolean/);
    assert.doesNotMatch(i18nJs, /language === DEFAULT_LANGUAGE \|\| resources\.selected \|\| resources\.fallback/);
});

test("legal page covers terms, local storage, copyright, exports, privacy, and bounded limitations", () => {
    ["terms", "song-workspace", "copyright", "exports", "privacy", "limitations"].forEach(anchor => {
        assert.match(legalView, new RegExp(`id="${anchor}"`));
    });
    assert.match(legalView, /href="privacy-policy\.html"/);
    assert.match(legalHtml, /data-i18n-title="titles\.legal"/);
    assert.doesNotMatch(legalView, /class="skip-link"/);
    [en.legal, zh.legal].forEach(locale => {
        [
            "termsTitle", "workspaceTitle", "storageCopy", "copyrightTitle", "lawCopy",
            "exportTitle", "privacyTitle", "disclaimerTitle", "disclaimerCopy"
        ].forEach(key => assert.equal(typeof locale[key], "string", key));
    });
    assert.match(en.legal.lawCopy, /does not automatically make a use lawful/i);
    assert.match(zh.legal.lawCopy, /並不會.*當然合法/);
    assert.doesNotMatch(en.legal.disclaimerCopy, /all liability|always legal|zero responsibility/i);
    assert.doesNotMatch(zh.legal.disclaimerCopy, /一切責任|一定合法|完全不負責/);
});
