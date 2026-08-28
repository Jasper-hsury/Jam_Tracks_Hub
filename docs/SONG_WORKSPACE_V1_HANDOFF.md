# Jam Tracks Hub — Song Workspace V1 Handoff

Snapshot date: 2026-08-28 (Asia/Taipei)

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

Repository truth before the Final Reading UX Polish round:

```text
Branch: feat/song-workspace-v1
HEAD: 1b13d625dcc04975e5f9d7f70ef1471e055e78c4
origin/feat/song-workspace-v1: 1b13d625dcc04975e5f9d7f70ef1471e055e78c4
main: 9b5ed9b
origin/main: 9b5ed9b
Feature branch vs origin/main: verify with Git before release work
Origin fetch/push: git@github.com:Passerby-WB/Jam_Tracks_Hub.git
```

The product history reports that GitHub has advertised a newer location, `git@github.com:Jasper-hsury/Jam_Tracks_Hub.git`. The current remote still uses the old URL, so remote URL normalization is **PENDING**. Do not change the remote during unrelated work; confirm the canonical owner and URL first.

Before the current bounded round, there were no tracked modifications and only the two approved untracked exceptions in section 4. There were no uncommitted Song Workspace production changes. A separate Cloudflare-only feasibility checkpoint exists on `feat/cloudflare-key-finder-container-feasibility` at `a955f2d9`; it is not merged or cherry-picked into this product branch.

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

Song Workspace starts through a `DOMContentLoaded` handler in `scripts/song-workspace.js`. The core, storage, and single-song import modules expose browser globals and CommonJS exports so Node's built-in test runner can test them without a browser bundle.

Other architecture areas:

- `worker.js` and `functions/api/`: Cloudflare routing, subscribe, CSV, and feedback APIs. Song Workspace does not use them for song content.
- `api-server/`: FastAPI key-analysis helper/backend; unrelated to local Song Workspace persistence.
- `locales/en/common.json` and `locales/zh-TW/common.json`: tracked translations.
- `tests/`: Node tests for core, storage fallback/preferences, chord shapes, and CSS contracts.
- `tools/scripts/build-cloudflare.js`: prepares static `dist/`, skipping oversized PDF assets.
- `data/`: shared site/track data; chord-shape generation is code-driven in `scripts/chord-shapes.js`.

Known documentation drift: the README page table does not list `song-workspace.html`. The prior `docs/song-workspace.md` statement that diagrams were not embedded has been corrected; do not silently trust future prose over source code.

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
- `song-workspace.html` tells users that song content stays in the current browser, is not uploaded to Jam Tracks Hub, and can be lost if browser/site data is cleared.
- `scripts/song-workspace.js` and `scripts/song-workspace-storage.js` contain no `fetch`, `sendBeacon`, XHR, WebSocket, FormData, POST, or Worker API path for song content.

V1 has no user-song database, account requirement, or cloud synchronization. Analytics and error reporting must never receive lyrics, raw pasted content, raw ChordPro, Song JSON, or user notes. Any future telemetry must be event-only (for example `song_workspace_opened`, `transpose_used`, or `capo_used`) with content-free metadata.

The 2026-08-27 disclosure audit traced Create, ChordPro, JTH JSON, autosave, backup, restore, and export data through in-memory parsing, browser File APIs, IndexedDB/localStorage, and local Blob/Object URL downloads. The bounded analytics/error-log follow-up is now **RESOLVED**:

- repository-wide inventory found Umami as the only browser analytics service and found no Sentry, LogRocket, PostHog, Mixpanel, Segment, remote console collector, global error forwarder, or custom Song Workspace event tracking;
- Umami's tracker automatically collects URL, fixed page title, and referrer and observes `history.replaceState`, so it was removed from `song-workspace.html` only; other site pages retain ordinary Umami analytics;
- Song Workspace now has no third-party executable script and therefore no session replay or DOM-capture path. The Google Fonts stylesheet remains presentation-only, and the page sets `no-referrer`;
- the localized browser title remains fixed. Imported JTH JSON and backup songs receive new internal opaque IDs before storage/navigation, and unsafe URL IDs are discarded;
- production parser/import errors are generic and contain no raw Song Document, ChordPro, lyrics, or metadata; Song Workspace modules have no console or remote error forwarding;
- `tests/song-workspace-observability.test.js` exercises synthetic canaries across analytics, title, URL, imported IDs, parser errors, console/telemetry primitives, and transport boundaries;
- in-app browser canary acceptance covered Create with lyrics, Lyrics Only, ChordPro, JTH JSON with an arbitrary imported ID, metadata edits, transpose, Smart Capo, Roman/Nashville, Performance Mode, and JSON export. Requests observed by the local server were static GETs only; no canary appeared in a request URL and the console remained empty.

Shared i18n code still fetches fixed locale JSON files, and shared site code still contains an inactive homepage-subscribe handler. Neither receives song content. This proof supports the bounded statement that **Song Workspace song content** is not uploaded; it does not claim that the rest of Jam Tracks Hub collects no analytics or operational data.

## 10. 91PU Boundary

Confirmed boundary: 91PU may be used only for competitor/reference research. Jam Tracks Hub must not collect 91PU credentials, cookies, or sessions; perform authenticated scraping; scrape or mirror full lyrics/charts; bypass paid features; or use 91PU as a content source.

Tests and examples must use synthetic, invented, or public-domain-safe text. Never commit complete third-party commercial lyrics or charts as fixtures.

## 11. Song Document Schema

Canonical schema source: `scripts/song-workspace-core.js`.

```text
Song
  schema: "jamtrackshub-song"
  version: 2
  id
  title
  artist
  originalKey
  targetKey
  chordSpelling: "theory" | "preserve"
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
  anchorPosition
```

`shapeKey` is derived by `songForCapo`, not persisted in the Song Document. Chord spelling is a song-level presentation policy because it controls every derived chord/key label after reload. Selected voicings, mode, chord-hint setting, and performance preferences remain lightweight preferences rather than persisted chord copies.

