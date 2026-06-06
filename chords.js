document.addEventListener("DOMContentLoaded", function() {
    const keyButtons = document.querySelectorAll(".key-button");
    const keyResult = document.getElementById("keyResult");
    const keyOptions = document.getElementById("keyOptions");
    const selectKeyButton = document.getElementById("selectKeyButton");

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
        { numerals: ["I", "V", "vi", "IV"], style: "Pop / Rock / Worship" },
        { numerals: ["I", "vi", "IV", "V"], style: "50s Progression / Ballad" },
        { numerals: ["vi", "IV", "I", "V"], style: "Emotional Pop" },
        { numerals: ["I", "IV", "V", "I"], style: "Classic / Folk / Blues Foundation" },
        { numerals: ["I", "V", "IV", "V"], style: "Rock / Country" },
        { numerals: ["ii", "V", "I"], style: "Jazz / Smooth Turnaround" },
        { numerals: ["I", "iii", "IV", "V"], style: "J-pop / Emotional Pop" },
        { numerals: ["I", "IV", "vi", "V"], style: "Ballad / Cinematic" }
    ];

    const minorProgressions = [
        { numerals: ["i", "VI", "III", "VII"], style: "Emotional / Pop Rock" },
        { numerals: ["i", "iv", "VII", "III"], style: "Dark Pop / Cinematic" },
        { numerals: ["i", "VII", "VI", "VII"], style: "Rock / Dramatic" },
        { numerals: ["i", "iv", "v", "i"], style: "Natural Minor / Traditional" },
        { numerals: ["i", "VI", "iv", "V"], style: "Harmonic Minor Flavor" },
        { numerals: ["i", "v", "VI", "VII"], style: "Ballad / Sad Pop" },
        { numerals: ["i", "III", "VII", "VI"], style: "Epic / Cinematic" },
        { numerals: ["i", "iv", "VI", "V"], style: "Strong Minor Resolution" }
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

    function buildMajorDiatonicChords(notes) {
        return {
            I: notes[0],
            ii: `${notes[1]}m`,
            iii: `${notes[2]}m`,
            IV: notes[3],
            V: notes[4],
            vi: `${notes[5]}m`
        };
    }

    function buildMinorDiatonicChords(notes) {
        return {
            i: `${notes[0]}m`,
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

    function renderProgressions(progressions, chordMap) {
        return progressions.map(function(progression) {
            const chords = progression.numerals.map(function(numeral) {
                return chordMap[numeral] || numeral;
            });

            return `
                <article class="progression-card">
                    <div class="progression-main">
                        <span class="progression-numerals">${progression.numerals.join(" - ")}</span>
                        <span class="progression-chords">${chords.join(" - ")}</span>
                        <span class="progression-style">${progression.style}</span>
                    </div>
                    <button class="progression-play-button" type="button" data-chords="${encodeChords(chords)}">Loop</button>
                </article>
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
        const quality = chordName.endsWith("dim")
            ? "dim"
            : chordName.endsWith("m")
                ? "minor"
                : "major";
        const root = chordName.replace("dim", "").replace(/m$/, "");
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

        const intervals = parsed.quality === "dim"
            ? [0, 3, 6]
            : parsed.quality === "minor"
                ? [0, 3, 7]
                : [0, 4, 7];
        const rootMidi = 48 + parsed.pitchClass;

        return intervals.map(function(interval) {
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

            playbackTimers.push(window.setTimeout(function() {
                scheduleCycle(cycleStartTime + cycleDuration, cycleIndex + 1);
            }, Math.max(250, (cycleDuration - 0.35) * 1000)));
        }

        scheduleCycle(startTime, 0);
        card.classList.add("is-playing");
    }

    keyResult.addEventListener("click", function(event) {
        const playButton = event.target.closest(".progression-play-button");
        const stopButton = event.target.closest("#stopProgressionButton");

        if (stopButton) {
            stopPlayback();
            return;
        }

        if (!playButton) {
            return;
        }

        const chords = JSON.parse(decodeURIComponent(playButton.dataset.chords));
        playProgression(chords, playButton.closest(".progression-card"));
    });

    keyButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const keyName = button.dataset.key;
            const keyNotes = button.dataset.notes.split(", ");
            const isMinor = keyName.includes("minor");
            const intervals = isMinor ? minorIntervals : majorIntervals;
            const progressions = isMinor ? minorProgressions : majorProgressions;
            const chordMap = isMinor ? buildMinorDiatonicChords(keyNotes) : buildMajorDiatonicChords(keyNotes);

            const noteCards = keyNotes.map(function(note, index) {
                return `
                    <article class="note-card">
                        <span class="note-name">${note}</span>
                        <span class="interval-name">${intervals[index]}</span>
                    </article>
                `;
            }).join("");

            keyResult.innerHTML = `
                <h3>${keyName}</h3>
                <div class="note-grid">${noteCards}</div>
                <section class="progression-section">
                    <div class="progression-toolbar">
                        <h4>Common Progressions</h4>
                        <div class="progression-controls">
                            <label>
                                BPM
                                <input id="progressionBpm" type="number" min="50" max="180" value="72">
                            </label>
                            <label class="metronome-toggle">
                                <input id="progressionMetronome" type="checkbox">
                                Metronome
                            </label>
                            <label class="volume-control">
                                Guitar
                                <input id="guitarVolume" type="range" min="0" max="200" value="130">
                            </label>
                            <label class="volume-control">
                                Click
                                <input id="metronomeVolume" type="range" min="0" max="200" value="80">
                            </label>
                            <label class="backing-toggle">
                                <input id="backingTrackMode" type="checkbox" checked>
                                Band
                            </label>
                            <label class="volume-control">
                                Band
                                <input id="backingVolume" type="range" min="0" max="200" value="70">
                            </label>
                            <button id="stopProgressionButton" class="secondary-button" type="button">Stop</button>
                        </div>
                    </div>
                    <div class="progression-grid">${renderProgressions(progressions, chordMap)}</div>
                </section>
            `;

            keyOptions.hidden = true;
            selectKeyButton.hidden = false;
            keyResult.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    selectKeyButton.addEventListener("click", function() {
        stopPlayback();
        keyOptions.hidden = false;
        selectKeyButton.hidden = true;
        keyResult.innerHTML = `
            <h3>Select a key</h3>
            <p>Click a key above to see its notes.</p>
        `;
    });
});
