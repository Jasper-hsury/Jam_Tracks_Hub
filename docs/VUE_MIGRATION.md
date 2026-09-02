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

`package.json.version` is initialized to the current public release, `2.0.2`, as the machine-readable baseline. Every future feature or fix must run a semantic Versioning Gate before commit. Git tags and GitHub Releases always require separate user authorization.

## Next Phase

Any later page migration requires separate authorization and the same page-specific parity gates. It must not start automatically and must preserve the strangler build so legacy and Vue-owned entries can coexist.
