document.addEventListener("DOMContentLoaded", function() {
    const STORAGE_KEY = "jasperMusicCustomTracks";
    const grid = document.getElementById("tracksGrid");
    const searchInput = document.getElementById("trackSearchInput");
    const keyFilter = document.getElementById("trackKeyFilter");
    const styleFilter = document.getElementById("trackStyleFilter");
    const sortSelect = document.getElementById("trackSortSelect");
    const resetButton = document.getElementById("resetTrackFilters");
    const resultCount = document.getElementById("trackResultCount");

    const modal = document.getElementById("addTrackModal");
    const openModalButton = document.getElementById("openAddTrackButton");
    const cancelButton = document.getElementById("cancelAddTrackButton");
    const previewButton = document.getElementById("previewTrackButton");
    const reviseButton = document.getElementById("reviseTrackButton");
    const doneButton = document.getElementById("doneTrackButton");

    const inputFields = document.getElementById("inputFieldsContainer");
    const primaryButtons = document.getElementById("primaryButtons");
    const reviseButtons = document.getElementById("reviseButtons");
    const instructionText = document.getElementById("instructionText");
    const codeOutput = document.getElementById("codeOutput");

    let tracks = [];
    let previewTrack = null;

    if (!grid) {
        return;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getTrackNumber(track) {
        const match = String(track.id || "").match(/[Ww](\d+)/);
        return match ? Number(match[1]) : 0;
    }

    function normalizeTrack(track) {
        return {
            id: String(track.id || "").trim(),
            title: String(track.title || "").trim(),
            key: String(track.key || "Unknown key").trim(),
            style: String(track.style || "Unknown style").trim(),
            bpm: String(track.bpm || "").trim(),
            youtubeUrl: String(track.youtubeUrl || "#").trim(),
            slidesUrl: String(track.slidesUrl || "#").trim(),
            downloadUrl: String(track.downloadUrl || "#").trim()
        };
    }

    function readCustomTracks() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(normalizeTrack);
        } catch (error) {
            return [];
        }
    }

    function saveCustomTrack(track) {
        const customTracks = readCustomTracks();
        const nextTracks = customTracks.filter(function(item) {
            return item.id.toLowerCase() !== track.id.toLowerCase();
        });

        nextTracks.push(normalizeTrack(track));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTracks, null, 2));
    }

    function uniqueSorted(values) {
        return Array.from(new Set(values.filter(Boolean))).sort(function(a, b) {
            return a.localeCompare(b);
        });
    }

    function populateSelect(selectElement, values, firstLabel) {
        if (!selectElement) {
            return;
        }

        const currentValue = selectElement.value || "all";
        selectElement.innerHTML = `<option value="all">${firstLabel}</option>` + values.map(function(value) {
            return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
        }).join("");

        selectElement.value = values.includes(currentValue) ? currentValue : "all";
    }

    function getSortedTracks(items) {
        const sortMode = sortSelect?.value || "newest";
        const sorted = [...items];

        sorted.sort(function(a, b) {
            if (sortMode === "oldest") {
                return getTrackNumber(a) - getTrackNumber(b);
            }

            if (sortMode === "key") {
                return a.key.localeCompare(b.key) || getTrackNumber(b) - getTrackNumber(a);
            }

            if (sortMode === "style") {
                return a.style.localeCompare(b.style) || getTrackNumber(b) - getTrackNumber(a);
            }

            if (sortMode === "bpm") {
                const bpmA = Number(a.bpm) || Number.MAX_SAFE_INTEGER;
                const bpmB = Number(b.bpm) || Number.MAX_SAFE_INTEGER;
                return bpmA - bpmB || getTrackNumber(b) - getTrackNumber(a);
            }

            return getTrackNumber(b) - getTrackNumber(a);
        });

        return sorted;
    }

    function buildTrackCard(track, options) {
        const isPreview = options?.isPreview;
        const bpmTag = track.bpm ? `<span>${escapeHtml(track.bpm)} BPM</span>` : "";
        const previewBadge = isPreview ? `<span>Preview</span>` : "";

        return `
            <article class="track-card${isPreview ? " preview-track-card" : ""}"
                ${isPreview ? 'id="tempPreviewCard"' : ""}
                data-title="${escapeHtml(`${track.id} ${track.title}`)}"
                data-key="${escapeHtml(track.key)}"
                data-style="${escapeHtml(track.style)}"
                data-bpm="${escapeHtml(track.bpm)}">
                <div class="track-card-main">
                    <h2>${escapeHtml(track.id)} ${escapeHtml(track.title)}</h2>
                    <p class="track-meta">
                        <span>${escapeHtml(track.key)}</span>
                        <span>${escapeHtml(track.style)}</span>
                        ${bpmTag}
                        ${previewBadge}
                    </p>
                </div>
                <div class="track-actions">
                    <a href="${escapeHtml(track.youtubeUrl)}" class="track-link" target="_blank" rel="noopener noreferrer">Listen</a>
                    <a href="${escapeHtml(track.slidesUrl)}" class="track-link secondary-track-link" target="_blank" rel="noopener noreferrer">Slides</a>
                    <a href="${escapeHtml(track.downloadUrl)}" class="track-link download-track-link" download>Download</a>
                </div>
            </article>
        `;
    }

    function getVisibleTracks() {
        const query = (searchInput?.value || "").trim().toLowerCase();
        const selectedKey = keyFilter?.value || "all";
        const selectedStyle = styleFilter?.value || "all";

        return tracks.filter(function(track) {
            const searchable = [
                track.id,
                track.title,
                track.key,
                track.style,
                track.bpm
            ].join(" ").toLowerCase();

            const matchesSearch = !query || searchable.includes(query);
            const matchesKey = selectedKey === "all" || track.key === selectedKey;
            const matchesStyle = selectedStyle === "all" || track.style === selectedStyle;

            return matchesSearch && matchesKey && matchesStyle;
        });
    }

    function renderTracks() {
        const visibleTracks = getSortedTracks(getVisibleTracks());
        const previewHtml = previewTrack ? buildTrackCard(previewTrack, { isPreview: true }) : "";
        const cardsHtml = visibleTracks.map(function(track) {
            return buildTrackCard(track);
        }).join("");

        grid.innerHTML = previewHtml + cardsHtml || `<p class="track-loading">No tracks match these filters.</p>`;

        if (resultCount) {
            resultCount.textContent = `${visibleTracks.length} track${visibleTracks.length === 1 ? "" : "s"} shown`;
        }
    }

    function refreshFilterOptions() {
        populateSelect(keyFilter, uniqueSorted(tracks.map(track => track.key)), "All keys");
        populateSelect(styleFilter, uniqueSorted(tracks.map(track => track.style)), "All styles");
    }

    async function loadTracks() {
        grid.innerHTML = `<p class="track-loading">Loading tracks...</p>`;

        try {
            const response = await fetch("tracks.json", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Could not load tracks.json");
            }

            const baseTracks = await response.json();
            tracks = [...baseTracks.map(normalizeTrack), ...readCustomTracks()];
            refreshFilterOptions();
            renderTracks();
        } catch (error) {
            grid.innerHTML = `
                <p class="track-loading">
                    Could not load tracks.json. Please preview this page through the local server instead of opening the file directly.
                </p>
            `;
        }
    }

    function resetModalState() {
        previewTrack = null;
        inputFields.style.display = "block";
        primaryButtons.style.display = "flex";
        reviseButtons.hidden = true;
        instructionText.hidden = true;
        codeOutput.hidden = true;
        renderTracks();
    }

    function openModal() {
        modal.style.display = "flex";
        resetModalState();
    }

    function closeModal() {
        modal.style.display = "none";
        resetModalState();
    }

    function buildTrackFromForm() {
        const id = document.getElementById("newId").value.trim();
        const title = document.getElementById("newTitle").value.trim();
        const subtitle = document.getElementById("newSub").value.trim();
        const youtubeUrl = document.getElementById("newYt").value.trim() || "#";
        const safeFileName = title.replace(/\s+/g, "_").replace(/#/g, "Sharp");
        const key = subtitle.split("/")[0]?.trim() || "Unknown key";
        const style = subtitle.split("/")[1]?.trim() || "Unknown style";

        return normalizeTrack({
            id,
            title,
            key,
            style,
            bpm: "",
            youtubeUrl,
            slidesUrl: `slides/${id.toLowerCase()}.html`,
            downloadUrl: `slides/${id}_${safeFileName}.pdf`
        });
    }

    function processNewTrack() {
        const track = buildTrackFromForm();

        if (!track.id || !track.title) {
            alert("Please enter at least Number and Title.");
            return;
        }

        previewTrack = track;
        renderTracks();

        inputFields.style.display = "none";
        primaryButtons.style.display = "none";
        reviseButtons.hidden = false;
        instructionText.hidden = false;
        codeOutput.hidden = false;

        instructionText.innerHTML = `
            <strong>Preview saved locally</strong>
            <p>Click Done to keep this track in your browser. To make it permanent for everyone, paste the JSON below into <code>tracks.json</code>.</p>
        `;
        codeOutput.value = JSON.stringify(track, null, 2);
    }

    function confirmPreviewTrack() {
        if (previewTrack) {
            saveCustomTrack(previewTrack);
            tracks = [...tracks.filter(function(track) {
                return track.id.toLowerCase() !== previewTrack.id.toLowerCase();
            }), previewTrack];
            refreshFilterOptions();
        }

        closeModal();
    }

    [searchInput, keyFilter, styleFilter, sortSelect].forEach(function(control) {
        if (control) {
            control.addEventListener("input", renderTracks);
            control.addEventListener("change", renderTracks);
        }
    });

    resetButton?.addEventListener("click", function() {
        searchInput.value = "";
        keyFilter.value = "all";
        styleFilter.value = "all";
        sortSelect.value = "newest";
        renderTracks();
    });

    openModalButton?.addEventListener("click", openModal);
    cancelButton?.addEventListener("click", closeModal);
    doneButton?.addEventListener("click", confirmPreviewTrack);
    reviseButton?.addEventListener("click", resetModalState);
    previewButton?.addEventListener("click", processNewTrack);

    loadTracks();
});
