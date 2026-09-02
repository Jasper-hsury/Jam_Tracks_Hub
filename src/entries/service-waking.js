import { createApp } from "vue";
import ServiceWakingView from "../views/ServiceWakingView.vue";

const mountTarget = document.getElementById("vue-service-waking-root");

if (!mountTarget) {
  throw new Error("Missing Vue Service Waking mount target.");
}

createApp(ServiceWakingView).mount(mountTarget);
