document.addEventListener("DOMContentLoaded", function() {
    const storageKey = "jamTracksHubProgressionWriter";
    const structureToggle = document.getElementById("progressionStructureToggle");
    const form = document.getElementById("progressionWriterForm");
    const status = document.getElementById("progressionWriterStatus");
    const savedList = document.getElementById("writerSavedProgressions");
    const savedPicker = document.getElementById("writerSavedProgressionPicker");
    const savedCount = document.getElementById("writerSavedProgressionCount");
    const loadSavedButton = document.getElementById("writerLoadProgressionButton");
    const duplicateSavedButton = document.getElementById("writerDuplicateProgressionButton");
    const clearWriterButton = document.getElementById("writerClearProgressionButton");
    const exportJsonButton = document.getElementById("writerExportJsonButton");
    const songNameInput = document.getElementById("progressionSongName");
    const keyRootSelect = document.getElementById("progressionKeyRoot");
    const keyQualityToggle = document.getElementById("progressionKeyQualityToggle");
    const bpmInput = document.getElementById("progressionBpm");
    const downloadButton = document.getElementById("downloadProgressionButton");
    const separateDownloadToggle = document.getElementById("separateProgressionDownload");
    const singleMode = document.querySelector('[data-progression-mode="single"]');
    const sectionMode = document.querySelector('[data-progression-mode="sections"]');
    const shapePicker = document.getElementById("progressionShapePicker");
    const shapePickerGrid = document.getElementById("progressionShapePickerGrid");
    const shapePickerChord = document.getElementById("progressionShapePickerChord");
    const shapePickerCount = document.getElementById("progressionShapePickerCount");
    const shapePositionFilter = document.getElementById("progressionShapePositionFilter");
    const shapeRootFilter = document.getElementById("progressionShapeRootFilter");
    const ShapeEngine = window.JamChordShapes;
    const chordById = ShapeEngine?.chordById || {};
    const suffixByChordId = ShapeEngine?.suffixByChordId || {};
    const TUNING_MIDI = ShapeEngine?.TUNING_MIDI || [];
    const STRING_NAMES = ShapeEngine?.STRING_NAMES || [];
    const DIAGRAM_FRET_ROWS = ShapeEngine?.DIAGRAM_FRET_ROWS || 4;
    const POSITION_TARGETS = ShapeEngine?.POSITION_TARGETS || [];

    if (!ShapeEngine || !form || !structureToggle || !savedList) {
        return;
    }

    if (shapePicker && shapePicker.parentElement !== document.body) {
        document.body.appendChild(shapePicker);
    }

    const shapePickerState = {
        input: null,
        parsed: null,
        voicings: [],
        position: "all",
        rootString: "all"
    };
    let downloadActionTimer = null;
    let activeSavedProgressionId = null;

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeXml(value) {
        return escapeHtml(value);
    }

    function fileSafeName(value) {
        return String(value || "custom-progression")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 72) || "custom-progression";
    }

    function selectedKeyLabel() {
        const root = keyRootSelect?.value || "A";
        const quality = keyQualityToggle?.checked ? "Minor" : "Major";
        return `${root} ${quality}`;
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 600);
    }

    function svgToPngBlob(svg) {
        return new Promise(function(resolve, reject) {
            const sizeMatch = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
            const width = sizeMatch ? Number(sizeMatch[1]) : 1200;
            const height = sizeMatch ? Number(sizeMatch[2]) : 800;
            const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
            const image = new Image();

            image.onload = function() {
                const canvas = document.createElement("canvas");
                const scale = 2;
                canvas.width = width * scale;
                canvas.height = height * scale;
                const context = canvas.getContext("2d");
                context.setTransform(scale, 0, 0, scale, 0, 0);
                context.drawImage(image, 0, 0, width, height);
                URL.revokeObjectURL(url);
                canvas.toBlob(function(blob) {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not render progression image."));
                    }
                }, "image/png");
            };

            image.onerror = function() {
                URL.revokeObjectURL(url);
                reject(new Error("Could not render progression image."));
            };

            image.src = url;
        });
    }

    function triggerDownloadButton() {
        if (!downloadButton) {
            return;
        }

        window.clearTimeout(downloadActionTimer);
        downloadButton.classList.add("is-activating");
        downloadButton.setAttribute("aria-busy", "true");
        downloadActionTimer = window.setTimeout(function() {
            downloadButton.classList.remove("is-activating");
            downloadButton.removeAttribute("aria-busy");
        }, 1800);
    }

    function readSavedProgressions() {
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    function writeSavedProgressions(items) {
        window.localStorage.setItem(storageKey, JSON.stringify(items));
    }

    function createProgressionId() {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizeShapeIndex(value) {
        const number = Number(value);
        return Number.isInteger(number) && number >= 0 ? number : 0;
    }

    function normalizeChordItem(item) {
        if (typeof item === "string") {
            const symbol = normalizeChordSymbol(item) || item.trim();
            return symbol ? { symbol, shapeIndex: 0 } : null;
        }

        if (!item || typeof item !== "object") {
            return null;
        }

        const rawSymbol = item.symbol || item.chord || item.name || "";
        const symbol = normalizeChordSymbol(rawSymbol) || String(rawSymbol).trim();
        if (!symbol) {
            return null;
        }

        return {
            symbol,
            shapeIndex: normalizeShapeIndex(item.shapeIndex)
        };
    }

    function normalizeChordItems(items) {
        return Array.isArray(items) ? items.map(normalizeChordItem).filter(Boolean) : [];
    }

    function inferSavedKeyParts(item) {
        const fallbackRoot = keyRootSelect?.value || "A";
        const fallbackQuality = keyQualityToggle?.checked ? "minor" : "major";

        if (item?.keyRoot) {
            return {
                root: item.keyRoot,
                quality: item.keyQuality === "minor" ? "minor" : "major"
            };
        }

        const match = String(item?.key || "").trim().match(/^(.+?)\s+(major|minor)$/i);
        if (match) {
            return {
                root: match[1],
                quality: match[2].toLowerCase()
            };
        }

        return {
            root: fallbackRoot,
            quality: fallbackQuality
        };
    }

    function normalizeSavedRecord(item) {
        if (!item || typeof item !== "object") {
            return null;
        }

        const keyParts = inferSavedKeyParts(item);
        const mode = item.mode === "sections" ? "sections" : "single";
        const sourceSections = item.sections || {};
        const sections = {
            single: normalizeChordItems(sourceSections.single || item.chords),
            verse: normalizeChordItems(sourceSections.verse || item.verse),
            chorus: normalizeChordItems(sourceSections.chorus || item.chorus)
        };

        return {
            id: String(item.id || createProgressionId()),
            mode,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
            songName: String(item.songName || ""),
            keyRoot: keyParts.root,
            keyQuality: keyParts.quality,
            key: `${keyParts.root} ${keyParts.quality === "minor" ? "Minor" : "Major"}`,
            bpm: String(item.bpm || ""),
            separateDownload: Boolean(item.separateDownload),
            sections
        };
    }

    function getSavedProgressions() {
        return readSavedProgressions().map(normalizeSavedRecord).filter(Boolean);
    }

    function findSavedProgression(id) {
        return getSavedProgressions().find(item => item.id === id) || null;
    }

    function setStatus(message) {
        if (!status) {
            return;
        }

        status.textContent = message;
    }

    function getMode() {
        return structureToggle.checked ? "sections" : "single";
    }

    function syncMode() {
        const usesSections = getMode() === "sections";
        if (singleMode) {
            singleMode.hidden = usesSections;
        }
        if (sectionMode) {
            sectionMode.hidden = !usesSections;
        }
        setStatus("");
    }

    const parseChordSymbolInput = ShapeEngine.parseChord;
    const normalizeChordSymbol = ShapeEngine.normalizeChord;
    const chordToneForPitch = ShapeEngine.chordToneForPitch;
    const generateVoicings = ShapeEngine.generateVoicings;
    const nearestPositionTarget = ShapeEngine.nearestPositionTarget;
    const rootStringLabel = ShapeEngine.rootStringLabel;
    const voicingHasRootOnString = ShapeEngine.voicingHasRootOnString;
    const diagramBaseFret = ShapeEngine.diagramBaseFret;
    const renderDiagram = ShapeEngine.renderProgressionDiagram;

    function renderFieldShape(input, requestedIndex) {
        const field = input.closest(".progression-writer-chord-field");
        const preview = field?.querySelector("[data-shape-preview]");
        if (!field || !preview) {
            return;
        }

        const parsed = parseChordSymbolInput(input.value);
        if (!parsed) {
            field.dataset.shapeIndex = "0";
            preview.innerHTML = "";
            return;
        }

        const voicings = generateVoicings(parsed);
        if (!voicings.length) {
            preview.innerHTML = '<p class="progression-writer-shape-empty">No compact guitar shape found.</p>';
            return;
        }

        const nextIndex = Number.isInteger(requestedIndex)
            ? requestedIndex
            : Number(field.dataset.shapeIndex || 0);
        const shapeIndex = ((nextIndex % voicings.length) + voicings.length) % voicings.length;
        field.dataset.shapeIndex = String(shapeIndex);
        preview.innerHTML = renderDiagram(parsed, voicings[shapeIndex], shapeIndex, voicings.length);
    }

    function collectDownloadProgression() {
        const mode = getMode();
        const sectionNames = mode === "sections" ? ["verse", "chorus"] : ["single"];
        const sectionLabels = { single: "Progression", verse: "Verse", chorus: "Chorus" };
        const sections = [];
        const invalid = [];

        sectionNames.forEach(function(sectionName) {
            const inputs = Array.from(form.querySelectorAll(`[data-chord-list="${sectionName}"] input`));
            const chords = [];

            inputs.forEach(function(input) {
                const raw = input.value.trim();
                if (!raw) {
                    return;
                }

                const parsed = parseChordSymbolInput(raw);
                if (!parsed) {
                    invalid.push(raw);
                    return;
                }

                input.value = parsed.symbol;
                const voicings = generateVoicings(parsed);
                if (!voicings.length) {
                    invalid.push(raw);
                    return;
                }

                const field = input.closest(".progression-writer-chord-field");
                const selectedIndex = Number(field?.dataset.shapeIndex || 0);
                const shapeIndex = ((selectedIndex % voicings.length) + voicings.length) % voicings.length;

                chords.push({
                    parsed,
                    voicing: voicings[shapeIndex],
                    shapeIndex,
                    totalShapes: voicings.length
                });
            });

            if (chords.length) {
                sections.push({
                    title: sectionLabels[sectionName],
                    chords
                });
            }
        });

        if (invalid.length) {
            return { error: `Could not read: ${invalid.join(", ")}` };
        }

        if (!sections.some(section => section.chords.length)) {
            return { error: "Add at least one chord before downloading." };
        }

        return {
            mode,
            songName: songNameInput?.value.trim() || "Untitled Progression",
            key: selectedKeyLabel(),
            bpm: bpmInput?.value.trim() || "",
            sections
        };
    }

    function svgText(x, y, value, options = {}) {
        const attrs = [
            `x="${x}"`,
            `y="${y}"`,
            `fill="${options.fill || "currentColor"}"`,
            `font-size="${options.size || 16}"`,
            `font-weight="${options.weight || 700}"`,
            `font-family="${options.family || "Noto Sans TC, Arial, sans-serif"}"`
        ];

        if (options.anchor) {
            attrs.push(`text-anchor="${options.anchor}"`);
        }
        if (options.opacity) {
            attrs.push(`opacity="${options.opacity}"`);
        }

        return `<text ${attrs.join(" ")}>${escapeXml(value)}</text>`;
    }

    function svgRoundedRect(x, y, width, height, options = {}) {
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${options.radius || 12}" fill="${options.fill || "none"}" stroke="${options.stroke || "none"}" stroke-width="${options.strokeWidth || 1}"/>`;
    }

    function svgCopyright(x, y, anchor, palette) {
        return svgText(x, y, "\u00a9 2026 Jam Tracks Hub. All rights reserved.", {
            fill: palette.muted,
            size: 14,
            weight: 800,
            anchor,
            opacity: "0.86"
        });
    }

    function svgDiagram(chordItem, x, y, palette) {
        const { parsed, voicing } = chordItem;
        const baseFret = diagramBaseFret(voicing.frets);
        const neckWidth = 172;
        const neckHeight = 176;
        const stringGap = neckWidth / 5;
        const fretGap = neckHeight / DIAGRAM_FRET_ROWS;
        const topY = y + 34;
        const leftX = x + 18;
        const parts = [];

        voicing.frets.forEach((fret, stringIndex) => {
            const stringX = leftX + stringIndex * stringGap;
            if (fret < 0) {
                parts.push(svgText(stringX, y + 20, "X", { fill: palette.text, size: 13, weight: 850, anchor: "middle" }));
                return;
            }

            if (fret === 0) {
                const tone = chordToneForPitch(TUNING_MIDI[stringIndex], parsed);
                parts.push(svgText(stringX, y + 12, "O", { fill: palette.muted, size: 11, weight: 850, anchor: "middle" }));
                if (tone) {
                    const tonePalette = palette.tone[tone.family] || palette.tone.other;
                    parts.push(`<rect x="${stringX - 13}" y="${y + 17}" width="26" height="17" rx="8.5" fill="${tonePalette.fill}" stroke="${tonePalette.stroke}" stroke-width="1"/>`);
                    parts.push(svgText(stringX, y + 30, tone.label, { fill: tonePalette.text, size: 10, weight: 850, anchor: "middle" }));
                }
            }
        });

        for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
            const stringX = leftX + stringIndex * stringGap;
            parts.push(`<line x1="${stringX}" y1="${topY}" x2="${stringX}" y2="${topY + neckHeight}" stroke="${palette.grid}" stroke-width="1"/>`);
        }

        for (let fretLine = 0; fretLine <= DIAGRAM_FRET_ROWS; fretLine += 1) {
            const fretY = topY + fretLine * fretGap;
            const strokeWidth = fretLine === 0 && baseFret === 1 ? 4 : 1;
            const stroke = fretLine === 0 && baseFret === 1 ? palette.nut : palette.grid;
            parts.push(`<line x1="${leftX}" y1="${fretY}" x2="${leftX + neckWidth}" y2="${fretY}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
        }

        if (baseFret > 1) {
            parts.push(svgText(leftX - 14, topY + 14, baseFret, { fill: palette.text, size: 13, weight: 850, anchor: "end" }));
        }

        voicing.frets.forEach((fret, stringIndex) => {
            if (fret <= 0) {
                return;
            }

            const row = fret - baseFret;
            if (row < 0 || row >= DIAGRAM_FRET_ROWS) {
                return;
            }

            const tone = chordToneForPitch(TUNING_MIDI[stringIndex] + fret, parsed);
            const stringX = leftX + stringIndex * stringGap;
            const markerY = topY + (row + 0.5) * fretGap;
            const tonePalette = palette.tone[tone?.family || "other"] || palette.tone.other;
            parts.push(`<circle cx="${stringX}" cy="${markerY}" r="15" fill="${tonePalette.ring}" opacity="0.42"/>`);
            parts.push(`<circle cx="${stringX}" cy="${markerY}" r="12" fill="${tonePalette.fill}" stroke="${tonePalette.stroke}" stroke-width="2"/>`);
            parts.push(svgText(stringX, markerY + 4, tone ? tone.label : "", { fill: tonePalette.text, size: 10, weight: 900, anchor: "middle" }));
        });

        STRING_NAMES.forEach((name, stringIndex) => {
            parts.push(svgText(leftX + stringIndex * stringGap, topY + neckHeight + 24, name, {
                fill: palette.muted,
                size: 13,
                weight: 850,
                anchor: "middle"
            }));
        });

        return parts.join("");
    }

    function svgScaledDiagram(chordItem, x, y, palette, scale) {
        return `<g transform="translate(${x} ${y}) scale(${scale})">${svgDiagram(chordItem, 0, 0, palette)}</g>`;
    }

    function svgChordCard(chordItem, x, y, width, height, palette) {
        const diagramScale = 0.88;
        const diagramX = x + width - 238;
        const diagramY = y + 26;

        return `
            ${svgRoundedRect(x, y, width, height, { fill: palette.card, stroke: palette.border, radius: 14 })}
            ${svgText(x + 24, y + 70, chordItem.parsed.symbol, { fill: palette.text, size: 32, weight: 900 })}
            ${svgScaledDiagram(chordItem, diagramX, diagramY, palette, diagramScale)}
        `;
    }

    function uniqueChordShapeItems(data) {
        const seen = new Set();
        const unique = [];

        data.sections.forEach(section => {
            section.chords.forEach(chordItem => {
                const fretsText = chordItem.voicing.frets.map(fret => fret < 0 ? "x" : fret).join(" ");
                const key = `${chordItem.parsed.symbol}|${fretsText}`;
                if (seen.has(key)) {
                    return;
                }

                seen.add(key);
                unique.push(chordItem);
            });
        });

        return unique;
    }

    function svgProgressionChip(chordItem, index, x, y, width, palette) {
        return `
            ${svgRoundedRect(x, y, width, 56, { fill: palette.card, stroke: palette.border, radius: 14 })}
            ${svgText(x + 18, y + 35, String(index + 1).padStart(2, "0"), { fill: palette.muted, size: 13, weight: 850 })}
            ${svgText(x + 58, y + 37, chordItem.parsed.symbol, { fill: palette.text, size: 22, weight: 900 })}
        `;
    }

    function compactShapeMetrics(width) {
        if (width < 230) {
            return { cardHeight: 174, rowHeight: 190, scale: 0.54, diagramOffsetX: width - 130, diagramOffsetY: 35, titleSize: 17 };
        }
        if (width < 320) {
            return { cardHeight: 204, rowHeight: 220, scale: 0.68, diagramOffsetX: width - 166, diagramOffsetY: 28, titleSize: 19 };
        }
        return { cardHeight: 222, rowHeight: 238, scale: 0.76, diagramOffsetX: width - 184, diagramOffsetY: 25, titleSize: 21 };
    }

    function svgCompactShapeCard(chordItem, x, y, width, palette) {
        const metrics = compactShapeMetrics(width);

        return `
            ${svgRoundedRect(x, y, width, metrics.cardHeight, { fill: palette.card, stroke: palette.border, radius: 14 })}
            ${svgText(x + 16, y + 32, chordItem.parsed.symbol, { fill: palette.text, size: metrics.titleSize, weight: 900 })}
            ${svgScaledDiagram(chordItem, x + metrics.diagramOffsetX, y + metrics.diagramOffsetY, palette, metrics.scale)}
        `;
    }

    function renderSeparatedSection(section, x, y, width, palette, startIndex, maxColumns = 3) {
        const gap = 14;
        const columns = Math.max(1, Math.min(maxColumns, section.chords.length || 1));
        const chipWidth = (width - gap * (columns - 1)) / columns;
        const rowHeight = 70;
        const parts = [
            svgText(x, y, section.title, { fill: palette.gold, size: 26, weight: 900 })
        ];
        const chipStartY = y + 24;

        section.chords.forEach(function(chordItem, index) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const chipX = x + column * (chipWidth + gap);
            const chipY = chipStartY + row * rowHeight;
            parts.push(svgProgressionChip(chordItem, startIndex + index, chipX, chipY, chipWidth, palette));
        });

        return {
            svg: parts.join(""),
            height: 30 + Math.ceil(section.chords.length / columns) * rowHeight
        };
    }

    function separatedProgressionHeight(data, maxColumns) {
        return data.sections.reduce(function(total, section) {
            const columns = Math.max(1, Math.min(maxColumns, section.chords.length || 1));
            return total + 30 + Math.ceil(section.chords.length / columns) * 70 + 20;
        }, 0);
    }

    function generateSeparatedProgressionSvg(data, palette, width, margin, bodyStartY) {
        const contentWidth = width - margin * 2;
        const uniqueShapes = uniqueChordShapeItems(data);
        const defaultLeftWidth = 710;
        const defaultGap = 32;
        const defaultRightWidth = contentWidth - defaultLeftWidth - defaultGap;
        const defaultShapeMetrics = compactShapeMetrics(defaultRightWidth);
        const defaultLeftBottom = bodyStartY + 38 + separatedProgressionHeight(data, 4);
        const defaultRightBottom = bodyStartY + 38 + uniqueShapes.length * defaultShapeMetrics.rowHeight;
        const shouldBalanceShapeColumns = uniqueShapes.length > 6 && defaultRightBottom - defaultLeftBottom > 360;
        const leftWidth = defaultLeftWidth;
        const columnGap = shouldBalanceShapeColumns ? 28 : defaultGap;
        const rightWidth = contentWidth - leftWidth - columnGap;
        const rightX = margin + leftWidth + columnGap;
        const shapeColumns = shouldBalanceShapeColumns ? 2 : 1;
        const shapeGap = shouldBalanceShapeColumns ? 18 : 0;
        const shapeCardWidth = (rightWidth - shapeGap * (shapeColumns - 1)) / shapeColumns;
        const shapeMetrics = compactShapeMetrics(shapeCardWidth);
        const body = [];
        let y = bodyStartY;
        let chordIndex = 0;
        let leftBottom = bodyStartY;
        let rightBottom = bodyStartY;

        body.push(svgText(margin, y, "Chord Progression", { fill: palette.gold, size: 28, weight: 900 }));
        body.push(svgText(rightX, y, "Chord Shapes", { fill: palette.gold, size: 28, weight: 900 }));
        y += 38;

        data.sections.forEach(function(section) {
            const rendered = renderSeparatedSection(section, margin, y, leftWidth, palette, chordIndex, 4);
            body.push(rendered.svg);
            chordIndex += section.chords.length;
            y += rendered.height + 20;
            leftBottom = Math.max(leftBottom, y - 20);
        });

        const shapeStartY = bodyStartY + 38;
        uniqueShapes.forEach(function(chordItem, index) {
            const column = index % shapeColumns;
            const row = Math.floor(index / shapeColumns);
            const shapeX = rightX + column * (shapeCardWidth + shapeGap);
            const shapeY = shapeStartY + row * shapeMetrics.rowHeight;
            body.push(svgCompactShapeCard(chordItem, shapeX, shapeY, shapeCardWidth, palette));
            rightBottom = Math.max(rightBottom, shapeY + shapeMetrics.cardHeight);
        });

        return {
            body: body.join(""),
            height: Math.max(leftBottom, rightBottom),
            leftBottom,
            rightBottom
        };
    }

    function separatedCopyrightPosition(separated, width, margin, height) {
        const footerY = height - 42;
        const minimumClearance = 44;
        const leftClearance = footerY - separated.leftBottom;
        const rightClearance = footerY - separated.rightBottom;
        const useLeft = rightClearance < minimumClearance && leftClearance >= rightClearance;

        return {
            x: useLeft ? margin : width - margin,
            anchor: useLeft ? "start" : "end",
            y: footerY,
            bestClearance: Math.max(leftClearance, rightClearance)
        };
    }

    function generateProgressionSvg(data) {
        const currentTheme = document.documentElement.dataset.theme || "default";
        const palette = currentTheme === "light"
            ? {
                bg: "#f7f4ef",
                panel: "#fffdf9",
                card: "#f5eee5",
                border: "#d8cbbd",
                text: "#2d2722",
                muted: "#6f665d",
                gold: "#93643f",
                teal: "#2d7b76",
                grid: "#9c948b",
                nut: "#6b4329",
                tone: {
                    root: { fill: "#2d7b76", stroke: "#9a6843", text: "#fffdf8", ring: "#2d7b76" },
                    third: { fill: "#9d6a3d", stroke: "#f5eee5", text: "#fffaf2", ring: "#9d6a3d" },
                    fifth: { fill: "#b88b56", stroke: "#f5eee5", text: "#fffaf2", ring: "#b88b56" },
                    seventh: { fill: "#b06b7a", stroke: "#f5eee5", text: "#fffaf2", ring: "#b06b7a" },
                    extension: { fill: "#7a8c74", stroke: "#f5eee5", text: "#fffaf2", ring: "#7a8c74" },
                    other: { fill: "#9a6843", stroke: "#f5eee5", text: "#fffaf2", ring: "#9a6843" }
                }
            }
            : {
                bg: "#101010",
                panel: "#181614",
                card: "#211d19",
                border: "#46392d",
                text: "#efe5d5",
                muted: "#b7aa9b",
                gold: "#e5d3b3",
                teal: "#7fb7ad",
                grid: "#8c8174",
                nut: "#e5d3b3",
                tone: {
                    root: { fill: "#e5d3b3", stroke: "#7fb7ad", text: "#2b211a", ring: "#e5d3b3" },
                    third: { fill: "#9f6b45", stroke: "#211d19", text: "#fffaf2", ring: "#9f6b45" },
                    fifth: { fill: "#7f8970", stroke: "#211d19", text: "#fffaf2", ring: "#7f8970" },
                    seventh: { fill: "#9a6472", stroke: "#211d19", text: "#fffaf2", ring: "#9a6472" },
                    extension: { fill: "#6f7964", stroke: "#211d19", text: "#fffaf2", ring: "#6f7964" },
                    other: { fill: "#7fb7ad", stroke: "#211d19", text: "#101010", ring: "#7fb7ad" }
                }
            };

        const width = separateDownloadToggle?.checked ? 1400 : 1200;
        const margin = 42;
        const gap = 24;
        const cardWidth = (width - margin * 2 - gap) / 2;
        const cardHeight = 252;
        const bodyStartY = 150;
        const bpmText = data.bpm ? `BPM ${data.bpm}` : "BPM not set";
        const subtitleParts = [bpmText, data.key, separateDownloadToggle?.checked ? "Progression / Shapes" : "Chord Progression"].filter(Boolean);
        const subtitleText = subtitleParts.join(" | ");

        if (separateDownloadToggle?.checked) {
            const separated = generateSeparatedProgressionSvg(data, palette, width, margin, bodyStartY);
            let height = Math.max(560, separated.height + 72);
            let copyrightPosition = separatedCopyrightPosition(separated, width, margin, height);
            if (copyrightPosition.bestClearance < 44) {
                height += 44 - copyrightPosition.bestClearance + 14;
                copyrightPosition = separatedCopyrightPosition(separated, width, margin, height);
            }

            return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${palette.bg}"/>
    ${svgRoundedRect(24, 24, width - 48, height - 48, { fill: palette.panel, stroke: palette.border, radius: 18 })}
    ${svgText(margin, 76, data.songName, { fill: palette.gold, size: 42, weight: 900, family: "Noto Serif TC, Georgia, serif" })}
    ${svgText(margin, 112, subtitleText, { fill: palette.teal, size: 18, weight: 850 })}
    ${svgText(width - margin, 112, "Jam Tracks Hub", { fill: palette.muted, size: 16, weight: 850, anchor: "end" })}
    ${separated.body}
    ${svgCopyright(copyrightPosition.x, copyrightPosition.y, copyrightPosition.anchor, palette)}
</svg>`;
        }

        let y = bodyStartY;
        const body = [];

        data.sections.forEach(function(section) {
            body.push(svgText(margin, y, section.title, { fill: palette.gold, size: 28, weight: 900 }));
            y += 26;
            section.chords.forEach(function(chordItem, index) {
                const column = index % 2;
                const row = Math.floor(index / 2);
                const x = margin + column * (cardWidth + gap);
                const cardY = y + row * (cardHeight + gap);
                body.push(svgChordCard(chordItem, x, cardY, cardWidth, cardHeight, palette));
            });
            y += Math.ceil(section.chords.length / 2) * (cardHeight + gap) + 34;
        });

        const height = Math.max(560, y + 58);
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${palette.bg}"/>
    ${svgRoundedRect(24, 24, width - 48, height - 48, { fill: palette.panel, stroke: palette.border, radius: 18 })}
    ${svgText(margin, 76, data.songName, { fill: palette.gold, size: 42, weight: 900, family: "Noto Serif TC, Georgia, serif" })}
    ${svgText(margin, 112, subtitleText, { fill: palette.teal, size: 18, weight: 850 })}
    ${svgText(width - margin, 112, "Jam Tracks Hub", { fill: palette.muted, size: 16, weight: 850, anchor: "end" })}
    ${body.join("")}
    ${svgCopyright(width - margin, height - 42, "end", palette)}
</svg>`;
    }

    async function downloadProgressionImage() {
        triggerDownloadButton();
        const data = collectDownloadProgression();
        if (data.error) {
            setStatus(data.error);
            return;
        }

        const svg = generateProgressionSvg(data);
        const filenameParts = [fileSafeName(data.songName)];
        if (data.key) {
            filenameParts.push(fileSafeName(data.key));
        }
        if (data.bpm) {
            filenameParts.push(`${fileSafeName(data.bpm)}bpm`);
        }
        filenameParts.push("progression");

        try {
            const pngBlob = await svgToPngBlob(svg);
            downloadBlob(pngBlob, `${filenameParts.join("-")}.png`);
            setStatus("Progression image downloaded.");
        } catch (error) {
            downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filenameParts.join("-")}.svg`);
            setStatus("Progression image downloaded as SVG.");
        }
    }

    function updatePressedState(container, selector, selectedValue) {
        if (!container) {
            return;
        }

        container.querySelectorAll(selector).forEach(button => {
            const value = button.dataset.pickerPosition || button.dataset.pickerRootString;
            const isSelected = value === selectedValue;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
        });
    }

    function resetShapePickerFilters() {
        shapePickerState.position = "all";
        shapePickerState.rootString = "all";
        updatePressedState(shapePositionFilter, "button[data-picker-position]", "all");
        updatePressedState(shapeRootFilter, "button[data-picker-root-string]", "all");
    }

    function filteredShapePickerVoicings() {
        return shapePickerState.voicings
            .map((voicing, index) => ({ voicing, index }))
            .filter(item => {
                const matchesPosition = shapePickerState.position === "all"
                    || nearestPositionTarget(item.voicing.frets) === Number(shapePickerState.position);
                const matchesRootString = voicingHasRootOnString(
                    item.voicing.frets,
                    shapePickerState.rootString,
                    shapePickerState.parsed
                );

                return matchesPosition && matchesRootString;
            });
    }

    function renderShapePicker() {
        if (!shapePickerGrid || !shapePickerCount || !shapePickerState.parsed) {
            return;
        }

        const filtered = filteredShapePickerVoicings();
        const total = shapePickerState.voicings.length;
        const hasActiveFilter = shapePickerState.position !== "all" || shapePickerState.rootString !== "all";
        const positionLabel = shapePickerState.position === "all"
            ? "all positions"
            : `near fret ${shapePickerState.position}`;
        const rootStringLabelText = shapePickerState.rootString === "all"
            ? "any root string"
            : `root on ${rootStringLabel(shapePickerState.rootString)}`;

        shapePickerCount.textContent = hasActiveFilter
            ? `${filtered.length} of ${total} shapes matching ${positionLabel}, ${rootStringLabelText}`
            : `${total} ${total === 1 ? "shape" : "shapes"} found`;

        if (!filtered.length) {
            shapePickerGrid.innerHTML = `
                <div class="dictionary-empty progression-writer-shape-picker-empty">
                    <strong>No shapes found for ${escapeHtml(positionLabel)} with ${escapeHtml(rootStringLabelText)}.</strong>
                    <span>Choose another fret area, root string, or select All.</span>
                </div>
            `;
            return;
        }

        shapePickerGrid.innerHTML = filtered.map(item =>
            renderDiagram(shapePickerState.parsed, item.voicing, item.index, total, {
                action: "select",
                variant: "picker",
                shapeIndex: item.index
            })
        ).join("");
    }

    function openShapePicker(input) {
        if (!shapePicker) {
            return;
        }

        const parsed = parseChordSymbolInput(input.value);
        if (!parsed) {
            renderFieldShape(input);
            return;
        }

        const voicings = generateVoicings(parsed);
        if (!voicings.length) {
            renderFieldShape(input);
            return;
        }

        shapePickerState.input = input;
        shapePickerState.parsed = parsed;
        shapePickerState.voicings = voicings;
        resetShapePickerFilters();

        if (shapePickerChord) {
            shapePickerChord.textContent = parsed.symbol;
        }

        shapePicker.hidden = false;
        document.body.classList.add("is-shape-picker-open");
        renderShapePicker();
        shapePicker.querySelector("button[data-close-shape-picker]")?.focus();
    }

    function closeShapePicker() {
        if (!shapePicker || shapePicker.hidden) {
            return;
        }

        shapePicker.hidden = true;
        document.body.classList.remove("is-shape-picker-open");
        shapePickerState.input?.focus();
    }

    function selectShapeFromPicker(shapeIndex) {
        const input = shapePickerState.input;
        if (!input || !Number.isInteger(shapeIndex)) {
            return;
        }

        const field = input.closest(".progression-writer-chord-field");
        if (field) {
            field.dataset.shapeIndex = String(shapeIndex);
        }
        renderFieldShape(input, shapeIndex);
        closeShapePicker();
    }

    function readSectionChords(sectionName) {
        const inputs = Array.from(form.querySelectorAll(`[data-chord-list="${sectionName}"] input`));
        const chords = [];
        const invalid = [];

        inputs.forEach(function(input) {
            const raw = input.value.trim();
            if (!raw) {
                return;
            }

            const normalized = normalizeChordSymbol(raw);
            if (!normalized) {
                invalid.push(raw);
                return;
            }

            input.value = normalized;
            chords.push({
                symbol: normalized,
                shapeIndex: normalizeShapeIndex(input.closest(".progression-writer-chord-field")?.dataset.shapeIndex)
            });
        });

        return { chords, invalid };
    }

    function addChordField(sectionName, options = {}) {
        const list = form.querySelector(`[data-chord-list="${sectionName}"]`);
        if (!list) {
            return;
        }

        const count = list.querySelectorAll(".progression-writer-chord-field").length + 1;
        const inputName = sectionName === "single" ? "singleChord" : `${sectionName}Chord`;
        const field = document.createElement("div");
        field.className = "progression-writer-chord-field";
        field.innerHTML = `
            <label><span>Chord ${count}</span><input type="text" name="${escapeHtml(inputName)}" autocomplete="off" placeholder="Chord"></label>
            <div class="progression-writer-shape-preview" data-shape-preview></div>
        `;
        list.appendChild(field);
        const input = field.querySelector("input");
        const value = options.value || "";
        const shapeIndex = normalizeShapeIndex(options.shapeIndex);
        if (input && value) {
            input.value = value;
            field.dataset.shapeIndex = String(shapeIndex);
            renderFieldShape(input, shapeIndex);
        }
        if (options.focus !== false) {
            input?.focus();
        }
    }

    function renumberChordFields(list) {
        list.querySelectorAll(".progression-writer-chord-field").forEach(function(field, index) {
            const label = field.querySelector("label > span");
            if (label) {
                label.textContent = `Chord ${index + 1}`;
            }
        });
    }

    function deleteChordField(sectionName) {
        const list = form.querySelector(`[data-chord-list="${sectionName}"]`);
        if (!list) {
            return;
        }

        const fields = Array.from(list.querySelectorAll(".progression-writer-chord-field"));
        const lastField = fields[fields.length - 1];
        if (!lastField) {
            return;
        }

        if (fields.length === 1) {
            const input = lastField.querySelector("input");
            const preview = lastField.querySelector("[data-shape-preview]");
            if (input) {
                input.value = "";
                input.focus();
            }
            lastField.removeAttribute("data-shape-index");
            if (preview) {
                preview.innerHTML = "";
            }
            setStatus("Last chord cleared.");
            return;
        }

        lastField.remove();
        renumberChordFields(list);
        list.querySelector(".progression-writer-chord-field:last-child input")?.focus();
        setStatus("Chord deleted.");
    }

    function clearChordField(field) {
        const input = field.querySelector("input");
        const preview = field.querySelector("[data-shape-preview]");
        if (input) {
            input.value = "";
        }
        field.removeAttribute("data-shape-index");
        if (preview) {
            preview.innerHTML = "";
        }
    }

    function ensureChordFieldCount(sectionName, count) {
        const list = form.querySelector(`[data-chord-list="${sectionName}"]`);
        if (!list) {
            return;
        }

        let fields = Array.from(list.querySelectorAll(".progression-writer-chord-field"));
        while (fields.length < count) {
            addChordField(sectionName, { focus: false });
            fields = Array.from(list.querySelectorAll(".progression-writer-chord-field"));
        }

        while (fields.length > count && fields.length > 1) {
            fields[fields.length - 1].remove();
            fields = Array.from(list.querySelectorAll(".progression-writer-chord-field"));
        }

        renumberChordFields(list);
    }

    function applySectionChords(sectionName, chords, minimumCount = 4) {
        const normalizedChords = normalizeChordItems(chords);
        const list = form.querySelector(`[data-chord-list="${sectionName}"]`);
        if (!list) {
            return;
        }

        ensureChordFieldCount(sectionName, Math.max(minimumCount, normalizedChords.length));
        Array.from(list.querySelectorAll(".progression-writer-chord-field")).forEach(function(field, index) {
            const input = field.querySelector("input");
            const chord = normalizedChords[index];
            if (!input) {
                return;
            }

            if (!chord) {
                clearChordField(field);
                return;
            }

            input.value = chord.symbol;
            field.dataset.shapeIndex = String(normalizeShapeIndex(chord.shapeIndex));
            renderFieldShape(input, normalizeShapeIndex(chord.shapeIndex));
        });
    }

    function summarizeChordItems(items) {
        const chords = normalizeChordItems(items);
        return chords.length ? chords.map(item => item.symbol).join(" - ") : "";
    }

    function progressionRecordTitle(item) {
        return item.mode === "sections" ? "With Verse & Chorus" : "Chord Progression";
    }

    function applyProgressionRecord(record) {
        const item = normalizeSavedRecord(record);
        if (!item) {
            setStatus("Could not load that saved progression.");
            return;
        }

        activeSavedProgressionId = item.id;
        structureToggle.checked = item.mode === "sections";
        if (songNameInput) {
            songNameInput.value = item.songName;
        }
        if (keyRootSelect) {
            keyRootSelect.value = item.keyRoot;
        }
        if (keyQualityToggle) {
            keyQualityToggle.checked = item.keyQuality === "minor";
        }
        if (bpmInput) {
            bpmInput.value = item.bpm;
        }
        if (separateDownloadToggle) {
            separateDownloadToggle.checked = item.separateDownload;
        }

        syncMode();
        applySectionChords("single", item.sections.single);
        applySectionChords("verse", item.sections.verse);
        applySectionChords("chorus", item.sections.chorus);
        renderSavedProgressions();
        setStatus("Saved progression loaded.");
    }

    function clearCurrentProgression() {
        activeSavedProgressionId = null;
        if (songNameInput) {
            songNameInput.value = "";
        }
        if (bpmInput) {
            bpmInput.value = "";
        }
        if (separateDownloadToggle) {
            separateDownloadToggle.checked = false;
        }
        applySectionChords("single", []);
        applySectionChords("verse", []);
        applySectionChords("chorus", []);
        renderSavedProgressions();
        setStatus("Progression cleared.");
    }

    function duplicateProgression(record) {
        const source = normalizeSavedRecord(record);
        if (!source) {
            setStatus("Pick or save a progression before duplicating.");
            return;
        }

        const now = new Date().toISOString();
        const copy = {
            ...source,
            id: createProgressionId(),
            createdAt: now,
            updatedAt: now,
            songName: source.songName ? `${source.songName} Copy` : ""
        };
        const saved = getSavedProgressions();
        saved.unshift(copy);
        writeSavedProgressions(saved.slice(0, 12));
        applyProgressionRecord(copy);
        setStatus("Progression duplicated.");
    }

    function exportProgressionJson(record) {
        const item = normalizeSavedRecord(record);
        if (!item) {
            setStatus("Add at least one chord before exporting.");
            return;
        }

        const filenameBase = item.songName || item.key || "custom-progression";
        const blob = new Blob([JSON.stringify(item, null, 2)], { type: "application/json;charset=utf-8" });
        downloadBlob(blob, `${fileSafeName(filenameBase)}-progression.json`);
    }

    function selectedSavedRecord() {
        return findSavedProgression(savedPicker?.value || activeSavedProgressionId);
    }

    function buildProgressionRecord(existingRecord) {
        const mode = getMode();
        const now = new Date().toISOString();
        const existing = existingRecord ? normalizeSavedRecord(existingRecord) : null;
        const songName = songNameInput?.value.trim() || "";
        const keyRoot = keyRootSelect?.value || "A";
        const keyQuality = keyQualityToggle?.checked ? "minor" : "major";
        const key = selectedKeyLabel();
        const bpm = bpmInput?.value.trim() || "";
        const separateDownload = Boolean(separateDownloadToggle?.checked);

        if (mode === "sections") {
            const verseResult = readSectionChords("verse");
            const chorusResult = readSectionChords("chorus");
            const invalid = [...verseResult.invalid, ...chorusResult.invalid];
            if (invalid.length) {
                return { error: `Could not read: ${invalid.join(", ")}` };
            }
            if (!verseResult.chords.length && !chorusResult.chords.length) {
                return null;
            }

            return {
                id: existing?.id || createProgressionId(),
                mode,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
                songName,
                keyRoot,
                keyQuality,
                key,
                bpm,
                separateDownload,
                sections: {
                    single: existing?.sections.single || [],
                    verse: verseResult.chords,
                    chorus: chorusResult.chords
                }
            };
        }

        const singleResult = readSectionChords("single");
        if (singleResult.invalid.length) {
            return { error: `Could not read: ${singleResult.invalid.join(", ")}` };
        }
        if (!singleResult.chords.length) {
            return null;
        }

        return {
            id: existing?.id || createProgressionId(),
            mode,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            songName,
            keyRoot,
            keyQuality,
            key,
            bpm,
            separateDownload,
            sections: {
                single: singleResult.chords,
                verse: existing?.sections.verse || [],
                chorus: existing?.sections.chorus || []
            }
        };
    }

    function formatSavedProgression(item) {
        const record = normalizeSavedRecord(item);
        const meta = [
            record.songName ? escapeHtml(record.songName) : "",
            record.key ? escapeHtml(record.key) : "",
            record.bpm ? `${escapeHtml(record.bpm)} BPM` : ""
        ].filter(Boolean).join(" | ");
        const metaLine = meta ? `<span>${meta}</span>` : "";

        if (record.mode === "sections") {
            const verse = summarizeChordItems(record.sections.verse) || "No verse chords";
            const chorus = summarizeChordItems(record.sections.chorus) || "No chorus chords";
            return `
                <strong>${progressionRecordTitle(record)}</strong>
                ${metaLine}
                <span>Verse: ${escapeHtml(verse)}</span>
                <span>Chorus: ${escapeHtml(chorus)}</span>
            `;
        }

        return `
            <strong>${progressionRecordTitle(record)}</strong>
            ${metaLine}
            <span>${escapeHtml(summarizeChordItems(record.sections.single) || "No chords")}</span>
        `;
    }

    function renderSavedProgressions() {
        const saved = getSavedProgressions();
        const activeExists = saved.some(item => item.id === activeSavedProgressionId);
        if (!activeExists) {
            activeSavedProgressionId = null;
        }

        if (savedCount) {
            savedCount.textContent = saved.length
                ? `${saved.length} saved ${saved.length === 1 ? "progression" : "progressions"}`
                : "No saved progressions";
        }

        if (savedPicker) {
            savedPicker.disabled = !saved.length;
            savedPicker.innerHTML = saved.length
                ? saved.map(item => {
                    const label = [
                        item.songName || progressionRecordTitle(item),
                        item.key,
                        item.bpm ? `${item.bpm} BPM` : ""
                    ].filter(Boolean).join(" | ");
                    return `<option value="${escapeHtml(item.id)}">${escapeHtml(label)}</option>`;
                }).join("")
                : '<option value="">No saved progressions yet</option>';
            savedPicker.value = activeSavedProgressionId || saved[0]?.id || "";
        }

        if (loadSavedButton) {
            loadSavedButton.disabled = !saved.length;
        }

        if (!saved.length) {
            savedList.innerHTML = '<p class="saved-progression-empty">No saved progressions yet.</p>';
            return;
        }

        savedList.innerHTML = saved.map(function(item) {
            return `
                <article class="progression-writer-saved-item${item.id === activeSavedProgressionId ? " is-active" : ""}">
                    <div class="progression-writer-saved-summary">
                        ${formatSavedProgression(item)}
                    </div>
                    <div class="progression-writer-saved-item-actions">
                        <button class="secondary-button" type="button" data-load-progression="${escapeHtml(item.id)}"><span>Load</span></button>
                        <button class="secondary-button" type="button" data-duplicate-progression="${escapeHtml(item.id)}"><span>Duplicate</span></button>
                        <button class="secondary-button" type="button" data-export-progression="${escapeHtml(item.id)}"><span>JSON</span></button>
                        <button class="secondary-button saved-progression-delete" type="button" data-delete-progression="${escapeHtml(item.id)}"><span>Delete</span></button>
                    </div>
                </article>
            `;
        }).join("");
    }

    structureToggle.addEventListener("change", syncMode);

    downloadButton?.addEventListener("click", downloadProgressionImage);

    form.addEventListener("click", function(event) {
        const addButton = event.target.closest("[data-add-chord]");
        if (addButton) {
            addChordField(addButton.dataset.addChord);
            return;
        }

        const deleteChordButton = event.target.closest("[data-delete-chord]");
        if (deleteChordButton) {
            deleteChordField(deleteChordButton.dataset.deleteChord);
            return;
        }

        const shapeButton = event.target.closest("[data-open-shape-picker]");
        if (shapeButton) {
            const field = shapeButton.closest(".progression-writer-chord-field");
            const input = field?.querySelector("input");
            if (input) {
                openShapePicker(input);
            }
        }
    });

    shapePicker?.addEventListener("click", function(event) {
        if (event.target.closest("[data-close-shape-picker]")) {
            closeShapePicker();
            return;
        }

        const positionButton = event.target.closest("button[data-picker-position]");
        if (positionButton) {
            shapePickerState.position = positionButton.dataset.pickerPosition;
            updatePressedState(shapePositionFilter, "button[data-picker-position]", shapePickerState.position);
            renderShapePicker();
            return;
        }

        const rootButton = event.target.closest("button[data-picker-root-string]");
        if (rootButton) {
            shapePickerState.rootString = rootButton.dataset.pickerRootString;
            updatePressedState(shapeRootFilter, "button[data-picker-root-string]", shapePickerState.rootString);
            renderShapePicker();
            return;
        }

        const shapeCard = event.target.closest("[data-select-shape-index]");
        if (shapeCard) {
            selectShapeFromPicker(Number(shapeCard.dataset.selectShapeIndex));
        }
    });

    shapePicker?.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeShapePicker();
            return;
        }

        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        const shapeCard = event.target.closest("[data-select-shape-index]");
        if (shapeCard) {
            event.preventDefault();
            selectShapeFromPicker(Number(shapeCard.dataset.selectShapeIndex));
        }
    });

    form.addEventListener("blur", function(event) {
        if (!event.target.matches(".progression-writer-chord-field input")) {
            return;
        }

        const normalized = normalizeChordSymbol(event.target.value);
        if (normalized) {
            event.target.value = normalized;
        }
        renderFieldShape(event.target);
    }, true);

    form.addEventListener("input", function(event) {
        if (!event.target.matches(".progression-writer-chord-field input")) {
            return;
        }

        event.target.closest(".progression-writer-chord-field")?.removeAttribute("data-shape-index");
        renderFieldShape(event.target, 0);
    });

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        const saved = getSavedProgressions();
        const existingRecord = activeSavedProgressionId
            ? saved.find(item => item.id === activeSavedProgressionId)
            : null;
        const record = buildProgressionRecord(existingRecord);
        if (!record) {
            setStatus("Add at least one chord before saving.");
            return;
        }
        if (record.error) {
            setStatus(record.error);
            return;
        }

        const existingIndex = saved.findIndex(item => item.id === record.id);
        if (existingIndex >= 0) {
            saved[existingIndex] = record;
        } else {
            saved.unshift(record);
        }
        activeSavedProgressionId = record.id;
        writeSavedProgressions(saved.slice(0, 12));
        renderSavedProgressions();
        setStatus(existingIndex >= 0 ? "Saved progression updated." : "Progression saved.");
    });

    savedPicker?.addEventListener("change", function() {
        const record = findSavedProgression(savedPicker.value);
        if (record) {
            applyProgressionRecord(record);
        }
    });

    loadSavedButton?.addEventListener("click", function() {
        const record = selectedSavedRecord();
        if (!record) {
            setStatus("Pick a saved progression first.");
            return;
        }
        applyProgressionRecord(record);
    });

    duplicateSavedButton?.addEventListener("click", function() {
        const selected = selectedSavedRecord();
        if (selected) {
            duplicateProgression(selected);
            return;
        }

        const record = buildProgressionRecord();
        if (!record) {
            setStatus("Add at least one chord before duplicating.");
            return;
        }
        if (record.error) {
            setStatus(record.error);
            return;
        }
        duplicateProgression(record);
    });

    clearWriterButton?.addEventListener("click", clearCurrentProgression);

    exportJsonButton?.addEventListener("click", function() {
        const existingRecord = activeSavedProgressionId
            ? findSavedProgression(activeSavedProgressionId)
            : null;
        const record = buildProgressionRecord(existingRecord);
        if (!record) {
            setStatus("Add at least one chord before exporting.");
            return;
        }
        if (record.error) {
            setStatus(record.error);
            return;
        }
        exportProgressionJson(record);
        setStatus("Progression JSON exported.");
    });

    savedList.addEventListener("click", function(event) {
        const loadButton = event.target.closest("[data-load-progression]");
        if (loadButton) {
            const record = findSavedProgression(loadButton.dataset.loadProgression);
            if (record) {
                applyProgressionRecord(record);
            }
            return;
        }

        const duplicateButton = event.target.closest("[data-duplicate-progression]");
        if (duplicateButton) {
            const record = findSavedProgression(duplicateButton.dataset.duplicateProgression);
            if (record) {
                duplicateProgression(record);
            }
            return;
        }

        const exportButton = event.target.closest("[data-export-progression]");
        if (exportButton) {
            const record = findSavedProgression(exportButton.dataset.exportProgression);
            if (record) {
                exportProgressionJson(record);
                setStatus("Progression JSON exported.");
            }
            return;
        }

        const deleteButton = event.target.closest("[data-delete-progression]");
        if (!deleteButton) {
            return;
        }

        const deleteId = deleteButton.dataset.deleteProgression;
        const nextSaved = getSavedProgressions().filter(item => item.id !== deleteId);
        if (activeSavedProgressionId === deleteId) {
            activeSavedProgressionId = null;
        }
        writeSavedProgressions(nextSaved);
        renderSavedProgressions();
        setStatus("Saved progression deleted.");
    });

    syncMode();
    renderSavedProgressions();
});
