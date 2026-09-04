# Song Workspace Phase 6A Contract Freeze

Snapshot: 2026-09-04 (Asia/Taipei)
Baseline: `b86b6f2c5d07da750d2cfb648e4dd07b2137514a`
Scope: characterization, synthetic fixtures, tests, and Phase 6B planning only.

This document freezes the current Song Workspace behavior before its Vue migration. Repository source and tests remain authoritative when prose and implementation differ. Phase 6A does not connect any new adapter, mount Vue, change public behavior, alter persistence, or modify the Song Document schema.

## Product and ownership boundary

Song Workspace is a local-first guitar/song workspace for content supplied by the user. It is not a lyrics catalogue, public song database, account product, cloud song store, or server-hosted sharing system.

- Runtime owner: legacy `scripts/song-workspace.js` initialized on `DOMContentLoaded`.
- Vue mounts: zero.
- Visible Vue page count after Phase 6A: 13.
- Song APIs and remote song storage: none.
- Critical invariant: `NO_LYRICS_EGRESS`.
- Phase 6A adapters: none. Existing UMD/CommonJS domain modules are already directly testable; extracting or rewiring them would change risk without improving the freeze.

## Legacy runtime file inventory

| Category | Canonical files | Role |
| --- | --- | --- |
| HTML | `song-workspace.html` | Fixed metadata, Create/Import, My Songs, editor, seven dialogs, local-only disclosures, script order. |
| Page domain | `scripts/song-workspace-core.js` | Song Document v2, tokenization, anchors, parsing, transforms, capo, display modes, exports. |
| Page persistence | `scripts/song-workspace-storage.js` | IndexedDB song CRUD and bounded localStorage presentation preferences. |
| Import orchestration | `scripts/song-workspace-import.js` | Validate, regenerate imported identity, persist, return updated collection. |
| Page controller/view | `scripts/song-workspace.js` | Legacy state, DOM rendering, interactions, autosave, local files, dialogs, Read/Performance modes. |
| Shared music | `scripts/chord-shapes.js` | Chord parsing/voicings/diagram models shared with Progression Writer. |
| Page CSS | `styles/song-workspace.css` | Workspace layouts, states, responsive behavior, dialogs, print. |
| Shared CSS | `styles/base.css`, `styles/components.css`, `styles/pages.css`, `styles/themes.css`, `styles/chord-dictionary.css` | Shell/design tokens, themes, chord diagram presentation. |
| Shared runtime | `scripts/theme-init.js`, `scripts/i18n-init.js`, `scripts/site.js`, `scripts/i18n.js`, `scripts/site-animations.js` | Early theme/locale, shell navigation, localization, entrance animation. |
| Third party | GSAP and Umami loader in the page | Content-free entrance effects and page-level analytics. |

## Runtime dependency graph

```text
song-workspace.html
├─ shared CSS + styles/song-workspace.css + styles/chord-dictionary.css
├─ theme-init.js + i18n-init.js
├─ site.js + i18n.js
├─ chord-shapes.js ───────────────┐
├─ song-workspace-core.js ────────┤
├─ song-workspace-storage.js ─────┤
├─ song-workspace-import.js ──────┤
├─ song-workspace.js <────────────┘
├─ GSAP + site-animations.js
└─ Umami (page view only; search/hash excluded)

song-workspace.js
├─ in-memory legacy state
├─ Core for canonical/derived song models
├─ Storage for IndexedDB/localStorage
├─ SongImport for one-song JTH import
├─ Shapes for candidate voicings and diagrams
└─ DOM/File/Blob/print/history APIs
```

No Song Workspace module calls Worker, D1, Key Finder, Render, a song API, or remote error storage.

## State and domain model

### Runtime state

The controller owns the loaded song collection, active canonical song, display mode, storage availability/save status, preferences, title/metadata edit flags, active section/add menus, dialog/focus/scroll locks, line draft and anchor selection, Shape Picker filters/selection, Read Mode state, Performance Mode state, and one auto-scroll animation frame.

Canonical song content and presentation preferences remain separate. Transposed, capo, simplified, Roman, and Nashville views are derived copies and do not replace the canonical song merely by rendering.

### Song Document v2

