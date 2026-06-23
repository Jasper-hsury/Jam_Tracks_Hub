document.addEventListener("DOMContentLoaded", function() {
    const HISTORY_KEY = "jasperMusicKeyFinderHistory";
    const RESULT_MODE_KEY = "jasperMusicKeyFinderResultMode";
    const apiBaseUrl = window.JASPER_MUSIC_CONFIG?.apiBaseUrl ?? "http://127.0.0.1:8000";
    const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
    const MAX_CONTAINER_UPLOAD_BYTES = 25 * 1024 * 1024;
    const HEAVY_CONTAINER_EXTENSIONS = new Set([".mp4", ".webm"]);
    const API_RETRY_DELAY_MS = 2000;
    const API_RETRY_LIMIT = 30;
    const JOB_POLL_DELAY_MS = 1200;

    const audioKeyFile = document.getElementById("audioKeyFile");
    const analyzeFileButton = document.getElementById("analyzeFileButton");
    const audioFileName = document.getElementById("audioFileName");
    const youtubeKeyUrl = document.getElementById("youtubeKeyUrl");
    const analyzeKeyButton = document.getElementById("analyzeKeyButton");
    const cancelAnalyzeButton = document.getElementById("cancelAnalyzeButton");
    const keyFinderResult = document.getElementById("keyFinderResult");
    const apiStatus = document.getElementById("apiStatus");
    const serviceWakePanel = document.getElementById("serviceWakePanel");
    const serviceWakeTitle = document.getElementById("serviceWakeTitle");
    const serviceWakeCopy = document.getElementById("serviceWakeCopy");
    const analysisHistory = document.getElementById("analysisHistory");
    const analysisHistoryList = document.getElementById("analysisHistoryList");
    const clearHistoryButton = document.getElementById("clearHistoryButton");
    const resultModeButtons = document.querySelectorAll(".result-mode-button");

    let activeController = null;
    let apiRetryTimer = null;
    let apiRetryCount = 0;
    let currentResultData = null;
    let currentResultMode = localStorage.getItem(RESULT_MODE_KEY) || "quick";

    if (!keyFinderResult || (!audioKeyFile && !youtubeKeyUrl)) {
        return;
    }

    function escapeHtml(value) {
        return String(value ?? "")
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

    function normalizeKeyForUrl(keyName) {
        return String(keyName || "").replace(/\s+(major|minor)$/i, function(match) {
            return match.toLowerCase();
        });
    }

    function wait(milliseconds, signal) {
        return new Promise(function(resolve, reject) {
            const timer = window.setTimeout(resolve, milliseconds);

            signal?.addEventListener("abort", function() {
                window.clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            }, { once: true });
        });
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
                    "The service may have restarted while processing the request."
                );
            }
        }

        if (!response.ok) {
            if (!data && [502, 503, 504].includes(response.status)) {
                throw new Error(
                    `Render returned ${response.status}. The analyzer likely timed out or restarted.`
                );
            }

            throw new Error(data?.detail || `Analysis failed with status ${response.status}.`);
        }

        if (!data) {
            throw new Error("The API returned an empty response.");
        }

        return data;
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

    function addHistoryItem(reference, data, inputType) {
        const item = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            reference,
            inputType,
            finalKey: data.final_key,
            confidence: data.confidence,
            certainty: data.certainty,
            source: data.source,
            modelVersion: data.model_version,
            analysisData: data,
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
            const hasDetails = Boolean(item.analysisData);

            return `
                <li>
                    <button class="history-item-button" type="button"
                        data-history-id="${escapeHtml(item.id || "")}" ${hasDetails ? "" : "disabled"}>
                        <div>
                            <strong>${escapeHtml(item.finalKey)}</strong>
                            <span>${escapeHtml(confidence)} - ${escapeHtml(item.time)}</span>
                        </div>
                        <span>${escapeHtml(item.reference || "Uploaded audio")}</span>
                        <em>${hasDetails ? "View full result" : "Re-analyze to save details"}</em>
                    </button>
                </li>
            `;
        }).join("");
    }

    function formatPercent(value, fallback) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return fallback || "Not available";
        }

        return `${Number(value).toFixed(1)}%`;
    }

    function renderPossibleKeys(possibleKeys) {
        if (!possibleKeys?.length) {
            return "";
        }

        return `
            <div class="key-finder-candidates">
                <p>Other possible keys <span>relative to final key</span></p>
                <ul>
                    ${possibleKeys.slice(0, 4).map(function(candidate) {
                        return `
                            <li>
                                <span>${escapeHtml(candidate.key)}</span>
                                <strong>${formatPercent(candidate.relative_score)}</strong>
                            </li>
                        `;
                    }).join("")}
                </ul>
            </div>
        `;
    }

    function renderEvidence(data) {
        const items = [
            ["ML confidence", formatPercent(data.ml_confidence, "Not used")],
            ["Rule strength", formatPercent(data.rule_confidence)],
            ["Top gap", formatPercent(data.rule_gap)],
            ["Keyboard/Bass gap", formatPercent(data.priority_gap)]
        ];

        return `
            <div class="result-evidence-grid result-detail-section">
                ${items.map(function(item) {
                    return `
                        <div>
                            <span>${escapeHtml(item[0])}</span>
                            <strong>${escapeHtml(item[1])}</strong>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderRankingBlock(title, items, propertyName) {
        if (!items?.length) {
            return "";
        }

        return `
            <div class="result-ranking-block">
                <h4>${escapeHtml(title)}</h4>
                <ul>
                    ${items.slice(0, 5).map(function(item, index) {
                        return `
                            <li>
                                <span>${index + 1}. ${escapeHtml(item[propertyName])}</span>
                                <strong>${formatPercent(item.relative_score)}</strong>
                            </li>
                        `;
                    }).join("")}
                </ul>
            </div>
        `;
    }

    function renderStrongestNotes(notes) {
        if (!notes?.length) {
            return "";
        }

        return `
            <div class="result-ranking-block">
                <h4>Strongest notes</h4>
                <ul>
                    ${notes.slice(0, 7).map(function(item) {
                        return `
                            <li>
                                <span>${escapeHtml(item.note)}</span>
                                <strong>${formatPercent(item.strength)}</strong>
                            </li>
                        `;
                    }).join("")}
                </ul>
            </div>
        `;
    }

    function renderMlDetails(details) {
        if (!details) {
            return "";
        }

        const rows = [
            ["ML direct key", details.key],
            ["ML family", details.family],
            ["ML mode", details.mode]
        ];

        return `
            <div class="result-details result-details-secondary result-detail-section">
                ${rows.map(function(row) {
                    const prediction = row[1];
                    const suffix = prediction?.confidence !== null && prediction?.confidence !== undefined
                        ? ` (${formatPercent(prediction.confidence)})`
                        : "";
                    return `<p><span>${escapeHtml(row[0])}</span>${escapeHtml(prediction?.prediction || "Not available")}${escapeHtml(suffix)}</p>`;
                }).join("")}
                <p><span>ML basis</span>${escapeHtml(details.basis || "Not available")}</p>
            </div>
        `;
    }

    function renderResultActions(data) {
        const key = encodeURIComponent(normalizeKeyForUrl(data.final_key));

        return `
            <div class="result-actions">
                <a class="primary-button" href="chords.html?key=${key}">Open in Chord Progressions</a>
                <a class="secondary-button" href="tracks.html?key=${key}">Find Tracks in This Key</a>
            </div>
        `;
    }

    function renderKeyFinderResult(data) {
        currentResultData = data;
        const confidence = data.confidence === null || data.confidence === undefined
            ? null
            : Math.max(0, Math.min(100, Number(data.confidence)));
        const confidenceLabel = confidence === null ? "Rule estimate" : `${confidence.toFixed(1)}%`;
        const confidenceWidth = confidence === null ? 0 : confidence;
        const notes = data.main_notes?.length ? data.main_notes.join(", ") : "No clear notes";
        const certainty = data.certainty || "medium";
        const cachedLabel = data.cached ? "Cached result" : data.source || "analysis";

        keyFinderResult.className = `key-finder-result result-mode-${currentResultMode}`;
        keyFinderResult.innerHTML = `
            <div class="result-summary">
                <span class="result-kicker">Final key</span>
                <div class="result-title-row">
                    <strong class="key-finder-final">${escapeHtml(data.final_key)}</strong>
                    <span class="certainty-badge certainty-${escapeHtml(certainty)}">${escapeHtml(certainty)} certainty</span>
                </div>
                <span class="result-source">${escapeHtml(cachedLabel)}</span>
            </div>

            <div class="confidence-row">
                <div class="confidence-label">
                    <span>${escapeHtml(data.confidence_label || "Confidence")}</span>
                    <strong>${escapeHtml(confidenceLabel)}</strong>
                </div>
                <div class="confidence-bar" aria-hidden="true">
                    <span style="width: ${confidenceWidth}%"></span>
                </div>
            </div>

            <p class="confidence-note ${data.uncertain ? "is-uncertain" : ""}">
                ${escapeHtml(data.confidence_note || "")}
            </p>

            <div class="result-details">
                <p><span>Key family</span>${escapeHtml(data.key_family || "Not available")}</p>
                <p><span>Main notes</span>${escapeHtml(notes)}</p>
                <p class="result-detail-section"><span>Rule-based</span>${escapeHtml(data.rule_key || "Not available")}</p>
                <p class="result-detail-section"><span>Keyboard/Bass</span>${escapeHtml(data.priority_key || "Not available")}</p>
                <p class="result-detail-section"><span>Model version</span>${escapeHtml(data.model_version || "Not available")}</p>
            </div>

            ${renderPossibleKeys(data.possible_keys)}
            ${renderResultActions(data)}

            ${renderEvidence(data)}
            ${renderMlDetails(data.ml_details)}

            <div class="result-ranking-grid result-detail-section">
                ${renderRankingBlock("Overall ranking", data.overall_ranking, "key")}
                ${renderRankingBlock("Keyboard/Bass priority", data.priority_ranking, "key")}
                ${renderRankingBlock("Key family ranking", data.family_ranking, "family")}
                ${renderStrongestNotes(data.strongest_notes)}
            </div>

            <div class="result-analysis-notes result-detail-section">
                <p><span>Conflict resolution</span>${escapeHtml(data.conflict_resolution || "Not available")}</p>
                <p><span>Mode resolution</span>${escapeHtml(data.mode_resolution || "Not available")}</p>
            </div>
        `;
    }

    function setStatus(message, className) {
        keyFinderResult.className = `key-finder-result ${className || ""}`.trim();
        keyFinderResult.innerHTML = `<span>${escapeHtml(message)}</span>`;
    }

    function renderJobProgress(job) {
        const progress = Math.max(0, Math.min(100, Number(job.progress || 0)));

        keyFinderResult.className = "key-finder-result is-loading";
        keyFinderResult.innerHTML = `
            <div class="analysis-progress" role="status">
                <div class="analysis-progress-heading">
                    <span class="analysis-spinner" aria-hidden="true"></span>
                    <div>
                        <strong>${escapeHtml(job.stage || "Analyzing audio")}</strong>
                        <span>${progress}%</span>
                    </div>
                </div>
                <div class="analysis-progress-bar" aria-hidden="true">
                    <span style="width: ${progress}%"></span>
                </div>
                <div class="analysis-skeleton" aria-hidden="true">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
    }

    function renderErrorReport(message, inputType) {
        const lowerMessage = String(message || "").toLowerCase();
        let suggestedFix = inputType === "file"
            ? "MP3 or WAV is the most stable. Try an audio-only file under 25 MB."
            : "YouTube may be blocking server-side extraction. Upload an audio file instead.";

        if (lowerMessage.includes("timed out") || lowerMessage.includes("render returned")) {
            suggestedFix = "The analyzer exceeded the hosting limit. Try a shorter MP3/WAV file, or run the local API.";
        }

        keyFinderResult.className = "key-finder-result is-error";
        keyFinderResult.innerHTML = `
            <div class="error-report">
                <strong>Analysis failed</strong>
                <p>${escapeHtml(message)}</p>
                <dl>
                    <div><dt>API URL</dt><dd>${escapeHtml(apiDisplayUrl())}</dd></div>
                    <div><dt>Status</dt><dd>${escapeHtml(apiStatus?.querySelector(".status-text")?.textContent || "Unknown")}</dd></div>
                    <div><dt>Suggested fix</dt><dd>${escapeHtml(suggestedFix)}</dd></div>
                </dl>
            </div>
        `;
    }

    function setAnalyzingState(isAnalyzing) {
        [analyzeFileButton, analyzeKeyButton, audioKeyFile, youtubeKeyUrl].forEach(function(control) {
            if (control) {
                control.disabled = isAnalyzing;
            }
        });

        if (cancelAnalyzeButton) {
            cancelAnalyzeButton.hidden = !isAnalyzing;
        }
    }

    function setApiStatus(state, message) {
        if (!apiStatus) {
            return;
        }

        apiStatus.className = `api-status ${state}`;
        apiStatus.querySelector(".status-text").textContent = message;
        if (serviceWakePanel) {
            const isStarting = state === "is-checking" && message === "API starting...";
            const isOffline = state === "is-offline";
            serviceWakePanel.hidden = !isStarting && !isOffline;
            serviceWakePanel.classList.toggle("is-offline", isOffline);

            if (serviceWakeTitle) {
                serviceWakeTitle.textContent = isOffline ? "Analyzer unavailable" : "Waking the analyzer";
            }

            if (serviceWakeCopy) {
                serviceWakeCopy.textContent = isOffline
                    ? "Open the service status page to retry the connection."
                    : "The first request after an idle period can take a few seconds.";
            }
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
            throw new Error(`Cannot connect to the Key Finder API at ${apiDisplayUrl()}.`);
        }
    }

    async function checkApiStatus() {
        try {
            setApiStatus("is-checking", apiRetryCount ? "API starting..." : "Checking API...");
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

    async function pollAnalysisJob(jobId, signal) {
        while (true) {
            await wait(JOB_POLL_DELAY_MS, signal);
            const response = await fetch(apiUrl(`/api/analyze-file/jobs/${encodeURIComponent(jobId)}`), {
                cache: "no-store",
                signal
            });
            const job = await readApiResponse(response);

            if (job.status === "completed") {
                return job;
            }

            if (job.status === "failed") {
                throw new Error(job.error || "Audio analysis failed.");
            }

            renderJobProgress(job);
        }
    }

    async function analyzeUploadedFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(apiUrl("/api/analyze-file/jobs"), {
            method: "POST",
            body: formData,
            signal: activeController.signal
        });
        const job = await readApiResponse(response);

        if (job.status === "completed") {
            return job;
        }

        renderJobProgress(job);
        return pollAnalysisJob(job.job_id, activeController.signal);
    }

    function applyResultMode(mode) {
        currentResultMode = mode === "detailed" ? "detailed" : "quick";
        localStorage.setItem(RESULT_MODE_KEY, currentResultMode);

        resultModeButtons.forEach(function(button) {
            const isActive = button.dataset.resultMode === currentResultMode;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        if (currentResultData) {
            renderKeyFinderResult(currentResultData);
        }
    }

    resultModeButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            applyResultMode(button.dataset.resultMode);
        });
    });

    cancelAnalyzeButton?.addEventListener("click", function() {
        activeController?.abort();
    });

    clearHistoryButton?.addEventListener("click", function() {
        localStorage.removeItem(HISTORY_KEY);
        currentResultData = null;
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
            keyFinderResult.focus({ preventScroll: true });
            keyFinderResult.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    });

    audioKeyFile?.addEventListener("change", function() {
        const file = audioKeyFile.files?.[0];
        if (audioFileName) {
            audioFileName.textContent = file ? file.name : "Choose an audio file";
        }
    });

    analyzeFileButton?.addEventListener("click", async function() {
        const file = audioKeyFile?.files?.[0];

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
            setStatus("Please export this MP4/WEBM as MP3 or WAV under 25 MB.", "is-error");
            return;
        }

        activeController = new AbortController();
        setAnalyzingState(true);
        renderJobProgress({ stage: "Uploading audio", progress: 4 });

        try {
            await ensureApiIsReachable(activeController.signal);
            const job = await analyzeUploadedFile(file);
            const data = { ...job.result, cached: Boolean(job.cached) };
            renderKeyFinderResult(data);
            addHistoryItem(file.name, data, "file");
            keyFinderResult.setAttribute("tabindex", "-1");
            keyFinderResult.focus({ preventScroll: true });
        } catch (error) {
            if (error.name === "AbortError") {
                setStatus("Stopped waiting for the analysis. The server may finish the job in the background.", "is-error");
            } else {
                renderErrorReport(error.message, "file");
            }
        } finally {
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
        renderJobProgress({ stage: "Downloading YouTube audio", progress: 12 });

        try {
            await ensureApiIsReachable(activeController.signal);
            const response = await fetch(apiUrl("/api/analyze"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
                signal: activeController.signal
            });
            const data = await readApiResponse(response);
            renderKeyFinderResult(data);
            addHistoryItem(url, data, "youtube");
        } catch (error) {
            if (error.name === "AbortError") {
                setStatus("Analysis canceled.", "is-error");
            } else {
                renderErrorReport(error.message, "youtube");
            }
        } finally {
            activeController = null;
            setAnalyzingState(false);
        }
    });

    youtubeKeyUrl?.addEventListener("keydown", function(event) {
        if (event.key === "Enter" && !analyzeKeyButton.disabled) {
            event.preventDefault();
            analyzeKeyButton.click();
        }
    });

    const latestDetailedItem = readHistory().find(function(item) {
        return item.analysisData;
    });

    applyResultMode(currentResultMode);
    renderHistory();
    if (latestDetailedItem) {
        renderKeyFinderResult(latestDetailedItem.analysisData);
    }
    checkApiStatus();
});