Validation requires matching schema/version, direct non-negative integer `anchorPosition` values, and bounded source/song/section/line sizes. Version 2 intentionally rejects the pre-release version-1 character-offset schema; it does not preserve an `anchor` compatibility field or build a dual-model migration layer.

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

The IndexedDB database version remains 1 because the object-store structure did not change. On load, the app validates each record against Song Document V2 and safely skips older incompatible pre-release records without showing a development-format warning. The records are neither deleted nor silently rewritten into a compatibility schema.

`scripts/song-workspace.js:681-701` debounces autosave by 500 ms and flushes on visibility change. Backup/restore is the portability mechanism; clearing browser/site data can remove local songs. Storage tests currently cover unavailable IndexedDB and preference helpers, but do not run full CRUD against a fake/real IndexedDB implementation.

## 13. Import Formats

Current supported creation/import paths:

- **Chords + Lyrics**: conservative parsing of chord lines followed by lyric lines, headings, and chord-only lines (`parseChordLyrics`, `scripts/song-workspace-core.js:428`).
- **Lyrics Only**: creates editable lyric content without inferred chords.
- **Chords Only**: creates chord-only progression/chart content.
- **Add Instrumental Section**: inserts 1–64 chord-only bars (default 4) at the selected editor boundary, using the same `instrumental` line model as Chords Only. The optional localized section name defaults to `Instrumental` / `純和弦段落`; user-entered section names are never translated.
- **ChordPro**: common metadata, inline chord anchors, and common section directives (`parseChordPro`, line 500).
- **JTH JSON import**: accepts one canonical Song Document V2; app-side input is limited to 1 MB. The canonical deserializer validates the source, direct meaningful positions, and spelling policy; `prepareImportedSong` replaces the exported ID/timestamps with fresh local values, and `scripts/song-workspace-import.js` writes the result to IndexedDB before returning the updated collection and opening the song.
- **Backup restore**: validates `jamtrackshub-song-backup` version 1 and a maximum of 500 songs.

Parsers are intentionally conservative and bounded. Ambiguous text should remain editable rather than being aggressively guessed. Imported user content must not be auto-translated or sent to a server.

## 14. JSON vs ChordPro

**Jam Tracks Hub single-song JSON (`.jth.json`)** is one complete canonical Song Document. Export preserves project metadata, sections, lyric text, chord anchors, and timestamps; import intentionally regenerates the top-level song ID and timestamps before local persistence/navigation. **Backup All / Restore Backup** uses the separate `jamtrackshub-song-backup` envelope and must not be sent through the single-song import path.

**ChordPro (`.cho`)** is an interchange text format such as `[G]lyric [D]lyric`. It can represent useful metadata and inline anchors but is not guaranteed to preserve every JTH-specific identity or preference.

Do not treat ChordPro as the complete backup format. The confirmed information-architecture change is **RESOLVED** on 2026-08-27: `song-workspace.html` keeps exactly three primary create cards, while the secondary Other Import Options area contains ChordPro—with `[G]lyrics [D]lyrics` guidance and optional help—and Jam Tracks Hub JSON. `tests/song-workspace-import-ia.test.js` covers hierarchy, handler wiring, localization, responsive contracts, synthetic ChordPro, valid/invalid JTH validation, ID regeneration, collection insertion, and persistence orchestration.

## 15. Lyric / Chord Anchor Model

Status: **MEANINGFUL POSITION MODEL RESOLVED**. Song Document V2 stores a direct zero-based `anchorPosition`, never a character offset or translated compatibility value.

- Chinese: each CJK character is one meaningful position; standalone punctuation and whitespace are not positions.
- English: each complete whitespace-separated unit is one position. Multiple spaces/tabs are separators only; `don't`, `burning-room`, and punctuation attached to a word remain one unit.
- Mixed text composes those rules, so `你好 slow dancing` has four positions.
- Lyric lines have no separate Start position. `This is the deep and dying breath of` has exactly eight positions, and index 5 is `dying`.
- Sub-word English anchoring is intentionally unsupported unless the user inserts whitespace, for example `burn ing`.
- Instrumental/chord-only lines retain their own ordered position semantics without reintroducing lyric character offsets.

`tokenizeLyric` produces runtime presentation tokens with position indexes; only `anchorPosition` persists. `layoutLyricLine` resolves that index directly to the meaningful runtime unit while preserving the original lyric string. Chord Change Hints bold the entire selected position, and the annotation label's left edge aligns to its first visible character. ChordPro and pasted-chart parsers convert their source marker/column locations directly into meaningful positions before creating canonical chords. JSON and IndexedDB round-trip `anchorPosition` without a legacy field.

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

The editor renders lyric insertion boundaries with a low-visual-weight `+ Add` control. Instrumental grids keep one full-width contextual `+ Add` control after the current bars so Add Bar appends in musical order without becoming an extra grid cell. The menu offers Add Line or contextual Add Bar, Add Section, and Add Instrumental Section. It prefers the trigger's right side, vertically centered, and falls back within the viewport; outside click, Escape, and selection dismiss it.

- `insertLine` (`scripts/song-workspace-core.js:263`) inserts at beginning, middle, or end while retaining all existing IDs and anchors.
- `insertSectionAtBoundary` (line 274) inserts relative to the selected boundary. At a boundary inside a section, trailing lines move into the new section; existing line/chord IDs remain stable.
- `insertInstrumentalSectionAtBoundary` inserts a bounded section of 1–64 existing chord-only `instrumental` lines at the selected boundary. Beginning/end boundaries retain surrounding section IDs; an internal boundary creates a continuation section while retaining every existing line/chord ID and the original source-section ID.
- `deleteLine` removes only the selected line and its text/chords. Sibling line/section IDs remain stable, the Edit Line dialog closes, and autosave persists the result. Sections are allowed to contain zero lines, so deleting the final line preserves the empty section and its insertion control.
- Edit Line has no Move button. Existing lyric chords are repositioned through Edit → meaningful Position → Update Chord → Save. Instrumental bars reuse the dialog in a chord-only mode that hides lyric text, lyric-token preview, and anchor-position controls; new chords append in progression order, while Edit/Delete remain available.
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

