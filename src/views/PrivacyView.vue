<script setup>
import { computed } from "vue";
import PolicyContents from "../components/site/PolicyContents.vue";
import { privacy as englishPrivacy } from "../../locales/en/common.json";
import { privacy as traditionalChinesePrivacy } from "../../locales/zh-TW/common.json";
import { policyPage as englishPolicyPage } from "../../locales/en/common.json";
import { policyPage as traditionalChinesePolicyPage } from "../../locales/zh-TW/common.json";
import { useSiteLocale } from "../i18n/useSiteLocale.js";

const messages = {
  en: englishPrivacy,
  "zh-TW": traditionalChinesePrivacy
};
const policyMessages = {
  en: englishPolicyPage,
  "zh-TW": traditionalChinesePolicyPage
};
const { language } = useSiteLocale();
const privacy = computed(() => messages[language.value] || messages.en);
const policyPage = computed(() => policyMessages[language.value] || policyMessages.en);
const sections = computed(() => [
  { id: "extension", title: privacy.value.body["01"] },
  { id: "data-processed", title: privacy.value.body["03"] },
  { id: "storage-retention", title: privacy.value.body["06"] },
  { id: "data-use", title: privacy.value.body["10"] },
  { id: "sharing-security", title: privacy.value.body["12"] },
  { id: "your-choices", title: privacy.value.body["14"] },
  { id: "song-workspace-local-storage", title: privacy.value.body["18"] },
  { id: "user-content", title: privacy.value.body["22"] },
  { id: "contact", title: privacy.value.body["16"] }
]);
const sectionCount = computed(() => policyPage.value.sectionCount.replace("{{count}}", sections.value.length));
</script>

<template>
  <main id="main-content" class="tracks-page privacy-page">
    <p class="v3-page-eyebrow">{{ policyPage.privacyEyebrow }}</p>
    <h1 class="privacy-page-title">{{ privacy.title }}</h1>
    <div class="v3-page-meta">
      <p class="privacy-page-metadata">{{ privacy.effectiveDate }}</p>
      <span>{{ sectionCount }}</span>
    </div>

    <div class="policy-layout">
      <PolicyContents :label="policyPage.onThisPage" :section-count="sectionCount" :sections="sections" />

      <section class="key-finder-panel privacy-policy-panel">
        <div id="extension" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">01</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["01"] }}</h2>
            <p>{{ privacy.body["02"] }}</p>
          </div>
        </div>
        <div id="data-processed" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">02</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["03"] }}</h2>
            <p>{{ privacy.body["04"] }}</p>
            <p>{{ privacy.body["05"] }}</p>
          </div>
        </div>
        <div id="storage-retention" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">03</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["06"] }}</h2>
            <p>{{ privacy.body["07"] }}</p>
            <p>{{ privacy.body["08"] }}</p>
            <p>{{ privacy.body["09"] }}</p>
          </div>
        </div>
        <div id="data-use" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">04</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["10"] }}</h2>
            <p>{{ privacy.body["11"] }}</p>
          </div>
        </div>
        <div id="sharing-security" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">05</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["12"] }}</h2>
            <p>{{ privacy.body["13"] }}</p>
          </div>
        </div>
        <div id="your-choices" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">06</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["14"] }}</h2>
            <p>{{ privacy.body["15"] }}</p>
          </div>
        </div>
        <div id="song-workspace-local-storage" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">07</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["18"] }}</h2>
            <p>{{ privacy.body["19"] }}</p>
            <p>{{ privacy.body["20"] }}</p>
            <p>{{ privacy.body["21"] }}</p>
          </div>
        </div>
        <div id="user-content" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">08</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["22"] }}</h2>
            <p>{{ privacy.body["23"] }}</p>
            <p>{{ privacy.body["24"] }}</p>
            <p>{{ privacy.body["25"] }}</p>
          </div>
        </div>
        <div id="contact" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">09</span>
          <div class="policy-section-body">
            <h2>{{ privacy.body["16"] }}</h2>
            <p>{{ privacy.body["17"] }}</p>
          </div>
        </div>

        <a class="policy-back-to-top" href="#main-content">
          <span>{{ policyPage.backToTop }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>
        </a>
      </section>
    </div>
  </main>
</template>
