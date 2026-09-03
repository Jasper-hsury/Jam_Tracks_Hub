<script setup>
import { computed, ref } from "vue";
import { normalizePagePath, useSmartNavbar } from "../../composables/useSmartNavbar.js";
import { useSiteLocale } from "../../i18n/useSiteLocale.js";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import ThemeToggle from "./ThemeToggle.vue";

const props = defineProps({
  activePage: {
    type: String,
    default: ""
  }
});

const navItems = [
  { href: "/index.html#home", page: "index", key: "nav.home", fallback: "Home" },
  { href: "/tracks.html", page: "tracks", key: "nav.tracks", fallback: "Tracks" },
  { href: "/chord-dictionary.html", page: "chord-dictionary", key: "nav.chordDictionary", fallback: "Chord Dictionary" },
  { href: "/scale.html", page: "scale", key: "nav.scaleExplorer", fallback: "Scale Explorer" },
  { href: "/key-finder.html", page: "key-finder", key: "nav.keyFinder", fallback: "Key Finder" },
  { href: "/chord-progressions.html", page: "chord-progressions", key: "nav.chordProgressions", fallback: "Chord Progressions" },
  { href: "/song-workspace.html", page: "song-workspace", key: "nav.songWorkspace", fallback: "Song Workspace" },
  { href: "/fretboard-trainer.html", page: "fretboard-trainer", key: "nav.fretboardTrainer", fallback: "Fretboard Trainer" },
  { href: "/index.html#about", page: "about", key: "nav.about", fallback: "About" }
];
const compactToolItems = navItems.filter(item => [
  "key-finder",
  "song-workspace",
  "fretboard-trainer"
].includes(item.page));

const navbar = ref(null);
const navLinks = ref(null);
const menuButton = ref(null);
const spacer = ref(null);
const routePage = normalizePagePath(window.location.pathname);
const currentPage = computed(() => props.activePage || routePage);
const { translate } = useSiteLocale();
const {
  handleNavClick,
  holdVisible,
  menuOpen,
  toggleMenu
} = useSmartNavbar({ navbar, navLinks, menuButton, spacer });

function isCurrent(item) {
  return currentPage.value === item.page;
}

function isCompactCurrent(item) {
  return routePage === item.page;
}
</script>

<template>
  <nav
    ref="navbar"
    class="navbar navbar-smart-scroll"
    :class="{ 'menu-open': menuOpen }"
    aria-label="Primary navigation"
    @pointerdown="holdVisible"
    @click="holdVisible"
    @focusin="holdVisible"
  >
    <a href="/index.html#home" class="logo">Jam Tracks Hub</a>
    <button
      ref="menuButton"
      class="nav-menu-button"
      type="button"
      aria-controls="primaryNavigation"
      :aria-expanded="String(menuOpen)"
      :aria-label="menuOpen ? 'Close navigation menu' : 'Open navigation menu'"
      @click.stop="toggleMenu"
    >
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
    <ul ref="navLinks" id="primaryNavigation" class="nav-links" @click="handleNavClick">
      <li v-for="item in navItems" :key="item.href">
        <a
          :href="item.href"
          :class="{ active: isCurrent(item) }"
          :aria-current="isCurrent(item) ? 'page' : null"
        >{{ translate(item.key, item.fallback) }}</a>
      </li>
      <li class="nav-compact-tools-item">
        <details
          class="nav-compact-tools"
          :class="{ 'is-active': compactToolItems.some(isCompactCurrent) }"
          @toggle="holdVisible"
        >
          <summary><span>{{ translate("nav.tools", "Tools") }}</span></summary>
          <div class="nav-compact-tools-menu">
            <a
              v-for="item in compactToolItems"
              :key="item.href"
              :href="item.href"
              :class="{ active: isCompactCurrent(item) }"
              :aria-current="isCompactCurrent(item) ? 'page' : null"
            >{{ translate(item.key, item.fallback) }}</a>
          </div>
        </details>
      </li>
      <li class="nav-theme-item">
        <span class="nav-appearance-label">{{ translate("nav.appearance", "Appearance") }}</span>
        <LanguageSwitcher />
        <ThemeToggle />
      </li>
    </ul>
  </nav>
  <div ref="spacer" class="site-navbar-spacer" aria-hidden="true"></div>
</template>
