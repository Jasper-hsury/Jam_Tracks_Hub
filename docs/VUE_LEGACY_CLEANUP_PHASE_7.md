# Vue Legacy Cleanup Phase 7

## Scope and baseline

This document records the read-only Phase 7A audit and the bounded cleanup plan for the completed Vue 3 multi-page migration. The audit baseline is canonical `main` commit `10cbaf3423075fdafef245bca75e4ac1a9ca1c69`, with local and `origin/main` at 0 ahead / 0 behind when the Phase 7 branch was created.

Phase 7 is an internal, behavior-preserving frontend cleanup. It does not authorize a Vue Router conversion, URL changes, a design refresh, a backend change, a data or storage migration, a version change, a tag, a release, or a production deployment.

## Method

The audit checked:

- all 15 root HTML documents and all 18 static track-slide HTML documents;
- all Vue entries, views, components, composables, services, and music/domain modules;
- all classic scripts and all stylesheets;
- exact references, ES imports, dynamic imports, globals, events, generated classes, and runtime lookup patterns;
- Vite entries and HTML-asset preservation, the Cloudflare copier and verifier, Worker asset configuration, tests, fixtures, and documentation;
- bounded production asset inventories for Homepage, Tracks, Song Workspace, Key Finder, and a representative static track slide.

Production inspection was read-only. It did not submit Feedback, subscribe an email address, create a Key Finder analysis job, or create/import Song Workspace content.

## Classification model

- `PROVEN_DEAD`: no current runtime, HTML, import, or other product consumer. Generic directory copying, obsolete test assertions, and historical documentation do not make an otherwise unreferenced runtime live.
- `STILL_CANONICAL`: actively used by current production Vue, static runtime, or the supported build.
- `SHARED_LEGACY_COMPATIBILITY`: still required by current consumers through a classic-script/global bridge and therefore retained.
- `UNCERTAIN`: removal cannot be proved behavior-preserving. It is retained.

## Inventory result

### Proven dead (6)

| Resource | Evidence | Planned action |
| --- | --- | --- |
| `scripts/home.js` | No HTML reference, import, injection, global consumer, or production load. Homepage behavior is owned by `HomeView.vue` and its Vue services. | Remove. |
| `scripts/tracks.js` | No HTML reference, import, injection, global consumer, or production load. Tracks behavior is owned by `TracksView.vue`, `TrackCard.vue`, `useSiteLocale.js`, and `tracksData.mjs`. | Remove. |
| `src/i18n/useLegacyLocale.js` | No ES or dynamic importer and no Vite entry. All 14 pages use `useSiteLocale.js`. | Remove. |
| `styles/style.css` | No HTML, CSS import, Vue, script, build-specific, or production runtime consumer. Its only content is an obsolete compatibility import list. | Remove. |
| `scripts/site.js` | No current HTML or module consumer and absent from bounded production loads. Vue `SiteShell`, `SiteHeader`, `useSmartNavbar`, `ThemeToggle`, `BackToTopButton`, and Homepage subscription service own its former behaviors. | Remove with obsolete tests/build preservation entries. |
| `scripts/i18n.js` | No current HTML or module consumer and absent from bounded production loads. `i18n-init.js` retains prepaint; `useSiteLocale.js` owns reactive runtime localization. | Remove with obsolete tests/build preservation entries. |

The generic `scripts/` and `styles/` Cloudflare copy rules do not require any one file to exist and naturally omit a deleted file. The only exact build metadata for `site.js` and `i18n.js` is an obsolete Vite HTML-preservation string list; current HTML contains neither string, so the preservation transforms never match them.

### Still canonical

The following audited resources remain active and must be retained:

- root documents: `404.html`, `chord-dictionary.html`, `chord-progressions.html`, `feedback.html`, `fretboard-trainer.html`, `googlec8a4768d207b3044.html`, `index.html`, `key-finder.html`, `legal.html`, `privacy-policy.html`, `progression-writer.html`, `scale.html`, `service-waking.html`, `song-workspace.html`, and `tracks.html`;
- all 18 `slides/w*.html` documents and their canonical image/PDF/package assets;
- `scripts/theme-init.js` and `scripts/i18n-init.js` for early prepaint;
- `scripts/song-workspace-core.js`, `scripts/song-workspace-storage.js`, and `scripts/song-workspace-import.js`;
- `styles/base.css`, `styles/components.css`, `styles/pages.css`, `styles/themes.css`, `styles/song-workspace.css`, `styles/chord-dictionary.css`, `styles/scale.css`, and `styles/fretboard-trainer.css`;
- both locale JSON files;
- `src/i18n/useSiteLocale.js`, all 14 visible Vue page entries and views, the shared Vue shell/components, current composables/services/music modules, and the build-only Vue foundation smoke entry;
- `vite.config.mjs`, `tools/scripts/build-cloudflare.js`, `tools/scripts/verify-cloudflare-build.js`, `wrangler.jsonc`, and the current CI workflow;
- current track data, downloads, local assets, tests, and fixtures except for obsolete assertions that directly require a proven-dead file.

### Shared legacy compatibility

| Resource | Current consumer contract | Reason to retain |
| --- | --- | --- |
| `scripts/site-animations.js` | Directly loaded by current Vue pages; consumes current DOM classes, GSAP, locale/theme events, and reduced-motion state. | Current production animation bridge. |
| `scripts/chord-shapes.js` | Directly loaded by Progression Writer and Song Workspace; provides `globalThis.JamChordShapes`. | Shared music-semantic bridge; Phase 7 is not its rewrite. |
| `scripts/site-config.js` | Directly loaded by Service Waking and used by the Vue service-health flow. | Current API configuration bridge. |

### Uncertain and retained

- Individual selectors inside the eight live stylesheets that cannot satisfy all static-template, dynamic-class, attribute-state, print, responsive, shared-consumer, and browser-parity deletion gates.
- `netlify.toml`: it appears obsolete relative to the canonical Cloudflare frontend, but external provider state is not reconstructable from the repository and the Key Finder backend still names it in its blocked-static-file boundary. It is outside the approved frontend cleanup set.
- Historical migration records that accurately describe their phase at the time. They are not rewritten as if those phases never existed.

## Consumer matrices

### Classic scripts

| Script | Provides | Current consumers / replacement | Classification |
| --- | --- | --- | --- |
| `theme-init.js` | Restores `jasperMusicTheme` before paint. | Every visible Vue HTML entry; `useTheme.js` preserves the storage and event contract. | `STILL_CANONICAL` |
| `i18n-init.js` | Chooses language, preloads locale resources, sets document language/title, and prevents locale flash. | Every visible Vue HTML entry; `useSiteLocale.js` consumes `JasperI18nPreload`. | `STILL_CANONICAL` |
| `site-animations.js` | Entrance, reveal, hover, theme wash, SplitText, and responsive animation bridges. | Current Vue DOM on Homepage, Tracks, Song Workspace, and other animated pages. | `SHARED_LEGACY_COMPATIBILITY` |
| `site-config.js` | API base configuration. | Service Waking / Key Finder service configuration. | `SHARED_LEGACY_COMPATIBILITY` |
| `chord-shapes.js` | `JamChordShapes`. | Progression Writer and Song Workspace. | `SHARED_LEGACY_COMPATIBILITY` |
| `song-workspace-core.js` | `JamSongCore`. | `useSongWorkspace.js` plus deterministic tests. | `STILL_CANONICAL` |
| `song-workspace-storage.js` | `JamSongStorage`. | `useSongWorkspace.js` plus IndexedDB tests. | `STILL_CANONICAL` |
| `song-workspace-import.js` | `JamSongImport`. | `useSongWorkspace.js` plus import tests. | `STILL_CANONICAL` |
| `home.js` | Former homepage audio/scroll controller. | Replaced by Vue Homepage; zero current caller. | `PROVEN_DEAD` |
| `tracks.js` | Former Tracks rendering/filter/sort/download controller. | Replaced by Vue Tracks; zero current caller. | `PROVEN_DEAD` |
| `site.js` | Former shell, navbar, theme, subscription, and back-to-top controller. | Replaced by Vue shell/composables/services; zero current caller. | `PROVEN_DEAD` |
| `i18n.js` | Former DOM translator and language UI. | Replaced by `useSiteLocale.js`; zero current caller. | `PROVEN_DEAD` |

