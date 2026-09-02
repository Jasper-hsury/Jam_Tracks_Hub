<script setup>
import { computed } from "vue";
import { legal as englishLegal } from "../../locales/en/common.json";
import { legal as traditionalChineseLegal } from "../../locales/zh-TW/common.json";
import { useLegacyLocale } from "../i18n/useLegacyLocale.js";

const messages = {
  en: englishLegal,
  "zh-TW": traditionalChineseLegal
};
const { language } = useLegacyLocale();
const legal = computed(() => messages[language.value] || messages.en);
</script>

<template>
  <main id="main-content" class="tracks-page legal-page">
    <h1 class="legal-page-title">{{ legal.title }}</h1>
    <p class="legal-page-metadata">{{ legal.effectiveDate }}</p>
    <p class="legal-page-intro">{{ legal.intro }}</p>

    <section class="key-finder-panel legal-policy-panel">
      <div id="terms" class="result-section">
        <h2>{{ legal.termsTitle }}</h2>
        <p>{{ legal.termsCopy }}</p>
      </div>

      <div id="song-workspace" class="result-section">
        <h2>{{ legal.workspaceTitle }}</h2>
        <p>{{ legal.workspaceCopy }}</p>
        <p>{{ legal.storageCopy }}</p>
      </div>

      <div id="copyright" class="result-section">
        <h2>{{ legal.copyrightTitle }}</h2>
        <p>{{ legal.copyrightCopy }}</p>
        <p>{{ legal.lawCopy }}</p>
      </div>

      <div id="exports" class="result-section">
        <h2>{{ legal.exportTitle }}</h2>
        <p>{{ legal.exportCopy }}</p>
      </div>

      <div id="privacy" class="result-section">
        <h2>{{ legal.privacyTitle }}</h2>
        <p>{{ legal.privacyCopy }}</p>
        <p><a class="secondary-button" href="privacy-policy.html">{{ legal.privacyLink }}</a></p>
      </div>

      <div id="limitations" class="result-section">
        <h2>{{ legal.disclaimerTitle }}</h2>
        <p>{{ legal.disclaimerCopy }}</p>
      </div>
    </section>
  </main>
</template>
