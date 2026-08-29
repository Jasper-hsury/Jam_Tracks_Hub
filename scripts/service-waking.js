(function() {
    "use strict";

    const message = document.getElementById("wakeMessage");
    const retryButton = document.getElementById("retryWakeButton");
    if (!message || !retryButton) return;

    const apiBase = (
        window.JASPER_MUSIC_CONFIG?.apiBaseUrl ||
        window.KEY_FINDER_API_BASE ||
        window.location.origin
    ).replace(/\/$/, "");
    const HEALTH_TIMEOUT_MS = 8000;
    let attempts = 0;

    function t(key, fallback) {
        return window.JasperI18n?.translate?.(key, fallback) ?? fallback;
    }

    async function checkService() {
        attempts += 1;
        retryButton.disabled = true;
        message.textContent = t("pages.keyFinder.checkingApi", "Checking the analyzer...");
        const controller = new AbortController();
        const timeout = window.setTimeout(function() { controller.abort(); }, HEALTH_TIMEOUT_MS);

        try {
            const response = await fetch(`${apiBase}/api/health`, {
                cache: "no-store",
                signal: controller.signal
            });
            if (!response.ok) throw new Error("Service is still starting");
            message.textContent = t("pages.keyFinder.apiReady", "The analyzer is ready. Returning to Key Finder...");
            window.setTimeout(function() { window.location.href = "key-finder.html"; }, 700);
            return;
        } catch (error) {
            message.textContent = attempts < 6
                ? t("service.starting", "Still waking up. We will check again automatically.")
                : t("pages.keyFinder.unavailableCopy", "The analyzer is taking longer than expected. Please check again.");
            retryButton.disabled = false;
        } finally {
            window.clearTimeout(timeout);
        }

        if (attempts < 6) window.setTimeout(checkService, 4000);
    }

    retryButton.addEventListener("click", checkService);
    checkService();
})();
