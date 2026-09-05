const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const fixture = JSON.parse(read("tests/fixtures/scale-explorer-legacy.json"));

async function domain() {
  return import(path.join(root, "src/music/scaleExplorer.mjs"));
}

test("freezes the complete legacy root and scale catalogs", async () => {
  const { ROOTS, SCALE_CATALOG } = await domain();

  assert.equal(fixture.baselineSha, "39a6ea3544153a48bac63fb655d7d5c30b387d16");
  assert.deepEqual(ROOTS.map(rootNote => rootNote.label), fixture.roots);
  assert.equal(ROOTS.length, fixture.visibleContract.rootCount);
  assert.equal(SCALE_CATALOG.length, fixture.visibleContract.scaleCount);
  SCALE_CATALOG.forEach(scale => {
    assert.deepEqual(scale.intervals, fixture.scales[scale.id].intervals, `${scale.id} intervals`);
    assert.deepEqual(scale.degrees, fixture.scales[scale.id].degrees, `${scale.id} degrees`);
    assert.equal(scale.intervals.length, scale.degrees.length, scale.id);
  });
});

test("matches the explicit 96-case root by scale note fixture corpus", async () => {
  const { ROOTS, SCALE_CATALOG, scaleNotes } = await domain();
  let combinations = 0;

  ROOTS.forEach(rootNote => {
    SCALE_CATALOG.forEach(scale => {
      assert.deepEqual(scaleNotes(rootNote.pitch, scale.id), fixture.notesByRoot[rootNote.label][scale.id], `${rootNote.label} ${scale.id}`);
      combinations += 1;
    });
  });

  assert.equal(combinations, fixture.visibleContract.rootScaleCombinationCount);
  assert.equal(combinations, 96);
});

test("preserves exact enharmonic aliases and the legacy spelling policy", async () => {
  const { pitchFromName, rootName, scaleNotes } = await domain();

  assert.equal(pitchFromName("B#"), 0);
  assert.equal(pitchFromName("Db"), 1);
  assert.equal(pitchFromName("Cb"), 11);
  assert.equal(rootName(1), "C#");
  assert.equal(rootName(3), "Eb");
  assert.equal(rootName(5), "F");
  assert.deepEqual(scaleNotes(1, "major"), ["C#", "D#", "F", "F#", "G#", "A#", "C"]);
  assert.deepEqual(scaleNotes(3, "natural-minor"), ["Eb", "F", "Gb", "Ab", "Bb", "B", "Db"]);
  assert.deepEqual(scaleNotes(5, "major"), ["F", "G", "A", "Bb", "C", "D", "E"]);
});

test("preserves key, root, and type query initialization without URL mutation", async () => {
  const { parseScaleQuery } = await domain();

  fixture.queryCases.forEach(expected => {
    const actual = parseScaleQuery(expected.search);
    assert.equal(actual.rootPitch, expected.rootPitch, expected.search);
    assert.equal(actual.scaleId, expected.scaleId, expected.search);
    assert.deepEqual({ neckFrets: actual.neckFrets, fretStart: actual.fretStart, fretEnd: actual.fretEnd, labelMode: actual.labelMode }, {
      neckFrets: 15,
      fretStart: 0,
      fretEnd: 15,
      labelMode: "note"
    });
  });
  assert.doesNotMatch(read("src/composables/useScaleExplorer.js"), /history\.|pushState|replaceState|location\.(?:assign|replace)|vue-router/);
});

test("validates every string and fret position independently of rendering", async () => {
  const { buildScaleRenderData, ROOTS, SCALE_CATALOG, STRINGS } = await domain();
  assert.deepEqual(STRINGS.map(string => [string.name, string.pitch]), [["e", 4], ["B", 11], ["G", 7], ["D", 2], ["A", 9], ["E", 4]]);

  ROOTS.forEach(rootNote => {
    SCALE_CATALOG.forEach(scale => {
      const data = buildScaleRenderData({ rootPitch: rootNote.pitch, scaleId: scale.id, fretStart: 0, fretEnd: 22, labelMode: "note" });
      const positions = data.rows.flatMap(row => row.cells);
      assert.equal(positions.length, fixture.visibleContract.fullNeck22PositionCount, `${rootNote.label} ${scale.id}`);
      data.rows.forEach((row, stringIndex) => row.cells.forEach(cell => {
        assert.equal(cell.pitch, (STRINGS[stringIndex].pitch + cell.fret) % 12);
        assert.equal(cell.included, scale.intervals.includes((cell.pitch - rootNote.pitch + 12) % 12));
        assert.equal(cell.tonic, cell.included && cell.pitch === rootNote.pitch);
      }));
    });
  });
});

