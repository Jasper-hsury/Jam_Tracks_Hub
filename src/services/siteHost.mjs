// Cloudflare branch and version previews are served from *.workers.dev. The
// analyzer API only accepts jamtrackshub.com and local origins, so a preview
// that calls it gets a CORS error in the console and never reaches the service.
export function isPreviewHost(hostname) {
  return /\.workers\.dev$/i.test(String(hostname || ""));
}
