# Song Workspace

Song Workspace is a browser-local area for building reusable chord and lyric charts. It is available at `song-workspace.html` and does not require an account.

## Local Data And Privacy

- Songs are stored in this browser with IndexedDB.
- Song titles, lyrics, chords, and workspace preferences are not uploaded to Jam Tracks Hub.
- The workspace does not send song content to the subscribe, feedback, analytics, or key-analysis APIs.
- Clearing site data, using private browsing, or changing devices can remove or hide local songs.
- Use **Backup All** before clearing browser data or moving to another device.
- If local storage is unavailable, the editor remains usable for the current session and shows an explicit warning. Download the current song or a backup before leaving.

The local-first claim is limited to Song Workspace song content. The page still loads ordinary site assets and localization files; it does not claim that Jam Tracks Hub collects no operational or website data elsewhere on the site. General Umami analytics remains enabled on other Jam Tracks Hub pages, but the tracker is deliberately not loaded on Song Workspace.

## No Song Content Egress

Song Workspace has a content-free observability boundary:

- Its production app, core, and storage modules contain no `fetch`, XHR, `sendBeacon`, WebSocket, EventSource, FormData upload, remote persistence, telemetry, console forwarding, global error forwarding, or custom analytics event path.
- The page has no third-party executable script. In particular, Umami is not loaded on Song Workspace, so automatic pageviews, path-change tracking, future session-replay configuration, and analytics-side DOM access cannot observe the workspace editor. Site-wide Umami remains present on other pages.
- The remaining Google Fonts stylesheet is presentation-only. The page uses `Referrer-Policy: no-referrer` through its HTML metadata, and neither its URL nor the stylesheet request contains song content.
- `document.title` is always the fixed localized product title. User-entered title, artist, lyrics, section names, chord anchors, ChordPro, and JSON never become the page title.
- Editor navigation accepts only internally generated opaque song IDs. JTH JSON import and Backup Restore assign fresh internal IDs before storage/navigation, while unsafe or legacy IDs fall back to the fixed `song-workspace.html` URL.
- JSON, pasted-chart, and ChordPro parser failures use generic bounded messages. Production Song Workspace code does not log raw input or Song Documents to the console.

Shared i18n code performs GET requests for fixed locale JSON files, and shared site code contains a homepage subscription handler that is inactive because Song Workspace has no subscription form. Neither path receives a Song Document or any user song field. Synthetic canary regression tests and browser inspection cover URL, title, error, console, and transport boundaries without committing third-party lyrics.

## User-Facing Disclosure And Content Rights

The create area gives one short, non-blocking explanation that song content is stored in the current browser and is not uploaded to Jam Tracks Hub. It also asks users to import only material they have the right or legal permission to use. The wording intentionally refers to the browser rather than promising device-wide or permanent storage.

The shared Create/Import dialog adapts its local-processing sentence to the selected mode:

- **Chords + Lyrics / Lyrics Only**: pasted song content is processed and stored locally in the browser.
- **Chords Only**: the song data is stored in the browser without unnecessary lyric-specific wording.
- **ChordPro**: ChordPro text is parsed in the browser and is not uploaded to Jam Tracks Hub.

The Jam Tracks Hub JSON card explains that imported projects remain in the browser. The local library separately warns that clearing browser or site data may remove songs. The existing `privacy-policy.html` legal-information page now distinguishes Song Workspace local content from Key Finder processing and records a bounded user-provided-content responsibility: local processing does not itself determine whether a use is legally permitted.

## Creating And Importing Songs

The **Create Song** area keeps the three common starting points prominent:

- **Chords + Lyrics**: paste alternating chord and lyric lines, section headings, chord-only lines, and common leading metadata.
- **Lyrics Only**: paste lyrics, then add and position chords in the visual line editor.
- **Chords Only**: create instrumental chord charts without requiring lyric text.

The lower-weight **Other Import Options** area is for existing data rather than a fourth creation method:

- **ChordPro**: import common metadata, inline chord anchors, and straightforward section directives.
- **Jam Tracks Hub JSON**: restore one complete, validated Song Document V2 project previously exported from the workspace. Single-song import uses the canonical deserializer, assigns a fresh opaque song ID, writes the result to IndexedDB, refreshes the in-memory collection, and opens the imported song. Invalid, empty, or wrong-schema files receive a generic localized error without echoing file content.

Create and ChordPro dialogs keep validation attached only to the real **Create** or **Import ChordPro** submission. X, Cancel, and Escape always close immediately—even when required fields are empty or only partly filled—and do not disable submit-time validation.

ChordPro is a plain-text interchange format such as `[G]lyrics [D]lyrics`; it is not the complete Jam Tracks Hub project format. The optional “What is ChordPro?” disclosure explains the inline markers without blocking the primary creation flow.

Library-level portability remains separate:

- **Restore Backup**: add the validated songs from a Song Workspace backup without silently deleting existing songs.
- **Backup All**: export the complete local library backup envelope.

Single-song `.jth.json` import and library backup restore are intentionally separate paths. The former accepts one `jamtrackshub-song` document; the latter accepts only the versioned `jamtrackshub-song-backup` envelope.

Recognized leading text metadata includes `Title`, `Artist`, `Key`, `Tempo` or `BPM`, and `Time Signature`. ChordPro import recognizes the corresponding common directives. The parsers are intentionally conservative and bounded; ambiguous content remains editable instead of being guessed as a chord.

## Editing And Music Tools

Each song keeps one canonical Song Document. Transposed, capo, simplified, Roman numeral, and Nashville Number views are computed from that source and do not overwrite the original chart.

