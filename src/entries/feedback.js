import { createApp } from "vue";
import FeedbackView from "../views/FeedbackView.vue";

const mountTarget = document.getElementById("vue-feedback-root");

if (!mountTarget) {
  throw new Error("Missing Vue Feedback mount target.");
}

createApp(FeedbackView).mount(mountTarget);
