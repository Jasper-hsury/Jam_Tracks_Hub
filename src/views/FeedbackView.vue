<script setup>
import { computed, ref } from "vue";
import { pages as englishPages } from "../../locales/en/common.json";
import { pages as traditionalChinesePages } from "../../locales/zh-TW/common.json";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import {
  submitFeedback,
  validateFeedbackFields
} from "../services/feedbackApi.mjs";

const messages = {
  en: englishPages.feedback,
  "zh-TW": traditionalChinesePages.feedback
};

const { language } = useSiteLocale();
const feedback = computed(() => messages[language.value] || messages.en);
const feedbackForm = ref(null);
const topicInput = ref(null);
const suggestionInput = ref(null);
const topic = ref("");
const suggestion = ref("");
const website = ref("");
const submitting = ref(false);
const statusKey = ref("");
const statusTone = ref("");
const statusMessage = computed(() => statusKey.value ? feedback.value[statusKey.value] : "");

function setStatus(key, tone) {
  statusKey.value = key;
  statusTone.value = tone;
}

async function handleSubmit() {
  const validated = validateFeedbackFields(topic.value, suggestion.value);

  if (!validated.valid) {
    if (validated.field === "topic") {
      setStatus("topicRequired", "error");
      topicInput.value?.focus();
    } else {
      setStatus("suggestionRequired", "error");
      suggestionInput.value?.focus();
    }
    return;
  }

  submitting.value = true;
  setStatus("sending", "pending");

  try {
    await submitFeedback({
      endpoint: feedbackForm.value?.dataset.feedbackEndpoint || "/api/feedback",
      fetchImpl: window.fetch.bind(window),
      payload: {
        topic: validated.topic,
        suggestion: validated.suggestion,
        website: website.value || "",
        page: window.location.pathname || "/feedback.html"
      }
    });
    topic.value = "";
    suggestion.value = "";
    website.value = "";
    setStatus("success", "success");
  } catch (error) {
    setStatus("error", "error");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="tracks-page feedback-page" id="main-content">
    <p class="hero-eyebrow">{{ feedback.eyebrow }}</p>
    <h1>{{ feedback.title }}</h1>
    <p class="hero-tagline signature-slogan">{{ feedback.lead }}</p>

    <section class="key-finder-panel feedback-panel" aria-labelledby="feedbackFormTitle">
      <div class="tool-section-heading compact-heading">
        <h2 id="feedbackFormTitle" class="section-title">{{ feedback.formTitle }}</h2>
        <p>{{ feedback.formCopy }}</p>
      </div>

      <form
        ref="feedbackForm"
        class="feedback-form"
        id="feedbackForm"
        data-feedback-endpoint="/api/feedback"
        @submit.prevent="handleSubmit"
      >
        <div class="feedback-field">
          <label for="feedbackTopic">{{ feedback.topicLabel }}</label>
          <input
            ref="topicInput"
            v-model="topic"
            id="feedbackTopic"
            name="topic"
            type="text"
            maxlength="120"
            autocomplete="off"
            :placeholder="feedback.topicPlaceholder"
            required
          >
        </div>

        <div class="feedback-field">
          <label for="feedbackSuggestion">{{ feedback.suggestionLabel }}</label>
          <textarea
            ref="suggestionInput"
            v-model="suggestion"
            id="feedbackSuggestion"
            name="suggestion"
            maxlength="2400"
            rows="8"
            :placeholder="feedback.suggestionPlaceholder"
            required
          ></textarea>
        </div>

        <input
          v-model="website"
          class="home-subscribe-honeypot"
          name="website"
          type="text"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        >

        <div class="feedback-actions">
          <a class="secondary-button" href="index.html#home">{{ feedback.backToHome }}</a>
          <button class="primary-button" type="submit" :disabled="submitting">
            <span>{{ submitting ? feedback.sending : feedback.submit }}</span>
          </button>
        </div>
        <p
          class="feedback-status"
          id="feedbackStatus"
          aria-live="polite"
          :data-tone="statusTone || null"
        >{{ statusMessage }}</p>
      </form>
    </section>
  </main>
</template>