```text
Song
  schema: "jamtrackshub-song"
  version: 2
  id: string (<=160)
  title: string (<=160)
  artist: string (<=160)
  originalKey: string
  targetKey: string
  chordSpelling: "theory" | "preserve"
  capo: number clamped 0..11
  bpm: null | number clamped 20..320
  timeSignature: d{1,2}/d{1,2}, default "4/4"
  sections: Section[]
  createdAt: string (<=40)
  updatedAt: string (<=40)

Section
  id: string (<=160)
  type: verse | chorus | pre-chorus | bridge | intro | outro |
        instrumental | tag | section
  title: string (<=80)
  lines: Line[]

Line
  id: string (<=160)
  type: lyric | instrumental
  text: string (<=1000)
  chords: ChordAnnotation[]

ChordAnnotation
  id: string (<=160)
  symbol: supported chord string (<=40)
  anchorPosition: non-negative integer
```

Defaults are a new opaque song ID, `Untitled Song`, blank artist, C original/target key, theory spelling, capo 0, BPM null, 4/4, no sections, and current ISO timestamps. Validation requires schema v2 and bounded nested structures. Unknown properties are discarded because successful validation returns a freshly normalized canonical object. Version 1 and the removed `anchor` character-offset property are rejected.

Limits: 200 sections, 2,000 total lines, 500 lines per section, 64 chords per lyric line, 16 chords per instrumental bar, 10,000 total chords, 200,000 parser/serialized-source characters, and 1 MiB at the browser file-reading boundary.

### Identity contract

| Entity | Created | Preserved | Regenerated |
| --- | --- | --- | --- |
| Song | `song-` plus UUID; timestamp/random fallback remains supported | Normal edits, serialization, export, storage reload, duplicate source remains unchanged | New creation, Duplicate copy, single-song JTH import, every restored backup song. |
| Section | `section-` plus generated value | Edits, reorder/split source section, JSON/storage round-trip | Newly inserted section; continuation created by an internal instrumental split. |
| Line | `line-` plus generated value | Text/chord edits, section movement, JSON/storage round-trip | Newly inserted line/bar. |
| Chord annotation | `chord-` plus generated value | Symbol/position edits and round-trip | Newly added chord annotation. |

Only IDs matching the opaque `song-<UUID>` or bounded fallback pattern may enter `?song=`. Titles, artists, lyrics, sections, and chord data never form an identifier. Collision prevention relies on generated randomness; an imported foreign song ID is never used because import/restore regenerates it. Duplicate creates a fresh song ID and timestamps while preserving nested IDs as the current behavior.

## Sections, lines, anchors, and tokenization

Section order and line order are array order. Empty sections are valid. Contextual Add can insert a line, section, or instrumental section at a boundary. Inserting a normal section at an internal boundary moves the trailing lines into the inserted section. Inserting an instrumental section internally keeps the leading source section, inserts the instrumental section, and creates a continuation section for trailing lines. Instrumental creation accepts 1–64 bars, defaults to four, stores blank lyric text, and uses chord annotations as ordered bar positions.

Lyric strings are not token-normalized. `createLine` only converts to string and applies the 1,000-code-unit maximum slice. Serialization/reload and render layout preserve the canonical string, including leading/trailing and repeated spaces, punctuation, Unicode, CJK, and line text.

Tokenization iterates Unicode code points:

- contiguous whitespace is one non-meaningful `space` token;
- each Han, Hiragana, Katakana, or Hangul code point is one meaningful `cjk` token;
- a contiguous non-space/non-CJK run is `word` if it contains a Unicode letter, number, or mark;
- otherwise it is non-meaningful `punctuation`;
- only `word` and `cjk` tokens consume `positionIndex`.

`anchorPosition` is a zero-based index into meaningful tokens, not a character offset. Rendering clamps to the closest available meaningful position. A lyric line with no meaningful token renders its chords as unanchored. Duplicate annotations retain input order after stable sorting by position. The controller's Edit Line draft keeps numerical positions while text changes; saving recreates the line and clamps positions against the new text. It does not infer or repair semantic intent after inserted/deleted text.

Chord annotations render in one annotation layer above the original lyric flow. Geometry may scale a label down to a 0.6 floor to fit before the next anchor while preserving canonical song content and token identity.

