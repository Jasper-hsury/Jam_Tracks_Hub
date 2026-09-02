import { createApp } from "vue";
import NotFoundView from "../views/NotFoundView.vue";

const mountTarget = document.getElementById("vue-404-root");

if (!mountTarget) {
  throw new Error("Missing Vue 404 mount target.");
}

createApp(NotFoundView).mount(mountTarget);
