const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const lab = () => import(path.join(root, "src/music/chordLab.mjs"));
const labExport = () => import(path.join(root, "src/services/chordLabExport.mjs"));
const TUNING = [40, 45, 50, 55, 59, 64];

function chordOf(m, symbol) {
  const parsed = m.parseLabChord(symbol);
  assert.equal(parsed.ok, true, symbol);
  return parsed.chord;
}

function degrees(chord) {
  return chord.tones.map(tone => `${tone.degree}${tone.required ? "" : "?"}`).join(" ");
}

test("parses add, sus, extensions, alterations, slash, omit, alt, 6/9, m(maj7), dim and aug", async () => {
  const m = await lab();
  const cases = {
    Gmaj7add13: "1 3 5? 7 13",
    Cmaj7: "1 3 5? 7",
    Dm7: "1 b3 5? b7",
    Gadd9: "1 3 5? 9",
    Dsus2: "1 2 5?",
    A7sus4: "1 4 5? b7",
    Am11: "1 b3 5? b7 9? 11",
    F13: "1 3 5? b7 9? 13",
    "Cmaj7#11": "1 3 5? 7 #11",
    E7b9b13: "1 3 5? b7 b9 b13",
    C7omit5: "1 3 b7",
    "G7(omit3)": "1 5? b7",
    G7alt: "1 3 b5? #5? b7 b9? #9?",
    "C6/9": "1 3 5? 6 9",
    Am6: "1 b3 5? 6",
    "Am(maj7)": "1 b3 5? 7",
    Bm7b5: "1 b3 b5 b7",
    Bdim7: "1 b3 b5 bb7",
    Caug: "1 3 #5",
    C5: "1 5"
  };
  Object.entries(cases).forEach(([symbol, expected]) => assert.equal(degrees(chordOf(m, symbol)), expected, symbol));
  assert.equal(chordOf(m, "CM7").tones.find(tone => tone.role === "seventh").degree, "7");
  assert.equal(chordOf(m, "Cm7").tones.find(tone => tone.role === "seventh").degree, "b7");
  assert.equal(chordOf(m, "C∆7").symbol, "Cmaj7");
  assert.equal(chordOf(m, "Bbø").symbol, "Bbm7b5");
  assert.equal(chordOf(m, "F♯m7").rootName, "F#");
});

test("spells chord tones from the typed root and keeps slash basses", async () => {
  const m = await lab();
  assert.deepEqual(chordOf(m, "Gmaj7add13").tones.map(tone => tone.note), ["G", "B", "D", "F#", "E"]);
  assert.deepEqual(chordOf(m, "Bbm7b5").tones.map(tone => tone.note), ["Bb", "Db", "Fb", "Ab"]);
  const slash = chordOf(m, "D/F#");
  assert.equal(slash.symbol, "D/F#");
  assert.equal(slash.bassName, "F#");
  assert.equal(slash.allowRootless, false);
  const foreignBass = chordOf(m, "C/D");
  assert.equal(foreignBass.tones.find(tone => tone.role === "bass").note, "D");
});

test("rejects symbols it cannot read with a reason", async () => {
  const m = await lab();
  assert.deepEqual(m.parseLabChord("").error.code, "empty");
  assert.deepEqual(m.parseLabChord("H7").error.code, "root");
  assert.deepEqual(m.parseLabChord("Cxyz").error, { code: "quality", detail: "xyz" });
});

test("every generated shape is playable and contains the chord's required tones", async () => {
  const m = await lab();
  m.LAB_EXAMPLES.flatMap(group => group.examples).forEach(symbol => {
    const chord = chordOf(m, symbol);
    const voicings = m.generateLabVoicings(chord);
    assert.ok(voicings.length >= 5, `${symbol} has ${voicings.length} shapes`);
    voicings.forEach(voicing => {
      const fretted = voicing.frets.filter(fret => fret > 0);
      assert.ok(Math.max(...fretted, 0) - Math.min(...fretted, 99) <= 3 || !fretted.length, `${symbol} span`);
      assert.ok(voicing.fingers <= 4, `${symbol} fingers`);
      const sounding = voicing.frets.map((fret, index) => fret < 0 ? null : (TUNING[index] + fret - chord.rootPitch) % 12).filter(value => value !== null);
      sounding.forEach(semitone => assert.ok(chord.tones.some(tone => tone.semitone === semitone), `${symbol} stray note`));
      chord.tones.filter(tone => tone.required && !(voicing.rootless && tone.role === "root"))
        .forEach(tone => assert.ok(sounding.includes(tone.semitone), `${symbol} ${m.fretsText(voicing.frets)} misses ${tone.degree}`));
      if (voicing.rootless) {
        assert.ok(!sounding.includes(0), `${symbol} rootless shape has a root`);
        assert.ok(!voicing.frets.includes(0) && voicing.frets[0] < 0, `${symbol} rootless shapes are closed grips`);
      } else if (chord.bassSemitone !== null) {
        assert.equal(sounding[0], chord.bassSemitone, `${symbol} bass`);
      } else {
        assert.equal(sounding[0], 0, `${symbol} root in the bass`);
      }
    });
  });
});