## Chord, key, capo, and display contracts

The bounded chord parser normalizes Unicode accidentals and trailing sentence punctuation, validates A–G roots, optional accidentals, supported suffixes/alterations, and optional slash bass. It rejects unsupported roots, markup-like text, incomplete slash chords, oversized or unknown suffixes. Do not broaden the grammar in Phase 6B.

Key choices are the current 14 major and 14 minor display options. Theory spelling canonicalizes theoretical aliases such as Db minor to C-sharp minor; Preserve Input retains spelling for a zero-semitone view. Target Key is concert pitch. Capo is 0–11. Shape Key is Target Key transposed downward by the capo value; displayed playable shapes are the capo-derived song. Example contract: Target A plus Capo 2 uses G shapes while sounding A.

Smart Capo evaluates all 12 capo positions, calculates average chord difficulty, sorts by score then lower capo, and returns the requested number (the UI asks for three). It does not mutate the song.

| Mode | Persisted ID | Transformation |
| --- | --- | --- |
| Original | `original` | Target-key then capo/Shape Key chord spelling. |
| Easy: Balanced | `balanced` | Bounded extension simplification while retaining slash bass. |
| Easy: Beginner | `beginner` | Stronger simplification and removal of slash bass. |
| Roman | `roman` | Roman degrees relative to Shape Key with canonical case/suffix/accidental/slash rules. |
| Nashville | `nashville` | Numeric degrees relative to Shape Key with `m` suffix and canonical accidentals/slashes. |

The mode, chord hints, chart zoom, line spacing, scroll multiplier, last opaque song ID, and per-song selected voicing keys are presentation preferences. Shape candidates, ordering, root-string/fret-area filters, default-first fallback, selected voicing key, muted/open-string semantics, and diagram rendering come from the shared `scripts/chord-shapes.js` contract.

## View, performance, and editing contracts

- Workspace/Edit: normal editor with section/line actions and settings.
- Read Mode: removes editable controls and hero chrome, preserves page scroll, keeps title/metadata/key summary/reading controls, optionally opens a responsive chord-shapes panel, and returns focus/scroll to its trigger on exit.
- Performance Mode: native dialog containing the derived playable chart, title/key/capo/Shape Key/BPM metadata, Start/Pause, Reset, 0.5x–2x speed, and shared zoom controls. Opening from Read Mode temporarily exits it and restores it on close.

Auto-scroll base speed is `BPM / 60 * 24 px/s`, bounded to 18–96 px/s; absent/invalid BPM uses 48 px/s. Multiplier is 0.5–2.0. Each animation frame caps elapsed time at 50 ms, tracks manual scroll differences over 2 px, stops at the end, and cancels the sole stored animation frame on pause/close. Space toggles while the dialog is active and focus is not in an input; plus/minus changes zoom.

Chart zoom is local-only, integer 50–150, default 100, button step 10, direct-input step 1. Line spacing is local-only, integer 0–20 px, default 10, step 1. Both apply to normal, Read, and Performance views.

Global Add is mobile-only at `max-width: 720px`; it is a two-step type then insertion-position dialog. Desktop uses contextual Add controls. Edit Line copies a canonical line into a draft, supports add/edit/delete chord annotations, and only commits on Save. Cancel/Escape leave the canonical line unchanged. Instrumental Edit Bar hides lyric and anchor-position controls and appends chord positions in order.

Song settings use a permanently open desktop details panel and a localized collapsed-by-default mobile disclosure. Original Key, Target Key, Capo, and spelling changes schedule autosave immediately. Title and metadata have explicit Save/Cancel inline editors. Title is trimmed and required; artist is trimmed; BPM is empty/null or 20–320; time signature must match the current pattern.

## Interaction inventory

`Storage` means IndexedDB for canonical songs and localStorage for preferences. `URL` always means a content-free fixed path or an opaque song ID.

