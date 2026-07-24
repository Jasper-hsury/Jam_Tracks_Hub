document.addEventListener("DOMContentLoaded", function() {
    const SAVED_PROGRESSIONS_KEY = "jasperMusicSavedProgressions";
    const keyButtons = document.querySelectorAll(".key-button");
    const keyResult = document.getElementById("keyResult");
    const keyOptions = document.getElementById("keyOptions");
    const selectKeyButton = document.getElementById("selectKeyButton");
    const keyModeToggle = document.getElementById("keyModeToggle");

    let audioContext = null;
    let audioOutput = null;
    let scheduledNodes = [];
    let playbackTimers = [];
    let playbackSessionId = 0;
    let guitarSampleBuffer = null;
    let guitarSampleBuffers = [];
    let guitarSamplePromise = null;
    let guitarSampleFailed = false;
    let guitarStrokeCount = 0;
    let noiseBuffer = null;
    let selectedKeyButton = null;
    let currentChordExtension = "triads";
    let currentKeyMode = "major";

    if (!keyButtons.length || !keyResult || !keyOptions || !selectKeyButton) {
        return;
    }

    const majorIntervals = [
        "Root",
        "Major second",
        "Major third",
        "Perfect fourth",
        "Perfect fifth",
        "Major sixth",
        "Major seventh"
    ];

    const minorIntervals = [
        "Root",
        "Major second",
        "Minor third",
        "Perfect fourth",
        "Perfect fifth",
        "Minor sixth",
        "Minor seventh"
    ];

    const majorProgressions = [
        {
            numerals: ["I", "V", "vi", "IV"],
            style: "Pop / Rock / Worship",
            category: "Pop staples",
            description: "A direct four-chord loop for modern songs and big choruses."
        },
        {
            numerals: ["vi", "IV", "I", "V"],
            style: "Emotional Pop",
            category: "Pop staples",
            description: "Starts on the relative minor for a more wistful version of the pop loop."
        },
        {
            numerals: ["I", "vi", "IV", "V"],
            style: "50s Progression / Ballad",
            category: "Pop staples",
            description: "Classic circular movement for ballads, oldies, and gentle songwriting."
        },
        {
            numerals: ["I", "IV", "V", "I"],
            style: "Classic / Folk Foundation",
            category: "Songwriting basics",
            description: "The plain-language foundation for folk, rock, country, and simple melodies."
        },
        {
            numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"],
            style: "12 Bar Blues",
            category: "12 bar blues",
            description: "Twelve-bar form with the turnaround on the last bar."
        },
        {
            numerals: ["ii", "V", "I"],
            style: "Jazz / Smooth Turnaround",
            category: "Jazz essentials",
            description: "The core jazz cadence. Aim melodic lines toward the third and seventh of each chord."
        },
        {
            numerals: ["I", "vi", "ii", "V"],
            style: "Jazz / Pop Turnaround",
            category: "Jazz essentials",
            description: "A warm loop that can sound old-school, jazz-pop, or city-pop."
        },
        {
            numerals: ["I", "iii", "vi", "ii", "V"],
            style: "Neo Soul / Jazz",
            category: "Neo soul / jazz colors",
            description: "A smooth chain of diatonic movement that works well with seventh chords."
        },
        {
            numerals: ["IV", "iii", "vi", "ii", "V", "I"],
            style: "Neo Soul / R&B Resolution",
            category: "Neo soul / jazz colors",
            description: "Starts away from home, then gradually pulls the harmony back to I."
        }
    ];

    const minorProgressions = [
        {
            numerals: ["i", "VI", "III", "VII"],
            style: "Emotional / Pop Rock",
            category: "Minor pop staples",
            description: "A strong minor-key loop for emotional rock, pop, and cinematic writing."
        },
        {
            numerals: ["i", "VII", "VI", "VII"],
            style: "Rock / Dramatic",
            category: "Minor pop staples",
            description: "A descending minor color with a lift back into the loop."
        },
        {
            numerals: ["i", "iv", "VII", "III"],
            style: "Dark Pop / Cinematic",
            category: "Minor pop staples",
            description: "Keeps the home chord dark, then opens up through the relative major area."
        },
        {
            numerals: ["i", "iv", "v", "i"],
            style: "Natural Minor / Traditional",
            category: "Songwriting basics",
            description: "A plain natural-minor movement with no raised leading tone."
        },
        {
            numerals: ["i", "i", "i", "i", "iv", "iv", "i", "i", "V", "iv", "i", "V"],
            style: "Minor 12 Bar Blues",
            category: "12 bar blues",
            description: "Minor blues form with a dominant V turnaround for stronger pull."
        },
        {
            numerals: ["iiø", "V", "i"],
            style: "Minor Jazz Cadence",
            category: "Jazz essentials",
            description: "The minor-key version of ii - V - I, with a half-diminished ii chord."
        },
        {
            numerals: ["i", "VI", "iiø", "V"],
            style: "Minor Jazz Turnaround",
            category: "Jazz essentials",
            description: "A compact minor loop that moves from stable minor color into dominant tension."
        },
        {
            numerals: ["i", "iv", "VII", "III", "VI", "iiø", "V", "i"],
            style: "Neo Soul / Jazz Minor",
            category: "Neo soul / jazz colors",
            description: "A longer minor path with a clear jazz cadence at the end."
        },
        {
            numerals: ["i", "VI", "iv", "V"],
            style: "Harmonic Minor Flavor",
            category: "Neo soul / jazz colors",
            description: "The major V adds a raised leading tone and a stronger pull back to i."
        }
    ];

    const pitchClasses = {
        C: 0,
        "C#": 1,
        Db: 1,
        D: 2,
        "D#": 3,
        Eb: 3,
        E: 4,
        Fb: 4,
        "E#": 5,
        F: 5,
        "F#": 6,
        Gb: 6,
        G: 7,
        "G#": 8,
        Ab: 8,
        A: 9,
        "A#": 10,
        Bb: 10,
        B: 11,
        Cb: 11
    };

    function buildMajorDiatonicChords(notes, useSevenths) {
        if (useSevenths) {
            return {
                I: `${notes[0]}maj7`,
                ii: `${notes[1]}m7`,
                iii: `${notes[2]}m7`,
                IV: `${notes[3]}maj7`,
                V: `${notes[4]}7`,
                vi: `${notes[5]}m7`,
                vii: `${notes[6]}m7b5`
            };
        }

        return {
            I: notes[0],
            ii: `${notes[1]}m`,
            iii: `${notes[2]}m`,
            IV: notes[3],
            V: notes[4],
            vi: `${notes[5]}m`,
            vii: `${notes[6]}dim`
        };
    }

    function buildMinorDiatonicChords(notes, useSevenths) {
        if (useSevenths) {
            return {
                i: `${notes[0]}m7`,
                "iiø": `${notes[1]}m7b5`,
                iidim: `${notes[1]}m7b5`,
                III: `${notes[2]}maj7`,
                iv: `${notes[3]}m7`,
                v: `${notes[4]}m7`,
                V: `${notes[4]}7`,
                VI: `${notes[5]}maj7`,
                VII: `${notes[6]}7`
            };
        }

        return {
            i: `${notes[0]}m`,
            "iiø": `${notes[1]}dim`,
            iidim: `${notes[1]}dim`,
            III: notes[2],
            iv: `${notes[3]}m`,
            v: `${notes[4]}m`,
            V: notes[4],
            VI: notes[5],
            VII: notes[6]
        };
    }

    function encodeChords(chords) {
        return encodeURIComponent(JSON.stringify(chords));
    }
    function uniqueItems(items) {
        return Array.from(new Set(items.filter(Boolean)));
    }

    function parseChordForDictionary(chordName) {
        const match = String(chordName || "").match(/^([A-G](?:#|b)?)(m7b5|maj7|m7|dim|m|7)?$/);

        if (!match) {
            return null;
        }

        const qualityMap = {
            "": "major",
            m: "minor",
            7: "dominant7",
            maj7: "major7",
            m7: "minor7",
            dim: "diminished",
            m7b5: "halfDiminished7"
        };
        const suffix = match[2] || "";

        return {
            root: match[1],
            chord: qualityMap[suffix] || "major"
        };
    }

    function chordDictionaryUrl(chordName) {
        const parsed = parseChordForDictionary(chordName);

        if (!parsed) {
            return "chord-dictionary.html";
        }

        return `chord-dictionary.html?root=${encodeURIComponent(parsed.root)}&chord=${encodeURIComponent(parsed.chord)}`;
    }

    const progressionGuitarTuning = [40, 45, 50, 55, 59, 64];
    const progressionStringNames = ["E", "A", "D", "G", "B", "e"];
    const progressionVoicingCache = new Map();

    function escapeProgressionHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, function(char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function positiveModulo(value, modulo) {
        return ((value % modulo) + modulo) % modulo;
    }

    function parseChordForVoicing(chordName) {
        const match = String(chordName || "").match(/^([A-G](?:#|b)?)(m7b5|maj7|m7|dim|m|7)?$/);

        if (!match || pitchClasses[match[1]] === undefined) {
            return null;
        }

        const qualityMap = {
            "": { label: "major", intervals: [0, 4, 7] },
            m: { label: "minor", intervals: [0, 3, 7] },
            dim: { label: "diminished", intervals: [0, 3, 6] },
            7: { label: "dominant 7", intervals: [0, 4, 7, 10] },
            maj7: { label: "major 7", intervals: [0, 4, 7, 11] },
            m7: { label: "minor 7", intervals: [0, 3, 7, 10] },
            m7b5: { label: "half-diminished 7", intervals: [0, 3, 6, 10] }
        };
        const quality = qualityMap[match[2] || ""] || qualityMap[""];

        return {
            root: match[1],
            rootPc: pitchClasses[match[1]],
            quality: quality.label,
            intervals: quality.intervals
        };
    }

    function chordToneForPitch(pitchClass, parsed) {
        const interval = positiveModulo(pitchClass - parsed.rootPc, 12);

        if (!parsed.intervals.includes(interval)) {
            return null;
        }

        const labels = { 0: "R", 3: "b3", 4: "3", 6: "b5", 7: "5", 8: "#5", 10: "b7", 11: "7" };
        const family = interval === 0
            ? "root"
            : (interval === 3 || interval === 4)
                ? "third"
                : (interval === 6 || interval === 7 || interval === 8)
                    ? "fifth"
                    : (interval === 10 || interval === 11)
                        ? "seventh"
                        : "extension";

        return {
            label: labels[interval] || String(interval),
            family,
            interval
        };
    }

    function buildStringOptions(parsed, stringIndex) {
        const options = [];

        for (let fret = 0; fret <= 12; fret += 1) {
            const pitch = positiveModulo(progressionGuitarTuning[stringIndex] + fret, 12);
            const tone = chordToneForPitch(pitch, parsed);

            if (tone) {
                options.push({ fret, tone, pitch });
            }
        }

        return options;
    }

    function getVoicingSpan(values) {
        const fretted = values
            .filter(function(value) { return value && typeof value.fret === "number" && value.fret > 0; })
            .map(function(value) { return value.fret; });

        if (!fretted.length) {
            return 0;
        }

        return Math.max(...fretted) - Math.min(...fretted);
    }

    function buildRootPositionVoicing(chordName) {
        const cacheKey = String(chordName || "");

        if (progressionVoicingCache.has(cacheKey)) {
            return progressionVoicingCache.get(cacheKey);
        }

        const parsed = parseChordForVoicing(chordName);

        if (!parsed) {
            progressionVoicingCache.set(cacheKey, null);
            return null;
        }

        let best = null;
        progressionGuitarTuning.forEach(function(_openPitch, rootString) {
            const rootChoices = buildStringOptions(parsed, rootString).filter(function(option) {
                return option.tone && option.tone.label === "R";
            });

            rootChoices.forEach(function(rootChoice) {
                const voicing = Array.from({ length: 6 }, function() {
                    return { fret: "x", tone: null, pitch: null };
                });
                voicing[rootString] = rootChoice;

                for (let stringIndex = rootString + 1; stringIndex < 6; stringIndex += 1) {
                    const currentIntervals = new Set(voicing
                        .filter(function(value) { return value && value.tone; })
                        .map(function(value) { return value.tone.interval; }));
                    const choices = buildStringOptions(parsed, stringIndex);
                    let bestOption = { fret: "x", tone: null, pitch: null };
                    let bestOptionScore = -Infinity;

                    choices.forEach(function(option) {
                        const candidate = voicing.slice();
                        candidate[stringIndex] = option;
                        const span = getVoicingSpan(candidate);

                        if (span > 4) {
                            return;
                        }

                        if (!option.tone) {
                            const score = -10 + stringIndex * 0.2;

                            if (score > bestOptionScore) {
                                bestOptionScore = score;
                                bestOption = option;
                            }

                            return;
                        }

                        const distance = option.fret === 0 ? 0 : Math.abs(option.fret - rootChoice.fret);
                        const coverageBonus = currentIntervals.has(option.tone.interval) ? 0 : 28;
                        const openBonus = option.fret === 0 ? 6 : 0;
                        const rootBonus = option.tone.label === "R" ? 3 : 0;
                        const highStringBonus = stringIndex * 0.4;
                        const score = coverageBonus + openBonus + rootBonus + highStringBonus - distance;

                        if (score > bestOptionScore) {
                            bestOptionScore = score;
                            bestOption = option;
                        }
                    });

                    voicing[stringIndex] = bestOption;
                }

                const sounding = voicing.filter(function(value) { return value && value.tone; });
                const intervals = new Set(sounding.map(function(value) { return value.tone.interval; }));
                const coversRequired = parsed.intervals.every(function(interval) { return intervals.has(interval); });
                const lowest = sounding[0];

                if (!coversRequired || !lowest || lowest.tone.label !== "R" || sounding.length < Math.min(parsed.intervals.length, 4)) {
                    return;
                }

                const span = getVoicingSpan(voicing);
                const mutedCount = voicing.filter(function(value) { return !value || value.fret === "x"; }).length;
                const fretted = voicing
                    .filter(function(value) { return value && typeof value.fret === "number" && value.fret > 0; })
                    .map(function(value) { return value.fret; });
                const baseFret = fretted.length ? Math.min(...fretted) : 1;
                const score = sounding.length * 12 - span * 6 - baseFret * 1.4 - mutedCount * 4 - rootString * 1.2 + (rootChoice.fret === 0 ? 8 : 0);

                if (!best || score > best.score) {
                    best = { chordName: cacheKey, parsed, frets: voicing, baseFret, score };
                }
            });
        });

        progressionVoicingCache.set(cacheKey, best);
        return best;
    }

    function renderProgressionChordShape(chordName) {
        const voicing = buildRootPositionVoicing(chordName);
        const safeChordName = escapeProgressionHtml(chordName);
        const dictionaryUrl = chordDictionaryUrl(chordName);

        if (!voicing) {
            return `
                <a class="progression-shape-card progression-shape-card-fallback" href="${dictionaryUrl}">
                    <strong>${safeChordName}</strong>
                    <span>Open Chord Dictionary</span>
                </a>
            `;
        }

        const fretted = voicing.frets
            .filter(function(value) { return value && typeof value.fret === "number" && value.fret > 0; })
            .map(function(value) { return value.fret; });
        const baseFret = Math.max(1, fretted.length ? Math.min(...fretted) : 1);
        const displayFrets = voicing.frets.map(function(value) {
            return value && typeof value.fret === "number" ? value.fret : "x";
        }).join(" ");
        const statusRow = voicing.frets.map(function(value) {
            if (!value || value.fret === "x") {
                return `<span aria-label="muted">x</span>`;
            }

            if (value.fret === 0) {
                return `<span class="progression-open-tone" data-tone-family="${value.tone.family}">${escapeProgressionHtml(value.tone.label)}</span>`;
            }

            return `<span></span>`;
        }).join("");
        const markers = voicing.frets.map(function(value, stringIndex) {
            if (!value || typeof value.fret !== "number" || value.fret === 0) {
                return "";
            }

            const row = value.fret - baseFret;

            if (row < 0 || row > 3) {
                return "";
            }

            const left = `${(stringIndex / 5) * 100}%`;
            const top = `${((row + 0.5) / 4) * 100}%`;

            return `
                <span class="progression-fret-marker" data-tone-family="${value.tone.family}" style="left: ${left}; top: ${top};">
                    ${escapeProgressionHtml(value.tone.label)}
                </span>
            `;
        }).join("");
        const strings = progressionStringNames.map(function(name) {
            return `<span>${name}</span>`;
        }).join("");

        return `
            <a class="progression-shape-card" href="${dictionaryUrl}" aria-label="Open ${safeChordName} in Chord Dictionary">
                <div class="progression-shape-card-head">
                    <strong>${safeChordName}</strong>
                    <span>Root pos.</span>
                </div>
                <div class="progression-shape-frets">${escapeProgressionHtml(displayFrets)}</div>
                <div class="progression-mini-diagram" aria-hidden="true">
                    <div class="progression-open-row">${statusRow}</div>
                    <span class="progression-base-fret">${baseFret}</span>
                    <div class="progression-mini-neck">
                        ${markers}
                    </div>
                    <div class="progression-string-row">${strings}</div>
                </div>
            </a>
        `;
    }

    function prefersFlatNames(notes) {
        return notes.some(function(note) { return note.includes("b"); }) && !notes.some(function(note) { return note.includes("#"); });
    }

    function pitchClassToDisplayName(pitchClass, useFlats) {
        const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
        const normalized = ((pitchClass % 12) + 12) % 12;
        return (useFlats ? flatNames : sharpNames)[normalized];
    }

    function getChordIntervalsForAdvice(quality) {
        if (quality === "dim") return [0, 3, 6];
        if (quality === "halfDiminished7") return [0, 3, 6, 10];
        if (quality === "minor") return [0, 3, 7];
        if (quality === "major7") return [0, 4, 7, 11];
        if (quality === "minor7") return [0, 3, 7, 10];
        if (quality === "dominant7") return [0, 4, 7, 10];
        return [0, 4, 7];
    }

    function getChordToneNames(chordName, keyNotes) {
        const parsed = parseChordName(chordName);
        if (!parsed) return [chordName];

        const useFlats = prefersFlatNames(keyNotes) || chordName.includes("b");
        return getChordIntervalsForAdvice(parsed.quality).map(function(interval) {
            return pitchClassToDisplayName(parsed.pitchClass + interval, useFlats);
        });
    }

    function getSuggestedScaleLabel(keyNotes, isMinor, progression) {
        const tonic = keyNotes[0];
        const numerals = progression.numerals.join("-");

        if (isMinor && progression.numerals.includes("V")) {
            return `${tonic} natural minor, with harmonic minor color on V`;
        }

        if (isMinor) {
            return `${tonic} natural minor`;
        }

        if (numerals.includes("ii-V-I")) {
            return `${tonic} major, with chord-tone focus through ii-V-I`;
        }

        return `${tonic} major`;
    }

    function getTargetNotes(keyNotes, useSevenths) {
        const degrees = useSevenths ? [0, 2, 4, 6] : [0, 2, 4];
        return degrees.map(function(degree) { return keyNotes[degree]; });
    }

    function getCarefulNoteAdvice(keyNotes, isMinor, progression) {
        if (isMinor && progression.numerals.includes("V")) {
            const dominantChord = `${keyNotes[4]}7`;
            const dominantTones = getChordToneNames(dominantChord, keyNotes);
            return `On V, lean into ${dominantTones[1]} and resolve back to ${keyNotes[0]}.`;
        }

        if (isMinor) {
            return `${keyNotes[5]} can sound bright in minor. Resolve it by ear toward ${keyNotes[4]} or ${keyNotes[0]}.`;
        }

        return `${keyNotes[3]} can rub against I. Resolve it down to ${keyNotes[2]} for a smoother phrase.`;
    }

    function getPracticeTip(keyNotes, isMinor, progression) {
        const tonic = keyNotes[0];
        const fifth = keyNotes[4];
        const hasDominant = progression.numerals.includes("V");

        if (isMinor && hasDominant) {
            return `Practice the ${tonic} minor scale, then switch to the V chord tones only when the progression reaches V.`;
        }

        return `Start with short phrases ending on ${tonic} or ${fifth}, then target each chord tone as the chord changes.`;
    }

    function buildScaleAdvice(progression, chords, keyNotes, isMinor, useSevenths) {
        return {
            scale: getSuggestedScaleLabel(keyNotes, isMinor, progression),
            targetNotes: uniqueItems(getTargetNotes(keyNotes, useSevenths)),
            carefulNote: getCarefulNoteAdvice(keyNotes, isMinor, progression),
            practiceTip: getPracticeTip(keyNotes, isMinor, progression),
            chordTones: chords.map(function(chord) {
                return {
                    chord: chord,
                    tones: uniqueItems(getChordToneNames(chord, keyNotes))
                };
            })
        };
    }

    function renderScaleAdvice(progression, chords, keyNotes, isMinor, useSevenths) {
        const advice = buildScaleAdvice(progression, chords, keyNotes, isMinor, useSevenths);

        return `
            <div class="progression-scale-advice">
                <div class="scale-advice-summary">
                    <span class="scale-advice-kicker">Scale suggestion</span>
                    <strong>${advice.scale}</strong>
                </div>
                <div class="scale-advice-grid">
                    <div>
                        <span>Target notes</span>
                        <p>${advice.targetNotes.join(" - ")}</p>
                    </div>
                    <div>
                        <span>Handle carefully</span>
                        <p>${advice.carefulNote}</p>
                    </div>
                </div>
                <details class="scale-advice-detail">
                    <summary>Chord tones</summary>
                    <div class="scale-advice-chord-list">
                        ${advice.chordTones.map(function(item) {
                            return `<span><strong>${item.chord}</strong> ${item.tones.join(" - ")}</span>`;
                        }).join("")}
                    </div>
                </details>
                <p class="scale-advice-tip">${advice.practiceTip}</p>
            </div>
        `;
    }

    function chunkProgressionItems(items, size) {
        const chunks = [];

        for (let index = 0; index < items.length; index += size) {
            chunks.push(items.slice(index, index + size));
        }

        return chunks;
    }

    function renderProgressions(progressions, chordMap) {
        const categoryOrder = uniqueItems(progressions.map(function(progression) {
            return progression.category;
        }));

        return categoryOrder.map(function(category, categoryIndex) {
            const categoryProgressions = progressions.filter(function(progression) {
                return progression.category === category;
            });
            const categoryCount = categoryProgressions.length;

            return `
                <details class="progression-voicing-category" ${categoryIndex === 0 ? "open" : ""}>
                    <summary class="progression-category-heading progression-voicing-heading">
                        <span class="progression-category-title">${escapeProgressionHtml(category)}</span>
                        <span class="progression-category-meta">
                            <strong>${categoryCount} ${categoryCount === 1 ? "progression" : "progressions"}</strong>
                        </span>
                    </summary>
                    <div class="progression-voicing-grid">
                        ${categoryProgressions.map(function(progression) {
                            const chords = progression.numerals.map(function(numeral) {
                                return chordMap[numeral] || numeral;
                            });
                            const chordGroups = chords.length > 4 ? chunkProgressionItems(chords, 4) : [chords];
                            const numeralGroups = chords.length > 4 ? chunkProgressionItems(progression.numerals, 4) : [progression.numerals];

                            return chordGroups.map(function(chordGroup, groupIndex) {
                                const numeralGroup = numeralGroups[groupIndex] || [];
                                const groupStart = groupIndex * 4 + 1;
                                const groupEnd = groupStart + chordGroup.length - 1;
                                const voicingCountClass = chordGroup.length === 4 ? " has-four-voicings" : "";
                                const renderedNumerals = numeralGroup.map(function(numeral) {
                                    return `<span class="progression-numeral-token">${escapeProgressionHtml(numeral)}</span>`;
                                }).join("");
                                const renderedChords = chordGroup.map(function(chord) {
                                    return `<span class="progression-chord-token">${escapeProgressionHtml(chord)}</span>`;
                                }).join("");
                                const renderedStyle = chordGroups.length > 1
                                    ? `${escapeProgressionHtml(progression.style)} <span class="progression-group-label">Bars ${groupStart}-${groupEnd}</span>`
                                    : escapeProgressionHtml(progression.style);

                                return `
                                <article class="progression-voicing-card${voicingCountClass}">
                                    <div class="progression-voicing-summary">
                                        <span class="progression-numerals">${renderedNumerals}</span>
                                        <span class="progression-compact-chords">${renderedChords}</span>
                                        <p class="progression-style">${renderedStyle}</p>
                                    </div>
                                    <div class="progression-chord-voicings">
                                        ${chordGroup.map(renderProgressionChordShape).join("")}
                                    </div>
                                </article>
                            `;
                            }).join("");
                        }).join("")}
                    </div>
                </details>
            `;
        }).join("");
    }

    function ensureAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        if (!audioOutput) {
            const masterGain = audioContext.createGain();
            const dryGain = audioContext.createGain();
            const wetGain = audioContext.createGain();
            const delay = audioContext.createDelay();
            const feedback = audioContext.createGain();
            const compressor = audioContext.createDynamicsCompressor();

            masterGain.gain.value = 0.9;
            dryGain.gain.value = 0.86;
            wetGain.gain.value = 0.18;
            delay.delayTime.value = 0.18;
            feedback.gain.value = 0.22;
            compressor.threshold.value = -21;
            compressor.knee.value = 18;
            compressor.ratio.value = 2.6;
            compressor.attack.value = 0.006;
            compressor.release.value = 0.18;

            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(wetGain);
            dryGain.connect(compressor);
            wetGain.connect(compressor);
            compressor.connect(masterGain);
            masterGain.connect(audioContext.destination);

            audioOutput = {
                dry: dryGain,
                delay
            };
        }

        return audioContext;
    }

    function stopPlayback() {
        playbackSessionId += 1;
        scheduledNodes.forEach(function(node) {
            try {
                node.stop();
            } catch (error) {
                // Already stopped.
            }
        });
        playbackTimers.forEach(window.clearTimeout);
        scheduledNodes = [];
        playbackTimers = [];
        document.querySelectorAll(".progression-card.is-playing").forEach(function(card) {
            card.classList.remove("is-playing");
        });
        document.querySelectorAll(".progression-card.is-current, .progression-card.is-next").forEach(function(card) {
            card.classList.remove("is-current", "is-next");
        });
        document.querySelectorAll(".progression-play-button").forEach(function(button) {
            button.textContent = "Loop";
        });
    }

    function trackScheduledNodes(...nodes) {
        nodes.forEach(function(node) {
            scheduledNodes.push(node);
            node.onended = function() {
                scheduledNodes = scheduledNodes.filter(function(scheduledNode) {
                    return scheduledNode !== node;
                });
            };
        });
    }

    function parseChordName(chordName) {
        const quality = chordName.endsWith("m7b5")
            ? "halfDiminished7"
            : chordName.endsWith("dim")
            ? "dim"
            : chordName.endsWith("maj7")
                ? "major7"
                : chordName.endsWith("m7")
                    ? "minor7"
                    : chordName.endsWith("7")
                        ? "dominant7"
                        : chordName.endsWith("m")
                            ? "minor"
                            : "major";
        const root = chordName.replace(/(m7b5|maj7|m7|7|dim|m)$/, "");
        const pitchClass = pitchClasses[root];

        if (pitchClass === undefined) {
            return null;
        }

        return { pitchClass, quality };
    }

    function midiToFrequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function getControlLevel(id, fallback) {
        const control = document.getElementById(id);
        const value = Number(control?.value ?? fallback);
        return Math.max(0, Math.min(2, value / 100));
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function getNoiseBuffer() {
        const context = ensureAudioContext();

        if (!noiseBuffer) {
            noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
            const data = noiseBuffer.getChannelData(0);

            for (let index = 0; index < data.length; index += 1) {
                data[index] = Math.random() * 2 - 1;
            }
        }

        return noiseBuffer;
    }

    function chordFrequencies(chordName) {
        const parsed = parseChordName(chordName);
        if (!parsed) {
            return [];
        }

        const intervalMap = {
            dim: [0, 3, 6],
            halfDiminished7: [0, 3, 6, 10],
            minor: [0, 3, 7],
            major: [0, 4, 7],
            major7: [0, 4, 7, 11],
            minor7: [0, 3, 7, 10],
            dominant7: [0, 4, 7, 10]
        };
        const intervals = intervalMap[parsed.quality] || intervalMap.major;
        const inversion = Math.max(0, Math.min(2, Number(document.getElementById("chordInversion")?.value || 0)));
        const voicedIntervals = intervals.map(function(interval, index) {
            return index < inversion ? interval + 12 : interval;
        }).sort(function(a, b) {
            return a - b;
        });
        const rootMidi = 48 + parsed.pitchClass;

        return voicedIntervals.map(function(interval) {
            return midiToFrequency(rootMidi + interval);
        });
    }

    function chordRootFrequency(chordName) {
        const parsed = parseChordName(chordName);
        if (!parsed) {
            return null;
        }

        return midiToFrequency(36 + parsed.pitchClass);
    }

    async function loadGuitarSample() {
        const context = ensureAudioContext();

        if (guitarSampleBuffers.length || guitarSampleFailed) {
            return guitarSampleBuffer;
        }

        if (!guitarSamplePromise) {
            const sampleFiles = [
                "samples/acoustic-guitar-sample.ogg",
                "samples/pdx-gc-guitar.wav"
            ];

            guitarSamplePromise = Promise.all(sampleFiles.map(function(sampleFile) {
                return fetch(sampleFile)
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error(`${sampleFile} not found.`);
                        }
                        return response.arrayBuffer();
                    })
                    .then(function(arrayBuffer) {
                        return context.decodeAudioData(arrayBuffer);
                    })
                    .catch(function(error) {
                        console.info("Guitar sample skipped:", error.message);
                        return null;
                    });
            }))
                .then(function(decodedBuffers) {
                    guitarSampleBuffers = decodedBuffers.filter(Boolean);
                    guitarSampleBuffer = guitarSampleBuffers[0] || null;
                    if (!guitarSampleBuffer) {
                        throw new Error("No guitar sample could be loaded.");
                    }
                    return guitarSampleBuffer;
                })
                .catch(function(error) {
                    guitarSampleFailed = true;
                    console.info("Using synthesized guitar fallback:", error.message);
                    return null;
                });
        }

        return guitarSamplePromise;
    }

    function scheduleSampledGuitarString(frequency, startTime, duration, velocity, index, direction) {
        const context = ensureAudioContext();
        const source = context.createBufferSource();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        const pan = context.createStereoPanner ? context.createStereoPanner() : null;
        const sampleBuffer = guitarSampleBuffers.length
            ? guitarSampleBuffers[Math.floor(Math.random() * guitarSampleBuffers.length)]
            : guitarSampleBuffer;
        const baseFrequency = 196;
        const guitarLevel = getControlLevel("guitarVolume", 100);
        const playbackRate = Math.max(0.55, Math.min(2.4, frequency / baseFrequency));
        const sampleOffset = Math.min(
            randomBetween(0.025, 0.11),
            Math.max(0, sampleBuffer.duration - 1.1)
        );
        const tailDuration = Math.max(0.72, Math.min(duration * randomBetween(0.92, 1.12), direction === "down" ? 1.45 : 1.08));
        const peakGain = guitarLevel * velocity * randomBetween(0.86, 1.08) * (direction === "down" ? 0.38 : 0.28);
        const tailGain = peakGain * (direction === "down" ? 0.18 : 0.12);

        source.buffer = sampleBuffer;
        source.playbackRate.setValueAtTime(playbackRate, startTime);
        if (source.detune) {
            source.detune.setValueAtTime(randomBetween(-7, 7), startTime);
        }
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(direction === "down" ? randomBetween(3900, 5200) : randomBetween(3000, 4300), startTime);
        filter.frequency.exponentialRampToValueAtTime(1750, startTime + 0.4);
        filter.Q.value = 0.65;

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(peakGain * 0.42, startTime + 0.18);
        gain.gain.exponentialRampToValueAtTime(tailGain, startTime + Math.min(0.52, tailDuration * 0.58));
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + tailDuration);

        source.connect(filter);
        filter.connect(gain);

        if (pan) {
            pan.pan.setValueAtTime((index - 1) * 0.12, startTime);
            gain.connect(pan);
            pan.connect(audioOutput.dry);
            pan.connect(audioOutput.delay);
        } else {
            gain.connect(audioOutput.dry);
            gain.connect(audioOutput.delay);
        }

        source.start(startTime, sampleOffset, Math.min(tailDuration + 0.16, sampleBuffer.duration - sampleOffset));
        source.stop(startTime + tailDuration + 0.18);
        trackScheduledNodes(source);
    }

    function scheduleGuitarStroke(frequencies, strokeTime, strokeDuration, direction, velocity) {
        const context = ensureAudioContext();
        const orderedFrequencies = direction === "up" ? [...frequencies].reverse() : frequencies;
        const strumSpread = direction === "down" ? randomBetween(0.019, 0.029) : randomBetween(0.013, 0.021);
        const strokeHumanize = randomBetween(-0.012, 0.014);
        const strokeVelocity = velocity * randomBetween(0.9, 1.08);
        guitarStrokeCount += 1;

        orderedFrequencies.forEach(function(frequency, index) {
            const stringStart = strokeTime + strokeHumanize + index * strumSpread + randomBetween(-0.003, 0.004);
            const playedFrequency = frequency * (index === orderedFrequencies.length - 1 ? 0.5 : 1);

            if (guitarSampleBuffer) {
                scheduleSampledGuitarString(playedFrequency, stringStart, strokeDuration, strokeVelocity, index, direction);
                return;
            }

            const guitarOscillator = context.createOscillator();
            const guitarGain = context.createGain();
            const guitarFilter = context.createBiquadFilter();
            const guitarLevel = getControlLevel("guitarVolume", 100);
            const peakGain = guitarLevel * strokeVelocity * (direction === "down" ? 0.12 : 0.085);

            guitarOscillator.type = "sawtooth";
            guitarOscillator.frequency.setValueAtTime(playedFrequency * 2, stringStart);
            guitarOscillator.detune.setValueAtTime(index % 2 === 0 ? -4 : 5, stringStart);
            guitarFilter.type = "lowpass";
            guitarFilter.frequency.setValueAtTime(direction === "down" ? 3400 : 2600, stringStart);
            guitarFilter.frequency.exponentialRampToValueAtTime(760, stringStart + 0.32);
            guitarFilter.Q.value = 0.9;
            guitarGain.gain.setValueAtTime(0.0001, stringStart);
            guitarGain.gain.exponentialRampToValueAtTime(peakGain, stringStart + 0.012);
            guitarGain.gain.exponentialRampToValueAtTime(peakGain * 0.22, stringStart + 0.16);
            guitarGain.gain.exponentialRampToValueAtTime(0.0001, strokeTime + strokeDuration);

            guitarOscillator.connect(guitarFilter);
            guitarFilter.connect(guitarGain);
            guitarGain.connect(audioOutput.dry);
            guitarGain.connect(audioOutput.delay);

            guitarOscillator.start(stringStart);
            guitarOscillator.stop(strokeTime + strokeDuration + 0.05);
            trackScheduledNodes(guitarOscillator);
        });
    }

    function scheduleMutedGuitarStroke(strokeTime, direction, velocity) {
        const context = ensureAudioContext();
        const source = context.createBufferSource();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        const pan = context.createStereoPanner ? context.createStereoPanner() : null;
        const guitarLevel = getControlLevel("guitarVolume", 100);
        const duration = direction === "down" ? 0.075 : 0.055;
        const peakGain = guitarLevel * velocity * (direction === "down" ? 0.11 : 0.085);

        source.buffer = getNoiseBuffer();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(direction === "down" ? 2400 : 3200, strokeTime);
        filter.Q.value = 0.9;
        gain.gain.setValueAtTime(0.0001, strokeTime);
        gain.gain.exponentialRampToValueAtTime(peakGain, strokeTime + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, strokeTime + duration);

        source.connect(filter);
        filter.connect(gain);

        if (pan) {
            pan.pan.setValueAtTime(direction === "down" ? -0.08 : 0.08, strokeTime);
            gain.connect(pan);
            pan.connect(audioOutput.dry);
            pan.connect(audioOutput.delay);
        } else {
            gain.connect(audioOutput.dry);
            gain.connect(audioOutput.delay);
        }

        source.start(strokeTime);
        source.stop(strokeTime + duration + 0.02);
        trackScheduledNodes(source);
    }

    function scheduleRhythmGuitar(chords, cycleStartTime, beatDuration, cycleIndex) {
        const rhythmPatterns = [
            [
                { direction: "down", type: "chord", velocity: 0.82 },
                { direction: "up", type: "mute", velocity: 0.18 },
                { direction: "down", type: "chord", velocity: 0.5 },
                { direction: "up", type: "chord", velocity: 0.36 },
                { direction: "down", type: "mute", velocity: 0.14 },
                { direction: "up", type: "chord", velocity: 0.35 },
                { direction: "down", type: "chord", velocity: 0.56 },
                { direction: "up", type: "chord", velocity: 0.34 }
            ],
            [
                { direction: "down", type: "chord", velocity: 0.76 },
                { direction: "up", type: "chord", velocity: 0.24 },
                { direction: "down", type: "chord", velocity: 0.48 },
                { direction: "up", type: "chord", velocity: 0.38 },
                { direction: "down", type: "mute", velocity: 0.12 },
                { direction: "up", type: "chord", velocity: 0.4 },
                { direction: "down", type: "chord", velocity: 0.58 },
                { direction: "up", type: "chord", velocity: 0.34 }
            ],
            [
                { direction: "down", type: "chord", velocity: 0.86 },
                { direction: "up", type: "mute", velocity: 0.14 },
                { direction: "down", type: "chord", velocity: 0.48 },
                { direction: "up", type: "chord", velocity: 0.34 },
                { direction: "down", type: "mute", velocity: 0.12 },
                { direction: "up", type: "chord", velocity: 0.38 },
                { direction: "down", type: "chord", velocity: 0.64 },
                { direction: "up", type: "chord", velocity: 0.42 }
            ],
            [
                { direction: "down", type: "chord", velocity: 0.72 },
                { direction: "up", type: "chord", velocity: 0.26 },
                { direction: "down", type: "chord", velocity: 0.46 },
                { direction: "up", type: "chord", velocity: 0.36 },
                { direction: "down", type: "mute", velocity: 0.13 },
                { direction: "up", type: "chord", velocity: 0.42 },
                { direction: "down", type: "chord", velocity: 0.66 },
                { direction: "up", type: "chord", velocity: 0.44 }
            ]
        ];
        const totalSteps = chords.length * 8;

        for (let step = 0; step < totalSteps; step += 1) {
            const barIndex = Math.floor(step / 8);
            const pattern = rhythmPatterns[(cycleIndex * chords.length + barIndex) % rhythmPatterns.length];
            const stroke = pattern[step % 8];
            const chordName = chords[barIndex];
            const frequencies = chordFrequencies(chordName);
            const strokeTime = cycleStartTime + step * beatDuration * 0.5;

            if (!frequencies.length) {
                continue;
            }

            if (stroke.type === "mute") {
                scheduleMutedGuitarStroke(
                    strokeTime + randomBetween(-0.006, 0.007),
                    stroke.direction,
                    stroke.velocity
                );
            } else {
                scheduleGuitarStroke(
                    frequencies,
                    strokeTime,
                    beatDuration * randomBetween(0.72, 1.05),
                    stroke.direction,
                    stroke.velocity
                );
            }
        }
    }

    function scheduleChord(chordName, startTime, duration) {
        const context = ensureAudioContext();
        const frequencies = chordFrequencies(chordName);

        frequencies.forEach(function(frequency, index) {
            const padOscillator = context.createOscillator();
            const padGain = context.createGain();
            const playedFrequency = frequency * (index === 0 ? 0.5 : 1);

            padOscillator.type = "triangle";
            padOscillator.frequency.value = playedFrequency;
            padGain.gain.setValueAtTime(0.0001, startTime);
            padGain.gain.exponentialRampToValueAtTime(guitarSampleBuffer ? 0.022 : 0.045, startTime + 0.06);
            padGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.05);

            padOscillator.connect(padGain);
            padGain.connect(audioOutput.dry);
            padGain.connect(audioOutput.delay);

            padOscillator.start(startTime);
            padOscillator.stop(startTime + duration);
            trackScheduledNodes(padOscillator);
        });
    }

    function scheduleClick(startTime, isAccent) {
        const context = ensureAudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const clickLevel = getControlLevel("metronomeVolume", 80);

        oscillator.type = "square";
        oscillator.frequency.value = isAccent ? 1300 : 850;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(clickLevel * (isAccent ? 0.28 : 0.18), startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.11);
        trackScheduledNodes(oscillator);
    }

    function scheduleBassNote(frequency, startTime, duration, velocity) {
        const context = ensureAudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        const bandLevel = getControlLevel("backingVolume", 85);
        const peakGain = bandLevel * velocity;

        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(frequency, startTime);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(520, startTime);
        filter.Q.value = 0.9;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018);
        gain.gain.exponentialRampToValueAtTime(peakGain * 0.58, startTime + duration * 0.45);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(audioOutput.dry);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.04);
        trackScheduledNodes(oscillator);
    }

    function scheduleBassLine(chordName, startTime, beatDuration) {
        const root = chordRootFrequency(chordName);
        if (!root) {
            return;
        }

        const notes = [
            { beat: 0, frequency: root, velocity: 0.13, length: 1.75 },
            { beat: 2, frequency: root, velocity: 0.09, length: 1.25 }
        ];

        notes.forEach(function(note) {
            scheduleBassNote(
                note.frequency,
                startTime + note.beat * beatDuration,
                beatDuration * note.length,
                note.velocity
            );
        });
    }

    function scheduleKick(startTime, velocity) {
        const context = ensureAudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const bandLevel = getControlLevel("backingVolume", 85);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(135, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(45, startTime + 0.14);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(bandLevel * velocity, startTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);

        oscillator.connect(gain);
        gain.connect(audioOutput.dry);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.26);
        trackScheduledNodes(oscillator);
    }

    function scheduleSnare(startTime, velocity) {
        const context = ensureAudioContext();
        const source = context.createBufferSource();
        const noiseGain = context.createGain();
        const noiseFilter = context.createBiquadFilter();
        const tone = context.createOscillator();
        const toneGain = context.createGain();
        const bandLevel = getControlLevel("backingVolume", 85);

        source.buffer = getNoiseBuffer();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1900, startTime);
        noiseFilter.Q.value = 0.72;
        noiseGain.gain.setValueAtTime(0.0001, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(bandLevel * velocity, startTime + 0.006);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

        tone.type = "triangle";
        tone.frequency.setValueAtTime(185, startTime);
        toneGain.gain.setValueAtTime(0.0001, startTime);
        toneGain.gain.exponentialRampToValueAtTime(bandLevel * velocity * 0.24, startTime + 0.008);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

        source.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioOutput.dry);
        tone.connect(toneGain);
        toneGain.connect(audioOutput.dry);

        source.start(startTime);
        source.stop(startTime + 0.16);
        tone.start(startTime);
        tone.stop(startTime + 0.13);
        trackScheduledNodes(source, tone);
    }

    function scheduleHat(startTime, velocity, isOpen) {
        const context = ensureAudioContext();
        const source = context.createBufferSource();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        const bandLevel = getControlLevel("backingVolume", 85);
        const duration = isOpen ? 0.18 : 0.055;

        source.buffer = getNoiseBuffer();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(isOpen ? 5200 : 6500, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(bandLevel * velocity, startTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(audioOutput.dry);
        source.start(startTime);
        source.stop(startTime + duration + 0.02);
        trackScheduledNodes(source);
    }

    function scheduleBalladDrums(startTime, totalBeats, beatDuration) {
        for (let step = 0; step < totalBeats * 2; step += 1) {
            const beat = step / 2;
            const time = startTime + beat * beatDuration;
            const barStep = step % 8;

            scheduleHat(time, barStep % 2 === 0 ? 0.024 : 0.015, false);

            if (barStep === 0 || barStep === 4) {
                scheduleKick(time, barStep === 0 ? 0.18 : 0.11);
            }

            if (barStep === 2 || barStep === 6) {
                scheduleSnare(time, barStep === 2 ? 0.105 : 0.12);
            }
        }
    }

    function updateChordHighlight(card, currentIndex, chordCount) {
        const tokens = card.querySelectorAll(".progression-chord-token");
        tokens.forEach(function(token) {
            const index = Number(token.dataset.chordIndex);
            token.classList.toggle("is-current", index === currentIndex);
            token.classList.toggle("is-next", index === (currentIndex + 1) % chordCount);
        });
    }

    async function playProgression(chords, card) {
        stopPlayback();
        const sessionId = playbackSessionId;

        const context = ensureAudioContext();
        await loadGuitarSample();

        if (sessionId !== playbackSessionId) {
            return;
        }

        const bpmInput = document.getElementById("progressionBpm");
        const metronomeToggle = document.getElementById("progressionMetronome");
        const backingToggle = document.getElementById("backingTrackMode");
        const bpm = Math.max(50, Math.min(180, Number(bpmInput?.value || 72)));
        const beatDuration = 60 / bpm;
        const chordDuration = beatDuration * 4;
        const startTime = context.currentTime + 0.08;
        const totalBeats = chords.length * 4;
        const cycleDuration = totalBeats * beatDuration;
        const shouldSchedule = function() {
            return sessionId === playbackSessionId;
        };
        const playButton = card.querySelector(".progression-play-button");

        if (playButton) {
            playButton.textContent = "Playing";
        }

        function scheduleCycle(cycleStartTime, cycleIndex) {
            if (!shouldSchedule()) {
                return;
            }

            chords.forEach(function(chord, index) {
                scheduleChord(
                    chord,
                    cycleStartTime + index * chordDuration,
                    chordDuration
                );
                if (backingToggle?.checked) {
                    scheduleBassLine(chord, cycleStartTime + index * chordDuration, beatDuration);
                }
            });

            scheduleRhythmGuitar(chords, cycleStartTime, beatDuration, cycleIndex);

            if (backingToggle?.checked) {
                scheduleBalladDrums(cycleStartTime, totalBeats, beatDuration);
            }

            if (metronomeToggle?.checked) {
                for (let beat = 0; beat < totalBeats; beat += 1) {
                    scheduleClick(cycleStartTime + beat * beatDuration, beat % 4 === 0);
                }
            }

            chords.forEach(function(chord, index) {
                const delay = Math.max(0, (cycleStartTime - context.currentTime + index * chordDuration) * 1000);
                playbackTimers.push(window.setTimeout(function() {
                    if (shouldSchedule()) {
                        updateChordHighlight(card, index, chords.length);
                    }
                }, delay));
            });

            playbackTimers.push(window.setTimeout(function() {
                scheduleCycle(cycleStartTime + cycleDuration, cycleIndex + 1);
            }, Math.max(250, (cycleDuration - 0.35) * 1000)));
        }

        scheduleCycle(startTime, 0);
        card.classList.add("is-playing");
    }

    function readSavedProgressions() {
        try {
            return JSON.parse(localStorage.getItem(SAVED_PROGRESSIONS_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function writeSavedProgressions(items) {
        localStorage.setItem(SAVED_PROGRESSIONS_KEY, JSON.stringify(items.slice(0, 20)));
    }

    function renderSavedProgressions() {
        const container = document.getElementById("savedProgressions");
        if (!container) {
            return;
        }

        const items = readSavedProgressions();
        container.innerHTML = items.length
            ? items.map(function(item) {
                return `
                    <article class="saved-progression-item">
                        <div>
                            <strong>${item.key}</strong>
                            <span>${item.numerals.join(" - ")}</span>
                            <span>${item.chords.join(" - ")}</span>
                        </div>
                        <button class="saved-progression-delete" type="button" data-saved-id="${item.id}" aria-label="Delete saved progression">Delete</button>
                    </article>
                `;
            }).join("")
            : `<p class="saved-progression-empty">No saved progressions yet.</p>`;
    }

    function saveProgression(button) {
        const chords = JSON.parse(decodeURIComponent(button.dataset.chords));
        const numerals = JSON.parse(decodeURIComponent(button.dataset.numerals));
        const style = decodeURIComponent(button.dataset.style || "");
        const item = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            key: selectedKeyButton?.dataset.key || "Selected key",
            chords,
            numerals,
            style
        };

        writeSavedProgressions([item, ...readSavedProgressions()]);
        renderSavedProgressions();
        button.textContent = "Saved";
        window.setTimeout(function() {
            button.textContent = "Save";
        }, 1200);
    }

    function exportProgression(button) {
        const chords = JSON.parse(decodeURIComponent(button.dataset.chords));
        const numerals = JSON.parse(decodeURIComponent(button.dataset.numerals));
        const style = decodeURIComponent(button.dataset.style || "");
        const keyName = selectedKeyButton?.dataset.key || "Selected key";
        const content = [
            "Jam Tracks Hub - Chord Progression",
            "",
            `Key: ${keyName}`,
            `Roman numerals: ${numerals.join(" - ")}`,
            `Chords: ${chords.join(" - ")}`,
            `Style: ${style}`,
            `BPM: ${document.getElementById("progressionBpm")?.value || 72}`,
            `Voicing: ${document.getElementById("chordInversion")?.selectedOptions?.[0]?.textContent || "Root position"}`
        ].join("\n");
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${keyName.replace(/\s+/g, "_")}_progression.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function transposeSelectedKey(delta) {
        if (!selectedKeyButton) {
            return;
        }

        const currentKey = selectedKeyButton.dataset.key;
        const currentRoot = currentKey.split(" ")[0];
        const currentMode = currentKey.includes("minor") ? "minor" : "major";
        const targetPitchClass = (pitchClasses[currentRoot] + delta + 12) % 12;
        const targetButton = Array.from(keyButtons).find(function(button) {
            const keyName = button.dataset.key;
            const root = keyName.split(" ")[0];
            const mode = keyName.includes("minor") ? "minor" : "major";
            return mode === currentMode && pitchClasses[root] === targetPitchClass;
        });

        targetButton?.click();
    }

    keyResult.addEventListener("click", function(event) {
        const playButton = event.target.closest(".progression-play-button");
        const stopButton = event.target.closest("#stopProgressionButton");
        const saveButton = event.target.closest(".progression-save-button");
        const exportButton = event.target.closest(".progression-export-button");
        const deleteButton = event.target.closest(".saved-progression-delete");
        const transposeDownButton = event.target.closest("#transposeDownButton");
        const transposeUpButton = event.target.closest("#transposeUpButton");

        if (stopButton) {
            stopPlayback();
            return;
        }

        if (saveButton) {
            saveProgression(saveButton);
            return;
        }

        if (exportButton) {
            exportProgression(exportButton);
            return;
        }

        if (deleteButton) {
            const nextItems = readSavedProgressions().filter(function(item) {
                return item.id !== deleteButton.dataset.savedId;
            });
            writeSavedProgressions(nextItems);
            renderSavedProgressions();
            return;
        }

        if (transposeDownButton) {
            transposeSelectedKey(-1);
            return;
        }

        if (transposeUpButton) {
            transposeSelectedKey(1);
            return;
        }

        if (!playButton) {
            return;
        }

        const chords = JSON.parse(decodeURIComponent(playButton.dataset.chords));
        playProgression(chords, playButton.closest(".progression-card"));
    });

    function readCurrentControls() {
        return {
            extension: currentChordExtension
        };
    }

    function applyKeyModeToButton(button) {
        const mode = currentKeyMode === "minor" ? "minor" : "major";
        button.dataset.key = button.dataset[`${mode}Key`];
        button.dataset.notes = button.dataset[`${mode}Notes`];
        button.textContent = button.dataset[`${mode}Label`];
        button.setAttribute("aria-label", `${button.dataset.key} progressions`);
    }

    function refreshKeyModeButtons() {
        keyButtons.forEach(applyKeyModeToButton);
        keyOptions.setAttribute("data-key-mode", currentKeyMode);
        if (keyModeToggle) {
            keyModeToggle.checked = currentKeyMode === "minor";
        }
    }

    function renderSelectedKey(button, shouldScroll) {
        stopPlayback();
        const settings = readCurrentControls();
        selectedKeyButton = button;
        keyButtons.forEach(function(keyButton) {
            const isSelected = keyButton === button;
            keyButton.classList.toggle("is-selected", isSelected);
            keyButton.setAttribute("aria-pressed", String(isSelected));
        });

        const keyName = button.dataset.key;
        const keyNotes = button.dataset.notes.split(", ");
        const isMinor = keyName.includes("minor");
        const progressions = isMinor ? minorProgressions : majorProgressions;
        const useSevenths = settings.extension === "sevenths";
        const chordMap = isMinor
            ? buildMinorDiatonicChords(keyNotes, useSevenths)
            : buildMajorDiatonicChords(keyNotes, useSevenths);

        keyResult.innerHTML = `
            <div class="selected-key-heading progression-selected-heading">
                <div>
                    <span class="result-kicker">Selected key</span>
                    <h3>${escapeProgressionHtml(keyName)}</h3>
                </div>
            </div>
            <section class="progression-section progression-library-section">
                <div class="progression-toolbar progression-toolbar-simple">
                    <div class="progression-toolbar-heading">
                        <span class="result-kicker">Chord library</span>
                        <h4>Common Progressions</h4>
                        <p>Switch between triads and seventh chords. Each chord includes a compact root-position guitar shape.</p>
                    </div>
                    <div class="progression-chord-mode-control">
                        <span>Chords</span>
                        <div class="progression-extension-toggle" role="group" aria-label="Chord type">
                            <button
                                class="progression-extension-option${settings.extension === "triads" ? " is-selected" : ""}"
                                type="button"
                                data-chord-extension="triads"
                                aria-pressed="${settings.extension === "triads"}">
                                Triads
                            </button>
                            <button
                                class="progression-extension-option${settings.extension === "sevenths" ? " is-selected" : ""}"
                                type="button"
                                data-chord-extension="sevenths"
                                aria-pressed="${settings.extension === "sevenths"}">
                                Seventh chords
                            </button>
                        </div>
                    </div>
                </div>
                <div class="progression-category-list">${renderProgressions(progressions, chordMap)}</div>
            </section>
        `;

        keyOptions.hidden = true;
        selectKeyButton.hidden = false;

        if (shouldScroll) {
            keyResult.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    keyButtons.forEach(function(button) {
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", function() {
            renderSelectedKey(button, true);
        });
    });

    refreshKeyModeButtons();

    keyModeToggle?.addEventListener("change", function() {
        currentKeyMode = keyModeToggle.checked ? "minor" : "major";
        const selectedIndex = selectedKeyButton
            ? Array.from(keyButtons).indexOf(selectedKeyButton)
            : -1;
        refreshKeyModeButtons();

        if (selectedIndex >= 0) {
            renderSelectedKey(keyButtons[selectedIndex], false);
            return;
        }

        keyResult.innerHTML = `
            <h3>Select a ${currentKeyMode} key</h3>
            <p>Click a tonic above to see its notes.</p>
        `;
    });

    keyResult.addEventListener("click", function(event) {
        const extensionButton = event.target.closest("[data-chord-extension]");
        if (extensionButton && selectedKeyButton) {
            currentChordExtension = extensionButton.dataset.chordExtension === "sevenths"
                ? "sevenths"
                : "triads";
            renderSelectedKey(selectedKeyButton, false);
        }
    });

    selectKeyButton.addEventListener("click", function() {
        stopPlayback();
        keyOptions.hidden = false;
        selectKeyButton.hidden = true;
        selectedKeyButton = null;
        keyButtons.forEach(function(button) {
            button.classList.remove("is-selected");
            button.setAttribute("aria-pressed", "false");
        });
        keyResult.innerHTML = `
            <h3>Select a key</h3>
            <p>Click a key above to see its notes.</p>
        `;
    });

    const requestedKey = new URLSearchParams(window.location.search).get("key");
    if (requestedKey) {
        currentKeyMode = requestedKey.toLowerCase().includes("minor") ? "minor" : "major";
        refreshKeyModeButtons();
        const requestedButton = Array.from(keyButtons).find(function(button) {
            return button.dataset.key.toLowerCase() === requestedKey.toLowerCase()
                || button.dataset.majorKey.toLowerCase() === requestedKey.toLowerCase()
                || button.dataset.minorKey.toLowerCase() === requestedKey.toLowerCase();
        });
        if (requestedButton) {
            renderSelectedKey(requestedButton, false);
        }
    }
});
