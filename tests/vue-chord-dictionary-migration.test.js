const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const fixture = JSON.parse(read("tests/fixtures/chord-dictionary-legacy.json"));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const hashVoicings = values => sha256(values.map(value => value.frets.join(",")).join("|"));

async function domain() {
  return import(path.join(root, "src/music/chordDictionary.mjs"));
}

test("freezes the complete 12-root by 33-chord legacy catalog", async () => {
  const { CHORD_CATEGORIES, CHORDS, ROOTS } = await domain();

  assert.equal(fixture.baselineSha, "b2752f9320b149ab4349826b2403c19080e11d25");
  assert.equal(ROOTS.length, fixture.rootCount);
  assert.equal(CHORDS.length, fixture.chordTypeCount);
  assert.equal(ROOTS.length * CHORDS.length, fixture.validChordCombinationCount);
  assert.deepEqual(CHORD_CATEGORIES.map(category => category.chords.length), fixture.visibleContract.categoryCounts);
  assert.deepEqual(JSON.parse(JSON.stringify(CHORD_CATEGORIES)), fixture.categories);
});

test("preserves every chord tone, symbol, pitch class, and enharmonic spelling", async () => {
  const { CHORDS, chordNoteNames, chordPitchClasses, chordSymbolText } = await domain();

  fixture.toneCorpus.forEach(expected => {
    const chord = CHORDS.find(item => item.id === expected.chordId);
    assert.ok(chord, expected.chordId);
    assert.equal(chordSymbolText(expected.rootPitch, chord), expected.symbol);
    assert.deepEqual(chordPitchClasses(expected.rootPitch, chord), expected.pitchClasses);
    assert.deepEqual(chordNoteNames(expected.rootPitch, chord), expected.displayNotes);
    assert.equal(expected.bassSemantics, "root identity required; displayed chord has no slash bass");
  });
  assert.deepEqual(fixture.toneCorpus.find(item => item.root === "C#" && item.chordId === "major7").displayNotes, ["C#", "E#", "G#", "B#"]);
  assert.deepEqual(fixture.toneCorpus.find(item => item.root === "Eb" && item.chordId === "minor7").displayNotes, ["Eb", "Gb", "Bb", "Db"]);
});

test("preserves the exact bounded chord-symbol parser grammar", async () => {
  const { parseChordSymbolInput } = await domain();

  fixture.parserCases.forEach(({ input, expected }) => {
    const actual = parseChordSymbolInput(input);
    assert.deepEqual(actual ? { pitch: actual.pitch, chordId: actual.chord.id } : null, expected, input);
  });
});

test("preserves complete voicing counts, duplicate elimination, and ranking order", async () => {
  const { CHORDS, generateVoicings } = await domain();

  fixture.voicingCorpus.forEach(expected => {
    const chord = CHORDS.find(item => item.id === expected.chordId);
    const voicings = generateVoicings(expected.root === "C" ? 0 : fixture.roots.find(item => item.label === expected.root).pitch, chord);
    assert.equal(voicings.length, expected.count, `${expected.root} ${expected.chordId}`);
    assert.equal(hashVoicings(voicings), expected.orderHash, `${expected.root} ${expected.chordId}`);
    assert.deepEqual(voicings[0]?.frets || null, expected.first, `${expected.root} ${expected.chordId} first`);
    assert.deepEqual(voicings.at(-1)?.frets || null, expected.last, `${expected.root} ${expected.chordId} last`);
    assert.equal(new Set(voicings.map(item => item.frets.join(","))).size, voicings.length, `${expected.root} ${expected.chordId} duplicates`);
  });
});

test("preserves the complete position, root-string, and string-set filter matrix", async () => {
  const { CHORDS, filterVoicings, generateVoicings } = await domain();

  fixture.filterCases.forEach(expected => {
    const chord = CHORDS.find(item => item.id === expected.chordId);
    const values = filterVoicings({
      rootPitch: expected.rootPitch,
      chord,
      voicings: generateVoicings(expected.rootPitch, chord),
      position: expected.position,
      rootString: expected.rootString,
      triadSet: expected.triadSet
    });
    assert.equal(values.length, expected.count, JSON.stringify(expected));
    assert.equal(hashVoicings(values), expected.orderHash, JSON.stringify(expected));
  });
});

test("keeps semantic chord data separate from deterministic Vue diagram render data", async () => {
  const { CHORDS, buildDiagramModel, generateVoicings } = await domain();

  fixture.renderFixtures.forEach(expected => {
    const chord = CHORDS.find(item => item.id === expected.chordId);
    const voicing = generateVoicings(expected.rootPitch, chord)[0];
    assert.deepEqual(voicing.frets, expected.frets);
    assert.deepEqual(buildDiagramModel(expected.rootPitch, chord, voicing, 0), expected.model);
  });
  const cMajor = fixture.renderFixtures.find(item => item.rootPitch === 0 && item.chordId === "major").model;
  assert.equal(cMajor.baseFret, 1);
  assert.equal(cMajor.strings.length, 6);
  assert.equal(cMajor.strings.filter(string => string.fret < 0).length, 1);
  assert.equal(cMajor.strings.filter(string => string.fret === 0).length, 2);
  assert.deepEqual(cMajor.strings.filter(string => string.tone?.isRoot).map(string => string.name), ["A", "B"]);
});

