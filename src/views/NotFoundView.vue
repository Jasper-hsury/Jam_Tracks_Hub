<script setup>
import { useSiteLocale } from "../i18n/useSiteLocale.js";

const { notFound } = useSiteLocale();
</script>

<template>
  <main id="main-content" class="status-page">
    <p class="status-page-code">404</p>
    <h1>{{ notFound.title }}</h1>
    <p>{{ notFound.copy }}</p>
    <div class="status-page-actions">
      <a class="primary-button" href="/index.html">{{ notFound.returnHome }}</a>
      <a class="secondary-button" href="/key-finder.html">{{ notFound.openKeyFinder }}</a>
    </div>
  </main>
</template>
