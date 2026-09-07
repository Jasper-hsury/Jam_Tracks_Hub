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
const workflowGroups = [
  {
    id: "practice",
    motion: "groove",
    tools: [
      { href: "tracks.html", title: "tracks", copy: "02" },
      { href: "fretboard-trainer.html", title: "trainer", copy: "12" }
    ]
  },
  {
    id: "understand",
    motion: "scan",
    tools: [
      { href: "key-finder.html", title: "keyFinder", copy: "08" },
      { href: "scale.html", title: "scale", copy: "06" },
      { href: "chord-dictionary.html", title: "dictionary", copy: "04" }
    ]
  },
  {
    id: "create",
    motion: "cascade",
    tools: [
      { href: "chord-progressions.html", title: "progressions", copy: "10" }
    ]
  },
  {
    id: "playSongs",
    motion: "pulse",
    workspace: true
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
  <main class="home-page" id="main-content">
    <section class="home-hero" id="home">
      <div class="home-section-inner">
        <svg class="home-jam-mark" viewBox="0 0 940 320" aria-hidden="true" focusable="false">
          <text class="home-jam-mark-text" x="104" y="232">𝓙𝓪𝓶</text>
        </svg>
        <p class="home-eyebrow">{{ home.hero.eyebrow }}</p>
        <h1>{{ home.hero.title }}</h1>
        <p class="signature-slogan">{{ home.hero.tagline }}</p>
        <p class="home-lead">{{ home.hero.description }}</p>

        <div class="hero-actions">
          <a href="tracks.html" class="primary-button">{{ home.hero.exploreTracks }}</a>
          <a href="/song-workspace" class="secondary-button">{{ home.hero.openSongWorkspace }}</a>
        </div>

        <dl class="home-metrics" :aria-label="home.accessibility.siteOverview">
          <div><dt>18</dt><dd>{{ home.hero.stats.tracks }}</dd></div>
          <div><dt>24</dt><dd>{{ home.hero.stats.keys }}</dd></div>
          <div><dt>7</dt><dd>{{ home.hero.stats.tools }}</dd></div>
        </dl>
      </div>
    </section>

    <section class="home-tools" aria-labelledby="homeToolsTitle">
      <div class="home-section-inner">
        <div class="home-section-heading">
          <p class="home-eyebrow">{{ home.tools.eyebrow }}</p>
          <h2 id="homeToolsTitle">{{ home.tools.title }}</h2>
        </div>

        <div class="home-step-rail" :aria-label="home.workflow.label">
          <div class="start-grid home-start-grid home-step-track">
            <article
              v-for="group in workflowGroups"
              :key="group.id"
              class="start-card home-step-card home-workflow-group"
              :class="{ 'home-workflow-group--workspace': group.workspace }"
              :data-motion="group.motion"
            >
              <span class="step-motif" aria-hidden="true"></span>
              <span class="start-kicker">{{ home.workflow[group.id] }}</span>

              <template v-if="group.workspace">
                <strong>{{ home.tools.songWorkspace }}</strong>
                <p class="home-workspace-description">{{ home.workflow.songWorkspace.description }}</p>
                <ul class="home-workspace-badges" :aria-label="home.workflow.songWorkspace.badgesLabel">
                  <li v-for="badge in home.workflow.songWorkspace.badges" :key="badge">{{ badge }}</li>
                </ul>
                <a href="/song-workspace" class="secondary-button home-workspace-link">
                  {{ home.workflow.songWorkspace.cta }}
                </a>
              </template>

              <template v-else>
                <strong>{{ home.workflow[group.id] }}</strong>
                <nav class="home-workflow-links" :aria-label="home.workflow[group.id]">
                  <a v-for="tool in group.tools" :key="tool.href" :href="tool.href" class="home-workflow-link">
                    <span>{{ home.tools[tool.title] }}</span>
                    <small>{{ home.extra[tool.copy] }}</small>
                  </a>
                </nav>
              </template>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="home-feature-band" id="piano-track" aria-labelledby="featuredAudioTitle">
      <div class="home-feature-inner">
        <div>
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
        <figure class="about-portrait">
          <img :src="'assets/images/cover.jpeg'" :alt="home.about.imageAlt" width="600" height="900" />
          <figcaption>{{ home.about.imageCaption }}</figcaption>
        </figure>

        <div class="about-copy">
          <p class="home-eyebrow">{{ home.about.eyebrow }}</p>
          <h2 id="aboutTitle">{{ home.extra["18"] }}</h2>
          <p class="home-about-summary">{{ home.extra["19"] }}</p>
          <div class="about-connect">
            <p class="about-contact-prompt">{{ home.extra["23"] }}</p>
            <div class="about-links">
              <a
                href="https://www.youtube.com/@Weekly_Backing_Track"
                class="uiverse-youtube-button home-youtube-button"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="home.accessibility.watchYouTube"
              >
                <span class="home-youtube-icon-shell" aria-hidden="true">
                  <span class="home-youtube-icon">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M0 0h24v24H0z" fill="none"></path>
                      <path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" fill="currentColor"></path>
                    </svg>
                  </span>
                </span>
                <span>{{ home.extra["25"] }}</span>
              </a>
              <a href="mailto:Jamtrackshubwork@gmail.com" class="uiverse-contact-button home-contact-button" :aria-label="home.accessibility.emailJamTracksHub">
                <span class="home-contact-outline" aria-hidden="true"></span>
                <span class="home-contact-state home-contact-state--default">
                  <span class="home-contact-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" focusable="false">
                      <path d="M14.22 21.63c-1.18 0-2.85-.83-4.17-4.8l-.72-2.16-2.16-.72c-3.96-1.32-4.79-2.99-4.79-4.17 0-1.17.83-2.85 4.79-4.18l8.49-2.83c2.12-.71 3.89-.5 4.98.58s1.3 2.86.59 4.98l-2.83 8.49c-1.33 3.98-3 4.81-4.18 4.81ZM7.64 7.03c-2.78.93-3.77 2.03-3.77 2.75 0 .72.99 1.82 3.77 2.74l2.52.84c.22.07.4.25.47.47l.84 2.52c.92 2.78 2.03 3.77 2.75 3.77.72 0 1.82-.99 2.75-3.77l2.83-8.49c.51-1.54.42-2.8-.23-3.45-.65-.65-1.91-.73-3.44-.22L7.64 7.03Z" fill="currentColor" />
                      <path d="M10.11 14.4c-.19 0-.38-.07-.53-.22-.29-.29-.29-.77 0-1.06l3.58-3.59c.29-.29.77-.29 1.06 0 .29.29.29.77 0 1.06l-3.58 3.59c-.14.15-.34.22-.53.22Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span class="home-contact-text">{{ home.extra["30"] }}</span>
                </span>
                <span class="home-contact-state home-contact-state--sent" aria-hidden="true">
                  <span class="home-contact-icon">
                    <svg viewBox="0 0 24 24" fill="none" focusable="false">
                      <path d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12S6.07 1.25 12 1.25 22.75 6.07 22.75 12 17.93 22.75 12 22.75Zm0-20C6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25s9.25-4.15 9.25-9.25S17.1 2.75 12 2.75Z" fill="currentColor" />
                      <path d="M10.58 15.58c-.2 0-.39-.08-.53-.22l-2.83-2.83a.75.75 0 1 1 1.06-1.06l2.3 2.3 5.14-5.14a.75.75 0 1 1 1.06 1.06l-5.67 5.67c-.14.14-.33.22-.53.22Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span class="home-contact-text">{{ home.extra["31"] }}</span>
                </span>
              </a>
              <a href="feedback.html" class="home-contact-button home-feedback-button" :aria-label="home.accessibility.openFeedback">
                <span class="home-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" focusable="false">
                    <path d="M14.22 21.63c-1.18 0-2.85-.83-4.17-4.8l-.72-2.16-2.16-.72c-3.96-1.32-4.79-2.99-4.79-4.17 0-1.17.83-2.85 4.79-4.18l8.49-2.83c2.12-.71 3.89-.5 4.98.58s1.3 2.86.59 4.98l-2.83 8.49c-1.33 3.98-3 4.81-4.18 4.81Z" fill="currentColor" />
                    <path d="M10.11 14.4c-.19 0-.38-.07-.53-.22-.29-.29-.29-.77 0-1.06l3.58-3.59c.29-.29.77-.29 1.06 0 .29.29.29.77 0 1.06l-3.58 3.59c-.14.15-.34.22-.53.22Z" fill="currentColor" />
                  </svg>
                </span>
                <span class="home-feedback-button-text">{{ home.extra["29"] }}</span>
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
