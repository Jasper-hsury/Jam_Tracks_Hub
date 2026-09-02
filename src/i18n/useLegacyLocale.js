import { onBeforeUnmount, onMounted, ref } from "vue";

const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = new Set(["en", "zh-TW"]);
const fallbackNotFound = {
  title: "This page missed the downbeat.",
  copy: "The link may have moved, but the music is still here.",
  returnHome: "Return Home",
  openKeyFinder: "Open Key Finder"
};

function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
}

function currentLegacyLanguage() {
  return normalizeLanguage(
    document.documentElement.dataset.language
      || window.JasperI18n?.getLanguage?.()
      || DEFAULT_LANGUAGE
  );
}

function currentNotFoundMessages() {
  return Object.fromEntries(
    Object.entries(fallbackNotFound).map(function([key, fallback]) {
      return [key, window.JasperI18n?.translate?.(`notFound.${key}`, fallback) || fallback];
    })
  );
}

export function useLegacyLocale() {
  const language = ref(currentLegacyLanguage());
  const notFound = ref(currentNotFoundMessages());

  function syncLanguage(event) {
    language.value = normalizeLanguage(
      event?.detail?.language || currentLegacyLanguage()
    );
    notFound.value = currentNotFoundMessages();
  }

  onMounted(function() {
    syncLanguage();
    window.addEventListener("jasper:language-change", syncLanguage);
  });

  onBeforeUnmount(function() {
    window.removeEventListener("jasper:language-change", syncLanguage);
  });

  return {
    language,
    notFound
  };
}