test("preserves default, root, chord, filter, pagination, search, and rapid state transitions", async () => {
  const { useChordDictionary } = await import(path.join(root, "src/composables/useChordDictionary.js"));
  const state = useChordDictionary({ search: "" });

  assert.deepEqual([state.rootPitch.value, state.chordId.value, state.position.value, state.rootString.value, state.triadSet.value, state.page.value], [0, "major", "all", "all", "all", 0]);
  assert.equal(state.filteredVoicings.value.length, fixture.visibleContract.defaultShapeCount);
  assert.deepEqual(state.visibleVoicings.value[0].frets, fixture.visibleContract.defaultFirstShape);
  assert.equal(state.pageCount.value, fixture.visibleContract.defaultPageCount);
  state.nextPage();
  assert.equal(state.page.value, 1);
  state.setSearch("suspended");
  assert.equal(state.page.value, 1, "category-only search does not reset the shape page");
  assert.deepEqual(state.categories.value.flatMap(category => category.chords.map(chord => chord.id)), ["sus2", "sus4", "sevenSus4"]);
  state.setSearch("F#13b9");
  assert.deepEqual([state.rootPitch.value, state.chordId.value, state.page.value], [6, "thirteenFlat9", 0]);
  state.setPosition("3");
  state.setRootString("5");
  state.setTriadSet("top-four");
  assert.equal(state.rootString.value, "all", "unsupported root string resets exactly as legacy");
  state.selectRoot(3);
  state.selectChord("minor7");
  assert.deepEqual([state.rootPitch.value, state.chordId.value, state.position.value, state.triadSet.value, state.page.value], [3, "minor7", "3", "top-four", 0]);
  assert.equal(state.filteredVoicings.value.length, 1);
  assert.deepEqual(state.filteredVoicings.value[0].frets, [-1, -1, 4, 6, 4, 6]);
});

test("preserves root/chord query initialization and introduces no URL mutation", async () => {
  const { initialChordDictionaryState } = await domain();

  fixture.queryCases.forEach(({ search, expected }) => {
    assert.deepEqual(initialChordDictionaryState(search), expected, search);
  });
  const composable = read("src/composables/useChordDictionary.js");
  assert.doesNotMatch(composable, /history\.|pushState|replaceState|vue-router|location\.assign/);
});