| Action | Preconditions / input | State and visible output | Storage / URL / export | Focus, scroll, privacy |
| --- | --- | --- | --- | --- |
| Initialize | Page load | Preferences sanitized; valid songs sorted; requested opaque ID opened if found | IndexedDB read; invalid URL ID removed | No song content sent remotely. |
| Create: Chords + Lyrics | Title/key/pasted synthetic chart | Parser creates sections, paired chord/lyric lines, bars | New local record; editor URL uses opaque ID | Dialog focuses title; body locked; local-only disclosure. |
| Create: Lyrics Only | Title/key/text | Same parser, then every line becomes lyric and chords are cleared | New local record | Same dialog contract. |
| Create: Chords Only | Title/key/chord text | Chord-only instrumental lines; empty input fallback is instrumental line | New local record | Same dialog contract. |
| Import ChordPro | Local pasted ChordPro | Metadata/sections/anchors parsed; editor opens | New local record with generated ID | No upload; bounded generic errors. |
| Import JTH JSON | Local file <=1 MiB | v2 validates, identity/timestamps regenerate, editor opens | IndexedDB write before collection update; opaque URL | Hidden file input; generic content-free error. |
| Open My Song | Existing valid record | Editor displays canonical song | Preference writes last ID; opaque URL | No remote request. |
| Back to My Songs | Open editor | Stops scroll, closes read state, renders list | URL becomes fixed workspace path | Content leaves URL; storage unchanged. |
| Edit title | Open editor | Inline required editor; Save trims; Cancel preserves | 500 ms autosave | Focus enters input; no title in document title. |
| Edit metadata | Open editor | Artist/BPM/time signature Save or Cancel | 500 ms autosave | No metadata in URL/analytics. |
| Change key/capo/spelling | Open editor | Derived chart, key summary, shapes update | 500 ms autosave | Canonical lyrics untouched. |
| Change display mode | Open editor | Chart transforms without canonical mutation | localStorage preference write | Content-free operation. |
| Toggle chord hints | Open editor | Meaningful anchored token emphasis toggles | localStorage preference write | Non-color text/chord labels remain. |
| Smart Capo | Open editor | Three ranked options; choosing one updates capo | 500 ms autosave | No network. |
| Zoom / spacing | Any reading view | CSS custom properties/reflow update | localStorage preference write | Bounded, keyboard-operable. |
| Contextual Add | Desktop/editable insertion point | Opens positioned menu | No write until completed | Menu focus and Escape return. |
| Global Add | Mobile/open editor | Two-step modal selects type and boundary | Write only after child dialog commits | Background lock and dialog handoff preserve focus/scroll. |
| Add/Rename/Delete section | Open editor | Array insertion/title mutation/removal | 500 ms autosave | Delete uses native confirmation; unrelated records untouched. |
| Add/Edit/Delete line or bar | Open editor | Draft commit/replacement/removal | 500 ms autosave | Cancel leaves song unchanged; dialog restores focus/scroll. |
| Add/Edit/Delete chord | Line draft | Validated symbol and numerical position mutate draft | No write until line Save | Errors are bounded and content-free. |
| Open Shape Picker | Available chord | Candidate diagrams and filters shown | Selected voicing writes localStorage | Native dialog; background fixed; close restores trigger/scroll. |
| Enter/exit Read Mode | Open editor | Edit chrome hidden/restored | No song write | Captures/restores scroll and trigger focus. |
| Toggle Read chord shapes | Read Mode | Responsive side panel/backdrop | No song write | Close/Escape returns focus. |
| Enter/exit Performance | Open editor | Derived local chart in dialog | Scroll multiplier/zoom preferences only | Stops animation on close; restores Read Mode if applicable. |
| Start/Pause/Reset scroll | Performance open | Single animation loop moves/holds/resets dialog scroll | localStorage only when multiplier changes | No remote timing/content telemetry. |
| Download JTH JSON | Any song | Local Blob download | Exact canonical song; `.jth.json`; `application/json` | Object URL revoked; no upload. |
| Download ChordPro | Any song | Local Blob download | Current displayed chord state; `.cho`; text payload | Header braces/newlines sanitized. |
| Download TXT | Any song | Local Blob download | Current displayed chord state; `.txt`; text payload | Local only. |
| Print / PDF | Any song | Browser print UI with print CSS | Current view; no server conversion | Controls hidden by print CSS; no upload. |
| Duplicate | My Songs | Fresh song ID/title suffix/timestamps; source unchanged | New IndexedDB record | In-flight guard prevents double duplicate. |
| Delete | My Songs | Confirmation then removes one record | One IndexedDB delete | No bulk/unrelated deletion. |
| Backup All | My Songs | Local JSON bundle, max 500 songs | `jamtrackshub-backup.json`, backup schema v1 | Local Blob only. |
| Restore Backup | Local file <=1 MiB | Valid backup adds songs with fresh song IDs | Sequential IndexedDB puts; list reload | Does not replace/delete existing collection. |
| Locale/theme change | Any state | Labels/theme and geometry update | Shared non-song preferences only | Chord/layout recalculated; no song transport. |

