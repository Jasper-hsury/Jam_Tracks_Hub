import { computed, reactive, ref } from "vue";
import {
  clampProgress,
  validateFileSelection,
  validateYoutubeInput
} from "../music/keyFinder.mjs";
import {
  createKeyFinderApi,
  resolveKeyFinderConfiguration
} from "../services/keyFinderApi.mjs";

export const KEY_FINDER_HISTORY_KEY = "jasperMusicKeyFinderHistory";
export const KEY_FINDER_RESULT_MODE_KEY = "jasperMusicKeyFinderResultMode";
export const JOB_POLL_DELAY_MS = 1200;
export const API_RETRY_DELAY_MS = 2000;
export const API_RETRY_LIMIT = 30;
export const API_HEALTH_TIMEOUT_MS = 8000;
export const HELPER_HEALTH_TIMEOUT_MS = 3500;
export const HELPER_START_POLL_LIMIT = 20;
export const HELPER_PROTOCOL_URL = "jasper-helper://start";

function defaultSleep(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function safeRead(storage, key, fallback) {
  try {
    const value = storage?.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function safeWrite(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch (error) {
    // Preserve in-memory behavior when storage is unavailable.
  }
}

function safeRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch (error) {
    // Preserve in-memory behavior when storage is unavailable.
  }
}

function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

export function useKeyFinder(options = {}) {
  const windowObject = options.windowObject || globalThis.window;
  const storage = options.storage || windowObject?.localStorage;
  const config = options.config || resolveKeyFinderConfiguration(windowObject);
  const api = options.api || createKeyFinderApi({ fetchImpl: options.fetchImpl });
  const sleep = options.sleep || defaultSleep;
  const setTimeoutFn = options.setTimeoutFn || globalThis.setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn || globalThis.clearTimeout;
  const setIntervalFn = options.setIntervalFn || globalThis.setInterval;
  const clearIntervalFn = options.clearIntervalFn || globalThis.clearInterval;
  const now = options.now || (() => new Date());
  const createId = options.createId || (() => `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const phase = ref("idle");
  const selectedFile = ref(null);
  const youtubeUrl = ref("");
  const result = ref(null);
  const progress = reactive({ stage: "", value: 0 });
  const error = ref(null);
  const currentResultMode = ref(safeRead(storage, KEY_FINDER_RESULT_MODE_KEY, "quick") === "detailed" ? "detailed" : "quick");
  const history = ref(readHistory());
  const apiStatus = reactive({ state: "is-checking", code: "checkingApi" });
  const helperStatus = reactive({ state: "is-checking", code: "checkingYoutube" });
  const youtubeHelperBaseUrl = ref(config.youtubeHelperBaseUrlCandidates[0]);
  const youtubeAnalysisBaseUrl = ref(config.apiBaseUrl);
  const activeJobId = ref(null);
  const isDisposed = ref(false);
  const isAnalyzing = computed(() => ["submitting", "queued", "processing"].includes(phase.value));

  let requestSequence = 0;
  let activeRequest = null;
  let apiRetryTimer = null;
  let apiRetryCount = 0;
  let helperInterval = null;
  let healthController = null;
  let helperHealthController = null;

  function readHistory() {
    try {
      const parsed = JSON.parse(safeRead(storage, KEY_FINDER_HISTORY_KEY, "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      return [];
    }
  }

  function saveHistory(items) {
    const bounded = items.slice(0, 5);
    history.value = bounded;
    safeWrite(storage, KEY_FINDER_HISTORY_KEY, JSON.stringify(bounded));
  }

  function addHistoryItem(reference, data, inputType) {
    saveHistory([{
      id: createId(),
      reference,
      inputType,
      finalKey: data.final_key,
      confidence: data.confidence,
      certainty: data.certainty,
      source: data.source,
      modelVersion: data.model_version,
      analysisData: data,
      time: now().toLocaleString()
    }, ...history.value]);
  }

  function applyResultMode(mode) {
    currentResultMode.value = mode === "detailed" ? "detailed" : "quick";
    safeWrite(storage, KEY_FINDER_RESULT_MODE_KEY, currentResultMode.value);
  }

  function setProgress(job, fallbackStage = "Analyzing audio") {
    progress.stage = job?.stage || fallbackStage;
    progress.value = clampProgress(job?.progress);
    phase.value = job?.status === "queued" || job?.status === "uploading" ? "queued" : "processing";
  }

  function completeProgress(job) {
    progress.stage = job?.stage || "Analysis complete";
    progress.value = 100;
  }

  function isCurrentRequest(sequence) {
    return activeRequest?.sequence === sequence && !isDisposed.value;
  }

  function beginRequest(inputType) {
    if (isAnalyzing.value) return null;
    const controller = new AbortController();
    const request = { sequence: ++requestSequence, controller, inputType, jobId: null, pollCount: 0 };
    activeRequest = request;
    activeJobId.value = null;
    result.value = null;
    error.value = null;
    phase.value = "submitting";
    return request;
  }

  function finishRequest(request) {
    if (activeRequest === request) activeRequest = null;
  }

  function reportError(message, inputType, baseUrl) {
    error.value = { message: String(message || ""), inputType, baseUrl };
    phase.value = "failed";
  }

  async function ensureApiIsReachable(signal) {
    try {
      await api.health(config.apiBaseUrl, signal);
      apiStatus.state = "is-online";
      apiStatus.code = "apiConnected";
    } catch (requestError) {
      if (requestError.name === "AbortError") throw requestError;
      apiStatus.state = "is-offline";
      apiStatus.code = "apiOffline";
      throw new Error(`Cannot connect to the Key Finder API at ${config.apiBaseUrl}.`);
    }
  }

  async function probeHelper(baseUrl, signal) {
    const controller = new AbortController();
    const timeout = setTimeoutFn(() => controller.abort(), HELPER_HEALTH_TIMEOUT_MS);
    const abortHandler = () => controller.abort();
    signal?.addEventListener("abort", abortHandler, { once: true });
    try {
      await api.health(baseUrl, controller.signal);
    } finally {
      clearTimeoutFn(timeout);
      signal?.removeEventListener("abort", abortHandler);
    }
  }

  async function ensureYoutubeHelperIsReachable(signal) {
    let lastError = null;
    for (const baseUrl of config.youtubeHelperBaseUrlCandidates) {
      if (signal?.aborted) throw abortError();
      try {
        await probeHelper(baseUrl, signal);
        youtubeHelperBaseUrl.value = baseUrl;
        youtubeAnalysisBaseUrl.value = baseUrl;
        helperStatus.state = "is-online";
        helperStatus.code = "helperConnected";
        return baseUrl;
      } catch (requestError) {
        lastError = requestError;
        if (requestError.name === "AbortError" && signal?.aborted) throw requestError;
      }
    }
    helperStatus.state = "is-offline";
    helperStatus.code = "helperOffline";
    throw new Error(
      `Cannot connect to the local YouTube Helper at ${youtubeHelperBaseUrl.value}. `
      + "Start it with START_YOUTUBE_HELPER_MAC.command on Mac, or START_YOUTUBE_HELPER.cmd on Windows.",
      { cause: lastError }
    );
  }

  function useSiteApiForYoutube(baseUrl = config.apiBaseUrl, code = "siteApi") {
    youtubeAnalysisBaseUrl.value = baseUrl;
    helperStatus.state = "is-online";
    helperStatus.code = code;
  }

  async function pollJob({ baseUrl, inputType, jobId, request }) {
    while (isCurrentRequest(request.sequence)) {
      await sleep(JOB_POLL_DELAY_MS, request.controller.signal);
      if (!isCurrentRequest(request.sequence)) throw abortError();
      request.pollCount += 1;
      const job = await api.getJob(baseUrl, inputType, jobId, request.controller.signal);
      if (!isCurrentRequest(request.sequence)) throw abortError();
      if (job.status === "completed") return job;
      if (job.status === "failed") throw new Error(job.error || "Audio analysis failed.");
      setProgress(job);
    }
    throw abortError();
  }

  async function resolveJob(job, { baseUrl, inputType, request }) {
    if (job.status === "completed") return job;
    if (!job.job_id) throw new Error("The API returned a job without an ID.");
    request.jobId = job.job_id;
    activeJobId.value = job.job_id;
    setProgress(job);
    return pollJob({ baseUrl, inputType, jobId: job.job_id, request });
  }

  async function submitFile(file = selectedFile.value) {
    const validation = validateFileSelection(file);
    if (!validation.valid) {
      phase.value = "validation-error";
      error.value = { code: validation.code, inputType: "file", baseUrl: config.apiBaseUrl };
      return false;
    }
    const request = beginRequest("file");
    if (!request) return false;
    setProgress({ status: "uploading", stage: "Uploading audio", progress: 4 });
    try {
      await ensureApiIsReachable(request.controller.signal);
      const created = await api.createFileJob(config.apiBaseUrl, file, request.controller.signal);
      if (!isCurrentRequest(request.sequence)) return false;
      const job = await resolveJob(created, { baseUrl: config.apiBaseUrl, inputType: "file", request });
      if (!isCurrentRequest(request.sequence)) return false;
      const data = { ...job.result, cached: Boolean(job.cached) };
      completeProgress(job);
      result.value = data;
      phase.value = "succeeded";
      activeJobId.value = null;
      addHistoryItem(file.name, data, "file");
      return true;
    } catch (requestError) {
      if (!isCurrentRequest(request.sequence)) return false;
      if (requestError.name === "AbortError") {
        phase.value = "cancelled";
        error.value = { code: "stopped", inputType: "file", baseUrl: config.apiBaseUrl };
      } else {
        reportError(requestError.message, "file", config.apiBaseUrl);
      }
      return false;
    } finally {
      activeJobId.value = null;
      finishRequest(request);
    }
  }

  async function createYoutubeWithFallback(url, request) {
    let siteApiError = null;
    for (const baseUrl of config.youtubeSiteApiBaseUrlCandidates) {
      try {
        const cloudFallback = baseUrl === config.productionApiBaseUrl && baseUrl !== config.apiBaseUrl;
        useSiteApiForYoutube(baseUrl, cloudFallback ? "cloudApi" : "siteApi");
        const created = await api.createYoutubeJob(baseUrl, url, request.controller.signal);
        return await resolveJob(created, { baseUrl, inputType: "youtube", request });
      } catch (requestError) {
        if (requestError.name === "AbortError") throw requestError;
        requestError.analysisBaseUrl = baseUrl;
        siteApiError = requestError;
        helperStatus.state = "is-checking";
        helperStatus.code = "tryingAnalyzer";
      }
    }
    try {
      helperStatus.state = "is-checking";
      helperStatus.code = "tryingHelper";
      const helperBaseUrl = await ensureYoutubeHelperIsReachable(request.controller.signal);
      const created = await api.createYoutubeJob(helperBaseUrl, url, request.controller.signal);
      return await resolveJob(created, { baseUrl: helperBaseUrl, inputType: "youtube", request });
    } catch (helperError) {
      if (helperError.name === "AbortError") throw helperError;
      const combined = new Error(
        `${siteApiError?.message || "The site analyzers could not process this YouTube link."} `
        + "Local Helper fallback also could not be reached from this browser."
      );
      combined.analysisBaseUrl = siteApiError?.analysisBaseUrl || youtubeAnalysisBaseUrl.value;
      throw combined;
    }
  }

  async function submitYoutube(value = youtubeUrl.value) {
    const validation = validateYoutubeInput(value);
    if (!validation.valid) {
      phase.value = "validation-error";
      error.value = { code: validation.code, inputType: "youtube", baseUrl: youtubeAnalysisBaseUrl.value };
      return false;
    }
    const request = beginRequest("youtube");
    if (!request) return false;
    setProgress({ status: "processing", stage: "Downloading YouTube audio", progress: 12 });
    try {
      const job = await createYoutubeWithFallback(validation.url, request);
      if (!isCurrentRequest(request.sequence)) return false;
      completeProgress(job);
      result.value = job.result;
      phase.value = "succeeded";
      activeJobId.value = null;
      addHistoryItem(validation.url, job.result, "youtube");
      return true;
    } catch (requestError) {
      if (!isCurrentRequest(request.sequence)) return false;
      if (requestError.name === "AbortError") {
        phase.value = "cancelled";
        error.value = { code: "stopped", inputType: "youtube", baseUrl: youtubeAnalysisBaseUrl.value };
      } else {
        reportError(requestError.message, "youtube", requestError.analysisBaseUrl || youtubeAnalysisBaseUrl.value);
      }
      return false;
    } finally {
      activeJobId.value = null;
      finishRequest(request);
    }
  }

  function cancel() {
    if (!activeRequest) return;
    const request = activeRequest;
    request.controller.abort();
    requestSequence += 1;
    activeRequest = null;
    activeJobId.value = null;
    phase.value = "cancelled";
    error.value = {
      code: "stopped",
      inputType: request.inputType,
      baseUrl: request.inputType === "youtube" ? youtubeAnalysisBaseUrl.value : config.apiBaseUrl
    };
  }

  function resetAnalysis({ clearInputs = false } = {}) {
    requestSequence += 1;
    activeRequest?.controller.abort();
    activeRequest = null;
    activeJobId.value = null;
    result.value = null;
    error.value = null;
    progress.stage = "";
    progress.value = 0;
    phase.value = "idle";
    if (clearInputs) {
      selectedFile.value = null;
      youtubeUrl.value = "";
    }
  }

  function clearHistory() {
    safeRemove(storage, KEY_FINDER_HISTORY_KEY);
    history.value = [];
    result.value = null;
    if (!isAnalyzing.value) {
      error.value = null;
      phase.value = "idle";
    }
  }

  function showHistoryItem(item) {
    if (!item?.analysisData || isAnalyzing.value) return false;
    result.value = item.analysisData;
    error.value = null;
    phase.value = "succeeded";
    return true;
  }

  async function checkApiStatus() {
    if (isDisposed.value) return;
    healthController?.abort();
    const controller = new AbortController();
    healthController = controller;
    const timeout = setTimeoutFn(() => controller.abort(), API_HEALTH_TIMEOUT_MS);
    apiStatus.state = "is-checking";
    apiStatus.code = apiRetryCount ? "apiStarting" : "checkingApi";
    try {
      await ensureApiIsReachable(controller.signal);
      apiRetryCount = 0;
      if (apiRetryTimer) clearTimeoutFn(apiRetryTimer);
      apiRetryTimer = null;
    } catch (requestError) {
      if (isDisposed.value) return;
      if (apiRetryCount < API_RETRY_LIMIT) {
        apiRetryCount += 1;
        apiStatus.state = "is-checking";
        apiStatus.code = "apiStarting";
        apiRetryTimer = setTimeoutFn(checkApiStatus, API_RETRY_DELAY_MS);
      } else {
        apiStatus.state = "is-offline";
        apiStatus.code = "apiOffline";
      }
    } finally {
      clearTimeoutFn(timeout);
      if (healthController === controller) healthController = null;
    }
  }

  async function checkYoutubeHelperStatus() {
    if (isDisposed.value) return;
    helperHealthController?.abort();
    const controller = new AbortController();
    helperHealthController = controller;
    helperStatus.state = "is-checking";
    helperStatus.code = "checkingHelper";
    try {
      await ensureYoutubeHelperIsReachable(controller.signal);
    } catch (requestError) {
      if (isDisposed.value) return;
      useSiteApiForYoutube();
    } finally {
      if (helperHealthController === controller) helperHealthController = null;
    }
  }

  function openHelperProtocol(automatic = false) {
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(windowObject.navigator.userAgent);
    if (!automatic || isSafari) {
      windowObject.location.href = HELPER_PROTOCOL_URL;
      return;
    }
    const frame = windowObject.document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.src = HELPER_PROTOCOL_URL;
    windowObject.document.body.appendChild(frame);
    setTimeoutFn(() => frame.remove(), 1500);
  }

  async function startYoutubeHelper() {
    helperStatus.state = "is-checking";
    helperStatus.code = "openingHelper";
    try {
      openHelperProtocol(false);
      for (let attempt = 0; attempt < HELPER_START_POLL_LIMIT; attempt += 1) {
        await sleep(1000);
        try {
          await ensureYoutubeHelperIsReachable();
          return true;
        } catch (requestError) {
          helperStatus.state = "is-checking";
          helperStatus.code = "waitingHelper";
        }
      }
    } catch (requestError) {
      // The offline state below is the canonical visible outcome.
    }
    helperStatus.state = "is-offline";
    helperStatus.code = "helperOffline";
    return false;
  }

  function initialize() {
    checkApiStatus();
    checkYoutubeHelperStatus();
    helperInterval = setIntervalFn(checkYoutubeHelperStatus, 15000);
    const latest = history.value.find(item => item.analysisData);
    if (latest) {
      result.value = latest.analysisData;
      phase.value = "succeeded";
    }
  }

  function dispose() {
    isDisposed.value = true;
    requestSequence += 1;
    activeRequest?.controller.abort();
    activeRequest = null;
    healthController?.abort();
    healthController = null;
    helperHealthController?.abort();
    helperHealthController = null;
    if (apiRetryTimer) clearTimeoutFn(apiRetryTimer);
    if (helperInterval) clearIntervalFn(helperInterval);
    apiRetryTimer = null;
    helperInterval = null;
    activeJobId.value = null;
  }

  return {
    activeJobId,
    apiStatus,
    applyResultMode,
    cancel,
    checkApiStatus,
    checkYoutubeHelperStatus,
    clearHistory,
    config,
    currentResultMode,
    dispose,
    error,
    helperStatus,
    history,
    initialize,
    isAnalyzing,
    phase,
    progress,
    result,
    resetAnalysis,
    selectedFile,
    showHistoryItem,
    startYoutubeHelper,
    submitFile,
    submitYoutube,
    youtubeAnalysisBaseUrl,
    youtubeHelperBaseUrl,
    youtubeUrl
  };
}
