import { mountSitePage } from "../app/mountSitePage.js";
import PrivacyView from "../views/PrivacyView.vue";
import { restoreInitialFragment } from "../utils/restoreInitialFragment.js";

mountSitePage({
  mountId: "vue-privacy-root",
  view: PrivacyView
});
restoreInitialFragment();
