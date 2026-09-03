<script setup>
import { computed } from "vue";
import { useSiteLocale } from "../../i18n/useSiteLocale.js";

const props = defineProps({
  includeWeek: {
    type: Boolean,
    default: true
  },
  track: {
    type: Object,
    required: true
  }
});

const { language } = useSiteLocale();
const isTraditionalChinese = computed(() => language.value === "zh-TW");
const coreName = computed(() => props.track.title
  .replace(/\s+Backing Track\s+in\s+.+$/i, "")
  .replace(/\s+Backing Track$/i, "")
  .trim() || props.track.title);
const localizedKey = computed(() => {
  if (!isTraditionalChinese.value) return props.track.key;
  return props.track.key.replace(/\s+(major|minor)$/i, function(_, quality) {
    return ` ${quality.toLowerCase() === "minor" ? "小調" : "大調"}`;
  });
});
</script>

<template>
  <template v-if="isTraditionalChinese">
    <span v-if="includeWeek" class="track-title-week">{{ track.id }}</span>
    <span class="track-title-name">《{{ coreName }}》</span>
    <span class="track-title-separator">｜</span>
    <span class="track-title-key">{{ localizedKey }}吉他即興伴奏</span>
  </template>
  <template v-else>
    <span v-if="includeWeek" class="track-title-week">{{ track.id }}</span>{{ includeWeek ? " " : "" }}<span class="track-title-name">{{ track.title }}</span>
  </template>
</template>