## Import and export contract

### Chord/lyrics parser

It accepts bounded leading Title/Artist/Key/BPM/Time Signature metadata; bracketed or canonical named headings; chord-only lines; chord-row plus following lyric-row pairs; standalone lyric text; blank lines; Unicode and CRLF normalization to LF. Chord column offsets convert once to meaningful token positions. A line parsed entirely as valid chords becomes instrumental.

### ChordPro import

Supported metadata aliases: title/t, artist/subtitle/st, key/k, tempo/bpm, time/time_signature. Supported section directives: start_of_chorus/soc, start_of_verse/sov, start_of_bridge/sob, start_of_tab/sot. Recognized textual headings also work. Unknown directives are ignored. A malformed bracketed chord is retained literally in lyric text. Inline valid markers are removed from text and converted to meaningful positions. Blank marker-only lines become instrumental. Input CRLF normalizes to LF.

### JTH JSON import and backup restore

Single-song import accepts canonical schema v2 only, validates all bounds, discards unknown fields through normalization, regenerates song ID and timestamps, persists before returning, and reports only `JTH_SINGLE_SONG_IMPORT_FAILED` to its caller. Duplicate nested IDs are not uniqueness-validated; this is existing behavior, not a recommendation. Backup restore requires `jamtrackshub-song-backup` v1 and at most 500 songs, validates each v2 song, regenerates every song ID, adds records, then reloads the bounded list.

### Exports

| Format | Filename/MIME | Contract |
| --- | --- | --- |
| JTH JSON | sanitized title + `.jth.json`; `application/json` | Pretty two-space canonical Song Document v2 plus trailing newline. Canonical stored state, including IDs and anchors. |
| ChordPro | sanitized title + `.cho`; default text MIME | Header order title, optional artist, target key, optional tempo; then section title and inline chord markers in array order. Uses current derived display/capo state when editor song is active. |
| TXT | sanitized title + `.txt`; default text MIME | Title, optional artist, key/capo, sections, chord row then exact lyric, or chord-only bar. Uses current derived display/capo state. |
| Print/PDF | browser print | Current active chart, local print CSS, no remote conversion. |
| Backup | `jamtrackshub-backup.json`; `application/json` | Backup schema v1, timestamp, at most 500 current songs. |

JTH JSON round-trips exactly. ChordPro round-trips non-empty lyric strings and their chord symbol/meaningful-position semantics. For chord-only bars, chord order survives but all adjacent exported markers re-import at anchor position 0; blank separator lines also become empty instrumental lines, including an initial default `Song` section. ChordPro does not preserve internal IDs, section directive spelling, the time-signature header on export, or every canonical presentation field. These losses are part of the current text-format contract and must not be silently “fixed” during migration.

## Persistence contract

### IndexedDB

| Item | Contract |
| --- | --- |
| Database | `jamtrackshub-song-workspace` |
| Version | 1 |
| Store | `songs`, keyPath `id` |
| Index | `updatedAt` |
| Record | Canonical Song Document v2 |
| Read | Open database, readonly transaction, `getAll(undefined, 501)`, sort descending by string `updatedAt`, close. |
| Get | One readonly transaction, close. |
| Put/Delete | One readwrite transaction, await request and transaction completion, close. |
| Replace all | One readwrite transaction: clear then put each supplied song, await completion, close. |
| Upgrade | Create missing store and missing `updatedAt` index during `onupgradeneeded`. |

Loading validates records and exposes at most 500; the 501st returned or any corrupt record is counted as skipped. The current module does not reject an individual 501st `put`; the enforced user-visible boundary occurs on load/filter. Phase 6B must reproduce this exact behavior unless a separately authorized product change revises it.

