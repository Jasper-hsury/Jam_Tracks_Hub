<script setup>
import { computed, onUnmounted, ref } from "vue";
import ScaleFretboard from "../components/scale/ScaleFretboard.vue";
import { useScaleExplorer } from "../composables/useScaleExplorer.js";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import { ROOTS, SCALE_CATALOG, scaleModeForTools } from "../music/scaleExplorer.mjs";
import { createScaleAudioPlayer } from "../services/scaleAudio.mjs";
import { downloadScalePng } from "../services/scaleExport.mjs";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const localeMessages = {
  en: englishMessages,
  "zh-TW": traditionalChineseMessages
};
const { language } = useSiteLocale();
const state = useScaleExplorer();
const audioPlayer = createScaleAudioPlayer();
const isPlaying = ref(false);
const isDownloading = ref(false);
const locale = computed(() => localeMessages[language.value] || localeMessages.en);
const messages = computed(() => locale.value.pages.scaleExplorer);
const translatedScale = computed(() => locale.value.scale[state.scale.value.translationId] || {
  name: state.scale.value.name,
  description: state.scale.value.description
});
const scaleTitle = computed(() => `${state.root.value} ${translatedScale.value.name}`);
const fretboardLabel = computed(() => format(messages.value.fretboardLabel, { scale: scaleTitle.value }));
const chordQuality = computed(() => scaleModeForTools(state.scaleId.value) === "minor" ? "minor" : "major");

function format(template, variables) {
  return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  );
}

async function playScale() {
  try {
    await audioPlayer.play({
      rootPitch: state.rootPitch.value,
      scaleId: state.scaleId.value,
      onStateChange: value => {
        isPlaying.value = value;
      }
    });
  } catch (error) {
    isPlaying.value = false;
    console.error("Scale audio playback failed:", error);
  }
}

async function downloadScale() {
  if (isDownloading.value) return;
  isDownloading.value = true;
  try {
    await downloadScalePng({
      rootPitch: state.rootPitch.value,
      scaleId: state.scaleId.value,
      fretStart: state.fretStart.value,
      fretEnd: state.fretEnd.value,
      labelMode: state.labelMode.value,
      localizedScaleName: translatedScale.value.name,
      saveImageHint: messages.value.saveImageHint
    });
  } catch (error) {
    console.error("Scale image download failed:", error);
  } finally {
    isDownloading.value = false;
  }
}

onUnmounted(() => audioPlayer.dispose(value => {
  isPlaying.value = value;
}));
</script>

