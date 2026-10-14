import { computed, ref } from "vue";

const THEME_KEY = "jasperMusicTheme";
// "light" is the v3 paper theme and the default for new visitors.
const LIGHT_THEME = "light";
// "default" stays the stored value for the dark ink theme for existing visitors.
const DEFAULT_THEME = "default";
const DARK_THEME = DEFAULT_THEME;

function currentTheme() {
  if (typeof document === "undefined") return LIGHT_THEME;
  return document.documentElement.dataset.theme === DARK_THEME
    ? DARK_THEME
    : LIGHT_THEME;
}

export function useTheme() {
  const theme = ref(currentTheme());
  const isLight = computed(() => theme.value === LIGHT_THEME);

  function setTheme(nextTheme) {
    const normalizedTheme = nextTheme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
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
    setTheme(isLight.value ? DARK_THEME : LIGHT_THEME);
  }

  return {
    isLight,
    theme,
    setTheme,
    toggleTheme
  };
}

export { DARK_THEME, DEFAULT_THEME, LIGHT_THEME, THEME_KEY };
