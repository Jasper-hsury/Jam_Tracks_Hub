const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Shapes = require("../scripts/chord-shapes.js");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const fixture = JSON.parse(read("tests/fixtures/progression-writer-legacy.json"));
const hashVoicings = voicings => sha256(voicings.map(item => item.frets.join(",")).join("|"));

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  let writes = 0;
  return {
    get writes() { return writes; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { writes += 1; values.set(key, String(value)); },
    value(key) { return values.get(key); }
  };
}

async function domain() {
  return import(path.join(root, "src/music/progressionWriter.mjs"));
}

async function composable(options = {}) {
  const { useProgressionWriter } = await import(path.join(root, "src/composables/useProgressionWriter.js"));
  return useProgressionWriter({ shapeEngine: Shapes, ...options });
}

test("freezes the complete 12-root by 34-chord Progression Writer catalog", () => {
  const cases = [];
  fixture.roots.forEach(rootName => Object.entries(Shapes.chordById).forEach(([id, chord]) => {
    const parsed = Shapes.parseChord(`${rootName}${chord.suffix}`);
    const voicings = Shapes.generateVoicings(parsed);
    assert.ok(parsed, `${rootName} ${id}`);
    assert.ok(voicings.length, `${rootName} ${id}`);
    cases.push({
      root: rootName,
      id,
      symbol: parsed.symbol,
      count: voicings.length,
      hash: hashVoicings(voicings),
      first: voicings[0]?.frets || null,
      last: voicings.at(-1)?.frets || null
    });
  }));
  assert.equal(Object.keys(Shapes.chordById).length, fixture.chordTypeCount);
  assert.equal(cases.length, fixture.validChordCombinationCount);
  assert.equal(sha256(JSON.stringify(Object.entries(Shapes.chordById))), fixture.catalogHash);
  assert.equal(sha256(JSON.stringify(cases)), fixture.voicingCorpusHash);
});

test("preserves chord grammar, aliases, invalid handling, slash bass, and enharmonic spelling", () => {
  fixture.parserCases.forEach(expected => {
    assert.equal(Shapes.parseChord(expected.input)?.symbol || null, expected.symbol, expected.input);
  });
  const slash = Shapes.parseChord("G/B");
  Shapes.generateVoicings(slash).forEach(voicing => {
    const stringIndex = voicing.frets.findIndex(fret => fret >= 0);
    assert.equal((Shapes.TUNING_MIDI[stringIndex] + voicing.frets[stringIndex]) % 12, slash.bassPitch);
  });
  assert.equal(Shapes.parseChord("F♯sus4").rootName, "F#");
  assert.equal(Shapes.parseChord("B♭maj9").rootName, "Bb");
});

test("preserves representative shape counts, order, first/last voicings, and duplicates", () => {
  fixture.shapeFixtures.forEach(expected => {
    const voicings = Shapes.generateVoicings(expected.symbol);
    assert.equal(voicings.length, expected.count, expected.symbol);
    assert.equal(hashVoicings(voicings), expected.hash, expected.symbol);
    assert.deepEqual(voicings[0].frets, expected.first, expected.symbol);
    assert.deepEqual(voicings.at(-1).frets, expected.last, expected.symbol);
    assert.equal(new Set(voicings.map(item => item.frets.join(","))).size, voicings.length, expected.symbol);
  });
});

test("preserves the shape-picker position/root filter composition", async () => {
  const { filterShapeVoicings } = await domain();
  const expected = fixture.pickerFixture;
  const parsed = Shapes.parseChord(expected.symbol);
  const voicings = Shapes.generateVoicings(parsed);
  const filtered = filterShapeVoicings(voicings, parsed, expected.position, expected.rootString, Shapes);
  assert.equal(filtered.length, expected.count);
  assert.equal(filtered[0].index, expected.firstIndex);
  assert.deepEqual(filtered[0].voicing.frets, expected.firstFrets);
});

