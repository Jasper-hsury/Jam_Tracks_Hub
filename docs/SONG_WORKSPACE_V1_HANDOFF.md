# Jam Tracks Hub — Song Workspace V1 Handoff

Snapshot date: 2026-08-27 (Asia/Taipei)

This is the canonical handoff for the unreleased Song Workspace V1 feature. It is a navigation and decision document, not a replacement for source code, tests, project instructions, or Git history.

Source precedence used throughout this document:

1. **Repository Truth**: current Git state, source files, tests, package scripts, and repository documentation.
2. **Confirmed Product / Conversation Decisions**: requirements explicitly confirmed by the product owner and recorded here as contracts or release gates.
3. **Proposed / Pending Decisions**: ideas not present in production code or not yet accepted for release; these are explicitly marked.

## 1. Purpose

This document lets a new Codex session resume Song Workspace V1 without relying on prior chat context. It records:

- the current implementation and where to find it;
- product, privacy, copyright, and interaction invariants;
- the current Git and release state;
- known defects and documentation drift;
- required validation and release gates;
- safe Git and Codex operating rules.

The snapshot SHAs below describe the repository when this handoff was written. A future session must always treat the actual Git state as newer truth and must never reset merely to match this document.

## 2. Project Identity

| Field | Value | Source |
| --- | --- | --- |
| Project | Jam Tracks Hub | `README.md` |
| Repository | `Jam_Tracks_Hub` | Git remote and repository contents |
| Production | `https://jamtrackshub.com` | `README.md` and page metadata |
| Frontend | Static multipage HTML/CSS/vanilla JavaScript | `*.html`, `styles/`, `scripts/` |
| Current focus | Song Workspace V1 | `song-workspace.html`, `scripts/song-workspace*.js` |
| Product position | Local-first guitar song workspace | Confirmed product decision and `docs/song-workspace.md` |
| Release state | Not released to production | Feature branch remains ahead of `main`; verify the live count from Git before release work. |

Song Workspace is a user-supplied-content practice and arrangement tool. It is not a 91PU clone, copyrighted lyrics catalog, public commercial-song library, scraper, account product, or cloud song-storage service.

## 3. Git Snapshot

Repository truth before the current Interaction, Performance, and Button Style hardening:

```text
Branch: feat/song-workspace-v1
HEAD: e02140e935da28d9ee9bdf98ea97c0c4754d8d31
origin/feat/song-workspace-v1: e02140e935da28d9ee9bdf98ea97c0c4754d8d31
main: 9b5ed9b
origin/main: 9b5ed9b
Feature branch vs origin/main: 8 ahead, 0 behind
Origin fetch/push: git@github.com:Passerby-WB/Jam_Tracks_Hub.git
```

The product history reports that GitHub has advertised a newer location, `git@github.com:Jasper-hsury/Jam_Tracks_Hub.git`. The current remote still uses the old URL, so remote URL normalization is **PENDING**. Do not change the remote during unrelated work; confirm the canonical owner and URL first.

Before the current interaction/performance/style hardening, there were no tracked modifications and only the two approved untracked exceptions in section 4. There were no uncommitted Song Workspace production changes.

## 4. Approved Working-Tree Exceptions

The following pre-existing files are intentionally untracked:

```text
Translation_Worksheet_zh-TW.md
docs/frontend-style-and-interaction-analysis.md
```

They may remain visible as `??` in `git status --short`. They must not be deleted, modified, renamed, moved, staged, committed, or added to `.gitignore` / `.git/info/exclude` unless the user explicitly changes this rule.

Do not use `git reset`, `git clean`, `git restore`, `git stash`, or broad staging to manage them. Any other unexpected modified or untracked path is a stop condition: inspect and report it instead of discarding or including it.

## 5. Agent / Codex / Skill Instructions

Repository instruction inventory at this snapshot:

| Path or category | Found | Purpose / rule |
| --- | --- | --- |
| `AGENTS.md`, nested `AGENTS.md` | No | Not found; do not invent instructions. |
| Repository `SKILL.md`, nested `SKILL.md` | No | Not found. |
| `CLAUDE.md` | No | Not found. |
| `CONTRIBUTING.md` | No | Not found. |
| `.github/copilot-instructions.md` | No | Not found. |
| Repository `.codex/` or `.agents/` | No | Not found. |
| `README.md` | Yes | Project structure, commands, routes, deployment overview. |
| `docs/song-workspace.md` | Yes | Song Workspace user/architecture summary; contains drift noted below. |
| `docs/GITHUB_WORKFLOW.md` | Yes | Branch, validation, commit, push, PR, and merge workflow. |
| `.github/workflows/ci.yml` | Yes | Remote CI currently runs syntax check and Cloudflare build. |
| `.github/workflows/umami-analytics.yml` | Yes | Scheduled analytics issue workflow. |
| `.github/workflows/umami-readme-screenshot.yml` | Yes | Daily analytics screenshot/README automation. |

External personal skill relevant to weekly track publishing:

```text
/Users/jasperhsu/.codex/skills/update-jam-tracks-hub/SKILL.md
```

Read that skill before publishing a weekly `Wxx` track. Its scope is weekly track ingestion, slides/download packaging, homepage/data refresh, validation, and Git publishing. It must not modify `README.md` or Website Analytics. It is not the source of truth for Song Workspace implementation.

The two approved untracked documents may be read for localization/design context but are not canonical tracked instructions and must remain untouched. A future frontend task should first reread `README.md`, this handoff, `docs/song-workspace.md`, relevant workflow files, and any instruction files newly added after this snapshot.

## 6. Repository Architecture

The site is a static multipage application, not React, Vue, Next.js, Vite, Tailwind, Bootstrap, GSAP, or Framer Motion.

```text
HTML route files
  -> styles/base.css, components.css, page CSS, theme CSS
  -> scripts/theme-init.js and scripts/i18n-init.js (early initialization)
  -> scripts/site.js and scripts/i18n.js (shared navigation/theme/locale)
  -> page-specific vanilla JS

song-workspace.html
  -> styles/song-workspace.css
  -> styles/chord-dictionary.css (shared chord diagram tokens/presentation)
  -> scripts/chord-shapes.js
  -> scripts/song-workspace-core.js
  -> scripts/song-workspace-storage.js
  -> scripts/song-workspace.js
```

Song Workspace starts through a `DOMContentLoaded` handler in `scripts/song-workspace.js`. The core and storage modules expose browser globals and CommonJS exports so Node's built-in test runner can test them without a browser bundle.

