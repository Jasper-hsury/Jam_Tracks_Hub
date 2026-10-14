<script setup>
import { computed } from "vue";
import { useSiteLocale } from "../../i18n/useSiteLocale.js";
import englishMessages from "../../../locales/en/common.json";
import traditionalChineseMessages from "../../../locales/zh-TW/common.json";

const props = defineProps({
  aside: { type: String, default: "" },
  eyebrow: { type: String, required: true },
  headingClass: { type: [String, Array], default: "" },
  side: { type: String, required: true },
  track: { type: Number, required: true }
});

const localeMessages = { en: englishMessages, "zh-TW": traditionalChineseMessages };
const { language } = useSiteLocale();
const shell = computed(() => (localeMessages[language.value] || localeMessages.en).pages.toolShell);
const sideTrack = computed(() => shell.value.sideTrack
  .replace("{{side}}", props.side)
  .replace("{{track}}", String(props.track)));
const asideText = computed(() => props.aside ? shell.value[props.aside] || props.aside : "");
</script>

<template>
  <header class="v3-tool-heading" :class="headingClass">
    <p class="home-eyebrow v3-tool-eyebrow">{{ eyebrow }}</p>
    <slot></slot>
    <div class="v3-tool-meta">
      <span>{{ sideTrack }}</span>
      <span v-if="asideText">{{ asideText }}</span>
    </div>
  </header>
</template>
