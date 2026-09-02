<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  pages as englishPages,
  service as englishService
} from "../../locales/en/common.json";
import {
  pages as traditionalChinesePages,
  service as traditionalChineseService
} from "../../locales/zh-TW/common.json";
import { useLegacyLocale } from "../i18n/useLegacyLocale.js";
import {
  checkServiceHealth,
  resolveServiceApiBase
} from "../services/serviceHealthApi.mjs";

const HEALTH_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 4000;
const REDIRECT_DELAY_MS = 700;
const MAX_AUTOMATIC_ATTEMPTS = 6;

const messages = {
  en: {
    service: englishService,
    keyFinder: englishPages.keyFinder
  },
  "zh-TW": {
    service: traditionalChineseService,
    keyFinder: traditionalChinesePages.keyFinder
  }
};

const { language } = useLegacyLocale();
const copy = computed(() => messages[language.value] || messages.en);
const attempts = ref(0);
const checking = ref(false);
const statusKey = ref("starting");
const pendingTimers = new Set();
let activeController = null;

const statusMessage = computed(() => {
  if (statusKey.value === "checking") return copy.value.keyFinder.checkingApi;
  if (statusKey.value === "ready") return copy.value.keyFinder.apiReady;
  if (statusKey.value === "unavailable") return copy.value.keyFinder.unavailableCopy;
  return copy.value.service.starting;
});

function schedule(callback, delay) {
  const timer = window.setTimeout(function() {
    pendingTimers.delete(timer);
    callback();
  }, delay);
  pendingTimers.add(timer);
}

async function checkService() {
  attempts.value += 1;
  checking.value = true;
  statusKey.value = "checking";
  const controller = new AbortController();
  activeController = controller;
  const timeout = window.setTimeout(function() {
    controller.abort();
  }, HEALTH_TIMEOUT_MS);

  try {
    await checkServiceHealth({
      apiBase: resolveServiceApiBase(window),
      fetchImpl: window.fetch.bind(window),
      signal: controller.signal
    });
    statusKey.value = "ready";
    schedule(function() {
      window.location.href = "key-finder.html";
    }, REDIRECT_DELAY_MS);
    return;
  } catch (error) {
    statusKey.value = attempts.value < MAX_AUTOMATIC_ATTEMPTS
      ? "starting"
      : "unavailable";
    checking.value = false;
  } finally {
    window.clearTimeout(timeout);
    if (activeController === controller) activeController = null;
  }

  if (attempts.value < MAX_AUTOMATIC_ATTEMPTS) {
    schedule(checkService, RETRY_DELAY_MS);
  }
}

onMounted(checkService);

onBeforeUnmount(function() {
  activeController?.abort();
  pendingTimers.forEach(timer => window.clearTimeout(timer));
  pendingTimers.clear();
});
</script>

<template>
  <main class="status-page" id="main-content">
    <span class="jh-loader status-page-spinner" aria-hidden="true">
      <span class="jh-loader-dot"></span>
      <span class="jh-loader-dot"></span>
      <span class="jh-loader-dot"></span>
    </span>
    <p class="status-page-code">{{ copy.service.keyFinder }}</p>
    <h1>{{ copy.service.wakingAnalyzer }}</h1>
    <p id="wakeMessage" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
    <div class="status-page-actions">
      <button
        class="primary-button"
        id="retryWakeButton"
        type="button"
        :disabled="checking"
        @click="checkService"
      >
        {{ copy.service.checkAgain }}
      </button>
      <a class="secondary-button" href="key-finder.html">{{ copy.service.backToKeyFinder }}</a>
    </div>
  </main>
</template>
