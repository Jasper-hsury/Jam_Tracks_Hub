import { createApp, h } from "vue";
import SiteShell from "../components/site/SiteShell.vue";

export function mountSitePage({
  activePage = "",
  mountId,
  showBackToTop = false,
  view
}) {
  const mountTarget = document.getElementById(mountId);

  if (!mountTarget) {
    throw new Error(`Missing Vue page mount target: ${mountId}`);
  }

  return createApp({
    name: "SitePageRoot",
    render() {
      return h(SiteShell, {
        activePage,
        showBackToTop
      }, {
        default: () => h(view)
      });
    }
  }).mount(mountTarget);
}