IndexedDB unavailable/open/read/write/transaction failures switch the runtime to unavailable state, empty the in-memory collection on load failure, show a generic local-backup message, and do not fall back to a server.

### localStorage

One key is used: `jamTracksHubSongWorkspacePreferences`. It contains a sanitized object with optional chartZoom, lineSpacing, viewMode, chordHints, opaque-ish lastSongId, scrollSpeedMultiplier, legacy fontScale/scrollSpeed, and bounded per-song chord-symbol to voicing-key selections. Reads over 256 KiB, malformed JSON, unavailable storage, or exceptions return `{}`. Writes sanitize and return false rather than throwing. Shape selections are capped at 500 song entries and 128 chord symbols per song.

Autosave uses a single 500 ms debounce. It updates `updatedAt`, validates, makes one IndexedDB put, then updates the in-memory list. Hiding the document flushes a pending save. Presentation preference controls write directly; Phase 6B must not add duplicate watcher writes.

## My Songs contract

Cards use storage/list order (descending `updatedAt`) and show title, artist fallback, target/original key, capo, and localized date. Each card has Open, Duplicate, Download, and Delete. The empty state is visible only when the collection is empty. Corrupt/unsupported records are skipped with one generic content-free warning; they are not auto-deleted or rewritten. Storage unavailability produces an empty visible list and an unavailable state.

## Privacy contract

Protected content includes title, artist, lyrics, section names, chord symbols, anchors, raw ChordPro, raw JTH JSON, and imported metadata.

- Path is `/song-workspace` or `/song-workspace.html` depending edge normalization.
- Query is absent or exactly `song=<opaque generated ID>`; unsafe requested IDs are removed.
- Hash has no Song Workspace content contract.
- Document title is fixed/localized and never derived from song metadata.
- `<meta name="referrer" content="no-referrer">` remains required.
- Umami is the canonical site page-view loader only, with `data-exclude-search="true"` and `data-exclude-hash="true"`; there are no custom events or properties.
- Song modules have no `fetch`, XHR, `sendBeacon`, WebSocket, EventSource, FormData transport, remote console/error forwarding, or telemetry SDK.
- Shared i18n may fetch fixed locale JSON; shared analytics may send a content-free page view. Neither receives song data.
- Exports use local Blob/Object URLs; print uses the browser; storage is IndexedDB/localStorage only.
- No Worker/D1/Key Finder/Render song endpoint exists.

The automated canaries are synthetic and assert absence from URL, title, analytics configuration, transport primitives, Worker paths, and remote-log primitives. Browser checks must use a fresh preview origin or otherwise isolated context, never inspect the user's saved storage, and delete synthetic songs through the UI when created.

## Modal, focus, scroll, and animation contract

Native dialogs: Create Song, Shape Picker, Global Add, Section Name, Instrumental Section, Line Editor, and Performance. Menus/popovers include contextual Add, library/editor Download, section actions, Smart Capo results, setting help, and the Read chord-shapes panel.

The five editing dialogs share fixed-body background locking: capture page x/y, compensate scrollbar width, fix body, allow dialog internal scroll, close by explicit buttons or Escape, restore body styles and exact scroll, then focus the originating control where applicable. Global Add can hand its single lock to a child dialog. Shape Picker uses a guarded close sequence and selects a still-connected equivalent trigger if rerendering replaced the original. Create/Line forms submit only when the submitter value is `default`; X/Cancel/Escape never invoke validation/commit.

Read Mode captures scroll and trigger focus. Performance owns its internal scroll and cancels its animation loop on cancel/close. Menus close on outside click/Escape and return focus for keyboard dismissal.

Entrance animation is owned by `scripts/site-animations.js`; it detects `.song-workspace-page`, animates the hero/section targets, excludes later dynamic chart children from generic observers, respects reduced motion through the shared animation policy, and leaves domain state untouched.

## Responsive and accessibility contract

The Phase 6A baseline widths are 375, 390, 430, 768, 820, 834, 1024, 1180, 1194, 1280, and 1440 CSS pixels. Critical states are Create/Import, My Songs, editing/settings, line editing, Shape Picker, Read Mode, and Performance Mode. English/Traditional Chinese and light/dark themes must remain usable without page-level horizontal overflow.

