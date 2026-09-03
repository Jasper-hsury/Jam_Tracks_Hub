<script setup>
import { computed, ref } from "vue";
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
const toolCards = [
  { href: "tracks.html", motion: "groove", motif: "tracks", kicker: "01", title: "tracks", copy: "02" },
  { href: "chord-dictionary.html", motion: "flip", motif: "dictionary", kicker: "03", title: "dictionary", copy: "04" },
  { href: "scale.html", motion: "map", motif: "scale", kicker: "05", title: "scale", copy: "06" },
  { href: "key-finder.html", motion: "scan", motif: "keyfinder", kicker: "07", title: "keyFinder", copy: "08" },
  { href: "chord-progressions.html", motion: "cascade", motif: "progressions", kicker: "09", title: "progressions", copy: "10" },
  { href: "fretboard-trainer.html", motion: "pulse", motif: "trainer", kicker: "11", title: "trainer", copy: "12" }
];
const releases = [
  {
    id: "W19",
    title: "Roaming Alone Backing Track in C",
    key: "C major",
    mood: "Roaming",
    youtube: "https://youtu.be/nNlJNDU-Xgw",
    image: "slides/W19/W19.001.jpeg",
    slides: "slides/w19.html",
    note: "A C major guitar track for spacious chords and reflective melodic movement."
  },
  {
    id: "W18",
    title: "Missing You Rock Backing Track in Cm",
    key: "C minor",
    mood: "Rock",
    youtube: "https://youtu.be/kUJmHr1eN2I",
    image: "slides/W18/W18.001.jpeg",
    slides: "slides/w18.html",
    note: "A C minor rock track for expressive phrasing and melodic tension."
  },
  {
    id: "W17",
    title: "Amazing Crush Backing Track in E",
    key: "E major",
    mood: "Crush",
    youtube: "https://youtu.be/t6rTUWrjdJA",
    image: "slides/W17/W17.001.jpeg",
    slides: "slides/w17.html",
    note: "A bright E major pop track for melodic hooks and chorus lift."
  }
];

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
const subscribeStatus = ref("");

function coreTrackName(title) {
  return title
    .replace(/\s+Backing Track\s+in\s+.+$/i, "")
    .replace(/\s+Backing Track$/i, "")
    .trim() || title;
}

function localizedTrackKey(key) {
  if (!isTraditionalChinese.value) return key;
  return key.replace(/\s+(major|minor)$/i, function(_, quality) {
    return ` ${quality.toLowerCase() === "minor" ? "小調" : "大調"}`;
  });
}

function localizedTrackTitle(track) {
  if (!isTraditionalChinese.value) return `${track.id} ${track.title}`;
  return `${track.id}《${coreTrackName(track.title)}》｜${localizedTrackKey(track.key)}吉他即興伴奏`;
}

