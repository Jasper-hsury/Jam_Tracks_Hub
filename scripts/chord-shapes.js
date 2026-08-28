(function(root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.JamChordShapes = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
    "use strict";

    const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const FLAT_ROOTS = new Set([3, 5, 8, 10]);
    const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
    const NATURAL_PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const TUNING_MIDI = [40, 45, 50, 55, 59, 64];
    const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
    const MAX_FRET_SPAN = 3;
    const DIAGRAM_FRET_ROWS = 4;
    const POSITION_TARGETS = [0, 3, 5, 7, 9, 12];
    const voicingCache = new Map();

    const chordById = {
        major: { id: "major", suffix: "", intervals: [0, 4, 7], formula: ["1", "3", "5"] },
        minor: { id: "minor", suffix: "m", intervals: [0, 3, 7], formula: ["1", "b3", "5"] },
        diminished: { id: "diminished", suffix: "dim", intervals: [0, 3, 6], formula: ["1", "b3", "b5"] },
        augmented: { id: "augmented", suffix: "aug", intervals: [0, 4, 8], formula: ["1", "3", "#5"] },
        dominant7: { id: "dominant7", suffix: "7", intervals: [0, 4, 7, 10], formula: ["1", "3", "5", "b7"] },
        major7: { id: "major7", suffix: "maj7", intervals: [0, 4, 7, 11], formula: ["1", "3", "5", "7"] },
        minor7: { id: "minor7", suffix: "m7", intervals: [0, 3, 7, 10], formula: ["1", "b3", "5", "b7"] },
        minorMajor7: { id: "minorMajor7", suffix: "m(maj7)", intervals: [0, 3, 7, 11], formula: ["1", "b3", "5", "7"] },
        diminished7: { id: "diminished7", suffix: "dim7", intervals: [0, 3, 6, 9], formula: ["1", "b3", "b5", "bb7"] },
        halfDiminished7: { id: "halfDiminished7", suffix: "m7b5", intervals: [0, 3, 6, 10], formula: ["1", "b3", "b5", "b7"] },
        sixth: { id: "sixth", suffix: "6", intervals: [0, 4, 7, 9], formula: ["1", "3", "5", "6"] },
        minor6: { id: "minor6", suffix: "m6", intervals: [0, 3, 7, 9], formula: ["1", "b3", "5", "6"] },
        add9: { id: "add9", suffix: "add9", intervals: [0, 2, 4, 7], formula: ["1", "2", "3", "5"] },
        minorAdd9: { id: "minorAdd9", suffix: "m(add9)", intervals: [0, 2, 3, 7], formula: ["1", "2", "b3", "5"] },
        sixNine: { id: "sixNine", suffix: "6/9", intervals: [0, 2, 4, 7, 9], formula: ["1", "2", "3", "5", "6"] },
        ninth: { id: "ninth", suffix: "9", intervals: [0, 2, 4, 7, 10], formula: ["1", "3", "5", "b7", "9"] },
        major9: { id: "major9", suffix: "maj9", intervals: [0, 2, 4, 7, 11], formula: ["1", "3", "5", "7", "9"] },
        minor9: { id: "minor9", suffix: "m9", intervals: [0, 2, 3, 7, 10], formula: ["1", "b3", "5", "b7", "9"] },
        eleventh: { id: "eleventh", suffix: "11", intervals: [0, 2, 4, 5, 7, 10], formula: ["1", "3", "5", "b7", "9", "11"] },
        minor11: { id: "minor11", suffix: "m11", intervals: [0, 2, 3, 5, 7, 10], formula: ["1", "b3", "5", "b7", "9", "11"] },
        thirteenth: { id: "thirteenth", suffix: "13", intervals: [0, 2, 4, 7, 9, 10], formula: ["1", "3", "5", "b7", "9", "13"] },
        major13: { id: "major13", suffix: "maj13", intervals: [0, 2, 4, 7, 9, 11], formula: ["1", "3", "5", "7", "9", "13"] },
        minor13: { id: "minor13", suffix: "m13", intervals: [0, 2, 3, 7, 9, 10], formula: ["1", "b3", "5", "b7", "9", "13"] },
        sus2: { id: "sus2", suffix: "sus2", intervals: [0, 2, 7], formula: ["1", "2", "5"] },
        sus4: { id: "sus4", suffix: "sus4", intervals: [0, 5, 7], formula: ["1", "4", "5"] },
        sevenSus4: { id: "sevenSus4", suffix: "7sus4", intervals: [0, 5, 7, 10], formula: ["1", "4", "5", "b7"] },
        power: { id: "power", suffix: "5", intervals: [0, 7], formula: ["1", "5"] },
        sevenFlat5: { id: "sevenFlat5", suffix: "7b5", intervals: [0, 4, 6, 10], formula: ["1", "3", "b5", "b7"] },
        sevenSharp5: { id: "sevenSharp5", suffix: "7#5", intervals: [0, 4, 8, 10], formula: ["1", "3", "#5", "b7"] },
        sevenFlat9: { id: "sevenFlat9", suffix: "7b9", intervals: [0, 1, 4, 7, 10], formula: ["1", "b9", "3", "5", "b7"] },
        sevenSharp9: { id: "sevenSharp9", suffix: "7#9", intervals: [0, 3, 4, 7, 10], formula: ["1", "#9", "3", "5", "b7"] },
        nineSus4: { id: "nineSus4", suffix: "9sus4", intervals: [0, 2, 5, 7, 10], formula: ["1", "9", "4", "5", "b7"] },
        thirteenFlat9: { id: "thirteenFlat9", suffix: "13b9", intervals: [0, 1, 4, 7, 9, 10], formula: ["1", "b9", "3", "5", "13", "b7"] },
        sevenFlat13: { id: "sevenFlat13", suffix: "7(b13)", intervals: [0, 4, 7, 8, 10], formula: ["1", "3", "5", "b13", "b7"] }
    };

    const suffixByChordId = Object.fromEntries(Object.entries(chordById).map(function(entry) {
        return [entry[0], entry[1].suffix];
    }));

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function pitchFromName(noteName) {
        const normalized = String(noteName || "").trim().toLowerCase();
        const pitchMap = {
            c: { pitch: 0, name: "C" }, "b#": { pitch: 0, name: "C" },
            "c#": { pitch: 1, name: "C#" }, db: { pitch: 1, name: "Db" },
            d: { pitch: 2, name: "D" }, "d#": { pitch: 3, name: "D#" }, eb: { pitch: 3, name: "Eb" },
            e: { pitch: 4, name: "E" }, fb: { pitch: 4, name: "E" }, "e#": { pitch: 5, name: "F" },
            f: { pitch: 5, name: "F" }, "f#": { pitch: 6, name: "F#" }, gb: { pitch: 6, name: "Gb" },
            g: { pitch: 7, name: "G" }, "g#": { pitch: 8, name: "G#" }, ab: { pitch: 8, name: "Ab" },
            a: { pitch: 9, name: "A" }, "a#": { pitch: 10, name: "A#" }, bb: { pitch: 10, name: "Bb" },
            b: { pitch: 11, name: "B" }, cb: { pitch: 11, name: "B" }
        };
        return pitchMap[normalized] || null;
    }

    function chordIdFromSuffix(suffix) {
        const compact = String(suffix || "").replace(/[\s_-]/g, "");
        const lower = compact.toLowerCase();
        if (!compact || compact === "M") return "major";
        if (["M7", "Maj7", "MAJ7", "Δ7", "△7"].includes(compact)) return "major7";
        const aliases = {
            maj: "major", major: "major", m: "minor", min: "minor", dim: "diminished", o: "diminished",
            aug: "augmented", "+": "augmented", 7: "dominant7", dom7: "dominant7", maj7: "major7",
            major7: "major7", ma7: "major7", m7: "minor7", min7: "minor7", mmaj7: "minorMajor7",
            "m(maj7)": "minorMajor7", mmajor7: "minorMajor7", minmaj7: "minorMajor7", dim7: "diminished7",
            o7: "diminished7", m7b5: "halfDiminished7", "ø": "halfDiminished7", "ø7": "halfDiminished7",
            halfdim7: "halfDiminished7", 6: "sixth", m6: "minor6", min6: "minor6", add9: "add9",
            madd9: "minorAdd9", "m(add9)": "minorAdd9", minadd9: "minorAdd9", "6/9": "sixNine", 69: "sixNine",
            9: "ninth", maj9: "major9", major9: "major9", m9: "minor9", min9: "minor9", 11: "eleventh",
            m11: "minor11", min11: "minor11", 13: "thirteenth", maj13: "major13", major13: "major13",
            m13: "minor13", min13: "minor13", sus2: "sus2", sus4: "sus4", "7sus4": "sevenSus4",
            sus47: "sevenSus4", 5: "power", "7b5": "sevenFlat5", "7#5": "sevenSharp5",
            "7b9": "sevenFlat9", "7#9": "sevenSharp9", "9sus4": "nineSus4", "13b9": "thirteenFlat9",
            "7b13": "sevenFlat13", "7(b13)": "sevenFlat13"
        };
        return aliases[lower] || null;
    }

    function parseChord(value) {
        const raw = String(value || "").trim().replace(/♯/g, "#").replace(/♭/g, "b");
        if (!raw || /\s/.test(raw)) return null;
        const match = raw.match(/^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g])([#b]?))?$/);
        if (!match) return null;
        const rootName = `${match[1].toUpperCase()}${match[2] || ""}`;
        const root = pitchFromName(rootName);
        const bassName = match[4] ? `${match[4].toUpperCase()}${match[5] || ""}` : "";
        const bass = bassName ? pitchFromName(bassName) : null;
        const chordId = chordIdFromSuffix(match[3]);
        if (!root || (bassName && !bass) || !chordId || !chordById[chordId]) return null;
        return {
            rootName: root.name,
            rootPitch: root.pitch,
            bassName: bass ? bass.name : null,
            bassPitch: bass ? bass.pitch : null,
            chordId,
            chord: chordById[chordId],
            symbol: `${root.name}${suffixByChordId[chordId]}${bass ? `/${bass.name}` : ""}`
        };
    }

    function normalizeChord(value) {
        return parseChord(value)?.symbol || null;
    }

    function noteNames(rootPitch) {
        return FLAT_ROOTS.has(rootPitch) ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
    }

    function intervalLabel(formula) {
        return formula === "1" ? "R" : formula;
    }

    function toneFamily(formula) {
        const compact = String(formula || "").replace(/\s+/g, "");
        if (compact === "1") return "root";
        if (["3", "b3", "#9"].includes(compact)) return "third";
        if (["5", "b5", "#5"].includes(compact)) return "fifth";
        if (["7", "b7", "bb7"].includes(compact)) return "seventh";
        return "extension";
    }

    function spellChordTone(pitch, formula, index, parsed) {
        const names = noteNames(parsed.rootPitch);
        if (index === 0) return parsed.rootName;
        const degreeMatch = String(formula || "").match(/\d+/);
        if (!degreeMatch) return names[pitch];
        const targetLetter = LETTERS[(LETTERS.indexOf(parsed.rootName[0]) + (Number(degreeMatch[0]) - 1) % 7) % 7];
        let distance = (pitch - NATURAL_PITCHES[targetLetter] + 12) % 12;
        if (distance > 6) distance -= 12;
        if (Math.abs(distance) > 1) return names[pitch];
        return `${targetLetter}${distance > 0 ? "#".repeat(distance) : "b".repeat(Math.abs(distance))}`;
    }

    function chordPitchClasses(parsed) {
        return parsed.chord.intervals.map(function(interval) { return (parsed.rootPitch + interval) % 12; });
    }

    function chordToneForPitch(pitch, parsed) {
        const pitchClass = ((pitch % 12) + 12) % 12;
        const index = parsed.chord.intervals.findIndex(function(interval) {
            return (parsed.rootPitch + interval) % 12 === pitchClass;
        });
        if (index === -1) return null;
        return {
            label: intervalLabel(parsed.chord.formula[index]),
            note: spellChordTone(pitchClass, parsed.chord.formula[index], index, parsed),
            isRoot: index === 0,
            family: toneFamily(parsed.chord.formula[index]),
            order: index
        };
    }

    function stringOptionsForWindow(chordPitches, startFret, endFret) {
        return TUNING_MIDI.map(function(openMidi) {
            const options = [-1];
            if (startFret === 0 && chordPitches.includes(openMidi % 12)) options.push(0);
            for (let fret = Math.max(1, startFret); fret <= endFret; fret += 1) {
                if (chordPitches.includes((openMidi + fret) % 12)) options.push(fret);
            }
            return options;
        });
    }

    function scoreVoicing(frets, parsed) {
        const sounding = frets.map(function(fret, index) { return { fret, index }; }).filter(function(item) { return item.fret >= 0; });
        if (sounding.length < Math.min(3, parsed.chord.intervals.length)) return null;
        const firstString = sounding[0].index;
        const lastString = sounding[sounding.length - 1].index;
        for (let index = firstString; index <= lastString; index += 1) {
            if (frets[index] < 0) return null;
        }
        const pitches = sounding.map(function(item) { return (TUNING_MIDI[item.index] + item.fret) % 12; });
        if (parsed.bassPitch !== null && pitches[0] !== parsed.bassPitch) return null;
        const uniquePitches = new Set(pitches);
        const targetPitches = chordPitchClasses(parsed);
        const coverage = targetPitches.filter(function(pitch) { return uniquePitches.has(pitch); }).length;
        if (!uniquePitches.has(parsed.rootPitch) || coverage < Math.min(targetPitches.length, 4)) return null;
        const fretted = sounding.map(function(item) { return item.fret; }).filter(function(fret) { return fret > 0; });
        const minimumFret = fretted.length ? Math.min(...fretted) : 0;
        const maximumFret = fretted.length ? Math.max(...fretted) : 0;
        const span = maximumFret - minimumFret;
        if (span > MAX_FRET_SPAN) return null;
        const rootInBass = pitches[0] === parsed.rootPitch;
        const requestedBass = parsed.bassPitch !== null && pitches[0] === parsed.bassPitch;
        const openStrings = sounding.filter(function(item) { return item.fret === 0; }).length;
        const mutedStrings = 6 - sounding.length;
        const averageFret = fretted.length ? fretted.reduce(function(total, fret) { return total + fret; }, 0) / fretted.length : 0;
        return coverage * 24 + (coverage === targetPitches.length ? 18 : 0) + (rootInBass ? 22 : 0)
            + (requestedBass ? 30 : 0) + sounding.length * 3 + openStrings * 4 - span * 4 - averageFret * 0.8 - mutedStrings * 2;
    }

    function generateVoicings(parsedInput) {
        const parsed = typeof parsedInput === "string" ? parseChord(parsedInput) : parsedInput;
        if (!parsed) return [];
        if (voicingCache.has(parsed.symbol)) return voicingCache.get(parsed.symbol).map(function(item) { return { frets: [...item.frets], score: item.score }; });
        const chordPitches = chordPitchClasses(parsed);
        const candidates = [];
        const seen = new Set();
        for (let startFret = 0; startFret <= POSITION_TARGETS.at(-1); startFret += 1) {
            const options = stringOptionsForWindow(chordPitches, startFret, startFret + MAX_FRET_SPAN);
            const current = Array(6).fill(-1);
            (function search(stringIndex) {
                if (stringIndex === 6) {
                    const key = current.join(",");
                    if (seen.has(key)) return;
                    seen.add(key);
                    const score = scoreVoicing(current, parsed);
                    if (score !== null) candidates.push({ frets: [...current], score });
                    return;
                }
                options[stringIndex].forEach(function(fret) {
                    current[stringIndex] = fret;
                    search(stringIndex + 1);
                });
            })(0);
        }
        candidates.sort(function(a, b) { return b.score - a.score; });
        const result = candidates.slice(0, 180);
        voicingCache.set(parsed.symbol, result);
        return result.map(function(item) { return { frets: [...item.frets], score: item.score }; });
    }

    function voicingPosition(frets) {
        if (frets.includes(0)) return 0;
        const positive = frets.filter(function(fret) { return fret > 0; });
        return positive.length ? Math.min(...positive) : 0;
    }

    function nearestPositionTarget(frets) {
        const position = voicingPosition(frets);
        return POSITION_TARGETS.reduce(function(closest, target) {
            return Math.abs(target - position) < Math.abs(closest - position) ? target : closest;
        }, POSITION_TARGETS[0]);
    }

    function rootStringLabel(rootString) {
        return ({ "6": "6th string", "5": "5th string", "4": "4th string", "3": "3rd string", "2": "2nd string", "1": "1st string" })[String(rootString)] || "any root string";
    }

    function voicingHasRootOnString(frets, rootString, parsed) {
        if (rootString === "all") return true;
        const targetStringIndex = 6 - Number(rootString);
        const fret = frets[targetStringIndex];
        return fret >= 0 && Boolean(chordToneForPitch(TUNING_MIDI[targetStringIndex] + fret, parsed)?.isRoot);
    }

    function diagramBaseFret(frets) {
        const positive = frets.filter(function(fret) { return fret > 0; });
        return !positive.length || Math.max(...positive) <= DIAGRAM_FRET_ROWS ? 1 : Math.min(...positive);
    }

    function voicingKey(voicing) {
        return Array.isArray(voicing?.frets) ? voicing.frets.join(",") : "";
    }

    function diagramModel(parsed, voicing) {
        if (!parsed || !voicing || !Array.isArray(voicing.frets)) return null;
        const baseFret = diagramBaseFret(voicing.frets);
        return {
            symbol: parsed.symbol,
            baseFret,
            strings: voicing.frets.map(function(fret, stringIndex) {
                const pitch = fret >= 0 ? TUNING_MIDI[stringIndex] + fret : null;
                return { name: STRING_NAMES[stringIndex], fret, tone: pitch === null ? null : chordToneForPitch(pitch, parsed) };
            })
        };
    }

    function appendDiagramContents(host, parsed, voicing, documentRef) {
        const model = diagramModel(parsed, voicing);
        if (!model) return host;
        const status = documentRef.createElement("div");
        status.className = "diagram-status-row";
        model.strings.forEach(function(string) {
            const item = documentRef.createElement("span");
            item.className = `diagram-string-status${string.fret < 0 ? " is-muted" : string.fret === 0 ? " is-open" : ""}${string.tone?.isRoot ? " is-root" : ""}`;
            if (string.fret < 0) {
                item.textContent = "X";
            } else if (string.fret === 0) {
                const open = documentRef.createElement("span");
                open.textContent = "O";
                const tone = documentRef.createElement("strong");
                tone.textContent = string.tone?.label || "";
                tone.dataset.toneOrder = String(string.tone?.order ?? 99);
                tone.dataset.toneFamily = string.tone?.family || "other";
                item.append(open, tone);
            }
            status.appendChild(item);
        });
        const neck = documentRef.createElement("div");
        neck.className = "diagram-neck";
        const base = documentRef.createElement("span");
        base.className = "diagram-base-fret";
        base.textContent = model.baseFret > 1 ? String(model.baseFret) : "";
        neck.appendChild(base);
        model.strings.forEach(function(string, index) {
            const line = documentRef.createElement("i");
            line.className = "diagram-string-line";
            line.style.left = `${index * 20}%`;
            line.setAttribute("aria-hidden", "true");
            neck.appendChild(line);
        });
        for (let index = 0; index <= DIAGRAM_FRET_ROWS; index += 1) {
            const line = documentRef.createElement("i");
            line.className = `diagram-fret-line${index === 0 && model.baseFret === 1 ? " is-nut" : ""}`;
            line.style.top = `${index * (100 / DIAGRAM_FRET_ROWS)}%`;
            line.setAttribute("aria-hidden", "true");
            neck.appendChild(line);
        }
        model.strings.forEach(function(string, index) {
            if (string.fret <= 0) return;
            const row = string.fret - model.baseFret;
            if (row < 0 || row >= DIAGRAM_FRET_ROWS) return;
            const marker = documentRef.createElement("span");
            marker.className = `diagram-finger${string.tone?.isRoot ? " is-root" : ""}`;
            marker.dataset.toneOrder = String(string.tone?.order ?? 99);
            marker.dataset.toneFamily = string.tone?.family || "other";
            marker.style.left = `${index * 20}%`;
            marker.style.top = `${(row + 0.5) * (100 / DIAGRAM_FRET_ROWS)}%`;
            marker.textContent = string.tone?.label || "";
            marker.setAttribute("aria-hidden", "true");
            neck.appendChild(marker);
        });
        const names = documentRef.createElement("div");
        names.className = "diagram-string-names";
        model.strings.forEach(function(string) {
            const item = documentRef.createElement("span");
            item.textContent = string.name;
            names.appendChild(item);
        });
        host.append(status, neck, names);
        return host;
    }

    function createDiagramElement(parsed, voicing, documentRef) {
        const documentObject = documentRef || (typeof document !== "undefined" ? document : null);
        if (!documentObject) return null;
        const host = documentObject.createElement("div");
        host.className = "chord-diagram";
        host.setAttribute("aria-label", `${parsed.symbol} guitar chord shape`);
        return appendDiagramContents(host, parsed, voicing, documentObject);
    }

    function diagramMarkup(parsed, voicing) {
        const model = diagramModel(parsed, voicing);
        if (!model) return "";
        const status = model.strings.map(function(string) {
            if (string.fret < 0) return '<span class="diagram-string-status is-muted">X</span>';
            if (string.fret !== 0) return '<span class="diagram-string-status"></span>';
            const tone = string.tone;
            return `<span class="diagram-string-status is-open${tone?.isRoot ? " is-root" : ""}"><span>O</span><strong data-tone-order="${tone?.order ?? 99}" data-tone-family="${tone?.family || "other"}">${escapeHtml(tone?.label || "")}</strong></span>`;
        }).join("");
        const stringLines = model.strings.map(function(_, index) { return `<i class="diagram-string-line" style="left:${index * 20}%" aria-hidden="true"></i>`; }).join("");
        const fretLines = Array.from({ length: DIAGRAM_FRET_ROWS + 1 }, function(_, index) { return `<i class="diagram-fret-line${index === 0 && model.baseFret === 1 ? " is-nut" : ""}" style="top:${index * (100 / DIAGRAM_FRET_ROWS)}%" aria-hidden="true"></i>`; }).join("");
        const markers = model.strings.map(function(string, index) {
            if (string.fret <= 0) return "";
            const row = string.fret - model.baseFret;
            if (row < 0 || row >= DIAGRAM_FRET_ROWS) return "";
            const tone = string.tone;
            return `<span class="diagram-finger${tone?.isRoot ? " is-root" : ""}" data-tone-order="${tone?.order ?? 99}" data-tone-family="${tone?.family || "other"}" style="left:${index * 20}%;top:${(row + 0.5) * (100 / DIAGRAM_FRET_ROWS)}%" aria-hidden="true">${escapeHtml(tone?.label || "")}</span>`;
        }).join("");
        return `<div class="chord-diagram" aria-label="${escapeHtml(model.symbol)} guitar chord shape"><div class="diagram-status-row">${status}</div><div class="diagram-neck"><span class="diagram-base-fret">${model.baseFret > 1 ? model.baseFret : ""}</span>${stringLines}${fretLines}${markers}</div><div class="diagram-string-names">${model.strings.map(function(string) { return `<span>${escapeHtml(string.name)}</span>`; }).join("")}</div></div>`;
    }

    function renderProgressionDiagram(parsed, voicing, index, total, options) {
        const settings = options || {};
        const labels = settings.labels || {};
        const shapeLabel = labels.shape || "Shape";
        const useShapeLabel = labels.useShape || "Use Shape";
        const openPositionLabel = labels.openPosition || "Open / low position";
        const action = settings.action === "select"
            ? `<button class="secondary-button progression-writer-shape-button" type="button" data-select-shape-index="${settings.shapeIndex}">${escapeHtml(useShapeLabel)}</button>`
            : '<button class="secondary-button progression-writer-shape-button" type="button" data-open-shape-picker>Choose Other Shape</button>';
        const baseFret = diagramBaseFret(voicing.frets);
        const startsAtFret = labels.startsAtFret || "Starts at fret {{fret}}";
        const position = baseFret === 1 ? openPositionLabel : startsAtFret.replace("{{fret}}", String(baseFret));
        return `<article class="chord-shape-card progression-writer-shape-card${settings.variant === "picker" ? " progression-writer-shape-picker-card" : ""}"${settings.action === "select" ? ` data-select-shape-index="${settings.shapeIndex}" tabindex="0"` : ""}><div class="chord-shape-card-heading progression-writer-shape-heading"><div><span>${escapeHtml(shapeLabel)} ${index + 1}${settings.variant === "picker" ? "" : ` of ${total}`}</span><strong>${escapeHtml(parsed.symbol)}</strong><small>${escapeHtml(voicing.frets.map(function(fret) { return fret < 0 ? "x" : fret; }).join(" "))}</small></div><small>${escapeHtml(position)}</small>${action}</div>${diagramMarkup(parsed, voicing)}</article>`;
    }

    return {
        chordById,
        suffixByChordId,
        TUNING_MIDI,
        STRING_NAMES,
        DIAGRAM_FRET_ROWS,
        POSITION_TARGETS,
        parseChord,
        normalizeChord,
        chordToneForPitch,
        generateVoicings,
        nearestPositionTarget,
        rootStringLabel,
        voicingHasRootOnString,
        diagramBaseFret,
        voicingKey,
        diagramModel,
        createDiagramElement,
        diagramMarkup,
        renderProgressionDiagram
    };
});
