<script setup>
import { computed, nextTick, onUnmounted, reactive, ref } from "vue";
import ProgressionChordSection from "../components/progression-writer/ProgressionChordSection.vue";
import ProgressionShapePicker from "../components/progression-writer/ProgressionShapePicker.vue";
import { useProgressionWriter } from "../composables/useProgressionWriter.js";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import {
  collectDownloadProgression,
  PROGRESSION_KEY_ROOTS
} from "../music/progressionWriter.mjs";
import {
  exportProgressionImage,
  exportProgressionJson
} from "../services/progressionWriterExport.mjs";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const localeMessages = { en: englishMessages, "zh-TW": traditionalChineseMessages };
const { language } = useSiteLocale();
const locale = computed(() => localeMessages[language.value] || localeMessages.en);
const messages = computed(() => locale.value.pages.progressionWriter);
const common = computed(() => locale.value.common);
const writer = useProgressionWriter();
const isDownloading = ref(false);
const picker = reactive({
  open: false,
  sectionName: "single",
  uid: "",
  parsed: null,
  voicings: [],
  position: "all",
  rootString: "all"
});
let downloadActionTimer = null;

const sectionDefinitions = computed(() => ({
  single: {
    headingId: "singleProgressionTitle",
    inputName: "singleChord",
    kicker: messages.value.customChords,
    title: messages.value.progression,
    placeholders: ["Cmaj7", "G7", "Am7", "Fmaj7"]
  },
  verse: {
    headingId: "verseProgressionTitle",
    inputName: "verseChord",
    kicker: messages.value.sectionOne,
    title: messages.value.verse,
    placeholders: ["C", "G", "Am", "F"]
  },
  chorus: {
    headingId: "chorusProgressionTitle",
    inputName: "chorusChord",
    kicker: messages.value.sectionTwo,
    title: messages.value.chorus,
    placeholders: ["F", "G", "Em", "Am"]
  }
}));

function focusEntry(uid) {
  nextTick(() => document.querySelector(`[data-entry-id="${uid}"] input`)?.focus());
}

function addChord(sectionName) {
  focusEntry(writer.addChord(sectionName));
}

function deleteChord(sectionName) {
  const uid = writer.deleteChord(sectionName);
  if (uid) focusEntry(uid);
}

function openShapePicker({ sectionName, uid }) {
  const entry = writer.sections[sectionName]?.find(item => item.uid === uid);
  const parsed = writer.shapeEngine.parseChord(entry?.symbol);
  if (!entry || !parsed) return;
  const voicings = writer.shapeEngine.generateVoicings(parsed);
  if (!voicings.length) return;
  Object.assign(picker, {
    open: true,
    sectionName,
    uid,
    parsed,
    voicings,
    position: "all",
    rootString: "all"
  });
  document.body.classList.add("is-shape-picker-open");
}

function closeShapePicker() {
  if (!picker.open) return;
  picker.open = false;
  document.body.classList.remove("is-shape-picker-open");
  focusEntry(picker.uid);
}

function selectShape(shapeIndex) {
  writer.setShape(picker.sectionName, picker.uid, shapeIndex);
  closeShapePicker();
}

function saveProgression() {
  writer.saveProgression();
}

function recordForExport(record = null) {
  const existing = record || (writer.activeSavedProgressionId.value
    ? writer.savedProgressions.value.find(item => item.id === writer.activeSavedProgressionId.value)
    : null);
  const result = record || writer.buildRecord(existing);
  if (!result) {
    writer.setStatus("Add at least one chord before exporting.");
    return null;
  }
  if (result.error) {
    writer.setStatus(result.error);
    return null;
  }
  return result;
}

function exportJson(record = null) {
  const result = recordForExport(record);
  if (!result) return;
  exportProgressionJson(result);
  writer.setStatus("Progression JSON exported.");
}

function triggerDownloadButton() {
  window.clearTimeout(downloadActionTimer);
  isDownloading.value = true;
  downloadActionTimer = window.setTimeout(() => {
    isDownloading.value = false;
  }, 1800);
}

async function downloadImage() {
  triggerDownloadButton();
  const data = collectDownloadProgression(writer.currentState(), writer.shapeEngine);
  if (data.error) {
    writer.setStatus(data.error);
    return;
  }
  const result = await exportProgressionImage(data, {
    separateDownload: writer.separateDownload.value,
    theme: document.documentElement.dataset.theme || "default",
    shapeEngine: writer.shapeEngine
  });
  writer.setStatus(result.format === "png" ? "Progression image downloaded." : "Progression image downloaded as SVG.");
}

function summary(record) {
  return writer.recordSummary(record);
}

onUnmounted(() => {
  window.clearTimeout(downloadActionTimer);
  document.body.classList.remove("is-shape-picker-open");
});
</script>

