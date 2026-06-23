document.addEventListener("DOMContentLoaded", function() {
    const HISTORY_KEY = "jasperMusicKeyFinderHistory";
    const apiBaseUrl = window.JASPER_MUSIC_CONFIG?.apiBaseUrl ?? "http://127.0.0.1:8000";
    const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
    const MAX_CONTAINER_UPLOAD_BYTES = 25 * 1024 * 1024;
    const HEAVY_CONTAINER_EXTENSIONS = new Set([".mp4", ".webm"]);
    const API_RETRY_DELAY_MS = 2000;
    const API_RETRY_LIMIT = 30;
    const audioKeyFile = document.getElementById("audioKeyFile");
    const analyzeFileButton = document.getElementById("analyzeFileButton");
    const audioFileName = document.getElementById("audioFileName");
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
    let apiRetryTimer = null;
    let apiRetryCount = 0;

    if (!keyFinderResult || (!audioKeyFile && !youtubeKeyUrl)) {
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

    function getFileExtension(fileName) {
        const dotIndex = fileName.lastIndexOf(".");
        return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
    }

    async function readApiResponse(response) {
        const text = await response.text();
        let data = null;

        if (text.trim()) {
            try {
                data = JSON.parse(text);
            } catch (error) {
                throw new Error(
                    `API returned ${response.status} ${response.statusText || "response"} instead of JSON. ` +
                    "This usually means Render timed out or restarted while analyzing the file."
                );
            }
        }

        if (!response.ok) {
            if (!data && [502, 503, 504].includes(response.status)) {
                throw new Error(
                    `Render returned ${response.status}. The audio analysis worker likely timed out or restarted.`
                );
            }

            throw new Error(data?.detail || `Analysis failed with status ${response.status}.`);
        }

        if (!data) {
            throw new Error(
                "The API returned an empty response. Render probably timed out during analysis. " +
                "Try exporting the song as a shorter MP3 or WAV file."
            );
        }

        return data;
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
            const reference = item.reference || item.url || "Uploaded audio";
            const isLink = item.inputType !== "file" && /^https?:\/\//.test(reference);
            const referenceMarkup = isLink
                ? `<a href="${escapeHtml(reference)}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference)}</a>`
                : `<span>${escapeHtml(reference)}</span>`;

            return `
                <li>
                    <div>
                        <strong>${escapeHtml(item.finalKey)}</strong>
                        <span>${escapeHtml(confidence)} · ${escapeHtml(item.time)}</span>
                    </div>
                    ${referenceMarkup}
                </li>
            `;
        }).join("");
    }

    function addHistoryItem(reference, data, inputType) {
        const item = {
            reference,
            url: reference,
            inputType,
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
            const reference = item.reference || item.url || "Uploaded audio";
            const hasDetails = Boolean(item.analysisData);
            const detailsLabel = hasDetails ? "Click to view full details" : "Summary only - re-analyze to save details";

            return `
                <li>
                    <button class="history-item-button" type="button" data-history-id="${escapeHtml(item.id || "")}" ${hasDetails ? "" : "disabled"}>
                        <div>
                            <strong>${escapeHtml(item.finalKey)}</strong>
                            <span>${escapeHtml(confidence)} - ${escapeHtml(item.time)}</span>
                        </div>
                        <span>${escapeHtml(reference)}</span>
                        <em>${escapeHtml(detailsLabel)}</em>
                    </button>
                </li>
            `;
        }).join("");
    }

    function addHistoryItem(reference, data, inputType) {
        const item = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            reference,
            url: reference,
            inputType,
            finalKey: data.final_key,
            ruleKey: data.rule_key,
            confidence: data.confidence,
            confidenceLabel: data.confidence_label,
            source: data.source,
            modelVersion: data.model_version,
            analysisData: data,
            time: new Date().toLocaleString()
        };

        saveHistory([item, ...readHistory()]);
        renderHistory();
    }

    function restoreLatestDetailedResult() {
        const historyItems = readHistory();
        const latestDetailedItem = historyItems.find(function(item) {
            return item.analysisData;
        });

        if (latestDetailedItem) {
            renderKeyFinderResult(latestDetailedItem.analysisData);
        } else if (historyItems.length > 0) {
            setStatus("Saved history is summary-only. Analyze an audio file again to save and show the full confidence details.", "key-finder-empty");
        }
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

    function formatPercent(value, fallback) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return fallback || "Not available";
        }

        return `${Number(value).toFixed(1)}%`;
    }

    function renderEvidencePills(data) {
        const items = [
            {
                label: "ML confidence",
                value: formatPercent(data.ml_confidence, "Not used")
            },
            {
                label: "Rule strength",
                value: formatPercent(data.rule_confidence)
            },
            {
                label: "Top gap",
                value: formatPercent(data.rule_gap)
            },
            {
                label: "Keyboard/Bass gap",
                value: formatPercent(data.priority_gap)
            }
        ];

        return `
            <div class="result-evidence-grid">
                ${items.map(function(item) {
                    return `
                        <div>
                            <span>${escapeHtml(item.label)}</span>
                            <strong>${escapeHtml(item.value)}</strong>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderRankingBlock(title, items, keyName, maxItems) {
        if (!items || items.length === 0) {
            return "";
        }

        const list = items.slice(0, maxItems || 5).map(function(item, index) {
            const label = item[keyName];
            const score = formatPercent(item.relative_score);

            return `
                <li>
                    <span>${index + 1}. ${escapeHtml(label)}</span>
                    <strong>${escapeHtml(score)}</strong>
                </li>
            `;
        }).join("");

        return `
            <div class="result-ranking-block">
                <h4>${escapeHtml(title)}</h4>
                <ul>${list}</ul>
            </div>
        `;
    }

    function renderStrongestNotes(notes) {
        if (!notes || notes.length === 0) {
            return "";
        }

        const items = notes.slice(0, 7).map(function(item) {
            return `
                <li>
                    <span>${escapeHtml(item.note)}</span>
                    <strong>${formatPercent(item.strength)}</strong>
                </li>
            `;
        }).join("");

        return `
            <div class="result-ranking-block">
                <h4>Strongest notes</h4>
                <ul>${items}</ul>
            </div>
        `;
    }

    function renderMlDetails(details) {
        if (!details) {
            return "";
        }

        const family = details.family;
        const mode = details.mode;
        const key = details.key;

        return `
            <div class="result-details result-details-secondary">
                <p><span>ML direct key</span>${escapeHtml(key?.prediction || "Not available")} ${key?.confidence !== null && key?.confidence !== undefined ? `(${formatPercent(key.confidence)})` : ""}</p>
                <p><span>ML family</span>${escapeHtml(family?.prediction || "Not available")} ${family?.confidence !== null && family?.confidence !== undefined ? `(${formatPercent(family.confidence)})` : ""}</p>
                <p><span>ML mode</span>${escapeHtml(mode?.prediction || "Not available")} ${mode?.confidence !== null && mode?.confidence !== undefined ? `(${formatPercent(mode.confidence)})` : ""}</p>
                <p><span>ML basis</span>${escapeHtml(details.basis || "Not available")}</p>
            </div>
        `;
    }

    function renderKeyFinderResult(data) {
        const confidence = data.confidence === null || data.confidence === undefined
            ? null
            : Math.max(0, Math.min(100, Number(data.confidence)));

        const confidenceLabel = confidence === null ? "Rule estimate" : `${confidence.toFixed(1)}%`;
        const confidenceWidth = confidence === null ? 0 : confidence;
        const confidenceType = data.confidence_label || "Confidence";
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
                    <span>${escapeHtml(confidenceType)}</span>
                    <strong>${confidenceLabel}</strong>
                </div>
                <div class="confidence-bar" aria-hidden="true">
                    <span style="width: ${confidenceWidth}%"></span>
                </div>
            </div>

            <div class="result-details">
                <p><span>Input</span>${escapeHtml(data.input_type === "file" ? "Uploaded audio" : "YouTube link")}</p>
                <p><span>Key family</span>${escapeHtml(data.key_family || "Not available")}</p>
                <p><span>Rule-based</span>${escapeHtml(data.rule_key || "Not available")}</p>
                <p><span>Keyboard/Bass</span>${escapeHtml(data.priority_key || "Not available")}</p>
                <p><span>Model version</span>${escapeHtml(data.model_version || "Not available")}</p>
                <p><span>Main notes</span>${notes}</p>
            </div>

            ${renderEvidencePills(data)}
            ${renderMlDetails(data.ml_details)}
            ${renderPossibleKeys(data.possible_keys)}
            <div class="result-ranking-grid">
                ${renderRankingBlock("Overall ranking", data.overall_ranking, "key")}
                ${renderRankingBlock("Keyboard/Bass priority", data.priority_ranking, "key")}
                ${renderRankingBlock("Key family ranking", data.family_ranking, "family")}
                ${renderStrongestNotes(data.strongest_notes)}
            </div>

            <div class="result-analysis-notes">
                <p><span>Conflict resolution</span>${escapeHtml(data.conflict_resolution || "Not available")}</p>
                <p><span>Mode resolution</span>${escapeHtml(data.mode_resolution || "Not available")}</p>
            </div>
        `;
    }

    function setStatus(message, className) {
        keyFinderResult.className = `key-finder-result ${className || ""}`.trim();
        keyFinderResult.innerHTML = `<span>${escapeHtml(message)}</span>`;
    }

    function renderErrorReport(message, inputType) {
        const lowerMessage = String(message || "").toLowerCase();
        let suggestedFix = apiBaseUrl
            ? 'Run <code>powershell -ExecutionPolicy Bypass -File ".\\start_render_local.ps1"</code> and open <code>http://127.0.0.1:8000/chords.html</code>.'
            : "The API is reachable, but the YouTube analysis failed. Check the Render service logs; this is usually a yt-dlp / YouTube extraction issue.";

        if (inputType === "file") {
            suggestedFix = "For Render, MP3 or WAV is the most stable. If you uploaded MP4/WEBM, export the audio as MP3, WAV, M4A, or FLAC under 25 MB and try again.";
        }

        if (
            inputType === "file"
            && (
                lowerMessage.includes("timed out")
                || lowerMessage.includes("empty response")
                || lowerMessage.includes("instead of json")
                || lowerMessage.includes("restarted")
                || lowerMessage.includes("render returned")
            )
        ) {
            suggestedFix = "Render likely timed out during audio decoding. Export the song as an audio-only MP3 or WAV under 25 MB, then upload that file.";
        }

        if (!apiBaseUrl && (lowerMessage.includes("not a bot") || lowerMessage.includes("cookies"))) {
            suggestedFix = "YouTube is blocking Render as a bot. Upload an audio file instead, or run YouTube-link analysis locally.";
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

    function startLoadingMessages(inputType) {
        const messages = inputType === "file"
            ? [
                "Uploading audio file...",
                "Reading the audio...",
                "Extracting musical features...",
                "Comparing rule-based and ML results...",
                "Building final answer..."
            ]
            : [
                "Preparing request...",
                "Trying YouTube link...",
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
        if (analyzeFileButton) {
            analyzeFileButton.disabled = isAnalyzing;
        }

        if (analyzeKeyButton) {
            analyzeKeyButton.disabled = isAnalyzing;
        }

        if (audioKeyFile) {
            audioKeyFile.disabled = isAnalyzing;
        }

        if (youtubeKeyUrl) {
            youtubeKeyUrl.disabled = isAnalyzing;
        }

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
            apiRetryCount = 0;

            if (apiRetryTimer) {
                window.clearTimeout(apiRetryTimer);
                apiRetryTimer = null;
            }
        } catch (error) {
            if (apiRetryCount < API_RETRY_LIMIT) {
                apiRetryCount += 1;
                setApiStatus("is-checking", "API starting...");
                apiRetryTimer = window.setTimeout(checkApiStatus, API_RETRY_DELAY_MS);
            } else {
                setApiStatus("is-offline", "API offline");
            }
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
        setStatus("Ready when you are.", "key-finder-empty");
    });

    analysisHistoryList?.addEventListener("click", function(event) {
        const button = event.target.closest(".history-item-button");
        if (!button || button.disabled) {
            return;
        }

        const item = readHistory().find(function(historyItem) {
            return historyItem.id === button.dataset.historyId;
        });

        if (item?.analysisData) {
            renderKeyFinderResult(item.analysisData);
            keyFinderResult.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    });

    audioKeyFile?.addEventListener("change", function() {
        const file = audioKeyFile.files && audioKeyFile.files[0];

        if (audioFileName) {
            audioFileName.textContent = file ? file.name : "Choose an audio file";
        }
    });

    analyzeFileButton?.addEventListener("click", async function() {
        const file = audioKeyFile?.files && audioKeyFile.files[0];

        if (!file) {
            setStatus("Please choose an audio file.", "is-error");
            return;
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            setStatus("Please upload a file under 60 MB.", "is-error");
            return;
        }

        const extension = getFileExtension(file.name);
        if (HEAVY_CONTAINER_EXTENSIONS.has(extension) && file.size > MAX_CONTAINER_UPLOAD_BYTES) {
            setStatus("MP4/WEBM files are heavy on Render. Please export this as MP3 or WAV under 25 MB.", "is-error");
            return;
        }

        activeController = new AbortController();
        setAnalyzingState(true);
        loadingTimer = startLoadingMessages("file");

        try {
            await ensureApiIsReachable(activeController.signal);

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(apiUrl("/api/analyze-file"), {
                method: "POST",
                body: formData,
                signal: activeController.signal
            });

            const data = await readApiResponse(response);

            renderKeyFinderResult(data);
            addHistoryItem(file.name, data, "file");
        } catch (error) {
            if (error.name === "AbortError") {
                setStatus("Analysis canceled.", "is-error");
            } else {
                renderErrorReport(error.message || "Make sure the Python API is running.", "file");
            }
        } finally {
            stopLoading();
            activeController = null;
            setAnalyzingState(false);
        }
    });

    analyzeKeyButton?.addEventListener("click", async function() {
        const url = youtubeKeyUrl.value.trim();

        if (!url) {
            setStatus("Please paste a YouTube link.", "is-error");
            return;
        }

        activeController = new AbortController();
        setAnalyzingState(true);
        loadingTimer = startLoadingMessages("youtube");

        try {
            await ensureApiIsReachable(activeController.signal);

            const response = await fetch(apiUrl("/api/analyze"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url }),
                signal: activeController.signal
            });

            const data = await readApiResponse(response);

            renderKeyFinderResult(data);
            addHistoryItem(url, data, "youtube");
        } catch (error) {
            if (error.name === "AbortError") {
                setStatus("Analysis canceled.", "is-error");
            } else {
                renderErrorReport(error.message || "Make sure the Python API is running.", "youtube");
            }
        } finally {
            stopLoading();
            activeController = null;
            setAnalyzingState(false);
        }
    });

    renderHistory();
    restoreLatestDetailedResult();
    checkApiStatus();
});
