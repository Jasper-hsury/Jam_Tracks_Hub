(function() {
    const savedApiBaseUrl = localStorage.getItem("jasperMusicApiBaseUrl");
    const localHosts = ["localhost", "127.0.0.1", ""];
    const isLocalSite = localHosts.includes(window.location.hostname);
    const productionApiBaseUrl = "https://api.jamtrackshub.com";
    const apiServiceHosts = ["api.jamtrackshub.com"];
    const isApiServiceHost = apiServiceHosts.includes(window.location.hostname);
    const apiBaseUrl = isLocalSite
        ? (savedApiBaseUrl || "http://127.0.0.1:8000")
        : (isApiServiceHost ? "" : productionApiBaseUrl);

    if (savedApiBaseUrl && !isLocalSite) {
        localStorage.removeItem("jasperMusicApiBaseUrl");
    }

    window.JASPER_MUSIC_CONFIG = {
        apiBaseUrl,
        productionApiBaseUrl,
        youtubeHelperBaseUrl: "http://localhost:8765"
    };
})();