### Chord Spelling

Status: **RESOLVED**. Canonical pitch arithmetic remains pitch-class based, while every derived chord/key label uses the song's `chordSpelling` policy:

- **Music Theory / 依樂理** uses a bounded common-key policy and normalizes pre-release `Dbm` context to conventional `C#m`. The key selectors expose both useful sharp/flat major spellings and the agreed common minor spellings, including `C#m`.
- **Preserve Input / 依使用者輸入** retains canonical input labels when the song remains in its entered key. An explicitly selected `C#` or `Db` target controls new transposed labels.
- Slash roots and bass notes are spelled independently through the same context. `C#/G#` and `Db/Ab` share pitch/voicing identity; no duplicate shape database or per-chord sharp/flat copies exist.
- Roman/Nashville analysis still derives harmonic degree from pitch class and effective shape key; spelling selection does not alter numeral semantics.

## 19. Smart Capo

`smartCapo` (`scripts/song-workspace-core.js:631`) evaluates capo positions 0 through 11, derives the corresponding shape key/song, and scores chord difficulty. Open/common shapes receive lower cost; accidentals, slash bass, complex suffixes, and less guitar-friendly shapes add cost. Candidates are sorted by score and then capo; the app requests the top three (`scripts/song-workspace.js:895`).

The recommendation is derived; applying one changes capo/shape view, not canonical chord identity. Degree modes must continue to use the resulting shape key. The algorithm is heuristic, not a guarantee of the best voicing for every player or tuning.

## 20. Chord Shapes / Shared Data

Shared source: `scripts/chord-shapes.js`. It parses supported chord families, creates/caches voicings, ensures slash bass is the lowest sounding note, and builds presentation-neutral diagram models.

Consumers:

- Chord Dictionary (`scripts/chord-dictionary.js`)
- Chord Progressions (`scripts/chords.js`)
- Song Workspace (`scripts/song-workspace.js`)

Song Workspace cards show chord name, diagram, and Choose Another Shape. The picker reuses Write Your Own Progression's `progression-writer-shape-picker-*` dialog/header/summary/grid/card classes, `dictionary-position-filter`, and the shared `renderProgressionDiagram` renderer. It exposes fixed Available guitar shapes help, a result count, real Position and Root string filters backed by `nearestPositionTarget` / `voicingHasRootOnString`, localized shape metadata, Use Shape actions, and a text Close control. Selection is persisted per song as a presentation preference and updates only the inline diagram. Avoid duplicating separate shape datasets/rendering semantics or exposing ranking/debug metadata in the primary inline card.

The tested regression set includes C, Am7, Fadd9, G/B, C#m7b5, Bbmaj9, A7(b13), and F#sus4. Shape availability is broad but not mathematically exhaustive for every possible chord symbol.

## 21. Interval Colors

Song Workspace reuses the Chord Dictionary interval variables and presentation rules from `styles/chord-dictionary.css`, including root, third, fifth, seventh, and extension families. `scripts/chord-shapes.js` supplies interval-family metadata rather than page-specific colors.

`tests/song-workspace-style.test.js` asserts that workspace CSS does not redefine the shared chord-diagram color tokens. Light and dark theme overrides remain centralized in Chord Dictionary styles. The root marker, especially in light mode, must remain readable and visually identical across the three chord-diagram consumers.

## 22. Modal / Scroll Behavior

Status: **SHARED BACKGROUND LOCK RESOLVED**. Shape Picker, all four Create/Import modes, Edit Line, Add Section, and Add Instrumental Section reuse one fixed-body dialog background utility in `scripts/song-workspace.js`. It captures exact scroll X/Y once, measures scrollbar compensation, leaves the active dialog internally scrollable, restores focus with `preventScroll` where applicable, and performs one instant scroll restoration on every close/success path.

The Chord Shape Picker is a native dialog. Current implementation:

- captures exact scroll X/Y;
- dynamically measures scrollbar width and compensates body padding;
- fixes/locks the background body;
- allows internal dialog scrolling with a bounded max height;
- supports iOS momentum and overscroll containment in CSS;
- routes the text Close control, Escape/native dialog cancel, and voicing selection through one guarded `closeShapePicker` path;
- updates only the selected card's diagram while the background remains locked instead of rebuilding the card subtree;
- restores focus to the originating Choose Another Shape button, using `preventScroll` where supported, while the body is still fixed;
- restores body styles and the captured page position exactly once, with smooth scrolling temporarily disabled and no animation-frame or timeout retry.

The main Song Chart and Chord Shapes columns are normal document-flow columns, top-aligned, without a sticky right panel or independent vertical scrollbar. Performance Mode is intentionally its own dialog/scroll context.

The shared Chords + Lyrics, Lyrics Only, Chords Only, and ChordPro dialog uses `workspace-create-dialog`. Its outer container remains `overflow: auto`, while `scrollbar-width: none`, `-ms-overflow-style: none`, and a zero-size `::-webkit-scrollbar` hide the visible native scrollbar without clipping content. Responsive browser acceptance at 375 CSS pixels confirmed `scrollHeight > clientHeight`, computed `scrollbar-width: none`, and keyboard focus moving `scrollTop` to the footer actions.

Create/Import now locks the document before `showModal()`. X, Cancel, Escape, successful Create, and successful ChordPro import all unlock through the shared close/restore contract; native required validation still runs only for the real commit action. Edit Line Save/Delete and Add Section/Add Instrumental Section success use the same utility without changing the Shape Picker's focus-before-unlock or zero-jump guarantees.

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

The Download menu now provides one non-blocking, screen-reader-readable reminder that exported JSON, ChordPro, TXT, and Print/PDF output may contain lyrics or other user-entered content and should be used or shared only where the user has the necessary rights or legal permission. No export format was removed and no repetitive confirmation modal was added.

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

