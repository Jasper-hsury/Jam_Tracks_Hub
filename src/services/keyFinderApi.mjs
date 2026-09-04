export const KEY_FINDER_PRODUCTION_API_ORIGIN = "https://api.jamtrackshub.com";
export const DEFAULT_LOCAL_API_ORIGIN = "http://127.0.0.1:8000";
export const DEFAULT_HELPER_ORIGIN = "http://localhost:8765";

export function resolveKeyFinderConfiguration(windowObject) {
  const localHosts = new Set(["localhost", "127.0.0.1", ""]);
  const hostname = windowObject.location.hostname;
  const isLocalSite = localHosts.has(hostname);
  let savedApiBaseUrl = null;
  try {
    savedApiBaseUrl = windowObject.localStorage.getItem("jasperMusicApiBaseUrl");
    if (savedApiBaseUrl && !isLocalSite) {
      windowObject.localStorage.removeItem("jasperMusicApiBaseUrl");
    }
  } catch (error) {
    savedApiBaseUrl = null;
  }

  const configured = windowObject.JASPER_MUSIC_CONFIG || {};
  const apiBaseUrl = isLocalSite
    ? (savedApiBaseUrl || configured.apiBaseUrl || DEFAULT_LOCAL_API_ORIGIN)
    : KEY_FINDER_PRODUCTION_API_ORIGIN;
  const productionApiBaseUrl = KEY_FINDER_PRODUCTION_API_ORIGIN;
  const youtubeHelperBaseUrl = configured.youtubeHelperBaseUrl || DEFAULT_HELPER_ORIGIN;

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    productionApiBaseUrl,
    youtubeHelperBaseUrl: youtubeHelperBaseUrl.replace(/\/$/, ""),
    youtubeSiteApiBaseUrlCandidates: Array.from(new Set([apiBaseUrl, productionApiBaseUrl])),
    youtubeHelperBaseUrlCandidates: Array.from(new Set([
      youtubeHelperBaseUrl,
      DEFAULT_HELPER_ORIGIN,
      "http://127.0.0.1:8765"
    ]))
  };
}

export function apiUrl(baseUrl, path) {
  return `${String(baseUrl || "").replace(/\/$/, "")}${path}`;
}

export async function readKeyFinderApiResponse(response) {
  const text = await response.text();
  let data = null;

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(
        `API returned ${response.status} ${response.statusText || "response"} instead of JSON. `
        + "The service may have restarted while processing the request."
      );
    }
  }

  if (!response.ok) {
    if (!data && [502, 503, 504].includes(response.status)) {
      throw new Error(`Render returned ${response.status}. The analyzer likely timed out or restarted.`);
    }
    throw new Error(data?.detail || `Analysis failed with status ${response.status}.`);
  }

  if (!data) throw new Error("The API returned an empty response.");
  return data;
}

export function createKeyFinderApi({ fetchImpl = globalThis.fetch } = {}) {
  async function request(url, options = {}) {
    const response = await fetchImpl(url, options);
    return readKeyFinderApiResponse(response);
  }

  return {
    async health(baseUrl, signal) {
      const response = await fetchImpl(apiUrl(baseUrl, "/api/health"), {
        method: "GET",
        cache: "no-store",
        signal
      });
      if (!response.ok) throw new Error(`API health check returned ${response.status}.`);
      return response;
    },
    async createFileJob(baseUrl, file, signal) {
      const body = new FormData();
      body.append("file", file);
      return request(apiUrl(baseUrl, "/api/analyze-file/jobs"), {
        method: "POST",
        body,
        signal
      });
    },
    async createYoutubeJob(baseUrl, url, signal) {
      return request(apiUrl(baseUrl, "/api/analyze/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal
      });
    },
    async getJob(baseUrl, inputType, jobId, signal) {
      const prefix = inputType === "youtube" ? "/api/analyze/jobs/" : "/api/analyze-file/jobs/";
      return request(apiUrl(baseUrl, `${prefix}${encodeURIComponent(jobId)}`), {
        method: "GET",
        cache: "no-store",
        signal
      });
    }
  };
}