- At <=720 px the settings disclosure starts collapsed, Global Add is available, creation/import grids stack, and editing/dialog controls reflow for touch.
- At tablet widths settings and reading controls use the existing intermediate grid; at desktop settings remain open and contextual Add is used.
- Instrumental bars use the current compact workspace strip and separate Read/Performance presentations.
- Chart annotations stay one row; chart content may scroll internally rather than widening the page.
- Print CSS hides application controls and supplies the local print layout.

Accessibility inventory: one main landmark and H1, shared skip link, semantic buttons/forms/labels, native dialogs, explicit dialog labels/descriptions, status/error live regions, `aria-expanded`/`aria-controls`/`aria-pressed`, menu roles, localized labels, keyboard Escape/Enter/Space paths, 44 px-class touch targets where required, focus-visible styles, content labels beyond color alone, zoom/reflow controls, and shared reduced-motion behavior. This is a contract inventory, not a WCAG certification.

## Shared consumer inventory

| Contract | Consumers | Song usage | Phase 6B action |
| --- | --- | --- | --- |
| `scripts/chord-shapes.js` | Song Workspace; Vue Progression Writer and its export service | Parse chord, generate/order/filter/select voicings, render diagrams | Continue consuming unchanged module or a proven-equivalent wrapper; no semantic fork. |
| `styles/chord-dictionary.css` | Chord Dictionary, Progression Writer, Song Workspace | Diagram interval colors and structure | Retain classes/tokens until visual parity and zero-caller audit. |
| `scripts/site.js` / shell CSS | Legacy Song Workspace plus site shell | Navbar, theme controls, back-to-top, shared links | Use existing shared Vue shell in 6B while preserving public shell behavior. |
| `scripts/i18n.js` + locale JSON | Legacy Song Workspace and legacy-compatible site utilities | `data-i18n`, runtime `t`, language-change event | Map every key to `useSiteLocale`; do not rename messages during migration. |
| `scripts/site-animations.js` | Site pages including Song Workspace | Entrance animation and chord diagram observation | Preserve timing/reduced-motion hooks; remove Song-specific legacy hooks only after Vue replacement coverage. |
| Core/storage/import UMD modules | Song Workspace runtime and Node tests | Domain/persistence/import behavior | Prefer direct reuse first; any ESM adapter must be fixture-equivalent and content-local. |

Shared music semantic change in Phase 6A: none.

## Phase 6B migration map

| Legacy owner | Frozen contract | Target Vue/domain owner | Risk | Test gate |
| --- | --- | --- | --- | --- |
| HTML/shared shell | Route metadata, privacy tags, initial structure | `SongWorkspaceView.vue` plus existing shell entry | High | Metadata, route, no duplicate shell, privacy canary. |
| Home/Create/Import DOM | Three primary modes, two secondary imports, dialog semantics | Vue entry components; existing Core/Import | High | Entry ordering, validation/cancel, synthetic imports. |
| Global state/controller | Canonical vs derived state and in-flight guards | `useSongWorkspace` composable | High | State-machine characterization and no duplicate writes/listeners. |
| Sections/lines/chord row | Stable IDs, boundary insertion, one-row anchors | Vue score components; existing Core | Critical | Golden song, anchor/token corpus, visual geometry. |
| Shape Picker | Shared candidates/order/selection/focus/scroll | Vue dialog using unchanged Shapes | High | Shared-consumer fixture, keyboard, focus/scroll. |
| Key/capo/display modes | Exact theory/preserve and Shape Key algorithms | Composable wrapping existing Core | Critical | Full display/enharmonic/capo fixture matrix. |
| Global Add/mobile Edit Line | Mobile breakpoint, two-step handoff, draft semantics | Vue dialogs/components | High | Mobile workflow, cancel/save, anchor mutation. |
| Settings/title/metadata | Desktop/mobile disclosure, trim/validation/save | Vue settings and inline editors | Medium | EN/zh-TW, validation, autosave frequency. |
| My Songs | Sort/cards/actions/corruption/empty state | Vue library components + storage service | Critical | Isolated IndexedDB CRUD/500 boundary. |
| Read Mode | Chrome hiding, focus/scroll, shape panel | Vue mode state/components | High | View state, focus/scroll, widths/themes/locales. |
| Performance Mode | Dialog, derived chart, single RAF, BPM scroll | Vue performance component/composable | Critical | Fake-time distance, one loop, cleanup/manual scroll. |
| Storage | DB/store/index/key and transaction boundaries | Reuse module initially; optional ESM service later | Critical | Isolated CRUD/failure/corruption/round-trip. |
| ChordPro/JTH imports | Bounded parsers, generic errors, ID regeneration | Reuse Core/Import through thin service | Critical | Corpus, malformed cases, no content errors. |
| Exports/backup/print | Current derived/canonical distinction and filenames | Vue action service using existing Core | High | Exact/semantic output, local-only transport, print CSS. |
| Dialog/focus/scroll | Native modal lock/handoff/return | Reusable Vue dialog composable | Critical | Escape/cancel, scroll delta, focus return. |
| URL/analytics/privacy | Opaque query only, fixed title, excluded search/hash | Entry/router-free URL helper and unchanged loader | Critical | Automated and preview canaries. |
| Animations | Shared entrance/reduced motion | Existing hooks or Vue lifecycle wrapper | Medium | No duplicate observer/timeline and reduced motion. |

