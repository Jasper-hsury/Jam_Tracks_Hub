document.addEventListener("DOMContentLoaded", function() {
    const grid = document.getElementById("tracksGrid");
    const keyFilter = document.getElementById("trackKeyFilter");
    const sortSelect = document.getElementById("trackSortSelect");
    const resultCount = document.getElementById("trackResultCount");
    const controls = document.querySelector(".track-controls");

    let tracks = [];

    if (!grid) {
        return;
    }

    const filterPillGroups = [
        { select: keyFilter, container: document.getElementById("trackKeyPills") },
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

            const currentLabel = container.querySelector("[data-filter-current]");
            const selectedOption = Array.from(select.options).find(option => option.value === select.value);
            if (currentLabel && selectedOption) {
                currentLabel.textContent = selectedOption.textContent;
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

            return getTrackNumber(b) - getTrackNumber(a);
        });

        return sorted;
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
                        <a href="${escapeHtml(track.slidesUrl)}" class="track-link track-secondary-action secondary-track-link" data-card-action="slides" target="_blank" rel="noopener noreferrer">Slides</a>
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
        const selectedKey = keyFilter?.value || "all";

        return tracks.filter(function(track) {
            const matchesKey = selectedKey === "all" || track.key === selectedKey;

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
            tracks = baseTracks.map(normalizeTrack);
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

    function syncFiltersAndRender() {
        renderFilterPills();
        renderTracks();
    }

    [keyFilter, sortSelect].forEach(function(control) {
        if (control) {
            control.addEventListener("input", syncFiltersAndRender);
            control.addEventListener("change", syncFiltersAndRender);
        }
    });

    controls?.addEventListener("click", function(event) {
        const dropdownToggle = event.target.closest(".track-dropdown-toggle");
        if (dropdownToggle) {
            const dropdown = dropdownToggle.closest(".track-dropdown-filter");
            const wasOpen = dropdown?.classList.contains("is-open");
            controls.querySelectorAll(".track-dropdown-filter.is-open").forEach(function(openDropdown) {
                openDropdown.classList.remove("is-open");
                openDropdown.querySelector(".track-dropdown-toggle")?.setAttribute("aria-expanded", "false");
            });
            if (dropdown && !wasOpen) {
                dropdown.classList.add("is-open");
                dropdownToggle.setAttribute("aria-expanded", "true");
            }
            return;
        }

        const pillButton = event.target.closest(".track-pill-button");
        if (!pillButton) {
            return;
        }

        const select = document.getElementById(pillButton.dataset.filterSelect);
        if (!select) {
            return;
        }

        select.value = pillButton.dataset.filterValue;
        pillButton.closest(".track-dropdown-filter")?.classList.remove("is-open");
        pillButton.closest(".track-dropdown-filter")?.querySelector(".track-dropdown-toggle")?.setAttribute("aria-expanded", "false");
        syncFiltersAndRender();
    });

    document.addEventListener("click", function(event) {
        if (!controls || controls.contains(event.target)) {
            return;
        }

        controls.querySelectorAll(".track-dropdown-filter.is-open").forEach(function(openDropdown) {
            openDropdown.classList.remove("is-open");
            openDropdown.querySelector(".track-dropdown-toggle")?.setAttribute("aria-expanded", "false");
        });
    });

    grid.addEventListener("click", function(event) {
        if (event.target.closest("[data-card-action]")) {
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