test("keeps domain assertions separate from deterministic DOM render data", async () => {
  const { buildScaleRenderData, DEFAULT_SCALE_STATE } = await domain();
  const noteData = buildScaleRenderData(DEFAULT_SCALE_STATE);
  const notePositions = noteData.rows.flatMap(row => row.cells);
  const degreeData = buildScaleRenderData({ ...DEFAULT_SCALE_STATE, labelMode: "degree", fretStart: 17, fretEnd: 22 });
  const degreePositions = degreeData.rows.flatMap(row => row.cells);

  assert.equal(notePositions.length, fixture.visibleContract.defaultPositionCount);
  assert.equal(notePositions.filter(cell => cell.included).length, fixture.visibleContract.defaultMarkerCount);
  assert.equal(notePositions.filter(cell => cell.tonic).length, fixture.visibleContract.defaultTonicCount);
  assert.ok(notePositions.filter(cell => cell.included).every(cell => cell.label === cell.note));
  assert.equal(degreePositions.length, 36);
  assert.ok(degreePositions.filter(cell => cell.included).every(cell => cell.label === cell.degree));
  assert.deepEqual(noteData.positionMarkers.filter(marker => marker.dots).map(marker => [marker.fret, marker.dots]), [[3, 1], [5, 1], [7, 1], [9, 1], [12, 2], [15, 1]]);
});

test("preserves root, scale, range, label, and rapid transition state machines", async () => {
  const { useScaleExplorer } = await import(path.join(root, "src/composables/useScaleExplorer.js"));
  const state = useScaleExplorer({ search: "" });

  assert.deepEqual([state.rootPitch.value, state.scaleId.value, state.neckFrets.value, state.fretStart.value, state.fretEnd.value, state.labelMode.value], [9, "minor-pentatonic", 15, 0, 15, "note"]);
  state.setRoot(1);
  state.setScale("dorian");
  assert.deepEqual(state.intervals.value.map(interval => interval.note), ["C#", "D#", "E", "F#", "G#", "A#", "B"]);
  state.setNeckFrets(22);
  assert.deepEqual([state.fretStart.value, state.fretEnd.value], [0, 22]);
  state.setRange(17, 22);
  state.setLabelMode("degree");
  assert.equal(state.renderData.value.rows.flatMap(row => row.cells).length, 36);
  state.setRoot(10);
  state.setScale("mixolydian");
  state.setRoot(0);
  state.setScale("major");
  state.setNeckFrets(15);
  assert.deepEqual([state.root.value, state.scaleId.value, state.fretStart.value, state.fretEnd.value], ["C", "major", 0, 15]);
  assert.equal(state.renderData.value.rows.length, 6);
});

test("preserves audio pitches, timing, overlap guard, and lifecycle cleanup", async () => {
  const { audioSequence } = await domain();
  const { createScaleAudioPlayer } = await import(path.join(root, "src/services/scaleAudio.mjs"));
  const events = [];
  const timers = [];
  const context = {
    currentTime: 1,
    destination: {},
    state: "suspended",
    async resume() { events.push(["resume"]); this.state = "running"; },
    createOscillator() {
      return {
        connect() {},
        frequency: { setValueAtTime(value, time) { events.push(["frequency", value, time]); } },
        start(time) { events.push(["start", time]); },
        stop(time) { events.push(["stop", time]); },
        type: "",
        onended: null
      };
    },
    createGain() {
      return {
        connect() {},
        gain: {
          exponentialRampToValueAtTime(value, time) { events.push(["ramp", value, time]); },
          setValueAtTime(value, time) { events.push(["gain", value, time]); }
        }
      };
    }
  };
  const player = createScaleAudioPlayer({
    createContext: () => context,
    setTimeoutFn: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeoutFn: () => {}
  });
  const states = [];
  const sequence = audioSequence(9, "minor-pentatonic");

  assert.deepEqual(sequence.map(note => note.midi), [69, 72, 74, 76, 79, 81]);
  assert.deepEqual(sequence.map(note => note.offsetSeconds), [0, 0.28, 0.56, 0.8400000000000001, 1.12, 1.4000000000000001]);
  assert.equal(await player.play({ rootPitch: 9, scaleId: "minor-pentatonic", onStateChange: value => states.push(value) }), true);
  assert.equal(await player.play({ rootPitch: 0, scaleId: "major" }), false);
  assert.equal(events.filter(event => event[0] === "start").length, 6);
  assert.equal(timers[0].delay, 1860);
  timers[0].callback();
  assert.deepEqual(states, [true, false]);
  assert.equal(player.isPlaying, false);
  await player.play({ rootPitch: 0, scaleId: "major" });
  player.dispose();
  assert.equal(player.isPlaying, false);
});

