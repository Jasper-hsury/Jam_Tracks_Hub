<script setup>
import { computed } from "vue";
import { statusPages as englishStatusPages } from "../../locales/en/common.json";
import { statusPages as traditionalChineseStatusPages } from "../../locales/zh-TW/common.json";
import { useSiteLocale } from "../i18n/useSiteLocale.js";

const statusMessages = {
  en: englishStatusPages,
  "zh-TW": traditionalChineseStatusPages
};
const { language, notFound } = useSiteLocale();
const statusPages = computed(() => statusMessages[language.value] || statusMessages.en);
</script>

<template>
  <main id="main-content" class="status-page">
    <div class="status-page-copy">
      <p class="status-page-code">404</p>
      <h1>{{ notFound.title }}</h1>
      <p>{{ notFound.copy }}</p>
      <div class="status-page-actions">
        <a class="primary-button" href="/index.html">{{ notFound.returnHome }}</a>
        <a class="secondary-button" href="/key-finder.html">
          <span>{{ notFound.openKeyFinder }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
        </a>
      </div>
    </div>
    <div class="status-page-art" aria-hidden="true">
      <div class="status-page-sleeve">
        <span class="status-page-sleeve-brand">Jam Tracks Hub</span>
        <span class="status-page-sleeve-code">404</span>
        <span class="status-page-sleeve-caption">{{ statusPages.notFoundSleeveCaption }}</span>
      </div>
      <svg class="status-page-record" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
      <circle class="status-page-record-vinyl" cx="150" cy="150" r="148"></circle>
      <circle class="status-page-record-groove" cx="150" cy="150" r="132"></circle>
      <circle class="status-page-record-groove" cx="150" cy="150" r="118"></circle>
      <circle class="status-page-record-groove" cx="150" cy="150" r="104"></circle>
      <circle class="status-page-record-groove" cx="150" cy="150" r="90"></circle>
      <circle class="status-page-record-groove" cx="150" cy="150" r="76"></circle>
      <circle class="status-page-record-label" cx="150" cy="150" r="52"></circle>
      <circle class="status-page-record-hole" cx="150" cy="150" r="5"></circle>
    </svg>
    </div>
  </main>
</template>
