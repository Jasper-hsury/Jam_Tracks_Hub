import { mountSitePage } from "../app/mountSitePage.js";
import HomeView from "../views/HomeView.vue";

mountSitePage({
  activePage: "index",
  mountId: "vue-home-root",
  showBackToTop: true,
  view: HomeView
});
