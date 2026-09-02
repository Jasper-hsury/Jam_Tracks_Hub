import { createApp } from "vue";
import LegalView from "../views/LegalView.vue";

const mountTarget = document.getElementById("vue-legal-root");

if (!mountTarget) {
  throw new Error("Missing Vue Legal mount target.");
}

createApp(LegalView).mount(mountTarget);