Other architecture areas:

- `worker.js` and `functions/api/`: Cloudflare routing, subscribe, CSV, and feedback APIs. Song Workspace does not use them for song content.
- `api-server/`: FastAPI key-analysis helper/backend; unrelated to local Song Workspace persistence.
- `locales/en/common.json` and `locales/zh-TW/common.json`: tracked translations.
- `tests/`: Node tests for core, storage fallback/preferences, chord shapes, and CSS contracts.
- `tools/scripts/build-cloudflare.js`: prepares static `dist/`, skipping oversized PDF assets.
- `data/`: shared site/track data; chord-shape generation is code-driven in `scripts/chord-shapes.js`.

Known documentation drift: the README page table does not list `song-workspace.html`, and `docs/song-workspace.md` says diagrams are not embedded even though the current editor embeds them. Do not silently trust those statements over source code.

## 7. Existing Product Pages

| Route | Purpose | Song Workspace relationship |
| --- | --- | --- |
| `index.html` | Home, tool discovery, releases, about/contact | `scripts/site.js` injects the workspace navigation entry. |
| `tracks.html` | Weekly backing-track library and downloads | Practice-content sibling; no song-document coupling. |
| `chord-dictionary.html` | Chord formulas, notes, filters, diagrams | Shares chord-shape source and interval colors. |
| `scale.html` | Scale/fretboard visualization and PNG export | Related theory tool; no workspace storage coupling. |
| `key-finder.html` | Uploaded audio / optional YouTube key analysis | Can provide a key before building a workspace song. |
| `chord-progressions.html` | Key-based progression and diagram explorer | Shares chord shapes and musical conventions. |
| `song-workspace.html` | Local song charts, transposition, capo, modes, diagrams, exports | Current feature focus. |
| `progression-writer.html` | Custom progression authoring/export | Separate local creation workflow. |
| `fretboard-trainer.html` | Note-name drills | Related practice tool. |
| `feedback.html` | User feedback form backed by Worker/D1 | Separate server API; never receive song text. |
| `privacy-policy.html` | Privacy policy | Must be reviewed before Song Workspace release. |
| `404.html`, `service-waking.html` | Error/service states | Shared navigation/theme/i18n behavior. |

“About” is a section on `index.html`, not a separate route. Slide pages under `slides/` are weekly track artifacts, not application routes requiring Song Workspace integration.

## 8. Song Workspace Product Contract

Confirmed product model:

```text
user brings their own content
-> browser-local parsing and editing
-> transpose / capo / simplify / Roman / Nashville
-> playable chord diagrams and performance mode
-> local export / backup
```

The home view now separates creation from import. **Create Song** contains exactly three prominent entries: Chords + Lyrics, Lyrics Only, and Chords Only. **Other Import Options** is a lower-weight, still-visible area containing ChordPro and Jam Tracks Hub JSON. ChordPro includes a short inline example and an optional native disclosure; Jam Tracks Hub JSON is described as the complete single-song project format. Backup All and Restore Backup remain library-level actions under My Songs.

Current editor capabilities include metadata, anchored chords, sections/lines, five chord views, transpose, capo/shape key, Smart Capo, chord-change hints, inline diagrams, per-song voicing selection, performance mode, auto-scroll, and local exports.

Create and ChordPro dialogs follow an explicit cancellation contract: X, Cancel, and Escape close without entering the submit path or triggering required-field validation. Only the real Create / Import action remains a submit control and therefore runs native required validation plus the bounded parser/format checks.

Performance Mode derives its 1.0× base auto-scroll speed from BPM using `BPM / 60 × 24px per beat`. This preserves the former 48px/s default at 120 BPM and approximates one current four-beat chart-line visual interval. Base speed is bounded to 18–96px/s; missing, invalid, or zero BPM uses 48px/s. The user's separate 0.5×–2.0× multiplier is a presentation preference and is not reset by BPM changes. A fractional distance accumulator prevents low-speed subpixel loss, while elapsed-time movement remains refresh-rate independent.

Do not add accounts, server song storage, public sharing, copyrighted fixtures, or release operations without a separate explicit request and gate review.

## 9. Local-First / Privacy Contract

Critical invariant: lyrics, chord charts, ChordPro source, canonical Song Documents, anchors, and editing state remain in the user's browser.

Repository evidence:

- `scripts/song-workspace-storage.js:12-14` defines the IndexedDB database/store.
- Song CRUD runs against IndexedDB; lightweight presentation preferences use localStorage.
- `song-workspace.html:109-113` tells users that songs stay in the browser and can be lost if site data is cleared.
- `scripts/song-workspace.js` contains no `fetch`, `sendBeacon`, XHR, or Worker API call for song content.

V1 has no user-song database, account requirement, or cloud synchronization. Analytics and error reporting must never receive lyrics, raw pasted content, raw ChordPro, Song JSON, or user notes. Any future telemetry must be event-only (for example `song_workspace_opened`, `transpose_used`, or `capo_used`) with content-free metadata.

## 10. 91PU Boundary

Confirmed boundary: 91PU may be used only for competitor/reference research. Jam Tracks Hub must not collect 91PU credentials, cookies, or sessions; perform authenticated scraping; scrape or mirror full lyrics/charts; bypass paid features; or use 91PU as a content source.

Tests and examples must use synthetic, invented, or public-domain-safe text. Never commit complete third-party commercial lyrics or charts as fixtures.

## 11. Song Document Schema

Canonical schema source: `scripts/song-workspace-core.js:12-17,315-357`.

```text
Song
  schema: "jamtrackshub-song"
  version: 1
  id
  title
  artist
  originalKey
  targetKey
  capo
  bpm
  timeSignature
  sections[]
  createdAt
  updatedAt

Section
  id
  type
  title
  lines[]

Line
  id
  type
  text
  chords[]

Chord
  id
  symbol
  anchor
```

`shapeKey` is derived by `songForCapo`, not persisted in the Song Document. Selected voicings, mode, chord-hint setting, and performance preferences are presentation preferences, not canonical song fields.

Validation requires matching schema/version and enforces bounded source/song/section/line sizes. There is no migration framework beyond exact version-1 validation; a future schema version must add an explicit migration path rather than weakening validation.

One source of truth: canonical chords remain chord symbols. Target-key, capo, easy, Roman, and Nashville representations are derived runtime views; never persist separate song copies per key or mode.

