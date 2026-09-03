<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { pages as englishPages } from "../../locales/en/common.json";
import { pages as traditionalChinesePages } from "../../locales/zh-TW/common.json";
import TrackCard from "../components/tracks/TrackCard.vue";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import {
  RELATIVE_KEY_GROUPS,
  filterAndSortTracks,
  groupsFromSearch,
  loadTracks
} from "../services/tracksData.mjs";

const localeMessages = {
  en: englishPages.tracks,
  "zh-TW": traditionalChinesePages.tracks
};

const { language, translate } = useSiteLocale();
const messages = computed(() => localeMessages[language.value] || localeMessages.en);
const tracks = ref([]);
const selectedGroupIds = ref([]);
const sortMode = ref("newest");
const filterOpen = ref(false);
const loading = ref(true);
const loadFailed = ref(false);
const controls = ref(null);
const grid = ref(null);
let activeFlip = null;
let updateGeneration = 0;

const visibleTracks = computed(() => filterAndSortTracks(
  tracks.value,
  selectedGroupIds.value,
  sortMode.value
));
const availableKeys = computed(() => Array.from(new Set(tracks.value.map(track => track.key))).sort());
const selectedKeys = computed(() => new Set(
  RELATIVE_KEY_GROUPS
    .filter(group => selectedGroupIds.value.includes(group.id))
    .flatMap(group => group.keys)
));
const filterSummary = computed(() => {
  const selected = RELATIVE_KEY_GROUPS.filter(group => selectedGroupIds.value.includes(group.id));
  if (!selected.length) return messages.value.allKeys;
  return selected.length === 1 ? selected[0].label : `${selected[0].label} +${selected.length - 1}`;
});
const resultCount = computed(() => {
  const key = visibleTracks.value.length === 1 ? "resultCount_one" : "resultCount_other";
  return messages.value[key].replace("{{count}}", String(visibleTracks.value.length));
});

function localizedTrackTitle(track) {
  if (language.value !== "zh-TW") return `${track.id} ${track.title}`.trim();
  const coreName = track.title
    .replace(/\s+Backing Track\s+in\s+.+$/i, "")
    .replace(/\s+Backing Track$/i, "")
    .trim() || track.title;
  const key = track.key.replace(/\s+(major|minor)$/i, (_, quality) => (
    ` ${quality.toLowerCase() === "minor" ? "小調" : "大調"}`
  ));
  return `${track.id}《${coreName}》｜${key}吉他即興伴奏`;
}