Copyright/local-first disclosure acceptance on 2026-08-27 covered the home/create area, all four Create/ChordPro modal modes, both import cards, Download menu, local-save/reload state, and the existing Privacy page at 1280×720, 1024×768, and 375×812 in light/dark and en/zh-TW. Notices wrapped without horizontal page overflow; the 375px main notice remained compact, the modal retained internal scrolling and accessible descriptions, and all four export formats remained present. The Song Workspace console remained empty. The Privacy page retained two pre-existing GSAP “target not found” warnings from shared animation code; this disclosure change introduced no new console warning or error.

## 27. Privacy / Copyright Boundary

Product position: Jam Tracks Hub is a tool provider, not a copyrighted lyrics library.

Users are responsible for ensuring they have the rights or legal permission necessary for material they import, use, export, or share. User-facing wording is **RESOLVED** on 2026-08-27 and now covers:

```text
Song Workspace song content is stored locally in the current browser and is not uploaded to Jam Tracks Hub.
Only import content the user has the right or legal permission to use.
Clearing browser/site data may remove local songs.
Exports may contain lyrics or other user-entered content and require the same rights/legal-permission care.
```

The copy deliberately does not promise that local processing makes content use legal, that copyright does not apply, or that all liability belongs to the user. It distinguishes browser-local Song Workspace content from general site analytics/operations and makes no claim about an unimplemented Share Arrangement. The implementation must continue to keep lyrics local and must not place third-party commercial lyrics/charts in fixtures, analytics, error logs, documentation examples, or the repository.

The existing `privacy-policy.html` architecture now includes localized Song Workspace/local-storage and User-provided content/copyright sections alongside the existing Key Finder disclosures. The home/create note links directly to that section. The subsequent analytics and error-logging no-song-content-egress audit is resolved as recorded in section 9; general site analytics and operational-data disclosures remain distinct.

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

Current Final Reading UX repository baseline on 2026-08-28:

```text
npm test: PASS, 118/118
npm run check: PASS
npm run build:cloudflare: PASS
git diff --check: PASS
```

Test files:

- `tests/song-workspace-core.test.js`
- `tests/song-workspace-disclosure.test.js`
- `tests/song-workspace-import-ia.test.js`
- `tests/song-workspace-interaction.test.js`
- `tests/song-workspace-picker-modal.test.js`
- `tests/song-workspace-scroll.test.js`
- `tests/song-workspace-reading-ux.test.js`
- `tests/song-workspace-storage.test.js`
- `tests/song-workspace-style.test.js`
- `tests/chord-shapes.test.js`

Important limitation: `.github/workflows/ci.yml` runs `npm run check` and `npm run build:cloudflare`, but not `npm test`. There is no Playwright/Cypress/browser E2E suite. The former multi-row packing expectation has been replaced by single-row geometry, Roman collision, canonical immutability, and production-architecture regressions.

In-app Chromium acceptance for this round also passed with synthetic-only content. At 1280×720, 1024×768, and 375×812, Create/Import and Edit Line kept the page background fixed while their own content remained reachable, then restored focus and the captured scroll position without a final delta. Music Theory and Preserve Input covered `C#m`, an explicit `Db` target, derived shapes, all five display modes, and reload persistence; every annotation stayed on one row. The exact eight-position English example anchored the complete word `dying`, Delete Line removed only the middle line and survived reload, and ChordPro/JTH JSON imports preserved direct V2 positions. English/zh-TW, both themes, mobile wrapping, and horizontal overflow checks passed with 0 new console warnings and 0 new console errors. This is browser smoke evidence, not the still-pending iPhone/iOS hardware acceptance.

Instrumental Section browser acceptance on 2026-08-27 passed at 1280×800, 1024×768, and 375×812 in English/zh-TW and light/dark themes. A synthetic Verse → Instrumental → Chorus workflow confirmed exact boundary insertion, the localized optional-name/default-4-bar modal, fixed-body lock, chord-only Edit Bar UI with no lyric/anchor/Move controls, multiple chord editing, contextual Add Bar, direct existing lyric-chord repositioning, Original/Balanced/Beginner/Roman/Nashville, transpose, Smart Capo, Chord Shapes, Performance Mode, four-format Download menu, autosave, and reload persistence. The local server observed only static GET/304 requests, while browser console inspection reported 0 new warnings and 0 new errors. Delete Bar/Delete Section behavior is covered by core/interaction regressions; the browser smoke verified the correctly localized destructive controls without deleting the synthetic browser fixture.

Final layout/legal browser acceptance on 2026-08-27 reused only synthetic local content. A persisted 12-bar section rendered as 8+4 at 1280×800 and 1024×768 because its content container exceeded 760 px, and as 4+4+4 at 375×812; every viewport had zero page-level horizontal overflow, chord content remained above sequential localized Bar labels, and empty cells displayed `—`. Roman and Nashville retained the grid, Performance Mode used the same 4-column mobile layout, contextual Add Bar and Edit/Cancel remained usable, and autosave visibly changed Saving → saved in the sole Hero live region. `legal.html` passed English ↔ zh-TW switching, light/dark, semantic headings, one generated skip link, footer navigation, and zero horizontal overflow at all three viewport widths. A bounded shared i18n fix prevents an empty English preload object from leaving zh-TW text behind when switching back to English. Both inspected pages reported 0 new console warnings and 0 new console errors; the local server observed static GET/304 requests only.

Final Reading UX browser acceptance on 2026-08-28 used only synthetic English, Chinese, mixed, long-chord, multiple-chord, and empty-bar content. At 100%, computed desktop typography measured lyric 19 px, annotation 16.5 px, instrumental 17 px, heading 22 px, and 1.75 lyric line height; 375 px measured 17/15.5/16/20 px. Values 50, 75, 100, 110, 120, and 150 all reflowed with zero page/card overflow; 1 and 1000 clamped to 50/150, empty/non-numeric restored 120, ± moved 100→110→100, and both limits disabled their corresponding button. Reload retained 120, while Performance opened at the same 120 and its A+ control updated both charts to 130. The 16-bar section rendered eight columns at 1280/1024 and four at 375 in English/zh-TW and light/dark; every long card remained bounded. All five chart modes retained exactly one annotation layer per lyric track, browser geometry measured 0 px anchor-left delta for the English, Chinese, and mixed fixtures, and Shape Picker close retained its captured scroll position with 0 px final delta. Console inspection reported zero warnings/errors and the local server observed fixed static/locale GETs only. The in-app automation surface is Chromium, so this is not new physical Safari/iPhone evidence; WebKit-facing native-number-input, focus/blur, custom-property, container-query, and `-webkit-appearance` paths were reviewed, existing macOS Safari Shape Picker acceptance remains PASS, and iPhone/iOS remains PENDING RELEASE.