## 12. Persistence Architecture

`scripts/song-workspace-storage.js` defines:

```text
IndexedDB database: jamtrackshub-song-workspace
Database version: 1
Object store: songs (keyPath: id)
Index: updatedAt
localStorage preference key: jamTracksHubSongWorkspacePreferences
```

IndexedDB stores canonical songs through list/get/put/remove/replace-all operations. localStorage stores lightweight preferences, including chord hints and per-song selected voicing keys. Storage unavailability degrades to an error/status path rather than a server fallback.

`scripts/song-workspace.js:681-701` debounces autosave by 500 ms and flushes on visibility change. Backup/restore is the portability mechanism; clearing browser/site data can remove local songs. Storage tests currently cover unavailable IndexedDB and preference helpers, but do not run full CRUD against a fake/real IndexedDB implementation.

## 13. Import Formats

Current supported creation/import paths:

- **Chords + Lyrics**: conservative parsing of chord lines followed by lyric lines, headings, and chord-only lines (`parseChordLyrics`, `scripts/song-workspace-core.js:428`).
- **Lyrics Only**: creates editable lyric content without inferred chords.
- **Chords Only**: creates chord-only progression/chart content.
- **ChordPro**: common metadata, inline chord anchors, and common section directives (`parseChordPro`, line 500).
- **JTH JSON import**: validates one canonical Song Document; app-side input is limited to 1 MB.
- **Backup restore**: validates `jamtrackshub-song-backup` version 1 and a maximum of 500 songs.

Parsers are intentionally conservative and bounded. Ambiguous text should remain editable rather than being aggressively guessed. Imported user content must not be auto-translated or sent to a server.

## 14. JSON vs ChordPro

**Jam Tracks Hub JSON (`.jth.json`)** is the complete canonical project/backup format. It preserves IDs, metadata, sections, lyric text, chord anchors, and timestamps.

**ChordPro (`.cho`)** is an interchange text format such as `[G]lyric [D]lyric`. It can represent useful metadata and inline anchors but is not guaranteed to preserve every JTH-specific identity or preference.

Do not treat ChordPro as the complete backup format. The confirmed information-architecture change is **RESOLVED** on 2026-08-27: `song-workspace.html` keeps exactly three primary create cards, while the secondary Other Import Options area contains ChordPro—with `[G]lyrics [D]lyrics` guidance and optional help—and Jam Tracks Hub JSON. `tests/song-workspace-import-ia.test.js` covers hierarchy, handler wiring, localization, responsive contracts, synthetic ChordPro, and valid/invalid JTH project validation.

## 15. Lyric / Chord Anchor Model

Anchors are logical Unicode code-point positions, not pixel coordinates. Relevant sources:

- `createChord` / `createLine`: `scripts/song-workspace-core.js:135-145`.
- `tokenizeLyric`: line 165; complete English words are tokens, while CJK characters are independently addressable.
- `layoutLyricLine`: line 218; resolves chord anchors onto lyric tokens without mutating canonical text.
- Editor anchor preview and controls: `song-workspace.html:275-305` and app line-editor handlers.

This preserves anchors through transposition and number-mode label changes. Chord Change Hints bold only the anchored CJK character or complete English word. They must not alter canonical lyrics, insert Markdown, move the anchor, or add arrows.

## 16. Alignment Invariants

Confirmed visual contract:

- Lyrics remain natural continuous text; chord width must not insert artificial spaces into lyrics.
- Each chord label's **left edge** aligns with the left edge of its anchored Chinese character or complete English word.
- Chords occupy a separate visual layer above lyrics.
- There are no arrows, connector lines, dots, or other chord-to-lyric link symbols.
- Long labels may require more horizontal space, but must not move the lyric anchor or mutate song data.
- **Newest invariant: every lyric line has exactly one chord-annotation row.** Vertical staggering, a second row, wrapping to another chord row, or collision-to-next-row is forbidden.

Status: **RESOLVED** on 2026-08-27 by the `fix: enforce single-row song chord annotations` change. `fitSingleRowChordAnnotations` (`scripts/song-workspace-core.js`) preserves anchor-left positions and returns bounded presentation scales without row metadata. `layoutChordTracks` (`scripts/song-workspace.js`) uses one measured row height and no `rowCount`, vertical offset, or collision-to-next-row fallback. CSS fixes every annotation at `top: 0` with a left transform origin. Core/style regressions cover the former Roman `ii7 / bVIIadd9 / IV / I/III` failure, long labels, canonical data immutability, and removal of production multi-row architecture.

Browser acceptance passed in the in-app Chromium browser at 1280, 1024, 768, and 375 CSS pixels for Original, Balanced, Beginner, Roman, Nashville, Chord Change Hints, and Performance Mode. Physical Safari/iOS validation remains part of the separate hardware release gate. Presentation scaling has a 0.60 readability floor; pathological inputs with several very long labels on extremely close or identical anchors may overlap, but must never create a second row, move anchors, or mutate lyrics.

## 17. Song Editing Model

The editor renders insertion boundaries with a low-visual-weight `+ Add` control. It opens a non-modal menu with Add Line and Add Section. The menu prefers the trigger's right side, vertically centered, and falls back within the viewport; outside click, Escape, and selection dismiss it.

- `insertLine` (`scripts/song-workspace-core.js:263`) inserts at beginning, middle, or end while retaining all existing IDs and anchors.
- `insertSectionAtBoundary` (line 274) inserts relative to the selected boundary. At a boundary inside a section, trailing lines move into the new section; existing line/chord IDs remain stable.
- Section names are free-form user content, not an enum.
- Autosave persists both operations and preserves ordering on reload.

Localized placeholders provide examples only. There is one insertion model; the prior separate top-level Add Section path is not part of the current editor toolbar.

## 18. Chord Modes

The mode bar in `song-workspace.html:168-179` exposes:

| Mode | Contract | Derivation |
| --- | --- | --- |
| Original | Preserve canonical chord quality | Transposed/capo play song without simplification |
| Easy: Balanced | Reduce difficulty while preserving harmonic character where practical | `simplifyChord(..., "balanced")` |
| Easy: Beginner | Prioritize completion; may simplify more and remove slash bass | `simplifyChord(..., "beginner")` |
| Roman | Harmonic labels such as `I`, `vi`, `bVIIadd9`, `I/III` | `chordNumber(..., "roman")` |
| Nashville | Performance numbers such as `1`, `6m`, `b7add9`, `1/3` | `chordNumber(..., "nashville")` |

