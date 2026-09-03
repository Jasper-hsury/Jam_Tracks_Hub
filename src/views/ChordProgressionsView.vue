<script setup>
import { computed, nextTick, ref, watch } from "vue";
import ProgressionLibrary from "../components/chords/ProgressionLibrary.vue";
import { useChordProgressions } from "../composables/useChordProgressions.js";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import { PROGRESSION_COPY_TRANSLATION_KEYS } from "../music/chordProgressions.mjs";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const localeMessages = {
  en: englishMessages,
  "zh-TW": traditionalChineseMessages
};
const { language } = useSiteLocale();
const messages = computed(() => {
  const locale = localeMessages[language.value] || localeMessages.en;
  return {
    ...locale.pages.chordProgressions,
    dictionaryLabel: locale.nav.chordDictionary,
    rootPositionLabel: locale.pages.chordDictionary.rootPosition
  };
});
const copyMessages = computed(() => (localeMessages[language.value] || localeMessages.en).progression.extra);
const state = useChordProgressions();
const modePrompt = ref(false);

function format(template, variables) {
  return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  );
}

function translateCopy(value) {
  const key = PROGRESSION_COPY_TRANSLATION_KEYS[value];
  const segment = key?.split(".").at(-1);
  return segment && copyMessages.value[segment] ? copyMessages.value[segment] : value;
}

function changeMode(event) {
  state.setMode(event.target.checked ? "minor" : "major");
  modePrompt.value = true;
}

async function chooseKey(definition) {
  state.selectKey(definition);
  modePrompt.value = false;
  await nextTick();
  document.getElementById("keyResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectAnother() {
  state.selectAnotherKey();
  modePrompt.value = false;
}

watch(language, () => {
  if (!state.selectedKey.value) modePrompt.value = false;
});
</script>

<template>
  <main class="tracks-page" id="main-content">
    <h1>{{ messages.title }}</h1>
    <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>

    <section class="key-selector" aria-labelledby="progressionExplorerTitle">
      <div class="tool-section-heading">
        <h2 id="progressionExplorerTitle" class="section-title">{{ messages.explorerTitle }}</h2>
        <p>{{ messages.intro }}</p>
      </div>

      <a class="select-key-button progression-write-link" href="progression-writer.html">{{ messages.writeOwn }}</a>

      <button
        class="select-key-button"
        id="selectKeyButton"
        type="button"
        :hidden="!state.selectedKey.value"
        @click="selectAnother"
      >{{ messages.selectAnother }}</button>

      <div class="key-options" id="keyOptions" :hidden="Boolean(state.selectedKey.value)" :data-key-mode="state.mode.value">
        <div class="key-mode-heading">
          <div>
            <span class="result-kicker">{{ messages.keyMode }}</span>
            <h2 class="section-title">{{ messages.chooseTonic }}</h2>
          </div>
          <label class="key-mode-switch" for="keyModeToggle">
            <span class="key-mode-label key-mode-label-major">{{ messages.major }}</span>
            <span class="key-mode-toggle-shell">
              <input
                class="key-mode-toggle-input"
                id="keyModeToggle"
                type="checkbox"
                :checked="state.mode.value === 'minor'"
                :aria-label="messages.switchMode"
                @change="changeMode"
              >
              <span class="key-mode-toggle-handle-wrapper">
                <span class="key-mode-toggle-handle">
                  <span class="key-mode-toggle-knob"></span>
                  <span class="key-mode-toggle-bar-wrapper"><span class="key-mode-toggle-bar"></span></span>
                </span>
              </span>
              <span class="key-mode-toggle-base"><span class="key-mode-toggle-base-inside"></span></span>
            </span>
            <span class="key-mode-label key-mode-label-minor">{{ messages.minor }}</span>
          </label>
        </div>
        <div class="key-button-grid">
          <button
            v-for="button in state.keyButtons.value"
            :key="button.definition.majorKey"
            class="key-button"
            type="button"
            :aria-label="`${button.key} progressions`"
            :aria-pressed="String(state.selectedDefinition.value === button.definition)"
            @click="chooseKey(button.definition)"
          >{{ button.label }}</button>
        </div>
      </div>

      <div class="key-result" id="keyResult">
        <template v-if="!state.selectedKey.value">
          <h3>{{ modePrompt ? format(messages.selectMajorKey, { mode: state.mode.value }) : messages.selectKey }}</h3>
          <p>{{ modePrompt ? messages.selectTonicCopy : messages.selectKeyCopy }}</p>
        </template>
        <template v-else>
          <div class="selected-key-heading progression-selected-heading">
            <div>
              <span class="result-kicker">{{ messages.selectedKey }}</span>
              <h3>{{ state.selectedKey.value.key }}</h3>
            </div>
          </div>
          <section class="progression-section progression-library-section">
            <div class="progression-toolbar progression-toolbar-simple">
              <div class="progression-toolbar-heading">
                <span class="result-kicker">{{ messages.chordLibrary }}</span>
                <h4>{{ messages.commonProgressions }}</h4>
                <p>{{ messages.libraryIntro }}</p>
              </div>
              <div class="progression-chord-mode-control">
                <span>{{ messages.chords }}</span>
                <div class="progression-extension-toggle" role="group" :aria-label="messages.chordType">
                  <button
                    class="progression-extension-option"
                    :class="{ 'is-selected': state.extension.value === 'triads' }"
                    type="button"
                    data-chord-extension="triads"
                    :aria-pressed="String(state.extension.value === 'triads')"
                    @click="state.setExtension('triads')"
                  >{{ messages.triads }}</button>
                  <button
                    class="progression-extension-option"
                    :class="{ 'is-selected': state.extension.value === 'sevenths' }"
                    type="button"
                    data-chord-extension="sevenths"
                    :aria-pressed="String(state.extension.value === 'sevenths')"
                    @click="state.setExtension('sevenths')"
                  >{{ messages.sevenths }}</button>
                </div>
              </div>
            </div>
            <ProgressionLibrary
              :key="`${language}-${state.selectedKey.value.key}-${state.extension.value}`"
              :chord-map="state.chordMap.value"
              :messages="messages"
              :progressions="state.progressions.value"
              :root-position-label="messages.rootPositionLabel"
              :translate-copy="translateCopy"
            />
          </section>
        </template>
      </div>
    </section>
  </main>
</template>