test("preserves default state, append/delete semantics, stable identity, edit normalization, and key metadata", async () => {
  const storage = memoryStorage();
  const writer = await composable({ storage, createId: () => "record-1", now: () => "2026-09-04T00:00:00.000Z" });
  assert.deepEqual({
    mode: writer.mode.value,
    keyRoot: writer.keyRoot.value,
    keyQuality: writer.keyQuality.value,
    songName: writer.songName.value,
    bpm: writer.bpm.value,
    separateDownload: writer.separateDownload.value,
    fieldCounts: Object.fromEntries(Object.entries(writer.sections).map(([name, values]) => [name, values.length]))
  }, fixture.defaultState);
  const originalIds = writer.sections.single.map(item => item.uid);
  const addedId = writer.addChord("single");
  assert.equal(writer.sections.single.length, 5);
  assert.deepEqual(writer.sections.single.slice(0, 4).map(item => item.uid), originalIds);
  writer.updateChord("single", addedId, "cMAJ7");
  writer.normalizeChord("single", addedId);
  assert.equal(writer.sections.single.at(-1).symbol, "Cmaj7");
  writer.keyRoot.value = "Eb";
  writer.keyQuality.value = "minor";
  assert.equal(writer.sections.single.at(-1).symbol, "Cmaj7", "key selection must not transpose chords");
  writer.deleteChord("single");
  assert.equal(writer.sections.single.length, 4);
  writer.sections.single.splice(1);
  writer.sections.single[0].symbol = "G7";
  writer.deleteChord("single");
  assert.equal(writer.sections.single.length, 1);
  assert.equal(writer.sections.single[0].symbol, "");
  assert.equal(storage.writes, 0, "editing is not autosaved");
  assert.equal(typeof writer.reorderChord, "undefined");
});

test("preserves structure switching and inactive-section save behavior", async () => {
  const writer = await composable({ storage: memoryStorage(), createId: () => "one", now: () => "2026-09-04T00:00:00.000Z" });
  writer.updateChord("single", writer.sections.single[0].uid, "C");
  writer.setMode("sections");
  writer.updateChord("verse", writer.sections.verse[0].uid, "Am7");
  writer.updateChord("chorus", writer.sections.chorus[0].uid, "Fmaj7");
  assert.equal(writer.sections.single[0].symbol, "C");
  const sectionRecord = writer.buildRecord();
  assert.deepEqual(sectionRecord.sections.single, []);
  assert.deepEqual(sectionRecord.sections.verse, [{ symbol: "Am7", shapeIndex: 0 }]);
  writer.setMode("single");
  const singleRecord = writer.buildRecord();
  assert.deepEqual(singleRecord.sections.single, [{ symbol: "C", shapeIndex: 0 }]);
  assert.deepEqual(singleRecord.sections.verse, []);
});

test("loads legacy persisted schemas and restores chord order, key, and selected shapes", async () => {
  const { PROGRESSION_STORAGE_KEY } = await domain();
  const storage = memoryStorage({ [PROGRESSION_STORAGE_KEY]: JSON.stringify([fixture.legacySavedRecord]) });
  const writer = await composable({ storage, createId: () => "fallback", now: () => "2026-09-04T00:00:00.000Z" });
  assert.equal(writer.savedProgressions.value.length, 1);
  writer.applyProgressionRecord(writer.savedProgressions.value[0]);
  assert.equal(writer.mode.value, "single");
  assert.equal(writer.keyRoot.value, "Bb");
  assert.equal(writer.keyQuality.value, "minor");
  assert.equal(writer.bpm.value, "92");
  assert.deepEqual(writer.sections.single.slice(0, 2).map(item => ({ symbol: item.symbol, shapeIndex: item.shapeIndex })), [
    { symbol: "C", shapeIndex: 0 },
    { symbol: "G7", shapeIndex: 3 }
  ]);
  assert.equal(storage.writes, 0, "loading legacy data must not rewrite it");
});

test("preserves save/update/duplicate limits without duplicate persistence writes", async () => {
  let id = 0;
  const storage = memoryStorage();
  const writer = await composable({
    storage,
    createId: () => `id-${++id}`,
    now: () => `2026-09-04T00:00:${String(id).padStart(2, "0")}.000Z`
  });
  writer.updateChord("single", writer.sections.single[0].uid, "C");
  writer.setShape("single", writer.sections.single[0].uid, 7);
  const saved = writer.saveProgression();
  assert.equal(storage.writes, 1);
  assert.deepEqual(saved.sections.single[0], { symbol: "C", shapeIndex: 7 });
  writer.songName.value = "Updated";
  writer.saveProgression();
  assert.equal(storage.writes, 2);
  assert.equal(writer.savedProgressions.value.length, 1);
  writer.duplicateProgression();
  assert.equal(storage.writes, 3);
  assert.equal(writer.savedProgressions.value.length, 2);
  assert.equal(writer.savedProgressions.value[0].songName, "Updated Copy");
  assert.equal(writer.sections.single[0].shapeIndex, 7);
  const writesBeforeClear = storage.writes;
  writer.clearCurrentProgression();
  assert.equal(storage.writes, writesBeforeClear, "Clear All clears only the current editor");
  assert.equal(writer.savedProgressions.value.length, 2);
  assert.equal(writer.keyRoot.value, "A", "clear preserves key exactly as legacy");
});

