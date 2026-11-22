<script setup>
import { computed, onUnmounted, ref } from "vue";
import ChordLabShapeCard from "../components/chords/ChordLabShapeCard.vue";
import ToolPageHeading from "../components/site/ToolPageHeading.vue";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import {
  fretsText,
  generateLabVoicings,
  initialLabChord,
  LAB_EXAMPLES,
  LAB_POSITION_TARGETS,
  parseLabChord,
  rankLabVoicings,
  simplifyLabChord,
  TOP_VOICING_COUNT,
  TUNING_MIDI
} from "../music/chordLab.mjs";
import { createChordDictionaryAudioPlayer } from "../services/chordDictionaryAudio.mjs";
import { exportChordLabImage } from "../services/chordLabExport.mjs";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const ALL_SHAPES_STEP = 20;
const localeMessages = { en: englishMessages, "zh-TW": traditionalChineseMessages };
const { language } = useSiteLocale();
const locale = computed(() => localeMessages[language.value] || localeMessages.en);
const messages = computed(() => locale.value.pages.chordLab);

const initialSymbol = initialLabChord(globalThis.location?.search || "");
const inputText = ref(initialSymbol);
const currentSymbol = ref(initialSymbol);
const near = ref("best");
const rootMode = ref("all");
const showAll = ref(false);
const visibleCount = ref(ALL_SHAPES_STEP);
const simplifyOpen = ref(false);
const playingKey = ref("");
const downloading = ref(false);
const statusText = ref("");
const resultHeading = ref(null);
const audioPlayer = createChordDictionaryAudioPlayer();

const parsed = computed(() => parseLabChord(currentSymbol.value));
const chord = computed(() => parsed.value.ok ? parsed.value.chord : null);
const voicings = computed(() => chord.value ? generateLabVoicings(chord.value) : []);
const ranked = computed(() => rankLabVoicings(voicings.value, { near: near.value, rootMode: rootMode.value }));
const cards = computed(() => showAll.value ? ranked.value.all.slice(0, visibleCount.value) : ranked.value.top);
const tiers = computed(() => chord.value && simplifyOpen.value ? simplifyLabChord(chord.value, voicings.value) : []);

const errorText = computed(() => {
  if (parsed.value.ok) return "";
  const { code, detail } = parsed.value.error;
  if (code === "empty") return messages.value.errorEmpty;
  if (code === "root") return messages.value.errorRoot;
  return format(messages.value.errorQuality, { text: detail });
});
const exampleGroups = computed(() => LAB_EXAMPLES.map(group => ({
  ...group,
  label: messages.value.exampleGroups[group.id] || group.id
})));
const optionalTones = computed(() => chord.value?.tones.filter(tone => !tone.required) || []);
const nearOptions = computed(() => [
  { value: "best", label: messages.value.nearBest },
  ...LAB_POSITION_TARGETS.map(fret => ({ value: String(fret), label: fret === 0 ? messages.value.nearOpen : String(fret) }))
]);
const rootOptions = computed(() => [
  { value: "all", label: messages.value.rootAll },
  { value: "root", label: messages.value.rootIncluded },
  { value: "rootless", label: messages.value.rootless }
]);
const sortCaption = computed(() => {
  if (near.value === "best") return messages.value.sortBest;
  if (near.value === "0") return messages.value.sortOpen;
  return format(messages.value.sortNear, { fret: near.value });
});
const listTitle = computed(() => showAll.value
  ? messages.value.allTitle
  : format(messages.value.topTitle, { count: Math.min(TOP_VOICING_COUNT, ranked.value.top.length) }));
const tonesText = computed(() => chord.value?.tones.map(tone => `${tone.label} ${tone.note}`).join(" · ") || "");
const tierCopy = computed(() => ({
  1: { title: messages.value.tier1Title, sub: messages.value.tier1Sub },
  2: { title: messages.value.tier2Title, sub: messages.value.tier2Sub },
  3: { title: messages.value.tier3Title, sub: messages.value.tier3Sub }
}));
const legend = computed(() => [
  { family: "root", label: "R", text: messages.value.legendRoot },
  { family: "third", label: "3", text: messages.value.legendThird },
  { family: "fifth", label: "5", text: messages.value.legendFifth },
  { family: "seventh", label: "7", text: messages.value.legendSeventh },
  { family: "extension", label: "9", text: messages.value.legendExtension }
]);

function format(template, variables) {
  return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  );
}

