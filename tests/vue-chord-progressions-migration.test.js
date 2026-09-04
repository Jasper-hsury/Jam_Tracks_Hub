const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const fixture = JSON.parse(read("tests/fixtures/chord-progressions-legacy.json"));

async function domain() {
  return import(path.join(root, "src/music/chordProgressions.mjs"));
}

test("captures the complete legacy key corpus before domain migration", async () => {
  const { KEY_DEFINITIONS } = await domain();

  assert.equal(fixture.baselineSha, "3cd24dbd5f8d522b46ef6d427a74353005d73387");
  assert.equal(KEY_DEFINITIONS.length, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(KEY_DEFINITIONS)), fixture.keyDefinitions);
  assert.equal(KEY_DEFINITIONS.flatMap(definition => [definition.majorKey, definition.minorKey]).length, 24);
});

test("preserves canonical major and minor diatonic chord maps", async () => {
  const { buildDiatonicChords, findKeyDefinition, KEY_DEFINITIONS, parseChordForVoicing } = await domain();

  fixture.chordMaps.forEach(({ key, extension, expected }) => {
    const definition = findKeyDefinition(key);
    const mode = key.includes("minor") ? "minor" : "major";
    assert.ok(definition, key);
    assert.deepEqual(buildDiatonicChords(definition, mode, extension), expected, `${key} ${extension}`);
  });

  KEY_DEFINITIONS.forEach(definition => {
    ["major", "minor"].forEach(mode => {
      ["triads", "sevenths"].forEach(extension => {
        const map = buildDiatonicChords(definition, mode, extension);
        assert.equal(Object.keys(map).length, mode === "minor" ? 9 : 7, `${definition[`${mode}Key`]} ${extension}`);
        Object.values(map).forEach(chord => assert.ok(parseChordForVoicing(chord), chord));
      });
    });
  });
});

test("preserves the exact fixed progression catalog and category order", async () => {
  const { MAJOR_PROGRESSIONS, MINOR_PROGRESSIONS, progressionCategories } = await domain();

  assert.equal(MAJOR_PROGRESSIONS.length, fixture.visibleContract.majorProgressionCount);
  assert.equal(MINOR_PROGRESSIONS.length, fixture.visibleContract.minorProgressionCount);
  assert.deepEqual(JSON.parse(JSON.stringify(MAJOR_PROGRESSIONS)), fixture.majorProgressions);
  assert.deepEqual(JSON.parse(JSON.stringify(MINOR_PROGRESSIONS)), fixture.minorProgressions);
  assert.deepEqual(progressionCategories(MAJOR_PROGRESSIONS).map(group => group.progressions.length), fixture.visibleContract.majorCategoryCounts);
  assert.deepEqual(progressionCategories(MINOR_PROGRESSIONS).map(group => group.progressions.length), fixture.visibleContract.minorCategoryCounts);
  assert.deepEqual(MAJOR_PROGRESSIONS[0].numerals, ["I", "V", "vi", "IV"]);
  assert.deepEqual(MAJOR_PROGRESSIONS[4].numerals, ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"]);
  assert.deepEqual(MINOR_PROGRESSIONS[0].numerals, ["i", "VI", "III", "VII"]);
  assert.deepEqual(MINOR_PROGRESSIONS[4].numerals, ["i", "i", "i", "i", "iv", "iv", "i", "i", "V", "iv", "i", "V"]);
});

test("keeps the supported chord grammar bounded and dictionary URLs equivalent", async () => {
  const { chordDictionaryUrl, parseChordForDictionary, parseChordForVoicing } = await domain();

  Object.entries(fixture.dictionaryUrls).forEach(([input, expected]) => {
    assert.equal(chordDictionaryUrl(input), expected, input);
  });
  fixture.parserRejected.forEach(input => {
    assert.equal(parseChordForDictionary(input), null, input);
    assert.equal(parseChordForVoicing(input), null, input);
  });
});

test("preserves deterministic root-position guitar voicings", async () => {
  const { buildRootPositionVoicing } = await domain();

  Object.entries(fixture.voicings).forEach(([chord, expected]) => {
    const voicing = buildRootPositionVoicing(chord);
    assert.ok(voicing, chord);
    assert.deepEqual(voicing.frets.map(value => value?.fret ?? "x"), expected, chord);
    assert.equal(voicing.frets.find(value => value?.tone)?.tone.label, "R", chord);
  });
});

test("preserves URL query initialization without introducing router state", async () => {
  const { useChordProgressions } = await import(path.join(root, "src/composables/useChordProgressions.js"));

  fixture.queryCases.forEach(({ query, expectedKey, expectedMode }) => {
    const state = useChordProgressions({ search: `?key=${encodeURIComponent(query)}` });
    assert.equal(state.mode.value, expectedMode, query);
    assert.equal(state.selectedKey.value?.key || null, expectedKey, query);
  });
  const source = read("src/composables/useChordProgressions.js");
  assert.doesNotMatch(source, /history\.|pushState|replaceState|vue-router|location\.assign/);
});

test("mounts Chord Progressions as the ninth Vue-owned Vite MPA page", () => {
  const html = read("chord-progressions.html");
  const entry = read("src/entries/chord-progressions.js");
  const config = read("vite.config.mjs");

  assert.match(config, /"chord-progressions": resolve\(root, "chord-progressions\.html"\)/);
  assert.match(config, /"\/chord-progressions", "\/chord-progressions\.html"/);
  assert.match(html, /<body data-i18n-title="titles\.chordProgressions" data-vue-page="chord-progressions">/);
  assert.match(html, /<div id="vue-chord-progressions-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/chord-progressions\.js"><\/script>/);
  assert.match(entry, /activePage: "chord-progressions"/);
  assert.match(entry, /mountId: "vue-chord-progressions-root"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|chords)\.js/);
});

