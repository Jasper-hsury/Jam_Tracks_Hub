document.addEventListener("DOMContentLoaded", function() {
    const HISTORY_KEY = "jasperMusicKeyFinderHistory";
    const apiBaseUrl = window.JASPER_MUSIC_CONFIG?.apiBaseUrl ?? "http://127.0.0.1:8000";
    const youtubeKeyUrl = document.getElementById("youtubeKeyUrl");
    const analyzeKeyButton = document.getElementById("analyzeKeyButton");
    const cancelAnalyzeButton = document.getElementById("cancelAnalyzeButton");
    const keyFinderResult = document.getElementById("keyFinderResult");
    const apiStatus = document.getElementById("apiStatus");
    const analysisHistory = document.getElementById("analysisHistory");
    const analysisHistoryList = document.getElementById("analysisHistoryList");
    const clearHistoryButton = document.getElementById("clearHistoryButton");

    let activeController = null;
    let loadingTimer = null;

    if (!youtubeKeyUrl || !analyzeKeyButton || !keyFinderResult) {
        return;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function apiUrl(path) {
        return `${apiBaseUrl.replace(/\/$/, "")}${path}`;
    }

    function apiDisplayUrl() {
        return apiBaseUrl || `${window.location.origin}/api`;
    }

    function apiOfflineHint() {
        if (apiBaseUrl) {
            return `Cannot connect to the Key Finder API at ${apiBaseUrl}. Start it with: powershell -ExecutionPolicy Bypass -File ".\\start_render_local.ps1"`;
        }

        return "Cannot connect to the Key Finder API through this site. Check the Render service status and make sure the Python API is awake.";
    }

    function readHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function saveHistory(items) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 5)));
    }

    function renderHistory() {
        const items = readHistory();

        if (!analysisHistory || !analysisHistoryList) {
            return;
        }

        analysisHistory.hidden = items.length === 0;
        analysisHistoryList.innerHTML = items.map(function(item) {
            const confidence = item.confidence === null || item.confidence === undefined
                ? "Rule estimate"
                : `${Number(item.confidence).toFixed(1)}%`;

            return `
                <li>
                    <div>
                        <strong>${escapeHtml(item.finalKey)}</strong>
                        <span>${escapeHtml(confidence)} · ${escapeHtml(item.time)}</span>
                    </div>
                    <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
                </li>
            `;
        }).join("");
    }

    function addHistoryItem(url, data) {
        const item = {
            url,
            finalKey: data.final_key,
            ruleKey: data.rule_key,
            confidence: data.confidence,
            source: data.source,
            modelVersion: data.model_version,
            time: new Date().toLocaleString()
        };

        saveHistory([item, ...readHistory()]);
        renderHistory();
    }

    function setApiStatus(state, message) {
        if (!apiStatus) {
            return;
        }

        apiStatus.className = `api-status ${state}`;
        apiStatus.querySelector(".status-text").textContent = message;
    }

    function renderPossibleKeys(possibleKeys) {
        if (!possibleKeys || possibleKeys.length === 0) {
            return "";
        }

        const items = possibleKeys.slice(0, 4).map(function(candidate) {
            const score = Number(candidate.relative_score || 0).toFixed(1);
            return `
                <li>
                    <span>${escapeHtml(candidate.key)}</span>
                    <strong>${score}%</strong>
                </li>
            `;
        }).join("");

        return `
            <div class="key-finder-candidates">
                <p>Other possible keys <span>relative to final key</span></p>
                <ul>${items}</ul>
            </div>
        `;
    }

    function renderKeyFinderResult(data) {
        const confidence = data.confidence === null || data.confidence === undefined
            ? null
            : Math.max(0, Math.min(100, Number(data.confidence)));

        const confidenceLabel = confidence === null ? "Rule estimate" : `${confidence.toFixed(1)}%`;
        const confidenceWidth = confidence === null ? 0 : confidence;
        const notes = data.main_notes && data.main_notes.length > 0
            ? data.main_notes.map(escapeHtml).join(", ")
            : "No clear notes";

        keyFinderResult.classList.remove("key-finder-empty", "is-loading", "is-error");
        keyFinderResult.innerHTML = `
            <div class="result-summary">
                <span class="result-kicker">Final key</span>
                <strong class="key-finder-final">${escapeHtml(data.final_key)}</strong>
                <span class="result-source">${escapeHtml(data.source || "analysis")}</span>
            </div>

            <div class="confidence-row">
                <div class="confidence-label">
                    <span>Confidence</span>
                    <strong>${confidenceLabel}</strong>
                </div>
                <div class="confidence-bar" aria-hidden="true">
                    <span style="width: ${confidenceWidth}%"></span>
                </div>
            </div>

            <div class="result-details">
                <p><span>Rule-based</span>${escapeHtml(data.rule_key || "Not available")}</p>
                <p><span>Model version</span>${escapeHtml(data.model_version || "Not available")}</p>
                <p><span>Main notes</span>${notes}</p>
            </div>

            ${renderPossibleKeys(data.possible_keys)}
        `;
    }

    function setStatus(message, className) {
        keyFinderResult.className = `key-finder-result ${className || ""}`.trim();
        keyFinderResult.innerHTML = `<span>${escapeHtml(message)}</span>`;
    }

    function renderErrorReport(message) {
        const lowerMessage = String(message || "").toLowerCase();
        let suggestedFix = apiBaseUrl
            ? 'Run <code>powershell -ExecutionPolicy Bypass -File ".\\start_render_local.ps1"</code> and open <code>http://127.0.0.1:8000/chords.html</code>.'
            : "The API is reachable, but the YouTube analysis failed. Check the Render service logs; this is usually a yt-dlp / YouTube extraction issue.";

        if (!apiBaseUrl && (lowerMessage.includes("not a bot") || lowerMessage.includes("cookies"))) {
            suggestedFix = 'YouTube is blocking Render as a bot. Add <code>youtube_cookies.txt</code> as a Render Secret File, then redeploy.';
        }

        keyFinderResult.className = "key-finder-result is-error";
        keyFinderResult.innerHTML = `
            <div class="error-report">
                <strong>Analysis failed</strong>
                <p>${escapeHtml(message)}</p>
                <dl>
                    <div>
                        <dt>API URL</dt>
                        <dd>${escapeHtml(apiDisplayUrl())}</dd>
                    </div>
                    <div>
                        <dt>Status</dt>
                        <dd>${apiStatus?.querySelector(".status-text")?.textContent || "Unknown"}</dd>
                    </div>
                    <div>
                        <dt>Suggested fix</dt>
                        <dd>${suggestedFix}</dd>
                    </div>
                </dl>
            </div>
        `;
    }

    function startLoadingMessages() {
        const messages = [
            "Preparing request...",
            "Downloading audio...",
            "Extracting musical features...",
            "Comparing rule-based and ML results...",
            "Building final answer..."
        ];
        let index = 0;

        setStatus(messages[index], "is-loading");

        return window.setInterval(function() {
            index = Math.min(index + 1, messages.length - 1);
            setStatus(messages[index], "is-loading");
        }, 2200);
    }

    function setAnalyzingState(isAnalyzing) {
        analyzeKeyButton.disabled = isAnalyzing;
        if (cancelAnalyzeButton) {
            cancelAnalyzeButton.hidden = !isAnalyzing;
        }
    }

    async function ensureApiIsReachable(signal) {
        try {
            const response = await fetch(apiUrl("/api/health"), {
                method: "GET",
                cache: "no-store",
                signal
            });

            if (!response.ok) {
                throw new Error(`API health check returned ${response.status}.`);
            }

            setApiStatus("is-online", "API connected");
        } catch (error) {
            if (error.name === "AbortError") {
                throw error;
            }

            setApiStatus("is-offline", "API offline");
            throw new Error(apiOfflineHint());
        }
    }

    async function checkApiStatus() {
        try {
            setApiStatus("is-checking", "Checking API...");
            await ensureApiIsReachable();
        } catch (error) {
            setApiStatus("is-offline", "API offline");
        }
    }

    function stopLoading() {
        if (loadingTimer) {
            window.clearInterval(loadingTimer);
            loadingTimer = null;
        }
    }

    cancelAnalyzeButton?.addEventListener("click", function() {
        if (activeController) {
            activeController.abort();
        }
    });

    clearHistoryButton?.addEventListener("click", function() {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    });

    analyzeKeyButton.addEventListener("click", async function() {
        const url = youtubeKeyUrl.value.trim();

        if (!url) {
            setStatus("Please paste a YouTube link.", "is-error");
            return;
        }

        activeController = new AbortController();
        setAnalyzingState(true);
        loadingTimer = startLoadingMessages();

        try {
            await ensureApiIsReachable(activeController.signal);

            const response = await fetch(apiUrl("/api/analyze"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url }),
                signal: activeController.signal
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `Analysis failed with status ${response.status}.`);
            }

            renderKeyFinderResult(data);
            addHistoryItem(url, data);
        } catch (error) {
            if (error.name === "AbortError") {
                setStatus("Analysis canceled.", "is-error");
            } else {
                renderErrorReport(error.message || "Make sure the Python API is running.");
            }
        } finally {
            stopLoading();
            activeController = null;
            setAnalyzingState(false);
        }
    });

    renderHistory();
    checkApiStatus();
});
