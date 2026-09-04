import { mountSitePage } from "../app/mountSitePage.js";
import ProgressionWriterView from "../views/ProgressionWriterView.vue";

mountSitePage({
  activePage: "chord-progressions",
  mountId: "vue-progression-writer-root",
  showBackToTop: true,
  view: ProgressionWriterView
});
