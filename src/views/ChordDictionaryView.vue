<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import ChordDictionaryDiagram from "../components/chords/ChordDictionaryDiagram.vue";
import { useChordDictionary } from "../composables/useChordDictionary.js";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import {
  chordDisplayName,
  chordNoteNames,
  chordSymbolText,
  parseChordSymbolInput,
  POSITION_TARGETS,
  relatedToolUrls,
  ROOTS,
  rootStringLabel,
  TUNING_MIDI
} from "../music/chordDictionary.mjs";
import { createChordDictionaryAudioPlayer } from "../services/chordDictionaryAudio.mjs";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const localeMessages = { en: englishMessages, "zh-TW": traditionalChineseMessages };
const descriptionKeyById = {
  major: "major", minor: "minor", dominant7: "7", major7: "maj7",
  minor7: "m7", halfDiminished7: "m7b5", sus4: "sus4", sus2: "sus2"
};
const { language } = useSiteLocale();
const locale = computed(() => localeMessages[language.value] || localeMessages.en);
const messages = computed(() => locale.value.pages.chordDictionary);
const common = computed(() => locale.value.common);
const state = useChordDictionary();
const shapeGrid = ref(null);
const dictionaryDetail = ref(null);
const isPlaying = ref(false);
const audioPlayer = createChordDictionaryAudioPlayer();
const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const selectedName = computed(() => chordDisplayName(state.rootPitch.value, state.chord.value));
const selectedSymbol = computed(() => chordSymbolText(state.rootPitch.value, state.chord.value));
const selectedNotes = computed(() => chordNoteNames(state.rootPitch.value, state.chord.value).join(" · "));
const selectedDescription = computed(() => {
  const key = descriptionKeyById[state.chord.value.id];
  return key ? locale.value.chord.description[key] : state.chord.value.description;
});
const toolUrls = computed(() => relatedToolUrls(state.rootPitch.value, state.chord.value));
const shapeStartIndex = computed(() => state.page.value * 12);
const shapeCountText = computed(() => {
  const count = state.filteredVoicings.value.length;
  const total = state.voicings.value.length;
  const filtered = state.position.value !== "all" || state.rootString.value !== "all" || state.triadSet.value !== "all";
  const key = filtered
    ? (count === 1 ? "shapeCountFiltered_one" : "shapeCountFiltered_other")
    : (count === 1 ? "shapeCount_one" : "shapeCount_other");
  return format(messages.value[key], filtered ? { count, total } : { count });
});
const emptyPositionLabel = computed(() => state.position.value === "all" ? "all positions" : `near fret ${state.position.value}`);
const emptyRootStringLabel = computed(() => state.rootString.value === "all" ? "any root string" : `root on ${rootStringLabel(state.rootString.value)}`);
const emptyHelp = computed(() => state.triadSet.value !== "all" && !state.stringSetAllowed.value
  ? "The 1-3 view is for triads; the 1-4 and 1-5 views support triads and four-note seventh chords."
  : "Choose another fret area, root string, string set, or select All.");

function format(template, variables) {
  return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  );
}

function dispatchShapesRendered() {
  window.dispatchEvent(new CustomEvent("dictionary:shapes-rendered", { detail: { root: shapeGrid.value } }));
}

function flipState() {
  if (reduceMotion || !window.gsap || !window.Flip || !shapeGrid.value?.querySelector(".chord-shape-card")) return null;
  return window.Flip.getState(".chord-dictionary-page .chord-shape-card", { props: "opacity" });
}

