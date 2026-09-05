const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function sequenceRandom(values) {
  let index = 0;
  return () => values[index++] ?? 0.8;
}

test("makes Fretboard Trainer the eighth Vue-owned MPA page", () => {
  const config = read("vite.config.mjs");
  const html = read("fretboard-trainer.html");
  const entry = read("src/entries/fretboard-trainer.js");

  assert.match(config, /"fretboard-trainer": resolve\(root, "fretboard-trainer\.html"\)/);
  assert.match(config, /"\/fretboard-trainer", "\/fretboard-trainer\.html"/);
  assert.match(html, /<body data-i18n-title="titles\.fretboardTrainer" data-vue-page="fretboard-trainer">/);
  assert.match(html, /<div id="vue-fretboard-trainer-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/fretboard-trainer\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="tracks-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|fretboard-trainer)\.js/);
  assert.match(entry, /activePage: "fretboard-trainer"/);
  assert.match(entry, /mountId: "vue-fretboard-trainer-root"/);
  assert.match(entry, /showBackToTop: true/);
});

test("preserves Fretboard Trainer SEO, analytics, CSS, and animation assets", () => {
  const html = read("fretboard-trainer.html");

  assert.match(html, /<title>Fretboard Trainer \| Jam Tracks Hub<\/title>/);
  assert.match(html, /content="Practice guitar fretboard note names with random string and fret questions across standard tuning\."/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/fretboard-trainer\.html">/);
  assert.match(html, /property="og:url" content="https:\/\/jamtrackshub\.com\/fretboard-trainer\.html"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.match(html, /styles\/fretboard-trainer\.css\?v=20260718-fretboard-trainer-polish/);
  assert.match(html, /assets\/vendor\/gsap\/gsap\.min\.js/);
  assert.match(html, /assets\/vendor\/gsap\/ScrollTrigger\.min\.js/);
  assert.match(html, /scripts\/site-animations\.js\?v=20260718-trainer-dropdown-hover/);
  assert.doesNotMatch(html, /data-umami-event|unsafe-eval|unsafe-inline|vue(?:\.global)?\.js/);
});

test("freezes the standard-tuning domain and all 78 string/fret mappings", async () => {
  const { FRET_COUNT, NOTES, STRINGS, exactNoteName, noteLabel, pitchAtPosition } = await importModule("src/music/fretboardTrainer.mjs");
  const expectedOpenPitches = new Map([[6, 4], [5, 9], [4, 2], [3, 7], [2, 11], [1, 4]]);

  assert.equal(FRET_COUNT, 13);
  assert.deepEqual(NOTES.map(note => note.label), [
    "C", "C# / Db", "D", "D# / Eb", "E", "F",
    "F# / Gb", "G", "G# / Ab", "A", "A# / Bb", "B"
  ]);
  assert.deepEqual(STRINGS.map(string => string.number), [6, 5, 4, 3, 2, 1]);
  assert.equal(noteLabel(1), "C# / Db");
  assert.equal(exactNoteName(1), "C#");
  assert.equal(noteLabel(10), "A# / Bb");
  assert.equal(exactNoteName(10), "A#");

  const positions = STRINGS.flatMap(string => Array.from({ length: FRET_COUNT }, (_, fret) => ({
    fret,
    pitch: pitchAtPosition(string.pitch, fret),
    string: string.number
  })));
  assert.equal(positions.length, 78);
  positions.forEach(position => {
    assert.equal(position.pitch, (expectedOpenPitches.get(position.string) + position.fret) % 12);
  });
  assert.equal(pitchAtPosition(4, 0), 4);
  assert.equal(pitchAtPosition(4, 12), 4);
  assert.equal(pitchAtPosition(11, 12), 11);
});

test("preserves random question generation and prevents only an exact consecutive repeat", async () => {
  const { createQuestion, questionKey } = await importModule("src/music/fretboardTrainer.mjs");
  const first = createQuestion("", sequenceRandom([0, 0]));
  const second = createQuestion(questionKey(first), sequenceRandom([0, 0, 0.2, 0]));

  assert.deepEqual(first, {
    string: { number: 6, name: "Low E", pitch: 4 },
    fret: 0,
    pitch: 4
  });
  assert.deepEqual(second, {
    string: { number: 5, name: "A", pitch: 9 },
    fret: 0,
    pitch: 9
  });
  assert.notEqual(questionKey(first), questionKey(second));
});

test("preserves answer, score, repeat-answer, reveal, next, and reset semantics", async () => {
  const { useFretboardTrainer } = await importModule("src/composables/useFretboardTrainer.js");
  const trainer = useFretboardTrainer({
    random: sequenceRandom([0, 0, 0.2, 0, 0.4, 0, 0.6, 0, 0.8, 0])
  });

  assert.equal(trainer.currentQuestion.value.pitch, 4);
  assert.equal(trainer.correctCount.value, 0);
  assert.equal(trainer.totalCount.value, 0);
  assert.equal(trainer.hasAnswered.value, false);

  assert.deepEqual(trainer.answer(4)?.isCorrect, true);
  assert.equal(trainer.correctCount.value, 1);
  assert.equal(trainer.totalCount.value, 1);
  assert.equal(trainer.feedbackState.value, "correct");
  assert.equal(trainer.answer(4), null);
  assert.equal(trainer.totalCount.value, 1);

  trainer.nextQuestion();
  assert.equal(trainer.currentQuestion.value.pitch, 9);
  assert.deepEqual(trainer.answer(10)?.isCorrect, false);
  assert.equal(trainer.correctCount.value, 1);
  assert.equal(trainer.totalCount.value, 2);
  assert.equal(trainer.selectedPitch.value, 10);
  assert.equal(trainer.feedbackState.value, "wrong");

  trainer.reveal();
  assert.equal(trainer.feedbackState.value, "revealed");
  assert.equal(trainer.selectedPitch.value, 10);
  assert.equal(trainer.totalCount.value, 2);

  trainer.nextQuestion();
  trainer.reveal();
  assert.equal(trainer.correctCount.value, 1);
  assert.equal(trainer.totalCount.value, 2);

  trainer.reset();
  assert.equal(trainer.correctCount.value, 0);
  assert.equal(trainer.totalCount.value, 0);
  assert.equal(trainer.hasAnswered.value, false);
  assert.equal(trainer.feedbackState.value, "neutral");
  assert.equal(trainer.selectedPitch.value, null);
});

test("keeps rapid interactions singular and free of stale question state", async () => {
  const { useFretboardTrainer } = await importModule("src/composables/useFretboardTrainer.js");
  const trainer = useFretboardTrainer({
    random: sequenceRandom([0, 0, 0.2, 0, 0.4, 0, 0.6, 0, 0.8, 0, 0.99, 0])
  });

  trainer.answer(4);
  trainer.nextQuestion();
  trainer.answer(9);
  trainer.reset();
  const resetQuestion = trainer.currentQuestion.value;
  trainer.answer(resetQuestion.pitch);
  trainer.nextQuestion();

  assert.equal(trainer.correctCount.value, 1);
  assert.equal(trainer.totalCount.value, 1);
  assert.equal(trainer.hasAnswered.value, false);
  assert.notEqual(trainer.currentQuestion.value, resetQuestion);
  assert.equal(trainer.feedbackState.value, "neutral");
});

test("keeps Vue locale ownership and the legacy language-switch state contract", () => {
  const view = read("src/views/FretboardTrainerView.vue");

  assert.match(view, /useSiteLocale/);
  assert.match(view, /watch\(language/);
  assert.match(view, /if \(!trainer\.hasAnswered\.value\) feedbackText\.value = messages\.value\.chooseNote/);
  assert.match(view, /currentQuestion\.value\.string\.name/);
  assert.match(view, /messages\.value\.answerDetail/);
  assert.doesNotMatch(view, /data-i18n|useLegacyLocale|v-html|innerHTML/);
});

test("preserves native keyboard, touch, feedback, and accessibility semantics", () => {
  const view = read("src/views/FretboardTrainerView.vue");
  const css = read("styles/fretboard-trainer.css");

  assert.equal((view.match(/<main\b/g) || []).length, 1);
  assert.equal((view.match(/<h1\b/g) || []).length, 1);
  assert.match(view, /<section class="trainer-workspace" aria-labelledby="trainerQuestionTitle">/);
  assert.match(view, /id="trainerFeedback"[\s\S]*?aria-live="polite"/);
  assert.match(view, /class="trainer-score" :aria-label="messages\.currentScore"/);
  assert.match(view, /class="note-answer-grid" id="noteAnswerGrid" :aria-label="messages\.chooseNoteName"/);
  assert.match(view, /v-for="note in NOTES"[\s\S]*?type="button"/);
  assert.doesNotMatch(view, /@keydown|@keyup|tabindex="-1"|touchstart|pointerdown/);
  assert.match(css, /\.note-answer-grid button \{[\s\S]*?min-height: 48px;/);
  assert.match(css, /button:hover:not\(:disabled\)/);
});

test("preserves the established responsive geometry at all requested widths", () => {
  const css = read("styles/fretboard-trainer.css");
  const requestedWidths = [375, 390, 430, 768, 820, 834, 1024, 1180, 1194, 1280, 1440];

  assert.equal(requestedWidths.length * 2 * 2, 44);
  assert.match(css, /\.trainer-page \{[\s\S]*?max-width: 1120px;/);
  assert.match(css, /\.trainer-workspace \{[\s\S]*?grid-template-columns: minmax\(0, 0\.9fr\) minmax\(0, 1\.1fr\);/);
  assert.match(css, /@media \(max-width: 900px\) \{[\s\S]*?\.trainer-workspace \{[\s\S]*?grid-template-columns: 1fr;/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.note-answer-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.trainer-question-display strong \{[\s\S]*?font-size: 56px;/);
  assert.match(css, /\.string-reference-grid \{[\s\S]*?grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/);
});

test("adds no trainer persistence, audio, router, network, or custom analytics", () => {
  const view = read("src/views/FretboardTrainerView.vue");
  const composable = read("src/composables/useFretboardTrainer.js");
  const domain = read("src/music/fretboardTrainer.mjs");
  const implementation = `${view}\n${composable}\n${domain}`;

  assert.doesNotMatch(implementation, /localStorage|sessionStorage|indexedDB|Audio\(|AudioContext|\.play\(|fetch\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(implementation, /vue-router|createRouter|data-umami-event|umami\.track/);
  assert.doesNotMatch(implementation, /document\.title|location\.(?:search|hash)|history\./);
});

test("removes only the page-owned legacy trainer runtime at version 2.0.5", () => {
  const packageJson = JSON.parse(read("package.json"));
  const html = read("fretboard-trainer.html");

  assert.equal(fs.existsSync(path.join(root, "scripts/fretboard-trainer.js")), false);
  assert.doesNotMatch(html, /scripts\/fretboard-trainer\.js/);
  assert.match(read("src/components/site/SiteHeader.vue"), /fretboard-trainer\.html/);
  assert.match(read("src/i18n/useSiteLocale.js"), /jasper:language-change/);
  assert.match(read("scripts/site-animations.js"), /\.trainer-heading/);
  assert.equal(packageJson.version, "2.0.5");
  assert.equal(packageJson.dependencies.vue, "3.5.42");
  assert.equal(packageJson.dependencies["vue-router"], undefined);
});