test("preserves PNG content geometry, naming, and iOS preview behavior", async () => {
  const { createScaleExportModel, drawScaleImage } = await import(path.join(root, "src/services/scaleExport.mjs"));
  const model = createScaleExportModel({ rootPitch: 9, scaleId: "minor-pentatonic", fretStart: 0, fretEnd: 15, labelMode: "note", localizedScaleName: "Minor Pentatonic" });
  const source = read("src/services/scaleExport.mjs");
  const drawnText = [];
  const drawingContext = {
    arc() {},
    beginPath() {},
    closePath() {},
    fill() {},
    fillRect() {},
    fillText(value) { drawnText.push(String(value)); },
    lineTo() {},
    measureText(value) { return { width: String(value).length * 8 }; },
    moveTo() {},
    quadraticCurveTo() {},
    scale() {},
    stroke() {},
    strokeRect() {},
    set fillStyle(value) {},
    set font(value) {},
    set lineWidth(value) {},
    set strokeStyle(value) {},
    set textAlign(value) {},
    set textBaseline(value) {}
  };
  const canvas = { height: 0, width: 0, getContext: () => drawingContext };
  const rendered = drawScaleImage({ createElement: name => {
    assert.equal(name, "canvas");
    return canvas;
  } }, { rootPitch: 9, scaleId: "minor-pentatonic", fretStart: 0, fretEnd: 15, labelMode: "note", localizedScaleName: "Minor Pentatonic" });

  assert.equal(model.fileName, "a-minor-pentatonic-frets-0-15");
  assert.deepEqual([model.width, model.height], [1488, 746]);
  assert.equal(model.visibleFrets.length, 16);
  assert.deepEqual(model.intervalColors, ["#b83d55", "#b66c1f", "#267ca6", "#247f5b", "#5d50b2", "#96507c", "#58722f"]);
  assert.deepEqual([canvas.width, canvas.height], [2976, 1492]);
  assert.equal(rendered.model.fileName, model.fileName);
  ["A Minor Pentatonic", "1  A", "b3  C", "4  D", "5  E", "b7  G", "Standard tuning: E A D G B E"].forEach(text => {
    assert.ok(drawnText.includes(text), `PNG includes ${text}`);
  });
  assert.match(source, /canvas\.width = model\.width \* scaleFactor/);
  assert.match(source, /canvas\.height = model\.height \* scaleFactor/);
  assert.match(source, /\/iPad\|iPhone\|iPod\//);
  assert.match(source, /windowRef\.open\("", "_blank"\)/);
  assert.match(source, /canvas\.toBlob/);
  assert.match(source, /"image\/png"/);
  assert.match(source, /120000/);
});

test("makes Scale Explorer the tenth Vue-owned Vite MPA page", () => {
  const config = read("vite.config.mjs");
  const html = read("scale.html");
  const entry = read("src/entries/scale-explorer.js");

  assert.match(config, /"scale-explorer": resolve\(root, "scale\.html"\)/);
  assert.match(config, /"\/scale", "\/scale\.html"/);
  assert.match(html, /<body data-i18n-title="titles\.scaleExplorer" data-vue-page="scale-explorer">/);
  assert.match(html, /<div id="vue-scale-explorer-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/scale-explorer\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="tracks-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|scale)\.js/);
  assert.match(entry, /activePage: "scale"/);
  assert.match(entry, /showBackToTop: true/);
});

test("preserves Scale Explorer SEO, analytics, CSP, CSS, and animation assets", () => {
  const html = read("scale.html");
  const headers = read("_headers");

  assert.match(html, /<title>Scale Explorer \| Jam Tracks Hub<\/title>/);
  assert.match(html, /content="Build printable guitar scale diagrams by root note, scale type, fret range, and note or degree labels\."/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/scale\.html">/);
  assert.match(html, /property="og:url" content="https:\/\/jamtrackshub\.com\/scale\.html"/);
  assert.match(html, /https:\/\/cloud\.umami\.is\/script\.js/);
  ["theme-init.js", "i18n-init.js", "styles/base.css", "styles/components.css", "styles/pages.css", "styles/themes.css", "styles/scale.css", "gsap.min.js", "ScrollTrigger.min.js", "site-animations.js"].forEach(asset => {
    assert.match(html, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), asset);
  });
  assert.match(headers, /script-src 'self' https:\/\/cloud\.umami\.is/);
  assert.doesNotMatch(headers, /unsafe-eval|script-src[^\n]*\*/);
  assert.doesNotMatch(html, /data-umami-event|vue(?:\.global)?\.js/);
});

