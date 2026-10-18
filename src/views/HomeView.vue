<script setup>
import { computed, ref } from "vue";
import trackCatalog from "../../data/tracks.json";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";
import TrackTitle from "../components/home/TrackTitle.vue";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import {
  submitSubscription,
  validateSubscriberEmail
} from "../services/subscribeApi.mjs";

const messages = {
  en: englishMessages,
  "zh-TW": traditionalChineseMessages
};
// The four workflows read as a record tracklist: Side A to practice and
// understand, Side B to create and play your own songs.
const workflowGroups = [
  {
    id: "practice",
    side: "a",
    sideStart: true,
    tools: [
      { href: "tracks.html", title: "tracks", copy: "02", no: "A1" },
      { href: "fretboard-trainer.html", title: "trainer", copy: "12", no: "A2" }
    ]
  },
  {
    id: "understand",
    side: "a",
    tools: [
      { href: "key-finder.html", title: "keyFinder", copy: "08", no: "A3" },
      { href: "scale.html", title: "scale", copy: "06", no: "A4" },
      { href: "chord-dictionary.html", title: "dictionary", copy: "04", no: "A5" }
    ]
  },
  {
    id: "create",
    side: "b",
    sideStart: true,
    tools: [
      { href: "chord-progressions.html", title: "progressions", copy: "10", no: "B1" }
    ]
  },
  {
    id: "playSongs",
    side: "b",
    tools: [
      { href: "/song-workspace", title: "songWorkspace", workspace: true, no: "B2" }
    ]
  }
];
const releaseIds = ["W19", "W18", "W17"];
const releases = releaseIds
  .map(id => trackCatalog.find(track => track.id === id))
  .filter(Boolean);

const { language } = useSiteLocale();
const localeMessages = computed(() => messages[language.value] || messages.en);
const home = computed(() => localeMessages.value.home);
const tracks = computed(() => localeMessages.value.pages.tracks);
const isTraditionalChinese = computed(() => language.value === "zh-TW");
const featuredTrack = releases[0];
const featuredVolume = computed(() => home.value.hero.volume.replace("{{number}}", featuredTrack.id.replace(/^W/, "")));
const subscribeForm = ref(null);
const emailInput = ref(null);
const email = ref("");
const website = ref("");
const subscribing = ref(false);
const subscribeStatusCode = ref("");
const subscribeStatus = computed(() => subscribeStatusCode.value
  ? home.value.subscribe.status[subscribeStatusCode.value]
  : "");

function coreTrackName(title) {
  return title
    .replace(/\s+Backing Track\s+in\s+.+$/i, "")
    .replace(/\s+Backing Track$/i, "")
    .trim() || title;
}

function localizedTrackKey(key) {
  const match = String(key || "").match(/^(.*?)\s+(major|minor)$/i);
  if (!match) return key;
  const mode = home.value.releases.modes[match[2].toLowerCase()] || match[2];
  return `${match[1]} ${mode}`;
}

function localizedTrackMetadata(group, value) {
  return home.value.releases[group]?.[value] || value;
}

function localizedTrackDescription(track) {
  return home.value.releases.descriptions[track.id] || "";
}

function localizedTrackTitle(track) {
  if (!isTraditionalChinese.value) return `${track.id} ${track.title}`;
  return `${track.id}《${coreTrackName(track.title)}》｜${localizedTrackKey(track.key)}吉他即興伴奏`;
}

function youtubeAriaLabel(track) {
  return tracks.value.openOnYouTube.replace("{{title}}", localizedTrackTitle(track));
}

function clearEmailValidation() {
  emailInput.value?.setCustomValidity("");
}

function handleInvalidEmail() {
  if (!emailInput.value) return;
  const validation = home.value.subscribe.validation;
  emailInput.value.setCustomValidity(
    emailInput.value.validity.valueMissing ? validation.required : validation.invalid
  );
}

async function handleSubscribe() {
  if (!emailInput.value?.checkValidity()) {
    emailInput.value?.reportValidity();
    return;
  }

  const validated = validateSubscriberEmail(email.value);
  if (!validated.valid) {
    emailInput.value?.reportValidity();
    return;
  }

  subscribing.value = true;
  subscribeStatusCode.value = "saving";

  try {
    const result = await submitSubscription({
      endpoint: subscribeForm.value?.dataset.subscribeEndpoint || "/api/subscribe",
      fetchImpl: window.fetch.bind(window),
      payload: {
        email: validated.email,
        website: website.value || "",
        source: subscribeForm.value?.dataset.subscribeSource || "website",
        page: window.location.pathname || "/"
      }
    });
    subscribeStatusCode.value = result.status === "already_subscribed" ? "already" : "success";
    email.value = "";
  } catch (error) {
    console.error("Subscribe request failed", error);
    subscribeStatusCode.value = "error";
  } finally {
    subscribing.value = false;
  }
}
</script>