test("bounds saved records at 12 and recovers from corrupt storage without crashing", async () => {
  const { PROGRESSION_STORAGE_KEY } = await domain();
  const corrupt = memoryStorage({ [PROGRESSION_STORAGE_KEY]: "{not-json" });
  const writer = await composable({ storage: corrupt });
  assert.deepEqual(writer.savedProgressions.value, []);
  const records = Array.from({ length: 14 }, (_, index) => ({
    id: `saved-${index}`, mode: "single", key: "A Major", chords: ["C"]
  }));
  const storage = memoryStorage({ [PROGRESSION_STORAGE_KEY]: JSON.stringify(records) });
  const bounded = await composable({ storage });
  assert.equal(bounded.savedProgressions.value.length, 14, "legacy read preserves the existing list until the next write");
  bounded.duplicateProgression(bounded.savedProgressions.value[0]);
  assert.equal(bounded.savedProgressions.value.length, 12);
});

test("preserves JSON export schema, semantic order, MIME, filename, and cleanup", async () => {
  const { exportProgressionJson } = await import(path.join(root, "src/services/progressionWriterExport.mjs"));
  const clicks = [];
  const revoked = [];
  const links = [];
  const documentRef = {
    body: { appendChild(link) { links.push(link); } },
    createElement() {
      return { click() { clicks.push(this.download); }, remove() { this.removed = true; } };
    }
  };
  const urlApi = {
    createObjectURL() { return "blob:fixture"; },
    revokeObjectURL(value) { revoked.push(value); }
  };
  const record = {
    id: "fixture", mode: "single", createdAt: "a", updatedAt: "b", songName: "My Song",
    keyRoot: "Bb", keyQuality: "minor", key: "Bb Minor", bpm: "92", separateDownload: true,
    sections: { single: [{ symbol: "C", shapeIndex: 2 }], verse: [], chorus: [] }
  };
  const result = exportProgressionJson(record, { documentRef, urlApi, setTimeoutFn: callback => callback() });
  assert.equal(result.filename, "my-song-progression.json");
  assert.equal(result.blob.type, "application/json;charset=utf-8");
  assert.deepEqual(JSON.parse(await result.blob.text()), record);
  assert.deepEqual(clicks, [result.filename]);
  assert.deepEqual(revoked, ["blob:fixture"]);
  assert.equal(links[0].removed, true);
});

test("preserves current-state SVG/PNG export models, geometry, themes, and injection safety", async () => {
  const { collectDownloadProgression } = await domain();
  const { generateProgressionSvg, progressionExportFilename } = await import(path.join(root, "src/services/progressionWriterExport.mjs"));
  const state = {
    mode: "sections", songName: "<Unsafe & Song>", keyRoot: "Eb", keyQuality: "minor", bpm: "120",
    sections: {
      single: [],
      verse: [{ symbol: "Cmaj7", shapeIndex: 10 }, { symbol: "G/B", shapeIndex: 0 }],
      chorus: [{ symbol: "Am7", shapeIndex: 0 }, { symbol: "Cmaj7", shapeIndex: 10 }]
    }
  };
  const data = collectDownloadProgression(state, Shapes);
  assert.equal(data.error, undefined);
  assert.deepEqual(data.sections.map(section => section.chords.map(item => item.parsed.symbol)), [["Cmaj7", "G/B"], ["Am7", "Cmaj7"]]);
  assert.deepEqual(data.sections[0].chords[0].voicing.frets, fixture.pickerFixture.firstFrets);
  const full = generateProgressionSvg(data, { shapeEngine: Shapes, theme: "default", separateDownload: false });
  const separated = generateProgressionSvg(data, { shapeEngine: Shapes, theme: "light", separateDownload: true });
  assert.match(full, /width="1200"/);
  assert.match(full, /viewBox="0 0 1200 \d+"/);
  assert.match(full, /fill="#101010"/);
  assert.match(separated, /width="1400"/);
  assert.match(separated, /fill="#f7f4ef"/);
  assert.match(separated, /Chord Progression/);
  assert.match(separated, /Chord Shapes/);
  assert.match(separated, /Cmaj7/);
  assert.match(separated, /G\/B/);
  assert.match(separated, /&lt;Unsafe &amp; Song&gt;/);
  assert.doesNotMatch(separated, /<Unsafe|<script/i);
  assert.equal(progressionExportFilename(data), "unsafe-song-eb-minor-120bpm-progression");
});

