<script setup>
import { computed } from "vue";
import {
  formatPercent,
  formatRelativeScore,
  resultLinks
} from "../../music/keyFinder.mjs";

const props = defineProps({
  data: { type: Object, required: true },
  dynamic: { type: Object, required: true },
  messages: { type: Object, required: true },
  mode: { type: String, default: "quick" }
});

const confidence = computed(() => {
  if (props.data.confidence === null || props.data.confidence === undefined) return null;
  return Math.max(0, Math.min(100, Number(props.data.confidence)));
});
const confidenceLabel = computed(() => confidence.value === null ? props.dynamic["03"] : `${confidence.value.toFixed(1)}%`);
const certainty = computed(() => props.data.certainty || "medium");
const certaintyLabel = computed(() => String(props.dynamic["02"] || "{{certainty}} certainty").replace("{{certainty}}", certainty.value));
const notes = computed(() => props.data.main_notes?.length ? props.data.main_notes.join(", ") : "No clear notes");
const links = computed(() => resultLinks(props.data.final_key));
const cachedLabel = computed(() => props.data.cached ? props.dynamic["04"] : (props.data.source || "analysis"));
const alternateNames = computed(() => (props.data.possible_keys || [])
  .map(candidate => candidate?.key)
  .filter(key => key && key !== props.data.final_key)
  .slice(0, 3));

