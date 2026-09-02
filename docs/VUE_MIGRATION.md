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

## Versioning

`package.json.version` is initialized to the current public release, `2.0.2`, as the machine-readable baseline. Every future feature or fix must run a semantic Versioning Gate before commit. Git tags and GitHub Releases always require separate user authorization.

## Next Phase

The next phase may migrate bounded low-risk support pages one at a time. It must not start automatically and must preserve the strangler build so legacy and Vue-owned entries can coexist.
