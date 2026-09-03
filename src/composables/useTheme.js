import { computed, ref } from "vue";

const THEME_KEY = "jasperMusicTheme";
const LIGHT_THEME = "light";
const DEFAULT_THEME = "default";

function currentTheme() {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.dataset.theme === LIGHT_THEME
    ? LIGHT_THEME
    : DEFAULT_THEME;
}

export function useTheme() {
  const theme = ref(currentTheme());
  const isLight = computed(() => theme.value === LIGHT_THEME);

  function setTheme(nextTheme) {
    const normalizedTheme = nextTheme === LIGHT_THEME ? LIGHT_THEME : DEFAULT_THEME;
    const previousTheme = currentTheme();
    theme.value = normalizedTheme;
    document.documentElement.dataset.theme = normalizedTheme;

    try {
      window.localStorage.setItem(THEME_KEY, normalizedTheme);
    } catch (error) {
      // Keep the selected theme for the current page when storage is unavailable.
    }

    if (previousTheme !== normalizedTheme) {
      window.dispatchEvent(new CustomEvent("jasper:theme-change", {
        detail: {
          previousTheme,
          theme: normalizedTheme
        }
      }));
    }
  }

  function toggleTheme() {
    setTheme(isLight.value ? DEFAULT_THEME : LIGHT_THEME);
  }

  return {
    isLight,
    theme,
    setTheme,
    toggleTheme
  };
}

export { DEFAULT_THEME, LIGHT_THEME, THEME_KEY };