function localizedTrackKey(track) {
  const match = String(track.key || "").match(/^([A-G](?:#|b)?)\s+(major|minor)$/i);
  if (!match) return track.key;
  const modeKey = match[2].toLowerCase() === "minor"
    ? "pages.chordProgressions.minor"
    : "pages.chordProgressions.major";
  return `${match[1]} ${translate(modeKey, match[2].toLowerCase())}`;
}

function cardElements() {
  return Array.from(grid.value?.querySelectorAll(".track-card:not(.track-skeleton)") || []);
}

function stopActiveFlip() {
  activeFlip?.kill?.();
  activeFlip = null;
  const cards = cardElements();
  window.Flip?.killFlipsOf?.(cards);
  window.gsap?.killTweensOf?.(cards);
  grid.value?.classList.remove("is-flipping-tracks");
}

function dispatchRendered() {
  window.ScrollTrigger?.refresh?.();
  window.dispatchEvent(new CustomEvent("tracks:rendered"));
}

function captureFlipState() {
  const cards = cardElements();
  if (
    !cards.length
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || !window.gsap
    || !window.Flip
  ) return null;
  window.gsap.registerPlugin(window.Flip);
  return window.Flip.getState(cards, { props: "opacity" });
}

function animateFlip(state) {
  const nextCards = cardElements();
  if (!state || !nextCards.length || !window.gsap || !window.Flip) {
    dispatchRendered();
    return;
  }

  grid.value?.classList.add("is-flipping-tracks");
  activeFlip = window.Flip.from(state, {
    targets: nextCards,
    duration: 0.74,
    ease: "power3.inOut",
    absolute: true,
    absoluteOnLeave: true,
    nested: true,
    prune: true,
    fade: true,
    scale: true,
    stagger: { each: 0.022, from: "start" },
    onEnter: elements => window.gsap.fromTo(elements, {
      opacity: 0,
      x: 34,
      y: 10,
      scale: 0.98
    }, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.42,
      stagger: 0.035,
      ease: "power3.out",
      clearProps: "transform,opacity"
    }),
    onLeave: elements => window.gsap.to(elements, {
      opacity: 0,
      x: -28,
      scale: 0.98,
      duration: 0.28,
      stagger: 0.018,
      ease: "power2.in"
    }),
    onComplete: () => {
      activeFlip = null;
      grid.value?.classList.remove("is-flipping-tracks");
      dispatchRendered();
    }
  });
}

async function updateVisibleTracks(mutator) {
  const generation = ++updateGeneration;
  stopActiveFlip();
  const state = captureFlipState();
  mutator?.();
  await nextTick();
  if (generation !== updateGeneration) return;
  animateFlip(state);
}

function toggleFilterPanel() {
  filterOpen.value = !filterOpen.value;
}

function setGroup(groupId, checked) {
  updateVisibleTracks(() => {
    if (groupId === "all") {
      selectedGroupIds.value = [];
      return;
    }
    const selected = new Set(selectedGroupIds.value);
    if (checked) selected.add(groupId);
    else selected.delete(groupId);
    selectedGroupIds.value = RELATIVE_KEY_GROUPS.filter(group => selected.has(group.id)).map(group => group.id);
  });
}

function setSortMode(oldestFirst) {
  updateVisibleTracks(() => {
    sortMode.value = oldestFirst ? "oldest" : "newest";
  });
}

function closeFilterFromOutside(event) {
  if (!event.composedPath().includes(controls.value)) filterOpen.value = false;
}

function closeFilterFromKeyboard(event) {
  if (event.key !== "Enter" || !filterOpen.value) return;
  event.preventDefault();
  filterOpen.value = false;
  document.querySelector(".track-key-filter-toggle")?.focus();
}

watch(language, () => updateVisibleTracks());

onMounted(async () => {
  document.addEventListener("click", closeFilterFromOutside);
  try {
    tracks.value = await loadTracks({ fetchImpl: window.fetch.bind(window) });
    selectedGroupIds.value = groupsFromSearch(window.location.search);
  } catch (error) {
    loadFailed.value = true;
  } finally {
    loading.value = false;
    await nextTick();
    dispatchRendered();
  }
});

onBeforeUnmount(() => {
  updateGeneration += 1;
  stopActiveFlip();
  document.removeEventListener("click", closeFilterFromOutside);
});
</script>

<template>
  <main class="tracks-page tracks-library-page" id="main-content">
    <div class="page-heading-row">
      <div>
        <h1>{{ messages.title }}</h1>
        <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>
      </div>
    </div>

    <section ref="controls" class="track-controls track-toolbar" :aria-label="messages.filtersLabel">
      <div class="track-toolbar-group">
        <span class="track-toolbar-label">{{ messages.filtersLabel }}</span>
        <label class="track-native-filter track-native-filter-hidden">
          <span>{{ messages.keyLabel }}</span>
          <select id="trackKeyFilter" multiple>
            <option value="all" :selected="selectedGroupIds.length === 0">{{ messages.allKeys }}</option>
            <option v-for="key in availableKeys" :key="key" :value="key" :selected="selectedKeys.has(key)">{{ key }}</option>
          </select>
        </label>
        <div
          class="track-key-multiselect"
          :class="{ 'is-open': filterOpen }"
          id="trackKeyPills"
          :aria-label="messages.filterByKey"
          @keydown="closeFilterFromKeyboard"
        >
          <button
            class="track-key-filter-toggle"
            type="button"
            aria-haspopup="true"
            :aria-expanded="String(filterOpen)"
            aria-controls="trackKeyOptions"
            @click.stop="toggleFilterPanel"
          >
            <span>{{ messages.keyLabel }}</span>
            <span data-filter-current>{{ filterSummary }}</span>
          </button>
          <div class="track-key-options" id="trackKeyOptions">
            <template v-for="(group, index) in [{ id: 'all', label: messages.allKeys }, ...RELATIVE_KEY_GROUPS]" :key="group.id">
              <input
                class="track-key-checkbox"
                :id="`track-key-choice-${group.id}`"
                type="checkbox"
                :data-filter-value="group.id"
                :checked="group.id === 'all' ? selectedGroupIds.length === 0 : selectedGroupIds.includes(group.id)"
                @change="setGroup(group.id, $event.target.checked)"
              >
              <label
                class="track-key-checkbox-wrapper"
                :class="{ 'track-key-checkbox-wrapper-all': index === 0 }"
                :for="`track-key-choice-${group.id}`"
              >
                <span class="track-key-checkbox-visual">
                  <span class="track-key-checkbox-inner">{{ group.label }}</span>
                </span>
              </label>
            </template>
          </div>
        </div>
      </div>

      <div class="track-toolbar-group track-toolbar-sort">
        <label class="track-native-filter track-native-filter-hidden">
          <span>{{ messages.sortLabel }}</span>
          <select id="trackSortSelect" :value="sortMode" @change="setSortMode($event.target.value === 'oldest')">
            <option value="newest">{{ messages.newestFirst }}</option>
            <option value="oldest">{{ messages.oldestFirst }}</option>
          </select>
        </label>
        <div class="track-sort-switch-control" id="trackSortPills" :aria-label="messages.sortLabel">
          <span class="track-sort-caption">{{ messages.sortBy }}</span>
          <span class="track-sort-mode track-sort-mode-latest" :class="{ 'is-active': sortMode === 'newest' }">{{ messages.latestFirst }}</span>
          <input
            class="uiverse-toggle-input track-sort-switch-input"
            id="trackSortToggle"
            type="checkbox"
            :checked="sortMode === 'oldest'"
            :aria-label="messages.switchSort"
            @change="setSortMode($event.target.checked)"
          >
          <label class="uiverse-toggle track-sort-switch" for="trackSortToggle"></label>
          <span class="track-sort-mode track-sort-mode-oldest" :class="{ 'is-active': sortMode === 'oldest' }">{{ messages.oldestFirst }}</span>
        </div>
      </div>
    </section>

    <p id="trackResultCount" class="track-result-count" aria-live="polite">{{ loading || loadFailed ? "" : resultCount }}</p>

    <div ref="grid" class="all-tracks-grid" id="tracksGrid" aria-live="polite" :aria-busy="String(loading)">
      <p v-if="loading" class="track-loading track-loading-status" role="status">
        <span class="uiverse-loader jh-loader track-loading-spinner" aria-hidden="true">
          <span class="uiverse-loader-dot jh-loader-dot"></span>
          <span class="uiverse-loader-dot jh-loader-dot"></span>
          <span class="uiverse-loader-dot jh-loader-dot"></span>
        </span>
        <span>{{ messages.loading }}</span>
      </p>
      <p v-else-if="loadFailed" class="track-loading">Could not load data/tracks.json. Please preview this page through the local server instead of opening the file directly.</p>
      <p v-else-if="visibleTracks.length === 0" class="track-loading">{{ messages.noMatches }}</p>
      <template v-else>
        <TrackCard
          v-for="track in visibleTracks"
          :key="track.id"
          :track="track"
          :messages="messages"
          :key-label="localizedTrackKey(track)"
          :track-title-text="localizedTrackTitle(track)"
        />
      </template>
    </div>

    <Teleport to="body">
      <div class="track-scroll-windmill track-scroll-five-blade" aria-hidden="true">
        <svg class="track-scroll-windmill-svg track-scroll-five-blade-svg" viewBox="0 0 160 160" role="img">
          <defs>
            <linearGradient id="trackFiveBlade" x1="28" y1="20" x2="132" y2="142" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#86c3ba" />
              <stop offset="0.46" stop-color="#d6b18c" />
              <stop offset="1" stop-color="#b56a75" />
            </linearGradient>
            <radialGradient id="trackFiveBladeHub" cx="38%" cy="32%" r="68%">
              <stop offset="0" stop-color="#fff7ec" />
              <stop offset="0.58" stop-color="#d8b690" />
              <stop offset="1" stop-color="#7f4f34" />
            </radialGradient>
            <path id="trackFiveBladeShape" d="M80 69 C56 41 56 18 80 5 C104 18 104 41 80 69 Z" />
          </defs>
          <g class="track-scroll-five-blade-rotor">
            <use href="#trackFiveBladeShape" />
            <use href="#trackFiveBladeShape" transform="rotate(72 80 80)" />
            <use href="#trackFiveBladeShape" transform="rotate(144 80 80)" />
            <use href="#trackFiveBladeShape" transform="rotate(216 80 80)" />
            <use href="#trackFiveBladeShape" transform="rotate(288 80 80)" />
            <circle class="track-scroll-five-blade-hub" cx="80" cy="80" r="15" />
            <circle class="track-scroll-five-blade-core" cx="80" cy="80" r="6" />
          </g>
        </svg>
      </div>
    </Teleport>
  </main>
</template>
