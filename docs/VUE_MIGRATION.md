# Vue Migration

Jam Tracks Hub is moving incrementally from static HTML and imperative browser JavaScript to Vue 3. The migration uses a Vite multi-page-compatible strangler architecture, not a Vue Router single-page application.

The multi-page approach preserves the site's established page URLs, page-specific metadata, Cloudflare routing, and independently deployable legacy entries while each page is migrated and verified. A router-based SPA would change those public contracts before feature parity is established.

## Phase 1 Foundation

Phase 1 introduces the Vue compiler/runtime and Vite build layer without mounting Vue into any public page. All existing HTML, scripts, styles, routes, metadata, localization, analytics, and backend behavior remain the production implementation.

The foundation entry is `src/entries/vue-foundation.js`. It compiles `FoundationSmoke.vue` to prove that Vue single-file components and self-hosted production bundles work, but no current HTML document references or mounts that bundle.

## Build Pipeline

The production build is:

```text
Vite build
  → legacy/static asset copier
  → Cloudflare output verifier
  → dist/
```

Vite initializes `dist/` and owns generated files under `assets/vue/`. The existing copier then adds every unmigrated root HTML entry and the existing static directories without deleting Vite output. It retains the existing large-file limit and slide PDF fallback rewrite.

`dist/` remains the static-assets directory used by the existing Cloudflare Worker. Worker API routes, D1, and the Key Finder backend are outside the frontend migration.

## Development and Validation

Use Node 22 as specified by `.nvmrc`.

```bash
npm ci
npm run dev
npm test
npm run check
npm run build:cloudflare
npm run verify:cloudflare
```

During Phase 1, the Vite development server exists to validate the foundation bundle. The combined `dist/` build is the production-equivalent transitional output for legacy pages.

## Public Contracts

Initial migration phases must preserve:

- current root HTML filenames, internal links, query parameters, and Cloudflare URL behavior;
- page-specific titles, descriptions, canonical links, Open Graph metadata, and robots directives;
- English and Traditional Chinese behavior;
- current Umami pageviews and CSP allowlists;
- existing responsive, accessibility, animation, and browser behavior;
- the Cloudflare Worker and D1 API boundary;
- the Cloudflare-protected Render/FastAPI Key Finder architecture.

Song Workspace remains frozen until its dedicated migration phase. Song content must remain browser-local and must never enter analytics, URLs, document titles, remote logs, or third-party requests.

## Parity and Legacy Removal

A page is not migrated merely because Vue exists in the repository. Each page needs explicit feature, visual, responsive, i18n, accessibility, analytics, security, URL, build, test, and browser parity.

Legacy code may be removed only after the Vue replacement passes those gates and has zero legacy imports, DOM dependencies, CSS dependencies, and runtime callers.

## Phase 2A: 404 Page

`404.html` is the first production HTML entry owned by Vite and Vue. Its page-specific `<main>` is rendered by `src/views/NotFoundView.vue`, while the existing early theme and language bootstrap, navigation, footer, shared styles, Umami loader, metadata, and shared site scripts remain in place.

The 404 view reads the existing English and Traditional Chinese locale JSON through a bounded adapter that follows the site's `jasper:language-change` event. Vue-owned content does not use `data-i18n`, so the legacy translator and Vue never mutate the same page-specific nodes.

The Cloudflare verifier treats only `404.html` as Vite-owned. Every other root HTML entry must remain byte-identical to its legacy source, and all static assets and track slide pages retain their existing parity checks. No shared legacy system is authorized for removal in this phase.

## Phase 2B: Legal and Privacy Pages

`legal.html` and `privacy-policy.html` are the second and third production HTML entries owned by Vite and Vue. Their page-specific `<main>` content is rendered by `LegalView.vue` and `PrivacyView.vue`; the established metadata, navigation, footer, early theme/language bootstrap, Umami loader, shared styles, and legacy animation assets remain in each HTML shell.

Both views use the existing English and Traditional Chinese locale JSON through the same bounded `jasper:language-change` adapter as the 404 page. Vue-owned policy content contains no `data-i18n` attributes, so the legacy translator and Vue retain separate DOM ownership. The Cloudflare verifier now treats exactly `404.html`, `legal.html`, and `privacy-policy.html` as Vite-owned and continues to require every other root HTML entry to remain byte-identical.

Legal and Privacy remain independent views because their semantic structures and content ordering differ; introducing a shared policy component would add indirection without removing a meaningful repeated contract. No legacy shared system is removed in Phase 2B.

## Versioning

`package.json.version` is `2.0.4`. This patch version records the backward-compatible public download fix that normalizes W2-W8 to the established static ZIP package model used by W10 and later. Git tags and GitHub Releases always require separate user authorization.

## Phase 2B Routing Hotfix

