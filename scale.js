document.addEventListener("DOMContentLoaded", function() {
    const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const FLAT_ROOTS = new Set([3, 5, 8, 10]);
    const STRINGS = [
        { name: "e", pitch: 4, description: "high E" },
        { name: "B", pitch: 11, description: "B" },
        { name: "G", pitch: 7, description: "G" },
        { name: "D", pitch: 2, description: "D" },
        { name: "A", pitch: 9, description: "A" },
        { name: "E", pitch: 4, description: "low E" }
    ];
    const SCALE_TYPES = {
        "major": {
            name: "Major",
            intervals: [0, 2, 4, 5, 7, 9, 11],
            degrees: ["1", "2", "3", "4", "5", "6", "7"],
            description: "A clear seven-note foundation for harmony, melody, and major-key improvisation."
        },
        "natural-minor": {
            name: "Natural Minor",
            intervals: [0, 2, 3, 5, 7, 8, 10],
            degrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
            description: "A darker seven-note sound with a minor third, minor sixth, and minor seventh."
        },
        "major-pentatonic": {
            name: "Major Pentatonic",
            intervals: [0, 2, 4, 7, 9],
            degrees: ["1", "2", "3", "5", "6"],
            description: "An open, melodic five-note sound common in pop, country, soul, and uplifting solos."
        },
        "minor-pentatonic": {
            name: "Minor Pentatonic",
            intervals: [0, 3, 5, 7, 10],
            degrees: ["1", "b3", "4", "5", "b7"],
            description: "A focused five-note sound used throughout rock, blues, and modern guitar playing."
        },
        "blues": {
            name: "Blues",
            intervals: [0, 3, 5, 6, 7, 10],
            degrees: ["1", "b3", "4", "b5", "5", "b7"],
            description: "Minor pentatonic with the expressive flat fifth added for tension and blues phrasing."
        },
        "dorian": {
            name: "Dorian",
            intervals: [0, 2, 3, 5, 7, 9, 10],
            degrees: ["1", "2", "b3", "4", "5", "6", "b7"],
            description: "A minor mode with a natural sixth, balancing a moody center with a brighter lift."
        },
        "mixolydian": {
            name: "Mixolydian",
            intervals: [0, 2, 4, 5, 7, 9, 10],
            degrees: ["1", "2", "3", "4", "5", "6", "b7"],
            description: "A major sound with a flat seventh, ideal for rock, funk, blues, and dominant chords."
        },
        "harmonic-minor": {
            name: "Harmonic Minor",
            intervals: [0, 2, 3, 5, 7, 8, 11],
            degrees: ["1", "2", "b3", "4", "5", "b6", "7"],
            description: "A dramatic minor scale with a raised seventh that strongly pulls back to the root."
        }
    };

    const scaleTypeSelect = document.getElementById("scaleType");
    const rootGrid = document.getElementById("scaleRootGrid");
    const rangeButtons = document.getElementById("scaleRangeButtons");
    const labelToggle = document.querySelector(".scale-label-toggle");
    const scaleTitle = document.getElementById("scaleTitle");
    const scaleDescription = document.getElementById("scaleDescription");
    const intervalList = document.getElementById("scaleIntervalList");
    const fretboard = document.getElementById("fretboard");
    const playButton = document.getElementById("playScaleButton");

    let rootPitch = 9;
    let fretStart = 0;
    let fretEnd = 15;
    let labelMode = "note";
    let audioContext = null;
    let isPlaying = false;

    function getScale() {
        return SCALE_TYPES[scaleTypeSelect.value];
    }

    function getNoteNames() {
        return FLAT_ROOTS.has(rootPitch) ? NOTES_FLAT : NOTES_SHARP;
    }

    function getRootName() {
        return getNoteNames()[rootPitch];
    }

    function getScalePitchClasses() {
        return getScale().intervals.map(interval => (rootPitch + interval) % 12);
    }

    function getIntervalIndex(pitch) {
        return getScalePitchClasses().indexOf(pitch);
    }

    function updatePressedState(container, selectedButton) {
        container.querySelectorAll("button").forEach(button => {
            const isSelected = button === selectedButton;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
        });
    }

    function renderSummary() {
        const scale = getScale();
        const noteNames = getNoteNames();
        scaleTitle.textContent = `${getRootName()} ${scale.name}`;
        scaleDescription.textContent = scale.description;
        intervalList.innerHTML = "";

        scale.intervals.forEach((interval, index) => {
            const chip = document.createElement("span");
            chip.className = `scale-interval-chip interval-color-${index}`;
            if (index === 0) {
                chip.classList.add("is-root");
            }
            chip.innerHTML = `
                <strong>${scale.degrees[index]}</strong>
                <small>${noteNames[(rootPitch + interval) % 12]}</small>
            `;
            intervalList.appendChild(chip);
        });
    }

    function createCell(string, fret) {
        const pitch = (string.pitch + fret) % 12;
        const intervalIndex = getIntervalIndex(pitch);
        const cell = document.createElement("div");
        cell.className = `fret-cell${fret === 0 ? " open-string-cell" : ""}`;
        cell.setAttribute("aria-hidden", "true");

        if (intervalIndex !== -1) {
            const scale = getScale();
            const marker = document.createElement("span");
            const noteName = getNoteNames()[pitch];
            const degree = scale.degrees[intervalIndex];
            marker.className = `fret-note interval-color-${intervalIndex}`;
            marker.textContent = labelMode === "note" ? noteName : degree;
            marker.title = `${noteName}, degree ${degree}, ${string.description} string, fret ${fret}`;

            if (intervalIndex === 0) {
                marker.classList.add("is-root");
            }

            cell.appendChild(marker);
        }

        return cell;
    }

    function renderFretboard() {
        const visibleFrets = [];
        for (let fret = fretStart; fret <= fretEnd; fret += 1) {
            visibleFrets.push(fret);
        }

        fretboard.innerHTML = "";
        fretboard.style.setProperty("--visible-frets", visibleFrets.length);

        const corner = document.createElement("div");
        corner.className = "fretboard-corner";
        corner.textContent = "String";
        corner.setAttribute("aria-hidden", "true");
        fretboard.appendChild(corner);

        visibleFrets.forEach(fret => {
            const number = document.createElement("div");
            number.className = "fret-number";
            number.textContent = fret;
            number.setAttribute("aria-hidden", "true");
            fretboard.appendChild(number);
        });

        STRINGS.forEach(string => {
            const label = document.createElement("div");
            label.className = "string-label";
            label.textContent = string.name;
            label.title = `${string.description} string`;
            label.setAttribute("aria-hidden", "true");
            fretboard.appendChild(label);

            visibleFrets.forEach(fret => {
                fretboard.appendChild(createCell(string, fret));
            });
        });

        const spacer = document.createElement("div");
        spacer.className = "fretboard-corner fretboard-bottom-corner";
        spacer.setAttribute("aria-hidden", "true");
        fretboard.appendChild(spacer);

        visibleFrets.forEach(fret => {
            const dotCell = document.createElement("div");
            dotCell.className = "fret-position-marker";
            dotCell.setAttribute("aria-hidden", "true");
            if ([3, 5, 7, 9, 12, 15].includes(fret)) {
                dotCell.innerHTML = fret === 12
                    ? '<span></span><span></span>'
                    : '<span></span>';
            }
            fretboard.appendChild(dotCell);
        });

        fretboard.setAttribute(
            "aria-label",
            `${getRootName()} ${getScale().name} on guitar frets ${fretStart} through ${fretEnd}`
        );
    }

    function render() {
        renderSummary();
        renderFretboard();
    }

    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    async function playScale() {
        if (isPlaying) {
            return;
        }

        const context = getAudioContext();
        if (context.state === "suspended") {
            await context.resume();
        }

        isPlaying = true;
        playButton.disabled = true;
        playButton.classList.add("is-playing");
        playButton.lastChild.textContent = " Playing";

        const scale = getScale();
        const sequence = [...scale.intervals, 12];
        const startMidi = 60 + rootPitch;
        const startTime = context.currentTime + 0.05;

        sequence.forEach((interval, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const noteStart = startTime + index * 0.28;
            const frequency = 440 * Math.pow(2, (startMidi + interval - 69) / 12);

            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(frequency, noteStart);
            gain.gain.setValueAtTime(0.0001, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.24);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteStart + 0.26);
        });

        window.setTimeout(() => {
            isPlaying = false;
            playButton.disabled = false;
            playButton.classList.remove("is-playing");
            playButton.lastChild.textContent = " Play scale";
        }, sequence.length * 280 + 180);
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

    scaleTypeSelect.addEventListener("change", render);

    rangeButtons.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-start]");
        if (!button) {
            return;
        }
        fretStart = Number(button.dataset.start);
        fretEnd = Number(button.dataset.end);
        updatePressedState(rangeButtons, button);
        renderFretboard();
    });

    labelToggle.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-label-mode]");
        if (!button) {
            return;
        }
        labelMode = button.dataset.labelMode;
        updatePressedState(labelToggle, button);
        renderFretboard();
    });

    playButton.addEventListener("click", playScale);
    render();
});