Roman/Nashville are derived from effective playable chords relative to the effective **shape key**, not the concert target key. Example: concert A + capo 2 + G shapes uses `G D Em C` diagrams and displays `I V vi IV` / `1 5 6m 4`. Transpose and capo must preserve degree identity and lyric anchors. Slash and non-diatonic roots are supported by `chordNumber` (`scripts/song-workspace-core.js:663-674`).

The right panel always shows actual playable chord diagrams, never Roman/Nashville “diagrams.” Previous blank-number regressions are covered by core tests and must not be reintroduced.

## 19. Smart Capo

`smartCapo` (`scripts/song-workspace-core.js:631`) evaluates capo positions 0 through 11, derives the corresponding shape key/song, and scores chord difficulty. Open/common shapes receive lower cost; accidentals, slash bass, complex suffixes, and less guitar-friendly shapes add cost. Candidates are sorted by score and then capo; the app requests the top three (`scripts/song-workspace.js:895`).

The recommendation is derived; applying one changes capo/shape view, not canonical chord identity. Degree modes must continue to use the resulting shape key. The algorithm is heuristic, not a guarantee of the best voicing for every player or tuning.

## 20. Chord Shapes / Shared Data

Shared source: `scripts/chord-shapes.js`. It parses supported chord families, creates/caches voicings, ensures slash bass is the lowest sounding note, and builds presentation-neutral diagram models.

Consumers:

- Chord Dictionary (`scripts/chord-dictionary.js`)
- Chord Progressions (`scripts/chords.js`)
- Song Workspace (`scripts/song-workspace.js`)

Song Workspace cards show chord name, diagram, and Choose Another Shape. The picker lists available voicings; selection is persisted per song as a presentation preference and updates the inline diagram. Avoid duplicating separate shape datasets/rendering semantics or exposing ranking/debug metadata such as “Shape X of Y” in the primary card.

The tested regression set includes C, Am7, Fadd9, G/B, C#m7b5, Bbmaj9, A7(b13), and F#sus4. Shape availability is broad but not mathematically exhaustive for every possible chord symbol.

## 21. Interval Colors

Song Workspace reuses the Chord Dictionary interval variables and presentation rules from `styles/chord-dictionary.css`, including root, third, fifth, seventh, and extension families. `scripts/chord-shapes.js` supplies interval-family metadata rather than page-specific colors.

`tests/song-workspace-style.test.js` asserts that workspace CSS does not redefine the shared chord-diagram color tokens. Light and dark theme overrides remain centralized in Chord Dictionary styles. The root marker, especially in light mode, must remain readable and visually identical across the three chord-diagram consumers.

## 22. Modal / Scroll Behavior

The Chord Shape Picker is a native dialog (`song-workspace.html:242-253`). Current implementation in `scripts/song-workspace.js`:

- captures exact scroll X/Y;
- dynamically measures scrollbar width and compensates body padding;
- fixes/locks the background body;
- allows internal dialog scrolling with a bounded max height;
- supports iOS momentum and overscroll containment in CSS;
- routes X, Escape/native dialog cancel, and voicing selection through one guarded `closeShapePicker` path;
- updates only the selected card's diagram while the background remains locked instead of rebuilding the card subtree;
- restores focus to the originating Choose Another Shape button, using `preventScroll` where supported, while the body is still fixed;
- restores body styles and the captured page position exactly once, with smooth scrolling temporarily disabled and no animation-frame or timeout retry.

The main Song Chart and Chord Shapes columns are normal document-flow columns, top-aligned, without a sticky right panel or independent vertical scrollbar. Performance Mode is intentionally its own dialog/scroll context.

The code-level transient-jump issue is **RESOLVED** in this snapshot. Root cause was a combination of replacing the entire shape-card subtree during selection, unlocking the body before focus restoration, global smooth-scroll behavior affecting `scrollTo`, and a second deferred restoration attempt. The new pipeline keeps the background locked through selection and focus restoration, then performs one instant restore. In-app browser acceptance at 1280×720, 1024×768, and 375×812 recorded zero final scroll delta for X and selection paths, including 10 consecutive desktop selections, preserved card/diagram geometry, internal modal scrolling, trigger focus, and reload persistence. The product owner subsequently reported macOS Safari user acceptance with no visible shape-selection jump: **PASS**. iPhone/iOS hardware acceptance remains **PENDING RELEASE** and must not be inferred from the macOS result.

## 23. Export / Backup

Current export paths in `scripts/song-workspace.js:832-891`:

- JTH JSON: canonical current song.
- ChordPro: current playable chord view in interchange text.
- TXT: current playable text view.
- Print / PDF: browser print flow with print-specific CSS.
- Backup All: versioned JSON containing up to 500 songs.
- Restore Backup: validates the backup envelope and canonical songs before adding them.

Full local exports may contain the user's local lyrics because they remain on the user's device. They must not be confused with future public/share-safe payloads. Object URLs are revoked after download.

## 24. Localization

Tracked locales are `locales/en/common.json` and `locales/zh-TW/common.json`, with early locale initialization through `scripts/i18n-init.js` and runtime application through `scripts/i18n.js`.

Required section examples:

```text
zh-TW: 例如：前奏、主歌、預副歌、副歌、間奏、橋段、獨奏、尾奏…
en:    e.g. Intro, Verse, Pre-Chorus, Chorus, Interlude, Bridge, Solo, Outro
```

Localization applies to UI labels, menus, placeholders, status text, and accessibility labels. It must never translate user-entered song titles, lyrics, section names, or chord text. A section named `間奏` remains `間奏` after switching the UI to English.

The approved untracked `Translation_Worksheet_zh-TW.md` may be consulted read-only but is not a tracked runtime source. Preserve existing early-language initialization so direct reloads do not flash the fallback language.

## 25. CSS / Design System

Primary source: `styles/song-workspace.css`; shared foundations: `styles/base.css`, `styles/components.css`, `styles/themes.css`, and `styles/chord-dictionary.css`.

Song Workspace uses existing Jam Tracks Hub variables, restrained cards, compact buttons, borders, shadows, focus-visible states, light/dark theme values, and responsive conventions. Page-specific variables at the top of `styles/song-workspace.css` map into the established palette rather than introducing a separate visual language.