test("renders PNG at the canonical 2x dimensions and revokes the temporary SVG URL", async () => {
  const { svgToPngBlob } = await import(path.join(root, "src/services/progressionWriterExport.mjs"));
  const revoked = [];
  let canvas;
  class ImageMock {
    set src(value) { this.value = value; this.onload(); }
  }
  const documentRef = {
    createElement(name) {
      assert.equal(name, "canvas");
      canvas = {
        width: 0,
        height: 0,
        getContext() {
          return {
            setTransform(...args) { assert.deepEqual(args, [2, 0, 0, 2, 0, 0]); },
            drawImage(image, x, y, width, height) { assert.deepEqual([x, y, width, height], [0, 0, 1200, 560]); }
          };
        },
        toBlob(callback, type) { callback(new Blob(["png"], { type })); }
      };
      return canvas;
    }
  };
  const blob = await svgToPngBlob('<svg width="1200" height="560"></svg>', {
    documentRef,
    ImageCtor: ImageMock,
    urlApi: { createObjectURL: () => "blob:svg", revokeObjectURL: value => revoked.push(value) }
  });
  assert.deepEqual([canvas.width, canvas.height], [2400, 1120]);
  assert.equal(blob.type, "image/png");
  assert.deepEqual(revoked, ["blob:svg"]);
});

test("mounts Progression Writer as the twelfth Vue-owned Vite MPA page and removes only its page runtime", () => {
  const html = read("progression-writer.html");
  const entry = read("src/entries/progression-writer.js");
  const config = read("vite.config.mjs");
  assert.match(config, /"progression-writer": resolve\(root, "progression-writer\.html"\)/);
  assert.match(config, /"\/progression-writer", "\/progression-writer\.html"/);
  assert.match(html, /data-vue-page="progression-writer"/);
  assert.match(html, /<div id="vue-progression-writer-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/progression-writer\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="tracks-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|progression-writer)\.js/);
  assert.match(html, /scripts\/chord-shapes\.js/);
  assert.match(entry, /activePage: "chord-progressions"/);
  assert.equal(fs.existsSync(path.join(root, "scripts/progression-writer.js")), false);
  assert.equal((config.match(/resolve\(root, "[^\"]+\.html"\)/g) || []).length, 13);
});

test("uses native Vue DOM ownership while preserving shell, i18n, theme, responsive, and accessibility contracts", () => {
  const sources = [
    "src/views/ProgressionWriterView.vue",
    "src/components/progression-writer/ProgressionChordDiagram.vue",
    "src/components/progression-writer/ProgressionChordField.vue",
    "src/components/progression-writer/ProgressionChordSection.vue",
    "src/components/progression-writer/ProgressionShapeCard.vue",
    "src/components/progression-writer/ProgressionShapePicker.vue"
  ].map(read).join("\n");
  assert.match(sources, /id="main-content"/);
  assert.match(sources, /role="dialog"/);
  assert.match(sources, /aria-modal="true"/);
  assert.match(sources, /aria-live="polite"/);
  assert.match(sources, /aria-pressed/);
  assert.match(sources, /@keydown\.enter/);
  assert.match(sources, /@keydown\.space/);
  assert.match(read("src/views/ProgressionWriterView.vue"), /useSiteLocale/);
  assert.doesNotMatch(sources, /v-html|innerHTML|data-i18n/);
  assert.deepEqual(
    Object.keys(JSON.parse(read("locales/en/common.json")).pages.progressionWriter).sort(),
    Object.keys(JSON.parse(read("locales/zh-TW/common.json")).pages.progressionWriter).sort()
  );
  const pagesCss = read("styles/pages.css");
  ["max-width: 900px", "max-width: 768px", "max-width: 430px"].forEach(marker => assert.match(pagesCss, new RegExp(marker)));
});

