document.addEventListener("DOMContentLoaded", function() {
    const grid = document.getElementById("tracksGrid");
    const keyFilter = document.getElementById("trackKeyFilter");
    const sortSelect = document.getElementById("trackSortSelect");
    const resultCount = document.getElementById("trackResultCount");
    const controls = document.querySelector(".track-controls");
    const keyFilterPanel = document.getElementById("trackKeyPills");
    const sortSwitchPanel = document.getElementById("trackSortPills");
    const sortToggle = document.getElementById("trackSortToggle");

    let tracks = [];
    let selectedKeys = new Set();
    let selectedKeyGroups = new Set();
    const slidesActionTimers = new WeakMap();
    const relativeKeyGroups = [
        { id: "c-am", label: "C/Am", keys: ["C major", "A minor"] },
        { id: "csharp-bbm", label: "C#/Bbm", keys: ["C# major", "Db major", "Bb minor", "A# minor"] },
        { id: "d-bm", label: "D/Bm", keys: ["D major", "B minor"] },
        { id: "eb-cm", label: "Eb/Cm", keys: ["Eb major", "D# major", "C minor"] },
        { id: "e-csharpm", label: "E/C#m", keys: ["E major", "C# minor", "Db minor"] },
        { id: "f-dm", label: "F/Dm", keys: ["F major", "D minor"] },
        { id: "fsharp-ebm", label: "F#/Ebm", keys: ["F# major", "Gb major", "Eb minor", "D# minor"] },
        { id: "g-em", label: "G/Em", keys: ["G major", "E minor"] },
        { id: "ab-fm", label: "Ab/Fm", keys: ["Ab major", "G# major", "F minor"] },
        { id: "a-fsharpm", label: "A/F#m", keys: ["A major", "F# minor", "Gb minor"] },
        { id: "bb-gm", label: "Bb/Gm", keys: ["Bb major", "A# major", "G minor"] },
        { id: "b-gsharpm", label: "B/G#m", keys: ["B major", "G# minor", "Ab minor"] }
    ];

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

    function renderLoaderMarkup(extraClass) {
        const className = extraClass ? `jh-loader ${extraClass}` : "jh-loader";
        return `
            <span class="${className}" aria-hidden="true">
                <span class="jh-loader-dot"></span>
                <span class="jh-loader-dot"></span>
                <span class="jh-loader-dot"></span>
            </span>
        `;
    }

    function triggerSlidesAction(link) {
        window.clearTimeout(slidesActionTimers.get(link));
        link.classList.add("is-activating");
        link.setAttribute("aria-busy", "true");
        slidesActionTimers.set(link, window.setTimeout(function() {
            link.classList.remove("is-activating");
            link.removeAttribute("aria-busy");
        }, 1800));
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
            descriptor: String(track.descriptor || track.mood || track.style || "Practice").trim(),
            instrument: String(track.instrument || "Full band").trim(),
            bpm: String(track.bpm || "").trim(),
            coverUrl: String(track.coverUrl || "").trim(),
            youtubeUrl: String(track.youtubeUrl || "#").trim(),
            slidesUrl: String(track.slidesUrl || "#").trim(),
            downloadUrl: String(track.downloadUrl || "#").trim()
        };
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

    function uniqueSorted(values) {
        return Array.from(new Set(values.filter(Boolean))).sort(function(a, b) {
            return a.localeCompare(b);
        });
    }

    function populateSelect(selectElement, values, firstLabel) {
        if (!selectElement) {
            return;
        }

        selectElement.innerHTML = `<option value="all">${firstLabel}</option>` + values.map(function(value) {
            return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
        }).join("");
    }

    function getAvailableKeyValues() {
        if (!keyFilter) {
            return [];
        }

        return Array.from(keyFilter.options)
            .map(option => option.value)
            .filter(value => value && value !== "all");
    }

    function sanitizeSelectedKeys(keys) {
        const availableKeys = new Set(getAvailableKeyValues());
        return new Set(Array.from(keys).filter(key => availableKeys.has(key)));
    }

    function sanitizeSelectedKeyGroups(groups) {
        const availableGroupIds = new Set(relativeKeyGroups.map(group => group.id));
        return new Set(Array.from(groups).filter(groupId => availableGroupIds.has(groupId)));
    }

    function getKeysFromSelectedGroups() {
        if (selectedKeyGroups.size === 0) {
            return new Set();
        }

        return new Set(relativeKeyGroups
            .filter(group => selectedKeyGroups.has(group.id))
            .flatMap(group => group.keys));
    }

    function updateKeySelectFromState() {
        if (!keyFilter) {
            return;
        }

        keyFilter.querySelectorAll("option").forEach(function(option) {
            option.selected = selectedKeys.size === 0
                ? option.value === "all"
                : selectedKeys.has(option.value);
        });
    }

    function getKeyFilterSummary() {
        if (selectedKeys.size === 0) {
            return "All keys";
        }

        const orderedGroups = relativeKeyGroups.filter(group => selectedKeyGroups.has(group.id));
        if (orderedGroups.length === 1) {
            return orderedGroups[0].label;
        }

        return `${orderedGroups[0].label} +${orderedGroups.length - 1}`;
    }

    function renderKeyFilterOptions() {
        if (!keyFilterPanel) {
            return;
        }

        const currentLabel = keyFilterPanel.querySelector("[data-filter-current]");
        const optionsContainer = keyFilterPanel.querySelector(".track-key-options");
        const optionRows = [
            { value: "all", label: "All keys" },
            ...relativeKeyGroups.map(function(group) {
                return { value: group.id, label: group.label };
            })
        ];

        if (currentLabel) {
            currentLabel.textContent = getKeyFilterSummary();
        }

        if (!optionsContainer) {
            return;
        }

        optionsContainer.innerHTML = optionRows.map(function(option, index) {
            const isChecked = option.value === "all"
                ? selectedKeyGroups.size === 0
                : selectedKeyGroups.has(option.value);
            const inputId = `track-key-choice-${option.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "all"}`;

            return `
                <input
                    class="track-key-checkbox"
                    id="${escapeHtml(inputId)}"
                    type="checkbox"
                    data-filter-value="${escapeHtml(option.value)}"
                    ${isChecked ? "checked" : ""}>
                <label class="track-key-checkbox-wrapper${index === 0 ? " track-key-checkbox-wrapper-all" : ""}" for="${escapeHtml(inputId)}">
                    <span class="track-key-checkbox-visual">
                        <span class="track-key-checkbox-inner">${escapeHtml(option.label)}</span>
                    </span>
                </label>
            `;
        }).join("");
    }

    function syncKeyFilterAndRender() {
        selectedKeyGroups = sanitizeSelectedKeyGroups(selectedKeyGroups);
        selectedKeys = getKeysFromSelectedGroups();
        updateKeySelectFromState();
        renderKeyFilterOptions();
        renderTracks();
    }

    function renderSortControl() {
        if (!sortSelect || !sortToggle || !sortSwitchPanel) {
            return;
        }

        const isOldest = sortSelect.value === "oldest";
        sortToggle.checked = isOldest;
        sortSwitchPanel.querySelector("[data-sort-latest]")?.classList.toggle("is-active", !isOldest);
        sortSwitchPanel.querySelector("[data-sort-oldest]")?.classList.toggle("is-active", isOldest);
    }

    function closeKeyFilterPanel() {
        if (!keyFilterPanel) {
            return;
        }

        keyFilterPanel.classList.remove("is-open");
        keyFilterPanel.querySelector(".track-key-filter-toggle")?.setAttribute("aria-expanded", "false");
    }

    function getSortedTracks(items) {
        const sortMode = sortSelect?.value || "newest";
        const sorted = [...items];

        sorted.sort(function(a, b) {
            if (sortMode === "oldest") {
                return getTrackNumber(a) - getTrackNumber(b);
            }

            return getTrackNumber(b) - getTrackNumber(a);
        });

        return sorted;
    }

    function buildSlidesDownloadLink(track, extraClass = "") {
        const className = [
            "track-link",
            "track-secondary-action",
            "secondary-track-link",
            "track-slides-download-link",
            extraClass
        ].filter(Boolean).join(" ");

        return `
            <a href="${escapeHtml(track.downloadUrl)}" class="${className}" data-card-action="slides" download aria-label="Download slides for ${escapeHtml(track.title)}">
                <span class="track-slides-download-circle" aria-hidden="true">
                    <svg class="track-slides-download-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5v11m0 0-4-4m4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                        <path d="M6 19h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
                    </svg>
                    <span class="track-slides-download-square"></span>
                </span>
            </a>
        `;
    }

    function buildTrackCard(track) {
        const videoId = getYouTubeVideoId(track.youtubeUrl);
        const hasYouTubeLink = Boolean(videoId && track.youtubeUrl && track.youtubeUrl !== "#");
        const coverUrl = track.coverUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "");
        const coverStyle = coverUrl
            ? ` style="--track-cover-url: url('${escapeHtml(coverUrl)}');"`
            : "";
        const clickAttributes = hasYouTubeLink
            ? ` role="link" tabindex="0" data-youtube-url="${escapeHtml(track.youtubeUrl)}" aria-label="Open ${escapeHtml(track.title)} on YouTube"`
            : "";

        return `
            <article class="track-card${hasYouTubeLink ? " track-card-clickable" : ""}"${coverStyle}${clickAttributes}
                data-flip-id="track-${escapeHtml(track.id)}"
                data-title="${escapeHtml(`${track.id} ${track.title}`)}"
                data-key="${escapeHtml(track.key)}"
                data-style="${escapeHtml(track.style)}"
                data-mood="${escapeHtml(track.mood)}"
                data-instrument="${escapeHtml(track.instrument)}"
                data-bpm="${escapeHtml(track.bpm)}">
                <div class="track-card-main">
                    <div class="track-card-title-row">
                        <h2>${escapeHtml(track.id)} ${escapeHtml(track.title)}</h2>
                    </div>
                    <p class="track-meta">
                        <span>${escapeHtml(track.key)}</span>
                        <span>${escapeHtml(track.descriptor)}</span>
                    </p>
                </div>
                <div class="track-actions">
                    <div class="track-secondary-actions">
                        ${buildSlidesDownloadLink(track)}
                    </div>
                </div>
            </article>
        `;
    }

    function shouldUseTrackFlip() {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        return Boolean(
            !reduceMotion &&
            window.gsap &&
            window.Flip &&
            grid.querySelector(".track-card:not(.track-skeleton)")
        );
    }

    function animateTrackFlip(state) {
        const nextCards = Array.from(grid.querySelectorAll(".track-card:not(.track-skeleton)"));
        if (!state || !window.gsap || !window.Flip || !nextCards.length) {
            grid.classList.remove("is-flipping-tracks");
            window.dispatchEvent(new CustomEvent("tracks:rendered"));
            return;
        }

        window.gsap.registerPlugin(window.Flip);
        window.Flip.from(state, {
            targets: nextCards,
            duration: 0.74,
            ease: "power3.inOut",
            absolute: true,
            absoluteOnLeave: true,
            nested: true,
            prune: true,
            fade: true,
            scale: true,
            stagger: {
                each: 0.022,
                from: "start"
            },
            onEnter: elements => window.gsap.fromTo(elements, {
                opacity: 0,
                x: 34,
                y: 10,
                scale: 0.98
            }, {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.42,
                stagger: 0.035,
                ease: "power3.out",
                clearProps: "transform,opacity"
            }),
            onLeave: elements => window.gsap.to(elements, {
                opacity: 0,
                x: -28,
                scale: 0.98,
                duration: 0.28,
                stagger: 0.018,
                ease: "power2.in"
            }),
            onComplete: () => {
                grid.classList.remove("is-flipping-tracks");
                window.ScrollTrigger?.refresh?.();
                window.dispatchEvent(new CustomEvent("tracks:rendered"));
            }
        });
    }

    function getVisibleTracks() {
        return tracks.filter(function(track) {
            const matchesKey = selectedKeys.size === 0 || selectedKeys.has(track.key);

            return matchesKey;
        });
    }

    function renderTracks() {
        const flipState = shouldUseTrackFlip()
            ? window.Flip.getState(".tracks-library-page .track-card:not(.track-skeleton)", {
                props: "opacity"
            })
            : null;
        const visibleTracks = getSortedTracks(getVisibleTracks());
        const cardsHtml = visibleTracks.map(function(track) {
            return buildTrackCard(track);
        }).join("");

        if (flipState) {
            grid.classList.add("is-flipping-tracks");
        }

        grid.innerHTML = cardsHtml || `<p class="track-loading">No tracks match these filters.</p>`;
        grid.setAttribute("aria-busy", "false");

        if (resultCount) {
            resultCount.textContent = `${visibleTracks.length} track${visibleTracks.length === 1 ? "" : "s"} shown`;
        }

        if (flipState) {
            animateTrackFlip(flipState);
        } else {
            window.dispatchEvent(new CustomEvent("tracks:rendered"));
        }
    }

    function refreshFilterOptions() {
        populateSelect(keyFilter, uniqueSorted(tracks.map(track => track.key)), "All keys");
        selectedKeyGroups = sanitizeSelectedKeyGroups(selectedKeyGroups);
        selectedKeys = getKeysFromSelectedGroups();
        updateKeySelectFromState();
        renderKeyFilterOptions();
        renderSortControl();
    }

    async function loadTracks() {
        grid.setAttribute("aria-busy", "true");
        grid.innerHTML = `
            <p class="track-loading track-loading-status" role="status">
                ${renderLoaderMarkup("track-loading-spinner")}
                <span>Loading tracks...</span>
            </p>
        `;

        try {
            const response = await fetch("tracks.json", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Could not load tracks.json");
            }

            const baseTracks = await response.json();
            tracks = baseTracks.map(normalizeTrack);
            refreshFilterOptions();
            const params = new URLSearchParams(window.location.search);
            const requestedKeys = params.getAll("key").flatMap(function(value) {
                return value.split(",");
            }).map(function(value) {
                return value.trim();
            }).filter(Boolean);
            if (requestedKeys.length && keyFilter) {
                selectedKeyGroups = new Set(requestedKeys.map(function(requestedKey) {
                    const normalizedKey = requestedKey.toLowerCase();
                    const requestedGroup = relativeKeyGroups.find(function(group) {
                        return group.id.toLowerCase() === normalizedKey ||
                            group.label.toLowerCase() === normalizedKey ||
                            group.keys.some(key => key.toLowerCase() === normalizedKey);
                    });
                    return requestedGroup?.id;
                }).filter(Boolean));
                selectedKeys = getKeysFromSelectedGroups();
                updateKeySelectFromState();
                renderKeyFilterOptions();
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

    function syncFiltersAndRender() {
        renderSortControl();
        renderTracks();
    }

    [keyFilter, sortSelect].forEach(function(control) {
        if (control) {
            control.addEventListener("input", syncFiltersAndRender);
            control.addEventListener("change", syncFiltersAndRender);
        }
    });

    controls?.addEventListener("click", function(event) {
        const keyToggle = event.target.closest(".track-key-filter-toggle");
        if (keyToggle) {
            const wasOpen = keyFilterPanel?.classList.contains("is-open");
            closeKeyFilterPanel();
            if (keyFilterPanel && !wasOpen) {
                keyFilterPanel.classList.add("is-open");
                keyToggle.setAttribute("aria-expanded", "true");
            }
            return;
        }
    });

    controls?.addEventListener("change", function(event) {
        const keyCheckbox = event.target.closest(".track-key-checkbox");
        if (keyCheckbox) {
            const keyValue = keyCheckbox.dataset.filterValue;
            if (keyValue === "all") {
                selectedKeyGroups.clear();
            } else if (keyCheckbox.checked) {
                selectedKeyGroups.add(keyValue);
            } else {
                selectedKeyGroups.delete(keyValue);
            }
            syncKeyFilterAndRender();
            return;
        }

        if (event.target === sortToggle && sortSelect) {
            sortSelect.value = sortToggle.checked ? "oldest" : "newest";
            syncFiltersAndRender();
        }
    });

    controls?.addEventListener("keydown", function(event) {
        if (event.key !== "Enter" || !keyFilterPanel?.classList.contains("is-open")) {
            return;
        }

        if (event.target.closest(".track-key-multiselect")) {
            event.preventDefault();
            closeKeyFilterPanel();
            keyFilterPanel.querySelector(".track-key-filter-toggle")?.focus();
        }
    });

    document.addEventListener("click", function(event) {
        const clickPath = event.composedPath?.() || [];
        if (!controls || controls.contains(event.target) || clickPath.includes(controls)) {
            return;
        }

        closeKeyFilterPanel();
    });

    grid.addEventListener("click", function(event) {
        if (event.target.closest("[data-card-action]")) {
            const slidesLink = event.target.closest(".track-slides-download-link");
            if (slidesLink) {
                triggerSlidesAction(slidesLink);
            }
            event.stopPropagation();
            return;
        }

        if (event.target.closest("[data-card-action], a, button")) {
            return;
        }

        const card = event.target.closest(".track-card-clickable");
        const youtubeUrl = card?.dataset.youtubeUrl;
        if (youtubeUrl) {
            const opened = window.open(youtubeUrl, "_blank", "noopener,noreferrer");
            if (opened) {
                opened.opener = null;
            }
        }
    });

    grid.addEventListener("keydown", function(event) {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        if (event.target.closest("a, button")) {
            return;
        }

        const card = event.target.closest(".track-card-clickable");
        const youtubeUrl = card?.dataset.youtubeUrl;
        if (youtubeUrl) {
            event.preventDefault();
            const opened = window.open(youtubeUrl, "_blank", "noopener,noreferrer");
            if (opened) {
                opened.opener = null;
            }
        }
    });

    loadTracks();
});
