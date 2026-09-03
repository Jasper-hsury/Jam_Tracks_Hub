import { mountSitePage } from "../app/mountSitePage.js";
import FeedbackView from "../views/FeedbackView.vue";

mountSitePage({
  mountId: "vue-feedback-root",
  showBackToTop: true,
  view: FeedbackView
});