function readableList(items, fallback) {
  const values = (items || []).filter(Boolean).map(String);
  if (!values.length) return fallback;
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

const explanation = computed(() => {
  const finalKey = props.data.final_key || "the final key";
  const ruleKey = props.data.rule_key || "not available";
  const priorityKey = props.data.priority_key || "not available";
  const family = props.data.key_family || "not available";
  const mainNotes = readableList((props.data.main_notes || []).slice(0, 4), "not enough clear note evidence");
  const alternates = readableList(alternateNames.value, "no close alternate keys");
  let meaning = `Treat ${finalKey} as the leading tonal center, with ${family} as the surrounding key family.`;
  if (certainty.value === "low" || props.data.uncertain) {
    meaning = `Treat ${finalKey} as a leading candidate, not a final answer. The evidence is mixed enough that a quick ear check is still useful.`;
  } else if (certainty.value === "high") {
    meaning = `${finalKey} is strongly supported by the combined analysis, so it is a solid starting point for scales, chords, and practice.`;
  }
  let reason = `The strongest note evidence points around ${mainNotes}. The scale-fit rule chose ${ruleKey}, while the keyboard/bass priority pass chose ${priorityKey}.`;
  if (ruleKey === props.data.final_key && priorityKey === props.data.final_key) {
    reason = `The rule-based pass and keyboard/bass priority pass both agree on ${finalKey}, and the strongest notes are ${mainNotes}.`;
  } else if (ruleKey === priorityKey) {
    reason = `The rule-based pass and keyboard/bass priority pass both point to ${ruleKey}; the final result weighs that against the ML model and the key family.`;
  }
  const nextCheck = certainty.value === "low" || props.data.uncertain
    ? `Check whether the song resolves more naturally to ${finalKey} or one of these alternates: ${alternates}.`
    : `Use ${finalKey} first, then compare it with ${alternates} if a section sounds like it shifts.`;
  return { meaning, reason, nextCheck };
});

const evidence = computed(() => [
  [props.dynamic["16"], formatPercent(props.data.ml_confidence, "Not used")],
  [props.dynamic["17"], formatPercent(props.data.rule_confidence)],
  [props.dynamic["18"], formatPercent(props.data.rule_gap)],
  [props.dynamic["19"], formatPercent(props.data.priority_gap)]
]);

const rankings = computed(() => [
  ["Overall ranking", props.data.overall_ranking || [], "key"],
  ["Keyboard/Bass priority", props.data.priority_ranking || [], "key"],
  ["Key family ranking", props.data.family_ranking || [], "family"]
]);
</script>

<template>
  <div class="result-summary">
    <span class="result-kicker">{{ dynamic["01"] }}</span>
    <div class="result-title-row">
      <strong class="key-finder-final">{{ data.final_key }}</strong>
      <span class="certainty-badge" :class="`certainty-${certainty}`">{{ certaintyLabel }}</span>
    </div>
    <span class="result-source">{{ cachedLabel }}</span>
  </div>

  <div class="confidence-row">
    <div class="confidence-label">
      <span>{{ data.confidence_label || messages.confidence }}</span>
      <strong>{{ confidenceLabel }}</strong>
    </div>
    <div class="confidence-bar" aria-hidden="true"><span :style="{ width: `${confidence || 0}%` }"></span></div>
  </div>
  <p class="confidence-note" :class="{ 'is-uncertain': data.uncertain }">{{ data.confidence_note || "" }}</p>

  <section class="result-explanation" aria-label="Key result explanation">
    <div class="result-explanation-heading">
      <span>{{ dynamic["05"] }}</span>
      <strong>{{ confidence === null ? dynamic["03"] : `${confidence.toFixed(1)}% confidence` }}</strong>
    </div>
    <div class="result-explanation-grid">
      <article class="result-explanation-card"><h4>{{ dynamic["06"] }}</h4><p>{{ explanation.meaning }}</p></article>
      <article class="result-explanation-card"><h4>{{ dynamic["07"] }}</h4><p>{{ explanation.reason }}</p></article>
      <article class="result-explanation-card"><h4>{{ dynamic["08"] }}</h4><p>{{ explanation.nextCheck }}</p></article>
    </div>
  </section>

  <div class="result-details">
    <p><span>{{ dynamic["09"] }}</span>{{ data.key_family || "Not available" }}</p>
    <p><span>{{ dynamic["10"] }}</span>{{ notes }}</p>
    <p class="result-detail-section"><span>{{ dynamic["11"] }}</span>{{ data.rule_key || "Not available" }}</p>
    <p class="result-detail-section"><span>{{ dynamic["12"] }}</span>{{ data.priority_key || "Not available" }}</p>
    <p class="result-detail-section"><span>{{ dynamic["13"] }}</span>{{ data.model_version || "Not available" }}</p>
  </div>

  <div v-if="data.possible_keys?.length" class="key-finder-candidates">
    <p>{{ dynamic["14"] }} <span>rule score compared with final key</span></p>
    <ul><li v-for="candidate in data.possible_keys.slice(0, 4)" :key="candidate.key"><span>{{ candidate.key }}</span><strong>{{ formatRelativeScore(candidate.relative_score) }}</strong></li></ul>
    <small class="key-finder-candidates-note">{{ dynamic["15"] }}</small>
  </div>

  <div class="result-actions">
    <a class="primary-button" :href="links.scale">{{ dynamic["24"] }}</a>
    <a class="secondary-button" :href="links.dictionary">{{ dynamic["25"] }}</a>
    <a class="secondary-button" :href="links.progressions">{{ dynamic["26"] }}</a>
    <a class="secondary-button" :href="links.tracks">{{ dynamic["27"] }}</a>
  </div>

  <template v-if="mode === 'detailed'">
    <div class="result-evidence-grid result-detail-section">
      <div v-for="item in evidence" :key="item[0]"><span>{{ item[0] }}</span><strong>{{ item[1] }}</strong></div>
    </div>
    <div v-if="data.ml_details" class="result-details result-details-secondary result-detail-section">
      <p><span>{{ dynamic["20"] }}</span>{{ data.ml_details.key?.prediction || "Not available" }}{{ data.ml_details.key?.confidence == null ? "" : ` (${formatPercent(data.ml_details.key.confidence)})` }}</p>
      <p><span>{{ dynamic["21"] }}</span>{{ data.ml_details.family?.prediction || "Not available" }}{{ data.ml_details.family?.confidence == null ? "" : ` (${formatPercent(data.ml_details.family.confidence)})` }}</p>
      <p><span>{{ dynamic["22"] }}</span>{{ data.ml_details.mode?.prediction || "Not available" }}{{ data.ml_details.mode?.confidence == null ? "" : ` (${formatPercent(data.ml_details.mode.confidence)})` }}</p>
      <p><span>{{ dynamic["23"] }}</span>{{ data.ml_details.basis || "Not available" }}</p>
    </div>
    <div class="result-ranking-grid result-detail-section">
      <div v-for="ranking in rankings.filter(item => item[1].length)" :key="ranking[0]" class="result-ranking-block">
        <h4>{{ ranking[0] }}</h4>
        <ul><li v-for="(item, index) in ranking[1].slice(0, 5)" :key="`${ranking[0]}-${index}`"><span>{{ index + 1 }}. {{ item[ranking[2]] }}</span><strong>{{ formatPercent(item.relative_score) }}</strong></li></ul>
      </div>
      <div v-if="data.strongest_notes?.length" class="result-ranking-block">
        <h4>Strongest notes</h4>
        <ul><li v-for="item in data.strongest_notes.slice(0, 7)" :key="item.note"><span>{{ item.note }}</span><strong>{{ formatPercent(item.strength) }}</strong></li></ul>
      </div>
    </div>
    <div class="result-analysis-notes result-detail-section">
      <p><span>Conflict resolution</span>{{ data.conflict_resolution || "Not available" }}</p>
      <p><span>Mode resolution</span>{{ data.mode_resolution || "Not available" }}</p>
    </div>
  </template>
</template>
