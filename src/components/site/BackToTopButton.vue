<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const visible = ref(false);
let animationFrame = 0;

function updateVisibility() {
  visible.value = window.scrollY > 300;
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function scrollBackToTop() {
  window.cancelAnimationFrame(animationFrame);
  const startY = window.scrollY;
  if (startY <= 0) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, 0);
    return;
  }

  const duration = 1150;
  const startTime = window.performance.now();
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, Math.round(startY * (1 - easeInOutCubic(progress))));
    if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    else root.style.scrollBehavior = previousScrollBehavior;
  }

  animationFrame = window.requestAnimationFrame(step);
}

onMounted(function() {
  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
});

onBeforeUnmount(function() {
  window.cancelAnimationFrame(animationFrame);
  window.removeEventListener("scroll", updateVisibility);
});
</script>

<template>
  <button
    id="backToTopBtn"
    type="button"
    aria-label="Back to top"
    :style="{ display: visible ? 'grid' : 'none' }"
    @click="scrollBackToTop"
  >
    &uarr;
  </button>
</template>
