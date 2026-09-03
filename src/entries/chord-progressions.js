import { mountSitePage } from "../app/mountSitePage.js";
import ChordProgressionsView from "../views/ChordProgressionsView.vue";

mountSitePage({
  activePage: "chord-progressions",
  mountId: "vue-chord-progressions-root",
  showBackToTop: true,
  view: ChordProgressionsView
});
