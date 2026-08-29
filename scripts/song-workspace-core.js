(function(root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.JamSongCore = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
    "use strict";

    const SCHEMA = "jamtrackshub-song";
    const VERSION = 2;
    const MAX_SOURCE_LENGTH = 200000;
    const MAX_SECTIONS = 200;
    const MAX_LINES = 2000;
    const MAX_LINES_PER_SECTION = 500;
    const MAX_LINE_LENGTH = 1000;
    const MAX_CHORDS_PER_LINE = 64;
    const MAX_CHORDS_PER_BAR = 16;
    const MAX_CHORDS = 10000;
    const INSTRUMENTAL_BARS = Object.freeze({ default: 4, min: 1, max: 64 });
    const OPAQUE_SONG_ID = /^song-(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[a-z0-9]{8,}-[a-z0-9]{6,})$/i;
    const AUTO_SCROLL = Object.freeze({
        pixelsPerBeat: 24,
        defaultPixelsPerSecond: 48,
        minPixelsPerSecond: 18,
        maxPixelsPerSecond: 96,
        minMultiplier: 0.5,
        maxMultiplier: 2
    });
    const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const MAJOR_KEY_OPTIONS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"];
    const MINOR_KEY_OPTIONS = ["Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Abm", "Am", "Bbm", "Bm"];
    const CHORD_SPELLING = Object.freeze({ THEORY: "theory", PRESERVE: "preserve" });
    const NOTE_PITCH = {
        C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4,
        "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8,
        A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0
    };
    const FLAT_KEY_ROOTS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "Abm"]);
    const SECTION_ALIASES = {
        verse: "verse", v: "verse", chorus: "chorus", c: "chorus",
        prechorus: "pre-chorus", "pre-chorus": "pre-chorus", bridge: "bridge",
        intro: "intro", outro: "outro", instrumental: "instrumental", solo: "instrumental",
        interlude: "instrumental", refrain: "chorus", tag: "tag"
    };
    const SECTION_TITLES = {
        verse: "Verse", chorus: "Chorus", "pre-chorus": "Pre-Chorus", bridge: "Bridge",
        intro: "Intro", outro: "Outro", instrumental: "Instrumental", tag: "Tag", section: "Section"
    };
    const VALID_SECTION_TYPES = new Set(Object.keys(SECTION_TITLES));
    const VALID_LINE_TYPES = new Set(["lyric", "instrumental"]);
    const VALID_SUFFIX = /^(?:m|minor|maj|major|dim|°|aug|\+|sus2|sus4|sus|5|6|m6|7|maj7|M7|Δ7|m7|mMaj7|m\(maj7\)|m7b5|ø7|dim7|°7|add9|madd9|m\(add9\)|6\/9|9|maj9|M9|m9|11|m11|13|maj13|m13|7sus4|9sus4|7b5|7#5|7b9|7#9|7#11|7b13|13b9|7\((?:b5|#5|b9|#9|#11|b13)(?:,(?:b5|#5|b9|#9|#11|b13))*\)|alt)?$/i;
    const ROMAN_BASE = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
    const NASHVILLE_BASE = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];

    function uid(prefix) {
        const random = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        return `${prefix || "id"}-${random}`;
    }

    function isOpaqueSongId(value) {
        return OPAQUE_SONG_ID.test(String(value || ""));
    }

    function songWorkspaceUrl(songId) {
        return isOpaqueSongId(songId)
            ? `song-workspace.html?song=${encodeURIComponent(String(songId))}`
            : "song-workspace.html";
    }

    function codePoints(value) {
        return Array.from(String(value || ""));
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, Number(value) || 0));
    }

    function baseScrollSpeedForBpm(value) {
        const bpm = Number(value);
        if (!Number.isFinite(bpm) || bpm <= 0) return AUTO_SCROLL.defaultPixelsPerSecond;
        return Math.min(
            AUTO_SCROLL.maxPixelsPerSecond,
            Math.max(AUTO_SCROLL.minPixelsPerSecond, (bpm / 60) * AUTO_SCROLL.pixelsPerBeat)
        );
    }

    function normalizeScrollSpeedMultiplier(value) {
        const multiplier = Number(value);
        if (!Number.isFinite(multiplier) || multiplier <= 0) return 1;
        return Math.min(AUTO_SCROLL.maxMultiplier, Math.max(AUTO_SCROLL.minMultiplier, multiplier));
    }

    function effectiveScrollSpeed(value, multiplier) {
        return baseScrollSpeedForBpm(value) * normalizeScrollSpeedMultiplier(multiplier);
    }

    function scrollDistanceForElapsed(value, multiplier, elapsedMilliseconds) {
        const elapsed = Number(elapsedMilliseconds);
        if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
        return effectiveScrollSpeed(value, multiplier) * elapsed / 1000;
    }

    function normalizeAccidentals(value) {
        return String(value || "").replace(/♯/g, "#").replace(/♭/g, "b").replace(/−/g, "-");
    }

    function pitchFor(note) {
        const normalized = normalizeAccidentals(note);
        return Object.prototype.hasOwnProperty.call(NOTE_PITCH, normalized) ? NOTE_PITCH[normalized] : null;
    }

    function normalizeKey(value, fallback) {
        const clean = normalizeAccidentals(value).trim();
        const match = clean.match(/^([A-G](?:#|b)?)(?:\s*(major|minor|maj|min|m))?$/i);
        if (!match) {
            return fallback || "C";
        }
        const rootName = match[1][0].toUpperCase() + match[1].slice(1);
        const quality = (match[2] || "").toLowerCase();
        return `${rootName}${quality === "minor" || quality === "min" || quality === "m" ? "m" : ""}`;
    }

    function normalizeChordSpelling(value) {
        return value === CHORD_SPELLING.PRESERVE ? CHORD_SPELLING.PRESERVE : CHORD_SPELLING.THEORY;
    }

    function spellKeyForMode(value, spelling, fallback) {
        const key = normalizeKey(value, fallback);
        if (normalizeChordSpelling(spelling) === CHORD_SPELLING.PRESERVE) return key;
        const theoryAliases = {
            Cb: "B", Fb: "E", "E#": "F", "B#": "C",
            Dbm: "C#m", Gbm: "F#m", "A#m": "Bbm", Cbm: "Bm", Fbm: "Em", "E#m": "Fm", "B#m": "Cm"
        };
        return theoryAliases[key] || key;
    }

    function parseChordSymbol(value) {
        const raw = normalizeAccidentals(value).trim().replace(/[.,;:!?]+$/, "");
        if (!raw || raw.length > 40) {
            return null;
        }
        const match = raw.match(/^([A-Ga-g])([#b]?)([^/\s]*)(?:\/([A-Ga-g])([#b]?))?$/);
        if (!match) {
            return null;
        }
        const rootName = match[1].toUpperCase() + match[2];
        const suffix = match[3] || "";
        const bass = match[4] ? match[4].toUpperCase() + (match[5] || "") : "";
        if (pitchFor(rootName) === null || (bass && pitchFor(bass) === null) || !VALID_SUFFIX.test(suffix)) {
            return null;
        }
        return {
            raw,
            root: rootName,
            rootPitch: pitchFor(rootName),
            suffix,
            bass: bass || null,
            bassPitch: bass ? pitchFor(bass) : null,
            quality: chordQuality(suffix),
            extension: (suffix.match(/(?:maj|M|Δ)?(6|7|9|11|13)/i) || [])[1] || null,
            alterations: suffix.match(/[b#](?:5|9|11|13)/gi) || []
        };
    }

    function chordQuality(suffix) {
        const clean = String(suffix || "").toLowerCase();
        if (/^(?:m(?!aj)|minor|dim|°|ø)/.test(clean)) {
            return clean.includes("dim") || clean.includes("°") || clean.includes("ø") ? "diminished" : "minor";
        }
        if (/^(?:aug|\+)/.test(clean)) {
            return "augmented";
        }
        return "major";
    }

    function noteNameForPitch(pitch, keyHint) {
        const key = normalizeKey(keyHint || "C");
        return (FLAT_KEY_ROOTS.has(key) || String(keyHint || "").includes("b") ? FLAT_NOTES : SHARP_NOTES)[((pitch % 12) + 12) % 12];
    }

    function transposeChord(symbol, semitones, keyHint, spelling, preserveSource) {
        const parsed = parseChordSymbol(symbol);
        if (!parsed) {
            return symbol;
        }
        const mode = normalizeChordSpelling(spelling);
        if (mode === CHORD_SPELLING.PRESERVE && preserveSource && ((Number(semitones) || 0) % 12 === 0)) {
            return parsed.raw;
        }
        const rootName = noteNameForPitch(parsed.rootPitch + semitones, keyHint);
        const bassName = parsed.bass ? noteNameForPitch(parsed.bassPitch + semitones, keyHint) : "";
        return `${rootName}${parsed.suffix}${bassName ? `/${bassName}` : ""}`;
    }

    function intervalBetween(fromKey, toKey) {
        const from = pitchFor(normalizeKey(fromKey).replace(/m$/, ""));
        const to = pitchFor(normalizeKey(toKey).replace(/m$/, ""));
        return from === null || to === null ? 0 : (to - from + 12) % 12;
    }

    function createChord(symbol, anchorPosition) {
        return {
            id: uid("chord"),
            symbol: String(symbol || "").trim(),
            anchorPosition: Math.max(0, Math.floor(Number(anchorPosition) || 0))
        };
    }

    function createLine(text, chords, type, id) {
        const lineText = String(text || "").slice(0, MAX_LINE_LENGTH);
        const lineType = type || "lyric";
        const positionCount = meaningfulPositionCount(lineText);
        const chordLimit = lineType === "instrumental" ? MAX_CHORDS_PER_BAR : MAX_CHORDS_PER_LINE;
        return {
            id: id || uid("line"),
            type: lineType,
            text: lineText,
            chords: (Array.isArray(chords) ? chords : []).slice(0, chordLimit).map(function(chord) {
                const position = Math.max(0, Math.floor(Number(chord.anchorPosition) || 0));
                return {
                    id: chord.id || uid("chord"),
                    symbol: String(chord.symbol || "").slice(0, 40),
                    anchorPosition: lineType === "lyric" && positionCount
                        ? clamp(position, 0, positionCount - 1)
                        : position
                };
            }).filter(function(chord) {
                return Boolean(parseChordSymbol(chord.symbol));
            })
        };
    }

    function isCjkCharacter(character) {
        return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(character);
    }

    function tokenizeLyric(value) {
        const characters = codePoints(value);
        const tokens = [];
        let index = 0;
        let positionIndex = 0;
        while (index < characters.length) {
            const start = index;
            let kind;
            if (/\s/u.test(characters[index])) {
                kind = "space";
                while (index < characters.length && /\s/u.test(characters[index])) index += 1;
            } else if (isCjkCharacter(characters[index])) {
                kind = "cjk";
                index += 1;
            } else {
                while (index < characters.length && !/\s/u.test(characters[index]) && !isCjkCharacter(characters[index])) {
                    index += 1;
                }
                const unit = characters.slice(start, index).join("");
                kind = /[\p{L}\p{N}\p{M}]/u.test(unit) ? "word" : "punctuation";
            }
            const meaningful = kind === "word" || kind === "cjk";
            tokens.push({
                id: `token-${start}`,
                start,
                end: index,
                text: characters.slice(start, index).join(""),
                kind,
                meaningful,
                positionIndex: meaningful ? positionIndex : null
            });
            if (meaningful) positionIndex += 1;
        }
        return tokens;
    }

    function meaningfulPositionCount(value) {
        return tokenizeLyric(value).filter(function(token) { return token.meaningful; }).length;
    }

    function resolveAnchorToken(value, anchorPosition) {
        const tokens = Array.isArray(value) ? value : tokenizeLyric(value);
        const meaningful = tokens.filter(function(token) { return token.meaningful; });
        if (!meaningful.length) return null;
        return meaningful[clamp(Math.floor(Number(anchorPosition) || 0), 0, meaningful.length - 1)];
    }

    function positionIndexForCharacterOffset(value, offset) {
        const tokens = tokenizeLyric(value).filter(function(token) { return token.meaningful; });
        if (!tokens.length) return 0;
        const target = clamp(offset, 0, codePoints(value).length);
        const containing = tokens.find(function(token) { return target >= token.start && target < token.end; });
        if (containing) return containing.positionIndex;
        return tokens.reduce(function(nearest, token) {
            const distance = Math.abs(token.start - target);
            const nearestDistance = Math.abs(nearest.start - target);
            return distance < nearestDistance || (distance === nearestDistance && token.start >= target) ? token : nearest;
        }, tokens[0]).positionIndex;
    }

    function layoutLyricLine(line) {
        const source = line || {};
        const text = String(source.text || "").slice(0, MAX_LINE_LENGTH);
        const positionCount = meaningfulPositionCount(text);
        const normalized = {
            text,
            chords: (Array.isArray(source.chords) ? source.chords : []).map(function(chord) {
                return {
                    id: chord.id || uid("chord"),
                    symbol: String(chord.symbol || "").slice(0, 40),
                    anchorPosition: positionCount
                        ? clamp(Math.floor(Number(chord.anchorPosition) || 0), 0, positionCount - 1)
                        : Math.max(0, Math.floor(Number(chord.anchorPosition) || 0))
                };
            }).filter(function(chord) {
                return Boolean(chord.symbol);
            })
        };
        const tokens = tokenizeLyric(normalized.text).map(function(token) {
            return Object.assign({}, token, { chords: [] });
        });
        const unanchored = [];
        normalized.chords.slice().sort(function(a, b) {
            return a.anchorPosition - b.anchorPosition;
        }).forEach(function(chord) {
            const target = resolveAnchorToken(tokens, chord.anchorPosition);
            if (target) target.chords.push(Object.assign({}, chord));
            else unanchored.push(Object.assign({}, chord));
        });
        return { text: normalized.text, tokens, unanchored };
    }

    function fitSingleRowChordAnnotations(items, minimumGap, minimumScale) {
        const gap = Math.max(0, Number(minimumGap) || 0);
        const scaleFloor = Math.min(1, Math.max(0.5, Number(minimumScale) || 0.6));
        const normalized = (Array.isArray(items) ? items : []).map(function(item) {
            return Object.assign({}, item, {
                left: Math.max(0, Number(item.left) || 0),
                width: Math.max(0, Number(item.width) || 0)
            });
        });

        return normalized.map(function(item, index) {
            const next = normalized.slice(index + 1).find(function(candidate) {
                return candidate.left > item.left;
            });
            if (!next || !item.width) {
                return Object.assign({}, item, { scale: 1 });
            }
            const availableWidth = Math.max(0, next.left - item.left - gap);
            const scale = availableWidth >= item.width
                ? 1
                : Math.max(scaleFloor, availableWidth / item.width);
            return Object.assign({}, item, { scale: Math.min(1, scale) });
        });
    }

    function insertLine(song, sectionIndex, insertionIndex, line) {
        const copy = createSong(song);
        const section = copy.sections[Number(sectionIndex)];
        if (!section) throw new Error("Cannot insert a line outside the song sections.");
        const index = clamp(insertionIndex, 0, section.lines.length);
        const inserted = normalizeLine(line || createLine("", [], "lyric"));
        section.lines.splice(index, 0, inserted);
        copy.updatedAt = new Date().toISOString();
        return { song: copy, line: inserted, index };
    }

    function deleteLine(song, sectionIndex, lineIndex) {
        const copy = createSong(song);
        const section = copy.sections[Number(sectionIndex)];
        if (!section) throw new Error("Cannot delete a line outside the song sections.");
        const index = Number(lineIndex);
        if (!Number.isInteger(index) || index < 0 || index >= section.lines.length) {
            throw new Error("Cannot delete a missing line.");
        }
        const removed = section.lines.splice(index, 1)[0];
        copy.updatedAt = new Date().toISOString();
        return { song: copy, line: removed, index };
    }

    function insertSectionAtBoundary(song, sectionIndex, insertionIndex, title) {
        const copy = createSong(song);
        const cleanTitle = String(title || "Section").trim().slice(0, 80) || "Section";
        const inserted = createSection(cleanTitle, "section", []);

        if (!copy.sections.length) {
            inserted.lines.push(createLine("", [], "lyric"));
            copy.sections.push(inserted);
            copy.updatedAt = new Date().toISOString();
            return { song: copy, section: inserted, sectionIndex: 0 };
        }

        const sourceSectionIndex = clamp(sectionIndex, 0, copy.sections.length - 1);
        const sourceSection = copy.sections[sourceSectionIndex];
        const boundary = clamp(insertionIndex, 0, sourceSection.lines.length);
        let destinationIndex;

        if (boundary === 0) {
            inserted.lines.push(createLine("", [], "lyric"));
            destinationIndex = sourceSectionIndex;
        } else {
            inserted.lines = sourceSection.lines.splice(boundary);
            if (!inserted.lines.length) inserted.lines.push(createLine("", [], "lyric"));
            destinationIndex = sourceSectionIndex + 1;
        }

        copy.sections.splice(destinationIndex, 0, inserted);
        copy.updatedAt = new Date().toISOString();
        return { song: copy, section: inserted, sectionIndex: destinationIndex };
    }

    function instrumentalBarCount(value) {
        const count = Number(value);
        if (!Number.isInteger(count) || count < INSTRUMENTAL_BARS.min || count > INSTRUMENTAL_BARS.max) {
            throw new Error(`Instrumental sections require ${INSTRUMENTAL_BARS.min} to ${INSTRUMENTAL_BARS.max} bars.`);
        }
        return count;
    }

    function insertInstrumentalSectionAtBoundary(song, sectionIndex, insertionIndex, title, barCount) {
        const copy = createSong(song);
        const count = instrumentalBarCount(barCount);
        const totalLines = copy.sections.reduce(function(total, section) { return total + section.lines.length; }, 0);
        if (totalLines + count > MAX_LINES) throw new Error("Song Document has too many lines.");

        const cleanTitle = String(title || "Instrumental").trim().slice(0, 80) || "Instrumental";
        const inserted = createSection(cleanTitle, "instrumental", Array.from({ length: count }, function() {
            return createLine("", [], "instrumental");
        }));

        if (!copy.sections.length) {
            copy.sections.push(inserted);
            copy.updatedAt = new Date().toISOString();
            return { song: copy, section: inserted, sectionIndex: 0 };
        }

        const sourceSectionIndex = clamp(sectionIndex, 0, copy.sections.length - 1);
        const sourceSection = copy.sections[sourceSectionIndex];
        const boundary = clamp(insertionIndex, 0, sourceSection.lines.length);
        let destinationIndex;

        if (boundary === 0) {
            if (copy.sections.length >= MAX_SECTIONS) throw new Error("Song Document has too many sections.");
            destinationIndex = sourceSectionIndex;
            copy.sections.splice(destinationIndex, 0, inserted);
        } else if (boundary === sourceSection.lines.length) {
            if (copy.sections.length >= MAX_SECTIONS) throw new Error("Song Document has too many sections.");
            destinationIndex = sourceSectionIndex + 1;
            copy.sections.splice(destinationIndex, 0, inserted);
        } else {
            if (copy.sections.length + 2 > MAX_SECTIONS) throw new Error("Song Document has too many sections.");
            const continuation = createSection(
                sourceSection.title,
                sourceSection.type,
                sourceSection.lines.splice(boundary)
            );
            destinationIndex = sourceSectionIndex + 1;
            copy.sections.splice(destinationIndex, 0, inserted, continuation);
        }

        copy.updatedAt = new Date().toISOString();
        return { song: copy, section: inserted, sectionIndex: destinationIndex };
    }

    function createSection(title, type, lines, id) {
        const sectionType = type || "section";
        return {
            id: id || uid("section"),
            type: sectionType,
            title: String(title || SECTION_TITLES[sectionType] || SECTION_TITLES.section).slice(0, 80),
            lines: Array.isArray(lines) ? lines.slice(0, MAX_LINES_PER_SECTION).map(normalizeLine) : []
        };
    }

    function createSong(overrides) {
        const now = new Date().toISOString();
        const input = overrides || {};
        const chordSpelling = normalizeChordSpelling(input.chordSpelling);
        const originalKey = spellKeyForMode(input.originalKey || input.key || "C", chordSpelling);
        return {
            schema: SCHEMA,
            version: VERSION,
            id: String(input.id || uid("song")).slice(0, 160),
            title: String(input.title || "Untitled Song").slice(0, 160),
            artist: String(input.artist || "").slice(0, 160),
            originalKey,
            targetKey: spellKeyForMode(input.targetKey || originalKey, chordSpelling, originalKey),
            chordSpelling,
            capo: clamp(input.capo, 0, 11),
            bpm: input.bpm === null || input.bpm === undefined || input.bpm === "" ? null : clamp(input.bpm, 20, 320),
            timeSignature: /^\d{1,2}\/\d{1,2}$/.test(input.timeSignature || "") ? input.timeSignature : "4/4",
            sections: (Array.isArray(input.sections) ? input.sections : []).slice(0, MAX_SECTIONS).map(normalizeSection),
            createdAt: typeof input.createdAt === "string" ? input.createdAt.slice(0, 40) : now,
            updatedAt: typeof input.updatedAt === "string" ? input.updatedAt.slice(0, 40) : now
        };
    }

    function normalizeLine(line) {
        return createLine(line && line.text, line && line.chords, line && line.type, line && line.id);
    }

    function normalizeSection(section) {
        return createSection(section && section.title, section && section.type, section && section.lines, section && section.id);
    }

    function validateSong(value) {
        if (!value || typeof value !== "object" || value.schema !== SCHEMA || Number(value.version) !== VERSION) {
            throw new Error("Unsupported Song Document. Expected jamtrackshub-song version 2.");
        }
        if (!Array.isArray(value.sections) || value.sections.length > MAX_SECTIONS) {
            throw new Error("Song Document has too many or invalid sections.");
        }
        [["id", 160], ["title", 160], ["artist", 160], ["createdAt", 40], ["updatedAt", 40]].forEach(function(rule) {
            const field = rule[0];
            const limit = rule[1];
            if (value[field] !== undefined && (typeof value[field] !== "string" || value[field].length > limit)) {
                throw new Error("Song Document has invalid or oversized metadata.");
            }
        });
        [["originalKey", 16], ["targetKey", 16], ["chordSpelling", 32], ["timeSignature", 16]].forEach(function(rule) {
            const field = rule[0];
            const limit = rule[1];
            if (value[field] !== undefined && (typeof value[field] !== "string" || value[field].length > limit)) {
                throw new Error("Song Document has invalid or oversized settings.");
            }
        });
        if (value.capo !== undefined && (typeof value.capo !== "number" || !Number.isFinite(value.capo))) {
            throw new Error("Song Document has invalid capo data.");
        }
        if (value.bpm !== undefined && value.bpm !== null && (typeof value.bpm !== "number" || !Number.isFinite(value.bpm))) {
            throw new Error("Song Document has invalid tempo data.");
        }
        let totalChords = 0;
        const totalLines = value.sections.reduce(function(total, section) {
            if (!section || typeof section !== "object" || !Array.isArray(section.lines) || section.lines.length > MAX_LINES_PER_SECTION) {
                throw new Error("Song Document has too many or invalid lines in a section.");
            }
            if (section.type === "instrumental" && section.lines.length > INSTRUMENTAL_BARS.max) {
                throw new Error("Song Document has too many instrumental bars.");
            }
            if (typeof section.title !== "string" || section.title.length > 80 || (section.id !== undefined && (typeof section.id !== "string" || section.id.length > 160))) {
                throw new Error("Song Document has invalid or oversized section data.");
            }
            if (!VALID_SECTION_TYPES.has(section.type)) {
                throw new Error("Song Document has invalid section types.");
            }
            section.lines.forEach(function(line) {
                if (!line || typeof line !== "object" || typeof line.text !== "string" || line.text.length > MAX_LINE_LENGTH || !Array.isArray(line.chords)) {
                    throw new Error("Song Document has invalid or oversized line data.");
                }
                if (line.id !== undefined && (typeof line.id !== "string" || line.id.length > 160)) {
                    throw new Error("Song Document has invalid line identifiers.");
                }
                if (!VALID_LINE_TYPES.has(line.type)) {
                    throw new Error("Song Document has invalid line types.");
                }
                const chordLimit = line.type === "instrumental" ? MAX_CHORDS_PER_BAR : MAX_CHORDS_PER_LINE;
                if (line.chords.length > chordLimit) {
                    throw new Error("Song Document has too many chords in a line.");
                }
                line.chords.forEach(function(chord) {
                    if (!chord || typeof chord !== "object" || typeof chord.symbol !== "string" || chord.symbol.length > 40 || !parseChordSymbol(chord.symbol)) {
                        throw new Error("Song Document has invalid or oversized chord data.");
                    }
                    if (chord.id !== undefined && (typeof chord.id !== "string" || chord.id.length > 160)) {
                        throw new Error("Song Document has invalid chord identifiers.");
                    }
                });
                totalChords += line.chords.length;
                if (totalChords > MAX_CHORDS) {
                    throw new Error("Song Document has too many chords.");
                }
            });
            return total + section.lines.length;
        }, 0);
        if (totalLines > MAX_LINES) {
            throw new Error("Song Document has too many lines.");
        }
        const invalidAnchor = value.sections.some(function(section) {
            return !Array.isArray(section.lines) || section.lines.some(function(line) {
                return !Array.isArray(line.chords) || line.chords.some(function(chord) {
                    return !Number.isInteger(chord.anchorPosition) || chord.anchorPosition < 0 || chord.anchorPosition > MAX_LINE_LENGTH || Object.prototype.hasOwnProperty.call(chord, "anchor");
                });
            });
        });
        if (invalidAnchor) throw new Error("Song Document has invalid chord positions.");
        return createSong(value);
    }

    function assertParsedStructureBounds(sections, label) {
        const sourceLabel = label || "Imported chart";
        if (sections.length > MAX_SECTIONS) {
            throw new Error(`${sourceLabel} has too many sections.`);
        }
        let totalLines = 0;
        let totalChords = 0;
        sections.forEach(function(section) {
            if (section.lines.length > MAX_LINES_PER_SECTION) {
                throw new Error(`${sourceLabel} has too many lines in a section.`);
            }
            totalLines += section.lines.length;
            section.lines.forEach(function(line) {
                const chordLimit = line.type === "instrumental" ? MAX_CHORDS_PER_BAR : MAX_CHORDS_PER_LINE;
                if (line.chords.length > chordLimit) {
                    throw new Error(`${sourceLabel} has too many chords in a line.`);
                }
                totalChords += line.chords.length;
            });
        });
        if (totalLines > MAX_LINES) throw new Error(`${sourceLabel} has too many lines.`);
        if (totalChords > MAX_CHORDS) throw new Error(`${sourceLabel} has too many chords.`);
    }

    function serializeSong(song) {
        return JSON.stringify(validateSong(song), null, 2) + "\n";
    }

    function deserializeSong(source) {
        const raw = String(source || "");
        if (raw.length > MAX_SOURCE_LENGTH) {
            throw new Error("Song Document is too large.");
        }
        let value;
        try {
            value = JSON.parse(raw);
        } catch (error) {
            throw new Error("Song Document is not valid JSON.");
        }
        return validateSong(value);
    }

    function prepareImportedSong(source, now) {
        const song = deserializeSong(source);
        const requestedDate = now === undefined ? new Date() : new Date(now);
        const timestamp = Number.isNaN(requestedDate.getTime()) ? new Date().toISOString() : requestedDate.toISOString();
        song.id = uid("song");
        song.createdAt = timestamp;
        song.updatedAt = timestamp;
        return song;
    }

    function sectionFromHeading(value) {
        const clean = String(value || "").trim().replace(/^\[|\]$/g, "").replace(/:$/, "").trim();
        const normalized = clean.toLowerCase().replace(/\s+/g, "-").replace(/\d+$/, "");
        const type = SECTION_ALIASES[normalized] || "section";
        return { type, title: clean || SECTION_TITLES[type] || "Section" };
    }

    function isSectionHeading(line) {
        const clean = String(line || "").trim();
        if (/^\[[^\]]{1,80}\]$/.test(clean)) {
            return true;
        }
        return /^(?:verse|chorus|pre[- ]?chorus|bridge|intro|outro|instrumental|solo|interlude|tag)(?:\s+\d+)?\s*:$/i.test(clean);
    }

    function chordTokens(line) {
        const tokens = [];
        const matcher = /\S+/g;
        let match;
        while ((match = matcher.exec(String(line || "")))) {
            if (/^(?:\|{1,2}|:\||\|:)$/.test(match[0])) {
                continue;
            }
            const parsed = parseChordSymbol(match[0]);
            if (!parsed) {
                return [];
            }
            tokens.push({ symbol: parsed.raw, column: codePoints(line.slice(0, match.index)).length });
        }
        return tokens;
    }

    function chartMetadata(line) {
        const match = String(line || "").match(/^\s*(title|artist|key|tempo|bpm|time(?:\s*signature)?)\s*:\s*(.*?)\s*$/i);
        if (!match || !match[2]) {
            return null;
        }
        const name = match[1].toLowerCase().replace(/\s+/g, "");
        const value = match[2].slice(0, 160);
        if (name === "title") return { name: "title", value };
        if (name === "artist") return { name: "artist", value };
        if (name === "key") return { name: "originalKey", value };
        if (name === "tempo" || name === "bpm") return { name: "bpm", value };
        return { name: "timeSignature", value };
    }

    function parseChordLyrics(source, options) {
        const raw = String(source || "");
        if (raw.length > MAX_SOURCE_LENGTH) {
            throw new Error("The pasted chart is too large.");
        }
        const settings = options || {};
        const sourceLines = raw.replace(/\r\n?/g, "\n").split("\n");
        if (sourceLines.length > MAX_LINES) {
            throw new Error("The pasted chart has too many lines.");
        }
        const sections = [];
        const metadata = {};
        let readingMetadata = true;
        let section = createSection(settings.defaultSectionTitle || "Song", "section", []);
        sections.push(section);

        for (let index = 0; index < sourceLines.length; index += 1) {
            if (sourceLines[index].length > MAX_LINE_LENGTH) {
                throw new Error("The pasted chart has an oversized line.");
            }
            const line = sourceLines[index];
            const parsedMetadata = readingMetadata ? chartMetadata(line) : null;
            if (parsedMetadata) {
                metadata[parsedMetadata.name] = parsedMetadata.value;
                continue;
            }
            if (readingMetadata && !line.trim()) {
                continue;
            }
            if (line.trim()) {
                readingMetadata = false;
            }
            if (isSectionHeading(line)) {
                const heading = sectionFromHeading(line);
                section = createSection(heading.title, heading.type, []);
                sections.push(section);
                continue;
            }
            if (!line.trim()) {
                section.lines.push(createLine("", [], "lyric"));
                continue;
            }
            const tokens = chordTokens(line);
            if (tokens.length) {
                if (tokens.length > MAX_CHORDS_PER_LINE) {
                    throw new Error("The pasted chart has too many chords in a line.");
                }
                const nextSource = sourceLines[index + 1] === undefined ? "" : sourceLines[index + 1];
                if (nextSource.length > MAX_LINE_LENGTH) {
                    throw new Error("The pasted chart has an oversized line.");
                }
                const next = nextSource;
                const nextTokens = chordTokens(next);
                if (next && !nextTokens.length && !isSectionHeading(next)) {
                    section.lines.push(createLine(next, tokens.map(function(token) {
                        return createChord(token.symbol, positionIndexForCharacterOffset(next, token.column));
                    }), "lyric"));
                    index += 1;
                } else {
                    if (tokens.length > MAX_CHORDS_PER_BAR) {
                        throw new Error("The pasted chart has too many chords in an instrumental line.");
                    }
                    section.lines.push(createLine("", tokens.map(function(token, tokenIndex) {
                        return createChord(token.symbol, tokenIndex);
                    }), "instrumental"));
                }
                continue;
            }
            section.lines.push(createLine(line, [], "lyric"));
        }

        const usefulSections = sections.filter(function(item, index) {
            return item.lines.length || index === sections.length - 1;
        });
        assertParsedStructureBounds(usefulSections, "The pasted chart");
        return createSong({
            title: settings.title || metadata.title,
            artist: settings.artist || metadata.artist,
            originalKey: settings.originalKey || metadata.originalKey,
            targetKey: settings.originalKey || metadata.originalKey,
            bpm: settings.bpm || metadata.bpm,
            timeSignature: settings.timeSignature || metadata.timeSignature,
            sections: usefulSections
        });
    }

    function parseChordPro(source, options) {
        const raw = String(source || "");
        if (raw.length > MAX_SOURCE_LENGTH) {
            throw new Error("The ChordPro document is too large.");
        }
        const metadata = Object.assign({}, options || {});
        const sections = [];
        let section = createSection("Song", "section", []);
        sections.push(section);
        const lines = raw.replace(/\r\n?/g, "\n").split("\n");
        if (lines.length > MAX_LINES) {
            throw new Error("The ChordPro document has too many lines.");
        }

        lines.forEach(function(rawLine) {
            if (rawLine.length > MAX_LINE_LENGTH) {
                throw new Error("The ChordPro document has an oversized line.");
            }
            const line = rawLine;
            const directive = line.match(/^\{\s*([^}:]+)(?::\s*([^}]*))?\s*\}$/);
            if (directive) {
                const name = directive[1].trim().toLowerCase().replace(/\s+/g, "_");
                const value = (directive[2] || "").trim();
                if (["title", "t"].includes(name)) metadata.title = value;
                else if (["artist", "subtitle", "st"].includes(name)) metadata.artist = value;
                else if (["key", "k"].includes(name)) metadata.originalKey = value;
                else if (["tempo", "bpm"].includes(name)) metadata.bpm = value;
                else if (["time", "time_signature"].includes(name)) metadata.timeSignature = value;
                else if (["start_of_chorus", "soc"].includes(name)) {
                    section = createSection(value || "Chorus", "chorus", []);
                    sections.push(section);
                } else if (["start_of_verse", "sov"].includes(name)) {
                    section = createSection(value || "Verse", "verse", []);
                    sections.push(section);
                } else if (["start_of_bridge", "sob"].includes(name)) {
                    section = createSection(value || "Bridge", "bridge", []);
                    sections.push(section);
                } else if (["start_of_tab", "sot"].includes(name)) {
                    section = createSection(value || "Instrumental", "instrumental", []);
                    sections.push(section);
                }
                return;
            }
            if (isSectionHeading(line)) {
                const heading = sectionFromHeading(line);
                section = createSection(heading.title, heading.type, []);
                sections.push(section);
                return;
            }
            const chordMarkers = [];
            let text = "";
            let cursor = 0;
            line.replace(/\[([^\]]{1,40})\]/g, function(match, symbol, offset) {
                text += line.slice(cursor, offset);
                const parsed = parseChordSymbol(symbol);
                if (parsed) {
                    chordMarkers.push({ symbol: parsed.raw, offset: codePoints(text).length });
                } else {
                    text += match;
                }
                cursor = offset + match.length;
                return match;
            });
            text += line.slice(cursor);
            const chordLimit = text ? MAX_CHORDS_PER_LINE : MAX_CHORDS_PER_BAR;
            if (chordMarkers.length > chordLimit) {
                throw new Error("The ChordPro document has too many chords in a line.");
            }
            const chords = chordMarkers.map(function(marker) {
                return createChord(marker.symbol, positionIndexForCharacterOffset(text, marker.offset));
            });
            section.lines.push(createLine(text, chords, text ? "lyric" : "instrumental"));
        });

        metadata.sections = sections.filter(function(item, index) {
            return item.lines.length || index === sections.length - 1;
        });
        assertParsedStructureBounds(metadata.sections, "The ChordPro document");
        metadata.targetKey = metadata.originalKey;
        return createSong(metadata);
    }

    function transformSongChords(song, transformer) {
        const copy = createSong(song);
        copy.sections = copy.sections.map(function(section) {
            return Object.assign({}, section, {
                lines: section.lines.map(function(line) {
                    return Object.assign({}, line, {
                        chords: line.chords.map(function(chord) {
                            return Object.assign({}, chord, { symbol: transformer(chord.symbol) });
                        })
                    });
                })
            });
        });
        return copy;
    }

    function songForTarget(song, targetKey) {
        const target = spellKeyForMode(targetKey, song.chordSpelling, song.originalKey);
        const semitones = intervalBetween(song.originalKey, target);
        const copy = transformSongChords(song, function(symbol) {
            return transposeChord(
                symbol,
                semitones,
                target,
                song.chordSpelling,
                normalizeChordSpelling(song.chordSpelling) === CHORD_SPELLING.PRESERVE && target === normalizeKey(song.originalKey)
            );
        });
        copy.targetKey = target;
        copy.updatedAt = new Date().toISOString();
        return copy;
    }

    function songForCapo(song, capo) {
        const amount = clamp(capo, 0, 11);
        const target = normalizeKey(song.targetKey || song.originalKey);
        const shapeKey = noteNameForPitch(pitchFor(target.replace(/m$/, "")) - amount, target) + (target.endsWith("m") ? "m" : "");
        return {
            shapeKey,
            song: transformSongChords(song, function(symbol) {
                return transposeChord(symbol, -amount, shapeKey, song.chordSpelling, amount === 0);
            })
        };
    }

    function chordDifficulty(symbol) {
        const parsed = parseChordSymbol(symbol);
        if (!parsed) return 12;
        const simple = `${parsed.root}${parsed.suffix}`;
        const open = new Set(["C", "A", "G", "E", "D", "Am", "Em", "Dm", "F", "A7", "D7", "E7", "G7", "C7"]);
        let score = open.has(simple) ? 0 : 2;
        if (parsed.root.includes("#") || parsed.root.includes("b")) score += 2;
        if (parsed.bass) score += 2;
        if (/9|11|13|add|dim|aug|b5|#5|b9|#9|alt/i.test(parsed.suffix)) score += 2;
        else if (/7/.test(parsed.suffix)) score += 1;
        return score;
    }

    function allChordSymbols(song) {
        return song.sections.flatMap(function(section) {
            return section.lines.flatMap(function(line) {
                return line.chords.map(function(chord) { return chord.symbol; });
            });
        });
    }

    function smartCapo(song, limit) {
        const target = normalizeKey(song.targetKey || song.originalKey);
        return Array.from({ length: 12 }, function(_, capo) {
            const transformed = songForCapo(song, capo);
            const symbols = allChordSymbols(transformed.song);
            const difficulty = symbols.reduce(function(total, symbol) {
                return total + chordDifficulty(symbol);
            }, 0);
            const average = symbols.length ? difficulty / symbols.length : 0;
            return {
                capo,
                targetKey: target,
                shapeKey: transformed.shapeKey,
                score: Number(average.toFixed(2)),
                reason: average <= 0.75 ? "Mostly familiar open shapes" : average <= 2 ? "Fewer barre and extended shapes" : "Alternative fingering option"
            };
        }).sort(function(a, b) {
            return a.score - b.score || a.capo - b.capo;
        }).slice(0, limit || 3);
    }

    function suffixForNumber(parsed, system) {
        const suffix = parsed.suffix || "";
        if (parsed.quality === "minor") {
            const extension = suffix.replace(/^m/i, "");
            return system === "nashville" ? `m${extension}` : extension;
        }
        if (parsed.quality === "diminished") return suffix.includes("7") ? "°7" : "°";
        if (parsed.quality === "augmented") return "+";
        return suffix;
    }

    function chordNumber(symbol, key, system) {
        const parsed = parseChordSymbol(symbol);
        if (!parsed) return symbol;
        const tonic = pitchFor(normalizeKey(key).replace(/m$/, ""));
        const interval = (parsed.rootPitch - tonic + 12) % 12;
        let base = (system === "nashville" ? NASHVILLE_BASE : ROMAN_BASE)[interval];
        if (system !== "nashville" && parsed.quality === "minor") {
            base = base.replace(/[IV]+/, function(numeral) { return numeral.toLowerCase(); });
        }
        const bass = parsed.bass ? `/${chordNumber(parsed.bass, key, system)}` : "";
        return `${base}${suffixForNumber(parsed, system)}${bass}`;
    }

    function simplifyChord(symbol, mode) {
        const parsed = parseChordSymbol(symbol);
        if (!parsed || mode === "original") return symbol;
        let suffix = parsed.suffix;
        let bass = parsed.bass;
        if (mode === "balanced") {
            suffix = suffix
                .replace(/^maj(?:9|13)$/i, "maj7")
                .replace(/^m(?:9|11|13)$/i, "m7")
                .replace(/^(?:9|11|13|7b5|7#5|7b9|7#9|7#11|7b13|13b9|alt)$/i, "7")
                .replace(/^m\(add9\)$/i, "m")
                .replace(/^add9$/i, "");
        } else if (mode === "beginner") {
            suffix = suffix
                .replace(/^maj(?:7|9|13)$/i, "")
                .replace(/^m(?:6|7|9|11|13|\(add9\)|add9)$/i, "m")
                .replace(/^(?:6|add9|6\/9)$/i, "")
                .replace(/^(?:9|11|13|7b5|7#5|7b9|7#9|7#11|7b13|13b9|alt)$/i, "7")
                .replace(/^7\((?:b5|#5|b9|#9|#11|b13)(?:,(?:b5|#5|b9|#9|#11|b13))*\)$/i, "7");
            bass = null;
        }
        return `${parsed.root}${suffix}${bass ? `/${bass}` : ""}`;
    }

    function toChordPro(song) {
        const cleanHeader = value => String(value || "").replace(/[\r\n{}]+/g, " ").trim();
        const headers = [`{title: ${cleanHeader(song.title)}}`];
        if (song.artist) headers.push(`{artist: ${cleanHeader(song.artist)}}`);
        if (song.targetKey) headers.push(`{key: ${song.targetKey}}`);
        if (song.bpm) headers.push(`{tempo: ${song.bpm}}`);
        song.sections.forEach(function(section) {
            headers.push("", `[${section.title}]`);
            section.lines.forEach(function(line) {
                const chars = codePoints(line.text);
                const positions = tokenizeLyric(line.text).filter(function(token) { return token.meaningful; });
                const atCharacterIndex = new Map();
                line.chords.forEach(function(chord) {
                    const token = positions[clamp(chord.anchorPosition, 0, Math.max(0, positions.length - 1))];
                    const characterIndex = token ? token.start : 0;
                    if (!atCharacterIndex.has(characterIndex)) atCharacterIndex.set(characterIndex, []);
                    atCharacterIndex.get(characterIndex).push(chord.symbol);
                });
                let result = "";
                for (let index = 0; index <= chars.length; index += 1) {
                    if (atCharacterIndex.has(index)) {
                        result += atCharacterIndex.get(index).map(function(symbol) { return `[${symbol}]`; }).join("");
                    }
                    if (index < chars.length) result += chars[index];
                }
                headers.push(result);
            });
        });
        return headers.join("\n").trim() + "\n";
    }

    function toPlainText(song) {
        const output = [song.title, song.artist, `Key: ${song.targetKey || song.originalKey}${song.capo ? `  Capo: ${song.capo}` : ""}`].filter(Boolean);
        song.sections.forEach(function(section) {
            output.push("", `[${section.title}]`);
            section.lines.forEach(function(line) {
                if (!line.text) {
                    output.push(line.chords.map(function(chord) { return chord.symbol; }).join("  "));
                    return;
                }
                if (line.chords.length) {
                    const lyricLength = codePoints(line.text).length;
                    const positions = tokenizeLyric(line.text).filter(function(token) { return token.meaningful; });
                    const chordCells = Array.from({ length: lyricLength + 1 }, function() { return ""; });
                    line.chords.slice().sort(function(a, b) { return a.anchorPosition - b.anchorPosition; }).forEach(function(chord) {
                        const token = positions[clamp(chord.anchorPosition, 0, Math.max(0, positions.length - 1))];
                        let position = token ? token.start : 0;
                        while (position < chordCells.length && chordCells[position]) position += 1;
                        if (position >= chordCells.length) chordCells.push(chord.symbol);
                        else chordCells[position] = chord.symbol;
                    });
                    output.push(chordCells.join(" ").replace(/\s+$/, ""));
                }
                output.push(line.text);
            });
        });
        return output.join("\n").trim() + "\n";
    }

    return {
        SCHEMA,
        VERSION,
        KEY_OPTIONS: { major: MAJOR_KEY_OPTIONS.slice(), minor: MINOR_KEY_OPTIONS.slice() },
        CHORD_SPELLING,
        LIMITS: {
            MAX_SOURCE_LENGTH,
            MAX_SECTIONS,
            MAX_LINES,
            MAX_LINES_PER_SECTION,
            MAX_LINE_LENGTH,
            MAX_CHORDS_PER_LINE,
            MAX_CHORDS_PER_BAR,
            MAX_CHORDS,
            INSTRUMENTAL_BARS
        },
        AUTO_SCROLL,
        isOpaqueSongId,
        songWorkspaceUrl,
        codePoints,
        baseScrollSpeedForBpm,
        normalizeScrollSpeedMultiplier,
        effectiveScrollSpeed,
        scrollDistanceForElapsed,
        normalizeKey,
        normalizeChordSpelling,
        spellKeyForMode,
        parseChordSymbol,
        transposeChord,
        intervalBetween,
        createChord,
        createLine,
        tokenizeLyric,
        meaningfulPositionCount,
        resolveAnchorToken,
        positionIndexForCharacterOffset,
        layoutLyricLine,
        fitSingleRowChordAnnotations,
        insertLine,
        deleteLine,
        insertSectionAtBoundary,
        insertInstrumentalSectionAtBoundary,
        createSection,
        createSong,
        validateSong,
        serializeSong,
        deserializeSong,
        prepareImportedSong,
        parseChordLyrics,
        parseChordPro,
        transformSongChords,
        songForTarget,
        songForCapo,
        smartCapo,
        chordNumber,
        simplifyChord,
        allChordSymbols,
        toChordPro,
        toPlainText
    };
});
