document.addEventListener("DOMContentLoaded", function() {
    const STORAGE_KEY = "jasperMusicCustomTracks";
    const FAVORITES_KEY = "jasperMusicFavoriteTracks";
    const grid = document.getElementById("tracksGrid");
    const searchInput = document.getElementById("trackSearchInput");
    const keyFilter = document.getElementById("trackKeyFilter");
    const styleFilter = document.getElementById("trackStyleFilter");
    const moodFilter = document.getElementById("trackMoodFilter");
    const instrumentFilter = document.getElementById("trackInstrumentFilter");
    const sortSelect = document.getElementById("trackSortSelect");
    const favoritesOnly = document.getElementById("favoriteTracksOnly");
    const resetButton = document.getElementById("resetTrackFilters");
    const resultCount = document.getElementById("trackResultCount");
    const controls = document.querySelector(".track-controls");

    const modal = document.getElementById("addTrackModal");
    const modalContent = modal?.querySelector(".modal-content");
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

    const filterPillGroups = [
        { select: keyFilter, container: document.getElementById("trackKeyPills") },
        { select: styleFilter, container: document.getElementById("trackStylePills") },
        { select: moodFilter, container: document.getElementById("trackMoodPills") },
        { select: instrumentFilter, container: document.getElementById("trackInstrumentPills") },
        { select: sortSelect, container: document.getElementById("trackSortPills") }
    ];

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
            mood: String(track.mood || "Unspecified").trim(),
            instrument: String(track.instrument || "Full band").trim(),
            bpm: String(track.bpm || "").trim(),
            youtubeUrl: String(track.youtubeUrl || "#").trim(),
            slidesUrl: String(track.slidesUrl || "#").trim(),
            downloadUrl: String(track.downloadUrl || "#").trim()
        };
    }

    function readFavorites() {
        try {
            return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
        } catch (error) {
            return new Set();
        }
    }

    function writeFavorites(favorites) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    }

    function isFavorite(trackId) {
        return readFavorites().has(trackId);
    }

    function toggleFavorite(trackId) {
        const favorites = readFavorites();
        if (favorites.has(trackId)) {
            favorites.delete(trackId);
        } else {
            favorites.add(trackId);
        }
        writeFavorites(favorites);
    }

    function getYouTubeVideoId(url) {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes("youtu.be")) {
                return parsed.pathname.slice(1).split("/")[0];
            }
            if (parsed.hostname.includes("youtube.com")) {
                return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
            }
        } catch (error) {
            return "";
        }

        return "";
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

    function renderFilterPills() {
        filterPillGroups.forEach(function(group) {
            const select = group.select;
            const container = group.container;
            const optionsContainer = container?.querySelector(".track-pill-options");
            if (!select || !container || !optionsContainer) {
                return;
            }

            optionsContainer.innerHTML = Array.from(select.options).map(function(option) {
                const isSelected = option.value === select.value;
                return `
                    <button
                        type="button"
                        class="track-pill-button${isSelected ? " is-selected" : ""}"
                        data-filter-select="${escapeHtml(select.id)}"
                        data-filter-value="${escapeHtml(option.value)}"
                        aria-pressed="${isSelected}">
                        ${escapeHtml(option.textContent)}
                    </button>
                `;
            }).join("");
        });
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
        const favorite = isFavorite(track.id);
        const videoId = getYouTubeVideoId(track.youtubeUrl);

        return `
            <article class="track-card${isPreview ? " preview-track-card" : ""}"
                ${isPreview ? 'id="tempPreviewCard"' : ""}
                data-title="${escapeHtml(`${track.id} ${track.title}`)}"
                data-key="${escapeHtml(track.key)}"
                data-style="${escapeHtml(track.style)}"
                data-mood="${escapeHtml(track.mood)}"
                data-instrument="${escapeHtml(track.instrument)}"
                data-bpm="${escapeHtml(track.bpm)}">
                <div class="track-card-main">
                    <div class="track-card-title-row">
                        <h2>${escapeHtml(track.id)} ${escapeHtml(track.title)}</h2>
                        <button class="favorite-track-button${favorite ? " is-favorite" : ""}" type="button"
                            data-track-id="${escapeHtml(track.id)}"
                            aria-label="${favorite ? "Remove from favorites" : "Add to favorites"}"
                            aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button>
                    </div>
                    <p class="track-meta">
                        <span>${escapeHtml(track.key)}</span>
                        <span>${escapeHtml(track.style)}</span>
                        <span>${escapeHtml(track.mood)}</span>
                        <span>${escapeHtml(track.instrument)}</span>
                        ${bpmTag}
                        ${previewBadge}
                    </p>
                </div>
                <div class="track-actions">
                    ${videoId ? `<button class="track-link track-primary-action inline-play-button" type="button" data-video-id="${escapeHtml(videoId)}">Play Here</button>` : ""}
                    <div class="track-secondary-actions">
                        ${videoId ? `<a href="${escapeHtml(track.youtubeUrl)}" class="track-link track-secondary-action track-youtube-link" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(track.title)} on YouTube">YouTube</a>` : ""}
                        <a href="${escapeHtml(track.slidesUrl)}" class="track-link track-secondary-action secondary-track-link" target="_blank" rel="noopener noreferrer">Slides</a>
                        <a href="${escapeHtml(track.downloadUrl)}" class="track-link track-secondary-action download-track-link" download>Download</a>
                    </div>
                </div>
                <div class="inline-track-player" hidden></div>
            </article>
        `;
    }

    function getVisibleTracks() {
        const query = (searchInput?.value || "").trim().toLowerCase();
        const selectedKey = keyFilter?.value || "all";
        const selectedStyle = styleFilter?.value || "all";
        const selectedMood = moodFilter?.value || "all";
        const selectedInstrument = instrumentFilter?.value || "all";
        const favorites = readFavorites();

        return tracks.filter(function(track) {
            const searchable = [
                track.id,
                track.title,
                track.key,
                track.style,
                track.mood,
                track.instrument,
                track.bpm
            ].join(" ").toLowerCase();

            const matchesSearch = !query || searchable.includes(query);
            const matchesKey = selectedKey === "all" || track.key === selectedKey;
            const matchesStyle = selectedStyle === "all" || track.style === selectedStyle;
            const matchesMood = selectedMood === "all" || track.mood === selectedMood;
            const matchesInstrument = selectedInstrument === "all" || track.instrument === selectedInstrument;
            const matchesFavorite = !favoritesOnly?.checked || favorites.has(track.id);

            return matchesSearch
                && matchesKey
                && matchesStyle
                && matchesMood
                && matchesInstrument
                && matchesFavorite;
        });
    }

    function renderTracks() {
        const visibleTracks = getSortedTracks(getVisibleTracks());
        const previewHtml = previewTrack ? buildTrackCard(previewTrack, { isPreview: true }) : "";
        const cardsHtml = visibleTracks.map(function(track) {
            return buildTrackCard(track);
        }).join("");

        grid.innerHTML = previewHtml + cardsHtml || `<p class="track-loading">No tracks match these filters.</p>`;
        grid.setAttribute("aria-busy", "false");

        if (resultCount) {
            resultCount.textContent = `${visibleTracks.length} track${visibleTracks.length === 1 ? "" : "s"} shown`;
        }
    }

    function refreshFilterOptions() {
        populateSelect(keyFilter, uniqueSorted(tracks.map(track => track.key)), "All keys");
        populateSelect(styleFilter, uniqueSorted(tracks.map(track => track.style)), "All styles");
        populateSelect(moodFilter, uniqueSorted(tracks.map(track => track.mood)), "All moods");
        populateSelect(instrumentFilter, uniqueSorted(tracks.map(track => track.instrument)), "All instruments");
        renderFilterPills();
    }

    async function loadTracks() {
        grid.setAttribute("aria-busy", "true");
        grid.innerHTML = Array.from({ length: 3 }, function() {
            return `<article class="track-card track-skeleton" aria-hidden="true"></article>`;
        }).join("");

        try {
            const response = await fetch("tracks.json", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Could not load tracks.json");
            }

            const baseTracks = await response.json();
            tracks = [...baseTracks.map(normalizeTrack), ...readCustomTracks()];
            refreshFilterOptions();
            const requestedKey = new URLSearchParams(window.location.search).get("key");
            if (requestedKey && keyFilter) {
                keyFilter.value = Array.from(keyFilter.options).some(option => option.value.toLowerCase() === requestedKey.toLowerCase())
                    ? Array.from(keyFilter.options).find(option => option.value.toLowerCase() === requestedKey.toLowerCase()).value
                    : "all";
                renderFilterPills();
            }
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

    let modalReturnFocus = null;

    function getModalFocusTargets() {
        return Array.from(modal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]'
        )).filter(function(element) {
            return !element.hidden && element.offsetParent !== null;
        });
    }

    function openModal() {
        modalReturnFocus = document.activeElement;
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        resetModalState();
        window.setTimeout(function() {
            document.getElementById("newId")?.focus();
        }, 0);
    }

    function closeModal() {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
        resetModalState();
        modalReturnFocus?.focus();
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

    function syncFiltersAndRender() {
        renderFilterPills();
        renderTracks();
    }

    [searchInput, keyFilter, styleFilter, moodFilter, instrumentFilter, sortSelect, favoritesOnly].forEach(function(control) {
        if (control) {
            control.addEventListener("input", syncFiltersAndRender);
            control.addEventListener("change", syncFiltersAndRender);
        }
    });

    controls?.addEventListener("click", function(event) {
        const pillButton = event.target.closest(".track-pill-button");
        if (!pillButton) {
            return;
        }

        const select = document.getElementById(pillButton.dataset.filterSelect);
        if (!select) {
            return;
        }

        select.value = pillButton.dataset.filterValue;
        syncFiltersAndRender();
    });

    resetButton?.addEventListener("click", function() {
        searchInput.value = "";
        keyFilter.value = "all";
        styleFilter.value = "all";
        moodFilter.value = "all";
        instrumentFilter.value = "all";
        sortSelect.value = "newest";
        favoritesOnly.checked = false;
        syncFiltersAndRender();
    });

    grid.addEventListener("click", function(event) {
        const favoriteButton = event.target.closest(".favorite-track-button");
        const playButton = event.target.closest(".inline-play-button");

        if (favoriteButton) {
            toggleFavorite(favoriteButton.dataset.trackId);
            renderTracks();
            return;
        }

        if (playButton) {
            const card = playButton.closest(".track-card");
            const player = card.querySelector(".inline-track-player");
            const isOpen = !player.hidden;

            document.querySelectorAll(".inline-track-player").forEach(function(otherPlayer) {
                otherPlayer.hidden = true;
                otherPlayer.innerHTML = "";
            });
            document.querySelectorAll(".inline-play-button").forEach(function(otherButton) {
                otherButton.textContent = "Play Here";
            });

            if (!isOpen) {
                player.innerHTML = `
                    <iframe
                        src="https://www.youtube.com/embed/${encodeURIComponent(playButton.dataset.videoId)}?autoplay=1"
                        title="Inline backing track player"
                        loading="lazy"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowfullscreen></iframe>
                `;
                player.hidden = false;
                playButton.textContent = "Close Player";
            }
        }
    });

    openModalButton?.addEventListener("click", openModal);
    cancelButton?.addEventListener("click", closeModal);
    doneButton?.addEventListener("click", confirmPreviewTrack);
    reviseButton?.addEventListener("click", resetModalState);
    previewButton?.addEventListener("click", processNewTrack);

    modal?.addEventListener("click", function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    modal?.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeModal();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const focusTargets = getModalFocusTargets();
        if (!focusTargets.length) {
            event.preventDefault();
            modalContent?.focus();
            return;
        }

        const firstTarget = focusTargets[0];
        const lastTarget = focusTargets[focusTargets.length - 1];

        if (event.shiftKey && document.activeElement === firstTarget) {
            event.preventDefault();
            lastTarget.focus();
        } else if (!event.shiftKey && document.activeElement === lastTarget) {
            event.preventDefault();
            firstTarget.focus();
        }
    });

    loadTracks();
});
