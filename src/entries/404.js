import { mountSitePage } from "../app/mountSitePage.js";
import NotFoundView from "../views/NotFoundView.vue";

mountSitePage({
  mountId: "vue-404-root",
  view: NotFoundView
});
