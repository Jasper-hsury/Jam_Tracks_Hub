# Key Finder Render-Behind-Cloudflare Runbook

## Decision And Scope

Key Finder compute remains on the existing Render Free web service. Cloudflare Free supplies proxied DNS and the zone controls already enabled for `jamtrackshub.com`. This phase does not use Cloudflare Containers, Durable Objects, Workers Paid, a new provider secret, or a backend rewrite.

Target production flow:

```text
Browser
  -> https://api.jamtrackshub.com
  -> Cloudflare proxied DNS / DDoS / Managed WAF / Bot / rate and cache policy
  -> existing Render FastAPI / ffmpeg / yt-dlp / model jobs
```

The Cloudflare-only prototype at `infra/key-finder-cloudflare-only-migration-v1` remains `DEFERRED_COST_DECISION`. Do not merge, cherry-pick, deploy, or use it as the production backend without a separate cost and architecture decision.

## Provider Preflight Recorded On 2026-08-29

| Gate | Evidence | Status |
| --- | --- | --- |
| Render service | Existing `Jasper-music` Free Docker web service; Singapore; `/api/health`; auto-deploy from `main` | Verified |
| Render custom domain | `api.jamtrackshub.com` added to the existing service | Verified |
| Render TLS | Dashboard reported `Verified` and `Certificate Issued` | Verified |
| Cloudflare DNS | CNAME `api.jamtrackshub.com` → `jasper-music.onrender.com` | Verified |
| Cloudflare proxy | CNAME changed from DNS-only certificate setup to Proxied | Verified |
| Zone TLS mode | `Full`; automatic mode enabled; not Flexible | Verified |
| Custom health | `GET https://api.jamtrackshub.com/api/health` returned 200 through Cloudflare | Verified |
| Legacy hostname | Disabled after final acceptance; direct health now returns 404 with `x-render-routing: blocked-render-subdomain` | Verified |

Provider preflight alone did not prove the frontend/CORS cutover. The production evidence recorded below confirms that the repository PR, both canonical deployments, the custom-domain workflow, the rate-rule expansion, and the generated-subdomain shutdown all completed in order.

## Repository Contract

- Production frontend API base: `https://api.jamtrackshub.com`.
- Production does not read a saved API override and has no fallback to `jasper-music.onrender.com`.
- Local pages may keep an explicit local API override and otherwise use `http://127.0.0.1:8000`.
- CSP `connect-src` and `frame-src` allow the custom API hostname, not the generated Render hostname.
- Large slide/PDF assets skipped from the Worker bundle use the custom API hostname for their Render-hosted fallback URL.
- FastAPI CORS allows exactly `https://jamtrackshub.com` plus `http://localhost[:port]` and `http://127.0.0.1[:port]` for development.
- CORS does not use a wildcard, reflect arbitrary origins, or grant credentials.
- Private Network Access preflight reflects only an approved origin and allows only the bounded methods and headers.
- Every `/api/*` response is `Cache-Control: no-store`.
- Existing upload, media-type, filename, job-count, worker-count, timeout, temporary-file, and cleanup bounds remain unchanged.

## Endpoint Matrix

| Path | Method | Purpose | Rate-rule treatment |
| --- | --- | --- | --- |
| `/api/health` | GET | Cheap health check | Exclude |
| `/api/analyze` | POST | Legacy synchronous URL analysis | Exclude pending production-use evidence |
| `/api/analyze/jobs` | POST | YouTube job creation | Include exact path after cutover |
| `/api/analyze/jobs/{job_id}` | GET | YouTube job polling | Exclude |
| `/api/analyze-file/jobs` | POST | File upload/job creation | Include exact path after cutover |
| `/api/analyze-file/jobs/{job_id}` | GET | File job polling | Exclude |
| `/api/analyze-file` | POST | Legacy synchronous file analysis | Exclude pending production-use evidence |

## Free-Plan Rate Rule

The zone has one Free rate-limit slot. The active rule `api-public-mutation-abuse` uses the IP characteristic, 5 requests per 10 seconds, Block action, and a 10-second mitigation. After custom-domain production smoke succeeded on 2026-08-30, its expression was expanded to these four exact paths:

```text
http.request.uri.path eq "/api/subscribe"
or http.request.uri.path eq "/api/feedback"
or http.request.uri.path eq "/api/analyze/jobs"
or http.request.uri.path eq "/api/analyze-file/jobs"
```

The Free UI did not expose method/host matching, Log-only, Managed Challenge, a longer period, or another rule. Never use a prefix that includes polling paths. Verify normal create/poll behavior but do not intentionally trip the production threshold.

## Deployment And Acceptance Sequence

