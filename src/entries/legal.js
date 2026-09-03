import { mountSitePage } from "../app/mountSitePage.js";
import LegalView from "../views/LegalView.vue";
import { restoreInitialFragment } from "../utils/restoreInitialFragment.js";

mountSitePage({
  mountId: "vue-legal-root",
  view: LegalView
});
restoreInitialFragment();