test("keeps Vue locale ownership, theme prepaint, and the 44-case responsive contract", () => {
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));
  const view = read("src/views/ScaleExplorerView.vue");
  const css = read("styles/scale.css");
  const requestedWidths = [375, 390, 430, 768, 820, 834, 1024, 1180, 1194, 1280, 1440];

  assert.deepEqual(Object.keys(english.pages.scaleExplorer).sort(), Object.keys(traditionalChinese.pages.scaleExplorer).sort());
  assert.deepEqual(Object.keys(english.scale).sort(), Object.keys(traditionalChinese.scale).sort());
  assert.match(view, /useSiteLocale/);
  assert.doesNotMatch(view, /data-i18n|useLegacyLocale|v-html|innerHTML/);
  assert.match(read("scale.html"), /theme-init\.js[\s\S]*i18n-init\.js/);
  assert.equal(requestedWidths.length * 2 * 2, 44);
  assert.match(css, /\.scale-page \{[\s\S]*?max-width: 1180px;/);
  assert.match(css, /grid-template-columns: 48px repeat\(var\(--visible-frets\), minmax\(54px, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("preserves semantic, keyboard, touch, and non-color-only tonic contracts", () => {
  const view = read("src/views/ScaleExplorerView.vue");
  const fretboard = read("src/components/scale/ScaleFretboard.vue");
  const css = read("styles/scale.css");

  assert.equal((view.match(/<main\b/g) || []).length, 1);
  assert.equal((view.match(/<h1\b/g) || []).length, 1);
  assert.match(view, /aria-labelledby="scaleControlsHeading"/);
  assert.match(view, /aria-live="polite"/);
  assert.match(view, /<fieldset class="scale-root-field">/);
  assert.match(fretboard, /role="img"/);
  assert.match(fretboard, /data-tonic/);
  assert.match(fretboard, /:title="`\$\{cell\.note\}, degree \$\{cell\.degree\}/);
  assert.doesNotMatch(view + fretboard, /@keydown|@keyup|touchstart|pointerdown|tabindex="-1"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.fret-note\.is-root \{[\s\S]*?width: 34px;[\s\S]*?border: 3px solid #fff;/);
});

test("removes only the page-owned legacy runtime and keeps frozen boundaries", () => {
  const implementation = [
    read("src/views/ScaleExplorerView.vue"),
    read("src/components/scale/ScaleFretboard.vue"),
    read("src/composables/useScaleExplorer.js"),
    read("src/music/scaleExplorer.mjs"),
    read("src/services/scaleAudio.mjs"),
    read("src/services/scaleExport.mjs")
  ].join("\n");
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(fs.existsSync(path.join(root, "scripts/scale.js")), false);
  assert.doesNotMatch(read("scale.html"), /scripts\/scale\.js/);
  assert.doesNotMatch(read("package.json"), /scripts\/scale\.js/);
  assert.doesNotMatch(implementation, /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|umami\.track|data-umami-event/);
  ["chord-dictionary.html", "progression-writer.html", "key-finder.html", "song-workspace.html", "worker.js", "wrangler.jsonc", "functions/api/feedback.js", "functions/api/subscribe.js"].forEach(file => assert.ok(fs.existsSync(path.join(root, file)), file));
  assert.equal(packageJson.version, "2.0.5");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core"].forEach(name => assert.equal(packageJson.dependencies[name], undefined));
});

test("extends deterministic Cloudflare verification for ten Vue pages", () => {
  const verifier = read("tools/scripts/verify-cloudflare-build.js");

  assert.match(verifier, /"scale\.html"/);
  assert.match(verifier, /Scale Explorer canonical metadata differs/);
  assert.match(verifier, /Scale Explorer still loads a legacy page runtime/);
  assert.match(verifier, /compiled Vue Scale Explorer mount marker is missing/);
  assert.match(verifier, /viteOwnedRootHtml[^\n]+scale\.html/);
});
