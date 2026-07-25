(function() {
    const THEME_KEY = "jasperMusicTheme";
    const supportedThemes = new Set(["default", "light"]);
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem(THEME_KEY);
    } catch (error) {
        savedTheme = null;
    }

    const theme = supportedThemes.has(savedTheme) ? savedTheme : "default";

    if (savedTheme && !supportedThemes.has(savedTheme)) {
        try {
            localStorage.setItem(THEME_KEY, "default");
        } catch (error) {
            // The theme still works for this page when storage is unavailable.
        }
    }

    document.documentElement.dataset.theme = theme;
})();