test("ranks five varied shapes, keeps one rootless shape and filters by fret and root", async () => {
  const m = await lab();
  const chord = chordOf(m, "Gmaj7add13");
  const voicings = m.generateLabVoicings(chord);
  const best = m.rankLabVoicings(voicings);
  assert.equal(best.top.length, 5);
  assert.equal(best.top.filter(voicing => voicing.rootless).length, 1);
  assert.equal(best.all.length, voicings.length);
  const near12 = m.rankLabVoicings(voicings, { near: "12" });
  assert.ok(near12.top.every(voicing => Math.abs(voicing.position - 12) <= 3), near12.top.map(v => v.position).join(","));
  assert.ok(m.rankLabVoicings(voicings, { rootMode: "rootless" }).all.every(voicing => voicing.rootless));
  assert.ok(m.rankLabVoicings(voicings, { rootMode: "root" }).all.every(voicing => !voicing.rootless));
  assert.equal(chordOf(m, "C").allowRootless, false);
  assert.ok(m.generateLabVoicings(chordOf(m, "C")).every(voicing => !voicing.rootless));
});

test("suggests three tiers of simpler chords", async () => {
  const m = await lab();
  const tiers = m.simplifyLabChord(chordOf(m, "Gmaj7add13"));
  assert.deepEqual(tiers.map(tier => tier.tier), [1, 2, 3]);
  assert.ok(tiers[0].items.every(item => item.symbol === "Gmaj7add13" && item.changes.every(change => change.type === "omit")));
  assert.deepEqual(tiers[1].items.map(item => item.symbol), ["G6", "Gmaj7"]);
  assert.deepEqual(tiers[2].items.map(item => item.symbol), ["G7", "Gsus4"]);
  const toDominant = tiers[2].items[0].changes.find(change => change.type === "replace");
  assert.deepEqual([toDominant.from.degree, toDominant.to.degree], ["7", "b7"]);
  const slash = m.simplifyLabChord(chordOf(m, "D/F#"));
  assert.equal(slash.find(tier => tier.tier === 2).items[0].symbol, "D");
  assert.ok(slash.find(tier => tier.tier === 2).items[0].changes.some(change => change.type === "dropBass"));
});

test("the image export draws the chord, five cards and an ASCII file name", async () => {
  const m = await lab();
  const { generateChordLabSvg, chordLabFilename } = await labExport();
  const chord = chordOf(m, "Gmaj7add13");
  const { top } = m.rankLabVoicings(m.generateLabVoicings(chord));
  const svg = generateChordLabSvg({
    chord,
    tonesText: "R G · 3 B",
    items: top.map((voicing, index) => ({ voicing, rankText: `#${index + 1}`, positionText: `Fret ${voicing.position}` }))
  }, { theme: "light", imageText: { tool: "和弦實驗室", shapes: "推薦指型" } });
  assert.match(svg, /Jam Tracks Hub · 和弦實驗室/);
  assert.match(svg, />Gmaj7add13</);
  assert.equal((svg.match(/>#\d</g) || []).length, 5);
  assert.match(svg, />Rootless</);
  assert.match(svg, /fill="#ece7de"/);
  assert.equal(chordLabFilename("D/F#"), "d-over-fsharp-chord-lab");
});

test("registers Chord Lab as its own Vue page in the Tools menu", () => {
  const html = read("chord-lab.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/chord-lab">/);
  assert.match(html, /data-i18n-title="titles\.chordLab" data-vue-page="chord-lab"/);
  assert.match(html, /<div id="vue-chord-lab-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/chord-lab\.js"><\/script>/);
  assert.match(html, /styles\/chord-lab\.css">\s*<link rel="stylesheet" href="styles\/tool-pages\.css/);
  assert.match(read("src/entries/chord-lab.js"), /activePage: "chord-lab"/);
  const config = read("vite.config.mjs");
  assert.match(config, /"chord-lab": resolve\(root, "chord-lab\.html"\)/);
  assert.match(config, /"\/chord-lab", "\/chord-lab\.html"/);
  assert.match(read("tools/scripts/stylesheet-versions.js"), /"styles\/chord-lab\.css"/);
  assert.match(read("tools/scripts/build-cloudflare.js"), /"chord-lab\.html",/);
  assert.match(read("tools/scripts/verify-cloudflare-build.js"), /Chord Lab compiled Vue entry is missing/);
  const header = read("src/components/site/SiteHeader.vue");
  assert.match(header, /href: "\/chord-lab\.html", page: "chord-lab", key: "nav\.chordLab"/);
  assert.match(header, /"nav\.chordDictionary"[^\n]*\n[^\n]*"nav\.chordLab"/, "Chord Lab sits right after Chord Dictionary");
});

test("Chord Lab copy exists in both languages with the same keys", () => {
  const en = JSON.parse(read("locales/en/common.json"));
  const zh = JSON.parse(read("locales/zh-TW/common.json"));
  const keys = value => Object.entries(value).flatMap(([key, child]) => typeof child === "object" ? keys(child).map(sub => `${key}.${sub}`) : [key]).sort();
  assert.deepEqual(keys(en.pages.chordLab), keys(zh.pages.chordLab));
  assert.equal(zh.pages.chordLab.simplifyButton, "覺得太難按嗎？推薦稍微簡化的和弦。");
  assert.match(zh.pages.chordLab.rootlessNote, /Funk 和爵士很常用/);
  assert.match(zh.pages.chordLab.rootlessNote, /目前網站其他工具的指型都含根音/);
  assert.equal(en.nav.chordLab, "Chord Lab");
  assert.equal(zh.nav.chordLab, "和弦實驗室");
  const view = read("src/views/ChordLabView.vue");
  const used = [...view.matchAll(/messages\.value\.(\w+)/g)].map(match => match[1]);
  used.forEach(key => assert.ok(key in en.pages.chordLab, `missing ${key}`));
  assert.doesNotMatch(view, /v-html|innerHTML/);
});
