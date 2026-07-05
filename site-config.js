(function() {
    const savedApiBaseUrl = localStorage.getItem("jasperMusicApiBaseUrl");
    const localHosts = ["localhost", "127.0.0.1", ""];
    const isLocalSite = localHosts.includes(window.location.hostname);
    const isSavedLocalApi = (function() {
        if (!savedApiBaseUrl) {
            return false;
        }

        try {
            return localHosts.includes(new URL(savedApiBaseUrl).hostname);
        } catch (error) {
            return true;
        }
    })();
    const apiBaseUrl = savedApiBaseUrl && (isLocalSite || !isSavedLocalApi)
        ? savedApiBaseUrl
        : (isLocalSite ? "http://127.0.0.1:8000" : "");

    if (savedApiBaseUrl && !isLocalSite && isSavedLocalApi) {
        localStorage.removeItem("jasperMusicApiBaseUrl");
    }

    window.JASPER_MUSIC_CONFIG = {
        apiBaseUrl,
        youtubeHelperBaseUrl: "http://127.0.0.1:8765"
    };
})();
