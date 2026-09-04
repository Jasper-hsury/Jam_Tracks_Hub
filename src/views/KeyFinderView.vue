<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import KeyFinderError from "../components/key-finder/KeyFinderError.vue";
import KeyFinderProgress from "../components/key-finder/KeyFinderProgress.vue";
import KeyFinderResult from "../components/key-finder/KeyFinderResult.vue";
import { useKeyFinder } from "../composables/useKeyFinder.js";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const localeMessages = { en: englishMessages, "zh-TW": traditionalChineseMessages };
const { language } = useSiteLocale();
const locale = computed(() => localeMessages[language.value] || localeMessages.en);
const messages = computed(() => locale.value.pages.keyFinder);
const dynamic = computed(() => locale.value.keyFinder.dynamic);
const common = computed(() => locale.value.common);
const finder = useKeyFinder();
const resultRegion = ref(null);

const apiStatusText = computed(() => messages.value[finder.apiStatus.code] || messages.value.checkingApi);
const helperStatusText = computed(() => messages.value[finder.helperStatus.code] || messages.value.checkingYoutube);
const serviceWakeTitle = computed(() => finder.apiStatus.state === "is-offline" ? messages.value.unavailableTitle : messages.value.wakingTitle);
const serviceWakeCopy = computed(() => finder.apiStatus.state === "is-offline" ? messages.value.unavailableCopy : messages.value.wakingCopy);
const serviceWakeVisible = computed(() => finder.apiStatus.state !== "is-online");
const resultClass = computed(() => {
  if (["submitting", "queued", "processing"].includes(finder.phase.value)) return "is-loading";
  if (["validation-error", "failed", "cancelled"].includes(finder.phase.value)) return "is-error";
  if (finder.result.value) return `result-mode-${finder.currentResultMode.value}`;
  return "key-finder-empty";
});
const errorStatusText = computed(() => finder.error.value?.inputType === "youtube" ? helperStatusText.value : apiStatusText.value);
const plainStatusText = computed(() => ({
  "empty-file": messages.value.emptyFile,
  "empty-youtube": messages.value.emptyYoutube,
  "file-too-large": messages.value.fileTooLarge,
  "container-too-large": messages.value.containerTooLarge,
  stopped: messages.value.stopped
})[finder.error.value?.code] || "");

function handleFileChange(event) {
  finder.selectedFile.value = event.target.files?.[0] || null;
}

