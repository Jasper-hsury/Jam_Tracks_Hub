<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  HERO_TITLE_BOX,
  HERO_TITLE_BRUSH,
  HERO_TITLE_FONT_SIZE,
  HERO_TITLE_GLYPHS,
  HERO_TITLE_JAM_LENGTH,
  HERO_TITLE_STROKES,
  HERO_TITLE_TEXT,
  HERO_TITLE_WORD_GAP,
  strokePath
} from "./heroTitleStrokes.mjs";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  tagline: {
    type: String,
    required: true
  }
});

const WRITE_MS = 3800;
const FONT_TIMEOUT_MS = 3000;
const MASK_RELEASE_MS = 900;
const box = HERO_TITLE_BOX;
const viewBox = `${box.x} ${box.y} ${box.width} ${box.height}`;
const brushWidth = (HERO_TITLE_FONT_SIZE * HERO_TITLE_BRUSH).toFixed(1);
const titleWords = [
  HERO_TITLE_GLYPHS.slice(0, HERO_TITLE_JAM_LENGTH),
  HERO_TITLE_GLYPHS.slice(HERO_TITLE_JAM_LENGTH)
];
const waveBars = Array.from({ length: 48 }, function(_, index) {
  const level = 0.25 + 0.75 * Math.abs(Math.sin(index * 0.55) * Math.cos(index * 0.21));
  return { height: `${Math.round(level * 100)}%`, hot: index % 8 === 0 };
});

// A tagline too wide for one line splits after its first sentence onto two
// staggered lines (first left, rest right); one that fits stays on one line.
const taglineLines = computed(function() {
  const match = props.tagline.match(/^(.+?[.!?。！？，,])\s*(\S.*)$/u);
  return match ? [match[1], match[2]] : [props.tagline];
});

const prefersReducedMotion = typeof window === "undefined"
  || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// pending → writing → done. "done" from the first render means no motion at all.
const phase = ref(prefersReducedMotion ? "done" : "pending");
const glyphs = ref([]);
const solidText = ref(null);
const taglineElement = ref(null);
const taglineSizer = ref(null);
const taglineSplit = ref(false);
let taglineObserver = null;
const strokeElements = [];
let frame = 0;
let releaseTimer = 0;
let disposed = false;

function setStrokeElement(order, element) {
  strokeElements[order] = element;
}

async function waitForTitleFont() {
  if (!document.fonts?.load) return false;
  const fontSpec = `${HERO_TITLE_FONT_SIZE}px Yellowtail`;
  const timeout = new Promise(resolve => window.setTimeout(resolve, FONT_TIMEOUT_MS));
  try {
    await Promise.race([document.fonts.load(fontSpec, HERO_TITLE_TEXT), timeout]);
  } catch (error) {
    return false;
  }
  return document.fonts.check(fontSpec, HERO_TITLE_TEXT);
}

// One mask per glyph, so a stroke only ever reveals its own letter.
function measureGlyphs(text) {
  let order = 0;
  const result = [];
  Array.from(HERO_TITLE_GLYPHS).forEach(function(character, index) {
    if (character === " ") return;
    const start = text.getStartPositionOfChar(index);
    const extent = text.getExtentOfChar(index);
    const strokes = HERO_TITLE_STROKES
      .filter(([glyphIndex]) => glyphIndex === index)
      .map(([, points]) => ({
        order: order++,
        path: strokePath(points.map(([u, v]) => [extent.x + u * HERO_TITLE_FONT_SIZE, v * HERO_TITLE_FONT_SIZE]))
      }));
    result.push({
      character,
      maskId: `home-hero-title-glyph-${index}`,
      tone: index < HERO_TITLE_JAM_LENGTH ? "is-jam" : "is-tracks",
      x: start.x.toFixed(1),
      strokes
    });
  });
  return result;
}

function finishWriting() {
  phase.value = "done";
  releaseTimer = window.setTimeout(function() {
    glyphs.value = [];
  }, MASK_RELEASE_MS);
}

function write(paths) {
  // Each stroke is its own path: dashing restarts per subpath, so one long path would draw every stroke at once.
  const lengths = paths.map(path => path.getTotalLength());
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let startedAt = 0;

  function step(now) {
    if (disposed) return;
    startedAt ||= now;
    const progress = Math.min((now - startedAt) / WRITE_MS, 1);
    let remaining = total * progress;
    paths.forEach(function(path, index) {
      const length = lengths[index];
      const drawn = Math.max(0, Math.min(length, remaining));
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = String(length - drawn);
      remaining -= length;
    });
    if (progress < 1) {
      frame = window.requestAnimationFrame(step);
    } else {
      finishWriting();
    }
  }

  phase.value = "writing";
  frame = window.requestAnimationFrame(step);
}