- **Unlimited Transpose** changes the concert key and all supported chord roots, including slash-bass notes.
- **Chord Spelling** separates canonical pitch identity from display labels. **Music Theory** applies a bounded common-key spelling policy, including conventional `C#m` rather than `Dbm` for C-sharp minor. **Preserve Input** retains explicit source spelling when the song remains in its entered key and respects an explicitly selected sharp- or flat-based target key. Slash roots and bass notes follow the same policy, while `C#` and `Db` remain the same pitch class and use the same local voicing engine.
- **Smart Capo** compares capo positions and offers playable shape-key alternatives.
- **Easy Chords** offers balanced and beginner simplifications while leaving unsupported or ambiguous harmony unchanged.
- **Number Charts** show Roman numeral or Nashville Number views, including common non-diatonic roots.
- **Visual chord editing** stores each chord's direct zero-based `anchorPosition`. A Chinese character is one meaningful position; an English unit separated by whitespace is one meaningful position. Whitespace and standalone punctuation are not positions. Apostrophes and hyphens without whitespace stay inside one English unit. Lyric lines do not add a separate Start position, and an English word cannot receive a sub-word anchor unless the user intentionally inserts whitespace.
- **Delete Line** removes only the line currently open in Edit Line, including its text and chord positions. Sibling line/section IDs remain unchanged, and deleting the final line keeps the now-empty section available for a new insertion. Autosave persists the result.
- **Single-row chord annotations** keep every lyric line on one chord row. Labels stay left-aligned to their logical lyric anchors, while bounded presentation-only condensation handles ordinary tight spacing without stretching or modifying lyrics.
- **Chord Shapes** use the same shared voicing engine and interval-color tokens as Chord Dictionary and Write Your Own Progression. The picker now also reuses the Progression Writer dialog header, result summary, Position and Root string filters, responsive card grid, shape metadata, **Use Shape** action, and text **Close** control. Filters operate on actual generated voicing position/root data; no fake filter UI or second shape database is introduced.
- **Shape Picker scroll contract** keeps the document body fixed while the native dialog is open. Close, Escape, and voicing selection share one close path; selection replaces only the affected diagram, focus returns to the originating button while the body is still locked, and the captured page position is restored once with instant scroll behavior before unlock completes. The dialog retains its own bounded vertical scrolling.
- **Performance Mode** presents a focused chart with target key, capo, shape key, BPM, font controls, and adjustable auto-scroll. Auto-scroll derives its 1.0× base from `BPM / 60 × 24px per beat`, calibrated so 120 BPM retains the previous 48px/s default and a typical four-beat chart line advances at roughly the current visual line rhythm. The base is bounded to 18–96px/s, missing or invalid BPM falls back to 48px/s, and the user's independent 0.5×–2.0× multiplier remains unchanged when BPM changes. Scrolling accumulates fractional distance from elapsed time, so 60Hz and 120Hz displays progress at the same rate, and stops at the content end.

Autosave runs after a short editing pause. Song metadata, sections, lyric lines, and chord anchors are saved together in IndexedDB.

The shared Chords + Lyrics, Lyrics Only, Chords Only, and ChordPro Create/Import dialog remains vertically scrollable when its content exceeds the viewport, but hides its native scrollbar with Firefox and WebKit-compatible CSS. Keyboard focus can still scroll to the footer actions; content is not clipped.

Create/Import, Edit Line, Add Section, and Shape Picker reuse one shared background-lock utility. Opening a dialog captures the exact document scroll position, fixes the background with measured scrollbar compensation, and leaves the dialog's own scrolling enabled. X, Cancel, Escape, successful Create/Import, Save, Delete Line, and shape selection restore focus where applicable and restore the captured page position once with instant scroll behavior.

## Downloads And Backups

The current song can be downloaded as:

- Jam Tracks Hub Song Document V2 JSON
- ChordPro
- Plain text
- A browser print view for PDF output

**Backup All** exports all locally saved songs. Import and restore files are size-limited, version-checked, and normalized before they are stored. Downloaded files never contain browser credentials, cookies, preferences, or unrelated site storage.

Song Document V2 is the first canonical meaningful-position format. Pre-release V1 character-offset songs are not accepted as V2 and do not enter a permanent compatibility layer. Older development-only IndexedDB records are skipped with a generic local incompatibility notice; they can be recreated or re-imported as V2.

The Download menu provides one accessible, non-blocking reminder that JSON, ChordPro, TXT, and Print/PDF output may contain lyrics or other user-entered content and should be used or shared only where the user has the necessary rights or legal permission. Export features are unchanged and do not add confirmation dialogs.

## Keyboard And Accessibility

All primary controls use native buttons, inputs, selects, or dialogs. Download menus expose menu semantics, status messages use live regions, and focus remains keyboard-accessible. In Performance Mode:

- `Space` starts or pauses auto-scroll.
- `+` and `-` adjust chart text size.
- `Esc` closes the performance dialog.

Reduced-motion preferences disable nonessential transitions and smooth scrolling.

## Button And Interaction Language

Song Workspace controls reuse the site's established primary, secondary, danger, subtle, icon, segmented, toggle, and menu-action semantics. They share the Jam Tracks Hub theme tokens for color, depth shadow, border, radius, active feedback, disabled presentation, and focus ring while retaining component-specific hierarchy: `+ Add` remains subtle, mode selectors remain segmented, destructive actions remain clearly marked, and modal/performance controls keep touch-friendly targets. Light/dark and reduced-motion behavior follow the same system used by Write Your Own Progression and the other music tools.

## Known V1 Limits

- Chord and ChordPro parsing covers common syntax, not every informal chart convention or ChordPro extension.
- Local songs do not sync between browsers or devices.
- Smart Capo uses a bounded chord-difficulty heuristic rather than instrument-specific fingering history.
- Chord shapes are generated from the shared local voicing engine; Song Workspace does not maintain a separate shape database.
- PDF output uses the browser print dialog.