Button semantics are now hardened around the shared site tokens used by Write Your Own Progression and the other music tools. Primary, secondary, danger, subtle, icon, segmented, toggle, card, and menu actions share control height/radius, typography, depth-shadow language, restrained hover/active feedback, `--focus-ring`, disabled behavior, theme tokens, and reduced-motion handling. Component hierarchy remains intentional: creation cards and shape/capo choices remain interactive cards, `+ Add` remains a low-weight inline action, menu items remain compact, and destructive actions use the existing danger palette.

Important CSS contracts include:

- two-column editor grid with `align-items: start`;
- equal panel framing/padding for Song Chart and Chord Shapes;
- natural lyric flow plus a separate chord layer;
- low-noise insertion controls on pointer devices and 44px touch targets;
- modal-only internal vertical scrolling;
- print rules that hide controls and the shape side panel.

Do not reintroduce absolute positioning for the two main columns, a sticky shape panel, duplicated interval tokens, or CSS-only fixes that alter canonical anchor semantics.

## 26. Responsive Behavior

Desktop uses two normal-flow columns for Song Chart and Chord Shapes. At `max-width: 1050px`, `styles/song-workspace.css` stacks them into one column. Additional adjustments occur at `720px` and `420px`.

Confirmed responsive contract:

- desktop: same panel top, one document scrollbar, no sticky/following right column;
- tablet/mobile: predictable single-column stack;
- no nested vertical scrolling in the regular editor;
- no page-level horizontal overflow;
- individual long chart lines may use bounded horizontal overflow rather than corrupt lyric spacing;
- dialogs remain internally scrollable and touch-friendly;
- `+ Add` remains available without relying on hover.

Automated CSS contract tests exist, but there is no browser E2E suite. Physical Safari/iOS behavior remains a release gate.

Interaction/performance/button acceptance on 2026-08-27 passed in the in-app Chromium browser at 1280×720, 1024×768, and 375×812 in light/dark and en/zh-TW. Create and ChordPro X/Cancel/Escape closed with empty or partial required fields while real submit stayed open as invalid. Actual 1.0× measurements for 60/90/120/180 BPM were approximately 23/35/48/71px/s; 120 BPM at 0.75×/1.25×/1.5× measured approximately 36/60/71px/s. Pause held position, resume continued without a jump, end-of-content stopped, all tested button groups had no page-level horizontal overflow, and browser console logs were empty.

## 27. Privacy / Copyright Boundary

Product position: Jam Tracks Hub is a tool provider, not a copyrighted lyrics library.

Users are responsible for having rights to imported, exported, or eventually shared material. Before release, user-facing copy must be reviewed or added for these concepts:

```text
Song content is stored only on this device.
Only import content you have the right to use.
Future sharing does not include lyrics.
```

The exact legal copy is **PENDING RELEASE** policy review. The implementation must continue to keep lyrics local and must not place third-party commercial lyrics/charts in fixtures, analytics, error logs, documentation examples, or the repository.

Privacy policy content currently focuses heavily on Key Finder; it should be reviewed for whether Song Workspace local-only behavior and storage-loss caveats are adequately disclosed before release.

## 28. Future Share Arrangement Boundary

Share Arrangement is **NOT IMPLEMENTED** and is not current V1. If considered later, it must be a separate arrangement-only schema and not “Share Song.”

Server-side allowlisting must exclude lyrics, lyric text/tokens, anchor text, raw ChordPro, full Song JSON, and notes that may contain lyrics. Conceptually allowed data may include title/artist metadata, key, capo, shape key, BPM, time signature, section labels, chord symbols, voicing IDs, and abstract anchor positions, but this remains **PROPOSED** and requires legal/privacy review.

An initial future design may consider unlisted, noindex, no sitemap, no public search, expiry/revoke, or client-side fragment sharing. Unlisted links are not copyright immunity. Do not build a public searchable copyrighted song/artist/UGC chart library without a new legal and product review.

## 29. Anti-Abuse Release Gate

This is a confirmed pre-release gate, even though the Song Workspace itself is local-only.

Review the complete production surface for:

- CDN and static-asset cache strategy;
- API-specific rate limits and request-size limits;
- WAF and bot protection;
- repeated refresh/request abuse;
- protection of subscribe, feedback, Key Finder, CSV/admin, and any future endpoints;
- content-free operational abuse logging;
- limits that do not punish normal users with a fragile frontend refresh lock.

Cloudflare bindings/routes must be represented in tracked deployment configuration where possible so redeploys do not silently remove them. This gate is **PENDING RELEASE** and must be evaluated against current Cloudflare configuration, not assumed from frontend code.

## 30. Safari / iOS Release Gate

Physical Safari/macOS and iPhone/iOS manual validation is a confirmed pre-release gate. Validate at minimum:

1. Shape Picker background lock, internal scrolling, selection, close paths, focus, and zero visible scroll jump.
2. Touch scrolling and overscroll behavior.
3. Single-row chord alignment for CJK and English lyrics.
4. `+ Add` menu and section dialog.
5. Performance Mode, auto-scroll, and font controls.
6. Local save/reload, imports, downloads, print/PDF, backup/restore.
7. Light/dark theme and English/zh-TW.
8. Tablet and phone stacking without nested or horizontal page scrolling.

In-app browser/static checks do not substitute for hardware acceptance. The bounded code fix and non-WebKit browser acceptance are complete, and macOS Safari user acceptance reports no visible shape-selection jump: **PASS**. iPhone/iOS is still unverified and remains **PENDING RELEASE**.

## 31. Tests / Build Commands

Current `package.json` scripts:

```bash
npm test
npm run check
npm run build:cloudflare
git diff --check
```

There are no separate `lint`, `typecheck`, or `format` scripts. `npm run check` performs `node --check` over listed JavaScript/Worker/API/build files. `npm test` uses Node's built-in test runner on `tests/*.test.js`.

Current Interaction, Performance, and Button Style hardening baseline on 2026-08-27:

```text
npm test: PASS, 55/55
npm run check: PASS
npm run build:cloudflare: PASS
git diff --check: PASS
```

Test files:

- `tests/song-workspace-core.test.js`
- `tests/song-workspace-import-ia.test.js`
- `tests/song-workspace-interaction.test.js`
- `tests/song-workspace-scroll.test.js`
- `tests/song-workspace-storage.test.js`
- `tests/song-workspace-style.test.js`
- `tests/chord-shapes.test.js`

