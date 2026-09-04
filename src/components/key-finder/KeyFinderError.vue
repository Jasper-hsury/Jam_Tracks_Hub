<script setup>
import { computed } from "vue";

const props = defineProps({
  error: { type: Object, required: true },
  messages: { type: Object, required: true },
  statusText: { type: String, default: "Unknown" }
});

const message = computed(() => {
  if (props.error.code === "empty-file") return props.messages.emptyFile;
  if (props.error.code === "empty-youtube") return props.messages.emptyYoutube;
  if (props.error.code === "file-too-large") return props.messages.fileTooLarge;
  if (props.error.code === "container-too-large") return props.messages.containerTooLarge;
  if (props.error.code === "stopped") return props.messages.stopped;
  return props.error.message || props.messages.analysisFailed;
});

const suggestedFix = computed(() => {
  const lower = message.value.toLowerCase();
  let suggestion = props.error.inputType === "file"
    ? "MP3 or WAV is the most stable. Try an audio-only file under 25 MB."
    : "Try again in a moment. If YouTube blocks the cloud analyzer, upload an audio file or use the Local Helper.";
  if (lower.includes("timed out") || lower.includes("render returned")) {
    suggestion = "The analyzer exceeded the hosting limit. Try a shorter MP3/WAV file, or run the local API.";
  }
  if (props.error.inputType === "youtube" && lower.includes("helper")) {
    suggestion = "Run the helper setup once. On Mac, run INSTALL_MAC_HELPER_PROTOCOL.command. On Windows, run 2_CONNECT_HELPER_TO_WEBSITE.cmd. Then refresh Key Finder and allow the browser to open the local YouTube Helper.";
  }
  if (props.error.inputType === "youtube" && (lower.includes("youtube blocked") || lower.includes("cookies may have expired"))) {
    suggestion = "The cloud API reached YouTube, but YouTube rejected the server cookies. Refresh the Render YouTube cookies, use Local Helper on this computer, or upload an audio file.";
  }
  if (props.error.inputType === "youtube" && lower.includes("sign in to confirm")) {
    suggestion = "The local helper reached YouTube, but YouTube still requested verification. Try another link or upload an audio file.";
  }
  return suggestion;
});

const displayStatus = computed(() => (
  props.error.inputType === "youtube" && message.value.toLowerCase().includes("youtube blocked")
    ? "Cloud API blocked by YouTube"
    : props.statusText
));
</script>

<template>
  <div class="error-report">
    <strong>{{ messages.analysisFailed }}</strong>
    <p>{{ message }}</p>
    <dl>
      <div><dt>{{ messages.apiUrl }}</dt><dd>{{ error.baseUrl }}</dd></div>
      <div><dt>{{ messages.status }}</dt><dd>{{ displayStatus }}</dd></div>
      <div><dt>{{ messages.suggestedFix }}</dt><dd>{{ suggestedFix }}</dd></div>
    </dl>
  </div>
</template>
