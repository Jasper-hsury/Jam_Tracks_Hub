import { mountSitePage } from "../app/mountSitePage.js";
import TracksView from "../views/TracksView.vue";

mountSitePage({
  activePage: "tracks",
  mountId: "vue-tracks-root",
  showBackToTop: true,
  view: TracksView
});
