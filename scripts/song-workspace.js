(function() {
    "use strict";

    const Core = window.JamSongCore;
    const Storage = window.JamSongStorage;
    const SongImport = window.JamSongImport;
    const Shapes = window.JamChordShapes;
    if (!Core || !Storage || !SongImport || !Shapes) return;

    const MAX_IMPORT_BYTES = 1024 * 1024;
    const MAX_BACKUP_SONGS = 500;
    const KEYS = Core.KEY_OPTIONS.major.concat(Core.KEY_OPTIONS.minor);
    const state = {
        songs: [],
        song: null,
        viewMode: "original",
        storageAvailable: true,
        saveState: "neutral",
        saveTimer: 0,
        lineContext: null,
        lineDraft: null,
        selectedAnchorPosition: 0,
        editingAnchorId: null,
        shapePickerSymbol: null,
        shapePickerOptions: [],
        shapePickerPosition: "all",
        shapePickerRootString: "all",
        shapePickerTrigger: null,
        shapePickerClosing: false,
        dialogLock: null,
        addMenuTrigger: null,
        globalAddType: null,
        globalAddTargets: [],
        globalAddTrigger: null,
        sectionInsertContext: null,
        instrumentalInsertContext: null,
        chordLayoutFrame: 0,
        scrollFrame: 0,
        scrolling: false,
        lastScrollTime: 0,
        scrollPosition: 0,
        readMode: false,
        readShapesOpen: false,
        readModeScrollPosition: 0,
        resumeReadAfterPerformance: false,
        readModeTrigger: null,
        settingsDisclosureExpanded: true,
        settingsDisclosureAnimation: null,
        activeSettingHelp: null,
        titleEditing: false,
        metadataEditing: false,
        activeSectionActions: null,
        createInFlight: false,
        importInFlight: false,
        restoreInFlight: false,
        duplicateInFlight: new Set(),
        preferences: Storage.readPreferences()
    };

    const $ = id => document.getElementById(id);
    const elements = {
        home: $("workspaceHomeView"), editor: $("workspaceEditorView"), status: $("workspaceStatus"),
        list: $("songList"), empty: $("songEmptyState"),
        title: $("songTitleInput"), artist: $("songArtistInput"), originalKey: $("originalKeySelect"),
        targetKey: $("targetKeySelect"), capo: $("capoSelect"), shapeKey: $("shapeKeyValue"),
        chordSpelling: $("chordSpellingSelect"),
        bpm: $("bpmInput"), timeSignature: $("timeSignatureInput"), autosave: $("autosaveState"),
        chartTitle: $("songChartTitle"), titleDisplay: $("songTitleDisplay"), titleView: $("songTitleView"),
        titleEditForm: $("songTitleEditForm"), metadataView: $("songMetadataView"),
        metadataSummary: $("songMetadataSummary"), metadataEditForm: $("songMetadataEditForm"),
        chartSummary: $("chartKeySummary"), chart: $("songChart"),
        shapePanel: $("chordShapesPanel"), shapeCards: $("shapeCards"), readShapesBackdrop: $("readShapesBackdrop"),
        capoResults: $("capoResults"), downloadMenu: $("downloadMenu"),
        createDialog: $("createSongDialog"), createForm: $("createSongForm"), createMode: $("createModeLabel"),
        createTitle: $("createTitleInput"), createArtist: $("createArtistInput"), createKey: $("createKeySelect"),
        createSource: $("createSourceInput"), createSourceLabel: $("createSourceLabel"), createError: $("createDialogError"),
        createLocalDisclosure: $("createLocalDisclosure"),
        confirmCreate: $("confirmCreateButton"),
        lineDialog: $("lineEditorDialog"), lineForm: $("lineEditorForm"), lineText: $("lineTextInput"),
        lineTextCount: $("lineTextCharacterCount"), anchorCount: $("anchorChordCount"),
        lineTitle: $("lineDialogTitle"), lineTextField: $("lineTextField"),
        anchorPreview: $("anchorPreview"), anchorChord: $("anchorChordInput"), anchorPosition: $("anchorPositionInput"),
        anchorPositionField: $("anchorPositionField"),
        anchorList: $("anchorList"), addAnchor: $("addAnchorButton"), lineError: $("lineDialogError"),
        deleteLine: $("deleteLineButton"), saveLine: $("saveLineButton"),
        chordHints: $("chordHintsButton"), shapePicker: $("shapePickerDialog"),
        chartZoomInput: $("chartZoomInput"), chartZoomDecrease: $("chartZoomDecreaseButton"),
        chartZoomIncrease: $("chartZoomIncreaseButton"),
        lineSpacingInput: $("lineSpacingInput"), lineSpacingDecrease: $("lineSpacingDecreaseButton"),
        lineSpacingIncrease: $("lineSpacingIncreaseButton"),
        settingsDisclosure: $("workspaceSettingsDisclosure"),
        settingsSummary: $("workspaceSettingsSummary"), settingsPanel: $("workspaceSettingsPanel"),
        shapePickerSymbol: $("shapePickerSymbol"), shapePickerCount: $("shapePickerCount"),
        shapePickerPosition: $("shapePositionFilter"), shapePickerRoot: $("shapeRootFilter"),
        shapePickerGrid: $("shapePickerGrid"),
        globalAdd: $("globalAddDialog"), globalAddTypeStep: $("globalAddTypeStep"),
        globalAddPositionStep: $("globalAddPositionStep"), globalAddStepLabel: $("globalAddStepLabel"),
        globalAddPositionList: $("globalAddPositionList"), globalAddBack: $("globalAddBackButton"),
        sectionDialog: $("sectionNameDialog"), sectionForm: $("sectionNameForm"), sectionName: $("sectionNameInput"),
        instrumentalDialog: $("instrumentalSectionDialog"), instrumentalForm: $("instrumentalSectionForm"),
        instrumentalName: $("instrumentalSectionNameInput"), instrumentalBars: $("instrumentalBarCountInput"),
        instrumentalError: $("instrumentalSectionDialogError"),
        performance: $("performanceDialog"), performanceTitle: $("performanceTitle"),
        performanceMeta: $("performanceMeta"), performanceChart: $("performanceChart"),
        scrollToggle: $("scrollToggleButton"), scrollSpeed: $("scrollSpeedInput"), scrollSpeedValue: $("scrollSpeedValue"),
        readToolbar: $("readModeToolbar"), readSummary: $("readModeKeySummary"),
        readZoomValue: $("readZoomValue"), readZoomDecrease: $("readZoomDecreaseButton"),
        readZoomIncrease: $("readZoomIncreaseButton"), readSpacingValue: $("readSpacingValue"),
        readSpacingDecrease: $("readSpacingDecreaseButton"), readSpacingIncrease: $("readSpacingIncreaseButton"),
        readShapes: $("readShapesButton"),
        importInput: $("songImportInput"), restoreInput: $("songRestoreInput")
    };

    function t(key, fallback, variables) {
        return window.JasperI18n?.translate?.(key, fallback, variables) ?? fallback;
    }

    function initializeChartZoomPreference() {
        const storedZoom = state.preferences.chartZoom;
        let zoom = Storage.normalizeStoredChartZoom(storedZoom);
        if (storedZoom === undefined && state.preferences.fontScale !== undefined) {
            zoom = Storage.commitChartZoom(Number(state.preferences.fontScale) * 100, Storage.CHART_ZOOM.default);
        }
        const changed = storedZoom !== zoom || Object.prototype.hasOwnProperty.call(state.preferences, "fontScale");
        state.preferences.chartZoom = zoom;
        delete state.preferences.fontScale;
        if (changed) Storage.writePreferences(state.preferences);
    }

    function initializeLineSpacingPreference() {
        const storedSpacing = state.preferences.lineSpacing;
        const spacing = Storage.normalizeStoredLineSpacing(storedSpacing);
        state.preferences.lineSpacing = spacing;
        if (storedSpacing !== spacing) Storage.writePreferences(state.preferences);
    }

    function updateReadingControlLabels() {
        const decrease = t("pages.songWorkspace.decreaseZoom", "Decrease zoom");
        const increase = t("pages.songWorkspace.increaseZoom", "Increase zoom");
        const chartZoom = t("pages.songWorkspace.chartZoom", "Chart zoom");
        [elements.chartZoomDecrease, $("fontDecreaseButton")].forEach(function(control) {
            control.title = decrease;
        });
        [elements.chartZoomIncrease, $("fontIncreaseButton")].forEach(function(control) {
            control.title = increase;
        });
        elements.chartZoomInput.title = chartZoom;
        elements.lineSpacingDecrease.title = t("pages.songWorkspace.decreaseLineSpacing", "Decrease line spacing");
        elements.lineSpacingIncrease.title = t("pages.songWorkspace.increaseLineSpacing", "Increase line spacing");
        elements.lineSpacingInput.title = t("pages.songWorkspace.lineSpacing", "Line spacing");
    }

    function applyChartZoom() {
        const zoom = Storage.normalizeStoredChartZoom(state.preferences.chartZoom);
        state.preferences.chartZoom = zoom;
        [elements.chart, elements.performanceChart].forEach(function(chart) {
            chart.style.setProperty("--song-chart-zoom", `${zoom}%`);
        });
        elements.chartZoomInput.value = String(zoom);
        elements.chartZoomDecrease.disabled = zoom <= Storage.CHART_ZOOM.min;
        elements.chartZoomIncrease.disabled = zoom >= Storage.CHART_ZOOM.max;
        elements.readZoomValue.value = `${zoom}%`;
        elements.readZoomDecrease.disabled = zoom <= Storage.CHART_ZOOM.min;
        elements.readZoomIncrease.disabled = zoom >= Storage.CHART_ZOOM.max;
        $("fontDecreaseButton").disabled = zoom <= Storage.CHART_ZOOM.min;
        $("fontIncreaseButton").disabled = zoom >= Storage.CHART_ZOOM.max;
        scheduleChordLayouts();
    }

    function setChartZoom(value) {
        const previous = Storage.normalizeStoredChartZoom(state.preferences.chartZoom);
        state.preferences.chartZoom = Storage.commitChartZoom(value, previous);
        Storage.writePreferences(state.preferences);
        applyChartZoom();
    }

    function adjustChartZoom(delta) {
        state.preferences.chartZoom = Storage.stepChartZoom(state.preferences.chartZoom, delta);
        Storage.writePreferences(state.preferences);
        applyChartZoom();
    }

    function commitChartZoomInput() {
        setChartZoom(elements.chartZoomInput.value);
    }

    function applyLineSpacing() {
        const spacing = Storage.normalizeStoredLineSpacing(state.preferences.lineSpacing);
        state.preferences.lineSpacing = spacing;
        [elements.chart, elements.performanceChart].forEach(function(chart) {
            chart.style.setProperty("--song-line-spacing", `${spacing}px`);
        });
        elements.lineSpacingInput.value = String(spacing);
        elements.lineSpacingDecrease.disabled = spacing <= Storage.LINE_SPACING.min;
        elements.lineSpacingIncrease.disabled = spacing >= Storage.LINE_SPACING.max;
        elements.readSpacingValue.value = `${spacing}px`;
        elements.readSpacingDecrease.disabled = spacing <= Storage.LINE_SPACING.min;
        elements.readSpacingIncrease.disabled = spacing >= Storage.LINE_SPACING.max;
    }

    function setLineSpacing(value) {
        const previous = Storage.normalizeStoredLineSpacing(state.preferences.lineSpacing);
        state.preferences.lineSpacing = Storage.commitLineSpacing(value, previous);
        Storage.writePreferences(state.preferences);
        applyLineSpacing();
    }

    function adjustLineSpacing(delta) {
        state.preferences.lineSpacing = Storage.stepLineSpacing(state.preferences.lineSpacing, delta);
        Storage.writePreferences(state.preferences);
        applyLineSpacing();
    }

    function commitLineSpacingInput() {
        setLineSpacing(elements.lineSpacingInput.value);
    }

    function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function setSettingsDisclosureExpanded(expanded, options) {
        const settings = options || {};
        const disclosure = elements.settingsDisclosure;
        const panel = elements.settingsPanel;
        const next = Boolean(expanded);
        const currentHeight = disclosure.open ? panel.getBoundingClientRect().height : 0;
        const currentOpacity = disclosure.open ? Number(window.getComputedStyle(panel).opacity) : 0;
        state.settingsDisclosureExpanded = next;
        state.settingsDisclosureAnimation?.cancel();
        state.settingsDisclosureAnimation = null;
        elements.settingsSummary.setAttribute("aria-expanded", String(next));
        disclosure.classList.toggle("is-settings-expanded", next);

        if (!settings.animate || prefersReducedMotion()) {
            disclosure.open = next;
            panel.style.removeProperty("height");
            panel.style.removeProperty("opacity");
            panel.style.removeProperty("transform");
            return;
        }

        disclosure.open = true;
        const endHeight = next ? panel.scrollHeight : 0;
        const animation = panel.animate([
            {
                height: `${currentHeight}px`,
                opacity: currentOpacity,
                transform: currentHeight === 0 ? "translateY(-4px)" : "translateY(0)"
            },
            {
                height: `${endHeight}px`,
                opacity: next ? 1 : 0,
                transform: next ? "translateY(0)" : "translateY(-4px)"
            }
        ], {
            duration: 240,
            easing: "cubic-bezier(0.25, 0.8, 0.25, 1)"
        });
        state.settingsDisclosureAnimation = animation;
        animation.addEventListener("finish", function() {
            if (state.settingsDisclosureAnimation !== animation) return;
            state.settingsDisclosureAnimation = null;
            disclosure.open = state.settingsDisclosureExpanded;
            panel.style.removeProperty("height");
            panel.style.removeProperty("opacity");
            panel.style.removeProperty("transform");
        }, { once: true });
        animation.addEventListener("cancel", function() {
            if (state.settingsDisclosureAnimation === animation) state.settingsDisclosureAnimation = null;
        }, { once: true });
    }

    function syncSettingsDisclosureViewport() {
        const viewportMode = window.matchMedia("(max-width: 720px)").matches ? "narrow" : "wide";
        if (elements.settingsDisclosure.dataset.viewportMode === viewportMode) return;
        setSettingsDisclosureExpanded(viewportMode === "wide", { animate: false });
        elements.settingsDisclosure.dataset.viewportMode = viewportMode;
    }

    function closeSettingHelp(options) {
        const settings = options || {};
        const item = state.activeSettingHelp;
        if (!item) return;
        item.classList.remove("is-help-open");
        const trigger = item.querySelector("[data-setting-help]");
        trigger?.setAttribute("aria-expanded", "false");
        state.activeSettingHelp = null;
        if (settings.restoreFocus && trigger?.isConnected) focusWithoutScroll(trigger);
    }

    function openSettingHelp(item) {
        if (!item || state.activeSettingHelp === item) return;
        closeSettingHelp();
        state.activeSettingHelp = item;
        item.classList.add("is-help-open");
        item.querySelector("[data-setting-help]")?.setAttribute("aria-expanded", "true");
    }

    function metadataSummaryText() {
        return [
            state.song.artist || t("pages.songWorkspace.unknownArtist", "No artist"),
            state.song.bpm ? `${state.song.bpm} BPM` : t("pages.songWorkspace.noBpm", "No BPM"),
            state.song.timeSignature
        ].join(" · ");
    }

    function syncScoreHeader() {
        if (!state.song) return;
        elements.titleDisplay.textContent = state.song.title;
        elements.metadataSummary.textContent = metadataSummaryText();
        elements.titleView.hidden = state.titleEditing;
        elements.titleEditForm.hidden = !state.titleEditing;
        elements.metadataView.hidden = state.metadataEditing;
        elements.metadataEditForm.hidden = !state.metadataEditing;
        $("songTitleEditButton").disabled = state.readMode;
        $("songTitleEditButton").tabIndex = state.readMode ? -1 : 0;
        $("songMetadataEditButton").hidden = state.readMode;
    }

    function beginTitleEdit() {
        if (!state.song || state.readMode) return;
        state.metadataEditing = false;
        state.titleEditing = true;
        elements.title.value = state.song.title;
        elements.artist.value = state.song.artist;
        elements.bpm.value = state.song.bpm || "";
        elements.timeSignature.value = state.song.timeSignature;
        syncScoreHeader();
        window.requestAnimationFrame(function() {
            focusWithoutScroll(elements.title);
            elements.title.select();
        });
    }

    function cancelTitleEdit() {
        state.titleEditing = false;
        elements.title.value = state.song?.title || "";
        syncScoreHeader();
        focusWithoutScroll($("songTitleEditButton"));
    }

    function saveTitleEdit() {
        const title = elements.title.value.trim();
        if (!title) {
            elements.title.reportValidity();
            return;
        }
        state.song.title = title.slice(0, 160);
        state.song.updatedAt = new Date().toISOString();
        state.titleEditing = false;
        scheduleSave();
        syncScoreHeader();
        focusWithoutScroll($("songTitleEditButton"));
    }

    function beginMetadataEdit() {
        if (!state.song || state.readMode) return;
        state.titleEditing = false;
        state.metadataEditing = true;
        elements.title.value = state.song.title;
        elements.artist.value = state.song.artist;
        elements.bpm.value = state.song.bpm || "";
        elements.timeSignature.value = state.song.timeSignature;
        syncScoreHeader();
        window.requestAnimationFrame(function() { focusWithoutScroll(elements.artist); });
    }

    function cancelMetadataEdit() {
        state.metadataEditing = false;
        elements.artist.value = state.song?.artist || "";
        elements.bpm.value = state.song?.bpm || "";
        elements.timeSignature.value = state.song?.timeSignature || "4/4";
        syncScoreHeader();
        focusWithoutScroll($("songMetadataEditButton"));
    }

    function saveMetadataEdit() {
        const bpm = elements.bpm.value === "" ? null : Number(elements.bpm.value);
        const signature = elements.timeSignature.value.trim();
        if ((bpm !== null && (!Number.isFinite(bpm) || bpm < 20 || bpm > 320)) || !/^\d{1,2}\/\d{1,2}$/.test(signature)) {
            elements.metadataEditForm.reportValidity();
            return;
        }
        state.song.artist = elements.artist.value.trim().slice(0, 160);
        state.song.bpm = bpm === null ? null : Math.round(bpm);
        state.song.timeSignature = signature;
        state.song.updatedAt = new Date().toISOString();
        state.metadataEditing = false;
        scheduleSave();
        renderEditor();
        focusWithoutScroll($("songMetadataEditButton"));
    }

    function updateReadShapes() {
        const open = state.readMode && state.readShapesOpen;
        elements.shapePanel.classList.toggle("is-read-open", open);
        elements.readShapesBackdrop.hidden = !open;
        elements.readShapes.setAttribute("aria-expanded", String(open));
        elements.readShapes.textContent = open
            ? t("pages.songWorkspace.hideChordShapes", "Hide Chord Shapes")
            : t("pages.songWorkspace.showChordShapes", "Show Chord Shapes");
    }

    function setReadShapes(open, options) {
        const settings = options || {};
        state.readShapesOpen = Boolean(open) && state.readMode;
        updateReadShapes();
        if (state.readShapesOpen) {
            window.requestAnimationFrame(function() { focusWithoutScroll($("closeReadShapesButton")); });
        } else if (settings.restoreFocus !== false) {
            focusWithoutScroll(elements.readShapes);
        }
    }

    function setReadMode(enabled, options) {
        const settings = options || {};
        const next = Boolean(enabled);
        if (state.readMode === next) return;
        if (next && elements.performance.open) {
            stopAutoScroll();
            elements.performance.close();
        }
        if (next && !settings.preserveScroll) state.readModeScrollPosition = window.scrollY;
        const previousScroll = state.readModeScrollPosition;
        state.readMode = next;
        state.readShapesOpen = false;
        state.titleEditing = false;
        state.metadataEditing = false;
        state.activeSectionActions = null;
        closeSettingHelp();
        if (next) state.readModeTrigger = settings.trigger || document.activeElement;
        renderEditor();
        if (next) {
            window.requestAnimationFrame(function() {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                focusWithoutScroll($("exitReadModeButton"));
            });
        } else if (settings.restoreFocus !== false) {
            const target = state.readModeTrigger?.isConnected ? state.readModeTrigger : $("readModeButton");
            state.readModeTrigger = null;
            window.requestAnimationFrame(function() {
                focusWithoutScroll(target);
                window.scrollTo({ top: previousScroll, left: 0, behavior: "instant" });
            });
        }
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

    const LIBRARY_ICON_PATHS = {
        open: ["M3 7h7l2 2h9v10H3Z"],
        duplicate: ["M8 8h11v11H8Z", "M5 16H4V4h12v1"],
        download: ["M12 3v12", "m7 10 5 5 5-5", "M5 20h14"],
        delete: ["M3 6h18", "M8 6V4h8v2", "m19 6-1 14H6L5 6", "M10 11v5", "M14 11v5"]
    };

    function libraryIcon(name, className) {
        const namespace = "http://www.w3.org/2000/svg";
        const icon = document.createElementNS(namespace, "svg");
        icon.classList.add(className || "workspace-library-action-icon");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("focusable", "false");
        (LIBRARY_ICON_PATHS[name] || []).forEach(function(pathData) {
            const path = document.createElementNS(namespace, "path");
            path.setAttribute("d", pathData);
            icon.appendChild(path);
        });
        return icon;
    }

    function songMetaRow(text) {
        return node("span", "workspace-song-meta-row", text);
    }

    function deleteActionIcon() {
        const namespace = "http://www.w3.org/2000/svg";
        const icon = document.createElementNS(namespace, "svg");
        icon.classList.add("workspace-anchor-action-icon");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("focusable", "false");
        [
            "M3 6h18",
            "M8 6V4h8v2",
            "M19 6l-1 14H6L5 6",
            "M10 11v5",
            "M14 11v5"
        ].forEach(function(pathData) {
            const path = document.createElementNS(namespace, "path");
            path.setAttribute("d", pathData);
            icon.appendChild(path);
        });
        return icon;
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
        KEYS.forEach(function(key) {
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
            const storedSongs = await Storage.list();
            const result = Storage.filterValidSongs(storedSongs, Core.validateSong);
            state.songs = result.songs;
            state.storageAvailable = true;
            if (result.skippedCount) {
                setStatus(t(
                    "pages.songWorkspace.corruptSongsSkipped",
                    "Some unsupported local songs were skipped. Your other songs are still available."
                ), true);
            }
        } catch (error) {
            state.storageAvailable = false;
            state.songs = [];
            setStatus(t("pages.songWorkspace.storageUnavailable", "Local saving is unavailable. Download a backup to keep your work."), true);
        }
        setSaveState(state.storageAvailable ? "neutral" : "unavailable");
        renderLibrary();
    }

    function renderLibrary() {
        elements.list.replaceChildren();
        elements.empty.hidden = state.songs.length > 0;
        state.songs.forEach(function(song) {
            const card = node("article", "workspace-song-card");
            const identity = node("div", "workspace-song-card-identity");
            const heading = node("div", "workspace-song-title-block");
            heading.append(node("h3", "", song.title), node("p", "", song.artist || t("pages.songWorkspace.unknownArtist", "No artist")));
            identity.appendChild(heading);
            const meta = node("div", "workspace-song-meta-summary");
            meta.append(
                songMetaRow(`${t("pages.songWorkspace.key", "Key")}: ${song.targetKey || song.originalKey}`),
                songMetaRow(`Capo: ${song.capo || 0}`),
                songMetaRow(formatDate(song.updatedAt))
            );
            const actions = node("div", "workspace-song-actions");
            const downloadMenuId = `workspace-download-${song.id}`;
            [
                [t("pages.songWorkspace.open", "Open"), "open"],
                [t("common.duplicate", "Duplicate"), "duplicate"],
                [t("pages.songWorkspace.download", "Download"), "download"],
                [t("pages.songWorkspace.delete", "Delete"), "delete"]
            ].forEach(function(entry) {
                const variant = entry[1] === "open"
                    ? "workspace-button-primary"
                    : entry[1] === "delete" ? "workspace-button-danger" : "workspace-button-secondary";
                const control = button(entry[0], entry[1], `workspace-button ${variant} workspace-button-compact`);
                control.dataset.songId = song.id;
                if (entry[1] === "download") {
                    control.setAttribute("aria-haspopup", "menu");
                    control.setAttribute("aria-expanded", "false");
                    control.setAttribute("aria-controls", downloadMenuId);
                }
                control.replaceChildren(libraryIcon(entry[1], "workspace-song-action-icon"), node("span", "", entry[0]));
                actions.appendChild(control);
            });
            const downloadMenu = node("div", "workspace-song-download-menu");
            downloadMenu.id = downloadMenuId;
            downloadMenu.setAttribute("role", "menu");
            downloadMenu.hidden = true;
            downloadMenu.dataset.downloadMenuFor = song.id;
            [["JSON", "json"], ["ChordPro", "chordpro"], ["TXT", "txt"], [t("pages.songWorkspace.printPdf", "Print / PDF"), "print"]].forEach(function(entry) {
                const control = button(entry[0], "library-download", "workspace-menu-action");
                control.setAttribute("role", "menuitem");
                control.dataset.songId = song.id;
                control.dataset.format = entry[1];
                downloadMenu.appendChild(control);
            });
            card.append(identity, meta, actions, downloadMenu);
            elements.list.appendChild(card);
        });
    }

    function showHome() {
        stopAutoScroll();
        document.body.classList.remove("song-workspace-read-mode");
        state.readMode = false;
        state.readShapesOpen = false;
        state.titleEditing = false;
        state.metadataEditing = false;
        state.activeSectionActions = null;
        state.song = null;
        elements.editor.hidden = true;
        elements.home.hidden = false;
        history.replaceState(null, "", "song-workspace.html");
        setSaveState(state.storageAvailable ? "neutral" : "unavailable");
        renderLibrary();
    }

    function showEditor(song) {
        state.song = Core.validateSong(song);
        state.readMode = false;
        state.readShapesOpen = false;
        state.titleEditing = false;
        state.metadataEditing = false;
        state.activeSectionActions = null;
        elements.home.hidden = true;
        elements.editor.hidden = false;
        elements.title.value = state.song.title;
        elements.artist.value = state.song.artist;
        elements.originalKey.value = state.song.originalKey;
        elements.targetKey.value = state.song.targetKey;
        elements.capo.value = String(state.song.capo);
        elements.chordSpelling.value = state.song.chordSpelling;
        elements.bpm.value = state.song.bpm || "";
        elements.timeSignature.value = state.song.timeSignature;
        state.preferences.lastSongId = state.song.id;
        Storage.writePreferences(state.preferences);
        history.replaceState(null, "", Core.songWorkspaceUrl(state.song.id));
        setSaveState(state.storageAvailable ? "saved" : "unavailable");
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
            song = Core.transformSongChords(song, symbol => Core.chordNumber(symbol, capoResult.shapeKey, state.viewMode));
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
        const keySummary = `${t("pages.songWorkspace.concertKey", "Concert")}: ${state.song.targetKey} · Capo ${state.song.capo} · ${current.shapeKey} ${t("pages.songWorkspace.shapes", "shapes")}`;
        elements.chartSummary.textContent = keySummary;
        elements.readSummary.textContent = keySummary;
        elements.editor.classList.toggle("is-read-mode", state.readMode);
        document.body.classList.toggle("song-workspace-read-mode", state.readMode);
        elements.readToolbar.hidden = !state.readMode;
        syncScoreHeader();
        document.querySelectorAll("[data-view-mode]").forEach(function(control) {
            const selected = control.dataset.viewMode === state.viewMode;
            control.classList.toggle("is-selected", selected);
            control.setAttribute("aria-pressed", String(selected));
        });
        elements.chordHints.setAttribute("aria-pressed", String(hintsEnabled));
        renderChart(elements.chart, current.song, !state.readMode);
        applyChartZoom();
        applyLineSpacing();
        renderShapeCards(currentPlayShapeSong());
        updateReadShapes();
    }

    function renderChart(host, song, editable) {
        host.replaceChildren();
        if (editable && !song.sections.length) {
            host.appendChild(renderInsertControl(0, 0));
            scheduleChordLayouts();
            return;
        }
        song.sections.forEach(function(section, sectionIndex) {
            const sectionElement = node("section", `workspace-section${section.type === "instrumental" ? " is-instrumental" : ""}`);
            const heading = node("div", "workspace-section-heading-row");
            if (editable) {
                const sectionTitle = button("", "toggle-section-actions", "workspace-section-title-trigger");
                sectionTitle.dataset.sectionIndex = String(sectionIndex);
                sectionTitle.setAttribute("aria-expanded", String(state.activeSectionActions === sectionIndex));
                sectionTitle.append(node("span", "", section.title), node("small", "workspace-section-edit-hint", t("pages.songWorkspace.edit", "Edit")));
                const titleHeading = node("h3");
                titleHeading.appendChild(sectionTitle);
                heading.appendChild(titleHeading);
                const actions = node("div", "workspace-section-actions");
                actions.hidden = state.activeSectionActions !== sectionIndex;
                const rename = button(t("pages.songWorkspace.rename", "Rename"), "rename-section", "workspace-button workspace-button-subtle workspace-button-compact");
                const remove = button(t("pages.songWorkspace.delete", "Delete"), "delete-section", "workspace-button workspace-button-danger workspace-button-compact");
                rename.dataset.sectionIndex = String(sectionIndex);
                remove.dataset.sectionIndex = String(sectionIndex);
                actions.append(rename, remove);
                heading.appendChild(actions);
            } else {
                heading.appendChild(node("h3", "", section.title));
            }
            const instrumental = section.type === "instrumental";
            const lines = node("div", `workspace-lines${instrumental ? " is-instrumental-grid" : ""}`);
            section.lines.forEach(function(line, lineIndex) {
                if (editable && !instrumental) lines.appendChild(renderInsertControl(sectionIndex, lineIndex, section.type));
                lines.appendChild(renderLine(line, sectionIndex, lineIndex, editable));
            });
            if (editable) lines.appendChild(renderInsertControl(sectionIndex, section.lines.length, section.type));
            sectionElement.append(heading, lines);
            host.appendChild(sectionElement);
        });
        scheduleChordLayouts();
    }

    function renderInsertControl(sectionIndex, insertionIndex, sectionType) {
        const wrapper = node("div", "workspace-add-control");
        const trigger = button(`+ ${t("pages.songWorkspace.add", "Add")}`, "toggle-add-menu", "workspace-add-trigger");
        const menu = node("div", "workspace-add-menu");
        const menuId = `workspace-add-${sectionIndex}-${insertionIndex}`;
        trigger.dataset.sectionIndex = String(sectionIndex);
        trigger.dataset.insertionIndex = String(insertionIndex);
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", menuId);
        menu.id = menuId;
        menu.hidden = true;
        menu.setAttribute("role", "menu");
        [
            [sectionType === "instrumental"
                ? t("pages.songWorkspace.addBar", "Add Bar")
                : t("pages.songWorkspace.addLine", "Add Line"), sectionType === "instrumental" ? "add-bar" : "add-line"],
            [t("pages.songWorkspace.addSection", "Add Section"), "add-section"],
            [t("pages.songWorkspace.addInstrumentalSection", "Add Instrumental Section"), "add-instrumental-section"]
        ].forEach(function(entry) {
            const option = button(entry[0], entry[1], "workspace-menu-action");
            option.dataset.sectionIndex = String(sectionIndex);
            option.dataset.insertionIndex = String(insertionIndex);
            option.setAttribute("role", "menuitem");
            menu.appendChild(option);
        });
        wrapper.append(trigger, menu);
        return wrapper;
    }

    function compactLinePreview(line) {
        if (!line) return "";
        const text = String(line.text || "").trim();
        if (text) return text;
        return (line.chords || []).map(function(chord) { return chord.symbol; }).join(" · ")
            || t("pages.songWorkspace.emptyLine", "Empty line");
    }

    function buildLineInsertionTargets() {
        const targets = [];
        state.song.sections.forEach(function(section, sectionIndex) {
            if (section.type === "instrumental") return;
            if (!section.lines.length) {
                targets.push({ kind: "inside-empty", sectionIndex, insertionIndex: 0, sectionTitle: section.title });
                return;
            }
            for (let insertionIndex = 0; insertionIndex <= section.lines.length; insertionIndex += 1) {
                targets.push({
                    kind: insertionIndex === 0 ? "before-line" : insertionIndex === section.lines.length ? "after-line" : "between-lines",
                    sectionIndex,
                    insertionIndex,
                    sectionTitle: section.title,
                    beforeText: compactLinePreview(section.lines[insertionIndex - 1]),
                    afterText: compactLinePreview(section.lines[insertionIndex])
                });
            }
        });
        if (targets.length) return targets;
        if (!state.song.sections.length) {
            return [{ kind: "empty-song", sectionIndex: 0, insertionIndex: 0, createSection: true }];
        }
        const sectionIndex = state.song.sections.length - 1;
        return [{
            kind: "new-lyric-section",
            sectionIndex,
            insertionIndex: state.song.sections[sectionIndex].lines.length,
            createSection: true,
            sectionTitle: state.song.sections[sectionIndex].title
        }];
    }

    function buildSectionInsertionTargets(type) {
        const sections = state.song.sections;
        if (!sections.length) return [{ kind: "empty-song", sectionIndex: 0, insertionIndex: 0 }];
        const targets = [{
            kind: "song-start",
            sectionIndex: 0,
            insertionIndex: 0,
            afterText: compactLinePreview(sections[0].lines[0]),
            afterSectionTitle: sections[0].title
        }];
        sections.forEach(function(section, sectionIndex) {
            const allowInternal = type === "instrumental" || section.type !== "instrumental";
            if (allowInternal) {
                for (let insertionIndex = 1; insertionIndex < section.lines.length; insertionIndex += 1) {
                    targets.push({
                        kind: "between-lines",
                        sectionIndex,
                        insertionIndex,
                        sectionTitle: section.title,
                        beforeText: compactLinePreview(section.lines[insertionIndex - 1]),
                        afterText: compactLinePreview(section.lines[insertionIndex])
                    });
                }
            }
            const nextSection = sections[sectionIndex + 1];
            if (nextSection) {
                const canUseAfter = section.lines.length > 0;
                targets.push({
                    kind: "between-sections",
                    sectionIndex: canUseAfter ? sectionIndex : sectionIndex + 1,
                    insertionIndex: canUseAfter ? section.lines.length : 0,
                    beforeText: compactLinePreview(section.lines[section.lines.length - 1]),
                    afterText: compactLinePreview(nextSection.lines[0]),
                    beforeSectionTitle: section.title,
                    afterSectionTitle: nextSection.title
                });
            } else if (section.lines.length > 0) {
                targets.push({
                    kind: "song-end",
                    sectionIndex,
                    insertionIndex: section.lines.length,
                    beforeText: compactLinePreview(section.lines[section.lines.length - 1]),
                    beforeSectionTitle: section.title
                });
            }
        });
        return targets;
    }

    function globalAddTargetLabel(target) {
        const labels = {
            "song-start": t("pages.songWorkspace.songBeginning", "Beginning of song"),
            "song-end": t("pages.songWorkspace.songEnd", "End of song"),
            "empty-song": t("pages.songWorkspace.insideEmptySong", "Inside empty song"),
            "inside-empty": t("pages.songWorkspace.insideEmptySection", "Inside empty section"),
            "before-line": t("pages.songWorkspace.beforeLine", "Before this line"),
            "after-line": t("pages.songWorkspace.afterLine", "After this line"),
            "between-lines": t("pages.songWorkspace.betweenLines", "Between these lines"),
            "between-sections": t("pages.songWorkspace.betweenSections", "Between sections"),
            "new-lyric-section": t("pages.songWorkspace.newLyricSection", "New lyric section after the current song")
        };
        return labels[target.kind] || t("pages.songWorkspace.chooseWhereToInsert", "Choose where to insert");
    }

    function renderGlobalAddPositions() {
        elements.globalAddPositionList.replaceChildren();
        state.globalAddTargets.forEach(function(target, index) {
            const option = button("", "select-global-add-position", "workspace-global-add-position");
            option.dataset.targetIndex = String(index);
            option.appendChild(node("strong", "", globalAddTargetLabel(target)));
            const sectionContext = [target.beforeSectionTitle, target.sectionTitle, target.afterSectionTitle]
                .filter(Boolean).filter(function(value, valueIndex, values) { return values.indexOf(value) === valueIndex; })
                .join(" → ");
            if (sectionContext) option.appendChild(node("small", "", sectionContext));
            if (target.beforeText) option.appendChild(node("span", "workspace-global-add-preview", target.beforeText));
            if (target.beforeText && target.afterText) option.appendChild(node("span", "workspace-global-add-divider"));
            if (target.afterText) option.appendChild(node("span", "workspace-global-add-preview", target.afterText));
            elements.globalAddPositionList.appendChild(option);
        });
    }

    function showGlobalAddTypeStep() {
        state.globalAddType = null;
        state.globalAddTargets = [];
        elements.globalAddTypeStep.hidden = false;
        elements.globalAddPositionStep.hidden = true;
        elements.globalAddStepLabel.textContent = t("pages.songWorkspace.addStep", "Step {{step}} of 2", { step: 1 });
        window.requestAnimationFrame(function() {
            focusWithoutScroll(elements.globalAddTypeStep.querySelector("[data-global-add-type]"));
        });
    }

    function openGlobalAddDialog(trigger) {
        if (!state.song || state.readMode || !window.matchMedia("(max-width: 720px)").matches) return;
        state.globalAddTrigger = trigger;
        showGlobalAddTypeStep();
        lockDialogBackground(elements.globalAdd, trigger);
        elements.globalAdd.showModal();
    }

    function chooseGlobalAddType(type) {
        state.globalAddType = type;
        state.globalAddTargets = type === "line" ? buildLineInsertionTargets() : buildSectionInsertionTargets(type);
        renderGlobalAddPositions();
        elements.globalAddTypeStep.hidden = true;
        elements.globalAddPositionStep.hidden = false;
        elements.globalAddStepLabel.textContent = t("pages.songWorkspace.addStep", "Step {{step}} of 2", { step: 2 });
        window.requestAnimationFrame(function() {
            focusWithoutScroll(elements.globalAddPositionList.querySelector("button"));
        });
    }

    function transferDialogBackground(fromDialog, toDialog) {
        if (!state.dialogLock || state.dialogLock.dialog !== fromDialog) return false;
        state.dialogLock.dialog = toDialog;
        return true;
    }

    function handoffGlobalAdd(target) {
        const type = state.globalAddType;
        const trigger = state.globalAddTrigger;
        if (!type || !target || !trigger) return;
        const nextDialog = type === "line"
            ? elements.lineDialog
            : type === "section" ? elements.sectionDialog : elements.instrumentalDialog;
        transferDialogBackground(elements.globalAdd, nextDialog);
        elements.globalAdd.close("handoff");
        if (type === "line") openNewLineEditor(target, trigger);
        else if (type === "section") openSectionDialog(target.sectionIndex, target.insertionIndex, trigger);
        else openInstrumentalSectionDialog(target.sectionIndex, target.insertionIndex, trigger);
    }

    function closeAddMenu(options) {
        const settings = options || {};
        const trigger = state.addMenuTrigger;
        if (!trigger) return;
        const menu = trigger.closest(".workspace-add-control")?.querySelector(".workspace-add-menu");
        if (menu) {
            menu.hidden = true;
            menu.classList.remove("is-left", "is-below", "is-above");
            menu.style.removeProperty("top");
        }
        trigger.setAttribute("aria-expanded", "false");
        state.addMenuTrigger = null;
        if (settings.restoreFocus !== false && trigger.isConnected) trigger.focus();
    }

    function toggleAddMenu(trigger) {
        if (state.addMenuTrigger === trigger) {
            closeAddMenu();
            return;
        }
        closeAddMenu({ restoreFocus: false });
        const menu = trigger.closest(".workspace-add-control")?.querySelector(".workspace-add-menu");
        if (!menu) return;
        state.addMenuTrigger = trigger;
        trigger.setAttribute("aria-expanded", "true");
        menu.hidden = false;
        window.requestAnimationFrame(function() {
            positionAddMenu(trigger, menu);
            menu.querySelector('[role="menuitem"]')?.focus();
        });
    }

    function positionAddMenu(trigger, menu) {
        const wrapper = trigger.closest(".workspace-add-control");
        if (!wrapper || menu.hidden) return;
        const gap = 10;
        const edge = 12;
        menu.classList.remove("is-left", "is-below", "is-above");
        menu.style.removeProperty("top");

        const triggerRect = trigger.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const fitsRight = triggerRect.right + gap + menuRect.width <= window.innerWidth - edge;
        const fitsLeft = triggerRect.left - gap - menuRect.width >= edge;

        if (fitsRight || fitsLeft) {
            if (!fitsRight) menu.classList.add("is-left");
            const desiredTop = triggerRect.top + (triggerRect.height - menuRect.height) / 2;
            const clampedTop = Math.max(edge, Math.min(desiredTop, window.innerHeight - edge - menuRect.height));
            menu.style.top = `${clampedTop + (menuRect.height / 2) - wrapperRect.top}px`;
            return;
        }

        const fitsBelow = triggerRect.bottom + gap + menuRect.height <= window.innerHeight - edge;
        menu.classList.add(fitsBelow ? "is-below" : "is-above");
    }

    function sectionNamePlaceholder() {
        return t(
            "pages.songWorkspace.sectionNamePlaceholder",
            "e.g. Intro, Verse, Pre-Chorus, Chorus, Interlude, Bridge, Solo, Outro"
        );
    }

    function openSectionDialog(sectionIndex, insertionIndex, trigger) {
        closeAddMenu({ restoreFocus: false });
        state.sectionInsertContext = { sectionIndex, insertionIndex, trigger, globalFlow: trigger?.id === "globalAddButton" };
        elements.sectionName.value = "";
        elements.sectionName.placeholder = sectionNamePlaceholder();
        lockDialogBackground(elements.sectionDialog, trigger);
        elements.sectionDialog.showModal();
        window.requestAnimationFrame(function() { focusWithoutScroll(elements.sectionName); });
    }

    function addSectionAtBoundary() {
        const context = state.sectionInsertContext;
        if (!context || !state.song) return;
        const title = elements.sectionName.value.trim();
        if (!title) {
            elements.sectionName.reportValidity();
            return;
        }
        const result = Core.insertSectionAtBoundary(
            state.song,
            context.sectionIndex,
            context.insertionIndex,
            title
        );
        state.song = result.song;
        elements.sectionDialog.close("created");
        restoreDialogBackground(elements.sectionDialog, context.globalFlow ? context.trigger : null);
        scheduleSave();
        renderEditor();
    }

    function openInstrumentalSectionDialog(sectionIndex, insertionIndex, trigger) {
        closeAddMenu({ restoreFocus: false });
        state.instrumentalInsertContext = { sectionIndex, insertionIndex, trigger, globalFlow: trigger?.id === "globalAddButton" };
        elements.instrumentalName.value = "";
        elements.instrumentalBars.value = String(Core.LIMITS.INSTRUMENTAL_BARS.default);
        elements.instrumentalError.textContent = "";
        lockDialogBackground(elements.instrumentalDialog, trigger);
        elements.instrumentalDialog.showModal();
        window.requestAnimationFrame(function() { focusWithoutScroll(elements.instrumentalName); });
    }

    function addInstrumentalSectionAtBoundary() {
        const context = state.instrumentalInsertContext;
        if (!context || !state.song) return;
        const title = elements.instrumentalName.value.trim()
            || t("pages.songWorkspace.defaultInstrumentalSectionName", "Instrumental");
        try {
            const result = Core.insertInstrumentalSectionAtBoundary(
                state.song,
                context.sectionIndex,
                context.insertionIndex,
                title,
                Number(elements.instrumentalBars.value)
            );
            state.song = result.song;
            elements.instrumentalDialog.close("created");
            restoreDialogBackground(elements.instrumentalDialog, context.globalFlow ? context.trigger : null);
            scheduleSave();
            renderEditor();
        } catch (error) {
            const count = Number(elements.instrumentalBars.value);
            const limits = Core.LIMITS.INSTRUMENTAL_BARS;
            elements.instrumentalError.textContent = !Number.isInteger(count) || count < limits.min || count > limits.max
                ? t("pages.songWorkspace.invalidBarCount", "Enter a whole number from 1 to 64.")
                : t("pages.songWorkspace.instrumentalSectionError", "This instrumental section could not be added.");
        }
    }

    function renderLine(line, sectionIndex, lineIndex, editable) {
        const host = node(editable ? "button" : "div", `workspace-line${line.type === "instrumental" ? " is-instrumental" : ""}`);
        const barNumber = lineIndex + 1;
        const barChordSummary = line.type === "instrumental"
            ? line.chords.map(function(chord) { return chord.symbol; }).join(" ") || "—"
            : "";
        if (editable) {
            host.type = "button";
            host.dataset.action = "edit-line";
            host.dataset.sectionIndex = String(sectionIndex);
            host.dataset.lineIndex = String(lineIndex);
            host.setAttribute("aria-label", line.type === "instrumental"
                ? `${t("pages.songWorkspace.editBarNumber", "Edit bar {{bar}}", { bar: barNumber })}, ${barChordSummary}`
                : t("pages.songWorkspace.editLine", "Edit line"));
        }
        if (line.type === "instrumental") {
            host.dataset.barNumber = String(barNumber);
            if (!editable) {
                host.setAttribute("role", "group");
                host.setAttribute("aria-label", `${t("pages.songWorkspace.barNumber", "Bar {{bar}}", { bar: barNumber })}, ${barChordSummary}`);
            }
            const row = node("div", "workspace-instrumental-line");
            const chords = node("div", "workspace-instrumental-chords");
            line.chords.forEach(chord => chords.appendChild(node("span", "workspace-instrumental-chord", chord.symbol)));
            if (!line.chords.length) {
                const empty = node("span", "workspace-empty-bar", "—");
                empty.setAttribute("aria-hidden", "true");
                chords.appendChild(empty);
            }
            if (editable) {
                chords.setAttribute("aria-hidden", "true");
            } else {
                row.appendChild(node(
                    "span",
                    "workspace-bar-label",
                    t("pages.songWorkspace.barNumber", "Bar {{bar}}", { bar: barNumber })
                ));
            }
            row.appendChild(chords);
            host.appendChild(row);
            return host;
        }
        if (!line.text) {
            host.appendChild(node("div", "workspace-empty-line", t("pages.songWorkspace.emptyLine", "Empty line")));
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
        const chordLayer = node("span", "workspace-chord-layer");
        const lyricFlow = node("span", "workspace-lyric-flow");
        layout.tokens.forEach(function(token, tokenIndex) {
            const tokenId = `token-${tokenIndex}`;
            const lyricToken = node(
                "span",
                `workspace-lyric-token${Boolean(state.preferences.chordHints) && token.chords.length && token.meaningful ? " is-chord-hint" : ""}`,
                token.text
            );
            lyricToken.dataset.tokenId = tokenId;
            lyricFlow.appendChild(lyricToken);
            token.chords.forEach(function(chord) {
                const annotation = node("span", "workspace-chord-annotation workspace-chord-chip", chord.symbol);
                annotation.dataset.anchorToken = tokenId;
                chordLayer.appendChild(annotation);
            });
        });
        track.append(chordLayer, lyricFlow);
        content.appendChild(track);
        host.appendChild(content);
        return host;
    }

    function layoutChordTracks(host) {
        if (!host) return;
        const compactReadMode = state.readMode && host === elements.chart;
        host.querySelectorAll(".workspace-token-track").forEach(function(track) {
            const lyricFlow = track.querySelector(".workspace-lyric-flow");
            const annotations = Array.from(track.querySelectorAll(".workspace-chord-annotation"));
            if (!lyricFlow || !annotations.length) {
                track.style.setProperty("--workspace-chord-row-height", "1.45rem");
                return;
            }
            track.style.width = "100%";
            track.style.setProperty("--workspace-chord-row-height", "1.45rem");
            annotations.forEach(function(annotation) {
                annotation.style.removeProperty("left");
                annotation.style.removeProperty("--workspace-chord-scale");
            });
            const trackRect = track.getBoundingClientRect();
            const measured = annotations.map(function(annotation, index) {
                const token = lyricFlow.querySelector(`[data-token-id="${annotation.dataset.anchorToken}"]`);
                const tokenRect = token?.getBoundingClientRect();
                return {
                    index,
                    left: tokenRect ? tokenRect.left - trackRect.left : 0,
                    width: annotation.getBoundingClientRect().width
                };
            });
            const placements = Core.fitSingleRowChordAnnotations(measured, 8, 0.6);
            const rowHeight = Math.max(compactReadMode ? 16 : 20, ...annotations.map(annotation => annotation.getBoundingClientRect().height + 1));
            const requiredWidth = Math.max(
                track.parentElement?.clientWidth || 0,
                lyricFlow.scrollWidth,
                ...placements.map(item => item.left + (item.width * item.scale))
            );
            track.style.width = `${Math.ceil(requiredWidth)}px`;
            track.style.setProperty("--workspace-chord-row-height", `${rowHeight}px`);
            placements.forEach(function(item) {
                annotations[item.index].style.left = `${item.left}px`;
                annotations[item.index].style.setProperty("--workspace-chord-scale", String(item.scale));
            });
        });
    }

    function scheduleChordLayouts() {
        window.cancelAnimationFrame(state.chordLayoutFrame);
        state.chordLayoutFrame = window.requestAnimationFrame(function() {
            layoutChordTracks(elements.chart);
            layoutChordTracks(elements.performanceChart);
        });
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
            card.dataset.chordSymbol = Shapes.normalizeChord(symbol) || symbol;
            card.appendChild(node("h3", "", symbol));
            card.appendChild(Shapes.createDiagramElement(parsed, voicing, document));
            const change = button(t("pages.songWorkspace.chooseOtherShape", "Choose Another Shape"), "choose-shape", "workspace-button workspace-button-secondary workspace-button-compact workspace-shape-change");
            change.dataset.chordSymbol = symbol;
            change.setAttribute("aria-label", t("pages.songWorkspace.chooseShapeFor", "Choose a guitar shape for {{chord}}", { chord: symbol }));
            card.appendChild(change);
            elements.shapeCards.appendChild(card);
        });
        if (!elements.shapeCards.children.length) {
            elements.shapeCards.appendChild(node("p", "", t("pages.songWorkspace.noChords", "No chords in this view.")));
        }
    }

    function updateShapeCard(symbol) {
        const key = Shapes.normalizeChord(symbol) || symbol;
        const card = Array.from(elements.shapeCards.querySelectorAll(".workspace-shape-card")).find(function(candidate) {
            return candidate.dataset.chordSymbol === key;
        });
        const parsed = Shapes.parseChord(symbol);
        const currentDiagram = card?.querySelector(".chord-diagram");
        if (!card || !parsed || !currentDiagram) return false;
        const options = Shapes.generateVoicings(parsed);
        const voicing = selectedVoicing(symbol, options);
        if (!voicing) return false;
        currentDiagram.replaceWith(Shapes.createDiagramElement(parsed, voicing, document));
        return true;
    }

    function updateShapeFilterPressedState(container, selector, selectedValue) {
        container.querySelectorAll(selector).forEach(function(control) {
            const value = control.dataset.shapePosition || control.dataset.shapeRootString;
            const isSelected = value === selectedValue;
            control.classList.toggle("is-selected", isSelected);
            control.setAttribute("aria-pressed", String(isSelected));
        });
    }

    function resetShapePickerFilters() {
        state.shapePickerPosition = "all";
        state.shapePickerRootString = "all";
        updateShapeFilterPressedState(elements.shapePickerPosition, "button[data-shape-position]", "all");
        updateShapeFilterPressedState(elements.shapePickerRoot, "button[data-shape-root-string]", "all");
    }

    function filteredShapePickerOptions(parsed) {
        return state.shapePickerOptions
            .map(function(voicing, index) { return { voicing, index }; })
            .filter(function(item) {
                const matchesPosition = state.shapePickerPosition === "all"
                    || Shapes.nearestPositionTarget(item.voicing.frets) === Number(state.shapePickerPosition);
                const matchesRootString = Shapes.voicingHasRootOnString(
                    item.voicing.frets,
                    state.shapePickerRootString,
                    parsed
                );
                return matchesPosition && matchesRootString;
            });
    }

    function renderShapePicker() {
        const symbol = state.shapePickerSymbol;
        const selected = symbol ? selectedVoicing(symbol, state.shapePickerOptions) : null;
        elements.shapePickerSymbol.textContent = symbol || "";
        elements.shapePickerGrid.replaceChildren();
        const parsed = Shapes.parseChord(symbol);
        if (!parsed) return;
        const filtered = filteredShapePickerOptions(parsed);
        const total = state.shapePickerOptions.length;
        const hasFilter = state.shapePickerPosition !== "all" || state.shapePickerRootString !== "all";
        elements.shapePickerCount.textContent = hasFilter
            ? t("pages.songWorkspace.shapeCountFiltered", "{{count}} of {{total}} shapes shown", { count: filtered.length, total })
            : t("pages.songWorkspace.shapeCount", "{{count}} shapes found", { count: total });

        if (!filtered.length) {
            const empty = node("div", "dictionary-empty progression-writer-shape-picker-empty");
            empty.append(
                node("strong", "", t("pages.songWorkspace.noShapes", "No shapes found.")),
                node("span", "", t("pages.songWorkspace.noShapesHelp", "Choose another fret area, root string, or select All."))
            );
            elements.shapePickerGrid.appendChild(empty);
            return;
        }

        filtered.forEach(function(item) {
            const template = document.createElement("template");
            template.innerHTML = Shapes.renderProgressionDiagram(parsed, item.voicing, item.index, total, {
                action: "select",
                variant: "picker",
                shapeIndex: item.index,
                labels: {
                    shape: t("pages.songWorkspace.shape", "Shape"),
                    useShape: t("pages.songWorkspace.useShape", "Use Shape"),
                    openPosition: t("pages.songWorkspace.openLowPosition", "Open / low position"),
                    startsAtFret: t("pages.songWorkspace.startsAtFret", "Starts at fret {{fret}}")
                }
            });
            const card = template.content.firstElementChild;
            const isSelected = Shapes.voicingKey(item.voicing) === Shapes.voicingKey(selected);
            card.classList.add("workspace-shape-option");
            card.classList.toggle("is-selected", isSelected);
            card.setAttribute("aria-current", String(isSelected));
            elements.shapePickerGrid.appendChild(card);
        });
    }

    function lockDialogBackground(dialog, trigger) {
        if (state.dialogLock) return;
        const body = document.body;
        const root = document.documentElement;
        const x = window.scrollX;
        const y = window.scrollY;
        const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
        state.dialogLock = {
            dialog,
            trigger: trigger || document.activeElement,
            x,
            y,
            bodyStyles: {
                position: body.style.position,
                top: body.style.top,
                left: body.style.left,
                right: body.style.right,
                overflow: body.style.overflow,
                paddingRight: body.style.paddingRight
            },
            compensation: root.style.getPropertyValue("--workspace-scrollbar-compensation")
        };
        const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        root.style.setProperty("--workspace-scrollbar-compensation", `${scrollbarWidth}px`);
        root.classList.add("workspace-dialog-open");
        body.classList.add("workspace-dialog-open");
        body.style.position = "fixed";
        body.style.top = `${-y}px`;
        body.style.left = `${-x}px`;
        body.style.right = "0";
        body.style.overflow = "hidden";
        body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    function focusWithoutScroll(target) {
        if (!target?.isConnected) return;
        try {
            target.focus({ preventScroll: true });
        } catch (error) {
            target.focus();
        }
    }

    function restoreDialogBackground(dialog, focusTarget) {
        const locked = state.dialogLock;
        if (!locked || locked.dialog !== dialog) return;
        const body = document.body;
        const root = document.documentElement;
        if (focusTarget !== null) focusWithoutScroll(focusTarget || locked.trigger);
        root.classList.add("workspace-dialog-restoring");
        Object.keys(locked.bodyStyles).forEach(function(property) {
            body.style[property] = locked.bodyStyles[property];
        });
        root.classList.remove("workspace-dialog-open");
        body.classList.remove("workspace-dialog-open");
        if (locked.compensation) root.style.setProperty("--workspace-scrollbar-compensation", locked.compensation);
        else root.style.removeProperty("--workspace-scrollbar-compensation");
        state.dialogLock = null;
        window.scrollTo(locked.x, locked.y);
        root.classList.remove("workspace-dialog-restoring");
    }

    function shapePickerFocusTarget() {
        const original = state.shapePickerTrigger;
        const symbol = original?.dataset.chordSymbol || state.shapePickerSymbol;
        state.shapePickerTrigger = null;
        return original?.isConnected
            ? original
            : Array.from(elements.shapeCards.querySelectorAll('[data-action="choose-shape"]')).find(function(control) {
                return control.dataset.chordSymbol === symbol;
            });
    }

    function finalizeShapePickerClose() {
        restoreDialogBackground(elements.shapePicker, shapePickerFocusTarget());
        state.shapePickerSymbol = null;
        state.shapePickerOptions = [];
        state.shapePickerPosition = "all";
        state.shapePickerRootString = "all";
        state.shapePickerClosing = false;
    }

    function closeShapePicker() {
        if (!elements.shapePicker.open || state.shapePickerClosing) return;
        state.shapePickerClosing = true;
        elements.shapePicker.close();
    }

    function openShapePicker(symbol, trigger) {
        const parsed = Shapes.parseChord(symbol);
        if (!parsed) return;
        state.shapePickerSymbol = symbol;
        state.shapePickerOptions = Shapes.generateVoicings(parsed);
        state.shapePickerTrigger = trigger || document.activeElement;
        state.shapePickerClosing = false;
        resetShapePickerFilters();
        renderShapePicker();
        lockDialogBackground(elements.shapePicker, state.shapePickerTrigger);
        elements.shapePicker.showModal();
        window.requestAnimationFrame(function() {
            try {
                $("closeShapePickerButton").focus({ preventScroll: true });
            } catch (error) {
                $("closeShapePickerButton").focus();
            }
        });
    }

    function selectShape(index) {
        const symbol = state.shapePickerSymbol;
        const voicing = state.shapePickerOptions[index];
        if (!symbol || !voicing) return;
        selectedShapeMap()[Shapes.normalizeChord(symbol) || symbol] = Shapes.voicingKey(voicing);
        Storage.writePreferences(state.preferences);
        updateShapeCard(symbol);
        closeShapePicker();
    }

    function updateSongFromFields() {
        if (!state.song) return;
        state.song.originalKey = Core.normalizeKey(elements.originalKey.value);
        state.song.targetKey = Core.normalizeKey(elements.targetKey.value, state.song.originalKey);
        state.song.chordSpelling = Core.normalizeChordSpelling(elements.chordSpelling.value);
        state.song.capo = Math.max(0, Math.min(11, Number(elements.capo.value) || 0));
        state.song.updatedAt = new Date().toISOString();
        scheduleSave();
        renderEditor();
    }

    function scheduleSave() {
        window.clearTimeout(state.saveTimer);
        setSaveState("saving");
        state.saveTimer = window.setTimeout(saveCurrentSong, 500);
    }

    function setSaveState(nextState) {
        state.saveState = nextState;
        elements.autosave.dataset.state = nextState;
        const labels = {
            neutral: t("pages.songWorkspace.savedLocally", "Saved locally"),
            saving: t("pages.songWorkspace.saving", "Saving…"),
            saved: `✓ ${t("pages.songWorkspace.savedOnDevice", "Saved in this browser")}`,
            unavailable: t("pages.songWorkspace.storageUnavailableShort", "Local saving unavailable")
        };
        elements.autosave.textContent = labels[nextState] || labels.neutral;
    }

    async function saveCurrentSong() {
        if (!state.song) return;
        state.song.updatedAt = new Date().toISOString();
        if (!state.storageAvailable) {
            setSaveState("unavailable");
            return;
        }
        try {
            await Storage.put(Core.validateSong(state.song));
            const index = state.songs.findIndex(song => song.id === state.song.id);
            if (index >= 0) state.songs[index] = Core.createSong(state.song);
            else state.songs.unshift(Core.createSong(state.song));
            setSaveState("saved");
        } catch (error) {
            state.storageAvailable = false;
            setSaveState("unavailable");
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

    function creationDisclosure(mode) {
        if (mode === "chordpro") {
            return t(
                "pages.songWorkspace.chordProLocalDisclosure",
                "ChordPro content is parsed in this browser and is not uploaded to Jam Tracks Hub."
            );
        }
        if (mode === "chords") {
            return t("pages.songWorkspace.songDataLocalDisclosure", "This song data is stored in this browser.");
        }
        return t(
            "pages.songWorkspace.pastedContentLocalDisclosure",
            "The song content you paste is processed and stored locally in this browser."
        );
    }

    function openCreateDialog(mode) {
        const copy = creationCopy(mode);
        elements.createForm.dataset.mode = mode;
        elements.createMode.textContent = copy[0];
        elements.createSourceLabel.textContent = copy[1];
        elements.createLocalDisclosure.textContent = creationDisclosure(mode);
        elements.confirmCreate.textContent = mode === "chordpro"
            ? t("pages.songWorkspace.importChordPro", "Import ChordPro")
            : t("pages.songWorkspace.create", "Create");
        elements.createTitle.value = "";
        elements.createArtist.value = "";
        elements.createKey.value = "C";
        elements.createSource.value = "";
        elements.createError.textContent = "";
        lockDialogBackground(elements.createDialog, document.activeElement);
        elements.createDialog.showModal();
        focusWithoutScroll(elements.createTitle);
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
        elements.createDialog.close("created");
        restoreDialogBackground(elements.createDialog, null);
        showEditor(song);
    }

    function findCanonicalLine(sectionIndex, lineIndex) {
        return state.song?.sections?.[sectionIndex]?.lines?.[lineIndex] || null;
    }

    function openLineDraft(line, context, trigger) {
        const instrumental = line.type === "instrumental";
        state.lineContext = context;
        state.lineDraft = Core.createLine(line.text, line.chords, line.type, line.id);
        state.selectedAnchorPosition = 0;
        state.editingAnchorId = null;
        elements.lineText.value = state.lineDraft.text;
        elements.anchorChord.value = "";
        elements.addAnchor.textContent = t("pages.songWorkspace.addChord", "Add Chord");
        elements.lineForm.classList.toggle("is-instrumental", instrumental);
        elements.lineDialog.classList.toggle("is-edit-line-mode", !instrumental && !context.isNew);
        elements.lineTitle.textContent = context.isNew
            ? t("pages.songWorkspace.addLine", "Add Line")
            : instrumental
            ? t("pages.songWorkspace.editBar", "Edit Bar")
            : t("pages.songWorkspace.editLine", "Edit Line");
        elements.lineTextField.hidden = instrumental;
        elements.anchorPreview.hidden = instrumental;
        elements.anchorPositionField.hidden = instrumental;
        elements.deleteLine.textContent = instrumental
            ? t("pages.songWorkspace.deleteBar", "Delete Bar")
            : t("pages.songWorkspace.deleteLine", "Delete Line");
        elements.deleteLine.hidden = Boolean(context.isNew);
        elements.saveLine.textContent = context.isNew
            ? t("pages.songWorkspace.addLine", "Add Line")
            : instrumental
            ? t("pages.songWorkspace.saveBar", "Save Bar")
            : t("pages.songWorkspace.saveLine", "Save Line");
        elements.lineError.textContent = "";
        renderAnchorEditor();
        lockDialogBackground(elements.lineDialog, trigger || document.activeElement);
        elements.lineDialog.showModal();
        window.requestAnimationFrame(function() {
            focusWithoutScroll(instrumental ? elements.anchorChord : elements.lineText);
        });
    }

    function openLineEditor(sectionIndex, lineIndex) {
        const line = findCanonicalLine(sectionIndex, lineIndex);
        if (!line) return;
        openLineDraft(line, { sectionIndex, lineIndex, isNew: false }, document.activeElement);
    }

    function openNewLineEditor(target, trigger) {
        openLineDraft(
            Core.createLine("", [], "lyric"),
            {
                sectionIndex: target.sectionIndex,
                insertionIndex: target.insertionIndex,
                createSection: Boolean(target.createSection),
                isNew: true,
                globalFlow: true,
                trigger
            },
            trigger
        );
    }

    function renderAnchorEditor() {
        const instrumental = state.lineDraft.type === "instrumental";
        const positions = Core.tokenizeLyric(elements.lineText.value).filter(function(token) { return token.meaningful; });
        elements.lineTextCount.textContent = `${elements.lineText.value.length} / ${elements.lineText.maxLength}`;
        elements.anchorPreview.replaceChildren();
        const instrumentalCount = Math.max(
            1,
            ...state.lineDraft.chords.map(function(chord) { return chord.anchorPosition + 2; })
        );
        const availablePositions = positions.length
            ? positions.map(function(token) { return token.text; })
            : Array.from({ length: instrumentalCount }, function(_, index) {
                return t("pages.songWorkspace.instrumentalPosition", "Position {{position}}", { position: index + 1 });
            });
        state.selectedAnchorPosition = Math.min(state.selectedAnchorPosition, availablePositions.length - 1);
        if (!instrumental) {
            availablePositions.forEach(function(label, index) {
                const item = button(label, "choose-anchor");
                item.dataset.anchorPosition = String(index);
                item.classList.toggle("is-selected", state.selectedAnchorPosition === index);
                item.setAttribute("aria-label", `${index + 1}: ${label}`);
                elements.anchorPreview.appendChild(item);
            });
        }
        elements.anchorPosition.max = String(availablePositions.length);
        elements.anchorPosition.value = String(state.selectedAnchorPosition + 1);
        elements.anchorList.replaceChildren();
        elements.anchorCount.textContent = t(
            "pages.songWorkspace.chordCount",
            "{{count}} chords",
            { count: state.lineDraft.chords.length }
        );
        state.lineDraft.chords.slice().sort((a, b) => a.anchorPosition - b.anchorPosition).forEach(function(chord) {
            const row = node("div", "workspace-anchor-item");
            const positionLabel = availablePositions[chord.anchorPosition] || String(chord.anchorPosition + 1);
            row.appendChild(node("strong", "", instrumental
                ? chord.symbol
                : `${chord.symbol} · ${chord.anchorPosition + 1}: ${positionLabel}`));
            const editLabel = t("pages.songWorkspace.edit", "Edit");
            const deleteLabel = t("pages.songWorkspace.delete", "Delete");
            const edit = button("", "edit-anchor", "workspace-button workspace-button-subtle workspace-button-compact");
            const remove = button("", "delete-anchor", "workspace-button workspace-button-danger workspace-button-compact");
            edit.setAttribute("aria-label", editLabel);
            remove.setAttribute("aria-label", deleteLabel);
            const editText = node("span", "workspace-anchor-action-text", editLabel);
            const removeText = node("span", "workspace-anchor-action-text", deleteLabel);
            const editIcon = node("span", "workspace-anchor-action-icon", "✎");
            const removeIcon = deleteActionIcon();
            editIcon.setAttribute("aria-hidden", "true");
            edit.append(editIcon, editText);
            remove.append(removeIcon, removeText);
            edit.dataset.anchorId = chord.id;
            remove.dataset.anchorId = chord.id;
            row.append(edit, remove);
            elements.anchorList.appendChild(row);
        });
    }

    function addAnchor() {
        const parsed = Core.parseChordSymbol(elements.anchorChord.value);
        if (!parsed) {
            elements.lineError.textContent = t("pages.songWorkspace.invalidChord", "Enter a supported chord symbol.");
            return;
        }
        const editing = state.lineDraft.chords.find(chord => chord.id === state.editingAnchorId);
        const instrumental = state.lineDraft.type === "instrumental";
        const positionCount = Core.meaningfulPositionCount(elements.lineText.value);
        const requestedPosition = Math.max(0, (Number(elements.anchorPosition.value) || 1) - 1);
        const anchorPosition = instrumental
            ? (editing ? editing.anchorPosition : state.lineDraft.chords.reduce(function(maximum, chord) {
                return Math.max(maximum, chord.anchorPosition + 1);
            }, 0))
            : (positionCount ? Math.min(positionCount - 1, requestedPosition) : requestedPosition);
        if (editing) {
            editing.symbol = parsed.raw;
            editing.anchorPosition = anchorPosition;
        } else {
            state.lineDraft.chords.push(Core.createChord(parsed.raw, anchorPosition));
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
        const instrumental = state.lineDraft.type === "instrumental";
        const text = instrumental ? "" : elements.lineText.value.slice(0, Core.LIMITS.MAX_LINE_LENGTH);
        const type = instrumental ? "instrumental" : (text ? "lyric" : "instrumental");
        const savedLine = Core.createLine(text, state.lineDraft.chords, type, state.lineDraft.id);
        if (context.isNew && context.createSection) {
            const sectionResult = Core.insertSectionAtBoundary(
                state.song,
                context.sectionIndex,
                context.insertionIndex,
                t("pages.songWorkspace.defaultSectionName", "Song")
            );
            sectionResult.song.sections[sectionResult.sectionIndex].lines = [savedLine];
            state.song = sectionResult.song;
        } else if (context.isNew) {
            state.song = Core.insertLine(state.song, context.sectionIndex, context.insertionIndex, savedLine).song;
        } else {
            state.song.sections[context.sectionIndex].lines[context.lineIndex] = savedLine;
        }
        elements.lineDialog.close("saved");
        restoreDialogBackground(elements.lineDialog, context.globalFlow ? context.trigger : null);
        state.lineContext = null;
        state.lineDraft = null;
        scheduleSave();
        renderEditor();
    }

    function deleteLineDraft() {
        const context = state.lineContext;
        if (!context || context.isNew) return;
        state.song = Core.deleteLine(state.song, context.sectionIndex, context.lineIndex).song;
        elements.lineDialog.close("deleted");
        restoreDialogBackground(elements.lineDialog, null);
        state.lineContext = null;
        state.lineDraft = null;
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
        try {
            return await file.text();
        } catch (error) {
            throw new Error(t("pages.songWorkspace.importError", "We could not recognize this chart."));
        }
    }

    async function importSong(file) {
        if (!state.storageAvailable) {
            throw new Error(t("pages.songWorkspace.storageUnavailable", "Local saving is unavailable. Download a backup to keep your work."));
        }
        const source = await readJsonFile(file);
        try {
            const result = await SongImport.importSingleSong(source, {
                core: Core,
                storage: Storage,
                existingSongs: state.songs
            });
            state.songs = result.songs;
            renderLibrary();
            showEditor(result.song);
        } catch (error) {
            throw new Error(t("pages.songWorkspace.importError", "We could not recognize this chart."));
        }
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
        const source = await readJsonFile(file);
        let value;
        try {
            value = JSON.parse(source);
        } catch (error) {
            throw new Error(t("pages.songWorkspace.importError", "We could not recognize this chart."));
        }
        if (!value || value.schema !== "jamtrackshub-song-backup" || Number(value.version) !== 1 || !Array.isArray(value.songs) || value.songs.length > MAX_BACKUP_SONGS) {
            throw new Error(t("pages.songWorkspace.invalidBackup", "This is not a supported Jam Tracks Hub backup."));
        }
        const restored = value.songs.map(Core.validateSong).map(function(song) {
            song.id = Core.createSong({}).id;
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

    function performanceSpeedMultiplier() {
        if (state.preferences.scrollSpeedMultiplier !== undefined) {
            return Core.normalizeScrollSpeedMultiplier(state.preferences.scrollSpeedMultiplier);
        }
        const legacySpeed = Number(state.preferences.scrollSpeed);
        const migrated = Number.isFinite(legacySpeed) && legacySpeed > 0
            ? Core.normalizeScrollSpeedMultiplier(legacySpeed / 4)
            : 1;
        state.preferences.scrollSpeedMultiplier = migrated;
        delete state.preferences.scrollSpeed;
        Storage.writePreferences(state.preferences);
        return migrated;
    }

    function updateScrollSpeedControl(value) {
        const multiplier = Core.normalizeScrollSpeedMultiplier(value);
        elements.scrollSpeed.value = String(multiplier);
        elements.scrollSpeedValue.value = `${multiplier.toFixed(2).replace(/0$/, "")}×`;
        return multiplier;
    }

    function openPerformance() {
        state.resumeReadAfterPerformance = state.readMode;
        if (state.readMode) setReadMode(false, { restoreFocus: false });
        elements.editor.classList.add("is-performance-open");
        const current = currentShapeSong();
        elements.performanceTitle.textContent = state.song.title;
        elements.performanceMeta.textContent = `${state.song.targetKey} · Capo ${state.song.capo} · ${current.shapeKey} ${t("pages.songWorkspace.shapes", "shapes")}${state.song.bpm ? ` · ${state.song.bpm} BPM` : ""}`;
        renderChart(elements.performanceChart, current.song, false);
        applyChartZoom();
        applyLineSpacing();
        updateScrollSpeedControl(performanceSpeedMultiplier());
        elements.performance.showModal();
        elements.performance.scrollTop = 0;
        state.scrollPosition = 0;
        scheduleChordLayouts();
    }

    function autoScrollFrame(timestamp) {
        if (!state.scrolling || !elements.performance.open) return;
        if (!state.lastScrollTime) state.lastScrollTime = timestamp;
        const elapsed = Math.min(50, timestamp - state.lastScrollTime);
        const multiplier = Core.normalizeScrollSpeedMultiplier(elements.scrollSpeed.value);
        const distance = Core.scrollDistanceForElapsed(state.song?.bpm, multiplier, elapsed);
        const maximum = Math.max(0, elements.performance.scrollHeight - elements.performance.clientHeight);
        if (Math.abs(elements.performance.scrollTop - state.scrollPosition) > 2) {
            state.scrollPosition = elements.performance.scrollTop;
        }
        const next = Math.min(maximum, state.scrollPosition + distance);
        state.scrollPosition = next;
        elements.performance.scrollTop = next;
        state.lastScrollTime = timestamp;
        if (next >= maximum) {
            stopAutoScroll();
            return;
        }
        state.scrollFrame = requestAnimationFrame(autoScrollFrame);
    }

    function toggleAutoScroll() {
        state.scrolling = !state.scrolling;
        elements.scrollToggle.textContent = state.scrolling ? t("pages.songWorkspace.pauseScroll", "Pause") : t("pages.songWorkspace.startScroll", "Start");
        cancelAnimationFrame(state.scrollFrame);
        state.lastScrollTime = 0;
        if (state.scrolling) state.scrollPosition = elements.performance.scrollTop;
        if (state.scrolling) state.scrollFrame = requestAnimationFrame(autoScrollFrame);
    }

    function stopAutoScroll() {
        state.scrolling = false;
        cancelAnimationFrame(state.scrollFrame);
        state.lastScrollTime = 0;
        if (elements.scrollToggle) elements.scrollToggle.textContent = t("pages.songWorkspace.startScroll", "Start");
    }

    function attachEvents() {
        elements.settingsSummary.addEventListener("click", function(event) {
            if (!window.matchMedia("(max-width: 720px)").matches) return;
            event.preventDefault();
            setSettingsDisclosureExpanded(!state.settingsDisclosureExpanded, { animate: true });
        });
        document.querySelectorAll("[data-create-mode]").forEach(control => control.addEventListener("click", () => openCreateDialog(control.dataset.createMode)));
        document.querySelectorAll("[data-dialog-close]").forEach(function(control) {
            control.addEventListener("click", function() {
                control.closest("dialog")?.close("cancel");
            });
        });
        document.querySelectorAll("[data-setting-help-item]").forEach(function(item) {
            item.addEventListener("pointerenter", function() {
                if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) openSettingHelp(item);
            });
            item.addEventListener("pointerleave", function() {
                if (!item.contains(document.activeElement)) closeSettingHelp();
            });
            item.addEventListener("focusin", function() { openSettingHelp(item); });
            item.addEventListener("focusout", function() {
                window.requestAnimationFrame(function() {
                    if (!item.contains(document.activeElement)) closeSettingHelp();
                });
            });
            item.querySelector("[data-setting-help]")?.addEventListener("click", function(event) {
                event.preventDefault();
                if (state.activeSettingHelp === item && window.matchMedia("(hover: none), (pointer: coarse)").matches) closeSettingHelp();
                else openSettingHelp(item);
            });
        });
        [elements.originalKey, elements.targetKey, elements.capo, elements.chordSpelling].forEach(control => control.addEventListener("change", updateSongFromFields));
        $("songTitleEditButton").addEventListener("click", beginTitleEdit);
        $("cancelTitleEditButton").addEventListener("click", cancelTitleEdit);
        elements.titleEditForm.addEventListener("submit", function(event) { event.preventDefault(); saveTitleEdit(); });
        $("songMetadataEditButton").addEventListener("click", beginMetadataEdit);
        $("cancelMetadataEditButton").addEventListener("click", cancelMetadataEdit);
        elements.metadataEditForm.addEventListener("submit", function(event) { event.preventDefault(); saveMetadataEdit(); });
        document.querySelectorAll("[data-view-mode]").forEach(control => control.addEventListener("click", function() {
            state.viewMode = control.dataset.viewMode;
            state.preferences.viewMode = state.viewMode;
            Storage.writePreferences(state.preferences);
            renderEditor();
        }));
        elements.chartZoomDecrease.addEventListener("click", () => adjustChartZoom(-Storage.CHART_ZOOM.step));
        elements.chartZoomIncrease.addEventListener("click", () => adjustChartZoom(Storage.CHART_ZOOM.step));
        elements.chartZoomInput.addEventListener("change", commitChartZoomInput);
        elements.chartZoomInput.addEventListener("blur", commitChartZoomInput);
        elements.chartZoomInput.addEventListener("keydown", function(event) {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitChartZoomInput();
            elements.chartZoomInput.blur();
        });
        elements.lineSpacingDecrease.addEventListener("click", () => adjustLineSpacing(-Storage.LINE_SPACING.step));
        elements.lineSpacingIncrease.addEventListener("click", () => adjustLineSpacing(Storage.LINE_SPACING.step));
        elements.lineSpacingInput.addEventListener("change", commitLineSpacingInput);
        elements.lineSpacingInput.addEventListener("blur", commitLineSpacingInput);
        elements.lineSpacingInput.addEventListener("keydown", function(event) {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitLineSpacingInput();
            elements.lineSpacingInput.blur();
        });
        elements.readZoomDecrease.addEventListener("click", () => adjustChartZoom(-Storage.CHART_ZOOM.step));
        elements.readZoomIncrease.addEventListener("click", () => adjustChartZoom(Storage.CHART_ZOOM.step));
        elements.readSpacingDecrease.addEventListener("click", () => adjustLineSpacing(-Storage.LINE_SPACING.step));
        elements.readSpacingIncrease.addEventListener("click", () => adjustLineSpacing(Storage.LINE_SPACING.step));
        elements.chordHints.addEventListener("click", function() {
            state.preferences.chordHints = !Boolean(state.preferences.chordHints);
            Storage.writePreferences(state.preferences);
            renderEditor();
        });
        $("backToSongsButton").addEventListener("click", showHome);
        $("globalAddButton").addEventListener("click", function(event) { openGlobalAddDialog(event.currentTarget); });
        elements.globalAdd.addEventListener("click", function(event) {
            const typeControl = event.target.closest("[data-global-add-type]");
            if (typeControl) {
                chooseGlobalAddType(typeControl.dataset.globalAddType);
                return;
            }
            const positionControl = event.target.closest('[data-action="select-global-add-position"]');
            if (positionControl) handoffGlobalAdd(state.globalAddTargets[Number(positionControl.dataset.targetIndex)]);
        });
        elements.globalAddBack.addEventListener("click", showGlobalAddTypeStep);
        elements.globalAdd.addEventListener("close", function() {
            state.globalAddType = null;
            state.globalAddTargets = [];
            state.globalAddTrigger = null;
        });
        $("smartCapoButton").addEventListener("click", renderCapoOptions);
        $("readModeButton").addEventListener("click", function(event) { setReadMode(true, { trigger: event.currentTarget }); });
        $("exitReadModeButton").addEventListener("click", function() { setReadMode(false); });
        elements.readShapes.addEventListener("click", function() { setReadShapes(!state.readShapesOpen); });
        $("closeReadShapesButton").addEventListener("click", function() { setReadShapes(false); });
        elements.readShapesBackdrop.addEventListener("click", function() { setReadShapes(false); });
        $("performanceButton").addEventListener("click", openPerformance);
        $("closePerformanceButton").addEventListener("click", function() { stopAutoScroll(); elements.performance.close(); });
        elements.scrollToggle.addEventListener("click", toggleAutoScroll);
        $("scrollResetButton").addEventListener("click", function() {
            state.scrollPosition = 0;
            elements.performance.scrollTo({ top: 0, behavior: "smooth" });
        });
        $("fontDecreaseButton").addEventListener("click", () => adjustChartZoom(-Storage.CHART_ZOOM.step));
        $("fontIncreaseButton").addEventListener("click", () => adjustChartZoom(Storage.CHART_ZOOM.step));
        elements.scrollSpeed.addEventListener("input", function() {
            state.preferences.scrollSpeedMultiplier = updateScrollSpeedControl(elements.scrollSpeed.value);
            Storage.writePreferences(state.preferences);
        });
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
                if (state.duplicateInFlight.has(song.id)) return;
                state.duplicateInFlight.add(song.id);
                control.disabled = true;
                try {
                    const copy = Core.createSong(Object.assign({}, song, { id: undefined, title: `${song.title} (${t("common.duplicate", "Duplicate")})`, createdAt: undefined, updatedAt: undefined }));
                    if (state.storageAvailable) await Storage.put(copy);
                    state.songs.unshift(copy);
                    renderLibrary();
                } finally {
                    state.duplicateInFlight.delete(song.id);
                    if (control.isConnected) control.disabled = false;
                }
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
            else if (control.dataset.action === "toggle-add-menu") toggleAddMenu(control);
            else if (control.dataset.action === "add-line" || control.dataset.action === "add-bar") {
                const insertionIndex = Number(control.dataset.insertionIndex);
                const instrumental = control.dataset.action === "add-bar";
                closeAddMenu({ restoreFocus: false });
                let result;
                let destinationSection = sectionIndex;
                if (!state.song.sections.length) {
                    const sectionResult = Core.insertSectionAtBoundary(
                        state.song,
                        0,
                        0,
                        t("pages.songWorkspace.defaultSectionName", "Song")
                    );
                    state.song = sectionResult.song;
                    destinationSection = sectionResult.sectionIndex;
                    result = { song: state.song, index: 0 };
                } else {
                    result = Core.insertLine(
                        state.song,
                        sectionIndex,
                        insertionIndex,
                        Core.createLine("", [], instrumental ? "instrumental" : "lyric")
                    );
                    state.song = result.song;
                }
                scheduleSave();
                renderEditor();
                openLineEditor(destinationSection, result.index);
            } else if (control.dataset.action === "add-section") {
                openSectionDialog(sectionIndex, Number(control.dataset.insertionIndex), control);
            } else if (control.dataset.action === "add-instrumental-section") {
                openInstrumentalSectionDialog(sectionIndex, Number(control.dataset.insertionIndex), control);
            } else if (control.dataset.action === "toggle-section-actions") {
                const opening = state.activeSectionActions !== sectionIndex;
                state.activeSectionActions = opening ? sectionIndex : null;
                renderEditor();
                if (opening) {
                    window.requestAnimationFrame(function() {
                        focusWithoutScroll(elements.chart.querySelector(`[data-action="rename-section"][data-section-index="${sectionIndex}"]`));
                    });
                }
            } else if (control.dataset.action === "rename-section") {
                const section = state.song.sections[sectionIndex];
                const title = window.prompt(t("pages.songWorkspace.sectionNamePrompt", "Section name"), section.title);
                state.activeSectionActions = null;
                if (title !== null) { section.title = title.slice(0, 80) || "Section"; scheduleSave(); }
                renderEditor();
            } else if (control.dataset.action === "delete-section" && window.confirm(t("pages.songWorkspace.deleteSectionConfirm", "Delete this section?"))) {
                state.activeSectionActions = null;
                state.song.sections.splice(sectionIndex, 1); scheduleSave(); renderEditor();
            }
        });
        elements.shapeCards.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="choose-shape"]');
            if (control) openShapePicker(control.dataset.chordSymbol, control);
        });
        elements.shapePicker.addEventListener("click", function(event) {
            const positionControl = event.target.closest("button[data-shape-position]");
            if (positionControl) {
                state.shapePickerPosition = positionControl.dataset.shapePosition;
                updateShapeFilterPressedState(elements.shapePickerPosition, "button[data-shape-position]", state.shapePickerPosition);
                renderShapePicker();
                return;
            }
            const rootControl = event.target.closest("button[data-shape-root-string]");
            if (rootControl) {
                state.shapePickerRootString = rootControl.dataset.shapeRootString;
                updateShapeFilterPressedState(elements.shapePickerRoot, "button[data-shape-root-string]", state.shapePickerRootString);
                renderShapePicker();
                return;
            }
            const shapeControl = event.target.closest("[data-select-shape-index]");
            if (shapeControl) selectShape(Number(shapeControl.dataset.selectShapeIndex));
        });
        elements.shapePickerGrid.addEventListener("keydown", function(event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            if (event.target.closest("button")) return;
            const shapeControl = event.target.closest("[data-select-shape-index]");
            if (!shapeControl) return;
            event.preventDefault();
            selectShape(Number(shapeControl.dataset.selectShapeIndex));
        });
        $("closeShapePickerButton").addEventListener("click", closeShapePicker);
        elements.shapePicker.addEventListener("cancel", function(event) {
            event.preventDefault();
            closeShapePicker();
        });
        elements.shapePicker.addEventListener("close", finalizeShapePickerClose);
        elements.sectionForm.addEventListener("submit", function(event) {
            if (event.submitter?.value !== "default") return;
            event.preventDefault();
            addSectionAtBoundary();
        });
        elements.sectionDialog.addEventListener("close", function() {
            const context = state.sectionInsertContext;
            state.sectionInsertContext = null;
            if (elements.sectionDialog.returnValue === "created") return;
            window.requestAnimationFrame(function() {
                if (context?.trigger?.isConnected) focusWithoutScroll(context.trigger);
            });
        });
        elements.instrumentalForm.addEventListener("submit", function(event) {
            if (event.submitter?.value !== "default") return;
            event.preventDefault();
            addInstrumentalSectionAtBoundary();
        });
        elements.instrumentalDialog.addEventListener("close", function() {
            const context = state.instrumentalInsertContext;
            state.instrumentalInsertContext = null;
            if (elements.instrumentalDialog.returnValue === "created") return;
            window.requestAnimationFrame(function() {
                if (context?.trigger?.isConnected) focusWithoutScroll(context.trigger);
            });
        });
        elements.capoResults.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="use-capo"]');
            if (!control) return;
            elements.capo.value = control.dataset.capo; updateSongFromFields(); elements.capoResults.hidden = true;
        });
        elements.createForm.addEventListener("submit", async function(event) {
            if (event.submitter?.value !== "default") return;
            event.preventDefault();
            if (state.createInFlight) return;
            state.createInFlight = true;
            elements.confirmCreate.disabled = true;
            try {
                await createSongFromDialog();
            } catch (error) {
                elements.createError.textContent = error.message || t("pages.songWorkspace.importError", "We could not recognize this chart.");
            } finally {
                state.createInFlight = false;
                elements.confirmCreate.disabled = false;
            }
        });
        elements.lineText.addEventListener("input", function() { state.lineDraft.text = elements.lineText.value; renderAnchorEditor(); });
        elements.anchorPosition.addEventListener("input", function() { state.selectedAnchorPosition = Math.max(0, (Number(elements.anchorPosition.value) || 1) - 1); renderAnchorEditor(); });
        elements.anchorPreview.addEventListener("click", function(event) {
            const control = event.target.closest('[data-action="choose-anchor"]');
            if (!control) return;
            state.selectedAnchorPosition = Number(control.dataset.anchorPosition); renderAnchorEditor();
        });
        $("addAnchorButton").addEventListener("click", addAnchor);
        elements.deleteLine.addEventListener("click", deleteLineDraft);
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
                state.selectedAnchorPosition = chord.anchorPosition;
                elements.anchorChord.value = chord.symbol;
                elements.addAnchor.textContent = t("pages.songWorkspace.updateChord", "Update Chord");
            }
            renderAnchorEditor();
        });
        elements.lineForm.addEventListener("submit", function(event) {
            if (event.submitter?.value !== "default") return;
            event.preventDefault(); saveLineDraft();
        });
        [elements.createDialog, elements.globalAdd, elements.sectionDialog, elements.instrumentalDialog, elements.lineDialog].forEach(function(dialog) {
            dialog.addEventListener("close", function() {
                restoreDialogBackground(dialog, dialog.returnValue === "cancel" ? undefined : null);
            });
        });
        $("importSongButton").addEventListener("click", () => elements.importInput.click());
        $("restoreSongsButton").addEventListener("click", () => elements.restoreInput.click());
        $("backupSongsButton").addEventListener("click", backupSongs);
        elements.importInput.addEventListener("change", async function() {
            if (state.importInFlight) return;
            state.importInFlight = true;
            $("importSongButton").disabled = true;
            try { await importSong(elements.importInput.files[0]); } catch (error) { setStatus(error.message, true); } finally {
                state.importInFlight = false;
                $("importSongButton").disabled = false;
                elements.importInput.value = "";
            }
        });
        elements.restoreInput.addEventListener("change", async function() {
            if (state.restoreInFlight) return;
            state.restoreInFlight = true;
            $("restoreSongsButton").disabled = true;
            try { await restoreSongs(elements.restoreInput.files[0]); } catch (error) { setStatus(error.message, true); } finally {
                state.restoreInFlight = false;
                $("restoreSongsButton").disabled = false;
                elements.restoreInput.value = "";
            }
        });
        document.addEventListener("click", function(event) {
            if (!event.target.closest("[data-setting-help-item]")) closeSettingHelp();
            if (state.activeSectionActions !== null && !event.target.closest(".workspace-section-heading-row")) {
                state.activeSectionActions = null;
                renderEditor();
            }
            if (!event.target.closest(".workspace-add-control")) closeAddMenu({ restoreFocus: false });
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
            if (event.key === "Escape" && state.activeSettingHelp) {
                event.preventDefault();
                closeSettingHelp({ restoreFocus: true });
                return;
            }
            if (event.key === "Escape" && state.activeSectionActions !== null) {
                event.preventDefault();
                const sectionIndex = state.activeSectionActions;
                state.activeSectionActions = null;
                renderEditor();
                window.requestAnimationFrame(function() {
                    focusWithoutScroll(elements.chart.querySelector(`[data-action="toggle-section-actions"][data-section-index="${sectionIndex}"]`));
                });
                return;
            }
            if (event.key === "Escape" && state.readShapesOpen) {
                event.preventDefault();
                setReadShapes(false);
                return;
            }
            if (event.key === "Escape" && state.readMode) {
                event.preventDefault();
                setReadMode(false);
                return;
            }
            if (event.key === "Escape" && elements.shapePicker.open) {
                event.preventDefault();
                closeShapePicker();
                return;
            }
            const dismissibleDialog = [elements.createDialog, elements.globalAdd, elements.sectionDialog, elements.instrumentalDialog, elements.lineDialog]
                .find(dialog => dialog.open);
            if (event.key === "Escape" && dismissibleDialog) {
                event.preventDefault();
                dismissibleDialog.close("cancel");
                return;
            }
            if (event.key === "Escape" && state.addMenuTrigger) {
                event.preventDefault();
                closeAddMenu();
                return;
            }
            if (!elements.performance.open || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
            if (event.key === " ") { event.preventDefault(); toggleAutoScroll(); }
            else if (event.key === "+" || event.key === "=") adjustChartZoom(Storage.CHART_ZOOM.step);
            else if (event.key === "-") adjustChartZoom(-Storage.CHART_ZOOM.step);
        });
        window.addEventListener("jasper:language-change", function() {
            updateReadingControlLabels();
            setSaveState(state.saveState);
            renderLibrary();
            if (state.song) renderEditor();
            if (elements.createDialog.open) {
                const copy = creationCopy(elements.createForm.dataset.mode);
                elements.createMode.textContent = copy[0];
                elements.createSourceLabel.textContent = copy[1];
                elements.createLocalDisclosure.textContent = creationDisclosure(elements.createForm.dataset.mode);
                elements.confirmCreate.textContent = elements.createForm.dataset.mode === "chordpro"
                    ? t("pages.songWorkspace.importChordPro", "Import ChordPro")
                    : t("pages.songWorkspace.create", "Create");
            }
            if (elements.shapePicker.open) renderShapePicker();
            if (elements.globalAdd.open) {
                if (state.globalAddType) {
                    state.globalAddTargets = state.globalAddType === "line"
                        ? buildLineInsertionTargets()
                        : buildSectionInsertionTargets(state.globalAddType);
                    renderGlobalAddPositions();
                    elements.globalAddStepLabel.textContent = t("pages.songWorkspace.addStep", "Step {{step}} of 2", { step: 2 });
                } else {
                    elements.globalAddStepLabel.textContent = t("pages.songWorkspace.addStep", "Step {{step}} of 2", { step: 1 });
                }
            }
            if (elements.sectionDialog.open) elements.sectionName.placeholder = sectionNamePlaceholder();
            if (elements.instrumentalDialog.open) {
                elements.instrumentalName.placeholder = t(
                    "pages.songWorkspace.instrumentalSectionPlaceholder",
                    "e.g. Intro, Interlude, Solo, Outro"
                );
            }
            if (elements.lineDialog.open && state.lineContext) {
                const line = findCanonicalLine(state.lineContext.sectionIndex, state.lineContext.lineIndex);
                const instrumental = line?.type === "instrumental";
                elements.lineTitle.textContent = state.lineContext.isNew
                    ? t("pages.songWorkspace.addLine", "Add Line")
                    : instrumental
                    ? t("pages.songWorkspace.editBar", "Edit Bar")
                    : t("pages.songWorkspace.editLine", "Edit Line");
                elements.deleteLine.textContent = instrumental
                    ? t("pages.songWorkspace.deleteBar", "Delete Bar")
                    : t("pages.songWorkspace.deleteLine", "Delete Line");
                elements.saveLine.textContent = state.lineContext.isNew
                    ? t("pages.songWorkspace.addLine", "Add Line")
                    : instrumental
                    ? t("pages.songWorkspace.saveBar", "Save Bar")
                    : t("pages.songWorkspace.saveLine", "Save Line");
                renderAnchorEditor();
            }
            scheduleChordLayouts();
        });
        window.addEventListener("jasper:theme-change", scheduleChordLayouts);
        window.addEventListener("resize", function() {
            syncSettingsDisclosureViewport();
            scheduleChordLayouts();
            if (state.addMenuTrigger) {
                const menu = state.addMenuTrigger.closest(".workspace-add-control")?.querySelector(".workspace-add-menu");
                if (menu) positionAddMenu(state.addMenuTrigger, menu);
            }
        });
        window.addEventListener("scroll", function() {
            if (!state.addMenuTrigger) return;
            const menu = state.addMenuTrigger.closest(".workspace-add-control")?.querySelector(".workspace-add-menu");
            if (menu) positionAddMenu(state.addMenuTrigger, menu);
        }, { passive: true });
        elements.performance.addEventListener("cancel", stopAutoScroll);
        elements.performance.addEventListener("close", function() {
            stopAutoScroll();
            elements.editor.classList.remove("is-performance-open");
            if (!state.resumeReadAfterPerformance) return;
            state.resumeReadAfterPerformance = false;
            setReadMode(true, { trigger: state.readModeTrigger || $("readModeButton"), preserveScroll: true });
        });
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
        initializeChartZoomPreference();
        initializeLineSpacingPreference();
        syncSettingsDisclosureViewport();
        updateReadingControlLabels();
        applyChartZoom();
        applyLineSpacing();
        attachEvents();
        await loadSongs();
        const requestedId = new URLSearchParams(location.search).get("song");
        if (requestedId && !Core.isOpaqueSongId(requestedId)) {
            history.replaceState(null, "", "song-workspace.html");
        }
        const initialSong = state.songs.find(song => song.id === requestedId);
        if (initialSong) showEditor(initialSong);
        document.fonts?.ready?.then(scheduleChordLayouts);
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
