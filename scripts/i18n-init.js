(function() {
    const LANGUAGE_KEY = "jasperMusicLanguage";
    const DEFAULT_LANGUAGE = "en";
    const SUPPORTED_LANGUAGES = {
        en: { htmlLang: "en" },
        "zh-TW": { htmlLang: "zh-TW" }
    };
    const TITLE_KEYS_BY_PAGE = {
        "": "titles.home",
        "index.html": "titles.home",
        "tracks.html": "titles.tracks",
        "chord-dictionary.html": "titles.chordDictionary",
        "scale.html": "titles.scaleExplorer",
        "key-finder.html": "titles.keyFinder",
        "chord-progressions.html": "titles.chordProgressions",
        "song-workspace.html": "titles.songWorkspace",
        "feedback.html": "titles.feedback",
        "progression-writer.html": "titles.progressionWriter",
        "fretboard-trainer.html": "titles.fretboardTrainer",
        "privacy-policy.html": "titles.privacy",
        "legal.html": "titles.legal",
        "404.html": "titles.notFound",
        "service-waking.html": "service.wakingAnalyzer"
    };

    function normalizeLanguage(language) {
        return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, language) ? language : DEFAULT_LANGUAGE;
    }

    function readStoredLanguage() {
        try {
            const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
            return storedLanguage ? normalizeLanguage(storedLanguage) : "";
        } catch (error) {
            return "";
        }
    }

    function languageFromBrowser() {
        const browserLanguages = Array.from(navigator.languages || [navigator.language || ""]);
        const hasTraditionalChinese = browserLanguages.some(language =>
            /^zh-(tw|hk|mo|hant)/i.test(language)
        );
        const hasChinese = browserLanguages.some(language => /^zh/i.test(language));

        return hasTraditionalChinese || hasChinese ? "zh-TW" : "";
    }

    function getNestedValue(source, path) {
        return path.split(".").reduce(function(value, segment) {
            if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
                return value[segment];
            }
            return undefined;
        }, source);
    }

    function syncLoadJson(path) {
        try {
            const request = new XMLHttpRequest();
            request.open("GET", path, false);
            request.send(null);
            if (request.status >= 200 && request.status < 300) {
                return JSON.parse(request.responseText);
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    const savedLanguage = readStoredLanguage();
    const pageLocale = document.documentElement.dataset.locale || "";
    const pageLanguage = pageLocale ? normalizeLanguage(pageLocale) : "";
    const initialLanguage = normalizeLanguage(savedLanguage || pageLanguage || languageFromBrowser() || DEFAULT_LANGUAGE);
    const resources = {};

    document.documentElement.lang = SUPPORTED_LANGUAGES[initialLanguage].htmlLang;
    document.documentElement.dataset.language = initialLanguage;

    if (initialLanguage !== DEFAULT_LANGUAGE) {
        const loadingStyle = document.createElement("style");
        loadingStyle.id = "i18n-loading-style";
        loadingStyle.textContent = [
            'html[data-i18n-loading="true"] [data-i18n]',
            'html[data-i18n-loading="true"] [data-i18n-placeholder]',
            'html[data-i18n-loading="true"] [data-i18n-aria-label]',
            'html[data-i18n-loading="true"] [data-i18n-content]',
            'html[data-i18n-loading="true"] [data-track-heading]',
            'html[data-i18n-loading="true"] .nav-links a[href]',
            'html[data-i18n-loading="true"] .nav-compact-tools summary span',
            'html[data-i18n-loading="true"] .theme-toggle-label',
            'html[data-i18n-loading="true"] .footer > p'
        ].join(",") + "{visibility:hidden;}";
        document.head.appendChild(loadingStyle);
        document.documentElement.dataset.i18nLoading = "true";
        resources.fallback = syncLoadJson("/locales/en/common.json") || {};
        resources.selected = syncLoadJson(`/locales/${initialLanguage}/common.json`) || {};
    }

    const titleKey = TITLE_KEYS_BY_PAGE[(window.location.pathname.split("/").pop() || "index.html")];
    const title = titleKey && (getNestedValue(resources.selected || {}, titleKey) || getNestedValue(resources.fallback || {}, titleKey));
    if (typeof title === "string") {
        document.title = title;
    }

    window.JasperI18nPreload = {
        language: initialLanguage,
        resources
    };
})();