test("preserves SEO, analytics, theme, locale, shared styles, and animation assets", () => {
  const html = read("chord-progressions.html");

  assert.match(html, /<title>Chord Progressions \| Jam Tracks Hub<\/title>/);
  assert.match(html, /<meta name="description" content="Explore common major and minor chord progressions by key with guitar-friendly chord shapes\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/chord-progressions\.html">/);
  assert.match(html, /property="og:url" content="https:\/\/jamtrackshub\.com\/chord-progressions\.html"/);
  assert.match(html, /https:\/\/cloud\.umami\.is\/script\.js/);
  ["theme-init.js", "i18n-init.js", "styles/base.css", "styles/components.css", "styles/pages.css", "styles/themes.css", "gsap.min.js", "ScrollTrigger.min.js", "site-animations.js"].forEach(asset => {
    assert.match(html, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), asset);
  });
});

test("keeps Vue rendering safe and owns page state without duplicate DOM mutation", () => {
  const view = read("src/views/ChordProgressionsView.vue");
  const library = read("src/components/chords/ProgressionLibrary.vue");
  const shape = read("src/components/chords/ChordShapeCard.vue");

  assert.match(view, /useSiteLocale/);
  assert.match(view, /useChordProgressions/);
  assert.match(view, /id="main-content"/);
  assert.match(view, /id="keyModeToggle"/);
  assert.match(view, /data-chord-extension="triads"/);
  assert.match(view, /data-chord-extension="sevenths"/);
  [view, library, shape].forEach(source => assert.doesNotMatch(source, /v-html|innerHTML|data-i18n/));
});

test("does not resurrect unreachable audio, persistence, export, or transpose features", () => {
  const pageSources = [
    read("src/views/ChordProgressionsView.vue"),
    read("src/composables/useChordProgressions.js"),
    read("src/music/chordProgressions.mjs"),
    read("src/components/chords/ProgressionLibrary.vue"),
    read("src/components/chords/ChordShapeCard.vue")
  ].join("\n");

  assert.doesNotMatch(pageSources, /AudioContext|webkitAudioContext|createOscillator|\.play\(|fetch\(|XMLHttpRequest/);
  assert.doesNotMatch(pageSources, /localStorage|sessionStorage|indexedDB|jasperMusicSavedProgressions/);
  assert.doesNotMatch(pageSources, /progression-play-button|progression-save-button|progression-export-button|transposeDownButton|transposeUpButton/);
  assert.equal(fixture.visibleContract.audioControls, 0);
  assert.equal(fixture.visibleContract.persistenceControls, 0);
  assert.equal(fixture.visibleContract.storageReads, 0);
  assert.equal(fixture.visibleContract.audioRequests, 0);
});

test("preserves state transitions, selected styling, and accordion defaults", () => {
  const view = read("src/views/ChordProgressionsView.vue");
  const library = read("src/components/chords/ProgressionLibrary.vue");

  assert.match(view, /state\.selectAnotherKey\(\)/);
  assert.match(view, /modePrompt\.value = false/);
  assert.match(view, /state\.setExtension\('triads'\)/);
  assert.match(view, /state\.setExtension\('sevenths'\)/);
  assert.match(view, /:aria-pressed="String\(state\.extension\.value === 'triads'\)"/);
  assert.match(library, /:open="categoryIndex === 0"/);
  assert.match(library, /chunkProgressionItems\(chords, 4\)/);
});

test("preserves bilingual keys and uses shared language ownership", () => {
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));
  const view = read("src/views/ChordProgressionsView.vue");

  assert.deepEqual(Object.keys(english.pages.chordProgressions).sort(), Object.keys(traditionalChinese.pages.chordProgressions).sort());
  assert.deepEqual(Object.keys(english.progression.extra).sort(), Object.keys(traditionalChinese.progression.extra).sort());
  assert.match(view, /watch\(language/);
  assert.doesNotMatch(view, /jasperMusicLanguage|addEventListener\("jasper:language-change"/);
});

test("removes the exclusively page-owned legacy runtime after zero-caller review", () => {
  const html = read("chord-progressions.html");
  const packageJson = read("package.json");

  assert.equal(fs.existsSync(path.join(root, "scripts/chords.js")), false);
  assert.doesNotMatch(html, /scripts\/chords\.js/);
  assert.doesNotMatch(packageJson, /scripts\/chords\.js/);
  assert.ok(fs.existsSync(path.join(root, "scripts/site.js")));
  assert.ok(fs.existsSync(path.join(root, "scripts/i18n.js")));
});

test("extends deterministic Cloudflare verification without changing backend boundaries", () => {
  const verifier = read("tools/scripts/verify-cloudflare-build.js");

  assert.match(verifier, /"chord-progressions\.html"/);
  assert.match(verifier, /Chord Progressions canonical metadata differs/);
  assert.match(verifier, /Chord Progressions still loads a legacy page runtime/);
  assert.match(verifier, /compiled Vue Chord Progressions mount marker is missing/);
  assert.doesNotMatch(read("chord-progressions.html"), /site-config\.js|\/api\//);
  ["worker.js", "wrangler.jsonc", "functions/api/feedback.js", "functions/api/subscribe.js", "scripts/song-workspace.js"].forEach(file => {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  });
});

test("keeps dependency and version boundaries unchanged", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(packageJson.version, "2.0.4");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core", "vitest", "@vue/test-utils"].forEach(name => {
    assert.equal(packageJson.dependencies?.[name], undefined);
    assert.equal(packageJson.devDependencies?.[name], undefined);
  });
});