test("preserves chord playback pitches, timing, overlap guard, and cleanup", async () => {
  const { createChordDictionaryAudioPlayer } = await import(path.join(root, "src/services/chordDictionaryAudio.mjs"));
  const events = [];
  const timers = [];
  const oscillators = [];
  const context = {
    currentTime: 2,
    destination: {},
    state: "suspended",
    async resume() { events.push(["resume"]); this.state = "running"; },
    createOscillator() {
      const oscillator = {
        connect() {},
        frequency: { setValueAtTime(value, time) { events.push(["frequency", value, time]); } },
        start(time) { events.push(["start", time]); },
        stop(time) { events.push(["stop", time]); },
        type: "",
        onended: null
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() {
      return {
        connect() {},
        gain: {
          setValueAtTime(value, time) { events.push(["gain", value, time]); },
          exponentialRampToValueAtTime(value, time) { events.push(["ramp", value, time]); }
        }
      };
    }
  };
  const player = createChordDictionaryAudioPlayer({
    createContext: () => context,
    setTimeoutFn: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeoutFn: timer => events.push(["clear", timer])
  });
  const states = [];
  const frets = [-1, 3, 2, 0, 1, 0];
  const tuning = [40, 45, 50, 55, 59, 64];

  assert.equal(await player.play({ frets, tuningMidi: tuning, onStateChange: value => states.push(value) }), true);
  assert.equal(await player.play({ frets: [8, 10, 10, 9, 8, 8], tuningMidi: tuning }), false);
  assert.deepEqual(events.filter(event => event[0] === "start").map(event => event[1]), [2.075, 2.11, 2.145, 2.18, 2.215]);
  assert.equal(events.filter(event => event[0] === "frequency").length, 5);
  assert.equal(timers[0].delay, fixture.visibleContract.audioDurationMs);
  timers[0].callback();
  assert.deepEqual(states, [true, false]);
  await player.play({ frets, tuningMidi: tuning, onStateChange: value => states.push(value) });
  player.dispose(value => states.push(value));
  assert.equal(player.isPlaying, false);
  assert.ok(events.some(event => event[0] === "clear"));
  assert.ok(oscillators.length >= 10);
});

test("mounts Chord Dictionary as the eleventh Vue-owned Vite MPA page", () => {
  const html = read("chord-dictionary.html");
  const entry = read("src/entries/chord-dictionary.js");
  const config = read("vite.config.mjs");

  assert.match(config, /"chord-dictionary": resolve\(root, "chord-dictionary\.html"\)/);
  assert.match(config, /"\/chord-dictionary", "\/chord-dictionary\.html"/);
  assert.match(html, /<body data-i18n-title="titles\.chordDictionary" data-vue-page="chord-dictionary">/);
  assert.match(html, /<div id="vue-chord-dictionary-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/chord-dictionary\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="tracks-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|chord-dictionary)\.js/);
  assert.match(entry, /activePage: "chord-dictionary"/);
  assert.match(entry, /showBackToTop: true/);
});

test("preserves SEO, analytics, CSP, shared CSS, and animation assets", () => {
  const html = read("chord-dictionary.html");
  const headers = read("_headers");

  assert.match(html, /<title>Chord Dictionary \| Jam Tracks Hub<\/title>/);
  assert.match(html, /content="Search guitar chords by symbol, formula, notes, and playable voicings with shape filters\."/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/chord-dictionary\.html">/);
  assert.match(html, /property="og:url" content="https:\/\/jamtrackshub\.com\/chord-dictionary\.html"/);
  assert.match(html, /https:\/\/cloud\.umami\.is\/script\.js/);
  ["theme-init.js", "i18n-init.js", "styles/base.css", "styles/components.css", "styles/pages.css", "styles/themes.css", "styles/chord-dictionary.css", "gsap.min.js", "Flip.min.js", "ScrollTrigger.min.js", "site-animations.js"].forEach(asset => {
    assert.match(html, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), asset);
  });
  assert.match(headers, /script-src 'self' https:\/\/cloud\.umami\.is/);
  assert.match(headers, /connect-src 'self' https:\/\/cloud\.umami\.is https:\/\/gateway\.umami\.is/);
  assert.doesNotMatch([html, read("src/views/ChordDictionaryView.vue")].join("\n"), /data-umami-event|umami\.track/);
});

test("keeps Vue DOM ownership, accessibility, bilingual state, and existing geometry classes", () => {
  const view = read("src/views/ChordDictionaryView.vue");
  const diagram = read("src/components/chords/ChordDictionaryDiagram.vue");
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));

  assert.deepEqual(Object.keys(english.pages.chordDictionary).sort(), Object.keys(traditionalChinese.pages.chordDictionary).sort());
  assert.match(view, /useSiteLocale/);
  assert.match(view, /id="main-content"/);
  assert.match(view, /aria-labelledby="dictionaryBrowseTitle"/);
  assert.match(view, /aria-live="polite"/);
  assert.match(view, /:aria-pressed/);
  assert.match(diagram, /class="chord-diagram"/);
  assert.match(diagram, /class="diagram-neck"/);
  assert.match(diagram, /data-tone-family/);
  assert.match(read("styles/chord-dictionary.css"), /max-width: 200px/);
  assert.match(read("styles/chord-dictionary.css"), /height: 174px/);
  [view, diagram].forEach(source => assert.doesNotMatch(source, /v-html|innerHTML|data-i18n/));
});

test("removes only the zero-caller page-owned runtime and preserves every shared consumer", () => {
  const html = read("chord-dictionary.html");
  const packageJson = read("package.json");

  assert.equal(fs.existsSync(path.join(root, "scripts/chord-dictionary.js")), false);
  assert.doesNotMatch(html, /scripts\/chord-dictionary\.js/);
  assert.doesNotMatch(packageJson, /scripts\/chord-dictionary\.js/);
  Object.entries(fixture.sharedSourceHashes).filter(([file]) => !["scripts/progression-writer.js", "scripts/key-finder.js", "scripts/song-workspace.js"].includes(file)).forEach(([file, expected]) => {
    assert.equal(sha256(read(file)), expected, file);
  });
  assert.equal(fs.existsSync(path.join(root, "scripts/progression-writer.js")), false);
  assert.equal(fs.existsSync(path.join(root, "scripts/song-workspace.js")), false);
  assert.match(read("progression-writer.html"), /scripts\/chord-shapes\.js/);
  assert.match(read("song-workspace.html"), /scripts\/chord-shapes\.js/);
  assert.match(read("src/music/chordProgressions.mjs"), /chord-dictionary\.html\?root=/);
  assert.match(read("src/music/scaleExplorer.mjs"), /chord-dictionary\.html\?root=/);
  assert.match(read("src/music/keyFinder.mjs"), /chord-dictionary\.html\?root=/);
});

test("extends deterministic Cloudflare ownership without changing backend or version boundaries", () => {
  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  const packageJson = JSON.parse(read("package.json"));

  assert.match(verifier, /"chord-dictionary\.html"/);
  assert.match(verifier, /Chord Dictionary canonical metadata differs/);
  assert.match(verifier, /Chord Dictionary still loads a legacy page runtime/);
  assert.match(verifier, /compiled Vue Chord Dictionary mount marker is missing/);
  assert.equal(packageJson.version, "2.0.5");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core", "vitest", "@vue/test-utils"].forEach(name => {
    assert.equal(packageJson.dependencies?.[name], undefined);
    assert.equal(packageJson.devDependencies?.[name], undefined);
  });
});