## 32. Recent Relevant Commits

| SHA | Message | Purpose |
| --- | --- | --- |
| `868aa90` | `fix: refine song anchors and chord spelling` | Shares fixed-body modal locking, adds theory/preserve spelling, adds Delete Line, and replaces character offsets with direct Song Document V2 meaningful positions. |
| `cbfc956` | `fix: polish song workspace picker and restore json import` | Aligns the picker with Write Your Own Progression, hides Create/Import dialog scrollbars without disabling scrolling, and hardens/test-drives canonical single-song JSON persistence. |
| `85f6d72` | `fix: prevent song content from entering analytics and logs` | Isolates Song Workspace from analytics/error side channels and adds content-free title/URL/error/transport regressions. |
| `4460aa2` | `fix: clarify local song content and copyright boundaries` | Adds accurate browser-local, import-rights, export-content, persistence-risk, and user-content wording across Song Workspace and the existing Privacy page. |
| `08472d0` | `fix: refine song workspace interaction and performance controls` | Makes create/import cancellation independent of validation, links auto-scroll base speed to BPM while retaining the user multiplier, and aligns all workspace button semantics with shared site tokens. |
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
- Device-wide/permanent-storage wording overstating browser-local persistence.
- Copyright copy implying that local processing alone makes a use lawful or advertising unimplemented sharing/cloud features.
- Create/Import dialogs opening without the Shape Picker's fixed-body background lock.
- C-sharp minor being unavailable in key selectors or rendered as `Dbm` by a single pitch-label table.
- Edit Line exposing one button per English character plus a separate Start position.
- Line deletion rebuilding sibling IDs, removing a section, or failing to persist.
- Mixing version-1 character offsets with version-2 meaningful positions.

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

### Issue F — local-first and user-content boundaries are not sufficiently disclosed

Status: **RESOLVED** on 2026-08-27. A production-code audit found no Song Workspace content transport and traced song content through browser-local parsing, IndexedDB/localStorage, File APIs, and local export Blob URLs. The home/create area, mode-specific Create/ChordPro dialog, JTH JSON card, local-storage warning, and Download menu now provide short English/zh-TW wording. `privacy-policy.html` extends the existing legal-information architecture with Song Workspace storage and bounded user-provided-content/copyright sections. The copy neither equates local storage with legality nor advertises cloud sync, server backup, public sharing, or Share Arrangement. `tests/song-workspace-disclosure.test.js` covers locations, localization, export preservation, false-feature copy, policy wiring, and transport primitives.

### Issue G — Song Workspace picker diverges from Write Your Own Progression

Status: **RESOLVED** on 2026-08-27. Song Workspace now reuses the Progression Writer picker dialog/header/summary/filter/grid/card classes and shared card renderer. Available guitar shapes, result count, actual Position and Root string filters, shape/position metadata, Use Shape, and text Close are localized in English and zh-TW. The existing body-lock, guarded close, focus-before-unlock, single diagram replacement, and one-time scroll restoration pipeline remains intact.

### Issue H — Create/Import dialog shows a native vertical scrollbar

Status: **RESOLVED** on 2026-08-27. All four Create/ChordPro modes share `workspace-create-dialog`. Cross-browser scrollbar-hiding rules apply only to that scroll container; `overflow: auto`, keyboard scrolling, footer reachability, and bounded viewport height remain. Browser acceptance covered 1280, 1024, and 375 CSS pixels in light/dark themes with no horizontal overflow.

### Issue I — JTH single-song JSON import appears to fail

Status: **RESOLVED** on 2026-08-27. The exact starting-SHA button → hidden input → file-change → parse → validate → ID regeneration → IndexedDB → editor path succeeded under synthetic browser reproduction, so no deterministic wiring failure was reproducible. The investigation did find that the route was coupled to a private callback, bypassed the canonical string deserializer, allowed a storage-unavailable session-only result, and surfaced non-localized schema errors. The hardened path now reads text locally, uses `prepareImportedSong`, regenerates the opaque ID/timestamps, persists through the testable `song-workspace-import.js` service, updates the collection, opens the song, and maps all invalid/empty/wrong-schema content to a generic localized message. Automated tests cover collection growth, persistence, ID regeneration, URL safety, and bounded errors; browser acceptance confirmed collection 6→7, auto-open, reload persistence, and no raw invalid-file canary in the UI.

### Issue J — Create/Import background document can scroll

Status: **RESOLVED** on 2026-08-27. Root cause was that Create/Import called `showModal()` directly while only Shape Picker used the fixed-body lock. One shared utility now owns scroll capture, scrollbar compensation, fixed-body styles, focus restoration, and one instant restoration for Shape Picker, all four Create/Import modes, Edit Line, Add Section, and Add Instrumental Section. The dialog's internal `overflow: auto` and hidden visible scrollbar remain intact.

### Issue K — enharmonic labels can turn C-sharp minor into D-flat minor

Status: **RESOLVED** on 2026-08-27. Root cause was a flat-oriented key-option list plus pitch-class-to-label output without a user-selectable spelling policy. Key selectors now include the bounded common major/minor spellings, and the song-level Music Theory / Preserve Input setting separates pitch arithmetic from display spelling. Theory maps the unsupported `Dbm` context to `C#m`; explicit C#/Db target context and slash bass spelling are tested.

### Issue L — Edit Line cannot delete one line

Status: **RESOLVED** on 2026-08-27. Delete Line is a danger action beside Cancel/Save. It removes only the selected line and its line-local chords/editor draft, retains sibling/section IDs, preserves an empty section, closes/unlocks the dialog, and enters the existing autosave path. Core JSON reload regression proves the deletion remains.