Cloudflare Static Assets uses its native `404-page` fallback for unmatched routes. Worker-first routing is restricted to `/api` and `/api/*`, preserving the existing Worker and D1 API boundary without sending ordinary static traffic through Worker code. The project remains a Vite multi-page application; it does not use an SPA fallback.

The 404 document's local resources and navigation links are root-relative so the same Vue 404 page remains functional when Cloudflare serves it for a nested unknown URL.

## Phase 2C: Service Waking and Feedback

`service-waking.html` and `feedback.html` are the fourth and fifth production HTML entries owned by Vite and Vue. Vue owns only each page's `<main>` content and page-specific state; navigation, footer, early theme/language bootstrap, Umami, shared styles, and shared animation scripts remain legacy-owned.

Service Waking preserves the established API base resolution from `site-config.js`, the same `/api/health` request, timeout and polling limits, translated loading/failure states, and the successful return to `key-finder.html`. Feedback preserves the same-origin `POST /api/feedback` contract, field names and limits, honeypot, payload, loading lock, focus behavior, and translated success/error states. Its client API behavior is tested with controlled fetch implementations only: Phase 2C performs no production feedback submission, D1 mutation, or email send.

The Cloudflare verifier now treats exactly five visible pages as Vue-owned: 404, Legal, Privacy, Service Waking, and Feedback. All other root HTML remains byte-identical in the transitional build. Worker routing, D1, the Key Finder backend, and Song Workspace remain unchanged.

## Phase 3: Shared Shell, Homepage, and Tracks

The migrated pages now share one Vue-owned site shell for navigation, language and theme controls, smart-navbar behavior, the skip link, footer, and back-to-top control. Homepage and Tracks are independent Vite MPA entries that retain their existing URLs, metadata, Umami pageviews, GSAP behavior, content, and responsive layouts.

Tracks continues to read the canonical local `data/tracks.json` payload. Its filtering, sorting, relative-key groups, URL initialization, card navigation, and download actions remain separate contracts. The W2-W8 public download repair is represented by the same deployable static ZIP model used by W10-W19, while W1 retains its direct PDF behavior.

## Phase 4A: Fretboard Trainer

`fretboard-trainer.html` is the eighth visible Vue-owned MPA entry. `FretboardTrainerView.vue` owns its rendering and event handlers, `useFretboardTrainer.js` owns its reactive session state, and `fretboardTrainer.mjs` preserves the standard-tuning note domain as pure deterministic functions.

The migration preserves the 6-string, 0-through-12-fret question space, exact consecutive-repeat guard, enharmonic labels, scoring, reveal, next-question, and reset semantics. The existing Trainer CSS, early theme/language bootstrap, page-level Umami loader, metadata, and shared GSAP entrance behavior remain unchanged. The page adds no persistence, audio, router, network service, custom analytics event, or backend dependency. Its former page-owned imperative runtime is removed only after the Vue replacement and focused regression tests account for its behavior.

## Phase 4B: Chord Progressions

`chord-progressions.html` is the ninth visible Vue-owned MPA entry. `ChordProgressionsView.vue` owns its selection and rendering state, `useChordProgressions.js` owns the reactive key and extension choices, and `chordProgressions.mjs` preserves the exact legacy key spellings, progression catalog, chord grammar, dictionary links, and deterministic root-position guitar voicings.

The active production contract has no playback, save, export, transpose, or persistence controls. Historical implementations for those unreachable controls were removed with the page-owned legacy runtime instead of being reintroduced as new behavior. The existing sample files remain unchanged and are not requested by the Vue page. Shared CSS, early theme/language bootstrap, page-level Umami, metadata, GSAP assets, URLs, and the Vue SiteShell contract remain in place.

## Phase 4C: Scale Explorer

`scale.html` is the tenth visible Vue-owned MPA entry. `ScaleExplorerView.vue` owns its controls and rendering, `useScaleExplorer.js` owns reactive root, scale, fret-range, and label state, and `scaleExplorer.mjs` preserves the complete 12-root by 8-scale domain, enharmonic spelling, standard tuning, interval/degree relationships, URL initialization, and every fretboard position.

The visible fretboard remains the established CSS Grid/DOM renderer and continues to use `styles/scale.css`; Canvas remains limited to the canonical PNG export. The existing Web Audio sequence, PNG filename/content model, iOS preview behavior, English and Traditional Chinese copy, early theme/language bootstrap, page-level Umami, metadata, GSAP assets, URL contract, and shared SiteShell are preserved. Scale selections remain session-only except when initialized from the existing `key`, `root`, or `type` query parameters. No other music tool is migrated in this phase.

## Next Phase

Phase 4D or any later page migration requires separate authorization and the same page-specific parity gates. It must not start automatically and must preserve the strangler build so legacy and Vue-owned entries can coexist.