test("preserves SEO, page-level Umami, CSP, URL privacy, and no custom progression telemetry", () => {
  const html = read("progression-writer.html");
  const source = [html, read("src/views/ProgressionWriterView.vue"), read("src/composables/useProgressionWriter.js")].join("\n");
  assert.match(html, /<title>Write Your Own Progression \| Jam Tracks Hub<\/title>/);
  assert.match(html, /content="Write custom chord progressions, choose guitar voicings, save drafts, and export clean printable chord diagrams\."/);
  assert.match(html, /href="https:\/\/jamtrackshub\.com\/progression-writer\.html"/);
  assert.match(html, /https:\/\/cloud\.umami\.is\/script\.js/);
  assert.doesNotMatch(source, /data-umami-event|umami\.track|fetch\(|XMLHttpRequest|navigator\.sendBeacon|history\.|pushState|replaceState|vue-router/);
  const headers = read("_headers");
  assert.match(headers, /script-src 'self' https:\/\/cloud\.umami\.is/);
  assert.match(headers, /connect-src 'self' https:\/\/cloud\.umami\.is https:\/\/gateway\.umami\.is/);
  assert.doesNotMatch(headers, /unsafe-eval|script-src[^\n]*\*/);
});

test("keeps every shared music/backend consumer byte-identical", () => {
  const expectedHashes = {
    "scripts/chord-shapes.js": "00189b548b9d6fe48daab6c3ea68fd2a2a2baf9e39d16d638df1b0e8d19c1c04",
    "styles/chord-dictionary.css": "4fbcdc99c18949c5961ea933224b9aabbae1a06c655960885549e657faa63f53",
    "styles/pages.css": "621ccb2d5ad1e086c25c373432172021daaefecfa6faf7c0c147fe17fbf9a867",
    "styles/themes.css": "517cfd99f45e39deb3ba57e6c2de67ccb12b14c4750af8c7a6b75a581e1af4a7",
    "song-workspace.html": "7c452f104a6302c14316ae0c8cf0ea48784ba8ac5ec8ff12771115fc68afb77f",
    "scripts/song-workspace.js": "cbb2bc6924cd9a038a8efa7cfd20f4b660654041f3916150d79ce624ae49a388",
    "scripts/song-workspace-core.js": "d792e65873c140deda2ac576370bcd940d14e1f35d9fb5da88bbd11431b28ecb",
    "scripts/song-workspace-storage.js": "b11c00dcb5cafb3ca414ccc9fec59bd6931dc39fe3658ecec33003f4d7d210ae",
    "scripts/song-workspace-import.js": "7c04c4890176ac235d93f29ed9ca2440466978b7973fbb4e07e5c3ee9d311b56",
    "src/views/ChordDictionaryView.vue": "142790fdb81cc1a1b13c027d7e7b681dd77f35ef22ee0d3696c3cffe775414e1",
    "src/views/ChordProgressionsView.vue": "80f12c439cd04d88000b26527787e02c9ecf606884b3bcc3a1c4a9ef191b70a0",
    "src/views/ScaleExplorerView.vue": "e8dc3cf9beff6e408a8b0453d342a28bf53db975c610d1b4a6f8bf470826b1cf",
    "src/views/FretboardTrainerView.vue": "4ac89644ed35a42e63a96d62476454efeaec24fb7081e1ba0c48dd0e95cb3ff6",
    "worker.js": "38bb981a849874c0c4421c00c73aef2bf0e2fbfa857f3a85dc63f145af7f970c",
    "wrangler.jsonc": "fcd1a460b0bee67ad6f0b33076234c682c22580d48ee3f4ffbe339d2a88145db"
  };
  Object.entries(expectedHashes).forEach(([file, expected]) => assert.equal(sha256(read(file)), expected, file));
  assert.match(read("song-workspace.html"), /scripts\/chord-shapes\.js/);
  assert.match(read("scripts/song-workspace.js"), /Shapes\.renderProgressionDiagram/);
});

test("updates deterministic Cloudflare ownership without changing version or backend boundaries", () => {
  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  const packageJson = JSON.parse(read("package.json"));
  assert.match(verifier, /"progression-writer\.html"/);
  assert.match(verifier, /Progression Writer canonical metadata differs/);
  assert.match(verifier, /Progression Writer still loads a legacy page runtime/);
  assert.match(verifier, /compiled Vue Progression Writer mount marker is missing/);
  assert.equal(packageJson.version, "2.0.4");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core", "vitest", "@vue/test-utils"].forEach(name => {
    assert.equal(packageJson.dependencies?.[name], undefined);
    assert.equal(packageJson.devDependencies?.[name], undefined);
  });
  ["worker.js", "wrangler.jsonc", "functions/api/feedback.js", "functions/api/subscribe.js", "key-finder.html", "song-workspace.html"].forEach(file => assert.ok(fs.existsSync(path.join(root, file)), file));
});
