<script setup>
import { computed } from "vue";
import { clampProgress } from "../../music/keyFinder.mjs";

const props = defineProps({
  stage: { type: String, default: "Analyzing audio" },
  value: { type: Number, default: 0 }
});
const progress = computed(() => clampProgress(props.value));
</script>

<template>
  <div class="analysis-progress" role="status" aria-live="polite">
    <div class="analysis-progress-heading">
      <span class="uiverse-loader jh-loader analysis-spinner" aria-hidden="true">
        <span class="uiverse-loader-dot jh-loader-dot"></span>
        <span class="uiverse-loader-dot jh-loader-dot"></span>
        <span class="uiverse-loader-dot jh-loader-dot"></span>
      </span>
      <div>
        <strong>{{ stage }}</strong>
        <span>{{ progress }}%</span>
      </div>
    </div>
    <div
      class="analysis-progress-bar"
      role="progressbar"
      :aria-label="stage"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress"
    >
      <span :style="{ width: `${progress}%` }"></span>
    </div>
  </div>
</template>
