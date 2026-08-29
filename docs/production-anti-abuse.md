# Production Anti-Abuse And Edge Security Runbook

This document records the repository controls implemented during Security Infrastructure Phase 1, the Cloudflare edge controls verified during Phase 2, and the Render-behind-Cloudflare cutover prepared during Phase 3R. Provider state is recorded only where the production Dashboard and bounded live checks supplied evidence.

## Status And Scope

- Repository request bounds, route and method allowlists, static security headers, cache directives, and Song Workspace logical-data bounds: **implemented**.
- Cloudflare Free Managed Rules, DDoS protection, Browser Integrity Check, Bot Fight Mode, one public-mutation rate-limit rule, and an API cache-bypass rule: **verified enabled on 2026-08-29**.
- Additional plan-dependent WAF tuning, administrative-export observation, alerts, and HSTS review: **deferred / unavailable on the current Free plan / pending separate review**, as detailed below.
- Phase 3R keeps the current Render compute service but moves the browser-facing API to `https://api.jamtrackshub.com`, a Cloudflare-proxied custom domain on the same Render service. Repository cutover and production acceptance must complete before the legacy `jasper-music.onrender.com` hostname is disabled.
- Phase 2 changed only the documented Cloudflare Dashboard controls below. It added no secret, Render setting, application deployment, product feature, or load test.
- The Cloudflare Containers/Durable Objects prototype remains **DEFERRED_COST_DECISION** and is not merged, deployed, or required by this topology.

## Official Capability Sources

Provider limits and plan availability change. Recheck the linked official pages immediately before production configuration.

