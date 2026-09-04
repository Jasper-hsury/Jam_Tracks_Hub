import { mountSitePage } from "../app/mountSitePage.js";
import KeyFinderView from "../views/KeyFinderView.vue";

mountSitePage({
  activePage: "key-finder",
  mountId: "vue-key-finder-root",
  showBackToTop: true,
  view: KeyFinderView
});
