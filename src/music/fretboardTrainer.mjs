export const NOTES = Object.freeze([
  Object.freeze({ pitch: 0, label: "C" }),
  Object.freeze({ pitch: 1, label: "C# / Db" }),
  Object.freeze({ pitch: 2, label: "D" }),
  Object.freeze({ pitch: 3, label: "D# / Eb" }),
  Object.freeze({ pitch: 4, label: "E" }),
  Object.freeze({ pitch: 5, label: "F" }),
  Object.freeze({ pitch: 6, label: "F# / Gb" }),
  Object.freeze({ pitch: 7, label: "G" }),
  Object.freeze({ pitch: 8, label: "G# / Ab" }),
  Object.freeze({ pitch: 9, label: "A" }),
  Object.freeze({ pitch: 10, label: "A# / Bb" }),
  Object.freeze({ pitch: 11, label: "B" })
]);

export const STRINGS = Object.freeze([
  Object.freeze({ number: 6, name: "Low E", pitch: 4 }),
  Object.freeze({ number: 5, name: "A", pitch: 9 }),
  Object.freeze({ number: 4, name: "D", pitch: 2 }),
  Object.freeze({ number: 3, name: "G", pitch: 7 }),
  Object.freeze({ number: 2, name: "B", pitch: 11 }),
  Object.freeze({ number: 1, name: "High E", pitch: 4 })
]);

export const FRET_COUNT = 13;

export function noteLabel(pitch) {
  return NOTES.find(note => note.pitch === pitch)?.label || "Unknown";
}

export function exactNoteName(pitch) {
  return noteLabel(pitch).split(" / ")[0];
}

export function pitchAtPosition(stringPitch, fret) {
  return (stringPitch + fret) % NOTES.length;
}

export function questionKey(question) {
  return `${question.string.number}-${question.fret}`;
}

export function createQuestion(previousQuestionKey = "", random = Math.random) {
  let question = null;

  do {
    const string = STRINGS[Math.floor(random() * STRINGS.length)];
    const fret = Math.floor(random() * FRET_COUNT);
    question = {
      string,
      fret,
      pitch: pitchAtPosition(string.pitch, fret)
    };
  } while (questionKey(question) === previousQuestionKey);

  return question;
}