### Issue M — English anchors use character offsets and an extra Start

Status: **RESOLVED** on 2026-08-27 by Song Document V2. Canonical chords now contain only `anchorPosition`; English units split on whitespace, CJK characters are independent, standalone punctuation/whitespace do not create positions, and lyric lines have no separate Start. Runtime layout, hints, ChordPro, pasted chart, JSON, IndexedDB, exports, and Edit Line all use the same direct position semantics. Version-1 pre-release data is not given a permanent compatibility layer.

### Issue N — pre-release format warning appears in user-facing UI

Status: **RESOLVED** on 2026-08-27. IndexedDB loading still validates and skips unsupported Song Document records, but no longer shows the development-only incompatibility notice. No migration, rewrite, or automatic deletion was added, and the dead English/zh-TW warning keys were removed.

### Issue O — Edit Line exposes a redundant Move action

Status: **RESOLVED** on 2026-08-27. All anchor Move/移動 controls, handler fallback, and dead locale keys were removed. Existing lyric chords remain directly repositionable through Edit, meaningful-position selection, Update Chord, and Save Line.

### Issue P — no bounded way to add a chord-only section inside a song

Status: **RESOLVED** on 2026-08-27. `+ Add` now includes Add Instrumental Section / 新增純和弦段落. Its shared-lock modal accepts an optional localized-default section name and 1–64 bars (default 4). It creates the existing section plus `instrumental` line model, inserts at the selected boundary with stable existing line/chord IDs, and exposes contextual Add/Edit/Save/Delete Bar flows without lyric fields or lyric anchors. Existing autosave, JSON/ChordPro/TXT/Print, transpose, Easy, Roman/Nashville, capo, shapes, hints bypass, and Performance rendering paths are reused.

### Issue R — instrumental sections consume one full row per bar

Status: **RESOLVED** on 2026-08-27. Instrumental sections now use a content-container grid with exactly four columns in narrow/medium layouts and eight in wide layouts. Each cell keeps one or multiple ordered chords above its localized presentation-only Bar number, empty bars use a subtle em dash, and middle-bar deletion preserves all sibling IDs while numbering closes the gap. Editable, Performance, and Print/PDF rendering share the grid contract; all chord-derived modes continue using the same canonical lines.

### Issue S — duplicated autosave status and missing site-wide legal access

Status: **RESOLVED** on 2026-08-27. The fourth Hero promise badge is now the sole polite live region for neutral, saving, saved, and unavailable states; the editor-topbar status and its spacing were removed. Standard page footers receive one shared localized link to bookmarkable `legal.html`, which contains bounded English/zh-TW terms, Song Workspace storage, copyright/user-content, export, external-service privacy, and tool-limitation sections. The copy contains no blanket liability or local-means-legal guarantee. Human legal review remains recommended before commercial-scale release.
### Documentation and release issues

- README route table omits Song Workspace.
- CI omits `npm test`.
- Analytics/error-payload review and Copyright/local-only UI wording are resolved.
- Anti-abuse review and physical Safari/iOS acceptance are pending release.
- Origin URL normalization is pending confirmation.

## 35. Completed vs Pending Matrix