### `site.js` behavior ownership

| Former behavior | Current owner | State |
| --- | --- | --- |
| Smart navbar height, direction, drawer, details, focus, and resize | `SiteHeader.vue` + `useSmartNavbar.js` | Live replacement |
| Skip link and shared shell composition | `SiteShell.vue` | Live replacement |
| Navigation and compact tools | `SiteHeader.vue` | Live replacement |
| Theme control and `jasper:theme-change` | `ThemeToggle.vue` + `useTheme.js` | Live replacement |
| Homepage subscribe submission | `HomeView.vue` + `subscribeApi.mjs` | Live replacement |
| Footer/legal/social composition | `SiteFooter.vue` | Live replacement |
| Back-to-top behavior | `BackToTopButton.vue` | Live replacement |

### i18n

| Layer | Role | Classification |
| --- | --- | --- |
| `i18n-init.js` | Early language/title/preload and no-flash behavior. | `STILL_CANONICAL` |
| `locales/en/common.json`, `locales/zh-TW/common.json` | Canonical bilingual messages. | `STILL_CANONICAL` |
| `useSiteLocale.js` | Vue reactive language, translation, title, persistence, and event owner. | `STILL_CANONICAL` |
| `i18n.js` | Former DOM mutation/localization owner. | `PROVEN_DEAD` |
| `useLegacyLocale.js` | Unimported transition adapter. | `PROVEN_DEAD` |

### CSS

| Stylesheet | Consumers and special states | Classification |
| --- | --- | --- |
| `base.css` | All visible pages; shell layout, tokens, smart navbar, theme wash fallback, reduced motion. | `STILL_CANONICAL` |
| `components.css` | All visible pages; cards, controls, footer, loaders, track/download components, responsive states. | `STILL_CANONICAL` |
| `pages.css` | Current Vue page layouts, dynamic UI states, Homepage/Tracks/Key Finder/Progression Writer and responsive/reduced-motion rules. | `STILL_CANONICAL` |
| `themes.css` | Current dark/light tokens and cross-page dynamic state overrides. | `STILL_CANONICAL` |
| `song-workspace.css` | Song Workspace edit/read/performance, container queries, touch, print, reduced motion. | `STILL_CANONICAL` |
| `chord-dictionary.css` | Chord Dictionary, Progression Writer, and Song Workspace chord-shape UI. | `STILL_CANONICAL` |
| `scale.css` | Scale Explorer, responsive and reduced-motion states. | `STILL_CANONICAL` |
| `fretboard-trainer.css` | Fretboard Trainer responsive layout. | `STILL_CANONICAL` |
| `style.css` | No consumer; obsolete import-only compatibility entry. | `PROVEN_DEAD` |

No selector-level deletion is approved in the live stylesheets.

## Build compatibility inventory

- Vite has 14 visible HTML inputs plus the non-visible foundation smoke input. These remain canonical.
- The Vite preservation list is required for direct classic scripts/styles that must not be bundled or rewritten. Exact obsolete `site.js` and `i18n.js` preservation strings may be removed after those scripts are removed.
- The Cloudflare copier's root-file inventory and generic static-directory copying remain canonical. The 24 MiB exclusion and remote large-slide PDF rewrite remain unchanged.
- The verifier's Vue ownership, metadata, static slide, download, Worker routing, and compiled-bundle checks remain canonical.
- Negative checks that prevent Vue pages from loading page-owned or shared legacy controllers remain useful and are retained.
- Syntax/test entries that require a proven-dead source file must be removed or redirected to the current Vue owner in the same coherent cleanup commit.

## Test and documentation audit

Current behavior tests remain. Tests that inspect `site.js` or `i18n.js` only to protect behavior now owned by Vue will be redirected to the corresponding Vue component/composable. Assertions that merely require those dead files to exist will be removed. Negative assertions preventing HTML from reintroducing legacy controllers will remain.