function measureTagline() {
  const available = taglineElement.value?.parentElement?.clientWidth;
  if (!available || !taglineSizer.value) return;
  const oneLineWidth = taglineSizer.value.getBoundingClientRect().width;
  taglineSplit.value = taglineLines.value.length > 1 && oneLineWidth > available;
}

watch(() => props.tagline, () => nextTick(measureTagline));

onMounted(function() {
  measureTagline();
  document.fonts?.ready?.then(measureTagline).catch(() => {});
  if (typeof ResizeObserver === "function" && taglineElement.value?.parentElement) {
    taglineObserver = new ResizeObserver(measureTagline);
    taglineObserver.observe(taglineElement.value.parentElement);
  }
});

onMounted(async function() {
  if (phase.value === "done") return;
  const fontReady = await waitForTitleFont();
  if (disposed) return;
  if (!fontReady || !solidText.value?.getExtentOfChar) {
    phase.value = "done";
    return;
  }
  try {
    glyphs.value = measureGlyphs(solidText.value);
    await nextTick();
    const paths = strokeElements.slice(0, HERO_TITLE_STROKES.length).filter(Boolean);
    if (disposed) return;
    if (paths.length !== HERO_TITLE_STROKES.length) throw new Error("Hero title strokes did not render");
    write(paths);
  } catch (error) {
    // Never leave the title hidden: show it whole if the writing cannot run.
    console.warn("Hero title writing skipped:", error);
    glyphs.value = [];
    phase.value = "done";
  }
});

onBeforeUnmount(function() {
  disposed = true;
  taglineObserver?.disconnect();
  window.cancelAnimationFrame(frame);
  window.clearTimeout(releaseTimer);
});
</script>

<template>
  <div class="home-hero-title-block" :data-phase="phase">
    <h1 class="home-hero-title">
      <span class="home-hero-title-text">{{ title }}</span>
      <svg class="home-hero-title-art" :viewBox="viewBox" aria-hidden="true" focusable="false">
        <defs>
          <mask
            v-for="glyph in glyphs"
            :id="glyph.maskId"
            :key="glyph.maskId"
            maskUnits="userSpaceOnUse"
            :x="box.x"
            :y="box.y"
            :width="box.width"
            :height="box.height"
          >
            <rect :x="box.x" :y="box.y" :width="box.width" :height="box.height" fill="black" />
            <path
              v-for="stroke in glyph.strokes"
              :key="stroke.order"
              :ref="element => setStrokeElement(stroke.order, element)"
              :d="stroke.path"
              fill="none"
              stroke="white"
              :stroke-width="brushWidth"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="stroke-dasharray: 0 99999"
            />
          </mask>
        </defs>
        <!-- WebKit clips a masked single-glyph <text> to its advance box, so the full-size rect keeps swashes visible. -->
        <g v-for="glyph in glyphs" :key="glyph.maskId" :mask="`url(#${glyph.maskId})`">
          <rect :x="box.x" :y="box.y" :width="box.width" :height="box.height" fill="none" />
          <text class="home-hero-title-glyph" :class="glyph.tone" :x="glyph.x" y="0">{{ glyph.character }}</text>
        </g>
        <text ref="solidText" class="home-hero-title-solid" x="0" y="0">
          <tspan class="is-jam">{{ titleWords[0] }}</tspan><tspan class="is-tracks" :dx="HERO_TITLE_WORD_GAP">{{ titleWords[1] }}</tspan>
        </text>
      </svg>
    </h1>
    <div class="home-hero-title-wave" aria-hidden="true">
      <span v-for="(bar, index) in waveBars" :key="index" :class="{ 'is-hot': bar.hot }" :style="{ height: bar.height }"></span>
    </div>
    <div class="home-hero-title-rule" aria-hidden="true"></div>
    <p ref="taglineElement" class="signature-slogan home-hero-tagline" :class="{ 'is-split': taglineSplit }">
      <template v-for="(line, index) in taglineLines" :key="index">
        <span class="home-hero-tagline-line">{{ line }}</span>{{ index < taglineLines.length - 1 ? " " : "" }}
      </template>
      <span class="home-hero-tagline-sizer" aria-hidden="true"><span ref="taglineSizer">{{ tagline }}</span></span>
    </p>
  </div>
</template>
