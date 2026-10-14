<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import TrackTitle from "../home/TrackTitle.vue";
import { getYouTubeVideoId } from "../../services/tracksData.mjs";

const props = defineProps({
  keyLabel: { type: String, required: true },
  messages: { type: Object, required: true },
  track: { type: Object, required: true },
  trackTitleText: { type: String, required: true }
});

const activating = ref(false);
const heading = ref(null);
let activationTimer = 0;
let wrapFrame = 0;
let wrapObserver = null;
const videoId = computed(() => getYouTubeVideoId(props.track.youtubeUrl));
const hasYouTubeLink = computed(() => Boolean(
  videoId.value && props.track.youtubeUrl && props.track.youtubeUrl !== "#"
));
const coverUrl = computed(() => props.track.coverUrl
  || (videoId.value ? `https://img.youtube.com/vi/${videoId.value}/maxresdefault.jpg` : ""));
const openLabel = computed(() => props.messages.openOnYouTube.replace("{{title}}", props.trackTitleText));
const downloadLabel = computed(() => props.messages.downloadSlidesFor.replace("{{title}}", props.trackTitleText));

function openYouTube() {
  if (!hasYouTubeLink.value) return;
  const opened = window.open(props.track.youtubeUrl, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

function handleCardClick(event) {
  if (event.target.closest("[data-card-action], a, button")) return;
  openYouTube();
}

function handleCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("a, button")) return;
  event.preventDefault();
  openYouTube();
}

function activateDownload() {
  window.clearTimeout(activationTimer);
  activating.value = true;
  activationTimer = window.setTimeout(() => {
    activating.value = false;
  }, 1800);
}

function updateTitleWrapState() {
  window.cancelAnimationFrame(wrapFrame);
  wrapFrame = window.requestAnimationFrame(() => {
    const name = heading.value?.querySelector(".track-title-name");
    const key = heading.value?.querySelector(".track-title-key");
    const shouldHideSeparator = Boolean(
      name && key && key.getBoundingClientRect().top > name.getBoundingClientRect().top + 2
    );
    heading.value?.classList.toggle("is-wrapped", shouldHideSeparator);
  });
}

watch(() => props.trackTitleText, async () => {
  await nextTick();
  updateTitleWrapState();
});

onMounted(() => {
  wrapObserver = new ResizeObserver(updateTitleWrapState);
  if (heading.value) wrapObserver.observe(heading.value);
  updateTitleWrapState();
});

onBeforeUnmount(() => {
  window.clearTimeout(activationTimer);
  window.cancelAnimationFrame(wrapFrame);
  wrapObserver?.disconnect();
});
</script>

<template>
  <article
    class="track-card"
    :class="{ 'track-card-clickable': hasYouTubeLink }"
    :role="hasYouTubeLink ? 'link' : null"
    :tabindex="hasYouTubeLink ? 0 : null"
    :aria-label="hasYouTubeLink ? openLabel : null"
    :data-flip-id="`track-${track.id}`"
    :data-title="trackTitleText"
    :data-key="track.key"
    :data-style="track.style"
    :data-mood="track.mood"
    :data-instrument="track.instrument"
    :data-bpm="track.bpm"
    @click="handleCardClick"
    @keydown="handleCardKeydown"
  >
    <span class="v3-track-no" aria-hidden="true">{{ track.id }}</span>
    <div class="track-cover-media v3-sleeve" aria-hidden="true">
      <span class="v3-disc">
        <span class="v3-disc-label"></span>
      </span>
      <img
        v-if="coverUrl"
        class="track-cover-image v3-sleeve-cover"
        :src="coverUrl"
        alt=""
        loading="lazy"
        decoding="async"
      >
    </div>
    <div class="track-card-main">
      <div class="track-card-title-row">
        <h2 ref="heading" class="track-title-display" data-track-heading>
          <TrackTitle :track="track" />
        </h2>
      </div>
      <p class="track-meta">
        <span>{{ keyLabel }}</span>
        <span>{{ track.descriptor }}</span>
      </p>
    </div>
    <div class="track-actions">
      <span v-if="hasYouTubeLink" class="v3-open-hint" aria-hidden="true">YouTube ↗</span>
      <a
        :href="track.downloadUrl"
        class="v3-download-button"
        :class="{ 'is-activating': activating }"
        data-card-action="slides"
        download
        :aria-label="downloadLabel"
        :aria-busy="activating ? 'true' : null"
        @click.stop="activateDownload"
      >
        <svg class="v3-download-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v11m0 0-4-4m4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M6 19h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
        </svg>
      </a>
    </div>
  </article>
</template>
