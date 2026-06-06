(function() {
    const savedApiBaseUrl = localStorage.getItem("jasperMusicApiBaseUrl");
    const localHosts = ["localhost", "127.0.0.1", ""];
    const isLocalSite = localHosts.includes(window.location.hostname);

    window.JASPER_MUSIC_CONFIG = {
        apiBaseUrl: savedApiBaseUrl || (isLocalSite ? "http://127.0.0.1:8000" : "")
    };
})();
