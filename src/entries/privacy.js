import { createApp } from "vue";
import PrivacyView from "../views/PrivacyView.vue";
import { restoreInitialFragment } from "../utils/restoreInitialFragment.js";

const mountTarget = document.getElementById("vue-privacy-root");

if (!mountTarget) {
  throw new Error("Missing Vue Privacy mount target.");
}

createApp(PrivacyView).mount(mountTarget);
restoreInitialFragment();