<template>
  <main class="tracks-page scale-page" id="main-content">
    <header class="scale-page-heading">
      <p class="home-eyebrow">{{ messages.eyebrow }}</p>
      <h1>{{ messages.title }}</h1>
      <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>
    </header>

    <section class="scale-workspace" aria-labelledby="scaleControlsHeading">
      <div class="scale-control-panel">
        <div class="scale-control-heading">
          <div>
            <p class="scale-section-kicker">{{ messages.build }}</p>
            <h2 id="scaleControlsHeading">{{ messages.chooseSound }}</h2>
          </div>
          <p>{{ messages.standardTuning }}</p>
        </div>

        <div class="scale-control-grid">
          <label class="scale-select-field" for="scaleType">
            <span>{{ messages.scaleType }}</span>
            <select id="scaleType" :value="state.scaleId.value" @change="state.setScale($event.target.value)">
              <option v-for="scale in SCALE_CATALOG" :key="scale.id" :value="scale.id">{{ scale.name }}</option>
            </select>
          </label>

          <fieldset class="scale-root-field">
            <legend>{{ messages.rootNote }}</legend>
            <div class="scale-root-grid" id="scaleRootGrid">
              <button
                v-for="root in ROOTS"
                :key="root.pitch"
                type="button"
                :data-root="root.pitch"
                :class="{ 'is-selected': state.rootPitch.value === root.pitch }"
                :aria-pressed="String(state.rootPitch.value === root.pitch)"
                @click="state.setRoot(root.pitch)"
              >{{ root.label }}</button>
            </div>
          </fieldset>
        </div>
      </div>

      <div class="scale-summary" aria-live="polite">
        <div>
          <p class="scale-section-kicker">{{ messages.currentScale }}</p>
          <h2 id="scaleTitle">{{ scaleTitle }}</h2>
          <p id="scaleDescription">{{ translatedScale.description }}</p>
        </div>
        <div class="scale-summary-actions">
          <button class="scale-play-button" id="playScaleButton" type="button" :disabled="isPlaying" @click="playScale">
            <span aria-hidden="true">&#9654;</span>
            <span>{{ isPlaying ? messages.playing : messages.playScale }}</span>
          </button>
          <button class="scale-download-button" id="downloadScaleButton" type="button" :disabled="isDownloading" @click="downloadScale">
            <span aria-hidden="true">&#8595;</span>
            <span>{{ isDownloading ? messages.preparing : messages.downloadPng }}</span>
          </button>
        </div>
        <div class="scale-interval-list" id="scaleIntervalList" :aria-label="messages.scaleIntervals">
          <span
            v-for="interval in state.intervals.value"
            :key="interval.interval"
            class="scale-interval-chip"
            :class="[`interval-color-${interval.index}`, { 'is-root': interval.tonic }]"
          >
            <strong>{{ interval.degree }}</strong>
            <small>{{ interval.note }}</small>
          </span>
        </div>
        <div class="scale-tool-links" id="scaleToolLinks" :aria-label="messages.relatedTools">
          <a :href="state.toolUrls.value.chordDictionary">{{ format(messages.openChordShapes, { root: `${state.root.value} ${chordQuality}` }) }}</a>
          <a :href="state.toolUrls.value.chordProgressions">{{ messages.buildProgressions }}</a>
          <a :href="state.toolUrls.value.fretboardTrainer">{{ messages.practiceNoteNames }}</a>
        </div>
      </div>

      <div class="scale-display-toolbar">
        <fieldset class="scale-length-field">
          <legend>{{ messages.guitarNeck }}</legend>
          <div class="segmented-control scale-length-toggle" id="scaleLengthToggle">
            <button
              v-for="count in [15, 22]"
              :key="count"
              type="button"
              :data-fret-count="count"
              :class="{ 'is-selected': state.neckFrets.value === count }"
              :aria-pressed="String(state.neckFrets.value === count)"
              @click="state.setNeckFrets(count)"
            >{{ format(messages.frets, { count }) }}</button>
          </div>
        </fieldset>

        <fieldset class="scale-view-field">
          <legend>{{ messages.fretRange }}</legend>
          <div class="scale-range-buttons" id="scaleRangeButtons">
            <button
              v-for="range in state.ranges.value"
              :key="`${range.start}-${range.end}`"
              type="button"
              :data-start="range.start"
              :data-end="range.end"
              :class="{ 'is-selected': state.fretStart.value === range.start && state.fretEnd.value === range.end }"
              :aria-pressed="String(state.fretStart.value === range.start && state.fretEnd.value === range.end)"
              @click="state.setRange(range.start, range.end)"
            >{{ range.label }}</button>
          </div>
        </fieldset>

        <fieldset class="scale-label-field">
          <legend>{{ messages.markerLabels }}</legend>
          <div class="segmented-control scale-label-toggle">
            <button
              type="button"
              data-label-mode="note"
              :class="{ 'is-selected': state.labelMode.value === 'note' }"
              :aria-pressed="String(state.labelMode.value === 'note')"
              @click="state.setLabelMode('note')"
            >{{ messages.notes }}</button>
            <button
              type="button"
              data-label-mode="degree"
              :class="{ 'is-selected': state.labelMode.value === 'degree' }"
              :aria-pressed="String(state.labelMode.value === 'degree')"
              @click="state.setLabelMode('degree')"
            >{{ messages.degrees }}</button>
          </div>
        </fieldset>
      </div>

      <div class="fretboard-card">
        <div class="fretboard-help">
          <span><i class="scale-legend-root" aria-hidden="true"></i><span>{{ messages.root }}</span></span>
          <span>{{ messages.scrollHint }}</span>
        </div>
        <div class="fretboard-scroll" tabindex="0" :aria-label="messages.guitarNeck">
          <ScaleFretboard :aria-label="fretboardLabel" :render-data="state.renderData.value" :string-label="messages.string" />
        </div>
      </div>
    </section>
  </main>
</template>