| Item | Status | Source / Evidence | Notes |
| --- | --- | --- | --- |
| Canonical Song Document v2 | RESOLVED | core schema/validation, parser/export tests | Direct meaningful `anchorPosition` plus song-level chord spelling; v1 offsets rejected. |
| Chords + Lyrics / Lyrics / Chords creation | DONE | `song-workspace.html:73-88`, app/core parsers | Current primary creation paths. |
| ChordPro import/export | DONE | `parseChordPro`, `toChordPro` | Functionality exists. |
| ChordPro / JTH JSON import hierarchy | RESOLVED | `song-workspace.html`, `styles/song-workspace.css`, locale files, `tests/song-workspace-import-ia.test.js` | Exactly three primary create methods; both existing-data formats are secondary imports. |
| JTH single-song JSON import | RESOLVED | `prepareImportedSong`, `scripts/song-workspace-import.js`, app handler, import tests, browser acceptance | Canonical validation, fresh opaque ID, IndexedDB write, collection refresh, auto-open, reload persistence, generic errors. |
| Create/import cancellation vs validation | RESOLVED | dialog markup, shared close/Escape handlers, `tests/song-workspace-interaction.test.js`, responsive browser acceptance | X, Cancel, and Escape bypass validation; only real Create/Import submits validate. |
| Create/Import visible scrollbar | RESOLVED | `workspace-create-dialog`, CSS contract test, responsive browser acceptance | Scrollbar hidden across Firefox/WebKit rules while overflow, keyboard scrolling, and footer reachability remain. |
| IndexedDB song persistence | DONE | `scripts/song-workspace-storage.js` | Browser-local only. |
| Preference persistence | DONE | storage/app preference helpers | Includes hints and selected voicings. |
| Autosave and reload / Hero status | RESOLVED | `setSaveState`, Hero promise badge, app persistence path, final-layout tests | One neutral/saving/saved/unavailable live region; former toolbar duplicate removed; 500 ms debounce plus visibility flush retained. |
| Meaningful Position Anchor Model | RESOLVED | `tokenizeLyric`, `layoutLyricLine`, core/interaction tests | Chinese character + whitespace-separated English unit; no lyric Start or character-offset compatibility. |
| Enharmonic Chord Spelling | RESOLVED | core spelling policy, key options, editor control, locale/interaction tests | Music Theory / Preserve Input, C#m regression, slash pitch identity, persisted per song. |
| Edit Line Delete Line | RESOLVED | `deleteLine`, danger control, core/interaction tests | Selected line only, stable siblings/section, empty section allowed, autosave/reload. |
| Old-format user notice removal | RESOLVED | `loadSongs`, locale cleanup, interaction regression | Unsupported records are skipped without warning, deletion, migration, or rewrite. |
| Edit Line Move controls removal | RESOLVED | line editor/app/locales, interaction regression | Edit → Position → Update remains the direct lyric-chord reposition path. |
| Instrumental / chord-only sections | RESOLVED | core insertion helper, app grid renderer/CSS, locales, core/interaction/final-layout/export tests | Optional name, bounded 1–64 bars, 4/8-column content-first grid, subtle empty cells, contextual Add/Edit/Delete Bar, stable IDs and existing derived/export paths. |
| Instrumental progression-style cards | RESOLVED | workspace renderer/CSS, Write Your Own Progression design audit, reading-UX tests, responsive browser acceptance | Small localized index plus larger chord hierarchy, shared visual language, multiple/long chords, empty bar, 4/8 grid, Performance and compact Print variants preserved. |
| Cmaj9 chord input hint and support | RESOLVED | localized placeholder, core/chord-shape/final-layout tests | Parser, transpose, Roman/Nashville, renderer, and voicing lookup remain valid. |
| Natural lyric spacing / separate chord layer | DONE | core renderer, `styles/song-workspace.css`, style tests | No chord-width spacing in lyrics. |
| Exactly one chord row per lyric line | RESOLVED | `fitSingleRowChordAnnotations`, `layoutChordTracks`, core/style regressions | No production row metadata or collision-to-next-row path remains. |
| No arrows/connectors | DONE | current renderer/styles | Preserve. |
| Chord Change Hints | DONE | app preferences/rendering | Presentation-only anchored emphasis. |
| Unified `+ Add` menu | DONE | app rendering/handlers, style/interaction tests | Add Line or contextual Add Bar, Add Section, and Add Instrumental Section. |
| Stable line/section insertion IDs | DONE | core insertion tests | Existing anchors preserved. |
| Roman/Nashville labels | DONE | `chordNumber`, core tests | Includes slash and non-diatonic roots. |
| Shape-key numeral semantics | DONE | `currentShapeSong`, `currentPlayShapeSong`, core tests | Degree identity survives transpose/capo. |
| Easy Balanced / Beginner | DONE | `simplifyChord`, core tests | Canonical song unchanged. |
| Smart Capo | DONE | `smartCapo`, app UI | Heuristic top-three recommendations. |
| Shared chord-shape data | DONE | `scripts/chord-shapes.js` | Used across three tools. |
| Shared interval colors | DONE | `styles/chord-dictionary.css`, style test | Light/dark centralized. |
| Inline Chord Shapes / picker | DONE | app render/picker code | Selection persists locally. |
| Picker parity with Write Your Own Progression | RESOLVED | shared picker classes/card renderer, real voicing filters, locale files, picker/modal tests | Header, count, filters, cards, Use Shape, text Close, responsive layout aligned. |
| Shared background modal scroll lock | RESOLVED | `lockDialogBackground`, `restoreDialogBackground`, scroll/interaction tests | Shape Picker, Create/Import, Edit Line, Add Section, and Add Instrumental Section share one capture/focus/instant-restore utility. |
| Shape Picker zero-jump code hardening | RESOLVED | `scripts/song-workspace.js`, `styles/song-workspace.css`, `tests/song-workspace-scroll.test.js` | Responsive in-app browser acceptance has zero final delta and stable geometry. |
| Zero visible Safari picker jump | macOS PASS / iOS PENDING | Product-owner macOS acceptance plus pending iPhone/iOS hardware acceptance | Do not infer iPhone/iOS from the macOS result. |
| One document scroll / top-aligned columns | DONE | `styles/song-workspace.css` editor grid | Right panel is not sticky. |
| Performance Mode / auto-scroll | RESOLVED | `AUTO_SCROLL` core helpers, performance dialog/app loop, core/interaction tests, browser speed measurements | BPM-linked bounded base, 48px/s fallback, retained 0.5×–2.0× preference, time/subpixel-safe scrolling. |
| Song Chart Zoom | RESOLVED | storage normalization, editor/performance controls, CSS reflow scale, reading-UX/storage tests, browser acceptance | One local-only 50–150% integer preference; ±10 and direct entry; invalid values bounded; Performance shares it; print/export stay independent. |
| Default lyric/chord readability | RESOLVED | workspace CSS typography variables, anchor/single-row regressions, responsive browser acceptance | 100% desktop baseline: lyric 19 px, chord 16.5 px, instrumental 17 px, heading 22 px; mobile uses 17/15.5/16/20 px with bounded zoom reflow. |
| Song Workspace button design system | RESOLVED | workspace markup/app/CSS, shared theme tokens, interaction/style tests, 1280/1024/375 light/dark acceptance | Primary, secondary, danger, icon, segmented, toggle, subtle, menu, modal, and performance controls aligned. |
| JTH JSON / TXT / Print / backup | DONE | app export/backup functions | Local exports. |
| English and zh-TW UI | DONE | locale JSON + i18n scripts | User content not translated. |
| Song content server storage | N/A | No workspace network calls | Explicitly outside V1. |
| Share Arrangement | NOT IMPLEMENTED | No share schema/route/API | Future-only boundary. |
| Public searchable song library | N/A | Product boundary | Must not be built without new review. |
| Copyright/local-only user-facing wording | RESOLVED | Workspace UI, locale files, `privacy-policy.html`, disclosure tests, responsive browser acceptance | Browser-local scope, import rights, storage-loss, export content, and no false legal guarantee are covered. |
| Footer Legal & Usage Policy | RESOLVED | shared i18n footer annotation, `legal.html`, locale files, build/final-layout tests | Terms, local storage, copyright/user content, export, external services, and bounded disclaimer; human legal review recommended before commercial-scale release. |
| Analytics/error payload privacy audit | RESOLVED | `song-workspace.html`, core/app URL and import hardening, `tests/song-workspace-observability.test.js`, static inventory, synthetic browser canaries | Workspace has no analytics/third-party executable script, custom event, remote logger, raw-input console path, or song transport; site-wide Umami remains elsewhere. |
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
- **RESOLVED**: add/review browser-local, import-rights, storage-loss, export-content, and bounded user-content/copyright wording.
- **RESOLVED**: analytics/error-log no-song-content-egress inventory, Umami isolation, URL/title/import-ID hardening, generic import errors, automated canaries, and browser network/console acceptance.
- **RESOLVED**: Song Workspace picker parity with Write Your Own Progression using shared styles/card rendering and real voicing filters.
- **RESOLVED**: Create/ChordPro visible scrollbar removal while retaining bounded keyboard/wheel scrolling and footer reachability.
- **RESOLVED**: canonical single-song JTH JSON import orchestration, fresh opaque IDs, IndexedDB persistence, collection refresh, generic errors, and reload acceptance.
- **RESOLVED**: shared fixed-body background lock for Create/Import, Shape Picker, Edit Line, Add Section, and Add Instrumental Section.
- **RESOLVED**: song-level Music Theory / Preserve Input chord spelling with C#m and slash-chord regressions.
- **RESOLVED**: Edit Line Delete Line with stable IDs, empty-section preservation, autosave, and reload.
- **RESOLVED**: remove the development-only old-format warning while retaining non-destructive unsupported-record skipping.
- **RESOLVED**: remove redundant Edit Line Move controls while retaining direct existing-chord position editing.
- **RESOLVED**: bounded Add Instrumental Section with the existing chord-only line model, contextual bar editing/deletion, stable insertion, autosave, derived modes, performance, and exports.
- **RESOLVED**: instrumental sections use a responsive four/eight-column horizontal bar grid in editor, Performance, and Print, while retaining ordered chords and stable persistent IDs.
- **RESOLVED**: instrumental bars use the established progression-card visual hierarchy in editor and Performance, with compact Print treatment and unchanged 4/8-column behavior.
- **RESOLVED**: one local-only 50–150% Song Chart Zoom preference controls the editor and Performance charts, supports bounded direct input and ±10 controls, reflows content without transforms, and leaves exports/print data contracts unchanged.
- **RESOLVED**: the 100% lyric, chord, instrumental, and heading typography baseline is materially larger on desktop and mobile while meaningful anchors and single-row annotations remain stable.
- **RESOLVED**: localized `Cmaj9` chord-input hint is backed by parser, transpose, numeral, renderer, and shared voicing regression evidence.
- **RESOLVED**: the sole autosave live region occupies the Hero promise row, and a shared localized footer link exposes the bookmarkable bounded Legal & Usage Policy.
- **RESOLVED**: Song Document V2 direct meaningful positions; no persistent character offset or legacy compatibility layer.
- **PENDING RELEASE**: add `npm test` to remote CI after confirming runtime expectations.
- **RESOLVED**: single-row annotation fitting, rendering, regressions, and Chromium responsive acceptance completed on 2026-08-27.
- **RESOLVED**: bounded Shape Picker close/focus/instant-restore implementation and responsive in-app browser acceptance.
- **PASS**: macOS Safari user acceptance found no visible Shape Picker movement.
- **PENDING RELEASE**: prove zero visible Shape Picker movement and complete the browser checklist on iPhone/iOS hardware.
- **PASS FOR PHASE 2 MIGRATION / DEFERRED**: Cloudflare-only container feasibility is recorded on the separate `a955f2d9` branch checkpoint; Phase 2, production integration, and Render retirement must not begin until separately authorized.

