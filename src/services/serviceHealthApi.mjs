export function resolveServiceApiBase(windowObject) {
  return (
    windowObject.JASPER_MUSIC_CONFIG?.apiBaseUrl
    || windowObject.KEY_FINDER_API_BASE
    || windowObject.location.origin
  ).replace(/\/$/, "");
}

export async function checkServiceHealth({ apiBase, fetchImpl, signal }) {
  const response = await fetchImpl(`${apiBase}/api/health`, {
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error("Service is still starting");
  }
}
