<script setup>
import { onMounted } from "vue";
import { initializeSiteLocale, useSiteLocale } from "../../i18n/useSiteLocale.js";
import BackToTopButton from "./BackToTopButton.vue";
import SiteFooter from "./SiteFooter.vue";
import SiteHeader from "./SiteHeader.vue";

defineProps({
  activePage: {
    type: String,
    default: ""
  },
  showBackToTop: {
    type: Boolean,
    default: false
  }
});

const { translate } = useSiteLocale();
onMounted(initializeSiteLocale);
</script>

<template>
  <a class="skip-link" href="#main-content">{{ translate("skip.main", "Skip to main content") }}</a>
  <SiteHeader :active-page="activePage" />
  <slot></slot>
  <SiteFooter />
  <BackToTopButton v-if="showBackToTop" />
</template>
