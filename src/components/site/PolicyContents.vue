<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  sectionCount: { type: String, required: true },
  sections: { type: Array, required: true }
});

const open = ref(false);
const currentId = ref(props.sections[0]?.id || "");
const numbered = computed(() => props.sections.map((section, index) => ({
  ...section,
  number: String(index + 1).padStart(2, "0")
})));
let frame = 0;
let pinnedUntil = 0;

// The current section is the last one whose top has passed the upper third of the viewport.
function updateCurrent() {
  frame = 0;
  if (Date.now() < pinnedUntil) return;
  const line = window.innerHeight * 0.35;
  let current = props.sections[0]?.id || "";
  props.sections.forEach(function(section) {
    const element = document.getElementById(section.id);
    if (element && element.getBoundingClientRect().top <= line) current = section.id;
  });
  currentId.value = current;
}

function scheduleUpdate() {
  if (!frame) frame = window.requestAnimationFrame(updateCurrent);
}

function choose(id) {
  currentId.value = id;
  pinnedUntil = Date.now() + 1000;
  open.value = false;
}

onMounted(function() {
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  scheduleUpdate();
});

onBeforeUnmount(function() {
  window.removeEventListener("scroll", scheduleUpdate);
  window.removeEventListener("resize", scheduleUpdate);
  if (frame) window.cancelAnimationFrame(frame);
});
</script>

<template>
  <nav class="policy-contents" :class="{ 'is-open': open }" :aria-label="label">
    <p class="policy-contents-label">{{ label }}</p>
    <button
      class="policy-contents-toggle"
      type="button"
      aria-controls="policyContentsList"
      :aria-expanded="open ? 'true' : 'false'"
      @click="open = !open"
    >
      <span>{{ label }} · {{ sectionCount }}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m7 10 5 5 5-5"></path></svg>
    </button>
    <ol id="policyContentsList">
      <li v-for="section in numbered" :key="section.id">
        <a
          :href="`#${section.id}`"
          :class="{ 'is-current': currentId === section.id }"
          :aria-current="currentId === section.id ? 'location' : null"
          @click="choose(section.id)"
        >
          <span class="policy-contents-number">{{ section.number }}</span>
          <span>{{ section.title }}</span>
        </a>
      </li>
    </ol>
  </nav>
</template>