async function transitionShapes(update, scrollTarget = null) {
  const previous = flipState();
  if (previous) shapeGrid.value.classList.add("is-flipping-shapes");
  update();
  await nextTick();
  const cards = Array.from(shapeGrid.value?.querySelectorAll(".chord-shape-card") || []);
  if (!previous || !cards.length) {
    shapeGrid.value?.classList.remove("is-flipping-shapes", "is-preparing-shapes");
    dispatchShapesRendered();
  } else {
    window.gsap.registerPlugin(window.Flip);
    window.Flip.from(previous, {
      targets: cards,
      duration: 0.58,
      ease: "power3.inOut",
      absolute: true,
      absoluteOnLeave: true,
      nested: true,
      prune: true,
      fade: true,
      scale: true,
      stagger: { each: 0.018, from: "start" },
      onEnter: elements => window.gsap.fromTo(elements, { opacity: 0, y: 18, scale: 0.98 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.026,
        ease: "power3.out", clearProps: "transform,opacity"
      }),
      onLeave: elements => window.gsap.to(elements, {
        opacity: 0, y: -12, scale: 0.985, duration: 0.24, stagger: 0.012, ease: "power2.in"
      }),
      onComplete: () => {
        shapeGrid.value?.classList.remove("is-flipping-shapes");
        dispatchShapesRendered();
      }
    });
  }
  if (scrollTarget) scrollTarget.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectRoot(pitch) {
  transitionShapes(() => state.selectRoot(pitch));
}

function selectChord(chordId) {
  transitionShapes(() => state.selectChord(chordId), dictionaryDetail);
}

function search(event) {
  const value = event.target.value;
  if (parseChordSymbolInput(value)) transitionShapes(() => state.setSearch(value));
  else state.setSearch(value);
}

function selectPosition(value) {
  transitionShapes(() => state.setPosition(value));
}

function selectRootString(value) {
  transitionShapes(() => state.setRootString(value));
}

function selectTriadSet(value) {
  transitionShapes(() => state.setTriadSet(value));
}

function previousPage() {
  transitionShapes(state.previousPage, shapeGrid);
}

function nextPage() {
  transitionShapes(state.nextPage, shapeGrid);
}

async function playChord() {
  const frets = state.filteredVoicings.value[0]?.frets;
  if (!frets) return;
  try {
    await audioPlayer.play({ frets, tuningMidi: TUNING_MIDI, onStateChange: value => { isPlaying.value = value; } });
  } catch (error) {
    isPlaying.value = false;
    console.error("Chord audio playback failed:", error);
  }
}

onMounted(() => nextTick(dispatchShapesRendered));
onUnmounted(() => audioPlayer.dispose(value => { isPlaying.value = value; }));
</script>

<template>
  <main class="tracks-page chord-dictionary-page" id="main-content">
    <header class="dictionary-heading">
      <p class="home-eyebrow">{{ messages.eyebrow }}</p>
      <h1>{{ messages.title }}</h1>
      <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>
    </header>

    <section class="dictionary-workspace" aria-labelledby="dictionaryBrowseTitle">
      <div class="dictionary-browser">
        <div class="dictionary-browser-heading">
          <div>
            <p class="dictionary-kicker">{{ messages.step }}</p>
            <h2 id="dictionaryBrowseTitle">{{ messages.browseTitle }}</h2>
          </div>
          <label class="dictionary-search" for="chordSearch">
            <span>{{ messages.searchLabel }}</span>
            <input id="chordSearch" type="search" :value="state.searchText.value" :placeholder="messages.searchPlaceholder" autocomplete="off" @input="search">
          </label>
        </div>

        <fieldset class="dictionary-root-field">
          <legend>{{ messages.rootNote }}</legend>
          <div class="dictionary-root-grid" id="dictionaryRootGrid">
            <button
              v-for="(root, pitch) in ROOTS"
              :key="root"
              type="button"
              :data-root="pitch"
              :class="{ 'is-selected': state.rootPitch.value === pitch }"
              :aria-pressed="String(state.rootPitch.value === pitch)"
              @click="selectRoot(pitch)"
            >{{ root }}</button>
          </div>
        </fieldset>

        <div class="dictionary-categories" id="chordCategoryList" aria-live="polite">
          <section v-for="category in state.categories.value" :key="category.id" class="dictionary-category">
            <div class="dictionary-category-heading">
              <div><h3>{{ category.name }}</h3><p>{{ category.description }}</p></div>
              <span>{{ category.chords.length }}</span>
            </div>
            <div class="dictionary-quality-grid">
              <button
                v-for="chord in category.chords"
                :key="chord.id"
                type="button"
                class="dictionary-quality-button"
                :data-chord-id="chord.id"
                :class="{ 'is-selected': state.chordId.value === chord.id }"
                :aria-pressed="String(state.chordId.value === chord.id)"
                @click="selectChord(chord.id)"
              ><strong>{{ chord.name }}</strong><span>{{ ROOTS[state.rootPitch.value] }}{{ chord.suffix || " major" }}</span></button>
            </div>
          </section>
          <div v-if="!state.categories.value.length" class="dictionary-empty">
            <strong>No chord types found.</strong>
            <span>Try a broader term such as seventh, minor, suspended, or altered.</span>
          </div>
        </div>
      </div>

      <aside ref="dictionaryDetail" class="dictionary-detail" aria-labelledby="selectedChordName">
        <div class="dictionary-detail-heading">
          <div>
            <p class="dictionary-kicker">{{ messages.selectedChord }}</p>
            <h2 id="selectedChordName">{{ selectedName }}</h2>
            <p id="selectedChordDescription">{{ selectedDescription }}</p>
          </div>
          <button class="dictionary-play-button" id="playChordButton" type="button" :disabled="isPlaying" @click="playChord">
            <span aria-hidden="true">&#9654;</span><span>{{ isPlaying ? messages.playing : messages.playChord }}</span>
          </button>
        </div>

        <dl class="dictionary-facts">
          <div><dt>{{ messages.symbol }}</dt><dd id="selectedChordSymbol">{{ selectedSymbol }}</dd></div>
          <div><dt>{{ messages.formula }}</dt><dd id="selectedChordFormula">{{ state.chord.value.formula.join(" · ") }}</dd></div>
          <div><dt>{{ messages.notes }}</dt><dd id="selectedChordNotes">{{ selectedNotes }}</dd></div>
        </dl>

        <div class="dictionary-related-actions" id="dictionaryRelatedActions" :aria-label="messages.relatedTools">
          <a :href="toolUrls.scale">{{ messages.viewScale }}</a>
          <a :href="toolUrls.progressions">{{ messages.buildProgressions }}</a>
          <a :href="toolUrls.fretboard">{{ messages.practiceNotes }}</a>
        </div>

        <div class="dictionary-shape-heading">
          <div><h3>{{ messages.availableShapes }}</h3><p>{{ messages.shapeHelp }}</p></div>
          <span id="shapeCount">{{ shapeCountText }}</span>
        </div>

        <div class="dictionary-position-filter" id="shapePositionFilter" aria-label="Filter chord shapes by fret area">
          <span>{{ messages.position }}</span>
          <button type="button" :class="{ 'is-selected': state.position.value === 'all' }" :aria-pressed="String(state.position.value === 'all')" data-position="all" @click="selectPosition('all')">{{ common.all }}</button>
          <button
            v-for="fret in POSITION_TARGETS"
            :key="fret"
            type="button"
            :data-position="fret"
            :class="{ 'is-selected': state.position.value === String(fret) }"
            :aria-pressed="String(state.position.value === String(fret))"
            @click="selectPosition(String(fret))"
          >{{ format(messages.near, { fret }) }}</button>
        </div>

        <div class="dictionary-position-filter dictionary-root-string-filter" id="shapeRootStringFilter" aria-label="Filter chord shapes by root string">
          <span>{{ messages.rootString }}</span>
          <button
            v-for="item in [{ value: 'all', label: common.all }, { value: '6', label: '6th E' }, { value: '5', label: '5th A' }, { value: '4', label: '4th D' }, { value: '3', label: '3rd G' }, { value: '2', label: '2nd B' }, { value: '1', label: '1st e' }]"
            :key="item.value"
            type="button"
            :data-root-string="item.value"
            :class="{ 'is-selected': state.rootString.value === item.value }"
            :aria-pressed="String(state.rootString.value === item.value)"
            @click="selectRootString(item.value)"
          >{{ item.label }}</button>
        </div>

        <div class="dictionary-position-filter dictionary-triad-filter" id="shapeTriadFilter" aria-label="Filter chord shapes by string set">
          <span>{{ messages.stringSet }}</span>
          <button
            v-for="item in [{ value: 'all', label: messages.allShapes }, { value: 'top-three', label: messages.topThree }, { value: 'top-four', label: messages.topFour }, { value: 'top-five', label: messages.topFive }]"
            :key="item.value"
            type="button"
            :data-triad-set="item.value"
            :class="{ 'is-selected': state.triadSet.value === item.value }"
            :aria-pressed="String(state.triadSet.value === item.value)"
            @click="selectTriadSet(item.value)"
          >{{ item.label }}</button>
        </div>

        <div ref="shapeGrid" class="dictionary-shape-grid" id="chordShapeGrid">
          <ChordDictionaryDiagram
            v-for="(voicing, index) in state.visibleVoicings.value"
            :key="`${shapeStartIndex + index}-${voicing.frets.join(',')}`"
            :chord="state.chord.value"
            :index="shapeStartIndex + index"
            :root-pitch="state.rootPitch.value"
            :voicing="voicing"
          />
          <div v-if="!state.filteredVoicings.value.length" class="dictionary-empty">
            <strong>No shapes found for {{ emptyPositionLabel }} with {{ emptyRootStringLabel }}.</strong>
            <span>{{ emptyHelp }}</span>
          </div>
        </div>
        <nav class="dictionary-pagination" id="shapePagination" aria-label="Chord shape pages" :hidden="state.pageCount.value <= 1">
          <button id="previousShapesButton" type="button" :disabled="state.page.value === 0" @click="previousPage">{{ common.previous }}</button>
          <span id="shapePageStatus" aria-live="polite">{{ format(messages.pageStatus, { page: state.page.value + 1, total: state.pageCount.value }) }}</span>
          <button id="nextShapesButton" type="button" :disabled="state.page.value >= state.pageCount.value - 1" @click="nextPage">{{ common.next }}</button>
        </nav>
      </aside>
    </section>
  </main>
</template>