function toneName(tone) {
  return format(messages.value.toneWithNote, { label: tone.label, note: tone.note });
}

function toneList(tones) {
  return tones.map(toneName).join(messages.value.listSeparator);
}

function changeText(item) {
  if (!item.changes.length) return messages.value.changeSame;
  const omitted = item.changes.filter(change => change.type === "omit").map(change => change.tone);
  const removed = item.changes.filter(change => change.type === "remove").map(change => change.tone);
  const added = item.changes.filter(change => change.type === "add").map(change => change.tone);
  const parts = item.changes.filter(change => change.type === "replace")
    .map(change => `${toneName(change.from)} → ${toneName(change.to)}`);
  if (omitted.length) parts.push(format(messages.value.changeOmit, { tones: toneList(omitted) }));
  if (removed.length) parts.push(format(messages.value.changeRemove, { tones: toneList(removed) }));
  if (added.length) parts.push(format(messages.value.changeAdd, { tones: toneList(added) }));
  item.changes.filter(change => change.type === "dropBass")
    .forEach(change => parts.push(format(messages.value.changeDropBass, { note: change.note })));
  return parts.join(" · ");
}

function positionText(voicing) {
  return voicing.position === 0 ? messages.value.openPosition : format(messages.value.fretPosition, { fret: voicing.position });
}

function metaText(voicing) {
  if (voicing.fingers === 0) return messages.value.metaOpen;
  const template = voicing.fingers === 1 ? messages.value.metaOne : messages.value.meta;
  return format(template, { span: voicing.span, fingers: voicing.fingers });
}

function cardTags(voicing) {
  return voicing.rootless ? [{ text: messages.value.rootlessTag, className: "is-rootless" }] : [];
}

function ariaText(symbol, voicing, rank) {
  return format(messages.value.diagramLabel, {
    name: symbol, rank, frets: fretsText(voicing.frets), tones: voicing.labels.join(" ")
  });
}

function playLabel(symbol, voicing) {
  return format(messages.value.playShape, { name: symbol, frets: fretsText(voicing.frets) });
}

function resetView() {
  showAll.value = false;
  visibleCount.value = ALL_SHAPES_STEP;
  statusText.value = "";
}

function applySymbol(value) {
  const symbol = String(value || "").trim();
  inputText.value = symbol;
  currentSymbol.value = symbol;
  rootMode.value = "all";
  resetView();
  if (parseLabChord(symbol).ok && globalThis.history?.replaceState) {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("chord", symbol);
    globalThis.history.replaceState(null, "", url);
  }
}

function submit() {
  applySymbol(inputText.value);
  resultHeading.value?.focus?.({ preventScroll: true });
}

function selectNear(value) {
  near.value = value;
  resetView();
}

function selectRootMode(value) {
  rootMode.value = value;
  resetView();
}

function toggleAll() {
  showAll.value = !showAll.value;
  visibleCount.value = ALL_SHAPES_STEP;
}

async function play(key, frets) {
  try {
    await audioPlayer.play({
      frets,
      tuningMidi: TUNING_MIDI,
      onStateChange: value => { playingKey.value = value ? key : ""; }
    });
  } catch (error) {
    playingKey.value = "";
    console.error("Chord audio playback failed:", error);
  }
}

async function downloadImage() {
  if (!chord.value || !ranked.value.top.length || downloading.value) return;
  downloading.value = true;
  try {
    const result = await exportChordLabImage({
      chord: chord.value,
      tonesText: tonesText.value,
      items: ranked.value.top.map((voicing, index) => ({
        voicing,
        rankText: format(messages.value.rank, { rank: index + 1 }),
        positionText: positionText(voicing)
      }))
    }, {
      theme: document.documentElement.dataset.theme || "default",
      imageText: {
        tool: locale.value.term.chordLab,
        standardTuning: locale.value.pages.scaleExplorer.standardTuning,
        shapes: messages.value.imageShapes,
        rootless: messages.value.rootless,
        rights: locale.value.footer.rights
      }
    });
    statusText.value = result.format === "png" ? messages.value.downloaded : messages.value.downloadedSvg;
  } finally {
    downloading.value = false;
  }
}

onUnmounted(() => audioPlayer.dispose(value => { if (!value) playingKey.value = ""; }));
</script>