function showHistory(item) {
  if (!finder.showHistoryItem(item)) return;
  nextTick(() => {
    resultRegion.value?.focus({ preventScroll: true });
    resultRegion.value?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

watch(() => finder.phase.value, (phase, previous) => {
  if (phase === "succeeded" && previous !== "succeeded") {
    nextTick(() => resultRegion.value?.focus({ preventScroll: true }));
  }
});

onMounted(finder.initialize);
onUnmounted(finder.dispose);
</script>

<template>
  <main id="main-content" class="tracks-page key-finder-page">
    <h1>{{ messages.title }}</h1>
    <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>

    <section class="key-finder-panel" aria-labelledby="keyFinderTitle">
      <div class="tool-section-heading compact-heading">
        <h2 id="keyFinderTitle" class="section-title">{{ messages.analyzeTitle }}</h2>
        <p>{{ messages.intro }}</p>
      </div>

      <div class="key-finder-status-row">
        <div class="api-status" :class="finder.apiStatus.state" role="status" aria-live="polite">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="status-text">{{ apiStatusText }}</span>
        </div>
        <div class="api-status helper-status" :class="finder.helperStatus.state" role="status" aria-live="polite">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="status-text">{{ helperStatusText }}</span>
        </div>
        <button
          v-if="finder.helperStatus.state === 'is-offline'"
          class="text-button helper-start-button"
          type="button"
          @click="finder.startYoutubeHelper"
        >{{ messages.startHelper }}</button>
        <div class="segmented-control" role="group" :aria-label="messages.resultDetail">
          <button
            class="result-mode-button"
            :class="{ active: finder.currentResultMode.value === 'quick' }"
            type="button"
            :aria-pressed="String(finder.currentResultMode.value === 'quick')"
            @click="finder.applyResultMode('quick')"
          >{{ messages.quick }}</button>
          <button
            class="result-mode-button"
            :class="{ active: finder.currentResultMode.value === 'detailed' }"
            type="button"
            :aria-pressed="String(finder.currentResultMode.value === 'detailed')"
            @click="finder.applyResultMode('detailed')"
          >{{ messages.detailed }}</button>
        </div>
      </div>

      <div v-if="serviceWakeVisible" class="service-wake-panel" :class="{ 'is-offline': finder.apiStatus.state === 'is-offline' }" role="status" aria-live="polite">
        <span class="jh-loader wake-spinner" aria-hidden="true">
          <span class="jh-loader-dot"></span><span class="jh-loader-dot"></span><span class="jh-loader-dot"></span>
        </span>
        <div>
          <strong>{{ serviceWakeTitle }}</strong>
          <p>{{ serviceWakeCopy }}</p>
          <a class="service-wake-link" href="service-waking.html">{{ messages.openServiceStatus }}</a>
        </div>
      </div>

      <div class="key-finder-divider key-finder-divider-primary"><span>{{ messages.uploadDivider }}</span></div>
      <div class="key-finder-upload">
        <input
          id="audioKeyFile"
          type="file"
          accept="audio/*,.aac,.aiff,.flac,.m4a,.mp3,.mp4,.ogg,.wav,.webm"
          :aria-label="messages.audioFile"
          aria-describedby="audioFileRequirements uploadPrivacyNote"
          :disabled="finder.isAnalyzing.value"
          @change="handleFileChange"
        >
        <label class="upload-file-label" for="audioKeyFile">
          <span>{{ messages.audioFile }}</span>
          <strong>{{ finder.selectedFile.value?.name || messages.chooseAudioFile }}</strong>
          <small id="audioFileRequirements">{{ messages.audioRequirements }}</small>
        </label>
        <button class="primary-button analyze-file-button" type="button" :disabled="finder.isAnalyzing.value" @click="finder.submitFile()">{{ messages.analyzeFile }}</button>
      </div>
      <p id="uploadPrivacyNote" class="upload-privacy-note">{{ messages.uploadPrivacy }}</p>

      <div class="key-finder-divider"><span>{{ messages.youtubeDivider }}</span></div>
      <div class="key-finder-form key-finder-link-form">
        <input
          v-model="finder.youtubeUrl.value"
          type="url"
          :placeholder="messages.youtubePlaceholder"
          autocomplete="off"
          :aria-label="messages.youtubeLink"
          :disabled="finder.isAnalyzing.value"
          @keydown.enter.prevent="finder.submitYoutube()"
        >
        <button class="secondary-button" type="button" :disabled="finder.isAnalyzing.value" @click="finder.submitYoutube()">{{ messages.analyzeLink }}</button>
        <button v-if="finder.isAnalyzing.value" class="secondary-button" type="button" @click="finder.cancel">{{ common.cancel }}</button>
      </div>
      <p class="upload-privacy-note">{{ messages.youtubePrivacy }}</p>

      <details class="helper-install-card helper-install-details" :aria-label="messages.helperSetup">
        <summary>{{ messages.helperSummary }}</summary>
        <div class="helper-install-copy">
          <strong>{{ messages.helperLead }}</strong>
          <p>{{ messages.helperCopy }}</p>
          <ol><li>{{ messages.helperMac }}</li><li>{{ messages.helperWindows }}</li><li>{{ messages.helperReturn }}</li></ol>
        </div>
        <div class="helper-download-actions">
          <a class="secondary-button helper-download-link" href="downloads/jasper-youtube-helper-mac.zip" download>{{ messages.downloadMac }}</a>
          <a class="secondary-button helper-download-link" href="downloads/jasper-youtube-helper-windows.zip" download>{{ messages.downloadWindows }}</a>
        </div>
      </details>

      <div
        ref="resultRegion"
        class="key-finder-result"
        :class="resultClass"
        role="status"
        aria-live="polite"
        aria-atomic="false"
        tabindex="-1"
      >
        <KeyFinderProgress
          v-if="finder.isAnalyzing.value"
          :stage="finder.progress.stage"
          :value="finder.progress.value"
        />
        <span v-else-if="finder.phase.value === 'validation-error' || finder.phase.value === 'cancelled'">{{ plainStatusText }}</span>
        <KeyFinderError
          v-else-if="finder.error.value"
          :error="finder.error.value"
          :messages="messages"
          :status-text="errorStatusText"
        />
        <KeyFinderResult
          v-else-if="finder.result.value"
          :data="finder.result.value"
          :dynamic="dynamic"
          :messages="messages"
          :mode="finder.currentResultMode.value"
        />
        <span v-else>{{ messages.ready }}</span>
      </div>

      <div v-if="finder.history.value.length" class="analysis-history">
        <div class="history-heading"><h3>{{ messages.recentAnalyses }}</h3><button class="text-button" type="button" @click="finder.clearHistory">{{ common.clear }}</button></div>
        <ul>
          <li v-for="item in finder.history.value" :key="item.id">
            <button class="history-item-button" type="button" :disabled="!item.analysisData" @click="showHistory(item)">
              <div><strong>{{ item.finalKey }}</strong><span>{{ item.confidence == null ? dynamic["03"] : `${Number(item.confidence).toFixed(1)}%` }} - {{ item.time }}</span></div>
              <span>{{ item.reference || messages.uploadedAudio }}</span>
              <em>{{ item.analysisData ? messages.viewFullResult : messages.reanalyzeDetails }}</em>
            </button>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>
