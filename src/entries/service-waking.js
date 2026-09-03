import { mountSitePage } from "../app/mountSitePage.js";
import ServiceWakingView from "../views/ServiceWakingView.vue";

mountSitePage({
  activePage: "key-finder",
  mountId: "vue-service-waking-root",
  view: ServiceWakingView
});
