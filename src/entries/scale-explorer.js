import { mountSitePage } from "../app/mountSitePage.js";
import ScaleExplorerView from "../views/ScaleExplorerView.vue";

mountSitePage({
  activePage: "scale",
  mountId: "vue-scale-explorer-root",
  showBackToTop: true,
  view: ScaleExplorerView
});
