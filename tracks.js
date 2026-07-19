document.addEventListener("DOMContentLoaded", function() {
    const FAVORITES_KEY = "jasperMusicFavoriteTracks";
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
        const favorite = isFavorite(track.id);
        const videoId = getYouTubeVideoId(track.youtubeUrl);
        const coverUrl = track.coverUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "");
        const coverStyle = coverUrl
            ? ` style="--track-cover-url: url('${escapeHtml(coverUrl)}');"`
            : "";

        return `
            <article class="track-card"${coverStyle}
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
                    <button class="favorite-track-button${favorite ? " is-favorite" : ""}" type="button"
                        data-track-id="${escapeHtml(track.id)}"
                        aria-label="${favorite ? "Remove from favorites" : "Add to favorites"}"
                        aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button>
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
            return;
        }

        window.gsap.registerPlugin(window.Flip);
        window.Flip.from(state, {
            targets: nextCards,
            duration: 0.58,
            ease: "power2.inOut",
            absolute: true,
            prune: true,
            fade: true,
            stagger: 0.018,
            onEnter: elements => window.gsap.fromTo(elements, {
                opacity: 0,
                y: 22,
                scale: 0.985
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.36,
                stagger: 0.035,
                ease: "power2.out",
                clearProps: "transform,opacity"
            }),
            onLeave: elements => window.gsap.to(elements, {
                opacity: 0,
                y: -16,
                scale: 0.985,
                duration: 0.24,
                stagger: 0.02,
                ease: "power2.in"
            }),
            onComplete: () => {
                grid.classList.remove("is-flipping-tracks");
                window.ScrollTrigger?.refresh?.();
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

    loadTracks();
});
