import { mountSitePage } from "../app/mountSitePage.js";
import ChordLabView from "../views/ChordLabView.vue";

mountSitePage({
  activePage: "chord-lab",
  mountId: "vue-chord-lab-root",
  showBackToTop: true,
  view: ChordLabView
});
