import { computed, readonly, ref } from "vue";
import englishMessages from "../../locales/en/common.json";
import traditionalChineseMessages from "../../locales/zh-TW/common.json";

const LANGUAGE_KEY = "jasperMusicLanguage";
const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = new Set(["en", "zh-TW"]);
const messages = {
  en: englishMessages,
  "zh-TW": traditionalChineseMessages
};

function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
}

function initialLanguage() {
  if (typeof document === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguage(
    globalThis.JasperI18nPreload?.language
      || document.documentElement.dataset.language
      || DEFAULT_LANGUAGE
  );
}

function nestedValue(source, path) {
  return String(path || "").split(".").reduce(function(value, segment) {
    if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
      return value[segment];
    }
    return undefined;
  }, source);
}

const language = ref(initialLanguage());
let initialized = false;

function translate(key, fallback) {
  return nestedValue(messages[language.value], key)
    ?? nestedValue(messages[DEFAULT_LANGUAGE], key)
    ?? fallback;
}

function applyDocumentLanguage() {
  if (typeof document === "undefined") return;

  document.documentElement.lang = language.value === "zh-TW" ? "zh-TW" : "en";
  document.documentElement.dataset.language = language.value;

  const titleKey = document.body?.dataset.i18nTitle;
  const title = titleKey && translate(titleKey);
  if (typeof title === "string") document.title = title;

  document.documentElement.dataset.i18nReady = "true";
  document.documentElement.removeAttribute("data-i18n-loading");
  document.getElementById("i18n-loading-style")?.remove();
}

function dispatchLanguageChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jasper:language-change", {
    detail: { language: language.value }
  }));
}

function saveLanguage(nextLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  } catch (error) {
    // Keep the selected language for the current page when storage is unavailable.
  }
}

function setLanguage(nextLanguage) {
  language.value = normalizeLanguage(nextLanguage);
  saveLanguage(language.value);
  applyDocumentLanguage();
  dispatchLanguageChange();
}

export function initializeSiteLocale() {
  applyDocumentLanguage();
  if (initialized) return;
  initialized = true;
  dispatchLanguageChange();
}

export function useSiteLocale() {
  const notFound = computed(() => ({
    title: translate("notFound.title", "This page missed the downbeat."),
    copy: translate("notFound.copy", "The link may have moved, but the music is still here."),
    returnHome: translate("notFound.returnHome", "Return Home"),
    openKeyFinder: translate("notFound.openKeyFinder", "Open Key Finder")
  }));

  return {
    language: readonly(language),
    notFound,
    setLanguage,
    translate
  };
}

export { LANGUAGE_KEY, normalizeLanguage };
