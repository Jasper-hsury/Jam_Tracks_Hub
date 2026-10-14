(function() {
    const THEME_KEY = "jasperMusicTheme";
    // "light" is the v3 paper theme and the default for new visitors.
    // "default" stays the stored value for the dark ink theme, so visitors
    // who explicitly switched to dark keep their choice.
    const PAPER_THEME = "light";
    const supportedThemes = new Set(["default", "light"]);
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem(THEME_KEY);
    } catch (error) {
        savedTheme = null;
    }

    const theme = supportedThemes.has(savedTheme) ? savedTheme : PAPER_THEME;

    if (savedTheme && !supportedThemes.has(savedTheme)) {
        try {
            localStorage.setItem(THEME_KEY, PAPER_THEME);
        } catch (error) {
            // The theme still works for this page when storage is unavailable.
        }
    }

    document.documentElement.dataset.theme = theme;
})();
