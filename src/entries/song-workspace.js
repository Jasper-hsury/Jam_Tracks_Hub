import { mountSitePage } from "../app/mountSitePage.js";
import SongWorkspaceView from "../views/SongWorkspaceView.vue";

mountSitePage({
  activePage: "song-workspace",
  mountId: "vue-song-workspace-root",
  showBackToTop: true,
  view: SongWorkspaceView
});