`README.md` and `docs/README.md` contain obsolete operational claims that public pages are still static/legacy and identify removed controllers as current owners. Those current-architecture instructions will be updated. `docs/VUE_MIGRATION.md` will receive a Phase 7 state note. Phase-specific historical contracts such as the Song Workspace handoff and Phase 6A contract remain historical records and will not be rewritten.

## Production load evidence

Bounded production inspection observed:

- Homepage: Vue Homepage bundle, `theme-init.js`, `i18n-init.js`, shared CSS, GSAP/SplitText/ScrollTrigger, and `site-animations.js`;
- Tracks: Vue Tracks bundle, current locale/theme bootstrap, shared CSS, GSAP/Flip/ScrollTrigger, `site-animations.js`, locale JSON, and track data;
- Song Workspace: Vue bundle, all three Song Workspace modules, `chord-shapes.js`, current CSS, bootstrap, and animations;
- Key Finder: Vue bundle, current bootstrap/CSS/animation resources;
- W10 slide: intentionally static content with no Jam Tracks Hub classic-script or stylesheet dependency.

None loaded `home.js`, `tracks.js`, `site.js`, `i18n.js`, `style.css`, or `useLegacyLocale.js`. The bounded inspection produced no browser warning/error entry.

## Removal gates

Before each removal commit:

1. confirm the file is in the Phase 7A proven-dead set;
2. remove only obsolete direct test/build/doc dependencies necessary to keep the commit coherent;
3. run focused tests and relevant build/static checks;
4. inspect status, stat, and full diff;
5. stage only named files and commit locally;
6. fetch `origin`, compare the last-seen main SHA, and assess any drift.

No push occurs until every local phase, full local validation, browser acceptance, secret scan, final main-drift reconciliation, and branch diff audit pass.

## Phased implementation plan

### Phase 7A — audit record

- **Objective:** persist the read-only audit, evidence, classifications, gates, and implementation plan.
- **Files:** `docs/VUE_LEGACY_CLEANUP_PHASE_7.md` only.
- **Remove:** nothing.
- **Keep:** all runtime/build/test resources.
- **Risks:** documentation accidentally claiming an unproved deletion.
- **Focused validation:** diff inspection and whitespace check.
- **Browser gate:** none; production load evidence is already recorded.
- **Rollback boundary:** documentation-only commit.
- **Expected commit:** `docs: record Vue legacy cleanup audit`.

### Phase 7B — zero-caller page runtimes and adapter

- **Objective:** remove `scripts/home.js`, `scripts/tracks.js`, and `src/i18n/useLegacyLocale.js`.
- **Files:** the three resources plus the exact `package.json` syntax-check references.
- **Keep:** all 14 Vue entries, current services/composables, `useSiteLocale.js`, and every shared classic script.
- **Dependencies:** Homepage, Tracks, shared-shell, and build ownership tests.
- **Risks:** hidden import or a stale HTML reference; both are covered by renewed exact searches and the build.
- **Focused tests:** Homepage, Tracks, shared shell, Vite foundation, and Cloudflare build ownership.
- **Browser gates:** local Homepage and Tracks render/interactions.
- **Rollback boundary:** one local runtime-removal commit.
- **Expected commit:** `refactor: remove zero-caller page runtimes`.

### Phase 7C — zero-caller CSS entry

- **Objective:** remove only `styles/style.css`.
- **Files:** `styles/style.css` and a focused absence assertion if needed.
- **Keep:** all eight live stylesheets and every uncertain selector.
- **Dependencies:** complete HTML stylesheet inventory and the Cloudflare output verifier.
- **Risks:** an undocumented external consumer of the compatibility URL; repository and bounded runtime evidence show no consumer, but no live selector is touched.
- **Focused tests:** shared shell/page CSS tests and Cloudflare build verification.
- **Browser gates:** no computed-style delta is expected because the file is not loaded; representative pages retain the eight canonical stylesheets.
- **Rollback boundary:** one local file-removal commit.
- **Expected commit:** `refactor: remove unused stylesheet entry`.

