<script setup>
import { computed } from "vue";
import { privacy as englishPrivacy } from "../../locales/en/common.json";
import { privacy as traditionalChinesePrivacy } from "../../locales/zh-TW/common.json";
import { useLegacyLocale } from "../i18n/useLegacyLocale.js";

const messages = {
  en: englishPrivacy,
  "zh-TW": traditionalChinesePrivacy
};
const { language } = useLegacyLocale();
const privacy = computed(() => messages[language.value] || messages.en);
</script>

<template>
  <main id="main-content" class="tracks-page privacy-page">
    <h1 class="privacy-page-title">{{ privacy.title }}</h1>
    <p class="privacy-page-metadata">{{ privacy.effectiveDate }}</p>

    <section class="key-finder-panel privacy-policy-panel">
      <div class="tool-section-heading">
        <h2 class="section-title">{{ privacy.body["01"] }}</h2>
        <p>{{ privacy.body["02"] }}</p>
      </div>

      <div class="result-section">
        <h2>{{ privacy.body["03"] }}</h2>
        <p>{{ privacy.body["04"] }}</p>
        <p>{{ privacy.body["05"] }}</p>
      </div>

      <div class="result-section">
        <h2>{{ privacy.body["06"] }}</h2>
        <p>{{ privacy.body["07"] }}</p>
        <p>{{ privacy.body["08"] }}</p>
        <p>{{ privacy.body["09"] }}</p>
      </div>

      <div class="result-section">
        <h2>{{ privacy.body["10"] }}</h2>
        <p>{{ privacy.body["11"] }}</p>
      </div>

      <div class="result-section">
        <h2>{{ privacy.body["12"] }}</h2>
        <p>{{ privacy.body["13"] }}</p>
      </div>

      <div class="result-section">
        <h2>{{ privacy.body["14"] }}</h2>
        <p>{{ privacy.body["15"] }}</p>
      </div>

      <div id="song-workspace-local-storage" class="result-section">
        <h2>{{ privacy.body["18"] }}</h2>
        <p>{{ privacy.body["19"] }}</p>
        <p>{{ privacy.body["20"] }}</p>
        <p>{{ privacy.body["21"] }}</p>
      </div>

      <div id="user-content" class="result-section">
        <h2>{{ privacy.body["22"] }}</h2>
        <p>{{ privacy.body["23"] }}</p>
        <p>{{ privacy.body["24"] }}</p>
        <p>{{ privacy.body["25"] }}</p>
      </div>

      <div class="result-section">
        <h2>{{ privacy.body["16"] }}</h2>
        <p>{{ privacy.body["17"] }}</p>
      </div>
    </section>
  </main>
</template>
