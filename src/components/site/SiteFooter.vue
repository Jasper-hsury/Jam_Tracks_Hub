<script setup>
import { useSiteLocale } from "../../i18n/useSiteLocale.js";

const { translate } = useSiteLocale();
</script>

<template>
  <footer class="footer">
    <p>
      <span class="footer-rights">{{ translate("footer.rights", "© 2026 Jam Tracks Hub. All rights reserved.") }}</span>
      <span class="footer-legal-separator" aria-hidden="true"> · </span>
      <a class="footer-legal-link" href="/legal.html">{{ translate("footer.legal", "Legal & Usage Policy") }}</a>
    </p>
    <div class="social-links">
      <a
        href="https://youtube.com/@weekly_backing_track?si=-Rp6XDvP0A8fclp3"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Jam Tracks Hub YouTube channel"
      >YouTube</a>
      <a
        href="https://www.instagram.com/reyu_jasper?igsh=dmVsazFvb2pwMmsw&utm_source=qr"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Jam Tracks Hub Instagram profile"
      >Instagram</a>
    </div>
  </footer>
</template>
