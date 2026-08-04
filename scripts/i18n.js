(function() {
    const LANGUAGE_KEY = "jasperMusicLanguage";
    const DEFAULT_LANGUAGE = "en";
    const SUPPORTED_LANGUAGES = {
        en: {
            label: "EN",
            switchLabel: "EN",
            switchAriaLabel: "Switch to English",
            htmlLang: "en"
        },
        "zh-TW": {
            label: "中",
            switchLabel: "中",
            switchAriaLabel: "切換至繁體中文",
            htmlLang: "zh-TW"
        }
    };
    const NAV_KEYS_BY_HREF = {
        "index.html#home": "nav.home",
        "tracks.html": "nav.tracks",
        "chord-dictionary.html": "nav.chordDictionary",
        "scale.html": "nav.scaleExplorer",
        "key-finder.html": "nav.keyFinder",
        "chord-progressions.html": "nav.chordProgressions",
        "fretboard-trainer.html": "nav.fretboardTrainer",
        "index.html#about": "nav.about"
    };

    const preload = window.JasperI18nPreload || {};
    const state = {
        language: normalizeLanguage(preload.language || DEFAULT_LANGUAGE),
        resources: preload.resources || {},
        observer: null,
        isApplying: false
    };

    function normalizeLanguage(language) {
        return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, language) ? language : DEFAULT_LANGUAGE;
    }

    function readSavedLanguage() {
        try {
            const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
            return storedLanguage ? normalizeLanguage(storedLanguage) : normalizeLanguage(preload.language || DEFAULT_LANGUAGE);
        } catch (error) {
            return normalizeLanguage(preload.language || DEFAULT_LANGUAGE);
        }
    }

    function saveLanguage(language) {
        try {
            localStorage.setItem(LANGUAGE_KEY, language);
        } catch (error) {
            // Keep the selected language for the current page when storage is unavailable.
        }
    }

    function getNestedValue(source, path) {
        return path.split(".").reduce(function(value, segment) {
            if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
                return value[segment];
            }
            return undefined;
        }, source);
    }

    async function loadResources(language) {
        if (preload.language === language && preload.resources) {
            const resources = preload.resources;
            if (language === DEFAULT_LANGUAGE || resources.selected || resources.fallback) {
                return resources.selected || resources.fallback ? resources : resources;
            }
        }

        const fallbackPromise = fetch(`locales/${DEFAULT_LANGUAGE}/common.json`, { cache: "no-store" })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error(`Missing ${DEFAULT_LANGUAGE} locale`);
                }
                return response.json();
            });

        if (language === DEFAULT_LANGUAGE) {
            return fallbackPromise;
        }

        const [fallback, selected] = await Promise.all([
            fallbackPromise,
            fetch(`locales/${language}/common.json`, { cache: "no-store" })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error(`Missing ${language} locale`);
                    }
                    return response.json();
                })
        ]);

        return {
            fallback,
            selected
        };
    }

    function interpolate(value, variables) {
        if (!variables || typeof value !== "string") {
            return value;
        }

        return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, function(match, name) {
            return Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match;
        });
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function coreTrackName(title) {
        const cleanTitle = String(title || "").trim();
        return cleanTitle
            .replace(/\s+Backing Track\s+in\s+.+$/i, "")
            .replace(/\s+Backing Track$/i, "")
            .trim() || cleanTitle;
    }

    function localizedTrackKey(key) {
        const match = String(key || "").match(/^([A-G](?:#|b)?)\s+(major|minor)$/i);
        if (!match) {
            return String(key || "").trim();
        }

        if (state.language === "zh-TW") {
            return `${match[1]} ${match[2].toLowerCase() === "minor" ? "小調" : "大調"}`;
        }

        return `${match[1]} ${match[2].toLowerCase()}`;
    }

    function trackTitleText(track, options = {}) {
        const week = String(track?.id || "").trim();
        const title = String(track?.title || "").trim();
        const key = localizedTrackKey(track?.key);
        const includeWeek = options.includeWeek !== false;

        if (state.language === "zh-TW") {
            const weekPrefix = includeWeek ? week : "";
            return `${weekPrefix}《${coreTrackName(title)}》｜${key}吉他即興伴奏`;
        }

        return includeWeek ? `${week} ${title}`.trim() : title;
    }

    function trackTitleMarkup(track, options = {}) {
        const week = escapeHtml(String(track?.id || "").trim());
        const title = escapeHtml(String(track?.title || "").trim());
        const includeWeek = options.includeWeek !== false;

        if (state.language !== "zh-TW") {
            const weekMarkup = includeWeek ? `<span class="track-title-week">${week}</span> ` : "";
            return `${weekMarkup}<span class="track-title-name">${title}</span>`;
        }

        const coreName = escapeHtml(coreTrackName(track?.title));
        const key = escapeHtml(localizedTrackKey(track?.key));
        const parts = [
            includeWeek ? `<span class="track-title-week">${week}</span>` : "",
            `<span class="track-title-name">《${coreName}》</span>`,
            `<span class="track-title-separator">｜</span>`,
            `<span class="track-title-key">${key}吉他即興伴奏</span>`
        ];
        return parts.filter(Boolean).join("");
    }

    function elementVariables(element) {
        return Object.entries(element.dataset).reduce(function(variables, [name, value]) {
            if (name.startsWith("i18nVar")) {
                const variableName = name
                    .replace(/^i18nVar/, "")
                    .replace(/^[A-Z]/, function(letter) {
                        return letter.toLowerCase();
                    });
                variables[variableName] = variableName === "title" && element.dataset.trackTitle
                    ? trackTitleText({
                        id: element.dataset.trackId,
                        title: element.dataset.trackTitle,
                        key: element.dataset.trackKey
                    })
                    : value;
            }
            return variables;
        }, {});
    }

    function applyTrackTitles(scope) {
        scope.querySelectorAll("[data-track-heading]").forEach(function(element) {
            element.innerHTML = trackTitleMarkup({
                id: element.dataset.trackId,
                title: element.dataset.trackTitle,
                key: element.dataset.trackKey
            }, {
                includeWeek: element.dataset.trackWeek === "localized" ? state.language === "zh-TW" : true
            });
        });

        window.requestAnimationFrame(updateTrackTitleWrapState);
    }

    function updateTrackTitleWrapState() {
        document.querySelectorAll("[data-track-heading]").forEach(function(element) {
            const name = element.querySelector(".track-title-name");
            const key = element.querySelector(".track-title-key");
            const shouldHideSeparator = Boolean(
                state.language === "zh-TW" &&
                name &&
                key &&
                key.getBoundingClientRect().top > name.getBoundingClientRect().top + 2
            );

            element.classList.toggle("is-wrapped", shouldHideSeparator);
        });
    }

    function translate(key, fallbackValue, variables) {
        const resources = state.resources || {};
        const selected = resources.selected || resources;
        const fallback = resources.fallback || resources;
        const value = getNestedValue(selected, key) ?? getNestedValue(fallback, key) ?? fallbackValue;
        return interpolate(value, variables);
    }

    function annotateSharedNavigation() {
        document.querySelectorAll(".nav-links a[href]").forEach(function(link) {
            const href = link.getAttribute("href");
            const key = NAV_KEYS_BY_HREF[href];
            if (key && !link.dataset.i18n) {
                link.dataset.i18n = key;
            }
        });

        const compactToolsLabel = document.querySelector(".nav-compact-tools summary span");
        if (compactToolsLabel && !compactToolsLabel.dataset.i18n) {
            compactToolsLabel.dataset.i18n = "nav.tools";
        }

        document.querySelectorAll(".nav-compact-tools-menu a[href]").forEach(function(link) {
            const key = NAV_KEYS_BY_HREF[link.getAttribute("href")];
            if (key && !link.dataset.i18n) {
                link.dataset.i18n = key;
            }
        });

        document.querySelectorAll(".theme-toggle-label, .nav-appearance-label").forEach(function(themeLabel) {
            if (!themeLabel.dataset.i18n) {
                themeLabel.dataset.i18n = "nav.appearance";
            }
        });

        const skipLink = document.querySelector(".skip-link");
        if (skipLink && !skipLink.dataset.i18n) {
            skipLink.dataset.i18n = "skip.main";
        }

        document.querySelectorAll(".footer > p").forEach(function(paragraph) {
            if (paragraph.textContent.includes("Jam Tracks Hub") && paragraph.textContent.includes("All rights reserved")) {
                paragraph.dataset.i18n = "footer.rights";
            }
        });
    }

    function applyTranslations(root) {
        if (!state.resources) {
            return;
        }

        state.isApplying = true;
        const scope = root || document;

        scope.querySelectorAll("[data-i18n]").forEach(function(element) {
            const value = translate(element.dataset.i18n, undefined, elementVariables(element));
            if (typeof value === "string") {
                element.textContent = value;
            }
        });

        scope.querySelectorAll("[data-i18n-placeholder]").forEach(function(element) {
            const value = translate(element.dataset.i18nPlaceholder, undefined, elementVariables(element));
            if (typeof value === "string") {
                element.setAttribute("placeholder", value);
            }
        });

        scope.querySelectorAll("[data-i18n-aria-label]").forEach(function(element) {
            const value = translate(element.dataset.i18nAriaLabel, undefined, elementVariables(element));
            if (typeof value === "string") {
                element.setAttribute("aria-label", value);
            }
        });

        scope.querySelectorAll("[data-i18n-content]").forEach(function(element) {
            const value = translate(element.dataset.i18nContent, undefined, elementVariables(element));
            if (typeof value === "string") {
                element.setAttribute("content", value);
            }
        });

        applyTrackTitles(scope);

        const titleKey = document.body?.dataset.i18nTitle;
        if (titleKey) {
            const title = translate(titleKey);
            if (typeof title === "string") {
                document.title = title;
            }
        }

        document.documentElement.lang = SUPPORTED_LANGUAGES[state.language].htmlLang;
        document.documentElement.dataset.language = state.language;
        document.documentElement.removeAttribute("data-i18n-loading");
        document.getElementById("i18n-loading-style")?.remove();
        window.requestAnimationFrame(function() {
            state.isApplying = false;
        });
    }

    function updateLanguageButtons() {
        document.querySelectorAll("[data-language-switch]").forEach(function(button) {
            const targetLanguage = state.language === "zh-TW" ? "en" : "zh-TW";
            const targetSettings = SUPPORTED_LANGUAGES[targetLanguage];
            const label = button.querySelector(".language-switch-label");

            button.dataset.languageTarget = targetLanguage;
            button.setAttribute("aria-label", targetSettings.switchAriaLabel);
            if (label) {
                label.textContent = targetSettings.switchLabel;
            }
        });
    }

    function createLanguageToggle() {
        const navLinks = document.querySelector(".nav-links");
        if (!navLinks || document.querySelector(".nav-language-item, .nav-language-toggle")) {
            return;
        }

        function createLanguageButton() {
            const languageButton = document.createElement("button");
            languageButton.className = "theme-toggle language-switch-button nav-language-toggle";
            languageButton.type = "button";
            languageButton.dataset.languageSwitch = "";
            languageButton.innerHTML = `<span class="language-switch-label" aria-hidden="true"></span>`;
            languageButton.addEventListener("click", function(event) {
                event.preventDefault();
                event.stopPropagation();
                setLanguage(languageButton.dataset.languageTarget);
            });
            return languageButton;
        }

        const themeItem = navLinks.querySelector(".nav-theme-item");
        if (themeItem) {
            const themeToggle = themeItem.querySelector(".nav-theme-toggle");
            themeItem.insertBefore(createLanguageButton(), themeToggle || null);
            return;
        }

        const languageItem = document.createElement("li");
        languageItem.className = "nav-language-item";
        languageItem.appendChild(createLanguageButton());

        navLinks.appendChild(languageItem);
    }

    function observeTranslatedMutations() {
        if (state.observer) {
            return;
        }

        state.observer = new MutationObserver(function(mutations) {
            if (state.isApplying) {
                return;
            }

            const shouldTranslate = mutations.some(function(mutation) {
                return Array.from(mutation.addedNodes).some(function(node) {
                    return node.nodeType === Node.ELEMENT_NODE && (
                        node.matches?.("[data-i18n], [data-i18n-placeholder], [data-i18n-aria-label], [data-i18n-content]")
                        || node.matches?.("[data-track-heading]")
                        || node.querySelector?.("[data-i18n], [data-i18n-placeholder], [data-i18n-aria-label], [data-i18n-content], [data-track-heading]")
                    );
                });
            });

            if (shouldTranslate) {
                annotateSharedNavigation();
                applyTranslations(document);
                updateLanguageButtons();
            }
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async function setLanguage(nextLanguage) {
        const language = normalizeLanguage(nextLanguage);
        state.language = language;
        saveLanguage(language);
        try {
            state.resources = await loadResources(language);
            annotateSharedNavigation();
            applyTranslations(document);
            updateLanguageButtons();
            window.dispatchEvent(new CustomEvent("jasper:language-change", {
                detail: {
                    language
                }
            }));
        } catch (error) {
            console.warn("Unable to load language resources.", error);
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        state.language = normalizeLanguage(preload.language || readSavedLanguage());
        createLanguageToggle();
        annotateSharedNavigation();
        setLanguage(state.language);
        observeTranslatedMutations();
    });

    window.addEventListener("resize", function() {
        window.requestAnimationFrame(updateTrackTitleWrapState);
    });

    window.JasperI18n = {
        setLanguage,
        getLanguage: function() {
            return state.language;
        },
        translate,
        trackTitleText,
        trackTitleMarkup
    };
})();
