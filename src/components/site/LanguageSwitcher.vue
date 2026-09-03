<script setup>
import { computed } from "vue";
import { useSiteLocale } from "../../i18n/useSiteLocale.js";

const { language, setLanguage } = useSiteLocale();
const targetLanguage = computed(() => language.value === "zh-TW" ? "en" : "zh-TW");
const label = computed(() => targetLanguage.value === "zh-TW" ? "中" : "EN");
const ariaLabel = computed(() => targetLanguage.value === "zh-TW"
  ? "切換至繁體中文"
  : "Switch to English");

function switchLanguage() {
  setLanguage(targetLanguage.value);
}
</script>

<template>
  <button
    class="theme-toggle language-switch-button nav-language-toggle"
    type="button"
    data-language-switch
    :data-language-target="targetLanguage"
    :aria-label="ariaLabel"
    @click.stop="switchLanguage"
  >
    <span class="language-switch-label" aria-hidden="true">{{ label }}</span>
  </button>
</template>