Important limitation: `.github/workflows/ci.yml` runs `npm run check` and `npm run build:cloudflare`, but not `npm test`. There is no Playwright/Cypress/browser E2E suite. The former multi-row packing expectation has been replaced by single-row geometry, Roman collision, canonical immutability, and production-architecture regressions.

## 32. Recent Relevant Commits

| SHA | Message | Purpose |
| --- | --- | --- |
| Current change | `fix: refine song workspace interaction and performance controls` | Makes create/import cancellation independent of validation, links auto-scroll base speed to BPM while retaining the user multiplier, and aligns all workspace button semantics with shared site tokens. |
| `e02140e` | `fix: clarify song creation and import options` | Separates three primary creation methods from ChordPro/JTH JSON imports, adds optional ChordPro help, responsive hierarchy, localization, tests, and status documentation. |
| `6cc1187` | `fix: stabilize song shape picker scroll restoration` | Unifies close/focus/restore ordering, updates one diagram without rebuilding its card, suppresses smooth restore, adds scroll-contract regressions, and records responsive in-app browser acceptance. |
| `6fb567a` | `fix: enforce single-row song chord annotations` | Removes row assignment/row-count rendering, adds bounded left-origin label fitting, tests, Chromium acceptance, and status documentation. |
| `e053886` | `fix: harden song workspace visual alignment` | Separate chord layer, annotation packing, Add menu positioning, shared-style tests. Also introduced/codified the now-rejected multi-row behavior. |
| `2ee6535` | `fix: refine song workspace scrolling and editing` | Modal/body scroll handling, unified Add Line/Section, section insertion, degree-mode hardening. |
| `b19b3ce` | `fix: harden song workspace editing and chord shapes` | Shared chord-shape integration, editing hardening, regression tests. |
| `117ad41` | `feat: add local-first song workspace` | Initial V1 page, model, storage, editor, modes, exports, tests, and docs. |
| `9b5ed9b` | `Add W19 backing track` | Current `main` baseline before the feature branch. |

The daily Umami workflow can create unrelated README/analytics commits on `main`; always fetch and inspect divergence before a future PR or rebase decision. Do not resolve README analytics conflicts by discarding the current image/block.

## 33. Regression History

Do not reintroduce these previously addressed failures:

- Roman/Nashville labels disappearing.
- Roman/Nashville using concert key instead of effective shape-key semantics.
- Degree modes mutating canonical chords or losing lyric anchors.
- Slash/non-diatonic degrees becoming blank/undefined.
- Right Chord Shapes becoming sticky or independently scrollable.
- Song Chart and Chord Shapes starting at different vertical positions.
- Background scrolling while Shape Picker is open or layout shift from scrollbar removal.
- Separate, inconsistent Add Line and Add Section insertion paths.
- Existing IDs/anchors being regenerated during insertion.
- User-entered section names being translated with the UI.
- Lyrics being spaced according to chord-label width.
- Arrows/connectors between chords and lyrics.
- Workspace-specific chord interval colors diverging from Chord Dictionary.
- Chord Change Hints changing lyric content instead of presentation.
- Right-panel diagrams changing to numeral labels in Roman/Nashville mode.
- X or Cancel buttons inside a required form becoming unintended submit controls and being blocked before the submit handler runs.
- Auto-scroll speed ignoring BPM, losing fractional per-frame distance, or changing with display refresh rate.
- Independent workspace button styles drifting from shared primary/secondary/danger/focus/motion tokens.

## 34. Current Known Issues

### Issue A — chord annotations can occupy multiple rows

Status: **RESOLVED** on 2026-08-27. The old `packChordAnnotations` row allocator, renderer `rowCount`, per-annotation vertical offsets, and multi-row test expectation were removed. The replacement keeps all annotations at the exact logical anchor left edge on one layer and applies bounded left-origin horizontal condensation only when ordinary labels are tight.

Regression coverage includes Original, Balanced, Beginner, Roman, Nashville, `ii7 / bVIIadd9 / IV / I/III`, Nashville equivalents, long chord symbols, CJK/English/mixed lyrics, canonical immutability, shared editor/performance rendering, responsive internal line overflow, and removal of production row metadata. Chromium acceptance passed at 1280/1024/768/375 without page-level horizontal overflow. Physical Safari/iOS acceptance remains pending under Issue B and the Safari release gate.

### Issue B — Safari shape selection may visibly jump

Status: **CODE FIX RESOLVED / macOS SAFARI USER ACCEPTANCE PASS / iPHONE-iOS PENDING**. The picker captures scroll once, keeps the body fixed while the selected diagram and trigger focus are restored, funnels every exit through one guarded close pipeline, suppresses global smooth scrolling during the single `scrollTo`, and has no deferred restoration retry. Automated source-contract tests and responsive in-app browser acceptance pass with zero final scroll delta and stable geometry. The product owner reports no visible jump in macOS Safari. iPhone/iOS hardware must still prove there is no transient visible frame before release.

### Issue C — create/import cancellation can trigger required validation

Status: **RESOLVED** on 2026-08-27. Root cause was X and Cancel being `type="submit"` controls inside the required native-dialog form; browser constraint validation runs before the submit handler can inspect `event.submitter`. Create, ChordPro, section, and line-editor dismissal controls are now explicit non-submit buttons routed to `dialog.close("cancel")`, with a shared Escape path. The genuine Create / Import / Add / Save controls remain submit buttons, and Create/ChordPro require both title and source content.

### Issue D — Performance Auto Scroll ignores BPM

Status: **RESOLVED** on 2026-08-27. The old manual slider produced 12–120px/s directly and defaulted to 48px/s without consulting song BPM. The new base is `BPM / 60 × 24px per beat`, bounded to 18–96px/s and falling back to 48px/s when BPM is absent or invalid. A retained 0.5×–2.0× user multiplier is applied afterward. Elapsed-time scrolling uses a fractional accumulator so 60Hz/120Hz and subpixel rounding do not change musical progression speed; pause/resume preserves position and the loop stops at the content end.

### Issue E — workspace button styles drift across components

Status: **RESOLVED** on 2026-08-27. Static and dynamic controls now use explicit primary, secondary, danger, subtle, icon, segmented/toggle, interactive-card, and menu semantics. Colors, depth shadows, radii, transitions, focus rings, disabled states, theme values, and reduced-motion behavior reuse the existing site tokens and Write Your Own Progression interaction language. Responsive browser acceptance covers home, modals, editor, mode selector, menus, shape picker, line editor, and Performance Mode.