<template>
  <main id="main-content" class="tracks-page progression-writer-page">
    <div class="page-heading-row progression-writer-heading">
      <div>
        <h1>{{ messages.title }}</h1>
        <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>
      </div>
    </div>

    <section class="progression-writer-panel" aria-labelledby="progressionWriterModeTitle">
      <div class="tool-section-heading progression-writer-copy">
        <span class="result-kicker">{{ messages.format }}</span>
        <h2 id="progressionWriterModeTitle" class="section-title">{{ messages.modeTitle }}</h2>
      </div>
      <div class="progression-writer-mode-control">
        <input
          id="progressionStructureToggle"
          class="uiverse-toggle-input progression-writer-switch-input"
          type="checkbox"
          :checked="writer.mode.value === 'sections'"
          :aria-label="messages.switchStructure"
          @change="writer.setMode($event.target.checked ? 'sections' : 'single')"
        >
        <span class="progression-writer-mode-label progression-writer-mode-without">{{ messages.withoutVerseChorus }}</span>
        <label class="uiverse-toggle progression-writer-switch" for="progressionStructureToggle"></label>
        <span class="progression-writer-mode-label progression-writer-mode-with">{{ messages.withVerseChorus }}</span>
      </div>
    </section>

    <form id="progressionWriterForm" class="progression-writer-form" @submit.prevent="saveProgression">
      <section class="progression-writer-meta" :aria-label="messages.songInformation">
        <div class="progression-writer-meta-field">
          <input id="progressionSongName" v-model="writer.songName.value" class="progression-writer-meta-input" type="text" name="songName" :placeholder="messages.songName" autocomplete="off">
          <label class="progression-writer-meta-label" for="progressionSongName">{{ messages.songName }}</label>
        </div>
        <div class="progression-writer-key-control">
          <div class="progression-writer-meta-field progression-writer-key-field">
            <select id="progressionKeyRoot" v-model="writer.keyRoot.value" class="progression-writer-meta-input progression-writer-meta-select" name="keyRoot">
              <option v-for="root in PROGRESSION_KEY_ROOTS" :key="root" :value="root">{{ root }}</option>
            </select>
            <label class="progression-writer-meta-label" for="progressionKeyRoot">{{ messages.key }}</label>
          </div>
          <div class="progression-key-mode-control">
            <input
              id="progressionKeyQualityToggle"
              class="uiverse-toggle-input progression-writer-switch-input progression-key-mode-input"
              type="checkbox"
              :checked="writer.keyQuality.value === 'minor'"
              :aria-label="messages.switchKeyMode"
              @change="writer.keyQuality.value = $event.target.checked ? 'minor' : 'major'"
            >
            <span class="progression-key-mode-label progression-key-mode-major">{{ messages.major }}</span>
            <label class="uiverse-toggle progression-writer-switch progression-key-mode-switch" for="progressionKeyQualityToggle"></label>
            <span class="progression-key-mode-label progression-key-mode-minor">{{ messages.minor }}</span>
          </div>
        </div>
        <div class="progression-writer-meta-field progression-writer-meta-field-bpm">
          <input id="progressionBpm" v-model="writer.bpm.value" class="progression-writer-meta-input" type="number" name="bpm" :placeholder="messages.bpm" min="20" max="320" inputmode="numeric">
          <label class="progression-writer-meta-label" for="progressionBpm">{{ messages.bpm }}</label>
        </div>
      </section>

      <ProgressionChordSection
        v-if="writer.mode.value === 'single'"
        v-bind="sectionDefinitions.single"
        section-name="single"
        :entries="writer.sections.single"
        :engine="writer.shapeEngine"
        :add-label="messages.addChord"
        :delete-label="messages.deleteChord"
        data-progression-mode="single"
        @add="addChord"
        @delete="deleteChord"
        @update="writer.updateChord"
        @blur="writer.normalizeChord"
        @open-picker="openShapePicker"
      />

      <div v-else class="progression-writer-section-grid" data-progression-mode="sections">
        <ProgressionChordSection
          v-bind="sectionDefinitions.verse"
          section-name="verse"
          :entries="writer.sections.verse"
          :engine="writer.shapeEngine"
          :add-label="messages.addChord"
          :delete-label="messages.deleteChord"
          @add="addChord"
          @delete="deleteChord"
          @update="writer.updateChord"
          @blur="writer.normalizeChord"
          @open-picker="openShapePicker"
        />
        <ProgressionChordSection
          v-bind="sectionDefinitions.chorus"
          section-name="chorus"
          :entries="writer.sections.chorus"
          :engine="writer.shapeEngine"
          :add-label="messages.addChord"
          :delete-label="messages.deleteChord"
          @add="addChord"
          @delete="deleteChord"
          @update="writer.updateChord"
          @blur="writer.normalizeChord"
          @open-picker="openShapePicker"
        />
      </div>

      <div class="progression-writer-actions">
        <button class="primary-button progression-writer-save-button" type="submit">{{ messages.saveProgression }}</button>
        <div class="progression-download-layout-control">
          <input id="separateProgressionDownload" v-model="writer.separateDownload.value" class="uiverse-toggle-input progression-download-layout-input" type="checkbox" :aria-label="messages.downloadLayout">
          <span class="progression-download-layout-label progression-download-layout-full">{{ messages.fullShapeCards }}</span>
          <label class="uiverse-toggle progression-download-layout-switch" for="separateProgressionDownload"></label>
          <span class="progression-download-layout-label progression-download-layout-separated">{{ messages.separateShapes }}</span>
        </div>
        <button
          id="downloadProgressionButton"
          class="uiverse-download-button progression-download-button track-slides-download-link"
          :class="{ 'is-activating': isDownloading }"
          type="button"
          :aria-label="messages.downloadImage"
          :aria-busy="isDownloading ? 'true' : null"
          @click="downloadImage"
        >
          <span class="uiverse-download-button-circle track-slides-download-circle" aria-hidden="true">
            <svg class="uiverse-download-button-icon track-slides-download-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v11m0 0-4-4m4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M6 19h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
            </svg>
            <span class="uiverse-download-button-square track-slides-download-square"></span>
          </span>
        </button>
        <p id="progressionWriterStatus" class="progression-writer-status" role="status" aria-live="polite">{{ writer.status.value }}</p>
      </div>
    </form>

    <ProgressionShapePicker
      :common="common"
      :engine="writer.shapeEngine"
      :messages="messages"
      :open="picker.open"
      :parsed="picker.parsed"
      :position="picker.position"
      :root-string="picker.rootString"
      :voicings="picker.voicings"
      @close="closeShapePicker"
      @select="selectShape"
      @update:position="picker.position = $event"
      @update:root-string="picker.rootString = $event"
    />

    <section class="progression-writer-saved" aria-labelledby="savedWriterProgressionsTitle">
      <div class="progression-writer-saved-heading">
        <div><h2 id="savedWriterProgressionsTitle" class="section-title">{{ messages.savedProgression }}</h2></div>
        <span id="writerSavedProgressionCount" class="progression-writer-saved-count">{{ writer.savedCountText.value }}</span>
      </div>
      <div class="progression-writer-saved-controls">
        <label class="progression-writer-saved-picker" for="writerSavedProgressionPicker">
          <span>{{ messages.savedPicker }}</span>
          <select
            id="writerSavedProgressionPicker"
            :value="writer.selectedSavedId.value"
            :disabled="!writer.savedProgressions.value.length"
            @change="writer.selectSaved($event.target.value)"
          >
            <option v-if="!writer.savedProgressions.value.length" value="">{{ messages.noSavedOption }}</option>
            <option v-for="record in writer.savedProgressions.value" :key="record.id" :value="record.id">
              {{ [record.songName || summary(record).title, record.key, record.bpm ? `${record.bpm} BPM` : ""].filter(Boolean).join(" | ") }}
            </option>
          </select>
        </label>
        <div class="progression-writer-saved-actions">
          <button id="writerLoadProgressionButton" class="secondary-button" type="button" :disabled="!writer.savedProgressions.value.length" @click="writer.loadSelected"><span>{{ common.load }}</span></button>
          <button id="writerDuplicateProgressionButton" class="secondary-button" type="button" @click="writer.duplicateProgression()"><span>{{ common.duplicate }}</span></button>
          <button id="writerClearProgressionButton" class="secondary-button" type="button" @click="writer.clearCurrentProgression"><span>{{ common.clearAll }}</span></button>
          <button id="writerExportJsonButton" class="secondary-button" type="button" @click="exportJson()"><span>{{ common.exportJson }}</span></button>
        </div>
      </div>
      <div id="writerSavedProgressions" class="progression-writer-saved-list">
        <p v-if="!writer.savedProgressions.value.length" class="saved-progression-empty">{{ messages.noSavedOption }}.</p>
        <article
          v-for="record in writer.savedProgressions.value"
          v-else
          :key="record.id"
          class="progression-writer-saved-item"
          :class="{ 'is-active': record.id === writer.activeSavedProgressionId.value }"
        >
          <div class="progression-writer-saved-summary">
            <strong>{{ summary(record).title }}</strong>
            <span v-if="summary(record).meta">{{ summary(record).meta }}</span>
            <template v-if="record.mode === 'sections'">
              <span>Verse: {{ summary(record).verse }}</span>
              <span>Chorus: {{ summary(record).chorus }}</span>
            </template>
            <span v-else>{{ summary(record).single }}</span>
          </div>
          <div class="progression-writer-saved-item-actions">
            <button class="secondary-button" type="button" :data-load-progression="record.id" @click="writer.applyProgressionRecord(record)"><span>Load</span></button>
            <button class="secondary-button" type="button" :data-duplicate-progression="record.id" @click="writer.duplicateProgression(record)"><span>Duplicate</span></button>
            <button class="secondary-button" type="button" :data-export-progression="record.id" @click="exportJson(record)"><span>JSON</span></button>
            <button class="secondary-button saved-progression-delete" type="button" :data-delete-progression="record.id" @click="writer.deleteSavedProgression(record.id)"><span>Delete</span></button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
