document.addEventListener("DOMContentLoaded", function() {
    const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const FLAT_ROOTS = new Set([3, 5, 8, 10]);
    const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
    const NATURAL_PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const TUNING_MIDI = [40, 45, 50, 55, 59, 64];
    const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
    const MAX_FRET_SPAN = 3;
    const DIAGRAM_FRET_ROWS = 4;
    const SHAPES_PER_PAGE = 12;
    const POSITION_TARGETS = [0, 3, 5, 7, 9, 12];

    const CHORD_CATEGORIES = [
        {
            id: "triads",
            name: "Triads",
            description: "Three-note foundations",
            chords: [
                { id: "major", name: "Major", suffix: "", intervals: [0, 4, 7], formula: ["1", "3", "5"], description: "The basic major triad: stable, open, and resolved." },
                { id: "minor", name: "Minor", suffix: "m", intervals: [0, 3, 7], formula: ["1", "b3", "5"], description: "A minor triad with a darker, more introspective center." },
                { id: "diminished", name: "Diminished", suffix: "dim", intervals: [0, 3, 6], formula: ["1", "b3", "b5"], description: "A tense, symmetrical triad built from two minor thirds." },
                { id: "augmented", name: "Augmented", suffix: "aug", intervals: [0, 4, 8], formula: ["1", "3", "#5"], description: "A bright, unsettled triad with a raised fifth." }
            ]
        },
        {
            id: "seventh",
            name: "Seventh Chords",
            description: "Triads with an added seventh",
            chords: [
                { id: "dominant7", name: "Dominant 7", suffix: "7", intervals: [0, 4, 7, 10], formula: ["1", "3", "5", "b7"], description: "A major triad with a flat seventh, carrying strong dominant tension." },
                { id: "major7", name: "Major 7", suffix: "maj7", intervals: [0, 4, 7, 11], formula: ["1", "3", "5", "7"], description: "A smooth major color with a warm, floating natural seventh." },
                { id: "minor7", name: "Minor 7", suffix: "m7", intervals: [0, 3, 7, 10], formula: ["1", "b3", "5", "b7"], description: "A relaxed minor sound common in soul, jazz, funk, and pop." },
                { id: "minorMajor7", name: "Minor Major 7", suffix: "m(maj7)", intervals: [0, 3, 7, 11], formula: ["1", "b3", "5", "7"], description: "A minor triad with a dramatic natural seventh." },
                { id: "diminished7", name: "Diminished 7", suffix: "dim7", intervals: [0, 3, 6, 9], formula: ["1", "b3", "b5", "bb7"], description: "A fully symmetrical diminished chord with intense movement." },
                { id: "halfDiminished7", name: "Half-Diminished 7", suffix: "m7b5", intervals: [0, 3, 6, 10], formula: ["1", "b3", "b5", "b7"], description: "A diminished triad with a minor seventh, often used in minor-key harmony." }
            ]
        },
        {
            id: "sixth-added",
            name: "Sixth & Added Tone",
            description: "Color without a dominant seventh",
            chords: [
                { id: "sixth", name: "Major 6", suffix: "6", intervals: [0, 4, 7, 9], formula: ["1", "3", "5", "6"], description: "A major triad colored by a sweet, consonant sixth." },
                { id: "minor6", name: "Minor 6", suffix: "m6", intervals: [0, 3, 7, 9], formula: ["1", "b3", "5", "6"], description: "A minor chord with a sophisticated natural sixth." },
                { id: "add9", name: "Add 9", suffix: "add9", intervals: [0, 2, 4, 7], formula: ["1", "2", "3", "5"], description: "A major triad with an added ninth and no seventh." },
                { id: "minorAdd9", name: "Minor Add 9", suffix: "m(add9)", intervals: [0, 2, 3, 7], formula: ["1", "2", "b3", "5"], description: "A minor triad with a spacious added ninth." },
                { id: "sixNine", name: "6 / 9", suffix: "6/9", intervals: [0, 2, 4, 7, 9], formula: ["1", "2", "3", "5", "6"], description: "A polished major sound combining the sixth and ninth." }
            ]
        },
        {
            id: "extended",
            name: "Extended Chords",
            description: "Ninths, elevenths, and thirteenths",
            chords: [
                { id: "ninth", name: "Dominant 9", suffix: "9", intervals: [0, 2, 4, 7, 10], formula: ["1", "3", "5", "b7", "9"], description: "A dominant seventh expanded with a colorful ninth." },
                { id: "major9", name: "Major 9", suffix: "maj9", intervals: [0, 2, 4, 7, 11], formula: ["1", "3", "5", "7", "9"], description: "A lush major seventh with an added ninth." },
                { id: "minor9", name: "Minor 9", suffix: "m9", intervals: [0, 2, 3, 7, 10], formula: ["1", "b3", "5", "b7", "9"], description: "A broad, mellow minor seventh with an added ninth." },
                { id: "eleventh", name: "Dominant 11", suffix: "11", intervals: [0, 2, 4, 5, 7, 10], formula: ["1", "3", "5", "b7", "9", "11"], description: "A dense dominant sound extending through the eleventh." },
                { id: "minor11", name: "Minor 11", suffix: "m11", intervals: [0, 2, 3, 5, 7, 10], formula: ["1", "b3", "5", "b7", "9", "11"], description: "An expansive minor sound often voiced without every chord tone." },
                { id: "thirteenth", name: "Dominant 13", suffix: "13", intervals: [0, 2, 4, 7, 9, 10], formula: ["1", "3", "5", "b7", "9", "13"], description: "A rich dominant chord whose characteristic color is the thirteenth." },
                { id: "major13", name: "Major 13", suffix: "maj13", intervals: [0, 2, 4, 7, 9, 11], formula: ["1", "3", "5", "7", "9", "13"], description: "A wide major color combining the natural seventh, ninth, and thirteenth." },
                { id: "minor13", name: "Minor 13", suffix: "m13", intervals: [0, 2, 3, 7, 9, 10], formula: ["1", "b3", "5", "b7", "9", "13"], description: "A soulful minor extension with a natural thirteenth." }
            ]
        },
        {
            id: "suspended-power",
            name: "Suspended & Power",
            description: "Open harmony and neutral thirds",
            chords: [
                { id: "sus2", name: "Suspended 2", suffix: "sus2", intervals: [0, 2, 7], formula: ["1", "2", "5"], description: "The third is replaced by the second for an open, unresolved sound." },
                { id: "sus4", name: "Suspended 4", suffix: "sus4", intervals: [0, 5, 7], formula: ["1", "4", "5"], description: "The third is replaced by the fourth, creating a classic suspension." },
                { id: "sevenSus4", name: "7 Sus 4", suffix: "7sus4", intervals: [0, 5, 7, 10], formula: ["1", "4", "5", "b7"], description: "A dominant seventh chord with the third suspended to the fourth." },
                { id: "power", name: "Power Chord", suffix: "5", intervals: [0, 7], formula: ["1", "5"], description: "Root and fifth only: direct, neutral, and ideal for distorted guitar." }
            ]
        },
        {
            id: "altered",
            name: "Altered Dominant",
            description: "Dominant tension with changed chord tones",
            chords: [
                { id: "sevenFlat5", name: "7 Flat 5", suffix: "7b5", intervals: [0, 4, 6, 10], formula: ["1", "3", "b5", "b7"], description: "A dominant seventh with a lowered fifth." },
                { id: "sevenSharp5", name: "7 Sharp 5", suffix: "7#5", intervals: [0, 4, 8, 10], formula: ["1", "3", "#5", "b7"], description: "A dominant seventh with a raised fifth." },
                { id: "sevenFlat9", name: "7 Flat 9", suffix: "7b9", intervals: [0, 1, 4, 7, 10], formula: ["1", "b9", "3", "5", "b7"], description: "A dominant seventh with a tense flat ninth." },
                { id: "sevenSharp9", name: "7 Sharp 9", suffix: "7#9", intervals: [0, 3, 4, 7, 10], formula: ["1", "#9", "3", "5", "b7"], description: "A dominant sound combining major and minor-third colors." },
                { id: "nineSus4", name: "9 Sus 4", suffix: "9sus4", intervals: [0, 2, 5, 7, 10], formula: ["1", "9", "4", "5", "b7"], description: "A dominant ninth with the third replaced by the fourth." },
                { id: "thirteenFlat9", name: "13 Flat 9", suffix: "13b9", intervals: [0, 1, 4, 7, 9, 10], formula: ["1", "b9", "3", "5", "13", "b7"], description: "A dense altered dominant combining a flat ninth and natural thirteenth." }
            ]
        }
    ];

    const ALL_CHORDS = CHORD_CATEGORIES.flatMap(category =>
        category.chords.map(chord => ({ ...chord, categoryId: category.id, categoryName: category.name }))
    );

    const rootGrid = document.getElementById("dictionaryRootGrid");
    const searchInput = document.getElementById("chordSearch");
    const categoryList = document.getElementById("chordCategoryList");
    const chordName = document.getElementById("selectedChordName");
    const chordDescription = document.getElementById("selectedChordDescription");
    const chordSymbol = document.getElementById("selectedChordSymbol");
    const chordFormula = document.getElementById("selectedChordFormula");
    const chordNotes = document.getElementById("selectedChordNotes");
    const positionFilter = document.getElementById("shapePositionFilter");
    const shapeGrid = document.getElementById("chordShapeGrid");
    const shapeCount = document.getElementById("shapeCount");
    const shapePagination = document.getElementById("shapePagination");
    const previousShapesButton = document.getElementById("previousShapesButton");
    const nextShapesButton = document.getElementById("nextShapesButton");
    const shapePageStatus = document.getElementById("shapePageStatus");
    const relatedActions = document.getElementById("dictionaryRelatedActions");
    const playButton = document.getElementById("playChordButton");

    let rootPitch = 0;
    let selectedChord = ALL_CHORDS[0];
    let selectedVoicings = [];
    let filteredVoicings = [];
    let selectedPosition = "all";
    let shapePage = 0;
    let audioContext = null;
    let isPlaying = false;

    function noteNames() {
        return FLAT_ROOTS.has(rootPitch) ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
    }

    function rootName() {
        return noteNames()[rootPitch];
    }

    function pitchFromName(noteName) {
        const normalized = String(noteName || "").trim().toLowerCase();
        const pitchMap = {
            "c": 0,
            "b#": 0,
            "c#": 1,
            "db": 1,
            "d": 2,
            "d#": 3,
            "eb": 3,
            "e": 4,
            "fb": 4,
            "e#": 5,
            "f": 5,
            "f#": 6,
            "gb": 6,
            "g": 7,
            "g#": 8,
            "ab": 8,
            "a": 9,
            "a#": 10,
            "bb": 10,
            "b": 11,
            "cb": 11
        };

        return pitchMap[normalized] ?? null;
    }

    function chordDisplayName(chord) {
        return chord.id === "major" ? `${rootName()} Major` : `${rootName()} ${chord.name}`;
    }

    function chordSymbolText(chord) {
        return `${rootName()}${chord.suffix}`;
    }

    function chordPitchClasses(chord) {
        return chord.intervals.map(interval => (rootPitch + interval) % 12);
    }

    function relatedScaleType(chord) {
        if (chord.id.includes("minor") || chord.id.includes("diminished") || chord.id === "halfDiminished7") {
            return "natural-minor";
        }

        if (chord.id.includes("dominant") || chord.id === "thirteenth" || chord.id === "nine" || chord.id === "eleven") {
            return "mixolydian";
        }

        return "major";
    }

    function relatedKeyMode(chord) {
        return relatedScaleType(chord) === "natural-minor" ? "minor" : "major";
    }

    function spellChordTone(pitch, formula, index) {
        if (index === 0) {
            return rootName();
        }

        const degreeMatch = formula.match(/\d+/);
        if (!degreeMatch) {
            return noteNames()[pitch];
        }

        const rootLetterIndex = LETTERS.indexOf(rootName()[0]);
        const degree = Number(degreeMatch[0]);
        const diatonicSteps = (degree - 1) % 7;
        const targetLetter = LETTERS[(rootLetterIndex + diatonicSteps) % 7];
        const naturalPitch = NATURAL_PITCHES[targetLetter];
        let accidentalDistance = (pitch - naturalPitch + 12) % 12;

        if (accidentalDistance > 6) {
            accidentalDistance -= 12;
        }

        if (Math.abs(accidentalDistance) > 1) {
            return noteNames()[pitch];
        }

        if (accidentalDistance > 0) {
            return `${targetLetter}${"#".repeat(accidentalDistance)}`;
        }
        if (accidentalDistance < 0) {
            return `${targetLetter}${"b".repeat(Math.abs(accidentalDistance))}`;
        }
        return targetLetter;
    }

    function chordNoteNames(chord) {
        return chordPitchClasses(chord).map((pitch, index) =>
            spellChordTone(pitch, chord.formula[index], index)
        );
    }

    function updatePressedState(container, selectedButton) {
        container.querySelectorAll("button").forEach(button => {
            const isSelected = button === selectedButton;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
        });
    }

    function renderCategories() {
        const query = searchInput.value.trim().toLowerCase();
        categoryList.innerHTML = "";
        let visibleChordCount = 0;

        CHORD_CATEGORIES.forEach(category => {
            const matches = category.chords.filter(chord => {
                if (!query) {
                    return true;
                }
                return [
                    chord.name,
                    chord.suffix,
                    chord.formula.join(" "),
                    chord.description
                ].join(" ").toLowerCase().includes(query);
            });

            if (!matches.length) {
                return;
            }

            visibleChordCount += matches.length;
            const section = document.createElement("section");
            section.className = "dictionary-category";
            section.innerHTML = `
                <div class="dictionary-category-heading">
                    <div>
                        <h3>${category.name}</h3>
                        <p>${category.description}</p>
                    </div>
                    <span>${matches.length}</span>
                </div>
                <div class="dictionary-quality-grid"></div>
            `;

            const grid = section.querySelector(".dictionary-quality-grid");
            matches.forEach(chord => {
                const button = document.createElement("button");
                const isSelected = chord.id === selectedChord.id;
                button.type = "button";
                button.dataset.chordId = chord.id;
                button.className = "dictionary-quality-button";
                button.classList.toggle("is-selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
                button.innerHTML = `
                    <strong>${chord.name}</strong>
                    <span>${rootName()}${chord.suffix || " major"}</span>
                `;
                grid.appendChild(button);
            });

            categoryList.appendChild(section);
        });

        if (!visibleChordCount) {
            categoryList.innerHTML = `
                <div class="dictionary-empty">
                    <strong>No chord types found.</strong>
                    <span>Try a broader term such as seventh, minor, suspended, or altered.</span>
                </div>
            `;
        }
    }

    function stringOptionsForWindow(chordPitches, startFret, endFret) {
        return TUNING_MIDI.map(openMidi => {
            const options = [-1];
            if (startFret === 0 && chordPitches.includes(openMidi % 12)) {
                options.push(0);
            }
            const firstFret = Math.max(1, startFret);
            for (let fret = firstFret; fret <= endFret; fret += 1) {
                if (chordPitches.includes((openMidi + fret) % 12)) {
                    options.push(fret);
                }
            }
            return options;
        });
    }

    function scoreVoicing(frets, chord) {
        const sounding = frets
            .map((fret, index) => ({ fret, index }))
            .filter(item => item.fret >= 0);

        if (sounding.length < 3) {
            return null;
        }

        const firstString = sounding[0].index;
        const lastString = sounding[sounding.length - 1].index;
        for (let stringIndex = firstString; stringIndex <= lastString; stringIndex += 1) {
            if (frets[stringIndex] < 0) {
                return null;
            }
        }

        const pitches = sounding.map(item => (TUNING_MIDI[item.index] + item.fret) % 12);
        const uniquePitches = new Set(pitches);
        const targetPitches = chordPitchClasses(chord);
        const root = rootPitch;
        const coverage = targetPitches.filter(pitch => uniquePitches.has(pitch)).length;
        const requiredCoverage = Math.min(targetPitches.length, 4);

        if (!uniquePitches.has(root) || coverage < requiredCoverage) {
            return null;
        }

        const fretted = sounding.map(item => item.fret).filter(fret => fret > 0);
        const minimumFret = fretted.length ? Math.min(...fretted) : 0;
        const maximumFret = fretted.length ? Math.max(...fretted) : 0;
        const span = maximumFret - minimumFret;

        if (span > MAX_FRET_SPAN) {
            return null;
        }

        const bassPitch = pitches[0];
        const rootInBass = bassPitch === root;
        const openStrings = sounding.filter(item => item.fret === 0).length;
        const mutedStrings = 6 - sounding.length;
        const repeatedNotes = sounding.length - uniquePitches.size;
        const averageFret = fretted.length
            ? fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length
            : 0;

        return (
            coverage * 24
            + (coverage === targetPitches.length ? 18 : 0)
            + (rootInBass ? 22 : 0)
            + sounding.length * 3
            + openStrings * 4
            - span * 4
            - averageFret * 0.8
            - mutedStrings * 2
            - repeatedNotes
        );
    }

    function generateVoicings(chord) {
        const chordPitches = chordPitchClasses(chord);
        const windows = Array.from(
            { length: POSITION_TARGETS[POSITION_TARGETS.length - 1] + 1 },
            (_, startFret) => [startFret, startFret + MAX_FRET_SPAN]
        );
        const candidates = [];
        const seen = new Set();

        windows.forEach(([startFret, endFret]) => {
            const options = stringOptionsForWindow(chordPitches, startFret, endFret);
            const current = Array(6).fill(-1);

            function search(stringIndex) {
                if (stringIndex === 6) {
                    const key = current.join(",");
                    if (seen.has(key)) {
                        return;
                    }
                    seen.add(key);
                    const score = scoreVoicing(current, chord);
                    if (score !== null) {
                        candidates.push({ frets: [...current], score });
                    }
                    return;
                }

                options[stringIndex].forEach(fret => {
                    current[stringIndex] = fret;
                    search(stringIndex + 1);
                });
            }

            search(0);
        });

        candidates.sort((a, b) => b.score - a.score);
        return candidates;
    }

    function voicingPosition(frets) {
        if (frets.includes(0)) {
            return 0;
        }
        const positiveFrets = frets.filter(fret => fret > 0);
        return positiveFrets.length ? Math.min(...positiveFrets) : 0;
    }

    function nearestPositionTarget(frets) {
        const position = voicingPosition(frets);
        return POSITION_TARGETS.reduce((closest, target) =>
            Math.abs(target - position) < Math.abs(closest - position) ? target : closest
        , POSITION_TARGETS[0]);
    }

    function diagramBaseFret(frets) {
        const positiveFrets = frets.filter(fret => fret > 0);
        if (!positiveFrets.length || Math.max(...positiveFrets) <= DIAGRAM_FRET_ROWS) {
            return 1;
        }
        return Math.min(...positiveFrets);
    }

    function renderDiagram(voicing, index) {
        const baseFret = diagramBaseFret(voicing.frets);
        const statusRow = voicing.frets.map(fret => {
            if (fret < 0) {
                return "<span>X</span>";
            }
            if (fret === 0) {
                return "<span>O</span>";
            }
            return "<span></span>";
        }).join("");

        const stringLines = STRING_NAMES.map((name, stringIndex) =>
            `<i class="diagram-string-line" style="left:${stringIndex * 20}%" aria-hidden="true"></i>`
        ).join("");

        const fretLines = Array.from({ length: DIAGRAM_FRET_ROWS + 1 }, (_, fretLine) =>
            `<i class="diagram-fret-line${fretLine === 0 && baseFret === 1 ? " is-nut" : ""}" style="top:${fretLine * (100 / DIAGRAM_FRET_ROWS)}%" aria-hidden="true"></i>`
        ).join("");

        const markers = voicing.frets.map((fret, stringIndex) => {
            if (fret <= 0) {
                return "";
            }
            const row = fret - baseFret;
            if (row < 0 || row >= DIAGRAM_FRET_ROWS) {
                return "";
            }
            return `
                <span
                    class="diagram-finger"
                    style="left:${stringIndex * 20}%;top:${(row + 0.5) * (100 / DIAGRAM_FRET_ROWS)}%"
                    aria-hidden="true"
                ></span>
            `;
        }).join("");

        return `
            <article class="chord-shape-card">
                <div class="chord-shape-card-heading">
                    <div>
                        <span>Shape ${index + 1}</span>
                        <strong>${voicing.frets.map(fret => fret < 0 ? "x" : fret).join(" ")}</strong>
                    </div>
                    <small>${baseFret === 1 ? "Open / low position" : `Starts at fret ${baseFret}`}</small>
                </div>
                <div class="chord-diagram" aria-label="${chordSymbolText(selectedChord)} guitar shape ${index + 1}: ${voicing.frets.join(", ")}">
                    <div class="diagram-status-row">${statusRow}</div>
                    <div class="diagram-neck">
                        <span class="diagram-base-fret">${baseFret > 1 ? baseFret : ""}</span>
                        ${stringLines}
                        ${fretLines}
                        ${markers}
                    </div>
                    <div class="diagram-string-names">${STRING_NAMES.map(name => `<span>${name}</span>`).join("")}</div>
                </div>
            </article>
        `;
    }

    function renderShapeResults() {
        const pageCount = Math.ceil(filteredVoicings.length / SHAPES_PER_PAGE);
        const startIndex = shapePage * SHAPES_PER_PAGE;
        const visibleVoicings = filteredVoicings.slice(startIndex, startIndex + SHAPES_PER_PAGE);
        shapeGrid.innerHTML = visibleVoicings
            .map((voicing, index) => renderDiagram(voicing, startIndex + index))
            .join("");

        shapePagination.hidden = pageCount <= 1;
        previousShapesButton.disabled = shapePage === 0;
        nextShapesButton.disabled = shapePage >= pageCount - 1;
        shapePageStatus.textContent = `Page ${shapePage + 1} of ${pageCount}`;
    }

    function applyShapeFilter() {
        filteredVoicings = selectedPosition === "all"
            ? selectedVoicings
            : selectedVoicings.filter(voicing =>
                nearestPositionTarget(voicing.frets) === Number(selectedPosition)
            );
        shapePage = 0;

        const positionLabel = selectedPosition === "all"
            ? "all positions"
            : `near fret ${selectedPosition}`;
        shapeCount.textContent = selectedPosition === "all"
            ? `${filteredVoicings.length} ${filteredVoicings.length === 1 ? "shape" : "shapes"} found`
            : `${filteredVoicings.length} of ${selectedVoicings.length} near fret ${selectedPosition}`;

        if (!filteredVoicings.length) {
            shapePagination.hidden = true;
            shapeGrid.innerHTML = `
                <div class="dictionary-empty">
                    <strong>No shapes found ${positionLabel}.</strong>
                    <span>Choose another fret area or select All positions.</span>
                </div>
            `;
            return;
        }

        renderShapeResults();
    }

    function renderSelectedChord() {
        chordName.textContent = chordDisplayName(selectedChord);
        chordDescription.textContent = selectedChord.description;
        chordSymbol.textContent = chordSymbolText(selectedChord);
        chordFormula.textContent = selectedChord.formula.join(" · ");
        chordNotes.textContent = chordNoteNames(selectedChord).join(" · ");

        if (relatedActions) {
            const root = encodeURIComponent(rootName());
            const scaleType = relatedScaleType(selectedChord);
            const key = encodeURIComponent(`${rootName()} ${relatedKeyMode(selectedChord)}`);

            relatedActions.innerHTML = `
                <a href="scale.html?root=${root}&type=${scaleType}">View matching scale</a>
                <a href="chords.html?key=${key}">Build progressions from this root</a>
                <a href="fretboard-trainer.html">Practice fretboard notes</a>
            `;
        }

        selectedVoicings = generateVoicings(selectedChord);

        if (!selectedVoicings.length) {
            filteredVoicings = [];
            shapePagination.hidden = true;
            shapeCount.textContent = "No shapes found";
            shapeGrid.innerHTML = `
                <div class="dictionary-empty">
                    <strong>No compact six-string shape was found.</strong>
                    <span>Complex extended chords often omit notes. Try a related voicing or another root.</span>
                </div>
            `;
        } else {
            applyShapeFilter();
        }
    }

    function render() {
        renderCategories();
        renderSelectedChord();
    }

    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    async function playSelectedChord() {
        if (isPlaying || !filteredVoicings.length) {
            return;
        }

        const context = getAudioContext();
        if (context.state === "suspended") {
            await context.resume();
        }

        isPlaying = true;
        playButton.disabled = true;
        playButton.lastChild.textContent = " Playing";
        const startTime = context.currentTime + 0.04;
        const frets = filteredVoicings[0].frets;

        frets.forEach((fret, stringIndex) => {
            if (fret < 0) {
                return;
            }
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const noteStart = startTime + stringIndex * 0.035;
            const midi = TUNING_MIDI[stringIndex] + fret;
            const frequency = 440 * Math.pow(2, (midi - 69) / 12);

            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(frequency, noteStart);
            gain.gain.setValueAtTime(0.0001, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.11, noteStart + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.05);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteStart + 1.1);
        });

        window.setTimeout(() => {
            isPlaying = false;
            playButton.disabled = false;
            playButton.lastChild.textContent = " Play chord";
        }, 1400);
    }

    rootGrid.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-root]");
        if (!button) {
            return;
        }
        rootPitch = Number(button.dataset.root);
        updatePressedState(rootGrid, button);
        render();
    });

    categoryList.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-chord-id]");
        if (!button) {
            return;
        }
        const chord = ALL_CHORDS.find(item => item.id === button.dataset.chordId);
        if (!chord) {
            return;
        }
        selectedChord = chord;
        render();
        document.querySelector(".dictionary-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    searchInput.addEventListener("input", renderCategories);
    positionFilter.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-position]");
        if (!button) {
            return;
        }
        selectedPosition = button.dataset.position;
        updatePressedState(positionFilter, button);
        applyShapeFilter();
    });
    playButton.addEventListener("click", playSelectedChord);
    previousShapesButton.addEventListener("click", function() {
        shapePage = Math.max(0, shapePage - 1);
        renderShapeResults();
        shapeGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nextShapesButton.addEventListener("click", function() {
        const pageCount = Math.ceil(filteredVoicings.length / SHAPES_PER_PAGE);
        shapePage = Math.min(pageCount - 1, shapePage + 1);
        renderShapeResults();
        shapeGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    function applyInitialParams() {
        const params = new URLSearchParams(window.location.search);
        const requestedRoot = params.get("root");
        const requestedChord = params.get("chord");

        if (requestedRoot) {
            const pitch = pitchFromName(requestedRoot);
            if (pitch !== null) {
                rootPitch = pitch;
            }
        }

        if (requestedChord) {
            const normalizedChord = requestedChord.trim().toLowerCase();
            const chord = ALL_CHORDS.find(item =>
                item.id.toLowerCase() === normalizedChord ||
                item.suffix.toLowerCase() === normalizedChord ||
                item.name.toLowerCase().replace(/\s+/g, "-") === normalizedChord
            );

            if (chord) {
                selectedChord = chord;
            }
        }

        const rootButton = rootGrid.querySelector(`button[data-root="${rootPitch}"]`);
        if (rootButton) {
            updatePressedState(rootGrid, rootButton);
        }
    }

    applyInitialParams();
    render();
});