<template>
  <main class="tracks-page chord-dictionary-page chord-lab-page v3-tool-page" id="main-content">
    <ToolPageHeading heading-class="dictionary-heading chord-lab-heading" aside="standardTuning" :eyebrow="messages.eyebrow">
      <h1>{{ messages.title }}</h1>
      <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>
      <p class="chord-lab-dictionary-hint">{{ messages.dictionaryHint }} <a href="/chord-dictionary.html">{{ messages.dictionaryLink }}</a></p>
    </ToolPageHeading>

    <section class="chord-lab-input-panel" :aria-label="messages.inputLabel">
      <form class="chord-lab-form" @submit.prevent="submit">
        <label class="chord-lab-field" for="chordLabInput">
          <span>{{ messages.inputLabel }}</span>
          <input
            id="chordLabInput"
            v-model="inputText"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="messages.inputPlaceholder"
            :aria-invalid="String(Boolean(errorText))"
            :aria-describedby="errorText ? 'chordLabError' : 'chordLabHint'"
          >
        </label>
        <button class="chord-lab-submit" type="submit">{{ messages.submit }}</button>
      </form>
      <p id="chordLabHint" class="chord-lab-hint">{{ messages.inputHint }}</p>
      <p v-if="errorText" id="chordLabError" class="chord-lab-error" role="alert">{{ errorText }}</p>
      <div class="chord-lab-examples">
        <p class="dictionary-kicker">{{ messages.examplesTitle }}</p>
        <div class="chord-lab-example-groups">
          <div v-for="group in exampleGroups" :key="group.id" class="chord-lab-example-group">
            <span>{{ group.label }}</span>
            <button
              v-for="example in group.examples"
              :key="example"
              type="button"
              :class="{ 'is-selected': currentSymbol === example }"
              :aria-pressed="String(currentSymbol === example)"
              @click="applySymbol(example)"
            >{{ example }}</button>
          </div>
        </div>
      </div>
    </section>

    <template v-if="chord">
      <section class="chord-lab-result" aria-labelledby="chordLabResultTitle">
        <div class="chord-lab-result-heading">
          <div>
            <p class="dictionary-kicker">{{ messages.resultKicker }}</p>
            <h2 id="chordLabResultTitle" ref="resultHeading" tabindex="-1">{{ chord.symbol }}</h2>
          </div>
          <ul class="chord-lab-tones-list" :aria-label="messages.tonesLabel">
            <li v-for="tone in chord.tones" :key="tone.semitone" :class="{ 'is-optional': !tone.required }">
              <span class="chord-lab-tone-dot" :data-tone-family="tone.family">{{ tone.label }}</span>
              <strong>{{ tone.note }}</strong>
              <small v-if="!tone.required">{{ messages.optionalTag }}</small>
            </li>
          </ul>
        </div>
        <p v-if="optionalTones.length" class="chord-lab-result-note">{{ format(messages.optionalNote, { tones: toneList(optionalTones) }) }}</p>
        <p v-if="chord.bassName" class="chord-lab-result-note">{{ format(messages.bassNote, { note: chord.bassName }) }}</p>
      </section>

      <section class="chord-lab-shapes" aria-labelledby="chordLabShapesTitle">
        <div class="chord-lab-filters">
          <div class="dictionary-position-filter" role="group" :aria-label="messages.nearFret">
            <span>{{ messages.nearFret }}</span>
            <button
              v-for="option in nearOptions"
              :key="option.value"
              type="button"
              :class="{ 'is-selected': near === option.value }"
              :aria-pressed="String(near === option.value)"
              @click="selectNear(option.value)"
            >{{ option.label }}</button>
          </div>
          <div v-if="chord.allowRootless" class="dictionary-position-filter" role="group" :aria-label="messages.rootFilter">
            <span>{{ messages.rootFilter }}</span>
            <button
              v-for="option in rootOptions"
              :key="option.value"
              type="button"
              :class="{ 'is-selected': rootMode === option.value }"
              :aria-pressed="String(rootMode === option.value)"
              @click="selectRootMode(option.value)"
            >{{ option.label }}</button>
          </div>
          <button class="chord-lab-download" type="button" :disabled="downloading || !ranked.top.length" @click="downloadImage">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path></svg>
            <span>{{ downloading ? messages.downloading : messages.download }}</span>
          </button>
        </div>
        <p class="chord-lab-status" role="status">{{ statusText }}</p>

        <div v-if="chord.allowRootless" class="chord-lab-rootless-note">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v-5"></path><path d="M12 8h.01"></path></svg>
          <p><strong>{{ messages.rootlessTitle }}</strong> {{ messages.rootlessNote }}</p>
        </div>

        <div class="chord-lab-list-heading">
          <h2 id="chordLabShapesTitle">{{ listTitle }}</h2>
          <p>{{ sortCaption }}</p>
        </div>

        <p v-if="!ranked.all.length" class="dictionary-empty chord-lab-empty">{{ messages.noShapes }}</p>
        <div class="chord-lab-shape-grid">
          <ChordLabShapeCard
            v-for="(voicing, index) in cards"
            :key="voicing.frets.join(',')"
            :chord="chord"
            :voicing="voicing"
            :rank-text="format(messages.rank, { rank: index + 1 })"
            :position-text="positionText(voicing)"
            :meta-text="metaText(voicing)"
            :tags="cardTags(voicing)"
            :note="voicing.rootless ? messages.rootlessCardNote : ''"
            :aria-text="ariaText(chord.symbol, voicing, index + 1)"
            :play-label="playLabel(chord.symbol, voicing)"
            :playing="playingKey === `main-${voicing.frets.join(',')}`"
            :highlight="index === 0 && near === 'best' && rootMode === 'all'"
            @play="play(`main-${voicing.frets.join(',')}`, voicing.frets)"
          />
        </div>
        <div class="chord-lab-list-actions">
          <button
            v-if="ranked.all.length > ranked.top.length"
            class="chord-lab-outline-button"
            type="button"
            :aria-expanded="String(showAll)"
            @click="toggleAll"
          >{{ showAll ? format(messages.showTop, { count: ranked.top.length }) : format(messages.showAll, { count: ranked.all.length }) }}</button>
          <button
            v-if="showAll && visibleCount < ranked.all.length"
            class="chord-lab-outline-button"
            type="button"
            @click="visibleCount += ALL_SHAPES_STEP"
          >{{ messages.showMore }}</button>
        </div>
      </section>

      <section class="chord-lab-simplify" aria-labelledby="chordLabSimplifyTitle">
        <button
          class="chord-lab-simplify-toggle"
          type="button"
          :aria-expanded="String(simplifyOpen)"
          aria-controls="chordLabSimplifyPanel"
          @click="simplifyOpen = !simplifyOpen"
        >
          <span>
            <strong id="chordLabSimplifyTitle">{{ messages.simplifyButton }}</strong>
            <small>{{ messages.simplifyLead }}</small>
          </span>
          <i aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></i>
        </button>
        <div v-if="simplifyOpen" id="chordLabSimplifyPanel" class="chord-lab-tiers">
          <p v-if="!tiers.length" class="dictionary-empty chord-lab-empty">{{ messages.simplifyEmpty }}</p>
          <article v-for="tier in tiers" :key="tier.tier" class="chord-lab-tier" :data-tier="tier.tier">
            <header>
              <span class="chord-lab-tier-number">{{ tier.tier }}</span>
              <div>
                <h3>{{ tierCopy[tier.tier].title }}</h3>
                <p>{{ tierCopy[tier.tier].sub }}</p>
              </div>
            </header>
            <div class="chord-lab-tier-items">
              <ChordLabShapeCard
                v-for="item in tier.items"
                :key="`${item.symbol}-${item.voicing.frets.join(',')}`"
                compact
                :chord="item.chord"
                :voicing="item.voicing"
                :title="item.symbol"
                :position-text="positionText(item.voicing)"
                :meta-text="metaText(item.voicing)"
                :aria-text="ariaText(item.symbol, item.voicing, 1)"
                :play-label="playLabel(item.symbol, item.voicing)"
                :playing="playingKey === `tier-${item.symbol}-${item.voicing.frets.join(',')}`"
                @play="play(`tier-${item.symbol}-${item.voicing.frets.join(',')}`, item.voicing.frets)"
              >
                <p class="chord-lab-change" :class="{ 'is-color-change': tier.tier === 3 }">{{ changeText(item) }}</p>
              </ChordLabShapeCard>
            </div>
          </article>
        </div>
      </section>

      <section class="chord-lab-legend" :aria-label="messages.legendTitle">
        <span v-for="item in legend" :key="item.family">
          <i class="chord-lab-tone-dot" :data-tone-family="item.family" aria-hidden="true">{{ item.label }}</i>{{ item.text }}
        </span>
      </section>
    </template>
  </main>
</template>
