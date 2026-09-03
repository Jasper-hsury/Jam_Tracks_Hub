import { mountSitePage } from "../app/mountSitePage.js";
import FretboardTrainerView from "../views/FretboardTrainerView.vue";

mountSitePage({
  activePage: "fretboard-trainer",
  mountId: "vue-fretboard-trainer-root",
  showBackToTop: true,
  view: FretboardTrainerView
});