| Capability | Official source | Current planning fact | Repository impact |
| --- | --- | --- | --- |
| Managed WAF rules | [Cloudflare Managed Rules](https://developers.cloudflare.com/waf/managed-rules/) | Available on all plans; exact rulesets and controls vary by plan. | Use the strongest ruleset actually available; do not represent it as enabled before Dashboard verification. |
| Custom WAF rules | [Custom rules](https://developers.cloudflare.com/waf/custom-rules/) | Rule counts and actions are plan-dependent; regex and Log action are not universal. | Expressions below avoid regex and must be adapted to the confirmed plan. |
| Rate limiting | [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) | Rule count, counting characteristics, periods, and actions are plan-dependent. | Suggested long observation windows may need a plan-compatible equivalent. |
| Bot controls | [Bots](https://developers.cloudflare.com/bots/) | Bot Fight Mode, Super Bot Fight Mode, and Bot Management are different products/tiers. | Choose only the control exposed by the zone and test false positives. |
| DDoS | [DDoS protection](https://developers.cloudflare.com/ddos-protection/) | Standard DDoS protection is automatic; advanced tuning is plan-dependent. | Defense in depth, not a replacement for application body and compute bounds. |
| Worker limits | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) | Documented request-body allowance is 100 MB on Free/Pro, 200 MB Business, 500 MB Enterprise; memory is 128 MB and static assets are limited separately. | Current small Worker JSON bodies are far below platform limits. Key Finder uploads pass through Cloudflare's reverse proxy to Render, not through the site Worker. |
| Render custom domains | [Render custom domains](https://render.com/docs/custom-domains) and [Cloudflare DNS configuration](https://render.com/docs/configure-cloudflare-dns) | Render supports custom domains and managed TLS for the existing web service. Its generated `onrender.com` subdomain can be disabled after the custom domain is fully verified. | Keep the generated hostname as rollback until frontend, CORS, job creation, polling, upload, and TLS acceptance pass on the custom hostname. |
| Cloudflare TLS | [Full (strict) mode](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) | `Full` and `Full (strict)` encrypt both legs; Flexible does not. Strict validation requires a valid origin certificate. | The zone was verified as `Full`, never Flexible. Render issued a valid certificate for `api.jamtrackshub.com`; do not downgrade TLS during rollout. |
| Static assets | [Static Asset Headers](https://developers.cloudflare.com/workers/static-assets/headers/) and [routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) | `_headers` applies to static asset responses; Worker-generated API responses need headers in code. Asset-first routing can bypass Worker logic for matched assets. | `_headers` covers pages/assets; `worker.js` covers `/api/*`. |
| Cache Rules | [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/) | Available on all plans with plan-dependent rule counts. | `_headers` provides safe origin policy; Dashboard rules must preserve API bypass and HTML revalidation. |
| Secrets | [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/) | Production values belong in encrypted bindings, not source or `vars`. | `SUBSCRIBERS_ADMIN_TOKEN` remains a secret binding; no value is committed. |
| Security visibility | [Security Analytics](https://developers.cloudflare.com/waf/analytics/security-analytics/), [Security Events](https://developers.cloudflare.com/waf/analytics/security-events/), and [alerts](https://developers.cloudflare.com/waf/reference/alerts/) | Availability and retention vary by plan. | Observe before tightening and retain rollback evidence. |
| Browser Integrity Check | [Browser Integrity Check](https://developers.cloudflare.com/waf/tools/browser-integrity-check/) | A broad heuristic control with possible compatibility impact. | Evaluate after representative browser/API smoke; do not assume it is harmless. |
| Turnstile | [Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) | Tokens must be verified server-side and are single-use/short-lived. | Deferred until abuse evidence justifies adding friction to feedback or subscribe. |

Application guidance reviewed for this phase:

- [OWASP Cross-Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP HTTP Security Response Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

The production zone displayed the **Free** plan during the 2026-08-29 Phase 2 audit. Re-check the Dashboard before future changes because plan limits and product availability can change.

## Phase 2 Production Edge State — 2026-08-29

### Before-state snapshot

| Control | Verified before state |
| --- | --- |
| Plan | Free |
| Managed WAF | Free Managed Ruleset checked and marked `Always active`; no separately configurable Managed Rules deployment |
| Custom rules | 0 of 5 |
| Rate limiting | 0 of 1 |
| Bot protection | Bot Fight Mode off; JavaScript detections shown as on |
| Browser Integrity Check | On |
| Cache Rules | 0 active |
| DDoS | SSL/TLS and network-layer DDoS protections active; HTTP DDoS protection reported as always enabled |
| Security visibility | Last 24 hours: about 1.9k requests, 0 suspicious activity, and no sampled Security Events matching the default view |

### Applied controls and rollback matrix

| Control / rule | Match or scope | New state | Verification | Rollback |
| --- | --- | --- | --- | --- |
| Free Managed Ruleset | Entire proxied zone, provider defaults | `VERIFIED_ENABLED` / always active | Dashboard settings plus normal-page/API smoke | Not independently disabled on the Free plan; investigate an evidenced false positive before changing broader security posture |
| `api-bypass-cache` | `starts_with(http.request.uri.path, "/api/")` | Active; bypass cache | Dashboard shows 1 active rule; protected export returned `Cache-Control: no-store` | Disable or delete this one Cache Rule; keep Worker `no-store` intact |
| `api-public-mutation-abuse` | path equals `/api/subscribe` **or** `/api/feedback` | Active; 5 requests per IP per 10 seconds; Block for 10 seconds | Dashboard shows 1/1 active, historical preview matched 2 requests (0.1% of 24-hour traffic), and bounded requests remained below the threshold | Disable this one rate-limit rule; retain application origin/body/content-type limits |
| Bot Fight Mode | Entire zone; Free-plan provider classification | On | Dashboard persisted the checked state; representative normal browser pages loaded without challenge | Toggle Bot Fight Mode off; do not weaken application validation |
| Browser Integrity Check | Entire zone | Remained on | Dashboard verified on and representative browser/API smoke passed | Toggle off only for an evidenced compatibility problem |
| Origin cache policy | HTML and static paths through tracked `_headers` | No extra provider override | HTML retained `max-age=0, must-revalidate`; versioned CSS returned an edge HIT with one-hour bounded origin TTL | Revert only an evidenced origin header change through the normal repository workflow |

The Free rate-limiting product exposed only URI-path/verified-bot match fields, IP counting, one rule, a 10-second period, a 10-second mitigation timeout, and the Block action. It did not expose method/host matching, Log-only, Managed Challenge, a second rule, or the runbook's longer windows. The combined rule therefore uses a conservative five-request threshold so a normal preflight-plus-submit flow and shared NAT users are less likely to be blocked. It must be reviewed in Security Events before any tightening.

`api-subscribers-export-observe` was **not deployed**. The single Free rate-limit slot is used by the public mutation endpoints, and the Dashboard did not expose Log-only. The export remains protected by Bearer authentication, timing-safe verification, application bounds, and `no-store`; edge observation is `NOT_AVAILABLE_ON_PLAN` under the current configuration.

No custom WAF rule was added: the provider baseline is active, the pre-change view showed zero suspicious activity/events, and there was no evidenced gap that justified another broad block rule. Turnstile remains **DEFERRED** because there was no subscribe or feedback abuse evidence.

## Trust Boundaries And Threat Model

### Boundaries

1. Static browser pages and assets are public and untrusted inputs may enter forms.
2. Song Workspace song content remains in browser memory, IndexedDB, localStorage, and local downloads. It does not enter the site Worker APIs.
3. `/api/subscribe` and `/api/feedback` are public same-origin mutation endpoints backed by D1.
4. `/api/subscribers.csv` is an administrative read endpoint protected by a Worker secret.
5. Key Finder is a separate browser-to-`api.jamtrackshub.com`-to-Render network flow and may perform expensive media work. It does not transit the site Worker.
6. Verified Cloudflare edge controls are an active defense-in-depth layer, but repository controls must still fail safely and cannot depend on Dashboard state.

### Primary threats

- Stored/reflected/DOM XSS through song titles, lyrics, custom sections, ChordPro, JSON, feedback, or URL data.
- Oversized files, JSON bodies, deeply amplified Song Documents, excessive chords/lines, and corrupt local records causing CPU/memory/UI denial of service.
- Automated subscribe/feedback spam, method probing, cache poisoning, API cache leakage, and unknown-route confusion.
- Administrative token leakage through URLs, logs, referrers, browser history, response bodies, or timing-sensitive comparison.
- Expensive Key Finder job creation or uploads bypassing site-zone rules if the legacy Render hostname remains public after the verified cutover.
- False positives that block ordinary static navigation, accessibility tools, legitimate feedback, or local browser storage.

## Production Attack Surface Inventory

### Static/browser surfaces

Public HTML includes the homepage, Tracks, Song Workspace/My Songs, Chord Dictionary, Scale Explorer, Key Finder, Chord Progressions, Progression Writer, Fretboard Trainer, Feedback, privacy/legal pages, service/error pages, and weekly slide pages. Public static data includes scripts, styles, images, fonts, locale JSON, track data, downloads, and slide assets.

Third-party browser origins currently allow only the sources required by production behavior: Google Fonts, Umami on non-Song-Workspace pages, YouTube media/frame content, YouTube thumbnails, and the Cloudflare-proxied Key Finder API origin. Song Workspace itself does not load Umami or another third-party executable script.

### Endpoint matrix

| Browser path / upstream | Method | Content / maximum | Cost and mutation | Authentication / origin | Cache |
| --- | --- | --- | --- | --- | --- |
| `/api/subscribe` | `POST`, `OPTIONS` | JSON, 4 KiB actual streamed maximum | D1 write; email validation/deduplication | Exact same-origin `Origin`; public | `no-store` |
| `/api/feedback` | `POST`, `OPTIONS` | JSON, 16 KiB actual streamed maximum | D1 write; honeypot and field validation | Exact same-origin `Origin`; public | `no-store` |
| `/api/subscribers.csv` | `GET` | No request body; CSV response | D1 read/export | `Authorization: Bearer …`; hashed fixed-size timing-safe comparison | `no-store` |
| unknown `/api` or `/api/*` | none | None | No upstream/static fallback | Public generic 404 | `no-store` |
| static assets | `GET`, `HEAD` | Public files | Edge/static read | Public | `_headers` policy |
| `api.jamtrackshub.com/api/health` | `GET` | None | Cheap Render health check through Cloudflare | Public; bounded response | `no-store` after repository deployment |
| `api.jamtrackshub.com/api/analyze` | `POST` | URL JSON | Legacy synchronous expensive analysis | Exact production/local-development CORS after deployment | `no-store` |
| `api.jamtrackshub.com/api/analyze/jobs` | `POST` | URL JSON | Expensive async job creation | Exact production/local-development CORS after deployment | `no-store`; candidate for the single Free rate rule |
| `api.jamtrackshub.com/api/analyze/jobs/{job_id}` | `GET` | Opaque job ID | Job polling | Exact production/local-development CORS after deployment | `no-store`; never include in creation rate limit |
| `api.jamtrackshub.com/api/analyze-file/jobs` | `POST` | Multipart; application maximum 60 MiB, 25 MiB for MP4/WEBM | Expensive upload/job creation | Exact production/local-development CORS after deployment | `no-store`; candidate for the single Free rate rule |
| `api.jamtrackshub.com/api/analyze-file/jobs/{job_id}` | `GET` | Opaque job ID | Job polling | Exact production/local-development CORS after deployment | `no-store`; never include in creation rate limit |
| `api.jamtrackshub.com/api/analyze-file` | `POST` | Multipart; same application bounds | Legacy synchronous expensive analysis | Exact production/local-development CORS after deployment | `no-store` |

Key Finder rows are inventory only. They are not proxied by the site Worker. The `api.jamtrackshub.com` DNS record is Cloudflare-proxied, so zone-wide DDoS, Managed WAF, Bot Fight Mode, and Browser Integrity Check apply. The single Free rate rule must use exact expensive creation paths and must exclude polling. Optional Cloudflare-to-Render origin-header authentication remains deferred because a free, maintainable secret-injection path was not established for this phase.

### Phase 3R production cutover — 2026-08-30

PR `#12` was squash-merged as `2154dd2ce5914b29cb3841d33348472e51315bf9`; both the Cloudflare Workers production build and Render `main` deployment report that revision successful/live. Production frontend and CSP use only `https://api.jamtrackshub.com` for the Key Finder service path. Exact-origin CORS, localhost development CORS, Private Network Access preflight, API `no-store`, custom health, and one bounded repository-fixture file create/poll workflow all passed through the Cloudflare-proxied custom hostname.

The sole active Free rate rule `api-public-mutation-abuse` now matches exact paths `/api/subscribe`, `/api/feedback`, `/api/analyze/jobs`, and `/api/analyze-file/jobs`. It remains 5 requests per IP per 10 seconds with Block for 10 seconds. Job polling and legacy synchronous paths are excluded. After the full acceptance sequence passed, the generated Render subdomain was disabled: direct generated-host health returns 404 with `x-render-routing: blocked-render-subdomain`, while custom health and custom job polling remain 200. Optional cryptographic Cloudflare-to-Render origin authentication remains deferred, so the proxy boundary is not represented as a cryptographic origin-identity guarantee.

## Repository Controls

### Song Workspace

- HTML-like song canaries remain text through DOM text nodes/`textContent`; no raw user-song HTML sink was added.
- The only workspace `innerHTML` call renders a generated chord diagram from a parsed chord model, not arbitrary imported markup.
- Pasted and ChordPro source are capped at 200,000 characters; individual lines at 1,000 characters.
- Song Documents are capped at 200 sections, 2,000 total lines, 500 lines per section, 64 chords per lyric line, 16 chords per instrumental bar, 64 bars per instrumental section, and 10,000 chords total.
- Metadata, IDs, symbols, arrays, preferences, shape selections, backup song count, and import file bytes are validated before canonicalization/persistence.
- Single-song/backup JSON input remains capped at 1 MiB and backup restore at 500 songs.
- Local listing reads at most 501 records and exposes at most 500 supported songs. Invalid/unsupported records are skipped, never automatically deleted, and a generic localized warning preserves access to valid songs without echoing content.
- Preferences are allowlisted, clamped, and capped at 256 KiB before parsing.
- Create/import/restore submission guards prevent accidental duplicate concurrent work.
- No song title, artist, lyrics, sections, anchors, ChordPro, or JTH JSON is sent to URLs, analytics, Worker APIs, error logging, or Key Finder.

These are application resilience bounds, not DRM and not a guarantee against a compromised browser extension or browser itself.

### Static response policy

The tracked `_headers` file applies:

- a Content Security Policy without `unsafe-inline`/`unsafe-eval` for script execution;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`;
- `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy`;
- cache revalidation for HTML, bounded caching for code/assets, and short caching for changing data/locales.

The one inline service-waking script was moved to an external file so it works under the script policy. Inline CSS remains allowed because existing weekly slides and page presentation use it. This should be reduced only through a separately tested migration.

HSTS is intentionally not enabled in source during Phase 1. Before enabling it, verify HTTPS for the canonical host and every covered subdomain, redirect behavior, certificate health, rollback constraints, and whether `includeSubDomains`/preload is actually safe.

### Worker API policy

- Routes and methods are explicit. Static files accept only `GET`/`HEAD`; unknown API paths return a generic 404 instead of falling through to assets.
- JSON content type, declared length, and actual streamed bytes are checked before parsing.
- Mutation requests require an exact same-origin `Origin`; successful preflight reflects only that same origin. Wildcard CORS was removed.
- API responses receive `no-store` and bounded security headers. Uncaught errors become generic 503 responses without stack traces or secret details.
- Subscriber export accepts the admin token only in a Bearer header. Query-token support was removed to avoid URL/history/referrer/log leakage.
- Token candidates are SHA-256 digested and compared as fixed-size bytes with the runtime timing-safe primitive when available, with a constant-work fixed-size fallback for the Node test environment.

## Cloudflare Configuration Baseline And Current Result

The entries below remain the canonical design baseline. The Phase 2 table above records what the production Free plan could actually enforce. Future changes must re-confirm the plan, preserve rollback evidence, and observe normal traffic first.

### 1. Managed rules

- **Phase 2 result:** `VERIFIED_ENABLED` — Free Managed Ruleset, provider defaults, marked `Always active`; no additional custom WAF rule was justified.

- **Rule name:** Cloudflare Managed Rules baseline
- **Match:** Entire `jamtrackshub.com` zone, excluding only a documented false positive after evidence.
- **Action:** Enable the Free Managed Ruleset or the strongest managed rulesets included in the confirmed plan; retain provider defaults initially.
- **Plan dependency:** MANUAL VERIFICATION REQUIRED.
- **Why:** Commodity exploit filtering before application code.
- **False-positive risk:** Structured form fields, unusual chord notation, accessibility tooling, and upload traffic.
- **Verify:** Browse representative pages; submit one synthetic feedback and subscribe request; inspect Security Events.
- **Rollback:** Disable the offending rule ID or ruleset and document the event; do not disable application bounds.

### 2. Subscribe mutation rate

- **Phase 2 result:** covered by combined active rule `api-public-mutation-abuse`; the Free plan cannot express the preferred host/method/long-window policy separately.

- **Rule name:** `api-subscribe-mutation`
- **Expression:** hostname equals the canonical host, path equals `/api/subscribe`, method equals `POST`.
- **Suggested threshold:** 10 requests per IP per 10 minutes; if the plan only supports a 10-second period, begin with 3 per 10 seconds and observe before reducing.
- **Action:** Managed Challenge where available; otherwise block with a short mitigation timeout supported by the plan.
- **Plan dependency:** Rate-limit fields, periods, action, and rule count require verification.
- **Why:** Limit bulk signup spam while the Worker still validates/deduplicates.
- **False-positive risk:** Shared NATs, privacy relays, testing labs.
- **Verify:** One normal signup succeeds; a controlled non-production rule preview or bounded test reaches the expected event/action.
- **Rollback:** Disable this rule only; retain same-origin and body checks.

### 3. Feedback mutation rate

- **Phase 2 result:** covered by combined active rule `api-public-mutation-abuse`; the conservative combined threshold is 5 requests/IP/10 seconds with a 10-second Block.

- **Rule name:** `api-feedback-mutation`
- **Expression:** hostname equals the canonical host, path equals `/api/feedback`, method equals `POST`.
- **Suggested threshold:** 5 requests per IP per 10 minutes; if limited to 10 seconds, begin with 2 per 10 seconds.
- **Action:** Managed Challenge where available, then short block if sustained abuse is confirmed.
- **Plan dependency:** MANUAL VERIFICATION REQUIRED.
- **Why:** Feedback writes have higher spam value than static reads.
- **False-positive risk:** A user correcting/retrying several submissions, shared NATs.
- **Verify:** One valid and one invalid synthetic submission; inspect status and Security Events.
- **Rollback:** Disable the rule; retain honeypot, field, body, and origin checks.

### 4. Administrative export observation

- **Phase 2 result:** `NOT_AVAILABLE_ON_PLAN` — the only Free rate-limit slot is used by public mutations and Log-only was not exposed. Application Bearer authentication remains primary.

- **Rule name:** `api-subscribers-export-observe`
- **Expression:** path equals `/api/subscribers.csv` and method equals `GET`.
- **Suggested threshold:** 20 requests per IP per 10 minutes.
- **Action:** Start with monitoring/Log only if the plan exposes it; otherwise do not deploy a blocking approximation until normal operator IP behavior is known.
- **Plan dependency:** Log action may require Enterprise; MANUAL VERIFICATION REQUIRED.
- **Why:** Detect brute force or token endpoint discovery; Bearer authentication remains the primary control.
- **False-positive risk:** Operator retries or scripted exports behind rotating/private-relay IPs.
- **Verify:** Authorized export works and unauthorized access remains 401.
- **Rollback:** Disable the edge rule; rotate the secret only if compromise evidence exists.

### 5. Bot controls

- **Phase 2 result:** `VERIFIED_ENABLED` — Free Bot Fight Mode, whole zone. Representative navigation passed; continue monitoring privacy browsers, accessibility tools, search crawlers, and API clients.

- **Setting:** Enable the zone's available Bot Fight control only after representative observation.
- **Scope:** Public pages and mutation endpoints; explicitly verify static downloads, locale/data fetches, feedback, subscribe, and search-engine access.
- **Plan dependency:** Bot Fight Mode vs Super Bot Fight Mode vs Bot Management requires confirmation.
- **Why:** Reduce generic automation without replacing precise rate limits.
- **False-positive risk:** Privacy browsers, accessibility tools, monitoring, and non-browser API clients.
- **Verify:** Desktop/mobile browsing, locale/theme switch, downloads, forms, and known monitoring.
- **Rollback:** Disable the bot setting or narrow custom exceptions with documented evidence.

### 6. Cache rules

- **Phase 2 result:** `VERIFIED_ENABLED` for `api-bypass-cache`. No redundant HTML/static provider override was added; tracked origin directives remain authoritative and passed live header checks.

- **Rule name:** `api-bypass-cache`
- **Match:** path starts with `/api/`.
- **Action:** Bypass cache.
- **Rule name:** `html-revalidate`
- **Match:** HTML route requests and extensionless navigation responses.
- **Action:** Respect origin `Cache-Control`; do not force long edge TTL.
- **Rule name:** `versionable-static-assets`
- **Match:** `/scripts/`, `/styles/`, `/assets/`, `/locales/`, `/data/`, `/slides/`, `/downloads/` according to the tracked `_headers` policy.
- **Action:** Eligible for cache while respecting origin directives. Do not apply `immutable` until filenames are content-versioned.
- **Plan dependency:** Rule count requires verification.
- **Why:** Prevent API/data leakage and reduce static-origin load without serving indefinitely stale unversioned code.
- **False-positive risk:** Stale JS/CSS after deployment, stale track/locale data.
- **Verify:** Inspect `CF-Cache-Status`, `Cache-Control`, and post-deploy asset freshness; confirm APIs always return `no-store`.
- **Rollback:** Disable the specific cache rule and purge only affected URLs/assets; do not purge the entire zone unless necessary.

### 7. Browser Integrity Check and Turnstile

Browser Integrity Check was already enabled and passed the bounded representative browser/API smoke; its Phase 2 status is `VERIFIED_ENABLED`. Turnstile is **DEFERRED**: add it only if measured abuse persists after request bounds, origin checks, rate limits, and bot controls. If adopted, validate every token server-side, reject replay/expiry, preserve accessibility, and keep secrets in bindings.

### 8. Key Finder Render-behind-Cloudflare boundary

The Phase 3R target is browser → `api.jamtrackshub.com` → Cloudflare proxy → the existing Render FastAPI service. The frontend has no production fallback to `jasper-music.onrender.com`; CSP and large-slide fallback embeds use the custom hostname. Render retains the existing upload, job, compute, filename, timeout, cleanup, and generic-error bounds.

The generated Render hostname is a temporary rollback path only. Disable it only after the repository change is deployed and custom-domain health, production CORS, job creation, polling, one small synthetic upload, frontend network inspection, and whole-site smoke all pass. Re-enable it immediately if custom-domain traffic fails. Detailed rollout and rollback steps are in `docs/key-finder-render-behind-cloudflare.md`.

The only Free rate-limit slot must remain one combined exact-path rule. After the custom-domain cutover is live, add `/api/analyze/jobs` and `/api/analyze-file/jobs` to the existing `/api/subscribe` and `/api/feedback` expression while keeping 5 requests per IP per 10 seconds and a 10-second Block. Do not include `/api/analyze/jobs/{id}` or `/api/analyze-file/jobs/{id}` polling paths.

## Rollout And Verification

1. Confirm Cloudflare plan, zone hostname, current DNS/proxy state, current rules, analytics baseline, and owner-approved maintenance window.
2. Deploy repository changes through the canonical PR/CI/deploy flow in a separate authorized release task.
3. Verify `_headers` on representative HTML, JS, CSS, locale/data, and API responses. Confirm no browser console CSP regression.
4. Add cache bypass/eligibility rules first; verify freshness and API `no-store`.
5. Enable managed WAF rules using defaults; observe Security Events and resolve only evidenced false positives.
6. Add one public mutation rate rule at a time, starting conservatively. Observe before adding bot controls.
7. Enable the available bot control only after form/static/download verification.
8. Complete the custom-domain cutover gates before disabling the generated Render hostname; never infer completion from DNS alone.
9. Record timestamps, expressions, actions, screenshots, test evidence, false positives, and rollback decisions.

Production acceptance requires: normal pages/forms work, API methods/body/origin bounds hold, admin export requires a Bearer token, CSP emits no unexpected violations, static assets are fresh, no secret appears in HTML/JS/URL/log screenshots, Song Workspace sends no song-content request, and Security Events show the intended edge action.

## Observability And Incident Response

- Review Security Analytics/Events before and after each rule; compare path, method, source characteristics, action, and false positives.
- Never log full feedback bodies, subscriber addresses beyond the existing authorized data workflow, Song Workspace content, upload bytes, or secrets for abuse debugging.
- On false positives, roll back the narrowest edge rule and preserve application validation.
- On suspected admin-secret exposure, disable exports if necessary, rotate the encrypted binding through the approved operator workflow, invalidate old documentation/screenshots, and verify no URL-token workflow remains.
- On unusual Key Finder load, use provider-side evidence and existing job/upload bounds; do not run production load tests.

## Known Limitations / Remaining Gates

- Cloudflare production state cannot be reconstructed from source control alone; the verified 2026-08-29 snapshot must be rechecked before later provider changes.
- Free Managed Rules, Bot Fight Mode, Browser Integrity Check, DDoS protections, the combined public-mutation rate limit, and API cache bypass are enabled and passed bounded production smoke.
- The Free plan has no remaining rate-limit slot and did not expose method/host matching, longer windows, Log-only, or Managed Challenge. Administrative-export edge observation and per-endpoint rate policies require a later plan/capability decision.
- Security alerts and HSTS remain pending separate review. Turnstile remains deferred absent abuse evidence.
- The legacy Render hostname remains outside Cloudflare zone controls until it is disabled after all Phase 3R acceptance gates pass.
- Cloudflare-to-Render cryptographic origin authentication is **DEFERRED**; no secret or paid feature was added in Phase 3R.
- Cloudflare Containers/Durable Objects migration is **DEFERRED_COST_DECISION**; Render remains the compute provider.
- CSP retains `style-src 'unsafe-inline'` for current site compatibility.
- Same-origin checks reduce cross-site browser abuse but do not identify non-browser bots; rate limiting and bot controls remain necessary defense in depth.
- Application limits protect ordinary resource use but are not a formal proof against every algorithmic complexity attack.
