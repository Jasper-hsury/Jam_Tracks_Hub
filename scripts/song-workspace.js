(function() {
    "use strict";

    const Core = window.JamSongCore;
    const Storage = window.JamSongStorage;
    const Shapes = window.JamChordShapes;
    if (!Core || !Storage || !Shapes) return;

    const MAX_IMPORT_BYTES = 1024 * 1024;
    const MAX_BACKUP_SONGS = 500;
    const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const state = {
        songs: [],
        song: null,
        viewMode: "original",
        storageAvailable: true,
        saveTimer: 0,
        lineContext: null,
        lineDraft: null,
        selectedAnchor: 0,
        editingAnchorId: null,
        shapePickerSymbol: null,
        shapePickerOptions: [],
        scrollFrame: 0,
        scrolling: false,
        lastScrollTime: 0,
        preferences: Storage.readPreferences()
    };

    const $ = id => document.getElementById(id);
    const elements = {
        home: $("workspaceHomeView"), editor: $("workspaceEditorView"), status: $("workspaceStatus"),
        list: $("songList"), empty: $("songEmptyState"), count: $("songCount"),
        title: $("songTitleInput"), artist: $("songArtistInput"), originalKey: $("originalKeySelect"),
        targetKey: $("targetKeySelect"), capo: $("capoSelect"), shapeKey: $("shapeKeyValue"),
        bpm: $("bpmInput"), timeSignature: $("timeSignatureInput"), autosave: $("autosaveState"),
        chartTitle: $("songChartTitle"), chartSummary: $("chartKeySummary"), chart: $("songChart"),
        shapeCards: $("shapeCards"), capoResults: $("capoResults"), downloadMenu: $("downloadMenu"),
        createDialog: $("createSongDialog"), createForm: $("createSongForm"), createMode: $("createModeLabel"),
        createTitle: $("createTitleInput"), createArtist: $("createArtistInput"), createKey: $("createKeySelect"),
        createSource: $("createSourceInput"), createSourceLabel: $("createSourceLabel"), createError: $("createDialogError"),
        lineDialog: $("lineEditorDialog"), lineForm: $("lineEditorForm"), lineText: $("lineTextInput"),
        anchorPreview: $("anchorPreview"), anchorChord: $("anchorChordInput"), anchorPosition: $("anchorPositionInput"),
        anchorList: $("anchorList"), addAnchor: $("addAnchorButton"), lineError: $("lineDialogError"),
        chordHints: $("chordHintsButton"), shapePicker: $("shapePickerDialog"),
        shapePickerSymbol: $("shapePickerSymbol"), shapePickerGrid: $("shapePickerGrid"),
        performance: $("performanceDialog"), performanceTitle: $("performanceTitle"),
        performanceMeta: $("performanceMeta"), performanceChart: $("performanceChart"),
        scrollToggle: $("scrollToggleButton"), scrollSpeed: $("scrollSpeedInput"),
        importInput: $("songImportInput"), restoreInput: $("songRestoreInput")
    };

    function t(key, fallback, variables) {
        return window.JasperI18n?.translate?.(key, fallback, variables) ?? fallback;
    }

    function node(tag, className, text) {
        const item = document.createElement(tag);
        if (className) item.className = className;
        if (text !== undefined) item.textContent = text;
        return item;
    }

    function button(text, action, className) {
        const item = node("button", className, text);
        item.type = "button";
        if (action) item.dataset.action = action;
        return item;
    }

    function setStatus(message, isError) {
        elements.status.textContent = message || "";
        elements.status.classList.toggle("is-error", Boolean(isError));
    }

    function safeFileName(value, extension) {
        const base = String(value || "song").normalize("NFKC").replace(/[\\/:*?\"<>|\u0000-\u001f]/g, "-").trim().slice(0, 80) || "song";
        return `${base}${extension}`;
    }

    function downloadText(filename, contents, type) {
        const blob = new Blob([contents], { type: type || "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    function formatDate(value) {
        const language = window.JasperI18n?.getLanguage?.() || "en";
        try {
            return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
        } catch (error) {
            return String(value || "");
        }
    }

    function keyOptions(select) {
        if (!select) return;
        select.replaceChildren();
        KEYS.concat(KEYS.map(key => `${key}m`)).forEach(function(key) {
            const option = node("option", "", key);
            option.value = key;
            select.appendChild(option);
        });
    }

    function initializeSelects() {
        [elements.originalKey, elements.targetKey, elements.createKey].forEach(keyOptions);
        elements.capo.replaceChildren();
        for (let capo = 0; capo <= 11; capo += 1) {
            const option = node("option", "", String(capo));
            option.value = String(capo);
            elements.capo.appendChild(option);
        }
    }

    async function loadSongs() {
        try {
            state.songs = await Storage.list();
            state.storageAvailable = true;
        } catch (error) {
            state.storageAvailable = false;
            state.songs = [];
            setStatus(t("pages.songWorkspace.storageUnavailable", "Local saving is unavailable. Download a backup to keep your work."), true);
        }
        renderLibrary();
    }

    function renderLibrary() {
        elements.list.replaceChildren();
        elements.count.textContent = String(state.songs.length);
        elements.empty.hidden = state.songs.length > 0;
        state.songs.forEach(function(song) {
            const card = node("article", "workspace-song-card");
            const heading = node("div");
            heading.append(node("h3", "", song.title), node("p", "", song.artist || t("pages.songWorkspace.unknownArtist", "No artist")));
            const meta = node("div", "workspace-song-meta-summary");
            meta.append(
                node("span", "", `${t("pages.songWorkspace.key", "Key")}: ${song.targetKey || song.originalKey}`),
                node("span", "", `Capo: ${song.capo || 0}`),
                node("span", "", formatDate(song.updatedAt))
            );
            const actions = node("div", "workspace-song-actions");
            const downloadMenuId = `workspace-download-${song.id}`;
            [
                [t("pages.songWorkspace.open", "Open"), "open"],
                [t("common.duplicate", "Duplicate"), "duplicate"],
                [t("pages.songWorkspace.download", "Download"), "download"],
                [t("pages.songWorkspace.delete", "Delete"), "delete"]
            ].forEach(function(entry) {
                const control = button(entry[0], entry[1]);
                control.dataset.songId = song.id;
                if (entry[1] === "download") {
                    control.setAttribute("aria-haspopup", "menu");
                    control.setAttribute("aria-expanded", "false");
                    control.setAttribute("aria-controls", downloadMenuId);
                }
                actions.appendChild(control);
            });
            const downloadMenu = node("div", "workspace-song-download-menu");
            downloadMenu.id = downloadMenuId;
            downloadMenu.setAttribute("role", "menu");
            downloadMenu.hidden = true;
            downloadMenu.dataset.downloadMenuFor = song.id;
            [["JSON", "json"], ["ChordPro", "chordpro"], ["TXT", "txt"], [t("pages.songWorkspace.printPdf", "Print / PDF"), "print"]].forEach(function(entry) {
                const control = button(entry[0], "library-download");
                control.setAttribute("role", "menuitem");
                control.dataset.songId = song.id;
                control.dataset.format = entry[1];
                downloadMenu.appendChild(control);
            });
            card.append(heading, meta, actions, downloadMenu);
            elements.list.appendChild(card);
        });
    }

    function showHome() {
        stopAutoScroll();
        state.song = null;
        elements.editor.hidden = true;
        elements.home.hidden = false;
        history.replaceState(null, "", "song-workspace.html");
        renderLibrary();
    }

    function showEditor(song) {
        state.song = Core.validateSong(song);
        elements.home.hidden = true;
        elements.editor.hidden = false;
        elements.title.value = state.song.title;
        elements.artist.value = state.song.artist;
        elements.originalKey.value = state.song.originalKey;
        elements.targetKey.value = state.song.targetKey;
        elements.capo.value = String(state.song.capo);
        elements.bpm.value = state.song.bpm || "";
        elements.timeSignature.value = state.song.timeSignature;
        state.preferences.lastSongId = state.song.id;
        Storage.writePreferences(state.preferences);
        history.replaceState(null, "", `song-workspace.html?song=${encodeURIComponent(state.song.id)}`);
        renderEditor();
    }

    function currentConcertSong() {
        return Core.songForTarget(state.song, state.song.targetKey);
    }

    function currentShapeSong() {
        const concert = currentConcertSong();
        const capoResult = Core.songForCapo(concert, state.song.capo);
        let song = capoResult.song;
        if (state.viewMode === "balanced" || state.viewMode === "beginner") {
            song = Core.transformSongChords(song, symbol => Core.simplifyChord(symbol, state.viewMode));
        } else if (state.viewMode === "roman" || state.viewMode === "nashville") {
            song = Core.transformSongChords(concert, symbol => Core.chordNumber(symbol, state.song.targetKey, state.viewMode));
        }
        song.capo = state.song.capo;
        song.targetKey = state.song.targetKey;
        return { song, shapeKey: capoResult.shapeKey };
    }

    function currentPlayShapeSong() {
        const concert = currentConcertSong();
        const capoResult = Core.songForCapo(concert, state.song.capo);
        let song = capoResult.song;
        if (state.viewMode === "balanced" || state.viewMode === "beginner") {
            song = Core.transformSongChords(song, symbol => Core.simplifyChord(symbol, state.viewMode));
        }
        return { song, shapeKey: capoResult.shapeKey };
    }

    function renderEditor() {
        if (!state.song) return;
        const current = currentShapeSong();
        const hintsEnabled = Boolean(state.preferences.chordHints);
        elements.shapeKey.textContent = current.shapeKey;
        elements.chartTitle.textContent = state.song.title;
        elements.chartSummary.textContent = `${t("pages.songWorkspace.concertKey", "Concert")}: ${state.song.targetKey} · Capo ${state.song.capo} · ${current.shapeKey} ${t("pages.songWorkspace.shapes", "shapes")}`;
        document.querySelectorAll("[data-view-mode]").forEach(function(control) {
            const selected = control.dataset.viewMode === state.viewMode;
            control.classList.toggle("is-selected", selected);
            control.setAttribute("aria-pressed", String(selected));
        });
        elements.chordHints.setAttribute("aria-pressed", String(hintsEnabled));
        renderChart(elements.chart, current.song, true);
        renderShapeCards(currentPlayShapeSong());
    }

    function renderChart(host, song, editable) {
        host.replaceChildren();
        song.sections.forEach(function(section, sectionIndex) {
            const sectionElement = node("section", "workspace-section");
            const heading = node("div", "workspace-section-heading-row");
            heading.appendChild(node("h3", "", section.title));
            if (editable) {
                const actions = node("div", "workspace-section-actions");
                const rename = button(t("pages.songWorkspace.rename", "Rename"), "rename-section");
                const remove = button(t("pages.songWorkspace.delete", "Delete"), "delete-section");
                rename.dataset.sectionIndex = String(sectionIndex);
                remove.dataset.sectionIndex = String(sectionIndex);
                actions.append(rename, remove);
                heading.appendChild(actions);
            }
            const lines = node("div", "workspace-lines");
            section.lines.forEach(function(line, lineIndex) {
                if (editable) lines.appendChild(renderInsertControl(sectionIndex, lineIndex));
                lines.appendChild(renderLine(line, sectionIndex, lineIndex, editable));
            });
            if (editable) lines.appendChild(renderInsertControl(sectionIndex, section.lines.length));
            sectionElement.append(heading, lines);
            host.appendChild(sectionElement);
        });
    }

    function renderInsertControl(sectionIndex, insertionIndex) {
        const label = t("pages.songWorkspace.addLine", "Add Line");
        const add = button(`+ ${label}`, "add-line", "workspace-add-line");
        add.dataset.sectionIndex = String(sectionIndex);
        add.dataset.insertionIndex = String(insertionIndex);
        add.setAttribute("aria-label", label);
        return add;
    }

    function renderLine(line, sectionIndex, lineIndex, editable) {
        const host = node(editable ? "button" : "div", `workspace-line${line.type === "instrumental" ? " is-instrumental" : ""}`);
        if (editable) {
            host.type = "button";
            host.dataset.action = "edit-line";
            host.dataset.sectionIndex = String(sectionIndex);
            host.dataset.lineIndex = String(lineIndex);
            host.setAttribute("aria-label", t("pages.songWorkspace.editLine", "Edit line"));
        }
        if (line.type === "instrumental" || !line.text) {
            const row = node("div", "workspace-instrumental-line");
            line.chords.forEach(chord => row.appendChild(node("span", "", chord.symbol)));
            if (!line.chords.length) row.appendChild(node("span", "", t("pages.songWorkspace.emptyLine", "Empty line")));
            host.appendChild(row);
            return host;
        }
        const layout = Core.layoutLyricLine(line);
        const content = node("div", "workspace-line-content");
        if (layout.unanchored.length) {
            const unanchored = node("div", "workspace-unanchored-chords");
            layout.unanchored.forEach(chord => unanchored.appendChild(node("span", "workspace-chord-chip", chord.symbol)));
            content.appendChild(unanchored);
        }
        const track = node("span", "workspace-token-track");
        layout.tokens.forEach(function(token) {
            const cell = node("span", `workspace-token-cell${Boolean(state.preferences.chordHints) && token.chords.length && token.meaningful ? " is-chord-hint" : ""}`);
            const chordRow = node("span", "workspace-token-chords");
            token.chords.forEach(chord => chordRow.appendChild(node("span", "workspace-chord-chip", chord.symbol)));
            cell.append(chordRow, node("span", "workspace-lyric-token", token.text));
            track.appendChild(cell);
        });
        content.appendChild(track);
        host.appendChild(content);
        return host;
    }

    function selectedShapeMap() {
        if (!state.preferences.songShapeSelections || typeof state.preferences.songShapeSelections !== "object") {
            state.preferences.songShapeSelections = {};
        }
        if (!state.preferences.songShapeSelections[state.song.id]) {
            state.preferences.songShapeSelections[state.song.id] = {};
        }
        return state.preferences.songShapeSelections[state.song.id];
    }

    function selectedVoicing(symbol, options) {
        const key = Shapes.normalizeChord(symbol) || symbol;
        const stored = selectedShapeMap()[key];
        return options.find(voicing => Shapes.voicingKey(voicing) === stored) || options[0] || null;
    }

    function uniqueShapeSymbols(song) {
        const seen = new Set();
        return Core.allChordSymbols(song).filter(function(symbol) {
            const normalized = Shapes.normalizeChord(symbol);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }

    function renderShapeCards(current) {
        elements.shapeCards.replaceChildren();
        const symbols = uniqueShapeSymbols(current.song);
        symbols.forEach(function(symbol) {
            const parsed = Shapes.parseChord(symbol);
            const options = Shapes.generateVoicings(parsed);
            const voicing = selectedVoicing(symbol, options);
            if (!parsed || !voicing) return;
            const card = node("article", "workspace-shape-card");
            card.appendChild(node("h3", "", symbol));
            card.appendChild(Shapes.createDiagramElement(parsed, voicing, document));
            const change = button(t("pages.songWorkspace.chooseOtherShape", "Choose Another Shape"), "choose-shape", "workspace-shape-change");
            change.dataset.chordSymbol = symbol;
            change.setAttribute("aria-label", t("pages.songWorkspace.chooseShapeFor", "Choose a guitar shape for {{chord}}", { chord: symbol }));
            card.appendChild(change);
            elements.shapeCards.appendChild(card);
        });
        if (!elements.shapeCards.children.length) {
            elements.shapeCards.appendChild(node("p", "", t("pages.songWorkspace.noChords", "No chords in this view.")));
        }
    }

    function renderShapePicker() {
        const symbol = state.shapePickerSymbol;
        const selected = symbol ? selectedVoicing(symbol, state.shapePickerOptions) : null;
        elements.shapePickerSymbol.textContent = symbol || "";
        elements.shapePickerGrid.replaceChildren();
        const parsed = Shapes.parseChord(symbol);
        if (!parsed) return;
        state.shapePickerOptions.forEach(function(voicing, index) {
            const option = button("", "select-shape", "workspace-shape-option");
            option.dataset.shapeIndex = String(index);
            option.classList.toggle("is-selected", Shapes.voicingKey(voicing) === Shapes.voicingKey(selected));
            option.setAttribute("aria-pressed", String(Shapes.voicingKey(voicing) === Shapes.voicingKey(selected)));
            option.setAttribute("aria-label", t("pages.songWorkspace.chooseShapeFor", "Choose a guitar shape for {{chord}}", { chord: symbol }));
            option.appendChild(Shapes.createDiagramElement(parsed, voicing, document));
            elements.shapePickerGrid.appendChild(option);
        });
    }

    function openShapePicker(symbol) {
        const parsed = Shapes.parseChord(symbol);
        if (!parsed) return;
        state.shapePickerSymbol = symbol;
        state.shapePickerOptions = Shapes.generateVoicings(parsed).slice(0, 24);
        renderShapePicker();
        elements.shapePicker.showModal();
        window.requestAnimationFrame(function() {
            elements.shapePickerGrid.querySelector(".is-selected, button")?.focus();
        });
    }

    function selectShape(index) {
        const symbol = state.shapePickerSymbol;
        const voicing = state.shapePickerOptions[index];
        if (!symbol || !voicing) return;
        selectedShapeMap()[Shapes.normalizeChord(symbol) || symbol] = Shapes.voicingKey(voicing);
        Storage.writePreferences(state.preferences);
        elements.shapePicker.close();
        renderShapeCards(currentPlayShapeSong());
    }

    function updateSongFromFields() {
        if (!state.song) return;
        state.song.title = elements.title.value.slice(0, 160) || t("pages.songWorkspace.untitled", "Untitled Song");
        state.song.artist = elements.artist.value.slice(0, 160);
        state.song.originalKey = Core.normalizeKey(elements.originalKey.value);
        state.song.targetKey = Core.normalizeKey(elements.targetKey.value, state.song.originalKey);
        state.song.capo = Math.max(0, Math.min(11, Number(elements.capo.value) || 0));
        state.song.bpm = elements.bpm.value ? Math.max(20, Math.min(320, Number(elements.bpm.value) || 20)) : null;
        state.song.timeSignature = /^\d{1,2}\/\d{1,2}$/.test(elements.timeSignature.value) ? elements.timeSignature.value : "4/4";
        state.song.updatedAt = new Date().toISOString();
        scheduleSave();
        renderEditor();
    }

    function scheduleSave() {
        window.clearTimeout(state.saveTimer);
        elements.autosave.textContent = t("pages.songWorkspace.saving", "Saving…");
        state.saveTimer = window.setTimeout(saveCurrentSong, 500);
    }

    async function saveCurrentSong() {
        if (!state.song) return;
        state.song.updatedAt = new Date().toISOString();
        if (!state.storageAvailable) {
            elements.autosave.textContent = t("pages.songWorkspace.storageUnavailableShort", "Local saving unavailable");
            return;
        }
        try {
            await Storage.put(Core.validateSong(state.song));
            const index = state.songs.findIndex(song => song.id === state.song.id);
            if (index >= 0) state.songs[index] = Core.createSong(state.song);
            else state.songs.unshift(Core.createSong(state.song));
            elements.autosave.textContent = `✓ ${t("pages.songWorkspace.savedOnDevice", "Saved on this device")}`;
        } catch (error) {
            state.storageAvailable = false;
            elements.autosave.textContent = t("pages.songWorkspace.storageUnavailableShort", "Local saving unavailable");
            setStatus(t("pages.songWorkspace.storageUnavailable", "Local saving is unavailable. Download a backup to keep your work."), true);
        }
    }

    function creationCopy(mode) {
        const copies = {
            "chords-lyrics": [t("pages.songWorkspace.chordsLyrics", "Chords + Lyrics"), t("pages.songWorkspace.pasteChart", "Paste chart")],
            lyrics: [t("pages.songWorkspace.lyricsOnly", "Lyrics Only"), t("pages.songWorkspace.pasteLyrics", "Paste lyrics")],
            chords: [t("pages.songWorkspace.chordsOnly", "Chords Only"), t("pages.songWorkspace.pasteChords", "Paste chords")],
            chordpro: ["ChordPro", t("pages.songWorkspace.pasteChordPro", "Paste ChordPro")]
        };
        return copies[mode] || copies["chords-lyrics"];
    }

    function openCreateDialog(mode) {
        const copy = creationCopy(mode);
        elements.createForm.dataset.mode = mode;
        elements.createMode.textContent = copy[0];
        elements.createSourceLabel.textContent = copy[1];
        elements.createTitle.value = "";
        elements.createArtist.value = "";
        elements.createKey.value = "C";
        elements.createSource.value = "";
        elements.createError.textContent = "";
        elements.createDialog.showModal();
        elements.createTitle.focus();
    }

    async function createSongFromDialog() {
        const mode = elements.createForm.dataset.mode;
        const options = { title: elements.createTitle.value, artist: elements.createArtist.value, originalKey: elements.createKey.value };
        let song;
        if (mode === "chordpro") song = Core.parseChordPro(elements.createSource.value, options);
        else song = Core.parseChordLyrics(elements.createSource.value, options);
        if (mode === "lyrics") {
            song.sections.forEach(section => section.lines.forEach(line => { line.chords = []; line.type = "lyric"; }));
        }
        if (!song.sections.some(section => section.lines.length)) {
            song.sections = [Core.createSection("Song", "section", [Core.createLine("", [], mode === "chords" ? "instrumental" : "lyric")])];
        }
        if (state.storageAvailable) await Storage.put(song);
        state.songs.unshift(song);
        elements.createDialog.close();
        showEditor(song);
    }

    function findCanonicalLine(sectionIndex, lineIndex) {
        return state.song?.sections?.[sectionIndex]?.lines?.[lineIndex] || null;
    }

    function openLineEditor(sectionIndex, lineIndex) {
        const line = findCanonicalLine(sectionIndex, lineIndex);
        if (!line) return;
        state.lineContext = { sectionIndex, lineIndex };
        state.lineDraft = Core.createLine(line.text, line.chords, line.type, line.id);
        state.selectedAnchor = 0;
        state.editingAnchorId = null;
        elements.lineText.value = state.lineDraft.text;
        elements.anchorChord.value = "";
        elements.addAnchor.textContent = t("pages.songWorkspace.addChord", "Add Chord");
        elements.lineError.textContent = "";
        renderAnchorEditor();
        elements.lineDialog.showModal();
        window.requestAnimationFrame(function() { elements.lineText.focus(); });
    }

    function renderAnchorEditor() {
        const chars = Core.codePoints(elements.lineText.value);
        elements.anchorPreview.replaceChildren();
        const start = button(t("pages.songWorkspace.lineStart", "Start"), "choose-anchor");
        start.dataset.anchor = "0";
        start.classList.toggle("is-selected", state.selectedAnchor === 0);
        start.setAttribute("aria-label", t("pages.songWorkspace.lineStart", "Start"));
        elements.anchorPreview.appendChild(start);
        chars.forEach(function(char, index) {
            const isSpace = /\s/u.test(char);
            const item = button(isSpace ? "\u00a0" : char, "choose-anchor");
            item.dataset.anchor = String(index);
            item.classList.toggle("is-selected", state.selectedAnchor === index);
            item.setAttribute("aria-label", `${index + 1}: ${isSpace ? t("pages.songWorkspace.space", "space") : char}`);
            elements.anchorPreview.appendChild(item);
        });
        elements.anchorPosition.max = String(chars.length);
        elements.anchorPosition.value = String(Math.min(state.selectedAnchor, chars.length));
        elements.anchorList.replaceChildren();
        state.lineDraft.chords.slice().sort((a, b) => a.anchor - b.anchor).forEach(function(chord) {
            const row = node("div", "workspace-anchor-item");
            row.appendChild(node("strong", "", `${chord.symbol} · ${chord.anchor}`));
            const edit = button(t("pages.songWorkspace.edit", "Edit"), "edit-anchor");
            const move = button(t("pages.songWorkspace.move", "Move"), "move-anchor");
            const remove = button(t("pages.songWorkspace.delete", "Delete"), "delete-anchor");
            edit.dataset.anchorId = chord.id;
            move.dataset.anchorId = chord.id;
            remove.dataset.anchorId = chord.id;
            row.append(edit, move, remove);
            elements.anchorList.appendChild(row);
        });
    }

    function addAnchor() {
        const parsed = Core.parseChordSymbol(elements.anchorChord.value);
        if (!parsed) {
            elements.lineError.textContent = t("pages.songWorkspace.invalidChord", "Enter a supported chord symbol.");
            return;
        }
        const length = Core.codePoints(elements.lineText.value).length;
        const anchor = Math.max(0, Math.min(length, Number(elements.anchorPosition.value) || 0));
        const editing = state.lineDraft.chords.find(chord => chord.id === state.editingAnchorId);
        if (editing) {
            editing.symbol = parsed.raw;
            editing.anchor = anchor;
        } else {
            state.lineDraft.chords.push(Core.createChord(parsed.raw, anchor));
        }
        state.editingAnchorId = null;
        elements.anchorChord.value = "";
        elements.addAnchor.textContent = t("pages.songWorkspace.addChord", "Add Chord");
        elements.lineError.textContent = "";
        renderAnchorEditor();
    }

    function saveLineDraft() {
        const context = state.lineContext;
        if (!context) return;
        const text = elements.lineText.value.slice(0, Core.LIMITS.MAX_LINE_LENGTH);
        const type = text ? "lyric" : "instrumental";
        state.song.sections[context.sectionIndex].lines[context.lineIndex] = Core.createLine(text, state.lineDraft.chords, type, state.lineDraft.id);
        elements.lineDialog.close();
        scheduleSave();
        renderEditor();
    }

    function addSection() {
        const title = window.prompt(t("pages.songWorkspace.sectionNamePrompt", "Section name"), "Verse");
        if (title === null) return;
        state.song.sections.push(Core.createSection(title || "Section", "section", [Core.createLine("", [], "lyric")]));
        scheduleSave();
        renderEditor();
    }

    function downloadSong(song, format) {
        const current = state.song && state.song.id === song.id ? currentShapeSong().song : song;
        if (format === "json") {
            downloadText(safeFileName(song.title, ".jth.json"), Core.serializeSong(song), "application/json");
        } else if (format === "chordpro") {
            downloadText(safeFileName(song.title, ".cho"), Core.toChordPro(current));
        } else if (format === "txt") {
            downloadText(safeFileName(song.title, ".txt"), Core.toPlainText(current));
        } else if (format === "print") {
            if (!state.song || state.song.id !== song.id) showEditor(song);
            window.requestAnimationFrame(function() { window.print(); });
        }
    }

    async function readJsonFile(file) {
        if (!file || file.size > MAX_IMPORT_BYTES) throw new Error(t("pages.songWorkspace.fileTooLarge", "Choose a JSON file under 1 MB."));
        return JSON.parse(await file.text());
    }

    async function importSong(file) {
        const value = await readJsonFile(file);
        const song = Core.validateSong(value);
        if (state.songs.some(item => item.id === song.id)) song.id = Core.createSong({}).id;
        song.createdAt = new Date().toISOString();
        song.updatedAt = song.createdAt;
        if (state.storageAvailable) await Storage.put(song);
        state.songs.unshift(song);
        renderLibrary();
        showEditor(song);
    }

    function backupSongs() {
        if (state.song) {
            const index = state.songs.findIndex(song => song.id === state.song.id);
            const current = Core.createSong(state.song);
            if (index >= 0) state.songs[index] = current;
            else state.songs.unshift(current);
        }
        const backup = { schema: "jamtrackshub-song-backup", version: 1, exportedAt: new Date().toISOString(), songs: state.songs.slice(0, MAX_BACKUP_SONGS) };
        downloadText("jamtrackshub-backup.json", JSON.stringify(backup, null, 2) + "\n", "application/json");
    }

    async function restoreSongs(file) {
        if (!state.storageAvailable) {
            throw new Error(t("pages.songWorkspace.storageUnavailable", "Local saving is unavailable. Download a backup to keep your work."));
        }
        const value = await readJsonFile(file);
        if (!value || value.schema !== "jamtrackshub-song-backup" || Number(value.version) !== 1 || !Array.isArray(value.songs) || value.songs.length > MAX_BACKUP_SONGS) {
            throw new Error(t("pages.songWorkspace.invalidBackup", "This is not a supported Jam Tracks Hub backup."));
        }
        const ids = new Set(state.songs.map(song => song.id));
        const restored = value.songs.map(Core.validateSong).map(function(song) {
            if (ids.has(song.id)) song.id = Core.createSong({}).id;
            ids.add(song.id);
            return song;
        });
        for (const song of restored) await Storage.put(song);
        state.songs = (await Storage.list()).slice(0, MAX_BACKUP_SONGS);
        renderLibrary();
        setStatus(t("pages.songWorkspace.restoreComplete", "Backup restored as additional songs."));
    }

    function renderCapoOptions() {
        const choices = Core.smartCapo(currentConcertSong(), 3);
        elements.capoResults.replaceChildren();
        choices.forEach(function(choice, index) {
            const item = button("", "use-capo", "workspace-capo-option");
            item.dataset.capo = String(choice.capo);
            item.append(
                node("strong", "", `${"★".repeat(Math.max(1, 5 - index))} Capo ${choice.capo}`),
                node("span", "", `${t("pages.songWorkspace.play", "Play")} ${choice.shapeKey} ${t("pages.songWorkspace.shapes", "shapes")}`),
                node("span", "", t(`pages.songWorkspace.capoReason${choice.score <= 0.75 ? "Open" : choice.score <= 2 ? "Easy" : "Alternate"}`, choice.reason))
            );
            elements.capoResults.appendChild(item);
        });
        elements.capoResults.hidden = false;
    }

    function openPerformance() {
        const current = currentShapeSong();
        elements.performanceTitle.textContent = state.song.title;
        elements.performanceMeta.textContent = `${state.song.targetKey} · Capo ${state.song.capo} · ${current.shapeKey} ${t("pages.songWorkspace.shapes", "shapes")}${state.song.bpm ? ` · ${state.song.bpm} BPM` : ""}`;
        renderChart(elements.performanceChart, current.song, false);
        elements.performanceChart.style.fontSize = `${Number(state.preferences.fontScale || 1)}em`;
        elements.scrollSpeed.value = String(Number(state.preferences.scrollSpeed || 4));
        elements.performance.showModal();
        elements.performance.scrollTop = 0;
    }

    function autoScrollFrame(timestamp) {
        if (!state.scrolling || !elements.performance.open) return;
        if (!state.lastScrollTime) state.lastScrollTime = timestamp;
        const elapsed = Math.min(50, timestamp - state.lastScrollTime);
        const speed = Number(elements.scrollSpeed.value) || 4;
        elements.performance.scrollTop += elapsed * speed * 0.012;
        state.lastScrollTime = timestamp;
        state.scrollFrame = requestAnimationFrame(autoScrollFrame);
    }

    function toggleAutoScroll() {
        state.scrolling = !state.scrolling;
        elements.scrollToggle.textContent = state.scrolling ? t("pages.songWorkspace.pauseScroll", "Pause") : t("pages.songWorkspace.startScroll", "Start");
        cancelAnimationFrame(state.scrollFrame);
        state.lastScrollTime = 0;
        if (state.scrolling) state.scrollFrame = requestAnimationFrame(autoScrollFrame);
    }

    function stopAutoScroll() {
        state.scrolling = false;
        cancelAnimationFrame(state.scrollFrame);
        if (elements.scrollToggle) elements.scrollToggle.textContent = t("pages.songWorkspace.startScroll", "Start");
    }

    function adjustFont(delta) {
        const next = Math.max(0.8, Math.min(1.8, Number(state.preferences.fontScale || 1) + delta));
        state.preferences.fontScale = Number(next.toFixed(1));
        Storage.writePreferences(state.preferences);
        elements.performanceChart.style.fontSize = `${state.preferences.fontScale}em`;
    }

    function attachEvents() {
        document.querySelectorAll("[data-create-mode]").forEach(control => control.addEventListener("click", () => openCreateDialog(control.dataset.createMode)));
        [elements.title, elements.artist, elements.bpm, elements.timeSignature].forEach(control => control.addEventListener("input", updateSongFromFields));
        [elements.originalKey, elements.targetKey, elements.capo].forEach(control => control.addEventListener("change", updateSongFromFields));
        document.querySelectorAll("[data-view-mode]").forEach(control => control.addEventListener("click", function() {
            state.viewMode = control.dataset.viewMode;
            state.preferences.viewMode = state.viewMode;
            Storage.writePreferences(state.preferences);
            renderEditor();
        }));
        elements.chordHints.addEventListener("click", function() {
            state.preferences.chordHints = !Boolean(state.preferences.chordHints);
            Storage.writePreferences(state.preferences);
            renderEditor();
        });
        $("backToSongsButton").addEventListener("click", showHome);
        $("addSectionButton").addEventListener("click", addSection);
        $("smartCapoButton").addEventListener("click", renderCapoOptions);
        $("performanceButton").addEventListener("click", openPerformance);
        $("closePerformanceButton").addEventListener("click", function() { stopAutoScroll(); elements.performance.close(); });
        elements.scrollToggle.addEventListener("click", toggleAutoScroll);
        $("scrollResetButton").addEventListener("click", function() { elements.performance.scrollTo({ top: 0, behavior: "smooth" }); });
        $("fontDecreaseButton").addEventListener("click", () => adjustFont(-0.1));
        $("fontIncreaseButton").addEventListener("click", () => adjustFont(0.1));
        elements.scrollSpeed.addEventListener("change", function() { state.preferences.scrollSpeed = Number(elements.scrollSpeed.value); Storage.writePreferences(state.preferences); });
        $("downloadMenuButton").addEventListener("click", function() {
            elements.downloadMenu.hidden = !elements.downloadMenu.hidden;
            $("downloadMenuButton").setAttribute("aria-expanded", String(!elements.downloadMenu.hidden));
        });
        elements.downloadMenu.addEventListener("click", function(event) {
            const control = event.target.closest("[data-download]");
            if (!control || !state.song) return;
            downloadSong(state.song, control.dataset.download);
            elements.downloadMenu.hidden = true;
            $("downloadMenuButton").setAttribute("aria-expanded", "false");
        });
        elements.list.addEventListener("click", async function(event) {
            const control = event.target.closest("[data-action][data-song-id]");
            if (!control) return;
            const song = state.songs.find(item => item.id === control.dataset.songId);
            if (!song) return;
            if (control.dataset.action === "open") showEditor(song);
            else if (control.dataset.action === "download") {
                const menu = Array.from(elements.list.querySelectorAll("[data-download-menu-for]")).find(function(candidate) {
                    return candidate.dataset.downloadMenuFor === song.id;
                });
                if (menu) {
                    menu.hidden = !menu.hidden;
                    control.setAttribute("aria-expanded", String(!menu.hidden));
                }
            } else if (control.dataset.action === "library-download") {
                downloadSong(song, control.dataset.format);
            } else if (control.dataset.action === "duplicate") {
                const copy = Core.createSong(Object.assign({}, song, { id: undefined, title: `${song.title} (${t("common.duplicate", "Duplicate")})`, createdAt: undefined, updatedAt: undefined }));
                if (state.storageAvailable) await Storage.put(copy);
                state.songs.unshift(copy); renderLibrary();
            } else if (control.dataset.action === "delete" && window.confirm(t("pages.songWorkspace.deleteConfirm", "Delete this local song? This cannot be undone."))) {
                if (state.storageAvailable) await Storage.remove(song.id);
                state.songs = state.songs.filter(item => item.id !== song.id); renderLibrary();
            }
        });
        elements.chart.addEventListener("click", function(event) {
            const control = event.target.closest("[data-action]");
            if (!control) return;
            const sectionIndex = Number(control.dataset.sectionIndex);
            if (control.dataset.action === "edit-line") openLineEditor(sectionIndex, Number(control.dataset.lineIndex));
            else if (control.dataset.action === "add-line") {
                const insertionIndex = Number(control.dataset.insertionIndex);
                const result = Core.insertLine(state.song, sectionIndex, insertionIndex, Core.createLine("", [], "lyric"));
                state.song = result.song;
                scheduleSave();
                renderEditor();
                openLineEditor(sectionIndex, result.index);
            } else if (control.dataset.action === "rename-section") {
                const section = state.song.sections[sectionIndex];
                const title = window.prompt(t("pages.songWorkspace.sectionNamePrompt", "Section name"), section.title);
                if (title !== null) { section.title = title.slice(0, 80) || "Section"; scheduleSave(); renderEditor(); }
            } else if (control.dataset.action === "delete-section" && window.confirm(t("pages.songWorkspace.deleteSectionConfirm", "Delete this section?"))) {
                state.song.sections.splice(sectionIndex, 1); scheduleSave(); renderEditor();
            }
        });
        elements.shapeCards.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="choose-shape"]');
            if (control) openShapePicker(control.dataset.chordSymbol);
        });
        elements.shapePickerGrid.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="select-shape"]');
            if (control) selectShape(Number(control.dataset.shapeIndex));
        });
        $("closeShapePickerButton").addEventListener("click", function() { elements.shapePicker.close(); });
        elements.capoResults.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="use-capo"]');
            if (!control) return;
            elements.capo.value = control.dataset.capo; updateSongFromFields(); elements.capoResults.hidden = true;
        });
        elements.createForm.addEventListener("submit", async function(event) {
            if (event.submitter?.value !== "default") return;
            event.preventDefault();
            try { await createSongFromDialog(); } catch (error) { elements.createError.textContent = error.message || t("pages.songWorkspace.importError", "We could not recognize this chart."); }
        });
        elements.lineText.addEventListener("input", function() { state.lineDraft.text = elements.lineText.value; renderAnchorEditor(); });
        elements.anchorPosition.addEventListener("input", function() { state.selectedAnchor = Number(elements.anchorPosition.value) || 0; renderAnchorEditor(); });
        elements.anchorPreview.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="choose-anchor"]');
            if (!control) return;
            state.selectedAnchor = Number(control.dataset.anchor); renderAnchorEditor();
        });
        $("addAnchorButton").addEventListener("click", addAnchor);
        elements.anchorList.addEventListener("click", function(event) {
            const control = event.target.closest("[data-anchor-id]");
            if (!control) return;
            const chord = state.lineDraft.chords.find(item => item.id === control.dataset.anchorId);
            if (!chord) return;
            if (control.dataset.action === "delete-anchor") {
                state.lineDraft.chords = state.lineDraft.chords.filter(item => item.id !== chord.id);
                if (state.editingAnchorId === chord.id) state.editingAnchorId = null;
            } else if (control.dataset.action === "edit-anchor") {
                state.editingAnchorId = chord.id;
                state.selectedAnchor = chord.anchor;
                elements.anchorChord.value = chord.symbol;
                elements.addAnchor.textContent = t("pages.songWorkspace.updateChord", "Update Chord");
            } else {
                chord.anchor = state.selectedAnchor;
            }
            renderAnchorEditor();
        });
        elements.lineForm.addEventListener("submit", function(event) {
            if (event.submitter?.value !== "default") return;
            event.preventDefault(); saveLineDraft();
        });
        $("importSongButton").addEventListener("click", () => elements.importInput.click());
        $("restoreSongsButton").addEventListener("click", () => elements.restoreInput.click());
        $("backupSongsButton").addEventListener("click", backupSongs);
        elements.importInput.addEventListener("change", async function() {
            try { await importSong(elements.importInput.files[0]); } catch (error) { setStatus(error.message, true); } finally { elements.importInput.value = ""; }
        });
        elements.restoreInput.addEventListener("change", async function() {
            try { await restoreSongs(elements.restoreInput.files[0]); } catch (error) { setStatus(error.message, true); } finally { elements.restoreInput.value = ""; }
        });
        document.addEventListener("click", function(event) {
            if (!event.target.closest("#downloadMenuButton, #downloadMenu")) {
                elements.downloadMenu.hidden = true;
                $("downloadMenuButton").setAttribute("aria-expanded", "false");
            }
            if (!event.target.closest('[data-action="download"], .workspace-song-download-menu')) {
                elements.list.querySelectorAll('[data-action="download"]').forEach(function(control) {
                    control.setAttribute("aria-expanded", "false");
                });
                elements.list.querySelectorAll(".workspace-song-download-menu").forEach(menu => { menu.hidden = true; });
            }
        });
        document.addEventListener("keydown", function(event) {
            if (!elements.performance.open || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
            if (event.key === " ") { event.preventDefault(); toggleAutoScroll(); }
            else if (event.key === "+" || event.key === "=") adjustFont(0.1);
            else if (event.key === "-") adjustFont(-0.1);
        });
        window.addEventListener("jasper:language-change", function() {
            renderLibrary();
            if (state.song) renderEditor();
            if (elements.createDialog.open) {
                const copy = creationCopy(elements.createForm.dataset.mode);
                elements.createMode.textContent = copy[0];
                elements.createSourceLabel.textContent = copy[1];
            }
            if (elements.shapePicker.open) renderShapePicker();
        });
        elements.performance.addEventListener("cancel", stopAutoScroll);
        document.addEventListener("visibilitychange", function() {
            if (document.visibilityState === "hidden" && state.saveTimer) {
                window.clearTimeout(state.saveTimer);
                state.saveTimer = 0;
                saveCurrentSong();
            }
        });
    }

    async function initialize() {
        initializeSelects();
        state.viewMode = ["original", "balanced", "beginner", "roman", "nashville"].includes(state.preferences.viewMode) ? state.preferences.viewMode : "original";
        state.preferences.chordHints = Boolean(state.preferences.chordHints);
        attachEvents();
        await loadSongs();
        const requestedId = new URLSearchParams(location.search).get("song");
        const initialSong = state.songs.find(song => song.id === requestedId);
        if (initialSong) showEditor(initialSong);
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
