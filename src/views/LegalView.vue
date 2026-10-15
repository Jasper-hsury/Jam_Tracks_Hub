<script setup>
import { computed } from "vue";
import PolicyContents from "../components/site/PolicyContents.vue";
import { legal as englishLegal } from "../../locales/en/common.json";
import { legal as traditionalChineseLegal } from "../../locales/zh-TW/common.json";
import { policyPage as englishPolicyPage } from "../../locales/en/common.json";
import { policyPage as traditionalChinesePolicyPage } from "../../locales/zh-TW/common.json";
import { useSiteLocale } from "../i18n/useSiteLocale.js";

const messages = {
  en: englishLegal,
  "zh-TW": traditionalChineseLegal
};
const policyMessages = {
  en: englishPolicyPage,
  "zh-TW": traditionalChinesePolicyPage
};
const { language } = useSiteLocale();
const legal = computed(() => messages[language.value] || messages.en);
const policyPage = computed(() => policyMessages[language.value] || policyMessages.en);
const sections = computed(() => [
  { id: "terms", title: legal.value.termsTitle },
  { id: "song-workspace", title: legal.value.workspaceTitle },
  { id: "copyright", title: legal.value.copyrightTitle },
  { id: "exports", title: legal.value.exportTitle },
  { id: "privacy", title: legal.value.privacyTitle },
  { id: "limitations", title: legal.value.disclaimerTitle }
]);
const sectionCount = computed(() => policyPage.value.sectionCount.replace("{{count}}", sections.value.length));
</script>

<template>
  <main id="main-content" class="tracks-page legal-page">
    <p class="v3-page-eyebrow">{{ policyPage.legalEyebrow }}</p>
    <h1 class="legal-page-title">{{ legal.title }}</h1>
    <p class="legal-page-intro">{{ legal.intro }}</p>
    <div class="v3-page-meta">
      <p class="legal-page-metadata">{{ legal.effectiveDate }}</p>
      <span>{{ sectionCount }}</span>
    </div>

    <div class="policy-layout">
      <PolicyContents :label="policyPage.onThisPage" :section-count="sectionCount" :sections="sections" />

      <section class="key-finder-panel legal-policy-panel">
        <div id="terms" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">01</span>
          <div class="policy-section-body">
            <h2>{{ legal.termsTitle }}</h2>
            <p>{{ legal.termsCopy }}</p>
          </div>
        </div>

        <div id="song-workspace" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">02</span>
          <div class="policy-section-body">
            <h2>{{ legal.workspaceTitle }}</h2>
            <p>{{ legal.workspaceCopy }}</p>
            <p>{{ legal.storageCopy }}</p>
          </div>
        </div>

        <div id="copyright" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">03</span>
          <div class="policy-section-body">
            <h2>{{ legal.copyrightTitle }}</h2>
            <p>{{ legal.copyrightCopy }}</p>
            <p>{{ legal.lawCopy }}</p>
          </div>
        </div>

        <div id="exports" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">04</span>
          <div class="policy-section-body">
            <h2>{{ legal.exportTitle }}</h2>
            <p>{{ legal.exportCopy }}</p>
          </div>
        </div>

        <div id="privacy" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">05</span>
          <div class="policy-section-body">
            <h2>{{ legal.privacyTitle }}</h2>
            <p>{{ legal.privacyCopy }}</p>
            <p class="policy-section-link">
              <a class="secondary-button" href="privacy-policy.html">
                <span>{{ legal.privacyLink }}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
              </a>
            </p>
          </div>
        </div>

        <div id="limitations" class="result-section policy-section">
          <span class="policy-section-number" aria-hidden="true">06</span>
          <div class="policy-section-body">
            <h2>{{ legal.disclaimerTitle }}</h2>
            <p>{{ legal.disclaimerCopy }}</p>
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
