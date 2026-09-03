const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("makes Feedback the fifth production Vue-owned MPA entry", () => {
  const config = read("vite.config.mjs");
  const html = read("feedback.html");
  const entry = read("src/entries/feedback.js");

  assert.match(config, /feedback:\s*resolve\(root,\s*"feedback\.html"\)/);
  assert.match(html, /<div id="vue-feedback-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/feedback\.js"><\/script>/);
  assert.doesNotMatch(html, /scripts\/feedback\.js/);
  assert.match(entry, /mountSitePage\(\{[\s\S]*mountId: "vue-feedback-root"[\s\S]*showBackToTop: true[\s\S]*view: FeedbackView/);
  assert.equal(fs.existsSync(path.join(root, "scripts/feedback.js")), false);
});

test("preserves Feedback metadata, analytics, shell, and page route", () => {
  const html = read("feedback.html");

  assert.match(html, /<title>Feedback \| Jam Tracks Hub<\/title>/);
  assert.match(html, /<meta name="description" content="Share a topic and suggestion to help improve Jam Tracks Hub\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/feedback\.html">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/jamtrackshub\.com\/feedback\.html">/);
  assert.match(html, /<body data-i18n-title="titles\.feedback">/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"/);
  assert.doesNotMatch(html, /<footer class="footer">/);
  assert.doesNotMatch(html, /id="backToTopBtn"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n)\.js/);
});

test("preserves the Feedback field and accessibility contract", () => {
  const view = read("src/views/FeedbackView.vue");

  assert.match(view, /<main class="tracks-page feedback-page" id="main-content">/);
  assert.match(view, /<h1>\{\{ feedback\.title \}\}<\/h1>/);
  assert.match(view, /aria-labelledby="feedbackFormTitle"/);
  assert.match(view, /id="feedbackForm"/);
  assert.match(view, /data-feedback-endpoint="\/api\/feedback"/);
  assert.match(view, /name="topic"[\s\S]*?maxlength="120"[\s\S]*?required/);
  assert.match(view, /name="suggestion"[\s\S]*?maxlength="2400"[\s\S]*?rows="8"[\s\S]*?required/);
  assert.match(view, /name="website"[\s\S]*?tabindex="-1"[\s\S]*?aria-hidden="true"/);
  assert.match(view, /type="submit" :disabled="submitting"/);
  assert.match(view, /id="feedbackStatus"[\s\S]*?aria-live="polite"/);
  assert.match(view, /topicInput\.value\?\.focus\(\)/);
  assert.match(view, /suggestionInput\.value\?\.focus\(\)/);
});

test("validates trimmed Feedback fields deterministically", async () => {
  const serviceUrl = pathToFileURL(path.join(root, "src/services/feedbackApi.mjs"));
  const { validateFeedbackFields } = await import(serviceUrl.href);

  assert.deepEqual(validateFeedbackFields("  ", "suggestion"), {
    valid: false,
    field: "topic",
    topic: "",
    suggestion: "suggestion"
  });
  assert.deepEqual(validateFeedbackFields("topic", "  "), {
    valid: false,
    field: "suggestion",
    topic: "topic",
    suggestion: ""
  });
  assert.deepEqual(validateFeedbackFields("  topic  ", "  suggestion  "), {
    valid: true,
    field: null,
    topic: "topic",
    suggestion: "suggestion"
  });
});

test("preserves Feedback POST and payload behavior with controlled fetch", async () => {
  const serviceUrl = pathToFileURL(path.join(root, "src/services/feedbackApi.mjs"));
  const { submitFeedback } = await import(serviceUrl.href);
  const payload = {
    topic: "Synthetic topic",
    suggestion: "Synthetic suggestion",
    website: "",
    page: "/feedback.html"
  };
  let request;

  const result = await submitFeedback({
    endpoint: "/api/feedback",
    payload,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, status: "received" }) };
    }
  });

  assert.deepEqual(request, {
    url: "/api/feedback",
    options: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  });
  assert.deepEqual(result, { ok: true, status: "received" });

  await assert.rejects(submitFeedback({
    endpoint: "/api/feedback",
    payload,
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ ok: false, message: "Rejected" })
    })
  }), /Rejected/);
  await assert.rejects(submitFeedback({
    endpoint: "/api/feedback",
    payload,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ ok: false })
    })
  }), /Feedback failed/);
});

test("preserves Feedback loading, success, error, reset, and locale ownership", () => {
  const view = read("src/views/FeedbackView.vue");

  assert.match(view, /submitting\.value = true[\s\S]*?setStatus\("sending", "pending"\)/);
  assert.match(view, /setStatus\("success", "success"\)/);
  assert.match(view, /catch \(error\) \{\s*setStatus\("error", "error"\)/);
  assert.match(view, /finally \{\s*submitting\.value = false/);
  assert.match(view, /topic\.value = ""[\s\S]*?suggestion\.value = ""[\s\S]*?website\.value = ""/);
  assert.match(view, /page: window\.location\.pathname \|\| "\/feedback\.html"/);
  assert.match(view, /useSiteLocale\(\)/);
  assert.doesNotMatch(view, /data-i18n|v-html|innerHTML|console\.|localStorage|data-umami-event|analytics/i);
});

test("keeps Feedback bounded, mutation-free in tests, and preserves legacy output", () => {
  const packageJson = JSON.parse(read("package.json"));
  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  const testSource = read("tests/vue-feedback-migration.test.js");

  assert.equal(packageJson.version, "2.0.3");
  assert.equal(packageJson.dependencies.vue, "3.5.42");
  assert.match(verifier, /const viteOwnedRootHtml = new Set\(\["404\.html", "legal\.html", "privacy-policy\.html", "service-waking\.html", "feedback\.html"\]\)/);
  assert.match(verifier, /Feedback canonical metadata differs/);
  assert.match(verifier, /compiled Vue Feedback mount marker is missing/);
  assert.doesNotMatch(testSource, /https:\/\/jamtrackshub\.com\/api\/feedback/);
  assert.match(verifier, /root HTML is not byte-identical/);
});
