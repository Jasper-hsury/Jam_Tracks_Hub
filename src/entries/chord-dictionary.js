import { mountSitePage } from "../app/mountSitePage.js";
import ChordDictionaryView from "../views/ChordDictionaryView.vue";

mountSitePage({
  activePage: "chord-dictionary",
  mountId: "vue-chord-dictionary-root",
  showBackToTop: true,
  view: ChordDictionaryView
});
