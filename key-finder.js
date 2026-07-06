document.addEventListener("DOMContentLoaded", function() {
    const HISTORY_KEY = "jasperMusicKeyFinderHistory";
    const RESULT_MODE_KEY = "jasperMusicKeyFinderResultMode";
    const apiBaseUrl = window.JASPER_MUSIC_CONFIG?.apiBaseUrl ?? "http://127.0.0.1:8000";
    const configuredYoutubeHelperBaseUrl = window.JASPER_MUSIC_CONFIG?.youtubeHelperBaseUrl ?? "http://localhost:8765";
    const youtubeHelperBaseUrlCandidates = Array.from(new Set([
        configuredYoutubeHelperBaseUrl,
        "http://localhost:8765",
        "http://127.0.0.1:8765"
    ]));
    const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
    const MAX_CONTAINER_UPLOAD_BYTES = 25 * 1024 * 1024;
    const HEAVY_CONTAINER_EXTENSIONS = new Set([".mp4", ".webm"]);
    const API_RETRY_DELAY_MS = 2000;
    const API_RETRY_LIMIT = 30;
    const API_HEALTH_TIMEOUT_MS = 8000;
    const HELPER_HEALTH_TIMEOUT_MS = 3500;
    const HELPER_HEALTH_TOTAL_TIMEOUT_MS = (HELPER_HEALTH_TIMEOUT_MS * youtubeHelperBaseUrlCandidates.length) + 800;
    const JOB_POLL_DELAY_MS = 1200;
    const HELPER_PROTOCOL_URL = "jasper-helper://start";
    const HELPER_START_POLL_LIMIT = 20;
    const HELPER_AUTOSTART_DELAY_MS = 900;

    const audioKeyFile = document.getElementById("audioKeyFile");
    const analyzeFileButton = document.getElementById("analyzeFileButton");
    const audioFileName = document.getElementById("audioFileName");
    const youtubeKeyUrl = document.getElementById("youtubeKeyUrl");
    const analyzeKeyButton = document.getElementById("analyzeKeyButton");
    const cancelAnalyzeButton = document.getElementById("cancelAnalyzeButton");
    const keyFinderResult = document.getElementById("keyFinderResult");
    const apiStatus = document.getElementById("apiStatus");
    const youtubeHelperStatus = document.getElementById("youtubeHelperStatus");
    const startYoutubeHelperButton = document.getElementById("startYoutubeHelperButton");
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
    let autoStartAttempted = false;
    let youtubeHelperBaseUrl = youtubeHelperBaseUrlCandidates[0];
    let youtubeAnalysisBaseUrl = apiBaseUrl;

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

    function apiUrl(path, baseUrl = apiBaseUrl) {
        return `${baseUrl.replace(/\/$/, "")}${path}`;
    }

    function apiDisplayUrl(baseUrl = apiBaseUrl) {
        return baseUrl || `${window.location.origin}/api`;
    }

    function youtubeHelperDisplayUrl() {
        return youtubeHelperBaseUrl || "http://127.0.0.1:8765";
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

    function parseKeyName(keyName) {
        const match = String(keyName || "").trim().match(/^([A-G](?:#|b)?)(?:\s+(major|minor))?$/i);
        if (!match) {
            return {
                root: "",
                mode: "major"
            };
        }

        const root = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        return {
            root,
            mode: (match[2] || "major").toLowerCase()
        };
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

        function formatRelativeKeyScore(value) {
            if (value === null || value === undefined || Number.isNaN(Number(value))) {
                return "Not available";
            }

            return `${(Number(value) / 100).toFixed(1)}x final score`;
        }

        return `
            <div class="key-finder-candidates">
                <p>Other possible keys <span>rule score compared with final key</span></p>
                <ul>
                    ${possibleKeys.slice(0, 4).map(function(candidate) {
                        return `
                            <li>
                                <span>${escapeHtml(candidate.key)}</span>
                                <strong>${escapeHtml(formatRelativeKeyScore(candidate.relative_score))}</strong>
                            </li>
                        `;
                    }).join("")}
                </ul>
                <small class="key-finder-candidates-note">
                    These are not probabilities. Values above 1.0x mean the rule-based score was stronger than the final ML-led key.
                </small>
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
        const parsedKey = parseKeyName(data.final_key);
        const root = encodeURIComponent(parsedKey.root);
        const chordType = parsedKey.mode === "minor" ? "minor" : "major";

        return `
            <div class="result-actions">
                <a class="primary-button" href="scale.html?key=${key}">Open Scale Explorer</a>
                <a class="secondary-button" href="chord-dictionary.html?root=${root}&chord=${chordType}">Open Chord Dictionary</a>
                <a class="secondary-button" href="chords.html?key=${key}">Open Chord Progressions</a>
                <a class="secondary-button" href="tracks.html?key=${key}">Find Tracks in This Key</a>
            </div>
        `;
    }

    function readableList(items, fallback) {
        const values = (items || [])
            .filter(Boolean)
            .map(function(item) {
                return String(item);
            });

        if (!values.length) {
            return fallback || "not enough evidence";
        }

        if (values.length === 1) {
            return values[0];
        }

        return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
    }

    function topCandidateNames(candidates, finalKey) {
        return (candidates || [])
            .map(function(candidate) {
                return candidate?.key;
            })
            .filter(function(keyName) {
                return keyName && keyName !== finalKey;
            })
            .slice(0, 3);
    }

    function renderResultExplanation(data, confidence) {
        const finalKey = data.final_key || "the final key";
        const ruleKey = data.rule_key || "not available";
        const priorityKey = data.priority_key || "not available";
        const keyFamily = data.key_family || "not available";
        const mainNotes = readableList((data.main_notes || []).slice(0, 4), "not enough clear note evidence");
        const alternateKeys = readableList(topCandidateNames(data.possible_keys, data.final_key), "no close alternate keys");
        const confidenceText = confidence === null
            ? "rule-based estimate"
            : `${confidence.toFixed(1)}% confidence`;
        const certainty = String(data.certainty || "medium").toLowerCase();

        let meaning = `Treat ${finalKey} as the leading tonal center, with ${keyFamily} as the surrounding key family.`;
        if (certainty === "low" || data.uncertain) {
            meaning = `Treat ${finalKey} as a leading candidate, not a final answer. The evidence is mixed enough that a quick ear check is still useful.`;
        } else if (certainty === "high") {
            meaning = `${finalKey} is strongly supported by the combined analysis, so it is a solid starting point for scales, chords, and practice.`;
        }

        let reason = `The strongest note evidence points around ${mainNotes}. The scale-fit rule chose ${ruleKey}, while the keyboard/bass priority pass chose ${priorityKey}.`;
        if (ruleKey === data.final_key && priorityKey === data.final_key) {
            reason = `The rule-based pass and keyboard/bass priority pass both agree on ${finalKey}, and the strongest notes are ${mainNotes}.`;
        } else if (ruleKey === priorityKey) {
            reason = `The rule-based pass and keyboard/bass priority pass both point to ${ruleKey}; the final result weighs that against the ML model and the key family.`;
        }

        const nextCheck = certainty === "low" || data.uncertain
            ? `Check whether the song resolves more naturally to ${finalKey} or one of these alternates: ${alternateKeys}.`
            : `Use ${finalKey} first, then compare it with ${alternateKeys} if a section sounds like it shifts.`;

        return `
            <section class="result-explanation" aria-label="Key result explanation">
                <div class="result-explanation-heading">
                    <span>Result explanation</span>
                    <strong>${escapeHtml(confidenceText)}</strong>
                </div>
                <div class="result-explanation-grid">
                    <article class="result-explanation-card">
                        <h4>What this means</h4>
                        <p>${escapeHtml(meaning)}</p>
                    </article>
                    <article class="result-explanation-card">
                        <h4>Why this result</h4>
                        <p>${escapeHtml(reason)}</p>
                    </article>
                    <article class="result-explanation-card">
                        <h4>Next check</h4>
                        <p>${escapeHtml(nextCheck)}</p>
                    </article>
                </div>
            </section>
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

            ${renderResultExplanation(data, confidence)}

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

    function renderErrorReport(message, inputType, displayBaseUrl) {
        const lowerMessage = String(message || "").toLowerCase();
        let suggestedFix = inputType === "file"
            ? "MP3 or WAV is the most stable. Try an audio-only file under 25 MB."
            : "Start Jasper YouTube Helper on this computer, then try Analyze link again.";

        if (lowerMessage.includes("timed out") || lowerMessage.includes("render returned")) {
            suggestedFix = "The analyzer exceeded the hosting limit. Try a shorter MP3/WAV file, or run the local API.";
        }

        if (inputType === "youtube" && lowerMessage.includes("helper")) {
            suggestedFix = "Run the helper setup once. On Mac, run INSTALL_MAC_HELPER_PROTOCOL.command. On Windows, run 2_CONNECT_HELPER_TO_WEBSITE.cmd. Then refresh Key Finder and allow the browser to open Jasper YouTube Helper.";
        }

        if (
            inputType === "youtube" &&
            (lowerMessage.includes("youtube blocked") || lowerMessage.includes("cookies may have expired"))
        ) {
            suggestedFix = "The site API reached YouTube, but YouTube blocked the server cookies. Try Start Helper for the local fallback, refresh the Render YouTube cookies, or upload an audio file.";
        }

        if (inputType === "youtube" && lowerMessage.includes("sign in to confirm")) {
            suggestedFix = "The local helper reached YouTube, but YouTube still requested verification. Try another link or upload an audio file.";
        }

        const statusText = inputType === "youtube"
            ? youtubeHelperStatus?.querySelector(".status-text")?.textContent
            : apiStatus?.querySelector(".status-text")?.textContent;

        keyFinderResult.className = "key-finder-result is-error";
        keyFinderResult.innerHTML = `
            <div class="error-report">
                <strong>Analysis failed</strong>
                <p>${escapeHtml(message)}</p>
                <dl>
                    <div><dt>API URL</dt><dd>${escapeHtml(apiDisplayUrl(displayBaseUrl))}</dd></div>
                    <div><dt>Status</dt><dd>${escapeHtml(statusText || "Unknown")}</dd></div>
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

    function setYoutubeHelperStatus(state, message) {
        if (!youtubeHelperStatus) {
            return;
        }

        youtubeHelperStatus.className = `api-status helper-status ${state}`;
        youtubeHelperStatus.querySelector(".status-text").textContent = message;

        if (startYoutubeHelperButton) {
            startYoutubeHelperButton.hidden = state === "is-online" && message === "YouTube Helper connected";
            startYoutubeHelperButton.disabled = false;
        }
    }

    function clearHelperStartError() {
        if (!keyFinderResult.classList.contains("is-error")) {
            return;
        }

        const text = keyFinderResult.textContent || "";
        if (
            text.includes("Could not confirm that YouTube Helper started") ||
            text.includes("INSTALL_MAC_HELPER_PROTOCOL") ||
            text.includes("START_YOUTUBE_HELPER_MAC")
        ) {
            setStatus("Ready when you are.", "key-finder-empty");
        }
    }

    function useSiteApiForYoutube(message = "YouTube via site API") {
        youtubeAnalysisBaseUrl = apiBaseUrl;
        setYoutubeHelperStatus("is-online", message);
        clearHelperStartError();
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

    async function fetchYoutubeHelperHealth(helperBaseUrl, signal) {
        const controller = new AbortController();
        const timeout = window.setTimeout(function() {
            controller.abort();
        }, HELPER_HEALTH_TIMEOUT_MS);
        const abortHandler = function() {
            controller.abort();
        };

        if (signal) {
            signal.addEventListener("abort", abortHandler, { once: true });
        }

        try {
            return await fetch(apiUrl("/api/health", helperBaseUrl), {
                method: "GET",
                cache: "no-store",
                signal: controller.signal
            });
        } finally {
            window.clearTimeout(timeout);
            if (signal) {
                signal.removeEventListener("abort", abortHandler);
            }
        }
    }

    async function ensureYoutubeHelperIsReachable(signal) {
        let lastError = null;

        for (const helperBaseUrl of youtubeHelperBaseUrlCandidates) {
            if (signal?.aborted) {
                throw new DOMException("The operation was aborted.", "AbortError");
            }

            try {
                const response = await fetchYoutubeHelperHealth(helperBaseUrl, signal);

                if (!response.ok) {
                    throw new Error(`YouTube Helper health check returned ${response.status}.`);
                }

                youtubeHelperBaseUrl = helperBaseUrl;
                youtubeAnalysisBaseUrl = helperBaseUrl;
                setYoutubeHelperStatus("is-online", "YouTube Helper connected");
                return;
            } catch (error) {
                lastError = error;
                if (error.name === "AbortError" && signal?.aborted) {
                    throw error;
                }
            }
        }

        setYoutubeHelperStatus("is-offline", "YouTube Helper offline");
        throw new Error(
            `Cannot connect to Jasper YouTube Helper at ${youtubeHelperDisplayUrl()}. ` +
            "Start it with START_YOUTUBE_HELPER_MAC.command on Mac, or START_YOUTUBE_HELPER.cmd on Windows.",
            { cause: lastError }
        );
    }

    async function checkApiStatus() {
        const controller = new AbortController();
        const timeout = window.setTimeout(function() {
            controller.abort();
        }, API_HEALTH_TIMEOUT_MS);

        try {
            setApiStatus("is-checking", apiRetryCount ? "API starting..." : "Checking API...");
            await ensureApiIsReachable(controller.signal);
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
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function checkYoutubeHelperStatus() {
        if (!youtubeHelperStatus) {
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(function() {
            controller.abort();
        }, HELPER_HEALTH_TOTAL_TIMEOUT_MS);

        try {
            setYoutubeHelperStatus("is-checking", "Checking YouTube Helper...");
            await ensureYoutubeHelperIsReachable(controller.signal);
        } catch (error) {
            useSiteApiForYoutube();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function waitForYoutubeHelperAfterLaunch() {
        for (let attempt = 0; attempt < HELPER_START_POLL_LIMIT; attempt += 1) {
            await wait(1000);

            const controller = new AbortController();
            const timeout = window.setTimeout(function() {
                controller.abort();
            }, HELPER_HEALTH_TOTAL_TIMEOUT_MS);

            try {
                await ensureYoutubeHelperIsReachable(controller.signal);
                return true;
            } catch (error) {
                if (error.name !== "AbortError") {
                    setYoutubeHelperStatus("is-checking", "Waiting for YouTube Helper...");
                }
            } finally {
                window.clearTimeout(timeout);
            }
        }

        return false;
    }

    function openHelperProtocol(isAutomatic) {
        const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);

        if (!isAutomatic || isSafari) {
            window.location.href = HELPER_PROTOCOL_URL;
            return;
        }

        const launcherFrame = document.createElement("iframe");
        launcherFrame.hidden = true;
        launcherFrame.setAttribute("aria-hidden", "true");
        launcherFrame.src = HELPER_PROTOCOL_URL;
        document.body.appendChild(launcherFrame);

        window.setTimeout(function() {
            launcherFrame.remove();
        }, 1500);
    }

    async function startYoutubeHelperFromBrowser(options = {}) {
        const isAutomatic = options.automatic === true;
        const launchMessage = isAutomatic
            ? "Starting YouTube Helper..."
            : "Opening YouTube Helper...";
        setYoutubeHelperStatus("is-checking", launchMessage);

        try {
            openHelperProtocol(isAutomatic);
            const connected = await waitForYoutubeHelperAfterLaunch();

            if (!connected) {
                setYoutubeHelperStatus("is-offline", "YouTube Helper offline");
            }
        } catch (error) {
            setYoutubeHelperStatus("is-offline", "YouTube Helper offline");
        }
    }

    async function autoStartYoutubeHelperIfNeeded() {
        if (autoStartAttempted || !youtubeKeyUrl) {
            return;
        }

        autoStartAttempted = true;
        await wait(HELPER_AUTOSTART_DELAY_MS);

        const controller = new AbortController();
        const timeout = window.setTimeout(function() {
            controller.abort();
        }, HELPER_HEALTH_TOTAL_TIMEOUT_MS);

        try {
            await ensureYoutubeHelperIsReachable(controller.signal);
        } catch (error) {
            useSiteApiForYoutube();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function pollAnalysisJob(jobId, signal, inputType, baseUrl = apiBaseUrl) {
        const jobPath = inputType === "youtube"
            ? `/api/analyze/jobs/${encodeURIComponent(jobId)}`
            : `/api/analyze-file/jobs/${encodeURIComponent(jobId)}`;

        while (true) {
            await wait(JOB_POLL_DELAY_MS, signal);
            const response = await fetch(apiUrl(jobPath, baseUrl), {
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
        return pollAnalysisJob(job.job_id, activeController.signal, "file", apiBaseUrl);
    }

    async function analyzeYoutubeUrl(url, baseUrl = youtubeAnalysisBaseUrl) {
        const response = await fetch(apiUrl("/api/analyze/jobs", baseUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            signal: activeController.signal
        });
        const job = await readApiResponse(response);

        if (job.status === "completed") {
            return job;
        }

        renderJobProgress(job);
        return pollAnalysisJob(job.job_id, activeController.signal, "youtube", baseUrl);
    }

    async function analyzeYoutubeUrlWithFallback(url) {
        try {
            youtubeAnalysisBaseUrl = apiBaseUrl;
            useSiteApiForYoutube();
            return await analyzeYoutubeUrl(url, apiBaseUrl);
        } catch (siteApiError) {
            if (siteApiError.name === "AbortError") {
                throw siteApiError;
            }

            try {
                setYoutubeHelperStatus("is-checking", "Trying local YouTube Helper...");
                await ensureYoutubeHelperIsReachable(activeController.signal);
                return await analyzeYoutubeUrl(url, youtubeHelperBaseUrl);
            } catch (helperError) {
                if (helperError.name === "AbortError") {
                    throw helperError;
                }

                throw new Error(
                    `${siteApiError.message} Local helper fallback also could not be reached from this browser.`
                );
            }
        }
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

    startYoutubeHelperButton?.addEventListener("click", function() {
        startYoutubeHelperFromBrowser();
    });

    autoStartYoutubeHelperIfNeeded();

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
                renderErrorReport(error.message, "file", apiBaseUrl);
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
            const job = await analyzeYoutubeUrlWithFallback(url);
            const data = job.result;
            renderKeyFinderResult(data);
            addHistoryItem(url, data, "youtube");
        } catch (error) {
            if (error.name === "AbortError") {
                setStatus("Stopped waiting for the analysis. The server may finish the job in the background.", "is-error");
            } else {
                renderErrorReport(error.message, "youtube", youtubeAnalysisBaseUrl);
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
    checkYoutubeHelperStatus();
    window.setInterval(checkYoutubeHelperStatus, 15000);
});
