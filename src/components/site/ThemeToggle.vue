<script setup>
import { computed } from "vue";
import { useTheme } from "../../composables/useTheme.js";
import { useSiteLocale } from "../../i18n/useSiteLocale.js";

const { isLight, toggleTheme } = useTheme();
const { translate } = useSiteLocale();
const ariaLabel = computed(() => isLight.value
  ? translate("theme.switchToDark", "Switch to dark theme")
  : translate("theme.switchToLight", "Switch to light theme"));
</script>

<template>
  <label class="theme-toggle nav-theme-toggle" :class="{ 'is-light-theme': isLight }">
    <input
      class="theme-toggle-input"
      type="checkbox"
      :checked="isLight"
      :aria-label="ariaLabel"
      @change="toggleTheme"
    >
    <span class="theme-toggle-label">{{ translate("nav.appearance", "Appearance") }}</span>
    <span class="theme-toggle-switch" aria-hidden="true">
      <!-- Paper theme shows a moon (switch to ink); ink theme shows a sun (switch to paper). -->
      <svg v-if="isLight" class="v3-theme-icon" viewBox="0 0 24 24" width="18" height="18">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
      </svg>
      <svg v-else class="v3-theme-icon" viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
      </svg>
    </span>
  </label>
</template>