### Phase 7D — replaced shared runtime ownership

- **Objective:** remove `scripts/site.js` and `scripts/i18n.js`, remove their inert Vite preservation strings, simplify the now-impossible `JasperI18n` wait branch in `site-animations.js`, and redirect tests to Vue owners.
- **Files:** the two dead scripts, `vite.config.mjs`, `package.json`, `scripts/site-animations.js`, and only tests that directly read or require the dead files.
- **Keep:** `theme-init.js`, `i18n-init.js`, locale JSON, `useSiteLocale.js`, Vue SiteShell components/composables, all live animations, reduced-motion handling, and language/theme event contracts.
- **Dependencies:** shell, navbar, locale, theme, footer, Homepage animation, 404 routing, Song Workspace entrance, and migration tests.
- **Risks:** locale/theme flash, duplicate or missing ownership, animation timing, and loss of a shell behavior.
- **Focused tests:** shared shell, navbar, animation, responsive footer, 404 routing, Song Workspace layout, and all migration tests that named the old owners.
- **Browser gates:** Homepage SplitText, language switch, theme switch, mobile drawer, back-to-top, Song Workspace entrance, 404 links, and zero console/CSP errors.
- **Rollback boundary:** one coherent shared-runtime ownership commit.
- **Expected commit:** `refactor: remove replaced shared legacy runtimes`.

### Phase 7E — verifier and current operational documentation

- **Objective:** make dead-resource absence deterministic and update current architecture instructions without rewriting history.
- **Files:** `tools/scripts/verify-cloudflare-build.js`, focused tests as necessary, `README.md`, `docs/README.md`, and `docs/VUE_MIGRATION.md`.
- **Remove:** obsolete current-architecture instructions and stale positive references to the removed runtimes.
- **Keep:** historical migration records, negative no-legacy-controller assertions, all route/build/slide/backend contracts.
- **Dependencies:** Cloudflare build output and current Vue ownership inventory.
- **Risks:** weakening a verifier or erasing useful migration history.
- **Focused tests:** verifier, Vue ownership, root HTML count, slide count, and documentation reference scan.
- **Browser gates:** none unique; Phase 7F covers the resulting build.
- **Rollback boundary:** one local build/test/documentation commit.
- **Expected commit:** `chore: align build verification with Vue ownership`.

### Phase 7F — final architecture hardening and regression

- **Objective:** prove there are no orphan references, duplicate owners, unexpected classic loads, public behavior changes, backend changes, or privacy regressions.
- **Files:** no planned source changes. Any newly found candidate must be classified before a separate commit.
- **Keep:** all canonical and uncertain resources.
- **Dependencies:** latest `origin/main`, complete branch diff, full local CI, and browser acceptance.
- **Risks:** late main drift or an interaction-only regression.
- **Focused tests:** full `npm test`, `npm run check`, Cloudflare build and verifier, `git diff --check`, privacy canaries, source/reference scans, and secret/private-data scan.
- **Browser gates:** all 14 Vue pages, 18 static slides, required responsive widths/locales/themes, Song Workspace privacy and local behavior, Key Finder UI without submitting analysis, and representative production comparison.
- **Rollback boundary:** the preceding phase commits remain independently reviewable; no push occurs until the entire branch passes.
- **Expected commit:** none unless a separately proved hardening correction is required.

## Frozen boundaries

- Song Workspace remains Vue-owned with one mount and no parallel controller. Schema v2, IndexedDB v1, preferences, anchors, parsing, capo/key behavior, modes, exports, and `NO_LYRICS_EGRESS` remain unchanged.
- Key Finder remains Vue-owned and continues to use `https://api.jamtrackshub.com`; its Render/FastAPI backend is unchanged and no analysis job is required for Phase 7.
- Worker source, D1 bindings/data, backend files, analytics behavior, public URLs, metadata, download contracts, and the 18 static slides are unchanged.
- Version remains `2.0.4`; no tag or GitHub Release is created.

`PHASE_7_IMPLEMENTATION_PLAN = COMPLETE`