1. Confirm the custom domain, certificate, Proxied DNS record, and non-Flexible TLS mode remain healthy.
2. Commit and push only the bounded repository files; open a PR to `main`.
3. Wait for all required CI checks and use the canonical squash-merge workflow.
4. Wait for the canonical Cloudflare site deployment and Render auto-deployment from the same merged `main` revision.
5. Verify production HTML/JS/CSP references the custom API hostname and contains no active generated-Render API fallback.
6. Verify custom health through Cloudflare.
7. Verify CORS: canonical production origin succeeds; an unrelated origin is rejected; localhost remains allowed for development.
8. Run one controlled YouTube job only if an authorized fixture is available; otherwise record it unverified instead of using arbitrary media.
9. Run one small synthetic file create → opaque job ID → poll flow. Do not use a large upload or load test.
10. Confirm 429/`Retry-After`, generic upstream errors, and application bounds via automated/local evidence; do not flood production.
11. Confirm Key Finder browser network requests use only `api.jamtrackshub.com` and expose no credential.
12. Confirm representative Song Workspace and whole-site navigation remains healthy and No-Lyrics-Egress tests still pass.
13. Expand the sole Free rate rule with the two exact job-creation paths and repeat one normal smoke without triggering the threshold.
14. Only after all preceding gates pass, disable the generated Render subdomain.
15. Verify the generated hostname is unavailable/404 and custom health plus one normal Key Finder flow still works.

## Production Acceptance Recorded On 2026-08-30

- PR `#12` passed both required checks and was squash-merged as `2154dd2ce5914b29cb3841d33348472e51315bf9`.
- Cloudflare Workers production build history reports `2154dd2` as `Success` on `main`.
- Render reports the same commit as the last successfully deployed `Live` revision.
- Production CSP, `site-config.js`, Key Finder runtime source, and large-slide fallback configuration use `https://api.jamtrackshub.com` and contain no active generated-Render API fallback.
- `GET /api/health` returned 200 through Cloudflare with `Cache-Control: no-store`.
- CORS allowed exactly `https://jamtrackshub.com`, rejected `https://evil.example`, preserved localhost development access, and bounded approved Private Network Access preflight.
- One repository-controlled 868 KiB OGG fixture created a file-analysis job with HTTP 202, returned an opaque job ID, completed through the custom-domain polling route, and returned HTTP 200/no-store. No production load test or large upload was performed.
- The production Key Finder page reported its API connected; Song Workspace, Read Mode, Performance Mode, Homepage, and Legal smoke checks passed. No new console errors were observed; the pre-existing GSAP/SplitText warnings remain unrelated.
- Existing No-Lyrics-Egress regression tests passed, and the production Song Workspace continued to use existing synthetic browser-local songs without adding a song-content network path.
- The sole Free rate rule was expanded to the exact two Key Finder creation paths in addition to subscribe/feedback. Polling remains excluded and the threshold/action/duration were unchanged.
- After all preceding gates passed, the generated Render subdomain was disabled. Its health path now returns 404 while custom health and the already-created job polling path remain 200.
- YouTube production analysis was not run because no separately authorized controlled URL fixture was available.

## Rollback

If failure occurs before disabling the generated hostname:

1. Stop the rollout; do not add a frontend fallback.
2. Revert the repository cutover through a normal PR if the defect is in frontend/CORS/CSP code.
3. If the custom hostname itself is faulty, temporarily set its DNS record to DNS-only only when required by Render certificate troubleshooting; restore Proxied after resolution.
4. Leave the generated Render hostname enabled.

If failure occurs after disabling the generated hostname:

1. Re-enable the Render-generated subdomain in Render Settings.
2. Verify its health once; do not direct production browsers to it as a silent fallback.
3. Roll back the narrowest faulty provider rule or repository change.
4. Keep `api.jamtrackshub.com` as the intended public API and repeat the full acceptance sequence before attempting disablement again.

If the expanded rate rule causes a false positive, remove only the two Key Finder creation paths and retain the subscribe/feedback protection while investigating. Do not weaken Render application bounds.

## Deferred Controls And Limitations

- Cloudflare-to-Render origin-header authentication: `DEFERRED`; no proven free, maintainable secret-injection path was adopted.
- Cloudflare Containers/Durable Objects: `DEFERRED_COST_DECISION`.
- The zone TLS mode is currently `Full`, which encrypts both legs; do not represent it as `Full (strict)` unless Dashboard evidence changes.
- Cloudflare proxying and disabling the generated Render hostname reduce direct-origin exposure but are not a cryptographic proof of origin identity.
- Render remains a public cloud provider and the existing application limits remain required defense in depth.
- No production secret, paid entitlement, tag, or GitHub Release is part of this phase.