Phase 6B should first mount a single Vue owner while reusing the canonical domain modules. A parallel legacy+Vue runtime is forbidden. No shared breaking change is currently required; if one emerges, it is a Phase 6B design blocker requiring separate review.

## Legacy removal plan

| Legacy resource | Current consumers | Phase 6B replacement | Zero-caller removal gate |
| --- | --- | --- | --- |
| `scripts/song-workspace.js` | `song-workspace.html` | Vue entry/view/composables | Vue owns every interaction; no HTML script reference; parity suite and preview pass. |
| Legacy workspace body markup | `song-workspace.js`, CSS, accessibility contracts | Vue templates | Vue mount is sole owner; all IDs/hooks deliberately mapped; no controller lookup remains. |
| Page-specific branches in `scripts/site-animations.js` | Song Workspace entrance/read UI | Vue lifecycle or retained generic hooks | Search proves no Song-specific caller/selector is required and reduced-motion parity passes. |
| `scripts/song-workspace-import.js` | Legacy controller and tests | Reuse or ESM import service | Remove only if all callers use a proven-equivalent module and ID/error/storage ordering tests pass. |
| `scripts/song-workspace-storage.js` | Legacy controller and tests | Reuse or ESM storage service | Remove only after same DB/key/transactions/failure semantics and no callers remain. |
| `scripts/song-workspace-core.js` | Legacy controller and tests | Prefer reuse; optional ESM domain module | Remove only after exhaustive fixture equivalence, shared references updated, and zero callers. |
| Song-specific legacy CSS | Legacy markup | Scoped Vue styles/shared tokens | Visual/responsive/print parity at all frozen states and zero selectors consumed. |
| `styles/chord-dictionary.css` dependency | Multiple tools | Shared chord diagram system | Never remove for Song Workspace alone; repository-wide zero-caller gate required. |
| `scripts/chord-shapes.js` | Song Workspace and Progression Writer | Shared unchanged engine or one shared successor | Repository-wide semantic equivalence and zero callers; no page-local fork. |

Phase 6A performs none of these removals.

## Test and browser isolation

`tests/fixtures/song-workspace-phase6a-contract.json` contains exactly 20 synthetic categories, six tokenization cases, display-mode snapshots, auto-scroll values, five ChordPro cases, a fully synthetic v2 song, source hashes, and privacy canaries. `tests/helpers/isolated-indexeddb.js` is an in-memory IndexedDB contract double used only by Node tests. It never opens or inspects a browser profile.

Production baseline inspection is read-only. Mutable browser acceptance must use a fresh immutable Preview origin and synthetic content; any created record must be deleted through the UI before close. No real/private lyrics or saved Song Workspace records may be read, exported, changed, or removed.

## Version and release boundary

This is internal test-contract and migration preparation. Public behavior, URL, API, data schema, backend, and visible runtime ownership do not change. Version remains 2.0.4. Phase 6A creates no tag or GitHub Release, does not merge, does not promote a Worker version, and does not start Phase 6B.