### Documentation and release issues

- `docs/song-workspace.md` incorrectly says diagrams are not embedded.
- README route table omits Song Workspace.
- CI omits `npm test`.
- Copyright/user-content copy and analytics/error-payload review are pending release.
- Anti-abuse review and physical Safari/iOS acceptance are pending release.
- Origin URL normalization is pending confirmation.

## 35. Completed vs Pending Matrix

| Item | Status | Source / Evidence | Notes |
| --- | --- | --- | --- |
| Canonical Song Document v1 | DONE | `scripts/song-workspace-core.js:12-17,315-357` | Versioned, bounded local model. |
| Chords + Lyrics / Lyrics / Chords creation | DONE | `song-workspace.html:73-88`, app/core parsers | Current primary creation paths. |
| ChordPro import/export | DONE | `parseChordPro`, `toChordPro` | Functionality exists. |
| ChordPro / JTH JSON import hierarchy | RESOLVED | `song-workspace.html`, `styles/song-workspace.css`, locale files, `tests/song-workspace-import-ia.test.js` | Exactly three primary create methods; both existing-data formats are secondary imports. |
| Create/import cancellation vs validation | RESOLVED | dialog markup, shared close/Escape handlers, `tests/song-workspace-interaction.test.js`, responsive browser acceptance | X, Cancel, and Escape bypass validation; only real Create/Import submits validate. |
| IndexedDB song persistence | DONE | `scripts/song-workspace-storage.js` | Browser-local only. |
| Preference persistence | DONE | storage/app preference helpers | Includes hints and selected voicings. |
| Autosave and reload | DONE | `scripts/song-workspace.js:681-701` | 500 ms debounce plus visibility flush. |
| Logical lyric/chord anchors | DONE | `tokenizeLyric`, `layoutLyricLine` | Unicode/code-point based. |
| Natural lyric spacing / separate chord layer | DONE | core renderer, `styles/song-workspace.css`, style tests | No chord-width spacing in lyrics. |
| Exactly one chord row per lyric line | RESOLVED | `fitSingleRowChordAnnotations`, `layoutChordTracks`, core/style regressions | No production row metadata or collision-to-next-row path remains. |
| No arrows/connectors | DONE | current renderer/styles | Preserve. |
| Chord Change Hints | DONE | app preferences/rendering | Presentation-only anchored emphasis. |
| Unified `+ Add` menu | DONE | app rendering/handlers, style test | Add Line and Add Section. |
| Stable line/section insertion IDs | DONE | core insertion tests | Existing anchors preserved. |
| Roman/Nashville labels | DONE | `chordNumber`, core tests | Includes slash and non-diatonic roots. |
| Shape-key numeral semantics | DONE | `currentShapeSong`, `currentPlayShapeSong`, core tests | Degree identity survives transpose/capo. |
| Easy Balanced / Beginner | DONE | `simplifyChord`, core tests | Canonical song unchanged. |
| Smart Capo | DONE | `smartCapo`, app UI | Heuristic top-three recommendations. |
| Shared chord-shape data | DONE | `scripts/chord-shapes.js` | Used across three tools. |
| Shared interval colors | DONE | `styles/chord-dictionary.css`, style test | Light/dark centralized. |
| Inline Chord Shapes / picker | DONE | app render/picker code | Selection persists locally. |
| Background modal scroll lock | DONE | `lockShapePickerScroll`, `finalizeShapePickerClose`, `restoreShapePickerScroll` | One captured position, one guarded close pipeline, focus-before-unlock, one instant restore. |
| Shape Picker zero-jump code hardening | RESOLVED | `scripts/song-workspace.js`, `styles/song-workspace.css`, `tests/song-workspace-scroll.test.js` | Responsive in-app browser acceptance has zero final delta and stable geometry. |
| Zero visible Safari picker jump | macOS PASS / iOS PENDING | Product-owner macOS acceptance plus pending iPhone/iOS hardware acceptance | Do not infer iPhone/iOS from the macOS result. |
| One document scroll / top-aligned columns | DONE | `styles/song-workspace.css` editor grid | Right panel is not sticky. |
| Performance Mode / auto-scroll | RESOLVED | `AUTO_SCROLL` core helpers, performance dialog/app loop, core/interaction tests, browser speed measurements | BPM-linked bounded base, 48px/s fallback, retained 0.5×–2.0× preference, time/subpixel-safe scrolling. |
| Song Workspace button design system | RESOLVED | workspace markup/app/CSS, shared theme tokens, interaction/style tests, 1280/1024/375 light/dark acceptance | Primary, secondary, danger, icon, segmented, toggle, subtle, menu, modal, and performance controls aligned. |
| JTH JSON / TXT / Print / backup | DONE | app export/backup functions | Local exports. |
| English and zh-TW UI | DONE | locale JSON + i18n scripts | User content not translated. |
| Song content server storage | N/A | No workspace network calls | Explicitly outside V1. |
| Share Arrangement | NOT IMPLEMENTED | No share schema/route/API | Future-only boundary. |
| Public searchable song library | N/A | Product boundary | Must not be built without new review. |
| Copyright/user-content release copy | PENDING RELEASE | Confirmed gate | Exact copy needs policy review. |
| Analytics/error payload privacy audit | PENDING RELEASE | Confirmed gate | Must prove no content payload. |
| Anti-abuse review | PENDING RELEASE | Confirmed gate | Cloudflare/CDN/API/WAF/rate limits. |
| macOS Safari shape-picker zero-jump acceptance | PASS | Product-owner manual acceptance | No visible jump reported. |
| iPhone/iOS hardware acceptance | PENDING RELEASE | No iPhone/iOS evidence | Required before production. |
| Browser E2E suite | NOT IMPLEMENTED | No Playwright/Cypress config | Static/unit/CSS tests only. |
| CI running unit tests | NOT IMPLEMENTED | `.github/workflows/ci.yml` | CI currently omits `npm test`. |
| V1 production release | NOT IMPLEMENTED | Feature branch only | No PR/merge/deploy/tag in this handoff. |
| `v1.1.0` Song Workspace release | PROPOSED | Conversation decision | Semantic release plan not executed. |
| Origin URL normalization | OPEN | Current `git remote -v` | Confirm canonical owner before changing. |

## 36. Proposed / Future Work

Bounded future work, clearly outside current implementation:

- **PROPOSED**: Share Arrangement with an independent lyrics-free schema, server allowlist, unlisted/noindex defaults, expiry/revoke, and legal review.
- **PROPOSED**: client-side fragment sharing if payload/security/usability analysis supports it.
- **PROPOSED**: semantic version plan where current production baseline is `v1.0.0` and Song Workspace ships as `v1.1.0`; verify actual tags before adoption.
- **RESOLVED**: exactly three primary Create Song methods; ChordPro and Jam Tracks Hub JSON are grouped under Other Import Options.
- **RESOLVED**: Create/ChordPro X, Cancel, and Escape bypass submit validation while real commit actions retain it.
- **RESOLVED**: BPM-linked, bounded, refresh-rate-independent Performance Auto Scroll with a retained user multiplier.
- **RESOLVED**: Song Workspace button semantics and interaction states aligned with shared Jam Tracks Hub theme tokens.
- **PENDING RELEASE**: add/review local-only and user-rights copy.
- **PENDING RELEASE**: add `npm test` to remote CI after confirming runtime expectations.
- **RESOLVED**: single-row annotation fitting, rendering, regressions, and Chromium responsive acceptance completed on 2026-08-27.
- **RESOLVED**: bounded Shape Picker close/focus/instant-restore implementation and responsive in-app browser acceptance.
- **PASS**: macOS Safari user acceptance found no visible Shape Picker movement.
- **PENDING RELEASE**: prove zero visible Shape Picker movement and complete the browser checklist on iPhone/iOS hardware.

Do not start V2, account/cloud sync, server storage, public discovery, or sharing merely because they are listed here.

## 37. Release Management

Song Workspace V1 is not released. The expected sequence, only after explicit user direction, is:

```text
final acceptance
-> PR from feat/song-workspace-v1
-> remote CI/review
-> merge main
-> production deployment
-> production smoke test
-> final release gates
-> tag / GitHub Release / release notes if adopted
```

Never automatically create the PR, merge, push `main`, deploy, tag, or release. Fetch and inspect current `main` first because scheduled Umami automation may advance it. Resolve conflicts without losing the README analytics block/image and its latest timestamp.

## 38. Production Release Gates

All categories require explicit review before release:

**Product**

- Single chord-row invariant passes all modes and responsive layouts.
- Safari shape selection has zero visible jump.
- ChordPro / JTH JSON hierarchy is implemented and regression-tested.
- Create/import cancellation bypasses validation while actual submissions remain validated.
- BPM-linked auto-scroll and user multiplier pass monotonic, pause/resume, end-stop, and responsive checks.
- Button semantics pass light/dark, keyboard focus, reduced-motion, and responsive review.
- No known critical Song Workspace regressions.

**Browser and accessibility**

- macOS Safari and iPhone/iOS acceptance; the macOS zero-jump check passes, while iPhone/iOS remains pending.
- Chromium desktop, tablet, and mobile smoke.
- Keyboard/focus/Escape paths, touch scrolling, light/dark, en/zh-TW.

**Privacy and copyright**

- Prove lyrics and raw song content remain local.
- Audit analytics and error logs for content-free payloads.
- Approve local-storage, rights-to-import, and export wording.
- Confirm no 91PU or third-party copyrighted content acquisition/fixtures.

**Security and abuse**

- Review cache strategy, request limits, rate limiting, WAF/bot rules, API size limits, and abuse logging.
- Verify tracked Cloudflare bindings/configuration and protect administrative exports.

**Engineering**

- `npm test`, `npm run check`, `npm run build:cloudflare`, and `git diff --check` pass.
- Remote CI includes the intended checks and passes.
- Manual editor/import/modes/capo/shapes/performance/export/backup regression passes.

**Release**

- Explicitly approved PR, merge, deployment, smoke, tag, release notes, and GitHub Release steps.

## 39. Git / Codex Working Rules

- Repository truth and newest user instruction outrank stale prompt SHAs.
- Never discard unknown user changes.
- Preserve the two approved untracked files in section 4.
- Stop and report any other unexpected modified/untracked path.
- Do not use `git add .`; stage only explicit task files.
- Do not use reset/clean/restore/stash/force-push to make the tree look clean.
- Validate before committing; commit and push the feature/integration branch when explicitly requested.
- Do not merge or push `main`, deploy production, tag, or release without explicit direction.
- Keep unrelated README/analytics automation changes out of feature commits.
- For weekly-track work, reread the external `update-jam-tracks-hub` skill and never let that workflow modify README/Website Analytics.
- When requirements change during a phase, the user prefers one complete updated instruction set rather than a small addendum that depends on an old prompt.
- Use synthetic/public-domain-safe fixtures and never commit credentials, cookies, `.env` values, or copyrighted commercial lyrics/charts.

## 40. Resume Protocol

A new Codex session must begin in this order:

1. Read `docs/SONG_WORKSPACE_V1_HANDOFF.md` completely.
2. Search for and read every current `AGENTS.md`, `SKILL.md`, `.codex/`, `.agents/`, `CLAUDE.md`, `CONTRIBUTING.md`, and relevant workflow file. Do not assume this inventory is still complete.
3. Read `README.md`, `docs/song-workspace.md`, `docs/GITHUB_WORKFLOW.md`, and any newly tracked architecture/release/privacy documentation.
4. If publishing a weekly track, read `/Users/jasperhsu/.codex/skills/update-jam-tracks-hub/SKILL.md` first.
5. Run `pwd`, `git branch --show-current`, `git status --short`, `git remote -v`, and `git log --oneline --decorate -20`.
6. Compare actual HEAD/branch with this snapshot. Never reset to the handoff SHA.
7. Confirm the approved untracked files remain untouched and inspect any new worktree changes before proceeding.
8. Inspect the files and tests tied to the selected open issue.
9. Run baseline `npm test`, `npm run check`, `npm run build:cloudflare`, and `git diff --check` when appropriate.
10. Only then modify production code, and only for the explicitly requested bounded task.

Highest-priority remaining release work includes iPhone/iOS hardware acceptance, copyright/local-only UI wording, analytics/error-log no-lyrics-egress proof, anti-abuse review, remote/CI/PR coordination, and explicit production approval. The Create Song / Other Import hierarchy, cancellation-vs-validation contract, BPM-linked Performance Auto Scroll, button design-system hardening, one-row chord-annotation contract, Shape Picker code fix, and macOS Safari zero-jump user acceptance are resolved. Do not begin a remaining gate without an explicit bounded request.