<template>
  <main class="home-page v3-home" id="main-content">
    <section class="home-hero v4-hero" id="home">
      <div class="home-section-inner v4-hero-stage-row">
        <div class="v4-hero-title-block">
          <h1 class="v4-hero-title" :aria-label="home.hero.title">
            <span class="v4-title-jam" aria-hidden="true">Jam</span>
            <span class="v4-title-line" aria-hidden="true">Tracks</span>
            <span class="v4-title-line" aria-hidden="true">Hub</span>
          </h1>
          <p class="v4-volume">{{ featuredVolume }}<br>{{ home.tracklist.recordSide }}</p>
        </div>

        <div class="v4-stage-tray">
          <div class="v4-stage">
            <span class="v4-stage-glow" aria-hidden="true"></span>
            <div class="v3-sleeve-stage v4-record-stage" aria-hidden="true">
              <div class="v3-record v4-record">
                <span class="v3-record-label">{{ home.tracklist.recordSide }}<br>{{ featuredTrack.id }}</span>
              </div>
              <div class="v3-sleeve">
                <span class="v3-sleeve-brand">Jam Tracks Hub</span>
                <img class="v3-sleeve-art" :src="'assets/images/icon.png'" alt="" width="2048" height="2048" decoding="async" />
                <span class="v3-sleeve-stage-line"></span>
                <span class="v3-sleeve-tagline">{{ home.hero.tagline }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="home-section-inner v4-hero-copy">
        <div class="v4-hero-intro">
          <p class="v4-stage-tagline" data-theme-copy="day">{{ home.hero.stageTaglines.day[0] }}<br><span>{{ home.hero.stageTaglines.day[1] }}</span></p>
          <p class="v4-stage-tagline" data-theme-copy="night">{{ home.hero.stageTaglines.night[0] }}<br><span>{{ home.hero.stageTaglines.night[1] }}</span></p>
          <p class="home-lead">{{ home.hero.description }}</p>
        </div>
        <dl class="home-metrics" :aria-label="home.accessibility.siteOverview">
          <div><dt>18</dt><dd>{{ home.hero.stats.tracks }}</dd></div>
          <div><dt>24</dt><dd>{{ home.hero.stats.keys }}</dd></div>
          <div><dt>7</dt><dd>{{ home.hero.stats.tools }}</dd></div>
        </dl>
        <div class="hero-actions">
          <a href="tracks.html" class="primary-button v4-knob-button">
            <span>{{ home.hero.exploreTracks }}</span>
            <span class="v4-knob" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15"><path d="M7 4.5v15l13-7.5z"></path></svg>
            </span>
          </a>
          <a href="/song-workspace" class="secondary-button">{{ home.hero.openSongWorkspace }}</a>
        </div>
      </div>
    </section>

    <section class="home-tools v3-band" aria-labelledby="homeToolsTitle">
      <div class="home-section-inner">
        <div class="v3-band-heading">
          <h2 id="homeToolsTitle">{{ home.tools.title }}</h2>
          <p class="home-eyebrow">{{ home.tracklist.label }}</p>
        </div>

        <div class="v3-tracklist" :aria-label="home.workflow.label">
          <article
            v-for="group in workflowGroups"
            :key="group.id"
            class="home-workflow-group v3-tracklist-group"
            :class="`is-side-${group.side}`"
          >
            <p v-if="group.sideStart" class="v3-side-title">{{ home.tracklist.sides[group.side] }}</p>
            <strong>{{ home.workflow[group.id] }}</strong>
            <nav class="home-workflow-links" :aria-label="home.workflow[group.id]">
              <a v-for="tool in group.tools" :key="tool.href" :href="tool.href" class="home-workflow-link">
                <span class="v3-track-no" aria-hidden="true">{{ tool.no }}</span>
                <span class="v3-track-copy">
                  <span class="v3-track-name">{{ home.tools[tool.title] }}</span>
                  <small>{{ tool.workspace ? home.workflow.songWorkspace.description : home.extra[tool.copy] }}</small>
                </span>
              </a>
            </nav>
          </article>
        </div>
      </div>
    </section>

    <section class="home-feature-band v3-band v3-band--feature" id="piano-track" aria-labelledby="featuredAudioTitle">
      <div class="home-feature-inner">
        <div class="v3-feature-copy">
          <p class="home-eyebrow">{{ home.extra["13"] }}</p>
          <h2 id="featuredAudioTitle" class="is-wrapped" data-track-heading>
            <TrackTitle :track="featuredTrack" />
          </h2>
          <p>{{ home.extra["14"] }}</p>
        </div>
        <div class="audio-player-card home-audio-player home-video-player">
          <iframe
            src="https://www.youtube.com/embed/nNlJNDU-Xgw"
            :title="home.accessibility.featuredPlayerTitle"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share;"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </section>

    <section class="home-releases" id="tracks" aria-labelledby="latestReleasesTitle">
      <div class="home-section-inner">
        <div class="home-section-heading home-section-heading-row">
          <div>
            <p class="home-eyebrow">{{ home.extra["15"] }}</p>
            <h2 id="latestReleasesTitle">{{ home.extra["16"] }}</h2>
          </div>
          <a href="tracks.html" class="text-link">{{ home.extra["17"] }}</a>
        </div>

        <div class="home-release-grid">
          <article v-for="track in releases" :key="track.id" class="home-release-card">
            <a
              :href="track.youtubeUrl"
              class="release-cover-link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="youtubeAriaLabel(track)"
            >
              <img :src="track.coverUrl" alt="" loading="lazy" />
            </a>
            <div class="release-copy">
              <p class="release-number">{{ track.id }}</p>
              <h3 class="is-wrapped" data-track-heading :data-track-week="isTraditionalChinese ? 'localized' : null">
                <TrackTitle :track="track" :include-week="isTraditionalChinese" />
              </h3>
              <p class="release-note">{{ localizedTrackDescription(track) }}</p>
              <p class="track-meta" :aria-label="home.releases.metadataLabel">
                <span :aria-label="`${home.releases.keyLabel}: ${localizedTrackKey(track.key)}`">{{ localizedTrackKey(track.key) }}</span>
                <span>{{ home.releases.styleLabel }}: {{ localizedTrackMetadata("styles", track.style) }}</span>
                <span>{{ home.releases.moodLabel }}: {{ localizedTrackMetadata("moods", track.mood) }}</span>
                <span v-if="track.bpm">{{ home.releases.bpmLabel }}: {{ track.bpm }}</span>
              </p>
              <div class="release-actions">
                <a :href="track.youtubeUrl" class="text-link" target="_blank" rel="noopener noreferrer">YouTube</a>
                <a :href="track.slidesUrl" class="text-link">{{ tracks.downloadSlides }}</a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="home-about" id="about" aria-labelledby="aboutTitle">
      <div class="home-section-inner home-about-layout">
        <div class="about-copy">
          <p class="home-eyebrow">{{ home.about.eyebrow }}</p>
          <h2 id="aboutTitle">{{ home.extra["18"] }}</h2>
          <p class="home-about-summary">{{ home.extra["19"] }}</p>
          <p v-for="paragraph in home.about.additionalParagraphs" :key="paragraph" class="home-about-summary">{{ paragraph }}</p>
          <div class="about-connect">
            <p class="about-contact-prompt">{{ home.extra["23"] }}</p>
            <div class="about-links">
              <a href="mailto:Jamtrackshubwork@gmail.com" class="v3-connect-button v3-connect-button--primary" :aria-label="home.accessibility.emailJamTracksHub">
                <svg class="v3-connect-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 6h16v12H4z"></path>
                  <path d="M4 7l8 6 8-6"></path>
                </svg>
                <span>{{ home.extra["30"] }}</span>
              </a>
              <a href="feedback.html" class="v3-connect-button" :aria-label="home.accessibility.openFeedback">
                <span>{{ home.extra["29"] }}</span>
              </a>
              <a
                href="https://www.youtube.com/@Weekly_Backing_Track"
                class="v3-connect-link"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="home.accessibility.watchYouTube"
              >
                <span>{{ home.extra["25"] }}</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <form
              ref="subscribeForm"
              class="home-subscribe-card"
              id="homeSubscribeForm"
              data-subscribe-endpoint="/api/subscribe"
              data-subscribe-source="homepage-about"
              @submit.prevent="handleSubscribe"
            >
              <label class="home-subscribe-title" for="homeSubscribeEmail">{{ home.extra["27"] }}</label>
              <div class="home-subscribe-form">
                <input
                  ref="emailInput"
                  v-model="email"
                  id="homeSubscribeEmail"
                  name="email"
                  type="email"
                  autocomplete="email"
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  :placeholder="home.subscribe.emailPlaceholder"
                  :aria-label="home.subscribe.emailLabel"
                  aria-describedby="homeSubscribeStatus"
                  @input="clearEmailValidation"
                  @invalid="handleInvalidEmail"
                  required
                />
                <input
                  v-model="website"
                  class="home-subscribe-honeypot"
                  name="website"
                  type="text"
                  tabindex="-1"
                  autocomplete="off"
                  aria-hidden="true"
                />
                <button class="home-subscribe-button" type="submit" :disabled="subscribing">
                  <span>{{ home.extra["28"] }}</span>
                </button>
              </div>
              <p class="home-subscribe-status" id="homeSubscribeStatus" aria-live="polite">{{ subscribeStatus }}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
