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
    const lengthToggle = document.getElementById("scaleLengthToggle");
    const rangeButtons = document.getElementById("scaleRangeButtons");
    const labelToggle = document.querySelector(".scale-label-toggle");
    const scaleTitle = document.getElementById("scaleTitle");
    const scaleDescription = document.getElementById("scaleDescription");
    const intervalList = document.getElementById("scaleIntervalList");
    const fretboard = document.getElementById("fretboard");
    const playButton = document.getElementById("playScaleButton");
    const downloadButton = document.getElementById("downloadScaleButton");

    let rootPitch = 9;
    let neckFrets = 15;
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

    function getRangeOptions() {
        const ranges = [
            { label: "0-4", start: 0, end: 4 },
            { label: "3-7", start: 3, end: 7 },
            { label: "5-9", start: 5, end: 9 },
            { label: "7-12", start: 7, end: 12 },
            { label: "10-15", start: 10, end: 15 }
        ];

        if (neckFrets === 22) {
            ranges.push(
                { label: "12-17", start: 12, end: 17 },
                { label: "17-22", start: 17, end: 22 }
            );
        }

        return [
            { label: `Full neck (0-${neckFrets})`, start: 0, end: neckFrets },
            ...ranges
        ];
    }

    function renderRangeButtons(selectFullNeck = false) {
        if (selectFullNeck || fretEnd > neckFrets) {
            fretStart = 0;
            fretEnd = neckFrets;
        }

        rangeButtons.innerHTML = "";
        getRangeOptions().forEach(option => {
            const button = document.createElement("button");
            const isSelected = option.start === fretStart && option.end === fretEnd;
            button.type = "button";
            button.dataset.start = String(option.start);
            button.dataset.end = String(option.end);
            button.textContent = option.label;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
            rangeButtons.appendChild(button);
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
        renderRangeButtons();
        renderFretboard();
    }

    function roundedRect(context, x, y, width, height, radius) {
        const safeRadius = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + safeRadius, y);
        context.lineTo(x + width - safeRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        context.lineTo(x + width, y + height - safeRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        context.lineTo(x + safeRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        context.lineTo(x, y + safeRadius);
        context.quadraticCurveTo(x, y, x + safeRadius, y);
        context.closePath();
    }

    function drawScaleImage() {
        const visibleFrets = [];
        for (let fret = fretStart; fret <= fretEnd; fret += 1) {
            visibleFrets.push(fret);
        }

        const scale = getScale();
        const noteNames = getNoteNames();
        const intervalColors = [
            "#b83d55",
            "#b66c1f",
            "#267ca6",
            "#247f5b",
            "#5d50b2",
            "#96507c",
            "#58722f"
        ];
        const outerPadding = 54;
        const labelWidth = 68;
        const cellWidth = 82;
        const rowHeight = 66;
        const titleHeight = 158;
        const legendHeight = 72;
        const markerHeight = 34;
        const footerHeight = 58;
        const boardWidth = labelWidth + visibleFrets.length * cellWidth;
        const canvasWidth = Math.max(1040, outerPadding * 2 + boardWidth);
        const boardTop = titleHeight + legendHeight;
        const canvasHeight = boardTop + 28 + STRINGS.length * rowHeight + markerHeight + footerHeight;
        const scaleFactor = 2;
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth * scaleFactor;
        canvas.height = canvasHeight * scaleFactor;
        const context = canvas.getContext("2d");
        context.scale(scaleFactor, scaleFactor);

        context.fillStyle = "#f5efe6";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        context.fillStyle = "#fffdf9";
        roundedRect(context, 24, 24, canvasWidth - 48, canvasHeight - 48, 14);
        context.fill();
        context.strokeStyle = "#d8c8b7";
        context.lineWidth = 1;
        context.stroke();

        context.fillStyle = "#8e613d";
        context.font = "700 34px Georgia, serif";
        context.fillText(`${getRootName()} ${scale.name}`, outerPadding, 74);
        context.fillStyle = "#4d433b";
        context.font = "600 16px Arial, sans-serif";
        context.fillText(
            `Guitar scale diagram · frets ${fretStart}-${fretEnd} · ${labelMode === "note" ? "note names" : "scale degrees"}`,
            outerPadding,
            105
        );
        context.fillStyle = "#766b62";
        context.font = "14px Arial, sans-serif";
        context.fillText("Standard tuning: E A D G B E", outerPadding, 132);

        let legendX = outerPadding;
        scale.intervals.forEach((interval, index) => {
            const label = `${scale.degrees[index]}  ${noteNames[(rootPitch + interval) % 12]}`;
            context.font = "700 13px Arial, sans-serif";
            const chipWidth = Math.max(68, context.measureText(label).width + 28);
            context.fillStyle = intervalColors[index];
            roundedRect(context, legendX, titleHeight + 11, chipWidth, 34, 17);
            context.fill();
            if (index === 0) {
                context.strokeStyle = "#6c2c3c";
                context.lineWidth = 2;
                context.stroke();
            }
            context.fillStyle = "#ffffff";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(label, legendX + chipWidth / 2, titleHeight + 28);
            legendX += chipWidth + 9;
        });

        const boardX = outerPadding;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#766b62";
        context.font = "700 13px Arial, sans-serif";
        context.fillText("String", boardX + labelWidth / 2, boardTop + 14);
        visibleFrets.forEach((fret, index) => {
            context.fillText(
                String(fret),
                boardX + labelWidth + index * cellWidth + cellWidth / 2,
                boardTop + 14
            );
        });

        const stringsTop = boardTop + 28;
        STRINGS.forEach((string, stringIndex) => {
            const rowY = stringsTop + stringIndex * rowHeight;
            context.fillStyle = "#f1e7db";
            context.fillRect(boardX, rowY, labelWidth, rowHeight);
            context.strokeStyle = "#cfbda9";
            context.lineWidth = 1;
            context.strokeRect(boardX, rowY, labelWidth, rowHeight);
            context.fillStyle = "#7d5435";
            context.font = "700 16px Arial, sans-serif";
            context.fillText(string.name, boardX + labelWidth / 2, rowY + rowHeight / 2);

            visibleFrets.forEach((fret, fretIndex) => {
                const cellX = boardX + labelWidth + fretIndex * cellWidth;
                context.fillStyle = fret % 2 === 0 ? "#fbf7f1" : "#f7f0e7";
                context.fillRect(cellX, rowY, cellWidth, rowHeight);
                context.strokeStyle = fret === 0 ? "#a77a51" : "#c7b5a2";
                context.lineWidth = fret === 0 ? 4 : 1.4;
                context.strokeRect(cellX, rowY, cellWidth, rowHeight);

                context.strokeStyle = "#9b8c7e";
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(cellX, rowY + rowHeight / 2);
                context.lineTo(cellX + cellWidth, rowY + rowHeight / 2);
                context.stroke();

                const pitch = (string.pitch + fret) % 12;
                const intervalIndex = getIntervalIndex(pitch);
                if (intervalIndex === -1) {
                    return;
                }

                const centerX = cellX + cellWidth / 2;
                const centerY = rowY + rowHeight / 2;
                const radius = intervalIndex === 0 ? 21 : 18;
                context.fillStyle = intervalColors[intervalIndex];
                context.beginPath();
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = intervalIndex === 0 ? "#ffffff" : "#f7eee6";
                context.lineWidth = intervalIndex === 0 ? 4 : 2;
                context.stroke();
                if (intervalIndex === 0) {
                    context.strokeStyle = intervalColors[0];
                    context.lineWidth = 2;
                    context.beginPath();
                    context.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
                    context.stroke();
                }

                context.fillStyle = "#ffffff";
                context.font = "700 13px Arial, sans-serif";
                const markerText = labelMode === "note"
                    ? noteNames[pitch]
                    : scale.degrees[intervalIndex];
                context.fillText(markerText, centerX, centerY + 0.5);
            });
        });

        const markersY = stringsTop + STRINGS.length * rowHeight + 16;
        visibleFrets.forEach((fret, index) => {
            if (![3, 5, 7, 9, 12, 15, 17, 19, 21].includes(fret)) {
                return;
            }
            const centerX = boardX + labelWidth + index * cellWidth + cellWidth / 2;
            context.fillStyle = "#b18a64";
            const dots = fret === 12 ? [-7, 7] : [0];
            dots.forEach(offset => {
                context.beginPath();
                context.arc(centerX + offset, markersY, 4, 0, Math.PI * 2);
                context.fill();
            });
        });

        context.textAlign = "right";
        context.textBaseline = "alphabetic";
        context.fillStyle = "#86786c";
        context.font = "12px Arial, sans-serif";
        context.fillText(
            "@ 2026 Jasper's Music. All rights reserved.",
            canvasWidth - outerPadding,
            canvasHeight - 34
        );

        return canvas;
    }

    function downloadScaleImage() {
        downloadButton.disabled = true;
        const originalText = downloadButton.lastChild.textContent;
        downloadButton.lastChild.textContent = " Preparing";

        try {
            const canvas = drawScaleImage();
            const fileName = `${getRootName()}-${getScale().name}-frets-${fretStart}-${fretEnd}`
                .toLowerCase()
                .replace(/#/g, "sharp")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `${fileName}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            downloadButton.disabled = false;
            downloadButton.lastChild.textContent = originalText;
        } catch (error) {
            console.error("Scale image download failed:", error);
            downloadButton.disabled = false;
            downloadButton.lastChild.textContent = originalText;
        }
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

    lengthToggle.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-fret-count]");
        if (!button) {
            return;
        }
        neckFrets = Number(button.dataset.fretCount);
        updatePressedState(lengthToggle, button);
        renderRangeButtons(true);
        renderFretboard();
    });

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
    downloadButton.addEventListener("click", downloadScaleImage);
    render();
});