Do not start a Song Workspace product V2, account/cloud sync, server storage, public discovery, or sharing merely because they are listed here. Song Document schema version 2 is part of the current unreleased V1 product and is not a product-version expansion.

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

- Shared Create/Import dialog background lock passes X, Cancel, Escape, and successful commit with internal modal scrolling and zero final delta.
- Music Theory / Preserve Input spelling passes C#m, explicit Db, slash chords, transpose/capo, shapes, and reload.
- Delete Line removes only one line, preserves section/sibling IDs, and survives autosave/reload.
- Add Instrumental Section inserts at the chosen boundary, creates 1–64 chord-only bars without lyric anchors, preserves existing IDs, and supports contextual add/edit/delete plus autosave/reload.
- Edit Line exposes no Move controls; direct existing-chord position editing and Delete Line/Delete Bar remain usable.
- Unsupported pre-release records are skipped without a user warning or automatic destructive cleanup.
- Song Document V2 meaningful positions pass exact English/Chinese/mixed examples, no lyric Start, ChordPro/pasted-chart mapping, hints, exports, and JSON round-trip.
- Single chord-row invariant passes all modes and responsive layouts.
- Safari shape selection has zero visible jump.
- ChordPro / JTH JSON hierarchy is implemented and regression-tested.
- Single-song JTH JSON import validates the canonical document, regenerates the ID, persists locally, refreshes/opens correctly, and survives reload; backup envelopes remain a separate path.
- Shape Picker retains Write Your Own Progression parity for header, count, real filters, cards, Use Shape, Close, localization, and responsive behavior.
- Shared Create/ChordPro dialogs hide their native scrollbar without disabling scrolling or clipping footer actions.
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
- Preserve the resolved analytics/error-log no-song-content-egress contract and its canary regressions.
- Local-storage, rights-to-import, export, and user-content wording is implemented and regression-tested.
- Footer Legal & Usage Policy access and both localized copies pass accessibility/responsive review; obtain appropriate human legal review before commercial-scale publication.
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

Highest-priority remaining release work includes iPhone/iOS hardware acceptance, remote/CI/PR coordination, and explicit production approval. The Song Chart Zoom, larger default reading typography, progression-style Instrumental cards, analytics/error-log no-song-content-egress, Copyright/local-only UI wording, the Create Song / Other Import hierarchy, cancellation-vs-validation contract, shared modal background lock, Music Theory / Preserve Input chord spelling, Delete Line, old-format notice removal, Move-control cleanup, Instrumental Section creation/editing, Song Document V2 meaningful positions, BPM-linked Performance Auto Scroll, button design-system hardening, one-row chord-annotation contract, Shape Picker parity/zero-jump code fix, Create/Import scrollbar polish, canonical single-song JSON import, and macOS Safari zero-jump user acceptance are resolved. Do not begin a remaining gate without an explicit bounded request.
