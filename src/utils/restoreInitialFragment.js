export function restoreInitialFragment() {
  const encodedId = window.location.hash.slice(1);
  if (!encodedId) return;

  let id = encodedId;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    return;
  }

  window.requestAnimationFrame(function() {
    document.getElementById(id)?.scrollIntoView();
  });
}