function youtubeAriaLabel(track) {
  return tracks.value.openOnYouTube.replace("{{title}}", localizedTrackTitle(track));
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
  subscribeStatus.value = "Saving your email...";

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
    subscribeStatus.value = result.status === "already_subscribed"
      ? "You're already on the list."
      : "You're on the list. Thank you!";
    email.value = "";
  } catch (error) {
    console.error("Subscribe request failed", error);
    subscribeStatus.value = "Subscription is not available yet. Please try again later.";
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
          <a href="key-finder.html" class="secondary-button">{{ home.hero.analyzeSong }}</a>
        </div>

        <dl class="home-metrics" aria-label="Site overview">
          <div><dt>18</dt><dd>{{ home.hero.stats.tracks }}</dd></div>
          <div><dt>24</dt><dd>{{ home.hero.stats.keys }}</dd></div>
          <div><dt>6</dt><dd>{{ home.hero.stats.tools }}</dd></div>
        </dl>
      </div>
    </section>

    <section class="home-tools" aria-labelledby="homeToolsTitle">
      <div class="home-section-inner">
        <div class="home-section-heading">
          <p class="home-eyebrow">{{ home.tools.eyebrow }}</p>
          <h2 id="homeToolsTitle">{{ home.tools.title }}</h2>
        </div>

        <div class="home-step-rail" aria-label="Choose a music tool">
          <div class="start-grid home-start-grid home-step-track">
            <a
              v-for="card in toolCards"
              :key="card.href"
              :href="card.href"
              class="start-card home-step-card"
              :data-motion="card.motion"
            >
              <span class="step-motif" :class="`step-motif-${card.motif}`" aria-hidden="true">
                <svg v-if="card.motif === 'tracks'" viewBox="0 0 160 120" role="img" focusable="false">
                  <path class="home-draw" d="M20 78 C35 56 50 100 66 78 S96 56 112 78 S136 100 148 70" />
                  <path class="home-draw home-draw-soft" d="M22 93 H138" />
                  <circle class="home-motion-dot home-motion-dot-gold" cx="20" cy="78" data-motion-path="M20 78 C35 56 50 100 66 78 S96 56 112 78 S136 100 148 70" r="5" />
                  <rect class="motif-panel" x="18" y="18" width="124" height="74" rx="14" />
                  <path class="home-draw home-draw-accent" d="M34 36 H84 M34 50 H118 M34 64 H72" />
                </svg>
                <svg v-else-if="card.motif === 'dictionary'" viewBox="0 0 160 120" role="img" focusable="false">
                  <path class="home-draw home-draw-soft" d="M34 20 V100 M62 20 V100 M90 20 V100 M118 20 V100 M20 36 H140 M20 62 H140 M20 88 H140" />
                  <circle class="motif-note motif-root" cx="34" cy="36" r="10" />
                  <circle class="motif-note" cx="62" cy="62" r="9" />
                  <circle class="motif-note" cx="90" cy="88" r="9" />
                  <circle class="motif-note" cx="118" cy="36" r="9" />
                  <path class="home-draw home-draw-accent" d="M34 36 C54 50 72 62 90 88 C102 64 110 48 118 36" />
                </svg>
                <svg v-else-if="card.motif === 'scale'" viewBox="0 0 160 120" role="img" focusable="false">
                  <path class="home-draw home-draw-soft" d="M22 34 H138 M22 58 H138 M22 82 H138" />
                  <path class="home-draw home-draw-accent" d="M28 84 C48 70 63 72 78 58 S108 36 132 38" />
                  <circle class="home-motion-dot" cx="28" cy="84" data-motion-path="M28 84 C48 70 63 72 78 58 S108 36 132 38" r="6" />
                  <circle class="motif-note" cx="28" cy="84" r="8" />
                  <circle class="motif-note" cx="78" cy="58" r="8" />
                  <circle class="motif-note" cx="132" cy="38" r="8" />
                </svg>
                <svg v-else-if="card.motif === 'keyfinder'" viewBox="0 0 160 120" role="img" focusable="false">
                  <path class="home-draw home-draw-soft" d="M26 36 H136 M24 48 H134 M22 60 H132 M24 72 H134 M26 84 H136" />
                  <path class="home-draw home-draw-accent" d="M30 76 C54 44 81 90 105 58 C118 41 130 44 142 50" />
                  <circle class="home-motion-dot home-motion-dot-gold" cx="30" cy="76" data-motion-path="M30 76 C54 44 81 90 105 58 C118 41 130 44 142 50" r="5" />
                  <path class="motif-note-symbol" d="M50 68 c0 7 -8 12 -15 8 c-6 -4 -4 -12 3 -15 c5 -2 10 -1 12 3 V33 h5 v35z" />
                  <path class="motif-note-symbol motif-note-symbol-alt" d="M96 78 c0 7 -8 12 -15 8 c-6 -4 -4 -12 3 -15 c5 -2 10 -1 12 3 V39 h5 v39z" />
                  <path class="motif-note-symbol motif-note-symbol-small" d="M126 55 c0 5 -6 9 -11 6 c-4 -3 -3 -8 2 -10 c4 -2 8 -1 9 2 V30 h4 v25z" />
                </svg>
                <svg v-else-if="card.motif === 'progressions'" viewBox="0 0 160 120" role="img" focusable="false">
                  <circle class="home-draw home-draw-soft" cx="82" cy="60" r="42" />
                  <path class="home-draw home-draw-accent" d="M82 18 A42 42 0 1 1 81.9 18" />
                  <circle class="home-motion-dot" cx="82" cy="18" data-motion-path="M82 18 A42 42 0 1 1 81.9 18" r="5" />
                  <g class="motif-roman"><rect x="29" y="48" width="34" height="28" rx="9" /><text x="46" y="67">I</text></g>
                  <g class="motif-roman"><rect x="64" y="18" width="40" height="28" rx="9" /><text x="84" y="37">vi</text></g>
                  <g class="motif-roman"><rect x="98" y="50" width="40" height="28" rx="9" /><text x="118" y="69">IV</text></g>
                  <g class="motif-roman"><rect x="63" y="80" width="38" height="28" rx="9" /><text x="82" y="99">V</text></g>
                </svg>
                <svg v-else viewBox="0 0 160 120" role="img" focusable="false">
                  <path class="home-draw home-draw-soft" d="M28 20 V100 M52 20 V100 M76 20 V100 M100 20 V100 M124 20 V100 M22 34 H138 M22 58 H138 M22 82 H138" />
                  <path class="home-draw home-draw-accent" d="M28 82 H124" />
                  <circle class="motif-note motif-root" cx="52" cy="58" r="9" />
                  <circle class="motif-note" cx="100" cy="34" r="8" />
                  <circle class="home-motion-dot home-motion-dot-gold" cx="52" cy="58" data-motion-path="M52 58 C68 30 91 28 100 34 C118 45 118 73 124 82" r="6" />
                </svg>
              </span>
              <span class="start-kicker">{{ home.extra[card.kicker] }}</span>
              <strong>{{ home.tools[card.title] }}</strong>
              <span>{{ home.extra[card.copy] }}</span>
            </a>
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
            title="W19 Roaming Alone Backing Track in C"
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
              :href="track.youtube"
              class="release-cover-link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="youtubeAriaLabel(track)"
            >
              <img :src="track.image" alt="" loading="lazy" />
            </a>
            <div class="release-copy">
              <p class="release-number">{{ track.id }}</p>
              <h3 class="is-wrapped" data-track-heading :data-track-week="isTraditionalChinese ? 'localized' : null">
                <TrackTitle :track="track" :include-week="isTraditionalChinese" />
              </h3>
              <p class="release-note">{{ track.note }}</p>
              <p class="track-meta"><span>{{ track.key }}</span><span>{{ track.mood }}</span></p>
              <div class="release-actions">
                <a :href="track.youtube" class="text-link" target="_blank" rel="noopener noreferrer">YouTube</a>
                <a :href="track.slides" class="text-link">{{ tracks.downloadSlides }}</a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="home-about" id="about" aria-labelledby="aboutTitle">
      <div class="home-section-inner home-about-layout">
        <figure class="about-portrait">
          <img :src="'assets/images/cover.jpeg'" alt="Jasper playing acoustic guitar on stage" width="600" height="900" />
          <figcaption>Jasper, guitarist and music creator</figcaption>
        </figure>

        <div class="about-copy">
          <p class="home-eyebrow">{{ home.about.eyebrow }}</p>
          <h2 id="aboutTitle">{{ home.extra["18"] }}</h2>
          <p>{{ home.extra["19"] }}</p>
          <p>{{ home.extra["20"] }}</p>
          <p>{{ home.extra["21"] }}</p>
          <div class="about-connect">
            <div class="about-connect-copy">
              <span>{{ home.extra["22"] }}</span>
              <strong>{{ home.extra["23"] }}</strong>
              <p>{{ home.extra["24"] }}</p>
            </div>
            <div class="about-connect-actions">
              <a href="mailto:Jamtrackshubwork@gmail.com" class="about-email-link">Jamtrackshubwork@gmail.com</a>
              <div class="about-links">
                <a
                  href="https://www.youtube.com/@Weekly_Backing_Track"
                  class="uiverse-youtube-button home-youtube-button"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Watch Jam Tracks Hub on YouTube"
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
                <a href="mailto:Jamtrackshubwork@gmail.com" class="uiverse-contact-button home-contact-button" aria-label="Email Jam Tracks Hub">
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
                <a href="feedback.html" class="home-contact-button home-feedback-button" aria-label="Open feedback form">
                  <span class="home-contact-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" focusable="false">
                      <path d="M14.22 21.63c-1.18 0-2.85-.83-4.17-4.8l-.72-2.16-2.16-.72c-3.96-1.32-4.79-2.99-4.79-4.17 0-1.17.83-2.85 4.79-4.18l8.49-2.83c2.12-.71 3.89-.5 4.98.58s1.3 2.86.59 4.98l-2.83 8.49c-1.33 3.98-3 4.81-4.18 4.81Z" fill="currentColor" />
                      <path d="M10.11 14.4c-.19 0-.38-.07-.53-.22-.29-.29-.29-.77 0-1.06l3.58-3.59c.29-.29.77-.29 1.06 0 .29.29.29.77 0 1.06l-3.58 3.59c-.14.15-.34.22-.53.22Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span class="home-feedback-button-text">{{ home.extra["29"] }}</span>
                </a>
              </div>
            </div>
            <form
              ref="subscribeForm"
              class="home-subscribe-card"
              id="homeSubscribeForm"
              data-subscribe-endpoint="/api/subscribe"
              data-subscribe-source="homepage-about"
              @submit.prevent="handleSubscribe"
            >
              <span class="home-subscribe-title">{{ home.extra["26"] }}</span>
              <p class="home-subscribe-content">{{ home.extra["27"] }}</p>
              <div class="home-subscribe-form">
                <input
                  ref="emailInput"
                  v-model="email"
                  id="homeSubscribeEmail"
                  name="email"
                  type="email"
                  autocomplete="email"
                  placeholder="Your Email"
                  aria-label="Email address"
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
